import { useState, type FormEvent } from "react";
import { Icon } from "../../ui/Icon";
import { Spinner } from "../../ui/Spinner";
import type { ContentMode, Pet, User } from "../../domain/types";
import { AvatarEditor } from "../AvatarEditor";
import type { ApiKeySummary } from "../forms/types";
import { ApiKeysPanel } from "./ApiKeysPanel";
import { AccountDeleteConfirmModal } from "./AccountDeleteConfirmModal";

export function AccountSettingsModal({
  user,
  contentMode,
  onContentMode,
  displayName,
  setDisplayName,
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  status,
  busy,
  avatarStatus,
  avatarBusy,
  avatarPets,
  avatarPetsLoading,
  apiKeys,
  apiKeysLoading,
  apiKeyBusy,
  newApiKeyName,
  setNewApiKeyName,
  newApiKeySecret,
  apiKeyStatus,
  onSubmit,
  onApiKeyCreate,
  onApiKeyRevoke,
  onAvatarSubmit,
  onReloadAvatarPets,
  onDeleteAccount,
  onClose
}: {
  user: User | null;
  contentMode: ContentMode;
  onContentMode: (mode: ContentMode) => void | Promise<void>;
  displayName: string;
  setDisplayName: (value: string) => void;
  currentPassword: string;
  setCurrentPassword: (value: string) => void;
  newPassword: string;
  setNewPassword: (value: string) => void;
  status: string;
  busy: boolean;
  avatarStatus: string;
  avatarBusy: boolean;
  avatarPets: Pet[];
  avatarPetsLoading: boolean;
  apiKeys: ApiKeySummary[];
  apiKeysLoading: boolean;
  apiKeyBusy: string;
  newApiKeyName: string;
  setNewApiKeyName: (value: string) => void;
  newApiKeySecret: string;
  apiKeyStatus: string;
  onSubmit: (event: FormEvent) => void;
  onApiKeyCreate: (event: FormEvent) => void | Promise<void>;
  onApiKeyRevoke: (id: string) => void | Promise<void>;
  onAvatarSubmit: (avatar: Blob) => void | Promise<void>;
  onReloadAvatarPets: () => void | Promise<void>;
  onDeleteAccount: (deletePets: boolean) => void | Promise<void>;
  onClose: () => void;
}) {
  const nsfwEnabled = contentMode === "all";
  const modalBusy = busy || avatarBusy || Boolean(apiKeyBusy);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  return (
    <>
      <div
        className="modalBackdrop"
        role="presentation"
        onClick={(event) => {
          if (event.target === event.currentTarget && !modalBusy) {
            onClose();
          }
        }}
      >
        <section className="authModal settingsModal" role="dialog" aria-modal="true" aria-label="Settings">
          <div className="modalHeader">
            <div className="modalTitle compact">
              <p className="metaText">App</p>
              <h2>Settings</h2>
            </div>
            <button className="btn btnSm btnGhost modalCloseButton" type="button" onClick={onClose} disabled={modalBusy}>
              <Icon name="close" size={12} />
              Close
            </button>
          </div>
          <div className="settingsPreferenceList">
            <label className="settingsToggleRow">
              <span className="settingsToggleCopy">
                <span className="fieldLabel">NSFW content</span>
                <small>{nsfwEnabled ? "Visible in gallery filters" : "Hidden from gallery filters"}</small>
              </span>
              <span className="contentModeSwitch">
                <input
                  type="checkbox"
                  checked={nsfwEnabled}
                  onChange={(event) => void onContentMode(event.target.checked ? "all" : "safe")}
                />
                <span className="switchTrack" aria-hidden="true">
                  <span className="switchThumb" />
                </span>
              </span>
            </label>
          </div>
          {user && (
            <>
              <form className="stackForm" onSubmit={onSubmit}>
                <label>
                  <span className="fieldLabel">Username</span>
                  <input
                    autoFocus
                    className="input"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    type="text"
                    autoComplete="nickname"
                    minLength={2}
                    maxLength={32}
                    disabled={busy}
                    required
                  />
                </label>
                <div className="settingsDivider" aria-hidden="true" />
                <label>
                  <span className="fieldLabel">Current password</span>
                  <input
                    className="input"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    placeholder="Leave blank when setting your first password"
                    type="password"
                    autoComplete="current-password"
                    disabled={busy}
                  />
                </label>
                <label>
                  <span className="fieldLabel">New password</span>
                  <input
                    className="input"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="8 characters minimum"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    disabled={busy}
                  />
                </label>
                <button className="btn btnPrimary btnLg" type="submit" disabled={busy}>
                  {busy ? <Spinner size={14} /> : null}
                  {busy ? "Saving" : "Save"}
                </button>
              </form>
              <AvatarEditor
                user={user}
                pets={avatarPets}
                petsLoading={avatarPetsLoading}
                status={avatarStatus}
                busy={avatarBusy}
                onReloadPets={onReloadAvatarPets}
                onSubmit={onAvatarSubmit}
              />
              <ApiKeysPanel
                keys={apiKeys}
                loading={apiKeysLoading}
                busy={apiKeyBusy}
                name={newApiKeyName}
                secret={newApiKeySecret}
                status={apiKeyStatus}
                onName={setNewApiKeyName}
                onCreate={onApiKeyCreate}
                onRevoke={onApiKeyRevoke}
              />
              <div className="settingsDangerZone">
                <span className="fieldLabel">Delete account</span>
                <button className="btn btnDanger btnLg settingsDeleteButton" type="button" disabled={busy} onClick={() => setDeleteModalOpen(true)}>
                  <Icon name="trash" size={14} />
                  Delete account
                </button>
              </div>
              {status && (
                <p className="status" role="alert">
                  {status}
                </p>
              )}
            </>
          )}
        </section>
      </div>
      {deleteModalOpen && (
        <AccountDeleteConfirmModal
          busy={busy}
          status={status}
          onConfirm={onDeleteAccount}
          onClose={() => setDeleteModalOpen(false)}
        />
      )}
    </>
  );
}
