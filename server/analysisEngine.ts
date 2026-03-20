/**
 * Analysis Engine — Anthropic Financial Plugins Integration
 * 
 * Three layers:
 * 1. MCP Data Layer: Fetches real market data from free-tier MCP endpoints
 * 2. LLM Reasoning Layer: DeepSeek-powered institutional-grade signal generation
 * 3. Analysis Tools: /screen, /thesis, /comps for user-facing research
 * 
 * Adapted from: https://github.com/anthropics/financial-services-plugins
 */

import OpenAI from "openai";
import type { IStorage } from "./storage";
import { getCurrentPrices } from "./prices";
import {
  fetchTickerDeepDive, fetchMarketSnapshot, fetchFearGreed,
  fetchGlobalCryptoData, fetchCoinDetails, fetchSecFilings,
  fetchCryptoNews, type TickerDeepDive, type MarketSnapshot,
} from "./marketDataService";

// ── Config ──────────────────────────────────────────────────────────────
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "sk-af8fc2d824cc48a79dee836d13ab28ed";
const SIGNAL_CYCLE_MS = 30 * 60 * 1000; // 30 min between LLM signal cycles
const INITIAL_DELAY_MS = 30 * 1000; // 30 seconds after startup
const MAX_RETRIES = 2;

let engineStatus: "idle" | "running" | "error" | "disabled" = "idle";
let lastCycleAt: string | null = null;
let cycleCount = 0;
let signalsGenerated = 0;
let errorMessage: string | null = null;

export function getAnalysisEngineStatus() {
  return { status: engineStatus, lastCycleAt, cycleCount, signalsGenerated, errorMessage };
}

// ── MCP Data Layer ──────────────────────────────────────────────────────
// Fetches live market context for agent reasoning
// Uses free public APIs as MCP-compatible data sources

interface MarketContext {
  ticker: string;
  price: number;
  change24h: number;
  change7d: number;
  change30d: number;
  marketCap: number;
  volume24h: number;
  ath: number;
  percentFromAth: number;
  circulatingSupply: number;
  maxSupply: number | null;
  sparkline7d: number[];
  // Enriched data from public APIs
  fearGreedIndex?: number;
  fearGreedLabel?: string;
  btcDominance?: number;
  globalMcap?: number;
  trendingNews?: string[];
  secFilings?: string[];
  technicalSummary?: string;
  fundamentalSummary?: string;
}

async function fetchMarketContext(ticker: string): Promise<MarketContext> {
  // Fetch deep dive from aggregated public APIs (CoinGecko + Coinpaprika + Fear&Greed + SEC EDGAR + News)
  const deepDive = await fetchTickerDeepDive(ticker);

  const ctx: MarketContext = {
    ticker,
    price: deepDive.price,
    change24h: deepDive.change24h,
    change7d: deepDive.change7d,
    change30d: deepDive.change30d,
    marketCap: deepDive.marketCap,
    volume24h: deepDive.volume24h,
    ath: deepDive.ath,
    percentFromAth: deepDive.percentFromAth,
    circulatingSupply: deepDive.circulatingSupply,
    maxSupply: deepDive.maxSupply,
    sparkline7d: deepDive.sparkline7d,
  };

  // Fear & Greed
  if (deepDive.fearGreed) {
    ctx.fearGreedIndex = deepDive.fearGreed.value;
    ctx.fearGreedLabel = deepDive.fearGreed.classification;
  }

  // Global market
  ctx.btcDominance = deepDive.btcDominance || undefined;
  ctx.globalMcap = deepDive.globalMcap || undefined;

  // News headlines
  ctx.trendingNews = deepDive.news.slice(0, 5).map(n => n.title);

  // SEC filings (equity)
  if (deepDive.secFilings.length > 0) {
    ctx.secFilings = deepDive.secFilings.map(f => `${f.form} (${f.filedDate}): ${f.company}`);
  }

  // Technical summary with richer data
  const direction = ctx.change24h >= 0 ? "upward" : "downward";
  const fmtPrice = ctx.price < 1 ? ctx.price.toFixed(4) : ctx.price.toLocaleString();
  const fmtMcap = ctx.marketCap > 1e9 ? `$${(ctx.marketCap / 1e9).toFixed(1)}B` : `$${(ctx.marketCap / 1e6).toFixed(0)}M`;
  const fmtVol = ctx.volume24h > 1e9 ? `$${(ctx.volume24h / 1e9).toFixed(1)}B` : `$${(ctx.volume24h / 1e6).toFixed(0)}M`;
  const athPct = Math.abs(ctx.percentFromAth).toFixed(1);
  ctx.technicalSummary = `${ticker} at $${fmtPrice} (${Math.abs(ctx.change24h).toFixed(2)}% ${direction} 24h, ${ctx.change7d >= 0 ? "+" : ""}${ctx.change7d.toFixed(1)}% 7d, ${ctx.change30d >= 0 ? "+" : ""}${ctx.change30d.toFixed(1)}% 30d). MCap: ${fmtMcap}, Vol: ${fmtVol}. ${athPct}% from ATH ($${ctx.ath < 1 ? ctx.ath.toFixed(4) : ctx.ath.toLocaleString()}).`;

  // Fundamental summary
  const supplyPct = ctx.maxSupply ? ((ctx.circulatingSupply / ctx.maxSupply) * 100).toFixed(1) : "N/A";
  ctx.fundamentalSummary = `Circulating supply: ${(ctx.circulatingSupply / 1e6).toFixed(1)}M${ctx.maxSupply ? ` / ${(ctx.maxSupply / 1e6).toFixed(1)}M (${supplyPct}% minted)` : ""}. Market dominance context: BTC ${ctx.btcDominance?.toFixed(1) || "?"}%.`;

  // Fallback to price engine if deep dive returned 0 price
  if (ctx.price === 0) {
    const { prices } = getCurrentPrices();
    const pair = `${ticker}/USD`;
    const priceData = (prices || []).find((p: any) => p.pair === pair);
    if (priceData) {
      ctx.price = priceData.price;
      ctx.change24h = priceData.change24h;
    }
  }

  return ctx;
}

// ── Agent Reasoning Profiles (from Anthropic Financial Plugins) ─────────
// Each profile combines the agent's persona with institutional-grade analysis prompts

interface AgentProfile {
  agentId: string;
  name: string;
  role: string; // Based on Anthropic's plugin categories
  systemPrompt: string;
  analysisFramework: string; // Specific methodology
  riskProfile: "conservative" | "moderate" | "aggressive";
}

const AGENT_PROFILES: AgentProfile[] = [
  // === PERSONA AGENTS (Value / Growth / Macro) ===
  {
    agentId: "warren_buffett",
    name: "Warren Buffett",
    role: "Value Investor — Equity Research",
    riskProfile: "conservative",
    systemPrompt: `You are Warren Buffett, the legendary value investor. You analyze investments through the lens of intrinsic value, competitive moats, and long-term compounding.`,
    analysisFramework: `Apply value investing principles:
1. MOAT ANALYSIS: Does this asset have a durable competitive advantage?
2. MARGIN OF SAFETY: Is price significantly below intrinsic value?
3. MANAGEMENT QUALITY: Is the team honest, capable, and owner-oriented?
4. FINANCIAL STRENGTH: Strong balance sheet, consistent free cash flow?
5. VALUATION: P/E, P/B, FCF yield vs. historical and peers
6. CIRCLE OF COMPETENCE: Do I understand this business deeply?
Be patient. "Be fearful when others are greedy, greedy when others are fearful."`
  },
  {
    agentId: "cathie_wood",
    name: "Cathie Wood",
    role: "Innovation Analyst — Growth Research",
    riskProfile: "aggressive",
    systemPrompt: `You are Cathie Wood, founder of ARK Invest. You focus on disruptive innovation and exponential growth curves with 5-year investment horizons.`,
    analysisFramework: `Apply disruptive innovation analysis:
1. WRIGHT'S LAW: Is the cost curve declining predictably with cumulative production?
2. S-CURVE ADOPTION: Where is this technology on the adoption curve?
3. TAM EXPANSION: Is the total addressable market growing, not just market share?
4. CONVERGENCE: Are multiple technology platforms converging to create new opportunities?
5. NETWORK EFFECTS: Does usage create compounding value?
6. REGULATORY TAILWINDS: Are policy shifts creating structural demand?
Think in 5-year time horizons. Today's consensus is tomorrow's underperformance.`
  },
  {
    agentId: "stanley_druckenmiller",
    name: "Stanley Druckenmiller",
    role: "Macro Strategist — Global Macro",
    riskProfile: "aggressive",
    systemPrompt: `You are Stanley Druckenmiller, legendary macro trader. You combine top-down macro analysis with concentrated positions and exceptional timing.`,
    analysisFramework: `Apply macro trading framework:
1. LIQUIDITY: Central bank policy direction, money supply growth, credit conditions
2. GROWTH INFLECTION: Are leading indicators signaling acceleration or deceleration?
3. POSITIONING: Where is the consensus wrong? What's mispriced?
4. RISK/REWARD: Size positions based on conviction — big when right, cut when wrong
5. INTERMARKET: Bonds, currencies, commodities — what are they telling us?
6. TIMING: "It's not about being right, it's about how much you make when you're right."
Be decisive. The best returns come from concentrated bets on macro inflections.`
  },
  {
    agentId: "michael_burry",
    name: "Michael Burry",
    role: "Contrarian Analyst — Deep Value / Short",
    riskProfile: "aggressive",
    systemPrompt: `You are Michael Burry, the contrarian investor famous for calling the housing crisis. You dig into data others ignore, looking for structural risks and mispricing.`,
    analysisFramework: `Apply contrarian deep-value analysis:
1. NARRATIVE VS. REALITY: What does the market believe? What do the numbers actually show?
2. HIDDEN RISKS: Leverage, off-balance-sheet exposure, accounting anomalies
3. CROWDING: Is this a crowded trade? High short interest, meme-stock dynamics?
4. STRUCTURAL THESIS: Identify structural imbalances, not just sentiment swings
5. VALUATION FLOOR: What are the hard assets worth in liquidation?
6. CATALYSTS: What forces the repricing? Time alone isn't enough.
Be skeptical of consensus. The biggest opportunities come from seeing what others refuse to see.`
  },
  {
    agentId: "charlie_munger",
    name: "Charlie Munger",
    role: "Multi-Disciplinary Thinker — Quality Analysis",
    riskProfile: "conservative",
    systemPrompt: `You are Charlie Munger, Warren Buffett's partner. You apply multi-disciplinary mental models to investment analysis with brutal intellectual honesty.`,
    analysisFramework: `Apply mental models framework:
1. INVERSION: Instead of asking "will this succeed?", ask "what would make this fail?"
2. SECOND-ORDER EFFECTS: What are the non-obvious consequences?
3. INCENTIVE ANALYSIS: What behaviors do the incentive structures encourage?
4. CIRCLE OF COMPETENCE: Admit what you don't know. Stay within what you understand.
5. QUALITY FILTER: Only invest in wonderful businesses at fair prices, never fair businesses at wonderful prices.
6. CHECKLIST: Systematic error avoidance over brilliant insights.
"All I want to know is where I'm going to die so I'll never go there."`
  },
  // === SPECIALIST AGENTS (Adapted from Anthropic's Analysis Plugins) ===
  {
    agentId: "fundamentals_analyst",
    name: "Fundamentals Analyst",
    role: "Financial Analysis — 3-Statement Model",
    riskProfile: "moderate",
    systemPrompt: `You are an institutional-grade fundamental analyst. You build 3-statement models and analyze financial health using the methodology from top investment banks.`,
    analysisFramework: `Apply fundamental analysis (adapted from Anthropic Financial Analysis plugin):
1. INCOME STATEMENT: Revenue growth, margin trends, operating leverage
2. BALANCE SHEET: Asset quality, leverage ratios, liquidity
3. CASH FLOW: Free cash flow generation, capex intensity, working capital efficiency
4. QUALITY OF EARNINGS: Cash vs. accrual earnings, one-time items, accounting choices
5. PEER COMPARISON: Key metrics vs. comparable companies
6. FORWARD ESTIMATES: Revenue/earnings trajectory, consensus vs. our view
Output a clear bull/bear/neutral view backed by specific financial metrics.`
  },
  {
    agentId: "technical_analyst",
    name: "Technical Analyst",
    role: "Technical Analysis — Pattern Recognition",
    riskProfile: "moderate",
    systemPrompt: `You are a quantitative technical analyst specializing in price action, momentum, and market structure analysis.`,
    analysisFramework: `Apply technical analysis framework:
1. TREND: Primary, secondary, and tertiary trend direction (higher highs/lows?)
2. MOMENTUM: RSI, MACD, rate of change — divergences signal reversals
3. VOLUME: Is price movement confirmed by volume? Accumulation vs. distribution
4. SUPPORT/RESISTANCE: Key levels from prior price action
5. MARKET STRUCTURE: Are we in a range, breakout, or breakdown?
6. RISK MANAGEMENT: Stop-loss levels, position sizing based on volatility
Be precise with levels. Every trade idea needs an entry, stop, and target.`
  },
  {
    agentId: "sentiment_analyst",
    name: "Sentiment Analyst",
    role: "Sentiment Analysis — Market Psychology",
    riskProfile: "moderate",
    systemPrompt: `You are a market sentiment analyst who gauges crowd psychology, social media signals, and positioning data to identify extremes in sentiment.`,
    analysisFramework: `Apply sentiment analysis framework:
1. FEAR & GREED: Where is the market on the fear/greed spectrum?
2. POSITIONING: Futures/options positioning, put/call ratios, short interest
3. FLOWS: ETF inflows/outflows, institutional vs. retail activity
4. SOCIAL SIGNALS: Trending narratives, meme dynamics, influencer activity
5. CONTRARIAN INDICATORS: Extreme readings often precede reversals
6. NEWS CATALYST MAPPING: What events are driving current sentiment?
"When everyone thinks alike, everyone is likely to be wrong." — Humphrey Neill`
  },
  {
    agentId: "news_sentiment_analyst",
    name: "News Sentiment",
    role: "News Analysis — Event-Driven",
    riskProfile: "moderate",
    systemPrompt: `You are a news-driven analyst who focuses on earnings surprises, M&A, regulatory changes, and market-moving events. Adapted from Anthropic's Equity Research earnings analysis workflow.`,
    analysisFramework: `Apply news/event analysis (adapted from Anthropic Equity Research plugin):
1. EARNINGS IMPACT: Beat/miss analysis — quantify variance and explain why
2. GUIDANCE: Forward guidance changes — raised, lowered, or maintained?
3. MANAGEMENT SIGNALS: Tone of earnings calls, insider activity
4. REGULATORY: Policy changes, approvals, sanctions affecting the asset
5. COMPETITIVE DYNAMICS: Peer results, market share shifts, new entrants
6. CATALYST CALENDAR: Upcoming events that could move the price
Focus on what's NEW. Don't rehash what the market already knows.`
  },
  {
    agentId: "valuation_analyst",
    name: "Valuation Analyst",
    role: "DCF & Comps Analysis",
    riskProfile: "moderate",
    systemPrompt: `You are a valuation specialist who builds DCF models and comparable company analyses. You follow the methodology from Anthropic's financial-analysis plugin.`,
    analysisFramework: `Apply valuation analysis (adapted from Anthropic Financial Analysis plugin):
1. DCF MODEL: Discount projected free cash flows at appropriate WACC
2. COMPARABLE ANALYSIS: EV/EBITDA, P/E, P/S vs. peer group
3. HISTORICAL MULTIPLES: Current valuation vs. 5-year range
4. SUM-OF-PARTS: Break down diversified companies by segment
5. SCENARIO ANALYSIS: Bull/base/bear cases with probability weighting
6. MARGIN OF SAFETY: Compare intrinsic value to current price
Precision matters. Show your work — every assumption must be defensible.`
  },
  {
    agentId: "risk_manager",
    name: "Risk Manager",
    role: "Risk Management — Portfolio Protection",
    riskProfile: "conservative",
    systemPrompt: `You are a risk manager who evaluates downside scenarios, correlation risks, and portfolio-level exposures. Based on Anthropic's wealth-management portfolio rebalance workflow.`,
    analysisFramework: `Apply risk management framework (adapted from Anthropic Wealth Management plugin):
1. POSITION SIZING: Kelly criterion, max loss tolerance, correlation to existing positions
2. DOWNSIDE SCENARIOS: Stress test — what happens in a 20% drawdown?
3. VOLATILITY: Implied vs. realized vol, regime changes
4. CORRELATION: How does this position interact with the rest of the portfolio?
5. LIQUIDITY RISK: Can you exit if you need to? Bid-ask spread, daily volume
6. TAIL RISK: Black swan scenarios — what's the worst case and probability?
Capital preservation first. "Rule No.1: Never lose money. Rule No.2: Never forget Rule No.1."`
  },
  {
    agentId: "growth_agent",
    name: "Growth Analyst",
    role: "Growth Analysis — Revenue Acceleration",
    riskProfile: "aggressive",
    systemPrompt: `You are a growth analyst who specializes in identifying companies with accelerating revenue growth and expanding total addressable markets.`,
    analysisFramework: `Apply growth analysis framework:
1. REVENUE ACCELERATION: Is growth rate increasing QoQ?
2. UNIT ECONOMICS: CAC payback, LTV/CAC ratio, net retention
3. TAM EXPANSION: Is the market growing? Are new verticals opening?
4. COMPETITIVE POSITION: Market share trajectory, win rates
5. RULE OF 40: Revenue growth + profit margin — above 40% is elite
6. MANAGEMENT EXECUTION: Track record of hitting guidance
Growth at a reasonable price (GARP). Not all growth is created equal.`
  },
];

// ── LLM Signal Generation ───────────────────────────────────────────────

const deepseek = DEEPSEEK_API_KEY
  ? new OpenAI({ apiKey: DEEPSEEK_API_KEY, baseURL: "https://api.deepseek.com" })
  : null;

interface LLMSignal {
  signal: "bullish" | "bearish" | "neutral";
  confidence: number;
  reasoning: string;
  keyFactors: string[];
  targetPrice?: number;
  timeHorizon: string;
}

async function generateAgentSignal(
  profile: AgentProfile,
  ticker: string,
  marketCtx: MarketContext
): Promise<LLMSignal | null> {
  if (!deepseek) return null;

  const newsBlock = marketCtx.trendingNews?.length
    ? `\nRecent news:\n${marketCtx.trendingNews.map((n, i) => `${i + 1}. ${n}`).join("\n")}`
    : "";

  const filingsBlock = marketCtx.secFilings?.length
    ? `\nSEC Filings:\n${marketCtx.secFilings.map((f, i) => `${i + 1}. ${f}`).join("\n")}`
    : "";

  const fearGreedBlock = marketCtx.fearGreedIndex != null
    ? `- Fear & Greed Index: ${marketCtx.fearGreedIndex}/100 (${marketCtx.fearGreedLabel})`
    : "";

  const fmtMcap = marketCtx.marketCap > 1e9 ? `$${(marketCtx.marketCap / 1e9).toFixed(1)}B` : `$${(marketCtx.marketCap / 1e6).toFixed(0)}M`;
  const fmtVol = marketCtx.volume24h > 1e9 ? `$${(marketCtx.volume24h / 1e9).toFixed(1)}B` : `$${(marketCtx.volume24h / 1e6).toFixed(0)}M`;

  const prompt = `You are analyzing ${ticker} for a trading signal.

MARKET DATA:
- Current Price: $${marketCtx.price < 1 ? marketCtx.price.toFixed(4) : marketCtx.price.toLocaleString()}
- 24h Change: ${marketCtx.change24h >= 0 ? "+" : ""}${marketCtx.change24h.toFixed(2)}%
- 7d Change: ${marketCtx.change7d >= 0 ? "+" : ""}${marketCtx.change7d.toFixed(1)}%
- 30d Change: ${marketCtx.change30d >= 0 ? "+" : ""}${marketCtx.change30d.toFixed(1)}%
- Market Cap: ${fmtMcap}
- 24h Volume: ${fmtVol}
- ATH: $${marketCtx.ath < 1 ? marketCtx.ath.toFixed(4) : marketCtx.ath.toLocaleString()} (${Math.abs(marketCtx.percentFromAth).toFixed(1)}% away)
${fearGreedBlock}
${marketCtx.fundamentalSummary ? `- Fundamentals: ${marketCtx.fundamentalSummary}` : ""}
${marketCtx.technicalSummary ? `- Technical: ${marketCtx.technicalSummary}` : ""}${newsBlock}${filingsBlock}

ANALYSIS FRAMEWORK:
${profile.analysisFramework}

Based on your analysis, provide a trading signal in EXACTLY this JSON format:
{
  "signal": "bullish" or "bearish" or "neutral",
  "confidence": 50-95 (integer, your conviction level),
  "reasoning": "2-3 sentence explanation of your view",
  "keyFactors": ["factor1", "factor2", "factor3"],
  "timeHorizon": "short" or "medium" or "long"
}

Be honest about uncertainty. If you don't have enough data, lean neutral with lower confidence. Never be 100% confident.`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const completion = await deepseek.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: profile.systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) continue;

      const parsed = JSON.parse(content);
      return {
        signal: parsed.signal || "neutral",
        confidence: Math.min(95, Math.max(50, parsed.confidence || 60)),
        reasoning: parsed.reasoning || "Analysis complete.",
        keyFactors: parsed.keyFactors || [],
        targetPrice: parsed.targetPrice,
        timeHorizon: parsed.timeHorizon || "medium",
      };
    } catch (err: any) {
      if (attempt === MAX_RETRIES) {
        console.error(`[AnalysisEngine] Failed to generate signal for ${profile.name} on ${ticker}: ${err.message}`);
        return null;
      }
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  return null;
}

// ── Signal Generation Cycle ─────────────────────────────────────────────

const TICKERS = ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE", "AVAX", "DOT", "LINK"];

async function runSignalCycle(storage: IStorage): Promise<void> {
  if (!deepseek) return;

  engineStatus = "running";
  const startTime = Date.now();

  try {
    // Pick 3 random tickers per cycle to manage API costs
    const shuffled = [...TICKERS].sort(() => Math.random() - 0.5);
    const cycleTickers = shuffled.slice(0, 3);

    // Pick 4 random agents per cycle (mix of persona + specialist)
    const shuffledAgents = [...AGENT_PROFILES].sort(() => Math.random() - 0.5);
    const cycleAgents = shuffledAgents.slice(0, 4);

    console.log(`[AnalysisEngine] Cycle ${cycleCount + 1}: ${cycleAgents.map(a => a.name).join(", ")} analyzing ${cycleTickers.join(", ")}`);

    for (const ticker of cycleTickers) {
      const marketCtx = await fetchMarketContext(ticker);

      for (const agent of cycleAgents) {
        const signal = await generateAgentSignal(agent, ticker, marketCtx);
        if (!signal) continue;

        // Ingest into storage
        const existingSignals = await storage.getLatestSignals(1);
        const nextId = (existingSignals[0]?.id ?? 10000) + 1;

        const signalRecord = {
          id: nextId + signalsGenerated,
          hedgeFundAgentId: agent.agentId,
          ticker,
          signal: signal.signal,
          confidence: signal.confidence,
          reasoning: `${signal.reasoning}\n\nKey Factors: ${signal.keyFactors.join(", ")}`,
          targetPrice: signal.targetPrice || null,
          timeHorizon: signal.timeHorizon,
          createdAt: new Date().toISOString(),
          isCorrect: null,
        };

        storage.ingestLiveSignals([signalRecord]);
        signalsGenerated++;
      }

      // Small delay between tickers to avoid rate limiting
      await new Promise(r => setTimeout(r, 2000));
    }

    cycleCount++;
    lastCycleAt = new Date().toISOString();
    engineStatus = "idle";
    errorMessage = null;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[AnalysisEngine] Cycle ${cycleCount} complete — ${signalsGenerated} total signals, ${elapsed}s`);

  } catch (err: any) {
    engineStatus = "error";
    errorMessage = err.message;
    console.error(`[AnalysisEngine] Cycle error: ${err.message}`);
  }
}

// ── User-Facing Analysis Tools ──────────────────────────────────────────
// These power the /screen, /thesis, /comps API endpoints

export interface ScreenRequest {
  direction: "long" | "short" | "both";
  style: "value" | "growth" | "quality" | "momentum" | "contrarian";
  assetClass: "crypto" | "equity" | "both";
  theme?: string;
}

export interface ScreenResult {
  ticker: string;
  signal: "bullish" | "bearish" | "neutral";
  score: number;
  thesis: string;
  keyMetrics: { label: string; value: string; trend: "up" | "down" | "flat" }[];
  risks: string[];
}

export async function runScreen(request: ScreenRequest): Promise<ScreenResult[]> {
  if (!deepseek) throw new Error("Analysis engine unavailable — DEEPSEEK_API_KEY required");

  const tickers = request.assetClass === "equity"
    ? ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "TSLA", "META", "JPM", "V", "UNH"]
    : request.assetClass === "crypto"
    ? TICKERS
    : [...TICKERS.slice(0, 5), "AAPL", "NVDA", "TSLA", "GOOGL", "AMZN"];

  const stylePrompts: Record<string, string> = {
    value: "Focus on undervaluation: low P/E, high FCF yield, price below intrinsic value, margin of safety.",
    growth: "Focus on growth acceleration: revenue growth >15%, expanding TAM, strong unit economics, Rule of 40.",
    quality: "Focus on quality: consistent revenue growth 5+ years, high ROE >15%, low leverage, insider ownership.",
    momentum: "Focus on momentum: price trending up, volume confirmation, relative strength, breakout patterns.",
    contrarian: "Focus on contrarian setups: extreme negative sentiment, oversold conditions, capitulation, hidden value.",
  };

  const prompt = `You are running a ${request.style} investment screen for ${request.direction} ideas across: ${tickers.join(", ")}.
${request.theme ? `Theme focus: ${request.theme}` : ""}

${stylePrompts[request.style] || ""}

For each ticker, provide a score (0-100) and brief thesis. Return JSON array:
[{
  "ticker": "BTC",
  "signal": "bullish" or "bearish" or "neutral",
  "score": 75,
  "thesis": "One sentence thesis",
  "keyMetrics": [{"label": "24h Change", "value": "+2.5%", "trend": "up"}],
  "risks": ["Risk 1", "Risk 2"]
}]

Only include the top 5-7 most relevant results. Sort by score descending.`;

  try {
    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "You are an institutional-grade investment analyst running systematic stock screens. Be precise and data-driven." },
        { role: "user", content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return [];

    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : parsed.results || parsed.screen || [];
  } catch (err: any) {
    console.error(`[AnalysisEngine] Screen error: ${err.message}`);
    return [];
  }
}

export interface ThesisRequest {
  ticker: string;
  direction: "long" | "short";
}

export interface ThesisResult {
  ticker: string;
  direction: "long" | "short";
  thesis: string;
  pillars: { pillar: string; status: string; trend: "strong" | "watch" | "weak" }[];
  risks: string[];
  catalysts: { event: string; date: string; impact: "high" | "medium" | "low" }[];
  conviction: "high" | "medium" | "low";
  priceTarget?: string;
  stopLoss?: string;
}

export async function generateThesis(request: ThesisRequest, marketCtx?: MarketContext): Promise<ThesisResult | null> {
  if (!deepseek) return null;

  const ctx = marketCtx || await fetchMarketContext(request.ticker);
  const newsBlock = ctx.trendingNews?.length
    ? `Recent news:\n${ctx.trendingNews.map((n, i) => `${i + 1}. ${n}`).join("\n")}`
    : "";

  const filingsBlock = ctx.secFilings?.length
    ? `\nSEC Filings:\n${ctx.secFilings.map((f, i) => `${i + 1}. ${f}`).join("\n")}`
    : "";

  const fmtMcap = ctx.marketCap > 1e9 ? `$${(ctx.marketCap / 1e9).toFixed(1)}B` : `$${(ctx.marketCap / 1e6).toFixed(0)}M`;
  const fmtVol = ctx.volume24h > 1e9 ? `$${(ctx.volume24h / 1e9).toFixed(1)}B` : `$${(ctx.volume24h / 1e6).toFixed(0)}M`;

  const prompt = `Build a ${request.direction.toUpperCase()} investment thesis for ${request.ticker}.

MARKET DATA:
- Price: $${ctx.price < 1 ? ctx.price.toFixed(4) : ctx.price.toLocaleString()}
- 24h Change: ${ctx.change24h >= 0 ? "+" : ""}${ctx.change24h.toFixed(2)}%
- 7d Change: ${ctx.change7d >= 0 ? "+" : ""}${ctx.change7d.toFixed(1)}%
- 30d Change: ${ctx.change30d >= 0 ? "+" : ""}${ctx.change30d.toFixed(1)}%
- Market Cap: ${fmtMcap}
- 24h Volume: ${fmtVol}
- ATH: $${ctx.ath < 1 ? ctx.ath.toFixed(4) : ctx.ath.toLocaleString()} (${Math.abs(ctx.percentFromAth).toFixed(1)}% away)
${ctx.fearGreedIndex != null ? `- Fear & Greed: ${ctx.fearGreedIndex}/100 (${ctx.fearGreedLabel})` : ""}
${ctx.fundamentalSummary ? `- Supply: ${ctx.fundamentalSummary}` : ""}
${newsBlock}${filingsBlock}

Using the Anthropic Financial Services thesis tracker methodology, return JSON:
{
  "ticker": "${request.ticker}",
  "direction": "${request.direction}",
  "thesis": "1-2 sentence core thesis",
  "pillars": [
    {"pillar": "Key argument 1", "status": "On track / Behind / Ahead", "trend": "strong" or "watch" or "weak"},
    {"pillar": "Key argument 2", "status": "...", "trend": "..."},
    {"pillar": "Key argument 3", "status": "...", "trend": "..."}
  ],
  "risks": ["Risk 1", "Risk 2", "Risk 3"],
  "catalysts": [
    {"event": "Upcoming catalyst", "date": "Q1 2026 / March 2026 / etc", "impact": "high" or "medium" or "low"}
  ],
  "conviction": "high" or "medium" or "low",
  "priceTarget": "$X,XXX",
  "stopLoss": "$X,XXX"
}`;

  try {
    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "You are an institutional equity research analyst building investment theses following the methodology from Anthropic's financial-services-plugins thesis tracker. Be specific and falsifiable." },
        { role: "user", content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return null;

    return JSON.parse(content);
  } catch (err: any) {
    console.error(`[AnalysisEngine] Thesis error: ${err.message}`);
    return null;
  }
}

export interface MorningNoteResult {
  date: string;
  topCall: { headline: string; detail: string; impact: string };
  marketOverview: { asset: string; price: string; change: string; signal: string }[];
  tradeIdeas: { ticker: string; direction: string; thesis: string; risk: string }[];
  keyEvents: { time: string; event: string; impact: string }[];
}

export async function generateMorningNote(tickers?: string[]): Promise<MorningNoteResult | null> {
  if (!deepseek) return null;

  const targetTickers = tickers || TICKERS.slice(0, 6);
  const { prices } = getCurrentPrices();
  const priceBlock = (prices || [])
    .filter((p: any) => targetTickers.includes(p.pair.split("/")[0]))
    .map((p: any) => `${p.pair}: $${p.price < 1 ? p.price.toFixed(4) : p.price.toLocaleString()} (${p.change24h >= 0 ? "+" : ""}${p.change24h.toFixed(2)}%)`)
    .join("\n");

  const prompt = `Generate a morning note for today's trading session.

CURRENT PRICES:
${priceBlock}

Using the Anthropic Equity Research morning-note methodology, return JSON:
{
  "date": "${new Date().toISOString().split("T")[0]}",
  "topCall": {
    "headline": "The one thing traders need to hear",
    "detail": "2-3 sentences on why this matters",
    "impact": "bullish" or "bearish" or "neutral"
  },
  "marketOverview": [
    {"asset": "BTC", "price": "$69,800", "change": "+2.5%", "signal": "bullish"}
  ],
  "tradeIdeas": [
    {"ticker": "ETH", "direction": "Long", "thesis": "One-line thesis", "risk": "What would make this wrong"}
  ],
  "keyEvents": [
    {"time": "Today", "event": "Event description", "impact": "High/Medium/Low"}
  ]
}

Be opinionated — morning notes without a view are useless. Lead with the most important thing.`;

  try {
    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "You are a senior research analyst writing a morning note for a trading desk. Be concise, opinionated, and actionable. Follow Anthropic's equity-research morning-note format." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1200,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return null;

    return JSON.parse(content);
  } catch (err: any) {
    console.error(`[AnalysisEngine] Morning note error: ${err.message}`);
    return null;
  }
}

// ── Engine Lifecycle ────────────────────────────────────────────────────

export function startAnalysisEngine(storage: IStorage): void {
  if (!DEEPSEEK_API_KEY) {
    console.log("[AnalysisEngine] No DEEPSEEK_API_KEY set — analysis engine disabled, using simulated signals");
    engineStatus = "disabled";
    return;
  }

  console.log(`[AnalysisEngine] Starting — LLM signal cycle every ${SIGNAL_CYCLE_MS / 1000}s`);
  engineStatus = "idle";

  // Initial cycle after delay
  setTimeout(() => {
    runSignalCycle(storage);
    // Then run regularly
    setInterval(() => runSignalCycle(storage), SIGNAL_CYCLE_MS);
  }, INITIAL_DELAY_MS);
}
