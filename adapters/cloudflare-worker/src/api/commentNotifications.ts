import { requireUser } from "./auth";
import { all, first, nowIso } from "../core/db";
import { HttpError, json, readJsonBody } from "../core/http";
import type { AppContext, AuthUser } from "../core/types";

const notificationPageSize = 6;

type CommentNotificationRow = {
  id: string;
  pet_id: string;
  pet_display_name: string;
  body: string;
  created_at: string;
  author_id: string | null;
  author_handle: string | null;
  author_display_name: string | null;
};

export async function handleCommentNotifications(ctx: AppContext, parts: string[]) {
  if (ctx.request.method === "GET" && parts.length === 1 && parts[0] === "notifications") {
    const user = await requireUser(ctx);
    return json(await commentNotifications(ctx, user));
  }
  if (ctx.request.method === "POST" && parts.length === 2 && parts[0] === "notifications" && parts[1] === "read") {
    const user = await requireUser(ctx);
    const { commentId } = await readJsonBody<{ commentId?: unknown }>(ctx.request);
    await markCommentNotificationsRead(ctx, user, typeof commentId === "string" ? commentId : "");
    return json(await commentNotifications(ctx, user));
  }
  return json({ error: "not found" }, 404);
}

async function commentNotifications(ctx: AppContext, user: AuthUser) {
  const totalRow = await first<{ total: number }>(
    ctx.env.DB.prepare(`
      select count(*) as total
      from pet_comments c
      join pets p on p.id = c.pet_id
      left join users u on u.id = c.author_id
      left join comment_notification_reads r on r.user_id = ? and r.comment_id = c.id
      where ${ownedUnreadCommentFilter()}
    `).bind(user.id, user.id, user.id)
  );
  const rows = await all<CommentNotificationRow>(
    ctx.env.DB.prepare(`
      select c.id, c.pet_id, p.display_name as pet_display_name, c.body, c.created_at,
        c.author_id, u.handle as author_handle, u.display_name as author_display_name
      from pet_comments c
      join pets p on p.id = c.pet_id
      left join users u on u.id = c.author_id
      left join comment_notification_reads r on r.user_id = ? and r.comment_id = c.id
      where ${ownedUnreadCommentFilter()}
      order by c.created_at desc, c.id desc
      limit ?
    `).bind(user.id, user.id, user.id, notificationPageSize)
  );
  return {
    unreadCount: Number(totalRow?.total || 0),
    notifications: rows.map(serializeCommentNotification)
  };
}

async function markCommentNotificationsRead(ctx: AppContext, user: AuthUser, commentId: string) {
  const readAt = nowIso();
  if (commentId) {
    const row = await first<{ id: string }>(
      ctx.env.DB.prepare(`
        select c.id
        from pet_comments c
        join pets p on p.id = c.pet_id
        left join users u on u.id = c.author_id
        where c.id = ? and p.owner_id = ? and coalesce(c.author_id, '') <> ? and u.shadowbanned_at is null
      `).bind(commentId, user.id, user.id)
    );
    if (!row) throw new HttpError("comment notification not found", 404);
    await ctx.env.DB.prepare(`
      insert or replace into comment_notification_reads (user_id, comment_id, read_at)
      values (?, ?, ?)
    `).bind(user.id, commentId, readAt).run();
    return;
  }

  await ctx.env.DB.prepare(`
    insert or ignore into comment_notification_reads (user_id, comment_id, read_at)
    select ?, c.id, ?
    from pet_comments c
    join pets p on p.id = c.pet_id
    left join users u on u.id = c.author_id
    left join comment_notification_reads r on r.user_id = ? and r.comment_id = c.id
    where ${ownedUnreadCommentFilter()}
  `).bind(user.id, readAt, user.id, user.id, user.id).run();
}

function ownedUnreadCommentFilter() {
  return "p.owner_id = ? and coalesce(c.author_id, '') <> ? and u.shadowbanned_at is null and r.comment_id is null";
}

function serializeCommentNotification(row: CommentNotificationRow) {
  return {
    id: row.id,
    commentId: row.id,
    petId: row.pet_id,
    petDisplayName: row.pet_display_name,
    authorId: row.author_id,
    authorHandle: row.author_handle || null,
    authorName: row.author_display_name || "Anonymous",
    body: row.body,
    createdAt: row.created_at
  };
}
