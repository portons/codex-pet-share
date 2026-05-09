import { apiBaseUrl } from "./config";

export function apiUrl(path: string) {
  return `${apiBaseUrl}${path}`;
}

export function petAssetUrl(path: string) {
  if (path.startsWith("/api/")) {
    return apiUrl(path);
  }
  if (path.includes("/assets/pets/")) {
    const url = new URL(path, apiBaseUrl);
    if (url.pathname.startsWith("/assets/pets/")) {
      return `${apiBaseUrl}${url.pathname}${url.search}${url.hash}`;
    }
  }
  return path;
}

export function petTextureAssetUrl(path: string) {
  const resolved = petAssetUrl(path);
  if (typeof window === "undefined") return resolved;
  const url = new URL(resolved, window.location.href);
  if (url.origin !== window.location.origin) {
    url.searchParams.set("texture", "1");
    return url.toString();
  }
  return resolved;
}

export async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error || "request failed");
  }
  return body;
}
