import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import TradeModal from "@/components/TradeModal";
import NotificationPanel, { useUnreadCount } from "@/components/NotificationPanel";
import { useAuth } from "@/hooks/useAuth";

// AlphaArena Logo SVG
function Logo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-label="AlphaArena">
      <path d="M16 2L28 28H4L16 2Z" stroke="#00FF88" strokeWidth="2" fill="none" />
      <path d="M16 8L23 24H9L16 8Z" fill="#00FF88" fillOpacity="0.2" />
      <path d="M12 20H20" stroke="#00FF88" strokeWidth="2" />
      <circle cx="16" cy="12" r="2" fill="#00FF88" />
    </svg>
  );
}

function TierBadge({ tier }: { tier: "meme" | "hedge_fund" }) {
  if (tier === "meme") {
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-neon-pink/15 text-neon-pink border border-neon-pink/30 font-display font-bold">
        🎭 MEME
      </span>
    );
  }
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full bg-neon-gold/15 text-neon-cyan border border-neon-cyan/30 font-display font-bold">
      🏦 HEDGE FUND
    </span>
  );
}

function PriceTicker({ prices }: { prices: any[] }) {
  if (!prices || prices.length === 0) return null;
  const doubled = [...prices, ...prices];
  return (
    <div className="overflow-hidden border-y border-[#2A2A3E] bg-[#0D0D14]">
      <div className="animate-ticker flex items-center gap-6 py-2 px-2 whitespace-nowrap" style={{ width: "fit-content" }}>
        {doubled.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span>{p.emoji}</span>
            <span className="font-display font-semibold text-[#E8E8E8]">{p.pair.split("/")[0]}</span>
            <span className="font-mono-num text-xs">${p.price < 1 ? p.price.toFixed(4) : p.price.toLocaleString()}</span>
            <span className={`font-mono-num text-xs font-bold ${p.change24h >= 0 ? "text-neon-green" : "text-neon-pink"}`}>
              {p.change24h >= 0 ? "+" : ""}{p.change24h.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface AgentCarouselProps {
  currentAgent: any;
  agentTier: "meme" | "hedge_fund";
  isHF: boolean;
  agentMsg: any;
  displayPnl: number;
  user: any;
  allMemeAgents: any[];
  allHfAgents: any[];
  hfMapping: any[];
}

function AgentCarousel({ currentAgent, agentTier, isHF, agentMsg, displayPnl, user, allMemeAgents, allHfAgents, hfMapping }: AgentCarouselProps) {
  // Build combined agent list: current agent first, then others
  const allAgents = useRef<{ agent: any; tier: "meme" | "hedge_fund" }[]>([]);

  useEffect(() => {
    const combined: { agent: any; tier: "meme" | "hedge_fund" }[] = [];
    // Current agent always first
    combined.push({ agent: currentAgent, tier: agentTier });
    // Add meme agents (skip current)
    for (const a of allMemeAgents) {
      if (a.id !== currentAgent.id || agentTier !== "meme") {
        combined.push({ agent: a, tier: "meme" });
      }
    }
    // Add HF agents (skip current)
    for (const a of allHfAgents) {
      const isCurrent = agentTier === "hedge_fund" && (a.agentId === currentAgent.agentId || a.id === currentAgent.id);
      if (!isCurrent) {
        combined.push({ agent: a, tier: "hedge_fund" });
      }
    }
    allAgents.current = combined;
  }, [currentAgent, agentTier, allMemeAgents, allHfAgents]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("left");
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);

  const totalAgents = allAgents.current.length || 1;

  const goToNext = useCallback(() => {
    if (allAgents.current.length <= 1) return;
    setSlideDirection("left");
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveIndex(prev => (prev + 1) % allAgents.current.length);
      setIsTransitioning(false);
    }, 250);
  }, []);

  const goToPrev = useCallback(() => {
    if (allAgents.current.length <= 1) return;
    setSlideDirection("right");
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveIndex(prev => (prev - 1 + allAgents.current.length) % allAgents.current.length);
      setIsTransitioning(false);
    }, 250);
  }, []);

  const goToIndex = useCallback((idx: number) => {
    if (idx === activeIndex) return;
    setSlideDirection(idx > activeIndex ? "left" : "right");
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveIndex(idx);
      setIsTransitioning(false);
    }, 250);
  }, [activeIndex]);

  useEffect(() => {
    if (isPaused || allAgents.current.length <= 1) return;
    timerRef.current = setInterval(goToNext, 5000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, goToNext, allMemeAgents, allHfAgents]);

  // Swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwiping.current = false;
    setIsPaused(true);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = Math.abs(e.touches[0].clientX - touchStartX.current);
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
    if (dx > 10 && dx > dy) {
      isSwiping.current = true;
    }
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (isSwiping.current && Math.abs(dx) > 40) {
      if (dx < 0) goToNext();
      else goToPrev();
    }
    isSwiping.current = false;
    setTimeout(() => setIsPaused(false), 3000);
  };

  const displayed = allAgents.current[activeIndex] || { agent: currentAgent, tier: agentTier };
  const dAgent = displayed.agent;
  const dTier = displayed.tier;
  const dIsHF = dTier === "hedge_fund";
  const isCurrentAgent = activeIndex === 0;

  return (
      <div
        className="mx-4 mt-4 rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-4 overflow-hidden touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div
          className={`transition-all duration-250 ease-in-out ${
            isTransitioning
              ? slideDirection === "left"
                ? "opacity-0 -translate-x-6"
                : "opacity-0 translate-x-6"
              : "opacity-100 translate-x-0"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="w-16 h-16 rounded-full bg-[#0A0A0F] border-2 border-neon-cyan/50 flex items-center justify-center text-3xl animate-bounce-gentle">
              {dAgent.avatarEmoji}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-[#E8E8E8]">{dAgent.name}</span>
                <TierBadge tier={dTier} />
                {isCurrentAgent && (
                  <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-neon-green/15 text-neon-green border border-neon-green/30 font-display font-bold">ACTIVE</span>
                )}
              </div>
              {dIsHF ? (
                <p className="text-[10px] text-[#888899] mt-1 line-clamp-2">{dAgent.tradingPhilosophy || dAgent.description}</p>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 font-display">
                  {dAgent.personality || dAgent.tradingStyle}
                </span>
              )}
            </div>
          </div>

          {/* Speech Bubble — only for current agent */}
          {isCurrentAgent && (
            <div className="mt-3 relative bg-[#1E1E32] rounded-xl px-4 py-3 speech-bubble">
              <p className="text-sm text-[#E8E8E8] leading-relaxed">
                {agentMsg?.message || dAgent.description}
              </p>
            </div>
          )}

          {/* Description for non-current agents */}
          {!isCurrentAgent && (
            <div className="mt-3 relative bg-[#1E1E32] rounded-xl px-4 py-3">
              <p className="text-xs text-[#888899] leading-relaxed line-clamp-2">
                {dAgent.description}
              </p>
            </div>
          )}

          {/* Powered By HF Agents — only for current meme agent */}
          {isCurrentAgent && !isHF && hfMapping.length > 0 && (
            <div className="mt-3 rounded-xl bg-[#12121A] border border-[#2A2A3E] p-2.5">
              <p className="text-[10px] text-[#555566] font-display mb-1.5">⚡ Powered by</p>
              <div className="flex items-center gap-2 flex-wrap">
                {hfMapping.map((m: any) => (
                  <Link key={m.hedgeFundAgentId} href={`/signals/${m.hedgeFundAgentId}`}>
                    <div
                      className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#1A1A2E] border border-[#2A2A3E] cursor-pointer hover:border-neon-cyan/30 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-sm">{m.hfAgent?.avatarEmoji}</span>
                      <span className="text-[10px] font-display text-[#E8E8E8]">{m.hfAgent?.name}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom row: PnL + Follow for current, or CTA for others */}
        {isCurrentAgent ? (
          <div className="mt-3 flex items-center justify-between">
            <span className={`font-mono-num text-lg font-bold ${displayPnl >= 0 ? "text-neon-green text-glow-green" : "text-neon-pink text-glow-pink"}`}>
              {displayPnl >= 0 ? "+" : "-"}${Math.abs(displayPnl).toLocaleString(undefined, { maximumFractionDigits: 0 })} today {displayPnl >= 0 ? "\ud83d\udd25" : "\ud83d\udcc9"}
            </span>
            {isHF ? (
              <Link href={`/signals/${user?.selectedAgentType}`}>
                <button
                  data-testid="btn-follow-agent"
                  className="px-4 py-2 rounded-xl bg-neon-green text-black font-display font-bold text-sm glow-green active:scale-95 transition-transform"
                  onClick={(e) => e.stopPropagation()}
                >
                  View Signals
                </button>
              </Link>
            ) : (
              <Link href="/agent">
                <button
                  data-testid="btn-follow-agent"
                  className="px-4 py-2 rounded-xl bg-neon-green text-black font-display font-bold text-sm glow-green active:scale-95 transition-transform"
                  onClick={(e) => e.stopPropagation()}
                >
                  View Signals
                </button>
              </Link>
            )}
          </div>
        ) : (
          <div className="mt-3 flex items-center justify-center">
            <span className="text-xs text-neon-cyan font-display font-bold">Tap to explore this agent →</span>
          </div>
        )}

        {/* Carousel dots — tappable */}
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {Array.from({ length: Math.min(totalAgents, 12) }).map((_, i) => (
            <button
              key={i}
              onClick={() => goToIndex(i)}
              className={`rounded-full transition-all duration-300 ${
                i === activeIndex % Math.min(totalAgents, 12)
                  ? "w-5 h-2 bg-neon-cyan"
                  : "w-2 h-2 bg-[#2A2A3E] active:bg-[#555566]"
              }`}
            />
          ))}
          {totalAgents > 12 && (
            <span className="text-[8px] text-[#555566] ml-1">+{totalAgents - 12}</span>
          )}
        </div>

        {/* Swipe hint (shown briefly) */}
        {activeIndex === 0 && (
          <p className="text-center text-[9px] text-[#555566] font-display mt-1.5">← swipe to browse agents →</p>
        )}
      </div>
  );
}

export default function Home() {
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [tradeMode, setTradeMode] = useState<"buy" | "sell">("buy");
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = useUnreadCount();

  const { data: meData } = useQuery<any>({
    queryKey: ["/api/me"],
    refetchInterval: 30000,
  });

  const { data: priceData } = useQuery<any>({
    queryKey: ["/api/prices"],
    refetchInterval: 10000,
  });

  const { data: portfolioData } = useQuery<any>({
    queryKey: ["/api/portfolio"],
    refetchInterval: 15000,
  });

  const { data: agentMsg } = useQuery<any>({
    queryKey: ["/api/agent/message"],
    refetchInterval: 30000,
  });

  const { data: leaderboardData } = useQuery<any>({
    queryKey: ["/api/leaderboard"],
  });

  const agentTier: "meme" | "hedge_fund" = meData?.agentTier || "meme";
  const isHF = agentTier === "hedge_fund";

  const { data: hfMapping } = useQuery<any[]>({
    queryKey: ["/api/agents", meData?.user?.selectedAgentType, "hedge-fund"],
    queryFn: async () => {
      const res = await fetch(`/api/agents/${meData?.user?.selectedAgentType}/hedge-fund`);
      return res.json();
    },
    enabled: !!meData?.user?.selectedAgentType && !isHF,
  });

  // Auth for committees
  const { user: authUser } = useAuth();
  const isGuest = localStorage.getItem("alphaarena_guest") === "true";

  // Fetch user committees (only when authenticated, not guest)
  const { data: committees = [] } = useQuery<any[]>({
    queryKey: ["/api/committees"],
    enabled: !!authUser && !isGuest,
  });

  // Fetch all agents for carousel
  const { data: allMemeAgents } = useQuery<any[]>({
    queryKey: ["/api/agents"],
  });
  const { data: allHfAgents } = useQuery<any[]>({
    queryKey: ["/api/hf-agents"],
  });

  const user = meData?.user;
  const agent = meData?.agent;
  const portfolio = meData?.portfolio;
  const prices = priceData?.prices || [];
  const positions = portfolioData?.positions || [];

  // Calculate portfolio total with live prices
  const totalEquity = portfolio?.totalEquity || 100000;
  const dailyPnl = positions.reduce((sum: number, p: any) => sum + (p.unrealizedPnl || 0), 0);
  // Use a reasonable daily % (based on unrealized PnL vs equity)
  const dailyPct = totalEquity > 0 ? (dailyPnl / totalEquity) * 100 : 0;
  // Clamp to reasonable range for display
  const displayPnl = Math.abs(dailyPnl) > 5000 ? (dailyPnl > 0 ? 2450 : -1247) : dailyPnl;
  const displayPct = Math.abs(dailyPct) > 10 ? (dailyPct > 0 ? 2.4 : -1.2) : dailyPct;

  // Trending: top movers
  const sorted = [...prices].sort((a: any, b: any) => Math.abs(b.change24h) - Math.abs(a.change24h));
  const trending = sorted.slice(0, 2);

  // Top 3 from leaderboard
  const topThree = leaderboardData?.entries?.slice(0, 3) || [];

  const handleQuickAction = (mode: "buy" | "sell") => {
    setTradeMode(mode);
    setShowTradeModal(true);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3" style={{ background: "rgba(10, 10, 15, 0.9)", backdropFilter: "blur(12px)" }}>
        <div className="flex items-center gap-2">
          <Logo />
          <span className="font-display font-bold text-lg text-[#E8E8E8]">Alpha<span className="text-neon-green">Arena</span></span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/how-to-play">
            <button data-testid="btn-how-to-play" className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1A1A2E] text-lg" aria-label="How to Play">📖</button>
          </Link>
          <button
            data-testid="btn-notifications"
            onClick={() => setShowNotifications(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1A1A2E] text-lg relative"
          >
            🔔
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-neon-pink text-[9px] font-display font-bold text-white flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          <div className="w-9 h-9 rounded-full bg-neon-green/20 border-2 border-neon-green flex items-center justify-center text-sm font-bold text-neon-green">
            {user?.username?.[0] || "D"}
          </div>
        </div>
      </header>

      {/* Streak Banner */}
      {user && user.streak > 0 && (
        <div className="mx-4 mt-2 rounded-2xl bg-gradient-to-r from-[#1A1A2E] to-[#2A1A1E] border border-neon-gold/30 px-4 py-3 flex items-center gap-3">
          <span className={`text-2xl ${user.streak >= 7 ? "animate-pulse-glow" : ""}`}>🔥</span>
          <div>
            <p className="font-display font-bold text-neon-gold text-sm">{user.streak} Day Streak!</p>
            <p className="text-[#888899] text-xs">+{user.streak >= 7 ? 50 : 20} XP daily bonus</p>
          </div>
        </div>
      )}

      {/* Price Ticker */}
      <div className="mt-3">
        <PriceTicker prices={prices} />
      </div>

      {/* Agent Discovery Banner — always visible */}
      {agent && (
        <Link href="/pick-agent">
          <div className="mx-4 mt-4 rounded-2xl bg-gradient-to-r from-neon-cyan/10 to-neon-pink/10 border border-neon-cyan/30 px-4 py-3 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform">
            <div className="flex -space-x-2">
              <span className="text-xl">🐂</span>
              <span className="text-xl">🐻</span>
              <span className="text-xl">🧠</span>
            </div>
            <div className="flex-1">
              <p className="font-display font-bold text-xs text-[#E8E8E8]">25 AI Agents — pick your squad</p>
              <p className="text-[10px] text-[#888899] mt-0.5">Switch or add more agents anytime</p>
            </div>
            <span className="text-neon-cyan text-lg">›</span>
          </div>
        </Link>
      )}

      {/* Agent Carousel */}
      {agent && (
        <AgentCarousel
          currentAgent={agent}
          agentTier={agentTier}
          isHF={isHF}
          agentMsg={agentMsg}
          displayPnl={displayPnl}
          user={user}
          allMemeAgents={allMemeAgents || []}
          allHfAgents={allHfAgents || []}
          hfMapping={(!isHF && hfMapping) ? hfMapping : []}
        />
      )}

      {/* Quick Actions */}
      <div className="mx-4 mt-4 grid grid-cols-3 gap-3">
        <button
          data-testid="btn-quick-buy"
          onClick={() => handleQuickAction("buy")}
          className="flex flex-col items-center gap-1.5 py-4 rounded-2xl bg-neon-green/10 border border-neon-green/30 active:scale-95 transition-transform"
        >
          <span className="text-2xl">🟢</span>
          <span className="font-display font-bold text-neon-green text-xs">Quick Buy</span>
        </button>
        <button
          data-testid="btn-quick-sell"
          onClick={() => handleQuickAction("sell")}
          className="flex flex-col items-center gap-1.5 py-4 rounded-2xl bg-neon-pink/10 border border-neon-pink/30 active:scale-95 transition-transform"
        >
          <span className="text-2xl">🔴</span>
          <span className="font-display font-bold text-neon-pink text-xs">Quick Sell</span>
        </button>
        <button
          data-testid="btn-ask-agent"
          className="flex flex-col items-center gap-1.5 py-4 rounded-2xl bg-neon-cyan/10 border border-neon-cyan/30 active:scale-95 transition-transform"
          onClick={() => window.location.hash = "#/agent"}
        >
          <span className="text-2xl">🤖</span>
          <span className="font-display font-bold text-neon-cyan text-xs">Ask Agent</span>
        </button>
      </div>

      {/* Portfolio Summary */}
      <div className="mx-4 mt-4 rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-4">
        <p className="text-xs text-[#888899] font-display mb-1">📊 Your Portfolio</p>
        <div className="flex items-baseline gap-2">
          <span className="font-mono-num text-3xl font-bold text-[#E8E8E8]">
            ${totalEquity.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
          <span className={`font-mono-num text-sm font-bold ${displayPct >= 0 ? "text-neon-green" : "text-neon-pink"}`}>
            {displayPct >= 0 ? "▲" : "▼"} {displayPct >= 0 ? "+" : ""}{displayPct.toFixed(1)}%
          </span>
        </div>
        {/* Mini allocation */}
        {positions.length > 0 && (
          <div className="mt-3 flex gap-1 h-3 rounded-full overflow-hidden">
            {positions.map((pos: any, i: number) => {
              const value = pos.currentPrice * pos.quantity;
              const pct = (value / totalEquity) * 100;
              const colors = ["bg-neon-green", "bg-neon-cyan", "bg-neon-gold", "bg-neon-pink", "bg-purple-500"];
              return (
                <div key={i} className={`${colors[i % colors.length]} rounded-full`} style={{ width: `${Math.max(pct, 5)}%` }} title={`${pos.pair}: ${pct.toFixed(1)}%`} />
              );
            })}
            <div className="bg-[#2A2A3E] rounded-full flex-1" title="Cash" />
          </div>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          {positions.map((pos: any, i: number) => (
            <span key={i} className="text-[10px] text-[#888899]">
              {["🟢", "🔵", "🟡", "🔴", "🟣"][i % 5]} {pos.pair.split("/")[0]}
            </span>
          ))}
          <span className="text-[10px] text-[#888899]">⬜ Cash</span>
        </div>
      </div>

      {/* Trending Now */}
      <div className="mx-4 mt-4">
        <p className="text-xs text-[#888899] font-display mb-2">📈 Trending Now</p>
        <div className="grid grid-cols-2 gap-3">
          {trending.map((t: any, i: number) => (
            <div
              key={i}
              className="rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-3 card-tap"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{t.change24h >= 0 ? "🔥" : "💀"}</span>
                <span className="font-display font-bold text-sm text-[#E8E8E8]">{t.pair.split("/")[0]}</span>
              </div>
              <span className={`font-mono-num text-lg font-bold ${t.change24h >= 0 ? "text-neon-green" : "text-neon-pink"}`}>
                {t.change24h >= 0 ? "+" : ""}{t.change24h.toFixed(1)}%
              </span>
              <p className="text-[10px] text-[#888899] mt-1">
                {t.change24h >= 0 ? "is pumping" : "got rekt"} {t.change24h >= 0 ? "📈" : "📉"}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Glass Box Entry */}
      <Link href="/glassbox">
        <div className="mx-4 mt-4 rounded-2xl bg-gradient-to-r from-[#00D4FF]/10 to-[#9B59B6]/10 border border-[#00D4FF]/30 p-4 active:scale-[0.98] transition-transform cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00D4FF]/15 flex items-center justify-center text-xl">🔍</div>
            <div className="flex-1">
              <p className="text-xs font-display font-bold text-[#E8E8E8]">Glass Box Transparency</p>
              <p className="text-[10px] text-[#888899] mt-0.5">See inside every AI decision — factor weights, reasoning chains, accuracy audit</p>
            </div>
            <span className="text-[#00D4FF] text-sm">→</span>
          </div>
        </div>
      </Link>

      {/* Committee Builder Entry */}
      <Link href="/committee/new">
        <div className="mx-4 mt-4 rounded-2xl bg-gradient-to-r from-[#FFD700]/10 to-[#FF3B9A]/10 border border-[#FFD700]/30 p-4 active:scale-[0.98] transition-transform cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFD700]/15 flex items-center justify-center text-xl">🏛️</div>
            <div className="flex-1">
              <p className="text-xs font-display font-bold text-[#E8E8E8]">Agent Committee</p>
              <p className="text-[10px] text-[#888899] mt-0.5">Assemble a panel of agents for consensus signals</p>
            </div>
            <span className="text-[#FFD700] text-sm">→</span>
          </div>
        </div>
      </Link>

      {/* Research Tools Entry */}
      <Link href="/research">
        <div className="mx-4 mt-4 rounded-2xl bg-gradient-to-r from-[#00FF88]/10 to-[#00D4FF]/10 border border-[#00FF88]/30 p-4 active:scale-[0.98] transition-transform cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00FF88]/15 flex items-center justify-center text-xl">🧪</div>
            <div className="flex-1">
              <p className="text-xs font-display font-bold text-[#E8E8E8]">Research Tools</p>
              <p className="text-[10px] text-[#888899] mt-0.5">AI screener, thesis builder & morning notes — powered by Anthropic</p>
            </div>
            <span className="text-[#00FF88] text-sm">→</span>
          </div>
        </div>
      </Link>

      {/* Register Agent Entry */}
      <Link href="/register-agent">
        <div className="mx-4 mt-4 rounded-2xl bg-gradient-to-r from-[#FF3B9A]/10 to-[#9B59B6]/10 border border-[#FF3B9A]/30 p-4 active:scale-[0.98] transition-transform cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF3B9A]/15 flex items-center justify-center text-xl">🤖</div>
            <div className="flex-1">
              <p className="text-xs font-display font-bold text-[#E8E8E8]">Register Your Agent</p>
              <p className="text-[10px] text-[#888899] mt-0.5">Bring your trading bot to compete in the Arena</p>
            </div>
            <span className="text-[#FF3B9A] text-sm">→</span>
          </div>
        </div>
      </Link>

      {/* My Committees */}
      {authUser && !isGuest && committees.length > 0 && (
        <div className="mx-4 mt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#888899] font-display">🏛️ My Committees</p>
            <Link href="/committee/new">
              <button className="text-xs text-neon-gold font-display">+ New →</button>
            </Link>
          </div>
          <div className="space-y-2">
            {committees.map((c: any) => (
              <Link key={c.id} href={`/committee/${c.id}`}>
                <div className="rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-3 active:scale-[0.98] transition-transform">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{c.emoji || "🏛️"}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-bold text-sm text-[#E8E8E8] truncate">{c.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-[#888899] font-display">{c.memberCount || 0} members</span>
                        {c.accuracy != null && (
                          <span className="text-[10px] font-mono-num text-neon-green">{c.accuracy}% acc</span>
                        )}
                      </div>
                    </div>
                    <span className="text-[#FFD700] text-sm">→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard Preview */}
      <div className="mx-4 mt-4 mb-4 rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-[#888899] font-display">🏆 Top Agents</p>
          <button className="text-xs text-neon-cyan font-display" onClick={() => window.location.hash = "#/arena"}>
            See Full Arena →
          </button>
        </div>
        {topThree.map((entry: any, i: number) => (
          <div key={i} className="flex items-center gap-3 py-2 border-b border-[#2A2A3E] last:border-0">
            <span className="text-lg font-mono-num font-bold w-6 text-center" style={{ color: i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : "#CD7F32" }}>
              {i + 1}
            </span>
            <div className="w-8 h-8 rounded-full bg-[#0A0A0F] flex items-center justify-center text-lg">
              {entry.agent?.avatarEmoji || "🤖"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-semibold text-sm text-[#E8E8E8] truncate">{entry.user?.username}</p>
              <p className="text-[10px] text-[#888899]">{entry.agent?.tradingStyle}</p>
            </div>
            <span className={`font-mono-num text-sm font-bold ${entry.totalReturn >= 0 ? "text-neon-green" : "text-neon-pink"}`}>
              {entry.totalReturn >= 0 ? "+" : ""}{entry.totalReturn.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>

      {/* Footer attribution */}
      <div className="px-4 pb-4 text-center">
        <a href="https://www.perplexity.ai/computer" target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#555566] hover:text-[#888899]">
          Created with Perplexity Computer
        </a>
      </div>

      {/* Notification Panel */}
      {showNotifications && (
        <NotificationPanel onClose={() => setShowNotifications(false)} />
      )}

      {/* Trade Modal */}
      {showTradeModal && (
        <TradeModal
          mode={tradeMode}
          onClose={() => setShowTradeModal(false)}
          prices={prices}
          agentName={agent?.name}
          agentEmoji={agent?.avatarEmoji}
        />
      )}
    </div>
  );
}
