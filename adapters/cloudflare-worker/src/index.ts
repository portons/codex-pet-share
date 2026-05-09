import { handleAuth } from "./api/auth";
import { handleAdmin, handleCollections, handleCreators, handleUsers } from "./api/collections";
import { handlePets } from "./api/pets";
import { handleRooms, roomAuth } from "./api/rooms";
import { handleEntityShare, handleSharePet } from "./api/share";
import { handleCollectionSocialImage } from "./api/socialPreview";
import { isMaintenancePassthrough, maintenanceResponse } from "./maintenance";
import { RoomDurableObject } from "./realtime/RoomDurableObject";
import { HttpError, json, secureResponse } from "./core/http";
import { serveAsset } from "./storage/assets";
import type { AppContext, Env } from "./core/types";

export { RoomDurableObject };

export default {
  async fetch(request: Request, env: Env, executionCtx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const ctx: AppContext = { request, env, url, executionCtx };
    try {
      if (request.method === "OPTIONS") return secureResponse(ctx, new Response(null, { status: 204 }));
      const parts = url.pathname.split("/").filter(Boolean);
      if (env.PETSHARE_MAINTENANCE === "1" && !isMaintenancePassthrough(request, parts)) {
        return secureResponse(ctx, await maintenanceResponse(ctx, parts));
      }
      const response = await cachedRoute(ctx, parts);
      if (response.status === 101) return response;
      return secureResponse(ctx, response);
    } catch (error) {
      if (!(error instanceof HttpError)) console.error("cloudflare adapter request failed", error);
      return secureResponse(ctx, json({ error: error instanceof HttpError ? error.message : "request failed" }, error instanceof HttpError ? error.status : 500));
    }
  }
};

const publicApiCacheControl = "public, max-age=0, s-maxage=30";

async function cachedRoute(ctx: AppContext, parts: string[]) {
  if (!isPublicApiCacheable(ctx, parts)) return route(ctx, parts);
  const cache = (caches as unknown as { default: Cache }).default;
  const cacheKey = new Request(ctx.url.toString(), { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return withCacheState(cached, "HIT");
  const response = await route(ctx, parts);
  if (response.status !== 200) return response;
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", publicApiCacheControl);
  const cacheable = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
  ctx.executionCtx?.waitUntil(cache.put(cacheKey, cacheable.clone()));
  return withCacheState(cacheable, "MISS");
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
  if (ctx.url.searchParams.has("freshPollAt") || ctx.url.searchParams.has("nativePollAt")) return false;
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
  if (parts[1] === "admin") return handleAdmin(ctx, parts.slice(2));
  if (parts[1] === "pets") return handlePets(ctx, parts.slice(2));
  if (parts[1] === "users") return handleUsers(ctx, parts.slice(2));
  if (parts[1] === "creators") return handleCreators(ctx, parts.slice(2));
  if (ctx.request.method === "GET" && parts[1] === "collections" && parts[3] === "social-image" && parts.length === 4) return handleCollectionSocialImage(ctx, parts[2]);
  if (parts[1] === "collections") return handleCollections(ctx, parts.slice(2));
  if (parts[1] === "rooms") return handleRooms(ctx, parts.slice(2));
  return json({ error: "not found" }, 404);
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
