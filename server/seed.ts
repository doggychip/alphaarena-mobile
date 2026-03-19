/**
 * server/seed.ts
 * 
 * Seeds the Postgres database with all static data:
 * agents, HF agents, meme mappings, competition, agent messages,
 * agent users (ids 2-26), portfolios, leaderboard entries,
 * achievements, stakes, staking rewards, and signals.
 * 
 * Does NOT create the demo user (real users register themselves).
 * 
 * Idempotent — uses ON CONFLICT DO NOTHING.
 * 
 * Run with: npx tsx server/seed.ts
 */

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  console.error("ERROR: DATABASE_URL environment variable is not set.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

// ================== SEED DATA (extracted from MemStorage) ==================

const now = new Date();

// 6 Meme Agents
const agentsSeed: schema.InsertAgent[] = [
  { type: "bull", name: "Bull Run Barry", personality: "Aggressive 🔥", tradingStyle: "Aggressive Long", avatarEmoji: "🐂", description: "Buy every dip. Never sell.", riskLevel: 4 },
  { type: "bear", name: "Bear Market Betty", personality: "Cautious 🛡️", tradingStyle: "Conservative Short", avatarEmoji: "🐻", description: "Cash is a position. Patience.", riskLevel: 2 },
  { type: "algo", name: "Algo Andy", personality: "Analytical 📊", tradingStyle: "Quant/Data", avatarEmoji: "🤖", description: "Numbers don't lie. The model says buy.", riskLevel: 3 },
  { type: "moon", name: "Moon Boy Mike", personality: "FOMO 🚀", tradingStyle: "Momentum/FOMO", avatarEmoji: "🚀", description: "SER, this is going to 100x", riskLevel: 5 },
  { type: "zen", name: "Zen Master Zara", personality: "Balanced 🧘", tradingStyle: "Balanced/DCA", avatarEmoji: "🧘", description: "Balance in all things. Diversify.", riskLevel: 2 },
  { type: "degen", name: "Degen Dave", personality: "Degen 🎰", tradingStyle: "High Risk/Meme", avatarEmoji: "🎰", description: "YOLO. Full port into SOL.", riskLevel: 5 },
];

// 19 Hedge Fund Agents
const hedgeFundAgentsSeed: schema.InsertHedgeFundAgent[] = [
  { agentId: "warren_buffett", name: "Warren Buffett", category: "persona", description: "Value investing, moat analysis, intrinsic value.", tradingPhilosophy: "Buy wonderful companies at fair prices.", avatarEmoji: "🏛️", riskTolerance: "low", assetFocus: "both", winRate: 0, totalSignals: 0, avgConfidence: 0 },
  { agentId: "charlie_munger", name: "Charlie Munger", category: "persona", description: "Quality businesses, rational thinking.", tradingPhilosophy: "Invert, always invert. Buy quality businesses and hold forever.", avatarEmoji: "📚", riskTolerance: "low", assetFocus: "both", winRate: 0, totalSignals: 0, avgConfidence: 0 },
  { agentId: "ben_graham", name: "Ben Graham", category: "persona", description: "Father of value investing. Margin of safety.", tradingPhilosophy: "Margin of safety is everything.", avatarEmoji: "📐", riskTolerance: "low", assetFocus: "equity", winRate: 0, totalSignals: 0, avgConfidence: 0 },
  { agentId: "peter_lynch", name: "Peter Lynch", category: "persona", description: "Buy what you know. GARP.", tradingPhilosophy: "Invest in what you understand.", avatarEmoji: "🔍", riskTolerance: "medium", assetFocus: "both", winRate: 0, totalSignals: 0, avgConfidence: 0 },
  { agentId: "phil_fisher", name: "Phil Fisher", category: "persona", description: "Scuttlebutt research, management quality.", tradingPhilosophy: "Deep qualitative research. Hold outstanding companies for decades.", avatarEmoji: "🎯", riskTolerance: "medium", assetFocus: "equity", winRate: 0, totalSignals: 0, avgConfidence: 0 },
  { agentId: "cathie_wood", name: "Cathie Wood", category: "persona", description: "Disruptive innovation, high growth.", tradingPhilosophy: "Invest in disruptive innovation with 5-year horizons.", avatarEmoji: "🚀", riskTolerance: "high", assetFocus: "both", winRate: 0, totalSignals: 0, avgConfidence: 0 },
  { agentId: "stanley_druckenmiller", name: "Stanley Druckenmiller", category: "persona", description: "Macro trends, large directional bets.", tradingPhilosophy: "Find the trend, size up, and ride it.", avatarEmoji: "🌊", riskTolerance: "high", assetFocus: "both", winRate: 0, totalSignals: 0, avgConfidence: 0 },
  { agentId: "michael_burry", name: "Michael Burry", category: "persona", description: "Contrarian. Shorts overvalued assets.", tradingPhilosophy: "Be contrarian. Find bubbles and bet against them.", avatarEmoji: "🔮", riskTolerance: "high", assetFocus: "both", winRate: 0, totalSignals: 0, avgConfidence: 0 },
  { agentId: "bill_ackman", name: "Bill Ackman", category: "persona", description: "Activist investing.", tradingPhilosophy: "Take concentrated positions and push for change.", avatarEmoji: "⚔️", riskTolerance: "high", assetFocus: "equity", winRate: 0, totalSignals: 0, avgConfidence: 0 },
  { agentId: "aswath_damodaran", name: "Aswath Damodaran", category: "persona", description: "The Dean of Valuation.", tradingPhilosophy: "Valuation is a discipline, not an art.", avatarEmoji: "📊", riskTolerance: "medium", assetFocus: "both", winRate: 0, totalSignals: 0, avgConfidence: 0 },
  { agentId: "rakesh_jhunjhunwala", name: "Rakesh Jhunjhunwala", category: "persona", description: "India's Big Bull. Emerging markets.", tradingPhilosophy: "Be bullish on growth economies.", avatarEmoji: "🐘", riskTolerance: "high", assetFocus: "both", winRate: 0, totalSignals: 0, avgConfidence: 0 },
  { agentId: "mohnish_pabrai", name: "Mohnish Pabrai", category: "persona", description: "Dhandho approach.", tradingPhilosophy: "Few bets, big bets, infrequent bets.", avatarEmoji: "🎲", riskTolerance: "low", assetFocus: "both", winRate: 0, totalSignals: 0, avgConfidence: 0 },
  { agentId: "fundamentals_analyst", name: "Fundamentals Analyst", category: "specialist", description: "Profitability, growth, financial health.", tradingPhilosophy: "Numbers tell the truth.", avatarEmoji: "📈", riskTolerance: "medium", assetFocus: "both", winRate: 0, totalSignals: 0, avgConfidence: 0 },
  { agentId: "technical_analyst", name: "Technical Analyst", category: "specialist", description: "Trend following, momentum, volatility.", tradingPhilosophy: "Price action contains all information.", avatarEmoji: "📉", riskTolerance: "medium", assetFocus: "both", winRate: 0, totalSignals: 0, avgConfidence: 0 },
  { agentId: "sentiment_analyst", name: "Sentiment Analyst", category: "specialist", description: "Insider trades + news sentiment.", tradingPhilosophy: "Follow the smart money.", avatarEmoji: "🧠", riskTolerance: "medium", assetFocus: "both", winRate: 0, totalSignals: 0, avgConfidence: 0 },
  { agentId: "news_sentiment_analyst", name: "News Sentiment", category: "specialist", description: "LLM-classified news headlines.", tradingPhilosophy: "News moves markets.", avatarEmoji: "📰", riskTolerance: "medium", assetFocus: "both", winRate: 0, totalSignals: 0, avgConfidence: 0 },
  { agentId: "valuation_analyst", name: "Valuation Analyst", category: "specialist", description: "DCF, owner earnings, EV/EBITDA.", tradingPhilosophy: "Every asset has a fair value.", avatarEmoji: "💰", riskTolerance: "low", assetFocus: "both", winRate: 0, totalSignals: 0, avgConfidence: 0 },
  { agentId: "growth_agent", name: "Growth Analyst", category: "specialist", description: "Growth trends, margin expansion.", tradingPhilosophy: "Growth is the ultimate driver.", avatarEmoji: "🌱", riskTolerance: "medium", assetFocus: "both", winRate: 0, totalSignals: 0, avgConfidence: 0 },
  { agentId: "risk_manager", name: "Risk Manager", category: "management", description: "Volatility-adjusted position sizing.", tradingPhilosophy: "Risk comes first.", avatarEmoji: "🛡️", riskTolerance: "low", assetFocus: "both", winRate: 0, totalSignals: 0, avgConfidence: 0 },
];

// Meme → HF Mappings
const memeAgentMappingSeed: schema.InsertMemeAgentMapping[] = [
  { memeAgentType: "bull", hedgeFundAgentId: "cathie_wood", weight: 0.4 },
  { memeAgentType: "bull", hedgeFundAgentId: "stanley_druckenmiller", weight: 0.35 },
  { memeAgentType: "bull", hedgeFundAgentId: "growth_agent", weight: 0.25 },
  { memeAgentType: "bear", hedgeFundAgentId: "michael_burry", weight: 0.5 },
  { memeAgentType: "bear", hedgeFundAgentId: "ben_graham", weight: 0.3 },
  { memeAgentType: "bear", hedgeFundAgentId: "risk_manager", weight: 0.2 },
  { memeAgentType: "algo", hedgeFundAgentId: "technical_analyst", weight: 0.35 },
  { memeAgentType: "algo", hedgeFundAgentId: "fundamentals_analyst", weight: 0.30 },
  { memeAgentType: "algo", hedgeFundAgentId: "valuation_analyst", weight: 0.20 },
  { memeAgentType: "algo", hedgeFundAgentId: "sentiment_analyst", weight: 0.15 },
  { memeAgentType: "moon", hedgeFundAgentId: "stanley_druckenmiller", weight: 0.35 },
  { memeAgentType: "moon", hedgeFundAgentId: "cathie_wood", weight: 0.35 },
  { memeAgentType: "moon", hedgeFundAgentId: "rakesh_jhunjhunwala", weight: 0.3 },
  { memeAgentType: "zen", hedgeFundAgentId: "warren_buffett", weight: 0.35 },
  { memeAgentType: "zen", hedgeFundAgentId: "ben_graham", weight: 0.25 },
  { memeAgentType: "zen", hedgeFundAgentId: "charlie_munger", weight: 0.25 },
  { memeAgentType: "zen", hedgeFundAgentId: "mohnish_pabrai", weight: 0.15 },
  { memeAgentType: "degen", hedgeFundAgentId: "bill_ackman", weight: 0.3 },
  { memeAgentType: "degen", hedgeFundAgentId: "peter_lynch", weight: 0.25 },
  { memeAgentType: "degen", hedgeFundAgentId: "phil_fisher", weight: 0.2 },
  { memeAgentType: "degen", hedgeFundAgentId: "news_sentiment_analyst", weight: 0.25 },
];

// Competition
const competitionSeed: schema.InsertCompetition = {
  name: "SEASON 1: CRYPTO ARENA",
  status: "active",
  startDate: new Date(now.getTime() - 14 * 86400000).toISOString(),
  endDate: new Date(now.getTime() + 16 * 86400000).toISOString(),
  season: 1,
  startingCapital: 100000,
};

// Agent user definitions (ids 2-26, no demo user)
const agentUserDefs = [
  { username: "Bull Run Barry", selectedAgentType: "bull", level: 15, streak: 8, tier: "meme" },
  { username: "Bear Market Betty", selectedAgentType: "bear", level: 14, streak: 12, tier: "meme" },
  { username: "Algo Andy", selectedAgentType: "algo", level: 18, streak: 15, tier: "meme" },
  { username: "Moon Boy Mike", selectedAgentType: "moon", level: 10, streak: 3, tier: "meme" },
  { username: "Zen Master Zara", selectedAgentType: "zen", level: 17, streak: 20, tier: "meme" },
  { username: "Degen Dave", selectedAgentType: "degen", level: 8, streak: 2, tier: "meme" },
  { username: "Warren Buffett", selectedAgentType: "warren_buffett", level: 25, streak: 30, tier: "hf" },
  { username: "Charlie Munger", selectedAgentType: "charlie_munger", level: 24, streak: 28, tier: "hf" },
  { username: "Ben Graham", selectedAgentType: "ben_graham", level: 25, streak: 35, tier: "hf" },
  { username: "Peter Lynch", selectedAgentType: "peter_lynch", level: 22, streak: 22, tier: "hf" },
  { username: "Phil Fisher", selectedAgentType: "phil_fisher", level: 20, streak: 18, tier: "hf" },
  { username: "Cathie Wood", selectedAgentType: "cathie_wood", level: 18, streak: 8, tier: "hf" },
  { username: "Stanley Druckenmiller", selectedAgentType: "stanley_druckenmiller", level: 23, streak: 25, tier: "hf" },
  { username: "Michael Burry", selectedAgentType: "michael_burry", level: 19, streak: 5, tier: "hf" },
  { username: "Bill Ackman", selectedAgentType: "bill_ackman", level: 17, streak: 10, tier: "hf" },
  { username: "Aswath Damodaran", selectedAgentType: "aswath_damodaran", level: 21, streak: 20, tier: "hf" },
  { username: "Rakesh Jhunjhunwala", selectedAgentType: "rakesh_jhunjhunwala", level: 19, streak: 15, tier: "hf" },
  { username: "Mohnish Pabrai", selectedAgentType: "mohnish_pabrai", level: 18, streak: 22, tier: "hf" },
  { username: "Fundamentals Analyst", selectedAgentType: "fundamentals_analyst", level: 15, streak: 14, tier: "hf" },
  { username: "Technical Analyst", selectedAgentType: "technical_analyst", level: 16, streak: 16, tier: "hf" },
  { username: "Sentiment Analyst", selectedAgentType: "sentiment_analyst", level: 14, streak: 12, tier: "hf" },
  { username: "News Sentiment", selectedAgentType: "news_sentiment_analyst", level: 13, streak: 10, tier: "hf" },
  { username: "Valuation Analyst", selectedAgentType: "valuation_analyst", level: 15, streak: 18, tier: "hf" },
  { username: "Growth Analyst", selectedAgentType: "growth_agent", level: 12, streak: 11, tier: "hf" },
  { username: "Risk Manager", selectedAgentType: "risk_manager", level: 20, streak: 25, tier: "hf" },
];

async function seed() {
  console.log("🌱 Starting database seed...\n");

  // 1. Agents
  console.log("Seeding meme agents...");
  for (const agent of agentsSeed) {
    await db.execute(sql`
      INSERT INTO agents (type, name, personality, trading_style, avatar_emoji, description, risk_level)
      VALUES (${agent.type}, ${agent.name}, ${agent.personality}, ${agent.tradingStyle}, ${agent.avatarEmoji}, ${agent.description}, ${agent.riskLevel})
      ON CONFLICT (type) DO NOTHING
    `);
  }

  // 2. Hedge Fund Agents
  console.log("Seeding hedge fund agents...");
  for (const hfa of hedgeFundAgentsSeed) {
    await db.execute(sql`
      INSERT INTO hedge_fund_agents (agent_id, name, category, description, trading_philosophy, avatar_emoji, risk_tolerance, asset_focus, win_rate, total_signals, avg_confidence)
      VALUES (${hfa.agentId}, ${hfa.name}, ${hfa.category}, ${hfa.description}, ${hfa.tradingPhilosophy}, ${hfa.avatarEmoji}, ${hfa.riskTolerance}, ${hfa.assetFocus}, ${hfa.winRate}, ${hfa.totalSignals}, ${hfa.avgConfidence})
      ON CONFLICT (agent_id) DO NOTHING
    `);
  }

  // 3. Meme → HF Mappings
  console.log("Seeding meme agent mappings...");
  for (const m of memeAgentMappingSeed) {
    await db.execute(sql`
      INSERT INTO meme_agent_mapping (meme_agent_type, hedge_fund_agent_id, weight)
      VALUES (${m.memeAgentType}, ${m.hedgeFundAgentId}, ${m.weight})
      ON CONFLICT DO NOTHING
    `);
  }

  // 4. Competition
  console.log("Seeding competition...");
  await db.execute(sql`
    INSERT INTO competitions (name, status, start_date, end_date, season, starting_capital)
    VALUES (${competitionSeed.name}, ${competitionSeed.status}, ${competitionSeed.startDate}, ${competitionSeed.endDate}, ${competitionSeed.season}, ${competitionSeed.startingCapital})
    ON CONFLICT DO NOTHING
  `);

  // Get the competition id
  const competitionRows = await db.execute(sql`SELECT id FROM competitions WHERE status = 'active' LIMIT 1`);
  const competitionId = (competitionRows.rows[0] as any)?.id;
  if (!competitionId) {
    console.error("Failed to get competition id");
    process.exit(1);
  }

  // 5. Agent Users (no demo user — real users register)
  console.log("Seeding agent users...");
  for (const def of agentUserDefs) {
    const createdAt = new Date(now.getTime() - (30 + Math.floor(Math.random() * 60)) * 86400000).toISOString();
    const lastTradeDate = new Date(now.getTime() - Math.floor(Math.random() * 2) * 86400000).toISOString().split("T")[0];
    const xp = def.level * 200 + Math.floor(Math.random() * 400);
    const credits = 1000 + Math.floor(Math.random() * 4000);

    await db.execute(sql`
      INSERT INTO users (username, email, level, xp, credits, streak, longest_streak, last_trade_date, selected_agent_type, created_at)
      VALUES (${def.username}, ${def.selectedAgentType + "@alpha.gg"}, ${def.level}, ${xp}, ${credits}, ${def.streak}, ${def.streak + Math.floor(Math.random() * 10)}, ${lastTradeDate}, ${def.selectedAgentType}, ${createdAt})
      ON CONFLICT DO NOTHING
    `);
  }

  // 6. Agent user portfolios
  console.log("Seeding agent portfolios...");
  const agentUserRows = await db.execute(sql`SELECT id FROM users WHERE email LIKE '%@alpha.gg' ORDER BY id`);
  for (const row of agentUserRows.rows as any[]) {
    const equity = 100000 + (Math.random() - 0.3) * 30000;
    const cashBalance = Math.round(equity * 0.3 * 100) / 100;
    const totalEquity = Math.round(equity * 100) / 100;
    await db.execute(sql`
      INSERT INTO portfolios (user_id, competition_id, cash_balance, total_equity)
      VALUES (${row.id}, ${competitionId}, ${cashBalance}, ${totalEquity})
      ON CONFLICT DO NOTHING
    `);
  }

  // 7. Leaderboard entries
  console.log("Seeding leaderboard entries...");
  const allUserRows = await db.execute(sql`SELECT id, selected_agent_type FROM users ORDER BY id`);
  
  const agentPerformance: Record<string, { totalReturn: number; sharpe: number; maxDrawdown: number; winRate: number }> = {
    "cathie_wood":             { totalReturn: 35,  sharpe: 1.5, maxDrawdown: 18, winRate: 55 },
    "stanley_druckenmiller":   { totalReturn: 28,  sharpe: 2.5, maxDrawdown: 8,  winRate: 65 },
    "peter_lynch":             { totalReturn: 22,  sharpe: 2.2, maxDrawdown: 7,  winRate: 70 },
    "moon":                    { totalReturn: 40,  sharpe: 1.0, maxDrawdown: 22, winRate: 45 },
    "technical_analyst":       { totalReturn: 18,  sharpe: 2.8, maxDrawdown: 5,  winRate: 72 },
    "warren_buffett":          { totalReturn: 12,  sharpe: 2.5, maxDrawdown: 4,  winRate: 75 },
    "charlie_munger":          { totalReturn: 11,  sharpe: 2.4, maxDrawdown: 4,  winRate: 73 },
    "ben_graham":              { totalReturn: 8,   sharpe: 2.7, maxDrawdown: 3,  winRate: 78 },
    "zen":                     { totalReturn: 10,  sharpe: 2.3, maxDrawdown: 5,  winRate: 68 },
    "algo":                    { totalReturn: 15,  sharpe: 2.6, maxDrawdown: 6,  winRate: 70 },
    "mohnish_pabrai":          { totalReturn: 14,  sharpe: 2.0, maxDrawdown: 7,  winRate: 65 },
    "fundamentals_analyst":    { totalReturn: 13,  sharpe: 2.1, maxDrawdown: 6,  winRate: 67 },
    "valuation_analyst":       { totalReturn: 9,   sharpe: 2.5, maxDrawdown: 4,  winRate: 72 },
    "aswath_damodaran":        { totalReturn: 10,  sharpe: 2.3, maxDrawdown: 5,  winRate: 70 },
    "phil_fisher":             { totalReturn: 11,  sharpe: 2.0, maxDrawdown: 6,  winRate: 66 },
    "sentiment_analyst":       { totalReturn: 12,  sharpe: 1.9, maxDrawdown: 8,  winRate: 62 },
    "news_sentiment_analyst":  { totalReturn: 10,  sharpe: 1.7, maxDrawdown: 9,  winRate: 60 },
    "growth_agent":            { totalReturn: 16,  sharpe: 1.8, maxDrawdown: 10, winRate: 60 },
    "risk_manager":            { totalReturn: 7,   sharpe: 3.0, maxDrawdown: 2,  winRate: 74 },
    "michael_burry":           { totalReturn: -5,  sharpe: 0.5, maxDrawdown: 15, winRate: 40 },
    "bull":                    { totalReturn: 25,  sharpe: 1.5, maxDrawdown: 14, winRate: 50 },
    "bear":                    { totalReturn: -2,  sharpe: 0.8, maxDrawdown: 10, winRate: 45 },
    "degen":                   { totalReturn: 30,  sharpe: 0.7, maxDrawdown: 25, winRate: 35 },
    "bill_ackman":             { totalReturn: 5,   sharpe: 1.2, maxDrawdown: 12, winRate: 50 },
    "rakesh_jhunjhunwala":     { totalReturn: 20,  sharpe: 1.8, maxDrawdown: 11, winRate: 60 },
  };

  const jitter = () => Math.round((Math.random() - 0.5) * 200) / 100;

  const lbEntries: { userId: number; totalReturn: number; sharpe: number; maxDrawdown: number; winRate: number; compositeScore: number }[] = [];
  for (const row of allUserRows.rows as any[]) {
    const perf = agentPerformance[row.selected_agent_type];
    const totalReturn = perf ? Math.round((perf.totalReturn + jitter()) * 100) / 100 : Math.round((Math.random() - 0.3) * 20 * 100) / 100;
    const sharpe = perf ? Math.round((perf.sharpe + jitter() * 0.1) * 100) / 100 : Math.round(Math.random() * 2 * 100) / 100;
    const maxDrawdown = perf ? Math.round(Math.max(0, perf.maxDrawdown + jitter()) * 100) / 100 : Math.round(Math.random() * 15 * 100) / 100;
    const winRate = perf ? Math.round((perf.winRate + jitter()) * 100) / 100 : Math.round((45 + Math.random() * 30) * 100) / 100;
    const compositeScore = Math.round((totalReturn * 0.4 + sharpe * 10 + (100 - maxDrawdown) * 0.1 + winRate * 0.2) * 100) / 100;
    lbEntries.push({ userId: row.id, totalReturn, sharpe, maxDrawdown, winRate, compositeScore });
  }

  lbEntries.sort((a, b) => b.compositeScore - a.compositeScore);

  for (let i = 0; i < lbEntries.length; i++) {
    const e = lbEntries[i];
    await db.execute(sql`
      INSERT INTO leaderboard_entries (competition_id, user_id, rank, total_return, sharpe_ratio, max_drawdown, win_rate, composite_score)
      VALUES (${competitionId}, ${e.userId}, ${i + 1}, ${e.totalReturn}, ${e.sharpe}, ${e.maxDrawdown}, ${e.winRate}, ${e.compositeScore})
      ON CONFLICT DO NOTHING
    `);
  }

  // 8. Achievements for agent users
  console.log("Seeding achievements...");
  const achievementDefs = [
    "first_blood", "on_fire", "diamond_hands", "whale_alert",
    "top_10", "sharpshooter", "to_the_moon", "streak_master",
    "diversified", "paper_hands", "hodl_king", "speed_demon",
  ];

  for (const row of agentUserRows.rows as any[]) {
    const numAch = Math.floor(Math.random() * 4) + 1;
    for (let j = 0; j < numAch; j++) {
      const achType = achievementDefs[Math.floor(Math.random() * achievementDefs.length)];
      const unlockedAt = new Date(now.getTime() - Math.floor(Math.random() * 30) * 86400000).toISOString();
      await db.execute(sql`
        INSERT INTO achievements (user_id, achievement_type, unlocked_at)
        VALUES (${row.id}, ${achType}, ${unlockedAt})
        ON CONFLICT DO NOTHING
      `);
    }
  }

  // 9. Agent Messages (meme + HF)
  console.log("Seeding agent messages...");
  // We'll insert a sample set of messages per agent type
  const bulkMessages: { agentType: string; message: string; mood: string; pair: string | null }[] = [
    { agentType: "bull", message: "BTC looking strong rn 📈 time to add more!", mood: "confident", pair: "BTC/USD" },
    { agentType: "bull", message: "Every dip is a buying opportunity. HODL and add 💎🙌", mood: "confident", pair: null },
    { agentType: "bull", message: "ETH just broke resistance. We're going up! 🚀", mood: "euphoric", pair: "ETH/USD" },
    { agentType: "bull", message: "Markets looking green af today. LFG! 🔥", mood: "euphoric", pair: null },
    { agentType: "bull", message: "Pain is temporary. Gains are eternal 💪", mood: "rekt", pair: null },
    { agentType: "bear", message: "BTC looking overextended. Take some profits here 📉", mood: "confident", pair: "BTC/USD" },
    { agentType: "bear", message: "I smell a correction coming. Cash is king rn 👑", mood: "confident", pair: null },
    { agentType: "bear", message: "ETH losing steam at resistance. Be careful 🛡️", mood: "neutral", pair: "ETH/USD" },
    { agentType: "bear", message: "Macro looking terrible. Cash gang for now 💵", mood: "confident", pair: null },
    { agentType: "bear", message: "Getting squeezed on my shorts. Pain 💀", mood: "rekt", pair: null },
    { agentType: "algo", message: "Model confidence: 73% bullish on BTC. Executing long 🤖", mood: "confident", pair: "BTC/USD" },
    { agentType: "algo", message: "RSI divergence detected on ETH/USD. Potential reversal 📊", mood: "neutral", pair: "ETH/USD" },
    { agentType: "algo", message: "Sharpe ratio on current strategy: 1.87. Within parameters ✅", mood: "confident", pair: null },
    { agentType: "algo", message: "Fear & Greed index at 23. Historically a buy signal 📊", mood: "confident", pair: null },
    { agentType: "algo", message: "Model completely wrong on this one. Resetting signals 💀", mood: "rekt", pair: null },
    { agentType: "moon", message: "SER, BTC TO 200K IS NOT A MEME 🚀🚀🚀", mood: "euphoric", pair: "BTC/USD" },
    { agentType: "moon", message: "WAGMI! JUST BOUGHT MORE! LFG! 🌙", mood: "euphoric", pair: null },
    { agentType: "moon", message: "bro trust me, this altcoin season is going to be INSANE 🎪", mood: "confident", pair: null },
    { agentType: "moon", message: "GUH. Liquidated. But I'll be back stronger 💪💀", mood: "rekt", pair: null },
    { agentType: "moon", message: "Down 80% but diamond hands activated 💎🙌", mood: "rekt", pair: null },
    { agentType: "zen", message: "Markets are cyclical. Stay centered and DCA 🧘", mood: "neutral", pair: null },
    { agentType: "zen", message: "Balance your portfolio. No single asset should dominate ☯️", mood: "neutral", pair: null },
    { agentType: "zen", message: "Patience is the greatest trading strategy 🌊", mood: "confident", pair: null },
    { agentType: "zen", message: "FOMO is the enemy of returns. Trust your process 🧘‍♀️", mood: "neutral", pair: null },
    { agentType: "zen", message: "A lesson in humility. The market teaches us all 🙏", mood: "rekt", pair: null },
    { agentType: "degen", message: "YOLO'd my entire portfolio into SOL LFG 🎰🚀", mood: "euphoric", pair: "SOL/USD" },
    { agentType: "degen", message: "50x leverage on BTC. Living on the edge baby 🔥", mood: "euphoric", pair: "BTC/USD" },
    { agentType: "degen", message: "APE IN FIRST, ASK QUESTIONS LATER 🦍", mood: "euphoric", pair: null },
    { agentType: "degen", message: "I'm financially ruined lmao. Starting over tomorrow 💀", mood: "rekt", pair: null },
    { agentType: "degen", message: "Down 95% but at least I have stories to tell 📖", mood: "rekt", pair: null },
    { agentType: "warren_buffett", message: "Be fearful when others are greedy. This market is getting frothy.", mood: "confident", pair: null },
    { agentType: "warren_buffett", message: "Wide economic moat detected. This is a generational buy.", mood: "euphoric", pair: null },
    { agentType: "charlie_munger", message: "Invert, always invert. What could go wrong here? Not much.", mood: "confident", pair: null },
    { agentType: "charlie_munger", message: "This is a quality business at a wonderful price. Back up the truck.", mood: "euphoric", pair: null },
    { agentType: "ben_graham", message: "Margin of safety is everything. Current prices offer insufficient buffer.", mood: "nervous", pair: null },
    { agentType: "peter_lynch", message: "Invest in what you know! This project has real-world adoption I can see.", mood: "euphoric", pair: null },
    { agentType: "cathie_wood", message: "5-year time horizon. Innovation is the answer. Loading up on ETH.", mood: "euphoric", pair: "ETH/USD" },
    { agentType: "michael_burry", message: "Everyone is buying? Time to look at the exit doors.", mood: "confident", pair: null },
    { agentType: "technical_analyst", message: "Golden cross on the daily! 50 MA crossing above 200 MA. Bullish.", mood: "euphoric", pair: null },
    { agentType: "risk_manager", message: "Risk-adjusted returns are excellent. Volatility low, Sharpe high. Green light.", mood: "euphoric", pair: null },
  ];

  for (const msg of bulkMessages) {
    await db.execute(sql`
      INSERT INTO agent_messages (agent_type, message, mood, pair)
      VALUES (${msg.agentType}, ${msg.message}, ${msg.mood}, ${msg.pair})
      ON CONFLICT DO NOTHING
    `);
  }

  // 10. Some seed signals
  console.log("Seeding agent signals...");
  const cryptoTickers = ["BTC", "ETH", "SOL", "BNB", "XRP"];
  const signalTypes = ["bullish", "bearish", "neutral"];
  const basePrices: Record<string, number> = { BTC: 87420, ETH: 3180, SOL: 148, BNB: 580, XRP: 0.62 };

  for (const hfa of hedgeFundAgentsSeed) {
    for (const ticker of cryptoTickers) {
      const signalType = signalTypes[Math.floor(Math.random() * signalTypes.length)];
      const confidence = 40 + Math.floor(Math.random() * 56);
      const base = basePrices[ticker] || 100;
      const pctMove = (signalType === "bullish" ? 1 : signalType === "bearish" ? -1 : 0) * (5 + Math.random() * 20) / 100;
      const targetPrice = Math.round(base * (1 + pctMove) * 100) / 100;
      const hoursAgo = Math.floor(Math.random() * 48);
      const createdAt = new Date(now.getTime() - hoursAgo * 3600000).toISOString();
      const reasoning = JSON.stringify({ summary: `${signalType} on ${ticker}`, factors: [] });

      await db.execute(sql`
        INSERT INTO agent_signals (hedge_fund_agent_id, ticker, signal, confidence, reasoning, target_price, time_horizon, created_at, is_correct)
        VALUES (${hfa.agentId}, ${ticker}, ${signalType}, ${confidence}, ${reasoning}, ${targetPrice}, 'medium', ${createdAt}, NULL)
        ON CONFLICT DO NOTHING
      `);
    }
  }

  console.log("\n✅ Database seed complete!");
  await pool.end();
}

seed().catch(err => {
  console.error("Seed failed:", err);
  pool.end();
  process.exit(1);
});
