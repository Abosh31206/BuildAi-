import React, { useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  X,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  MapPin,
  Calendar,
  UserCheck,
} from 'lucide-react';
import { ProjectAlbumData, ProjectMetadata } from '../types';
import { generatePdfAlbum } from '../engine/pdfAlbumBuilder';

interface ProjectAlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'ru' | 'kk';
}

export const ProjectAlbumModal: React.FC<ProjectAlbumModalProps> = ({
  isOpen,
  onClose,
  language,
}) => {
  const [activeSheet, setActiveSheet] = useState<number>(1);
  const [isExporting, setIsExporting] = useState(false);

  // Editable Project Metadata
  const [meta, setMeta] = useState<ProjectMetadata>({
    projectName: 'Индивидуальный двухэтажный жилой дом 180 м²',
    projectCode: 'KZ-2025/АР-084',
    objectAddress: 'мкр. Уркер, уч. 45/2',
    city: 'Астана',
    clientName: 'Ахметов Б. К.',
    contractor: 'ТОО "Сарыарка Констракшн"',
    generalEngineerGip: 'Касымов Е. С.',
    leadArchitect: 'Смагулова А. Т.',
    stage: 'АР',
    year: 2025,
    dateStr: '11.2025',
  });

  const kzCities = ['Астана', 'Алматы', 'Шымкент', 'Караганда', 'Актобе', 'Павлодар', 'Усть-Каменогорск'];

  // Default sample material specification data
  const materials = [
    {
      id: 'm1',
      name: 'Бетон тяжелый B25 (W6, F150)',
      gostOrStandard: 'ГОСТ 26633-2015',
      unit: 'м³',
      quantity: 58.4,
      safetyMarginPct: 5,
      totalWithMargin: 61.3,
      note: 'Фундамент и ж/б пояс',
    },
    {
      id: 'm2',
      name: 'Арматурный прокат А500С Ø12 мм',
      gostOrStandard: 'ГОСТ 34028-2016',
      unit: 'т',
      quantity: 3.82,
      safetyMarginPct: 7,
      totalWithMargin: 4.09,
      note: 'Продольная арматура',
    },
    {
      id: 'm3',
      name: 'Кирпич керамический полнотелый М150',
      gostOrStandard: 'ГОСТ 530-2012',
      unit: 'шт',
      quantity: 14200,
      safetyMarginPct: 5,
      totalWithMargin: 14910,
      note: 'Несущие стены 380 мм',
    },
    {
      id: 'm4',
      name: 'Раствор кладочный цементный М100',
      gostOrStandard: 'ГОСТ 28013-98',
      unit: 'м³',
      quantity: 12.8,
      safetyMarginPct: 6,
      totalWithMargin: 13.6,
      note: 'Стены и перегородки',
    },
    {
      id: 'm5',
      name: 'Минераловатный утеплитель 120 кг/м³ (150мм)',
      gostOrStandard: 'СП РК 2.04-01-2017',
      unit: 'м²',
      quantity: 215.0,
      safetyMarginPct: 5,
      totalWithMargin: 225.8,
      note: 'Фасадное утепление',
    },
    {
      id: 'm6',
      name: 'Металлочерепица полиэстер 0.5 мм',
      gostOrStandard: 'ГОСТ Р 58153-2018',
      unit: 'м²',
      quantity: 172.5,
      safetyMarginPct: 10,
      totalWithMargin: 189.8,
      note: 'Двускатная кровля',
    },
    {
      id: 'm7',
      name: 'Смесь штукатурная цементная М150',
      gostOrStandard: 'ГОСТ 31357-2007',
      unit: 'кг',
      quantity: 3450,
      safetyMarginPct: 5,
      totalWithMargin: 3620,
      note: 'Внутренняя отделка',
    },
  ];

  const calculations = [
    {
      id: 'c1',
      calculatorTitle: 'Монолитный фундамент и ростверк',
      normCode: 'СП РК 5.03-107-2013',
      keyFormula: 'V = L × B × H × (1 + k_зап)',
      primaryResult: '61.3 м³ (B25, П4)',
      notes: 'С учетом бетонной подготовки 100 мм',
    },
    {
      id: 'c2',
      calculatorTitle: 'Теплотехнический расчет стены',
      normCode: 'СП РК 2.04-03-2011',
      keyFormula: 'R_0 = Σ (δ_i / λ_i) ≥ R_req',
      primaryResult: 'R = 3.65 (м²·°C)/Вт (Норма 3.2)',
      notes: 'Утеплитель минвата 150 мм для Астаны',
    },
    {
      id: 'c3',
      calculatorTitle: 'Армирование ленточного фундамента',
      normCode: 'СП РК 5.03-107-2013 п.5.2.11',
      keyFormula: 'μ = As / (b × h0) ≥ 0.1%',
      primaryResult: '4.09 т (А500С Ø12мм)',
      notes: 'Защитный слой 40 мм',
    },
    {
      id: 'c4',
      calculatorTitle: 'Кирпичная кладка стен',
      normCode: 'СП РК 5.02-102-2014',
      keyFormula: 'N = V_wall × 394 шт/м³',
      primaryResult: '14 910 шт кирпича',
      notes: 'Раствор М100, швы 12 мм',
    },
  ];

  if (!isOpen) return null;

  const handleDownloadPdf = () => {
    setIsExporting(true);
    try {
      const albumData: ProjectAlbumData = {
        metadata: meta,
        materials,
        calculations,
      };
      const doc = generatePdfAlbum(albumData, language);
      doc.save(`${meta.projectCode.replace(/[/\\?%*:|"<>]/g, '-')}-Альбом_ПД.pdf`);
    } catch (e) {
      console.error('PDF export error:', e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleBrowserPrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center font-bold text-white shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                <span>{language === 'kk' ? 'Жобалық құжаттама альбомы' : 'Альбом проектной документации'}</span>
                <span className="text-[11px] bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded font-mono">
                  ГОСТ 21.101-2020 / СП РК
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'kk'
                  ? 'ҚР нормалары бойынша титул парағы, сызбалар және материалдар спецификациясы'
                  : 'Титульный лист, чертежи, спецификации материалов и сводка расчетов'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBrowserPrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              title="Печать"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{language === 'kk' ? 'Басып шығару' : 'Печать'}</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Генерация...' : language === 'kk' ? 'PDF жүктеу' : 'Скачать PDF альбом'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Conceptual Engineering Warning Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex items-center gap-3 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <div className="leading-snug">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-amber-800 mr-2">
              {language === 'kk' ? 'ЕСКЕРТУ:' : 'ПРЕДУПРЕЖДЕНИЕ ГИП:'}
            </span>
            {language === 'kk'
              ? 'Бұл құжат тұжырымдамалық-эскиздік сипатқа ие және құрылыс алдында сертификатталған сарапшының (ГИП) тексеруінен өтуі тиіс.'
              : 'Документ носит концептуальный/эскизный характер и подлежит проверке сертифицированным инженером (ГИП) перед строительством.'}
          </div>
        </div>

        {/* Content Body: Left metadata editor & right sheet preview */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 min-h-0">
          {/* Controls Column (4 cols) */}
          <div className="lg:col-span-4 bg-slate-50 border-r border-slate-200 p-4 space-y-5 overflow-y-auto">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>{language === 'kk' ? 'Нысан деректері' : 'Атрибуты проекта'}</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    {language === 'kk' ? 'Нысан атауы' : 'Название объекта'}
                  </label>
                  <input
                    type="text"
                    value={meta.projectName}
                    onChange={(e) => setMeta({ ...meta, projectName: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">
                      {language === 'kk' ? 'Шифр' : 'Шифр проекта'}
                    </label>
                    <input
                      type="text"
                      value={meta.projectCode}
                      onChange={(e) => setMeta({ ...meta, projectCode: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 font-mono text-xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">
                      {language === 'kk' ? 'Стадия' : 'Стадия'}
                    </label>
                    <select
                      value={meta.stage}
                      onChange={(e) => setMeta({ ...meta, stage: e.target.value as any })}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                    >
                      <option value="АР">АР (Архитектурные решения)</option>
                      <option value="КЖ">КЖ (Конструкции ж/б)</option>
                      <option value="АС">АС (Архитектурно-строительные)</option>
                      <option value="ЭП">ЭП (Эскизный проект)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">
                      {language === 'kk' ? 'Қала' : 'Город'}
                    </label>
                    <select
                      value={meta.city}
                      onChange={(e) => setMeta({ ...meta, city: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                    >
                      {kzCities.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">
                      {language === 'kk' ? 'Күні' : 'Дата'}
                    </label>
                    <input
                      type="text"
                      value={meta.dateStr}
                      onChange={(e) => setMeta({ ...meta, dateStr: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 font-mono text-xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    {language === 'kk' ? 'Мекенжай' : 'Адрес площадки'}
                  </label>
                  <input
                    type="text"
                    value={meta.objectAddress}
                    onChange={(e) => setMeta({ ...meta, objectAddress: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    {language === 'kk' ? 'Тапсырыс беруші' : 'Заказчик'}
                  </label>
                  <input
                    type="text"
                    value={meta.clientName}
                    onChange={(e) => setMeta({ ...meta, clientName: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">
                      ГИП (Инженер)
                    </label>
                    <input
                      type="text"
                      value={meta.generalEngineerGip}
                      onChange={(e) => setMeta({ ...meta, generalEngineerGip: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">
                      Архитектор
                    </label>
                    <input
                      type="text"
                      value={meta.leadArchitect}
                      onChange={(e) => setMeta({ ...meta, leadArchitect: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sheet Selector Tabs */}
            <div className="pt-2 border-t border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                {language === 'kk' ? 'Альбом парақтары' : 'Листы проектного альбома'}
              </h4>
              <div className="space-y-1.5">
                {[
                  { num: 1, title: 'Титульный лист', sub: 'Обложка и реквизиты' },
                  { num: 2, title: 'Лист 1: Общие данные', sub: 'Нормативы СП РК и сводка расчетов' },
                  { num: 3, title: 'Лист 2: План этажа', sub: 'Архитектурный план и экспликация' },
                  { num: 4, title: 'Лист 3: Спецификация', sub: 'Ведомость материалов ГОСТ 21.110' },
                ].map((s) => (
                  <button
                    key={s.num}
                    onClick={() => setActiveSheet(s.num)}
                    className={`w-full text-left p-2.5 rounded-lg border transition-all text-xs ${
                      activeSheet === s.num
                        ? 'bg-blue-50 border-blue-300 text-blue-950 font-semibold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{s.title}</span>
                      <span className="font-mono text-[10px] text-slate-400">A4 Альбом</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-normal">{s.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sheet Preview Area (8 cols) */}
          <div className="lg:col-span-8 bg-slate-200 p-4 sm:p-6 overflow-y-auto flex items-center justify-center">
            {/* Virtual A4 Landscape sheet in 297x210 proportion */}
            <div className="bg-white shadow-xl border border-slate-300 rounded-sm w-full max-w-[840px] aspect-[1.414/1] p-6 text-slate-900 flex flex-col justify-between relative font-sans text-xs">
              {/* Outer Drawing Border (20mm left margin simulated) */}
              <div className="absolute inset-2 border-2 border-slate-800 pointer-events-none" />
              <div className="absolute top-2 left-6 bottom-2 border-l border-slate-400 pointer-events-none" />

              {/* SHEET 1: TITLE PAGE PREVIEW */}
              {activeSheet === 1 && (
                <div className="h-full flex flex-col justify-between py-6 px-8 text-center">
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">
                      Республика Казахстан
                    </p>
                    <p className="text-[9px] text-slate-500 max-w-md mx-auto uppercase">
                      Министерство промышленности и строительства Республики Казахстан
                    </p>
                    <div className="w-48 h-px bg-slate-300 mx-auto my-2" />
                    <p className="text-[10px] font-semibold text-blue-900">
                      ТОО «BuildAI KZ Engineering» · Инжиниринговая платформа
                    </p>
                  </div>

                  <div className="space-y-4 my-auto">
                    <div className="inline-block px-3 py-1 bg-slate-100 border border-slate-300 text-[11px] font-mono font-bold text-slate-800">
                      ШИФР: {meta.projectCode}
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                      Проектная документация
                    </h1>
                    <div className="text-base font-bold text-blue-950 uppercase">
                      {meta.projectName}
                    </div>
                    <p className="text-xs text-slate-600">
                      Адрес объекта: г. {meta.city}, {meta.objectAddress}
                    </p>
                    <p className="text-xs text-slate-500">
                      Заказчик: <span className="font-semibold text-slate-800">{meta.clientName}</span>
                    </p>
                    <div className="inline-block text-xs font-bold text-slate-700 border-t border-b border-slate-300 py-1 px-4">
                      РАЗДЕЛ: {meta.stage} (АРХИТЕКТУРНО-СТРОИТЕЛЬНЫЕ РЕШЕНИЯ И РАСЧЕТЫ)
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded p-1.5 max-w-lg mx-auto">
                      Эскизный проект подготовлен в BuildAI KZ. Подлежит согласованию с ГИП.
                    </div>
                    <p className="text-xs font-medium text-slate-600">
                      г. {meta.city} — {meta.year} г.
                    </p>
                  </div>
                </div>
              )}

              {/* SHEET 2: GENERAL DATA & SUMMARY PREVIEW */}
              {activeSheet === 2 && (
                <div className="h-full flex flex-col justify-between py-2 px-6">
                  <div>
                    <h3 className="text-xs font-bold uppercase text-slate-900 mb-2">
                      Ведомость рабочих чертежей и нормативная база (СП РК)
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-[10px]">
                      <div className="border border-slate-300 p-2 rounded bg-slate-50">
                        <span className="font-bold text-slate-800 block mb-1">Примененные нормы:</span>
                        <ul className="space-y-1 text-slate-600">
                          <li>• СП РК 5.03-107-2013 (Бетонные и ж/б конструкции)</li>
                          <li>• СП РК 5.01-102-2013 (Основания зданий, глубина)</li>
                          <li>• СП РК 2.04-01-2017 (Строительная климатология г. {meta.city})</li>
                          <li>• ГОСТ 21.101-2020 (СПДС. Основные требования)</li>
                        </ul>
                      </div>
                      <div className="border border-slate-300 p-2 rounded bg-slate-50">
                        <span className="font-bold text-slate-800 block mb-1">Сведения об объекте:</span>
                        <p className="text-slate-600">Класс ответственности здания: II (нормальный)</p>
                        <p className="text-slate-600">Степень огнестойкости: II</p>
                        <p className="text-slate-600">Сейсмичность района: 7-8 баллов</p>
                      </div>
                    </div>

                    <h4 className="text-xs font-bold uppercase text-slate-900 mt-4 mb-1">
                      Сводка ключевых инженерных расчетов:
                    </h4>
                    <table className="w-full text-left text-[10px] border border-slate-300">
                      <thead className="bg-slate-100 font-bold border-b border-slate-300">
                        <tr>
                          <th className="p-1 border-r border-slate-300">Конструкция</th>
                          <th className="p-1 border-r border-slate-300">Норматив СП РК</th>
                          <th className="p-1 border-r border-slate-300">Формула</th>
                          <th className="p-1">Результат</th>
                        </tr>
                      </thead>
                      <tbody>
                        {calculations.map((c) => (
                          <tr key={c.id} className="border-b border-slate-200">
                            <td className="p-1 border-r border-slate-200 font-medium">{c.calculatorTitle}</td>
                            <td className="p-1 border-r border-slate-200 font-mono">{c.normCode}</td>
                            <td className="p-1 border-r border-slate-200 font-mono">{c.keyFormula}</td>
                            <td className="p-1 font-bold text-blue-900">{c.primaryResult}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* SPDS Basic Stamp Mockup in Bottom Right */}
                  <div className="self-end border border-slate-800 w-72 text-[9px] bg-white">
                    <div className="grid grid-cols-4 border-b border-slate-800 text-center font-bold bg-slate-100 py-0.5">
                      <div className="border-r border-slate-800">ГИП</div>
                      <div className="border-r border-slate-800">Касымов</div>
                      <div className="border-r border-slate-800">Лист</div>
                      <div>Листов</div>
                    </div>
                    <div className="grid grid-cols-4 text-center py-0.5 border-b border-slate-800">
                      <div className="border-r border-slate-800">Разраб.</div>
                      <div className="border-r border-slate-800">Смагулова</div>
                      <div className="border-r border-slate-800 font-bold">1</div>
                      <div className="font-bold">4</div>
                    </div>
                    <div className="p-1 text-center font-bold text-slate-800">
                      ТОО «BuildAI KZ Engineering» · {meta.projectCode}
                    </div>
                  </div>
                </div>
              )}

              {/* SHEET 3: ARCHITECTURAL PLAN PREVIEW */}
              {activeSheet === 3 && (
                <div className="h-full flex flex-col justify-between py-2 px-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold uppercase text-slate-900">
                        Архитектурный план этажа на отм. +0.000 (М 1:100)
                      </h3>
                      <span className="text-[10px] font-mono text-slate-500">Оси 1-2-3 / А-Б-В</span>
                    </div>

                    <div className="grid grid-cols-12 gap-3 items-center">
                      <div className="col-span-7 border-2 border-slate-800 rounded bg-slate-50 p-3 h-44 relative flex items-center justify-center">
                        <div className="w-full h-full border border-dashed border-slate-400 relative">
                          {/* Inner dividing wall */}
                          <div className="absolute top-0 bottom-0 left-1/2 border-l-2 border-slate-800" />
                          <div className="absolute left-0 right-0 top-1/2 border-t-2 border-slate-800" />

                          {/* Room numbers */}
                          <span className="absolute top-2 left-2 text-[9px] font-bold text-slate-700">1. Гостиная (28.5 м²)</span>
                          <span className="absolute top-2 right-2 text-[9px] font-bold text-slate-700">2. Кухня (18.2 м²)</span>
                          <span className="absolute bottom-2 left-2 text-[9px] font-bold text-slate-700">3. Спальня (16.4 м²)</span>
                          <span className="absolute bottom-2 right-2 text-[9px] font-bold text-slate-700">4. Холл/Санузел (12.0 м²)</span>
                        </div>
                      </div>

                      {/* Explication */}
                      <div className="col-span-5 text-[9px]">
                        <span className="font-bold text-slate-800 block mb-1">Экспликация помещений:</span>
                        <table className="w-full border border-slate-300">
                          <thead className="bg-slate-100 font-bold border-b border-slate-300">
                            <tr>
                              <th className="p-0.5 border-r border-slate-300">№</th>
                              <th className="p-0.5 border-r border-slate-300">Помещение</th>
                              <th className="p-0.5">Площадь</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-slate-200">
                              <td className="p-0.5 border-r border-slate-200 text-center">1</td>
                              <td className="p-0.5 border-r border-slate-200">Гостиная</td>
                              <td className="p-0.5 font-bold">28.50 м²</td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td className="p-0.5 border-r border-slate-200 text-center">2</td>
                              <td className="p-0.5 border-r border-slate-200">Кухня-столовая</td>
                              <td className="p-0.5 font-bold">18.20 м²</td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td className="p-0.5 border-r border-slate-200 text-center">3</td>
                              <td className="p-0.5 border-r border-slate-200">Спальня</td>
                              <td className="p-0.5 font-bold">16.40 м²</td>
                            </tr>
                            <tr>
                              <td className="p-0.5 border-r border-slate-200 text-center">4</td>
                              <td className="p-0.5 border-r border-slate-200">Холл и с/у</td>
                              <td className="p-0.5 font-bold">12.00 м²</td>
                            </tr>
                          </tbody>
                        </table>
                        <div className="mt-1 font-bold text-slate-900 text-right">
                          Общая площадь: 75.10 м²
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SPDS Stamp */}
                  <div className="self-end border border-slate-800 w-72 text-[9px] bg-white">
                    <div className="grid grid-cols-4 border-b border-slate-800 text-center font-bold bg-slate-100 py-0.5">
                      <div className="border-r border-slate-800">ГИП</div>
                      <div className="border-r border-slate-800">{meta.generalEngineerGip}</div>
                      <div className="border-r border-slate-800">Лист</div>
                      <div>Листов</div>
                    </div>
                    <div className="grid grid-cols-4 text-center py-0.5 border-b border-slate-800">
                      <div className="border-r border-slate-800">Стадия</div>
                      <div className="border-r border-slate-800 font-bold">{meta.stage}</div>
                      <div className="border-r border-slate-800 font-bold">2</div>
                      <div className="font-bold">4</div>
                    </div>
                    <div className="p-1 text-center font-bold text-slate-800">
                      ТОО «BuildAI KZ Engineering» · {meta.projectCode}
                    </div>
                  </div>
                </div>
              )}

              {/* SHEET 4: MATERIAL SPECIFICATION PREVIEW */}
              {activeSheet === 4 && (
                <div className="h-full flex flex-col justify-between py-2 px-6">
                  <div>
                    <h3 className="text-xs font-bold uppercase text-slate-900 mb-2">
                      Ведомость расхода основных строительных материалов (ГОСТ 21.110-2013)
                    </h3>
                    <table className="w-full text-left text-[9px] border border-slate-300">
                      <thead className="bg-slate-100 font-bold border-b border-slate-300">
                        <tr>
                          <th className="p-1 border-r border-slate-300">Поз.</th>
                          <th className="p-1 border-r border-slate-300">Наименование материала</th>
                          <th className="p-1 border-r border-slate-300">Марка / ГОСТ</th>
                          <th className="p-1 border-r border-slate-300">Ед.</th>
                          <th className="p-1 border-r border-slate-300">Кол-во</th>
                          <th className="p-1 border-r border-slate-300">Запас</th>
                          <th className="p-1 border-r border-slate-300">С запасом</th>
                          <th className="p-1">Примечание</th>
                        </tr>
                      </thead>
                      <tbody>
                        {materials.map((m, idx) => (
                          <tr key={m.id} className="border-b border-slate-200">
                            <td className="p-1 border-r border-slate-200 text-center font-mono">{idx + 1}</td>
                            <td className="p-1 border-r border-slate-200 font-medium">{m.name}</td>
                            <td className="p-1 border-r border-slate-200 font-mono text-slate-600">{m.gostOrStandard}</td>
                            <td className="p-1 border-r border-slate-200 text-center">{m.unit}</td>
                            <td className="p-1 border-r border-slate-200 text-right font-mono">{m.quantity}</td>
                            <td className="p-1 border-r border-slate-200 text-center font-mono text-blue-800">{m.safetyMarginPct}%</td>
                            <td className="p-1 border-r border-slate-200 text-right font-bold font-mono text-blue-900">{m.totalWithMargin}</td>
                            <td className="p-1 text-slate-500">{m.note}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* SPDS Stamp */}
                  <div className="self-end border border-slate-800 w-72 text-[9px] bg-white">
                    <div className="grid grid-cols-4 border-b border-slate-800 text-center font-bold bg-slate-100 py-0.5">
                      <div className="border-r border-slate-800">ГИП</div>
                      <div className="border-r border-slate-800">{meta.generalEngineerGip}</div>
                      <div className="border-r border-slate-800">Лист</div>
                      <div>Листов</div>
                    </div>
                    <div className="grid grid-cols-4 text-center py-0.5 border-b border-slate-800">
                      <div className="border-r border-slate-800">Стадия</div>
                      <div className="border-r border-slate-800 font-bold">{meta.stage}</div>
                      <div className="border-r border-slate-800 font-bold">3</div>
                      <div className="font-bold">4</div>
                    </div>
                    <div className="p-1 text-center font-bold text-slate-800">
                      ТОО «BuildAI KZ Engineering» · {meta.projectCode}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Формат альбома: <strong>A4 Альбомный (297×210 мм)</strong></span>
            <span>·</span>
            <span>Штамп: <strong>ГОСТ 21.101-2020 Форма 3</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium transition-colors"
            >
              {language === 'kk' ? 'Жабу' : 'Закрыть'}
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded bg-blue-900 hover:bg-blue-800 text-white font-semibold shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Генерация...' : language === 'kk' ? 'PDF жүктеу' : 'Скачать PDF альбом (A4 ГОСТ)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
