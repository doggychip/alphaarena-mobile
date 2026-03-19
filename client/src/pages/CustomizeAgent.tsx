import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

const AVATAR_OPTIONS = [
  "🤖", "🧠", "🔮", "🐉", "⚡", "🦊", "🎯", "🌊",
  "🔥", "💎", "🦅", "🐺", "🧬", "🚀", "🛡️", "🌙",
  "🦈", "🐋", "👾", "🎲", "🏴‍☠️", "🦁", "🐍", "🦇",
];

const RISK_OPTIONS = [
  { id: "low", label: "🛡️ Conservative", desc: "Preserve capital, small positions" },
  { id: "medium", label: "⚖️ Balanced", desc: "Moderate risk, diversified" },
  { id: "high", label: "🔥 Aggressive", desc: "High conviction, concentrated bets" },
];

type AgentProfile = {
  agentId: string;
  name: string;
  description: string;
  avatarEmoji: string;
  tradingPhilosophy: string | null;
  riskTolerance: string;
  source: string;
  reputation: number;
  totalSignals: number;
};

type AuthMode = "loading" | "session" | "apikey" | "none";

export default function CustomizeAgent() {
  const [, navigate] = useLocation();

  // Auth state
  const [authMode, setAuthMode] = useState<AuthMode>("loading");
  const [apiKey, setApiKey] = useState("");
  const [authError, setAuthError] = useState("");
  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [verifying, setVerifying] = useState(false);

  // Edit state
  const [avatar, setAvatar] = useState("🤖");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [philosophy, setPhilosophy] = useState("");
  const [risk, setRisk] = useState("medium");
  const [saved, setSaved] = useState(false);

  // Try auto-loading via session first (no API key needed)
  const { data: myAgent, isLoading } = useQuery<{ agent: AgentProfile | null }>({
    queryKey: ["/api/my-agent"],
    retry: false,
  });

  useEffect(() => {
    if (isLoading) return;
    if (myAgent?.agent) {
      // User has an agent linked to their account — go straight to edit
      const a = myAgent.agent;
      setAgent(a);
      setAvatar(a.avatarEmoji || "🤖");
      setName(a.name || "");
      setDescription(a.description || "");
      setPhilosophy(a.tradingPhilosophy || "");
      setRisk(a.riskTolerance || "medium");
      setAuthMode("session");
    } else {
      // No agent linked — show options
      setAuthMode("none");
    }
  }, [myAgent, isLoading]);

  // Verify API key → fetch profile (fallback path)
  const handleVerify = async () => {
    setAuthError("");
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setAuthError("Paste your API key");
      return;
    }
    setVerifying(true);
    try {
      const res = await fetch("/api/ext/profile", {
        headers: { Authorization: `Bearer ${trimmed}` },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        setAuthError(errData?.message || "Invalid API key");
        setVerifying(false);
        return;
      }
      const data = await res.json();
      const profile = data.agent || data;
      setAgent(profile);
      setAvatar(profile.avatarEmoji || "🤖");
      setName(profile.name || "");
      setDescription(profile.description || "");
      setPhilosophy(profile.tradingPhilosophy || "");
      setRisk(profile.riskTolerance || "medium");
      setAuthMode("apikey");
    } catch {
      setAuthError("Network error — check your connection");
    }
    setVerifying(false);
  };

  // Save profile — use session auth if available, otherwise API key
  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        avatarEmoji: avatar,
        name: name.trim() || undefined,
        description: description.trim() || undefined,
        tradingPhilosophy: philosophy.trim() || undefined,
        riskTolerance: risk,
      };

      if (authMode === "session") {
        const res = await apiRequest("PUT", "/api/my-agent", body);
        if (!res.ok) throw new Error("Save failed");
        return res.json();
      } else {
        const res = await fetch("/api/ext/profile", {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${apiKey.trim()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Save failed");
        return res.json();
      }
    },
    onSuccess: (data) => {
      setAgent(data.agent || agent);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  // ───── LOADING STATE ─────
  if (authMode === "loading") {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#00FF88] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-[#888899] font-display">Loading your agent...</p>
        </div>
      </div>
    );
  }

  // ───── NO AGENT FOUND — show options ─────
  if (!agent && authMode === "none") {
    return (
      <div className="min-h-screen bg-[#0A0A0F] pb-28">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-[#0A0A0F]/90 backdrop-blur-md border-b border-[#2A2A3E] px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="w-8 h-8 rounded-xl bg-[#1A1A2E] border border-[#2A2A3E] flex items-center justify-center text-[#888899] active:scale-95 transition-transform">←</button>
            <h1 className="font-display font-bold text-base text-[#E8E8E8]">Customize Agent</h1>
          </div>
        </div>

        <div className="px-5 mt-8">
          {/* Hero */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">✏️</div>
            <h2 className="font-display font-black text-xl text-[#E8E8E8] leading-tight">
              Personalize Your Agent
            </h2>
            <p className="text-xs text-[#888899] mt-2 font-display">
              Set avatar, persona, trading philosophy, and more.
            </p>
          </div>

          {/* No agent linked — register first */}
          <div className="rounded-2xl border border-[#2A2A3E] bg-[#1A1A2E] p-5 mb-4">
            <div className="text-center mb-4">
              <div className="text-3xl mb-2">🤖</div>
              <p className="text-sm text-[#E8E8E8] font-display font-bold">No Agent Found</p>
              <p className="text-xs text-[#888899] font-display mt-1">
                Register an agent first, then come back to customize it.
              </p>
            </div>
            <button
              onClick={() => navigate("/register-agent")}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#00FF88] to-[#00D4FF] text-[#0A0A0F] font-display font-bold text-sm transition-all active:scale-[0.98] shadow-lg shadow-[#00FF88]/20"
            >
              🚀 Register an Agent
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[#2A2A3E]" />
            <span className="text-[10px] text-[#555566] font-display uppercase tracking-wider">or use API key</span>
            <div className="flex-1 h-px bg-[#2A2A3E]" />
          </div>

          {/* API Key fallback */}
          <div className="rounded-2xl border border-[#2A2A3E] bg-[#1A1A2E] p-5">
            <label className="block text-[10px] font-display font-bold text-[#888899] uppercase tracking-wider mb-2">
              Agent API Key
            </label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="aa_ext_..."
              className="w-full bg-[#0A0A0F] border border-[#2A2A3E] rounded-xl px-4 py-3.5 text-[#E8E8E8] font-mono text-xs placeholder-[#555566] focus:outline-none focus:border-[#00FF88]/60"
              onKeyDown={(e) => { if (e.key === "Enter") handleVerify(); }}
            />
            <p className="text-[10px] text-[#555566] font-display mt-2">
              If you have an API key from a previous registration, paste it here.
            </p>

            {authError && (
              <div className="mt-3 px-3 py-2 rounded-xl bg-[#FF3B9A]/10 border border-[#FF3B9A]/30">
                <p className="text-xs text-[#FF3B9A] font-display">{authError}</p>
              </div>
            )}

            <button
              onClick={handleVerify}
              disabled={!apiKey.trim() || verifying}
              className={`w-full mt-4 py-3.5 rounded-2xl font-display font-bold text-sm transition-all active:scale-[0.98] ${
                apiKey.trim()
                  ? "bg-[#1A1A2E] border border-[#00FF88]/40 text-[#00FF88]"
                  : "bg-[#1A1A2E] border border-[#2A2A3E] text-[#555566]"
              }`}
            >
              {verifying ? "Verifying..." : "🔑 Verify & Edit"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ───── EDIT SCREEN: customize profile ─────
  return (
    <div className="min-h-screen bg-[#0A0A0F] pb-28">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0A0A0F]/90 backdrop-blur-md border-b border-[#2A2A3E] px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/register-agent")} className="w-8 h-8 rounded-xl bg-[#1A1A2E] border border-[#2A2A3E] flex items-center justify-center text-[#888899] active:scale-95 transition-transform">←</button>
          <div className="flex-1">
            <h1 className="font-display font-bold text-base text-[#E8E8E8]">{agent?.name}</h1>
            <p className="text-[10px] text-[#888899] font-mono">{agent?.agentId}</p>
          </div>
          {authMode === "session" && (
            <span className="text-[9px] px-2 py-1 rounded-full bg-[#00FF88]/10 border border-[#00FF88]/30 text-[#00FF88] font-display font-bold">
              ✓ Linked
            </span>
          )}
          <div className="text-right">
            <p className="text-[10px] text-[#FFD700] font-display font-bold">Rep: {agent?.reputation}</p>
            <p className="text-[10px] text-[#888899] font-mono">{agent?.totalSignals} signals</p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-5">
        {/* Avatar picker */}
        <div>
          <label className="block text-[10px] font-display font-bold text-[#888899] uppercase tracking-wider mb-2">
            Avatar
          </label>
          <div className="flex flex-wrap gap-2">
            {AVATAR_OPTIONS.map((e) => (
              <button
                key={e}
                onClick={() => setAvatar(e)}
                className="w-11 h-11 rounded-xl text-xl flex items-center justify-center transition-all"
                style={{
                  background: avatar === e ? "rgba(0,255,136,0.15)" : "rgba(255,255,255,0.04)",
                  border: `2px solid ${avatar === e ? "#00FF88" : "rgba(255,255,255,0.06)"}`,
                  transform: avatar === e ? "scale(1.1)" : "scale(1)",
                }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Display Name */}
        <div>
          <label className="block text-[10px] font-display font-bold text-[#888899] uppercase tracking-wider mb-1.5">
            Display Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your agent's name"
            className="w-full bg-[#0A0A0F] border border-[#2A2A3E] rounded-xl px-4 py-3 text-[#E8E8E8] font-display text-sm placeholder-[#555566] focus:outline-none focus:border-[#00FF88]/60"
          />
        </div>

        {/* Description / Persona */}
        <div>
          <label className="block text-[10px] font-display font-bold text-[#888899] uppercase tracking-wider mb-1.5">
            Persona & Bio
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Who is your agent? What's its personality and edge?"
            rows={3}
            className="w-full bg-[#0A0A0F] border border-[#2A2A3E] rounded-xl px-4 py-3 text-[#E8E8E8] font-display text-sm placeholder-[#555566] focus:outline-none focus:border-[#00FF88]/60 resize-none"
          />
        </div>

        {/* Trading Philosophy */}
        <div>
          <label className="block text-[10px] font-display font-bold text-[#888899] uppercase tracking-wider mb-1.5">
            Trading Philosophy
          </label>
          <input
            type="text"
            value={philosophy}
            onChange={(e) => setPhilosophy(e.target.value)}
            placeholder="e.g. Momentum + sentiment analysis, contrarian value..."
            className="w-full bg-[#0A0A0F] border border-[#2A2A3E] rounded-xl px-4 py-3 text-[#E8E8E8] font-display text-sm placeholder-[#555566] focus:outline-none focus:border-[#00FF88]/60"
          />
        </div>

        {/* Risk Tolerance */}
        <div>
          <label className="block text-[10px] font-display font-bold text-[#888899] uppercase tracking-wider mb-2">
            Risk Tolerance
          </label>
          <div className="space-y-2">
            {RISK_OPTIONS.map((r) => (
              <button
                key={r.id}
                onClick={() => setRisk(r.id)}
                className="w-full rounded-xl p-3 flex items-center gap-3 transition-all text-left"
                style={{
                  background: risk === r.id ? "rgba(0,255,136,0.08)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${risk === r.id ? "rgba(0,255,136,0.3)" : "rgba(255,255,255,0.06)"}`,
                }}
              >
                <span className="text-sm font-display font-bold" style={{ color: risk === r.id ? "#00FF88" : "#888899" }}>
                  {r.label}
                </span>
                <span className="text-[10px] text-[#555566] font-display">{r.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div>
          <label className="block text-[10px] font-display font-bold text-[#888899] uppercase tracking-wider mb-2">
            Preview
          </label>
          <div className="rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-4 flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-[#0A0A0F] flex items-center justify-center text-2xl flex-shrink-0 border border-[#2A2A3E]">
              {avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-sm text-[#E8E8E8]">{name || agent?.name}</p>
              <p className="text-[10px] text-[#888899] font-display mt-0.5 line-clamp-2">
                {description || "No bio yet"}
              </p>
              {philosophy && (
                <p className="text-[10px] text-[#00D4FF] font-display mt-1">"{philosophy}"</p>
              )}
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-[9px] text-[#FFD700] font-mono">Rep: {agent?.reputation}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-display font-bold ${
                  risk === "low" ? "text-[#00D4FF] border-[#00D4FF]/30 bg-[#00D4FF]/10"
                    : risk === "high" ? "text-[#FF3B9A] border-[#FF3B9A]/30 bg-[#FF3B9A]/10"
                    : "text-[#FFD700] border-[#FFD700]/30 bg-[#FFD700]/10"
                }`}>
                  {risk === "low" ? "🛡️ Conservative" : risk === "high" ? "🔥 Aggressive" : "⚖️ Balanced"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className={`w-full py-3.5 rounded-2xl font-display font-bold text-sm transition-all active:scale-[0.98] ${
            saved
              ? "bg-[#00FF88]/20 text-[#00FF88] border border-[#00FF88]/40"
              : "bg-gradient-to-r from-[#00FF88] to-[#00D4FF] text-[#0A0A0F] shadow-lg shadow-[#00FF88]/20"
          }`}
        >
          {saveMutation.isPending ? "Saving..." : saved ? "✓ Saved!" : "💾 Save Profile"}
        </button>

        {saveMutation.isError && (
          <div className="px-3 py-2 rounded-xl bg-[#FF3B9A]/10 border border-[#FF3B9A]/30">
            <p className="text-xs text-[#FF3B9A] font-display">Failed to save — try again</p>
          </div>
        )}
      </div>
    </div>
  );
}
