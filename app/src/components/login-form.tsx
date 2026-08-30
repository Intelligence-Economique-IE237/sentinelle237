import { useEffect, useState } from "react"
import type React from "react"
import { Link, useNavigate } from "react-router-dom"
import { Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp"
import { toast } from "@/components/ui/toast"
import { loginUser, verifyTotpLogin } from "@/lib/api/auth"
import { getMe } from "@/lib/api/users"
import { ApiError } from "@/lib/api/client"
import { validateLoginForm, hasErrors, type LoginFormValues } from "@/utils/validators"

// Route de destination après connexion, selon le rôle de l'utilisateur.
async function redirectAfterLogin(navigate: ReturnType<typeof useNavigate>) {
  const me = await getMe()
  navigate(me.role === "admin" ? "/admin" : "/dashboard")
}

type VerificationMessage = {
  type: "success" | "error"
  text: string
}

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const navigate = useNavigate()

  const [values, setValues] = useState<LoginFormValues>({ mail: "", password: "" })
  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormValues, string | null>>>({})
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Étape 2 : code TOTP, uniquement si le compte a la double authentification activée
  const [tempToken, setTempToken] = useState<string | null>(null)
  const [totpCode, setTotpCode] = useState("")
  const [recoveryMode, setRecoveryMode] = useState(false)

  // Retour de vérification d'email (?verified=1 ou ?verified=0&erreur=...) —
  // affiché en texte simple, pas en toast.
  const [verificationMessage, setVerificationMessage] = useState<VerificationMessage | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const verified = params.get("verified")

    if (verified === "1") {
      setVerificationMessage({
        type: "success",
        text: "Ton compte est activé, tu peux te connecter.",
      })
    } else if (verified === "0") {
      const erreur = params.get("erreur")
      setVerificationMessage({
        type: "error",
        text: erreur ? decodeURIComponent(erreur) : "Le lien est invalide ou a expiré.",
      })
    }

    if (verified !== null) {
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

      if (result.requiresTotp) {
        setTempToken(result.tempToken)
      } else {
        await redirectAfterLogin(navigate)
      }
    } catch (err) {
      if (err instanceof ApiError) {
        toast.add({ title: "Erreur", description: err.message, type: "error" })
      } else {
        toast.add({ title: "Erreur", description: "Impossible de contacter le serveur", type: "error" })
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleTotpSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!tempToken) return
    if (!recoveryMode && totpCode.length !== 6) return
    if (recoveryMode && totpCode.trim().length === 0) return

    setLoading(true)
    try {
      await verifyTotpLogin(tempToken, totpCode)
      await redirectAfterLogin(navigate)
    } catch (err) {
      if (err instanceof ApiError) {
        toast.add({ title: "Code invalide", description: err.message, type: "error" })
      } else {
        toast.add({ title: "Erreur", description: "Impossible de contacter le serveur", type: "error" })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        {tempToken === null ? (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-sm">Remplis tes informations</CardTitle>
              <CardDescription>Pour te connecter à ton compte</CardDescription>
            </CardHeader>
            <CardContent>
              {verificationMessage && (
                <p
                  className={cn(
                    "mb-4 text-center text-sm",
                    verificationMessage.type === "success" ? "text-green-600" : "text-destructive"
                  )}
                >
                  {verificationMessage.text}
                </p>
              )}
              <form onSubmit={handleSubmit} noValidate>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                      id="email"
                      type="email"
                      placeholder="toi@exemple.com"
                      value={values.mail}
                      onChange={(e) => updateField("mail", e.target.value)}
                    />
                    {errors.mail && <p className="text-sm text-destructive">{errors.mail}</p>}
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={values.password}
                        onChange={(e) => updateField("password", e.target.value)}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground transition-colors hover:text-foreground"
                        aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </Field>

                  <Field>
                    <Button type="submit" disabled={loading}>
                      {loading ? "Connexion..." : "Se connecter"}
                    </Button>
                    <FieldDescription className="text-center">
                      Pas de compte ? <Link to="/signup">Créer un compte</Link>
                    </FieldDescription>
                  </Field>
                </FieldGroup>
              </form>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>
              <CardTitle>Vérification en 2 étapes</CardTitle>
              <CardDescription>
                {recoveryMode
                  ? "Entre l'un de tes codes de récupération."
                  : "Entre le code généré par ton application d'authentification."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleTotpSubmit} noValidate>
                <Field>
                  <div className="flex items-center justify-between">
                    <FieldLabel htmlFor="otp-verification">
                      {recoveryMode ? "Code de récupération" : "Code de vérification"}
                    </FieldLabel>
                  </div>

                  {recoveryMode ? (
                    <Input
                      id="otp-verification"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value)}
                      placeholder="A1B2-C3D4"
                      autoComplete="off"
                    />
                  ) : (
                    <InputOTP maxLength={6} id="otp-verification" value={totpCode} onChange={setTotpCode}>
                      <InputOTPGroup className="*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl">
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                      </InputOTPGroup>
                      <InputOTPSeparator className="mx-2" />
                      <InputOTPGroup className="*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl">
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  )}

                  <FieldDescription>
                    <button
                      type="button"
                      onClick={() => {
                        setRecoveryMode((prev) => !prev)
                        setTotpCode("")
                      }}
                      className="underline underline-offset-4"
                    >
                      {recoveryMode
                        ? "Utiliser mon application d'authentification"
                        : "Je n'ai plus accès à mon application d'authentification"}
                    </button>
                  </FieldDescription>
                </Field>

                <Field className="mt-4">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading || (recoveryMode ? totpCode.trim().length === 0 : totpCode.length !== 6)}
                  >
                    {loading ? "Vérification..." : "Valider"}
                  </Button>
                  <FieldDescription className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setTempToken(null)
                        setTotpCode("")
                        setRecoveryMode(false)
                      }}
                      className="underline underline-offset-4"
                    >
                      Retour à la connexion
                    </button>
                  </FieldDescription>
                </Field>
              </form>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}
