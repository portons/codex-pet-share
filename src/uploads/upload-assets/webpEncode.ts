import webpEncWasmUrl from "@jsquash/webp/codec/enc/webp_enc.wasm?url";
import webpEncSimdWasmUrl from "@jsquash/webp/codec/enc/webp_enc_simd.wasm?url";

let webpEncodePromise: Promise<typeof import("@jsquash/webp/encode").default> | null = null;

export async function encodeCanvasAsLosslessWebp(canvas: HTMLCanvasElement, fileName: string) {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error(`Could not create ${fileName}.`);
  }
  const encode = await loadWebpEncoder();
  const buffer = await encode(context.getImageData(0, 0, canvas.width, canvas.height), {
    lossless: 1,
    exact: 1
  });
  return new File([buffer], fileName, { type: "image/webp" });
}

function loadWebpEncoder() {
  webpEncodePromise ??= import("@jsquash/webp/encode").then(async ({ default: encode, init }) => {
    await init({
      locateFile: (path: string) => path.includes("simd") ? webpEncSimdWasmUrl : webpEncWasmUrl
    });
    return encode;
  });
  return webpEncodePromise;
}

export async function encodeCanvasAsWebp(
  canvas: HTMLCanvasElement,
  fileName: string,
  quality: number
) {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", quality / 100);
  });
  if (!blob) {
    throw new Error(`Could not create ${fileName}.`);
  }
  return new File([blob], fileName, { type: "image/webp" });
}
