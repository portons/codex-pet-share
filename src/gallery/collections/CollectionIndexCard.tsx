import { trackEvent } from "../../domain/analytics";
import { formatMetric } from "../../domain/format";
import { collectionCodexInstallUrl } from "../../domain/pets";
import type { CollectionSummary } from "../../domain/types";
import { Icon } from "../../ui/Icon";
import { collectionAnchorId } from "./collectionAlphabet";
import { CollectionPosterMosaic } from "./CollectionPosterMosaic";

export function CollectionIndexCard({
  collection,
  liveCount,
  signedIn,
  onShareRoom,
  onSignIn
}: {
  collection: CollectionSummary;
  liveCount: number | undefined;
  signedIn: boolean;
  onShareRoom: (collection: CollectionSummary) => void;
  onSignIn: () => void;
}) {
  return (
    <article className="collectionCard card" id={collectionAnchorId(collection)}>
      {liveCount != null && liveCount > 0 && (
        signedIn ? (
          <a
            className="collectionCardLive collectionCardLiveOverlay"
            href={`#/collections/${collection.slug}/play`}
            title={`Join ${collection.displayName} playground (${liveCount} ${liveCount === 1 ? "person" : "people"} live)`}
            aria-label={`Join ${collection.displayName} playground · ${liveCount} live`}
          >
            <span className="collectionCardLiveDot" aria-hidden="true" />
            {liveCount} live
          </a>
        ) : (
          <button
            type="button"
            className="collectionCardLive collectionCardLiveOverlay"
            onClick={onSignIn}
            title={`Sign in to join (${liveCount} ${liveCount === 1 ? "person" : "people"} live)`}
            aria-label={`Sign in to join · ${liveCount} live`}
          >
            <span className="collectionCardLiveDot" aria-hidden="true" />
            {liveCount} live
          </button>
        )
      )}
      <a
        className="collectionCardBody"
        href={`#/collections/${collection.slug}`}
        aria-label={`Open ${collection.displayName}`}
      >
        <CollectionPosterMosaic collection={collection} effect="stack" />
        <div className="collectionCardCopy">
          <h2 className="collectionCardTitle">{collection.displayName}</h2>
          <p className="collectionCardTopPets">{collectionTopPetsLabel(collection)}</p>
        </div>
      </a>
      <footer className="collectionCardFooter">
        <p className="collectionCardMeta">
          {formatMetric(collection.petCount)} {collection.petCount === 1 ? "pet" : "pets"}
        </p>
        <div className="collectionCardActions">
          <a
            className="btn btnSm btnPrimary collectionCardCodex"
            href={collectionCodexInstallUrl(collection)}
            onClick={() => trackEvent("collection_card_codex_click", { route: "collections", collectionSlug: collection.slug })}
            aria-label={`Install ${collection.displayName} in Codex`}
          >
            <Icon name="terminal" size={13} />
            Codex
          </a>
          <button
            className="btn btnSm btnGhost collectionCardShare"
            type="button"
            onClick={() => {
              trackEvent("collection_card_share_room_click", { route: "collections", collectionSlug: collection.slug });
              onShareRoom(collection);
            }}
            aria-label={`Share ${collection.displayName} playground`}
            title="Share playground"
          >
            <Icon name="share" size={13} />
            Share
          </button>
          {signedIn ? (
            <a
              className="btn btnSm btnGhost collectionCardPlay"
              href={`#/collections/${collection.slug}/play`}
              onClick={() => trackEvent("collection_card_room_click", { route: "collections", collectionSlug: collection.slug })}
              aria-label={`Join ${collection.displayName} playground`}
            >
              <Icon name="play" size={11} />
              Join
            </a>
          ) : (
            <button
              className="btn btnSm btnGhost collectionCardPlay"
              type="button"
              onClick={() => {
                trackEvent("collection_card_room_sign_in_click", { route: "collections", collectionSlug: collection.slug });
                onSignIn();
              }}
              aria-label={`Sign in to join ${collection.displayName} playground`}
            >
              <Icon name="play" size={11} />
              Join
            </button>
          )}
        </div>
      </footer>
    </article>
  );
}

function collectionTopPetsLabel(collection: CollectionSummary) {
  if (!collection.topPets.length) return "No pets yet";
  const names = collection.topPets.slice(0, 3).map((pet) => pet.displayName);
  return `Featuring ${names.join(", ")}`;
}
