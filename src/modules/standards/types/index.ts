export type StandardType = 'SP_RK' | 'SN_RK' | 'GOST' | 'ST_RK' | 'SNIP' | 'NTD';

export type StandardStatus = 'ACTIVE' | 'REPLACED' | 'CANCELLED' | 'UNCONFIRMED';

export type IndustryCategory =
  | 'ALL'
  | 'STRUCTURES'      // Несущие конструкции, бетон, металл, дерево
  | 'SEISMIC'         // Сейсмостойкое строительство
  | 'FOUNDATIONS'     // Основания, фундаменты, геодезия
  | 'CLIMATE_THERMAL' // Строительная климатология и теплотехника
  | 'FINISHING'       // Отделочные работы, штукатурка, кровля, изоляция
  | 'FIRE_SAFETY'     // Пожарная безопасность
  | 'ENGINEERING_NETS'; // Инженерные сети (ОВ, ВК, электрика)

export type AccessRights = 'VIEW_AND_DOWNLOAD' | 'VIEW_ONLY' | 'OFFICIAL_LINK_ONLY';

export interface DocumentClause {
  id: string;
  clauseNumber: string; // e.g. "5.2.11"
  sectionTitle: string;
  contentRu: string;
  contentKk: string;
  pageNumber: number;
}

export interface DocumentSection {
  id: string;
  title: string;
  pageNumber: number;
  level: number; // 1 = Section, 2 = Subsection
  children?: DocumentSection[];
}

export interface StandardRevision {
  revisionCode: string;
  approvedDate: string;
  effectiveDate: string;
  orderNumber: string; // Номер приказа
  note?: string;
}

export interface StandardsDoc {
  documentId: string;
  documentType: StandardType;
  documentNumber: string; // Официальный шифр (напр., "СП РК 5.03-107-2013")
  officialTitleRu: string;
  officialTitleKk: string;
  language: 'ru' | 'kk' | 'both';
  publicationDate?: string;
  effectiveDate?: string;
  revision: string; // Текущая подтвержденная редакция
  documentStatus: StandardStatus;
  replacedBy?: {
    documentId?: string;
    documentNumber: string;
    note?: string;
  };
  industryCategory: IndustryCategory;
  sourceName: string; // e.g., "Комитет по делам строительства МПС РК"
  sourceUrl: string; // Официальная ссылка на реестр
  fileUrl?: string; // Прямая ссылка на PDF или локальный resource
  fileFormat: 'PDF' | 'NONE';
  fileSizeBytes?: number;
  accessRights: AccessRights;
  lastVerifiedAt: string; // ISO дата последней проверки
  pageCount: number;
  clauses: DocumentClause[];
  sections: DocumentSection[];
  revisionsHistory?: StandardRevision[];
  searchableText?: string;
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
