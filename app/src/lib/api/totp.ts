import { apiClient } from "./client"
import type {
  TotpEnableConfirmResponse,
  TotpEnableStartResponse,
  TotpRegenerateResponse,
  TotpRemainingResponse,
} from "./types"

export async function startTotpEnable(): Promise<TotpEnableStartResponse> {
  const { data } = await apiClient.post<TotpEnableStartResponse>("/totp/enable/start")
  return data
}

export async function confirmTotpEnable(code: string): Promise<TotpEnableConfirmResponse> {
  const { data } = await apiClient.post<TotpEnableConfirmResponse>("/totp/enable/confirm", { code })
  return data
}

export async function disableTotp(code: string): Promise<void> {
  await apiClient.post("/totp/disable", { code })
}

export async function regenerateRecoveryCodes(code: string): Promise<TotpRegenerateResponse> {
  const { data } = await apiClient.post<TotpRegenerateResponse>(
    "/totp/recovery-codes/regenerate",
    { code }
  )
  return data
}

export async function getRemainingRecoveryCodes(): Promise<TotpRemainingResponse> {
  const { data } = await apiClient.get<TotpRemainingResponse>("/totp/recovery-codes/remaining")
  return data
}