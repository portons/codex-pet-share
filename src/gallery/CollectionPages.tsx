import { type CSSProperties, useState } from "react";
import { APP_HANDLE } from "../branding/brand";
import { type TagName } from "../domain/config";
import { formatMetric } from "../domain/format";
import type { AuthSession, CollectionSummary, ContentMode, Pet, User } from "../domain/types";
import { useCollectionPresenceCounts } from "../realtime/useCollectionPresenceCounts";
import { PetCard } from "../pets/PetCard";
import { CyclingPetPreview } from "../pets/PetPreview";
import { copyText } from "../ui/clipboard";
import { EmptyState } from "../ui/EmptyState";
import { Icon } from "../ui/Icon";
import { GallerySkeleton } from "../ui/Skeletons";

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
  loading,
  signedIn,
  session,
  onShareRoom,
  onSignIn
}: {
  collections: Array<CollectionSummary>;
  loading: boolean;
  signedIn: boolean;
  session: AuthSession | null;
  onShareRoom: (collection: CollectionSummary) => void;
  onSignIn: () => void;
}) {
  const slugs = collections.map((c) => c.slug);
  const presenceCounts = useCollectionPresenceCounts(slugs, session);
  return (
    <CollectionsPage
      collections={collections}
      loading={loading}
      signedIn={signedIn}
      presenceCounts={presenceCounts}
      onShareRoom={onShareRoom}
      onSignIn={onSignIn}
    />
  );
}

function CollectionsPage({
  collections,
  loading,
  signedIn,
  presenceCounts,
  onShareRoom,
  onSignIn
}: {
  collections: Array<CollectionSummary>;
  loading: boolean;
  signedIn: boolean;
  // One-shot snapshot of "people in the room" per slug at page-load
  // time. Empty when the user is signed out (private:true topics need
  // an authed websocket). Not live — refreshes only on remount.
  presenceCounts: Map<string, number>;
  // The card "Share" button shares the playground room URL — that link
  // doubles as a way to find the collection itself, so a separate
  // collection-share action would just clutter the footer. Collection-
  // page share remains accessible from the detail page header.
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

function CollectionDetailPage({
  collection,
  pets,
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
  onToggleNsfw,
  onShadowbanOwner,
  onDelete,
  onSignIn
}: {
  collection: Omit<CollectionSummary, "topPets"> | null;
  pets: Array<Pet>;
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
  onToggleNsfw: (pet: Pet) => void;
  onShadowbanOwner: (pet: Pet) => void;
  onDelete: (pet: Pet) => void;
  onSignIn: () => void;
}) {
  const [copiedCommand, setCopiedCommand] = useState(false);
  const collectionCommand = collection ? `npx ${APP_HANDLE} add-collection ${collection.slug}` : "";

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
            <section className="collectionCommand card" aria-label="Collection install command">
              <p className="commandHelperText">Add every pet in this collection.</p>
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
              <button className="btn btnSm btnGhost" type="button" onClick={onShareCollection} aria-label={`Share ${collection.displayName}`}>
                <Icon name="share" size={13} />
                Share
              </button>
              <a
                className="btn btnSm btnPrimary collectionCardPlay"
                href={`#/collections/${collection.slug}/play`}
                aria-label={`Join ${collection.displayName} playground`}
              >
                <Icon name="play" size={11} />
                Join
              </a>
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
    </section>
  );
}
