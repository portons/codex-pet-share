import { useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import type { PlaygroundPeer, RoomMode } from "../room/types";
import { OpenAsRoomLauncher } from "./openAsRoomLauncher";
import { PetSwapMenu } from "./petSwapMenu";

export function PlaygroundHeader({
  liveLocalPet,
  roomMode,
  onOpenAsRoom,
  availableCollections,
  peers,
  swapMenuRef,
  swapMenuOpen,
  setSwapMenuOpen,
  swapCooling,
  cooldownRemainingMs,
  swapQuery,
  setSwapQuery,
  swapError,
  swapToPet,
  coarsePointer,
  showTouchControls,
  setTouchControlsOverride,
  isFullscreen,
  toggleFullscreen,
  onClose
}: {
  liveLocalPet: { id: string; displayName: string; spritesheetUrl: string };
  roomMode?: RoomMode;
  onOpenAsRoom?: (opts?: { name?: string; collectionSlug?: string }) => void | Promise<void>;
  availableCollections: Array<{ slug: string; displayName: string }>;
  peers: PlaygroundPeer[];
  swapMenuRef: RefObject<HTMLDivElement | null>;
  swapMenuOpen: boolean;
  setSwapMenuOpen: Dispatch<SetStateAction<boolean>>;
  swapCooling: boolean;
  cooldownRemainingMs: number;
  swapQuery: string;
  setSwapQuery: Dispatch<SetStateAction<string>>;
  swapError: string | null;
  swapToPet: (target: { id: string; displayName: string; spritesheetUrl: string }) => void | Promise<void>;
  coarsePointer: boolean;
  showTouchControls: boolean;
  setTouchControlsOverride: Dispatch<SetStateAction<boolean | null>>;
  isFullscreen: boolean;
  toggleFullscreen: () => void | Promise<void>;
  onClose: () => void | Promise<void>;
}) {
  const [shareCopied, setShareCopied] = useState(false);
  const [closing, setClosing] = useState(false);
  const shareUrl = roomMode && typeof window !== "undefined"
    ? (roomMode.isPermanent && roomMode.collectionSlug
        ? `${window.location.origin}/#/collections/${roomMode.collectionSlug}/play`
        : `${window.location.origin}/#/rooms/${roomMode.roomId}`)
    : "";

  async function copyShareLink() {
    if (!shareUrl) return;
    let ok = false;
    try {
      await navigator.clipboard.writeText(shareUrl);
      ok = true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = shareUrl;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        ok = false;
      }
    }
    if (ok) {
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 1400);
    } else if (typeof window !== "undefined") {
      window.prompt("Copy this room link:", shareUrl);
    }
  }

  return (
    <div className="modalHeader">
      <div className="modalTitle compact">
        <p className="metaText">Prontera playground</p>
        <h2>{liveLocalPet.displayName}</h2>
      </div>
      <div className="playgroundHeaderActions">
        {!roomMode && onOpenAsRoom && (
          <OpenAsRoomLauncher
            onOpenAsRoom={onOpenAsRoom}
            availableCollections={availableCollections}
          />
        )}
        {roomMode && (
          <span
            className="roomStatusChip"
            data-kind={roomMode.isPermanent ? "guest" : roomMode.kind}
            data-permanent={roomMode.isPermanent || undefined}
            aria-label={
              roomMode.isPermanent
                ? "You are in a permanent collection room"
                : roomMode.kind === "host" ? "You are hosting this room" : "You are visiting a room"
            }
          >
            <span className="roomDot" aria-hidden="true" />
            <span>{roomMode.isPermanent ? "Joined" : (roomMode.kind === "host" ? "Hosting" : "Joined")}</span>
            <span className="roomCallsignSep" aria-hidden="true">/</span>
            <span className="roomCallsign">{roomMode.displayName || roomMode.roomId}</span>
            <button
              type="button"
              className="roomShareBtn"
              onClick={copyShareLink}
              aria-label={shareCopied ? "Link copied" : "Copy room link"}
              data-tooltip={shareCopied ? "Copied!" : "Copy shareable link"}
              data-copied={shareCopied || undefined}
            >
              {shareCopied ? "✓ copied" : "copy link"}
            </button>
          </span>
        )}
        {roomMode && (
          <div className="petSwapWrap" ref={swapMenuRef}>
            <button
              type="button"
              className="playgroundHeaderIconBtn"
              onClick={() => setSwapMenuOpen((v) => !v)}
              aria-label="Change pet"
              aria-haspopup="menu"
              aria-expanded={swapMenuOpen}
              data-tooltip={swapCooling ? `Swap in ${Math.ceil(cooldownRemainingMs / 1000)}s` : "Change pet"}
              data-active={swapMenuOpen || undefined}
              disabled={swapCooling}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2 5H12M12 5L9 2M12 5L9 8" />
                <path d="M14 11H4M4 11L7 8M4 11L7 14" />
              </svg>
            </button>
            {swapMenuOpen && (
              <PetSwapMenu
                peers={peers}
                activeId={liveLocalPet.id}
                cooling={swapCooling}
                query={swapQuery}
                onQueryChange={setSwapQuery}
                error={swapError}
                onPick={(p) => { void swapToPet(p); }}
              />
            )}
          </div>
        )}
        {coarsePointer && (
          <>
            <button
              type="button"
              className="playgroundHeaderIconBtn"
              onClick={() => setTouchControlsOverride((v) => !(v ?? coarsePointer))}
              aria-label={showTouchControls ? "Hide on-screen controls" : "Show on-screen controls"}
              data-tooltip={showTouchControls ? "Hide controls" : "Show on-screen controls"}
              data-active={showTouchControls || undefined}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <circle cx="8" cy="3" r="1.5" />
                <circle cx="3" cy="8" r="1.5" />
                <circle cx="13" cy="8" r="1.5" />
                <circle cx="8" cy="13" r="1.5" />
              </svg>
            </button>
            <button
              type="button"
              className="playgroundHeaderIconBtn"
              onClick={() => { void toggleFullscreen(); }}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              data-tooltip={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              data-active={isFullscreen || undefined}
            >
              {isFullscreen ? (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 1V6H1" />
                  <path d="M1 10H6V15" />
                  <path d="M15 6H10V1" />
                  <path d="M10 15V10H15" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M1 6V1H6" />
                  <path d="M6 15H1V10" />
                  <path d="M10 1H15V6" />
                  <path d="M15 10V15H10" />
                </svg>
              )}
            </button>
          </>
        )}
        <button
          className="btn btnSm btnGhost modalCloseButton"
          type="button"
          onClick={() => {
            if (closing) return;
            if (roomMode?.kind === "host" && !roomMode.isPermanent) setClosing(true);
            const result = onClose();
            if (result && typeof (result as Promise<void>).then === "function") {
              (result as Promise<void>).catch(() => {});
            }
          }}
          disabled={closing}
          aria-busy={closing || undefined}
        >
          {closing ? (
            <>
              <span className="btnSpinner" aria-hidden="true" />
              Closing…
            </>
          ) : (roomMode?.isPermanent ? "Leave" : "Close")}
        </button>
      </div>
    </div>
  );
}
