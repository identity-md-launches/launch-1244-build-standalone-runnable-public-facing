import { candleItem, demoMarkets, normalizeOverview } from './snapshot';
import type { Market, ResearchItem } from './market';

export const CACHE_TTL = 15 * 60_000;
const storageKey = 'aimarket:kraken-cache:v1';
type Cache = { attemptedAt: number; completedAt?: number; btc?: unknown; eth?: unknown };
let cache: Cache | undefined;
let inflight: Promise<ResearchItem[]> | undefined;
let overviewPromise: Promise<{ markets: Market[]; mode: 'demo' | 'cached'; error: boolean }> | undefined;

function readCache(): Cache | undefined {
  if (cache) return cache;
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey) || 'null') as Cache | null;
    if (raw && typeof raw.attemptedAt === 'number' && Number.isFinite(raw.attemptedAt)) cache = raw;
  } catch {
    /* Private browsing/storage restrictions fall back to the in-memory limit. */
  }
  return cache;
}
function writeCache(value: Cache) {
  cache = value;
  try {
    localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    /* In-memory cache still applies. */
  }
}

async function jsonFetch(url: string): Promise<unknown> {
  const response = await fetch(url, {
    credentials: 'omit',
    signal: AbortSignal.timeout(12_000),
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

export function loadOverview(): Promise<{ markets: Market[]; mode: 'demo' | 'cached'; error: boolean }> {
  if (overviewPromise) return overviewPromise;
  const base = import.meta.env.VITE_PUBLIC_API_BASE_URL?.trim();
  if (!base) return Promise.resolve({ markets: demoMarkets, mode: 'demo', error: false });
  overviewPromise = (async () => {
    try {
      const endpoint = new URL(`${base.replace(/\/$/, '')}/api/public/overview`);
      if (!['http:', 'https:'].includes(endpoint.protocol) || endpoint.username || endpoint.password)
        throw new Error('Invalid public base URL');
      const raw = await jsonFetch(endpoint.href);
      return {
        markets: normalizeOverview(raw, 'cached', endpoint.href),
        mode: 'cached' as const,
        error: false,
      };
    } catch {
      return { markets: demoMarkets, mode: 'demo' as const, error: true };
    }
  })();
  return overviewPromise;
}

// Explicit visitor action only. Two public GETs, no API key, no background polling.
// Failures are throttled too. Provider data is all-or-nothing to avoid mixed evaluation times.
export function loadSpotCandles(now = Date.now()): Promise<ResearchItem[]> {
  if (inflight) return inflight;
  const previous = readCache();
  if (previous && now >= previous.attemptedAt && now - previous.attemptedAt < CACHE_TTL) {
    if (previous.btc && previous.eth && previous.completedAt) {
      try {
        const at = new Date(previous.completedAt).toISOString();
        return Promise.resolve([
          candleItem('BTC', previous.btc, 'cached', at),
          candleItem('ETH', previous.eth, 'cached', at),
        ]);
      } catch {
        return Promise.reject(new Error('Cached data is invalid. Try after the 15-minute cooldown.'));
      }
    }
    return Promise.reject(new Error('Provider cooldown. Try after 15 minutes.'));
  }
  writeCache({ attemptedAt: now });
  inflight = (async () => {
    const [btc, eth] = await Promise.all([
      jsonFetch('https://api.kraken.com/0/public/OHLC?pair=XBTUSD&interval=60'),
      jsonFetch('https://api.kraken.com/0/public/OHLC?pair=ETHUSD&interval=60'),
    ]);
    const completedAt = Date.now();
    const at = new Date(completedAt).toISOString();
    const items = [candleItem('BTC', btc, 'cached', at), candleItem('ETH', eth, 'cached', at)];
    writeCache({ attemptedAt: now, completedAt, btc, eth });
    return items;
  })().finally(() => {
    inflight = undefined;
  });
  return inflight;
}
