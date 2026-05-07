import { useEffect, useRef, useState } from "react";

export type NpcPopoverPosition = {
  top: number;
  right: number;
};

export function useNpcPopoverPosition(npcSearchOpen: boolean) {
  const npcAddBtnRef = useRef<HTMLButtonElement | null>(null);
  const [npcPopoverPos, setNpcPopoverPos] = useState<NpcPopoverPosition | null>(null);

  useEffect(() => {
    if (!npcSearchOpen) {
      setNpcPopoverPos(null);
      return;
    }
    const update = () => {
      const r = npcAddBtnRef.current?.getBoundingClientRect();
      if (!r) return;
      setNpcPopoverPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [npcSearchOpen]);

  return { npcAddBtnRef, npcPopoverPos };
}
