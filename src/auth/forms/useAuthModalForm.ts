import { useState, type FormEvent } from "react";
import { readJson } from "../../domain/http";
import { normalizeUser } from "../../domain/users";
import type { AuthSession, User } from "../../domain/types";
import type { AuthMode, AuthProvider } from "./types";
import { validateUsername } from "./validation";

export function useAuthModalForm({
  apiFetch,
  applySession,
  setUser,
  onAuthenticated
}: {
  apiFetch: (path: string, init?: RequestInit, authSession?: AuthSession | null) => Promise<Response>;
  applySession: (nextSession: AuthSession | null) => void;
  setUser: (nextUser: User | null) => void;
  onAuthenticated: (nextUser: User, nextSession: AuthSession) => Promise<void>;
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
    setAuthMode
  };
}
