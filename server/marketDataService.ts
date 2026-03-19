/**
 * Market Data Service — Aggregates free public APIs for AlphaArena
 * 
 * Data Sources (all free, no auth required):
 * - CoinGecko: Crypto prices, market cap, volume, sparklines, global stats
 * - Coinpaprika: Backup crypto data, ATH tracking, supply data
 * - CoinGecko Trending: Market sentiment & trending coins
 * - Alternative.me: Crypto Fear & Greed Index
 * - Frankfurter: FX rates (ECB data)
 * - SEC EDGAR: US equity filings (10-K, 10-Q, 8-K)
 * 
 * Architecture:
 * - Each source has its own fetcher with timeout + fallback
 * - Results cached in-memory with configurable TTLs
 * - Non-blocking: failures in one source don't break others
 */

// ── Types ──────────────────────────────────────────────────────────────

export interface CoinDetail {
  id: string;
  symbol: string;
  name: string;
  price: number;
  marketCap: number;
  volume24h: number;
  change24h: number;
  change7d: number;
  change30d: number;
  ath: number;
  athChangePercent: number;
  circulatingSupply: number;
  totalSupply: number | null;
  maxSupply: number | null;
  sparkline7d: number[];  // 168 hourly price points
  rank: number;
}

export interface GlobalCryptoData {
  totalMarketCap: number;
  totalVolume24h: number;
  btcDominance: number;
  ethDominance: number;
  activeCryptos: number;
  marketCapChange24h: number;
}

export interface FearGreedData {
  value: number;           // 0-100
  classification: string;  // "Extreme Fear", "Fear", "Neutral", "Greed", "Extreme Greed"
  timestamp: string;
}

export interface FxRates {
  base: string;
  date: string;
  rates: Record<string, number>; // USD/EUR, USD/GBP, etc.
}

export interface SecFiling {
  company: string;
  ticker: string;
  form: string;         // 10-K, 10-Q, 8-K
  filedDate: string;
  description: string;
  url: string;
}

export interface NewsItem {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  sentiment?: "positive" | "negative" | "neutral";
  tickers?: string[];
}

// ── Cache Infrastructure ───────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry<any>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > entry.ttl) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
}

// ── Timeouts ───────────────────────────────────────────────────────────

const FETCH_TIMEOUT = 8000; // 8s per API call

async function safeFetch(url: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    return res;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

// ── CoinGecko Extended ─────────────────────────────────────────────────
// Free tier: 10-30 calls/min, no auth needed

const COINGECKO_COINS: Record<string, string> = {
  bitcoin: "BTC", ethereum: "ETH", binancecoin: "BNB", solana: "SOL",
  ripple: "XRP", cardano: "ADA", dogecoin: "DOGE", "avalanche-2": "AVAX",
  polkadot: "DOT", chainlink: "LINK",
};

export async function fetchCoinDetails(): Promise<CoinDetail[]> {
  const cacheKey = "coingecko_coins";
  const cached = getCached<CoinDetail[]>(cacheKey);
  if (cached) return cached;

  try {
    const ids = Object.keys(COINGECKO_COINS).join(",");
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=true&price_change_percentage=24h,7d,30d`;
    
    const res = await safeFetch(url);
    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
    
    const data = await res.json();
    const coins: CoinDetail[] = data.map((c: any) => ({
      id: c.id,
      symbol: (c.symbol || "").toUpperCase(),
      name: c.name,
      price: c.current_price || 0,
      marketCap: c.market_cap || 0,
      volume24h: c.total_volume || 0,
      change24h: c.price_change_percentage_24h || 0,
      change7d: c.price_change_percentage_7d_in_currency || 0,
      change30d: c.price_change_percentage_30d_in_currency || 0,
      ath: c.ath || 0,
      athChangePercent: c.ath_change_percentage || 0,
      circulatingSupply: c.circulating_supply || 0,
      totalSupply: c.total_supply || null,
      maxSupply: c.max_supply || null,
      sparkline7d: c.sparkline_in_7d?.price || [],
      rank: c.market_cap_rank || 0,
    }));

    setCache(cacheKey, coins, 60_000); // 1 min cache
    console.log(`[MarketData] CoinGecko: ${coins.length} coins fetched`);
    return coins;
  } catch (err: any) {
    console.log(`[MarketData] CoinGecko coins error: ${err.message}`);
    return getCached<CoinDetail[]>(cacheKey) || [];
  }
}

// ── CoinGecko Global Stats ─────────────────────────────────────────────

export async function fetchGlobalCryptoData(): Promise<GlobalCryptoData | null> {
  const cacheKey = "coingecko_global";
  const cached = getCached<GlobalCryptoData>(cacheKey);
  if (cached) return cached;

  try {
    const res = await safeFetch("https://api.coingecko.com/api/v3/global");
    if (!res.ok) throw new Error(`CoinGecko Global ${res.status}`);
    
    const { data } = await res.json();
    const result: GlobalCryptoData = {
      totalMarketCap: data.total_market_cap?.usd || 0,
      totalVolume24h: data.total_volume?.usd || 0,
      btcDominance: data.market_cap_percentage?.btc || 0,
      ethDominance: data.market_cap_percentage?.eth || 0,
      activeCryptos: data.active_cryptocurrencies || 0,
      marketCapChange24h: data.market_cap_change_percentage_24h_usd || 0,
    };

    setCache(cacheKey, result, 120_000); // 2 min cache
    return result;
  } catch (err: any) {
    console.log(`[MarketData] CoinGecko global error: ${err.message}`);
    return getCached<GlobalCryptoData>(cacheKey) || null;
  }
}

// ── Fear & Greed Index ─────────────────────────────────────────────────

export async function fetchFearGreed(): Promise<FearGreedData | null> {
  const cacheKey = "fear_greed";
  const cached = getCached<FearGreedData>(cacheKey);
  if (cached) return cached;

  try {
    const res = await safeFetch("https://api.alternative.me/fng/?limit=1");
    if (!res.ok) throw new Error(`FearGreed ${res.status}`);
    
    const json = await res.json();
    const entry = json.data?.[0];
    if (!entry) return null;

    const result: FearGreedData = {
      value: parseInt(entry.value),
      classification: entry.value_classification,
      timestamp: new Date(parseInt(entry.timestamp) * 1000).toISOString(),
    };

    setCache(cacheKey, result, 300_000); // 5 min cache
    return result;
  } catch (err: any) {
    console.log(`[MarketData] Fear/Greed error: ${err.message}`);
    return getCached<FearGreedData>(cacheKey) || null;
  }
}

// ── Coinpaprika (Backup / Additional Data) ─────────────────────────────

const PAPRIKA_IDS: Record<string, string> = {
  BTC: "btc-bitcoin", ETH: "eth-ethereum", BNB: "bnb-binance-coin",
  SOL: "sol-solana", XRP: "xrp-xrp", ADA: "ada-cardano",
  DOGE: "doge-dogecoin", AVAX: "avax-avalanche", DOT: "dot-polkadot",
  LINK: "link-chainlink",
};

export async function fetchCoinpaprikaData(ticker: string): Promise<any | null> {
  const paprikaId = PAPRIKA_IDS[ticker.toUpperCase()];
  if (!paprikaId) return null;

  const cacheKey = `paprika_${ticker}`;
  const cached = getCached<any>(cacheKey);
  if (cached) return cached;

  try {
    const res = await safeFetch(`https://api.coinpaprika.com/v1/tickers/${paprikaId}`);
    if (!res.ok) throw new Error(`Coinpaprika ${res.status}`);
    
    const data = await res.json();
    const q = data.quotes?.USD || {};
    
    const result = {
      ticker: ticker.toUpperCase(),
      price: q.price || 0,
      marketCap: q.market_cap || 0,
      volume24h: q.volume_24h || 0,
      change1h: q.percent_change_1h || 0,
      change24h: q.percent_change_24h || 0,
      change7d: q.percent_change_7d || 0,
      change30d: q.percent_change_30d || 0,
      change1y: q.percent_change_1y || 0,
      ath: q.ath_price || 0,
      athDate: q.ath_date || null,
      percentFromAth: q.percent_from_price_ath || 0,
    };

    setCache(cacheKey, result, 60_000); // 1 min cache
    return result;
  } catch (err: any) {
    console.log(`[MarketData] Coinpaprika ${ticker} error: ${err.message}`);
    return null;
  }
}

// ── FX Rates (Frankfurter / ECB) ───────────────────────────────────────

export async function fetchFxRates(): Promise<FxRates | null> {
  const cacheKey = "fx_rates";
  const cached = getCached<FxRates>(cacheKey);
  if (cached) return cached;

  try {
    const res = await safeFetch("https://api.frankfurter.app/latest?from=USD&to=EUR,GBP,JPY,SGD,HKD,CNY,CHF,AUD,CAD,KRW");
    if (!res.ok) throw new Error(`Frankfurter ${res.status}`);
    
    const data = await res.json();
    const result: FxRates = {
      base: "USD",
      date: data.date,
      rates: data.rates,
    };

    setCache(cacheKey, result, 600_000); // 10 min cache (FX updates less frequently)
    return result;
  } catch (err: any) {
    console.log(`[MarketData] Frankfurter FX error: ${err.message}`);
    return getCached<FxRates>(cacheKey) || null;
  }
}

// ── SEC EDGAR (US Equity Filings) ──────────────────────────────────────

export async function fetchSecFilings(ticker: string, limit = 5): Promise<SecFiling[]> {
  const cacheKey = `sec_${ticker}`;
  const cached = getCached<SecFiling[]>(cacheKey);
  if (cached) return cached;

  try {
    // SEC requires a User-Agent header
    const url = `https://efts.sec.gov/LATEST/search-index?q=%22${ticker}%22&forms=10-K,10-Q,8-K&dateRange=custom&startdt=2025-01-01&enddt=2026-12-31`;
    const res = await safeFetch(url, {
      headers: { "User-Agent": "AlphaArena/1.0 ryan.c.cheung@gmail.com" },
    });
    if (!res.ok) throw new Error(`SEC EDGAR ${res.status}`);
    
    const data = await res.json();
    const hits = data.hits?.hits || [];

    const filings: SecFiling[] = hits.slice(0, limit).map((h: any) => {
      const src = h._source || {};
      return {
        company: (src.display_names?.[0] || ticker).replace(/\s*\(.*?\)\s*/g, "").trim(),
        ticker: ticker.toUpperCase(),
        form: (src.root_forms?.[0]) || "Filing",
        filedDate: src.file_date || "",
        description: `${src.root_forms?.[0] || "Filing"} filed ${src.file_date || ""}`,
        url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${ticker}&type=&dateb=&owner=include&count=10&search_text=&action=getcompany`,
      };
    });

    setCache(cacheKey, filings, 3600_000); // 1 hour cache (filings don't change often)
    return filings;
  } catch (err: any) {
    console.log(`[MarketData] SEC EDGAR ${ticker} error: ${err.message}`);
    return [];
  }
}

// ── CoinGecko Trending + News ────────────────────────────────────────

export interface TrendingCoin {
  symbol: string;
  name: string;
  score: number;
  marketCapRank: number | null;
  priceBtc: number | null;
  priceChangePercent24h: number | null;
}

export async function fetchTrending(): Promise<TrendingCoin[]> {
  const cacheKey = "trending";
  const cached = getCached<TrendingCoin[]>(cacheKey);
  if (cached) return cached;

  try {
    const res = await safeFetch("https://api.coingecko.com/api/v3/search/trending");
    if (!res.ok) throw new Error(`CoinGecko trending ${res.status}`);
    const data = await res.json();
    const coins: TrendingCoin[] = (data.coins || []).slice(0, 15).map((c: any) => {
      const item = c.item || {};
      return {
        symbol: (item.symbol || "").toUpperCase(),
        name: item.name || "",
        score: item.score ?? 0,
        marketCapRank: item.market_cap_rank ?? null,
        priceBtc: item.price_btc ?? null,
        priceChangePercent24h: item.data?.price_change_percentage_24h?.usd ?? null,
      };
    });
    setCache(cacheKey, coins, 300_000); // 5 min cache
    return coins;
  } catch (err: any) {
    console.log(`[MarketData] Trending error: ${err.message}`);
    return [];
  }
}

export async function fetchCryptoNews(ticker?: string): Promise<NewsItem[]> {
  // CryptoCompare now requires auth — use CoinGecko coin data as a proxy
  // Return trending context as pseudo-news items for the analysis engine
  const cacheKey = `news_${ticker || "all"}`;
  const cached = getCached<NewsItem[]>(cacheKey);
  if (cached) return cached;

  try {
    const trending = await fetchTrending();
    const news: NewsItem[] = trending.slice(0, 10).map((t, i) => ({
      title: `Trending #${i + 1}: ${t.name} (${t.symbol})${t.priceChangePercent24h != null ? ` — ${t.priceChangePercent24h > 0 ? "+" : ""}${t.priceChangePercent24h.toFixed(1)}% 24h` : ""}`,
      source: "CoinGecko Trending",
      url: `https://www.coingecko.com/en/coins/${t.name.toLowerCase().replace(/\s+/g, "-")}`,
      publishedAt: new Date().toISOString(),
      tickers: [t.symbol],
    }));

    setCache(cacheKey, news, 300_000); // 5 min cache
    return news;
  } catch (err: any) {
    console.log(`[MarketData] News/trending error: ${err.message}`);
    return [];
  }
}

// ── Composite Market Snapshot ──────────────────────────────────────────
// Aggregates all data sources into a single snapshot for the analysis engine

export interface MarketSnapshot {
  coins: CoinDetail[];
  global: GlobalCryptoData | null;
  fearGreed: FearGreedData | null;
  fx: FxRates | null;
  news: NewsItem[];
  timestamp: string;
}

export async function fetchMarketSnapshot(): Promise<MarketSnapshot> {
  // Fetch all in parallel (non-blocking)
  const [coins, global, fearGreed, fx, news] = await Promise.allSettled([
    fetchCoinDetails(),
    fetchGlobalCryptoData(),
    fetchFearGreed(),
    fetchFxRates(),
    fetchCryptoNews(),
  ]);

  return {
    coins: coins.status === "fulfilled" ? coins.value : [],
    global: global.status === "fulfilled" ? global.value : null,
    fearGreed: fearGreed.status === "fulfilled" ? fearGreed.value : null,
    fx: fx.status === "fulfilled" ? fx.value : null,
    news: news.status === "fulfilled" ? news.value : [],
    timestamp: new Date().toISOString(),
  };
}

// ── Ticker-Specific Deep Dive ──────────────────────────────────────────
// Combines multiple sources for a single ticker's full picture

export interface TickerDeepDive {
  ticker: string;
  // Price data
  price: number;
  marketCap: number;
  volume24h: number;
  change24h: number;
  change7d: number;
  change30d: number;
  change1y: number | null;
  // ATH tracking
  ath: number;
  percentFromAth: number;
  // Supply
  circulatingSupply: number;
  maxSupply: number | null;
  // Sparkline
  sparkline7d: number[];
  // Market context
  fearGreed: FearGreedData | null;
  globalMcap: number | null;
  btcDominance: number | null;
  // News
  news: NewsItem[];
  // SEC filings (equity only)
  secFilings: SecFiling[];
}

const EQUITY_TICKERS = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "TSLA", "META", "JPM", "V", "UNH"];

export async function fetchTickerDeepDive(ticker: string): Promise<TickerDeepDive> {
  const isEquity = EQUITY_TICKERS.includes(ticker.toUpperCase());

  // Parallel fetch
  const [coinDetails, paprika, fearGreed, global, news, secFilings] = await Promise.allSettled([
    fetchCoinDetails(),
    fetchCoinpaprikaData(ticker),
    fetchFearGreed(),
    fetchGlobalCryptoData(),
    fetchCryptoNews(isEquity ? undefined : ticker),
    isEquity ? fetchSecFilings(ticker) : Promise.resolve([]),
  ]);

  const coins = coinDetails.status === "fulfilled" ? coinDetails.value : [];
  const coin = coins.find(c => c.symbol === ticker.toUpperCase());
  const paprikaData = paprika.status === "fulfilled" ? paprika.value : null;
  const fg = fearGreed.status === "fulfilled" ? fearGreed.value : null;
  const globalData = global.status === "fulfilled" ? global.value : null;

  return {
    ticker: ticker.toUpperCase(),
    price: coin?.price || paprikaData?.price || 0,
    marketCap: coin?.marketCap || paprikaData?.marketCap || 0,
    volume24h: coin?.volume24h || paprikaData?.volume24h || 0,
    change24h: coin?.change24h || paprikaData?.change24h || 0,
    change7d: coin?.change7d || paprikaData?.change7d || 0,
    change30d: coin?.change30d || paprikaData?.change30d || 0,
    change1y: paprikaData?.change1y || null,
    ath: coin?.ath || paprikaData?.ath || 0,
    percentFromAth: coin?.athChangePercent || paprikaData?.percentFromAth || 0,
    circulatingSupply: coin?.circulatingSupply || 0,
    maxSupply: coin?.maxSupply || null,
    sparkline7d: coin?.sparkline7d || [],
    fearGreed: fg,
    globalMcap: globalData?.totalMarketCap || null,
    btcDominance: globalData?.btcDominance || null,
    news: news.status === "fulfilled" ? news.value : [],
    secFilings: secFilings.status === "fulfilled" ? secFilings.value : [],
  };
}
