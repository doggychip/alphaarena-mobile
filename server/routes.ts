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
  // AGENT CHAT
  // ============================================================

  app.post("/api/agent/chat", async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { message } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ message: "Message required" });
    }

    const memeAgent = await storage.getAgent(user.selectedAgentType);
    const hfAgent = !memeAgent ? await storage.getHedgeFundAgent(user.selectedAgentType) : null;
    const agent = memeAgent || hfAgent;
    const isMeme = !!memeAgent;

    // Get latest signals for context
    let signals: any[] = [];
    if (hfAgent) {
      signals = await storage.getSignalsByAgent(hfAgent.agentId, 10);
    } else if (memeAgent) {
      // Get signals from mapped HF agents
      const mappings = await storage.getMemeAgentMapping(user.selectedAgentType);
      for (const m of mappings.slice(0, 3)) {
        const sigs = await storage.getSignalsByAgent(m.hedgeFundAgentId, 3);
        signals.push(...sigs);
      }
    }

    // Get prices
    const { prices } = getCurrentPrices();
    const portfolio = await storage.getPortfolio(userId);
    const positions = await storage.getPositions(userId);
    const lowerMsg = message.toLowerCase();

    // Detect intent
    const tickerMention = [...(prices || []).map((p: any) => p.pair.split("/")[0])]
      .find(t => lowerMsg.includes(t.toLowerCase()));
    const isPortfolioQ = /portfolio|position|holding|balance|equity|pnl|p&l|my money/i.test(lowerMsg);
    const isMarketQ = /market|outlook|today|bull|bear|trend|how.*look|what.*think/i.test(lowerMsg);
    const isTickerQ = !!tickerMention;
    const isStrategyQ = /strateg|should i|buy|sell|advice|recommend|what.*do|when|how.*trade/i.test(lowerMsg);
    const isRiskQ = /risk|safe|danger|careful|protect|hedge|stop.?loss/i.test(lowerMsg);
    const isGreeting = /^(hi|hey|hello|sup|yo|gm|good morning|what'?s up)/i.test(lowerMsg);

    const agentName = agent?.name || "Agent";
    const agentEmoji = (agent as any)?.avatarEmoji || "🤖";
    const personality = isMeme ? (agent as any)?.personality || "" : "";
    const isAggressive = /aggressive|high/i.test(personality + ((hfAgent as any)?.riskTolerance || ""));
    const isCautious = /cautious|conservative|low/i.test(personality + ((hfAgent as any)?.riskTolerance || ""));

    // Find relevant signals
    const tickerSignals = tickerMention
      ? signals.filter((s: any) => s.ticker.toUpperCase() === tickerMention.toUpperCase()).slice(0, 3)
      : [];
    const bullishSignals = signals.filter((s: any) => s.signal === "bullish");
    const bearishSignals = signals.filter((s: any) => s.signal === "bearish");

    // Find price data for mentioned ticker
    const tickerPrice = tickerMention
      ? (prices || []).find((p: any) => p.pair.split("/")[0].toUpperCase() === tickerMention.toUpperCase())
      : null;

    let reply = "";

    if (isGreeting) {
      const greetings = isMeme ? [
        `Yo! ${agentEmoji} ${agentName} here. Markets are moving, what do you wanna know?`,
        `GM! Ready to make some plays today? Ask me about any ticker or the market vibe.`,
        `Hey! I've been watching the charts all day. What's on your mind?`,
      ] : [
        `Good to see you. I've been analyzing the markets. What would you like to discuss?`,
        `Hello. I have some insights on current market conditions. What area are you interested in?`,
        `Welcome back. I've been monitoring several assets. Ask me about any specific ticker or my current outlook.`,
      ];
      reply = greetings[Math.floor(Math.random() * greetings.length)];
    } else if (isTickerQ && tickerPrice) {
      const price = tickerPrice;
      const change = price.change24h;
      const direction = change >= 0 ? "up" : "down";
      const sig = tickerSignals[0];

      if (sig) {
        const confLabel = sig.confidence >= 75 ? "high confidence" : sig.confidence >= 55 ? "moderate confidence" : "low confidence";
        let reasoning = "";
        try { reasoning = JSON.parse(sig.reasoning).summary; } catch { reasoning = sig.reasoning; }

        reply = isMeme
          ? `${tickerMention.toUpperCase()} is ${direction} ${Math.abs(change).toFixed(1)}% today at $${price.price < 1 ? price.price.toFixed(4) : price.price.toLocaleString()}. My take? ${sig.signal.toUpperCase()} with ${sig.confidence}% confidence (${confLabel}). ${reasoning ? reasoning : ""} ${sig.signal === "bullish" ? "Could be a good entry 🚀" : sig.signal === "bearish" ? "I'd be careful here 📉" : "Waiting for a clearer setup ⏳"}`
          : `${tickerMention.toUpperCase()} — currently $${price.price < 1 ? price.price.toFixed(4) : price.price.toLocaleString()}, ${direction} ${Math.abs(change).toFixed(1)}% in 24h.\n\nMy analysis: ${sig.signal.toUpperCase()} at ${sig.confidence}% confidence.${sig.targetPrice ? ` Target: $${sig.targetPrice < 1 ? sig.targetPrice.toFixed(4) : sig.targetPrice.toLocaleString()}.` : ""}${reasoning ? ` ${reasoning}` : ""}\n\nThis is a ${confLabel} call based on my ${(hfAgent as any)?.category || ""} analysis.`;
      } else {
        reply = isMeme
          ? `${tickerMention.toUpperCase()} is trading at $${price.price < 1 ? price.price.toFixed(4) : price.price.toLocaleString()}, ${direction} ${Math.abs(change).toFixed(1)}% today. I don't have a strong signal on this one right now. Check back later or look at my other picks! 👀`
          : `${tickerMention.toUpperCase()} is at $${price.price < 1 ? price.price.toFixed(4) : price.price.toLocaleString()}, ${direction} ${Math.abs(change).toFixed(1)}% over 24h. I don't have an active signal on this asset currently. I'll update my analysis when I see a clearer setup.`;
      }
    } else if (isPortfolioQ) {
      const equity = portfolio?.totalEquity || 100000;
      const posCount = positions?.length || 0;
      const pnl = equity - 100000;
      reply = isMeme
        ? `Your portfolio: $${equity.toLocaleString()} ${pnl >= 0 ? "📈" : "📉"} (${pnl >= 0 ? "+" : ""}${((pnl / 100000) * 100).toFixed(1)}%). You've got ${posCount} position${posCount !== 1 ? "s" : ""} open. ${pnl >= 0 ? "We're vibing! Keep it up 🔥" : "Down but not out. Trust the process 💪"}`
        : `Portfolio value: $${equity.toLocaleString()} (${pnl >= 0 ? "+" : ""}${((pnl / 100000) * 100).toFixed(1)}% from starting capital). Currently ${posCount} open position${posCount !== 1 ? "s" : ""}. ${pnl >= 0 ? "Performance is positive. Consider rebalancing if concentrated." : "Drawdown is manageable. Review position sizing and stop-loss levels."}`;
    } else if (isMarketQ) {
      const bullCount = bullishSignals.length;
      const bearCount = bearishSignals.length;
      const sentiment = bullCount > bearCount ? "leaning bullish" : bearCount > bullCount ? "leaning bearish" : "mixed";
      const topBull = bullishSignals.sort((a: any, b: any) => b.confidence - a.confidence)[0];
      const topBear = bearishSignals.sort((a: any, b: any) => b.confidence - a.confidence)[0];

      reply = isMeme
        ? `Market vibe check: ${sentiment} ${sentiment.includes("bullish") ? "🟢" : sentiment.includes("bearish") ? "🔴" : "🟡"}. Got ${bullCount} bullish and ${bearCount} bearish signals right now.${topBull ? ` Most bullish on ${topBull.ticker} (${topBull.confidence}% conf).` : ""}${topBear ? ` Most bearish on ${topBear.ticker} (${topBear.confidence}% conf).` : ""} ${isAggressive ? "Time to size up! 🚀" : isCautious ? "Staying careful out here." : "Playing it smart."}`
        : `Current market assessment: ${sentiment}.\n\nI have ${bullCount} bullish and ${bearCount} bearish active signals.${topBull ? ` Highest conviction long: ${topBull.ticker} at ${topBull.confidence}% confidence.` : ""}${topBear ? ` Highest conviction short: ${topBear.ticker} at ${topBear.confidence}% confidence.` : ""}\n\nOverall, I'd characterize conditions as ${bullCount > bearCount + 2 ? "favorable for risk-on positioning" : bearCount > bullCount + 2 ? "risk-off, defensive positioning recommended" : "requiring selective, high-conviction plays"}.`;
    } else if (isStrategyQ) {
      const topSignal = signals.sort((a: any, b: any) => b.confidence - a.confidence)[0];
      reply = isMeme
        ? `${isAggressive ? "Full send time! 🚀" : isCautious ? "Easy does it..." : "Here's the play:"} ${topSignal ? `I'm most confident on ${topSignal.ticker} — ${topSignal.signal.toUpperCase()} at ${topSignal.confidence}%. ${topSignal.signal === "bullish" ? "Could be a solid entry." : topSignal.signal === "bearish" ? "Maybe short it or stay away." : "Watching and waiting."}` : "No strong signals rn. Sometimes the best trade is no trade. 🧘"} Always DYOR and don't risk more than you can afford to lose!`
        : `Based on my current analysis${topSignal ? `, the highest conviction opportunity is ${topSignal.ticker} — ${topSignal.signal.toUpperCase()} at ${topSignal.confidence}% confidence.${topSignal.targetPrice ? ` Target price: $${topSignal.targetPrice < 1 ? topSignal.targetPrice.toFixed(4) : topSignal.targetPrice.toLocaleString()}.` : ""}` : ", I don't see any high-confidence setups right now. Patience is a valid strategy."}\n\nRemember: position sizing matters more than entry points. ${isCautious ? "I'd keep individual positions under 5% of portfolio." : "Consider 2-5% position sizes for medium conviction, up to 10% for high conviction."}`;
    } else if (isRiskQ) {
      reply = isMeme
        ? `Risk management? ${isAggressive ? "Okay okay, I know I'm aggressive but even I have limits 😅" : "Smart thinking! 🧠"} Don't put more than 10% in any single trade. Set stop losses. And if you're feeling FOMO, that's usually when you should sit on your hands. ${isCautious ? "I like keeping things tight. Small positions, clear exits." : "Respect the risk and the gains will follow."}`
        : `Risk management principles:\n• Never allocate more than 5-10% to a single position\n• Set stop-losses at 2-3% below entry for swing trades\n• Maintain a cash buffer of at least 20-30%\n• Diversify across asset classes (both crypto and equity)\n• Higher confidence signals warrant larger positions, but still within limits\n\n${isCautious ? "As a conservative analyst, I recommend erring on the side of caution." : "These are guidelines — adjust based on your conviction level."}`;
    } else {
      // Default / fallback
      const fallbacks = isMeme ? [
        `Hmm, not sure about that one! Try asking me about a specific ticker (like BTC or TSLA), the market outlook, or your portfolio. I'm here to help! 💪`,
        `That's above my pay grade lol 😂 But I can tell you about market signals, your positions, or any ticker you're curious about!`,
        `Interesting question! I'm best at market analysis though. Try: "What do you think about ETH?" or "How's the market looking?" 📊`,
      ] : [
        `I appreciate the question. My expertise is in market analysis. I can discuss specific tickers, market outlook, portfolio assessment, strategy recommendations, or risk management. What interests you?`,
        `That's outside my analysis scope. Try asking about a specific asset (e.g., BTC, AAPL), my current market outlook, or portfolio strategy advice.`,
        `Let me redirect to where I can add value. I can analyze any ticker, give you my market outlook, review your portfolio, or discuss strategy and risk management.`,
      ];
      reply = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    res.json({ reply, agentName, agentEmoji });
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
