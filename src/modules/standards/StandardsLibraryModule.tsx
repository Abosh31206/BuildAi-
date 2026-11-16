import React, { useState } from 'react';
import { useTranslation } from '../../locales/LanguageContext';
import { StandardsCatalog } from './components/StandardsCatalog';
import { AdminStandardsModal } from './components/admin/AdminStandardsModal';
import { useStandards } from './store/StandardsContext';

export const StandardsLibraryModule: React.FC = () => {
  const { language } = useTranslation();
  const {
    documents,
    openDocument,
    addDocument,
    updateDocument,
    deleteDocument,
    batchImport,
  } = useStandards();

  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);

  return (
    <div className="min-h-[80vh] py-6">
      <StandardsCatalog
        documents={documents}
        onOpenDocument={openDocument}
        onOpenAdmin={() => setIsAdminOpen(true)}
        language={language}
      />

      <AdminStandardsModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        documents={documents}
        onAddDocument={addDocument}
        onUpdateDocument={updateDocument}
        onDeleteDocument={deleteDocument}
        onBatchImport={batchImport}
        language={language}
      />
    </div>
  );
};
