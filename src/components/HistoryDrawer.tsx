import React, { useState } from 'react';
import { useTranslation } from '../locales/LanguageContext';
import { CalculationHistoryItem, CalculatorId } from '../types/calculator';
import { formatDateTime } from '../utils/formatters';
import {
  X,
  Trash2,
  Printer,
  Copy,
  Check,
  RotateCcw,
  Search,
  Clock,
  ExternalLink,
} from 'lucide-react';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: CalculationHistoryItem[];
  onClearHistory: () => void;
  onDeleteItem: (id: string) => void;
  onRestoreCalculation: (item: CalculationHistoryItem) => void;
  onPrintItem: (item: CalculationHistoryItem) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
  onClearHistory,
  onDeleteItem,
  onRestoreCalculation,
  onPrintItem,
}) => {
  const { t, language } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredHistory = history.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = item.calculatorTitle.toLowerCase().includes(q);
    const resultsMatch = item.results.some(
      (r) => r.label.toLowerCase().includes(q) || String(r.value).toLowerCase().includes(q)
    );
    return titleMatch || resultsMatch;
  });

  const handleCopy = (item: CalculationHistoryItem) => {
    const text = [
      `BuildAI KZ — ${item.calculatorTitle}`,
      `Дата: ${formatDateTime(item.timestamp, language)}`,
      `Входные параметры:`,
      ...Object.entries(item.inputs).map(([k, v]) => `  • ${k}: ${v}`),
      `Результаты:`,
      ...item.results.map((r) => `  • ${r.label}: ${r.value} ${r.unit}`),
      `Формула: ${item.formulaText}`,
      item.formulaSubstituted ? `Подстановка: ${item.formulaSubstituted}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-slate-200 shadow-xl flex flex-col">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-700" />
              <h3 className="text-base font-bold text-slate-900">
                {t('app.recentCalculations')}
              </h3>
              <span className="text-xs font-mono font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                {history.length}
              </span>
            </div>
            <button
              onClick={onClose}
              type="button"
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search bar & Clear all action */}
          {history.length > 0 && (
            <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Поиск по истории..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-400 text-[11px]">
                  Локальное хранилище (localStorage)
                </span>
                <button
                  onClick={() => {
                    if (window.confirm(t('app.clearHistoryConfirm'))) {
                      onClearHistory();
                    }
                  }}
                  type="button"
                  className="text-[11px] font-medium text-rose-600 hover:text-rose-800 transition-colors inline-flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{t('app.clearHistory')}</span>
                </button>
              </div>
            </div>
          )}

          {/* Items list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredHistory.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <Clock className="w-8 h-8 stroke-[1.5] mb-2 text-slate-300" />
                <p className="text-xs">{t('app.emptyHistory')}</p>
              </div>
            ) : (
              filteredHistory.map((item) => {
                const primaryResult = item.results.find((r) => r.isPrimary) || item.results[0];

                return (
                  <div
                    key={item.id}
                    className="p-3.5 bg-white border border-slate-200 rounded hover:border-slate-300 transition-all shadow-2xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">
                          {item.calculatorTitle}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {formatDateTime(item.timestamp, language)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCopy(item)}
                          type="button"
                          className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                          title={t('app.copy')}
                        >
                          {copiedId === item.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => onPrintItem(item)}
                          type="button"
                          className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                          title={t('app.printReport')}
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteItem(item.id)}
                          type="button"
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                          title={t('app.delete')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Primary Highlight */}
                    {primaryResult && (
                      <div className="bg-slate-900 text-white rounded p-2 flex items-baseline justify-between">
                        <span className="text-[11px] text-slate-300 truncate mr-2">
                          {primaryResult.label}
                        </span>
                        <span className="font-mono text-sm font-bold shrink-0">
                          {primaryResult.value}{' '}
                          <span className="text-xs font-normal text-blue-300">
                            {primaryResult.unit}
                          </span>
                        </span>
                      </div>
                    )}

                    {/* Inputs snippet */}
                    <div className="text-[11px] text-slate-600 space-y-0.5 border-t border-slate-100 pt-1.5 font-mono">
                      {Object.entries(item.inputs).map(([label, val]) => (
                        <div key={label} className="flex justify-between text-[10px]">
                          <span className="text-slate-400 truncate mr-2">{label}:</span>
                          <span className="text-slate-800 font-medium shrink-0">{String(val)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Action button: Restore to form */}
                    <button
                      onClick={() => {
                        onRestoreCalculation(item);
                        onClose();
                      }}
                      type="button"
                      className="w-full mt-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-medium text-blue-900 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{t('app.restore')}</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
