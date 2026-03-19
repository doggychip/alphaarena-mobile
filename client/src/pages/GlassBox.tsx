import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

// Types from API
type FactorProfile = {
  fundamental: number;
  technical: number;
  sentiment: number;
  macro: number;
  valuation: number;
};

type AgentSummary = {
  agentId: string;
  agentName: string;
  agentEmoji: string;
  category: string;
  totalSignals: number;
  accuracy: number;
  avgConfidence: number;
  factorProfile: FactorProfile;
  latestSignal: {
    ticker: string;
    signal: string;
    confidence: number;
    predictedAt: string;
  } | null;
};

type RecentActivity = {
  signalId: number;
  agentId: string;
  agentName: string;
  agentEmoji: string;
  ticker: string;
  signal: string;
  confidence: number;
  summary: string;
  isCorrect: boolean | null;
  pnlPercent: number | null;
  predictedAt: string;
};

type DashboardData = {
  overview: {
    totalSignals: number;
    overallAccuracy: number;
    avgConfidence: number;
    bullish: number;
    bearish: number;
    neutral: number;
  };
  audit: {
    resolved: number;
    correct: number;
    incorrect: number;
    pending: number;
    avgPnl: number;
  };
  agentSummaries: AgentSummary[];
  recentActivity: RecentActivity[];
};

type Factor = { name: string; weight: number; impact: string; detail: string };
type DecisionStep = { step: number; label: string; input: string; output: string; reasoning: string };

type SignalDetail = {
  signalId: number;
  agentId: string;
  agentName: string;
  agentEmoji: string;
  agentCategory: string;
  ticker: string;
  signal: string;
  confidence: number;
  summary: string;
  factors: Factor[];
  decisionFlow: DecisionStep[];
  scores: FactorProfile;
  predictedAt: string;
  resolvedAt: string | null;
  actualPrice: number | null;
  isCorrect: boolean | null;
  pnlPercent: number | null;
};

type AgentProfile = {
  agentId: string;
  agentName: string;
  agentEmoji: string;
  category: string;
  description: string;
  tradingPhilosophy: string;
  totalSignals: number;
  accuracy: number;
  avgConfidence: number;
  factorProfile: FactorProfile;
  auditTrail: { total: number; correct: number; incorrect: number; pending: number; avgPnl: number };
  recentSignals: any[];
};

// Tabs
type Tab = "dashboard" | "agents" | "audit";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function SignalBadge({ signal }: { signal: string }) {
  const colors: Record<string, string> = {
    bullish: "bg-[#00FF88]/15 text-[#00FF88] border-[#00FF88]/30",
    bearish: "bg-[#FF3B9A]/15 text-[#FF3B9A] border-[#FF3B9A]/30",
    neutral: "bg-[#FFD700]/15 text-[#FFD700] border-[#FFD700]/30",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${colors[signal] || colors.neutral}`}>
      {signal}
    </span>
  );
}

function FactorBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-[#888899] w-20 text-right font-medium">{label}</span>
      <div className="flex-1 h-2 bg-[#1A1A2E] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(100, value)}%`, background: color }}
        />
      </div>
      <span className="text-[10px] font-mono text-[#E8E8E8] w-8">{value}</span>
    </div>
  );
}

function RadarChart({ scores }: { scores: FactorProfile }) {
  // Simple radar chart as SVG
  const labels = ["Fund.", "Tech.", "Sent.", "Macro", "Val."];
  const values = [scores.fundamental, scores.technical, scores.sentiment, scores.macro, scores.valuation];
  const cx = 60, cy = 60, r = 45;
  const angles = values.map((_, i) => (Math.PI * 2 * i) / values.length - Math.PI / 2);
  
  const pointsMax = angles.map((a) => `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`).join(" ");
  const points = angles.map((a, i) => {
    const vr = (values[i] / 100) * r;
    return `${cx + vr * Math.cos(a)},${cy + vr * Math.sin(a)}`;
  }).join(" ");

  return (
    <svg viewBox="0 0 120 120" className="w-full max-w-[160px] mx-auto">
      {/* Grid rings */}
      {[0.25, 0.5, 0.75, 1].map((s) => (
        <polygon
          key={s}
          points={angles.map(a => `${cx + r * s * Math.cos(a)},${cy + r * s * Math.sin(a)}`).join(" ")}
          fill="none"
          stroke="#2A2A3E"
          strokeWidth="0.5"
        />
      ))}
      {/* Axis lines */}
      {angles.map((a, i) => (
        <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)} stroke="#2A2A3E" strokeWidth="0.5" />
      ))}
      {/* Data polygon */}
      <polygon points={points} fill="rgba(0, 212, 255, 0.15)" stroke="#00D4FF" strokeWidth="1.5" />
      {/* Data points */}
      {angles.map((a, i) => {
        const vr = (values[i] / 100) * r;
        return <circle key={i} cx={cx + vr * Math.cos(a)} cy={cy + vr * Math.sin(a)} r="2.5" fill="#00D4FF" />;
      })}
      {/* Labels */}
      {angles.map((a, i) => {
        const lr = r + 12;
        return (
          <text
            key={i}
            x={cx + lr * Math.cos(a)}
            y={cy + lr * Math.sin(a)}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-[#888899]"
            fontSize="7"
            fontWeight="600"
          >
            {labels[i]}
          </text>
        );
      })}
    </svg>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-[#12121E] border border-[#2A2A3E] rounded-xl p-3 text-center">
      <div className={`text-xl font-bold font-mono ${color || "text-[#E8E8E8]"}`}>{value}</div>
      <div className="text-[10px] text-[#888899] font-medium mt-0.5">{label}</div>
      {sub && <div className="text-[9px] text-[#666677] mt-0.5">{sub}</div>}
    </div>
  );
}

// ===========================================
// DASHBOARD TAB
// ===========================================
function DashboardView({ data }: { data: DashboardData }) {
  const [selectedSignalId, setSelectedSignalId] = useState<number | null>(null);
  const o = data.overview;
  const a = data.audit;
  const total = o.bullish + o.bearish + o.neutral || 1;

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Total Signals" value={o.totalSignals} color="text-[#00D4FF]" />
        <StatCard label="Accuracy" value={`${o.overallAccuracy}%`} color={o.overallAccuracy >= 55 ? "text-[#00FF88]" : "text-[#FF3B9A]"} />
        <StatCard label="Avg Confidence" value={`${o.avgConfidence}%`} color="text-[#FFD700]" />
      </div>

      {/* Signal Distribution Bar */}
      <div className="bg-[#12121E] border border-[#2A2A3E] rounded-xl p-3">
        <div className="text-[10px] text-[#888899] font-display font-semibold tracking-wider mb-2">SIGNAL DISTRIBUTION</div>
        <div className="flex h-3 rounded-full overflow-hidden bg-[#1A1A2E]">
          <div className="bg-[#00FF88] transition-all" style={{ width: `${(o.bullish / total) * 100}%` }} />
          <div className="bg-[#FFD700] transition-all" style={{ width: `${(o.neutral / total) * 100}%` }} />
          <div className="bg-[#FF3B9A] transition-all" style={{ width: `${(o.bearish / total) * 100}%` }} />
        </div>
        <div className="flex justify-between mt-1.5 text-[9px]">
          <span className="text-[#00FF88]">Bullish {o.bullish} ({Math.round((o.bullish / total) * 100)}%)</span>
          <span className="text-[#FFD700]">Neutral {o.neutral}</span>
          <span className="text-[#FF3B9A]">Bearish {o.bearish}</span>
        </div>
      </div>

      {/* Audit Summary */}
      <div className="bg-[#12121E] border border-[#2A2A3E] rounded-xl p-3">
        <div className="text-[10px] text-[#888899] font-display font-semibold tracking-wider mb-2">PREDICTION AUDIT</div>
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center">
            <div className="text-sm font-bold text-[#00FF88] font-mono">{a.correct}</div>
            <div className="text-[9px] text-[#888899]">Correct</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-[#FF3B9A] font-mono">{a.incorrect}</div>
            <div className="text-[9px] text-[#888899]">Wrong</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-[#FFD700] font-mono">{a.pending}</div>
            <div className="text-[9px] text-[#888899]">Pending</div>
          </div>
          <div className="text-center">
            <div className={`text-sm font-bold font-mono ${a.avgPnl >= 0 ? "text-[#00FF88]" : "text-[#FF3B9A]"}`}>{a.avgPnl >= 0 ? "+" : ""}{a.avgPnl}%</div>
            <div className="text-[9px] text-[#888899]">Avg PnL</div>
          </div>
        </div>
      </div>

      {/* Live Activity Feed */}
      <div>
        <div className="text-[10px] text-[#888899] font-display font-semibold tracking-wider mb-2 px-1">LIVE DECISIONS</div>
        <div className="space-y-1.5">
          {data.recentActivity.map((act) => (
            <button
              key={act.signalId}
              onClick={() => setSelectedSignalId(act.signalId === selectedSignalId ? null : act.signalId)}
              className="w-full bg-[#12121E] border border-[#2A2A3E] rounded-xl p-3 text-left hover:border-[#00D4FF]/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{act.agentEmoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#E8E8E8] truncate">{act.agentName}</span>
                    <SignalBadge signal={act.signal} />
                    <span className="text-xs font-mono text-[#00D4FF]">{act.ticker}</span>
                  </div>
                  <div className="text-[10px] text-[#888899] truncate mt-0.5">{act.summary}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs font-mono text-[#E8E8E8]">{act.confidence}%</div>
                  {act.isCorrect !== null && (
                    <div className={`text-[10px] font-mono ${act.isCorrect ? "text-[#00FF88]" : "text-[#FF3B9A]"}`}>
                      {act.isCorrect ? "✓" : "✗"} {act.pnlPercent !== null ? `${act.pnlPercent > 0 ? "+" : ""}${act.pnlPercent}%` : ""}
                    </div>
                  )}
                  {act.isCorrect === null && <div className="text-[10px] text-[#FFD700]">⏳ pending</div>}
                </div>
              </div>

              {/* Expanded signal detail */}
              {selectedSignalId === act.signalId && (
                <SignalDetailInline signalId={act.signalId} />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Inline signal detail component (loads on click)
function SignalDetailInline({ signalId }: { signalId: number }) {
  const { data, isLoading } = useQuery<SignalDetail>({
    queryKey: ["/api/glassbox/signal", signalId],
    queryFn: async () => {
      const res = await fetch(`/api/glassbox/signal/${signalId}`);
      if (!res.ok) throw new Error("Failed to load signal detail");
      return res.json();
    },
  });

  if (isLoading) return <div className="mt-3 text-center text-[10px] text-[#888899] animate-pulse">Loading reasoning chain...</div>;
  if (!data) return null;

  return (
    <div className="mt-3 pt-3 border-t border-[#2A2A3E] space-y-3" onClick={(e) => e.stopPropagation()}>
      {/* Factor Scores */}
      <div>
        <div className="text-[9px] text-[#888899] font-display font-semibold tracking-wider mb-1.5">FACTOR WEIGHTS</div>
        <div className="space-y-1.5">
          <FactorBar label="Fundamental" value={data.scores.fundamental} color="#00FF88" />
          <FactorBar label="Technical" value={data.scores.technical} color="#00D4FF" />
          <FactorBar label="Sentiment" value={data.scores.sentiment} color="#FFD700" />
          <FactorBar label="Macro" value={data.scores.macro} color="#FF3B9A" />
          <FactorBar label="Valuation" value={data.scores.valuation} color="#9B59B6" />
        </div>
      </div>

      {/* Decision Flow */}
      <div>
        <div className="text-[9px] text-[#888899] font-display font-semibold tracking-wider mb-1.5">DECISION FLOW</div>
        <div className="relative pl-4">
          {data.decisionFlow.map((step, i) => (
            <div key={i} className="relative pb-3 last:pb-0">
              {i < data.decisionFlow.length - 1 && (
                <div className="absolute left-[-10px] top-3 w-[1px] h-full bg-[#2A2A3E]" />
              )}
              <div className="absolute left-[-13px] top-1 w-[7px] h-[7px] rounded-full bg-[#00D4FF] border border-[#0A0A0F]" />
              <div className="text-[10px] font-bold text-[#00D4FF]">Step {step.step}: {step.label}</div>
              <div className="text-[9px] text-[#888899] mt-0.5">{step.reasoning}</div>
              <div className="text-[9px] text-[#666677] mt-0.5">{step.input} → {step.output}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Factors Detail */}
      {data.factors.length > 0 && (
        <div>
          <div className="text-[9px] text-[#888899] font-display font-semibold tracking-wider mb-1.5">ANALYSIS FACTORS</div>
          <div className="space-y-1">
            {data.factors.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px]">
                <span className={`w-1.5 h-1.5 rounded-full ${f.impact === "positive" ? "bg-[#00FF88]" : f.impact === "negative" ? "bg-[#FF3B9A]" : "bg-[#FFD700]"}`} />
                <span className="text-[#E8E8E8] font-medium">{f.name}</span>
                <span className="text-[#666677] flex-1 truncate">— {f.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audit Result */}
      {data.isCorrect !== null && (
        <div className={`rounded-lg p-2 text-center text-[10px] font-bold ${data.isCorrect ? "bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/20" : "bg-[#FF3B9A]/10 text-[#FF3B9A] border border-[#FF3B9A]/20"}`}>
          {data.isCorrect ? "PREDICTION CORRECT" : "PREDICTION INCORRECT"} — PnL: {data.pnlPercent !== null ? `${data.pnlPercent > 0 ? "+" : ""}${data.pnlPercent}%` : "N/A"}
        </div>
      )}
    </div>
  );
}

// ===========================================
// AGENTS TAB
// ===========================================
function AgentsView({ data }: { data: DashboardData }) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const categories = ["all", "persona", "specialist", "management"];
  const filtered = categoryFilter === "all" 
    ? data.agentSummaries 
    : data.agentSummaries.filter(a => a.category === categoryFilter);

  return (
    <div className="space-y-3">
      {/* Category filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-display font-bold tracking-wider whitespace-nowrap transition-all ${
              categoryFilter === cat
                ? "bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/40"
                : "bg-[#1A1A2E] text-[#888899] border border-[#2A2A3E]"
            }`}
          >
            {cat.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Agent cards */}
      <div className="space-y-2">
        {filtered.map((agent) => (
          <div key={agent.agentId}>
            <button
              onClick={() => setSelectedAgent(agent.agentId === selectedAgent ? null : agent.agentId)}
              className="w-full bg-[#12121E] border border-[#2A2A3E] rounded-xl p-3 text-left hover:border-[#00D4FF]/40 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{agent.agentEmoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#E8E8E8]">{agent.agentName}</span>
                    <span className="text-[9px] text-[#666677] bg-[#1A1A2E] px-1.5 py-0.5 rounded uppercase tracking-wider">{agent.category}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[10px]">
                    <span className="text-[#888899]">{agent.totalSignals} signals</span>
                    <span className={agent.accuracy >= 55 ? "text-[#00FF88]" : "text-[#FF3B9A]"}>{agent.accuracy}% acc</span>
                    <span className="text-[#FFD700]">{agent.avgConfidence}% conf</span>
                  </div>
                </div>
                <div className="text-right">
                  {agent.latestSignal && (
                    <>
                      <SignalBadge signal={agent.latestSignal.signal} />
                      <div className="text-[9px] text-[#666677] mt-1">{agent.latestSignal.ticker}</div>
                    </>
                  )}
                </div>
              </div>

              {/* Factor profile mini-bars */}
              <div className="mt-2 flex gap-1">
                {Object.entries(agent.factorProfile).map(([key, val]) => (
                  <div key={key} className="flex-1">
                    <div className="h-1 bg-[#1A1A2E] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, val)}%`,
                          background: key === "fundamental" ? "#00FF88" : key === "technical" ? "#00D4FF" : key === "sentiment" ? "#FFD700" : key === "macro" ? "#FF3B9A" : "#9B59B6",
                        }}
                      />
                    </div>
                    <div className="text-[7px] text-[#666677] text-center mt-0.5">{key.slice(0, 4)}</div>
                  </div>
                ))}
              </div>
            </button>

            {/* Expanded agent detail */}
            {selectedAgent === agent.agentId && (
              <AgentDetailInline agentId={agent.agentId} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AgentDetailInline({ agentId }: { agentId: string }) {
  const { data, isLoading } = useQuery<AgentProfile>({
    queryKey: ["/api/glassbox/agent", agentId],
    queryFn: async () => {
      const res = await fetch(`/api/glassbox/agent/${agentId}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  if (isLoading) return <div className="p-4 text-center text-[10px] text-[#888899] animate-pulse">Loading agent profile...</div>;
  if (!data) return null;

  const at = data.auditTrail;

  return (
    <div className="bg-[#0E0E1A] border border-[#2A2A3E] border-t-0 rounded-b-xl p-3 space-y-3 -mt-1">
      {/* Description */}
      <div className="text-[10px] text-[#888899]">{data.description}</div>
      <div className="text-[10px] text-[#00D4FF] italic">"{data.tradingPhilosophy}"</div>

      {/* Radar chart */}
      <div>
        <div className="text-[9px] text-[#888899] font-display font-semibold tracking-wider mb-1">FACTOR RADAR</div>
        <RadarChart scores={data.factorProfile} />
      </div>

      {/* Audit trail */}
      <div>
        <div className="text-[9px] text-[#888899] font-display font-semibold tracking-wider mb-1.5">AUDIT TRAIL</div>
        <div className="grid grid-cols-5 gap-1.5">
          <div className="bg-[#1A1A2E] rounded-lg p-2 text-center">
            <div className="text-xs font-bold text-[#E8E8E8] font-mono">{at.total}</div>
            <div className="text-[8px] text-[#666677]">Total</div>
          </div>
          <div className="bg-[#1A1A2E] rounded-lg p-2 text-center">
            <div className="text-xs font-bold text-[#00FF88] font-mono">{at.correct}</div>
            <div className="text-[8px] text-[#666677]">Hit</div>
          </div>
          <div className="bg-[#1A1A2E] rounded-lg p-2 text-center">
            <div className="text-xs font-bold text-[#FF3B9A] font-mono">{at.incorrect}</div>
            <div className="text-[8px] text-[#666677]">Miss</div>
          </div>
          <div className="bg-[#1A1A2E] rounded-lg p-2 text-center">
            <div className="text-xs font-bold text-[#FFD700] font-mono">{at.pending}</div>
            <div className="text-[8px] text-[#666677]">Open</div>
          </div>
          <div className="bg-[#1A1A2E] rounded-lg p-2 text-center">
            <div className={`text-xs font-bold font-mono ${at.avgPnl >= 0 ? "text-[#00FF88]" : "text-[#FF3B9A]"}`}>{at.avgPnl >= 0 ? "+" : ""}{at.avgPnl}%</div>
            <div className="text-[8px] text-[#666677]">PnL</div>
          </div>
        </div>
      </div>

      {/* Recent signals timeline */}
      <div>
        <div className="text-[9px] text-[#888899] font-display font-semibold tracking-wider mb-1.5">RECENT PREDICTIONS</div>
        <div className="space-y-1">
          {data.recentSignals.slice(0, 8).map((s: any, i: number) => (
            <div key={i} className="flex items-center gap-2 text-[10px] py-1 border-b border-[#1A1A2E] last:border-0">
              <span className="font-mono text-[#00D4FF] w-10">{s.ticker}</span>
              <SignalBadge signal={s.signal} />
              <span className="text-[#888899] font-mono">{s.confidence}%</span>
              <span className="flex-1" />
              {s.isCorrect !== null ? (
                <span className={`font-mono ${s.isCorrect ? "text-[#00FF88]" : "text-[#FF3B9A]"}`}>
                  {s.isCorrect ? "✓" : "✗"} {s.pnlPercent !== null ? `${s.pnlPercent > 0 ? "+" : ""}${s.pnlPercent}%` : ""}
                </span>
              ) : (
                <span className="text-[#FFD700]">⏳</span>
              )}
              <span className="text-[#666677] text-[9px]">{timeAgo(s.predictedAt)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===========================================
// AUDIT TAB
// ===========================================
function AuditView({ data }: { data: DashboardData }) {
  const a = data.audit;
  const totalResolved = a.correct + a.incorrect || 1;

  // Collect all signals that are resolved for the timeline
  const resolvedSignals = data.recentActivity.filter(s => s.isCorrect !== null);
  const pendingSignals = data.recentActivity.filter(s => s.isCorrect === null);

  return (
    <div className="space-y-4">
      {/* Big accuracy ring */}
      <div className="bg-[#12121E] border border-[#2A2A3E] rounded-xl p-4 flex items-center gap-4">
        <div className="relative w-24 h-24 flex-shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#1A1A2E" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="42"
              fill="none" stroke="#00FF88" strokeWidth="8"
              strokeDasharray={`${(a.correct / totalResolved) * 264} 264`}
              strokeLinecap="round"
            />
            <circle
              cx="50" cy="50" r="42"
              fill="none" stroke="#FF3B9A" strokeWidth="8"
              strokeDasharray={`${(a.incorrect / totalResolved) * 264} 264`}
              strokeDashoffset={`-${(a.correct / totalResolved) * 264}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-lg font-bold text-[#E8E8E8] font-mono">{data.overview.overallAccuracy}%</div>
              <div className="text-[8px] text-[#888899]">ACCURACY</div>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00FF88]" />
            <span className="text-xs text-[#E8E8E8]">{a.correct} Correct</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF3B9A]" />
            <span className="text-xs text-[#E8E8E8]">{a.incorrect} Incorrect</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFD700]" />
            <span className="text-xs text-[#E8E8E8]">{a.pending} Pending</span>
          </div>
          <div className={`text-xs font-mono ${a.avgPnl >= 0 ? "text-[#00FF88]" : "text-[#FF3B9A]"}`}>
            Avg PnL: {a.avgPnl >= 0 ? "+" : ""}{a.avgPnl}%
          </div>
        </div>
      </div>

      {/* Agent accuracy leaderboard */}
      <div>
        <div className="text-[10px] text-[#888899] font-display font-semibold tracking-wider mb-2 px-1">AGENT ACCURACY RANKING</div>
        <div className="space-y-1">
          {data.agentSummaries.filter(a => a.totalSignals > 0).slice(0, 15).map((agent, i) => (
            <div key={agent.agentId} className="flex items-center gap-2 bg-[#12121E] border border-[#2A2A3E] rounded-lg px-3 py-2">
              <span className="text-[10px] text-[#666677] font-mono w-5">#{i + 1}</span>
              <span className="text-sm">{agent.agentEmoji}</span>
              <span className="text-[11px] text-[#E8E8E8] font-medium flex-1 truncate">{agent.agentName}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#888899] font-mono">{agent.totalSignals}sig</span>
                <span className={`text-xs font-bold font-mono ${agent.accuracy >= 55 ? "text-[#00FF88]" : agent.accuracy >= 45 ? "text-[#FFD700]" : "text-[#FF3B9A]"}`}>
                  {agent.accuracy}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hit/Miss Timeline */}
      <div>
        <div className="text-[10px] text-[#888899] font-display font-semibold tracking-wider mb-2 px-1">RESOLVED PREDICTIONS</div>
        <div className="space-y-1">
          {resolvedSignals.map((s) => (
            <div key={s.signalId} className="flex items-center gap-2 bg-[#12121E] border border-[#2A2A3E] rounded-lg px-3 py-2">
              <span className={`w-2 h-2 rounded-full ${s.isCorrect ? "bg-[#00FF88]" : "bg-[#FF3B9A]"}`} />
              <span className="text-sm">{s.agentEmoji}</span>
              <span className="text-[10px] text-[#E8E8E8] truncate flex-1">{s.agentName}</span>
              <span className="text-[10px] font-mono text-[#00D4FF]">{s.ticker}</span>
              <SignalBadge signal={s.signal} />
              <span className={`text-[10px] font-mono ${s.pnlPercent && s.pnlPercent >= 0 ? "text-[#00FF88]" : "text-[#FF3B9A]"}`}>
                {s.pnlPercent !== null ? `${s.pnlPercent > 0 ? "+" : ""}${s.pnlPercent}%` : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Pending */}
      {pendingSignals.length > 0 && (
        <div>
          <div className="text-[10px] text-[#888899] font-display font-semibold tracking-wider mb-2 px-1">AWAITING RESOLUTION</div>
          <div className="space-y-1">
            {pendingSignals.map((s) => (
              <div key={s.signalId} className="flex items-center gap-2 bg-[#12121E] border border-[#2A2A3E] rounded-lg px-3 py-2 opacity-70">
                <span className="w-2 h-2 rounded-full bg-[#FFD700] animate-pulse" />
                <span className="text-sm">{s.agentEmoji}</span>
                <span className="text-[10px] text-[#E8E8E8] truncate flex-1">{s.agentName}</span>
                <span className="text-[10px] font-mono text-[#00D4FF]">{s.ticker}</span>
                <SignalBadge signal={s.signal} />
                <span className="text-[9px] text-[#666677]">{timeAgo(s.predictedAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ===========================================
// MAIN GLASS BOX PAGE
// ===========================================
export default function GlassBox() {
  const [tab, setTab] = useState<Tab>("dashboard");

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ["/api/glassbox/dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/glassbox/dashboard");
      if (!res.ok) throw new Error("Failed to load Glass Box dashboard");
      return res.json();
    },
    refetchInterval: 30000, // Auto-refresh every 30s
  });

  const tabs: { key: Tab; label: string; emoji: string }[] = [
    { key: "dashboard", label: "Live Feed", emoji: "📡" },
    { key: "agents", label: "Agent X-Ray", emoji: "🔬" },
    { key: "audit", label: "Audit Trail", emoji: "📊" },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0A0A0F]/90 backdrop-blur-xl border-b border-[#2A2A3E]">
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <Link href="/">
              <button className="text-[#888899] hover:text-[#E8E8E8] transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
            </Link>
            <div>
              <h1 className="text-lg font-display font-bold text-[#E8E8E8] tracking-wide flex items-center gap-2">
                <span className="text-xl">🔍</span> Glass Box
              </h1>
              <p className="text-[10px] text-[#888899]">Full transparency into AI agent decisions</p>
            </div>
            {/* Live indicator */}
            <div className="ml-auto flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00FF88] animate-pulse" />
              <span className="text-[9px] text-[#00FF88] font-display font-semibold tracking-wider">LIVE</span>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 mt-3">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 py-2 rounded-lg text-[10px] font-display font-bold tracking-wider transition-all ${
                  tab === t.key
                    ? "bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/30"
                    : "bg-[#1A1A2E] text-[#888899] border border-transparent"
                }`}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-3xl animate-pulse mb-3">🔍</div>
            <div className="text-[10px] text-[#888899] font-display tracking-wider animate-pulse">LOADING GLASS BOX...</div>
          </div>
        )}

        {error && (
          <div className="text-center py-16">
            <div className="text-2xl mb-2">⚠️</div>
            <div className="text-xs text-[#FF3B9A]">Failed to load Glass Box data</div>
          </div>
        )}

        {data && (
          <>
            {tab === "dashboard" && <DashboardView data={data} />}
            {tab === "agents" && <AgentsView data={data} />}
            {tab === "audit" && <AuditView data={data} />}
          </>
        )}
      </div>
    </div>
  );
}
