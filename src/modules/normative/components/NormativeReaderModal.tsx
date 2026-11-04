import React, { useState } from 'react';
import { NormativeDoc } from '../types';
import { X, AlertTriangle, CheckCircle2, Search, ExternalLink, BookmarkCheck, FileText } from 'lucide-react';

interface NormativeReaderModalProps {
  doc: NormativeDoc | null;
  onClose: () => void;
  onNavigateToDoc?: (docCode: string) => void;
  language: 'ru' | 'kk';
}

export const NormativeReaderModal: React.FC<NormativeReaderModalProps> = ({
  doc,
  onClose,
  onNavigateToDoc,
  language,
}) => {
  const [clauseSearch, setClauseSearch] = useState('');

  if (!doc) return null;

  const isReplaced = doc.status === 'REPLACED';

  const filteredClauses = doc.keyClauses.filter(
    (c) =>
      !clauseSearch ||
      c.clause.toLowerCase().includes(clauseSearch.toLowerCase()) ||
      c.title.toLowerCase().includes(clauseSearch.toLowerCase()) ||
      c.content.toLowerCase().includes(clauseSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl bg-white rounded-lg shadow-2xl overflow-hidden my-6 border border-slate-300 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold bg-blue-600 text-white px-2 py-0.5 rounded">
                {doc.code}
              </span>
              {isReplaced ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-300 bg-rose-900/80 px-2 py-0.5 rounded">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>УСТАРЕЛ / ЗАМЕНЁН</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-900/80 px-2 py-0.5 rounded">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>ДЕЙСТВУЕТ В РЕСПУБЛИКЕ КАЗАХСТАН</span>
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-bold leading-tight">
              {language === 'kk' ? doc.titleKk : doc.titleRu}
            </h2>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="p-1.5 text-slate-400 hover:text-white rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Warning if replaced */}
        {isReplaced && (
          <div className="p-4 bg-rose-50 border-b border-rose-200 flex items-start justify-between gap-4 text-xs text-rose-900">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-sm">Внимание: Данная редакция нормативного документа не действует!</span>
                <p className="mt-1 leading-relaxed">
                  {doc.replacedByNote || 'Документ заменен на новую редакцию строительных правил РК.'}
                </p>
              </div>
            </div>
            {doc.replacedByCode && onNavigateToDoc && (
              <button
                type="button"
                onClick={() => onNavigateToDoc(doc.replacedByCode!)}
                className="shrink-0 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded text-xs transition-colors"
              >
                Открыть {doc.replacedByCode}
              </button>
            )}
          </div>
        )}

        {/* Metadata sub-header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Орган утверждения:</span>
            <span className="font-medium text-slate-800">{doc.publisher}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Дата ввода в действие:</span>
            <span className="font-mono font-medium text-slate-800">{doc.effectiveDate}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Категория НТД:</span>
            <span className="font-medium text-slate-800">{doc.category}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Государственный реестр:</span>
            {doc.officialRegistryUrl ? (
              <a
                href={doc.officialRegistryUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-blue-700 hover:underline font-medium"
              >
                <span>Проверить в реестре</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <span className="text-slate-600">Комитет по делам строительства РК</span>
            )}
          </div>
        </div>

        {/* Clauses search and list */}
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Поиск по статьям и пунктам (напр. 'защитный слой', 'опалубка', 'прочность')..."
              value={clauseSearch}
              onChange={(e) => setClauseSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>
        </div>

        {/* Body content with clauses */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="space-y-1 mb-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Аннотация и сфера применения
            </h4>
            <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded border border-slate-200">
              {language === 'kk' ? doc.summaryKk : doc.summaryRu}
            </p>
          </div>

          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
            Ключевые пункты и инженерные требования ({filteredClauses.length})
          </h4>

          {filteredClauses.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              По вашему запросу пункты не найдены.
            </div>
          ) : (
            filteredClauses.map((c, idx) => (
              <div key={idx} className="p-4 rounded border border-slate-200 bg-slate-50/50 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    {c.clause}
                  </span>
                  <span className="text-xs font-semibold text-slate-800">{c.title}</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-sans">{c.content}</p>
                {c.notes && (
                  <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-200/60">
                    Примечание: {c.notes}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Сверка редакции: база НТД РК актуализирована.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white font-medium rounded hover:bg-slate-800 transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
