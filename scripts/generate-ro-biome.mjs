import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import * as THREE from "three";

const SOURCE_BASE = "https://www.divine-pride.net/Ragnarok/data";
const WORK_DIR = "/tmp/petshare-ro-real-assets";
const MAP_NAME = "prontera";
const CROP = { originX: 52, originY: 76, sizeCubes: 52 };
const OUTPUT_DIR = "public/assets/biomes/ro-prontera";
const GENERATED_TS = "src/playground/core/roPronteraBiome.generated.ts";
const MODEL_CROP_PAD = 8;
const MODEL_EDGE_EPSILON = 0.05;

class Reader {
  constructor(buffer) {
    this.buffer = buffer;
    this.offset = 0;
  }

  bytes(length) {
    const chunk = this.buffer.subarray(this.offset, this.offset + length);
    this.offset += length;
    return chunk;
  }

  string(length) {
    const chunk = this.bytes(length);
    const zero = chunk.indexOf(0);
    return chunk.subarray(0, zero >= 0 ? zero : length).toString("latin1");
  }

  u8() {
    return this.buffer.readUInt8(this.offset++);
  }

  i16() {
    const value = this.buffer.readInt16LE(this.offset);
    this.offset += 2;
    return value;
  }

  u16() {
    const value = this.buffer.readUInt16LE(this.offset);
    this.offset += 2;
    return value;
  }

  u32() {
    const value = this.buffer.readUInt32LE(this.offset);
    this.offset += 4;
    return value;
  }

  i32() {
    const value = this.buffer.readInt32LE(this.offset);
    this.offset += 4;
    return value;
  }

  f32() {
    const value = this.buffer.readFloatLE(this.offset);
    this.offset += 4;
    return value;
  }
}

function textureUrl(texturePath) {
  return `${SOURCE_BASE}/texture/${texturePath
    .split("\\")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

function modelUrl(modelPath) {
  return `${SOURCE_BASE}/model/${modelPath
    .split("\\")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

function assetSlug(texturePath) {
  return texturePath
    .replace(/\\/g, "-")
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function download(url, target) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, Buffer.from(await response.arrayBuffer()));
}

async function ensureMapFiles() {
  await fs.mkdir(WORK_DIR, { recursive: true });
  for (const ext of ["gnd", "gat", "rsw"]) {
    const target = path.join(WORK_DIR, `${MAP_NAME}.${ext}`);
    await download(`${SOURCE_BASE}/${MAP_NAME}.${ext}`, target);
  }
}

function parseGnd(buffer) {
  const reader = new Reader(buffer);
  const signature = reader.string(4);
  if (signature !== "GRGN") throw new Error(`Unexpected GND signature ${signature}`);
  const major = reader.u8();
  const minor = reader.u8();
  const width = reader.u32();
  const height = reader.u32();
  const scale = reader.f32();
  const textureCount = reader.u32();
  const texturePathLength = reader.u32();
  const textures = [];
  for (let index = 0; index < textureCount; index += 1) {
    textures.push(reader.string(texturePathLength));
  }

  const lightmapCount = reader.u32();
  const lightmapWidth = reader.i32();
  const lightmapHeight = reader.i32();
  const lightmapBytesPerPixel = reader.i32();
  reader.offset += lightmapCount * lightmapWidth * lightmapHeight * lightmapBytesPerPixel * 4;

  const surfaceCount = reader.u32();
  const surfaces = [];
  for (let index = 0; index < surfaceCount; index += 1) {
    surfaces.push({
      uv: [
        reader.f32(),
        reader.f32(),
        reader.f32(),
        reader.f32(),
        reader.f32(),
        reader.f32(),
        reader.f32(),
        reader.f32()
      ],
      texture: reader.i16(),
      lightmap: reader.i16(),
      color: [reader.u8(), reader.u8(), reader.u8(), reader.u8()]
    });
  }

  const cubes = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      cubes.push({
        x,
        y,
        height: [reader.f32() / 5, reader.f32() / 5, reader.f32() / 5, reader.f32() / 5],
        up: reader.i32(),
        north: reader.i32(),
        east: reader.i32()
      });
    }
  }

  return { version: `${major}.${minor}`, width, height, scale, textures, surfaces, cubes };
}

function parseGat(buffer) {
  const reader = new Reader(buffer);
  const signature = reader.string(4);
  if (signature !== "GRAT") throw new Error(`Unexpected GAT signature ${signature}`);
  const major = reader.u8();
  const minor = reader.u8();
  const width = reader.u32();
  const height = reader.u32();
  const tiles = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      tiles.push({
        x,
        y,
        altitude: [reader.f32(), reader.f32(), reader.f32(), reader.f32()],
        type: reader.u32()
      });
    }
  }
  return { version: `${major}.${minor}`, width, height, tiles };
}

function parseRsw(buffer) {
  const reader = new Reader(buffer);
  const signature = reader.string(4);
  if (signature !== "GRSW") throw new Error(`Unexpected RSW signature ${signature}`);
  const major = reader.u8();
  const minor = reader.u8();
  const version = major + minor / 10;
  const buildNumber = version >= 2.5 ? reader.i32() : null;
  if (version >= 2.2) reader.u8();

  const files = {
    ini: reader.string(40),
    gnd: reader.string(40),
    gat: reader.string(40),
    src: version >= 1.4 ? reader.string(40) : ""
  };

  if (version < 2.6) {
    if (version >= 1.3) reader.f32();
    if (version >= 1.8) {
      reader.i32();
      reader.f32();
      reader.f32();
      reader.f32();
    }
    if (version >= 1.9) reader.i32();
  }

  if (version >= 1.5) {
    reader.i32();
    reader.i32();
    for (let index = 0; index < 6; index += 1) reader.f32();
    if (version >= 1.7) reader.f32();
  }

  if (version >= 1.6) {
    reader.i32();
    reader.i32();
    reader.i32();
    reader.i32();
  }

  if (version >= 2.7) {
    const count = reader.i32();
    reader.offset += count * 4;
  }

  const models = [];
  const objectCount = reader.i32();
  for (let index = 0; index < objectCount; index += 1) {
    const type = reader.i32();
    if (type === 1) {
      const model = {
        name: version >= 1.3 ? reader.string(40) : "",
        animType: version >= 1.3 ? reader.i32() : 0,
        animSpeed: version >= 1.3 ? reader.f32() : 1,
        blockType: version >= 1.3 ? reader.i32() : 0
      };
      if (version >= 2.6 && buildNumber !== null && buildNumber >= 186) reader.u8();
      if (version >= 2.7) reader.i32();
      model.filename = reader.string(80);
      model.nodename = reader.string(80);
      model.position = [reader.f32() / 5, reader.f32() / 5, reader.f32() / 5];
      model.rotation = [reader.f32(), reader.f32(), reader.f32()];
      model.scale = [reader.f32() / 5, reader.f32() / 5, reader.f32() / 5];
      models.push(model);
      continue;
    }
    if (type === 2) {
      reader.string(80);
      reader.f32();
      reader.f32();
      reader.f32();
      reader.i32();
      reader.i32();
      reader.i32();
      reader.f32();
      continue;
    }
    if (type === 3) {
      reader.string(80);
      reader.string(80);
      reader.f32();
      reader.f32();
      reader.f32();
      reader.f32();
      reader.i32();
      reader.i32();
      reader.f32();
      if (version >= 2.0) reader.f32();
      continue;
    }
    if (type === 4) {
      reader.string(80);
      reader.f32();
      reader.f32();
      reader.f32();
      reader.i32();
      reader.f32();
      reader.f32();
      reader.f32();
      reader.f32();
      reader.f32();
    }
  }
  return { version, files, models };
}

function readSizedString(reader, version, legacyLength) {
  return version >= 2.2 ? reader.string(reader.i32()) : reader.string(legacyLength);
}

function parseRsm(buffer) {
  const reader = new Reader(buffer);
  const signature = reader.string(4);
  if (signature !== "GRSM" && signature !== "GRSX") throw new Error(`Unexpected RSM signature ${signature}`);
  const version = reader.u8() + reader.u8() / 10;
  const rsm = {
    version,
    animLen: reader.i32(),
    shadeType: reader.i32(),
    alpha: version >= 1.4 ? reader.u8() / 255 : 1,
    textures: [],
    nodes: [],
    mainNode: null,
    box: emptyBox()
  };

  let mainNodeName = null;
  if (version >= 2.3) {
    reader.f32();
    const textureCount = reader.i32();
    for (let index = 0; index < textureCount; index += 1) rsm.textures.push(reader.string(reader.i32()));
  } else if (version >= 2.2) {
    reader.f32();
    const additionalTextureCount = reader.i32();
    for (let index = 0; index < additionalTextureCount; index += 1) rsm.textures.push(reader.string(reader.i32()));
    const textureCount = reader.i32();
    for (let index = 0; index < textureCount; index += 1) rsm.textures.push(reader.string(reader.i32()));
  } else {
    reader.offset += 16;
    const additionalTextureCount = reader.i32();
    for (let index = 0; index < additionalTextureCount; index += 1) rsm.textures.push(reader.string(40));
    mainNodeName = reader.string(40);
  }

  const nodeCount = reader.i32();
  for (let index = 0; index < nodeCount; index += 1) {
    const node = readRsmNode(rsm, reader, nodeCount === 1);
    rsm.nodes.push(node);
    if (mainNodeName && node.name === mainNodeName) rsm.mainNode = node;
  }
  if (!rsm.mainNode) rsm.mainNode = rsm.nodes[0] ?? null;

  if (version < 1.6) {
    const positionKeyFrameCount = reader.i32();
    reader.offset += positionKeyFrameCount * 20;
  }

  if (reader.offset < reader.buffer.length) {
    const volumeBoxCount = reader.i32();
    const volumeBoxSize = version >= 1.3 ? 40 : 36;
    reader.offset += volumeBoxCount * volumeBoxSize;
  }

  if (version >= 2.3) {
    for (const node of rsm.nodes) {
      for (let index = 0; index < node.textures.length; index += 1) {
        if (typeof node.textures[index] === "number") continue;
        const texture = node.textures[index];
        if (!rsm.textures.includes(texture)) rsm.textures.push(texture);
        node.textures[index] = rsm.textures.indexOf(texture);
      }
    }
  }

  calculateRsmBox(rsm);
  return rsm;
}

function readRsmNode(rsm, reader, only) {
  const version = rsm.version;
  const node = {
    name: readSizedString(reader, version, 40),
    parentName: readSizedString(reader, version, 40),
    textures: [],
    mat3: [],
    offset: [],
    pos: [0, 0, 0],
    rotAngle: 0,
    rotAxis: [0, 0, 0],
    scale: [1, 1, 1],
    flip: version >= 2.2 ? [1, -1, 1] : [1, 1, 1],
    vertices: [],
    textureVertices: [],
    faces: [],
    rotKeyframes: [],
    matrix: new THREE.Matrix4(),
    box: emptyBox(),
    only
  };

  const textureCount = reader.i32();
  for (let index = 0; index < textureCount; index += 1) {
    node.textures.push(version >= 2.3 ? reader.string(reader.i32()) : reader.i32());
  }

  for (let index = 0; index < 9; index += 1) node.mat3.push(reader.f32());
  node.offset = [reader.f32(), reader.f32(), reader.f32()];

  if (version < 2.2) {
    node.pos = [reader.f32(), reader.f32(), reader.f32()];
    node.rotAngle = reader.f32();
    node.rotAxis = [reader.f32(), reader.f32(), reader.f32()];
    node.scale = [reader.f32(), reader.f32(), reader.f32()];
  }

  const vertexCount = reader.i32();
  for (let index = 0; index < vertexCount; index += 1) {
    node.vertices.push([reader.f32(), reader.f32(), reader.f32()]);
  }

  const textureVertexCount = reader.i32();
  for (let index = 0; index < textureVertexCount; index += 1) {
    const color = version >= 1.2 ? [reader.u8(), reader.u8(), reader.u8(), reader.u8()] : [255, 255, 255, 255];
    node.textureVertices.push({
      color,
      u: reader.f32() * 0.98 + 0.01,
      v: reader.f32() * 0.98 + 0.01
    });
  }

  const faceCount = reader.i32();
  for (let index = 0; index < faceCount; index += 1) {
    const length = version >= 2.2 ? reader.i32() : -1;
    const face = {
      vertidx: [reader.u16(), reader.u16(), reader.u16()],
      tvertidx: [reader.u16(), reader.u16(), reader.u16()],
      texid: reader.u16(),
      padding: reader.u16(),
      twoSide: reader.i32(),
      smoothGroup: 0
    };
    if (version >= 1.2) {
      face.smoothGroup = reader.i32();
      if (length > 24) reader.i32();
      if (length > 28) reader.i32();
      if (length > 32) reader.offset += length - 32;
    }
    node.faces.push(face);
  }

  if (version >= 1.6) {
    const scaleKeyFrameCount = reader.i32();
    reader.offset += scaleKeyFrameCount * 20;
  }

  const rotationKeyFrameCount = reader.i32();
  for (let index = 0; index < rotationKeyFrameCount; index += 1) {
    node.rotKeyframes.push({
      frame: reader.i32(),
      q: [reader.f32(), reader.f32(), reader.f32(), reader.f32()]
    });
  }

  if (version >= 2.2) {
    const positionKeyFrameCount = reader.i32();
    reader.offset += positionKeyFrameCount * 20;
  }

  if (version >= 2.3) {
    const textureKeyFrameGroupCount = reader.i32();
    for (let index = 0; index < textureKeyFrameGroupCount; index += 1) {
      reader.i32();
      const animationCount = reader.i32();
      for (let animationIndex = 0; animationIndex < animationCount; animationIndex += 1) {
        reader.i32();
        const frameCount = reader.i32();
        reader.offset += frameCount * 8;
      }
    }
  }

  return node;
}

function emptyBox() {
  return {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
    offset: [0, 0, 0],
    range: [0, 0, 0],
    center: [0, 0, 0]
  };
}

function updateBox(box, point) {
  for (let index = 0; index < 3; index += 1) {
    box.min[index] = Math.min(box.min[index], point[index]);
    box.max[index] = Math.max(box.max[index], point[index]);
  }
}

function finishBox(box) {
  for (let index = 0; index < 3; index += 1) {
    box.offset[index] = (box.max[index] + box.min[index]) / 2;
    box.range[index] = (box.max[index] - box.min[index]) / 2;
    box.center[index] = box.min[index] + box.range[index];
  }
}

function mat3ToMatrix4(values) {
  return new THREE.Matrix4().set(
    values[0], values[3], values[6], 0,
    values[1], values[4], values[7], 0,
    values[2], values[5], values[8], 0,
    0, 0, 0, 1
  );
}

function multiplyTranslation(matrix, vector) {
  matrix.multiply(new THREE.Matrix4().makeTranslation(vector[0], vector[1], vector[2]));
}

function multiplyScale(matrix, vector) {
  matrix.multiply(new THREE.Matrix4().makeScale(vector[0], vector[1], vector[2]));
}

function multiplyRotationAxis(matrix, axis, angle) {
  const length = Math.hypot(axis[0], axis[1], axis[2]);
  if (!length || !angle) return;
  matrix.multiply(new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(axis[0] / length, axis[1] / length, axis[2] / length), angle));
}

function multiplyRotationQuaternion(matrix, quaternion) {
  matrix.multiply(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion(quaternion[0], quaternion[1], quaternion[2], quaternion[3])));
}

function calculateNodeBox(rsm, node, parentMatrix) {
  node.box = emptyBox();
  node.matrix.copy(parentMatrix);
  multiplyTranslation(node.matrix, node.pos);
  if (node.rotKeyframes.length) multiplyRotationQuaternion(node.matrix, node.rotKeyframes[0].q);
  else multiplyRotationAxis(node.matrix, node.rotAxis, node.rotAngle);
  multiplyScale(node.matrix, node.scale);

  const localMatrix = node.matrix.clone();
  if (!node.only) multiplyTranslation(localMatrix, node.offset);
  localMatrix.multiply(mat3ToMatrix4(node.mat3));

  for (const vertex of node.vertices) {
    const point = new THREE.Vector3(vertex[0], vertex[1], vertex[2]).applyMatrix4(localMatrix);
    updateBox(node.box, [point.x, point.y, point.z]);
  }
  finishBox(node.box);

  for (const child of rsm.nodes) {
    if (child.parentName === node.name && node.name !== node.parentName) calculateNodeBox(rsm, child, node.matrix);
  }
}

function calculateRsmBox(rsm) {
  if (!rsm.mainNode) return;
  calculateNodeBox(rsm, rsm.mainNode, new THREE.Matrix4());
  rsm.box = emptyBox();
  for (const node of rsm.nodes) {
    for (let index = 0; index < 3; index += 1) {
      rsm.box.min[index] = Math.min(rsm.box.min[index], node.box.min[index]);
      rsm.box.max[index] = Math.max(rsm.box.max[index], node.box.max[index]);
    }
  }
  finishBox(rsm.box);
}

function createInstanceMatrix(rsm, model, mapWidth, mapHeight) {
  const matrix = new THREE.Matrix4();
  multiplyTranslation(matrix, [model.position[0] + mapWidth, model.position[1], model.position[2] + mapHeight]);
  matrix.multiply(new THREE.Matrix4().makeRotationZ((model.rotation[2] / 180) * Math.PI));
  matrix.multiply(new THREE.Matrix4().makeRotationX((model.rotation[0] / 180) * Math.PI));
  matrix.multiply(new THREE.Matrix4().makeRotationY((model.rotation[1] / 180) * Math.PI));
  multiplyScale(matrix, model.scale);
  if (rsm.version >= 2.2 && rsm.mainNode) {
    multiplyScale(matrix, rsm.mainNode.flip);
    multiplyTranslation(matrix, rsm.mainNode.offset);
    multiplyTranslation(matrix, [0, rsm.box.range[1], 0]);
    multiplyTranslation(matrix, rsm.box.offset);
  }
  return matrix;
}

function decodeIndexedBmp(buffer) {
  if (buffer.toString("ascii", 0, 2) !== "BM") throw new Error("Texture is not a BMP");
  const pixelOffset = buffer.readUInt32LE(10);
  const dibSize = buffer.readUInt32LE(14);
  const width = buffer.readInt32LE(18);
  const rawHeight = buffer.readInt32LE(22);
  const height = Math.abs(rawHeight);
  const bpp = buffer.readUInt16LE(28);
  if (bpp !== 8) throw new Error(`Unsupported BMP bit depth ${bpp}`);
  const paletteStart = 14 + dibSize;
  const paletteLength = Math.floor((pixelOffset - paletteStart) / 4);
  const palette = [];
  for (let index = 0; index < paletteLength; index += 1) {
    const offset = paletteStart + index * 4;
    palette.push([buffer[offset + 2], buffer[offset + 1], buffer[offset], 255]);
  }
  const stride = Math.ceil(width / 4) * 4;
  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const sourceY = rawHeight > 0 ? height - 1 - y : y;
    const sourceRow = pixelOffset + sourceY * stride;
    for (let x = 0; x < width; x += 1) {
      const color = palette[buffer[sourceRow + x]] ?? [255, 0, 255, 255];
      const target = (y * width + x) * 4;
      rgba[target] = color[0];
      rgba[target + 1] = color[1];
      rgba[target + 2] = color[2];
      rgba[target + 3] = color[0] > 240 && color[1] < 16 && color[2] > 240 ? 0 : color[3];
    }
  }
  return { width, height, rgba };
}

async function convertTexture(texturePath, outputPath) {
  const sourcePath = path.join(WORK_DIR, "textures", `${assetSlug(texturePath)}${path.extname(texturePath).toLowerCase() || ".bin"}`);
  await download(textureUrl(texturePath), sourcePath);
  const buffer = await fs.readFile(sourcePath);
  if (buffer.toString("ascii", 0, 2) === "BM") {
    const bmp = decodeIndexedBmp(buffer);
    await sharp(bmp.rgba, {
      raw: { width: bmp.width, height: bmp.height, channels: 4 }
    })
      .webp({ lossless: true })
      .toFile(outputPath);
    return;
  }
  await sharp(buffer).webp({ lossless: true }).toFile(outputPath);
}

function rounded(value) {
  return Number(value.toFixed(4));
}

function rgbToHex([r, g, b]) {
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function mixRgb([r, g, b], [mr, mg, mb], amount) {
  return [
    Math.round(r + (mr - r) * amount),
    Math.round(g + (mg - g) * amount),
    Math.round(b + (mb - b) * amount)
  ];
}

function triangleTopWeight(a, b, c) {
  const ab = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const ac = new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
  const normal = ab.cross(ac);
  if (normal.lengthSq() === 0) return 0;
  normal.normalize();
  return Math.abs(normal.y);
}

function toMinimapPoint(point, size, margin) {
  const usable = size - margin * 2;
  const extent = CROP.sizeCubes * 2;
  const x = margin + ((point[0] + CROP.sizeCubes) / extent) * usable;
  const y = margin + ((point[2] + CROP.sizeCubes) / extent) * usable;
  return `${rounded(x)},${rounded(y)}`;
}

async function averageTextureColors(textureRecords) {
  const out = [];
  for (const record of textureRecords) {
    const texturePath = path.join(OUTPUT_DIR, record.url.replace("/assets/biomes/ro-prontera/", ""));
    const { data } = await sharp(texturePath)
      .resize(1, 1, { fit: "fill" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    out.push([data[0], data[1], data[2]]);
  }
  return out;
}

async function writeMinimapImage(biome, textureRecords) {
  const size = 512;
  const margin = 14;
  const colors = await averageTextureColors(textureRecords);
  const polygons = [];

  for (const mesh of biome.meshes) {
    const baseColor = colors[mesh.texture] ?? [142, 128, 96];
    const fill = rgbToHex(mixRgb(baseColor, [236, 224, 190], 0.16));
    for (let i = 0; i < mesh.indices.length; i += 3) {
      const points = mesh.indices.slice(i, i + 3).map((vertexIndex) => {
        const offset = vertexIndex * 3;
        return [
          mesh.positions[offset],
          mesh.positions[offset + 1],
          mesh.positions[offset + 2]
        ];
      });
      const topWeight = triangleTopWeight(points[0], points[1], points[2]);
      if (topWeight < 0.42) continue;
      const screenPoints = points.map((point) => toMinimapPoint(point, size, margin)).join(" ");
      polygons.push(`<polygon points="${screenPoints}" fill="${fill}" opacity="0.92"/>`);
    }
  }

  const center = size / 2;
  const portalDots = [
    [center, margin + 8],
    [center, size - margin - 8],
    [margin + 8, center],
    [size - margin - 8, center]
  ].map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="5.2" fill="#c52f20" stroke="#fff5d9" stroke-width="1.6"/>`).join("");

  const fountain = `<circle cx="${center}" cy="${center + 39.4}" r="30" fill="none" stroke="#416f92" stroke-width="4" opacity="0.72"/>
  <circle cx="${center}" cy="${center + 39.4}" r="5" fill="#4c88b0" stroke="#f9efd4" stroke-width="1.4"/>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" rx="18" fill="#998e74"/>
  <rect x="${margin}" y="${margin}" width="${size - margin * 2}" height="${size - margin * 2}" rx="10" fill="#c8baa0"/>
  <g opacity="0.18" stroke="#6a604d" stroke-width="1">
    ${Array.from({ length: 9 }, (_, index) => {
      const v = margin + ((size - margin * 2) / 8) * index;
      return `<path d="M${rounded(v)} ${margin}V${size - margin}"/><path d="M${margin} ${rounded(v)}H${size - margin}"/>`;
    }).join("")}
  </g>
  <g>${polygons.join("")}</g>
  ${fountain}
  ${portalDots}
  <rect x="8" y="8" width="${size - 16}" height="${size - 16}" rx="16" fill="none" stroke="#2f2b21" stroke-width="6" opacity="0.72"/>
  <rect x="13" y="13" width="${size - 26}" height="${size - 26}" rx="12" fill="none" stroke="#ead8a4" stroke-width="2" opacity="0.68"/>
  </svg>`;

  await sharp(Buffer.from(svg)).webp({ quality: 92 }).toFile(path.join(OUTPUT_DIR, "prontera-minimap.webp"));
}

function makeVertex(cube, corner, crop) {
  const x0 = (cube.x - crop.originX) * 2 - crop.sizeCubes;
  const x1 = x0 + 2;
  const z0 = (cube.y - crop.originY) * 2 - crop.sizeCubes;
  const z1 = z0 + 2;
  const y = -cube.height[corner];
  if (corner === 0) return [rounded(x0), rounded(y), rounded(z1)];
  if (corner === 1) return [rounded(x1), rounded(y), rounded(z1)];
  if (corner === 2) return [rounded(x0), rounded(y), rounded(z0)];
  return [rounded(x1), rounded(y), rounded(z0)];
}

function addSurface(mesh, cube, surface) {
  const index = mesh.positions.length / 3;
  const vertices = [makeVertex(cube, 0, CROP), makeVertex(cube, 1, CROP), makeVertex(cube, 2, CROP), makeVertex(cube, 3, CROP)];
  for (const vertex of vertices) mesh.positions.push(...vertex);
  mesh.uvs.push(
    rounded(surface.uv[0]),
    rounded(surface.uv[4]),
    rounded(surface.uv[1]),
    rounded(surface.uv[5]),
    rounded(surface.uv[2]),
    rounded(surface.uv[6]),
    rounded(surface.uv[3]),
    rounded(surface.uv[7])
  );
  mesh.indices.push(index, index + 1, index + 2, index + 1, index + 3, index + 2);
}

function buildMeshes(gnd) {
  const meshesByTexture = new Map();
  for (let y = CROP.originY; y < CROP.originY + CROP.sizeCubes; y += 1) {
    for (let x = CROP.originX; x < CROP.originX + CROP.sizeCubes; x += 1) {
      const cube = gnd.cubes[y * gnd.width + x];
      if (!cube || cube.up < 0) continue;
      const surface = gnd.surfaces[cube.up];
      if (!surface || surface.texture < 0) continue;
      const texture = gnd.textures[surface.texture];
      if (!meshesByTexture.has(texture)) {
        meshesByTexture.set(texture, { texture, positions: [], uvs: [], indices: [] });
      }
      addSurface(meshesByTexture.get(texture), cube, surface);
    }
  }
  return [...meshesByTexture.values()];
}

function modelInsideCrop(model, gnd) {
  const gx = (model.position[0] + gnd.width) / 2;
  const gy = (model.position[2] + gnd.height) / 2;
  return (
    gx >= CROP.originX - MODEL_CROP_PAD
    && gx < CROP.originX + CROP.sizeCubes + MODEL_CROP_PAD
    && gy >= CROP.originY - MODEL_CROP_PAD
    && gy < CROP.originY + CROP.sizeCubes + MODEL_CROP_PAD
  );
}

function toPlaygroundVertex(point) {
  return [
    rounded(point.x - CROP.originX * 2 - CROP.sizeCubes),
    rounded(-point.y),
    rounded(point.z - CROP.originY * 2 - CROP.sizeCubes)
  ];
}

function addModelTriangle(mesh, vertices, textureVertices) {
  const index = mesh.positions.length / 3;
  for (const vertex of vertices) mesh.positions.push(...vertex);
  for (const textureVertex of textureVertices) {
    mesh.uvs.push(rounded(textureVertex.u), rounded(textureVertex.v));
  }
  mesh.indices.push(index, index + 1, index + 2);
}

function compileModelInstance(rsm, instanceMatrix, meshesByTexture) {
  for (const node of rsm.nodes) {
    const matrix = new THREE.Matrix4();
    multiplyTranslation(matrix, [-rsm.box.center[0], -rsm.box.max[1], -rsm.box.center[2]]);
    matrix.multiply(node.matrix);
    if (!node.only) multiplyTranslation(matrix, node.offset);
    matrix.multiply(mat3ToMatrix4(node.mat3));

    const modelView = instanceMatrix.clone().multiply(matrix);
    const transformedVertices = node.vertices.map((vertex) => new THREE.Vector3(vertex[0], vertex[1], vertex[2]).applyMatrix4(modelView));
    for (const face of node.faces) {
      const texturePath = rsm.textures[node.textures[face.texid]];
      if (!texturePath) continue;
      if (!meshesByTexture.has(texturePath)) {
        meshesByTexture.set(texturePath, { texture: texturePath, positions: [], uvs: [], indices: [] });
      }
      const vertices = face.vertidx.map((vertexIndex) => toPlaygroundVertex(transformedVertices[vertexIndex]));
      const textureVertices = face.tvertidx.map((textureVertexIndex) => node.textureVertices[textureVertexIndex]);
      addModelTriangle(meshesByTexture.get(texturePath), vertices, textureVertices);
    }
  }
}

function modelPlaygroundBox(rsm, instanceMatrix) {
  const box = emptyBox();
  let hasVertex = false;
  for (const node of rsm.nodes) {
    const matrix = new THREE.Matrix4();
    multiplyTranslation(matrix, [-rsm.box.center[0], -rsm.box.max[1], -rsm.box.center[2]]);
    matrix.multiply(node.matrix);
    if (!node.only) multiplyTranslation(matrix, node.offset);
    matrix.multiply(mat3ToMatrix4(node.mat3));

    const modelView = instanceMatrix.clone().multiply(matrix);
    for (const vertex of node.vertices) {
      const point = new THREE.Vector3(vertex[0], vertex[1], vertex[2]).applyMatrix4(modelView);
      updateBox(box, toPlaygroundVertex(point));
      hasVertex = true;
    }
  }
  if (!hasVertex) return null;
  finishBox(box);
  return box;
}

function modelBoxInsideEnvironment(box) {
  const half = CROP.sizeCubes;
  return (
    box.min[0] >= -half - MODEL_EDGE_EPSILON
    && box.max[0] <= half + MODEL_EDGE_EPSILON
    && box.min[2] >= -half - MODEL_EDGE_EPSILON
    && box.max[2] <= half + MODEL_EDGE_EPSILON
  );
}

async function loadRsmModel(modelPath, cache) {
  if (cache.has(modelPath)) return cache.get(modelPath);
  const target = path.join(WORK_DIR, "models", `${assetSlug(modelPath)}.rsm`);
  await download(modelUrl(modelPath), target);
  const rsm = parseRsm(await fs.readFile(target));
  cache.set(modelPath, rsm);
  return rsm;
}

async function buildModelMeshes(rsw, gnd) {
  const rsmCache = new Map();
  const meshesByTexture = new Map();
  const models = rsw.models.filter((model) => modelInsideCrop(model, gnd));
  const includedModels = [];
  for (const model of models) {
    const rsm = await loadRsmModel(model.filename, rsmCache);
    const instanceMatrix = createInstanceMatrix(rsm, model, gnd.width, gnd.height);
    const box = modelPlaygroundBox(rsm, instanceMatrix);
    if (!box || !modelBoxInsideEnvironment(box)) continue;
    compileModelInstance(rsm, instanceMatrix, meshesByTexture);
    includedModels.push(model);
  }
  return { models: includedModels, meshes: [...meshesByTexture.values()] };
}

function buildBlockedZones(gat) {
  const originTileX = CROP.originX * 2;
  const originTileY = CROP.originY * 2;
  const sizeTiles = CROP.sizeCubes * 2;
  const rowRuns = [];
  for (let y = 0; y < sizeTiles; y += 1) {
    let runStart = null;
    for (let x = 0; x <= sizeTiles; x += 1) {
      const tile = x < sizeTiles ? gat.tiles[(originTileY + y) * gat.width + originTileX + x] : null;
      const blocked = tile ? tile.type !== 0 : false;
      if (blocked && runStart === null) runStart = x;
      if ((!blocked || x === sizeTiles) && runStart !== null) {
        rowRuns.push({ x: runStart, y, width: x - runStart, height: 1 });
        runStart = null;
      }
    }
  }

  const merged = [];
  for (const run of rowRuns) {
    const previous = merged.find((zone) => zone.x === run.x && zone.width === run.width && zone.y + zone.height === run.y);
    if (previous) previous.height += 1;
    else merged.push(run);
  }

  return merged.map((zone) => ({
    kind: "rect",
    x: rounded(zone.x + zone.width / 2 - sizeTiles / 2),
    z: rounded(zone.y + zone.height / 2 - sizeTiles / 2),
    width: rounded(zone.width),
    depth: rounded(zone.height)
  }));
}

async function main() {
  await ensureMapFiles();
  const gnd = parseGnd(await fs.readFile(path.join(WORK_DIR, `${MAP_NAME}.gnd`)));
  const gat = parseGat(await fs.readFile(path.join(WORK_DIR, `${MAP_NAME}.gat`)));
  const rsw = parseRsw(await fs.readFile(path.join(WORK_DIR, `${MAP_NAME}.rsw`)));
  const terrainMeshes = buildMeshes(gnd);
  const modelLayer = await buildModelMeshes(rsw, gnd);
  const meshes = [...terrainMeshes, ...modelLayer.meshes];
  const usedTextures = [...new Set(meshes.map((mesh) => mesh.texture))];

  await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
  await fs.mkdir(path.join(OUTPUT_DIR, "textures"), { recursive: true });

  const textureRecords = [];
  for (const texture of usedTextures) {
    const filename = `${assetSlug(texture)}.webp`;
    await convertTexture(texture, path.join(OUTPUT_DIR, "textures", filename));
    textureRecords.push({
      source: texture,
      url: `/assets/biomes/ro-prontera/textures/${filename}`
    });
  }

  const textureIndex = new Map(textureRecords.map((record, index) => [record.source, index]));
  const biome = {
    name: "RO Prontera Real GND Slice",
    source: {
      map: MAP_NAME,
      gnd: `${MAP_NAME}.gnd`,
      gat: `${MAP_NAME}.gat`,
      rsw: `${MAP_NAME}.rsw`,
      crop: CROP,
      sourceBase: SOURCE_BASE
    },
    size: CROP.sizeCubes * 2,
    textures: textureRecords.map(({ source, url }) => ({ source, url })),
    models: modelLayer.models.map((model) => ({
      name: model.name,
      file: model.filename,
      position: model.position,
      scale: model.scale
    })),
    meshes: meshes.map((mesh) => ({
      texture: textureIndex.get(mesh.texture),
      positions: mesh.positions,
      uvs: mesh.uvs,
      indices: mesh.indices
    }))
  };
  await writeMinimapImage(biome, textureRecords);
  await fs.writeFile(path.join(OUTPUT_DIR, "prontera-plaza.json"), `${JSON.stringify(biome)}\n`);

  const blockedZones = buildBlockedZones(gat);
  const ts = `export const RO_PRONTERA_BIOME_PATH = "/assets/biomes/ro-prontera/prontera-plaza.json";\nexport const RO_PRONTERA_MINIMAP_PATH = "/assets/biomes/ro-prontera/prontera-minimap.webp";\nexport const RO_PRONTERA_FLOOR_HALF = ${CROP.sizeCubes};\n\nexport const RO_PRONTERA_BLOCKED_ZONES = ${JSON.stringify(blockedZones, null, 2)} as const;\n`;
  await fs.writeFile(GENERATED_TS, ts);

  console.log(`Generated ${path.join(OUTPUT_DIR, "prontera-plaza.json")}`);
  console.log(`Generated ${path.join(OUTPUT_DIR, "prontera-minimap.webp")}`);
  console.log(`Generated ${terrainMeshes.length} terrain meshes`);
  console.log(`Generated ${modelLayer.models.length} RSW model instances`);
  console.log(`Generated ${textureRecords.length} textures`);
  console.log(`Generated ${blockedZones.length} GAT blocked zones`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
