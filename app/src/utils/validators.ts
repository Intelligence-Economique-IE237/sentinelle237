export interface FieldError {
  field: string
  message: string
}

export function validatePseudo(pseudo: string): string | null {
  if (!pseudo.trim()) return "Le pseudo est requis"
  if (pseudo.trim().length < 3) return "Le pseudo doit contenir au moins 3 caractères"
  if (pseudo.trim().length > 32) return "Le pseudo ne peut pas dépasser 32 caractères"
  if (!/^[a-zA-Z0-9_-]+$/.test(pseudo.trim())) {
    return "Le pseudo ne peut contenir que des lettres, chiffres, - et _"
  }
  return null
}

export function validateEmail(mail: string): string | null {
  if (!mail.trim()) return "L'email est requis"
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(mail.trim())) return "Format d'email invalide"
  return null
}

export function validatePassword(password: string): string | null {
  if (!password) return "Le mot de passe est requis"
  if (password.length < 8) return "Le mot de passe doit contenir au moins 8 caractères"
  if (!/[a-z]/.test(password)) return "Le mot de passe doit contenir au moins une minuscule"
  if (!/[A-Z]/.test(password)) return "Le mot de passe doit contenir au moins une majuscule"
  if (!/[0-9]/.test(password)) return "Le mot de passe doit contenir au moins un chiffre"
  return null
}

export function validateCountry(pays: string): string | null {
  if (!pays.trim()) return "Le pays est requis"
  return null
}

export function validateCity(ville: string): string | null {
  if (!ville.trim()) return "La ville est requise"
  if (ville.trim().length < 2) return "Le nom de ville est trop court"
  return null
}

export interface SignUpFormValues {
  pseudo: string
  mail: string
  password: string
  pays: string
  ville: string
}

export function validateSignUpForm(
  values: SignUpFormValues
): Record<keyof SignUpFormValues, string | null> {
  return {
    pseudo: validatePseudo(values.pseudo),
    mail: validateEmail(values.mail),
    password: validatePassword(values.password),
    pays: validateCountry(values.pays),
    ville: validateCity(values.ville),
  }
}

export function hasErrors(errors: Record<string, string | null>): boolean {
  return Object.values(errors).some((e) => e !== null)
}

export type LoginFormValues = {
  mail: string
  password: string
}

export function validateLoginForm(values: LoginFormValues) {
  const errors: Partial<Record<keyof LoginFormValues, string | null>> = {}

  if (!values.mail.trim()) {
    errors.mail = "L'email est requis"
  }
  if (!values.password) {
    errors.password = "Le mot de passe est requis"
  }

  return errors
}