import { type CSSProperties } from "react";
import type { CollectionSummary } from "../../domain/types";
import { CyclingPetPreview } from "../../pets/PetPreview";

// Editorial strip on the gallery home that surfaces only the
// collections currently hosting at least one connected user. Renders
// nothing when no rooms are live — the home page should never show an
// empty live-rooms placeholder.
export function LiveCollectionsStrip({
  collections,
  presenceCounts,
  signedIn,
  onSignIn
}: {
  collections: Array<CollectionSummary>;
  // One-shot snapshot of "people in the room" per slug at gallery
  // mount time. Empty when signed out (private:true topics need an
  // authed websocket). Not live — refreshes only on remount.
  presenceCounts: Map<string, number>;
  signedIn: boolean;
  onSignIn: () => void;
}) {
  // Filter to collections with at least one live user, then sort by
  // descending count so the busiest room sits on the left where the
  // eye lands first. Stable secondary sort by displayName so equal
  // counts don't shuffle between renders.
  const liveCollections = collections
    .map((c) => ({ collection: c, count: presenceCounts.get(c.slug) ?? 0 }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.collection.displayName.localeCompare(b.collection.displayName);
    });

  if (liveCollections.length === 0) return null;

  // Single compact line — the gallery is the main act, this is a
  // peripheral signal. Total head count keeps the wording terse
  // regardless of room count: "1 person live", "7 people live".
  const totalLive = liveCollections.reduce((sum, e) => sum + e.count, 0);

  return (
    <aside className="liveCollectionsRail" aria-label="Collections with people online right now">
      <p className="liveCollectionsRailCaption metaText">
        <span className="liveCollectionsRailDot" aria-hidden="true" />
        <span>
          {totalLive} {totalLive === 1 ? "person" : "people"} live
          {liveCollections.length > 1 ? ` · ${liveCollections.length} rooms` : ""}
        </span>
      </p>
      <ol className="liveCollectionsRailList">
        {liveCollections.map((entry, index) => {
          const { collection, count } = entry;
          const href = `#/collections/${collection.slug}/play`;
          const ariaLabel = `Join ${collection.displayName} · ${count} ${count === 1 ? "person" : "people"} live`;
          const rowStyle = { "--delay": `${index * 70}ms` } as CSSProperties;
          const inner = (
            <>
              <span className="liveCollectionsRailAvatars" aria-hidden="true">
                {collection.topPets.slice(0, 2).map((pet, petIndex) => (
                  <span
                    key={pet.id}
                    className="liveCollectionsRailAvatarSlot"
                    style={{ "--slot-index": petIndex } as CSSProperties}
                  >
                    <CyclingPetPreview pet={pet} size="thumb" transparent />
                  </span>
                ))}
              </span>
              <span className="liveCollectionsRailMeta">
                <span className="liveCollectionsRailName">{collection.displayName}</span>
                <span className="liveCollectionsRailSub">
                  <span className="liveCollectionsRailCount">{count}</span>
                  <span className="liveCollectionsRailWord">{count === 1 ? "person" : "people"}</span>
                </span>
              </span>
              <span className="liveCollectionsRailArrow" aria-hidden="true">→</span>
            </>
          );
          return (
            <li key={collection.slug}>
              {signedIn ? (
                <a
                  className="liveCollectionsRailRow revealItem"
                  style={rowStyle}
                  href={href}
                  aria-label={ariaLabel}
                  title={ariaLabel}
                >
                  {inner}
                </a>
              ) : (
                <button
                  type="button"
                  className="liveCollectionsRailRow revealItem"
                  style={rowStyle}
                  onClick={onSignIn}
                  aria-label={ariaLabel}
                  title={ariaLabel}
                >
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
