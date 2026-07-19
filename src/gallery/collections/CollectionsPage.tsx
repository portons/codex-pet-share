import type { AuthSession, CollectionSummary } from "../../domain/types";
import { useCollectionPresenceCounts } from "../../realtime/useCollectionPresenceCounts";
import { EmptyState } from "../../ui/EmptyState";
import { GallerySkeleton } from "../../ui/Skeletons";
import { CollectionAlphabetRail } from "./CollectionAlphabetRail";
import { CollectionIndexCard } from "./CollectionIndexCard";
import { UserCollectionsSection } from "./UserCollectionsSection";
import { useActiveAlphabetLetter } from "./useActiveAlphabetLetter";

// Thin wrapper that fires the one-shot presence-count hook only while
// the Collections route is mounted. Keeping the hook out of the main
// App component avoids running 30+ ephemeral channel subscriptions on
// every other page.
export function CollectionsPageWithPresence({
  collections,
  userCollections,
  loading,
  userCollectionsLoading,
  signedIn,
  session,
  onCreateCollection,
  onEditCollection,
  onDeleteCollection,
  onStartUserCollectionRoom,
  onShareCollection,
  onShareRoom,
  onSignIn
}: {
  collections: Array<CollectionSummary>;
  userCollections: Array<CollectionSummary>;
  loading: boolean;
  userCollectionsLoading: boolean;
  signedIn: boolean;
  session: AuthSession | null;
  onCreateCollection: () => void;
  onEditCollection: (collection: CollectionSummary) => void;
  onDeleteCollection: (collection: CollectionSummary) => void;
  onStartUserCollectionRoom: (collection: CollectionSummary) => void;
  onShareCollection: (collection: CollectionSummary) => void;
  onShareRoom: (collection: CollectionSummary) => void;
  onSignIn: () => void;
}) {
  const slugs = collections.map((c) => c.slug);
  const presenceCounts = useCollectionPresenceCounts(slugs, session);
  return (
    <CollectionsPage
      collections={collections}
      userCollections={userCollections}
      loading={loading}
      userCollectionsLoading={userCollectionsLoading}
      signedIn={signedIn}
      presenceCounts={presenceCounts}
      onCreateCollection={onCreateCollection}
      onEditCollection={onEditCollection}
      onDeleteCollection={onDeleteCollection}
      onStartUserCollectionRoom={onStartUserCollectionRoom}
      onShareCollection={onShareCollection}
      onShareRoom={onShareRoom}
      onSignIn={onSignIn}
    />
  );
}

function CollectionsPage({
  collections,
  userCollections,
  loading,
  userCollectionsLoading,
  signedIn,
  presenceCounts,
  onCreateCollection,
  onEditCollection,
  onDeleteCollection,
  onStartUserCollectionRoom,
  onShareCollection,
  onShareRoom,
  onSignIn
}: {
  collections: Array<CollectionSummary>;
  userCollections: Array<CollectionSummary>;
  loading: boolean;
  userCollectionsLoading: boolean;
  signedIn: boolean;
  // One-shot snapshot of "people in the room" per slug at page-load
  // time. Empty when the user is signed out (private:true topics need
  // an authed websocket). Not live — refreshes only on remount.
  presenceCounts: Map<string, number>;
  // The card "Share" button shares the playground room URL — that link
  // doubles as a way to find the collection itself, so a separate
  // collection-share action would just clutter the footer. Collection-
  // page share remains accessible from the detail page header.
  onCreateCollection: () => void;
  onEditCollection: (collection: CollectionSummary) => void;
  onDeleteCollection: (collection: CollectionSummary) => void;
  onStartUserCollectionRoom: (collection: CollectionSummary) => void;
  onShareCollection: (collection: CollectionSummary) => void;
  onShareRoom: (collection: CollectionSummary) => void;
  onSignIn: () => void;
}) {
  const { alphabetEntries, activeAlphabetLetter, setActiveAlphabetLetter } = useActiveAlphabetLetter(collections);

  return (
    <section className="surface">
      <header className="sectionHeader">
        <div>
          <p className="metaText">Collections</p>
          <h1>Pet collections</h1>
          <p className="sectionSubhead">Curated packs you can browse, share, or jump into a permanent playground room with.</p>
        </div>
      </header>
      <UserCollectionsSection
        collections={userCollections}
        loading={userCollectionsLoading}
        signedIn={signedIn}
        onCreate={onCreateCollection}
        onEdit={onEditCollection}
        onDelete={onDeleteCollection}
        onStartRoom={onStartUserCollectionRoom}
        onShare={onShareCollection}
        onSignIn={onSignIn}
      />
      {loading ? (
        <GallerySkeleton />
      ) : collections.length ? (
        <div className="collectionsIndexShell">
          <div className="collectionsGrid">
            {collections.map((collection) => (
              <CollectionIndexCard
                collection={collection}
                key={collection.slug}
                liveCount={presenceCounts.get(collection.slug)}
                signedIn={signedIn}
                onShareRoom={onShareRoom}
                onSignIn={onSignIn}
              />
            ))}
          </div>
          <CollectionAlphabetRail
            activeLetter={activeAlphabetLetter}
            entries={alphabetEntries}
            onJump={setActiveAlphabetLetter}
          />
        </div>
      ) : (
        <EmptyState text="No collections yet." />
      )}
    </section>
  );
}
