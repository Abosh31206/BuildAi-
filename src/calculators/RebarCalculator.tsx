import React, { useState } from 'react';
import { useTranslation } from '../locales/LanguageContext';
import { InputGroup } from '../components/InputGroup';
import { ResultDisplay, ResultItem } from '../components/ResultDisplay';
import { FormulaDisplay } from '../components/FormulaDisplay';
import { calculateRebar } from '../utils/calculations/rebar';
import { RebarInputs, RebarResult, CalculationHistoryItem } from '../types/calculator';
import { formatNumber } from '../utils/formatters';
import { RotateCcw, Calculator } from 'lucide-react';

interface RebarCalculatorProps {
  onSaveHistory: (item: CalculationHistoryItem) => void;
  onPrintReport: (item: CalculationHistoryItem) => void;
  initialInputs?: Partial<RebarInputs>;
}

const COMMON_DIAMETERS = [6, 8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 32];
const COMMON_LENGTHS = [
  { label: '6 м', value: 6 },
  { label: '11.7 м (вагон)', value: 11.7 },
  { label: '12 м', value: 12 },
];

export const RebarCalculator: React.FC<RebarCalculatorProps> = ({
  onSaveHistory,
  onPrintReport,
  initialInputs,
}) => {
  const { t } = useTranslation();

  const [diameter, setDiameter] = useState<number | string>(initialInputs?.diameter ?? 12);
  const [rodLength, setRodLength] = useState<number | string>(initialInputs?.rodLength ?? 11.7);
  const [rodCount, setRodCount] = useState<number | string>(initialInputs?.rodCount ?? 50);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<RebarResult | null>(null);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (diameter === '' || Number(diameter) <= 0) {
      errs.diameter = t('errors.positiveNumber');
    }
    if (rodLength === '' || Number(rodLength) <= 0) {
      errs.rodLength = t('errors.positiveNumber');
    }
    if (rodCount === '' || Number(rodCount) <= 0) {
      errs.rodCount = t('errors.positiveNumber');
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCalculate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validate()) return;

    try {
      const inputs: RebarInputs = {
        diameter: Number(diameter),
        rodLength: Number(rodLength),
        rodCount: Number(rodCount),
      };

      const res = calculateRebar(inputs);
      setResult(res);

      const historyItem: CalculationHistoryItem = {
        id: 'calc_' + Date.now(),
        calculatorId: 'rebar',
        calculatorTitle: t('calculatorCards.rebar.title'),
        timestamp: Date.now(),
        inputs: {
          'Диаметр арматуры (d)': `${diameter} мм`,
          'Длина одного стержня (L)': `${rodLength} м`,
          'Количество стержней (N)': `${rodCount} шт.`,
        },
        inputLabels: {
          'Диаметр арматуры (d)': 'мм',
          'Длина одного стержня (L)': 'м',
          'Количество стержней (N)': 'шт.',
        },
        results: [
          {
            label: t('rebarCalc.totalWeightTons'),
            value: formatNumber(res.totalWeightTons, 4),
            unit: 'т',
            isPrimary: true,
          },
          {
            label: t('rebarCalc.totalWeightKg'),
            value: formatNumber(res.totalWeightKg, 2),
            unit: 'кг',
          },
          {
            label: t('rebarCalc.totalLength'),
            value: formatNumber(res.totalLength, 2),
            unit: 'м',
          },
          {
            label: t('rebarCalc.meterWeight'),
            value: formatNumber(res.meterWeight, 4),
            unit: 'кг/м',
          },
        ],
        formulaText: res.formula,
        formulaSubstituted: res.formulaSubstituted,
        normReference: 'ГОСТ 34028-2016 / ГОСТ 5781-82 (Сталь арматурная)',
      };

      onSaveHistory(historyItem);
      setLastSavedId(historyItem.id);
    } catch (err: any) {
      setErrors({ global: err.message || 'Ошибка расчёта' });
    }
  };

  const handleReset = () => {
    setDiameter(12);
    setRodLength(11.7);
    setRodCount(50);
    setErrors({});
    setResult(null);
    setLastSavedId(null);
  };

  const resultItems: ResultItem[] = result
    ? [
        {
          label: t('rebarCalc.totalWeightTons'),
          value: formatNumber(result.totalWeightTons, 4),
          unit: 'тонн',
          isPrimary: true,
          helperText: `Масса всей партии (${rodCount} стержней по ${rodLength} м)`,
        },
        {
          label: t('rebarCalc.totalWeightKg'),
          value: formatNumber(result.totalWeightKg, 2),
          unit: 'кг',
          helperText: 'Общая масса в килограммах',
        },
        {
          label: t('rebarCalc.totalLength'),
          value: formatNumber(result.totalLength, 2),
          unit: 'пог. м',
          helperText: 'Суммарный метраж всех стержней',
        },
        {
          label: t('rebarCalc.meterWeight'),
          value: formatNumber(result.meterWeight, 4),
          unit: 'кг/м',
          helperText: `Теоретический вес по формуле m = d² / 162 для d=${diameter} мм`,
        },
      ]
    : [];

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 shadow-xs">
      <div className="border-b border-slate-200 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {t('rebarCalc.title')}
          </h2>
          <span className="text-xs font-mono text-slate-500 font-semibold bg-slate-100 px-2 py-1 rounded">
            ГОСТ 34028-2016
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {t('rebarCalc.desc')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Inputs */}
        <form onSubmit={handleCalculate} className="lg:col-span-6 space-y-4">
          <div>
            <InputGroup
              id="rebar-diam"
              label={t('rebarCalc.diameterLabel')}
              value={diameter}
              onChange={setDiameter}
              unit="мм"
              placeholder="12"
              error={errors.diameter}
              min={1}
              max={60}
              step={1}
            />
            {/* Quick diameter selection chips */}
            <div className="mt-2">
              <span className="text-[10px] text-slate-400 font-medium block mb-1">
                {t('rebarCalc.quickDiameters')}
              </span>
              <div className="flex flex-wrap gap-1">
                {COMMON_DIAMETERS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDiameter(d)}
                    className={`px-2 py-1 text-[11px] font-mono rounded transition-colors ${
                      Number(diameter) === d
                        ? 'bg-blue-900 text-white font-bold'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Ø{d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <InputGroup
                id="rebar-length"
                label={t('rebarCalc.rodLengthLabel')}
                value={rodLength}
                onChange={setRodLength}
                unit="м"
                placeholder="11.7"
                error={errors.rodLength}
                min={0.1}
                step={0.1}
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {COMMON_LENGTHS.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setRodLength(item.value)}
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded transition-colors ${
                      Number(rodLength) === item.value
                        ? 'bg-blue-900 text-white font-semibold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <InputGroup
              id="rebar-count"
              label={t('rebarCalc.rodCountLabel')}
              value={rodCount}
              onChange={setRodCount}
              unit="шт."
              placeholder="50"
              error={errors.rodCount}
              min={1}
              step={1}
              presets={[
                { label: '10 шт', value: 10 },
                { label: '50 шт', value: 50 },
                { label: '100 шт', value: 100 },
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
                onPrint={() => {
                  const historyItem: CalculationHistoryItem = {
                    id: lastSavedId || 'calc_' + Date.now(),
                    calculatorId: 'rebar',
                    calculatorTitle: t('calculatorCards.rebar.title'),
                    timestamp: Date.now(),
                    inputs: {
                      'Диаметр арматуры (d)': `${diameter} мм`,
                      'Длина одного стержня (L)': `${rodLength} м`,
                      'Количество стержней (N)': `${rodCount} шт.`,
                    },
                    inputLabels: {
                      'Диаметр арматуры (d)': 'мм',
                      'Длина одного стержня (L)': 'м',
                      'Количество стержней (N)': 'шт.',
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
                    normReference: 'ГОСТ 34028-2016 / m = d² / 162',
                  };
                  onPrintReport(historyItem);
                }}
              />

              <FormulaDisplay
                formulaTitle={t('rebarCalc.formulaHeading')}
                formula={result.formula}
                formulaSubstituted={result.formulaSubstituted}
                explanation={t('rebarCalc.formulaDescription')}
                normReference="ГОСТ 34028-2016 «Прокат арматурный для железобетонных конструкций»"
              />
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded p-8 text-center bg-slate-50/50 min-h-[260px]">
              <div className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <Calculator className="w-6 h-6 text-slate-500" />
              </div>
              <h4 className="text-sm font-semibold text-slate-700">
                Выберите диаметр и количество стержней
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Расчёт теоретической массы погонного метра по формуле m = d² / 162 и общего тоннажа поставки.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
