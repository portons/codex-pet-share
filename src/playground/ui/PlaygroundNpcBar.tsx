import type { Dispatch, RefObject, SetStateAction } from "react";

export type NpcChip = {
  id: string;
  petId: string;
  displayName: string;
};

export function PlaygroundNpcBar({
  npcChips,
  maxNpcs,
  npcAddBtnRef,
  npcSearchOpen,
  setNpcSearchOpen,
  despawnNpc,
  resetWorld
}: {
  npcChips: NpcChip[];
  maxNpcs: number;
  npcAddBtnRef: RefObject<HTMLButtonElement | null>;
  npcSearchOpen: boolean;
  setNpcSearchOpen: Dispatch<SetStateAction<boolean>>;
  despawnNpc: (npcId: string) => void;
  resetWorld: () => void;
}) {
  return (
    <div className="playgroundNpcBar" role="group" aria-label="NPC slots">
      {npcChips.map((c) => (
        <button
          key={c.id}
          type="button"
          className="playgroundNpcChip"
          onClick={() => despawnNpc(c.id)}
          title={`Remove ${c.displayName}`}
          data-tooltip={`Remove ${c.displayName}`}
        >
          {c.displayName}
          <span aria-hidden="true" className="playgroundNpcChipX">×</span>
        </button>
      ))}
      {npcChips.length < maxNpcs && (
        <button
          ref={npcAddBtnRef}
          type="button"
          className="playgroundNpcAddBtn"
          onClick={() => setNpcSearchOpen((v) => !v)}
          aria-expanded={npcSearchOpen}
          data-tooltip="Spawn an NPC"
        >
          + NPC
        </button>
      )}
      <button
        type="button"
        className="playgroundResetBtn"
        onClick={resetWorld}
        data-tooltip="Clear NPCs, balls, pads"
        aria-label="Reset world"
      >
        <svg
          aria-hidden="true"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v5h5" />
        </svg>
      </button>
    </div>
  );
}
