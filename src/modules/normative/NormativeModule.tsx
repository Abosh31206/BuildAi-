import React, { useState, useMemo } from 'react';
import { useTranslation } from '../../locales/LanguageContext';
import { NormativeCategory, NormativeDoc } from './types';
import { KZ_NORMATIVES_REGISTRY } from './data/kzNormativesRegistry';
import { NormativeDocCard } from './components/NormativeDocCard';
import { NormativeReaderModal } from './components/NormativeReaderModal';
import { AiNormativeAssistant } from './components/AiNormativeAssistant';
import { Search, BookCheck, ShieldAlert, Bot, Layers } from 'lucide-react';

export const NormativeModule: React.FC = () => {
  const { language } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<NormativeCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<NormativeDoc | null>(null);
  const [activeTab, setActiveTab] = useState<'catalog' | 'ai'>('catalog');

  const filteredDocs = useMemo(() => {
    return KZ_NORMATIVES_REGISTRY.filter((doc) => {
      const matchCat = selectedCategory === 'ALL' || doc.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        doc.code.toLowerCase().includes(q) ||
        doc.titleRu.toLowerCase().includes(q) ||
        doc.titleKk.toLowerCase().includes(q) ||
        doc.summaryRu.toLowerCase().includes(q) ||
        doc.keyClauses.some((c) => c.content.toLowerCase().includes(q) || c.title.toLowerCase().includes(q));

      return matchCat && matchSearch;
    });
  }, [selectedCategory, searchQuery]);

  const categories: { id: NormativeCategory; label: string }[] = [
    { id: 'ALL', label: 'Все документы' },
    { id: 'SP_RK', label: 'СП РК (Правила)' },
    { id: 'SN_RK', label: 'СН РК (Нормы)' },
    { id: 'GOST', label: 'ГОСТ (Межгос)' },
    { id: 'ST_RK', label: 'СТ РК (Стандарты)' },
    { id: 'NTD', label: 'НТД / СНиП' },
  ];

  return (
    <div className="space-y-6">
      {/* Module Title & Tab Switcher */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-900 mb-1">
            <BookCheck className="w-4 h-4" />
            <span>Модуль 2 · База нормативов Республики Казахстан</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Нормативная база и AI-консультант РК
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Актуальные строительные правила СП РК, СН РК, ГОСТ, проверка статусов, устаревших редакций и консультации.
          </p>
        </div>

        {/* Catalog vs AI Assistant toggle */}
        <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'catalog'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Реестр нормативов ({KZ_NORMATIVES_REGISTRY.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'ai'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>AI-Консультант</span>
          </button>
        </div>
      </div>

      {activeTab === 'ai' ? (
        <AiNormativeAssistant
          language={language}
          onOpenDoc={(code) => {
            const found = KZ_NORMATIVES_REGISTRY.find((d) => d.code === code);
            if (found) setSelectedDoc(found);
          }}
        />
      ) : (
        <div className="space-y-4">
          {/* Search bar & Category filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Поиск по номеру (СП РК 5.03), названию или пункту ('защитный слой', 'осадка', 'сейсмика')..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-slate-300 rounded-md outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                >
                  Очистить
                </button>
              )}
            </div>

            {/* Category pills */}
            <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-md shrink-0">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                    selectedCategory === cat.id
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Docs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocs.map((doc) => (
              <NormativeDocCard
                key={doc.id}
                doc={doc}
                onSelect={(d) => setSelectedDoc(d)}
                language={language}
              />
            ))}
          </div>

          {filteredDocs.length === 0 && (
            <div className="p-8 text-center bg-white rounded border border-slate-200 text-slate-500 text-xs">
              Документы не найдены. Попробуйте ввести шифр документа (напр., «СП РК 5.03») или ключевое слово.
            </div>
          )}
        </div>
      )}

      {/* Reader Modal */}
      <NormativeReaderModal
        doc={selectedDoc}
        onClose={() => setSelectedDoc(null)}
        onNavigateToDoc={(code) => {
          const found = KZ_NORMATIVES_REGISTRY.find((d) => d.code === code);
          if (found) setSelectedDoc(found);
        }}
        language={language}
      />
    </div>
  );
};
