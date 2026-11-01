import React, { useState } from 'react';
import { useTranslation } from '../locales/LanguageContext';
import { InputGroup } from '../components/InputGroup';
import { ResultDisplay, ResultItem } from '../components/ResultDisplay';
import { FormulaDisplay } from '../components/FormulaDisplay';
import { calculateConcrete } from '../utils/calculations/concrete';
import { ConcreteInputs, ConcreteResult, CalculationHistoryItem } from '../types/calculator';
import { formatNumber } from '../utils/formatters';
import { RotateCcw, Calculator, CheckCircle2 } from 'lucide-react';

interface ConcreteCalculatorProps {
  onSaveHistory: (item: CalculationHistoryItem) => void;
  onPrintReport: (item: CalculationHistoryItem) => void;
  initialInputs?: Partial<ConcreteInputs>;
}

export const ConcreteCalculator: React.FC<ConcreteCalculatorProps> = ({
  onSaveHistory,
  onPrintReport,
  initialInputs,
}) => {
  const { t } = useTranslation();

  const [length, setLength] = useState<number | string>(initialInputs?.length ?? 6.0);
  const [width, setWidth] = useState<number | string>(initialInputs?.width ?? 4.0);
  const [height, setHeight] = useState<number | string>(initialInputs?.height ?? 0.2);
  const [reservePercent, setReservePercent] = useState<number | string>(initialInputs?.reservePercent ?? 5);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ConcreteResult | null>(null);
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
      const inputs: ConcreteInputs = {
        length: Number(length),
        width: Number(width),
        height: Number(height),
        reservePercent: Number(reservePercent),
      };

      const res = calculateConcrete(inputs);
      setResult(res);

      const historyItem: CalculationHistoryItem = {
        id: 'calc_' + Date.now(),
        calculatorId: 'concrete',
        calculatorTitle: t('calculatorCards.concrete.title'),
        timestamp: Date.now(),
        inputs: {
          'Длина (L)': Number(length),
          'Ширина (B)': Number(width),
          'Высота / толщина (H)': Number(height),
          'Технологический запас': `${reservePercent}%`,
        },
        inputLabels: {
          'Длина (L)': 'м',
          'Ширина (B)': 'м',
          'Высота / толщина (H)': 'м',
          'Технологический запас': '%',
        },
        results: [
          {
            label: t('concreteCalc.totalVolume'),
            value: formatNumber(res.totalVolume, 3),
            unit: 'м³',
            isPrimary: true,
          },
          {
            label: t('concreteCalc.baseVolume'),
            value: formatNumber(res.baseVolume, 3),
            unit: 'м³',
          },
          {
            label: t('concreteCalc.reserveVolume'),
            value: formatNumber(res.reserveVolume, 3),
            unit: 'м³',
          },
          {
            label: t('concreteCalc.approxWeight'),
            value: formatNumber(res.approxWeightTons, 2),
            unit: 'т',
          },
        ],
        formulaText: res.formula,
        formulaSubstituted: res.formulaSubstituted,
        normReference: 'СП РК 5.03-107-2013 / СНиП РК',
      };

      onSaveHistory(historyItem);
      setLastSavedId(historyItem.id);
    } catch (err: any) {
      setErrors({ global: err.message || 'Ошибка расчёта' });
    }
  };

  const handleReset = () => {
    setLength(6.0);
    setWidth(4.0);
    setHeight(0.2);
    setReservePercent(5);
    setErrors({});
    setResult(null);
    setLastSavedId(null);
  };

  const resultItems: ResultItem[] = result
    ? [
        {
          label: t('concreteCalc.totalVolume'),
          value: formatNumber(result.totalVolume, 3),
          unit: 'м³',
          isPrimary: true,
          helperText: `С учётом технологического запаса ${reservePercent}%`,
        },
        {
          label: t('concreteCalc.baseVolume'),
          value: formatNumber(result.baseVolume, 3),
          unit: 'м³',
          helperText: 'Чистый геометрический объём без запаса',
        },
        {
          label: t('concreteCalc.reserveVolume'),
          value: formatNumber(result.reserveVolume, 3),
          unit: 'м³',
          helperText: 'Объём запаса на уплотнение и потери смеси',
        },
        {
          label: t('concreteCalc.approxWeight'),
          value: formatNumber(result.approxWeightTons, 2),
          unit: 'тонн',
          helperText: 'При средней плотности тяжёлого бетона 2400 кг/м³',
        },
        {
          label: t('concreteCalc.cementBags'),
          value: result.cementBagsEstimate,
          unit: 'мешков',
          helperText: 'Ориентир для самостоятельного приготовления (М250/М300)',
        },
      ]
    : [];

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 shadow-xs">
      <div className="border-b border-slate-200 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {t('concreteCalc.title')}
          </h2>
          <span className="text-xs font-mono text-slate-500 font-semibold bg-slate-100 px-2 py-1 rounded">
            СП РК 5.03-107
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {t('concreteCalc.desc')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Inputs */}
        <form onSubmit={handleCalculate} className="lg:col-span-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputGroup
              id="conc-length"
              label={t('concreteCalc.lengthLabel')}
              value={length}
              onChange={setLength}
              unit="м"
              placeholder="Например: 6.0"
              error={errors.length}
              min={0.01}
              step={0.1}
            />

            <InputGroup
              id="conc-width"
              label={t('concreteCalc.widthLabel')}
              value={width}
              onChange={setWidth}
              unit="м"
              placeholder="Например: 4.0"
              error={errors.width}
              min={0.01}
              step={0.1}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputGroup
              id="conc-height"
              label={t('concreteCalc.heightLabel')}
              value={height}
              onChange={setHeight}
              unit="м"
              placeholder="Например: 0.2"
              error={errors.height}
              helperText="Толщина плиты или высота конструкции"
              min={0.01}
              step={0.05}
            />

            <InputGroup
              id="conc-reserve"
              label={t('concreteCalc.reserveLabel')}
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
                { label: '10%', value: 10 },
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
            {t('concreteCalc.normWarning')}
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
                    calculatorId: 'concrete',
                    calculatorTitle: t('calculatorCards.concrete.title'),
                    timestamp: Date.now(),
                    inputs: {
                      'Длина (L)': `${length} м`,
                      'Ширина (B)': `${width} м`,
                      'Высота / толщина (H)': `${height} м`,
                      'Технологический запас': `${reservePercent}%`,
                    },
                    inputLabels: {
                      'Длина (L)': 'м',
                      'Ширина (B)': 'м',
                      'Высота / толщина (H)': 'м',
                      'Технологический запас': '%',
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
                    normReference: 'СП РК 5.03-107-2013',
                  };
                  onPrintReport(historyItem);
                }}
              />

              <FormulaDisplay
                formulaTitle={t('concreteCalc.formulaHeading')}
                formula={result.formula}
                formulaSubstituted={result.formulaSubstituted}
                explanation={t('concreteCalc.formulaDescription')}
                normReference="СП РК 5.03-107-2013 «Несущие и ограждающие конструкции»"
              />
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded p-8 text-center bg-slate-50/50 min-h-[260px]">
              <div className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <Calculator className="w-6 h-6 text-slate-500" />
              </div>
              <h4 className="text-sm font-semibold text-slate-700">
                Задайте параметры и нажмите «Рассчитать»
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Система вычислит чистый объём, технологический запас и ориентировочный тоннаж по формуле V = L × B × H.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
