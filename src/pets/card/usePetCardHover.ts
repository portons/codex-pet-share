import { type FocusEvent, type PointerEvent as ReactPointerEvent, useState } from "react";

export function usePetCardHover(compact: boolean) {
  const [cardPointerInside, setCardPointerInside] = useState(false);
  const [cardFocusInside, setCardFocusInside] = useState(false);

  const handleMagneticPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (compact) return;
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;

    card.style.setProperty("--magnetic-x", `${px * 100}%`);
    card.style.setProperty("--magnetic-y", `${py * 100}%`);
    card.style.setProperty("--magnetic-pull-x", `${(px - 0.5) * 13}px`);
    card.style.setProperty("--magnetic-pull-y", `${(py - 0.5) * 11}px`);
  };
  const handleMagneticPointerLeave = (event: ReactPointerEvent<HTMLElement>) => {
    if (compact) return;
    const card = event.currentTarget;
    card.style.setProperty("--magnetic-x", "50%");
    card.style.setProperty("--magnetic-y", "38%");
    card.style.setProperty("--magnetic-pull-x", "0px");
    card.style.setProperty("--magnetic-pull-y", "0px");
  };

  const markCardPointerInside = () => setCardPointerInside(true);
  const markCardPointerOutside = () => setCardPointerInside(false);
  const handleCardPointerLeave = (event: ReactPointerEvent<HTMLElement>) => {
    setCardPointerInside(false);
    handleMagneticPointerLeave(event);
  };
  const markCardFocusInside = () => setCardFocusInside(true);
  const handleCardBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setCardFocusInside(false);
    }
  };

  return {
    animateCardPreview: cardPointerInside || cardFocusInside,
    markCardPointerInside,
    markCardPointerOutside,
    handleMagneticPointerMove,
    handleCardPointerLeave,
    markCardFocusInside,
    handleCardBlur
  };
}
