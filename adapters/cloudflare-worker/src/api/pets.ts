import { currentUser, requireUser } from "./auth";
import { auditAdminAction } from "./adminAudit";
import { allowedTags, slugPattern } from "./constants";
import { parseJson, parsePetKind, validateManifest, validatePosterImage, validatePreviewImage, validateShareImage, validateSpritesheet, validationFromBytes } from "./validation";
import { all, first, nowIso, tags, validationReport } from "../core/db";
import { HttpError, json } from "../core/http";
import { createZip } from "../core/zip";
import { deleteAsset, getAssetBytes, petAssetUrl, putAsset, serveAsset } from "../storage/assets";
import type { AppContext, AuthUser, ContentMode, Pagination, PetKind, PetRow, PetSort, UploadFile, ValidationReport, Viewer } from "../core/types";

const sqlVariableChunkSize = 80;
const recentDiscussionLimit = 5;

type RecentDiscussionRow = {
  id: string;
  pet_id: string;
  pet_display_name: string;
  pet_comment_count: number;
  author_id: string | null;
  author_handle: string | null;
  author_display_name: string | null;
  body: string;
  created_at: string;
};

export async function handlePets(ctx: AppContext, parts: string[]) {
  const user = await currentUser(ctx);
  if (ctx.request.method === "GET" && parts.length === 0) {
    const sort = parsePetSort(ctx.url.searchParams.get("sort"));
    const content = parseContentMode(ctx.url.searchParams.get("content"));
    const kind = parsePetKindFilter(ctx.url.searchParams.get("kind"));
    const uploadedAfter = parseUploadedAfter(ctx.url.searchParams.get("uploadedAfter"));
    return json(await listPets(ctx, ctx.url.searchParams.get("q") || "", undefined, ctx.url.searchParams.getAll("tag"), user, sort, parsePagination(ctx.url), content, kind, uploadedAfter));
  }
  if (ctx.request.method === "GET" && parts[0] === "favorites") return json({ pets: await favoritePets(ctx, await requireUser(ctx)) });
  if (ctx.request.method === "GET" && parts[0] === "mine") return json({ pets: (await listPets(ctx, ctx.url.searchParams.get("q") || "", (await requireUser(ctx)).id, ctx.url.searchParams.getAll("tag"), user, "new", undefined, "all")).pets });
  if (ctx.request.method === "POST" && parts.length === 0) return uploadPet(ctx, await requireUser(ctx));

  const petId = parts[0];
  if (!petId || !slugPattern.test(petId)) return json({ error: "pet not found" }, 404);
  if (ctx.request.method === "GET" && parts.length === 2 && parts[1] === "share-data") return petResponse(ctx, petId, user, false);
  if (ctx.request.method === "GET" && parts.length === 1) return petResponse(ctx, petId, user, true);
  if (ctx.request.method === "DELETE" && parts.length === 1) return deletePet(ctx, petId, await requireUser(ctx));
  if ((ctx.request.method === "POST" || ctx.request.method === "DELETE") && parts[1] === "like") return setPetLike(ctx, petId, await requireUser(ctx), ctx.request.method === "POST");
  if (ctx.request.method === "PATCH" && parts[1] === "tags" && parts.length === 2) return updatePetMetadata(ctx, petId, await requireUser(ctx));
  if (ctx.request.method === "PATCH" && parts[1] === "spritesheet" && parts.length === 2) return updatePetSpritesheet(ctx, petId, await requireUser(ctx));
  if (ctx.request.method === "GET" && parts[1] === "spritesheet") return visibleAsset(ctx, petId, user, `${petId}/spritesheet.webp`);
  if (ctx.request.method === "GET" && parts[1] === "share-image") return visibleAsset(ctx, petId, user, `${petId}/share.png`);
  if (ctx.request.method === "GET" && parts[1] === "preview") return visibleAsset(ctx, petId, user, `${petId}/preview.webp`);
  if (ctx.request.method === "GET" && parts[1] === "poster") return visibleAsset(ctx, petId, user, `${petId}/poster.webp`);
  if (ctx.request.method === "GET" && parts[1] === "download") return downloadPet(ctx, petId, user);
  return json({ error: "not found" }, 404);
}

export async function getPet(ctx: AppContext, petId: string) {
  return first<PetRow>(petBaseQuery(ctx, "where p.id = ?").bind(petId));
}

export async function getVisiblePet(ctx: AppContext, petId: string, viewer: Viewer) {
  const pet = await getPet(ctx, petId);
  return pet && canSeePet(pet, viewer) ? pet : null;
}

export async function listPets(ctx: AppContext, query = "", ownerId?: string, filterTags: string[] = [], viewer?: Viewer, sort: PetSort = "new", pagination?: Pagination, content: ContentMode = "safe", kind?: PetKind, uploadedAfter?: number) {
  const rows = (await all<PetRow>(petBaseQuery(ctx))).filter((row) =>
    matchesQuery(row, query)
    && (!ownerId || row.owner_id === ownerId)
    && (!kind || row.kind === kind)
    && (!uploadedAfter || Date.parse(row.created_at) > uploadedAfter)
    && filterTags.every((tag) => tags(row).includes(validateTag(tag)))
    && canSeePet(row, viewer)
    && (content === "all" || !tags(row).includes("nsfw"))
  );
  const discussionRows = sort === "discussed" ? rows.filter((row) => (row.comment_count || 0) > 0) : rows;
  const sortedRows = sortRows(discussionRows, sort);
  const page = pagination || { page: 1, pageSize: sortedRows.length || 1 };
  const start = (page.page - 1) * page.pageSize;
  const pageRows = sortedRows.slice(start, start + page.pageSize);
  const likeContext = await likeContextFor(ctx, pageRows.map((row) => row.id), viewer);
  return {
    pets: pageRows.map((row) => serializePet(ctx, row, undefined, likeContext, viewer)),
    ...(sort === "discussed" ? { recentComments: await recentDiscussionComments(ctx, sortedRows) } : {}),
    page: page.page,
    pageSize: page.pageSize,
    total: sortedRows.length,
    totalPages: Math.ceil(sortedRows.length / page.pageSize)
  };
}

export function serializePet(ctx: AppContext, row: PetRow, report?: ValidationReport, likeContext?: Set<string>, viewer?: Viewer) {
  const version = String(Date.parse(row.updated_at || row.created_at));
  return {
    id: row.id,
    displayName: row.display_name,
    description: row.description,
    spritesheetPath: row.spritesheet_path,
    kind: row.kind,
    ownerId: row.owner_id,
    ownerHandle: row.owner_handle || null,
    ownerName: row.owner_display_name || (row.source === "seed" ? "Local package" : "Anonymous"),
    uploadedAt: row.created_at,
    viewCount: row.view_count || 0,
    downloadCount: viewer?.isAdmin ? row.download_count || 0 : 0,
    likeCount: row.like_count || 0,
    commentCount: row.comment_count || 0,
    likedByMe: likeContext?.has(row.id) || false,
    ownerShadowbanned: Boolean(viewer?.isAdmin && ownerShadowbanned(row)),
    tags: tags(row),
    spritesheetUrl: petAssetUrl(ctx, `${row.id}/spritesheet.webp`, version),
    posterUrl: petAssetUrl(ctx, `${row.id}/poster.webp`, version),
    previewUrl: petAssetUrl(ctx, `${row.id}/preview.webp`, version),
    shareImageUrl: petAssetUrl(ctx, `${row.id}/share.png`, version),
    downloadUrl: `/api/pets/${row.id}/download?v=${version}`,
    validationReport: report || validationReport(row) || undefined
  };
}

async function petResponse(ctx: AppContext, petId: string, user: AuthUser | null, recordView: boolean) {
  const pet = await getVisiblePet(ctx, petId, user);
  if (!pet) return json({ error: "pet not found" }, 404);
  if (recordView) await recordPetStat(ctx, petId, "view", user);
  return json({ pet: serializePet(ctx, pet, await resolveValidationReport(ctx, pet), await likeContextFor(ctx, [petId], user), user) });
}

async function uploadPet(ctx: AppContext, user: AuthUser) {
  if (user.isShadowbanned) throw new HttpError("not allowed", 403);
  const form = await readUploadForm(ctx.request);
  const manifestFile = requireFile(form, "manifest");
  const spritesheetFile = requireFile(form, "spritesheet");
  const shareImageFile = requireFile(form, "shareImage");
  const previewImageFile = requireFile(form, "previewImage");
  const posterImageFile = requireFile(form, "posterImage");
  const manifest = validateManifest(parseJson(new TextDecoder().decode(manifestFile.bytes), "pet.json"));
  const kind = form.kind ? parsePetKind(form.kind) : manifest.kind;
  if (!kind) throw new HttpError("pet kind is required", 400);
  if (await getPet(ctx, manifest.id)) return json({ error: "pet id already exists" }, 409);
  validateSpritesheet(spritesheetFile.bytes); validateShareImage(shareImageFile.bytes); validatePreviewImage(previewImageFile.bytes); validatePosterImage(posterImageFile.bytes);
  await putAsset(ctx, `${manifest.id}/pet.json`, new TextEncoder().encode(JSON.stringify(manifest, null, 2) + "\n"), "application/json");
  await putAsset(ctx, `${manifest.id}/spritesheet.webp`, spritesheetFile.bytes, "image/webp");
  await putAsset(ctx, `${manifest.id}/share.png`, shareImageFile.bytes, "image/png");
  await putAsset(ctx, `${manifest.id}/preview.webp`, previewImageFile.bytes, "image/webp");
  await putAsset(ctx, `${manifest.id}/poster.webp`, posterImageFile.bytes, "image/webp");
  const report = validationFromBytes(manifest, spritesheetFile.bytes);
  await upsertPetRow(ctx, {
    id: manifest.id, displayName: manifest.displayName, description: manifest.description, spritesheetPath: manifest.spritesheetPath,
    kind, ownerId: user.id, source: "upload", tags: parseTags(form.tags), validationReport: report
  });
  const pet = await getPet(ctx, manifest.id) as PetRow;
  return json({ pet: serializePet(ctx, pet, report, await likeContextFor(ctx, [pet.id], user), user) }, 201);
}

export async function upsertPetRow(ctx: AppContext, input: {
  id: string; displayName: string; description: string; spritesheetPath: string; kind: PetKind; ownerId: string | null; source: "upload" | "seed"; tags: string[]; validationReport?: unknown; createdAt?: string; updatedAt?: string; viewCount?: number; downloadCount?: number; likeCount?: number;
}) {
  await ctx.env.DB.prepare(`
    insert into pets (id, display_name, description, spritesheet_path, kind, owner_id, source, tags_json, validation_report_json, created_at, updated_at, view_count, download_count, like_count)
    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    on conflict(id) do update set display_name = excluded.display_name, description = excluded.description, spritesheet_path = excluded.spritesheet_path, kind = excluded.kind, owner_id = excluded.owner_id, source = excluded.source, tags_json = excluded.tags_json, validation_report_json = excluded.validation_report_json, updated_at = excluded.updated_at, view_count = excluded.view_count, download_count = excluded.download_count, like_count = excluded.like_count
  `).bind(input.id, input.displayName, input.description, input.spritesheetPath, input.kind, input.ownerId, input.source, JSON.stringify(input.tags), JSON.stringify(input.validationReport || null), input.createdAt || nowIso(), input.updatedAt || input.createdAt || nowIso(), input.viewCount || 0, input.downloadCount || 0, input.likeCount || 0).run();
}

async function deletePet(ctx: AppContext, petId: string, user: AuthUser) {
  const pet = await getPet(ctx, petId);
  if (!pet || (pet.owner_id !== user.id && !user.isAdmin)) return json({ error: "pet not found" }, 404);
  await Promise.all(["pet.json", "spritesheet.webp", "share.png", "preview.webp", "poster.webp"].map((name) => deleteAsset(ctx, `${petId}/${name}`)));
  await ctx.env.DB.prepare("delete from pets where id = ?").bind(petId).run();
  if (user.isAdmin) {
    await auditAdminAction(ctx, user, "pet.delete", {
      targetPetId: pet.id,
      targetUserId: pet.owner_id,
      metadata: { source: pet.source }
    });
  }
  return json({ ok: true });
}

async function updatePetMetadata(ctx: AppContext, petId: string, user: AuthUser) {
  const pet = await getPet(ctx, petId);
  if (!pet) return json({ error: "pet not found" }, 404);
  if (!user.isAdmin && (pet.owner_id !== user.id || pet.source !== "upload")) return json({ error: "owner required" }, 403);
  const body = await ctx.request.json() as { tags?: unknown; kind?: unknown };
  const nextTags = parseTags(JSON.stringify(body.tags || []));
  if (!user.isAdmin && tags(pet).includes("nsfw") && !nextTags.includes("nsfw")) throw new HttpError("admin required to remove nsfw", 403);
  await ctx.env.DB.prepare("update pets set tags_json = ?, kind = ?, updated_at = ? where id = ?")
    .bind(JSON.stringify(nextTags), parsePetKind(body.kind), nowIso(), petId).run();
  const next = await getPet(ctx, petId) as PetRow;
  return json({ pet: serializePet(ctx, next, undefined, await likeContextFor(ctx, [petId], user), user) });
}

async function updatePetSpritesheet(ctx: AppContext, petId: string, user: AuthUser) {
  const pet = await getPet(ctx, petId);
  if (!pet) return json({ error: "pet not found" }, 404);
  if (pet.source !== "upload") return json({ error: "uploaded pet required" }, 403);
  if (!user.isAdmin && pet.owner_id !== user.id) return json({ error: "owner required" }, 403);
  const form = await readUploadForm(ctx.request);
  const spritesheetFile = requireFile(form, "spritesheet");
  const shareImageFile = requireFile(form, "shareImage");
  const previewImageFile = requireFile(form, "previewImage");
  const posterImageFile = requireFile(form, "posterImage");
  validateSpritesheet(spritesheetFile.bytes); validateShareImage(shareImageFile.bytes); validatePreviewImage(previewImageFile.bytes); validatePosterImage(posterImageFile.bytes);
  const report = validationFromBytes({
    id: pet.id,
    displayName: pet.display_name,
    description: pet.description,
    spritesheetPath: "spritesheet.webp",
    kind: pet.kind
  }, spritesheetFile.bytes);
  await putAsset(ctx, `${pet.id}/spritesheet.webp`, spritesheetFile.bytes, "image/webp");
  await putAsset(ctx, `${pet.id}/share.png`, shareImageFile.bytes, "image/png");
  await putAsset(ctx, `${pet.id}/preview.webp`, previewImageFile.bytes, "image/webp");
  await putAsset(ctx, `${pet.id}/poster.webp`, posterImageFile.bytes, "image/webp");
  await ctx.env.DB.prepare("update pets set validation_report_json = ?, updated_at = ? where id = ?")
    .bind(JSON.stringify(report), nowIso(), pet.id).run();
  const next = await getPet(ctx, pet.id) as PetRow;
  return json({ pet: serializePet(ctx, next, report, await likeContextFor(ctx, [pet.id], user), user) });
}

async function setPetLike(ctx: AppContext, petId: string, user: AuthUser, liked: boolean) {
  const pet = await getVisiblePet(ctx, petId, user);
  if (!pet) return json({ error: "pet not found" }, 404);
  if (!user.isShadowbanned) {
    if (liked) {
      const result = await ctx.env.DB.prepare("insert or ignore into pet_likes (pet_id, user_id) values (?, ?)").bind(petId, user.id).run();
      if (result.meta.changes) await ctx.env.DB.prepare("update pets set like_count = like_count + 1 where id = ?").bind(petId).run();
    } else {
      const result = await ctx.env.DB.prepare("delete from pet_likes where pet_id = ? and user_id = ?").bind(petId, user.id).run();
      if (result.meta.changes) await ctx.env.DB.prepare("update pets set like_count = max(like_count - 1, 0) where id = ?").bind(petId).run();
    }
  }
  const updated = await getVisiblePet(ctx, petId, user) || pet;
  return json({ pet: serializePet(ctx, updated, undefined, await likeContextFor(ctx, [petId], user), user) });
}

async function visibleAsset(ctx: AppContext, petId: string, user: AuthUser | null, path: string) {
  return await getVisiblePet(ctx, petId, user) ? serveAsset(ctx, path) : json({ error: "pet not found" }, 404);
}

async function downloadPet(ctx: AppContext, petId: string, user: AuthUser | null) {
  const pet = await getVisiblePet(ctx, petId, user);
  if (!pet) return json({ error: "pet not found" }, 404);
  const zip = createZip([
    { name: "pet.json", data: await getAssetBytes(ctx, `${petId}/pet.json`) },
    { name: "spritesheet.webp", data: await getAssetBytes(ctx, `${petId}/spritesheet.webp`) }
  ]);
  await recordPetStat(ctx, petId, "download", user);
  return new Response(zip, { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${petId}.codex-pet.zip"` } });
}

async function favoritePets(ctx: AppContext, user: AuthUser) {
  const rows = await all<{ pet_id: string }>(ctx.env.DB.prepare("select pet_id from pet_likes where user_id = ? order by created_at desc").bind(user.id));
  const pets = (await Promise.all(rows.map((row) => getPet(ctx, row.pet_id)))).filter(Boolean) as PetRow[];
  const visiblePets = pets.filter((pet) => canSeePet(pet, user));
  const likeContext = user.isShadowbanned ? new Set<string>() : new Set(visiblePets.map((pet) => pet.id));
  return visiblePets.map((pet) => serializePet(ctx, pet, undefined, likeContext, user));
}

async function likeContextFor(ctx: AppContext, petIds: string[], viewer?: Viewer) {
  const liked = new Set<string>();
  if (!viewer?.id || viewer.isShadowbanned || !petIds.length) return liked;
  const uniqueIds = [...new Set(petIds)];
  for (let index = 0; index < uniqueIds.length; index += sqlVariableChunkSize) {
    const chunk = uniqueIds.slice(index, index + sqlVariableChunkSize);
    const placeholders = chunk.map(() => "?").join(",");
    const rows = await all<{ pet_id: string }>(ctx.env.DB.prepare(`select pet_id from pet_likes where user_id = ? and pet_id in (${placeholders})`).bind(viewer.id, ...chunk));
    rows.forEach((row) => liked.add(row.pet_id));
  }
  return liked;
}

async function resolveValidationReport(ctx: AppContext, pet: PetRow) {
  const cached = validationReport(pet);
  if (cached) return cached;
  const manifest = validateManifest(JSON.parse(new TextDecoder().decode(await getAssetBytes(ctx, `${pet.id}/pet.json`))));
  const report = validationFromBytes(manifest, await getAssetBytes(ctx, `${pet.id}/spritesheet.webp`));
  await ctx.env.DB.prepare("update pets set validation_report_json = ? where id = ?").bind(JSON.stringify(report), pet.id).run();
  return report;
}

async function recordPetStat(ctx: AppContext, petId: string, eventType: "view" | "download", viewer?: Viewer) {
  if (viewer?.isShadowbanned) return;
  const identity = viewer?.id ? `user:${viewer.id}` : `anon:${ctx.request.headers.get("cf-connecting-ip") || "unknown"}:${ctx.request.headers.get("user-agent") || "unknown"}`;
  const visitorKey = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${ctx.env.PET_STATS_SALT}:${identity}`)).then((digest) => Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join(""));
  const periodStart = new Date().toISOString().slice(0, 10);
  const result = await ctx.env.DB.prepare("insert or ignore into pet_stat_events (pet_id, event_type, visitor_key, period_start) values (?, ?, ?, ?)").bind(petId, eventType, visitorKey, periodStart).run();
  if (result.meta.changes) await ctx.env.DB.prepare(`update pets set ${eventType === "view" ? "view_count" : "download_count"} = ${eventType === "view" ? "view_count" : "download_count"} + 1 where id = ?`).bind(petId).run();
}

function petBaseQuery(ctx: AppContext, suffix = "") {
  return ctx.env.DB.prepare(`
    select p.*, u.handle as owner_handle, u.display_name as owner_display_name, u.shadowbanned_at as owner_shadowbanned_at,
      (
        select count(*)
        from pet_comments pc
        left join users cu on cu.id = pc.author_id
        where pc.pet_id = p.id and cu.shadowbanned_at is null
      ) as comment_count,
      (
        select max(pc.created_at)
        from pet_comments pc
        left join users cu on cu.id = pc.author_id
        where pc.pet_id = p.id and cu.shadowbanned_at is null
      ) as latest_comment_at
    from pets p left join users u on u.id = p.owner_id ${suffix}
  `);
}

function matchesQuery(row: PetRow, query: string) {
  const needle = query.trim().toLowerCase();
  return !needle || `${row.id} ${row.display_name} ${row.description} ${row.kind} ${row.owner_handle || ""} ${row.owner_display_name || ""} ${tags(row).join(" ")}`.toLowerCase().includes(needle);
}

function sortRows(rows: PetRow[], sort: PetSort) {
  const out = [...rows];
  if (sort === "random") return out.sort(() => Math.random() - 0.5);
  return out.sort((a, b) => sort === "popular"
    ? (b.like_count - a.like_count) || Date.parse(b.created_at) - Date.parse(a.created_at)
    : sort === "views"
      ? (b.view_count - a.view_count) || (b.like_count - a.like_count) || Date.parse(b.created_at) - Date.parse(a.created_at)
      : sort === "discussed"
        ? ((b.comment_count || 0) - (a.comment_count || 0))
          || (Date.parse(b.latest_comment_at || b.created_at) - Date.parse(a.latest_comment_at || a.created_at))
          || (b.like_count - a.like_count)
          || Date.parse(b.created_at) - Date.parse(a.created_at)
      : Date.parse(b.created_at) - Date.parse(a.created_at) || a.display_name.localeCompare(b.display_name));
}

function parsePetSort(value: string | null): PetSort {
  if (!value || value === "new") return "new";
  if (value === "popular" || value === "views" || value === "discussed" || value === "random") return value;
  throw new HttpError("invalid sort", 400);
}

async function recentDiscussionComments(ctx: AppContext, rows: PetRow[]) {
  const petIds = rows.filter((row) => (row.comment_count || 0) > 0).map((row) => row.id);
  if (!petIds.length) return [];
  const petRows = new Map(rows.map((row) => [row.id, row]));

  const comments: RecentDiscussionRow[] = [];
  for (let index = 0; index < petIds.length; index += sqlVariableChunkSize) {
    const chunk = petIds.slice(index, index + sqlVariableChunkSize);
    const placeholders = chunk.map(() => "?").join(",");
    comments.push(...await all<RecentDiscussionRow>(ctx.env.DB.prepare(`
      select
        c.id,
        c.pet_id,
        p.display_name as pet_display_name,
        (
          select count(*)
          from pet_comments pc
          left join users cu on cu.id = pc.author_id
          where pc.pet_id = p.id and cu.shadowbanned_at is null
        ) as pet_comment_count,
        u.id as author_id,
        u.handle as author_handle,
        u.display_name as author_display_name,
        c.body,
        c.created_at
      from pet_comments c
      join pets p on p.id = c.pet_id
      left join users u on u.id = c.author_id
      where c.pet_id in (${placeholders}) and u.shadowbanned_at is null
      order by c.created_at desc
      limit ${recentDiscussionLimit}
    `).bind(...chunk)));
  }

  return comments
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, recentDiscussionLimit)
    .map((row) => {
      const pet = petRows.get(row.pet_id);
      if (!pet) throw new HttpError("pet not found", 404);
      const version = String(Date.parse(pet.updated_at || pet.created_at));
      return {
        id: row.id,
        petId: row.pet_id,
        petDisplayName: row.pet_display_name,
        petPreviewUrl: petAssetUrl(ctx, `${row.pet_id}/preview.webp`, version),
        petCommentCount: row.pet_comment_count,
        authorId: row.author_id,
        authorHandle: row.author_handle,
        authorName: row.author_id ? row.author_display_name || "Anonymous" : "Anonymous",
        body: row.body,
        createdAt: row.created_at
      };
    });
}

export function parseContentMode(value: string | null): ContentMode {
  if (!value || value === "safe") return "safe";
  if (value === "all") return "all";
  throw new HttpError("invalid content mode", 400);
}

function parsePetKindFilter(value: string | null) {
  if (!value || value === "all") return undefined;
  return parsePetKind(value);
}

function parseUploadedAfter(value: string | null) {
  if (!value) return undefined;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new HttpError("uploadedAfter must be an ISO date", 400);
  return parsed;
}

export function parsePagination(url: URL): Pagination {
  const page = parsePositiveInt(url.searchParams.get("page") || "1", "page");
  const pageSize = parsePositiveInt(url.searchParams.get("pageSize") || "30", "pageSize");
  if (pageSize > 60) throw new HttpError("pageSize must be 60 or less", 400);
  return { page, pageSize };
}

function parsePositiveInt(value: string, name: string) {
  if (!/^\d+$/.test(value)) throw new HttpError(`${name} must be a positive integer`, 400);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new HttpError(`${name} must be a positive integer`, 400);
  return parsed;
}

function parseTags(raw?: string) {
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new HttpError("tags must be a JSON array", 400);
  return parsed.map(String).map(validateTag).filter((tag, index, arr) => arr.indexOf(tag) === index);
}

function validateTag(tag: string) {
  if (!(allowedTags as readonly string[]).includes(tag)) throw new HttpError("invalid tag", 400);
  return tag;
}

function ownerShadowbanned(row: PetRow) {
  return Boolean(row.owner_shadowbanned_at);
}

function canSeePet(row: PetRow, viewer: Viewer) {
  return !ownerShadowbanned(row) || Boolean(viewer?.isAdmin || (row.owner_id && viewer?.id === row.owner_id));
}

async function readUploadForm(request: Request) {
  const form = await request.formData();
  return {
    manifest: await uploadFileField(form, "manifest", 16 * 1024),
    spritesheet: await uploadFileField(form, "spritesheet", 4 * 1024 * 1024),
    shareImage: await uploadFileField(form, "shareImage", 2 * 1024 * 1024),
    previewImage: await uploadFileField(form, "previewImage", 1024 * 1024),
    posterImage: await uploadFileField(form, "posterImage", 512 * 1024),
    kind: stringField(form, "kind"),
    tags: stringField(form, "tags")
  };
}

function stringField(form: FormData, name: string) {
  const value = form.get(name);
  if (!value) return undefined;
  if (typeof value !== "string") throw new HttpError(`${name} must be a string`, 400);
  return value;
}

function requireFile(form: Record<string, UploadFile | string | undefined>, name: string) {
  const value = form[name];
  if (!value || typeof value === "string") throw new HttpError("upload pet.json, spritesheet.webp, share.png, preview.webp, and poster.webp", 400);
  return value;
}

async function uploadFileField(form: FormData, name: string, maxBytes: number): Promise<UploadFile | undefined> {
  const value = form.get(name);
  if (!value) return undefined;
  if (typeof value === "string") throw new HttpError(`${name} must be a file`, 400);
  if (value.size > maxBytes) throw new HttpError(`${name} is too large`, 400);
  return { filename: value.name, contentType: value.type, bytes: new Uint8Array(await value.arrayBuffer()) };
}
