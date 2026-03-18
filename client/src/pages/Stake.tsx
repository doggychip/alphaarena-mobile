import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import StakeModal from "@/components/StakeModal";

export default function Stake() {
  const { toast } = useToast();
  const [stakeTarget, setStakeTarget] = useState<any>(null);

  const { data: meData } = useQuery<any>({ queryKey: ["/api/me"], refetchInterval: 15000 });
  const { data: myStakes } = useQuery<any>({ queryKey: ["/api/staking/my-stakes"] });
  const { data: stakingLeaderboard } = useQuery<any>({ queryKey: ["/api/staking/leaderboard"] });
  const { data: rewards } = useQuery<any>({ queryKey: ["/api/staking/rewards"] });
  const { data: stats } = useQuery<any>({ queryKey: ["/api/staking/stats"] });

  const user = meData?.user;
  const stakes = myStakes || [];
  const hotAgents = stakingLeaderboard || [];
  const rewardHistory = rewards || [];

  const totalStaked = stakes.reduce((sum: number, s: any) => sum + s.amount, 0);
  const totalEarned = rewardHistory.reduce((sum: number, r: any) => sum + r.amount, 0);

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
            <p className="font-mono-num text-xl font-bold text-neon-gold">~{stats?.avgApy || 12.4}%</p>
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
                  className={`flex-shrink-0 w-[160px] rounded-2xl p-3 border transition-all ${
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
                    onClick={() => unstakeMutation.mutate(s.targetUserId)}
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
                className={`rounded-2xl bg-[#1A1A2E] border p-3 flex items-center gap-3 ${
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
                    onClick={() => setStakeTarget(entry)}
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
            {rewardHistory.slice(0, 8).map((r: any, i: number) => {
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
