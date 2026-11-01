import { ConcreteInputs, ConcreteResult } from '../../types/calculator';

export function calculateConcrete(inputs: ConcreteInputs): ConcreteResult {
  const { length, width, height, reservePercent } = inputs;

  if (length <= 0 || width <= 0 || height <= 0) {
    throw new Error('Размеры должны быть положительными числами больше нуля');
  }

  const safeReserve = Math.max(0, reservePercent || 0);

  // V = L * B * H
  const baseVolume = Number((length * width * height).toFixed(3));
  const reserveVolume = Number((baseVolume * (safeReserve / 100)).toFixed(3));
  const totalVolume = Number((baseVolume + reserveVolume).toFixed(3));

  // Approximate engineering references (standard B20/B25 heavy concrete):
  // Cement consumption ~330 kg/m³, 1 bag = 50kg
  const cementBagsEstimate = Math.ceil((totalVolume * 330) / 50);
  // Heavy concrete density ~2400 kg/m³ = 2.4 t/m³
  const approxWeightTons = Number((totalVolume * 2.4).toFixed(2));

  const formula = 'V = L × B × H';
  const formulaSubstituted = `V = ${length} м × ${width} м × ${height} м = ${baseVolume} м³ (с запасом ${safeReserve}%: ${totalVolume} м³)`;

  return {
    baseVolume,
    reserveVolume,
    totalVolume,
    cementBagsEstimate,
    approxWeightTons,
    formula,
    formulaSubstituted,
  };
}
