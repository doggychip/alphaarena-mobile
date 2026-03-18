import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

const LEAGUE_CONFIG = [
  { id: "diamond", label: "🏆 Diamond", color: "#00D4FF", maxRank: 10 },
  { id: "gold", label: "💎 Gold", color: "#FFD700", maxRank: 50 },
  { id: "silver", label: "🥈 Silver", color: "#C0C0C0", maxRank: 100 },
  { id: "bronze", label: "🥉 Bronze", color: "#CD7F32", maxRank: 9999 },
];

function getLeague(rank: number) {
  if (rank <= 10) return LEAGUE_CONFIG[0];
  if (rank <= 50) return LEAGUE_CONFIG[1];
  if (rank <= 100) return LEAGUE_CONFIG[2];
  return LEAGUE_CONFIG[3];
}

export default function Arena() {
  const [selectedLeague, setSelectedLeague] = useState("all");

  const { data: meData } = useQuery<any>({ queryKey: ["/api/me"] });
  const { data: leaderboardData } = useQuery<any>({ queryKey: ["/api/leaderboard"] });
  const { data: competitionData } = useQuery<any>({ queryKey: ["/api/competition"] });

  const competition = competitionData;
  const entries = leaderboardData?.entries || [];
  const myEntry = meData?.leaderboardEntry;
  const totalEntries = entries.length;

  // Filter by league
  const filteredEntries = selectedLeague === "all"
    ? entries
    : entries.filter((e: any) => {
        const league = getLeague(e.rank);
        return league.id === selectedLeague;
      });

  // Countdown to end
  const endDate = competition?.endDate ? new Date(competition.endDate) : null;
  const now = new Date();
  const daysLeft = endDate ? Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / 86400000)) : 0;

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

      {/* Your Rank Card */}
      {myEntry && (
        <div className="mx-4 mt-4 rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-4">
          <p className="text-xs text-[#888899] font-display mb-2">📊 Your Rank</p>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <span className="font-mono-num text-3xl font-bold text-neon-green">#{myEntry.rank}</span>
              <p className="text-[10px] text-[#888899] mt-0.5">of {totalEntries}</p>
            </div>
            <div className="flex-1 space-y-2">
              <StatBar label="Return" value={myEntry.totalReturn} max={50} color="#00FF88" suffix="%" />
              <StatBar label="Sharpe" value={myEntry.sharpeRatio} max={3} color="#00D4FF" />
              <StatBar label="Win Rate" value={myEntry.winRate} max={100} color="#FFD700" suffix="%" />
              <StatBar label="DrawDown" value={myEntry.maxDrawdown} max={30} color="#FF3B9A" suffix="%" inverted />
            </div>
          </div>
          <p className="text-xs text-neon-green mt-2 font-display">Up 3 spots today! 📈</p>
        </div>
      )}

      {/* League Selector */}
      <div className="mx-4 mt-4 flex gap-2 overflow-x-auto hide-scrollbar">
        <button
          onClick={() => setSelectedLeague("all")}
          className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-display font-bold transition-all ${
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
            className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-display font-bold transition-all ${
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

      {/* Daily Challenge */}
      <div className="mx-4 mt-4 rounded-2xl bg-gradient-to-r from-neon-gold/10 to-[#1A1A2E] border border-neon-gold/30 p-4">
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
        {filteredEntries.map((entry: any) => {
          const league = getLeague(entry.rank);
          const isMe = entry.userId === 1;
          return (
            <div
              key={entry.userId}
              data-testid={`leaderboard-entry-${entry.userId}`}
              className={`rounded-2xl bg-[#1A1A2E] border p-3 flex items-center gap-3 card-tap ${
                isMe ? "border-neon-green/50 glow-green" : "border-[#2A2A3E]"
              }`}
            >
              {/* Rank */}
              <div className="w-8 text-center">
                <span className="font-mono-num text-lg font-bold" style={{ color: league.color }}>
                  {entry.rank}
                </span>
              </div>
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-[#0A0A0F] flex items-center justify-center text-xl border border-[#2A2A3E]">
                {entry.agent?.avatarEmoji || "🤖"}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-display font-semibold text-sm text-[#E8E8E8] truncate">
                    {entry.user?.username}
                  </span>
                  {entry.user?.streak >= 5 && <span className="text-xs">🔥</span>}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-[#888899] font-mono-num">
                    Sharpe {entry.sharpeRatio.toFixed(2)}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2A2A3E] text-[#888899]">
                    {entry.agent?.tradingStyle?.split("/")[0]}
                  </span>
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
