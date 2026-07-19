import type { AuthSession } from "../domain/types";
import { useCollectionPresenceCounts } from "../realtime/useCollectionPresenceCounts";
import { Gallery } from "./home/Gallery";

// Mirror of CollectionsPageWithPresence: keeps the one-shot presence
// hook scoped to the gallery route only, so we don't open lurker
// channels on /favorites, /mine, /upload, etc. when the user is not
// looking at the gallery home.
export function GalleryWithPresence({
  collections,
  session,
  ...rest
}: Omit<Parameters<typeof Gallery>[0], "presenceCounts"> & { session: AuthSession | null }) {
  const slugs = collections.map((c) => c.slug);
  const presenceCounts = useCollectionPresenceCounts(slugs, session);
  return <Gallery {...rest} collections={collections} presenceCounts={presenceCounts} />;
}
