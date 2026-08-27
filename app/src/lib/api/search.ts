import { apiClient } from "./client"
import type { RechercheAvanceePayload, RechercheAvanceeResponse } from "./types"

export async function rechercheAvancee(
  payload: RechercheAvanceePayload
): Promise<RechercheAvanceeResponse> {
  try {
    const { data } = await apiClient.post<RechercheAvanceeResponse>("/recherche-avancee", payload)
    return data
  } catch (err) {
    console.error("[rechercheAvancee] erreur:", err)
    throw err
  }
}