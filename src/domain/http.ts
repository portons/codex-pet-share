import { apiBaseUrl } from "./config";

export function apiUrl(path: string) {
  return `${apiBaseUrl}${path}`;
}

export function petAssetUrl(path: string) {
  if (path.startsWith("/api/")) {
    return apiUrl(path);
  }
  if (typeof window !== "undefined" && path.includes("/assets/pets/")) {
    const url = new URL(path, window.location.origin);
    if (url.pathname.startsWith("/assets/pets/")) {
      return `${window.location.origin}${url.pathname}${url.search}${url.hash}`;
    }
  }
  return path;
}

export async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error || "request failed");
  }
  return body;
}
