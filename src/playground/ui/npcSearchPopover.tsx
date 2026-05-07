import { useEffect, useRef, type CSSProperties } from "react";
import type { PlaygroundPeer } from "../room/types";

export function NpcSearchPopover({
  peers,
  excludeIds,
  query,
  onQueryChange,
  onPick,
  onClose,
  style
}: {
  peers: PlaygroundPeer[];
  excludeIds: string[];
  query: string;
  onQueryChange: (q: string) => void;
  onPick: (p: PlaygroundPeer) => void;
  onClose: () => void;
  style?: CSSProperties;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const trimmed = query.trim().toLowerCase();
  const noPets = peers.length === 0;
  const matches = peers
    .filter((peer) => !excludeIds.includes(peer.id))
    .filter((peer) => trimmed.length === 0 || peer.displayName.toLowerCase().includes(trimmed));

  return (
    <div className="playgroundNpcSearch" role="dialog" aria-label="Search favorites to spawn" style={style}>
      <input
        ref={inputRef}
        type="text"
        className="playgroundNpcSearchInput"
        placeholder={noPets ? "No pets available…" : "Search pets…"}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        disabled={noPets}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          } else if (event.key === "Enter" && matches[0]) {
            event.preventDefault();
            onPick(matches[0]);
          }
        }}
      />
      <ul className="playgroundNpcSearchList">
        {noPets && (
          <li className="playgroundNpcSearchEmpty">
            No pets available.
          </li>
        )}
        {!noPets && matches.length === 0 && (
          <li className="playgroundNpcSearchEmpty">No matches</li>
        )}
        {matches.map((peer) => (
          <li key={peer.id}>
            <button type="button" className="playgroundNpcSearchItem" onClick={() => onPick(peer)}>
              {peer.displayName}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
