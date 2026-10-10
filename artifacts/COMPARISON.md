# Comparison and transplant priorities

## What the public baseline actually showed

Inspected [aimarket.trade](https://aimarket.trade/) on **10 October 2026, approximately 22:18 Asia/Taipei**, through its rendered page and public HTML/JSON. The page had an English/Traditional Chinese switch, a large introductory statement, six research boards, Taipei snapshot times, condition scores or signal counts, and read-only/cached-data explanations. It described a scheduled three-hour scan. Gold had neither a verified price nor candidate. An owner entry was visible; it was not opened.

The captured public payload held six spot, four contract, three on-chain, three Taiwan and four US observations. It lacked per-rule evidence and original exchange citations. Contract directions were absent. Equity market dates preceded the publication date. [Baseline screenshot](baseline-desktop.webp), [source ledger](DATA.md).

The public page's honest dates and one-summary-for-everyone cost model are worth keeping. Opening it does not make its prices live.

## What this experiment changes

| Visitor task | Current public page | Experiment |
| --- | --- | --- |
| Understand the first screen | Describes coverage and update policy | Adds a dated, source-backed brief, visible demo/cached status, direct research route and a readable market wall |
| Explore a market | Six long boards in one page | Market filters, instrument search, compact cards and explicit empty states |
| Ask what changed | Values and some session changes | Separates actual candle/session change from unavailable prior research versions |
| Trace a claim | Scores, prices and limits; underlying rules absent | One-click evidence detail showing source, evaluation clock, missing fields, both sides and invalidation; reproducible Kraken example |
| Read contracts | Historical observations without direction | Both long/short frameworks, explicitly unevaluated and without execution controls |
| Return to an observation | No visible local collection in inspected page | Browser-only bookmarks, with no account or backend |
| Recognize the product | Restrained dark research page | Original frog observer facing a large green chart wall; motion confined to short interaction feedback |
| Understand missing gold data | Honest framework-only state | Preserves that state, explains the missing ingredients and invents no values |

Engagement improvements are hypotheses supported by a working prototype, **not user-research findings**. No conversion, retention or preference test was run. The scene adds personality and visual weight; some visitors may prefer the baseline's quieter layout. A later human study should compare time to identify a source date and answer the three evidence questions, rather than judge only visual preference.

## Ranked upgrades

Effort below is a relative estimate for an engineer familiar with the existing stack, not a delivery promise. Recurring costs describe request behavior, not a quoted hosting price.

| Rank | Concrete upgrade | Visitor value | Implementation effort | Recurring cost | Recommendation |
| --- | --- | --- | --- | --- | --- |
| 1 | Add source/evaluation/session dates, source links, missing-field states and three-question evidence details to each item | Very high: visitors can trace and challenge a claim | Medium; UI is ready, but richer source records require a schema change | No extra page-load provider calls if populated by the existing scan; collection cost depends on upstream fields | Transplant first, keeping unknown evidence explicitly unknown |
| 2 | Gate stale/missing/future data at instrument level, independently of the newest board timestamp | Very high: prevents recency confusion | Small–medium; add an exchange-calendar policy later | Local calculation only | Transplant the conservative logic and age labels |
| 3 | Put a brief and clear research action beside the last successful timestamp | High: makes the first screen useful immediately | Small; derive copy from each actual snapshot | No extra calls | Transplant layout and deterministic copy generation; never reuse the fixed demo sentence with new data |
| 4 | Add six market filters, symbol search and responsive compact cards | High: reduces scanning time | Small–medium | No extra calls; negligible static bytes | Transplant behavior without requiring a React rewrite |
| 5 | Separate published scores from transparent condition checks; show bullish, bearish and invalidation fields | High: clarifies what a score can and cannot say | Medium; needs data-model discipline | Usually no marginal reads when recorded during existing scans | Transplant labels/schema; do not infer rule explanations from scores |
| 6 | Add local bookmarks with clear browser-only scope | Medium: supports return visits | Small | No backend or provider cost | Optional transplant; retain storage-failure handling |
| 7 | Use the observer/wall scene as an original brand asset | Medium, unvalidated: distinct visual memory | Small–medium for integration and art review | A few KB of SVG plus already-bundled chart code; no recurring generation | Test with visitors; preserve useful content and reduced motion |
| 8 | Add the Kraken completed-candle demonstration | Medium: one fully reproducible evidence path | Medium | Two public GETs per explicit request per browser; 15-minute throttle, no paid job | Keep optional; favor a shared cache before a broad production rollout |

## Reusable pieces

The inspected public page is HTML with inline CSS and JavaScript. The experiment's `public/assets/observer.svg`, CSS tokens, copy, responsive card patterns, condition-score explanations, source ledger and pure calculation/normalization functions can be moved into that style of stack. React components are examples, not a required framework migration. `src/lib/providers.ts` isolates the public read boundary, and `src/lib/market.ts` makes freshness and math independently testable. No production repository, deployment service or owner API was inspected.

## Keep out of production

- Do not ship this fixed demo as current research, or reuse its fixed brief against a new dataset.
- Do not promote the three-condition example to a validated signal, calibrated probability, strategy or performance claim.
- Do not label the contract frameworks as observed long/short signals. Direction, triggers and contract terms were not supplied.
- Do not merge per-visitor fetching automatically. The existing shared summary has a stronger cost boundary at scale.
- Do not add an owner desk, login, wallet tracking, notification delivery or execution UI to the public surface as part of this transplant.

## Blockers, publication and review

The public overview failed from an isolated origin; its response lacked CORS permission. Production data integration needs a compatible public endpoint or an authorized same-origin deployment. This task changes neither. Kraken direct reads worked during the test, but gateway/IP-dependent access and current terms still need production review. No third-party frog illustration was used; font/design-guidance licenses are included. AIMarket/Pepe branding rights and commercial market-data redistribution were not independently cleared by this experiment.

**Repository URL:** not supplied; no remote is configured. **Exact starting commit:** `0243d7da4a4337ae8b16bcdf15bb4ead736fd68f`. **Delivery commit:** unavailable until contributor submission; protected `.git/` was not changed. **Public preview/IPFS URL:** none; nothing was published. [Manifest](delivery-manifest.json) records exact delivered file hashes. [README](../README.md) gives install, preview, rebuild, inspection and publication steps. This is an independent review artifact, not a replacement deployment.
