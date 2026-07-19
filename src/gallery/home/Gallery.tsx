import { type CSSProperties, type FormEvent, useEffect, useMemo, useState } from "react";
import { type TagName } from "../../domain/config";
import type { CollectionSummary, ContentMode, GalleryFormat, GalleryMeta, GalleryRecentComment, GallerySort, GalleryView, Pet, PetKind, User } from "../../domain/types";
import { CursorPetPreview, useCursorPreviewAssets, useCursorPreviewMotion, useCursorPreviewSupport } from "../../pets/CursorPreview";
import { PetCard } from "../../pets/PetCard";
import { EmptyState } from "../../ui/EmptyState";
import { Icon } from "../../ui/Icon";
import { ResultBar } from "../../ui/ResultBar";
import { GallerySkeleton } from "../../ui/Skeletons";
import { Spinner } from "../../ui/Spinner";
import { GallerySearch } from "../GalleryControls";
import { DiscussionLeaderboard } from "./DiscussionLeaderboard";
import { DiscussionContextRail } from "./DiscussionRail";
import { GalleryFooterControls, GalleryTopPagination } from "./GalleryPagination";
import { LiveCollectionsStrip } from "./LiveCollectionsStrip";

export function Gallery({
  pets,
  recentComments,
  meta,
  loading,
  query,
  activeTags,
  activeSort,
  activeView,
  activeKind,
  activeFormat,
  contentMode,
  deletingPetId,
  shadowbanBusyOwnerId,
  nsfwBusyId,
  hasCollections,
  collections,
  presenceCounts,
  onQuery,
  onTagToggle,
  onTagsClear,
  onSort,
  onView,
  onKind,
  onFormat,
  onPage,
  onRandomize,
  freshPetCount,
  onFreshPets,
  onSearch,
  user,
  likeBusyId,
  onLike,
  onShare,
  onPlayground,
  onDownload,
  onTagClick,
  onEditTags,
  onManageCollections,
  onCollect,
  onQuickComment,
  onToggleNsfw,
  onShadowbanOwner,
  onDelete,
  onSignIn
}: {
  pets: Pet[];
  recentComments: GalleryRecentComment[];
  meta: GalleryMeta;
  loading: boolean;
  query: string;
  activeTags: string[];
  activeSort: GallerySort;
  activeView: GalleryView;
  activeKind: PetKind;
  activeFormat: GalleryFormat;
  contentMode: ContentMode;
  deletingPetId: string;
  shadowbanBusyOwnerId: string;
  nsfwBusyId: string;
  hasCollections: boolean;
  collections: Array<CollectionSummary>;
  presenceCounts: Map<string, number>;
  onQuery: (value: string) => void;
  onTagToggle: (value: TagName) => void;
  onTagsClear: () => void;
  onSort: (value: GallerySort) => void;
  onView: (value: GalleryView) => void;
  onKind: (value: PetKind) => void;
  onFormat: (value: GalleryFormat) => void;
  onPage: (page: number) => void;
  onRandomize: () => void;
  freshPetCount: number;
  onFreshPets: () => void;
  onSearch: (event: FormEvent) => void;
  user: User | null;
  likeBusyId: string;
  onLike: (pet: Pet) => void;
  onShare: (pet: Pet) => void;
  onPlayground?: (pet: Pet) => void;
  onDownload: (pet: Pet) => void;
  onTagClick: (tag: TagName, sourceTags: string[]) => void;
  onEditTags: (pet: Pet) => void;
  onManageCollections: (pet: Pet) => void;
  onCollect?: (pet: Pet) => void;
  onQuickComment: (pet: Pet) => void;
  onToggleNsfw: (pet: Pet) => void;
  onShadowbanOwner: (pet: Pet) => void;
  onDelete: (pet: Pet) => void;
  onSignIn: () => void;
}) {
  const [previewPet, setPreviewPet] = useState<Pet | null>(null);
  const canCursorPreview = useCursorPreviewSupport();
  const cursorPreviewEnabled = Boolean(previewPet && canCursorPreview);
  const cursorPreviewReady = useCursorPreviewAssets(previewPet, cursorPreviewEnabled);
  const { cursorPoint, cursorStateId, cursorRotationDeg, cursorLookDirectionIndex } = useCursorPreviewMotion(
    cursorPreviewEnabled,
    previewPet?.spriteVersionNumber === 2
  );
  const publicCollectionByPetId = useMemo(() => {
    const byPetId = new Map<string, Pick<CollectionSummary, "slug" | "displayName">>();
    for (const collection of collections) {
      if (collection.ownerId) continue;
      for (const petId of collection.petIds ?? []) {
        if (!byPetId.has(petId)) {
          byPetId.set(petId, { slug: collection.slug, displayName: collection.displayName });
        }
      }
    }
    return byPetId;
  }, [collections]);

  useEffect(() => {
    if (!canCursorPreview) {
      setPreviewPet(null);
    }
  }, [canCursorPreview]);

  return (
    <section className="surface">
      <LiveCollectionsStrip
        collections={collections}
        presenceCounts={presenceCounts}
        signedIn={Boolean(user)}
        onSignIn={onSignIn}
      />
      <GallerySearch
        query={query}
        activeTags={activeTags}
        activeSort={activeSort}
        activeView={activeView}
        activeKind={activeKind}
        activeFormat={activeFormat}
        contentMode={contentMode}
        loading={loading}
        onQuery={onQuery}
        onTagToggle={onTagToggle}
        onTagsClear={onTagsClear}
        onSort={onSort}
        onView={onView}
        onKind={onKind}
        onFormat={onFormat}
        onSubmit={onSearch}
      />
      <div className={`galleryStatusRow ${freshPetCount > 0 ? "hasFresh" : ""}`}>
        <ResultBar meta={meta} loading={loading} />
        {freshPetCount > 0 && (
          <div className="freshPetsNotice" role="status">
            <div>
              <p className="freshPetsEyebrow">
                <span className="freshPetsDot" aria-hidden="true" />
                New upload{freshPetCount === 1 ? "" : "s"}
              </p>
              <p className="freshPetsCopy">
                {freshPetCount} new pet{freshPetCount === 1 ? "" : "s"} ready.
              </p>
            </div>
            <button className="btn btnPrimary" type="button" disabled={loading} onClick={onFreshPets}>
              <Icon name="sparkle" size={13} />
              Show
            </button>
          </div>
        )}
      </div>
      <GalleryTopPagination activeSort={activeSort} meta={meta} loading={loading} onPage={onPage} />
      {activeSort === "discussed" ? (
        <>
          <DiscussionContextRail comments={recentComments} loading={loading} />
          <DiscussionLeaderboard pets={pets} meta={meta} loading={loading} onPage={onPage} />
        </>
      ) : loading ? (
        <GallerySkeleton view={activeView} />
      ) : pets.length ? (
        <div className="galleryResultsShell">
          <div className={`galleryGrid ${activeView}`}>
            {pets.map((pet, index) => (
              <div
                className="revealItem"
                key={pet.id}
                style={{ "--delay": `${Math.min(index, 24) * 40}ms` } as CSSProperties}
              >
                <PetCard
                  pet={pet}
                  view={activeView}
                  user={user}
                  likeBusyId={likeBusyId}
                  deletingPetId={deletingPetId}
                  shadowbanBusyOwnerId={shadowbanBusyOwnerId}
                  nsfwBusyId={nsfwBusyId}
                  contentMode={contentMode}
                  hasCollections={hasCollections}
                  collectionBadge={publicCollectionByPetId.get(pet.id)}
                  onLike={onLike}
                  onShare={onShare}
                  onPlayground={onPlayground}
                  onDownload={onDownload}
                  onTagClick={onTagClick}
                  onEditTags={onEditTags}
                  onManageCollections={onManageCollections}
                  onCollect={onCollect}
                  onQuickComment={onQuickComment}
                  onPreview={canCursorPreview ? (previewTarget) =>
                    setPreviewPet((current) => (current?.id === previewTarget.id ? null : previewTarget))
                  : undefined}
                  previewActive={previewPet?.id === pet.id}
                  onToggleNsfw={onToggleNsfw}
                  onShadowbanOwner={onShadowbanOwner}
                  onDelete={onDelete}
                  onSignIn={onSignIn}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState text="No pets found." />
      )}
      <GalleryFooterControls
        activeSort={activeSort}
        petCount={pets.length}
        meta={meta}
        loading={loading}
        onPage={onPage}
        onRandomize={onRandomize}
      />
      {previewPet && cursorPoint && (
        <div
          className="cursorPetPreview"
          style={
            {
              left: cursorPoint.x,
              top: cursorPoint.y,
              "--cursor-rotation": cursorPreviewReady ? `${cursorRotationDeg}deg` : "0deg"
            } as CSSProperties
          }
          aria-hidden="true"
        >
          {cursorPreviewReady ? (
            <CursorPetPreview pet={previewPet} stateId={cursorStateId} lookDirectionIndex={cursorLookDirectionIndex} />
          ) : (
            <div className="cursorPetLoader">
              <Spinner size={14} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
