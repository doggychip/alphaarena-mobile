/**
 * Debate Engine — Multi-agent AI deliberation system
 * 
 * Adapted from HeartAI's group-chat/generate pattern.
 * Each agent in a committee speaks sequentially, referencing previous speakers,
 * building a running context, with a final verdict synthesizer.
 * 
 * Flow:
 *   1. User triggers debate on a ticker for a committee
 *   2. Each member agent gets a persona prompt + market context + previous arguments
 *   3. Agents generate sequential responses, each seeing what came before
 *   4. A final "Verdict" synthesizer weighs all arguments into a consensus
 */

import OpenAI from "openai";
import type { IStorage } from "./storage";
import { getCurrentPrices } from "./prices";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "sk-af8fc2d824cc48a79dee836d13ab28ed";

// ── Agent Debate Personas ────────────────────────────────────────────

interface AgentDebateProfile {
  agentId: string;
  name: string;
  emoji: string;
  systemPrompt: string;
}

/**
 * Build a debate persona for any agent (HF, meme, or external).
 * Each agent argues from their unique perspective — like HeartAI's masters
 * but for trading analysis.
 */
function buildDebatePersona(agent: {
  agentId: string;
  name: string;
  emoji?: string;
  avatarEmoji?: string;
  category?: string;
  description?: string;
  tradingPhilosophy?: string;
  riskTolerance?: string;
  assetFocus?: string;
}): AgentDebateProfile {
  const emoji = agent.emoji || agent.avatarEmoji || "🤖";
  const category = agent.category || "analyst";
  const philosophy = agent.tradingPhilosophy || agent.description || "";
  const risk = agent.riskTolerance || "medium";
  const focus = agent.assetFocus || "equity + crypto";

  // Category-specific debate styles (like HeartAI's master personalities)
  const STYLE_MAP: Record<string, string> = {
    persona: `You're opinionated and colorful. You argue with conviction and personality. Use vivid metaphors and strong language. Don't hedge — pick a side.`,
    specialist: `You're a deep domain expert. You focus on your specialty area with precision and data. You challenge broad generalizations with specific evidence.`,
    management: `You synthesize and challenge. You poke holes in other agents' logic, ask tough questions, and push for clearer reasoning. You play devil's advocate when everyone agrees too quickly.`,
    // External agents default
    external: `You're an independent thinker. You bring an outside perspective that may challenge the group's assumptions. Be direct and don't defer to authority.`,
  };

  const styleGuide = STYLE_MAP[category] || STYLE_MAP.external;

  const systemPrompt = `You are "${agent.name}" ${emoji}, a trading AI agent in AlphaArena's debate chamber.

YOUR IDENTITY:
- Category: ${category}
- Trading philosophy: ${philosophy || "data-driven analysis"}
- Risk tolerance: ${risk}
- Asset focus: ${focus}

DEBATE STYLE:
${styleGuide}

RULES:
- Keep responses under 120 words — punchy and decisive
- You MUST state your stance clearly: BULLISH, BEARISH, or NEUTRAL
- Reference and respond to previous speakers by name when you disagree or agree
- Use specific reasoning (technical, fundamental, sentiment, macro)
- Don't be generic — have a strong point of view
- End with a clear one-liner conviction statement
- Write in English`;

  return { agentId: agent.agentId, name: agent.name, emoji, systemPrompt };
}

// ── Verdict Synthesizer ──────────────────────────────────────────────

const VERDICT_SYSTEM_PROMPT = `You are the AlphaArena Debate Verdict AI — the final judge.

Your role: Synthesize all agents' arguments into a clear consensus verdict.

RULES:
- Weigh the strength of each agent's reasoning, not just count votes
- Identify the strongest bull and bear arguments
- Note any critical disagreements or blind spots
- Declare a final verdict: BULLISH, BEARISH, or NEUTRAL
- Give a confidence score (0-100)
- Keep it under 150 words
- Format: Start with "⚖️ VERDICT: [SIGNAL] (Confidence: X%)" then explain

Write in English.`;

// ── Core Debate Function ─────────────────────────────────────────────

export interface DebateResult {
  debateId: number;
  messages: Array<{
    id: number;
    agentId: string;
    agentName: string;
    agentEmoji: string;
    stance: string;
    content: string;
    round: number;
    messageOrder: number;
  }>;
  verdict: {
    signal: string;
    confidence: number;
    summary: string;
  } | null;
}

export async function runDebate(
  storage: IStorage,
  committeeId: number,
  ticker: string,
): Promise<DebateResult | null> {
  if (!DEEPSEEK_API_KEY) return null;

  const client = new OpenAI({
    baseURL: "https://api.deepseek.com",
    apiKey: DEEPSEEK_API_KEY,
  });

  // Get committee members + agent metadata
  const members = await storage.getCommitteeMembers(committeeId);
  if (members.length === 0) return null;

  const agentProfiles: AgentDebateProfile[] = [];
  for (const m of members) {
    const hf = await storage.getHedgeFundAgent(m.agentId);
    const ext = !hf ? await storage.getExternalAgent(m.agentId) : undefined;
    const agent = hf || ext;
    if (agent) {
      agentProfiles.push(buildDebatePersona(agent as any));
    } else {
      agentProfiles.push({
        agentId: m.agentId,
        name: m.agentId,
        emoji: "🤖",
        systemPrompt: `You are agent "${m.agentId}". Analyze ${ticker} and state your stance clearly.`,
      });
    }
  }

  // Get market context
  let marketContext = "";
  try {
    const prices = getCurrentPrices();
    const price = prices.find((p: any) => p.pair?.includes(ticker) || p.ticker === ticker);
    if (price) {
      marketContext = `\nCurrent ${ticker} price: $${price.price?.toFixed(2) || "N/A"} | 24h change: ${price.change24h?.toFixed(2) || "N/A"}%`;
    }
  } catch {}

  // Get each agent's latest signal on this ticker for context
  let signalContext = "\n--- Recent agent signals ---\n";
  for (const profile of agentProfiles) {
    const sig = await storage.getLatestSignalByAgent(profile.agentId, ticker);
    if (sig) {
      signalContext += `${profile.name}: ${sig.signal} (${sig.confidence}% confidence) — "${sig.reasoning?.slice(0, 80)}"\n`;
    }
  }

  // Create debate session
  const debate = await storage.createDebate({
    committeeId,
    ticker,
    status: "active",
    rounds: 1,
    verdictSignal: null,
    verdictConfidence: null,
    verdictSummary: null,
    createdAt: new Date().toISOString(),
  });

  // ── Sequential generation (HeartAI pattern) ────────────────────
  const generatedMessages: DebateResult["messages"] = [];
  let runningContext = `🎯 DEBATE TOPIC: Should we be BULLISH, BEARISH, or NEUTRAL on ${ticker}?${marketContext}${signalContext}\n\n--- Debate begins ---\n`;

  for (let i = 0; i < agentProfiles.length; i++) {
    const profile = agentProfiles[i];
    const isFirst = i === 0;

    try {
      const response = await client.chat.completions.create({
        model: "deepseek-chat",
        max_tokens: 250,
        temperature: 0.85,
        messages: [
          { role: "system", content: profile.systemPrompt },
          {
            role: "user",
            content: runningContext + `\n\nRespond as ${profile.name}. ${isFirst ? "You speak first — set the tone." : "Reference and respond to what the previous speakers said."}`,
          },
        ],
      });

      const content = response.choices[0]?.message?.content?.trim() || `${profile.name} is thinking...`;

      // Extract stance from content
      const stanceLower = content.toLowerCase();
      const stance = stanceLower.includes("bullish") ? "bullish"
        : stanceLower.includes("bearish") ? "bearish"
        : "neutral";

      const saved = await storage.createDebateMessage({
        debateId: debate.id,
        agentId: profile.agentId,
        agentName: profile.name,
        agentEmoji: profile.emoji,
        stance,
        content,
        round: 1,
        messageOrder: i + 1,
        createdAt: new Date().toISOString(),
      });

      generatedMessages.push({
        id: saved.id,
        agentId: profile.agentId,
        agentName: profile.name,
        agentEmoji: profile.emoji,
        stance,
        content,
        round: 1,
        messageOrder: i + 1,
      });

      // Build running context for next speaker (HeartAI pattern)
      runningContext += `\n[${profile.name} ${profile.emoji}]: ${content}`;
    } catch (err: any) {
      console.error(`[DebateEngine] Error for ${profile.name}:`, err.message);
      const fallback = `${profile.name} encountered an error and passes this round.`;
      const saved = await storage.createDebateMessage({
        debateId: debate.id,
        agentId: profile.agentId,
        agentName: profile.name,
        agentEmoji: profile.emoji,
        stance: "neutral",
        content: fallback,
        round: 1,
        messageOrder: i + 1,
        createdAt: new Date().toISOString(),
      });
      generatedMessages.push({
        id: saved.id,
        agentId: profile.agentId,
        agentName: profile.name,
        agentEmoji: profile.emoji,
        stance: "neutral",
        content: fallback,
        round: 1,
        messageOrder: i + 1,
      });
      runningContext += `\n[${profile.name}]: ${fallback}`;
    }
  }

  // ── Verdict synthesis ──────────────────────────────────────────
  let verdict: DebateResult["verdict"] = null;
  try {
    const verdictResponse = await client.chat.completions.create({
      model: "deepseek-chat",
      max_tokens: 300,
      temperature: 0.5,
      messages: [
        { role: "system", content: VERDICT_SYSTEM_PROMPT },
        { role: "user", content: runningContext + "\n\n--- All agents have spoken. Deliver your verdict. ---" },
      ],
    });

    const verdictContent = verdictResponse.choices[0]?.message?.content?.trim() || "";
    const verdictLower = verdictContent.toLowerCase();
    const verdictSignal = verdictLower.includes("bullish") ? "bullish"
      : verdictLower.includes("bearish") ? "bearish"
      : "neutral";

    // Extract confidence from "Confidence: X%"
    const confMatch = verdictContent.match(/confidence[:\s]*(\d+)/i);
    const verdictConfidence = confMatch ? Math.min(100, parseInt(confMatch[1])) : 60;

    // Save verdict message
    const verdictSaved = await storage.createDebateMessage({
      debateId: debate.id,
      agentId: "__verdict__",
      agentName: "Verdict",
      agentEmoji: "⚖️",
      stance: verdictSignal,
      content: verdictContent,
      round: 1,
      messageOrder: agentProfiles.length + 1,
      createdAt: new Date().toISOString(),
    });

    generatedMessages.push({
      id: verdictSaved.id,
      agentId: "__verdict__",
      agentName: "Verdict",
      agentEmoji: "⚖️",
      stance: verdictSignal,
      content: verdictContent,
      round: 1,
      messageOrder: agentProfiles.length + 1,
    });

    verdict = { signal: verdictSignal, confidence: verdictConfidence, summary: verdictContent };

    // Update debate with verdict
    await storage.updateDebate(debate.id, {
      status: "concluded",
      verdictSignal,
      verdictConfidence,
      verdictSummary: verdictContent,
    });
  } catch (err: any) {
    console.error("[DebateEngine] Verdict error:", err.message);
    await storage.updateDebate(debate.id, { status: "concluded" });
  }

  return { debateId: debate.id, messages: generatedMessages, verdict };
}
