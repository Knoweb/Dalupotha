// ==============================================================================
// Dalupotha API Client
// Follows the official API Documentation spec exactly
// Base URL: http://<host>:8080 (API Gateway)
// All paths match: https://api.dalupotha.factory.local/v1/...
// ==============================================================================

// ── 1. Base URL ────────────────────────────────────────────────────────────────
// LIVE_API is the hardcoded production URL — always works in the APK.
// EXPO_PUBLIC_API_HOST can override this (used in Expo Go dev mode).
const LIVE_API = "http://188.166.231.80/api";

export const API_BASE: string = (() => {
  const env = process.env.EXPO_PUBLIC_API_HOST;
  // Use env var only if it's a full URL (dev override)
  if (env && (env.startsWith("http://") || env.startsWith("https://"))) {
    return env;
  }
  // In Expo Go dev mode without env, detect Metro bundler host
  if (Platform.OS !== "web") {
    const scriptUrl = (NativeModules as any)?.SourceCode?.scriptURL;
    if (scriptUrl) {
      const withoutProtocol = scriptUrl.replace(/^https?:\/\//, "");
      const host = withoutProtocol.split(/[/:]/)[0]?.trim();
      if (host && host !== "localhost" && host !== "127.0.0.1" && !host.includes("188.166")) {
        return `http://${host}:8080`;
      }
    }
  }
  // Default: always use the live server
  return LIVE_API;
})();

// ── 2. Authentication & Registration ─────────────────────────────────────────
export const AuthAPI = {
  login:              `${API_BASE}/auth/login`,                 // POST — TA login (employeeId + PIN)
  supplierLogin:      `${API_BASE}/auth/supplier/login`,        // POST — Supplier login (contact + PIN)
  sendOtp:            `${API_BASE}/auth/otp/send`,              // POST — Send OTP (registration only)
  verifyOtp:          `${API_BASE}/auth/otp/verify`,            // POST — Verify OTP (legacy, not used for login)
  registerSmallHolder:`${API_BASE}/auth/small-holder/register`, // POST — Register Small Holder
  registerAgent:      `${API_BASE}/auth/agent/register`,        // POST — Register Transport Agent
  getEstates:         `${API_BASE}/auth/estates`,               // GET — fetch estate list
  getEstateRoutes:    (estateId: string) => `${API_BASE}/auth/estates/${estateId}/routes`, // GET — routes for estate
};

// ── 3. Field Collection & Logistics ──────────────────────────────────────────
export const CollectionAPI = {
  suppliers:   `${API_BASE}/auth/suppliers`,              // GET — supplier picker list (from Auth source)
  sync:        `${API_BASE}/collection/sync`,             // POST — TA batch sync (requires TA role)
  agentHistory:(transportAgentId: string) =>
               `${API_BASE}/collection/history/agent/${transportAgentId}`,
  history:     (supplierId: string) =>
               `${API_BASE}/collection/history/${supplierId}`, // GET — supply history
  summary:     (supplierId: string) =>
               `${API_BASE}/collection/summary/${supplierId}`, // GET — collection summary (gross/net weight)
  updateNotes: (collectionId: string) =>
               `${API_BASE}/collection/${collectionId}/notes`, // PATCH - update notes
};

// ── 4. Financial Ledger ───────────────────────────────────────────────────────
export const FinanceAPI = {
  advanceRequest: `${API_BASE}/finance/advance-request`,        // POST — request advance payment
  ledger:         (supplierId: string) =>
                  `${API_BASE}/finance/ledger/${supplierId}`,   // GET — financial standing
  ledgerTransactions: (supplierId: string) =>
                  `${API_BASE}/finance/ledger/${supplierId}/transactions`, // GET — payment history
};

// ── 5. Notifications & Circulars ──────────────────────────────────────────────
export const NotificationAPI = {
  triCirculars: `${API_BASE}/api/notifications/tri-circulars`, // GET, POST
};

export const ServicesAPI = {
  createRequest:  `${API_BASE}/services/request`,               // POST — fertilizer/machine/transport
  updateStatus:   (requestId: string) =>
                  `${API_BASE}/services/request/${requestId}/status`, // PATCH — approve/dispatch
  inventory:      `${API_BASE}/inventory`,                      // GET — fetch available items
  history:        `${API_BASE}/services/request`,               // GET — fetch request history
};

// ── Generic API helpers ───────────────────────────────────────────────────────

/** Wrapper to prevent fetch from hanging indefinitely */
async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const timeoutMs = 12000; // 12 seconds max
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal as any });
    return response;
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new Error(`Network timeout reaching server. Check connection to ${API_HOST}`);
    }
    throw err;
  } finally {
    clearTimeout(id);
  }
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
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
