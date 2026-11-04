import React, { useState } from 'react';
import { useTranslation } from '../../locales/LanguageContext';
import { Building3dSpec, RoofShape, WallFinish, RoofFinish } from './types';
import { BuildingViewport } from './components/BuildingViewport';
import {
  Boxes,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sliders,
  Compass,
} from 'lucide-react';

// Exact default requested by user prompt:
// «Создай двухэтажный кирпичный жилой дом площадью 180 м² с тремя спальнями, кухней, гостиной и двускатной крышей»
const DEFAULT_SPEC: Building3dSpec = {
  id: 'bld_default',
  name: 'Двухэтажный кирпичный жилой дом',
  floors: 2,
  width: 12.0,
  length: 10.0,
  floorHeight: 3.0,
  wallThickness: 0.38, // 1.5 brick thickness (380mm)
  roofType: 'gable',
  roofHeight: 2.8,
  roofOverhang: 0.6,
  wallFinish: 'brick_red',
  roofFinish: 'metal_tile_dark',
  windowsPerSide: 3,
  hasBalcony: true,
  totalArea: 180.0,
};

interface Building3dModuleProps {
  onTransferToCad?: (spec: Building3dSpec) => void;
  onTransferToCalculators?: (spec: Building3dSpec) => void;
}

export const Building3dModule: React.FC<Building3dModuleProps> = ({
  onTransferToCad,
  onTransferToCalculators,
}) => {
  const { language } = useTranslation();
  const [spec, setSpec] = useState<Building3dSpec>(DEFAULT_SPEC);
  const [prompt, setPrompt] = useState(
    'Создай двухэтажный кирпичный жилой дом площадью 180 м² с тремя спальнями, кухней, гостиной и двускатной крышей'
  );
  const [isParsing, setIsParsing] = useState(false);

  // Parse natural language building prompt
  const handleParsePrompt = async (customPrompt?: string) => {
    const text = (customPrompt || prompt).toLowerCase();
    if (!text.trim()) return;

    setIsParsing(true);

    try {
      // 1. Try server endpoint
      const res = await fetch('/api/ai/generate-3d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.spec) {
          setSpec(data.spec);
          setIsParsing(false);
          return;
        }
      }
    } catch {
      // Fallback parser
    }

    // 2. Intelligent NLP rule parser
    setTimeout(() => {
      let floors = 1;
      if (text.includes('двухэтаж') || text.includes('2 этаж') || text.includes('2-этаж')) floors = 2;
      if (text.includes('трехэтаж') || text.includes('3 этаж') || text.includes('3-этаж')) floors = 3;

      let roofType: RoofShape = 'gable';
      if (text.includes('вальм') || text.includes('четырехскат')) roofType = 'hip';
      if (text.includes('плоск')) roofType = 'flat';

      let wallFinish: WallFinish = 'brick_red';
      if (text.includes('желт') || text.includes('светл')) wallFinish = 'brick_yellow';
      if (text.includes('штукатур') || text.includes('бел')) wallFinish = 'stucco_white';
      if (text.includes('сер')) wallFinish = 'stucco_gray';
      if (text.includes('дерев') || text.includes('брус')) wallFinish = 'wood_timber';

      let roofFinish: RoofFinish = 'metal_tile_dark';
      if (text.includes('красн') || text.includes('черепиц')) roofFinish = 'metal_tile_red';
      if (text.includes('коричнев') || text.includes('битум')) roofFinish = 'soft_shingle_brown';

      // Parse Area if specified
      let area = 180;
      const areaMatch = text.match(/(\d+)\s*(м²|м2|кв)/);
      if (areaMatch) {
        area = parseInt(areaMatch[1], 10);
      }

      // Calculate width & length proportionally
      const footprint = area / floors;
      const width = Math.round(Math.sqrt(footprint * 1.2));
      const length = Math.round(footprint / width);

      setSpec({
        id: 'bld_' + Date.now(),
        name: `${floors}-этажный дом (${wallFinish.includes('brick') ? 'кирпич' : 'штукатурка'})`,
        floors,
        width,
        length,
        floorHeight: 3.0,
        wallThickness: 0.38,
        roofType,
        roofHeight: roofType === 'flat' ? 0.4 : 2.8,
        roofOverhang: 0.6,
        wallFinish,
        roofFinish,
        windowsPerSide: width > 12 ? 4 : 3,
        hasBalcony: floors > 1,
        totalArea: width * length * floors,
      });

      setIsParsing(false);
    }, 450);
  };

  const quickPresets = [
    {
      title: '2-этажный кирпичный дом 180 м² (двускатная)',
      text: 'Создай двухэтажный кирпичный жилой дом площадью 180 м² с тремя спальнями, кухней, гостиной и двускатной крышей',
    },
    {
      title: '1-этажный коттедж 120 м² (вальмовая крыша)',
      text: 'Одноэтажный кирпичный дом площадью 120 м² с четырёхскатной вальмовой крышей и светлой штукатуркой',
    },
    {
      title: '2-этажная вилла 240 м² (плоская крыша)',
      text: 'Двухэтажная современная вилла площадью 240 м² в серой штукатурке с плоской крышей и панорамными окнами',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Module Title */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-900 mb-1">
            <Boxes className="w-4 h-4" />
            <span>Модуль 4 · AI 3D Building Generator (Three.js WebGL)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Генератор 3D-моделей зданий по описанию
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Параметрическая генерация стен, проёмов, перекрытий и крыши с интерактивным 3D-осмотром и экспортом в GLB.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-xs font-mono font-bold text-slate-900">
              {spec.totalArea} м² · {spec.floors} эт.
            </div>
            <div className="text-[10px] text-slate-500">
              Габариты: {spec.width} × {spec.length} м
            </div>
          </div>
        </div>
      </div>

      {/* AI Prompt Input */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            AI-Промпт для генерации 3D-здания
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Введите описание дома..."
            className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded outline-none focus:border-blue-600 focus:bg-white"
          />
          <button
            type="button"
            onClick={() => handleParsePrompt()}
            disabled={isParsing}
            className="inline-flex items-center justify-center gap-2 px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded transition-colors disabled:opacity-50 shrink-0 shadow-xs"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isParsing ? 'animate-spin' : ''}`} />
            <span>{isParsing ? 'Построение...' : 'Сгенерировать 3D-модель'}</span>
          </button>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-[11px] text-slate-400 font-medium">Готовые примеры:</span>
          {quickPresets.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setPrompt(p.text);
                handleParsePrompt(p.text);
              }}
              className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
            >
              {p.title}
            </button>
          ))}
        </div>
      </div>

      {/* 3D Viewport */}
      <BuildingViewport spec={spec} language={language} />

      {/* Material & Geometry Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Wall Finish */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-2">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
            Материал и отделка стен
          </span>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            {[
              { id: 'brick_red', label: 'Красный кирпич' },
              { id: 'brick_yellow', label: 'Жёлтый кирпич' },
              { id: 'stucco_white', label: 'Белая штукатурка' },
              { id: 'stucco_gray', label: 'Серая штукатурка' },
            ].map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => setSpec({ ...spec, wallFinish: w.id as any })}
                className={`p-2 rounded border text-left text-[11px] transition-colors ${
                  spec.wallFinish === w.id
                    ? 'bg-blue-900 text-white border-blue-900 font-semibold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        {/* Roof Finish */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-2">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
            Форма и покрытие крыши
          </span>
          <div className="grid grid-cols-3 gap-1.5 text-xs mb-2">
            {[
              { id: 'gable', label: 'Двускатная' },
              { id: 'hip', label: 'Вальмовая' },
              { id: 'flat', label: 'Плоская' },
            ].map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSpec({ ...spec, roofType: r.id as any })}
                className={`p-1.5 rounded border text-center text-[11px] transition-colors ${
                  spec.roofType === r.id
                    ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => setSpec({ ...spec, roofFinish: 'metal_tile_dark' })}
              className={`p-1.5 rounded border text-center ${
                spec.roofFinish === 'metal_tile_dark'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'bg-white text-slate-600'
              }`}
            >
              Тёмная металлочерепица
            </button>
            <button
              type="button"
              onClick={() => setSpec({ ...spec, roofFinish: 'metal_tile_red' })}
              className={`p-1.5 rounded border text-center ${
                spec.roofFinish === 'metal_tile_red'
                  ? 'bg-rose-900 text-white font-semibold'
                  : 'bg-white text-slate-600'
              }`}
            >
              Красная черепица
            </button>
          </div>
        </div>

        {/* Integration Actions */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-2.5 flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
              Синхронизация модулей
            </span>
            <p className="text-[11px] text-slate-500 mt-1 leading-normal">
              Передайте геометрические параметры 3D-модели в чертёжный 2D CAD или строительные калькуляторы.
            </p>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => onTransferToCad && onTransferToCad(spec)}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-900 font-semibold rounded text-xs transition-colors border border-blue-200"
            >
              <span>Сформировать 2D план в CAD</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => onTransferToCalculators && onTransferToCalculators(spec)}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded text-xs transition-colors"
            >
              <span>Рассчитать материалы в Калькуляторах</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
