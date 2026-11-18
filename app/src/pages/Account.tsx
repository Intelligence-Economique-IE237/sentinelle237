import { useEffect, useState } from "react"
import type React from "react"
import { useNavigate } from "react-router-dom"
import { KeyRound, RefreshCw, ShieldCheck, ShieldOff } from "lucide-react"
import { MainLayout } from "@/components/app/MainLayout"
import { MAvatar, MButton, MCard, MCardHeader, MDialog, MField, MHero, MInput, MPill, MSkeleton } from "@/components/mira/mira"
import { MOtpInput, MPasswordInput } from "@/components/mira/forms"
import { toast } from "@/components/mira/toast-manager"
import { useAuth } from "@/context/AuthContext"
import { ApiError } from "@/lib/api/client"
import { deleteMe, updateMe } from "@/lib/api/users"
import { confirmTotpEnable, disableTotp, getRemainingRecoveryCodes, regenerateRecoveryCodes, startTotpEnable } from "@/lib/api/totp"
import type { User } from "@/lib/api/types"

function errorToast(err: unknown, fallback: string) {
  toast.add({ title: "Erreur", description: err instanceof ApiError ? err.message : fallback, type: "error" })
}

export default function Account() {
  const { user } = useAuth()
  return (
    <MainLayout active={{ type: "compte" }}>
      {user ? (
        <AccountContent key={user.id_user} user={user} />
      ) : (
        <div className="flex flex-col gap-[18px]">
          <MSkeleton className="h-28 w-2/3 rounded-3xl" />
          <MSkeleton className="h-64 rounded-[32px]" />
        </div>
      )}
    </MainLayout>
  )
}

function RecoveryCodes({ codes }: { codes: string[] }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {codes.map((code) => (
        <span key={code} className="rounded-xl bg-m-surface-2 py-2 text-center font-mono text-[13px] tracking-wide">
          {code}
        </span>
      ))}
    </div>
  )
}

function AccountContent({ user }: { user: User }) {
  const { setUser } = useAuth()
  const navigate = useNavigate()

  // --- Profil ---
  const [pseudo, setPseudo] = useState(user.pseudo)
  const [pays, setPays] = useState(user.pays ?? "")
  const [ville, setVille] = useState(user.ville ?? "")
  const [savingProfile, setSavingProfile] = useState(false)

  // --- Mot de passe ---
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [savingPassword, setSavingPassword] = useState(false)

  // --- Suppression de compte ---
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // --- TOTP : statut (null = pas encore vérifié) ---
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user.totp_enabled)
  const [remainingCodes, setRemainingCodes] = useState<number | null>(null)
  const checkingStatus = twoFactorEnabled && remainingCodes === null

  // --- TOTP : activation ---
  const [setupOpen, setSetupOpen] = useState(false)
  const [setupStep, setSetupStep] = useState<"qr" | "verify" | "recovery">("qr")
  const [qrCode, setQrCode] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [startingSetup, setStartingSetup] = useState(false)

  // --- TOTP : désactivation ---
  const [disableDialogOpen, setDisableDialogOpen] = useState(false)
  const [disableCode, setDisableCode] = useState("")
  const [disabling, setDisabling] = useState(false)

  // --- TOTP : régénération des codes ---
  const [regenDialogOpen, setRegenDialogOpen] = useState(false)
  const [regenCode, setRegenCode] = useState("")
  const [regenerating, setRegenerating] = useState(false)
  const [newRecoveryCodes, setNewRecoveryCodes] = useState<string[]>([])

  useEffect(() => {
    if (!user.totp_enabled) return
    getRemainingRecoveryCodes()
      .then((res) => setRemainingCodes(res.remaining))
      .catch(() => setRemainingCodes(-1))
  }, [user.totp_enabled])

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSavingProfile(true)
    try {
      const updated = await updateMe({ pseudo, pays: pays || undefined, ville: ville || undefined })
      setUser(updated)
      toast.add({ title: "Profil mis à jour", type: "success" })
    } catch (err) {
      errorToast(err, "Impossible de mettre à jour le profil")
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!currentPassword || !newPassword) return
    setSavingPassword(true)
    try {
      await updateMe({ currentPassword, newPassword })
      toast.add({ title: "Mot de passe mis à jour", type: "success" })
      setCurrentPassword("")
      setNewPassword("")
    } catch (err) {
      errorToast(err, "Impossible de changer le mot de passe")
    } finally {
      setSavingPassword(false)
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    try {
      await deleteMe()
      toast.add({ title: "Compte supprimé", type: "success" })
      navigate("/login")
    } catch {
      toast.add({ title: "Erreur", description: "Impossible de supprimer le compte", type: "error" })
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  async function handleStartTwoFactorSetup() {
    setStartingSetup(true)
    try {
      const res = await startTotpEnable()
      setQrCode(res.qrCode)
      setSetupStep("qr")
      setOtpCode("")
      setSetupOpen(true)
    } catch (err) {
      errorToast(err, "Impossible de démarrer l’activation")
    } finally {
      setStartingSetup(false)
    }
  }

  async function handleVerifyOtp(e?: React.FormEvent) {
    e?.preventDefault()
    if (otpCode.length !== 6) return
    setVerifying(true)
    try {
      const res = await confirmTotpEnable(otpCode)
      setRecoveryCodes(res.recoveryCodes)
      setSetupStep("recovery")
      setTwoFactorEnabled(true)
      setRemainingCodes(res.recoveryCodes.length)
    } catch (err) {
      errorToast(err, "Code invalide")
    } finally {
      setVerifying(false)
    }
  }

  async function handleDisableTwoFactor(e: React.FormEvent) {
    e.preventDefault()
    if (!disableCode.trim()) return
    setDisabling(true)
    try {
      await disableTotp(disableCode)
      setTwoFactorEnabled(false)
      setRemainingCodes(null)
      setDisableDialogOpen(false)
      setDisableCode("")
      toast.add({ title: "Double authentification désactivée", type: "success" })
    } catch (err) {
      errorToast(err, "Code invalide")
    } finally {
      setDisabling(false)
    }
  }

  async function handleRegenerateCodes(e: React.FormEvent) {
    e.preventDefault()
    if (!regenCode.trim()) return
    setRegenerating(true)
    try {
      const res = await regenerateRecoveryCodes(regenCode)
      setNewRecoveryCodes(res.recoveryCodes)
      setRemainingCodes(res.recoveryCodes.length)
      setRegenCode("")
      toast.add({ title: "Codes régénérés", type: "success" })
    } catch (err) {
      errorToast(err, "Code invalide")
    } finally {
      setRegenerating(false)
    }
  }

  const lowCodes = twoFactorEnabled && remainingCodes !== null && remainingCodes >= 0 && remainingCodes <= 2

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <MHero title={`${user.pseudo}.`} subtitle={user.mail} />
        <MAvatar name={user.pseudo} className="mb-1 size-16 shrink-0 text-[18px] ring-4 max-sm:hidden" />
      </div>

      <div className="grid gap-[18px] lg:grid-cols-2">
        <MCard>
          <MCardHeader title="Informations personnelles" subtitle="Ton pseudo, ton pays et ta ville." />
          <form onSubmit={handleSaveProfile} className="mt-6 flex flex-1 flex-col gap-4">
            <MField label="Pseudo" htmlFor="pseudo">
              <MInput id="pseudo" value={pseudo} onChange={(e) => setPseudo(e.target.value)} />
            </MField>
            <div className="grid grid-cols-2 gap-3">
              <MField label="Pays" htmlFor="pays">
                <MInput id="pays" value={pays} onChange={(e) => setPays(e.target.value)} />
              </MField>
              <MField label="Ville" htmlFor="ville">
                <MInput id="ville" value={ville} onChange={(e) => setVille(e.target.value)} />
              </MField>
            </div>
            <MButton type="submit" disabled={savingProfile} className="mt-auto self-start">
              {savingProfile ? "Enregistrement…" : "Enregistrer"}
            </MButton>
          </form>
        </MCard>

        <MCard>
          <MCardHeader title="Mot de passe" subtitle="Change ton mot de passe de connexion." />
          <form onSubmit={handleChangePassword} className="mt-6 flex flex-1 flex-col gap-4">
            <MField label="Mot de passe actuel" htmlFor="currentPassword">
              <MPasswordInput
                id="currentPassword"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </MField>
            <MField label="Nouveau mot de passe" htmlFor="newPassword" hint="(8 caractères minimum)">
              <MPasswordInput id="newPassword" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </MField>
            <MButton type="submit" disabled={savingPassword || !currentPassword || !newPassword} className="mt-auto self-start">
              {savingPassword ? "Mise à jour…" : "Changer le mot de passe"}
            </MButton>
          </form>
        </MCard>

        <MCard tone="dark">
          <MCardHeader
            dark
            title="Double authentification"
            subtitle="Une couche de sécurité en plus, avec une application d’authentification."
            action={
              <MPill tone={twoFactorEnabled ? "lime" : "glass"} className="h-7 px-3 text-[12px]">
                {twoFactorEnabled ? "Activée" : "Désactivée"}
              </MPill>
            }
          />
          <div className="mt-auto flex flex-col gap-4 pt-8">
            <div className="flex items-center gap-3">
              {twoFactorEnabled ? <ShieldCheck className="size-9 text-m-lime" /> : <ShieldOff className="size-9 text-white/40" />}
              <p className="text-sm text-white/70">
                {checkingStatus
                  ? "Vérification…"
                  : twoFactorEnabled
                    ? remainingCodes !== null && remainingCodes >= 0
                      ? `${remainingCodes} code${remainingCodes !== 1 ? "s" : ""} de récupération restant${remainingCodes !== 1 ? "s" : ""}.`
                      : "Ton compte est protégé."
                    : "Ton compte n’est protégé que par ton mot de passe."}
              </p>
            </div>
            {lowCodes && (
              <p className="rounded-2xl bg-m-peach px-4 py-2.5 text-[13px] text-m-orange-text">
                Il te reste peu de codes de récupération : pense à les régénérer.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {twoFactorEnabled ? (
                <>
                  <MButton variant="lime" onClick={() => setRegenDialogOpen(true)}>
                    <RefreshCw /> Régénérer mes codes
                  </MButton>
                  <MButton variant="ghost" className="text-white/70 hover:bg-white/10 hover:text-white" onClick={() => setDisableDialogOpen(true)}>
                    Désactiver
                  </MButton>
                </>
              ) : (
                <MButton variant="lime" disabled={startingSetup || checkingStatus} onClick={handleStartTwoFactorSetup}>
                  <KeyRound /> {startingSetup ? "Préparation…" : "Activer la 2FA"}
                </MButton>
              )}
            </div>
          </div>
        </MCard>

        <MCard tone="panel">
          <MCardHeader title="Zone sensible" subtitle="La suppression du compte est définitive et efface toutes tes données." />
          <div className="mt-auto pt-8">
            <MButton variant="danger" onClick={() => setDeleteDialogOpen(true)}>
              Supprimer mon compte
            </MButton>
          </div>
        </MCard>
      </div>

      {/* Suppression de compte */}
      <MDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Supprimer ton compte ?"
        description="Cette action est définitive et supprime toutes tes données. Impossible de revenir en arrière."
        footer={
          <>
            <MButton variant="light" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Annuler
            </MButton>
            <MButton variant="danger" onClick={handleDeleteAccount} disabled={deleting}>
              {deleting ? "Suppression…" : "Supprimer définitivement"}
            </MButton>
          </>
        }
      />

      {/* Activation TOTP */}
      <MDialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        title={setupStep === "qr" ? "Scanner le QR code" : setupStep === "verify" ? "Entre le code" : "Codes de récupération"}
        description={
          setupStep === "qr"
            ? "Ouvre ton application d’authentification et scanne ce code."
            : setupStep === "verify"
              ? "Saisis le code à 6 chiffres affiché dans ton application."
              : "Garde ces 10 codes en lieu sûr : ils ne s’afficheront plus jamais."
        }
      >
        {setupStep === "qr" && (
          <>
            <div className="flex justify-center rounded-[22px] bg-m-surface-2 p-5">
              {qrCode && <img src={qrCode} alt="QR code de double authentification" className="size-48 rounded-xl" />}
            </div>
            <MButton onClick={() => setSetupStep("verify")} className="w-full">
              J’ai scanné le code
            </MButton>
          </>
        )}
        {setupStep === "verify" && (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-5">
            <MOtpInput value={otpCode} onChange={setOtpCode} autoFocus />
            <MButton type="submit" disabled={otpCode.length !== 6 || verifying} className="w-full">
              {verifying ? "Vérification…" : "Vérifier"}
            </MButton>
          </form>
        )}
        {setupStep === "recovery" && (
          <>
            <RecoveryCodes codes={recoveryCodes} />
            <MButton
              onClick={() => {
                setSetupOpen(false)
                toast.add({ title: "Double authentification activée", type: "success" })
              }}
              className="w-full"
            >
              J’ai sauvegardé mes codes
            </MButton>
          </>
        )}
      </MDialog>

      {/* Désactivation TOTP */}
      <MDialog
        open={disableDialogOpen}
        onOpenChange={setDisableDialogOpen}
        title="Désactiver la 2FA"
        description="Saisis un code TOTP ou un code de récupération pour confirmer."
      >
        <form onSubmit={handleDisableTwoFactor} className="flex flex-col gap-4">
          <MInput
            aria-label="Code de confirmation"
            value={disableCode}
            onChange={(e) => setDisableCode(e.target.value)}
            placeholder="123456 ou A1B2-C3D4"
            autoComplete="off"
            className="font-mono"
          />
          <MButton type="submit" variant="danger" disabled={disabling || !disableCode.trim()} className="w-full">
            {disabling ? "Désactivation…" : "Désactiver"}
          </MButton>
        </form>
      </MDialog>

      {/* Régénération des codes de récupération */}
      <MDialog
        open={regenDialogOpen}
        onOpenChange={(open) => {
          setRegenDialogOpen(open)
          if (!open) setNewRecoveryCodes([])
        }}
        title={newRecoveryCodes.length === 0 ? "Régénérer les codes" : "Nouveaux codes de récupération"}
        description={
          newRecoveryCodes.length === 0
            ? "Confirme avec un code TOTP ou de récupération : les anciens codes seront invalidés."
            : "Garde ces 10 codes en lieu sûr : les anciens ne fonctionnent plus."
        }
      >
        {newRecoveryCodes.length === 0 ? (
          <form onSubmit={handleRegenerateCodes} className="flex flex-col gap-4">
            <MInput
              aria-label="Code de confirmation"
              value={regenCode}
              onChange={(e) => setRegenCode(e.target.value)}
              placeholder="123456 ou A1B2-C3D4"
              autoComplete="off"
              className="font-mono"
            />
            <MButton type="submit" disabled={regenerating || !regenCode.trim()} className="w-full">
              {regenerating ? "Régénération…" : "Régénérer"}
            </MButton>
          </form>
        ) : (
          <>
            <RecoveryCodes codes={newRecoveryCodes} />
            <MButton onClick={() => setRegenDialogOpen(false)} className="w-full">
              J’ai sauvegardé mes codes
            </MButton>
          </>
        )}
      </MDialog>
    </>
  )
}
