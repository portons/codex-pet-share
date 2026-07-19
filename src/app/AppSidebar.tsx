import { useEffect, useRef, useState, type ComponentProps } from "react";
import { APP_HANDLE, APP_NAME, APP_REPO_URL } from "../branding/brand";
import { CommentNotifications } from "../comments/CommentNotifications";
import { navigate } from "../domain/routing";
import type { Route, User } from "../domain/types";
import { Icon } from "../ui/Icon";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentProps<typeof Icon>["name"];
  active: boolean;
};

type AccountClusterProps = {
  user: User | null;
  theme: "light" | "dark";
  onLogout: () => void;
  onSignIn: () => void;
  onAccount: () => void;
  onThemeToggle: () => void;
  onNavigate: () => void;
  commentNotifications: ComponentProps<typeof CommentNotifications>;
};

function AccountCluster({
  user,
  theme,
  onLogout,
  onSignIn,
  onAccount,
  onThemeToggle,
  onNavigate,
  commentNotifications
}: AccountClusterProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  function runAccountAction(action: () => void) {
    setMenuOpen(false);
    onNavigate();
    action();
  }

  return (
    <div className="sidebarBottom">
      {user ? <CommentNotifications {...commentNotifications} /> : null}
      <button
        className="themeToggle"
        type="button"
        aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        title={theme === "dark" ? "Light theme" : "Dark theme"}
        onClick={onThemeToggle}
      >
        <Icon name={theme === "dark" ? "sun" : "moon"} size={14} />
      </button>
      <div
        ref={menuRef}
        className="accountMenu sidebarAccount"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setMenuOpen(false);
          }
        }}
      >
        <button
          className="accountName accountButton"
          type="button"
          aria-haspopup="true"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((current) => !current)}
        >
          <Icon name="user" size={13} />
          <span className="accountButtonText">{user ? user.displayName : "Account"}</span>
        </button>
        {menuOpen && (
          <div className="accountMenuList sidebarAccountMenu" role="menu">
            <button type="button" role="menuitem" onClick={() => runAccountAction(onAccount)}>
              Settings
            </button>
            {user ? (
              <>
                {user.isAdmin && (
                  <button type="button" role="menuitem" onClick={() => runAccountAction(() => navigate("/admin"))}>
                    Admin
                  </button>
                )}
                <button className="dangerMenuItem" type="button" role="menuitem" onClick={() => runAccountAction(onLogout)}>
                  Log out
                </button>
              </>
            ) : (
              <button type="button" role="menuitem" onClick={() => runAccountAction(onSignIn)}>
                Sign in
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Brand({ markSize, className = "" }: { markSize: number; className?: string }) {
  return (
    <a className={`brand ${className}`} href="#/" aria-label={`${APP_NAME} home`}>
      <img className="brandMark" src="/assets/petshare-icon.png" alt="" width={markSize} height={markSize} />
      <span className="brandWordmark">
        <span className="brandPrompt" aria-hidden="true">$</span>
        <span className="brandName">{APP_HANDLE}</span>
        <span className="brandCursor" aria-hidden="true" />
      </span>
    </a>
  );
}

export function AppSidebar({
  route,
  user,
  theme,
  onLogout,
  onSignIn,
  onAccount,
  onThemeToggle,
  commentNotifications
}: {
  route: Route;
  user: User | null;
  theme: "light" | "dark";
  onLogout: () => void;
  onSignIn: () => void;
  onAccount: () => void;
  onThemeToggle: () => void;
  commentNotifications: ComponentProps<typeof CommentNotifications>;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrawerOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  const browseItems: NavItem[] = [
    { href: "#/", label: "Gallery", icon: "sparkle", active: route.name === "gallery" || route.name === "detail" },
    {
      href: "#/collections",
      label: "Collections",
      icon: "package",
      active: route.name === "collections" || route.name === "collection" || route.name === "collectionRoom"
    },
    { href: "#/creators", label: "Creators", icon: "user", active: route.name === "creators" || route.name === "user" }
  ];
  const libraryItems: NavItem[] = user
    ? [
        { href: "#/upload", label: "Upload", icon: "upload", active: route.name === "upload" },
        { href: "#/mine", label: "Your uploads", icon: "sheet", active: route.name === "mine" },
        { href: "#/favorites", label: "Favorites", icon: "heart", active: route.name === "favorites" }
      ]
    : [{ href: "#/upload", label: "Upload", icon: "upload", active: route.name === "upload" }];

  const accountClusterProps: AccountClusterProps = {
    user,
    theme,
    onLogout,
    onSignIn,
    onAccount,
    onThemeToggle,
    onNavigate: () => setDrawerOpen(false),
    commentNotifications
  };

  return (
    <>
      {/* Mobile top bar — the sidebar collapses into this below 1000px */}
      <header className="appTopbar">
        <button
          className="topbarMenuButton"
          type="button"
          aria-label="Open navigation"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
        >
          <Icon name="menu" size={16} />
        </button>
        <Brand markSize={36} className="topbarBrand" />
        <AccountCluster {...accountClusterProps} />
      </header>
      <button
        className={`sidebarBackdrop ${drawerOpen ? "open" : ""}`}
        type="button"
        aria-label="Close navigation"
        aria-hidden={!drawerOpen}
        tabIndex={drawerOpen ? 0 : -1}
        onClick={() => setDrawerOpen(false)}
      />
      <aside className={`appSidebar ${drawerOpen ? "open" : ""}`}>
        <Brand markSize={40} className="sidebarBrand" />
        <span className="sidebarSectionLabel">Browse</span>
        <nav className="sidebarNav" aria-label="Browse">
          {browseItems.map((item) => (
            <a
              className={`sidebarNavItem ${item.active ? "active" : ""}`}
              key={item.href}
              href={item.href}
              data-tooltip={item.label}
              aria-label={item.label}
              onClick={() => setDrawerOpen(false)}
            >
              <Icon name={item.icon} size={15} />
              <span className="sidebarNavLabel">{item.label}</span>
            </a>
          ))}
        </nav>
        <span className="sidebarSectionLabel">Library</span>
        <nav className="sidebarNav" aria-label="Library">
          {libraryItems.map((item) => (
            <a
              className={`sidebarNavItem ${item.active ? "active" : ""}`}
              key={item.href}
              href={item.href}
              data-tooltip={item.label}
              aria-label={item.label}
              onClick={() => setDrawerOpen(false)}
            >
              <Icon name={item.icon} size={15} />
              <span className="sidebarNavLabel">{item.label}</span>
            </a>
          ))}
        </nav>
        <div className="sidebarSpacer" />
        <div className="sidebarDesktopCluster">
          <AccountCluster {...accountClusterProps} />
        </div>
        <div className="sidebarFooterLinks" aria-label="Project links">
          <a href="https://x.com/mosesbabychrist" target="_blank" rel="noopener noreferrer" aria-label="X">
            <Icon name="x" size={12} />
          </a>
          <a href={APP_REPO_URL} target="_blank" rel="noopener noreferrer" aria-label="GitHub">
            <Icon name="github" size={13} />
          </a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
        </div>
      </aside>
    </>
  );
}
