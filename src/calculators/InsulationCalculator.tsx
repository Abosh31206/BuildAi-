import React, { useState } from 'react';
import { useTranslation } from '../locales/LanguageContext';
import { InputGroup } from '../components/InputGroup';
import { ResultDisplay, ResultItem } from '../components/ResultDisplay';
import { FormulaDisplay } from '../components/FormulaDisplay';
import { calculateInsulation } from '../utils/calculations/insulation';
import { InsulationInputs, InsulationResult, CalculationHistoryItem } from '../types/calculator';
import { formatNumber } from '../utils/formatters';
import { RotateCcw, Calculator, ThermometerSnowflake } from 'lucide-react';

interface InsulationCalculatorProps {
  onSaveHistory: (item: CalculationHistoryItem) => void;
  onPrintReport: (item: CalculationHistoryItem) => void;
  initialInputs?: Partial<InsulationInputs>;
}

export const InsulationCalculator: React.FC<InsulationCalculatorProps> = ({
  onSaveHistory,
  onPrintReport,
  initialInputs,
}) => {
  const { t } = useTranslation();

  const [insulationArea, setInsulationArea] = useState<number | string>(initialInputs?.insulationArea ?? 150.0);
  const [cityRegion, setCityRegion] = useState<string>(initialInputs?.cityRegion ?? 'astana');
  const [constructionType, setConstructionType] = useState<'facade' | 'roof' | 'floor'>(
    initialInputs?.constructionType ?? 'facade'
  );
  const [materialType, setMaterialType] = useState<'mineral_wool' | 'xps' | 'eps' | 'pir'>(
    initialInputs?.materialType ?? 'mineral_wool'
  );
  const [wastePercent, setWastePercent] = useState<number | string>(initialInputs?.wastePercent ?? 5);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<InsulationResult | null>(null);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (insulationArea === '' || Number(insulationArea) <= 0) {
      errs.insulationArea = t('errors.positiveNumber');
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCalculate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validate()) return;

    try {
      const inputs: InsulationInputs = {
        insulationArea: Number(insulationArea),
        cityRegion,
        constructionType,
        materialType,
        wastePercent: Number(wastePercent) || 0,
      };

      const res = calculateInsulation(inputs);
      setResult(res);

      const cityNames: Record<string, string> = {
        astana: 'Астана (ГСОП ~6200)',
        almaty: 'Алматы (ГСОП ~3800)',
        shymkent: 'Шымкент (ГСОП ~2800)',
        karaganda: 'Караганда (ГСОП ~6500)',
        aktobe: 'Актобе (ГСОП ~5600)',
        pavlodar: 'Павлодар (ГСОП ~6700)',
        oskemen: 'Усть-Каменогорск (ГСОП ~6400)',
      };

      const materialNames: Record<string, string> = {
        mineral_wool: 'Базальтовая минвата (λ=0.038)',
        xps: 'Экструдированный пенополистирол XPS (λ=0.032)',
        eps: 'Пенопласт ППС (λ=0.040)',
        pir: 'PIR плита (λ=0.022)',
      };

      const historyItem: CalculationHistoryItem = {
        id: 'calc_' + Date.now(),
        calculatorId: 'insulation',
        calculatorTitle: 'Калькулятор утепления',
        timestamp: Date.now(),
        inputs: {
          'Площадь утепления': `${insulationArea} м²`,
          'Регион Казахстана': cityNames[cityRegion] || cityRegion,
          'Конструкция': constructionType === 'facade' ? 'Фасад/стены' : constructionType === 'roof' ? 'Кровля/чердак' : 'Пол/цоколь',
          'Материал утеплителя': materialNames[materialType] || materialType,
          'Запас': `${wastePercent}%`,
        },
        inputLabels: {
          'Площадь утепления': 'м²',
          'Регион Казахстана': '',
          'Конструкция': '',
          'Материал утеплителя': '',
          'Запас': '%',
        },
        results: [
          {
            label: 'Нормативная толщина утеплителя (СП РК)',
            value: `${res.standardThicknessMm}`,
            unit: 'мм',
            isPrimary: true,
            helperText: `Точный теплотехнический расчет: ${res.recommendedThicknessMm} мм (R_req = ${res.requiredR} м²·°C/Вт)`,
          },
          {
            label: 'Общий объём утеплителя с запасом',
            value: formatNumber(res.totalVolumeM3, 2),
            unit: 'м³',
            helperText: `~${res.packagesCount} упаковок (по 0.288 м³/пачка)`,
          },
          {
            label: 'Тарельчатые фасадные дюбели',
            value: res.dowelsCount,
            unit: 'шт.',
            helperText: 'Расход 6 шт/м² для надёжной фиксации к основанию',
          },
          {
            label: 'Пароизоляционная / ветрозащитная мембрана',
            value: formatNumber(res.vaporBarrierM2, 1),
            unit: 'м²',
          },
        ],
        formulaText: res.formula,
        formulaSubstituted: res.formulaSubstituted,
        normReference: 'СП РК 2.04-01-2017 «Строительная климатология» / СП РК 2.04-03-2011',
      };

      onSaveHistory(historyItem);
      setLastSavedId(historyItem.id);
    } catch (err: any) {
      setErrors({ global: err.message || 'Ошибка расчёта' });
    }
  };

  const handleReset = () => {
    setInsulationArea(150.0);
    setCityRegion('astana');
    setConstructionType('facade');
    setMaterialType('mineral_wool');
    setWastePercent(5);
    setErrors({});
    setResult(null);
    setLastSavedId(null);
  };

  const resultItems: ResultItem[] = result
    ? [
        {
          label: 'Стандартная толщина слоя по нормам РК',
          value: result.standardThicknessMm,
          unit: 'мм',
          isPrimary: true,
          helperText: `Требуемое сопротивление теплопередаче R = ${result.requiredR} м²·°C/Вт (СП РК 2.04-01)`,
        },
        {
          label: 'Общий объём утеплителя',
          value: formatNumber(result.totalVolumeM3, 2),
          unit: 'м³',
          helperText: `Ориентировочно ${result.packagesCount} стандартных упаковок/пачек`,
        },
        {
          label: 'Теплопроводность материала λ',
          value: result.thermalConductivity,
          unit: 'Вт/(м·°C)',
          helperText: 'Расчётный коэффициент теплопроводности утеплителя в условиях эксплуатации',
        },
        {
          label: 'Фасадные дюбели («зонтики»)',
          value: result.dowelsCount,
          unit: 'шт.',
          helperText: result.dowelsCount > 0 ? '6 шт. на квадратный метр для ветровых нагрузок' : 'Не требуются для горизонтальных перекрытий',
        },
        {
          label: 'Пароизоляционная мембрана',
          value: formatNumber(result.vaporBarrierM2, 1),
          unit: 'м²',
          helperText: 'С учётом нахлёста полотен 10–15 см',
        },
      ]
    : [];

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 shadow-xs">
      <div className="border-b border-slate-200 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Калькулятор утепления (СП РК 2.04-01-2017)
          </h2>
          <span className="text-xs font-mono text-slate-500 font-semibold bg-slate-100 px-2 py-1 rounded">
            СП РК 2.04-01 / 2.04-03
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Автоматический подбор толщины теплоизоляции (базальт, XPS, пенопласт, PIR) по климатическим нормам и ГСОП городов Казахстана.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <form onSubmit={handleCalculate} className="lg:col-span-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InputGroup
              id="ins-area"
              label="Площадь утепления"
              value={insulationArea}
              onChange={setInsulationArea}
              unit="м²"
              placeholder="150"
              error={errors.insulationArea}
              min={1}
              step={5}
            />

            <InputGroup
              id="ins-waste"
              label="Запас на подрезку"
              value={wastePercent}
              onChange={setWastePercent}
              unit="%"
              placeholder="5"
              presets={[
                { label: '3%', value: 3 },
                { label: '5%', value: 5 },
                { label: '10%', value: 10 },
              ]}
            />
          </div>

          {/* Region in Kazakhstan */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Город / климатическая зона Республики Казахстан
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
              {[
                { id: 'astana', label: 'Астана (ГСОП 6200)' },
                { id: 'almaty', label: 'Алматы (ГСОП 3800)' },
                { id: 'shymkent', label: 'Шымкент (ГСОП 2800)' },
                { id: 'karaganda', label: 'Караганда (ГСОП 6500)' },
                { id: 'aktobe', label: 'Актобе (ГСОП 5600)' },
                { id: 'pavlodar', label: 'Павлодар (ГСОП 6700)' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCityRegion(c.id)}
                  className={`p-2 rounded border text-left text-[11px] transition-colors ${
                    cityRegion === c.id
                      ? 'bg-blue-900 text-white border-blue-900 font-semibold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Construction Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Тип утепляемой конструкции
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setConstructionType('facade')}
                className={`p-2 rounded border text-center text-xs transition-colors ${
                  constructionType === 'facade'
                    ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Фасад / стены
              </button>
              <button
                type="button"
                onClick={() => setConstructionType('roof')}
                className={`p-2 rounded border text-center text-xs transition-colors ${
                  constructionType === 'roof'
                    ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Кровля / чердак
              </button>
              <button
                type="button"
                onClick={() => setConstructionType('floor')}
                className={`p-2 rounded border text-center text-xs transition-colors ${
                  constructionType === 'floor'
                    ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Пол / цоколь
              </button>
            </div>
          </div>

          {/* Material Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Материал утеплителя
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setMaterialType('mineral_wool')}
                className={`p-2 rounded border text-left transition-colors ${
                  materialType === 'mineral_wool'
                    ? 'bg-blue-900 text-white border-blue-900 font-semibold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="font-medium text-[11px]">Базальтовая минвата</div>
                <div className={`text-[10px] ${materialType === 'mineral_wool' ? 'text-blue-200' : 'text-slate-400'}`}>
                  λ = 0.038 Вт/(м·°C)
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMaterialType('xps')}
                className={`p-2 rounded border text-left transition-colors ${
                  materialType === 'xps'
                    ? 'bg-blue-900 text-white border-blue-900 font-semibold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="font-medium text-[11px]">Экструдированный XPS</div>
                <div className={`text-[10px] ${materialType === 'xps' ? 'text-blue-200' : 'text-slate-400'}`}>
                  λ = 0.032 Вт/(м·°C)
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMaterialType('eps')}
                className={`p-2 rounded border text-left transition-colors ${
                  materialType === 'eps'
                    ? 'bg-blue-900 text-white border-blue-900 font-semibold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="font-medium text-[11px]">Пенопласт ППС-15</div>
                <div className={`text-[10px] ${materialType === 'eps' ? 'text-blue-200' : 'text-slate-400'}`}>
                  λ = 0.040 Вт/(м·°C)
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMaterialType('pir')}
                className={`p-2 rounded border text-left transition-colors ${
                  materialType === 'pir'
                    ? 'bg-blue-900 text-white border-blue-900 font-semibold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="font-medium text-[11px]">PIR плиты</div>
                <div className={`text-[10px] ${materialType === 'pir' ? 'text-blue-200' : 'text-slate-400'}`}>
                  λ = 0.022 Вт/(м·°C)
                </div>
              </button>
            </div>
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
                  const item: CalculationHistoryItem = {
                    id: lastSavedId || 'calc_' + Date.now(),
                    calculatorId: 'insulation',
                    calculatorTitle: 'Калькулятор утепления',
                    timestamp: Date.now(),
                    inputs: {
                      'Площадь': `${insulationArea} м²`,
                      'Регион': cityRegion,
                      'Тип конструкции': constructionType,
                      'Утеплитель': materialType,
                      'Запас': `${wastePercent}%`,
                    },
                    inputLabels: {
                      'Площадь': 'м²',
                      'Регион': '',
                      'Тип конструкции': '',
                      'Утеплитель': '',
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
                    normReference: 'СП РК 2.04-01-2017 / СП РК 2.04-03-2011',
                  };
                  onPrintReport(item);
                }}
              />

              <FormulaDisplay
                formulaTitle="Теплотехнический нормативный расчёт толщины"
                formula={result.formula}
                formulaSubstituted={result.formulaSubstituted}
                explanation="Толщина утеплителя рассчитывается на основе требуемого сопротивления теплопередаче R_req для климатической зоны РК (СП РК 2.04-01) и коэффициента теплопроводности материала λ."
                normReference="СП РК 2.04-01-2017 «Строительная климатология»"
              />
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded p-8 text-center bg-slate-50/50 min-h-[260px]">
              <div className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <ThermometerSnowflake className="w-6 h-6 text-slate-500" />
              </div>
              <h4 className="text-sm font-semibold text-slate-700">
                Выберите регион Казахстана и конструкцию
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Автоматический инженерный расчет по градусо-суткам отопительного периода (ГСОП) и нормам теплозащиты РК.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
