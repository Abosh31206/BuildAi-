import { PaintingInputs, PaintingResult } from '../../types/calculator';

export function calculatePainting(inputs: PaintingInputs): PaintingResult {
  const { surfaceArea, layersCount, paintType, surfaceType, canSizeLiters, reservePercent } = inputs;

  if (surfaceArea <= 0) {
    throw new Error('Площадь окрашивания должна быть больше нуля');
  }

  const safeLayers = Math.max(1, Math.min(5, layersCount || 2));

  // Base consumption in liters per 1 m² for 1 layer:
  // Acrylic: ~0.12 L/m²
  // Latex: ~0.11 L/m²
  // Silicone: ~0.14 L/m²
  // Enamel: ~0.10 L/m²
  let baseRateLiters = 0.12;
  if (paintType === 'latex') baseRateLiters = 0.11;
  if (paintType === 'silicone') baseRateLiters = 0.14;
  if (paintType === 'enamel') baseRateLiters = 0.1;

  // Surface absorption multiplier:
  // Smooth putty: 1.0
  // Drywall: 1.15
  // Rough plaster: 1.30
  // Wood: 1.25
  let surfaceFactor = 1.0;
  if (surfaceType === 'drywall') surfaceFactor = 1.15;
  if (surfaceType === 'rough') surfaceFactor = 1.3;
  if (surfaceType === 'wood') surfaceFactor = 1.25;

  const safeReserve = Math.max(0, reservePercent || 5);

  // Subsequent layers absorb ~20% less
  let totalLiters = 0;
  for (let i = 1; i <= safeLayers; i++) {
    const layerFactor = i === 1 ? 1.0 : 0.85;
    totalLiters += surfaceArea * baseRateLiters * surfaceFactor * layerFactor;
  }

  totalLiters = totalLiters * (1 + safeReserve / 100);
  const totalPaintLiters = Number(totalLiters.toFixed(2));

  // Paint density ~1.4 kg/L
  const totalPaintKg = Number((totalPaintLiters * 1.4).toFixed(1));

  const safeCan = canSizeLiters > 0 ? canSizeLiters : 10;
  const cansCount = Math.ceil(totalPaintLiters / safeCan);

  // Primer: 1 coat ~0.12 L/m²
  const primerLiters = Number((surfaceArea * 0.12).toFixed(1));

  // Masking tape perimeter estimate (~1.5 m per m² of wall area)
  const maskingTapeMeters = Number((surfaceArea * 1.5).toFixed(0));

  const formula = 'V_краски = S × n_слоев × q_расх × k_пов × (1 + k/100)';
  const formulaSubstituted = `S = ${surfaceArea} м² × ${safeLayers} сл. × ${baseRateLiters} л/м² = ${totalPaintLiters} л (~${cansCount} банок по ${safeCan} л)`;

  return {
    totalPaintLiters,
    totalPaintKg,
    cansCount,
    primerLiters,
    maskingTapeMeters,
    formula,
    formulaSubstituted,
  };
}
