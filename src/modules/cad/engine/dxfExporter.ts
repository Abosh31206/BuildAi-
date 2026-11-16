import { CadFloorPlan } from '../types';
import { UnifiedBuildingProject } from '../../project/types';
import { wallLengthMeters } from '../../project/engine/projectSync';

function colorHexToAci(hex: string): number {
  const c = hex.toLowerCase();
  if (c.includes('dc2626') || c.includes('ef4444')) return 1; // Red
  if (c.includes('f59e0b') || c.includes('eab308')) return 2; // Yellow
  if (c.includes('10b981') || c.includes('0d9488')) return 3; // Green
  if (c.includes('0284c7') || c.includes('38bdf8')) return 4; // Cyan
  if (c.includes('2563eb') || c.includes('1e3a8a')) return 5; // Blue
  if (c.includes('7c3aed')) return 6; // Magenta
  if (c.includes('64748b') || c.includes('475569')) return 8; // Gray
  return 7; // Default white/black
}

export function exportUnifiedFloorToDxf(
  project: UnifiedBuildingProject,
  floorIndex: number = 0
): string {
  const floor = project.floors[floorIndex] || project.floors[0];
  const floorId = floor?.id || 'fl_1';
  const lines: string[] = [];

  const add = (code: number | string, val: string | number) => {
    lines.push(String(code));
    lines.push(String(val));
  };

  // DXF Header
  add(0, 'SECTION');
  add(2, 'HEADER');
  add(9, '$ACADVER');
  add(1, 'AC1009');
  add(9, '$INSUNITS');
  add(70, 4); // Millimeters
  add(0, 'ENDSEC');

  // TABLES (LTYPE + LAYER)
  add(0, 'SECTION');
  add(2, 'TABLES');

  // LTYPE Table
  add(0, 'TABLE');
  add(2, 'LTYPE');
  add(70, 3);
  [
    { name: 'CONTINUOUS', desc: 'Solid line', elems: [] as number[] },
    { name: 'DASHED', desc: 'Dashed __ __ __', elems: [200, -100] },
    { name: 'CENTER', desc: 'Center ____ _ ____', elems: [500, -100, 100, -100] },
  ].forEach((lt) => {
    add(0, 'LTYPE');
    add(2, lt.name);
    add(70, 0);
    add(3, lt.desc);
    add(72, 65);
    add(73, lt.elems.length);
    add(40, lt.elems.reduce((s, v) => s + Math.abs(v), 0));
    lt.elems.forEach((e) => add(49, e));
  });
  add(0, 'ENDTAB');

  // LAYER Table
  add(0, 'TABLE');
  add(2, 'LAYER');
  add(70, project.cad2d.layers.length);
  for (const layer of project.cad2d.layers) {
    add(0, 'LAYER');
    add(2, layer.id);
    add(70, layer.visible ? 0 : 1);
    add(62, colorHexToAci(layer.color));
    add(6, layer.lineType || 'CONTINUOUS');
  }
  add(0, 'ENDTAB');
  add(0, 'ENDSEC');

  // ENTITIES (1 m = 1000 mm, Y flipped so plan reads upright in AutoCAD)
  add(0, 'SECTION');
  add(2, 'ENTITIES');

  const toMm = (m: number) => Number((m * 1000).toFixed(2));
  const mapY = (mY: number) => toMm(project.totalLength - mY);

  const emitLine = (x1: number, y1: number, x2: number, y2: number, layer: string) => {
    add(0, 'LINE');
    add(8, layer);
    add(10, x1);
    add(20, y1);
    add(30, 0);
    add(11, x2);
    add(21, y2);
    add(31, 0);
  };

  const emitCircle = (cx: number, cy: number, r: number, layer: string) => {
    add(0, 'CIRCLE');
    add(8, layer);
    add(10, cx);
    add(20, cy);
    add(30, 0);
    add(40, r);
  };

  const emitArc = (cx: number, cy: number, r: number, startDeg: number, endDeg: number, layer: string) => {
    add(0, 'ARC');
    add(8, layer);
    add(10, cx);
    add(20, cy);
    add(30, 0);
    add(40, r);
    add(50, startDeg);
    add(51, endDeg);
  };

  const emitText = (x: number, y: number, height: number, text: string, layer: string) => {
    add(0, 'TEXT');
    add(8, layer);
    add(10, x);
    add(20, y);
    add(30, 0);
    add(40, height);
    add(1, text);
  };

  // 1. Axes
  for (const ax of project.cad2d.axesX) {
    const x = toMm(ax.position);
    emitLine(x, mapY(-1.8), x, mapY(project.totalLength + 1.4), 'AXES');
    emitCircle(x, mapY(-2.3), 380, 'AXES');
    emitText(x - 110, mapY(-2.3) - 110, 220, ax.label, 'AXES');
  }
  for (const ay of project.cad2d.axesY) {
    const y = mapY(ay.position);
    emitLine(toMm(-1.8), y, toMm(project.totalWidth + 1.4), y, 'AXES');
    emitCircle(toMm(-2.3), y, 380, 'AXES');
    emitText(toMm(-2.3) - 110, y - 110, 220, ay.label, 'AXES');
  }

  // 2. Walls (double contour representation)
  const floorWalls = project.walls.filter((w) => w.floorId === floorId && !w.hidden);
  for (const w of floorWalls) {
    const len = wallLengthMeters(w);
    if (len < 0.05) continue;
    const dx = (w.end.x - w.start.x) / len;
    const dy = (w.end.y - w.start.y) / len;
    const nx = (-dy * w.thickness) / 2;
    const ny = (dx * w.thickness) / 2;
    const layer = w.layerId || (w.isExterior ? 'WALLS_EXT' : 'WALLS_INT');

    const p1x = toMm(w.start.x + nx);
    const p1y = mapY(w.start.y + ny);
    const p2x = toMm(w.end.x + nx);
    const p2y = mapY(w.end.y + ny);
    const p3x = toMm(w.end.x - nx);
    const p3y = mapY(w.end.y - ny);
    const p4x = toMm(w.start.x - nx);
    const p4y = mapY(w.start.y - ny);

    emitLine(p1x, p1y, p2x, p2y, layer);
    emitLine(p2x, p2y, p3x, p3y, layer);
    emitLine(p3x, p3y, p4x, p4y, layer);
    emitLine(p4x, p4y, p1x, p1y, layer);
  }

  // 3. Openings (windows & doors with swing arc)
  const floorOpenings = project.openings.filter((o) => o.floorId === floorId);
  for (const op of floorOpenings) {
    const w = floorWalls.find((wl) => wl.id === op.wallId);
    if (!w) continue;
    const len = wallLengthMeters(w) || 1;
    const ux = (w.end.x - w.start.x) / len;
    const uy = (w.end.y - w.start.y) / len;
    const uStart = op.offsetU - op.width / 2;
    const uEnd = op.offsetU + op.width / 2;
    const sx = toMm(w.start.x + ux * uStart);
    const sy = mapY(w.start.y + uy * uStart);
    const ex = toMm(w.start.x + ux * uEnd);
    const ey = mapY(w.start.y + uy * uEnd);
    const layer = op.layerId || 'OPENINGS';

    if (op.type === 'window') {
      emitLine(sx, sy, ex, ey, layer);
    } else {
      // Door leaf perpendicular + swing arc
      const r = toMm(op.width);
      const baseAngleDeg = (Math.atan2(-uy, ux) * 180) / Math.PI;
      emitLine(sx, sy, sx + r * Math.cos(((baseAngleDeg + 90) * Math.PI) / 180), sy + r * Math.sin(((baseAngleDeg + 90) * Math.PI) / 180), layer);
      emitArc(sx, sy, r, baseAngleDeg, baseAngleDeg + 90, layer);
    }
  }

  // 4. Rooms & Explication tags
  const floorRooms = project.rooms.filter((r) => r.floorId === floorId);
  floorRooms.forEach((rm, idx) => {
    const cx = toMm(rm.x + rm.width / 2);
    const cy = mapY(rm.y + rm.height / 2);
    emitText(cx - 550, cy + 120, 220, `${idx + 1}. ${rm.name}`, 'ROOMS');
    emitText(cx - 350, cy - 180, 200, `${rm.area.toFixed(2)} m2`, 'ROOMS');
  });

  // 5. Columns & Stairs
  for (const col of project.columns.filter((c) => c.floorId === floorId)) {
    const x1 = toMm(col.x - col.width / 2);
    const x2 = toMm(col.x + col.width / 2);
    const y1 = mapY(col.y + col.depth / 2);
    const y2 = mapY(col.y - col.depth / 2);
    emitLine(x1, y1, x2, y1, 'COLUMNS');
    emitLine(x2, y1, x2, y2, 'COLUMNS');
    emitLine(x2, y2, x1, y2, 'COLUMNS');
    emitLine(x1, y2, x1, y1, 'COLUMNS');
  }

  for (const st of project.stairs.filter((s) => s.floorId === floorId)) {
    const stepLen = st.length / Math.max(2, st.steps);
    for (let i = 0; i <= st.steps; i++) {
      const sx = toMm(st.x + i * stepLen);
      emitLine(sx, mapY(st.y), sx, mapY(st.y + st.width), 'STAIRS');
    }
    emitLine(toMm(st.x), mapY(st.y), toMm(st.x + st.length), mapY(st.y), 'STAIRS');
    emitLine(toMm(st.x), mapY(st.y + st.width), toMm(st.x + st.length), mapY(st.y + st.width), 'STAIRS');
  }

  // 6. Custom 2D Primitives
  for (const prim of project.cad2d.primitives.filter((p) => p.floorId === floorId)) {
    const layer = prim.layerId || 'DRAFTING';
    if ((prim.kind === 'line' || prim.kind === 'polyline') && prim.points.length >= 2) {
      for (let i = 0; i < prim.points.length - 1; i++) {
        emitLine(
          toMm(prim.points[i].x),
          mapY(prim.points[i].y),
          toMm(prim.points[i + 1].x),
          mapY(prim.points[i + 1].y),
          layer
        );
      }
    } else if (prim.kind === 'rect' && prim.points.length >= 2) {
      const [a, b] = prim.points;
      emitLine(toMm(a.x), mapY(a.y), toMm(b.x), mapY(a.y), layer);
      emitLine(toMm(b.x), mapY(a.y), toMm(b.x), mapY(b.y), layer);
      emitLine(toMm(b.x), mapY(b.y), toMm(a.x), mapY(b.y), layer);
      emitLine(toMm(a.x), mapY(b.y), toMm(a.x), mapY(a.y), layer);
    } else if (prim.kind === 'circle' && prim.points[0]) {
      emitCircle(toMm(prim.points[0].x), mapY(prim.points[0].y), toMm(prim.radius || 1), layer);
    } else if (prim.kind === 'arc' && prim.points[0]) {
      emitArc(
        toMm(prim.points[0].x),
        mapY(prim.points[0].y),
        toMm(prim.radius || 1),
        prim.startAngle || 0,
        prim.endAngle || 90,
        layer
      );
    } else if ((prim.kind === 'text' || prim.kind === 'callout' || prim.kind === 'elevation') && prim.points[0]) {
      emitText(toMm(prim.points[0].x), mapY(prim.points[0].y), 200, prim.text || '', layer);
    }
  }

  // 7. Dimensions
  for (const dim of project.cad2d.dimensions.filter((d) => d.floorId === floorId)) {
    const dx = dim.p2.x - dim.p1.x;
    const dy = dim.p2.y - dim.p1.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * dim.offset;
    const ny = (dx / len) * dim.offset;
    const d1x = toMm(dim.p1.x + nx);
    const d1y = mapY(dim.p1.y + ny);
    const d2x = toMm(dim.p2.x + nx);
    const d2y = mapY(dim.p2.y + ny);

    emitLine(toMm(dim.p1.x), mapY(dim.p1.y), d1x, d1y, 'DIMENSIONS');
    emitLine(toMm(dim.p2.x), mapY(dim.p2.y), d2x, d2y, 'DIMENSIONS');
    emitLine(d1x, d1y, d2x, d2y, 'DIMENSIONS');
    emitText((d1x + d2x) / 2 - 220, (d1y + d2y) / 2 + 120, 180, dim.labelOverride || `${Math.round(len * 1000)}`, 'DIMENSIONS');
  }

  add(0, 'ENDSEC');
  add(0, 'EOF');

  return lines.join('\n');
}

export function downloadUnifiedDxfFile(
  project: UnifiedBuildingProject,
  floorIndex: number = 0,
  filename?: string
) {
  const content = exportUnifiedFloorToDxf(project, floorIndex);
  const blob = new Blob([content], { type: 'application/dxf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `buildai_cad_floor${floorIndex + 1}_${project.totalWidth}x${project.totalLength}.dxf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Backward-compatible legacy CadFloorPlan exporter preserved
export function exportFloorPlanToDxf(plan: CadFloorPlan): string {
  const lines: string[] = [];
  const add = (code: number | string, val: string | number) => {
    lines.push(String(code));
    lines.push(String(val));
  };
  add(0, 'SECTION');
  add(2, 'HEADER');
  add(9, '$ACADVER');
  add(1, 'AC1009');
  add(0, 'ENDSEC');
  add(0, 'SECTION');
  add(2, 'TABLES');
  add(0, 'TABLE');
  add(2, 'LAYER');
  add(70, 5);
  [
    { name: 'WALLS_EXT', color: 7 },
    { name: 'WALLS_INT', color: 8 },
    { name: 'DOORS', color: 3 },
    { name: 'WINDOWS', color: 4 },
    { name: 'DIMENSIONS', color: 1 },
    { name: 'TEXT', color: 2 },
  ].forEach((l) => {
    add(0, 'LAYER');
    add(2, l.name);
    add(70, 0);
    add(62, l.color);
    add(6, 'CONTINUOUS');
  });
  add(0, 'ENDTAB');
  add(0, 'ENDSEC');
  add(0, 'SECTION');
  add(2, 'ENTITIES');
  const toMm = (m: number) => m * 1000;
  const drawRect = (x1: number, y1: number, x2: number, y2: number, layer: string) => {
    [
      [x1, y1, x2, y1],
      [x2, y1, x2, y2],
      [x2, y2, x1, y2],
      [x1, y2, x1, y1],
    ].forEach(([sx, sy, ex, ey]) => {
      add(0, 'LINE');
      add(8, layer);
      add(10, sx);
      add(20, sy);
      add(30, 0);
      add(11, ex);
      add(21, ey);
      add(31, 0);
    });
  };
  drawRect(0, 0, toMm(plan.totalWidth), toMm(plan.totalLength), 'WALLS_EXT');
  for (const room of plan.rooms) {
    drawRect(toMm(room.x), toMm(room.y), toMm(room.x + room.width), toMm(room.y + room.height), 'WALLS_INT');
    add(0, 'TEXT');
    add(8, 'TEXT');
    add(10, toMm(room.x + room.width / 2) - 400);
    add(20, toMm(room.y + room.height / 2));
    add(30, 0);
    add(40, 250);
    add(1, `${room.name} (${room.area} m2)`);
  }
  add(0, 'ENDSEC');
  add(0, 'EOF');
  return lines.join('\n');
}

export function downloadDxfFile(plan: CadFloorPlan, filename: string = 'plan_buildai_kz.dxf') {
  const content = exportFloorPlanToDxf(plan);
  const blob = new Blob([content], { type: 'application/dxf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
