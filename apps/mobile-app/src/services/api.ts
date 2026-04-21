// ==============================================================================
// Dalupotha API Client
// Follows the official API Documentation spec exactly
// Base URL: http://<host>:8080 (API Gateway)
// All paths match: https://api.dalupotha.factory.local/v1/...
// ==============================================================================

import { Platform } from "react-native";

// Host selection strategy:
// 1) EXPO_PUBLIC_API_HOST if provided
// 2) localhost for web
// 3) 10.0.2.2 for Android emulator
// 4) localhost for iOS simulator/dev
const DEV_HOST =
  process.env.EXPO_PUBLIC_API_HOST ||
  (Platform.OS === "web"
    ? "localhost"
    : Platform.OS === "android"
      ? "10.0.2.2"
      : "localhost");
export const API_BASE = `http://${DEV_HOST}:8080`;

// ── 2. Authentication & Registration ─────────────────────────────────────────
export const AuthAPI = {
  login:              `${API_BASE}/auth/login`,                 // POST — TA login (employeeId + PIN)
  supplierLogin:      `${API_BASE}/auth/supplier/login`,        // POST — Supplier login (contact + PIN)
  sendOtp:            `${API_BASE}/auth/otp/send`,              // POST — Send OTP (registration only)
  verifyOtp:          `${API_BASE}/auth/otp/verify`,            // POST — Verify OTP (legacy, not used for login)
  registerSmallHolder:`${API_BASE}/auth/small-holder/register`, // POST — Register Small Holder
  registerAgent:      `${API_BASE}/auth/agent/register`,        // POST — Register Transport Agent
  getEstates:         `${API_BASE}/auth/estates`,               // GET — fetch estate list
};

// ── 3. Field Collection & Logistics ──────────────────────────────────────────
export const CollectionAPI = {
  sync:        `${API_BASE}/collection/sync`,             // POST — TA batch sync (requires TA role)
  history:     (supplierId: string) =>
               `${API_BASE}/collection/history/${supplierId}`, // GET — supply history
};

// ── 4. Financial Ledger ───────────────────────────────────────────────────────
export const FinanceAPI = {
  advanceRequest: `${API_BASE}/finance/advance-request`,        // POST — request advance payment
  ledger:         (supplierId: string) =>
                  `${API_BASE}/finance/ledger/${supplierId}`,   // GET — financial standing
};

// ── 5. Service & Inventory ────────────────────────────────────────────────────
export const ServicesAPI = {
  createRequest:  `${API_BASE}/services/request`,               // POST — fertilizer/machine/transport
  updateStatus:   (requestId: string) =>
                  `${API_BASE}/services/request/${requestId}/status`, // PATCH — approve/dispatch
};

// ── Generic API helpers ───────────────────────────────────────────────────────

/** POST request — throws with backend message on error */
export async function apiPost<T>(url: string, body: object, token?: string): Promise<T> {
  const res = await fetch(url, {
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
  const res = await fetch(url, {
    method:  "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message ?? `Error ${res.status}`);
  return data as T;
}

/** PATCH request */
export async function apiPatch<T>(url: string, body: object, token: string): Promise<T> {
  const res = await fetch(url, {
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
