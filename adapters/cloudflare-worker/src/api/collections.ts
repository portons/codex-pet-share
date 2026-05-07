import { requireAdmin, requireUser, currentUser, publicUser } from "./auth";
import { auditAdminAction } from "./adminAudit";
import { parseContentMode, parsePagination, listPets, serializePet, getPet, getVisiblePet } from "./pets";
import { slugPattern } from "./constants";
import { all, first, nowIso } from "../core/db";
import { HttpError, json, readJsonBody } from "../core/http";
import { deleteAsset } from "../storage/assets";
import type { AppContext, AuthUser, CollectionRow, PetRow } from "../core/types";

export async function handleCollections(ctx: AppContext, parts: string[]) {
  const user = await currentUser(ctx);
  const content = parseContentMode(ctx.url.searchParams.get("content"));
  if (ctx.request.method === "GET" && parts.length === 0) return json({ collections: await publicCollections(ctx, content) });
  if (ctx.request.method === "GET" && parts[0] === "mine" && parts.length === 1) {
    return json({ collections: await userCollections(ctx, await requireUser(ctx), content) });
  }
  if (ctx.request.method === "POST" && parts.length === 0) {
    return json({ collection: await createUserCollection(ctx, await requireUser(ctx)) }, 201);
  }
  if ((ctx.request.method === "PATCH" || ctx.request.method === "DELETE") && parts.length === 1 && slugPattern.test(parts[0])) {
    const owner = await requireUser(ctx);
    if (ctx.request.method === "PATCH") return json({ collection: await updateUserCollection(ctx, owner, parts[0]) });
    await deleteUserCollection(ctx, owner, parts[0]);
    return json({ ok: true });
  }
  if (ctx.request.method === "GET" && parts.length === 1 && slugPattern.test(parts[0])) {
    const collection = await collectionRow(ctx, parts[0]);
    if (!collection) return json({ error: "collection not found" }, 404);
    const pets = await collectionPets(ctx, collection.slug, content);
    const petIds = collection.owner_id && user?.id === collection.owner_id ? await collectionPetIds(ctx, collection.slug) : undefined;
    return json({ collection: collectionSummary(ctx, collection, pets, petIds, user), pets: pets.map((pet) => serializePet(ctx, pet, undefined, undefined, user)) });
  }
  return json({ error: "not found" }, 404);
}

export async function handleUsers(ctx: AppContext, parts: string[]) {
  if (ctx.request.method === "GET" && parts.length === 2 && parts[1] === "pets") {
    const viewer = await currentUser(ctx);
    const user = await publicUser(ctx, parts[0], viewer);
    if (!user) return json({ error: "user not found" }, 404);
    const content = parseContentMode(ctx.url.searchParams.get("content"));
    const result = await listPets(ctx, "", user.id, [], viewer, "new", parsePagination(ctx.url), content);
    const statsResult = await listPets(ctx, "", user.id, [], viewer, "new", undefined, content);
    return json({
      user,
      ...result,
      stats: creatorStats(statsResult.pets, Boolean(viewer?.isAdmin || viewer?.id === user.id))
    });
  }
  return json({ error: "not found" }, 404);
}

export async function handleCreators(ctx: AppContext, parts: string[]) {
  if (ctx.request.method === "GET" && parts.length === 1 && parts[0] === "leaderboard") {
    const viewer = await currentUser(ctx);
    const pets = (await listPets(ctx, "", undefined, [], viewer, "new", undefined, parseContentMode(ctx.url.searchParams.get("content")))).pets;
    const shadowbannedCreators = await shadowbannedUserIds(ctx);
    const byCreator = new Map<string, { id: string; handle: string | null; displayName: string; petCount: number; viewCount: number; likeCount: number; topPets: typeof pets }>();
    for (const pet of pets) {
      if (!pet.ownerId || shadowbannedCreators.has(pet.ownerId)) continue;
      const item = byCreator.get(pet.ownerId) || { id: pet.ownerId, handle: pet.ownerHandle, displayName: pet.ownerName, petCount: 0, viewCount: 0, likeCount: 0, topPets: [] };
      item.petCount += 1; item.viewCount += pet.viewCount; item.likeCount += pet.likeCount; item.topPets.push(pet);
      byCreator.set(pet.ownerId, item);
    }
    const creators = Array.from(byCreator.values()).sort((a, b) => (b.likeCount - a.likeCount) || (b.viewCount - a.viewCount) || (b.petCount - a.petCount));
    return json({ creators: creators.map((creator) => ({ ...creator, topPets: creator.topPets.slice(0, 3) })), total: creators.length });
  }
  return json({ error: "not found" }, 404);
}

export async function handleAdmin(ctx: AppContext, parts: string[]) {
  const user = await requireAdmin(ctx);
  if (ctx.request.method === "GET" && parts[0] === "collections" && parts.length === 1) return json({ collections: await adminCollections(ctx) });
  if (ctx.request.method === "POST" && parts[0] === "collections" && parts.length === 1) return json({ collection: await upsertCollection(ctx, await collectionInput(ctx), false) }, 201);
  if (parts[0] === "collections" && parts[1] && slugPattern.test(parts[1])) {
    if (ctx.request.method === "PATCH" && parts.length === 2) return json({ collection: await renameCollection(ctx, parts[1], await collectionInput(ctx)) });
    if (ctx.request.method === "DELETE" && parts.length === 2) {
      await ctx.env.DB.prepare("delete from collections where slug = ?").bind(parts[1]).run();
      return json({ ok: true });
    }
    if (ctx.request.method === "PATCH" && parts[2] === "pets" && parts.length === 3) {
      const { petIds } = await readJsonBody<{ petIds?: unknown }>(ctx.request);
      return json({ collection: await setCollectionPets(ctx, parts[1], normalizePetIds(petIds)) });
    }
  }
  if (ctx.request.method === "PATCH" && parts[0] === "pets" && parts[2] === "collections") {
    const { collectionSlugs } = await readJsonBody<{ collectionSlugs?: unknown }>(ctx.request);
    await setPetCollections(ctx, parts[1], normalizeCollectionSlugs(collectionSlugs));
    const pet = await getPet(ctx, parts[1]);
    return pet ? json({ pet: serializePet(ctx, pet, undefined, undefined, user) }) : json({ error: "pet not found" }, 404);
  }
  if (ctx.request.method === "PATCH" && parts[0] === "pets" && parts[2] === "nsfw") {
    const { nsfw } = await readJsonBody<{ nsfw?: unknown }>(ctx.request);
    const pet = await getPet(ctx, parts[1]);
    if (!pet || typeof nsfw !== "boolean") throw new HttpError("pet not found", 404);
    const tags = new Set(JSON.parse(pet.tags_json) as string[]);
    nsfw ? tags.add("nsfw") : tags.delete("nsfw");
    await ctx.env.DB.prepare("update pets set tags_json = ?, updated_at = ? where id = ?").bind(JSON.stringify([...tags]), nowIso(), pet.id).run();
    await auditAdminAction(ctx, user, "pet.nsfw", {
      targetPetId: pet.id,
      targetUserId: pet.owner_id,
      metadata: { nsfw }
    });
    return json({ pet: serializePet(ctx, await getPet(ctx, pet.id) as PetRow, undefined, undefined, user) });
  }
  if (ctx.request.method === "PATCH" && parts[0] === "users" && parts[1] === "shadowban" && parts.length === 2) {
    const { emailOrId, shadowbanned } = await readJsonBody<{ emailOrId?: unknown; shadowbanned?: unknown }>(ctx.request);
    const value = String(emailOrId || "").trim().toLowerCase();
    if (!value) return json({ error: "user email or id is required" }, 400);
    const target = await userTarget(ctx, value);
    if (!target) return json({ error: "user not found" }, 404);
    if (target.id === user.id) return json({ error: "admins cannot shadowban themselves" }, 400);
    const nextShadowban = requiredBoolean(shadowbanned, "shadowbanned");
    const updatedUser = await setProfileShadowban(ctx, target.id, nextShadowban);
    await auditAdminAction(ctx, user, "user.shadowban", {
      targetUserId: target.id,
      targetUserEmail: target.email,
      metadata: { shadowbanned: nextShadowban }
    });
    return json({ ok: true, user: updatedUser, updatedBy: user.email });
  }
  if (ctx.request.method === "DELETE" && parts[0] === "users" && parts.length === 1) {
    const { emailOrId } = await readJsonBody<{ emailOrId?: unknown }>(ctx.request);
    const value = String(emailOrId || "").trim().toLowerCase();
    if (!value) return json({ error: "user email or id is required" }, 400);
    const target = await userTarget(ctx, value);
    if (!target) return json({ error: "user not found" }, 404);
    const deletedPets = await deleteUserUploads(ctx, target.id, user);
    await ctx.env.DB.prepare("delete from pet_likes where user_id = ?").bind(target.id).run();
    await ctx.env.DB.prepare("delete from users where id = ?").bind(target.id).run();
    await auditAdminAction(ctx, user, "user.delete", {
      targetUserId: target.id,
      targetUserEmail: target.email,
      metadata: { deletedPets }
    });
    return json({ ok: true, userId: target.id, removedBy: user.email });
  }
  return json({ error: "not found" }, 404);
}

export async function publicCollections(ctx: AppContext, content = "safe") {
  const rows = await all<CollectionRow>(ctx.env.DB.prepare("select * from collections where owner_id is null order by display_name asc, slug asc"));
  return Promise.all(rows.map((row) => collectionSummaryForRow(ctx, row, content)));
}

export async function collectionRow(ctx: AppContext, slug: string) {
  return first<CollectionRow>(ctx.env.DB.prepare("select * from collections where slug = ?").bind(slug));
}

export async function collectionPetIds(ctx: AppContext, slug: string) {
  const rows = await all<{ pet_id: string }>(ctx.env.DB.prepare("select pet_id from collection_pets where collection_slug = ? order by created_at asc").bind(slug));
  return rows.map((row) => row.pet_id);
}

export async function collectionPets(ctx: AppContext, slug: string, content: string) {
  const ids = await collectionPetIds(ctx, slug);
  const rows = (await Promise.all(ids.map((id) => getPet(ctx, id)))).filter(Boolean) as PetRow[];
  return rows.filter((row) => content === "all" || !(JSON.parse(row.tags_json) as string[]).includes("nsfw"))
    .sort((a, b) => a.display_name.localeCompare(b.display_name));
}

async function collectionSummaryForRow(ctx: AppContext, row: CollectionRow, content: string, viewer?: AuthUser | null, includePetIds = false) {
  const pets = await collectionPets(ctx, row.slug, content);
  const petIds = includePetIds ? await collectionPetIds(ctx, row.slug) : undefined;
  return collectionSummary(ctx, row, pets, petIds, viewer);
}

function collectionSummary(ctx: AppContext, row: CollectionRow, pets: PetRow[], petIds?: string[], viewer?: AuthUser | null) {
  const topPets = [...pets].sort((a, b) => (b.like_count - a.like_count) || (b.view_count - a.view_count)).slice(0, 3);
  const ownerId = row.owner_id || null;
  return {
    slug: row.slug,
    displayName: row.display_name,
    ownerId,
    editable: Boolean(ownerId && viewer?.id === ownerId),
    petCount: pets.length,
    topPets: topPets.map((pet) => serializePet(ctx, pet)),
    ...(petIds ? { petIds } : {})
  };
}

async function adminCollections(ctx: AppContext) {
  const rows = await all<CollectionRow>(ctx.env.DB.prepare("select * from collections where owner_id is null order by display_name asc, slug asc"));
  return Promise.all(rows.map(async (row) => ({ slug: row.slug, displayName: row.display_name, petIds: await collectionPetIds(ctx, row.slug) })));
}

async function userCollections(ctx: AppContext, user: AuthUser, content: string) {
  const rows = await all<CollectionRow>(
    ctx.env.DB.prepare("select * from collections where owner_id = ? order by updated_at desc, display_name asc, slug asc").bind(user.id)
  );
  return Promise.all(rows.map((row) => collectionSummaryForRow(ctx, row, content, user, true)));
}

async function createUserCollection(ctx: AppContext, user: AuthUser) {
  if (user.isShadowbanned) throw new HttpError("not allowed", 403);
  const body = await readJsonBody<{ displayName?: unknown; petIds?: unknown }>(ctx.request);
  const displayName = validateCollectionDisplayName(body.displayName);
  const petIds = normalizePetIds(body.petIds ?? []);
  await requireVisiblePets(ctx, user, petIds);
  const slug = await nextUserCollectionSlug(ctx, displayName);
  await ctx.env.DB.prepare("insert into collections (slug, display_name, owner_id, updated_at) values (?, ?, ?, ?)")
    .bind(slug, displayName, user.id, nowIso()).run();
  await setUserCollectionPets(ctx, slug, petIds);
  return collectionSummaryForRow(ctx, await collectionRow(ctx, slug) as CollectionRow, "all", user, true);
}

async function updateUserCollection(ctx: AppContext, user: AuthUser, slug: string) {
  if (user.isShadowbanned) throw new HttpError("not allowed", 403);
  const row = await requireOwnedCollection(ctx, user, slug);
  const body = await readJsonBody<{ displayName?: unknown; petIds?: unknown }>(ctx.request);
  const displayName = body.displayName == null ? row.display_name : validateCollectionDisplayName(body.displayName);
  const petIds = body.petIds == null ? undefined : normalizePetIds(body.petIds);
  if (petIds) await requireVisiblePets(ctx, user, petIds);
  await ctx.env.DB.prepare("update collections set display_name = ?, updated_at = ? where slug = ?")
    .bind(displayName, nowIso(), slug).run();
  if (petIds) await setUserCollectionPets(ctx, slug, petIds);
  return collectionSummaryForRow(ctx, await collectionRow(ctx, slug) as CollectionRow, "all", user, true);
}

async function deleteUserCollection(ctx: AppContext, user: AuthUser, slug: string) {
  if (user.isShadowbanned) throw new HttpError("not allowed", 403);
  await requireOwnedCollection(ctx, user, slug);
  await ctx.env.DB.prepare("delete from collections where slug = ? and owner_id = ?").bind(slug, user.id).run();
}

export async function upsertCollection(ctx: AppContext, input: { slug: string; displayName: string }, replace = true) {
  await ctx.env.DB.prepare(`${replace ? "insert or replace" : "insert"} into collections (slug, display_name, updated_at) values (?, ?, ?)`)
    .bind(input.slug, input.displayName, nowIso()).run();
  return { slug: input.slug, displayName: input.displayName, petIds: await collectionPetIds(ctx, input.slug) };
}

async function renameCollection(ctx: AppContext, currentSlug: string, input: { slug: string; displayName: string }) {
  await ctx.env.DB.prepare("update collections set slug = ?, display_name = ?, updated_at = ? where slug = ?")
    .bind(input.slug, input.displayName, nowIso(), currentSlug).run();
  return { slug: input.slug, displayName: input.displayName, petIds: await collectionPetIds(ctx, input.slug) };
}

export async function setCollectionPets(ctx: AppContext, slug: string, petIds: string[]) {
  if (!await collectionRow(ctx, slug)) throw new HttpError("collection not found", 404);
  await requireExistingPets(ctx, petIds);
  await ctx.env.DB.prepare("delete from collection_pets where collection_slug = ?").bind(slug).run();
  for (const petId of petIds) await ctx.env.DB.prepare("insert into collection_pets (collection_slug, pet_id) values (?, ?)").bind(slug, petId).run();
  const row = await collectionRow(ctx, slug) as CollectionRow;
  return { slug, displayName: row.display_name, petIds };
}

async function setUserCollectionPets(ctx: AppContext, slug: string, petIds: string[]) {
  await ctx.env.DB.prepare("delete from collection_pets where collection_slug = ?").bind(slug).run();
  for (const petId of petIds) await ctx.env.DB.prepare("insert into collection_pets (collection_slug, pet_id) values (?, ?)").bind(slug, petId).run();
  await ctx.env.DB.prepare("update collections set updated_at = ? where slug = ?").bind(nowIso(), slug).run();
}

async function setPetCollections(ctx: AppContext, petId: string, slugs: string[]) {
  if (!await getPet(ctx, petId)) throw new HttpError("pet not found", 404);
  await requireExistingCollections(ctx, slugs);
  await ctx.env.DB.prepare("delete from collection_pets where pet_id = ?").bind(petId).run();
  for (const slug of slugs) await ctx.env.DB.prepare("insert into collection_pets (collection_slug, pet_id) values (?, ?)").bind(slug, petId).run();
}

async function collectionInput(ctx: AppContext) {
  const body = await readJsonBody<Record<string, unknown>>(ctx.request);
  return { slug: normalizeCollectionSlug(body.slug), displayName: validateCollectionDisplayName(body.displayName) };
}

function normalizeCollectionSlug(value: unknown) {
  const slug = String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!slugPattern.test(slug)) throw new HttpError("collection slug must contain letters or numbers", 400);
  return slug;
}

async function nextUserCollectionSlug(ctx: AppContext, displayName: string) {
  const base = normalizeCollectionSlug(displayName);
  let slug = base;
  let suffix = 2;
  while (await collectionRow(ctx, slug)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

function validateCollectionDisplayName(value: unknown) {
  const displayName = String(value || "").trim().replace(/\s+/g, " ");
  if (!displayName || displayName.length > 80) throw new HttpError("collection display name is required", 400);
  return displayName;
}

function normalizePetIds(value: unknown) {
  if (!Array.isArray(value)) throw new HttpError("petIds must be an array", 400);
  return [...new Set(value.map((item) => String(item || "").trim()).filter(Boolean))];
}

function normalizeCollectionSlugs(value: unknown) {
  if (!Array.isArray(value)) throw new HttpError("collectionSlugs must be an array", 400);
  return value.map(normalizeCollectionSlug);
}

async function requireExistingPets(ctx: AppContext, petIds: string[]) {
  for (const petId of petIds) {
    if (!await getPet(ctx, petId)) throw new HttpError("one or more pets were not found", 400);
  }
}

async function requireExistingCollections(ctx: AppContext, slugs: string[]) {
  for (const slug of slugs) {
    if (!await collectionRow(ctx, slug)) throw new HttpError("one or more collections were not found", 400);
  }
}

async function requireVisiblePets(ctx: AppContext, user: AuthUser, petIds: string[]) {
  for (const petId of petIds) {
    if (!await getVisiblePet(ctx, petId, user)) throw new HttpError("one or more pets were not found", 400);
  }
}

async function requireOwnedCollection(ctx: AppContext, user: AuthUser, slug: string) {
  const row = await collectionRow(ctx, slug);
  if (!row || row.owner_id !== user.id) throw new HttpError("collection not found", 404);
  return row;
}

async function userTarget(ctx: AppContext, value: string) {
  return first<{ id: string; email: string }>(
    value.includes("@")
      ? ctx.env.DB.prepare("select id, email from users where email = ?").bind(value)
      : ctx.env.DB.prepare("select id, email from users where id = ?").bind(value)
  );
}

async function shadowbannedUserIds(ctx: AppContext) {
  const rows = await all<{ id: string }>(ctx.env.DB.prepare("select id from users where shadowbanned_at is not null"));
  return new Set(rows.map((row) => row.id));
}

async function setProfileShadowban(ctx: AppContext, userId: string, shadowbanned: boolean) {
  await ctx.env.DB.prepare("update users set shadowbanned_at = ?, updated_at = ? where id = ?")
    .bind(shadowbanned ? nowIso() : null, nowIso(), userId).run();
  const row = await first<{ id: string; handle: string; display_name: string; shadowbanned_at: string | null }>(
    ctx.env.DB.prepare("select id, handle, display_name, shadowbanned_at from users where id = ?").bind(userId)
  );
  if (!row) throw new HttpError("user not found", 404);
  return {
    id: row.id,
    handle: row.handle,
    displayName: row.display_name,
    shadowbanned: Boolean(row.shadowbanned_at)
  };
}

async function deleteUserUploads(ctx: AppContext, userId: string, actor: AuthUser) {
  const pets = await all<PetRow>(ctx.env.DB.prepare("select * from pets where owner_id = ? and source = 'upload'").bind(userId));
  const deletedPets: string[] = [];
  for (const pet of pets) {
    await Promise.all(["pet.json", "spritesheet.webp", "share.png", "preview.webp"].map((name) => deleteAsset(ctx, `${pet.id}/${name}`)));
    await ctx.env.DB.prepare("delete from pets where id = ?").bind(pet.id).run();
    deletedPets.push(pet.id);
    await auditAdminAction(ctx, actor, "pet.delete", {
      targetPetId: pet.id,
      targetUserId: userId,
      metadata: { reason: "user.delete" }
    });
  }
  return deletedPets;
}

function requiredBoolean(value: unknown, name: string) {
  if (typeof value !== "boolean") throw new HttpError(`${name} must be boolean`, 400);
  return value;
}

function creatorStats(pets: Array<{ viewCount: number; likeCount: number; downloadCount: number }>, includeDownloads: boolean) {
  return {
    petCount: pets.length,
    viewCount: pets.reduce((total, pet) => total + pet.viewCount, 0),
    likeCount: pets.reduce((total, pet) => total + pet.likeCount, 0),
    downloadCount: includeDownloads ? pets.reduce((total, pet) => total + pet.downloadCount, 0) : null
  };
}
