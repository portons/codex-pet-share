import { HttpError, json } from "../core/http";
import type { AppContext } from "../core/types";

export function petAssetKey(ctx: AppContext, path: string) {
  return `${ctx.env.PET_BUCKET_PREFIX || "pets"}/${path}`;
}

export function petAssetUrl(ctx: AppContext, path: string, version?: string) {
  const base = ctx.env.ASSET_PUBLIC_BASE_URL.replace(/\/$/, "");
  return `${base}/${path}${version ? `?v=${encodeURIComponent(version)}` : ""}`;
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
  const object = await ctx.env.PET_ASSETS.get(petAssetKey(ctx, path));
  if (!object) return json({ error: "pet not found" }, 404);
  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType || contentType(path),
      "Cache-Control": object.httpMetadata?.cacheControl || "public, max-age=31536000, immutable",
      "ETag": object.httpEtag
    }
  });
}

export function contentType(path: string) {
  if (path.endsWith(".json")) return "application/json; charset=utf-8";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".zip")) return "application/zip";
  return "application/octet-stream";
}
