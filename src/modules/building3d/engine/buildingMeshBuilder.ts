import * as THREE from 'three';
import { Building3dSpec } from '../types';
import {
  getWallMaterial,
  getRoofMaterial,
  getConcreteSlabMaterial,
  getGlassMaterial,
  getWindowFrameMaterial,
  getDoorMaterial,
} from './proceduralMaterials';

export interface BuildingAssembly {
  rootGroup: THREE.Group;
  floor1Group: THREE.Group;
  floor2Group: THREE.Group | null;
  roofGroup: THREE.Group;
}

export function build3dModel(spec: Building3dSpec, wireframe: boolean = false): BuildingAssembly {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'building_root';

  const W = spec.width;
  const L = spec.length;
  const H = spec.floorHeight;
  const T = spec.wallThickness;

  const wallMat = getWallMaterial(spec.wallFinish, wireframe);
  const roofMat = getRoofMaterial(spec.roofFinish, wireframe);
  const slabMat = getConcreteSlabMaterial();
  const glassMat = getGlassMaterial();
  const frameMat = getWindowFrameMaterial();
  const doorMat = getDoorMaterial();

  // Helper to create a window assembly (frame + glass pane)
  const createWindow = (width: number = 1.6, height: number = 1.4) => {
    const winGroup = new THREE.Group();
    // Frame
    const frameGeom = new THREE.BoxGeometry(width, height, 0.12);
    const frameMesh = new THREE.Mesh(frameGeom, frameMat);
    winGroup.add(frameMesh);
    // Glass
    const glassGeom = new THREE.BoxGeometry(width - 0.16, height - 0.16, 0.04);
    const glassMesh = new THREE.Mesh(glassGeom, glassMat);
    winGroup.add(glassMesh);
    return winGroup;
  };

  // Helper to create a floor with walls and windows
  const createFloorWalls = (floorIndex: number) => {
    const fGroup = new THREE.Group();
    fGroup.name = `floor_${floorIndex + 1}`;

    const baseY = floorIndex * H;

    // Floor slab
    const slabGeom = new THREE.BoxGeometry(W + 0.2, 0.22, L + 0.2);
    const slab = new THREE.Mesh(slabGeom, slabMat);
    slab.position.set(0, baseY + 0.11, 0);
    slab.castShadow = true;
    slab.receiveShadow = true;
    fGroup.add(slab);

    // Front & Back Walls (Z = -L/2, Z = L/2)
    const wallFrontGeom = new THREE.BoxGeometry(W, H, T);
    const wallFront = new THREE.Mesh(wallFrontGeom, wallMat);
    wallFront.position.set(0, baseY + H / 2, -L / 2 + T / 2);
    wallFront.castShadow = true;
    wallFront.receiveShadow = true;
    fGroup.add(wallFront);

    const wallBack = new THREE.Mesh(wallFrontGeom, wallMat);
    wallBack.position.set(0, baseY + H / 2, L / 2 - T / 2);
    wallBack.castShadow = true;
    wallBack.receiveShadow = true;
    fGroup.add(wallBack);

    // Left & Right Walls (X = -W/2, X = W/2)
    const wallSideGeom = new THREE.BoxGeometry(T, H, L - 2 * T);
    const wallLeft = new THREE.Mesh(wallSideGeom, wallMat);
    wallLeft.position.set(-W / 2 + T / 2, baseY + H / 2, 0);
    wallLeft.castShadow = true;
    wallLeft.receiveShadow = true;
    fGroup.add(wallLeft);

    const wallRight = new THREE.Mesh(wallSideGeom, wallMat);
    wallRight.position.set(W / 2 - T / 2, baseY + H / 2, 0);
    wallRight.castShadow = true;
    wallRight.receiveShadow = true;
    fGroup.add(wallRight);

    // Add Windows along the facades
    const winCount = spec.windowsPerSide || 3;
    const spacingX = W / (winCount + 1);

    for (let i = 1; i <= winCount; i++) {
      const posX = -W / 2 + i * spacingX;

      // Front facade windows
      // On ground floor, center is entrance door if i == 2
      if (floorIndex === 0 && i === Math.ceil(winCount / 2)) {
        // Entrance door
        const doorGeom = new THREE.BoxGeometry(1.2, 2.2, 0.14);
        const door = new THREE.Mesh(doorGeom, doorMat);
        door.position.set(posX, baseY + 1.1, -L / 2 + T / 2 + 0.05);
        fGroup.add(door);
      } else {
        const winFront = createWindow(1.5, 1.4);
        winFront.position.set(posX, baseY + H * 0.55, -L / 2 + T / 2);
        fGroup.add(winFront);
      }

      // Back facade windows
      const winBack = createWindow(1.5, 1.4);
      winBack.position.set(posX, baseY + H * 0.55, L / 2 - T / 2);
      fGroup.add(winBack);
    }

    return fGroup;
  };

  // 1. Ground Floor (Floor 1)
  const floor1Group = createFloorWalls(0);
  rootGroup.add(floor1Group);

  // 2. Second Floor (if floors >= 2)
  let floor2Group: THREE.Group | null = null;
  if (spec.floors >= 2) {
    floor2Group = createFloorWalls(1);
    rootGroup.add(floor2Group);
  }

  // 3. Roof Assembly
  const roofGroup = new THREE.Group();
  roofGroup.name = 'roof_assembly';
  const roofBaseY = spec.floors * H;
  const overhang = spec.roofOverhang || 0.6;
  const rW = W + 2 * overhang;
  const rL = L + 2 * overhang;
  const rH = spec.roofHeight || 2.6;

  if (spec.roofType === 'gable') {
    // Two sloped planes
    const slopeLength = Math.sqrt(Math.pow(rW / 2, 2) + Math.pow(rH, 2));
    const angle = Math.atan2(rH, rW / 2);

    const pitchGeom = new THREE.BoxGeometry(slopeLength, 0.18, rL);

    // Left pitch
    const leftPitch = new THREE.Mesh(pitchGeom, roofMat);
    leftPitch.position.set(-rW / 4, roofBaseY + rH / 2, 0);
    leftPitch.rotation.z = angle;
    leftPitch.castShadow = true;
    roofGroup.add(leftPitch);

    // Right pitch
    const rightPitch = new THREE.Mesh(pitchGeom, roofMat);
    rightPitch.position.set(rW / 4, roofBaseY + rH / 2, 0);
    rightPitch.rotation.z = -angle;
    rightPitch.castShadow = true;
    roofGroup.add(rightPitch);

    // Triangular Gable Walls (Front and Back)
    const createGableWall = () => {
      const shape = new THREE.Shape();
      shape.moveTo(-W / 2, 0);
      shape.lineTo(W / 2, 0);
      shape.lineTo(0, rH);
      shape.closePath();

      const extrudeGeom = new THREE.ExtrudeGeometry(shape, {
        depth: T,
        bevelEnabled: false,
      });
      return new THREE.Mesh(extrudeGeom, wallMat);
    };

    const frontGable = createGableWall();
    frontGable.position.set(0, roofBaseY, -L / 2);
    roofGroup.add(frontGable);

    const backGable = createGableWall();
    backGable.position.set(0, roofBaseY, L / 2 - T);
    roofGroup.add(backGable);

    // Ridge board / cap
    const ridgeGeom = new THREE.BoxGeometry(0.3, 0.2, rL + 0.1);
    const ridge = new THREE.Mesh(ridgeGeom, frameMat);
    ridge.position.set(0, roofBaseY + rH + 0.05, 0);
    roofGroup.add(ridge);
  } else if (spec.roofType === 'hip') {
    // 4-sided pyramid / hip roof
    const coneGeom = new THREE.ConeGeometry(Math.max(rW, rL) * 0.75, rH, 4);
    const hipRoof = new THREE.Mesh(coneGeom, roofMat);
    hipRoof.position.set(0, roofBaseY + rH / 2, 0);
    hipRoof.rotation.y = Math.PI / 4;
    hipRoof.scale.set(rW / Math.max(rW, rL), 1, rL / Math.max(rW, rL));
    hipRoof.castShadow = true;
    roofGroup.add(hipRoof);
  } else {
    // Flat roof with parapet
    const flatGeom = new THREE.BoxGeometry(rW, 0.3, rL);
    const flatRoof = new THREE.Mesh(flatGeom, roofMat);
    flatRoof.position.set(0, roofBaseY + 0.15, 0);
    flatRoof.castShadow = true;
    roofGroup.add(flatRoof);

    // Parapet around edges
    const parapetGeom = new THREE.BoxGeometry(rW, 0.5, 0.25);
    const p1 = new THREE.Mesh(parapetGeom, wallMat);
    p1.position.set(0, roofBaseY + 0.45, -rL / 2 + 0.125);
    roofGroup.add(p1);
    const p2 = new THREE.Mesh(parapetGeom, wallMat);
    p2.position.set(0, roofBaseY + 0.45, rL / 2 - 0.125);
    roofGroup.add(p2);
  }

  rootGroup.add(roofGroup);

  return {
    rootGroup,
    floor1Group,
    floor2Group,
    roofGroup,
  };
}

export async function exportBuildingToGlb(sceneOrGroup: THREE.Object3D, filename: string = 'building_3d_buildai.glb') {
  const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
  const exporter = new GLTFExporter();

  exporter.parse(
    sceneOrGroup,
    (result) => {
      let outputBlob: Blob;
      if (result instanceof ArrayBuffer) {
        outputBlob = new Blob([result], { type: 'model/gltf-binary' });
      } else {
        const output = JSON.stringify(result, null, 2);
        outputBlob = new Blob([output], { type: 'application/json' });
      }

      const url = URL.createObjectURL(outputBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    (err) => {
      console.error('An error happened during GLTF export:', err);
    },
    { binary: true }
  );
}
