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
}
