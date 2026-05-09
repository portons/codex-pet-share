import { useEffect, useState, type FormEvent } from "react";
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
  const [draftPage, setDraftPage] = useState(String(meta.page));

  useEffect(() => {
    setDraftPage(String(meta.page));
  }, [meta.page]);

  if (meta.totalPages <= 1) {
    return null;
  }

  function submitPage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requestedPage = Number.parseInt(draftPage, 10);
    if (!Number.isFinite(requestedPage)) {
      setDraftPage(String(meta.page));
      return;
    }
    const nextPage = Math.min(Math.max(requestedPage, 1), meta.totalPages);
    setDraftPage(String(nextPage));
    onPage(nextPage);
  }

  return (
    <nav className="paginationControls" aria-busy={loading} aria-label="Gallery pages" data-loading={loading ? "true" : "false"}>
      <button className="btn" type="button" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>
        Previous
      </button>
      <form className="paginationJump" onSubmit={submitPage}>
        <label>
          <span>Page</span>
          <input
            aria-label="Page number"
            disabled={loading}
            inputMode="numeric"
            max={meta.totalPages}
            min={1}
            onChange={(event) => setDraftPage(event.target.value)}
            type="number"
            value={draftPage}
          />
        </label>
        <span className="paginationTotal">/ {meta.totalPages}</span>
        <button className="btn btnSm" type="submit" disabled={loading}>
          Go
        </button>
      </form>
      <button className="btn" type="button" disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)}>
        Next
      </button>
    </nav>
  );
}
