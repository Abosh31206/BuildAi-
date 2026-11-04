import { CadFloorPlan } from '../types';

export function exportFloorPlanToDxf(plan: CadFloorPlan): string {
  const lines: string[] = [];

  const add = (code: number | string, val: string | number) => {
    lines.push(String(code));
    lines.push(String(val));
  };

  // DXF Header
  add(0, 'SECTION');
  add(2, 'HEADER');
  add(9, '$ACADVER');
  add(1, 'AC1009'); // AutoCAD R12 standard ASCII compatibility
  add(0, 'ENDSEC');

  // TABLES (Layers)
  add(0, 'SECTION');
  add(2, 'TABLES');
  add(0, 'TABLE');
  add(2, 'LAYER');
  add(70, 5);

  const layers = [
    { name: 'WALLS_EXT', color: 7 }, // White/Black
    { name: 'WALLS_INT', color: 8 }, // Gray
    { name: 'DOORS', color: 3 },     // Green
    { name: 'WINDOWS', color: 4 },   // Cyan
    { name: 'DIMENSIONS', color: 1 },// Red
    { name: 'TEXT', color: 2 },      // Yellow
  ];

  for (const l of layers) {
    add(0, 'LAYER');
    add(2, l.name);
    add(70, 0);
    add(62, l.color);
    add(6, 'CONTINUOUS');
  }

  add(0, 'ENDTAB');
  add(0, 'ENDSEC');

  // ENTITIES
  add(0, 'SECTION');
  add(2, 'ENTITIES');

  // Scale: 1 meter = 1000 DXF units (millimeters)
  const toMm = (m: number) => m * 1000;

  // Exterior Boundary Walls
  const w = toMm(plan.totalWidth);
  const l = toMm(plan.totalLength);

  const drawRect = (x1: number, y1: number, x2: number, y2: number, layer: string) => {
    // 4 lines
    const coords = [
      [x1, y1, x2, y1],
      [x2, y1, x2, y2],
      [x2, y2, x1, y2],
      [x1, y2, x1, y1],
    ];
    for (const [sx, sy, ex, ey] of coords) {
      add(0, 'LINE');
      add(8, layer);
      add(10, sx);
      add(20, sy);
      add(30, 0);
      add(11, ex);
      add(21, ey);
      add(31, 0);
    }
  };

  // Outer building boundary
  drawRect(0, 0, w, l, 'WALLS_EXT');

  // Room partitions
  for (const room of plan.rooms) {
    const rx1 = toMm(room.x);
    const ry1 = toMm(room.y);
    const rx2 = toMm(room.x + room.width);
    const ry2 = toMm(room.y + room.height);

    drawRect(rx1, ry1, rx2, ry2, 'WALLS_INT');

    // Room Label
    add(0, 'TEXT');
    add(8, 'TEXT');
    add(10, (rx1 + rx2) / 2 - 400);
    add(20, (ry1 + ry2) / 2 + 100);
    add(30, 0);
    add(40, 250); // Text height
    add(1, `${room.name} (${room.area} m2)`);
  }

  // Openings (Windows and Doors)
  for (const op of plan.openings) {
    const ox = toMm(op.x);
    const oy = toMm(op.y);
    const ow = toMm(op.width);
    const layer = op.type === 'door' ? 'DOORS' : 'WINDOWS';

    if (op.orientation === 'horizontal') {
      add(0, 'LINE');
      add(8, layer);
      add(10, ox);
      add(20, oy);
      add(30, 0);
      add(11, ox + ow);
      add(21, oy);
      add(31, 0);
    } else {
      add(0, 'LINE');
      add(8, layer);
      add(10, ox);
      add(20, oy);
      add(30, 0);
      add(11, ox);
      add(21, oy + ow);
      add(31, 0);
    }
  }

  // End Entities and File
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
