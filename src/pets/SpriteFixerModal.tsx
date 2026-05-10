import { useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { spriteCellHeight, spriteCellWidth, type PetState } from "../domain/config";
import type { Pet } from "../domain/types";
import { Icon } from "../ui/Icon";
import { Spinner } from "../ui/Spinner";
import type { SpriteFixOperation } from "../uploads/uploadAssets";

const runningStates = [
  { id: "running-right", label: "Run right", row: 1, frames: 8, direction: "right" },
  { id: "running-left", label: "Run left", row: 2, frames: 8, direction: "left" }
] as const satisfies Array<Pick<PetState, "id" | "label" | "row" | "frames"> & { direction: "left" | "right" }>;

const spriteFixOptions = [
  {
    id: "swap-running-rows",
    label: "Left/right switched",
    detail: "Use when the right run row is actually the left run, and the left row is actually the right run.",
    action: "Save swapped rows",
    hint: "Swap run rows"
  },
  {
    id: "mirror-right-to-left",
    label: "Left side wrong",
    detail: "Use when the right run looks correct and the left run should be rebuilt as its mirror.",
    action: "Save mirrored left",
    hint: "Mirror right"
  },
  {
    id: "mirror-left-to-right",
    label: "Right side wrong",
    detail: "Use when the left run looks correct and the right run should be rebuilt as its mirror.",
    action: "Save mirrored right",
    hint: "Mirror left"
  }
] as const satisfies Array<{ id: SpriteFixOperation; label: string; detail: string; action: string; hint: string }>;

type SpriteFixRowPlan = Record<number, { sourceRow: number; flipX: boolean }>;

function rowPlanForOperation(operation: SpriteFixOperation): SpriteFixRowPlan {
  if (operation === "mirror-right-to-left") {
    return {
      1: { sourceRow: 1, flipX: false },
      2: { sourceRow: 1, flipX: true }
    };
  }
  if (operation === "mirror-left-to-right") {
    return {
      1: { sourceRow: 2, flipX: true },
      2: { sourceRow: 2, flipX: false }
    };
  }
  return {
    1: { sourceRow: 2, flipX: false },
    2: { sourceRow: 1, flipX: false }
  };
}

export function SpriteFixerModal({
  pet,
  status,
  busy,
  onSubmit,
  onClose
}: {
  pet: Pet;
  status: string;
  busy: boolean;
  onSubmit: (event: FormEvent, operation: SpriteFixOperation) => void | Promise<void>;
  onClose: () => void;
}) {
  const [operation, setOperation] = useState<SpriteFixOperation>("swap-running-rows");
  const currentPlan = useMemo<SpriteFixRowPlan>(() => ({
    1: { sourceRow: 1, flipX: false },
    2: { sourceRow: 2, flipX: false }
  }), []);
  const afterPlan = useMemo(() => rowPlanForOperation(operation), [operation]);
  const selectedOption = spriteFixOptions.find((option) => option.id === operation) || spriteFixOptions[0];

  return (
    <div
      className="modalBackdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onClose();
        }
      }}
    >
      <section className="spriteFixerModal" role="dialog" aria-modal="true" aria-label={`Fix sprites for ${pet.displayName}`}>
        <div className="modalHeader">
          <div className="modalTitle compact">
            <p className="metaText">Sprite fixer</p>
            <h2>{pet.displayName}</h2>
          </div>
          <button className="btn btnSm btnGhost modalCloseButton" type="button" onClick={onClose} disabled={busy}>
            <Icon name="close" size={12} />
            Close
          </button>
        </div>

        <form className="spriteFixerForm" onSubmit={(event) => onSubmit(event, operation)}>
          <div className="spriteFixerIntro">
            <span className="spriteFixerIntroIcon" aria-hidden="true">
              <Icon name="swap" size={16} />
            </span>
            <div>
              <strong>Fix left/right run rows</strong>
              <p>Choose the smallest edit that matches what is wrong in the uploaded sheet.</p>
            </div>
          </div>

          <div className="spriteFixerToolbar">
            <div className="spriteFixerSegments" role="radiogroup" aria-label="Sprite repair operation">
              {spriteFixOptions.map((option) => (
                <label className={`spriteFixerSegment ${operation === option.id ? "active" : ""}`} key={option.id}>
                  <input
                    checked={operation === option.id}
                    disabled={busy}
                    name="spriteFixOperation"
                    onChange={() => setOperation(option.id)}
                    type="radio"
                    value={option.id}
                  />
                  <span>{option.label}</span>
                  <small>{option.hint}</small>
                </label>
              ))}
            </div>
            <p className="spriteFixerModeDetail">{selectedOption.detail}</p>
          </div>

          <div className="spriteFixerComparison">
            <SpriteFixerColumn title="Current upload" variant="source" pet={pet} rowPlan={currentPlan} />
            <SpriteFixerColumn title="After repair" variant="result" pet={pet} rowPlan={afterPlan} />
          </div>

          <div className="spriteFixerActions">
            <button className="btn btnPrimary btnLg" type="submit" disabled={busy}>
              {busy ? <Spinner size={14} /> : <Icon name="check" size={14} />}
              {busy ? "Saving" : selectedOption.action}
            </button>
            <button className="btn btnLg" type="button" disabled={busy} onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>

        {status && (
          <p className="status" role="alert">
            {status}
          </p>
        )}
      </section>
    </div>
  );
}

function SpriteFixerColumn({
  title,
  variant,
  pet,
  rowPlan
}: {
  title: string;
  variant: "source" | "result";
  pet: Pet;
  rowPlan: SpriteFixRowPlan;
}) {
  const states = variant === "result" ? [...runningStates].reverse() : runningStates;

  return (
    <section className={`spriteFixerColumn ${variant}`} aria-label={title}>
      <h3>{title}</h3>
      <div className="spriteFixerStates">
        {states.map((state) => (
          <SpriteFixerState pet={pet} rowPlan={rowPlan} state={state} variant={variant} key={state.id} />
        ))}
      </div>
    </section>
  );
}

function SpriteFixerState({
  pet,
  rowPlan,
  state,
  variant
}: {
  pet: Pet;
  rowPlan: SpriteFixRowPlan;
  state: (typeof runningStates)[number];
  variant: "source" | "result";
}) {
  const plan = rowPlan[state.row] || { sourceRow: state.row, flipX: false };
  return (
    <div className={`spriteFixerState ${variant}`}>
      <div className="spriteFixerStateHeader">
        <span>{state.label}</span>
        <small>{state.direction === "right" ? "moves right" : "moves left"}</small>
      </div>
      <div className={`spriteFixerStage ${state.direction}`}>
        <div
          className={`spriteFixerSprite ${plan.flipX ? "flipped" : ""}`}
          style={
            {
              backgroundImage: `url(${pet.spritesheetUrl})`,
              "--sprite-y": `${plan.sourceRow * -spriteCellHeight}px`,
              "--sprite-end-x": `${state.frames * -spriteCellWidth}px`,
              "--sprite-frames": state.frames,
              "--sprite-duration": `${Math.max(state.frames * 260, 1400)}ms`
            } as CSSProperties
          }
        />
      </div>
    </div>
  );
}
