import { GoogleGenAI, createUserContent, createPartFromUri } from '@google/genai';
import fs from 'node:fs/promises';

export type Preferences = {
  audience: string;
  tone: string;
  language: string;
  detail: string;
  objective: string;
  style: string;
};

type InputFile = { path: string; name: string; mimeType: string; size: number };

const provider = () => (process.env.AGENTIC_AI_PROVIDER || 'gemini').toLowerCase();
const apiKey = () =>
  process.env.AGENTIC_AI_API_KEY ||
  process.env.OPENROUTER_API_KEY ||
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  '';
const model = () =>
  process.env.AGENTIC_AI_MODEL || (provider() === 'openrouter' ? 'google/gemini-3.8-flash' : 'gemini-3.8-flash');
const openrouterBaseUrl = () =>
  (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/+$/, '');

function parseJson(text: string) {
  const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error('The AI returned an invalid JSON response. Please try again.');
  }
}

function aiClient() {
  const key = apiKey();
  if (!key) throw new Error('Agentic AI API key is missing. Add AGENTIC_AI_API_KEY, GEMINI_API_KEY, or GOOGLE_API_KEY to .env.');
  return new GoogleGenAI({ apiKey: key });
}

async function askOpenRouter(parts: any[], system: string) {
  const key = apiKey();
  if (!key) throw new Error('OpenRouter API key is missing. Add AGENTIC_AI_API_KEY or OPENROUTER_API_KEY to .env.');
  const url = `${openrouterBaseUrl()}/chat/completions`;

  const contentItems: any[] = [];
  for (const part of parts) {
    if (!part) continue;
    if (typeof part === 'string') {
      contentItems.push({ type: 'text', text: part });
    } else if (part.text) {
      contentItems.push({ type: 'text', text: part.text });
    } else if (part.type === 'image_url' || part.image_url) {
      contentItems.push(part);
    }
  }

  const userContent =
    contentItems.length === 1 && contentItems[0].type === 'text' ? contentItems[0].text : contentItems;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
      'X-Title': 'SIH26154 Content Transformation',
    },
    body: JSON.stringify({
      model: model(),
      max_tokens: Number(process.env.AGENTIC_AI_MAX_TOKENS || 4096),
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let parsedError = errorBody;
    try {
      const errJson = JSON.parse(errorBody);
      parsedError = errJson.error?.message || errorBody;
    } catch {}
    throw new Error(`OpenRouter API error (${response.status}): ${parsedError}`);
  }

  const data: any = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  return parseJson(text);
}

async function ask(parts: any[], system: string) {
  if (provider() === 'openrouter') {
    return askOpenRouter(parts, system);
  }
  const ai = aiClient();
  const response = await ai.models.generateContent({
    model: model(),
    contents: createUserContent([{ text: system }, ...parts]),
  });
  return parseJson(response.text || '');
}

async function buildMediaPart(file: InputFile) {
  if (provider() === 'openrouter') {
    if (file.mimeType.startsWith('image/')) {
      const buffer = await fs.readFile(file.path);
      return { type: 'image_url', image_url: { url: `data:${file.mimeType};base64,${buffer.toString('base64')}` } };
    }
    if (
      file.mimeType.startsWith('text/') ||
      file.mimeType.includes('json') ||
      file.mimeType.includes('csv') ||
      file.name.endsWith('.txt') ||
      file.name.endsWith('.md')
    ) {
      const text = await fs.readFile(file.path, 'utf8');
      return { text: `UPLOADED FILE (${file.name}):\n${text}` };
    }
    const buffer = await fs.readFile(file.path);
    return { type: 'image_url', image_url: { url: `data:${file.mimeType};base64,${buffer.toString('base64')}` } };
  }

  // Gemini Files API supports documents, images, audio and video.
  const ai = aiClient();
  const uploaded = await ai.files.upload({ file: file.path, config: { mimeType: file.mimeType } });
  if (uploaded.state && String(uploaded.state) === 'PROCESSING') {
    let current = uploaded;
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      current = await ai.files.get({ name: uploaded.name });
      if (String(current.state) !== 'PROCESSING') break;
    }
    if (String(current.state) === 'FAILED') throw new Error(`Gemini could not process ${file.name}.`);
    return createPartFromUri(current.uri!, current.mimeType || file.mimeType);
  }
  return createPartFromUri(uploaded.uri!, uploaded.mimeType || file.mimeType);
}

export async function transformContent(req: {
  sourceText?: string;
  file?: InputFile;
  preferences: Preferences;
  selectedOutputs: string[];
  truthLayer?: any;
}) {
  if (!req.sourceText?.trim() && !req.file) throw new Error('Source material is required.');
  if (!req.selectedOutputs?.length) throw new Error('Select at least one output type.');

  const media = req.file ? [await buildMediaPart(req.file)] : [];
  const source = req.sourceText?.trim() ? [{ text: `SOURCE TEXT:\n${req.sourceText}` }] : [];
  const baseParts = [...media, ...source];
  const preferences = JSON.stringify(req.preferences);

  const truthLayer =
    req.truthLayer ||
    (await ask(
      baseParts,
      `You are SIH26154 Content Transformation's SOURCE ANALYST agent for SIH26154. Build a shared, source-grounded truth layer from the supplied source. Never invent facts. Preserve names, numbers, dates, quotes, relationships and uncertainty exactly. For documents, cite page/section when you can; for media cite timestamp/frame/visible region when possible; for plain text cite paragraph or a short source locator. Return JSON only:
{"facts":[{"id":"F1","text":"","evidence":""}],"entities":[{"name":"","type":""}],"events":[{"event":"","date":"","evidence":""}],"timeline":[{"date":"","event":""}],"keyTopics":[""],"uncertainties":[""]}`
    ));

  const truthContext = {
    text: `TRUTH LAYER:\n${JSON.stringify(truthLayer)}\nPREFERENCES:\n${preferences}\nREQUESTED OUTPUTS:\n${req.selectedOutputs.join(', ')}`,
  };
  const generated = await ask(
    [truthContext],
    `You are SIH26154 Content Transformation's TRANSFORMATION agent. Generate ONLY the requested artefacts from the supplied truth layer. The truth layer is authoritative. Do not invent factual details. Adapt communication to audience, tone, language, level of detail, objective and style. Keep all critical factual values consistent across outputs. Return JSON only with an "outputs" object. Supported keys:
summary = executive summary with key facts, implications and action points;
advisory = structured advisory with title, situation, impact, recommended actions and caveats;
presentation = slide-by-slide deck content, each slide containing title, bullets and speaker notes;
infographic = key messages, hierarchy, visual/layout recommendations and concise copy;
linkedin = professional LinkedIn post with hook, body, hashtags;
xthread = X/Twitter thread with numbered posts, each within a practical short-post length;
video = video package containing title, duration target, script, storyboard scenes, narration, subtitle text and visual recommendations.
Only populate requested keys.`
  );

  const verification = await ask(
    [
      {
        text: `TRUTH LAYER:\n${JSON.stringify(truthLayer)}\nGENERATED OUTPUTS:\n${JSON.stringify(generated.outputs || {})}`,
      },
      ...media,
    ],
    `You are SIH26154 Content Transformation's FACT VERIFICATION agent. Check factual claims in the generated artefacts against the shared truth layer and source. Return JSON only:
{"claims":[{"claim":"","status":"verified|unverified|contradicted","evidence":""}],"consistency":{"score":0,"issues":[]}}
A claim is verified only when the source supports it; contradicted when the source conflicts; otherwise unverified. The consistency score must be an integer 0-100 and reflect cross-output factual consistency, not writing quality.`
  );

  const redTeam = await ask(
    [
      {
        text: `TRUTH LAYER:\n${JSON.stringify(truthLayer)}\nOUTPUTS:\n${JSON.stringify(generated.outputs || {})}\nVERIFICATION:\n${JSON.stringify(verification)}`,
      },
    ],
    `You are SIH26154 Content Transformation's AI RED-TEAM reviewer. Look for unsupported claims, contradictions, changed numbers/dates/names, missing context, misleading simplification, overconfident language, and claims that cannot be traced to evidence. Return JSON only:
{"risk":"low|medium|high","issues":[{"issue":"","severity":"low|medium|high","evidence":""}],"recommendations":[""]}`
  );

  return {
    projectId: crypto.randomUUID(),
    truthLayer,
    outputs: generated.outputs || {},
    claims: verification.claims || [],
    consistency: verification.consistency || { score: 0, issues: [] },
    redTeam: redTeam || { risk: 'low', issues: [], recommendations: [] },
  };
}
