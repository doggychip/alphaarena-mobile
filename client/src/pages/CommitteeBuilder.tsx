import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

// Types
type HFAgent = {
  agentId: string;
  name: string;
  avatarEmoji: string;
  category: string;
  winRate: number;
  riskTolerance: string;
  tradingPhilosophy?: string;
};

type ExternalAgent = {
  agentId: string;
  name: string;
  avatarEmoji: string;
  source: string;
  reputation: number;
  tradingPhilosophy?: string;
};

type SelectedMember = {
  agentId: string;
  agentSource: "internal" | "external";
  name: string;
  emoji: string;
  weight: number;
};

const COMMITTEE_EMOJIS = ["🏛️", "⚔️", "🎯", "🔥", "💎", "🧠", "🦅", "🐉", "👑", "🎪", "🌊", "🔮"];

function CategoryBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    momentum: "bg-neon-green/15 text-neon-green border-neon-green/30",
    value: "bg-neon-gold/15 text-neon-gold border-neon-gold/30",
    technical: "bg-neon-cyan/15 text-neon-cyan border-neon-cyan/30",
    macro: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    sentiment: "bg-neon-pink/15 text-neon-pink border-neon-pink/30",
    quant: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  };
  const lower = category?.toLowerCase() || "quant";
  const colorClass = colors[lower] || "bg-[#2A2A3E] text-[#888899] border-[#2A2A3E]";
  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-display font-bold uppercase ${colorClass}`}>
      {category}
    </span>
  );
}

export default function CommitteeBuilder() {
  const [, navigate] = useLocation();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🏛️");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selected, setSelected] = useState<SelectedMember[]>([]);
  const [error, setError] = useState("");

  const { data: hfAgents = [], isLoading: loadingHF } = useQuery<HFAgent[]>({
    queryKey: ["/api/hf-agents"],
  });

  const { data: externalAgents = [], isLoading: loadingExt } = useQuery<ExternalAgent[]>({
    queryKey: ["/api/agents/external"],
  });

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (body: object) => {
      const res = await apiRequest("POST", "/api/committees", body);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/committees"] });
      navigate(`/committee/${data.id}`);
    },
    onError: (err: Error) => {
      setError(err.message || "Failed to create committee");
    },
  });

  const isSelected = (agentId: string, source: "internal" | "external") =>
    selected.some((s) => s.agentId === agentId && s.agentSource === source);

  const toggleAgent = (
    agentId: string,
    source: "internal" | "external",
    agentName: string,
    agentEmoji: string
  ) => {
    if (isSelected(agentId, source)) {
      setSelected((prev) => prev.filter((s) => !(s.agentId === agentId && s.agentSource === source)));
    } else {
      if (selected.length >= 5) return;
      setSelected((prev) => [...prev, { agentId, agentSource: source, name: agentName, emoji: agentEmoji, weight: 1.0 }]);
    }
  };

  const updateWeight = (agentId: string, source: "internal" | "external", weight: number) => {
    setSelected((prev) =>
      prev.map((s) =>
        s.agentId === agentId && s.agentSource === source ? { ...s, weight } : s
      )
    );
  };

  const handleCreate = () => {
    if (!name.trim() || selected.length < 3) return;
    setError("");
    createMutation.mutate({
      name: name.trim(),
      emoji,
      description: `Committee: ${name.trim()}`,
      members: selected.map((s) => ({
        agentId: s.agentId,
        agentSource: s.agentSource,
        weight: s.weight,
      })),
    });
  };

  const canCreate = name.trim().length > 0 && selected.length >= 3;
  const loading = loadingHF || loadingExt;

  return (
    <div className="min-h-screen bg-[#0A0A0F] pb-28">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0A0A0F]/90 backdrop-blur-md border-b border-[#2A2A3E] px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate("/")}
          className="w-8 h-8 rounded-xl bg-[#1A1A2E] border border-[#2A2A3E] flex items-center justify-center text-[#888899] active:scale-95 transition-transform"
        >
          ←
        </button>
        <div className="flex-1">
          <h1 className="font-display font-bold text-base text-[#E8E8E8]">🏛️ Build Committee</h1>
          <p className="text-[10px] text-[#888899]">Assemble agents for consensus signals</p>
        </div>
        <div className="text-xs font-mono-num font-bold" style={{ color: selected.length >= 3 ? "#00FF88" : "#888899" }}>
          {selected.length}/5
        </div>
      </div>

      {/* Committee Name + Emoji */}
      <div className="mx-4 mt-4 rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-4">
        <p className="text-xs font-display font-bold text-[#888899] mb-3 uppercase tracking-wider">Committee Identity</p>
        <div className="flex gap-3">
          {/* Emoji picker trigger */}
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="w-14 h-14 rounded-2xl bg-[#0A0A0F] border border-[#2A2A3E] flex items-center justify-center text-2xl active:scale-95 transition-transform flex-shrink-0"
          >
            {emoji}
          </button>
          {/* Name input */}
          <div className="flex-1">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 30))}
              placeholder="Committee name..."
              className="w-full bg-[#0A0A0F] border border-[#2A2A3E] rounded-xl px-3 py-3 text-[#E8E8E8] font-display text-sm placeholder-[#444455] focus:outline-none focus:border-[#00FF88]/50"
            />
            <p className="text-[10px] text-[#555566] mt-1 text-right">{name.length}/30</p>
          </div>
        </div>

        {/* Emoji grid */}
        {showEmojiPicker && (
          <div className="mt-3 grid grid-cols-6 gap-2 p-3 rounded-xl bg-[#0A0A0F] border border-[#2A2A3E]">
            {COMMITTEE_EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => { setEmoji(e); setShowEmojiPicker(false); }}
                className={`text-2xl p-2 rounded-xl transition-all active:scale-90 ${
                  emoji === e ? "bg-[#00FF88]/20 border border-[#00FF88]/50" : "hover:bg-[#2A2A3E]"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selection count */}
      <div className="mx-4 mt-4 flex items-center justify-between">
        <p className="text-xs font-display font-bold text-[#888899]">
          🤖 Select Agents <span className="text-[10px] text-[#555566]">(min 3, max 5)</span>
        </p>
        <span
          className={`text-xs font-mono-num font-bold px-2 py-0.5 rounded-full ${
            selected.length >= 3
              ? "bg-[#00FF88]/15 text-[#00FF88]"
              : "bg-[#1A1A2E] text-[#888899]"
          }`}
        >
          {selected.length}/5 selected
        </span>
      </div>

      {/* Agent list */}
      {loading ? (
        <div className="mx-4 mt-3 space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="mx-4 mt-3 space-y-2">
          {/* HF Agents */}
          {hfAgents.map((agent) => {
            const sel = isSelected(agent.agentId, "internal");
            const member = selected.find((s) => s.agentId === agent.agentId && s.agentSource === "internal");
            return (
              <div key={`hf-${agent.agentId}`}>
                <button
                  onClick={() => toggleAgent(agent.agentId, "internal", agent.name, agent.avatarEmoji)}
                  className={`w-full rounded-2xl p-3 text-left transition-all active:scale-[0.98] ${
                    sel
                      ? "bg-[#00FF88]/10 border border-[#00FF88]/50"
                      : selected.length >= 5
                      ? "bg-[#1A1A2E] border border-[#2A2A3E] opacity-50"
                      : "bg-[#1A1A2E] border border-[#2A2A3E]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-[#0A0A0F] flex items-center justify-center text-xl flex-shrink-0">
                        {agent.avatarEmoji}
                      </div>
                      {sel && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#00FF88] flex items-center justify-center text-[8px] font-bold text-black">
                          ✓
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-sm text-[#E8E8E8] truncate">{agent.name}</span>
                        <CategoryBadge category={agent.category} />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-neon-green font-mono-num">{agent.winRate}% WR</span>
                        <span className="text-[10px] text-[#555566]">•</span>
                        <span className="text-[10px] text-[#888899] capitalize">{agent.riskTolerance} risk</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-[#555566] font-display">Internal</span>
                  </div>
                </button>
                {/* Weight slider */}
                {sel && member && (
                  <div className="mx-2 mt-1 mb-1 px-3 py-2.5 rounded-xl bg-[#00FF88]/5 border border-[#00FF88]/20">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-[#888899] font-display">Weight multiplier</span>
                      <span className="text-xs font-mono-num font-bold text-[#00FF88]">{member.weight.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="20"
                      step="1"
                      value={Math.round(member.weight * 10)}
                      onChange={(e) => updateWeight(agent.agentId, "internal", parseInt(e.target.value) / 10)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full accent-[#00FF88] h-1.5 cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-[#555566] font-mono-num mt-0.5">
                      <span>0.5x</span>
                      <span>1.0x</span>
                      <span>2.0x</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* External Agents */}
          {externalAgents.length > 0 && (
            <div className="mt-2">
              <p className="text-[10px] text-[#555566] font-display font-bold uppercase tracking-wider px-1 mb-2">External Agents</p>
              {externalAgents.map((agent) => {
                const sel = isSelected(agent.agentId, "external");
                const member = selected.find((s) => s.agentId === agent.agentId && s.agentSource === "external");
                return (
                  <div key={`ext-${agent.agentId}`} className="mb-2">
                    <button
                      onClick={() => toggleAgent(agent.agentId, "external", agent.name, agent.avatarEmoji)}
                      className={`w-full rounded-2xl p-3 text-left transition-all active:scale-[0.98] ${
                        sel
                          ? "bg-[#00FF88]/10 border border-[#00FF88]/50"
                          : selected.length >= 5
                          ? "bg-[#1A1A2E] border border-[#2A2A3E] opacity-50"
                          : "bg-[#1A1A2E] border border-[#2A2A3E]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-[#0A0A0F] flex items-center justify-center text-xl flex-shrink-0">
                            {agent.avatarEmoji}
                          </div>
                          {sel && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#00FF88] flex items-center justify-center text-[8px] font-bold text-black">
                              ✓
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-display font-bold text-sm text-[#E8E8E8] truncate">{agent.name}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full border bg-neon-pink/10 text-neon-pink border-neon-pink/30 font-display font-bold uppercase">
                              {agent.source}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-neon-gold font-mono-num">Rep: {agent.reputation}</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-[#555566] font-display">External</span>
                      </div>
                    </button>
                    {sel && member && (
                      <div className="mx-2 mt-1 mb-1 px-3 py-2.5 rounded-xl bg-[#00FF88]/5 border border-[#00FF88]/20">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-[#888899] font-display">Weight multiplier</span>
                          <span className="text-xs font-mono-num font-bold text-[#00FF88]">{member.weight.toFixed(1)}x</span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="20"
                          step="1"
                          value={Math.round(member.weight * 10)}
                          onChange={(e) => updateWeight(agent.agentId, "external", parseInt(e.target.value) / 10)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full accent-[#00FF88] h-1.5 cursor-pointer"
                        />
                        <div className="flex justify-between text-[9px] text-[#555566] font-mono-num mt-0.5">
                          <span>0.5x</span>
                          <span>1.0x</span>
                          <span>2.0x</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Preview Panel */}
      {selected.length > 0 && (
        <div className="mx-4 mt-4 rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-4">
          <p className="text-xs font-display font-bold text-[#888899] mb-3 uppercase tracking-wider">Preview</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {selected.map((m) => (
              <div key={`${m.agentSource}-${m.agentId}`} className="flex-shrink-0 flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full bg-[#0A0A0F] border border-[#00FF88]/40 flex items-center justify-center text-xl">
                  {m.emoji}
                </div>
                <span className="text-[9px] text-[#E8E8E8] font-display max-w-[52px] truncate text-center">{m.name}</span>
                <span className="text-[9px] font-mono-num text-neon-green">{m.weight.toFixed(1)}x</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-4 mt-3 px-3 py-2 rounded-xl bg-neon-pink/10 border border-neon-pink/30">
          <p className="text-xs text-neon-pink font-display">{error}</p>
        </div>
      )}

      {/* Create button */}
      <div className="mx-4 mt-4">
        {!canCreate && (
          <p className="text-[10px] text-[#555566] font-display text-center mb-2">
            {!name.trim() ? "Enter a committee name" : `Select ${3 - selected.length} more agent${3 - selected.length !== 1 ? "s" : ""}`}
          </p>
        )}
        <button
          onClick={handleCreate}
          disabled={!canCreate || createMutation.isPending}
          className={`w-full py-4 rounded-2xl font-display font-bold text-sm transition-all active:scale-[0.98] ${
            canCreate
              ? "bg-gradient-to-r from-[#FFD700] to-[#FF3B9A] text-black shadow-lg"
              : "bg-[#1A1A2E] border border-[#2A2A3E] text-[#555566] cursor-not-allowed"
          }`}
        >
          {createMutation.isPending ? "Creating..." : `✨ Create ${emoji} ${name || "Committee"}`}
        </button>
      </div>
    </div>
  );
}
