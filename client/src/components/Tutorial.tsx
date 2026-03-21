import { useState } from "react";
import { useLocation } from "wouter";

interface TutorialProps {
  onComplete: () => void;
}

const STEPS = [
  {
    id: "welcome",
    emoji: "⚔️",
    title: "Welcome to AlphaArena",
    subtitle: "AI Trading Arena",
    body: "Pick an AI agent, follow their trading signals, compete in prediction markets, and climb the leaderboard.",
    highlight: "No real money — all virtual credits.",
    gradient: "from-[#00FF88]/20 via-transparent to-transparent",
    accentColor: "#00FF88",
  },
  {
    id: "pick-agent",
    emoji: "🤖",
    title: "Step 1: Pick Your Agent",
    subtitle: "Your AI Trading Partner",
    body: "Choose from 6 meme companions (fun characters) or 19 hedge fund strategists (serious AI analysts). Your agent analyzes markets and gives you buy/sell signals.",
    highlight: "You can switch agents anytime.",
    gradient: "from-[#00D4FF]/20 via-transparent to-transparent",
    accentColor: "#00D4FF",
  },
  {
    id: "signals",
    emoji: "📡",
    title: "Step 2: Follow Signals",
    subtitle: "Your Agent's Trading Calls",
    body: "Your agent watches the market 24/7 and tells you:\n\n🟢 BULLISH = Buy (price going up)\n🔴 BEARISH = Sell (price going down)\n🟡 NEUTRAL = Hold\n\nEach signal shows confidence % and reasoning.",
    highlight: "Check the Signals tab for live calls.",
    gradient: "from-[#FFD700]/20 via-transparent to-transparent",
    accentColor: "#FFD700",
  },
  {
    id: "play",
    emoji: "🎮",
    title: "Step 3: Play & Earn",
    subtitle: "Two Ways to Compete",
    body: "Prediction Markets — Bet YES or NO on crypto questions like \"Will BTC go up in 24h?\" Win credits if you're right.\n\nH2H Duels — Challenge another player's agent. Pick a ticker, set a wager. Best AI signal wins the pot.",
    highlight: "Head to the Play tab to start.",
    gradient: "from-[#FF3B9A]/20 via-transparent to-transparent",
    accentColor: "#FF3B9A",
  },
  {
    id: "stake-arena",
    emoji: "🏆",
    title: "Step 4: Stake & Compete",
    subtitle: "Back Your Agent, Climb the Board",
    body: "Stake — Put credits on agents you believe in. If they perform well, you earn rewards.\n\nArena — The AI leaderboard ranks all agents by return, win rate, and Sharpe ratio. Follow the top performers.",
    highlight: "The more you play, the more you earn.",
    gradient: "from-[#00FF88]/20 via-transparent to-transparent",
    accentColor: "#00FF88",
  },
  {
    id: "advanced",
    emoji: "🧠",
    title: "Power Features",
    subtitle: "Go Deeper When Ready",
    body: "Glass Box — See exactly why your agent made each call. Full transparency.\n\nCommittees — Combine multiple agents into a team. They debate and produce a unified signal.\n\nResearch Tools — AI-powered market analysis at your fingertips.",
    highlight: "Explore these from the Home page tiles.",
    gradient: "from-[#00D4FF]/20 via-transparent to-transparent",
    accentColor: "#00D4FF",
  },
];

export default function Tutorial({ onComplete }: TutorialProps) {
  const [step, setStep] = useState(0);
  const [, navigate] = useLocation();
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete();
      navigate("/pick-agent");
    } else {
      setStep(step + 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ background: "linear-gradient(180deg, #0A0A0F 0%, #12121E 100%)" }}
    >
      {/* Skip button */}
      <div className="flex justify-end px-5 pt-4">
        <button
          onClick={handleSkip}
          data-testid="tutorial-skip"
          className="text-xs text-[#555566] hover:text-[#888899] font-display tracking-wide transition-colors px-3 py-1.5 rounded-lg"
        >
          Skip Tutorial
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Gradient glow behind emoji */}
        <div
          className={`w-40 h-40 rounded-full flex items-center justify-center mb-6 relative`}
          style={{
            background: `radial-gradient(circle, ${current.accentColor}15 0%, transparent 70%)`,
          }}
        >
          <span
            className="text-7xl"
            style={{
              filter: `drop-shadow(0 0 24px ${current.accentColor}60)`,
            }}
          >
            {current.emoji}
          </span>
          {/* Animated ring */}
          <div
            className="absolute inset-0 rounded-full border animate-ping"
            style={{
              borderColor: `${current.accentColor}20`,
              animationDuration: "3s",
            }}
          />
        </div>

        {/* Title */}
        <h1
          className="font-display font-black text-xl tracking-tight text-center"
          style={{ color: current.accentColor }}
        >
          {current.title}
        </h1>
        <p className="text-[#888899] text-xs font-display tracking-wider mt-1">
          {current.subtitle}
        </p>

        {/* Body text */}
        <div className="mt-5 max-w-[320px] w-full">
          <div className="rounded-2xl bg-[#1A1A2E]/80 border border-[#2A2A3E] p-5">
            {current.body.split("\n\n").map((para, i) => (
              <p
                key={i}
                className={`text-sm text-[#CCCCDD] leading-relaxed ${i > 0 ? "mt-3" : ""}`}
              >
                {para.split("\n").map((line, j) => (
                  <span key={j}>
                    {line}
                    {j < para.split("\n").length - 1 && <br />}
                  </span>
                ))}
              </p>
            ))}
          </div>

          {/* Highlight callout */}
          <div
            className="mt-3 rounded-xl px-4 py-2.5 flex items-center gap-2"
            style={{
              background: `${current.accentColor}10`,
              border: `1px solid ${current.accentColor}30`,
            }}
          >
            <span className="text-sm">💡</span>
            <p className="text-xs font-display font-semibold" style={{ color: current.accentColor }}>
              {current.highlight}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="px-6 pb-8">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-5">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className="transition-all"
              style={{
                width: i === step ? 24 : 8,
                height: 8,
                borderRadius: 4,
                background: i === step ? current.accentColor : "#2A2A3E",
              }}
            />
          ))}
        </div>

        {/* Next / Get Started button */}
        <button
          onClick={handleNext}
          data-testid="tutorial-next"
          className="w-full py-4 rounded-2xl font-display font-bold text-sm tracking-wide active:scale-[0.97] transition-transform"
          style={{
            background: isLast
              ? `linear-gradient(135deg, #00FF88 0%, #00D4FF 100%)`
              : current.accentColor,
            color: "#0A0A0F",
            boxShadow: `0 0 24px ${current.accentColor}40`,
          }}
        >
          {isLast ? "Pick Your Agent →" : "Next"}
        </button>

        {/* Back button */}
        {step > 0 && (
          <button
            onClick={() => setStep(step - 1)}
            className="w-full mt-2 py-2 text-xs text-[#888899] hover:text-[#E8E8E8] font-display transition-colors"
          >
            ← Back
          </button>
        )}
      </div>
    </div>
  );
}
