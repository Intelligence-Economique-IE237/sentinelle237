import { useEffect, useState } from "react"
import { Bell, BellOff, FolderSearch, Send } from "lucide-react"
import { MButton, MCard, MCardHeader, MSkeleton, MSwitch } from "@/components/mira/mira"
import { toast } from "@/components/mira/toast-manager"
import { ApiError } from "@/lib/api/client"
import { sendTestPush, updatePushPreferences, type PushPreferences, type PushSubscriptionState } from "@/lib/api/push"
import { disablePush, enablePush, getPushSupport, loadPushState, PushPermissionError } from "@/lib/push"

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof PushPermissionError || err instanceof ApiError) return err.message
  return fallback
}

const NOTICES = {
  "ios-install":
    "Sur iPhone et iPad, ajoute d’abord Sentinelle à l’écran d’accueil (Partager → « Sur l’écran d’accueil »), puis ouvre-la depuis son icône pour activer les notifications.",
  unsupported: "Ce navigateur ne prend pas en charge les notifications push.",
  dev: "Les notifications push sont disponibles dans la version déployée de l’application.",
} as const

/** Réglages des notifications push pour l'appareil courant. */
export function PushSettingsCard({ className }: { className?: string }) {
  const support = getPushSupport()
  const [state, setState] = useState<PushSubscriptionState | null>(null)
  const [loading, setLoading] = useState(support === "ok")
  const [busy, setBusy] = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    if (support !== "ok") return
    let cancelled = false
    loadPushState()
      .then((s) => !cancelled && setState(s))
      .catch(() => !cancelled && setState(null))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [support])

  async function toggle(enabled: boolean) {
    setBusy(true)
    try {
      if (enabled) {
        setState(await enablePush())
        toast.add({ title: "Notifications activées", description: "Sur cet appareil.", type: "success" })
      } else {
        await disablePush()
        setState(null)
        toast.add({ title: "Notifications désactivées", type: "success" })
      }
    } catch (err) {
      toast.add({ title: "Erreur", description: errorMessage(err, "Impossible de modifier les notifications"), type: "error" })
    } finally {
      setBusy(false)
    }
  }

  async function setPreference(key: keyof PushPreferences, value: boolean) {
    if (!state) return
    const previous = state
    setState({ ...state, [key]: value })
    try {
      setState(await updatePushPreferences(state.endpoint, { [key]: value }))
    } catch (err) {
      setState(previous)
      toast.add({ title: "Erreur", description: errorMessage(err, "Préférence non enregistrée"), type: "error" })
    }
  }

  async function handleTest() {
    setTesting(true)
    try {
      await sendTestPush()
      toast.add({ title: "Notification de test envoyée", description: "Elle arrive dans quelques secondes.", type: "success" })
    } catch (err) {
      toast.add({ title: "Erreur", description: errorMessage(err, "Envoi impossible"), type: "error" })
    } finally {
      setTesting(false)
    }
  }

  const enabled = state !== null
  const blocked = support === "ok" && typeof Notification !== "undefined" && Notification.permission === "denied"

  return (
    <MCard className={className}>
      <MCardHeader
        title="Notifications"
        subtitle="Alertes et enquêtes sur cet appareil, même quand l’application est fermée."
        action={
          <span className="flex size-10 items-center justify-center rounded-full bg-m-surface-3">
            {enabled ? <Bell className="size-4" /> : <BellOff className="size-4 text-m-muted" />}
          </span>
        }
      />

      {support !== "ok" ? (
        <p className="mt-6 rounded-[22px] bg-m-sand px-5 py-3 text-sm text-m-strong">{NOTICES[support]}</p>
      ) : loading ? (
        <div className="mt-6 flex flex-col gap-2">
          <MSkeleton className="h-14 rounded-[22px]" />
          <MSkeleton className="h-14 rounded-[22px]" />
        </div>
      ) : (
        <div className="mt-6 flex flex-1 flex-col gap-2">
          <Row
            id="push-enabled"
            title="Activer sur cet appareil"
            description={
              enabled
                ? "Activées. Chaque appareil (téléphone, ordinateur) s’active séparément."
                : blocked
                  ? "Bloquées par le navigateur : autorise-les dans ses réglages pour ce site."
                  : "Le navigateur te demandera l’autorisation."
            }
            checked={enabled}
            disabled={busy || (blocked && !enabled)}
            onChange={toggle}
          />
          {enabled && (
            <>
              <Row
                id="push-alertes"
                icon={<Bell className="size-4 text-m-soft" />}
                title="Alertes"
                description="Nouveaux résultats pour tes mots-clés surveillés."
                checked={state.alertes}
                onChange={(v) => setPreference("alertes", v)}
              />
              <Row
                id="push-dossiers"
                icon={<FolderSearch className="size-4 text-m-soft" />}
                title="Dossiers d’enquête"
                description="Nouveaux articles dans les sources de tes dossiers."
                checked={state.dossiers}
                onChange={(v) => setPreference("dossiers", v)}
              />
              <MButton variant="light" size="sm" onClick={handleTest} disabled={testing} className="mt-auto self-start">
                <Send className="size-3.5!" />
                {testing ? "Envoi…" : "Envoyer une notification de test"}
              </MButton>
            </>
          )}
        </div>
      )}
    </MCard>
  )
}

function Row({
  id,
  icon,
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  id: string
  icon?: React.ReactNode
  title: string
  description: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-[22px] bg-m-surface-2 px-4 py-3">
      {icon}
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-[12px] text-m-soft">{description}</span>
      </label>
      <div className={disabled ? "pointer-events-none opacity-50" : undefined}>
        <MSwitch id={id} checked={checked} onChange={onChange} />
      </div>
    </div>
  )
}
