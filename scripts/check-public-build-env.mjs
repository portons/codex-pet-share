import { loadEnv } from "vite";

const env = {
  ...loadEnv("production", process.cwd(), ""),
  ...process.env
};

const requiredPublicEnv = [
  "VITE_APP_API_BASE_URL",
  "VITE_PUBLIC_APP_ORIGIN",
  "VITE_REALTIME_URL",
  "VITE_REALTIME_PUBLIC_KEY",
  // Brand strings inlined into the build (see src/branding/brand.ts and
  // docs/REBRANDING.md). Required so a fresh fork's build fails
  // fast until the operator has customized them.
  "VITE_APP_NAME",
  "VITE_APP_HANDLE",
  "VITE_APP_TAGLINE",
  "VITE_APP_REPO_URL"
];
// The realtime public key is intentionally public for adapters that require
// browser-side realtime auth handshakes. The forbidden pattern still blocks
// service-role and private keys.
const forbiddenPublicEnvPattern = /(SERVICE_ROLE|SECRET|TOKEN|PASSWORD|PET_STATS_SALT|PRIVATE)/i;

const missing = requiredPublicEnv.filter((name) => !String(env[name] || "").trim());
if (missing.length) {
  throw new Error(`${missing.join(", ")} is required for production builds.`);
}

const urlEnv = {
  VITE_APP_API_BASE_URL: {},
  VITE_PUBLIC_APP_ORIGIN: { originOnly: true },
  VITE_REALTIME_URL: { originOnly: true },
  // Repo URL is a brand link in the UI footer / share text — only
  // shape-check it (must be https). Path/query allowed since GitHub
  // org/repo paths are common.
  VITE_APP_REPO_URL: { httpsOnly: true }
};

for (const [name, rule] of Object.entries(urlEnv)) {
  const raw = String(env[name] || "").trim();
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`${name} must be a valid URL.`);
  }
  const localHost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  if (parsed.protocol !== "https:" && !(localHost && parsed.protocol === "http:")) {
    throw new Error(`${name} must be an https URL, except local http development URLs.`);
  }
  if (parsed.search || parsed.hash) {
    throw new Error(`${name} must not include query or hash.`);
  }
  if (rule.originOnly && raw.replace(/\/$/, "") !== parsed.origin) {
    throw new Error(`${name} must be an origin without path, query, or hash.`);
  }
  // httpsOnly rule: shape-check passed already (https + no query/hash);
  // nothing more to enforce. Path is allowed.
}

const forbidden = Object.keys(env).filter(
  (name) => name.startsWith("VITE_") && forbiddenPublicEnvPattern.test(name)
);
if (forbidden.length) {
  throw new Error(`Do not expose secret-like env vars to Vite: ${forbidden.join(", ")}`);
}
