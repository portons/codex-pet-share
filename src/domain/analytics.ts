import { apiUrl } from "./http";
import type { User } from "./types";

const analyticsSessionKey = "codex-pet-share.analytics-session";

export type AnalyticsPayload = {
  route?: string;
  petId?: string;
  collectionSlug?: string;
  creatorId?: string;
  value?: string;
  user?: User | null;
};

function anonymousSessionId() {
  try {
    const existing = window.localStorage.getItem(analyticsSessionKey);
    if (existing) return existing;
    const next = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    window.localStorage.setItem(analyticsSessionKey, next);
    return next;
  } catch {
    return "unavailable";
  }
}

function deviceHint() {
  if (window.matchMedia("(max-width: 760px)").matches) return "mobile";
  if (window.matchMedia("(max-width: 1040px)").matches) return "tablet";
  return "desktop";
}

export function trackEvent(event: string, payload: AnalyticsPayload = {}) {
  const body = JSON.stringify({
    event,
    route: payload.route || "",
    hashPath: window.location.hash || "#/",
    anonymousSessionId: anonymousSessionId(),
    userId: payload.user?.id,
    deviceHint: deviceHint(),
    petId: payload.petId,
    collectionSlug: payload.collectionSlug,
    creatorId: payload.creatorId,
    value: payload.value,
    ts: Date.now()
  });
  const url = apiUrl("/api/telemetry");
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
    return;
  }
  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true
  }).catch(() => {});
}

export function trackRouteView(route: string, user: User | null) {
  trackEvent("route_view", { route, user });
}
