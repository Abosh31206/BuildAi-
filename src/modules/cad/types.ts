export type CadViewMode = 'plan' | 'facade' | 'section';

export interface CadRoom {
  id: string;
  name: string;
  nameKk?: string;
  x: number; // in meters
  y: number; // in meters
  width: number; // in meters
  height: number; // in meters
  area: number; // in m²
  color?: string;
}

export interface CadOpening {
  id: string;
  type: 'door' | 'window';
  x: number; // meters
  y: number; // meters
  width: number; // meters (e.g. 0.9m door, 1.5m window)
  height?: number; // meters
  orientation: 'horizontal' | 'vertical';
  openDirection?: 'inside' | 'outside';
}

export interface CadDimension {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  offset: number; // perpendicular distance for text line
  value: number; // meters
  label?: string;
  orientation: 'horizontal' | 'vertical';
}

export interface CadAxis {
  label: string; // "1", "2", "3" or "А", "Б", "В"
  position: number; // meters along axis
  orientation: 'x' | 'y';
}

export interface CadFloorPlan {
  title: string;
  scale: string; // e.g. "1:100"
  totalWidth: number; // meters
  totalLength: number; // meters
  wallThicknessExterior: number; // e.g. 0.38 m
  wallThicknessInterior: number; // e.g. 0.12 m
  rooms: CadRoom[];
  openings: CadOpening[];
  dimensions: CadDimension[];
  axesX: CadAxis[];
  axesY: CadAxis[];
}
