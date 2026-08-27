import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from '@/components/ui/toast'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/context/AuthContext'
import { CacheProvider } from '@/context/CacheContext'
import './index.css'
import App from './App.tsx'

if (
  localStorage.getItem("theme") === "dark" ||
  (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches)
) {
  document.documentElement.classList.add("dark")
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TooltipProvider>
      <AuthProvider>
        <CacheProvider>
          <BrowserRouter>
            <App />
            <Toaster />
          </BrowserRouter>
        </CacheProvider>
      </AuthProvider>
    </TooltipProvider>
  </StrictMode>,
)