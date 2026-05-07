const SORT_PAGES = {
  new: {
    label: "Newest",
    description: "Browse the newest community-shared pets.",
    appPath: "/#/"
  },
  popular: {
    label: "Most Liked",
    description: "Browse the most liked community-shared pets.",
    appPath: "/#/?sort=popular"
  },
  views: {
    label: "Most Viewed",
    description: "Browse the most viewed community-shared pets.",
    appPath: "/#/?sort=views"
  },
  random: {
    label: "Random",
    description: "Discover a random set of community-shared pets.",
    appPath: "/#/?sort=random"
  }
};

export async function onRequestGet(context) {
  const appOrigin = requiredUrlEnv(context.env, "PUBLIC_APP_ORIGIN").replace(/\/$/, "");
  const appName = requiredEnv(context.env, "APP_NAME").trim();
  const sort = String(context.params.sort || "");
  const page = SORT_PAGES[sort];
  if (!page) {
    return galleryNotFound();
  }

  const shareUrl = `${appOrigin}/gallery/${sort}`;
  const appUrl = `${appOrigin}${page.appPath}`;
  const imageUrl = `${appOrigin}/assets/petshare-social-preview.png`;
  const title = `${page.label} ${appName}`;

  return html(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <link rel="canonical" href="${escapeHtml(appUrl)}">
  <meta name="description" content="${escapeHtml(page.description)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${escapeHtml(appName)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(page.description)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${escapeHtml(shareUrl)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(page.description)}">
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
  <style>
    body { margin: 0; background: #f5f0dc; color: #10100f; font: 16px/1.45 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { max-width: 760px; margin: 0 auto; padding: 48px 24px; }
    img { display: block; width: 120px; height: 120px; border: 1px solid #d8cfad; border-radius: 16px; background: #fff; }
    h1 { margin: 24px 0 8px; font-size: 40px; line-height: 1; }
    p { margin: 0 0 20px; color: #5f5a4f; }
    a { color: #10100f; font-weight: 700; }
  </style>
</head>
<body>
  <main>
    <img src="${escapeHtml(imageUrl)}" alt="">
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(page.description)}</p>
    <p><a href="${escapeHtml(appUrl)}">Open in ${escapeHtml(appName)}</a></p>
  </main>
</body>
</html>`);
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

function galleryNotFound() {
  return html("<!doctype html><title>Gallery not found</title><p>Gallery not found.</p>", 404);
}

function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      ...securityHeaders()
    }
  });
}

function securityHeaders() {
  return {
    "Content-Security-Policy": [
      "default-src 'self'",
      "script-src https://static.cloudflareinsights.com",
      "style-src 'unsafe-inline'",
      "img-src 'self' data:",
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
