import { bearerToken, HttpError, json, readJsonBody } from "../core/http";
import { decodePayload, encodePayload, hmac, randomId, sha256Hex, uuid } from "../core/crypto";
import { all, first, nowIso, serializeUser } from "../core/db";
import { hashPassword, verifyPassword } from "../core/password";
import type { AppContext, AuthSession, AuthUser } from "../core/types";

const accessTtlSeconds = 60 * 15;
const refreshTtlSeconds = 60 * 60 * 24 * 30;

type AccessPayload = {
  sid: string;
  uid: string;
  exp: number;
};

export async function handleAuth(ctx: AppContext, action?: string) {
  if (ctx.request.method === "GET" && action === "me") {
    return json({ user: await currentUser(ctx) });
  }

  if (ctx.request.method === "PATCH" && action === "me") {
    const user = await requireUser(ctx);
    const { displayName } = await readJsonBody<{ displayName?: unknown }>(ctx.request);
    const nextDisplayName = validateDisplayName(displayName);
    await ctx.env.DB.prepare("update users set display_name = ?, updated_at = ? where id = ?")
      .bind(nextDisplayName, nowIso(), user.id)
      .run();
    return json({ user: { ...user, displayName: nextDisplayName } });
  }

  if (ctx.request.method === "POST" && action === "logout") {
    const token = bearerToken(ctx.request);
    const payload = token ? await verifyAccessToken(ctx, token).catch(() => null) : null;
    if (payload) {
      await ctx.env.DB.prepare("delete from sessions where id = ?").bind(payload.sid).run();
    }
    return json({ ok: true });
  }

  if (ctx.request.method === "POST" && action === "refresh") {
    const { refreshToken } = await readJsonBody<{ refreshToken?: unknown }>(ctx.request);
    const token = String(refreshToken || "");
    if (!token) return json({ error: "refresh token is required" }, 401);
    const tokenHash = await sha256Hex(token);
    const session = await first<{ id: string; user_id: string; expires_at: number }>(
      ctx.env.DB.prepare("select id, user_id, expires_at from sessions where refresh_token_hash = ?").bind(tokenHash)
    );
    if (!session || session.expires_at <= nowSeconds()) return json({ error: "session expired" }, 401);
    const user = await userById(ctx, session.user_id);
    if (!user) return json({ error: "session expired" }, 401);
    return json({ user, session: await sessionFor(ctx, user, session.id, token) });
  }

  if (ctx.request.method === "POST" && action === "register") {
    const { email, password, displayName } = await readJsonBody<Record<string, unknown>>(ctx.request);
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const rawPassword = String(password || "");
    const normalizedDisplayName = validateDisplayName(displayName);
    if (!normalizedEmail.includes("@")) throw new HttpError("valid email is required", 400);
    if (rawPassword.length < 8) throw new HttpError("password must be at least 8 characters", 400);
    if (await userByEmail(ctx, normalizedEmail)) throw new HttpError("account already exists", 409);

    const id = uuid();
    const hash = await hashPassword(rawPassword);
    await ctx.env.DB.prepare(`
      insert into users (id, email, password_hash, display_name, handle, created_at, updated_at)
      values (?, ?, ?, ?, ?, ?, ?)
    `).bind(id, normalizedEmail, hash, normalizedDisplayName, await uniqueHandle(ctx, normalizedDisplayName, id), nowIso(), nowIso()).run();
    const user = await userById(ctx, id) as AuthUser;
    const session = await createSession(ctx, user);
    return json({ user, session, needsEmailConfirmation: false }, 201);
  }

  if (ctx.request.method === "POST" && action === "login") {
    const { email, password } = await readJsonBody<Record<string, unknown>>(ctx.request);
    const row = await first<{
      id: string;
      password_hash: string | null;
    }>(ctx.env.DB.prepare("select id, password_hash from users where email = ?").bind(String(email || "").trim().toLowerCase()));
    if (!row?.password_hash || !await verifyPassword(String(password || ""), row.password_hash)) {
      throw new HttpError("invalid email or password", 401);
    }
    const user = await userById(ctx, row.id) as AuthUser;
    return json({ user, session: await createSession(ctx, user) });
  }

  return json({ error: "not found" }, 404);
}

export async function currentUser(ctx: AppContext): Promise<AuthUser | null> {
  const token = bearerToken(ctx.request);
  if (!token) return null;
  const payload = await verifyAccessToken(ctx, token).catch(() => null);
  if (!payload) return null;
  const session = await first<{ id: string; expires_at: number }>(
    ctx.env.DB.prepare("select id, expires_at from sessions where id = ?").bind(payload.sid)
  );
  if (!session || session.expires_at <= nowSeconds()) return null;
  return userById(ctx, payload.uid);
}

export async function requireUser(ctx: AppContext) {
  const user = await currentUser(ctx);
  if (!user) throw new HttpError("login required", 401);
  return user;
}

export async function requireAdmin(ctx: AppContext) {
  const user = await requireUser(ctx);
  if (!user.isAdmin) throw new HttpError("admin required", 403);
  return user;
}

export async function userById(ctx: AppContext, id: string) {
  const row = await first<UserRow>(ctx.env.DB.prepare("select * from users where id = ?").bind(id));
  return row ? serializeUser(row) : null;
}

export async function userByEmail(ctx: AppContext, email: string) {
  const row = await first<UserRow>(ctx.env.DB.prepare("select * from users where email = ?").bind(email));
  return row ? serializeUser(row) : null;
}

export async function publicUser(ctx: AppContext, idOrHandle: string, viewer: AuthUser | null) {
  const row = await first<UserRow>(
    idOrHandle.includes("-") && idOrHandle.length > 30
      ? ctx.env.DB.prepare("select * from users where id = ?").bind(idOrHandle)
      : ctx.env.DB.prepare("select * from users where handle = ?").bind(idOrHandle)
  );
  if (!row || (row.shadowbanned_at && !(viewer?.isAdmin || viewer?.id === row.id))) return null;
  return {
    id: row.id,
    handle: row.handle,
    displayName: row.display_name,
    shadowbanned: Boolean(viewer?.isAdmin && row.shadowbanned_at)
  };
}

export function validateDisplayName(value: unknown) {
  const displayName = String(value || "").trim().replace(/\s+/g, " ");
  if (displayName.length < 2 || displayName.length > 32) {
    throw new HttpError("username must be 2-32 characters", 400);
  }
  if (!/^[A-Za-z0-9 _-]+$/.test(displayName)) {
    throw new HttpError("username can use letters, numbers, spaces, hyphens, and underscores", 400);
  }
  return displayName;
}

export function normalizeSlug(value: string) {
  return value
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

export async function uniqueHandle(ctx: AppContext, displayName: string, userId: string) {
  const base = normalizeSlug(displayName) || `user-${userId.slice(0, 8)}`;
  for (let index = 0; index < 100; index += 1) {
    const candidate = index ? `${base}-${index + 1}` : base;
    const existing = await first<{ id: string }>(ctx.env.DB.prepare("select id from users where handle = ?").bind(candidate));
    if (!existing || existing.id === userId) return candidate;
  }
  return `${base}-${randomId(4)}`;
}

async function createSession(ctx: AppContext, user: AuthUser): Promise<AuthSession> {
  const sessionId = randomId(18);
  const refreshToken = randomId(32);
  const expiresAt = nowSeconds() + refreshTtlSeconds;
  await ctx.env.DB.prepare("insert into sessions (id, user_id, refresh_token_hash, expires_at) values (?, ?, ?, ?)")
    .bind(sessionId, user.id, await sha256Hex(refreshToken), expiresAt)
    .run();
  return sessionFor(ctx, user, sessionId, refreshToken);
}

async function sessionFor(ctx: AppContext, user: AuthUser, sessionId: string, refreshToken: string): Promise<AuthSession> {
  const expiresAt = nowSeconds() + accessTtlSeconds;
  const payload = encodePayload({ sid: sessionId, uid: user.id, exp: expiresAt });
  return {
    accessToken: `${payload}.${await hmac(ctx.env.AUTH_SECRET, payload)}`,
    refreshToken,
    expiresAt
  };
}

async function verifyAccessToken(ctx: AppContext, token: string): Promise<AccessPayload> {
  const [payload, signature] = token.split(".");
  if (!payload || !signature || await hmac(ctx.env.AUTH_SECRET, payload) !== signature) {
    throw new HttpError("invalid token", 401);
  }
  const decoded = decodePayload<AccessPayload>(payload);
  if (decoded.exp <= nowSeconds()) throw new HttpError("expired token", 401);
  return decoded;
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

type UserRow = {
  id: string;
  email: string;
  display_name: string;
  handle: string;
  is_admin: number;
  shadowbanned_at: string | null;
};
