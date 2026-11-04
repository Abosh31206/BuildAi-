import React from 'react';
import { useTranslation } from '../locales/LanguageContext';
import {
  History,
  Calculator,
  BookOpen,
  Compass,
  Boxes,
  FileCheck2,
  Sparkles,
  Library,
} from 'lucide-react';

export type AppModuleId = 'calculators' | 'normative' | 'standards' | 'cad' | 'building3d';

interface HeaderProps {
  activeModule: AppModuleId;
  onSelectModule: (module: AppModuleId) => void;
  onOpenProjectAlbum: () => void;
  historyCount: number;
  onOpenHistory: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeModule,
  onSelectModule,
  onOpenProjectAlbum,
  historyCount,
  onOpenHistory,
}) => {
  const { language, setLanguage, t } = useTranslation();

  const navItems = [
    {
      id: 'calculators' as AppModuleId,
      label: t('nav.calculators') || 'Калькуляторы',
      icon: Calculator,
      badge: '10',
    },
    {
      id: 'standards' as AppModuleId,
      label: t('nav.standards') || 'Нормативная библиотека',
      icon: Library,
      badge: 'PDF',
    },
    {
      id: 'normative' as AppModuleId,
      label: t('nav.normative') || 'Нормативы AI',
      icon: BookOpen,
      badge: 'СП РК',
    },
    {
      id: 'cad' as AppModuleId,
      label: t('nav.cad') || '2D CAD Чертёж',
      icon: Compass,
      badge: 'DXF',
    },
    {
      id: 'building3d' as AppModuleId,
      label: t('nav.building3d') || '3D Здание',
      icon: Boxes,
      badge: 'WebGL',
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onSelectModule('calculators')}
            className="flex items-center gap-2 group text-left cursor-pointer"
          >
            <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-xs group-hover:bg-blue-900 transition-colors">
              <span className="text-blue-400 font-mono">B</span>K
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-slate-900 leading-none flex items-center gap-1.5">
                <span>BuildAI KZ</span>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-1 rounded uppercase tracking-wider">
                  SaaS
                </span>
              </span>
              <span className="text-[10px] text-slate-500 font-medium tracking-wide uppercase mt-0.5">
                Қазақстан · СП / СН / ГОСТ
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Module Switcher Tabs (Desktop & Tablet) */}
        <nav className="hidden lg:flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectModule(item.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-900/5'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`text-[9px] font-mono px-1 py-0.2 rounded ${
                      isActive
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Actions (Album button, Language toggle, History) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Direct Project Album PDF Generator Button */}
          <button
            onClick={onOpenProjectAlbum}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-blue-900 hover:bg-blue-800 text-white shadow-xs transition-colors"
            title="Генератор проектного альбома ПД"
          >
            <FileCheck2 className="w-3.5 h-3.5 text-blue-300" />
            <span className="hidden sm:inline">
              {language === 'kk' ? 'Альбом ПД' : 'Альбом ПД (PDF)'}
            </span>
          </button>

          {/* Language Switcher */}
          <div className="inline-flex items-center bg-slate-100 p-0.5 rounded border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setLanguage('ru')}
              type="button"
              className={`px-2 py-1 rounded transition-colors whitespace-nowrap ${
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
              className={`px-2 py-1 rounded transition-colors whitespace-nowrap ${
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
            className="relative inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded transition-colors"
            title={t('app.recentCalculations')}
          >
            <History className="w-3.5 h-3.5 text-slate-600" />
            {historyCount > 0 && (
              <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-100 px-1 rounded">
                {historyCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="lg:hidden flex items-center justify-around bg-slate-100/90 border-t border-slate-200 px-2 py-1 overflow-x-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectModule(item.id)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs whitespace-nowrap font-medium ${
                isActive
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3 h-3 text-blue-600" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
