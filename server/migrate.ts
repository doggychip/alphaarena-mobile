/**
 * Programmatic schema migration — creates all tables via raw SQL.
 * Used at startup instead of `drizzle-kit push` which requires devDependencies.
 * Safe to run multiple times (uses IF NOT EXISTS).
 */
import { pool } from "./db";

export async function ensureSchema(): Promise<void> {
  if (!pool) {
    console.log("[DB] No pool — skipping schema creation");
    return;
  }

  console.log("[DB] Ensuring schema (CREATE TABLE IF NOT EXISTS)...");

  const sql = `
    -- Users
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL,
      email TEXT NOT NULL,
      password TEXT,
      avatar_url TEXT,
      level INTEGER NOT NULL DEFAULT 1,
      xp INTEGER NOT NULL DEFAULT 0,
      credits INTEGER NOT NULL DEFAULT 1000,
      streak INTEGER NOT NULL DEFAULT 0,
      longest_streak INTEGER NOT NULL DEFAULT 0,
      last_trade_date TEXT,
      selected_agent_type TEXT NOT NULL DEFAULT 'bull',
      created_at TEXT NOT NULL
    );

    -- Agents (6 meme companions)
    CREATE TABLE IF NOT EXISTS agents (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      personality TEXT NOT NULL,
      trading_style TEXT NOT NULL,
      avatar_emoji TEXT NOT NULL,
      description TEXT NOT NULL,
      risk_level INTEGER NOT NULL
    );

    -- Competitions
    CREATE TABLE IF NOT EXISTS competitions (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      season INTEGER NOT NULL DEFAULT 1,
      starting_capital REAL NOT NULL DEFAULT 100000
    );

    -- Portfolios
    CREATE TABLE IF NOT EXISTS portfolios (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      competition_id INTEGER NOT NULL,
      cash_balance REAL NOT NULL DEFAULT 100000,
      total_equity REAL NOT NULL DEFAULT 100000
    );

    -- Positions
    CREATE TABLE IF NOT EXISTS positions (
      id SERIAL PRIMARY KEY,
      portfolio_id INTEGER NOT NULL,
      pair TEXT NOT NULL,
      side TEXT NOT NULL,
      quantity REAL NOT NULL,
      avg_entry_price REAL NOT NULL,
      current_price REAL NOT NULL,
      unrealized_pnl REAL NOT NULL DEFAULT 0
    );

    -- Trades
    CREATE TABLE IF NOT EXISTS trades (
      id SERIAL PRIMARY KEY,
      portfolio_id INTEGER NOT NULL,
      pair TEXT NOT NULL,
      side TEXT NOT NULL,
      quantity REAL NOT NULL,
      price REAL NOT NULL,
      total_value REAL NOT NULL,
      fee REAL NOT NULL DEFAULT 0,
      executed_at TEXT NOT NULL
    );

    -- Daily Snapshots
    CREATE TABLE IF NOT EXISTS daily_snapshots (
      id SERIAL PRIMARY KEY,
      portfolio_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      total_equity REAL NOT NULL,
      cash_balance REAL NOT NULL,
      daily_return REAL NOT NULL,
      cumulative_return REAL NOT NULL
    );

    -- Leaderboard Entries
    CREATE TABLE IF NOT EXISTS leaderboard_entries (
      id SERIAL PRIMARY KEY,
      competition_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      rank INTEGER NOT NULL,
      total_return REAL NOT NULL,
      sharpe_ratio REAL NOT NULL,
      max_drawdown REAL NOT NULL,
      win_rate REAL NOT NULL,
      composite_score REAL NOT NULL
    );

    -- Achievements
    CREATE TABLE IF NOT EXISTS achievements (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      achievement_type TEXT NOT NULL,
      unlocked_at TEXT NOT NULL
    );

    -- Agent Messages
    CREATE TABLE IF NOT EXISTS agent_messages (
      id SERIAL PRIMARY KEY,
      agent_type TEXT NOT NULL,
      message TEXT NOT NULL,
      mood TEXT NOT NULL,
      pair TEXT
    );

    -- Stakes
    CREATE TABLE IF NOT EXISTS stakes (
      id SERIAL PRIMARY KEY,
      staker_id INTEGER NOT NULL,
      target_user_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      staked_at TEXT NOT NULL
    );

    -- Staking Rewards
    CREATE TABLE IF NOT EXISTS staking_rewards (
      id SERIAL PRIMARY KEY,
      staker_id INTEGER NOT NULL,
      target_user_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      reason TEXT NOT NULL,
      earned_at TEXT NOT NULL
    );

    -- Hedge Fund Agents (19 analytical engines)
    CREATE TABLE IF NOT EXISTS hedge_fund_agents (
      id SERIAL PRIMARY KEY,
      agent_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      trading_philosophy TEXT NOT NULL,
      avatar_emoji TEXT NOT NULL,
      risk_tolerance TEXT NOT NULL,
      asset_focus TEXT NOT NULL,
      win_rate REAL NOT NULL DEFAULT 0,
      total_signals INTEGER NOT NULL DEFAULT 0,
      avg_confidence REAL NOT NULL DEFAULT 0
    );

    -- Agent Signals
    CREATE TABLE IF NOT EXISTS agent_signals (
      id SERIAL PRIMARY KEY,
      hedge_fund_agent_id TEXT NOT NULL,
      ticker TEXT NOT NULL,
      signal TEXT NOT NULL,
      confidence REAL NOT NULL,
      reasoning TEXT NOT NULL,
      target_price REAL,
      time_horizon TEXT,
      created_at TEXT NOT NULL,
      is_correct BOOLEAN
    );

    -- Meme Agent Mapping
    CREATE TABLE IF NOT EXISTS meme_agent_mapping (
      id SERIAL PRIMARY KEY,
      meme_agent_type TEXT NOT NULL,
      hedge_fund_agent_id TEXT NOT NULL,
      weight REAL NOT NULL DEFAULT 1
    );

    -- HF Agent Stakes
    CREATE TABLE IF NOT EXISTS hf_agent_stakes (
      id SERIAL PRIMARY KEY,
      staker_id INTEGER NOT NULL,
      hedge_fund_agent_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      staked_at TEXT NOT NULL
    );

    -- External Agents
    CREATE TABLE IF NOT EXISTS external_agents (
      id SERIAL PRIMARY KEY,
      agent_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      avatar_emoji TEXT NOT NULL DEFAULT '🤖',
      api_key TEXT NOT NULL,
      webhook_url TEXT,
      source TEXT NOT NULL DEFAULT 'openclaw',
      status TEXT NOT NULL DEFAULT 'active',
      trading_philosophy TEXT,
      risk_tolerance TEXT DEFAULT 'medium',
      user_id INTEGER,
      owner_user_id INTEGER,
      total_signals INTEGER NOT NULL DEFAULT 0,
      total_posts INTEGER NOT NULL DEFAULT 0,
      reputation INTEGER NOT NULL DEFAULT 0,
      registered_at TEXT NOT NULL,
      last_active_at TEXT
    );

    -- Forum Posts
    CREATE TABLE IF NOT EXISTS forum_posts (
      id SERIAL PRIMARY KEY,
      author_user_id INTEGER NOT NULL,
      author_agent_id TEXT NOT NULL,
      author_type TEXT NOT NULL DEFAULT 'internal',
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      ticker TEXT,
      likes INTEGER NOT NULL DEFAULT 0,
      reply_count INTEGER NOT NULL DEFAULT 0,
      is_pinned BOOLEAN NOT NULL DEFAULT false,
      created_at TEXT NOT NULL
    );

    -- Forum Replies
    CREATE TABLE IF NOT EXISTS forum_replies (
      id SERIAL PRIMARY KEY,
      post_id INTEGER NOT NULL,
      author_user_id INTEGER NOT NULL,
      author_agent_id TEXT NOT NULL,
      author_type TEXT NOT NULL DEFAULT 'internal',
      content TEXT NOT NULL,
      likes INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    -- Signal Explanations (Glass Box)
    CREATE TABLE IF NOT EXISTS signal_explanations (
      id SERIAL PRIMARY KEY,
      signal_id INTEGER NOT NULL,
      hedge_fund_agent_id TEXT NOT NULL,
      ticker TEXT NOT NULL,
      signal TEXT NOT NULL,
      confidence REAL NOT NULL,
      summary TEXT NOT NULL,
      fundamental_score REAL NOT NULL DEFAULT 0,
      technical_score REAL NOT NULL DEFAULT 0,
      sentiment_score REAL NOT NULL DEFAULT 0,
      macro_score REAL NOT NULL DEFAULT 0,
      valuation_score REAL NOT NULL DEFAULT 0,
      factors TEXT NOT NULL,
      decision_flow TEXT NOT NULL,
      predicted_at TEXT NOT NULL,
      resolved_at TEXT,
      actual_price REAL,
      is_correct BOOLEAN,
      pnl_percent REAL,
      created_at TEXT NOT NULL
    );

    -- Committees
    CREATE TABLE IF NOT EXISTS committees (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      emoji TEXT NOT NULL DEFAULT '🏛️',
      description TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      total_signals INTEGER NOT NULL DEFAULT 0,
      accuracy REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    -- Committee Members
    CREATE TABLE IF NOT EXISTS committee_members (
      id SERIAL PRIMARY KEY,
      committee_id INTEGER NOT NULL,
      agent_id TEXT NOT NULL,
      agent_source TEXT NOT NULL DEFAULT 'internal',
      weight REAL NOT NULL DEFAULT 1,
      added_at TEXT NOT NULL
    );

    -- Committee Signals
    CREATE TABLE IF NOT EXISTS committee_signals (
      id SERIAL PRIMARY KEY,
      committee_id INTEGER NOT NULL,
      ticker TEXT NOT NULL,
      consensus_signal TEXT NOT NULL,
      consensus_confidence REAL NOT NULL,
      member_votes TEXT NOT NULL,
      bullish_votes INTEGER NOT NULL DEFAULT 0,
      bearish_votes INTEGER NOT NULL DEFAULT 0,
      neutral_votes INTEGER NOT NULL DEFAULT 0,
      agreement REAL NOT NULL DEFAULT 0,
      is_correct BOOLEAN,
      actual_price REAL,
      pnl_percent REAL,
      created_at TEXT NOT NULL,
      resolved_at TEXT
    );

    -- Committee Debates (AI agent debate sessions)
    CREATE TABLE IF NOT EXISTS committee_debates (
      id SERIAL PRIMARY KEY,
      committee_id INTEGER NOT NULL,
      ticker TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      rounds INTEGER NOT NULL DEFAULT 0,
      verdict_signal TEXT,
      verdict_confidence REAL,
      verdict_summary TEXT,
      created_at TEXT NOT NULL
    );

    -- Committee Debate Messages (individual agent arguments)
    CREATE TABLE IF NOT EXISTS committee_debate_messages (
      id SERIAL PRIMARY KEY,
      debate_id INTEGER NOT NULL,
      agent_id TEXT NOT NULL,
      agent_name TEXT NOT NULL,
      agent_emoji TEXT NOT NULL DEFAULT '🤖',
      stance TEXT NOT NULL,
      content TEXT NOT NULL,
      round INTEGER NOT NULL DEFAULT 1,
      message_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    -- Duels (H2H agent matchups)
    CREATE TABLE IF NOT EXISTS duels (
      id SERIAL PRIMARY KEY,
      challenger_user_id INTEGER NOT NULL,
      challenger_agent_id TEXT NOT NULL,
      opponent_user_id INTEGER,
      opponent_agent_id TEXT,
      ticker TEXT NOT NULL,
      wager INTEGER NOT NULL DEFAULT 100,
      duration_hours INTEGER NOT NULL DEFAULT 24,
      status TEXT NOT NULL DEFAULT 'open',
      start_price REAL,
      end_price REAL,
      winner_user_id INTEGER,
      challenger_return REAL,
      opponent_return REAL,
      created_at TEXT NOT NULL,
      starts_at TEXT,
      ends_at TEXT,
      resolved_at TEXT
    );

    -- Predictions (yes/no market mini-games)
    CREATE TABLE IF NOT EXISTS predictions (
      id SERIAL PRIMARY KEY,
      question TEXT NOT NULL,
      ticker TEXT,
      category TEXT NOT NULL DEFAULT 'crypto',
      yes_pool INTEGER NOT NULL DEFAULT 0,
      no_pool INTEGER NOT NULL DEFAULT 0,
      total_bettors INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'open',
      outcome BOOLEAN,
      closes_at TEXT NOT NULL,
      resolves_at TEXT,
      created_at TEXT NOT NULL,
      resolved_at TEXT
    );

    -- Prediction Bets
    CREATE TABLE IF NOT EXISTS prediction_bets (
      id SERIAL PRIMARY KEY,
      prediction_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      side TEXT NOT NULL,
      amount INTEGER NOT NULL,
      payout INTEGER,
      created_at TEXT NOT NULL
    );

    -- Session store (connect-pg-simple)
    CREATE TABLE IF NOT EXISTS "session" (
      "sid" VARCHAR NOT NULL COLLATE "default",
      "sess" JSON NOT NULL,
      "expire" TIMESTAMP(6) NOT NULL,
      PRIMARY KEY ("sid")
    );
    CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
  `;

  await pool.query(sql);

  // ── Column migrations (safe to run multiple times) ──
  const alterSql = `
    -- Add owner_user_id to external_agents if missing (links agent to the human who registered it)
    DO $$ BEGIN
      ALTER TABLE external_agents ADD COLUMN owner_user_id INTEGER;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$;
  `;
  await pool.query(alterSql);

  console.log("[DB] Schema ensured — all tables ready + column migrations applied");
}
