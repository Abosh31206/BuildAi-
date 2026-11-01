import { EarthworkInputs, EarthworkResult } from '../../types/calculator';

export function calculateEarthwork(inputs: EarthworkInputs): EarthworkResult {
  const { length, width, depth, looseningFactor } = inputs;

  if (length <= 0 || width <= 0 || depth <= 0) {
    throw new Error('Геометрические размеры выемки должны быть больше нуля');
  }

  if (looseningFactor < 1.0 || looseningFactor > 2.5) {
    throw new Error('Коэффициент первоначального разрыхления должен быть не менее 1.0 (обычно 1.08–1.50 по нормам РК)');
  }

  // Natural state volume in solid body: V_nat = L * B * H
  const naturalVolume = Number((length * width * depth).toFixed(3));
  // Loosened volume: V_loose = V_nat * kp
  const loosenedVolume = Number((naturalVolume * looseningFactor).toFixed(3));
  // Volume increase
  const deltaVolume = Number((loosenedVolume - naturalVolume).toFixed(3));

  // Dump truck logistics estimate
  const trucks15m3Count = Math.ceil(loosenedVolume / 15);
  const trucks20m3Count = Math.ceil(loosenedVolume / 20);

  const formula = 'V_ест = L × B × H ; V_разр = V_ест × k_р';
  const formulaSubstituted = `V_ест = ${length} м × ${width} м × ${depth} м = ${naturalVolume} м³ ; V_разр = ${naturalVolume} м³ × ${looseningFactor} = ${loosenedVolume} м³ (прирост: ${deltaVolume} м³)`;

  return {
    naturalVolume,
    loosenedVolume,
    deltaVolume,
    trucks15m3Count,
    trucks20m3Count,
    formula,
    formulaSubstituted,
  };
}
