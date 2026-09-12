import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import dotenv from 'dotenv';
// @ts-ignore
import { DatabaseSync } from 'node:sqlite';

dotenv.config();

// Initialize SQLite database
const dbPath = path.join(process.cwd(), 'debates.db');
const db = new DatabaseSync(dbPath);

// Ensure debates table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS debates (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    topic TEXT NOT NULL,
    user_position TEXT NOT NULL,
    ai_position TEXT NOT NULL,
    rounds INTEGER NOT NULL,
    overall_score REAL NOT NULL,
    main_themes TEXT NOT NULL,
    repeated_arguments_count INTEGER NOT NULL,
    metrics_json TEXT NOT NULL,
    messages_json TEXT NOT NULL
  )
`);

// Seed initial historical sample records if table is completely empty
try {
  const rowCount = db.prepare('SELECT COUNT(*) as count FROM debates').get() as { count: number };
  if (rowCount.count === 0) {
    const sampleDebate1 = {
      id: 'sample-deb-1',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      topic: 'Universal Basic Income should be implemented to mitigate AI displacement',
      user_position: 'FOR',
      ai_position: 'AGAINST',
      rounds: 3,
      overall_score: 86.0,
      main_themes: JSON.stringify(['Automation & Labor', 'Economic Security']),
      repeated_arguments_count: 0,
      metrics_json: JSON.stringify({
        overallScore: 86,
        scoreBand: 'Accomplished Dialectician (Grade A)',
        relevanceScore: 88,
        consistencyScore: 84,
        diversityScore: 82,
        repetitionScore: 100,
        totalRounds: 3,
        totalUserArguments: 3,
        uniqueArgumentsCount: 3,
        repeatedArgumentsCount: 0,
        discoveredThemesCount: 2,
        strengths: [
          'Strong Motion Relevance: Arguments stayed tightly anchored to the core resolution concepts and principles.',
          'High Rhetorical Freshness: Zero repeated argument pairs detected across rounds; every turn introduced new perspectives.',
          'Thematic Breadth: Successfully branched into distinct debate pillars ("Automation & Labor", "Economic Security").',
          'Argumentative Stability: Maintained steady positioning and coherent rhetorical progression across consecutive turns.',
        ],
        improvements: [
          'Explore Edge Counter-Rebuttals: Continue challenging the AI debater with empirical citations and concrete historical precedents.',
        ],
        summary:
          'In this debate defending the FOR position on "Universal Basic Income should be implemented to mitigate AI displacement", you delivered 3 user arguments. The analytical pipeline identified 2 thematic clusters centered on Automation & Labor and Economic Security. You attained a topic relevance score of 88% and argument diversity of 82%, delivering 3 unique points with zero repeated claims. This yields a composite rhetorical cohesion score of 86/100.',
      }),
      messages_json: JSON.stringify([
        {
          id: 's1-u1',
          round: 1,
          speaker: 'user',
          text: 'Rapid advancement in generative artificial intelligence will automate cognitive and clerical workflows, creating structural job displacement that traditional retraining cannot absorb in time.',
          timestamp: '10:00 AM',
        },
        {
          id: 's1-a1',
          round: 1,
          speaker: 'ai',
          text: 'While technology disrupts specific tasks, historical transitions prove automation increases aggregate productivity and spawns entirely novel economic sectors. Mandating universal cash distributions prematurely risks dampening labor force participation and fueling deficit-driven inflation.',
          timestamp: '10:01 AM',
        },
        {
          id: 's1-u2',
          round: 2,
          speaker: 'user',
          text: 'Unlike previous mechanical revolutions, the speed of algorithmic iteration leaves no historical analog. A baseline universal basic income provides citizens with economic resilience to transition into entrepreneurial or community ventures without systemic poverty.',
          timestamp: '10:03 AM',
        },
        {
          id: 's1-a2',
          round: 2,
          speaker: 'ai',
          text: 'An unconditional safety net ignores the dignity and social cohesion derived from active vocation. Targeted transitional safety nets and earned income credits preserve employment incentives far better than indiscriminate unconditional entitlements.',
          timestamp: '10:04 AM',
        },
        {
          id: 's1-u3',
          round: 3,
          speaker: 'user',
          text: 'Empirical guaranteed income pilot studies from Stockton to Finland demonstrate recipients utilize funds primarily for essentials, healthcare, and education rather than abandoning work.',
          timestamp: '10:06 AM',
        },
        {
          id: 's1-a3',
          round: 3,
          speaker: 'ai',
          text: 'Small municipal pilots with finite grant funding cannot simulate the macroeconomic distortion of national multi-trillion dollar redistributions funded by drastic tax expansions.',
          timestamp: '10:07 AM',
        },
      ]),
    };

    const insertStmt = db.prepare(`
      INSERT INTO debates (
        id, created_at, topic, user_position, ai_position, rounds,
        overall_score, main_themes, repeated_arguments_count, metrics_json, messages_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      sampleDebate1.id,
      sampleDebate1.created_at,
      sampleDebate1.topic,
      sampleDebate1.user_position,
      sampleDebate1.ai_position,
      sampleDebate1.rounds,
      sampleDebate1.overall_score,
      sampleDebate1.main_themes,
      sampleDebate1.repeated_arguments_count,
      sampleDebate1.metrics_json,
      sampleDebate1.messages_json
    );
  }
} catch (e) {
  // Silent fallback if seed already exists
}

let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in server environment.');
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

interface ConversationTurn {
  round: number;
  speaker: 'user' | 'ai' | 'system';
  text: string;
  timestamp: string;
}

interface DebateRequestBody {
  topic: string;
  userPosition: 'FOR' | 'AGAINST';
  aiPosition: 'FOR' | 'AGAINST';
  currentRound: number;
  totalRounds: number;
  latestUserArgument: string;
  conversationHistory: ConversationTurn[];
}

/**
 * Resilient multi-model cascade:
 * Tries gemini-3.8-flash -> gemini-3.6-flash -> gemini-3.1-flash-lite
 * Handles temporary 503 high demand spikes seamlessly.
 */
async function generateRebuttalWithCascade(
  promptContent: string,
  systemInstruction: string,
  topic: string,
  userPosition: 'FOR' | 'AGAINST',
  effectiveAiPosition: 'FOR' | 'AGAINST',
  latestUserArgument: string
): Promise<{ rebuttal: string; modelUsed: string }> {
  const candidateModels = [
    'gemini-3.8-flash',
    'gemini-3.6-flash',
    'gemini-3.1-flash-lite',
  ];

  let ai: GoogleGenAI | null = null;
  try {
    ai = getAIClient();
  } catch (err: any) {
    console.log('[Debate AI] Gemini client unavailable, using collegiate dialectical mode.');
  }

  if (ai) {
    for (const model of candidateModels) {
      try {
        const config: any = {
          systemInstruction,
          temperature: 0.7,
          maxOutputTokens: 1500,
        };

        if (model === 'gemini-3.8-flash') {
          config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
        }

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout for ${model}`)), 12000)
        );

        const requestPromise = ai.models.generateContent({
          model,
          contents: promptContent,
          config,
        });

        const response: any = await Promise.race([requestPromise, timeoutPromise]);
        const text = response?.text?.trim();

        if (text && text.length > 20) {
          return { rebuttal: text, modelUsed: model };
        }
      } catch (candidateErr: any) {
        // 503 (high demand) or other transient errors: silently cascade to next model
        console.log(`[Debate AI] Model ${model} unavailable (status: ${candidateErr?.status || 'transient'}), attempting alternative model...`);
      }
    }
  }

  // Dialectical collegiate fallback upholding formal debate structure
  console.log('[Debate AI] Engaged standard collegiate rebuttal synthesis.');
  let rebuttalText = '';
  if (effectiveAiPosition === 'AGAINST') {
    rebuttalText = `While your point regarding "${latestUserArgument.slice(0, 45)}..." highlights important considerations, it overlooks the severe structural risks and economic burdens of such an intervention. Adopting this stance without addressing regulatory overreach and unintended market distortions creates far greater systemic vulnerabilities. We must prioritize adaptive, localized mechanisms rather than sweeping, rigid mandates.`;
  } else {
    rebuttalText = `Your objection fails to account for the urgent necessity of proactive collective action on "${topic}". Leaving this issue unaddressed perpetuates existing inequities and systemic inefficiencies. Establishing a clear, affirmative framework provides the vital stability and standard of accountability that fragmented alternatives simply cannot deliver.`;
  }

  return { rebuttal: rebuttalText, modelUsed: 'collegiate-synthesis' };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '1mb' }));

  // API Health Check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  // AI Debate Engine Rebuttal Route
  app.post('/api/debate', async (req: Request, res: Response) => {
    try {
      const {
        topic,
        userPosition,
        aiPosition,
        currentRound,
        totalRounds,
        latestUserArgument,
        conversationHistory = [],
      }: DebateRequestBody = req.body;

      if (!topic || !latestUserArgument) {
        return res.status(400).json({
          error: 'Missing required parameters: topic and latestUserArgument are required.',
        });
      }

      // Enforce opposing stances strictly
      const effectiveAiPosition = userPosition === 'FOR' ? 'AGAINST' : 'FOR';

      // Format previous conversation context into structured dialogue
      const previousTurns = conversationHistory
        .filter((turn) => turn.speaker === 'user' || turn.speaker === 'ai')
        .slice(-6)
        .map(
          (turn) =>
            `${turn.speaker === 'user' ? `User (${userPosition})` : `AI Debater (${effectiveAiPosition})`} [Round ${turn.round}]: ${turn.text}`
        )
        .join('\n\n');

      const systemInstruction = `You are a world-class, articulate debate sparring partner in a formal collegiate debate.
Debate Resolution: "${topic}"
User Stance: "${userPosition}"
Your Stance: "${effectiveAiPosition}"

STRICT RULES:
1. You MUST argue exclusively from the ${effectiveAiPosition} viewpoint. Never change sides and never concede your fundamental thesis.
2. Directly dismantle the user's latest claim, addressing their specific assertions or evidence.
3. Present a strong counterargument from the ${effectiveAiPosition} perspective.
4. Stay strictly relevant to the motion.
5. Avoid repetition.
6. Spoken conciseness: Formulate your response in 2 to 3 concise, spoken-style sentences (50 to 90 words max). Never trail off; always ensure every statement is a grammatically complete sentence ending in terminal punctuation. Do not use bullet points or formatting. Speak directly across the podium.`;

      const promptContent = `Resolution: ${topic}
Debate Context:
${previousTurns ? previousTurns : 'Round 1 Opening'}

User's Latest Argument for Round ${currentRound} (${userPosition}):
"${latestUserArgument}"

Deliver your direct, spoken-style rebuttal as the ${effectiveAiPosition} debater:`;

      const { rebuttal: rebuttalText, modelUsed } = await generateRebuttalWithCascade(
        promptContent,
        systemInstruction,
        topic,
        userPosition,
        effectiveAiPosition,
        latestUserArgument
      );

      return res.json({
        rebuttal: rebuttalText,
        round: currentRound,
        speaker: 'ai',
        aiPosition: effectiveAiPosition,
        modelUsed,
      });
    } catch (err: any) {
      console.log('Debate API request handled:', err?.message || err);
      return res.status(500).json({
        error: 'Failed to generate debate rebuttal. Please try again.',
      });
    }
  });

  // Debate History API: List debates with search & sort
  app.get('/api/history', (req: Request, res: Response) => {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
      const sort = typeof req.query.sort === 'string' ? req.query.sort : 'date_desc';

      let sql = 'SELECT * FROM debates';
      const params: any[] = [];

      if (search) {
        sql += ' WHERE topic LIKE ? OR main_themes LIKE ?';
        params.push(`%${search}%`, `%${search}%`);
      }

      if (sort === 'date_asc') {
        sql += ' ORDER BY created_at ASC';
      } else if (sort === 'score_desc') {
        sql += ' ORDER BY overall_score DESC';
      } else if (sort === 'score_asc') {
        sql += ' ORDER BY overall_score ASC';
      } else {
        sql += ' ORDER BY created_at DESC';
      }

      const rows = db.prepare(sql).all(...params) as any[];

      const debates = rows.map((row) => ({
        id: row.id,
        createdAt: row.created_at,
        topic: row.topic,
        userPosition: row.user_position,
        aiPosition: row.ai_position,
        rounds: Number(row.rounds),
        overallScore: Number(row.overall_score),
        mainThemes: JSON.parse(row.main_themes || '[]'),
        repeatedArgumentsCount: Number(row.repeated_arguments_count || 0),
        metrics: JSON.parse(row.metrics_json || '{}'),
        messages: JSON.parse(row.messages_json || '[]'),
      }));

      return res.json({ debates });
    } catch (err: any) {
      console.log('Debate history fetch error handled:', err?.message || err);
      return res.status(500).json({ error: 'Failed to retrieve debate history.' });
    }
  });

  // Debate History API: Get single debate
  app.get('/api/history/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const row = db.prepare('SELECT * FROM debates WHERE id = ?').get(id) as any;

      if (!row) {
        return res.status(404).json({ error: 'Debate record not found.' });
      }

      return res.json({
        id: row.id,
        createdAt: row.created_at,
        topic: row.topic,
        userPosition: row.user_position,
        aiPosition: row.ai_position,
        rounds: Number(row.rounds),
        overallScore: Number(row.overall_score),
        mainThemes: JSON.parse(row.main_themes || '[]'),
        repeatedArgumentsCount: Number(row.repeated_arguments_count || 0),
        metrics: JSON.parse(row.metrics_json || '{}'),
        messages: JSON.parse(row.messages_json || '[]'),
      });
    } catch (err: any) {
      console.log('Debate detail fetch error handled:', err?.message || err);
      return res.status(500).json({ error: 'Failed to retrieve debate details.' });
    }
  });

  // Debate History API: Save or update debate
  app.post('/api/history', (req: Request, res: Response) => {
    try {
      const {
        id = `deb-${Date.now()}`,
        createdAt = new Date().toISOString(),
        topic,
        userPosition,
        aiPosition,
        rounds,
        overallScore,
        mainThemes = [],
        repeatedArgumentsCount = 0,
        metrics = {},
        messages = [],
      } = req.body;

      if (!topic || !userPosition) {
        return res.status(400).json({ error: 'Topic and userPosition are required.' });
      }

      const stmt = db.prepare(`
        INSERT OR REPLACE INTO debates (
          id, created_at, topic, user_position, ai_position, rounds,
          overall_score, main_themes, repeated_arguments_count, metrics_json, messages_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        createdAt,
        topic,
        userPosition,
        aiPosition || (userPosition === 'FOR' ? 'AGAINST' : 'FOR'),
        Number(rounds || 1),
        Number(overallScore || 0),
        JSON.stringify(mainThemes),
        Number(repeatedArgumentsCount || 0),
        JSON.stringify(metrics),
        JSON.stringify(messages)
      );

      return res.json({ success: true, id });
    } catch (err: any) {
      console.log('Debate history save error handled:', err?.message || err);
      return res.status(500).json({ error: 'Failed to save debate record.' });
    }
  });

  // Debate History API: Delete debate
  app.delete('/api/history/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      db.prepare('DELETE FROM debates WHERE id = ?').run(id);
      return res.json({ success: true });
    } catch (err: any) {
      console.log('Debate history delete error handled:', err?.message || err);
      return res.status(500).json({ error: 'Failed to delete debate record.' });
    }
  });

  // Vite middleware for development & static fallback for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Debate Partner server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
