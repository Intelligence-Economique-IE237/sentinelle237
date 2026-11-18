import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from '@/components/mira/Toaster'
import { AuthProvider } from '@/context/AuthContext'
import { CacheProvider } from '@/context/CacheContext'
import './index.css'
import App from './App.tsx'
import { setupPwa } from '@/lib/pwa'

// Le design « Mira » est conçu en thème clair : on retire un éventuel mode
// sombre mémorisé par l'ancienne interface.
document.documentElement.classList.remove("dark")

// Application web installable : service worker + invitation à installer
setupPwa()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
      <AuthProvider>
        <CacheProvider>
          <BrowserRouter>
            <Toaster>
              <App />
            </Toaster>
          </BrowserRouter>
        </CacheProvider>
      </AuthProvider>
  </StrictMode>,
)