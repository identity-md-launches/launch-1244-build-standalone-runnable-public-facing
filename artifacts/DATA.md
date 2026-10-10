# Data contract and provenance

## Capabilities

There is **no streaming/live price mode**. “Cached” means a bounded, dated response, never continuous market monitoring.

| Market / provider | Live | Cached | Demo | Unavailable / limitation |
| --- | --- | --- | --- | --- |
| Crypto spot / AIMarket overview | No | One load when a CORS-compatible public base is configured | Six captured observations | Individual rule evidence and original exchange citations absent |
| Crypto contracts / AIMarket overview | No | Same shared overview | Four captured observations | Direction, contract specification, original citations and trigger levels absent; both scenarios are explicitly illustrative |
| On-chain / AIMarket overview | No | Same shared overview | Three captured leads | Token addresses and independent identity/liquidity evidence absent; two prices are missing |
| Taiwan equities / AIMarket overview | No | Same shared overview | Three observations for 2026-10-08 | Exact venue and currency not supplied; old session stays historical |
| US equities / AIMarket overview | No | Same shared overview | Four observations for 2026-10-09 | Exact venue and currency not supplied; old session stays historical |
| Gold | No | No | No invented values | No published price or candidate; framework only |
| BTC/USD and ETH/USD / Kraken | No | Optional explicit fetch; 15-minute local cache | Captured hourly OHLCV responses | Network/CORS failure retains the last visible data; two-hour age gate applies |

## Captures

The default fixtures were captured during public inspection and stored separately from provider logic:

| Fixture | Public source | Capture time (UTC) | Source dates retained |
| --- | --- | --- | --- |
| `src/data/overview.demo.json` | [AIMarket public overview](https://aimarket.trade/api/public/overview) | 2026-10-10 14:18:18 | Spot generated 14:16:07.211428 UTC; on-chain 14:17:20.755950 UTC; other boards 21:00:51 UTC+8. Equity market dates remain separate. |
| `src/data/btc.demo.json` | [Kraken XBTUSD, 60-minute OHLC](https://api.kraken.com/0/public/OHLC?pair=XBTUSD&interval=60) | 2026-10-10 14:18:47 | Last completed candle ends 14:00 UTC; unfinished 14:00–15:00 candle is retained in the raw fixture and excluded from analysis. |
| `src/data/eth.demo.json` | [Kraken ETHUSD, 60-minute OHLC](https://api.kraken.com/0/public/OHLC?pair=ETHUSD&interval=60) | 2026-10-10 14:19:26 | Same completed-candle cutoff. |

Kraken responses were reduced to their **last 73 original rows**: 72 completed rows plus the unfinished last row. The row values were copied, not synthesized. The chart displays the last 48 completed rows. The fixed demo calculation uses a replay clock of **2026-10-10 14:20:00 UTC**. “Calculation as of” denotes that deterministic evaluation clock, not a claimed publisher evaluation time or the moment your browser performed the arithmetic. An optional fetched calculation uses its actual local evaluation time. AIMarket's publisher evaluation date is absent and shown as not supplied.

All UI date/times use `Intl.DateTimeFormat` with `timeZone: 'Asia/Taipei'`, independently of the visitor's timezone. The overview's latest successful timestamp is not reused as the age of every instrument. Links open **current** public endpoints; the detail explicitly warns that their contents may now differ from the archived fixture.

The summary payload does not declare currency for most markets. Those values are labeled **Currency not supplied**. USDT is extracted only from the spot instrument's explicit USDT suffix; USD is known from the requested Kraken pair. Missing prices remain `null`/an em dash. No missing observation count is silently turned into zero. When a spot item supplies a stop reference and risk label, the detail preserves them as attributed historical observations; it does not infer a trigger rule, current validity or order instruction.

## Deterministic completed-candle calculation

Implementation: `analyzeKraken` and `sma` in `src/lib/market.ts`.

1. Validate the provider error array, rows, finite numeric OHLCV, positive prices and valid high/low ranges.
2. Always discard the last row. Kraken documents it as the unfinished interval, even when `since` is supplied. See the [official OHLC reference](https://docs.kraken.com/api-reference/market-data/get-ohlc-data).
3. Discard any further row whose start plus one hour exceeds the evaluation clock. Require at least 21 completed rows and a chronological, contiguous hourly series. A gap or duplicate rejects the series.
4. Calculate `SMA20 = sum(last 20 completed closes) / 20`, and the prior SMA20 using the preceding 20 closes.
5. Show three equally weighted Boolean conditions: last close above SMA20; SMA20 above its prior value; last close above prior close. The detail shows each condition and the 21 close/volume records used.
6. Show the hourly change as `(last close / previous close - 1) × 100`. It compares candles, not AIMarket research versions. No earlier AIMarket snapshot was supplied, so a research-thesis change is explicitly unknown.

The three checks are transparent observations. They are **not** a calibrated win probability, expected return, validated strategy or evidence of profitable performance. They are separate from AIMarket's published 0–100 scores, whose individual rules and weights are unknown. The experiment contains no claimed backtest, hit rate, wallet performance or execution logic.

## Age and missing-data behavior

- A missing, unparsable or more-than-one-minute-future source timestamp blocks a current reading.
- Completed candles at least **two hours** old are stale. Overview publication timestamps at least **six hours** old are stale. These are conservative experiment policies, not exchange guarantees.
- A previous market-session date also makes an observation historical even when its publication is recent. The comparison is against the current Taipei calendar date, with no exchange-holiday/calendar adapter. This deliberately errs toward historical labeling.
- A demo is always an archive; freshness never promotes it to a current signal.
- Stale values can still be inspected as history. The detail's prominent notice blocks current conclusions. All outputs remain research, even when fresh.
- Age labels update locally once a minute and on document visibility changes. There is **no** provider polling, continuous monitoring or activity after the browser closes. Browser/device clock accuracy is assumed; future-date validation reduces but cannot eliminate clock error.

## Provider request and cost policy

`src/lib/providers.ts` performs only credential-free public GETs with a 12-second timeout. The default export performs zero external requests on load.

- **Overview:** `VITE_PUBLIC_API_BASE_URL` + `/api/public/overview`; at most once per document load through a memoized promise. Unsupported payload, failed request, invalid base URL or missing CORS permission yields a marked demo and visible explanation. No retry loop or production scan is invoked.
- **Kraken:** `https://api.kraken.com/0/public/OHLC?pair=XBTUSD&interval=60` and the analogous `ETHUSD` request, only after the visitor chooses the load button. Concurrent calls share an in-flight promise. Successful raw responses and their evaluation time are cached for 15 minutes; failed attempts have the same cooldown. The two series are committed together after validation. An error preserves the visible state.
- Cache and attempt timestamps live in `aimarket:kraken-cache:v1`; bookmarks use `aimarket:saved:v1`. If local storage is unavailable, in-memory state remains usable for that document. The limit then does not survive reload. A user can also clear storage; this is cost restraint, not a security quota.
- No backend adapter, paid API, secret, owner credential, login, wallet connection, notification delivery or scheduled server job is included. Provider requests expose the visitor's IP to that provider. Production deployment would need a traffic budget and current provider-terms review; a shared scheduled cache would preserve the existing site's cost advantage better than per-visitor requests.

## Actual network findings

The public page and its same-origin summary were readable. A credential-free overview request from the isolated local origin failed; the inspected HTTP response had no CORS allow-origin header. No CORS proxy or bypass was used. The configured path is covered separately with deterministic browser mocks.

The real Kraken path completed from the isolated preview on **2026-10-10 at 14:40:48 UTC**, displaying the last completed close at **22:00 Asia/Taipei**. [Recorded result](public-provider-check.json). This is a test observation, not a promise of future availability or permission on every IPFS gateway.

Provider redistribution terms, commercial licensing and future availability were not exhaustively reviewed. Numeric fixture provenance is retained; public availability is not presented as a blanket license for commercial redistribution. No calls were made to CoinGlass, TradingView, CMC, GMGN or paid/private providers.
