import React, { useState } from 'react';
import { StandardsDoc, StandardType, StandardStatus, IndustryCategory, AccessRights } from '../../types';
import {
  ShieldCheck,
  Plus,
  Upload,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  X,
  FileText,
  Save,
  RotateCcw,
} from 'lucide-react';

interface AdminStandardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: StandardsDoc[];
  onAddDocument: (doc: StandardsDoc) => void;
  onUpdateDocument: (doc: StandardsDoc) => void;
  onDeleteDocument: (docId: string) => void;
  onBatchImport: (newDocs: StandardsDoc[]) => { added: number; duplicates: number };
  language: 'ru' | 'kk';
}

export const AdminStandardsModal: React.FC<AdminStandardsModalProps> = ({
  isOpen,
  onClose,
  documents,
  onAddDocument,
  onUpdateDocument,
  onDeleteDocument,
  onBatchImport,
  language,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'import'>('list');
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [csvText, setCsvText] = useState<string>('');
  const [importReport, setImportReport] = useState<{ added: number; duplicates: number } | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<StandardsDoc>>({
    documentType: 'SP_RK',
    documentNumber: '',
    officialTitleRu: '',
    officialTitleKk: '',
    revision: 'Официальная редакция',
    documentStatus: 'ACTIVE',
    industryCategory: 'STRUCTURES',
    sourceName: 'Комитет по делам строительства и ЖКХ МПС РК',
    sourceUrl: 'https://adilet.zan.kz',
    accessRights: 'VIEW_AND_DOWNLOAD',
    pageCount: 1,
  });

  if (!isOpen) return null;

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.documentNumber || !formData.officialTitleRu) {
      alert('Заполните обязательные поля: Шифр и Наименование документа');
      return;
    }

    // Duplicate check
    const isDuplicate = documents.some(
      (d) =>
        d.documentNumber.toLowerCase() === formData.documentNumber?.toLowerCase() &&
        d.documentId !== editingDocId
    );

    if (isDuplicate) {
      alert(`Ошибка: Документ с номером "${formData.documentNumber}" уже зарегистрирован в базе данных.`);
      return;
    }

    if (editingDocId) {
      const existing = documents.find((d) => d.documentId === editingDocId);
      if (existing) {
        onUpdateDocument({
          ...existing,
          ...(formData as StandardsDoc),
          lastVerifiedAt: new Date().toISOString(),
        });
      }
    } else {
      const newDoc: StandardsDoc = {
        documentId: `doc-${Date.now()}`,
        documentType: formData.documentType || 'SP_RK',
        documentNumber: formData.documentNumber || '',
        officialTitleRu: formData.officialTitleRu || '',
        officialTitleKk: formData.officialTitleKk || formData.officialTitleRu || '',
        language: 'both',
        publicationDate: formData.publicationDate || new Date().toISOString().split('T')[0],
        effectiveDate: formData.effectiveDate || new Date().toISOString().split('T')[0],
        revision: formData.revision || 'Действующая редакция',
        documentStatus: formData.documentStatus || 'ACTIVE',
        industryCategory: formData.industryCategory || 'STRUCTURES',
        sourceName: formData.sourceName || 'Комитет МПС РК',
        sourceUrl: formData.sourceUrl || 'https://adilet.zan.kz',
        fileFormat: 'PDF',
        accessRights: formData.accessRights || 'VIEW_AND_DOWNLOAD',
        lastVerifiedAt: new Date().toISOString(),
        pageCount: formData.pageCount || 1,
        clauses: [],
        sections: [],
      };
      onAddDocument(newDoc);
    }

    setEditingDocId(null);
    setActiveTab('list');
    setFormData({
      documentType: 'SP_RK',
      documentNumber: '',
      officialTitleRu: '',
      officialTitleKk: '',
      revision: 'Официальная редакция',
      documentStatus: 'ACTIVE',
      industryCategory: 'STRUCTURES',
      sourceName: 'Комитет по делам строительства и ЖКХ МПС РК',
      sourceUrl: 'https://adilet.zan.kz',
      accessRights: 'VIEW_AND_DOWNLOAD',
      pageCount: 1,
    });
  };

  const handleEditClick = (doc: StandardsDoc) => {
    setEditingDocId(doc.documentId);
    setFormData(doc);
    setActiveTab('add');
  };

  const handleParseCsv = () => {
    if (!csvText.trim()) return;
    const lines = csvText.trim().split('\n');
    const parsed: StandardsDoc[] = [];

    lines.forEach((line, index) => {
      // Format: Number; TitleRu; Type; Status; SourceName; SourceUrl
      const parts = line.split(';').map((s) => s.trim());
      if (parts.length >= 2 && parts[0] && parts[1]) {
        parsed.push({
          documentId: `csv-${Date.now()}-${index}`,
          documentNumber: parts[0],
          officialTitleRu: parts[1],
          officialTitleKk: parts[1],
          documentType: (parts[2] as StandardType) || 'SP_RK',
          documentStatus: (parts[3] as StandardStatus) || 'ACTIVE',
          industryCategory: 'STRUCTURES',
          sourceName: parts[4] || 'Комитет по делам строительства МПС РК',
          sourceUrl: parts[5] || 'https://adilet.zan.kz',
          revision: 'Официальная редакция',
          language: 'both',
          fileFormat: 'PDF',
          accessRights: 'VIEW_AND_DOWNLOAD',
          lastVerifiedAt: new Date().toISOString(),
          pageCount: 1,
          clauses: [],
          sections: [],
        });
      }
    });

    const report = onBatchImport(parsed);
    setImportReport(report);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center font-bold text-white shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold tracking-tight">
                {language === 'kk'
                  ? 'Нормативтік құжаттарды басқару (Әкімшілік панель)'
                  : 'Административное управление библиотекой нормативов РК'}
              </h2>
              <p className="text-[11px] text-slate-400">
                Верификация статусов, добавление редакций и защита от дубликатов
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="bg-slate-100 border-b border-slate-200 px-5 py-2 flex items-center gap-2 text-xs">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeTab === 'list'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Реестр документов ({documents.length})
          </button>
          <button
            onClick={() => {
              setEditingDocId(null);
              setActiveTab('add');
            }}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeTab === 'add'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {editingDocId ? 'Редактировать запись' : '+ Добавить норматив'}
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeTab === 'import'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Импорт CSV / XLSX
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* TAB 1: LIST VIEW */}
          {activeTab === 'list' && (
            <div className="space-y-3">
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 font-bold border-b border-slate-200 text-slate-700">
                    <tr>
                      <th className="p-2.5">Шифр</th>
                      <th className="p-2.5">Название</th>
                      <th className="p-2.5">Статус</th>
                      <th className="p-2.5">Верифицирован</th>
                      <th className="p-2.5 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {documents.map((d) => (
                      <tr key={d.documentId} className="hover:bg-slate-50">
                        <td className="p-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {d.documentNumber}
                        </td>
                        <td className="p-2.5 max-w-sm truncate text-slate-800">
                          {d.officialTitleRu}
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              d.documentStatus === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : d.documentStatus === 'REPLACED'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {d.documentStatus}
                          </span>
                        </td>
                        <td className="p-2.5 font-mono text-slate-500 text-[11px]">
                          {new Date(d.lastVerifiedAt).toLocaleDateString()}
                        </td>
                        <td className="p-2.5 text-right whitespace-nowrap space-x-1">
                          <button
                            onClick={() => handleEditClick(d)}
                            className="p-1 text-slate-600 hover:text-blue-900 hover:bg-slate-100 rounded"
                            title="Редактировать"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Удалить норматив ${d.documentNumber}?`)) {
                                onDeleteDocument(d.documentId);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                            title="Удалить"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: ADD / EDIT FORM */}
          {activeTab === 'add' && (
            <form onSubmit={handleSaveForm} className="space-y-4 max-w-2xl mx-auto text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Официальный шифр документа *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="напр., СП РК 5.03-107-2013"
                    value={formData.documentNumber || ''}
                    onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono focus:ring-1 focus:ring-blue-600 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Тип документа
                  </label>
                  <select
                    value={formData.documentType || 'SP_RK'}
                    onChange={(e) => setFormData({ ...formData, documentType: e.target.value as any })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-600 outline-hidden"
                  >
                    <option value="SP_RK">СП РК (Строительные правила)</option>
                    <option value="SN_RK">СН РК (Строительные нормы)</option>
                    <option value="GOST">ГОСТ (Межгосударственный)</option>
                    <option value="ST_RK">СТ РК (Национальный стандарт)</option>
                    <option value="SNIP">СНиП (Архив СССР / РК)</option>
                    <option value="NTD">НТД (Техническая документация)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Официальное наименование (русский язык) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="напр., Несущие и ограждающие конструкции"
                  value={formData.officialTitleRu || ''}
                  onChange={(e) => setFormData({ ...formData, officialTitleRu: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-600 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Ресми атауы (қазақ тілінде)
                </label>
                <input
                  type="text"
                  placeholder="напр., Жүк көтергіш және қоршау құрылыстары"
                  value={formData.officialTitleKk || ''}
                  onChange={(e) => setFormData({ ...formData, officialTitleKk: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-600 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Статус документа
                  </label>
                  <select
                    value={formData.documentStatus || 'ACTIVE'}
                    onChange={(e) => setFormData({ ...formData, documentStatus: e.target.value as any })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-600 outline-hidden"
                  >
                    <option value="ACTIVE">Действует (ACTIVE)</option>
                    <option value="REPLACED">Заменен (REPLACED)</option>
                    <option value="CANCELLED">Отменен (CANCELLED)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Отрасль
                  </label>
                  <select
                    value={formData.industryCategory || 'STRUCTURES'}
                    onChange={(e) => setFormData({ ...formData, industryCategory: e.target.value as any })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-600 outline-hidden"
                  >
                    <option value="STRUCTURES">Несущие конструкции</option>
                    <option value="SEISMIC">Сейсмика</option>
                    <option value="FOUNDATIONS">Основания и грунты</option>
                    <option value="CLIMATE_THERMAL">Климатология / Тепло</option>
                    <option value="FINISHING">Отделочные работы</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Редакция
                  </label>
                  <input
                    type="text"
                    value={formData.revision || ''}
                    onChange={(e) => setFormData({ ...formData, revision: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-600 outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Официальный источник (Орган)
                  </label>
                  <input
                    type="text"
                    value={formData.sourceName || ''}
                    onChange={(e) => setFormData({ ...formData, sourceName: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-600 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Ссылка на государственный реестр
                  </label>
                  <input
                    type="url"
                    value={formData.sourceUrl || ''}
                    onChange={(e) => setFormData({ ...formData, sourceUrl: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-600 outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-blue-900 hover:bg-blue-800 text-white font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Сохранить в реестр</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: CSV IMPORT */}
          {activeTab === 'import' && (
            <div className="space-y-4 max-w-2xl mx-auto text-xs">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-900">
                <span className="font-bold">Формат строк CSV (разделитель точка с запятой):</span>
                <p className="font-mono text-[11px] mt-1 text-blue-800">
                  Шифр; Наименование; Тип (SP_RK/SN_RK/GOST); Статус (ACTIVE/REPLACED); Орган; Ссылка
                </p>
                <p className="text-[11px] text-blue-700 mt-1">
                  Пример: СП РК 5.03-107-2013; Несущие конструкции; SP_RK; ACTIVE; Комитет МПС РК; https://adilet.zan.kz
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Вставьте строки CSV:
                </label>
                <textarea
                  rows={8}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="СП РК 1.03-106-2012; Отделочные работы; SP_RK; ACTIVE; Комитет МПС РК; https://adilet.zan.kz"
                  className="w-full border border-slate-300 rounded p-2.5 font-mono text-xs focus:ring-1 focus:ring-blue-600 outline-hidden"
                />
              </div>

              {importReport && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    Успешно добавлено: <strong>{importReport.added}</strong> нормативов. Пропущено дубликатов:{' '}
                    <strong>{importReport.duplicates}</strong>.
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleParseCsv}
                  className="px-4 py-2 rounded bg-blue-900 hover:bg-blue-800 text-white font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Выполнить импорт с дедупликацией</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
