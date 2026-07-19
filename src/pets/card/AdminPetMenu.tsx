import { autoUpdate, flip, offset, shift, useFloating } from "@floating-ui/react";
import { useEffect, useRef, useState } from "react";
import { isNsfwPet } from "../../domain/pets";
import type { Pet } from "../../domain/types";
import { Icon } from "../../ui/Icon";

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
            Edit details
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
