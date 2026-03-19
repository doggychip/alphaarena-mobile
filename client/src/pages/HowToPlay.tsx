import { useState } from "react";
import { useLocation } from "wouter";

type Section = {
  id: string;
  emoji: string;
  title: string;
  content: React.ReactNode;
};

function Accordion({ section, isOpen, onToggle }: { section: Section; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] overflow-hidden transition-all">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-[#2A2A3E]/50 transition-colors"
      >
        <span className="text-2xl">{section.emoji}</span>
        <span className="font-display font-bold text-sm text-[#E8E8E8] flex-1">{section.title}</span>
        <span className={`text-[#888899] text-lg transition-transform ${isOpen ? "rotate-180" : ""}`}>▾</span>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 text-sm text-[#CCCCDD] leading-relaxed space-y-3 border-t border-[#2A2A3E]">
          <div className="pt-3">{section.content}</div>
        </div>
      )}
    </div>
  );
}

function Metric({ name, emoji, description }: { name: string; emoji: string; description: string }) {
  return (
    <div className="flex gap-3 py-2">
      <span className="text-lg flex-shrink-0">{emoji}</span>
      <div>
        <p className="font-display font-bold text-xs text-neon-cyan">{name}</p>
        <p className="text-xs text-[#888899] mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

export default function HowToPlay() {
  const [, navigate] = useLocation();
  const [openSection, setOpenSection] = useState<string | null>("what-is");

  const toggle = (id: string) => setOpenSection(prev => prev === id ? null : id);

  const sections: Section[] = [
    {
      id: "what-is",
      emoji: "⚔️",
      title: "What is AlphaArena?",
      content: (
        <div className="space-y-2">
          <p>AlphaArena is a simulated trading arena where AI agents compete to generate the best returns across crypto and equity markets.</p>
          <p>You pick an AI agent as your companion, follow their trading signals, place trades, and climb the leaderboard. Think of it as a fantasy league — but for AI-powered trading.</p>
          <div className="rounded-xl bg-[#12121A] border border-neon-green/20 p-3 mt-2">
            <p className="text-xs text-neon-green font-display font-bold">💡 No real money involved</p>
            <p className="text-[10px] text-[#888899] mt-1">All trades use virtual credits. This is a simulation for learning and entertainment.</p>
          </div>
        </div>
      ),
    },
    {
      id: "agents",
      emoji: "🤖",
      title: "Two Types of Agents",
      content: (
        <div className="space-y-3">
          <div className="rounded-xl bg-neon-pink/5 border border-neon-pink/20 p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-neon-pink/15 text-neon-pink border border-neon-pink/30 font-display font-bold">🎭 MEME</span>
              <span className="font-display font-bold text-xs text-[#E8E8E8]">Companion Agents</span>
            </div>
            <p className="text-xs text-[#888899]">Fun, meme-styled characters that accompany you on trades. They have personalities, catchphrases, and trading styles. Each meme agent is backed by real Hedge Fund agents behind the scenes.</p>
          </div>
          <div className="rounded-xl bg-neon-cyan/5 border border-neon-cyan/20 p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-neon-gold/15 text-neon-cyan border border-neon-cyan/30 font-display font-bold">🏦 HEDGE FUND</span>
              <span className="font-display font-bold text-xs text-[#E8E8E8]">AI Analyst Agents</span>
            </div>
            <p className="text-xs text-[#888899]">Specialized AI agents modeled after real hedge fund roles — Fundamentals Analyst, Technical Analyst, Sentiment Analyst, Risk Manager, and more. They analyze real market data and output trading signals with confidence scores.</p>
          </div>
          <p className="text-xs text-[#888899]">You can select agents of either tier from the <span className="text-neon-cyan">Stake</span> tab. Meme agents are great for casual play; HF agents let you follow the logic of sophisticated AI analysts.</p>
        </div>
      ),
    },
    {
      id: "signals",
      emoji: "📡",
      title: "Signals & Confidence",
      content: (
        <div className="space-y-3">
          <p>Hedge Fund agents analyze the market and produce <span className="text-neon-green font-display font-bold">signals</span> — actionable opinions on specific assets.</p>
          <div className="space-y-1">
            <Metric name="Signal Direction" emoji="🟢" description="BULLISH = agent thinks the price will go up. BEARISH = price will go down. NEUTRAL = no strong opinion." />
            <Metric name="Confidence %" emoji="🎯" description="How sure the agent is about this call. 90% = very confident. 50% = basically a coin flip. Higher confidence signals tend to be more reliable." />
            <Metric name="Target Price" emoji="🎯" description="The price the agent expects the asset to reach. Compare this to the current price to gauge potential upside or downside." />
            <Metric name="Reasoning" emoji="💬" description="A short explanation of why the agent made this call — could be technical patterns, sentiment shifts, or fundamental changes." />
          </div>
          <div className="rounded-xl bg-[#12121A] border border-neon-gold/20 p-3 mt-2">
            <p className="text-xs text-neon-gold font-display font-bold">⚠️ Pro Tip</p>
            <p className="text-[10px] text-[#888899] mt-1">Don't blindly follow every signal. Look at the agent's win rate and accuracy track record. A 90% confidence signal from an agent with 80% accuracy is more trustworthy than one from a 50% accuracy agent.</p>
          </div>
        </div>
      ),
    },
    {
      id: "metrics",
      emoji: "📊",
      title: "Key Metrics Explained",
      content: (
        <div className="space-y-1">
          <Metric name="Win Rate" emoji="🏆" description="The percentage of this agent's resolved signals that were correct. 60%+ is good, 70%+ is excellent." />
          <Metric name="Sharpe Ratio" emoji="📈" description="Risk-adjusted return measure. Higher = better returns for the risk taken. Above 1.0 is good, above 2.0 is exceptional. A Sharpe of 2.0 means 2x more return per unit of risk." />
          <Metric name="Max Drawdown" emoji="📉" description="The worst peak-to-trough decline in the portfolio. A drawdown of -15% means the portfolio once fell 15% from its highest point. Lower (closer to 0) is better." />
          <Metric name="Total Return" emoji="💰" description="How much the portfolio has gained or lost overall, as a percentage. +25% means a $100k portfolio is now worth $125k." />
          <Metric name="Avg Confidence" emoji="🔮" description="The average confidence level across all of this agent's signals. Higher means the agent is generally more decisive." />
          <Metric name="Risk Level" emoji="⚠️" description="LOW = conservative plays, smaller positions. MEDIUM = balanced approach. HIGH = aggressive bets, bigger swings. Match this to your comfort level." />
        </div>
      ),
    },
    {
      id: "trading",
      emoji: "💹",
      title: "How Trading Works",
      content: (
        <div className="space-y-2">
          <p>You start with <span className="text-neon-green font-display font-bold">$100,000</span> in virtual cash.</p>
          <div className="space-y-2">
            <div className="flex gap-2">
              <span className="text-sm flex-shrink-0 mt-0.5">1️⃣</span>
              <p className="text-xs text-[#888899]"><span className="text-[#E8E8E8]">Check signals</span> — see what your agents recommend on the Signals tab.</p>
            </div>
            <div className="flex gap-2">
              <span className="text-sm flex-shrink-0 mt-0.5">2️⃣</span>
              <p className="text-xs text-[#888899]"><span className="text-[#E8E8E8]">Quick Buy / Quick Sell</span> — tap the green or red button on the Home page to place a trade on any available pair.</p>
            </div>
            <div className="flex gap-2">
              <span className="text-sm flex-shrink-0 mt-0.5">3️⃣</span>
              <p className="text-xs text-[#888899]"><span className="text-[#E8E8E8]">Watch your portfolio</span> — your positions and P&L update in real time on the Home page.</p>
            </div>
            <div className="flex gap-2">
              <span className="text-sm flex-shrink-0 mt-0.5">4️⃣</span>
              <p className="text-xs text-[#888899]"><span className="text-[#E8E8E8]">Climb the leaderboard</span> — your total return determines your Arena rank. Beat other players!</p>
            </div>
          </div>
          <div className="rounded-xl bg-[#12121A] border border-neon-cyan/20 p-3 mt-2">
            <p className="text-xs text-neon-cyan font-display font-bold">🎮 Available Markets</p>
            <p className="text-[10px] text-[#888899] mt-1">Both crypto (BTC, ETH, SOL, DOGE, etc.) and equity (AAPL, TSLA, NVDA, etc.) markets are available. Prices update in real time.</p>
          </div>
        </div>
      ),
    },
    {
      id: "staking",
      emoji: "🔥",
      title: "How Staking Works",
      content: (
        <div className="space-y-2">
          <p>Staking lets you bet your <span className="text-neon-gold font-display font-bold">credits</span> on specific HF agents performing well.</p>
          <div className="space-y-2">
            <div className="flex gap-2">
              <span className="text-sm flex-shrink-0 mt-0.5">🪙</span>
              <p className="text-xs text-[#888899]"><span className="text-[#E8E8E8]">Stake credits</span> on an agent you believe in. If the agent's signals are correct, you earn reward credits.</p>
            </div>
            <div className="flex gap-2">
              <span className="text-sm flex-shrink-0 mt-0.5">📊</span>
              <p className="text-xs text-[#888899]"><span className="text-[#E8E8E8]">Rewards accrue</span> based on the agent's accuracy and your stake amount. Better-performing agents = higher rewards.</p>
            </div>
            <div className="flex gap-2">
              <span className="text-sm flex-shrink-0 mt-0.5">🏆</span>
              <p className="text-xs text-[#888899]"><span className="text-[#E8E8E8]">Staking rewards</span> show up in your Profile and contribute to your overall progression.</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "xp",
      emoji: "⭐",
      title: "XP, Levels & Streaks",
      content: (
        <div className="space-y-3">
          <p>Everything you do earns <span className="text-neon-gold font-display font-bold">XP</span> (experience points), which level you up.</p>
          <div className="rounded-xl bg-[#12121A] border border-[#2A2A3E] p-3">
            <p className="text-[10px] text-[#555566] font-display mb-2">XP Sources</p>
            <div className="space-y-1.5">
              <div className="flex justify-between"><span className="text-xs text-[#888899]">📊 Each trade</span><span className="text-xs text-neon-gold font-mono-num">+10 XP</span></div>
              <div className="flex justify-between"><span className="text-xs text-[#888899]">📅 Daily login</span><span className="text-xs text-neon-gold font-mono-num">+20 XP</span></div>
              <div className="flex justify-between"><span className="text-xs text-[#888899]">🔥 Streak bonus (7+ days)</span><span className="text-xs text-neon-gold font-mono-num">+50/day</span></div>
              <div className="flex justify-between"><span className="text-xs text-[#888899]">🏅 Achievements</span><span className="text-xs text-neon-gold font-mono-num">+100–500</span></div>
            </div>
          </div>
          <div className="rounded-xl bg-[#12121A] border border-[#2A2A3E] p-3">
            <p className="text-[10px] text-[#555566] font-display mb-2">Level Tiers</p>
            <div className="space-y-1.5">
              <div className="flex justify-between"><span className="text-xs" style={{ color: "#888899" }}>Newbie</span><span className="text-[10px] text-[#888899] font-mono-num">0 – 499 XP</span></div>
              <div className="flex justify-between"><span className="text-xs" style={{ color: "#00D4FF" }}>Trader</span><span className="text-[10px] text-[#888899] font-mono-num">500 – 1,999 XP</span></div>
              <div className="flex justify-between"><span className="text-xs" style={{ color: "#00FF88" }}>Degen</span><span className="text-[10px] text-[#888899] font-mono-num">2,000 – 4,999 XP</span></div>
              <div className="flex justify-between"><span className="text-xs" style={{ color: "#FFD700" }}>Whale</span><span className="text-[10px] text-[#888899] font-mono-num">5,000 – 9,999 XP</span></div>
              <div className="flex justify-between"><span className="text-xs" style={{ color: "#FF3B9A" }}>Legend</span><span className="text-[10px] text-[#888899] font-mono-num">10,000 – 19,999 XP</span></div>
              <div className="flex justify-between"><span className="text-xs" style={{ color: "#FF3B9A" }}>Gigachad</span><span className="text-[10px] text-[#888899] font-mono-num">20,000+ XP</span></div>
            </div>
          </div>
          <div className="rounded-xl bg-[#12121A] border border-neon-pink/20 p-3">
            <p className="text-xs text-neon-pink font-display font-bold">🔥 Streaks</p>
            <p className="text-[10px] text-[#888899] mt-1">Log in and trade every day to build a streak. After 7 consecutive days, your daily XP bonus jumps to +50. Longest streak is tracked in your Profile.</p>
          </div>
        </div>
      ),
    },
    {
      id: "tips",
      emoji: "💡",
      title: "Tips for Beginners",
      content: (
        <div className="space-y-2">
          <div className="flex gap-2">
            <span className="text-sm flex-shrink-0">✅</span>
            <p className="text-xs text-[#888899]">Start by following an agent with a high win rate and checking their signals before trading.</p>
          </div>
          <div className="flex gap-2">
            <span className="text-sm flex-shrink-0">✅</span>
            <p className="text-xs text-[#888899]">Don't go all-in on a single position. Diversify across a few assets.</p>
          </div>
          <div className="flex gap-2">
            <span className="text-sm flex-shrink-0">✅</span>
            <p className="text-xs text-[#888899]">Stake credits on agents you trust — it's an easy way to earn passive rewards.</p>
          </div>
          <div className="flex gap-2">
            <span className="text-sm flex-shrink-0">✅</span>
            <p className="text-xs text-[#888899]">Log in daily to keep your streak alive and maximize XP gains.</p>
          </div>
          <div className="flex gap-2">
            <span className="text-sm flex-shrink-0">✅</span>
            <p className="text-xs text-[#888899]">Tap on any agent in the Arena or Stake page to see their full stats, signals, and accuracy history.</p>
          </div>
          <div className="flex gap-2">
            <span className="text-sm flex-shrink-0">✅</span>
            <p className="text-xs text-[#888899]">Pay attention to the Trending section on Home — big movers often present trading opportunities.</p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 py-3 flex items-center gap-3" style={{ background: "rgba(10, 10, 15, 0.9)", backdropFilter: "blur(12px)" }}>
        <button onClick={() => window.history.back()} className="text-[#888899] hover:text-[#E8E8E8] text-lg">←</button>
        <h1 className="font-display font-bold text-lg text-[#E8E8E8]">📖 How to Play</h1>
      </header>

      {/* Hero */}
      <div className="mx-4 mt-2 rounded-2xl bg-gradient-to-br from-[#1A1A2E] to-[#0D1A2E] border border-neon-green/20 p-5 text-center">
        <span className="text-5xl">⚔️</span>
        <h2 className="font-display font-bold text-xl text-[#E8E8E8] mt-3">Welcome to AlphaArena</h2>
        <p className="text-xs text-[#888899] mt-2 leading-relaxed max-w-[280px] mx-auto">
          Your guide to competing in the AI trading arena. Tap any section below to learn more.
        </p>
      </div>

      {/* Quick Start Steps */}
      <div className="mx-4 mt-4 rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-4">
        <p className="text-xs text-[#888899] font-display mb-3">🚀 Quick Start (3 steps)</p>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-neon-green/20 border border-neon-green/40 flex items-center justify-center text-sm font-display font-bold text-neon-green flex-shrink-0">1</div>
            <div>
              <p className="text-xs text-[#E8E8E8] font-display font-bold">Pick your agent</p>
              <p className="text-[10px] text-[#888899]">Go to Stake tab → choose a meme or HF agent</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-neon-cyan/20 border border-neon-cyan/40 flex items-center justify-center text-sm font-display font-bold text-neon-cyan flex-shrink-0">2</div>
            <div>
              <p className="text-xs text-[#E8E8E8] font-display font-bold">Check signals & trade</p>
              <p className="text-[10px] text-[#888899]">View signals → Quick Buy/Sell from Home page</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-neon-gold/20 border border-neon-gold/40 flex items-center justify-center text-sm font-display font-bold text-neon-gold flex-shrink-0">3</div>
            <div>
              <p className="text-xs text-[#E8E8E8] font-display font-bold">Climb the leaderboard</p>
              <p className="text-[10px] text-[#888899]">Track your P&L → compete in the Arena</p>
            </div>
          </div>
        </div>
      </div>

      {/* Accordion Sections */}
      <div className="mx-4 mt-4 space-y-2">
        {sections.map(section => (
          <Accordion
            key={section.id}
            section={section}
            isOpen={openSection === section.id}
            onToggle={() => toggle(section.id)}
          />
        ))}
      </div>

      {/* CTA */}
      <div className="mx-4 mt-4 mb-4">
        <button
          onClick={() => navigate("/")}
          className="w-full py-4 rounded-2xl bg-neon-green text-black font-display font-bold text-sm glow-green active:scale-95 transition-transform"
        >
          Start Trading →
        </button>
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 text-center">
        <a href="https://www.perplexity.ai/computer" target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#555566]">
          Created with Perplexity Computer
        </a>
      </div>
    </div>
  );
}
