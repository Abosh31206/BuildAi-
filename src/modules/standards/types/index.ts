export type StandardType = 'SP_RK' | 'SN_RK' | 'GOST' | 'ST_RK' | 'SNIP' | 'NTD';

export type StandardStatus = 'ACTIVE' | 'REPLACED' | 'CANCELLED' | 'UNCONFIRMED';

export type IndustryCategory =
  | 'ALL'
  | 'STRUCTURES'
  | 'SEISMIC'
  | 'FOUNDATIONS'
  | 'CLIMATE_THERMAL'
  | 'FINISHING'
  | 'FIRE_SAFETY'
  | 'ENGINEERING_NETS';

export type AccessRights = 'VIEW_AND_DOWNLOAD' | 'VIEW_ONLY' | 'OFFICIAL_LINK_ONLY';

export type ProcessingStatus =
  | 'READY'
  | 'UPLOADING'
  | 'VALIDATING'
  | 'INDEXING_TEXT'
  | 'OCR_PROCESSING'
  | 'INCOMPLETE'
  | 'CORRUPTED';

export interface IntegrityReport {
  expectedPages?: number;
  actualPages: number;
  firstPageVerified: boolean;
  lastPageVerified: boolean;
  isScanned: boolean;
  ocrCompleted: boolean;
  avgCharsPerPage: number;
  verifiedAt: string;
  notes?: string;
}

export interface StandardPageText {
  pageNumber: number;
  rawText: string;
  ocrText?: string;
  isScanned: boolean;
}

export interface DocumentClause {
  id: string;
  clauseNumber: string;
  sectionTitle: string;
  contentRu: string;
  contentKk: string;
  pageNumber: number;
}

export interface DocumentSection {
  id: string;
  title: string;
  pageNumber: number;
  level: number;
  children?: DocumentSection[];
}

export interface StandardRevision {
  revisionCode: string;
  approvedDate: string;
  effectiveDate: string;
  orderNumber: string;
  note?: string;
}

export interface StandardsDoc {
  documentId: string;
  ownerId?: string;
  documentType: StandardType;
  documentNumber: string;
  officialTitleRu: string;
  officialTitleKk: string;
  language: 'ru' | 'kk' | 'both';
  publicationDate?: string;
  effectiveDate?: string;
  revision: string;
  documentStatus: StandardStatus;
  replacedBy?: {
    documentId?: string;
    documentNumber: string;
    note?: string;
  };
  industryCategory: IndustryCategory;
  sourceName: string;
  sourceUrl: string;
  fileUrl?: string;
  fileStoragePath?: string;
  fileFormat: 'PDF' | 'DOCX' | 'NONE';
  fileSizeBytes?: number;
  checksumSha256?: string;
  accessRights: AccessRights;
  processingStatus?: ProcessingStatus;
  integrityReport?: IntegrityReport;
  lastVerifiedAt: string;
  pageCount: number;
  clauses: DocumentClause[];
  sections: DocumentSection[];
  revisionsHistory?: StandardRevision[];
  searchableText?: string;
  pages?: StandardPageText[];
}

export interface StandardsFilterState {
  searchQuery: string;
  documentType: 'ALL' | StandardType;
  industryCategory: IndustryCategory;
  documentStatus: 'ALL' | StandardStatus;
  yearRange: [number, number];
  accessRights: 'ALL' | AccessRights;
  viewMode: 'cards' | 'table';
}
