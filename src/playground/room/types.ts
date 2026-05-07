import type { RoomHandle } from "../../realtime/roomChannel";

export type PlaygroundPeer = {
  id: string;
  displayName: string;
  spritesheetUrl: string;
  source?: "own" | "favorite" | "newest" | "collection";
};

export type RoomMode = {
  kind: "host" | "guest";
  roomId: string;
  displayName?: string;
  collectionSlug?: string;
  channel: RoomHandle;
  ownUserId: string;
  ownDisplayName: string;
  hostUserId: string;
  isPermanent?: boolean;
};
