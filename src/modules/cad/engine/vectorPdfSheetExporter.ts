import { jsPDF } from 'jspdf';
import {
  UnifiedBuildingProject,
  PaperFormat,
  CadScale,
} from '../../project/types';
import { wallLengthMeters } from '../../project/engine/projectSync';

const PAPER_DIMENSIONS_MM: Record<PaperFormat, [number, number]> = {
  A4: [210, 297],
  A3: [297, 420],
  A2: [420, 594],
  A1: [594, 841],
  A0: [841, 1189],
};

function parseScaleDenom(scale: CadScale): number {
  if (scale === '1:50') return 50;
  if (scale === '1:200') return 200;
  return 100;
}

export function exportCadSheetToVectorPdf(
  project: UnifiedBuildingProject,
  floorIndex: number = 0
) {
  const ps = project.cad2d.paperSpace;
  const floor = project.floors[floorIndex] || project.floors[0];
  const floorId = floor?.id || 'fl_1';
  const [shortMm, longMm] = PAPER_DIMENSIONS_MM[ps.format] || PAPER_DIMENSIONS_MM.A3;
  const isLandscape = ps.orientation !== 'portrait';
  const pageW = isLandscape ? longMm : shortMm;
  const pageH = isLandscape ? shortMm : longMm;

  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [pageW, pageH],
  });

  // ГОСТ 21.101 frame margins: left 20mm, top/right/bottom 5mm
  const mL = 20;
  const mT = 5;
  const mR = 5;
  const mB = 5;
  const frameW = pageW - mL - mR;
  const frameH = pageH - mT - mB;

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.6);
  doc.rect(mL, mT, frameW, frameH);

  // ГОСТ 21.101 Form 3 Stamp (185x55 mm bottom right)
  const stampW = Math.min(185, frameW - 10);
  const stampH = 55;
  const stampX = mL + frameW - stampW;
  const stampY = mT + frameH - stampH;

  doc.setFillColor(255, 255, 255);
  doc.rect(stampX, stampY, stampW, stampH, 'FD');
  doc.setLineWidth(0.25);
  doc.line(stampX + 17, stampY, stampX + 17, stampY + stampH);
  doc.line(stampX + 40, stampY, stampX + 40, stampY + stampH);
  doc.line(stampX + 55, stampY, stampX + 55, stampY + stampH);
  doc.line(stampX + 70, stampY, stampX + 70, stampY + stampH);
  if (stampW > 145) {
    doc.line(stampX + 140, stampY, stampX + 140, stampY + stampH);
  }
  for (let i = 1; i <= 6; i++) {
    doc.line(stampX, stampY + i * 8, stampX + 70, stampY + i * 8);
  }
  doc.line(stampX + 70, stampY + 15, stampX + stampW, stampY + 15);
  doc.line(stampX + 70, stampY + 35, stampX + stampW, stampY + 35);

  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text('ГИП', stampX + 2, stampY + 13);
  doc.text(ps.titleBlock.gip || 'Касымов Е. С.', stampX + 19, stampY + 13);
  doc.text('Разраб.', stampX + 2, stampY + 21);
  doc.text(ps.titleBlock.developer || 'Смагулова А. Т.', stampX + 19, stampY + 21);
  doc.text('Пров.', stampX + 2, stampY + 29);
  doc.text(ps.titleBlock.checker || 'BuildAI KZ', stampX + 19, stampY + 29);

  doc.setFontSize(8.5);
  doc.text(ps.titleBlock.projectCode || project.projectCode, stampX + 74, stampY + 9);
  doc.setFontSize(7.5);
  doc.text((ps.titleBlock.projectName || project.name).slice(0, 36), stampX + 74, stampY + 22);
  doc.text(`${floor?.name || 'План 1-го этажа'} (${ps.scale})`, stampX + 74, stampY + 30);
  doc.text(ps.titleBlock.organization || 'ТОО "BuildAI KZ Engineering"', stampX + 74, stampY + 48);

  if (stampW > 160) {
    doc.setFontSize(6.5);
    doc.text('Стадия', stampX + 143, stampY + 19);
    doc.text('Лист', stampX + 159, stampY + 19);
    doc.text('Листов', stampX + 172, stampY + 19);
    doc.setFontSize(8);
    doc.text(ps.titleBlock.stage || project.stage, stampX + 146, stampY + 31);
    doc.text(String(ps.titleBlock.sheetNumber || 1), stampX + 161, stampY + 31);
    doc.text(String(ps.titleBlock.totalSheets || 4), stampX + 175, stampY + 31);
  }

  // Title inside sheet
  doc.setFontSize(11);
  doc.text(
    `${(floor?.name || 'План этажа').toUpperCase()} — М ${ps.scale} (${ps.format})`,
    mL + 8,
    mT + 10
  );

  // Compute exact paper millimeter scale or fit cleanly inside drawing viewport
  const drawAreaW = frameW - 35;
  const drawAreaH = frameH - 68;
  const denom = parseScaleDenom(ps.scale);
  let mmPerMeter = 1000 / denom; // e.g., 1:100 => 10 mm per meter
  // Clamp if building exceeds chosen paper format at exact scale
  const fitFactor = Math.min(
    (drawAreaW - 30) / Math.max(1, project.totalWidth),
    (drawAreaH - 25) / Math.max(1, project.totalLength)
  );
  if (mmPerMeter > fitFactor) {
    mmPerMeter = fitFactor;
  }

  const originX = mL + 28 + (drawAreaW - 28 - project.totalWidth * mmPerMeter) / 2;
  const originY = mT + 20 + (drawAreaH - 20 - project.totalLength * mmPerMeter) / 2;
  const px = (m: number) => originX + m * mmPerMeter;
  const py = (m: number) => originY + m * mmPerMeter;

  // 1. Axes
  const layerMap = new Map(project.cad2d.layers.map((l) => [l.id, l]));
  const isLayerVisible = (id?: string) => (id && layerMap.has(id) ? layerMap.get(id)!.visible : true);

  if (isLayerVisible('AXES')) {
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.18);
    for (const ax of project.cad2d.axesX) {
      const x = px(ax.position);
      doc.line(x, py(-1.2), x, py(project.totalLength + 1.0));
      doc.circle(x, py(-1.6), 2.8);
      doc.setFontSize(6.5);
      doc.text(ax.label, x - 1, py(-1.6) + 1);
    }
    for (const ay of project.cad2d.axesY) {
      const y = py(ay.position);
      doc.line(px(-1.2), y, px(project.totalWidth + 1.0), y);
      doc.circle(px(-1.6), y, 2.8);
      doc.setFontSize(6.5);
      doc.text(ay.label, px(-1.6) - 1, y + 1);
    }
  }

  // 2. Rooms labels
  if (isLayerVisible('ROOMS')) {
    project.rooms
      .filter((r) => r.floorId === floorId)
      .forEach((rm, idx) => {
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(7);
        const cx = px(rm.x + rm.width / 2);
        const cy = py(rm.y + rm.height / 2);
        doc.text(`${idx + 1}. ${rm.name}`, cx, cy - 1, { align: 'center' });
        doc.setFontSize(6.5);
        doc.text(`${rm.area.toFixed(1)} м²`, cx, cy + 2.5, { align: 'center' });
      });
  }

  // 3. Walls (true vector polygons)
  const floorWalls = project.walls.filter((w) => w.floorId === floorId && !w.hidden);
  for (const w of floorWalls) {
    if (!isLayerVisible(w.layerId || (w.isExterior ? 'WALLS_EXT' : 'WALLS_INT'))) continue;
    const len = wallLengthMeters(w);
    if (len < 0.05) continue;
    const dx = (w.end.x - w.start.x) / len;
    const dy = (w.end.y - w.start.y) / len;
    const nx = (-dy * w.thickness) / 2;
    const ny = (dx * w.thickness) / 2;
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(w.isExterior ? 0.45 : 0.25);
    doc.line(px(w.start.x + nx), py(w.start.y + ny), px(w.end.x + nx), py(w.end.y + ny));
    doc.line(px(w.end.x + nx), py(w.end.y + ny), px(w.end.x - nx), py(w.end.y - ny));
    doc.line(px(w.end.x - nx), py(w.end.y - ny), px(w.start.x - nx), py(w.start.y - ny));
    doc.line(px(w.start.x - nx), py(w.start.y - ny), px(w.start.x + nx), py(w.start.y + ny));
  }

  // 4. Openings
  if (isLayerVisible('OPENINGS')) {
    for (const op of project.openings.filter((o) => o.floorId === floorId)) {
      const w = floorWalls.find((wl) => wl.id === op.wallId);
      if (!w) continue;
      const len = wallLengthMeters(w) || 1;
      const ux = (w.end.x - w.start.x) / len;
      const uy = (w.end.y - w.start.y) / len;
      const sx = px(w.start.x + ux * (op.offsetU - op.width / 2));
      const sy = py(w.start.y + uy * (op.offsetU - op.width / 2));
      const ex = px(w.start.x + ux * (op.offsetU + op.width / 2));
      const ey = py(w.start.y + uy * (op.offsetU + op.width / 2));

      if (op.type === 'window') {
        doc.setDrawColor(2, 132, 199);
        doc.setLineWidth(0.35);
        doc.line(sx, sy, ex, ey);
      } else {
        doc.setDrawColor(180, 83, 9);
        doc.setLineWidth(0.3);
        const nx = -uy * op.width * mmPerMeter;
        const ny = ux * op.width * mmPerMeter;
        doc.line(sx, sy, sx + nx, sy + ny);
      }
    }
  }

  // 5. Dimensions
  if (isLayerVisible('DIMENSIONS')) {
    doc.setDrawColor(220, 38, 38);
    doc.setTextColor(185, 28, 28);
    doc.setLineWidth(0.18);
    for (const dim of project.cad2d.dimensions.filter((d) => d.floorId === floorId)) {
      const dx = dim.p2.x - dim.p1.x;
      const dy = dim.p2.y - dim.p1.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = (-dy / len) * dim.offset;
      const ny = (dx / len) * dim.offset;
      const d1x = px(dim.p1.x + nx);
      const d1y = py(dim.p1.y + ny);
      const d2x = px(dim.p2.x + nx);
      const d2y = py(dim.p2.y + ny);
      doc.line(px(dim.p1.x), py(dim.p1.y), d1x, d1y);
      doc.line(px(dim.p2.x), py(dim.p2.y), d2x, d2y);
      doc.line(d1x, d1y, d2x, d2y);
      doc.setFontSize(6);
      doc.text(
        dim.labelOverride || `${Math.round(len * 1000)}`,
        (d1x + d2x) / 2,
        (d1y + d2y) / 2 - 1,
        { align: 'center' }
      );
    }
  }

  // 6. Custom 2D primitives
  for (const prim of project.cad2d.primitives.filter((p) => p.floorId === floorId)) {
    if (!isLayerVisible(prim.layerId)) continue;
    doc.setDrawColor(30, 64, 175);
    doc.setLineWidth(0.25);
    if ((prim.kind === 'line' || prim.kind === 'polyline') && prim.points.length >= 2) {
      for (let i = 0; i < prim.points.length - 1; i++) {
        doc.line(px(prim.points[i].x), py(prim.points[i].y), px(prim.points[i + 1].x), py(prim.points[i + 1].y));
      }
    } else if (prim.kind === 'rect' && prim.points.length >= 2) {
      const [a, b] = prim.points;
      const rx = Math.min(px(a.x), px(b.x));
      const ry = Math.min(py(a.y), py(b.y));
      doc.rect(rx, ry, Math.abs(px(b.x) - px(a.x)), Math.abs(py(b.y) - py(a.y)));
    } else if (prim.kind === 'circle' && prim.points[0]) {
      doc.circle(px(prim.points[0].x), py(prim.points[0].y), (prim.radius || 1) * mmPerMeter);
    } else if ((prim.kind === 'text' || prim.kind === 'callout' || prim.kind === 'elevation') && prim.points[0]) {
      doc.setFontSize(7);
      doc.setTextColor(15, 23, 42);
      doc.text(prim.text || '', px(prim.points[0].x), py(prim.points[0].y));
    }
  }

  doc.save(`buildai_cad_${ps.format}_floor${floorIndex + 1}.pdf`);
}
