import { useState, type FormEvent } from "react";
import { readJson } from "../domain/http";
import { normalizePet } from "../domain/pets";
import { normalizeUser } from "../domain/users";
import type { AuthSession, Pet, User } from "../domain/types";

export type AuthProvider = {
  id: "google" | "x";
  label: string;
};

export type AuthMode = "login" | "register" | "forgot" | "reset";

export type ApiKeySummary = {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
};

function validateUsername(value: string) {
  const nextDisplayName = value.trim().replace(/\s+/g, " ");
  if (nextDisplayName.length < 2 || nextDisplayName.length > 32) {
    return { value: nextDisplayName, error: "Username must be 2-32 characters." };
  }
  if (!/^[A-Za-z0-9 _-]+$/.test(nextDisplayName)) {
    return { value: nextDisplayName, error: "Username can use letters, numbers, spaces, hyphens, and underscores." };
  }
  return { value: nextDisplayName, error: "" };
}

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
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [authStatus, setAuthStatus] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [authProviders, setAuthProviders] = useState<AuthProvider[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsDisplayName, setSettingsDisplayName] = useState("");
  const [settingsCurrentPassword, setSettingsCurrentPassword] = useState("");
  const [settingsNewPassword, setSettingsNewPassword] = useState("");
  const [settingsStatus, setSettingsStatus] = useState("");
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsAvatarStatus, setSettingsAvatarStatus] = useState("");
  const [settingsAvatarBusy, setSettingsAvatarBusy] = useState(false);
  const [settingsAvatarPets, setSettingsAvatarPets] = useState<Pet[]>([]);
  const [settingsAvatarPetsLoading, setSettingsAvatarPetsLoading] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKeySummary[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [apiKeyBusy, setApiKeyBusy] = useState("");
  const [newApiKeyName, setNewApiKeyName] = useState("Codex uploader");
  const [newApiKeySecret, setNewApiKeySecret] = useState("");
  const [apiKeyStatus, setApiKeyStatus] = useState("");

  function selectAuthMode(next: AuthMode) {
    setAuthMode(next);
    setAuthStatus("");
    setPassword("");
  }

  function openAuth(status = "") {
    setAuthMode("login");
    setAuthStatus(status);
    setAuthOpen(true);
    void loadAuthProviders();
  }

  function openPasswordReset(token: string) {
    setResetToken(token);
    setAuthMode("reset");
    setAuthStatus("");
    setPassword("");
    setAuthOpen(true);
  }

  function closeAuth() {
    if (authBusy) return;
    setAuthOpen(false);
    setAuthStatus("");
    setPassword("");
  }

  function openSettings() {
    setSettingsDisplayName(user?.displayName ?? "");
    setSettingsCurrentPassword("");
    setSettingsNewPassword("");
    setSettingsStatus("");
    setSettingsAvatarStatus("");
    setApiKeyStatus("");
    setNewApiKeySecret("");
    setNewApiKeyName("Codex uploader");
    setSettingsOpen(true);
    void loadSettingsAvatarPets();
    void loadApiKeys();
  }

  function closeSettings() {
    if (settingsBusy || settingsAvatarBusy || apiKeyBusy) return;
    setSettingsOpen(false);
    setSettingsStatus("");
    setSettingsAvatarStatus("");
    setApiKeyStatus("");
    setNewApiKeySecret("");
  }

  async function loadSettingsAvatarPets() {
    if (!user || settingsAvatarPetsLoading) return;
    setSettingsAvatarPetsLoading(true);
    try {
      const body = await readJson<{ pets: Pet[] }>(await apiFetch("/api/pets/mine"));
      setSettingsAvatarPets(body.pets.map(normalizePet));
    } catch (error) {
      setSettingsAvatarStatus(error instanceof Error ? error.message : "Could not load your pets.");
    } finally {
      setSettingsAvatarPetsLoading(false);
    }
  }

  async function loadApiKeys() {
    if (!user || apiKeysLoading) return;
    setApiKeysLoading(true);
    setApiKeyStatus("");
    try {
      const body = await readJson<{ apiKeys: ApiKeySummary[] }>(await apiFetch("/api/auth/api-keys"));
      setApiKeys(body.apiKeys);
    } catch (error) {
      setApiKeyStatus(error instanceof Error ? error.message : "Could not load API keys.");
    } finally {
      setApiKeysLoading(false);
    }
  }

  async function createApiKey(event: FormEvent) {
    event.preventDefault();
    if (!user || apiKeyBusy) return;
    const name = newApiKeyName.trim();
    if (!name) {
      setApiKeyStatus("API key name is required.");
      return;
    }
    setApiKeyBusy("create");
    setApiKeyStatus("");
    setNewApiKeySecret("");
    try {
      const body = await readJson<{ apiKey: ApiKeySummary & { key: string } }>(
        await apiFetch("/api/auth/api-keys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name })
        })
      );
      setApiKeys((current) => [body.apiKey, ...current]);
      setNewApiKeySecret(body.apiKey.key);
      setNewApiKeyName("Codex uploader");
      setApiKeyStatus("API key created. Copy it now; it will not be shown again.");
    } catch (error) {
      setApiKeyStatus(error instanceof Error ? error.message : "Could not create API key.");
    } finally {
      setApiKeyBusy("");
    }
  }

  async function revokeApiKey(id: string) {
    if (!user || apiKeyBusy) return;
    setApiKeyBusy(id);
    setApiKeyStatus("");
    try {
      await readJson<{ ok: true }>(await apiFetch(`/api/auth/api-keys/${id}`, { method: "DELETE" }));
      setApiKeys((current) => current.filter((key) => key.id !== id));
      setApiKeyStatus("API key revoked.");
    } catch (error) {
      setApiKeyStatus(error instanceof Error ? error.message : "Could not revoke API key.");
    } finally {
      setApiKeyBusy("");
    }
  }

  async function submitAuth(event: FormEvent) {
    event.preventDefault();
    if (authBusy) return;
    const trimmedEmail = email.trim();
    const nextDisplayName = validateUsername(displayName);
    if (authMode === "register" && nextDisplayName.error) {
      setAuthStatus(nextDisplayName.error);
      return;
    }
    if (authMode === "forgot") {
      if (!trimmedEmail) {
        setAuthStatus("Email is required.");
        return;
      }
      setAuthStatus("");
      setAuthBusy(true);
      try {
        await readJson<{ ok: true }>(
          await apiFetch(
            "/api/auth/password-reset",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: trimmedEmail })
            },
            null
          )
        );
        setAuthStatus("If that account exists, a reset link is on the way.");
      } catch (error) {
        setAuthStatus(error instanceof Error ? error.message : "Could not send reset email.");
      } finally {
        setAuthBusy(false);
      }
      return;
    }
    if ((!trimmedEmail && authMode !== "reset") || !password) {
      setAuthStatus("Email and password are required.");
      return;
    }
    if (password.length < 8) {
      setAuthStatus("Password must be at least 8 characters.");
      return;
    }
    setAuthStatus("");
    setAuthBusy(true);
    try {
      const body: { user: User; session: AuthSession | null; needsEmailConfirmation?: boolean } = authMode === "reset"
        ? await readJson<{ user: User; session: AuthSession | null }>(
          await apiFetch(
            "/api/auth/password-reset-complete",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: resetToken, password })
            },
            null
          )
        )
        : await readJson<{ user: User; session: AuthSession | null; needsEmailConfirmation?: boolean }>(
          await apiFetch(
            `/api/auth/${authMode}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: trimmedEmail,
                password,
                displayName: authMode === "register" ? nextDisplayName.value : undefined
              })
            },
            null
          )
        );
      if (!body.session) {
        setPassword("");
        setAuthStatus(
          authMode === "register" && body.needsEmailConfirmation
            ? "Account created. Check your email to confirm and then sign in."
            : "Account created. Sign in with your password."
        );
        return;
      }
      const nextUser = normalizeUser(body.user);
      applySession(body.session);
      setUser(nextUser);
      setDisplayName("");
      setEmail("");
      setPassword("");
      setResetToken("");
      setAuthStatus("");
      setAuthOpen(false);
      await onAuthenticated(nextUser, body.session);
    } catch (error) {
      setAuthStatus(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function resendVerification() {
    if (authBusy || resendBusy) return;
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setAuthStatus("Email is required.");
      return;
    }
    setAuthStatus("");
    setResendBusy(true);
    try {
      await readJson<{ ok: true }>(
        await apiFetch(
          "/api/auth/resend-verification",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: trimmedEmail })
          },
          null
        )
      );
      setAuthStatus("Confirmation email sent.");
    } catch (error) {
      setAuthStatus(error instanceof Error ? error.message : "Could not resend confirmation email.");
    } finally {
      setResendBusy(false);
    }
  }

  async function loadAuthProviders() {
    try {
      const body = await readJson<{ providers: AuthProvider[] }>(await apiFetch("/api/auth/providers", {}, null));
      setAuthProviders(body.providers);
    } catch {
      setAuthProviders([]);
    }
  }

  async function startOAuth(provider: AuthProvider["id"]) {
    if (authBusy) return;
    const nextDisplayName = validateUsername(displayName);
    if (authMode === "register" && nextDisplayName.error) {
      setAuthStatus(nextDisplayName.error);
      return;
    }
    setAuthStatus("");
    setAuthBusy(true);
    try {
      const query = authMode === "register" ? `?displayName=${encodeURIComponent(nextDisplayName.value)}` : "";
      const body = await readJson<{ url: string }>(
        await apiFetch(`/api/auth/oauth/${provider}/start${query}`, {}, null)
      );
      window.location.assign(body.url);
    } catch (error) {
      setAuthStatus(error instanceof Error ? error.message : "Could not start social sign-in.");
      setAuthBusy(false);
    }
  }

  async function submitSettings(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    if (settingsBusy) return;
    const nextDisplayName = validateUsername(settingsDisplayName);
    if (nextDisplayName.error) {
      setSettingsStatus(nextDisplayName.error);
      return;
    }
    if (settingsCurrentPassword && !settingsNewPassword) {
      setSettingsStatus("New password is required.");
      return;
    }
    if (!settingsCurrentPassword && settingsNewPassword && user?.emailVerified !== true) {
      setSettingsStatus("Current password is required.");
      return;
    }
    if (settingsNewPassword && settingsNewPassword.length < 8) {
      setSettingsStatus("Password must be at least 8 characters.");
      return;
    }
    setSettingsStatus("");
    setSettingsBusy(true);
    try {
      const body = await readJson<{ user: User }>(
        await apiFetch("/api/auth/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ displayName: nextDisplayName.value })
        })
      );
      const nextUser = normalizeUser(body.user);
      setUser(nextUser);
      setSettingsDisplayName(nextUser.displayName);
      if (settingsCurrentPassword || settingsNewPassword) {
        await readJson<{ ok: true }>(
          await apiFetch("/api/auth/password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ currentPassword: settingsCurrentPassword, newPassword: settingsNewPassword })
          })
        );
      }
      setSettingsCurrentPassword("");
      setSettingsNewPassword("");
      setSettingsOpen(false);
      await onSettingsSaved(nextUser);
    } catch (error) {
      setSettingsStatus(error instanceof Error ? error.message : "Could not save account settings.");
    } finally {
      setSettingsBusy(false);
    }
  }

  async function submitAvatar(avatar: Blob) {
    if (!user || settingsAvatarBusy) return;
    setSettingsAvatarStatus("");
    setSettingsAvatarBusy(true);
    try {
      const form = new FormData();
      form.append("avatar", avatar, "avatar.webp");
      const body = await readJson<{ user: User }>(
        await apiFetch("/api/auth/me/avatar", {
          method: "POST",
          body: form
        })
      );
      const nextUser = normalizeUser(body.user);
      setUser(nextUser);
      setSettingsAvatarStatus("Avatar saved.");
      await onSettingsSaved(nextUser);
    } catch (error) {
      setSettingsAvatarStatus(error instanceof Error ? error.message : "Could not save avatar.");
    } finally {
      setSettingsAvatarBusy(false);
    }
  }

  async function deleteAccount(deletePets: boolean) {
    if (!user || settingsBusy) return;
    setSettingsStatus("");
    setSettingsBusy(true);
    try {
      await readJson<{ ok: true; deletedPets: number }>(
        await apiFetch("/api/auth/me", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deletePets })
        })
      );
      applySession(null);
      setUser(null);
      setSettingsOpen(false);
      setSettingsCurrentPassword("");
      setSettingsNewPassword("");
      await onAccountDeleted();
    } catch (error) {
      setSettingsStatus(error instanceof Error ? error.message : "Could not delete account.");
    } finally {
      setSettingsBusy(false);
    }
  }

  return {
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
    setAuthStatus,
    authBusy,
    resendBusy,
    authProviders,
    startOAuth,
    resendVerification,
    resetToken,
    setResetToken,
    submitAuth,
    openAuth,
    openPasswordReset,
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
    loadApiKeys,
    createApiKey,
    revokeApiKey,
    submitSettings,
    submitAvatar,
    deleteAccount,
    openSettings,
    closeSettings,
    setAuthMode
  };
}
