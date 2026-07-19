import { UploadPage, YourUploads } from "../../uploads/UploadPages";
import type { AppRoutesProps } from "../AppRoutes.types";

export function MineRoute({
  user,
  minePets,
  mineLoading,
  deletingPetId,
  deleteStatus,
  contentMode,
  openTagEditor,
  openSpriteFixer,
  selectVisibleTag,
  setDownloadPet,
  deleteUpload,
  openAuth
}: AppRoutesProps) {
  return (
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
  );
}

export function UploadRoute({
  user,
  uploadState,
  uploadStatus,
  uploadBusy,
  setUploadState,
  setUploadStatus,
  submitUpload,
  openAuth
}: AppRoutesProps) {
  return (
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
  );
}
