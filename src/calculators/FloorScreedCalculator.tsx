import React, { useState } from 'react';
import { useTranslation } from '../locales/LanguageContext';
import { InputGroup } from '../components/InputGroup';
import { ResultDisplay, ResultItem } from '../components/ResultDisplay';
import { FormulaDisplay } from '../components/FormulaDisplay';
import { calculateFloorScreed } from '../utils/calculations/floorScreed';
import { ScreedInputs, ScreedResult, CalculationHistoryItem } from '../types/calculator';
import { formatNumber } from '../utils/formatters';
import { RotateCcw, Calculator, Grid } from 'lucide-react';

interface FloorScreedCalculatorProps {
  onSaveHistory: (item: CalculationHistoryItem) => void;
  onPrintReport: (item: CalculationHistoryItem) => void;
  initialInputs?: Partial<ScreedInputs>;
}

export const FloorScreedCalculator: React.FC<FloorScreedCalculatorProps> = ({
  onSaveHistory,
  onPrintReport,
  initialInputs,
}) => {
  const { t } = useTranslation();

  const [roomLength, setRoomLength] = useState<number | string>(initialInputs?.roomLength ?? 8.0);
  const [roomWidth, setRoomWidth] = useState<number | string>(initialInputs?.roomWidth ?? 6.0);
  const [screedThicknessMm, setScreedThicknessMm] = useState<number | string>(initialInputs?.screedThicknessMm ?? 50);
  const [screedType, setScreedType] = useState<'cement_sand' | 'semi_dry' | 'self_leveling'>(
    initialInputs?.screedType ?? 'cement_sand'
  );
  const [bagWeightKg, setBagWeightKg] = useState<number | string>(initialInputs?.bagWeightKg ?? 25);
  const [reservePercent, setReservePercent] = useState<number | string>(initialInputs?.reservePercent ?? 5);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ScreedResult | null>(null);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (roomLength === '' || Number(roomLength) <= 0) errs.roomLength = t('errors.positiveNumber');
    if (roomWidth === '' || Number(roomWidth) <= 0) errs.roomWidth = t('errors.positiveNumber');
    if (screedThicknessMm === '' || Number(screedThicknessMm) <= 0) {
      errs.screedThicknessMm = t('errors.positiveNumber');
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCalculate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validate()) return;

    try {
      const inputs: ScreedInputs = {
        roomLength: Number(roomLength),
        roomWidth: Number(roomWidth),
        screedThicknessMm: Number(screedThicknessMm),
        screedType,
        bagWeightKg: Number(bagWeightKg),
        reservePercent: Number(reservePercent) || 0,
      };

      const res = calculateFloorScreed(inputs);
      setResult(res);

      const typeTitles = {
        cement_sand: 'Цементно-песчаная М150/М200',
        semi_dry: 'Полусухая механизированная с фиброй',
        self_leveling: 'Самонивелирующийся наливной пол',
      };

      const historyItem: CalculationHistoryItem = {
        id: 'calc_' + Date.now(),
        calculatorId: 'screed',
        calculatorTitle: 'Калькулятор стяжки пола',
        timestamp: Date.now(),
        inputs: {
          'Длина помещения': `${roomLength} м`,
          'Ширина помещения': `${roomWidth} м`,
          'Толщина стяжки': `${screedThicknessMm} мм`,
          'Тип стяжки': typeTitles[screedType],
          'Запас': `${reservePercent}%`,
        },
        inputLabels: {
          'Длина помещения': 'м',
          'Ширина помещения': 'м',
          'Толщина стяжки': 'мм',
          'Тип стяжки': '',
          'Запас': '%',
        },
        results: [
          {
            label: 'Количество мешков сухой смеси',
            value: res.bagsCount,
            unit: 'мешков',
            isPrimary: true,
            helperText: `Фасовка по ${bagWeightKg} кг, общий вес: ${formatNumber(res.totalDryMixKg, 0)} кг`,
          },
          {
            label: 'Физический объём раствора',
            value: formatNumber(res.volumeM3, 3),
            unit: 'м³',
            helperText: `На площадь пола ${formatNumber(res.area, 2)} м²`,
          },
          {
            label: 'Демпферная компенсационная лента',
            value: formatNumber(res.damperTapeMeters, 1),
            unit: 'пог. м',
            helperText: 'Укладывается по всему периметру стен помещения',
          },
          {
            label: 'Армирующая сетка (картами)',
            value: formatNumber(res.reinforcingMeshM2, 1),
            unit: 'м²',
          },
          {
            label: 'Полипропиленовое фиброволокно',
            value: formatNumber(res.fiberKg, 1),
            unit: 'кг',
            helperText: 'Расход ~0.9 кг/м³ для предотвращения усадочных трещин',
          },
        ],
        formulaText: res.formula,
        formulaSubstituted: res.formulaSubstituted,
        normReference: 'СП РК 3.02-108-2012 / Полы',
      };

      onSaveHistory(historyItem);
      setLastSavedId(historyItem.id);
    } catch (err: any) {
      setErrors({ global: err.message || 'Ошибка расчёта' });
    }
  };

  const handleReset = () => {
    setRoomLength(8.0);
    setRoomWidth(6.0);
    setScreedThicknessMm(50);
    setScreedType('cement_sand');
    setBagWeightKg(25);
    setReservePercent(5);
    setErrors({});
    setResult(null);
    setLastSavedId(null);
  };

  const resultItems: ResultItem[] = result
    ? [
        {
          label: 'Требуется мешков смеси',
          value: result.bagsCount,
          unit: 'мешков',
          isPrimary: true,
          helperText: `Масса: ${formatNumber(result.totalDryMixKg, 0)} кг (мешки по ${bagWeightKg} кг)`,
        },
        {
          label: 'Объём готового раствора',
          value: formatNumber(result.volumeM3, 3),
          unit: 'м³',
          helperText: `При толщине ${screedThicknessMm} мм на площади ${formatNumber(result.area, 2)} м²`,
        },
        {
          label: 'Демпферная лента (периметр)',
          value: formatNumber(result.damperTapeMeters, 1),
          unit: 'пог. м',
          helperText: 'Компенсация температурно-усадочных деформаций',
        },
        {
          label: 'Армирующая сетка 50×50 или 100×100',
          value: formatNumber(result.reinforcingMeshM2, 1),
          unit: 'м²',
          helperText: 'С учётом нахлёста сеток 10%',
        },
        {
          label: 'Фиброволокно полипропиленовое',
          value: formatNumber(result.fiberKg, 1),
          unit: 'кг',
          helperText: 'Объёмное микроармирование стяжки',
        },
      ]
    : [];

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 shadow-xs">
      <div className="border-b border-slate-200 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Калькулятор стяжки пола
          </h2>
          <span className="text-xs font-mono text-slate-500 font-semibold bg-slate-100 px-2 py-1 rounded">
            СП РК 3.02-108
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Расчёт мокрой, полусухой механизированной и самовыравнивающейся стяжки: сухая смесь, мешки, фиброволокно и демпферная лента.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <form onSubmit={handleCalculate} className="lg:col-span-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <InputGroup
              id="screed-len"
              label="Длина помещения"
              value={roomLength}
              onChange={setRoomLength}
              unit="м"
              placeholder="8.0"
              error={errors.roomLength}
              min={0.5}
              step={0.5}
            />

            <InputGroup
              id="screed-w"
              label="Ширина помещения"
              value={roomWidth}
              onChange={setRoomWidth}
              unit="м"
              placeholder="6.0"
              error={errors.roomWidth}
              min={0.5}
              step={0.5}
            />

            <InputGroup
              id="screed-thick"
              label="Толщина стяжки"
              value={screedThicknessMm}
              onChange={setScreedThicknessMm}
              unit="мм"
              placeholder="50"
              error={errors.screedThicknessMm}
              min={5}
              max={150}
              presets={[
                { label: '30 мм', value: 30 },
                { label: '50 мм', value: 50 },
                { label: '70 мм', value: 70 },
                { label: '100 мм', value: 100 },
              ]}
            />
          </div>

          {/* Screed Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Тип стяжки пола
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setScreedType('cement_sand')}
                className={`p-2.5 rounded border text-left text-xs transition-colors ${
                  screedType === 'cement_sand'
                    ? 'bg-blue-900 text-white border-blue-900 font-semibold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="font-medium text-[11px]">ЦПС (мокрая)</div>
                <div className={`text-[10px] mt-0.5 ${screedType === 'cement_sand' ? 'text-blue-200' : 'text-slate-400'}`}>
                  М150/М200 классическая
                </div>
              </button>

              <button
                type="button"
                onClick={() => setScreedType('semi_dry')}
                className={`p-2.5 rounded border text-left text-xs transition-colors ${
                  screedType === 'semi_dry'
                    ? 'bg-blue-900 text-white border-blue-900 font-semibold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="font-medium text-[11px]">Полусухая</div>
                <div className={`text-[10px] mt-0.5 ${screedType === 'semi_dry' ? 'text-blue-200' : 'text-slate-400'}`}>
                  С добавлением фибры
                </div>
              </button>

              <button
                type="button"
                onClick={() => setScreedType('self_leveling')}
                className={`p-2.5 rounded border text-left text-xs transition-colors ${
                  screedType === 'self_leveling'
                    ? 'bg-blue-900 text-white border-blue-900 font-semibold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="font-medium text-[11px]">Наливной пол</div>
                <div className={`text-[10px] mt-0.5 ${screedType === 'self_leveling' ? 'text-blue-200' : 'text-slate-400'}`}>
                  Самонивелир. финиш
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InputGroup
              id="screed-bag"
              label="Вес мешка смеси"
              value={bagWeightKg}
              onChange={setBagWeightKg}
              unit="кг"
              placeholder="25"
              presets={[
                { label: '25 кг', value: 25 },
                { label: '40 кг', value: 40 },
                { label: '50 кг', value: 50 },
              ]}
            />

            <InputGroup
              id="screed-reserve"
              label="Технологический запас"
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
                    calculatorId: 'screed',
                    calculatorTitle: 'Калькулятор стяжки пола',
                    timestamp: Date.now(),
                    inputs: {
                      'Длина помещения': `${roomLength} м`,
                      'Ширина помещения': `${roomWidth} м`,
                      'Толщина стяжки': `${screedThicknessMm} мм`,
                      'Тип': screedType,
                      'Запас': `${reservePercent}%`,
                    },
                    inputLabels: {
                      'Длина помещения': 'м',
                      'Ширина помещения': 'м',
                      'Толщина стяжки': 'мм',
                      'Тип': '',
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
                    normReference: 'СП РК 3.02-108-2012',
                  };
                  onPrintReport(item);
                }}
              />

              <FormulaDisplay
                formulaTitle="Формула объёма и расхода смеси для стяжки"
                formula={result.formula}
                formulaSubstituted={result.formulaSubstituted}
                explanation="Объём раствора вычисляется как площадь пола умноженная на среднюю толщину слоя. Расход сухой смеси определяется плотностью готового состава с запасом на неровности перекрытия."
                normReference="СП РК 3.02-108-2012 «Полы жилых и общественных зданий»"
              />
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded p-8 text-center bg-slate-50/50 min-h-[260px]">
              <div className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <Grid className="w-6 h-6 text-slate-500" />
              </div>
              <h4 className="text-sm font-semibold text-slate-700">
                Задайте площадь и толщину слоя пола
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Расчёт физического объёма раствора, мешков смеси, фибры и компенсационной демпферной ленты.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
