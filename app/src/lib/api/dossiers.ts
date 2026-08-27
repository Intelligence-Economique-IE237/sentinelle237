import { apiClient } from "./client"
import type {
  CreateDossierPayload,
  Dossier,
  TimelineResponse,
  UpdateDossierPayload,
} from "./types"

// Réponses potentiellement enveloppées selon le backend — on reste défensif,
// comme pour /alertes (ex: { dossier: {...} } ou { dossiers: [...] })
function unwrapOne<T>(data: unknown, key: string): T {
  const obj = data as Record<string, unknown>
  return (obj?.[key] ?? data) as T
}

function unwrapList<T>(data: unknown, key: string): T[] {
  if (Array.isArray(data)) return data as T[]
  const obj = data as Record<string, unknown>
  if (Array.isArray(obj?.[key])) return obj[key] as T[]
  if (Array.isArray(obj?.data)) return obj.data as T[]
  return []
}

export async function createDossier(payload: CreateDossierPayload): Promise<Dossier> {
  const { data } = await apiClient.post("/dossiers", payload)
  return unwrapOne<Dossier>(data, "dossier")
}

export async function getDossiers(): Promise<Dossier[]> {
  const { data } = await apiClient.get("/dossiers")
  return unwrapList<Dossier>(data, "dossiers")
}

export async function getDossier(id: string): Promise<Dossier> {
  const { data } = await apiClient.get(`/dossiers/${id}`)
  return unwrapOne<Dossier>(data, "dossier")
}

export async function updateDossier(id: string, payload: UpdateDossierPayload): Promise<Dossier> {
  const { data } = await apiClient.patch(`/dossiers/${id}`, payload)
  return unwrapOne<Dossier>(data, "dossier")
}

export async function deleteDossier(id: string): Promise<void> {
  await apiClient.delete(`/dossiers/${id}`)
}

export async function linkAlerteToDossier(dossierId: string, alerteId: string): Promise<void> {
  await apiClient.post(`/dossiers/${dossierId}/alertes`, { alerte_id: alerteId })
}

export async function unlinkAlerteFromDossier(dossierId: string, alerteId: string): Promise<void> {
  await apiClient.delete(`/dossiers/${dossierId}/alertes/${alerteId}`)
}

export async function linkFluxToDossier(dossierId: string, fluxId: string): Promise<void> {
  await apiClient.post(`/dossiers/${dossierId}/flux`, { flux_id: fluxId })
}

export async function unlinkFluxFromDossier(dossierId: string, fluxId: string): Promise<void> {
  await apiClient.delete(`/dossiers/${dossierId}/flux/${fluxId}`)
}

export async function getDossierTimeline(
  id: string,
  params?: { page?: number; limit?: number }
): Promise<TimelineResponse> {
  const { data } = await apiClient.get<TimelineResponse>(`/dossiers/${id}/timeline`, { params })
  return {
    timeline: data?.timeline ?? [],
    pagination: data?.pagination ?? { total: 0, page: 1, limit: 30, totalPages: 1 },
  }
}