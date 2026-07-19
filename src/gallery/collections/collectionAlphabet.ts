import type { CollectionSummary } from "../../domain/types";

const collectionAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function collectionAlphabetEntries(collections: CollectionSummary[]) {
  const lookup = new Map<string, CollectionSummary>();
  for (const collection of collections) {
    const letter = collectionFirstLetter(collection);
    if (/^[A-Z]$/.test(letter) && !lookup.has(letter)) {
      lookup.set(letter, collection);
    }
  }
  return collectionAlphabet.map((letter) => ({ letter, collection: lookup.get(letter) }));
}

export function collectionFirstLetter(collection: CollectionSummary) {
  return collection.displayName.trim().charAt(0).toUpperCase();
}

export function collectionAnchorId(collection: CollectionSummary) {
  return `collection-${collection.slug}`;
}
