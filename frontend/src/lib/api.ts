import { toast } from "sonner";

const PROD_API_URL = "https://healthtech-backend-9xpb.onrender.com";

export const getApiBase = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:8000";
    }
    // Local LAN IP for mobile dev testing
    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      return `http://${hostname}:8000`;
    }
  }
  return PROD_API_URL;
};

export const API_BASE = getApiBase();

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refresh_token");
}

export function setAuthTokens(access: string, refresh?: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("access_token", access);
  if (refresh) {
    localStorage.setItem("refresh_token", refresh);
  }
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user_role");
}

/**
 * Robust fetch wrapper that attaches Bearer token and automatically refreshes on 401.
 */
export async function authFetch(
  input: string | URL | Request,
  init: RequestInit = {}
): Promise<Response> {
  const url = typeof input === "string" && input.startsWith("/")
    ? `${API_BASE}${input}`
    : input;

  const token = getAccessToken();
  const headers = new Headers(init.headers || {});
  
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, { ...init, headers });

  // If unauthorized and we have a refresh token, attempt token refresh
  if (response.status === 401) {
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      handleAuthFailure();
      return response;
    }

    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshRes = await fetch(`${API_BASE}/api/token/refresh/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh: refreshToken }),
        });

        if (refreshRes.ok) {
          const data = await refreshRes.json();
          setAuthTokens(data.access, data.refresh);
          isRefreshing = false;
          onRefreshed(data.access);

          // Retry initial request
          const retryHeaders = new Headers(init.headers || {});
          retryHeaders.set("Authorization", `Bearer ${data.access}`);
          return fetch(url, { ...init, headers: retryHeaders });
        } else {
          isRefreshing = false;
          refreshSubscribers = [];
          handleAuthFailure();
          return response;
        }
      } catch (err) {
        isRefreshing = false;
        refreshSubscribers = [];
        handleAuthFailure();
        return response;
      }
    } else {
      // Another request is already refreshing the token, wait for it
      return new Promise<Response>((resolve) => {
        subscribeTokenRefresh(async (newToken) => {
          const retryHeaders = new Headers(init.headers || {});
          retryHeaders.set("Authorization", `Bearer ${newToken}`);
          resolve(fetch(url, { ...init, headers: retryHeaders }));
        });
      });
    }
  }

  return response;
}

function handleAuthFailure() {
  if (typeof window === "undefined") return;
  clearAuth();
  
  // Don't redirect or show toasts if already on public/auth pages
  const pathname = window.location.pathname;
  const isPublicPage = 
    pathname.startsWith("/login") || 
    pathname.startsWith("/register") || 
    pathname.startsWith("/emergency/") || 
    pathname === "/";

  if (!isPublicPage) {
    toast.error("Your session has expired. Please sign in again.");
    window.location.href = "/login";
  }
}
