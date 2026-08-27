import { apiClient } from "./client"
import type {
  AdminUser,
  AdminUserListParams,
  AdminUserListResponse,
  AdminUserUpdatePayload,
  AdminFluxListParams,
  AdminFluxListResponse,
  ImportOpmlPayload,
  ImportOpmlResponse,
  CategorieFlux,
  CategorieFluxPayload,
  MlFeedbackPayload,
} from "./types"

// --- Utilisateurs ---

export async function getUsers(params: AdminUserListParams = {}): Promise<AdminUserListResponse> {
  const { data } = await apiClient.get<AdminUserListResponse>("/users", { params })
  return data
}

export async function getUser(id: string): Promise<AdminUser> {
  const { data } = await apiClient.get<AdminUser>(`/users/${id}`)
  return data
}

export async function updateUser(id: string, payload: AdminUserUpdatePayload): Promise<AdminUser> {
  const { data } = await apiClient.patch<AdminUser>(`/users/${id}`, payload)
  return data
}

export async function deleteUser(id: string): Promise<void> {
  await apiClient.delete(`/users/${id}`)
}

// --- Flux (vue admin) ---

export async function getAllFluxAdmin(params: AdminFluxListParams = {}): Promise<AdminFluxListResponse> {
  const { data } = await apiClient.get<AdminFluxListResponse>("/flux/admin/all", { params })
  return data
}

export async function importOpml(payload: ImportOpmlPayload): Promise<ImportOpmlResponse> {
  const { data } = await apiClient.post<ImportOpmlResponse>("/flux/admin/import-opml", payload)
  return data
}

// --- Catégories de flux (écriture admin-only ; lecture déjà dans lib/api/feeds.ts) ---

export async function createCategorieFlux(payload: CategorieFluxPayload): Promise<CategorieFlux> {
  const { data } = await apiClient.post<CategorieFlux>("/categories-flux", payload)
  return data
}

export async function updateCategorieFlux(
  id: string,
  payload: Partial<CategorieFluxPayload>
): Promise<CategorieFlux> {
  const { data } = await apiClient.patch<CategorieFlux>(`/categories-flux/${id}`, payload)
  return data
}

export async function deleteCategorieFlux(id: string): Promise<void> {
  await apiClient.delete(`/categories-flux/${id}`)
}

// --- Machine Learning ---

export async function submitMlFeedback(payload: MlFeedbackPayload): Promise<void> {
  await apiClient.post("/ml/feedback", payload)
}

export async function retrainMl(): Promise<void> {
  await apiClient.post("/ml/retrain")
}