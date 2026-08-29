import { apiClient } from "./client"
import type {
  AddFluxPayload,
  AddFluxResponse,
  Flux,
  FluxSuggestion,
  FluxType,
  FluxArticle,
  CategorieFlux,
} from "./types"

export async function addFlux(payload: AddFluxPayload): Promise<AddFluxResponse> {
  const { data } = await apiClient.post<AddFluxResponse>("/flux", payload)
  return data
}

export async function getMyFluxes(params?: {
  page?: number
  limit?: number
  zone?: string
  type?: FluxType
  categorie?: string
}): Promise<Flux[]> {
  const { data } = await apiClient.get<unknown>("/flux", { params })
  if (Array.isArray(data)) return data as Flux[]
  const obj = data as Record<string, unknown>
  if (Array.isArray(obj?.data)) return obj.data as Flux[]
  if (Array.isArray(obj?.flux)) return obj.flux as Flux[]
  return []
}

export async function getFluxSuggestions(params?: {
  zone?: string
  categorie?: string
  page?: number
  limit?: number
}): Promise<FluxSuggestion[]> {
  const { data } = await apiClient.get<unknown>("/flux/suggestions", { params })
  console.log("[getFluxSuggestions] erreur:", data)

  if (Array.isArray(data)) return data as FluxSuggestion[]
  const obj = data as Record<string, unknown>
  if (Array.isArray(obj?.flux)) return obj.flux as FluxSuggestion[]
  if (Array.isArray(obj?.suggestions)) return obj.suggestions as FluxSuggestion[]
  return []
}

export async function subscribeToFlux(id: string): Promise<Flux> {
  const { data } = await apiClient.post<{ flux: Flux }>(`/flux/${id}/subscribe`)
  return data.flux
}

export async function getFluxDetail(id: string): Promise<Flux> {
  const { data } = await apiClient.get<{ flux: Flux }>(`/flux/${id}`)
  return data.flux
}

export async function getFluxArticles(
  id: string,
  params?: { page?: number; limit?: number }
): Promise<FluxArticle[]> {
  const { data } = await apiClient.get<unknown>(`/flux/${id}/articles`, { params })
  console.log("[getFluxArticles] erreur:", data)
  if (Array.isArray(data)) return data as FluxArticle[]
  const obj = data as Record<string, unknown>
  if (Array.isArray(obj?.articles)) return obj.articles as FluxArticle[]
  if (Array.isArray(obj?.data)) return obj.data as FluxArticle[]
  return []
}

export async function refreshFlux(id: string): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>(`/flux/${id}/refresh`)
  return data
}

export async function unsubscribeFlux(id: string): Promise<void> {
  await apiClient.delete(`/flux/${id}`)
}

export async function getCategoriesFlux(): Promise<CategorieFlux[]> {
  const { data } = await apiClient.get<unknown>("/categories-flux")
  if (Array.isArray(data)) return data as CategorieFlux[]
  const obj = data as Record<string, unknown>
  return Array.isArray(obj?.categories) ? (obj.categories as CategorieFlux[]) : []
}

export async function toggleEpingle(fluxId: string, epingle: boolean): Promise<void> {
  await apiClient.patch(`/flux/${fluxId}/epingle`, { epingle })
}