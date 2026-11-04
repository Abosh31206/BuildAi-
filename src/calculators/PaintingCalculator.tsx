import React, { useState } from 'react';
import { useTranslation } from '../locales/LanguageContext';
import { InputGroup } from '../components/InputGroup';
import { ResultDisplay, ResultItem } from '../components/ResultDisplay';
import { FormulaDisplay } from '../components/FormulaDisplay';
import { calculatePainting } from '../utils/calculations/painting';
import { PaintingInputs, PaintingResult, CalculationHistoryItem } from '../types/calculator';
import { formatNumber } from '../utils/formatters';
import { RotateCcw, Calculator, Paintbrush } from 'lucide-react';

interface PaintingCalculatorProps {
  onSaveHistory: (item: CalculationHistoryItem) => void;
  onPrintReport: (item: CalculationHistoryItem) => void;
  initialInputs?: Partial<PaintingInputs>;
}

export const PaintingCalculator: React.FC<PaintingCalculatorProps> = ({
  onSaveHistory,
  onPrintReport,
  initialInputs,
}) => {
  const { t } = useTranslation();

  const [surfaceArea, setSurfaceArea] = useState<number | string>(initialInputs?.surfaceArea ?? 85.0);
  const [layersCount, setLayersCount] = useState<number | string>(initialInputs?.layersCount ?? 2);
  const [paintType, setPaintType] = useState<'acrylic' | 'latex' | 'silicone' | 'enamel'>(
    initialInputs?.paintType ?? 'acrylic'
  );
  const [surfaceType, setSurfaceType] = useState<'smooth' | 'rough' | 'drywall' | 'wood'>(
    initialInputs?.surfaceType ?? 'smooth'
  );
  const [canSizeLiters, setCanSizeLiters] = useState<number | string>(initialInputs?.canSizeLiters ?? 10);
  const [reservePercent, setReservePercent] = useState<number | string>(initialInputs?.reservePercent ?? 5);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<PaintingResult | null>(null);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (surfaceArea === '' || Number(surfaceArea) <= 0) {
      errs.surfaceArea = t('errors.positiveNumber');
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCalculate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validate()) return;

    try {
      const inputs: PaintingInputs = {
        surfaceArea: Number(surfaceArea),
        layersCount: Number(layersCount),
        paintType,
        surfaceType,
        canSizeLiters: Number(canSizeLiters),
        reservePercent: Number(reservePercent) || 0,
      };

      const res = calculatePainting(inputs);
      setResult(res);

      const paintNames = {
        acrylic: 'Акриловая водно-дисперсионная',
        latex: 'Латексная моющаяся',
        silicone: 'Силиконовая паропроницаемая',
        enamel: 'Алкидная эмаль',
      };

      const historyItem: CalculationHistoryItem = {
        id: 'calc_' + Date.now(),
        calculatorId: 'painting',
        calculatorTitle: 'Калькулятор покраски',
        timestamp: Date.now(),
        inputs: {
          'Площадь окрашивания': `${surfaceArea} м²`,
          'Количество слоёв': `${layersCount}`,
          'Тип краски': paintNames[paintType],
          'Материал поверхности': surfaceType,
          'Запас': `${reservePercent}%`,
        },
        inputLabels: {
          'Площадь окрашивания': 'м²',
          'Количество слоёв': '',
          'Тип краски': '',
          'Материал поверхности': '',
          'Запас': '%',
        },
        results: [
          {
            label: 'Общий требуемый объём краски',
            value: formatNumber(res.totalPaintLiters, 1),
            unit: 'литров',
            isPrimary: true,
            helperText: `Масса: ~${formatNumber(res.totalPaintKg, 1)} кг (в ${res.cansCount} банках по ${canSizeLiters} л)`,
          },
          {
            label: 'Грунтовка глубокого проникновения',
            value: formatNumber(res.primerLiters, 1),
            unit: 'литров',
            helperText: 'Обеспечивает равномерное впитывание и снижает расход краски',
          },
          {
            label: 'Малярная лента для контуров',
            value: `${res.maskingTapeMeters}`,
            unit: 'пог. м',
            helperText: 'Защита смежных поверхностей, плинтусов и откосов',
          },
        ],
        formulaText: res.formula,
        formulaSubstituted: res.formulaSubstituted,
        normReference: 'СП РК 1.03-108-2017 / Малярные покрытия',
      };

      onSaveHistory(historyItem);
      setLastSavedId(historyItem.id);
    } catch (err: any) {
      setErrors({ global: err.message || 'Ошибка расчёта' });
    }
  };

  const handleReset = () => {
    setSurfaceArea(85.0);
    setLayersCount(2);
    setPaintType('acrylic');
    setSurfaceType('smooth');
    setCanSizeLiters(10);
    setReservePercent(5);
    setErrors({});
    setResult(null);
    setLastSavedId(null);
  };

  const resultItems: ResultItem[] = result
    ? [
        {
          label: 'Общий расход краски',
          value: formatNumber(result.totalPaintLiters, 1),
          unit: 'литров',
          isPrimary: true,
          helperText: `Ориентировочно ${result.cansCount} банок по ${canSizeLiters} л (масса ~${formatNumber(result.totalPaintKg, 1)} кг)`,
        },
        {
          label: 'Грунтовка под покраску',
          value: formatNumber(result.primerLiters, 1),
          unit: 'литров',
          helperText: 'Грунт глубокого проникновения в 1 слой для обеспыливания',
        },
        {
          label: 'Малярный скотч (лента)',
          value: result.maskingTapeMeters,
          unit: 'пог. м',
          helperText: 'Для защиты потолочных галтелей, розеток и плинтусов',
        },
      ]
    : [];

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 shadow-xs">
      <div className="border-b border-slate-200 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Калькулятор покраски стен и потолков
          </h2>
          <span className="text-xs font-mono text-slate-500 font-semibold bg-slate-100 px-2 py-1 rounded">
            СП РК 1.03-108
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Расчёт необходимого объёма краски в литрах и банках с учётом слоёв, пористости основания и грунтовки.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <form onSubmit={handleCalculate} className="lg:col-span-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <InputGroup
              id="paint-area"
              label="Площадь окрашивания"
              value={surfaceArea}
              onChange={setSurfaceArea}
              unit="м²"
              placeholder="85"
              error={errors.surfaceArea}
              min={1}
              step={5}
            />

            <InputGroup
              id="paint-layers"
              label="Количество слоёв"
              value={layersCount}
              onChange={setLayersCount}
              unit="сл."
              placeholder="2"
              presets={[
                { label: '1 слой', value: 1 },
                { label: '2 слоя', value: 2 },
                { label: '3 слоя', value: 3 },
              ]}
            />

            <InputGroup
              id="paint-can"
              label="Объём банки"
              value={canSizeLiters}
              onChange={setCanSizeLiters}
              unit="л"
              placeholder="10"
              presets={[
                { label: '2.5 л', value: 2.5 },
                { label: '5 л', value: 5 },
                { label: '10 л', value: 10 },
                { label: '14 л', value: 14 },
              ]}
            />
          </div>

          {/* Paint Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Тип лакокрасочного материала
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
              {[
                { id: 'acrylic', label: 'Акриловая' },
                { id: 'latex', label: 'Латексная' },
                { id: 'silicone', label: 'Силиконовая' },
                { id: 'enamel', label: 'Эмаль ПФ/алкид' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPaintType(p.id as any)}
                  className={`p-2 rounded border text-center transition-colors text-[11px] ${
                    paintType === p.id
                      ? 'bg-blue-900 text-white border-blue-900 font-semibold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Surface Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Материал основания (впитываемость)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
              {[
                { id: 'smooth', label: 'Гладкая шпаклёвка' },
                { id: 'drywall', label: 'Гипсокартон ГКЛ' },
                { id: 'rough', label: 'Фактурная штукатурка' },
                { id: 'wood', label: 'Древесина/ОСП' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSurfaceType(s.id as any)}
                  className={`p-2 rounded border text-center transition-colors text-[11px] ${
                    surfaceType === s.id
                      ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <InputGroup
            id="paint-reserve"
            label="Запас на неровности и потери"
            value={reservePercent}
            onChange={setReservePercent}
            unit="%"
            placeholder="5"
            presets={[
              { label: '3%', value: 3 },
              { label: '5%', value: 5 },
              { label: '10%', value: 10 },
            ]}
          />

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
                  const item: CalculationHistoryItem = {
                    id: lastSavedId || 'calc_' + Date.now(),
                    calculatorId: 'painting',
                    calculatorTitle: 'Калькулятор покраски',
                    timestamp: Date.now(),
                    inputs: {
                      'Площадь окрашивания': `${surfaceArea} м²`,
                      'Количество слоёв': `${layersCount}`,
                      'Тип краски': paintType,
                      'Поверхность': surfaceType,
                      'Запас': `${reservePercent}%`,
                    },
                    inputLabels: {
                      'Площадь окрашивания': 'м²',
                      'Количество слоёв': '',
                      'Тип краски': '',
                      'Поверхность': '',
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
                }}
              />

              <FormulaDisplay
                formulaTitle="Формула расхода лакокрасочных материалов"
                formula={result.formula}
                formulaSubstituted={result.formulaSubstituted}
                explanation="Расход краски вычисляется с учетом числа слоев, коэффициента впитываемости основания и снижения расхода на последующих слоях."
                normReference="СП РК 1.03-108-2017 «Отделочные покрытия»"
              />
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded p-8 text-center bg-slate-50/50 min-h-[260px]">
              <div className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <Paintbrush className="w-6 h-6 text-slate-500" />
              </div>
              <h4 className="text-sm font-semibold text-slate-700">
                Задайте площадь и характеристики окраски
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Расчёт литража, банок, грунтовки глубокого проникновения и защитной малярной ленты.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
