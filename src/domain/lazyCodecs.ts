type GifencModule = typeof import("gifenc");
type FflateModule = typeof import("fflate");

let gifencModulePromise: Promise<GifencModule> | null = null;

export function loadGifenc() {
  if (!gifencModulePromise) {
    gifencModulePromise = import("gifenc");
  }
  return gifencModulePromise;
}

let fflateModulePromise: Promise<FflateModule> | null = null;

export function loadFflate() {
  if (!fflateModulePromise) {
    fflateModulePromise = import("fflate");
  }
  return fflateModulePromise;
}
