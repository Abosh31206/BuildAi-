import React, { useState } from 'react';
import { useTranslation } from '../locales/LanguageContext';
import { InputGroup } from '../components/InputGroup';
import { ResultDisplay, ResultItem } from '../components/ResultDisplay';
import { FormulaDisplay } from '../components/FormulaDisplay';
import { calculateEarthwork } from '../utils/calculations/earthwork';
import { EarthworkInputs, EarthworkResult, CalculationHistoryItem } from '../types/calculator';
import { formatNumber } from '../utils/formatters';
import { RotateCcw, Calculator, HelpCircle } from 'lucide-react';

interface EarthworkCalculatorProps {
  onSaveHistory: (item: CalculationHistoryItem) => void;
  onPrintReport: (item: CalculationHistoryItem) => void;
  initialInputs?: Partial<EarthworkInputs>;
}

export const EarthworkCalculator: React.FC<EarthworkCalculatorProps> = ({
  onSaveHistory,
  onPrintReport,
  initialInputs,
}) => {
  const { t } = useTranslation();

  const [length, setLength] = useState<number | string>(initialInputs?.length ?? 12.0);
  const [width, setWidth] = useState<number | string>(initialInputs?.width ?? 8.0);
  const [depth, setDepth] = useState<number | string>(initialInputs?.depth ?? 2.5);
  // Default loosened factor: 1.25 (typical loam/суглинок), but fully customizable by user
  const [looseningFactor, setLooseningFactor] = useState<number | string>(
    initialInputs?.looseningFactor ?? 1.25
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<EarthworkResult | null>(null);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (length === '' || Number(length) <= 0) {
      errs.length = t('errors.positiveNumber');
    }
    if (width === '' || Number(width) <= 0) {
      errs.width = t('errors.positiveNumber');
    }
    if (depth === '' || Number(depth) <= 0) {
      errs.depth = t('errors.positiveNumber');
    }
    if (looseningFactor === '' || Number(looseningFactor) < 1.0) {
      errs.looseningFactor = t('errors.invalidLoosening');
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCalculate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validate()) return;

    try {
      const inputs: EarthworkInputs = {
        length: Number(length),
        width: Number(width),
        depth: Number(depth),
        looseningFactor: Number(looseningFactor),
      };

      const res = calculateEarthwork(inputs);
      setResult(res);

      const historyItem: CalculationHistoryItem = {
        id: 'calc_' + Date.now(),
        calculatorId: 'earthwork',
        calculatorTitle: t('calculatorCards.earthwork.title'),
        timestamp: Date.now(),
        inputs: {
          'Длина выемки (L)': `${length} м`,
          'Ширина выемки (B)': `${width} м`,
          'Глубина выемки (H)': `${depth} м`,
          'Коэффициент разрыхления (k_р)': `${looseningFactor}`,
        },
        inputLabels: {
          'Длина выемки (L)': 'м',
          'Ширина выемки (B)': 'м',
          'Глубина выемки (H)': 'м',
          'Коэффициент разрыхления (k_р)': '',
        },
        results: [
          {
            label: t('earthworkCalc.loosenedVolume'),
            value: formatNumber(res.loosenedVolume, 3),
            unit: 'м³',
            isPrimary: true,
          },
          {
            label: t('earthworkCalc.naturalVolume'),
            value: formatNumber(res.naturalVolume, 3),
            unit: 'м³',
          },
          {
            label: t('earthworkCalc.deltaVolume'),
            value: formatNumber(res.deltaVolume, 3),
            unit: 'м³',
          },
          {
            label: t('earthworkCalc.trucks15m3'),
            value: res.trucks15m3Count,
            unit: 'рейсов',
          },
        ],
        formulaText: res.formula,
        formulaSubstituted: res.formulaSubstituted,
        normReference: 'СП РК 1.03-106-2012 / Земляные сооружения',
      };

      onSaveHistory(historyItem);
      setLastSavedId(historyItem.id);
    } catch (err: any) {
      setErrors({ global: err.message || 'Ошибка расчёта' });
    }
  };

  const handleReset = () => {
    setLength(12.0);
    setWidth(8.0);
    setDepth(2.5);
    setLooseningFactor(1.25);
    setErrors({});
    setResult(null);
    setLastSavedId(null);
  };

  const soilPresets = [
    { name: t('earthworkCalc.presetSand'), value: 1.12 },
    { name: t('earthworkCalc.presetSandyLoam'), value: 1.2 },
    { name: t('earthworkCalc.presetLoam'), value: 1.25 },
    { name: t('earthworkCalc.presetClay'), value: 1.3 },
    { name: t('earthworkCalc.presetRock'), value: 1.4 },
  ];

  const resultItems: ResultItem[] = result
    ? [
        {
          label: t('earthworkCalc.loosenedVolume'),
          value: formatNumber(result.loosenedVolume, 3),
          unit: 'м³',
          isPrimary: true,
          helperText: `Объём после разработки с учётом введённого k_р = ${looseningFactor}`,
        },
        {
          label: t('earthworkCalc.naturalVolume'),
          value: formatNumber(result.naturalVolume, 3),
          unit: 'м³',
          helperText: 'Объём грунта в естественном залегании (в плотном теле котлована)',
        },
        {
          label: t('earthworkCalc.deltaVolume'),
          value: formatNumber(result.deltaVolume, 3),
          unit: 'м³',
          helperText: 'Увеличение объёма за счёт разрушения структуры грунта',
        },
        {
          label: t('earthworkCalc.trucks15m3'),
          value: result.trucks15m3Count,
          unit: 'рейсов',
          helperText: 'Ориентировочно для стандартного самосвала с кузовом 15 м³',
        },
        {
          label: t('earthworkCalc.trucks20m3'),
          value: result.trucks20m3Count,
          unit: 'рейсов',
          helperText: 'Ориентировочно для трехосного/четырехосного самосвала 20 м³',
        },
      ]
    : [];

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 shadow-xs">
      <div className="border-b border-slate-200 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {t('earthworkCalc.title')}
          </h2>
          <span className="text-xs font-mono text-slate-500 font-semibold bg-slate-100 px-2 py-1 rounded">
            СП РК 1.03-106
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {t('earthworkCalc.desc')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Inputs */}
        <form onSubmit={handleCalculate} className="lg:col-span-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <InputGroup
              id="earth-length"
              label={t('earthworkCalc.lengthLabel')}
              value={length}
              onChange={setLength}
              unit="м"
              placeholder="12.0"
              error={errors.length}
              min={0.1}
              step={0.5}
            />

            <InputGroup
              id="earth-width"
              label={t('earthworkCalc.widthLabel')}
              value={width}
              onChange={setWidth}
              unit="м"
              placeholder="8.0"
              error={errors.width}
              min={0.1}
              step={0.5}
            />

            <InputGroup
              id="earth-depth"
              label={t('earthworkCalc.depthLabel')}
              value={depth}
              onChange={setDepth}
              unit="м"
              placeholder="2.5"
              error={errors.depth}
              min={0.1}
              step={0.1}
            />
          </div>

          {/* User-defined Loosening Factor */}
          <div className="bg-slate-50 p-3.5 rounded border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="earth-loosening" className="text-xs font-semibold text-slate-800">
                {t('earthworkCalc.looseningLabel')}
              </label>
              <span className="text-[11px] font-mono font-medium text-slate-500">
                k_р = {looseningFactor}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="earth-loosening"
                type="number"
                min={1.0}
                max={2.5}
                step={0.01}
                value={looseningFactor}
                onChange={(e) => setLooseningFactor(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-32 px-3 py-1.5 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100"
              />
              <span className="text-xs text-slate-500">
                (пользовательский ввод)
              </span>
            </div>
            {errors.looseningFactor && (
              <p className="text-[11px] text-rose-600">{errors.looseningFactor}</p>
            )}

            <div className="pt-1.5">
              <span className="text-[10px] text-slate-500 font-medium block mb-1">
                {t('earthworkCalc.looseningHint')}
              </span>
              <div className="flex flex-wrap gap-1">
                {soilPresets.map((soil) => (
                  <button
                    key={soil.name}
                    type="button"
                    onClick={() => setLooseningFactor(soil.value)}
                    className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${
                      Number(looseningFactor) === soil.value
                        ? 'bg-blue-900 text-white font-semibold'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {soil.name}
                  </button>
                ))}
              </div>
            </div>
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
            {t('earthworkCalc.normWarning')}
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
                    calculatorId: 'earthwork',
                    calculatorTitle: t('calculatorCards.earthwork.title'),
                    timestamp: Date.now(),
                    inputs: {
                      'Длина котлована (L)': `${length} м`,
                      'Ширина котлована (B)': `${width} м`,
                      'Глубина котлована (H)': `${depth} м`,
                      'Коэффициент разрыхления (k_р)': `${looseningFactor}`,
                    },
                    inputLabels: {
                      'Длина котлована (L)': 'м',
                      'Ширина котлована (B)': 'м',
                      'Глубина котлована (H)': 'м',
                      'Коэффициент разрыхления (k_р)': '',
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
                    normReference: 'СП РК 1.03-106-2012',
                  };
                  onPrintReport(historyItem);
                }}
              />

              <FormulaDisplay
                formulaTitle={t('earthworkCalc.formulaHeading')}
                formula={result.formula}
                formulaSubstituted={result.formulaSubstituted}
                explanation={t('earthworkCalc.formulaDescription')}
                normReference="СП РК 1.03-106-2012 «Земляные сооружения, основания и фундаменты»"
              />
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded p-8 text-center bg-slate-50/50 min-h-[260px]">
              <div className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <Calculator className="w-6 h-6 text-slate-500" />
              </div>
              <h4 className="text-sm font-semibold text-slate-700">
                Введите параметры котлована и грунта
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Расчёт объёма в плотном теле по формуле V = L × B × H и объёма разрыхлённой массы по персональному коэффициенту k_р.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
