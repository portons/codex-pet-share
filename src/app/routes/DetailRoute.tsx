import { PetDetail } from "../../pets/PetDetail";
import { DetailSkeleton } from "../../ui/Skeletons";
import { EmptyState } from "../../ui/EmptyState";
import type { AppRoutesProps } from "../AppRoutes.types";

export function DetailRoute({
  route,
  detailLoading,
  detailPet,
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
  contentMode,
  collections,
  morePets,
  toggleLike,
  setSharingPet,
  setPlaygroundPet,
  setDownloadPet,
  selectVisibleTag,
  openAuth,
  openTagEditor,
  openSpriteFixer,
  openCollectionEditor,
  openPetCollector,
  togglePetNsfw,
  toggleOwnerShadowban,
  deleteUpload,
  submitComment,
  deleteComment,
  toggleReaction,
  loadComments
}: AppRoutesProps) {
  if (route.name !== "detail") return null;
  if (!detailLoading && !detailPet) {
    return <EmptyState text={`No pet found at "${route.id}". It may have been removed, or the link is off by a character.`} />;
  }
  return detailLoading ? (
    <DetailSkeleton />
  ) : (
    detailPet && (
      <PetDetail
        pet={detailPet}
        user={user}
        likeBusyId={likeBusyId}
        deletingPetId={deletingPetId}
        shadowbanBusyOwnerId={shadowbanBusyOwnerId}
        nsfwBusyId={nsfwBusyId}
        deleteStatus={deleteStatus}
        comments={comments}
        commentsLoading={commentsLoading}
        commentsBusy={commentsBusy}
        commentsStatus={commentsStatus}
        commentsMeta={commentsMeta}
        focusCommentId={route.commentId}
        contentMode={contentMode}
        hasCollections={collections.length > 0}
        morePets={morePets}
        onLike={toggleLike}
        onShare={setSharingPet}
        onPlayground={setPlaygroundPet}
        onDownload={setDownloadPet}
        onTagClick={selectVisibleTag}
        onSignIn={openAuth}
        onEditTags={openTagEditor}
        onFixSprites={openSpriteFixer}
        onManageCollections={openCollectionEditor}
        onCollect={openPetCollector}
        onToggleNsfw={togglePetNsfw}
        onShadowbanOwner={toggleOwnerShadowban}
        onDelete={deleteUpload}
        onSubmitComment={(body) => submitComment(detailPet, body)}
        onDeleteComment={(comment) => deleteComment(detailPet, comment)}
        onReactToComment={(comment, reaction) => toggleReaction(detailPet, comment, reaction)}
        onLoadMoreComments={() => loadComments(detailPet.id, commentsMeta.page + 1)}
      />
    )
  );
}
