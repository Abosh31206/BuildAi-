import { RebarInputs, RebarResult } from '../../types/calculator';

export function calculateRebar(inputs: RebarInputs): RebarResult {
  const { diameter, rodLength, rodCount } = inputs;

  if (diameter <= 0 || rodLength <= 0 || rodCount <= 0) {
    throw new Error('Диаметр, длина и количество стержней должны быть больше нуля');
  }

  // Formula as required: m = d² / 162
  const meterWeight = Number(((diameter * diameter) / 162).toFixed(4));
  const totalLength = Number((rodLength * rodCount).toFixed(2));
  const totalWeightKg = Number((totalLength * meterWeight).toFixed(2));
  const totalWeightTons = Number((totalWeightKg / 1000).toFixed(4));

  const formula = 'm = d² / 162 ; M = L_общ × m';
  const formulaSubstituted = `m = ${diameter}² / 162 = ${meterWeight} кг/м ; M = (${rodLength} м × ${rodCount} шт) × ${meterWeight} кг/м = ${totalWeightKg} кг (${totalWeightTons} т)`;

  return {
    totalLength,
    meterWeight,
    totalWeightKg,
    totalWeightTons,
    formula,
    formulaSubstituted,
  };
}
