import { getToken } from "./token";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

export async function api<T = any>(
  path: string,
  opts: { method?: string; body?: any; auth?: boolean } = {}
): Promise<T> {
  const method = opts.method || "GET";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.auth !== false) {
    const token = await getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    let detail = "Request failed";
    try {
      const j = await res.json();
      detail = j.detail || detail;
    } catch {}
    throw new Error(detail);
  }
  return (await res.json()) as T;
}

export const COLORS = {
  surface: "#050505",
  onSurface: "#F5F5F5",
  surface2: "#121212",
  surface3: "#1C1C1C",
  onSurface2: "#E0E0E0",
  onSurface3: "#CCCCCC",
  brand: "#064E3B",
  brandPrimary: "#059669",
  brandSecondary: "#34D399",
  brandTertiary: "#A7F3D0",
  success: "#10B981",
  error: "#EF4444",
  border: "#262626",
  borderStrong: "#404040",
};
