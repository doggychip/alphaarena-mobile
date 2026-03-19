import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TradeModalProps {
  mode: "buy" | "sell";
  onClose: () => void;
  prices: any[];
  agentName?: string;
  agentEmoji?: string;
  initialPair?: string;
  initialAmount?: string;
}

const PRESETS = [100, 500, 1000];

export default function TradeModal({ mode, onClose, prices, agentName, agentEmoji, initialPair, initialAmount }: TradeModalProps) {
  const [selectedPair, setSelectedPair] = useState(initialPair || "BTC/USD");
  const [amount, setAmount] = useState(initialAmount || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const selectedPrice = prices.find((p: any) => p.pair === selectedPair);
  const price = selectedPrice?.price || 0;
  const quantity = amount && price > 0 ? parseFloat(amount) / price : 0;

  const handleTrade = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    setIsSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/trade", {
        pair: selectedPair,
        side: mode,
        quantity,
      });
      const data = await res.json();
      toast({
        title: mode === "buy" ? "🟢 Trade Executed!" : "🔴 Trade Executed!",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
      onClose();
    } catch (err: any) {
      toast({
        title: "❌ Trade Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-[430px] rounded-t-3xl bg-[#12121A] border-t border-[#2A2A3E] p-4 pb-24"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="w-12 h-1 rounded-full bg-[#2A2A3E] mx-auto mb-4" />

        <h3 className="font-display font-bold text-lg text-center mb-4">
          {mode === "buy" ? "🟢 Quick Buy" : "🔴 Quick Sell"}
        </h3>

        {/* Pair Selector */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-4">
          {prices.map((p: any) => (
            <button
              key={p.pair}
              onClick={() => setSelectedPair(p.pair)}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-display font-bold transition-all ${
                selectedPair === p.pair
                  ? mode === "buy"
                    ? "bg-neon-green/20 text-neon-green border border-neon-green/40"
                    : "bg-neon-pink/20 text-neon-pink border border-neon-pink/40"
                  : "bg-[#1A1A2E] text-[#888899] border border-[#2A2A3E]"
              }`}
            >
              {p.emoji} {p.pair.split("/")[0]}
            </button>
          ))}
        </div>

        {/* Price Display */}
        <div className="text-center mb-4">
          <span className="font-mono-num text-3xl font-bold text-[#E8E8E8]">
            ${price < 1 ? price.toFixed(4) : price.toLocaleString()}
          </span>
          {selectedPrice && (
            <span className={`ml-2 font-mono-num text-sm ${selectedPrice.change24h >= 0 ? "text-neon-green" : "text-neon-pink"}`}>
              {selectedPrice.change24h >= 0 ? "+" : ""}{selectedPrice.change24h.toFixed(2)}%
            </span>
          )}
        </div>

        {/* Amount Input */}
        <div className="relative mb-3">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#888899] text-lg">$</span>
          <input
            data-testid="input-trade-amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full bg-[#1A1A2E] border border-[#2A2A3E] rounded-2xl px-10 py-4 text-center font-mono-num text-2xl text-[#E8E8E8] outline-none focus:border-neon-cyan/50"
          />
        </div>

        {/* Preset Buttons */}
        <div className="flex gap-2 mb-4">
          {PRESETS.map(preset => (
            <button
              key={preset}
              onClick={() => setAmount(preset.toString())}
              className="flex-1 py-2 rounded-xl bg-[#1A1A2E] border border-[#2A2A3E] font-mono-num text-sm text-[#888899] active:scale-95 transition-transform"
            >
              ${preset}
            </button>
          ))}
          <button
            onClick={() => setAmount("30000")}
            className="flex-1 py-2 rounded-xl bg-[#1A1A2E] border border-[#2A2A3E] font-display text-sm text-neon-gold active:scale-95 transition-transform"
          >
            MAX
          </button>
        </div>

        {/* Quantity display */}
        {quantity > 0 && (
          <p className="text-center text-xs text-[#888899] mb-3 font-mono-num">
            ≈ {quantity < 0.001 ? quantity.toFixed(6) : quantity.toFixed(4)} {selectedPair.split("/")[0]}
          </p>
        )}

        {/* Agent Opinion */}
        {agentName && (
          <div className="bg-[#1E1E32] rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
            <span className="text-lg">{agentEmoji}</span>
            <p className="text-xs text-[#E8E8E8]">
              <span className="font-display font-bold">{agentName}</span> says: {mode === "buy" ? "SEND IT 🚀" : "Take profits! 💰"}
            </p>
          </div>
        )}

        {/* Confirm Button */}
        <button
          data-testid="btn-confirm-trade"
          onClick={handleTrade}
          disabled={!amount || parseFloat(amount) <= 0 || isSubmitting}
          className={`w-full py-4 rounded-2xl font-display font-bold text-base transition-all active:scale-95 disabled:opacity-50 ${
            mode === "buy"
              ? "bg-neon-green text-black glow-green"
              : "bg-neon-pink text-white glow-pink"
          }`}
        >
          {isSubmitting ? "Executing..." : `Confirm ${mode === "buy" ? "Buy" : "Sell"}`}
        </button>
      </div>
    </div>
  );
}
