import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

// ── Types ──
type Duel = {
  id: number;
  challengerUserId: number;
  challengerAgentId: string;
  challengerUsername?: string;
  challengerAgentName?: string;
  challengerAgentEmoji?: string;
  opponentUserId?: number;
  opponentAgentId?: string;
  opponentUsername?: string;
  opponentAgentName?: string;
  opponentAgentEmoji?: string;
  ticker: string;
  wager: number;
  durationHours: number;
  status: string;
  startPrice?: number;
  endPrice?: number;
  winnerUserId?: number;
  challengerReturn?: number;
  opponentReturn?: number;
  createdAt: string;
  startsAt?: string;
  endsAt?: string;
};

type Prediction = {
  id: number;
  question: string;
  ticker?: string;
  category: string;
  yesPool: number;
  noPool: number;
  totalBettors: number;
  status: string;
  outcome?: boolean;
  closesAt: string;
  createdAt: string;
};

type HFAgent = {
  id: number;
  agentId: string;
  name: string;
  category: string;
  avatarEmoji: string;
  winRate: number;
  riskTolerance: string;
};

// ── Countdown helper ──
function TimeLeft({ target }: { target: string }) {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return <span className="text-red-400">Expired</span>;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return <span className="text-yellow-400">{Math.floor(h / 24)}d {h % 24}h</span>;
  return <span className="text-yellow-400">{h}h {m}m</span>;
}

// ── Odds display ──
function OddsBar({ yesPool, noPool }: { yesPool: number; noPool: number }) {
  const total = yesPool + noPool;
  const yesPct = total > 0 ? Math.round((yesPool / total) * 100) : 50;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-green-400 font-bold">{yesPct}%</span>
      <div className="flex-1 h-2 rounded-full bg-[#1A1A2E] overflow-hidden">
        <div className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all" style={{ width: `${yesPct}%` }} />
      </div>
      <span className="text-red-400 font-bold">{100 - yesPct}%</span>
    </div>
  );
}

// ══════════════════════════════════════════════
// ─── CREATE DUEL MODAL ───
// ══════════════════════════════════════════════
function CreateDuelModal({ agents, onClose }: { agents: HFAgent[]; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [agentId, setAgentId] = useState("");
  const [ticker, setTicker] = useState("BTC");
  const [wager, setWager] = useState(100);
  const [duration, setDuration] = useState(24);

  const createMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/duels", { agentId, ticker, wager, durationHours: duration }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/duels/open"] });
      qc.invalidateQueries({ queryKey: ["/api/duels/mine"] });
      qc.invalidateQueries({ queryKey: ["/api/me"] });
      toast({ title: "Duel created!", description: "Waiting for an opponent..." });
      onClose();
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center px-4" onClick={onClose}>
      <div className="w-full max-w-[400px] bg-[#12121A] rounded-2xl p-6 border border-[#2A2A3E] max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-5">
          <div className="text-2xl mb-1">⚔️</div>
          <h2 className="font-display text-lg font-bold text-white">Create Duel</h2>
          <p className="text-xs text-[#888899]">Pick your agent, choose a ticker, set your wager</p>
        </div>

        {/* Agent picker */}
        <label className="text-xs text-[#888899] font-display uppercase tracking-wider mb-1 block">Your Agent</label>
        <div className="grid grid-cols-3 gap-2 mb-4 max-h-[160px] overflow-y-auto pr-1">
          {agents.map((a) => (
            <button
              key={a.agentId}
              onClick={() => setAgentId(a.agentId)}
              className={`rounded-xl p-2 text-center transition-all border ${agentId === a.agentId ? "border-[#00FF88] bg-[#00FF88]/10" : "border-[#2A2A3E] bg-[#1A1A2E]"}`}
            >
              <div className="text-xl">{a.avatarEmoji}</div>
              <div className="text-[10px] text-[#CCCCDD] truncate">{a.name.split(" ").slice(0, 2).join(" ")}</div>
            </button>
          ))}
        </div>

        {/* Ticker */}
        <label className="text-xs text-[#888899] font-display uppercase tracking-wider mb-1 block">Ticker</label>
        <div className="flex gap-2 mb-4">
          {["BTC", "ETH", "SOL", "AAPL", "TSLA"].map((t) => (
            <button
              key={t}
              onClick={() => setTicker(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${ticker === t ? "border-[#00D4FF] bg-[#00D4FF]/10 text-[#00D4FF]" : "border-[#2A2A3E] text-[#888899]"}`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Wager */}
        <label className="text-xs text-[#888899] font-display uppercase tracking-wider mb-1 block">Wager (credits)</label>
        <div className="flex gap-2 mb-4">
          {[50, 100, 250, 500].map((w) => (
            <button
              key={w}
              onClick={() => setWager(w)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${wager === w ? "border-[#FFD700] bg-[#FFD700]/10 text-[#FFD700]" : "border-[#2A2A3E] text-[#888899]"}`}
            >
              {w}
            </button>
          ))}
        </div>

        {/* Duration */}
        <label className="text-xs text-[#888899] font-display uppercase tracking-wider mb-1 block">Duration</label>
        <div className="flex gap-2 mb-6">
          {[{ h: 4, l: "4h" }, { h: 24, l: "24h" }, { h: 72, l: "3d" }, { h: 168, l: "7d" }].map(({ h, l }) => (
            <button
              key={h}
              onClick={() => setDuration(h)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${duration === h ? "border-[#FF3B9A] bg-[#FF3B9A]/10 text-[#FF3B9A]" : "border-[#2A2A3E] text-[#888899]"}`}
            >
              {l}
            </button>
          ))}
        </div>

        <button
          onClick={() => createMut.mutate()}
          disabled={!agentId || createMut.isPending}
          className="w-full py-3 rounded-xl font-display font-bold text-sm bg-gradient-to-r from-[#00FF88] to-[#00D4FF] text-black disabled:opacity-40 transition-all"
        >
          {createMut.isPending ? "Creating..." : `Challenge — ${wager} Credits`}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// ─── ACCEPT DUEL MODAL ───
// ══════════════════════════════════════════════
function AcceptDuelModal({ duel, agents, onClose }: { duel: Duel; agents: HFAgent[]; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [agentId, setAgentId] = useState("");

  const acceptMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/duels/${duel.id}/accept`, { agentId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/duels/open"] });
      qc.invalidateQueries({ queryKey: ["/api/duels/mine"] });
      qc.invalidateQueries({ queryKey: ["/api/me"] });
      toast({ title: "Duel accepted!", description: "May the best agent win!" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center px-4" onClick={onClose}>
      <div className="w-full max-w-[400px] bg-[#12121A] rounded-2xl p-6 border border-[#2A2A3E] max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-4">
          <div className="text-2xl mb-1">🤝</div>
          <h2 className="font-display text-lg font-bold text-white">Accept Duel</h2>
          <p className="text-xs text-[#888899]">
            {duel.challengerAgentEmoji} {duel.challengerAgentName} challenged on <span className="text-[#00D4FF] font-bold">{duel.ticker}</span> for <span className="text-[#FFD700] font-bold">{duel.wager} credits</span>
          </p>
        </div>

        <label className="text-xs text-[#888899] font-display uppercase tracking-wider mb-1 block">Pick Your Agent</label>
        <div className="grid grid-cols-3 gap-2 mb-6 max-h-[200px] overflow-y-auto pr-1">
          {agents.map((a) => (
            <button
              key={a.agentId}
              onClick={() => setAgentId(a.agentId)}
              className={`rounded-xl p-2 text-center transition-all border ${agentId === a.agentId ? "border-[#00FF88] bg-[#00FF88]/10" : "border-[#2A2A3E] bg-[#1A1A2E]"}`}
            >
              <div className="text-xl">{a.avatarEmoji}</div>
              <div className="text-[10px] text-[#CCCCDD] truncate">{a.name.split(" ").slice(0, 2).join(" ")}</div>
            </button>
          ))}
        </div>

        <button
          onClick={() => acceptMut.mutate()}
          disabled={!agentId || acceptMut.isPending}
          className="w-full py-3 rounded-xl font-display font-bold text-sm bg-gradient-to-r from-[#FF3B9A] to-[#FFD700] text-black disabled:opacity-40 transition-all"
        >
          {acceptMut.isPending ? "Accepting..." : `Accept — ${duel.wager} Credits`}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// ─── BET MODAL ───
// ══════════════════════════════════════════════
function BetModal({ prediction, onClose }: { prediction: Prediction; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState(50);

  const betMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/predictions/${prediction.id}/bet`, { side, amount }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/predictions/open"] });
      qc.invalidateQueries({ queryKey: ["/api/me"] });
      toast({ title: "Bet placed!", description: `${amount} credits on ${side.toUpperCase()}` });
      onClose();
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const total = prediction.yesPool + prediction.noPool + amount;
  const yourPool = side === "yes" ? prediction.yesPool + amount : prediction.noPool + amount;
  const potentialPayout = yourPool > 0 ? Math.round((amount / yourPool) * total) : 0;

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center px-4" onClick={onClose}>
      <div className="w-full max-w-[400px] bg-[#12121A] rounded-2xl p-6 border border-[#2A2A3E] max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-base font-bold text-white mb-1 text-center">{prediction.question}</h2>
        <OddsBar yesPool={prediction.yesPool} noPool={prediction.noPool} />

        <div className="flex gap-3 my-5">
          <button
            onClick={() => setSide("yes")}
            className={`flex-1 py-3 rounded-xl font-display font-bold text-sm border-2 transition-all ${side === "yes" ? "border-green-400 bg-green-400/15 text-green-400" : "border-[#2A2A3E] text-[#888899]"}`}
          >
            YES ✅
          </button>
          <button
            onClick={() => setSide("no")}
            className={`flex-1 py-3 rounded-xl font-display font-bold text-sm border-2 transition-all ${side === "no" ? "border-red-400 bg-red-400/15 text-red-400" : "border-[#2A2A3E] text-[#888899]"}`}
          >
            NO ❌
          </button>
        </div>

        <label className="text-xs text-[#888899] font-display uppercase tracking-wider mb-1 block">Wager</label>
        <div className="flex gap-2 mb-4">
          {[25, 50, 100, 250].map((a) => (
            <button
              key={a}
              onClick={() => setAmount(a)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${amount === a ? "border-[#FFD700] bg-[#FFD700]/10 text-[#FFD700]" : "border-[#2A2A3E] text-[#888899]"}`}
            >
              {a}
            </button>
          ))}
        </div>

        <div className="bg-[#1A1A2E] rounded-xl p-3 mb-5 text-center">
          <div className="text-xs text-[#888899]">Potential Payout</div>
          <div className="text-xl font-bold text-[#FFD700] font-display">{potentialPayout} credits</div>
          <div className="text-[10px] text-[#666677]">{total > 0 ? ((potentialPayout / amount) * 100 - 100).toFixed(0) : 0}% return</div>
        </div>

        <button
          onClick={() => betMut.mutate()}
          disabled={betMut.isPending}
          className={`w-full py-3 rounded-xl font-display font-bold text-sm text-black transition-all ${side === "yes" ? "bg-gradient-to-r from-green-400 to-green-500" : "bg-gradient-to-r from-red-400 to-red-500"}`}
        >
          {betMut.isPending ? "Placing..." : `Bet ${amount} on ${side.toUpperCase()}`}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// ─── DUEL CARD ───
// ══════════════════════════════════════════════
function DuelCard({ duel, isOwn, onAccept }: { duel: Duel; isOwn: boolean; onAccept: () => void }) {
  const statusColors: Record<string, string> = {
    open: "bg-yellow-500/20 text-yellow-400",
    active: "bg-[#00FF88]/20 text-[#00FF88]",
    resolved: "bg-[#00D4FF]/20 text-[#00D4FF]",
    cancelled: "bg-[#888899]/20 text-[#888899]",
  };

  return (
    <div className="bg-[#12121A] border border-[#2A2A3E] rounded-2xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{duel.challengerAgentEmoji}</span>
          <div>
            <div className="text-xs font-bold text-white font-display">{duel.challengerAgentName}</div>
            <div className="text-[10px] text-[#888899]">@{duel.challengerUsername}</div>
          </div>
        </div>
        <div className="text-xl font-display font-black text-[#888899]">VS</div>
        {duel.opponentAgentId ? (
          <div className="flex items-center gap-2 text-right">
            <div>
              <div className="text-xs font-bold text-white font-display">{duel.opponentAgentName}</div>
              <div className="text-[10px] text-[#888899]">@{duel.opponentUsername}</div>
            </div>
            <span className="text-lg">{duel.opponentAgentEmoji}</span>
          </div>
        ) : (
          <div className="text-xs text-[#888899] italic">Waiting...</div>
        )}
      </div>

      {/* Info row */}
      <div className="flex items-center justify-between text-xs">
        <Badge variant="outline" className="border-[#00D4FF]/40 text-[#00D4FF] font-bold">{duel.ticker}</Badge>
        <span className="text-[#FFD700] font-bold">{duel.wager} credits</span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColors[duel.status] ?? ""}`}>
          {duel.status.toUpperCase()}
        </span>
      </div>

      {/* Timer */}
      {duel.status === "active" && duel.endsAt && (
        <div className="text-center text-xs text-[#888899]">
          Ends in <TimeLeft target={duel.endsAt} />
        </div>
      )}

      {/* Results */}
      {duel.status === "resolved" && (
        <div className="text-center text-xs">
          <span className="text-[#00FF88] font-bold">Winner: </span>
          <span className="text-white">
            {duel.winnerUserId === duel.challengerUserId ? duel.challengerAgentName : duel.opponentAgentName}
          </span>
        </div>
      )}

      {/* Accept button */}
      {duel.status === "open" && !isOwn && (
        <button
          onClick={onAccept}
          className="w-full py-2 rounded-xl font-display font-bold text-xs bg-gradient-to-r from-[#FF3B9A] to-[#FFD700] text-black"
        >
          Accept Duel
        </button>
      )}
      {duel.status === "open" && isOwn && (
        <div className="text-center text-[10px] text-[#888899]">Your challenge — waiting for opponent</div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// ─── PREDICTION CARD ───
// ══════════════════════════════════════════════
function PredictionCard({ pred, onBet }: { pred: Prediction; onBet: () => void }) {
  const categoryColors: Record<string, string> = {
    crypto: "text-[#00D4FF]",
    equity: "text-[#00FF88]",
    macro: "text-[#FFD700]",
    fun: "text-[#FF3B9A]",
  };
  const categoryEmoji: Record<string, string> = { crypto: "₿", equity: "📈", macro: "🌍", fun: "🎲" };

  const total = pred.yesPool + pred.noPool;

  return (
    <div className="bg-[#12121A] border border-[#2A2A3E] rounded-2xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="text-2xl">{categoryEmoji[pred.category] ?? "❓"}</div>
        <div className="flex-1">
          <p className="text-sm font-bold text-white leading-tight">{pred.question}</p>
          <div className="flex items-center gap-2 mt-1">
            {pred.ticker && (
              <Badge variant="outline" className="border-[#00D4FF]/40 text-[#00D4FF] text-[10px]">{pred.ticker}</Badge>
            )}
            <span className={`text-[10px] font-bold ${categoryColors[pred.category] ?? ""}`}>
              {pred.category.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      <OddsBar yesPool={pred.yesPool} noPool={pred.noPool} />

      <div className="flex items-center justify-between text-[10px] text-[#888899]">
        <span>{pred.totalBettors} bettors</span>
        <span>{total} credits pooled</span>
        <span>Closes: <TimeLeft target={pred.closesAt} /></span>
      </div>

      {pred.status === "open" && (
        <div className="flex gap-2">
          <button onClick={onBet} className="flex-1 py-2 rounded-xl font-display font-bold text-xs bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-all">
            YES ✅
          </button>
          <button onClick={onBet} className="flex-1 py-2 rounded-xl font-display font-bold text-xs bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all">
            NO ❌
          </button>
        </div>
      )}

      {pred.status === "resolved" && (
        <div className={`text-center py-2 rounded-xl font-bold text-xs ${pred.outcome ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
          Result: {pred.outcome ? "YES ✅" : "NO ❌"}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// ─── MAIN PLAY PAGE ───
// ══════════════════════════════════════════════
export default function Play() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"duels" | "predict">("predict");
  const [showCreateDuel, setShowCreateDuel] = useState(false);
  const [acceptingDuel, setAcceptingDuel] = useState<Duel | null>(null);
  const [bettingPred, setBettingPred] = useState<Prediction | null>(null);
  const [duelTab, setDuelTab] = useState<"lobby" | "mine">("lobby");
  const [predTab, setPredTab] = useState<"open" | "resolved">("open");

  // Fetch agents for duel creation
  const { data: agents = [] } = useQuery<HFAgent[]>({
    queryKey: ["/api/hf-agents"],
    queryFn: () => apiRequest("GET", "/api/hf-agents").then((r: Response) => r.json()),
  });

  // Fetch duels
  const { data: openDuels = [] } = useQuery<Duel[]>({
    queryKey: ["/api/duels/open"],
    queryFn: () => apiRequest("GET", "/api/duels/open").then((r: Response) => r.json()),
    refetchInterval: 15000,
  });

  const { data: myDuels = [] } = useQuery<Duel[]>({
    queryKey: ["/api/duels/mine"],
    queryFn: () => apiRequest("GET", "/api/duels/mine").then((r: Response) => r.json()),
    enabled: !!user,
    refetchInterval: 15000,
  });

  // Fetch predictions
  const { data: openPreds = [] } = useQuery<Prediction[]>({
    queryKey: ["/api/predictions/open"],
    queryFn: () => apiRequest("GET", "/api/predictions/open").then((r: Response) => r.json()),
    refetchInterval: 15000,
  });

  const { data: resolvedPreds = [] } = useQuery<Prediction[]>({
    queryKey: ["/api/predictions/resolved"],
    queryFn: () => apiRequest("GET", "/api/predictions/resolved").then((r: Response) => r.json()),
  });

  const duels = duelTab === "lobby" ? openDuels : myDuels;
  const preds = predTab === "open" ? openPreds : resolvedPreds;

  return (
    <div className="min-h-screen bg-[#0A0A0F] p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-black text-white tracking-tight">Play</h1>
          <p className="text-xs text-[#888899]">Duels, predictions, and mini-games</p>
        </div>
        <Link href="/">
          <button className="text-[#888899] text-sm">← Back</button>
        </Link>
      </div>

      {/* Tab Switcher */}
      <div className="flex rounded-xl bg-[#12121A] border border-[#2A2A3E] p-1">
        <button
          onClick={() => setTab("predict")}
          className={`flex-1 py-2 rounded-lg font-display font-bold text-xs transition-all ${tab === "predict" ? "bg-gradient-to-r from-[#FFD700]/20 to-[#FF3B9A]/20 text-[#FFD700]" : "text-[#888899]"}`}
        >
          🔮 Predictions
        </button>
        <button
          onClick={() => setTab("duels")}
          className={`flex-1 py-2 rounded-lg font-display font-bold text-xs transition-all ${tab === "duels" ? "bg-gradient-to-r from-[#00FF88]/20 to-[#00D4FF]/20 text-[#00FF88]" : "text-[#888899]"}`}
        >
          ⚔️ H2H Duels
        </button>
      </div>

      {/* ─── PREDICTIONS TAB ─── */}
      {tab === "predict" && (
        <>
          {/* Sub-tabs */}
          <div className="flex gap-2">
            <button onClick={() => setPredTab("open")} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${predTab === "open" ? "bg-[#FFD700]/20 text-[#FFD700]" : "text-[#888899]"}`}>
              Live ({openPreds.length})
            </button>
            <button onClick={() => setPredTab("resolved")} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${predTab === "resolved" ? "bg-[#00D4FF]/20 text-[#00D4FF]" : "text-[#888899]"}`}>
              Resolved ({resolvedPreds.length})
            </button>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#12121A] border border-[#2A2A3E] rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-[#FFD700] font-display">{openPreds.length}</div>
              <div className="text-[10px] text-[#888899]">Live Markets</div>
            </div>
            <div className="bg-[#12121A] border border-[#2A2A3E] rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-[#00FF88] font-display">
                {openPreds.reduce((s, p) => s + p.yesPool + p.noPool, 0).toLocaleString()}
              </div>
              <div className="text-[10px] text-[#888899]">Credits Pooled</div>
            </div>
            <div className="bg-[#12121A] border border-[#2A2A3E] rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-[#FF3B9A] font-display">
                {openPreds.reduce((s, p) => s + p.totalBettors, 0)}
              </div>
              <div className="text-[10px] text-[#888899]">Total Bets</div>
            </div>
          </div>

          {/* Prediction cards */}
          {preds.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">🔮</div>
              <p className="text-[#888899] text-sm">No predictions yet</p>
              <p className="text-[10px] text-[#666677]">Markets will appear soon</p>
            </div>
          )}
          <div className="space-y-3">
            {preds.map((p) => (
              <PredictionCard key={p.id} pred={p} onBet={() => setBettingPred(p)} />
            ))}
          </div>
        </>
      )}

      {/* ─── DUELS TAB ─── */}
      {tab === "duels" && (
        <>
          {/* Sub-tabs + Create button */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button onClick={() => setDuelTab("lobby")} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${duelTab === "lobby" ? "bg-[#00FF88]/20 text-[#00FF88]" : "text-[#888899]"}`}>
                Lobby ({openDuels.length})
              </button>
              <button onClick={() => setDuelTab("mine")} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${duelTab === "mine" ? "bg-[#00D4FF]/20 text-[#00D4FF]" : "text-[#888899]"}`}>
                My Duels ({myDuels.length})
              </button>
            </div>
            {user && (
              <button
                onClick={() => setShowCreateDuel(true)}
                className="px-4 py-1.5 rounded-xl font-display font-bold text-xs bg-gradient-to-r from-[#00FF88] to-[#00D4FF] text-black"
              >
                + Create
              </button>
            )}
          </div>

          {/* How it works */}
          <div className="bg-[#12121A] border border-[#2A2A3E] rounded-2xl p-4">
            <div className="text-xs font-display font-bold text-white mb-2">How H2H Duels Work</div>
            <div className="space-y-1 text-[10px] text-[#888899]">
              <p>1. Pick your AI agent and a ticker (BTC, ETH, etc.)</p>
              <p>2. Set a credit wager and duration (4h to 7d)</p>
              <p>3. An opponent accepts with their agent</p>
              <p>4. Agent signals are compared at end — best return wins the pot</p>
            </div>
          </div>

          {/* Duel cards */}
          {duels.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">⚔️</div>
              <p className="text-[#888899] text-sm">{duelTab === "lobby" ? "No open duels" : "No duels yet"}</p>
              <p className="text-[10px] text-[#666677]">{duelTab === "lobby" ? "Be the first to create one!" : "Create a duel to get started"}</p>
            </div>
          )}
          <div className="space-y-3">
            {duels.map((d) => (
              <DuelCard
                key={d.id}
                duel={d}
                isOwn={d.challengerUserId === (user as any)?.id}
                onAccept={() => setAcceptingDuel(d)}
              />
            ))}
          </div>
        </>
      )}

      {/* Modals */}
      {showCreateDuel && <CreateDuelModal agents={agents} onClose={() => setShowCreateDuel(false)} />}
      {acceptingDuel && <AcceptDuelModal duel={acceptingDuel} agents={agents} onClose={() => setAcceptingDuel(null)} />}
      {bettingPred && <BetModal prediction={bettingPred} onClose={() => setBettingPred(null)} />}
    </div>
  );
}
