import { collections as compositeManifest, version as cardVersion } from "../_social-manifest.js";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function onRequestGet(context) {
  const apiBase = requiredUrlEnv(context.env, "APP_API_BASE_URL").replace(/\/$/, "");
  const appOrigin = requiredUrlEnv(context.env, "PUBLIC_APP_ORIGIN").replace(/\/$/, "");
  const appName = requiredEnv(context.env, "APP_NAME").trim();
  const slug = String(context.params.slug || "");
  if (!SLUG.test(slug)) {
    return collectionNotFound();
  }

  const response = await fetch(`${apiBase}/api/collections/${slug}`);
  if (!response.ok) {
    return collectionNotFound();
  }

  const body = await response.json();
  const collection = body.collection;
  if (!collection) {
    return collectionNotFound();
  }

  const pets = Array.isArray(body.pets) ? body.pets : [];
  const safePets = pets.filter((pet) => !(Array.isArray(pet?.tags) && pet.tags.includes("nsfw")));
  const featured = safePets[0] || null;
  const petCount = Number(collection.petCount || pets.length || 0);

  const title = `${collection.displayName} - ${appName}`;
  const description = buildDescription({ displayName: collection.displayName, safePets, petCount, appName });
  const shareUrl = `${appOrigin}/collections/${collection.slug}`;
  const appUrl = `${appOrigin}/#/collections/${collection.slug}`;
  const fallbackImageUrl = `${appOrigin}/assets/petshare-social-preview.png`;
  const compositeUrl = compositeManifest.has(collection.slug)
    ? `${appOrigin}/assets/social/collections/${collection.slug}.png?v=${cardVersion}`
    : null;
  const imageUrl = compositeUrl
    || (featured ? `${apiBase}/api/pets/${featured.id}/share-image` : fallbackImageUrl);
  const imageAlt = compositeUrl
    ? `${collection.displayName}, a curated ${appName} collection`
    : (featured
      ? `${featured.displayName}, a pet from the ${collection.displayName} collection`
      : `${collection.displayName} on ${appName}`);

  return html(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <link rel="canonical" href="${escapeHtml(appUrl)}">
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${escapeHtml(appName)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${escapeHtml(imageAlt)}">
  <meta property="og:url" content="${escapeHtml(shareUrl)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
  <meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}">
  <style>
    body { margin: 0; background: #f5f0dc; color: #10100f; font: 16px/1.45 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { max-width: 760px; margin: 0 auto; padding: 48px 24px; }
    img { display: block; width: 100%; border: 1px solid #d8cfad; border-radius: 12px; background: #fff; }
    h1 { margin: 24px 0 8px; font-size: 40px; line-height: 1; }
    p { margin: 0 0 20px; color: #5f5a4f; }
    a { color: #10100f; font-weight: 700; }
  </style>
</head>
<body>
  <main>
    <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(imageAlt)}">
    <h1>${escapeHtml(collection.displayName)}</h1>
    <p>${escapeHtml(description)}</p>
    <p><a href="${escapeHtml(appUrl)}">Open in ${escapeHtml(appName)}</a></p>
  </main>
</body>
</html>`, 200, apiBase);
}

function buildDescription({ displayName, safePets, petCount, appName }) {
  if (petCount <= 0 || safePets.length === 0) {
    return `${displayName} is a curated set of pixel pets for ${appName}.`;
  }
  if (petCount === 1 && safePets[0]) {
    return `${safePets[0].displayName} in ${displayName}, a curated ${appName} collection.`;
  }
  if (safePets.length >= 2 && petCount >= 2) {
    const remaining = petCount - 2;
    if (remaining <= 0) {
      return `${safePets[0].displayName} and ${safePets[1].displayName} in ${displayName}, a curated ${appName} collection.`;
    }
    return `${safePets[0].displayName}, ${safePets[1].displayName}, and ${remaining} more pixel pet${remaining === 1 ? "" : "s"} in ${displayName} on ${appName}.`;
  }
  if (safePets[0]) {
    const remaining = Math.max(petCount - 1, 0);
    return `${safePets[0].displayName} and ${remaining} more pixel pet${remaining === 1 ? "" : "s"} in ${displayName} on ${appName}.`;
  }
  return `${petCount} pixel pet${petCount === 1 ? "" : "s"} in ${displayName} on ${appName}.`;
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

function collectionNotFound() {
  return html("<!doctype html><title>Collection not found</title><p>Collection not found.</p>", 404);
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
