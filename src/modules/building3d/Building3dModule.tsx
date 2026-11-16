import React, { useState, useMemo } from 'react';
import { useTranslation } from '../../locales/LanguageContext';
import { useProject } from '../project/store/ProjectContext';
import {
  applyBuilding3dSpecToProject,
  unifiedProjectToBuilding3dSpec,
  wallLengthMeters,
} from '../project/engine/projectSync';
import {
  ProjectOpening,
  WindowSubtype,
  DoorSubtype,
  SwingDirection,
  WallFinish,
  RoofShape,
  RoofFinish,
} from '../project/types';
import { Building3dSpec } from './types';
import { BuildingViewport, Selected3dEntity } from './components/BuildingViewport';
import { RoofDisplayMode } from './engine/wallCutoutBuilder';
import {
  Boxes,
  Sparkles,
  ArrowRight,
  Layers,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  Check,
  X,
  AlertTriangle,
  Sliders,
} from 'lucide-react';

interface Building3dModuleProps {
  onTransferToCad?: (spec: Building3dSpec) => void;
  onTransferToCalculators?: (spec: Building3dSpec) => void;
}

export const Building3dModule: React.FC<Building3dModuleProps> = ({
  onTransferToCad,
  onTransferToCalculators,
}) => {
  const { language } = useTranslation();
  const {
    project,
    updateProject,
    undo,
    redo,
    canUndo,
    canRedo,
    geometryIssues,
  } = useProject();

  const [prompt, setPrompt] = useState(
    'Создай двухэтажный кирпичный жилой дом площадью 180 м² с тремя спальнями, кухней, гостиной и двускатной крышей'
  );
  const [isParsing, setIsParsing] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<Selected3dEntity | null>(null);
  const [roofMode, setRoofMode] = useState<RoofDisplayMode>('show');
  const [showSlabs, setShowSlabs] = useState(true);
  const [activeFloorFilter, setActiveFloorFilter] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [batchWindowCount, setBatchWindowCount] = useState<number>(3);

  const legacySpec = useMemo(() => unifiedProjectToBuilding3dSpec(project), [project]);

  const selectedWall = useMemo(
    () =>
      selectedEntity?.type === 'wall'
        ? project.walls.find((w) => w.id === selectedEntity.id) || null
        : null,
    [project.walls, selectedEntity]
  );

  const selectedOpening = useMemo(
    () =>
      selectedEntity?.type === 'opening'
        ? project.openings.find((o) => o.id === selectedEntity.id) || null
        : null,
    [project.openings, selectedEntity]
  );

  const hostWallForOpening = useMemo(
    () =>
      selectedOpening
        ? project.walls.find((w) => w.id === selectedOpening.wallId) || null
        : null,
    [project.walls, selectedOpening]
  );

  const hiddenWallsCount = useMemo(
    () => project.walls.filter((w) => w.hidden).length,
    [project.walls]
  );

  const handleParsePrompt = async (customPrompt?: string) => {
    const text = (customPrompt || prompt).trim();
    if (!text) return;
    setIsParsing(true);
    setSelectedEntity(null);

    try {
      const res = await fetch('/api/ai/generate-3d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.spec) {
          updateProject((prev) => applyBuilding3dSpecToProject(data.spec, prev), true);
          setIsParsing(false);
          return;
        }
      }
    } catch {
      // fallback
    }

    const lower = text.toLowerCase();
    let floors = 1;
    if (lower.includes('двухэтаж') || lower.includes('2 этаж') || lower.includes('2-этаж')) floors = 2;
    if (lower.includes('трехэтаж') || lower.includes('3 этаж') || lower.includes('3-этаж')) floors = 3;

    let roofType: RoofShape = 'gable';
    if (lower.includes('вальм') || lower.includes('четырехскат')) roofType = 'hip';
    if (lower.includes('плоск')) roofType = 'flat';

    let wallFinish: WallFinish = 'brick_red';
    if (lower.includes('желт') || lower.includes('светл')) wallFinish = 'brick_yellow';
    if (lower.includes('штукатур') || lower.includes('бел')) wallFinish = 'stucco_white';
    if (lower.includes('сер')) wallFinish = 'stucco_gray';
    if (lower.includes('дерев') || lower.includes('брус')) wallFinish = 'wood_timber';

    let roofFinish: RoofFinish = 'metal_tile_dark';
    if (lower.includes('красн') || lower.includes('черепиц')) roofFinish = 'metal_tile_red';
    if (lower.includes('коричнев') || lower.includes('битум')) roofFinish = 'soft_shingle_brown';

    let area = 180;
    const areaMatch = lower.match(/(\d+)\s*(м²|м2|кв)/);
    if (areaMatch) area = parseInt(areaMatch[1], 10);

    const footprint = Math.max(24, area / floors);
    const width = Math.max(6, Math.round(Math.sqrt(footprint * 1.2)));
    const length = Math.max(6, Math.round(footprint / width));

    const fallbackSpec: Building3dSpec = {
      id: 'bld_' + Date.now(),
      name: `${floors}-этажный дом (${wallFinish.includes('brick') ? 'кирпич' : 'штукатурка'})`,
      floors,
      width,
      length,
      floorHeight: 3.0,
      wallThickness: 0.38,
      roofType,
      roofHeight: roofType === 'flat' ? 0.4 : 2.8,
      roofOverhang: 0.6,
      wallFinish,
      roofFinish,
      windowsPerSide: width > 12 ? 4 : 3,
      hasBalcony: floors > 1,
      totalArea: width * length * floors,
    };

    updateProject((prev) => applyBuilding3dSpecToProject(fallbackSpec, prev), true);
    setIsParsing(false);
  };

  const handleMoveOpening = (openingId: string, newOffsetU: number) => {
    updateProject(
      (prev) => ({
        ...prev,
        openings: prev.openings.map((o) =>
          o.id === openingId ? { ...o, offsetU: newOffsetU } : o
        ),
      }),
      false
    );
  };

  const handleAddOpeningToWall = (wallId: string, type: 'window' | 'door') => {
    const wall = project.walls.find((w) => w.id === wallId);
    if (!wall) return;
    const len = wallLengthMeters(wall);
    const existing = project.openings.filter((o) => o.wallId === wallId);
    // Find open spot along wall
    let offsetU = len / 2;
    for (let step = 0.8; step < len - 0.8; step += 0.5) {
      const busy = existing.some((o) => Math.abs(o.offsetU - step) < (o.width / 2 + 0.75));
      if (!busy) {
        offsetU = Number(step.toFixed(2));
        break;
      }
    }

    const newOpening: ProjectOpening = {
      id: `op_${Date.now()}`,
      floorId: wall.floorId,
      wallId: wall.id,
      type,
      windowSubtype: type === 'window' ? 'double' : undefined,
      doorSubtype: type === 'door' ? (wall.isExterior ? 'entrance' : 'interior') : undefined,
      offsetU,
      width: type === 'window' ? 1.5 : 0.9,
      height: type === 'window' ? 1.45 : 2.1,
      sillHeight: type === 'window' ? 0.9 : 0,
      swingDirection: type === 'door' ? 'left-in' : undefined,
      layerId: 'OPENINGS',
    };

    updateProject(
      (prev) => ({ ...prev, openings: [...prev.openings, newOpening] }),
      true
    );
    setSelectedEntity({ type: 'opening', id: newOpening.id });
  };

  const handleBatchDistributeWindows = (wallId: string, count: number) => {
    const wall = project.walls.find((w) => w.id === wallId);
    if (!wall) return;
    const len = wallLengthMeters(wall);
    const safeCount = Math.max(1, Math.min(8, count));
    const spacing = len / (safeCount + 1);
    const winW = Math.min(1.5, Math.max(0.6, spacing * 0.62));

    const newWindows: ProjectOpening[] = Array.from({ length: safeCount }, (_, i) => ({
      id: `op_batch_${Date.now()}_${i}`,
      floorId: wall.floorId,
      wallId: wall.id,
      type: 'window',
      windowSubtype: 'double',
      offsetU: Number((spacing * (i + 1)).toFixed(2)),
      width: Number(winW.toFixed(2)),
      height: 1.45,
      sillHeight: 0.9,
      layerId: 'OPENINGS',
    }));

    updateProject(
      (prev) => ({
        ...prev,
        openings: [
          ...prev.openings.filter((o) => !(o.wallId === wallId && o.type === 'window')),
          ...newWindows,
        ],
      }),
      true
    );
  };

  const handleDeleteWall = (wallId: string) => {
    updateProject(
      (prev) => ({
        ...prev,
        walls: prev.walls.filter((w) => w.id !== wallId),
        openings: prev.openings.filter((o) => o.wallId !== wallId),
      }),
      true
    );
    setConfirmDeleteId(null);
    setSelectedEntity(null);
  };

  const handleDeleteOpening = (openingId: string) => {
    updateProject(
      (prev) => ({
        ...prev,
        openings: prev.openings.filter((o) => o.id !== openingId),
      }),
      true
    );
    setConfirmDeleteId(null);
    setSelectedEntity(null);
  };

  const handleAddFloor = () => {
    if (project.floors.length >= 4) return;
    const topFloor = project.floors[project.floors.length - 1];
    const nextIdx = project.floors.length;
    const newFloorId = `fl_${nextIdx + 1}`;
    const elev = topFloor ? topFloor.elevation + topFloor.height : nextIdx * 3.0;
    const h = topFloor ? topFloor.height : 3.0;

    // Duplicate exterior perimeter walls from floor 1
    const baseWalls = project.walls
      .filter((w) => w.floorId === project.floors[0].id)
      .map((w, idx) => ({
        ...w,
        id: `${newFloorId}_w_${idx}_${Date.now()}`,
        floorId: newFloorId,
        height: h,
      }));

    updateProject(
      (prev) => ({
        ...prev,
        floors: [
          ...prev.floors,
          {
            id: newFloorId,
            index: nextIdx,
            name: `${nextIdx + 1}-й этаж (+${elev.toFixed(3)})`,
            elevation: elev,
            height: h,
            slabThickness: 0.22,
            showSlab: true,
            showWalls: true,
          },
        ],
        walls: [...prev.walls, ...baseWalls],
      }),
      true
    );
  };

  const quickPresets = [
    {
      title: '2-этажный кирпичный дом 180 м²',
      text: 'Создай двухэтажный кирпичный жилой дом площадью 180 м² с тремя спальнями, кухней, гостиной и двускатной крышей',
    },
    {
      title: '1-этажный коттедж 120 м² (вальмовая)',
      text: 'Одноэтажный кирпичный дом площадью 120 м² с четырёхскатной вальмовой крышей и светлой штукатуркой',
    },
    {
      title: '2-этажная вилла 240 м² (плоская)',
      text: 'Двухэтажная современная вилла площадью 240 м² в серой штукатурке с плоской крышей',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-900 mb-1">
            <Boxes className="w-4 h-4" />
            <span>Модуль 1 / 4 · Интерактивный 3D-редактор здания (Three.js + Sync 2D CAD)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Интерактивная 3D-модель здания с реальными проёмами и разрезами
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Выделяйте стены, окна и двери кликом, вырезайте реальные проёмы, открывайте крышу/перекрытия и синхронизируйте изменения с 2D CAD планом.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onTransferToCad && onTransferToCad(legacySpec)}
            className="inline-flex items-center gap-1.5 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-900 font-semibold rounded text-xs transition-colors border border-blue-200"
          >
            <span>Открыть в 2D CAD</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onTransferToCalculators && onTransferToCalculators(legacySpec)}
            className="inline-flex items-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded text-xs transition-colors"
          >
            <span>Калькуляторы</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* AI Prompt Input */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-2.5">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Опишите параметрическую 3D-модель дома..."
            className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded outline-none focus:border-blue-600 focus:bg-white"
          />
          <button
            type="button"
            onClick={() => handleParsePrompt()}
            disabled={isParsing}
            className="inline-flex items-center justify-center gap-2 px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded transition-colors disabled:opacity-50 shrink-0 shadow-xs"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isParsing ? 'animate-spin' : ''}`} />
            <span>{isParsing ? 'Генерация...' : 'Сгенерировать 3D-модель'}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] text-slate-400 font-medium">Пресеты:</span>
          {quickPresets.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setPrompt(p.text);
                handleParsePrompt(p.text);
              }}
              className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
            >
              {p.title}
            </button>
          ))}
        </div>
      </div>

      {/* Main 3D Workspace Grid: Viewport + Contextual Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-8 xl:col-span-9">
          <BuildingViewport
            project={project}
            language={language}
            selectedEntity={selectedEntity}
            onSelectEntity={(ent) => {
              setSelectedEntity(ent);
              setConfirmDeleteId(null);
            }}
            onMoveOpening={handleMoveOpening}
            roofMode={roofMode}
            onChangeRoofMode={setRoofMode}
            showSlabs={showSlabs}
            onToggleSlabs={() => setShowSlabs(!showSlabs)}
            activeFloorFilter={activeFloorFilter}
            onChangeFloorFilter={setActiveFloorFilter}
            geometryIssues={geometryIssues}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
          />
        </div>

        {/* Right Contextual 3D Inspector */}
        <div className="lg:col-span-4 xl:col-span-3 bg-white rounded-lg border border-slate-200 shadow-xs p-4 space-y-4 max-h-[640px] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-900">
              <Sliders className="w-3.5 h-3.5 text-blue-600" />
              <span>
                {selectedWall
                  ? 'Свойства стены'
                  : selectedOpening
                    ? selectedOpening.type === 'window'
                      ? 'Свойства окна'
                      : 'Свойства двери'
                    : 'Инспектор модели'}
              </span>
            </div>
            {selectedEntity && (
              <button
                type="button"
                onClick={() => setSelectedEntity(null)}
                className="text-[11px] text-slate-500 hover:text-slate-900"
              >
                Сбросить
              </button>
            )}
          </div>

          {/* 1. WALL INSPECTOR */}
          {selectedWall && (
            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 font-mono text-[11px] text-slate-700">
                <div>ID: {selectedWall.id}</div>
                <div>Длина стены: {wallLengthMeters(selectedWall).toFixed(2)} м</div>
                <div>Тип: {selectedWall.isExterior ? 'Наружная несущая' : 'Внутренняя перегородка'}</div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-600 font-medium mb-1">Толщина (м)</label>
                  <input
                    type="number"
                    step="0.02"
                    min="0.08"
                    max="0.8"
                    value={selectedWall.thickness}
                    onChange={(e) => {
                      const val = Math.max(0.08, Math.min(0.8, parseFloat(e.target.value) || 0.2));
                      updateProject(
                        (prev) => ({
                          ...prev,
                          walls: prev.walls.map((w) =>
                            w.id === selectedWall.id ? { ...w, thickness: val } : w
                          ),
                        }),
                        true
                      );
                    }}
                    className="w-full border border-slate-300 rounded px-2 py-1 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 font-medium mb-1">Высота (м)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="2.2"
                    max="6.0"
                    value={selectedWall.height}
                    onChange={(e) => {
                      const val = Math.max(2.2, Math.min(6.0, parseFloat(e.target.value) || 3.0));
                      updateProject(
                        (prev) => ({
                          ...prev,
                          walls: prev.walls.map((w) =>
                            w.id === selectedWall.id ? { ...w, height: val } : w
                          ),
                        }),
                        true
                      );
                    }}
                    className="w-full border border-slate-300 rounded px-2 py-1 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 font-medium mb-1">Отделка стены</label>
                <select
                  value={selectedWall.finish}
                  onChange={(e) => {
                    const finish = e.target.value as WallFinish;
                    updateProject(
                      (prev) => ({
                        ...prev,
                        walls: prev.walls.map((w) =>
                          w.id === selectedWall.id ? { ...w, finish } : w
                        ),
                      }),
                      true
                    );
                  }}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs bg-white"
                >
                  <option value="brick_red">Красный кирпич</option>
                  <option value="brick_yellow">Жёлтый кирпич</option>
                  <option value="stucco_white">Белая штукатурка</option>
                  <option value="stucco_gray">Серая штукатурка</option>
                  <option value="wood_timber">Дерево / Брус</option>
                </select>
              </div>

              {/* Add Openings directly onto this selected wall */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <span className="text-[11px] font-bold uppercase text-slate-700 block">
                  Добавить проём в стену
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddOpeningToWall(selectedWall.id, 'window')}
                    className="inline-flex items-center justify-center gap-1 py-1.5 px-2 bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 rounded font-semibold text-[11px]"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Окно</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddOpeningToWall(selectedWall.id, 'door')}
                    className="inline-flex items-center justify-center gap-1 py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded font-semibold text-[11px]"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Дверь</span>
                  </button>
                </div>

                {/* Auto-distribute windows along wall */}
                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={batchWindowCount}
                    onChange={(e) => setBatchWindowCount(parseInt(e.target.value, 10) || 1)}
                    className="w-12 border border-slate-300 rounded px-1.5 py-1 text-center font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleBatchDistributeWindows(selectedWall.id, batchWindowCount)}
                    className="flex-1 py-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-[11px] font-medium"
                  >
                    Разместить равномерно окон
                  </button>
                </div>
              </div>

              {/* Hide / Delete Wall */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    updateProject(
                      (prev) => ({
                        ...prev,
                        walls: prev.walls.map((w) =>
                          w.id === selectedWall.id ? { ...w, hidden: true } : w
                        ),
                      }),
                      true
                    );
                    setSelectedEntity(null);
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Скрыть стену (осмотр)</span>
                </button>

                {confirmDeleteId === selectedWall.id ? (
                  <div className="flex items-center gap-1.5 bg-rose-50 p-2 rounded border border-rose-200">
                    <span className="text-[11px] text-rose-800 flex-1">Удалить стену?</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteWall(selectedWall.id)}
                      className="p-1 bg-rose-600 text-white rounded hover:bg-rose-700"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="p-1 bg-white border border-slate-300 rounded text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(selectedWall.id)}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-xs font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Удалить стену</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 2. OPENING (WINDOW / DOOR) INSPECTOR */}
          {selectedOpening && hostWallForOpening && (
            <div className="space-y-3 text-xs">
              {selectedOpening.type === 'window' ? (
                <div>
                  <label className="block text-[11px] text-slate-600 font-medium mb-1">
                    Тип окна (5 вариантов)
                  </label>
                  <select
                    value={selectedOpening.windowSubtype || 'double'}
                    onChange={(e) => {
                      const subtype = e.target.value as WindowSubtype;
                      const defaultWidth =
                        subtype === 'single'
                          ? 0.9
                          : subtype === 'double'
                            ? 1.5
                            : subtype === 'triple'
                              ? 2.1
                              : subtype === 'panoramic'
                                ? 2.6
                                : 1.8;
                      updateProject(
                        (prev) => ({
                          ...prev,
                          openings: prev.openings.map((o) =>
                            o.id === selectedOpening.id
                              ? { ...o, windowSubtype: subtype, width: defaultWidth }
                              : o
                          ),
                        }),
                        true
                      );
                    }}
                    className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs bg-white"
                  >
                    <option value="single">Одностворчатое</option>
                    <option value="double">Двухстворчатое</option>
                    <option value="triple">Трёхстворчатое</option>
                    <option value="panoramic">Панорамное</option>
                    <option value="corner">Угловое акцентное</option>
                  </select>
                </div>
              ) : (
                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] text-slate-600 font-medium mb-1">Тип двери</label>
                    <select
                      value={selectedOpening.doorSubtype || 'interior'}
                      onChange={(e) => {
                        const doorSubtype = e.target.value as DoorSubtype;
                        updateProject(
                          (prev) => ({
                            ...prev,
                            openings: prev.openings.map((o) =>
                              o.id === selectedOpening.id ? { ...o, doorSubtype } : o
                            ),
                          }),
                          true
                        );
                      }}
                      className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs bg-white"
                    >
                      <option value="entrance">Входная наружная</option>
                      <option value="interior">Межкомнатная</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 font-medium mb-1">
                      Направление открывания
                    </label>
                    <select
                      value={selectedOpening.swingDirection || 'left-in'}
                      onChange={(e) => {
                        const swingDirection = e.target.value as SwingDirection;
                        updateProject(
                          (prev) => ({
                            ...prev,
                            openings: prev.openings.map((o) =>
                              o.id === selectedOpening.id ? { ...o, swingDirection } : o
                            ),
                          }),
                          true
                        );
                      }}
                      className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs bg-white"
                    >
                      <option value="left-in">Левое внутрь</option>
                      <option value="right-in">Правое внутрь</option>
                      <option value="left-out">Левое наружу</option>
                      <option value="right-out">Правое наружу</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Dimensions */}
              <div className="grid grid-cols-3 gap-1.5">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Ширина</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.5"
                    max="5.0"
                    value={selectedOpening.width}
                    onChange={(e) => {
                      const val = Math.max(0.5, parseFloat(e.target.value) || 1.0);
                      updateProject(
                        (prev) => ({
                          ...prev,
                          openings: prev.openings.map((o) =>
                            o.id === selectedOpening.id ? { ...o, width: val } : o
                          ),
                        }),
                        true
                      );
                    }}
                    className="w-full border border-slate-300 rounded px-1.5 py-1 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Высота</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.5"
                    max="3.5"
                    value={selectedOpening.height}
                    onChange={(e) => {
                      const val = Math.max(0.5, parseFloat(e.target.value) || 1.4);
                      updateProject(
                        (prev) => ({
                          ...prev,
                          openings: prev.openings.map((o) =>
                            o.id === selectedOpening.id ? { ...o, height: val } : o
                          ),
                        }),
                        true
                      );
                    }}
                    className="w-full border border-slate-300 rounded px-1.5 py-1 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Подоконник</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="2.0"
                    value={selectedOpening.sillHeight}
                    onChange={(e) => {
                      const val = Math.max(0, parseFloat(e.target.value) || 0);
                      updateProject(
                        (prev) => ({
                          ...prev,
                          openings: prev.openings.map((o) =>
                            o.id === selectedOpening.id ? { ...o, sillHeight: val } : o
                          ),
                        }),
                        true
                      );
                    }}
                    className="w-full border border-slate-300 rounded px-1.5 py-1 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Position along wall */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                  <span>Смещение по стене:</span>
                  <span className="font-mono font-bold">{selectedOpening.offsetU.toFixed(2)} м</span>
                </div>
                <input
                  type="range"
                  min={selectedOpening.width / 2 + 0.15}
                  max={Math.max(
                    selectedOpening.width / 2 + 0.2,
                    wallLengthMeters(hostWallForOpening) - selectedOpening.width / 2 - 0.15
                  )}
                  step="0.05"
                  value={selectedOpening.offsetU}
                  onChange={(e) =>
                    handleMoveOpening(selectedOpening.id, parseFloat(e.target.value))
                  }
                  className="w-full accent-blue-600"
                />
              </div>

              {/* Delete opening */}
              <div className="pt-2 border-t border-slate-200">
                {confirmDeleteId === selectedOpening.id ? (
                  <div className="flex items-center gap-1.5 bg-rose-50 p-2 rounded border border-rose-200">
                    <span className="text-[11px] text-rose-800 flex-1">Удалить проём?</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteOpening(selectedOpening.id)}
                      className="p-1 bg-rose-600 text-white rounded hover:bg-rose-700"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="p-1 bg-white border border-slate-300 rounded text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(selectedOpening.id)}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-xs font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Удалить проём</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 3. GLOBAL MODEL & FLOOR MANAGER (DEFAULT) */}
          {!selectedWall && !selectedOpening && (
            <div className="space-y-4 text-xs">
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded text-[11px] text-blue-900">
                Кликните на любую <strong>стену, окно или дверь</strong> прямо в 3D-сцене для редактирования размеров, стиля или удаления.
              </div>

              {/* Floor Manager */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-slate-700 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    Этажи ({project.floors.length})
                  </span>
                  {project.floors.length < 4 && (
                    <button
                      type="button"
                      onClick={handleAddFloor}
                      className="text-[11px] px-2 py-0.5 bg-slate-900 text-white rounded hover:bg-slate-800 inline-flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Этаж</span>
                    </button>
                  )}
                </div>

                <div className="space-y-1.5">
                  {project.floors.map((fl) => (
                    <div
                      key={fl.id}
                      className="flex items-center justify-between p-2 rounded border border-slate-200 bg-slate-50"
                    >
                      <div>
                        <div className="font-semibold text-slate-800">{fl.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">H = {fl.height} м</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            updateProject(
                              (prev) => ({
                                ...prev,
                                floors: prev.floors.map((f) =>
                                  f.id === fl.id ? { ...f, showWalls: !f.showWalls } : f
                                ),
                              }),
                              false
                            )
                          }
                          className={`px-1.5 py-0.5 rounded text-[10px] border ${
                            fl.showWalls
                              ? 'bg-white border-slate-300 text-slate-700'
                              : 'bg-amber-100 border-amber-300 text-amber-900'
                          }`}
                        >
                          Стены
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateProject(
                              (prev) => ({
                                ...prev,
                                floors: prev.floors.map((f) =>
                                  f.id === fl.id ? { ...f, showSlab: !f.showSlab } : f
                                ),
                              }),
                              false
                            )
                          }
                          className={`px-1.5 py-0.5 rounded text-[10px] border ${
                            fl.showSlab
                              ? 'bg-white border-slate-300 text-slate-700'
                              : 'bg-amber-100 border-amber-300 text-amber-900'
                          }`}
                        >
                          Плита
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {hiddenWallsCount > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      updateProject(
                        (prev) => ({
                          ...prev,
                          walls: prev.walls.map((w) => ({ ...w, hidden: false })),
                        }),
                        true
                      )
                    }
                    className="w-full py-1.5 px-2 bg-amber-50 border border-amber-200 text-amber-900 rounded text-[11px] font-semibold inline-flex items-center justify-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Показать скрытые стены ({hiddenWallsCount})</span>
                  </button>
                )}
              </div>

              {/* Global Roof & Wall Finishes */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <span className="text-[11px] font-bold uppercase text-slate-700 block">
                  Крыша и фасад
                </span>
                <select
                  value={project.roof.type}
                  onChange={(e) => {
                    const type = e.target.value as RoofShape;
                    updateProject(
                      (prev) => ({
                        ...prev,
                        roof: { ...prev.roof, type, height: type === 'flat' ? 0.4 : 2.8 },
                      }),
                      true
                    );
                  }}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs bg-white"
                >
                  <option value="gable">Двускатная крыша</option>
                  <option value="hip">Вальмовая (4-скатная)</option>
                  <option value="flat">Плоская с парапетом</option>
                </select>

                <select
                  value={project.walls.find((w) => w.isExterior)?.finish || 'brick_red'}
                  onChange={(e) => {
                    const finish = e.target.value as WallFinish;
                    updateProject(
                      (prev) => ({
                        ...prev,
                        walls: prev.walls.map((w) => (w.isExterior ? { ...w, finish } : w)),
                      }),
                      true
                    );
                  }}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs bg-white"
                >
                  <option value="brick_red">Фасад: Красный кирпич</option>
                  <option value="brick_yellow">Фасад: Жёлтый кирпич</option>
                  <option value="stucco_white">Фасад: Белая штукатурка</option>
                  <option value="stucco_gray">Фасад: Серая штукатурка</option>
                  <option value="wood_timber">Фасад: Дерево / Брус</option>
                </select>
              </div>

              {/* Geometry Validation Warnings */}
              {geometryIssues.length > 0 && (
                <div className="pt-2 border-t border-slate-200 space-y-1.5">
                  <span className="text-[11px] font-bold text-rose-700 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Проверка коллизий ({geometryIssues.length})
                  </span>
                  {geometryIssues.slice(0, 4).map((iss) => (
                    <div
                      key={iss.id}
                      className="p-2 rounded bg-rose-50 border border-rose-200 text-[10px] text-rose-900 leading-snug"
                    >
                      {iss.messageRu}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
