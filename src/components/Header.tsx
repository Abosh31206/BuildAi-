import React, { useState } from 'react';
import { useTranslation } from '../locales/LanguageContext';
import { useFirebase } from './FirebaseProvider';
import { useProject } from '../modules/project/store/ProjectContext';
import {
  History,
  Calculator,
  BookOpen,
  Compass,
  Boxes,
  FileCheck2,
  Library,
  Cloud,
  Check,
  FolderOpen,
  LogIn,
  LogOut,
  RotateCcw,
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
  const { user, signIn, signOut, isSigningIn, isCloudConnected } = useFirebase();
  const {
    project,
    savedProjects,
    saveCloudProject,
    loadProjectById,
    resetToDefault,
    isSavingCloud,
    lastSavedAt,
  } = useProject();

  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);

  const navItems = [
    {
      id: 'calculators' as AppModuleId,
      label: t('nav.calculators') || 'Калькуляторы',
      icon: Calculator,
      badge: '10',
    },
    {
      id: 'standards' as AppModuleId,
      label: t('nav.standards') || 'Нормативы (PDF)',
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
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onSelectModule('calculators')}
            className="flex items-center gap-2 group text-left cursor-pointer"
          >
            <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-xs group-hover:bg-blue-900 transition-colors shrink-0">
              <span className="text-blue-400 font-mono">B</span>K
            </div>
            <div className="flex flex-col">
              <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 leading-none flex items-center gap-1.5 whitespace-nowrap">
                <span>BuildAI KZ</span>
                <span className="hidden xl:inline text-[10px] bg-blue-100 text-blue-800 font-semibold px-1 rounded uppercase tracking-wider">
                  SaaS
                </span>
              </span>
              <span className="hidden sm:block text-[10px] text-slate-500 font-medium tracking-wide uppercase mt-0.5 whitespace-nowrap">
                Қазақстан · СП / СН / ГОСТ
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Module Switcher Tabs (Desktop) */}
        <nav className="hidden xl:flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectModule(item.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-900/5'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Project Sync, Album PDF, Auth, Language, History */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Unified Project Cloud Save & Switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsProjectMenuOpen(!isProjectMenuOpen)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-colors whitespace-nowrap"
              title="Управление единым 2D/3D проектом и облачное сохранение"
            >
              <Cloud className={`w-3.5 h-3.5 ${isCloudConnected ? 'text-emerald-600' : 'text-slate-500'}`} />
              <span className="hidden md:inline max-w-[110px] truncate">{project.projectCode}</span>
            </button>

            {isProjectMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-lg shadow-xl p-3 z-50 text-xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <div className="font-bold text-slate-900 truncate max-w-[180px]">{project.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Автосохранение: {lastSavedAt || 'локально'}
                    </div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
                    {isCloudConnected ? 'Cloud OK' : 'Local'}
                  </span>
                </div>

                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={async () => {
                      await saveCloudProject();
                      setIsProjectMenuOpen(false);
                    }}
                    disabled={isSavingCloud}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded font-semibold"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isSavingCloud ? 'Сохранение...' : 'Сохранить проект'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetToDefault();
                      setIsProjectMenuOpen(false);
                    }}
                    className="p-1.5 border border-slate-300 rounded hover:bg-slate-100 text-slate-700"
                    title="Сбросить проект к типовому"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {savedProjects.length > 0 && (
                  <div className="pt-1 border-t border-slate-100 space-y-1 max-h-40 overflow-y-auto">
                    <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                      <FolderOpen className="w-3 h-3" />
                      Сохранённые проекты ({savedProjects.length})
                    </div>
                    {savedProjects.map((sp) => (
                      <button
                        key={sp.id}
                        type="button"
                        onClick={() => {
                          loadProjectById(sp.id);
                          setIsProjectMenuOpen(false);
                        }}
                        className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-100 flex items-center justify-between gap-2"
                      >
                        <span className="truncate font-medium text-slate-800">{sp.name}</span>
                        <span className="text-[10px] font-mono text-slate-500 shrink-0">{sp.projectCode}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Direct Project Album PDF Generator Button */}
          <button
            type="button"
            onClick={onOpenProjectAlbum}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded bg-blue-900 hover:bg-blue-800 text-white shadow-xs transition-colors whitespace-nowrap"
            title="Генератор проектного альбома ПД"
          >
            <FileCheck2 className="w-3.5 h-3.5 text-blue-300 shrink-0" />
            <span className="hidden sm:inline">
              {language === 'kk' ? 'Альбом ПД' : 'Альбом ПД'}
            </span>
          </button>

          {/* Language Switcher */}
          <div className="inline-flex items-center bg-slate-100 p-0.5 rounded border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setLanguage('ru')}
              type="button"
              className={`px-1.5 py-1 rounded transition-colors whitespace-nowrap ${
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
              className={`px-1.5 py-1 rounded transition-colors whitespace-nowrap ${
                language === 'kk'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Қазақ тілі"
            >
              ҚАЗ
            </button>
          </div>

          {/* Google Sign-In / Profile */}
          {user ? (
            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded transition-colors whitespace-nowrap"
              title={`Аккаунт: ${user.displayName || user.email} (нажмите для выхода)`}
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-4 h-4 rounded-full" />
              ) : (
                <LogOut className="w-3.5 h-3.5 text-slate-600" />
              )}
              <span className="hidden md:inline max-w-[70px] truncate">
                {user.displayName?.split(' ')[0] || 'Профиль'}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={signIn}
              disabled={isSigningIn}
              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded transition-colors whitespace-nowrap"
              title="Войти через Google для облачной синхронизации проектов"
            >
              <LogIn className="w-3.5 h-3.5 text-blue-700" />
              <span className="hidden md:inline">{isSigningIn ? '...' : 'Войти'}</span>
            </button>
          )}

          {/* History Button */}
          <button
            onClick={onOpenHistory}
            type="button"
            className="relative inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded transition-colors"
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

      {/* Tablet & Mobile Sub-Navigation Bar */}
      <div className="xl:hidden flex items-center justify-start sm:justify-center gap-1 bg-slate-100/90 border-t border-slate-200 px-2 py-1 overflow-x-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;
          return (
            <button
              key={item.id}
              type="button"
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
