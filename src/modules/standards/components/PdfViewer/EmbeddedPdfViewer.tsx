import React, { useState, useRef, useEffect } from 'react';
import { StandardsDoc } from '../../types';
import { PdfToolbar } from './PdfToolbar';
import { DocumentOutline } from './DocumentOutline';
import { FallbackViewer } from './FallbackViewer';
import {
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Printer,
  ExternalLink,
  BookOpen,
} from 'lucide-react';

interface EmbeddedPdfViewerProps {
  document: StandardsDoc;
  initialPage?: number;
  initialQuery?: string;
  onClose: () => void;
  language: 'ru' | 'kk';
}

export const EmbeddedPdfViewer: React.FC<EmbeddedPdfViewerProps> = ({
  document,
  initialPage = 1,
  initialQuery = '',
  onClose,
  language,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [scale, setScale] = useState<number>(1.0);
  const [searchQuery, setSearchQuery] = useState<string>(initialQuery);
  const [isOutlineOpen, setIsOutlineOpen] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [hasCopied, setHasCopied] = useState<boolean>(false);

  const viewerContainerRef = useRef<HTMLDivElement>(null);

  // If document has no viewable clauses or is restricted to official link only
  const isFallbackOnly = document.accessRights === 'OFFICIAL_LINK_ONLY';

  useEffect(() => {
    if (initialPage) {
      setCurrentPage(initialPage);
    }
  }, [initialPage]);

  // Handle Fullscreen Toggle
  const handleToggleFullscreen = () => {
    if (!viewerContainerRef.current) return;
    if (!window.document.fullscreenElement) {
      viewerContainerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      window.document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Copy document visible text to clipboard
  const handleCopyText = () => {
    const activeClause = document.clauses.find((c) => c.pageNumber === currentPage);
    const textToCopy = activeClause
      ? `${document.documentNumber} (${activeClause.clauseNumber}):\n${
          language === 'kk' ? activeClause.contentKk : activeClause.contentRu
        }`
      : `${document.documentNumber} — ${
          language === 'kk' ? document.officialTitleKk : document.officialTitleRu
        }`;

    navigator.clipboard.writeText(textToCopy);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  // Download PDF representation
  const handleDownload = () => {
    if (document.fileUrl) {
      window.open(document.fileUrl, '_blank');
      return;
    }
    // Generate clean text/PDF file download
    const blob = new Blob(
      [
        `============================================================\n` +
          `${document.documentNumber} — ${document.officialTitleRu}\n` +
          `Статус: ${document.documentStatus}\n` +
          `Источник: ${document.sourceName} (${document.sourceUrl})\n` +
          `Дата верификации: ${new Date(document.lastVerifiedAt).toLocaleDateString()}\n` +
          `============================================================\n\n` +
          document.clauses
            .map(
              (c) =>
                `[${c.clauseNumber}] ${c.sectionTitle} (стр. ${c.pageNumber}):\n` +
                `RU: ${c.contentRu}\n` +
                `KK: ${c.contentKk}\n`
            )
            .join('\n------------------------------------------------------------\n'),
      ],
      { type: 'text/plain;charset=utf-8' }
    );
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${document.documentNumber.replace(/[/\\?%*:|"<>]/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter clauses by search query
  const matchingClauses = document.clauses.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.clauseNumber.toLowerCase().includes(q) ||
      c.sectionTitle.toLowerCase().includes(q) ||
      c.contentRu.toLowerCase().includes(q) ||
      c.contentKk.toLowerCase().includes(q)
    );
  });

  return (
    <div
      ref={viewerContainerRef}
      className={`fixed inset-0 z-50 flex flex-col bg-slate-900 text-slate-100 ${
        isFullscreen ? 'w-screen h-screen' : ''
      }`}
    >
      {/* Top PDF Toolbar */}
      <PdfToolbar
        currentPage={currentPage}
        totalPages={document.pageCount}
        scale={scale}
        searchQuery={searchQuery}
        searchMatchesCount={matchingClauses.length}
        currentMatchIndex={0}
        isFullscreen={isFullscreen}
        isOutlineOpen={isOutlineOpen}
        accessRights={document.accessRights}
        onPageChange={(p) => setCurrentPage(Math.max(1, Math.min(document.pageCount, p)))}
        onScaleChange={(s) => setScale(s)}
        onSearchChange={(q) => setSearchQuery(q)}
        onNextMatch={() => {}}
        onPrevMatch={() => {}}
        onToggleFullscreen={handleToggleFullscreen}
        onToggleOutline={() => setIsOutlineOpen(!isOutlineOpen)}
        onDownload={handleDownload}
        onCopyText={handleCopyText}
        onClose={onClose}
        hasCopied={hasCopied}
        language={language}
      />

      {/* Main Reader Viewport */}
      <div className="flex-1 flex overflow-hidden min-h-0 bg-slate-800">
        {/* Document Outline Tree Sidebar */}
        {isOutlineOpen && !isFallbackOnly && (
          <DocumentOutline
            sections={document.sections}
            currentPage={currentPage}
            onSelectPage={(p) => setCurrentPage(p)}
            language={language}
          />
        )}

        {/* Center PDF Paper Sheet Canvas Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center items-start">
          {isFallbackOnly ? (
            <FallbackViewer document={document} language={language} />
          ) : (
            <div
              style={{
                transform: `scale(${scale})`,
                transformOrigin: 'top center',
                transition: 'transform 0.15s ease-out',
              }}
              className="bg-white text-slate-900 shadow-2xl rounded-xs border border-slate-300 w-full max-w-[850px] min-h-[1100px] p-10 sm:p-14 relative font-serif text-sm leading-relaxed"
            >
              {/* Official SPDS Document Header Banner */}
              <div className="border-b-2 border-slate-900 pb-4 mb-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-slate-500">
                      Республика Казахстан · Нормативно-технический документ
                    </p>
                    <h1 className="text-xl sm:text-2xl font-bold font-sans tracking-tight text-slate-950 mt-1">
                      {document.documentNumber}
                    </h1>
                    <p className="text-xs font-sans text-slate-600 mt-0.5">
                      {language === 'kk' ? document.officialTitleKk : document.officialTitleRu}
                    </p>
                  </div>

                  <div className="text-right font-sans shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                        document.documentStatus === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : document.documentStatus === 'REPLACED'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {document.documentStatus === 'ACTIVE' && (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Действует</span>
                        </>
                      )}
                      {document.documentStatus === 'REPLACED' && (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Заменен</span>
                        </>
                      )}
                      {document.documentStatus === 'CANCELLED' && (
                        <>
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Отменен</span>
                        </>
                      )}
                    </span>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">
                      Стр. {currentPage} из {document.pageCount}
                    </p>
                  </div>
                </div>

                {document.documentStatus === 'REPLACED' && document.replacedBy && (
                  <div className="mt-3 bg-amber-50 border border-amber-200 p-2.5 rounded text-xs font-sans text-amber-900">
                    <span className="font-bold">Внимание: </span>
                    {document.replacedBy.note}
                  </div>
                )}
              </div>

              {/* Render Document Content / Clauses for the Current Page or Active Document */}
              <div className="space-y-6">
                {document.clauses
                  .filter((c) => !searchQuery || matchingClauses.includes(c))
                  .map((clause) => {
                    const isTargetPage = clause.pageNumber === currentPage;
                    return (
                      <div
                        key={clause.id}
                        className={`p-4 rounded-lg transition-colors border ${
                          isTargetPage
                            ? 'bg-blue-50/40 border-blue-200 ring-1 ring-blue-100'
                            : 'bg-transparent border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2 font-sans">
                          <span className="font-bold text-xs text-blue-900 bg-blue-100/70 px-2 py-0.5 rounded font-mono">
                            Пункт {clause.clauseNumber}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            Страница {clause.pageNumber}
                          </span>
                        </div>

                        <h4 className="font-sans font-semibold text-xs text-slate-800 mb-2">
                          {clause.sectionTitle}
                        </h4>

                        <div className="space-y-3 text-slate-800 text-xs sm:text-[13px] leading-relaxed">
                          <p className="border-l-2 border-slate-300 pl-3">
                            <span className="text-[10px] font-sans font-bold text-slate-400 block uppercase mb-0.5">
                              Русский текст:
                            </span>
                            {clause.contentRu}
                          </p>
                          <p className="border-l-2 border-blue-400 pl-3 bg-slate-50/50 py-1 rounded-r">
                            <span className="text-[10px] font-sans font-bold text-blue-600 block uppercase mb-0.5">
                              Қазақша мәтіні:
                            </span>
                            {clause.contentKk}
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* SPDS Footer Watermark */}
              <div className="border-t border-slate-200 mt-12 pt-4 flex items-center justify-between text-[10px] font-sans text-slate-400">
                <span>Официальное издание · {document.sourceName}</span>
                <span className="font-mono">BuildAI KZ Verified Standard · {new Date(document.lastVerifiedAt).toISOString().split('T')[0]}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
