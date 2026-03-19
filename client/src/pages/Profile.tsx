import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const ACHIEVEMENT_DEFS: Record<string, { emoji: string; name: string; desc: string; xp: number }> = {
  first_blood: { emoji: "🎖️", name: "First Blood", desc: "Made your first trade", xp: 100 },
  on_fire: { emoji: "🔥", name: "On Fire", desc: "7 day winning streak", xp: 200 },
  diamond_hands: { emoji: "💎", name: "Diamond Hands", desc: "Held a position for 30 days", xp: 300 },
  whale_alert: { emoji: "🐋", name: "Whale Alert", desc: "Single trade over $10,000", xp: 300 },
  top_10: { emoji: "🏆", name: "Top 10", desc: "Reached top 10 on leaderboard", xp: 500 },
  sharpshooter: { emoji: "🎯", name: "Sharpshooter", desc: "Sharpe ratio above 2.0", xp: 400 },
  to_the_moon: { emoji: "🌙", name: "To The Moon", desc: "+50% total return", xp: 500 },
  streak_master: { emoji: "⚡", name: "Streak Master", desc: "30 day streak", xp: 500 },
  diversified: { emoji: "🌈", name: "Diversified", desc: "Hold 5+ different pairs", xp: 200 },
  paper_hands: { emoji: "🧻", name: "Paper Hands", desc: "Sold within 1 hour of buying", xp: 100 },
  hodl_king: { emoji: "👑", name: "HODL King", desc: "Never sold for 14 days straight", xp: 300 },
  speed_demon: { emoji: "⚡", name: "Speed Demon", desc: "10 trades in one day", xp: 200 },
};

function getLevelInfo(xp: number) {
  if (xp < 500) return { tier: "Newbie", level: Math.floor(xp / 100) + 1, nextXp: 500, color: "#888899" };
  if (xp < 2000) return { tier: "Trader", level: Math.floor((xp - 500) / 300) + 6, nextXp: 2000, color: "#00D4FF" };
  if (xp < 5000) return { tier: "Degen", level: Math.floor((xp - 2000) / 600) + 11, nextXp: 5000, color: "#00FF88" };
  if (xp < 10000) return { tier: "Whale", level: Math.floor((xp - 5000) / 1000) + 16, nextXp: 10000, color: "#FFD700" };
  if (xp < 20000) return { tier: "Legend", level: Math.floor((xp - 10000) / 2000) + 21, nextXp: 20000, color: "#FF3B9A" };
  return { tier: "Gigachad", level: Math.min(30, Math.floor((xp - 20000) / 3000) + 26), nextXp: xp + 3000, color: "#FF3B9A" };
}

export default function Profile() {
  const { user: authUser, logout } = useAuth();
  const [, navigate] = useLocation();

  const { data: meData } = useQuery<any>({ queryKey: ["/api/me"] });
  const { data: stakingRewards } = useQuery<any>({ queryKey: ["/api/staking/rewards"] });

  // Use authenticated user data if available, fall back to meData
  const user = authUser ?? meData?.user;
  const portfolio = meData?.portfolio;
  const leaderboard = meData?.leaderboardEntry;
  const achievements = meData?.achievements || [];
  const unlockedTypes = new Set(achievements.map((a: any) => a.achievementType));

  const xp = user?.xp || 0;
  const levelInfo = getLevelInfo(xp);
  const xpProgress = ((xp % 500) / 500) * 100;

  const totalReturn = leaderboard?.totalReturn || 0;
  const portfolioValue = portfolio?.totalEquity || 100000;
  const totalStakingRewards = (stakingRewards || []).reduce((sum: number, r: any) => sum + r.amount, 0);

  const stats = [
    { emoji: "📊", label: "Total Return", value: `${totalReturn >= 0 ? "+" : ""}${totalReturn.toFixed(1)}%`, color: totalReturn >= 0 ? "#00FF88" : "#FF3B9A" },
    { emoji: "🏆", label: "Best Rank", value: `#${leaderboard?.rank || "-"}`, color: "#FFD700" },
    { emoji: "🔥", label: "Longest Streak", value: `${user?.longestStreak || 0}d`, color: "#FF3B9A" },
    { emoji: "💰", label: "Credits", value: `${(user?.credits || 0).toLocaleString()}`, color: "#FFD700" },
    { emoji: "📈", label: "Staking Rewards", value: `+${totalStakingRewards.toLocaleString()}`, color: "#00FF88" },
    { emoji: "🎯", label: "Win Rate", value: `${leaderboard?.winRate?.toFixed(0) || 62}%`, color: "#FFD700" },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      // Clear guest flag too on explicit logout
      localStorage.removeItem("alphaarena_guest");
      navigate("/auth");
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 py-3" style={{ background: "rgba(10, 10, 15, 0.9)", backdropFilter: "blur(12px)" }}>
        <h1 className="font-display font-bold text-lg text-[#E8E8E8]">👤 Profile</h1>
      </header>

      {/* Login prompt for unauthenticated users */}
      {!authUser && (
        <div className="mx-4 mt-2 rounded-2xl bg-[#1A1A2E] border border-neon-green/20 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-display font-bold text-[#E8E8E8]">Not logged in</p>
            <p className="text-xs text-[#888899] mt-0.5">Login to track your progress</p>
          </div>
          <Button
            onClick={() => navigate("/auth")}
            className="font-display font-bold text-xs tracking-wider h-9 px-4 rounded-xl"
            style={{
              background: "linear-gradient(135deg, #00FF88 0%, #00D4FF 100%)",
              color: "#0A0A0F",
              boxShadow: "0 0 16px rgba(0,255,136,0.3)",
            }}
          >
            Login
          </Button>
        </div>
      )}

      {/* Profile Header */}
      <div className="mx-4 mt-2 rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-5 text-center">
        <div className="w-20 h-20 rounded-full bg-neon-green/20 border-3 border-neon-green mx-auto flex items-center justify-center text-3xl font-bold text-neon-green" style={{ borderWidth: 3 }}>
          {user?.username?.[0]?.toUpperCase() || "D"}
        </div>
        <h2 className="font-display font-bold text-xl text-[#E8E8E8] mt-3">{user?.username || "DegenRyan"}</h2>
        <p className="text-xs text-[#888899] mt-1">Joined {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "Feb 2026"}</p>
        <div className="flex items-center justify-center gap-3 mt-3">
          <span className="text-xs px-2 py-1 rounded-full bg-neon-gold/10 text-neon-gold border border-neon-gold/20 font-display font-bold">
            ⭐ {xp.toLocaleString()} XP
          </span>
          <span className="text-xs px-2 py-1 rounded-full bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 font-display font-bold" style={{ color: levelInfo.color }}>
            {levelInfo.tier}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mx-4 mt-4 grid grid-cols-3 gap-2">
        {stats.map((stat, i) => (
          <div key={i} className="rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-3 text-center">
            <span className="text-lg">{stat.emoji}</span>
            <p className="font-mono-num text-base font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
            <p className="text-[9px] text-[#888899] font-display mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Achievements */}
      <div className="mx-4 mt-4">
        <p className="text-xs text-[#888899] font-display mb-2">🏅 Achievements</p>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
          {Object.entries(ACHIEVEMENT_DEFS).map(([type, def]) => {
            const unlocked = unlockedTypes.has(type);
            return (
              <div
                key={type}
                className={`flex-shrink-0 w-[120px] rounded-2xl p-2.5 border transition-all ${
                  unlocked
                    ? "bg-[#1A1A2E] border-neon-gold/30"
                    : "bg-[#0D0D14] border-[#1A1A2E] opacity-50"
                }`}
              >
                <span className={`text-2xl ${unlocked ? "" : "grayscale blur-[2px]"}`}>
                  {unlocked ? def.emoji : "❓"}
                </span>
                <p className={`font-display font-bold text-[10px] leading-tight mt-1 ${unlocked ? "text-[#E8E8E8]" : "text-[#555566]"}`}>
                  {unlocked ? def.name : "???"}
                </p>
                <p className="text-[8px] leading-tight text-[#888899] mt-0.5 line-clamp-2">
                  {unlocked ? def.desc : "Keep trading to unlock"}
                </p>
                {unlocked && (
                  <span className="text-[8px] text-neon-gold font-mono-num mt-1 block">+{def.xp} XP</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* XP Progress */}
      <div className="mx-4 mt-4 rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-display font-bold text-sm text-neon-gold">⭐ Level Progress</span>
          <span className="font-mono-num text-xs text-[#888899]">
            Level {user?.level || 12} → Level {(user?.level || 12) + 1}
          </span>
        </div>
        <div className="w-full h-3 rounded-full bg-[#2A2A3E] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-neon-gold to-neon-green transition-all"
            style={{ width: `${xpProgress}%` }}
          />
        </div>
        <p className="font-mono-num text-xs text-[#888899] mt-1">{xp % 500}/500 XP to next level</p>

        <div className="mt-3 space-y-1">
          <XPSource label="Trades" value="+10 XP" emoji="📊" />
          <XPSource label="Daily Login" value="+20 XP" emoji="📅" />
          <XPSource label="Streak Bonus" value="+50/day" emoji="🔥" />
          <XPSource label="Achievements" value="+100-500" emoji="🏅" />
        </div>
      </div>

      {/* Settings */}
      <div className="mx-4 mt-4 rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-4">
        <p className="text-xs text-[#888899] font-display mb-3">⚙️ Settings</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-[#E8E8E8]">🌙 Theme</span>
            <span className="text-xs text-[#888899] bg-[#2A2A3E] px-3 py-1 rounded-full">Dark Only 😎</span>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-[#2A2A3E]">
            <span className="text-sm text-[#E8E8E8]">🔔 Notifications</span>
            <div className="w-10 h-6 rounded-full bg-neon-green/20 border border-neon-green/40 relative">
              <div className="w-4 h-4 rounded-full bg-neon-green absolute right-1 top-0.5" />
            </div>
          </div>

          {/* Logout / Login action */}
          {authUser ? (
            <div className="flex items-center justify-between py-2 border-t border-[#2A2A3E]">
              <span className="text-sm text-[#E8E8E8]">🚪 Account</span>
              <button
                onClick={handleLogout}
                className="text-xs text-[#FF3B9A] bg-[#FF3B9A]/10 border border-[#FF3B9A]/20 hover:bg-[#FF3B9A]/20 px-3 py-1 rounded-full transition-colors font-display font-semibold"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between py-2 border-t border-[#2A2A3E]">
              <span className="text-sm text-[#E8E8E8]">🔑 Account</span>
              <button
                onClick={() => navigate("/auth")}
                className="text-xs text-neon-green bg-neon-green/10 border border-neon-green/20 hover:bg-neon-green/20 px-3 py-1 rounded-full transition-colors font-display font-semibold"
              >
                Login
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer attribution */}
      <div className="px-4 pb-4 mt-4 text-center">
        <a href="https://www.perplexity.ai/computer" target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#555566]">
          Created with Perplexity Computer
        </a>
      </div>
    </div>
  );
}

function XPSource({ label, value, emoji }: { label: string; value: string; emoji: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-[#888899]">{emoji} {label}</span>
      <span className="font-mono-num text-xs text-neon-gold">{value}</span>
    </div>
  );
}
