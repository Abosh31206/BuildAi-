import React from 'react';
import { useTranslation } from '../locales/LanguageContext';

export const Footer: React.FC = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-slate-900 text-slate-400 text-xs py-8 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm">BuildAI KZ</span>
            <span className="text-slate-600">·</span>
            <span>{t('app.subtitle')}</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="font-mono bg-slate-800 text-blue-300 px-2 py-0.5 rounded">
              {t('footer.version')}
            </span>
            <span>Қазақстан Республикасы · 2026</span>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed max-w-4xl">
          {t('footer.disclaimer')}
        </p>

        <div className="text-[11px] text-slate-600 pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
          <span>{t('footer.rights')}</span>
          <div className="flex gap-4">
            <span>СП РК 5.03-107</span>
            <span>ГОСТ 34028</span>
            <span>СП РК 5.01-102</span>
            <span>СП РК 1.03-106</span>
            <span>СП РК 5.02-102</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
