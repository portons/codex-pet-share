export type ClientSession = {
  accessToken: string;
  refreshToken?: string;
} | null;

export type CloudflareRealtimeClient = {
  endpoint: string;
  accessToken: string;
  channel: (topic: string, options?: unknown) => CloudflarePresenceChannel;
  removeChannel: (channel: CloudflarePresenceChannel) => Promise<void>;
};

export type CloudflarePresenceChannel = {
  on: (kind: "presence", filter: { event: "sync" | "join" | "leave" }, handler: () => void) => CloudflarePresenceChannel;
  subscribe: () => void;
  unsubscribe: () => void;
  presenceState: () => Record<string, Array<{ slug: string }>>;
};

const realtimeUrl = String(import.meta.env.VITE_REALTIME_URL || "").replace(/\/$/, "");
let installedSession: ClientSession = null;

export function getCloudflareClient(session: ClientSession): CloudflareRealtimeClient {
  if (!realtimeUrl) {
    throw new Error("VITE_REALTIME_URL is required for room features");
  }
  installedSession = session;
  return {
    endpoint: realtimeUrl,
    accessToken: session?.accessToken || "",
    channel(topic: string) {
      return createPresenceChannel(realtimeUrl, session?.accessToken || "", topic);
    },
    async removeChannel(channel: CloudflarePresenceChannel) {
      channel.unsubscribe();
    }
  };
}

export async function applyClientSession(session: ClientSession): Promise<void> {
  installedSession = session;
}

export async function prepareRoomClient(session: ClientSession): Promise<CloudflareRealtimeClient> {
  await applyClientSession(session);
  return getCloudflareClient(session || installedSession);
}

export function disposeCloudflareClient() {
  installedSession = null;
}

function createPresenceChannel(endpoint: string, accessToken: string, topic: string): CloudflarePresenceChannel {
  let ws: WebSocket | null = null;
  let state: Record<string, Array<{ slug: string }>> = {};
  const handlers: Array<() => void> = [];
  return {
    on(_kind, _filter, handler) {
      handlers.push(handler);
      return this;
    },
    subscribe() {
      const url = new URL(`/ws/rooms/${encodeURIComponent(topic)}`, endpoint);
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      url.searchParams.set("token", accessToken);
      ws = new WebSocket(url);
      ws.addEventListener("message", (event) => {
        const message = JSON.parse(String(event.data)) as { type?: string; members?: Array<{ userId?: string; slug?: string }> };
        if (message.type !== "presence") return;
        state = {};
        for (const member of message.members || []) {
          if (!member.userId || !member.slug) continue;
          state[member.userId] = [{ slug: member.slug }];
        }
        handlers.forEach((handler) => handler());
      });
    },
    unsubscribe() {
      ws?.close();
      ws = null;
    },
    presenceState() {
      return state;
    }
  };
}
