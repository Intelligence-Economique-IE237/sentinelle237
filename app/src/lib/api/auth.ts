import { apiClient } from "./client"
import { setAccessToken } from "./tokenStore"
import type {
  RegisterPayload,
  RegisterResponse,
  MessageResponse,
} from "./types"

import type { User } from "./types"

export async function getMe(): Promise<User> {
  const { data } = await apiClient.get<{ user: User } | User>("/users/me")
  console.log("réponse getMe:", data)
  return (data as { user?: User }).user ?? (data as User)
}

export async function registerUser(
  payload: RegisterPayload
): Promise<RegisterResponse> {
  const { data } = await apiClient.post<RegisterResponse>(
    "/auth/register",
    payload
  )
  return data
}

export async function verifyEmail(token: string): Promise<MessageResponse> {
  const { data } = await apiClient.get<MessageResponse>(
    "/auth/verify-email",
    { params: { token } }
  )
  return data
}

export async function resendVerification(
  mail: string
): Promise<MessageResponse> {
  const { data } = await apiClient.post<MessageResponse>(
    "/auth/resend-verification",
    { mail }
  )
  return data
}

export type LoginResult =
  | { requiresTotp: true; tempToken: string }
  | { requiresTotp: false }

export async function loginUser(mail: string, password: string): Promise<LoginResult> {
  const res = await apiClient.post("/auth/login", { mail, password })

  if (res.data.requiresTotp) {
    return { requiresTotp: true, tempToken: res.data.tempToken }
  }

  setAccessToken(res.data.accessToken)
  return { requiresTotp: false }
}

export async function verifyTotpLogin(tempToken: string, code: string) {
  const res = await apiClient.post("/auth/login/totp", { tempToken, code })
  setAccessToken(res.data.accessToken)
  return res.data.user
}

export async function logoutUser() {
  await apiClient.post("/auth/logout")
  setAccessToken(null)
}

