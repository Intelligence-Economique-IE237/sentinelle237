import { apiClient } from "./client"
import type {
  DashboardKpis,
  HistoriqueMatiereResponse,
  HistoriqueDeviseResponse,
  HistoriqueIndiceResponse,
  MatierePremiere,
} from "./types"

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

export async function getHistoriqueDevise(
  paire: string,
  page = 1,
  limit = 50
): Promise<HistoriqueDeviseResponse> {
  // La paire contient un "/" (ex. "EUR/XAF") — encodage obligatoire.
  const { data } = await apiClient.get<HistoriqueDeviseResponse>(
    `/dashboard/devises/${encodeURIComponent(paire)}/historique`,
    { params: { page, limit } }
  )
  return data
}

export async function getHistoriqueIndice(
  code: string,
  page = 1,
  limit = 50
): Promise<HistoriqueIndiceResponse> {
  const { data } = await apiClient.get<HistoriqueIndiceResponse>(
    `/dashboard/indices/${encodeURIComponent(code)}/historique`,
    { params: { page, limit } }
  )
  return data
}
