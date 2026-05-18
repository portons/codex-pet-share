import { currentUser, requireUser } from "./auth";
import { getPet, getVisiblePet, parsePagination } from "./pets";
import { all, first, nowIso } from "../core/db";
import { uuid } from "../core/crypto";
import { HttpError, json, readJsonBody } from "../core/http";
import type { AppContext, AuthUser, PetRow, Viewer } from "../core/types";

const allowedCommentReactions = new Set(["heart", "sparkle", "laugh", "party", "eyes"]);
const maxCommentBodyLength = 280;

type PetCommentRow = {
  id: string;
  pet_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
  author_handle?: string | null;
  author_display_name?: string | null;
  author_shadowbanned_at?: string | null;
};

type CommentReactionRow = {
  comment_id: string;
  reaction: string;
  count: number;
  reacted_by_me: number;
};

export async function handlePetComments(ctx: AppContext, petId: string, parts: string[]) {
  if (ctx.request.method === "GET" && parts.length === 0) return listPetComments(ctx, petId);
  if (ctx.request.method === "POST" && parts.length === 0) return createPetComment(ctx, petId);

  const commentId = parts[0];
  if (!commentId) return json({ error: "not found" }, 404);
  if (ctx.request.method === "DELETE" && parts.length === 1) return deletePetComment(ctx, petId, commentId);
  if ((ctx.request.method === "POST" || ctx.request.method === "DELETE") && parts.length === 2 && parts[1] === "reactions") {
    return setPetCommentReaction(ctx, petId, commentId, ctx.request.method === "POST");
  }
  return json({ error: "not found" }, 404);
}

async function listPetComments(ctx: AppContext, petId: string) {
  const viewer = await currentUser(ctx);
  const pet = await getVisiblePet(ctx, petId, viewer);
  if (!pet) return json({ error: "pet not found" }, 404);

  const filter = visibleCommentFilter(viewer);
  const pagination = await focusedPagination(ctx, petId, filter);
  const totalRow = await first<{ total: number }>(
    ctx.env.DB.prepare(`
      select count(*) as total
      from pet_comments c
      left join users u on u.id = c.author_id
      where c.pet_id = ? and ${filter.sql}
    `).bind(petId, ...filter.bindings)
  );
  const total = Number(totalRow?.total || 0);
  const rows = await all<PetCommentRow>(
    ctx.env.DB.prepare(`
      select c.*, u.handle as author_handle, u.display_name as author_display_name, u.shadowbanned_at as author_shadowbanned_at
      from pet_comments c
      left join users u on u.id = c.author_id
      where c.pet_id = ? and ${filter.sql}
      order by c.created_at desc, c.id desc
      limit ? offset ?
    `).bind(petId, ...filter.bindings, pagination.pageSize, (pagination.page - 1) * pagination.pageSize)
  );
  const reactions = await commentReactionContext(ctx, rows.map((row) => row.id), viewer);
  return json({
    comments: rows.map((row) => serializePetComment(row, reactions.get(row.id) || [], viewer, pet)),
    page: pagination.page,
    pageSize: pagination.pageSize,
    total,
    focusCommentId: ctx.url.searchParams.get("commentId") || null,
    totalPages: Math.ceil(total / pagination.pageSize)
  });
}

async function createPetComment(ctx: AppContext, petId: string) {
  const user = await requireCommentUser(ctx);
  const pet = await getVisiblePet(ctx, petId, user);
  if (!pet) return json({ error: "pet not found" }, 404);
  const { body } = await readJsonBody<{ body?: unknown }>(ctx.request);
  const commentBody = validateCommentBody(body);
  const id = uuid();
  await ctx.env.DB.prepare(`
    insert into pet_comments (id, pet_id, author_id, body, created_at, updated_at)
    values (?, ?, ?, ?, ?, ?)
  `).bind(id, petId, user.id, commentBody, nowIso(), nowIso()).run();
  const row = await commentRow(ctx, petId, id);
  if (!row) throw new HttpError("comment not found", 500);
  return json({
    comment: serializePetComment(row, [], user, pet),
    total: await publicCommentCount(ctx, petId)
  }, 201);
}

async function deletePetComment(ctx: AppContext, petId: string, commentId: string) {
  const user = await requireUser(ctx);
  const pet = await getPet(ctx, petId);
  if (!pet || !await getVisiblePet(ctx, petId, user)) return json({ error: "pet not found" }, 404);
  const comment = await commentRow(ctx, petId, commentId);
  if (!comment || !canDeleteComment(comment, user, pet)) return json({ error: "comment not found" }, 404);
  await ctx.env.DB.prepare("delete from pet_comments where id = ? and pet_id = ?").bind(commentId, petId).run();
  return json({ ok: true, total: await publicCommentCount(ctx, petId) });
}

async function setPetCommentReaction(ctx: AppContext, petId: string, commentId: string, active: boolean) {
  const user = await requireCommentUser(ctx);
  const pet = await getVisiblePet(ctx, petId, user);
  if (!pet) return json({ error: "pet not found" }, 404);
  const comment = await commentRow(ctx, petId, commentId);
  if (!comment || !canSeeComment(comment, user)) return json({ error: "comment not found" }, 404);
  const { reaction } = await readJsonBody<{ reaction?: unknown }>(ctx.request);
  const reactionId = validateReaction(reaction);
  if (active) {
    await ctx.env.DB.prepare("insert or ignore into pet_comment_reactions (comment_id, user_id, reaction) values (?, ?, ?)")
      .bind(commentId, user.id, reactionId)
      .run();
  } else {
    await ctx.env.DB.prepare("delete from pet_comment_reactions where comment_id = ? and user_id = ? and reaction = ?")
      .bind(commentId, user.id, reactionId)
      .run();
  }
  const reactions = await commentReactionContext(ctx, [commentId], user);
  return json({ comment: serializePetComment(comment, reactions.get(commentId) || [], user, pet) });
}

async function requireCommentUser(ctx: AppContext) {
  const user = await requireUser(ctx);
  if (user.isShadowbanned) throw new HttpError("not allowed", 403);
  return user;
}

function validateCommentBody(value: unknown) {
  const body = String(value || "").trim().replace(/\s+/g, " ");
  if (!body) throw new HttpError("comment is required", 400);
  if (body.length > maxCommentBodyLength) throw new HttpError(`comment must be ${maxCommentBodyLength} characters or less`, 400);
  return body;
}

function validateReaction(value: unknown) {
  const reaction = String(value || "");
  if (!allowedCommentReactions.has(reaction)) throw new HttpError("invalid reaction", 400);
  return reaction;
}

async function commentRow(ctx: AppContext, petId: string, commentId: string) {
  return first<PetCommentRow>(
    ctx.env.DB.prepare(`
      select c.*, u.handle as author_handle, u.display_name as author_display_name, u.shadowbanned_at as author_shadowbanned_at
      from pet_comments c
      left join users u on u.id = c.author_id
      where c.pet_id = ? and c.id = ?
    `).bind(petId, commentId)
  );
}

function serializePetComment(row: PetCommentRow, reactions: CommentReactionRow[], viewer: Viewer, pet: PetRow) {
  return {
    id: row.id,
    petId: row.pet_id,
    authorId: row.author_id,
    authorHandle: row.author_handle || null,
    authorName: row.author_display_name || "Anonymous",
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    canDelete: Boolean(viewer?.id && canDeleteComment(row, viewer, pet)),
    reactions: reactions.map((reaction) => ({
      reaction: reaction.reaction,
      count: Number(reaction.count || 0),
      reactedByMe: Boolean(reaction.reacted_by_me)
    }))
  };
}

function canDeleteComment(comment: Pick<PetCommentRow, "author_id">, user: Pick<AuthUser, "id" | "isAdmin">, pet: Pick<PetRow, "owner_id">) {
  return Boolean(user.isAdmin || comment.author_id === user.id || pet.owner_id === user.id);
}

function canSeeComment(comment: Pick<PetCommentRow, "author_id" | "author_shadowbanned_at">, viewer: Viewer) {
  return !comment.author_shadowbanned_at || Boolean(viewer?.isAdmin || (comment.author_id && viewer?.id === comment.author_id));
}

function visibleCommentFilter(viewer: Viewer) {
  return {
    sql: "(u.shadowbanned_at is null or ? = 1 or c.author_id = ?)",
    bindings: [viewer?.isAdmin ? 1 : 0, viewer?.id || ""]
  };
}

async function publicCommentCount(ctx: AppContext, petId: string) {
  const row = await first<{ total: number }>(
    ctx.env.DB.prepare(`
      select count(*) as total
      from pet_comments c
      left join users u on u.id = c.author_id
      where c.pet_id = ? and u.shadowbanned_at is null
    `).bind(petId)
  );
  return Number(row?.total || 0);
}

async function commentReactionContext(ctx: AppContext, commentIds: string[], viewer: Viewer) {
  const byComment = new Map<string, CommentReactionRow[]>();
  const uniqueIds = [...new Set(commentIds)];
  if (!uniqueIds.length) return byComment;
  const placeholders = uniqueIds.map(() => "?").join(",");
  const rows = await all<CommentReactionRow>(
    ctx.env.DB.prepare(`
      select comment_id, reaction, count(*) as count, sum(case when user_id = ? then 1 else 0 end) as reacted_by_me
      from pet_comment_reactions
      where comment_id in (${placeholders})
      group by comment_id, reaction
      order by count(*) desc, reaction asc
    `).bind(viewer?.id || "", ...uniqueIds)
  );
  for (const row of rows) {
    const group = byComment.get(row.comment_id) || [];
    group.push(row);
    byComment.set(row.comment_id, group);
  }
  return byComment;
}

async function focusedPagination(ctx: AppContext, petId: string, filter: { sql: string; bindings: Array<string | number> }) {
  const pagination = parsePagination(ctx.url);
  const commentId = ctx.url.searchParams.get("commentId") || "";
  if (!commentId) return pagination;
  const row = await first<Pick<PetCommentRow, "id" | "created_at">>(
    ctx.env.DB.prepare(`
      select c.id, c.created_at
      from pet_comments c
      left join users u on u.id = c.author_id
      where c.pet_id = ? and c.id = ? and ${filter.sql}
    `).bind(petId, commentId, ...filter.bindings)
  );
  if (!row) return pagination;
  const beforeRow = await first<{ total: number }>(
    ctx.env.DB.prepare(`
      select count(*) as total
      from pet_comments c
      left join users u on u.id = c.author_id
      where c.pet_id = ? and ${filter.sql}
        and (c.created_at > ? or (c.created_at = ? and c.id > ?))
    `).bind(petId, ...filter.bindings, row.created_at, row.created_at, row.id)
  );
  return {
    ...pagination,
    page: Math.floor(Number(beforeRow?.total || 0) / pagination.pageSize) + 1
  };
}
