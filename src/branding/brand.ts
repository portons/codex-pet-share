// Build-time brand strings. All four are required by
// scripts/check-public-build-env.mjs, so by the time this module
// loads they are guaranteed non-empty (Vite inlines them into the
// bundle at build, and the build will hard-fail if any is missing).
//
// Why a separate module instead of `import.meta.env` at every call
// site: keeps `import.meta.env` references in one place, makes the
// rebrand surface explicit (just edit four constants instead of
// hunting all over App.tsx), and gives forkers exactly one file to
// glance at when they want to know what's customizable.
//
// To rebrand a fork, set the four VITE_APP_* env vars in your
// .env.local — see docs/REBRANDING.md.

export const APP_NAME = String(import.meta.env.VITE_APP_NAME);
export const APP_HANDLE = String(import.meta.env.VITE_APP_HANDLE);
export const APP_TAGLINE = String(import.meta.env.VITE_APP_TAGLINE);
export const APP_REPO_URL = String(import.meta.env.VITE_APP_REPO_URL);
