import { useEffect, useRef, useState } from "react";

export function OpenAsRoomLauncher({
  onOpenAsRoom,
  availableCollections
}: {
  onOpenAsRoom: (opts?: { name?: string; collectionSlug?: string }) => void | Promise<void>;
  availableCollections: Array<{ slug: string; displayName: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [collectionSlug, setCollectionSlug] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(event: MouseEvent) {
      const node = wrapRef.current;
      if (!node) return;
      if (!node.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function submit() {
    if (busy) return;
    setBusy(true);
    try {
      const trimmed = name.trim().slice(0, 60);
      await onOpenAsRoom({
        name: trimmed || undefined,
        collectionSlug: collectionSlug || undefined
      });
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="openAsRoomWrap" ref={wrapRef}>
      <button
        className="openAsRoomBtn"
        type="button"
        onClick={() => setOpen((value) => !value)}
        data-tooltip="Broadcast this playground as a shareable room"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        Open as Room
      </button>
      {open && (
        <div className="openAsRoomMenu" role="dialog" aria-label="Open as room">
          <p className="openAsRoomLabel">Open as room</p>
          <label className="openAsRoomField">
            <span>Room name</span>
            <input
              type="text"
              value={name}
              maxLength={60}
              placeholder="Optional - e.g. Friday hangout"
              onChange={(event) => setName(event.target.value)}
              autoFocus
            />
          </label>
          {availableCollections.length > 0 && (
            <label className="openAsRoomField">
              <span>Collection</span>
              <select
                value={collectionSlug}
                onChange={(event) => setCollectionSlug(event.target.value)}
              >
                <option value="">No collection - own + favorites</option>
                {availableCollections.map((collection) => (
                  <option key={collection.slug} value={collection.slug}>{collection.displayName}</option>
                ))}
              </select>
            </label>
          )}
          <div className="openAsRoomActions">
            <button type="button" className="btn btnGhost" onClick={() => setOpen(false)} disabled={busy}>Cancel</button>
            <button type="button" className="btn btnPrimary" onClick={() => { void submit(); }} disabled={busy}>
              {busy ? (
                <>
                  <span className="btnSpinner" aria-hidden="true" />
                  Opening...
                </>
              ) : "Open room"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
