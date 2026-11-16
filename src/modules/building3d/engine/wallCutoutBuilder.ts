import * as THREE from 'three';
import {
  UnifiedBuildingProject,
  ProjectWall,
  ProjectOpening,
  WindowSubtype,
} from '../../project/types';
import {
  getWallMaterial,
  getRoofMaterial,
  getConcreteSlabMaterial,
  getGlassMaterial,
  getWindowFrameMaterial,
  getDoorMaterial,
} from './proceduralMaterials';

export type RoofDisplayMode = 'show' | 'hide' | 'transparent' | 'section' | 'floors';

export interface BuildUnified3dOptions {
  wireframe?: boolean;
  roofMode?: RoofDisplayMode;
  showSlabs?: boolean;
  explodedOffset?: number;
  clippingPlane?: THREE.Plane | null;
  activeFloorFilter?: number | null; // null = all floors
}

export interface Unified3dAssembly {
  rootGroup: THREE.Group;
  floorGroups: Map<string, THREE.Group>;
  roofGroup: THREE.Group;
  selectableMap: Map<string, THREE.Object3D>;
}

function attachClipping(mat: THREE.Material, clippingPlane: THREE.Plane | null | undefined): THREE.Material {
  if (!clippingPlane) return mat;
  const cloned = mat.clone();
  cloned.clippingPlanes = [clippingPlane];
  cloned.clipShadows = true;
  cloned.side = THREE.DoubleSide;
  return cloned;
}

function createWindowGroup(
  op: ProjectOpening,
  wallThickness: number,
  frameMat: THREE.Material,
  glassMat: THREE.Material
): THREE.Group {
  const group = new THREE.Group();
  const subtype: WindowSubtype = op.windowSubtype || 'double';
  const w = Math.max(0.4, op.width);
  const h = Math.max(0.4, op.height);
  const frameDepth = Math.min(wallThickness + 0.04, 0.22);
  const bar = subtype === 'panoramic' ? 0.045 : 0.065;

  // Outer perimeter frame (top, bottom, left, right)
  const topBar = new THREE.Mesh(new THREE.BoxGeometry(w, bar, frameDepth), frameMat);
  topBar.position.set(0, h / 2 - bar / 2, 0);
  group.add(topBar);

  const botBar = new THREE.Mesh(new THREE.BoxGeometry(w, bar, frameDepth), frameMat);
  botBar.position.set(0, -h / 2 + bar / 2, 0);
  group.add(botBar);

  const leftBar = new THREE.Mesh(new THREE.BoxGeometry(bar, h, frameDepth), frameMat);
  leftBar.position.set(-w / 2 + bar / 2, 0, 0);
  group.add(leftBar);

  const rightBar = new THREE.Mesh(new THREE.BoxGeometry(bar, h, frameDepth), frameMat);
  rightBar.position.set(w / 2 - bar / 2, 0, 0);
  group.add(rightBar);

  // Exterior & interior window sill
  const sillMat = frameMat;
  const sill = new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, 0.04, wallThickness + 0.1), sillMat);
  sill.position.set(0, -h / 2 - 0.015, 0);
  group.add(sill);

  // Mullions according to subtype
  if (subtype === 'double') {
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.05, h - 2 * bar, frameDepth * 0.85), frameMat);
    group.add(mullion);
  } else if (subtype === 'triple') {
    [-w / 6, w / 6].forEach((mx) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, h - 2 * bar, frameDepth * 0.85), frameMat);
      m.position.x = mx;
      group.add(m);
    });
  } else if (subtype === 'panoramic') {
    // Horizontal transom + slim vertical mullions
    const transom = new THREE.Mesh(new THREE.BoxGeometry(w - 2 * bar, 0.045, frameDepth * 0.8), frameMat);
    transom.position.y = h * 0.22;
    group.add(transom);
    if (w > 1.8) {
      [-w / 4, w / 4].forEach((mx) => {
        const vm = new THREE.Mesh(new THREE.BoxGeometry(0.04, h - 2 * bar, frameDepth * 0.8), frameMat);
        vm.position.x = mx;
        group.add(vm);
      });
    }
  } else if (subtype === 'corner') {
    // Corner post accent + angled brace mullion
    const cornerPost = new THREE.Mesh(new THREE.BoxGeometry(0.08, h, frameDepth + 0.05), frameMat);
    cornerPost.position.set(w / 2 - 0.02, 0, 0);
    group.add(cornerPost);
  }

  // Glazing pane
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(Math.max(0.2, w - 2 * bar), Math.max(0.2, h - 2 * bar), 0.025),
    glassMat
  );
  group.add(glass);

  return group;
}

function createDoorGroup(
  op: ProjectOpening,
  wallThickness: number,
  frameMat: THREE.Material,
  doorMat: THREE.Material,
  clippingPlane?: THREE.Plane | null
): THREE.Group {
  const group = new THREE.Group();
  const w = Math.max(0.6, op.width);
  const h = Math.max(1.8, op.height);
  const isEntrance = op.doorSubtype !== 'interior';
  const frameDepth = wallThickness + 0.03;
  const bar = 0.06;

  const actualDoorMat = attachClipping(
    isEntrance
      ? doorMat
      : new THREE.MeshStandardMaterial({ color: '#9a6b44', roughness: 0.55, metalness: 0.1 }),
    clippingPlane
  );

  // Frame (left, right, top)
  const leftJamb = new THREE.Mesh(new THREE.BoxGeometry(bar, h, frameDepth), frameMat);
  leftJamb.position.set(-w / 2 + bar / 2, h / 2, 0);
  group.add(leftJamb);

  const rightJamb = new THREE.Mesh(new THREE.BoxGeometry(bar, h, frameDepth), frameMat);
  rightJamb.position.set(w / 2 - bar / 2, h / 2, 0);
  group.add(rightJamb);

  const headJamb = new THREE.Mesh(new THREE.BoxGeometry(w, bar, frameDepth), frameMat);
  headJamb.position.set(0, h - bar / 2, 0);
  group.add(headJamb);

  // Slightly ajar door leaf to show swing direction in 3D
  const leafW = w - bar * 2;
  const leafH = h - bar;
  const swingDir = op.swingDirection || 'left-in';
  const isLeftHinge = swingDir.startsWith('left');
  const isOut = swingDir.endsWith('out');

  const hingePivot = new THREE.Group();
  hingePivot.position.set(isLeftHinge ? -leafW / 2 : leafW / 2, leafH / 2, 0);
  const openSign = (isLeftHinge ? 1 : -1) * (isOut ? -1 : 1);
  hingePivot.rotation.y = openSign * 0.38; // ~22 degrees slightly open for 3D clarity

  const leafMesh = new THREE.Mesh(new THREE.BoxGeometry(leafW, leafH, 0.05), actualDoorMat);
  leafMesh.position.x = isLeftHinge ? leafW / 2 : -leafW / 2;
  leafMesh.castShadow = true;
  hingePivot.add(leafMesh);

  // Brass / chrome handle
  const handleMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.85, roughness: 0.2 });
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.11), handleMat);
  handle.position.set(isLeftHinge ? leafW - 0.1 : -leafW + 0.1, 0, 0);
  hingePivot.add(handle);

  group.add(hingePivot);

  // Floor swing arc line
  const arcPts: THREE.Vector3[] = [];
  const radius = leafW;
  const startX = isLeftHinge ? -leafW / 2 : leafW / 2;
  const zDir = isOut ? -1 : 1;
  for (let i = 0; i <= 16; i++) {
    const t = (i / 16) * (Math.PI / 2);
    const px = startX + (isLeftHinge ? Math.cos(t) : -Math.cos(t)) * radius;
    const pz = zDir * Math.sin(t) * radius;
    arcPts.push(new THREE.Vector3(px, 0.03, pz));
  }
  const arcGeom = new THREE.BufferGeometry().setFromPoints(arcPts);
  const arcLine = new THREE.Line(
    arcGeom,
    new THREE.LineBasicMaterial({ color: isEntrance ? '#38bdf8' : '#f59e0b', transparent: true, opacity: 0.75 })
  );
  group.add(arcLine);

  return group;
}

function buildWallWithCutouts(
  wall: ProjectWall,
  wallOpenings: ProjectOpening[],
  halfW: number,
  halfL: number,
  floorElevation: number,
  wallMat: THREE.Material,
  frameMat: THREE.Material,
  glassMat: THREE.Material,
  doorMat: THREE.Material,
  selectableMap: Map<string, THREE.Object3D>,
  clippingPlane?: THREE.Plane | null
): THREE.Group {
  const wallContainer = new THREE.Group();
  const dx = wall.end.x - wall.start.x;
  const dz = wall.end.y - wall.start.y;
  const len = Math.hypot(dx, dz);
  if (len < 0.05) return wallContainer;

  const angle = Math.atan2(dz, dx);
  wallContainer.position.set(wall.start.x - halfW, floorElevation, wall.start.y - halfL);
  wallContainer.rotation.y = -angle;

  // Build 2D elevation shape (u from 0..len, v from 0..wall.height)
  const wallShape = new THREE.Shape();
  wallShape.moveTo(0, 0);
  wallShape.lineTo(len, 0);
  wallShape.lineTo(len, wall.height);
  wallShape.lineTo(0, wall.height);
  wallShape.closePath();

  // Add real geometric hole cutouts for valid openings
  const validOpenings: ProjectOpening[] = [];
  for (const op of wallOpenings) {
    const halfOp = op.width / 2;
    const u1 = Math.max(0.05, op.offsetU - halfOp);
    const u2 = Math.min(len - 0.05, op.offsetU + halfOp);
    const v1 = Math.max(0.0, op.sillHeight);
    const v2 = Math.min(wall.height - 0.05, op.sillHeight + op.height);
    if (u2 - u1 >= 0.25 && v2 - v1 >= 0.3) {
      const hole = new THREE.Path();
      hole.moveTo(u1, v1);
      hole.lineTo(u2, v1);
      hole.lineTo(u2, v2);
      hole.lineTo(u1, v2);
      hole.closePath();
      wallShape.holes.push(hole);
      validOpenings.push(op);
    }
  }

  const extrudeGeom = new THREE.ExtrudeGeometry(wallShape, {
    depth: wall.thickness,
    bevelEnabled: false,
    curveSegments: 1,
  });
  // Center wall thickness along local Z (-T/2 .. +T/2)
  extrudeGeom.translate(0, 0, -wall.thickness / 2);

  const wallMesh = new THREE.Mesh(extrudeGeom, wallMat);
  wallMesh.castShadow = true;
  wallMesh.receiveShadow = true;
  wallMesh.userData = {
    entityType: 'wall',
    entityId: wall.id,
    floorId: wall.floorId,
  };
  wallContainer.add(wallMesh);
  selectableMap.set(`wall:${wall.id}`, wallMesh);

  // Place actual 3D window/door assemblies inside the cut holes
  for (const op of validOpenings) {
    if (op.type === 'window') {
      const winGroup = createWindowGroup(op, wall.thickness, frameMat, glassMat);
      winGroup.position.set(op.offsetU, op.sillHeight + op.height / 2, 0);
      winGroup.userData = {
        entityType: 'opening',
        entityId: op.id,
        wallId: wall.id,
        floorId: wall.floorId,
      };
      winGroup.traverse((child) => {
        child.userData = winGroup.userData;
      });
      wallContainer.add(winGroup);
      selectableMap.set(`opening:${op.id}`, winGroup);
    } else {
      const doorGroup = createDoorGroup(op, wall.thickness, frameMat, doorMat, clippingPlane);
      doorGroup.position.set(op.offsetU, op.sillHeight, 0);
      doorGroup.userData = {
        entityType: 'opening',
        entityId: op.id,
        wallId: wall.id,
        floorId: wall.floorId,
      };
      doorGroup.traverse((child) => {
        child.userData = doorGroup.userData;
      });
      wallContainer.add(doorGroup);
      selectableMap.set(`opening:${op.id}`, doorGroup);
    }
  }

  return wallContainer;
}

export function buildUnified3dModel(
  project: UnifiedBuildingProject,
  options: BuildUnified3dOptions = {}
): Unified3dAssembly {
  const {
    wireframe = false,
    roofMode = 'show',
    showSlabs = true,
    explodedOffset = 0,
    clippingPlane = null,
    activeFloorFilter = null,
  } = options;

  const rootGroup = new THREE.Group();
  rootGroup.name = 'unified_building_root';
  const floorGroups = new Map<string, THREE.Group>();
  const selectableMap = new Map<string, THREE.Object3D>();

  const W = project.totalWidth;
  const L = project.totalLength;
  const halfW = W / 2;
  const halfL = L / 2;

  const baseSlabMat = attachClipping(getConcreteSlabMaterial(), clippingPlane);
  const glassMat = attachClipping(getGlassMaterial(), clippingPlane);
  const frameMat = attachClipping(getWindowFrameMaterial(), clippingPlane);
  const doorMat = attachClipping(getDoorMaterial(), clippingPlane);

  // Material cache by wall finish so brick/stucco look authentic
  const wallMatCache = new Map<string, THREE.Material>();
  const getCachedWallMat = (finish: ProjectWall['finish'], isInterior: boolean) => {
    const key = `${finish}_${isInterior ? 'int' : 'ext'}_${wireframe}`;
    if (!wallMatCache.has(key)) {
      const mat = attachClipping(
        getWallMaterial(finish, wireframe),
        clippingPlane
      );
      wallMatCache.set(key, mat);
    }
    return wallMatCache.get(key)!;
  };

  // Floor spacing in exploded or 'floors' mode
  const effectiveExplode = roofMode === 'floors' ? Math.max(explodedOffset, 2.2) : explodedOffset;

  project.floors.forEach((floor, fIdx) => {
    if (activeFloorFilter !== null && fIdx !== activeFloorFilter) return;

    const fGroup = new THREE.Group();
    fGroup.name = `floor_${floor.id}`;
    const liftY = fIdx * effectiveExplode * 0.85;
    const baseY = floor.elevation + liftY;

    // 1. Floor slab
    if (showSlabs && floor.showSlab) {
      const slabGeom = new THREE.BoxGeometry(W + 0.24, floor.slabThickness, L + 0.24);
      const slab = new THREE.Mesh(slabGeom, baseSlabMat);
      slab.position.set(0, baseY - floor.slabThickness / 2 + 0.02, 0);
      slab.castShadow = true;
      slab.receiveShadow = true;
      slab.userData = { entityType: 'slab', entityId: floor.id, floorId: floor.id };
      fGroup.add(slab);
    }

    // 2. Subtle room floor pads so rooms & interior zoning are clearly visible when roof is off/cutaway
    const floorRooms = project.rooms.filter((r) => r.floorId === floor.id);
    floorRooms.forEach((rm) => {
      const padColor =
        rm.category === 'wet'
          ? '#bae6fd'
          : rm.category === 'hall'
            ? '#e2e8f0'
            : rm.category === 'auxiliary'
              ? '#fef3c7'
              : '#f1f5f9';
      const padMat = attachClipping(
        new THREE.MeshStandardMaterial({
          color: padColor,
          roughness: 0.9,
          metalness: 0.02,
          wireframe,
        }),
        clippingPlane
      );
      const pad = new THREE.Mesh(new THREE.PlaneGeometry(Math.max(0.2, rm.width - 0.1), Math.max(0.2, rm.height - 0.1)), padMat);
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(rm.x + rm.width / 2 - halfW, baseY + 0.03, rm.y + rm.height / 2 - halfL);
      pad.receiveShadow = true;
      fGroup.add(pad);
    });

    // 3. Structural columns on this floor
    const colMat = attachClipping(
      new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.8, metalness: 0.1, wireframe }),
      clippingPlane
    );
    project.columns
      .filter((c) => c.floorId === floor.id)
      .forEach((col) => {
        const colMesh = new THREE.Mesh(
          new THREE.BoxGeometry(col.width, floor.height, col.depth),
          colMat
        );
        colMesh.position.set(col.x - halfW, baseY + floor.height / 2, col.y - halfL);
        colMesh.castShadow = true;
        colMesh.receiveShadow = true;
        colMesh.userData = { entityType: 'column', entityId: col.id, floorId: floor.id };
        fGroup.add(colMesh);
        selectableMap.set(`column:${col.id}`, colMesh);
      });

    // 4. Stairs
    const stairMat = attachClipping(
      new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.7, metalness: 0.05, wireframe }),
      clippingPlane
    );
    project.stairs
      .filter((s) => s.floorId === floor.id)
      .forEach((st) => {
        const stGroup = new THREE.Group();
        const stepsCount = Math.max(4, Math.min(20, st.steps));
        const stepRun = st.length / stepsCount;
        const stepRise = floor.height / stepsCount;
        for (let i = 0; i < stepsCount; i++) {
          const stepMesh = new THREE.Mesh(
            new THREE.BoxGeometry(stepRun, stepRise * (i + 1), st.width),
            stairMat
          );
          stepMesh.position.set(
            st.x - halfW + stepRun * (i + 0.5),
            baseY + (stepRise * (i + 1)) / 2,
            st.y - halfL + st.width / 2
          );
          stepMesh.castShadow = true;
          stepMesh.receiveShadow = true;
          stGroup.add(stepMesh);
        }
        fGroup.add(stGroup);
      });

    // 5. Walls with REAL cutout openings
    if (floor.showWalls) {
      const floorWalls = project.walls.filter((w) => w.floorId === floor.id && !w.hidden);
      floorWalls.forEach((wall) => {
        const wallOpenings = project.openings.filter((o) => o.wallId === wall.id);
        const wMat = getCachedWallMat(wall.finish, !wall.isExterior);
        const wallObj = buildWallWithCutouts(
          wall,
          wallOpenings,
          halfW,
          halfL,
          baseY,
          wMat,
          frameMat,
          glassMat,
          doorMat,
          selectableMap,
          clippingPlane
        );
        fGroup.add(wallObj);
      });
    }

    rootGroup.add(fGroup);
    floorGroups.set(floor.id, fGroup);
  });

  // 6. Roof Assembly
  const roofGroup = new THREE.Group();
  roofGroup.name = 'roof_assembly';

  const topFloor = project.floors[project.floors.length - 1];
  const topFloorIdx = Math.max(0, project.floors.length - 1);
  const roofBaseY = (topFloor ? topFloor.elevation + topFloor.height : 3.0) +
    topFloorIdx * effectiveExplode * 0.85 +
    (effectiveExplode > 0 ? effectiveExplode * 1.15 : 0);

  if (roofMode !== 'hide') {
    const baseRoofMat = getRoofMaterial(project.roof.finish, wireframe);
    let finalRoofMat = attachClipping(baseRoofMat, clippingPlane);

    if (roofMode === 'transparent') {
      finalRoofMat = attachClipping(
        new THREE.MeshPhysicalMaterial({
          color: '#38bdf8',
          transparent: true,
          opacity: 0.24,
          roughness: 0.15,
          metalness: 0.1,
          depthWrite: false,
        }),
        clippingPlane
      );
    }

    const overhang = project.roof.overhang || 0.6;
    const rW = W + 2 * overhang;
    const rL = L + 2 * overhang;
    const rH = project.roof.height || 2.6;
    const gableWallMat =
      roofMode === 'transparent'
        ? finalRoofMat
        : getCachedWallMat(project.walls.find((w) => w.isExterior)?.finish || 'brick_red', false);

    if (project.roof.type === 'gable') {
      const slopeLen = Math.hypot(rW / 2, rH);
      const slopeAngle = Math.atan2(rH, rW / 2);
      const pitchGeom = new THREE.BoxGeometry(slopeLen, 0.18, rL);

      const leftPitch = new THREE.Mesh(pitchGeom, finalRoofMat);
      leftPitch.position.set(-rW / 4, roofBaseY + rH / 2, 0);
      leftPitch.rotation.z = slopeAngle;
      leftPitch.castShadow = roofMode !== 'transparent';
      leftPitch.userData = { entityType: 'roof', entityId: 'roof' };
      roofGroup.add(leftPitch);

      const rightPitch = new THREE.Mesh(pitchGeom, finalRoofMat);
      rightPitch.position.set(rW / 4, roofBaseY + rH / 2, 0);
      rightPitch.rotation.z = -slopeAngle;
      rightPitch.castShadow = roofMode !== 'transparent';
      rightPitch.userData = { entityType: 'roof', entityId: 'roof' };
      roofGroup.add(rightPitch);

      // Triangular gables
      const createGable = () => {
        const s = new THREE.Shape();
        s.moveTo(-halfW, 0);
        s.lineTo(halfW, 0);
        s.lineTo(0, rH);
        s.closePath();
        return new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.34, bevelEnabled: false }), gableWallMat);
      };

      const gFront = createGable();
      gFront.position.set(0, roofBaseY, -halfL);
      roofGroup.add(gFront);

      const gBack = createGable();
      gBack.position.set(0, roofBaseY, halfL - 0.34);
      roofGroup.add(gBack);

      const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, rL + 0.08), frameMat);
      ridge.position.set(0, roofBaseY + rH + 0.04, 0);
      roofGroup.add(ridge);
    } else if (project.roof.type === 'hip') {
      const coneGeom = new THREE.ConeGeometry(Math.max(rW, rL) * 0.74, rH, 4);
      const hip = new THREE.Mesh(coneGeom, finalRoofMat);
      hip.position.set(0, roofBaseY + rH / 2, 0);
      hip.rotation.y = Math.PI / 4;
      hip.scale.set(rW / Math.max(rW, rL), 1, rL / Math.max(rW, rL));
      hip.castShadow = roofMode !== 'transparent';
      hip.userData = { entityType: 'roof', entityId: 'roof' };
      roofGroup.add(hip);
    } else {
      const flat = new THREE.Mesh(new THREE.BoxGeometry(rW, 0.28, rL), finalRoofMat);
      flat.position.set(0, roofBaseY + 0.14, 0);
      flat.castShadow = roofMode !== 'transparent';
      flat.userData = { entityType: 'roof', entityId: 'roof' };
      roofGroup.add(flat);

      const parapetFB = new THREE.BoxGeometry(rW, 0.45, 0.24);
      const p1 = new THREE.Mesh(parapetFB, gableWallMat);
      p1.position.set(0, roofBaseY + 0.42, -rL / 2 + 0.12);
      roofGroup.add(p1);
      const p2 = new THREE.Mesh(parapetFB, gableWallMat);
      p2.position.set(0, roofBaseY + 0.42, rL / 2 - 0.12);
      roofGroup.add(p2);
    }

    selectableMap.set('roof:roof', roofGroup);
    rootGroup.add(roofGroup);
  }

  return {
    rootGroup,
    floorGroups,
    roofGroup,
    selectableMap,
  };
}
