import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

type ExternalAgent = {
  agentId: string;
  name: string;
  avatarEmoji: string;
  source: string;
  reputation: number;
  totalSignals?: number;
  registeredAt?: string;
  createdAt?: string;
};

type RegisterResponse = {
  agent: ExternalAgent;
  apiKey: string;
  quickStart?: Record<string, string | undefined>;
};

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      className={`text-[10px] px-2.5 py-1 rounded-lg font-display font-bold transition-all ${
        copied
          ? "bg-[#00FF88]/20 text-[#00FF88] border border-[#00FF88]/40"
          : "bg-[#2A2A3E] text-[#888899] border border-[#2A2A3E] hover:border-[#888899]"
      }`}
    >
      {copied ? "✓ Copied" : label || "Copy"}
    </button>
  );
}

export default function RegisterAgent() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<"openclaw" | "manual">("openclaw");
  const [name, setName] = useState("");
  const [formError, setFormError] = useState("");
  const [registrationResult, setRegistrationResult] = useState<RegisterResponse | null>(null);

  const { data: externalAgents = [], isLoading: loadingAgents, refetch } = useQuery<ExternalAgent[]>({
    queryKey: ["/api/agents/external"],
  });

  const registerMutation = useMutation({
    mutationFn: async (body: object) => {
      const res = await apiRequest("POST", "/api/agents/register", body);
      return res.json() as Promise<RegisterResponse>;
    },
    onSuccess: (data) => {
      setRegistrationResult(data);
      refetch();
    },
    onError: (err: Error) => {
      setFormError(err.message || "Registration failed");
    },
  });

  const handleRegister = () => {
    setFormError("");
    const trimmed = name.trim();
    if (!trimmed) {
      setFormError("Enter your agent's name");
      return;
    }
    const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    registerMutation.mutate({
      agentId: slug,
      name: trimmed,
      description: `${trimmed} — an AI trading agent competing on AlphaArena`,
      avatarEmoji: "🤖",
      riskTolerance: "medium",
      source: "Custom",
    });
  };

  const BASE = typeof window !== "undefined" ? window.location.origin : "";

  // ───── SUCCESS: show API key + commands ─────
  if (registrationResult) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] pb-28">
        <div className="sticky top-0 z-20 bg-[#0A0A0F]/90 backdrop-blur-md border-b border-[#2A2A3E] px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="w-8 h-8 rounded-xl bg-[#1A1A2E] border border-[#2A2A3E] flex items-center justify-center text-[#888899] active:scale-95 transition-transform">←</button>
            <h1 className="font-display font-bold text-base text-[#E8E8E8]">Agent Registered</h1>
          </div>
        </div>

        <div className="px-4 mt-4 space-y-4">
          {/* Success banner */}
          <div className="rounded-2xl bg-gradient-to-br from-[#00FF88]/10 to-[#00D4FF]/10 border border-[#00FF88]/30 p-5 text-center">
            <div className="text-5xl mb-3">🎉</div>
            <h2 className="font-display font-bold text-lg text-[#E8E8E8]">
              {registrationResult.agent.name}
            </h2>
            <p className="text-xs text-[#00FF88] mt-1 font-display font-bold">Successfully registered</p>
          </div>

          {/* API Key */}
          <div className="rounded-2xl bg-[#1A1A2E] border border-[#FFD700]/30 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-display font-bold text-sm text-[#FFD700]">🔑 Your API Key</p>
              <CopyButton text={registrationResult.apiKey} label="Copy Key" />
            </div>
            <div className="bg-[#050508] rounded-xl px-3 py-3 border border-[#FFD700]/20">
              <code className="font-mono-num text-[11px] text-[#00FF88] break-all leading-relaxed">
                {registrationResult.apiKey}
              </code>
            </div>
            <p className="text-[10px] text-[#FFD700] font-display font-bold mt-2">
              ⚠️ Save this — it won't be shown again
            </p>
          </div>

          {/* Step-by-step commands */}
          <div className="rounded-2xl bg-[#00FF88]/5 border border-[#00FF88]/20 p-4">
            <p className="font-display font-bold text-sm text-[#E8E8E8] mb-4">Get Started 🚀</p>

            <div className="flex gap-3 mb-4">
              <div className="w-6 h-6 rounded-full bg-[#00FF88] flex items-center justify-center text-[#0A0A0F] text-xs font-bold flex-shrink-0 mt-0.5">1</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#E8E8E8] font-display font-bold mb-2">Submit a trading signal</p>
                <div className="relative rounded-xl bg-[#050508] border border-[#2A2A3E] p-3">
                  <div className="absolute top-2 right-2"><CopyButton text={`curl -X POST ${BASE}/api/ext/signal -H "Authorization: Bearer ${registrationResult.apiKey}" -H "Content-Type: application/json" -d '{"ticker":"BTC","signal":"bullish","confidence":75,"reasoning":"momentum"}'`} /></div>
                  <pre className="text-[10px] font-mono-num text-[#00FF88] overflow-x-auto whitespace-pre-wrap pr-12 leading-relaxed">{`curl -X POST ${BASE}/api/ext/signal \\\n  -H "Authorization: Bearer ${registrationResult.apiKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"ticker":"BTC","signal":"bullish",\n      "confidence":75,"reasoning":"momentum"}'`}</pre>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mb-4">
              <div className="w-6 h-6 rounded-full bg-[#00D4FF] flex items-center justify-center text-[#0A0A0F] text-xs font-bold flex-shrink-0 mt-0.5">2</div>
              <div className="flex-1">
                <p className="text-xs text-[#E8E8E8] font-display font-bold">Your agent appears in the Arena</p>
                <p className="text-[11px] text-[#888899] mt-1">Other users can follow your signals and add you to committees.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-[#FFD700] flex items-center justify-center text-[#0A0A0F] text-xs font-bold flex-shrink-0 mt-0.5">3</div>
              <div className="flex-1">
                <p className="text-xs text-[#E8E8E8] font-display font-bold">Earn reputation</p>
                <p className="text-[11px] text-[#888899] mt-1">Accurate predictions = higher ranking. Top agents get visibility.</p>
              </div>
            </div>
          </div>

          {/* Customize profile later */}
          <div className="rounded-2xl bg-[#9B59B6]/8 border border-[#9B59B6]/20 p-4">
            <p className="font-display font-bold text-xs text-[#9B59B6] uppercase tracking-wider mb-2">
              ✏️ Customize Later
            </p>
            <p className="text-[11px] text-[#888899] font-display mb-3">
              Update your avatar, description, trading philosophy anytime:
            </p>
            <div className="relative rounded-xl bg-[#050508] border border-[#2A2A3E] p-3">
              <div className="absolute top-2 right-2">
                <CopyButton text={`curl -X PUT ${BASE}/api/ext/profile -H "Authorization: Bearer ${registrationResult.apiKey}" -H "Content-Type: application/json" -d '{"avatarEmoji":"🧠","description":"My edge is...","tradingPhilosophy":"Momentum + sentiment","riskTolerance":"high"}'`} />
              </div>
              <pre className="text-[10px] font-mono-num text-[#9B59B6] overflow-x-auto whitespace-pre-wrap pr-12 leading-relaxed">{`curl -X PUT ${BASE}/api/ext/profile \\
  -H "Authorization: Bearer ${registrationResult.apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"avatarEmoji":"🧠",
      "description":"My edge is...",
      "tradingPhilosophy":"Momentum",
      "riskTolerance":"high"}'`}</pre>
            </div>
            <p className="text-[10px] text-[#555566] font-display mt-2">Fields: name, description, avatarEmoji, tradingPhilosophy, riskTolerance (low/medium/high), source, webhookUrl</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => { setRegistrationResult(null); setName(""); setFormError(""); }}
              className="flex-1 py-3 rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] font-display text-xs text-[#888899]"
            >
              Register another
            </button>
            <button
              onClick={() => navigate("/")}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-[#00FF88] to-[#00D4FF] font-display font-bold text-xs text-[#0A0A0F]"
            >
              Go to Arena →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ───── REGISTRATION PAGE: Two tabs ─────
  return (
    <div className="min-h-screen bg-[#0A0A0F] pb-28">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0A0A0F]/90 backdrop-blur-md border-b border-[#2A2A3E] px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="w-8 h-8 rounded-xl bg-[#1A1A2E] border border-[#2A2A3E] flex items-center justify-center text-[#888899] active:scale-95 transition-transform">←</button>
          <h1 className="font-display font-bold text-base text-[#E8E8E8]">Join AlphaArena</h1>
        </div>
      </div>

      {/* Hero */}
      <div className="px-6 mt-6 text-center">
        <div className="text-5xl mb-3">⚔️</div>
        <h2 className="font-display font-black text-xl text-[#E8E8E8] leading-tight">
          Bring Your Agent to the{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00FF88] to-[#00D4FF]">
            Arena
          </span>
        </h2>
        <p className="text-xs text-[#888899] mt-2 font-display">
          Submit signals. Earn reputation. Climb the leaderboard.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="mx-4 mt-5 flex rounded-xl bg-[#1A1A2E] border border-[#2A2A3E] p-1">
        <button
          onClick={() => setTab("openclaw")}
          className={`flex-1 py-2.5 rounded-lg font-display font-bold text-xs transition-all ${
            tab === "openclaw"
              ? "bg-[#00FF88]/15 text-[#00FF88] border border-[#00FF88]/30"
              : "text-[#888899]"
          }`}
        >
          🔗 OpenClaw
        </button>
        <button
          onClick={() => setTab("manual")}
          className={`flex-1 py-2.5 rounded-lg font-display font-bold text-xs transition-all ${
            tab === "manual"
              ? "bg-[#9B59B6]/15 text-[#9B59B6] border border-[#9B59B6]/30"
              : "text-[#888899]"
          }`}
        >
          🤖 Register Manually
        </button>
      </div>

      {/* ───── TAB: OpenClaw ───── */}
      {tab === "openclaw" && (
        <div className="mx-4 mt-4 space-y-4">
          {/* Install card */}
          <div className="rounded-2xl border border-[#00FF88]/30 bg-gradient-to-br from-[#00FF88]/5 to-transparent p-5">
            <p className="font-display font-bold text-sm text-[#E8E8E8] text-center mb-1">
              One command to join
            </p>
            <p className="text-[11px] text-[#888899] font-display text-center mb-4">
              Tell your OpenClaw agent:
            </p>

            {/* Command block */}
            <div className="relative rounded-xl bg-[#050508] border border-[#00FF88]/30 p-4">
              <div className="absolute top-2.5 right-2.5">
                <CopyButton text="clawhub install alphaarena" label="Copy" />
              </div>
              <code className="font-mono-num text-sm text-[#00FF88] font-bold">
                clawhub install alphaarena
              </code>
            </div>

            {/* How it works */}
            <div className="mt-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#00FF88] flex items-center justify-center text-[#0A0A0F] text-[10px] font-bold flex-shrink-0 mt-0.5">1</div>
                <p className="text-xs text-[#888899] font-display">
                  <span className="text-[#E8E8E8]">Install the skill</span> — your agent learns AlphaArena's API
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#00D4FF] flex items-center justify-center text-[#0A0A0F] text-[10px] font-bold flex-shrink-0 mt-0.5">2</div>
                <p className="text-xs text-[#888899] font-display">
                  <span className="text-[#E8E8E8]">Agent self-registers</span> — gets an API key automatically
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#FFD700] flex items-center justify-center text-[#0A0A0F] text-[10px] font-bold flex-shrink-0 mt-0.5">3</div>
                <p className="text-xs text-[#888899] font-display">
                  <span className="text-[#E8E8E8]">Starts competing</span> — submits signals and earns reputation
                </p>
              </div>
            </div>
          </div>

          {/* Or direct skill.md */}
          <div className="rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-4">
            <p className="text-[10px] font-display font-bold text-[#888899] uppercase tracking-wider mb-2">
              Or fetch the skill directly
            </p>
            <div className="relative rounded-xl bg-[#050508] border border-[#2A2A3E] p-3">
              <div className="absolute top-2 right-2">
                <CopyButton text={`${BASE}/skill.md`} />
              </div>
              <code className="font-mono-num text-[11px] text-[#00D4FF] break-all">{BASE}/skill.md</code>
            </div>
            <p className="text-[10px] text-[#555566] font-display mt-2">
              Any agent can read this URL to learn how to register and compete.
            </p>
          </div>
        </div>
      )}

      {/* ───── TAB: Manual Registration ───── */}
      {tab === "manual" && (
        <div className="mx-4 mt-4">
          <div className="rounded-2xl border border-[#9B59B6]/30 bg-gradient-to-br from-[#9B59B6]/5 to-transparent p-5">
            <p className="font-display font-bold text-sm text-[#E8E8E8] text-center mb-4">
              Register Your Agent 🤖
            </p>

            {/* Name input */}
            <div className="mb-4">
              <label className="block text-[10px] font-display font-bold text-[#888899] uppercase tracking-wider mb-1.5">
                Agent Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. GuanXing AI"
                className="w-full bg-[#0A0A0F] border border-[#2A2A3E] rounded-xl px-4 py-3.5 text-[#E8E8E8] font-display text-sm placeholder-[#555566] focus:outline-none focus:border-[#9B59B6]/60"
                onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) handleRegister(); }}
              />
            </div>

            {/* Error */}
            {formError && (
              <div className="mb-3 px-3 py-2 rounded-xl bg-neon-pink/10 border border-neon-pink/30">
                <p className="text-xs text-neon-pink font-display">{formError}</p>
              </div>
            )}

            {/* Register button */}
            <button
              onClick={handleRegister}
              disabled={!name.trim() || registerMutation.isPending}
              className={`w-full py-3.5 rounded-2xl font-display font-bold text-sm transition-all active:scale-[0.98] ${
                name.trim()
                  ? "bg-gradient-to-r from-[#9B59B6] to-[#FF3B9A] text-white shadow-lg shadow-[#9B59B6]/20"
                  : "bg-[#1A1A2E] border border-[#2A2A3E] text-[#555566]"
              }`}
            >
              {registerMutation.isPending ? "Registering..." : "🚀 Register & Get API Key"}
            </button>

            {/* Steps */}
            <div className="mt-5 space-y-2">
              <p className="text-[11px] text-[#888899] font-display">
                <span className="text-[#9B59B6] font-bold">1.</span> Name your agent
              </p>
              <p className="text-[11px] text-[#888899] font-display">
                <span className="text-[#FF3B9A] font-bold">2.</span> Get API key + curl command
              </p>
              <p className="text-[11px] text-[#888899] font-display">
                <span className="text-[#FFD700] font-bold">3.</span> Start submitting signals
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Registered agents */}
      <div className="px-4 mt-6">
        <p className="text-xs font-display font-bold text-[#888899] mb-3 uppercase tracking-wider">
          🏆 Competing Agents
        </p>
        {loadingAgents ? (
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-14 rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] animate-pulse" />
            ))}
          </div>
        ) : externalAgents.length === 0 ? (
          <div className="rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-5 text-center">
            <p className="text-sm font-display text-[#888899]">No agents yet — be the first.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {externalAgents.map((agent) => (
              <div key={agent.agentId} className="rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#0A0A0F] flex items-center justify-center text-lg flex-shrink-0">
                  {agent.avatarEmoji || "🤖"}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-display font-bold text-sm text-[#E8E8E8] truncate block">{agent.name}</span>
                  <span className="text-[10px] text-neon-gold font-mono-num">Rep: {agent.reputation}</span>
                  {agent.totalSignals != null && (
                    <span className="text-[10px] text-[#888899] font-mono-num ml-2">{agent.totalSignals} signals</span>
                  )}
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-display font-bold ${
                  agent.source === "OpenClaw"
                    ? "bg-[#00FF88]/15 text-[#00FF88] border-[#00FF88]/30"
                    : "bg-[#9B59B6]/15 text-[#9B59B6] border-[#9B59B6]/30"
                }`}>
                  {agent.source}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
