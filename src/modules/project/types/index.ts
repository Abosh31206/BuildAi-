import { WallFinish, RoofFinish, RoofShape, Building3dSpec } from '../../building3d/types';
import { CadFloorPlan } from '../../cad/types';

export type ProjectStage = 'АР' | 'КЖ' | 'АС' | 'ЭП';
export type CadUnit = 'mm' | 'cm' | 'm';
export type CadScale = '1:50' | '1:100' | '1:200';
export type PaperFormat = 'A4' | 'A3' | 'A2' | 'A1' | 'A0';
export type PaperOrientation = 'landscape' | 'portrait';
export type LineType = 'CONTINUOUS' | 'DASHED' | 'CENTER';

export type WindowSubtype = 'single' | 'double' | 'triple' | 'panoramic' | 'corner';
export type DoorSubtype = 'entrance' | 'interior';
export type SwingDirection = 'left-in' | 'right-in' | 'left-out' | 'right-out';

export interface Point2D {
  x: number; // meters in unified model
  y: number; // meters in unified model
}

export interface ProjectFloor {
  id: string;
  index: number; // 0 = 1st floor, 1 = 2nd floor, ...
  name: string;
  elevation: number; // meters from 0.000
  height: number; // floor-to-floor height in meters
  slabThickness: number; // e.g., 0.22 m
  showSlab: boolean;
  showWalls: boolean;
}

export interface ProjectWall {
  id: string;
  floorId: string;
  start: Point2D;
  end: Point2D;
  thickness: number; // meters (0.38 exterior, 0.12 interior)
  height: number; // meters
  isExterior: boolean;
  finish: WallFinish;
  layerId?: string;
  hidden?: boolean;
}

export interface ProjectOpening {
  id: string;
  floorId: string;
  wallId: string;
  type: 'window' | 'door';
  windowSubtype?: WindowSubtype;
  doorSubtype?: DoorSubtype;
  /** Center distance in meters from wall.start toward wall.end */
  offsetU: number;
  width: number; // meters
  height: number; // meters
  sillHeight: number; // meters (0 for doors, >=0 for windows)
  swingDirection?: SwingDirection;
  layerId?: string;
}

export interface ProjectRoom {
  id: string;
  floorId: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  area: number;
  category: 'living' | 'auxiliary' | 'wet' | 'hall';
  color: string;
}

export interface ProjectColumn {
  id: string;
  floorId: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  layerId?: string;
}

export interface ProjectStair {
  id: string;
  floorId: string;
  x: number;
  y: number;
  width: number;
  length: number;
  steps: number;
  direction: 'up' | 'right' | 'down' | 'left';
  layerId?: string;
}

export interface CadLayer {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  locked: boolean;
  lineWeight: number; // mm in print / px factor
  lineType: LineType;
  isSystem?: boolean;
}

export type CadPrimitiveKind =
  | 'line'
  | 'polyline'
  | 'rect'
  | 'circle'
  | 'arc'
  | 'text'
  | 'callout'
  | 'elevation'
  | 'section';

export interface CadPrimitiveEntity {
  id: string;
  floorId: string;
  layerId: string;
  kind: CadPrimitiveKind;
  groupId?: string;
  points: Point2D[]; // meters
  radius?: number;
  startAngle?: number; // degrees
  endAngle?: number; // degrees
  text?: string;
  subText?: string;
  color?: string;
  lineWidth?: number;
}

export type CadDimensionKind = 'linear' | 'angular' | 'radial' | 'axis' | 'opening';

export interface CadProDimension {
  id: string;
  floorId: string;
  layerId: string;
  kind: CadDimensionKind;
  p1: Point2D;
  p2: Point2D;
  p3?: Point2D; // vertex for angular or offset point
  offset: number; // meters perpendicular offset
  labelOverride?: string;
}

export interface CadAxisLine {
  id: string;
  label: string;
  orientation: 'x' | 'y';
  position: number; // meters
}

export interface PaperSpaceSettings {
  enabled: boolean;
  format: PaperFormat;
  orientation: PaperOrientation;
  scale: CadScale;
  titleBlock: {
    projectName: string;
    projectCode: string;
    stage: ProjectStage;
    developer: string;
    checker: string;
    gip: string;
    organization: string;
    sheetNumber: number;
    totalSheets: number;
    dateStr: string;
  };
}

export interface GeometryIssue {
  id: string;
  severity: 'error' | 'warning';
  entityId?: string;
  messageRu: string;
  messageKk: string;
}

export interface UnifiedBuildingProject {
  id: string;
  schemaVersion: number;
  name: string;
  projectCode: string;
  city: string;
  stage: ProjectStage;
  totalWidth: number; // bounding footprint width (m)
  totalLength: number; // bounding footprint length (m)
  conceptualStatus: 'CONCEPTUAL_MODEL';
  floors: ProjectFloor[];
  walls: ProjectWall[];
  openings: ProjectOpening[];
  rooms: ProjectRoom[];
  columns: ProjectColumn[];
  stairs: ProjectStair[];
  roof: {
    type: RoofShape;
    height: number;
    overhang: number;
    finish: RoofFinish;
  };
  cad2d: {
    units: CadUnit;
    scale: CadScale;
    layers: CadLayer[];
    primitives: CadPrimitiveEntity[];
    dimensions: CadProDimension[];
    axesX: CadAxisLine[];
    axesY: CadAxisLine[];
    paperSpace: PaperSpaceSettings;
  };
  linkedStandards: string[];
  updatedAt: string;
}

export type { Building3dSpec, CadFloorPlan, WallFinish, RoofFinish, RoofShape };
