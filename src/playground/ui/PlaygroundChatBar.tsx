import { Suspense, lazy, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import type { EmojiStyle } from "emoji-picker-react";
import type { RoomHandle } from "../../realtime/roomChannel";
import type { ChatBubble } from "../room/roomOverlay";
import { useDismissableEmojiPicker } from "../hooks/useDismissableEmojiPicker";

const EmojiPicker = lazy(() => import("emoji-picker-react"));

export function PlaygroundChatBar({
  ownDisplayName,
  ownUserId,
  channel,
  canvasRef,
  clearPressedKeysRef,
  setChatBubbles,
  bubbleTtlMs
}: {
  ownDisplayName: string;
  ownUserId: string;
  channel: RoomHandle;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  clearPressedKeysRef: RefObject<(() => void) | null>;
  setChatBubbles: Dispatch<SetStateAction<ChatBubble[]>>;
  bubbleTtlMs: number;
}) {
  const [chatDraft, setChatDraft] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const emojiWrapRef = useRef<HTMLDivElement | null>(null);
  const chatInputRef = useRef<HTMLInputElement | null>(null);
  useDismissableEmojiPicker(emojiOpen, setEmojiOpen, emojiWrapRef);

  function sendChat(rawText: string, opts?: { fromEmoji?: boolean }) {
    const text = rawText.trim().slice(0, 200);
    if (!text) return;
    channel.broadcastChat(text);
    const expiresAt = performance.now() + bubbleTtlMs;
    setChatBubbles((prev) => {
      const filtered = prev.filter((b) => b.userId !== ownUserId);
      return [...filtered, { userId: ownUserId, text, expiresAt }];
    });
    setChatDraft("");
    if (opts?.fromEmoji) {
      canvasRef.current?.focus();
    } else {
      canvasRef.current?.focus();
    }
  }

  return (
    <form
      className="playgroundChatBar"
      onSubmit={(e) => {
        e.preventDefault();
        sendChat(chatDraft);
      }}
    >
      <span className="playgroundChatPrompt" aria-hidden="true">›</span>
      <input
        ref={chatInputRef}
        className="playgroundChatInput"
        type="text"
        placeholder={`broadcast as ${ownDisplayName.toLowerCase()}…`}
        value={chatDraft}
        onChange={(e) => setChatDraft(e.target.value)}
        onFocus={() => clearPressedKeysRef.current?.()}
        maxLength={200}
        aria-label="Send a chat message"
        autoComplete="off"
      />
      <div className="playgroundEmojiWrap" ref={emojiWrapRef}>
        <button
          type="button"
          className="playgroundEmojiBtn"
          onClick={() => setEmojiOpen((v) => !v)}
          aria-label={emojiOpen ? "Close emoji picker" : "Send emoji"}
          aria-haspopup="dialog"
          aria-expanded={emojiOpen}
          data-tooltip={emojiOpen ? "Close" : "Send emoji"}
          data-active={emojiOpen || undefined}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M8 14c.8 1.2 2.2 2 4 2s3.2-.8 4-2" />
            <circle cx="9" cy="10" r="0.8" fill="currentColor" />
            <circle cx="15" cy="10" r="0.8" fill="currentColor" />
          </svg>
        </button>
        {emojiOpen && (
          <div className="playgroundEmojiPopover" role="dialog" aria-label="Emoji picker">
            <Suspense fallback={<div className="playgroundEmojiLoading">Loading emojis…</div>}>
              <EmojiPicker
                width={304}
                height={360}
                lazyLoadEmojis
                emojiStyle={"native" as EmojiStyle}
                previewConfig={{ showPreview: false }}
                searchPlaceholder="search emoji…"
                skinTonesDisabled
                onEmojiClick={(data) => {
                  if (!chatDraft.trim()) {
                    sendChat(data.emoji, { fromEmoji: true });
                    return;
                  }
                  const next = (chatDraft + data.emoji).slice(0, 200);
                  setChatDraft(next);
                  chatInputRef.current?.focus();
                }}
              />
            </Suspense>
          </div>
        )}
      </div>
      <button type="submit" className="playgroundChatSend">
        Send <kbd aria-hidden="true">↵</kbd>
      </button>
    </form>
  );
}
