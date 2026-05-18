import { useEffect, useState } from "react";
import { readJson } from "../domain/http";
import { navigate } from "../domain/routing";
import type { AuthSession, CommentNotification, CommentNotificationsResponse, User } from "../domain/types";

type ApiFetch = (path: string, init?: RequestInit, authSession?: AuthSession | null) => Promise<Response>;

export function useCommentNotifications({
  apiFetch,
  session,
  user
}: {
  apiFetch: ApiFetch;
  session: AuthSession | null;
  user: User | null;
}) {
  const [notifications, setNotifications] = useState<CommentNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  async function loadCommentNotifications() {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setStatus("");
      return;
    }
    setLoading(true);
    setStatus("");
    try {
      applyResponse(await readJson<CommentNotificationsResponse>(
        await apiFetch("/api/comments/notifications", {}, session)
      ));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load comment notifications.");
    } finally {
      setLoading(false);
    }
  }

  async function openCommentNotification(notification: CommentNotification) {
    navigate(`/pets/${notification.petId}?comment=${encodeURIComponent(notification.commentId)}`);
    await markRead(notification.commentId);
  }

  async function dismissCommentNotifications() {
    await markRead("");
  }

  async function markRead(commentId: string) {
    if (!user) return;
    setStatus("");
    try {
      const body = await readJson<CommentNotificationsResponse>(
        await apiFetch("/api/comments/notifications/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(commentId ? { commentId } : {})
        })
      );
      applyResponse(body);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not update comment notifications.");
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (cancelled) return;
      await loadCommentNotifications();
    }
    void load();
    if (!user) {
      return () => {
        cancelled = true;
      };
    }
    const interval = window.setInterval(() => void load(), 45_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [user?.id, session?.accessToken]);

  function applyResponse(body: CommentNotificationsResponse) {
    setNotifications(body.notifications);
    setUnreadCount(body.unreadCount);
  }

  return {
    notifications,
    unreadCount,
    loading,
    status,
    loadCommentNotifications,
    openCommentNotification,
    dismissCommentNotifications
  };
}
