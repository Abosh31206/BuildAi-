import { InsulationInputs, InsulationResult } from '../../types/calculator';

// Climatic thermal resistance requirements per SP RK 2.04-01-2017 & SP RK 2.04-03-2011 (m²·°C/W)
const REGION_NORMS: Record<string, { name: string; facade: number; roof: number; floor: number }> = {
  astana: { name: 'Астана (ГСОП ~6200)', facade: 3.4, roof: 4.8, floor: 3.9 },
  almaty: { name: 'Алматы (ГСОП ~3800)', facade: 2.4, roof: 3.5, floor: 2.8 },
  shymkent: { name: 'Шымкент (ГСОП ~2800)', facade: 2.0, roof: 3.0, floor: 2.4 },
  karaganda: { name: 'Қарағанды (ГСОП ~6500)', facade: 3.5, roof: 5.0, floor: 4.0 },
  aktobe: { name: 'Ақтөбе (ГСОП ~5600)', facade: 3.2, roof: 4.6, floor: 3.7 },
  pavlodar: { name: 'Павлодар (ГСОП ~6700)', facade: 3.6, roof: 5.1, floor: 4.1 },
  oskemen: { name: 'Өскемен (ГСОП ~6400)', facade: 3.5, roof: 4.9, floor: 3.9 },
};

// Material thermal conductivities λ [W/(m·°C)]
const MATERIAL_LAMBDAS: Record<string, number> = {
  mineral_wool: 0.038,
  xps: 0.032,
  eps: 0.04,
  pir: 0.022,
};

export function calculateInsulation(inputs: InsulationInputs): InsulationResult {
  const { insulationArea, cityRegion, constructionType, materialType, wastePercent } = inputs;

  if (insulationArea <= 0) {
    throw new Error('Площадь утепления должна быть больше нуля');
  }

  const regionData = REGION_NORMS[cityRegion] || REGION_NORMS.astana;
  const requiredR = regionData[constructionType] || 3.2;

  const lambda = MATERIAL_LAMBDAS[materialType] || 0.038;

  // h = R * lambda (in meters -> mm)
  const exactThicknessMm = requiredR * lambda * 1000;
  const recommendedThicknessMm = Math.round(exactThicknessMm);

  // Round up to nearest standard commercially available slab thickness: 50, 100, 150, 200, 250 mm
  const standardThicknessMm = Math.ceil(recommendedThicknessMm / 50) * 50;

  const safeWaste = Math.max(0, wastePercent || 5);
  const thicknessM = standardThicknessMm / 1000;

  const totalVolumeM3 = Number((insulationArea * thicknessM * (1 + safeWaste / 100)).toFixed(2));

  // Package volume standard: ~0.288 m³ per pack of mineral wool / XPS
  const packagesCount = Math.ceil(totalVolumeM3 / 0.288);

  // Dowels ("umbrellas") for facade ~5-6 pcs per m²
  const dowelsCount = constructionType === 'facade' ? Math.ceil(insulationArea * 6) : 0;

  // Vapor barrier / membrane with 10% overlap
  const vaporBarrierM2 = Number((insulationArea * 1.1).toFixed(1));

  const formula = 'h_ут = R_норм × λ_ут ; V = S × h × (1 + k/100)';
  const formulaSubstituted = `R_норм = ${requiredR} м²·°C/Вт (СП РК 2.04-01) ; λ = ${lambda} Вт/(м·°C) ; h = ${exactThicknessMm.toFixed(0)} мм -> стандарт ${standardThicknessMm} мм ; V = ${totalVolumeM3} м³ (~${packagesCount} упак.)`;

  return {
    requiredR,
    thermalConductivity: lambda,
    recommendedThicknessMm,
    standardThicknessMm,
    totalVolumeM3,
    packagesCount,
    dowelsCount,
    vaporBarrierM2,
    formula,
    formulaSubstituted,
  };
}
