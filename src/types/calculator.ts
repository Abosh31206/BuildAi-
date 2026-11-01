export type Language = 'ru' | 'kk';

export type CalculatorId = 'concrete' | 'rebar' | 'foundation' | 'earthwork' | 'masonry';

export type CalculatorCategory = 'all' | 'concrete_works' | 'reinforcement' | 'foundations' | 'earthworks' | 'masonry';

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
  wallThickness: number; // m (e.g. 0.12, 0.25, 0.38, 0.51, 0.64)
  brickLength: number; // mm
  brickWidth: number; // mm
  brickHeight: number; // mm
  mortarJoint: number; // mm (10-12 mm)
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
