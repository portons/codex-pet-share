import { FormEvent, useMemo, useState } from "react";
import { formatDate, formatMetric } from "../domain/format";
import type { Pet, PetComment, User } from "../domain/types";
import { Icon } from "../ui/Icon";
import { Spinner } from "../ui/Spinner";

const maxCommentLength = 280;

const promptChips = [
  "Tiny legend.",
  "Instant install.",
  "Excellent idle energy.",
  "Needs a playground run.",
  "I would let this one sprint."
];

const commentReactions = [
  { id: "heart", glyph: "💚", label: "Love" },
  { id: "sparkle", glyph: "✨", label: "Sparkle" },
  { id: "laugh", glyph: "😂", label: "Laugh" },
  { id: "party", glyph: "🎉", label: "Celebrate" },
  { id: "eyes", glyph: "👀", label: "Watching" }
];

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
  onSubmit: (body: string) => Promise<boolean>;
  onDelete: (comment: PetComment) => void | Promise<void>;
  onReact: (comment: PetComment, reaction: string) => void | Promise<void>;
  onLoadMore: () => void | Promise<void>;
  onSignIn: () => void;
}) {
  const [draft, setDraft] = useState("");
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

  return (
    <article className="petComments" aria-label={`Comments for ${pet.displayName}`}>
      <header className="detailSectionHeader petCommentsHeader">
        <div>
          <span className="detailSectionLabel">Guestbook</span>
          <p className="detailSectionHint">{loadedLabel}</p>
        </div>
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
              <span className={remaining < 24 ? "petCommentLimit warning" : "petCommentLimit"}>{remaining}</span>
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
          <div className="petCommentLoading">
            <Spinner size={16} />
          </div>
        ) : comments.length ? (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              busy={busy}
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
  busy,
  onDelete,
  onReact
}: {
  comment: PetComment;
  busy: string;
  onDelete: () => void | Promise<void>;
  onReact: (reaction: string) => void | Promise<void>;
}) {
  return (
    <section className="petComment">
      <header className="petCommentMeta">
        <div>
          <strong>{comment.authorName}</strong>
          <span>{formatDate(comment.createdAt)}</span>
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
              <span aria-hidden="true">{reaction.glyph}</span>
              {count ? <strong>{formatMetric(count)}</strong> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
