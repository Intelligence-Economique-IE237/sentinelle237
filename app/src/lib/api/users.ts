import { apiClient } from "./client"
import type {
  AdminUpdateUserPayload,
  PaginatedResponse,
  UpdateMePayload,
  User,
} from "./types"

function unwrapUser(data: unknown): User {
  const obj = data as Record<string, unknown>
  return (obj?.user ?? data) as User
}

export async function getMe(): Promise<User> {
  const { data } = await apiClient.get("/users/me")
  return unwrapUser(data)
}

export async function updateMe(payload: UpdateMePayload): Promise<User> {
  const { data } = await apiClient.patch("/users/me", payload)
  return unwrapUser(data)
}

export async function deleteMe(): Promise<void> {
  await apiClient.delete("/users/me")
}

// --- Admin ---
export async function getUsers(params?: {
  page?: number
  limit?: number
  role?: "veilleur" | "admin"
  offre?: "community" | "entreprise"
  activated?: boolean
  verified?: boolean
  search?: string
}): Promise<PaginatedResponse<User>> {
  const { data } = await apiClient.get<unknown>("/users", { params })
  const obj = data as Record<string, unknown>
  const list = Array.isArray(obj?.users) ? (obj.users as User[]) : []
  const pagination = (obj?.pagination as PaginatedResponse<never>["pagination"]) ?? {
    total: list.length,
    page: params?.page ?? 1,
    limit: params?.limit ?? list.length,
  }
  return { data: list, ...pagination }
}

export async function getUser(id: string): Promise<User> {
  const { data } = await apiClient.get(`/users/${id}`)
  return unwrapUser(data)
}

export async function updateUser(id: string, payload: AdminUpdateUserPayload): Promise<User> {
  const { data } = await apiClient.patch(`/users/${id}`, payload)
  return unwrapUser(data)
}

export async function deleteUser(id: string): Promise<void> {
  await apiClient.delete(`/users/${id}`)
}