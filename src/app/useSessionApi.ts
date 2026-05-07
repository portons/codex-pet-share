import { useState } from "react";
import { apiUrl, readJson } from "../domain/http";
import { loadStoredSession, sessionNeedsRefresh, storeSession } from "../domain/session";
import type { AuthSession, User } from "../domain/types";

export function useSessionApi() {
  const [session, setSession] = useState<AuthSession | null>(() => loadStoredSession());
  const [user, setUser] = useState<User | null>(null);

  function applySession(nextSession: AuthSession | null) {
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
    const response = await fetch(apiUrl(path), { ...init, headers });
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
