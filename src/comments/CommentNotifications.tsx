import { useEffect, useRef, useState, type CSSProperties } from "react";
import { formatDate, formatMetric } from "../domain/format";
import type { CommentNotification } from "../domain/types";
import { Icon } from "../ui/Icon";
import { UserAvatar } from "../ui/UserAvatar";

export function CommentNotifications({
  notifications,
  unreadCount,
  loading,
  status,
  onOpen,
  onDismiss
}: {
  notifications: CommentNotification[];
  unreadCount: number;
  loading: boolean;
  status: string;
  onOpen: (notification: CommentNotification) => void | Promise<void>;
  onDismiss: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const countLabel = `${formatMetric(unreadCount)} unread ${unreadCount === 1 ? "comment" : "comments"}`;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function openNotification(notification: CommentNotification) {
    setOpen(false);
    await onOpen(notification);
  }

  async function dismissNotifications() {
    setOpen(false);
    await onDismiss();
  }

  if (!unreadCount && !status) return null;

  return (
    <div className="commentNotifications" ref={rootRef}>
      <button
        className={`commentNoticeButton ${status ? "error" : ""}`}
        type="button"
        aria-label={status ? "Comment notifications need attention" : countLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Icon name={status ? "ban" : "comment"} size={14} />
        <span>{status ? "Sync" : "Notes"}</span>
        {unreadCount ? <strong>{formatMetric(unreadCount)}</strong> : null}
      </button>

      {open && (
        <section className={`commentNoticePanel ${status ? "error" : ""}`} role="menu" aria-label="Comment notifications">
          <header className="commentNoticeHeader">
            <div>
              <p className="commentNoticeEyebrow">{status ? "Guestbook sync" : countLabel}</p>
              <strong>{status || "Comments on your pets"}</strong>
            </div>
          </header>
          {!status && (
            <>
              <div className="commentNoticeList">
                {notifications.map((notification, index) => (
                  <button
                    className="commentNoticeItem"
                    key={notification.commentId}
                    type="button"
                    role="menuitem"
                    onClick={() => openNotification(notification)}
                    style={{ "--notice-index": index } as CSSProperties}
                  >
                    <UserAvatar className="commentNoticeAvatar" name={notification.authorName} avatarUrl={notification.authorAvatarUrl} size="sm" />
                    <span className="commentNoticeCopy">
                      <span>
                        <strong>{notification.petDisplayName}</strong>
                        <em>{formatDate(notification.createdAt)}</em>
                      </span>
                      <span>{notification.body}</span>
                    </span>
                    <Icon name="link" size={13} />
                  </button>
                ))}
              </div>
              <div className="commentNoticeActions">
                <button className="btn btnSm" type="button" disabled={loading} onClick={() => void dismissNotifications()}>
                  {loading ? "Updating" : "Dismiss all"}
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
