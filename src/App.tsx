/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { LanguageProvider } from './locales/LanguageContext';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';
import { AboutSection } from './components/AboutSection';
import { Footer } from './components/Footer';
import { HistoryDrawer } from './components/HistoryDrawer';
import { PrintModal } from './components/PrintModal';
import { CalculationHistoryItem } from './types/calculator';
import {
  getHistory,
  saveHistoryItem,
  removeHistoryItem,
  clearHistory,
} from './utils/storage';

export default function App() {
  const [history, setHistory] = useState<CalculationHistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [printModalItem, setPrintModalItem] = useState<CalculationHistoryItem | null>(null);
  const [restoredItem, setRestoredItem] = useState<CalculationHistoryItem | null>(null);

  // Load history from localStorage on initial render
  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const handleSaveHistory = (item: CalculationHistoryItem) => {
    const updated = saveHistoryItem(item);
    setHistory(updated);
  };

  const handleDeleteHistoryItem = (id: string) => {
    const updated = removeHistoryItem(id);
    setHistory(updated);
  };

  const handleClearAllHistory = () => {
    clearHistory();
    setHistory([]);
  };

  const handleRestoreCalculation = (item: CalculationHistoryItem) => {
    setRestoredItem(item);
  };

  const handleOpenPrintReport = (item: CalculationHistoryItem) => {
    setPrintModalItem(item);
  };

  return (
    <LanguageProvider>
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
        {/* Navigation Top Bar */}
        <Header
          historyCount={history.length}
          onOpenHistory={() => setIsHistoryOpen(true)}
        />

        {/* Main Content Viewport */}
        <main className="flex-1 pb-16">
          <HomePage
            onSaveHistory={handleSaveHistory}
            onPrintReport={handleOpenPrintReport}
            restoredItem={restoredItem}
          />

          {/* About Section */}
          <AboutSection />
        </main>

        {/* Engineering SaaS Footer */}
        <Footer />

        {/* History Slide-over Drawer */}
        <HistoryDrawer
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          history={history}
          onClearHistory={handleClearAllHistory}
          onDeleteItem={handleDeleteHistoryItem}
          onRestoreCalculation={handleRestoreCalculation}
          onPrintItem={handleOpenPrintReport}
        />

        {/* Print / PDF Report Modal */}
        <PrintModal
          isOpen={!!printModalItem}
          onClose={() => setPrintModalItem(null)}
          item={printModalItem}
        />
      </div>
    </LanguageProvider>
  );
}
