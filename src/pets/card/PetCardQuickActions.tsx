import type { Pet, User } from "../../domain/types";
import { Icon } from "../../ui/Icon";
import { stopCardPropagation, trackCardAction } from "./card-events";

export function PetCardQuickActions({
  pet,
  user,
  previewActive,
  onPreview,
  onPlayground,
  onQuickComment
}: {
  pet: Pet;
  user: User | null;
  previewActive: boolean;
  onPreview?: (pet: Pet) => void;
  onPlayground?: (pet: Pet) => void;
  onQuickComment?: (pet: Pet) => void;
}) {
  const hasQuickAction = Boolean(onPreview || onPlayground || onQuickComment);
  if (!hasQuickAction) {
    return null;
  }

  return (
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
          title={pet.spriteVersionNumber === 2 ? "Cursor preview · 16 look directions" : "Cursor preview"}
          data-tooltip={previewActive ? "Stop cursor preview" : "Preview on cursor"}
          onClick={() => {
            trackCardAction(pet, user, "card_cursor_preview_click");
            onPreview(pet);
          }}
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
          onClick={() => {
            trackCardAction(pet, user, "card_playground_click");
            onPlayground(pet);
          }}
        >
          <Icon name="cube" size={14} />
        </button>
      )}
      {onQuickComment && (
        <button
          className="petCardQuickAction"
          type="button"
          aria-label="Quick comment"
          title="Quick comment"
          data-tooltip="Quick comment"
          onClick={() => {
            trackCardAction(pet, user, "card_quick_comment_click");
            onQuickComment(pet);
          }}
        >
          <Icon name="comment" size={14} />
        </button>
      )}
    </div>
  );
}
