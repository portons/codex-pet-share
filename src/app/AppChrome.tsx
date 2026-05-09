import { useEffect, useRef, useState } from "react";
import { APP_HANDLE, APP_NAME, APP_REPO_URL } from "../branding/brand";
import { navigate } from "../domain/routing";
import type { Route, User } from "../domain/types";
import { Icon } from "../ui/Icon";

export function AppNav({
  route,
  user,
  theme,
  onLogout,
  onSignIn,
  onAccount,
  onThemeToggle
}: {
  route: Route;
  user: User | null;
  theme: "light" | "dark";
  onLogout: () => void;
  onSignIn: () => void;
  onAccount: () => void;
  onThemeToggle: () => void;
}) {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!accountMenuOpen) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [accountMenuOpen]);

  useEffect(() => {
    if (!accountMenuOpen && !mobileNavOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      if (accountMenuOpen) {
        setAccountMenuOpen(false);
      }
      if (mobileNavOpen) {
        setMobileNavOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [accountMenuOpen, mobileNavOpen]);

  function runAccountAction(action: () => void) {
    setAccountMenuOpen(false);
    action();
  }

  function closeMobileNav() {
    setMobileNavOpen(false);
  }

  return (
    <header className="appNav">
      <a className="brand" href="#/" aria-label={`${APP_NAME} home`}>
        <img className="brandMark" src="/assets/petshare-icon.png" alt="" width="56" height="56" />
        <span className="brandWordmark">
          <span className="brandPrompt" aria-hidden="true">$</span>
          <span className="brandName">{APP_HANDLE}</span>
          <span className="brandCursor" aria-hidden="true" />
        </span>
      </a>
      <button
        className="mobileNavToggle"
        type="button"
        aria-label="Open navigation"
        aria-controls="primary-navigation"
        aria-expanded={mobileNavOpen}
        onClick={() => setMobileNavOpen(true)}
      >
        <Icon name="menu" size={17} />
      </button>
      <button
        className={`mobileNavBackdrop ${mobileNavOpen ? "open" : ""}`}
        type="button"
        aria-label="Close navigation"
        aria-hidden={!mobileNavOpen}
        tabIndex={mobileNavOpen ? 0 : -1}
        onClick={closeMobileNav}
      />
      <nav
        id="primary-navigation"
        className={`navLinks ${mobileNavOpen ? "open" : ""}`}
        aria-label="Primary navigation"
      >
        <div className="mobileNavHeader">
          <span>Navigation</span>
          <button type="button" aria-label="Close navigation" onClick={closeMobileNav}>
            <Icon name="close" size={15} />
          </button>
        </div>
        <a className={route.name === "gallery" ? "active" : ""} href="#/" onClick={closeMobileNav}>
          Gallery
        </a>
        <a
          className={route.name === "collections" || route.name === "collection" ? "active" : ""}
          href="#/collections"
          onClick={closeMobileNav}
        >
          Collections
        </a>
        <a className={route.name === "creators" ? "active" : ""} href="#/creators" onClick={closeMobileNav}>
          Creators
        </a>
        <a className={`navUploadLink ${route.name === "upload" ? "active" : ""}`} href="#/upload" onClick={closeMobileNav}>
          <Icon name="upload" size={13} />
          Upload
        </a>
      </nav>
      <div className="accountAction">
        <button
          className="themeToggle"
          type="button"
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          title={theme === "dark" ? "Light theme" : "Dark theme"}
          onClick={onThemeToggle}
        >
          <Icon name={theme === "dark" ? "sun" : "moon"} size={14} />
        </button>
        {user ? (
          <div
            ref={accountMenuRef}
            className="accountMenu"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setAccountMenuOpen(false);
              }
            }}
          >
            <button
              className="accountName accountButton"
              type="button"
              aria-haspopup="true"
              aria-expanded={accountMenuOpen}
              onClick={() => setAccountMenuOpen((current) => !current)}
            >
              <Icon name="user" size={13} />
              <span className="accountButtonText">{user.displayName}</span>
            </button>
            {accountMenuOpen && (
              <div className="accountMenuList" role="menu">
                <button type="button" role="menuitem" onClick={() => runAccountAction(onAccount)}>
                  Settings
                </button>
                <button type="button" role="menuitem" onClick={() => runAccountAction(() => navigate("/mine"))}>
                  Your uploads
                </button>
                <button type="button" role="menuitem" onClick={() => runAccountAction(() => navigate("/favorites"))}>
                  Favorites
                </button>
                {user.isAdmin && (
                  <button type="button" role="menuitem" onClick={() => runAccountAction(() => navigate("/admin"))}>
                    Admin
                  </button>
                )}
                <button className="dangerMenuItem" type="button" role="menuitem" onClick={() => runAccountAction(onLogout)}>
                  Log out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button className="accountName accountButton" type="button" onClick={onSignIn}>
            <Icon name="user" size={13} />
            <span className="accountButtonText">Sign in</span>
          </button>
        )}
      </div>
    </header>
  );
}

export function AppFooter() {
  return (
    <footer className="appFooter">
      <div className="footerSocialLinks" aria-label="Project links">
        <a href="https://x.com/mosesbabychrist" target="_blank" rel="noopener noreferrer">
          <Icon name="x" size={13} />
          <span>@mosesbabychrist</span>
        </a>
        <a href="https://github.com/portons/codex-pet-share" target="_blank" rel="noopener noreferrer">
          <Icon name="github" size={14} />
          <span>GitHub</span>
        </a>
        <a href="/privacy">
          <span>Privacy</span>
        </a>
        <a href="/terms">
          <span>Terms</span>
        </a>
      </div>
      <span>
        Pets are shared by the community. Some may be inspired by existing characters or brands. We don&apos;t claim rights to those characters or brands.
      </span>
      <span>
        Takedown requests and other reports can be filed via the project&rsquo;s{" "}
        <a href={APP_REPO_URL} target="_blank" rel="noopener noreferrer">issue tracker</a>.
      </span>
    </footer>
  );
}
