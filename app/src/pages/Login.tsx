import { LoginForm } from "@/components/login-form"

export default function Login() {
  return (
    <div className="relative flex min-h-svh w-full flex-col items-center justify-center gap-6 overflow-hidden bg-white p-6 dark:bg-background md:p-10">
      {/* Calque de grille avec dégradé — décoratif, sans lien avec la structure du bloc */}
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
      <div className="relative z-10 w-full max-w-sm">
        <h1 className="font-medium, text-sm">Déjà de retour !</h1>
        <LoginForm />
      </div>
    </div>
  )
}
