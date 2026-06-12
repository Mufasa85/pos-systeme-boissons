// ============================================================
// Tiny fetch wrapper used to talk to the POS BRIKIN backend
// (Express + Sequelize).
//
// Base URL is read from `NEXT_PUBLIC_API_BASE_URL` (fallback
// to http://localhost:4000/api). The current `token` (when
// present) is sent as `Authorization: Bearer <token>`.
// ============================================================

const API_BASE_URL =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_API_BASE_URL) ||
  "http://localhost:4000/api"

const TOKEN_STORAGE_KEY = "pos-brikin:auth-token"

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function setStoredToken(token: string | null) {
  if (typeof window === "undefined") return
  if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
  else window.localStorage.removeItem(TOKEN_STORAGE_KEY)
}

export interface ApiErrorShape {
  success: false
  message: string
  details?: unknown
}

export class ApiError extends Error {
  status: number
  details?: unknown
  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.details = details
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: unknown
  // Optional override (e.g. when the endpoint is outside /api)
  path?: string
  // Skip Authorization header (e.g. for /login)
  anonymous?: boolean
  signal?: AbortSignal
}

export async function apiRequest<T = unknown>(
  options: RequestOptions = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    path,
    anonymous = false,
    signal,
  } = options

  const url = path ?? API_BASE_URL

  const headers: Record<string, string> = {
    Accept: "application/json",
  }
  if (body !== undefined) headers["Content-Type"] = "application/json"

  if (!anonymous) {
    const token = getStoredToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const init: RequestInit = { method, headers }
  if (signal) init.signal = signal
  if (body !== undefined) init.body = JSON.stringify(body)

  let res: Response
  try {
    res = await fetch(url, init)
  } catch (err) {
    const message =
      err instanceof Error
        ? `Network error: ${err.message}`
        : "Network error"
    throw new ApiError(message, 0)
  }

  // Try to parse JSON regardless of status — the backend always
  // returns `{ success, ... }` shaped payloads.
  let payload: any = null
  const text = await res.text()
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      // Non-JSON body — keep raw text in the error
      if (!res.ok) {
        throw new ApiError(text || res.statusText, res.status)
      }
      return text as unknown as T
    }
  }

  if (!res.ok || (payload && payload.success === false)) {
    const message =
      (payload && payload.message) ||
      res.statusText ||
      `Request failed (${res.status})`
    throw new ApiError(message, res.status, payload?.details)
  }

  // Most endpoints return `{ success: true, data: ... }`
  return (payload && "data" in payload ? payload.data : payload) as T
}

// ---------- Auth-specific helpers ----------

export interface Cashier {
  id: number
  code: string
  fullName: string
  email: string | null
  phone: string | null
  role: "cashier" | "manager" | "admin"
  avatarUrl: string | null
  isActive: boolean
  createdAt?: string
}

export interface LoginResult {
  cashier: Cashier
  token: string
}

export async function loginRequest(
  code: string,
  password: string,
): Promise<LoginResult> {
  return apiRequest<LoginResult>({
    method: "POST",
    path: `${API_BASE_URL}/cashiers/login`,
    body: { code, password },
    anonymous: true,
  })
}

export async function fetchCurrentCashier(): Promise<Cashier> {
  // The login response already contains the cashier object, so
  // the auth provider caches it. This helper exists for future
  // refresh flows.
  return apiRequest<Cashier>({
    method: "GET",
    path: `${API_BASE_URL}/cashiers`,
  })
}
