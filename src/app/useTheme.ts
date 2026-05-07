import { useEffect, useState } from "react";

export type AppTheme = "light" | "dark";

const themeStorageKey = "codex-pets-theme";

export function useTheme() {
  const [theme, setTheme] = useState<AppTheme>(() => {
    const stored = window.localStorage.getItem(themeStorageKey);
    return stored === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(themeStorageKey, theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((current) => current === "dark" ? "light" : "dark");
  }

  return { theme, toggleTheme };
}
