import { useState } from "react"
import type React from "react"
import { Link, useNavigate } from "react-router-dom"
import worldCountries from "world-countries"
import * as Flags from "country-flag-icons/react/3x2"
import { Eye, EyeOff } from "lucide-react"
// import logo from "@/assets/logo.png"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/toast"
import { registerUser } from "@/lib/api/auth"
import { ApiError } from "@/lib/api/client"
import { validateSignUpForm, hasErrors, type SignUpFormValues } from "@/utils/validators"

const countries = worldCountries
  .map((c) => ({ code: c.cca2, name: c.name.common }))
  .sort((a, b) => a.name.localeCompare(b.name))

export default function SignUp() {
  const navigate = useNavigate()
  const [values, setValues] = useState<SignUpFormValues>({
    pseudo: "",
    mail: "",
    password: "",
    pays: "",
    ville: "",
  })
  const [errors, setErrors] = useState<Partial<Record<keyof SignUpFormValues, string | null>>>({})
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  function updateField<K extends keyof SignUpFormValues>(field: K, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: null }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const fieldErrors = validateSignUpForm(values)
    setErrors(fieldErrors)
    if (hasErrors(fieldErrors)) return

    setLoading(true)
    try {
      const res = await registerUser(values)
      toast.add({
        title: "Compte créé",
        description: res.message,
        type: "success",
      })
      setTimeout(() => navigate("/login"), 1500)
    } catch (err) {
      if (err instanceof ApiError) {
        toast.add({
          title: "Erreur",
          description:
            err.status === 409
              ? "Ce pseudo ou cet email est déjà utilisé"
              : err.message,
          type: "error",
        })
      } else {
        toast.add({
          title: "Erreur",
          description: "Impossible de contacter le serveur",
          type: "error",
        })
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
        <h1 className="lg:text-2xl md:text-xl sm:text-lg font-bold">Bienvenue sur Sentinelle 237</h1>
      </div>
      <p className="relative z-10 text-center text-sm text-muted-foreground">
        Créer votre compte maintenant <br/>et suivez les actualités pertinentes qui vous intéressent !
      </p>
      <Card className="relative z-10 w-full max-w-sm">
        <CardHeader>
         {/*<CardTitle>Créer un compte</CardTitle>
          <CardDescription>Inscris-toi en quelques secondes</CardDescription>*/}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="pseudo">Nom</Label>
              <Input
                id="pseudo"
                value={values.pseudo}
                onChange={(e) => updateField("pseudo", e.target.value)}
                placeholder="john doe"
              />
              {errors.pseudo && (
                <p className="text-sm text-destructive">{errors.pseudo}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="mail">Email</Label>
              <Input
                id="mail"
                type="email"
                value={values.mail}
                onChange={(e) => updateField("mail", e.target.value)}
                placeholder="johndoe@exemple.com"
              />
              {errors.mail && (
                <p className="text-sm text-destructive">{errors.mail}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Pays</Label>
              <Select
                value={values.pays}
                onValueChange={(v) => updateField("pays", v)}
              >
                <SelectTrigger id="country" className="w-full">
                  <SelectValue placeholder="Sélectionne ton pays" />
                </SelectTrigger>
                <SelectContent className="max-h-64" alignItemWithTrigger={false}>
                  {countries.map((c) => {
                    const FlagIcon = (
                      Flags as Record<string, React.ComponentType<{ className?: string }>>
                    )[c.code]
                    return (
                      <SelectItem key={c.code} value={c.name}>
                        <span className="mr-2 inline-flex items-center gap-2">
                          {FlagIcon && (
                            <FlagIcon className="h-3.5 w-5 shrink-0 rounded-[2px]" />
                          )}
                          {c.name}
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              {errors.pays && (
                <p className="text-sm text-destructive">{errors.pays}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ville">Ville</Label>
              <Input
                id="ville"
                value={values.ville}
                onChange={(e) => updateField("ville", e.target.value)}
                placeholder="Yaoundé"
              />
              {errors.ville && (
                <p className="text-sm text-destructive">{errors.ville}</p>
              )}
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
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Création en cours..." : "S'inscrire"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Déjà un compte ?{" "}
              <Link to="/login" className="underline">
                Se connecter
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}