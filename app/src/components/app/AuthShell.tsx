import type React from "react"
import { MBackground } from "@/components/mira/mira"
import { BrandMark } from "./BrandMark"

/** Écran commun aux pages d'authentification (connexion, inscription). */
export function AuthShell({
  title,
  subtitle,
  children,
  wide = false,
}: {
  title: React.ReactNode
  subtitle: React.ReactNode
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <div className="relative isolate flex min-h-svh flex-col items-center justify-center bg-m-bg px-4 py-10 font-sans text-m-ink antialiased">
      <MBackground />
      <div className={wide ? "w-full max-w-lg" : "w-full max-w-md"}>
        <div className="mb-8 flex justify-center">
          <BrandMark size="lg" />
        </div>
        <h1 className="text-center text-[34px] leading-[1.05] font-light tracking-[-0.06em] sm:text-[40px]">
          <span className="block">{title}</span>
          <span className="block text-m-muted">{subtitle}</span>
        </h1>
        <div className="mt-8 rounded-[32px] bg-m-surface p-6 shadow-[0_10px_30px_rgba(15,17,15,.06)] sm:p-7">{children}</div>
      </div>
    </div>
  )
}
