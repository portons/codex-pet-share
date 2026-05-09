import { type CSSProperties, useState } from "react";
import { type TagName } from "../domain/config";
import { formatMetric } from "../domain/format";
import { collectionCodexInstallUrl, collectionImportCommand } from "../domain/pets";
import type { AuthSession, CollectionSummary, ContentMode, GalleryMeta, Pet, User } from "../domain/types";
import { useCollectionPresenceCounts } from "../realtime/useCollectionPresenceCounts";
import { PetCard } from "../pets/PetCard";
import { CyclingPetPreview } from "../pets/PetPreview";
import { copyText } from "../ui/clipboard";
import { EmptyState } from "../ui/EmptyState";
import { Icon } from "../ui/Icon";
import { GallerySkeleton } from "../ui/Skeletons";
import { PaginationControls } from "./PaginationControls";

export function CollectionDetailPageWithPresence({
  collection,
  session,
  ...rest
}: Omit<Parameters<typeof CollectionDetailPage>[0], "presenceCount"> & { session: AuthSession | null }) {
  // Memoise the slug list so the hook doesn't tear down + rebuild the
  // channel on every parent re-render.
  const slugs = collection?.slug ? [collection.slug] : [];
  const counts = useCollectionPresenceCounts(slugs, session);
  const count = collection?.slug ? counts.get(collection.slug) : undefined;
  return (
    <CollectionDetailPage
      collection={collection}
      presenceCount={count}
      {...rest}
    />
  );
}

// Thin wrapper that fires the one-shot presence-count hook only while
// the Collections route is mounted. Keeping the hook out of the main
// App component avoids running 30+ ephemeral channel subscriptions on
// every other page.
export function CollectionsPageWithPresence({
  collections,
  userCollections,
  loading,
  userCollectionsLoading,
  signedIn,
  session,
  onCreateCollection,
  onEditCollection,
  onDeleteCollection,
  onStartUserCollectionRoom,
  onShareCollection,
  onShareRoom,
  onSignIn
}: {
  collections: Array<CollectionSummary>;
  userCollections: Array<CollectionSummary>;
  loading: boolean;
  userCollectionsLoading: boolean;
  signedIn: boolean;
  session: AuthSession | null;
  onCreateCollection: () => void;
  onEditCollection: (collection: CollectionSummary) => void;
  onDeleteCollection: (collection: CollectionSummary) => void;
  onStartUserCollectionRoom: (collection: CollectionSummary) => void;
  onShareCollection: (collection: CollectionSummary) => void;
  onShareRoom: (collection: CollectionSummary) => void;
  onSignIn: () => void;
}) {
  const slugs = collections.map((c) => c.slug);
  const presenceCounts = useCollectionPresenceCounts(slugs, session);
  return (
    <CollectionsPage
      collections={collections}
      userCollections={userCollections}
      loading={loading}
      userCollectionsLoading={userCollectionsLoading}
      signedIn={signedIn}
      presenceCounts={presenceCounts}
      onCreateCollection={onCreateCollection}
      onEditCollection={onEditCollection}
      onDeleteCollection={onDeleteCollection}
      onStartUserCollectionRoom={onStartUserCollectionRoom}
      onShareCollection={onShareCollection}
      onShareRoom={onShareRoom}
      onSignIn={onSignIn}
    />
  );
}

function CollectionsPage({
  collections,
  userCollections,
  loading,
  userCollectionsLoading,
  signedIn,
  presenceCounts,
  onCreateCollection,
  onEditCollection,
  onDeleteCollection,
  onStartUserCollectionRoom,
  onShareCollection,
  onShareRoom,
  onSignIn
}: {
  collections: Array<CollectionSummary>;
  userCollections: Array<CollectionSummary>;
  loading: boolean;
  userCollectionsLoading: boolean;
  signedIn: boolean;
  // One-shot snapshot of "people in the room" per slug at page-load
  // time. Empty when the user is signed out (private:true topics need
  // an authed websocket). Not live — refreshes only on remount.
  presenceCounts: Map<string, number>;
  // The card "Share" button shares the playground room URL — that link
  // doubles as a way to find the collection itself, so a separate
  // collection-share action would just clutter the footer. Collection-
  // page share remains accessible from the detail page header.
  onCreateCollection: () => void;
  onEditCollection: (collection: CollectionSummary) => void;
  onDeleteCollection: (collection: CollectionSummary) => void;
  onStartUserCollectionRoom: (collection: CollectionSummary) => void;
  onShareCollection: (collection: CollectionSummary) => void;
  onShareRoom: (collection: CollectionSummary) => void;
  onSignIn: () => void;
}) {
  return (
    <section className="surface">
      <header className="sectionHeader">
        <div>
          <p className="metaText">Collections</p>
          <h1>Pet collections</h1>
          <p className="sectionSubhead">Curated packs you can browse, share, or jump into a permanent playground room with.</p>
        </div>
      </header>
      <UserCollectionsSection
        collections={userCollections}
        loading={userCollectionsLoading}
        signedIn={signedIn}
        onCreate={onCreateCollection}
        onEdit={onEditCollection}
        onDelete={onDeleteCollection}
        onStartRoom={onStartUserCollectionRoom}
        onShare={onShareCollection}
        onSignIn={onSignIn}
      />
      {loading ? (
        <GallerySkeleton />
      ) : collections.length ? (
        <div className="collectionsGrid">
          {collections.map((collection) => {
            const liveCount = presenceCounts.get(collection.slug);
            return (
            <article className="collectionCard card" key={collection.slug}>
              {liveCount != null && liveCount > 0 && (
                signedIn ? (
                  <a
                    className="collectionCardLive collectionCardLiveOverlay"
                    href={`#/collections/${collection.slug}/play`}
                    title={`Join ${collection.displayName} playground (${liveCount} ${liveCount === 1 ? "person" : "people"} live)`}
                    aria-label={`Join ${collection.displayName} playground · ${liveCount} live`}
                  >
                    <span className="collectionCardLiveDot" aria-hidden="true" />
                    {liveCount} live
                  </a>
                ) : (
                  <button
                    type="button"
                    className="collectionCardLive collectionCardLiveOverlay"
                    onClick={onSignIn}
                    title={`Sign in to join (${liveCount} ${liveCount === 1 ? "person" : "people"} live)`}
                    aria-label={`Sign in to join · ${liveCount} live`}
                  >
                    <span className="collectionCardLiveDot" aria-hidden="true" />
                    {liveCount} live
                  </button>
                )
              )}
              <a
                className="collectionCardBody"
                href={`#/collections/${collection.slug}`}
                aria-label={`Open ${collection.displayName}`}
              >
                <div className="collectionPreviewStack">
                  {collection.topPets.map((pet) => (
                    <CyclingPetPreview key={pet.id} pet={pet} size="thumb" transparent />
                  ))}
                </div>
                <h2 className="collectionCardTitle">{collection.displayName}</h2>
              </a>
              <footer className="collectionCardFooter">
                <p className="collectionCardMeta">
                  {formatMetric(collection.petCount)} {collection.petCount === 1 ? "pet" : "pets"}
                </p>
                <div className="collectionCardActions">
                  <button
                    className="btn btnSm btnGhost collectionCardShare"
                    type="button"
                    onClick={() => onShareRoom(collection)}
                    aria-label={`Share ${collection.displayName} playground`}
                    title="Share playground"
                  >
                    <Icon name="share" size={13} />
                    Share
                  </button>
                  {signedIn ? (
                    <a
                      className="btn btnSm btnPrimary collectionCardPlay"
                      href={`#/collections/${collection.slug}/play`}
                      aria-label={`Join ${collection.displayName} playground`}
                    >
                      <Icon name="play" size={11} />
                      Join
                    </a>
                  ) : (
                    <button
                      className="btn btnSm btnPrimary collectionCardPlay"
                      type="button"
                      onClick={onSignIn}
                      aria-label={`Sign in to join ${collection.displayName} playground`}
                    >
                      <Icon name="play" size={11} />
                      Join
                    </button>
                  )}
                </div>
              </footer>
            </article>
            );
          })}
        </div>
      ) : (
        <EmptyState text="No collections yet." />
      )}
    </section>
  );
}

function UserCollectionsSection({
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
          <h2>Custom packs</h2>
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
            <article className="userCollectionCard card" key={collection.slug}>
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
                  <div className="collectionPreviewStack">
                    {collection.topPets.map((pet) => (
                      <CyclingPetPreview key={pet.id} pet={pet} size="thumb" transparent />
                    ))}
                  </div>
                ) : (
                  <span className="userCollectionEmptyPreview">empty</span>
                )}
              </a>
              <div className="userCollectionCardActions">
                <a className="btn btnSm" href={`#/collections/${collection.slug}`}>
                  <Icon name="eye" size={13} />
                  Open
                </a>
                <button className="btn btnSm" type="button" onClick={() => onShare(collection)}>
                  <Icon name="share" size={13} />
                  Share
                </button>
                <button
                  className="btn btnSm btnPrimary"
                  type="button"
                  disabled={collection.petCount === 0}
                  onClick={() => onStartRoom(collection)}
                >
                  <Icon name="play" size={11} />
                  Room
                </button>
                <button className="btn btnSm btnDanger" type="button" onClick={() => onDelete(collection)}>
                  <Icon name="trash" size={13} />
                  Delete
                </button>
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

function CollectionDetailPage({
  collection,
  pets,
  meta,
  loading,
  user,
  likeBusyId,
  deletingPetId,
  shadowbanBusyOwnerId,
  nsfwBusyId,
  contentMode,
  hasCollections,
  presenceCount,
  onLike,
  onShare,
  onPlayground,
  onShareCollection,
  onDownload,
  onTagClick,
  onEditTags,
  onManageCollections,
  onCollect,
  onAddPet,
  onRemoveFromUserCollection,
  onStartRoom,
  onToggleNsfw,
  onShadowbanOwner,
  onDelete,
  onSignIn,
  onPage
}: {
  collection: Omit<CollectionSummary, "topPets"> | null;
  pets: Array<Pet>;
  meta: GalleryMeta;
  loading: boolean;
  user: User | null;
  likeBusyId: string;
  deletingPetId: string;
  shadowbanBusyOwnerId: string;
  nsfwBusyId: string;
  contentMode: ContentMode;
  hasCollections: boolean;
  // One-shot presence count for the room. `undefined` means "not
  // fetched yet"; `0` means "fetched, nobody home". The chip renders
  // only for `count > 0` so the header doesn't feel haunted.
  presenceCount?: number;
  onLike: (pet: Pet) => void;
  onShare: (pet: Pet) => void;
  onPlayground?: (pet: Pet) => void;
  onShareCollection: () => void;
  onDownload: (pet: Pet) => void;
  onTagClick: (tag: TagName, sourceTags: string[]) => void;
  onEditTags: (pet: Pet) => void;
  onManageCollections: (pet: Pet) => void;
  onCollect?: (pet: Pet) => void;
  onAddPet?: (collection: Omit<CollectionSummary, "topPets">) => void;
  onRemoveFromUserCollection?: (pet: Pet) => void;
  onStartRoom?: () => void;
  onToggleNsfw: (pet: Pet) => void;
  onShadowbanOwner: (pet: Pet) => void;
  onDelete: (pet: Pet) => void;
  onSignIn: () => void;
  onPage: (page: number) => void;
}) {
  const [copiedCommand, setCopiedCommand] = useState(false);
  const collectionCommand = collection ? collectionImportCommand(collection) : "";
  const codexInstallUrl = collection ? collectionCodexInstallUrl(collection) : "";

  async function copyCollectionCommand() {
    if (!collectionCommand) return;
    const copied = await copyText(collectionCommand);
    setCopiedCommand(copied);
    window.setTimeout(() => setCopiedCommand(false), 1400);
  }

  return (
    <section className="surface">
      <header className="sectionHeader">
        <div>
          <p className="metaText">Collection</p>
          <h1>{collection?.displayName || "Collection"}</h1>
          {collection && (
            <p className="sectionSubhead collectionDetailSubhead">
              <span>{formatMetric(collection.petCount)} {collection.petCount === 1 ? "pet" : "pets"}</span>
              {presenceCount != null && presenceCount > 0 && (
                <span
                  className="collectionCardLive"
                  data-size="lg"
                  title={`${presenceCount} ${presenceCount === 1 ? "person" : "people"} in the room`}
                >
                  <span className="collectionCardLiveDot" aria-hidden="true" />
                  {presenceCount} live
                </span>
              )}
            </p>
          )}
        </div>
        {collection && (
          <div className="collectionHeaderActions">
            <section className="collectionCommand card" aria-label="Install collection">
              <a className="btn btnPrimary collectionCommandCodex" href={codexInstallUrl}>
                <Icon name="terminal" size={13} />
                Open in Codex
              </a>
              <p className="commandHelperText">Terminal install command</p>
              <div className="terminalCommandLine" aria-label="Command">
                <span aria-hidden="true">$</span>
                <code>{collectionCommand}</code>
              </div>
              <button className="btn btnSm commandCopyButton" type="button" onClick={copyCollectionCommand}>
                <Icon name={copiedCommand ? "check" : "copy"} size={13} />
                {copiedCommand ? "Copied" : "Copy"}
              </button>
            </section>
            <div className="collectionHeaderButtons">
              {collection.editable && onAddPet && (
                <button className="btn btnSm" type="button" onClick={() => onAddPet(collection)} aria-label={`Add pet to ${collection.displayName}`}>
                  <Icon name="package" size={13} />
                  Add pet
                </button>
              )}
              <button className="btn btnSm btnGhost" type="button" onClick={onShareCollection} aria-label={`Share ${collection.displayName}`}>
                <Icon name="share" size={13} />
                Share
              </button>
              {collection.ownerId ? (
                <button
                  className="btn btnSm btnPrimary collectionCardPlay"
                  type="button"
                  disabled={!pets.length}
                  onClick={onStartRoom}
                  aria-label={`Start ${collection.displayName} room`}
                >
                  <Icon name="play" size={11} />
                  Room
                </button>
              ) : (
                <a
                  className="btn btnSm btnPrimary collectionCardPlay"
                  href={`#/collections/${collection.slug}/play`}
                  aria-label={`Join ${collection.displayName} playground`}
                >
                  <Icon name="play" size={11} />
                  Join
                </a>
              )}
            </div>
          </div>
        )}
      </header>
      {loading ? (
        <GallerySkeleton />
      ) : pets.length ? (
        <div className="galleryGrid">
          {pets.map((pet, index) => (
            <div
              className="revealItem"
              key={pet.id}
              style={{ "--delay": `${index * 60}ms` } as CSSProperties}
            >
              <PetCard
                pet={pet}
                user={user}
                likeBusyId={likeBusyId}
                deletingPetId={deletingPetId}
                shadowbanBusyOwnerId={shadowbanBusyOwnerId}
                nsfwBusyId={nsfwBusyId}
                contentMode={contentMode}
                hasCollections={hasCollections}
                onLike={onLike}
                onShare={onShare}
                onPlayground={onPlayground}
                onDownload={onDownload}
                onTagClick={onTagClick}
                onEditTags={onEditTags}
                onManageCollections={onManageCollections}
                onCollect={onCollect}
                onRemoveFromCollection={onRemoveFromUserCollection}
                onToggleNsfw={onToggleNsfw}
                onShadowbanOwner={onShadowbanOwner}
                onDelete={onDelete}
                onSignIn={onSignIn}
              />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState text="No pets in this collection." />
      )}
      <PaginationControls meta={meta} loading={loading} onPage={onPage} />
    </section>
  );
}
