import { useCallback, useEffect, useState } from "react";
import type { ChatBubble } from "../room/roomOverlay";
import type { RoomMode } from "../room/types";

export function useRoomBubbles(roomMode: RoomMode | undefined) {
  const [chatBubbles, setChatBubbles] = useState<ChatBubble[]>([]);
  const [joinToasts, setJoinToasts] = useState<Array<{ id: string; text: string }>>([]);

  const pushJoinToast = useCallback((text: string) => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setJoinToasts((prev) => [...prev, { id, text }]);
    window.setTimeout(() => {
      setJoinToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  useEffect(() => {
    if (!roomMode) return;
    const t = setInterval(() => {
      const now = performance.now();
      setChatBubbles((prev) => prev.filter((b) => b.expiresAt > now));
    }, 500);
    return () => clearInterval(t);
  }, [roomMode]);

  return {
    chatBubbles,
    setChatBubbles,
    joinToasts,
    pushJoinToast
  };
}
