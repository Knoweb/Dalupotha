// ==============================================================================
// Dalupotha API Client
// Follows the official API Documentation spec exactly
// Base URL: http://<host>:8080 (API Gateway)
// All paths match: https://api.dalupotha.factory.local/v1/...
// ==============================================================================

import { Platform } from "react-native";

// On Android emulator, localhost resolves to 10.0.2.2
// On physical device, set this to your PC's LAN IP (e.g. 192.168.1.xx)
// Update this if your PC's IP changes.
const DEV_HOST = "192.168.8.164";
export const API_BASE = `http://${DEV_HOST}:8080`;

// ── 2. Authentication & Registration ─────────────────────────────────────────
export const AuthAPI = {
  login:              `${API_BASE}/auth/login`,                 // POST — Staff/TA login
  sendOtp:            `${API_BASE}/auth/otp/send`,              // POST — Send OTP to Small Holder
  verifyOtp:          `${API_BASE}/auth/otp/verify`,            // POST — Verify OTP → JWT
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
      Authorization: `Bearer ${token}`,
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
