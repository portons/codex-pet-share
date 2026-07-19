import { type CSSProperties, useState } from "react";
import { trackEvent } from "../../domain/analytics";
import { type TagName } from "../../domain/config";
import { formatMetric } from "../../domain/format";
import { collectionCodexInstallUrl, collectionImportCommand } from "../../domain/pets";
import type { AuthSession, CollectionSummary, ContentMode, GalleryMeta, Pet, User } from "../../domain/types";
import { useCollectionPresenceCounts } from "../../realtime/useCollectionPresenceCounts";
import { PetCard } from "../../pets/PetCard";
import { copyText } from "../../ui/clipboard";
import { EmptyState } from "../../ui/EmptyState";
import { Icon } from "../../ui/Icon";
import { GallerySkeleton } from "../../ui/Skeletons";
import { PaginationControls } from "../PaginationControls";

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
    trackEvent("collection_command_copy", { route: "collection", collectionSlug: collection?.slug });
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
              <a
                className="btn btnPrimary collectionCommandCodex"
                href={codexInstallUrl}
                onClick={() => trackEvent("collection_codex_install_click", { route: "collection", collectionSlug: collection.slug })}
              >
                <Icon name="terminal" size={13} />
                Install in Codex
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
