import { useEffect, useState } from "react";
import { prepareRealtimeClient, type ClientSession } from "./providerClient";
import { COLLECTION_INDEX_TOPIC, type CollectionIndexEntry } from "./roomChannel";

// Live-updating presence counts for permanent collection rooms.
// Subscribes to ONE shared topic (`room:_index`) where every user
// inside any `room:c-<slug>` presence-tracks `{ slug }`. The hook
// aggregates that single presence state by slug and re-emits a fresh
// count map on every join/leave. One channel join means time-to-first-
// rail is ~1s instead of ~17s for 17 collections (Phoenix processes
// phx_join messages serially per socket — see roomChannel.ts).
//
// Anonymous users get an empty map (private:true topics need an authed
// websocket). The signature still takes `slugs` so we can prune to
// known collections — if a stale slug shows up in the index, we ignore
// it instead of letting it leak into the rail.
export function useCollectionPresenceCounts(
  slugs: string[],
  session: ClientSession
): Map<string, number> {
  const [counts, setCounts] = useState<Map<string, number>>(() => new Map());

  // Stable allow-list — re-runs only when the set of known slugs
  // actually changes (sorted to ignore order churn) or session flips.
  const slugsKey = [...slugs].sort().join(",");
  const accessToken = session?.accessToken ?? null;

  useEffect(() => {
    if (!accessToken) {
      setCounts(new Map());
      return;
    }
    if (slugs.length === 0) {
      setCounts(new Map());
      return;
    }
    const allowed = new Set(slugs);
    let cancelled = false;
    type RealtimeClient = Awaited<ReturnType<typeof prepareRealtimeClient>>;
    let client: RealtimeClient | null = null;
    let channel: ReturnType<RealtimeClient["channel"]> | null = null;

    (async () => {
      try {
        client = await prepareRealtimeClient({ accessToken });
        if (cancelled) return;
        // Random presence key — we read state but never .track(), so the
        // key just needs to be unique per browser tab to avoid colliding
        // with another lurker on the same socket. We do NOT track our
        // own presence; only room participants do.
        const lurkerKey = `lurker-${Math.random().toString(36).slice(2, 10)}`;
        channel = client.channel(COLLECTION_INDEX_TOPIC, {
          config: { private: true, presence: { key: lurkerKey } }
        });
        channel.on("presence", { event: "sync" }, () => {
          if (cancelled) return;
          const next = aggregateBySlug(channel!.presenceState() as Record<string, CollectionIndexEntry[]>, allowed);
          setCounts(next);
        });
        channel.on("presence", { event: "join" }, () => {
          if (cancelled) return;
          const next = aggregateBySlug(channel!.presenceState() as Record<string, CollectionIndexEntry[]>, allowed);
          setCounts(next);
        });
        channel.on("presence", { event: "leave" }, () => {
          if (cancelled) return;
          const next = aggregateBySlug(channel!.presenceState() as Record<string, CollectionIndexEntry[]>, allowed);
          setCounts(next);
        });
        channel.subscribe();
      } catch {
        // Realtime offline / RLS deny / network blip — silent. Empty
        // counts mean the rail just doesn't render.
      }
    })();

    return () => {
      cancelled = true;
      if (channel && client) {
        try { void client.removeChannel(channel); } catch { /* ignore */ }
      } else if (channel) {
        try { void channel.unsubscribe(); } catch { /* ignore */ }
      }
    };
    // slugsKey is the actual dependency — splitting from `slugs` so a
    // re-render that yields a new array reference (same contents) doesn't
    // tear down + rebuild the channel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugsKey, accessToken]);

  return counts;
}

// Walk the presence state once and bucket by slug. One presence entry
// per user (each room participant tracks `{ slug }` keyed by userId).
// We allow-list against `allowed` so a stray slug from a deleted
// collection can't make a phantom row appear in the rail.
function aggregateBySlug(
  state: Record<string, CollectionIndexEntry[]>,
  allowed: Set<string>
): Map<string, number> {
  const next = new Map<string, number>();
  for (const entries of Object.values(state)) {
    const entry = entries[0];
    const slug = entry?.slug;
    if (!slug || !allowed.has(slug)) continue;
    next.set(slug, (next.get(slug) ?? 0) + 1);
  }
  return next;
}
