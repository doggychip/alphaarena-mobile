import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine, Cell,
} from "recharts";

// ── Types ──
interface Snapshot {
  id: number;
  portfolioId: number;
  date: string;
  totalEquity: number;
  cashBalance: number;
  dailyReturn: number;
  cumulativeReturn: number;
}

interface Position {
  id: number;
  pair: string;
  side: string;
  quantity: number;
  avgEntryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
}

// ── Palette ──
const GREEN = "#00FF88";
const RED = "#FF3B9A";
const CYAN = "#00D4FF";
const GOLD = "#FFD700";
const MUTED = "#888899";
const DARK_BG = "#0A0A0F";
const CARD_BG = "#1A1A2E";
const BORDER = "#2A2A3E";

// ── Custom Tooltip ──
function ChartTooltip({ active, payload, label, type }: any) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  return (
    <div className="rounded-lg bg-[#12121A] border border-[#2A2A3E] px-3 py-2 shadow-xl">
      <p className="text-[10px] text-[#555566] font-display">{label}</p>
      {type === "equity" ? (
        <p className="text-sm font-mono-num font-bold text-[#E8E8E8]">
          ${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </p>
      ) : (
        <p className={`text-sm font-mono-num font-bold ${val >= 0 ? "text-neon-green" : "text-neon-pink"}`}>
          {val >= 0 ? "+" : ""}{val.toFixed(2)}%
        </p>
      )}
    </div>
  );
}

// ── Stat Card ──
function StatCard({ label, value, sub, color = "#E8E8E8" }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl bg-[#12121A] border border-[#2A2A3E] p-3">
      <p className="text-[9px] text-[#555566] font-display uppercase tracking-wider">{label}</p>
      <p className="text-base font-mono-num font-bold mt-1" style={{ color }}>{value}</p>
      {sub && <p className="text-[9px] text-[#555566] mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Position Row ──
function PositionRow({ pos }: { pos: Position }) {
  const pnlPct = pos.avgEntryPrice > 0 ? ((pos.currentPrice - pos.avgEntryPrice) / pos.avgEntryPrice) * 100 : 0;
  const isPos = pos.unrealizedPnl >= 0;
  const marketValue = pos.currentPrice * pos.quantity;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-[#2A2A3E] last:border-0">
      <div className="w-9 h-9 rounded-full bg-[#12121A] flex items-center justify-center text-sm font-bold" style={{ color: isPos ? GREEN : RED }}>
        {pos.pair.split("/")[0].slice(0, 3)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display font-bold text-xs text-[#E8E8E8]">{pos.pair.split("/")[0]}</p>
        <p className="text-[10px] text-[#555566]">
          {pos.quantity} × ${pos.currentPrice < 1 ? pos.currentPrice.toFixed(4) : pos.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </p>
      </div>
      <div className="text-right">
        <p className="font-mono-num text-xs font-bold text-[#E8E8E8]">
          ${marketValue < 1 ? marketValue.toFixed(2) : marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </p>
        <p className={`font-mono-num text-[10px] font-bold ${isPos ? "text-neon-green" : "text-neon-pink"}`}>
          {isPos ? "+" : ""}{pnlPct.toFixed(1)}%
          <span className="ml-1 text-[9px]">
            ({isPos ? "+" : ""}${Math.abs(pos.unrealizedPnl).toLocaleString(undefined, { maximumFractionDigits: 0 })})
          </span>
        </p>
      </div>
    </div>
  );
}

// ── Agent Performance Card ──
function AgentPerformance({ meData, leaderboardData }: { meData: any; leaderboardData: any }) {
  const entry = meData?.leaderboardEntry;
  const agent = meData?.agent;
  if (!entry || !agent) return null;

  // Find user's rank among all agents
  const allEntries = leaderboardData?.entries || [];
  const totalAgents = allEntries.length;

  const metrics = [
    { label: "Total Return", value: `${entry.totalReturn >= 0 ? "+" : ""}${entry.totalReturn.toFixed(1)}%`, color: entry.totalReturn >= 0 ? GREEN : RED },
    { label: "Sharpe Ratio", value: entry.sharpeRatio.toFixed(2), color: entry.sharpeRatio >= 1 ? GREEN : entry.sharpeRatio >= 0 ? GOLD : RED },
    { label: "Max Drawdown", value: `-${entry.maxDrawdown.toFixed(1)}%`, color: entry.maxDrawdown < 5 ? GREEN : entry.maxDrawdown < 10 ? GOLD : RED },
    { label: "Win Rate", value: `${entry.winRate}%`, color: entry.winRate >= 55 ? GREEN : entry.winRate >= 45 ? GOLD : RED },
    { label: "Arena Rank", value: `#${entry.rank}`, color: entry.rank <= 5 ? GREEN : entry.rank <= 10 ? GOLD : MUTED },
    { label: "Score", value: entry.compositeScore.toFixed(1), color: entry.compositeScore >= 40 ? GREEN : entry.compositeScore >= 20 ? GOLD : RED },
  ];

  // Visual performance bar (relative to best/worst)
  const maxReturn = allEntries.length > 0 ? Math.max(...allEntries.map((e: any) => e.totalReturn)) : 30;
  const minReturn = allEntries.length > 0 ? Math.min(...allEntries.map((e: any) => e.totalReturn)) : -10;
  const range = maxReturn - minReturn || 1;
  const pct = ((entry.totalReturn - minReturn) / range) * 100;

  return (
    <div className="rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-4">
      {/* Agent header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-[#0A0A0F] border-2 border-neon-cyan/40 flex items-center justify-center text-2xl">
          {agent.avatarEmoji}
        </div>
        <div>
          <p className="font-display font-bold text-sm text-[#E8E8E8]">{agent.name}</p>
          <p className="text-[10px] text-[#888899]">
            {agent.tradingStyle || agent.personality} · Rank #{entry.rank} of {totalAgents}
          </p>
        </div>
      </div>

      {/* Performance bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] text-[#555566] font-display">PERFORMANCE VS FIELD</span>
          <span className={`text-[10px] font-mono-num font-bold ${entry.totalReturn >= 0 ? "text-neon-green" : "text-neon-pink"}`}>
            {entry.totalReturn >= 0 ? "+" : ""}{entry.totalReturn.toFixed(1)}%
          </span>
        </div>
        <div className="h-3 rounded-full bg-[#12121A] overflow-hidden relative">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${Math.max(3, pct)}%`,
              background: `linear-gradient(90deg, ${entry.totalReturn >= 0 ? GREEN : RED}40, ${entry.totalReturn >= 0 ? GREEN : RED})`,
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[8px] text-[#555566] font-mono-num">{minReturn.toFixed(0)}%</span>
          <span className="text-[8px] text-[#555566] font-mono-num">+{maxReturn.toFixed(0)}%</span>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-3 gap-2">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-lg bg-[#12121A] border border-[#2A2A3E] p-2.5 text-center">
            <p className="text-[8px] text-[#555566] font-display uppercase">{m.label}</p>
            <p className="text-sm font-mono-num font-bold mt-0.5" style={{ color: m.color }}>{m.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}


// ── Main Page ──
export default function PortfolioChart() {
  const [, navigate] = useLocation();
  const [timeRange, setTimeRange] = useState<"7d" | "14d" | "all">("all");
  const [chartType, setChartType] = useState<"equity" | "returns">("equity");

  const { data: meData } = useQuery<any>({ queryKey: ["/api/me"] });
  const { data: portfolioData } = useQuery<any>({ queryKey: ["/api/portfolio"], refetchInterval: 15000 });
  const { data: leaderboardData } = useQuery<any>({ queryKey: ["/api/leaderboard"] });

  const portfolio = portfolioData?.portfolio || meData?.portfolio;
  const positions: Position[] = portfolioData?.positions || [];
  const snapshots: Snapshot[] = portfolioData?.snapshots || [];

  // Filter snapshots by time range
  const filteredSnapshots = (() => {
    if (timeRange === "all") return snapshots;
    const days = timeRange === "7d" ? 7 : 14;
    return snapshots.slice(-days);
  })();

  // Chart data with formatted dates
  const chartData = filteredSnapshots.map(s => ({
    date: new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    equity: s.totalEquity,
    dailyReturn: s.dailyReturn,
    cumReturn: s.cumulativeReturn,
  }));

  // Summary stats
  const totalEquity = portfolio?.totalEquity || 100000;
  const startingCapital = 100000;
  const totalPnl = totalEquity - startingCapital;
  const totalPnlPct = (totalPnl / startingCapital) * 100;
  const bestDay = snapshots.length > 0 ? Math.max(...snapshots.map(s => s.dailyReturn)) : 0;
  const worstDay = snapshots.length > 0 ? Math.min(...snapshots.map(s => s.dailyReturn)) : 0;
  const avgDaily = snapshots.length > 0 ? snapshots.reduce((s, x) => s + x.dailyReturn, 0) / snapshots.length : 0;
  const positiveDays = snapshots.filter(s => s.dailyReturn >= 0).length;
  const winDayPct = snapshots.length > 0 ? (positiveDays / snapshots.length) * 100 : 0;

  // Allocation data
  const totalPositionValue = positions.reduce((sum, p) => sum + p.currentPrice * p.quantity, 0);
  const cashBalance = portfolio?.cashBalance || 0;
  const allocations = [
    ...positions.map(p => ({
      name: p.pair.split("/")[0],
      value: p.currentPrice * p.quantity,
      pct: ((p.currentPrice * p.quantity) / totalEquity) * 100,
      pnl: p.unrealizedPnl,
    })),
    { name: "Cash", value: cashBalance, pct: (cashBalance / totalEquity) * 100, pnl: 0 },
  ];

  const ALLOC_COLORS = [GREEN, CYAN, GOLD, RED, "#9B59B6", "#555566"];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center gap-3 px-4 py-3" style={{ background: "rgba(10, 10, 15, 0.9)", backdropFilter: "blur(12px)" }}>
        <button data-testid="chart-back" onClick={() => navigate("/")} className="w-10 h-10 rounded-full bg-[#1A1A2E] flex items-center justify-center text-lg">←</button>
        <div className="flex-1">
          <h1 className="font-display font-bold text-lg text-[#E8E8E8]">📊 Portfolio</h1>
        </div>
      </header>

      {/* Portfolio Value Hero */}
      <div className="mx-4 mt-2 rounded-2xl bg-gradient-to-br from-[#1A1A2E] to-[#12121A] border border-[#2A2A3E] p-5">
        <p className="text-[10px] text-[#555566] font-display uppercase tracking-wider">Total Value</p>
        <div className="flex items-baseline gap-3 mt-1">
          <span className="font-mono-num text-3xl font-bold text-[#E8E8E8]">
            ${totalEquity.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
          <span className={`font-mono-num text-sm font-bold ${totalPnl >= 0 ? "text-neon-green" : "text-neon-pink"}`}>
            {totalPnl >= 0 ? "▲" : "▼"} {totalPnl >= 0 ? "+" : ""}{totalPnlPct.toFixed(2)}%
          </span>
        </div>
        <p className="text-[10px] text-[#555566] mt-1">
          {totalPnl >= 0 ? "+" : ""}${totalPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })} from $100,000 starting capital
        </p>
      </div>

      {/* Chart Controls */}
      <div className="mx-4 mt-4 flex items-center justify-between">
        {/* Chart type toggle */}
        <div className="flex items-center gap-1 bg-[#12121A] rounded-lg p-0.5">
          {(["equity", "returns"] as const).map(t => (
            <button
              key={t}
              data-testid={`chart-type-${t}`}
              onClick={() => setChartType(t)}
              className={`px-3 py-1.5 rounded-md text-[10px] font-display font-bold transition-all ${
                chartType === t
                  ? "bg-[#2A2A3E] text-[#E8E8E8]"
                  : "text-[#555566]"
              }`}
            >
              {t === "equity" ? "💰 Equity" : "📈 Returns"}
            </button>
          ))}
        </div>
        {/* Time range */}
        <div className="flex items-center gap-1">
          {(["7d", "14d", "all"] as const).map(r => (
            <button
              key={r}
              data-testid={`chart-range-${r}`}
              onClick={() => setTimeRange(r)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-display font-bold transition-all ${
                timeRange === r
                  ? "bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30"
                  : "text-[#555566]"
              }`}
            >
              {r === "all" ? "All" : r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chart */}
      <div className="mx-4 mt-3 rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-3 pb-1">
        {chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-sm text-[#555566] font-display">
            No data yet — check back tomorrow
          </div>
        ) : chartType === "equity" ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={GREEN} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3E" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: "#555566" }}
                axisLine={{ stroke: "#2A2A3E" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "#555566" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                domain={["dataMin - 1000", "dataMax + 1000"]}
              />
              <Tooltip content={<ChartTooltip type="equity" />} />
              <ReferenceLine y={startingCapital} stroke="#555566" strokeDasharray="4 4" />
              <Area
                type="monotone"
                dataKey="equity"
                stroke={GREEN}
                strokeWidth={2}
                fill="url(#equityGrad)"
                dot={false}
                activeDot={{ r: 4, fill: GREEN, stroke: DARK_BG, strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3E" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: "#555566" }}
                axisLine={{ stroke: "#2A2A3E" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "#555566" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip content={<ChartTooltip type="returns" />} />
              <ReferenceLine y={0} stroke="#555566" strokeWidth={1} />
              <Bar dataKey="dailyReturn" radius={[3, 3, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.dailyReturn >= 0 ? GREEN : RED} fillOpacity={0.7} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Quick Stats */}
      <div className="mx-4 mt-4 grid grid-cols-2 gap-2">
        <StatCard
          label="Best Day"
          value={`+${bestDay.toFixed(2)}%`}
          color={GREEN}
          sub={`Avg: ${avgDaily >= 0 ? "+" : ""}${avgDaily.toFixed(2)}%`}
        />
        <StatCard
          label="Worst Day"
          value={`${worstDay.toFixed(2)}%`}
          color={RED}
          sub={`${winDayPct.toFixed(0)}% winning days`}
        />
      </div>

      {/* Agent Performance */}
      <div className="mx-4 mt-4">
        <p className="text-xs text-[#888899] font-display mb-2">🤖 Agent Performance</p>
        <AgentPerformance meData={meData} leaderboardData={leaderboardData} />
      </div>

      {/* Allocation Breakdown */}
      <div className="mx-4 mt-4 rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-4">
        <p className="text-xs text-[#888899] font-display mb-3">📊 Allocation</p>
        {/* Bar visualization */}
        <div className="flex gap-0.5 h-4 rounded-full overflow-hidden mb-3">
          {allocations.map((a, i) => (
            <div
              key={a.name}
              className="rounded-full transition-all"
              style={{
                width: `${Math.max(a.pct, 3)}%`,
                backgroundColor: ALLOC_COLORS[i % ALLOC_COLORS.length],
                opacity: a.name === "Cash" ? 0.3 : 0.7,
              }}
            />
          ))}
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {allocations.map((a, i) => (
            <div key={a.name} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ALLOC_COLORS[i % ALLOC_COLORS.length], opacity: a.name === "Cash" ? 0.3 : 1 }} />
              <span className="text-[10px] text-[#888899] font-display">{a.name}</span>
              <span className="text-[10px] font-mono-num text-[#555566]">{a.pct.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Positions */}
      {positions.length > 0 && (
        <div className="mx-4 mt-4 rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-4">
          <p className="text-xs text-[#888899] font-display mb-2">📋 Open Positions</p>
          {positions.map(pos => (
            <PositionRow key={pos.id} pos={pos} />
          ))}
        </div>
      )}

      {/* Top Agents Comparison */}
      {leaderboardData?.entries && (
        <div className="mx-4 mt-4 mb-4 rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-4">
          <p className="text-xs text-[#888899] font-display mb-3">🏆 Top 5 Agents — Season Leaderboard</p>
          {leaderboardData.entries.slice(0, 5).map((entry: any, i: number) => {
            const medals = ["🥇", "🥈", "🥉"];
            return (
              <div key={entry.id} className="flex items-center gap-3 py-2.5 border-b border-[#2A2A3E] last:border-0">
                <span className="text-lg w-6 text-center">
                  {i < 3 ? medals[i] : <span className="text-xs font-mono-num text-[#555566]">{i + 1}</span>}
                </span>
                <div className="w-8 h-8 rounded-full bg-[#0A0A0F] flex items-center justify-center text-lg">
                  {entry.agent?.avatarEmoji || "🤖"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-xs text-[#E8E8E8] truncate">
                    {entry.user?.username || "Agent"}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] font-mono-num text-[#555566]">
                      W:{entry.winRate}%
                    </span>
                    <span className="text-[9px] font-mono-num text-[#555566]">
                      S:{entry.sharpeRatio.toFixed(1)}
                    </span>
                    <span className="text-[9px] font-mono-num text-[#555566]">
                      DD:{entry.maxDrawdown.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <span className={`font-mono-num text-sm font-bold ${entry.totalReturn >= 0 ? "text-neon-green" : "text-neon-pink"}`}>
                  {entry.totalReturn >= 0 ? "+" : ""}{entry.totalReturn.toFixed(1)}%
                </span>
              </div>
            );
          })}
          <Link href="/arena">
            <button data-testid="chart-view-arena" className="w-full mt-3 h-9 rounded-xl bg-[#12121A] border border-[#2A2A3E] text-[#888899] font-display font-bold text-xs active:scale-95 transition-transform">
              View Full Arena →
            </button>
          </Link>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 pb-4 text-center">
        <a href="https://www.perplexity.ai/computer" target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#555566] hover:text-[#888899]">
          Created with Perplexity Computer
        </a>
      </div>
    </div>
  );
}
