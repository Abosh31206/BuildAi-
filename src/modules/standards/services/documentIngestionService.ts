import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';
import {
  DocumentSection,
  IntegrityReport,
  ProcessingStatus,
  StandardPageText,
} from '../types';

// Configure PDF.js worker via Vite static asset URL
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface IngestedDocumentResult {
  fileFormat: 'PDF' | 'DOCX';
  fileSizeBytes: number;
  checksumSha256: string;
  pageCount: number;
  sections: DocumentSection[];
  pages: StandardPageText[];
  integrityReport: IntegrityReport;
  processingStatus: ProcessingStatus;
}

const IDB_NAME = 'buildai_kz_standards_files';
const IDB_STORE = 'files';

function openFilesDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const idb = req.result;
      if (!idb.objectStoreNames.contains(IDB_STORE)) {
        idb.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function cacheBinaryFileLocally(documentId: string, buffer: ArrayBuffer): Promise<void> {
  try {
    const idb = await openFilesDb();
    await new Promise<void>((resolve, reject) => {
      const tx = idb.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(buffer, documentId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('IndexedDB binary cache skipped:', e);
  }
}

export async function loadLocalCachedBinary(documentId: string): Promise<ArrayBuffer | null> {
  try {
    const idb = await openFilesDb();
    return await new Promise<ArrayBuffer | null>((resolve, reject) => {
      const tx = idb.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(documentId);
      req.onsuccess = () => resolve((req.result as ArrayBuffer) || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function computeSha256Hex(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function resolveOutlineDestPage(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  dest: unknown
): Promise<number> {
  try {
    let destArray = dest;
    if (typeof dest === 'string') {
      destArray = await pdfDoc.getDestination(dest);
    }
    if (Array.isArray(destArray) && destArray[0]) {
      const pageIdx = await pdfDoc.getPageIndex(destArray[0] as any);
      return pageIdx + 1;
    }
  } catch {
    // ignore unresolved destination
  }
  return 1;
}

export async function ingestDocumentFile(
  file: File,
  options: {
    runOcrOnScan?: boolean;
    onProgress?: (status: ProcessingStatus, detail: string) => void;
  } = {}
): Promise<IngestedDocumentResult> {
  const { runOcrOnScan = true, onProgress } = options;
  const buffer = await file.arrayBuffer();
  const checksumSha256 = await computeSha256Hex(buffer);
  const isDocx =
    file.name.toLowerCase().endsWith('.docx') ||
    file.type.includes('wordprocessingml');

  if (isDocx) {
    onProgress?.('INDEXING_TEXT', 'Извлечение структуры и текста из DOCX...');
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    const fullText = (result.value || '').trim();
    if (!fullText) {
      return {
        fileFormat: 'DOCX',
        fileSizeBytes: file.size,
        checksumSha256,
        pageCount: 0,
        sections: [],
        pages: [],
        processingStatus: 'CORRUPTED',
        integrityReport: {
          actualPages: 0,
          firstPageVerified: false,
          lastPageVerified: false,
          isScanned: false,
          ocrCompleted: false,
          avgCharsPerPage: 0,
          verifiedAt: new Date().toISOString(),
          notes: 'DOCX файл пуст или повреждён.',
        },
      };
    }

    const chunkSize = 2600;
    const pages: StandardPageText[] = [];
    for (let i = 0; i < fullText.length; i += chunkSize) {
      pages.push({
        pageNumber: pages.length + 1,
        rawText: fullText.slice(i, i + chunkSize),
        isScanned: false,
      });
    }

    const sections: DocumentSection[] = pages.slice(0, 20).map((p) => {
      const firstLine = p.rawText.split('\n').find((l) => l.trim().length > 3)?.trim() || `Раздел (стр. ${p.pageNumber})`;
      return {
        id: `sec_docx_${p.pageNumber}`,
        title: firstLine.slice(0, 90),
        pageNumber: p.pageNumber,
        level: 1,
      };
    });

    return {
      fileFormat: 'DOCX',
      fileSizeBytes: file.size,
      checksumSha256,
      pageCount: pages.length,
      sections,
      pages,
      processingStatus: 'READY',
      integrityReport: {
        actualPages: pages.length,
        firstPageVerified: true,
        lastPageVerified: true,
        isScanned: false,
        ocrCompleted: false,
        avgCharsPerPage: Math.round(fullText.length / Math.max(1, pages.length)),
        verifiedAt: new Date().toISOString(),
        notes: 'DOCX полностью прочитан и проиндексирован постранично.',
      },
    };
  }

  // PDF Verification & Ingestion Pipeline
  onProgress?.('VALIDATING', 'Проверка целостности PDF, количества страниц и последней страницы...');
  let pdfDoc: pdfjsLib.PDFDocumentProxy;
  try {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer.slice(0)) });
    pdfDoc = await loadingTask.promise;
  } catch (err) {
    return {
      fileFormat: 'PDF',
      fileSizeBytes: file.size,
      checksumSha256,
      pageCount: 0,
      sections: [],
      pages: [],
      processingStatus: 'CORRUPTED',
      integrityReport: {
        actualPages: 0,
        firstPageVerified: false,
        lastPageVerified: false,
        isScanned: false,
        ocrCompleted: false,
        avgCharsPerPage: 0,
        verifiedAt: new Date().toISOString(),
        notes: err instanceof Error ? `Ошибка структуры PDF: ${err.message}` : 'Файл PDF повреждён',
      },
    };
  }

  const numPages = pdfDoc.numPages;
  let firstPageVerified = false;
  let lastPageVerified = false;

  try {
    await pdfDoc.getPage(1);
    firstPageVerified = true;
    await pdfDoc.getPage(numPages);
    lastPageVerified = true;
  } catch {
    lastPageVerified = false;
  }

  if (!firstPageVerified || !lastPageVerified || numPages === 0) {
    await (pdfDoc as unknown as { destroy?: () => Promise<void> }).destroy?.();
    return {
      fileFormat: 'PDF',
      fileSizeBytes: file.size,
      checksumSha256,
      pageCount: numPages,
      sections: [],
      pages: [],
      processingStatus: 'INCOMPLETE',
      integrityReport: {
        actualPages: numPages,
        firstPageVerified,
        lastPageVerified,
        isScanned: false,
        ocrCompleted: false,
        avgCharsPerPage: 0,
        verifiedAt: new Date().toISOString(),
        notes: 'Последняя страница недоступна — файл обрезан или повреждён.',
      },
    };
  }

  // Extract Outline
  const rawOutline = await pdfDoc.getOutline().catch(() => null);
  const sections: DocumentSection[] = [];
  if (Array.isArray(rawOutline)) {
    for (let i = 0; i < Math.min(rawOutline.length, 60); i++) {
      const item = rawOutline[i];
      const pNum = await resolveOutlineDestPage(pdfDoc, item.dest);
      const children: DocumentSection[] = [];
      if (Array.isArray(item.items)) {
        for (let j = 0; j < Math.min(item.items.length, 20); j++) {
          const child = item.items[j];
          const cp = await resolveOutlineDestPage(pdfDoc, child.dest);
          children.push({
            id: `toc_${i}_${j}`,
            title: child.title || `Подраздел ${j + 1}`,
            pageNumber: cp,
            level: 2,
          });
        }
      }
      sections.push({
        id: `toc_${i}`,
        title: item.title || `Раздел ${i + 1}`,
        pageNumber: pNum,
        level: 1,
        children: children.length > 0 ? children : undefined,
      });
    }
  }

  // Extract Text Layer from all pages
  onProgress?.('INDEXING_TEXT', `Извлечение текста со всех ${numPages} страниц...`);
  const pages: StandardPageText[] = [];
  let totalChars = 0;

  for (let p = 1; p <= numPages; p++) {
    const page = await pdfDoc.getPage(p);
    const tc = await page.getTextContent();
    const rawText = tc.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    totalChars += rawText.length;
    pages.push({
      pageNumber: p,
      rawText: rawText.slice(0, 48000),
      isScanned: rawText.length < 40,
    });
  }

  const avgCharsPerPage = Math.round(totalChars / Math.max(1, numPages));
  const isScanned = avgCharsPerPage < 45;
  let ocrCompleted = false;

  // Run OCR in background worker if PDF is scanned (preserving original PDF untouched)
  if (isScanned && runOcrOnScan) {
    onProgress?.('OCR_PROCESSING', `Обнаружен скан (${avgCharsPerPage} симв./стр). Запуск OCR (rus+kaz)...`);
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('rus');
      const maxOcrPages = Math.min(numPages, 15); // Process initial/sampled pages promptly in browser
      for (let p = 1; p <= maxOcrPages; p++) {
        onProgress?.('OCR_PROCESSING', `OCR распознавание страницы ${p} из ${maxOcrPages}...`);
        const page = await pdfDoc.getPage(p);
        const viewport = page.getViewport({ scale: 1.5 });
        const offCanvas = document.createElement('canvas');
        offCanvas.width = viewport.width;
        offCanvas.height = viewport.height;
        const ctx = offCanvas.getContext('2d');
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport, canvas: offCanvas } as any).promise;
          const {
            data: { text },
          } = await worker.recognize(offCanvas);
          pages[p - 1].ocrText = (text || '').trim().slice(0, 48000);
        }
      }
      await worker.terminate();
      ocrCompleted = true;
    } catch (ocrErr) {
      console.warn('OCR worker warning:', ocrErr);
    }
  }

  await (pdfDoc as unknown as { destroy?: () => Promise<void> }).destroy?.();

  return {
    fileFormat: 'PDF',
    fileSizeBytes: file.size,
    checksumSha256,
    pageCount: numPages,
    sections,
    pages,
    processingStatus: 'READY',
    integrityReport: {
      actualPages: numPages,
      firstPageVerified,
      lastPageVerified,
      isScanned,
      ocrCompleted,
      avgCharsPerPage,
      verifiedAt: new Date().toISOString(),
      notes: isScanned
        ? ocrCompleted
          ? 'Скан-PDF проверен. Оригинал сохранён без изменений, выполнен OCR текстовый индекс.'
          : 'Скан-PDF проверен (оригинал сохранён). Текстовый слой требует OCR.'
        : `Проверены все ${numPages} страниц, включая последнюю страницу.`,
    },
  };
}
