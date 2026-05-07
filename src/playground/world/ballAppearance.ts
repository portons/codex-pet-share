import * as THREE from "three";

const BALL_COLOURS = ["#e8533f", "#3eb0e0", "#f3c63a", "#7ab85a", "#a87fce", "#ef82a2"];

export function colourForBallId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return BALL_COLOURS[Math.abs(h) % BALL_COLOURS.length];
}

export function paintBallTexture(colour: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 64;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, 128, 64);
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(0, 22, 128, 6);
  ctx.fillRect(0, 36, 128, 6);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.arc(32, 12, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.arc(96, 52, 6, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}
