import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";

const LEAGUE_CONFIG = [
  { id: "diamond", label: "🏆 Diamond", color: "#00D4FF", maxRank: 10 },
  { id: "gold", label: "💎 Gold", color: "#FFD700", maxRank: 50 },
  { id: "silver", label: "🥈 Silver", color: "#C0C0C0", maxRank: 100 },
  { id: "bronze", label: "🥉 Bronze", color: "#CD7F32", maxRank: 9999 },
];

const MEME_AGENT_TYPES = new Set(["bull", "bear", "algo", "moon", "zen", "degen"]);
function getAgentTier(selectedAgentType: string): "meme" | "hf" {
  return MEME_AGENT_TYPES.has(selectedAgentType) ? "meme" : "hf";
}

const HF_CATEGORIES: Record<string, string> = {
  persona: "persona",
  specialist: "specialist",
  management: "management",
};

function getAgentCategory(entry: any): string {
  const agentType = entry.user?.selectedAgentType;
  if (!agentType) return "meme";
  if (MEME_AGENT_TYPES.has(agentType)) return "meme";
  const cat = entry.agent?.personality;
  if (cat && HF_CATEGORIES[cat]) return cat;
  return "persona";
}

const CATEGORY_FILTERS = [
  { id: "all", label: "All", emoji: "🌐" },
  { id: "meme", label: "Meme", emoji: "🎭" },
  { id: "persona", label: "Persona", emoji: "🏛️" },
  { id: "specialist", label: "Specialist", emoji: "📊" },
  { id: "management", label: "Mgmt", emoji: "👔" },
];

const SORT_OPTIONS = [
  { id: "compositeScore", label: "Score", emoji: "⚡" },
  { id: "totalReturn", label: "Return", emoji: "📈" },
  { id: "sharpeRatio", label: "Sharpe", emoji: "📊" },
  { id: "winRate", label: "Win %", emoji: "🎯" },
  { id: "maxDrawdown", label: "Drawdown", emoji: "🛡️" },
];

function getLeague(rank: number) {
  if (rank <= 10) return LEAGUE_CONFIG[0];
  if (rank <= 50) return LEAGUE_CONFIG[1];
  if (rank <= 100) return LEAGUE_CONFIG[2];
  return LEAGUE_CONFIG[3];
}

type ArenaTab = "agents" | "players";

export default function Arena() {
  const [activeTab, setActiveTab] = useState<ArenaTab>("agents");
  const [selectedLeague, setSelectedLeague] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("compositeScore");
  const [showRankingInfo, setShowRankingInfo] = useState(false);
  const [, navigate] = useLocation();

  function goToAgent(user: any) {
    if (!user) return;
    const agentType = user.selectedAgentType;
    if (agentType && !MEME_AGENT_TYPES.has(agentType)) {
      navigate(`/signals/${agentType}`);
    } else {
      navigate(`/agent?userId=${user.id}`);
    }
  }

  const { data: meData } = useQuery<any>({ queryKey: ["/api/me"] });
  const { data: leaderboardData } = useQuery<any>({ queryKey: ["/api/leaderboard"] });
  const { data: competitionData } = useQuery<any>({ queryKey: ["/api/competition"] });
  const { data: stakingLeaderboard } = useQuery<any>({ queryKey: ["/api/staking/leaderboard"] });

  const stakedMap = new Map<number, number>();
  (stakingLeaderboard || []).forEach((e: any) => stakedMap.set(e.targetUserId, e.totalStaked));

  const competition = competitionData;
  const allEntries = leaderboardData?.entries || [];
  const myEntry = meData?.leaderboardEntry;

  // Split entries into agents and players
  const agentEntries = allEntries.filter((e: any) => e.isAgent);
  const playerEntries = allEntries.filter((e: any) => !e.isAgent);

  // Re-rank within each tab
  const rankedAgentEntries = agentEntries.map((e: any, i: number) => ({ ...e, tabRank: i + 1 }));
  const rankedPlayerEntries = playerEntries.map((e: any, i: number) => ({ ...e, tabRank: i + 1 }));

  const baseEntries = activeTab === "agents" ? rankedAgentEntries : rankedPlayerEntries;
  const totalEntries = baseEntries.length;

  // Filter by league (use tabRank for league assignment)
  let filteredEntries = selectedLeague === "all"
    ? baseEntries
    : baseEntries.filter((e: any) => {
        const league = getLeague(e.tabRank);
        return league.id === selectedLeague;
      });

  // Filter by agent category (only for agents tab)
  if (activeTab === "agents" && selectedCategory !== "all") {
    filteredEntries = filteredEntries.filter((e: any) => getAgentCategory(e) === selectedCategory);
  }

  // Sort entries
  if (sortBy !== "compositeScore") {
    filteredEntries = [...filteredEntries].sort((a: any, b: any) => {
      if (sortBy === "maxDrawdown") {
        return a.maxDrawdown - b.maxDrawdown;
      }
      return b[sortBy] - a[sortBy];
    });
  }

  // Countdown
  const endDate = competition?.endDate ? new Date(competition.endDate) : null;
  const now = new Date();
  const daysLeft = endDate ? Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / 86400000)) : 0;

  // Reset filters when switching tabs
  const handleTabSwitch = (tab: ArenaTab) => {
    setActiveTab(tab);
    setSelectedCategory("all");
    setSortBy("compositeScore");
    setSelectedLeague("all");
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 py-3" style={{ background: "rgba(10, 10, 15, 0.9)", backdropFilter: "blur(12px)" }}>
        <h1 className="font-display font-bold text-lg text-[#E8E8E8]">⚔️ Arena</h1>
      </header>

      {/* Season Banner */}
      <div className="mx-4 mt-2 rounded-2xl border-2 animate-neon-border bg-gradient-to-r from-[#1A1A2E] to-[#12121A] p-4 text-center">
        <p className="font-display font-bold text-sm text-neon-cyan tracking-wider uppercase">
          {competition?.name || "SEASON 1: CRYPTO ARENA"}
        </p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="text-lg">⏳</span>
          <span className="font-mono-num text-2xl font-bold text-neon-gold">{daysLeft}</span>
          <span className="text-sm text-[#888899]">days left</span>
        </div>
      </div>

      {/* Tab Switcher: AI Agents / Players */}
      <div className="mx-4 mt-4 flex rounded-2xl bg-[#12121A] border border-[#2A2A3E] p-1">
        <button
          onClick={() => handleTabSwitch("agents")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-display font-bold transition-all ${
            activeTab === "agents"
              ? "bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/40"
              : "text-[#888899] border border-transparent"
          }`}
        >
          🤖 AI Agents
          <span className="ml-1.5 text-[10px] font-mono-num opacity-70">{agentEntries.length}</span>
        </button>
        <button
          onClick={() => handleTabSwitch("players")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-display font-bold transition-all ${
            activeTab === "players"
              ? "bg-neon-green/15 text-neon-green border border-neon-green/40"
              : "text-[#888899] border border-transparent"
          }`}
        >
          👤 Players
          <span className="ml-1.5 text-[10px] font-mono-num opacity-70">{playerEntries.length}</span>
        </button>
      </div>

      {/* How Rankings Work */}
      <div className="mx-4 mt-3">
        <button
          onClick={() => setShowRankingInfo(!showRankingInfo)}
          className="w-full rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] px-4 py-2.5 flex items-center justify-between active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">ℹ️</span>
            <span className="font-display font-bold text-xs text-[#E8E8E8]">How Rankings Work</span>
          </div>
          <span className={`text-[#888899] text-xs transition-transform ${showRankingInfo ? "rotate-180" : ""}`}>▼</span>
        </button>
        {showRankingInfo && (
          <div className="mt-1 rounded-2xl bg-[#12121A] border border-[#2A2A3E] p-4 space-y-3">
            <p className="text-xs text-[#888899] leading-relaxed">
              Rankings are based on a <span className="text-neon-cyan font-display font-bold">composite score</span> that rewards both performance and risk management:
            </p>
            <div className="space-y-2">
              <ScoreFactorRow emoji="📈" label="Total Return" weight="40%" color="#00FF88" desc="Overall portfolio gain/loss" />
              <ScoreFactorRow emoji="📊" label="Sharpe Ratio" weight="30%" color="#00D4FF" desc="Risk-adjusted return — higher = better returns per unit of risk" />
              <ScoreFactorRow emoji="🎯" label="Win Rate" weight="20%" color="#FFD700" desc="% of profitable trades" />
              <ScoreFactorRow emoji="🛡️" label="Max Drawdown" weight="10%" color="#FF3B9A" desc="Worst peak-to-trough loss — lower = better" />
            </div>
            <div className="rounded-xl bg-[#1A1A2E] border border-neon-cyan/20 p-3">
              <p className="text-[10px] text-[#888899] leading-relaxed">
                {activeTab === "agents" ? (
                  <>
                    <span className="text-neon-cyan font-display font-bold">AI Agent Rankings</span> — Compare autonomous AI trading agents head-to-head. Pick the best-performing agent to follow or stake on.
                  </>
                ) : (
                  <>
                    <span className="text-neon-green font-display font-bold">Player Rankings</span> — See how real players stack up. Your rank is based on the performance of your chosen agent and trades.
                  </>
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Your Rank Card — show in both tabs */}
      {myEntry && (
        <div className="mx-4 mt-4 rounded-2xl bg-[#1A1A2E] border border-neon-green/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs">👤</span>
            <p className="text-xs text-[#888899] font-display">Your Rank</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <span className="font-mono-num text-3xl font-bold text-neon-green">#{myEntry.rank}</span>
              <p className="text-[10px] text-[#888899] mt-0.5">of {allEntries.length}</p>
            </div>
            <div className="flex-1 space-y-2">
              <StatBar label="Return" value={myEntry.totalReturn} max={50} color="#00FF88" suffix="%" />
              <StatBar label="Sharpe" value={myEntry.sharpeRatio} max={3} color="#00D4FF" />
              <StatBar label="Win Rate" value={myEntry.winRate} max={100} color="#FFD700" suffix="%" />
              <StatBar label="DrawDown" value={myEntry.maxDrawdown} max={30} color="#FF3B9A" suffix="%" inverted />
            </div>
          </div>
        </div>
      )}

      {/* Category Filter — only for agents tab */}
      {activeTab === "agents" && (
        <div className="mx-4 mt-4">
          <p className="text-[10px] text-[#888899] font-display mb-1.5 uppercase tracking-wider">Agent Type</p>
          <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
            {CATEGORY_FILTERS.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex-shrink-0 px-2.5 py-1.5 rounded-xl text-[11px] font-display font-bold transition-all ${
                  selectedCategory === cat.id
                    ? "bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/40"
                    : "bg-[#1A1A2E] text-[#888899] border border-[#2A2A3E]"
                }`}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sort By */}
      <div className={`mx-4 ${activeTab === "agents" ? "mt-3" : "mt-4"}`}>
        <p className="text-[10px] text-[#888899] font-display mb-1.5 uppercase tracking-wider">Sort By</p>
        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => setSortBy(opt.id)}
              className={`flex-shrink-0 px-2.5 py-1.5 rounded-xl text-[11px] font-display font-bold transition-all ${
                sortBy === opt.id
                  ? "bg-neon-green/15 text-neon-green border border-neon-green/40"
                  : "bg-[#1A1A2E] text-[#888899] border border-[#2A2A3E]"
              }`}
            >
              {opt.emoji} {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* League Selector */}
      <div className="mx-4 mt-3">
        <p className="text-[10px] text-[#888899] font-display mb-1.5 uppercase tracking-wider">League</p>
        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setSelectedLeague("all")}
            className={`flex-shrink-0 px-2.5 py-1.5 rounded-xl text-[11px] font-display font-bold transition-all ${
              selectedLeague === "all"
                ? "bg-neon-green/20 text-neon-green border border-neon-green/40"
                : "bg-[#1A1A2E] text-[#888899] border border-[#2A2A3E]"
            }`}
          >
            🌐 All
          </button>
          {LEAGUE_CONFIG.map(league => (
            <button
              key={league.id}
              onClick={() => setSelectedLeague(league.id)}
              className={`flex-shrink-0 px-2.5 py-1.5 rounded-xl text-[11px] font-display font-bold transition-all ${
                selectedLeague === league.id
                  ? "bg-[#1A1A2E] border-2"
                  : "bg-[#1A1A2E] text-[#888899] border border-[#2A2A3E]"
              }`}
              style={selectedLeague === league.id ? { borderColor: league.color, color: league.color } : {}}
            >
              {league.label}
            </button>
          ))}
        </div>
      </div>

      {/* Result Count */}
      <div className="mx-4 mt-3 flex items-center justify-between">
        <span className="text-[10px] text-[#888899] font-mono-num">
          {filteredEntries.length} {activeTab === "agents" ? "agent" : "player"}{filteredEntries.length !== 1 ? "s" : ""}
        </span>
        {(selectedCategory !== "all" || sortBy !== "compositeScore" || selectedLeague !== "all") && (
          <button
            onClick={() => { setSelectedCategory("all"); setSortBy("compositeScore"); setSelectedLeague("all"); }}
            className="text-[10px] text-neon-cyan font-display active:opacity-60"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Daily Challenge */}
      <div className="mx-4 mt-3 rounded-2xl bg-gradient-to-r from-neon-gold/10 to-[#1A1A2E] border border-neon-gold/30 p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🎯</span>
          <span className="font-display font-bold text-sm text-neon-gold">Daily Challenge</span>
        </div>
        <p className="text-xs text-[#E8E8E8] mb-2">Trade 3 different pairs today</p>
        <div className="w-full h-2 rounded-full bg-[#2A2A3E] overflow-hidden">
          <div className="h-full rounded-full bg-neon-gold transition-all" style={{ width: "33%" }} />
        </div>
        <p className="text-[10px] text-[#888899] mt-1 font-mono-num">1/3 complete · +100 XP</p>
      </div>

      {/* Leaderboard List */}
      <div className="mx-4 mt-4 space-y-2 mb-4">
        {filteredEntries.length === 0 && (
          <div className="rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-6 text-center">
            <span className="text-2xl">{activeTab === "agents" ? "🤖" : "👤"}</span>
            <p className="text-sm text-[#888899] mt-2 font-display">
              {activeTab === "agents" ? "No agents found" : "No players yet"}
            </p>
            <p className="text-[10px] text-[#555566] mt-1">
              {activeTab === "agents" ? "Try adjusting your filters" : "Be the first to compete"}
            </p>
          </div>
        )}
        {filteredEntries.map((entry: any) => {
          const displayRank = sortBy === "compositeScore" ? entry.tabRank : undefined;
          const league = getLeague(entry.tabRank);
          const isMe = entry.userId === meData?.user?.id;
          const staked = stakedMap.get(entry.userId) || 0;
          const isHeavilyStaked = staked >= 1000;
          const tier = entry.user?.selectedAgentType ? getAgentTier(entry.user.selectedAgentType) : "meme";
          const category = getAgentCategory(entry);
          return (
            <div
              key={entry.userId}
              data-testid={`leaderboard-entry-${entry.userId}`}
              onClick={() => activeTab === "agents" ? goToAgent(entry.user) : undefined}
              className={`rounded-2xl bg-[#1A1A2E] border p-3 flex items-center gap-3 card-tap ${
                activeTab === "agents" ? "cursor-pointer active:scale-[0.98]" : ""
              } transition-transform ${
                isMe ? "border-neon-green/50 glow-green" : isHeavilyStaked ? "border-neon-gold/40" : "border-[#2A2A3E]"
              }`}
            >
              {/* Rank */}
              <div className="w-8 text-center">
                {displayRank ? (
                  <span className="font-mono-num text-lg font-bold" style={{ color: league.color }}>
                    {displayRank}
                  </span>
                ) : (
                  <span className="font-mono-num text-sm text-[#555566]">—</span>
                )}
              </div>
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full bg-[#0A0A0F] flex items-center justify-center text-xl border ${
                isMe ? "border-neon-green/50" : "border-[#2A2A3E]"
              }`}>
                {entry.agent?.avatarEmoji || (isMe ? "🎮" : "👤")}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-display font-semibold text-sm text-[#E8E8E8] truncate">
                    {entry.user?.username}
                  </span>
                  {activeTab === "agents" && (
                    <span className="text-[9px] px-1 rounded" style={{
                      background: tier === "hf" ? "rgba(0,212,255,0.15)" : "rgba(255,59,154,0.15)",
                      color: tier === "hf" ? "#00D4FF" : "#FF3B9A",
                    }}>
                      {tier === "hf" ? "🏦" : "🎭"}
                    </span>
                  )}
                  {isMe && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-neon-green/15 text-neon-green border border-neon-green/30 font-display font-bold">YOU</span>
                  )}
                  {entry.user?.streak >= 5 && <span className="text-xs">🔥</span>}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-[#888899] font-mono-num">
                    Sharpe {entry.sharpeRatio.toFixed(2)}
                  </span>
                  {activeTab === "agents" && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2A2A3E] text-[#888899]">
                      {tier === "hf" ? category : entry.agent?.tradingStyle?.split("/")[0]}
                    </span>
                  )}
                  {activeTab === "players" && entry.agent && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2A2A3E] text-[#888899]">
                      w/ {entry.agent.name}
                    </span>
                  )}
                  {staked > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-neon-gold/10 text-neon-gold font-mono-num">
                      💰 {staked.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
              {/* Return */}
              <span className={`font-mono-num text-base font-bold ${entry.totalReturn >= 0 ? "text-neon-green" : "text-neon-pink"}`}>
                {entry.totalReturn >= 0 ? "+" : ""}{entry.totalReturn.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer attribution */}
      <div className="px-4 pb-4 text-center">
        <a href="https://www.perplexity.ai/computer" target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#555566]">
          Created with Perplexity Computer
        </a>
      </div>
    </div>
  );
}

function StatBar({ label, value, max, color, suffix = "", inverted = false }: {
  label: string; value: number; max: number; color: string; suffix?: string; inverted?: boolean;
}) {
  const pct = Math.min(Math.abs(value) / max * 100, 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-[#888899] w-16 font-display">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-[#2A2A3E] overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="font-mono-num text-[10px] w-12 text-right" style={{ color }}>
        {inverted ? "" : (value >= 0 ? "" : "")}{value.toFixed(1)}{suffix}
      </span>
    </div>
  );
}

function ScoreFactorRow({ emoji, label, weight, color, desc }: {
  emoji: string; label: string; weight: string; color: string; desc: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-sm mt-0.5">{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-display font-bold text-xs text-[#E8E8E8]">{label}</span>
          <span className="font-mono-num text-xs font-bold" style={{ color }}>{weight}</span>
        </div>
        <p className="text-[10px] text-[#888899] leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
