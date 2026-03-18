import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface StakeModalProps {
  agent: any;
  availableCredits: number;
  onClose: () => void;
}

const PRESETS = [100, 250, 500, 1000];

export default function StakeModal({ agent, availableCredits, onClose }: StakeModalProps) {
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const numAmount = parseInt(amount) || 0;
  const returnPct = agent.leaderboardEntry?.totalReturn || 0;
  const estimatedDaily = numAmount > 0 ? Math.round(numAmount * Math.abs(returnPct) * 0.01 * 0.1) : 0;

  const handleStake = async () => {
    if (numAmount <= 0 || numAmount > availableCredits) return;
    setIsSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/staking/stake", {
        targetUserId: agent.targetUserId,
        amount: numAmount,
      });
      const data = await res.json();
      toast({
        title: "🔥 Staked!",
        description: `${data.message} (+${data.xpBonus} XP)`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/staking/my-stakes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/staking/leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/staking/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      onClose();
    } catch (err: any) {
      toast({
        title: "Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const setPreset = (val: number) => {
    setAmount(Math.min(val, availableCredits).toString());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-[430px] rounded-t-3xl bg-[#12121A] border-t border-[#2A2A3E] p-4 pb-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="w-12 h-1 rounded-full bg-[#2A2A3E] mx-auto mb-4" />

        {/* Agent Info */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-full bg-[#0A0A0F] border-2 border-neon-gold/50 flex items-center justify-center text-2xl">
            {agent.agent?.avatarEmoji || "🤖"}
          </div>
          <div className="flex-1">
            <p className="font-display font-bold text-base text-[#E8E8E8]">{agent.user?.username}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-[#888899] font-mono-num">Rank #{agent.leaderboardEntry?.rank || "—"}</span>
              <span className={`font-mono-num text-xs font-bold ${returnPct >= 0 ? "text-neon-green" : "text-neon-pink"}`}>
                {returnPct >= 0 ? "+" : ""}{returnPct.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Staking Stats */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 rounded-xl bg-[#1A1A2E] border border-[#2A2A3E] p-2.5 text-center">
            <p className="text-[9px] text-[#888899] font-display">Total Staked</p>
            <p className="font-mono-num text-sm font-bold text-neon-gold">{(agent.totalStaked || 0).toLocaleString()}</p>
          </div>
          <div className="flex-1 rounded-xl bg-[#1A1A2E] border border-[#2A2A3E] p-2.5 text-center">
            <p className="text-[9px] text-[#888899] font-display">Backers</p>
            <p className="font-mono-num text-sm font-bold text-neon-cyan">{agent.stakerCount || 0}</p>
          </div>
        </div>

        {/* Amount Input */}
        <div className="relative mb-3">
          <input
            data-testid="input-stake-amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="w-full bg-[#1A1A2E] border border-[#2A2A3E] rounded-2xl px-4 py-4 text-center font-mono-num text-2xl text-[#E8E8E8] outline-none focus:border-neon-gold/50"
          />
        </div>

        {/* Available */}
        <p className="text-center text-[10px] text-[#888899] mb-2 font-mono-num">
          Available: <span className="text-neon-gold">{availableCredits.toLocaleString()}</span> credits
        </p>

        {/* Preset Buttons */}
        <div className="flex gap-2 mb-4">
          {PRESETS.map(preset => (
            <button
              key={preset}
              onClick={() => setPreset(preset)}
              className="flex-1 py-2 rounded-xl bg-[#1A1A2E] border border-[#2A2A3E] font-mono-num text-sm text-[#888899] active:scale-95 transition-transform min-h-[40px]"
            >
              {preset}
            </button>
          ))}
          <button
            onClick={() => setAmount(availableCredits.toString())}
            className="flex-1 py-2 rounded-xl bg-[#1A1A2E] border border-[#2A2A3E] font-display text-sm text-neon-gold active:scale-95 transition-transform min-h-[40px]"
          >
            MAX
          </button>
        </div>

        {/* Estimated Reward */}
        {numAmount > 0 && (
          <div className="bg-[#1E1E32] rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
            <span className="text-xs text-[#888899] font-display">Est. daily reward</span>
            <span className="font-mono-num text-sm font-bold text-neon-green">~{estimatedDaily} credits</span>
          </div>
        )}

        {/* Confirm */}
        <button
          data-testid="btn-confirm-stake"
          onClick={handleStake}
          disabled={numAmount <= 0 || numAmount > availableCredits || isSubmitting}
          className="w-full py-4 rounded-2xl bg-neon-green text-black font-display font-bold text-base glow-green active:scale-95 transition-all disabled:opacity-50"
        >
          {isSubmitting ? "Staking..." : `Stake ${numAmount > 0 ? numAmount.toLocaleString() : ""} Credits 🔥`}
        </button>

        {/* Disclaimer */}
        <p className="text-[9px] text-[#555566] text-center mt-2">
          Staking locks your credits. You can unstake anytime.
        </p>
      </div>
    </div>
  );
}
