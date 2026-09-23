import { hmac } from "./crypto";
import { HttpError } from "./http";
import type { AppContext } from "./types";

type RateLimitRule = {
  scope: string;
  subject: "client" | "recipient" | "global";
  limit: number;
  windowSeconds: number;
};

const rules: readonly RateLimitRule[] = [
  { scope: "client-burst", subject: "client", limit: 6, windowSeconds: 10 * 60 },
  { scope: "client-sustained", subject: "client", limit: 30, windowSeconds: 24 * 60 * 60 },
  { scope: "recipient-burst", subject: "recipient", limit: 3, windowSeconds: 60 * 60 },
  { scope: "recipient-sustained", subject: "recipient", limit: 6, windowSeconds: 24 * 60 * 60 },
  { scope: "global-burst", subject: "global", limit: 80, windowSeconds: 10 * 60 },
  { scope: "global-sustained", subject: "global", limit: 300, windowSeconds: 24 * 60 * 60 }
];

const consumeSql = `
  insert into auth_email_rate_limits (
    scope,
    subject_hash,
    window_started_at,
    request_count,
    expires_at,
    updated_at
  ) values (?, ?, ?, 1, ?, ?)
  on conflict (scope, subject_hash) do update set
    window_started_at = case
      when auth_email_rate_limits.expires_at <= excluded.window_started_at then excluded.window_started_at
      else auth_email_rate_limits.window_started_at
    end,
    request_count = case
      when auth_email_rate_limits.expires_at <= excluded.window_started_at then 1
      else auth_email_rate_limits.request_count + 1
    end,
    expires_at = case
      when auth_email_rate_limits.expires_at <= excluded.window_started_at then excluded.expires_at
      else auth_email_rate_limits.expires_at
    end,
    updated_at = excluded.updated_at
  where auth_email_rate_limits.expires_at <= excluded.window_started_at
     or auth_email_rate_limits.request_count < ?
  returning expires_at
`;

export async function enforceAuthEmailRateLimit(ctx: AppContext, normalizedEmail: string) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const client = trustedClientIdentity(ctx.request);
  const subjects = {
    client,
    recipient: normalizedEmail,
    global: "all"
  } as const;

  scheduleExpiredLimitCleanup(ctx, nowSeconds);

  for (const rule of rules) {
    const subjectHash = await hmac(
      ctx.env.AUTH_SECRET,
      `auth-email-rate-limit:v1:${rule.scope}:${subjects[rule.subject]}`
    );
    const accepted = await ctx.env.DB.prepare(consumeSql)
      .bind(
        rule.scope,
        subjectHash,
        nowSeconds,
        nowSeconds + rule.windowSeconds,
        new Date(nowSeconds * 1000).toISOString(),
        rule.limit
      )
      .first<{ expires_at: number }>();
    if (!accepted) throw new HttpError("too many requests, try again later", 429);
  }
}

function trustedClientIdentity(request: Request) {
  const value = request.headers.get("CF-Connecting-IP")?.trim().toLowerCase() || "";
  return value.length <= 64 && /^[0-9a-f:.]+$/.test(value) ? value : "unavailable";
}

function scheduleExpiredLimitCleanup(ctx: AppContext, nowSeconds: number) {
  if (!ctx.executionCtx) return;
  const sample = new Uint8Array(1);
  crypto.getRandomValues(sample);
  if (sample[0] % 64 !== 0) return;
  const cleanupBefore = nowSeconds - 24 * 60 * 60;
  ctx.executionCtx.waitUntil(
    ctx.env.DB.prepare(`
      delete from auth_email_rate_limits
      where rowid in (
        select rowid
        from auth_email_rate_limits
        where expires_at < ?
        order by expires_at asc
        limit 500
      )
    `).bind(cleanupBefore).run().catch((error) => {
      console.warn("auth email rate limit cleanup failed", error);
    })
  );
}
