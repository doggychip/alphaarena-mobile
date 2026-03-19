import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import StakeModal from "@/components/StakeModal";

// ─── Types ───
type StakeableAgent = {
  userId: number;
  username: string;
  agentName: string;
  agentEmoji: string;
  agentType: string;
  rank: number;
  totalReturn: number;
  compositeScore: number;
  sharpeRatio: number;
  winRate: number;
  totalStaked: number;
  stakerCount: number;
  myStakeAmount: number;
  estRewardPer100: number;
  estMyReward: number;
  perfMultiplier: number;
  league: string;
};

const LEAGUE_CONFIG: Record<string, { label: string; emoji: string; color: string; border: string }> = {
  diamond: { label: "Diamond", emoji: "💎", color: "#00D4FF", border: "border-[#00D4FF]/40" },
  gold: { label: "Gold", emoji: "🥇", color: "#FFD700", border: "border-[#FFD700]/40" },
  silver: { label: "Silver", emoji: "🥈", color: "#C0C0C0", border: "border-[#C0C0C0]/30" },
  bronze: { label: "Bronze", emoji: "🥉", color: "#CD7F32", border: "border-[#CD7F32]/30" },
};

const MEME_AGENT_TYPES = new Set(["bull", "bear", "algo", "moon", "zen", "degen"]);

export default function Stake() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [stakeTarget, setStakeTarget] = useState<any>(null);
  const [showFormula, setShowFormula] = useState(false);
  const [filter, setFilter] = useState<"all" | "my-stakes" | "top">("all");

  function goToAgent(agent: StakeableAgent) {
    if (agent.agentType && !MEME_AGENT_TYPES.has(agent.agentType)) {
      navigate(`/signals/${agent.agentType}`);
    } else {
      navigate(`/agent?userId=${agent.userId}`);
    }
  }

  // ─── Data Fetching ───
  const { data: meData } = useQuery<any>({ queryKey: ["/api/me"], refetchInterval: 15000 });
  const { data: allAgents = [], isLoading: loadingAgents } = useQuery<StakeableAgent[]>({
    queryKey: ["/api/staking/all-agents"],
    refetchInterval: 30000,
  });
  const { data: rewards } = useQuery<any>({ queryKey: ["/api/staking/rewards"] });
  const { data: stats } = useQuery<any>({ queryKey: ["/api/staking/stats"] });
  const { data: rewardSummary } = useQuery<any>({ queryKey: ["/api/staking/reward-summary"] });

  const user = meData?.user;
  const rewardHistory = rewards || [];

  // Derived data
  const myStakes = allAgents.filter((a) => a.myStakeAmount > 0);
  const totalStaked = myStakes.reduce((sum, s) => sum + s.myStakeAmount, 0);
  const totalEstReward = myStakes.reduce((sum, s) => sum + s.estMyReward, 0);
  const totalEarned = rewardSummary?.totalEarned ?? rewardHistory.reduce((sum: number, r: any) => sum + r.amount, 0);

  // Filter logic
  const filteredAgents =
    filter === "my-stakes"
      ? myStakes
      : filter === "top"
        ? [...allAgents].sort((a, b) => b.perfMultiplier - a.perfMultiplier).slice(0, 10)
        : allAgents;

  // Reward engine countdown
  const rewardEngine = stats?.rewardEngine;
  const lastRun = rewardEngine?.lastRewardRun ? new Date(rewardEngine.lastRewardRun) : null;
  const nextRunMs = lastRun ? lastRun.getTime() + 3600000 - Date.now() : null;
  const nextRunMins = nextRunMs && nextRunMs > 0 ? Math.ceil(nextRunMs / 60000) : null;

  const unstakeMutation = useMutation({
    mutationFn: async (targetUserId: number) => {
      const res = await apiRequest("POST", "/api/staking/unstake", { targetUserId });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Unstaked!", description: `${data.creditsReturned} credits returned` });
      invalidateAll();
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ["/api/staking/all-agents"] });
    queryClient.invalidateQueries({ queryKey: ["/api/staking/rewards"] });
    queryClient.invalidateQueries({ queryKey: ["/api/staking/stats"] });
    queryClient.invalidateQueries({ queryKey: ["/api/staking/reward-summary"] });
    queryClient.invalidateQueries({ queryKey: ["/api/me"] });
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header
        className="sticky top-0 z-40 px-4 py-3"
        style={{ background: "rgba(10, 10, 15, 0.9)", backdropFilter: "blur(12px)" }}
      >
        <h1 className="font-display font-bold text-lg text-[#E8E8E8]">🔥 Staking</h1>
      </header>

      {/* ────── Portfolio Summary ────── */}
      <div className="mx-4 mt-2 rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <p className="text-[10px] text-[#888899] font-display">Available Credits</p>
            <p className="font-mono-num text-2xl font-bold text-neon-gold">
              {(user?.credits || 0).toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-[#888899] font-display">Total Staked</p>
            <p className="font-mono-num text-2xl font-bold text-neon-cyan">
              {totalStaked.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Staked vs Available bar */}
        {(totalStaked > 0 || (user?.credits || 0) > 0) && (
          <>
            <div className="mt-3 flex gap-1 h-2 rounded-full overflow-hidden">
              <div
                className="bg-neon-cyan rounded-full transition-all"
                style={{
                  width: `${totalStaked + (user?.credits || 0) > 0 ? (totalStaked / (totalStaked + (user?.credits || 0))) * 100 : 0}%`,
                }}
              />
              <div className="bg-neon-gold/40 rounded-full flex-1" />
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-[9px] text-neon-cyan font-mono-num">Staked</span>
              <span className="text-[9px] text-neon-gold font-mono-num">Available</span>
            </div>
          </>
        )}

        {/* Earnings row */}
        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[#2A2A3E] pt-3">
          <div className="text-center">
            <p className="text-[9px] text-[#888899] font-display">Total Earned</p>
            <p className="font-mono-num text-sm font-bold text-neon-green">+{totalEarned.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] text-[#888899] font-display">Est. / Cycle</p>
            <p className="font-mono-num text-sm font-bold text-[#E8E8E8]">
              ~{totalEstReward > 0 ? totalEstReward.toLocaleString() : "0"}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[9px] text-[#888899] font-display">Next Payout</p>
            <p className="font-mono-num text-sm font-bold text-neon-gold">
              {nextRunMins ? `${nextRunMins}m` : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* ────── My Active Stakes ────── */}
      {myStakes.length > 0 && (
        <div className="mx-4 mt-3">
          <p className="text-xs text-[#888899] font-display mb-2">
            🎯 Your Stakes ({myStakes.length})
          </p>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
            {myStakes.map((s) => {
              const returnPct = s.totalReturn;
              const profitable = returnPct >= 0;
              const league = LEAGUE_CONFIG[s.league] || LEAGUE_CONFIG.bronze;
              return (
                <div
                  key={s.userId}
                  data-testid={`my-stake-${s.userId}`}
                  onClick={() => goToAgent(s)}
                  className={`flex-shrink-0 w-[170px] rounded-2xl p-3 border transition-all cursor-pointer active:scale-[0.97] bg-[#1A1A2E] ${league.border}`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xl">{s.agentEmoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-display font-bold text-xs text-[#E8E8E8] truncate">{s.agentName}</p>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px]">{league.emoji}</span>
                        <span className="text-[9px] font-mono-num" style={{ color: league.color }}>
                          #{s.rank}
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Stake amount */}
                  <p className="font-mono-num text-base font-bold text-neon-cyan">
                    {s.myStakeAmount.toLocaleString()} 💰
                  </p>
                  {/* Performance + est. reward */}
                  <div className="flex items-center justify-between mt-1">
                    <span
                      className={`font-mono-num text-xs font-bold ${profitable ? "text-neon-green" : "text-neon-pink"}`}
                    >
                      {profitable ? "+" : ""}
                      {returnPct.toFixed(1)}%
                    </span>
                    <span className="text-[9px] text-neon-green font-mono-num">
                      ~{s.estMyReward}/cycle
                    </span>
                  </div>
                  {/* Unstake */}
                  <button
                    data-testid={`btn-unstake-${s.userId}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      unstakeMutation.mutate(s.userId);
                    }}
                    disabled={unstakeMutation.isPending}
                    className="mt-2 w-full py-1.5 rounded-xl bg-neon-pink/10 border border-neon-pink/30 text-neon-pink font-display font-bold text-[10px] active:scale-95 transition-transform"
                  >
                    Unstake
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ────── Reward Formula Card ────── */}
      <div className="mx-4 mt-3">
        <button
          onClick={() => setShowFormula(!showFormula)}
          className="w-full rounded-2xl bg-gradient-to-r from-[#00FF88]/5 to-[#FFD700]/5 border border-[#00FF88]/20 px-4 py-2.5 flex items-center justify-between active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">📐</span>
            <span className="font-display font-bold text-xs text-[#E8E8E8]">How Rewards Are Calculated</span>
          </div>
          <span className={`text-[#888899] text-xs transition-transform ${showFormula ? "rotate-180" : ""}`}>▼</span>
        </button>
        {showFormula && (
          <div className="mt-1 rounded-2xl bg-[#12121A] border border-[#2A2A3E] p-4 space-y-3">
            {/* Formula */}
            <div className="rounded-xl bg-[#0A0A0F] border border-[#00FF88]/20 p-3">
              <p className="text-[10px] text-[#888899] font-display mb-1">Reward formula (per cycle)</p>
              <p className="font-mono-num text-xs text-[#00FF88] leading-relaxed">
                reward = stake × 0.5% × perfMultiplier
              </p>
              <p className="text-[9px] text-[#888899] mt-1">
                perfMultiplier = agent score ÷ avg score (capped 0.1x – 2.0x)
              </p>
            </div>

            {/* Reward types */}
            <div className="space-y-2">
              <RewardInfoRow
                emoji="📈"
                label="Performance Yield"
                color="#00FF88"
                desc="Every reward cycle (~1hr), stakers earn credits based on their stake size multiplied by their agent's performance. Top-ranked agents generate up to 2x the base rate."
              />
              <RewardInfoRow
                emoji="🏆"
                label="League Promotion Bonus"
                color="#FFD700"
                desc="One-time 50-credit bonus pool split among stakers when an agent's rank crosses into a higher league (Bronze→Silver→Gold→Diamond)."
              />
              <RewardInfoRow
                emoji="🎉"
                label="Season End Payout"
                color="#00D4FF"
                desc="End-of-season bonus distributed to stakers based on final agent standings."
              />
            </div>

            {/* Example calc */}
            <div className="rounded-xl bg-[#1A1A2E] border border-[#2A2A3E] p-3">
              <p className="text-[10px] font-display font-bold text-[#E8E8E8] mb-1.5">Example</p>
              <div className="space-y-0.5">
                <CalcRow label="You stake" value="500 credits" />
                <CalcRow label="Base rate" value="0.5% per cycle" />
                <CalcRow label="Agent score / avg" value="1.4x (top performer)" color="#00FF88" />
                <div className="border-t border-dashed border-[#2A2A3E] my-1.5" />
                <CalcRow label="Reward per cycle" value="500 × 0.5% × 1.4 = ~4 credits" color="#00FF88" />
                <CalcRow label="Per day (24 cycles)" value="~96 credits" color="#FFD700" />
              </div>
            </div>

            {/* Engine status */}
            {rewardEngine?.lastRewardRun && (
              <p className="text-[9px] text-[#555566] font-mono-num">
                Last payout: {new Date(rewardEngine.lastRewardRun).toLocaleString()} · Run #{rewardEngine.rewardRunCount}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ────── Agent Filter Tabs ────── */}
      <div className="mx-4 mt-4 flex rounded-xl bg-[#1A1A2E] border border-[#2A2A3E] p-1">
        {[
          { key: "all" as const, label: "All Agents" },
          { key: "my-stakes" as const, label: `My Stakes (${myStakes.length})` },
          { key: "top" as const, label: "Top Yield" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex-1 py-2 rounded-lg font-display font-bold text-[10px] transition-all ${
              filter === tab.key
                ? "bg-neon-green/15 text-neon-green border border-neon-green/30"
                : "text-[#888899]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ────── Agent List ────── */}
      <div className="mx-4 mt-3 space-y-2">
        {loadingAgents ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] animate-pulse" />
          ))
        ) : filteredAgents.length === 0 ? (
          <div className="rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-6 text-center">
            <p className="text-sm text-[#888899]">
              {filter === "my-stakes" ? "No active stakes yet — pick an agent below" : "No agents available"}
            </p>
          </div>
        ) : (
          filteredAgents.map((agent) => {
            const league = LEAGUE_CONFIG[agent.league] || LEAGUE_CONFIG.bronze;
            const returnPct = agent.totalReturn;
            const profitable = returnPct >= 0;
            const hasStake = agent.myStakeAmount > 0;

            return (
              <div
                key={agent.userId}
                data-testid={`agent-row-${agent.userId}`}
                onClick={() => goToAgent(agent)}
                className={`rounded-2xl bg-[#1A1A2E] border p-3 cursor-pointer active:scale-[0.98] transition-transform ${
                  hasStake ? "border-neon-cyan/30" : "border-[#2A2A3E]"
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Rank + Avatar */}
                  <div className="flex flex-col items-center gap-0.5 w-8 flex-shrink-0">
                    <span className="font-mono-num text-[10px] font-bold" style={{ color: league.color }}>
                      #{agent.rank}
                    </span>
                    <span className="text-xl">{agent.agentEmoji}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-display font-semibold text-sm text-[#E8E8E8] truncate">
                        {agent.agentName}
                      </span>
                      <span className="text-[9px]">{league.emoji}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`font-mono-num text-xs font-bold ${profitable ? "text-neon-green" : "text-neon-pink"}`}
                      >
                        {profitable ? "+" : ""}
                        {returnPct.toFixed(1)}%
                      </span>
                      <span className="text-[9px] text-[#888899] font-mono-num">
                        {agent.perfMultiplier}x yield
                      </span>
                      {agent.totalStaked > 0 && (
                        <span className="text-[9px] text-neon-gold font-mono-num">
                          {agent.totalStaked.toLocaleString()} staked
                        </span>
                      )}
                    </div>
                    {/* My stake indicator */}
                    {hasStake && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] text-neon-cyan font-mono-num font-bold">
                          My stake: {agent.myStakeAmount.toLocaleString()}
                        </span>
                        <span className="text-[9px] text-neon-green font-mono-num">
                          → ~{agent.estMyReward}/cycle
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Stake button */}
                  <button
                    data-testid={`btn-stake-${agent.userId}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setStakeTarget({
                        targetUserId: agent.userId,
                        user: { id: agent.userId, username: agent.username },
                        agent: { avatarEmoji: agent.agentEmoji, name: agent.agentName },
                        leaderboardEntry: { rank: agent.rank, totalReturn: agent.totalReturn },
                        totalStaked: agent.totalStaked,
                        stakerCount: agent.stakerCount,
                      });
                    }}
                    className={`px-3 py-2 rounded-xl font-display font-bold text-[10px] active:scale-95 transition-transform min-h-[36px] flex-shrink-0 ${
                      hasStake
                        ? "bg-neon-cyan/10 border border-neon-cyan/40 text-neon-cyan"
                        : "bg-neon-green/10 border border-neon-green/40 text-neon-green"
                    }`}
                  >
                    {hasStake ? "Add More" : "Stake"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ────── Reward History ────── */}
      <div className="mx-4 mt-4 mb-4">
        <p className="text-xs text-[#888899] font-display mb-2">
          💰 Reward History {rewardHistory.length > 0 && `(${rewardHistory.length})`}
        </p>
        {rewardHistory.length === 0 ? (
          <div className="rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-4 text-center">
            <p className="text-sm text-[#888899]">
              {totalStaked > 0
                ? `Rewards accrue every cycle — next payout in ${nextRunMins || "~60"}m`
                : "Stake credits on an agent to start earning rewards"}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] divide-y divide-[#2A2A3E]">
            {rewardHistory.slice(0, 10).map((r: any, i: number) => {
              const reasonEmoji =
                r.reason === "daily_performance" ? "📈" : r.reason === "league_promotion" ? "🏆" : "🎉";
              const reasonLabel =
                r.reason === "daily_performance"
                  ? "Performance"
                  : r.reason === "league_promotion"
                    ? "League Promotion"
                    : "Season Reward";
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-lg">{reasonEmoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#E8E8E8] font-display">{reasonLabel}</p>
                    <p className="text-[10px] text-[#888899]">
                      {r.targetUser?.username || "Agent"} ·{" "}
                      {new Date(r.earnedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="font-mono-num text-sm font-bold text-neon-green">+{r.amount}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reward Breakdown (if earned) */}
      {rewardSummary && rewardSummary.totalEarned > 0 && (
        <div className="mx-4 mb-4 rounded-2xl bg-[#12121A] border border-[#2A2A3E] p-3">
          <p className="text-[10px] text-[#888899] font-display mb-2">Reward Breakdown</p>
          <div className="flex gap-2">
            <RewardPill emoji="📈" label="Performance" amount={rewardSummary.breakdown.performance} color="#00FF88" />
            <RewardPill emoji="🏆" label="Promotion" amount={rewardSummary.breakdown.promotion} color="#FFD700" />
            <RewardPill emoji="🎉" label="Season" amount={rewardSummary.breakdown.season} color="#00D4FF" />
          </div>

          {/* Per-agent calculation details */}
          {rewardSummary.agentDetails && rewardSummary.agentDetails.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-[10px] text-[#888899] font-display">Calculation per agent:</p>
              {rewardSummary.agentDetails.map((ad: any, i: number) => (
                <div key={i} className="rounded-xl bg-[#1A1A2E] border border-[#2A2A3E] p-2.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-lg">{ad.agentEmoji}</span>
                    <div className="flex-1 min-w-0">
                      <span className="font-display font-bold text-xs text-[#E8E8E8]">{ad.agentName}</span>
                      <span className="text-[9px] text-[#888899] ml-1.5">Rank #{ad.agentRank}</span>
                    </div>
                    <span className="font-mono-num text-xs font-bold text-neon-green">+{ad.totalEarned}</span>
                  </div>
                  <div className="border-t border-[#2A2A3E] pt-1.5 space-y-0.5">
                    <CalcRow label="Your stake" value={`${ad.stakeAmount.toLocaleString()} credits`} />
                    <CalcRow label="Base rate" value={`${(ad.baseRate * 100).toFixed(1)}% per cycle`} />
                    <CalcRow label="Agent score" value={`${ad.compositeScore}`} color="#00D4FF" />
                    <CalcRow label="Avg score (all agents)" value={`${ad.avgCompositeScore}`} />
                    <CalcRow
                      label="Performance multiplier"
                      value={`${ad.performanceMultiplier}x`}
                      color={ad.performanceMultiplier >= 1 ? "#00FF88" : "#FF3B9A"}
                    />
                    <div className="border-t border-dashed border-[#2A2A3E] my-1" />
                    <div className="flex items-center justify-between py-0.5">
                      <span className="text-[10px] text-[#888899]">Formula</span>
                      <span className="text-[9px] font-mono-num text-[#888899]">
                        {ad.stakeAmount} × {(ad.baseRate * 100).toFixed(1)}% × {ad.performanceMultiplier}x
                      </span>
                    </div>
                    <CalcRow label="Est. reward per cycle" value={`~${ad.estimatedHourlyReward} credits`} color="#00FF88" />
                    {ad.totalPromotionEarned > 0 && (
                      <CalcRow label="League promotion bonus" value={`+${ad.totalPromotionEarned} credits`} color="#FFD700" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="px-4 pb-4 text-center">
        <a
          href="https://www.perplexity.ai/computer"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-[#555566]"
        >
          Created with Perplexity Computer
        </a>
      </div>

      {/* Stake Modal */}
      {stakeTarget && (
        <StakeModal
          agent={stakeTarget}
          availableCredits={user?.credits || 0}
          onClose={() => {
            setStakeTarget(null);
            invalidateAll();
          }}
        />
      )}
    </div>
  );
}

// ─── Sub-Components ───

function CalcRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[10px] text-[#888899]">{label}</span>
      <span
        className="text-[10px] font-bold font-mono-num"
        style={color ? { color } : { color: "#E8E8E8" }}
      >
        {value}
      </span>
    </div>
  );
}

function RewardPill({
  emoji,
  label,
  amount,
  color,
}: {
  emoji: string;
  label: string;
  amount: number;
  color: string;
}) {
  return (
    <div className="flex-1 rounded-xl bg-[#1A1A2E] border border-[#2A2A3E] px-2 py-1.5 text-center">
      <span className="text-sm">{emoji}</span>
      <p className="font-mono-num text-xs font-bold mt-0.5" style={{ color }}>
        +{amount}
      </p>
      <p className="text-[8px] text-[#888899] font-display">{label}</p>
    </div>
  );
}

function RewardInfoRow({
  emoji,
  label,
  color,
  desc,
}: {
  emoji: string;
  label: string;
  color: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-sm mt-0.5">{emoji}</span>
      <div className="flex-1 min-w-0">
        <span className="font-display font-bold text-xs" style={{ color }}>
          {label}
        </span>
        <p className="text-[10px] text-[#888899] leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
