import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Pet } from "../domain/types";
import { Icon } from "../ui/Icon";
import { Spinner } from "../ui/Spinner";

const maxCommentLength = 280;

export function QuickCommentModal({
  pet,
  busy,
  status,
  onSubmit,
  onClose
}: {
  pet: Pet;
  busy: boolean;
  status: string;
  onSubmit: (body: string) => void | Promise<void>;
  onClose: () => void;
}) {
  const [body, setBody] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const remaining = maxCommentLength - body.length;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const nextBody = body.trim();
    if (!nextBody) return;
    await onSubmit(nextBody);
  }

  return (
    <div
      className="modalBackdrop quickCommentBackdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section className="quickCommentModal" role="dialog" aria-modal="true" aria-label={`Quick comment on ${pet.displayName}`}>
        <div className="modalHeader">
          <div className="modalTitle compact">
            <p className="metaText">Quick comment</p>
            <h2>{pet.displayName}</h2>
          </div>
          <button className="btn btnSm btnGhost modalCloseButton" type="button" onClick={onClose} disabled={busy}>
            <Icon name="close" size={12} />
            Close
          </button>
        </div>
        <div className="quickCommentPet">
          <img src={pet.posterUrl} alt="" width={192} height={208} decoding="async" draggable={false} />
          <div>
            <span className="fieldLabel">Pet</span>
            <a href={`#/pets/${pet.id}`}>{pet.displayName}</a>
            <small>by {pet.ownerName}</small>
          </div>
        </div>
        <form className="quickCommentForm" onSubmit={submit}>
          <label>
            <span className="fieldLabel">Comment</span>
            <textarea
              ref={inputRef}
              className="input quickCommentInput"
              value={body}
              maxLength={maxCommentLength}
              onChange={(event) => setBody(event.target.value)}
              disabled={busy}
              placeholder="Leave a note from the gallery."
            />
          </label>
          <div className="quickCommentFooter">
            <span className={remaining < 24 ? "petCommentLimit warning" : "petCommentLimit"}>{remaining} left</span>
            <button className="btn btnPrimary btnLg" type="submit" disabled={busy || !body.trim()}>
              {busy ? <Spinner size={14} /> : <Icon name="comment" size={14} />}
              {busy ? "Posting" : "Post comment"}
            </button>
          </div>
        </form>
        {status ? <p className="status" role="alert">{status}</p> : null}
      </section>
    </div>
  );
}
