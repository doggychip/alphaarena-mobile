import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

// ── Types ───────────────────────────────────────────────────────────────

type ScreenResult = {
  ticker: string;
  signal: "bullish" | "bearish" | "neutral";
  score: number;
  thesis: string;
  keyMetrics: { label: string; value: string; trend: "up" | "down" | "flat" }[];
  risks: string[];
};

type ThesisResult = {
  ticker: string;
  direction: "long" | "short";
  thesis: string;
  pillars: { pillar: string; status: string; trend: "strong" | "watch" | "weak" }[];
  risks: string[];
  catalysts: { event: string; date: string; impact: "high" | "medium" | "low" }[];
  conviction: "high" | "medium" | "low";
  priceTarget?: string;
  stopLoss?: string;
};

type MorningNote = {
  date: string;
  topCall: { headline: string; detail: string; impact: string };
  marketOverview: { asset: string; price: string; change: string; signal: string }[];
  tradeIdeas: { ticker: string; direction: string; thesis: string; risk: string }[];
  keyEvents: { time: string; event: string; impact: string }[];
};

// ── Shared Components ───────────────────────────────────────────────────

function SignalDot({ signal }: { signal: string }) {
  const s = (signal || "neutral").toLowerCase();
  const color = s === "bullish" ? "#00FF88" : s === "bearish" ? "#FF3B9A" : "#888899";
  return <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: color }} />;
}

function SectionHeader({ emoji, label }: { emoji: string; label: string }) {
  return (
    <p className="text-xs font-display font-bold text-[#888899] mb-3 uppercase tracking-wider">
      {emoji} {label}
    </p>
  );
}

function PillSelector<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: { value: T; label: string; emoji?: string }[];
  selected: T;
  onSelect: (v: T) => void;
}) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onSelect(o.value)}
          className={`px-3 py-1.5 rounded-full text-[11px] font-display font-bold transition-all ${
            selected === o.value
              ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40"
              : "bg-[#1A1A2E] text-[#888899] border border-[#2A2A3E]"
          }`}
        >
          {o.emoji ? `${o.emoji} ` : ""}{o.label}
        </button>
      ))}
    </div>
  );
}

// ── Tab: Screen ─────────────────────────────────────────────────────────

function ScreenTab() {
  const [direction, setDirection] = useState<"long" | "short" | "both">("both");
  const [style, setStyle] = useState<"value" | "growth" | "quality" | "momentum" | "contrarian">("growth");
  const [assetClass, setAssetClass] = useState<"crypto" | "equity" | "both">("crypto");
  const [theme, setTheme] = useState("");

  const screenMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/research/screen", {
        direction, style, assetClass, theme: theme || undefined,
      });
      return res.json();
    },
  });

  const results: ScreenResult[] = screenMutation.data?.results || [];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-[#1A1A2E] to-[#0F0F1A] border border-[#2A2A3E] p-4 space-y-3">
        <SectionHeader emoji="🎯" label="Screen Parameters" />

        <div>
          <p className="text-[10px] text-[#555566] font-display mb-1.5">Direction</p>
          <PillSelector
            options={[
              { value: "long" as const, label: "Long", emoji: "📈" },
              { value: "short" as const, label: "Short", emoji: "📉" },
              { value: "both" as const, label: "Both", emoji: "⚖️" },
            ]}
            selected={direction}
            onSelect={setDirection}
          />
        </div>

        <div>
          <p className="text-[10px] text-[#555566] font-display mb-1.5">Style</p>
          <PillSelector
            options={[
              { value: "growth" as const, label: "Growth", emoji: "🚀" },
              { value: "value" as const, label: "Value", emoji: "💎" },
              { value: "quality" as const, label: "Quality", emoji: "✨" },
              { value: "momentum" as const, label: "Momentum", emoji: "⚡" },
              { value: "contrarian" as const, label: "Contrarian", emoji: "🔄" },
            ]}
            selected={style}
            onSelect={setStyle}
          />
        </div>

        <div>
          <p className="text-[10px] text-[#555566] font-display mb-1.5">Asset Class</p>
          <PillSelector
            options={[
              { value: "crypto" as const, label: "Crypto", emoji: "₿" },
              { value: "equity" as const, label: "Equities", emoji: "📊" },
              { value: "both" as const, label: "Both", emoji: "🌐" },
            ]}
            selected={assetClass}
            onSelect={setAssetClass}
          />
        </div>

        <div>
          <p className="text-[10px] text-[#555566] font-display mb-1.5">Theme (optional)</p>
          <input
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="e.g. AI infrastructure, DeFi, meme coins..."
            className="w-full bg-[#0A0A0F] border border-[#2A2A3E] rounded-xl px-3 py-2 text-xs text-[#E8E8E8] placeholder:text-[#555566] outline-none focus:border-neon-cyan/50"
          />
        </div>

        <button
          onClick={() => screenMutation.mutate()}
          disabled={screenMutation.isPending}
          className="w-full py-3 rounded-xl font-display font-bold text-sm bg-gradient-to-r from-[#00D4FF] to-[#00FF88] text-black transition-all active:scale-95 disabled:opacity-50"
        >
          {screenMutation.isPending ? "🔍 Screening..." : "🔍 Run Screen"}
        </button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          <SectionHeader emoji="📋" label="Screen Results" />
          {results.map((r, i) => (
            <ScreenResultCard key={i} result={r} rank={i + 1} />
          ))}
        </div>
      )}

      {screenMutation.isError && (
        <div className="rounded-xl bg-neon-pink/10 border border-neon-pink/30 px-3 py-2">
          <p className="text-xs text-neon-pink font-display">
            {(screenMutation.error as Error)?.message || "Screen failed — is DEEPSEEK_API_KEY set?"}
          </p>
        </div>
      )}
    </div>
  );
}

function ScreenResultCard({ result, rank }: { result: ScreenResult; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const sig = (result.signal || "neutral").toLowerCase();
  const borderColor = sig === "bullish" ? "border-[#00FF88]/25" : sig === "bearish" ? "border-neon-pink/25" : "border-[#2A2A3E]";

  return (
    <div className={`rounded-2xl bg-[#1A1A2E] border ${borderColor} overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 text-left active:bg-[#1E1E32] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-[#0A0A0F] flex items-center justify-center text-xs font-mono-num font-bold text-[#888899]">
            #{rank}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-sm text-[#E8E8E8]">{result.ticker}</span>
              <SignalDot signal={result.signal} />
              <span className={`text-[10px] font-display font-bold uppercase ${
                sig === "bullish" ? "text-[#00FF88]" : sig === "bearish" ? "text-neon-pink" : "text-[#888899]"
              }`}>{result.signal}</span>
            </div>
            <p className="text-[10px] text-[#888899] truncate mt-0.5">{result.thesis}</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-mono-num font-bold" style={{
              color: result.score >= 70 ? "#00FF88" : result.score >= 50 ? "#FFD700" : "#FF3B9A"
            }}>{result.score}</div>
            <p className="text-[9px] text-[#555566]">score</p>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-[#2A2A3E] pt-2">
          {result.keyMetrics?.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {result.keyMetrics.map((m, i) => (
                <div key={i} className="bg-[#0A0A0F] rounded-lg px-2 py-1">
                  <p className="text-[9px] text-[#555566]">{m.label}</p>
                  <p className={`text-[11px] font-mono-num font-bold ${
                    m.trend === "up" ? "text-[#00FF88]" : m.trend === "down" ? "text-neon-pink" : "text-[#888899]"
                  }`}>{m.value}</p>
                </div>
              ))}
            </div>
          )}
          {result.risks?.length > 0 && (
            <div>
              <p className="text-[9px] text-[#555566] font-display mb-1">Risks</p>
              {result.risks.map((r, i) => (
                <p key={i} className="text-[10px] text-neon-pink/80 leading-relaxed">⚠️ {r}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tab: Thesis ─────────────────────────────────────────────────────────

function ThesisTab() {
  const [ticker, setTicker] = useState("BTC");
  const [direction, setDirection] = useState<"long" | "short">("long");

  const thesisMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/research/thesis", { ticker, direction });
      return res.json();
    },
  });

  const thesis: ThesisResult | null = thesisMutation.data || null;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-[#1A1A2E] to-[#0F0F1A] border border-[#2A2A3E] p-4 space-y-3">
        <SectionHeader emoji="📝" label="Build Thesis" />

        <div className="flex gap-2">
          <input
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="BTC"
            className="flex-1 bg-[#0A0A0F] border border-[#2A2A3E] rounded-xl px-3 py-2.5 text-sm font-display font-bold text-[#E8E8E8] outline-none focus:border-neon-cyan/50"
          />
          <PillSelector
            options={[
              { value: "long" as const, label: "Long", emoji: "📈" },
              { value: "short" as const, label: "Short", emoji: "📉" },
            ]}
            selected={direction}
            onSelect={setDirection}
          />
        </div>

        <button
          onClick={() => thesisMutation.mutate()}
          disabled={thesisMutation.isPending}
          className="w-full py-3 rounded-xl font-display font-bold text-sm bg-gradient-to-r from-[#FFD700] to-[#FF3B9A] text-black transition-all active:scale-95 disabled:opacity-50"
        >
          {thesisMutation.isPending ? "🧠 Building thesis..." : "🧠 Generate Thesis"}
        </button>
      </div>

      {thesis && <ThesisResultCard thesis={thesis} />}

      {thesisMutation.isError && (
        <div className="rounded-xl bg-neon-pink/10 border border-neon-pink/30 px-3 py-2">
          <p className="text-xs text-neon-pink font-display">
            {(thesisMutation.error as Error)?.message || "Thesis generation failed"}
          </p>
        </div>
      )}
    </div>
  );
}

function ThesisResultCard({ thesis }: { thesis: ThesisResult }) {
  const convictionColor = thesis.conviction === "high" ? "#00FF88" : thesis.conviction === "medium" ? "#FFD700" : "#FF3B9A";

  return (
    <div className="rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#2A2A3E]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-lg text-[#E8E8E8]">{thesis.ticker}</span>
            <span className={`text-xs font-display font-bold px-2 py-0.5 rounded-full ${
              thesis.direction === "long" ? "bg-[#00FF88]/15 text-[#00FF88]" : "bg-neon-pink/15 text-neon-pink"
            }`}>{thesis.direction.toUpperCase()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: convictionColor }} />
            <span className="text-[10px] font-display font-bold uppercase" style={{ color: convictionColor }}>
              {thesis.conviction} conviction
            </span>
          </div>
        </div>
        <p className="text-xs text-[#888899] leading-relaxed">{thesis.thesis}</p>
        <div className="flex gap-3 mt-2">
          {thesis.priceTarget && (
            <span className="text-[10px] font-mono-num text-neon-cyan">🎯 Target: {thesis.priceTarget}</span>
          )}
          {thesis.stopLoss && (
            <span className="text-[10px] font-mono-num text-neon-pink">🛑 Stop: {thesis.stopLoss}</span>
          )}
        </div>
      </div>

      {/* Pillars Scorecard */}
      <div className="p-4 border-b border-[#2A2A3E]">
        <p className="text-[10px] text-[#555566] font-display font-bold uppercase tracking-wider mb-2">Thesis Pillars</p>
        <div className="space-y-2">
          {thesis.pillars?.map((p, i) => {
            const trendColor = p.trend === "strong" ? "#00FF88" : p.trend === "watch" ? "#FFD700" : "#FF3B9A";
            const trendIcon = p.trend === "strong" ? "▲" : p.trend === "watch" ? "◆" : "▼";
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px]" style={{ color: trendColor }}>{trendIcon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-display text-[#E8E8E8] truncate">{p.pillar}</p>
                  <p className="text-[9px] text-[#888899]">{p.status}</p>
                </div>
                <span className="text-[9px] font-display font-bold uppercase px-1.5 py-0.5 rounded-full" style={{
                  backgroundColor: `${trendColor}15`, color: trendColor
                }}>{p.trend}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Catalysts */}
      {thesis.catalysts?.length > 0 && (
        <div className="p-4 border-b border-[#2A2A3E]">
          <p className="text-[10px] text-[#555566] font-display font-bold uppercase tracking-wider mb-2">Catalyst Calendar</p>
          {thesis.catalysts.map((c, i) => (
            <div key={i} className="flex items-center gap-2 py-1">
              <span className={`text-[9px] font-display font-bold px-1.5 py-0.5 rounded-full ${
                c.impact === "high" ? "bg-neon-pink/15 text-neon-pink" : c.impact === "medium" ? "bg-[#FFD700]/15 text-[#FFD700]" : "bg-[#888899]/15 text-[#888899]"
              }`}>{c.impact.toUpperCase()}</span>
              <span className="text-[10px] text-[#888899] font-mono-num">{c.date}</span>
              <span className="text-[10px] text-[#E8E8E8] flex-1 truncate">{c.event}</span>
            </div>
          ))}
        </div>
      )}

      {/* Risks */}
      {thesis.risks?.length > 0 && (
        <div className="p-4">
          <p className="text-[10px] text-[#555566] font-display font-bold uppercase tracking-wider mb-2">Key Risks</p>
          {thesis.risks.map((r, i) => (
            <p key={i} className="text-[10px] text-neon-pink/80 leading-relaxed py-0.5">⚠️ {r}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab: Morning Note ───────────────────────────────────────────────────

function MorningNoteTab() {
  const noteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/research/morning-note");
      return res.json();
    },
  });

  const note: MorningNote | null = noteMutation.data || null;

  return (
    <div className="space-y-4">
      <button
        onClick={() => noteMutation.mutate()}
        disabled={noteMutation.isPending}
        className="w-full py-3 rounded-xl font-display font-bold text-sm bg-gradient-to-r from-[#00D4FF] to-[#7B61FF] text-white transition-all active:scale-95 disabled:opacity-50"
      >
        {noteMutation.isPending ? "☀️ Generating morning note..." : "☀️ Generate Morning Note"}
      </button>

      {note && (
        <div className="space-y-3">
          {/* Top Call */}
          <div className={`rounded-2xl border p-4 ${
            note.topCall.impact === "bullish" ? "bg-[#00FF88]/5 border-[#00FF88]/25" :
            note.topCall.impact === "bearish" ? "bg-neon-pink/5 border-neon-pink/25" :
            "bg-[#1A1A2E] border-[#2A2A3E]"
          }`}>
            <p className="text-[10px] text-[#555566] font-display font-bold uppercase mb-1">🔔 Top Call</p>
            <p className="font-display font-bold text-sm text-[#E8E8E8]">{note.topCall.headline}</p>
            <p className="text-[11px] text-[#888899] mt-1 leading-relaxed">{note.topCall.detail}</p>
          </div>

          {/* Market Overview */}
          <div className="rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-4">
            <p className="text-[10px] text-[#555566] font-display font-bold uppercase mb-2">📊 Market Overview</p>
            <div className="space-y-1.5">
              {note.marketOverview?.map((m, i) => (
                <div key={i} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <SignalDot signal={m.signal} />
                    <span className="font-display font-bold text-xs text-[#E8E8E8]">{m.asset}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono-num text-xs text-[#E8E8E8]">{m.price}</span>
                    <span className={`font-mono-num text-xs ${
                      m.change?.startsWith("+") ? "text-[#00FF88]" : m.change?.startsWith("-") ? "text-neon-pink" : "text-[#888899]"
                    }`}>{m.change}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trade Ideas */}
          {note.tradeIdeas?.length > 0 && (
            <div className="rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-4">
              <p className="text-[10px] text-[#555566] font-display font-bold uppercase mb-2">💡 Trade Ideas</p>
              {note.tradeIdeas.map((t, i) => (
                <div key={i} className="py-2 border-b border-[#2A2A3E] last:border-b-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-display font-bold text-xs text-[#E8E8E8]">{t.ticker}</span>
                    <span className={`text-[9px] font-display font-bold px-1.5 py-0.5 rounded-full ${
                      t.direction?.toLowerCase() === "long" ? "bg-[#00FF88]/15 text-[#00FF88]" : "bg-neon-pink/15 text-neon-pink"
                    }`}>{t.direction}</span>
                  </div>
                  <p className="text-[10px] text-[#888899]">{t.thesis}</p>
                  <p className="text-[10px] text-neon-pink/70 mt-0.5">Risk: {t.risk}</p>
                </div>
              ))}
            </div>
          )}

          {/* Key Events */}
          {note.keyEvents?.length > 0 && (
            <div className="rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-4">
              <p className="text-[10px] text-[#555566] font-display font-bold uppercase mb-2">📅 Key Events</p>
              {note.keyEvents.map((e, i) => (
                <div key={i} className="flex items-center gap-2 py-1">
                  <span className="text-[10px] text-[#555566] font-mono-num min-w-[50px]">{e.time}</span>
                  <span className="text-[10px] text-[#E8E8E8] flex-1">{e.event}</span>
                  <span className={`text-[9px] font-display font-bold ${
                    e.impact === "High" ? "text-neon-pink" : e.impact === "Medium" ? "text-[#FFD700]" : "text-[#888899]"
                  }`}>{e.impact}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {noteMutation.isError && (
        <div className="rounded-xl bg-neon-pink/10 border border-neon-pink/30 px-3 py-2">
          <p className="text-xs text-neon-pink font-display">
            {(noteMutation.error as Error)?.message || "Morning note generation failed"}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────

type Tab = "screen" | "thesis" | "morning";

export default function ResearchTools() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("screen");

  const { data: engineStatus } = useQuery<any>({
    queryKey: ["/api/research/status"],
    refetchInterval: 30000,
  });

  const tabs: { id: Tab; label: string; emoji: string }[] = [
    { id: "screen", label: "Screen", emoji: "🔍" },
    { id: "thesis", label: "Thesis", emoji: "📝" },
    { id: "morning", label: "Note", emoji: "☀️" },
  ];

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
          <div className="flex-1">
            <h1 className="font-display font-bold text-base text-[#E8E8E8]">Research Tools</h1>
            <p className="text-[10px] text-[#555566] font-display">Powered by Anthropic Financial Plugins + DeepSeek</p>
          </div>
          {engineStatus && (
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${
                engineStatus.status === "running" ? "bg-neon-cyan animate-pulse" :
                engineStatus.status === "idle" ? "bg-[#00FF88]" :
                engineStatus.status === "disabled" ? "bg-[#888899]" : "bg-neon-pink"
              }`} />
              <span className="text-[9px] text-[#888899] font-mono-num">{engineStatus.signalsGenerated || 0} signals</span>
            </div>
          )}
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 px-4 mt-3 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-display font-bold transition-all ${
              activeTab === tab.id
                ? "bg-gradient-to-r from-[#00D4FF]/20 to-[#00FF88]/20 text-neon-cyan border border-neon-cyan/30"
                : "bg-[#1A1A2E] text-[#888899] border border-[#2A2A3E]"
            }`}
          >
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="px-4">
        {activeTab === "screen" && <ScreenTab />}
        {activeTab === "thesis" && <ThesisTab />}
        {activeTab === "morning" && <MorningNoteTab />}
      </div>
    </div>
  );
}
