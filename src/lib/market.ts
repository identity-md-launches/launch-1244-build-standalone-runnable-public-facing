export type Locale = 'en' | 'zh-TW';
export type Copy = { en: string; 'zh-TW': string };
export const copy = (en: string, zh: string): Copy => ({ en, 'zh-TW': zh });
export type MarketId = 'spot' | 'contracts' | 'onchain' | 'tw' | 'us' | 'gold';
export type DataMode = 'demo' | 'cached';
export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
export interface CandleAnalysis {
  candles: Candle[];
  close: number;
  previousClose: number;
  sma20: number;
  previousSma20: number;
  changePct: number;
  conditions: boolean[];
  sourceTime: string;
  evaluatedAt: string;
}
export interface ResearchItem {
  id: string;
  market: MarketId;
  symbol: string;
  name: string;
  venue: Copy;
  price: number | null;
  quote: string;
  score: number | null;
  signalCount: number | null;
  sourceTime: string | null;
  marketDate: string | null;
  evaluationTime: string | null;
  sourceUrl: string;
  originalSource: boolean;
  mode: DataMode;
  changePct: number | null;
  analysis?: CandleAnalysis;
  change: Copy;
  why: Copy;
  bullish: Copy;
  bearish: Copy;
  invalidation: Copy;
}
export interface Market {
  id: MarketId;
  title: Copy;
  short: Copy;
  descriptor: Copy;
  summary: Copy;
  icon: string;
  items: ResearchItem[];
  sourceTime: string | null;
}
export const HOUR = 3_600_000;
export const SNAPSHOT_MAX_AGE = 6 * HOUR;
export const CANDLE_MAX_AGE = 2 * HOUR;

export function freshness(
  sourceTime: string | null,
  now = Date.now(),
  maxAge = SNAPSHOT_MAX_AGE
): 'fresh' | 'stale' | 'missing' {
  if (!sourceTime) return 'missing';
  const time = Date.parse(sourceTime);
  if (!Number.isFinite(time) || time > now + 60_000) return 'missing';
  return now - time >= maxAge ? 'stale' : 'fresh';
}

export function researchStatus(
  item: ResearchItem,
  now = Date.now()
): 'demo' | 'stale' | 'missing' | 'cached' {
  const state = freshness(item.sourceTime, now, item.analysis ? CANDLE_MAX_AGE : SNAPSHOT_MAX_AGE);
  if (state !== 'fresh') return state;
  // Conservatively treat a previous market session as historical, even if republished today.
  if (item.marketDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.marketDate) || !Number.isFinite(Date.parse(item.marketDate)))
      return 'missing';
    const day = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(now));
    if (item.marketDate > day) return 'missing';
    if (item.marketDate < day) return 'stale';
  }
  return item.mode === 'demo' ? 'demo' : 'cached';
}

export function sma(values: number[], period: number): number {
  if (
    !Number.isInteger(period) ||
    period < 1 ||
    values.length < period ||
    values.some((v) => !Number.isFinite(v))
  )
    throw new Error('Invalid moving-average input');
  return values.slice(-period).reduce((a, b) => a + b, 0) / period;
}

export function analyzeKraken(payload: unknown, evaluatedAt: string): CandleAnalysis {
  const now = Date.parse(evaluatedAt);
  if (!Number.isFinite(now)) throw new Error('Invalid evaluation time');
  if (!payload || typeof payload !== 'object') throw new Error('Invalid provider response');
  const data = payload as { error?: unknown; result?: Record<string, unknown> };
  if (!Array.isArray(data.error) || data.error.length || !data.result)
    throw new Error('Provider returned an error');
  const rows = Object.values(data.result).find(Array.isArray) as unknown[][] | undefined;
  if (!rows || rows.length < 22) throw new Error('Not enough completed candles');
  // Kraken always returns the in-progress candle last. Discard it even if the clock differs.
  const candles: Candle[] = rows
    .slice(0, -1)
    .map((row) => {
      if (!Array.isArray(row) || row.length < 8) throw new Error('Invalid candle');
      const rawValues = [row[0], row[1], row[2], row[3], row[4], row[6]];
      if (rawValues.some((v) => (typeof v !== 'string' && typeof v !== 'number') || String(v).trim() === ''))
        throw new Error('Missing candle value');
      const values = rawValues.map(Number);
      if (values.some((v) => !Number.isFinite(v)) || values.slice(1, 5).some((v) => v <= 0) || values[5] < 0)
        throw new Error('Invalid candle values');
      const [time, open, high, low, close, volume] = values;
      if (
        !Number.isInteger(time) ||
        high < Math.max(open, close) ||
        low > Math.min(open, close) ||
        low > high
      )
        throw new Error('Invalid candle range');
      return { time, open, high, low, close, volume };
    })
    .filter((c) => c.time * 1000 + HOUR <= now);
  if (candles.length < 21) throw new Error('Not enough completed candles');
  // Require chronological, contiguous hourly bars. Missing bars must not become a signal.
  candles.forEach((c, i) => {
    if (i && c.time - candles[i - 1].time !== 3600) throw new Error('Incomplete hourly candle series');
  });
  const closes = candles.map((c) => c.close);
  const close = closes.at(-1)!;
  const previousClose = closes.at(-2)!;
  const sma20 = sma(closes, 20);
  const previousSma20 = sma(closes.slice(0, -1), 20);
  return {
    candles,
    close,
    previousClose,
    sma20,
    previousSma20,
    changePct: (close / previousClose - 1) * 100,
    conditions: [close > sma20, sma20 > previousSma20, close > previousClose],
    sourceTime: new Date(candles.at(-1)!.time * 1000 + HOUR).toISOString(),
    evaluatedAt,
  };
}

export function taipei(iso: string | null, locale: Locale, dateOnly = false): string {
  if (!iso || !Number.isFinite(Date.parse(iso))) return locale === 'en' ? 'Not supplied' : '未提供';
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    ...(dateOnly ? {} : { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' as const }),
  }).format(new Date(iso));
}
export function number(value: number | null, locale: Locale, max = 2): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: value < 0.01 && value > 0 ? 8 : max,
    minimumFractionDigits: value >= 1 ? Math.min(2, max) : 0,
  }).format(value);
}
