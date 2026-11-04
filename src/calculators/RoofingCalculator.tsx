import React, { useState } from 'react';
import { useTranslation } from '../locales/LanguageContext';
import { InputGroup } from '../components/InputGroup';
import { ResultDisplay, ResultItem } from '../components/ResultDisplay';
import { FormulaDisplay } from '../components/FormulaDisplay';
import { calculateRoofing } from '../utils/calculations/roofing';
import { RoofingInputs, RoofingResult, CalculationHistoryItem } from '../types/calculator';
import { formatNumber } from '../utils/formatters';
import { RotateCcw, Calculator, Home } from 'lucide-react';

interface RoofingCalculatorProps {
  onSaveHistory: (item: CalculationHistoryItem) => void;
  onPrintReport: (item: CalculationHistoryItem) => void;
  initialInputs?: Partial<RoofingInputs>;
}

export const RoofingCalculator: React.FC<RoofingCalculatorProps> = ({
  onSaveHistory,
  onPrintReport,
  initialInputs,
}) => {
  const { t } = useTranslation();

  const [roofType, setRoofType] = useState<'single' | 'gable' | 'hip' | 'flat'>(initialInputs?.roofType ?? 'gable');
  const [buildingLength, setBuildingLength] = useState<number | string>(initialInputs?.buildingLength ?? 12.0);
  const [buildingWidth, setBuildingWidth] = useState<number | string>(initialInputs?.buildingWidth ?? 10.0);
  const [slopeAngleDeg, setSlopeAngleDeg] = useState<number | string>(initialInputs?.slopeAngleDeg ?? 30);
  const [overhangMeters, setOverhangMeters] = useState<number | string>(initialInputs?.overhangMeters ?? 0.5);
  const [materialType, setMaterialType] = useState<'metal_tile' | 'corrugated' | 'soft_shingle' | 'roll_membrane'>(
    initialInputs?.materialType ?? 'metal_tile'
  );
  const [wastePercent, setWastePercent] = useState<number | string>(initialInputs?.wastePercent ?? 10);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<RoofingResult | null>(null);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (buildingLength === '' || Number(buildingLength) <= 0) errs.buildingLength = t('errors.positiveNumber');
    if (buildingWidth === '' || Number(buildingWidth) <= 0) errs.buildingWidth = t('errors.positiveNumber');
    if (slopeAngleDeg === '' || Number(slopeAngleDeg) < 1 || Number(slopeAngleDeg) > 85) {
      errs.slopeAngleDeg = 'Угол наклона ската должен быть в диапазоне от 1° до 85°';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCalculate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validate()) return;

    try {
      const inputs: RoofingInputs = {
        roofType,
        buildingLength: Number(buildingLength),
        buildingWidth: Number(buildingWidth),
        slopeAngleDeg: Number(slopeAngleDeg),
        overhangMeters: Number(overhangMeters) || 0,
        materialType,
        wastePercent: Number(wastePercent) || 0,
      };

      const res = calculateRoofing(inputs);
      setResult(res);

      const typeLabels = {
        single: 'Односкатная',
        gable: 'Двускатная',
        hip: 'Четырехскатная (вальмовая)',
        flat: 'Плоская',
      };

      const historyItem: CalculationHistoryItem = {
        id: 'calc_' + Date.now(),
        calculatorId: 'roofing',
        calculatorTitle: 'Калькулятор кровли',
        timestamp: Date.now(),
        inputs: {
          'Тип кровли': typeLabels[roofType],
          'Длина здания (L)': `${buildingLength} м`,
          'Ширина здания (B)': `${buildingWidth} м`,
          'Угол наклона ската': `${slopeAngleDeg}°`,
          'Свес карниза': `${overhangMeters} м`,
          'Запас на нахлёст и резку': `${wastePercent}%`,
        },
        inputLabels: {
          'Тип кровли': '',
          'Длина здания (L)': 'м',
          'Ширина здания (B)': 'м',
          'Угол наклона ската': '°',
          'Свес карниза': 'м',
          'Запас на нахлёст и резку': '%',
        },
        results: [
          {
            label: 'Итоговая площадь покрытия с запасом',
            value: formatNumber(res.totalAreaWithWaste, 2),
            unit: 'м²',
            isPrimary: true,
            helperText: `Фактическая площадь скатов: ${formatNumber(res.actualSlopeArea, 2)} м²`,
          },
          {
            label: 'Гидро-пароизоляционная мембрана',
            value: res.membraneRolls,
            unit: 'рулонов',
            helperText: 'Рулоны по 75 м² с учётом нахлёстов 150 мм',
          },
          {
            label: 'Длина коньковых планок',
            value: formatNumber(res.ridgeLengthMeters, 1),
            unit: 'пог. м',
          },
          {
            label: 'Периметр карнизных свесов',
            value: formatNumber(res.eavesLengthMeters, 1),
            unit: 'пог. м',
          },
          {
            label: 'Кровельные саморезы',
            value: res.screwsPcs,
            unit: 'шт.',
            helperText: 'Из расчёта 8 шт/м²',
          },
        ],
        formulaText: res.formula,
        formulaSubstituted: res.formulaSubstituted,
        normReference: 'СП РК 5.04-107-2014 / Кровли',
      };

      onSaveHistory(historyItem);
      setLastSavedId(historyItem.id);
    } catch (err: any) {
      setErrors({ global: err.message || 'Ошибка расчёта' });
    }
  };

  const handleReset = () => {
    setRoofType('gable');
    setBuildingLength(12.0);
    setBuildingWidth(10.0);
    setSlopeAngleDeg(30);
    setOverhangMeters(0.5);
    setMaterialType('metal_tile');
    setWastePercent(10);
    setErrors({});
    setResult(null);
    setLastSavedId(null);
  };

  const resultItems: ResultItem[] = result
    ? [
        {
          label: 'Площадь кровельного материала с запасом',
          value: formatNumber(result.totalAreaWithWaste, 2),
          unit: 'м²',
          isPrimary: true,
          helperText: `Чистая площадь скатов: ${formatNumber(result.actualSlopeArea, 2)} м² + ${wastePercent}% запас`,
        },
        {
          label: 'Подкровельная гидро-ветрозащита',
          value: result.membraneRolls,
          unit: 'рулонов',
          helperText: 'Стандартный рулон 75 м² (полезная площадь ~65 м²)',
        },
        {
          label: 'Длина конька',
          value: formatNumber(result.ridgeLengthMeters, 1),
          unit: 'пог. м',
          helperText: 'Погонаж конькового элемента с заглушками',
        },
        {
          label: 'Карнизные планки и свесы',
          value: formatNumber(result.eavesLengthMeters, 1),
          unit: 'пог. м',
          helperText: 'Суммарный погонаж карнизов здания со свесами',
        },
        {
          label: 'Крепёж (кровельные саморезы с EPDM)',
          value: result.screwsPcs,
          unit: 'шт.',
          helperText: 'Расход 8 шт/м² с учётом ветровых зон РК',
        },
      ]
    : [];

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 shadow-xs">
      <div className="border-b border-slate-200 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Калькулятор кровли
          </h2>
          <span className="text-xs font-mono text-slate-500 font-semibold bg-slate-100 px-2 py-1 rounded">
            СП РК 5.04-107
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Расчёт площади скатов, кровельного покрытия (металлочерепица, профлист, битумная черепица), конька, карнизов и доборных элементов.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <form onSubmit={handleCalculate} className="lg:col-span-6 space-y-4">
          {/* Roof type selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Тип конструкции крыши
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'single', label: 'Односкатная' },
                { id: 'gable', label: 'Двускатная' },
                { id: 'hip', label: 'Вальмовая' },
                { id: 'flat', label: 'Плоская' },
              ].map((tItem) => (
                <button
                  key={tItem.id}
                  type="button"
                  onClick={() => setRoofType(tItem.id as any)}
                  className={`p-2 rounded text-center text-xs transition-colors border ${
                    roofType === tItem.id
                      ? 'bg-blue-900 text-white border-blue-900 font-semibold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {tItem.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InputGroup
              id="roof-len"
              label="Длина здания (L)"
              value={buildingLength}
              onChange={setBuildingLength}
              unit="м"
              placeholder="12.0"
              error={errors.buildingLength}
              min={1}
              step={0.5}
            />

            <InputGroup
              id="roof-w"
              label="Ширина здания (B)"
              value={buildingWidth}
              onChange={setBuildingWidth}
              unit="м"
              placeholder="10.0"
              error={errors.buildingWidth}
              min={1}
              step={0.5}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <InputGroup
              id="roof-angle"
              label="Угол наклона ската"
              value={slopeAngleDeg}
              onChange={setSlopeAngleDeg}
              unit="°"
              placeholder="30"
              error={errors.slopeAngleDeg}
              min={1}
              max={85}
              presets={[
                { label: '20°', value: 20 },
                { label: '30°', value: 30 },
                { label: '40°', value: 40 },
                { label: '45°', value: 45 },
              ]}
            />

            <InputGroup
              id="roof-overhang"
              label="Свес карниза"
              value={overhangMeters}
              onChange={setOverhangMeters}
              unit="м"
              placeholder="0.5"
              step={0.1}
              presets={[
                { label: '0.4 м', value: 0.4 },
                { label: '0.5 м', value: 0.5 },
                { label: '0.6 м', value: 0.6 },
              ]}
            />

            <InputGroup
              id="roof-waste"
              label="Запас на резку/нахлест"
              value={wastePercent}
              onChange={setWastePercent}
              unit="%"
              placeholder="10"
              presets={[
                { label: '7%', value: 7 },
                { label: '10%', value: 10 },
                { label: '15%', value: 15 },
              ]}
            />
          </div>

          {/* Material Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Материал кровельного покрытия
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
              {[
                { id: 'metal_tile', label: 'Металлочерепица' },
                { id: 'corrugated', label: 'Профнастил' },
                { id: 'soft_shingle', label: 'Гибкая черепица' },
                { id: 'roll_membrane', label: 'Рулонная ПВХ' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMaterialType(m.id as any)}
                  className={`p-2 rounded border text-center transition-colors text-[11px] ${
                    materialType === m.id
                      ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
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
                    calculatorId: 'roofing',
                    calculatorTitle: 'Калькулятор кровли',
                    timestamp: Date.now(),
                    inputs: {
                      'Тип кровли': roofType,
                      'Длина здания (L)': `${buildingLength} м`,
                      'Ширина здания (B)': `${buildingWidth} м`,
                      'Угол наклона': `${slopeAngleDeg}°`,
                      'Свес': `${overhangMeters} м`,
                      'Запас': `${wastePercent}%`,
                    },
                    inputLabels: {
                      'Тип кровли': '',
                      'Длина здания (L)': 'м',
                      'Ширина здания (B)': 'м',
                      'Угол наклона': '°',
                      'Свес': 'м',
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
                    normReference: 'СП РК 5.04-107-2014',
                  };
                  onPrintReport(item);
                }}
              />

              <FormulaDisplay
                formulaTitle="Тригонометрический расчёт площади скатов"
                formula={result.formula}
                formulaSubstituted={result.formulaSubstituted}
                explanation="Площадь скатов вычисляется через деление проекционной площади с учетом выноса карнизов на косинус угла уклона кровли."
                normReference="СП РК 5.04-107-2014 «Кровли зданий и сооружений»"
              />
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded p-8 text-center bg-slate-50/50 min-h-[260px]">
              <div className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <Home className="w-6 h-6 text-slate-500" />
              </div>
              <h4 className="text-sm font-semibold text-slate-700">
                Задайте геометрические параметры кровли
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Точный геометрический пересчет скатов, конька, карнизов, мембраны и крепежа.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
