import { type FormEvent } from "react";
import { formatMetric } from "../domain/format";
import type { CollectionSummary, Pet } from "../domain/types";
import { CyclingPetPreview } from "../pets/PetPreview";
import { Icon } from "../ui/Icon";
import { Spinner } from "../ui/Spinner";
import type { CollectionPetAdderState } from "./useUserCollections";

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
  const requiresNewCollection = collections.length === 0;
  return (
    <div
      className="modalBackdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section className="authModal userCollectionModal" role="dialog" aria-modal="true" aria-label={`Add ${pet.displayName} to a collection`}>
        <div className="modalHeader">
          <div className="modalTitle compact">
            <p className="metaText">{pet.displayName}</p>
            <h2>Add to collection</h2>
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
            <span className="fieldLabel">{requiresNewCollection ? "Collection name" : "New collection"}</span>
            <input
              value={newName}
              onChange={(event) => onNewName(event.target.value)}
              placeholder={requiresNewCollection ? "Name a new collection" : "Optional"}
              maxLength={80}
              autoFocus={requiresNewCollection}
            />
          </label>
          <button className="btn btnPrimary btnLg" type="submit" disabled={busy}>
            {busy ? <Spinner size={14} /> : <Icon name="package" size={14} />}
            {busy ? "Saving" : requiresNewCollection ? "Create and add" : "Add to collection"}
          </button>
        </form>
        {status && <p className="status" role="alert">{status}</p>}
      </section>
    </div>
  );
}

export function CollectionPetAdderModal({
  adder,
  status,
  loading,
  busyPetId,
  onQuery,
  onSearch,
  onAdd,
  onClose
}: {
  adder: CollectionPetAdderState;
  status: string;
  loading: boolean;
  busyPetId: string;
  onQuery: (query: string) => void;
  onSearch: (event: FormEvent) => void | Promise<void>;
  onAdd: (pet: Pet) => void | Promise<void>;
  onClose: () => void;
}) {
  const petIds = adder.collection.petIds || [];
  const busy = loading || Boolean(busyPetId);
  return (
    <div
      className="modalBackdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section className="authModal userCollectionModal collectionPetAdderModal" role="dialog" aria-modal="true" aria-label={`Add pet to ${adder.collection.displayName}`}>
        <div className="modalHeader">
          <div className="modalTitle compact">
            <p className="metaText">{adder.collection.displayName}</p>
            <h2>Add pet</h2>
          </div>
          <button className="btn btnSm btnGhost modalCloseButton" type="button" onClick={onClose} disabled={busy}>
            <Icon name="close" size={12} />
            Close
          </button>
        </div>
        <form className="petSwapSearchWrap collectionPetAdderSearch" onSubmit={onSearch}>
          <span className="petSwapSearchPrefix" aria-hidden="true">›</span>
          <input
            type="search"
            className="petSwapSearch"
            placeholder="search all pets…"
            value={adder.query}
            onChange={(event) => onQuery(event.target.value)}
            autoFocus
            autoComplete="off"
            spellCheck={false}
          />
          <button className="btn btnSm btnPrimary collectionPetAdderSearchButton" type="submit" disabled={loading}>
            {loading ? <Spinner size={13} /> : <Icon name="search" size={13} />}
            Search
          </button>
        </form>
        <div className="petSwapMenuHeader collectionPetAdderResultsHeader">
          <p className="petSwapMenuLabel">
            <span className="petSwapMenuLabelDot" aria-hidden="true" />
            Results
          </p>
          <span className="petSwapMenuCount">
            {adder.searched ? `${formatMetric(adder.results.length)} / ${formatMetric(adder.total)}` : "Search pets"}
          </span>
        </div>
        {!adder.searched && (
          <div className="petSwapEmpty" role="status">
            <span className="petSwapEmptyMark" aria-hidden="true">·_·</span>
            <p>Search all pets, then pick one to add.</p>
          </div>
        )}
        {adder.searched && adder.results.length === 0 && (
          <div className="petSwapEmpty" role="status">
            <span className="petSwapEmptyMark" aria-hidden="true">·_·</span>
            <p>No matches.</p>
          </div>
        )}
        {adder.results.length > 0 && (
          <div className="petSwapGrid collectionPetAdderGrid">
            {adder.results.map((pet) => {
              const alreadyAdded = petIds.includes(pet.id);
              const petBusy = busyPetId === pet.id;
              return (
                <button
                  key={pet.id}
                  type="button"
                  className="petSwapTile"
                  disabled={loading || Boolean(busyPetId) || alreadyAdded}
                  data-active={alreadyAdded || undefined}
                  aria-label={alreadyAdded ? `${pet.displayName} is already in this collection` : `Add ${pet.displayName}`}
                  title={alreadyAdded ? "Already in collection" : pet.displayName}
                  onClick={() => onAdd(pet)}
                >
                  <span className="petSwapTileFrame">
                    <span
                      className="petSwapTileSprite"
                      style={{ backgroundImage: `url(${pet.spritesheetUrl})` }}
                    />
                  </span>
                  <span className="petSwapTileName">{petBusy ? "Adding" : pet.displayName}</span>
                </button>
              );
            })}
          </div>
        )}
        {status && <p className="status" role="alert">{status}</p>}
      </section>
    </div>
  );
}
