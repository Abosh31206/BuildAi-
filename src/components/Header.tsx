import React from 'react';
import { useTranslation } from '../locales/LanguageContext';
import { History, Printer, Compass, FileText } from 'lucide-react';

interface HeaderProps {
  historyCount: number;
  onOpenHistory: () => void;
  onSelectCalculator?: (id: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  historyCount,
  onOpenHistory,
}) => {
  const { language, setLanguage, t } = useTranslation();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <a href="#" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-sm">
              <span className="text-blue-400 font-mono">B</span>K
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-slate-900 leading-none">
                BuildAI KZ
              </span>
              <span className="text-[10px] text-slate-500 font-medium tracking-wide uppercase mt-0.5">
                Қазақстан · Engineering SaaS
              </span>
            </div>
          </a>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <a
            href="#calculators"
            className="hover:text-blue-900 transition-colors whitespace-nowrap shrink-0"
          >
            {t('app.allCalculators')}
          </a>
          <a
            href="#categories"
            className="hover:text-blue-900 transition-colors whitespace-nowrap shrink-0"
          >
            {t('app.categoriesTitle')}
          </a>
          <a
            href="#about"
            className="hover:text-blue-900 transition-colors whitespace-nowrap shrink-0"
          >
            {t('about.title')}
          </a>
        </nav>

        {/* Zone 3: Actions (Language toggle + History drawer button) */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Language Switcher */}
          <div className="inline-flex items-center bg-slate-100 p-0.5 rounded border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setLanguage('ru')}
              type="button"
              className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                language === 'ru'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Русский язык"
            >
              RU
            </button>
            <button
              onClick={() => setLanguage('kk')}
              type="button"
              className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                language === 'kk'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Қазақ тілі"
            >
              ҚАЗ
            </button>
          </div>

          {/* History Button */}
          <button
            onClick={onOpenHistory}
            type="button"
            className="relative inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded transition-colors"
            title={t('app.recentCalculations')}
          >
            <History className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">{t('app.recentCalculations')}</span>
            {historyCount > 0 && (
              <span className="font-mono text-[11px] font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded">
                {historyCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
