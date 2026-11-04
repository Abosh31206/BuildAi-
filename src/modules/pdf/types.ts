export interface ProjectMetadata {
  projectName: string;
  projectCode: string; // e.g. "KZ-2025-08-АР"
  objectAddress: string;
  city: string;
  clientName: string;
  contractor: string;
  generalEngineerGip: string; // Главный инженер проекта
  leadArchitect: string;
  stage: 'ЭП' | 'АР' | 'КЖ' | 'АС'; // Эскизный проект / Архитектурные решения / Конструкции ж/б
  year: number;
  dateStr: string;
}

export interface MaterialSpecItem {
  id: string;
  name: string;
  gostOrStandard: string;
  unit: string;
  quantity: number;
  safetyMarginPct: number;
  totalWithMargin: number;
  weightTons?: number;
  note: string;
}

export interface EngineeringCalculationSummaryItem {
  id: string;
  calculatorTitle: string;
  normCode: string;
  keyFormula: string;
  primaryResult: string;
  notes: string;
}

export interface ProjectAlbumData {
  metadata: ProjectMetadata;
  materials: MaterialSpecItem[];
  calculations: EngineeringCalculationSummaryItem[];
  cadDrawingTitle?: string;
  cadScale?: string;
}
