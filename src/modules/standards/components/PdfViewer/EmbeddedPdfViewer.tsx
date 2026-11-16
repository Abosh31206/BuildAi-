import React, { useState, useRef, useEffect, useMemo } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { StandardsDoc, StandardPageText } from '../../types';
import { PdfToolbar } from './PdfToolbar';
import { DocumentOutline } from './DocumentOutline';
import { FallbackViewer } from './FallbackViewer';
import { useStandards } from '../../store/StandardsContext';
import {
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Loader2,
  ScanText,
  FileWarning,
} from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface EmbeddedPdfViewerProps {
  document: StandardsDoc;
  initialPage?: number;
  initialQuery?: string;
  onClose: () => void;
  language: 'ru' | 'kk';
}

export const EmbeddedPdfViewer: React.FC<EmbeddedPdfViewerProps> = ({
  document: docItem,
  initialPage = 1,
  initialQuery = '',
  onClose,
  language,
}) => {
  const { getDocumentBinary, getDocumentPages } = useStandards();

  const [currentPage, setCurrentPage] = useState<number>(Math.max(1, initialPage));
  const [totalPages, setTotalPages] = useState<number>(Math.max(1, docItem.pageCount));
  const [scale, setScale] = useState<number>(1.15);
  const [fitWidth, setFitWidth] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>(initialQuery);
  const [currentMatchIdx, setCurrentMatchIdx] = useState<number>(0);
  const [isOutlineOpen, setIsOutlineOpen] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [hasCopied, setHasCopied] = useState<boolean>(false);

  const [pdfProxy, setPdfProxy] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pdfBinary, setPdfBinary] = useState<ArrayBuffer | null>(null);
  const [isLoadingBinary, setIsLoadingBinary] = useState<boolean>(false);
  const [isRenderingPage, setIsRenderingPage] = useState<boolean>(false);
  const [indexedPages, setIndexedPages] = useState<StandardPageText[]>([]);
  const [pageExtractedText, setPageExtractedText] = useState<string>('');
  const [binaryError, setBinaryError] = useState<string | null>(null);

  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);

  const isFallbackOnly = docItem.accessRights === 'OFFICIAL_LINK_ONLY';

  useEffect(() => {
    setCurrentPage(Math.max(1, initialPage));
  }, [initialPage, docItem.documentId]);

  useEffect(() => {
    setSearchQuery(initialQuery || '');
  }, [initialQuery, docItem.documentId]);

  // Load real binary PDF / DOCX and indexed full-text pages
  useEffect(() => {
    let cancelled = false;
    let activePdf: pdfjsLib.PDFDocumentProxy | null = null;

    const load = async () => {
      setBinaryError(null);
      setPdfProxy(null);
      setPdfBinary(null);

      const pagesList = await getDocumentPages(docItem.documentId);
      if (!cancelled) {
        setIndexedPages(pagesList);
      }

      if (docItem.fileFormat === 'PDF' && !isFallbackOnly) {
        setIsLoadingBinary(true);
        try {
          const buf = await getDocumentBinary(docItem);
          if (cancelled) return;
          if (buf) {
            setPdfBinary(buf);
            const task = pdfjsLib.getDocument({ data: new Uint8Array(buf.slice(0)) });
            activePdf = await task.promise;
            if (cancelled) {
              await (activePdf as unknown as { destroy?: () => Promise<void> }).destroy?.();
              return;
            }
            setPdfProxy(activePdf);
            setTotalPages(activePdf.numPages);
          }
        } catch (err) {
          if (!cancelled) {
            setBinaryError(err instanceof Error ? err.message : 'Не удалось открыть PDF файл');
          }
        } finally {
          if (!cancelled) setIsLoadingBinary(false);
        }
      } else if (pagesList.length > 0) {
        setTotalPages(pagesList.length);
      }
    };

    load();

    return () => {
      cancelled = true;
      if (activePdf) {
        (activePdf as unknown as { destroy?: () => Promise<void> }).destroy?.().catch(() => {});
      }
    };
  }, [docItem.documentId, docItem.fileFormat, isFallbackOnly, getDocumentBinary, getDocumentPages]);

  // Lazy single-page canvas render when PDF proxy, page, or zoom changes
  useEffect(() => {
    if (!pdfProxy || !canvasRef.current) return;
    let cancelled = false;

    const renderPage = async () => {
      setIsRenderingPage(true);
      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }
        const safePage = Math.max(1, Math.min(pdfProxy.numPages, currentPage));
        const page = await pdfProxy.getPage(safePage);
        if (cancelled) return;

        let effectiveScale = scale;
        if (fitWidth && scrollAreaRef.current) {
          const availableW = Math.max(320, scrollAreaRef.current.clientWidth - 64);
          const unscaledViewport = page.getViewport({ scale: 1.0 });
          effectiveScale = Number((availableW / unscaledViewport.width).toFixed(2));
        }

        const dpr = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: effectiveScale });
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const task = page.render({ canvasContext: ctx, viewport, canvas });
        renderTaskRef.current = task;
        await task.promise;

        // Also update text layer for current page copy/highlight
        const tc = await page.getTextContent();
        if (!cancelled) {
          const txt = tc.items
            .map((it: any) => ('str' in it ? it.str : ''))
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
          const indexed = indexedPages.find((p) => p.pageNumber === safePage);
          setPageExtractedText(txt || indexed?.ocrText || indexed?.rawText || '');
        }
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn('PDF page render error:', err);
        }
      } finally {
        if (!cancelled) setIsRenderingPage(false);
      }
    };

    renderPage();
    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [pdfProxy, currentPage, scale, fitWidth, indexedPages]);

  // Build search matches across all indexed pages or clauses
  const matchingPageNumbers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    if (indexedPages.length > 0) {
      return indexedPages
        .filter((pg) => `${pg.rawText} ${pg.ocrText || ''}`.toLowerCase().includes(q))
        .map((pg) => pg.pageNumber);
    }

    const fromClauses = docItem.clauses
      .filter(
        (c) =>
          c.clauseNumber.toLowerCase().includes(q) ||
          c.sectionTitle.toLowerCase().includes(q) ||
          c.contentRu.toLowerCase().includes(q) ||
          c.contentKk.toLowerCase().includes(q)
      )
      .map((c) => c.pageNumber);

    return Array.from(new Set(fromClauses)).sort((a, b) => a - b);
  }, [searchQuery, indexedPages, docItem.clauses]);

  const handleJumpMatch = (dir: 1 | -1) => {
    if (matchingPageNumbers.length === 0) return;
    const nextIdx =
      (currentMatchIdx + dir + matchingPageNumbers.length) % matchingPageNumbers.length;
    setCurrentMatchIdx(nextIdx);
    setCurrentPage(matchingPageNumbers[nextIdx]);
  };

  useEffect(() => {
    setCurrentMatchIdx(0);
    if (searchQuery.trim() && matchingPageNumbers.length > 0 && !initialPage) {
      setCurrentPage(matchingPageNumbers[0]);
    }
  }, [searchQuery]);

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

  const handleCopyText = () => {
    if (docItem.accessRights === 'OFFICIAL_LINK_ONLY') return;
    const indexed = indexedPages.find((p) => p.pageNumber === currentPage);
    const activeClause = docItem.clauses.find((c) => c.pageNumber === currentPage);
    const text =
      pageExtractedText ||
      indexed?.ocrText ||
      indexed?.rawText ||
      (activeClause
        ? `${docItem.documentNumber} (${activeClause.clauseNumber}):\n${
            language === 'kk' ? activeClause.contentKk : activeClause.contentRu
          }`
        : `${docItem.documentNumber} — ${docItem.officialTitleRu}`);

    navigator.clipboard.writeText(text);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleDownload = () => {
    if (docItem.accessRights !== 'VIEW_AND_DOWNLOAD') return;

    if (pdfBinary) {
      const mime =
        docItem.fileFormat === 'DOCX'
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : 'application/pdf';
      const ext = docItem.fileFormat === 'DOCX' ? 'docx' : 'pdf';
      const blob = new Blob([pdfBinary], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `${docItem.documentNumber.replace(/[/\\?%*:|"<>]/g, '-')}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    if (docItem.fileUrl) {
      window.open(docItem.fileUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    // Structured text fallback only when no binary file was uploaded
    const textContent =
      indexedPages.length > 0
        ? indexedPages.map((p) => `--- Стр. ${p.pageNumber} ---\n${p.ocrText || p.rawText}`).join('\n\n')
        : docItem.clauses
            .map(
              (c) =>
                `[${c.clauseNumber}] ${c.sectionTitle} (стр. ${c.pageNumber}):\nRU: ${c.contentRu}\nKK: ${c.contentKk}`
            )
            .join('\n\n');
    const blob = new Blob([`${docItem.documentNumber} — ${docItem.officialTitleRu}\n\n${textContent}`], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${docItem.documentNumber.replace(/[/\\?%*:|"<>]/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const highlightMatch = (text: string) => {
    const q = searchQuery.trim();
    if (!q) return text;
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-amber-300 text-slate-950 px-0.5 rounded-xs">
          {part}
        </mark>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      )
    );
  };

  const currentIndexedPage = indexedPages.find((p) => p.pageNumber === currentPage);

  return (
    <div
      ref={viewerContainerRef}
      className={`fixed inset-0 z-50 flex flex-col bg-slate-900 text-slate-100 ${
        isFullscreen ? 'w-screen h-screen' : ''
      }`}
    >
      <PdfToolbar
        currentPage={currentPage}
        totalPages={totalPages}
        scale={scale}
        fitWidth={fitWidth}
        searchQuery={searchQuery}
        searchMatchesCount={matchingPageNumbers.length}
        currentMatchIndex={currentMatchIdx}
        isFullscreen={isFullscreen}
        isOutlineOpen={isOutlineOpen}
        accessRights={docItem.accessRights}
        onPageChange={(p) => setCurrentPage(Math.max(1, Math.min(totalPages, p)))}
        onScaleChange={(s) => {
          setFitWidth(false);
          setScale(s);
        }}
        onToggleFitWidth={() => setFitWidth((f) => !f)}
        onSearchChange={(q) => setSearchQuery(q)}
        onNextMatch={() => handleJumpMatch(1)}
        onPrevMatch={() => handleJumpMatch(-1)}
        onToggleFullscreen={handleToggleFullscreen}
        onToggleOutline={() => setIsOutlineOpen(!isOutlineOpen)}
        onDownload={handleDownload}
        onCopyText={handleCopyText}
        onClose={onClose}
        hasCopied={hasCopied}
        language={language}
      />

      {/* Integrity & Document Status Strip */}
      <div className="bg-slate-950/90 border-b border-slate-800 px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono font-bold text-blue-300 shrink-0">{docItem.documentNumber}</span>
          <span className="text-slate-500">·</span>
          <span className="truncate">{language === 'kk' ? docItem.officialTitleKk : docItem.officialTitleRu}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {docItem.integrityReport?.lastPageVerified && (
            <span className="inline-flex items-center gap-1 text-emerald-300 bg-emerald-950/60 border border-emerald-800/70 px-2 py-0.5 rounded">
              <CheckCircle2 className="w-3 h-3" />
              <span>Целостность проверена ({totalPages} стр.)</span>
            </span>
          )}
          {docItem.integrityReport?.isScanned && (
            <span className="inline-flex items-center gap-1 text-amber-300 bg-amber-950/60 border border-amber-800/70 px-2 py-0.5 rounded">
              <ScanText className="w-3 h-3" />
              <span>{docItem.integrityReport.ocrCompleted ? 'Скан + OCR индекс' : 'Скан без OCR'}</span>
            </span>
          )}
          {docItem.documentStatus !== 'ACTIVE' && (
            <span className="inline-flex items-center gap-1 text-rose-300 bg-rose-950/70 border border-rose-800 px-2 py-0.5 rounded font-semibold">
              <AlertTriangle className="w-3 h-3" />
              <span>{docItem.documentStatus}</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Reader Viewport */}
      <div className="flex-1 flex overflow-hidden min-h-0 bg-slate-800">
        {isOutlineOpen && !isFallbackOnly && (
          <DocumentOutline
            sections={docItem.sections}
            currentPage={currentPage}
            onSelectPage={(p) => setCurrentPage(Math.max(1, Math.min(totalPages, p)))}
            language={language}
          />
        )}

        <div ref={scrollAreaRef} className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center gap-4">
          {isFallbackOnly ? (
            <FallbackViewer document={docItem} language={language} />
          ) : isLoadingBinary ? (
            <div className="my-auto flex flex-col items-center gap-3 text-slate-300">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
              <span className="text-xs font-medium">Загрузка оригинального файла документа...</span>
            </div>
          ) : binaryError ? (
            <div className="max-w-lg bg-rose-950/60 border border-rose-700 rounded-lg p-5 text-xs text-rose-100 space-y-2 my-8">
              <div className="flex items-center gap-2 font-bold">
                <FileWarning className="w-4 h-4 text-rose-400" />
                <span>Ошибка чтения файла документа</span>
              </div>
              <p>{binaryError}</p>
            </div>
          ) : pdfProxy ? (
            <>
              {/* Real PDF.js Lazy Rendered Canvas */}
              <div className="relative bg-white shadow-2xl border border-slate-700 rounded-xs">
                {isRenderingPage && (
                  <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-700" />
                  </div>
                )}
                <canvas ref={canvasRef} className="block" />
              </div>

              {/* Search Match / Selectable Text Snippet Drawer under PDF Page */}
              {(searchQuery.trim() || pageExtractedText) && (
                <div className="w-full max-w-[850px] bg-slate-900/95 border border-slate-700 rounded-lg p-4 text-xs text-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>Распознанный / текстовый слой · Стр. {currentPage} из {totalPages}</span>
                    {searchQuery.trim() && (
                      <span className="text-amber-300">
                        Совпадения в документе: {matchingPageNumbers.length} стр.
                      </span>
                    )}
                  </div>
                  <p className="leading-relaxed max-h-40 overflow-y-auto text-slate-300 whitespace-pre-wrap">
                    {highlightMatch(pageExtractedText || 'Текстовый слой на данной странице пуст (изображение).')}
                  </p>
                </div>
              )}
            </>
          ) : indexedPages.length > 0 ? (
            /* DOCX / Full Text Indexed Page Viewer */
            <div
              style={{ width: `${Math.round(800 * Math.min(1.4, scale))}px` }}
              className="max-w-full bg-white text-slate-900 shadow-2xl rounded-xs border border-slate-300 p-8 sm:p-12 font-serif text-sm leading-relaxed space-y-4"
            >
              <div className="border-b border-slate-300 pb-3 flex items-center justify-between font-sans text-xs text-slate-500">
                <span className="font-bold text-slate-900">{docItem.documentNumber}</span>
                <span className="font-mono">Стр. {currentPage} из {totalPages} ({docItem.fileFormat})</span>
              </div>
              <div className="whitespace-pre-wrap text-slate-800 text-[13px] leading-relaxed">
                {highlightMatch(
                  currentIndexedPage?.ocrText ||
                    currentIndexedPage?.rawText ||
                    'Содержимое страницы не найдено.'
                )}
              </div>
            </div>
          ) : (
            /* Reference Registry Clauses Sheet (when binary PDF has not been uploaded yet) */
            <div
              style={{ transform: `scale(${Math.min(1.3, scale)})`, transformOrigin: 'top center' }}
              className="bg-white text-slate-900 shadow-2xl rounded-xs border border-slate-300 w-full max-w-[850px] p-8 sm:p-12 font-sans text-xs space-y-5"
            >
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-amber-900 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Эталонная карточка реестра (полный PDF не прикреплён)</span>
                  <p className="mt-0.5 text-amber-800">
                    Отображаются верифицированные ключевые пункты из государственного реестра. Для полностраничного чтения загрузите PDF или DOCX этого стандарта через «Управление библиотекой».
                  </p>
                </div>
              </div>

              <div className="border-b-2 border-slate-900 pb-3">
                <h1 className="text-xl font-bold text-slate-950">{docItem.documentNumber}</h1>
                <p className="text-slate-600 mt-0.5">
                  {language === 'kk' ? docItem.officialTitleKk : docItem.officialTitleRu}
                </p>
              </div>

              <div className="space-y-4">
                {docItem.clauses.map((clause) => (
                  <div
                    key={clause.id}
                    className={`p-4 rounded-lg border ${
                      clause.pageNumber === currentPage
                        ? 'bg-blue-50/50 border-blue-200'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono font-bold text-blue-900 bg-blue-100/70 px-2 py-0.5 rounded">
                        Пункт {clause.clauseNumber}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">Стр. {clause.pageNumber}</span>
                    </div>
                    <h4 className="font-semibold text-slate-900 mb-1.5">{clause.sectionTitle}</h4>
                    <p className="text-slate-700 leading-relaxed mb-2">{highlightMatch(clause.contentRu)}</p>
                    <p className="text-slate-600 border-l-2 border-blue-400 pl-2.5 italic">
                      {highlightMatch(clause.contentKk)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
