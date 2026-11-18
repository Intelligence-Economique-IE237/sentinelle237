import { useState } from "react"
import type React from "react"
import { Link, useNavigate } from "react-router-dom"
import worldCountries from "world-countries"
import * as Flags from "country-flag-icons/react/3x2"
import { AuthShell } from "@/components/app/AuthShell"
import { MButton, MField, MInput, MSelect } from "@/components/mira/mira"
import { MFieldError, MPasswordInput } from "@/components/mira/forms"
import { toast } from "@/components/mira/toast-manager"
import { registerUser } from "@/lib/api/auth"
import { ApiError } from "@/lib/api/client"
import { validateSignUpForm, hasErrors, type SignUpFormValues } from "@/utils/validators"

const FLAGS = Flags as Record<string, React.ComponentType<{ className?: string }>>

const COUNTRY_OPTIONS = worldCountries
  .map((c) => ({ code: c.cca2, name: c.name.common }))
  .sort((a, b) => a.name.localeCompare(b.name))
  .map((c) => {
    const Flag = FLAGS[c.code]
    return {
      value: c.name,
      label: c.name,
      icon: Flag ? <Flag className="h-3.5 w-5 shrink-0 rounded-[3px]" /> : undefined,
    }
  })

export default function SignUp() {
  const navigate = useNavigate()
  const [values, setValues] = useState<SignUpFormValues>({ pseudo: "", mail: "", password: "", pays: "", ville: "" })
  const [errors, setErrors] = useState<Partial<Record<keyof SignUpFormValues, string | null>>>({})
  const [loading, setLoading] = useState(false)

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
      toast.add({ title: "Compte créé", description: res.message, type: "success" })
      setTimeout(() => navigate("/login"), 1500)
    } catch (err) {
      toast.add({
        title: "Erreur",
        description:
          err instanceof ApiError
            ? err.status === 409
              ? "Ce pseudo ou cet email est déjà utilisé"
              : err.message
            : "Impossible de contacter le serveur",
        type: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Bienvenue." subtitle="Crée ton compte de veille." wide>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <MField label="Pseudo" htmlFor="pseudo">
            <MInput id="pseudo" autoComplete="username" value={values.pseudo} onChange={(e) => updateField("pseudo", e.target.value)} placeholder="johndoe" />
            <MFieldError>{errors.pseudo}</MFieldError>
          </MField>
          <MField label="Email" htmlFor="mail">
            <MInput
              id="mail"
              type="email"
              autoComplete="email"
              value={values.mail}
              onChange={(e) => updateField("mail", e.target.value)}
              placeholder="johndoe@exemple.com"
            />
            <MFieldError>{errors.mail}</MFieldError>
          </MField>
          <MField label="Pays" htmlFor="country">
            <MSelect
              id="country"
              ariaLabel="Pays"
              value={values.pays}
              onChange={(v) => updateField("pays", v)}
              options={COUNTRY_OPTIONS}
              placeholder="Sélectionne ton pays"
              className="w-full rounded-2xl"
            />
            <MFieldError>{errors.pays}</MFieldError>
          </MField>
          <MField label="Ville" htmlFor="ville">
            <MInput id="ville" value={values.ville} onChange={(e) => updateField("ville", e.target.value)} placeholder="Yaoundé" />
            <MFieldError>{errors.ville}</MFieldError>
          </MField>
        </div>
        <MField label="Mot de passe" htmlFor="password" hint="(8 caractères minimum)">
          <MPasswordInput id="password" autoComplete="new-password" value={values.password} onChange={(e) => updateField("password", e.target.value)} />
          <MFieldError>{errors.password}</MFieldError>
        </MField>
        <MButton type="submit" className="mt-2 w-full" disabled={loading}>
          {loading ? "Création en cours…" : "Créer mon compte"}
        </MButton>
        <p className="text-center text-[13px] text-m-soft">
          Déjà un compte ?{" "}
          <Link to="/login" className="font-medium text-m-ink underline underline-offset-4">
            Se connecter
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}
