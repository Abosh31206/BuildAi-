import React, { useState, useMemo } from 'react';
import { useTranslation } from '../locales/LanguageContext';
import { CalculatorId, CalculatorCategory, CalculationHistoryItem } from '../types/calculator';
import { ConcreteCalculator } from '../calculators/ConcreteCalculator';
import { RebarCalculator } from '../calculators/RebarCalculator';
import { FoundationCalculator } from '../calculators/FoundationCalculator';
import { EarthworkCalculator } from '../calculators/EarthworkCalculator';
import { MasonryCalculator } from '../calculators/MasonryCalculator';
import { PlasterCalculator } from '../calculators/PlasterCalculator';
import { RoofingCalculator } from '../calculators/RoofingCalculator';
import { FloorScreedCalculator } from '../calculators/FloorScreedCalculator';
import { InsulationCalculator } from '../calculators/InsulationCalculator';
import { PaintingCalculator } from '../calculators/PaintingCalculator';
import {
  Search,
  Layers,
  Sparkles,
  Box,
  Hammer,
  Pickaxe,
  Building,
  Info,
  ArrowRight,
  Calculator,
  Paintbrush,
  Home,
  Flame,
  Wrench,
  ThermometerSnowflake,
} from 'lucide-react';

interface HomePageProps {
  onSaveHistory: (item: CalculationHistoryItem) => void;
  onPrintReport: (item: CalculationHistoryItem) => void;
  restoredItem: CalculationHistoryItem | null;
}

export const HomePage: React.FC<HomePageProps> = ({
  onSaveHistory,
  onPrintReport,
  restoredItem,
}) => {
  const { t } = useTranslation();

  const [activeCalculator, setActiveCalculator] = useState<CalculatorId>(
    restoredItem?.calculatorId || 'concrete'
  );
  const [selectedCategory, setSelectedCategory] = useState<CalculatorCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Whenever a history item is restored from drawer, update the active calculator
  React.useEffect(() => {
    if (restoredItem) {
      setActiveCalculator(restoredItem.calculatorId);
      const element = document.getElementById('active-calculator-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [restoredItem]);

  const calculatorsList = useMemo(() => {
    return [
      {
        id: 'concrete' as CalculatorId,
        category: 'concrete_works' as CalculatorCategory,
        title: t('calculatorCards.concrete.title'),
        desc: t('calculatorCards.concrete.shortDesc'),
        formula: t('calculatorCards.concrete.formula'),
        normTag: t('calculatorCards.concrete.tag'),
        icon: Box,
      },
      {
        id: 'rebar' as CalculatorId,
        category: 'reinforcement' as CalculatorCategory,
        title: t('calculatorCards.rebar.title'),
        desc: t('calculatorCards.rebar.shortDesc'),
        formula: t('calculatorCards.rebar.formula'),
        normTag: t('calculatorCards.rebar.tag'),
        icon: Hammer,
      },
      {
        id: 'foundation' as CalculatorId,
        category: 'foundations' as CalculatorCategory,
        title: t('calculatorCards.foundation.title'),
        desc: t('calculatorCards.foundation.shortDesc'),
        formula: t('calculatorCards.foundation.formula'),
        normTag: t('calculatorCards.foundation.tag'),
        icon: Building,
      },
      {
        id: 'earthwork' as CalculatorId,
        category: 'earthworks' as CalculatorCategory,
        title: t('calculatorCards.earthwork.title'),
        desc: t('calculatorCards.earthwork.shortDesc'),
        formula: t('calculatorCards.earthwork.formula'),
        normTag: t('calculatorCards.earthwork.tag'),
        icon: Pickaxe,
      },
      {
        id: 'masonry' as CalculatorId,
        category: 'masonry' as CalculatorCategory,
        title: t('calculatorCards.masonry.title'),
        desc: t('calculatorCards.masonry.shortDesc'),
        formula: t('calculatorCards.masonry.formula'),
        normTag: t('calculatorCards.masonry.tag'),
        icon: Layers,
      },
      {
        id: 'plaster' as CalculatorId,
        category: 'finishing' as CalculatorCategory,
        title: t('calculatorCards.plaster.title'),
        desc: t('calculatorCards.plaster.shortDesc'),
        formula: t('calculatorCards.plaster.formula'),
        normTag: t('calculatorCards.plaster.tag'),
        icon: Wrench,
      },
      {
        id: 'roofing' as CalculatorId,
        category: 'roofing_insulation' as CalculatorCategory,
        title: t('calculatorCards.roofing.title'),
        desc: t('calculatorCards.roofing.shortDesc'),
        formula: t('calculatorCards.roofing.formula'),
        normTag: t('calculatorCards.roofing.tag'),
        icon: Home,
      },
      {
        id: 'screed' as CalculatorId,
        category: 'concrete_works' as CalculatorCategory,
        title: t('calculatorCards.screed.title'),
        desc: t('calculatorCards.screed.shortDesc'),
        formula: t('calculatorCards.screed.formula'),
        normTag: t('calculatorCards.screed.tag'),
        icon: Box,
      },
      {
        id: 'insulation' as CalculatorId,
        category: 'roofing_insulation' as CalculatorCategory,
        title: t('calculatorCards.insulation.title'),
        desc: t('calculatorCards.insulation.shortDesc'),
        formula: t('calculatorCards.insulation.formula'),
        normTag: t('calculatorCards.insulation.tag'),
        icon: ThermometerSnowflake,
      },
      {
        id: 'painting' as CalculatorId,
        category: 'finishing' as CalculatorCategory,
        title: t('calculatorCards.painting.title'),
        desc: t('calculatorCards.painting.shortDesc'),
        formula: t('calculatorCards.painting.formula'),
        normTag: t('calculatorCards.painting.tag'),
        icon: Paintbrush,
      },
    ];
  }, [t]);

  const filteredCalculators = useMemo(() => {
    return calculatorsList.filter((item) => {
      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.desc.toLowerCase().includes(q) ||
        item.formula.toLowerCase().includes(q) ||
        item.normTag.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [calculatorsList, selectedCategory, searchQuery]);

  const categories: { id: CalculatorCategory; label: string }[] = [
    { id: 'all', label: t('categories.all') },
    { id: 'concrete_works', label: t('categories.concrete_works') },
    { id: 'reinforcement', label: t('categories.reinforcement') },
    { id: 'foundations', label: t('categories.foundations') },
    { id: 'earthworks', label: t('categories.earthworks') },
    { id: 'masonry', label: t('categories.masonry') },
    { id: 'finishing', label: t('categories.finishing') },
    { id: 'roofing_insulation', label: t('categories.roofing_insulation') },
  ];

  return (
    <div className="space-y-12">
      {/* 1. Hero Section */}
      <section className="bg-gradient-to-b from-slate-100/80 to-slate-50 border-b border-slate-200 pt-10 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-900 bg-blue-50 px-2.5 py-1 rounded border border-blue-100">
              <span className="font-mono">BUILD-ENGINE v1.0</span>
              <span>·</span>
              <span>СП РК / СН РК / ҚР ЕЖ</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight text-balance">
              {t('app.name')} — {t('app.subtitle')}
            </h1>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
              {t('app.description')}
            </p>
          </div>

          {/* Quick Search Input */}
          <div className="max-w-xl">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder={t('app.quickSearch')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 text-sm bg-white border border-slate-300 rounded-md outline-none shadow-xs focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900 placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3 text-xs text-slate-400 hover:text-slate-600"
                >
                  Очистить
                </button>
              )}
            </div>
          </div>

          {/* Quick Norm Note */}
          <div className="flex items-start gap-2 text-xs text-slate-500 max-w-2xl bg-white/70 p-3 rounded border border-slate-200">
            <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <span>{t('app.normNote')}</span>
          </div>
        </div>
      </section>

      {/* 2. Categories & Calculator Cards Grid */}
      <section id="calculators" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div id="categories" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                {t('app.categoriesTitle')}
              </h2>
              <span className="text-xs text-slate-500">
                Выберите категорию для быстрого перехода к калькулятору
              </span>
            </div>

            {/* Segmented Category Buttons */}
            <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-lg">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
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

          {/* Calculator Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCalculators.map((calc) => {
              const Icon = calc.icon;
              const isActive = activeCalculator === calc.id;

              return (
                <div
                  key={calc.id}
                  onClick={() => {
                    setActiveCalculator(calc.id);
                    const el = document.getElementById('active-calculator-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`p-5 rounded-lg border text-left cursor-pointer transition-all flex flex-col justify-between group ${
                    isActive
                      ? 'bg-blue-50/50 border-blue-600 ring-1 ring-blue-600 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-9 h-9 rounded bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-blue-900 group-hover:text-white transition-colors">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-mono font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {calc.normTag}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                      {calc.title}
                    </h3>

                    <p className="text-xs text-slate-600 leading-normal line-clamp-2">
                      {calc.desc}
                    </p>
                  </div>

                  <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-mono text-[11px] text-slate-500">
                      {calc.formula}
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-blue-900 group-hover:translate-x-0.5 transition-transform">
                      <span>{isActive ? 'Выбран' : 'Открыть'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredCalculators.length === 0 && (
            <div className="p-8 text-center bg-slate-50 rounded border border-slate-200 text-slate-500 text-xs">
              По вашему запросу ничего не найдено. Попробуйте изменить поисковый запрос или выбрать другую категорию.
            </div>
          )}
        </div>
      </section>

      {/* 3. Active Calculator Workspace Area */}
      <section
        id="active-calculator-section"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4"
      >
        {/* Navigation tabs for the active calculator */}
        <div className="flex items-center justify-between gap-4 overflow-x-auto pb-1 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
              Текущий расчёт:
            </span>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md shrink-0">
            {calculatorsList.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCalculator(c.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap ${
                  activeCalculator === c.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {c.title}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Calculator Component Rendering */}
        <div className="transition-opacity duration-200">
          {activeCalculator === 'concrete' && (
            <ConcreteCalculator
              onSaveHistory={onSaveHistory}
              onPrintReport={onPrintReport}
            />
          )}

          {activeCalculator === 'rebar' && (
            <RebarCalculator
              onSaveHistory={onSaveHistory}
              onPrintReport={onPrintReport}
            />
          )}

          {activeCalculator === 'foundation' && (
            <FoundationCalculator
              onSaveHistory={onSaveHistory}
              onPrintReport={onPrintReport}
            />
          )}

          {activeCalculator === 'earthwork' && (
            <EarthworkCalculator
              onSaveHistory={onSaveHistory}
              onPrintReport={onPrintReport}
            />
          )}

          {activeCalculator === 'masonry' && (
            <MasonryCalculator
              onSaveHistory={onSaveHistory}
              onPrintReport={onPrintReport}
            />
          )}

          {activeCalculator === 'plaster' && (
            <PlasterCalculator
              onSaveHistory={onSaveHistory}
              onPrintReport={onPrintReport}
            />
          )}

          {activeCalculator === 'roofing' && (
            <RoofingCalculator
              onSaveHistory={onSaveHistory}
              onPrintReport={onPrintReport}
            />
          )}

          {activeCalculator === 'screed' && (
            <FloorScreedCalculator
              onSaveHistory={onSaveHistory}
              onPrintReport={onPrintReport}
            />
          )}

          {activeCalculator === 'insulation' && (
            <InsulationCalculator
              onSaveHistory={onSaveHistory}
              onPrintReport={onPrintReport}
            />
          )}

          {activeCalculator === 'painting' && (
            <PaintingCalculator
              onSaveHistory={onSaveHistory}
              onPrintReport={onPrintReport}
            />
          )}
        </div>
      </section>
    </div>
  );
};
