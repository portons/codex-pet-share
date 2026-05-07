import { useEffect, useRef, useState } from "react";

export function useFullscreenControls() {
  const modalSectionRef = useRef<HTMLElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [coarsePointer, setCoarsePointer] = useState(false);
  const [touchControlsOverride, setTouchControlsOverride] = useState<boolean | null>(null);
  const showTouchControls = touchControlsOverride ?? coarsePointer;

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(pointer: coarse)");
    const sync = () => setCoarsePointer(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      await document.documentElement.requestFullscreen({ navigationUI: "hide" });
    } catch (err) {
      console.warn("Fullscreen request failed:", err);
    }
  }

  return {
    modalSectionRef,
    isFullscreen,
    coarsePointer,
    showTouchControls,
    setTouchControlsOverride,
    toggleFullscreen
  };
}
