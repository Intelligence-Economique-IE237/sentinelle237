import { apiClient } from "./client"
import type {
  AdminUpdateUserPayload,
  PaginatedResponse,
  Pagination,
  UpdateMePayload,
  User,
} from "./types"

const DEFAULT_PAGINATION = (page?: number, limit?: number, count = 0): Pagination => ({
  total: count,
  page: page ?? 1,
  limit: limit ?? count,
  totalPages: 1,
})

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
  const pagination = (obj?.pagination as Pagination) ?? DEFAULT_PAGINATION(params?.page, params?.limit, list.length)
  return { data: list, pagination }
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