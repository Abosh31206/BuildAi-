import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  UnifiedBuildingProject,
  GeometryIssue,
} from '../../project/types';
import { wallLengthMeters } from '../../project/engine/projectSync';
import {
  buildUnified3dModel,
  Unified3dAssembly,
  RoofDisplayMode,
} from '../engine/wallCutoutBuilder';
import { exportBuildingToGlb } from '../engine/buildingMeshBuilder';
import {
  RotateCcw,
  Download,
  Sliders,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Scissors,
  Layers,
  Undo2,
  Redo2,
  AlertTriangle,
  Move,
  MousePointer,
} from 'lucide-react';

export interface Selected3dEntity {
  type: 'wall' | 'opening' | 'column' | 'roof';
  id: string;
}

interface BuildingViewportProps {
  project: UnifiedBuildingProject;
  language: 'ru' | 'kk';
  selectedEntity: Selected3dEntity | null;
  onSelectEntity: (entity: Selected3dEntity | null) => void;
  onMoveOpening?: (openingId: string, newOffsetU: number) => void;
  roofMode: RoofDisplayMode;
  onChangeRoofMode: (mode: RoofDisplayMode) => void;
  showSlabs: boolean;
  onToggleSlabs: () => void;
  activeFloorFilter: number | null;
  onChangeFloorFilter: (idx: number | null) => void;
  geometryIssues: GeometryIssue[];
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

function disposeObject3D(obj: THREE.Object3D) {
  obj.traverse((child) => {
    if ((child as THREE.Mesh).geometry) {
      (child as THREE.Mesh).geometry.dispose();
    }
    const mat = (child as THREE.Mesh).material;
    if (Array.isArray(mat)) {
      mat.forEach((m) => m.dispose());
    } else if (mat) {
      mat.dispose();
    }
  });
}

export const BuildingViewport: React.FC<BuildingViewportProps> = ({
  project,
  language,
  selectedEntity,
  onSelectEntity,
  onMoveOpening,
  roofMode,
  onChangeRoofMode,
  showSlabs,
  onToggleSlabs,
  activeFloorFilter,
  onChangeFloorFilter,
  geometryIssues,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const assemblyRef = useRef<Unified3dAssembly | null>(null);
  const boxHelperRef = useRef<THREE.BoxHelper | null>(null);
  const sliceGuideRef = useRef<THREE.Mesh | null>(null);

  const [wireframe, setWireframe] = useState(false);
  const [explodedOffset, setExplodedOffset] = useState<number>(0);
  const [sectionAxis, setSectionAxis] = useState<'y' | 'x' | 'z'>('y');
  const [sectionRatio, setSectionRatio] = useState<number>(0.52);
  const [isControlsOpen, setIsControlsOpen] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [dragMoveMode, setDragMoveMode] = useState(false);
  const [contextLost, setContextLost] = useState(false);

  // Refs synced for event listeners without re-initializing WebGL
  const selectedEntityRef = useRef(selectedEntity);
  selectedEntityRef.current = selectedEntity;
  const projectRef = useRef(project);
  projectRef.current = project;
  const dragMoveModeRef = useRef(dragMoveMode);
  dragMoveModeRef.current = dragMoveMode;
  const onSelectRef = useRef(onSelectEntity);
  onSelectRef.current = onSelectEntity;
  const onMoveOpeningRef = useRef(onMoveOpening);
  onMoveOpeningRef.current = onMoveOpening;
  const autoRotateRef = useRef(autoRotate);
  autoRotateRef.current = autoRotate;

  // 1. Initialize Three.js WebGL context & scene ONCE per mount
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color('#0b1329');
    scene.fog = new THREE.FogExp2('#0b1329', 0.012);

    const camera = new THREE.PerspectiveCamera(
      42,
      Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight),
      0.1,
      1000
    );
    cameraRef.current = camera;
    const maxDim = Math.max(projectRef.current.totalWidth, projectRef.current.totalLength, 10);
    camera.position.set(maxDim * 1.45, maxDim * 1.15, maxDim * 1.65);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    rendererRef.current = renderer;
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.localClippingEnabled = true;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const onContextRestored = () => {
      setContextLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const hemiLight = new THREE.HemisphereLight('#f8fafc', '#334155', 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#fffbeb', 1.9);
    keyLight.position.set(22, 36, 26);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 5;
    keyLight.shadow.camera.far = 120;
    const d = maxDim * 1.5;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#93c5fd', 0.85);
    rimLight.position.set(-25, 20, -25);
    scene.add(rimLight);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(140, 140),
      new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.92, metalness: 0.08 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(60, 60, '#3b82f6', '#1e293b');
    grid.position.y = -0.01;
    scene.add(grid);

    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.minDistance = 4;
    controls.maxDistance = 120;
    controls.target.set(0, 2.8, 0);
    controls.update();

    // Pointer interaction: click selection + Shift/drag-mode sliding of openings along host wall
    const raycaster = new THREE.Raycaster();
    const pointerDownPos = new THREE.Vector2();
    let isDraggingOpening = false;
    let draggingOpeningId: string | null = null;
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    const getNdc = (ev: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      return new THREE.Vector2(
        ((ev.clientX - rect.left) / rect.width) * 2 - 1,
        -((ev.clientY - rect.top) / rect.height) * 2 + 1
      );
    };

    const handlePointerDown = (ev: PointerEvent) => {
      pointerDownPos.set(ev.clientX, ev.clientY);
      const sel = selectedEntityRef.current;
      if (sel && sel.type === 'opening' && (ev.shiftKey || dragMoveModeRef.current)) {
        const op = projectRef.current.openings.find((o) => o.id === sel.id);
        const floor = projectRef.current.floors.find((f) => f.id === op?.floorId);
        if (op && floor) {
          isDraggingOpening = true;
          draggingOpeningId = op.id;
          dragPlane.set(new THREE.Vector3(0, 1, 0), -(floor.elevation + op.sillHeight + op.height / 2));
          controls.enabled = false;
        }
      }
    };

    const handlePointerMove = (ev: PointerEvent) => {
      if (!isDraggingOpening || !draggingOpeningId || !onMoveOpeningRef.current) return;
      const ndc = getNdc(ev);
      raycaster.setFromCamera(ndc, camera);
      const hitPt = new THREE.Vector3();
      if (!raycaster.ray.intersectPlane(dragPlane, hitPt)) return;

      const proj = projectRef.current;
      const op = proj.openings.find((o) => o.id === draggingOpeningId);
      const wall = proj.walls.find((w) => w.id === op?.wallId);
      if (!op || !wall) return;

      const world2dX = hitPt.x + proj.totalWidth / 2;
      const world2dY = hitPt.z + proj.totalLength / 2;
      const len = wallLengthMeters(wall);
      if (len < 0.5) return;

      const ux = (wall.end.x - wall.start.x) / len;
      const uy = (wall.end.y - wall.start.y) / len;
      const rawU = (world2dX - wall.start.x) * ux + (world2dY - wall.start.y) * uy;
      const snappedU = Math.round(rawU * 20) / 20; // 5cm snap
      const clampedU = Math.max(op.width / 2 + 0.15, Math.min(len - op.width / 2 - 0.15, snappedU));
      onMoveOpeningRef.current(op.id, Number(clampedU.toFixed(2)));
    };

    const handlePointerUp = (ev: PointerEvent) => {
      if (isDraggingOpening) {
        isDraggingOpening = false;
        draggingOpeningId = null;
        controls.enabled = true;
        return;
      }

      const dist = Math.hypot(ev.clientX - pointerDownPos.x, ev.clientY - pointerDownPos.y);
      if (dist > 6 || !assemblyRef.current) return;

      const ndc = getNdc(ev);
      raycaster.setFromCamera(ndc, camera);
      const intersects = raycaster.intersectObjects(assemblyRef.current.rootGroup.children, true);

      const hit = intersects.find((i) => i.object.userData && i.object.userData.entityId);
      if (hit) {
        const { entityType, entityId } = hit.object.userData;
        if (
          entityType === 'wall' ||
          entityType === 'opening' ||
          entityType === 'column' ||
          entityType === 'roof'
        ) {
          onSelectRef.current({ type: entityType, id: entityId });
        }
      } else {
        onSelectRef.current(null);
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.autoRotate = autoRotateRef.current && !isDraggingOpening;
      controls.autoRotateSpeed = 1.4;
      controls.update();
      if (boxHelperRef.current) {
        boxHelperRef.current.update();
      }
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      camera.aspect = Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight);
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      if (assemblyRef.current) {
        disposeObject3D(assemblyRef.current.rootGroup);
      }
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // 2. Rebuild parametric 3D model mesh group whenever unified project or view mode changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (assemblyRef.current) {
      scene.remove(assemblyRef.current.rootGroup);
      disposeObject3D(assemblyRef.current.rootGroup);
      assemblyRef.current = null;
    }
    if (sliceGuideRef.current) {
      scene.remove(sliceGuideRef.current);
      sliceGuideRef.current.geometry.dispose();
      (sliceGuideRef.current.material as THREE.Material).dispose();
      sliceGuideRef.current = null;
    }

    // Compute live clipping plane for 'section' mode
    let clippingPlane: THREE.Plane | null = null;
    if (roofMode === 'section') {
      const totalH = project.floors.reduce((s, f) => s + f.height, 0) + project.roof.height;
      if (sectionAxis === 'y') {
        const yCut = sectionRatio * totalH;
        clippingPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), yCut);
        const guide = new THREE.Mesh(
          new THREE.PlaneGeometry(project.totalWidth + 3, project.totalLength + 3),
          new THREE.MeshBasicMaterial({
            color: '#38bdf8',
            transparent: true,
            opacity: 0.14,
            side: THREE.DoubleSide,
            depthWrite: false,
          })
        );
        guide.rotation.x = -Math.PI / 2;
        guide.position.y = yCut;
        scene.add(guide);
        sliceGuideRef.current = guide;
      } else if (sectionAxis === 'x') {
        const xCut = (sectionRatio - 0.5) * (project.totalWidth + 1);
        clippingPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), xCut);
        const guide = new THREE.Mesh(
          new THREE.PlaneGeometry(project.totalLength + 3, totalH + 2),
          new THREE.MeshBasicMaterial({
            color: '#38bdf8',
            transparent: true,
            opacity: 0.14,
            side: THREE.DoubleSide,
            depthWrite: false,
          })
        );
        guide.rotation.y = Math.PI / 2;
        guide.position.set(xCut, totalH / 2, 0);
        scene.add(guide);
        sliceGuideRef.current = guide;
      } else {
        const zCut = (sectionRatio - 0.5) * (project.totalLength + 1);
        clippingPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), zCut);
        const guide = new THREE.Mesh(
          new THREE.PlaneGeometry(project.totalWidth + 3, totalH + 2),
          new THREE.MeshBasicMaterial({
            color: '#38bdf8',
            transparent: true,
            opacity: 0.14,
            side: THREE.DoubleSide,
            depthWrite: false,
          })
        );
        guide.position.set(0, totalH / 2, zCut);
        scene.add(guide);
        sliceGuideRef.current = guide;
      }
    }

    const assembly = buildUnified3dModel(project, {
      wireframe,
      roofMode,
      showSlabs,
      explodedOffset,
      clippingPlane,
      activeFloorFilter,
    });
    assemblyRef.current = assembly;
    scene.add(assembly.rootGroup);
  }, [project, wireframe, roofMode, showSlabs, explodedOffset, sectionAxis, sectionRatio, activeFloorFilter]);

  // 3. Highlight selected element with BoxHelper
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (boxHelperRef.current) {
      scene.remove(boxHelperRef.current);
      boxHelperRef.current.dispose();
      boxHelperRef.current = null;
    }

    if (selectedEntity && assemblyRef.current) {
      const target = assemblyRef.current.selectableMap.get(
        `${selectedEntity.type}:${selectedEntity.id}`
      );
      if (target) {
        const helper = new THREE.BoxHelper(target, '#38bdf8');
        scene.add(helper);
        boxHelperRef.current = helper;
      }
    }
  }, [selectedEntity, project, roofMode, showSlabs, activeFloorFilter]);

  const handleExport = useCallback(async () => {
    if (!assemblyRef.current) return;
    setIsExporting(true);
    try {
      await exportBuildingToGlb(
        assemblyRef.current.rootGroup,
        `buildai_${project.totalWidth}x${project.totalLength}_${project.floors.length}floors.glb`
      );
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  }, [project]);

  const handleResetCamera = useCallback(() => {
    if (!controlsRef.current || !cameraRef.current) return;
    const maxDim = Math.max(project.totalWidth, project.totalLength, 10);
    cameraRef.current.position.set(maxDim * 1.45, maxDim * 1.15, maxDim * 1.65);
    const totalH = project.floors.reduce((s, f) => s + f.height, 0);
    controlsRef.current.target.set(0, totalH * 0.45, 0);
    controlsRef.current.update();
  }, [project]);

  const roofModes: { id: RoofDisplayMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'show', label: 'Показать крышу', icon: Eye },
    { id: 'hide', label: 'Скрыть крышу', icon: EyeOff },
    { id: 'transparent', label: 'Прозрачная крыша', icon: Eye },
    { id: 'section', label: 'Разрез здания', icon: Scissors },
    { id: 'floors', label: 'Показать этажи', icon: Layers },
  ];

  const totalArea = project.rooms.reduce((s, r) => s + r.area, 0);

  return (
    <div className="relative w-full h-[640px] bg-slate-950 rounded-lg overflow-hidden border border-slate-800 shadow-xl select-none">
      {/* Top Left HUD: Project info & Conceptual Model Status */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2 max-w-[68%]">
        <div className="bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded border border-slate-700/70 text-[11px] font-mono text-white flex flex-wrap items-center gap-2 shadow-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="font-bold">{project.name}</span>
          <span className="text-slate-400">·</span>
          <span>
            {project.totalWidth}×{project.totalLength} м
          </span>
          <span className="text-slate-400">·</span>
          <span>{project.floors.length} эт.</span>
          <span className="text-slate-400">·</span>
          <span className="text-blue-300 font-bold">{totalArea.toFixed(1)} м²</span>
        </div>

        <span
          className="px-2.5 py-1 rounded bg-amber-500/20 border border-amber-400/40 text-amber-200 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-md"
          title="Модель носит концептуальный характер и подлежит проверке конструктором"
        >
          {language === 'kk' ? 'Тұжырымдамалық модель' : 'Концептуальная модель'}
        </span>

        {geometryIssues.length > 0 && (
          <span
            className="px-2.5 py-1 rounded bg-rose-500/25 border border-rose-400/50 text-rose-200 text-[10px] font-semibold inline-flex items-center gap-1 backdrop-blur-md"
            title={geometryIssues[0].messageRu}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Коллизий: {geometryIssues.length}</span>
          </span>
        )}
      </div>

      {/* Top Right Quick Actions */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="p-2 bg-slate-900/85 backdrop-blur-md hover:bg-slate-800 disabled:opacity-40 text-white rounded border border-slate-700/70 transition-colors shadow-md"
          title="Отменить действие (Undo)"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className="p-2 bg-slate-900/85 backdrop-blur-md hover:bg-slate-800 disabled:opacity-40 text-white rounded border border-slate-700/70 transition-colors shadow-md"
          title="Повторить действие (Redo)"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>

        {selectedEntity?.type === 'opening' && (
          <button
            type="button"
            onClick={() => setDragMoveMode(!dragMoveMode)}
            className={`px-2.5 py-1.5 rounded border text-[11px] font-semibold inline-flex items-center gap-1 shadow-md transition-colors ${
              dragMoveMode
                ? 'bg-emerald-600 border-emerald-400 text-white'
                : 'bg-slate-900/85 border-slate-700 text-slate-200 hover:bg-slate-800'
            }`}
            title="Перетаскивать выбранное окно или дверь мышью вдоль стены (или зажмите Shift)"
          >
            <Move className="w-3.5 h-3.5" />
            <span className="hidden md:inline">
              {dragMoveMode ? 'Перемещение: ВКЛ' : 'Двигать проём'}
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={handleResetCamera}
          className="px-2.5 py-1.5 bg-slate-900/85 backdrop-blur-md hover:bg-slate-800 text-white rounded border border-slate-700/70 transition-colors shadow-md text-[11px] inline-flex items-center gap-1"
          title="Сбросить камеру"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Сброс вида</span>
        </button>

        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded border border-blue-400/40 transition-colors shadow-md text-[11px] inline-flex items-center gap-1.5"
          title="Экспорт в 3D GLTF / GLB для Blender, Revit, AutoCAD"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isExporting ? 'Экспорт...' : 'Экспорт GLB'}</span>
        </button>
      </div>

      {/* WebGL Context Loss Notice */}
      {contextLost && (
        <div className="absolute inset-0 z-30 bg-slate-950/90 flex items-center justify-center text-white text-xs">
          Восстановление WebGL-контекста 3D-сцены...
        </div>
      )}

      {/* 3D WebGL Canvas */}
      <div
        ref={containerRef}
        className={`w-full h-full ${dragMoveMode ? 'cursor-move' : 'cursor-grab active:cursor-grabbing'}`}
      />

      {/* Ergonomic Bottom Control Dock */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-[96%] max-w-4xl">
        <div className="bg-slate-900/92 backdrop-blur-md rounded-lg border border-slate-700/80 shadow-2xl p-2.5 text-white">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-300">
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              <span>Интерактивные режимы разреза, крыши и этажей</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden md:inline text-[10px] text-slate-400 font-mono">
                <MousePointer className="w-3 h-3 inline mr-1" />
                Клик: выбрать стену/окно · Shift+ЛКМ: двигать проём
              </span>
              <button
                type="button"
                onClick={() => setIsControlsOpen(!isControlsOpen)}
                className="text-[11px] text-slate-400 hover:text-white inline-flex items-center gap-1"
              >
                <span>{isControlsOpen ? 'Свернуть' : 'Открыть'}</span>
                {isControlsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {isControlsOpen && (
            <div className="space-y-2.5 text-xs">
              {/* Row 1: 5 Roof / Cutaway Modes */}
              <div className="flex flex-wrap items-center gap-1.5">
                {roofModes.map((m) => {
                  const Icon = m.icon;
                  const active = roofMode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onChangeRoofMode(m.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                        active
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{m.label}</span>
                    </button>
                  );
                })}

                <div className="h-4 w-px bg-slate-700 mx-1 hidden sm:block" />

                <button
                  type="button"
                  onClick={onToggleSlabs}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                    !showSlabs
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {showSlabs ? 'Перекрытия: ВКЛ' : 'Перекрытия: СКРЫТЫ'}
                </button>

                <button
                  type="button"
                  onClick={() => setWireframe(!wireframe)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                    wireframe ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Каркас
                </button>

                <button
                  type="button"
                  onClick={() => setAutoRotate(!autoRotate)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                    autoRotate ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  360°
                </button>
              </div>

              {/* Conditional Slice Plane Controls when in Section mode */}
              {roofMode === 'section' && (
                <div className="flex flex-wrap items-center gap-3 bg-slate-800/70 p-2 rounded border border-slate-700/70">
                  <span className="text-[11px] text-sky-300 font-semibold">Плоскость сечения:</span>
                  <div className="inline-flex rounded bg-slate-900 p-0.5 text-[11px]">
                    {[
                      { id: 'y', label: 'Горизонталь (План)' },
                      { id: 'x', label: 'Продольный (X)' },
                      { id: 'z', label: 'Поперечный (Z)' },
                    ].map((ax) => (
                      <button
                        key={ax.id}
                        type="button"
                        onClick={() => setSectionAxis(ax.id as 'y' | 'x' | 'z')}
                        className={`px-2 py-0.5 rounded ${
                          sectionAxis === ax.id ? 'bg-sky-600 text-white font-semibold' : 'text-slate-400'
                        }`}
                      >
                        {ax.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.95"
                    step="0.02"
                    value={sectionRatio}
                    onChange={(e) => setSectionRatio(parseFloat(e.target.value))}
                    className="flex-1 min-w-[140px] h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-400"
                  />
                  <span className="text-[11px] font-mono text-sky-300 w-12 text-right">
                    {Math.round(sectionRatio * 100)}%
                  </span>
                </div>
              )}

              {/* Row 2: Floor Filter & Explode Slider */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800/80">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400">Этаж:</span>
                  <button
                    type="button"
                    onClick={() => onChangeFloorFilter(null)}
                    className={`px-2 py-0.5 rounded text-[11px] ${
                      activeFloorFilter === null ? 'bg-slate-200 text-slate-900 font-bold' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    Все
                  </button>
                  {project.floors.map((fl, idx) => (
                    <button
                      key={fl.id}
                      type="button"
                      onClick={() => onChangeFloorFilter(idx)}
                      className={`px-2 py-0.5 rounded text-[11px] ${
                        activeFloorFilter === idx ? 'bg-slate-200 text-slate-900 font-bold' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {idx + 1} эт.
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 flex-1 max-w-xs">
                  <span className="text-[11px] text-slate-400 whitespace-nowrap">Разнос этажей:</span>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.2"
                    value={explodedOffset}
                    onChange={(e) => setExplodedOffset(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <span className="text-[11px] font-mono text-blue-300 w-10 text-right">
                    +{explodedOffset.toFixed(1)}м
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
