import { publicAppOrigin } from "./config";
import type { Pet } from "./types";

export function petShareUrl(pet: Pet) {
  return `${publicAppOrigin}/share/${pet.id}`;
}

export function creatorShareUrl(creator: { id: string; handle?: string | null }) {
  return `${publicAppOrigin}/users/${creator.handle || creator.id}`;
}

export function creatorRouteHash(idOrHandle: { id: string; handle?: string | null }) {
  return `#/users/${idOrHandle.handle || idOrHandle.id}`;
}

export function collectionShareUrl(collection: { slug: string }) {
  return `${publicAppOrigin}/collections/${collection.slug}`;
}

export function collectionPlayShareUrl(collection: { slug: string }) {
  // Hash route: there is no Pages Function rendering an OG card for the
  // permanent-room URL yet, so link straight into the SPA.
  return `${publicAppOrigin}/#/collections/${collection.slug}/play`;
}

export function socialShareUrls(shareText: string, shareUrl: string) {
  const encodedShareUrl = encodeURIComponent(shareUrl);
  const encodedShareText = encodeURIComponent(shareText);
  const encodedSocialText = encodeURIComponent(`${shareText} ${shareUrl}`);

  return {
    x: `https://twitter.com/intent/tweet?url=${encodedShareUrl}&text=${encodedShareText}`,
    bluesky: `https://bsky.app/intent/compose?text=${encodedSocialText}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedShareUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedShareUrl}`
  };
}

// Match the static composites baked by scripts/build-entity-cards.mjs and
// served by the share-page adapter. The in-app share preview should look
// exactly like the X/Slack/etc. unfurl, so it points at the same asset.
export function collectionCompositeUrl(slug: string): string {
  return `${publicAppOrigin}/assets/social/collections/${encodeURIComponent(slug)}.png`;
}

export function creatorCompositeUrl(creator: { id: string; handle?: string | null }): string {
  return `${publicAppOrigin}/assets/social/creators/${encodeURIComponent(creator.handle || creator.id)}.png`;
}

export function petCompositeUrl(petId: string): string {
  return `${publicAppOrigin}/assets/social/pets/${encodeURIComponent(petId)}.png`;
}
