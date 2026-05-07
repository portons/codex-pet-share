import { type FormEvent, useEffect, useRef, useState } from "react";
import {
  editablePetKindOptions,
  galleryFilterTags,
  gallerySorts,
  petKindOptions,
  type TagName
} from "../domain/config";
import type { ContentMode, EditablePetKind, GallerySort, GalleryView, PetKind } from "../domain/types";
import { Icon } from "../ui/Icon";
import { Spinner } from "../ui/Spinner";

export function GallerySearch({
  query,
  activeTags,
  activeSort,
  activeView,
  activeKind,
  contentMode,
  loading,
  onQuery,
  onTagToggle,
  onTagsClear,
  onSort,
  onView,
  onKind,
  onContentMode,
  onSubmit
}: {
  query: string;
  activeTags: string[];
  activeSort: GallerySort;
  activeView: GalleryView;
  activeKind: PetKind;
  contentMode: ContentMode;
  loading: boolean;
  onQuery: (value: string) => void;
  onTagToggle: (value: TagName) => void;
  onTagsClear: () => void;
  onSort: (value: GallerySort) => void;
  onView: (value: GalleryView) => void;
  onKind: (value: PetKind) => void;
  onContentMode: (value: ContentMode) => void;
  onSubmit: (event: FormEvent) => void;
}) {
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
      <div className="galleryFilterRow">
        <div className="galleryControlGroup">
          <SortControls activeSort={activeSort} onSort={onSort} />
          <ViewControls activeView={activeView} onView={onView} />
          <KindControls activeKind={activeKind} onKind={onKind} />
          <ContentModeToggle value={contentMode} onChange={onContentMode} />
        </div>
        <TagFilterDropdown activeTags={activeTags} onTagToggle={onTagToggle} onTagsClear={onTagsClear} />
      </div>
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

function ViewControls({ activeView, onView }: { activeView: GalleryView; onView: (value: GalleryView) => void }) {
  const views: Array<{ id: GalleryView; label: string }> = [
    { id: "standard", label: "Detailed" },
    { id: "compact", label: "Compact" }
  ];

  return (
    <div className="viewControls" aria-label="Gallery view">
      {views.map((view) => (
        <button
          className={activeView === view.id ? "active" : ""}
          key={view.id}
          type="button"
          onClick={() => onView(view.id)}
        >
          {view.label}
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

function ContentModeToggle({ value, onChange }: { value: ContentMode; onChange: (value: ContentMode) => void }) {
  const checked = value === "all";
  return (
    <label className="contentModeSwitch">
      <span>NSFW</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked ? "all" : "safe")}
      />
      <span className="switchTrack" aria-hidden="true">
        <span className="switchThumb" />
      </span>
    </label>
  );
}

function TagFilterDropdown({
  activeTags,
  onTagToggle,
  onTagsClear
}: {
  activeTags: string[];
  onTagToggle: (value: TagName) => void;
  onTagsClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const label = activeTags.length === 0 ? "All" : activeTags.length === 1 ? activeTags[0] : `${activeTags.length} selected`;

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div
      ref={dropdownRef}
      className="tagDropdown"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <button
        className={`tagDropdownTrigger ${open ? "active" : ""}`}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>Tags</span>
        <strong>{label}</strong>
      </button>
      {open && (
        <div className="tagDropdownMenu" role="menu">
          <div className="tagDropdownHead">
            <span>Filter tags</span>
            {activeTags.length ? (
              <button type="button" onClick={onTagsClear}>
                Clear
              </button>
            ) : null}
          </div>
          <div className="tagDropdownList">
            {galleryFilterTags.map((tag) => {
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
      )}
    </div>
  );
}

export function TagFilters({ activeTag, onTag }: { activeTag: string[]; onTag: (value: TagName) => void }) {
  return (
    <div className="tagFilters" aria-label="Pet tags">
      {galleryFilterTags.map((tag) => (
        <button className={`tagPill ${activeTag.includes(tag) ? "active" : ""}`} key={tag} type="button" onClick={() => onTag(tag)}>
          {tag}
        </button>
      ))}
    </div>
  );
}
