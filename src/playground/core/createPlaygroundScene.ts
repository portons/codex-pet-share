import * as THREE from "three";
import {
  ATLAS_COLS,
  ATLAS_ROWS,
  CAMERA_DISTANCE,
  CAMERA_HEIGHT,
  CAMERA_LOOK_Y,
  FOV,
  SPRITE_HEIGHT,
  SPRITE_WIDTH
} from "./config";
import { addRoPronteraBiome } from "./roBiome";

export function createPlaygroundScene(canvas: HTMLCanvasElement, img: HTMLImageElement, atlasRows = ATLAS_ROWS) {
  const disposables: Array<{ dispose: () => void }> = [];
  const texture = new THREE.Texture(img);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  texture.repeat.set(1 / ATLAS_COLS, 1 / atlasRows);
  texture.needsUpdate = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#eadfc7");
  scene.fog = new THREE.Fog("#eadfc7", 140, 420);

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200);
  camera.position.set(0, CAMERA_HEIGHT, CAMERA_DISTANCE);
  camera.lookAt(0, CAMERA_LOOK_Y, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  scene.add(new THREE.AmbientLight(0xfff7e6, 0.74));
  const sun = new THREE.DirectionalLight(0xffe2ad, 0.5);
  sun.position.set(6, 12, 8);
  scene.add(sun);

  addRoPronteraBiome(scene, disposables);

  const spriteMat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.05,
    fog: true
  });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(SPRITE_WIDTH, SPRITE_HEIGHT, 1);
  sprite.center.set(0.5, 0);
  sprite.position.set(0, 0, 18);
  scene.add(sprite);
  disposables.push(spriteMat);

  const shadowGeom = new THREE.CircleGeometry(SPRITE_WIDTH / 2.1, 24);
  const shadowMat = new THREE.MeshBasicMaterial({ color: "#10100f", transparent: true, opacity: 0.18, depthWrite: false });
  const shadow = new THREE.Mesh(shadowGeom, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, 0.02, 0);
  scene.add(shadow);
  disposables.push(shadowGeom, shadowMat);

  const loadingOrbTexture = createLoadingOrbTexture();
  disposables.push(loadingOrbTexture);

  return {
    texture,
    scene,
    camera,
    renderer,
    sprite,
    spriteMat,
    shadow,
    loadingOrbTexture,
    atlasRows,
    disposables
  };
}

function createLoadingOrbTexture() {
  const orbCanvas = document.createElement("canvas");
  orbCanvas.width = 64;
  orbCanvas.height = 64;
  const octx = orbCanvas.getContext("2d");
  if (octx) {
    const grad = octx.createRadialGradient(32, 32, 2, 32, 32, 32);
    grad.addColorStop(0.0, "rgba(255,236,180,0.95)");
    grad.addColorStop(0.45, "rgba(255,194,120,0.55)");
    grad.addColorStop(0.85, "rgba(255,140,90,0.18)");
    grad.addColorStop(1.0, "rgba(255,140,90,0)");
    octx.fillStyle = grad;
    octx.beginPath();
    octx.arc(32, 32, 32, 0, Math.PI * 2);
    octx.fill();
  }
  const orbTexture = new THREE.CanvasTexture(orbCanvas);
  orbTexture.colorSpace = THREE.SRGBColorSpace;
  orbTexture.minFilter = THREE.LinearFilter;
  orbTexture.magFilter = THREE.LinearFilter;
  return orbTexture;
}
