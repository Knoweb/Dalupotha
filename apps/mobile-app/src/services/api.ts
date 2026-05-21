// ==============================================================================
// Dalupotha API Client
// Base URL: http://188.166.231.80/api (via Nginx proxy)
// ==============================================================================

import { Platform } from "react-native";

// ── 1. Base URL ────────────────────────────────────────────────────────────────
// LIVE_API is hardcoded as the default. EXPO_PUBLIC_API_HOST can override it
// (used in Expo Go dev mode via the local .env file).
const LIVE_API = "http://188.166.231.80/api";

export const API_BASE: string = (() => {
  const env = process.env.EXPO_PUBLIC_API_HOST;
  if (env && (env.startsWith("http://") || env.startsWith("https://"))) {
    return env;
  }
  return LIVE_API;
})();

// ── 2. Authentication & Registration ─────────────────────────────────────────
export const AuthAPI = {
  login:              `${API_BASE}/auth/login`,                 // POST — TA login (employeeId + PIN)
  supplierLogin:      `${API_BASE}/auth/supplier/login`,        // POST — Supplier login (passbookNo + PIN)
  sendOtp:            `${API_BASE}/auth/otp/send`,              // POST — Send OTP
  verifyOtp:          `${API_BASE}/auth/otp/verify`,            // POST — Verify OTP
  registerSmallHolder:`${API_BASE}/auth/small-holder/register`, // POST — Register Small Holder
  registerAgent:      `${API_BASE}/auth/agent/register`,        // POST — Register Transport Agent
  getEstates:         `${API_BASE}/auth/estates`,               // GET — fetch estate list
  getEstateRoutes:    (estateId: string) => `${API_BASE}/auth/estates/${estateId}/routes`,
};

// ── 3. Field Collection & Logistics ──────────────────────────────────────────
export const CollectionAPI = {
  suppliers:   `${API_BASE}/auth/suppliers`,
  sync:        `${API_BASE}/collection/sync`,
  agentHistory:(transportAgentId: string) =>
               `${API_BASE}/collection/history/agent/${transportAgentId}`,
  history:     (supplierId: string) =>
               `${API_BASE}/collection/history/${supplierId}`,
  summary:     (supplierId: string) =>
               `${API_BASE}/collection/summary/${supplierId}`,
  updateNotes: (collectionId: string) =>
               `${API_BASE}/collection/${collectionId}/notes`,
};

// ── 4. Financial Ledger ───────────────────────────────────────────────────────
export const FinanceAPI = {
  advanceRequest: `${API_BASE}/finance/advance-request`,
  ledger:         (supplierId: string) =>
                  `${API_BASE}/finance/ledger/${supplierId}`,
  ledgerTransactions: (supplierId: string) =>
                  `${API_BASE}/finance/ledger/${supplierId}/transactions`,
};

// ── 5. Notifications & Circulars ──────────────────────────────────────────────
export const NotificationAPI = {
  triCirculars: `${API_BASE}/api/notifications/tri-circulars`,
};

export const ServicesAPI = {
  createRequest:  `${API_BASE}/services/request`,
  updateStatus:   (requestId: string) =>
                  `${API_BASE}/services/request/${requestId}/status`,
  inventory:      `${API_BASE}/inventory`,
  history:        `${API_BASE}/services/request`,
};

// ── Generic API helpers ───────────────────────────────────────────────────────

/**
 * Timeout using Promise.race — avoids AbortController which has known
 * compatibility issues on certain Android devices with React Native.
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const timeoutMs = 20000; // 20 seconds

  const fetchPromise = fetch(url, options);

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(`Network timeout reaching server. Check connection to ${LIVE_API}`)),
      timeoutMs
    )
  );

  return Promise.race([fetchPromise, timeoutPromise]);
}

/** POST request — throws with backend message on error */
export async function apiPost<T>(url: string, body: object, token?: string): Promise<T> {
  const res = await fetchWithTimeout(url, {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message ?? `Error ${res.status}`);
  return data as T;
}

/** GET request — throws with backend message on error */
export async function apiGet<T>(url: string, token: string): Promise<T> {
  const res = await fetchWithTimeout(url, {
    method:  "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message ?? `Error ${res.status}`);
  return data as T;
}

/** PATCH request */
export async function apiPatch<T>(url: string, body: object, token: string): Promise<T> {
  const res = await fetchWithTimeout(url, {
    method:  "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message ?? `Error ${res.status}`);
  return data as T;
}
