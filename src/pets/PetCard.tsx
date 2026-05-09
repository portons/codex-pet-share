import { autoUpdate, flip, offset, shift, useFloating } from "@floating-ui/react";
import { type KeyboardEvent, type MouseEvent, useEffect, useRef, useState } from "react";
import { type TagName } from "../domain/config";
import { formatMetric } from "../domain/format";
import { isNsfwPet } from "../domain/pets";
import { navigate } from "../domain/routing";
import type { ContentMode, GalleryView, Pet, User } from "../domain/types";
import { Icon } from "../ui/Icon";
import { GalleryPetPreview } from "./PetPreview";
import { NsfwNotice, OwnerLabel, PetStats, PetTags } from "./PetMeta";

export function AdminPetMenu({
  pet,
  compact = false,
  deletingPetId,
  shadowbanBusyOwnerId,
  nsfwBusyId,
  onEditTags,
  onManageCollections,
  onToggleNsfw,
  onShadowbanOwner,
  onDelete
}: {
  pet: Pet;
  compact?: boolean;
  deletingPetId: string;
  shadowbanBusyOwnerId: string;
  nsfwBusyId: string;
  onEditTags: (pet: Pet) => void;
  onManageCollections: (pet: Pet) => void;
  onToggleNsfw: (pet: Pet) => void;
  onShadowbanOwner?: (pet: Pet) => void;
  onDelete: (pet: Pet) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { refs, floatingStyles } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: "bottom-start",
    strategy: "fixed",
    whileElementsMounted: autoUpdate,
    middleware: [offset(6), flip({ padding: 12 }), shift({ padding: 12 })]
  });
  const ownerModerationBusy = Boolean(pet.ownerId && shadowbanBusyOwnerId === pet.ownerId);
  const nsfwBusy = nsfwBusyId === pet.id;

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function run(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <div
      ref={menuRef}
      className="adminPetMenu"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <button
        className="btn btnSm adminPetMenuTrigger"
        type="button"
        aria-label={`Admin actions for ${pet.displayName}`}
        aria-haspopup="true"
        aria-expanded={open}
        title="Admin actions"
        onClick={(event) => {
          if (open) {
            setOpen(false);
            return;
          }
          const triggerRect = event.currentTarget.getBoundingClientRect();
          const hasPointerPosition = event.clientX !== 0 || event.clientY !== 0;
          const x = hasPointerPosition ? event.clientX : triggerRect.left;
          const y = hasPointerPosition ? event.clientY : triggerRect.bottom;
          refs.setPositionReference({
            getBoundingClientRect: () => DOMRect.fromRect({ x, y, width: 0, height: 0 })
          });
          setOpen(true);
        }}
      >
        <Icon name="more" size={compact ? 13 : 14} />
        {!compact && "Admin"}
      </button>
      {open && (
        <div
          ref={refs.setFloating}
          className="adminPetMenuList"
          role="menu"
          style={floatingStyles}
        >
          <button type="button" role="menuitem" onClick={() => run(() => onEditTags(pet))}>
            Edit tags
          </button>
          <button type="button" role="menuitem" onClick={() => run(() => onManageCollections(pet))}>
            Manage collections
          </button>
          <button type="button" role="menuitem" disabled={nsfwBusy} onClick={() => run(() => onToggleNsfw(pet))}>
            {nsfwBusy ? "Saving" : isNsfwPet(pet) ? "Mark safe" : "Mark NSFW"}
          </button>
          {pet.ownerId && onShadowbanOwner && (
            <button
              type="button"
              role="menuitem"
              disabled={ownerModerationBusy}
              onClick={() => run(() => onShadowbanOwner(pet))}
            >
              {ownerModerationBusy ? "Saving" : pet.ownerShadowbanned ? "Unshadowban owner" : "Shadowban owner"}
            </button>
          )}
          <button
            className="dangerMenuItem"
            type="button"
            role="menuitem"
            disabled={Boolean(deletingPetId)}
            onClick={() => run(() => onDelete(pet))}
          >
            {deletingPetId === pet.id ? "Deleting" : "Delete"}
          </button>
        </div>
      )}
    </div>
  );
}

export function PetCard({
  pet,
  view = "standard",
  user,
  likeBusyId,
  deletingPetId,
  shadowbanBusyOwnerId,
  nsfwBusyId,
  contentMode,
  hasCollections,
  collectionBadge,
  onLike,
  onShare,
  onPlayground,
  onDownload,
  onTagClick,
  onEditTags,
  onManageCollections,
  onCollect,
  onRemoveFromCollection,
  onPreview,
  previewActive = false,
  onToggleNsfw,
  onShadowbanOwner,
  onDelete,
  onSignIn
}: {
  pet: Pet;
  view?: GalleryView;
  user: User | null;
  likeBusyId: string;
  deletingPetId: string;
  shadowbanBusyOwnerId: string;
  nsfwBusyId: string;
  contentMode: ContentMode;
  hasCollections: boolean;
  collectionBadge?: { slug: string; displayName: string };
  onLike: (pet: Pet) => void;
  onShare: (pet: Pet) => void;
  onPlayground?: (pet: Pet) => void;
  onDownload: (pet: Pet) => void;
  onTagClick: (tag: TagName, sourceTags: string[]) => void;
  onEditTags: (pet: Pet) => void;
  onManageCollections: (pet: Pet) => void;
  onCollect?: (pet: Pet) => void;
  onRemoveFromCollection?: (pet: Pet) => void;
  onPreview?: (pet: Pet) => void;
  previewActive?: boolean;
  onToggleNsfw: (pet: Pet) => void;
  onShadowbanOwner?: (pet: Pet) => void;
  onDelete: (pet: Pet) => void;
  onSignIn: () => void;
}) {
  const compact = view === "compact";
  const likeLabel = pet.likedByMe ? "Liked" : "Like";
  const canDeleteOwnPet = Boolean(!user?.isAdmin && user?.id && user.id === pet.ownerId);
  const openPetPage = () => navigate(`/pets/${pet.id}`);
  const stopCardPropagation = (event: MouseEvent<HTMLElement>) => event.stopPropagation();
  const handleCardBodyKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    openPetPage();
  };

  const hasQuickAction = Boolean(onPreview || onPlayground);

  return (
    <article className={`petCard card ${compact ? "compact" : ""}`}>
      {hasQuickAction && (
        <div
          className="petCardQuickActions"
          onClick={stopCardPropagation}
          onMouseOver={stopCardPropagation}
          onPointerDown={stopCardPropagation}
        >
          {onPreview && (
            <button
              className={`petCardQuickAction ${previewActive ? "activeSoft" : ""}`}
              type="button"
              aria-pressed={previewActive}
              aria-label="Preview on cursor"
              title="Preview on cursor"
              data-tooltip={previewActive ? "Stop cursor preview" : "Preview on cursor"}
              onClick={() => onPreview(pet)}
            >
              <Icon name="eye" size={14} />
            </button>
          )}
          {onPlayground && (
            <button
              className="petCardQuickAction"
              type="button"
              aria-label="Open 3D playground"
              title="3D playground · WASD · shift sprint · space jump · E wave · Q sit · drag rotate · scroll zoom"
              data-tooltip="Open 3D playground"
              onClick={() => onPlayground(pet)}
            >
              <Icon name="cube" size={14} />
            </button>
          )}
        </div>
      )}
      {collectionBadge && (
        <a
          className="petCardCollectionPill"
          href={`#/collections/${collectionBadge.slug}`}
          onClick={stopCardPropagation}
          onMouseOver={stopCardPropagation}
          onPointerDown={stopCardPropagation}
        >
          <Icon name="package" size={12} />
          <span>{collectionBadge.displayName}</span>
        </a>
      )}
      <button className="petCardPreview" type="button" onClick={openPetPage}>
        <GalleryPetPreview pet={pet} compact={compact} />
      </button>
      <div
        className="petCardBody clickable"
        role="link"
        tabIndex={0}
        onClick={openPetPage}
        onKeyDown={handleCardBodyKeyDown}
      >
        <div className="cardMeta">
          <div className="petCardIdentity">
            <h2>{pet.displayName}</h2>
            <div
              className="petCardOwner"
              onClick={stopCardPropagation}
              onMouseOver={stopCardPropagation}
              onPointerDown={stopCardPropagation}
            >
              by <OwnerLabel pet={pet} />
            </div>
          </div>
          {!compact && <PetStats pet={pet} />}
        </div>
        <NsfwNotice pet={pet} />
        {!compact && <p className="petCardDescription">{pet.description}</p>}
        {!compact && pet.tags.length > 0 && (
          <div
            className="petCardTags"
            onClick={stopCardPropagation}
            onMouseOver={stopCardPropagation}
            onPointerDown={stopCardPropagation}
          >
            <PetTags tags={pet.tags} onTagClick={onTagClick} />
          </div>
        )}
      </div>
      <div className="petCardActions">
        <button
          className="btn btnSm"
          type="button"
          aria-label="Download"
          title="Download"
          onClick={() => onDownload(pet)}
        >
          <Icon name="download" size={13} />
          {!compact && "Download"}
        </button>
        <button
          className="btn btnSm"
          type="button"
          aria-label="Share"
          title="Share"
          onClick={() => onShare(pet)}
        >
          <Icon name="share" size={13} />
          {!compact && "Share"}
        </button>
        {user && onCollect && (
          <button
            className="btn btnSm"
            type="button"
            aria-label="Add to collection"
            title="Add to collection"
            onClick={() => onCollect(pet)}
          >
            <Icon name="package" size={13} />
            {!compact && "Add to collection"}
          </button>
        )}
        {onRemoveFromCollection && (
          <button
            className="btn btnSm btnDanger"
            type="button"
            aria-label="Remove from collection"
            title="Remove from collection"
            onClick={() => onRemoveFromCollection(pet)}
          >
            <Icon name="trash" size={13} />
            {!compact && "Remove"}
          </button>
        )}
        {user?.isAdmin && (
          <AdminPetMenu
            pet={pet}
            compact={compact}
            deletingPetId={deletingPetId}
            shadowbanBusyOwnerId={shadowbanBusyOwnerId}
            nsfwBusyId={nsfwBusyId}
            onEditTags={onEditTags}
            onManageCollections={onManageCollections}
            onToggleNsfw={onToggleNsfw}
            onShadowbanOwner={onShadowbanOwner}
            onDelete={onDelete}
          />
        )}
        {canDeleteOwnPet && (
          <button
            className="btn btnSm btnDanger"
            type="button"
            disabled={Boolean(deletingPetId)}
            aria-label="Delete"
            title="Delete"
            onClick={() => onDelete(pet)}
          >
            <Icon name="trash" size={13} />
            {!compact && (deletingPetId === pet.id ? "Deleting" : "Delete")}
          </button>
        )}
        <button
          className={`btn btnSm likeButton ${pet.likedByMe ? "active" : ""}`}
          type="button"
          disabled={likeBusyId === pet.id}
          aria-label={pet.likedByMe ? "Unlike" : "Like"}
          title={pet.likedByMe ? "Unlike" : "Like"}
          onClick={() => (user ? onLike(pet) : onSignIn())}
        >
          <Icon name="heart" size={13} />
          {compact ? formatMetric(pet.likeCount) : likeLabel}
        </button>
      </div>
    </article>
  );
}
