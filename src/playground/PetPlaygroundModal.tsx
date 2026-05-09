import { useEffect, useRef, useState } from "react";
import type { Scene, Sprite, Texture } from "three";
import type { Pet } from "../domain/types";
import type { RoomPresence } from "../realtime/roomChannel";
import { CHAT_BUBBLE_TTL_MS, FLOOR_HALF, type StateId } from "./core/config";
import { MAX_NPCS, type BallSystem, type NpcSystem, type TrampolineSystem } from "./world/toys";
import type { PlaygroundPeer, RoomMode } from "./room/types";
import type { RemoteNpc, RemotePet } from "./room/remoteActors";
import { buildControlsHint } from "./core/controlsHint";
import { useFullscreenControls } from "./hooks/useFullscreenControls";
import { useNpcControls } from "./hooks/useNpcControls";
import { usePetSwap } from "./hooks/usePetSwap";
import { usePlaygroundMinimap } from "./hooks/usePlaygroundMinimap";
import { usePlaygroundRoomHandlers } from "./room/usePlaygroundRoomHandlers";
import { usePlaygroundSceneLoop } from "./hooks/usePlaygroundSceneLoop";
import { useRoomBubbles } from "./hooks/useRoomBubbles";
import { PlaygroundRoomHud } from "./room/PlaygroundRoomHud";
import { PlaygroundChatBar } from "./ui/PlaygroundChatBar";
import { PlaygroundHeader } from "./ui/PlaygroundHeader";
import { PlaygroundNpcBar } from "./ui/PlaygroundNpcBar";
import { NpcSearchPopover } from "./ui/npcSearchPopover";
import { TouchControls } from "./ui/touchControls";

export function PetPlaygroundModal({
  pet,
  peers,
  onClose,
  roomMode,
  onOpenAsRoom,
  availableCollections
}: {
  pet: Pet;
  peers?: PlaygroundPeer[];
  onClose: () => void | Promise<void>;
  roomMode?: RoomMode;
  onOpenAsRoom?: (opts?: { name?: string; collectionSlug?: string }) => void | Promise<void>;
  availableCollections?: Array<{ slug: string; displayName: string }>;
  apiFetch?: (path: string, init?: RequestInit) => Promise<Response>;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const minimapRef = useRef<HTMLCanvasElement | null>(null);
  const overlayLayerRef = useRef<HTMLDivElement | null>(null);
  const clearPressedKeysRef = useRef<(() => void) | null>(null);

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [activeState, setActiveState] = useState<StateId>("idle");
  const [members, setMembers] = useState<RoomPresence[]>([]);

  const ballsSystemRef = useRef<BallSystem | null>(null);
  const npcSystemRef = useRef<NpcSystem | null>(null);
  const trampSystemRef = useRef<TrampolineSystem | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const spriteRef = useRef<Sprite | null>(null);
  const spriteTextureRef = useRef<Texture | null>(null);
  const loadingOrbTextureRef = useRef<Texture | null>(null);
  const clearParticlesRef = useRef<(() => void) | null>(null);
  const remotePetsRef = useRef<Map<string, RemotePet>>(new Map());
  const remoteNpcsRef = useRef<Map<string, RemoteNpc>>(new Map());
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const { chatBubbles, setChatBubbles, joinToasts, pushJoinToast } = useRoomBubbles(roomMode);
  const {
    modalSectionRef,
    isFullscreen,
    coarsePointer,
    showTouchControls,
    setTouchControlsOverride,
    toggleFullscreen
  } = useFullscreenControls();
  const {
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
  } = useNpcControls({
    roomMode,
    ballsSystemRef,
    npcSystemRef,
    trampSystemRef,
    clearParticlesRef
  });

  const isGuest = roomMode?.kind === "guest";

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (npcSearchOpen) {
        setNpcSearchOpen(false);
        return;
      }
      onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, npcSearchOpen, setNpcSearchOpen]);

  usePlaygroundMinimap({
    minimapRef,
    spriteRef,
    remotePetsRef,
    npcSystemRef,
    remoteNpcsRef,
    floorHalf: FLOOR_HALF
  });

  usePlaygroundSceneLoop({
    pet,
    roomMode,
    status,
    canvasRef,
    wrapperRef,
    overlayLayerRef,
    clearPressedKeysRef,
    ballsSystemRef,
    npcSystemRef,
    trampSystemRef,
    sceneRef,
    spriteRef,
    spriteTextureRef,
    loadingOrbTextureRef,
    clearParticlesRef,
    remotePetsRef,
    remoteNpcsRef,
    setStatus,
    setErrorMessage,
    setActiveState
  });

  const {
    liveLocalPet,
    swapMenuRef,
    swapMenuOpen,
    setSwapMenuOpen,
    swapError,
    swapQuery,
    setSwapQuery,
    cooldownRemainingMs,
    swapCooling,
    swapToPet,
    hostClosed,
    setHostClosed
  } = usePetSwap({ pet, roomMode, spriteTextureRef, onCloseRef });

  usePlaygroundRoomHandlers({
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
  });

  return (
    <div
      className="modalBackdrop"
      role="presentation"
      onClick={(event) => {
        if (roomMode) return;
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={modalSectionRef}
        className="authModal playgroundModal"
        data-fullscreen={isFullscreen || undefined}
        role="dialog"
        aria-modal="true"
        aria-label={`3D playground for ${pet.displayName}`}
      >
        <PlaygroundHeader
          liveLocalPet={liveLocalPet}
          roomMode={roomMode}
          onOpenAsRoom={onOpenAsRoom}
          availableCollections={availableCollections ?? []}
          peers={peers ?? []}
          swapMenuRef={swapMenuRef}
          swapMenuOpen={swapMenuOpen}
          setSwapMenuOpen={setSwapMenuOpen}
          swapCooling={swapCooling}
          cooldownRemainingMs={cooldownRemainingMs}
          swapQuery={swapQuery}
          setSwapQuery={setSwapQuery}
          swapError={swapError}
          swapToPet={swapToPet}
          coarsePointer={coarsePointer}
          showTouchControls={showTouchControls}
          setTouchControlsOverride={setTouchControlsOverride}
          isFullscreen={isFullscreen}
          toggleFullscreen={toggleFullscreen}
          onClose={onClose}
        />
        <p className="playgroundControlsHint" aria-label="Playground controls">
          <span className="playgroundControlsHintInner">{buildControlsHint()}</span>
        </p>
        <div className="playgroundCanvasWrapper" ref={wrapperRef}>
          <canvas ref={canvasRef} className="playgroundCanvas" tabIndex={0} aria-label="3D playground viewport" />
          <canvas
            ref={minimapRef}
            className="playgroundMinimap"
            width={160}
            height={160}
            aria-hidden="true"
            data-touch={showTouchControls || undefined}
          />
          <div className="playgroundStateBadge" aria-live="polite">{activeState}</div>
          {showTouchControls && <TouchControls />}
          {(!isGuest || roomMode?.isPermanent) && (
            <PlaygroundNpcBar
              npcChips={npcChips}
              maxNpcs={MAX_NPCS}
              npcAddBtnRef={npcAddBtnRef}
              npcSearchOpen={npcSearchOpen}
              setNpcSearchOpen={setNpcSearchOpen}
              despawnNpc={despawnNpc}
              resetWorld={resetWorld}
            />
          )}
          <PlaygroundRoomHud
            roomMode={roomMode}
            overlayLayerRef={overlayLayerRef}
            chatBubbles={chatBubbles}
            members={members}
            livePetName={liveLocalPet.displayName}
            status={status}
            errorMessage={errorMessage}
            hostClosed={hostClosed}
            onLeaveHostClosed={() => onCloseRef.current()}
            joinToasts={joinToasts}
          />
        </div>
        {roomMode && (
          <PlaygroundChatBar
            ownDisplayName={roomMode.ownDisplayName}
            ownUserId={roomMode.ownUserId}
            channel={roomMode.channel}
            canvasRef={canvasRef}
            clearPressedKeysRef={clearPressedKeysRef}
            setChatBubbles={setChatBubbles}
            bubbleTtlMs={CHAT_BUBBLE_TTL_MS}
          />
        )}
      </section>
      {npcSearchOpen && npcPopoverPos && (
        <NpcSearchPopover
          peers={peers ?? []}
          excludeIds={[pet.id, ...npcChips.map((c) => c.petId)]}
          query={npcQuery}
          onQueryChange={setNpcQuery}
          onPick={spawnNpc}
          onClose={() => setNpcSearchOpen(false)}
          style={{ position: "fixed", top: npcPopoverPos.top, right: npcPopoverPos.right }}
        />
      )}
    </div>
  );
}
