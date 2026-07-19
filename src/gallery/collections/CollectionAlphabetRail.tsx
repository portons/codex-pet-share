import type { CollectionSummary } from "../../domain/types";
import { collectionAnchorId, collectionFirstLetter } from "./collectionAlphabet";

export function CollectionAlphabetRail({
  activeLetter,
  onJump,
  entries
}: {
  activeLetter: string;
  onJump: (letter: string) => void;
  entries: Array<{ letter: string; collection?: CollectionSummary }>;
}) {
  function scrollToCollection(collection: CollectionSummary) {
    const letter = collectionFirstLetter(collection);
    onJump(letter);
    document.getElementById(collectionAnchorId(collection))?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  return (
    <nav className="collectionAlphabetRail" aria-label="Jump to collection">
      {entries.map(({ letter, collection }) => collection ? (
        <button
          className={`collectionAlphabetItem active ${letter === activeLetter ? "current" : ""}`}
          key={letter}
          type="button"
          aria-current={letter === activeLetter ? "true" : undefined}
          onClick={() => scrollToCollection(collection)}
          title={`Jump to ${collection.displayName}`}
        >
          {letter}
        </button>
      ) : (
        <span className="collectionAlphabetItem" key={letter} aria-disabled="true">
          {letter}
        </span>
      ))}
    </nav>
  );
}
