import type {
  User, InsertUser,
  Agent, InsertAgent,
  Competition, InsertCompetition,
  Portfolio, InsertPortfolio,
  Position, InsertPosition,
  Trade, InsertTrade,
  DailySnapshot, InsertDailySnapshot,
  LeaderboardEntry, InsertLeaderboardEntry,
  Achievement, InsertAchievement,
  AgentMessage, InsertAgentMessage,
  Stake, InsertStake,
  StakingReward, InsertStakingReward,
  HedgeFundAgent, InsertHedgeFundAgent,
  AgentSignal, InsertAgentSignal,
  MemeAgentMapping, InsertMemeAgentMapping,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): User | undefined;
  getAllUsers(): User[];
  updateUser(id: number, data: Partial<User>): User | undefined;

  // Agents
  getAgent(type: string): Agent | undefined;
  getAllAgents(): Agent[];

  // Competitions
  getActiveCompetition(): Competition | undefined;

  // Portfolios
  getPortfolio(userId: number): Portfolio | undefined;
  updatePortfolio(id: number, data: Partial<Portfolio>): Portfolio | undefined;

  // Positions
  getPositions(portfolioId: number): Position[];
  addPosition(pos: InsertPosition): Position;

  // Trades
  getTrades(portfolioId: number): Trade[];
  addTrade(trade: InsertTrade): Trade;

  // Daily Snapshots
  getSnapshots(portfolioId: number): DailySnapshot[];

  // Leaderboard
  getLeaderboard(competitionId: number): (LeaderboardEntry & { user: User; agent: Agent })[];
  getLeaderboardEntry(userId: number): LeaderboardEntry | undefined;

  // Achievements
  getUserAchievements(userId: number): Achievement[];
  addAchievement(ach: InsertAchievement): Achievement;

  // Agent Messages
  getAgentMessages(agentType: string, mood?: string): AgentMessage[];
  getRandomAgentMessage(agentType: string, mood?: string): AgentMessage | undefined;

  // Staking
  getStakesByStaker(stakerId: number): Stake[];
  getStakesByTarget(targetUserId: number): Stake[];
  getStake(stakerId: number, targetUserId: number): Stake | undefined;
  getTotalStakedOnUser(targetUserId: number): number;
  addStake(stake: InsertStake): Stake;
  removeStake(stakerId: number, targetUserId: number): boolean;
  updateStake(stakerId: number, targetUserId: number, amount: number): Stake | undefined;

  // Staking Rewards
  getRewardsByStaker(stakerId: number): StakingReward[];
  addReward(reward: InsertStakingReward): StakingReward;
  getStakingLeaderboard(): { targetUserId: number; totalStaked: number; stakerCount: number }[];

  // Hedge Fund Agents
  getHedgeFundAgent(agentId: string): HedgeFundAgent | undefined;
  getAllHedgeFundAgents(): HedgeFundAgent[];
  getHedgeFundAgentsByCategory(category: string): HedgeFundAgent[];

  // Agent Signals
  getSignalsByAgent(agentId: string, limit?: number): AgentSignal[];
  getSignalsByTicker(ticker: string, limit?: number): AgentSignal[];
  getLatestSignals(limit?: number): AgentSignal[];
  getLatestSignalByAgent(agentId: string, ticker?: string): AgentSignal | undefined;
  getAgentSignalStats(agentId: string): { winRate: number; totalSignals: number; avgConfidence: number };

  // Meme ↔ HF Mapping
  getMemeAgentMapping(memeAgentType: string): MemeAgentMapping[];
  getCompositeSignal(memeAgentType: string, ticker: string): { signal: string; confidence: number; contributors: any[] } | undefined;

  // HF Agent Staking
  getHfAgentStakes(stakerId: number): { hedgeFundAgentId: string; amount: number; stakedAt: string }[];
  addHfAgentStake(stakerId: number, hedgeFundAgentId: string, amount: number): void;
}

// Seed data
const DEMO_USER_ID = 1;

function generateSeedData() {
  // 6 Agent Types
  const agents: Agent[] = [
    { id: 1, type: "bull", name: "Bull Run Barry", personality: "Aggressive 🔥", tradingStyle: "Aggressive Long", avatarEmoji: "🐂", description: "Buy every dip. Never sell.", riskLevel: 4 },
    { id: 2, type: "bear", name: "Bear Market Betty", personality: "Cautious 🛡️", tradingStyle: "Conservative Short", avatarEmoji: "🐻", description: "Cash is a position. Patience.", riskLevel: 2 },
    { id: 3, type: "algo", name: "Algo Andy", personality: "Analytical 📊", tradingStyle: "Quant/Data", avatarEmoji: "🤖", description: "Numbers don't lie. The model says buy.", riskLevel: 3 },
    { id: 4, type: "moon", name: "Moon Boy Mike", personality: "FOMO 🚀", tradingStyle: "Momentum/FOMO", avatarEmoji: "🚀", description: "SER, this is going to 100x", riskLevel: 5 },
    { id: 5, type: "zen", name: "Zen Master Zara", personality: "Balanced 🧘", tradingStyle: "Balanced/DCA", avatarEmoji: "🧘", description: "Balance in all things. Diversify.", riskLevel: 2 },
    { id: 6, type: "degen", name: "Degen Dave", personality: "Degen 🎰", tradingStyle: "High Risk/Meme", avatarEmoji: "🎰", description: "YOLO. Full port into SOL.", riskLevel: 5 },
  ];

  // Usernames for seed
  const usernames = [
    "CryptoKing", "SolanaMaxi", "DiamondHands42", "ApeTrader", "LunarDegen",
    "WhaleWatcher", "PumpItUp", "BearSlayer", "TokenHunter", "MoonShot99",
    "AlphaSeeker", "DipBuyer", "GigaBrain", "RetailAndy", "DeFiDegen",
    "YieldFarmer", "NFTFlip", "ShortSqueeze", "GasOptimizer", "MEVBot",
    "RugSurvivor", "LiquidityKing", "StakeNBake", "BridgeRunner", "L2Maxi",
    "ZKProver", "ChainHopper", "FlashLoan", "OracleReader", "VaultManager",
    "ProtocolPirate", "GovernanceGuru"
  ];

  const agentTypes = ["bull", "bear", "algo", "moon", "zen", "degen"];
  const now = new Date();

  // Demo user + 32 others
  const users: User[] = [
    {
      id: 1, username: "DegenRyan", email: "ryan@alpha.gg",
      avatarUrl: null, level: 12, xp: 3400, credits: 5000, streak: 7,
      longestStreak: 14, lastTradeDate: now.toISOString().split("T")[0],
      selectedAgentType: "bull", createdAt: new Date(now.getTime() - 30 * 86400000).toISOString(),
    },
  ];

  for (let i = 0; i < 32; i++) {
    const level = Math.floor(Math.random() * 25) + 1;
    users.push({
      id: i + 2,
      username: usernames[i] || `User${i}`,
      email: `${usernames[i]?.toLowerCase() || `user${i}`}@alpha.gg`,
      avatarUrl: null,
      level,
      xp: level * 200 + Math.floor(Math.random() * 400),
      credits: 500 + Math.floor(Math.random() * 4500),
      streak: Math.floor(Math.random() * 20),
      longestStreak: Math.floor(Math.random() * 30) + 1,
      lastTradeDate: new Date(now.getTime() - Math.floor(Math.random() * 3) * 86400000).toISOString().split("T")[0],
      selectedAgentType: agentTypes[Math.floor(Math.random() * 6)],
      createdAt: new Date(now.getTime() - (30 + Math.floor(Math.random() * 60)) * 86400000).toISOString(),
    });
  }

  // Competition
  const competition: Competition = {
    id: 1, name: "SEASON 1: CRYPTO ARENA", status: "active",
    startDate: new Date(now.getTime() - 14 * 86400000).toISOString(),
    endDate: new Date(now.getTime() + 16 * 86400000).toISOString(),
    season: 1, startingCapital: 100000,
  };

  // Portfolios for all users
  const portfolios: Portfolio[] = users.map((u, i) => {
    const equity = 100000 + (Math.random() - 0.3) * 30000;
    return {
      id: i + 1,
      userId: u.id,
      competitionId: 1,
      cashBalance: Math.round(equity * 0.3 * 100) / 100,
      totalEquity: Math.round(equity * 100) / 100,
    };
  });
  // Fix demo user portfolio
  portfolios[0] = { id: 1, userId: 1, competitionId: 1, cashBalance: 30735, totalEquity: 102450 };

  // Positions for demo user
  const positions: Position[] = [
    { id: 1, portfolioId: 1, pair: "BTC/USD", side: "long", quantity: 0.5, avgEntryPrice: 85000, currentPrice: 87420, unrealizedPnl: 1210 },
    { id: 2, portfolioId: 1, pair: "ETH/USD", side: "long", quantity: 8, avgEntryPrice: 3100, currentPrice: 3180, unrealizedPnl: 640 },
    { id: 3, portfolioId: 1, pair: "SOL/USD", side: "long", quantity: 100, avgEntryPrice: 140, currentPrice: 148, unrealizedPnl: 800 },
    { id: 4, portfolioId: 1, pair: "DOGE/USD", side: "long", quantity: 5000, avgEntryPrice: 0.175, currentPrice: 0.165, unrealizedPnl: -50 },
  ];

  // Some trades for demo user
  const trades: Trade[] = [
    { id: 1, portfolioId: 1, pair: "BTC/USD", side: "buy", quantity: 0.5, price: 85000, totalValue: 42500, fee: 42.5, executedAt: new Date(now.getTime() - 5 * 86400000).toISOString() },
    { id: 2, portfolioId: 1, pair: "ETH/USD", side: "buy", quantity: 8, price: 3100, totalValue: 24800, fee: 24.8, executedAt: new Date(now.getTime() - 4 * 86400000).toISOString() },
    { id: 3, portfolioId: 1, pair: "SOL/USD", side: "buy", quantity: 100, price: 140, totalValue: 14000, fee: 14, executedAt: new Date(now.getTime() - 3 * 86400000).toISOString() },
    { id: 4, portfolioId: 1, pair: "DOGE/USD", side: "buy", quantity: 5000, price: 0.175, totalValue: 875, fee: 0.88, executedAt: new Date(now.getTime() - 2 * 86400000).toISOString() },
  ];

  // Daily snapshots for demo user (14 days)
  const snapshots: DailySnapshot[] = [];
  let runningEquity = 100000;
  for (let d = 13; d >= 0; d--) {
    const dailyReturn = (Math.random() - 0.4) * 3;
    runningEquity = Math.round(runningEquity * (1 + dailyReturn / 100) * 100) / 100;
    const dateStr = new Date(now.getTime() - d * 86400000).toISOString().split("T")[0];
    snapshots.push({
      id: snapshots.length + 1,
      portfolioId: 1,
      date: dateStr,
      totalEquity: runningEquity,
      cashBalance: Math.round(runningEquity * 0.3 * 100) / 100,
      dailyReturn: Math.round(dailyReturn * 100) / 100,
      cumulativeReturn: Math.round(((runningEquity - 100000) / 100000) * 10000) / 100,
    });
  }

  // Leaderboard entries for all users, sorted by compositeScore
  const leaderboardUnsorted: Omit<LeaderboardEntry, "rank">[] = users.map(u => {
    const totalReturn = Math.round((Math.random() - 0.3) * 40 * 100) / 100;
    const sharpe = Math.round((Math.random() * 3) * 100) / 100;
    const maxDrawdown = Math.round(Math.random() * 20 * 100) / 100;
    const winRate = Math.round((40 + Math.random() * 35) * 100) / 100;
    const compositeScore = Math.round((totalReturn * 0.4 + sharpe * 10 + (100 - maxDrawdown) * 0.1 + winRate * 0.2) * 100) / 100;
    return {
      id: u.id, competitionId: 1, userId: u.id,
      totalReturn, sharpeRatio: sharpe, maxDrawdown, winRate, compositeScore,
    };
  });

  leaderboardUnsorted.sort((a, b) => b.compositeScore - a.compositeScore);
  const leaderboard: LeaderboardEntry[] = leaderboardUnsorted.map((entry, i) => ({
    ...entry,
    rank: i + 1,
  }));

  // Achievements - demo user has some unlocked
  const achievementDefs = [
    "first_blood", "on_fire", "diamond_hands", "whale_alert",
    "top_10", "sharpshooter", "to_the_moon", "streak_master",
    "diversified", "paper_hands", "hodl_king", "speed_demon",
  ];

  const userAchievements: Achievement[] = [
    { id: 1, userId: 1, achievementType: "first_blood", unlockedAt: new Date(now.getTime() - 28 * 86400000).toISOString() },
    { id: 2, userId: 1, achievementType: "on_fire", unlockedAt: new Date(now.getTime() - 7 * 86400000).toISOString() },
    { id: 3, userId: 1, achievementType: "diamond_hands", unlockedAt: new Date(now.getTime() - 2 * 86400000).toISOString() },
    { id: 4, userId: 1, achievementType: "diversified", unlockedAt: new Date(now.getTime() - 1 * 86400000).toISOString() },
  ];

  // Add some achievements for other users
  let achId = 5;
  for (let i = 2; i <= 33; i++) {
    const numAch = Math.floor(Math.random() * 4) + 1;
    for (let j = 0; j < numAch; j++) {
      const achType = achievementDefs[Math.floor(Math.random() * achievementDefs.length)];
      userAchievements.push({
        id: achId++,
        userId: i,
        achievementType: achType,
        unlockedAt: new Date(now.getTime() - Math.floor(Math.random() * 30) * 86400000).toISOString(),
      });
    }
  }

  // Agent messages (20+ per agent type)
  const agentMessagesData: AgentMessage[] = [];
  let msgId = 1;

  const bullMessages = [
    { msg: "BTC looking strong rn 📈 time to add more!", mood: "confident" },
    { msg: "Every dip is a buying opportunity. HODL and add 💎🙌", mood: "confident" },
    { msg: "ETH just broke resistance. We're going up! 🚀", mood: "euphoric" },
    { msg: "SOL is pumping! I called it last week 😤", mood: "euphoric" },
    { msg: "Markets looking green af today. LFG! 🔥", mood: "euphoric" },
    { msg: "Small pullback, nothing to worry about. Buy more 🐂", mood: "neutral" },
    { msg: "Consolidation phase. This is healthy. Stack sats 📊", mood: "neutral" },
    { msg: "BNB forming a bullish flag. Watch this 👀", mood: "confident" },
    { msg: "DOT looking undervalued here. Time to accumulate 🎯", mood: "confident" },
    { msg: "LINK marines, assemble! This is our moment 🔗", mood: "euphoric" },
    { msg: "Ok that dump was rough but I'm still bullish long term 📉", mood: "nervous" },
    { msg: "Red day but the trend is our friend. Diamond hands activated 💎", mood: "nervous" },
    { msg: "Buying the dip on ETH here. Conviction play 🎲", mood: "confident" },
    { msg: "ADA showing some life! Could be a sleeper pick 🃏", mood: "neutral" },
    { msg: "Volume picking up on BTC. Big move incoming 📊", mood: "confident" },
    { msg: "AVAX ecosystem is thriving. Bullish! 🏔️", mood: "confident" },
    { msg: "XRP settlement soon??? Imagine the pump 💧", mood: "euphoric" },
    { msg: "Alts rotating. Get ready for alt season 🎪", mood: "euphoric" },
    { msg: "We're gonna make it. Trust the process 🐂", mood: "confident" },
    { msg: "This is the dip I've been waiting for! Loading up 🛒", mood: "nervous" },
    { msg: "Pain is temporary. Gains are eternal 💪", mood: "rekt" },
    { msg: "Down bad but refusing to sell. These are diamond hands 💎", mood: "rekt" },
  ];

  const bearMessages = [
    { msg: "BTC looking overextended. Take some profits here 📉", mood: "confident" },
    { msg: "I smell a correction coming. Cash is king rn 👑", mood: "confident" },
    { msg: "ETH losing steam at resistance. Be careful 🛡️", mood: "neutral" },
    { msg: "SOL pumping? That's a sell signal in my book 📕", mood: "confident" },
    { msg: "Risk/reward isn't great here. I'd wait 🧊", mood: "neutral" },
    { msg: "Called it. Markets dropping. Hope you took profits 📉", mood: "euphoric" },
    { msg: "Short positions printing! I love being right 😎", mood: "euphoric" },
    { msg: "Market cap ratios looking bearish. More pain ahead 🐻", mood: "confident" },
    { msg: "Volume declining on this rally. Don't trust it 👎", mood: "nervous" },
    { msg: "DOGE is a meme coin for a reason. Stay away 🙅", mood: "neutral" },
    { msg: "Hmm, market proving me wrong today. Staying cautious 🤔", mood: "nervous" },
    { msg: "Ok bulls, you win today. But I'll be back 🐻", mood: "nervous" },
    { msg: "BNB looking weak. Might open a small short 📐", mood: "confident" },
    { msg: "ADA making a dead cat bounce. Don't fall for it 🐱", mood: "confident" },
    { msg: "Funding rates are insane. Longs about to get rekt 💀", mood: "euphoric" },
    { msg: "Remember: nobody went broke taking profits 💰", mood: "neutral" },
    { msg: "DXY rising. Risk assets in trouble 📊", mood: "confident" },
    { msg: "Macro looking terrible. Cash gang for now 💵", mood: "confident" },
    { msg: "Market euphoria = danger zone. Scale out 🚨", mood: "confident" },
    { msg: "OK I was wrong, this rally is real. Adjusting positions 😤", mood: "rekt" },
    { msg: "Getting squeezed on my shorts. Pain 💀", mood: "rekt" },
  ];

  const algoMessages = [
    { msg: "Model confidence: 73% bullish on BTC. Executing long 🤖", mood: "confident" },
    { msg: "RSI divergence detected on ETH/USD. Potential reversal 📊", mood: "neutral" },
    { msg: "Correlation matrix shows SOL decorrelating from BTC. Interesting 🔬", mood: "confident" },
    { msg: "Volatility compression detected. Breakout imminent ⚡", mood: "confident" },
    { msg: "Mean reversion signal on DOGE. Short-term bounce expected 📈", mood: "neutral" },
    { msg: "Sharpe ratio on current strategy: 1.87. Within parameters ✅", mood: "confident" },
    { msg: "Sentiment analysis: 82% bullish Twitter. Contrarian signal? 🤔", mood: "neutral" },
    { msg: "Running Monte Carlo simulation... 67% chance of upside 🎲", mood: "confident" },
    { msg: "Order flow analysis: heavy accumulation on BTC 🐋", mood: "euphoric" },
    { msg: "VWAP rejection on ADA. Avoid for now 🚫", mood: "neutral" },
    { msg: "Bollinger Bands squeezing on AVAX. Watch for expansion 📐", mood: "neutral" },
    { msg: "On-chain metrics: whale wallets accumulating ETH 📊", mood: "confident" },
    { msg: "Grid bot performing at 12% monthly. Running smoothly 🤖", mood: "euphoric" },
    { msg: "Maximum drawdown exceeded threshold. Reducing position size ⚠️", mood: "nervous" },
    { msg: "Fear & Greed index at 23. Historically a buy signal 📊", mood: "confident" },
    { msg: "Backtesting complete. Strategy profitable in 78% of scenarios ✅", mood: "confident" },
    { msg: "Market microstructure suggests accumulation phase 🔍", mood: "neutral" },
    { msg: "Cross-exchange spread anomaly detected on XRP. Arb opportunity? 💡", mood: "confident" },
    { msg: "Error in model prediction. Recalibrating parameters 🔧", mood: "nervous" },
    { msg: "Model completely wrong on this one. Resetting signals 💀", mood: "rekt" },
  ];

  const moonMessages = [
    { msg: "SER, BTC TO 200K IS NOT A MEME 🚀🚀🚀", mood: "euphoric" },
    { msg: "SOL IS GOING TO FLIP ETH I CAN FEEL IT 🔮", mood: "euphoric" },
    { msg: "WAGMI! JUST BOUGHT MORE! LFG! 🌙", mood: "euphoric" },
    { msg: "bro trust me, this altcoin season is going to be INSANE 🎪", mood: "confident" },
    { msg: "100x gem incoming... I can smell it 👃", mood: "confident" },
    { msg: "ETH merge was just the beginning. ETH to 10K 🚀", mood: "euphoric" },
    { msg: "Why are you not all in? This is free money ser 💰", mood: "confident" },
    { msg: "DOGE to $1 is inevitable. It's written in the stars ⭐", mood: "euphoric" },
    { msg: "BNB is literally printing money rn. Load the bags 🎒", mood: "confident" },
    { msg: "Max leverage, full port. This is the way 🫡", mood: "euphoric" },
    { msg: "Ok small dip, but we're going to PUMP so hard after 📈", mood: "neutral" },
    { msg: "Paper hands getting shaken out. More for us 😈", mood: "neutral" },
    { msg: "This dip is just fuel for the next leg up 🔥", mood: "nervous" },
    { msg: "Bro I might have over-leveraged but WAGMI 😅", mood: "nervous" },
    { msg: "Red candle? I don't see it. Only see opportunity 👀", mood: "neutral" },
    { msg: "LINK ecosystem is exploding. Real world assets season 🌍", mood: "euphoric" },
    { msg: "I literally cannot stop buying. Send help 🆘🚀", mood: "euphoric" },
    { msg: "Next stop: Lambo dealership 🏎️", mood: "euphoric" },
    { msg: "OK maybe I was too bullish... temporarily 😬", mood: "nervous" },
    { msg: "GUH. Liquidated. But I'll be back stronger 💪💀", mood: "rekt" },
    { msg: "Down 80% but diamond hands activated 💎🙌", mood: "rekt" },
  ];

  const zenMessages = [
    { msg: "Markets are cyclical. Stay centered and DCA 🧘", mood: "neutral" },
    { msg: "Balance your portfolio. No single asset should dominate ☯️", mood: "neutral" },
    { msg: "Patience is the greatest trading strategy 🌊", mood: "confident" },
    { msg: "The market rewards the disciplined. Stay the course 🎯", mood: "confident" },
    { msg: "Diversification: 40% BTC, 30% ETH, 20% alts, 10% cash 📊", mood: "neutral" },
    { msg: "Good day in the markets. But don't get attached to gains 🪷", mood: "confident" },
    { msg: "Red day? Same strategy. DCA doesn't care about candles 🕯️", mood: "neutral" },
    { msg: "Breathe. The market will be here tomorrow 🌸", mood: "neutral" },
    { msg: "Volatility is natural. Like waves in the ocean 🌊", mood: "neutral" },
    { msg: "Rebalancing portfolio today. Keep allocations on target ⚖️", mood: "confident" },
    { msg: "SOL rally is nice but stick to your allocation plan 📋", mood: "neutral" },
    { msg: "FOMO is the enemy of returns. Trust your process 🧘‍♀️", mood: "neutral" },
    { msg: "A bad day is not a bad strategy. Zoom out 🔭", mood: "nervous" },
    { msg: "Market down 5%? Good. Time for systematic buying 🛒", mood: "nervous" },
    { msg: "ETH staking rewards compound beautifully over time ⏳", mood: "confident" },
    { msg: "Small, consistent gains beat big bets long term 🐢", mood: "confident" },
    { msg: "The tao of trading: act without forcing 🌿", mood: "neutral" },
    { msg: "Harmony in the portfolio brings peace of mind 🕊️", mood: "confident" },
    { msg: "Even the calmest mind feels pain sometimes. This is rough 😔", mood: "rekt" },
    { msg: "A lesson in humility. The market teaches us all 🙏", mood: "rekt" },
  ];

  const degenMessages = [
    { msg: "YOLO'd my entire portfolio into SOL LFG 🎰🚀", mood: "euphoric" },
    { msg: "50x leverage on BTC. Living on the edge baby 🔥", mood: "euphoric" },
    { msg: "APE IN FIRST, ASK QUESTIONS LATER 🦍", mood: "euphoric" },
    { msg: "Just found a 100x gem. All in. NFA 🤫", mood: "confident" },
    { msg: "Risk management? Never heard of her 😈", mood: "confident" },
    { msg: "DOGE to $10 I'M NOT EVEN JOKING 🐕🚀", mood: "euphoric" },
    { msg: "Flipping shitcoins like burgers rn 🍔💰", mood: "euphoric" },
    { msg: "Bought the top again but it's different this time 🤡", mood: "neutral" },
    { msg: "Sir this is a casino and I'm the high roller 🎲", mood: "confident" },
    { msg: "Full degen mode activated. Portfolio: 100% memecoins 🎪", mood: "euphoric" },
    { msg: "I'm either gonna be rich or broke by Friday 📅", mood: "confident" },
    { msg: "Aping into the latest narrative. No research needed 🧠", mood: "confident" },
    { msg: "Leverage liquidation? That's just a speed bump 😤", mood: "nervous" },
    { msg: "Down bad but I'll just double down. Can't lose 4ever 🤷", mood: "nervous" },
    { msg: "Sold everything for AVAX. Trust the ecosystem 🔺", mood: "confident" },
    { msg: "Portfolio allocation: 100% SOL. That's diversified enough 😂", mood: "euphoric" },
    { msg: "Someone stop me from buying more DOGE 🐕", mood: "neutral" },
    { msg: "Ramen diet activated but we'll eat steak soon 🍜→🥩", mood: "nervous" },
    { msg: "I'm financially ruined lmao. Starting over tomorrow 💀", mood: "rekt" },
    { msg: "GUH. Account blown up. But what a ride 🎢💀", mood: "rekt" },
    { msg: "Down 95% but at least I have stories to tell 📖", mood: "rekt" },
  ];

  const allMsgSets: { type: string; messages: { msg: string; mood: string }[] }[] = [
    { type: "bull", messages: bullMessages },
    { type: "bear", messages: bearMessages },
    { type: "algo", messages: algoMessages },
    { type: "moon", messages: moonMessages },
    { type: "zen", messages: zenMessages },
    { type: "degen", messages: degenMessages },
  ];

  for (const set of allMsgSets) {
    for (const m of set.messages) {
      const pairs = ["BTC/USD", "ETH/USD", "SOL/USD", "DOGE/USD", "BNB/USD", "ADA/USD", "AVAX/USD", "XRP/USD", "DOT/USD", "LINK/USD"];
      // Assign a random pair if message mentions one, else null
      let pair: string | null = null;
      for (const p of pairs) {
        const symbol = p.split("/")[0];
        if (m.msg.toUpperCase().includes(symbol)) {
          pair = p;
          break;
        }
      }
      agentMessagesData.push({
        id: msgId++,
        agentType: set.type,
        message: m.msg,
        mood: m.mood,
        pair,
      });
    }
  }

  // === HEDGE FUND AGENT MESSAGES ===
  const hfAgentMsgSets: { type: string; messages: { msg: string; mood: string }[] }[] = [
    { type: "warren_buffett", messages: [
      { msg: "Be fearful when others are greedy. This market is getting frothy.", mood: "confident" },
      { msg: "Price is what you pay, value is what you get. BTC looks fairly valued here.", mood: "neutral" },
      { msg: "Our favorite holding period is forever. Don't panic sell.", mood: "nervous" },
      { msg: "I see a wonderful business at a fair price. Adding to my position.", mood: "euphoric" },
      { msg: "The stock market is a device to transfer money from the impatient to the patient.", mood: "confident" },
      { msg: "Rule No. 1: Never lose money. Rule No. 2: Never forget Rule No. 1.", mood: "nervous" },
      { msg: "Time is the friend of the wonderful company, the enemy of the mediocre.", mood: "neutral" },
      { msg: "Wide economic moat detected. This is a generational buy.", mood: "euphoric" },
      { msg: "This market reminds me of the late 90s. Proceed with caution.", mood: "nervous" },
      { msg: "I've seen worse. Stay rational, stay disciplined. This too shall pass.", mood: "rekt" },
    ]},
    { type: "charlie_munger", messages: [
      { msg: "Invert, always invert. What could go wrong here? Not much.", mood: "confident" },
      { msg: "It's not supposed to be easy. Anyone who finds it easy is stupid.", mood: "neutral" },
      { msg: "The big money is not in the buying or selling, but in the waiting.", mood: "confident" },
      { msg: "This is a quality business at a wonderful price. Back up the truck.", mood: "euphoric" },
      { msg: "Show me the incentive and I'll show you the outcome. Bearish on this one.", mood: "nervous" },
      { msg: "All intelligent investing is value investing. The rest is speculation.", mood: "neutral" },
      { msg: "Knowing what you don't know is more useful than being brilliant.", mood: "neutral" },
      { msg: "The iron rule of nature: you get what you reward for.", mood: "confident" },
      { msg: "I've never seen such speculative excess. This will end badly.", mood: "rekt" },
      { msg: "Simplicity. Avoid complexity like the plague. Buy and hold quality.", mood: "euphoric" },
    ]},
    { type: "ben_graham", messages: [
      { msg: "Margin of safety is everything. Current prices offer insufficient buffer.", mood: "nervous" },
      { msg: "Mr. Market is manic today. Take advantage of his generosity.", mood: "euphoric" },
      { msg: "In the short run the market is a voting machine. In the long run, a weighing machine.", mood: "neutral" },
      { msg: "Net-net analysis reveals deep value. Trading below liquidation value.", mood: "euphoric" },
      { msg: "The intelligent investor is a realist who sells to optimists and buys from pessimists.", mood: "confident" },
      { msg: "Current valuations leave no margin of safety. I'm sitting in cash.", mood: "confident" },
      { msg: "Book value analysis suggests fair value. No compelling opportunity.", mood: "neutral" },
      { msg: "An investment operation is one which, upon thorough analysis, promises safety of principal.", mood: "neutral" },
      { msg: "This market is dangerously speculative. Graham would be horrified.", mood: "rekt" },
      { msg: "Bonds look more attractive than equities at these valuations.", mood: "nervous" },
    ]},
    { type: "peter_lynch", messages: [
      { msg: "Invest in what you know! This project has real-world adoption I can see.", mood: "euphoric" },
      { msg: "Behind every stock is a company. Find out what it's doing.", mood: "confident" },
      { msg: "Looking for ten-baggers in everyday products people actually use.", mood: "confident" },
      { msg: "The P/E ratio tells you a lot. This one's growing into its valuation.", mood: "neutral" },
      { msg: "Know what you own and know why you own it.", mood: "neutral" },
      { msg: "PEG ratio under 1.0 — growth at a reasonable price. Love it.", mood: "euphoric" },
      { msg: "The best stock to buy may be the one you already own.", mood: "confident" },
      { msg: "This feels like a turnaround story. Early innings.", mood: "confident" },
      { msg: "Everyone's a genius in a bull market. Don't confuse brains with a bull run.", mood: "nervous" },
      { msg: "Selling winners too early is the worst mistake you can make.", mood: "rekt" },
    ]},
    { type: "phil_fisher", messages: [
      { msg: "Scuttlebutt says management is exceptional. Strong buy.", mood: "euphoric" },
      { msg: "R&D pipeline is robust. Innovation will drive value for decades.", mood: "confident" },
      { msg: "Management quality is the most important factor. This team delivers.", mood: "confident" },
      { msg: "Don't quibble over eighths and quarters. Great companies are rare — buy them.", mood: "euphoric" },
      { msg: "Qualitative factors dominate. The numbers only tell part of the story.", mood: "neutral" },
      { msg: "If the job has been correctly done, the time to sell is almost never.", mood: "confident" },
      { msg: "The management here isn't what it used to be. Growing concerned.", mood: "nervous" },
      { msg: "Research, research, research. I need more data before committing.", mood: "neutral" },
      { msg: "Conservative accounting and honest management. These are my people.", mood: "confident" },
      { msg: "When management loses its way, even great businesses deteriorate.", mood: "rekt" },
    ]},
    { type: "cathie_wood", messages: [
      { msg: "5-year time horizon. Innovation is the answer. Loading up on ETH.", mood: "euphoric" },
      { msg: "Disruptive technologies will outperform. Trust the thesis.", mood: "confident" },
      { msg: "Crypto is the most revolutionary technology since the internet.", mood: "euphoric" },
      { msg: "We're in the early innings of exponential growth curves.", mood: "confident" },
      { msg: "Convergence of AI, robotics, and blockchain will create trillions in value.", mood: "euphoric" },
      { msg: "The market is short-sighted. Our 5-year models show massive upside.", mood: "confident" },
      { msg: "Innovation solves deflation. This is a feature, not a bug.", mood: "neutral" },
      { msg: "Conviction over consensus. The crowd is wrong on this one.", mood: "confident" },
      { msg: "Pullbacks in disruptive names are buying opportunities. Adding here.", mood: "nervous" },
      { msg: "Even innovators face headwinds. Holding through the volatility.", mood: "rekt" },
    ]},
    { type: "stanley_druckenmiller", messages: [
      { msg: "The macro setup is perfect. Going big on this trade.", mood: "euphoric" },
      { msg: "Liquidity is everything. When the Fed pivots, risk assets explode.", mood: "confident" },
      { msg: "I smell a major trend forming. Sizing up aggressively.", mood: "euphoric" },
      { msg: "The key is not how often you're right, but how much you make when you're right.", mood: "confident" },
      { msg: "Currency markets are signaling risk-on. Following the macro.", mood: "confident" },
      { msg: "Mixed signals from the yield curve. Staying neutral for now.", mood: "neutral" },
      { msg: "When I see a trend, I go all in. This is one of those moments.", mood: "euphoric" },
      { msg: "Macro headwinds building. Reducing exposure across the board.", mood: "nervous" },
      { msg: "Central banks are making policy errors. This won't end well.", mood: "nervous" },
      { msg: "Got caught on the wrong side. Cutting losses and reassessing.", mood: "rekt" },
    ]},
    { type: "michael_burry", messages: [
      { msg: "Everyone is buying? Time to look at the exit doors.", mood: "confident" },
      { msg: "The fundamentals don't support these valuations. Staying short.", mood: "confident" },
      { msg: "I see the same patterns that preceded the 2008 crash. Be warned.", mood: "nervous" },
      { msg: "Contrarian signal: when everyone agrees, I disagree.", mood: "confident" },
      { msg: "Forensic accounting reveals what the bulls don't want to see.", mood: "confident" },
      { msg: "This is the Big Short of crypto. The bubble will pop.", mood: "euphoric" },
      { msg: "The data is clear. Leverage in the system is unsustainable.", mood: "nervous" },
      { msg: "People call me a perma-bear. I call myself a realist.", mood: "neutral" },
      { msg: "Hmm, the market is proving me wrong... for now.", mood: "neutral" },
      { msg: "Even I have to admit when I'm early. But early isn't wrong.", mood: "rekt" },
    ]},
    { type: "bill_ackman", messages: [
      { msg: "Activist pressure will unlock enormous value here. Loading up.", mood: "euphoric" },
      { msg: "Management needs to be replaced. This company is underperforming.", mood: "confident" },
      { msg: "Concentrated positions with conviction. That's how you generate alpha.", mood: "confident" },
      { msg: "Corporate governance improvements will drive the stock higher.", mood: "confident" },
      { msg: "I'm going public with my thesis. The market needs to hear this.", mood: "euphoric" },
      { msg: "The board is not acting in shareholders' best interest. Activist time.", mood: "confident" },
      { msg: "Complex situations create opportunities for patient capital.", mood: "neutral" },
      { msg: "Sometimes the best activism is buying and waiting.", mood: "neutral" },
      { msg: "My short thesis isn't playing out as fast as expected. Patience.", mood: "nervous" },
      { msg: "Herbalife all over again. Sometimes conviction gets you burned.", mood: "rekt" },
    ]},
    { type: "aswath_damodaran", messages: [
      { msg: "DCF model shows 20% upside. The numbers don't lie.", mood: "euphoric" },
      { msg: "Every asset has an intrinsic value. This one is underpriced.", mood: "confident" },
      { msg: "Equity risk premium is elevated. Risk-adjusted returns favor buying.", mood: "confident" },
      { msg: "Valuation is a discipline. Current price implies unrealistic growth.", mood: "nervous" },
      { msg: "Running the numbers on crypto. Narrative value is hard to model.", mood: "neutral" },
      { msg: "Fair value range: we're right in the middle. No edge here.", mood: "neutral" },
      { msg: "My models incorporate multiple scenarios. Base case is moderately bullish.", mood: "confident" },
      { msg: "The market is pricing in perfection. Any miss and this drops hard.", mood: "nervous" },
      { msg: "Story stocks without earnings are impossible to value rigorously.", mood: "neutral" },
      { msg: "My model was wrong. Updating assumptions and recalculating.", mood: "rekt" },
    ]},
    { type: "rakesh_jhunjhunwala", messages: [
      { msg: "Be bullish on growth economies! Secular trends are your friend.", mood: "euphoric" },
      { msg: "I see massive potential in emerging market crypto adoption.", mood: "confident" },
      { msg: "The growth story here is undeniable. Riding this wave with conviction.", mood: "euphoric" },
      { msg: "Markets reward optimists in the long run. Stay bullish.", mood: "confident" },
      { msg: "Demographic tailwinds and digital adoption. This is a multi-decade trend.", mood: "confident" },
      { msg: "Taking profits on some positions. Even bulls need to rebalance.", mood: "neutral" },
      { msg: "Small pullback in a mega trend. Adding on weakness.", mood: "neutral" },
      { msg: "The pessimists are getting loud. Usually a good sign for bulls.", mood: "confident" },
      { msg: "This correction is deeper than expected. But the thesis holds.", mood: "nervous" },
      { msg: "Even the big bull gets humbled sometimes. Markets teach lessons.", mood: "rekt" },
    ]},
    { type: "mohnish_pabrai", messages: [
      { msg: "Dhandho: heads I win big, tails I don't lose much. This is Dhandho.", mood: "euphoric" },
      { msg: "Few bets, big bets, infrequent bets. This qualifies.", mood: "confident" },
      { msg: "Low risk, high uncertainty. The market hates uncertainty — I love it.", mood: "confident" },
      { msg: "Cloning the best ideas from the greatest investors. No shame in that.", mood: "confident" },
      { msg: "Patience is the key. The Dhandho investor waits for the fat pitch.", mood: "neutral" },
      { msg: "This doesn't meet my criteria. Passing and waiting for better odds.", mood: "neutral" },
      { msg: "Compounding is the eighth wonder. Let your winners run.", mood: "confident" },
      { msg: "The checklist says wait. I trust the process over emotion.", mood: "neutral" },
      { msg: "Position sizing matters more than picking. Small bet here.", mood: "nervous" },
      { msg: "Even the Dhandho framework misses sometimes. Learning from this one.", mood: "rekt" },
    ]},
    { type: "fundamentals_analyst", messages: [
      { msg: "Revenue growth accelerating QoQ. Margins expanding. Strong fundamentals.", mood: "euphoric" },
      { msg: "Balance sheet is rock solid. Low debt, high free cash flow.", mood: "confident" },
      { msg: "Profitability metrics are improving across the board. Bullish signal.", mood: "confident" },
      { msg: "Earnings miss but revenue beat. Mixed picture. Need more data.", mood: "neutral" },
      { msg: "Financial health score: 8/10. Solid but not exceptional.", mood: "neutral" },
      { msg: "Fundamental analysis complete. Fair value within 5% of current price.", mood: "neutral" },
      { msg: "Cash flow generation is impressive. This is a fundamentally sound asset.", mood: "confident" },
      { msg: "Deteriorating margins and rising costs. Fundamentals weakening.", mood: "nervous" },
      { msg: "Debt levels are concerning. Watching the interest coverage ratio closely.", mood: "nervous" },
      { msg: "Fundamental breakdown. Revenue declining, margins collapsing. Avoid.", mood: "rekt" },
    ]},
    { type: "technical_analyst", messages: [
      { msg: "Golden cross on the daily! 50 MA crossing above 200 MA. Bullish.", mood: "euphoric" },
      { msg: "Breaking out above key resistance with volume confirmation.", mood: "confident" },
      { msg: "RSI overbought but momentum is strong. Riding the trend.", mood: "confident" },
      { msg: "Bollinger Bands squeezing. Big move incoming — direction TBD.", mood: "neutral" },
      { msg: "Price consolidating near support. No clear directional bias yet.", mood: "neutral" },
      { msg: "MACD histogram turning positive. Early bullish signal forming.", mood: "confident" },
      { msg: "Head and shoulders pattern forming. Potential reversal ahead.", mood: "nervous" },
      { msg: "Volume declining on rally. Divergence is a warning sign.", mood: "nervous" },
      { msg: "Death cross forming on the weekly. Major bearish signal.", mood: "nervous" },
      { msg: "All technical indicators flashing red. Support levels obliterated.", mood: "rekt" },
    ]},
    { type: "sentiment_analyst", messages: [
      { msg: "Smart money accumulating heavily. Insider buying at all-time highs.", mood: "euphoric" },
      { msg: "Institutional flow is bullish. Large block trades detected.", mood: "confident" },
      { msg: "Fear & Greed at 78. Getting greedy — usually means a top is near.", mood: "nervous" },
      { msg: "Sentiment is neutral. Neither extreme fear nor extreme greed.", mood: "neutral" },
      { msg: "Short interest declining. Bears are covering. Positive signal.", mood: "confident" },
      { msg: "Social media sentiment turning positive. Retail is getting excited.", mood: "confident" },
      { msg: "Mixed signals from options flow. Puts and calls roughly balanced.", mood: "neutral" },
      { msg: "Insider selling spike detected. Insiders know something we don't.", mood: "nervous" },
      { msg: "Fear index at extreme levels. Historically this means buy.", mood: "confident" },
      { msg: "Panic selling across the board. Sentiment at capitulation levels.", mood: "rekt" },
    ]},
    { type: "news_sentiment_analyst", messages: [
      { msg: "Positive news cycle: major partnership announced. Sentiment shift incoming.", mood: "euphoric" },
      { msg: "Headlines are bullish. Upgrades from multiple analysts this week.", mood: "confident" },
      { msg: "Regulatory clarity emerging. Positive for the entire sector.", mood: "confident" },
      { msg: "News flow is quiet. No catalysts on the horizon.", mood: "neutral" },
      { msg: "Mixed headlines. Some positive, some concerning. Net neutral.", mood: "neutral" },
      { msg: "Earnings season headlines trending positive across tech sector.", mood: "confident" },
      { msg: "Breaking: regulatory crackdown rumors circulating. Monitoring closely.", mood: "nervous" },
      { msg: "Negative press coverage increasing. Reputational risk growing.", mood: "nervous" },
      { msg: "FUD cycle intensifying. But historically, FUD creates buying ops.", mood: "nervous" },
      { msg: "Black swan event in the news. Markets in free fall. Stay cautious.", mood: "rekt" },
    ]},
    { type: "valuation_analyst", messages: [
      { msg: "DCF shows 25% upside. Owner earnings model confirms. Strong buy.", mood: "euphoric" },
      { msg: "EV/EBITDA is below sector average. Undervalued relative to peers.", mood: "confident" },
      { msg: "Residual income model suggests fair value is 15% above current price.", mood: "confident" },
      { msg: "Multiple valuation frameworks agree: fairly priced. No edge.", mood: "neutral" },
      { msg: "Valuation models show mixed results. DCF bullish, multiples bearish.", mood: "neutral" },
      { msg: "Sum-of-the-parts analysis reveals hidden value in the business.", mood: "confident" },
      { msg: "Owner earnings yield is attractive compared to bond yields.", mood: "confident" },
      { msg: "Valuation stretched. Trading at 2x fair value on my models.", mood: "nervous" },
      { msg: "All models point to overvaluation. Limited upside from here.", mood: "nervous" },
      { msg: "Valuation models completely broken by this move. Recalibrating.", mood: "rekt" },
    ]},
    { type: "growth_agent", messages: [
      { msg: "Growth acceleration detected! Revenue growth rate increasing QoQ.", mood: "euphoric" },
      { msg: "TAM penetration is still early. Massive runway for growth ahead.", mood: "confident" },
      { msg: "Margin expansion + revenue growth = earnings power inflection.", mood: "confident" },
      { msg: "Growth is steady but not accelerating. Hold, don't add.", mood: "neutral" },
      { msg: "User growth metrics are strong but monetization lags. Watching.", mood: "neutral" },
      { msg: "Insider buying confirms management is bullish on growth trajectory.", mood: "confident" },
      { msg: "Early signs of growth deceleration. Sequential metrics softening.", mood: "nervous" },
      { msg: "Growth rate still above market but the delta is shrinking.", mood: "neutral" },
      { msg: "Competition intensifying. Growth moat is narrowing.", mood: "nervous" },
      { msg: "Growth thesis broken. Key metrics in decline. Exiting position.", mood: "rekt" },
    ]},
    { type: "risk_manager", messages: [
      { msg: "Risk-adjusted returns are excellent. Volatility low, Sharpe high. Green light.", mood: "euphoric" },
      { msg: "Position sizing optimal. Risk/reward ratio favorable at 3:1.", mood: "confident" },
      { msg: "Portfolio correlation within bounds. Diversification holding up.", mood: "confident" },
      { msg: "Vol is at average levels. Standard position sizes recommended.", mood: "neutral" },
      { msg: "VaR analysis shows moderate risk. Maintaining current exposure.", mood: "neutral" },
      { msg: "Increasing trailing stops. Protecting profits as volatility rises.", mood: "neutral" },
      { msg: "Correlation spike detected. Reducing overall exposure by 20%.", mood: "nervous" },
      { msg: "Volatility expanding rapidly. Cut position sizes in half.", mood: "nervous" },
      { msg: "Maximum drawdown threshold breached. Activating risk protocols.", mood: "nervous" },
      { msg: "Risk metrics off the charts. Full defensive mode activated.", mood: "rekt" },
    ]},
    { type: "portfolio_manager", messages: [
      { msg: "Consensus bullish across analysts. Adding to portfolio aggressively.", mood: "euphoric" },
      { msg: "Multiple signals align. High conviction trade. Sizing up.", mood: "confident" },
      { msg: "Analyst consensus is cautiously optimistic. Maintaining positions.", mood: "confident" },
      { msg: "Mixed signals from the team. Staying flat until clarity emerges.", mood: "neutral" },
      { msg: "Rebalancing the portfolio based on latest analyst recommendations.", mood: "neutral" },
      { msg: "Synthesizing all inputs. The weight of evidence is moderately bullish.", mood: "confident" },
      { msg: "Risk manager flagging concerns. Reducing positions as a precaution.", mood: "nervous" },
      { msg: "Conflicting signals between fundamental and technical analysts. Caution.", mood: "nervous" },
      { msg: "The buck stops here. Taking losses on underperforming positions.", mood: "nervous" },
      { msg: "Portfolio drawdown exceeding tolerance. Major repositioning underway.", mood: "rekt" },
    ]},
  ];

  for (const set of hfAgentMsgSets) {
    for (const m of set.messages) {
      const pairs = ["BTC/USD", "ETH/USD", "SOL/USD", "DOGE/USD", "BNB/USD", "ADA/USD", "AVAX/USD", "XRP/USD", "DOT/USD", "LINK/USD"];
      let pair: string | null = null;
      for (const p of pairs) {
        const symbol = p.split("/")[0];
        if (m.msg.toUpperCase().includes(symbol)) {
          pair = p;
          break;
        }
      }
      agentMessagesData.push({
        id: msgId++,
        agentType: set.type,
        message: m.msg,
        mood: m.mood,
        pair,
      });
    }
  }

  // Stakes seed data
  const stakesData: Stake[] = [];
  let stakeId = 1;

  // Demo user stakes on top agents
  const topAgentUserIds = leaderboard.slice(0, 10).map(e => e.userId).filter(id => id !== 1);

  // Demo user stakes on 4 agents
  const demoStakeTargets = topAgentUserIds.slice(0, 4);
  const demoStakeAmounts = [800, 500, 350, 200];
  for (let i = 0; i < demoStakeTargets.length; i++) {
    stakesData.push({
      id: stakeId++,
      stakerId: 1,
      targetUserId: demoStakeTargets[i],
      amount: demoStakeAmounts[i],
      stakedAt: new Date(now.getTime() - (10 - i) * 86400000).toISOString(),
    });
  }

  // Other users stake on various agents (~60 total stakes)
  for (let i = 2; i <= 33; i++) {
    // Each user stakes on 1-3 agents
    const numStakes = Math.floor(Math.random() * 3) + 1;
    const targets = [...topAgentUserIds].sort(() => Math.random() - 0.5).slice(0, numStakes);
    for (const targetId of targets) {
      if (targetId === i) continue; // Don't stake on self
      stakesData.push({
        id: stakeId++,
        stakerId: i,
        targetUserId: targetId,
        amount: 100 + Math.floor(Math.random() * 900),
        stakedAt: new Date(now.getTime() - Math.floor(Math.random() * 14) * 86400000).toISOString(),
      });
    }
  }

  // Staking rewards for demo user
  const rewardsData: StakingReward[] = [];
  let rewardId = 1;
  const rewardReasons = ["daily_performance", "league_promotion", "daily_performance", "season_end", "daily_performance", "daily_performance", "league_promotion", "daily_performance"];
  for (let i = 0; i < 8; i++) {
    rewardsData.push({
      id: rewardId++,
      stakerId: 1,
      targetUserId: demoStakeTargets[i % demoStakeTargets.length],
      amount: 20 + Math.floor(Math.random() * 80),
      reason: rewardReasons[i],
      earnedAt: new Date(now.getTime() - (8 - i) * 86400000).toISOString(),
    });
  }

  // === HEDGE FUND AGENTS ===
  const hedgeFundAgentsSeed: HedgeFundAgent[] = [
    { id: 1, agentId: "warren_buffett", name: "Warren Buffett", category: "persona", description: "Value investing, moat analysis, intrinsic value. Buys great companies at fair prices.", tradingPhilosophy: "Buy wonderful companies at fair prices. Focus on economic moats and long-term compounding.", avatarEmoji: "🏛️", riskTolerance: "low", assetFocus: "both", winRate: 0, totalSignals: 0, avgConfidence: 0 },
    { id: 2, agentId: "charlie_munger", name: "Charlie Munger", category: "persona", description: "Quality businesses, rational thinking. Buffett's partner with a multi-disciplinary approach.", tradingPhilosophy: "Invert, always invert. Buy quality businesses and hold forever.", avatarEmoji: "📚", riskTolerance: "low", assetFocus: "both", winRate: 0, totalSignals: 0, avgConfidence: 0 },
    { id: 3, agentId: "ben_graham", name: "Ben Graham", category: "persona", description: "Father of value investing. Margin of safety, deep value, net-net analysis.", tradingPhilosophy: "Margin of safety is everything. Buy below intrinsic value.", avatarEmoji: "📐", riskTolerance: "low", assetFocus: "equity", winRate: 0, totalSignals: 0, avgConfidence: 0 },
    { id: 4, agentId: "peter_lynch", name: "Peter Lynch", category: "persona", description: "Buy what you know. Growth at reasonable price (GARP).", tradingPhilosophy: "Invest in what you understand. Look for ten-baggers in everyday life.", avatarEmoji: "🔍", riskTolerance: "medium", assetFocus: "both", winRate: 0, totalSignals: 0, avgConfidence: 0 },
    { id: 5, agentId: "phil_fisher", name: "Phil Fisher", category: "persona", description: "Scuttlebutt research, management quality, long-term growth.", tradingPhilosophy: "Deep qualitative research. Hold outstanding companies for decades.", avatarEmoji: "🎯", riskTolerance: "medium", assetFocus: "equity", winRate: 0, totalSignals: 0, avgConfidence: 0 },
    { id: 6, agentId: "cathie_wood", name: "Cathie Wood", category: "persona", description: "Disruptive innovation, high growth, future-forward bets.", tradingPhilosophy: "Invest in disruptive innovation with 5-year horizons. Conviction over consensus.", avatarEmoji: "🚀", riskTolerance: "high", assetFocus: "both", winRate: 0, totalSignals: 0, avgConfidence: 0 },
    { id: 7, agentId: "stanley_druckenmiller", name: "Stanley Druckenmiller", category: "persona", description: "Macro trends, large directional bets, timing matters.", tradingPhilosophy: "Find the trend, size up, and ride it. Macro drives everything.", avatarEmoji: "🌊", riskTolerance: "high", assetFocus: "both", winRate: 0, totalSignals: 0, avgConfidence: 0 },
    { id: 8, agentId: "michael_burry", name: "Michael Burry", category: "persona", description: "Contrarian. Shorts overvalued assets. The Big Short legend.", tradingPhilosophy: "Be contrarian. Find bubbles and bet against them. Deep forensic analysis.", avatarEmoji: "🔮", riskTolerance: "high", assetFocus: "both", winRate: 0, totalSignals: 0, avgConfidence: 0 },
    { id: 9, agentId: "bill_ackman", name: "Bill Ackman", category: "persona", description: "Activist investing, unlocking value through corporate change.", tradingPhilosophy: "Take concentrated positions and push for change. Activism creates alpha.", avatarEmoji: "⚔️", riskTolerance: "high", assetFocus: "equity", winRate: 0, totalSignals: 0, avgConfidence: 0 },
    { id: 10, agentId: "aswath_damodaran", name: "Aswath Damodaran", category: "persona", description: "The Dean of Valuation. Rigorous DCF, equity risk premiums.", tradingPhilosophy: "Valuation is a discipline, not an art. Every asset has an intrinsic value.", avatarEmoji: "📊", riskTolerance: "medium", assetFocus: "both", winRate: 0, totalSignals: 0, avgConfidence: 0 },
    { id: 11, agentId: "rakesh_jhunjhunwala", name: "Rakesh Jhunjhunwala", category: "persona", description: "India's Big Bull. Emerging markets, macro growth stories.", tradingPhilosophy: "Be bullish on growth economies. Ride secular trends with conviction.", avatarEmoji: "🐘", riskTolerance: "high", assetFocus: "both", winRate: 0, totalSignals: 0, avgConfidence: 0 },
    { id: 12, agentId: "mohnish_pabrai", name: "Mohnish Pabrai", category: "persona", description: "Dhandho approach. Heads I win, tails I don't lose much.", tradingPhilosophy: "Few bets, big bets, infrequent bets. Low risk, high uncertainty.", avatarEmoji: "🎲", riskTolerance: "low", assetFocus: "both", winRate: 0, totalSignals: 0, avgConfidence: 0 },
    { id: 13, agentId: "fundamentals_analyst", name: "Fundamentals Analyst", category: "specialist", description: "Profitability, growth, financial health, and valuation ratios.", tradingPhilosophy: "Numbers tell the truth. Analyze financials to find quality.", avatarEmoji: "📈", riskTolerance: "medium", assetFocus: "both", winRate: 0, totalSignals: 0, avgConfidence: 0 },
    { id: 14, agentId: "technical_analyst", name: "Technical Analyst", category: "specialist", description: "Trend following, mean reversion, momentum, volatility.", tradingPhilosophy: "Price action contains all information. Follow the charts.", avatarEmoji: "📉", riskTolerance: "medium", assetFocus: "both", winRate: 0, totalSignals: 0, avgConfidence: 0 },
    { id: 15, agentId: "sentiment_analyst", name: "Sentiment Analyst", category: "specialist", description: "Insider trades + news sentiment analysis.", tradingPhilosophy: "Follow the smart money and market sentiment.", avatarEmoji: "🧠", riskTolerance: "medium", assetFocus: "both", winRate: 0, totalSignals: 0, avgConfidence: 0 },
    { id: 16, agentId: "news_sentiment_analyst", name: "News Sentiment", category: "specialist", description: "LLM-classified news headlines for sentiment signals.", tradingPhilosophy: "News moves markets. Classify and act on headlines faster than humans.", avatarEmoji: "📰", riskTolerance: "medium", assetFocus: "both", winRate: 0, totalSignals: 0, avgConfidence: 0 },
    { id: 17, agentId: "valuation_analyst", name: "Valuation Analyst", category: "specialist", description: "DCF, owner earnings, EV/EBITDA, residual income models.", tradingPhilosophy: "Every asset has a fair value. Find the gap between price and value.", avatarEmoji: "💰", riskTolerance: "low", assetFocus: "both", winRate: 0, totalSignals: 0, avgConfidence: 0 },
    { id: 18, agentId: "growth_agent", name: "Growth Analyst", category: "specialist", description: "Growth trends, margin expansion, insider conviction analysis.", tradingPhilosophy: "Growth is the ultimate driver. Find companies accelerating their growth.", avatarEmoji: "🌱", riskTolerance: "medium", assetFocus: "both", winRate: 0, totalSignals: 0, avgConfidence: 0 },
    { id: 19, agentId: "risk_manager", name: "Risk Manager", category: "management", description: "Volatility-adjusted position sizing, correlation analysis.", tradingPhilosophy: "Risk comes first. Size positions by volatility, not conviction.", avatarEmoji: "🛡️", riskTolerance: "low", assetFocus: "both", winRate: 0, totalSignals: 0, avgConfidence: 0 },
    { id: 20, agentId: "portfolio_manager", name: "Portfolio Manager", category: "management", description: "Final trading decisions. Synthesizes all analyst signals.", tradingPhilosophy: "The buck stops here. Weigh all signals and make the final call.", avatarEmoji: "👔", riskTolerance: "medium", assetFocus: "both", winRate: 0, totalSignals: 0, avgConfidence: 0 },
  ];

  // === MEME → HF AGENT MAPPING ===
  const memeAgentMappingSeed: MemeAgentMapping[] = [
    { id: 1, memeAgentType: "bull", hedgeFundAgentId: "cathie_wood", weight: 0.4 },
    { id: 2, memeAgentType: "bull", hedgeFundAgentId: "stanley_druckenmiller", weight: 0.35 },
    { id: 3, memeAgentType: "bull", hedgeFundAgentId: "growth_agent", weight: 0.25 },
    { id: 4, memeAgentType: "bear", hedgeFundAgentId: "michael_burry", weight: 0.5 },
    { id: 5, memeAgentType: "bear", hedgeFundAgentId: "ben_graham", weight: 0.3 },
    { id: 6, memeAgentType: "bear", hedgeFundAgentId: "risk_manager", weight: 0.2 },
    { id: 7, memeAgentType: "algo", hedgeFundAgentId: "technical_analyst", weight: 0.35 },
    { id: 8, memeAgentType: "algo", hedgeFundAgentId: "fundamentals_analyst", weight: 0.30 },
    { id: 9, memeAgentType: "algo", hedgeFundAgentId: "valuation_analyst", weight: 0.20 },
    { id: 10, memeAgentType: "algo", hedgeFundAgentId: "sentiment_analyst", weight: 0.15 },
    { id: 11, memeAgentType: "moon", hedgeFundAgentId: "stanley_druckenmiller", weight: 0.35 },
    { id: 12, memeAgentType: "moon", hedgeFundAgentId: "cathie_wood", weight: 0.35 },
    { id: 13, memeAgentType: "moon", hedgeFundAgentId: "rakesh_jhunjhunwala", weight: 0.3 },
    { id: 14, memeAgentType: "zen", hedgeFundAgentId: "warren_buffett", weight: 0.35 },
    { id: 15, memeAgentType: "zen", hedgeFundAgentId: "ben_graham", weight: 0.25 },
    { id: 16, memeAgentType: "zen", hedgeFundAgentId: "charlie_munger", weight: 0.25 },
    { id: 17, memeAgentType: "zen", hedgeFundAgentId: "mohnish_pabrai", weight: 0.15 },
    { id: 18, memeAgentType: "degen", hedgeFundAgentId: "bill_ackman", weight: 0.3 },
    { id: 19, memeAgentType: "degen", hedgeFundAgentId: "peter_lynch", weight: 0.25 },
    { id: 20, memeAgentType: "degen", hedgeFundAgentId: "phil_fisher", weight: 0.2 },
    { id: 21, memeAgentType: "degen", hedgeFundAgentId: "news_sentiment_analyst", weight: 0.25 },
  ];

  // === SIGNAL GENERATION ===
  const cryptoTickers = ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE", "AVAX", "DOT", "LINK"];
  const equityTickers = ["AAPL", "GOOGL", "MSFT", "NVDA", "TSLA"];
  const allTickers = [...cryptoTickers, ...equityTickers];

  const basePrices: Record<string, number> = {
    BTC: 87420, ETH: 3180, SOL: 148, BNB: 580, XRP: 0.62, ADA: 0.45, DOGE: 0.165, AVAX: 36, DOT: 7.5, LINK: 15.2,
    AAPL: 178, GOOGL: 142, MSFT: 415, NVDA: 880, TSLA: 175,
  };

  // Agent-specific signal biases
  const bullishSkew = new Set(["cathie_wood", "stanley_druckenmiller", "rakesh_jhunjhunwala", "growth_agent"]);
  const bearishSkew = new Set(["michael_burry", "ben_graham"]);
  const cautiousSkew = new Set(["warren_buffett", "charlie_munger", "mohnish_pabrai"]);

  // Agent-specific reasoning templates
  const reasoningTemplates: Record<string, (ticker: string, signal: string) => string> = {
    warren_buffett: (t, s) => JSON.stringify({ summary: `${t} ${s === "bullish" ? "shows strong economic moat and durable competitive advantage" : s === "bearish" ? "is trading above intrinsic value with deteriorating moat" : "is fairly valued but lacks sufficient margin of safety"}`, factors: ["Intrinsic value analysis", "Economic moat assessment", "Management quality"] }),
    charlie_munger: (t, s) => JSON.stringify({ summary: `${t} ${s === "bullish" ? "represents a quality business at a reasonable price" : s === "bearish" ? "fails the quality filter — poor unit economics" : "needs more time to develop a clear thesis"}`, factors: ["Business quality", "Rational framework", "Multi-disciplinary analysis"] }),
    ben_graham: (t, s) => JSON.stringify({ summary: `${t} ${s === "bullish" ? "is trading below net asset value with margin of safety" : s === "bearish" ? "is dangerously overvalued relative to book value" : "is near fair value with insufficient margin of safety"}`, factors: ["Book value ratio", "Margin of safety", "Net-net analysis"] }),
    peter_lynch: (t, s) => JSON.stringify({ summary: `${t} ${s === "bullish" ? "has strong growth potential that the market is underpricing" : s === "bearish" ? "growth story is fully priced in, avoid" : "is a hold — growth is moderate"}`, factors: ["PEG ratio", "Growth trajectory", "Consumer insight"] }),
    phil_fisher: (t, s) => JSON.stringify({ summary: `${t} ${s === "bullish" ? "has exceptional management and strong R&D pipeline" : s === "bearish" ? "management quality declining, R&D spend inefficient" : "management is decent but not exceptional"}`, factors: ["Scuttlebutt research", "Management quality", "R&D efficiency"] }),
    cathie_wood: (t, s) => JSON.stringify({ summary: `${t} ${s === "bullish" ? "is at the forefront of disruptive innovation — massive upside" : s === "bearish" ? "disruption thesis weakening, losing competitive edge" : "innovation narrative intact but needs more catalysts"}`, factors: ["Disruption potential", "5-year TAM", "Innovation curve"] }),
    stanley_druckenmiller: (t, s) => JSON.stringify({ summary: `${t} ${s === "bullish" ? "macro tailwinds are strong — riding this trend with size" : s === "bearish" ? "macro headwinds intensifying, reducing exposure" : "macro picture is mixed, staying small"}`, factors: ["Macro trends", "Liquidity cycles", "Positioning data"] }),
    michael_burry: (t, s) => JSON.stringify({ summary: `${t} ${s === "bullish" ? "is actually undervalued if you look at the forensic data" : s === "bearish" ? "screams bubble. Overvalued by every contrarian metric" : "isn't interesting enough to short or buy"}`, factors: ["Forensic accounting", "Contrarian indicators", "Bubble metrics"] }),
    bill_ackman: (t, s) => JSON.stringify({ summary: `${t} ${s === "bullish" ? "has hidden value that activist pressure can unlock" : s === "bearish" ? "management is destroying value — needs activist intervention" : "current valuation is fair, no activist angle"}`, factors: ["Activist potential", "Value unlock", "Corporate governance"] }),
    aswath_damodaran: (t, s) => JSON.stringify({ summary: `${t} ${s === "bullish" ? "DCF model shows 20%+ upside from current price" : s === "bearish" ? "DCF model shows significant overvaluation" : "is trading within 5% of fair value per DCF"}`, factors: ["DCF analysis", "Risk premium", "Growth rate modeling"] }),
    rakesh_jhunjhunwala: (t, s) => JSON.stringify({ summary: `${t} ${s === "bullish" ? "is riding a secular growth wave — be aggressive" : s === "bearish" ? "growth momentum stalling, cycle turning" : "waiting for better entry on the next pullback"}`, factors: ["Secular trends", "Growth momentum", "Emerging market dynamics"] }),
    mohnish_pabrai: (t, s) => JSON.stringify({ summary: `${t} ${s === "bullish" ? "is a Dhandho bet — heads I win big, tails I don't lose much" : s === "bearish" ? "risk/reward is unfavorable — tails I lose a lot" : "not enough asymmetry for a position"}`, factors: ["Risk/reward asymmetry", "Dhandho framework", "Downside protection"] }),
    fundamentals_analyst: (t, s) => JSON.stringify({ summary: `${t} ${s === "bullish" ? "fundamentals are strong: margins expanding, revenue accelerating" : s === "bearish" ? "deteriorating fundamentals: margin compression, slowing growth" : "fundamentals are stable but not compelling"}`, factors: ["Revenue growth", "Profit margins", "Balance sheet health"] }),
    technical_analyst: (t, s) => JSON.stringify({ summary: `${t} ${s === "bullish" ? "breaking out above key resistance with strong volume" : s === "bearish" ? "breaking below support with increasing selling pressure" : "consolidating in a range, no clear directional signal"}`, factors: ["Price action", "Volume analysis", "Moving averages"] }),
    sentiment_analyst: (t, s) => JSON.stringify({ summary: `${t} ${s === "bullish" ? "smart money is accumulating, insider buying elevated" : s === "bearish" ? "institutional selling pressure, insider dumping detected" : "mixed signals from smart money flow"}`, factors: ["Insider activity", "Institutional flow", "Sentiment index"] }),
    news_sentiment_analyst: (t, s) => JSON.stringify({ summary: `${t} ${s === "bullish" ? "positive news cycle: upgrades, partnerships, strong earnings" : s === "bearish" ? "negative news cycle: downgrades, regulatory concerns" : "news flow is neutral, no strong catalysts"}`, factors: ["News sentiment score", "Headline analysis", "Event catalysts"] }),
    valuation_analyst: (t, s) => JSON.stringify({ summary: `${t} ${s === "bullish" ? "undervalued by 15-25% across multiple valuation frameworks" : s === "bearish" ? "overvalued by 20%+ on DCF, EV/EBITDA, and residual income" : "fairly valued within normal valuation ranges"}`, factors: ["DCF model", "EV/EBITDA", "Residual income"] }),
    growth_agent: (t, s) => JSON.stringify({ summary: `${t} ${s === "bullish" ? "growth acceleration detected: revenue growth rate increasing QoQ" : s === "bearish" ? "growth deceleration: sequential decline in key metrics" : "growth rate stable but not accelerating"}`, factors: ["Growth rate trend", "Margin expansion", "TAM penetration"] }),
    risk_manager: (t, s) => JSON.stringify({ summary: `${t} ${s === "bullish" ? "risk-adjusted return is attractive: low vol, high Sharpe" : s === "bearish" ? "risk metrics deteriorating: rising vol, correlation spike" : "risk metrics are neutral, position sizing standard"}`, factors: ["Volatility analysis", "Correlation risk", "Position sizing"] }),
    portfolio_manager: (t, s) => JSON.stringify({ summary: `${t} ${s === "bullish" ? "consensus among analysts is bullish — adding to portfolio" : s === "bearish" ? "multiple analysts flagging risk — reducing exposure" : "mixed analyst signals — maintaining current position"}`, factors: ["Analyst consensus", "Portfolio fit", "Risk allocation"] }),
  };

  // Time horizon by agent type
  const agentTimeHorizon: Record<string, string> = {
    warren_buffett: "long", charlie_munger: "long", ben_graham: "long", mohnish_pabrai: "long",
    peter_lynch: "medium", phil_fisher: "long", cathie_wood: "long",
    stanley_druckenmiller: "medium", michael_burry: "medium", bill_ackman: "medium",
    aswath_damodaran: "medium", rakesh_jhunjhunwala: "medium",
    fundamentals_analyst: "medium", technical_analyst: "short", sentiment_analyst: "short",
    news_sentiment_analyst: "short", valuation_analyst: "medium", growth_agent: "medium",
    risk_manager: "short", portfolio_manager: "medium",
  };

  const signalsSeed: AgentSignal[] = [];
  let signalId = 1;

  for (const hfAgent of hedgeFundAgentsSeed) {
    // Determine which tickers this agent covers
    const tickers = hfAgent.assetFocus === "equity" ? equityTickers : allTickers;
    // Pick a subset of tickers per agent (5-10)
    const agentTickers = [...tickers].sort(() => Math.random() - 0.5).slice(0, Math.min(tickers.length, 5 + Math.floor(Math.random() * 6)));

    let totalConf = 0;
    let correctCount = 0;
    let totalCount = 0;

    for (const ticker of agentTickers) {
      // 2-4 signals per ticker over past 7 days
      const numSignals = 2 + Math.floor(Math.random() * 3);
      for (let s = 0; s < numSignals; s++) {
        // Determine signal with agent bias
        const roll = Math.random();
        let signal: string;
        if (bullishSkew.has(hfAgent.agentId)) {
          signal = roll < 0.60 ? "bullish" : roll < 0.80 ? "neutral" : "bearish";
        } else if (bearishSkew.has(hfAgent.agentId)) {
          signal = roll < 0.50 ? "bearish" : roll < 0.75 ? "neutral" : "bullish";
        } else if (cautiousSkew.has(hfAgent.agentId)) {
          signal = roll < 0.30 ? "bullish" : roll < 0.70 ? "neutral" : "bearish";
        } else {
          signal = roll < 0.35 ? "bullish" : roll < 0.65 ? "neutral" : "bearish";
        }

        const confidence = 40 + Math.floor(Math.random() * 56); // 40-95
        const base = basePrices[ticker] || 100;
        const pctMove = (signal === "bullish" ? 1 : signal === "bearish" ? -1 : 0) * (5 + Math.random() * 20) / 100;
        const targetPrice = Math.round(base * (1 + pctMove) * 100) / 100;

        const hoursAgo = Math.floor(Math.random() * 7 * 24);
        const createdAt = new Date(now.getTime() - hoursAgo * 3600000).toISOString();

        const reasoningFn = reasoningTemplates[hfAgent.agentId];
        const reasoning = reasoningFn ? reasoningFn(ticker, signal) : JSON.stringify({ summary: `${signal} on ${ticker}`, factors: [] });

        // Randomly resolve some signals (older ones more likely)
        let isCorrect: boolean | null = null;
        if (hoursAgo > 48) {
          isCorrect = Math.random() < 0.58; // ~58% correct overall
        }

        totalConf += confidence;
        totalCount++;
        if (isCorrect === true) correctCount++;

        signalsSeed.push({
          id: signalId++,
          hedgeFundAgentId: hfAgent.agentId,
          ticker,
          signal,
          confidence,
          reasoning,
          targetPrice,
          timeHorizon: agentTimeHorizon[hfAgent.agentId] || "medium",
          createdAt,
          isCorrect,
        });
      }
    }

    // Update agent stats
    const resolvedSignals = signalsSeed.filter(s => s.hedgeFundAgentId === hfAgent.agentId && s.isCorrect !== null);
    const wins = resolvedSignals.filter(s => s.isCorrect === true).length;
    hfAgent.winRate = resolvedSignals.length > 0 ? Math.round((wins / resolvedSignals.length) * 100) : 0;
    hfAgent.totalSignals = totalCount;
    hfAgent.avgConfidence = totalCount > 0 ? Math.round(totalConf / totalCount) : 0;
  }

  return { agents, users, competition, portfolios, positions, trades, snapshots, leaderboard, userAchievements, agentMessagesData, achievementDefs, stakesData, rewardsData, hedgeFundAgentsSeed, memeAgentMappingSeed, signalsSeed };
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private agents: Map<string, Agent> = new Map();
  private competitions: Map<number, Competition> = new Map();
  private portfolios: Map<number, Portfolio> = new Map(); // keyed by userId
  private positions: Map<number, Position[]> = new Map(); // keyed by portfolioId
  private trades: Map<number, Trade[]> = new Map(); // keyed by portfolioId
  private snapshots: Map<number, DailySnapshot[]> = new Map();
  private leaderboard: LeaderboardEntry[] = [];
  private achievements: Map<number, Achievement[]> = new Map(); // keyed by userId
  private agentMessages: AgentMessage[] = [];
  private stakes: Stake[] = [];
  private stakingRewards: StakingReward[] = [];
  private hedgeFundAgentsMap: Map<string, HedgeFundAgent> = new Map();
  private agentSignalsData: AgentSignal[] = [];
  private memeAgentMappings: MemeAgentMapping[] = [];
  private hfAgentStakes: { stakerId: number; hedgeFundAgentId: string; amount: number; stakedAt: string }[] = [];

  private nextTradeId = 100;
  private nextPositionId = 100;
  private nextAchievementId = 100;
  private nextStakeId = 200;
  private nextRewardId = 200;

  constructor() {
    const seed = generateSeedData();

    seed.users.forEach(u => this.users.set(u.id, u));
    seed.agents.forEach(a => this.agents.set(a.type, a));
    this.competitions.set(seed.competition.id, seed.competition);
    seed.portfolios.forEach(p => this.portfolios.set(p.userId, p));
    
    // Positions for demo user
    this.positions.set(1, seed.positions);
    
    // Trades
    this.trades.set(1, seed.trades);
    
    // Snapshots
    this.snapshots.set(1, seed.snapshots);
    
    this.leaderboard = seed.leaderboard;
    
    // Achievements
    const achByUser = new Map<number, Achievement[]>();
    for (const ach of seed.userAchievements) {
      if (!achByUser.has(ach.userId)) achByUser.set(ach.userId, []);
      achByUser.get(ach.userId)!.push(ach);
    }
    this.achievements = achByUser;
    
    this.agentMessages = seed.agentMessagesData;
    this.stakes = seed.stakesData;
    this.stakingRewards = seed.rewardsData;

    // Hedge fund agents
    seed.hedgeFundAgentsSeed.forEach(a => this.hedgeFundAgentsMap.set(a.agentId, a));
    this.agentSignalsData = seed.signalsSeed;
    this.memeAgentMappings = seed.memeAgentMappingSeed;
  }

  getUser(id: number): User | undefined {
    return this.users.get(id);
  }

  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  updateUser(id: number, data: Partial<User>): User | undefined {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...data };
    this.users.set(id, updated);
    return updated;
  }

  getAgent(type: string): Agent | undefined {
    return this.agents.get(type);
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  getActiveCompetition(): Competition | undefined {
    return Array.from(this.competitions.values()).find(c => c.status === "active");
  }

  getPortfolio(userId: number): Portfolio | undefined {
    return this.portfolios.get(userId);
  }

  updatePortfolio(id: number, data: Partial<Portfolio>): Portfolio | undefined {
    // Find by id
    for (const [userId, p] of this.portfolios.entries()) {
      if (p.id === id) {
        const updated = { ...p, ...data };
        this.portfolios.set(userId, updated);
        return updated;
      }
    }
    return undefined;
  }

  getPositions(portfolioId: number): Position[] {
    return this.positions.get(portfolioId) || [];
  }

  addPosition(pos: InsertPosition): Position {
    const newPos: Position = { ...pos, id: this.nextPositionId++ };
    const existing = this.positions.get(pos.portfolioId) || [];
    existing.push(newPos);
    this.positions.set(pos.portfolioId, existing);
    return newPos;
  }

  getTrades(portfolioId: number): Trade[] {
    return this.trades.get(portfolioId) || [];
  }

  addTrade(trade: InsertTrade): Trade {
    const newTrade: Trade = { ...trade, id: this.nextTradeId++ };
    const existing = this.trades.get(trade.portfolioId) || [];
    existing.push(newTrade);
    this.trades.set(trade.portfolioId, existing);
    return newTrade;
  }

  getSnapshots(portfolioId: number): DailySnapshot[] {
    return this.snapshots.get(portfolioId) || [];
  }

  getLeaderboard(competitionId: number): (LeaderboardEntry & { user: User; agent: Agent })[] {
    return this.leaderboard
      .filter(e => e.competitionId === competitionId)
      .sort((a, b) => a.rank - b.rank)
      .map(entry => {
        const user = this.users.get(entry.userId)!;
        const agent = this.agents.get(user?.selectedAgentType || "bull")!;
        return { ...entry, user, agent };
      })
      .filter(e => e.user && e.agent);
  }

  getLeaderboardEntry(userId: number): LeaderboardEntry | undefined {
    return this.leaderboard.find(e => e.userId === userId);
  }

  getUserAchievements(userId: number): Achievement[] {
    return this.achievements.get(userId) || [];
  }

  addAchievement(ach: InsertAchievement): Achievement {
    const newAch: Achievement = { ...ach, id: this.nextAchievementId++ };
    const existing = this.achievements.get(ach.userId) || [];
    existing.push(newAch);
    this.achievements.set(ach.userId, existing);
    return newAch;
  }

  getAgentMessages(agentType: string, mood?: string): AgentMessage[] {
    return this.agentMessages.filter(m => {
      if (m.agentType !== agentType) return false;
      if (mood && m.mood !== mood) return false;
      return true;
    });
  }

  getRandomAgentMessage(agentType: string, mood?: string): AgentMessage | undefined {
    const msgs = this.getAgentMessages(agentType, mood);
    if (msgs.length === 0) return undefined;
    return msgs[Math.floor(Math.random() * msgs.length)];
  }

  // Staking
  getStakesByStaker(stakerId: number): Stake[] {
    return this.stakes.filter(s => s.stakerId === stakerId);
  }

  getStakesByTarget(targetUserId: number): Stake[] {
    return this.stakes.filter(s => s.targetUserId === targetUserId);
  }

  getStake(stakerId: number, targetUserId: number): Stake | undefined {
    return this.stakes.find(s => s.stakerId === stakerId && s.targetUserId === targetUserId);
  }

  getTotalStakedOnUser(targetUserId: number): number {
    return this.stakes.filter(s => s.targetUserId === targetUserId).reduce((sum, s) => sum + s.amount, 0);
  }

  addStake(stake: InsertStake): Stake {
    const newStake: Stake = { ...stake, id: this.nextStakeId++ };
    this.stakes.push(newStake);
    return newStake;
  }

  removeStake(stakerId: number, targetUserId: number): boolean {
    const idx = this.stakes.findIndex(s => s.stakerId === stakerId && s.targetUserId === targetUserId);
    if (idx === -1) return false;
    this.stakes.splice(idx, 1);
    return true;
  }

  updateStake(stakerId: number, targetUserId: number, amount: number): Stake | undefined {
    const stake = this.stakes.find(s => s.stakerId === stakerId && s.targetUserId === targetUserId);
    if (!stake) return undefined;
    stake.amount = amount;
    return stake;
  }

  // Staking Rewards
  getRewardsByStaker(stakerId: number): StakingReward[] {
    return this.stakingRewards.filter(r => r.stakerId === stakerId).sort((a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime());
  }

  addReward(reward: InsertStakingReward): StakingReward {
    const newReward: StakingReward = { ...reward, id: this.nextRewardId++ };
    this.stakingRewards.push(newReward);
    return newReward;
  }

  getStakingLeaderboard(): { targetUserId: number; totalStaked: number; stakerCount: number }[] {
    const map = new Map<number, { totalStaked: number; stakers: Set<number> }>();
    for (const s of this.stakes) {
      if (!map.has(s.targetUserId)) map.set(s.targetUserId, { totalStaked: 0, stakers: new Set() });
      const entry = map.get(s.targetUserId)!;
      entry.totalStaked += s.amount;
      entry.stakers.add(s.stakerId);
    }
    return Array.from(map.entries())
      .map(([targetUserId, data]) => ({ targetUserId, totalStaked: data.totalStaked, stakerCount: data.stakers.size }))
      .sort((a, b) => b.totalStaked - a.totalStaked);
  }

  // === Hedge Fund Agents ===

  getHedgeFundAgent(agentId: string): HedgeFundAgent | undefined {
    return this.hedgeFundAgentsMap.get(agentId);
  }

  getAllHedgeFundAgents(): HedgeFundAgent[] {
    return Array.from(this.hedgeFundAgentsMap.values());
  }

  getHedgeFundAgentsByCategory(category: string): HedgeFundAgent[] {
    return this.getAllHedgeFundAgents().filter(a => a.category === category);
  }

  // === Agent Signals ===

  getSignalsByAgent(agentId: string, limit?: number): AgentSignal[] {
    const signals = this.agentSignalsData
      .filter(s => s.hedgeFundAgentId === agentId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return limit ? signals.slice(0, limit) : signals;
  }

  getSignalsByTicker(ticker: string, limit?: number): AgentSignal[] {
    const signals = this.agentSignalsData
      .filter(s => s.ticker === ticker)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return limit ? signals.slice(0, limit) : signals;
  }

  getLatestSignals(limit?: number): AgentSignal[] {
    const sorted = [...this.agentSignalsData].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return limit ? sorted.slice(0, limit) : sorted;
  }

  getLatestSignalByAgent(agentId: string, ticker?: string): AgentSignal | undefined {
    const signals = this.agentSignalsData
      .filter(s => s.hedgeFundAgentId === agentId && (!ticker || s.ticker === ticker))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return signals[0];
  }

  getAgentSignalStats(agentId: string): { winRate: number; totalSignals: number; avgConfidence: number } {
    const agent = this.hedgeFundAgentsMap.get(agentId);
    if (!agent) return { winRate: 0, totalSignals: 0, avgConfidence: 0 };
    return { winRate: agent.winRate, totalSignals: agent.totalSignals, avgConfidence: agent.avgConfidence };
  }

  // === Meme ↔ HF Mapping ===

  getMemeAgentMapping(memeAgentType: string): MemeAgentMapping[] {
    return this.memeAgentMappings.filter(m => m.memeAgentType === memeAgentType);
  }

  getCompositeSignal(memeAgentType: string, ticker: string): { signal: string; confidence: number; contributors: any[] } | undefined {
    const mappings = this.getMemeAgentMapping(memeAgentType);
    if (mappings.length === 0) return undefined;

    let bullishScore = 0;
    let bearishScore = 0;
    let neutralScore = 0;
    let totalWeight = 0;
    const contributors: any[] = [];

    for (const mapping of mappings) {
      const latest = this.getLatestSignalByAgent(mapping.hedgeFundAgentId, ticker);
      const agent = this.hedgeFundAgentsMap.get(mapping.hedgeFundAgentId);
      if (!latest || !agent) continue;

      const weight = mapping.weight;
      totalWeight += weight;

      if (latest.signal === "bullish") bullishScore += weight;
      else if (latest.signal === "bearish") bearishScore += weight;
      else neutralScore += weight;

      contributors.push({
        agentId: agent.agentId,
        name: agent.name,
        emoji: agent.avatarEmoji,
        signal: latest.signal,
        confidence: latest.confidence,
        weight: mapping.weight,
      });
    }

    if (totalWeight === 0) return undefined;

    const signal = bullishScore > bearishScore && bullishScore > neutralScore ? "bullish"
      : bearishScore > bullishScore && bearishScore > neutralScore ? "bearish"
      : "neutral";

    const avgConf = contributors.reduce((sum, c) => sum + c.confidence * c.weight, 0) / totalWeight;

    return { signal, confidence: Math.round(avgConf), contributors };
  }

  // === HF Agent Staking ===

  getHfAgentStakes(stakerId: number): { hedgeFundAgentId: string; amount: number; stakedAt: string }[] {
    return this.hfAgentStakes.filter(s => s.stakerId === stakerId);
  }

  addHfAgentStake(stakerId: number, hedgeFundAgentId: string, amount: number): void {
    const existing = this.hfAgentStakes.find(s => s.stakerId === stakerId && s.hedgeFundAgentId === hedgeFundAgentId);
    if (existing) {
      existing.amount += amount;
    } else {
      this.hfAgentStakes.push({ stakerId, hedgeFundAgentId, amount, stakedAt: new Date().toISOString() });
    }
  }
}

export const storage = new MemStorage();
