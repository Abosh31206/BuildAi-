import React from 'react';
import { StandardsDoc, DocumentClause } from '../types';
import {
  FileText,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ExternalLink,
  BookOpen,
  Download,
  ArrowRight,
  Eye,
} from 'lucide-react';

interface StandardDocCardProps {
  document: StandardsDoc;
  onOpenDocument: (doc: StandardsDoc, page?: number) => void;
  language: 'ru' | 'kk';
}

export const StandardDocCard: React.FC<StandardDocCardProps> = ({
  document,
  onOpenDocument,
  language,
}) => {
  const isReplaced = document.documentStatus === 'REPLACED';
  const isCancelled = document.documentStatus === 'CANCELLED';
  const isActive = document.documentStatus === 'ACTIVE';

  return (
    <div className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-xs transition-all p-5 flex flex-col justify-between group">
      <div className="space-y-3">
        {/* Top Badges Row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs font-bold bg-slate-900 text-white px-2 py-0.5 rounded">
              {document.documentNumber}
            </span>
            <span className="text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.5 rounded uppercase">
              {document.documentType.replace('_', ' ')}
            </span>
          </div>

          {/* Status Badge */}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
              isActive
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : isReplaced
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {isActive && <CheckCircle2 className="w-3 h-3" />}
            {isReplaced && <AlertTriangle className="w-3 h-3" />}
            {isCancelled && <ShieldAlert className="w-3 h-3" />}
            <span>
              {isActive
                ? language === 'kk' ? 'Қолданыстағы' : 'Действует'
                : isReplaced
                ? language === 'kk' ? 'Ауыстырылған' : 'Заменен'
                : language === 'kk' ? 'Күші жойылған' : 'Отменен'}
            </span>
          </span>
        </div>

        {/* Title */}
        <div>
          <h3
            onClick={() => onOpenDocument(document)}
            className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-900 transition-colors cursor-pointer leading-snug line-clamp-2"
          >
            {language === 'kk' ? document.officialTitleKk : document.officialTitleRu}
          </h3>
          <p className="text-xs text-slate-500 mt-1 line-clamp-1">
            {language === 'kk' ? document.officialTitleRu : document.officialTitleKk}
          </p>
        </div>

        {/* Replaced notice if obsolete */}
        {isReplaced && document.replacedBy && (
          <div className="bg-amber-50/80 border border-amber-200 rounded p-2 text-xs text-amber-900 space-y-0.5">
            <span className="font-bold">
              {language === 'kk' ? 'Ауыстырылды:' : 'Заменен на:'}{' '}
              <span className="font-mono text-amber-950 font-bold">{document.replacedBy.documentNumber}</span>
            </span>
            {document.replacedBy.note && (
              <p className="text-[11px] text-amber-800 line-clamp-2">{document.replacedBy.note}</p>
            )}
          </div>
        )}

        {/* Metadata Details */}
        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-100">
          <div>
            <span className="text-slate-400 block">{language === 'kk' ? 'Редакция:' : 'Редакция:'}</span>
            <span className="font-medium truncate block">{document.revision}</span>
          </div>
          <div>
            <span className="text-slate-400 block">{language === 'kk' ? 'Күшіне енуі:' : 'Вступил в силу:'}</span>
            <span className="font-mono font-medium">{document.effectiveDate || 'Не указана'}</span>
          </div>
          <div>
            <span className="text-slate-400 block">{language === 'kk' ? 'Дереккөз:' : 'Источник:'}</span>
            <span className="truncate block font-medium">{document.sourceName}</span>
          </div>
          <div>
            <span className="text-slate-400 block">{language === 'kk' ? 'Көлемі:' : 'Объём:'}</span>
            <span className="font-mono">{document.pageCount} стр.</span>
          </div>
        </div>

        {/* Quick Clauses Snippet */}
        {document.clauses.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              {language === 'kk' ? 'Негізгі тармақтар:' : 'Ключевые пункты:'}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {document.clauses.slice(0, 3).map((cl: DocumentClause) => (
                <button
                  key={cl.id}
                  onClick={() => onOpenDocument(document, cl.pageNumber)}
                  className="inline-flex items-center gap-1 text-[11px] bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-900 px-2 py-0.5 rounded transition-colors font-mono"
                  title={cl.sectionTitle}
                >
                  <span>п. {cl.clauseNumber}</span>
                  <span className="text-slate-400 text-[10px]">(с. {cl.pageNumber})</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
        <a
          href={document.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-blue-900 transition-colors"
          title="Открыть государственный реестр"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Реестр</span>
        </a>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onOpenDocument(document)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{language === 'kk' ? 'Оқу / Ашу' : 'Читать документ'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
