import { useEffect, useMemo, useState } from "react";
import type { CollectionSummary } from "../../domain/types";
import { collectionAlphabetEntries, collectionAnchorId, collectionFirstLetter } from "./collectionAlphabet";

export function useActiveAlphabetLetter(collections: Array<CollectionSummary>) {
  const alphabetEntries = useMemo(() => collectionAlphabetEntries(collections), [collections]);
  const firstAlphabetLetter = alphabetEntries.find((entry) => entry.collection)?.letter || "";
  const [activeAlphabetLetter, setActiveAlphabetLetter] = useState(firstAlphabetLetter);

  useEffect(() => {
    if (!firstAlphabetLetter) {
      setActiveAlphabetLetter("");
      return;
    }
    const currentStillExists = alphabetEntries.some(
      (entry) => entry.collection && entry.letter === activeAlphabetLetter
    );
    if (!currentStillExists) {
      setActiveAlphabetLetter(firstAlphabetLetter);
    }
  }, [activeAlphabetLetter, alphabetEntries, firstAlphabetLetter]);

  useEffect(() => {
    if (!collections.length) return;
    const cards = collections
      .map((collection) => document.getElementById(collectionAnchorId(collection)))
      .filter((element): element is HTMLElement => Boolean(element));
    if (!cards.length) return;

    let frame = 0;
    const letterById = new Map(collections.map((collection) => [collectionAnchorId(collection), collectionFirstLetter(collection)]));

    function updateActiveLetter() {
      const anchorY = 118;
      let activeCard = cards[0];
      let closestDistance = Number.POSITIVE_INFINITY;

      for (const card of cards) {
        const top = card.getBoundingClientRect().top;
        const distance = Math.abs(top - anchorY);
        if (distance < closestDistance) {
          closestDistance = distance;
          activeCard = card;
        }
      }

      const nextLetter = letterById.get(activeCard.id) || "";
      if (nextLetter) setActiveAlphabetLetter(nextLetter);
    }

    function scheduleUpdate() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updateActiveLetter);
    }

    updateActiveLetter();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [collections]);

  return { alphabetEntries, activeAlphabetLetter, setActiveAlphabetLetter };
}
