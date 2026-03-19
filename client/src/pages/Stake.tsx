import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import StakeModal from "@/components/StakeModal";

function CalcDetail({ label, value, color, mono = true }: { label: string; value: string; color?: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[10px] text-[#888899]">{label}</span>
      <span className={`text-[10px] font-bold ${mono ? "font-mono-num" : "font-display"}`} style={color ? { color } : { color: "#E8E8E8" }}>
        {value}
      </span>
    </div>
  );
}

const MEME_AGENT_TYPES = new Set(["bull", "bear", "algo", "moon", "zen", "degen"]);

export default function Stake() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [stakeTarget, setStakeTarget] = useState<any>(null);
  const [showRewardInfo, setShowRewardInfo] = useState(false);

  function goToAgent(user: any) {
    if (!user) return;
    const agentType = user.selectedAgentType;
    if (agentType && !MEME_AGENT_TYPES.has(agentType)) {
      navigate(`/signals/${agentType}`);
    } else {
      navigate(`/agent?userId=${user.id}`);
    }
  }

  const { data: meData } = useQuery<any>({ queryKey: ["/api/me"], refetchInterval: 15000 });
  const { data: myStakes } = useQuery<any>({ queryKey: ["/api/staking/my-stakes"] });
  const { data: stakingLeaderboard } = useQuery<any>({ queryKey: ["/api/staking/leaderboard"] });
  const { data: rewards } = useQuery<any>({ queryKey: ["/api/staking/rewards"] });
  const { data: stats } = useQuery<any>({ queryKey: ["/api/staking/stats"] });
  const { data: rewardSummary } = useQuery<any>({ queryKey: ["/api/staking/reward-summary"] });

  const user = meData?.user;
  const stakes = myStakes || [];
  const hotAgents = stakingLeaderboard || [];
  const rewardHistory = rewards || [];

  const totalStaked = stakes.reduce((sum: number, s: any) => sum + s.amount, 0);
  const totalEarned = rewardSummary?.totalEarned ?? rewardHistory.reduce((sum: number, r: any) => sum + r.amount, 0);

  const unstakeMutation = useMutation({
    mutationFn: async (targetUserId: number) => {
      const res = await apiRequest("POST", "/api/staking/unstake", { targetUserId });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Unstaked!", description: `${data.creditsReturned} credits returned` });
      queryClient.invalidateQueries({ queryKey: ["/api/staking/my-stakes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/staking/leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/staking/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/staking/reward-summary"] });
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 py-3" style={{ background: "rgba(10, 10, 15, 0.9)", backdropFilter: "blur(12px)" }}>
        <h1 className="font-display font-bold text-lg text-[#E8E8E8]">🔥 Staking</h1>
      </header>

      {/* Staking Summary Card */}
      <div className="mx-4 mt-2 rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <p className="text-[10px] text-[#888899] font-display">Available Credits</p>
            <p className="font-mono-num text-2xl font-bold text-neon-gold">{(user?.credits || 0).toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-[#888899] font-display">Total Staked</p>
            <p className="font-mono-num text-2xl font-bold text-neon-cyan">{totalStaked.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-[#888899] font-display">Total Earned</p>
            <p className="font-mono-num text-xl font-bold text-neon-green">+{totalEarned.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-[#888899] font-display">Credit APY</p>
            <p className="font-mono-num text-xl font-bold text-neon-gold">~{stats?.avgApy || 0}%</p>
          </div>
        </div>
        {/* Mini bar showing staked vs available */}
        <div className="mt-3 flex gap-1 h-2 rounded-full overflow-hidden">
          <div
            className="bg-neon-cyan rounded-full"
            style={{ width: `${totalStaked + (user?.credits || 0) > 0 ? (totalStaked / (totalStaked + (user?.credits || 0))) * 100 : 0}%` }}
          />
          <div className="bg-neon-gold/40 rounded-full flex-1" />
        </div>
        <div className="mt-1 flex justify-between">
          <span className="text-[9px] text-neon-cyan font-mono-num">Staked</span>
          <span className="text-[9px] text-neon-gold font-mono-num">Available</span>
        </div>
      </div>

      {/* Reward Breakdown */}
      {rewardSummary && rewardSummary.totalEarned > 0 && (
        <div className="mx-4 mt-3 rounded-2xl bg-[#12121A] border border-[#2A2A3E] p-3">
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
                  {/* Agent header */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-lg">{ad.agentEmoji}</span>
                    <div className="flex-1 min-w-0">
                      <span className="font-display font-bold text-xs text-[#E8E8E8]">{ad.agentName}</span>
                      <span className="text-[9px] text-[#888899] ml-1.5">Rank #{ad.agentRank}</span>
                    </div>
                    <span className="font-mono-num text-xs font-bold text-neon-green">+{ad.totalEarned}</span>
                  </div>
                  {/* Calculation steps */}
                  <div className="border-t border-[#2A2A3E] pt-1.5 space-y-0.5">
                    <CalcDetail label="Your stake" value={`${ad.stakeAmount.toLocaleString()} credits`} />
                    <CalcDetail label="Base rate" value={`${(ad.baseRate * 100).toFixed(1)}% per cycle`} />
                    <CalcDetail label="Agent score" value={`${ad.compositeScore}`} color="#00D4FF" />
                    <CalcDetail label="Avg score (all agents)" value={`${ad.avgCompositeScore}`} />
                    <CalcDetail label="Performance multiplier" value={`${ad.performanceMultiplier}x`} color={ad.performanceMultiplier >= 1 ? "#00FF88" : "#FF3B9A"} />
                    <div className="border-t border-dashed border-[#2A2A3E] my-1" />
                    <div className="flex items-center justify-between py-0.5">
                      <span className="text-[10px] text-[#888899]">Formula</span>
                      <span className="text-[9px] font-mono-num text-[#888899]">
                        {ad.stakeAmount} × {(ad.baseRate * 100).toFixed(1)}% × {ad.performanceMultiplier}x
                      </span>
                    </div>
                    <CalcDetail label="Est. reward per cycle" value={`~${ad.estimatedHourlyReward} credits`} color="#00FF88" />
                    {ad.totalPromotionEarned > 0 && (
                      <CalcDetail label="League promotion bonus" value={`+${ad.totalPromotionEarned} credits`} color="#FFD700" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reward engine status */}
          {stats?.rewardEngine?.lastRewardRun && (
            <p className="text-[9px] text-[#555566] mt-2 font-mono-num">
              Last payout: {new Date(stats.rewardEngine.lastRewardRun).toLocaleString()} · Run #{stats.rewardEngine.rewardRunCount}
            </p>
          )}
        </div>
      )}

      {/* How Rewards Work */}
      <div className="mx-4 mt-3">
        <button
          onClick={() => setShowRewardInfo(!showRewardInfo)}
          className="w-full rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] px-4 py-2.5 flex items-center justify-between active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">ℹ️</span>
            <span className="font-display font-bold text-xs text-[#E8E8E8]">How Rewards Work</span>
          </div>
          <span className={`text-[#888899] text-xs transition-transform ${showRewardInfo ? "rotate-180" : ""}`}>▼</span>
        </button>
        {showRewardInfo && (
          <div className="mt-1 rounded-2xl bg-[#12121A] border border-[#2A2A3E] p-4 space-y-3">
            <p className="text-xs text-[#888899] leading-relaxed">
              Stake credits on agents you believe in. Earn <span className="text-neon-green font-display font-bold">real rewards</span> based on their performance:
            </p>
            <div className="space-y-2">
              <RewardInfoRow emoji="📈" label="Daily Performance" color="#00FF88" desc="Earn credits proportional to your stake × agent's score. Top agents earn up to 2x base rate." />
              <RewardInfoRow emoji="🏆" label="League Promotion" color="#FFD700" desc="One-time bonus when your staked agent moves up a league (e.g. Silver → Gold)." />
              <RewardInfoRow emoji="🎉" label="Season End" color="#00D4FF" desc="Final payout based on agent's end-of-season performance." />
            </div>
            <div className="rounded-xl bg-[#1A1A2E] border border-neon-green/20 p-3">
              <p className="text-[10px] text-[#888899] leading-relaxed">
                <span className="text-neon-green font-display font-bold">Pro tip:</span> Staking on high-performing agents earns more. An agent with a high composite score (good returns + low risk) generates up to <span className="text-neon-gold">2x</span> the base reward rate. Diversify across agents to reduce risk.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Your Active Stakes */}
      <div className="mx-4 mt-4">
        <p className="text-xs text-[#888899] font-display mb-2">🎯 Your Bets</p>
        {stakes.length === 0 ? (
          <div className="rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-6 text-center">
            <p className="text-sm text-[#888899]">No stakes yet. Back an agent below 👇</p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
            {stakes.map((s: any) => {
              const returnPct = s.leaderboardEntry?.totalReturn || 0;
              const profitable = returnPct >= 0;
              return (
                <div
                  key={s.targetUserId}
                  data-testid={`my-stake-${s.targetUserId}`}
                  onClick={() => goToAgent(s.targetUser)}
                  className={`flex-shrink-0 w-[160px] rounded-2xl p-3 border transition-all cursor-pointer active:scale-[0.97] ${
                    profitable ? "bg-[#1A1A2E] border-neon-gold/30" : "bg-[#1A1A2E] border-[#2A2A3E]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{s.agent?.avatarEmoji || "🤖"}</span>
                    <div className="min-w-0">
                      <p className="font-display font-bold text-xs text-[#E8E8E8] truncate">{s.targetUser?.username}</p>
                      <p className="text-[9px] text-[#888899] font-mono-num">Rank #{s.leaderboardEntry?.rank || "—"}</p>
                    </div>
                  </div>
                  <p className="font-mono-num text-base font-bold text-neon-gold">{s.amount.toLocaleString()} 💰</p>
                  <p className={`font-mono-num text-xs font-bold ${profitable ? "text-neon-green" : "text-neon-pink"}`}>
                    {profitable ? "+" : ""}{returnPct.toFixed(1)}%
                  </p>
                  <button
                    data-testid={`btn-unstake-${s.targetUserId}`}
                    onClick={(e) => { e.stopPropagation(); unstakeMutation.mutate(s.targetUserId); }}
                    disabled={unstakeMutation.isPending}
                    className="mt-2 w-full py-1.5 rounded-xl bg-neon-pink/10 border border-neon-pink/30 text-neon-pink font-display font-bold text-[10px] active:scale-95 transition-transform"
                  >
                    Unstake
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Hot Agents */}
      <div className="mx-4 mt-4">
        <p className="text-xs text-[#888899] font-display mb-2">🔥 Hot Agents — Most Staked</p>
        <div className="space-y-2">
          {hotAgents.map((entry: any, i: number) => {
            const returnPct = entry.leaderboardEntry?.totalReturn || 0;
            const isHeavilyStaked = entry.totalStaked >= 1000;
            return (
              <div
                key={entry.targetUserId}
                data-testid={`hot-agent-${entry.targetUserId}`}
                onClick={() => goToAgent(entry.user)}
                className={`rounded-2xl bg-[#1A1A2E] border p-3 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform ${
                  isHeavilyStaked ? "border-neon-gold/40" : "border-[#2A2A3E]"
                }`}
              >
                <span className="font-mono-num text-sm font-bold text-[#888899] w-5 text-center">{i + 1}</span>
                <div className="w-10 h-10 rounded-full bg-[#0A0A0F] flex items-center justify-center text-xl border border-[#2A2A3E]">
                  {entry.agent?.avatarEmoji || "🤖"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-display font-semibold text-sm text-[#E8E8E8] truncate">{entry.user?.username}</span>
                    {isHeavilyStaked && <span className="text-[10px]">🔥</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono-num text-[10px] text-neon-gold">{entry.totalStaked.toLocaleString()} staked</span>
                    <span className="text-[10px] text-[#888899]">· {entry.stakerCount || 0} backers</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`font-mono-num text-sm font-bold ${returnPct >= 0 ? "text-neon-green" : "text-neon-pink"}`}>
                    {returnPct >= 0 ? "+" : ""}{returnPct.toFixed(1)}%
                  </span>
                  <button
                    data-testid={`btn-stake-${entry.targetUserId}`}
                    onClick={(e) => { e.stopPropagation(); setStakeTarget(entry); }}
                    className="px-3 py-1.5 rounded-xl bg-neon-green/10 border border-neon-green/40 text-neon-green font-display font-bold text-[10px] active:scale-95 transition-transform min-h-[32px]"
                  >
                    Stake
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reward History */}
      <div className="mx-4 mt-4 mb-4">
        <p className="text-xs text-[#888899] font-display mb-2">💰 Reward History</p>
        {rewardHistory.length === 0 ? (
          <div className="rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-4 text-center">
            <p className="text-sm text-[#888899]">Start staking to earn rewards 🎯</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] divide-y divide-[#2A2A3E]">
            {rewardHistory.slice(0, 10).map((r: any, i: number) => {
              const reasonEmoji = r.reason === "daily_performance" ? "📈" : r.reason === "league_promotion" ? "🏆" : "🎉";
              const reasonLabel = r.reason === "daily_performance" ? "Daily Performance" : r.reason === "league_promotion" ? "League Promotion" : "Season Reward";
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-lg">{reasonEmoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#E8E8E8] font-display">{reasonLabel}</p>
                    <p className="text-[10px] text-[#888899]">{r.targetUser?.username || "Agent"} · {new Date(r.earnedAt).toLocaleDateString()}</p>
                  </div>
                  <span className="font-mono-num text-sm font-bold text-neon-green">+{r.amount}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer attribution */}
      <div className="px-4 pb-4 text-center">
        <a href="https://www.perplexity.ai/computer" target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#555566]">
          Created with Perplexity Computer
        </a>
      </div>

      {/* Stake Modal */}
      {stakeTarget && (
        <StakeModal
          agent={stakeTarget}
          availableCredits={user?.credits || 0}
          onClose={() => setStakeTarget(null)}
        />
      )}
    </div>
  );
}

function RewardPill({ emoji, label, amount, color }: { emoji: string; label: string; amount: number; color: string }) {
  return (
    <div className="flex-1 rounded-xl bg-[#1A1A2E] border border-[#2A2A3E] px-2 py-1.5 text-center">
      <span className="text-sm">{emoji}</span>
      <p className="font-mono-num text-xs font-bold mt-0.5" style={{ color }}>+{amount}</p>
      <p className="text-[8px] text-[#888899] font-display">{label}</p>
    </div>
  );
}

function RewardInfoRow({ emoji, label, color, desc }: { emoji: string; label: string; color: string; desc: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-sm mt-0.5">{emoji}</span>
      <div className="flex-1 min-w-0">
        <span className="font-display font-bold text-xs" style={{ color }}>{label}</span>
        <p className="text-[10px] text-[#888899] leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
