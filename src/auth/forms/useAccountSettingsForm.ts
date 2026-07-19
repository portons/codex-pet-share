import { useState, type FormEvent } from "react";
import { readJson } from "../../domain/http";
import { normalizePet } from "../../domain/pets";
import { normalizeUser } from "../../domain/users";
import type { AuthSession, Pet, User } from "../../domain/types";
import { validateUsername } from "./validation";

export function useAccountSettingsForm({
  user,
  apiFetch,
  applySession,
  setUser,
  onSettingsSaved,
  onAccountDeleted
}: {
  user: User | null;
  apiFetch: (path: string, init?: RequestInit, authSession?: AuthSession | null) => Promise<Response>;
  applySession: (nextSession: AuthSession | null) => void;
  setUser: (nextUser: User | null) => void;
  onSettingsSaved: (nextUser: User) => Promise<void>;
  onAccountDeleted: () => void | Promise<void>;
}) {
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
    settingsOpen,
    setSettingsOpen,
    settingsDisplayName,
    setSettingsDisplayName,
    settingsCurrentPassword,
    setSettingsCurrentPassword,
    settingsNewPassword,
    setSettingsNewPassword,
    settingsStatus,
    setSettingsStatus,
    settingsBusy,
    settingsAvatarStatus,
    setSettingsAvatarStatus,
    settingsAvatarBusy,
    settingsAvatarPets,
    settingsAvatarPetsLoading,
    loadSettingsAvatarPets,
    submitSettings,
    submitAvatar,
    deleteAccount
  };
}
