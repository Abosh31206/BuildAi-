/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { LanguageProvider, useTranslation } from './locales/LanguageContext';
import { Header, AppModuleId } from './components/Header';
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

// Universal Modules
import { NormativeModule } from './modules/normative/NormativeModule';
import { StandardsLibraryModule } from './modules/standards/StandardsLibraryModule';
import { CadModule } from './modules/cad/CadModule';
import { Building3dModule } from './modules/building3d/Building3dModule';
import { ProjectAlbumModal } from './modules/pdf/components/ProjectAlbumModal';

function AppMain() {
  const { language } = useTranslation();
  const [activeModule, setActiveModule] = useState<AppModuleId>('calculators');
  const [history, setHistory] = useState<CalculationHistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isProjectAlbumOpen, setIsProjectAlbumOpen] = useState(false);
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
    setActiveModule('calculators');
  };

  const handleOpenPrintReport = (item: CalculationHistoryItem) => {
    setPrintModalItem(item);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
      {/* Navigation Top Bar */}
      <Header
        activeModule={activeModule}
        onSelectModule={setActiveModule}
        onOpenProjectAlbum={() => setIsProjectAlbumOpen(true)}
        historyCount={history.length}
        onOpenHistory={() => setIsHistoryOpen(true)}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 pb-16">
        {activeModule === 'calculators' && (
          <>
            <HomePage
              onSaveHistory={handleSaveHistory}
              onPrintReport={handleOpenPrintReport}
              restoredItem={restoredItem}
            />
            <AboutSection />
          </>
        )}

        {activeModule === 'standards' && (
          <div className="py-2">
            <StandardsLibraryModule />
          </div>
        )}

        {activeModule === 'normative' && (
          <div className="py-8">
            <NormativeModule />
          </div>
        )}

        {activeModule === 'cad' && (
          <div className="py-8">
            <CadModule />
          </div>
        )}

        {activeModule === 'building3d' && (
          <div className="py-8">
            <Building3dModule
              onTransferToCad={() => setActiveModule('cad')}
              onTransferToCalculators={() => setActiveModule('calculators')}
            />
          </div>
        )}
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

      {/* Calculation Single Report Modal */}
      <PrintModal
        isOpen={!!printModalItem}
        onClose={() => setPrintModalItem(null)}
        item={printModalItem}
      />

      {/* Multi-sheet SPDS Project Album Generator Modal */}
      <ProjectAlbumModal
        isOpen={isProjectAlbumOpen}
        onClose={() => setIsProjectAlbumOpen(false)}
        language={language}
      />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppMain />
    </LanguageProvider>
  );
}
