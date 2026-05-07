import type { GalleryMeta } from "../domain/types";

const preciseCountFormatter = new Intl.NumberFormat(undefined);

export function ResultBar({ meta, loading }: { meta: GalleryMeta; loading: boolean }) {
  return (
    <div className="resultBar">
      <span>{preciseCountFormatter.format(meta.total)} {meta.total === 1 ? "pet" : "pets"}</span>
      <span>
        {meta.totalPages > 1 ? `Page ${meta.page} / ${meta.totalPages}` : ""}
        {loading ? (meta.totalPages > 1 ? " · loading" : "loading") : ""}
      </span>
    </div>
  );
}
