import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { petAnimationRows, type TagName } from "../domain/config";
import type { ContentMode, GalleryMeta, Pet, PetComment, User } from "../domain/types";
import { Spinner } from "../ui/Spinner";
import { CursorPetPreview, useCursorPreviewAssets, useCursorPreviewMotion, useCursorPreviewSupport } from "./CursorPreview";
import { DetailHero } from "./detail/DetailHero";
import { DetailInstallPanel } from "./detail/DetailInstallPanel";
import { DetailMorePets } from "./detail/DetailMorePets";
import { DetailStatesGrid } from "./detail/DetailStatesGrid";
import { PetComments } from "./PetComments";

export function PetDetail({
  pet,
  user,
  likeBusyId,
  deletingPetId,
  shadowbanBusyOwnerId,
  nsfwBusyId,
  deleteStatus,
  comments,
  commentsLoading,
  commentsBusy,
  commentsStatus,
  commentsMeta,
  focusCommentId,
  contentMode,
  hasCollections,
  morePets,
  onLike,
  onShare,
  onPlayground,
  onDownload,
  onTagClick,
  onSignIn,
  onEditTags,
  onFixSprites,
  onManageCollections,
  onCollect,
  onToggleNsfw,
  onShadowbanOwner,
  onDelete,
  onSubmitComment,
  onDeleteComment,
  onReactToComment,
  onLoadMoreComments
}: {
  pet: Pet;
  user: User | null;
  likeBusyId: string;
  deletingPetId: string;
  shadowbanBusyOwnerId: string;
  nsfwBusyId: string;
  deleteStatus: string;
  comments: PetComment[];
  commentsLoading: boolean;
  commentsBusy: string;
  commentsStatus: string;
  commentsMeta: GalleryMeta;
  focusCommentId?: string;
  contentMode: ContentMode;
  hasCollections: boolean;
  morePets: Array<Pet>;
  onLike: (pet: Pet) => void;
  onShare: (pet: Pet) => void;
  onPlayground?: (pet: Pet) => void;
  onDownload: (pet: Pet) => void;
  onTagClick: (tag: TagName, sourceTags: string[]) => void;
  onSignIn: () => void;
  onEditTags: (pet: Pet) => void;
  onFixSprites: (pet: Pet) => void;
  onManageCollections: (pet: Pet) => void;
  onCollect?: (pet: Pet) => void;
  onToggleNsfw: (pet: Pet) => void;
  onShadowbanOwner: (pet: Pet) => void;
  onDelete: (pet: Pet) => void;
  onSubmitComment: (body: string) => Promise<boolean>;
  onDeleteComment: (comment: PetComment) => void | Promise<void>;
  onReactToComment: (comment: PetComment, reaction: string) => void | Promise<void>;
  onLoadMoreComments: () => void | Promise<void>;
}) {
  const [activeStateId, setActiveStateId] = useState("idle");
  const [cursorPreview, setCursorPreview] = useState(false);
  const canCursorPreview = useCursorPreviewSupport();
  const cursorPreviewEnabled = cursorPreview && canCursorPreview;
  const cursorPreviewReady = useCursorPreviewAssets(pet, cursorPreviewEnabled);
  const { cursorPoint, cursorStateId, cursorRotationDeg, cursorLookDirectionIndex } = useCursorPreviewMotion(
    cursorPreviewEnabled,
    pet.spriteVersionNumber === 2
  );
  const animationRows = useMemo(
    () => petAnimationRows(pet.spriteVersionNumber),
    [pet.spriteVersionNumber]
  );
  const activeState = useMemo(
    () => animationRows.find((state) => state.id === activeStateId) || animationRows[0],
    [activeStateId, animationRows]
  );

  useEffect(() => {
    if (!canCursorPreview) {
      setCursorPreview(false);
    }
  }, [canCursorPreview]);

  const canDelete = Boolean(!user?.isAdmin && user?.id && user.id === pet.ownerId);
  const canEditTags = Boolean(!user?.isAdmin && user?.id && user.id === pet.ownerId);
  const canFixSprites = Boolean((user?.isAdmin && pet.ownerId) || (user?.id && user.id === pet.ownerId));
  const hasManagementActions = canEditTags || canFixSprites || canDelete || Boolean(user?.isAdmin);

  return (
    <section className="detailSurface">
      <DetailHero
        pet={pet}
        user={user}
        activeState={activeState}
        animationRows={animationRows}
        onSelectState={setActiveStateId}
        likeBusyId={likeBusyId}
        deletingPetId={deletingPetId}
        shadowbanBusyOwnerId={shadowbanBusyOwnerId}
        nsfwBusyId={nsfwBusyId}
        canCursorPreview={canCursorPreview}
        cursorPreview={cursorPreview}
        canEditTags={canEditTags}
        canFixSprites={canFixSprites}
        canDelete={canDelete}
        hasManagementActions={hasManagementActions}
        onCursorPreviewChange={setCursorPreview}
        onLike={onLike}
        onShare={onShare}
        onPlayground={onPlayground}
        onTagClick={onTagClick}
        onSignIn={onSignIn}
        onEditTags={onEditTags}
        onFixSprites={onFixSprites}
        onManageCollections={onManageCollections}
        onCollect={onCollect}
        onToggleNsfw={onToggleNsfw}
        onShadowbanOwner={onShadowbanOwner}
        onDelete={onDelete}
      />

      <DetailInstallPanel pet={pet} user={user} />

      <DetailStatesGrid
        pet={pet}
        activeState={activeState}
        canFixSprites={canFixSprites}
        onFixSprites={onFixSprites}
      />

      <PetComments
        pet={pet}
        user={user}
        comments={comments}
        total={commentsMeta.total}
        totalPages={commentsMeta.totalPages}
        page={commentsMeta.page}
        loading={commentsLoading}
        busy={commentsBusy}
        status={commentsStatus}
        focusCommentId={focusCommentId}
        onSubmit={onSubmitComment}
        onDelete={onDeleteComment}
        onReact={onReactToComment}
        onLoadMore={onLoadMoreComments}
        onSignIn={onSignIn}
      />

      {Boolean(deleteStatus) && (
        <div className="detailAdminBar">
          {canDelete && deleteStatus && (
            <p className="status" role="alert">
              {deleteStatus}
            </p>
          )}
        </div>
      )}

      <DetailMorePets
        morePets={morePets}
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

      {cursorPreview && cursorPoint && (
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
            <CursorPetPreview pet={pet} stateId={cursorStateId} lookDirectionIndex={cursorLookDirectionIndex} />
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
