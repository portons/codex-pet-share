import { useEffect, type Dispatch, type RefObject, type SetStateAction } from "react";
import * as THREE from "three";
import { petTextureAssetUrl } from "../../domain/http";
import type { RoomPresence } from "../../realtime/roomChannel";
import {
  CHAT_BUBBLE_TTL_MS,
  COLLECTION_BALL_CAP,
  COLLECTION_PAD_CAP,
  GUEST_BALL_CAP,
  GUEST_PAD_CAP,
  SPRITE_HEIGHT
} from "../core/config";
import type { BallSystem, NpcSystem, TrampolineSystem } from "../world/toys";
import { createRemoteNpc as createRemoteNpcActor, dropRemotePet, ensureRemotePet } from "./remoteActorScene";
import type { RemoteNpc, RemotePet } from "./remoteActors";
import type { ChatBubble } from "./roomOverlay";
import type { RoomMode } from "./types";
import { broadcastNpcSnapshot } from "./npcBroadcast";

function disposeRemoteNpc(scene: THREE.Scene, npc: RemoteNpc) {
  scene.remove(npc.sprite);
  npc.mat.dispose();
  npc.tex.dispose();
  if (npc.loadingOrb) {
    scene.remove(npc.loadingOrb);
    (npc.loadingOrb.material as THREE.SpriteMaterial).dispose();
  }
}

function broadcastPads(roomMode: RoomMode, trampSystem: TrampolineSystem | null) {
  const pads = trampSystem?.list() ?? [];
  for (const pad of pads) {
    roomMode.channel.broadcastWorldDiff({
      kind: "tramp:add",
      payload: {
        id: `${pad.x.toFixed(2)}_${pad.z.toFixed(2)}_replay`,
        x: pad.x,
        z: pad.z,
        ownerId: pad.ownerId ?? roomMode.hostUserId
      }
    });
  }
}

export function usePlaygroundRoomHandlers({
  roomMode,
  status,
  sceneRef,
  loadingOrbTextureRef,
  remotePetsRef,
  remoteNpcsRef,
  ballsSystemRef,
  npcSystemRef,
  trampSystemRef,
  setMembers,
  setChatBubbles,
  pushJoinToast,
  setHostClosed,
  onCloseRef
}: {
  roomMode?: RoomMode;
  status: "loading" | "ready" | "error";
  sceneRef: RefObject<THREE.Scene | null>;
  loadingOrbTextureRef: RefObject<THREE.Texture | null>;
  remotePetsRef: RefObject<Map<string, RemotePet>>;
  remoteNpcsRef: RefObject<Map<string, RemoteNpc>>;
  ballsSystemRef: RefObject<BallSystem | null>;
  npcSystemRef: RefObject<NpcSystem | null>;
  trampSystemRef: RefObject<TrampolineSystem | null>;
  setMembers: Dispatch<SetStateAction<RoomPresence[]>>;
  setChatBubbles: Dispatch<SetStateAction<ChatBubble[]>>;
  pushJoinToast: (text: string) => void;
  setHostClosed: Dispatch<SetStateAction<boolean>>;
  onCloseRef: RefObject<() => void | Promise<void>>;
}) {
  useEffect(() => {
    if (!roomMode || status !== "ready") return;
    const roomScene = sceneRef.current;
    if (!roomScene) return;
    const channel = roomMode.channel;

    function ensureRemote(presence: RoomPresence) {
      return ensureRemotePet({
        presence,
        ownUserId: roomMode!.ownUserId,
        scene: roomScene!,
        loadingOrbTexture: loadingOrbTextureRef.current,
        remotePets: remotePetsRef.current
      });
    }

    function dropRemote(userId: string) {
      dropRemotePet({ userId, scene: roomScene!, remotePets: remotePetsRef.current });
    }

    function createRemoteNpc(id: string, petId: string, spritesheetUrl: string, x: number, y: number, z: number): RemoteNpc {
      return createRemoteNpcActor({
        id,
        petId,
        spritesheetUrl,
        x,
        y,
        z,
        scene: roomScene!,
        loadingOrbTexture: loadingOrbTextureRef.current
      });
    }

    if (roomMode.kind === "guest") {
      try {
        roomMode.channel.broadcastWorldRequest({ requesterId: roomMode.ownUserId });
      } catch { /* best-effort */ }
    }

    const greeted = new Set<string>();
    channel.setHandlers({
      onPresenceSync: (next) => {
        setMembers(next);
        const seen = new Set<string>();
        const newcomers: Array<{ userId: string; presence: RoomPresence }> = [];
        const ownEntry = next.find((member) => member.userId === roomMode.ownUserId);
        const ownJoinedAt = ownEntry ? ownEntry.joinedAt : Number.POSITIVE_INFINITY;

        for (const member of next) {
          if (member.userId === roomMode.ownUserId) {
            seen.add(member.userId);
            continue;
          }
          ensureRemote(member);
          seen.add(member.userId);
          if (!greeted.has(member.userId)) {
            if (member.joinedAt > ownJoinedAt) {
              newcomers.push({ userId: member.userId, presence: member });
            }
            greeted.add(member.userId);
          }
        }

        for (const id of Array.from(remotePetsRef.current.keys())) {
          if (!seen.has(id)) {
            dropRemote(id);
            greeted.delete(id);
          }
        }

        if (remoteNpcsRef.current.size > 0) {
          for (const key of Array.from(remoteNpcsRef.current.keys())) {
            const sep = key.indexOf("::");
            const ownerId = sep > 0 ? key.slice(0, sep) : key;
            if (seen.has(ownerId)) continue;
            const remote = remoteNpcsRef.current.get(key);
            if (remote) {
              disposeRemoteNpc(roomScene, remote);
            }
            remoteNpcsRef.current.delete(key);
          }
        }

        for (const { presence } of newcomers) {
          pushJoinToast(`${presence.displayName} joined as ${presence.petDisplayName}`);
        }
        if (roomMode.kind === "host" && newcomers.length > 0) {
          broadcastPads(roomMode, trampSystemRef.current);
        }
      },
      onPos: (event) => {
        if (event.userId === roomMode.ownUserId) return;
        const remote = remotePetsRef.current.get(event.userId);
        if (!remote) return;
        const nowMs = performance.now();
        if (remote.targetTime === remote.spawnTime) {
          remote.sprite.position.set(event.x, event.y, event.z);
          if (remote.loadingOrb) {
            remote.loadingOrb.position.set(event.x, event.y + SPRITE_HEIGHT * 0.35, event.z);
          }
        }
        remote.targetX = event.x;
        remote.targetY = event.y;
        remote.targetZ = event.z;
        remote.targetTime = nowMs;
        remote.scaleX = event.scaleX;
        remote.scaleY = event.scaleY;
        remote.vx = event.vx;
        remote.vy = event.vy ?? 0;
        remote.vz = event.vz;
        if (event.row !== remote.row) {
          remote.row = event.row;
          remote.rowStart = nowMs;
        }
        remote.frame = event.frame;
        remote.sprinting = !!event.sprinting;
      },
      onBallSpawnRequest: (event) => {
        if (roomMode.kind !== "host") return;
        const system = ballsSystemRef.current;
        if (!system) return;
        const isPermanent = !!roomMode.isPermanent;
        const ballCap = isPermanent ? COLLECTION_BALL_CAP : GUEST_BALL_CAP;
        const enforceBallCap = isPermanent || event.requesterId !== roomMode.hostUserId;
        if (enforceBallCap) {
          while (system.countForOwner(event.requesterId) >= ballCap) {
            system.removeOldestForOwner(event.requesterId);
          }
        }
        const id = `b-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        system.spawnWithId(
          id,
          event.requesterId,
          new THREE.Vector3(event.origin.x, event.origin.y, event.origin.z),
          event.fx,
          event.fz,
          event.sprinting
        );
      },
      onBallState: (event) => {
        if (roomMode.kind === "host") return;
        const system = ballsSystemRef.current;
        if (!system) return;
        const incoming = new Set(event.balls.map((ball) => ball.id));
        for (const snap of event.balls) {
          system.applySnapshot(snap);
        }
        for (const id of system.snapshot().map((ball) => ball.id)) {
          if (!incoming.has(id)) system.removeById(id);
        }
      },
      onBallRemove: (event) => {
        if (roomMode.kind === "host") return;
        const system = ballsSystemRef.current;
        if (!system) return;
        for (const id of event.ids) system.removeById(id);
      },
      onNpcState: (event) => {
        if (event.ownerId === roomMode.ownUserId) return;
        const ownerId = event.ownerId;
        const incomingKeys = new Set<string>();
        for (const snap of event.npcs) {
          const key = `${ownerId}::${snap.id}`;
          incomingKeys.add(key);
          let remote = remoteNpcsRef.current.get(key);
          if (!remote) {
            remote = createRemoteNpc(snap.id, snap.petId, snap.spritesheetUrl, snap.x, snap.y, snap.z);
            remoteNpcsRef.current.set(key, remote);
          }
          remote.targetX = snap.x;
          remote.targetY = snap.y;
          remote.targetZ = snap.z;
          remote.targetTime = performance.now();
          remote.vx = snap.vx;
          remote.vz = snap.vz;
        }

        const ownerPrefix = `${ownerId}::`;
        for (const key of Array.from(remoteNpcsRef.current.keys())) {
          if (!key.startsWith(ownerPrefix)) continue;
          if (incomingKeys.has(key)) continue;
          const remote = remoteNpcsRef.current.get(key);
          if (remote) {
            disposeRemoteNpc(roomScene, remote);
          }
          remoteNpcsRef.current.delete(key);
        }
      },
      onWorldDiff: (event) => {
        if (event.kind === "tramp:add") {
          if (event.payload.ownerId === roomMode.ownUserId) return;
          const isPermanent = !!roomMode.isPermanent;
          const padCap = isPermanent ? COLLECTION_PAD_CAP : GUEST_PAD_CAP;
          const enforce = isPermanent || event.payload.ownerId !== roomMode.hostUserId;
          if (enforce) {
            while ((trampSystemRef.current?.countForOwner(event.payload.ownerId) ?? 0) >= padCap) {
              trampSystemRef.current?.removeOldestForOwner(event.payload.ownerId);
            }
          }
          trampSystemRef.current?.place(event.payload.x, event.payload.z, event.payload.ownerId);
        } else if (event.kind === "reset:owner") {
          ballsSystemRef.current?.removeByOwner(event.payload.ownerId);
          trampSystemRef.current?.removeByOwner(event.payload.ownerId);
        } else if (event.kind === "reset") {
          if (roomMode.kind === "host") return;
          ballsSystemRef.current?.clear();
          trampSystemRef.current?.clear();
          npcSystemRef.current?.clear();
        }
      },
      onChat: (event) => {
        const expiresAt = performance.now() + CHAT_BUBBLE_TTL_MS;
        setChatBubbles((prev) => {
          const filtered = prev.filter((bubble) => bubble.userId !== event.userId);
          return [...filtered, { userId: event.userId, text: event.text, expiresAt }];
        });
      },
      onHostClosing: () => {
        if (roomMode.kind === "guest") setHostClosed(true);
      },
      onHostKick: (event) => {
        if (event.userId === roomMode.ownUserId) onCloseRef.current();
      },
      onWorldRequest: (event) => {
        if (event.requesterId === roomMode.ownUserId) return;
        if (roomMode.kind === "host") {
          broadcastPads(roomMode, trampSystemRef.current);
          if (ballsSystemRef.current) {
            roomMode.channel.broadcastBallState({
              balls: ballsSystemRef.current.snapshot()
            });
          }
        }
        broadcastNpcSnapshot(roomMode, npcSystemRef.current);
      },
      onPetSwap: (event) => {
        if (event.userId === roomMode.ownUserId) return;
        const remote = remotePetsRef.current.get(event.userId);
        if (!remote) return;
        const spritesheetUrl = petTextureAssetUrl(event.spritesheetUrl);
        if (remote.spritesheetUrl === spritesheetUrl) return;
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.decoding = "async";
        img.onload = () => {
          remote.tex.image = img;
          remote.tex.needsUpdate = true;
          remote.spritesheetUrl = spritesheetUrl;
          remote.petDisplayName = event.petDisplayName;
        };
        img.onerror = () => { /* silent */ };
        img.src = spritesheetUrl;
      }
    });

    return () => {
      channel.setHandlers({
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
        onWorldRequest: () => {}
      });
      for (const id of Array.from(remotePetsRef.current.keys())) {
        dropRemote(id);
      }
    };
  }, [
    roomMode,
    status,
    sceneRef,
    loadingOrbTextureRef,
    remotePetsRef,
    remoteNpcsRef,
    ballsSystemRef,
    npcSystemRef,
    trampSystemRef,
    setMembers,
    setChatBubbles,
    pushJoinToast,
    setHostClosed,
    onCloseRef
  ]);
}
