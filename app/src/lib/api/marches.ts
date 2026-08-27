import { apiClient } from "./client"
import type { DashboardKpis, HistoriqueMatiereResponse, MatierePremiere } from "./types"

export async function getDashboardKpis(): Promise<DashboardKpis> {
  const { data } = await apiClient.get<DashboardKpis>("/dashboard/kpis")
  return data
}

export async function getHistoriqueMatiere(
  matiere: MatierePremiere,
  page = 1,
  limit = 50
): Promise<HistoriqueMatiereResponse> {
  const { data } = await apiClient.get<HistoriqueMatiereResponse>(
    `/dashboard/matieres/${matiere}/historique`,
    { params: { page, limit } }
  )
  return data
}