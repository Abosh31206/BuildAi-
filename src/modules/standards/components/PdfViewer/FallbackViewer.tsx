import React from 'react';
import { StandardsDoc } from '../../types';
import {
  FileText,
  ExternalLink,
  ShieldAlert,
  Calendar,
  Building,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface FallbackViewerProps {
  document: StandardsDoc;
  language: 'ru' | 'kk';
}

export const FallbackViewer: React.FC<FallbackViewerProps> = ({ document, language }) => {
  const isReplaced = document.documentStatus === 'REPLACED';
  const isCancelled = document.documentStatus === 'CANCELLED';

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 sm:p-10 max-w-2xl mx-auto my-8 text-center shadow-xs">
      <div className="w-14 h-14 rounded-full bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center mx-auto mb-4">
        <FileText className="w-7 h-7" />
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-200/80 text-slate-700 font-mono mb-3">
        <span>{document.documentNumber}</span>
        <span>·</span>
        <span>{document.revision}</span>
      </div>

      <h3 className="text-xl font-bold text-slate-900 mb-2">
        {language === 'kk' ? document.officialTitleKk : document.officialTitleRu}
      </h3>

      {isReplaced && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3 text-xs text-left mb-6 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">
              {language === 'kk' ? 'НАЗАР АУДАРЫҢЫЗ: Құжат ауыстырылған!' : 'ВНИМАНИЕ: Документ заменен!'}
            </span>
            <p className="mt-0.5 text-amber-800">
              {document.replacedBy?.note ||
                `Действующим нормативом взамен данного является: ${document.replacedBy?.documentNumber}`}
            </p>
          </div>
        </div>
      )}

      {isCancelled && (
        <div className="bg-rose-50 border border-rose-200 text-rose-900 rounded-lg p-3 text-xs text-left mb-6 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">
              {language === 'kk' ? 'Құжаттың күші жойылған' : 'Документ отменён'}
            </span>
            <p className="mt-0.5 text-rose-800">
              {language === 'kk'
                ? 'Қазақстан Республикасы аумағында жаңа жобалау кезінде заңды күші жоқ.'
                : 'Не имеет юридической силы при разработке новой проектной документации в РК.'}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg p-4 text-left text-xs space-y-2 mb-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="text-slate-500">{language === 'kk' ? 'Бекітуші орган:' : 'Орган утверждения:'}</span>
          <span className="font-medium text-slate-800">{document.sourceName}</span>
        </div>
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="text-slate-500">{language === 'kk' ? 'Күшіне ену күні:' : 'Дата вступления в силу:'}</span>
          <span className="font-mono text-slate-800">{document.effectiveDate || 'Не указана'}</span>
        </div>
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="text-slate-500">{language === 'kk' ? 'Соңғы тексеріс:' : 'Дата верификации:'}</span>
          <span className="font-mono text-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {new Date(document.lastVerifiedAt).toLocaleDateString()}
          </span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-slate-500">{language === 'kk' ? 'Қолжетімділік:' : 'Права доступа:'}</span>
          <span className="text-slate-700">
            {document.accessRights === 'OFFICIAL_LINK_ONLY'
              ? (language === 'kk' ? 'Тек ресми сілтеме арқылы' : 'Только по ссылке на реестр')
              : (language === 'kk' ? 'Қарауға рұқсат етілген' : 'Разрешено для просмотра')}
          </span>
        </div>
      </div>

      <p className="text-xs text-slate-500 mb-6 leading-relaxed">
        {language === 'kk'
          ? 'Құжат Қазақстан Республикасының құрылыс істері комитетінің ресми мемлекеттік тізілімінде тіркелген. Түпнұсқа мәтінімен танысу үшін мемлекеттік дереккөзді ашыңыз.'
          : 'Полный официальный текст нормативного документа доступен в государственном реестре Республики Казахстан. Вы можете перейти к оригиналу по прямой проверенной ссылке:'}
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <a
          href={document.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition-colors w-full sm:w-auto"
        >
          <span>{language === 'kk' ? 'Ресми дереккөзді ашу' : 'Открыть официальный первоисточник'}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};
