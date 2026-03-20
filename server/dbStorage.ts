import { eq, desc, and, or, sql, count, sum, avg } from "drizzle-orm";
import { db } from "./db";
import type { IStorage } from "./storage";
import type {
  User, InsertUser,
  Agent,
  Competition,
  Portfolio,
  Position, InsertPosition,
  Trade, InsertTrade,
  DailySnapshot,
  LeaderboardEntry,
  Achievement, InsertAchievement,
  AgentMessage,
  Stake, InsertStake,
  StakingReward, InsertStakingReward,
  HedgeFundAgent,
  AgentSignal,
  MemeAgentMapping,
  ExternalAgent, InsertExternalAgent,
  ForumPost, InsertForumPost,
  ForumReply, InsertForumReply,
  SignalExplanation, InsertSignalExplanation,
  Committee, InsertCommittee,
  CommitteeMember, InsertCommitteeMember,
  CommitteeSignal, InsertCommitteeSignal,
  CommitteeDebate, InsertCommitteeDebate,
  CommitteeDebateMessage, InsertCommitteeDebateMessage,
} from "@shared/schema";
import {
  users,
  agents,
  competitions,
  portfolios,
  positions,
  trades,
  dailySnapshots,
  leaderboardEntries,
  achievements,
  agentMessages,
  stakes,
  stakingRewards,
  hedgeFundAgents,
  agentSignals,
  memeAgentMapping,
  hfAgentStakes,
  externalAgents,
  forumPosts,
  forumReplies,
  signalExplanations,
  committees,
  committeeMembers,
  committeeSignals,
  committeeDebates,
  committeeDebateMessages,
} from "@shared/schema";

function getDb() {
  if (!db) throw new Error("Database not available");
  return db;
}

export class DatabaseStorage implements IStorage {
  private _signalSource: "simulated" | "live" = "simulated";
  private _lastLiveFetch: string | null = null;

  // ===================== USERS =====================

  async getUser(id: number): Promise<User | undefined> {
    const result = await getDb().select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return getDb().select().from(users);
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const result = await getDb().update(users).set(data).where(eq(users.id, id)).returning();
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await getDb()
      .select()
      .from(users)
      .where(sql`lower(${users.username}) = lower(${username})`)
      .limit(1);
    return result[0];
  }

  async createUser(userData: InsertUser & { password: string }): Promise<User> {
    const result = await getDb().insert(users).values(userData).returning();
    return result[0];
  }

  // ===================== AGENTS =====================

  async getAgent(type: string): Promise<Agent | undefined> {
    const result = await getDb().select().from(agents).where(eq(agents.type, type)).limit(1);
    return result[0];
  }

  async getAllAgents(): Promise<Agent[]> {
    return getDb().select().from(agents);
  }

  // ===================== COMPETITIONS =====================

  async getActiveCompetition(): Promise<Competition | undefined> {
    const result = await getDb()
      .select()
      .from(competitions)
      .where(eq(competitions.status, "active"))
      .limit(1);
    return result[0];
  }

  // ===================== PORTFOLIOS =====================

  async getPortfolio(userId: number): Promise<Portfolio | undefined> {
    const result = await getDb()
      .select()
      .from(portfolios)
      .where(eq(portfolios.userId, userId))
      .limit(1);
    return result[0];
  }

  async updatePortfolio(id: number, data: Partial<Portfolio>): Promise<Portfolio | undefined> {
    const result = await getDb()
      .update(portfolios)
      .set(data)
      .where(eq(portfolios.id, id))
      .returning();
    return result[0];
  }

  // ===================== POSITIONS =====================

  async getPositions(portfolioId: number): Promise<Position[]> {
    return getDb().select().from(positions).where(eq(positions.portfolioId, portfolioId));
  }

  async addPosition(pos: InsertPosition): Promise<Position> {
    const result = await getDb().insert(positions).values(pos).returning();
    return result[0];
  }

  // ===================== TRADES =====================

  async getTrades(portfolioId: number): Promise<Trade[]> {
    return getDb()
      .select()
      .from(trades)
      .where(eq(trades.portfolioId, portfolioId))
      .orderBy(desc(trades.id));
  }

  async addTrade(trade: InsertTrade): Promise<Trade> {
    const result = await getDb().insert(trades).values(trade).returning();
    return result[0];
  }

  // ===================== SNAPSHOTS =====================

  async getSnapshots(portfolioId: number): Promise<DailySnapshot[]> {
    return getDb()
      .select()
      .from(dailySnapshots)
      .where(eq(dailySnapshots.portfolioId, portfolioId))
      .orderBy(dailySnapshots.date);
  }

  // ===================== LEADERBOARD =====================

  async getLeaderboard(competitionId: number): Promise<(LeaderboardEntry & { user: User; agent: Agent })[]> {
    const entries = await getDb()
      .select()
      .from(leaderboardEntries)
      .where(eq(leaderboardEntries.competitionId, competitionId))
      .orderBy(leaderboardEntries.rank);

    const result: (LeaderboardEntry & { user: User; agent: Agent })[] = [];

    for (const entry of entries) {
      const userRows = await getDb().select().from(users).where(eq(users.id, entry.userId)).limit(1);
      const user = userRows[0];
      if (!user) continue;

      // Dual-lookup: meme agent first, then HF agent
      const memeRows = await getDb().select().from(agents).where(eq(agents.type, user.selectedAgentType)).limit(1);
      let agent: Agent | undefined = memeRows[0];

      if (!agent) {
        const hfRows = await getDb()
          .select()
          .from(hedgeFundAgents)
          .where(eq(hedgeFundAgents.agentId, user.selectedAgentType))
          .limit(1);
        const hf = hfRows[0];
        if (hf) {
          agent = {
            id: hf.id,
            type: hf.agentId,
            name: hf.name,
            avatarEmoji: hf.avatarEmoji,
            personality: hf.category,
            tradingStyle: hf.tradingPhilosophy.split(".")[0],
            description: hf.description,
            riskLevel: hf.riskTolerance === "high" ? 4 : hf.riskTolerance === "medium" ? 3 : 2,
          } as Agent;
        }
      }

      if (!agent) continue;
      result.push({ ...entry, user, agent });
    }

    return result;
  }

  async getLeaderboardEntry(userId: number): Promise<LeaderboardEntry | undefined> {
    const result = await getDb()
      .select()
      .from(leaderboardEntries)
      .where(eq(leaderboardEntries.userId, userId))
      .limit(1);
    return result[0];
  }

  // ===================== ACHIEVEMENTS =====================

  async getUserAchievements(userId: number): Promise<Achievement[]> {
    return getDb().select().from(achievements).where(eq(achievements.userId, userId));
  }

  async addAchievement(ach: InsertAchievement): Promise<Achievement> {
    const result = await getDb().insert(achievements).values(ach).returning();
    return result[0];
  }

  // ===================== AGENT MESSAGES =====================

  async getAgentMessages(agentType: string, mood?: string): Promise<AgentMessage[]> {
    if (mood) {
      return getDb()
        .select()
        .from(agentMessages)
        .where(and(eq(agentMessages.agentType, agentType), eq(agentMessages.mood, mood)));
    }
    return getDb().select().from(agentMessages).where(eq(agentMessages.agentType, agentType));
  }

  async getRandomAgentMessage(agentType: string, mood?: string): Promise<AgentMessage | undefined> {
    const msgs = await this.getAgentMessages(agentType, mood);
    if (msgs.length === 0) return undefined;
    return msgs[Math.floor(Math.random() * msgs.length)];
  }

  // ===================== STAKING =====================

  async getStakesByStaker(stakerId: number): Promise<Stake[]> {
    return getDb().select().from(stakes).where(eq(stakes.stakerId, stakerId));
  }

  async getStakesByTarget(targetUserId: number): Promise<Stake[]> {
    return getDb().select().from(stakes).where(eq(stakes.targetUserId, targetUserId));
  }

  async getStake(stakerId: number, targetUserId: number): Promise<Stake | undefined> {
    const result = await getDb()
      .select()
      .from(stakes)
      .where(and(eq(stakes.stakerId, stakerId), eq(stakes.targetUserId, targetUserId)))
      .limit(1);
    return result[0];
  }

  async getTotalStakedOnUser(targetUserId: number): Promise<number> {
    const result = await getDb()
      .select({ total: sql<number>`coalesce(sum(${stakes.amount}), 0)` })
      .from(stakes)
      .where(eq(stakes.targetUserId, targetUserId));
    return Number(result[0]?.total ?? 0);
  }

  async addStake(stake: InsertStake): Promise<Stake> {
    const result = await getDb().insert(stakes).values(stake).returning();
    return result[0];
  }

  async removeStake(stakerId: number, targetUserId: number): Promise<boolean> {
    const result = await getDb()
      .delete(stakes)
      .where(and(eq(stakes.stakerId, stakerId), eq(stakes.targetUserId, targetUserId)))
      .returning();
    return result.length > 0;
  }

  async updateStake(stakerId: number, targetUserId: number, amount: number): Promise<Stake | undefined> {
    const result = await getDb()
      .update(stakes)
      .set({ amount })
      .where(and(eq(stakes.stakerId, stakerId), eq(stakes.targetUserId, targetUserId)))
      .returning();
    return result[0];
  }

  // ===================== STAKING REWARDS =====================

  async getRewardsByStaker(stakerId: number): Promise<StakingReward[]> {
    return getDb()
      .select()
      .from(stakingRewards)
      .where(eq(stakingRewards.stakerId, stakerId))
      .orderBy(desc(stakingRewards.earnedAt));
  }

  async addReward(reward: InsertStakingReward): Promise<StakingReward> {
    const result = await getDb().insert(stakingRewards).values(reward).returning();
    return result[0];
  }

  async getStakingLeaderboard(): Promise<{ targetUserId: number; totalStaked: number; stakerCount: number }[]> {
    const rows = await getDb()
      .select({
        targetUserId: stakes.targetUserId,
        totalStaked: sql<number>`coalesce(sum(${stakes.amount}), 0)`,
        stakerCount: sql<number>`count(distinct ${stakes.stakerId})`,
      })
      .from(stakes)
      .groupBy(stakes.targetUserId)
      .orderBy(desc(sql`sum(${stakes.amount})`));

    return rows.map(r => ({
      targetUserId: r.targetUserId,
      totalStaked: Number(r.totalStaked),
      stakerCount: Number(r.stakerCount),
    }));
  }

  // ===================== HEDGE FUND AGENTS =====================

  async getHedgeFundAgent(agentId: string): Promise<HedgeFundAgent | undefined> {
    const result = await getDb()
      .select()
      .from(hedgeFundAgents)
      .where(eq(hedgeFundAgents.agentId, agentId))
      .limit(1);
    return result[0];
  }

  async getAllHedgeFundAgents(): Promise<HedgeFundAgent[]> {
    return getDb().select().from(hedgeFundAgents);
  }

  async getHedgeFundAgentsByCategory(category: string): Promise<HedgeFundAgent[]> {
    return getDb()
      .select()
      .from(hedgeFundAgents)
      .where(eq(hedgeFundAgents.category, category));
  }

  // ===================== AGENT SIGNALS =====================

  async getSignalsByAgent(agentId: string, limit?: number): Promise<AgentSignal[]> {
    const q = getDb()
      .select()
      .from(agentSignals)
      .where(eq(agentSignals.hedgeFundAgentId, agentId))
      .orderBy(desc(agentSignals.createdAt));
    if (limit) return (q as any).limit(limit);
    return q;
  }

  async getSignalsByTicker(ticker: string, limit?: number): Promise<AgentSignal[]> {
    const q = getDb()
      .select()
      .from(agentSignals)
      .where(eq(agentSignals.ticker, ticker))
      .orderBy(desc(agentSignals.createdAt));
    if (limit) return (q as any).limit(limit);
    return q;
  }

  async getLatestSignals(limit?: number): Promise<AgentSignal[]> {
    const q = getDb()
      .select()
      .from(agentSignals)
      .orderBy(desc(agentSignals.createdAt));
    if (limit) return (q as any).limit(limit);
    return q;
  }

  async getLatestSignalByAgent(agentId: string, ticker?: string): Promise<AgentSignal | undefined> {
    if (ticker) {
      const result = await getDb()
        .select()
        .from(agentSignals)
        .where(and(eq(agentSignals.hedgeFundAgentId, agentId), eq(agentSignals.ticker, ticker)))
        .orderBy(desc(agentSignals.createdAt))
        .limit(1);
      return result[0];
    }
    const result = await getDb()
      .select()
      .from(agentSignals)
      .where(eq(agentSignals.hedgeFundAgentId, agentId))
      .orderBy(desc(agentSignals.createdAt))
      .limit(1);
    return result[0];
  }

  async getAgentSignalStats(agentId: string): Promise<{ winRate: number; totalSignals: number; avgConfidence: number }> {
    const agent = await this.getHedgeFundAgent(agentId);
    if (!agent) return { winRate: 0, totalSignals: 0, avgConfidence: 0 };
    return {
      winRate: agent.winRate,
      totalSignals: agent.totalSignals,
      avgConfidence: agent.avgConfidence,
    };
  }

  // ===================== MEME AGENT MAPPING =====================

  async getMemeAgentMapping(memeAgentType: string): Promise<MemeAgentMapping[]> {
    return getDb()
      .select()
      .from(memeAgentMapping)
      .where(eq(memeAgentMapping.memeAgentType, memeAgentType));
  }

  async getCompositeSignal(
    memeAgentType: string,
    ticker: string
  ): Promise<{ signal: string; confidence: number; contributors: any[] } | undefined> {
    const mappings = await this.getMemeAgentMapping(memeAgentType);
    if (mappings.length === 0) return undefined;

    let bullishScore = 0;
    let bearishScore = 0;
    let neutralScore = 0;
    let totalWeight = 0;
    const contributors: any[] = [];

    for (const mapping of mappings) {
      const latest = await this.getLatestSignalByAgent(mapping.hedgeFundAgentId, ticker);
      const agentRows = await getDb()
        .select()
        .from(hedgeFundAgents)
        .where(eq(hedgeFundAgents.agentId, mapping.hedgeFundAgentId))
        .limit(1);
      const agent = agentRows[0];
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

    const signal =
      bullishScore > bearishScore && bullishScore > neutralScore
        ? "bullish"
        : bearishScore > bullishScore && bearishScore > neutralScore
        ? "bearish"
        : "neutral";

    const avgConf =
      contributors.reduce((s, c) => s + c.confidence * c.weight, 0) / totalWeight;

    return { signal, confidence: Math.round(avgConf), contributors };
  }

  // ===================== HF AGENT STAKING =====================

  async getHfAgentStakes(
    stakerId: number
  ): Promise<{ hedgeFundAgentId: string; amount: number; stakedAt: string }[]> {
    const rows = await getDb()
      .select()
      .from(hfAgentStakes)
      .where(eq(hfAgentStakes.stakerId, stakerId));
    return rows.map(r => ({
      hedgeFundAgentId: r.hedgeFundAgentId,
      amount: r.amount,
      stakedAt: r.stakedAt,
    }));
  }

  async addHfAgentStake(stakerId: number, hedgeFundAgentId: string, amount: number): Promise<void> {
    // Check for existing stake and upsert
    const existing = await getDb()
      .select()
      .from(hfAgentStakes)
      .where(
        and(
          eq(hfAgentStakes.stakerId, stakerId),
          eq(hfAgentStakes.hedgeFundAgentId, hedgeFundAgentId)
        )
      )
      .limit(1);

    if (existing[0]) {
      await getDb()
        .update(hfAgentStakes)
        .set({ amount: existing[0].amount + amount })
        .where(eq(hfAgentStakes.id, existing[0].id));
    } else {
      await getDb().insert(hfAgentStakes).values({
        stakerId,
        hedgeFundAgentId,
        amount,
        stakedAt: new Date().toISOString(),
      });
    }
  }

  // ===================== LIVE SIGNAL INGESTION =====================

  async getSignalSource(): Promise<{ source: string; lastFetch: string | null; liveSignalCount: number }> {
    return {
      source: this._signalSource,
      lastFetch: this._lastLiveFetch,
      liveSignalCount: 0, // In DB mode we don't track "live" separately
    };
  }

  async ingestLiveSignals(signals: AgentSignal[]): Promise<void> {
    for (const signal of signals) {
      // Check for duplicate by agentId + ticker + createdAt
      const existing = await getDb()
        .select({ id: agentSignals.id })
        .from(agentSignals)
        .where(
          and(
            eq(agentSignals.hedgeFundAgentId, signal.hedgeFundAgentId),
            eq(agentSignals.ticker, signal.ticker),
            eq(agentSignals.createdAt, signal.createdAt)
          )
        )
        .limit(1);

      if (!existing[0]) {
        const { id: _id, ...insertData } = signal as any;
        await getDb().insert(agentSignals).values(insertData);
      }
    }

    // Recalculate stats for affected agents
    const affectedAgents = Array.from(new Set(signals.map(s => s.hedgeFundAgentId)));
    for (const agentId of affectedAgents) {
      await this.recalcAgentStats(agentId);
    }

    this._signalSource = "live";
    this._lastLiveFetch = new Date().toISOString();
  }

  // ===================== EXTERNAL AGENTS =====================

  async registerExternalAgent(agent: InsertExternalAgent): Promise<ExternalAgent> {
    const result = await getDb().insert(externalAgents).values(agent).returning();
    return result[0];
  }

  async getExternalAgent(agentId: string): Promise<ExternalAgent | undefined> {
    const result = await getDb()
      .select()
      .from(externalAgents)
      .where(eq(externalAgents.agentId, agentId))
      .limit(1);
    return result[0];
  }

  async getExternalAgentByUserId(userId: number): Promise<ExternalAgent | undefined> {
    // Primary: match by ownerUserId (logged-in user who registered) or NPC userId
    const result = await getDb()
      .select()
      .from(externalAgents)
      .where(or(eq(externalAgents.userId, userId), eq(externalAgents.ownerUserId, userId)))
      .limit(1);
    if (result[0]) return result[0];

    // Fallback: match by username → agent name (catches agents registered without a session)
    const userRows = await getDb().select().from(users).where(eq(users.id, userId)).limit(1);
    const user = userRows[0];
    if (user) {
      const byName = await getDb()
        .select()
        .from(externalAgents)
        .where(sql`lower(${externalAgents.name}) = lower(${user.username})`)
        .limit(1);
      if (byName[0]) {
        // Auto-link: set ownerUserId so future lookups are instant
        await getDb()
          .update(externalAgents)
          .set({ ownerUserId: userId })
          .where(eq(externalAgents.id, byName[0].id));
        return { ...byName[0], ownerUserId: userId };
      }
    }

    return undefined;
  }

  async getExternalAgentByApiKey(apiKeyHash: string): Promise<ExternalAgent | undefined> {
    const result = await getDb()
      .select()
      .from(externalAgents)
      .where(eq(externalAgents.apiKey, apiKeyHash))
      .limit(1);
    return result[0];
  }

  async getAllExternalAgents(): Promise<ExternalAgent[]> {
    return getDb()
      .select()
      .from(externalAgents)
      .orderBy(desc(externalAgents.reputation));
  }

  async updateExternalAgent(agentId: string, data: Partial<ExternalAgent>): Promise<ExternalAgent | undefined> {
    const result = await getDb()
      .update(externalAgents)
      .set({ ...data, lastActiveAt: new Date().toISOString() })
      .where(eq(externalAgents.agentId, agentId))
      .returning();
    return result[0];
  }

  // ===================== FORUM =====================

  async createForumPost(post: InsertForumPost): Promise<ForumPost> {
    const result = await getDb().insert(forumPosts).values(post).returning();
    return result[0];
  }

  async getForumPosts(category?: string, limit: number = 50): Promise<ForumPost[]> {
    if (category) {
      return getDb()
        .select()
        .from(forumPosts)
        .where(eq(forumPosts.category, category))
        .orderBy(desc(forumPosts.createdAt))
        .limit(limit);
    }
    return getDb()
      .select()
      .from(forumPosts)
      .orderBy(desc(forumPosts.createdAt))
      .limit(limit);
  }

  async getForumPost(id: number): Promise<ForumPost | undefined> {
    const result = await getDb()
      .select()
      .from(forumPosts)
      .where(eq(forumPosts.id, id))
      .limit(1);
    return result[0];
  }

  async getForumReplies(postId: number): Promise<ForumReply[]> {
    return getDb()
      .select()
      .from(forumReplies)
      .where(eq(forumReplies.postId, postId))
      .orderBy(forumReplies.createdAt);
  }

  async createForumReply(reply: InsertForumReply): Promise<ForumReply> {
    const result = await getDb().insert(forumReplies).values(reply).returning();
    // Increment reply count on the post
    await getDb()
      .update(forumPosts)
      .set({ replyCount: sql`${forumPosts.replyCount} + 1` })
      .where(eq(forumPosts.id, reply.postId));
    return result[0];
  }

  async likeForumPost(postId: number): Promise<void> {
    await getDb()
      .update(forumPosts)
      .set({ likes: sql`${forumPosts.likes} + 1` })
      .where(eq(forumPosts.id, postId));
  }

  async likeForumReply(replyId: number): Promise<void> {
    await getDb()
      .update(forumReplies)
      .set({ likes: sql`${forumReplies.likes} + 1` })
      .where(eq(forumReplies.id, replyId));
  }

  // ===================== SIGNAL EXPLANATIONS =====================

  async getSignalExplanation(signalId: number): Promise<SignalExplanation | undefined> {
    const result = await getDb()
      .select()
      .from(signalExplanations)
      .where(eq(signalExplanations.signalId, signalId))
      .limit(1);
    return result[0];
  }

  async getSignalExplanationsByAgent(agentId: string, limit = 50): Promise<SignalExplanation[]> {
    return getDb()
      .select()
      .from(signalExplanations)
      .where(eq(signalExplanations.hedgeFundAgentId, agentId))
      .orderBy(desc(signalExplanations.createdAt))
      .limit(limit);
  }

  async getAllSignalExplanations(limit = 100): Promise<SignalExplanation[]> {
    return getDb()
      .select()
      .from(signalExplanations)
      .orderBy(desc(signalExplanations.createdAt))
      .limit(limit);
  }

  async createSignalExplanation(explanation: InsertSignalExplanation): Promise<SignalExplanation> {
    const result = await getDb().insert(signalExplanations).values(explanation).returning();
    return result[0];
  }

  // ===================== COMMITTEES =====================

  async createCommittee(committee: InsertCommittee): Promise<Committee> {
    const result = await getDb().insert(committees).values(committee).returning();
    return result[0];
  }

  async getCommittee(id: number): Promise<Committee | undefined> {
    const result = await getDb()
      .select()
      .from(committees)
      .where(eq(committees.id, id))
      .limit(1);
    return result[0];
  }

  async getCommitteesByUser(userId: number): Promise<Committee[]> {
    return getDb()
      .select()
      .from(committees)
      .where(eq(committees.userId, userId));
  }

  async updateCommittee(id: number, data: Partial<Committee>): Promise<Committee | undefined> {
    const result = await getDb()
      .update(committees)
      .set(data)
      .where(eq(committees.id, id))
      .returning();
    return result[0];
  }

  async deleteCommittee(id: number): Promise<boolean> {
    // Delete members and signals first
    await getDb().delete(committeeMembers).where(eq(committeeMembers.committeeId, id));
    await getDb().delete(committeeSignals).where(eq(committeeSignals.committeeId, id));
    const result = await getDb().delete(committees).where(eq(committees.id, id)).returning();
    return result.length > 0;
  }

  async addCommitteeMember(member: InsertCommitteeMember): Promise<CommitteeMember> {
    const result = await getDb().insert(committeeMembers).values(member).returning();
    return result[0];
  }

  async getCommitteeMembers(committeeId: number): Promise<CommitteeMember[]> {
    return getDb()
      .select()
      .from(committeeMembers)
      .where(eq(committeeMembers.committeeId, committeeId));
  }

  async removeCommitteeMember(committeeId: number, agentId: string): Promise<boolean> {
    const result = await getDb()
      .delete(committeeMembers)
      .where(
        and(
          eq(committeeMembers.committeeId, committeeId),
          eq(committeeMembers.agentId, agentId)
        )
      )
      .returning();
    return result.length > 0;
  }

  async createCommitteeSignal(signal: InsertCommitteeSignal): Promise<CommitteeSignal> {
    const result = await getDb().insert(committeeSignals).values(signal).returning();
    // Update committee totalSignals count
    await getDb()
      .update(committees)
      .set({ totalSignals: sql`${committees.totalSignals} + 1` })
      .where(eq(committees.id, signal.committeeId));
    return result[0];
  }

  async getCommitteeSignals(committeeId: number, limit = 50): Promise<CommitteeSignal[]> {
    return getDb()
      .select()
      .from(committeeSignals)
      .where(eq(committeeSignals.committeeId, committeeId))
      .orderBy(desc(committeeSignals.createdAt))
      .limit(limit);
  }

  async getAllCommitteeSignals(limit = 100): Promise<CommitteeSignal[]> {
    return getDb()
      .select()
      .from(committeeSignals)
      .orderBy(desc(committeeSignals.createdAt))
      .limit(limit);
  }

  // ===================== DEBATES =====================

  async createDebate(debate: InsertCommitteeDebate): Promise<CommitteeDebate> {
    const result = await getDb().insert(committeeDebates).values(debate).returning();
    return result[0];
  }
  async getDebate(id: number): Promise<CommitteeDebate | undefined> {
    const result = await getDb().select().from(committeeDebates).where(eq(committeeDebates.id, id)).limit(1);
    return result[0];
  }
  async getDebatesByCommittee(committeeId: number, limit = 10): Promise<CommitteeDebate[]> {
    return getDb().select().from(committeeDebates)
      .where(eq(committeeDebates.committeeId, committeeId))
      .orderBy(desc(committeeDebates.createdAt))
      .limit(limit);
  }
  async updateDebate(id: number, data: Partial<CommitteeDebate>): Promise<CommitteeDebate | undefined> {
    const result = await getDb().update(committeeDebates).set(data).where(eq(committeeDebates.id, id)).returning();
    return result[0];
  }
  async createDebateMessage(msg: InsertCommitteeDebateMessage): Promise<CommitteeDebateMessage> {
    const result = await getDb().insert(committeeDebateMessages).values(msg).returning();
    return result[0];
  }
  async getDebateMessages(debateId: number): Promise<CommitteeDebateMessage[]> {
    return getDb().select().from(committeeDebateMessages)
      .where(eq(committeeDebateMessages.debateId, debateId))
      .orderBy(committeeDebateMessages.messageOrder);
  }

  // ===================== INTERNAL HELPERS =====================

  private async recalcAgentStats(agentId: string): Promise<void> {
    const statsRows = await getDb()
      .select({
        totalSignals: sql<number>`count(*)`,
        avgConfidence: sql<number>`coalesce(avg(${agentSignals.confidence}), 0)`,
        wins: sql<number>`count(*) filter (where ${agentSignals.isCorrect} = true)`,
        resolved: sql<number>`count(*) filter (where ${agentSignals.isCorrect} is not null)`,
      })
      .from(agentSignals)
      .where(eq(agentSignals.hedgeFundAgentId, agentId));

    const stats = statsRows[0];
    if (!stats) return;

    const totalSignals = Number(stats.totalSignals);
    const avgConfidence = Math.round(Number(stats.avgConfidence));
    const wins = Number(stats.wins);
    const resolved = Number(stats.resolved);
    const winRate = resolved > 0 ? Math.round((wins / resolved) * 100) : 0;

    await getDb()
      .update(hedgeFundAgents)
      .set({ totalSignals, avgConfidence, winRate })
      .where(eq(hedgeFundAgents.agentId, agentId));
  }
}
