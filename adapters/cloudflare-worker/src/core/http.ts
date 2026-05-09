import type { AppContext } from "./types";

export class HttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, PUT, OPTIONS"
};

export function json(body: unknown, status = 200, extraHeaders: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...extraHeaders
    }
  });
}

export function html(body: string, status = 200, extraHeaders: HeadersInit = {}) {
  return new Response(body, {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      ...extraHeaders
    }
  });
}

export function secureResponse(ctx: AppContext, response: Response) {
  const headers = new Headers(response.headers);
  const origin = ctx.request.headers.get("Origin")?.replace(/\/$/, "");
  const allowed = parseAllowedOrigins(ctx.env.CORS_ALLOWED_ORIGINS);
  const maintenance = headers.get("X-Petshare-Maintenance") === "1";

  for (const [name, value] of Object.entries(corsHeaders)) headers.set(name, value);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  headers.set("Content-Security-Policy", maintenance
    ? [
      "default-src 'self'",
      "script-src 'unsafe-inline'",
      "style-src 'unsafe-inline'",
      "img-src 'self' data:",
      "connect-src 'none'",
      "object-src 'none'",
      "base-uri 'none'",
      "frame-ancestors 'none'",
      "form-action 'none'"
    ].join("; ")
    : [
      "default-src 'self'",
      "script-src 'self' 'wasm-unsafe-eval' https://static.cloudflareinsights.com",
      "style-src 'self' 'unsafe-inline' https://api.fontshare.com https://fonts.googleapis.com",
      "font-src 'self' https://cdn.fontshare.com https://fonts.gstatic.com data:",
      `img-src 'self' data: blob: https: ${ctx.env.PUBLIC_APP_ORIGIN}`,
      "connect-src 'self' https: wss: https://cloudflareinsights.com",
      "object-src 'none'",
      "base-uri 'none'",
      "frame-ancestors 'none'",
      "form-action 'none'"
    ].join("; "));
  headers.delete("X-Petshare-Maintenance");

  if (origin && allowed.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.append("Vary", "Origin");
  } else {
    headers.delete("Access-Control-Allow-Origin");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export function parseAllowedOrigins(value: string) {
  return new Set(value.split(",").map((origin) => origin.trim().replace(/\/$/, "")).filter(Boolean));
}

export function bearerToken(request: Request) {
  const header = request.headers.get("Authorization") || "";
  return header.match(/^Bearer\s+(.+)$/i)?.[1] || "";
}

export async function readJsonBody<T = Record<string, unknown>>(request: Request): Promise<T> {
  return request.json().catch(() => ({})) as Promise<T>;
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
