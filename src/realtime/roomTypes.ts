export type RoomPresence = {
  userId: string;
  displayName: string;
  petId: string;
  petDisplayName: string;
  spritesheetUrl: string;
  joinedAt: number;
};

export type PosEvent = {
  userId: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  scaleX: number;
  scaleY: number;
  vx: number;
  vy: number;
  vz: number;
  row: number;
  frame: number;
  sprinting: boolean;
};

export type ChatEvent = {
  userId: string;
  text: string;
  ts: number;
};

export type BallSpawnRequestEvent = {
  requesterId: string;
  origin: { x: number; y: number; z: number };
  fx: number;
  fz: number;
  sprinting: boolean;
};

export type BallSnapshot = {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
};

export type BallStateEvent = { balls: BallSnapshot[] };
export type BallRemoveEvent = { ids: string[] };

export type NpcSnapshot = {
  id: string;
  petId: string;
  spritesheetUrl: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
};

export type NpcStateEvent = {
  ownerId: string;
  npcs: NpcSnapshot[];
};

export type WorldDiffEvent =
  | { kind: "tramp:add"; payload: { id: string; x: number; z: number; ownerId: string } }
  | { kind: "tramp:remove"; payload: { id: string } }
  | { kind: "npc:add"; payload: { id: string; petId: string; spritesheetUrl: string; x: number; z: number } }
  | { kind: "npc:remove"; payload: { id: string } }
  | { kind: "reset" }
  | { kind: "reset:owner"; payload: { ownerId: string } };

export type KickEvent = { userId: string; reason?: string };
export type ClosingEvent = Record<string, never>;
export type PetSwapEvent = {
  userId: string;
  petId: string;
  petDisplayName: string;
  spritesheetUrl: string;
};
export type WorldRequestEvent = { requesterId: string };

export type RoomHandlers = {
  onPresenceSync: (members: RoomPresence[]) => void;
  onPos: (event: PosEvent) => void;
  onChat: (event: ChatEvent) => void;
  onBallSpawnRequest: (event: BallSpawnRequestEvent) => void;
  onBallState: (event: BallStateEvent) => void;
  onBallRemove: (event: BallRemoveEvent) => void;
  onNpcState: (event: NpcStateEvent) => void;
  onWorldDiff: (event: WorldDiffEvent) => void;
  onHostClosing: (event: ClosingEvent) => void;
  onHostKick: (event: KickEvent) => void;
  onPetSwap: (event: PetSwapEvent) => void;
  onWorldRequest: (event: WorldRequestEvent) => void;
  onSubscribed: () => void;
  onError: (reason: string) => void;
};

export type RoomTransport = {
  untrack?: () => unknown;
};

export type RoomHandle = {
  channel: RoomTransport;
  presence: () => RoomPresence[];
  setHandlers: (next: Partial<RoomHandlers>) => void;
  broadcastPos: (event: PosEvent) => void;
  broadcastChat: (text: string) => void;
  broadcastBallSpawnRequest: (event: BallSpawnRequestEvent) => void;
  broadcastBallState: (event: BallStateEvent) => void;
  broadcastBallRemove: (event: BallRemoveEvent) => void;
  broadcastNpcState: (event: NpcStateEvent) => void;
  broadcastWorldDiff: (event: WorldDiffEvent) => void;
  broadcastHostClosing: () => void;
  broadcastHostKick: (event: KickEvent) => void;
  broadcastPetSwap: (event: PetSwapEvent) => void;
  broadcastWorldRequest: (event: WorldRequestEvent) => void;
  retrackPresence: (next: Partial<RoomPresence>) => Promise<void>;
  leave: () => Promise<void>;
};

export type CollectionIndexEntry = { slug: string };

export type CollectionIndexHandle = {
  channel: RoomTransport;
  leave: () => Promise<void>;
};
