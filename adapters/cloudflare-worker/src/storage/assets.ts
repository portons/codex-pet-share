import { HttpError, json } from "../core/http";
import type { AppContext } from "../core/types";

export function petAssetKey(ctx: AppContext, path: string) {
  return `${ctx.env.PET_BUCKET_PREFIX || "pets"}/${path}`;
}

export function petAssetUrl(ctx: AppContext, path: string, version?: string) {
  const base = ctx.env.ASSET_PUBLIC_BASE_URL.replace(/\/$/, "");
  return `${base}${version ? `/v/${encodeURIComponent(version)}` : ""}/${path}`;
}

export async function putAsset(ctx: AppContext, path: string, bytes: Uint8Array, contentType: string) {
  await ctx.env.PET_ASSETS.put(petAssetKey(ctx, path), bytes, {
    httpMetadata: {
      contentType,
      cacheControl: "public, max-age=31536000, immutable"
    }
  });
}

export async function getAssetBytes(ctx: AppContext, path: string) {
  const object = await ctx.env.PET_ASSETS.get(petAssetKey(ctx, path));
  if (!object) throw new HttpError("pet not found", 404);
  return new Uint8Array(await object.arrayBuffer());
}

export async function deleteAsset(ctx: AppContext, path: string) {
  await ctx.env.PET_ASSETS.delete(petAssetKey(ctx, path));
}

export async function serveAsset(ctx: AppContext, path: string) {
  const storagePath = assetStoragePath(path);
  const cache = (caches as unknown as { default: Cache }).default;
  const cached = await cache.match(assetCacheKey(ctx));
  if (cached) return withAssetCacheState(cached, "HIT");

  const object = await ctx.env.PET_ASSETS.get(petAssetKey(ctx, storagePath));
  if (!object) return json({ error: "pet not found" }, 404);
  const response = new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType || contentType(storagePath),
      "Cache-Control": object.httpMetadata?.cacheControl || "public, max-age=31536000, immutable",
      "ETag": object.httpEtag
    }
  });
  ctx.executionCtx?.waitUntil(cache.put(assetCacheKey(ctx), response.clone()));
  return withAssetCacheState(response, "MISS");
}

function assetStoragePath(path: string) {
  const parts = path.split("/");
  return parts[0] === "v" && parts.length >= 4 ? parts.slice(2).join("/") : path;
}

function assetCacheKey(ctx: AppContext) {
  const url = new URL(ctx.url.toString());
  url.search = "";
  return new Request(url.toString(), { method: "GET" });
}

function withAssetCacheState(response: Response, state: "HIT" | "MISS") {
  const headers = new Headers(response.headers);
  headers.set("X-Petshare-Asset-Cache", state);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export function contentType(path: string) {
  if (path.endsWith(".json")) return "application/json; charset=utf-8";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".zip")) return "application/zip";
  return "application/octet-stream";
}
