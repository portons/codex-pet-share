import type { PetAnimationRow } from "../../domain/config";
import type { Pet } from "../../domain/types";
import type { SpriteFixOperation } from "../../uploads/uploadAssets";
import { directionOptions, directionPairOptions, directionPairs } from "./editorConfig";
import { PanelTitle, SegmentedControl, StageHeading } from "./EditorControls";
import { cellPlanFor, directionOptionsForPair, stateForRow } from "./rowPlans";
import { AnimatedSprite, SpriteFrame } from "./SpriteFrames";
import type { DirectionPairId, SpriteRowPlan } from "./types";

export function DirectionInspector({
  pet,
  busy,
  pair,
  setPair,
  directionOperation,
  setDirectionOperation,
  selectedDirection
}: {
  pet: Pet;
  busy: boolean;
  pair: DirectionPairId;
  setPair: (pair: DirectionPairId) => void;
  directionOperation: SpriteFixOperation | null;
  setDirectionOperation: (operation: SpriteFixOperation) => void;
  selectedDirection: (typeof directionOptions)[number] | null;
}) {
  const options = directionOptionsForPair(pair);
  return (
    <div className="spriteEditorInspectorPanel">
      <PanelTitle title={pair === "look" ? "Look-around direction" : "Run direction"} />
      {pet.spriteVersionNumber === 2 ? (
        <SegmentedControl<DirectionPairId>
          label="Rows"
          value={pair}
          values={directionPairOptions}
          disabled={busy}
          onChange={setPair}
        />
      ) : null}
      <p className="spriteEditorPlanText">
        {pair === "look"
          ? "Pick the smallest repair that makes the two look-around rows match their v2 direction labels."
          : "Pick the smallest repair that makes the running rows match their runtime meaning."}
      </p>
      <div className="spriteEditorOptionStack" role="radiogroup" aria-label={`${pair === "look" ? "Look-around" : "Run"} direction repair`}>
        {options.map((option) => (
          <label className={`spriteEditorOption ${directionOperation === option.id ? "active" : ""}`} key={option.id}>
            <input
              checked={directionOperation === option.id}
              disabled={busy}
              name="spriteDirectionOperation"
              onChange={() => setDirectionOperation(option.id)}
              type="radio"
              value={option.id}
            />
            <span>{option.label}</span>
            <small>{option.detail}</small>
          </label>
        ))}
      </div>
      <p className="spriteEditorInspectorNote">{selectedDirection?.detail || "Choose one repair to preview and save it."}</p>
    </div>
  );
}

export function RepairStage({
  pet,
  pair,
  afterPlan,
  currentPlan,
  hasSelection
}: {
  pet: Pet;
  pair: DirectionPairId;
  afterPlan: SpriteRowPlan;
  currentPlan: SpriteRowPlan;
  hasSelection: boolean;
}) {
  const config = directionPairs[pair];
  const leftState = stateForRow(config.leftRow, pet.spriteVersionNumber);
  const rightState = stateForRow(config.rightRow, pet.spriteVersionNumber);
  return (
    <section className="spriteEditorStagePanel primary directionStage">
      <StageHeading title={config.title} label={hasSelection ? "previewing selected edit" : "choose repair"} />
      <div className="spriteEditorDirectionCompare">
        <div className="spriteEditorDirectionColumn current">
          <div className="spriteEditorDirectionColumnHead">
            <h4>Current upload</h4>
            <span>before edit</span>
          </div>
          <div className="spriteEditorRunPair compact">
            <DirectionPreviewTile
              pet={pet}
              label={pair === "look" ? "Look left" : leftState.label}
              state={leftState}
              rowPlan={currentPlan}
              side="left"
              size="small"
            />
            <DirectionPreviewTile
              pet={pet}
              label={pair === "look" ? "Look right" : rightState.label}
              state={rightState}
              rowPlan={currentPlan}
              side="right"
              size="small"
            />
          </div>
        </div>
        <div className="spriteEditorDirectionColumn after">
          <div className="spriteEditorDirectionColumnHead">
            <h4>{hasSelection ? "After save" : "Choose repair"}</h4>
            <span>{hasSelection ? config.afterNote : "no direction edit selected"}</span>
          </div>
          <div className="spriteEditorRunPair">
            <DirectionPreviewTile
              pet={pet}
              label={pair === "look" ? "Look left" : leftState.label}
              state={leftState}
              rowPlan={afterPlan}
              side="left"
              size="large"
            />
            <DirectionPreviewTile
              pet={pet}
              label={pair === "look" ? "Look right" : rightState.label}
              state={rightState}
              rowPlan={afterPlan}
              side="right"
              size="large"
            />
          </div>
        </div>
      </div>
      <div className="spriteEditorDirectionStrips">
        <article>
          <header>
            <strong>{leftState.label} row</strong>
            <span>{hasSelection ? "after save" : "current"}</span>
          </header>
          <DirectionPlanStrip pet={pet} state={leftState} rowPlan={afterPlan} size={36} />
        </article>
        <article>
          <header>
            <strong>{rightState.label} row</strong>
            <span>{hasSelection ? "after save" : "current"}</span>
          </header>
          <DirectionPlanStrip pet={pet} state={rightState} rowPlan={afterPlan} size={36} />
        </article>
      </div>
    </section>
  );
}

function DirectionPreviewTile({
  pet,
  label,
  state,
  rowPlan,
  side,
  size
}: {
  pet: Pet;
  label: string;
  state: PetAnimationRow;
  rowPlan: SpriteRowPlan;
  side: "left" | "right";
  size: "small" | "large";
}) {
  const previewSize = size === "large" ? 142 : 86;
  return (
    <article className={`spriteEditorRunTile ${side} ${size}`}>
      <header>
        <strong>{label}</strong>
        <span>{side} side</span>
      </header>
      <AnimatedSprite pet={pet} state={state} rowPlan={rowPlan} size={previewSize} fps={8} />
    </article>
  );
}

function DirectionPlanStrip({ pet, state, rowPlan, size }: { pet: Pet; state: PetAnimationRow; rowPlan: SpriteRowPlan; size: number }) {
  return (
    <div className="spriteEditorStrip">
      {Array.from({ length: state.frames }, (_, frame) => {
        const plan = cellPlanFor(rowPlan, state.row, frame);
        return (
          <SpriteFrame
            frame={plan.sourceFrame}
            key={frame}
            pet={pet}
            row={plan.sourceRow}
            size={size}
            flipX={plan.flipX}
          />
        );
      })}
    </div>
  );
}
