export type Language = 'ru' | 'kk';

export type CalculatorId =
  | 'concrete'
  | 'rebar'
  | 'foundation'
  | 'earthwork'
  | 'masonry'
  | 'plaster'
  | 'roofing'
  | 'screed'
  | 'insulation'
  | 'painting';

export type CalculatorCategory =
  | 'all'
  | 'concrete_works'
  | 'reinforcement'
  | 'foundations'
  | 'earthworks'
  | 'masonry'
  | 'finishing'
  | 'roofing_insulation';

export interface CalculationHistoryItem {
  id: string;
  calculatorId: CalculatorId;
  calculatorTitle: string;
  timestamp: number;
  inputs: Record<string, number | string>;
  inputLabels: Record<string, string>;
  results: {
    label: string;
    value: string | number;
    unit: string;
    isPrimary?: boolean;
    helperText?: string;
  }[];
  formulaText: string;
  formulaSubstituted?: string;
  normReference?: string;
}

// 1. Concrete
export interface ConcreteInputs {
  length: number; // m
  width: number;  // m
  height: number; // m (depth/thickness)
  reservePercent: number; // %
}

export interface ConcreteResult {
  baseVolume: number; // m³
  reserveVolume: number; // m³
  totalVolume: number; // m³
  cementBagsEstimate: number; // ~50kg bags (M250-M300 standard ~330 kg/m³)
  approxWeightTons: number; // ~2.4 t/m³
  formula: string;
  formulaSubstituted: string;
}

// 2. Rebar
export interface RebarInputs {
  diameter: number; // mm
  rodLength: number; // m
  rodCount: number; // pcs
}

export interface RebarResult {
  totalLength: number; // m
  meterWeight: number; // kg/m (m = d² / 162)
  totalWeightKg: number; // kg
  totalWeightTons: number; // t
  formula: string;
  formulaSubstituted: string;
}

// 3. Foundation
export interface FoundationInputs {
  foundationType: 'slab' | 'strip';
  length: number; // m
  width: number;  // m
  height: number; // m
  stripThickness?: number; // m (for strip foundation width of beam)
  reservePercent: number; // %
}

export interface FoundationResult {
  baseArea: number; // m²
  concreteVolume: number; // m³
  totalConcreteVolume: number; // m³ with reserve
  lateralFormworkArea: number; // m²
  approxSoilPressureKPa: number; // kPa
  formula: string;
  formulaSubstituted: string;
}

// 4. Earthwork
export interface EarthworkInputs {
  length: number; // m
  width: number; // m
  depth: number; // m
  looseningFactor: number; // kp (user input)
}

export interface EarthworkResult {
  naturalVolume: number; // m³ (in dense body)
  loosenedVolume: number; // m³
  deltaVolume: number; // m³
  trucks15m3Count: number; // 15m³ dump trucks
  trucks20m3Count: number; // 20m³ dump trucks
  formula: string;
  formulaSubstituted: string;
}

// 5. Masonry
export interface MasonryInputs {
  wallLength: number; // m
  wallHeight: number; // m
  wallThickness: number; // m
  brickLength: number; // mm
  brickWidth: number; // mm
  brickHeight: number; // mm
  mortarJoint: number; // mm
  openingsArea: number; // m²
  wastePercent: number; // %
}

export interface MasonryResult {
  grossArea: number; // m²
  netArea: number; // m²
  masonryVolume: number; // m³
  bricksWithoutWaste: number; // pcs
  totalBricksWithWaste: number; // pcs
  mortarVolumeEstimate: number; // m³
  palletCountEstimate: number; // standard pallet ~300-400 pcs
  formula: string;
  formulaSubstituted: string;
  isApproximate: boolean;
}

// 6. Plaster
export interface PlasterInputs {
  wallLength: number; // m
  wallHeight: number; // m
  openingsArea: number; // m²
  layerThicknessMm: number; // mm (layer thickness)
  mixType: 'gypsum' | 'cement' | 'facade';
  bagWeightKg: number; // 25, 30, 50 kg
  wastePercent: number; // %
}

export interface PlasterResult {
  grossArea: number; // m²
  netArea: number; // m²
  totalWeightKg: number; // kg
  totalBags: number; // bags
  primerLiters: number; // liters
  beaconProfilesMeters: number; // m
  formula: string;
  formulaSubstituted: string;
}

// 7. Roofing
export interface RoofingInputs {
  roofType: 'single' | 'gable' | 'hip' | 'flat';
  buildingLength: number; // m
  buildingWidth: number; // m
  slopeAngleDeg: number; // degrees
  overhangMeters: number; // m (eave overhang)
  materialType: 'metal_tile' | 'corrugated' | 'soft_shingle' | 'roll_membrane';
  wastePercent: number; // %
}

export interface RoofingResult {
  projectionArea: number; // m²
  actualSlopeArea: number; // m²
  totalAreaWithWaste: number; // m²
  ridgeLengthMeters: number; // m (конек)
  eavesLengthMeters: number; // m (карниз)
  membraneRolls: number; // rolls (75 m² per roll standard)
  screwsPcs: number; // fastening screws (~8 pcs/m²)
  formula: string;
  formulaSubstituted: string;
}

// 8. Floor Screed
export interface ScreedInputs {
  roomLength: number; // m
  roomWidth: number; // m
  screedThicknessMm: number; // mm (e.g. 50 mm)
  screedType: 'cement_sand' | 'semi_dry' | 'self_leveling';
  bagWeightKg: number; // 25 or 50 kg
  reservePercent: number; // %
}

export interface ScreedResult {
  area: number; // m²
  volumeM3: number; // m³
  totalDryMixKg: number; // kg
  bagsCount: number; // pcs
  damperTapeMeters: number; // m (perimeter)
  reinforcingMeshM2: number; // m²
  fiberKg: number; // kg
  formula: string;
  formulaSubstituted: string;
}

// 9. Thermal Insulation
export interface InsulationInputs {
  insulationArea: number; // m²
  cityRegion: string; // e.g. 'astana', 'almaty', 'shymkent', etc.
  constructionType: 'facade' | 'roof' | 'floor';
  materialType: 'mineral_wool' | 'xps' | 'eps' | 'pir';
  wastePercent: number; // %
}

export interface InsulationResult {
  requiredR: number; // m²·°C/W (СП РК 2.04-01-2017)
  thermalConductivity: number; // W/(m·°C)
  recommendedThicknessMm: number; // mm
  standardThicknessMm: number; // 50, 100, 150, 200 mm
  totalVolumeM3: number; // m³
  packagesCount: number; // packs
  dowelsCount: number; // pieces (тарельчатые дюбели)
  vaporBarrierM2: number; // m²
  formula: string;
  formulaSubstituted: string;
}

// 10. Painting
export interface PaintingInputs {
  surfaceArea: number; // m²
  layersCount: number; // 1, 2, 3
  paintType: 'acrylic' | 'latex' | 'silicone' | 'enamel';
  surfaceType: 'smooth' | 'rough' | 'drywall' | 'wood';
  canSizeLiters: number; // 2.5, 5, 10, 14 L
  reservePercent: number; // %
}

export interface PaintingResult {
  totalPaintLiters: number; // L
  totalPaintKg: number; // kg
  cansCount: number; // cans
  primerLiters: number; // L
  maskingTapeMeters: number; // m
  formula: string;
  formulaSubstituted: string;
}

