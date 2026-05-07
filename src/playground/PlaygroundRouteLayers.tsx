import { Suspense, lazy, type Dispatch, type SetStateAction } from "react";
import type { AuthSession, CollectionSummary, Pet, Route, User } from "../domain/types";
import { navigate } from "../domain/routing";

const PetPlaygroundModal = lazy(() =>
  import("./PetPlaygroundModal").then((module) => ({ default: module.PetPlaygroundModal }))
);

const PlaygroundRoomGate = lazy(() =>
  import("./room/PlaygroundRoomGate").then((module) => ({ default: module.PlaygroundRoomGate }))
);

export function PlaygroundRouteLayers({
  route,
  user,
  session,
  playgroundPet,
  favoritePets,
  collections,
  setPlaygroundPet,
  setAuthMode,
  apiFetch
}: {
  route: Route;
  user: User | null;
  session: AuthSession | null;
  playgroundPet: Pet | null;
  favoritePets: Pet[];
  collections: CollectionSummary[];
  setPlaygroundPet: Dispatch<SetStateAction<Pet | null>>;
  setAuthMode: Dispatch<SetStateAction<"login" | "register">>;
  apiFetch: (path: string, init?: RequestInit, authSession?: AuthSession | null) => Promise<Response>;
}) {
  return (
    <>
      {playgroundPet && route.name !== "room" && (
        <Suspense fallback={null}>
          <PetPlaygroundModal
            pet={playgroundPet}
            peers={favoritePets.map((p) => ({ id: p.id, displayName: p.displayName, spritesheetUrl: p.spritesheetUrl }))}
            availableCollections={collections.map((c) => ({ slug: c.slug, displayName: c.displayName }))}
            onClose={() => setPlaygroundPet(null)}
            onOpenAsRoom={user ? async (opts?: { name?: string; collectionSlug?: string }) => {
              try {
                const res = await apiFetch("/api/rooms", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    pet_id: playgroundPet.id,
                    display_name: opts?.name || undefined,
                    collection_slug: opts?.collectionSlug || undefined
                  })
                }, session);
                if (!res.ok) throw new Error("Couldn't create room");
                const body = await res.json() as { id: string };
                setPlaygroundPet(null);
                navigate(`#/rooms/${body.id}`);
              } catch (err) {
                console.error("create room failed", err);
              }
            } : undefined}
          />
        </Suspense>
      )}
      {route.name === "room" && user && session && (
        <Suspense fallback={null}>
          <PlaygroundRoomGate
            roomId={route.id}
            user={user}
            apiFetch={(path, init) => apiFetch(path, init, session)}
            accessToken={session.accessToken}
            refreshToken={session.refreshToken}
            onClose={() => navigate("#/")}
          />
        </Suspense>
      )}
      {route.name === "room" && !user && (
        <div className="modalBackdrop" role="presentation" onClick={() => navigate("#/")}>
          <section className="authModal roomSignInGate" role="dialog" aria-modal="true">
            <span className="roomGateCallsign">
              <span className="roomDot" aria-hidden="true" />
              <span>checkpoint · {route.id}</span>
            </span>
            <h2>Sign in to join</h2>
            <p>Playground rooms are for signed-in pets. Bring your account, pick one, and join the floor.</p>
            <div className="formActions">
              <button className="btn btnPrimary" type="button" onClick={() => { setAuthMode("login"); navigate("#/"); }}>Sign in</button>
              <button className="btn btnGhost" type="button" onClick={() => navigate("#/")}>Cancel</button>
            </div>
          </section>
        </div>
      )}
      {route.name === "collectionRoom" && user && session && (
        <Suspense fallback={null}>
          <PlaygroundRoomGate
            roomId={`c-${route.slug}`}
            permanentCollectionSlug={route.slug}
            user={user}
            apiFetch={(path, init) => apiFetch(path, init, session)}
            accessToken={session.accessToken}
            refreshToken={session.refreshToken}
            onClose={() => navigate(`#/collections/${route.slug}`)}
          />
        </Suspense>
      )}
      {route.name === "collectionRoom" && !user && (
        <div className="modalBackdrop" role="presentation" onClick={() => navigate(`#/collections/${route.slug}`)}>
          <section className="authModal roomSignInGate" role="dialog" aria-modal="true">
            <span className="roomGateCallsign">
              <span className="roomDot" aria-hidden="true" />
              <span>checkpoint · {route.slug}</span>
            </span>
            <h2>Sign in to join</h2>
            <p>The collection playground is open to signed-in pets. Bring your account and join the floor.</p>
            <div className="formActions">
              <button className="btn btnPrimary" type="button" onClick={() => { setAuthMode("login"); navigate(`#/collections/${route.slug}`); }}>Sign in</button>
              <button className="btn btnGhost" type="button" onClick={() => navigate(`#/collections/${route.slug}`)}>Cancel</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
