import { parseJsonArray } from "./core/db";
import { html, json } from "./core/http";
import type { AppContext } from "./core/types";

const previewFrameCount = 57;
const previewFrameWidth = 96;

type MaintenancePet = {
  id: string;
  display_name: string;
  created_at: string;
  updated_at: string;
  tags_json: string;
  owner_shadowbanned_at: string | null;
};

const petSlots = [
  { className: "p1", left: "9vw", top: "18vh", speed: "8s", delay: "-1s", dx: "34px", dy: "22px" },
  { className: "p2", left: "74vw", top: "16vh", speed: "9s", delay: "-3s", dx: "-42px", dy: "24px" },
  { className: "p3", left: "16vw", top: "72vh", speed: "7s", delay: "-2s", dx: "28px", dy: "-34px" },
  { className: "p4", left: "81vw", top: "67vh", speed: "10s", delay: "-4s", dx: "-38px", dy: "-26px" },
  { className: "p5", left: "47vw", top: "12vh", speed: "8.5s", delay: "-5s", dx: "26px", dy: "31px" },
  { className: "p6", left: "54vw", top: "80vh", speed: "9.5s", delay: "-6s", dx: "-31px", dy: "-28px" }
] as const;

export function isMaintenancePassthrough(request: Request, parts: string[]) {
  return request.method === "GET"
    && parts[0] === "assets"
    && parts[1] === "pets"
    && parts.length === 4
    && parts[3] === "preview.webp";
}

export async function maintenanceResponse(ctx: AppContext, parts: string[]) {
  const appName = ctx.env.APP_NAME || "Pet Share";
  const message = `${appName} is moving to a cozier home. We'll be back soon.`;
  if (parts[0] === "api") {
    return json({ error: message }, 503, { "Retry-After": "900", "Cache-Control": "no-store" });
  }
  const pets = await maintenancePets(ctx);
  return html(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(appName)} is moving</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; overflow: hidden; background: #111313; color: #f7f1e8; }
    body::before {
      content: ""; position: fixed; inset: 0;
      background:
        radial-gradient(circle at 12% 18%, rgba(255, 221, 159, .16), transparent 24%),
        radial-gradient(circle at 80% 72%, rgba(129, 213, 185, .18), transparent 28%),
        linear-gradient(135deg, #171a19, #101112 58%, #181410);
    }
    main { position: relative; z-index: 2; min-height: 100vh; display: grid; place-items: center; padding: 32px; pointer-events: none; }
    .copy { width: min(560px, calc(100vw - 48px)); }
    h1 { margin: 0 0 14px; font-size: clamp(2.5rem, 7vw, 5.75rem); line-height: .88; letter-spacing: 0; }
    p { margin: 0; max-width: 34rem; color: #d8ccbd; font-size: clamp(1rem, 2vw, 1.2rem); line-height: 1.6; }
    .field { position: fixed; inset: 0; z-index: 1; }
    .pet { position: absolute; left: var(--left); top: var(--top); width: 96px; height: 104px; touch-action: none; cursor: grab; user-select: none; animation: roam var(--speed) ease-in-out infinite alternate; animation-delay: var(--delay); }
    .pet.dragging { cursor: grabbing; animation: none; z-index: 10; }
    .bob { position: relative; width: 100%; height: 100%; animation: bob 1.8s ease-in-out infinite; animation-delay: var(--delay); }
    .previewStrip { width: 96px; height: 104px; background-repeat: no-repeat; background-position: 0 0; background-size: auto 104px; image-rendering: pixelated; animation: preview-strip-play ${Math.max(previewFrameCount * 300, 2000)}ms steps(${previewFrameCount}) infinite; will-change: background-position; filter: drop-shadow(0 12px 18px rgba(0,0,0,.28)); }
    @keyframes roam { from { translate: 0 0; } to { translate: var(--dx) var(--dy); } }
    @keyframes bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
    @keyframes preview-strip-play { from { background-position: 0 0; } to { background-position: -${previewFrameCount * previewFrameWidth}px 0; } }
    @media (max-width: 640px) {
      .pet { width: 72px; height: 78px; }
      .previewStrip { transform: scale(.75); transform-origin: top left; }
      .p2, .p4 { left: 70vw; }
    }
  </style>
</head>
<body>
  <div class="field" aria-hidden="true">
    ${renderPets(pets)}
  </div>
  <main>
    <section class="copy">
      <h1>${escapeHtml(appName)} is moving.</h1>
      <p>We are migrating the little pet gallery to its new home. Uploads are paused for a moment, and everything will be back soon. The pets are keeping the room warm.</p>
    </section>
  </main>
  <script>
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    for (const pet of document.querySelectorAll(".pet")) {
      let drag = null;
      pet.addEventListener("pointerdown", (event) => {
        const rect = pet.getBoundingClientRect();
        pet.style.left = rect.left + "px";
        pet.style.top = rect.top + "px";
        pet.classList.add("dragging");
        pet.setPointerCapture(event.pointerId);
        drag = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      });
      pet.addEventListener("pointermove", (event) => {
        if (!drag) return;
        pet.style.left = clamp(event.clientX - drag.x, 12, window.innerWidth - pet.offsetWidth - 12) + "px";
        pet.style.top = clamp(event.clientY - drag.y, 12, window.innerHeight - pet.offsetHeight - 12) + "px";
      });
      const release = () => { drag = null; pet.classList.remove("dragging"); };
      pet.addEventListener("pointerup", release);
      pet.addEventListener("pointercancel", release);
    }
  </script>
</body>
</html>`, 503, { "X-Petshare-Maintenance": "1", "Retry-After": "900", "Cache-Control": "no-store" });
}

async function maintenancePets(ctx: AppContext) {
  const rows = (await ctx.env.DB.prepare(`
    select
      p.id,
      p.display_name,
      p.created_at,
      p.updated_at,
      p.tags_json,
      u.shadowbanned_at as owner_shadowbanned_at
    from pets p
    left join users u on u.id = p.owner_id
    order by p.created_at desc, p.display_name asc
    limit 24
  `).all<MaintenancePet>()).results || [];

  return rows
    .filter((pet) => !pet.owner_shadowbanned_at && !parseJsonArray(pet.tags_json).includes("nsfw"))
    .slice(0, petSlots.length);
}

function renderPets(pets: MaintenancePet[]) {
  return pets.map((pet, index) => {
    const slot = petSlots[index];
    const version = String(Date.parse(pet.updated_at || pet.created_at));
    const url = `/assets/pets/${encodeURIComponent(pet.id)}/preview.webp?v=${encodeURIComponent(version)}`;
    return `<div class="pet ${slot.className}" style="--left: ${slot.left}; --top: ${slot.top}; --speed: ${slot.speed}; --delay: ${slot.delay}; --dx: ${slot.dx}; --dy: ${slot.dy};"><div class="bob"><div class="previewStrip" style="background-image: url('${url}')"></div></div></div>`;
  }).join("");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
