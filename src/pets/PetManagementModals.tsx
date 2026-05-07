import { type FormEvent } from "react";
import { type AdminCollection } from "../admin/AdminPage";
import { type TagName } from "../domain/config";
import type { EditablePetKind, Pet } from "../domain/types";
import { EditableKindControls, TagFilters } from "../gallery/GalleryControls";
import { Icon } from "../ui/Icon";
import { Spinner } from "../ui/Spinner";

export function TagEditorModal({
  pet,
  tags,
  kind,
  status,
  busy,
  onKind,
  onToggle,
  onSubmit,
  onClose
}: {
  pet: Pet;
  tags: string[];
  kind: EditablePetKind;
  status: string;
  busy: boolean;
  onKind: (kind: EditablePetKind) => void;
  onToggle: (tag: TagName) => void;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="modalBackdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onClose();
        }
      }}
    >
      <section className="authModal" role="dialog" aria-modal="true" aria-label={`Edit tags for ${pet.displayName}`}>
        <div className="modalHeader">
          <div className="modalTitle compact">
            <p className="metaText">Tags</p>
            <h2>{pet.displayName}</h2>
          </div>
          <button className="btn btnSm btnGhost modalCloseButton" type="button" onClick={onClose} disabled={busy}>
            <Icon name="close" size={12} />
            Close
          </button>
        </div>
        <form className="stackForm" onSubmit={onSubmit}>
          <div className="stackField">
            <span className="fieldLabel">Kind</span>
            <EditableKindControls value={kind} onChange={onKind} />
          </div>
          <div className="stackField">
            <span className="fieldLabel">Tags</span>
            <TagFilters activeTag={tags} onTag={onToggle} />
          </div>
          <button className="btn btnPrimary btnLg" type="submit" disabled={busy}>
            {busy ? <Spinner size={14} /> : <Icon name="tag" size={14} />}
            {busy ? "Saving" : "Save tags"}
          </button>
        </form>
        {status && (
          <p className="status" role="alert">
            {status}
          </p>
        )}
      </section>
    </div>
  );
}

export function PetCollectionsModal({
  pet,
  collections,
  selectedSlugs,
  status,
  busy,
  onToggle,
  onSubmit,
  onClose
}: {
  pet: Pet;
  collections: Array<AdminCollection>;
  selectedSlugs: Array<string>;
  status: string;
  busy: boolean;
  onToggle: (slug: string) => void;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="modalBackdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onClose();
        }
      }}
    >
      <section className="authModal" role="dialog" aria-modal="true" aria-label={`Edit collections for ${pet.displayName}`}>
        <div className="modalHeader">
          <div className="modalTitle compact">
            <p className="metaText">Collections</p>
            <h2>{pet.displayName}</h2>
          </div>
          <button className="btn btnSm btnGhost modalCloseButton" type="button" onClick={onClose} disabled={busy}>
            <Icon name="close" size={12} />
            Close
          </button>
        </div>
        <form className="stackForm" onSubmit={onSubmit}>
          {collections.length ? (
            <div className="collectionCheckboxList">
              {collections.map((collection) => (
                <label className="collectionCheckbox" key={collection.slug}>
                  <input
                    type="checkbox"
                    checked={selectedSlugs.includes(collection.slug)}
                    disabled={busy}
                    onChange={() => onToggle(collection.slug)}
                  />
                  <span>
                    <strong>{collection.displayName}</strong>
                    <small>{collection.slug}</small>
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <section className="emptyState card">
              <p>Create a collection in Admin first.</p>
            </section>
          )}
          <button className="btn btnPrimary btnLg" type="submit" disabled={busy}>
            {busy ? <Spinner size={14} /> : <Icon name="check" size={14} />}
            {busy ? "Saving" : "Save collections"}
          </button>
        </form>
        {status && (
          <p className="status" role="alert">
            {status}
          </p>
        )}
      </section>
    </div>
  );
}
