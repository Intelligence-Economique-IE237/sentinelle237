import { apiClient } from "./client"
import type { GenererRevuePayload, ModeleRevue, Revue } from "./types"

export async function uploadTemplate(
  file: File,
  nom?: string,
  onProgress?: (percent: number) => void
): Promise<ModeleRevue> {
  const formData = new FormData()
  formData.append("fichier", file)
  if (nom) formData.append("nom", nom)

  const { data } = await apiClient.post<{ modele: ModeleRevue }>(
    "/revues/templates",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (event) => {
        if (!event.total) return
        onProgress?.(Math.round((event.loaded * 100) / event.total))
      },
    }
  )
  return data.modele
}

export async function getTemplates(): Promise<ModeleRevue[]> {
  const { data } = await apiClient.get<unknown>("/revues/templates")
  if (Array.isArray(data)) return data as ModeleRevue[]
  const obj = data as Record<string, unknown>
  if (Array.isArray(obj?.modeles)) return obj.modeles as ModeleRevue[]
  if (Array.isArray(obj?.data)) return obj.data as ModeleRevue[]
  return []
}

export async function genererRevue(payload: GenererRevuePayload): Promise<Revue> {
  const { data } = await apiClient.post<{ revue: Revue }>("/revues/generer", payload)
  return data.revue
}

export async function telechargerRevue(id: string, filename: string): Promise<void> {
  const response = await apiClient.get(`/revues/${id}/telecharger`, {
    responseType: "blob",
  })
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement("a")
  link.href = url
  link.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}