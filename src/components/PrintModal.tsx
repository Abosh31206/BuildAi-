import React, { useState } from 'react';
import { useTranslation } from '../locales/LanguageContext';
import { CalculationHistoryItem } from '../types/calculator';
import { formatDateTime } from '../utils/formatters';
import { Printer, X, Download, ShieldCheck } from 'lucide-react';

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: CalculationHistoryItem | null;
}

export const PrintModal: React.FC<PrintModalProps> = ({
  isOpen,
  onClose,
  item,
}) => {
  const { t, language } = useTranslation();
  const [projectName, setProjectName] = useState('Объект: Строительство жилого / коммерческого комплекса');
  const [engineerName, setEngineerName] = useState('Инженер-проектировщик');

  if (!isOpen || !item) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl bg-white rounded-lg shadow-2xl overflow-hidden my-8 border border-slate-300">
        {/* Controls Toolbar (hidden on print) */}
        <div className="no-print p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-400" />
            <span className="font-bold text-sm">
              Инженерный бланк расчёта · BuildAI KZ
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t('app.print')} (PDF)</span>
            </button>
            <button
              onClick={onClose}
              type="button"
              className="p-1.5 text-slate-400 hover:text-white rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Editable fields for the report (hidden on print or styled cleanly) */}
        <div className="no-print p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Наименование объекта / проекта:
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs outline-none focus:border-blue-600"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              ФИО инженера / исполнителя:
            </label>
            <input
              type="text"
              value={engineerName}
              onChange={(e) => setEngineerName(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs outline-none focus:border-blue-600"
            />
          </div>
        </div>

        {/* The Printable Engineering Sheet Content */}
        <div className="p-8 sm:p-10 space-y-6 text-slate-900 font-sans print:p-0 print:m-0">
          {/* Document Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
            <div>
              <div className="text-xl font-black tracking-tight uppercase text-slate-900">
                BuildAI KZ
              </div>
              <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mt-0.5">
                Қазақстанның құрылыс саласы · Инженерный расчётно-пояснительный лист
              </div>
            </div>
            <div className="text-right text-xs font-mono text-slate-600">
              <div>Дата: <span className="font-semibold text-slate-900">{formatDateTime(item.timestamp, language)}</span></div>
              <div>ID расчёта: <span className="font-semibold">{item.id}</span></div>
            </div>
          </div>

          {/* Project & Metadata Box */}
          <div className="bg-slate-50 border border-slate-200 rounded p-4 grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-500 block">Объект:</span>
              <span className="font-bold text-slate-900">{projectName}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Исполнитель / Инженер:</span>
              <span className="font-bold text-slate-900">{engineerName}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Тип расчёта:</span>
              <span className="font-bold text-slate-900">{item.calculatorTitle}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Нормативная база:</span>
              <span className="font-mono font-semibold text-slate-900">
                {item.normReference || 'СП РК / ГОСТ'}
              </span>
            </div>
          </div>

          {/* 1. Input Parameters Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
              1. Исходные геометрические и технологические данные
            </h4>
            <table className="w-full text-xs border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="border border-slate-300 px-3 py-2 text-left font-semibold">Параметр</th>
                  <th className="border border-slate-300 px-3 py-2 text-right font-semibold">Значение</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(item.inputs).map(([k, v]) => (
                  <tr key={k} className="hover:bg-slate-50/50">
                    <td className="border border-slate-300 px-3 py-1.5 text-slate-700">{k}</td>
                    <td className="border border-slate-300 px-3 py-1.5 text-right font-mono font-semibold text-slate-900">
                      {String(v)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 2. Mathematical Formulas */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
              2. Расчётные формулы и последовательность вычислений
            </h4>
            <div className="bg-slate-50 border border-slate-300 rounded p-3 font-mono text-xs space-y-1.5">
              <div className="font-bold text-slate-900">
                Базовая формула: {item.formulaText}
              </div>
              {item.formulaSubstituted && (
                <div className="text-slate-700 text-[11px] leading-relaxed">
                  Подстановка: {item.formulaSubstituted}
                </div>
              )}
            </div>
          </div>

          {/* 3. Final Results Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
              3. Сводные результаты расчёта
            </h4>
            <table className="w-full text-xs border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="border border-slate-300 px-3 py-2 text-left font-semibold">Наименование показателя</th>
                  <th className="border border-slate-300 px-3 py-2 text-right font-semibold">Значение</th>
                  <th className="border border-slate-300 px-3 py-2 text-center font-semibold">Ед. изм.</th>
                </tr>
              </thead>
              <tbody>
                {item.results.map((res, idx) => (
                  <tr
                    key={idx}
                    className={res.isPrimary ? 'bg-blue-50 font-bold text-slate-900' : 'hover:bg-slate-50/50'}
                  >
                    <td className="border border-slate-300 px-3 py-2 text-slate-800">
                      {res.label}
                      {res.helperText && (
                        <span className="block text-[10px] text-slate-500 font-normal">
                          {res.helperText}
                        </span>
                      )}
                    </td>
                    <td className="border border-slate-300 px-3 py-2 text-right font-mono font-bold text-slate-900">
                      {res.value}
                    </td>
                    <td className="border border-slate-300 px-3 py-2 text-center font-mono text-slate-600">
                      {res.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Verification stamp & signature lines */}
          <div className="pt-6 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs">
            <div>
              <div className="flex items-center gap-1.5 text-slate-700 font-semibold mb-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Верификация расчёта</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-normal">
                Расчёт выполнен на платформе BuildAI KZ. Соответствует базовым физико-геометрическим формулам строительной механики и материаловедения.
              </p>
            </div>
            <div className="text-right space-y-4">
              <div className="text-[11px] text-slate-500">
                Подпись исполнителя: _____________________
              </div>
              <div className="text-[11px] text-slate-500">
                Дата проверки: «_____» ____________ 202___ г.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
