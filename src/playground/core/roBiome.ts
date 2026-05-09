import * as THREE from "three";
import { RO_PRONTERA_BIOME_PATH, RO_PRONTERA_FLOOR_HALF } from "./roPronteraBiome.generated";

type RoBiome = {
  textures: Array<{ url: string }>;
  meshes: Array<{
    texture: number;
    positions: number[];
    uvs: number[];
    indices: number[];
  }>;
};

export function addRoPronteraBiome(scene: THREE.Scene, disposables: Array<{ dispose: () => void }>) {
  addPronteraStage(scene, disposables);
  void loadRoBiome(scene, disposables);
}

function addPronteraStage(scene: THREE.Scene, disposables: Array<{ dispose: () => void }>) {
  const half = RO_PRONTERA_FLOOR_HALF;
  const outsideHalf = half + 20;

  const outsideGeom = new THREE.PlaneGeometry(outsideHalf * 2, outsideHalf * 2);
  const outsideMat = new THREE.MeshBasicMaterial({ color: "#4a4438", fog: true });
  const outside = new THREE.Mesh(outsideGeom, outsideMat);
  outside.rotation.x = -Math.PI / 2;
  outside.position.y = -0.7;
  outside.name = "ro-prontera-outside-bounds";
  scene.add(outside);

  const underlayGeom = new THREE.PlaneGeometry(half * 2, half * 2);
  const underlayMat = new THREE.MeshBasicMaterial({ color: "#8c8068", fog: true });
  const underlay = new THREE.Mesh(underlayGeom, underlayMat);
  underlay.rotation.x = -Math.PI / 2;
  underlay.position.y = -0.58;
  underlay.name = "ro-prontera-plaza-underlay";
  scene.add(underlay);

  const borderMat = new THREE.MeshBasicMaterial({ color: "#675b46", fog: true });
  const borderLongGeom = new THREE.BoxGeometry(half * 2 + 0.6, 0.22, 0.44);
  const borderShortGeom = new THREE.BoxGeometry(0.44, 0.22, half * 2 + 0.6);
  const north = new THREE.Mesh(borderLongGeom, borderMat);
  north.position.set(0, -0.02, -half - 0.18);
  const south = new THREE.Mesh(borderLongGeom, borderMat);
  south.position.set(0, -0.02, half + 0.18);
  const west = new THREE.Mesh(borderShortGeom, borderMat);
  west.position.set(-half - 0.18, -0.02, 0);
  const east = new THREE.Mesh(borderShortGeom, borderMat);
  east.position.set(half + 0.18, -0.02, 0);
  north.name = "ro-prontera-border-north";
  south.name = "ro-prontera-border-south";
  west.name = "ro-prontera-border-west";
  east.name = "ro-prontera-border-east";
  scene.add(north, south, west, east);

  disposables.push(
    outsideGeom,
    outsideMat,
    underlayGeom,
    underlayMat,
    borderLongGeom,
    borderShortGeom,
    borderMat
  );
}

async function loadRoBiome(scene: THREE.Scene, disposables: Array<{ dispose: () => void }>) {
  const response = await fetch(RO_PRONTERA_BIOME_PATH);
  if (!response.ok) throw new Error(`Failed to load RO biome: ${response.status} ${response.statusText}`);
  const biome = (await response.json()) as RoBiome;
  const loader = new THREE.TextureLoader();
  const textures = await Promise.all(biome.textures.map((texture) => loadTexture(loader, texture.url)));
  const group = new THREE.Group();
  group.name = "ro-prontera-real-gnd";

  for (const meshData of biome.meshes) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(meshData.positions, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(meshData.uvs, 2));
    geometry.setIndex(meshData.indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshBasicMaterial({
      map: textures[meshData.texture],
      side: THREE.DoubleSide,
      transparent: true,
      alphaTest: 0.05,
      fog: true
    });
    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);
    disposables.push(geometry, material);
  }

  scene.add(group);
  disposables.push(...textures);
}

function loadTexture(loader: THREE.TextureLoader, url: string) {
  return new Promise<THREE.Texture>((resolve, reject) => {
    loader.load(
      url,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.generateMipmaps = true;
        texture.needsUpdate = true;
        resolve(texture);
      },
      undefined,
      reject
    );
  });
}
