import React, { useEffect, useRef, useState } from 'react';
import Konva from 'konva';
import {
  UnifiedBuildingProject,
  Point2D,
  ProjectWall,
  ProjectOpening,
  CadPrimitiveEntity,
  CadProDimension,
} from '../../project/types';
import { wallLengthMeters } from '../../project/engine/projectSync';
import {
  SnapSettings,
  SnapResult,
  findSnapPoint,
  distToSegment,
  dist2D,
  formatUnitNumber,
  offsetSegmentPoints,
  trimSegmentByCutters,
  extendSegmentToCutters,
  rotatePointAround,
  mirrorPointAcrossLine,
} from '../engine/geometry2dKernel';
import { ZoomIn, ZoomOut, Maximize2, Check } from 'lucide-react';

export type CadToolId =
  | 'select'
  | 'pan'
  | 'wall'
  | 'window'
  | 'door'
  | 'column'
  | 'stair'
  | 'line'
  | 'polyline'
  | 'rect'
  | 'circle'
  | 'arc'
  | 'text'
  | 'callout'
  | 'elevation'
  | 'section'
  | 'dim_linear'
  | 'dim_angular'
  | 'dim_radial'
  | 'dim_opening'
  | 'offset'
  | 'trim'
  | 'extend'
  | 'move'
  | 'copy'
  | 'rotate'
  | 'mirror';

export interface CadSelectionItem {
  kind: 'wall' | 'opening' | 'primitive' | 'dimension' | 'column' | 'stair';
  id: string;
}

interface KonvaCadCanvasProps {
  project: UnifiedBuildingProject;
  floorIndex: number;
  activeTool: CadToolId;
  activeLayerId: string;
  snapSettings: SnapSettings;
  selectedItems: CadSelectionItem[];
  onSelectItems: (items: CadSelectionItem[]) => void;
  onUpdateProject: (
    updater: UnifiedBuildingProject | ((prev: UnifiedBuildingProject) => UnifiedBuildingProject),
    recordHistory?: boolean
  ) => void;
  onCursorCoordsChange?: (pt: Point2D, snapKind: string | null) => void;
  onStatusHintChange?: (hint: string) => void;
  offsetDistanceMeters?: number;
  rotateAngleDeg?: number;
  wallThicknessMeters?: number;
}

const PIXELS_PER_METER = 48;

export const KonvaCadCanvas: React.FC<KonvaCadCanvasProps> = ({
  project,
  floorIndex,
  activeTool,
  activeLayerId,
  snapSettings,
  selectedItems,
  onSelectItems,
  onUpdateProject,
  onCursorCoordsChange,
  onStatusHintChange,
  offsetDistanceMeters = 1.0,
  rotateAngleDeg = 45,
  wallThicknessMeters = 0.25,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const gridLayerRef = useRef<Konva.Layer | null>(null);
  const modelLayerRef = useRef<Konva.Layer | null>(null);
  const overlayLayerRef = useRef<Konva.Layer | null>(null);

  const [zoomPct, setZoomPct] = useState<number>(100);
  const [draftPoints, setDraftPoints] = useState<Point2D[]>([]);
  const [hoverSnap, setHoverSnap] = useState<SnapResult | null>(null);

  // Latest props in refs for Konva event callbacks
  const stateRef = useRef({
    project,
    floorIndex,
    activeTool,
    activeLayerId,
    snapSettings,
    selectedItems,
    draftPoints,
    offsetDistanceMeters,
    rotateAngleDeg,
    wallThicknessMeters,
  });
  stateRef.current = {
    project,
    floorIndex,
    activeTool,
    activeLayerId,
    snapSettings,
    selectedItems,
    draftPoints,
    offsetDistanceMeters,
    rotateAngleDeg,
    wallThicknessMeters,
  };

  const floor = project.floors[floorIndex] || project.floors[0];
  const floorId = floor?.id || 'fl_1';

  const centerStageOnBuilding = () => {
    const stage = stageRef.current;
    const container = containerRef.current;
    if (!stage || !container) return;
    const bw = project.totalWidth * PIXELS_PER_METER;
    const bh = project.totalLength * PIXELS_PER_METER;
    const padX = Math.max(120, container.clientWidth * 0.25);
    const padY = Math.max(120, container.clientHeight * 0.25);
    const scale = Math.min(
      1.35,
      Math.max(0.35, Math.min((container.clientWidth - padX) / Math.max(1, bw), (container.clientHeight - padY) / Math.max(1, bh)))
    );
    stage.scale({ x: scale, y: scale });
    stage.position({
      x: (container.clientWidth - bw * scale) / 2,
      y: (container.clientHeight - bh * scale) / 2,
    });
    setZoomPct(Math.round(scale * 100));
    stage.batchDraw();
  };

  // Clear draft points when tool changes
  useEffect(() => {
    setDraftPoints([]);
  }, [activeTool, floorIndex]);

  // 1. Mount Konva Stage once
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const stage = new Konva.Stage({
      container,
      width: Math.max(300, container.clientWidth),
      height: Math.max(300, container.clientHeight),
      draggable: false,
    });
    stageRef.current = stage;

    const gridLayer = new Konva.Layer({ listening: false });
    const modelLayer = new Konva.Layer();
    const overlayLayer = new Konva.Layer({ listening: false });

    gridLayerRef.current = gridLayer;
    modelLayerRef.current = modelLayer;
    overlayLayerRef.current = overlayLayer;

    stage.add(gridLayer);
    stage.add(modelLayer);
    stage.add(overlayLayer);

    centerStageOnBuilding();

    // Wheel zoom at pointer
    stage.on('wheel', (e) => {
      e.evt.preventDefault();
      const oldScale = stage.scaleX();
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      };
      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const factor = 1.1;
      const newScale = Math.max(0.2, Math.min(5, direction > 0 ? oldScale * factor : oldScale / factor));
      stage.scale({ x: newScale, y: newScale });
      stage.position({
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      });
      setZoomPct(Math.round(newScale * 100));
    });

    const getWorldMeters = (): Point2D | null => {
      const ptr = stage.getPointerPosition();
      if (!ptr) return null;
      const scale = stage.scaleX();
      return {
        x: (ptr.x - stage.x()) / (scale * PIXELS_PER_METER),
        y: (ptr.y - stage.y()) / (scale * PIXELS_PER_METER),
      };
    };

    stage.on('mousemove', () => {
      const s = stateRef.current;
      const raw = getWorldMeters();
      if (!raw) return;
      const fl = s.project.floors[s.floorIndex] || s.project.floors[0];
      const fId = fl?.id || 'fl_1';
      const fWalls = s.project.walls.filter((w) => w.floorId === fId && !w.hidden);
      const fPrims = s.project.cad2d.primitives.filter((p) => p.floorId === fId);
      const fCols = s.project.columns.filter((c) => c.floorId === fId);
      const origin = s.draftPoints.length > 0 ? s.draftPoints[s.draftPoints.length - 1] : null;
      const snap = findSnapPoint(raw, fWalls, fPrims, fCols, s.snapSettings, origin, 0.35);
      setHoverSnap(snap);
      if (onCursorCoordsChange) {
        onCursorCoordsChange(snap.point, snap.kind);
      }
    });

    stage.on('click', (evt) => {
      const s = stateRef.current;
      if (s.activeTool === 'pan') return;
      const raw = getWorldMeters();
      if (!raw) return;

      const fl = s.project.floors[s.floorIndex] || s.project.floors[0];
      const fId = fl?.id || 'fl_1';
      const fWalls = s.project.walls.filter((w) => w.floorId === fId && !w.hidden);
      const fPrims = s.project.cad2d.primitives.filter((p) => p.floorId === fId);
      const fCols = s.project.columns.filter((c) => c.floorId === fId);
      const origin = s.draftPoints.length > 0 ? s.draftPoints[s.draftPoints.length - 1] : null;
      const snap = findSnapPoint(raw, fWalls, fPrims, fCols, s.snapSettings, origin, 0.35);
      const pt = snap.point;

      // Hit testing helper
      const findClickedEntity = (): CadSelectionItem | null => {
        // Openings first (highest priority)
        for (const op of s.project.openings.filter((o) => o.floorId === fId)) {
          const w = fWalls.find((wl) => wl.id === op.wallId);
          if (!w) continue;
          const len = wallLengthMeters(w) || 1;
          const ux = (w.end.x - w.start.x) / len;
          const uy = (w.end.y - w.start.y) / len;
          const cx = w.start.x + ux * op.offsetU;
          const cy = w.start.y + uy * op.offsetU;
          if (dist2D(raw, { x: cx, y: cy }) <= Math.max(0.45, op.width / 2)) {
            return { kind: 'opening', id: op.id };
          }
        }
        // Walls
        for (const w of fWalls) {
          const res = distToSegment(raw, w.start, w.end);
          if (res.distance <= Math.max(0.25, w.thickness / 2 + 0.1)) {
            return { kind: 'wall', id: w.id };
          }
        }
        // Columns
        for (const c of fCols) {
          if (Math.abs(raw.x - c.x) <= c.width && Math.abs(raw.y - c.y) <= c.depth) {
            return { kind: 'column', id: c.id };
          }
        }
        // Primitives
        for (const p of fPrims) {
          if ((p.kind === 'line' || p.kind === 'polyline') && p.points.length >= 2) {
            for (let i = 0; i < p.points.length - 1; i++) {
              if (distToSegment(raw, p.points[i], p.points[i + 1]).distance <= 0.25) {
                return { kind: 'primitive', id: p.id };
              }
            }
          } else if (p.kind === 'rect' && p.points.length >= 2) {
            const [a, b] = p.points;
            const minX = Math.min(a.x, b.x);
            const maxX = Math.max(a.x, b.x);
            const minY = Math.min(a.y, b.y);
            const maxY = Math.max(a.y, b.y);
            if (raw.x >= minX - 0.2 && raw.x <= maxX + 0.2 && raw.y >= minY - 0.2 && raw.y <= maxY + 0.2) {
              return { kind: 'primitive', id: p.id };
            }
          } else if ((p.kind === 'circle' || p.kind === 'arc') && p.points[0]) {
            const r = p.radius || 1;
            if (Math.abs(dist2D(raw, p.points[0]) - r) <= 0.3 || dist2D(raw, p.points[0]) <= 0.3) {
              return { kind: 'primitive', id: p.id };
            }
          } else if (p.points[0] && dist2D(raw, p.points[0]) <= 0.65) {
            return { kind: 'primitive', id: p.id };
          }
        }
        return null;
      };

      // Tool dispatch
      if (s.activeTool === 'select') {
        const hit = findClickedEntity();
        if (!hit) {
          if (!evt.evt.shiftKey) onSelectItems([]);
          return;
        }
        if (evt.evt.shiftKey) {
          const exists = s.selectedItems.some((i) => i.id === hit.id);
          onSelectItems(
            exists ? s.selectedItems.filter((i) => i.id !== hit.id) : [...s.selectedItems, hit]
          );
        } else {
          onSelectItems([hit]);
        }
        return;
      }

      if (s.activeTool === 'wall') {
        if (s.draftPoints.length === 0) {
          setDraftPoints([pt]);
          onStatusHintChange?.('Укажите конечную точку стены');
        } else {
          const p0 = s.draftPoints[0];
          if (dist2D(p0, pt) >= 0.3) {
            const newWall: ProjectWall = {
              id: `w_${Date.now()}`,
              floorId: fId,
              start: p0,
              end: pt,
              thickness: s.wallThicknessMeters,
              height: fl?.height || 3.0,
              isExterior: s.wallThicknessMeters >= 0.25,
              finish: s.wallThicknessMeters >= 0.25 ? 'brick_red' : 'stucco_white',
              layerId: s.wallThicknessMeters >= 0.25 ? 'WALLS_EXT' : 'WALLS_INT',
            };
            onUpdateProject((prev) => ({ ...prev, walls: [...prev.walls, newWall] }), true);
            onSelectItems([{ kind: 'wall', id: newWall.id }]);
          }
          setDraftPoints([]);
        }
        return;
      }

      if (s.activeTool === 'window' || s.activeTool === 'door') {
        // Find nearest wall to raw click
        let bestWall: ProjectWall | null = null;
        let bestRes = { distance: Infinity, closest: raw, t: 0.5 };
        for (const w of fWalls) {
          const r = distToSegment(raw, w.start, w.end);
          if (r.distance < bestRes.distance) {
            bestRes = r;
            bestWall = w;
          }
        }
        if (bestWall && bestRes.distance <= 0.65) {
          const len = wallLengthMeters(bestWall);
          const w = s.activeTool === 'window' ? 1.5 : 0.9;
          const u = Math.max(w / 2 + 0.15, Math.min(len - w / 2 - 0.15, bestRes.t * len));
          const op: ProjectOpening = {
            id: `op_${Date.now()}`,
            floorId: fId,
            wallId: bestWall.id,
            type: s.activeTool,
            windowSubtype: s.activeTool === 'window' ? 'double' : undefined,
            doorSubtype: s.activeTool === 'door' ? (bestWall.isExterior ? 'entrance' : 'interior') : undefined,
            offsetU: Number(u.toFixed(2)),
            width: w,
            height: s.activeTool === 'window' ? 1.45 : 2.1,
            sillHeight: s.activeTool === 'window' ? 0.9 : 0,
            swingDirection: s.activeTool === 'door' ? 'left-in' : undefined,
            layerId: 'OPENINGS',
          };
          onUpdateProject((prev) => ({ ...prev, openings: [...prev.openings, op] }), true);
          onSelectItems([{ kind: 'opening', id: op.id }]);
        }
        return;
      }

      if (s.activeTool === 'column') {
        const col = { id: `col_${Date.now()}`, floorId: fId, x: pt.x, y: pt.y, width: 0.4, depth: 0.4, layerId: 'COLUMNS' };
        onUpdateProject((prev) => ({ ...prev, columns: [...prev.columns, col] }), true);
        onSelectItems([{ kind: 'column', id: col.id }]);
        return;
      }

      if (s.activeTool === 'stair') {
        const st = { id: `st_${Date.now()}`, floorId: fId, x: pt.x, y: pt.y, width: 1.2, length: 3.0, steps: 15, direction: 'right' as const, layerId: 'STAIRS' };
        onUpdateProject((prev) => ({ ...prev, stairs: [...prev.stairs, st] }), true);
        onSelectItems([{ kind: 'stair', id: st.id }]);
        return;
      }

      if (s.activeTool === 'line' || s.activeTool === 'rect' || s.activeTool === 'circle' || s.activeTool === 'arc') {
        if (s.draftPoints.length === 0) {
          setDraftPoints([pt]);
          onStatusHintChange?.(
            s.activeTool === 'circle' || s.activeTool === 'arc'
              ? 'Укажите радиус'
              : 'Укажите вторую точку'
          );
        } else {
          const p0 = s.draftPoints[0];
          const prim: CadPrimitiveEntity = {
            id: `prim_${Date.now()}`,
            floorId: fId,
            layerId: s.activeLayerId || 'DRAFTING',
            kind: s.activeTool,
            points: s.activeTool === 'circle' || s.activeTool === 'arc' ? [p0] : [p0, pt],
            radius: s.activeTool === 'circle' || s.activeTool === 'arc' ? Math.max(0.2, Number(dist2D(p0, pt).toFixed(2))) : undefined,
            startAngle: s.activeTool === 'arc' ? 0 : undefined,
            endAngle: s.activeTool === 'arc' ? 90 : undefined,
          };
          onUpdateProject(
            (prev) => ({ ...prev, cad2d: { ...prev.cad2d, primitives: [...prev.cad2d.primitives, prim] } }),
            true
          );
          onSelectItems([{ kind: 'primitive', id: prim.id }]);
          setDraftPoints([]);
        }
        return;
      }

      if (s.activeTool === 'polyline') {
        setDraftPoints((prev) => [...prev, pt]);
        onStatusHintChange?.('Кликайте узлы полилинии · Нажмите «Завершить» или DblClick');
        return;
      }

      if (s.activeTool === 'text' || s.activeTool === 'callout' || s.activeTool === 'elevation' || s.activeTool === 'section') {
        const defaultLabel =
          s.activeTool === 'elevation'
            ? `+${(fl?.elevation || 0).toFixed(3)}`
            : s.activeTool === 'callout'
              ? 'Узел А (СП РК)'
              : s.activeTool === 'section'
                ? '1-1'
                : 'Примечание';
        const prim: CadPrimitiveEntity = {
          id: `ann_${Date.now()}`,
          floorId: fId,
          layerId: 'ANNOTATIONS',
          kind: s.activeTool,
          points: s.activeTool === 'section' ? [pt, { x: pt.x + 3.0, y: pt.y }] : [pt],
          text: defaultLabel,
        };
        onUpdateProject(
          (prev) => ({ ...prev, cad2d: { ...prev.cad2d, primitives: [...prev.cad2d.primitives, prim] } }),
          true
        );
        onSelectItems([{ kind: 'primitive', id: prim.id }]);
        return;
      }

      if (s.activeTool === 'dim_linear' || s.activeTool === 'dim_angular' || s.activeTool === 'dim_radial' || s.activeTool === 'dim_opening') {
        if (s.draftPoints.length === 0) {
          setDraftPoints([pt]);
          onStatusHintChange?.('Укажите вторую точку размерной линии');
        } else {
          const p0 = s.draftPoints[0];
          const dimKind =
            s.activeTool === 'dim_angular'
              ? 'angular'
              : s.activeTool === 'dim_radial'
                ? 'radial'
                : s.activeTool === 'dim_opening'
                  ? 'opening'
                  : 'linear';
          const newDim: CadProDimension = {
            id: `dim_${Date.now()}`,
            floorId: fId,
            layerId: 'DIMENSIONS',
            kind: dimKind,
            p1: p0,
            p2: pt,
            offset: 0.65,
          };
          onUpdateProject(
            (prev) => ({ ...prev, cad2d: { ...prev.cad2d, dimensions: [...prev.cad2d.dimensions, newDim] } }),
            true
          );
          onSelectItems([{ kind: 'dimension', id: newDim.id }]);
          setDraftPoints([]);
        }
        return;
      }

      // MODIFIERS
      if (s.activeTool === 'offset') {
        // Click a line primitive or wall -> create parallel offset copy
        const linePrim = fPrims.find(
          (p) =>
            p.kind === 'line' &&
            p.points.length >= 2 &&
            distToSegment(raw, p.points[0], p.points[1]).distance < 0.45
        );
        if (linePrim) {
          if (s.draftPoints.length === 0) {
            setDraftPoints([linePrim.points[0], linePrim.points[1]]);
            onStatusHintChange?.('Кликните сторону смещения (Offset)');
          }
          return;
        }
        if (s.draftPoints.length === 2) {
          const [a, b] = s.draftPoints;
          const [na, nb] = offsetSegmentPoints(a, b, s.offsetDistanceMeters, pt);
          const copyPrim: CadPrimitiveEntity = {
            id: `prim_off_${Date.now()}`,
            floorId: fId,
            layerId: s.activeLayerId || 'DRAFTING',
            kind: 'line',
            points: [na, nb],
          };
          onUpdateProject(
            (prev) => ({ ...prev, cad2d: { ...prev.cad2d, primitives: [...prev.cad2d.primitives, copyPrim] } }),
            true
          );
          setDraftPoints([]);
          return;
        }
        // Direct click on a wall offsets a parallel wall!
        const hitWall = fWalls.find((w) => distToSegment(raw, w.start, w.end).distance < 0.45);
        if (hitWall) {
          const [na, nb] = offsetSegmentPoints(hitWall.start, hitWall.end, s.offsetDistanceMeters, {
            x: raw.x + 0.1,
            y: raw.y + 0.1,
          });
          const copyWall: ProjectWall = {
            ...hitWall,
            id: `w_off_${Date.now()}`,
            start: na,
            end: nb,
          };
          onUpdateProject((prev) => ({ ...prev, walls: [...prev.walls, copyWall] }), true);
        }
        return;
      }

      if (s.activeTool === 'trim' || s.activeTool === 'extend') {
        const cutters: { a: Point2D; b: Point2D }[] = [
          ...fWalls.map((w) => ({ a: w.start, b: w.end })),
          ...fPrims
            .filter((p) => p.kind === 'line' && p.points.length >= 2)
            .map((p) => ({ a: p.points[0], b: p.points[1] })),
        ];

        const hitPrim = fPrims.find(
          (p) => p.kind === 'line' && p.points.length >= 2 && distToSegment(raw, p.points[0], p.points[1]).distance < 0.4
        );
        if (hitPrim) {
          const otherCutters = cutters.filter(
            (c) => !(c.a.x === hitPrim.points[0].x && c.a.y === hitPrim.points[0].y && c.b.x === hitPrim.points[1].x)
          );
          const updatedPts =
            s.activeTool === 'trim'
              ? trimSegmentByCutters(hitPrim.points[0], hitPrim.points[1], raw, otherCutters)
              : extendSegmentToCutters(hitPrim.points[0], hitPrim.points[1], raw, otherCutters);
          if (updatedPts) {
            onUpdateProject(
              (prev) => ({
                ...prev,
                cad2d: {
                  ...prev.cad2d,
                  primitives: prev.cad2d.primitives.map((p) =>
                    p.id === hitPrim.id ? { ...p, points: updatedPts } : p
                  ),
                },
              }),
              true
            );
          }
          return;
        }

        const hitWall = fWalls.find((w) => distToSegment(raw, w.start, w.end).distance < 0.4);
        if (hitWall) {
          const otherCutters = cutters.filter(
            (c) => !(c.a.x === hitWall.start.x && c.a.y === hitWall.start.y && c.b.x === hitWall.end.x)
          );
          const updatedPts =
            s.activeTool === 'trim'
              ? trimSegmentByCutters(hitWall.start, hitWall.end, raw, otherCutters)
              : extendSegmentToCutters(hitWall.start, hitWall.end, raw, otherCutters);
          if (updatedPts) {
            onUpdateProject(
              (prev) => ({
                ...prev,
                walls: prev.walls.map((w) =>
                  w.id === hitWall.id ? { ...w, start: updatedPts[0], end: updatedPts[1] } : w
                ),
              }),
              true
            );
          }
        }
        return;
      }

      if (s.activeTool === 'move' || s.activeTool === 'copy') {
        if (s.selectedItems.length === 0) return;
        if (s.draftPoints.length === 0) {
          setDraftPoints([pt]);
          onStatusHintChange?.('Укажите точку назначения');
        } else {
          const base = s.draftPoints[0];
          const dx = pt.x - base.x;
          const dy = pt.y - base.y;
          const selIds = new Set(s.selectedItems.map((i) => i.id));
          const isCopy = s.activeTool === 'copy';

          onUpdateProject((prev) => {
            const newWalls = isCopy
              ? [
                  ...prev.walls,
                  ...prev.walls
                    .filter((w) => selIds.has(w.id))
                    .map((w) => ({
                      ...w,
                      id: `w_cp_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                      start: { x: w.start.x + dx, y: w.start.y + dy },
                      end: { x: w.end.x + dx, y: w.end.y + dy },
                    })),
                ]
              : prev.walls.map((w) =>
                  selIds.has(w.id)
                    ? { ...w, start: { x: w.start.x + dx, y: w.start.y + dy }, end: { x: w.end.x + dx, y: w.end.y + dy } }
                    : w
                );

            const newPrims = isCopy
              ? [
                  ...prev.cad2d.primitives,
                  ...prev.cad2d.primitives
                    .filter((p) => selIds.has(p.id))
                    .map((p) => ({
                      ...p,
                      id: `prim_cp_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                      points: p.points.map((pp) => ({ x: pp.x + dx, y: pp.y + dy })),
                    })),
                ]
              : prev.cad2d.primitives.map((p) =>
                  selIds.has(p.id)
                    ? { ...p, points: p.points.map((pp) => ({ x: pp.x + dx, y: pp.y + dy })) }
                    : p
                );

            const newCols = isCopy
              ? prev.columns
              : prev.columns.map((c) => (selIds.has(c.id) ? { ...c, x: c.x + dx, y: c.y + dy } : c));

            return {
              ...prev,
              walls: newWalls,
              columns: newCols,
              cad2d: { ...prev.cad2d, primitives: newPrims },
            };
          }, true);
          setDraftPoints([]);
        }
        return;
      }

      if (s.activeTool === 'rotate') {
        if (s.selectedItems.length === 0) return;
        const selIds = new Set(s.selectedItems.map((i) => i.id));
        onUpdateProject(
          (prev) => ({
            ...prev,
            walls: prev.walls.map((w) =>
              selIds.has(w.id)
                ? {
                    ...w,
                    start: rotatePointAround(w.start, pt, s.rotateAngleDeg),
                    end: rotatePointAround(w.end, pt, s.rotateAngleDeg),
                  }
                : w
            ),
            cad2d: {
              ...prev.cad2d,
              primitives: prev.cad2d.primitives.map((p) =>
                selIds.has(p.id)
                  ? { ...p, points: p.points.map((pp) => rotatePointAround(pp, pt, s.rotateAngleDeg)) }
                  : p
              ),
            },
          }),
          true
        );
        return;
      }

      if (s.activeTool === 'mirror') {
        if (s.selectedItems.length === 0) return;
        if (s.draftPoints.length === 0) {
          setDraftPoints([pt]);
          onStatusHintChange?.('Укажите вторую точку оси зеркала');
        } else {
          const lineA = s.draftPoints[0];
          const lineB = pt;
          const selIds = new Set(s.selectedItems.map((i) => i.id));
          onUpdateProject(
            (prev) => ({
              ...prev,
              walls: [
                ...prev.walls,
                ...prev.walls
                  .filter((w) => selIds.has(w.id))
                  .map((w) => ({
                    ...w,
                    id: `w_mir_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                    start: mirrorPointAcrossLine(w.start, lineA, lineB),
                    end: mirrorPointAcrossLine(w.end, lineA, lineB),
                  })),
              ],
              cad2d: {
                ...prev.cad2d,
                primitives: [
                  ...prev.cad2d.primitives,
                  ...prev.cad2d.primitives
                    .filter((p) => selIds.has(p.id))
                    .map((p) => ({
                      ...p,
                      id: `prim_mir_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                      points: p.points.map((pp) => mirrorPointAcrossLine(pp, lineA, lineB)),
                    })),
                ],
              },
            }),
            true
          );
          setDraftPoints([]);
        }
      }
    });

    const handleResize = () => {
      if (!container) return;
      stage.width(Math.max(300, container.clientWidth));
      stage.height(Math.max(300, container.clientHeight));
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      stage.destroy();
    };
  }, []);

  // Toggle Konva stage dragging when in Pan tool
  useEffect(() => {
    if (stageRef.current) {
      stageRef.current.draggable(activeTool === 'pan');
    }
  }, [activeTool]);

  // 2. Redraw Grid & Model Layers whenever project/floor/selection changes
  useEffect(() => {
    const gridLayer = gridLayerRef.current;
    const modelLayer = modelLayerRef.current;
    if (!gridLayer || !modelLayer) return;

    gridLayer.destroyChildren();
    modelLayer.destroyChildren();

    const pm = PIXELS_PER_METER;
    const layerMap = new Map(project.cad2d.layers.map((l) => [l.id, l]));
    const isLayerVisible = (id?: string) => (id && layerMap.has(id) ? layerMap.get(id)!.visible : true);
    const getLayerStyle = (id?: string) => layerMap.get(id || 'DRAFTING');
    const selectedSet = new Set(selectedItems.map((i) => i.id));

    // A. Paper Space Frame or Model Space Grid
    if (project.cad2d.paperSpace.enabled) {
      const ps = project.cad2d.paperSpace;
      const paperScale = 4; // visual representation in Konva
      const pw = (ps.orientation === 'landscape' ? 297 : 210) * paperScale;
      const ph = (ps.orientation === 'landscape' ? 210 : 297) * paperScale;
      const padX = (project.totalWidth * pm - pw) / 2;
      const padY = (project.totalLength * pm - ph) / 2;

      gridLayer.add(
        new Konva.Rect({
          x: padX,
          y: padY,
          width: pw,
          height: ph,
          fill: '#ffffff',
          stroke: '#0f172a',
          strokeWidth: 2,
          shadowColor: 'rgba(15,23,42,0.2)',
          shadowBlur: 18,
        })
      );
      // ГОСТ frame inner border
      gridLayer.add(
        new Konva.Rect({
          x: padX + 45,
          y: padY + 14,
          width: pw - 58,
          height: ph - 28,
          stroke: '#1e293b',
          strokeWidth: 1.5,
        })
      );
      // ГОСТ Stamp preview box
      gridLayer.add(
        new Konva.Rect({
          x: padX + pw - 420,
          y: padY + ph - 125,
          width: 407,
          height: 111,
          stroke: '#0f172a',
          strokeWidth: 1.4,
          fill: '#f8fafc',
        })
      );
      gridLayer.add(
        new Konva.Text({
          x: padX + pw - 405,
          y: padY + ph - 110,
          text: `${ps.titleBlock.projectCode} · ${ps.titleBlock.projectName}\nСтадия: ${ps.titleBlock.stage} · Лист ${ps.titleBlock.sheetNumber}/${ps.titleBlock.totalSheets} · М ${ps.scale}\n${ps.titleBlock.organization}`,
          fontSize: 12,
          fontFamily: 'monospace',
          fill: '#0f172a',
          lineHeight: 1.45,
        })
      );
    } else if (snapSettings.gridSnap) {
      for (let gx = -10; gx <= project.totalWidth + 10; gx += 1) {
        gridLayer.add(
          new Konva.Line({
            points: [gx * pm, -10 * pm, gx * pm, (project.totalLength + 10) * pm],
            stroke: gx % 5 === 0 ? '#cbd5e1' : '#e2e8f0',
            strokeWidth: gx % 5 === 0 ? 1 : 0.6,
          })
        );
      }
      for (let gy = -10; gy <= project.totalLength + 10; gy += 1) {
        gridLayer.add(
          new Konva.Line({
            points: [-10 * pm, gy * pm, (project.totalWidth + 10) * pm, gy * pm],
            stroke: gy % 5 === 0 ? '#cbd5e1' : '#e2e8f0',
            strokeWidth: gy % 5 === 0 ? 1 : 0.6,
          })
        );
      }
    }

    // B. Rooms
    if (isLayerVisible('ROOMS')) {
      project.rooms
        .filter((r) => r.floorId === floorId)
        .forEach((rm, idx) => {
          modelLayer.add(
            new Konva.Rect({
              x: rm.x * pm,
              y: rm.y * pm,
              width: rm.width * pm,
              height: rm.height * pm,
              fill: rm.color || 'rgba(239,246,255,0.45)',
            })
          );
          modelLayer.add(
            new Konva.Text({
              x: rm.x * pm,
              y: (rm.y + rm.height / 2) * pm - 14,
              width: rm.width * pm,
              align: 'center',
              text: `${idx + 1}. ${rm.name}\n${rm.area.toFixed(1)} м²`,
              fontSize: 11,
              fontStyle: 'bold',
              fill: '#334155',
            })
          );
        });
    }

    // C. Axes
    if (isLayerVisible('AXES')) {
      project.cad2d.axesX.forEach((ax) => {
        const x = ax.position * pm;
        modelLayer.add(
          new Konva.Line({
            points: [x, -1.6 * pm, x, (project.totalLength + 1.2) * pm],
            stroke: '#94a3b8',
            strokeWidth: 1,
            dash: [10, 4, 2, 4],
          })
        );
        modelLayer.add(
          new Konva.Circle({ x, y: -2.0 * pm, radius: 13, stroke: '#475569', strokeWidth: 1.2, fill: '#fff' })
        );
        modelLayer.add(
          new Konva.Text({ x: x - 12, y: -2.0 * pm - 6, width: 24, align: 'center', text: ax.label, fontSize: 11, fontStyle: 'bold', fill: '#0f172a' })
        );
      });
      project.cad2d.axesY.forEach((ay) => {
        const y = ay.position * pm;
        modelLayer.add(
          new Konva.Line({
            points: [-1.6 * pm, y, (project.totalWidth + 1.2) * pm, y],
            stroke: '#94a3b8',
            strokeWidth: 1,
            dash: [10, 4, 2, 4],
          })
        );
        modelLayer.add(
          new Konva.Circle({ x: -2.0 * pm, y, radius: 13, stroke: '#475569', strokeWidth: 1.2, fill: '#fff' })
        );
        modelLayer.add(
          new Konva.Text({ x: -2.0 * pm - 12, y: y - 6, width: 24, align: 'center', text: ay.label, fontSize: 11, fontStyle: 'bold', fill: '#0f172a' })
        );
      });
    }

    // D. Walls (double contours + fill)
    const floorWalls = project.walls.filter((w) => w.floorId === floorId && !w.hidden);
    floorWalls.forEach((w) => {
      const layerId = w.layerId || (w.isExterior ? 'WALLS_EXT' : 'WALLS_INT');
      if (!isLayerVisible(layerId)) return;
      const len = wallLengthMeters(w);
      if (len < 0.05) return;
      const dx = (w.end.x - w.start.x) / len;
      const dy = (w.end.y - w.start.y) / len;
      const nx = (-dy * w.thickness) / 2;
      const ny = (dx * w.thickness) / 2;
      const isSel = selectedSet.has(w.id);

      modelLayer.add(
        new Konva.Line({
          points: [
            (w.start.x + nx) * pm,
            (w.start.y + ny) * pm,
            (w.end.x + nx) * pm,
            (w.end.y + ny) * pm,
            (w.end.x - nx) * pm,
            (w.end.y - ny) * pm,
            (w.start.x - nx) * pm,
            (w.start.y - ny) * pm,
          ],
          closed: true,
          fill: isSel ? '#38bdf8' : w.isExterior ? '#1e293b' : '#475569',
          stroke: isSel ? '#0284c7' : '#0f172a',
          strokeWidth: isSel ? 2.5 : 1.2,
        })
      );
    });

    // E. Openings (Windows & Doors with Swing Arcs)
    if (isLayerVisible('OPENINGS')) {
      project.openings
        .filter((o) => o.floorId === floorId)
        .forEach((op) => {
          const w = floorWalls.find((wl) => wl.id === op.wallId);
          if (!w) return;
          const len = wallLengthMeters(w) || 1;
          const ux = (w.end.x - w.start.x) / len;
          const uy = (w.end.y - w.start.y) / len;
          const angleDeg = (Math.atan2(uy, ux) * 180) / Math.PI;
          const cx = (w.start.x + ux * op.offsetU) * pm;
          const cy = (w.start.y + uy * op.offsetU) * pm;
          const halfOpPx = (op.width * pm) / 2;
          const thickPx = Math.max(8, w.thickness * pm + 2);
          const isSel = selectedSet.has(op.id);

          const g = new Konva.Group({ x: cx, y: cy, rotation: angleDeg });
          // Cutout gap in wall
          g.add(
            new Konva.Rect({
              x: -halfOpPx,
              y: -thickPx / 2,
              width: op.width * pm,
              height: thickPx,
              fill: '#ffffff',
              stroke: isSel ? '#0284c7' : '#64748b',
              strokeWidth: isSel ? 2 : 0.8,
            })
          );

          if (op.type === 'window') {
            g.add(
              new Konva.Line({
                points: [-halfOpPx, 0, halfOpPx, 0],
                stroke: isSel ? '#0284c7' : '#0ea5e9',
                strokeWidth: 3,
              })
            );
          } else {
            const leafPx = op.width * pm;
            const swingOut = op.swingDirection?.endsWith('out') ? -1 : 1;
            const hingeX = op.swingDirection?.startsWith('right') ? halfOpPx : -halfOpPx;
            g.add(
              new Konva.Line({
                points: [hingeX, 0, hingeX, swingOut * leafPx],
                stroke: isSel ? '#0284c7' : '#b45309',
                strokeWidth: 2.5,
              })
            );
            g.add(
              new Konva.Arc({
                x: hingeX,
                y: 0,
                innerRadius: leafPx,
                outerRadius: leafPx,
                angle: 90,
                rotation: hingeX < 0 ? (swingOut > 0 ? 0 : -90) : (swingOut > 0 ? 90 : 180),
                stroke: isSel ? '#0284c7' : '#d97706',
                strokeWidth: 1,
                dash: [4, 4],
              })
            );
          }
          modelLayer.add(g);
        });
    }

    // F. Columns & Stairs
    if (isLayerVisible('COLUMNS')) {
      project.columns
        .filter((c) => c.floorId === floorId)
        .forEach((col) => {
          const isSel = selectedSet.has(col.id);
          modelLayer.add(
            new Konva.Rect({
              x: (col.x - col.width / 2) * pm,
              y: (col.y - col.depth / 2) * pm,
              width: col.width * pm,
              height: col.depth * pm,
              fill: isSel ? '#38bdf8' : '#334155',
              stroke: '#0f172a',
              strokeWidth: 1.5,
            })
          );
        });
    }

    if (isLayerVisible('STAIRS')) {
      project.stairs
        .filter((s) => s.floorId === floorId)
        .forEach((st) => {
          const isSel = selectedSet.has(st.id);
          modelLayer.add(
            new Konva.Rect({
              x: st.x * pm,
              y: st.y * pm,
              width: st.length * pm,
              height: st.width * pm,
              fill: 'rgba(124,58,237,0.08)',
              stroke: isSel ? '#0284c7' : '#7c3aed',
              strokeWidth: isSel ? 2.2 : 1.2,
            })
          );
          const stepRun = st.length / Math.max(2, st.steps);
          for (let i = 1; i < st.steps; i++) {
            modelLayer.add(
              new Konva.Line({
                points: [(st.x + i * stepRun) * pm, st.y * pm, (st.x + i * stepRun) * pm, (st.y + st.width) * pm],
                stroke: '#7c3aed',
                strokeWidth: 0.9,
              })
            );
          }
        });
    }

    // G. 2D CAD Primitives
    project.cad2d.primitives
      .filter((p) => p.floorId === floorId)
      .forEach((p) => {
        if (!isLayerVisible(p.layerId)) return;
        const layerStyle = getLayerStyle(p.layerId);
        const color = selectedSet.has(p.id) ? '#0284c7' : p.color || layerStyle?.color || '#2563eb';
        const dash =
          layerStyle?.lineType === 'DASHED'
            ? [8, 5]
            : layerStyle?.lineType === 'CENTER'
              ? [12, 4, 2, 4]
              : undefined;

        if ((p.kind === 'line' || p.kind === 'polyline') && p.points.length >= 2) {
          modelLayer.add(
            new Konva.Line({
              points: p.points.flatMap((pt) => [pt.x * pm, pt.y * pm]),
              stroke: color,
              strokeWidth: selectedSet.has(p.id) ? 3 : 1.8,
              dash,
            })
          );
        } else if (p.kind === 'rect' && p.points.length >= 2) {
          const [a, b] = p.points;
          modelLayer.add(
            new Konva.Rect({
              x: Math.min(a.x, b.x) * pm,
              y: Math.min(a.y, b.y) * pm,
              width: Math.abs(b.x - a.x) * pm,
              height: Math.abs(b.y - a.y) * pm,
              stroke: color,
              strokeWidth: selectedSet.has(p.id) ? 3 : 1.8,
              dash,
            })
          );
        } else if (p.kind === 'circle' && p.points[0]) {
          modelLayer.add(
            new Konva.Circle({
              x: p.points[0].x * pm,
              y: p.points[0].y * pm,
              radius: (p.radius || 1) * pm,
              stroke: color,
              strokeWidth: selectedSet.has(p.id) ? 3 : 1.8,
              dash,
            })
          );
        } else if (p.kind === 'arc' && p.points[0]) {
          modelLayer.add(
            new Konva.Arc({
              x: p.points[0].x * pm,
              y: p.points[0].y * pm,
              innerRadius: (p.radius || 1) * pm,
              outerRadius: (p.radius || 1) * pm,
              angle: (p.endAngle || 90) - (p.startAngle || 0),
              rotation: p.startAngle || 0,
              stroke: color,
              strokeWidth: 2,
            })
          );
        } else if ((p.kind === 'text' || p.kind === 'callout' || p.kind === 'elevation') && p.points[0]) {
          modelLayer.add(
            new Konva.Text({
              x: p.points[0].x * pm,
              y: p.points[0].y * pm,
              text: p.kind === 'elevation' ? `▼ ${p.text}` : p.text || '',
              fontSize: 12,
              fontFamily: 'monospace',
              fontStyle: 'bold',
              fill: color,
            })
          );
        } else if (p.kind === 'section' && p.points.length >= 2) {
          const [a, b] = p.points;
          modelLayer.add(
            new Konva.Line({
              points: [a.x * pm, a.y * pm, b.x * pm, b.y * pm],
              stroke: '#dc2626',
              strokeWidth: 2.5,
              dash: [14, 5, 3, 5],
            })
          );
        }
      });

    // H. Dimensions
    if (isLayerVisible('DIMENSIONS')) {
      project.cad2d.dimensions
        .filter((d) => d.floorId === floorId)
        .forEach((dim) => {
          const dx = dim.p2.x - dim.p1.x;
          const dy = dim.p2.y - dim.p1.y;
          const len = Math.hypot(dx, dy) || 1;
          const nx = (-dy / len) * dim.offset;
          const ny = (dx / len) * dim.offset;
          const d1x = (dim.p1.x + nx) * pm;
          const d1y = (dim.p1.y + ny) * pm;
          const d2x = (dim.p2.x + nx) * pm;
          const d2y = (dim.p2.y + ny) * pm;
          const isSel = selectedSet.has(dim.id);
          const color = isSel ? '#0284c7' : '#dc2626';

          modelLayer.add(
            new Konva.Line({ points: [dim.p1.x * pm, dim.p1.y * pm, d1x, d1y], stroke: color, strokeWidth: 0.9 })
          );
          modelLayer.add(
            new Konva.Line({ points: [dim.p2.x * pm, dim.p2.y * pm, d2x, d2y], stroke: color, strokeWidth: 0.9 })
          );
          modelLayer.add(
            new Konva.Line({ points: [d1x, d1y, d2x, d2y], stroke: color, strokeWidth: 1.2 })
          );
          modelLayer.add(
            new Konva.Text({
              x: (d1x + d2x) / 2 - 28,
              y: (d1y + d2y) / 2 - 14,
              width: 56,
              align: 'center',
              text: dim.labelOverride || formatUnitNumber(len, project.cad2d.units),
              fontSize: 10,
              fontFamily: 'monospace',
              fontStyle: 'bold',
              fill: color,
            })
          );
        });
    }

    gridLayer.batchDraw();
    modelLayer.batchDraw();
  }, [project, floorId, selectedItems, snapSettings.gridSnap]);

  // 3. Redraw Live Overlay Layer (Draft previews + OSNAP Glyph)
  useEffect(() => {
    const overlay = overlayLayerRef.current;
    if (!overlay) return;
    overlay.destroyChildren();
    const pm = PIXELS_PER_METER;

    // Draft preview geometry
    if (draftPoints.length > 0 && hoverSnap) {
      const last = draftPoints[draftPoints.length - 1];
      const cur = hoverSnap.point;

      if (activeTool === 'rect') {
        overlay.add(
          new Konva.Rect({
            x: Math.min(last.x, cur.x) * pm,
            y: Math.min(last.y, cur.y) * pm,
            width: Math.abs(cur.x - last.x) * pm,
            height: Math.abs(cur.y - last.y) * pm,
            stroke: '#2563eb',
            strokeWidth: 1.8,
            dash: [5, 5],
          })
        );
      } else if (activeTool === 'circle' || activeTool === 'arc') {
        overlay.add(
          new Konva.Circle({
            x: last.x * pm,
            y: last.y * pm,
            radius: dist2D(last, cur) * pm,
            stroke: '#2563eb',
            strokeWidth: 1.8,
            dash: [5, 5],
          })
        );
      } else {
        const pts = [...draftPoints, cur].flatMap((p) => [p.x * pm, p.y * pm]);
        overlay.add(
          new Konva.Line({
            points: pts,
            stroke: '#2563eb',
            strokeWidth: 2,
            dash: [6, 4],
          })
        );
      }

      const len = dist2D(last, cur);
      overlay.add(
        new Konva.Text({
          x: ((last.x + cur.x) / 2) * pm + 6,
          y: ((last.y + cur.y) / 2) * pm - 16,
          text: `${formatUnitNumber(len, project.cad2d.units)}`,
          fontSize: 11,
          fontFamily: 'monospace',
          fontStyle: 'bold',
          fill: '#1d4ed8',
        })
      );
    }

    // Live OSNAP Marker
    if (hoverSnap && hoverSnap.kind && activeTool !== 'pan') {
      const sx = hoverSnap.point.x * pm;
      const sy = hoverSnap.point.y * pm;
      const snapColor =
        hoverSnap.kind === 'endpoint'
          ? '#10b981'
          : hoverSnap.kind === 'midpoint'
            ? '#f59e0b'
            : hoverSnap.kind === 'intersection'
              ? '#ef4444'
              : hoverSnap.kind === 'center'
                ? '#8b5cf6'
                : hoverSnap.kind === 'perpendicular'
                  ? '#06b6d4'
                  : '#64748b';

      if (hoverSnap.kind !== 'grid') {
        overlay.add(
          new Konva.Rect({
            x: sx - 5,
            y: sy - 5,
            width: 10,
            height: 10,
            stroke: snapColor,
            strokeWidth: 2,
          })
        );
        overlay.add(
          new Konva.Text({
            x: sx + 9,
            y: sy - 14,
            text: hoverSnap.kind.toUpperCase().slice(0, 3),
            fontSize: 9,
            fontFamily: 'monospace',
            fontStyle: 'bold',
            fill: snapColor,
          })
        );
      }
    }

    overlay.batchDraw();
  }, [draftPoints, hoverSnap, activeTool, project.cad2d.units]);

  const handleFinishPolyline = () => {
    if (activeTool === 'polyline' && draftPoints.length >= 2) {
      const prim: CadPrimitiveEntity = {
        id: `poly_${Date.now()}`,
        floorId,
        layerId: activeLayerId || 'DRAFTING',
        kind: 'polyline',
        points: draftPoints,
      };
      onUpdateProject(
        (prev) => ({ ...prev, cad2d: { ...prev.cad2d, primitives: [...prev.cad2d.primitives, prim] } }),
        true
      );
      setDraftPoints([]);
    }
  };

  const adjustZoom = (factor: number) => {
    const stage = stageRef.current;
    if (!stage) return;
    const next = Math.max(0.2, Math.min(5, stage.scaleX() * factor));
    stage.scale({ x: next, y: next });
    setZoomPct(Math.round(next * 100));
    stage.batchDraw();
  };

  return (
    <div className="relative w-full h-[590px] bg-slate-100 border border-slate-300 rounded-lg overflow-hidden select-none">
      <div
        ref={containerRef}
        className={`w-full h-full ${
          activeTool === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'
        }`}
      />

      {/* Finish Polyline Floating Button */}
      {activeTool === 'polyline' && draftPoints.length >= 2 && (
        <button
          type="button"
          onClick={handleFinishPolyline}
          className="absolute top-3 left-1/2 -translate-x-1/2 z-20 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded shadow-md"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Завершить полилинию ({draftPoints.length} т.)</span>
        </button>
      )}

      {/* Top-Right Zoom HUD */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-white/95 backdrop-blur-xs border border-slate-300 rounded-md p-1 shadow-xs text-xs font-mono">
        <button
          type="button"
          onClick={() => adjustZoom(0.85)}
          className="p-1 hover:bg-slate-100 rounded text-slate-700"
          title="Отдалить"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="px-1.5 text-[11px] font-bold text-slate-800">{zoomPct}%</span>
        <button
          type="button"
          onClick={() => adjustZoom(1.18)}
          className="p-1 hover:bg-slate-100 rounded text-slate-700"
          title="Приблизить"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={centerStageOnBuilding}
          className="p-1 hover:bg-slate-100 rounded text-slate-700 border-l border-slate-200 pl-1.5"
          title="Вписать план по центру"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
