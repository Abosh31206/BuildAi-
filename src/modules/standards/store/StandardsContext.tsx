import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../../../lib/firebase';
import { useFirebase } from '../../../components/FirebaseProvider';
import { StandardsDoc, StandardPageText } from '../types';
import { INITIAL_STANDARDS_REGISTRY } from '../data/initialStandardsRegistry';
import {
  cacheBinaryFileLocally,
  ingestDocumentFile,
  loadLocalCachedBinary,
  IngestedDocumentResult,
} from '../services/documentIngestionService';

const STANDARDS_STORAGE_KEY = 'buildai_kz_standards_registry_v2';
const STANDARDS_PAGES_KEY = 'buildai_kz_standards_pages_v1';

export interface SearchChunkMatch {
  documentId: string;
  documentNumber: string;
  officialTitle: string;
  revision: string;
  status: string;
  pageNumber: number;
  excerpt: string;
  score: number;
}

interface StandardsContextValue {
  documents: StandardsDoc[];
  activeViewerDoc: StandardsDoc | null;
  initialViewerPage: number;
  initialViewerQuery: string;
  openDocument: (doc: StandardsDoc, page?: number, query?: string) => void;
  openDocumentByCode: (code: string, page?: number, query?: string) => boolean;
  closeViewer: () => void;
  addDocument: (newDoc: StandardsDoc) => Promise<void>;
  updateDocument: (updatedDoc: StandardsDoc) => Promise<void>;
  deleteDocument: (docId: string) => Promise<void>;
  batchImport: (newDocs: StandardsDoc[]) => { added: number; duplicates: number };
  uploadFullDocumentFile: (
    meta: Partial<StandardsDoc>,
    file: File,
    onProgress?: (status: string, detail: string) => void
  ) => Promise<StandardsDoc>;
  getDocumentPages: (documentId: string) => Promise<StandardPageText[]>;
  getDocumentBinary: (doc: StandardsDoc) => Promise<ArrayBuffer | null>;
  searchFullTexts: (query: string) => SearchChunkMatch[];
}

const StandardsContext = createContext<StandardsContextValue | null>(null);

export const useStandards = () => {
  const ctx = useContext(StandardsContext);
  if (!ctx) {
    throw new Error('useStandards must be used within StandardsProvider');
  }
  return ctx;
};

export const StandardsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthReady } = useFirebase();

  const [documents, setDocuments] = useState<StandardsDoc[]>(() => {
    try {
      const saved = localStorage.getItem(STANDARDS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_STANDARDS_REGISTRY;
  });

  const [pagesCache, setPagesCache] = useState<Record<string, StandardPageText[]>>(() => {
    try {
      const saved = localStorage.getItem(STANDARDS_PAGES_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {};
  });

  const [activeViewerDoc, setActiveViewerDoc] = useState<StandardsDoc | null>(null);
  const [initialViewerPage, setInitialViewerPage] = useState<number>(1);
  const [initialViewerQuery, setInitialViewerQuery] = useState<string>('');

  // Sync catalog from Firestore
  useEffect(() => {
    if (!isAuthReady) return;
    const unsubscribe = onSnapshot(
      collection(db, 'standards_documents'),
      (snap) => {
        if (snap.empty) return;
        const cloudDocs: StandardsDoc[] = [];
        snap.forEach((d) => {
          cloudDocs.push(d.data() as StandardsDoc);
        });
        setDocuments((prev) => {
          const map = new Map<string, StandardsDoc>();
          prev.forEach((d) => map.set(d.documentId, d));
          cloudDocs.forEach((d) => map.set(d.documentId, d));
          return Array.from(map.values());
        });
      },
      (err) => {
        console.warn('Standards snapshot info:', err.message);
      }
    );
    return () => unsubscribe();
  }, [isAuthReady]);

  const persistLocalDocs = useCallback((nextDocs: StandardsDoc[]) => {
    setDocuments(nextDocs);
    try {
      // Avoid writing giant page arrays into catalog localStorage
      const lightDocs = nextDocs.map(({ pages: _p, ...rest }) => rest);
      localStorage.setItem(STANDARDS_STORAGE_KEY, JSON.stringify(lightDocs));
    } catch (e) {
      console.warn('Local standards cache skipped:', e);
    }
  }, []);

  const persistPagesCache = useCallback((docId: string, pages: StandardPageText[]) => {
    setPagesCache((prev) => {
      const next = { ...prev, [docId]: pages };
      try {
        localStorage.setItem(STANDARDS_PAGES_KEY, JSON.stringify(next));
      } catch {
        // Ignore quota overflow for very huge OCR books; IDB/Firestore handles binary
      }
      return next;
    });
  }, []);

  const openDocument = useCallback((docItem: StandardsDoc, page: number = 1, query: string = '') => {
    setActiveViewerDoc(docItem);
    setInitialViewerPage(Math.max(1, page));
    setInitialViewerQuery(query);
  }, []);

  const openDocumentByCode = useCallback(
    (code: string, page: number = 1, query: string = ''): boolean => {
      const normalized = code.toLowerCase().replace(/[\s-]/g, '');
      const found = documents.find(
        (d) =>
          d.documentNumber.toLowerCase().replace(/[\s-]/g, '') === normalized ||
          d.documentNumber.toLowerCase().includes(code.toLowerCase())
      );
      if (found) {
        openDocument(found, page, query);
        return true;
      }
      return false;
    },
    [documents, openDocument]
  );

  const closeViewer = useCallback(() => {
    setActiveViewerDoc(null);
    setInitialViewerQuery('');
  }, []);

  const sanitizeForFirestore = (docItem: StandardsDoc, ownerId: string, isNew: boolean) => {
    const clean: Record<string, unknown> = {
      documentId: docItem.documentId,
      ownerId,
      documentType: docItem.documentType,
      documentNumber: docItem.documentNumber.slice(0, 120),
      officialTitleRu: docItem.officialTitleRu.slice(0, 400),
      officialTitleKk: (docItem.officialTitleKk || docItem.officialTitleRu).slice(0, 400),
      language: docItem.language || 'both',
      revision: (docItem.revision || 'Официальная редакция').slice(0, 120),
      documentStatus: docItem.documentStatus,
      industryCategory: docItem.industryCategory,
      accessRights: docItem.accessRights,
      processingStatus: docItem.processingStatus || 'READY',
      fileFormat: docItem.fileFormat || 'PDF',
      pageCount: Math.max(0, Math.min(5000, Math.round(docItem.pageCount || 1))),
      sourceName: (docItem.sourceName || 'Комитет МПС РК').slice(0, 200),
      sourceUrl: (docItem.sourceUrl || 'https://adilet.zan.kz').slice(0, 500),
      sections: (docItem.sections || []).slice(0, 200),
      clauses: (docItem.clauses || []).slice(0, 200),
      lastVerifiedAt: docItem.lastVerifiedAt || new Date().toISOString(),
      updatedAt: serverTimestamp(),
    };
    if (isNew) clean.createdAt = serverTimestamp();
    if (docItem.publicationDate) clean.publicationDate = docItem.publicationDate;
    if (docItem.effectiveDate) clean.effectiveDate = docItem.effectiveDate;
    if (docItem.replacedBy) clean.replacedBy = docItem.replacedBy;
    if (docItem.fileUrl) clean.fileUrl = docItem.fileUrl.slice(0, 1000);
    if (docItem.fileStoragePath) clean.fileStoragePath = docItem.fileStoragePath.slice(0, 300);
    if (docItem.fileSizeBytes !== undefined) clean.fileSizeBytes = docItem.fileSizeBytes;
    if (docItem.checksumSha256) clean.checksumSha256 = docItem.checksumSha256.slice(0, 64);
    if (docItem.integrityReport) clean.integrityReport = docItem.integrityReport;
    return clean;
  };

  const addDocument = useCallback(
    async (newDoc: StandardsDoc) => {
      persistLocalDocs([newDoc, ...documents]);
      if (user && user.emailVerified) {
        try {
          const payload = sanitizeForFirestore(newDoc, user.uid, true);
          await setDoc(doc(db, 'standards_documents', newDoc.documentId), payload);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `standards_documents/${newDoc.documentId}`);
        }
      }
    },
    [documents, persistLocalDocs, user]
  );

  const updateDocument = useCallback(
    async (updatedDoc: StandardsDoc) => {
      const next = documents.map((d) => (d.documentId === updatedDoc.documentId ? updatedDoc : d));
      persistLocalDocs(next);
      if (user && user.emailVerified) {
        try {
          const payload = sanitizeForFirestore(updatedDoc, updatedDoc.ownerId || user.uid, false);
          await setDoc(doc(db, 'standards_documents', updatedDoc.documentId), payload, { merge: true });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `standards_documents/${updatedDoc.documentId}`);
        }
      }
    },
    [documents, persistLocalDocs, user]
  );

  const deleteDocument = useCallback(
    async (docId: string) => {
      persistLocalDocs(documents.filter((d) => d.documentId !== docId));
      if (user && user.emailVerified) {
        try {
          await deleteDoc(doc(db, 'standards_documents', docId));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `standards_documents/${docId}`);
        }
      }
    },
    [documents, persistLocalDocs, user]
  );

  const batchImport = useCallback(
    (newDocs: StandardsDoc[]) => {
      let added = 0;
      let duplicates = 0;
      const existingNums = new Set(
        documents.map((d) => d.documentNumber.toLowerCase().replace(/[\s-]/g, ''))
      );
      const toAdd: StandardsDoc[] = [];
      newDocs.forEach((item) => {
        const norm = item.documentNumber.toLowerCase().replace(/[\s-]/g, '');
        if (existingNums.has(norm)) duplicates++;
        else {
          existingNums.add(norm);
          toAdd.push(item);
          added++;
        }
      });
      if (toAdd.length > 0) {
        persistLocalDocs([...toAdd, ...documents]);
      }
      return { added, duplicates };
    },
    [documents, persistLocalDocs]
  );

  const uploadFullDocumentFile = useCallback(
    async (
      meta: Partial<StandardsDoc>,
      file: File,
      onProgress?: (status: string, detail: string) => void
    ): Promise<StandardsDoc> => {
      const docId =
        meta.documentId && /^[a-zA-Z0-9_-]+$/.test(meta.documentId)
          ? meta.documentId
          : `std_${Date.now()}`;

      const buffer = await file.arrayBuffer();
      await cacheBinaryFileLocally(docId, buffer);

      const ingested: IngestedDocumentResult = await ingestDocumentFile(file, {
        runOcrOnScan: true,
        onProgress: (st, msg) => onProgress?.(st, msg),
      });

      let fileUrl = meta.fileUrl;
      let fileStoragePath = meta.fileStoragePath;

      if (user && user.emailVerified) {
        onProgress?.('UPLOADING', 'Загрузка оригинала файла в облачное хранилище...');
        try {
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const storagePath = `standards/${docId}/${safeName}`;
          const storageRef = ref(storage, storagePath);
          await uploadBytes(storageRef, buffer, {
            contentType: file.type || (ingested.fileFormat === 'PDF' ? 'application/pdf' : 'application/octet-stream'),
          });
          fileUrl = await getDownloadURL(storageRef);
          fileStoragePath = storagePath;
        } catch (storageErr) {
          console.warn('Cloud Storage upload skipped, keeping local IndexedDB binary:', storageErr);
        }
      }

      const fullDoc: StandardsDoc = {
        documentId: docId,
        ownerId: user?.uid || 'local_user',
        documentType: meta.documentType || 'SP_RK',
        documentNumber: meta.documentNumber || file.name.replace(/\.(pdf|docx)$/i, ''),
        officialTitleRu: meta.officialTitleRu || file.name,
        officialTitleKk: meta.officialTitleKk || meta.officialTitleRu || file.name,
        language: meta.language || 'both',
        publicationDate: meta.publicationDate || new Date().toISOString().split('T')[0],
        effectiveDate: meta.effectiveDate || new Date().toISOString().split('T')[0],
        revision: meta.revision || 'Официальная полная редакция',
        documentStatus: meta.documentStatus || 'ACTIVE',
        industryCategory: meta.industryCategory || 'STRUCTURES',
        sourceName: meta.sourceName || 'Загруженный полный норматив',
        sourceUrl: meta.sourceUrl || 'https://adilet.zan.kz',
        fileUrl,
        fileStoragePath,
        fileFormat: ingested.fileFormat,
        fileSizeBytes: ingested.fileSizeBytes,
        checksumSha256: ingested.checksumSha256,
        accessRights: meta.accessRights || 'VIEW_AND_DOWNLOAD',
        processingStatus: ingested.processingStatus,
        integrityReport: ingested.integrityReport,
        lastVerifiedAt: new Date().toISOString(),
        pageCount: Math.max(1, ingested.pageCount),
        sections: ingested.sections,
        clauses: meta.clauses || [],
      };

      persistPagesCache(docId, ingested.pages);
      await addDocument(fullDoc);

      // Persist indexed pages to Firestore subcollection for RAG
      if (user && user.emailVerified && ingested.pages.length > 0) {
        onProgress?.('INDEXING_TEXT', 'Сохранение постраничного индекса в базу знаний...');
        try {
          const pagesToSave = ingested.pages.slice(0, 250);
          for (const pg of pagesToSave) {
            const pId = `p_${pg.pageNumber}`;
            await setDoc(doc(db, 'standards_documents', docId, 'pages', pId), {
              documentId: docId,
              ownerId: user.uid,
              pageNumber: pg.pageNumber,
              rawText: pg.rawText.slice(0, 48000),
              ocrText: (pg.ocrText || '').slice(0, 48000),
              isScanned: pg.isScanned,
              createdAt: serverTimestamp(),
            });
          }
        } catch (err) {
          console.warn('Firestore page index upload warning:', err);
        }
      }

      return fullDoc;
    },
    [addDocument, persistPagesCache, user]
  );

  const getDocumentPages = useCallback(
    async (documentId: string): Promise<StandardPageText[]> => {
      if (pagesCache[documentId] && pagesCache[documentId].length > 0) {
        return pagesCache[documentId];
      }
      try {
        const snap = await getDocs(collection(db, 'standards_documents', documentId, 'pages'));
        if (!snap.empty) {
          const list: StandardPageText[] = [];
          snap.forEach((d) => list.push(d.data() as StandardPageText));
          list.sort((a, b) => a.pageNumber - b.pageNumber);
          persistPagesCache(documentId, list);
          return list;
        }
      } catch {
        // Fallback to clauses
      }
      return [];
    },
    [pagesCache, persistPagesCache]
  );

  const getDocumentBinary = useCallback(async (docItem: StandardsDoc): Promise<ArrayBuffer | null> => {
    const cached = await loadLocalCachedBinary(docItem.documentId);
    if (cached) return cached;
    if (docItem.fileUrl) {
      try {
        const res = await fetch(docItem.fileUrl);
        if (res.ok) {
          const buf = await res.arrayBuffer();
          await cacheBinaryFileLocally(docItem.documentId, buf);
          return buf;
        }
      } catch (e) {
        console.warn('Remote PDF fetch failed:', e);
      }
    }
    return null;
  }, []);

  const searchFullTexts = useCallback(
    (queryStr: string): SearchChunkMatch[] => {
      const terms = queryStr
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => t.length >= 3);
      if (terms.length === 0) return [];

      const results: SearchChunkMatch[] = [];

      for (const d of documents) {
        // 1. Search full indexed PDF/DOCX pages first
        const cachedPages = pagesCache[d.documentId];
        if (cachedPages && cachedPages.length > 0) {
          for (const pg of cachedPages) {
            const txt = `${pg.rawText} ${pg.ocrText || ''}`.trim();
            const txtLower = txt.toLowerCase();
            let score = 0;
            for (const term of terms) {
              if (txtLower.includes(term)) score += 2;
            }
            if (score > 0) {
              results.push({
                documentId: d.documentId,
                documentNumber: d.documentNumber,
                officialTitle: d.officialTitleRu,
                revision: d.revision,
                status: d.documentStatus,
                pageNumber: pg.pageNumber,
                excerpt: txt.slice(0, 1200),
                score: score + (d.documentStatus === 'ACTIVE' ? 1 : 0),
              });
            }
          }
        }

        // 2. Also search structured clauses in registry
        for (const cl of d.clauses) {
          const txt = `[${cl.clauseNumber}] ${cl.sectionTitle}: ${cl.contentRu}`;
          const txtLower = txt.toLowerCase();
          let score = 0;
          for (const term of terms) {
            if (txtLower.includes(term)) score += 2;
          }
          if (score > 0) {
            results.push({
              documentId: d.documentId,
              documentNumber: d.documentNumber,
              officialTitle: d.officialTitleRu,
              revision: d.revision,
              status: d.documentStatus,
              pageNumber: cl.pageNumber,
              excerpt: txt,
              score: score + (d.documentStatus === 'ACTIVE' ? 1 : 0),
            });
          }
        }
      }

      return results.sort((a, b) => b.score - a.score).slice(0, 8);
    },
    [documents, pagesCache]
  );

  return (
    <StandardsContext.Provider
      value={{
        documents,
        activeViewerDoc,
        initialViewerPage,
        initialViewerQuery,
        openDocument,
        openDocumentByCode,
        closeViewer,
        addDocument,
        updateDocument,
        deleteDocument,
        batchImport,
        uploadFullDocumentFile,
        getDocumentPages,
        getDocumentBinary,
        searchFullTexts,
      }}
    >
      {children}
    </StandardsContext.Provider>
  );
};
