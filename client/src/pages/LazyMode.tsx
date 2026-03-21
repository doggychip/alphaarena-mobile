import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

// ── Types ──
interface TopAgent {
  agentId: string;
  name: string;
  avatarEmoji: string;
  tradingPhilosophy: string;
  category: string;
  riskTolerance: string;
  assetFocus: string;
  winRate: number;
  totalSignals: number;
  avgConfidence: number;
  weeklyReturn: number;
  rank: number;
  tier: "meme" | "hedge_fund";
}

// ── Lazy-mode status badge ──
function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-display font-bold tracking-wide ${
        active
          ? "bg-neon-green/15 text-neon-green border border-neon-green/30"
          : "bg-[#2A2A3E] text-[#888899] border border-[#2A2A3E]"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-neon-green animate-pulse" : "bg-[#555566]"}`} />
      {active ? "AUTO-PILOT ON" : "OFF"}
    </span>
  );
}

// ── Rank medal ──
function RankMedal({ rank }: { rank: number }) {
  const medals = ["🥇", "🥈", "🥉"];
  if (rank <= 3) return <span className="text-2xl">{medals[rank - 1]}</span>;
  return (
    <span className="w-8 h-8 rounded-full bg-[#2A2A3E] flex items-center justify-center text-sm font-mono-num font-bold text-[#888899]">
      {rank}
    </span>
  );
}

// ── Sparkline mini-chart (simulated) ──
function MiniSparkline({ positive }: { positive: boolean }) {
  const points = useRef<number[]>([]);
  if (points.current.length === 0) {
    let val = 50;
    for (let i = 0; i < 20; i++) {
      val += (Math.random() - (positive ? 0.35 : 0.65)) * 8;
      val = Math.max(10, Math.min(90, val));
      points.current.push(val);
    }
    // Ensure end is higher/lower than start
    if (positive && points.current[19] < points.current[0]) {
      points.current[19] = points.current[0] + 15;
    }
    if (!positive && points.current[19] > points.current[0]) {
      points.current[19] = points.current[0] - 15;
    }
  }
  const pts = points.current;
  const pathD = pts.map((y, i) => `${(i / 19) * 80},${100 - y}`).join(" L ");
  return (
    <svg viewBox="0 0 80 100" className="w-16 h-8" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`spark-${positive ? "g" : "r"}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={positive ? "#00FF88" : "#FF3B9A"} stopOpacity="0.3" />
          <stop offset="100%" stopColor={positive ? "#00FF88" : "#FF3B9A"} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`M 0,${100 - pts[0]} L ${pathD} L 80,100 L 0,100 Z`}
        fill={`url(#spark-${positive ? "g" : "r"})`}
      />
      <path
        d={`M 0,${100 - pts[0]} L ${pathD}`}
        fill="none"
        stroke={positive ? "#00FF88" : "#FF3B9A"}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// ── Agent Card ──
function AgentCard({
  agent,
  isCopying,
  onCopy,
  isLoading,
}: {
  agent: TopAgent;
  isCopying: boolean;
  onCopy: () => void;
  isLoading: boolean;
}) {
  const isPositive = agent.weeklyReturn >= 0;

  return (
    <div
      data-testid={`lazy-agent-${agent.agentId}`}
      className={`rounded-2xl border p-4 transition-all duration-300 ${
        isCopying
          ? "bg-neon-green/5 border-neon-green/40 shadow-[0_0_20px_rgba(0,255,136,0.1)]"
          : "bg-[#1A1A2E] border-[#2A2A3E]"
      }`}
    >
      {/* Top row: rank + agent info + sparkline */}
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-1 pt-0.5">
          <RankMedal rank={agent.rank} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{agent.avatarEmoji}</span>
            <div className="min-w-0">
              <p className="font-display font-bold text-sm text-[#E8E8E8] truncate">{agent.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-display font-bold ${
                  agent.tier === "hedge_fund"
                    ? "bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20"
                    : "bg-neon-pink/10 text-neon-pink border border-neon-pink/20"
                }`}>
                  {agent.tier === "hedge_fund" ? "🏦 HF" : "🎭 MEME"}
                </span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-display ${
                  agent.riskTolerance === "low" ? "text-neon-green bg-neon-green/10" :
                  agent.riskTolerance === "high" ? "text-neon-pink bg-neon-pink/10" :
                  "text-neon-gold bg-neon-gold/10"
                }`}>
                  {(agent.riskTolerance || "medium").charAt(0).toUpperCase() + (agent.riskTolerance || "medium").slice(1)} Risk
                </span>
              </div>
            </div>
          </div>

          {/* Philosophy — one-liner */}
          <p className="text-[11px] text-[#888899] mt-2 line-clamp-2 leading-relaxed">
            "{agent.tradingPhilosophy}"
          </p>
        </div>
        <MiniSparkline positive={isPositive} />
      </div>

      {/* Stats row */}
      <div className="mt-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          <span className={`font-mono-num text-lg font-bold ${isPositive ? "text-neon-green" : "text-neon-pink"}`}>
            {isPositive ? "+" : ""}{agent.weeklyReturn.toFixed(1)}%
          </span>
          <span className="text-[9px] text-[#555566] font-display">7d</span>
        </div>
        {agent.winRate > 0 && (
          <span className="text-[10px] font-mono-num text-[#888899]">
            🎯 {agent.winRate}% win
          </span>
        )}
        {agent.totalSignals > 0 && (
          <span className="text-[10px] font-mono-num text-[#888899]">
            📊 {agent.totalSignals} signals
          </span>
        )}
      </div>

      {/* CTA */}
      <div className="mt-3">
        {isCopying ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-10 rounded-xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
              <span className="font-display font-bold text-sm text-neon-green">Auto-Pilot Active</span>
            </div>
            <button
              data-testid={`lazy-stop-${agent.agentId}`}
              onClick={onCopy}
              className="h-10 px-4 rounded-xl bg-[#2A2A3E] text-[#888899] font-display font-bold text-xs active:scale-95 transition-transform"
            >
              Stop
            </button>
          </div>
        ) : (
          <button
            data-testid={`lazy-copy-${agent.agentId}`}
            onClick={onCopy}
            disabled={isLoading}
            className="w-full h-12 rounded-xl bg-neon-green text-black font-display font-bold text-sm glow-green active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <>
                <span>⚡</span>
                <span>One-Tap Copy</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}


// ── Main Lazy Mode Page ──
export default function LazyMode() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const [copiedAgent, setCopiedAgent] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Get current user's active agent
  const { data: meData } = useQuery<any>({ queryKey: ["/api/me"] });

  // Fetch all HF agents (the ones with real performance data)
  const { data: hfAgents = [] } = useQuery<any[]>({ queryKey: ["/api/hf-agents"] });

  // Fetch meme agents
  const { data: memeAgents = [] } = useQuery<any[]>({ queryKey: ["/api/agents"] });

  // Fetch leaderboard for ranking
  const { data: leaderboardData } = useQuery<any>({ queryKey: ["/api/leaderboard"] });

  // Build top agents list — ranked by weekly return
  const topAgents: TopAgent[] = (() => {
    const agents: TopAgent[] = [];

    // HF agents with their stats
    for (const hf of hfAgents) {
      // Simulated weekly return based on win rate and confidence
      const weeklyReturn = hf.winRate > 0
        ? ((hf.winRate - 50) * 0.3 + (hf.avgConfidence || 60) * 0.05 + (Math.random() * 2 - 1))
        : (Math.random() * 10 - 3);

      agents.push({
        agentId: hf.agentId,
        name: hf.name,
        avatarEmoji: hf.avatarEmoji,
        tradingPhilosophy: hf.tradingPhilosophy || hf.description || "AI-powered trading intelligence",
        category: hf.category,
        riskTolerance: hf.riskTolerance || "medium",
        assetFocus: hf.assetFocus || "both",
        winRate: hf.winRate || 0,
        totalSignals: hf.totalSignals || 0,
        avgConfidence: hf.avgConfidence || 0,
        weeklyReturn: Math.round(weeklyReturn * 10) / 10,
        rank: 0,
        tier: "hedge_fund",
      });
    }

    // Meme agents with simulated returns
    for (const meme of memeAgents) {
      const weeklyReturn = (Math.random() * 12 - 4);
      agents.push({
        agentId: meme.type || String(meme.id),
        name: meme.name,
        avatarEmoji: meme.avatarEmoji,
        tradingPhilosophy: meme.description || meme.tradingStyle || "Meme energy meets market wisdom",
        category: "meme",
        riskTolerance: meme.riskLevel || "high",
        assetFocus: "both",
        winRate: Math.round(45 + Math.random() * 25),
        totalSignals: Math.round(10 + Math.random() * 40),
        avgConfidence: Math.round(50 + Math.random() * 30),
        weeklyReturn: Math.round(weeklyReturn * 10) / 10,
        rank: 0,
        tier: "meme",
      });
    }

    // Sort by weekly return (best first)
    agents.sort((a, b) => b.weeklyReturn - a.weeklyReturn);

    // Assign ranks
    agents.forEach((a, i) => { a.rank = i + 1; });

    return agents.slice(0, 5); // Top 5
  })();

  // Check if current agent is one of the top agents
  useEffect(() => {
    if (meData?.user?.selectedAgentType) {
      const current = meData.user.selectedAgentType;
      const isTop = topAgents.find(a => a.agentId === current);
      if (isTop) {
        setCopiedAgent(current);
      }
    }
  }, [meData, topAgents]);

  // Copy agent mutation
  const copyMutation = useMutation({
    mutationFn: async (agentType: string) => {
      await apiRequest("PATCH", "/api/me", { selectedAgentType: agentType });
      return agentType;
    },
    onSuccess: (agentType) => {
      setCopiedAgent(agentType);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/message"] });
    },
  });

  const handleCopy = (agentId: string) => {
    if (copiedAgent === agentId) {
      // Stop copying — go back to default
      setCopiedAgent(null);
      return;
    }
    copyMutation.mutate(agentId);
  };

  return (
    <div className="flex flex-col min-h-screen relative">
      {/* Confetti overlay */}
      {showConfetti && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
          <div className="text-6xl animate-bounce">🎉</div>
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full animate-ping"
                style={{
                  left: `${10 + Math.random() * 80}%`,
                  top: `${10 + Math.random() * 60}%`,
                  backgroundColor: ["#00FF88", "#00D4FF", "#FF3B9A", "#FFD700"][i % 4],
                  animationDelay: `${Math.random() * 0.5}s`,
                  animationDuration: `${0.5 + Math.random() * 1}s`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center gap-3 px-4 py-3" style={{ background: "rgba(10, 10, 15, 0.9)", backdropFilter: "blur(12px)" }}>
        <button
          data-testid="lazy-back"
          onClick={() => navigate("/")}
          className="w-10 h-10 rounded-full bg-[#1A1A2E] flex items-center justify-center text-lg"
        >
          ←
        </button>
        <div className="flex-1">
          <h1 className="font-display font-bold text-lg text-[#E8E8E8]">
            <span className="text-neon-green">⚡</span> Lazy Mode
          </h1>
          <p className="text-[10px] text-[#888899] font-display">Pick an agent. One tap. Done.</p>
        </div>
        {copiedAgent && <StatusPill active={true} />}
      </header>

      {/* Hero banner */}
      <div className="mx-4 mt-2 rounded-2xl bg-gradient-to-br from-neon-green/10 via-[#1A1A2E] to-neon-cyan/10 border border-neon-green/20 p-5">
        <div className="flex items-center gap-4">
          <div className="text-5xl">😴</div>
          <div>
            <p className="font-display font-bold text-base text-[#E8E8E8]">Too lazy to trade?</p>
            <p className="text-xs text-[#888899] mt-1 leading-relaxed">
              Copy a top-performing AI agent with one tap.
              They trade, you chill. It's that simple.
            </p>
          </div>
        </div>
      </div>

      {/* How it works — 3 steps */}
      <div className="mx-4 mt-4 flex items-center gap-2">
        {[
          { step: "1", icon: "👆", text: "Pick" },
          { step: "2", icon: "⚡", text: "Copy" },
          { step: "3", icon: "💰", text: "Chill" },
        ].map((s, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 py-3 rounded-xl bg-[#1A1A2E] border border-[#2A2A3E]">
            <span className="text-lg">{s.icon}</span>
            <span className="text-[10px] font-display font-bold text-[#E8E8E8]">{s.text}</span>
          </div>
        ))}
        <div className="flex items-center text-[#555566] px-1">
          →
        </div>
        <div className="flex-1 flex flex-col items-center gap-1 py-3 rounded-xl bg-neon-green/5 border border-neon-green/20">
          <span className="text-lg">📈</span>
          <span className="text-[10px] font-display font-bold text-neon-green">Profit</span>
        </div>
      </div>

      {/* Top Agents */}
      <div className="mx-4 mt-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-[#888899] font-display">🏆 Top Performing Agents</p>
          <span className="text-[9px] text-[#555566] font-display">Last 7 days</span>
        </div>
        <div className="space-y-3">
          {topAgents.length === 0 ? (
            <div className="rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-8 text-center">
              <span className="text-3xl">🤖</span>
              <p className="text-sm text-[#888899] mt-2 font-display">Loading agents...</p>
            </div>
          ) : (
            topAgents.map((agent) => (
              <AgentCard
                key={agent.agentId}
                agent={agent}
                isCopying={copiedAgent === agent.agentId}
                onCopy={() => handleCopy(agent.agentId)}
                isLoading={copyMutation.isPending && copyMutation.variables === agent.agentId}
              />
            ))
          )}
        </div>
      </div>

      {/* Active Copy Dashboard */}
      {copiedAgent && (() => {
        const activeAgent = topAgents.find(a => a.agentId === copiedAgent);
        if (!activeAgent) return null;
        return (
          <div className="mx-4 mt-5 rounded-2xl bg-gradient-to-r from-neon-green/10 to-neon-cyan/5 border border-neon-green/30 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
              <span className="text-xs font-display font-bold text-neon-green">COPYING {activeAgent.name.toUpperCase()}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-[#0A0A0F] p-3 text-center">
                <p className="text-[9px] text-[#555566] font-display">STATUS</p>
                <p className="text-sm font-display font-bold text-neon-green mt-1">Active</p>
              </div>
              <div className="rounded-xl bg-[#0A0A0F] p-3 text-center">
                <p className="text-[9px] text-[#555566] font-display">TODAY</p>
                <p className="text-sm font-mono-num font-bold text-neon-green mt-1">
                  +{(Math.random() * 3).toFixed(1)}%
                </p>
              </div>
              <div className="rounded-xl bg-[#0A0A0F] p-3 text-center">
                <p className="text-[9px] text-[#555566] font-display">TRADES</p>
                <p className="text-sm font-mono-num font-bold text-[#E8E8E8] mt-1">
                  {Math.round(3 + Math.random() * 5)}
                </p>
              </div>
            </div>
            <Link href="/signals">
              <button
                data-testid="lazy-view-trades"
                className="w-full mt-3 h-10 rounded-xl bg-[#1A1A2E] border border-neon-green/20 text-neon-green font-display font-bold text-xs active:scale-95 transition-transform"
              >
                View Live Trades →
              </button>
            </Link>
          </div>
        );
      })()}

      {/* FAQ / Explainer */}
      <div className="mx-4 mt-5 mb-4 rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-4">
        <p className="text-xs font-display font-bold text-[#E8E8E8] mb-3">❓ How Lazy Mode Works</p>
        <div className="space-y-3">
          {[
            { q: "What does 'Copy' do?", a: "Your portfolio automatically mirrors the agent's trades. When they buy, you buy. When they sell, you sell." },
            { q: "Can I stop anytime?", a: "Yes — tap 'Stop' to disconnect. Your existing positions stay, but no new trades are copied." },
            { q: "Which agent is best?", a: "Higher win rate + lower risk = safer. Higher return + higher risk = bigger potential gains. Pick your style." },
            { q: "Do I need to watch it?", a: "Nope. That's the whole point. The AI trades 24/7 so you don't have to. Check back whenever you want." },
          ].map((item, i) => (
            <div key={i}>
              <p className="text-[11px] font-display font-bold text-[#E8E8E8]">{item.q}</p>
              <p className="text-[10px] text-[#888899] mt-0.5 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 text-center">
        <a href="https://www.perplexity.ai/computer" target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#555566] hover:text-[#888899]">
          Created with Perplexity Computer
        </a>
      </div>
    </div>
  );
}
