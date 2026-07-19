import type { AuthSession, User } from "../domain/types";
import { useAuthModalForm } from "./forms/useAuthModalForm";
import { useAccountSettingsForm } from "./forms/useAccountSettingsForm";
import { useApiKeysForm } from "./forms/useApiKeysForm";

export type { ApiKeySummary, AuthMode, AuthProvider } from "./forms/types";

export function useAuthForms({
  user,
  apiFetch,
  applySession,
  setUser,
  onAuthenticated,
  onSettingsSaved,
  onAccountDeleted
}: {
  user: User | null;
  apiFetch: (path: string, init?: RequestInit, authSession?: AuthSession | null) => Promise<Response>;
  applySession: (nextSession: AuthSession | null) => void;
  setUser: (nextUser: User | null) => void;
  onAuthenticated: (nextUser: User, nextSession: AuthSession) => Promise<void>;
  onSettingsSaved: (nextUser: User) => Promise<void>;
  onAccountDeleted: () => void | Promise<void>;
}) {
  const auth = useAuthModalForm({ apiFetch, applySession, setUser, onAuthenticated });
  const settings = useAccountSettingsForm({ user, apiFetch, applySession, setUser, onSettingsSaved, onAccountDeleted });
  const keys = useApiKeysForm({ user, apiFetch });

  // The settings modal hosts both the account form and the API key panel, so
  // opening/closing it has to reset and load state across both hooks.
  function openSettings() {
    settings.setSettingsDisplayName(user?.displayName ?? "");
    settings.setSettingsCurrentPassword("");
    settings.setSettingsNewPassword("");
    settings.setSettingsStatus("");
    settings.setSettingsAvatarStatus("");
    keys.setApiKeyStatus("");
    keys.setNewApiKeySecret("");
    keys.setNewApiKeyName("Codex uploader");
    settings.setSettingsOpen(true);
    void settings.loadSettingsAvatarPets();
    void keys.loadApiKeys();
  }

  function closeSettings() {
    if (settings.settingsBusy || settings.settingsAvatarBusy || keys.apiKeyBusy) return;
    settings.setSettingsOpen(false);
    settings.setSettingsStatus("");
    settings.setSettingsAvatarStatus("");
    keys.setApiKeyStatus("");
    keys.setNewApiKeySecret("");
  }

  return {
    authOpen: auth.authOpen,
    authMode: auth.authMode,
    selectAuthMode: auth.selectAuthMode,
    displayName: auth.displayName,
    setDisplayName: auth.setDisplayName,
    email: auth.email,
    setEmail: auth.setEmail,
    password: auth.password,
    setPassword: auth.setPassword,
    authStatus: auth.authStatus,
    setAuthStatus: auth.setAuthStatus,
    authBusy: auth.authBusy,
    resendBusy: auth.resendBusy,
    authProviders: auth.authProviders,
    startOAuth: auth.startOAuth,
    resendVerification: auth.resendVerification,
    resetToken: auth.resetToken,
    setResetToken: auth.setResetToken,
    submitAuth: auth.submitAuth,
    openAuth: auth.openAuth,
    openPasswordReset: auth.openPasswordReset,
    closeAuth: auth.closeAuth,
    settingsOpen: settings.settingsOpen,
    settingsDisplayName: settings.settingsDisplayName,
    setSettingsDisplayName: settings.setSettingsDisplayName,
    settingsCurrentPassword: settings.settingsCurrentPassword,
    setSettingsCurrentPassword: settings.setSettingsCurrentPassword,
    settingsNewPassword: settings.settingsNewPassword,
    setSettingsNewPassword: settings.setSettingsNewPassword,
    settingsStatus: settings.settingsStatus,
    settingsBusy: settings.settingsBusy,
    settingsAvatarStatus: settings.settingsAvatarStatus,
    settingsAvatarBusy: settings.settingsAvatarBusy,
    settingsAvatarPets: settings.settingsAvatarPets,
    settingsAvatarPetsLoading: settings.settingsAvatarPetsLoading,
    apiKeys: keys.apiKeys,
    apiKeysLoading: keys.apiKeysLoading,
    apiKeyBusy: keys.apiKeyBusy,
    newApiKeyName: keys.newApiKeyName,
    setNewApiKeyName: keys.setNewApiKeyName,
    newApiKeySecret: keys.newApiKeySecret,
    apiKeyStatus: keys.apiKeyStatus,
    loadSettingsAvatarPets: settings.loadSettingsAvatarPets,
    loadApiKeys: keys.loadApiKeys,
    createApiKey: keys.createApiKey,
    revokeApiKey: keys.revokeApiKey,
    submitSettings: settings.submitSettings,
    submitAvatar: settings.submitAvatar,
    deleteAccount: settings.deleteAccount,
    openSettings,
    closeSettings,
    setAuthMode: auth.setAuthMode
  };
}
