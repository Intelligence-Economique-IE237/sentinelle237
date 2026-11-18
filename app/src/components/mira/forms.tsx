/**
 * Champs de formulaire spécialisés au style Mira.
 */
import { useState } from "react"
import type React from "react"
import { Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { MInput } from "./mira"

/** Mot de passe avec bouton afficher / masquer. */
export function MPasswordInput({ className, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <MInput type={visible ? "text" : "password"} className={cn("pr-12", className)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        className="absolute inset-y-0 right-1 flex w-10 cursor-pointer items-center justify-center text-m-muted transition-colors hover:text-m-ink"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}

/** Code à usage unique (TOTP) : cases individuelles, saisie par un seul champ invisible. */
export function MOtpInput({
  value,
  onChange,
  length = 6,
  id,
  autoFocus,
}: {
  value: string
  onChange: (value: string) => void
  length?: number
  id?: string
  autoFocus?: boolean
}) {
  const [focused, setFocused] = useState(false)
  const active = Math.min(value.length, length - 1)
  return (
    <div className="relative flex gap-2">
      {Array.from({ length }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className={cn(
            "flex h-14 flex-1 items-center justify-center rounded-2xl bg-m-surface-2 font-mono text-[22px] text-m-ink transition-shadow",
            i === length / 2 && "ml-2",
            focused && i === active && "ring-2 ring-m-lime"
          )}
        >
          {value[i] ?? ""}
        </span>
      ))}
      <input
        id={id}
        autoFocus={autoFocus}
        value={value}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={length}
        aria-label={`Code à ${length} chiffres`}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, length))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="absolute inset-0 cursor-text opacity-0"
      />
    </div>
  )
}

/** Message d'erreur de champ. */
export function MFieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null
  return <p className="text-[12px] text-m-orange-text">{children}</p>
}
