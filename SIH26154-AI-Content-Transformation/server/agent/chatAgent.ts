import { GoogleGenAI, createUserContent } from '@google/genai';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ProjectContext {
  projectId?: string;
  title?: string;
  sourceText?: string;
  preferences?: Record<string, any>;
  truthLayer?: {
    facts?: Array<{ id?: string; text: string; evidence?: string }>;
    entities?: Array<{ name: string; type?: string }>;
    events?: Array<{ event: string; date?: string; evidence?: string }>;
    timeline?: Array<{ date: string; event: string }>;
    keyTopics?: string[];
    uncertainties?: string[];
  };
  outputs?: Record<string, any>;
  claims?: Array<{ claim: string; status: string; evidence?: string }>;
  consistency?: { score: number; issues?: any[] };
  redTeam?: { risk: string; issues?: any[]; recommendations?: string[] };
}

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

function buildSystemPrompt(context?: ProjectContext): string {
  let prompt = `You are SIH26154 Content Transformation's AI Assistant for the SIH26154 Gen AI Content Transformation Platform.
Your purpose is to help operators analyze source materials, inspect the Shared Truth Layer, evaluate generated artefacts (Executive Summary, Advisory, Presentation, Infographic, LinkedIn, X/Twitter, Video Package), review fact verification claims, understand cross-output consistency, and address general and technical inquiries.

Guidelines:
1. Always be helpful, concise, articulate, and accurate.
2. When answering questions regarding the current project, base your answers strictly on the Truth Layer and Source context provided below. Never invent unsupported facts.
3. If the user asks general knowledge or reasoning questions not tied to the project, answer them thoroughly and clearly.
4. Format responses cleanly using standard markdown (headings, bullets, bold text) for optimal readability.`;

  if (context && (context.title || context.sourceText || context.truthLayer || context.outputs)) {
    prompt += `\n\n=== CURRENT PROJECT CONTEXT ===\n`;
    if (context.title) prompt += `Project Title: ${context.title}\n`;
    if (context.preferences) prompt += `Communication Preferences: ${JSON.stringify(context.preferences)}\n`;

    if (context.sourceText) {
      const excerpt = context.sourceText.length > 2500 ? context.sourceText.slice(0, 2500) + '... [truncated]' : context.sourceText;
      prompt += `Source Excerpt:\n${excerpt}\n`;
    }

    if (context.truthLayer) {
      prompt += `Shared Truth Layer:\n`;
      if (context.truthLayer.facts?.length) {
        prompt += `- Facts (${context.truthLayer.facts.length}):\n` +
          context.truthLayer.facts.slice(0, 15).map(f => `  * ${f.text} (evidence: ${f.evidence || 'source'})`).join('\n') + '\n';
      }
      if (context.truthLayer.entities?.length) {
        prompt += `- Key Entities: ${context.truthLayer.entities.map(e => e.name).slice(0, 15).join(', ')}\n`;
      }
      if (context.truthLayer.timeline?.length) {
        prompt += `- Timeline: ${context.truthLayer.timeline.map(t => `${t.date}: ${t.event}`).slice(0, 8).join('; ')}\n`;
      }
      if (context.truthLayer.uncertainties?.length) {
        prompt += `- Uncertainties: ${context.truthLayer.uncertainties.join('; ')}\n`;
      }
    }

    if (context.outputs && Object.keys(context.outputs).length > 0) {
      prompt += `Available Generated Outputs:\n`;
      for (const [key, val] of Object.entries(context.outputs)) {
        const preview = typeof val === 'string' ? val.slice(0, 300) : JSON.stringify(val).slice(0, 300);
        prompt += `- ${key.toUpperCase()}: ${preview}...\n`;
      }
    }

    if (context.consistency) {
      prompt += `Quality & Verification:\n- Cross-Output Consistency Score: ${context.consistency.score}/100\n`;
    }
    if (context.redTeam) {
      prompt += `- AI Red-Team Risk Level: ${context.redTeam.risk}\n`;
    }
    if (context.claims?.length) {
      prompt += `- Verified Claims Count: ${context.claims.filter(c => c.status === 'verified').length} / ${context.claims.length}\n`;
    }
    prompt += `=== END PROJECT CONTEXT ===\n`;
  }

  return prompt;
}

export async function chatWithAssistant(req: {
  messages: ChatMessage[];
  projectContext?: ProjectContext;
}): Promise<{ text: string }> {
  const currentProvider = provider();
  const systemPrompt = buildSystemPrompt(req.projectContext);

  if (currentProvider === 'openrouter') {
    const key = apiKey();
    if (!key) throw new Error('OpenRouter API key is missing. Add AGENTIC_AI_API_KEY or OPENROUTER_API_KEY to .env.');
    const url = `${openrouterBaseUrl()}/chat/completions`;

    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...req.messages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    ];

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
        'X-Title': 'SIH26154 Content Transformation AI Assistant',
      },
      body: JSON.stringify({
        model: model(),
        max_tokens: Number(process.env.AGENTIC_AI_MAX_TOKENS || 1500),
        messages: apiMessages,
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
    const text = data.choices?.[0]?.message?.content || 'I could not generate a response. Please try again.';
    return { text };
  }

  // Google Gemini Fallback
  const key = apiKey();
  if (!key) throw new Error('Agentic AI API key is missing. Add AGENTIC_AI_API_KEY or GEMINI_API_KEY to .env.');
  const ai = new GoogleGenAI({ apiKey: key });

  const historyParts = req.messages.map((m) => `${m.role === 'user' ? 'USER' : 'ASSISTANT'}: ${m.content}`).join('\n\n');
  const fullContent = `${systemPrompt}\n\nCONVERSATION HISTORY:\n${historyParts}\n\nASSISTANT:`;

  const response = await ai.models.generateContent({
    model: model(),
    contents: createUserContent([{ text: fullContent }]),
  });

  return { text: response.text || 'I could not generate a response. Please try again.' };
}
