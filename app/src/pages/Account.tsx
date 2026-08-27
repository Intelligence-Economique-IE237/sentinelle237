import { useEffect, useState } from "react"
import type React from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Loader2, RefreshCw, ShieldCheck, ShieldOff } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/toast"
import { useAuth } from "@/context/AuthContext"
import { ApiError } from "@/lib/api/client"
import { deleteMe, updateMe } from "@/lib/api/users"
import {
  confirmTotpEnable,
  disableTotp,
  getRemainingRecoveryCodes,
  regenerateRecoveryCodes,
  startTotpEnable,
} from "@/lib/api/totp"

function getInitials(pseudo: string) {
  return pseudo.slice(0, 2).toUpperCase()
}

export default function Account() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()

  // --- Profil ---
  const [pseudo, setPseudo] = useState(user?.pseudo ?? "")
  const [pays, setPays] = useState(user?.pays ?? "")
  const [ville, setVille] = useState(user?.ville ?? "")
  const [savingProfile, setSavingProfile] = useState(false)

  // --- Mot de passe ---
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [savingPassword, setSavingPassword] = useState(false)

  // --- Suppression de compte ---
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // --- TOTP : statut ---
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.totp_enabled ?? false)
  const [remainingCodes, setRemainingCodes] = useState<number | null>(null)
  const [checkingStatus, setCheckingStatus] = useState(false)

  // --- TOTP : activation ---
  const [setupOpen, setSetupOpen] = useState(false)
  const [setupStep, setSetupStep] = useState<"qr" | "verify" | "recovery">("qr")
  const [qrCode, setQrCode] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [startingSetup, setStartingSetup] = useState(false)

  // --- TOTP : désactivation ---
  const [disableDialogOpen, setDisableDialogOpen] = useState(false)
  const [disableCode, setDisableCode] = useState("")
  const [disabling, setDisabling] = useState(false)

  // --- TOTP : régénération des codes de récupération ---
  const [regenDialogOpen, setRegenDialogOpen] = useState(false)
  const [regenCode, setRegenCode] = useState("")
  const [regenerating, setRegenerating] = useState(false)
  const [newRecoveryCodes, setNewRecoveryCodes] = useState<string[]>([])

  useEffect(() => {
    setTwoFactorEnabled(user?.totp_enabled ?? false)
    if (user?.totp_enabled) {
      setCheckingStatus(true)
      getRemainingRecoveryCodes()
        .then((res) => setRemainingCodes(res.remaining))
        .catch(() => {})
        .finally(() => setCheckingStatus(false))
    }
  }, [user?.totp_enabled])

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Chargement du profil...</p>
      </div>
    )
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSavingProfile(true)
    try {
      const updated = await updateMe({ pseudo, pays: pays || undefined, ville: ville || undefined })
      setUser(updated)
      toast.add({ title: "Profil mis à jour", type: "success" })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Impossible de mettre à jour le profil"
      toast.add({ title: "Erreur", description: message, type: "error" })
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!currentPassword || !newPassword) return
    setSavingPassword(true)
    try {
      await updateMe({ currentPassword, newPassword })
      toast.add({ title: "Mot de passe mis à jour", type: "success" })
      setCurrentPassword("")
      setNewPassword("")
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Impossible de changer le mot de passe"
      toast.add({ title: "Erreur", description: message, type: "error" })
    } finally {
      setSavingPassword(false)
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    try {
      await deleteMe()
      toast.add({ title: "Compte supprimé", type: "success" })
      navigate("/login")
    } catch {
      toast.add({ title: "Erreur", description: "Impossible de supprimer le compte", type: "error" })
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  async function handleStartTwoFactorSetup() {
    setStartingSetup(true)
    try {
      const res = await startTotpEnable()
      setQrCode(res.qrCode)
      setSetupStep("qr")
      setOtpCode("")
      setSetupOpen(true)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Impossible de démarrer l'activation"
      toast.add({ title: "Erreur", description: message, type: "error" })
    } finally {
      setStartingSetup(false)
    }
  }

  async function handleVerifyOtp() {
    if (otpCode.length !== 6) return
    setVerifying(true)
    try {
      const res = await confirmTotpEnable(otpCode)
      setRecoveryCodes(res.recoveryCodes)
      setSetupStep("recovery")
      setTwoFactorEnabled(true)
      setRemainingCodes(res.recoveryCodes.length)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Code invalide"
      toast.add({ title: "Erreur", description: message, type: "error" })
    } finally {
      setVerifying(false)
    }
  }

  function handleFinishSetup() {
    setSetupOpen(false)
    toast.add({ title: "Double authentification activée", type: "success" })
  }

  async function handleDisableTwoFactor(e: React.FormEvent) {
    e.preventDefault()
    if (!disableCode.trim()) return
    setDisabling(true)
    try {
      await disableTotp(disableCode)
      setTwoFactorEnabled(false)
      setRemainingCodes(null)
      setDisableDialogOpen(false)
      setDisableCode("")
      toast.add({ title: "Double authentification désactivée", type: "success" })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Code invalide"
      toast.add({ title: "Erreur", description: message, type: "error" })
    } finally {
      setDisabling(false)
    }
  }

  async function handleRegenerateCodes(e: React.FormEvent) {
    e.preventDefault()
    if (!regenCode.trim()) return
    setRegenerating(true)
    try {
      const res = await regenerateRecoveryCodes(regenCode)
      setNewRecoveryCodes(res.recoveryCodes)
      setRemainingCodes(res.recoveryCodes.length)
      setRegenCode("")
      toast.add({ title: "Codes régénérés", type: "success" })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Code invalide"
      toast.add({ title: "Erreur", description: message, type: "error" })
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-lg space-y-6">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-4 w-4" />
          Retournez à votre veille
        </Button>

        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg">{getInitials(user.pseudo)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-semibold">{user.pseudo}</h1>
            <p className="text-sm text-muted-foreground">{user.mail}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informations personnelles</CardTitle>
            <CardDescription>Modifie ton pseudo, ton pays et ta ville</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pseudo">Pseudo</Label>
                <Input id="pseudo" value={pseudo} onChange={(e) => setPseudo(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pays">Pays</Label>
                  <Input id="pays" value={pays} onChange={(e) => setPays(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ville">Ville</Label>
                  <Input id="ville" value={ville} onChange={(e) => setVille(e.target.value)} />
                </div>
              </div>
              <Button type="submit" disabled={savingProfile} className="gap-2">
                {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
                Enregistrer
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mot de passe</CardTitle>
            <CardDescription>Change ton mot de passe de connexion</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                disabled={savingPassword || !currentPassword || !newPassword}
                className="gap-2"
              >
                {savingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
                Changer le mot de passe
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Double authentification (2FA)</CardTitle>
            <CardDescription>
              Ajoute une couche de sécurité supplémentaire avec une application d'authentification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                {twoFactorEnabled ? (
                  <ShieldCheck className="h-5 w-5 text-green-600" />
                ) : (
                  <ShieldOff className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {checkingStatus ? "Vérification..." : twoFactorEnabled ? "2FA activée" : "2FA désactivée"}
                  </p>
                  {twoFactorEnabled && remainingCodes !== null && (
                    <p className="text-xs text-muted-foreground">
                      {remainingCodes} code{remainingCodes !== 1 ? "s" : ""} de récupération restant
                      {remainingCodes !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              </div>

              {!checkingStatus && (
                <Button
                  size="sm"
                  variant={twoFactorEnabled ? "outline" : "default"}
                  disabled={startingSetup}
                  onClick={() => (twoFactorEnabled ? setDisableDialogOpen(true) : handleStartTwoFactorSetup())}
                >
                  {twoFactorEnabled ? "Désactiver" : startingSetup ? "..." : "Activer"}
                </Button>
              )}
            </div>

            {twoFactorEnabled && remainingCodes !== null && remainingCodes <= 2 && (
              <div className="rounded-md border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-sm text-orange-700 dark:text-orange-400">
                Il te reste peu de codes de récupération — pense à les régénérer.
              </div>
            )}

            {twoFactorEnabled && (
              <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setRegenDialogOpen(true)}>
                <RefreshCw className="h-3.5 w-3.5" />
                Régénérer mes codes de récupération
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-destructive">Zone dangereuse</CardTitle>
            <CardDescription>Cette action est irréversible</CardDescription>
          </CardHeader>
          <CardContent>
            <Separator className="mb-4" />
            <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
              Supprimer mon compte
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Suppression de compte */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer ton compte ?</DialogTitle>
            <DialogDescription>
              Cette action est définitive et supprime toutes tes données. Impossible de revenir en arrière.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleting}>
              {deleting ? "Suppression..." : "Supprimer définitivement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activation TOTP */}
      <Dialog open={setupOpen} onOpenChange={setSetupOpen}>
        <DialogContent className="sm:max-w-sm">
          {setupStep === "qr" && (
            <>
              <DialogHeader>
                <DialogTitle>Scanner le QR code</DialogTitle>
                <DialogDescription>
                  Ouvre ton application d'authentification et scanne ce code
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center justify-center rounded-lg border p-4">
                <img src={qrCode} alt="QR code TOTP" className="h-48 w-48" />
              </div>
              <DialogFooter>
                <Button onClick={() => setSetupStep("verify")} className="w-full">
                  J'ai scanné le code
                </Button>
              </DialogFooter>
            </>
          )}

          {setupStep === "verify" && (
            <>
              <DialogHeader>
                <DialogTitle>Entre le code</DialogTitle>
                <DialogDescription>
                  Saisis le code à 6 chiffres affiché dans ton application
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-center py-4">
                <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <DialogFooter>
                <Button onClick={handleVerifyOtp} disabled={otpCode.length !== 6 || verifying} className="w-full">
                  {verifying ? "Vérification..." : "Vérifier"}
                </Button>
              </DialogFooter>
            </>
          )}

          {setupStep === "recovery" && (
            <>
              <DialogHeader>
                <DialogTitle>Codes de récupération</DialogTitle>
                <DialogDescription>
                  Garde ces 10 codes en lieu sûr — ils ne s'afficheront plus jamais.
                </DialogDescription>
              </DialogHeader>
              <Separator />
              <div className="grid grid-cols-2 gap-2 py-2 font-mono text-sm">
                {recoveryCodes.map((code) => (
                  <div key={code} className="rounded bg-muted px-2 py-1 text-center">
                    {code}
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button onClick={handleFinishSetup} className="w-full">
                  J'ai sauvegardé mes codes
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Désactivation TOTP */}
      <Dialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Désactiver la 2FA</DialogTitle>
            <DialogDescription>
              Saisis un code TOTP ou un code de récupération pour confirmer
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDisableTwoFactor} className="space-y-4">
            <Input
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value)}
              placeholder="123456 ou A1B2-C3D4"
              autoComplete="off"
            />
            <Button type="submit" variant="destructive" disabled={disabling} className="w-full">
              {disabling ? "Désactivation..." : "Désactiver"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Régénération des codes de récupération */}
      <Dialog
        open={regenDialogOpen}
        onOpenChange={(open) => {
          setRegenDialogOpen(open)
          if (!open) setNewRecoveryCodes([])
        }}
      >
        <DialogContent className="sm:max-w-sm">
          {newRecoveryCodes.length === 0 ? (
            <>
              <DialogHeader>
                <DialogTitle>Régénérer les codes</DialogTitle>
                <DialogDescription>
                  Confirme avec un code TOTP ou de récupération — les anciens codes seront invalidés
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleRegenerateCodes} className="space-y-4">
                <Input
                  value={regenCode}
                  onChange={(e) => setRegenCode(e.target.value)}
                  placeholder="123456 ou A1B2-C3D4"
                  autoComplete="off"
                />
                <Button type="submit" disabled={regenerating} className="w-full">
                  {regenerating ? "Régénération..." : "Régénérer"}
                </Button>
              </form>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Nouveaux codes de récupération</DialogTitle>
                <DialogDescription>
                  Garde ces 10 codes en lieu sûr — les anciens ne fonctionnent plus.
                </DialogDescription>
              </DialogHeader>
              <Separator />
              <div className="grid grid-cols-2 gap-2 py-2 font-mono text-sm">
                {newRecoveryCodes.map((code) => (
                  <div key={code} className="rounded bg-muted px-2 py-1 text-center">
                    {code}
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button onClick={() => setRegenDialogOpen(false)} className="w-full">
                  J'ai sauvegardé mes codes
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}