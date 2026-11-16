import {
  Point2D,
  CadUnit,
  ProjectWall,
  ProjectColumn,
  CadPrimitiveEntity,
} from '../../project/types';

export type OsnapKind =
  | 'endpoint'
  | 'midpoint'
  | 'center'
  | 'intersection'
  | 'perpendicular'
  | 'nearest'
  | 'grid';

export interface SnapSettings {
  gridSnap: boolean;
  gridStepMeters: number;
  ortho: boolean;
  osnap: {
    endpoint: boolean;
    midpoint: boolean;
    center: boolean;
    intersection: boolean;
    perpendicular: boolean;
    nearest: boolean;
  };
}

export interface SnapResult {
  point: Point2D;
  kind: OsnapKind | null;
}

export function formatUnitValue(meters: number, unit: CadUnit): string {
  if (unit === 'mm') return `${Math.round(meters * 1000)} мм`;
  if (unit === 'cm') return `${(meters * 100).toFixed(1)} см`;
  return `${meters.toFixed(2)} м`;
}

export function formatUnitNumber(meters: number, unit: CadUnit): string {
  if (unit === 'mm') return `${Math.round(meters * 1000)}`;
  if (unit === 'cm') return `${(meters * 100).toFixed(1)}`;
  return `${meters.toFixed(2)}`;
}

export function parseUnitInput(raw: number, unit: CadUnit): number {
  if (unit === 'mm') return raw / 1000;
  if (unit === 'cm') return raw / 100;
  return raw;
}

export function dist2D(a: Point2D, b: Point2D): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function distToSegment(p: Point2D, a: Point2D, b: Point2D): { distance: number; closest: Point2D; t: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-9) {
    return { distance: dist2D(p, a), closest: a, t: 0 };
  }
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  const closest = { x: a.x + t * dx, y: a.y + t * dy };
  return { distance: dist2D(p, closest), closest, t };
}

export function segmentIntersection(
  a1: Point2D,
  a2: Point2D,
  b1: Point2D,
  b2: Point2D
): Point2D | null {
  const x1 = a1.x;
  const y1 = a1.y;
  const x2 = a2.x;
  const y2 = a2.y;
  const x3 = b1.x;
  const y3 = b1.y;
  const x4 = b2.x;
  const y4 = b2.y;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 1e-8) return null;

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1),
    };
  }
  return null;
}

export function lineIntersectionUnbounded(
  a1: Point2D,
  a2: Point2D,
  b1: Point2D,
  b2: Point2D
): { point: Point2D; tA: number; tB: number } | null {
  const x1 = a1.x;
  const y1 = a1.y;
  const x2 = a2.x;
  const y2 = a2.y;
  const x3 = b1.x;
  const y3 = b1.y;
  const x4 = b2.x;
  const y4 = b2.y;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 1e-8) return null;

  const tA = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const tB = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  return {
    point: {
      x: x1 + tA * (x2 - x1),
      y: y1 + tA * (y2 - y1),
    },
    tA,
    tB,
  };
}

export function applyOrtho(cursor: Point2D, origin: Point2D | null): Point2D {
  if (!origin) return cursor;
  const dx = Math.abs(cursor.x - origin.x);
  const dy = Math.abs(cursor.y - origin.y);
  if (dx >= dy) {
    return { x: cursor.x, y: origin.y };
  }
  return { x: origin.x, y: cursor.y };
}

export function findSnapPoint(
  rawCursor: Point2D,
  walls: ProjectWall[],
  primitives: CadPrimitiveEntity[],
  columns: ProjectColumn[],
  settings: SnapSettings,
  origin: Point2D | null = null,
  snapRadiusMeters: number = 0.35
): SnapResult {
  const cursor = settings.ortho && origin ? applyOrtho(rawCursor, origin) : rawCursor;

  const segments: { a: Point2D; b: Point2D }[] = walls.map((w) => ({ a: w.start, b: w.end }));
  primitives.forEach((p) => {
    if ((p.kind === 'line' || p.kind === 'polyline') && p.points.length >= 2) {
      for (let i = 0; i < p.points.length - 1; i++) {
        segments.push({ a: p.points[i], b: p.points[i + 1] });
      }
    } else if (p.kind === 'rect' && p.points.length >= 2) {
      const [p1, p2] = p.points;
      const c1 = p1;
      const c2 = { x: p2.x, y: p1.y };
      const c3 = p2;
      const c4 = { x: p1.x, y: p2.y };
      segments.push({ a: c1, b: c2 }, { a: c2, b: c3 }, { a: c3, b: c4 }, { a: c4, b: c1 });
    }
  });

  let best: SnapResult = { point: cursor, kind: null };
  let bestDist = snapRadiusMeters;

  // 1. Endpoints
  if (settings.osnap.endpoint) {
    for (const seg of segments) {
      for (const pt of [seg.a, seg.b]) {
        const d = dist2D(cursor, pt);
        if (d < bestDist) {
          bestDist = d;
          best = { point: pt, kind: 'endpoint' };
        }
      }
    }
  }

  // 2. Midpoints
  if (settings.osnap.midpoint && !best.kind) {
    for (const seg of segments) {
      const mid = { x: (seg.a.x + seg.b.x) / 2, y: (seg.a.y + seg.b.y) / 2 };
      const d = dist2D(cursor, mid);
      if (d < bestDist) {
        bestDist = d;
        best = { point: mid, kind: 'midpoint' };
      }
    }
  }

  // 3. Centers (columns, circles, arcs)
  if (settings.osnap.center && !best.kind) {
    for (const col of columns) {
      const pt = { x: col.x, y: col.y };
      const d = dist2D(cursor, pt);
      if (d < bestDist) {
        bestDist = d;
        best = { point: pt, kind: 'center' };
      }
    }
    for (const prim of primitives) {
      if ((prim.kind === 'circle' || prim.kind === 'arc') && prim.points[0]) {
        const d = dist2D(cursor, prim.points[0]);
        if (d < bestDist) {
          bestDist = d;
          best = { point: prim.points[0], kind: 'center' };
        }
      }
    }
  }

  // 4. Intersections
  if (settings.osnap.intersection && !best.kind) {
    for (let i = 0; i < segments.length; i++) {
      for (let j = i + 1; j < segments.length; j++) {
        const inter = segmentIntersection(segments[i].a, segments[i].b, segments[j].a, segments[j].b);
        if (inter) {
          const d = dist2D(cursor, inter);
          if (d < bestDist) {
            bestDist = d;
            best = { point: inter, kind: 'intersection' };
          }
        }
      }
    }
  }

  // 5. Perpendicular from origin
  if (settings.osnap.perpendicular && origin && !best.kind) {
    for (const seg of segments) {
      const dx = seg.b.x - seg.a.x;
      const dy = seg.b.y - seg.a.y;
      const lenSq = dx * dx + dy * dy;
      if (lenSq < 1e-8) continue;
      const t = ((origin.x - seg.a.x) * dx + (origin.y - seg.a.y) * dy) / lenSq;
      if (t >= 0 && t <= 1) {
        const foot = { x: seg.a.x + t * dx, y: seg.a.y + t * dy };
        const d = dist2D(cursor, foot);
        if (d < bestDist) {
          bestDist = d;
          best = { point: foot, kind: 'perpendicular' };
        }
      }
    }
  }

  // 6. Nearest point on segment
  if (settings.osnap.nearest && !best.kind) {
    for (const seg of segments) {
      const res = distToSegment(cursor, seg.a, seg.b);
      if (res.distance < bestDist * 0.75) {
        bestDist = res.distance;
        best = { point: res.closest, kind: 'nearest' };
      }
    }
  }

  // 7. Grid snap fallback
  if (!best.kind && settings.gridSnap) {
    const step = settings.gridStepMeters || 0.1;
    best = {
      point: {
        x: Number((Math.round(cursor.x / step) * step).toFixed(3)),
        y: Number((Math.round(cursor.y / step) * step).toFixed(3)),
      },
      kind: 'grid',
    };
  }

  return best;
}

export function offsetSegmentPoints(a: Point2D, b: Point2D, offsetMeters: number, sidePoint: Point2D): [Point2D, Point2D] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const cross = (sidePoint.x - a.x) * nx + (sidePoint.y - a.y) * ny;
  const sign = cross >= 0 ? 1 : -1;
  return [
    { x: Number((a.x + nx * offsetMeters * sign).toFixed(3)), y: Number((a.y + ny * offsetMeters * sign).toFixed(3)) },
    { x: Number((b.x + nx * offsetMeters * sign).toFixed(3)), y: Number((b.y + ny * offsetMeters * sign).toFixed(3)) },
  ];
}

export function trimSegmentByCutters(
  targetA: Point2D,
  targetB: Point2D,
  clickPoint: Point2D,
  cutters: { a: Point2D; b: Point2D }[]
): [Point2D, Point2D] | null {
  const dx = targetB.x - targetA.x;
  const dy = targetB.y - targetA.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-8) return null;

  const clickT = Math.max(0, Math.min(1, ((clickPoint.x - targetA.x) * dx + (clickPoint.y - targetA.y) * dy) / lenSq));
  const hitsT: number[] = [0, 1];

  for (const cutter of cutters) {
    const res = lineIntersectionUnbounded(targetA, targetB, cutter.a, cutter.b);
    if (res && res.tA > 0.01 && res.tA < 0.99 && res.tB >= -0.01 && res.tB <= 1.01) {
      hitsT.push(res.tA);
    }
  }

  if (hitsT.length <= 2) return null;
  hitsT.sort((x, y) => x - y);

  // Find interval containing clickT
  let leftT = 0;
  let rightT = 1;
  for (let i = 0; i < hitsT.length - 1; i++) {
    if (clickT >= hitsT[i] && clickT <= hitsT[i + 1]) {
      leftT = hitsT[i];
      rightT = hitsT[i + 1];
      break;
    }
  }

  // Keep the remaining non-clicked portion (if clicked near start -> start moves to rightT; if clicked near end -> end moves to leftT)
  if (leftT === 0 && rightT < 1) {
    return [{ x: targetA.x + rightT * dx, y: targetA.y + rightT * dy }, targetB];
  }
  if (rightT === 1 && leftT > 0) {
    return [targetA, { x: targetA.x + leftT * dx, y: targetA.y + leftT * dy }];
  }
  // Middle segment clicked -> keep longest outer side
  return leftT >= 1 - rightT
    ? [targetA, { x: targetA.x + leftT * dx, y: targetA.y + leftT * dy }]
    : [{ x: targetA.x + rightT * dx, y: targetA.y + rightT * dy }, targetB];
}

export function extendSegmentToCutters(
  targetA: Point2D,
  targetB: Point2D,
  clickPoint: Point2D,
  boundaries: { a: Point2D; b: Point2D }[]
): [Point2D, Point2D] | null {
  const extendEndB = dist2D(clickPoint, targetB) < dist2D(clickPoint, targetA);
  let bestT = extendEndB ? Infinity : -Infinity;
  let bestPt: Point2D | null = null;

  for (const b of boundaries) {
    const res = lineIntersectionUnbounded(targetA, targetB, b.a, b.b);
    if (!res || res.tB < -0.02 || res.tB > 1.02) continue;
    if (extendEndB && res.tA > 1.01 && res.tA < bestT) {
      bestT = res.tA;
      bestPt = res.point;
    } else if (!extendEndB && res.tA < -0.01 && res.tA > bestT) {
      bestT = res.tA;
      bestPt = res.point;
    }
  }

  if (!bestPt) return null;
  return extendEndB ? [targetA, bestPt] : [bestPt, targetB];
}

export function rotatePointAround(pt: Point2D, pivot: Point2D, angleDeg: number): Point2D {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = pt.x - pivot.x;
  const dy = pt.y - pivot.y;
  return {
    x: Number((pivot.x + dx * cos - dy * sin).toFixed(3)),
    y: Number((pivot.y + dx * sin + dy * cos).toFixed(3)),
  };
}

export function mirrorPointAcrossLine(pt: Point2D, lineA: Point2D, lineB: Point2D): Point2D {
  const dx = lineB.x - lineA.x;
  const dy = lineB.y - lineA.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-8) return pt;
  const t = ((pt.x - lineA.x) * dx + (pt.y - lineA.y) * dy) / lenSq;
  const projX = lineA.x + t * dx;
  const projY = lineA.y + t * dy;
  return {
    x: Number((2 * projX - pt.x).toFixed(3)),
    y: Number((2 * projY - pt.y).toFixed(3)),
  };
}
