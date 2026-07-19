import { APP_NAME } from "../../branding/brand";
import { creatorCompositeUrl, creatorShareUrl } from "../../domain/share";
import { CreatorPage, CreatorsLeaderboardPage } from "../../gallery/GalleryPages";
import type { AppRoutesProps } from "../AppRoutes.types";

export function CreatorsRoute({
  creators,
  creatorsMeta,
  creatorsSort,
  creatorsQuery,
  creatorsLoading,
  selectCreatorsSort,
  selectCreatorsQuery,
  selectCreatorsPage
}: AppRoutesProps) {
  return (
    <CreatorsLeaderboardPage
      creators={creators}
      meta={creatorsMeta}
      mode={creatorsSort}
      query={creatorsQuery}
      loading={creatorsLoading}
      onMode={selectCreatorsSort}
      onQuery={selectCreatorsQuery}
      onPage={selectCreatorsPage}
    />
  );
}

export function CreatorRoute({
  creator,
  creatorPets,
  creatorMeta,
  creatorLoading,
  user,
  likeBusyId,
  deletingPetId,
  shadowbanBusyOwnerId,
  nsfwBusyId,
  contentMode,
  collections,
  toggleLike,
  setSharingPet,
  setPlaygroundPet,
  setSharingEntity,
  setDownloadPet,
  selectVisibleTag,
  openTagEditor,
  openCollectionEditor,
  openPetCollector,
  togglePetNsfw,
  toggleOwnerShadowban,
  deleteUpload,
  openAuth,
  selectCreatorPage
}: AppRoutesProps) {
  return (
    <CreatorPage
      creator={creator}
      pets={creatorPets}
      meta={creatorMeta}
      loading={creatorLoading}
      user={user}
      likeBusyId={likeBusyId}
      deletingPetId={deletingPetId}
      shadowbanBusyOwnerId={shadowbanBusyOwnerId}
      nsfwBusyId={nsfwBusyId}
      contentMode={contentMode}
      hasCollections={collections.length > 0}
      onLike={toggleLike}
      onShare={setSharingPet}
      onPlayground={setPlaygroundPet}
      onShareCreator={() => {
        if (!creator) return;
        const petCount = creatorMeta.total || creatorPets.length;
        const subtitle = `${petCount} ${petCount === 1 ? "pet" : "pets"} on ${APP_NAME}`;
        setSharingEntity({
          kind: "creator",
          title: creator.displayName,
          subtitle,
          shareUrl: creatorShareUrl(creator),
          imageUrl: creatorCompositeUrl(creator, creatorPets, petCount),
          shareText: `${creator.displayName} on ${APP_NAME}`,
          ariaLabel: `Share ${creator.displayName}`
        });
      }}
      onDownload={setDownloadPet}
      onTagClick={selectVisibleTag}
      onEditTags={openTagEditor}
      onManageCollections={openCollectionEditor}
      onCollect={openPetCollector}
      onToggleNsfw={togglePetNsfw}
      onShadowbanOwner={toggleOwnerShadowban}
      onDelete={deleteUpload}
      onSignIn={openAuth}
      onPage={selectCreatorPage}
    />
  );
}
