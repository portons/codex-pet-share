import { Suspense, lazy, useEffect, useRef } from "react";
import type { User } from "../../domain/types";
import type { CollectionIndexHandle, RoomHandle } from "../../realtime/roomChannel";
import type { RoomMode } from "./types";
import { PetPicker } from "../ui/PetPicker";
import { RoomConnectingGate, RoomErrorGate, RoomFullGate, RoomLoadingGate } from "./RoomGateStatusViews";
import { useRoomMetadata } from "./useRoomMetadata";
import { useRoomPeerPalette } from "./useRoomPeerPalette";

const PetPlaygroundModal = lazy(() =>
  import("../PetPlaygroundModal").then((m) => ({ default: m.PetPlaygroundModal }))
);

export function PlaygroundRoomGate({
  roomId,
  permanentCollectionSlug,
  user,
  apiFetch,
  accessToken,
  refreshToken,
  onClose
}: {
  roomId: string;
  permanentCollectionSlug?: string;
  user: User;
  apiFetch: (path: string, init?: RequestInit) => Promise<Response>;
  accessToken: string;
  refreshToken?: string;
  onClose: () => void;
}) {
  const {
    status,
    setStatus,
    collectionSlug,
    roomDisplayName
  } = useRoomMetadata({ roomId, permanentCollectionSlug, apiFetch });
  const peers = useRoomPeerPalette({ collectionSlug, apiFetch });

  const channelPromiseRef = useRef<Promise<RoomHandle | null> | null>(null);
  const channelHandleRef = useRef<RoomHandle | null>(null);
  const indexHandleRef = useRef<CollectionIndexHandle | null>(null);
  const connectingPetId = status.kind === "connecting" ? status.pet.id : null;

  useEffect(() => {
    if (status.kind !== "connecting") return;
    const snapshot = status;
    if (!channelPromiseRef.current) {
      channelPromiseRef.current = (async () => {
        try {
          const { prepareRealtimeClient } = await import("../../realtime/providerClient");
          const { joinRoom } = await import("../../realtime/roomChannel");
          const client = await prepareRealtimeClient({ accessToken, refreshToken });
          const presence = {
            userId: user.id,
            displayName: user.displayName || "Player",
            petId: snapshot.pet.id,
            petDisplayName: snapshot.pet.displayName,
            spritesheetUrl: snapshot.pet.spritesheetUrl,
            joinedAt: Date.now()
          };
          const handle = joinRoom(client, roomId, presence, {
            onPresenceSync: () => {},
            onPos: () => {},
            onChat: () => {},
            onBallSpawnRequest: () => {},
            onBallState: () => {},
            onBallRemove: () => {},
            onNpcState: () => {},
            onWorldDiff: () => {},
            onHostClosing: () => {},
            onHostKick: () => {},
            onPetSwap: () => {},
            onWorldRequest: () => {},
            onSubscribed: () => {},
            onError: () => {}
          });
          channelHandleRef.current = handle;
          if (permanentCollectionSlug) {
            try {
              const { joinCollectionIndex } = await import("../../realtime/roomChannel");
              indexHandleRef.current = joinCollectionIndex(client, user.id, permanentCollectionSlug);
            } catch {
              // The room still works; this only suppresses the gallery live count.
            }
          }
          return handle;
        } catch (err) {
          channelPromiseRef.current = null;
          throw err;
        }
      })();
    }
    let active = true;
    channelPromiseRef.current.then(async (handle) => {
      if (!active || !handle) return;
      const { MAX_ROOM_USERS } = await import("../../realtime/roomChannel");
      await new Promise((r) => setTimeout(r, 700));
      if (!active) return;

      const members = handle.presence();
      let isHost = snapshot.rooms.isHost;
      let hostUserId = snapshot.rooms.hostId;
      if (permanentCollectionSlug) {
        const earliest = members.reduce<typeof members[number] | null>(
          (acc, m) => (acc === null || m.joinedAt < acc.joinedAt ? m : acc),
          null
        );
        if (earliest) {
          isHost = earliest.userId === user.id;
          hostUserId = earliest.userId;
        } else {
          isHost = true;
          hostUserId = user.id;
        }
      }
      if (!isHost && members.length > MAX_ROOM_USERS) {
        try { await handle.leave(); } catch { /* ignore */ }
        channelPromiseRef.current = null;
        channelHandleRef.current = null;
        setStatus({ kind: "full", rooms: snapshot.rooms, pet: snapshot.pet });
        return;
      }
      const mode: RoomMode = {
        kind: isHost ? "host" : "guest",
        roomId,
        displayName: roomDisplayName,
        collectionSlug,
        channel: handle,
        ownUserId: user.id,
        ownDisplayName: user.displayName || "Player",
        hostUserId,
        isPermanent: !!permanentCollectionSlug
      };
      setStatus({ kind: "ready", rooms: snapshot.rooms, pet: snapshot.pet, mode });
    }).catch((err) => {
      if (!active) return;
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Couldn't connect to the room."
      });
    });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectingPetId, accessToken, refreshToken, user.id, roomId]);

  const isHostRef = useRef(false);
  isHostRef.current = (status.kind === "ready" && status.rooms.isHost)
    || (status.kind === "connecting" && status.rooms.isHost)
    || (status.kind === "pickPet" && status.rooms.isHost)
    || (status.kind === "full" && status.rooms.isHost);
  const apiFetchRef = useRef(apiFetch);
  apiFetchRef.current = apiFetch;
  const accessTokenRef = useRef(accessToken);
  accessTokenRef.current = accessToken;

  async function closeRoomBestEffort(opts: { keepalive: boolean }): Promise<void> {
    if (!isHostRef.current) return;
    if (permanentCollectionSlug) return;
    const handle = channelHandleRef.current;
    if (handle) {
      try { handle.broadcastHostClosing(); } catch { /* ignore */ }
    }
    if (opts.keepalive) {
      const base = String(import.meta.env.VITE_APP_API_BASE_URL || "").replace(/\/$/, "");
      void fetch(`${base}/api/rooms/${roomId}/close`, {
        method: "POST",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessTokenRef.current}`
        }
      }).catch(() => { /* ignore */ });
      return;
    }
    try {
      await apiFetchRef.current(`/api/rooms/${roomId}/close`, { method: "POST" });
    } catch {
      // Close is best-effort; auth refresh is handled inside apiFetch.
    }
  }

  useEffect(() => {
    function onBeforeUnload() {
      void closeRoomBestEffort({ keepalive: true });
      const handle = channelHandleRef.current;
      if (handle) {
        try { void handle.channel.untrack?.(); } catch { /* best-effort */ }
      }
      const indexHandle = indexHandleRef.current;
      if (indexHandle) {
        try { void indexHandle.channel.untrack?.(); } catch { /* best-effort */ }
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pagehide", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pagehide", onBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      void closeRoomBestEffort({ keepalive: false });
      const p = channelPromiseRef.current;
      channelPromiseRef.current = null;
      channelHandleRef.current = null;
      if (p) p.then((h) => h && h.leave()).catch(() => {});
      const indexHandle = indexHandleRef.current;
      indexHandleRef.current = null;
      if (indexHandle) {
        void indexHandle.leave().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleClose() {
    if (isHostRef.current) {
      try { await closeRoomBestEffort({ keepalive: false }); } catch { /* ignore */ }
    }
    onClose();
  }

  if (status.kind === "loading") {
    return <RoomLoadingGate roomId={roomId} roomDisplayName={roomDisplayName} />;
  }

  if (status.kind === "full") {
    const fullSnapshot = status;
    return (
      <RoomFullGate
        roomId={roomId}
        onRetry={() => setStatus({ kind: "connecting", rooms: fullSnapshot.rooms, pet: fullSnapshot.pet })}
        onClose={onClose}
      />
    );
  }

  if (status.kind === "error") {
    return <RoomErrorGate roomId={roomId} message={status.message} onClose={onClose} />;
  }

  if (status.kind === "pickPet") {
    return (
      <PetPicker
        apiFetch={apiFetch}
        roomId={roomId}
        roomDisplayName={roomDisplayName}
        collectionSlug={collectionSlug}
        hostName={status.rooms.hostDisplayName}
        onPick={(picked) => setStatus({ kind: "connecting", rooms: status.rooms, pet: picked })}
        onClose={onClose}
      />
    );
  }

  if (status.kind === "connecting") {
    return <RoomConnectingGate roomId={roomId} roomDisplayName={roomDisplayName} status={status} />;
  }

  return (
    <Suspense fallback={null}>
      <PetPlaygroundModal
        pet={status.pet}
        peers={peers ?? []}
        onClose={handleClose}
        roomMode={status.mode}
        apiFetch={apiFetch}
      />
    </Suspense>
  );
}
