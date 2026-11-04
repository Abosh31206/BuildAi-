import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Building3dSpec } from '../types';
import { build3dModel, BuildingAssembly, exportBuildingToGlb } from '../engine/buildingMeshBuilder';
import {
  RotateCcw,
  Maximize2,
  Download,
  Eye,
  Sliders,
  ChevronDown,
  ChevronUp,
  Layers,
} from 'lucide-react';

interface BuildingViewportProps {
  spec: Building3dSpec;
  language: 'ru' | 'kk';
}

export const BuildingViewport: React.FC<BuildingViewportProps> = ({ spec, language }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const assemblyRef = useRef<BuildingAssembly | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  const [wireframe, setWireframe] = useState(false);
  const [explodedOffset, setExplodedOffset] = useState<number>(0); // 0 to 6 meters
  const [isControlsOpen, setIsControlsOpen] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Detect software WebGL safely
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color('#0b1329'); // Deep slate blue studio atmosphere
    scene.fog = new THREE.FogExp2('#0b1329', 0.015);

    const camera = new THREE.PerspectiveCamera(
      42,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    // Position camera diagonally overlooking the house
    const maxDim = Math.max(spec.width, spec.length);
    camera.position.set(maxDim * 1.5, maxDim * 1.2, maxDim * 1.8);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 3. Studio Environment Map (PMREM)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 4. Lighting Rig
    // Hemisphere fill
    const hemiLight = new THREE.HemisphereLight('#f8fafc', '#334155', 0.85);
    scene.add(hemiLight);

    // Key Light with soft shadow
    const keyLight = new THREE.DirectionalLight('#fffbeb', 2.0);
    keyLight.position.set(20, 35, 25);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 5;
    keyLight.shadow.camera.far = 120;
    const d = maxDim * 1.4;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    // Rim/Back light
    const rimLight = new THREE.DirectionalLight('#93c5fd', 0.9);
    rimLight.position.set(-25, 20, -25);
    scene.add(rimLight);

    // Ground platform & contact shadow
    const groundGeom = new THREE.PlaneGeometry(120, 120);
    const groundMat = new THREE.MeshStandardMaterial({
      color: '#0f172a',
      roughness: 0.9,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    scene.add(ground);

    // Ground grid
    const grid = new THREE.GridHelper(60, 60, '#3b82f6', '#1e293b');
    grid.position.y = 0.01;
    scene.add(grid);

    // 5. Build 3D Building Model
    const assembly = build3dModel(spec, wireframe);
    assemblyRef.current = assembly;
    scene.add(assembly.rootGroup);

    // 6. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Don't go below ground
    controls.minDistance = 5;
    controls.maxDistance = 150;
    controls.target.set(0, (spec.floors * spec.floorHeight) / 2, 0);
    controls.update();

    // 7. Render Loop
    let animId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const delta = clock.getDelta();

      if (autoRotate) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 1.5;
      } else {
        controls.autoRotate = false;
      }
      controls.update();

      // Smoothly interpolate exploded view layer positions
      if (assemblyRef.current) {
        const { floor2Group, roofGroup } = assemblyRef.current;
        if (roofGroup) {
          roofGroup.position.y = THREE.MathUtils.damp(
            roofGroup.position.y,
            explodedOffset * 1.5,
            6,
            delta
          );
        }
        if (floor2Group) {
          floor2Group.position.y = THREE.MathUtils.damp(
            floor2Group.position.y,
            explodedOffset * 0.6,
            6,
            delta
          );
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [spec, wireframe]);

  const handleExport = async () => {
    if (!assemblyRef.current) return;
    setIsExporting(true);
    try {
      await exportBuildingToGlb(
        assemblyRef.current.rootGroup,
        `buildai_${spec.width}x${spec.length}_${spec.floors}floors.glb`
      );
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleResetCamera = () => {
    if (!controlsRef.current) return;
    const maxDim = Math.max(spec.width, spec.length);
    controlsRef.current.object.position.set(maxDim * 1.5, maxDim * 1.2, maxDim * 1.8);
    controlsRef.current.target.set(0, (spec.floors * spec.floorHeight) / 2, 0);
    controlsRef.current.update();
  };

  return (
    <div className="relative w-full h-[580px] bg-slate-950 rounded-lg overflow-hidden border border-slate-800 shadow-xl select-none">
      {/* Top HUD Information */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
        <div className="bg-slate-900/80 backdrop-blur-md px-3.5 py-1.5 rounded border border-slate-700/60 text-xs font-mono text-white flex items-center gap-2 shadow-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="font-bold">{spec.name}</span>
          <span className="text-slate-400">·</span>
          <span>{spec.width}×{spec.length} м</span>
          <span className="text-slate-400">·</span>
          <span>{spec.floors} {spec.floors === 1 ? 'этаж' : 'этажа'}</span>
          <span className="text-slate-400">·</span>
          <span className="text-blue-300 font-bold">{spec.totalArea} м²</span>
        </div>
      </div>

      {/* Top-Right Quick Actions */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleResetCamera}
          className="p-2 bg-slate-900/80 backdrop-blur-md hover:bg-slate-800 text-white rounded border border-slate-700/60 transition-colors shadow-md text-xs inline-flex items-center gap-1"
          title="Сбросить камеру"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Сброс вида</span>
        </button>

        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded border border-blue-400/40 transition-colors shadow-md text-xs inline-flex items-center gap-1.5"
          title="Экспорт в 3D GLTF / GLB для Blender, Revit, AutoCAD"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isExporting ? 'Экспорт...' : 'Экспорт GLB'}</span>
        </button>
      </div>

      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Ergonomic Collapsible Bottom Control Dock */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[94%] max-w-2xl">
        <div className="bg-slate-900/90 backdrop-blur-md rounded-lg border border-slate-700/70 shadow-2xl p-3 text-white transition-all">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              <span>Панель управления 3D-моделью</span>
            </div>

            <button
              type="button"
              onClick={() => setIsControlsOpen(!isControlsOpen)}
              className="text-[11px] text-slate-400 hover:text-white inline-flex items-center gap-1"
            >
              <span>{isControlsOpen ? 'Скрыть панель' : 'Показать'}</span>
              {isControlsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            </button>
          </div>

          {isControlsOpen && (
            <div className="space-y-3 text-xs">
              {/* Exploded View Slider / "Снять крышу" */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-[11px] text-slate-300 font-medium whitespace-nowrap">
                  Поэтажный разбор («Снять крышу»):
                </span>
                <div className="flex-1 flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="6"
                    step="0.1"
                    value={explodedOffset}
                    onChange={(e) => setExplodedOffset(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <span className="text-[11px] font-mono font-bold w-12 text-right text-blue-300">
                    +{explodedOffset.toFixed(1)} м
                  </span>
                </div>
              </div>

              {/* Toggles & Options Row */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setWireframe(!wireframe)}
                    className={`px-2.5 py-1 text-[11px] rounded transition-colors font-medium ${
                      wireframe
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {wireframe ? 'Каркас: ВКЛ' : 'Каркасный вид (Wireframe)'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setAutoRotate(!autoRotate)}
                    className={`px-2.5 py-1 text-[11px] rounded transition-colors font-medium ${
                      autoRotate
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {autoRotate ? 'Вращение: ВКЛ' : 'Авто-облёт 360°'}
                  </button>
                </div>

                <div className="text-[10px] text-slate-400 font-mono">
                  ЛКМ: Вращение · ПКМ: Панорама · Колесо: Зум
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
