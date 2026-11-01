import { MasonryInputs, MasonryResult } from '../../types/calculator';

export function calculateMasonry(inputs: MasonryInputs): MasonryResult {
  const {
    wallLength,
    wallHeight,
    wallThickness,
    brickLength,
    brickWidth,
    brickHeight,
    mortarJoint,
    openingsArea,
    wastePercent,
  } = inputs;

  if (wallLength <= 0 || wallHeight <= 0 || wallThickness <= 0) {
    throw new Error('Размеры стены (длина, высота, толщина) должны быть больше нуля');
  }

  if (brickLength <= 0 || brickWidth <= 0 || brickHeight <= 0) {
    throw new Error('Геометрические размеры кирпича должны быть больше нуля');
  }

  const grossArea = Number((wallLength * wallHeight).toFixed(2));
  const safeOpenings = Math.max(0, openingsArea || 0);

  if (safeOpenings >= grossArea) {
    throw new Error('Площадь проемов не может превышать или быть равной общей площади стены');
  }

  const netArea = Number((grossArea - safeOpenings).toFixed(2));
  const masonryVolume = Number((netArea * wallThickness).toFixed(3));

  // Convert mm to meters
  const l_m = brickLength / 1000;
  const w_m = brickWidth / 1000;
  const h_m = brickHeight / 1000;
  const j_m = Math.max(0, mortarJoint) / 1000;

  // Single brick net solid volume without mortar
  const singleBrickVolume = l_m * w_m * h_m;

  // Unit volume with mortar seams
  const unitWithJointVolume = (l_m + j_m) * (w_m + j_m) * (h_m + j_m);

  // Theoretical count of bricks in masonry volume
  const rawBrickCount = masonryVolume / unitWithJointVolume;
  const bricksWithoutWaste = Math.round(rawBrickCount);

  const safeWaste = Math.max(0, wastePercent || 0);
  const totalBricksWithWaste = Math.ceil(bricksWithoutWaste * (1 + safeWaste / 100));

  // Estimated mortar volume: V_masonry - (bricksWithoutWaste * singleBrickVolume)
  const mortarVolumeEstimate = Number(
    Math.max(0, masonryVolume - bricksWithoutWaste * singleBrickVolume).toFixed(3)
  );

  // Standard pallet count (typically ~350-400 single bricks per pallet)
  const palletCapacity = brickHeight > 100 ? 200 : brickHeight > 75 ? 280 : 400;
  const palletCountEstimate = Math.ceil(totalBricksWithWaste / palletCapacity);

  const formula = 'S_нетто = (L × H) - S_проемов ; V_кладки = S_нетто × T ; N = V_кладки / V_кирпича_со_швом';
  const formulaSubstituted = `S_нетто = (${wallLength} × ${wallHeight}) - ${safeOpenings} = ${netArea} м² ; V_кл = ${netArea} м² × ${wallThickness} м = ${masonryVolume} м³ ; N ≈ ${totalBricksWithWaste} шт. (с запасом ${safeWaste}%)`;

  return {
    grossArea,
    netArea,
    masonryVolume,
    bricksWithoutWaste,
    totalBricksWithWaste,
    mortarVolumeEstimate,
    palletCountEstimate,
    formula,
    formulaSubstituted,
    isApproximate: true,
  };
}
