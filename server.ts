/// <reference types="node" />
import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

interface ChatMessageInput {
  role: 'user' | 'assistant';
  content: string;
}

interface KitchenContextInput {
  locale?: 'en' | 'bn';
  outletName?: string;
  forecastMultiplier?: number;
  totalStockValueBdt?: number;
  rescuedValueBdt?: number;
  lossValueBdt?: number;
  urgentItems?: Array<{
    name: string;
    quantity: number;
    unit: string;
    hoursLeft: number;
    valueBdt: number;
  }>;
  allInventory?: Array<{
    name: string;
    category: string;
    quantity: number;
    unit: string;
    hoursLeft: number;
    minThreshold: number;
    valueBdt: number;
  }>;
  topDishes?: Array<{
    name: string;
    targetPortions: number;
    sellingPriceBdt?: number;
  }>;
  recentWasteLogs?: Array<{
    item: string;
    disposition: string;
    quantity: number;
    unit: string;
    valueBdt: number;
  }>;
}

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function buildSystemInstruction(ctx?: KitchenContextInput): string {
  const langRule =
    ctx?.locale === 'bn'
      ? 'Respond primarily in natural, clear Bengali (বাংলা) suitable for a restaurant owner in Bangladesh, using ৳ for BDT currency. You may answer in English if the user explicitly writes in English.'
      : 'Respond in clear, conversational, practical English tailored for a food business operator in Bangladesh (or in Bengali if the user writes in Bengali), using ৳ for BDT currency.';

  const urgentSummary =
    ctx?.urgentItems && ctx.urgentItems.length > 0
      ? ctx.urgentItems
          .map((i) => `${i.name} (${i.quantity} ${i.unit}, ${i.hoursLeft}h left, ৳${i.valueBdt})`)
          .join('; ')
      : 'No batches expiring within 24h.';

  const inventorySummary =
    ctx?.allInventory && ctx.allInventory.length > 0
      ? ctx.allInventory
          .map(
            (i) =>
              `${i.name} [${i.category}]: ${i.quantity} ${i.unit} (min ${i.minThreshold}, ${i.hoursLeft}h shelf life, ৳${i.valueBdt})`
          )
          .join('; ')
      : 'Not provided';

  const dishSummary =
    ctx?.topDishes && ctx.topDishes.length > 0
      ? ctx.topDishes
          .map(
            (d) =>
              `${d.name}: ${d.targetPortions} portions${
                d.sellingPriceBdt ? ` @ ৳${d.sellingPriceBdt}` : ''
              }`
          )
          .join('; ')
      : 'Not specified';

  const wasteSummary =
    ctx?.recentWasteLogs && ctx.recentWasteLogs.length > 0
      ? ctx.recentWasteLogs
          .map((w) => `${w.item} (${w.quantity} ${w.unit}, ${w.disposition}, ৳${w.valueBdt})`)
          .join('; ')
      : 'No recent logs';

  return [
    'You are KHADOK AI, an intelligent, friendly kitchen copilot for food inventory, demand forecasting, recipes, and waste rescue in Bangladesh.',
    langRule,
    'Answer any question directly and helpfully—whether it is about specific batches in the live kitchen inventory below, prep planning, pricing discounts, food safety, or general culinary/operations advice.',
    'Keep replies crisp and structured (short paragraphs or clean bullet points). Use plain readable formatting.',
    '',
    '--- LIVE KITCHEN SNAPSHOT ---',
    `Active Outlet: ${ctx?.outletName ?? 'Main Kitchen'}`,
    `Demand Multiplier: ${ctx?.forecastMultiplier ?? 1.15}x`,
    `Active Stock Value: ৳${Math.round(ctx?.totalStockValueBdt ?? 0)}`,
    `7d Rescued Value: ৳${Math.round(ctx?.rescuedValueBdt ?? 0)} | 7d Spoilage Loss: ৳${Math.round(ctx?.lossValueBdt ?? 0)}`,
    `Urgent Expiring Batches (<=24h): ${urgentSummary}`,
    `Full Inventory: ${inventorySummary}`,
    `Today Prep Targets: ${dishSummary}`,
    `Recent Waste & Rescue Ledger: ${wasteSummary}`,
  ].join('\n');
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    const hasKey = Boolean(
      process.env.GEMINI_API_KEY?.trim() &&
        process.env.GEMINI_API_KEY?.trim() !== 'MY_GEMINI_API_KEY'
    );
    res.json({ ok: true, geminiConfigured: hasKey });
  });

  app.post('/api/chat', async (req, res) => {
    const body = req.body as {
      messages?: ChatMessageInput[];
      context?: KitchenContextInput;
    };

    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content?.trim();

    if (!lastUserMessage) {
      res.status(400).json({ error: 'Please enter a message before sending.' });
      return;
    }

    const ai = createGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          body?.context?.locale === 'bn'
            ? 'GEMINI_API_KEY সেট করা নেই। Settings > Secrets প্যানেলে আপনার API কী যোগ করুন।'
            : 'GEMINI_API_KEY is not configured. Please add your key in the Settings > Secrets panel.',
      });
      return;
    }

    const contents = messages
      .filter((m) => m.content && m.content.trim().length > 0)
      .slice(-14)
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content.trim() }],
      }));

    const controller = new AbortController();
    res.on('close', () => {
      if (!res.writableFinished) {
        controller.abort(new Error('Client disconnected'));
      }
    });

    const systemInstruction = buildSystemInstruction(body?.context);

    const attempts: Array<{ model: string; thinkingLevel: ThinkingLevel; timeoutMs: number }> = [
      { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.LOW, timeoutMs: 12000 },
      { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL, timeoutMs: 12000 },
      { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.LOW, timeoutMs: 14000 },
    ];

    try {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();
      res.write(': connected\n\n');

      let lastErr: unknown = null;
      let succeeded = false;

      for (let i = 0; i < attempts.length; i++) {
        if (controller.signal.aborted) break;
        const attempt = attempts[i];
        const attemptSignal = AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(attempt.timeoutMs),
        ]);

        let wroteChunk = false;
        try {
          const stream = await ai.models.generateContentStream({
            model: attempt.model,
            contents,
            config: {
              systemInstruction,
              thinkingConfig: { thinkingLevel: attempt.thinkingLevel },
              abortSignal: attemptSignal,
            },
          });

          for await (const chunk of stream) {
            const text = chunk.text;
            if (text) {
              wroteChunk = true;
              res.write(`data: ${JSON.stringify({ text })}\n\n`);
            }
          }

          if (wroteChunk) {
            succeeded = true;
            break;
          }
          lastErr = new Error('Empty response received from model.');
        } catch (err) {
          lastErr = err;
          if (controller.signal.aborted || wroteChunk) {
            throw err;
          }
          const errMsg = err instanceof Error ? err.message : String(err);
          const isTransient =
            errMsg.includes('503') ||
            errMsg.includes('UNAVAILABLE') ||
            errMsg.includes('429') ||
            errMsg.includes('RESOURCE_EXHAUSTED') ||
            errMsg.includes('TimeoutError') ||
            errMsg.includes('aborted');

          if (!isTransient) {
            throw err;
          }

          if (i < attempts.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 600 * (i + 1)));
          }
        }
      }

      if (!succeeded) {
        throw lastErr ?? new Error('Unable to generate response right now.');
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (err) {
      const rawMsg =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
          ? err
          : 'Failed to generate response.';
      const reasonMsg =
        controller.signal.reason instanceof Error
          ? controller.signal.reason.message
          : rawMsg;

      let userMessage = reasonMsg;
      if (reasonMsg.includes('503') || reasonMsg.includes('UNAVAILABLE')) {
        userMessage =
          body?.context?.locale === 'bn'
            ? 'AI সেবাটিতে এখন সাময়িকভাবে অতিরিক্ত চাপ রয়েছে। কয়েক সেকেন্ড পর আবার চেষ্টা করুন।'
            : 'The AI service is temporarily experiencing high demand. Please try again in a few seconds.';
      } else if (reasonMsg.includes('429') || reasonMsg.includes('RESOURCE_EXHAUSTED')) {
        userMessage =
          body?.context?.locale === 'bn'
            ? 'অনুরোধের সীমা পূর্ণ হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।'
            : 'Rate limit reached. Please wait a moment and try again.';
      } else if (reasonMsg.includes('403') || reasonMsg.includes('PERMISSION_DENIED') || reasonMsg.includes('400') || reasonMsg.includes('API_KEY_INVALID')) {
        userMessage =
          body?.context?.locale === 'bn'
            ? 'API কী যাচাইয়ে সমস্যা হয়েছে। Settings > Secrets প্যানেল পরীক্ষা করুন।'
            : 'API key error. Please check your Gemini API key in Settings > Secrets.';
      }

      if (!res.headersSent) {
        res.status(503).json({ error: userMessage });
      } else if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ error: userMessage })}\n\n`);
        res.end();
      }
    }
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KHADOK server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
