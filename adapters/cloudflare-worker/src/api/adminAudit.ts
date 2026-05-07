import { nowIso } from "../core/db";
import type { AppContext, AuthUser } from "../core/types";

export async function auditAdminAction(
  ctx: AppContext,
  actor: AuthUser,
  action: "pet.delete" | "pet.nsfw" | "user.delete" | "user.shadowban",
  input: {
    targetUserId?: string | null;
    targetUserEmail?: string | null;
    targetPetId?: string | null;
    metadata?: Record<string, unknown>;
  } = {}
) {
  await ctx.env.DB.prepare(`
    insert into admin_audit_events (actor_id, actor_email, action, target_user_id, target_user_email, target_pet_id, metadata_json, created_at)
    values (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    actor.id,
    actor.email.trim().toLowerCase(),
    action,
    input.targetUserId || null,
    input.targetUserEmail ? input.targetUserEmail.trim().toLowerCase() : null,
    input.targetPetId || null,
    JSON.stringify(input.metadata || {}),
    nowIso()
  ).run();
}
