import { pets as compositeManifest, version as cardVersion } from "../_social-manifest.js";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function onRequestGet(context) {
  const apiBase = requiredUrlEnv(context.env, "APP_API_BASE_URL").replace(/\/$/, "");
  const appOrigin = requiredUrlEnv(context.env, "PUBLIC_APP_ORIGIN").replace(/\/$/, "");
  const appName = requiredEnv(context.env, "APP_NAME").trim();
  const appHandle = requiredEnv(context.env, "APP_HANDLE").trim();
  const id = String(context.params.id || "");
  if (!SLUG.test(id)) {
    return shareNotFound();
  }

  const response = await fetch(`${apiBase}/api/pets/${id}/share-data`);
  if (!response.ok) {
    return shareNotFound();
  }

  const body = await response.json();
  const pet = body.pet;
  if (!pet) {
    return shareNotFound();
  }

  const title = `${pet.displayName} - ${appName}`;
  const creator = pet.ownerName || "Unknown";
  const nsfw = Array.isArray(pet.tags) && pet.tags.includes("nsfw");
  const description = `${nsfw ? "NSFW. " : ""}${pet.description} by ${creator}`;
  const shareUrl = `${appOrigin}/share/${pet.id}`;
  const detailUrl = `${appOrigin}/#/pets/${pet.id}`;
  const compositeUrl = !nsfw && compositeManifest.has(pet.id)
    ? `${appOrigin}/assets/social/pets/${pet.id}.png?v=${cardVersion}`
    : null;
  const imageUrl = compositeUrl
    || (nsfw ? `${appOrigin}/assets/petshare-social-preview.png` : `${apiBase}/api/pets/${pet.id}/share-image`);
  const imageWidth = 1200;
  const imageHeight = 630;
  const downloadUrl = `${apiBase}/api/pets/${pet.id}/download`;
  const cliCommand = `npx ${appHandle} add ${pet.id}`;
  const curlCommand = `curl -L "${downloadUrl}" -o "/tmp/${pet.id}.codex-pet.zip" && mkdir -p "$HOME/.codex/pets/${pet.id}" && unzip -o "/tmp/${pet.id}.codex-pet.zip" -d "$HOME/.codex/pets/${pet.id}"`;

  return html(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <link rel="canonical" href="${escapeHtml(detailUrl)}">
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${escapeHtml(appName)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="${imageWidth}">
  <meta property="og:image:height" content="${imageHeight}">
  <meta property="og:url" content="${escapeHtml(shareUrl)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
  <meta name="twitter:image:alt" content="${escapeHtml(pet.displayName)}">
  <style>
    body { margin: 0; background: #f5f0dc; color: #10100f; font: 16px/1.45 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { max-width: 760px; margin: 0 auto; padding: 48px 24px; }
    img { display: block; width: 100%; border: 1px solid #d8cfad; border-radius: 10px; }
    h1 { margin: 24px 0 8px; font-size: 40px; line-height: 1; }
    p { margin: 0 0 20px; color: #5f5a4f; }
    a { color: #10100f; font-weight: 700; }
    h2 { margin: 28px 0 10px; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
    pre { overflow: auto; padding: 16px; border: 1px solid #d8cfad; border-radius: 8px; background: #10100f; color: #f5f0dc; }
    footer { margin-top: 44px; padding-top: 20px; border-top: 1px solid #d8cfad; color: #5f5a4f; font-size: 13px; text-align: center; }
  </style>
</head>
<body>
  <main>
    <img src="${escapeHtml(imageUrl)}" alt="">
    <h1>${escapeHtml(pet.displayName)}</h1>
    <p>${escapeHtml(pet.description)}</p>
    <p>${nsfw ? "NSFW · " : ""}by ${escapeHtml(creator)}</p>
    <p><a href="${escapeHtml(detailUrl)}">Open in ${escapeHtml(appName)}</a></p>
    <h2>CLI</h2>
    <pre><code>${escapeHtml(cliCommand)}</code></pre>
    <h2>curl</h2>
    <pre><code>${escapeHtml(curlCommand)}</code></pre>
    <footer>Pets are shared by the community. Some may be inspired by existing characters or brands. We don&apos;t claim rights to those characters or brands.</footer>
  </main>
</body>
</html>`, 200, apiBase);
}

function requiredEnv(env, name) {
  const value = env?.[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return String(value);
}

function requiredUrlEnv(env, name) {
  const value = requiredEnv(env, name).replace(/\/$/, "");
  const url = new URL(value);
  if (url.protocol !== "https:") {
    throw new Error(`${name} must be an https URL`);
  }
  return url.origin + url.pathname.replace(/\/$/, "");
}

function shareNotFound() {
  return html("<!doctype html><title>Pet not found</title><p>Pet not found.</p>", 404);
}

function html(body, status = 200, apiBase = "") {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      ...securityHeaders(apiBase)
    }
  });
}

function securityHeaders(apiBase = "") {
  const imgSources = ["'self'", "data:"];
  if (apiBase) {
    imgSources.push(new URL(apiBase).origin);
  }
  return {
    "Content-Security-Policy": [
      "default-src 'self'",
      "script-src https://static.cloudflareinsights.com",
      "style-src 'unsafe-inline'",
      `img-src ${imgSources.join(" ")}`,
      "connect-src 'self' https://cloudflareinsights.com",
      "object-src 'none'",
      "base-uri 'none'",
      "frame-ancestors 'none'",
      "form-action 'none'"
    ].join("; "),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
