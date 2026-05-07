import { useEffect, useState } from "react";
import { normalizePet } from "../../domain/pets";
import type { Pet } from "../../domain/types";
import type { PlaygroundPeer } from "./types";

export function useRoomPeerPalette({
  collectionSlug,
  apiFetch
}: {
  collectionSlug?: string;
  apiFetch: (path: string, init?: RequestInit) => Promise<Response>;
}) {
  const [peers, setPeers] = useState<PlaygroundPeer[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (collectionSlug) {
          const res = await apiFetch(`/api/collections/${collectionSlug}`);
          if (cancelled) return;
          if (!res.ok) {
            setPeers([]);
            return;
          }
          const body = await res.json() as { collection?: { topPets?: Pet[] }; pets?: Pet[] };
          const pets = ((body.pets ?? body.collection?.topPets ?? []) as Pet[]).map(normalizePet);
          if (cancelled) return;
          setPeers(pets.map((p) => ({
            id: p.id,
            displayName: p.displayName,
            spritesheetUrl: p.spritesheetUrl,
            source: "collection" as const
          })));
          return;
        }

        const [mineRes, favRes] = await Promise.all([
          apiFetch("/api/pets/mine"),
          apiFetch("/api/pets/favorites").catch(() => null as Response | null)
        ]);
        if (cancelled) return;
        const mineBody = mineRes.ok ? (await mineRes.json()) as { pets: Pet[] } : { pets: [] as Pet[] };
        let favPets: Pet[] = [];
        if (favRes && favRes.ok) {
          const favBody = await favRes.json() as { pets: Pet[] };
          favPets = (favBody.pets || []).map(normalizePet);
        }
        if (cancelled) return;
        const seen = new Set<string>();
        const merged: PlaygroundPeer[] = [];
        for (const p of (mineBody.pets || []).map(normalizePet)) {
          if (seen.has(p.id)) continue;
          seen.add(p.id);
          merged.push({ id: p.id, displayName: p.displayName, spritesheetUrl: p.spritesheetUrl, source: "own" });
        }
        for (const p of favPets) {
          if (seen.has(p.id)) continue;
          seen.add(p.id);
          merged.push({ id: p.id, displayName: p.displayName, spritesheetUrl: p.spritesheetUrl, source: "favorite" });
        }
        if (merged.length === 0) {
          const newRes = await apiFetch("/api/pets?page=1&pageSize=6&sort=new").catch(() => null as Response | null);
          if (cancelled) return;
          if (newRes && newRes.ok) {
            const body = await newRes.json() as { pets: Pet[] };
            for (const p of (body.pets || []).map(normalizePet)) {
              if (seen.has(p.id)) continue;
              seen.add(p.id);
              merged.push({ id: p.id, displayName: p.displayName, spritesheetUrl: p.spritesheetUrl, source: "newest" });
            }
          }
        }
        setPeers(merged);
      } catch {
        if (!cancelled) setPeers([]);
      }
    })();
    return () => { cancelled = true; };
  }, [apiFetch, collectionSlug]);

  return peers;
}
