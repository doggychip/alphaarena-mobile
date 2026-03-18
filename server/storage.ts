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

  return { agents, users, competition, portfolios, positions, trades, snapshots, leaderboard, userAchievements, agentMessagesData, achievementDefs, stakesData, rewardsData };
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
}

export const storage = new MemStorage();
