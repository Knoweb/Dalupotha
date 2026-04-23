// ==============================================================================
// Dalupotha API Client
// Follows the official API Documentation spec exactly
// Base URL: http://<host>:8080 (API Gateway)
// All paths match: https://api.dalupotha.factory.local/v1/...
// ==============================================================================

import { NativeModules, Platform } from "react-native";
import Constants from "expo-constants";

// Host selection strategy:
// 1) Browser hostname for web
// 2) Expo runtime host from Constants / script URL
// 3) Android emulator fallback (10.0.2.2)
// 4) iOS simulator / local dev fallback (localhost)
// 5) EXPO_PUBLIC_API_HOST as a last-resort override
const extractHost = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const withoutProtocol = value.replace(/^https?:\/\//, "");
  const host = withoutProtocol.split(/[/:]/)[0]?.trim();
  return host || undefined;
};

const getScriptUrlHost = (): string | undefined => {
  const scriptUrl = (NativeModules as any)?.SourceCode?.scriptURL;
  return extractHost(scriptUrl);
};

const getExpoRuntimeHost = (): string | undefined => {
  const c = Constants as any;
  return (
    extractHost(c?.expoConfig?.hostUri) ||
    extractHost(c?.manifest2?.extra?.expoClient?.hostUri) ||
    extractHost(c?.manifest?.debuggerHost) ||
    getScriptUrlHost()
  );
};

const runtimeHost = getExpoRuntimeHost();
const getWebHost = (): string | undefined => {
  if (Platform.OS !== "web") return undefined;
  if (typeof window === "undefined") return undefined;
  const host = window.location?.hostname;
  return typeof host === "string" && host.trim().length > 0 ? host.trim() : undefined;
};

const webHost = getWebHost();

const isLocal = (h?: string) => h === "localhost" || h === "127.0.0.1";

const DEV_HOST =
  Platform.OS === "web"
    ? webHost || process.env.EXPO_PUBLIC_API_HOST || "localhost"
    : runtimeHost && !isLocal(runtimeHost)
      ? runtimeHost
      : Platform.OS === "android"
        ? "10.0.2.2"
        : process.env.EXPO_PUBLIC_API_HOST || "localhost";

const API_HOST = process.env.EXPO_PUBLIC_API_HOST || DEV_HOST;

// CRITICAL: All requests MUST go through the Gateway (8080)
export const API_BASE = `http://${API_HOST}:8080`;

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
  suppliers:   `${API_BASE}/auth/suppliers`,              // GET — supplier picker list (from Auth source)
  sync:        `${API_BASE}/collection/sync`,             // POST — TA batch sync (requires TA role)
  agentHistory:(transportAgentId: string) =>
               `${API_BASE}/collection/history/agent/${transportAgentId}`,
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
