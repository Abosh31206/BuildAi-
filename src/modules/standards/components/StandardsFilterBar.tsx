import React from 'react';
import {
  StandardType,
  IndustryCategory,
  StandardStatus,
  AccessRights,
  StandardsFilterState,
} from '../types';
import {
  Search,
  Filter,
  RotateCcw,
  LayoutGrid,
  ListFilter,
  Layers,
  CheckCircle2,
  AlertTriangle,
  FileText,
} from 'lucide-react';

interface StandardsFilterBarProps {
  filter: StandardsFilterState;
  onFilterChange: (newFilter: StandardsFilterState) => void;
  totalFound: number;
  onReset: () => void;
  language: 'ru' | 'kk';
}

export const StandardsFilterBar: React.FC<StandardsFilterBarProps> = ({
  filter,
  onFilterChange,
  totalFound,
  onReset,
  language,
}) => {
  const docTypes: { id: 'ALL' | StandardType; label: string }[] = [
    { id: 'ALL', label: language === 'kk' ? 'Барлық түрлері' : 'Все типы' },
    { id: 'SP_RK', label: 'СП РК' },
    { id: 'SN_RK', label: 'СН РК' },
    { id: 'GOST', label: 'ГОСТ' },
    { id: 'ST_RK', label: 'СТ РК' },
    { id: 'SNIP', label: 'СНиП' },
    { id: 'NTD', label: 'НТД' },
  ];

  const industries: { id: IndustryCategory; label: string }[] = [
    { id: 'ALL', label: language === 'kk' ? 'Барлық салалар' : 'Все отрасли' },
    { id: 'STRUCTURES', label: language === 'kk' ? 'Жүк көтергіш құрылымдар' : 'Несущие конструкции' },
    { id: 'SEISMIC', label: language === 'kk' ? 'Сейсмика' : 'Сейсмостойкость' },
    { id: 'FOUNDATIONS', label: language === 'kk' ? 'Негіздер мен іргетастар' : 'Основания и грунты' },
    { id: 'CLIMATE_THERMAL', label: language === 'kk' ? 'Климатология және жылу' : 'Климатология и теплотехника' },
    { id: 'FINISHING', label: language === 'kk' ? 'Әрлеу және шатыр' : 'Отделка и кровля' },
    { id: 'FIRE_SAFETY', label: language === 'kk' ? 'Өрт қауіпсіздігі' : 'Пожарная безопасность' },
    { id: 'ENGINEERING_NETS', label: language === 'kk' ? 'Инженерлік желілер' : 'Инженерные сети' },
  ];

  const statuses: { id: 'ALL' | StandardStatus; label: string }[] = [
    { id: 'ALL', label: language === 'kk' ? 'Барлық мәртебелер' : 'Все статусы' },
    { id: 'ACTIVE', label: language === 'kk' ? 'Қолданыстағы' : 'Действует' },
    { id: 'REPLACED', label: language === 'kk' ? 'Ауыстырылған' : 'Заменен' },
    { id: 'CANCELLED', label: language === 'kk' ? 'Күші жойылған' : 'Отменен' },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={filter.searchQuery}
          onChange={(e) => onFilterChange({ ...filter, searchQuery: e.target.value })}
          placeholder={
            language === 'kk'
              ? 'Құжат шифры, ресми атауы, тармақ нөмірі немесе кілт сөздер бойынша іздеу...'
              : 'Поиск по номеру (СП РК 5.03), названию, пункту (5.2.11) или ключевым словам...'
          }
          className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all outline-hidden"
        />
        {filter.searchQuery && (
          <button
            onClick={() => onFilterChange({ ...filter, searchQuery: '' })}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 bg-slate-200 hover:bg-slate-300 rounded px-1.5 py-0.5"
          >
            Очистить
          </button>
        )}
      </div>

      {/* Primary Filters Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* Filter by Document Type */}
        <div>
          <label className="block text-slate-500 font-medium mb-1">
            {language === 'kk' ? 'Құжат түрі' : 'Тип документа'}
          </label>
          <select
            value={filter.documentType}
            onChange={(e) =>
              onFilterChange({ ...filter, documentType: e.target.value as any })
            }
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-hidden font-medium"
          >
            {docTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filter by Industry Category */}
        <div>
          <label className="block text-slate-500 font-medium mb-1">
            {language === 'kk' ? 'Құрылыс саласы' : 'Отрасль строительства'}
          </label>
          <select
            value={filter.industryCategory}
            onChange={(e) =>
              onFilterChange({ ...filter, industryCategory: e.target.value as any })
            }
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-hidden font-medium"
          >
            {industries.map((ind) => (
              <option key={ind.id} value={ind.id}>
                {ind.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filter by Status */}
        <div>
          <label className="block text-slate-500 font-medium mb-1">
            {language === 'kk' ? 'Мәртебесі' : 'Официальный статус'}
          </label>
          <select
            value={filter.documentStatus}
            onChange={(e) =>
              onFilterChange({ ...filter, documentStatus: e.target.value as any })
            }
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-hidden font-medium"
          >
            {statuses.map((st) => (
              <option key={st.id} value={st.id}>
                {st.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filter by Access Rights */}
        <div>
          <label className="block text-slate-500 font-medium mb-1">
            {language === 'kk' ? 'Қолжетімділік' : 'Режим доступа'}
          </label>
          <select
            value={filter.accessRights}
            onChange={(e) =>
              onFilterChange({ ...filter, accessRights: e.target.value as any })
            }
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-hidden font-medium"
          >
            <option value="ALL">{language === 'kk' ? 'Барлық құқықтар' : 'Все режимы'}</option>
            <option value="VIEW_AND_DOWNLOAD">
              {language === 'kk' ? 'Қарау және жүктеу' : 'Просмотр и скачивание'}
            </option>
            <option value="VIEW_ONLY">
              {language === 'kk' ? 'Тек қарау' : 'Только просмотр'}
            </option>
            <option value="OFFICIAL_LINK_ONLY">
              {language === 'kk' ? 'Ресми тізілім сілтемесі' : 'Ссылка на реестр'}
            </option>
          </select>
        </div>
      </div>

      {/* Sub-bar: Count, View Mode Switcher, Reset */}
      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-600">
          <span>{language === 'kk' ? 'Табылған құжаттар:' : 'Найдено нормативов:'}</span>
          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {totalFound}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Reset Filters */}
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{language === 'kk' ? 'Сүзгілерді тазарту' : 'Сбросить фильтры'}</span>
          </button>

          {/* View Mode Buttons */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded border border-slate-200">
            <button
              onClick={() => onFilterChange({ ...filter, viewMode: 'cards' })}
              className={`p-1 rounded transition-colors ${
                filter.viewMode === 'cards'
                  ? 'bg-white text-blue-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Вид карточками"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onFilterChange({ ...filter, viewMode: 'table' })}
              className={`p-1 rounded transition-colors ${
                filter.viewMode === 'table'
                  ? 'bg-white text-blue-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Табличный вид"
            >
              <ListFilter className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
