import { useEffect, useRef } from "react";
import type { PlaygroundPeer } from "../room/types";

export function PetSwapMenu({
  peers,
  activeId,
  cooling,
  query,
  onQueryChange,
  error,
  onPick
}: {
  peers: PlaygroundPeer[];
  activeId: string;
  cooling: boolean;
  query: string;
  onQueryChange: (q: string) => void;
  error: string | null;
  onPick: (p: PlaygroundPeer) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? peers.filter((peer) => peer.displayName.toLowerCase().includes(q) || peer.id.toLowerCase().includes(q))
    : peers;

  const sectionOrder: Array<{ key: string; label: string }> = [
    { key: "own", label: "Yours" },
    { key: "favorite", label: "Favorites" },
    { key: "collection", label: "Collection" },
    { key: "newest", label: "Newest" },
    { key: "other", label: "More" }
  ];
  const grouped = new Map<string, PlaygroundPeer[]>();
  for (const peer of filtered) {
    const key = peer.source ?? "other";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(peer);
  }

  const sectionCap = 36;
  const perSectionLimited = !q;
  const totalCount = peers.length;
  const matchCount = filtered.length;

  return (
    <div className="petSwapMenu" role="dialog" aria-label="Choose a pet to play as">
      <div className="petSwapMenuHeader">
        <p className="petSwapMenuLabel">
          <span className="petSwapMenuLabelDot" aria-hidden="true" />
          Switch pet
        </p>
        <span className="petSwapMenuCount" aria-label={`${totalCount} pets available`}>
          {q ? `${matchCount}/${totalCount}` : totalCount} pet{totalCount === 1 ? "" : "s"}
        </span>
      </div>
      <div className="petSwapSearchWrap">
        <span className="petSwapSearchPrefix" aria-hidden="true">›</span>
        <input
          ref={inputRef}
          type="search"
          className="petSwapSearch"
          placeholder="search by name…"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      {error && <p className="petSwapMenuError" role="alert">{error}</p>}
      {filtered.length === 0 && !error && (
        <div className="petSwapEmpty" role="status">
          <span className="petSwapEmptyMark" aria-hidden="true">·_·</span>
          <p>{peers.length === 0 ? "No other pets in your pocket yet." : `No matches for “${query}”.`}</p>
        </div>
      )}
      {sectionOrder.map((section) => {
        const items = grouped.get(section.key);
        if (!items || items.length === 0) return null;
        const cappable = section.key === "favorite" || section.key === "newest" || section.key === "other";
        const cap = perSectionLimited && cappable && items.length > sectionCap ? sectionCap : items.length;
        const visible = items.slice(0, cap);
        const hidden = items.length - visible.length;
        return (
          <section key={section.key} className="petSwapSection">
            <p className="petSwapSectionLabel">
              <span className="petSwapSectionRule" aria-hidden="true" />
              <span>{section.label}</span>
              <span className="petSwapSectionCount" aria-hidden="true">{items.length}</span>
            </p>
            <div className="petSwapGrid">
              {visible.map((peer) => (
                <button
                  key={peer.id}
                  type="button"
                  className="petSwapTile"
                  onClick={() => onPick(peer)}
                  disabled={cooling || peer.id === activeId}
                  data-active={peer.id === activeId || undefined}
                  aria-label={`Switch to ${peer.displayName}`}
                  title={peer.displayName}
                >
                  <span className="petSwapTileFrame">
                    <span
                      className="petSwapTileSprite"
                      style={{ backgroundImage: `url(${peer.spritesheetUrl})` }}
                    />
                  </span>
                  <span className="petSwapTileName">{peer.displayName}</span>
                </button>
              ))}
            </div>
            {hidden > 0 && (
              <p className="petSwapSectionMore">
                +{hidden} more · type to search
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
