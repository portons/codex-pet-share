import { APP_NAME } from "../../branding/brand";
import {
  collectionPlayShareUrl,
  collectionShareUrl,
  collectionSocialPreviewUrl
} from "../../domain/share";
import { CollectionDetailPageWithPresence, CollectionsPageWithPresence } from "../../gallery/GalleryPages";
import type { AppRoutesProps } from "../AppRoutes.types";

export function CollectionsRoute({
  collections,
  userCollections,
  collectionsLoading,
  userCollectionsLoading,
  user,
  session,
  setAuthMode,
  openCollectionCreator,
  openUserCollectionEditor,
  deleteUserCollection,
  startUserCollectionRoom,
  setSharingEntity
}: AppRoutesProps) {
  return (
    <CollectionsPageWithPresence
      collections={collections}
      userCollections={userCollections}
      loading={collectionsLoading}
      userCollectionsLoading={userCollectionsLoading}
      signedIn={!!user}
      session={session}
      onSignIn={() => setAuthMode("login")}
      onCreateCollection={openCollectionCreator}
      onEditCollection={openUserCollectionEditor}
      onDeleteCollection={deleteUserCollection}
      onStartUserCollectionRoom={startUserCollectionRoom}
      onShareCollection={(collection) => {
        const subtitle = `${collection.petCount} ${collection.petCount === 1 ? "pet" : "pets"} · custom collection`;
        setSharingEntity({
          kind: "collection",
          title: collection.displayName,
          subtitle,
          shareUrl: collectionShareUrl(collection),
          imageUrl: collectionPreviewImage(collection),
          shareText: `${collection.displayName} on ${APP_NAME}`,
          ariaLabel: `Share ${collection.displayName}`
        });
      }}
      onShareRoom={(collection) => {
        const subtitle = `${collection.petCount} ${collection.petCount === 1 ? "pet" : "pets"} · permanent playground room`;
        setSharingEntity({
          kind: "collection",
          title: `Playground · ${collection.displayName}`,
          subtitle,
          shareUrl: collectionPlayShareUrl(collection),
          imageUrl: collectionPreviewImage(collection),
          shareText: `Join the ${collection.displayName} playground on ${APP_NAME}`,
          ariaLabel: `Share ${collection.displayName} playground`
        });
      }}
    />
  );
}

export function CollectionRoute({
  collectionDetail,
  collectionPets,
  collectionMeta,
  collectionDetailLoading,
  user,
  session,
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
  openCollectionPetAdder,
  removePetFromUserCollection,
  startUserCollectionRoom,
  togglePetNsfw,
  toggleOwnerShadowban,
  deleteUpload,
  openAuth,
  selectCollectionPage
}: AppRoutesProps) {
  return (
    <CollectionDetailPageWithPresence
      collection={collectionDetail}
      pets={collectionPets}
      meta={collectionMeta}
      loading={collectionDetailLoading}
      user={user}
      session={session}
      likeBusyId={likeBusyId}
      deletingPetId={deletingPetId}
      shadowbanBusyOwnerId={shadowbanBusyOwnerId}
      nsfwBusyId={nsfwBusyId}
      contentMode={contentMode}
      hasCollections={collections.length > 0}
      onLike={toggleLike}
      onShare={setSharingPet}
      onPlayground={setPlaygroundPet}
      onShareCollection={() => {
        if (!collectionDetail) return;
        const subtitle = `${collectionDetail.petCount} ${collectionDetail.petCount === 1 ? "pet" : "pets"} · curated collection`;
        setSharingEntity({
          kind: "collection",
          title: collectionDetail.displayName,
          subtitle,
          shareUrl: collectionShareUrl(collectionDetail),
          imageUrl: collectionSocialPreviewUrl(collectionDetail),
          shareText: `${collectionDetail.displayName} on ${APP_NAME}`,
          ariaLabel: `Share ${collectionDetail.displayName}`
        });
      }}
      onDownload={setDownloadPet}
      onTagClick={selectVisibleTag}
      onEditTags={openTagEditor}
      onManageCollections={openCollectionEditor}
      onCollect={openPetCollector}
      onAddPet={collectionDetail?.editable ? openCollectionPetAdder : undefined}
      onRemoveFromUserCollection={collectionDetail?.editable ? (pet) => removePetFromUserCollection(collectionDetail, pet) : undefined}
      onStartRoom={collectionDetail?.ownerId ? () => startUserCollectionRoom(collectionDetail, collectionPets[0]?.id) : undefined}
      onToggleNsfw={togglePetNsfw}
      onShadowbanOwner={toggleOwnerShadowban}
      onDelete={deleteUpload}
      onSignIn={openAuth}
      onPage={selectCollectionPage}
    />
  );
}

function collectionPreviewImage(collection: { slug: string; ownerId?: string | null; updatedAt: string }) {
  return collectionSocialPreviewUrl(collection);
}
