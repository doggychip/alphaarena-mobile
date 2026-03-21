/**
 * Snapshot Engine — takes periodic equity snapshots for all portfolios.
 * 
 * Runs every hour. For each portfolio:
 * 1. Fetches all positions
 * 2. Prices each position using live CoinGecko prices
 * 3. Computes totalEquity = sum(position market values) + cashBalance
 * 4. Updates portfolio.totalEquity
 * 5. Creates/updates today's daily snapshot
 * 
 * This makes the equity curve on PortfolioChart reflect REAL portfolio value.
 */

import { storage } from "./storage";
import { getPriceForPair } from "./prices";

const SNAPSHOT_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const STARTING_CAPITAL = 100000;

let intervalHandle: ReturnType<typeof setInterval> | null = null;

/**
 * Compute the live total equity for a portfolio:
 * sum(each position's quantity × live price) + cash balance
 */
export async function computeLiveEquity(portfolioId: number, cashBalance: number): Promise<{
  totalEquity: number;
  positionValues: { pair: string; marketValue: number; unrealizedPnl: number }[];
}> {
  const positions = await storage.getPositions(portfolioId);
  const positionValues: { pair: string; marketValue: number; unrealizedPnl: number }[] = [];
  let totalPositionValue = 0;

  for (const pos of positions) {
    const livePrice = getPriceForPair(pos.pair) || pos.currentPrice;
    const marketValue = livePrice * pos.quantity;
    const unrealizedPnl = (livePrice - pos.avgEntryPrice) * pos.quantity * (pos.side === "long" ? 1 : -1);

    totalPositionValue += marketValue;
    positionValues.push({
      pair: pos.pair,
      marketValue: Math.round(marketValue * 100) / 100,
      unrealizedPnl: Math.round(unrealizedPnl * 100) / 100,
    });

    // Update position with live price
    await storage.updatePosition(pos.id, {
      currentPrice: livePrice,
      unrealizedPnl: Math.round(unrealizedPnl * 100) / 100,
    });
  }

  const totalEquity = Math.round((totalPositionValue + cashBalance) * 100) / 100;
  return { totalEquity, positionValues };
}

/**
 * Take a snapshot for a single portfolio
 */
async function snapshotPortfolio(portfolioId: number, cashBalance: number, previousEquity?: number) {
  const { totalEquity } = await computeLiveEquity(portfolioId, cashBalance);

  // Update portfolio totalEquity
  await storage.updatePortfolio(portfolioId, { totalEquity });

  // Compute daily return
  const prevEquity = previousEquity || STARTING_CAPITAL;
  const dailyReturn = prevEquity > 0
    ? Math.round(((totalEquity - prevEquity) / prevEquity) * 10000) / 100
    : 0;
  const cumulativeReturn = Math.round(((totalEquity - STARTING_CAPITAL) / STARTING_CAPITAL) * 10000) / 100;

  const today = new Date().toISOString().split("T")[0];

  await storage.addSnapshot({
    portfolioId,
    date: today,
    totalEquity,
    cashBalance,
    dailyReturn,
    cumulativeReturn,
  });

  return { totalEquity, dailyReturn, cumulativeReturn };
}

/**
 * Run snapshot cycle for ALL portfolios
 */
async function runSnapshotCycle() {
  try {
    const allPortfolios = await storage.getAllPortfolios();
    let snapshotCount = 0;

    for (const portfolio of allPortfolios) {
      // Get the previous snapshot to compute daily return
      const snapshots = await storage.getSnapshots(portfolio.id);
      const lastSnap = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
      const previousEquity = lastSnap?.totalEquity || STARTING_CAPITAL;

      const result = await snapshotPortfolio(portfolio.id, portfolio.cashBalance, previousEquity);
      snapshotCount++;
    }

    console.log(`[SnapshotEngine] Cycle complete — ${snapshotCount} portfolio(s) snapshotted`);
  } catch (err: any) {
    console.error(`[SnapshotEngine] Error during snapshot cycle:`, err.message);
  }
}

/**
 * Start the snapshot engine
 */
export function startSnapshotEngine() {
  // Run immediately on startup
  setTimeout(() => {
    runSnapshotCycle();
  }, 5000); // Wait 5s for prices to load first

  // Then run every hour
  intervalHandle = setInterval(runSnapshotCycle, SNAPSHOT_INTERVAL_MS);
  console.log(`[SnapshotEngine] Started — snapshots every ${SNAPSHOT_INTERVAL_MS / 60000} min`);
}

/**
 * Force a snapshot for a specific portfolio (call after trades)
 */
export async function forceSnapshot(portfolioId: number, cashBalance: number) {
  const snapshots = await storage.getSnapshots(portfolioId);
  const lastSnap = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const previousEquity = lastSnap?.totalEquity || STARTING_CAPITAL;

  return snapshotPortfolio(portfolioId, cashBalance, previousEquity);
}
