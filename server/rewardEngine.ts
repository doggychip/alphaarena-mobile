/**
 * Staking Reward Engine
 * 
 * Calculates and distributes rewards to stakers based on their staked agents' performance.
 * 
 * Reward types:
 * - daily_performance: proportional to (your stake / total staked) × agent's composite score gain
 * - league_promotion: one-time bonus when staked agent moves up a league tier
 * 
 * Formula:
 *   reward = BASE_RATE × stakeAmount × agentPerformanceMultiplier
 *   where agentPerformanceMultiplier = max(0, compositeScore / avgCompositeScore)
 */

import type { IStorage } from "./storage";

// Configuration
const REWARD_INTERVAL_MS = 60 * 60 * 1000; // 1 hour (demo speed; production would be 24h)
const BASE_DAILY_RATE = 0.005; // 0.5% base daily yield on staked credits
const PERFORMANCE_BONUS_MULTIPLIER = 2.0; // top agents earn up to 2x base rate
const LEAGUE_PROMOTION_BONUS = 50; // flat bonus credits for league promotion
const MIN_REWARD = 1; // minimum 1 credit reward to avoid dust

// League thresholds
const LEAGUES = [
  { id: "diamond", maxRank: 10 },
  { id: "gold", maxRank: 50 },
  { id: "silver", maxRank: 100 },
  { id: "bronze", maxRank: 9999 },
];

function getLeagueId(rank: number): string {
  for (const league of LEAGUES) {
    if (rank <= league.maxRank) return league.id;
  }
  return "bronze";
}

// Track previous ranks for league promotion detection
const previousRanks = new Map<number, number>();
let lastRewardRun: string | null = null;
let rewardRunCount = 0;

export function getRewardEngineStatus() {
  return { lastRewardRun, rewardRunCount };
}

export async function calculateAndDistributeRewards(storage: IStorage): Promise<{
  totalRewards: number;
  rewardCount: number;
  promotionBonuses: number;
}> {
  const now = new Date().toISOString();
  let totalRewards = 0;
  let rewardCount = 0;
  let promotionBonuses = 0;

  try {
    // Get all active stakes grouped by target
    const stakingLeaderboard = await storage.getStakingLeaderboard();
    if (stakingLeaderboard.length === 0) return { totalRewards, rewardCount, promotionBonuses };

    // Get leaderboard for performance data
    const competition = await storage.getActiveCompetition();
    if (!competition) return { totalRewards, rewardCount, promotionBonuses };

    const leaderboard = await storage.getLeaderboard(competition.id);
    if (leaderboard.length === 0) return { totalRewards, rewardCount, promotionBonuses };

    // Compute average composite score for normalization
    const avgScore = leaderboard.reduce((sum, e) => sum + e.compositeScore, 0) / leaderboard.length;

    // Build lookup: userId -> leaderboard entry
    const entryMap = new Map<number, typeof leaderboard[0]>();
    for (const entry of leaderboard) {
      entryMap.set(entry.userId, entry);
    }

    // Process each staked agent
    for (const stakedAgent of stakingLeaderboard) {
      const targetEntry = entryMap.get(stakedAgent.targetUserId);
      if (!targetEntry) continue;

      // Performance multiplier: agents above average get bonus, below average get reduced
      const performanceRatio = avgScore > 0 ? targetEntry.compositeScore / avgScore : 1;
      const performanceMultiplier = Math.max(0.1, Math.min(PERFORMANCE_BONUS_MULTIPLIER, performanceRatio));

      // Check for league promotion
      const currentRank = targetEntry.rank;
      const prevRank = previousRanks.get(stakedAgent.targetUserId);
      const currentLeague = getLeagueId(currentRank);
      const prevLeague = prevRank ? getLeagueId(prevRank) : currentLeague;
      const promoted = prevRank !== undefined && LEAGUES.findIndex(l => l.id === currentLeague) < LEAGUES.findIndex(l => l.id === prevLeague);

      // Update rank tracking
      previousRanks.set(stakedAgent.targetUserId, currentRank);

      // Get all stakers for this target to distribute proportionally
      const stakesOnTarget = await storage.getStakesByTarget(stakedAgent.targetUserId);
      const totalStakedOnAgent = stakesOnTarget.reduce((sum, s) => sum + s.amount, 0);

      for (const stake of stakesOnTarget) {
        // Daily performance reward
        const stakeShare = totalStakedOnAgent > 0 ? stake.amount / totalStakedOnAgent : 0;
        const rawReward = stake.amount * BASE_DAILY_RATE * performanceMultiplier;
        const performanceReward = Math.max(MIN_REWARD, Math.round(rawReward));

        if (performanceReward > 0) {
          await storage.addReward({
            stakerId: stake.stakerId,
            targetUserId: stake.targetUserId,
            amount: performanceReward,
            reason: "daily_performance",
            earnedAt: now,
          });

          // Credit the staker
          const staker = await storage.getUser(stake.stakerId);
          if (staker) {
            await storage.updateUser(stake.stakerId, {
              credits: staker.credits + performanceReward,
              xp: (staker.xp || 0) + 5,
            });
          }

          totalRewards += performanceReward;
          rewardCount++;
        }

        // League promotion bonus
        if (promoted) {
          const promoReward = Math.round(LEAGUE_PROMOTION_BONUS * stakeShare);
          if (promoReward > 0) {
            await storage.addReward({
              stakerId: stake.stakerId,
              targetUserId: stake.targetUserId,
              amount: promoReward,
              reason: "league_promotion",
              earnedAt: now,
            });

            const staker = await storage.getUser(stake.stakerId);
            if (staker) {
              await storage.updateUser(stake.stakerId, {
                credits: staker.credits + promoReward,
                xp: (staker.xp || 0) + 15,
              });
            }

            promotionBonuses += promoReward;
            rewardCount++;
          }
        }
      }
    }

    lastRewardRun = now;
    rewardRunCount++;
    console.log(`[RewardEngine] Run #${rewardRunCount}: distributed ${rewardCount} rewards totaling ${totalRewards} credits (${promotionBonuses} from promotions)`);

  } catch (err: any) {
    console.error(`[RewardEngine] Error: ${err.message}`);
  }

  return { totalRewards, rewardCount, promotionBonuses };
}

let rewardInterval: NodeJS.Timeout | null = null;

export function startRewardEngine(storage: IStorage): void {
  console.log(`[RewardEngine] Starting — reward cycle every ${REWARD_INTERVAL_MS / 1000}s`);

  // Initialize rank tracking from current leaderboard
  (async () => {
    try {
      const competition = await storage.getActiveCompetition();
      if (competition) {
        const leaderboard = await storage.getLeaderboard(competition.id);
        for (const entry of leaderboard) {
          previousRanks.set(entry.userId, entry.rank);
        }
        console.log(`[RewardEngine] Initialized rank tracking for ${previousRanks.size} agents`);
      }
    } catch (err: any) {
      console.error(`[RewardEngine] Init error: ${err.message}`);
    }

    // First reward cycle after 30 seconds (let other services start)
    setTimeout(async () => {
      await calculateAndDistributeRewards(storage);

      // Then run periodically
      rewardInterval = setInterval(() => {
        calculateAndDistributeRewards(storage);
      }, REWARD_INTERVAL_MS);
    }, 30_000);
  })();
}

export function stopRewardEngine(): void {
  if (rewardInterval) {
    clearInterval(rewardInterval);
    rewardInterval = null;
    console.log("[RewardEngine] Stopped");
  }
}
