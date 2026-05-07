import { authStorageKey, sessionRefreshWindowSeconds } from "./config";
import type { AuthSession } from "./types";

export function loadStoredSession(): AuthSession | null {
  try {
    const raw = window.localStorage.getItem(authStorageKey);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

export function storeSession(session: AuthSession | null) {
  if (!session) {
    window.localStorage.removeItem(authStorageKey);
    return;
  }
  window.localStorage.setItem(authStorageKey, JSON.stringify(session));
}

export function sessionNeedsRefresh(session: AuthSession | null) {
  if (!session?.refreshToken) {
    return false;
  }
  if (!session.expiresAt) {
    return true;
  }
  return session.expiresAt - Math.floor(Date.now() / 1000) <= sessionRefreshWindowSeconds;
}
