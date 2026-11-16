import React, { useState } from 'react';
import { Send, Bot, Sparkles, BookOpen, CheckCircle2, AlertTriangle, Quote, Info } from 'lucide-react';
import { KZ_NORMATIVES_REGISTRY } from '../data/kzNormativesRegistry';
import { useStandards } from '../../standards/store/StandardsContext';

interface AiSourceLink {
  code: string;
  clause: string;
  pageNumber: number;
  revision?: string;
  status?: string;
}

interface AiMessage {
  role: 'user' | 'assistant';
  text: string;
  citation?: string;
  plainExplanation?: string;
  hasVerifiedFullText?: boolean;
  sources?: AiSourceLink[];
}

interface AiNormativeAssistantProps {
  language: 'ru' | 'kk';
  onOpenDoc: (docCode: string, pageNumber?: number) => void;
}

export const AiNormativeAssistant: React.FC<AiNormativeAssistantProps> = ({ language, onOpenDoc }) => {
  const { searchFullTexts, openDocumentByCode } = useStandards();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<AiMessage[]>([
    {
      role: 'assistant',
      text:
        language === 'kk'
          ? 'Сәлеметсіз бе! Мен Қазақстанның құрылыс нормалары (ҚР ЕЖ, ҚР ҚН, МЕМСТ) бойынша инженерлік кеңесшімін. Кітапханаға жүктелген толық PDF/DOCX құжаттар мен тізілім бойынша дәл бетке сілтеме беремін.'
          : 'Здравствуйте! Я инженерный AI-консультант по нормативам РК (СП РК, СН РК, ГОСТ). Я анализирую полные тексты документов из Библиотеки нормативов, отделяю точную цитату от пояснения и открываю нужную страницу документа.',
    },
  ]);

  const quickPrompts = [
    'Защитный слой бетона для фундамента',
    'Глубина сезонного промерзания в Астане',
    'Сейсмические требования для Алматы 9 баллов',
    'Толщина растворных швов кирпичной кладки',
  ];

  const handleOpenSourcePage = (src: AiSourceLink) => {
    const openedFromLibrary = openDocumentByCode(src.code, src.pageNumber || 1);
    if (!openedFromLibrary) {
      onOpenDoc(src.code, src.pageNumber || 1);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const q = textToSend || query;
    if (!q.trim()) return;

    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    setQuery('');
    setLoading(true);

    // 1. Retrieve exact matching pages from uploaded Standards Library + Registry
    const matchedChunks = searchFullTexts(q);

    try {
      const res = await fetch('/api/ai/normative-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          language,
          matchedChunks: matchedChunks.map((m) => ({
            documentNumber: m.documentNumber,
            officialTitle: m.officialTitle,
            revision: m.revision,
            status: m.status,
            pageNumber: m.pageNumber,
            excerpt: m.excerpt,
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const fallbackSources: AiSourceLink[] = matchedChunks.slice(0, 3).map((m) => ({
          code: m.documentNumber,
          clause: `стр. ${m.pageNumber}`,
          pageNumber: m.pageNumber,
          revision: m.revision,
          status: m.status,
        }));
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: data.answer || data.plainExplanation || '',
            citation: data.citation || undefined,
            plainExplanation: data.plainExplanation || undefined,
            hasVerifiedFullText: Boolean(data.hasVerifiedFullText || matchedChunks.length > 0),
            sources:
              Array.isArray(data.sources) && data.sources.length > 0 ? data.sources : fallbackSources,
          },
        ]);
        setLoading(false);
        return;
      }
    } catch {
      // Fallback to local indexed search below
    }

    // 2. Deterministic offline/fallback search strictly grounded in available library or verified registry
    setTimeout(() => {
      if (matchedChunks.length > 0) {
        const top = matchedChunks[0];
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: `Найден релевантный фрагмент в документе ${top.documentNumber} (${top.revision}) на стр. ${top.pageNumber}.`,
            citation: top.excerpt.slice(0, 600),
            plainExplanation: `Документ имеет статус ${top.status}. Проверьте контекст на странице ${top.pageNumber} во встроенном просмотрщике.`,
            hasVerifiedFullText: true,
            sources: matchedChunks.slice(0, 3).map((m) => ({
              code: m.documentNumber,
              clause: `стр. ${m.pageNumber}`,
              pageNumber: m.pageNumber,
              revision: m.revision,
              status: m.status,
            })),
          },
        ]);
        setLoading(false);
        return;
      }

      const qLower = q.toLowerCase();
      let matchedDoc = KZ_NORMATIVES_REGISTRY[0];
      let matchedClause = matchedDoc.keyClauses[0];

      for (const d of KZ_NORMATIVES_REGISTRY) {
        const hit = d.keyClauses.find(
          (c) =>
            c.content.toLowerCase().includes(qLower) ||
            c.title.toLowerCase().includes(qLower) ||
            qLower.split(/\s+/).some((w) => w.length >= 4 && c.content.toLowerCase().includes(w))
        );
        if (hit) {
          matchedDoc = d;
          matchedClause = hit;
          break;
        }
      }

      const hasKeywordHit = qLower
        .split(/\s+/)
        .some((w) => w.length >= 4 && matchedClause.content.toLowerCase().includes(w));

      if (!hasKeywordHit) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: `По запросу «${q}» полный текст соответствующего норматива не найден среди загруженных документов библиотеки.`,
            plainExplanation:
              'Чтобы Normative AI мог процитировать точный пункт и открыть конкретную страницу, загрузите полный PDF или DOCX документа в разделе «Нормативная библиотека → Управление библиотекой».',
            hasVerifiedFullText: false,
          },
        ]);
        setLoading(false);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `Найдена запись в верифицированном реестре РК: ${matchedDoc.code} (${matchedClause.clause}).`,
          citation: matchedClause.content,
          plainExplanation: `${matchedClause.title}. ${matchedClause.notes || ''}`,
          hasVerifiedFullText: true,
          sources: [
            {
              code: matchedDoc.code,
              clause: matchedClause.clause,
              pageNumber: 1,
              status: matchedDoc.status,
            },
          ],
        },
      ]);
      setLoading(false);
    }, 300);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden flex flex-col h-[560px]">
      <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center text-white">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider">Normative AI · RAG по Библиотеке РК</h3>
            <span className="text-[10px] text-blue-300 font-mono">
              Поиск по полным текстам PDF/DOCX · Переход на точную страницу
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-300 bg-slate-800 px-2.5 py-1 rounded border border-slate-700">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Без вымышленных норм</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div
              className={`max-w-[90%] rounded-lg p-3.5 text-xs leading-relaxed space-y-2.5 ${
                m.role === 'user'
                  ? 'bg-blue-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-800 shadow-2xs'
              }`}
            >
              {m.role === 'assistant' && m.hasVerifiedFullText === false && (
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>В базе отсутствует полный загруженный текст по данному вопросу</span>
                </div>
              )}

              <div className="whitespace-pre-line font-sans">{m.text}</div>

              {m.citation && (
                <div className="bg-slate-50 border-l-4 border-blue-700 p-2.5 rounded-r space-y-1">
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-900">
                    <Quote className="w-3 h-3" />
                    <span>Точная выдержка из НТД</span>
                  </div>
                  <p className="text-[11px] text-slate-700 font-serif italic">{m.citation}</p>
                </div>
              )}

              {m.plainExplanation && (
                <div className="bg-emerald-50/50 border border-emerald-200/70 p-2.5 rounded space-y-1">
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-900">
                    <Info className="w-3 h-3" />
                    <span>Инженерное пояснение</span>
                  </div>
                  <p className="text-[11px] text-slate-700">{m.plainExplanation}</p>
                </div>
              )}

              {m.sources && m.sources.length > 0 && (
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-semibold">Открыть в просмотрщике:</span>
                  {m.sources.map((s, sIdx) => (
                    <button
                      key={sIdx}
                      type="button"
                      onClick={() => handleOpenSourcePage(s)}
                      className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded transition-colors"
                    >
                      <BookOpen className="w-3 h-3" />
                      <span>
                        {s.code} · {s.clause} (стр. {s.pageNumber || 1})
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-500 p-2">
            <Sparkles className="w-4 h-4 animate-spin text-blue-600" />
            <span>Поиск по проиндексированным страницам нормативов...</span>
          </div>
        )}
      </div>

      <div className="p-2.5 bg-white border-t border-slate-200 overflow-x-auto flex gap-1.5">
        {quickPrompts.map((qp, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSend(qp)}
            className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded whitespace-nowrap transition-colors"
          >
            {qp}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
      >
        <input
          type="text"
          placeholder={
            language === 'kk'
              ? 'Құрылыс нормалары бойынша сұрағыңызды жазыңыз...'
              : 'Спросите по СП РК, СНиП, ГОСТ (поиск по загруженным PDF/DOCX)...'
          }
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded outline-none focus:border-blue-600 focus:bg-white"
        />
        <button
          type="submit"
          disabled={!query.trim() || loading}
          className="p-2 bg-slate-900 text-white rounded hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
