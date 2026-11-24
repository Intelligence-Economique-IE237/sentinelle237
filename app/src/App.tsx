import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import Account from './pages/Account'
import Feeds from './pages/Feeds'
import Dashboard from './pages/Dashboard'
import Admin from './pages/Admin'
import Recherche from './pages/Recherche'
import UserDashboardView from './components/UserDashboardView'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { GuideProvider } from './components/guide/GuideProvider'

import './App.css'

function App() {
    return (
        <AuthProvider>
          <GuideProvider>
            <Routes>
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<SignUp />} />
                <Route
                    path="/account"
                    element={
                        <ProtectedRoute>
                            <Account />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/tableau-de-bord"
                    element={
                        <ProtectedRoute>
                            <UserDashboardView />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/dashboard/feeds"
                    element={
                        <ProtectedRoute>
                            <Feeds />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/recherche"
                    element={
                        <ProtectedRoute>
                            <Recherche />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin"
                    element={
                        <ProtectedRoute>
                            <Admin />
                        </ProtectedRoute>
                    }
                />
            </Routes>
          </GuideProvider>
        </AuthProvider>
    )
}

export default App
