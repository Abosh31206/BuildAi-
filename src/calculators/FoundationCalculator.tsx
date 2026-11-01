import React, { useState } from 'react';
import { useTranslation } from '../locales/LanguageContext';
import { InputGroup } from '../components/InputGroup';
import { ResultDisplay, ResultItem } from '../components/ResultDisplay';
import { FormulaDisplay } from '../components/FormulaDisplay';
import { calculateFoundation } from '../utils/calculations/foundation';
import { FoundationInputs, FoundationResult, CalculationHistoryItem } from '../types/calculator';
import { formatNumber } from '../utils/formatters';
import { RotateCcw, Calculator } from 'lucide-react';

interface FoundationCalculatorProps {
  onSaveHistory: (item: CalculationHistoryItem) => void;
  onPrintReport: (item: CalculationHistoryItem) => void;
  initialInputs?: Partial<FoundationInputs>;
}

export const FoundationCalculator: React.FC<FoundationCalculatorProps> = ({
  onSaveHistory,
  onPrintReport,
  initialInputs,
}) => {
  const { t } = useTranslation();

  const [length, setLength] = useState<number | string>(initialInputs?.length ?? 10.0);
  const [width, setWidth] = useState<number | string>(initialInputs?.width ?? 8.0);
  const [height, setHeight] = useState<number | string>(initialInputs?.height ?? 0.3);
  const [reservePercent, setReservePercent] = useState<number | string>(initialInputs?.reservePercent ?? 5);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<FoundationResult | null>(null);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (length === '' || Number(length) <= 0) {
      errs.length = t('errors.positiveNumber');
    }
    if (width === '' || Number(width) <= 0) {
      errs.width = t('errors.positiveNumber');
    }
    if (height === '' || Number(height) <= 0) {
      errs.height = t('errors.positiveNumber');
    }
    if (reservePercent === '' || Number(reservePercent) < 0) {
      errs.reserve = t('errors.positiveNumber');
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCalculate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validate()) return;

    try {
      const inputs: FoundationInputs = {
        foundationType: 'slab',
        length: Number(length),
        width: Number(width),
        height: Number(height),
        reservePercent: Number(reservePercent),
      };

      const res = calculateFoundation(inputs);
      setResult(res);

      const historyItem: CalculationHistoryItem = {
        id: 'calc_' + Date.now(),
        calculatorId: 'foundation',
        calculatorTitle: t('calculatorCards.foundation.title'),
        timestamp: Date.now(),
        inputs: {
          'Длина фундамента (L)': `${length} м`,
          'Ширина фундамента (B)': `${width} м`,
          'Высота / толщина (H)': `${height} м`,
          'Запас на неровности': `${reservePercent}%`,
        },
        inputLabels: {
          'Длина фундамента (L)': 'м',
          'Ширина фундамента (B)': 'м',
          'Высота / толщина (H)': 'м',
          'Запас на неровности': '%',
        },
        results: [
          {
            label: t('foundationCalc.totalConcreteVolume'),
            value: formatNumber(res.totalConcreteVolume, 3),
            unit: 'м³',
            isPrimary: true,
          },
          {
            label: t('foundationCalc.baseArea'),
            value: formatNumber(res.baseArea, 2),
            unit: 'м²',
          },
          {
            label: t('foundationCalc.concreteVolume'),
            value: formatNumber(res.concreteVolume, 3),
            unit: 'м³',
          },
          {
            label: t('foundationCalc.lateralFormworkArea'),
            value: formatNumber(res.lateralFormworkArea, 2),
            unit: 'м²',
          },
        ],
        formulaText: res.formula,
        formulaSubstituted: res.formulaSubstituted,
        normReference: 'СП РК 5.01-102-2013 / Основания зданий и сооружений',
      };

      onSaveHistory(historyItem);
      setLastSavedId(historyItem.id);
    } catch (err: any) {
      setErrors({ global: err.message || 'Ошибка расчёта' });
    }
  };

  const handleReset = () => {
    setLength(10.0);
    setWidth(8.0);
    setHeight(0.3);
    setReservePercent(5);
    setErrors({});
    setResult(null);
    setLastSavedId(null);
  };

  const resultItems: ResultItem[] = result
    ? [
        {
          label: t('foundationCalc.totalConcreteVolume'),
          value: formatNumber(result.totalConcreteVolume, 3),
          unit: 'м³',
          isPrimary: true,
          helperText: `Общий объём бетона с учётом запаса ${reservePercent}%`,
        },
        {
          label: t('foundationCalc.baseArea'),
          value: formatNumber(result.baseArea, 2),
          unit: 'м²',
          helperText: 'Площадь контакта подошвы фундамента с грунтом основания',
        },
        {
          label: t('foundationCalc.concreteVolume'),
          value: formatNumber(result.concreteVolume, 3),
          unit: 'м³',
          helperText: 'Чистый геометрический объём монолита',
        },
        {
          label: t('foundationCalc.lateralFormworkArea'),
          value: formatNumber(result.lateralFormworkArea, 2),
          unit: 'м²',
          helperText: 'Суммарная площадь вертикальной боковой опалубки',
        },
        {
          label: t('foundationCalc.approxSoilPressure'),
          value: formatNumber(result.approxSoilPressureKPa, 1),
          unit: 'кПа',
          helperText: 'Ориентировочное удельное давление только от веса плиты',
        },
      ]
    : [];

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 shadow-xs">
      <div className="border-b border-slate-200 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {t('foundationCalc.title')}
          </h2>
          <span className="text-xs font-mono text-slate-500 font-semibold bg-slate-100 px-2 py-1 rounded">
            СП РК 5.01-102
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {t('foundationCalc.desc')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Inputs */}
        <form onSubmit={handleCalculate} className="lg:col-span-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputGroup
              id="found-length"
              label={t('foundationCalc.lengthLabel')}
              value={length}
              onChange={setLength}
              unit="м"
              placeholder="10.0"
              error={errors.length}
              min={0.1}
              step={0.1}
            />

            <InputGroup
              id="found-width"
              label={t('foundationCalc.widthLabel')}
              value={width}
              onChange={setWidth}
              unit="м"
              placeholder="8.0"
              error={errors.width}
              min={0.1}
              step={0.1}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputGroup
              id="found-height"
              label={t('foundationCalc.heightLabel')}
              value={height}
              onChange={setHeight}
              unit="м"
              placeholder="0.3"
              error={errors.height}
              helperText="Толщина плиты или высота фундаментной ленты"
              min={0.05}
              step={0.05}
            />

            <InputGroup
              id="found-reserve"
              label={t('foundationCalc.reserveLabel')}
              value={reservePercent}
              onChange={setReservePercent}
              unit="%"
              placeholder="5"
              error={errors.reserve}
              min={0}
              max={25}
              step={1}
              presets={[
                { label: '0%', value: 0 },
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

          {/* Norm note */}
          <div className="pt-2 text-[11px] text-slate-500 leading-relaxed">
            {t('foundationCalc.normWarning')}
          </div>
        </form>

        {/* Results & Formula */}
        <div className="lg:col-span-6 space-y-4">
          {result ? (
            <>
              <ResultDisplay
                results={resultItems}
                onPrint={() => {
                  const historyItem: CalculationHistoryItem = {
                    id: lastSavedId || 'calc_' + Date.now(),
                    calculatorId: 'foundation',
                    calculatorTitle: t('calculatorCards.foundation.title'),
                    timestamp: Date.now(),
                    inputs: {
                      'Длина фундамента (L)': `${length} м`,
                      'Ширина фундамента (B)': `${width} м`,
                      'Высота (H)': `${height} м`,
                      'Запас на неровности': `${reservePercent}%`,
                    },
                    inputLabels: {
                      'Длина фундамента (L)': 'м',
                      'Ширина фундамента (B)': 'м',
                      'Высота (H)': 'м',
                      'Запас на неровности': '%',
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
                    normReference: 'СП РК 5.01-102-2013',
                  };
                  onPrintReport(historyItem);
                }}
              />

              <FormulaDisplay
                formulaTitle={t('foundationCalc.formulaHeading')}
                formula={result.formula}
                formulaSubstituted={result.formulaSubstituted}
                explanation={t('foundationCalc.formulaDescription')}
                normReference="СП РК 5.01-102-2013 «Основания зданий и сооружений»"
              />
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded p-8 text-center bg-slate-50/50 min-h-[260px]">
              <div className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <Calculator className="w-6 h-6 text-slate-500" />
              </div>
              <h4 className="text-sm font-semibold text-slate-700">
                Задайте размеры фундамента
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Расчёт площади подошвы основания, объёма бетона и боковой опалубки по формулам V = L × B × H и S = L × B.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
