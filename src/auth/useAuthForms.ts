import { useState, type FormEvent } from "react";
import { readJson } from "../domain/http";
import type { AuthSession, User } from "../domain/types";

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
  onSettingsSaved
}: {
  user: User | null;
  apiFetch: (path: string, init?: RequestInit, authSession?: AuthSession | null) => Promise<Response>;
  applySession: (nextSession: AuthSession | null) => void;
  setUser: (nextUser: User | null) => void;
  onAuthenticated: (nextUser: User, nextSession: AuthSession) => Promise<void>;
  onSettingsSaved: (nextUser: User) => Promise<void>;
}) {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authStatus, setAuthStatus] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsDisplayName, setSettingsDisplayName] = useState("");
  const [settingsStatus, setSettingsStatus] = useState("");
  const [settingsBusy, setSettingsBusy] = useState(false);

  function selectAuthMode(next: "login" | "register") {
    setAuthMode(next);
    setAuthStatus("");
  }

  function openAuth() {
    setAuthStatus("");
    setAuthOpen(true);
  }

  function closeAuth() {
    if (authBusy) return;
    setAuthOpen(false);
    setAuthStatus("");
    setPassword("");
  }

  function openSettings() {
    if (!user) return;
    setSettingsDisplayName(user.displayName);
    setSettingsStatus("");
    setSettingsOpen(true);
  }

  function closeSettings() {
    if (settingsBusy) return;
    setSettingsOpen(false);
    setSettingsStatus("");
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
    if (!trimmedEmail || !password) {
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
      const body = await readJson<{ user: User; session: AuthSession | null; needsEmailConfirmation?: boolean }>(
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
      applySession(body.session);
      setUser(body.user);
      setDisplayName("");
      setEmail("");
      setPassword("");
      setAuthStatus("");
      setAuthOpen(false);
      await onAuthenticated(body.user, body.session);
    } catch (error) {
      setAuthStatus(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function submitSettings(event: FormEvent) {
    event.preventDefault();
    if (settingsBusy) return;
    const nextDisplayName = validateUsername(settingsDisplayName);
    if (nextDisplayName.error) {
      setSettingsStatus(nextDisplayName.error);
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
      setUser(body.user);
      setSettingsDisplayName(body.user.displayName);
      setSettingsOpen(false);
      await onSettingsSaved(body.user);
    } catch (error) {
      setSettingsStatus(error instanceof Error ? error.message : "Could not update username.");
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
    submitAuth,
    openAuth,
    closeAuth,
    settingsOpen,
    settingsDisplayName,
    setSettingsDisplayName,
    settingsStatus,
    settingsBusy,
    submitSettings,
    openSettings,
    closeSettings,
    setAuthMode
  };
}
