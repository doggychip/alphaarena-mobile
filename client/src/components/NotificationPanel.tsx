import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";

interface Notification {
  id: string;
  icon: string;
  title: string;
  body: string;
  time: string;
  type: "signal" | "portfolio" | "streak" | "system" | "agent";
  href?: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const TYPE_COLORS: Record<string, string> = {
  signal: "#00D4FF",
  portfolio: "#00FF88",
  streak: "#FFD700",
  system: "#888899",
  agent: "#FF3B9A",
};

export default function NotificationPanel({ onClose }: { onClose: () => void }) {
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("alphaarena_read_notifs");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });

  // Fetch data to build notifications from
  const { data: meData } = useQuery<any>({ queryKey: ["/api/me"] });
  const { data: priceData } = useQuery<any>({ queryKey: ["/api/prices"] });

  // Fetch recent signals for the user's selected agent
  const agentTier = meData?.agentTier || "meme";
  const isHF = agentTier === "hedge_fund";
  const selectedAgent = meData?.user?.selectedAgentType;

  const { data: hfAgentDetail } = useQuery<any>({
    queryKey: ["/api/hf-agents", selectedAgent],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/hf-agents/${selectedAgent}`);
      return res.json();
    },
    enabled: !!selectedAgent && isHF,
  });

  const { data: hfMapping } = useQuery<any[]>({
    queryKey: ["/api/agents", selectedAgent, "hedge-fund"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/agents/${selectedAgent}/hedge-fund`);
      return res.json();
    },
    enabled: !!selectedAgent && !isHF,
  });

  // Build notifications from real app data
  const notifications: Notification[] = [];
  const agent = meData?.agent;
  const user = meData?.user;
  const prices = priceData?.prices || [];

  // 1. Signal notifications — from HF agent or mapped HF agents
  const signals: any[] = [];
  if (isHF && hfAgentDetail?.latestSignals) {
    signals.push(...hfAgentDetail.latestSignals.slice(0, 5));
  } else if (!isHF && hfMapping) {
    for (const m of hfMapping) {
      if (m.latestSignal) signals.push(m.latestSignal);
    }
  }

  signals.forEach((sig, i) => {
    const emoji = sig.signal === "bullish" ? "🟢" : sig.signal === "bearish" ? "🔴" : "🟡";
    const confLabel = sig.confidence >= 75 ? "High" : sig.confidence >= 55 ? "Medium" : "Low";
    notifications.push({
      id: `sig-${sig.id || i}`,
      icon: emoji,
      title: `${sig.ticker} — ${sig.signal?.toUpperCase()}`,
      body: `${confLabel} confidence (${sig.confidence}%)${sig.targetPrice ? ` · Target $${sig.targetPrice < 1 ? sig.targetPrice.toFixed(4) : sig.targetPrice.toLocaleString()}` : ""}`,
      time: sig.createdAt ? timeAgo(sig.createdAt) : "recently",
      type: "signal",
      href: isHF ? `#/signals/${selectedAgent}` : undefined,
    });
  });

  // 2. Big price movers
  const bigMovers = prices.filter((p: any) => Math.abs(p.change24h) > 5);
  bigMovers.slice(0, 2).forEach((p: any) => {
    const direction = p.change24h >= 0 ? "up" : "down";
    notifications.push({
      id: `price-${p.pair}`,
      icon: p.change24h >= 0 ? "🚀" : "📉",
      title: `${p.pair.split("/")[0]} ${direction} ${Math.abs(p.change24h).toFixed(1)}%`,
      body: `Now trading at $${p.price < 1 ? p.price.toFixed(4) : p.price.toLocaleString()}`,
      time: "today",
      type: "portfolio",
    });
  });

  // 3. Streak
  if (user?.streak > 0) {
    notifications.push({
      id: `streak-${user.streak}`,
      icon: "🔥",
      title: `${user.streak} Day Trading Streak`,
      body: `Keep it going! +${user.streak >= 7 ? 50 : 20} XP daily bonus`,
      time: "today",
      type: "streak",
    });
  }

  // 4. Agent welcome
  if (agent) {
    notifications.push({
      id: `agent-${agent.type || agent.agentId}`,
      icon: agent.avatarEmoji || "🤖",
      title: `${agent.name} is active`,
      body: isHF ? (agent.tradingPhilosophy?.split('.')[0] || "Monitoring markets") : `"${agent.description}"`,
      time: "now",
      type: "agent",
      href: "#/agent",
    });
  }

  // 5. System — welcome / tips
  notifications.push({
    id: "sys-welcome",
    icon: "⚔️",
    title: "Welcome to Alpha Arena",
    body: "Trade with AI agents, compete on the leaderboard, and earn XP.",
    time: "",
    type: "system",
  });

  // Mark all as read
  const handleMarkAllRead = () => {
    const allIds = new Set(notifications.map(n => n.id));
    setReadIds(allIds);
    localStorage.setItem("alphaarena_read_notifs", JSON.stringify([...allIds]));
  };

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  const handleTap = (notif: Notification) => {
    // Mark as read
    const updated = new Set(readIds);
    updated.add(notif.id);
    setReadIds(updated);
    localStorage.setItem("alphaarena_read_notifs", JSON.stringify([...updated]));

    if (notif.href) {
      window.location.hash = notif.href;
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="absolute top-0 right-0 w-full max-w-[430px] h-full"
        onClick={e => e.stopPropagation()}
      >
        {/* Panel slides in from top */}
        <div
          className="mx-2 mt-14 rounded-2xl border border-[#2A2A3E] max-h-[75vh] flex flex-col overflow-hidden"
          style={{ background: "rgba(18, 18, 26, 0.98)", backdropFilter: "blur(20px)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A2A3E]">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔔</span>
              <h2 className="font-display font-bold text-base text-[#E8E8E8]">Notifications</h2>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-neon-pink/20 text-neon-pink text-[10px] font-display font-bold">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[10px] text-neon-cyan font-display"
                >
                  Mark all read
                </button>
              )}
              <button onClick={onClose} className="text-[#888899] text-lg leading-none">✕</button>
            </div>
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto hide-scrollbar">
            {notifications.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-3xl mb-2">🔕</p>
                <p className="text-sm text-[#888899] font-display">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-[#2A2A3E]">
                {notifications.map(notif => {
                  const isUnread = !readIds.has(notif.id);
                  return (
                    <button
                      key={notif.id}
                      onClick={() => handleTap(notif)}
                      className={`w-full text-left px-4 py-3 flex gap-3 items-start transition-colors active:bg-[#1E1E32] ${
                        isUnread ? "bg-[#1A1A2E]/50" : ""
                      }`}
                    >
                      {/* Icon */}
                      <div className="w-9 h-9 rounded-full bg-[#0A0A0F] border border-[#2A2A3E] flex items-center justify-center text-base flex-shrink-0">
                        {notif.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`font-display font-bold text-xs ${isUnread ? "text-[#E8E8E8]" : "text-[#888899]"}`}>
                            {notif.title}
                          </p>
                          {isUnread && (
                            <div className="w-2 h-2 rounded-full bg-neon-cyan flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-[11px] text-[#888899] mt-0.5 leading-relaxed line-clamp-2">{notif.body}</p>
                        {notif.time && (
                          <p className="text-[9px] mt-1" style={{ color: TYPE_COLORS[notif.type] || "#555566" }}>{notif.time}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Export a hook to get unread count for the badge
export function useUnreadCount() {
  const { data: meData } = useQuery<any>({ queryKey: ["/api/me"] });
  const { data: priceData } = useQuery<any>({ queryKey: ["/api/prices"] });

  const agentTier = meData?.agentTier || "meme";
  const isHF = agentTier === "hedge_fund";
  const selectedAgent = meData?.user?.selectedAgentType;

  const { data: hfAgentDetail } = useQuery<any>({
    queryKey: ["/api/hf-agents", selectedAgent],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/hf-agents/${selectedAgent}`);
      return res.json();
    },
    enabled: !!selectedAgent && isHF,
  });

  const { data: hfMapping } = useQuery<any[]>({
    queryKey: ["/api/agents", selectedAgent, "hedge-fund"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/agents/${selectedAgent}/hedge-fund`);
      return res.json();
    },
    enabled: !!selectedAgent && !isHF,
  });

  // Count notification IDs
  const ids: string[] = [];

  const signals: any[] = [];
  if (isHF && hfAgentDetail?.latestSignals) {
    signals.push(...hfAgentDetail.latestSignals.slice(0, 5));
  } else if (!isHF && hfMapping) {
    for (const m of hfMapping) {
      if (m.latestSignal) signals.push(m.latestSignal);
    }
  }
  signals.forEach((sig, i) => ids.push(`sig-${sig.id || i}`));

  const prices = priceData?.prices || [];
  prices.filter((p: any) => Math.abs(p.change24h) > 5).slice(0, 2).forEach((p: any) => ids.push(`price-${p.pair}`));

  if (meData?.user?.streak > 0) ids.push(`streak-${meData.user.streak}`);
  if (meData?.agent) ids.push(`agent-${meData.agent.type || meData.agent.agentId}`);
  ids.push("sys-welcome");

  try {
    const stored = localStorage.getItem("alphaarena_read_notifs");
    const readSet = stored ? new Set(JSON.parse(stored)) : new Set();
    return ids.filter(id => !readSet.has(id)).length;
  } catch {
    return ids.length;
  }
}
