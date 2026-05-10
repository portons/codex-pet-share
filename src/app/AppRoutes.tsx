import { Suspense, lazy } from "react";
import { APP_NAME } from "../branding/brand";
import { DetailSkeleton } from "../ui/Skeletons";
import { Spinner } from "../ui/Spinner";
import { PetDetail } from "../pets/PetDetail";
import { LegalPage } from "../legal/LegalPage";
import {
  CollectionDetailPageWithPresence,
  CollectionsPageWithPresence,
  CreatorPage,
  CreatorsLeaderboardPage,
  FavoritesPage,
  GalleryWithPresence
} from "../gallery/GalleryPages";
import { UploadPage, YourUploads } from "../uploads/UploadPages";
import {
  collectionPlayShareUrl,
  collectionShareUrl,
  collectionSocialPreviewUrl,
  creatorCompositeUrl,
  creatorShareUrl
} from "../domain/share";
import type { AppRoutesProps } from "./AppRoutes.types";

const AdminPage = lazy(() =>
  import("../admin/AdminPage").then((module) => ({ default: module.AdminPage }))
);

export function AppRoutes({
  route,
  user,
  session,
  pets,
  galleryMeta,
  loading,
  query,
  activeTags,
  activeSort,
  activeView,
  activeKind,
  contentMode,
  deletingPetId,
  shadowbanBusyOwnerId,
  nsfwBusyId,
  collections,
  userCollections,
  userCollectionsLoading,
  setQuery,
  selectTag,
  clearTags,
  selectSort,
  selectView,
  selectKind,
  selectPage,
  randomizeGallery,
  freshPetCount,
  showFreshPets,
  submitSearch,
  likeBusyId,
  toggleLike,
  setSharingPet,
  setPlaygroundPet,
  setDownloadPet,
  selectVisibleTag,
  openTagEditor,
  openSpriteFixer,
  openCollectionEditor,
  openPetCollector,
  openCollectionCreator,
  openUserCollectionEditor,
  openCollectionPetAdder,
  deleteUserCollection,
  removePetFromUserCollection,
  startUserCollectionRoom,
  togglePetNsfw,
  toggleOwnerShadowban,
  deleteUpload,
  openAuth,
  favoritePets,
  favoritesLoading,
  minePets,
  mineLoading,
  deleteStatus,
  uploadState,
  uploadStatus,
  uploadBusy,
  setUploadState,
  setUploadStatus,
  submitUpload,
  creators,
  creatorsMeta,
  creatorsSort,
  creatorsQuery,
  creatorsLoading,
  collectionsLoading,
  setAuthMode,
  setSharingEntity,
  collectionDetail,
  collectionPets,
  collectionMeta,
  collectionDetailLoading,
  adminCollections,
  adminCollectionsLoading,
  adminCollectionBusySlug,
  adminModerationBusy,
  adminStatus,
  setAdminUserShadowban,
  removeAdminUser,
  createCollection,
  updateCollection,
  deleteCollection,
  creator,
  creatorPets,
  creatorMeta,
  creatorLoading,
  selectCreatorPage,
  selectCreatorsPage,
  selectCreatorsSort,
  selectCreatorsQuery,
  selectCollectionPage,
  detailLoading,
  detailPet,
  morePets
}: AppRoutesProps) {
  return (
    <>
      {route.name === "gallery" && (
        <GalleryWithPresence
          pets={pets}
          meta={galleryMeta}
          loading={loading}
          query={query}
          activeTags={activeTags}
          activeSort={activeSort}
          activeView={activeView}
          activeKind={activeKind}
          contentMode={contentMode}
          deletingPetId={deletingPetId}
          shadowbanBusyOwnerId={shadowbanBusyOwnerId}
          nsfwBusyId={nsfwBusyId}
          hasCollections={collections.length > 0}
          collections={collections}
          session={session}
          onQuery={setQuery}
          onTagToggle={selectTag}
          onTagsClear={clearTags}
          onSort={selectSort}
          onView={selectView}
          onKind={selectKind}
          onPage={selectPage}
          onRandomize={randomizeGallery}
          freshPetCount={freshPetCount}
          onFreshPets={showFreshPets}
          onSearch={submitSearch}
          user={user}
          likeBusyId={likeBusyId}
          onLike={toggleLike}
          onShare={setSharingPet}
          onPlayground={setPlaygroundPet}
          onDownload={setDownloadPet}
          onTagClick={selectVisibleTag}
          onEditTags={openTagEditor}
          onManageCollections={openCollectionEditor}
          onCollect={openPetCollector}
          onToggleNsfw={togglePetNsfw}
          onShadowbanOwner={toggleOwnerShadowban}
          onDelete={deleteUpload}
          onSignIn={openAuth}
        />
      )}

      {route.name === "favorites" && (
        <FavoritesPage
          user={user}
          pets={favoritePets}
          loading={favoritesLoading}
          likeBusyId={likeBusyId}
          deletingPetId={deletingPetId}
          shadowbanBusyOwnerId={shadowbanBusyOwnerId}
          nsfwBusyId={nsfwBusyId}
          contentMode={contentMode}
          hasCollections={collections.length > 0}
          onLike={toggleLike}
          onShare={setSharingPet}
          onPlayground={setPlaygroundPet}
          onDownload={setDownloadPet}
          onTagClick={selectVisibleTag}
          onEditTags={openTagEditor}
          onManageCollections={openCollectionEditor}
          onCollect={openPetCollector}
          onToggleNsfw={togglePetNsfw}
          onShadowbanOwner={toggleOwnerShadowban}
          onDelete={deleteUpload}
          onSignIn={openAuth}
        />
      )}

      {route.name === "mine" && (
        <YourUploads
          user={user}
          pets={minePets}
          loading={mineLoading}
          deletingPetId={deletingPetId}
          deleteStatus={deleteStatus}
          contentMode={contentMode}
          onEditTags={openTagEditor}
          onFixSprites={openSpriteFixer}
          onTagClick={selectVisibleTag}
          onDownload={setDownloadPet}
          onDelete={deleteUpload}
          onSignIn={openAuth}
        />
      )}

      {route.name === "upload" && (
        <UploadPage
          user={user}
          uploadState={uploadState}
          uploadStatus={uploadStatus}
          uploadBusy={uploadBusy}
          setUploadState={setUploadState}
          setUploadStatus={setUploadStatus}
          onSubmit={submitUpload}
          onSignIn={openAuth}
        />
      )}

      {route.name === "creators" && (
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
      )}

      {route.name === "collections" && (
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
      )}

      {route.name === "collection" && (
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
      )}

      {route.name === "admin" && (
        <Suspense fallback={<section className="adminPage"><Spinner size={20} /></section>}>
          <AdminPage
            user={user}
            collections={adminCollections}
            loading={adminCollectionsLoading}
            busySlug={adminCollectionBusySlug}
            moderationBusy={adminModerationBusy}
            status={adminStatus}
            onShadowbanUser={(emailOrId) => setAdminUserShadowban(emailOrId, true)}
            onUnshadowbanUser={(emailOrId) => setAdminUserShadowban(emailOrId, false)}
            onRemoveUser={removeAdminUser}
            onCreateCollection={createCollection}
            onUpdateCollection={updateCollection}
            onDeleteCollection={deleteCollection}
          />
        </Suspense>
      )}

      {route.name === "legal" && <LegalPage page={route.page} />}

      {route.name === "user" && (
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
              imageUrl: creatorCompositeUrl(creator),
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
      )}

      {route.name === "detail" && (
        detailLoading ? (
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
            />
          )
        )
      )}
    </>
  );
}

function collectionPreviewImage(collection: { slug: string; ownerId?: string | null; updatedAt: string }) {
  return collectionSocialPreviewUrl(collection);
}
