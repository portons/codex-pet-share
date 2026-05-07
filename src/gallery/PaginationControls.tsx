import type { GalleryMeta } from "../domain/types";

export function PaginationControls({
  meta,
  loading,
  onPage
}: {
  meta: GalleryMeta;
  loading: boolean;
  onPage: (page: number) => void;
}) {
  if (meta.totalPages <= 1) {
    return null;
  }
  return (
    <nav className="paginationControls" aria-label="Gallery pages">
      <button className="btn" type="button" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>
        Previous
      </button>
      <span>
        Page {meta.page} / {meta.totalPages}
        {loading ? " · loading" : ""}
      </span>
      <button className="btn" type="button" disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)}>
        Next
      </button>
    </nav>
  );
}
