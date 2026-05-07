import * as THREE from "three";
import {
  ATLAS_COLS,
  ATLAS_ROWS,
  CAMERA_DISTANCE,
  CAMERA_HEIGHT,
  CAMERA_LOOK_Y,
  FLOOR_HALF,
  FOV,
  SPRITE_HEIGHT,
  SPRITE_WIDTH
} from "./config";

export function createPlaygroundScene(canvas: HTMLCanvasElement, img: HTMLImageElement) {
  const disposables: Array<{ dispose: () => void }> = [];
  const texture = new THREE.Texture(img);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  texture.repeat.set(1 / ATLAS_COLS, 1 / ATLAS_ROWS);
  texture.needsUpdate = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#f5f0dc");
  scene.fog = new THREE.Fog("#f5f0dc", 200, 600);

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200);
  camera.position.set(0, CAMERA_HEIGHT, CAMERA_DISTANCE);
  camera.lookAt(0, CAMERA_LOOK_Y, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  scene.add(new THREE.AmbientLight(0xffffff, 0.65));
  const sun = new THREE.DirectionalLight(0xffffff, 0.55);
  sun.position.set(6, 12, 8);
  scene.add(sun);

  const floorGeom = new THREE.PlaneGeometry(FLOOR_HALF * 2, FLOOR_HALF * 2);
  const floorMat = new THREE.MeshStandardMaterial({ color: "#e5dec6", roughness: 0.95 });
  const floor = new THREE.Mesh(floorGeom, floorMat);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  disposables.push(floorGeom, floorMat);

  const grid = new THREE.GridHelper(FLOOR_HALF * 2, 22, "#a59f86", "#cbc4a6");
  const gridMat = grid.material as THREE.Material | THREE.Material[];
  const setOpacity = (m: THREE.Material) => { m.transparent = true; (m as { opacity: number }).opacity = 0.6; };
  if (Array.isArray(gridMat)) {
    gridMat.forEach((m) => { setOpacity(m); disposables.push(m); });
  } else {
    setOpacity(gridMat);
    disposables.push(gridMat);
  }
  disposables.push(grid.geometry);
  grid.position.y = 0.01;
  scene.add(grid);

  const spriteMat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.05,
    fog: true
  });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(SPRITE_WIDTH, SPRITE_HEIGHT, 1);
  sprite.center.set(0.5, 0);
  sprite.position.set(0, 0, 0);
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
