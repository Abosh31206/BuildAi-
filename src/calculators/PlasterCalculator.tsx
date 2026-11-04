import React, { useState } from 'react';
import { useTranslation } from '../locales/LanguageContext';
import { InputGroup } from '../components/InputGroup';
import { ResultDisplay, ResultItem } from '../components/ResultDisplay';
import { FormulaDisplay } from '../components/FormulaDisplay';
import { calculatePlaster } from '../utils/calculations/plaster';
import { PlasterInputs, PlasterResult, CalculationHistoryItem } from '../types/calculator';
import { formatNumber } from '../utils/formatters';
import { RotateCcw, Calculator, Sparkles } from 'lucide-react';

interface PlasterCalculatorProps {
  onSaveHistory: (item: CalculationHistoryItem) => void;
  onPrintReport: (item: CalculationHistoryItem) => void;
  initialInputs?: Partial<PlasterInputs>;
}

export const PlasterCalculator: React.FC<PlasterCalculatorProps> = ({
  onSaveHistory,
  onPrintReport,
  initialInputs,
}) => {
  const { t } = useTranslation();

  const [wallLength, setWallLength] = useState<number | string>(initialInputs?.wallLength ?? 12.0);
  const [wallHeight, setWallHeight] = useState<number | string>(initialInputs?.wallHeight ?? 2.8);
  const [openingsArea, setOpeningsArea] = useState<number | string>(initialInputs?.openingsArea ?? 4.0);
  const [layerThicknessMm, setLayerThicknessMm] = useState<number | string>(initialInputs?.layerThicknessMm ?? 15);
  const [mixType, setMixType] = useState<'gypsum' | 'cement' | 'facade'>(initialInputs?.mixType ?? 'gypsum');
  const [bagWeightKg, setBagWeightKg] = useState<number | string>(initialInputs?.bagWeightKg ?? 30);
  const [wastePercent, setWastePercent] = useState<number | string>(initialInputs?.wastePercent ?? 5);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<PlasterResult | null>(null);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (wallLength === '' || Number(wallLength) <= 0) errs.wallLength = t('errors.positiveNumber');
    if (wallHeight === '' || Number(wallHeight) <= 0) errs.wallHeight = t('errors.positiveNumber');
    if (layerThicknessMm === '' || Number(layerThicknessMm) <= 0) errs.layerThicknessMm = t('errors.positiveNumber');

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
      const inputs: PlasterInputs = {
        wallLength: Number(wallLength),
        wallHeight: Number(wallHeight),
        openingsArea: Number(openingsArea) || 0,
        layerThicknessMm: Number(layerThicknessMm),
        mixType,
        bagWeightKg: Number(bagWeightKg),
        wastePercent: Number(wastePercent) || 0,
      };

      const res = calculatePlaster(inputs);
      setResult(res);

      const mixNames = {
        gypsum: 'Гипсовая штукатурка (~8.5 кг/м²/10мм)',
        cement: 'Цементно-песчаная (~16.5 кг/м²/10мм)',
        facade: 'Фасадная декоративная (~12 кг/м²/10мм)',
      };

      const historyItem: CalculationHistoryItem = {
        id: 'calc_' + Date.now(),
        calculatorId: 'plaster',
        calculatorTitle: 'Калькулятор штукатурки',
        timestamp: Date.now(),
        inputs: {
          'Длина стен (L)': `${wallLength} м`,
          'Высота стен (H)': `${wallHeight} м`,
          'Толщина слоя': `${layerThicknessMm} мм`,
          'Тип смеси': mixNames[mixType],
          'Проёмы': `${openingsArea} м²`,
          'Запас': `${wastePercent}%`,
        },
        inputLabels: {
          'Длина стен (L)': 'м',
          'Высота стен (H)': 'м',
          'Толщина слоя': 'мм',
          'Тип смеси': '',
          'Проёмы': 'м²',
          'Запас': '%',
        },
        results: [
          {
            label: 'Необходимое количество мешков',
            value: res.totalBags,
            unit: 'мешков',
            isPrimary: true,
            helperText: `По ${bagWeightKg} кг с учётом запаса ${wastePercent}%`,
          },
          {
            label: 'Общая масса сухой смеси',
            value: formatNumber(res.totalWeightKg, 1),
            unit: 'кг',
          },
          {
            label: 'Чистая площадь оштукатуривания',
            value: formatNumber(res.netArea, 2),
            unit: 'м²',
          },
          {
            label: 'Грунтовка глубокого проникновения',
            value: formatNumber(res.primerLiters, 1),
            unit: 'л',
          },
          {
            label: 'Маячковые профили',
            value: formatNumber(res.beaconProfilesMeters, 1),
            unit: 'пог. м',
          },
        ],
        formulaText: res.formula,
        formulaSubstituted: res.formulaSubstituted,
        normReference: 'СП РК 1.03-108-2017 / Отделочные работы',
      };

      onSaveHistory(historyItem);
      setLastSavedId(historyItem.id);
    } catch (err: any) {
      setErrors({ global: err.message || 'Ошибка расчёта' });
    }
  };

  const handleReset = () => {
    setWallLength(12.0);
    setWallHeight(2.8);
    setOpeningsArea(4.0);
    setLayerThicknessMm(15);
    setMixType('gypsum');
    setBagWeightKg(30);
    setWastePercent(5);
    setErrors({});
    setResult(null);
    setLastSavedId(null);
  };

  const resultItems: ResultItem[] = result
    ? [
        {
          label: 'Требуется мешков смеси',
          value: result.totalBags,
          unit: 'мешков',
          isPrimary: true,
          helperText: `Фасовка по ${bagWeightKg} кг, масса: ${formatNumber(result.totalWeightKg, 1)} кг`,
        },
        {
          label: 'Чистая площадь стен',
          value: formatNumber(result.netArea, 2),
          unit: 'м²',
          helperText: `Общая ${result.grossArea} м² за вычетом ${openingsArea} м² проёмов`,
        },
        {
          label: 'Грунтовка глубокого проникновения',
          value: formatNumber(result.primerLiters, 1),
          unit: 'литров',
          helperText: 'Расход 0.15 л/м² для укрепления основания и обеспыливания',
        },
        {
          label: 'Маячковые профили',
          value: formatNumber(result.beaconProfilesMeters, 1),
          unit: 'пог. м',
          helperText: 'С шагом установки 1.0–1.2 м под правило',
        },
      ]
    : [];

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 shadow-xs">
      <div className="border-b border-slate-200 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Калькулятор штукатурки стен
          </h2>
          <span className="text-xs font-mono text-slate-500 font-semibold bg-slate-100 px-2 py-1 rounded">
            СП РК 1.03-108
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Расчёт расхода гипсовой, цементной и фасадной штукатурки, количества мешков, грунтовки и маяков.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <form onSubmit={handleCalculate} className="lg:col-span-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <InputGroup
              id="plaster-l"
              label="Длина стен (L)"
              value={wallLength}
              onChange={setWallLength}
              unit="м"
              placeholder="12.0"
              error={errors.wallLength}
              min={0.1}
              step={0.5}
            />

            <InputGroup
              id="plaster-h"
              label="Высота стен (H)"
              value={wallHeight}
              onChange={setWallHeight}
              unit="м"
              placeholder="2.8"
              error={errors.wallHeight}
              min={0.1}
              step={0.1}
            />

            <InputGroup
              id="plaster-thick"
              label="Толщина слоя"
              value={layerThicknessMm}
              onChange={setLayerThicknessMm}
              unit="мм"
              placeholder="15"
              error={errors.layerThicknessMm}
              min={1}
              max={80}
              step={1}
              presets={[
                { label: '10 мм', value: 10 },
                { label: '15 мм', value: 15 },
                { label: '20 мм', value: 20 },
                { label: '30 мм', value: 30 },
              ]}
            />
          </div>

          {/* Mix Type Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Тип штукатурной смеси
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMixType('gypsum')}
                className={`p-2.5 rounded border text-left text-xs transition-colors ${
                  mixType === 'gypsum'
                    ? 'bg-blue-900 text-white border-blue-900 font-semibold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="font-medium text-[11px]">Гипсовая</div>
                <div className={`text-[10px] mt-0.5 ${mixType === 'gypsum' ? 'text-blue-200' : 'text-slate-400'}`}>
                  ~8.5 кг/м²/10мм
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMixType('cement')}
                className={`p-2.5 rounded border text-left text-xs transition-colors ${
                  mixType === 'cement'
                    ? 'bg-blue-900 text-white border-blue-900 font-semibold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="font-medium text-[11px]">Цементная</div>
                <div className={`text-[10px] mt-0.5 ${mixType === 'cement' ? 'text-blue-200' : 'text-slate-400'}`}>
                  ~16.5 кг/м²/10мм
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMixType('facade')}
                className={`p-2.5 rounded border text-left text-xs transition-colors ${
                  mixType === 'facade'
                    ? 'bg-blue-900 text-white border-blue-900 font-semibold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="font-medium text-[11px]">Фасадная</div>
                <div className={`text-[10px] mt-0.5 ${mixType === 'facade' ? 'text-blue-200' : 'text-slate-400'}`}>
                  ~12.0 кг/м²/10мм
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <InputGroup
              id="plaster-openings"
              label="Площадь проемов"
              value={openingsArea}
              onChange={setOpeningsArea}
              unit="м²"
              placeholder="4.0"
              error={errors.openingsArea}
              min={0}
              step={0.5}
            />

            <InputGroup
              id="plaster-bag"
              label="Вес мешка"
              value={bagWeightKg}
              onChange={setBagWeightKg}
              unit="кг"
              placeholder="30"
              presets={[
                { label: '25 кг', value: 25 },
                { label: '30 кг', value: 30 },
                { label: '50 кг', value: 50 },
              ]}
            />

            <InputGroup
              id="plaster-waste"
              label="Запас на потери"
              value={wastePercent}
              onChange={setWastePercent}
              unit="%"
              placeholder="5"
              presets={[
                { label: '3%', value: 3 },
                { label: '5%', value: 5 },
                { label: '8%', value: 8 },
              ]}
            />
          </div>

          {errors.global && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700">
              {errors.global}
            </div>
          )}

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

        <div className="lg:col-span-6 space-y-4">
          {result ? (
            <>
              <ResultDisplay
                results={resultItems}
                onPrint={() => {
                  if (lastSavedId) {
                    const item: CalculationHistoryItem = {
                      id: lastSavedId,
                      calculatorId: 'plaster',
                      calculatorTitle: 'Калькулятор штукатурки',
                      timestamp: Date.now(),
                      inputs: {
                        'Длина стен (L)': `${wallLength} м`,
                        'Высота стен (H)': `${wallHeight} м`,
                        'Толщина слоя': `${layerThicknessMm} мм`,
                        'Тип смеси': mixType,
                        'Проёмы': `${openingsArea} м²`,
                        'Запас': `${wastePercent}%`,
                      },
                      inputLabels: {
                        'Длина стен (L)': 'м',
                        'Высота стен (H)': 'м',
                        'Толщина слоя': 'мм',
                        'Тип смеси': '',
                        'Проёмы': 'м²',
                        'Запас': '%',
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
                      normReference: 'СП РК 1.03-108-2017',
                    };
                    onPrintReport(item);
                  }
                }}
              />

              <FormulaDisplay
                formulaTitle="Формула расхода штукатурки"
                formula={result.formula}
                formulaSubstituted={result.formulaSubstituted}
                explanation="Расход сухой смеси рассчитывается по норме на 10 мм слоя для выбранного вяжущего с добавлением технологического процента запаса."
                normReference="СП РК 1.03-108-2017 «Отделочные покрытия зданий и сооружений»"
              />
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded p-8 text-center bg-slate-50/50 min-h-[260px]">
              <div className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <Calculator className="w-6 h-6 text-slate-500" />
              </div>
              <h4 className="text-sm font-semibold text-slate-700">
                Задайте параметры оштукатуривания
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Расчёт площади за вычетом проемов, требуемого веса смеси, мешков и грунтовки.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
