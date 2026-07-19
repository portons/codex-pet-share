import { trackEvent } from "../../domain/analytics";
import { formatMetric } from "../../domain/format";
import { collectionCodexInstallUrl } from "../../domain/pets";
import type { CollectionSummary } from "../../domain/types";
import { EmptyState } from "../../ui/EmptyState";
import { Icon } from "../../ui/Icon";
import { GallerySkeleton } from "../../ui/Skeletons";
import { CollectionPosterMosaic } from "./CollectionPosterMosaic";

export function UserCollectionsSection({
  collections,
  loading,
  signedIn,
  onCreate,
  onEdit,
  onDelete,
  onStartRoom,
  onShare,
  onSignIn
}: {
  collections: CollectionSummary[];
  loading: boolean;
  signedIn: boolean;
  onCreate: () => void;
  onEdit: (collection: CollectionSummary) => void;
  onDelete: (collection: CollectionSummary) => void;
  onStartRoom: (collection: CollectionSummary) => void;
  onShare: (collection: CollectionSummary) => void;
  onSignIn: () => void;
}) {
  return (
    <section className="userCollectionsBand" aria-label="Your collections">
      <header className="userCollectionsHeader">
        <div>
          <p className="metaText">Your collections</p>
          <h2>Your packs</h2>
          <p className="sectionSubhead">Private to manage, public to share.</p>
        </div>
        <div className="userCollectionsActions">
          {signedIn ? (
            <button className="btn btnPrimary" type="button" onClick={onCreate}>
              <Icon name="package" size={13} />
              New collection
            </button>
          ) : (
            <button className="btn btnPrimary" type="button" onClick={onSignIn}>
              <Icon name="user" size={13} />
              Sign in
            </button>
          )}
        </div>
      </header>
      {!signedIn ? null : loading ? (
        <GallerySkeleton />
      ) : collections.length ? (
        <div className="userCollectionsGrid">
          {collections.map((collection) => (
            <article className="userCollectionCard card pocAmbientBento" key={collection.slug}>
              <div className="userCollectionCardHeader">
                <div>
                  <h3 className="userCollectionCardTitle">{collection.displayName}</h3>
                  <p className="userCollectionCardMeta">
                    {formatMetric(collection.petCount)} {collection.petCount === 1 ? "pet" : "pets"}
                  </p>
                </div>
                <button className="btn btnSm btnGhost" type="button" onClick={() => onEdit(collection)} aria-label={`Edit ${collection.displayName}`}>
                  <Icon name="sheet" size={13} />
                </button>
              </div>
              <a className="userCollectionPreview" href={`#/collections/${collection.slug}`} aria-label={`Open ${collection.displayName}`}>
                {collection.topPets.length ? (
                  <CollectionPosterMosaic collection={collection} compact effect="ambient" />
                ) : (
                  <span className="userCollectionEmptyPreview">empty</span>
                )}
              </a>
              <div className="userCollectionCardActions">
                <a
                  className="btn btnSm btnPrimary userCollectionPrimaryAction"
                  href={collectionCodexInstallUrl(collection)}
                  onClick={() => trackEvent("user_collection_codex_click", { route: "collections", collectionSlug: collection.slug })}
                >
                  <Icon name="terminal" size={13} />
                  Codex
                </a>
                <div className="userCollectionSecondaryActions">
                  <a className="btn btnSm" href={`#/collections/${collection.slug}`}>
                    <Icon name="eye" size={13} />
                    Open
                  </a>
                  <button
                    className="btn btnSm"
                    type="button"
                    disabled={collection.petCount === 0}
                    onClick={() => onStartRoom(collection)}
                  >
                    <Icon name="play" size={11} />
                    Room
                  </button>
                  <button className="btn btnSm" type="button" onClick={() => onShare(collection)}>
                    <Icon name="share" size={13} />
                    Share
                  </button>
                  <button className="btn btnSm btnDanger" type="button" onClick={() => onDelete(collection)}>
                    <Icon name="trash" size={13} />
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState text="No custom collections yet." />
      )}
    </section>
  );
}
