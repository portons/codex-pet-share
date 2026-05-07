import { petStates } from "../domain/config";
import type { GalleryView } from "../domain/types";

export function GallerySkeleton({ view = "standard" }: { view?: GalleryView }) {
  const skeletonItems = view === "compact" ? 12 : 6;
  return (
    <div className={`galleryGrid ${view}`} aria-busy="true">
      {Array.from({ length: skeletonItems }, (_, item) => (
        <article className={`petCard card ${view === "compact" ? "compact" : ""}`} key={item}>
          <div className="skeleton previewSkeleton" />
          <div className="petCardBody">
            <div className="skeleton line short" />
            <div className="skeleton line title" />
            {view !== "compact" && (
              <>
                <div className="skeleton line" />
                <div className="skeleton line medium" />
              </>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <section className="detailSurface">
      <article className="detailHero">
        <header className="detailHeader">
          <div className="skeleton line short" />
          <div className="skeleton line title wide" />
          <div className="skeleton line" />
          <div className="skeleton line medium" />
        </header>
        <div className="detailShowcase">
          <div className="skeleton detailPreviewSkeleton" />
        </div>
        <div className="detailHeroFooter">
          <div className="skeleton line short" />
          <div className="detailSocialActions">
            <div className="skeleton actionSkeleton" />
            <div className="skeleton actionSkeleton" />
          </div>
        </div>
      </article>
      <article className="detailInstall">
        <header className="detailSectionHeader">
          <span className="skeleton line short" />
          <span className="skeleton line" />
        </header>
        <div className="skeleton commandSkeleton" />
        <div className="skeleton line medium" />
      </article>
      <article className="detailStates">
        <header className="detailSectionHeader">
          <span className="skeleton line short" />
          <div className="detailStatesActions">
            <div className="skeleton actionSkeleton" />
            <div className="skeleton actionSkeleton" />
            <div className="skeleton actionSkeleton" />
          </div>
        </header>
        <div className="detailStatesGrid">
          {petStates.map((state) => (
            <div className="detailStateTile skeletonTile" key={state.id}>
              <div className="detailStateTileMain" aria-hidden="true">
                <div className="skeleton statePreviewSkeleton" />
                <span className="detailStateTileLabel">
                  <span className="skeleton line short" />
                </span>
              </div>
              <div className="skeleton detailStateTileGif" aria-hidden="true" />
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

export function UploadsSkeleton() {
  return (
    <table className="uploadsTable card" aria-label="Loading uploads">
      <tbody>
        {[0, 1, 2].map((item) => (
          <tr className="uploadsRow" key={item}>
            <td>
              <div className="uploadsPackage">
                <div className="skeleton rowPreviewSkeleton" />
                <div className="uploadsName">
                  <div className="skeleton line title" />
                  <div className="skeleton line short" />
                </div>
              </div>
            </td>
            <td>
              <div className="skeleton line" />
            </td>
            <td>
              <div className="skeleton line medium" />
            </td>
            <td>
              <div className="skeleton line medium" />
            </td>
            <td>
              <div className="rowActions">
                <div className="skeleton actionSkeleton small" />
                <div className="skeleton actionSkeleton small" />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
