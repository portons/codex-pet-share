import type { Dispatch, FormEvent, SetStateAction } from "react";
import { type AdminCollection } from "../admin/AdminPage";
import { AuthModal, AccountSettingsModal } from "../auth/AuthModals";
import type { ApiKeySummary, AuthMode, AuthProvider } from "../auth/useAuthForms";
import { CollectionPetAdderModal, PetCollectorModal, UserCollectionEditorModal } from "../collections/UserCollectionModals";
import type { CollectionPetAdderState } from "../collections/useUserCollections";
import { QuickCommentModal } from "../comments/QuickCommentModal";
import { DownloadModal } from "../downloads/DownloadModal";
import { PetCollectionsModal, PetDeleteConfirmModal, TagEditorModal } from "../pets/PetManagementModals";
import { SpriteFixerModal } from "../pets/SpriteFixerModal";
import { EntityShareModal, ShareModal } from "../share/ShareModals";
import type { CollectionSummary, ContentMode, EditablePetKind, EntityShareTarget, Pet, User } from "../domain/types";
import type { TagName } from "../domain/config";
import type { PetSpriteEditorOperation } from "../uploads/uploadAssets";

export function AppDialogs({
  user,
  contentMode,
  selectContentMode,
  authOpen,
  authMode,
  selectAuthMode,
  displayName,
  setDisplayName,
  email,
  setEmail,
  password,
  setPassword,
  authStatus,
  authBusy,
  resendBusy,
  authProviders,
  startOAuth,
  resendVerification,
  submitAuth,
  closeAuth,
  settingsOpen,
  settingsDisplayName,
  setSettingsDisplayName,
  settingsCurrentPassword,
  setSettingsCurrentPassword,
  settingsNewPassword,
  setSettingsNewPassword,
  settingsStatus,
  settingsBusy,
  settingsAvatarStatus,
  settingsAvatarBusy,
  settingsAvatarPets,
  settingsAvatarPetsLoading,
  apiKeys,
  apiKeysLoading,
  apiKeyBusy,
  newApiKeyName,
  setNewApiKeyName,
  newApiKeySecret,
  apiKeyStatus,
  loadSettingsAvatarPets,
  createApiKey,
  revokeApiKey,
  submitSettings,
  submitAvatar,
  deleteAccount,
  closeSettings,
  sharingPet,
  setSharingPet,
  quickCommentPet,
  quickCommentStatus,
  quickCommentBusy,
  submitQuickComment,
  closeQuickComment,
  sharingEntity,
  setSharingEntity,
  downloadPet,
  setDownloadPet,
  tagEditorPet,
  tagEditorDisplayName,
  tagEditorDescription,
  tagEditorTags,
  tagEditorKind,
  tagEditorStatus,
  tagEditorBusy,
  setTagEditorDisplayName,
  setTagEditorDescription,
  setTagEditorKind,
  toggleTagEditorTag,
  submitTagEditor,
  closeTagEditor,
  spriteFixerPet,
  spriteFixerStatus,
  spriteFixerBusy,
  submitSpriteFixer,
  closeSpriteFixer,
  collectionEditorPet,
  adminCollections,
  collectionEditorSlugs,
  collectionEditorStatus,
  collectionEditorBusy,
  toggleCollectionEditorSlug,
  submitCollectionEditor,
  closeCollectionEditor,
  deleteConfirmPet,
  deleteStatus,
  deletingPetId,
  confirmDeleteUpload,
  closeDeleteConfirm,
  userCollectionEditor,
  userCollectionEditorStatus,
  userCollectionEditorBusy,
  setUserCollectionEditorDisplayName,
  submitUserCollectionEditor,
  closeUserCollectionEditor,
  collectPet,
  collectSelectedSlugs,
  collectNewName,
  collectStatus,
  collectBusy,
  setCollectNewName,
  toggleCollectSlug,
  submitPetCollector,
  closePetCollector,
  collectionPetAdder,
  collectionPetAdderStatus,
  collectionPetAdderLoading,
  collectionPetAdderBusyId,
  setCollectionPetAdderQuery,
  searchCollectionPetAdder,
  addPetToCollection,
  closeCollectionPetAdder,
  userCollections
}: {
  user: User | null;
  contentMode: ContentMode;
  selectContentMode: (mode: ContentMode) => void | Promise<void>;
  authOpen: boolean;
  authMode: AuthMode;
  selectAuthMode: (next: AuthMode) => void;
  displayName: string;
  setDisplayName: Dispatch<SetStateAction<string>>;
  email: string;
  setEmail: Dispatch<SetStateAction<string>>;
  password: string;
  setPassword: Dispatch<SetStateAction<string>>;
  authStatus: string;
  authBusy: boolean;
  resendBusy: boolean;
  authProviders: AuthProvider[];
  startOAuth: (provider: AuthProvider["id"]) => void | Promise<void>;
  resendVerification: () => void | Promise<void>;
  submitAuth: (event: FormEvent) => void | Promise<void>;
  closeAuth: () => void;
  settingsOpen: boolean;
  settingsDisplayName: string;
  setSettingsDisplayName: Dispatch<SetStateAction<string>>;
  settingsCurrentPassword: string;
  setSettingsCurrentPassword: Dispatch<SetStateAction<string>>;
  settingsNewPassword: string;
  setSettingsNewPassword: Dispatch<SetStateAction<string>>;
  settingsStatus: string;
  settingsBusy: boolean;
  settingsAvatarStatus: string;
  settingsAvatarBusy: boolean;
  settingsAvatarPets: Pet[];
  settingsAvatarPetsLoading: boolean;
  apiKeys: ApiKeySummary[];
  apiKeysLoading: boolean;
  apiKeyBusy: string;
  newApiKeyName: string;
  setNewApiKeyName: Dispatch<SetStateAction<string>>;
  newApiKeySecret: string;
  apiKeyStatus: string;
  loadSettingsAvatarPets: () => void | Promise<void>;
  createApiKey: (event: FormEvent) => void | Promise<void>;
  revokeApiKey: (id: string) => void | Promise<void>;
  submitSettings: (event: FormEvent) => void | Promise<void>;
  submitAvatar: (avatar: Blob) => void | Promise<void>;
  deleteAccount: (deletePets: boolean) => void | Promise<void>;
  closeSettings: () => void;
  sharingPet: Pet | null;
  setSharingPet: Dispatch<SetStateAction<Pet | null>>;
  quickCommentPet: Pet | null;
  quickCommentStatus: string;
  quickCommentBusy: boolean;
  submitQuickComment: (body: string) => void | Promise<void>;
  closeQuickComment: () => void;
  sharingEntity: EntityShareTarget | null;
  setSharingEntity: Dispatch<SetStateAction<EntityShareTarget | null>>;
  downloadPet: Pet | null;
  setDownloadPet: Dispatch<SetStateAction<Pet | null>>;
  tagEditorPet: Pet | null;
  tagEditorDisplayName: string;
  tagEditorDescription: string;
  tagEditorTags: string[];
  tagEditorKind: EditablePetKind;
  tagEditorStatus: string;
  tagEditorBusy: boolean;
  setTagEditorDisplayName: Dispatch<SetStateAction<string>>;
  setTagEditorDescription: Dispatch<SetStateAction<string>>;
  setTagEditorKind: Dispatch<SetStateAction<EditablePetKind>>;
  toggleTagEditorTag: (tag: TagName) => void;
  submitTagEditor: (event: FormEvent) => void | Promise<void>;
  closeTagEditor: () => void;
  spriteFixerPet: Pet | null;
  spriteFixerStatus: string;
  spriteFixerBusy: boolean;
  submitSpriteFixer: (event: FormEvent, operation: PetSpriteEditorOperation) => boolean | Promise<boolean>;
  closeSpriteFixer: () => void;
  collectionEditorPet: Pet | null;
  adminCollections: AdminCollection[];
  collectionEditorSlugs: string[];
  collectionEditorStatus: string;
  collectionEditorBusy: boolean;
  toggleCollectionEditorSlug: (slug: string) => void;
  submitCollectionEditor: (event: FormEvent) => void | Promise<void>;
  closeCollectionEditor: () => void;
  deleteConfirmPet: Pet | null;
  deleteStatus: string;
  deletingPetId: string;
  confirmDeleteUpload: () => void | Promise<void>;
  closeDeleteConfirm: () => void;
  userCollectionEditor: { mode: "create" | "edit"; collection: CollectionSummary | null; displayName: string } | null;
  userCollectionEditorStatus: string;
  userCollectionEditorBusy: boolean;
  setUserCollectionEditorDisplayName: (displayName: string) => void;
  submitUserCollectionEditor: (event: FormEvent) => void | Promise<void>;
  closeUserCollectionEditor: () => void;
  collectPet: Pet | null;
  collectSelectedSlugs: string[];
  collectNewName: string;
  collectStatus: string;
  collectBusy: boolean;
  setCollectNewName: Dispatch<SetStateAction<string>>;
  toggleCollectSlug: (slug: string) => void;
  submitPetCollector: (event: FormEvent) => void | Promise<void>;
  closePetCollector: () => void;
  collectionPetAdder: CollectionPetAdderState | null;
  collectionPetAdderStatus: string;
  collectionPetAdderLoading: boolean;
  collectionPetAdderBusyId: string;
  setCollectionPetAdderQuery: (query: string) => void;
  searchCollectionPetAdder: (event: FormEvent) => void | Promise<void>;
  addPetToCollection: (pet: Pet) => void | Promise<void>;
  closeCollectionPetAdder: () => void;
  userCollections: CollectionSummary[];
}) {
  return (
    <>
      {authOpen && (
        <AuthModal
          mode={authMode}
          setMode={selectAuthMode}
          displayName={displayName}
          setDisplayName={setDisplayName}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          status={authStatus}
          busy={authBusy}
          resendBusy={resendBusy}
          providers={authProviders}
          onOAuth={startOAuth}
          onResendVerification={resendVerification}
          onSubmit={submitAuth}
          onClose={closeAuth}
        />
      )}

      {settingsOpen && (
        <AccountSettingsModal
          user={user}
          contentMode={contentMode}
          onContentMode={selectContentMode}
          displayName={settingsDisplayName}
          setDisplayName={setSettingsDisplayName}
          currentPassword={settingsCurrentPassword}
          setCurrentPassword={setSettingsCurrentPassword}
          newPassword={settingsNewPassword}
          setNewPassword={setSettingsNewPassword}
          status={settingsStatus}
          busy={settingsBusy}
          avatarStatus={settingsAvatarStatus}
          avatarBusy={settingsAvatarBusy}
          avatarPets={settingsAvatarPets}
          avatarPetsLoading={settingsAvatarPetsLoading}
          apiKeys={apiKeys}
          apiKeysLoading={apiKeysLoading}
          apiKeyBusy={apiKeyBusy}
          newApiKeyName={newApiKeyName}
          setNewApiKeyName={setNewApiKeyName}
          newApiKeySecret={newApiKeySecret}
          apiKeyStatus={apiKeyStatus}
          onSubmit={submitSettings}
          onApiKeyCreate={createApiKey}
          onApiKeyRevoke={revokeApiKey}
          onAvatarSubmit={submitAvatar}
          onReloadAvatarPets={loadSettingsAvatarPets}
          onDeleteAccount={deleteAccount}
          onClose={closeSettings}
        />
      )}

      {sharingPet && <ShareModal pet={sharingPet} onClose={() => setSharingPet(null)} />}
      {quickCommentPet && (
        <QuickCommentModal
          pet={quickCommentPet}
          status={quickCommentStatus}
          busy={quickCommentBusy}
          onSubmit={submitQuickComment}
          onClose={closeQuickComment}
        />
      )}
      {sharingEntity && <EntityShareModal target={sharingEntity} onClose={() => setSharingEntity(null)} />}
      {downloadPet && <DownloadModal pet={downloadPet} onClose={() => setDownloadPet(null)} />}

      {tagEditorPet && (
        <TagEditorModal
          pet={tagEditorPet}
          displayName={tagEditorDisplayName}
          description={tagEditorDescription}
          tags={tagEditorTags}
          kind={tagEditorKind}
          status={tagEditorStatus}
          busy={tagEditorBusy}
          lockedTags={!user?.isAdmin && tagEditorPet.tags.includes("nsfw") ? ["nsfw"] : []}
          onDisplayName={setTagEditorDisplayName}
          onDescription={setTagEditorDescription}
          onKind={setTagEditorKind}
          onToggle={toggleTagEditorTag}
          onSubmit={submitTagEditor}
          onClose={closeTagEditor}
        />
      )}

      {spriteFixerPet && (
        <SpriteFixerModal
          pet={spriteFixerPet}
          status={spriteFixerStatus}
          busy={spriteFixerBusy}
          onSubmit={submitSpriteFixer}
          onClose={closeSpriteFixer}
        />
      )}

      {collectionEditorPet && (
        <PetCollectionsModal
          pet={collectionEditorPet}
          collections={adminCollections}
          selectedSlugs={collectionEditorSlugs}
          status={collectionEditorStatus}
          busy={collectionEditorBusy}
          onToggle={toggleCollectionEditorSlug}
          onSubmit={submitCollectionEditor}
          onClose={closeCollectionEditor}
        />
      )}

      {deleteConfirmPet && (
        <PetDeleteConfirmModal
          pet={deleteConfirmPet}
          status={deleteStatus}
          busy={deletingPetId === deleteConfirmPet.id}
          onConfirm={confirmDeleteUpload}
          onClose={closeDeleteConfirm}
        />
      )}

      {userCollectionEditor && (
        <UserCollectionEditorModal
          editor={userCollectionEditor}
          status={userCollectionEditorStatus}
          busy={userCollectionEditorBusy}
          onDisplayName={setUserCollectionEditorDisplayName}
          onSubmit={submitUserCollectionEditor}
          onClose={closeUserCollectionEditor}
        />
      )}

      {collectPet && (
        <PetCollectorModal
          pet={collectPet}
          collections={userCollections}
          selectedSlugs={collectSelectedSlugs}
          newName={collectNewName}
          status={collectStatus}
          busy={collectBusy}
          onToggle={toggleCollectSlug}
          onNewName={setCollectNewName}
          onSubmit={submitPetCollector}
          onClose={closePetCollector}
        />
      )}

      {collectionPetAdder && (
        <CollectionPetAdderModal
          adder={collectionPetAdder}
          status={collectionPetAdderStatus}
          loading={collectionPetAdderLoading}
          busyPetId={collectionPetAdderBusyId}
          onQuery={setCollectionPetAdderQuery}
          onSearch={searchCollectionPetAdder}
          onAdd={addPetToCollection}
          onClose={closeCollectionPetAdder}
        />
      )}
    </>
  );
}
