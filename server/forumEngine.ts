/**
 * Forum Engine — DeepSeek LLM-powered agent discussions
 * 
 * Every cycle (default 2 hours), one agent writes a new post OR replies to an existing one.
 * Uses DeepSeek chat completions with each agent's unique persona to generate
 * natural, in-character forum content grounded in live market data and recent signals.
 */

import OpenAI from "openai";
import type { IStorage } from "./storage";
import { getCurrentPrices } from "./prices";

// ── Config ──────────────────────────────────────────────────────────────
const POST_INTERVAL_MS = 2 * 60 * 60 * 1000; // 2 hours between forum actions
const INITIAL_DELAY_MS = 60 * 1000; // 1 minute after startup
const REPLY_PROBABILITY = 0.45; // 45% chance to reply instead of new post
const MAX_RETRIES = 2;

// DeepSeek via OpenAI-compatible API
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "sk-af8fc2d824cc48a79dee836d13ab28ed";

let engineStatus: "idle" | "running" | "error" | "disabled" = "idle";
let lastRunAt: string | null = null;
let lastAgentId: string | null = null;
let lastAction: string | null = null;
let errorMessage: string | null = null;
let totalPostsGenerated = 0;
let totalRepliesGenerated = 0;

export function getForumEngineStatus() {
  return {
    status: engineStatus,
    lastRunAt,
    lastAgentId,
    lastAction,
    errorMessage,
    totalPostsGenerated,
    totalRepliesGenerated,
  };
}

// ── Agent persona definitions ───────────────────────────────────────────

interface AgentPersona {
  agentId: string;
  name: string;
  emoji: string;
  style: string; // prompt-friendly personality description
  topics: string[]; // preferred discussion topics
  tier: "hf" | "meme";
}

const AGENT_PERSONAS: AgentPersona[] = [
  // HF Persona agents
  { agentId: "warren_buffett", name: "Warren Buffett", emoji: "🏛️", tier: "hf",
    style: "Speaks in calm, folksy wisdom. Uses metaphors from everyday life. Long-term value focus. Often quotes himself or Charlie Munger. Dislikes speculation and leverage.",
    topics: ["value investing", "moats", "intrinsic value", "market fear/greed", "compounding"] },
  { agentId: "charlie_munger", name: "Charlie Munger", emoji: "📚", tier: "hf",
    style: "Blunt, sardonic wit. Multi-disciplinary thinker. Loves mental models. Says 'invert, always invert'. Dismissive of stupidity and speculation.",
    topics: ["mental models", "quality businesses", "avoiding stupidity", "patience", "worldly wisdom"] },
  { agentId: "ben_graham", name: "Ben Graham", emoji: "📐", tier: "hf",
    style: "Academic, measured, precise. Father of value investing. Uses 'margin of safety' frequently. Distinguishes investing from speculation rigorously.",
    topics: ["margin of safety", "net-net stocks", "Mr. Market metaphor", "deep value", "bond-like analysis"] },
  { agentId: "peter_lynch", name: "Peter Lynch", emoji: "🔍", tier: "hf",
    style: "Enthusiastic, practical, anecdotal. Loves finding ideas in malls and everyday life. Uses 'ten-bagger' often. Accessible and relatable.",
    topics: ["buy what you know", "ten-baggers", "growth at reasonable price", "small caps", "everyday research"] },
  { agentId: "cathie_wood", name: "Cathie Wood", emoji: "🚀", tier: "hf",
    style: "Visionary, passionate about disruptive innovation. Extremely bullish on tech/crypto convergence. Uses 5-year horizons. 'Conviction over consensus' mentality.",
    topics: ["disruptive innovation", "AI convergence", "Bitcoin long-term", "exponential growth", "future platforms"] },
  { agentId: "stanley_druckenmiller", name: "Stanley Druckenmiller", emoji: "🌊", tier: "hf",
    style: "Macro-focused, decisive, bold. Talks about sizing positions and riding trends. Respects both bulls and bears. Pragmatic about timing.",
    topics: ["macro trends", "central bank liquidity", "position sizing", "USD trends", "regime changes"] },
  { agentId: "michael_burry", name: "Michael Burry", emoji: "🔮", tier: "hf",
    style: "Contrarian, cryptic, ominous. References The Big Short. Posts like warnings. Uses data forensically. Often deleted tweets in real life.",
    topics: ["bubbles", "overvaluation", "short selling", "market warnings", "forensic accounting"] },
  { agentId: "bill_ackman", name: "Bill Ackman", emoji: "⚔️", tier: "hf",
    style: "Activist, confrontational, articulate. Takes strong positions publicly. Loves restructuring plays. Occasionally verbose but compelling.",
    topics: ["activism", "corporate governance", "concentrated bets", "restructuring", "public campaigns"] },
  { agentId: "aswath_damodaran", name: "Aswath Damodaran", emoji: "📊", tier: "hf",
    style: "Professorial, data-driven, balanced. 'The Dean of Valuation'. Teaches through examples. Fair and rigorous. Corrects others politely with numbers.",
    topics: ["DCF valuation", "equity risk premiums", "narrative vs numbers", "fair value", "market pricing"] },
  { agentId: "rakesh_jhunjhunwala", name: "Rakesh Jhunjhunwala", emoji: "🐘", tier: "hf",
    style: "Energetic, bullish on growth economies. India's Big Bull. Speaks with conviction and passion. Loves secular growth stories.",
    topics: ["emerging markets", "India growth", "secular trends", "bold bets", "market cycles"] },
  { agentId: "mohnish_pabrai", name: "Mohnish Pabrai", emoji: "🎲", tier: "hf",
    style: "Calm, philosophical. 'Heads I win, tails I don't lose much.' Few bets, big bets. Clones ideas from great investors. Very analytical but accessible.",
    topics: ["Dhandho framework", "cloning", "asymmetric bets", "capital allocation", "compounders"] },
  // Specialist agents
  { agentId: "fundamentals_analyst", name: "Fundamentals Analyst", emoji: "📈", tier: "hf",
    style: "Numbers-driven, methodical. Cites specific metrics: P/E, EPS growth, ROE, debt ratios. Professional tone, like a research analyst note.",
    topics: ["earnings analysis", "profitability metrics", "financial health", "sector comparison"] },
  { agentId: "technical_analyst", name: "Technical Analyst", emoji: "📉", tier: "hf",
    style: "Chart-focused, uses precise technical language. RSI, MACD, support/resistance, volume. Sets price targets and stop losses. Confident in pattern recognition.",
    topics: ["chart patterns", "support/resistance", "momentum", "breakouts", "volume analysis"] },
  { agentId: "sentiment_analyst", name: "Sentiment Analyst", emoji: "🧠", tier: "hf",
    style: "Reads the crowd. Cites fear/greed indices, social media trends, insider activity. Contrarian when sentiment is extreme.",
    topics: ["crowd psychology", "fear/greed", "insider trading", "social sentiment", "contrarian signals"] },
  { agentId: "risk_manager", name: "Risk Manager", emoji: "🛡️", tier: "hf",
    style: "Cautious, systematic. Always talks about downside first. Position sizing, correlations, drawdowns. Voice of reason. 'What could go wrong?'",
    topics: ["risk management", "position sizing", "correlation", "drawdown", "tail risk"] },
  // Meme agents
  { agentId: "bull", name: "Bull Run Barry", emoji: "🐂", tier: "meme",
    style: "HYPED. All caps sometimes. Buys every dip. Never sells. Uses rocket and chart emojis. Meme trader energy. 'WAGMI' mentality.",
    topics: ["buying dips", "bull runs", "diamond hands", "stacking sats", "momentum"] },
  { agentId: "bear", name: "Bear Market Betty", emoji: "🐻", tier: "meme",
    style: "Cautious, a bit smug when market drops. 'I told you so' energy. Cash is a position. Uses bear emoji. Warns about overexposure.",
    topics: ["market crashes", "risk warning", "cash positions", "shorting", "bearish signals"] },
  { agentId: "moon", name: "Moon Boy Mike", emoji: "🚀", tier: "meme",
    style: "EXTREME FOMO. Everything is '100x incoming'. Lots of emojis and rockets. Types in meme slang: ser, wen, gm. Never takes profits.",
    topics: ["moonshots", "100x calls", "FOMO plays", "meme coins", "parabolic moves"] },
  { agentId: "degen", name: "Degen Dave", emoji: "🎰", tier: "meme",
    style: "Full YOLO energy. Portfolio is one position. 'This is financial advice (not financial advice)'. Gambling terminology. Loves leverage and meme coins.",
    topics: ["YOLO trades", "leverage", "meme coins", "rug pulls", "degenerate strategies"] },
  { agentId: "zen", name: "Zen Master Zara", emoji: "🧘", tier: "meme",
    style: "Calm, philosophical, balanced. DCA advocate. Speaks in zen-like wisdom. Advises patience and diversification. Counterbalances the chaos.",
    topics: ["DCA", "balance", "long-term perspective", "mindfulness in trading", "diversification"] },
];

// ── Core engine ─────────────────────────────────────────────────────────

let client: OpenAI | null = null;

function getClient(): OpenAI | null {
  if (!DEEPSEEK_API_KEY) return null;
  if (!client) {
    client = new OpenAI({
      baseURL: "https://api.deepseek.com",
      apiKey: DEEPSEEK_API_KEY,
    });
  }
  return client;
}

function pickRandomAgent(): AgentPersona {
  // Weighted: HF agents get 70% chance, meme agents 30%
  const hfAgents = AGENT_PERSONAS.filter(a => a.tier === "hf");
  const memeAgents = AGENT_PERSONAS.filter(a => a.tier === "meme");
  const useHf = Math.random() < 0.7;
  const pool = useHf ? hfAgents : memeAgents;
  return pool[Math.floor(Math.random() * pool.length)];
}

function buildMarketContext(prices: any[]): string {
  if (!prices || prices.length === 0) return "Market data unavailable.";
  const top6 = prices.slice(0, 6);
  return top6.map((p: any) => {
    const change = p.change24h !== undefined ? ` (${p.change24h > 0 ? "+" : ""}${p.change24h.toFixed(2)}%)` : "";
    return `${p.pair}: $${p.price?.toLocaleString() || "?"}${change}`;
  }).join(" | ");
}

async function generatePost(
  agent: AgentPersona,
  storage: IStorage,
  marketContext: string,
  recentSignals: string,
): Promise<{ title: string; content: string; category: string; ticker: string | null } | null> {
  const ai = getClient();
  if (!ai) return null;

  const categories = ["analysis", "alpha", "debate", "general", "meme"];
  const suggestedCategory = agent.tier === "meme" ? "meme" : categories[Math.floor(Math.random() * 4)];

  const systemPrompt = `You are ${agent.name} ${agent.emoji}, an AI agent on AlphaArena — a competitive trading signal arena.
You are writing a forum post in-character. Your style: ${agent.style}

RULES:
- Write 2-4 sentences for the post body. Keep it punchy and opinionated.
- Title should be catchy, max 80 chars. Can include 1 emoji.
- Stay in character. ${agent.tier === "meme" ? "Use meme/crypto slang freely." : "Be articulate but accessible."}
- Reference specific tickers or market conditions when relevant.
- If you mention a ticker, it must be from: BTC, ETH, SOL, AAPL, NVDA, TSLA, DOGE, XRP, AVAX, LINK
- Category should be one of: analysis, alpha, debate, general, meme
- Be opinionated. Take a stance. Engage the community.

Respond ONLY with valid JSON:
{"title": "...", "content": "...", "category": "${suggestedCategory}", "ticker": "BTC" or null}`;

  const userPrompt = `Current market: ${marketContext}

Recent signals from agents: ${recentSignals || "None available"}

Write a new forum post as ${agent.name}. Topic inspiration: ${agent.topics[Math.floor(Math.random() * agent.topics.length)]}`;

  try {
    const resp = await ai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.9,
      max_tokens: 400,
    });

    const raw = resp.choices[0]?.message?.content?.trim();
    if (!raw) return null;

    // Parse JSON — handle markdown code fences
    const jsonStr = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(jsonStr);

    return {
      title: String(parsed.title || "").slice(0, 200),
      content: String(parsed.content || "").slice(0, 1000),
      category: categories.includes(parsed.category) ? parsed.category : suggestedCategory,
      ticker: parsed.ticker && typeof parsed.ticker === "string" ? parsed.ticker.toUpperCase() : null,
    };
  } catch (e) {
    console.error(`[ForumEngine] Post generation failed for ${agent.name}:`, (e as Error).message);
    return null;
  }
}

async function generateReply(
  agent: AgentPersona,
  post: { title: string; content: string; authorAgentId: string },
  marketContext: string,
): Promise<string | null> {
  const ai = getClient();
  if (!ai) return null;

  // Find original author persona
  const originalAuthor = AGENT_PERSONAS.find(a => a.agentId === post.authorAgentId);
  const authorName = originalAuthor?.name || "another agent";

  const systemPrompt = `You are ${agent.name} ${agent.emoji}, an AI agent on AlphaArena.
Your style: ${agent.style}

You are replying to a forum post by ${authorName}.

RULES:
- Write 1-3 sentences. Be concise.
- You can agree, disagree, add nuance, or roast (if meme agent).
- Stay in character. ${agent.tier === "meme" ? "Meme slang OK." : "Keep it professional but engaging."}
- Reference specific market data if relevant.
- Do NOT repeat what the original post says.

Respond with ONLY the reply text (no JSON, no quotes, no prefix).`;

  const userPrompt = `Original post by ${authorName}: "${post.title}"
"${post.content}"

Current market: ${marketContext}

Write your reply as ${agent.name}:`;

  try {
    const resp = await ai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.9,
      max_tokens: 250,
    });

    const raw = resp.choices[0]?.message?.content?.trim();
    if (!raw || raw.length < 10) return null;
    return raw.slice(0, 800);
  } catch (e) {
    console.error(`[ForumEngine] Reply generation failed for ${agent.name}:`, (e as Error).message);
    return null;
  }
}

// ── Main cycle ──────────────────────────────────────────────────────────

async function runForumCycle(storage: IStorage): Promise<void> {
  engineStatus = "running";

  try {
    // Gather context
    const { prices } = getCurrentPrices();
    const marketContext = buildMarketContext(prices || []);

    // Get recent signals for context
    let recentSignals = "";
    try {
      const allHfAgents = await storage.getHedgeFundAgents();
      const sigSamples: string[] = [];
      for (const hf of allHfAgents.slice(0, 5)) {
        const sigs = await storage.getSignalsByAgent(hf.agentId, 2);
        for (const s of sigs) {
          sigSamples.push(`${hf.name}: ${s.signal} ${s.ticker} (${s.confidence}%)`);
        }
      }
      recentSignals = sigSamples.slice(0, 8).join("; ");
    } catch { /* noncritical */ }

    // Pick a random agent (avoid repeating the same one)
    let agent = pickRandomAgent();
    let attempts = 0;
    while (agent.agentId === lastAgentId && attempts < 3) {
      agent = pickRandomAgent();
      attempts++;
    }

    // Find this agent's NPC user
    const allUsers = await storage.getAllUsers();
    const npcUser = allUsers.find(u => u.selectedAgentType === agent.agentId);
    if (!npcUser) {
      console.warn(`[ForumEngine] No NPC user found for ${agent.agentId}, skipping`);
      engineStatus = "idle";
      return;
    }

    // Decide: new post or reply?
    const existingPosts = await storage.getForumPosts(undefined, 20);
    const shouldReply = existingPosts.length > 0 && Math.random() < REPLY_PROBABILITY;

    if (shouldReply) {
      // Pick a recent post to reply to (not authored by same agent)
      const eligiblePosts = existingPosts.filter(p => p.authorAgentId !== agent.agentId);
      if (eligiblePosts.length === 0) {
        engineStatus = "idle";
        return;
      }
      // Weighted towards newer posts
      const postIdx = Math.floor(Math.random() * Math.min(eligiblePosts.length, 8));
      const targetPost = eligiblePosts[postIdx];

      const replyContent = await generateReply(agent, targetPost, marketContext);
      if (!replyContent) {
        engineStatus = "idle";
        return;
      }

      await storage.createForumReply({
        postId: targetPost.id,
        authorUserId: npcUser.id,
        authorAgentId: agent.agentId,
        authorType: "internal",
        content: replyContent,
        likes: 0,
        createdAt: new Date().toISOString(),
      });

      totalRepliesGenerated++;
      lastAction = `replied to "${targetPost.title.slice(0, 40)}..."`;
      console.log(`[ForumEngine] ${agent.name} replied to post #${targetPost.id}: "${targetPost.title.slice(0, 40)}..."`);

    } else {
      // Generate new post
      const postData = await generatePost(agent, storage, marketContext, recentSignals);
      if (!postData) {
        engineStatus = "idle";
        return;
      }

      await storage.createForumPost({
        authorUserId: npcUser.id,
        authorAgentId: agent.agentId,
        authorType: "internal",
        title: postData.title,
        content: postData.content,
        category: postData.category,
        ticker: postData.ticker,
        likes: 0,
        replyCount: 0,
        isPinned: false,
        createdAt: new Date().toISOString(),
      });

      totalPostsGenerated++;
      lastAction = `posted "${postData.title.slice(0, 50)}..."`;
      console.log(`[ForumEngine] ${agent.name} posted: "${postData.title}"`);
    }

    lastAgentId = agent.agentId;
    lastRunAt = new Date().toISOString();
    engineStatus = "idle";
    errorMessage = null;

  } catch (e) {
    engineStatus = "error";
    errorMessage = (e as Error).message;
    console.error("[ForumEngine] Cycle error:", e);
  }
}

// ── Public API ──────────────────────────────────────────────────────────

let forumInterval: ReturnType<typeof setInterval> | null = null;

export function startForumEngine(storage: IStorage): void {
  if (!DEEPSEEK_API_KEY) {
    console.log("[ForumEngine] No DEEPSEEK_API_KEY set — forum engine disabled");
    engineStatus = "disabled";
    return;
  }

  console.log(`[ForumEngine] Starting — posts every ${POST_INTERVAL_MS / 60000} minutes`);

  // Initial run after delay
  setTimeout(async () => {
    await runForumCycle(storage);

    // Then run on interval
    forumInterval = setInterval(() => {
      runForumCycle(storage).catch(e => {
        console.error("[ForumEngine] Interval error:", e);
      });
    }, POST_INTERVAL_MS);
  }, INITIAL_DELAY_MS);
}

export function stopForumEngine(): void {
  if (forumInterval) {
    clearInterval(forumInterval);
    forumInterval = null;
  }
  engineStatus = "idle";
  console.log("[ForumEngine] Stopped");
}

/** Trigger a forum post/reply immediately (for testing/admin) */
export async function triggerForumPost(storage: IStorage): Promise<void> {
  await runForumCycle(storage);
}
