import React from 'react';
import { NormativeDoc } from '../types';
import { FileText, AlertTriangle, CheckCircle2, ArrowRight, ExternalLink } from 'lucide-react';

interface NormativeDocCardProps {
  doc: NormativeDoc;
  onSelect: (doc: NormativeDoc) => void;
  language: 'ru' | 'kk';
}

export const NormativeDocCard: React.FC<NormativeDocCardProps> = ({ doc, onSelect, language }) => {
  const isReplaced = doc.status === 'REPLACED';

  const categoryLabels: Record<string, string> = {
    SP_RK: 'СП РК',
    SN_RK: 'СН РК',
    GOST: 'ГОСТ',
    ST_RK: 'СТ РК',
    NTD: 'НТД',
  };

  return (
    <div
      onClick={() => onSelect(doc)}
      className={`p-5 rounded-lg border text-left cursor-pointer transition-all flex flex-col justify-between ${
        isReplaced
          ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300'
          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
      }`}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
              {doc.code}
            </span>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              {categoryLabels[doc.category] || doc.category}
            </span>
          </div>

          {isReplaced ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
              <AlertTriangle className="w-3 h-3" />
              <span>ЗАМЕНЁН</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
              <CheckCircle2 className="w-3 h-3" />
              <span>ДЕЙСТВУЕТ</span>
            </span>
          )}
        </div>

        <h3 className="text-sm font-bold text-slate-900 leading-snug">
          {language === 'kk' ? doc.titleKk : doc.titleRu}
        </h3>

        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
          {language === 'kk' ? doc.summaryKk : doc.summaryRu}
        </p>

        {isReplaced && doc.replacedByCode && (
          <div className="p-2.5 bg-rose-100/70 rounded text-[11px] text-rose-900 border border-rose-200">
            <span className="font-bold">Внимание:</span> Заменён на{' '}
            <span className="font-mono font-semibold">{doc.replacedByCode}</span>.
          </div>
        )}
      </div>

      <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-[11px] text-slate-400 font-mono">
          Введён: {doc.effectiveDate}
        </span>
        <span className="inline-flex items-center gap-1 font-semibold text-blue-900 group-hover:translate-x-0.5 transition-transform">
          <span>{isReplaced ? 'Подробнее' : 'Читать статьи'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );
};
