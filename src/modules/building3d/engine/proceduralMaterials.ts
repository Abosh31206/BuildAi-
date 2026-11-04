import * as THREE from 'three';
import { WallFinish, RoofFinish } from '../types';

function createBrickCanvasTexture(colorHex: string, mortarHex: string = '#d1d5db'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Mortar background
  ctx.fillStyle = mortarHex;
  ctx.fillRect(0, 0, 512, 512);

  // Brick rows
  const brickH = 28;
  const brickW = 60;
  const mortar = 4;

  const rows = Math.ceil(512 / (brickH + mortar));
  const cols = Math.ceil(512 / (brickW + mortar)) + 1;

  for (let r = 0; r < rows; r++) {
    const y = r * (brickH + mortar);
    const offsetX = (r % 2) * (brickW / 2);

    for (let c = -1; c < cols; c++) {
      const x = c * (brickW + mortar) + offsetX;

      // Subtle color variation per brick
      ctx.fillStyle = colorHex;
      ctx.fillRect(x, y, brickW, brickH);

      // Texture noise / highlights
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.fillRect(x, y, brickW, 2);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(x, y + brickH - 2, brickW, 2);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createRoofTileCanvasTexture(colorHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = colorHex;
  ctx.fillRect(0, 0, 256, 256);

  // Tile wave shadow lines
  for (let y = 0; y < 256; y += 32) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, y, 256, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(0, y + 4, 256, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function getWallMaterial(finish: WallFinish, wireframe: boolean = false): THREE.Material {
  if (wireframe) {
    return new THREE.MeshBasicMaterial({ color: '#2563eb', wireframe: true });
  }

  if (finish === 'brick_red') {
    const tex = createBrickCanvasTexture('#b91c1c', '#e2e8f0');
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0.05 });
  }
  if (finish === 'brick_yellow') {
    const tex = createBrickCanvasTexture('#d97706', '#f1f5f9');
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0.05 });
  }
  if (finish === 'stucco_white') {
    return new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.9, metalness: 0.02 });
  }
  if (finish === 'stucco_gray') {
    return new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.85, metalness: 0.05 });
  }
  // wood timber
  return new THREE.MeshStandardMaterial({ color: '#92400e', roughness: 0.7, metalness: 0.1 });
}

export function getRoofMaterial(finish: RoofFinish, wireframe: boolean = false): THREE.Material {
  if (wireframe) {
    return new THREE.MeshBasicMaterial({ color: '#0284c7', wireframe: true });
  }

  let color = '#1e293b'; // dark gray
  if (finish === 'metal_tile_red') color = '#7f1d1d';
  if (finish === 'soft_shingle_brown') color = '#451a03';

  const tex = createRoofTileCanvasTexture(color);
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.3 });
}

export function getConcreteSlabMaterial(): THREE.Material {
  return new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.95, metalness: 0.05 });
}

export function getGlassMaterial(): THREE.Material {
  return new THREE.MeshPhysicalMaterial({
    color: '#bae6fd',
    transparent: true,
    opacity: 0.65,
    roughness: 0.1,
    metalness: 0.1,
    clearcoat: 1.0,
  });
}

export function getWindowFrameMaterial(): THREE.Material {
  return new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.4, metalness: 0.5 });
}

export function getDoorMaterial(): THREE.Material {
  return new THREE.MeshStandardMaterial({ color: '#451a03', roughness: 0.5, metalness: 0.2 });
}
