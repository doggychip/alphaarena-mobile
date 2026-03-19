// server/signalFetcher.ts

const HF_ENGINE_URL = process.env.HF_ENGINE_URL || "";
const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const INITIAL_DELAY_MS = 10 * 1000; // 10 seconds after startup

let lastFetchTime: string | null = null;
let lastRunId: string | null = null;
let fetchStatus: "idle" | "fetching" | "success" | "error" = "idle";
let errorMessage: string | null = null;

export function getSignalFetchStatus() {
  return { lastFetchTime, lastRunId, fetchStatus, errorMessage };
}

// Agent key mapping: Python engine uses "_agent" suffix, our storage doesn't
// Also some names differ
const AGENT_KEY_MAP: Record<string, string> = {
  "warren_buffett_agent": "warren_buffett",
  "charlie_munger_agent": "charlie_munger",
  "ben_graham_agent": "ben_graham",
  "peter_lynch_agent": "peter_lynch",
  "phil_fisher_agent": "phil_fisher",
  "cathie_wood_agent": "cathie_wood",
  "stanley_druckenmiller_agent": "stanley_druckenmiller",
  "michael_burry_agent": "michael_burry",
  "bill_ackman_agent": "bill_ackman",
  "aswath_damodaran_agent": "aswath_damodaran",
  "rakesh_jhunjhunwala_agent": "rakesh_jhunjhunwala",
  "mohnish_pabrai_agent": "mohnish_pabrai",
  "fundamentals_analyst_agent": "fundamentals_analyst",
  "technical_analyst_agent": "technical_analyst",
  "sentiment_analyst_agent": "sentiment_analyst",
  "news_sentiment_agent": "news_sentiment_analyst",
  "growth_analyst_agent": "growth_agent",
  "valuation_analyst_agent": "valuation_analyst",
  "risk_management_agent": "risk_manager",
};

// Time horizon by agent
const AGENT_TIME_HORIZON: Record<string, string> = {
  warren_buffett: "long", charlie_munger: "long", ben_graham: "long", mohnish_pabrai: "long",
  peter_lynch: "medium", phil_fisher: "long", cathie_wood: "long",
  stanley_druckenmiller: "medium", michael_burry: "medium", bill_ackman: "medium",
  aswath_damodaran: "medium", rakesh_jhunjhunwala: "medium",
  fundamentals_analyst: "medium", technical_analyst: "short", sentiment_analyst: "short",
  news_sentiment_analyst: "short", valuation_analyst: "medium", growth_agent: "medium",
  risk_manager: "short",
};

interface RawSignalData {
  signal: string;
  confidence: number;
  reasoning: any;
}

interface EngineResponse {
  run_id: string;
  run_at: string;
  analyst_signals: Record<string, Record<string, RawSignalData>>;
  status?: string;
}

async function fetchSignals(): Promise<void> {
  if (!HF_ENGINE_URL) return; // No engine URL configured, skip

  fetchStatus = "fetching";
  try {
    const response = await fetch(`${HF_ENGINE_URL}/signals/latest`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: EngineResponse = await response.json();

    // If engine is still warming up, skip
    if (data.status === "warming_up") {
      console.log("[SignalFetcher] Engine warming up, will retry...");
      fetchStatus = "idle";
      return;
    }

    // Skip if same run_id (no new data)
    if (data.run_id === lastRunId) {
      fetchStatus = "success";
      return;
    }

    // Transform signals
    const { storage } = await import("./storage");
    const signals: any[] = [];
    const latestSignals = await storage.getLatestSignals(1);
    let nextId = latestSignals[0]?.id ?? 1000;

    for (const [agentKey, tickerSignals] of Object.entries(data.analyst_signals)) {
      const agentId = AGENT_KEY_MAP[agentKey] || agentKey.replace(/_agent$/, "");

      // Verify this agent exists in our system
      const hfAgent = await storage.getHedgeFundAgent(agentId);
      if (!hfAgent) {
        console.log(`[SignalFetcher] Unknown agent: ${agentKey} → ${agentId}, skipping`);
        continue;
      }

      for (const [ticker, signalData] of Object.entries(tickerSignals)) {
        nextId++;
        signals.push({
          id: nextId,
          hedgeFundAgentId: agentId,
          ticker: ticker,
          signal: signalData.signal,
          confidence: signalData.confidence,
          reasoning: typeof signalData.reasoning === "string"
            ? signalData.reasoning
            : JSON.stringify(signalData.reasoning),
          targetPrice: null,
          timeHorizon: AGENT_TIME_HORIZON[agentId] || "medium",
          createdAt: data.run_at,
          isCorrect: null,
        });
      }
    }

    if (signals.length > 0) {
      storage.ingestLiveSignals(signals);
      console.log(`[SignalFetcher] Ingested ${signals.length} live signals from run ${data.run_id}`);
    }

    lastRunId = data.run_id;
    lastFetchTime = new Date().toISOString();
    fetchStatus = "success";
    errorMessage = null;

  } catch (err: any) {
    fetchStatus = "error";
    errorMessage = err.message;
    console.error(`[SignalFetcher] Error: ${err.message}`);
  }
}

export function startSignalFetcher(): void {
  if (!HF_ENGINE_URL) {
    console.log("[SignalFetcher] No HF_ENGINE_URL set, running with simulated signals only");
    return;
  }

  console.log(`[SignalFetcher] Starting — polling ${HF_ENGINE_URL} every ${POLL_INTERVAL_MS / 1000}s`);

  // Initial fetch after delay
  setTimeout(() => {
    fetchSignals();
    // Then poll regularly
    setInterval(fetchSignals, POLL_INTERVAL_MS);
  }, INITIAL_DELAY_MS);
}
