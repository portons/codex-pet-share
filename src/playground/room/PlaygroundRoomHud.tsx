import type { RefObject } from "react";
import type { RoomPresence } from "../../realtime/roomChannel";
import type { ChatBubble } from "./roomOverlay";
import { RoomOverlay } from "./roomOverlay";
import type { RoomMode } from "./types";

export function PlaygroundRoomHud({
  roomMode,
  overlayLayerRef,
  chatBubbles,
  members,
  livePetName,
  status,
  errorMessage,
  hostClosed,
  onLeaveHostClosed,
  joinToasts
}: {
  roomMode?: RoomMode;
  overlayLayerRef: RefObject<HTMLDivElement | null>;
  chatBubbles: ChatBubble[];
  members: RoomPresence[];
  livePetName: string;
  status: "loading" | "ready" | "error";
  errorMessage: string;
  hostClosed: boolean;
  onLeaveHostClosed: () => void;
  joinToasts: Array<{ id: string; text: string }>;
}) {
  return (
    <>
      {roomMode && (
        <RoomOverlay
          overlayRef={overlayLayerRef}
          chatBubbles={chatBubbles}
          presences={[
            {
              userId: roomMode.ownUserId,
              displayName: roomMode.ownDisplayName,
              petName: livePetName
            },
            ...members
              .filter((m) => m.userId !== roomMode.ownUserId)
              .map((m) => ({
                userId: m.userId,
                displayName: m.displayName,
                petName: m.petDisplayName
              }))
          ]}
        />
      )}
      {status === "loading" && (
        <div className="playgroundOverlay">Loading sprite…</div>
      )}
      {status === "error" && (
        <div className="playgroundOverlay error">Failed: {errorMessage}</div>
      )}
      {hostClosed && (
        <div className="playgroundHostClosedOverlay" role="alertdialog" aria-live="assertive">
          <div className="playgroundHostClosedCard">
            <p className="playgroundHostClosedHeading">The host closed this room.</p>
            <p className="playgroundHostClosedSub">Heading back to the gallery in a few seconds…</p>
            <button
              type="button"
              className="btn btnPrimary"
              onClick={onLeaveHostClosed}
            >
              Leave now
            </button>
          </div>
        </div>
      )}
      {joinToasts.length > 0 && (
        <div className="playgroundJoinToasts" aria-live="polite">
          {joinToasts.map((t) => (
            <div key={t.id} className="playgroundJoinToast">
              <span className="playgroundJoinToastDot" aria-hidden="true" />
              <span>{t.text}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
