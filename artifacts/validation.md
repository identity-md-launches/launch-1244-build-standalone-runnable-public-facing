# Worker validation and Better Interface review

**Completion:** complete for the implemented standalone experiment and the stated local checks. Publication, production integration, the eventual submission commit and optional manual checks below are not claimed. These are the worker's own results, not an independent verifier certification.

## Scope and consequential decisions

The finished `dist/` was served as a real static export under `/ipfs/aimarket-experiment/`. Default English and Traditional Chinese were reviewed, including six market filters, search, detail modals, both contract scenarios, gold's missing state, local bookmarks, age labels and optional candle refresh. The original scene is native SVG/CSS; no image references were supplied or claimed. No owner service was accessed.

The default fixture is marked Demo because the isolated-browser overview request failed and the inspected overview response lacked CORS permission. Optional Kraken requests worked from the isolated origin. Unknown evidence, currency, venue or publisher evaluation time stays unknown. Older sessions remain historical even when republished. Source/evaluation dates use Taipei time; the demo calculation uses a fixed replay clock. More detail: [DATA.md](DATA.md).

The pinned Better Interface workflow and the core principles of all six domains were read before/during implementation. Its documentation method was used for root `DESIGN.md`. A single consolidated review follows.

## Six-domain coverage

| Domain | Coverage | Actual checks / evidence | Limits |
| --- | --- | --- | --- |
| Accessibility | Checked | Native button/link/search/dialog/details semantics; named controls; `aria-pressed` state; skip link; visible focus screenshot; Tab/Shift+Tab dialog edges; Escape and focus return; reduced motion; translated document language; four axe scans | No screen-reader session, native mobile device or complete manual WCAG audit; axe retained incomplete items |
| Layout | Checked | Actual screenshots and no-overflow assertions at 1440, 768, 390, 320px; both languages; 1280px at 200% root text size; modal scrolling and search/filter empty states | Text enlargement is not browser-native zoom; no RTL locale requested; not every possible viewport tested |
| Writing | Checked | Action labels match behavior; missing data and cooldown recovery explained; consistent English/zh-TW navigation/status labels; research versus advice, score versus probability, and summary versus original citation distinguished | Taiwan copy was implemented/reviewed by the worker, not validated by a separate native-language editorial study |
| Typography | Checked | Local font loading confirmed with `document.fonts`; rendered hierarchy, paragraph wrapping and tabular numbers inspected; 16px mobile input; source labels enlarged; long unknown labels allowed to wrap | Chinese uses installed system fallback; no cross-OS font-rendering comparison; some terminal/brand micro-labels remain intentionally smaller than body text |
| Colors | Checked | Computed flat text/background pairs measured; control boundary corrected; focus and status redundancy; screenshot inspection; no automatic axe contrast violations | SVG/chart/art/gradient combinations were not exhaustively pixel-sampled; axe marks some complex checks incomplete, so this is not a universal contrast claim |
| UI | Checked | Hover/focus/pressed, selected, loading, saved/removed, missing, stale, no-result and provider failure states; original coherent SVG icon set; 150ms guarded transitions; no autoplay | No 10%-speed DevTools animation-panel replay; no Safari/Firefox or touch-hardware run |

## Findings, corrections and rechecks

Locations below refer to the final reusable source, where the corrections now live.

| Severity / domain | Source location | Observed issue and impact | Correction and evidence |
| --- | --- | --- | --- |
| High / accessibility | `src/App.tsx:29`, `src/components/Modal.tsx:24` | Closing a detail did not return focus to its market-row trigger. Defining the row component inside `App` caused remounts. | Moved `ItemRow` to module scope; preserved the trigger and restored focus. The production-browser Escape/focus-return assertion now passes. |
| Medium / accessibility | `src/components/Modal.tsx:40` | In tested Chromium, Shift+Tab from the first dialog control did not cycle to the last dialog control. | Added explicit native-modal Tab-edge cycling. Tests exercise both edges; background remains native-inert. |
| Medium / layout | `src/styles.css:2698` | The masked decorative grid extended 4px beyond a 390px viewport in Chinese. | Constrained mobile scene-grid inline bounds. Both languages now have no page overflow at 768, 390 and 320px. |
| Medium / typography | `src/styles.css:2702` | Source dates and wall labels became too small when the monitor scaled down. | Raised metadata sizes, moved the mobile candle date outside the small screen, and removed tiny mobile screen-axis labels. Detail metadata and the candle table provide the full data. Re-inspected the mobile screenshot. |
| Medium / colors | `src/styles.css:39`, `src/styles.css:2867` | The search boundary was only 1.60:1 against its surface. | Added the dedicated `--control-border` token. The rendered boundary now measures 3.29:1; focus is 15.35:1 against the adjacent page. |
| High / data writing | `src/lib/market.ts:74` | Publication time alone could make an older equity session appear current. | `researchStatus` checks market-session date independently. The old-session unit test and stale-clock browser test pass. |
| Medium / evidence | `src/lib/snapshot.ts:154`, `src/lib/snapshot.ts:180` | A guessed quote currency and defaulting an absent count to zero would imply facts not supplied. | Non-explicit currencies now say “Currency not supplied”; absent scores/counts have an explicit unknown explanation. No missing value becomes a price or a condition. |
| Medium / accessibility & evidence | `src/components/ResearchDetail.tsx:106` | A chart alone did not expose its exact calculation inputs as readable records. | Added native disclosure with 21 completed-close/volume rows and semantic headers; browser test checks the row count. |

All listed corrections were rebuilt and rechecked. No known blocking defect remains within the tested scope.

## Executed checks

Normal checkout commands are in the README. To keep the protected repository `node_modules/` untouched, the worker installed the exact lockfile toolchain under `/tmp/aimarket-deps/` and used:

```sh
AIMARKET_DEPENDENCY_ROOT=/tmp/aimarket-deps/node_modules /tmp/aimarket-deps/node_modules/.bin/vite build
/tmp/aimarket-deps/node_modules/.bin/tsc --noEmit -p test/scratch/tsconfig.check.json
/tmp/aimarket-deps/node_modules/.bin/tsx --test tests/*.test.ts
AIMARKET_DEPENDENCY_ROOT=/tmp/aimarket-deps/node_modules AIMARKET_CHROMIUM_PATH=/home/levi/.cache/ms-playwright/chromium-1246/chrome-linux64/chrome node tests/browser.mjs
AIMARKET_DEPENDENCY_ROOT=/tmp/aimarket-deps/node_modules AIMARKET_CHROMIUM_PATH=/home/levi/.cache/ms-playwright/chromium-1246/chrome-linux64/chrome node tests/overview-browser.mjs
```

The temporary TypeScript config extended the real root config and changed only dependency-resolution paths/type roots to the external install. It is disposable; a normal install runs `npm run typecheck` directly. The available Chromium executable was selected explicitly after the newly installed Playwright expected a different browser-cache revision. The actual browser reported **Chromium 154.0.8037.0**; it launched and ran the checks successfully.

| Check | Actual result |
| --- | --- |
| Production build | Passed, exit 0; static export contains local relative assets and no external font imports |
| Typecheck | Passed, exit 0 |
| Data tests | 12 passed, 0 failed: exact SMA window, unfinished-candle exclusion, rising/falling checks, invalid/gapped/future candles, freshness threshold, demo gating, older-session gating, missing values, fixture provenance, Taipei time, historical risk-reference attribution |
| Primary browser interactions | 15 groups passed; [machine record](browser-validation.json) |
| Configured public summary | 4 mocked production-build scenarios passed: success/one request per load, HTTP error, malformed response, empty/missing data; [record](overview-validation.json) |
| Accessibility scans | 4 scans (desktop EN, detail, desktop zh-TW, mobile EN), 0 automatic violations. Some page scans retain `aria-prohibited-attr` and `color-contrast` incomplete items; these are not counted as passes. |
| Rendered contrast | 9 measured flat pairs passed their 4.5:1 text or 3:1 non-text thresholds; exact values in browser report |
| Runtime console/resources | No unexpected page errors, console errors or failed resource responses in the main deterministic suite |
| Provider failures | Explicitly mocked in a separate context; these expected aborted requests are not represented as unexpected runtime failures |
| Real public sources | Overview failed cross-origin; Kraken loaded both pairs; [dated network result](public-provider-check.json) |
| Static routing | Direct load and reload at an IPFS-style nested HTTP path passed; no host rewrite or external asset needed |
| Package integrity / size | All required paths present; no symlinks, dependency directories, vendored archives or disposable inputs in the candidate list. Raw payload is under 5.2 MiB and the disposable compressed review archive is under 4.5 MiB, below the 8 MiB cap with explicit packaging headroom. Exact final counts/hashes are in `delivery-manifest.json`. |

Both preview scripts create and close their own local server and browser inside a bounded foreground command. No persistent background server is required or left running. `test/scratch/` is not a build input and is excluded from delivery. No test result depends on it surviving submission.

Deterministic demo browser checks and screenshots start with a controlled clock of **2026-10-10 22:30 Asia/Taipei**; the stale-state check explicitly advances across the two-hour cutoff. This prevents the archived fixtures from making tests fail simply because the tests run on a later date. Report timestamps use the actual worker clock. The separate real-provider check used the actual browser clock, not the fixture clock. The shipped application always uses the visitor's actual clock.

## Screenshots actually produced and viewed

- [Final desktop, full page](desktop.png) and [first viewport](desktop-viewport.png), 1440px wide.
- [Final mobile, full page](mobile.png) and [first viewport](mobile-viewport.png), 390px wide.
- [Traditional Chinese desktop](desktop-zh.png), [Traditional Chinese mobile](mobile-zh.png), and [320px reflow](mobile-320.png).
- [Keyboard focus](keyboard-focus.png), [completed-candle detail](spot-detail.png), and [both contract scenarios](contracts-detail.png).
- [Public baseline](baseline-desktop.webp), captured before building.

These are rendered captures, not mockups or generated illustrations. The main desktop and mobile captures were inspected visually. The full-page screenshots can be tall; the separate viewport images show the entry experience without rescaling an entire long page.

## Remaining limits and delivery boundaries

No public deployment, IPFS pin, production integration, real notification, order execution, owner login, wallet flow, calibrated strategy test or backtest was performed or claimed. No user study establishes increased usefulness or engagement; the comparison ranks hypotheses for later review.

No screen reader, physical device, Safari, Firefox, browser-native 200% zoom, exhaustive pixel-contrast review, or long-duration/background browser behavior was tested. The system clock is trusted for age calculation. Session staleness is conservative and does not model exchange calendars. The data cache is browser-local, not a shared rate limiter. Network/provider terms and commercial reuse need separate production review.

The protected Git directory was not modified. There is no configured repository remote, so only the exact starting commit can be reported. Required source, lockfile, runtime assets, `dist/`, screenshots, licenses and documentation are present and included by the explicit ignore/path-budget rules. The final manifest records candidate file sizes and SHA-256 hashes; it does not assert a publication or submission commit that has not occurred.
