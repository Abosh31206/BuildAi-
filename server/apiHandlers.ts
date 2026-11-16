import { getGeminiClient, DEFAULT_GEMINI_MODEL } from './geminiClient.js';

export interface NormativeChunkInput {
  documentNumber: string;
  officialTitle?: string;
  revision?: string;
  status?: string;
  pageNumber: number;
  excerpt: string;
}

export interface NormativeQueryResult {
  answer: string;
  citation: string;
  plainExplanation: string;
  hasVerifiedFullText: boolean;
  sources: {
    code: string;
    clause: string;
    pageNumber: number;
    revision?: string;
    status?: string;
  }[];
}

export async function processNormativeQuery(params: {
  query: string;
  language?: 'ru' | 'kk';
  matchedChunks?: NormativeChunkInput[];
}): Promise<{ status: number; body: Record<string, unknown> }> {
  const { query, language = 'ru', matchedChunks = [] } = params;
  if (!query || !query.trim()) {
    return { status: 400, body: { error: 'Query is required' } };
  }

  const ai = getGeminiClient();
  if (!ai) {
    return {
      status: 503,
      body: { error: 'GEMINI_API_KEY not configured on server', fallback: true },
    };
  }

  const chunksBlock =
    matchedChunks.length > 0
      ? matchedChunks
          .slice(0, 6)
          .map(
            (c, i) =>
              `[ФРАГМЕНТ ${i + 1}] Документ: ${c.documentNumber} (${c.revision || 'редакция не указана'}), Статус: ${
                c.status || 'ACTIVE'
              }, Страница: ${c.pageNumber}\nТекст:\n${c.excerpt}`
          )
          .join('\n\n---\n\n')
      : 'В загруженных полных текстах библиотеки прямых совпадений по данному запросу не передано.';

  const prompt = `Ты — ведущий инженер-строитель и эксперт по строительным нормативам Республики Казахстан (СП РК, СН РК, ГОСТ, СТ РК, НТД).
Язык ответа: ${language === 'kk' ? 'Казахский (Қазақша)' : 'Русский'}.
Запрос пользователя: "${query}"

Переданные фрагменты из загруженных документов библиотеки:
${chunksBlock}

Строгие правила:
1. Если переданы фрагменты, опирайся В ПЕРВУЮ ОЧЕРЕДЬ на них: укажи точный шифр документа, редакцию, пункт/раздел и точную страницу.
2. Запрещено выдумывать несуществующие номера пунктов, таблицы или страницы! Если в переданных фрагментах нет нужной информации или полный текст документа отсутствует, прямо напиши об этом в ответе (без выдумки страниц).
3. Раздели ответ строго на JSON поля:
   - "citation": дословная выдержка из норматива (или указание на отсутствие полного текста в базе, если фрагментов нет)
   - "plainExplanation": понятное инженерное объяснение для строителя/проектировщика
   - "answer": краткий связный итоговый ответ
   - "hasVerifiedFullText": boolean (true только если ответ подтвержден переданными фрагментами)
   - "sources": массив { "code": string, "clause": string, "pageNumber": number, "revision": string, "status": string }

Верни ТОЛЬКО валидный JSON без markdown.`;

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const rawText = (response.text || '{}').replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(rawText) as Partial<NormativeQueryResult>;

    return {
      status: 200,
      body: {
        answer: parsed.answer || parsed.plainExplanation || response.text || '',
        citation: parsed.citation || '',
        plainExplanation: parsed.plainExplanation || parsed.answer || '',
        hasVerifiedFullText: Boolean(parsed.hasVerifiedFullText && matchedChunks.length > 0),
        sources: Array.isArray(parsed.sources) ? parsed.sources : [],
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown Gemini API error';
    console.error('Gemini normative query failed:', err);
    return { status: 500, body: { error: message, fallback: true } };
  }
}

export async function processGenerateCad(params: {
  prompt: string;
  language?: 'ru' | 'kk';
}): Promise<{ status: number; body: Record<string, unknown> }> {
  const { prompt } = params;
  if (!prompt || !prompt.trim()) {
    return { status: 400, body: { error: 'Prompt is required' } };
  }

  const ai = getGeminiClient();
  if (!ai) {
    return { status: 503, body: { error: 'GEMINI_API_KEY not configured', fallback: true } };
  }

  try {
    const systemInstruction = `Ты — ведущий инженер-архитектор САПР. Сформируй JSON конфигурацию 2D плана этажа по запросу пользователя. Ответ должен содержать исключительно валидный JSON без markdown.
Формат JSON:
{
  "title": "План этажа (Концептуальная модель)",
  "totalWidth": 12.0,
  "totalLength": 10.0,
  "rooms": [
    { "id": "r1", "name": "Гостиная", "x": 0, "y": 0, "width": 6.0, "height": 5.0, "area": 30.0 }
  ]
}`;
    const response = await ai.models.generateContent({
      model: DEFAULT_GEMINI_MODEL,
      contents: `${systemInstruction}\n\nЗапрос пользователя: ${prompt}`,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const cleanJson = (response.text || '{}').replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    return { status: 200, body: { plan: parsed } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown Gemini API error';
    return { status: 500, body: { error: message, fallback: true } };
  }
}

export async function processGenerate3d(params: {
  prompt: string;
}): Promise<{ status: number; body: Record<string, unknown> }> {
  const { prompt } = params;
  if (!prompt || !prompt.trim()) {
    return { status: 400, body: { error: 'Prompt is required' } };
  }

  const ai = getGeminiClient();
  if (!ai) {
    return { status: 503, body: { error: 'GEMINI_API_KEY not configured', fallback: true } };
  }

  try {
    const instruction = `Преобразуй текстовое описание здания в JSON параметры для 3D редактора. Ответ ТОЛЬКО валидный JSON без markdown.
Формат:
{
  "floors": 2,
  "width": 12.0,
  "length": 10.0,
  "floorHeight": 3.0,
  "wallThickness": 0.38,
  "roofType": "gable",
  "wallFinish": "brick_red",
  "roofFinish": "metal_tile_dark",
  "windowsPerSide": 3,
  "totalArea": 180.0
}`;
    const response = await ai.models.generateContent({
      model: DEFAULT_GEMINI_MODEL,
      contents: `${instruction}\n\nЗапрос: ${prompt}`,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const cleanJson = (response.text || '{}').replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    return { status: 200, body: { spec: parsed } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown Gemini API error';
    return { status: 500, body: { error: message, fallback: true } };
  }
}
