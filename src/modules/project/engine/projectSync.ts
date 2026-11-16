import {
  UnifiedBuildingProject,
  ProjectWall,
  ProjectOpening,
  ProjectFloor,
  ProjectRoom,
  CadLayer,
  GeometryIssue,
  Building3dSpec,
  CadFloorPlan,
} from '../types';

export const DEFAULT_CAD_LAYERS: CadLayer[] = [
  { id: 'WALLS_EXT', name: 'Стены наружные', color: '#0f172a', visible: true, locked: false, lineWeight: 0.5, lineType: 'CONTINUOUS', isSystem: true },
  { id: 'WALLS_INT', name: 'Перегородки', color: '#334155', visible: true, locked: false, lineWeight: 0.3, lineType: 'CONTINUOUS', isSystem: true },
  { id: 'OPENINGS', name: 'Окна и двери', color: '#0284c7', visible: true, locked: false, lineWeight: 0.25, lineType: 'CONTINUOUS', isSystem: true },
  { id: 'AXES', name: 'Разбивочные оси', color: '#64748b', visible: true, locked: false, lineWeight: 0.18, lineType: 'CENTER', isSystem: true },
  { id: 'DIMENSIONS', name: 'Размеры', color: '#dc2626', visible: true, locked: false, lineWeight: 0.18, lineType: 'CONTINUOUS', isSystem: true },
  { id: 'ANNOTATIONS', name: 'Выноски и отметки', color: '#1e3a8a', visible: true, locked: false, lineWeight: 0.2, lineType: 'CONTINUOUS', isSystem: true },
  { id: 'ROOMS', name: 'Помещения', color: '#0d9488', visible: true, locked: false, lineWeight: 0.18, lineType: 'CONTINUOUS', isSystem: true },
  { id: 'COLUMNS', name: 'Колонны', color: '#475569', visible: true, locked: false, lineWeight: 0.4, lineType: 'CONTINUOUS', isSystem: true },
  { id: 'STAIRS', name: 'Лестницы', color: '#7c3aed', visible: true, locked: false, lineWeight: 0.25, lineType: 'CONTINUOUS', isSystem: true },
  { id: 'DRAFTING', name: 'Рабочая графика', color: '#2563eb', visible: true, locked: false, lineWeight: 0.25, lineType: 'CONTINUOUS', isSystem: true },
];

export function wallLengthMeters(w: ProjectWall): number {
  return Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y);
}

export function createDefaultUnifiedProject(): UnifiedBuildingProject {
  const W = 12.0;
  const L = 10.0;
  const H = 3.0;
  const wallExt = 0.38;
  const wallInt = 0.12;

  const floors: ProjectFloor[] = [
    { id: 'fl_1', index: 0, name: '1-й этаж (+0.000)', elevation: 0, height: H, slabThickness: 0.22, showSlab: true, showWalls: true },
    { id: 'fl_2', index: 1, name: '2-й этаж (+3.000)', elevation: H, height: H, slabThickness: 0.22, showSlab: true, showWalls: true },
  ];

  const makeFloorWalls = (floorId: string): ProjectWall[] => [
    // Exterior walls
    { id: `${floorId}_w_north`, floorId, start: { x: 0, y: 0 }, end: { x: W, y: 0 }, thickness: wallExt, height: H, isExterior: true, finish: 'brick_red', layerId: 'WALLS_EXT' },
    { id: `${floorId}_w_east`, floorId, start: { x: W, y: 0 }, end: { x: W, y: L }, thickness: wallExt, height: H, isExterior: true, finish: 'brick_red', layerId: 'WALLS_EXT' },
    { id: `${floorId}_w_south`, floorId, start: { x: W, y: L }, end: { x: 0, y: L }, thickness: wallExt, height: H, isExterior: true, finish: 'brick_red', layerId: 'WALLS_EXT' },
    { id: `${floorId}_w_west`, floorId, start: { x: 0, y: L }, end: { x: 0, y: 0 }, thickness: wallExt, height: H, isExterior: true, finish: 'brick_red', layerId: 'WALLS_EXT' },
    // Interior partition walls
    { id: `${floorId}_w_mid_v`, floorId, start: { x: 6.0, y: 0 }, end: { x: 6.0, y: L }, thickness: wallInt, height: H, isExterior: false, finish: 'stucco_white', layerId: 'WALLS_INT' },
    { id: `${floorId}_w_mid_h1`, floorId, start: { x: 0, y: 5.5 }, end: { x: 6.0, y: 5.5 }, thickness: wallInt, height: H, isExterior: false, finish: 'stucco_white', layerId: 'WALLS_INT' },
    { id: `${floorId}_w_mid_h2`, floorId, start: { x: 6.0, y: 4.5 }, end: { x: W, y: 4.5 }, thickness: wallInt, height: H, isExterior: false, finish: 'stucco_white', layerId: 'WALLS_INT' },
  ];

  const walls: ProjectWall[] = [...makeFloorWalls('fl_1'), ...makeFloorWalls('fl_2')];

  const openings: ProjectOpening[] = [
    // Floor 1 Windows
    { id: 'op_1_win1', floorId: 'fl_1', wallId: 'fl_1_w_north', type: 'window', windowSubtype: 'double', offsetU: 3.0, width: 1.8, height: 1.5, sillHeight: 0.9, layerId: 'OPENINGS' },
    { id: 'op_1_win2', floorId: 'fl_1', wallId: 'fl_1_w_north', type: 'window', windowSubtype: 'panoramic', offsetU: 9.0, width: 2.6, height: 2.1, sillHeight: 0.25, layerId: 'OPENINGS' },
    { id: 'op_1_win3', floorId: 'fl_1', wallId: 'fl_1_w_east', type: 'window', windowSubtype: 'triple', offsetU: 7.2, width: 2.1, height: 1.5, sillHeight: 0.9, layerId: 'OPENINGS' },
    { id: 'op_1_win4', floorId: 'fl_1', wallId: 'fl_1_w_west', type: 'window', windowSubtype: 'double', offsetU: 6.8, width: 1.6, height: 1.5, sillHeight: 0.9, layerId: 'OPENINGS' },
    // Floor 1 Entrance & Interior Doors
    { id: 'op_1_door_ent', floorId: 'fl_1', wallId: 'fl_1_w_south', type: 'door', doorSubtype: 'entrance', offsetU: 9.0, width: 1.1, height: 2.15, sillHeight: 0, swingDirection: 'left-in', layerId: 'OPENINGS' },
    { id: 'op_1_door_int1', floorId: 'fl_1', wallId: 'fl_1_w_mid_h1', type: 'door', doorSubtype: 'interior', offsetU: 3.2, width: 0.9, height: 2.1, sillHeight: 0, swingDirection: 'right-in', layerId: 'OPENINGS' },
    { id: 'op_1_door_int2', floorId: 'fl_1', wallId: 'fl_1_w_mid_v', type: 'door', doorSubtype: 'interior', offsetU: 2.6, width: 0.9, height: 2.1, sillHeight: 0, swingDirection: 'left-in', layerId: 'OPENINGS' },
    { id: 'op_1_door_int3', floorId: 'fl_1', wallId: 'fl_1_w_mid_h2', type: 'door', doorSubtype: 'interior', offsetU: 2.0, width: 0.85, height: 2.1, sillHeight: 0, swingDirection: 'left-in', layerId: 'OPENINGS' },
    // Floor 2 Windows & Interior Doors
    { id: 'op_2_win1', floorId: 'fl_2', wallId: 'fl_2_w_north', type: 'window', windowSubtype: 'double', offsetU: 3.0, width: 1.8, height: 1.5, sillHeight: 0.9, layerId: 'OPENINGS' },
    { id: 'op_2_win2', floorId: 'fl_2', wallId: 'fl_2_w_north', type: 'window', windowSubtype: 'double', offsetU: 9.0, width: 1.8, height: 1.5, sillHeight: 0.9, layerId: 'OPENINGS' },
    { id: 'op_2_win3', floorId: 'fl_2', wallId: 'fl_2_w_south', type: 'window', windowSubtype: 'triple', offsetU: 3.2, width: 2.1, height: 1.5, sillHeight: 0.9, layerId: 'OPENINGS' },
    { id: 'op_2_win4', floorId: 'fl_2', wallId: 'fl_2_w_south', type: 'window', windowSubtype: 'single', offsetU: 9.0, width: 1.0, height: 1.4, sillHeight: 1.0, layerId: 'OPENINGS' },
    { id: 'op_2_door_int1', floorId: 'fl_2', wallId: 'fl_2_w_mid_v', type: 'door', doorSubtype: 'interior', offsetU: 7.2, width: 0.9, height: 2.1, sillHeight: 0, swingDirection: 'left-in', layerId: 'OPENINGS' },
    { id: 'op_2_door_int2', floorId: 'fl_2', wallId: 'fl_2_w_mid_h1', type: 'door', doorSubtype: 'interior', offsetU: 3.0, width: 0.9, height: 2.1, sillHeight: 0, swingDirection: 'right-in', layerId: 'OPENINGS' },
  ];

  const rooms: ProjectRoom[] = [
    { id: 'rm_1_1', floorId: 'fl_1', name: 'Гостиная', x: 0, y: 0, width: 6.0, height: 5.5, area: 33.0, category: 'living', color: 'rgba(239, 246, 255, 0.55)' },
    { id: 'rm_1_2', floorId: 'fl_1', name: 'Кухня-столовая', x: 6.0, y: 0, width: 6.0, height: 4.5, area: 27.0, category: 'auxiliary', color: 'rgba(254, 243, 199, 0.5)' },
    { id: 'rm_1_3', floorId: 'fl_1', name: 'Холл / Тамбур', x: 0, y: 5.5, width: 6.0, height: 4.5, area: 27.0, category: 'hall', color: 'rgba(241, 245, 249, 0.55)' },
    { id: 'rm_1_4', floorId: 'fl_1', name: 'Спальня / Кабинет', x: 6.0, y: 4.5, width: 6.0, height: 5.5, area: 33.0, category: 'living', color: 'rgba(236, 253, 245, 0.55)' },
    { id: 'rm_2_1', floorId: 'fl_2', name: 'Спальня 1 (Мастер)', x: 0, y: 0, width: 6.0, height: 5.5, area: 33.0, category: 'living', color: 'rgba(239, 246, 255, 0.55)' },
    { id: 'rm_2_2', floorId: 'fl_2', name: 'Спальня 2', x: 6.0, y: 0, width: 6.0, height: 4.5, area: 27.0, category: 'living', color: 'rgba(236, 253, 245, 0.55)' },
    { id: 'rm_2_3', floorId: 'fl_2', name: 'Холл 2-го этажа', x: 0, y: 5.5, width: 6.0, height: 4.5, area: 27.0, category: 'hall', color: 'rgba(241, 245, 249, 0.55)' },
    { id: 'rm_2_4', floorId: 'fl_2', name: 'Спальня 3 / Гардероб', x: 6.0, y: 4.5, width: 6.0, height: 5.5, area: 33.0, category: 'living', color: 'rgba(254, 243, 199, 0.5)' },
  ];

  return {
    id: 'proj_default_buildai',
    schemaVersion: 1,
    name: 'Двухэтажный кирпичный жилой дом',
    projectCode: 'KZ-2025/АР-084',
    city: 'Астана',
    stage: 'АР',
    totalWidth: W,
    totalLength: L,
    conceptualStatus: 'CONCEPTUAL_MODEL',
    floors,
    walls,
    openings,
    rooms,
    columns: [
      { id: 'col_1', floorId: 'fl_1', x: 6.0, y: 4.5, width: 0.4, depth: 0.4, layerId: 'COLUMNS' },
    ],
    stairs: [
      { id: 'st_1', floorId: 'fl_1', x: 0.8, y: 6.2, width: 1.2, length: 3.0, steps: 15, direction: 'right', layerId: 'STAIRS' },
    ],
    roof: {
      type: 'gable',
      height: 2.8,
      overhang: 0.6,
      finish: 'metal_tile_dark',
    },
    cad2d: {
      units: 'mm',
      scale: '1:100',
      layers: DEFAULT_CAD_LAYERS,
      primitives: [],
      dimensions: [
        { id: 'dim_x1', floorId: 'fl_1', layerId: 'DIMENSIONS', kind: 'axis', p1: { x: 0, y: 0 }, p2: { x: 6.0, y: 0 }, offset: -1.1 },
        { id: 'dim_x2', floorId: 'fl_1', layerId: 'DIMENSIONS', kind: 'axis', p1: { x: 6.0, y: 0 }, p2: { x: 12.0, y: 0 }, offset: -1.1 },
        { id: 'dim_xtot', floorId: 'fl_1', layerId: 'DIMENSIONS', kind: 'linear', p1: { x: 0, y: 0 }, p2: { x: 12.0, y: 0 }, offset: -1.8 },
        { id: 'dim_y1', floorId: 'fl_1', layerId: 'DIMENSIONS', kind: 'axis', p1: { x: 0, y: 0 }, p2: { x: 0, y: 5.5 }, offset: -1.1 },
        { id: 'dim_y2', floorId: 'fl_1', layerId: 'DIMENSIONS', kind: 'axis', p1: { x: 0, y: 5.5 }, p2: { x: 0, y: 10.0 }, offset: -1.1 },
        { id: 'dim_ytot', floorId: 'fl_1', layerId: 'DIMENSIONS', kind: 'linear', p1: { x: 0, y: 0 }, p2: { x: 0, y: 10.0 }, offset: -1.8 },
      ],
      axesX: [
        { id: 'ax_1', label: '1', orientation: 'x', position: 0 },
        { id: 'ax_2', label: '2', orientation: 'x', position: 6.0 },
        { id: 'ax_3', label: '3', orientation: 'x', position: 12.0 },
      ],
      axesY: [
        { id: 'ay_A', label: 'А', orientation: 'y', position: 0 },
        { id: 'ay_B', label: 'Б', orientation: 'y', position: 5.5 },
        { id: 'ay_V', label: 'В', orientation: 'y', position: 10.0 },
      ],
      paperSpace: {
        enabled: false,
        format: 'A3',
        orientation: 'landscape',
        scale: '1:100',
        titleBlock: {
          projectName: 'Индивидуальный двухэтажный жилой дом',
          projectCode: 'KZ-2025/АР-084',
          stage: 'АР',
          developer: 'Смагулова А. Т.',
          checker: 'BuildAI KZ',
          gip: 'Касымов Е. С.',
          organization: 'ТОО "BuildAI KZ Engineering"',
          sheetNumber: 1,
          totalSheets: 4,
          dateStr: new Date().toLocaleDateString('ru-RU'),
        },
      },
    },
    linkedStandards: ['СП РК 5.03-107-2013', 'СП РК 5.01-102-2013', 'СП РК 2.03-30-2017', 'ГОСТ 21.101-2020'],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Validates geometric integrity, boundary checks, and opening collisions on every wall.
 */
export function validateProjectGeometry(project: UnifiedBuildingProject): GeometryIssue[] {
  const issues: GeometryIssue[] = [];

  for (const wall of project.walls) {
    const len = wallLengthMeters(wall);
    if (len < 0.4) {
      issues.push({
        id: `issue_wall_len_${wall.id}`,
        severity: 'error',
        entityId: wall.id,
        messageRu: `Стена ${wall.id} короче допустимого минимума 0.4 м (${len.toFixed(2)} м).`,
        messageKk: `${wall.id} қабырғасы 0.4 м минимумнан қысқа (${len.toFixed(2)} м).`,
      });
      continue;
    }

    const wallOpenings = project.openings
      .filter((o) => o.wallId === wall.id)
      .sort((a, b) => a.offsetU - b.offsetU);

    const minCornerMargin = 0.25;
    for (let i = 0; i < wallOpenings.length; i++) {
      const op = wallOpenings[i];
      const halfW = op.width / 2;
      const startU = op.offsetU - halfW;
      const endU = op.offsetU + halfW;

      if (startU < minCornerMargin || endU > len - minCornerMargin) {
        issues.push({
          id: `issue_bounds_${op.id}`,
          severity: 'warning',
          entityId: op.id,
          messageRu: `${op.type === 'window' ? 'Окно' : 'Дверь'} выходит за безопасный отступ стены (${minCornerMargin} м от края).`,
          messageKk: `${op.type === 'window' ? 'Терезе' : 'Есік'} қабырға жиегінен тыс шығып тұр.`,
        });
      }

      if (op.sillHeight + op.height > wall.height - 0.15) {
        issues.push({
          id: `issue_height_${op.id}`,
          severity: 'error',
          entityId: op.id,
          messageRu: `Высота проёма с подоконником (${(op.sillHeight + op.height).toFixed(2)} м) превышает высоту стены (${wall.height.toFixed(2)} м).`,
          messageKk: `Ойық биіктігі қабырға биіктігінен асып кетті.`,
        });
      }

      if (i > 0) {
        const prev = wallOpenings[i - 1];
        const prevEnd = prev.offsetU + prev.width / 2;
        if (startU < prevEnd + 0.12) {
          issues.push({
            id: `issue_overlap_${op.id}`,
            severity: 'error',
            entityId: op.id,
            messageRu: `Обнаружено пересечение проёмов на стене (зазор менее 120 мм).`,
            messageKk: `Бір қабырғадағы ойықтар қиылысып тұр (аралық 120 мм-ден аз).`,
          });
        }
      }
    }
  }

  return issues;
}

/**
 * Converts a legacy or AI-generated Building3dSpec into an updated UnifiedBuildingProject,
 * regenerating exterior walls & openings proportionally while keeping project metadata.
 */
export function applyBuilding3dSpecToProject(
  spec: Building3dSpec,
  base: UnifiedBuildingProject
): UnifiedBuildingProject {
  const W = Math.max(4, Math.min(40, spec.width || base.totalWidth));
  const L = Math.max(4, Math.min(40, spec.length || base.totalLength));
  const H = Math.max(2.4, Math.min(6, spec.floorHeight || 3.0));
  const T = Math.max(0.15, Math.min(0.8, spec.wallThickness || 0.38));
  const floorsCount = Math.max(1, Math.min(5, spec.floors || 1));

  const floors: ProjectFloor[] = Array.from({ length: floorsCount }, (_, idx) => ({
    id: `fl_${idx + 1}`,
    index: idx,
    name: `${idx + 1}-й этаж (+${(idx * H).toFixed(3)})`,
    elevation: idx * H,
    height: H,
    slabThickness: 0.22,
    showSlab: true,
    showWalls: true,
  }));

  const walls: ProjectWall[] = [];
  const openings: ProjectOpening[] = [];
  const rooms: ProjectRoom[] = [];
  const winCount = Math.max(1, Math.min(6, spec.windowsPerSide || 3));

  floors.forEach((fl) => {
    const wNorth: ProjectWall = { id: `${fl.id}_w_north`, floorId: fl.id, start: { x: 0, y: 0 }, end: { x: W, y: 0 }, thickness: T, height: H, isExterior: true, finish: spec.wallFinish, layerId: 'WALLS_EXT' };
    const wEast: ProjectWall = { id: `${fl.id}_w_east`, floorId: fl.id, start: { x: W, y: 0 }, end: { x: W, y: L }, thickness: T, height: H, isExterior: true, finish: spec.wallFinish, layerId: 'WALLS_EXT' };
    const wSouth: ProjectWall = { id: `${fl.id}_w_south`, floorId: fl.id, start: { x: W, y: L }, end: { x: 0, y: L }, thickness: T, height: H, isExterior: true, finish: spec.wallFinish, layerId: 'WALLS_EXT' };
    const wWest: ProjectWall = { id: `${fl.id}_w_west`, floorId: fl.id, start: { x: 0, y: L }, end: { x: 0, y: 0 }, thickness: T, height: H, isExterior: true, finish: spec.wallFinish, layerId: 'WALLS_EXT' };
    const wMidV: ProjectWall = { id: `${fl.id}_w_mid_v`, floorId: fl.id, start: { x: W / 2, y: 0 }, end: { x: W / 2, y: L }, thickness: 0.12, height: H, isExterior: false, finish: 'stucco_white', layerId: 'WALLS_INT' };
    const wMidH: ProjectWall = { id: `${fl.id}_w_mid_h`, floorId: fl.id, start: { x: 0, y: L / 2 }, end: { x: W, y: L / 2 }, thickness: 0.12, height: H, isExterior: false, finish: 'stucco_white', layerId: 'WALLS_INT' };

    walls.push(wNorth, wEast, wSouth, wWest, wMidV, wMidH);

    // Distribute windows evenly on north & south walls
    const stepX = W / (winCount + 1);
    for (let i = 1; i <= winCount; i++) {
      const u = stepX * i;
      openings.push({
        id: `op_${fl.id}_n_${i}`,
        floorId: fl.id,
        wallId: wNorth.id,
        type: 'window',
        windowSubtype: 'double',
        offsetU: u,
        width: Math.min(1.5, stepX * 0.65),
        height: 1.45,
        sillHeight: 0.9,
        layerId: 'OPENINGS',
      });

      if (fl.index === 0 && i === Math.ceil(winCount / 2)) {
        openings.push({
          id: `op_${fl.id}_ent`,
          floorId: fl.id,
          wallId: wSouth.id,
          type: 'door',
          doorSubtype: 'entrance',
          offsetU: u,
          width: 1.1,
          height: 2.15,
          sillHeight: 0,
          swingDirection: 'left-in',
          layerId: 'OPENINGS',
        });
      } else {
        openings.push({
          id: `op_${fl.id}_s_${i}`,
          floorId: fl.id,
          wallId: wSouth.id,
          type: 'window',
          windowSubtype: 'double',
          offsetU: u,
          width: Math.min(1.5, stepX * 0.65),
          height: 1.45,
          sillHeight: 0.9,
          layerId: 'OPENINGS',
        });
      }
    }

    // Interior doors
    openings.push(
      { id: `op_${fl.id}_int1`, floorId: fl.id, wallId: wMidV.id, type: 'door', doorSubtype: 'interior', offsetU: L * 0.25, width: 0.9, height: 2.1, sillHeight: 0, swingDirection: 'left-in', layerId: 'OPENINGS' },
      { id: `op_${fl.id}_int2`, floorId: fl.id, wallId: wMidH.id, type: 'door', doorSubtype: 'interior', offsetU: W * 0.25, width: 0.9, height: 2.1, sillHeight: 0, swingDirection: 'right-in', layerId: 'OPENINGS' }
    );

    // Quadrant rooms
    const halfW = Number((W / 2).toFixed(2));
    const halfL = Number((L / 2).toFixed(2));
    const qArea = Number((halfW * halfL).toFixed(1));
    rooms.push(
      { id: `rm_${fl.id}_1`, floorId: fl.id, name: fl.index === 0 ? 'Гостиная' : 'Спальня 1', x: 0, y: 0, width: halfW, height: halfL, area: qArea, category: 'living', color: 'rgba(239, 246, 255, 0.55)' },
      { id: `rm_${fl.id}_2`, floorId: fl.id, name: fl.index === 0 ? 'Кухня-столовая' : 'Спальня 2', x: halfW, y: 0, width: halfW, height: halfL, area: qArea, category: 'auxiliary', color: 'rgba(254, 243, 199, 0.5)' },
      { id: `rm_${fl.id}_3`, floorId: fl.id, name: 'Холл', x: 0, y: halfL, width: halfW, height: halfL, area: qArea, category: 'hall', color: 'rgba(241, 245, 249, 0.55)' },
      { id: `rm_${fl.id}_4`, floorId: fl.id, name: fl.index === 0 ? 'Кабинет' : 'Спальня 3', x: halfW, y: halfL, width: halfW, height: halfL, area: qArea, category: 'living', color: 'rgba(236, 253, 245, 0.55)' }
    );
  });

  return {
    ...base,
    name: spec.name || base.name,
    totalWidth: W,
    totalLength: L,
    floors,
    walls,
    openings,
    rooms,
    roof: {
      type: spec.roofType,
      height: spec.roofHeight || (spec.roofType === 'flat' ? 0.4 : 2.8),
      overhang: spec.roofOverhang || 0.6,
      finish: spec.roofFinish,
    },
    cad2d: {
      ...base.cad2d,
      axesX: [
        { id: 'ax_1', label: '1', orientation: 'x', position: 0 },
        { id: 'ax_2', label: '2', orientation: 'x', position: W / 2 },
        { id: 'ax_3', label: '3', orientation: 'x', position: W },
      ],
      axesY: [
        { id: 'ay_A', label: 'А', orientation: 'y', position: 0 },
        { id: 'ay_B', label: 'Б', orientation: 'y', position: L / 2 },
        { id: 'ay_V', label: 'В', orientation: 'y', position: L },
      ],
    },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Projects unified model back to legacy Building3dSpec for compatibility with calculators/metadata.
 */
export function unifiedProjectToBuilding3dSpec(project: UnifiedBuildingProject): Building3dSpec {
  const firstFloor = project.floors[0];
  const extWall = project.walls.find((w) => w.isExterior);
  const totalArea =
    project.rooms.length > 0
      ? Number(project.rooms.reduce((sum, r) => sum + r.area, 0).toFixed(1))
      : Number((project.totalWidth * project.totalLength * project.floors.length).toFixed(1));

  return {
    id: project.id,
    name: project.name,
    floors: project.floors.length,
    width: project.totalWidth,
    length: project.totalLength,
    floorHeight: firstFloor?.height || 3.0,
    wallThickness: extWall?.thickness || 0.38,
    roofType: project.roof.type,
    roofHeight: project.roof.height,
    roofOverhang: project.roof.overhang,
    wallFinish: extWall?.finish || 'brick_red',
    roofFinish: project.roof.finish,
    windowsPerSide: Math.max(1, Math.round(project.openings.filter((o) => o.type === 'window' && o.floorId === firstFloor?.id).length / 2)),
    hasBalcony: project.floors.length > 1,
    totalArea,
  };
}

/**
 * Converts a floor from UnifiedBuildingProject to legacy CadFloorPlan format for PDF Album Sheet 3 / fallback exports.
 */
export function unifiedProjectToCadFloorPlan(
  project: UnifiedBuildingProject,
  floorIndex: number = 0
): CadFloorPlan {
  const floor = project.floors[floorIndex] || project.floors[0];
  const floorId = floor?.id || 'fl_1';
  const floorRooms = project.rooms.filter((r) => r.floorId === floorId);
  const floorWalls = project.walls.filter((w) => w.floorId === floorId);
  const floorOpenings = project.openings.filter((o) => o.floorId === floorId);

  const legacyOpenings = floorOpenings.map((op) => {
    const w = floorWalls.find((wl) => wl.id === op.wallId);
    if (!w) {
      return {
        id: op.id,
        type: op.type,
        x: 0,
        y: 0,
        width: op.width,
        orientation: 'horizontal' as const,
      };
    }
    const len = wallLengthMeters(w) || 1;
    const dx = (w.end.x - w.start.x) / len;
    const dy = (w.end.y - w.start.y) / len;
    const cx = w.start.x + dx * op.offsetU;
    const cy = w.start.y + dy * op.offsetU;
    const isHoriz = Math.abs(dx) >= Math.abs(dy);
    return {
      id: op.id,
      type: op.type,
      x: isHoriz ? cx - op.width / 2 : cx,
      y: isHoriz ? cy : cy - op.width / 2,
      width: op.width,
      orientation: isHoriz ? ('horizontal' as const) : ('vertical' as const),
      openDirection: op.swingDirection?.includes('out') ? ('outside' as const) : ('inside' as const),
    };
  });

  return {
    title: `${project.name} — ${floor?.name || '1-й этаж'}`,
    scale: project.cad2d.scale,
    totalWidth: project.totalWidth,
    totalLength: project.totalLength,
    wallThicknessExterior: project.walls.find((w) => w.isExterior)?.thickness || 0.38,
    wallThicknessInterior: project.walls.find((w) => !w.isExterior)?.thickness || 0.12,
    rooms: floorRooms.map((r) => ({
      id: r.id,
      name: r.name,
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      area: r.area,
      color: r.color,
    })),
    openings: legacyOpenings,
    dimensions: project.cad2d.dimensions
      .filter((d) => d.floorId === floorId)
      .map((d) => ({
        id: d.id,
        x1: d.p1.x,
        y1: d.p1.y,
        x2: d.p2.x,
        y2: d.p2.y,
        offset: d.offset,
        value: Number(Math.hypot(d.p2.x - d.p1.x, d.p2.y - d.p1.y).toFixed(2)),
        orientation: Math.abs(d.p2.x - d.p1.x) >= Math.abs(d.p2.y - d.p1.y) ? 'horizontal' : 'vertical',
      })),
    axesX: project.cad2d.axesX.map((a) => ({ label: a.label, position: a.position, orientation: 'x' })),
    axesY: project.cad2d.axesY.map((a) => ({ label: a.label, position: a.position, orientation: 'y' })),
  };
}
