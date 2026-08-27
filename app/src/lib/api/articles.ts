import { apiClient } from "./client"
import type { ArticleDetail, ArticleFavori, PaginatedResponse, ArticleAnnote, Pagination } from "./types"

const DEFAULT_PAGINATION = (page?: number, limit?: number, count = 0): Pagination => ({
  total: count,
  page: page ?? 1,
  limit: limit ?? count,
  totalPages: 1,
})

export async function getFavoris(params?: {
  page?: number
  limit?: number
}): Promise<PaginatedResponse<ArticleFavori>> {
  const { data } = await apiClient.get<unknown>("/articles/favoris", { params })
  const obj = data as Record<string, unknown>
  const list = Array.isArray(obj?.articles) ? (obj.articles as ArticleFavori[]) : []
  const pagination = (obj?.pagination as Pagination) ?? DEFAULT_PAGINATION(params?.page, params?.limit, list.length)
  return { data: list, pagination }
}

export async function getArticleDetail(id: string): Promise<ArticleDetail> {
  const { data } = await apiClient.get<{ article: ArticleDetail }>(`/articles/${id}`)
  return data.article
}

export async function updateArticleAnnotation(id: string, note: string | null): Promise<void> {
  await apiClient.patch(`/articles/${id}/annotation`, { note })
}

export async function updateArticleFavori(id: string, favori: boolean): Promise<void> {
  await apiClient.patch(`/articles/${id}/favori`, { favori })
}

export async function getAnnotes(params?: {
  page?: number
  limit?: number
}): Promise<PaginatedResponse<ArticleAnnote>> {
  const { data } = await apiClient.get<unknown>("/articles/annotes", { params })
  const obj = data as Record<string, unknown>
  const list = Array.isArray(obj?.articles) ? (obj.articles as ArticleAnnote[]) : []
  const pagination = (obj?.pagination as Pagination) ?? DEFAULT_PAGINATION(params?.page, params?.limit, list.length)
  return { data: list, pagination }
}