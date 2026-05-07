import { requireUser, userById } from "./auth";
import { collectionRow } from "./collections";
import { roomIdPattern, slugPattern, uuidPattern } from "./constants";
import { getPet, serializePet } from "./pets";
import { first, nowIso } from "../core/db";
import { HttpError, json, readJsonBody } from "../core/http";
import type { AppContext, AuthUser, PetRow } from "../core/types";

type RoomRow = {
  id: string;
  host_id: string;
  host_pet_id: string | null;
  display_name: string | null;
  collection_slug: string | null;
  world_state_json: string;
  status: "open" | "closed";
  created_at: string;
  closed_at: string | null;
};

export async function handleRooms(ctx: AppContext, parts: string[]) {
  if (ctx.request.method === "POST" && parts.length === 0) return createRoom(ctx, await requireUser(ctx));
  const roomId = parts[0];
  if (!roomId || !roomIdPattern.test(roomId)) return json({ error: "room not found" }, 404);
  if (ctx.request.method === "GET" && parts.length === 1) return getRoomForUser(ctx, roomId, await requireUser(ctx));
  if (ctx.request.method === "PATCH" && parts[1] === "world") return updateRoomWorld(ctx, roomId, await requireUser(ctx));
  if (ctx.request.method === "POST" && parts[1] === "close") return closeRoom(ctx, roomId, await requireUser(ctx));
  if (ctx.request.method === "POST" && parts[1] === "ban") return banFromRoom(ctx, roomId, await requireUser(ctx));
  return json({ error: "not found" }, 404);
}

async function createRoom(ctx: AppContext, user: AuthUser) {
  if (user.isShadowbanned) throw new HttpError("not allowed", 403);
  const body = await readJsonBody<Record<string, unknown>>(ctx.request);
  const petId = String(body.pet_id || "").trim();
  if (!petId || !slugPattern.test(petId)) throw new HttpError("pet_id is required", 400);
  const pet = await getPet(ctx, petId);
  if (!pet) throw new HttpError("pet not found", 404);
  const displayName = typeof body.display_name === "string" ? body.display_name.trim().slice(0, 60) : "";
  const collectionSlug = typeof body.collection_slug === "string" && body.collection_slug.trim() ? body.collection_slug.trim() : null;
  if (collectionSlug && (!slugPattern.test(collectionSlug) || !await collectionRow(ctx, collectionSlug))) throw new HttpError("collection not found", 404);
  const id = generateRoomId();
  await ctx.env.DB.prepare(`
    insert into playground_rooms (id, host_id, host_pet_id, display_name, collection_slug)
    values (?, ?, ?, ?, ?)
  `).bind(id, user.id, pet.id, displayName || null, collectionSlug).run();
  return json({ id, hostPetId: pet.id, displayName: displayName || null, collectionSlug }, 201);
}

async function getRoomForUser(ctx: AppContext, roomId: string, user: AuthUser) {
  const room = await roomRow(ctx, roomId);
  if (!room || room.status !== "open") return json({ error: "room not found" }, 404);
  if (await isUserBanned(ctx, roomId, user.id)) throw new HttpError("banned", 403);
  const host = await userById(ctx, room.host_id);
  const hostPet = room.host_pet_id ? await getPet(ctx, room.host_pet_id) : null;
  return json({
    id: room.id,
    hostId: room.host_id,
    hostDisplayName: host?.displayName || "Host",
    hostPetId: room.host_pet_id,
    hostPet: hostPet ? serializePet(ctx, hostPet, undefined, undefined, user) : null,
    displayName: room.display_name,
    collectionSlug: room.collection_slug,
    worldState: JSON.parse(room.world_state_json || '{"trampolines":[],"npcs":[]}'),
    isHost: room.host_id === user.id
  });
}

async function updateRoomWorld(ctx: AppContext, roomId: string, user: AuthUser) {
  const room = await roomRow(ctx, roomId);
  if (!room || room.status !== "open") return json({ error: "room not found" }, 404);
  if (room.host_id !== user.id) throw new HttpError("not allowed", 403);
  const body = await readJsonBody<{ world_state?: unknown }>(ctx.request);
  if (!body.world_state || typeof body.world_state !== "object") throw new HttpError("world_state is required", 400);
  await ctx.env.DB.prepare("update playground_rooms set world_state_json = ? where id = ?").bind(JSON.stringify(body.world_state), roomId).run();
  return json({ ok: true });
}

async function closeRoom(ctx: AppContext, roomId: string, user: AuthUser) {
  const room = await roomRow(ctx, roomId);
  if (!room) return json({ error: "room not found" }, 404);
  if (room.host_id !== user.id) throw new HttpError("not allowed", 403);
  await ctx.env.DB.prepare("update playground_rooms set status = 'closed', closed_at = ? where id = ?").bind(nowIso(), roomId).run();
  return json({ ok: true });
}

async function banFromRoom(ctx: AppContext, roomId: string, user: AuthUser) {
  const room = await roomRow(ctx, roomId);
  if (!room || room.status !== "open") return json({ error: "room not found" }, 404);
  if (room.host_id !== user.id) throw new HttpError("not allowed", 403);
  const { user_id: userId } = await readJsonBody<{ user_id?: unknown }>(ctx.request);
  const target = String(userId || "");
  if (!target || !uuidPattern.test(target)) throw new HttpError("user_id is required", 400);
  if (target === user.id) throw new HttpError("cannot ban yourself", 400);
  await ctx.env.DB.prepare("insert or ignore into playground_room_bans (room_id, user_id) values (?, ?)").bind(roomId, target).run();
  return json({ ok: true });
}

async function roomRow(ctx: AppContext, roomId: string) {
  return first<RoomRow>(ctx.env.DB.prepare("select * from playground_rooms where id = ?").bind(roomId));
}

async function isUserBanned(ctx: AppContext, roomId: string, userId: string) {
  return Boolean(await first(ctx.env.DB.prepare("select user_id from playground_room_bans where room_id = ? and user_id = ?").bind(roomId, userId)));
}

function generateRoomId() {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export async function roomAuth(ctx: AppContext, token: string) {
  const request = new Request(ctx.request.url, { headers: { Authorization: `Bearer ${token}` } });
  return requireUser({ ...ctx, request });
}
