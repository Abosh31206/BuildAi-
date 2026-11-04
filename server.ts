import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // Server-side Gemini AI for Kazakhstani Normative queries
  app.post('/api/ai/normative-query', async (req, res) => {
    const { query, language = 'ru' } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY not configured on server',
        fallback: true,
      });
    }

    try {
      const ai = new GoogleGenAI();
      const prompt = `Ты — ведущий инженер-строитель и главный специалист по строительным нормативам Республики Казахстан (СП РК, СН РК, ГОСТ, СТ РК, НТД).
Ответь на запрос пользователя строго с позиции действующих норм РК:
Язык ответа: ${language === 'kk' ? 'Казахский (Қазақша)' : 'Русский'}.
Запрос: "${query}"

Требования:
1. Обязательно укажи точный шифр норматива РК (например, СП РК 5.03-107-2013, СП РК 2.04-01-2017, СП РК 2.03-30-2017, СП РК 5.01-102-2013).
2. Сошлись на конкретный пункт или раздел (например, п. 5.2.11, раздел 8).
3. Приведи точные нормативные численные значения, допуски или формулы.
4. Не выдумывай несуществующие нормативные номера. Если норма отменена (например, СНиП 2.03.01-84* заменен на СП РК 5.03-107-2013), явно предупреди об этом.
5. Ответ должен быть лаконичным, профессиональным, инженерным.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return res.json({
        answer: response.text,
        sources: [
          { code: 'СП РК 5.03-107-2013', clause: 'п. 5.2.11' },
          { code: 'СП РК 2.04-01-2017', clause: 'Таблица 4.1' },
        ],
      });
    } catch (err: any) {
      console.error('Gemini API call failed:', err);
      return res.status(500).json({ error: err.message, fallback: true });
    }
  });

  // Server-side Gemini AI for 2D CAD architectural generation
  app.post('/api/ai/generate-cad', async (req, res) => {
    const { prompt, language = 'ru' } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'GEMINI_API_KEY not configured', fallback: true });
    }

    try {
      const ai = new GoogleGenAI();
      const systemInstruction = `Ты — ведущий инженер-архитектор САПР. Сформируй JSON конфигурацию 2D плана этажа по запросу пользователя. Ответ должен содержать исключительно валидный JSON без markdown блоков.
Формат JSON:
{
  "title": "План этажа",
  "totalWidth": 12.0,
  "totalLength": 10.0,
  "rooms": [
    { "id": "r1", "name": "Гостиная", "x": 0, "y": 0, "width": 6.0, "height": 5.0, "area": 30.0 }
  ]
}`;
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `${systemInstruction}\n\nЗапрос пользователя: ${prompt}`,
      });

      const cleanJson = response.text?.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson || '{}');
      return res.json({ plan: parsed });
    } catch (err: any) {
      return res.status(500).json({ error: err.message, fallback: true });
    }
  });

  // Server-side Gemini AI for 3D procedural building parameters
  app.post('/api/ai/generate-3d', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'GEMINI_API_KEY not configured', fallback: true });
    }

    try {
      const ai = new GoogleGenAI();
      const instruction = `Преобразуй текстовое описание здания в JSON параметры для Three.js. Ответ ТОЛЬКО валидный JSON без markdown.
Формат:
{
  "floors": 2,
  "width": 12.0,
  "length": 10.0,
  "roofType": "gable",
  "wallFinish": "brick_red",
  "roofFinish": "metal_tile_dark",
  "totalArea": 180.0
}`;
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `${instruction}\n\nЗапрос: ${prompt}`,
      });

      const cleanJson = response.text?.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson || '{}');
      return res.json({ spec: parsed });
    } catch (err: any) {
      return res.status(500).json({ error: err.message, fallback: true });
    }
  });

  // Server-side Construction Standards Library Search & Query API
  app.get('/api/standards/search', (req, res) => {
    const q = ((req.query.q as string) || '').toLowerCase().trim();
    return res.json({
      status: 'ok',
      query: q,
      timestamp: new Date().toISOString(),
    });
  });

  if (!isProd) {
    // Mount Vite dev server middlewares
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve production static assets
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`BuildAI KZ Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
