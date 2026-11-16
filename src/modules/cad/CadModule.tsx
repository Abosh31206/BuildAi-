import React, { useState, useMemo } from 'react';
import { useTranslation } from '../../locales/LanguageContext';
import { useProject } from '../project/store/ProjectContext';
import {
  applyBuilding3dSpecToProject,
  wallLengthMeters,
} from '../project/engine/projectSync';
import {
  CadUnit,
  CadScale,
  PaperFormat,
  CadLayer,
  CadPrimitiveEntity,
  Point2D,
} from '../project/types';
import { CadFloorPlan } from './types';
import {
  KonvaCadCanvas,
  CadToolId,
  CadSelectionItem,
} from './components/KonvaCadCanvas';
import {
  SnapSettings,
  formatUnitNumber,
} from './engine/geometry2dKernel';
import { downloadUnifiedDxfFile } from './engine/dxfExporter';
import { exportCadSheetToVectorPdf } from './engine/vectorPdfSheetExporter';
import {
  MousePointer2,
  Hand,
  Square,
  Minus,
  Spline,
  Circle,
  DoorOpen,
  AppWindow,
  Type,
  MessageSquare,
  Ruler,
  Scissors,
  MoveRight,
  Copy,
  RotateCw,
  FlipHorizontal,
  Move,
  Undo2,
  Redo2,
  Download,
  Printer,
  Sparkles,
  Layers,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Plus,
  Trash2,
  FileSpreadsheet,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  ClipboardPaste,
} from 'lucide-react';

interface CadModuleProps {
  onOpenPdfExport?: (plan: CadFloorPlan) => void;
}

export const CadModule: React.FC<CadModuleProps> = () => {
  const { language } = useTranslation();
  const {
    project,
    updateProject,
    activeFloorIndex,
    setActiveFloorIndex,
    undo,
    redo,
    canUndo,
    canRedo,
    geometryIssues,
  } = useProject();

  const [activeTool, setActiveTool] = useState<CadToolId>('select');
  const [activeLayerId, setActiveLayerId] = useState<string>('DRAFTING');
  const [selectedItems, setSelectedItems] = useState<CadSelectionItem[]>([]);
  const [rightTab, setRightTab] = useState<'props' | 'layers' | 'rooms'>('props');
  const [clipboardPrims, setClipboardPrims] = useState<CadPrimitiveEntity[]>([]);
  const [cursorPt, setCursorPt] = useState<Point2D>({ x: 0, y: 0 });
  const [cursorSnap, setCursorSnap] = useState<string | null>(null);
  const [statusHint, setStatusHint] = useState<string>(
    'Выберите инструмент слева или кликните по стене / проёму на чертеже'
  );

  // Drafting options
  const [offsetDist, setOffsetDist] = useState<number>(1.0);
  const [rotateDeg, setRotateDeg] = useState<number>(45);
  const [newWallThick, setNewWallThick] = useState<number>(0.25);
  const [newLayerName, setNewLayerName] = useState<string>('');

  // AI Prompt bar
  const [showAiBar, setShowAiBar] = useState<boolean>(false);
  const [prompt, setPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const [snapSettings, setSnapSettings] = useState<SnapSettings>({
    gridSnap: true,
    gridStepMeters: 0.1,
    ortho: false,
    osnap: {
      endpoint: true,
      midpoint: true,
      center: true,
      intersection: true,
      perpendicular: true,
      nearest: false,
    },
  });

  const floor = project.floors[activeFloorIndex] || project.floors[0];
  const floorId = floor?.id || 'fl_1';

  const floorRooms = useMemo(
    () => project.rooms.filter((r) => r.floorId === floorId),
    [project.rooms, floorId]
  );
  const totalLivingArea = useMemo(
    () => floorRooms.reduce((s, r) => s + r.area, 0),
    [floorRooms]
  );

  const primarySelected = selectedItems[0] || null;
  const selectedWall =
    primarySelected?.kind === 'wall'
      ? project.walls.find((w) => w.id === primarySelected.id) || null
      : null;
  const selectedOpening =
    primarySelected?.kind === 'opening'
      ? project.openings.find((o) => o.id === primarySelected.id) || null
      : null;
  const selectedPrimitive =
    primarySelected?.kind === 'primitive'
      ? project.cad2d.primitives.find((p) => p.id === primarySelected.id) || null
      : null;

  const handleGenerateFromPrompt = async () => {
    const text = prompt.trim();
    if (!text) return;
    setIsGenerating(true);
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
          setIsGenerating(false);
          setShowAiBar(false);
          return;
        }
      }
    } catch {
      // ignore and run procedural fallback
    }

    const match = text.match(/(\d+)\s*[xх×]\s*(\d+)/i);
    const w = match ? Math.max(6, Math.min(30, parseInt(match[1], 10))) : 12;
    const l = match ? Math.max(6, Math.min(30, parseInt(match[2], 10))) : 10;
    const floors = text.toLowerCase().includes('2') || text.toLowerCase().includes('двух') ? 2 : 1;

    updateProject(
      (prev) =>
        applyBuilding3dSpecToProject(
          {
            id: `cad_${Date.now()}`,
            name: `План ${w}×${l} м (${floors} эт.)`,
            floors,
            width: w,
            length: l,
            floorHeight: 3.0,
            wallThickness: 0.38,
            roofType: 'gable',
            roofHeight: 2.8,
            roofOverhang: 0.6,
            wallFinish: 'brick_red',
            roofFinish: 'metal_tile_dark',
            windowsPerSide: 3,
            totalArea: w * l * floors,
          },
          prev
        ),
      true
    );
    setIsGenerating(false);
    setShowAiBar(false);
  };

  const handleDeleteSelected = () => {
    if (selectedItems.length === 0) return;
    const ids = new Set(selectedItems.map((i) => i.id));
    updateProject(
      (prev) => ({
        ...prev,
        walls: prev.walls.filter((w) => !ids.has(w.id)),
        openings: prev.openings.filter((o) => !ids.has(o.id) && !ids.has(o.wallId)),
        columns: prev.columns.filter((c) => !ids.has(c.id)),
        stairs: prev.stairs.filter((s) => !ids.has(s.id)),
        cad2d: {
          ...prev.cad2d,
          primitives: prev.cad2d.primitives.filter((p) => !ids.has(p.id)),
          dimensions: prev.cad2d.dimensions.filter((d) => !ids.has(d.id)),
        },
      }),
      true
    );
    setSelectedItems([]);
  };

  const handleCopyClipboard = () => {
    const ids = new Set(selectedItems.filter((i) => i.kind === 'primitive').map((i) => i.id));
    const prims = project.cad2d.primitives.filter((p) => ids.has(p.id));
    if (prims.length > 0) {
      setClipboardPrims(prims);
      setStatusHint(`Скопировано объектов в буфер: ${prims.length}`);
    }
  };

  const handlePasteClipboard = () => {
    if (clipboardPrims.length === 0) return;
    const pasted = clipboardPrims.map((p) => ({
      ...p,
      id: `prim_paste_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      floorId,
      points: p.points.map((pt) => ({ x: pt.x + 1.0, y: pt.y + 1.0 })),
    }));
    updateProject(
      (prev) => ({
        ...prev,
        cad2d: { ...prev.cad2d, primitives: [...prev.cad2d.primitives, ...pasted] },
      }),
      true
    );
    setSelectedItems(pasted.map((p) => ({ kind: 'primitive', id: p.id })));
  };

  const handleAddCustomLayer = () => {
    const trimmed = newLayerName.trim();
    if (!trimmed) return;
    const newLayer: CadLayer = {
      id: `USR_${Date.now()}`,
      name: trimmed,
      color: '#0369a1',
      visible: true,
      locked: false,
      lineWeight: 0.25,
      lineType: 'CONTINUOUS',
      isSystem: false,
    };
    updateProject(
      (prev) => ({ ...prev, cad2d: { ...prev.cad2d, layers: [...prev.cad2d.layers, newLayer] } }),
      true
    );
    setActiveLayerId(newLayer.id);
    setNewLayerName('');
  };

  const toolGroups: {
    group: string;
    tools: { id: CadToolId; label: string; icon: React.ComponentType<{ className?: string }> }[];
  }[] = [
    {
      group: 'Навигация',
      tools: [
        { id: 'select', label: 'Выбор', icon: MousePointer2 },
        { id: 'pan', label: 'Рука', icon: Hand },
      ],
    },
    {
      group: 'Архитектура (2D↔3D)',
      tools: [
        { id: 'wall', label: 'Стена', icon: Square },
        { id: 'window', label: 'Окно', icon: AppWindow },
        { id: 'door', label: 'Дверь', icon: DoorOpen },
        { id: 'column', label: 'Колонна', icon: Square },
        { id: 'stair', label: 'Лестница', icon: Layers },
      ],
    },
    {
      group: 'Черчение',
      tools: [
        { id: 'line', label: 'Отрезок', icon: Minus },
        { id: 'polyline', label: 'Полилиния', icon: Spline },
        { id: 'rect', label: 'Прямоуг.', icon: Square },
        { id: 'circle', label: 'Круг', icon: Circle },
        { id: 'arc', label: 'Дуга', icon: RotateCw },
      ],
    },
    {
      group: 'Размеры и выноски',
      tools: [
        { id: 'dim_linear', label: 'Размер', icon: Ruler },
        { id: 'dim_opening', label: 'Проём', icon: Ruler },
        { id: 'text', label: 'Текст', icon: Type },
        { id: 'callout', label: 'Выноска', icon: MessageSquare },
        { id: 'elevation', label: 'Отметка', icon: MessageSquare },
        { id: 'section', label: 'Разрез', icon: Scissors },
      ],
    },
    {
      group: 'Модификаторы',
      tools: [
        { id: 'offset', label: 'Смещение', icon: Copy },
        { id: 'trim', label: 'Обрезать', icon: Scissors },
        { id: 'extend', label: 'Продлить', icon: MoveRight },
        { id: 'move', label: 'Переместить', icon: Move },
        { id: 'copy', label: 'Копировать', icon: Copy },
        { id: 'rotate', label: 'Поворот', icon: RotateCw },
        { id: 'mirror', label: 'Зеркало', icon: FlipHorizontal },
      ],
    },
  ];

  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-5 space-y-2.5">
      {/* 1. Top CAD Ribbon */}
      <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-xs flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Floor Tabs */}
          <div className="inline-flex bg-slate-100 p-0.5 rounded border border-slate-200">
            {project.floors.map((fl, idx) => (
              <button
                key={fl.id}
                type="button"
                onClick={() => {
                  setActiveFloorIndex(idx);
                  setSelectedItems([]);
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold ${
                  activeFloorIndex === idx
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {idx + 1} этаж
              </button>
            ))}
          </div>

          {/* Model Space vs Paper Space Toggle */}
          <div className="inline-flex bg-slate-100 p-0.5 rounded border border-slate-200">
            <button
              type="button"
              onClick={() =>
                updateProject(
                  (prev) => ({
                    ...prev,
                    cad2d: { ...prev.cad2d, paperSpace: { ...prev.cad2d.paperSpace, enabled: false } },
                  }),
                  false
                )
              }
              className={`px-2.5 py-1 rounded text-[11px] font-semibold ${
                !project.cad2d.paperSpace.enabled ? 'bg-blue-900 text-white' : 'text-slate-600'
              }`}
            >
              Модель
            </button>
            <button
              type="button"
              onClick={() =>
                updateProject(
                  (prev) => ({
                    ...prev,
                    cad2d: { ...prev.cad2d, paperSpace: { ...prev.cad2d.paperSpace, enabled: true } },
                  }),
                  false
                )
              }
              className={`px-2.5 py-1 rounded text-[11px] font-semibold ${
                project.cad2d.paperSpace.enabled ? 'bg-blue-900 text-white' : 'text-slate-600'
              }`}
            >
              Лист (ГОСТ)
            </button>
          </div>

          {/* Units & Scale & Paper Format */}
          <select
            value={project.cad2d.units}
            onChange={(e) =>
              updateProject(
                (prev) => ({ ...prev, cad2d: { ...prev.cad2d, units: e.target.value as CadUnit } }),
                false
              )
            }
            className="border border-slate-300 rounded px-2 py-1 text-[11px] font-mono bg-slate-50"
            title="Единицы измерения"
          >
            <option value="mm">мм</option>
            <option value="cm">см</option>
            <option value="m">м</option>
          </select>

          <select
            value={project.cad2d.paperSpace.scale}
            onChange={(e) =>
              updateProject(
                (prev) => ({
                  ...prev,
                  cad2d: {
                    ...prev.cad2d,
                    scale: e.target.value as CadScale,
                    paperSpace: { ...prev.cad2d.paperSpace, scale: e.target.value as CadScale },
                  },
                }),
                false
              )
            }
            className="border border-slate-300 rounded px-2 py-1 text-[11px] font-mono bg-slate-50"
            title="Масштаб листа"
          >
            <option value="1:50">М 1:50</option>
            <option value="1:100">М 1:100</option>
            <option value="1:200">М 1:200</option>
          </select>

          <select
            value={project.cad2d.paperSpace.format}
            onChange={(e) =>
              updateProject(
                (prev) => ({
                  ...prev,
                  cad2d: {
                    ...prev.cad2d,
                    paperSpace: { ...prev.cad2d.paperSpace, format: e.target.value as PaperFormat },
                  },
                }),
                false
              )
            }
            className="border border-slate-300 rounded px-2 py-1 text-[11px] font-mono bg-slate-50"
            title="Формат листа PDF"
          >
            {(['A4', 'A3', 'A2', 'A1', 'A0'] as PaperFormat[]).map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        {/* Right Actions: Undo/Redo, Copy/Paste/Delete, AI, DXF, PDF */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            className="p-1.5 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
            title="Отменить (Undo)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            className="p-1.5 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
            title="Повторить (Redo)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleCopyClipboard}
            disabled={selectedItems.length === 0}
            className="p-1.5 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
            title="Копировать примитив"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handlePasteClipboard}
            disabled={clipboardPrims.length === 0}
            className="p-1.5 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
            title="Вставить из буфера"
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleDeleteSelected}
            disabled={selectedItems.length === 0}
            className="p-1.5 rounded border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-40"
            title="Удалить выбранное"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setShowAiBar(!showAiBar)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-blue-200 bg-blue-50 text-blue-900 font-semibold text-[11px] hover:bg-blue-100"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>AI План</span>
          </button>

          <button
            type="button"
            onClick={() => downloadUnifiedDxfFile(project, activeFloorIndex)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold text-[11px] border border-slate-300"
          >
            <Download className="w-3.5 h-3.5" />
            <span>DXF</span>
          </button>

          <button
            type="button"
            onClick={() => exportCadSheetToVectorPdf(project, activeFloorIndex)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-blue-900 hover:bg-blue-800 text-white font-semibold text-[11px]"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>PDF (Вектор)</span>
          </button>
        </div>
      </div>

      {/* Collapsible AI Prompt Bar */}
      {showAiBar && (
        <div className="bg-white border border-blue-200 rounded-lg p-3 flex flex-col sm:flex-row gap-2 shadow-xs">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Например: Двухэтажный дом 14x12 м..."
            className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded outline-none focus:border-blue-600"
          />
          <button
            type="button"
            onClick={handleGenerateFromPrompt}
            disabled={isGenerating}
            className="px-4 py-1.5 bg-blue-900 text-white text-xs font-semibold rounded hover:bg-blue-800 disabled:opacity-50"
          >
            {isGenerating ? 'Генерация...' : 'Сформировать план'}
          </button>
        </div>
      )}

      {/* 2. Main 3-Column CAD Workspace (Left Tools + Konva Canvas + Right Dock) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-stretch">
        {/* Left Vertical Tool Rail */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-2 space-y-2.5 max-h-[590px] overflow-y-auto shadow-xs">
          {toolGroups.map((grp) => (
            <div key={grp.group} className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                {grp.group}
              </div>
              <div className="grid grid-cols-3 lg:grid-cols-2 gap-1">
                {grp.tools.map((t) => {
                  const Icon = t.icon;
                  const active = activeTool === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setActiveTool(t.id);
                        setStatusHint(`Инструмент: ${t.label}`);
                      }}
                      className={`flex flex-col items-center justify-center p-1.5 rounded border text-[10px] font-medium transition-colors ${
                        active
                          ? 'bg-blue-900 text-white border-blue-900 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 mb-0.5" />
                      <span className="truncate max-w-full">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Quick Parameters for Active Drafting Tool */}
          {activeTool === 'wall' && (
            <div className="p-2 rounded bg-blue-50 border border-blue-200 text-[11px] space-y-1">
              <span className="font-bold text-blue-900 block">Толщина стены (м):</span>
              <input
                type="number"
                step="0.02"
                min="0.08"
                max="0.64"
                value={newWallThick}
                onChange={(e) => setNewWallThick(parseFloat(e.target.value) || 0.25)}
                className="w-full border border-blue-300 rounded px-1.5 py-1 bg-white font-mono"
              />
            </div>
          )}
          {activeTool === 'offset' && (
            <div className="p-2 rounded bg-blue-50 border border-blue-200 text-[11px] space-y-1">
              <span className="font-bold text-blue-900 block">Шаг Offset (м):</span>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="10"
                value={offsetDist}
                onChange={(e) => setOffsetDist(parseFloat(e.target.value) || 1.0)}
                className="w-full border border-blue-300 rounded px-1.5 py-1 bg-white font-mono"
              />
            </div>
          )}
          {activeTool === 'rotate' && (
            <div className="p-2 rounded bg-blue-50 border border-blue-200 text-[11px] space-y-1">
              <span className="font-bold text-blue-900 block">Угол поворота (°):</span>
              <input
                type="number"
                step="15"
                value={rotateDeg}
                onChange={(e) => setRotateDeg(parseFloat(e.target.value) || 45)}
                className="w-full border border-blue-300 rounded px-1.5 py-1 bg-white font-mono"
              />
            </div>
          )}
        </div>

        {/* Center Konva Canvas */}
        <div className="lg:col-span-7">
          <KonvaCadCanvas
            project={project}
            floorIndex={activeFloorIndex}
            activeTool={activeTool}
            activeLayerId={activeLayerId}
            snapSettings={snapSettings}
            selectedItems={selectedItems}
            onSelectItems={setSelectedItems}
            onUpdateProject={updateProject}
            onCursorCoordsChange={(pt, snap) => {
              setCursorPt(pt);
              setCursorSnap(snap);
            }}
            onStatusHintChange={setStatusHint}
            offsetDistanceMeters={offsetDist}
            rotateAngleDeg={rotateDeg}
            wallThicknessMeters={newWallThick}
          />
        </div>

        {/* Right Tabbed CAD Dock (Properties / Layers / Explication) */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-lg flex flex-col max-h-[590px] shadow-xs overflow-hidden">
          <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setRightTab('props')}
              className={`py-2 flex items-center justify-center gap-1 ${
                rightTab === 'props' ? 'bg-white text-blue-900 border-b-2 border-blue-900' : 'text-slate-500'
              }`}
            >
              <Sliders className="w-3 h-3" />
              <span>Свойства</span>
            </button>
            <button
              type="button"
              onClick={() => setRightTab('layers')}
              className={`py-2 flex items-center justify-center gap-1 ${
                rightTab === 'layers' ? 'bg-white text-blue-900 border-b-2 border-blue-900' : 'text-slate-500'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Слои ({project.cad2d.layers.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setRightTab('rooms')}
              className={`py-2 flex items-center justify-center gap-1 ${
                rightTab === 'rooms' ? 'bg-white text-blue-900 border-b-2 border-blue-900' : 'text-slate-500'
              }`}
            >
              <FileSpreadsheet className="w-3 h-3" />
              <span>Комнаты</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 text-xs space-y-3">
            {/* TAB 1: PROPERTIES */}
            {rightTab === 'props' && (
              <div className="space-y-3">
                {selectedWall && (
                  <div className="space-y-2.5">
                    <div className="font-bold text-slate-900">Стена (Синхр. с 3D)</div>
                    <div className="text-[11px] font-mono text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                      Длина: {wallLengthMeters(selectedWall).toFixed(2)} м
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-600 block mb-1">Толщина (м)</label>
                      <input
                        type="number"
                        step="0.02"
                        min="0.08"
                        max="0.8"
                        value={selectedWall.thickness}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0.2;
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
                        className="w-full border border-slate-300 rounded px-2 py-1 font-mono"
                      />
                    </div>
                  </div>
                )}

                {selectedOpening && (
                  <div className="space-y-2.5">
                    <div className="font-bold text-slate-900">
                      {selectedOpening.type === 'window' ? 'Окно (Синхр. с 3D)' : 'Дверь (Синхр. с 3D)'}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-1">Ширина (м)</label>
                        <input
                          type="number"
                          step="0.05"
                          value={selectedOpening.width}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0.9;
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
                          className="w-full border border-slate-300 rounded px-2 py-1 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-1">Высота (м)</label>
                        <input
                          type="number"
                          step="0.05"
                          value={selectedOpening.height}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 1.4;
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
                          className="w-full border border-slate-300 rounded px-2 py-1 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {selectedPrimitive && (
                  <div className="space-y-2.5">
                    <div className="font-bold text-slate-900">2D Примитив ({selectedPrimitive.kind})</div>
                    <div className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
                      Только 2D чертёжная графика (не изменяет 3D-конструктив).
                    </div>
                    {(selectedPrimitive.kind === 'text' ||
                      selectedPrimitive.kind === 'callout' ||
                      selectedPrimitive.kind === 'elevation') && (
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-1">Текст / Отметка</label>
                        <input
                          type="text"
                          value={selectedPrimitive.text || ''}
                          onChange={(e) =>
                            updateProject(
                              (prev) => ({
                                ...prev,
                                cad2d: {
                                  ...prev.cad2d,
                                  primitives: prev.cad2d.primitives.map((p) =>
                                    p.id === selectedPrimitive.id ? { ...p, text: e.target.value } : p
                                  ),
                                },
                              }),
                              false
                            )
                          }
                          className="w-full border border-slate-300 rounded px-2 py-1 text-xs"
                        />
                      </div>
                    )}
                    <div>
                      <label className="text-[11px] text-slate-600 block mb-1">Слой</label>
                      <select
                        value={selectedPrimitive.layerId}
                        onChange={(e) =>
                          updateProject(
                            (prev) => ({
                              ...prev,
                              cad2d: {
                                ...prev.cad2d,
                                primitives: prev.cad2d.primitives.map((p) =>
                                  p.id === selectedPrimitive.id ? { ...p, layerId: e.target.value } : p
                                ),
                              },
                            }),
                            true
                          )
                        }
                        className="w-full border border-slate-300 rounded px-2 py-1 text-xs"
                      >
                        {project.cad2d.layers.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {!primarySelected && (
                  <div className="space-y-2.5">
                    <div className="font-bold text-slate-900">Штамп листа ГОСТ 21.101</div>
                    <div>
                      <label className="text-[11px] text-slate-600 block mb-1">Шифр проекта</label>
                      <input
                        type="text"
                        value={project.cad2d.paperSpace.titleBlock.projectCode}
                        onChange={(e) =>
                          updateProject(
                            (prev) => ({
                              ...prev,
                              projectCode: e.target.value,
                              cad2d: {
                                ...prev.cad2d,
                                paperSpace: {
                                  ...prev.cad2d.paperSpace,
                                  titleBlock: {
                                    ...prev.cad2d.paperSpace.titleBlock,
                                    projectCode: e.target.value,
                                  },
                                },
                              },
                            }),
                            false
                          )
                        }
                        className="w-full border border-slate-300 rounded px-2 py-1 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-600 block mb-1">Разработал</label>
                      <input
                        type="text"
                        value={project.cad2d.paperSpace.titleBlock.developer}
                        onChange={(e) =>
                          updateProject(
                            (prev) => ({
                              ...prev,
                              cad2d: {
                                ...prev.cad2d,
                                paperSpace: {
                                  ...prev.cad2d.paperSpace,
                                  titleBlock: {
                                    ...prev.cad2d.paperSpace.titleBlock,
                                    developer: e.target.value,
                                  },
                                },
                              },
                            }),
                            false
                          )
                        }
                        className="w-full border border-slate-300 rounded px-2 py-1"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-600 block mb-1">ГИП</label>
                      <input
                        type="text"
                        value={project.cad2d.paperSpace.titleBlock.gip}
                        onChange={(e) =>
                          updateProject(
                            (prev) => ({
                              ...prev,
                              cad2d: {
                                ...prev.cad2d,
                                paperSpace: {
                                  ...prev.cad2d.paperSpace,
                                  titleBlock: {
                                    ...prev.cad2d.paperSpace.titleBlock,
                                    gip: e.target.value,
                                  },
                                },
                              },
                            }),
                            false
                          )
                        }
                        className="w-full border border-slate-300 rounded px-2 py-1"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: LAYERS MANAGER */}
            {rightTab === 'layers' && (
              <div className="space-y-2">
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={newLayerName}
                    onChange={(e) => setNewLayerName(e.target.value)}
                    placeholder="Новый слой..."
                    className="flex-1 border border-slate-300 rounded px-2 py-1 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomLayer}
                    className="px-2 py-1 bg-slate-900 text-white rounded hover:bg-slate-800"
                    title="Добавить слой"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1">
                  {project.cad2d.layers.map((layer) => (
                    <div
                      key={layer.id}
                      onClick={() => setActiveLayerId(layer.id)}
                      className={`p-1.5 rounded border flex items-center justify-between gap-1.5 cursor-pointer ${
                        activeLayerId === layer.id
                          ? 'bg-blue-50 border-blue-300'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: layer.color }}
                        />
                        <span className="truncate font-medium text-slate-800 text-[11px]">
                          {layer.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateProject(
                              (prev) => ({
                                ...prev,
                                cad2d: {
                                  ...prev.cad2d,
                                  layers: prev.cad2d.layers.map((l) =>
                                    l.id === layer.id ? { ...l, visible: !l.visible } : l
                                  ),
                                },
                              }),
                              false
                            );
                          }}
                          className="p-1 rounded hover:bg-white text-slate-600"
                          title={layer.visible ? 'Скрыть слой' : 'Показать слой'}
                        >
                          {layer.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-rose-500" />}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateProject(
                              (prev) => ({
                                ...prev,
                                cad2d: {
                                  ...prev.cad2d,
                                  layers: prev.cad2d.layers.map((l) =>
                                    l.id === layer.id ? { ...l, locked: !l.locked } : l
                                  ),
                                },
                              }),
                              false
                            );
                          }}
                          className="p-1 rounded hover:bg-white text-slate-600"
                          title={layer.locked ? 'Разблокировать' : 'Заблокировать'}
                        >
                          {layer.locked ? <Lock className="w-3 h-3 text-amber-600" /> : <Unlock className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: ROOM EXPLICATION */}
            {rightTab === 'rooms' && (
              <div className="space-y-2">
                <div className="divide-y divide-slate-100">
                  {floorRooms.map((r, i) => (
                    <div key={r.id} className="py-1.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 truncate">
                          {i + 1}. {r.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {r.width} × {r.height} м
                        </div>
                      </div>
                      <span className="font-mono font-bold text-slate-900 shrink-0">
                        {r.area.toFixed(1)} м²
                      </span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                  <span>Итого по этажу:</span>
                  <span className="font-mono text-blue-900">{totalLivingArea.toFixed(1)} м²</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Bottom CAD Precision Status Bar (Coords, OSNAP, ORTHO, GRID, 2D<->3D Sync) */}
      <div className="bg-slate-900 text-slate-200 rounded-lg px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sky-300 font-bold">
            X: {formatUnitNumber(cursorPt.x, project.cad2d.units)} · Y:{' '}
            {formatUnitNumber(cursorPt.y, project.cad2d.units)} ({project.cad2d.units})
          </span>
          {cursorSnap && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 text-[10px]">
              SNAP: {cursorSnap.toUpperCase()}
            </span>
          )}
          <span className="hidden xl:inline text-slate-400 font-sans">{statusHint}</span>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {[
            { key: 'endpoint', label: 'END' },
            { key: 'midpoint', label: 'MID' },
            { key: 'center', label: 'CEN' },
            { key: 'intersection', label: 'INT' },
            { key: 'perpendicular', label: 'PER' },
          ].map((snapItem) => {
            const active =
              snapSettings.osnap[snapItem.key as keyof typeof snapSettings.osnap];
            return (
              <button
                key={snapItem.key}
                type="button"
                onClick={() =>
                  setSnapSettings((prev) => ({
                    ...prev,
                    osnap: {
                      ...prev.osnap,
                      [snapItem.key]: !prev.osnap[snapItem.key as keyof typeof prev.osnap],
                    },
                  }))
                }
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  active ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
                title={`Привязка ${snapItem.label}`}
              >
                {snapItem.label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setSnapSettings((p) => ({ ...p, ortho: !p.ortho }))}
            className={`px-2 py-0.5 rounded text-[10px] font-bold ml-1 ${
              snapSettings.ortho ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            ORTHO
          </button>
          <button
            type="button"
            onClick={() => setSnapSettings((p) => ({ ...p, gridSnap: !p.gridSnap }))}
            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              snapSettings.gridSnap ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            GRID
          </button>

          <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-sans">
            {geometryIssues.length > 0 ? (
              <>
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                <span className="text-amber-300">Коллизий: {geometryIssues.length}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-300">
                  {language === 'kk' ? '2D↔3D Синхрондау OK' : '2D↔3D Sync OK'}
                </span>
              </>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};
