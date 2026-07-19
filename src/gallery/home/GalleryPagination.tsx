import type { GalleryMeta, GallerySort } from "../../domain/types";
import { Spinner } from "../../ui/Spinner";
import { PaginationControls } from "../PaginationControls";

// Pagination wiring for the gallery home. Random and discussed sorts
// own their paging affordances (randomize button / leaderboard pager),
// so both wrappers stay out of the way for those sorts.

export function GalleryTopPagination({
  activeSort,
  meta,
  loading,
  onPage
}: {
  activeSort: GallerySort;
  meta: GalleryMeta;
  loading: boolean;
  onPage: (page: number) => void;
}) {
  if (activeSort !== "random" && activeSort !== "discussed" && meta.totalPages > 1) {
    return (
      <div className="galleryTopPagination">
        <PaginationControls meta={meta} loading={loading} onPage={onPage} />
      </div>
    );
  }
  return null;
}

export function GalleryFooterControls({
  activeSort,
  petCount,
  meta,
  loading,
  onPage,
  onRandomize
}: {
  activeSort: GallerySort;
  petCount: number;
  meta: GalleryMeta;
  loading: boolean;
  onPage: (page: number) => void;
  onRandomize: () => void;
}) {
  if (activeSort === "random" && petCount) {
    return (
      <div className="randomizeControls">
        <button className="btn" type="button" disabled={loading} onClick={onRandomize}>
          {loading ? <Spinner size={14} /> : null}
          Randomize
        </button>
      </div>
    );
  }
  if (activeSort === "random" || activeSort === "discussed") {
    return null;
  }
  return <PaginationControls meta={meta} loading={loading} onPage={onPage} />;
}
