import { petEditorAnimationRows } from "../../domain/config";
import type { Pet } from "../../domain/types";
import type { SpriteFixOperation } from "../../uploads/uploadAssets";
import { directionOptions, directionPairs } from "./editorConfig";
import type { DirectionPairId, SpriteCellPlan, SpriteRowPlan } from "./types";

export function stateForRow(row: number, spriteVersionNumber: Pet["spriteVersionNumber"] = 1) {
  return petEditorAnimationRows(spriteVersionNumber).find((state) => state.row === row)
    || petEditorAnimationRows(spriteVersionNumber)[0];
}

export function directionPairForOperation(operation: SpriteFixOperation | null | undefined): DirectionPairId {
  return operation === "swap-look-rows"
    || operation === "mirror-look-right-to-left"
    || operation === "mirror-look-left-to-right"
    ? "look"
    : "run";
}

export function directionOptionsForPair(pair: DirectionPairId) {
  return directionOptions.filter((option) => option.pair === pair);
}

export function currentPlanForPair(pair: DirectionPairId): SpriteRowPlan {
  const { rightRow, leftRow } = directionPairs[pair];
  return {
    [rightRow]: identityCellPlan(rightRow),
    [leftRow]: identityCellPlan(leftRow)
  };
}

export function rowPlanForOperation(operation: SpriteFixOperation): SpriteRowPlan {
  const pair = directionPairForOperation(operation);
  const { rightRow, leftRow } = directionPairs[pair];
  const plan = currentPlanForPair(pair);
  if (operation === "swap-running-rows" || operation === "swap-look-rows") {
    return {
      [rightRow]: sourceCellPlan(leftRow),
      [leftRow]: sourceCellPlan(rightRow)
    };
  }

  const mirrorsRightIntoLeft = operation === "mirror-right-to-left"
    || operation === "mirror-look-right-to-left";
  const sourceRow = mirrorsRightIntoLeft ? rightRow : leftRow;
  const targetRow = mirrorsRightIntoLeft ? leftRow : rightRow;
  return {
    ...plan,
    [targetRow]: Array.from({ length: 8 }, (_, targetFrame) => {
      if (pair === "look" && targetFrame === 0) {
        return { sourceRow: targetRow, sourceFrame: 0, flipX: false };
      }
      return {
        sourceRow,
        sourceFrame: pair === "look" ? 8 - targetFrame : targetFrame,
        flipX: true
      };
    })
  };
}

function identityCellPlan(row: number): readonly SpriteCellPlan[] {
  return sourceCellPlan(row);
}

function sourceCellPlan(sourceRow: number): readonly SpriteCellPlan[] {
  return Array.from({ length: 8 }, (_, sourceFrame) => ({ sourceRow, sourceFrame, flipX: false }));
}

export function cellPlanFor(rowPlan: SpriteRowPlan | undefined, row: number, frame: number): SpriteCellPlan {
  return rowPlan?.[row]?.[frame] || { sourceRow: row, sourceFrame: frame, flipX: false };
}
