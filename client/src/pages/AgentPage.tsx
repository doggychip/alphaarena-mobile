import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";

// ─── Types ───────────────────────────────────────────────────────
interface ChatMessage {
  role: "user" | "agent";
  text: string;
  timestamp: number;
}

// ─── Mood / Badge helpers ────────────────────────────────────────
const MOOD_MAP: Record<string, { emoji: string; label: string; color: string }> = {
  euphoric: { emoji: "🤑", label: "Euphoric", color: "#00FF88" },
  confident: { emoji: "😎", label: "Confident", color: "#00D4FF" },
  neutral: { emoji: "😐", label: "Neutral", color: "#888899" },
  nervous: { emoji: "😰", label: "Nervous", color: "#FFD700" },
  rekt: { emoji: "💀", label: "Rekt", color: "#FF3B9A" },
};

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

function RiskBadge({ risk }: { risk: string }) {
  const color = risk === "low" ? "#00FF88" : risk === "medium" ? "#FFD700" : "#FF3B9A";
  return (
    <span className="text-[8px] px-1.5 py-0.5 rounded-full font-display font-bold border" style={{ color, borderColor: color + "40", backgroundColor: color + "15" }}>
      {risk.toUpperCase()}
    </span>
  );
}

// ─── Agent Picker Modal ──────────────────────────────────────────
function AgentPickerModal({ agents, hfAgents, currentType, onSelect, onClose }: {
  agents: any[]; hfAgents: any[]; currentType: string; onSelect: (type: string) => void; onClose: () => void;
}) {
  const personaAgents = hfAgents.filter((a: any) => a.category === "persona");
  const specialistAgents = hfAgents.filter((a: any) => a.category === "specialist");
  const managementAgents = hfAgents.filter((a: any) => a.category === "management");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-[430px] rounded-t-3xl bg-[#12121A] border-t border-[#2A2A3E] p-4 pb-8 max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-1 rounded-full bg-[#2A2A3E] mx-auto mb-4" />
        <h3 className="font-display font-bold text-lg text-center mb-4">🔄 Choose Your Agent</h3>

        {/* MEME AGENTS */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm">🎭</span>
            <span className="font-display font-bold text-sm text-neon-pink">MEME AGENTS</span>
            <div className="flex-1 h-px bg-neon-pink/20" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {agents.map((agent: any) => (
              <button
                key={agent.type}
                data-testid={`agent-pick-${agent.type}`}
                onClick={() => onSelect(agent.type)}
                className={`rounded-2xl p-4 text-left transition-all active:scale-95 ${
                  agent.type === currentType
                    ? "bg-neon-green/10 border-2 border-neon-green glow-green"
                    : "bg-[#1A1A2E] border border-[#2A2A3E]"
                }`}
              >
                <div className="text-3xl mb-2">{agent.avatarEmoji}</div>
                <p className="font-display font-bold text-sm text-[#E8E8E8]">{agent.name}</p>
                <p className="text-[10px] text-neon-cyan mt-1">{agent.tradingStyle}</p>
                <p className="text-[10px] text-[#888899] mt-1 line-clamp-2">"{agent.description}"</p>
                <div className="mt-2 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className={`w-3 h-1 rounded-full ${i < agent.riskLevel ? "bg-neon-pink" : "bg-[#2A2A3E]"}`} />
                  ))}
                </div>
                <span className="text-[8px] text-[#888899]">Risk Level</span>
              </button>
            ))}
          </div>
        </div>

        {/* HEDGE FUND AGENTS */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm">🏦</span>
            <span className="font-display font-bold text-sm text-neon-cyan">HEDGE FUND AGENTS</span>
            <div className="flex-1 h-px bg-neon-cyan/20" />
          </div>
          <p className="text-[10px] text-[#888899] font-display mb-2 mt-2">Persona Agents</p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {personaAgents.map((agent: any) => (
              <HFPickerCard key={agent.agentId} agent={agent} isSelected={agent.agentId === currentType} onSelect={onSelect} />
            ))}
          </div>
          <p className="text-[10px] text-[#888899] font-display mb-2">Specialist Agents</p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {specialistAgents.map((agent: any) => (
              <HFPickerCard key={agent.agentId} agent={agent} isSelected={agent.agentId === currentType} onSelect={onSelect} />
            ))}
          </div>
          <p className="text-[10px] text-[#888899] font-display mb-2">Management</p>
          <div className="grid grid-cols-2 gap-3">
            {managementAgents.map((agent: any) => (
              <HFPickerCard key={agent.agentId} agent={agent} isSelected={agent.agentId === currentType} onSelect={onSelect} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function HFPickerCard({ agent, isSelected, onSelect }: { agent: any; isSelected: boolean; onSelect: (id: string) => void }) {
  return (
    <button
      data-testid={`agent-pick-${agent.agentId}`}
      onClick={() => onSelect(agent.agentId)}
      className={`rounded-2xl p-3 text-left transition-all active:scale-95 ${
        isSelected
          ? "bg-neon-green/10 border-2 border-neon-green glow-green"
          : "bg-[#1A1A2E] border border-[#2A2A3E]"
      }`}
    >
      <div className="text-2xl mb-1">{agent.avatarEmoji}</div>
      <p className="font-display font-bold text-xs text-[#E8E8E8]">{agent.name}</p>
      <p className="text-[9px] text-[#888899] mt-1 line-clamp-2">{agent.tradingPhilosophy}</p>
      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        <RiskBadge risk={agent.riskTolerance} />
        <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-[#2A2A3E] text-[#888899] border border-[#2A2A3E]">
          {agent.assetFocus}
        </span>
      </div>
    </button>
  );
}

// ─── Suggestion Chips ────────────────────────────────────────────
const SUGGESTION_CHIPS = [
  { label: "📊 Market outlook", message: "What's the market looking like today?" },
  { label: "💰 My portfolio", message: "How's my portfolio doing?" },
  { label: "🪙 What about BTC?", message: "What do you think about BTC?" },
  { label: "📈 What about ETH?", message: "What's your take on ETH?" },
  { label: "🎯 Strategy advice", message: "What should I do right now?" },
  { label: "⚠️ Risk tips", message: "Any risk management tips?" },
];

// ─── Typing indicator ────────────────────────────────────────────
function TypingIndicator({ emoji }: { emoji: string }) {
  return (
    <div className="flex gap-2 items-end">
      <div className="w-8 h-8 rounded-full bg-[#0A0A0F] border border-[#2A2A3E] flex-shrink-0 flex items-center justify-center text-base">
        {emoji}
      </div>
      <div className="bg-[#1E1E32] rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-[#555566] animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 rounded-full bg-[#555566] animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 rounded-full bg-[#555566] animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

// ─── Chat Bubble ─────────────────────────────────────────────────
function ChatBubble({ msg, agentEmoji }: { msg: ChatMessage; agentEmoji: string }) {
  const isUser = msg.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="bg-neon-green/15 border border-neon-green/30 rounded-2xl rounded-br-sm px-3.5 py-2.5 max-w-[82%]">
          <p className="text-xs text-[#E8E8E8] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 items-end">
      <div className="w-8 h-8 rounded-full bg-[#0A0A0F] border border-[#2A2A3E] flex-shrink-0 flex items-center justify-center text-base">
        {agentEmoji}
      </div>
      <div className="bg-[#1E1E32] rounded-2xl rounded-bl-sm px-3.5 py-2.5 max-w-[82%]">
        <p className="text-xs text-[#E8E8E8] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
      </div>
    </div>
  );
}

// ─── Agent Detail Drawer ─────────────────────────────────────────
function AgentDetailDrawer({ agent, agentTier, user, hfAgentDetail, hfMapping, onClose }: {
  agent: any; agentTier: string; user: any; hfAgentDetail: any; hfMapping: any[]; onClose: () => void;
}) {
  const isHF = agentTier === "hedge_fund";
  const portfolio = user?.portfolio;
  const dailyPnl = portfolio ? portfolio.totalEquity - 100000 : 0;
  const moodKey = dailyPnl > 3000 ? "euphoric" : dailyPnl > 1000 ? "confident" : dailyPnl > -500 ? "neutral" : dailyPnl > -2000 ? "nervous" : "rekt";
  const mood = MOOD_MAP[moodKey];

  const hfStats = hfAgentDetail?.stats;
  const agentStats = isHF && hfStats ? {
    winRate: hfStats.winRate,
    totalSignals: hfStats.totalSignals,
    avgConfidence: hfStats.avgConfidence,
  } : {
    winRate: 67,
    bestTrade: { amount: 3200, pair: "SOL" },
    worstTrade: { amount: -800, pair: "DOGE" },
    totalTrades: 142,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-[430px] rounded-t-3xl bg-[#12121A] border-t border-[#2A2A3E] p-4 pb-8 max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-1 rounded-full bg-[#2A2A3E] mx-auto mb-4" />

        {/* Agent Hero */}
        <div className="text-center mb-4">
          <div className="w-20 h-20 rounded-full bg-[#0A0A0F] border-2 mx-auto flex items-center justify-center text-4xl" style={{ borderColor: isHF ? "#00D4FF" : "#00D4FF" }}>
            {agent.avatarEmoji}
          </div>
          <h3 className="font-display font-bold text-lg text-[#E8E8E8] mt-2">{agent.name}</h3>
          <div className="mt-1 flex justify-center"><TierBadge tier={agentTier as any} /></div>
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {isHF ? (
              <span className="text-xs px-2 py-1 rounded-full bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 font-display">
                {agent.tradingPhilosophy?.split('.')[0]}
              </span>
            ) : (
              <>
                <span className="text-xs px-2 py-1 rounded-full bg-neon-pink/10 text-neon-pink border border-neon-pink/20 font-display">{agent.personality}</span>
                <span className="text-xs px-2 py-1 rounded-full bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 font-display">{agent.tradingStyle}</span>
              </>
            )}
          </div>
          {isHF && agent.description && (
            <p className="text-xs text-[#888899] mt-2 leading-relaxed">"{agent.description}"</p>
          )}
        </div>

        {/* Mood */}
        <div className="rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-3 flex items-center gap-3 mb-3">
          <span className="text-2xl">{mood.emoji}</span>
          <div>
            <p className="font-display font-bold text-sm" style={{ color: mood.color }}>{mood.label}</p>
            <p className="text-[10px] text-[#888899]">Current mood based on performance</p>
          </div>
        </div>

        {/* Stats */}
        {isHF ? (
          <div className="grid grid-cols-3 gap-2 mb-3">
            <MiniStat emoji="✅" label="Win Rate" value={`${agentStats.winRate}%`} color="#00FF88" />
            <MiniStat emoji="📊" label="Signals" value={String(agentStats.totalSignals)} color="#00D4FF" />
            <MiniStat emoji="🎯" label="Avg Conf" value={`${agentStats.avgConfidence}%`} color="#FFD700" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 mb-3">
            <MiniStat emoji="✅" label="Win Rate" value={`${(agentStats as any).winRate}%`} color="#00FF88" />
            <MiniStat emoji="📊" label="Trades" value={String((agentStats as any).totalTrades)} color="#00D4FF" />
          </div>
        )}

        {/* HF Signal History */}
        {isHF && hfAgentDetail?.latestSignals && hfAgentDetail.latestSignals.length > 0 && (
          <div className="rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-[#888899] font-display">📡 Recent Signals</p>
              <Link href={`/signals/${user?.selectedAgentType}`}>
                <span className="text-[10px] text-neon-cyan font-display">View All →</span>
              </Link>
            </div>
            <div className="space-y-1.5">
              {hfAgentDetail.latestSignals.slice(0, 3).map((sig: any) => {
                const sigColor = sig.signal === "bullish" ? "text-neon-green" : sig.signal === "bearish" ? "text-neon-pink" : "text-neon-gold";
                const sigEmoji = sig.signal === "bullish" ? "🟢" : sig.signal === "bearish" ? "🔴" : "🟡";
                return (
                  <div key={sig.id} className="flex items-center gap-2 py-1.5 px-2 rounded-xl bg-[#12121A] border border-[#2A2A3E]">
                    <span className="font-display font-bold text-xs text-[#E8E8E8] w-12">{sig.ticker}</span>
                    <span className={`text-[10px] font-display font-bold ${sigColor}`}>{sigEmoji} {sig.signal?.toUpperCase()}</span>
                    <span className="text-[10px] font-mono-num text-[#888899] ml-auto">{sig.confidence}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Brain Trust for Meme Agents */}
        {!isHF && hfMapping && hfMapping.length > 0 && (
          <div className="rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-3">
            <p className="text-xs text-[#888899] font-display mb-2">🧠 Brain Trust</p>
            <div className="space-y-1.5">
              {hfMapping.map((m: any) => {
                const signalColor = m.latestSignal?.signal === "bullish" ? "text-neon-green" : m.latestSignal?.signal === "bearish" ? "text-neon-pink" : "text-neon-gold";
                const signalEmoji = m.latestSignal?.signal === "bullish" ? "🟢" : m.latestSignal?.signal === "bearish" ? "🔴" : "🟡";
                return (
                  <div key={m.hedgeFundAgentId} className="flex items-center gap-2 py-1.5 px-2 rounded-xl bg-[#12121A] border border-[#2A2A3E]">
                    <span className="text-lg">{m.hfAgent?.avatarEmoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-semibold text-xs text-[#E8E8E8]">{m.hfAgent?.name}</p>
                      <p className="text-[9px] text-[#888899]">Weight: {Math.round(m.weight * 100)}%</p>
                    </div>
                    {m.latestSignal && (
                      <span className={`text-[10px] font-display font-bold ${signalColor}`}>
                        {signalEmoji} {m.latestSignal.confidence}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({ emoji, label, value, color }: { emoji: string; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl bg-[#1A1A2E] border border-[#2A2A3E] p-2 text-center">
      <span className="text-xs">{emoji}</span>
      <p className="font-mono-num text-sm font-bold mt-0.5" style={{ color }}>{value}</p>
      <p className="text-[9px] text-[#888899] font-display">{label}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════
export default function AgentPage() {
  const [showPicker, setShowPicker] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: meData } = useQuery<any>({ queryKey: ["/api/me"] });
  const { data: agentsData } = useQuery<any>({ queryKey: ["/api/agents"] });
  const { data: hfAgentsData } = useQuery<any[]>({ queryKey: ["/api/hf-agents"] });

  const agentTier: "meme" | "hedge_fund" = meData?.agentTier || "meme";
  const isHF = agentTier === "hedge_fund";

  const { data: hfMapping } = useQuery<any[]>({
    queryKey: ["/api/agents", meData?.user?.selectedAgentType, "hedge-fund"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/agents/${meData?.user?.selectedAgentType}/hedge-fund`);
      return res.json();
    },
    enabled: !!meData?.user?.selectedAgentType && !isHF,
  });

  const { data: hfAgentDetail } = useQuery<any>({
    queryKey: ["/api/hf-agents", meData?.user?.selectedAgentType],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/hf-agents/${meData?.user?.selectedAgentType}`);
      return res.json();
    },
    enabled: !!meData?.user?.selectedAgentType && isHF,
  });

  const user = meData?.user;
  const agent = meData?.agent;
  const agents = agentsData || [];
  const hfAgents = hfAgentsData || [];

  // Chat mutation
  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/agent/chat", { message });
      return res.json();
    },
    onSuccess: (data) => {
      setChatHistory(prev => [...prev, {
        role: "agent",
        text: data.reply,
        timestamp: Date.now(),
      }]);
      setIsTyping(false);
    },
    onError: () => {
      setChatHistory(prev => [...prev, {
        role: "agent",
        text: "Sorry, I'm having trouble thinking right now. Try again in a sec! 🤔",
        timestamp: Date.now(),
      }]);
      setIsTyping(false);
    },
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isTyping]);

  // Send welcome message when agent loads (only once per agent)
  const welcomeSentRef = useRef<string | null>(null);
  useEffect(() => {
    if (agent && user?.selectedAgentType && welcomeSentRef.current !== user.selectedAgentType) {
      welcomeSentRef.current = user.selectedAgentType;
      setChatHistory([]);
      setIsTyping(true);
      // Small delay for realism
      setTimeout(() => {
        chatMutation.mutate("hi");
      }, 400);
    }
  }, [agent, user?.selectedAgentType]);

  const handleSend = (text?: string) => {
    const msg = text || inputText.trim();
    if (!msg || isTyping) return;

    setChatHistory(prev => [...prev, { role: "user", text: msg, timestamp: Date.now() }]);
    setInputText("");
    setIsTyping(true);

    // Small delay before "agent starts typing"
    setTimeout(() => {
      chatMutation.mutate(msg);
    }, 300 + Math.random() * 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSelectAgent = async (type: string) => {
    await apiRequest("PATCH", "/api/me", { selectedAgentType: type });
    queryClient.invalidateQueries({ queryKey: ["/api/me"] });
    queryClient.invalidateQueries({ queryKey: ["/api/agent/messages"] });
    queryClient.invalidateQueries({ queryKey: ["/api/agent/message"] });
    setShowPicker(false);
    // Reset chat — welcome will trigger automatically via useEffect
    welcomeSentRef.current = null;
  };

  const agentEmoji = agent?.avatarEmoji || "🤖";
  const agentName = agent?.name || "Agent";

  // Mood
  const portfolio = meData?.portfolio;
  const dailyPnl = portfolio ? portfolio.totalEquity - 100000 : 0;
  const moodKey = dailyPnl > 3000 ? "euphoric" : dailyPnl > 1000 ? "confident" : dailyPnl > -500 ? "neutral" : dailyPnl > -2000 ? "nervous" : "rekt";
  const mood = MOOD_MAP[moodKey];

  return (
    <div className="flex flex-col h-screen" style={{ height: "calc(100vh - 64px)" }}>

      {/* ─── Compact Agent Header ─── */}
      <header
        className="sticky top-0 z-40 px-4 py-2.5 flex items-center gap-3 border-b border-[#2A2A3E]"
        style={{ background: "rgba(10, 10, 15, 0.95)", backdropFilter: "blur(12px)" }}
      >
        {/* Avatar — tappable for details */}
        <button onClick={() => setShowDetail(true)} className="relative active:scale-95 transition-transform">
          <div className="w-10 h-10 rounded-full bg-[#0A0A0F] border-2 flex items-center justify-center text-xl" style={{ borderColor: isHF ? "#00D4FF" : "#FF3B9A" }}>
            {agentEmoji}
          </div>
          {/* Mood dot */}
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0A0A0F] flex items-center justify-center text-[7px]" style={{ backgroundColor: mood.color }}>
          </div>
        </button>

        {/* Name + tier */}
        <button onClick={() => setShowDetail(true)} className="flex-1 min-w-0 text-left active:opacity-80">
          <div className="flex items-center gap-2">
            <h1 className="font-display font-bold text-base text-[#E8E8E8] truncate">{agentName}</h1>
            <TierBadge tier={agentTier} />
          </div>
          <p className="text-[10px] text-[#888899] truncate">
            {isHF ? agent?.tradingPhilosophy?.split('.')[0] : agent?.tradingStyle} · Tap for details
          </p>
        </button>

        {/* Switch agent button */}
        <button
          data-testid="btn-switch-agent"
          onClick={() => setShowPicker(true)}
          className="w-9 h-9 rounded-xl bg-[#1A1A2E] border border-[#2A2A3E] flex items-center justify-center text-base active:scale-95 transition-transform"
          title="Switch Agent"
        >
          🔄
        </button>
      </header>

      {/* ─── Chat Messages ─── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 hide-scrollbar">
        {/* Empty state — only if no messages and not typing */}
        {chatHistory.length === 0 && !isTyping && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 opacity-60">
            <div className="text-5xl mb-3">{agentEmoji}</div>
            <p className="font-display font-bold text-sm text-[#E8E8E8]">Ask {agentName} anything</p>
            <p className="text-xs text-[#888899] mt-1">
              Market outlook, ticker analysis, portfolio advice, risk management...
            </p>
          </div>
        )}

        {chatHistory.map((msg, i) => (
          <ChatBubble key={i} msg={msg} agentEmoji={agentEmoji} />
        ))}

        {isTyping && <TypingIndicator emoji={agentEmoji} />}

        <div ref={chatEndRef} />
      </div>

      {/* ─── Suggestion Chips ─── */}
      {chatHistory.length <= 2 && !isTyping && (
        <div className="px-4 pb-2">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
            {SUGGESTION_CHIPS.map((chip, i) => (
              <button
                key={i}
                onClick={() => handleSend(chip.message)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full bg-[#1A1A2E] border border-[#2A2A3E] text-[11px] text-[#E8E8E8] font-display whitespace-nowrap active:scale-95 active:border-neon-green/50 transition-all hover:border-neon-cyan/40"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Input Area ─── */}
      <div
        className="sticky bottom-0 px-4 pt-2 pb-3 border-t border-[#2A2A3E]"
        style={{ background: "rgba(10, 10, 15, 0.95)", backdropFilter: "blur(12px)" }}
      >
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            data-testid="chat-input"
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask ${agentName}...`}
            disabled={isTyping}
            className="flex-1 bg-[#1A1A2E] border border-[#2A2A3E] rounded-2xl px-4 py-3 text-sm text-[#E8E8E8] placeholder-[#555566] font-display outline-none focus:border-neon-cyan/50 transition-colors disabled:opacity-50"
          />
          <button
            data-testid="chat-send"
            onClick={() => handleSend()}
            disabled={!inputText.trim() || isTyping}
            className="w-11 h-11 rounded-2xl bg-neon-green/20 border border-neon-green/40 flex items-center justify-center text-lg active:scale-90 transition-all disabled:opacity-30 disabled:bg-[#1A1A2E] disabled:border-[#2A2A3E]"
          >
            ⬆️
          </button>
        </div>

        {/* Footer attribution */}
        <div className="text-center mt-1.5">
          <a href="https://www.perplexity.ai/computer" target="_blank" rel="noopener noreferrer" className="text-[9px] text-[#555566]">
            Created with Perplexity Computer
          </a>
        </div>
      </div>

      {/* ─── Modals ─── */}
      {showPicker && (
        <AgentPickerModal
          agents={agents}
          hfAgents={hfAgents}
          currentType={user?.selectedAgentType || "bull"}
          onSelect={handleSelectAgent}
          onClose={() => setShowPicker(false)}
        />
      )}

      {showDetail && agent && (
        <AgentDetailDrawer
          agent={agent}
          agentTier={agentTier}
          user={{ ...user, portfolio }}
          hfAgentDetail={hfAgentDetail}
          hfMapping={hfMapping || []}
          onClose={() => setShowDetail(false)}
        />
      )}
    </div>
  );
}
