import { useEffect, useState } from "react";
import { normalizePet } from "../../domain/pets";
import type { Pet } from "../../domain/types";

export function PetPicker({
  apiFetch,
  roomId,
  roomDisplayName,
  collectionSlug,
  hostName,
  onPick,
  onClose
}: {
  apiFetch: (path: string, init?: RequestInit) => Promise<Response>;
  roomId: string;
  roomDisplayName?: string;
  collectionSlug?: string;
  hostName: string;
  onPick: (pet: Pet) => void;
  onClose: () => void;
}) {
  const [ownPets, setOwnPets] = useState<Pet[] | null>(null);
  const [favoritePets, setFavoritePets] = useState<Pet[] | null>(null);
  const [collectionPets, setCollectionPets] = useState<Pet[] | null>(null);
  const [collectionLabel, setCollectionLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (collectionSlug) {
          const res = await apiFetch(`/api/collections/${collectionSlug}`);
          if (cancelled) return;
          if (!res.ok) {
            setError("Couldn't load this collection.");
            return;
          }
          const body = await res.json() as { collection?: { displayName?: string; topPets?: Pet[] }; pets?: Pet[] };
          const pets = ((body.pets ?? body.collection?.topPets ?? []) as Pet[]).map(normalizePet);
          if (cancelled) return;
          setCollectionPets(pets);
          setCollectionLabel(body.collection?.displayName || collectionSlug);
          setOwnPets([]);
          setFavoritePets([]);
          return;
        }
        const [mineRes, favRes] = await Promise.all([
          apiFetch("/api/pets/mine"),
          apiFetch("/api/pets/favorites").catch(() => null as Response | null)
        ]);
        if (cancelled) return;
        if (!mineRes.ok) {
          setError("Couldn't load your pets.");
          return;
        }
        const mineBody = await mineRes.json() as { pets: Pet[] };
        const own = (mineBody.pets || []).map(normalizePet);
        let favs: Pet[] = [];
        if (favRes && favRes.ok) {
          const favBody = await favRes.json() as { pets: Pet[] };
          const ownIds = new Set(own.map((p) => p.id));
          favs = (favBody.pets || []).map(normalizePet).filter((p) => !ownIds.has(p.id));
        }
        if (cancelled) return;
        setOwnPets(own);
        setFavoritePets(favs);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Couldn't load your pets.");
      }
    })();
    return () => { cancelled = true; };
  }, [apiFetch, collectionSlug]);

  const loaded = collectionSlug
    ? collectionPets !== null
    : (ownPets !== null && favoritePets !== null);
  const totalCount = collectionSlug
    ? (collectionPets?.length ?? 0)
    : (ownPets?.length ?? 0) + (favoritePets?.length ?? 0);

  const [fallbackPets, setFallbackPets] = useState<Pet[] | null>(null);
  const needsFallback = !collectionSlug && loaded && totalCount === 0;
  useEffect(() => {
    if (!needsFallback) return;
    if (fallbackPets !== null) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch("/api/pets?page=1&pageSize=6&sort=new");
        if (cancelled) return;
        if (!res.ok) {
          setFallbackPets([]);
          return;
        }
        const body = await res.json() as { pets: Pet[] };
        if (cancelled) return;
        setFallbackPets((body.pets || []).map(normalizePet));
      } catch {
        if (!cancelled) setFallbackPets([]);
      }
    })();
    return () => { cancelled = true; };
  }, [needsFallback, fallbackPets, apiFetch]);

  function renderTile(p: Pet) {
    return (
      <button
        key={p.id}
        type="button"
        className="roomPetTile"
        onClick={() => onPick(p)}
      >
        <span className="roomPetTilePreview">
          <span
            className="roomPetTileSprite"
            style={{ backgroundImage: `url(${p.spritesheetUrl})` }}
            aria-label={`${p.displayName} preview`}
          />
        </span>
        <span className="roomPetTileLabel">
          <span className="roomPetTileName">{p.displayName}</span>
          <span className="roomPetTileSlug">/{p.id}</span>
        </span>
      </button>
    );
  }

  return (
    <div className="modalBackdrop" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="authModal roomGate" role="dialog" aria-modal="true" aria-label="Pick a pet to join the room">
        <header className="roomGateHeader">
          <div>
            <span className="roomGateCallsign">
              <span className="roomDot" aria-hidden="true" />
              <span>incoming · {roomDisplayName || roomId}</span>
            </span>
            <h2>Join {roomDisplayName ? `“${roomDisplayName}”` : `${hostName}'s playground`}</h2>
          </div>
        </header>
        <p className="roomGateLead">
          {collectionSlug
            ? `Pick a pet from ${collectionLabel ? `the “${collectionLabel}” collection` : "this collection"}.`
            : "Pick the pet you'll show up as."}
        </p>
        {error && <p className="status">{error}</p>}
        {!loaded && !error && (
          <p className="roomGateLead" style={{ textAlign: "center", padding: "8px 0" }}>loading your pets…</p>
        )}
        {loaded && collectionSlug && collectionPets && collectionPets.length > 0 && (
          <div className="roomPetSection">
            <h3 className="roomPetSectionLabel">{collectionLabel || "Collection"}</h3>
            <div className="roomPetGrid">
              {collectionPets.map(renderTile)}
            </div>
          </div>
        )}
        {loaded && collectionSlug && collectionPets && collectionPets.length === 0 && (
          <div className="roomGateEmpty">
            <p>This collection has no pets yet.</p>
            <button className="btn btnGhost" type="button" onClick={onClose}>Close</button>
          </div>
        )}
        {loaded && !collectionSlug && ownPets && ownPets.length > 0 && (
          <div className="roomPetSection">
            <h3 className="roomPetSectionLabel">Yours</h3>
            <div className="roomPetGrid">
              {ownPets.map(renderTile)}
            </div>
          </div>
        )}
        {loaded && !collectionSlug && favoritePets && favoritePets.length > 0 && (
          <div className="roomPetSection">
            <h3 className="roomPetSectionLabel">Favorites</h3>
            <div className="roomPetGrid">
              {favoritePets.map(renderTile)}
            </div>
          </div>
        )}
        {needsFallback && (
          <div className="roomPetSection">
            <h3 className="roomPetSectionLabel">Newest uploads</h3>
            <p className="roomGateLead" style={{ marginTop: 0, marginBottom: 8 }}>
              No pets of your own — pick a fresh one to ride into the room.
            </p>
            {fallbackPets === null && (
              <p className="roomGateLead" style={{ textAlign: "center", padding: "8px 0" }}>loading…</p>
            )}
            {fallbackPets && fallbackPets.length > 0 && (
              <div className="roomPetGrid">
                {fallbackPets.map(renderTile)}
              </div>
            )}
            {fallbackPets && fallbackPets.length === 0 && (
              <div className="roomGateEmpty">
                <p>No pets uploaded yet — be the first.</p>
                <a
                  className="btn btnPrimary"
                  href="#/upload"
                  onClick={() => onClose()}
                >
                  Upload a pet
                </a>
              </div>
            )}
          </div>
        )}
        <div className="formActions">
          <button className="btn btnGhost" type="button" onClick={onClose}>Cancel</button>
        </div>
      </section>
    </div>
  );
}
