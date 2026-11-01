import React, { useState } from 'react';
import { useTranslation } from '../locales/LanguageContext';
import { InputGroup } from '../components/InputGroup';
import { ResultDisplay, ResultItem } from '../components/ResultDisplay';
import { FormulaDisplay } from '../components/FormulaDisplay';
import { calculateMasonry } from '../utils/calculations/masonry';
import { MasonryInputs, MasonryResult, CalculationHistoryItem } from '../types/calculator';
import { formatNumber } from '../utils/formatters';
import { RotateCcw, Calculator, Layers } from 'lucide-react';

interface MasonryCalculatorProps {
  onSaveHistory: (item: CalculationHistoryItem) => void;
  onPrintReport: (item: CalculationHistoryItem) => void;
  initialInputs?: Partial<MasonryInputs>;
}

type BrickPresetType = 'single' | 'thickened' | 'double' | 'custom';

export const MasonryCalculator: React.FC<MasonryCalculatorProps> = ({
  onSaveHistory,
  onPrintReport,
  initialInputs,
}) => {
  const { t } = useTranslation();

  const [wallLength, setWallLength] = useState<number | string>(initialInputs?.wallLength ?? 10.0);
  const [wallHeight, setWallHeight] = useState<number | string>(initialInputs?.wallHeight ?? 2.8);
  const [wallThickness, setWallThickness] = useState<number | string>(initialInputs?.wallThickness ?? 0.38);

  const [brickPreset, setBrickPreset] = useState<BrickPresetType>('single');
  const [brickLength, setBrickLength] = useState<number | string>(initialInputs?.brickLength ?? 250);
  const [brickWidth, setBrickWidth] = useState<number | string>(initialInputs?.brickWidth ?? 120);
  const [brickHeight, setBrickHeight] = useState<number | string>(initialInputs?.brickHeight ?? 65);

  const [mortarJoint, setMortarJoint] = useState<number | string>(initialInputs?.mortarJoint ?? 10);
  const [openingsArea, setOpeningsArea] = useState<number | string>(initialInputs?.openingsArea ?? 4.5);
  const [wastePercent, setWastePercent] = useState<number | string>(initialInputs?.wastePercent ?? 5);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<MasonryResult | null>(null);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);

  const handlePresetChange = (type: BrickPresetType) => {
    setBrickPreset(type);
    if (type === 'single') {
      setBrickLength(250);
      setBrickWidth(120);
      setBrickHeight(65);
    } else if (type === 'thickened') {
      setBrickLength(250);
      setBrickWidth(120);
      setBrickHeight(88);
    } else if (type === 'double') {
      setBrickLength(250);
      setBrickWidth(120);
      setBrickHeight(138);
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (wallLength === '' || Number(wallLength) <= 0) {
      errs.wallLength = t('errors.positiveNumber');
    }
    if (wallHeight === '' || Number(wallHeight) <= 0) {
      errs.wallHeight = t('errors.positiveNumber');
    }
    if (wallThickness === '' || Number(wallThickness) <= 0) {
      errs.wallThickness = t('errors.positiveNumber');
    }

    if (brickLength === '' || Number(brickLength) <= 0) {
      errs.brickLength = t('errors.positiveNumber');
    }
    if (brickWidth === '' || Number(brickWidth) <= 0) {
      errs.brickWidth = t('errors.positiveNumber');
    }
    if (brickHeight === '' || Number(brickHeight) <= 0) {
      errs.brickHeight = t('errors.positiveNumber');
    }

    if (mortarJoint === '' || Number(mortarJoint) < 0) {
      errs.mortarJoint = t('errors.positiveNumber');
    }

    const gross = Number(wallLength) * Number(wallHeight);
    if (openingsArea !== '' && Number(openingsArea) >= gross) {
      errs.openingsArea = t('errors.openingsTooBig');
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCalculate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validate()) return;

    try {
      const inputs: MasonryInputs = {
        wallLength: Number(wallLength),
        wallHeight: Number(wallHeight),
        wallThickness: Number(wallThickness),
        brickLength: Number(brickLength),
        brickWidth: Number(brickWidth),
        brickHeight: Number(brickHeight),
        mortarJoint: Number(mortarJoint),
        openingsArea: Number(openingsArea) || 0,
        wastePercent: Number(wastePercent) || 0,
      };

      const res = calculateMasonry(inputs);
      setResult(res);

      const historyItem: CalculationHistoryItem = {
        id: 'calc_' + Date.now(),
        calculatorId: 'masonry',
        calculatorTitle: t('calculatorCards.masonry.title'),
        timestamp: Date.now(),
        inputs: {
          'Длина стены (L)': `${wallLength} м`,
          'Высота стены (H)': `${wallHeight} м`,
          'Толщина стены (T)': `${wallThickness} м`,
          'Размер кирпича': `${brickLength}×${brickWidth}×${brickHeight} мм`,
          'Шов раствора': `${mortarJoint} мм`,
          'Площадь проёмов': `${openingsArea} м²`,
          'Запас на бой': `${wastePercent}%`,
        },
        inputLabels: {
          'Длина стены (L)': 'м',
          'Высота стены (H)': 'м',
          'Толщина стены (T)': 'м',
          'Размер кирпича': 'мм',
          'Шов раствора': 'мм',
          'Площадь проёмов': 'м²',
          'Запас на бой': '%',
        },
        results: [
          {
            label: t('masonryCalc.totalBricksWithWaste'),
            value: formatNumber(res.totalBricksWithWaste, 0),
            unit: 'шт.',
            isPrimary: true,
          },
          {
            label: t('masonryCalc.netArea'),
            value: formatNumber(res.netArea, 2),
            unit: 'м²',
          },
          {
            label: t('masonryCalc.masonryVolume'),
            value: formatNumber(res.masonryVolume, 3),
            unit: 'м³',
          },
          {
            label: t('masonryCalc.mortarVolume'),
            value: formatNumber(res.mortarVolumeEstimate, 3),
            unit: 'м³',
          },
        ],
        formulaText: res.formula,
        formulaSubstituted: res.formulaSubstituted,
        normReference: 'СП РК 5.02-102-2014 / Каменные и армокаменные конструкции',
      };

      onSaveHistory(historyItem);
      setLastSavedId(historyItem.id);
    } catch (err: any) {
      setErrors({ global: err.message || 'Ошибка расчёта' });
    }
  };

  const handleReset = () => {
    setWallLength(10.0);
    setWallHeight(2.8);
    setWallThickness(0.38);
    handlePresetChange('single');
    setMortarJoint(10);
    setOpeningsArea(4.5);
    setWastePercent(5);
    setErrors({});
    setResult(null);
    setLastSavedId(null);
  };

  const wallThicknessPresets = [
    { label: '0.12 м (1/2)', value: 0.12 },
    { label: '0.25 м (1)', value: 0.25 },
    { label: '0.38 м (1.5)', value: 0.38 },
    { label: '0.51 м (2)', value: 0.51 },
    { label: '0.64 м (2.5)', value: 0.64 },
  ];

  const resultItems: ResultItem[] = result
    ? [
        {
          label: t('masonryCalc.totalBricksWithWaste'),
          value: formatNumber(result.totalBricksWithWaste, 0),
          unit: 'шт.',
          isPrimary: true,
          helperText: `С учётом коэффициента запаса на резку и бой ${wastePercent}%`,
        },
        {
          label: t('masonryCalc.netArea'),
          value: formatNumber(result.netArea, 2),
          unit: 'м²',
          helperText: `Чистая площадь стен (${wallLength} × ${wallHeight} за вычетом ${openingsArea} м² проёмов)`,
        },
        {
          label: t('masonryCalc.masonryVolume'),
          value: formatNumber(result.masonryVolume, 3),
          unit: 'м³',
          helperText: 'Физический объём кладки с толщиной стены ' + wallThickness + ' м',
        },
        {
          label: t('masonryCalc.bricksWithoutWaste'),
          value: formatNumber(result.bricksWithoutWaste, 0),
          unit: 'шт.',
          helperText: 'Теоретическая потребность без технологического запаса',
        },
        {
          label: t('masonryCalc.mortarVolume'),
          value: formatNumber(result.mortarVolumeEstimate, 3),
          unit: 'м³',
          helperText: `Ориентировочный объём кладочного раствора (толщина шва ${mortarJoint} мм)`,
        },
        {
          label: t('masonryCalc.palletCount'),
          value: result.palletCountEstimate,
          unit: 'поддонов',
          helperText: 'При стандартной заводской укладке на поддон',
        },
      ]
    : [];

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 shadow-xs">
      <div className="border-b border-slate-200 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {t('masonryCalc.title')}
          </h2>
          <span className="text-xs font-mono text-slate-500 font-semibold bg-slate-100 px-2 py-1 rounded">
            СП РК 5.02-102
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {t('masonryCalc.desc')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Inputs */}
        <form onSubmit={handleCalculate} className="lg:col-span-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <InputGroup
              id="masonry-len"
              label={t('masonryCalc.wallLengthLabel')}
              value={wallLength}
              onChange={setWallLength}
              unit="м"
              placeholder="10.0"
              error={errors.wallLength}
              min={0.1}
              step={0.1}
            />

            <InputGroup
              id="masonry-h"
              label={t('masonryCalc.wallHeightLabel')}
              value={wallHeight}
              onChange={setWallHeight}
              unit="м"
              placeholder="2.8"
              error={errors.wallHeight}
              min={0.1}
              step={0.1}
            />

            <div>
              <InputGroup
                id="masonry-thick"
                label={t('masonryCalc.wallThicknessLabel')}
                value={wallThickness}
                onChange={setWallThickness}
                unit="м"
                placeholder="0.38"
                error={errors.wallThickness}
                min={0.05}
                step={0.01}
              />
              <div className="flex flex-wrap gap-1 mt-1">
                {wallThicknessPresets.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setWallThickness(p.value)}
                    className={`text-[9px] font-mono px-1 py-0.5 rounded transition-colors ${
                      Number(wallThickness) === p.value
                        ? 'bg-blue-900 text-white font-semibold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Brick Size Selector */}
          <div className="bg-slate-50 p-3.5 rounded border border-slate-200 space-y-2.5">
            <label className="text-xs font-semibold text-slate-800 block">
              {t('masonryCalc.brickSizeLabel')}
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => handlePresetChange('single')}
                className={`p-2 rounded text-left transition-colors border ${
                  brickPreset === 'single'
                    ? 'bg-blue-900 text-white border-blue-900 font-semibold'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="font-medium text-[11px]">Одинарный (1.0НФ)</div>
                <div className={`text-[10px] font-mono mt-0.5 ${brickPreset === 'single' ? 'text-blue-200' : 'text-slate-400'}`}>
                  250×120×65 мм
                </div>
              </button>

              <button
                type="button"
                onClick={() => handlePresetChange('thickened')}
                className={`p-2 rounded text-left transition-colors border ${
                  brickPreset === 'thickened'
                    ? 'bg-blue-900 text-white border-blue-900 font-semibold'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="font-medium text-[11px]">Утолщенный (1.4НФ)</div>
                <div className={`text-[10px] font-mono mt-0.5 ${brickPreset === 'thickened' ? 'text-blue-200' : 'text-slate-400'}`}>
                  250×120×88 мм
                </div>
              </button>

              <button
                type="button"
                onClick={() => handlePresetChange('double')}
                className={`p-2 rounded text-left transition-colors border ${
                  brickPreset === 'double'
                    ? 'bg-blue-900 text-white border-blue-900 font-semibold'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="font-medium text-[11px]">Двойной (2.1НФ)</div>
                <div className={`text-[10px] font-mono mt-0.5 ${brickPreset === 'double' ? 'text-blue-200' : 'text-slate-400'}`}>
                  250×120×138 мм
                </div>
              </button>
            </div>

            {/* Custom dimensions if needed */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <InputGroup
                id="brick-l"
                label="Длина кирпича"
                value={brickLength}
                onChange={(val) => {
                  setBrickLength(val);
                  setBrickPreset('custom');
                }}
                unit="мм"
                placeholder="250"
                error={errors.brickLength}
                min={50}
                step={5}
              />
              <InputGroup
                id="brick-w"
                label="Ширина кирпича"
                value={brickWidth}
                onChange={(val) => {
                  setBrickWidth(val);
                  setBrickPreset('custom');
                }}
                unit="мм"
                placeholder="120"
                error={errors.brickWidth}
                min={50}
                step={5}
              />
              <InputGroup
                id="brick-h"
                label="Высота кирпича"
                value={brickHeight}
                onChange={(val) => {
                  setBrickHeight(val);
                  setBrickPreset('custom');
                }}
                unit="мм"
                placeholder="65"
                error={errors.brickHeight}
                min={30}
                step={5}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <InputGroup
              id="masonry-joint"
              label={t('masonryCalc.jointLabel')}
              value={mortarJoint}
              onChange={setMortarJoint}
              unit="мм"
              placeholder="10"
              error={errors.mortarJoint}
              helperText="Обычно 10-12 мм"
              min={0}
              max={30}
              step={1}
            />

            <InputGroup
              id="masonry-openings"
              label={t('masonryCalc.openingsLabel')}
              value={openingsArea}
              onChange={setOpeningsArea}
              unit="м²"
              placeholder="0"
              error={errors.openingsArea}
              helperText="Окна и двери"
              min={0}
              step={0.5}
            />

            <InputGroup
              id="masonry-waste"
              label={t('masonryCalc.wasteLabel')}
              value={wastePercent}
              onChange={setWastePercent}
              unit="%"
              placeholder="5"
              min={0}
              max={20}
              step={1}
              presets={[
                { label: '3%', value: 3 },
                { label: '5%', value: 5 },
                { label: '7%', value: 7 },
              ]}
            />
          </div>

          {errors.global && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700">
              {errors.global}
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="submit"
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors shadow-xs"
            >
              <Calculator className="w-4 h-4 text-blue-400" />
              <span>{t('buttons.calculate')}</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
              title={t('buttons.reset')}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Results & Formula */}
        <div className="lg:col-span-6 space-y-4">
          {result ? (
            <>
              <ResultDisplay
                results={resultItems}
                disclaimer={t('masonryCalc.approxDisclaimer')}
                onPrint={() => {
                  const historyItem: CalculationHistoryItem = {
                    id: lastSavedId || 'calc_' + Date.now(),
                    calculatorId: 'masonry',
                    calculatorTitle: t('calculatorCards.masonry.title'),
                    timestamp: Date.now(),
                    inputs: {
                      'Длина стены (L)': `${wallLength} м`,
                      'Высота стены (H)': `${wallHeight} м`,
                      'Толщина стены (T)': `${wallThickness} м`,
                      'Размер кирпича': `${brickLength}×${brickWidth}×${brickHeight} мм`,
                      'Толщина шва': `${mortarJoint} мм`,
                      'Площадь проемов': `${openingsArea} м²`,
                      'Запас на бой': `${wastePercent}%`,
                    },
                    inputLabels: {
                      'Длина стены (L)': 'м',
                      'Высота стены (H)': 'м',
                      'Толщина стены (T)': 'м',
                      'Размер кирпича': 'мм',
                      'Толщина шва': 'мм',
                      'Площадь проемов': 'м²',
                      'Запас на бой': '%',
                    },
                    results: resultItems.map((r) => ({
                      label: r.label,
                      value: String(r.value),
                      unit: r.unit,
                      isPrimary: r.isPrimary,
                      helperText: r.helperText,
                    })),
                    formulaText: result.formula,
                    formulaSubstituted: result.formulaSubstituted,
                    normReference: 'СП РК 5.02-102-2014',
                  };
                  onPrintReport(historyItem);
                }}
              />

              <FormulaDisplay
                formulaTitle={t('masonryCalc.formulaHeading')}
                formula={result.formula}
                formulaSubstituted={result.formulaSubstituted}
                explanation={t('masonryCalc.formulaDescription')}
                normReference="СП РК 5.02-102-2014 «Каменные и армокаменные конструкции»"
              />
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded p-8 text-center bg-slate-50/50 min-h-[260px]">
              <div className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <Layers className="w-6 h-6 text-slate-500" />
              </div>
              <h4 className="text-sm font-semibold text-slate-700">
                Задайте параметры кладки стены
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Расчёт чистой площади без проемов, количества кирпича по типоразмеру и ориентировочного объема раствора.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
