import express, { Request, Response } from 'express';
import multer from 'multer';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { transformContent } from './server/agent/contentAgent';
import { chatWithAssistant } from './server/agent/chatAgent';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(process.cwd(), '.tmp-uploads');
const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 },
});

await fs.mkdir(uploadDir, { recursive: true });
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(process.cwd(), 'public')));

app.get('/api/health', (_req, res) => {
  const provider = (process.env.AGENTIC_AI_PROVIDER || 'gemini').toLowerCase();
  const aiConfigured = Boolean(
    process.env.AGENTIC_AI_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY
  );
  res.json({ ok: true, service: 'SIH26154 Content Transformation SIH26154', provider, aiConfigured });
});

app.post('/api/content/transform', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  let tempPath: string | undefined;
  try {
    const preferences = typeof req.body.preferences === 'string' ? JSON.parse(req.body.preferences || '{}') : (req.body.preferences || {});
    const selectedOutputs = typeof req.body.selectedOutputs === 'string' ? JSON.parse(req.body.selectedOutputs || '[]') : (req.body.selectedOutputs || []);
    const truthLayer = typeof req.body.truthLayer === 'string' ? JSON.parse(req.body.truthLayer) : req.body.truthLayer;
    const sourceText = req.body.sourceText || '';
    if (!sourceText.trim() && !req.file) {
      res.status(400).json({ error: 'Provide source text or a source file.' });
      return;
    }
    tempPath = req.file?.path;
    const result = await transformContent({
      sourceText,
      preferences,
      selectedOutputs,
      truthLayer,
      file: req.file ? { path: req.file.path, name: req.file.originalname, mimeType: req.file.mimetype, size: req.file.size } : undefined,
    });
    res.json(result);
  } catch (error: any) {
    console.error('[SIH26154 Content Transformation] Transformation failed:', error);
    res.status(500).json({ error: error?.message || 'Content transformation failed.' });
  } finally {
    if (tempPath) {
      await fs.unlink(tempPath).catch(() => undefined);
    }
  }
});

app.post('/api/chat', async (req: Request, res: Response): Promise<void> => {
  try {
    const { messages, projectContext } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Please provide at least one message.' });
      return;
    }
    const response = await chatWithAssistant({ messages, projectContext });
    res.json(response);
  } catch (error: any) {
    console.error('[SIH26154 Content Transformation] Chat failed:', error);
    res.status(500).json({ error: error?.message || 'AI Chat response failed.' });
  }
});

const distPath = path.join(__dirname, 'dist');
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
} else {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[SIH26154 Content Transformation] SIH26154 server listening on http://localhost:${PORT}`);
});
