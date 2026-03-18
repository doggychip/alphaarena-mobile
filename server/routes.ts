import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { startPriceEngine, getCurrentPrices, getPriceForPair } from "./prices";

const DEMO_USER_ID = 1;

export async function registerRoutes(httpServer: Server, app: Express) {
  // Start price engine
  startPriceEngine();

  // Get current user (demo user)
  app.get("/api/me", (_req, res) => {
    const user = storage.getUser(DEMO_USER_ID);
    if (!user) return res.status(404).json({ message: "User not found" });
    const portfolio = storage.getPortfolio(DEMO_USER_ID);
    const leaderboardEntry = storage.getLeaderboardEntry(DEMO_USER_ID);
    const agent = storage.getAgent(user.selectedAgentType);
    const achievements = storage.getUserAchievements(DEMO_USER_ID);
    res.json({ user, portfolio, leaderboardEntry, agent, achievements });
  });

  // Update user (e.g., switch agent)
  app.patch("/api/me", (req, res) => {
    const updated = storage.updateUser(DEMO_USER_ID, req.body);
    res.json(updated);
  });

  // Get prices
  app.get("/api/prices", (_req, res) => {
    const { prices, isLive } = getCurrentPrices();
    res.json({ prices, isLive });
  });

  // Get all agents
  app.get("/api/agents", (_req, res) => {
    const agents = storage.getAllAgents();
    res.json(agents);
  });

  // Get agent message (contextual)
  app.get("/api/agent/message", (req, res) => {
    const user = storage.getUser(DEMO_USER_ID);
    if (!user) return res.status(404).json({ message: "User not found" });
    
    const mood = req.query.mood as string || undefined;
    const message = storage.getRandomAgentMessage(user.selectedAgentType, mood);
    res.json(message || { message: "No vibes rn... check back later 👀", mood: "neutral", agentType: user.selectedAgentType });
  });

  // Get agent messages for chat
  app.get("/api/agent/messages", (req, res) => {
    const user = storage.getUser(DEMO_USER_ID);
    if (!user) return res.status(404).json({ message: "User not found" });
    
    const messages = storage.getAgentMessages(user.selectedAgentType);
    // Return a random selection of 10 messages
    const shuffled = [...messages].sort(() => Math.random() - 0.5).slice(0, 10);
    res.json(shuffled);
  });

  // Get portfolio
  app.get("/api/portfolio", (_req, res) => {
    const portfolio = storage.getPortfolio(DEMO_USER_ID);
    if (!portfolio) return res.status(404).json({ message: "Portfolio not found" });
    
    const positions = storage.getPositions(portfolio.id);
    const snapshots = storage.getSnapshots(portfolio.id);
    
    // Update positions with current prices
    const updatedPositions = positions.map(pos => {
      const currentPrice = getPriceForPair(pos.pair) || pos.currentPrice;
      const unrealizedPnl = (currentPrice - pos.avgEntryPrice) * pos.quantity * (pos.side === "long" ? 1 : -1);
      return { ...pos, currentPrice, unrealizedPnl: Math.round(unrealizedPnl * 100) / 100 };
    });
    
    res.json({ portfolio, positions: updatedPositions, snapshots });
  });

  // Get trades
  app.get("/api/trades", (_req, res) => {
    const portfolio = storage.getPortfolio(DEMO_USER_ID);
    if (!portfolio) return res.status(404).json({ message: "Portfolio not found" });
    const trades = storage.getTrades(portfolio.id);
    res.json(trades);
  });

  // Execute trade
  app.post("/api/trade", (req, res) => {
    const { pair, side, quantity } = req.body;
    const price = getPriceForPair(pair);
    if (!price) return res.status(400).json({ message: "Invalid pair" });
    
    const portfolio = storage.getPortfolio(DEMO_USER_ID);
    if (!portfolio) return res.status(404).json({ message: "Portfolio not found" });
    
    const totalValue = price * quantity;
    const fee = totalValue * 0.001; // 0.1% fee
    
    if (side === "buy" && portfolio.cashBalance < totalValue + fee) {
      return res.status(400).json({ message: "Insufficient balance" });
    }
    
    // Execute trade
    const trade = storage.addTrade({
      portfolioId: portfolio.id,
      pair,
      side,
      quantity,
      price,
      totalValue,
      fee,
      executedAt: new Date().toISOString(),
    });
    
    // Update portfolio balance
    if (side === "buy") {
      storage.updatePortfolio(portfolio.id, {
        cashBalance: Math.round((portfolio.cashBalance - totalValue - fee) * 100) / 100,
      });
      // Add or update position
      const existingPositions = storage.getPositions(portfolio.id);
      const existing = existingPositions.find(p => p.pair === pair && p.side === "long");
      if (!existing) {
        storage.addPosition({
          portfolioId: portfolio.id,
          pair,
          side: "long",
          quantity,
          avgEntryPrice: price,
          currentPrice: price,
          unrealizedPnl: 0,
        });
      }
    } else {
      storage.updatePortfolio(portfolio.id, {
        cashBalance: Math.round((portfolio.cashBalance + totalValue - fee) * 100) / 100,
      });
    }
    
    // Update user XP
    const user = storage.getUser(DEMO_USER_ID);
    if (user) {
      storage.updateUser(DEMO_USER_ID, { xp: user.xp + 10 });
    }
    
    res.json({ trade, message: `${side === "buy" ? "Bought" : "Sold"} ${quantity} ${pair.split("/")[0]} at $${price.toLocaleString()}` });
  });

  // Get leaderboard
  app.get("/api/leaderboard", (_req, res) => {
    const competition = storage.getActiveCompetition();
    if (!competition) return res.status(404).json({ message: "No active competition" });
    
    const entries = storage.getLeaderboard(competition.id);
    res.json({ competition, entries });
  });

  // Get competition
  app.get("/api/competition", (_req, res) => {
    const competition = storage.getActiveCompetition();
    res.json(competition);
  });

  // Get user achievements
  app.get("/api/achievements", (_req, res) => {
    const achievements = storage.getUserAchievements(DEMO_USER_ID);
    res.json(achievements);
  });

  // Get daily snapshots for portfolio sparkline
  app.get("/api/snapshots", (_req, res) => {
    const portfolio = storage.getPortfolio(DEMO_USER_ID);
    if (!portfolio) return res.status(404).json({ message: "Portfolio not found" });
    const snapshots = storage.getSnapshots(portfolio.id);
    res.json(snapshots);
  });

  // === STAKING ===

  // Get demo user's stakes with target user info
  app.get("/api/staking/my-stakes", (_req, res) => {
    const stakes = storage.getStakesByStaker(DEMO_USER_ID);
    const enriched = stakes.map(s => {
      const targetUser = storage.getUser(s.targetUserId);
      const agent = targetUser ? storage.getAgent(targetUser.selectedAgentType) : undefined;
      const leaderboardEntry = storage.getLeaderboardEntry(s.targetUserId);
      return { ...s, targetUser, agent, leaderboardEntry };
    });
    res.json(enriched);
  });

  // Staking leaderboard — top agents by total credits staked
  app.get("/api/staking/leaderboard", (_req, res) => {
    const leaderboard = storage.getStakingLeaderboard();
    const enriched = leaderboard.map(entry => {
      const user = storage.getUser(entry.targetUserId);
      const agent = user ? storage.getAgent(user.selectedAgentType) : undefined;
      const lb = storage.getLeaderboardEntry(entry.targetUserId);
      return { ...entry, user, agent, leaderboardEntry: lb };
    });
    res.json(enriched);
  });

  // Get staking info for a specific agent/user
  app.get("/api/staking/agent/:userId", (req, res) => {
    const userId = parseInt(req.params.userId);
    const totalStaked = storage.getTotalStakedOnUser(userId);
    const stakesOnTarget = storage.getStakesByTarget(userId);
    const myStake = storage.getStake(DEMO_USER_ID, userId);
    const user = storage.getUser(userId);
    const agent = user ? storage.getAgent(user.selectedAgentType) : undefined;
    const leaderboardEntry = storage.getLeaderboardEntry(userId);
    res.json({
      totalStaked,
      stakerCount: new Set(stakesOnTarget.map(s => s.stakerId)).size,
      myStake,
      user,
      agent,
      leaderboardEntry,
    });
  });

  // Demo user's reward history
  app.get("/api/staking/rewards", (_req, res) => {
    const rewards = storage.getRewardsByStaker(DEMO_USER_ID);
    const enriched = rewards.map(r => {
      const targetUser = storage.getUser(r.targetUserId);
      return { ...r, targetUser };
    });
    res.json(enriched);
  });

  // Stake credits on an agent
  app.post("/api/staking/stake", (req, res) => {
    const { targetUserId, amount } = req.body;
    if (!targetUserId || !amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid targetUserId or amount" });
    }

    const user = storage.getUser(DEMO_USER_ID);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.credits < amount) {
      return res.status(400).json({ message: "Insufficient credits" });
    }

    const target = storage.getUser(targetUserId);
    if (!target) return res.status(404).json({ message: "Target user not found" });

    // Check if already staked — if so, add to existing
    const existing = storage.getStake(DEMO_USER_ID, targetUserId);
    if (existing) {
      storage.updateStake(DEMO_USER_ID, targetUserId, existing.amount + amount);
    } else {
      storage.addStake({
        stakerId: DEMO_USER_ID,
        targetUserId,
        amount,
        stakedAt: new Date().toISOString(),
      });
    }

    // Deduct credits
    storage.updateUser(DEMO_USER_ID, { credits: user.credits - amount });

    // XP bonus
    storage.updateUser(DEMO_USER_ID, { xp: (user.xp || 0) + 25 });

    res.json({ message: "Staked successfully", xpBonus: 25 });
  });

  // Unstake credits from an agent
  app.post("/api/staking/unstake", (req, res) => {
    const { targetUserId } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ message: "Missing targetUserId" });
    }

    const stake = storage.getStake(DEMO_USER_ID, targetUserId);
    if (!stake) return res.status(404).json({ message: "No stake found" });

    const user = storage.getUser(DEMO_USER_ID);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Return credits
    storage.updateUser(DEMO_USER_ID, { credits: user.credits + stake.amount });

    // Remove stake
    storage.removeStake(DEMO_USER_ID, targetUserId);

    res.json({ message: "Unstaked successfully", creditsReturned: stake.amount });
  });

  // Overall staking stats
  app.get("/api/staking/stats", (_req, res) => {
    const leaderboard = storage.getStakingLeaderboard();
    const totalStaked = leaderboard.reduce((sum, e) => sum + e.totalStaked, 0);
    const allStakerIds = new Set<number>();
    for (const e of leaderboard) {
      const stakes = storage.getStakesByTarget(e.targetUserId);
      stakes.forEach(s => allStakerIds.add(s.stakerId));
    }
    res.json({
      totalStaked,
      totalStakers: allStakerIds.size,
      avgApy: 12.4,
      totalAgentsStaked: leaderboard.length,
    });
  });

  // Get another user's profile (from leaderboard)
  app.get("/api/user/:id", (req, res) => {
    const userId = parseInt(req.params.id);
    const user = storage.getUser(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const leaderboardEntry = storage.getLeaderboardEntry(userId);
    const agent = storage.getAgent(user.selectedAgentType);
    const achievements = storage.getUserAchievements(userId);

    res.json({ user, leaderboardEntry, agent, achievements });
  });

  // === HEDGE FUND AGENTS ===

  // List all 19 hedge fund agents
  app.get("/api/hf-agents", (_req, res) => {
    const agents = storage.getAllHedgeFundAgents();
    res.json(agents);
  });

  // Single agent detail with latest signals
  app.get("/api/hf-agents/:agentId", (req, res) => {
    const agent = storage.getHedgeFundAgent(req.params.agentId);
    if (!agent) return res.status(404).json({ message: "Hedge fund agent not found" });
    const latestSignals = storage.getSignalsByAgent(agent.agentId, 20);
    const stats = storage.getAgentSignalStats(agent.agentId);
    res.json({ agent, latestSignals, stats });
  });

  // All signals for an agent
  app.get("/api/hf-agents/:agentId/signals", (req, res) => {
    const ticker = req.query.ticker as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    let signals = storage.getSignalsByAgent(req.params.agentId, limit);
    if (ticker) signals = signals.filter(s => s.ticker === ticker);
    res.json(signals);
  });

  // === SIGNALS ===

  // Global live signals feed
  app.get("/api/signals", (req, res) => {
    const ticker = req.query.ticker as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    let signals = storage.getLatestSignals(limit * 2); // get extra then filter
    if (ticker) signals = signals.filter(s => s.ticker === ticker);
    res.json(signals.slice(0, limit));
  });

  // All agent signals for a specific ticker
  app.get("/api/signals/ticker/:ticker", (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const signals = storage.getSignalsByTicker(req.params.ticker, limit);
    res.json(signals);
  });

  // Latest signal from each agent (live board)
  app.get("/api/signals/latest", (_req, res) => {
    const agents = storage.getAllHedgeFundAgents();
    const latestSignals = agents.map(agent => {
      const signal = storage.getLatestSignalByAgent(agent.agentId);
      return signal ? { agent, signal } : null;
    }).filter(Boolean);
    res.json(latestSignals);
  });

  // === MEME AGENT → HEDGE FUND MAPPING ===

  // Get hedge fund agents powering a meme agent
  app.get("/api/agents/:type/hedge-fund", (req, res) => {
    const mappings = storage.getMemeAgentMapping(req.params.type);
    const enriched = mappings.map(m => {
      const hfAgent = storage.getHedgeFundAgent(m.hedgeFundAgentId);
      const latestSignal = storage.getLatestSignalByAgent(m.hedgeFundAgentId);
      return { ...m, hfAgent, latestSignal };
    });
    res.json(enriched);
  });

  // Composite signal for meme agent
  app.get("/api/agents/:type/composite-signal", (req, res) => {
    const ticker = (req.query.ticker as string) || "BTC";
    const composite = storage.getCompositeSignal(req.params.type, ticker);
    if (!composite) return res.json({ signal: "neutral", confidence: 50, contributors: [] });
    res.json(composite);
  });

  // === HF AGENT STAKING ===

  // Stake on a hedge fund agent
  app.post("/api/staking/stake-agent", (req, res) => {
    const { hedgeFundAgentId, amount } = req.body;
    if (!hedgeFundAgentId || !amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid hedgeFundAgentId or amount" });
    }
    const user = storage.getUser(DEMO_USER_ID);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.credits < amount) return res.status(400).json({ message: "Insufficient credits" });

    const agent = storage.getHedgeFundAgent(hedgeFundAgentId);
    if (!agent) return res.status(404).json({ message: "Hedge fund agent not found" });

    storage.addHfAgentStake(DEMO_USER_ID, hedgeFundAgentId, amount);
    storage.updateUser(DEMO_USER_ID, { credits: user.credits - amount });

    res.json({ message: "Staked on agent successfully", agent: agent.name });
  });

  // Get user's HF agent stakes
  app.get("/api/staking/agent-stakes", (_req, res) => {
    const stakes = storage.getHfAgentStakes(DEMO_USER_ID);
    const enriched = stakes.map(s => {
      const agent = storage.getHedgeFundAgent(s.hedgeFundAgentId);
      return { ...s, agent };
    });
    res.json(enriched);
  });
}
