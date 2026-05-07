type Presence = Record<string, unknown> & { userId?: string; joinedAt?: number };

type SocketState = {
  userId: string;
  presence: Presence | null;
};

export class RoomDurableObject {
  private sockets = new Map<WebSocket, SocketState>();

  constructor(private state: DurableObjectState) {}

  async fetch(request: Request) {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") return new Response("expected websocket", { status: 426 });
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const userId = request.headers.get("x-user-id") || crypto.randomUUID();
    server.accept();
    this.sockets.set(server, { userId, presence: null });
    this.sendPresence(server);
    server.addEventListener("message", (event) => this.onMessage(server, event));
    server.addEventListener("close", () => this.onClose(server));
    server.addEventListener("error", () => this.onClose(server));
    return new Response(null, { status: 101, webSocket: client });
  }

  private onMessage(socket: WebSocket, event: MessageEvent) {
    const state = this.sockets.get(socket);
    if (!state || typeof event.data !== "string") return;
    const message = JSON.parse(event.data) as { type?: string; event?: string; payload?: Presence };
    if (message.type === "track" && message.payload) {
      state.presence = { ...message.payload, userId: String(message.payload.userId || state.userId) };
      this.broadcastPresence();
      return;
    }
    if (message.type === "untrack") {
      state.presence = null;
      this.broadcastPresence();
      return;
    }
    if (message.type === "broadcast" && message.event) {
      this.broadcast({ type: "broadcast", event: message.event, payload: message.payload || {} });
    }
  }

  private onClose(socket: WebSocket) {
    if (this.sockets.delete(socket)) this.broadcastPresence();
  }

  private broadcastPresence() {
    const members = this.currentPresence();
    this.broadcast({ type: "presence", members });
  }

  private sendPresence(socket: WebSocket) {
    socket.send(JSON.stringify({ type: "presence", members: this.currentPresence() }));
  }

  private currentPresence() {
    const members = Array.from(this.sockets.values()).flatMap((state) => state.presence ? [state.presence] : []);
    members.sort((a, b) => Number(a.joinedAt || 0) - Number(b.joinedAt || 0));
    return members;
  }

  private broadcast(message: unknown) {
    const encoded = JSON.stringify(message);
    for (const socket of this.sockets.keys()) {
      try {
        socket.send(encoded);
      } catch {
        this.sockets.delete(socket);
      }
    }
  }
}
