import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeKraken,
  CANDLE_MAX_AGE,
  freshness,
  HOUR,
  researchStatus,
  sma,
  taipei,
} from '../src/lib/market';
import { candleItem, demoCandles, demoMarkets, normalizeOverview } from '../src/lib/snapshot';

const start = Date.parse('2026-01-01T00:00:00Z');
const evaluation = new Date(start + 22 * HOUR).toISOString();
function series(closes: number[]) {
  return {
    error: [],
    result: {
      XXBTZUSD: closes.map((close, i) => [
        start / 1000 + i * 3600,
        String(close),
        String(close + 2),
        String(close - 0.5),
        String(close),
        String(close),
        '10',
        100,
      ]),
      last: start / 1000,
    },
  };
}

test('20-period SMA uses exactly the final 20 closes', () => {
  assert.equal(
    sma(
      Array.from({ length: 21 }, (_, i) => i + 1),
      20
    ),
    11.5
  );
  assert.throws(() => sma([1, 2], 20));
  assert.throws(() => sma([1, Number.NaN], 2));
  assert.throws(() => sma([1, 2], 0));
});
test('calculation excludes the unfinished candle even when its price is extreme', () => {
  const payload = series([...Array.from({ length: 21 }, (_, i) => i + 1), 999999]);
  const result = analyzeKraken(payload, evaluation);
  assert.equal(result.candles.length, 21);
  assert.equal(result.close, 21);
  assert.equal(result.sma20, 11.5);
  assert.equal(result.previousSma20, 10.5);
  assert.deepEqual(result.conditions, [true, true, true]);
  assert.ok(Math.abs(result.changePct - 5) < 1e-10);
  assert.equal(result.sourceTime, new Date(start + 21 * HOUR).toISOString());
});
test('falling prices produce three unmet conditions rather than a positive score', () => {
  const result = analyzeKraken(series([...Array.from({ length: 21 }, (_, i) => 30 - i), 999]), evaluation);
  assert.deepEqual(result.conditions, [false, false, false]);
  assert.equal(result.close, 10);
});
test('provider errors, gaps, invalid OHLC and incomplete histories are rejected', () => {
  assert.throws(() => analyzeKraken({ error: ['rate limit'] }, evaluation));
  assert.throws(() => analyzeKraken(series([1, 2, 3]), evaluation));
  const gap = series(Array.from({ length: 24 }, (_, i) => i + 1));
  gap.result.XXBTZUSD.splice(8, 1);
  assert.throws(() => analyzeKraken(gap, evaluation), /Incomplete hourly/);
  const invalid = series(Array.from({ length: 22 }, (_, i) => i + 1));
  invalid.result.XXBTZUSD[10][2] = '0.1';
  assert.throws(() => analyzeKraken(invalid, evaluation), /Invalid candle range/);
});
test('future and unclosed candles cannot leak into the result', () => {
  const result = analyzeKraken(series(Array.from({ length: 25 }, (_, i) => i + 1)), evaluation);
  assert.equal(result.candles.length, 22);
  assert.equal(result.close, 22);
});
test('freshness blocks missing, invalid, future and exactly two-hour-old candle sources', () => {
  const now = Date.parse(evaluation);
  assert.equal(freshness(null, now), 'missing');
  assert.equal(freshness('invalid', now), 'missing');
  assert.equal(freshness(new Date(now + 2 * 60_000).toISOString(), now), 'missing');
  assert.equal(freshness(new Date(now - CANDLE_MAX_AGE).toISOString(), now, CANDLE_MAX_AGE), 'stale');
  assert.equal(freshness(new Date(now - CANDLE_MAX_AGE + 1).toISOString(), now, CANDLE_MAX_AGE), 'fresh');
});
test('demo stays an archive even when recent; cached research loses eligibility as it ages', () => {
  const item = candleItem('BTC', series(Array.from({ length: 22 }, (_, i) => i + 1)), 'demo', evaluation);
  const now = Date.parse(evaluation);
  assert.equal(researchStatus(item, now), 'demo');
  assert.equal(researchStatus({ ...item, mode: 'cached' }, now), 'cached');
  assert.equal(researchStatus({ ...item, mode: 'cached' }, now + HOUR), 'stale');
  assert.equal(researchStatus({ ...item, sourceTime: null }, now), 'missing');
});
test('snapshot normalization preserves missing values; gold never gets invented candidates', () => {
  const normalized = normalizeOverview(
    {
      spot: { generatedAt: 'not a date', items: [{ symbol: 'ABC', price: null, score: 1000 }, { price: 5 }] },
      gold: { items: [{ symbol: 'XAU', price: 99 }] },
    },
    'cached'
  );
  assert.equal(normalized[0].items.length, 1);
  assert.equal(normalized[0].items[0].price, null);
  assert.equal(normalized[0].items[0].score, null);
  assert.match(normalized[0].items[0].why.en, /neither a condition score/);
  assert.equal(normalized[0].sourceTime, null);
  assert.equal(normalized[5].items.length, 0);
  assert.throws(() => normalizeOverview({ unrelated: true }, 'cached'));
});
test('republishing a previous market session does not make its observations current', () => {
  const base = demoMarkets[3].items[0];
  const now = Date.parse('2026-10-10T14:20:00Z');
  assert.equal(researchStatus({ ...base, mode: 'cached', sourceTime: '2026-10-10T14:19:00Z' }, now), 'stale');
  assert.equal(researchStatus({ ...base, marketDate: '2026-10-12' }, now), 'missing');
});
test('fixed fixtures retain source provenance and leave absent evaluation times absent', () => {
  assert.equal(demoMarkets.length, 6);
  assert.equal(demoMarkets[0].items.find((i) => i.symbol === 'BTCUSDT')?.price, 82791.52);
  assert.equal(demoMarkets[0].items[0].evaluationTime, null);
  assert.equal(demoMarkets[5].items.length, 0);
  assert.ok(
    demoCandles.every((i) => i.analysis!.candles.length === 72 && i.originalSource && i.mode === 'demo')
  );
});
test('Taipei dates are formatted in UTC+8, independently of the viewer timezone', () => {
  assert.match(taipei('2026-01-01T23:00:00Z', 'en'), /02 Jan 2026, 07:00/);
  assert.equal(taipei(null, 'en'), 'Not supplied');
});
test('a published stop and risk label retain their provenance without becoming current orders', () => {
  const btc = demoMarkets[0].items.find((item) => item.symbol === 'BTCUSDT')!;
  assert.match(btc.invalidation.en, /historical stop reference of 64704\.01 USDT/);
  assert.match(btc.invalidation.en, /not a current order instruction/);
  assert.match(btc.bearish.en, /Publisher risk label: medium/);
  assert.match(demoMarkets[1].items[0].invalidation.en, /No verified invalidation rule/);
});
