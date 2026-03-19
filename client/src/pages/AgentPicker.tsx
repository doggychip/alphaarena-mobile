import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type Tab = "meme" | "hf";

export default function AgentPicker() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("meme");

  const { data: meData } = useQuery<any>({ queryKey: ["/api/me"] });
  const { data: memeAgents } = useQuery<any[]>({ queryKey: ["/api/agents"] });
  const { data: hfAgents } = useQuery<any[]>({ queryKey: ["/api/hf-agents"] });

  const currentAgentType = meData?.user?.selectedAgentType;

  const selectMutation = useMutation({
    mutationFn: async (agentType: string) => {
      const res = await apiRequest("PATCH", "/api/me", { selectedAgentType: agentType });
      return res.json();
    },
    onSuccess: (_data, agentType) => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      localStorage.setItem("alphaarena_picked_agent", "true");
      toast({ title: "Agent switched!", description: `You're now rolling with a new companion` });
      navigate("/");
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err.message || "Couldn't switch agent", variant: "destructive" });
    },
  });

  const handleSelect = (agentType: string) => {
    if (agentType === currentAgentType) return;
    selectMutation.mutate(agentType);
  };

  const riskColors: Record<string, string> = { low: "#00FF88", medium: "#FFD700", high: "#FF3B9A" };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 py-3 flex items-center gap-3" style={{ background: "rgba(10, 10, 15, 0.9)", backdropFilter: "blur(12px)" }}>
        <button onClick={() => window.history.back()} className="text-[#888899] hover:text-[#E8E8E8] text-lg">←</button>
        <h1 className="font-display font-bold text-lg text-[#E8E8E8]">🤖 Choose Your Agent</h1>
      </header>

      {/* Intro */}
      <div className="mx-4 mt-2 rounded-2xl bg-gradient-to-br from-[#1A1A2E] to-[#0D1A2E] border border-neon-cyan/20 p-4">
        <p className="text-sm text-[#E8E8E8] leading-relaxed">
          Pick an AI agent to be your trading companion. Your agent analyzes markets and gives you trade signals.
        </p>
        <p className="text-[10px] text-[#888899] mt-2">
          You can switch anytime — your portfolio stays the same.
        </p>
      </div>

      {/* Tabs */}
      <div className="mx-4 mt-4 flex gap-2">
        <button
          onClick={() => setTab("meme")}
          className={`flex-1 py-3 rounded-xl font-display font-bold text-sm transition-all ${
            tab === "meme"
              ? "bg-neon-pink/20 text-neon-pink border border-neon-pink/40"
              : "bg-[#1A1A2E] text-[#888899] border border-[#2A2A3E]"
          }`}
        >
          🎭 Meme Agents
        </button>
        <button
          onClick={() => setTab("hf")}
          className={`flex-1 py-3 rounded-xl font-display font-bold text-sm transition-all ${
            tab === "hf"
              ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40"
              : "bg-[#1A1A2E] text-[#888899] border border-[#2A2A3E]"
          }`}
        >
          🏦 HF Agents
        </button>
      </div>

      {/* Agent description */}
      <div className="mx-4 mt-3">
        {tab === "meme" ? (
          <p className="text-[10px] text-[#888899] leading-relaxed">
            Fun companion characters with unique personalities. Each is powered by hedge fund AI behind the scenes.
          </p>
        ) : (
          <p className="text-[10px] text-[#888899] leading-relaxed">
            Specialized AI analysts modeled after real hedge fund roles. View their raw signals and analysis directly.
          </p>
        )}
      </div>

      {/* Meme Agents Grid */}
      {tab === "meme" && (
        <div className="mx-4 mt-3 space-y-2">
          {(memeAgents || []).map((agent: any) => {
            const isSelected = currentAgentType === agent.type;
            return (
              <button
                key={agent.id}
                onClick={() => handleSelect(agent.type)}
                disabled={selectMutation.isPending}
                className={`w-full rounded-2xl p-4 border text-left transition-all active:scale-[0.98] ${
                  isSelected
                    ? "bg-neon-green/10 border-neon-green/40 ring-1 ring-neon-green/20"
                    : "bg-[#1A1A2E] border-[#2A2A3E] hover:border-[#3A3A4E]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-14 h-14 rounded-full bg-[#0A0A0F] flex items-center justify-center text-3xl flex-shrink-0 ${
                    isSelected ? "border-2 border-neon-green" : "border border-[#2A2A3E]"
                  }`}>
                    {agent.avatarEmoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-sm text-[#E8E8E8]">{agent.name}</span>
                      {isSelected && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-neon-green/20 text-neon-green font-display font-bold">ACTIVE</span>
                      )}
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 font-display inline-block mt-1">
                      {agent.personality}
                    </span>
                    <p className="text-[10px] text-[#888899] mt-1 line-clamp-2">{agent.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2 ml-[66px]">
                  <span className="text-[9px] text-[#888899]">📊 {agent.tradingStyle}</span>
                  <span className="text-[9px] text-[#888899]">⚠️ Risk {agent.riskLevel}/5</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* HF Agents Grid */}
      {tab === "hf" && (
        <div className="mx-4 mt-3 space-y-2">
          {(hfAgents || []).map((agent: any) => {
            const isSelected = currentAgentType === agent.agentId;
            return (
              <button
                key={agent.id}
                onClick={() => handleSelect(agent.agentId)}
                disabled={selectMutation.isPending}
                className={`w-full rounded-2xl p-4 border text-left transition-all active:scale-[0.98] ${
                  isSelected
                    ? "bg-neon-green/10 border-neon-green/40 ring-1 ring-neon-green/20"
                    : "bg-[#1A1A2E] border-[#2A2A3E] hover:border-[#3A3A4E]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-14 h-14 rounded-full bg-[#0A0A0F] flex items-center justify-center text-3xl flex-shrink-0 ${
                    isSelected ? "border-2 border-neon-green" : "border border-[#2A2A3E]"
                  }`}>
                    {agent.avatarEmoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-sm text-[#E8E8E8]">{agent.name}</span>
                      {isSelected && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-neon-green/20 text-neon-green font-display font-bold">ACTIVE</span>
                      )}
                    </div>
                    <div className="flex gap-1.5 mt-1 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 font-display">
                        {agent.category}
                      </span>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-display"
                        style={{
                          backgroundColor: `${riskColors[agent.riskTolerance]}15`,
                          color: riskColors[agent.riskTolerance],
                          border: `1px solid ${riskColors[agent.riskTolerance]}30`,
                        }}
                      >
                        {agent.riskTolerance} risk
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2A2A3E] text-[#888899] font-display">
                        {agent.assetFocus}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#888899] mt-1 line-clamp-2">{agent.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2 ml-[66px]">
                  {agent.winRate > 0 && (
                    <span className="text-[9px] font-mono-num text-neon-green">🏆 {agent.winRate}% win</span>
                  )}
                  {agent.totalSignals > 0 && (
                    <span className="text-[9px] font-mono-num text-neon-cyan">📡 {agent.totalSignals} signals</span>
                  )}
                  {agent.avgConfidence > 0 && (
                    <span className="text-[9px] font-mono-num text-neon-gold">🎯 {agent.avgConfidence}% conf</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Bottom spacer */}
      <div className="h-8" />

      {/* Footer */}
      <div className="px-4 pb-4 text-center">
        <a href="https://www.perplexity.ai/computer" target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#555566]">
          Created with Perplexity Computer
        </a>
      </div>
    </div>
  );
}
