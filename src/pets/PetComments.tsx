import { FormEvent, useEffect, useMemo, useState, type CSSProperties } from "react";
import { formatDate, formatMetric } from "../domain/format";
import type { Pet, PetComment, User } from "../domain/types";
import { Icon, type IconName } from "../ui/Icon";
import { Spinner } from "../ui/Spinner";
import { UserAvatar } from "../ui/UserAvatar";

const maxCommentLength = 280;

const promptChips = [
  "Tiny legend.",
  "Instant install.",
  "Excellent idle energy.",
  "Needs a playground run.",
  "I would let this one sprint."
];

const commentReactions = [
  { id: "heart", icon: "heart", label: "Love" },
  { id: "sparkle", icon: "sparkle", label: "Sparkle" },
  { id: "laugh", icon: "smile", label: "Laugh" },
  { id: "party", icon: "party", label: "Celebrate" },
  { id: "eyes", icon: "eye", label: "Watching" }
] satisfies Array<{ id: string; icon: IconName; label: string }>;

export function PetComments({
  pet,
  user,
  comments,
  total,
  totalPages,
  page,
  loading,
  busy,
  status,
  focusCommentId,
  onSubmit,
  onDelete,
  onReact,
  onLoadMore,
  onSignIn
}: {
  pet: Pet;
  user: User | null;
  comments: PetComment[];
  total: number;
  totalPages: number;
  page: number;
  loading: boolean;
  busy: string;
  status: string;
  focusCommentId?: string;
  onSubmit: (body: string) => Promise<boolean>;
  onDelete: (comment: PetComment) => void | Promise<void>;
  onReact: (comment: PetComment, reaction: string) => void | Promise<void>;
  onLoadMore: () => void | Promise<void>;
  onSignIn: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [highlightedCommentId, setHighlightedCommentId] = useState("");
  const remaining = maxCommentLength - draft.length;
  const loadedLabel = useMemo(() => {
    if (!total) return "No comments yet";
    return `${formatMetric(total)} ${total === 1 ? "comment" : "comments"}`;
  }, [total]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const ok = await onSubmit(draft);
    if (ok) setDraft("");
  }

  function useChip(chip: string) {
    setDraft((current) => {
      const next = current.trim() ? `${current.trim()} ${chip}` : chip;
      return next.slice(0, maxCommentLength);
    });
  }

  useEffect(() => {
    if (!focusCommentId || loading) return;
    const target = document.getElementById(commentDomId(focusCommentId));
    const fallback = document.getElementById("pet-comments");
    const node = target || fallback;
    if (!node) return;
    node.scrollIntoView({ block: target ? "center" : "start", behavior: "smooth" });
    if (target instanceof HTMLElement) {
      target.focus({ preventScroll: true });
      setHighlightedCommentId(focusCommentId);
      const timer = window.setTimeout(() => setHighlightedCommentId(""), 2800);
      return () => window.clearTimeout(timer);
    }
  }, [focusCommentId, loading, comments]);

  return (
    <article className="petComments" id="pet-comments" aria-label={`Comments for ${pet.displayName}`}>
      <header className="detailSectionHeader petCommentsHeader">
        <div>
          <span className="detailSectionLabel">Guestbook</span>
          <p className="detailSectionHint">{loadedLabel}</p>
        </div>
        <span className="petCommentsSignal" aria-hidden="true">
          <Icon name="comment" size={13} />
          Live notes
        </span>
      </header>

      <form className="petCommentComposer" onSubmit={submit}>
        {user ? (
          <>
            <label>
              <span className="fieldLabel">Leave a note as {user.displayName}</span>
              <textarea
                className="input petCommentInput"
                maxLength={maxCommentLength}
                placeholder="Compliment the sprite, request a room run, or leave a tiny review."
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                disabled={busy === "new"}
              />
            </label>
            <div className="petCommentChips" aria-label="Comment prompts">
              {promptChips.map((chip) => (
                <button key={chip} type="button" onClick={() => useChip(chip)} disabled={busy === "new"}>
                  {chip}
                </button>
              ))}
            </div>
            <div className="petCommentComposerFooter">
              <span className={remaining < 24 ? "petCommentLimit warning" : "petCommentLimit"}>
                {remaining} left
              </span>
              <button className="btn btnPrimary btnSm" type="submit" disabled={busy === "new" || !draft.trim()}>
                {busy === "new" ? <Spinner size={13} /> : <Icon name="comment" size={13} />}
                {busy === "new" ? "Posting" : "Post comment"}
              </button>
            </div>
          </>
        ) : (
          <div className="petCommentSignedOut">
            <p>Sign in to leave a note or react to comments.</p>
            <button className="btn btnSm" type="button" onClick={onSignIn}>Sign in</button>
          </div>
        )}
      </form>

      {status ? <p className="status petCommentsStatus" role="alert">{status}</p> : null}

      <div className="petCommentList" aria-busy={loading}>
        {loading && comments.length === 0 ? (
          <CommentSkeleton />
        ) : comments.length ? (
          comments.map((comment, index) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              index={index}
              busy={busy}
              highlighted={comment.id === highlightedCommentId}
              onDelete={() => onDelete(comment)}
              onReact={(reaction) => onReact(comment, reaction)}
            />
          ))
        ) : (
          <p className="petCommentEmpty">No notes yet. Be the first to give this pet a little reputation.</p>
        )}
      </div>

      {page < totalPages ? (
        <button className="btn btnSm petCommentMore" type="button" disabled={loading} onClick={onLoadMore}>
          {loading ? <Spinner size={13} /> : <Icon name="comment" size={13} />}
          Load older comments
        </button>
      ) : null}
    </article>
  );
}

function CommentItem({
  comment,
  index,
  busy,
  highlighted,
  onDelete,
  onReact
}: {
  comment: PetComment;
  index: number;
  busy: string;
  highlighted: boolean;
  onDelete: () => void | Promise<void>;
  onReact: (reaction: string) => void | Promise<void>;
}) {
  const authorHref = comment.authorId ? `#/users/${comment.authorHandle || comment.authorId}` : "";
  return (
    <section
      className={`petComment ${highlighted ? "highlighted" : ""}`}
      id={commentDomId(comment.id)}
      tabIndex={-1}
      style={{ "--comment-index": index } as CSSProperties}
    >
      <header className="petCommentMeta">
        <UserAvatar className="petCommentAvatar" name={comment.authorName} avatarUrl={comment.authorAvatarUrl} />
        <div className="petCommentByline">
          <div>
            {authorHref ? (
              <a className="petCommentAuthorLink" href={authorHref}>
                {comment.authorName}
              </a>
            ) : (
              <strong>{comment.authorName}</strong>
            )}
            <span>{formatDate(comment.createdAt)}</span>
          </div>
          {authorHref ? (
            <a className="petCommentHandleLink" href={authorHref}>
              {comment.authorHandle ? `@${comment.authorHandle}` : "View uploads"}
            </a>
          ) : (
            <small>Guestbook note</small>
          )}
        </div>
        {comment.canDelete ? (
          <button
            className="petCommentDelete"
            type="button"
            aria-label="Delete comment"
            title="Delete comment"
            disabled={busy === `delete:${comment.id}`}
            onClick={onDelete}
          >
            {busy === `delete:${comment.id}` ? <Spinner size={12} /> : <Icon name="trash" size={12} />}
          </button>
        ) : null}
      </header>
      <p>{comment.body}</p>
      <div className="petCommentReactions" aria-label="Comment reactions">
        {commentReactions.map((reaction) => {
          const summary = comment.reactions.find((item) => item.reaction === reaction.id);
          const count = summary?.count || 0;
          const active = Boolean(summary?.reactedByMe);
          return (
            <button
              key={reaction.id}
              className={active ? "active" : ""}
              type="button"
              aria-pressed={active}
              aria-label={reaction.label}
              disabled={busy === `reaction:${comment.id}:${reaction.id}`}
              onClick={() => onReact(reaction.id)}
            >
              <Icon name={reaction.icon} size={12} />
              <span>{reaction.label}</span>
              {count ? <strong>{formatMetric(count)}</strong> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function CommentSkeleton() {
  return (
    <div className="petCommentSkeletons" aria-label="Loading comments">
      {[0, 1].map((item) => (
        <div className="petComment skeletonComment" key={item}>
          <div className="petCommentMeta">
            <span className="skeleton petCommentAvatar" />
            <div className="petCommentByline">
              <span className="skeleton line short" />
              <span className="skeleton line medium" />
            </div>
          </div>
          <span className="skeleton line" />
          <span className="skeleton line medium" />
        </div>
      ))}
    </div>
  );
}

function commentDomId(id: string) {
  return `pet-comment-${id}`;
}
