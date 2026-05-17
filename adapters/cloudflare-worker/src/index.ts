import { handleAuth } from "./api/auth";
import { handleAdmin, handleCollections, handleCreators, handleUsers } from "./api/collections";
import { handlePetComments } from "./api/comments";
import { handlePets } from "./api/pets";
import { handleRooms, roomAuth } from "./api/rooms";
import { handleEntityShare, handleSharePet } from "./api/share";
import { handleCollectionSocialImage, handleCreatorSocialImage } from "./api/socialPreview";
import { isMaintenancePassthrough, maintenanceResponse } from "./maintenance";
import { RoomDurableObject } from "./realtime/RoomDurableObject";
import { HttpError, json, readJsonBody, secureResponse } from "./core/http";
import { serveAsset } from "./storage/assets";
import type { AppContext, Env } from "./core/types";

export { RoomDurableObject };

export default {
  async fetch(request: Request, env: Env, executionCtx: ExecutionContext): Promise<Response> {
    const startedAt = Date.now();
    const requestId = crypto.randomUUID();
    const url = new URL(request.url);
    const ctx: AppContext = { request, env, url, executionCtx };
    let response: Response;
    try {
      if (request.method === "OPTIONS") {
        response = secureResponse(ctx, new Response(null, { status: 204 }));
        return withRequestDiagnostics(ctx, response, startedAt, requestId);
      }
      const parts = url.pathname.split("/").filter(Boolean);
      if (env.PETSHARE_MAINTENANCE === "1" && !isMaintenancePassthrough(request, parts)) {
        response = secureResponse(ctx, await maintenanceResponse(ctx, parts));
        return withRequestDiagnostics(ctx, response, startedAt, requestId);
      }
      response = await cachedRoute(ctx, parts);
      if (response.status === 101) return response;
      response = secureResponse(ctx, response);
    } catch (error) {
      if (!(error instanceof HttpError)) console.error("cloudflare adapter request failed", error);
      response = secureResponse(ctx, json({ error: error instanceof HttpError ? error.message : "request failed" }, error instanceof HttpError ? error.status : 500));
    }
    return withRequestDiagnostics(ctx, response, startedAt, requestId);
  }
};

const publicApiCacheControl = "public, max-age=30, s-maxage=300, stale-while-revalidate=300";

async function cachedRoute(ctx: AppContext, parts: string[]) {
  if (!isPublicApiCacheable(ctx, parts)) return route(ctx, parts);
  const cache = (caches as unknown as { default: Cache }).default;
  const cacheKey = new Request(ctx.url.toString(), { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return withCacheState(cached, "HIT");
  const response = await route(ctx, parts);
  if (response.status !== 200) return response;
  const body = await response.text();
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", publicApiCacheControl);
  headers.set("ETag", await weakEtag(body));
  const cachedResponse = new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
  ctx.executionCtx?.waitUntil(cache.put(cacheKey, cachedResponse.clone()));
  return withCacheState(cachedResponse, "MISS");
}

function withCacheState(response: Response, state: "HIT" | "MISS") {
  const headers = new Headers(response.headers);
  headers.set("X-Petshare-Cache", state);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function isPublicApiCacheable(ctx: AppContext, parts: string[]) {
  if (ctx.request.method !== "GET") return false;
  if (ctx.request.headers.has("Authorization")) return false;
  if (parts[0] !== "api") return false;
  if (ctx.url.searchParams.get("content") === "all") return false;
  if (ctx.url.searchParams.get("sort") === "random") return false;
  if (ctx.url.searchParams.has("freshPollAt") || ctx.url.searchParams.has("nativePollAt") || ctx.url.searchParams.has("uploadedAfter")) return false;
  if ((ctx.url.searchParams.get("q") || "").trim()) return false;
  if (parts[1] === "pets" && parts.length === 2) return true;
  if (parts[1] === "collections" && parts.length <= 3) return true;
  if (parts[1] === "creators" && parts[2] === "leaderboard" && parts.length === 3) return true;
  if (parts[1] === "users" && parts[2] && parts[3] === "pets" && parts.length === 4) return true;
  return false;
}

async function route(ctx: AppContext, parts: string[]) {
  if (parts[0] === "ws" && parts[1] === "rooms") return handleRoomSocket(ctx, decodeURIComponent(parts.slice(2).join("/")));
  if (parts[0] === "assets" && parts[1] === "pets") return serveAsset(ctx, parts.slice(2).join("/"));
  if (parts[0] === "share") return handleSharePet(ctx, parts[1]);
  if (parts[0] === "collections" && parts[1]) return handleEntityShare(ctx, "collections", parts[1]);
  if (parts[0] === "users" && parts[1]) return handleEntityShare(ctx, "users", parts[1]);
  if (parts[0] === "gallery") return handleEntityShare(ctx, "gallery", parts[1]);
  if ((parts[0] === "privacy" || parts[0] === "terms") && parts.length === 1) {
    return ctx.env.ASSETS.fetch(new Request(new URL("/", ctx.url.origin), ctx.request));
  }
  if (parts[0] !== "api") return ctx.env.ASSETS.fetch(ctx.request);
  if (parts[1] === "auth") return handleAuth(ctx, parts.slice(2));
  if (parts[1] === "telemetry") return handleTelemetry(ctx);
  if (parts[1] === "admin") return handleAdmin(ctx, parts.slice(2));
  if (parts[1] === "pets" && parts[2] && parts[3] === "comments") return handlePetComments(ctx, parts[2], parts.slice(4));
  if (parts[1] === "pets") return handlePets(ctx, parts.slice(2));
  if ((ctx.request.method === "GET" || ctx.request.method === "HEAD") && parts[1] === "users" && parts[2] && parts[3] === "social-image" && parts.length === 4) return handleCreatorSocialImage(ctx, parts[2]);
  if (parts[1] === "users") return handleUsers(ctx, parts.slice(2));
  if (parts[1] === "creators") return handleCreators(ctx, parts.slice(2));
  if ((ctx.request.method === "GET" || ctx.request.method === "HEAD") && parts[1] === "collections" && parts[3] === "social-image" && parts.length === 4) return handleCollectionSocialImage(ctx, parts[2]);
  if (parts[1] === "collections") return handleCollections(ctx, parts.slice(2));
  if (parts[1] === "rooms") return handleRooms(ctx, parts.slice(2));
  return json({ error: "not found" }, 404);
}

async function handleTelemetry(ctx: AppContext) {
  if (ctx.request.method !== "POST") return json({ error: "not found" }, 404);
  const body = await readJsonBody<Record<string, unknown>>(ctx.request);
  console.log(JSON.stringify({
    source: "petshare-telemetry",
    event: String(body.event || ""),
    route: String(body.route || ""),
    hashPath: String(body.hashPath || ""),
    anonymousSessionId: String(body.anonymousSessionId || ""),
    userId: body.userId ? String(body.userId) : undefined,
    deviceHint: body.deviceHint ? String(body.deviceHint) : undefined,
    petId: body.petId ? String(body.petId) : undefined,
    collectionSlug: body.collectionSlug ? String(body.collectionSlug) : undefined,
    creatorId: body.creatorId ? String(body.creatorId) : undefined,
    value: body.value ? String(body.value) : undefined,
    ts: typeof body.ts === "number" ? body.ts : Date.now()
  }));
  return json({ ok: true });
}

async function weakEtag(body: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body));
  const value = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 24);
  return `W/"${value}"`;
}

function withRequestDiagnostics(ctx: AppContext, response: Response, startedAt: number, requestId: string) {
  const durationMs = Date.now() - startedAt;
  const headers = new Headers(response.headers);
  const userAgentClass = classifyUserAgent(ctx.request.headers.get("user-agent") || "");
  headers.set("X-Request-ID", requestId);
  headers.set("X-Petshare-UA-Class", userAgentClass);
  headers.set("Server-Timing", `worker;dur=${durationMs}`);
  if (response.status >= 500 || response.status === 499 || response.status === 404) {
    const cf = (ctx.request as Request & { cf?: { colo?: string; country?: string } }).cf;
    console.warn(JSON.stringify({
      source: "petshare-request",
      requestId,
      method: ctx.request.method,
      path: ctx.url.pathname,
      status: response.status,
      durationMs,
      country: cf?.country,
      colo: cf?.colo,
      userAgentClass,
      secFetchSite: ctx.request.headers.get("sec-fetch-site") || "",
      cacheState: response.headers.get("X-Petshare-Cache") || response.headers.get("X-Petshare-Asset-Cache") || ""
    }));
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function classifyUserAgent(userAgent: string) {
  const value = userAgent.toLowerCase();
  if (!value) return "unknown";
  if (/(bot|crawler|spider|preview|facebookexternalhit|twitterbot|slackbot|discordbot|whatsapp|telegrambot|applebot|google-inspectiontool)/.test(value)) return "crawler";
  if (/(curl|wget|python|node-fetch|undici|go-http-client|okhttp)/.test(value)) return "script";
  if (/(mobile|iphone|ipad|android)/.test(value)) return "mobile";
  return "browser";
}

async function handleRoomSocket(ctx: AppContext, roomId: string) {
  if (ctx.request.headers.get("Upgrade")?.toLowerCase() !== "websocket") return json({ error: "expected websocket" }, 426);
  const token = ctx.url.searchParams.get("token") || "";
  const user = await roomAuth(ctx, token);
  const id = ctx.env.ROOMS.idFromName(roomId);
  const stub = ctx.env.ROOMS.get(id);
  const headers = new Headers(ctx.request.headers);
  headers.set("x-user-id", user.id);
  headers.set("x-room-id", roomId);
  return stub.fetch(ctx.request, { headers });
}
