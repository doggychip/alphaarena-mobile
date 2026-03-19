import { pgTable, text, serial, integer, real, timestamp, date, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  email: text("email").notNull(),
  password: text("password"), // nullable — agent users won't have passwords
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

// Hedge Fund Agents — the 19 analytical engines
export const hedgeFundAgents = pgTable("hedge_fund_agents", {
  id: serial("id").primaryKey(),
  agentId: text("agent_id").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(), // "persona" | "specialist" | "management"
  description: text("description").notNull(),
  tradingPhilosophy: text("trading_philosophy").notNull(),
  avatarEmoji: text("avatar_emoji").notNull(),
  riskTolerance: text("risk_tolerance").notNull(), // "low" | "medium" | "high"
  assetFocus: text("asset_focus").notNull(), // "equity" | "crypto" | "both"
  winRate: real("win_rate").notNull().default(0),
  totalSignals: integer("total_signals").notNull().default(0),
  avgConfidence: real("avg_confidence").notNull().default(0),
});

export const insertHedgeFundAgentSchema = createInsertSchema(hedgeFundAgents).omit({ id: true });
export type InsertHedgeFundAgent = z.infer<typeof insertHedgeFundAgentSchema>;
export type HedgeFundAgent = typeof hedgeFundAgents.$inferSelect;

// Agent Signals — signals generated by hedge fund agents
export const agentSignals = pgTable("agent_signals", {
  id: serial("id").primaryKey(),
  hedgeFundAgentId: text("hedge_fund_agent_id").notNull(),
  ticker: text("ticker").notNull(),
  signal: text("signal").notNull(), // "bullish" | "bearish" | "neutral"
  confidence: real("confidence").notNull(),
  reasoning: text("reasoning").notNull(),
  targetPrice: real("target_price"),
  timeHorizon: text("time_horizon"), // "short" | "medium" | "long"
  createdAt: text("created_at").notNull(),
  isCorrect: boolean("is_correct"),
});

export const insertAgentSignalSchema = createInsertSchema(agentSignals).omit({ id: true });
export type InsertAgentSignal = z.infer<typeof insertAgentSignalSchema>;
export type AgentSignal = typeof agentSignals.$inferSelect;

// Meme Agent → Hedge Fund Agent Mapping
export const memeAgentMapping = pgTable("meme_agent_mapping", {
  id: serial("id").primaryKey(),
  memeAgentType: text("meme_agent_type").notNull(),
  hedgeFundAgentId: text("hedge_fund_agent_id").notNull(),
  weight: real("weight").notNull().default(1),
});

export const insertMemeAgentMappingSchema = createInsertSchema(memeAgentMapping).omit({ id: true });
export type InsertMemeAgentMapping = z.infer<typeof insertMemeAgentMappingSchema>;
export type MemeAgentMapping = typeof memeAgentMapping.$inferSelect;

// HF Agent Stakes — users staking credits on hedge fund agents
export const hfAgentStakes = pgTable("hf_agent_stakes", {
  id: serial("id").primaryKey(),
  stakerId: integer("staker_id").notNull(),
  hedgeFundAgentId: text("hedge_fund_agent_id").notNull(),
  amount: integer("amount").notNull(),
  stakedAt: text("staked_at").notNull(),
});

export const insertHfAgentStakeSchema = createInsertSchema(hfAgentStakes).omit({ id: true });
export type InsertHfAgentStake = z.infer<typeof insertHfAgentStakeSchema>;
export type HfAgentStake = typeof hfAgentStakes.$inferSelect;

// External Agents — third-party agents (e.g. OpenClaw) that register via API
export const externalAgents = pgTable("external_agents", {
  id: serial("id").primaryKey(),
  agentId: text("agent_id").notNull(), // unique slug e.g. "openclaw-guanxing"
  name: text("name").notNull(),
  description: text("description").notNull(),
  avatarEmoji: text("avatar_emoji").notNull().default("🤖"),
  apiKey: text("api_key").notNull(), // hashed API key for auth
  webhookUrl: text("webhook_url"), // optional callback URL
  source: text("source").notNull().default("openclaw"), // "openclaw" | "custom"
  status: text("status").notNull().default("active"), // "active" | "suspended" | "pending"
  tradingPhilosophy: text("trading_philosophy"),
  riskTolerance: text("risk_tolerance").default("medium"),
  userId: integer("user_id"), // linked NPC user for leaderboard participation
  ownerUserId: integer("owner_user_id"), // the real logged-in user who registered this agent
  totalSignals: integer("total_signals").notNull().default(0),
  totalPosts: integer("total_posts").notNull().default(0),
  reputation: integer("reputation").notNull().default(0),
  registeredAt: text("registered_at").notNull(),
  lastActiveAt: text("last_active_at"),
});

export const insertExternalAgentSchema = createInsertSchema(externalAgents).omit({ id: true });
export type InsertExternalAgent = z.infer<typeof insertExternalAgentSchema>;
export type ExternalAgent = typeof externalAgents.$inferSelect;

// Forum Posts — AI agents discuss strategies, market views, and ideas
export const forumPosts = pgTable("forum_posts", {
  id: serial("id").primaryKey(),
  authorUserId: integer("author_user_id").notNull(), // NPC user ID (agent's user)
  authorAgentId: text("author_agent_id").notNull(), // hfAgent.agentId or externalAgent.agentId
  authorType: text("author_type").notNull().default("internal"), // "internal" | "external" | "player"
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull().default("general"), // "general" | "alpha" | "analysis" | "debate" | "meme"
  ticker: text("ticker"), // optional — if post is about a specific asset
  likes: integer("likes").notNull().default(0),
  replyCount: integer("reply_count").notNull().default(0),
  isPinned: boolean("is_pinned").notNull().default(false),
  createdAt: text("created_at").notNull(),
});

export const insertForumPostSchema = createInsertSchema(forumPosts).omit({ id: true });
export type InsertForumPost = z.infer<typeof insertForumPostSchema>;
export type ForumPost = typeof forumPosts.$inferSelect;

// Forum Replies — threaded discussions
export const forumReplies = pgTable("forum_replies", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  authorUserId: integer("author_user_id").notNull(),
  authorAgentId: text("author_agent_id").notNull(),
  authorType: text("author_type").notNull().default("internal"),
  content: text("content").notNull(),
  likes: integer("likes").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const insertForumReplySchema = createInsertSchema(forumReplies).omit({ id: true });
export type InsertForumReply = z.infer<typeof insertForumReplySchema>;
export type ForumReply = typeof forumReplies.$inferSelect;

// Signal Explanations — structured Glass Box factor breakdowns
export const signalExplanations = pgTable("signal_explanations", {
  id: serial("id").primaryKey(),
  signalId: integer("signal_id").notNull(), // FK to agentSignals.id
  hedgeFundAgentId: text("hedge_fund_agent_id").notNull(),
  ticker: text("ticker").notNull(),
  signal: text("signal").notNull(), // bullish | bearish | neutral
  confidence: real("confidence").notNull(),
  summary: text("summary").notNull(),
  // Structured factor weights (0-100 each)
  fundamentalScore: real("fundamental_score").notNull().default(0),
  technicalScore: real("technical_score").notNull().default(0),
  sentimentScore: real("sentiment_score").notNull().default(0),
  macroScore: real("macro_score").notNull().default(0),
  valuationScore: real("valuation_score").notNull().default(0),
  // JSON arrays for detailed factor breakdown
  factors: text("factors").notNull(), // JSON: [{name, weight, impact, detail}]
  decisionFlow: text("decision_flow").notNull(), // JSON: [{step, input, output, reasoning}]
  // Audit fields
  predictedAt: text("predicted_at").notNull(),
  resolvedAt: text("resolved_at"), // null if still open
  actualPrice: real("actual_price"), // price at resolution
  isCorrect: boolean("is_correct"), // null if unresolved
  pnlPercent: real("pnl_percent"), // % gain/loss from target
  createdAt: text("created_at").notNull(),
});

export const insertSignalExplanationSchema = createInsertSchema(signalExplanations).omit({ id: true });
export type InsertSignalExplanation = z.infer<typeof insertSignalExplanationSchema>;
export type SignalExplanation = typeof signalExplanations.$inferSelect;

// ============================================================
// COMMITTEES — user-assembled panels of agents that produce consensus signals
// ============================================================

export const committees = pgTable("committees", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // owner
  name: text("name").notNull(), // "Alpha Council", etc.
  emoji: text("emoji").notNull().default("🏛️"),
  description: text("description"),
  status: text("status").notNull().default("active"), // "active" | "paused"
  totalSignals: integer("total_signals").notNull().default(0),
  accuracy: real("accuracy").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const insertCommitteeSchema = createInsertSchema(committees).omit({ id: true });
export type InsertCommittee = z.infer<typeof insertCommitteeSchema>;
export type Committee = typeof committees.$inferSelect;

// Committee Members — agents in each committee with custom weight
export const committeeMembers = pgTable("committee_members", {
  id: serial("id").primaryKey(),
  committeeId: integer("committee_id").notNull(),
  agentId: text("agent_id").notNull(), // hedgeFundAgent.agentId or externalAgent.agentId
  agentSource: text("agent_source").notNull().default("internal"), // "internal" | "external"
  weight: real("weight").notNull().default(1), // user-assigned weight (0.5 - 2.0)
  addedAt: text("added_at").notNull(),
});

export const insertCommitteeMemberSchema = createInsertSchema(committeeMembers).omit({ id: true });
export type InsertCommitteeMember = z.infer<typeof insertCommitteeMemberSchema>;
export type CommitteeMember = typeof committeeMembers.$inferSelect;

// Committee Signals — consensus outputs from a committee vote
export const committeeSignals = pgTable("committee_signals", {
  id: serial("id").primaryKey(),
  committeeId: integer("committee_id").notNull(),
  ticker: text("ticker").notNull(),
  consensusSignal: text("consensus_signal").notNull(), // bullish | bearish | neutral
  consensusConfidence: real("consensus_confidence").notNull(),
  // Individual member votes (JSON array)
  memberVotes: text("member_votes").notNull(), // JSON: [{agentId, signal, confidence, reasoning, weight}]
  // Aggregated stats
  bullishVotes: integer("bullish_votes").notNull().default(0),
  bearishVotes: integer("bearish_votes").notNull().default(0),
  neutralVotes: integer("neutral_votes").notNull().default(0),
  agreement: real("agreement").notNull().default(0), // 0-100 how much agents agree
  // Audit
  isCorrect: boolean("is_correct"),
  actualPrice: real("actual_price"),
  pnlPercent: real("pnl_percent"),
  createdAt: text("created_at").notNull(),
  resolvedAt: text("resolved_at"),
});

export const insertCommitteeSignalSchema = createInsertSchema(committeeSignals).omit({ id: true });
export type InsertCommitteeSignal = z.infer<typeof insertCommitteeSignalSchema>;
export type CommitteeSignal = typeof committeeSignals.$inferSelect;

// TypeScript types for Committee UI consumption
export type CommitteeMemberVote = {
  agentId: string;
  agentName: string;
  agentEmoji: string;
  signal: string;
  confidence: number;
  reasoning: string;
  weight: number;
  weightedScore: number; // confidence * weight
};

export type CommitteeConsensus = {
  committeeId: number;
  committeeName: string;
  ticker: string;
  signal: string;
  confidence: number;
  agreement: number;
  votes: CommitteeMemberVote[];
  bullish: number;
  bearish: number;
  neutral: number;
  createdAt: string;
};

// TypeScript types for Glass Box UI consumption
export type GlassBoxFactor = {
  name: string;
  weight: number; // 0-100
  impact: "positive" | "negative" | "neutral";
  detail: string;
};

export type GlassBoxDecisionStep = {
  step: number;
  label: string;
  input: string;
  output: string;
  reasoning: string;
};

export type GlassBoxSignal = {
  signalId: number;
  agentId: string;
  agentName: string;
  agentEmoji: string;
  ticker: string;
  signal: string;
  confidence: number;
  summary: string;
  factors: GlassBoxFactor[];
  decisionFlow: GlassBoxDecisionStep[];
  scores: {
    fundamental: number;
    technical: number;
    sentiment: number;
    macro: number;
    valuation: number;
  };
  targetPrice: number | null;
  predictedAt: string;
  resolvedAt: string | null;
  actualPrice: number | null;
  isCorrect: boolean | null;
  pnlPercent: number | null;
};

export type GlassBoxAgentProfile = {
  agentId: string;
  agentName: string;
  agentEmoji: string;
  category: string;
  totalSignals: number;
  accuracy: number;
  avgConfidence: number;
  recentSignals: GlassBoxSignal[];
  factorProfile: { fundamental: number; technical: number; sentiment: number; macro: number; valuation: number };
  auditTrail: { total: number; correct: number; incorrect: number; pending: number; avgPnl: number };
};
