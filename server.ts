import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import {
  processNormativeQuery,
  processGenerateCad,
  processGenerate3d,
} from './server/apiHandlers.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT =
    Number(process.env.DEFAULT_APP_PORT) ||
    (process.env.PORT && process.env.PORT !== process.env.NGINX_PORT
      ? Number(process.env.PORT)
      : 3000);
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '4mb' }));

  app.post('/api/ai/normative-query', async (req, res) => {
    const result = await processNormativeQuery(req.body || {});
    return res.status(result.status).json(result.body);
  });

  app.post('/api/ai/generate-cad', async (req, res) => {
    const result = await processGenerateCad(req.body || {});
    return res.status(result.status).json(result.body);
  });

  app.post('/api/ai/generate-3d', async (req, res) => {
    const result = await processGenerate3d(req.body || {});
    return res.status(result.status).json(result.body);
  });

  app.get('/api/standards/search', (req, res) => {
    const q = ((req.query.q as string) || '').toLowerCase().trim();
    return res.json({
      status: 'ok',
      query: q,
      timestamp: new Date().toISOString(),
    });
  });

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
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
