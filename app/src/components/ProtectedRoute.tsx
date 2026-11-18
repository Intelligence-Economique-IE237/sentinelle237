import type { ReactNode } from "react"
import { Navigate } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    // Évite un flash de redirection vers /login pendant la restauration de session
    // (tentative de refresh via le cookie jwt au chargement de l'app)
    return (
      <div className="flex min-h-svh items-center justify-center bg-m-bg">
        <p className="flex items-center gap-2 font-mono text-[12px] text-m-soft">
          <span className="size-1.5 animate-pulse rounded-full bg-m-green" />
          Chargement…
        </p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}