import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import TradeModal from "@/components/TradeModal";

type CommitteeMember = {
  id: number;
  agentId: string;
  agentSource: "internal" | "external";
  weight: number;
  agentName?: string;
  agentEmoji?: string;
  winRate?: number;
};

type Committee = {
  id: number;
  name: string;
  emoji: string;
  description?: string;
  memberCount: number;
  accuracy?: number;
  members?: CommitteeMember[];
};

type MemberVote = {
  agentId: string;
  agentName: string;
  agentEmoji: string;
  signal: "bullish" | "bearish" | "neutral";
  confidence: number;
  reasoning: string;
  weight: number;
};

type ConsensusResult = {
  signal: "bullish" | "bearish" | "neutral";
  confidence: number;
  agreement: number;
  memberVotes: MemberVote[];
  ticker: string;
  generatedAt: string;
};

type SignalHistory = {
  id: number;
  ticker: string;
  signal: "bullish" | "bearish" | "neutral";
  confidence: number;
  agreement: number;
  createdAt: string;
  memberVotes?: MemberVote[];
};

const TICKERS = ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE", "AVAX", "DOT", "LINK"];

function SignalBadge({ signal, size = "md" }: { signal: string; size?: "sm" | "md" | "lg" }) {
  const s = (signal || "neutral").toLowerCase();
  const cfg = {
    bullish: { bg: "bg-[#00FF88]/15", text: "text-[#00FF88]", border: "border-[#00FF88]/40", label: "BULLISH", icon: "▲" },
    bearish: { bg: "bg-neon-pink/15", text: "text-neon-pink", border: "border-neon-pink/40", label: "BEARISH", icon: "▼" },
    neutral: { bg: "bg-[#888899]/15", text: "text-[#888899]", border: "border-[#888899]/40", label: "NEUTRAL", icon: "◆" },
  }[s] || { bg: "bg-[#1A1A2E]", text: "text-[#888899]", border: "border-[#2A2A3E]", label: s.toUpperCase(), icon: "?" };

  const sizeClass = size === "lg" ? "text-base px-4 py-2" : size === "sm" ? "text-[9px] px-1.5 py-0.5" : "text-xs px-2.5 py-1";
  return (
    <span className={`${cfg.bg} ${cfg.text} border ${cfg.border} rounded-full font-display font-bold ${sizeClass}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function MemberVoteCard({ vote }: { vote: MemberVote }) {
  const [expanded, setExpanded] = useState(false);
  const sig = (vote.signal || "neutral").toLowerCase();
  const bgColor = {
    bullish: "bg-[#00FF88]/8 border-[#00FF88]/25",
    bearish: "bg-neon-pink/8 border-neon-pink/25",
    neutral: "bg-[#888899]/8 border-[#888899]/25",
  }[sig] || "bg-[#1A1A2E] border-[#2A2A3E]";

  return (
    <div className={`rounded-xl border ${bgColor} p-3`}>
      <div className="flex items-center gap-2">
        <span className="text-xl">{vote.agentEmoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-display font-bold text-[#E8E8E8] truncate">{vote.agentName}</p>
          <p className="text-[10px] text-[#888899] font-mono-num">{vote.weight.toFixed(1)}x weight</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <SignalBadge signal={vote.signal} size="sm" />
          <span className="text-[10px] font-mono-num text-[#888899]">{vote.confidence}% conf.</span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="ml-1 text-[#555566] text-xs"
        >
          {expanded ? "▲" : "▼"}
        </button>
      </div>
      {expanded && vote.reasoning && (
        <p className="mt-2 text-[11px] text-[#888899] leading-relaxed border-t border-[#2A2A3E] pt-2">
          {vote.reasoning}
        </p>
      )}
    </div>
  );
}

export default function CommitteeDashboard({ params }: { params: { id: string } }) {
  const committeeId = params.id;
  const [, navigate] = useLocation();
  const [ticker, setTicker] = useState("BTC");
  const [showTickerDropdown, setShowTickerDropdown] = useState(false);
  const [consensusResult, setConsensusResult] = useState<ConsensusResult | null>(null);
  const [expandedSignalId, setExpandedSignalId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showTradeModal, setShowTradeModal] = useState(false);

  const queryClient = useQueryClient();

  // Fetch prices for the trade modal
  const { data: priceData } = useQuery<any>({
    queryKey: ["/api/prices"],
    refetchInterval: 10000,
  });
  const prices: any[] = priceData?.prices || [];

  const { data: committee, isLoading } = useQuery<Committee>({
    queryKey: [`/api/committees/${committeeId}`],
    enabled: !!committeeId,
  });

  const { data: signals = [] } = useQuery<SignalHistory[]>({
    queryKey: [`/api/committees/${committeeId}/signals`],
    enabled: !!committeeId,
  });

  const consensusMutation = useMutation({
    mutationFn: async ({ id, t }: { id: string; t: string }) => {
      const res = await apiRequest("POST", `/api/committees/${id}/consensus/${t}`);
      return res.json();
    },
    onSuccess: (data) => {
      setIsAnimating(true);
      setTimeout(() => {
        setConsensusResult(data);
        setIsAnimating(false);
        queryClient.invalidateQueries({ queryKey: [`/api/committees/${committeeId}/signals`] });
      }, 600);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/committees/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/committees"] });
      navigate("/");
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🏛️</div>
          <p className="text-[#888899] font-display text-sm">Loading committee...</p>
        </div>
      </div>
    );
  }

  if (!committee) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="text-center px-8">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-[#E8E8E8] font-display font-bold mb-2">Committee not found</p>
          <button onClick={() => navigate("/")} className="text-neon-cyan text-sm font-display">← Back Home</button>
        </div>
      </div>
    );
  }

  const members: CommitteeMember[] = committee.members || [];

  return (
    <div className="min-h-screen bg-[#0A0A0F] pb-28">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0A0A0F]/90 backdrop-blur-md border-b border-[#2A2A3E] px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="w-8 h-8 rounded-xl bg-[#1A1A2E] border border-[#2A2A3E] flex items-center justify-center text-[#888899] active:scale-95 transition-transform"
          >
            ←
          </button>
          <div className="text-2xl">{committee.emoji}</div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-base text-[#E8E8E8] truncate">{committee.name}</h1>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#888899] font-display">{committee.memberCount || members.length} members</span>
              {committee.accuracy != null && (
                <>
                  <span className="text-[10px] text-[#555566]">•</span>
                  <span className="text-[10px] font-mono-num text-neon-green">{committee.accuracy}% accuracy</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Members Row */}
      {members.length > 0 && (
        <div className="mt-4 mx-4">
          <p className="text-xs font-display font-bold text-[#888899] mb-2 uppercase tracking-wider">Members</p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {members.map((m) => (
              <button
                key={`${m.agentSource}-${m.agentId}`}
                onClick={() => setSelectedMemberId(selectedMemberId === m.agentId ? null : m.agentId)}
                className={`flex-shrink-0 flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all ${
                  selectedMemberId === m.agentId
                    ? "bg-[#00FF88]/10 border border-[#00FF88]/40"
                    : "bg-[#1A1A2E] border border-[#2A2A3E]"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-[#0A0A0F] flex items-center justify-center text-xl">
                  {m.agentEmoji || "🤖"}
                </div>
                <span className="text-[10px] font-display text-[#E8E8E8] max-w-[56px] truncate">{m.agentName || m.agentId}</span>
                <span className="text-[9px] font-mono-num text-neon-green">{m.weight.toFixed(1)}x</span>
                {m.winRate != null && (
                  <span className="text-[9px] font-mono-num text-[#888899]">{m.winRate}% WR</span>
                )}
              </button>
            ))}
          </div>
          {/* Mini detail popup */}
          {selectedMemberId && (() => {
            const m = members.find((mem) => mem.agentId === selectedMemberId);
            if (!m) return null;
            return (
              <div className="mt-2 rounded-2xl bg-[#1A1A2E] border border-[#00FF88]/30 p-3">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{m.agentEmoji || "🤖"}</div>
                  <div className="flex-1">
                    <p className="font-display font-bold text-sm text-[#E8E8E8]">{m.agentName || m.agentId}</p>
                    <div className="flex gap-3 mt-1">
                      <span className="text-[10px] text-neon-green font-mono-num">Weight: {m.weight.toFixed(1)}x</span>
                      <span className="text-[10px] text-neon-cyan font-display capitalize">{m.agentSource}</span>
                      {m.winRate != null && <span className="text-[10px] text-neon-gold font-mono-num">WR: {m.winRate}%</span>}
                    </div>
                  </div>
                  <button onClick={() => setSelectedMemberId(null)} className="text-[#555566] text-xs">✕</button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Consensus Generator */}
      <div className="mx-4 mt-4 rounded-2xl bg-gradient-to-br from-[#1A1A2E] to-[#0F0F1A] border border-[#2A2A3E] p-4">
        <p className="text-xs font-display font-bold text-[#888899] mb-3 uppercase tracking-wider">🧬 Consensus Generator</p>

        {/* Ticker selector */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <button
              onClick={() => setShowTickerDropdown(!showTickerDropdown)}
              className="w-full bg-[#0A0A0F] border border-[#2A2A3E] rounded-xl px-3 py-2.5 text-left flex items-center justify-between focus:outline-none focus:border-[#00D4FF]/50"
            >
              <span className="font-display font-bold text-sm text-[#E8E8E8]">{ticker}</span>
              <span className="text-[#555566] text-xs">{showTickerDropdown ? "▲" : "▼"}</span>
            </button>
            {showTickerDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-[#0A0A0F] border border-[#2A2A3E] rounded-xl overflow-hidden shadow-xl">
                <div className="grid grid-cols-2 p-2 gap-1">
                  {TICKERS.map((t) => (
                    <button
                      key={t}
                      onClick={() => { setTicker(t); setShowTickerDropdown(false); }}
                      className={`px-3 py-2 rounded-lg text-sm font-display font-bold text-left transition-all ${
                        ticker === t ? "bg-[#00D4FF]/20 text-[#00D4FF]" : "text-[#E8E8E8] hover:bg-[#1A1A2E]"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => consensusMutation.mutate({ id: committeeId, t: ticker })}
            disabled={consensusMutation.isPending || isAnimating}
            className="px-4 py-2.5 rounded-xl font-display font-bold text-sm bg-gradient-to-r from-[#00D4FF] to-[#00FF88] text-black transition-all active:scale-95 disabled:opacity-50"
          >
            {consensusMutation.isPending || isAnimating ? "⟳" : "Generate"}
          </button>
        </div>

        {/* Consensus result */}
        {consensusResult && !isAnimating && (
          <div className="space-y-3">
            {/* Main signal */}
            <div className="text-center py-4 rounded-2xl bg-[#0A0A0F] border border-[#2A2A3E]">
              <p className="text-[10px] text-[#555566] font-display mb-2">{consensusResult.ticker} CONSENSUS</p>
              <SignalBadge signal={consensusResult.signal} size="lg" />
              <p className="text-3xl font-mono-num font-bold mt-2" style={{
                color: consensusResult.signal === "bullish" ? "#00FF88" : consensusResult.signal === "bearish" ? "#FF3B9A" : "#888899"
              }}>
                {consensusResult.confidence}%
              </p>
              <p className="text-[10px] text-[#888899] font-display">confidence</p>
            </div>

            {/* Bars */}
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[10px] font-display text-[#888899] mb-1">
                  <span>Confidence</span>
                  <span className="font-mono-num text-neon-cyan">{consensusResult.confidence}%</span>
                </div>
                <div className="h-2 bg-[#0A0A0F] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#00D4FF] to-[#00FF88] transition-all duration-700"
                    style={{ width: `${consensusResult.confidence}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-display text-[#888899] mb-1">
                  <span>Agent Agreement</span>
                  <span className="font-mono-num text-neon-gold">{consensusResult.agreement}%</span>
                </div>
                <div className="h-2 bg-[#0A0A0F] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#FFD700] to-[#FF3B9A] transition-all duration-700"
                    style={{ width: `${consensusResult.agreement}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Trade on this signal button */}
            {consensusResult.signal !== "neutral" && (
              <button
                data-testid="btn-trade-on-signal"
                onClick={() => setShowTradeModal(true)}
                className={`w-full py-3.5 rounded-2xl font-display font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2 ${
                  consensusResult.signal === "bullish"
                    ? "bg-gradient-to-r from-[#00FF88] to-[#00D4FF] text-black glow-green"
                    : "bg-gradient-to-r from-[#FF3B9A] to-[#FF6B6B] text-white glow-pink"
                }`}
              >
                <span className="text-base">{consensusResult.signal === "bullish" ? "🚀" : "📉"}</span>
                Trade on this signal — {consensusResult.signal === "bullish" ? "Buy" : "Sell"} {consensusResult.ticker}
              </button>
            )}

            {/* Member votes */}
            {consensusResult.memberVotes && consensusResult.memberVotes.length > 0 && (
              <div>
                <p className="text-[10px] text-[#555566] font-display font-bold uppercase tracking-wider mb-2">Individual Votes</p>
                <div className="space-y-2">
                  {consensusResult.memberVotes.map((vote, i) => (
                    <MemberVoteCard key={i} vote={vote} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading animation */}
        {isAnimating && (
          <div className="text-center py-8">
            <div className="text-3xl animate-pulse">🧬</div>
            <p className="text-[#888899] font-display text-xs mt-2">Aggregating votes...</p>
          </div>
        )}

        {consensusMutation.isError && (
          <div className="mt-2 px-3 py-2 rounded-xl bg-neon-pink/10 border border-neon-pink/30">
            <p className="text-xs text-neon-pink font-display">
              {(consensusMutation.error as Error)?.message || "Failed to generate consensus"}
            </p>
          </div>
        )}
      </div>

      {/* Signal History */}
      <div className="mx-4 mt-4">
        <p className="text-xs font-display font-bold text-[#888899] mb-3 uppercase tracking-wider">📜 Signal History</p>
        {signals.length === 0 ? (
          <div className="rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-6 text-center">
            <div className="text-3xl mb-2">📭</div>
            <p className="text-sm font-display text-[#888899]">No signals yet</p>
            <p className="text-[10px] text-[#555566] mt-1">Generate your first consensus above</p>
          </div>
        ) : (
          <div className="space-y-2">
            {signals.map((sig) => (
              <div key={sig.id}>
                <button
                  onClick={() => setExpandedSignalId(expandedSignalId === sig.id ? null : sig.id)}
                  className="w-full rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-3 text-left active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center gap-3">
                    <div className="font-display font-bold text-sm text-[#E8E8E8] min-w-[40px]">{sig.ticker}</div>
                    <SignalBadge signal={sig.signal} size="sm" />
                    <div className="flex-1 text-right space-y-0.5">
                      <p className="text-[10px] font-mono-num text-neon-cyan">{sig.confidence}% conf</p>
                      <p className="text-[10px] font-mono-num text-[#888899]">{sig.agreement}% agree</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-[#555566] font-display">
                        {new Date(sig.createdAt).toLocaleDateString()}
                      </p>
                      <span className="text-[10px] text-[#555566]">{expandedSignalId === sig.id ? "▲" : "▼"}</span>
                    </div>
                  </div>
                </button>
                {expandedSignalId === sig.id && sig.memberVotes && sig.memberVotes.length > 0 && (
                  <div className="mt-1 mx-1 space-y-1.5">
                    {sig.memberVotes.map((vote, i) => (
                      <MemberVoteCard key={i} vote={vote} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manage Section */}
      <div className="mx-4 mt-6">
        <p className="text-xs font-display font-bold text-[#888899] mb-3 uppercase tracking-wider">⚙️ Manage</p>
        <div className="space-y-2">
          <button
            onClick={() => navigate(`/committee/new?edit=${committeeId}`)}
            className="w-full rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-3 text-left flex items-center gap-3 active:scale-[0.98] transition-transform"
          >
            <span className="text-lg">✏️</span>
            <span className="font-display text-sm text-[#E8E8E8]">Edit name & emoji</span>
            <span className="ml-auto text-[#555566] text-sm">→</span>
          </button>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full rounded-2xl bg-neon-pink/5 border border-neon-pink/20 p-3 text-left flex items-center gap-3 active:scale-[0.98] transition-transform"
            >
              <span className="text-lg">🗑️</span>
              <span className="font-display text-sm text-neon-pink">Delete committee</span>
            </button>
          ) : (
            <div className="rounded-2xl bg-neon-pink/10 border border-neon-pink/30 p-4">
              <p className="font-display font-bold text-sm text-[#E8E8E8] mb-1">Delete "{committee.name}"?</p>
              <p className="text-[11px] text-[#888899] mb-3">This cannot be undone. All signals will be lost.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2 rounded-xl bg-[#1A1A2E] border border-[#2A2A3E] font-display text-xs text-[#888899]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteMutation.mutate(committeeId)}
                  disabled={deleteMutation.isPending}
                  className="flex-1 py-2 rounded-xl bg-neon-pink text-white font-display font-bold text-xs"
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Trade Modal — pre-filled from consensus */}
      {showTradeModal && consensusResult && (
        <TradeModal
          mode={consensusResult.signal === "bullish" ? "buy" : "sell"}
          onClose={() => setShowTradeModal(false)}
          prices={prices}
          agentName={committee?.name}
          agentEmoji={committee?.emoji}
          initialPair={`${consensusResult.ticker}/USD`}
          initialAmount={"500"}
        />
      )}
    </div>
  );
}
