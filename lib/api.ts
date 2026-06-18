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
  anonymous?: boolean;
  signal?: AbortSignal;
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
  } = options;

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
  });
}

// ---------- Cashiers (Users) ----------

export interface FetchCashiersParams {
  q?: string;
  role?: string;
  includeInactive?: boolean;
}

export async function fetchCashiers(
  params: FetchCashiersParams = {},
): Promise<Cashier[]> {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.role) search.set("role", params.role);
  if (params.includeInactive) search.set("includeInactive", "true");
  const qs = search.toString();
  return apiRequest<Cashier[]>({
    method: "GET",
    path: `${API_BASE_URL}/cashiers${qs ? `?${qs}` : ""}`,
  });
}

export interface CashierPayload {
  code: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  role?: "cashier" | "manager" | "admin";
  avatarUrl?: string | null;
  password?: string;
  isActive?: boolean;
}

export async function createCashier(
  payload: CashierPayload,
): Promise<Cashier> {
  return apiRequest<Cashier>({
    method: "POST",
    path: `${API_BASE_URL}/cashiers`,
    body: payload,
  });
}

export async function updateCashier(
  id: number,
  payload: Partial<CashierPayload>,
): Promise<Cashier> {
  return apiRequest<Cashier>({
    method: "PUT",
    path: `${API_BASE_URL}/cashiers/${id}`,
    body: payload,
  });
}

export async function deleteCashier(id: number): Promise<void> {
  await apiRequest<null>({
    method: "DELETE",
    path: `${API_BASE_URL}/cashiers/${id}`,
  });
}

// ---------- Customers ----------

/** A customer as returned by the backend. */
export interface ApiCustomer {
  id: number;
  type: "person" | "company";
  name: string;
  phone: string | null;
  email: string | null;
  taxId: string | null;
  address: string | null;
  createdAt?: string;
}

export interface FetchCustomersParams {
  q?: string;
  type?: "person" | "company";
}

export async function fetchCustomers(
  params: FetchCustomersParams = {},
): Promise<ApiCustomer[]> {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.type) search.set("type", params.type);
  const qs = search.toString();
  return apiRequest<ApiCustomer[]>({
    method: "GET",
    path: `${API_BASE_URL}/customers${qs ? `?${qs}` : ""}`,
  });
}

export interface CustomerPayload {
  type?: "person" | "company";
  name: string;
  phone?: string | null;
  email?: string | null;
  taxId?: string | null;
  address?: string | null;
}

export async function createCustomer(
  payload: CustomerPayload,
): Promise<ApiCustomer> {
  return apiRequest<ApiCustomer>({
    method: "POST",
    path: `${API_BASE_URL}/customers`,
    body: payload,
  });
}

// ---------- Catalog (categories + products) ----------

/** A category as returned by the backend. */
export interface ApiCategory {
  id: number;
  label: string;
  slug: string;
  createdAt?: string;
}

/** A product size as returned by the backend. */
export interface ApiProductSize {
  id: number;
  productId: number;
  label: string;
  priceExtra: number | string;
}

/** A product as returned by the backend. */
export interface ApiProduct {
  id: number;
  name: string;
  description: string;
  price: number | string;
  categoryId: number;
  imageUrl: string;
  stockQuantity: number;
  popularity: number;
  isActive: boolean;
  // Included by the backend via eager loading:
  category?: ApiCategory | null;
  sizes?: ApiProductSize[];
  createdAt?: string;
  updatedAt?: string;
}

/** Paginated response shape returned by GET /products. */
export interface ApiPaginated<T> {
  rows: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FetchProductsParams {
  q?: string;
  category?: number | string;
  page?: number;
  limit?: number;
  includeInactive?: boolean;
}

export async function fetchCategories(): Promise<ApiCategory[]> {
  return apiRequest<ApiCategory[]>({
    method: "GET",
    path: `${API_BASE_URL}/categories`,
  });
}

export interface CategoryPayload {
  label: string;
  slug: string;
}

export async function createCategory(
  payload: CategoryPayload,
): Promise<ApiCategory> {
  return apiRequest<ApiCategory>({
    method: "POST",
    path: `${API_BASE_URL}/categories`,
    body: payload,
  });
}

export async function updateCategory(
  id: number,
  payload: Partial<CategoryPayload>,
): Promise<ApiCategory> {
  return apiRequest<ApiCategory>({
    method: "PUT",
    path: `${API_BASE_URL}/categories/${id}`,
    body: payload,
  });
}

export async function deleteCategory(id: number): Promise<void> {
  await apiRequest<null>({
    method: "DELETE",
    path: `${API_BASE_URL}/categories/${id}`,
  });
}

export async function fetchBranding(): Promise<ApiBranding> {
  return apiRequest<ApiBranding>({
    method: "GET",
    path: `${API_BASE_URL}/branding`,
  });
}

export async function updateBranding(
  payload: Partial<ApiBranding>,
): Promise<ApiBranding> {
  return apiRequest<ApiBranding>({
    method: "PUT",
    path: `${API_BASE_URL}/branding`,
    body: payload,
  });
}

/**
 * Reset the company branding to the factory defaults. The server
 * restores the same default values that the seeder ships with.
 */
export async function resetBranding(): Promise<ApiBranding> {
  return apiRequest<ApiBranding>({
    method: "POST",
    path: `${API_BASE_URL}/branding/reset`,
  });
}

export interface ApiBranding {
  id?: number;
  companyName: string;
  tagline: string;
  logoText: string;
  logoImage?: string | null;
  primaryColor: string;
  secondaryColor: string;
  idNat: string;
  rccm: string;
  taxNumber: string;
  address: string;
  phone: string;
  email: string;
  updatedAt?: string;
}

// ---------- Orders ----------

/** An order item as returned by the backend. */
export interface ApiOrderItem {
  id: number;
  orderId: number;
  productId: number;
  sizeId: number | null;
  quantity: number;
  unitPrice: number | string;
  lineTotal: number | string;
  position: number;
  product?: ApiProduct;
  size?: ApiProductSize;
}

/** A payment as returned by the backend. */
export interface ApiPayment {
  id: number;
  orderId: number;
  method: "cash" | "card" | "mobile" | "other";
  amount: number | string;
  reference: string | null;
  paidAt: string;
}

export interface ApiOrder {
  id: number;
  orderNumber: string;
  cashierId: number;
  customerId: number | null;
  status: "pending" | "paid" | "refunded" | "cancelled";
  subtotal: number | string;
  taxRate: number | string;
  taxAmount: number | string;
  totalAmount: number | string;
  currency: string;
  fxRate: number | string;
  createdAt: string;
  paidAt: string | null;
  items?: ApiOrderItem[];
  payment?: ApiPayment;
  cashier?: Pick<Cashier, "id" | "code" | "fullName">;
  customer?: unknown;
}

export interface CreateOrderItem {
  productId: number;
  sizeId?: number;
  quantity: number;
}

export interface CreateOrderPayload {
  items: CreateOrderItem[];
  customerId?: number;
  currency?: string;
}

export interface PayOrderPayload {
  method: "cash" | "card" | "mobile" | "other";
  amount: number;
  reference?: string;
}

export async function createOrder(
  payload: CreateOrderPayload,
): Promise<ApiOrder> {
  return apiRequest<ApiOrder>({
    method: "POST",
    path: `${API_BASE_URL}/orders`,
    body: payload,
  });
}

export async function payOrder(
  orderId: number,
  payload: PayOrderPayload,
): Promise<ApiOrder> {
  return apiRequest<ApiOrder>({
    method: "POST",
    path: `${API_BASE_URL}/orders/${orderId}/pay`,
    body: payload,
  });
}

export interface FetchOrdersParams {
  status?: string;
  cashierId?: number | string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export async function fetchOrders(
  params: FetchOrdersParams = {},
): Promise<ApiOrder[]> {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.cashierId !== undefined) search.set("cashierId", String(params.cashierId));
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));

  const query = search.toString();
  return apiRequest<ApiOrder[]>({
    method: "GET",
    path: `${API_BASE_URL}/orders${query ? `?${query}` : ""}`,
  });
}

export interface ApiUploadResult {
  filename: string;
  url: string;
  size?: number;
  mimetype?: string;
}

export async function uploadProductImage(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<ApiUploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}/uploads/image`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };
    xhr.onload = () => {
      let payload: any = null;
      try {
        payload = JSON.parse(xhr.responseText);
      } catch {
        // ignore — handled below
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        const data =
          payload && "data" in payload ? payload.data : (payload as ApiUploadResult);
        resolve(data);
        return;
      }
      const message =
        (payload && payload.message) ||
        `Upload failed (${xhr.status})`;
      reject(new ApiError(message, xhr.status));
    };
    xhr.onerror = () => {
      reject(new ApiError("Network error during upload", 0));
    };
    const form = new FormData();
    form.append("image", file);
    xhr.send(form);
  });
}

export interface ProductSizeInput {
  label: string;
  priceExtra?: number;
}

export interface ProductPayload {
  name: string;
  description?: string;
  price: number;
  categoryId: number;
  imageUrl?: string;
  stockQuantity?: number;
  popularity?: number;
  isActive?: boolean;
  sizes?: ProductSizeInput[];
}

export async function createProduct(
  payload: ProductPayload,
): Promise<ApiProduct> {
  return apiRequest<ApiProduct>({
    method: "POST",
    path: `${API_BASE_URL}/products`,
    body: payload,
  });
}

export async function updateProduct(
  id: number,
  payload: ProductPayload,
): Promise<ApiProduct> {
  return apiRequest<ApiProduct>({
    method: "PUT",
    path: `${API_BASE_URL}/products/${id}`,
    body: payload,
  });
}

export async function deleteProduct(id: number): Promise<void> {
  await apiRequest<null>({
    method: "DELETE",
    path: `${API_BASE_URL}/products/${id}`,
  });
}

export async function fetchProduct(id: number): Promise<ApiProduct> {
  return apiRequest<ApiProduct>({
    method: "GET",
    path: `${API_BASE_URL}/products/${id}`,
  });
}

export async function fetchProducts(
  params: FetchProductsParams = {},
): Promise<ApiPaginated<ApiProduct>> {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.category !== undefined)
    search.set("category", String(params.category));
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  if (params.includeInactive) search.set("includeInactive", "true");
  const qs = search.toString();
  // The /products endpoint returns `{ success, data, meta }` (not
  // `paginated`), so we hit it raw instead of going through the
  // generic `apiRequest` shortcut.
  const token = getStoredToken();
  const res = await fetch(
    `${API_BASE_URL}/products${qs ? `?${qs}` : ""}`,
    {
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  );
  if (!res.ok) {
    const text = await res.text();
    let message = `Request failed (${res.status})`;
    try {
      const payload = JSON.parse(text);
      if (payload?.message) message = payload.message;
    } catch {
      // ignore
    }
    throw new ApiError(message, res.status);
  }
  const payload = await res.json();
  const data = (payload && "data" in payload ? payload.data : payload) as
    | ApiProduct[]
    | { rows: ApiProduct[]; total: number; page: number; limit: number; totalPages: number };
  // Normalise: backend returns the array directly, but we want
  // a paginated shape for the front-end.
  if (Array.isArray(data)) {
    return {
      rows: data,
      total: data.length,
      page: 1,
      limit: data.length,
      totalPages: 1,
    };
  }
  return data as ApiPaginated<ApiProduct>;
}


/**
 * Generic image upload - posts a File to /api/uploads/image`n * and returns the public URL the backend assigns to it. Used
 * for product photos, user avatars, branding logos, etc.
 */
export async function uploadImage(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<ApiUploadResult> {
  return uploadProductImage(file, onProgress);
}
