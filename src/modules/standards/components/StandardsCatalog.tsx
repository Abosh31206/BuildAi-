import React, { useState, useMemo } from 'react';
import { StandardsDoc, StandardsFilterState } from '../types';
import { StandardsFilterBar } from './StandardsFilterBar';
import { StandardDocCard } from './StandardDocCard';
import { StandardTableView } from './StandardTableView';
import {
  BookOpen,
  ShieldCheck,
  Building,
  HelpCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface StandardsCatalogProps {
  documents: StandardsDoc[];
  onOpenDocument: (doc: StandardsDoc, page?: number) => void;
  onOpenAdmin: () => void;
  language: 'ru' | 'kk';
}

const ITEMS_PER_PAGE = 6;

export const StandardsCatalog: React.FC<StandardsCatalogProps> = ({
  documents,
  onOpenDocument,
  onOpenAdmin,
  language,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [filter, setFilter] = useState<StandardsFilterState>({
    searchQuery: '',
    documentType: 'ALL',
    industryCategory: 'ALL',
    documentStatus: 'ALL',
    yearRange: [1980, 2026],
    accessRights: 'ALL',
    viewMode: 'cards',
  });

  // Filter documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // 1. Search query (number, title, clauses, searchable text)
      if (filter.searchQuery.trim()) {
        const q = filter.searchQuery.toLowerCase().trim();
        const matchesNumber = doc.documentNumber.toLowerCase().includes(q);
        const matchesTitleRu = doc.officialTitleRu.toLowerCase().includes(q);
        const matchesTitleKk = doc.officialTitleKk.toLowerCase().includes(q);
        const matchesText = doc.searchableText?.toLowerCase().includes(q);
        const matchesClause = doc.clauses.some(
          (c) =>
            c.clauseNumber.toLowerCase().includes(q) ||
            c.contentRu.toLowerCase().includes(q) ||
            c.contentKk.toLowerCase().includes(q)
        );

        if (!matchesNumber && !matchesTitleRu && !matchesTitleKk && !matchesText && !matchesClause) {
          return false;
        }
      }

      // 2. Document Type
      if (filter.documentType !== 'ALL' && doc.documentType !== filter.documentType) {
        return false;
      }

      // 3. Industry Category
      if (filter.industryCategory !== 'ALL' && doc.industryCategory !== filter.industryCategory) {
        return false;
      }

      // 4. Status
      if (filter.documentStatus !== 'ALL' && doc.documentStatus !== filter.documentStatus) {
        return false;
      }

      // 5. Access rights
      if (filter.accessRights !== 'ALL' && doc.accessRights !== filter.accessRights) {
        return false;
      }

      return true;
    });
  }, [documents, filter]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredDocuments.length / ITEMS_PER_PAGE) || 1;
  const paginatedDocs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredDocuments.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredDocuments, currentPage]);

  const handleResetFilters = () => {
    setFilter({
      searchQuery: '',
      documentType: 'ALL',
      industryCategory: 'ALL',
      documentStatus: 'ALL',
      yearRange: [1980, 2026],
      accessRights: 'ALL',
      viewMode: filter.viewMode,
    });
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white rounded-2xl p-6 sm:p-8 shadow-md border border-slate-800">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-300 bg-blue-900/60 border border-blue-700/50 px-2.5 py-1 rounded">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Верифицированная база нормативов РК</span>
            <span>·</span>
            <span>СП / СН / ГОСТ / СТ РК</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
            {language === 'kk'
              ? 'Құрылыс нормативтерінің цифрлық кітапханасы'
              : 'Библиотека строительных нормативов Казахстана'}
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {language === 'kk'
              ? 'Қазақстанның құрылыс саласының ресми нормативтік-техникалық құжаттары (СП РК, СН РК, ГОСТ, СТ РК). Құжаттарды тікелей платформада оқу, тармақтар бойынша іздеу және мәртебелерді тексеру.'
              : 'Централизованная база действующих и архивных строительных стандартов Республики Казахстан. Встроенный просмотрщик документов, верификация статусов (действует / заменен / отменен) и оглавление с поиском по пунктам.'}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenAdmin}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-800/60 hover:bg-blue-700/80 text-blue-200 border border-blue-600/40 text-xs font-semibold transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Администрирование базы</span>
            </button>

            <a
              href="https://adilet.zan.kz"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <span>Госреестр НПА «Әділет»</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <StandardsFilterBar
        filter={filter}
        onFilterChange={(f) => {
          setFilter(f);
          setCurrentPage(1);
        }}
        totalFound={filteredDocuments.length}
        onReset={handleResetFilters}
        language={language}
      />

      {/* Content View: Cards vs Table */}
      {filteredDocuments.length > 0 ? (
        <div className="space-y-6">
          {filter.viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedDocs.map((doc) => (
                <StandardDocCard
                  key={doc.documentId}
                  document={doc}
                  onOpenDocument={onOpenDocument}
                  language={language}
                />
              ))}
            </div>
          ) : (
            <StandardTableView
              documents={paginatedDocs}
              onOpenDocument={onOpenDocument}
              language={language}
            />
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-xs text-slate-600">
              <div>
                Показано с{' '}
                <strong>{(currentPage - 1) * ITEMS_PER_PAGE + 1}</strong> по{' '}
                <strong>
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredDocuments.length)}
                </strong>{' '}
                из <strong>{filteredDocuments.length}</strong> документов
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="px-2.5 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-opacity flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Назад</span>
                </button>

                <div className="px-3 font-mono font-bold text-slate-800">
                  {currentPage} / {totalPages}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-2.5 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-opacity flex items-center gap-1"
                >
                  <span>Вперед</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-xl border border-slate-200 p-8 sm:p-12 text-center max-w-lg mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {language === 'kk'
                ? 'Құжат кітапханада жоқ немесе оның қолжетімділігі расталмаған'
                : 'Документ отсутствует в библиотеке или его доступность не подтверждена'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {language === 'kk'
                ? 'Іздеу сұрауын өзгертіп көріңіз немесе ресми мемлекеттік тізілімдерден тексеріңіз.'
                : 'Попробуйте изменить поисковый запрос, выбрать другую отрасль или сбросить фильтры статуса.'}
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors"
            >
              Сбросить фильтры
            </button>
            <a
              href="https://adilet.zan.kz"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-xs font-semibold bg-blue-900 hover:bg-blue-800 text-white rounded-lg transition-colors flex items-center gap-1.5"
            >
              <span>Поиск в госреестре РК</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
