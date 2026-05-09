import type { GalleryMeta } from "../domain/types";

const preciseCountFormatter = new Intl.NumberFormat(undefined);

export function ResultBar({ meta, loading }: { meta: GalleryMeta; loading: boolean }) {
  return (
    <div className="resultBar" aria-busy={loading} data-loading={loading ? "true" : "false"}>
      <span>{preciseCountFormatter.format(meta.total)} {meta.total === 1 ? "pet" : "pets"}</span>
      <span className="resultPageStatus">
        {meta.totalPages > 1 ? `Page ${meta.page} / ${meta.totalPages}` : ""}
      </span>
    </div>
  );
}
