import { FormEvent, useEffect, useState } from "react";
import type { User } from "../domain/types";

export type AdminCollection = {
  slug: string;
  displayName: string;
  petIds: Array<string>;
};

export type CollectionDraft = {
  slug: string;
  displayName: string;
};

function collectionDraft(collection?: AdminCollection): CollectionDraft {
  return {
    slug: collection?.slug || "",
    displayName: collection?.displayName || ""
  };
}

export function AdminPage({
  user,
  collections,
  loading,
  busySlug,
  moderationBusy,
  status,
  onShadowbanUser,
  onUnshadowbanUser,
  onRemoveUser,
  onCreateCollection,
  onUpdateCollection,
  onDeleteCollection
}: {
  user: User | null;
  collections: Array<AdminCollection>;
  loading: boolean;
  busySlug: string;
  moderationBusy: boolean;
  status: string;
  onShadowbanUser: (emailOrId: string) => void;
  onUnshadowbanUser: (emailOrId: string) => void;
  onRemoveUser: (emailOrId: string) => void;
  onCreateCollection: (draft: CollectionDraft) => void;
  onUpdateCollection: (slug: string, draft: CollectionDraft) => void;
  onDeleteCollection: (collection: AdminCollection) => void;
}) {
  const [newDraft, setNewDraft] = useState<CollectionDraft>(collectionDraft());
  const [drafts, setDrafts] = useState<Record<string, CollectionDraft>>({});
  const [emailOrId, setEmailOrId] = useState("");

  useEffect(() => {
    setDrafts(Object.fromEntries(collections.map((collection) => [collection.slug, collectionDraft(collection)])));
  }, [collections]);

  if (!user?.isAdmin) {
    return (
      <section className="surface">
        <section className="emptyState card">
          <p>Admin access required.</p>
        </section>
      </section>
    );
  }

  function submitNewCollection(event: FormEvent) {
    event.preventDefault();
    onCreateCollection(newDraft);
    setNewDraft(collectionDraft());
  }

  function submitRemoveUser(event: FormEvent) {
    event.preventDefault();
    onRemoveUser(emailOrId);
  }

  return (
    <section className="surface adminPage">
      <header className="sectionHeader">
        <div>
          <p className="metaText">Admin</p>
          <h1>Admin</h1>
        </div>
      </header>
      <section className="adminSection">
        <header className="adminSectionHeader">
          <h2>User moderation</h2>
        </header>
        <form className="adminCollectionForm card" onSubmit={submitRemoveUser}>
          <label>
            <span className="fieldLabel">Email or user id</span>
            <input
              autoFocus
              className="input"
              value={emailOrId}
              onChange={(event) => setEmailOrId(event.target.value)}
              type="text"
              disabled={moderationBusy}
              required
            />
          </label>
          <div className="adminActions">
            <button className="btn btnDanger btnLg" type="button" disabled={moderationBusy} onClick={() => onShadowbanUser(emailOrId)}>
              {moderationBusy ? "Saving" : "Shadowban"}
            </button>
            <button className="btn btnLg" type="button" disabled={moderationBusy} onClick={() => onUnshadowbanUser(emailOrId)}>
              Unshadowban
            </button>
            <button className="btn btnDanger btnLg" type="submit" disabled={moderationBusy}>
              Remove user
            </button>
          </div>
        </form>
      </section>
      <section className="adminSection">
        <header className="adminSectionHeader">
          <h2>Collections</h2>
        </header>
      <form className="adminCollectionForm card" onSubmit={submitNewCollection}>
        <label>
          <span className="fieldLabel">Display name</span>
          <input
            className="input"
            value={newDraft.displayName}
            onChange={(event) => setNewDraft((current) => ({ ...current, displayName: event.target.value }))}
            required
          />
        </label>
        <label>
          <span className="fieldLabel">Slug</span>
          <input
            className="input"
            value={newDraft.slug}
            onChange={(event) => setNewDraft((current) => ({ ...current, slug: event.target.value }))}
            required
          />
        </label>
        <button className="btn btnPrimary btnLg" type="submit" disabled={Boolean(busySlug)}>
          Create collection
        </button>
      </form>
      {loading ? (
        <section className="emptyState card">
          <p>Loading collections.</p>
        </section>
      ) : collections.length ? (
        <div className="adminCollectionList">
          {collections.map((collection) => {
            const draft = drafts[collection.slug] || collectionDraft(collection);
            const busy = busySlug === collection.slug;
            return (
              <form
                className="adminCollectionForm card"
                key={collection.slug}
                onSubmit={(event) => {
                  event.preventDefault();
                  onUpdateCollection(collection.slug, draft);
                }}
              >
                <label>
                  <span className="fieldLabel">Display name</span>
                  <input
                    className="input"
                    value={draft.displayName}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [collection.slug]: { ...draft, displayName: event.target.value }
                      }))
                    }
                    disabled={busy}
                    required
                  />
                </label>
                <label>
                  <span className="fieldLabel">Slug</span>
                  <input
                    className="input"
                    value={draft.slug}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [collection.slug]: { ...draft, slug: event.target.value }
                      }))
                    }
                    disabled={busy}
                    required
                  />
                </label>
                <div className="rowActions">
                  <button className="btn btnPrimary" type="submit" disabled={busy}>
                    {busy ? "Saving" : "Save"}
                  </button>
                  <button className="btn btnDanger" type="button" disabled={Boolean(busySlug)} onClick={() => onDeleteCollection(collection)}>
                    Delete
                  </button>
                </div>
              </form>
            );
          })}
        </div>
      ) : (
        <section className="emptyState card">
          <p>No collections yet.</p>
        </section>
      )}
      </section>
      {status && (
        <p className="status" role="alert">
          {status}
        </p>
      )}
    </section>
  );
}
