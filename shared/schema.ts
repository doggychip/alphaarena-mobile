import { pgTable, text, serial, integer, real, timestamp, date, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  email: text("email").notNull(),
  avatarUrl: text("avatar_url"),
  level: integer("level").notNull().default(1),
  xp: integer("xp").notNull().default(0),
  credits: integer("credits").notNull().default(1000),
  streak: integer("streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastTradeDate: text("last_trade_date"),
  selectedAgentType: text("selected_agent_type").notNull().default("bull"),
  createdAt: text("created_at").notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Agent companion types (the 6 meme characters)
export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // bull, bear, algo, moon, zen, degen
  name: text("name").notNull(),
  personality: text("personality").notNull(),
  tradingStyle: text("trading_style").notNull(),
  avatarEmoji: text("avatar_emoji").notNull(),
  description: text("description").notNull(),
  riskLevel: integer("risk_level").notNull(),
});

export const insertAgentSchema = createInsertSchema(agents).omit({ id: true });
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agents.$inferSelect;

// Competitions
export const competitions = pgTable("competitions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").notNull().default("active"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  season: integer("season").notNull().default(1),
  startingCapital: real("starting_capital").notNull().default(100000),
});

export const insertCompetitionSchema = createInsertSchema(competitions).omit({ id: true });
export type InsertCompetition = z.infer<typeof insertCompetitionSchema>;
export type Competition = typeof competitions.$inferSelect;

// Portfolios
export const portfolios = pgTable("portfolios", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  competitionId: integer("competition_id").notNull(),
  cashBalance: real("cash_balance").notNull().default(100000),
  totalEquity: real("total_equity").notNull().default(100000),
});

export const insertPortfolioSchema = createInsertSchema(portfolios).omit({ id: true });
export type InsertPortfolio = z.infer<typeof insertPortfolioSchema>;
export type Portfolio = typeof portfolios.$inferSelect;

// Positions
export const positions = pgTable("positions", {
  id: serial("id").primaryKey(),
  portfolioId: integer("portfolio_id").notNull(),
  pair: text("pair").notNull(),
  side: text("side").notNull(), // long or short
  quantity: real("quantity").notNull(),
  avgEntryPrice: real("avg_entry_price").notNull(),
  currentPrice: real("current_price").notNull(),
  unrealizedPnl: real("unrealized_pnl").notNull().default(0),
});

export const insertPositionSchema = createInsertSchema(positions).omit({ id: true });
export type InsertPosition = z.infer<typeof insertPositionSchema>;
export type Position = typeof positions.$inferSelect;

// Trades
export const trades = pgTable("trades", {
  id: serial("id").primaryKey(),
  portfolioId: integer("portfolio_id").notNull(),
  pair: text("pair").notNull(),
  side: text("side").notNull(), // buy or sell
  quantity: real("quantity").notNull(),
  price: real("price").notNull(),
  totalValue: real("total_value").notNull(),
  fee: real("fee").notNull().default(0),
  executedAt: text("executed_at").notNull(),
});

export const insertTradeSchema = createInsertSchema(trades).omit({ id: true });
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof trades.$inferSelect;

// Daily Snapshots
export const dailySnapshots = pgTable("daily_snapshots", {
  id: serial("id").primaryKey(),
  portfolioId: integer("portfolio_id").notNull(),
  date: text("date").notNull(),
  totalEquity: real("total_equity").notNull(),
  cashBalance: real("cash_balance").notNull(),
  dailyReturn: real("daily_return").notNull(),
  cumulativeReturn: real("cumulative_return").notNull(),
});

export const insertDailySnapshotSchema = createInsertSchema(dailySnapshots).omit({ id: true });
export type InsertDailySnapshot = z.infer<typeof insertDailySnapshotSchema>;
export type DailySnapshot = typeof dailySnapshots.$inferSelect;

// Leaderboard Entries
export const leaderboardEntries = pgTable("leaderboard_entries", {
  id: serial("id").primaryKey(),
  competitionId: integer("competition_id").notNull(),
  userId: integer("user_id").notNull(),
  rank: integer("rank").notNull(),
  totalReturn: real("total_return").notNull(),
  sharpeRatio: real("sharpe_ratio").notNull(),
  maxDrawdown: real("max_drawdown").notNull(),
  winRate: real("win_rate").notNull(),
  compositeScore: real("composite_score").notNull(),
});

export const insertLeaderboardEntrySchema = createInsertSchema(leaderboardEntries).omit({ id: true });
export type InsertLeaderboardEntry = z.infer<typeof insertLeaderboardEntrySchema>;
export type LeaderboardEntry = typeof leaderboardEntries.$inferSelect;

// Achievements
export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  achievementType: text("achievement_type").notNull(),
  unlockedAt: text("unlocked_at").notNull(),
});

export const insertAchievementSchema = createInsertSchema(achievements).omit({ id: true });
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type Achievement = typeof achievements.$inferSelect;

// Agent Messages (pre-seeded)
export const agentMessages = pgTable("agent_messages", {
  id: serial("id").primaryKey(),
  agentType: text("agent_type").notNull(),
  message: text("message").notNull(),
  mood: text("mood").notNull(), // euphoric, confident, neutral, nervous, rekt
  pair: text("pair"), // optional, if message is about a specific pair
});

export const insertAgentMessageSchema = createInsertSchema(agentMessages).omit({ id: true });
export type InsertAgentMessage = z.infer<typeof insertAgentMessageSchema>;
export type AgentMessage = typeof agentMessages.$inferSelect;

// Agent Stakes — users staking credits on leaderboard agents
export const stakes = pgTable("stakes", {
  id: serial("id").primaryKey(),
  stakerId: integer("staker_id").notNull(),
  targetUserId: integer("target_user_id").notNull(),
  amount: integer("amount").notNull(),
  stakedAt: text("staked_at").notNull(),
});

export const insertStakeSchema = createInsertSchema(stakes).omit({ id: true });
export type InsertStake = z.infer<typeof insertStakeSchema>;
export type Stake = typeof stakes.$inferSelect;

// Staking Rewards — historical reward payouts
export const stakingRewards = pgTable("staking_rewards", {
  id: serial("id").primaryKey(),
  stakerId: integer("staker_id").notNull(),
  targetUserId: integer("target_user_id").notNull(),
  amount: integer("amount").notNull(),
  reason: text("reason").notNull(),
  earnedAt: text("earned_at").notNull(),
});

export const insertStakingRewardSchema = createInsertSchema(stakingRewards).omit({ id: true });
export type InsertStakingReward = z.infer<typeof insertStakingRewardSchema>;
export type StakingReward = typeof stakingRewards.$inferSelect;
