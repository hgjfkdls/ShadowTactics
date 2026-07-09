import * as THREE from 'three';
import type { TerrainType } from './BoardData';

const TEX_SIZE = 256;

function hash(x: number, y: number): number {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return (h ^ (h >> 16)) & 0x7fffffff;
}

function smoothNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const n00 = hash(ix, iy) / 0x7fffffff;
  const n10 = hash(ix + 1, iy) / 0x7fffffff;
  const n01 = hash(ix, iy + 1) / 0x7fffffff;
  const n11 = hash(ix + 1, iy + 1) / 0x7fffffff;
  const nx0 = n00 + (n10 - n00) * sx;
  const nx1 = n01 + (n11 - n01) * sx;
  return nx0 + (nx1 - nx0) * sy;
}

function fbm(x: number, y: number, octaves: number): number {
  let value = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    value += amp * smoothNoise(x * freq, y * freq);
    amp *= 0.5;
    freq *= 2;
  }
  return value;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function createCanvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = TEX_SIZE;
  canvas.height = TEX_SIZE;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function generateGrass(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas();
  const imageData = ctx.createImageData(TEX_SIZE, TEX_SIZE);
  const data = imageData.data;

  for (let y = 0; y < TEX_SIZE; y++) {
    for (let x = 0; x < TEX_SIZE; x++) {
      const n = fbm(x / 40, y / 40, 4);
      const detail = fbm(x / 12, y / 12, 2) * 0.15;
      const base = 0.45 + n * 0.3 + detail;
      const r = Math.round(80 + base * 80);
      const g = Math.round(160 + base * 60);
      const b = Math.round(60 + base * 40);
      const idx = (y * TEX_SIZE + x) * 4;
      data[idx] = clamp(r / 255) * 255;
      data[idx + 1] = clamp(g / 255) * 255;
      data[idx + 2] = clamp(b / 255) * 255;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  // Add small yellow dots (tiny flowers/specks)
  for (let i = 0; i < 80; i++) {
    const px = Math.floor(Math.random() * TEX_SIZE);
    const py = Math.floor(Math.random() * TEX_SIZE);
    const bright = 0.5 + Math.random() * 0.5;
    const r = Math.round(180 * bright);
    const g = Math.round(200 * bright);
    const b = Math.round(60 * bright);
    const idx = (py * TEX_SIZE + px) * 4;
    data[idx] = Math.min(255, (data[idx] + r) / 2);
    data[idx + 1] = Math.min(255, (data[idx + 1] + g) / 2);
    data[idx + 2] = Math.min(255, (data[idx + 2] + b) / 2);
  }
  ctx.putImageData(imageData, 0, 0);

  return canvas;
}

function generateDirt(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas();
  const imageData = ctx.createImageData(TEX_SIZE, TEX_SIZE);
  const data = imageData.data;

  for (let y = 0; y < TEX_SIZE; y++) {
    for (let x = 0; x < TEX_SIZE; x++) {
      const n = fbm(x / 35, y / 35, 4);
      const grain = (hash(x, y) / 0x7fffffff) * 0.12;
      const base = 0.4 + n * 0.25 + grain;
      const r = Math.round(140 + base * 80);
      const g = Math.round(90 + base * 50);
      const b = Math.round(40 + base * 30);
      const idx = (y * TEX_SIZE + x) * 4;
      data[idx] = clamp(r / 255) * 255;
      data[idx + 1] = clamp(g / 255) * 255;
      data[idx + 2] = clamp(b / 255) * 255;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function generateSand(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas();
  const imageData = ctx.createImageData(TEX_SIZE, TEX_SIZE);
  const data = imageData.data;

  for (let y = 0; y < TEX_SIZE; y++) {
    for (let x = 0; x < TEX_SIZE; x++) {
      const n = smoothNoise(x / 30, y / 30) * 0.15;
      const grain = (hash(x ^ (y << 3), y) / 0x7fffffff) * 0.2;
      const base = 0.7 + n + grain;
      const r = Math.round(200 + base * 40);
      const g = Math.round(180 + base * 30);
      const b = Math.round(120 + base * 20);
      const idx = (y * TEX_SIZE + x) * 4;
      data[idx] = clamp(r / 255) * 255;
      data[idx + 1] = clamp(g / 255) * 255;
      data[idx + 2] = clamp(b / 255) * 255;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  // Dark speckles
  for (let i = 0; i < 300; i++) {
    const px = Math.floor(Math.random() * TEX_SIZE);
    const py = Math.floor(Math.random() * TEX_SIZE);
    const idx = (py * TEX_SIZE + px) * 4;
    for (let j = 0; j < 3; j++) {
      data[idx + j] = Math.round(data[idx + j] * (0.6 + Math.random() * 0.2));
    }
  }
  ctx.putImageData(imageData, 0, 0);

  return canvas;
}

function generateWater(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas();
  const imageData = ctx.createImageData(TEX_SIZE, TEX_SIZE);
  const data = imageData.data;

  for (let y = 0; y < TEX_SIZE; y++) {
    for (let x = 0; x < TEX_SIZE; x++) {
      const wave1 = Math.sin(x / 20 + y / 30) * 0.08;
      const wave2 = Math.sin(x / 15 - y / 25 + 1.5) * 0.06;
      const n = fbm(x / 50, y / 50, 3) * 0.1;
      const depth = 0.55 + wave1 + wave2 + n;
      const r = Math.round(30 + depth * 40);
      const g = Math.round(100 + depth * 60);
      const b = Math.round(180 + depth * 60);
      const idx = (y * TEX_SIZE + x) * 4;
      data[idx] = clamp(r / 255) * 255;
      data[idx + 1] = clamp(g / 255) * 255;
      data[idx + 2] = clamp(b / 255) * 255;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  // White foam lines on wave peaks
  for (let y = 0; y < TEX_SIZE; y += 2) {
    for (let x = 0; x < TEX_SIZE; x += 2) {
      const wave = Math.sin(x / 18 + y / 28) * 0.5 + 0.5;
      if (wave > 0.85) {
        const idx = (y * TEX_SIZE + x) * 4;
        const bright = 0.3 + Math.random() * 0.4;
        data[idx] += Math.round(80 * bright);
        data[idx + 1] += Math.round(100 * bright);
        data[idx + 2] += Math.round(120 * bright);
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);

  return canvas;
}

function generateSnow(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas();
  const imageData = ctx.createImageData(TEX_SIZE, TEX_SIZE);
  const data = imageData.data;

  for (let y = 0; y < TEX_SIZE; y++) {
    for (let x = 0; x < TEX_SIZE; x++) {
      const n = fbm(x / 30, y / 30, 4) * 0.12;
      const grain = (hash(x, y) / 0x7fffffff) * 0.1;
      const base = 0.82 + n + grain;
      const r = Math.round(220 + base * 30);
      const g = Math.round(225 + base * 25);
      const b = Math.round(230 + base * 20);
      const idx = (y * TEX_SIZE + x) * 4;
      data[idx] = clamp(r / 255) * 255;
      data[idx + 1] = clamp(g / 255) * 255;
      data[idx + 2] = clamp(b / 255) * 255;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  // Sparkle dots
  for (let i = 0; i < 100; i++) {
    const px = Math.floor(Math.random() * TEX_SIZE);
    const py = Math.floor(Math.random() * TEX_SIZE);
    const idx = (py * TEX_SIZE + px) * 4;
    const bright = 0.6 + Math.random() * 0.4;
    data[idx] = Math.min(255, data[idx] + Math.round(60 * bright));
    data[idx + 1] = Math.min(255, data[idx + 1] + Math.round(60 * bright));
    data[idx + 2] = Math.min(255, data[idx + 2] + Math.round(60 * bright));
  }
  ctx.putImageData(imageData, 0, 0);

  return canvas;
}

const GENERATORS: Record<string, () => HTMLCanvasElement> = {
  grass: generateGrass,
  dirt: generateDirt,
  sand: generateSand,
  water: generateWater,
  snow: generateSnow,
};

type FileTextureEntry = { albedo?: string; normal?: string; roughness?: string; ao?: string };
let fileTextures: Record<string, FileTextureEntry> | null = null;

export function setAvailableTextures(textures: Record<string, FileTextureEntry>) {
  fileTextures = textures;
}

export function getTerrainAOTexture(terrain: string): THREE.Texture | null {
  if (!fileTextures || !fileTextures[terrain]?.ao) return null;
  const path = fileTextures[terrain].ao!;
  const cacheKey = `ao_${terrain}`;
  if (textureCache.has(cacheKey)) return textureCache.get(cacheKey)!;

  const loader = new THREE.TextureLoader();
  const texture = loader.load(path, () => { texture.needsUpdate = true; });
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  textureCache.set(cacheKey, texture);
  return texture;
}

export function getTerrainNormalTexture(terrain: string): THREE.Texture | null {
  if (!fileTextures || !fileTextures[terrain]?.normal) return null;
  const path = fileTextures[terrain].normal!;
  const cacheKey = `normal_${terrain}`;
  if (textureCache.has(cacheKey)) return textureCache.get(cacheKey)!;

  const loader = new THREE.TextureLoader();
  const texture = loader.load(path, () => { texture.needsUpdate = true; });
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  textureCache.set(cacheKey, texture);
  return texture;
}

const textureCache = new Map<string, THREE.Texture>();

export function getTerrainTexture(terrain: string, hexSize: number, offset?: { x: number; y: number }, scale?: number): THREE.Texture {
  const cacheKey = `${terrain}_${hexSize}_${offset?.x ?? 0}_${offset?.y ?? 0}_${scale ?? 1}`;
  if (textureCache.has(cacheKey)) return textureCache.get(cacheKey)!;

  const off = offset ?? { x: 0, y: 0 };
  const scl = scale ?? 1;

  function applyParams(texture: THREE.Texture) {
    if (scl > 1) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
    } else {
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
    }
    texture.repeat.set(scl, scl);
    texture.offset.set(off.x, off.y);
    texture.anisotropy = 3;
    texture.needsUpdate = true;
  }

  // Try file-based texture first
  if (fileTextures && fileTextures[terrain]?.albedo) {
    const loader = new THREE.TextureLoader();
    const texture = loader.load(fileTextures[terrain].albedo!, () => {
      texture.needsUpdate = true;
    });
    applyParams(texture);
    textureCache.set(cacheKey, texture);
    return texture;
  }

  // Fallback to procedural texture
  const gen = GENERATORS[terrain];
  if (!gen) {
    const fallback = new THREE.CanvasTexture(document.createElement('canvas'));
    textureCache.set(cacheKey, fallback);
    return fallback;
  }

  const canvas = gen();
  const texture = new THREE.CanvasTexture(canvas);
  applyParams(texture);

  textureCache.set(cacheKey, texture);
  return texture;
}

export function clearTextureCache() {
  for (const tex of textureCache.values()) tex.dispose();
  textureCache.clear();
}
