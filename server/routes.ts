import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import passport from "passport";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { startPriceEngine, getCurrentPrices, getPriceForPair } from "./prices";
import { startSignalFetcher, getSignalFetchStatus } from "./signalFetcher";

// Type augmentation for passport session user
declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      email: string;
      password?: string | null;
      [key: string]: any;
    }
  }
}

// Auth middleware — returns 401 if not logged in
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

// Get the authenticated user ID, falling back to DEMO_USER_ID if no DB
function getUserId(req: Request): number {
  return (req as any).user?.id ?? 1;
}

export async function registerRoutes(httpServer: Server, app: Express) {
  // Start price engine
  startPriceEngine();

  // Start live signal fetcher
  startSignalFetcher();

  // ============================================================
  // AUTH ROUTES
  // ============================================================

  // Register a new user
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { username, email, password } = req.body;
      if (!username || !email || !password) {
        return res.status(400).json({ message: "username, email, and password are required" });
      }

      // Check if username taken
      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(409).json({ message: "Username already taken" });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        avatarUrl: null,
        level: 1,
        xp: 0,
        credits: 1000,
        streak: 0,
        longestStreak: 0,
        lastTradeDate: null,
        selectedAgentType: "bull",
        createdAt: new Date().toISOString(),
      });

      // Auto-login after registration
      req.logIn(user, (err) => {
        if (err) return res.status(500).json({ message: "Login failed after registration" });
        const { password: _pw, ...safeUser } = user as any;
        return res.status(201).json({ user: safeUser });
      });
    } catch (err: any) {
      console.error("Register error:", err);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Login
  app.post("/api/auth/login", (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Invalid credentials" });
      req.logIn(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        const { password: _pw, ...safeUser } = user;
        return res.json({ user: safeUser });
      });
    })(req, res, next);
  });

  // Logout
  app.post("/api/auth/logout", (req: Request, res: Response, next: NextFunction) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy(() => {
        res.json({ message: "Logged out" });
      });
    });
  });

  // Get current authenticated user
  app.get("/api/auth/me", (req: Request, res: Response) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const { password: _pw, ...safeUser } = (req as any).user;
    res.json({ user: safeUser });
  });

  // ============================================================
  // SIGNAL SOURCE STATUS
  // ============================================================

  app.get("/api/signals/source", async (_req: Request, res: Response) => {
    const storageStatus = await storage.getSignalSource();
    const fetcherStatus = getSignalFetchStatus();
    res.json({
      source: storageStatus.source,
      lastFetch: fetcherStatus.lastFetchTime,
      fetchStatus: fetcherStatus.fetchStatus,
      liveSignalCount: storageStatus.liveSignalCount,
      error: fetcherStatus.errorMessage,
      engineUrl: process.env.HF_ENGINE_URL ? "configured" : "not_configured",
    });
  });

  // ============================================================
  // USER PROFILE
  // ============================================================

  // Get current user (uses session user or fallback to demo)
  app.get("/api/me", async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    const portfolio = await storage.getPortfolio(userId);
    const leaderboardEntry = await storage.getLeaderboardEntry(userId);
    const memeAgent = await storage.getAgent(user.selectedAgentType);
    const hfAgent = !memeAgent ? await storage.getHedgeFundAgent(user.selectedAgentType) : null;
    const agent = memeAgent || hfAgent;
    const agentTier = memeAgent ? "meme" : hfAgent ? "hedge_fund" : "meme";
    const userAchievements = await storage.getUserAchievements(userId);
    const { password: _pw, ...safeUser } = user as any;
    res.json({ user: safeUser, portfolio, leaderboardEntry, agent, agentTier, achievements: userAchievements });
  });

  // Update user (e.g., switch agent) — works for both auth'd and guest users
  app.patch("/api/me", async (req: Request, res: Response) => {
    const userId = getUserId(req);
    // Whitelist safe fields only
    const allowedFields: Record<string, any> = {};
    if (req.body.selectedAgentType) allowedFields.selectedAgentType = req.body.selectedAgentType;
    if (Object.keys(allowedFields).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }
    const updated = await storage.updateUser(userId, allowedFields);
    if (!updated) return res.status(404).json({ message: "User not found" });
    const { password: _pw, ...safeUser } = updated as any;
    res.json(safeUser);
  });

  // ============================================================
  // PRICES
  // ============================================================

  app.get("/api/prices", (_req: Request, res: Response) => {
    const { prices, isLive } = getCurrentPrices();
    res.json({ prices, isLive });
  });

  // ============================================================
  // AGENTS
  // ============================================================

  app.get("/api/agents", async (_req: Request, res: Response) => {
    const agentsList = await storage.getAllAgents();
    res.json(agentsList);
  });

  app.get("/api/agent/message", async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const mood = req.query.mood as string || undefined;
    const message = await storage.getRandomAgentMessage(user.selectedAgentType, mood);
    res.json(message || { message: "No vibes rn... check back later 👀", mood: "neutral", agentType: user.selectedAgentType });
  });

  app.get("/api/agent/messages", async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const messages = await storage.getAgentMessages(user.selectedAgentType);
    const shuffled = [...messages].sort(() => Math.random() - 0.5).slice(0, 10);
    res.json(shuffled);
  });

  // ============================================================
  // PORTFOLIO
  // ============================================================

  app.get("/api/portfolio", async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const portfolio = await storage.getPortfolio(userId);
    if (!portfolio) return res.status(404).json({ message: "Portfolio not found" });

    const positionsList = await storage.getPositions(portfolio.id);
    const snapshotsList = await storage.getSnapshots(portfolio.id);

    const updatedPositions = positionsList.map(pos => {
      const currentPrice = getPriceForPair(pos.pair) || pos.currentPrice;
      const unrealizedPnl = (currentPrice - pos.avgEntryPrice) * pos.quantity * (pos.side === "long" ? 1 : -1);
      return { ...pos, currentPrice, unrealizedPnl: Math.round(unrealizedPnl * 100) / 100 };
    });

    res.json({ portfolio, positions: updatedPositions, snapshots: snapshotsList });
  });

  app.get("/api/trades", async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const portfolio = await storage.getPortfolio(userId);
    if (!portfolio) return res.status(404).json({ message: "Portfolio not found" });
    const tradesList = await storage.getTrades(portfolio.id);
    res.json(tradesList);
  });

  // Execute trade — requires auth
  app.post("/api/trade", requireAuth, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const { pair, side, quantity } = req.body;
    const price = getPriceForPair(pair);
    if (!price) return res.status(400).json({ message: "Invalid pair" });

    const portfolio = await storage.getPortfolio(userId);
    if (!portfolio) return res.status(404).json({ message: "Portfolio not found" });

    const totalValue = price * quantity;
    const fee = totalValue * 0.001; // 0.1% fee

    if (side === "buy" && portfolio.cashBalance < totalValue + fee) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    const trade = await storage.addTrade({
      portfolioId: portfolio.id,
      pair,
      side,
      quantity,
      price,
      totalValue,
      fee,
      executedAt: new Date().toISOString(),
    });

    if (side === "buy") {
      await storage.updatePortfolio(portfolio.id, {
        cashBalance: Math.round((portfolio.cashBalance - totalValue - fee) * 100) / 100,
      });
      const existingPositions = await storage.getPositions(portfolio.id);
      const existing = existingPositions.find(p => p.pair === pair && p.side === "long");
      if (!existing) {
        await storage.addPosition({
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
      await storage.updatePortfolio(portfolio.id, {
        cashBalance: Math.round((portfolio.cashBalance + totalValue - fee) * 100) / 100,
      });
    }

    const user = await storage.getUser(userId);
    if (user) {
      await storage.updateUser(userId, { xp: user.xp + 10 });
    }

    res.json({
      trade,
      message: `${side === "buy" ? "Bought" : "Sold"} ${quantity} ${pair.split("/")[0]} at $${price.toLocaleString()}`,
    });
  });

  // ============================================================
  // LEADERBOARD
  // ============================================================

  app.get("/api/leaderboard", async (_req: Request, res: Response) => {
    const competition = await storage.getActiveCompetition();
    if (!competition) return res.status(404).json({ message: "No active competition" });

    const entries = await storage.getLeaderboard(competition.id);
    res.json({ competition, entries });
  });

  app.get("/api/competition", async (_req: Request, res: Response) => {
    const competition = await storage.getActiveCompetition();
    res.json(competition);
  });

  // ============================================================
  // ACHIEVEMENTS
  // ============================================================

  app.get("/api/achievements", async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const userAchievements = await storage.getUserAchievements(userId);
    res.json(userAchievements);
  });

  app.get("/api/snapshots", async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const portfolio = await storage.getPortfolio(userId);
    if (!portfolio) return res.status(404).json({ message: "Portfolio not found" });
    const snapshotsList = await storage.getSnapshots(portfolio.id);
    res.json(snapshotsList);
  });

  // ============================================================
  // STAKING
  // ============================================================

  app.get("/api/staking/my-stakes", async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const stakesList = await storage.getStakesByStaker(userId);
    const enriched = await Promise.all(stakesList.map(async s => {
      const targetUser = await storage.getUser(s.targetUserId);
      const memeAgent = targetUser ? await storage.getAgent(targetUser.selectedAgentType) : undefined;
      const hfAgent = targetUser && !memeAgent ? await storage.getHedgeFundAgent(targetUser.selectedAgentType) : undefined;
      const agent = memeAgent || hfAgent;
      const leaderboardEntry = await storage.getLeaderboardEntry(s.targetUserId);
      return { ...s, targetUser, agent, leaderboardEntry };
    }));
    res.json(enriched);
  });

  app.get("/api/staking/leaderboard", async (_req: Request, res: Response) => {
    const leaderboard = await storage.getStakingLeaderboard();
    const enriched = await Promise.all(leaderboard.map(async entry => {
      const user = await storage.getUser(entry.targetUserId);
      const memeAgent = user ? await storage.getAgent(user.selectedAgentType) : undefined;
      const hfAgent = user && !memeAgent ? await storage.getHedgeFundAgent(user.selectedAgentType) : undefined;
      const agent = memeAgent || hfAgent;
      const lb = await storage.getLeaderboardEntry(entry.targetUserId);
      return { ...entry, user, agent, leaderboardEntry: lb };
    }));
    res.json(enriched);
  });

  app.get("/api/staking/agent/:userId", async (req: Request, res: Response) => {
    const targetUserId = parseInt(String(req.params.userId));
    const currentUserId = getUserId(req);
    const totalStaked = await storage.getTotalStakedOnUser(targetUserId);
    const stakesOnTarget = await storage.getStakesByTarget(targetUserId);
    const myStake = await storage.getStake(currentUserId, targetUserId);
    const user = await storage.getUser(targetUserId);
    const memeAgent = user ? await storage.getAgent(user.selectedAgentType) : undefined;
    const hfAgent = user && !memeAgent ? await storage.getHedgeFundAgent(user.selectedAgentType) : undefined;
    const agent = memeAgent || hfAgent;
    const leaderboardEntry = await storage.getLeaderboardEntry(targetUserId);
    res.json({
      totalStaked,
      stakerCount: new Set(stakesOnTarget.map(s => s.stakerId)).size,
      myStake,
      user,
      agent,
      leaderboardEntry,
    });
  });

  app.get("/api/staking/rewards", async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const rewards = await storage.getRewardsByStaker(userId);
    const enriched = await Promise.all(rewards.map(async r => {
      const targetUser = await storage.getUser(r.targetUserId);
      return { ...r, targetUser };
    }));
    res.json(enriched);
  });

  // Stake credits on an agent — requires auth
  app.post("/api/staking/stake", requireAuth, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const { targetUserId, amount } = req.body;
    if (!targetUserId || !amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid targetUserId or amount" });
    }

    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.credits < amount) {
      return res.status(400).json({ message: "Insufficient credits" });
    }

    const target = await storage.getUser(targetUserId);
    if (!target) return res.status(404).json({ message: "Target user not found" });

    const existing = await storage.getStake(userId, targetUserId);
    if (existing) {
      await storage.updateStake(userId, targetUserId, existing.amount + amount);
    } else {
      await storage.addStake({
        stakerId: userId,
        targetUserId,
        amount,
        stakedAt: new Date().toISOString(),
      });
    }

    await storage.updateUser(userId, { credits: user.credits - amount });
    await storage.updateUser(userId, { xp: (user.xp || 0) + 25 });

    res.json({ message: "Staked successfully", xpBonus: 25 });
  });

  // Unstake credits — requires auth
  app.post("/api/staking/unstake", requireAuth, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const { targetUserId } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ message: "Missing targetUserId" });
    }

    const stake = await storage.getStake(userId, targetUserId);
    if (!stake) return res.status(404).json({ message: "No stake found" });

    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    await storage.updateUser(userId, { credits: user.credits + stake.amount });
    await storage.removeStake(userId, targetUserId);

    res.json({ message: "Unstaked successfully", creditsReturned: stake.amount });
  });

  // Staking stats
  app.get("/api/staking/stats", async (_req: Request, res: Response) => {
    const leaderboard = await storage.getStakingLeaderboard();
    const totalStaked = leaderboard.reduce((sum, e) => sum + e.totalStaked, 0);
    const allStakerIds = new Set<number>();
    for (const e of leaderboard) {
      const stakesList = await storage.getStakesByTarget(e.targetUserId);
      stakesList.forEach(s => allStakerIds.add(s.stakerId));
    }
    res.json({
      totalStaked,
      totalStakers: allStakerIds.size,
      avgApy: 12.4,
      totalAgentsStaked: leaderboard.length,
    });
  });

  // ============================================================
  // USER PROFILES
  // ============================================================

  app.get("/api/user/:id", async (req: Request, res: Response) => {
    const targetUserId = parseInt(String(req.params.id));
    const user = await storage.getUser(targetUserId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const leaderboardEntry = await storage.getLeaderboardEntry(targetUserId);
    const memeAgent = await storage.getAgent(user.selectedAgentType);
    const hfAgent = !memeAgent ? await storage.getHedgeFundAgent(user.selectedAgentType) : null;
    const agent = memeAgent || hfAgent;
    const agentTier = memeAgent ? "meme" : hfAgent ? "hedge_fund" : "meme";
    const userAchievements = await storage.getUserAchievements(targetUserId);
    const { password: _pw, ...safeUser } = user as any;

    res.json({ user: safeUser, leaderboardEntry, agent, agentTier, achievements: userAchievements });
  });

  // ============================================================
  // HEDGE FUND AGENTS
  // ============================================================

  app.get("/api/hf-agents", async (_req: Request, res: Response) => {
    const agentsList = await storage.getAllHedgeFundAgents();
    res.json(agentsList);
  });

  app.get("/api/hf-agents/:agentId", async (req: Request, res: Response) => {
    const agent = await storage.getHedgeFundAgent(String(req.params.agentId));
    if (!agent) return res.status(404).json({ message: "Hedge fund agent not found" });
    const latestSignals = await storage.getSignalsByAgent(agent.agentId, 20);
    const stats = await storage.getAgentSignalStats(agent.agentId);
    res.json({ agent, latestSignals, stats });
  });

  app.get("/api/hf-agents/:agentId/signals", async (req: Request, res: Response) => {
    const ticker = req.query.ticker as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    let signals = await storage.getSignalsByAgent(String(req.params.agentId), limit);
    if (ticker) signals = signals.filter(s => s.ticker === ticker);
    res.json(signals);
  });

  // ============================================================
  // SIGNALS
  // ============================================================

  app.get("/api/signals", async (req: Request, res: Response) => {
    const ticker = req.query.ticker as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    let signals = await storage.getLatestSignals(limit * 2);
    if (ticker) signals = signals.filter(s => s.ticker === ticker);
    res.json(signals.slice(0, limit));
  });

  app.get("/api/signals/ticker/:ticker", async (req: Request, res: Response) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const signals = await storage.getSignalsByTicker(String(req.params.ticker), limit);
    res.json(signals);
  });

  app.get("/api/signals/latest", async (_req: Request, res: Response) => {
    const agentsList = await storage.getAllHedgeFundAgents();
    const latestSignals = (
      await Promise.all(
        agentsList.map(async agent => {
          const signal = await storage.getLatestSignalByAgent(agent.agentId);
          return signal ? { agent, signal } : null;
        })
      )
    ).filter(Boolean);
    res.json(latestSignals);
  });

  // ============================================================
  // MEME AGENT → HEDGE FUND MAPPING
  // ============================================================

  app.get("/api/agents/:type/hedge-fund", async (req: Request, res: Response) => {
    const mappings = await storage.getMemeAgentMapping(String(req.params.type));
    const enriched = await Promise.all(mappings.map(async m => {
      const hfAgent = await storage.getHedgeFundAgent(m.hedgeFundAgentId);
      const latestSignal = await storage.getLatestSignalByAgent(m.hedgeFundAgentId);
      return { ...m, hfAgent, latestSignal };
    }));
    res.json(enriched);
  });

  app.get("/api/agents/:type/composite-signal", async (req: Request, res: Response) => {
    const ticker = (req.query.ticker as string) || "BTC";
    const composite = await storage.getCompositeSignal(String(req.params.type), ticker);
    if (!composite) return res.json({ signal: "neutral", confidence: 50, contributors: [] });
    res.json(composite);
  });

  // ============================================================
  // HF AGENT STAKING
  // ============================================================

  app.post("/api/staking/stake-agent", requireAuth, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const { hedgeFundAgentId, amount } = req.body;
    if (!hedgeFundAgentId || !amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid hedgeFundAgentId or amount" });
    }
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.credits < amount) return res.status(400).json({ message: "Insufficient credits" });

    const agent = await storage.getHedgeFundAgent(hedgeFundAgentId);
    if (!agent) return res.status(404).json({ message: "Hedge fund agent not found" });

    await storage.addHfAgentStake(userId, hedgeFundAgentId, amount);
    await storage.updateUser(userId, { credits: user.credits - amount });

    res.json({ message: "Staked on agent successfully", agent: agent.name });
  });

  app.get("/api/staking/agent-stakes", async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const stakesList = await storage.getHfAgentStakes(userId);
    const enriched = await Promise.all(stakesList.map(async s => {
      const agent = await storage.getHedgeFundAgent(s.hedgeFundAgentId);
      return { ...s, agent };
    }));
    res.json(enriched);
  });
}
