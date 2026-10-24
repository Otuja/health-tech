import { toast } from "sonner";

export const PROD_API_URL = "https://healthtech-backend-9xpb.onrender.com";
export const LOCAL_API_URL = "http://localhost:8000";

export const getApiBase = (): string => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("healthtech_api_url");
    if (saved) return saved.replace(/\/+$/, "");
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return LOCAL_API_URL;
    }
    // Local LAN IP for mobile dev testing
    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      return `http://${hostname}:8000`;
    }
  }
  return PROD_API_URL;
};

export const setApiBase = (url: string) => {
  if (typeof window === "undefined") return;
  const clean = url.replace(/\/+$/, "");
  localStorage.setItem("healthtech_api_url", clean);
  window.dispatchEvent(new Event("healthtech_api_changed"));
};

export const checkBackendHealth = async (baseUrl: string): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/admin/`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);
    return res.status < 500;
  } catch {
    return false;
  }
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
  const base = getApiBase();
  let url = typeof input === "string" && input.startsWith("/")
    ? `${base}${input}`
    : input;

  const token = getAccessToken();
  const headers = new Headers(init.headers || {});
  
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(url, { ...init, headers });
  } catch (err) {
    if (typeof url === "string" && (url.includes("localhost:8000") || url.includes("127.0.0.1:8000"))) {
      const fallbackUrl = url.replace(/http:\/\/(localhost|127\.0\.0\.1):8000/, PROD_API_URL);
      try {
        response = await fetch(fallbackUrl, { ...init, headers });
        setApiBase(PROD_API_URL);
      } catch {
        throw err;
      }
    } else {
      throw err;
    }
  }

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
        const activeBase = getApiBase();
        const refreshRes = await fetch(`${activeBase}/api/token/refresh/`, {
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
