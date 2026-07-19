import type { PetAnimationRow } from "../../domain/config";
import type { Pet } from "../../domain/types";
import { Icon } from "../../ui/Icon";
import { Spinner } from "../../ui/Spinner";
import { usePetGifExport } from "../usePetGifExport";

/* Slim export bar under the exhibit: the animation states themselves are
   browsed on the hero stage via the state chips, so this section only
   handles taking assets out — GIFs, the sheet — plus the sprite-fix
   entry point for owners. */
export function DetailStatesGrid({
  pet,
  activeState,
  canFixSprites,
  onFixSprites
}: {
  pet: Pet;
  activeState: PetAnimationRow;
  canFixSprites: boolean;
  onFixSprites: (pet: Pet) => void;
}) {
  const { gifExportBusy, gifExportStatus, exportCurrentStateGif, exportAllStateGifs } = usePetGifExport(pet, activeState);

  return (
    <article className="detailStates detailExportBar" aria-label="Export">
      <header className="detailSectionHeader">
        <div className="detailExportCopy">
          <span className="detailSectionLabel">Export</span>
          <p className="detailSectionHint">
            GIFs render from the live sheet — pick a state on the stage, then grab it.
          </p>
        </div>
        <div className="detailStatesActions">
          <button
            className="btn btnSm"
            type="button"
            disabled={Boolean(gifExportBusy)}
            onClick={exportCurrentStateGif}
          >
            {gifExportBusy === "current" ? <Spinner size={12} /> : <Icon name="download" size={13} />}
            {gifExportBusy === "current" ? "Exporting" : `${activeState.label} GIF`}
          </button>
          <button
            className="btn btnSm"
            type="button"
            disabled={Boolean(gifExportBusy)}
            onClick={exportAllStateGifs}
          >
            {gifExportBusy === "all" ? <Spinner size={12} /> : <Icon name="package" size={13} />}
            {gifExportBusy === "all" ? "Exporting" : "All GIFs"}
          </button>
          <a className="btn btnSm" href={pet.spritesheetUrl} download>
            <Icon name="sheet" size={13} />
            Sheet
          </a>
        </div>
      </header>
      {gifExportStatus ? (
        <p className="status detailStatesStatus" role="alert">
          {gifExportStatus}
        </p>
      ) : null}
      {canFixSprites ? (
        <div className="detailSpriteFixPanel" role="note">
          <div className="detailSpriteFixCopy">
            <span className="detailSpriteFixLabel">Sprite editor</span>
            <strong>Repair directions, rows, frames, pixels, and sprite placement.</strong>
            <p>Use this when the pet installs into Codex but a spritesheet row, frame, artifact, or cell position is wrong.</p>
          </div>
          <button className="btn btnPrimary btnSm detailSpriteFixButton" type="button" onClick={() => onFixSprites(pet)}>
            <Icon name="sheet" size={13} />
            Open editor
          </button>
        </div>
      ) : null}
    </article>
  );
}
