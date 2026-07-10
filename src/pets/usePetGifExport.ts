import { useState } from "react";
import { bytesToArrayBuffer, downloadBlob, encodePetStateGif, loadPetSpritesheet } from "../downloads/gifExport";
import { petAnimationRows, type PetAnimationRow } from "../domain/config";
import { loadFflate } from "../domain/lazyCodecs";
import type { Pet } from "../domain/types";

export function usePetGifExport(pet: Pet, activeState: PetAnimationRow) {
  const [gifExportBusy, setGifExportBusy] = useState("");
  const [gifExportStatus, setGifExportStatus] = useState("");

  async function exportStateGif(state: PetAnimationRow, busyId: string) {
    if (gifExportBusy) return;
    setGifExportBusy(busyId);
    setGifExportStatus("");
    try {
      const spritesheet = await loadPetSpritesheet(pet);
      const gif = await encodePetStateGif(spritesheet, state);
      downloadBlob(gif, `${pet.id}-${state.id}.gif`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setGifExportStatus(
        message === "Could not load spritesheet for GIF export." || message === "Could not decode spritesheet."
          ? message
          : "Could not export GIF."
      );
    } finally {
      setGifExportBusy("");
    }
  }

  async function exportCurrentStateGif() {
    await exportStateGif(activeState, "current");
  }

  async function exportAllStateGifs() {
    if (gifExportBusy) return;
    setGifExportBusy("all");
    setGifExportStatus("");
    try {
      const spritesheet = await loadPetSpritesheet(pet);
      const files: Record<string, Uint8Array> = {};
      for (const state of petAnimationRows(pet.spriteVersionNumber)) {
        const gif = await encodePetStateGif(spritesheet, state);
        files[`${pet.id}-${state.id}.gif`] = new Uint8Array(await gif.arrayBuffer());
      }
      const { zipSync } = await loadFflate();
      const zip = zipSync(files, { level: 6 });
      downloadBlob(new Blob([bytesToArrayBuffer(zip)], { type: "application/zip" }), `${pet.id}-gifs.zip`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setGifExportStatus(
        message === "Could not load spritesheet for GIF export." || message === "Could not decode spritesheet."
          ? message
          : "Could not export GIF."
      );
    } finally {
      setGifExportBusy("");
    }
  }

  return { gifExportBusy, gifExportStatus, exportStateGif, exportCurrentStateGif, exportAllStateGifs };
}
