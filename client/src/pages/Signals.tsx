import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";

const TICKER_FILTERS = ["ALL", "BTC", "ETH", "SOL", "AAPL", "NVDA", "BNB", "XRP", "MSFT", "TSLA"];
const CATEGORY_FILTERS = ["All", "Persona", "Specialist", "Management"];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function SignalBadge({ signal }: { signal: string }) {
  const config: Record<string, { emoji: string; text: string; color: string; bg: string; border: string }> = {
    bullish: { emoji: "🟢", text: "BULLISH", color: "text-neon-green", bg: "bg-neon-green/10", border: "border-neon-green/30" },
    bearish: { emoji: "🔴", text: "BEARISH", color: "text-neon-pink", bg: "bg-neon-pink/10", border: "border-neon-pink/30" },
    neutral: { emoji: "🟡", text: "NEUTRAL", color: "text-neon-gold", bg: "bg-neon-gold/10", border: "border-neon-gold/30" },
  };
  const c = config[signal] || config.neutral;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-display font-bold ${c.color} ${c.bg} border ${c.border}`}>
      {c.emoji} {c.text}
    </span>
  );
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const color = confidence >= 75 ? "bg-neon-green" : confidence >= 55 ? "bg-neon-gold" : "bg-neon-pink";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-[#2A2A3E] overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${confidence}%` }} />
      </div>
      <span className="text-[10px] font-mono-num text-[#888899]">{confidence}%</span>
    </div>
  );
}

function TimeHorizonBadge({ horizon }: { horizon: string }) {
  const colors: Record<string, string> = {
    short: "text-neon-pink border-neon-pink/20 bg-neon-pink/5",
    medium: "text-neon-gold border-neon-gold/20 bg-neon-gold/5",
    long: "text-neon-cyan border-neon-cyan/20 bg-neon-cyan/5",
  };
  return (
    <span className={`text-[8px] font-display font-bold px-1.5 py-0.5 rounded border ${colors[horizon] || colors.medium}`}>
      {horizon?.toUpperCase()}
    </span>
  );
}

function SignalCard({ signal, agents }: { signal: any; agents: any[] }) {
  const [expanded, setExpanded] = useState(false);
  const agent = agents.find((a: any) => a.agentId === signal.hedgeFundAgentId);
  if (!agent) return null;

  let reasoning = "";
  try {
    const parsed = JSON.parse(signal.reasoning);
    reasoning = parsed.summary || "";
  } catch {
    reasoning = signal.reasoning;
  }

  return (
    <div className="rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-3">
      <div className="flex items-start gap-2.5">
        <Link href={`/signals/${agent.agentId}`}>
          <div className="w-10 h-10 rounded-full bg-[#0A0A0F] border border-[#2A2A3E] flex items-center justify-center text-xl flex-shrink-0 cursor-pointer hover:border-neon-cyan/50 transition-colors">
            {agent.avatarEmoji}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/signals/${agent.agentId}`}>
              <span className="font-display font-bold text-sm text-[#E8E8E8] cursor-pointer hover:text-neon-cyan transition-colors">{agent.name}</span>
            </Link>
            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-[#2A2A3E] text-[#888899] font-display">{agent.category}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <SignalBadge signal={signal.signal} />
            <span className="font-display font-bold text-xs text-[#E8E8E8]">{signal.ticker}</span>
            {signal.targetPrice && (
              <span className="text-[10px] font-mono-num text-[#888899]">
                TP: ${signal.targetPrice < 1 ? signal.targetPrice.toFixed(4) : signal.targetPrice.toLocaleString()}
              </span>
            )}
            {signal.timeHorizon && <TimeHorizonBadge horizon={signal.timeHorizon} />}
          </div>
          <div className="mt-1.5">
            <ConfidenceBar confidence={signal.confidence} />
          </div>
          {reasoning && (
            <p
              className={`text-[11px] text-[#888899] mt-1.5 leading-relaxed cursor-pointer ${expanded ? "" : "line-clamp-2"}`}
              onClick={() => setExpanded(!expanded)}
            >
              {reasoning}
            </p>
          )}
          <p className="text-[9px] text-[#555566] mt-1">{timeAgo(signal.createdAt)}</p>
        </div>
      </div>
    </div>
  );
}

export default function Signals() {
  const [selectedTicker, setSelectedTicker] = useState("ALL");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const { data: signals } = useQuery<any[]>({
    queryKey: ["/api/signals", selectedTicker],
    queryFn: async () => {
      const params = selectedTicker !== "ALL" ? `?ticker=${selectedTicker}&limit=100` : "?limit=100";
      const res = await fetch(`/api/signals${params}`);
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: agents } = useQuery<any[]>({
    queryKey: ["/api/hf-agents"],
  });

  const { data: signalSource } = useQuery<{
    source: string;
    lastFetch: string | null;
    fetchStatus: string;
    liveSignalCount: number;
    engineUrl: string;
  }>({
    queryKey: ["/api/signals/source"],
    refetchInterval: 60000,
  });

  const isLive = signalSource?.source === "live";

  // Filter by category
  const filteredSignals = (signals || []).filter((s: any) => {
    if (selectedCategory === "All") return true;
    const agent = (agents || []).find((a: any) => a.agentId === s.hedgeFundAgentId);
    return agent?.category === selectedCategory.toLowerCase();
  });

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 py-3" style={{ background: "rgba(10, 10, 15, 0.9)", backdropFilter: "blur(12px)" }}>
        <div className="flex items-center gap-2">
          <span className="text-lg">📡</span>
          <h1 className="font-display font-bold text-lg text-[#E8E8E8]">
            {isLive ? "LIVE" : ""} SIGNALS
          </h1>
          {isLive ? (
            <span className="relative flex h-2.5 w-2.5 ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-neon-green"></span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-display font-bold text-neon-gold bg-neon-gold/10 border border-neon-gold/20 ml-1">
              SIMULATED
            </span>
          )}
        </div>
        <p className="text-[10px] text-[#888899] mt-0.5">
          19 AI Hedge Fund Agents Analyzing Markets
          {isLive && signalSource?.lastFetch && (
            <span className="ml-2 text-neon-green/60">Last sync: {timeAgo(signalSource.lastFetch)}</span>
          )}
        </p>
      </header>

      {/* Ticker Filter Pills */}
      <div className="px-4 mt-2 overflow-x-auto hide-scrollbar">
        <div className="flex gap-2 w-max">
          {TICKER_FILTERS.map(t => (
            <button
              key={t}
              onClick={() => setSelectedTicker(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-display font-bold transition-all ${
                selectedTicker === t
                  ? "bg-neon-green text-black"
                  : "bg-[#1A1A2E] text-[#888899] border border-[#2A2A3E]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Category Filter */}
      <div className="px-4 mt-2 flex gap-2">
        {CATEGORY_FILTERS.map(c => (
          <button
            key={c}
            onClick={() => setSelectedCategory(c)}
            className={`px-3 py-1 rounded-full text-[10px] font-display font-bold transition-all ${
              selectedCategory === c
                ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30"
                : "bg-[#1A1A2E] text-[#555566] border border-[#2A2A3E]"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Signal Count */}
      <div className="px-4 mt-3 flex items-center justify-between">
        <span className="text-[10px] text-[#555566] font-display">{filteredSignals.length} signals</span>
      </div>

      {/* Signal Feed */}
      <div className="px-4 mt-2 space-y-3 pb-4">
        {filteredSignals.map((signal: any) => (
          <SignalCard key={signal.id} signal={signal} agents={agents || []} />
        ))}
        {filteredSignals.length === 0 && (
          <div className="text-center py-12">
            <span className="text-4xl">📡</span>
            <p className="text-[#888899] font-display mt-2">No signals found</p>
            <p className="text-[10px] text-[#555566]">Try adjusting filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
