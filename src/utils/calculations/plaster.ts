import { PlasterInputs, PlasterResult } from '../../types/calculator';

export function calculatePlaster(inputs: PlasterInputs): PlasterResult {
  const { wallLength, wallHeight, openingsArea, layerThicknessMm, mixType, bagWeightKg, wastePercent } = inputs;

  if (wallLength <= 0 || wallHeight <= 0 || layerThicknessMm <= 0) {
    throw new Error('Размеры стен и толщина слоя должны быть больше нуля');
  }

  const grossArea = Number((wallLength * wallHeight).toFixed(2));
  const safeOpenings = Math.max(0, openingsArea || 0);
  if (safeOpenings >= grossArea) {
    throw new Error('Площадь проемов не может превышать или быть равной общей площади стены');
  }

  const netArea = Number((grossArea - safeOpenings).toFixed(2));

  // Consumption rates per 1 m² with 10mm layer:
  // Gypsum: ~8.5 kg / (m² · 10mm)
  // Cement-sand: ~16.5 kg / (m² · 10mm)
  // Facade decorative: ~12.0 kg / (m² · 10mm)
  let ratePer10mm = 8.5;
  if (mixType === 'cement') ratePer10mm = 16.5;
  if (mixType === 'facade') ratePer10mm = 12.0;

  const ratePerActualThickness = (ratePer10mm * layerThicknessMm) / 10;
  const safeWaste = Math.max(0, wastePercent || 0);

  const totalWeightKg = Number((netArea * ratePerActualThickness * (1 + safeWaste / 100)).toFixed(1));
  const safeBagWeight = bagWeightKg > 0 ? bagWeightKg : 30;
  const totalBags = Math.ceil(totalWeightKg / safeBagWeight);

  // Primer: ~0.15 liters per m²
  const primerLiters = Number((netArea * 0.15).toFixed(1));

  // Beacon profiles: vertical step ~1.2m -> width / 1.2 * height
  const beaconProfilesMeters = Number((Math.ceil(wallLength / 1.2) * wallHeight).toFixed(1));

  const formula = 'S_нетто = (L × H) - S_пр ; M = S_нетто × (h / 10) × q_10мм × (1 + k/100)';
  const formulaSubstituted = `S = ${netArea} м² ; M = ${netArea} × (${layerThicknessMm}/10) × ${ratePer10mm} кг = ${totalWeightKg} кг (~${totalBags} мешков по ${safeBagWeight} кг)`;

  return {
    grossArea,
    netArea,
    totalWeightKg,
    totalBags,
    primerLiters,
    beaconProfilesMeters,
    formula,
    formulaSubstituted,
  };
}
