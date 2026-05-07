import { useEffect, type Dispatch, type RefObject, type SetStateAction } from "react";

export function useDismissableEmojiPicker(
  emojiOpen: boolean,
  setEmojiOpen: Dispatch<SetStateAction<boolean>>,
  emojiWrapRef: RefObject<HTMLDivElement | null>
) {
  useEffect(() => {
    if (!emojiOpen) return;
    function onDocClick(e: MouseEvent) {
      const node = emojiWrapRef.current;
      if (!node) return;
      if (!node.contains(e.target as Node)) setEmojiOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setEmojiOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [emojiOpen, emojiWrapRef, setEmojiOpen]);
}
