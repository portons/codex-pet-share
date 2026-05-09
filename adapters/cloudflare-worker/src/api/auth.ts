import { Google, Twitter, generateCodeVerifier, generateState } from "arctic";
import { bearerToken, escapeHtml, HttpError, json, readJsonBody } from "../core/http";
import { decodePayload, encodePayload, hmac, randomId, sha256Hex, timingSafeEqual, uuid } from "../core/crypto";
import { first, nowIso, serializeUser } from "../core/db";
import { hashPassword, verifyPassword } from "../core/password";
import type { AppContext, AuthSession, AuthUser } from "../core/types";

const accessTtlSeconds = 60 * 15;
const refreshTtlSeconds = 60 * 60 * 24 * 30;
const emailVerificationTtlSeconds = 60 * 60 * 24;
const authLoginCodeTtlSeconds = 60 * 5;
const passwordResetTtlSeconds = 60 * 30;
const oauthCookieTtlSeconds = 60 * 10;

type AuthProvider = "google" | "x";

type AccessPayload = {
  sid: string;
  uid: string;
  exp: number;
};

export async function handleAuth(ctx: AppContext, partsOrAction: string[] | string = []) {
  const parts = Array.isArray(partsOrAction) ? partsOrAction : partsOrAction ? [partsOrAction] : [];
  const action = parts[0];

  if (ctx.request.method === "GET" && action === "providers") {
    return json({ providers: configuredAuthProviders(ctx) });
  }

  if (action === "oauth") {
    return handleOAuth(ctx, parts.slice(1));
  }

  if (ctx.request.method === "GET" && action === "verify-email") {
    return verifyEmail(ctx);
  }

  if (ctx.request.method === "POST" && action === "session-code") {
    const { code } = await readJsonBody<{ code?: unknown }>(ctx.request);
    const user = await consumeAuthLoginCode(ctx, String(code || ""));
    return json({ user, session: await createSession(ctx, user) });
  }

  if (ctx.request.method === "POST" && action === "resend-verification") {
    const { email } = await readJsonBody<{ email?: unknown }>(ctx.request);
    await resendVerificationEmail(ctx, String(email || "").trim().toLowerCase());
    return json({ ok: true });
  }

  if (ctx.request.method === "POST" && action === "password-reset") {
    const { email } = await readJsonBody<{ email?: unknown }>(ctx.request);
    await sendPasswordResetEmail(ctx, String(email || "").trim().toLowerCase());
    return json({ ok: true });
  }

  if (ctx.request.method === "POST" && action === "password-reset-complete") {
    const { token, password } = await readJsonBody<{ token?: unknown; password?: unknown }>(ctx.request);
    const user = await completePasswordReset(ctx, String(token || ""), String(password || ""));
    return json({ user, session: await createSession(ctx, user) });
  }

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

  if (ctx.request.method === "POST" && action === "password") {
    const user = await requireUser(ctx);
    const { currentPassword, newPassword } = await readJsonBody<{ currentPassword?: unknown; newPassword?: unknown }>(ctx.request);
    await changePassword(ctx, user, String(currentPassword || ""), String(newPassword || ""));
    return json({ ok: true });
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
      insert into users (id, email, password_hash, display_name, handle, email_verified_at, created_at, updated_at)
      values (?, ?, ?, ?, ?, null, ?, ?)
    `).bind(id, normalizedEmail, hash, normalizedDisplayName, await uniqueHandle(ctx, normalizedDisplayName, id), nowIso(), nowIso()).run();
    const user = await userById(ctx, id) as AuthUser;
    try {
      await sendVerificationEmail(ctx, user);
    } catch (error) {
      await ctx.env.DB.prepare("delete from users where id = ?").bind(user.id).run();
      throw error;
    }
    return json({ user, session: null, needsEmailConfirmation: true }, 201);
  }

  if (ctx.request.method === "POST" && action === "login") {
    const { email, password } = await readJsonBody<Record<string, unknown>>(ctx.request);
    const row = await first<{
      id: string;
      password_hash: string | null;
      email_verified_at: string | null;
    }>(ctx.env.DB.prepare("select id, password_hash, email_verified_at from users where email = ?").bind(String(email || "").trim().toLowerCase()));
    if (!row?.password_hash || !await verifyPassword(String(password || ""), row.password_hash)) {
      throw new HttpError("invalid email or password", 401);
    }
    if (!row.email_verified_at) throw new HttpError("confirm your email before signing in", 403);
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

function configuredAuthProviders(ctx: AppContext) {
  const providers: Array<{ id: AuthProvider; label: string }> = [];
  if (ctx.env.AUTH_GOOGLE_CLIENT_ID && ctx.env.AUTH_GOOGLE_CLIENT_SECRET) {
    providers.push({ id: "google", label: "Google" });
  }
  if (ctx.env.AUTH_X_CLIENT_ID && ctx.env.AUTH_X_CLIENT_SECRET) {
    providers.push({ id: "x", label: "X" });
  }
  return providers;
}

async function handleOAuth(ctx: AppContext, parts: string[]) {
  const provider = parseAuthProvider(parts[0]);
  const oauthAction = parts[1];
  if (ctx.request.method === "GET" && oauthAction === "start") return startOAuth(ctx, provider);
  if (ctx.request.method === "GET" && oauthAction === "callback") return finishOAuth(ctx, provider);
  return json({ error: "not found" }, 404);
}

async function startOAuth(ctx: AppContext, provider: AuthProvider) {
  const codeVerifier = generateCodeVerifier();
  const state = generateState();
  const client = oauthClient(ctx, provider);
  const scopes = provider === "google"
    ? ["openid", "email", "profile"]
    : ["tweet.read", "users.read", "users.email"];
  const url = client.createAuthorizationURL(state, codeVerifier, scopes);
  const cookie = await signedOAuthCookie(ctx, { provider, state, codeVerifier, createdAt: nowSeconds() });
  return json({ url: url.toString() }, 200, {
    "Cache-Control": "no-store",
    "Set-Cookie": oauthCookieHeader(ctx, provider, cookie, oauthCookieTtlSeconds)
  });
}

async function finishOAuth(ctx: AppContext, provider: AuthProvider) {
  const code = ctx.url.searchParams.get("code") || "";
  const state = ctx.url.searchParams.get("state") || "";
  if (!code || !state) throw new HttpError("missing OAuth callback parameters", 400);
  const cookie = await readOAuthCookie(ctx, provider);
  if (cookie.provider !== provider || !timingSafeEqual(cookie.state, state)) {
    throw new HttpError("invalid OAuth state", 400);
  }
  const client = oauthClient(ctx, provider);
  const tokens = await client.validateAuthorizationCode(code, cookie.codeVerifier);
  const profile = provider === "google"
    ? await googleProfile(tokens.accessToken())
    : await xProfile(tokens.accessToken());
  const user = await userForOAuthProfile(ctx, profile);
  const loginCode = await createAuthLoginCode(ctx, user.id);
  return authCallbackRedirect(ctx, loginCode, oauthCookieHeader(ctx, provider, "", 0));
}

function oauthClient(ctx: AppContext, provider: AuthProvider) {
  const redirectUri = `${ctx.url.origin}/api/auth/oauth/${provider}/callback`;
  if (provider === "google") {
    if (!ctx.env.AUTH_GOOGLE_CLIENT_ID || !ctx.env.AUTH_GOOGLE_CLIENT_SECRET) {
      throw new HttpError("Google sign-in is not configured", 503);
    }
    return new Google(ctx.env.AUTH_GOOGLE_CLIENT_ID, ctx.env.AUTH_GOOGLE_CLIENT_SECRET, redirectUri);
  }
  if (!ctx.env.AUTH_X_CLIENT_ID || !ctx.env.AUTH_X_CLIENT_SECRET) {
    throw new HttpError("X sign-in is not configured", 503);
  }
  return new Twitter(ctx.env.AUTH_X_CLIENT_ID, ctx.env.AUTH_X_CLIENT_SECRET, redirectUri);
}

type OAuthCookiePayload = {
  provider: AuthProvider;
  state: string;
  codeVerifier: string;
  createdAt: number;
};

async function signedOAuthCookie(ctx: AppContext, payload: OAuthCookiePayload) {
  const encoded = encodePayload(payload);
  return `${encoded}.${await hmac(ctx.env.AUTH_SECRET, encoded)}`;
}

async function readOAuthCookie(ctx: AppContext, provider: AuthProvider) {
  const value = requestCookies(ctx.request).get(oauthCookieName(provider)) || "";
  const [encoded, signature] = value.split(".");
  if (!encoded || !signature || !timingSafeEqual(await hmac(ctx.env.AUTH_SECRET, encoded), signature)) {
    throw new HttpError("invalid OAuth state", 400);
  }
  const payload = decodePayload<OAuthCookiePayload>(encoded);
  if (payload.createdAt + oauthCookieTtlSeconds <= nowSeconds()) throw new HttpError("expired OAuth state", 400);
  return payload;
}

function oauthCookieHeader(ctx: AppContext, provider: AuthProvider, value: string, maxAge: number) {
  const secure = ctx.url.protocol === "https:" ? "; Secure" : "";
  return `${oauthCookieName(provider)}=${value}; Path=/api/auth/oauth/${provider}/callback; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`;
}

function oauthCookieName(provider: AuthProvider) {
  return `codex_pets_oauth_${provider}`;
}

function requestCookies(request: Request) {
  const cookies = new Map<string, string>();
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index <= 0) continue;
    cookies.set(part.slice(0, index).trim(), part.slice(index + 1).trim());
  }
  return cookies;
}

type OAuthProfile = {
  provider: AuthProvider;
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  avatarUrl?: string;
};

async function googleProfile(accessToken: string): Promise<OAuthProfile> {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" }
  });
  if (!response.ok) throw new HttpError("Google profile request failed", 502);
  const profile = await response.json() as {
    sub?: unknown;
    email?: unknown;
    email_verified?: unknown;
    name?: unknown;
    picture?: unknown;
  };
  const providerUserId = String(profile.sub || "");
  const email = String(profile.email || "").trim().toLowerCase();
  if (!providerUserId || !email.includes("@") || profile.email_verified !== true) {
    throw new HttpError("verified Google email is required", 400);
  }
  return {
    provider: "google",
    providerUserId,
    email,
    emailVerified: true,
    displayName: normalizeOAuthDisplayName(String(profile.name || ""), "google", providerUserId),
    avatarUrl: String(profile.picture || "") || undefined
  };
}

async function xProfile(accessToken: string): Promise<OAuthProfile> {
  const params = new URLSearchParams({ "user.fields": "confirmed_email,username,name,profile_image_url" });
  const response = await fetch(`https://api.x.com/2/users/me?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" }
  });
  if (!response.ok) throw new HttpError("X profile request failed", 502);
  const body = await response.json() as {
    data?: {
      id?: unknown;
      name?: unknown;
      username?: unknown;
      confirmed_email?: unknown;
      profile_image_url?: unknown;
    };
  };
  const data = body.data || {};
  const providerUserId = String(data.id || "");
  const email = String(data.confirmed_email || "").trim().toLowerCase();
  if (!providerUserId || !email.includes("@")) {
    throw new HttpError("verified X email is required", 400);
  }
  return {
    provider: "x",
    providerUserId,
    email,
    emailVerified: true,
    displayName: normalizeOAuthDisplayName(String(data.name || data.username || ""), "x", providerUserId),
    avatarUrl: String(data.profile_image_url || "") || undefined
  };
}

async function userForOAuthProfile(ctx: AppContext, profile: OAuthProfile) {
  const identity = await first<{ user_id: string }>(
    ctx.env.DB.prepare("select user_id from auth_identities where provider = ? and provider_user_id = ?")
      .bind(profile.provider, profile.providerUserId)
  );
  if (identity) {
    await ctx.env.DB.prepare(`
      update auth_identities set email = ?, email_verified_at = ?, display_name = ?, avatar_url = ?, updated_at = ?
      where provider = ? and provider_user_id = ?
    `).bind(profile.email, profile.emailVerified ? nowIso() : null, profile.displayName, profile.avatarUrl || null, nowIso(), profile.provider, profile.providerUserId).run();
    const user = await userById(ctx, identity.user_id);
    if (!user) throw new HttpError("linked account not found", 401);
    return user;
  }

  let user = await userByEmail(ctx, profile.email);
  if (!user) {
    const id = uuid();
    await ctx.env.DB.prepare(`
      insert into users (id, email, password_hash, display_name, handle, email_verified_at, created_at, updated_at)
      values (?, ?, null, ?, ?, ?, ?, ?)
    `).bind(id, profile.email, profile.displayName, await uniqueHandle(ctx, profile.displayName, id), nowIso(), nowIso(), nowIso()).run();
    user = await userById(ctx, id);
  } else if (!user.emailVerified) {
    await ctx.env.DB.prepare("update users set email_verified_at = ?, updated_at = ? where id = ?")
      .bind(nowIso(), nowIso(), user.id)
      .run();
    user = await userById(ctx, user.id);
  }
  if (!user) throw new HttpError("could not create OAuth user", 500);

  const existingProviderIdentity = await first<{ provider_user_id: string }>(
    ctx.env.DB.prepare("select provider_user_id from auth_identities where provider = ? and user_id = ?")
      .bind(profile.provider, user.id)
  );
  if (existingProviderIdentity && existingProviderIdentity.provider_user_id !== profile.providerUserId) {
    throw new HttpError(`account is already linked to another ${profile.provider} identity`, 409);
  }

  await ctx.env.DB.prepare(`
    insert into auth_identities (provider, provider_user_id, user_id, email, email_verified_at, display_name, avatar_url, created_at, updated_at)
    values (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(profile.provider, profile.providerUserId, user.id, profile.email, profile.emailVerified ? nowIso() : null, profile.displayName, profile.avatarUrl || null, nowIso(), nowIso()).run();
  return user;
}

function normalizeOAuthDisplayName(value: string, provider: AuthProvider, providerUserId: string) {
  const cleaned = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 _-]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 32)
    .trim();
  if (cleaned.length >= 2) return validateDisplayName(cleaned);
  return validateDisplayName(`${provider}-${providerUserId.slice(0, 8)}`);
}

async function sendVerificationEmail(ctx: AppContext, user: AuthUser) {
  const token = await createEmailVerificationToken(ctx, user.id);
  const verifyUrl = `${ctx.url.origin}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  const subject = `Confirm your ${ctx.env.APP_NAME} account`;
  await sendAuthEmail(ctx, {
    to: user.email,
    subject,
    text: `Confirm your ${ctx.env.APP_NAME} account: ${verifyUrl}`,
    html: `<p>Confirm your ${escapeHtml(ctx.env.APP_NAME)} account.</p><p><a href="${escapeHtml(verifyUrl)}">Confirm email</a></p>`
  });
}

async function sendPasswordResetEmail(ctx: AppContext, email: string) {
  if (!email.includes("@")) throw new HttpError("valid email is required", 400);
  const user = await userByEmail(ctx, email);
  if (!user) return;
  const token = await createPasswordResetToken(ctx, user.id);
  const resetUrl = `${ctx.env.PUBLIC_APP_ORIGIN.replace(/\/$/, "")}/#/auth/reset-password?token=${encodeURIComponent(token)}`;
  const subject = `Reset your ${ctx.env.APP_NAME} password`;
  await sendAuthEmail(ctx, {
    to: user.email,
    subject,
    text: `Reset your ${ctx.env.APP_NAME} password: ${resetUrl}`,
    html: `<p>Reset your ${escapeHtml(ctx.env.APP_NAME)} password.</p><p><a href="${escapeHtml(resetUrl)}">Reset password</a></p>`
  });
}

async function sendAuthEmail(ctx: AppContext, message: { to: string; subject: string; text: string; html: string }) {
  if (!ctx.env.RESEND_API_KEY || !ctx.env.AUTH_EMAIL_FROM) throw new HttpError("email delivery is not configured", 500);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ctx.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "User-Agent": `${ctx.env.APP_HANDLE}/cloudflare-worker`
    },
    body: JSON.stringify({
      from: `${ctx.env.APP_NAME} <${ctx.env.AUTH_EMAIL_FROM}>`,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html
    })
  });
  if (!response.ok) {
    console.error("auth email delivery failed", response.status, await response.text());
    throw new HttpError("email delivery failed", 502);
  }
}

async function changePassword(ctx: AppContext, user: AuthUser, currentPassword: string, newPassword: string) {
  validateNewPassword(newPassword);
  const row = await first<{ password_hash: string | null }>(
    ctx.env.DB.prepare("select password_hash from users where id = ?").bind(user.id)
  );
  if (!row?.password_hash) {
    if (currentPassword) throw new HttpError("this account does not have a password", 409);
    await setUserPassword(ctx, user.id, newPassword);
    return;
  }
  if (!await verifyPassword(currentPassword, row.password_hash)) throw new HttpError("current password is incorrect", 401);
  await setUserPassword(ctx, user.id, newPassword);
}

async function resendVerificationEmail(ctx: AppContext, email: string) {
  if (!email.includes("@")) throw new HttpError("valid email is required", 400);
  const row = await first<UserRow>(ctx.env.DB.prepare("select * from users where email = ?").bind(email));
  if (!row) throw new HttpError("account not found", 404);
  if (row.email_verified_at) throw new HttpError("email is already confirmed", 409);
  await sendVerificationEmail(ctx, serializeUser(row));
}

async function createEmailVerificationToken(ctx: AppContext, userId: string) {
  const token = randomId(32);
  await ctx.env.DB.prepare("delete from email_verification_tokens where user_id = ? and consumed_at is null")
    .bind(userId)
    .run();
  await ctx.env.DB.prepare(`
    insert into email_verification_tokens (id, user_id, token_hash, expires_at)
    values (?, ?, ?, ?)
  `).bind(randomId(18), userId, await sha256Hex(token), nowSeconds() + emailVerificationTtlSeconds).run();
  return token;
}

async function createPasswordResetToken(ctx: AppContext, userId: string) {
  const token = randomId(32);
  await ctx.env.DB.prepare("delete from password_reset_tokens where user_id = ? and consumed_at is null")
    .bind(userId)
    .run();
  await ctx.env.DB.prepare(`
    insert into password_reset_tokens (id, user_id, token_hash, expires_at)
    values (?, ?, ?, ?)
  `).bind(randomId(18), userId, await sha256Hex(token), nowSeconds() + passwordResetTtlSeconds).run();
  return token;
}

async function verifyEmail(ctx: AppContext) {
  const token = ctx.url.searchParams.get("token") || "";
  const tokenHash = await sha256Hex(token);
  const row = await first<{ id: string; user_id: string; expires_at: number; consumed_at: string | null }>(
    ctx.env.DB.prepare("select id, user_id, expires_at, consumed_at from email_verification_tokens where token_hash = ?").bind(tokenHash)
  );
  if (!row || row.consumed_at || row.expires_at <= nowSeconds()) throw new HttpError("invalid or expired email confirmation link", 400);
  const now = nowIso();
  await ctx.env.DB.batch([
    ctx.env.DB.prepare("update users set email_verified_at = coalesce(email_verified_at, ?), updated_at = ? where id = ?").bind(now, now, row.user_id),
    ctx.env.DB.prepare("update email_verification_tokens set consumed_at = ? where id = ?").bind(now, row.id)
  ]);
  const loginCode = await createAuthLoginCode(ctx, row.user_id);
  return authCallbackRedirect(ctx, loginCode);
}

async function completePasswordReset(ctx: AppContext, token: string, password: string) {
  validateNewPassword(password);
  const row = await first<{ id: string; user_id: string; expires_at: number; consumed_at: string | null }>(
    ctx.env.DB.prepare("select id, user_id, expires_at, consumed_at from password_reset_tokens where token_hash = ?").bind(await sha256Hex(token))
  );
  if (!row || row.consumed_at || row.expires_at <= nowSeconds()) throw new HttpError("invalid or expired password reset link", 400);
  await setUserPassword(ctx, row.user_id, password);
  const user = await userById(ctx, row.user_id);
  if (!user) throw new HttpError("password reset account not found", 401);
  await ctx.env.DB.batch([
    ctx.env.DB.prepare("update password_reset_tokens set consumed_at = ? where id = ?").bind(nowIso(), row.id),
    ctx.env.DB.prepare("delete from sessions where user_id = ?").bind(row.user_id)
  ]);
  return user;
}

async function setUserPassword(ctx: AppContext, userId: string, password: string) {
  await ctx.env.DB.prepare("update users set password_hash = ?, updated_at = ? where id = ?")
    .bind(await hashPassword(password), nowIso(), userId)
    .run();
}

async function createAuthLoginCode(ctx: AppContext, userId: string) {
  const code = randomId(32);
  await ctx.env.DB.prepare(`
    insert into auth_login_codes (id, user_id, code_hash, expires_at)
    values (?, ?, ?, ?)
  `).bind(randomId(18), userId, await sha256Hex(code), nowSeconds() + authLoginCodeTtlSeconds).run();
  return code;
}

async function consumeAuthLoginCode(ctx: AppContext, code: string) {
  const row = await first<{ id: string; user_id: string; expires_at: number; consumed_at: string | null }>(
    ctx.env.DB.prepare("select id, user_id, expires_at, consumed_at from auth_login_codes where code_hash = ?").bind(await sha256Hex(code))
  );
  if (!row || row.consumed_at || row.expires_at <= nowSeconds()) throw new HttpError("invalid or expired auth code", 401);
  await ctx.env.DB.prepare("update auth_login_codes set consumed_at = ? where id = ?")
    .bind(nowIso(), row.id)
    .run();
  const user = await userById(ctx, row.user_id);
  if (!user) throw new HttpError("auth code account not found", 401);
  return user;
}

function authCallbackRedirect(ctx: AppContext, code: string, cookie?: string) {
  const target = `${ctx.env.PUBLIC_APP_ORIGIN.replace(/\/$/, "")}/#/auth/callback?code=${encodeURIComponent(code)}`;
  const headers = new Headers({ Location: target, "Cache-Control": "no-store" });
  if (cookie) headers.append("Set-Cookie", cookie);
  return new Response(null, { status: 302, headers });
}

function parseAuthProvider(value: string | undefined): AuthProvider {
  if (value === "google" || value === "x") return value;
  throw new HttpError("unknown auth provider", 404);
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

function validateNewPassword(value: string) {
  if (value.length < 8) throw new HttpError("password must be at least 8 characters", 400);
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
  email_verified_at: string | null;
};
