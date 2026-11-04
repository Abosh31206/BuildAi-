import React from 'react';
import { StandardsDoc } from '../types';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ExternalLink,
  Eye,
  Download,
} from 'lucide-react';

interface StandardTableViewProps {
  documents: StandardsDoc[];
  onOpenDocument: (doc: StandardsDoc, page?: number) => void;
  language: 'ru' | 'kk';
}

export const StandardTableView: React.FC<StandardTableViewProps> = ({
  documents,
  onOpenDocument,
  language,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-4">Шифр документа</th>
              <th className="py-3 px-4">Наименование норматива</th>
              <th className="py-3 px-3">Тип</th>
              <th className="py-3 px-3">Статус</th>
              <th className="py-3 px-3">Редакция</th>
              <th className="py-3 px-3">Источник</th>
              <th className="py-3 px-4 text-right">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {documents.map((doc) => {
              const isActive = doc.documentStatus === 'ACTIVE';
              const isReplaced = doc.documentStatus === 'REPLACED';
              const isCancelled = doc.documentStatus === 'CANCELLED';

              return (
                <tr key={doc.documentId} className="hover:bg-slate-50 transition-colors">
                  {/* Number */}
                  <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                    {doc.documentNumber}
                  </td>

                  {/* Title */}
                  <td className="py-3 px-4 max-w-md">
                    <button
                      onClick={() => onOpenDocument(doc)}
                      className="text-left font-semibold text-slate-900 hover:text-blue-900 line-clamp-2 transition-colors cursor-pointer"
                    >
                      {language === 'kk' ? doc.officialTitleKk : doc.officialTitleRu}
                    </button>
                    {isReplaced && doc.replacedBy && (
                      <span className="text-[10px] text-amber-700 block mt-0.5">
                        ↳ Заменен на: <strong>{doc.replacedBy.documentNumber}</strong>
                      </span>
                    )}
                  </td>

                  {/* Type */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded uppercase">
                      {doc.documentType.replace('_', ' ')}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
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
                          ? 'Действует'
                          : isReplaced
                          ? 'Заменен'
                          : 'Отменен'}
                      </span>
                    </span>
                  </td>

                  {/* Revision */}
                  <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                    {doc.revision}
                  </td>

                  {/* Source */}
                  <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                    <a
                      href={doc.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-blue-900 inline-flex items-center gap-1"
                      title={doc.sourceName}
                    >
                      <span>Реестр</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => onOpenDocument(doc)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-900 hover:bg-blue-800 text-white rounded text-xs font-semibold shadow-2xs transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{language === 'kk' ? 'Ашу' : 'Открыть'}</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
