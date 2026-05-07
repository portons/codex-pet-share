import type { CloudflareRealtimeClient } from "./cloudflareClient";
import type {
  BallRemoveEvent,
  BallSnapshot,
  BallSpawnRequestEvent,
  BallStateEvent,
  ChatEvent,
  ClosingEvent,
  CollectionIndexEntry,
  CollectionIndexHandle,
  KickEvent,
  NpcSnapshot,
  NpcStateEvent,
  PetSwapEvent,
  PosEvent,
  RoomHandle,
  RoomHandlers,
  RoomTransport,
  RoomPresence,
  WorldDiffEvent,
  WorldRequestEvent
} from "../roomTypes";

export type {
  BallRemoveEvent,
  BallSnapshot,
  BallSpawnRequestEvent,
  BallStateEvent,
  ChatEvent,
  ClosingEvent,
  CollectionIndexEntry,
  CollectionIndexHandle,
  KickEvent,
  NpcSnapshot,
  NpcStateEvent,
  PetSwapEvent,
  PosEvent,
  RoomHandle,
  RoomHandlers,
  RoomPresence,
  WorldDiffEvent,
  WorldRequestEvent
} from "../roomTypes";

export const MAX_ROOM_USERS = 8;
export const COLLECTION_INDEX_TOPIC = "room:_index";
const POS_INTERVAL_MS = 1000 / 12;
const CHAT_MIN_INTERVAL_MS = 600;

type WireMessage =
  | { type: "presence"; members: RoomPresence[] }
  | { type: "broadcast"; event: string; payload: unknown };

export function joinRoom(
  client: CloudflareRealtimeClient,
  roomId: string,
  presencePayload: RoomPresence,
  handlers: RoomHandlers
): RoomHandle {
  const current: RoomHandlers = { ...handlers };
  const ws = connect(client, roomId);
  let members: RoomPresence[] = [];
  let trackedPresence = { ...presencePayload };
  let joined = false;
  let lastPos = 0;
  let lastChat = 0;

  ws.addEventListener("open", () => {
    joined = true;
    ws.send(JSON.stringify({ type: "track", payload: trackedPresence }));
    current.onSubscribed();
  });
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data)) as WireMessage;
    if (message.type === "presence") {
      members = message.members;
      current.onPresenceSync(members);
      return;
    }
    if (message.type === "broadcast") dispatchBroadcast(current, message.event, message.payload);
  });
  ws.addEventListener("error", () => current.onError("CHANNEL_ERROR"));
  ws.addEventListener("close", () => {
    joined = false;
    current.onError("CLOSED");
  });

  function send(event: string, payload: Record<string, unknown>) {
    if (!joined || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "broadcast", event, payload }));
  }

  return {
    channel: ws as RoomTransport,
    presence: () => members,
    setHandlers: (next) => {
      Object.assign(current, next);
      current.onPresenceSync(members);
    },
    broadcastPos: (event) => {
      const now = performance.now();
      if (now - lastPos < POS_INTERVAL_MS) return;
      lastPos = now;
      send("pos", event);
    },
    broadcastChat: (text) => {
      const trimmed = text.trim().slice(0, 200);
      if (!trimmed) return;
      const now = performance.now();
      if (now - lastChat < CHAT_MIN_INTERVAL_MS) return;
      lastChat = now;
      send("chat", { userId: trackedPresence.userId, text: trimmed, ts: Date.now() });
    },
    broadcastBallSpawnRequest: (event) => send("ball:spawn-request", event),
    broadcastBallState: (event) => send("ball:state", event),
    broadcastBallRemove: (event) => send("ball:remove", event),
    broadcastNpcState: (event) => send("npc:state", event),
    broadcastWorldDiff: (event) => send("world:diff", event),
    broadcastHostClosing: () => send("host:closing", {}),
    broadcastHostKick: (event) => send("host:kick", event),
    broadcastPetSwap: (event) => send("pet:swap", event),
    broadcastWorldRequest: (event) => send("world:request", event),
    retrackPresence: async (next) => {
      trackedPresence = { ...trackedPresence, ...next };
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "track", payload: trackedPresence }));
    },
    leave: async () => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "untrack" }));
      ws.close();
    }
  };
}

export function joinCollectionIndex(
  client: CloudflareRealtimeClient,
  userId: string,
  slug: string
): CollectionIndexHandle {
  const ws = connect(client, COLLECTION_INDEX_TOPIC);
  ws.addEventListener("open", () => {
    ws.send(JSON.stringify({ type: "track", payload: { userId, slug, joinedAt: Date.now() } satisfies CollectionIndexEntry & { userId: string; joinedAt: number } }));
  });
  return {
    channel: ws as RoomTransport,
    leave: async () => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "untrack" }));
      ws.close();
    }
  };
}

function connect(client: CloudflareRealtimeClient, roomId: string) {
  const url = new URL(`/ws/rooms/${encodeURIComponent(roomId)}`, client.endpoint);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.searchParams.set("token", client.accessToken);
  return new WebSocket(url);
}

function dispatchBroadcast(handlers: RoomHandlers, event: string, payload: unknown) {
  if (event === "pos") handlers.onPos(payload as PosEvent);
  else if (event === "chat") handlers.onChat(payload as ChatEvent);
  else if (event === "ball:spawn-request") handlers.onBallSpawnRequest(payload as BallSpawnRequestEvent);
  else if (event === "ball:state") handlers.onBallState(payload as BallStateEvent);
  else if (event === "ball:remove") handlers.onBallRemove(payload as BallRemoveEvent);
  else if (event === "npc:state") handlers.onNpcState(payload as NpcStateEvent);
  else if (event === "world:diff") handlers.onWorldDiff(payload as WorldDiffEvent);
  else if (event === "host:closing") handlers.onHostClosing(payload as ClosingEvent);
  else if (event === "host:kick") handlers.onHostKick(payload as KickEvent);
  else if (event === "pet:swap") handlers.onPetSwap(payload as PetSwapEvent);
  else if (event === "world:request") handlers.onWorldRequest(payload as WorldRequestEvent);
}
