import { type FormEvent } from "react";
import { Icon } from "../ui/Icon";
import { Spinner } from "../ui/Spinner";
import type { ContentMode, User } from "../domain/types";
import type { AuthMode, AuthProvider } from "./useAuthForms";

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
  resendBusy,
  providers,
  onOAuth,
  onResendVerification,
  onSubmit,
  onClose
}: {
  mode: AuthMode;
  setMode: (mode: AuthMode) => void;
  displayName: string;
  setDisplayName: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  status: string;
  busy: boolean;
  resendBusy: boolean;
  providers: AuthProvider[];
  onOAuth: (provider: AuthProvider["id"]) => void | Promise<void>;
  onResendVerification: () => void | Promise<void>;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
}) {
  const submitLabel =
    mode === "login" ? "Log in" :
    mode === "register" ? "Create account" :
    mode === "forgot" ? "Send reset link" :
    "Reset password";
  const busyLabel =
    mode === "login" ? "Signing in" :
    mode === "register" ? "Creating account" :
    mode === "forgot" ? "Sending reset link" :
    "Resetting password";
  const title =
    mode === "login" ? "Sign in" :
    mode === "register" ? "Create account" :
    mode === "forgot" ? "Reset password" :
    "Choose new password";
  const eyebrow =
    mode === "login" ? "Welcome back" :
    mode === "register" ? "New here" :
    mode === "forgot" ? "Email recovery" :
    "Password recovery";
  const isRegister = mode === "register";
  const showAuthProviders = mode === "login" && providers.length > 0;
  const normalizedDisplayName = displayName.trim().replace(/\s+/g, " ");
  const usernameStatus = isRegister && status.startsWith("Username") ? status : "";
  const socialSignupDisabled = isRegister && normalizedDisplayName.length < 2;
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
          {mode === "reset" ? (
            <div className="modalTitle compact">
              <p className="metaText">Account</p>
              <h2>Reset</h2>
            </div>
          ) : (
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
          )}
          <button className="btn btnSm btnGhost modalCloseButton" type="button" onClick={onClose} disabled={busy}>
            <Icon name="close" size={12} />
            Close
          </button>
        </div>
        <div className="modalTitle">
          <p className="metaText">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        {isRegister && (
          <div className="signupIdentityPanel">
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
                aria-describedby="signup-username-help"
                aria-invalid={Boolean(usernameStatus)}
              />
            </label>
            <p id="signup-username-help" className={`authFieldHint ${usernameStatus ? "error" : ""}`}>
              {usernameStatus || "Required for Google, X, and email signup."}
            </p>
            {providers.length > 0 && (
              <div className="signupProviderSet">
                <div className="signupProviderSetHeader">
                  <span className="fieldLabel">Social signup</span>
                  <small>Uses this username</small>
                </div>
                <div className="authProviderList">
                  {providers.map((provider) => (
                    <button
                      className="btn btnLg authProviderButton"
                      type="button"
                      disabled={busy || socialSignupDisabled}
                      key={provider.id}
                      onClick={() => onOAuth(provider.id)}
                      aria-describedby="signup-username-help"
                    >
                      <span className={`authProviderMark ${provider.id}`}>{provider.id === "google" ? "G" : "X"}</span>
                      Continue with {provider.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {showAuthProviders && (
          <div className="authProviderCluster">
            <div className="authProviderList">
              {providers.map((provider) => (
                <button
                  className="btn btnLg authProviderButton"
                  type="button"
                  disabled={busy}
                  key={provider.id}
                  onClick={() => onOAuth(provider.id)}
                >
                  <span className={`authProviderMark ${provider.id}`}>{provider.id === "google" ? "G" : "X"}</span>
                  Continue with {provider.label}
                </button>
              ))}
            </div>
            <div className="authDivider" aria-hidden="true">
              <span />
            </div>
          </div>
        )}
        {isRegister && providers.length > 0 && (
          <div className="authDivider withLabel">
            <span />
            <em>or use email</em>
            <span />
          </div>
        )}
        <form className="stackForm" onSubmit={onSubmit}>
          {mode !== "reset" && (
            <label>
              <span className="fieldLabel">Email</span>
              <input
                autoFocus={mode === "login" || mode === "forgot"}
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
          )}
          {mode !== "forgot" && (
            <label>
              <span className="fieldLabel">{mode === "reset" ? "New password" : "Password"}</span>
              <input
                autoFocus={mode === "reset"}
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
          )}
          <button className="btn btnPrimary btnLg" type="submit" disabled={busy}>
            {busy ? <Spinner size={14} /> : null}
            {busy ? busyLabel : submitLabel}
          </button>
        </form>
        {mode === "login" && (
          <button className="textButton authInlineAction" type="button" disabled={busy} onClick={() => setMode("forgot")}>
            Forgot password
          </button>
        )}
        {(mode === "login" || mode === "register") && (
          <button className="textButton authInlineAction" type="button" disabled={busy || resendBusy} onClick={onResendVerification}>
            {resendBusy ? "Sending confirmation" : "Resend confirmation email"}
          </button>
        )}
        {(mode === "forgot" || mode === "reset") && (
          <button className="textButton authInlineAction" type="button" disabled={busy} onClick={() => setMode("login")}>
            Back to sign in
          </button>
        )}
        {status && !usernameStatus && (
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
  onSubmit,
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
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
}) {
  const nsfwEnabled = contentMode === "all";
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
      <section className="authModal" role="dialog" aria-modal="true" aria-label="Settings">
        <div className="modalHeader">
          <div className="modalTitle compact">
            <p className="metaText">App</p>
            <h2>Settings</h2>
          </div>
          <button className="btn btnSm btnGhost modalCloseButton" type="button" onClick={onClose} disabled={busy}>
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
            {status && (
              <p className="status" role="alert">
                {status}
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
