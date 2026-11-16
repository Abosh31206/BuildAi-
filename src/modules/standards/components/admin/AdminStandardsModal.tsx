import React, { useState } from 'react';
import { StandardsDoc, StandardType, StandardStatus, IndustryCategory, AccessRights } from '../../types';
import { useStandards } from '../../store/StandardsContext';
import {
  ShieldCheck,
  Upload,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  X,
  FileUp,
  Save,
  Loader2,
  FileCheck2,
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
  const { uploadFullDocumentFile } = useStandards();

  const [activeTab, setActiveTab] = useState<'list' | 'upload' | 'add' | 'import'>('list');
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [csvText, setCsvText] = useState<string>('');
  const [importReport, setImportReport] = useState<{ added: number; duplicates: number } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Full PDF/DOCX Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState<string>('');
  const [uploadedDocResult, setUploadedDocResult] = useState<StandardsDoc | null>(null);

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

  const handleFullFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!selectedFile) {
      setFormError('Выберите PDF или DOCX файл документа.');
      return;
    }
    if (!formData.documentNumber || !formData.officialTitleRu) {
      setFormError('Укажите шифр норматива и официальное наименование.');
      return;
    }

    setIsUploading(true);
    setUploadedDocResult(null);
    setUploadStatusMsg('Запуск проверки контрольной суммы и структуры файла...');
    try {
      const created = await uploadFullDocumentFile(formData, selectedFile, (_st, detail) => {
        setUploadStatusMsg(detail);
      });
      setUploadedDocResult(created);
      setSelectedFile(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Ошибка загрузки файла.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.documentNumber || !formData.officialTitleRu) {
      setFormError('Заполните обязательные поля: Шифр и Наименование документа');
      return;
    }

    const isDuplicate = documents.some(
      (d) =>
        d.documentNumber.toLowerCase() === formData.documentNumber?.toLowerCase() &&
        d.documentId !== editingDocId
    );

    if (isDuplicate) {
      setFormError(`Документ с номером "${formData.documentNumber}" уже зарегистрирован в базе.`);
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
        documentId: `doc_${Date.now()}`,
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
        fileFormat: 'NONE',
        accessRights: formData.accessRights || 'VIEW_AND_DOWNLOAD',
        processingStatus: 'READY',
        lastVerifiedAt: new Date().toISOString(),
        pageCount: formData.pageCount || 1,
        clauses: [],
        sections: [],
      };
      onAddDocument(newDoc);
    }

    setEditingDocId(null);
    setActiveTab('list');
  };

  const handleEditClick = (docItem: StandardsDoc) => {
    setEditingDocId(docItem.documentId);
    setFormData(docItem);
    setFormError(null);
    setActiveTab('add');
  };

  const handleParseCsv = () => {
    if (!csvText.trim()) return;
    const lines = csvText.trim().split('\n');
    const parsed: StandardsDoc[] = [];

    lines.forEach((line, index) => {
      const parts = line.split(';').map((s) => s.trim());
      if (parts.length >= 2 && parts[0] && parts[1]) {
        parsed.push({
          documentId: `csv_${Date.now()}_${index}`,
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
          fileFormat: 'NONE',
          accessRights: 'VIEW_AND_DOWNLOAD',
          processingStatus: 'READY',
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
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center font-bold text-white shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold tracking-tight">
                {language === 'kk'
                  ? 'Нормативтік құжаттарды басқару және PDF/DOCX жүктеу'
                  : 'Управление библиотекой нормативов · Полная загрузка PDF / DOCX'}
              </h2>
              <p className="text-[11px] text-slate-400">
                Проверка полноты страниц, SHA-256 контроль, OCR для сканов и индексация для Normative AI
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="bg-slate-100 border-b border-slate-200 px-5 py-2 flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeTab === 'list' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Реестр документов ({documents.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setUploadedDocResult(null);
              setActiveTab('upload');
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeTab === 'upload'
                ? 'bg-blue-900 text-white shadow-2xs'
                : 'text-blue-900 bg-blue-50 hover:bg-blue-100'
            }`}
          >
            <FileUp className="w-3.5 h-3.5" />
            <span>Загрузить полный PDF / DOCX</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingDocId(null);
              setFormError(null);
              setActiveTab('add');
            }}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeTab === 'add' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {editingDocId ? 'Редактировать карточку' : '+ Метаданные вручную'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeTab === 'import' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Пакетный импорт CSV
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {formError && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* TAB 1: LIST VIEW */}
          {activeTab === 'list' && (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 font-bold border-b border-slate-200 text-slate-700">
                  <tr>
                    <th className="p-2.5">Шифр</th>
                    <th className="p-2.5">Название</th>
                    <th className="p-2.5">Формат / Стр.</th>
                    <th className="p-2.5">Статус</th>
                    <th className="p-2.5">Права</th>
                    <th className="p-2.5 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {documents.map((d) => (
                    <tr key={d.documentId} className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {d.documentNumber}
                      </td>
                      <td className="p-2.5 max-w-xs truncate text-slate-800">{d.officialTitleRu}</td>
                      <td className="p-2.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {d.fileFormat} · {d.pageCount} стр.
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
                      <td className="p-2.5 text-[11px] text-slate-500">{d.accessRights}</td>
                      <td className="p-2.5 text-right whitespace-nowrap space-x-1">
                        <button
                          type="button"
                          onClick={() => handleEditClick(d)}
                          className="p-1 text-slate-600 hover:text-blue-900 hover:bg-slate-100 rounded"
                          title="Редактировать"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {confirmDeleteId === d.documentId ? (
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteDocument(d.documentId);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold"
                          >
                            Подтвердить
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(d.documentId)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                            title="Удалить"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: FULL PDF / DOCX UPLOAD */}
          {activeTab === 'upload' && (
            <form onSubmit={handleFullFileUpload} className="space-y-4 max-w-2xl mx-auto text-xs">
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center bg-slate-50 hover:border-blue-500 transition-colors">
                <input
                  id="std-file-upload"
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setSelectedFile(f);
                    if (f && !formData.documentNumber) {
                      const cleanName = f.name.replace(/\.(pdf|docx)$/i, '');
                      setFormData((prev) => ({
                        ...prev,
                        documentNumber: cleanName.slice(0, 80),
                        officialTitleRu: prev.officialTitleRu || cleanName,
                      }));
                    }
                  }}
                  className="hidden"
                />
                <label htmlFor="std-file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                  <FileUp className="w-8 h-8 text-blue-700" />
                  <span className="font-semibold text-slate-800">
                    {selectedFile ? selectedFile.name : 'Нажмите для выбора полного файла (PDF или DOCX)'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {selectedFile
                      ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} МБ · Готов к верификации`
                      : 'Автоматическая проверка всех страниц, последней страницы, контрольной суммы SHA-256 и OCR'}
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Официальный шифр *</label>
                  <input
                    type="text"
                    required
                    placeholder="напр., СП РК 5.03-107-2013"
                    value={formData.documentNumber || ''}
                    onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Тип документа</label>
                  <select
                    value={formData.documentType || 'SP_RK'}
                    onChange={(e) => setFormData({ ...formData, documentType: e.target.value as StandardType })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  >
                    <option value="SP_RK">СП РК</option>
                    <option value="SN_RK">СН РК</option>
                    <option value="GOST">ГОСТ</option>
                    <option value="ST_RK">СТ РК</option>
                    <option value="SNIP">СНиП</option>
                    <option value="NTD">НТД</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Полное наименование (RU) *</label>
                <input
                  type="text"
                  required
                  value={formData.officialTitleRu || ''}
                  onChange={(e) => setFormData({ ...formData, officialTitleRu: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Статус</label>
                  <select
                    value={formData.documentStatus || 'ACTIVE'}
                    onChange={(e) => setFormData({ ...formData, documentStatus: e.target.value as StandardStatus })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  >
                    <option value="ACTIVE">Действует</option>
                    <option value="REPLACED">Заменен</option>
                    <option value="CANCELLED">Отменен</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Отрасль</label>
                  <select
                    value={formData.industryCategory || 'STRUCTURES'}
                    onChange={(e) => setFormData({ ...formData, industryCategory: e.target.value as IndustryCategory })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  >
                    <option value="STRUCTURES">Несущие конструкции</option>
                    <option value="SEISMIC">Сейсмика</option>
                    <option value="FOUNDATIONS">Основания и грунты</option>
                    <option value="CLIMATE_THERMAL">Климатология</option>
                    <option value="FINISHING">Отделка / Кровля</option>
                    <option value="FIRE_SAFETY">Пожарная безопасность</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Права доступа</label>
                  <select
                    value={formData.accessRights || 'VIEW_AND_DOWNLOAD'}
                    onChange={(e) => setFormData({ ...formData, accessRights: e.target.value as AccessRights })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  >
                    <option value="VIEW_AND_DOWNLOAD">Чтение и скачивание</option>
                    <option value="VIEW_ONLY">Только чтение (без скачивания)</option>
                    <option value="OFFICIAL_LINK_ONLY">Только официальная ссылка</option>
                  </select>
                </div>
              </div>

              {isUploading && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 flex items-center gap-2.5">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
                  <span className="font-medium">{uploadStatusMsg}</span>
                </div>
              )}

              {uploadedDocResult && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-950 space-y-1">
                  <div className="flex items-center gap-2 font-bold">
                    <FileCheck2 className="w-4 h-4 text-emerald-600" />
                    <span>Документ успешно загружен и проверен ({uploadedDocResult.processingStatus})</span>
                  </div>
                  <p className="text-[11px] font-mono text-emerald-800">
                    Страниц: {uploadedDocResult.pageCount} · Последняя стр. открыта:{' '}
                    {uploadedDocResult.integrityReport?.lastPageVerified ? 'ДА' : 'НЕТ'} · SHA-256:{' '}
                    {uploadedDocResult.checksumSha256?.slice(0, 14)}...
                  </p>
                  <p className="text-[11px] text-emerald-800">
                    {uploadedDocResult.integrityReport?.notes}
                  </p>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isUploading || !selectedFile}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded bg-blue-900 hover:bg-blue-800 text-white font-semibold disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  <span>{isUploading ? 'Проверка и индексация...' : 'Загрузить и проверить полноту'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: MANUAL METADATA FORM */}
          {activeTab === 'add' && (
            <form onSubmit={handleSaveForm} className="space-y-4 max-w-2xl mx-auto text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Официальный шифр *</label>
                  <input
                    type="text"
                    required
                    value={formData.documentNumber || ''}
                    onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Тип документа</label>
                  <select
                    value={formData.documentType || 'SP_RK'}
                    onChange={(e) => setFormData({ ...formData, documentType: e.target.value as StandardType })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  >
                    <option value="SP_RK">СП РК</option>
                    <option value="SN_RK">СН РК</option>
                    <option value="GOST">ГОСТ</option>
                    <option value="ST_RK">СТ РК</option>
                    <option value="SNIP">СНиП</option>
                    <option value="NTD">НТД</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Наименование (RU) *</label>
                <input
                  type="text"
                  required
                  value={formData.officialTitleRu || ''}
                  onChange={(e) => setFormData({ ...formData, officialTitleRu: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Статус</label>
                  <select
                    value={formData.documentStatus || 'ACTIVE'}
                    onChange={(e) => setFormData({ ...formData, documentStatus: e.target.value as StandardStatus })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  >
                    <option value="ACTIVE">Действует</option>
                    <option value="REPLACED">Заменен</option>
                    <option value="CANCELLED">Отменен</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Права доступа</label>
                  <select
                    value={formData.accessRights || 'VIEW_AND_DOWNLOAD'}
                    onChange={(e) => setFormData({ ...formData, accessRights: e.target.value as AccessRights })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  >
                    <option value="VIEW_AND_DOWNLOAD">Чтение и скачивание</option>
                    <option value="VIEW_ONLY">Только чтение</option>
                    <option value="OFFICIAL_LINK_ONLY">Только ссылка на реестр</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Редакция</label>
                  <input
                    type="text"
                    value={formData.revision || ''}
                    onChange={(e) => setFormData({ ...formData, revision: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-1.5 rounded border border-slate-300 bg-white text-slate-700 font-semibold"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-blue-900 hover:bg-blue-800 text-white font-semibold flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Сохранить</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: CSV IMPORT */}
          {activeTab === 'import' && (
            <div className="space-y-4 max-w-2xl mx-auto text-xs">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-900">
                <span className="font-bold">Формат строк CSV (разделитель точка с запятой):</span>
                <p className="font-mono text-[11px] mt-1">
                  Шифр; Наименование; Тип (SP_RK/SN_RK/GOST); Статус (ACTIVE/REPLACED); Орган; Ссылка
                </p>
              </div>
              <textarea
                rows={7}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="СП РК 1.03-106-2012; Отделочные работы; SP_RK; ACTIVE; Комитет МПС РК; https://adilet.zan.kz"
                className="w-full border border-slate-300 rounded p-2.5 font-mono text-xs"
              />
              {importReport && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    Добавлено: <strong>{importReport.added}</strong> · Дубликатов пропущено:{' '}
                    <strong>{importReport.duplicates}</strong>
                  </span>
                </div>
              )}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleParseCsv}
                  className="px-4 py-2 rounded bg-blue-900 text-white font-semibold flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Импортировать</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
