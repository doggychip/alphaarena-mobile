import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Link } from "wouter";

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

        {/* MEME AGENTS SECTION */}
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

        {/* HEDGE FUND AGENTS SECTION */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm">🏦</span>
            <span className="font-display font-bold text-sm text-neon-cyan">HEDGE FUND AGENTS</span>
            <div className="flex-1 h-px bg-neon-cyan/20" />
          </div>

          {/* Persona Agents */}
          <p className="text-[10px] text-[#888899] font-display mb-2 mt-2">Persona Agents</p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {personaAgents.map((agent: any) => (
              <HFPickerCard key={agent.agentId} agent={agent} isSelected={agent.agentId === currentType} onSelect={onSelect} />
            ))}
          </div>

          {/* Specialist Agents */}
          <p className="text-[10px] text-[#888899] font-display mb-2">Specialist Agents</p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {specialistAgents.map((agent: any) => (
              <HFPickerCard key={agent.agentId} agent={agent} isSelected={agent.agentId === currentType} onSelect={onSelect} />
            ))}
          </div>

          {/* Management */}
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

export default function AgentPage() {
  const [showPicker, setShowPicker] = useState(false);
  const queryClient = useQueryClient();

  const { data: meData } = useQuery<any>({ queryKey: ["/api/me"] });
  const { data: agentsData } = useQuery<any>({ queryKey: ["/api/agents"] });
  const { data: hfAgentsData } = useQuery<any[]>({ queryKey: ["/api/hf-agents"] });
  const { data: chatMessages } = useQuery<any>({
    queryKey: ["/api/agent/messages"],
    refetchInterval: 30000,
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

  // Fetch HF agent detail when HF agent is selected
  const { data: hfAgentDetail } = useQuery<any>({
    queryKey: ["/api/hf-agents", meData?.user?.selectedAgentType],
    queryFn: async () => {
      const res = await fetch(`/api/hf-agents/${meData?.user?.selectedAgentType}`);
      return res.json();
    },
    enabled: !!meData?.user?.selectedAgentType && isHF,
  });

  const user = meData?.user;
  const agent = meData?.agent;
  const agents = agentsData || [];
  const hfAgents = hfAgentsData || [];
  const messages = chatMessages || [];

  // Derive mood from portfolio performance
  const portfolio = meData?.portfolio;
  const dailyPnl = portfolio ? portfolio.totalEquity - 100000 : 0;
  const moodKey = dailyPnl > 3000 ? "euphoric" : dailyPnl > 1000 ? "confident" : dailyPnl > -500 ? "neutral" : dailyPnl > -2000 ? "nervous" : "rekt";
  const mood = MOOD_MAP[moodKey];

  // Agent stats
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
    level: user?.level || 12,
  };

  const handleSelectAgent = async (type: string) => {
    await apiRequest("PATCH", "/api/me", { selectedAgentType: type });
    queryClient.invalidateQueries({ queryKey: ["/api/me"] });
    queryClient.invalidateQueries({ queryKey: ["/api/agent/messages"] });
    queryClient.invalidateQueries({ queryKey: ["/api/agent/message"] });
    setShowPicker(false);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 py-3" style={{ background: "rgba(10, 10, 15, 0.9)", backdropFilter: "blur(12px)" }}>
        <h1 className="font-display font-bold text-lg text-[#E8E8E8]">🤖 Your Agent</h1>
      </header>

      {/* Agent Hero */}
      {agent && (
        <div className="mx-4 mt-2 rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-6 text-center">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full bg-[#0A0A0F] border-3 border-neon-cyan mx-auto flex items-center justify-center text-5xl animate-bounce-gentle" style={{ borderWidth: 3, borderColor: isHF ? "#00D4FF" : "#00D4FF" }}>
            {agent.avatarEmoji}
          </div>
          <h2 className="font-display font-bold text-xl text-[#E8E8E8] mt-3">{agent.name}</h2>

          {/* Tier Badge */}
          <div className="mt-2 flex justify-center">
            <TierBadge tier={agentTier} />
          </div>

          {/* Level + XP */}
          <div className="mt-2">
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs text-neon-gold font-display font-bold">⭐ Level {user?.level}</span>
              <span className="text-xs text-[#888899] font-mono-num">{user?.xp?.toLocaleString()} XP</span>
            </div>
            <div className="w-48 h-2 rounded-full bg-[#2A2A3E] mx-auto mt-1 overflow-hidden">
              <div className="h-full rounded-full bg-neon-gold transition-all" style={{ width: `${((user?.xp || 0) % 500) / 500 * 100}%` }} />
            </div>
          </div>

          {/* Personality Tags / Trading Philosophy */}
          <div className="flex flex-wrap justify-center gap-2 mt-3">
            {isHF ? (
              <>
                <span className="text-xs px-2 py-1 rounded-full bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 font-display">
                  {agent.tradingPhilosophy?.split('.')[0]}
                </span>
              </>
            ) : (
              <>
                <span className="text-xs px-2 py-1 rounded-full bg-neon-pink/10 text-neon-pink border border-neon-pink/20 font-display">
                  {agent.personality}
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 font-display">
                  {agent.tradingStyle}
                </span>
              </>
            )}
          </div>

          {/* HF Agent Description */}
          {isHF && agent.description && (
            <p className="text-xs text-[#888899] mt-3 leading-relaxed">"{agent.description}"</p>
          )}
        </div>
      )}

      {/* Mood Indicator */}
      <div className="mx-4 mt-4 rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-4 flex items-center gap-3">
        <span className="text-3xl">{mood.emoji}</span>
        <div>
          <p className="font-display font-bold text-sm" style={{ color: mood.color }}>
            {mood.label}
          </p>
          <p className="text-[10px] text-[#888899]">Current mood based on performance</p>
        </div>
      </div>

      {/* Agent Chat */}
      <div className="mx-4 mt-4 rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-4">
        <p className="text-xs text-[#888899] font-display mb-3">💬 Agent Chat</p>
        <div className="space-y-3 max-h-[300px] overflow-y-auto hide-scrollbar">
          {messages.map((msg: any, i: number) => (
            <div key={i} className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-[#0A0A0F] flex-shrink-0 flex items-center justify-center text-sm">
                {agent?.avatarEmoji || "🤖"}
              </div>
              <div className="bg-[#1E1E32] rounded-xl rounded-tl-sm px-3 py-2 max-w-[85%]">
                <p className="text-xs text-[#E8E8E8] leading-relaxed">{msg.message}</p>
                <p className="text-[8px] text-[#555566] mt-1">{MOOD_MAP[msg.mood]?.emoji} {msg.mood}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Agent Stats - Different layout for HF vs Meme */}
      {isHF ? (
        <div className="mx-4 mt-4 grid grid-cols-3 gap-3">
          <StatCard emoji="✅" label="Win Rate" value={`${agentStats.winRate}%`} color="#00FF88" />
          <StatCard emoji="📊" label="Signals" value={String(agentStats.totalSignals)} color="#00D4FF" />
          <StatCard emoji="🎯" label="Avg Conf" value={`${agentStats.avgConfidence}%`} color="#FFD700" />
        </div>
      ) : (
        <div className="mx-4 mt-4 grid grid-cols-2 gap-3">
          <StatCard emoji="✅" label="Win Rate" value={`${(agentStats as any).winRate}%`} color="#00FF88" />
          <StatCard emoji="🏆" label="Best Trade" value={`+$${(agentStats as any).bestTrade?.amount.toLocaleString()}`} subtext={(agentStats as any).bestTrade?.pair} color="#00FF88" />
          <StatCard emoji="💀" label="Worst Trade" value={`-$${Math.abs((agentStats as any).worstTrade?.amount).toLocaleString()}`} subtext={(agentStats as any).worstTrade?.pair} color="#FF3B9A" />
          <StatCard emoji="📊" label="Total Trades" value={(agentStats as any).totalTrades?.toString()} color="#00D4FF" />
        </div>
      )}

      {/* HF Signal History */}
      {isHF && hfAgentDetail?.latestSignals && hfAgentDetail.latestSignals.length > 0 && (
        <div className="mx-4 mt-4 rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-[#888899] font-display">📡 Signal History</p>
            <Link href={`/signals/${user?.selectedAgentType}`}>
              <span className="text-[10px] text-neon-cyan font-display">View Full Analysis →</span>
            </Link>
          </div>
          <div className="space-y-2">
            {hfAgentDetail.latestSignals.slice(0, 5).map((sig: any) => {
              const sigColor = sig.signal === "bullish" ? "text-neon-green" : sig.signal === "bearish" ? "text-neon-pink" : "text-neon-gold";
              const sigEmoji = sig.signal === "bullish" ? "🟢" : sig.signal === "bearish" ? "🔴" : "🟡";
              const timeAgo = getTimeAgo(sig.createdAt);
              return (
                <div key={sig.id} className="flex items-center gap-3 py-2 px-3 rounded-xl bg-[#12121A] border border-[#2A2A3E]">
                  <span className="font-display font-bold text-xs text-[#E8E8E8] w-12">{sig.ticker}</span>
                  <span className={`text-[10px] font-display font-bold ${sigColor}`}>
                    {sigEmoji} {sig.signal?.toUpperCase()}
                  </span>
                  <span className="text-[10px] font-mono-num text-[#888899] ml-auto">{sig.confidence}%</span>
                  <span className="text-[9px] text-[#555566]">{timeAgo}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Brain Trust — Only show for Meme agents */}
      {!isHF && hfMapping && hfMapping.length > 0 && (
        <div className="mx-4 mt-4 rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-4">
          <p className="text-xs text-[#888899] font-display mb-3">🧠 Brain Trust</p>
          <p className="text-[10px] text-[#555566] mb-3">
            The hedge fund agents powering {agent?.name}'s analysis
          </p>
          <div className="space-y-2">
            {hfMapping.map((m: any) => {
              const signalColor = m.latestSignal?.signal === "bullish" ? "text-neon-green" : m.latestSignal?.signal === "bearish" ? "text-neon-pink" : "text-neon-gold";
              const signalEmoji = m.latestSignal?.signal === "bullish" ? "🟢" : m.latestSignal?.signal === "bearish" ? "🔴" : "🟡";
              return (
                <Link key={m.hedgeFundAgentId} href={`/signals/${m.hedgeFundAgentId}`}>
                  <div className="flex items-center gap-3 py-2 px-3 rounded-xl bg-[#12121A] border border-[#2A2A3E] cursor-pointer hover:border-neon-cyan/30 transition-colors">
                    <span className="text-xl">{m.hfAgent?.avatarEmoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-semibold text-sm text-[#E8E8E8]">{m.hfAgent?.name}</p>
                      <p className="text-[10px] text-[#888899]">Weight: {Math.round(m.weight * 100)}%</p>
                    </div>
                    {m.latestSignal && (
                      <div className="text-right">
                        <span className={`text-[10px] font-display font-bold ${signalColor}`}>
                          {signalEmoji} {m.latestSignal.signal?.toUpperCase()}
                        </span>
                        <p className="text-[9px] font-mono-num text-[#888899]">{m.latestSignal.confidence}%</p>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Switch Agent Button */}
      <div className="mx-4 mt-4 mb-4">
        <button
          data-testid="btn-switch-agent"
          onClick={() => setShowPicker(true)}
          className="w-full py-4 rounded-2xl bg-[#1A1A2E] border border-neon-cyan/30 font-display font-bold text-neon-cyan text-sm active:scale-95 transition-transform"
        >
          🔄 Switch Agent
        </button>
      </div>

      {/* Footer attribution */}
      <div className="px-4 pb-4 text-center">
        <a href="https://www.perplexity.ai/computer" target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#555566]">
          Created with Perplexity Computer
        </a>
      </div>

      {/* Agent Picker Modal */}
      {showPicker && (
        <AgentPickerModal
          agents={agents}
          hfAgents={hfAgents}
          currentType={user?.selectedAgentType || "bull"}
          onSelect={handleSelectAgent}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

function StatCard({ emoji, label, value, subtext, color }: {
  emoji: string; label: string; value: string; subtext?: string; color: string;
}) {
  return (
    <div className="rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-sm">{emoji}</span>
        <span className="text-[10px] text-[#888899] font-display">{label}</span>
      </div>
      <span className="font-mono-num text-lg font-bold" style={{ color }}>{value}</span>
      {subtext && <p className="text-[10px] text-[#888899]">({subtext})</p>}
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
