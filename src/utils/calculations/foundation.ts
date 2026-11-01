import { FoundationInputs, FoundationResult } from '../../types/calculator';

export function calculateFoundation(inputs: FoundationInputs): FoundationResult {
  const { length, width, height, reservePercent } = inputs;

  if (length <= 0 || width <= 0 || height <= 0) {
    throw new Error('Размеры фундамента должны быть больше нуля');
  }

  const safeReserve = Math.max(0, reservePercent || 0);

  // Base area: S = L * B
  const baseArea = Number((length * width).toFixed(2));
  // Volume: V = L * B * H
  const concreteVolume = Number((length * width * height).toFixed(3));
  // With reserve
  const totalConcreteVolume = Number((concreteVolume * (1 + safeReserve / 100)).toFixed(3));

  // Lateral formwork area: 2 * (L + B) * H
  const lateralFormworkArea = Number((2 * (length + width) * height).toFixed(2));

  // Self-weight pressure estimate: P = (V * 2400 kg/m³ * 9.81 m/s²) / (S * 1000) kPa
  const approxSoilPressureKPa = Number((height * 2.4 * 9.81).toFixed(1));

  const formula = 'V = L × B × H ; S_осн = L × B';
  const formulaSubstituted = `S = ${length} × ${width} = ${baseArea} м² ; V = ${length} × ${width} × ${height} = ${concreteVolume} м³ (с запасом ${safeReserve}%: ${totalConcreteVolume} м³) ; Опалубка = 2 × (${length} + ${width}) × ${height} = ${lateralFormworkArea} м²`;

  return {
    baseArea,
    concreteVolume,
    totalConcreteVolume,
    lateralFormworkArea,
    approxSoilPressureKPa,
    formula,
    formulaSubstituted,
  };
}
