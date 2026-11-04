import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../locales/LanguageContext';
import { StandardsDoc } from './types';
import { INITIAL_STANDARDS_REGISTRY } from './data/initialStandardsRegistry';
import { StandardsCatalog } from './components/StandardsCatalog';
import { EmbeddedPdfViewer } from './components/PdfViewer/EmbeddedPdfViewer';
import { AdminStandardsModal } from './components/admin/AdminStandardsModal';

const STANDARDS_STORAGE_KEY = 'buildai_kz_standards_registry';

export const StandardsLibraryModule: React.FC = () => {
  const { language } = useTranslation();

  // Load documents from localStorage or initial registry
  const [documents, setDocuments] = useState<StandardsDoc[]>(() => {
    try {
      const saved = localStorage.getItem(STANDARDS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse saved standards registry:', e);
    }
    return INITIAL_STANDARDS_REGISTRY;
  });

  const [activeViewerDoc, setActiveViewerDoc] = useState<StandardsDoc | null>(null);
  const [initialViewerPage, setInitialViewerPage] = useState<number>(1);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);

  // Save changes to localStorage
  const saveDocumentsState = (newDocs: StandardsDoc[]) => {
    setDocuments(newDocs);
    try {
      localStorage.setItem(STANDARDS_STORAGE_KEY, JSON.stringify(newDocs));
    } catch (e) {
      console.warn('Failed to persist standards registry:', e);
    }
  };

  const handleOpenDocument = (doc: StandardsDoc, page: number = 1) => {
    setActiveViewerDoc(doc);
    setInitialViewerPage(page);
  };

  const handleAddDocument = (newDoc: StandardsDoc) => {
    const updated = [newDoc, ...documents];
    saveDocumentsState(updated);
  };

  const handleUpdateDocument = (updatedDoc: StandardsDoc) => {
    const updated = documents.map((d) =>
      d.documentId === updatedDoc.documentId ? updatedDoc : d
    );
    saveDocumentsState(updated);
  };

  const handleDeleteDocument = (docId: string) => {
    const updated = documents.filter((d) => d.documentId !== docId);
    saveDocumentsState(updated);
  };

  const handleBatchImport = (newDocs: StandardsDoc[]) => {
    let added = 0;
    let duplicates = 0;
    const existingNumbers = new Set(
      documents.map((d) => d.documentNumber.toLowerCase().replace(/[\s-]/g, ''))
    );

    const toAdd: StandardsDoc[] = [];

    newDocs.forEach((doc) => {
      const normalizedNum = doc.documentNumber.toLowerCase().replace(/[\s-]/g, '');
      if (existingNumbers.has(normalizedNum)) {
        duplicates++;
      } else {
        existingNumbers.add(normalizedNum);
        toAdd.push(doc);
        added++;
      }
    });

    if (toAdd.length > 0) {
      saveDocumentsState([...toAdd, ...documents]);
    }

    return { added, duplicates };
  };

  return (
    <div className="min-h-[80vh] py-6">
      <StandardsCatalog
        documents={documents}
        onOpenDocument={handleOpenDocument}
        onOpenAdmin={() => setIsAdminOpen(true)}
        language={language}
      />

      {/* Embedded PDF Document Reader Modal */}
      {activeViewerDoc && (
        <EmbeddedPdfViewer
          document={activeViewerDoc}
          initialPage={initialViewerPage}
          onClose={() => setActiveViewerDoc(null)}
          language={language}
        />
      )}

      {/* Administration Management Modal */}
      <AdminStandardsModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        documents={documents}
        onAddDocument={handleAddDocument}
        onUpdateDocument={handleUpdateDocument}
        onDeleteDocument={handleDeleteDocument}
        onBatchImport={handleBatchImport}
        language={language}
      />
    </div>
  );
};
