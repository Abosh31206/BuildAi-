import { ScreedInputs, ScreedResult } from '../../types/calculator';

export function calculateFloorScreed(inputs: ScreedInputs): ScreedResult {
  const { roomLength, roomWidth, screedThicknessMm, screedType, bagWeightKg, reservePercent } = inputs;

  if (roomLength <= 0 || roomWidth <= 0 || screedThicknessMm <= 0) {
    throw new Error('Размеры помещения и толщина стяжки должны быть больше нуля');
  }

  const area = Number((roomLength * roomWidth).toFixed(2));
  const thicknessM = screedThicknessMm / 1000;
  const safeReserve = Math.max(0, reservePercent || 5);

  const baseVolume = area * thicknessM;
  const volumeM3 = Number((baseVolume * (1 + safeReserve / 100)).toFixed(3));

  // Density and dry mix rates:
  // Cement-sand M150: ~1800-1900 kg dry mix per m³
  // Semi-dry: ~1950 kg per m³
  // Self-leveling: ~1650 kg per m³
  let dryMixDensity = 1900;
  if (screedType === 'semi_dry') dryMixDensity = 1950;
  if (screedType === 'self_leveling') dryMixDensity = 1650;

  const totalDryMixKg = Number((volumeM3 * dryMixDensity).toFixed(1));
  const safeBag = bagWeightKg > 0 ? bagWeightKg : 25;
  const bagsCount = Math.ceil(totalDryMixKg / safeBag);

  // Perimeter for damper tape
  const damperTapeMeters = Number((2 * (roomLength + roomWidth)).toFixed(1));

  // Reinforcing mesh
  const reinforcingMeshM2 = Number((area * 1.1).toFixed(1));

  // Polypropylene fiber for reinforcement (~0.9 kg per m³ of semi-dry / screed)
  const fiberKg = Number((volumeM3 * 0.9).toFixed(1));

  const formula = 'S = L × B ; V = S × (h / 1000) ; M_сух = V × ρ_смеси';
  const formulaSubstituted = `S = ${roomLength} × ${roomWidth} = ${area} м² ; V = ${area} м² × ${thicknessM} м = ${volumeM3} м³ ; Сухая смесь = ${volumeM3} м³ × ${dryMixDensity} кг/м³ = ${totalDryMixKg} кг (~${bagsCount} мешков по ${safeBag} кг)`;

  return {
    area,
    volumeM3,
    totalDryMixKg,
    bagsCount,
    damperTapeMeters,
    reinforcingMeshM2,
    fiberKg,
    formula,
    formulaSubstituted,
  };
}
