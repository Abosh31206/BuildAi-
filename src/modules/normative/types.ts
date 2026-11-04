export type NormativeCategory = 'ALL' | 'SP_RK' | 'SN_RK' | 'GOST' | 'ST_RK' | 'NTD';

export type NormativeStatus = 'ACTIVE' | 'REPLACED' | 'DRAFT';

export interface NormativeClause {
  clause: string;
  title: string;
  content: string;
  notes?: string;
}

export interface NormativeDoc {
  id: string;
  code: string; // e.g. "СП РК 5.03-107-2013"
  titleRu: string;
  titleKk: string;
  category: NormativeCategory;
  status: NormativeStatus;
  replacedByCode?: string;
  replacedByNote?: string;
  year: number;
  effectiveDate: string;
  publisher: string;
  summaryRu: string;
  summaryKk: string;
  keyClauses: NormativeClause[];
  officialRegistryUrl?: string;
  pdfUrl?: string;
}
