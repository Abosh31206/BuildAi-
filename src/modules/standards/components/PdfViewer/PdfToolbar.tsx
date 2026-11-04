import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Download,
  Copy,
  Check,
  Search,
  ArrowLeft,
  RotateCcw,
  BookOpen,
  X,
} from 'lucide-react';
import { AccessRights } from '../../types';

interface PdfToolbarProps {
  currentPage: number;
  totalPages: number;
  scale: number;
  searchQuery: string;
  searchMatchesCount: number;
  currentMatchIndex: number;
  isFullscreen: boolean;
  isOutlineOpen: boolean;
  accessRights: AccessRights;
  onPageChange: (page: number) => void;
  onScaleChange: (scale: number) => void;
  onSearchChange: (query: string) => void;
  onNextMatch: () => void;
  onPrevMatch: () => void;
  onToggleFullscreen: () => void;
  onToggleOutline: () => void;
  onDownload: () => void;
  onCopyText: () => void;
  onClose: () => void;
  hasCopied: boolean;
  language: 'ru' | 'kk';
}

export const PdfToolbar: React.FC<PdfToolbarProps> = ({
  currentPage,
  totalPages,
  scale,
  searchQuery,
  searchMatchesCount,
  currentMatchIndex,
  isFullscreen,
  isOutlineOpen,
  accessRights,
  onPageChange,
  onScaleChange,
  onSearchChange,
  onNextMatch,
  onPrevMatch,
  onToggleFullscreen,
  onToggleOutline,
  onDownload,
  onCopyText,
  onClose,
  hasCopied,
  language,
}) => {
  return (
    <div className="bg-slate-900 text-slate-200 px-3 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs select-none">
      {/* Left Zone: Back & Outline toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={onClose}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          title={language === 'kk' ? 'Нәтижелерге оралу' : 'Вернуться к каталогу'}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {language === 'kk' ? 'Каталогқа' : 'Назад к поиску'}
          </span>
        </button>

        <button
          onClick={onToggleOutline}
          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded transition-colors ${
            isOutlineOpen
              ? 'bg-blue-600 text-white'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
          }`}
          title={language === 'kk' ? 'Мазмұны' : 'Оглавление'}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span className="hidden md:inline">
            {language === 'kk' ? 'Мазмұны' : 'Оглавление'}
          </span>
        </button>
      </div>

      {/* Center Zone: Page Navigation & Zoom */}
      <div className="flex items-center gap-4">
        {/* Page Switcher */}
        <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-0.5 rounded hover:bg-slate-700 disabled:opacity-40 transition-opacity"
            title="Предыдущая страница"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="flex items-center gap-1 font-mono text-[11px] px-1">
            <input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 1 && val <= totalPages) {
                  onPageChange(val);
                }
              }}
              className="w-10 bg-slate-900 text-center font-bold text-white rounded border border-slate-700 py-0.5 text-xs"
            />
            <span className="text-slate-400">/ {totalPages}</span>
          </span>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-0.5 rounded hover:bg-slate-700 disabled:opacity-40 transition-opacity"
            title="Следующая страница"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="hidden sm:flex items-center gap-1 bg-slate-800 px-2 py-1 rounded">
          <button
            onClick={() => onScaleChange(Math.max(0.6, scale - 0.2))}
            disabled={scale <= 0.6}
            className="p-0.5 rounded hover:bg-slate-700 disabled:opacity-40"
            title="Уменьшить масштаб"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <span className="font-mono text-[11px] w-12 text-center text-slate-300">
            {Math.round(scale * 100)}%
          </span>

          <button
            onClick={() => onScaleChange(Math.min(2.5, scale + 0.2))}
            disabled={scale >= 2.5}
            className="p-0.5 rounded hover:bg-slate-700 disabled:opacity-40"
            title="Увеличить масштаб"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onScaleChange(1.0)}
            className="p-0.5 text-slate-400 hover:text-white"
            title="Сбросить масштаб (100%)"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Right Zone: Search inside PDF, Copy, Download, Fullscreen */}
      <div className="flex items-center gap-2">
        {/* In-document Search */}
        <div className="relative flex items-center bg-slate-800 rounded px-2 py-1">
          <Search className="w-3 h-3 text-slate-400 mr-1.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={language === 'kk' ? 'Құжат ішінен іздеу...' : 'Поиск в документе...'}
            className="bg-transparent text-xs text-white placeholder-slate-400 focus:outline-hidden w-28 sm:w-36"
          />
          {searchQuery && (
            <div className="flex items-center gap-1 pl-1 text-[10px] text-slate-400">
              <span className="font-mono">{searchMatchesCount > 0 ? `${currentMatchIndex + 1}/${searchMatchesCount}` : '0'}</span>
              <button
                onClick={onPrevMatch}
                disabled={searchMatchesCount === 0}
                className="hover:text-white disabled:opacity-40"
              >
                ▲
              </button>
              <button
                onClick={onNextMatch}
                disabled={searchMatchesCount === 0}
                className="hover:text-white disabled:opacity-40"
              >
                ▼
              </button>
              <button
                onClick={() => onSearchChange('')}
                className="hover:text-white ml-0.5"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          )}
        </div>

        {/* Copy Text Button */}
        <button
          onClick={onCopyText}
          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          title={language === 'kk' ? 'Мәтінді көшіру' : 'Копировать доступный текст'}
        >
          {hasCopied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Download PDF button (if permitted) */}
        {accessRights === 'VIEW_AND_DOWNLOAD' && (
          <button
            onClick={onDownload}
            className="p-1.5 rounded bg-blue-700 hover:bg-blue-600 text-white transition-colors"
            title={language === 'kk' ? 'PDF жүктеу' : 'Скачать PDF файл'}
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Fullscreen Toggle */}
        <button
          onClick={onToggleFullscreen}
          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          title={isFullscreen ? 'Выйти из полноэкранного режима' : 'Полноэкранный режим'}
        >
          {isFullscreen ? (
            <Minimize2 className="w-3.5 h-3.5" />
          ) : (
            <Maximize2 className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
};
