import { useEffect, useState } from "react";
import { normalizePet } from "../../domain/pets";
import type { Pet } from "../../domain/types";

export type RoomFetch = {
  id: string;
  hostId: string;
  hostDisplayName: string;
  hostPetId: string | null;
  hostPet: Pet | null;
  displayName: string | null;
  collectionSlug: string | null;
  worldState: { trampolines: unknown[]; npcs: unknown[] };
  isHost: boolean;
};

export type RoomGateStatus =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "pickPet"; rooms: RoomFetch }
  | { kind: "connecting"; rooms: RoomFetch; pet: Pet }
  | { kind: "ready"; rooms: RoomFetch; pet: Pet; mode: import("./types").RoomMode }
  | { kind: "full"; rooms: RoomFetch; pet: Pet };

export function roomGateCollectionSlug(status: RoomGateStatus) {
  return status.kind !== "loading" && status.kind !== "error" && "rooms" in status
    ? status.rooms.collectionSlug ?? undefined
    : undefined;
}

export function roomGateDisplayName(status: RoomGateStatus) {
  return status.kind !== "loading" && status.kind !== "error" && "rooms" in status
    ? status.rooms.displayName ?? undefined
    : undefined;
}

export function useRoomMetadata({
  roomId,
  permanentCollectionSlug,
  apiFetch
}: {
  roomId: string;
  permanentCollectionSlug?: string;
  apiFetch: (path: string, init?: RequestInit) => Promise<Response>;
}) {
  const [status, setStatus] = useState<RoomGateStatus>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (permanentCollectionSlug) {
          const res = await apiFetch(`/api/collections/${permanentCollectionSlug}`);
          if (cancelled) return;
          if (!res.ok) {
            setStatus({ kind: "error", message: "This collection no longer exists." });
            return;
          }
          const body = await res.json().catch(() => ({}));
          const displayName = (body?.collection?.displayName as string) || permanentCollectionSlug;
          const synthesized: RoomFetch = {
            id: roomId,
            hostId: "",
            hostDisplayName: displayName,
            hostPetId: null,
            hostPet: null,
            displayName,
            collectionSlug: permanentCollectionSlug,
            worldState: { trampolines: [], npcs: [] },
            isHost: false
          };
          setStatus({ kind: "pickPet", rooms: synthesized });
          return;
        }
        const res = await apiFetch(`/api/rooms/${roomId}`);
        if (cancelled) return;
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const msg =
            res.status === 404 ? "This room is closed or doesn't exist."
            : res.status === 403 ? "You're banned from this room."
            : (body && typeof body.error === "string" ? body.error : `Couldn't load room (${res.status}).`);
          setStatus({ kind: "error", message: msg });
          return;
        }
        const room = (await res.json()) as RoomFetch;
        if (room.hostPet) room.hostPet = normalizePet(room.hostPet);
        if (room.isHost && room.hostPet) {
          setStatus({ kind: "connecting", rooms: room, pet: room.hostPet });
        } else {
          setStatus({ kind: "pickPet", rooms: room });
        }
      } catch (err) {
        if (cancelled) return;
        setStatus({ kind: "error", message: err instanceof Error ? err.message : "Couldn't load the room." });
      }
    })();
    return () => { cancelled = true; };
  }, [roomId, apiFetch, permanentCollectionSlug]);

  return {
    status,
    setStatus,
    collectionSlug: roomGateCollectionSlug(status),
    roomDisplayName: roomGateDisplayName(status)
  };
}
