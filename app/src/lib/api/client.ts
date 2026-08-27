import axios from "axios"
import { getAccessToken, setAccessToken } from "./tokenStore"

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
})

export class ApiError extends Error {
  status: number
  data: unknown
  errors: string[]

  constructor(status: number, message: string, errors: string[], data?: unknown) {
    super(message)
    this.status = status
    this.errors = errors
    this.data = data
  }
}

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = apiClient
      .post("/auth/refresh")
      .then((res) => {
        const token = res.data.accessToken as string
        setAccessToken(token)
        return token
      })
      .catch(() => {
        setAccessToken(null)
        return null
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (axios.isAxiosError(error) && error.response) {
      const originalRequest = error.config as (typeof error.config & { _retry?: boolean })
      if (
        error.response.status === 401 &&
        !originalRequest._retry &&
        !originalRequest.url?.includes("/auth/refresh")
      ) {
        originalRequest._retry = true
        const newToken = await refreshAccessToken()
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return apiClient(originalRequest)
        }
      }

      const errors = (error.response.data as { errors?: string[] })?.errors ?? []
      const message = errors[0] ?? "Une erreur est survenue"

      return Promise.reject(
        new ApiError(error.response.status, message, errors, error.response.data)
      )
    }
    return Promise.reject(error)
  }
)

export { refreshAccessToken }