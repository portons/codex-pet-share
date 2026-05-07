import { useState, type RefObject } from "react";
import type { BallSystem, NpcSystem, TrampolineSystem } from "../world/toys";
import type { PlaygroundPeer, RoomMode } from "../room/types";
import { useNpcPopoverPosition } from "./useNpcPopoverPosition";

export function useNpcControls({
  roomMode,
  ballsSystemRef,
  npcSystemRef,
  trampSystemRef,
  clearParticlesRef
}: {
  roomMode?: RoomMode;
  ballsSystemRef: RefObject<BallSystem | null>;
  npcSystemRef: RefObject<NpcSystem | null>;
  trampSystemRef: RefObject<TrampolineSystem | null>;
  clearParticlesRef: RefObject<(() => void) | null>;
}) {
  const [npcChips, setNpcChips] = useState<Array<{ id: string; petId: string; displayName: string }>>([]);
  const [npcSearchOpen, setNpcSearchOpen] = useState(false);
  const [npcQuery, setNpcQuery] = useState("");
  const { npcAddBtnRef, npcPopoverPos } = useNpcPopoverPosition(npcSearchOpen);

  function refreshNpcChips() {
    const list = npcSystemRef.current?.list() ?? [];
    setNpcChips(list);
  }

  function spawnNpc(p: PlaygroundPeer) {
    const id = npcSystemRef.current?.add(p);
    if (id) {
      refreshNpcChips();
      setNpcSearchOpen(false);
      setNpcQuery("");
    }
  }

  function despawnNpc(npcId: string) {
    npcSystemRef.current?.remove(npcId);
    refreshNpcChips();
  }

  function resetWorld() {
    if (roomMode?.isPermanent) {
      const ownerId = roomMode.ownUserId;
      ballsSystemRef.current?.removeByOwner(ownerId);
      trampSystemRef.current?.removeByOwner(ownerId);
      npcSystemRef.current?.clear();
      roomMode.channel.broadcastWorldDiff({
        kind: "reset:owner",
        payload: { ownerId }
      });
      clearParticlesRef.current?.();
      refreshNpcChips();
      setNpcSearchOpen(false);
      return;
    }
    npcSystemRef.current?.clear();
    ballsSystemRef.current?.clear();
    trampSystemRef.current?.clear();
    if (roomMode?.kind === "host") {
      roomMode.channel.broadcastWorldDiff({ kind: "reset" });
    }
    clearParticlesRef.current?.();
    refreshNpcChips();
    setNpcSearchOpen(false);
  }

  return {
    npcChips,
    npcSearchOpen,
    setNpcSearchOpen,
    npcQuery,
    setNpcQuery,
    npcAddBtnRef,
    npcPopoverPos,
    spawnNpc,
    despawnNpc,
    resetWorld
  };
}
