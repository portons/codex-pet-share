export async function fetchSpritesheetFile(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Could not load spritesheet.");
  }
  const blob = await response.blob();
  return new File([blob], "spritesheet.webp", { type: "image/webp" });
}

export async function fetchPetPackageSpritesheet(downloadUrl: string) {
  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error("Could not load pet package.");
  }
  const { unzipSync } = await import("fflate");
  const archive = unzipSync(new Uint8Array(await response.arrayBuffer()));
  const spritesheetPath = Object.keys(archive).find((path) => path === "spritesheet.webp" || path.endsWith("/spritesheet.webp"));
  if (!spritesheetPath) {
    throw new Error("Pet package does not contain spritesheet.webp.");
  }
  const spritesheetBytes = new Uint8Array(archive[spritesheetPath]);
  return new File([spritesheetBytes.buffer as ArrayBuffer], "spritesheet.webp", { type: "image/webp" });
}
