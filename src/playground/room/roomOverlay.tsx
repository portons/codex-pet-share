import type { RefObject } from "react";
import * as THREE from "three";
import { worldToScreen } from "../core/projection";

export type ChatBubble = {
  userId: string;
  text: string;
  expiresAt: number;
};

export type RoomOverlayPresence = {
  userId: string;
  displayName: string;
  petName: string;
};

const anchorScratch = new THREE.Vector3();
const anchorScreen = { x: 0, y: 0, visible: false };

export function positionAnchor(
  node: HTMLElement,
  sprite: THREE.Sprite,
  camera: THREE.Camera,
  renderer: THREE.WebGLRenderer
) {
  anchorScratch.set(
    sprite.position.x,
    sprite.position.y + sprite.scale.y * 1.25,
    sprite.position.z
  );
  worldToScreen(camera, renderer, anchorScratch, anchorScreen);
  if (anchorScreen.visible) {
    node.style.display = "";
    node.style.transform = `translate(calc(${anchorScreen.x}px - 50%), calc(${anchorScreen.y}px - 100%))`;
  } else {
    node.style.display = "none";
  }
}

export function RoomOverlay({
  presences,
  chatBubbles,
  overlayRef
}: {
  presences: RoomOverlayPresence[];
  chatBubbles: ChatBubble[];
  overlayRef: RefObject<HTMLDivElement | null>;
}) {
  const bubbleByUser = new Map<string, string>();
  for (const bubble of chatBubbles) {
    bubbleByUser.set(bubble.userId, bubble.text);
  }
  return (
    <div className="roomOverlay" aria-hidden="true" ref={overlayRef}>
      {presences.map((presence) => (
        <div
          key={presence.userId}
          className="roomAnchor"
          data-userid={presence.userId}
          style={{ display: "none" }}
        >
          {bubbleByUser.has(presence.userId) && (
            <div className="roomBubble">{bubbleByUser.get(presence.userId)}</div>
          )}
          <div className="roomBadge">
            <span className="roomBadgeName">{presence.displayName}</span>
            <span className="roomBadgeSep" aria-hidden="true">/</span>
            <span className="roomBadgePet">{presence.petName}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
