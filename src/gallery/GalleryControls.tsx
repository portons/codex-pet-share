import { type FormEvent, useEffect, useRef, useState } from "react";
import {
  editablePetKindOptions,
  galleryFilterTags,
  galleryFormatOptions,
  gallerySorts,
  petKindOptions,
  type TagName
} from "../domain/config";
import type { ContentMode, EditablePetKind, GalleryFormat, GallerySort, GalleryView, PetKind } from "../domain/types";
import { Icon } from "../ui/Icon";
import { Spinner } from "../ui/Spinner";

export function GallerySearch({
  query,
  activeTags,
  activeSort,
  activeView,
  activeKind,
  activeFormat,
  contentMode,
  loading,
  onQuery,
  onTagToggle,
  onTagsClear,
  onSort,
  onView,
  onKind,
  onFormat,
  onSubmit
}: {
  query: string;
  activeTags: string[];
  activeSort: GallerySort;
  activeView: GalleryView;
  activeKind: PetKind;
  activeFormat: GalleryFormat;
  contentMode: ContentMode;
  loading: boolean;
  onQuery: (value: string) => void;
  onTagToggle: (value: TagName) => void;
  onTagsClear: () => void;
  onSort: (value: GallerySort) => void;
  onView: (value: GalleryView) => void;
  onKind: (value: PetKind) => void;
  onFormat: (value: GalleryFormat) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  /* Sort and view stay one click away; everything narrower (kind, format,
     tags) lives in the Filters popover and surfaces as removable chips. */
  const hiddenFilterCount = (activeKind === "all" ? 0 : 1) + (activeFormat === "all" ? 0 : 1) + activeTags.length;
  const activeKindLabel = petKindOptions.find((kind) => kind.id === activeKind)?.label;
  const activeFormatLabel = galleryFormatOptions.find((format) => format.id === activeFormat)?.label;

  return (
    <div className="galleryTools">
      <form className="galleryToolbar" onSubmit={onSubmit}>
        <label className="searchShell">
          <Icon name="search" size={15} />
          <input
            className="input inputLg searchInput"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Search pets"
            aria-label="Search pets"
          />
        </label>
        <button className="btn btnPrimary btnLg" type="submit" disabled={loading}>
          {loading ? <Spinner size={14} /> : null}
          {loading ? "Finding" : "Find"}
        </button>
      </form>
      <div className="galleryControlRow">
        <SortControls activeSort={activeSort} onSort={onSort} />
        <div className="galleryControlRowEnd">
          <FiltersPopover
            contentMode={contentMode}
            activeTags={activeTags}
            activeKind={activeKind}
            activeFormat={activeFormat}
            hiddenFilterCount={hiddenFilterCount}
            onTagToggle={onTagToggle}
            onKind={onKind}
            onFormat={onFormat}
          />
        </div>
      </div>
      {hiddenFilterCount > 0 && (
        <div className="activeFilterChips" aria-label="Active filters">
          {activeKind !== "all" && (
            <button className="filterChip" type="button" onClick={() => onKind("all")}>
              {activeKindLabel}
              <Icon name="close" size={10} />
            </button>
          )}
          {activeFormat !== "all" && (
            <button className="filterChip" type="button" onClick={() => onFormat("all")}>
              {activeFormatLabel}
              <Icon name="close" size={10} />
            </button>
          )}
          {activeTags.map((tag) => (
            <button className="filterChip" key={tag} type="button" onClick={() => onTagToggle(tag as TagName)}>
              #{tag}
              <Icon name="close" size={10} />
            </button>
          ))}
          <button
            className="filterChip filterChipClear"
            type="button"
            onClick={() => {
              onTagsClear();
              onKind("all");
              onFormat("all");
            }}
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

function FiltersPopover({
  contentMode,
  activeTags,
  activeKind,
  activeFormat,
  hiddenFilterCount,
  onTagToggle,
  onKind,
  onFormat
}: {
  contentMode: ContentMode;
  activeTags: string[];
  activeKind: PetKind;
  activeFormat: GalleryFormat;
  hiddenFilterCount: number;
  onTagToggle: (value: TagName) => void;
  onKind: (value: PetKind) => void;
  onFormat: (value: GalleryFormat) => void;
}) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const tags = contentMode === "all" ? galleryFilterTags : galleryFilterTags.filter((tag) => tag !== "nsfw");

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!popoverRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div
      ref={popoverRef}
      className="tagDropdown filtersPopoverAnchor"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <button
        className={`tagDropdownTrigger ${open || hiddenFilterCount > 0 ? "active" : ""}`}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Icon name="tag" size={12} />
        <span>Filters</span>
        {hiddenFilterCount > 0 ? <strong>{hiddenFilterCount}</strong> : null}
      </button>
      {open && (
        <div className="tagDropdownMenu filtersPopover" role="menu">
          <div className="filtersPopoverGroup">
            <span className="filtersPopoverLabel">Kind</span>
            <KindControls activeKind={activeKind} onKind={onKind} />
          </div>
          <div className="filtersPopoverGroup">
            <span className="filtersPopoverLabel">Format</span>
            <FormatControls activeFormat={activeFormat} onFormat={onFormat} />
          </div>
          <div className="filtersPopoverGroup">
            <span className="filtersPopoverLabel">Tags</span>
            <div className="tagDropdownList">
              {tags.map((tag) => {
                const selected = activeTags.includes(tag);
                return (
                  <button
                    className={`tagDropdownOption ${selected ? "active" : ""}`}
                    key={tag}
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={selected}
                    onClick={() => onTagToggle(tag)}
                  >
                    <span className="tagCheck">{selected ? <Icon name="check" size={12} /> : null}</span>
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormatControls({ activeFormat, onFormat }: { activeFormat: GalleryFormat; onFormat: (value: GalleryFormat) => void }) {
  return (
    <div className="formatControls" aria-label="Pet format">
      {galleryFormatOptions.map((format) => (
        <button
          className={activeFormat === format.id ? "active" : ""}
          key={format.id}
          type="button"
          onClick={() => onFormat(format.id)}
        >
          {format.label}
        </button>
      ))}
    </div>
  );
}

function SortControls({ activeSort, onSort }: { activeSort: GallerySort; onSort: (value: GallerySort) => void }) {
  return (
    <div className="sortControls" aria-label="Sort pets">
      {gallerySorts.map((sort) => (
        <button
          className={activeSort === sort.id ? "active" : ""}
          key={sort.id}
          type="button"
          onClick={() => onSort(sort.id)}
        >
          {sort.label}
        </button>
      ))}
    </div>
  );
}

function KindControls({ activeKind, onKind }: { activeKind: PetKind; onKind: (value: PetKind) => void }) {
  return (
    <div className="kindControls" aria-label="Pet kind">
      {petKindOptions.map((kind) => (
        <button
          className={activeKind === kind.id ? "active" : ""}
          key={kind.id}
          type="button"
          onClick={() => onKind(kind.id)}
        >
          {kind.label}
        </button>
      ))}
    </div>
  );
}

export function EditableKindControls({
  value,
  onChange
}: {
  value: EditablePetKind;
  onChange: (value: EditablePetKind) => void;
}) {
  return (
    <div className="kindControls" aria-label="Pet kind">
      {editablePetKindOptions.map((kind) => (
        <button
          className={value === kind.id ? "active" : ""}
          key={kind.id}
          type="button"
          onClick={() => onChange(kind.id)}
        >
          {kind.label}
        </button>
      ))}
    </div>
  );
}

export function TagFilters({
  activeTag,
  lockedTags = [],
  onTag
}: {
  activeTag: string[];
  lockedTags?: string[];
  onTag: (value: TagName) => void;
}) {
  return (
    <div className="tagFilters" aria-label="Pet tags">
      {galleryFilterTags.map((tag) => {
        const locked = lockedTags.includes(tag);
        return (
          <button
            className={`tagPill ${activeTag.includes(tag) ? "active" : ""}`}
            key={tag}
            type="button"
            disabled={locked}
            title={locked ? "Admin reviewed" : undefined}
            onClick={() => onTag(tag)}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
