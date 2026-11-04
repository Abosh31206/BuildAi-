export type RoofShape = 'gable' | 'hip' | 'flat';
export type WallFinish = 'brick_red' | 'brick_yellow' | 'stucco_white' | 'stucco_gray' | 'wood_timber';
export type RoofFinish = 'metal_tile_dark' | 'metal_tile_red' | 'soft_shingle_brown';

export interface Building3dSpec {
  id: string;
  name: string;
  floors: number; // 1, 2, 3
  width: number; // m (X)
  length: number; // m (Z)
  floorHeight: number; // m (Y ~3.0m)
  wallThickness: number; // m (~0.38m)
  roofType: RoofShape;
  roofHeight: number; // m (~2.5m)
  roofOverhang: number; // m (~0.5m)
  wallFinish: WallFinish;
  roofFinish: RoofFinish;
  windowsPerSide: number; // 2, 3, 4
  hasBalcony?: boolean;
  totalArea: number; // m²
}
