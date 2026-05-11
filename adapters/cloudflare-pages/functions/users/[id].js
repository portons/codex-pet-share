const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HANDLE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function onRequestGet(context) {
  const apiBase = requiredUrlEnv(context.env, "APP_API_BASE_URL").replace(/\/$/, "");
  const appOrigin = requiredUrlEnv(context.env, "PUBLIC_APP_ORIGIN").replace(/\/$/, "");
  const appName = requiredEnv(context.env, "APP_NAME").trim();
  const id = String(context.params.id || "");
  if (!UUID.test(id) && !HANDLE.test(id)) {
    return userNotFound();
  }

  const response = await fetch(`${apiBase}/api/users/${encodeURIComponent(id)}/pets?page=1&pageSize=8`);
  if (!response.ok) {
    return userNotFound();
  }

  const body = await response.json();
  const user = body.user;
  if (!user) {
    return userNotFound();
  }

  const stats = body.stats || {};
  const pets = Array.isArray(body.pets) ? body.pets : [];
  const safePets = pets.filter((pet) => !(Array.isArray(pet?.tags) && pet.tags.includes("nsfw")));
  const petCount = Number(stats.petCount || body.total || pets.length || 0);

  const title = `${user.displayName} - ${appName}`;
  const description = buildDescription({ displayName: user.displayName, safePets, petCount, appName });
  const handleOrId = user.handle || user.id;
  const shareUrl = `${appOrigin}/users/${handleOrId}`;
  const appUrl = `${appOrigin}/#/users/${handleOrId}`;
  const imageUrl = `${apiBase}/api/users/${encodeURIComponent(handleOrId)}/social-image?v=${encodeURIComponent(creatorSocialVersion({ user, safePets, petCount, appOrigin }))}`;
  const imageAlt = `${user.displayName}'s pixel pets on ${appName}`;

  return html(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <link rel="canonical" href="${escapeHtml(appUrl)}">
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:type" content="profile">
  <meta property="og:site_name" content="${escapeHtml(appName)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:type" content="image/svg+xml">
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
    <h1>${escapeHtml(user.displayName)}</h1>
    <p>${escapeHtml(description)}</p>
    <p><a href="${escapeHtml(appUrl)}">Open in ${escapeHtml(appName)}</a></p>
  </main>
</body>
</html>`, 200, apiBase);
}

function buildDescription({ displayName, safePets, petCount, appName }) {
  if (petCount <= 0 || safePets.length === 0) {
    return `${displayName} hasn't shared a pet yet.`;
  }
  if (petCount === 1 && safePets[0]) {
    return `${displayName} made ${safePets[0].displayName}, a pixel pet for ${appName}.`;
  }
  if (safePets.length >= 2 && petCount >= 2) {
    const remaining = petCount - 2;
    if (remaining <= 0) {
      return `${displayName} made ${safePets[0].displayName} and ${safePets[1].displayName} for ${appName}.`;
    }
    return `${displayName} made ${safePets[0].displayName}, ${safePets[1].displayName}, and ${remaining} more pixel pet${remaining === 1 ? "" : "s"} for ${appName}.`;
  }
  if (safePets[0]) {
    const remaining = Math.max(petCount - 1, 0);
    return `${displayName} made ${safePets[0].displayName} and ${remaining} more pixel pet${remaining === 1 ? "" : "s"} for ${appName}.`;
  }
  return `${displayName} has ${petCount} pixel pet${petCount === 1 ? "" : "s"} for ${appName}.`;
}

function creatorSocialVersion({ user, safePets, petCount, appOrigin }) {
  return hashVersion([
    "2",
    appOrigin,
    user.id,
    user.handle || "",
    user.displayName,
    String(petCount),
    ...safePets.slice(0, 8).map((pet) => `${pet.id}:${pet.shareImageUrl || ""}`)
  ].join("|"));
}

function hashVersion(input) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
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

function userNotFound() {
  return html("<!doctype html><title>Creator not found</title><p>Creator not found.</p>", 404);
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
