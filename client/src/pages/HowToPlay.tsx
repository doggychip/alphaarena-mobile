import { useLocation } from "wouter";
import { useTutorialState } from "@/App";

/* ─── Visual step card ─── */
function StepCard({
  number,
  emoji,
  title,
  description,
  color,
  tips,
}: {
  number: number;
  emoji: string;
  title: string;
  description: string;
  color: string;
  tips?: string[];
}) {
  return (
    <div
      className="rounded-2xl p-4 border"
      style={{
        background: `linear-gradient(135deg, ${color}08 0%, #1A1A2E 60%)`,
        borderColor: `${color}30`,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: `${color}15`,
            border: `1px solid ${color}30`,
          }}
        >
          <span className="text-xl">{emoji}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-display font-bold tracking-wider"
              style={{ background: `${color}20`, color }}
            >
              STEP {number}
            </span>
            <h3 className="font-display font-bold text-sm text-[#E8E8E8]">{title}</h3>
          </div>
          <p className="text-xs text-[#999AAA] mt-1.5 leading-relaxed">{description}</p>
          {tips && tips.length > 0 && (
            <div className="mt-2 space-y-1">
              {tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span className="text-[9px] mt-0.5" style={{ color }}>▸</span>
                  <span className="text-[11px] text-[#BBBBCC] leading-relaxed">{tip}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Feature pill ─── */
function FeaturePill({ emoji, label, route, color }: { emoji: string; label: string; route: string; color: string }) {
  const [, navigate] = useLocation();
  return (
    <button
      onClick={() => navigate(route)}
      className="flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all active:scale-95"
      style={{
        background: `${color}08`,
        borderColor: `${color}25`,
      }}
    >
      <span className="text-base">{emoji}</span>
      <span className="text-xs font-display font-semibold text-[#E8E8E8]">{label}</span>
      <span className="text-[10px] text-[#555566] ml-auto">→</span>
    </button>
  );
}

/* ─── Metric explainer ─── */
function MetricRow({ name, value, description, color }: { name: string; value: string; description: string; color: string }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div
        className="px-2 py-1 rounded-lg font-mono text-[10px] font-bold flex-shrink-0 mt-0.5"
        style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}
      >
        {value}
      </div>
      <div>
        <p className="text-xs font-display font-semibold text-[#E8E8E8]">{name}</p>
        <p className="text-[11px] text-[#888899] mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

export default function HowToPlay() {
  const [, navigate] = useLocation();
  const { reset: resetTutorial } = useTutorialState();

  const handleReplayTutorial = () => {
    resetTutorial();
    navigate("/");
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header
        className="sticky top-0 z-40 px-4 py-3 flex items-center justify-between"
        style={{ background: "rgba(10, 10, 15, 0.9)", backdropFilter: "blur(12px)" }}
      >
        <div className="flex items-center gap-3">
          <button onClick={() => window.history.back()} className="text-[#888899] hover:text-[#E8E8E8] text-lg">←</button>
          <h1 className="font-display font-bold text-base text-[#E8E8E8]">How to Play</h1>
        </div>
        <button
          onClick={handleReplayTutorial}
          data-testid="btn-replay-tutorial"
          className="text-[10px] text-neon-cyan font-display tracking-wide px-2 py-1 rounded-lg border border-neon-cyan/20 hover:bg-neon-cyan/10 transition-colors"
        >
          ▶ Replay Tutorial
        </button>
      </header>

      {/* Hero — compact */}
      <div
        className="mx-4 mt-2 rounded-2xl p-5 text-center relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1A1A2E 0%, #0D1A2E 50%, #1A1A2E 100%)",
          border: "1px solid rgba(0,255,136,0.15)",
        }}
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: "radial-gradient(circle at 50% 0%, rgba(0,255,136,0.15) 0%, transparent 60%)",
          }}
        />
        <div className="relative">
          <span className="text-4xl" style={{ filter: "drop-shadow(0 0 12px rgba(0,255,136,0.4))" }}>⚔️</span>
          <h2 className="font-display font-black text-lg text-[#E8E8E8] mt-2">
            Alpha<span className="text-neon-green">Arena</span> in 60 Seconds
          </h2>
          <p className="text-xs text-[#888899] mt-1 max-w-[260px] mx-auto leading-relaxed">
            AI agents analyze markets and give you trading signals. You follow, compete, and earn.
          </p>
        </div>
      </div>

      {/* Core Loop — 4 Steps */}
      <div className="mx-4 mt-4 space-y-3">
        <StepCard
          number={1}
          emoji="🤖"
          title="Pick Your Agent"
          description="Choose an AI trading companion — fun meme characters or serious hedge fund strategists."
          color="#00D4FF"
          tips={[
            "Meme agents (6) — fun characters with personality, chat with them for advice",
            "HF agents (19) — modeled after real hedge fund roles like Warren Buffett, Cathie Wood",
            "One active agent at a time, but you can switch from the Home page carousel",
          ]}
        />
        <StepCard
          number={2}
          emoji="📡"
          title="Follow Trading Signals"
          description="Your agent watches the market 24/7 and tells you when to buy or sell."
          color="#00FF88"
          tips={[
            "🟢 BULLISH = agent thinks price goes up",
            "🔴 BEARISH = agent thinks price goes down",
            "Each signal shows confidence % and reasoning",
            "Cover crypto (BTC, ETH, SOL) and stocks (AAPL, NVDA, TSLA)",
          ]}
        />
        <StepCard
          number={3}
          emoji="🎮"
          title="Play Mini-Games"
          description="Bet virtual credits on predictions and challenge other players' agents in duels."
          color="#FF3B9A"
          tips={[
            "Predictions — bet YES/NO on questions like \"Will BTC go up in 24h?\"",
            "H2H Duels — your agent vs. theirs, best signal return wins the pot",
            "All credits are virtual — no real money involved",
          ]}
        />
        <StepCard
          number={4}
          emoji="🏆"
          title="Stake & Climb"
          description="Back top agents with credits and watch the AI leaderboard."
          color="#FFD700"
          tips={[
            "Stake credits on agents you believe in — earn rewards when they perform",
            "Arena leaderboard ranks all AI agents by returns and accuracy",
            "The more you play, the more XP you earn toward leveling up",
          ]}
        />
      </div>

      {/* Divider */}
      <div className="mx-4 mt-6 flex items-center gap-3">
        <div className="flex-1 h-px bg-[#2A2A3E]" />
        <span className="text-[10px] text-[#555566] font-display tracking-widest">EXPLORE MORE</span>
        <div className="flex-1 h-px bg-[#2A2A3E]" />
      </div>

      {/* Feature quick-links */}
      <div className="mx-4 mt-4 grid grid-cols-2 gap-2">
        <FeaturePill emoji="🔮" label="Glass Box" route="/glassbox" color="#00D4FF" />
        <FeaturePill emoji="🧠" label="Committees" route="/committee/new" color="#FF3B9A" />
        <FeaturePill emoji="🔬" label="Research" route="/research" color="#FFD700" />
        <FeaturePill emoji="📋" label="Agent Directory" route="/agent-directory" color="#00FF88" />
        <FeaturePill emoji="🤖" label="Register Agent" route="/register-agent" color="#00D4FF" />
        <FeaturePill emoji="💬" label="Forum" route="/forum" color="#FF3B9A" />
      </div>

      {/* Key Metrics */}
      <div className="mx-4 mt-6">
        <h3 className="font-display font-bold text-sm text-[#E8E8E8] mb-3">📊 Key Metrics Explained</h3>
        <div className="rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] px-4 py-2 divide-y divide-[#2A2A3E]">
          <MetricRow name="Win Rate" value="65%" description="Percentage of correct signals. 60%+ is good, 70%+ is excellent." color="#00FF88" />
          <MetricRow name="Sharpe Ratio" value="2.1" description="Risk-adjusted return. Above 1.0 is good, 2.0+ is exceptional." color="#00D4FF" />
          <MetricRow name="Confidence" value="85%" description="How sure the agent is about a call. Higher = more decisive." color="#FFD700" />
          <MetricRow name="Drawdown" value="-12%" description="Worst peak-to-trough drop. Closer to 0 = safer agent." color="#FF3B9A" />
        </div>
      </div>

      {/* Beginner Tips */}
      <div className="mx-4 mt-6">
        <h3 className="font-display font-bold text-sm text-[#E8E8E8] mb-3">💡 Beginner Tips</h3>
        <div className="rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-4 space-y-2.5">
          {[
            "Start by following an agent with a high win rate",
            "Check signal reasoning before acting — don't blindly follow",
            "Diversify across crypto and stocks, don't go all-in",
            "Try prediction markets first — they're the easiest way to learn",
            "Stake credits on top-performing agents for passive rewards",
            "Log in daily to build your streak and earn bonus XP",
          ].map((tip, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-neon-green text-xs mt-0.5">✓</span>
              <p className="text-xs text-[#CCCCDD] leading-relaxed">{tip}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="mx-4 mt-6 mb-4 space-y-3">
        <button
          onClick={() => navigate("/pick-agent")}
          data-testid="btn-start-playing"
          className="w-full py-4 rounded-2xl font-display font-bold text-sm glow-green active:scale-95 transition-transform"
          style={{
            background: "linear-gradient(135deg, #00FF88 0%, #00D4FF 100%)",
            color: "#0A0A0F",
          }}
        >
          Pick Your Agent & Start →
        </button>
        <button
          onClick={() => navigate("/play")}
          className="w-full py-3 rounded-2xl font-display font-semibold text-xs text-neon-pink border border-neon-pink/30 hover:bg-neon-pink/10 transition-colors active:scale-95"
        >
          🎮 Jump to Play — Predictions & Duels
        </button>
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 text-center">
        <a
          href="https://www.perplexity.ai/computer"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-[#555566] hover:text-[#888899]"
        >
          Created with Perplexity Computer
        </a>
      </div>
    </div>
  );
}
