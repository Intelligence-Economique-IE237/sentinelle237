import { apiClient } from "./client"
import type {
  Alerte,
  AlerteResultat,
  CreateAlertePayload,
  PaginatedResponse, Pagination,
  UpdateAlertePayload,
} from "./types"

export async function createAlerte(payload: CreateAlertePayload): Promise<Alerte> {
  const { data } = await apiClient.post<{ alerte: Alerte }>("/alertes", payload)
  return data.alerte
}

// export async function createAlerte(payload: CreateAlertePayload): Promise<Alerte> {
//   const { data } = await apiClient.post<Alerte>("/alertes", payload)
//   return data
// }

// export async function getAlertes(): Promise<Alerte[]> {
//   const { data } = await apiClient.get<Alerte[]>("/alertes")
//   return data
// }

export async function getAlerte(id: string): Promise<Alerte> {
  const { data } = await apiClient.get<Alerte>(`/alertes/${id}`)
  return data
}

export async function updateAlerte(id: string, payload: UpdateAlertePayload): Promise<Alerte> {
  const { data } = await apiClient.patch<{ alerte: Alerte }>(`/alertes/${id}`, payload)
  return data.alerte
}

export async function deleteAlerte(id: string): Promise<void> {
  await apiClient.delete(`/alertes/${id}`)
}

export async function getAlertes(): Promise<Alerte[]> {
  const { data } = await apiClient.get<unknown>("/alertes")
  if (Array.isArray(data)) return data
  const obj = data as Record<string, unknown>
  if (Array.isArray(obj?.alertes)) return obj.alertes as Alerte[]
  if (Array.isArray(obj?.data)) return obj.data as Alerte[]
  return []
}

export async function getAlerteResultats(
  id: string,
  params?: { page?: number; limit?: number; source?: "flux" | "web"; lu?: boolean }
): Promise<PaginatedResponse<AlerteResultat>> {
  const { data } = await apiClient.get<unknown>(`/alertes/${id}/resultats`, { params })
  console.log("réponse resultats:", data)

  const obj = data as Record<string, unknown>
  const list: AlerteResultat[] = Array.isArray(data)
    ? (data as AlerteResultat[])
    : Array.isArray(obj?.resultats)
      ? (obj.resultats as AlerteResultat[])
      : Array.isArray(obj?.data)
        ? (obj.data as AlerteResultat[])
        : []

  return {
    data: list,
    pagination: (obj?.pagination as Pagination) ?? {
      total: list.length,
      page: params?.page ?? 1,
      limit: params?.limit ?? list.length,
      totalPages: 1,
    },
  }
}

export async function marquerResultatLu(alerteId: string, resultatId: string): Promise<void> {
  await apiClient.patch(`/alertes/${alerteId}/resultats/${resultatId}/lu`)
}