import { type FormEvent } from "react";
import { Icon } from "../ui/Icon";
import { Spinner } from "../ui/Spinner";

export function AuthModal({
  mode,
  setMode,
  displayName,
  setDisplayName,
  email,
  setEmail,
  password,
  setPassword,
  status,
  busy,
  onSubmit,
  onClose
}: {
  mode: "login" | "register";
  setMode: (mode: "login" | "register") => void;
  displayName: string;
  setDisplayName: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  status: string;
  busy: boolean;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
}) {
  const submitLabel = mode === "login" ? "Log in" : "Create account";
  const busyLabel = mode === "login" ? "Signing in" : "Creating account";
  return (
    <div
      className="modalBackdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onClose();
        }
      }}
    >
      <section className="authModal" role="dialog" aria-modal="true" aria-label="Sign in">
        <div className="modalHeader">
          <div className="authTabs">
            <button
              className={`btn btnSm ${mode === "login" ? "btnPrimary" : ""}`}
              type="button"
              disabled={busy}
              onClick={() => setMode("login")}
            >
              Sign in
            </button>
            <button
              className={`btn btnSm ${mode === "register" ? "btnPrimary" : ""}`}
              type="button"
              disabled={busy}
              onClick={() => setMode("register")}
            >
              Register
            </button>
          </div>
          <button className="btn btnSm btnGhost modalCloseButton" type="button" onClick={onClose} disabled={busy}>
            <Icon name="close" size={12} />
            Close
          </button>
        </div>
        <div className="modalTitle">
          <p className="metaText">{mode === "login" ? "Welcome back" : "New here"}</p>
          <h2>{mode === "login" ? "Sign in" : "Create account"}</h2>
        </div>
        <form className="stackForm" onSubmit={onSubmit}>
          {mode === "register" && (
            <label>
              <span className="fieldLabel">Username</span>
              <input
                autoFocus
                className="input"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="mosesbabychrist"
                type="text"
                autoComplete="nickname"
                minLength={2}
                maxLength={32}
                disabled={busy}
                required
              />
            </label>
          )}
          <label>
            <span className="fieldLabel">Email</span>
            <input
              autoFocus={mode === "login"}
              className="input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              type="email"
              autoComplete="email"
              disabled={busy}
              required
            />
          </label>
          <label>
            <span className="fieldLabel">Password</span>
            <input
              className="input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="8 characters minimum"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={8}
              disabled={busy}
              required
            />
          </label>
          <button className="btn btnPrimary btnLg" type="submit" disabled={busy}>
            {busy ? <Spinner size={14} /> : null}
            {busy ? busyLabel : submitLabel}
          </button>
        </form>
        {status && (
          <p className="status" role="alert">
            {status}
          </p>
        )}
        <p className="modalFootnote">Browsing and downloading do not require an account.</p>
      </section>
    </div>
  );
}

export function AccountSettingsModal({
  displayName,
  setDisplayName,
  status,
  busy,
  onSubmit,
  onClose
}: {
  displayName: string;
  setDisplayName: (value: string) => void;
  status: string;
  busy: boolean;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="modalBackdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onClose();
        }
      }}
    >
      <section className="authModal" role="dialog" aria-modal="true" aria-label="Account settings">
        <div className="modalHeader">
          <div className="modalTitle compact">
            <p className="metaText">Account</p>
            <h2>Settings</h2>
          </div>
          <button className="btn btnSm btnGhost modalCloseButton" type="button" onClick={onClose} disabled={busy}>
            <Icon name="close" size={12} />
            Close
          </button>
        </div>
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
          <button className="btn btnPrimary btnLg" type="submit" disabled={busy}>
            {busy ? <Spinner size={14} /> : null}
            {busy ? "Saving" : "Save"}
          </button>
        </form>
        {status && (
          <p className="status" role="alert">
            {status}
          </p>
        )}
      </section>
    </div>
  );
}
