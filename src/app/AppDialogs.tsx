import type { Dispatch, FormEvent, SetStateAction } from "react";
import { type AdminCollection } from "../admin/AdminPage";
import { AuthModal, AccountSettingsModal } from "../auth/AuthModals";
import { CollectionPetAdderModal, PetCollectorModal, UserCollectionEditorModal } from "../collections/UserCollectionModals";
import type { CollectionPetAdderState } from "../collections/useUserCollections";
import { DownloadModal } from "../downloads/DownloadModal";
import { PetCollectionsModal, TagEditorModal } from "../pets/PetManagementModals";
import { EntityShareModal, ShareModal } from "../share/ShareModals";
import type { CollectionSummary, EditablePetKind, EntityShareTarget, Pet } from "../domain/types";
import type { TagName } from "../domain/config";

export function AppDialogs({
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
  submitAuth,
  closeAuth,
  settingsOpen,
  settingsDisplayName,
  setSettingsDisplayName,
  settingsStatus,
  settingsBusy,
  submitSettings,
  closeSettings,
  sharingPet,
  setSharingPet,
  sharingEntity,
  setSharingEntity,
  downloadPet,
  setDownloadPet,
  tagEditorPet,
  tagEditorTags,
  tagEditorKind,
  tagEditorStatus,
  tagEditorBusy,
  setTagEditorKind,
  toggleTagEditorTag,
  submitTagEditor,
  closeTagEditor,
  collectionEditorPet,
  adminCollections,
  collectionEditorSlugs,
  collectionEditorStatus,
  collectionEditorBusy,
  toggleCollectionEditorSlug,
  submitCollectionEditor,
  closeCollectionEditor,
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
  authOpen: boolean;
  authMode: "login" | "register";
  selectAuthMode: (next: "login" | "register") => void;
  displayName: string;
  setDisplayName: Dispatch<SetStateAction<string>>;
  email: string;
  setEmail: Dispatch<SetStateAction<string>>;
  password: string;
  setPassword: Dispatch<SetStateAction<string>>;
  authStatus: string;
  authBusy: boolean;
  submitAuth: (event: FormEvent) => void | Promise<void>;
  closeAuth: () => void;
  settingsOpen: boolean;
  settingsDisplayName: string;
  setSettingsDisplayName: Dispatch<SetStateAction<string>>;
  settingsStatus: string;
  settingsBusy: boolean;
  submitSettings: (event: FormEvent) => void | Promise<void>;
  closeSettings: () => void;
  sharingPet: Pet | null;
  setSharingPet: Dispatch<SetStateAction<Pet | null>>;
  sharingEntity: EntityShareTarget | null;
  setSharingEntity: Dispatch<SetStateAction<EntityShareTarget | null>>;
  downloadPet: Pet | null;
  setDownloadPet: Dispatch<SetStateAction<Pet | null>>;
  tagEditorPet: Pet | null;
  tagEditorTags: string[];
  tagEditorKind: EditablePetKind;
  tagEditorStatus: string;
  tagEditorBusy: boolean;
  setTagEditorKind: Dispatch<SetStateAction<EditablePetKind>>;
  toggleTagEditorTag: (tag: TagName) => void;
  submitTagEditor: (event: FormEvent) => void | Promise<void>;
  closeTagEditor: () => void;
  collectionEditorPet: Pet | null;
  adminCollections: AdminCollection[];
  collectionEditorSlugs: string[];
  collectionEditorStatus: string;
  collectionEditorBusy: boolean;
  toggleCollectionEditorSlug: (slug: string) => void;
  submitCollectionEditor: (event: FormEvent) => void | Promise<void>;
  closeCollectionEditor: () => void;
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
          onSubmit={submitAuth}
          onClose={closeAuth}
        />
      )}

      {settingsOpen && (
        <AccountSettingsModal
          displayName={settingsDisplayName}
          setDisplayName={setSettingsDisplayName}
          status={settingsStatus}
          busy={settingsBusy}
          onSubmit={submitSettings}
          onClose={closeSettings}
        />
      )}

      {sharingPet && <ShareModal pet={sharingPet} onClose={() => setSharingPet(null)} />}
      {sharingEntity && <EntityShareModal target={sharingEntity} onClose={() => setSharingEntity(null)} />}
      {downloadPet && <DownloadModal pet={downloadPet} onClose={() => setDownloadPet(null)} />}

      {tagEditorPet && (
        <TagEditorModal
          pet={tagEditorPet}
          tags={tagEditorTags}
          kind={tagEditorKind}
          status={tagEditorStatus}
          busy={tagEditorBusy}
          onKind={setTagEditorKind}
          onToggle={toggleTagEditorTag}
          onSubmit={submitTagEditor}
          onClose={closeTagEditor}
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
