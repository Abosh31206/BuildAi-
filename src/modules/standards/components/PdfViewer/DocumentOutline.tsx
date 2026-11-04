import React from 'react';
import { DocumentSection } from '../../types';
import { BookOpen, ChevronRight, FileText } from 'lucide-react';

interface DocumentOutlineProps {
  sections: DocumentSection[];
  currentPage: number;
  onSelectPage: (page: number) => void;
  language: 'ru' | 'kk';
}

export const DocumentOutline: React.FC<DocumentOutlineProps> = ({
  sections,
  currentPage,
  onSelectPage,
  language,
}) => {
  const renderItem = (sec: DocumentSection) => {
    const isCurrent = currentPage === sec.pageNumber;
    return (
      <div key={sec.id} className="space-y-1">
        <button
          onClick={() => onSelectPage(sec.pageNumber)}
          className={`w-full text-left flex items-start justify-between gap-2 px-2.5 py-1.5 rounded text-xs transition-colors group ${
            sec.level === 2 ? 'pl-6 text-slate-600' : 'font-medium text-slate-800'
          } ${
            isCurrent
              ? 'bg-blue-100/70 text-blue-900 font-bold'
              : 'hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <span className="line-clamp-2 leading-snug">{sec.title}</span>
          <span className="font-mono text-[10px] text-slate-400 shrink-0 group-hover:text-blue-700">
            с. {sec.pageNumber}
          </span>
        </button>

        {sec.children && (
          <div className="space-y-1">
            {sec.children.map((child) => renderItem(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white border-r border-slate-200 w-72 shrink-0">
      <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-blue-700" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          {language === 'kk' ? 'Құжат мазмұны' : 'Оглавление документа'}
        </h4>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sections.length > 0 ? (
          sections.map((sec) => renderItem(sec))
        ) : (
          <div className="p-4 text-center text-xs text-slate-400">
            {language === 'kk' ? 'Мазмұны қолжетімсіз' : 'Оглавление не сформировано'}
          </div>
        )}
      </div>
    </div>
  );
};
