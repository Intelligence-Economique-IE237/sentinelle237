import { useState } from "react"
import type React from "react"
import { Link, useNavigate } from "react-router-dom"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

export default function Login() {
  const navigate = useNavigate()

  const [values, setValues] = useState<LoginFormValues>({ mail: "", password: "" })
  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormValues, string | null>>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  // Étape 2 : code TOTP, uniquement si le compte a la double authentification activée
  const [tempToken, setTempToken] = useState<string | null>(null)
  const [totpCode, setTotpCode] = useState("")

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
    if (!tempToken || totpCode.length !== 6) return

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
      <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 overflow-hidden bg-white p-4 dark:bg-background">
        {/* Calque de grille avec dégradé — s'estompe du centre vers les bords */}
        <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                  "linear-gradient(to right, rgb(var(--grid-line) / 0.4) 1px, transparent 1px), linear-gradient(to bottom, rgb(var(--grid-line) / 0.4) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              maskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black 20%, transparent 75%)",
              WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black 20%, transparent 75%)",
            }}
        />
        <div className="relative z-10 flex items-center gap-2">
          {/* <img src={logo} alt="Sentinelle 237" className="h-8 w-8" /> */}
          <span className="text-lg font-semibold">Sentinelle237</span>
        </div>

        <Card className="relative z-10 w-full max-w-sm">
          {tempToken === null ? (
              <>
                <CardHeader>
                  <CardTitle>Connexion</CardTitle>
                  <CardDescription>Connecte-toi à ton compte</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                    <div className="space-y-2">
                      <Label htmlFor="mail">Email</Label>
                      <Input
                          id="mail"
                          type="email"
                          value={values.mail}
                          onChange={(e) => updateField("mail", e.target.value)}
                          placeholder="toi@exemple.com"
                      />
                      {errors.mail && <p className="text-sm text-destructive">{errors.mail}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Mot de passe</Label>
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
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Connexion..." : "Se connecter"}
                    </Button>

                    <p className="text-center text-sm text-muted-foreground">
                      Pas de compte ?{" "}
                      <Link to="/signup" className="underline">
                        Créer un compte
                      </Link>
                    </p>
                  </form>
                </CardContent>
              </>
          ) : (
              <>
                <CardHeader>
                  <CardTitle>Vérification en 2 étapes</CardTitle>
                  <CardDescription>Entre le code généré par ton application d'authentification</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleTotpSubmit} className="space-y-4" noValidate>
                    <div className="space-y-2">
                      <Label htmlFor="totp">Code à 6 chiffres</Label>
                      <Input
                          id="totp"
                          inputMode="numeric"
                          maxLength={6}
                          value={totpCode}
                          onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                          placeholder="123456"
                          className="text-center text-lg tracking-widest"
                          autoFocus
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={loading || totpCode.length !== 6}>
                      {loading ? "Vérification..." : "Valider"}
                    </Button>

                    <button
                        type="button"
                        onClick={() => {
                          setTempToken(null)
                          setTotpCode("")
                        }}
                        className="w-full text-center text-sm text-muted-foreground underline"
                    >
                      Retour
                    </button>
                  </form>
                </CardContent>
              </>
          )}
        </Card>
      </div>
  )
}
