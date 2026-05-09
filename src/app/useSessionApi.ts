import { useState } from "react";
import { apiUrl, readJson } from "../domain/http";
import { loadStoredSession, sessionNeedsRefresh, storeSession } from "../domain/session";
import type { AuthSession, User } from "../domain/types";

type CachedResponse = {
  expiresAt: number;
  promise: Promise<Response>;
};

const getCache = new Map<string, CachedResponse>();

function clearGetCache() {
  getCache.clear();
}

function requestMethod(init: RequestInit) {
  return String(init.method || "GET").toUpperCase();
}

function cacheTtlMs(path: string, init: RequestInit) {
  if (requestMethod(init) !== "GET" || init.body || init.cache === "no-store") return 0;
  const url = new URL(path, "https://app.local");
  if (url.searchParams.get("sort") === "random") return 0;
  if (url.searchParams.has("random")) return 0;
  if (url.searchParams.has("freshPollAt") || url.searchParams.has("nativePollAt")) return 0;
  if (url.pathname === "/api/auth/me") return 60_000;
  if (url.pathname === "/api/pets") return 60_000;
  if (url.pathname === "/api/collections" || /^\/api\/collections\/[^/]+$/.test(url.pathname)) return 120_000;
  if (url.pathname === "/api/creators/leaderboard") return 120_000;
  if (/^\/api\/users\/[^/]+\/pets$/.test(url.pathname)) return 120_000;
  return 0;
}

function cacheKey(path: string, authSession: AuthSession | null | undefined) {
  return `${authSession?.accessToken || "anon"} ${path}`;
}

async function cachedGet(path: string, init: RequestInit, authSession: AuthSession | null | undefined, headers: Headers) {
  const ttl = cacheTtlMs(path, init);
  if (!ttl) return fetch(apiUrl(path), { ...init, headers });

  const key = cacheKey(path, authSession);
  const now = Date.now();
  const cached = getCache.get(key);
  if (cached && cached.expiresAt > now) {
    return (await cached.promise).clone();
  }

  const promise = fetch(apiUrl(path), { ...init, headers })
    .then((response) => {
      if (!response.ok || response.status >= 500) {
        getCache.delete(key);
      }
      return response;
    })
    .catch((error) => {
      getCache.delete(key);
      throw error;
    });
  getCache.set(key, { expiresAt: now + ttl, promise });
  return (await promise).clone();
}

export function useSessionApi() {
  const [session, setSession] = useState<AuthSession | null>(() => loadStoredSession());
  const [user, setUser] = useState<User | null>(null);

  function applySession(nextSession: AuthSession | null) {
    clearGetCache();
    setSession(nextSession);
    storeSession(nextSession);
    void import("../realtime/providerClient").then(async (module) => {
      await module.applyClientSession(nextSession ? {
        accessToken: nextSession.accessToken,
        refreshToken: nextSession.refreshToken
      } : null);
    });
  }

  async function refreshSession(authSession = session) {
    if (!authSession?.refreshToken) {
      applySession(null);
      setUser(null);
      throw new Error("session expired");
    }
    const response = await fetch(apiUrl("/api/auth/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: authSession.refreshToken })
    });
    if (!response.ok) {
      applySession(null);
      setUser(null);
      throw new Error("session expired");
    }
    const body = await readJson<{ user: User; session: AuthSession | null }>(response);
    if (!body.session) {
      applySession(null);
      setUser(null);
      throw new Error("session expired");
    }
    applySession(body.session);
    setUser(body.user);
    return body.session;
  }

  async function apiFetch(path: string, init: RequestInit = {}, authSession = session, retryRefresh = true) {
    let activeSession = authSession;
    if (sessionNeedsRefresh(activeSession)) {
      activeSession = await refreshSession(activeSession);
    }
    const headers = new Headers(init.headers);
    if (activeSession?.accessToken) {
      headers.set("Authorization", `Bearer ${activeSession.accessToken}`);
    }
    const response = requestMethod(init) === "GET"
      ? await cachedGet(path, init, activeSession, headers)
      : await fetch(apiUrl(path), { ...init, headers });
    if (requestMethod(init) !== "GET" && response.ok) {
      clearGetCache();
    }
    if (response.status === 401 && retryRefresh && activeSession?.refreshToken && path !== "/api/auth/refresh") {
      const refreshedSession = await refreshSession(activeSession);
      return apiFetch(path, init, refreshedSession, false);
    }
    return response;
  }

  async function loadMe(authSession = session) {
    const body = await readJson<{ user: User | null }>(await apiFetch("/api/auth/me", {}, authSession));
    setUser(body.user);
    return body.user;
  }

  return {
    session,
    user,
    setUser,
    apiFetch,
    applySession,
    loadMe,
    refreshSession
  };
}
