import { useEffect, useState } from "react"
import type React from "react"
import { Link, useNavigate } from "react-router-dom"
import { AuthShell } from "@/components/app/AuthShell"
import { MButton, MField, MInput } from "@/components/mira/mira"
import { MFieldError, MOtpInput, MPasswordInput } from "@/components/mira/forms"
import { toast } from "@/components/mira/toast-manager"
import { loginUser, verifyTotpLogin } from "@/lib/api/auth"
import { getMe } from "@/lib/api/users"
import { ApiError } from "@/lib/api/client"
import { cn } from "@/lib/utils"
import { validateLoginForm, hasErrors, type LoginFormValues } from "@/utils/validators"

// Route de destination après connexion, selon le rôle de l'utilisateur.
async function redirectAfterLogin(navigate: ReturnType<typeof useNavigate>) {
  const me = await getMe()
  navigate(me.role === "admin" ? "/admin" : "/dashboard")
}

type VerificationMessage = { type: "success" | "error"; text: string }

// Retour de vérification d'email (?verified=1 ou ?verified=0&erreur=…)
function readVerificationMessage(): VerificationMessage | null {
  const params = new URLSearchParams(window.location.search)
  const verified = params.get("verified")
  if (verified === "1") return { type: "success", text: "Ton compte est activé, tu peux te connecter." }
  if (verified === "0") {
    const erreur = params.get("erreur")
    return { type: "error", text: erreur ? decodeURIComponent(erreur) : "Le lien est invalide ou a expiré." }
  }
  return null
}

function errorToast(err: unknown, title = "Erreur") {
  toast.add({ title, description: err instanceof ApiError ? err.message : "Impossible de contacter le serveur", type: "error" })
}

export default function Login() {
  const navigate = useNavigate()
  const [values, setValues] = useState<LoginFormValues>({ mail: "", password: "" })
  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormValues, string | null>>>({})
  const [loading, setLoading] = useState(false)

  // Étape 2 : code TOTP, uniquement si la double authentification est activée
  const [tempToken, setTempToken] = useState<string | null>(null)
  const [totpCode, setTotpCode] = useState("")
  const [recoveryMode, setRecoveryMode] = useState(false)

  const [verificationMessage] = useState(readVerificationMessage)
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("verified")) {
      window.history.replaceState({}, "", window.location.pathname)
    }
  }, [])

  function updateField<K extends keyof LoginFormValues>(field: K, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: null }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fieldErrors = validateLoginForm(values)
    setErrors(fieldErrors)
    if (hasErrors(fieldErrors)) return
    setLoading(true)
    try {
      const result = await loginUser(values.mail, values.password)
      if (result.requiresTotp) setTempToken(result.tempToken)
      else await redirectAfterLogin(navigate)
    } catch (err) {
      errorToast(err)
    } finally {
      setLoading(false)
    }
  }

  const codeReady = recoveryMode ? totpCode.trim().length > 0 : totpCode.length === 6

  async function handleTotpSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!tempToken || !codeReady) return
    setLoading(true)
    try {
      await verifyTotpLogin(tempToken, totpCode)
      await redirectAfterLogin(navigate)
    } catch (err) {
      errorToast(err, "Code invalide")
    } finally {
      setLoading(false)
    }
  }

  if (tempToken !== null) {
    return (
      <AuthShell title="Vérification." subtitle="Encore une étape.">
        <form onSubmit={handleTotpSubmit} noValidate className="flex flex-col gap-5">
          <p className="text-sm text-m-soft">
            {recoveryMode ? "Entre l’un de tes codes de récupération." : "Entre le code généré par ton application d’authentification."}
          </p>
          {recoveryMode ? (
            <MField label="Code de récupération" htmlFor="otp-verification">
              <MInput
                id="otp-verification"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                placeholder="A1B2-C3D4"
                autoComplete="off"
                className="font-mono uppercase"
              />
            </MField>
          ) : (
            <MOtpInput id="otp-verification" value={totpCode} onChange={setTotpCode} autoFocus />
          )}
          <MButton type="submit" className="w-full" disabled={loading || !codeReady}>
            {loading ? "Vérification…" : "Valider"}
          </MButton>
          <div className="flex flex-col items-center gap-2 text-[13px] text-m-soft">
            <button
              type="button"
              onClick={() => {
                setRecoveryMode((prev) => !prev)
                setTotpCode("")
              }}
              className="cursor-pointer underline underline-offset-4 hover:text-m-ink"
            >
              {recoveryMode ? "Utiliser mon application d’authentification" : "Je n’ai plus accès à mon application"}
            </button>
            <button
              type="button"
              onClick={() => {
                setTempToken(null)
                setTotpCode("")
                setRecoveryMode(false)
              }}
              className="cursor-pointer underline underline-offset-4 hover:text-m-ink"
            >
              Retour à la connexion
            </button>
          </div>
        </form>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Bon retour." subtitle="Connecte-toi à ta veille.">
      {verificationMessage && (
        <p
          className={cn(
            "mb-5 rounded-2xl px-4 py-3 text-sm",
            verificationMessage.type === "success" ? "bg-m-lime-soft text-m-green-text" : "bg-m-peach text-m-orange-text"
          )}
        >
          {verificationMessage.text}
        </p>
      )}
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <MField label="Email" htmlFor="email">
          <MInput
            id="email"
            type="email"
            autoComplete="email"
            placeholder="toi@exemple.com"
            value={values.mail}
            onChange={(e) => updateField("mail", e.target.value)}
            aria-invalid={!!errors.mail}
          />
          <MFieldError>{errors.mail}</MFieldError>
        </MField>
        <MField label="Mot de passe" htmlFor="password">
          <MPasswordInput
            id="password"
            autoComplete="current-password"
            value={values.password}
            onChange={(e) => updateField("password", e.target.value)}
            aria-invalid={!!errors.password}
          />
          <MFieldError>{errors.password}</MFieldError>
        </MField>
        <MButton type="submit" disabled={loading} className="mt-2 w-full">
          {loading ? "Connexion…" : "Se connecter"}
        </MButton>
        <p className="text-center text-[13px] text-m-soft">
          Pas de compte ?{" "}
          <Link to="/signup" className="font-medium text-m-ink underline underline-offset-4">
            Créer un compte
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}
