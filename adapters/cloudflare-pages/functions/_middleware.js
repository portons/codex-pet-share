// Cloudflare Pages middleware: 301-redirect requests on the legacy
// pages.dev hostname to the canonical custom domain. Inert until the
// CANONICAL_HOST environment variable is set on the Pages project --
// safe to deploy before the custom domain is live.
//
// To activate after wiring the custom domain in the Pages dashboard:
//   Pages project -> Settings -> Environment variables -> Production
//   Add: CANONICAL_HOST = your-custom-domain.example.com
// Then re-deploy (or wait for the next deploy).

export async function onRequest(context) {
  const canonical = (context.env.CANONICAL_HOST || "").trim().toLowerCase();
  if (canonical) {
    const url = new URL(context.request.url);
    const host = url.hostname.toLowerCase();
    // Only redirect off the legacy pages.dev surface; let preview
    // deploys, the canonical host itself, and any other custom hosts
    // pass through untouched.
    if (host !== canonical && host.endsWith(".pages.dev")) {
      url.hostname = canonical;
      url.protocol = "https:";
      url.port = "";
      return Response.redirect(url.toString(), 301);
    }
  }
  return context.next();
}
