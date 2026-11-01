import React, { useState } from 'react';
import { useTranslation } from '../locales/LanguageContext';
import { Copy, Check, Printer, BookmarkCheck, AlertCircle } from 'lucide-react';

export interface ResultItem {
  label: string;
  value: string | number;
  unit: string;
  isPrimary?: boolean;
  helperText?: string;
}

interface ResultDisplayProps {
  title?: string;
  results: ResultItem[];
  disclaimer?: string;
  onPrint?: () => void;
  onSaveToHistory?: () => void;
  savedToHistory?: boolean;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({
  title,
  results,
  disclaimer,
  onPrint,
  onSaveToHistory,
  savedToHistory,
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const primaryItem = results.find((r) => r.isPrimary) || results[0];
  const secondaryItems = results.filter((r) => r !== primaryItem);

  const handleCopy = () => {
    const text = results.map((r) => `${r.label}: ${r.value} ${r.unit}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-slate-200 rounded p-5 space-y-4 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-sans">
          {title || t('app.recentCalculations')}
        </h3>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            type="button"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
            title={t('app.copy')}
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
          {onPrint && (
            <button
              onClick={onPrint}
              type="button"
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
              title={t('app.printReport')}
            >
              <Printer className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Primary KPI block */}
      {primaryItem && (
        <div className="bg-slate-900 text-white rounded p-4">
          <div className="text-xs text-slate-300 font-medium">
            {primaryItem.label}
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums tracking-tight text-white">
              {primaryItem.value}
            </span>
            <span className="text-sm font-semibold text-blue-300 font-mono">
              {primaryItem.unit}
            </span>
          </div>
          {primaryItem.helperText && (
            <div className="text-[11px] text-slate-400 mt-1">
              {primaryItem.helperText}
            </div>
          )}
        </div>
      )}

      {/* Secondary metrics list */}
      {secondaryItems.length > 0 && (
        <div className="divide-y divide-slate-100 border border-slate-200 rounded overflow-hidden">
          {secondaryItems.map((item, idx) => (
            <div
              key={idx}
              className="px-3.5 py-2.5 flex items-center justify-between gap-4 bg-slate-50/50 hover:bg-slate-50 transition-colors"
            >
              <div className="text-xs text-slate-600 font-medium leading-tight">
                {item.label}
                {item.helperText && (
                  <span className="block text-[10px] text-slate-400 mt-0.5">
                    {item.helperText}
                  </span>
                )}
              </div>
              <div className="text-right shrink-0">
                <span className="text-sm font-bold font-mono tabular-nums text-slate-900">
                  {item.value}
                </span>{' '}
                <span className="text-xs font-mono text-slate-500 font-medium">
                  {item.unit}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Disclaimer */}
      {disclaimer && (
        <div className="flex items-start gap-2 p-3 bg-amber-50/70 border border-amber-200/80 rounded text-[11px] text-amber-900 leading-relaxed">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <span>{disclaimer}</span>
        </div>
      )}

      {/* Action footer */}
      <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        {onSaveToHistory && (
          <button
            onClick={onSaveToHistory}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
          >
            <BookmarkCheck className={`w-3.5 h-3.5 ${savedToHistory ? 'text-emerald-600' : 'text-slate-600'}`} />
            <span>{savedToHistory ? t('buttons.savedToHistory') : t('app.recentCalculations')}</span>
          </button>
        )}

        {onPrint && (
          <button
            onClick={onPrint}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-900 bg-blue-50 hover:bg-blue-100 rounded transition-colors ml-auto"
          >
            <Printer className="w-3.5 h-3.5 text-blue-700" />
            <span>{t('app.printReport')}</span>
          </button>
        )}
      </div>
    </div>
  );
};
