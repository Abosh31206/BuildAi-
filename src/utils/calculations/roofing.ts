import { RoofingInputs, RoofingResult } from '../../types/calculator';

export function calculateRoofing(inputs: RoofingInputs): RoofingResult {
  const { roofType, buildingLength, buildingWidth, slopeAngleDeg, overhangMeters, materialType, wastePercent } = inputs;

  if (buildingLength <= 0 || buildingWidth <= 0) {
    throw new Error('Размеры здания должны быть больше нуля');
  }

  const safeOverhang = Math.max(0, overhangMeters || 0.5);
  const totalL = buildingLength + 2 * safeOverhang;
  const totalW = buildingWidth + 2 * safeOverhang;
  const projectionArea = Number((totalL * totalW).toFixed(2));

  const rad = (Math.max(1, Math.min(85, slopeAngleDeg || 25)) * Math.PI) / 180;
  const cosAlpha = Math.cos(rad);

  let actualSlopeArea = 0;
  let ridgeLengthMeters = 0;
  let eavesLengthMeters = 0;

  if (roofType === 'single') {
    actualSlopeArea = projectionArea / cosAlpha;
    ridgeLengthMeters = totalL;
    eavesLengthMeters = 2 * totalL + 2 * totalW;
  } else if (roofType === 'gable') {
    actualSlopeArea = projectionArea / cosAlpha;
    ridgeLengthMeters = totalL;
    eavesLengthMeters = 2 * totalL;
  } else if (roofType === 'hip') {
    // 4 slopes
    actualSlopeArea = projectionArea / cosAlpha;
    ridgeLengthMeters = Math.max(0, totalL - totalW);
    eavesLengthMeters = 2 * (totalL + totalW);
  } else {
    // flat (уклон 1-3 градуса)
    actualSlopeArea = projectionArea * 1.02;
    ridgeLengthMeters = 0;
    eavesLengthMeters = 2 * (totalL + totalW);
  }

  actualSlopeArea = Number(actualSlopeArea.toFixed(2));
  ridgeLengthMeters = Number(ridgeLengthMeters.toFixed(1));
  eavesLengthMeters = Number(eavesLengthMeters.toFixed(1));

  const safeWaste = Math.max(0, wastePercent || (materialType === 'metal_tile' ? 10 : 7));
  const totalAreaWithWaste = Number((actualSlopeArea * (1 + safeWaste / 100)).toFixed(2));

  // Membrane standard roll = 75 m² (with 10% overlap -> ~65 m² effective)
  const membraneRolls = Math.ceil(actualSlopeArea / 65);

  // Fastening screws: ~8 pcs per m² of metal/soft roofing
  const screwsPcs = Math.ceil(totalAreaWithWaste * 8);

  const formula = 'S_проекции = (L + 2c) × (B + 2c) ; S_скатов = S_проекции / cos(α)';
  const formulaSubstituted = `S_проекции = ${totalL} × ${totalW} = ${projectionArea} м² ; S_скатов = ${projectionArea} / cos(${slopeAngleDeg}°) = ${actualSlopeArea} м² (с запасом ${safeWaste}%: ${totalAreaWithWaste} м²)`;

  return {
    projectionArea,
    actualSlopeArea,
    totalAreaWithWaste,
    ridgeLengthMeters,
    eavesLengthMeters,
    membraneRolls,
    screwsPcs,
    formula,
    formulaSubstituted,
  };
}
