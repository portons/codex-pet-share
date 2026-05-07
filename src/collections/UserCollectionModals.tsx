import { type FormEvent } from "react";
import type { CollectionSummary, Pet } from "../domain/types";
import { CyclingPetPreview } from "../pets/PetPreview";
import { Icon } from "../ui/Icon";
import { Spinner } from "../ui/Spinner";

type CollectionEditorState = {
  mode: "create" | "edit";
  collection: CollectionSummary | null;
  displayName: string;
};

export function UserCollectionEditorModal({
  editor,
  status,
  busy,
  onDisplayName,
  onSubmit,
  onClose
}: {
  editor: CollectionEditorState;
  status: string;
  busy: boolean;
  onDisplayName: (displayName: string) => void;
  onSubmit: (event: FormEvent) => void | Promise<void>;
  onClose: () => void;
}) {
  const title = editor.mode === "create" ? "New collection" : editor.collection?.displayName || "Edit collection";
  return (
    <div
      className="modalBackdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section className="authModal userCollectionModal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modalHeader">
          <div className="modalTitle compact">
            <p className="metaText">Collection</p>
            <h2>{title}</h2>
          </div>
          <button className="btn btnSm btnGhost modalCloseButton" type="button" onClick={onClose} disabled={busy}>
            <Icon name="close" size={12} />
            Close
          </button>
        </div>
        <form className="stackForm" onSubmit={onSubmit}>
          <label className="stackField">
            <span className="fieldLabel">Name</span>
            <input
              value={editor.displayName}
              onChange={(event) => onDisplayName(event.target.value)}
              maxLength={80}
              autoFocus
            />
          </label>
          {editor.collection?.topPets.length ? (
            <div className="userCollectionPreviewStrip" aria-label="Collection preview">
              {editor.collection.topPets.map((pet) => (
                <span className="userCollectionPreviewSlot" key={pet.id}>
                  <CyclingPetPreview pet={pet} size="thumb" transparent />
                </span>
              ))}
            </div>
          ) : null}
          <button className="btn btnPrimary btnLg" type="submit" disabled={busy}>
            {busy ? <Spinner size={14} /> : <Icon name="check" size={14} />}
            {busy ? "Saving" : editor.mode === "create" ? "Create collection" : "Save collection"}
          </button>
        </form>
        {status && <p className="status" role="alert">{status}</p>}
      </section>
    </div>
  );
}

export function PetCollectorModal({
  pet,
  collections,
  selectedSlugs,
  newName,
  status,
  busy,
  onToggle,
  onNewName,
  onSubmit,
  onClose
}: {
  pet: Pet;
  collections: CollectionSummary[];
  selectedSlugs: string[];
  newName: string;
  status: string;
  busy: boolean;
  onToggle: (slug: string) => void;
  onNewName: (name: string) => void;
  onSubmit: (event: FormEvent) => void | Promise<void>;
  onClose: () => void;
}) {
  return (
    <div
      className="modalBackdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section className="authModal userCollectionModal" role="dialog" aria-modal="true" aria-label={`Save ${pet.displayName} to collections`}>
        <div className="modalHeader">
          <div className="modalTitle compact">
            <p className="metaText">Save pet</p>
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
                    <small>{collection.petCount} {collection.petCount === 1 ? "pet" : "pets"}</small>
                  </span>
                </label>
              ))}
            </div>
          ) : null}
          <label className="stackField">
            <span className="fieldLabel">New collection</span>
            <input
              value={newName}
              onChange={(event) => onNewName(event.target.value)}
              placeholder="Optional"
              maxLength={80}
            />
          </label>
          <button className="btn btnPrimary btnLg" type="submit" disabled={busy}>
            {busy ? <Spinner size={14} /> : <Icon name="package" size={14} />}
            {busy ? "Saving" : "Save to collections"}
          </button>
        </form>
        {status && <p className="status" role="alert">{status}</p>}
      </section>
    </div>
  );
}
