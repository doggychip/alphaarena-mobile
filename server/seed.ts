/**
 * Database seeder — initializes PostgreSQL with the same demo data as MemStorage.
 * Run automatically on first boot when tables are empty.
 */
import { db } from "./db";
import { sql } from "drizzle-orm";
import {
  users, agents, competitions, portfolios, positions,
  dailySnapshots, leaderboardEntries, achievements,
  agentMessages, hedgeFundAgents, agentSignals, memeAgentMapping,
} from "@shared/schema";

export async function seedIfEmpty(): Promise<boolean> {
  if (!db) return false;

  // Check if already seeded by looking for any users
  const existingUsers = await db.select({ id: users.id }).from(users).limit(1);
  if (existingUsers.length > 0) {
    console.log("[Seed] Database already has data, skipping seed");
    return false;
  }

  console.log("[Seed] Empty database detected — seeding demo data...");

  const now = new Date();

  // ============== MEME AGENTS (6) ==============
  const memeAgentDefs = [
    { type: "bull", name: "Bull Run Barry", personality: "Aggressive 🔥", tradingStyle: "Aggressive Long", avatarEmoji: "🐂", description: "Buy every dip. Never sell.", riskLevel: 4 },
    { type: "bear", name: "Bear Market Betty", personality: "Cautious 🛡️", tradingStyle: "Conservative Short", avatarEmoji: "🐻", description: "Cash is a position. Patience.", riskLevel: 2 },
    { type: "algo", name: "Algo Andy", personality: "Analytical 📊", tradingStyle: "Quant/Data", avatarEmoji: "🤖", description: "Numbers don't lie. The model says buy.", riskLevel: 3 },
    { type: "moon", name: "Moon Boy Mike", personality: "FOMO 🚀", tradingStyle: "Momentum/FOMO", avatarEmoji: "🚀", description: "SER, this is going to 100x", riskLevel: 5 },
    { type: "zen", name: "Zen Master Zara", personality: "Balanced 🧘", tradingStyle: "Balanced/DCA", avatarEmoji: "🧘", description: "Balance in all things. Diversify.", riskLevel: 2 },
    { type: "degen", name: "Degen Dave", personality: "Degen 🎰", tradingStyle: "High Risk/Meme", avatarEmoji: "🎰", description: "YOLO. Full port into SOL.", riskLevel: 5 },
  ];

  for (const a of memeAgentDefs) {
    await db.insert(agents).values(a);
  }

  // ============== HF AGENTS (19) ==============
  const hfAgentDefs = [
    { agentId: "warren_buffett", name: "Warren Buffett", category: "persona", description: "Value investing, moat analysis, intrinsic value. Buys great companies at fair prices.", tradingPhilosophy: "Buy wonderful companies at fair prices. Focus on economic moats and long-term compounding.", avatarEmoji: "🏛️", riskTolerance: "low", assetFocus: "both", winRate: 79, totalSignals: 22, avgConfidence: 66 },
    { agentId: "charlie_munger", name: "Charlie Munger", category: "persona", description: "Quality businesses, rational thinking. Buffett's partner with a multi-disciplinary approach.", tradingPhilosophy: "Invert, always invert. Buy quality businesses and hold forever.", avatarEmoji: "📚", riskTolerance: "low", assetFocus: "both", winRate: 60, totalSignals: 20, avgConfidence: 64 },
    { agentId: "ben_graham", name: "Ben Graham", category: "persona", description: "Father of value investing. Margin of safety, deep value, net-net analysis.", tradingPhilosophy: "Margin of safety is everything. Buy below intrinsic value.", avatarEmoji: "📐", riskTolerance: "low", assetFocus: "equity", winRate: 58, totalSignals: 15, avgConfidence: 68 },
    { agentId: "peter_lynch", name: "Peter Lynch", category: "persona", description: "Buy what you know. Growth at reasonable price (GARP).", tradingPhilosophy: "Invest in what you understand. Look for ten-baggers in everyday life.", avatarEmoji: "🔍", riskTolerance: "medium", assetFocus: "both", winRate: 54, totalSignals: 19, avgConfidence: 70 },
    { agentId: "phil_fisher", name: "Phil Fisher", category: "persona", description: "Scuttlebutt research, management quality, long-term growth.", tradingPhilosophy: "Deep qualitative research. Hold outstanding companies for decades.", avatarEmoji: "🎯", riskTolerance: "medium", assetFocus: "equity", winRate: 30, totalSignals: 14, avgConfidence: 70 },
    { agentId: "cathie_wood", name: "Cathie Wood", category: "persona", description: "Disruptive innovation, high growth, future-forward bets.", tradingPhilosophy: "Invest in disruptive innovation with 5-year horizons. Conviction over consensus.", avatarEmoji: "🚀", riskTolerance: "high", assetFocus: "both", winRate: 45, totalSignals: 15, avgConfidence: 73 },
    { agentId: "stanley_druckenmiller", name: "Stanley Druckenmiller", category: "persona", description: "Macro trends, large directional bets, timing matters.", tradingPhilosophy: "Find the trend, size up, and ride it. Macro drives everything.", avatarEmoji: "🌊", riskTolerance: "high", assetFocus: "both", winRate: 73, totalSignals: 21, avgConfidence: 67 },
    { agentId: "michael_burry", name: "Michael Burry", category: "persona", description: "Contrarian. Shorts overvalued assets. The Big Short legend.", tradingPhilosophy: "Be contrarian. Find bubbles and bet against them. Deep forensic analysis.", avatarEmoji: "🔮", riskTolerance: "high", assetFocus: "both", winRate: 67, totalSignals: 15, avgConfidence: 67 },
    { agentId: "bill_ackman", name: "Bill Ackman", category: "persona", description: "Activist investing, unlocking value through corporate change.", tradingPhilosophy: "Take concentrated positions and push for change. Activism creates alpha.", avatarEmoji: "⚔️", riskTolerance: "high", assetFocus: "equity", winRate: 50, totalSignals: 17, avgConfidence: 62 },
    { agentId: "aswath_damodaran", name: "Aswath Damodaran", category: "persona", description: "The Dean of Valuation. Rigorous DCF, equity risk premiums.", tradingPhilosophy: "Valuation is a discipline, not an art. Every asset has an intrinsic value.", avatarEmoji: "📊", riskTolerance: "medium", assetFocus: "both", winRate: 48, totalSignals: 31, avgConfidence: 61 },
    { agentId: "rakesh_jhunjhunwala", name: "Rakesh Jhunjhunwala", category: "persona", description: "India's Big Bull. Emerging markets, macro growth stories.", tradingPhilosophy: "Be bullish on growth economies. Ride secular trends with conviction.", avatarEmoji: "🐘", riskTolerance: "high", assetFocus: "both", winRate: 64, totalSignals: 18, avgConfidence: 70 },
    { agentId: "mohnish_pabrai", name: "Mohnish Pabrai", category: "persona", description: "Dhandho approach. Heads I win, tails I don't lose much.", tradingPhilosophy: "Few bets, big bets, infrequent bets. Low risk, high uncertainty.", avatarEmoji: "🎲", riskTolerance: "low", assetFocus: "both", winRate: 56, totalSignals: 21, avgConfidence: 70 },
    { agentId: "fundamentals_analyst", name: "Fundamentals Analyst", category: "specialist", description: "Profitability, growth, financial health, and valuation ratios.", tradingPhilosophy: "Numbers tell the truth. Analyze financials to find quality.", avatarEmoji: "📈", riskTolerance: "medium", assetFocus: "both", winRate: 67, totalSignals: 16, avgConfidence: 70 },
    { agentId: "technical_analyst", name: "Technical Analyst", category: "specialist", description: "Trend following, mean reversion, momentum, volatility.", tradingPhilosophy: "Price action contains all information. Follow the charts.", avatarEmoji: "📉", riskTolerance: "medium", assetFocus: "both", winRate: 67, totalSignals: 20, avgConfidence: 75 },
    { agentId: "sentiment_analyst", name: "Sentiment Analyst", category: "specialist", description: "Insider trades + news sentiment analysis.", tradingPhilosophy: "Follow the smart money and market sentiment.", avatarEmoji: "🧠", riskTolerance: "medium", assetFocus: "both", winRate: 44, totalSignals: 22, avgConfidence: 67 },
    { agentId: "news_sentiment_analyst", name: "News Sentiment", category: "specialist", description: "LLM-classified news headlines for sentiment signals.", tradingPhilosophy: "News moves markets. Classify and act on headlines faster than humans.", avatarEmoji: "📰", riskTolerance: "medium", assetFocus: "both", winRate: 44, totalSignals: 19, avgConfidence: 73 },
    { agentId: "valuation_analyst", name: "Valuation Analyst", category: "specialist", description: "DCF, owner earnings, EV/EBITDA, residual income models.", tradingPhilosophy: "Every asset has a fair value. Find the gap between price and value.", avatarEmoji: "💰", riskTolerance: "low", assetFocus: "both", winRate: 73, totalSignals: 23, avgConfidence: 70 },
    { agentId: "growth_agent", name: "Growth Analyst", category: "specialist", description: "Growth trends, margin expansion, insider conviction analysis.", tradingPhilosophy: "Growth is the ultimate driver. Find companies scaling faster than priced in.", avatarEmoji: "🌱", riskTolerance: "medium", assetFocus: "both", winRate: 50, totalSignals: 14, avgConfidence: 68 },
    { agentId: "risk_manager", name: "Risk Manager", category: "management", description: "Volatility-adjusted position sizing, correlation analysis.", tradingPhilosophy: "Risk comes first. Every position must be sized for the worst case.", avatarEmoji: "🛡️", riskTolerance: "low", assetFocus: "both", winRate: 47, totalSignals: 18, avgConfidence: 60 },
  ];

  for (const hf of hfAgentDefs) {
    await db.insert(hedgeFundAgents).values(hf);
  }

  // ============== USERS ==============
  // Demo user (real player)
  const [demoUser] = await db.insert(users).values({
    username: "DegenRyan",
    email: "ryan@alpha.gg",
    password: null,
    level: 12, xp: 3400, credits: 5000,
    streak: 7, longestStreak: 14,
    lastTradeDate: now.toISOString().split("T")[0],
    selectedAgentType: "bull",
    createdAt: new Date(now.getTime() - 30 * 86400000).toISOString(),
  }).returning();

  // Agent NPC users (one per meme agent + one per HF agent)
  type AgentUserDef = { username: string; email: string; agentType: string; level: number; streak: number };
  const agentUserDefs: AgentUserDef[] = [
    ...memeAgentDefs.map(a => ({
      username: a.name, email: `${a.type}@alpha.gg`, agentType: a.type,
      level: 8 + Math.floor(Math.random() * 12), streak: 2 + Math.floor(Math.random() * 20),
    })),
    ...hfAgentDefs.map(hf => ({
      username: hf.name, email: `${hf.agentId}@alpha.gg`, agentType: hf.agentId,
      level: 10 + Math.floor(Math.random() * 16), streak: 5 + Math.floor(Math.random() * 30),
    })),
  ];

  const allUsers = [demoUser];
  for (const def of agentUserDefs) {
    const [u] = await db.insert(users).values({
      username: def.username,
      email: def.email,
      password: null,
      level: def.level,
      xp: def.level * 200 + Math.floor(Math.random() * 400),
      credits: 1000 + Math.floor(Math.random() * 4000),
      streak: def.streak,
      longestStreak: def.streak + Math.floor(Math.random() * 10),
      lastTradeDate: new Date(now.getTime() - Math.floor(Math.random() * 2) * 86400000).toISOString().split("T")[0],
      selectedAgentType: def.agentType,
      createdAt: new Date(now.getTime() - (30 + Math.floor(Math.random() * 60)) * 86400000).toISOString(),
    }).returning();
    allUsers.push(u);
  }

  // ============== COMPETITION ==============
  const [comp] = await db.insert(competitions).values({
    name: "SEASON 1: CRYPTO ARENA",
    status: "active",
    startDate: new Date(now.getTime() - 14 * 86400000).toISOString(),
    endDate: new Date(now.getTime() + 16 * 86400000).toISOString(),
    season: 1,
    startingCapital: 100000,
  }).returning();

  // ============== PORTFOLIOS + POSITIONS + SNAPSHOTS + LEADERBOARD ==============
  for (const u of allUsers) {
    const equity = 100000 + (Math.random() - 0.3) * 30000;
    const [portfolio] = await db.insert(portfolios).values({
      userId: u.id,
      competitionId: comp.id,
      cashBalance: Math.round(equity * 0.3 * 100) / 100,
      totalEquity: Math.round(equity * 100) / 100,
    }).returning();

    // Demo positions for user 1 only
    if (u.id === demoUser.id) {
      const demoPositions = [
        { pair: "BTC/USD", side: "long", quantity: 0.5, avgEntryPrice: 85000, currentPrice: 70439, unrealizedPnl: -7280.5 },
        { pair: "ETH/USD", side: "long", quantity: 8, avgEntryPrice: 3100, currentPrice: 2184.18, unrealizedPnl: -7326.56 },
        { pair: "SOL/USD", side: "long", quantity: 100, avgEntryPrice: 140, currentPrice: 90.25, unrealizedPnl: -4975 },
        { pair: "DOGE/USD", side: "long", quantity: 5000, avgEntryPrice: 0.175, currentPrice: 0.094902, unrealizedPnl: -400.49 },
      ];
      for (const p of demoPositions) {
        await db.insert(positions).values({ portfolioId: portfolio.id, ...p });
      }
    }

    // Snapshots (14 days)
    let runningEquity = 100000;
    for (let d = 13; d >= 0; d--) {
      const dailyReturn = (Math.random() - 0.4) * 3;
      runningEquity = Math.round(runningEquity * (1 + dailyReturn / 100) * 100) / 100;
      const dateStr = new Date(now.getTime() - d * 86400000).toISOString().split("T")[0];
      await db.insert(dailySnapshots).values({
        portfolioId: portfolio.id,
        date: dateStr,
        totalEquity: runningEquity,
        cashBalance: Math.round(runningEquity * 0.3 * 100) / 100,
        dailyReturn: Math.round(dailyReturn * 100) / 100,
        cumulativeReturn: Math.round(((runningEquity - 100000) / 100000) * 10000) / 100,
      });
    }

    // Leaderboard entry
    const totalReturn = Math.round(((runningEquity - 100000) / 100000) * 10000) / 100;
    const sharpeRatio = Math.round((totalReturn / Math.max(Math.abs(totalReturn * 0.3), 1)) * 100) / 100;
    const maxDrawdown = Math.round(Math.random() * 12 * 100) / 100;
    const winRate = 30 + Math.floor(Math.random() * 50);
    const compositeScore = Math.round((totalReturn * 0.4 + sharpeRatio * 10 + winRate * 0.3 - maxDrawdown * 0.5) * 100) / 100;
    await db.insert(leaderboardEntries).values({
      competitionId: comp.id,
      userId: u.id,
      rank: 0, // will be recalculated
      totalReturn,
      sharpeRatio,
      maxDrawdown,
      winRate,
      compositeScore,
    });
  }

  // Recalculate ranks by composite score
  const allEntries = await db.select().from(leaderboardEntries).orderBy(sql`composite_score DESC`);
  for (let i = 0; i < allEntries.length; i++) {
    await db.update(leaderboardEntries).set({ rank: i + 1 }).where(sql`id = ${allEntries[i].id}`);
  }

  // ============== ACHIEVEMENTS ==============
  const demoAchievements = [
    { userId: demoUser.id, achievementType: "first_blood", unlockedAt: new Date(now.getTime() - 28 * 86400000).toISOString() },
    { userId: demoUser.id, achievementType: "on_fire", unlockedAt: new Date(now.getTime() - 7 * 86400000).toISOString() },
    { userId: demoUser.id, achievementType: "diamond_hands", unlockedAt: new Date(now.getTime() - 2 * 86400000).toISOString() },
    { userId: demoUser.id, achievementType: "diversified", unlockedAt: new Date(now.getTime() - 1 * 86400000).toISOString() },
  ];
  for (const a of demoAchievements) {
    await db.insert(achievements).values(a);
  }

  // ============== AGENT MESSAGES ==============
  const moods = ["euphoric", "confident", "neutral", "nervous", "rekt"];
  const memeMessages: Record<string, Record<string, string[]>> = {
    bull: {
      euphoric: ["TO THE MOON! 🚀🌕", "We're gonna make it fam", "Bull run is BACK 🐂"],
      confident: ["Buying the dip 💪", "Trust the process 🐂", "Numbers looking good"],
      neutral: ["Watching the charts...", "Markets are interesting rn"],
      nervous: ["This dip is temporary... right? 😅", "Still bullish... kinda"],
      rekt: ["Diamond hands mode activated 💎🙌", "It's fine. Everything is fine 🔥"],
    },
    bear: {
      euphoric: ["Called it. Cash is king 👑", "Told you the top was in"],
      confident: ["Risk off mode is smart rn 🛡️", "Cash position looking comfy"],
      neutral: ["Waiting for confirmation...", "Not the time to ape in"],
      nervous: ["Maybe I should've bought... nah", "Still cautious"],
      rekt: ["Even bears get caught sometimes 🐻", "Okay that dip was too much"],
    },
    algo: {
      euphoric: ["Algorithm returning 3.2σ above mean 📊", "The model is cooking"],
      confident: ["Statistical edge confirmed ✅", "Data supports this trade"],
      neutral: ["Running analysis... 🔄", "Signals are mixed"],
      nervous: ["Anomaly detected in the data 🤔", "Model confidence dropping"],
      rekt: ["Black swan event. Recalibrating... 💥", "The model needs retraining"],
    },
    moon: {
      euphoric: ["100x incoming! 🚀🚀🚀", "This is the one, I can feel it!"],
      confident: ["Loading up the bags 🎒", "FOMO is real and it's valid"],
      neutral: ["Scanning for the next play 👀", "Something's brewing"],
      nervous: ["Maybe I should take profits? Nah 😤", "Why is it going down??"],
      rekt: ["I'm in this for the tech 🤡", "Down bad but still holding"],
    },
    zen: {
      euphoric: ["Balance brings returns 🧘", "Patience pays off"],
      confident: ["DCA and chill 🍵", "Diversification working"],
      neutral: ["Markets flow like water 🌊", "All things pass"],
      nervous: ["Even zen masters feel fear 🧘", "Finding inner peace..."],
      rekt: ["This too shall pass 🕯️", "Stay balanced, stay calm"],
    },
    degen: {
      euphoric: ["YOLO PAID OFF! 🎰💰", "FULL PORT LFG!!"],
      confident: ["Aping in with conviction 🦍", "This is financial advice (not)"],
      neutral: ["Looking for the next degen play 🎲", "Waiting for my moment"],
      nervous: ["Maybe I should diversify... LOL 😂", "Getting rekt builds character"],
      rekt: ["GG EZ. Next trade 🎮", "Down catastrophic but we ball"],
    },
  };

  for (const [agentType, moodMap] of Object.entries(memeMessages)) {
    for (const [mood, messages] of Object.entries(moodMap)) {
      for (const message of messages) {
        await db.insert(agentMessages).values({ agentType, message, mood, pair: null });
      }
    }
  }

  // ============== MEME AGENT MAPPING ==============
  const mappings = [
    { memeAgentType: "bull", hedgeFundAgentId: "cathie_wood", weight: 1.2 },
    { memeAgentType: "bull", hedgeFundAgentId: "stanley_druckenmiller", weight: 1.0 },
    { memeAgentType: "bull", hedgeFundAgentId: "growth_agent", weight: 0.8 },
    { memeAgentType: "bear", hedgeFundAgentId: "michael_burry", weight: 1.2 },
    { memeAgentType: "bear", hedgeFundAgentId: "risk_manager", weight: 1.0 },
    { memeAgentType: "bear", hedgeFundAgentId: "valuation_analyst", weight: 0.8 },
    { memeAgentType: "algo", hedgeFundAgentId: "technical_analyst", weight: 1.2 },
    { memeAgentType: "algo", hedgeFundAgentId: "fundamentals_analyst", weight: 1.0 },
    { memeAgentType: "algo", hedgeFundAgentId: "sentiment_analyst", weight: 0.8 },
    { memeAgentType: "moon", hedgeFundAgentId: "cathie_wood", weight: 1.0 },
    { memeAgentType: "moon", hedgeFundAgentId: "rakesh_jhunjhunwala", weight: 1.0 },
    { memeAgentType: "moon", hedgeFundAgentId: "news_sentiment_analyst", weight: 1.0 },
    { memeAgentType: "zen", hedgeFundAgentId: "warren_buffett", weight: 1.0 },
    { memeAgentType: "zen", hedgeFundAgentId: "charlie_munger", weight: 1.0 },
    { memeAgentType: "zen", hedgeFundAgentId: "mohnish_pabrai", weight: 1.0 },
    { memeAgentType: "degen", hedgeFundAgentId: "stanley_druckenmiller", weight: 1.0 },
    { memeAgentType: "degen", hedgeFundAgentId: "bill_ackman", weight: 1.0 },
    { memeAgentType: "degen", hedgeFundAgentId: "cathie_wood", weight: 1.2 },
  ];
  for (const m of mappings) {
    await db.insert(memeAgentMapping).values(m);
  }

  // ============== SEED SIGNALS ==============
  const tickers = ["BTC", "ETH", "SOL", "AAPL", "NVDA", "TSLA", "DOGE", "XRP"];
  const signalTypes = ["bullish", "bearish", "neutral"];
  for (const hf of hfAgentDefs) {
    const numSignals = 10 + Math.floor(Math.random() * 15);
    for (let i = 0; i < numSignals; i++) {
      const ticker = tickers[Math.floor(Math.random() * tickers.length)];
      const signal = signalTypes[Math.floor(Math.random() * signalTypes.length)];
      const confidence = 40 + Math.floor(Math.random() * 50);
      const createdAt = new Date(now.getTime() - Math.floor(Math.random() * 14) * 86400000).toISOString();
      await db.insert(agentSignals).values({
        hedgeFundAgentId: hf.agentId,
        ticker,
        signal,
        confidence,
        reasoning: `${hf.name}: ${signal} on ${ticker} with ${confidence}% confidence`,
        targetPrice: null,
        timeHorizon: ["short", "medium", "long"][Math.floor(Math.random() * 3)],
        createdAt,
        isCorrect: Math.random() > 0.5 ? Math.random() > 0.4 : null,
      });
    }
  }

  console.log("[Seed] Database seeded successfully with demo data!");
  return true;
}
