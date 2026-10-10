# Implemented design system

## Overview

This is a public research terminal for a new visitor deciding what to investigate, not a trading interface. Its visual character is a dark green observation room: large readable chart monitors, an original small frog observer, restrained instrument labels, and quiet content surfaces. The first hierarchy is **data status → dated brief → research route → markets → evidence**.

The source of truth is `src/styles.css`, followed by `src/components/` and `src/App.tsx`. The observer scene is specific to the homepage, not a universal layout primitive. UI density is deliberately higher than a marketing landing page; details disclose the explanation rather than cramming all evidence into a card.

## Colors

The site has one dark theme. `:root` in `src/styles.css` defines a green-neutral primitive ramp and semantic role tokens. Components use semantic tokens for their common surfaces and text; chart/scene treatments have explicit local values.

| Semantic token | Implemented value | Role |
| --- | --- | --- |
| `--bg` | `#080d0a` | Page and detail background |
| `--surface` | `#0e1510` | Cards, source ledger surroundings, header strips |
| `--surface-raised` | `#121c15` | Secondary buttons and score notes |
| `--surface-hover` | `#19251b` | Hover and selected controls |
| `--border` | `#2c3d2d` | Non-interactive structure and dividers |
| `--control-border` | `#596d51` | Search, language switch and secondary button boundaries |
| `--text` | `#e3ecdc` | Primary text |
| `--text-secondary` | `#a1b29f` | Supporting copy and metadata |
| `--text-tertiary` | `#9aaa95` | Low-emphasis instrumentation |
| `--accent` / `--focus` | `#b8f589` | Main action, selected emphasis, visible focus |
| `--accent-ink` | `#14210e` | Text on the filled main action |
| `--warning` | `#dcc18d` | Demo/stale/failure notices |
| `--chart-up` | `#91c56b` | Filled up-candles |
| `--chart-down` | `#698d74` | Hollow down-candle outlines |
| `--chart-average` | `#cfbe90` | Dashed SMA line |

The wall uses an opaque `#101b12` monitor background, `#40593a` screen borders, restrained green shadows and a faint masked grid. Green is also part of the requested scene/brand aesthetic; it is not an assertion of positive market performance. Status always includes words and often an icon. Candles distinguish direction with filled/hollow bodies as well as position; the average is dashed. Detail text and the candle table provide a numeric alternative.

Measured flat rendered pairs include supporting text/page **8.75:1**, primary button text/fill **13.13:1**, badge text/fill **9.75:1**, search boundary/surface **3.29:1**, and focus outline/adjacent page **15.35:1**. These are specific measurements, not a claim that every gradient/art pixel passes a text threshold. See `artifacts/browser-validation.json` and `artifacts/validation.md`.

## Typography

- **Body and headings:** locally bundled Space Grotesk Latin variable WOFF2, declared 300–700. Actual UI uses regular 400, medium 500 and semibold 600; native strong text can use the supplied 700. Fallbacks: `PingFang TC`, `Microsoft JhengHei`, sans-serif. Chinese glyphs depend on the system fallback.
- **Numbers and instrumentation:** local IBM Plex Mono Latin regular WOFF2, 400, followed by `PingFang TC`, monospace. Numeric values use tabular figures; no synthetic mono weight is required.
- Base document size: **16px**. `--text-xs` 12px, `--text-sm` 13px, `--text-base` 15px, `--text-md` 16px, `--text-lg` 18px. Section heading: `clamp(1.5rem, 2.25vw, 2rem)`. Display heading: `clamp(2.3rem, 3.5vw, 3.25rem)`, with content-specific responsive adjustments.
- The display heading uses 1.15 line-height and −0.055em tracking; section headings use 1.25 and −0.04em. Body copy uses 1.65, and detail prose 1.7. Long text is capped around 51–75 characters depending on role. Headings balance; descriptions use pretty wrapping.
- Secondary terminal/brand labels use 9–12px text where specified. Small chart labels are duplicated by clearer source metadata and the detail view. Mobile source dates were enlarged during review; decorative micro-labels are not the sole carrier of a fact.
- Mobile search inputs are **16px** to avoid iOS input zoom. Content is selectable, and `html[lang]` switches between `en` and `zh-TW`. No text-size cap is set on the viewport.

Font files live in `public/assets/`; required font notices also ship under `public/licenses/`. Runtime fonts are not requested from a third-party CDN. `font-synthesis: none` and font smoothing are set once at the root.

## Layout

`--content` caps the `.shell` at **1376px**. Outer gutters are 48px by default, 32px at 1160px and below, 20px at 700px and below, and 16px at 440px and below. Shared spacing tokens `--space-1` through `--space-8` are **4, 8, 12, 16, 24, 32, 48, 64px**; component-specific 18/20/28px insets remain intentional.

- Desktop hero: two columns, `1fr 1.14fr`, with a 42px gap. The brief remains before the scene in DOM order. The wall has a slight CSS perspective; real chart labels, buttons and dates sit on its screens.
- Market cards: three equal columns, two at 900px and below, one at 440px and below. Filter controls wrap instead of hiding in an unlabelled horizontal scroller.
- Observation results: three columns, two below 900px, one below 700px. Search fills the mobile content width.
- At 700px and below the hero becomes one column, the navigation moves to its own row, and the scene stays after the useful brief/action/date. The source ledger becomes stacked rows. All controls remain inside the gutters.
- The methodology grid becomes a vertical list on mobile. Footer content stacks. The wall grid is constrained to the scene on small screens to avoid decorative overflow.
- Details use an 860px maximum wide dialog or a 640px regular dialog, with viewport-relative maximum height. The inner body scrolls, the close control remains outside that scroll body, and overscroll is contained. Small-screen width is `calc(100% - 20px)`.

Desktop 1440px, intermediate 768px, mobile 390px and 320px were rendered in English and Traditional Chinese. The browser also checked reflow with a 1280px viewport and 200% root text enlargement. This is not a native-browser zoom or physical-device claim.

## Elevation & Depth

Cards are mostly flat, separated by tonal surfaces and structural borders. Only the wall screens, observer shadow and modal use substantial depth. Screens have two restrained outer keylines and a faint green shadow; the frog has a soft drop-shadow. The dialog has a `0 30px 100px #0008` shadow; its native backdrop is `#020703d9` with 5px blur. Text is placed on opaque surfaces, not on the decorative grid.

The observer is non-interactive and has `pointer-events: none`. Scene-grid/floor decorations also cannot intercept a click. Dialogs use the browser top layer, not an arbitrary high stacking number. The skip link and storage notice are the only fixed overlays in the normal page.

## Shapes

`--radius` is **8px** for cards; `--radius-small` is **4px** for controls and labels. Scene monitors use 5px; inner detail panels 6px; the outer desktop dialog 12px, reduced to 9px on mobile. These are deliberately small terminal-like radii, not pill cards. Status dots are 4–5px squares. Icon strokes are 1.6px with rounded joins and `currentColor`.

## Components

| Component / pattern | Source | Behavior and reuse |
| --- | --- | --- |
| `Icon` | `src/components/Icon.tsx` | Original inline SVG paths, `name`, `size`, `className`; decorative icons are hidden from assistive technology. Names live on controls. |
| `Chart` | `src/components/Chart.tsx` | Accepts validated `CandleAnalysis`, locale and optional `detailed`; shows 48 completed hourly candles and the real SMA. Never pass synthesized decorative prices. Its SVG accessible description states the last close and average encoding. |
| `Modal` | `src/components/Modal.tsx` | Native `dialog.showModal()`, initial close-button focus, inert background, explicit Tab-edge cycling, Escape and outside-backdrop close, trigger-focus restoration and body scroll lock. |
| `ResearchDetail` | `src/components/ResearchDetail.tsx` | Validated item + locale + save state/actions + clock. Shows age gate, dates, venue, evidence questions, risks, original-source/summary distinction, optional rules/table and both futures frameworks. |
| `ItemRow` | `src/App.tsx` | Stable module-level component; opens a research detail with a native button. Do not declare it inside `App`, which would remount it and break focus restoration. |
| Market cards / observation cards | `src/App.tsx`, `.market-card`, `.observation-card` | Category overview versus searchable item result. Gold has a real empty state and framework route, not a placeholder price. |
| Filter group | `src/App.tsx`, `.filter-row` | Native buttons with `aria-pressed`; standard Tab/Enter/Space interaction. These are filters, not ARIA tabs. |
| Search | `.search-box` | Labelled native search input; immediate local filtering, no API request, recoverable no-match state. |
| Status/notice | `.badge`, `.notice`, `.provider-message` | Text and icon/square redundancy. Provider errors retain the last data and give a cooldown/retry explanation. Stable polite regions announce results without blocking input. |
| Bookmarks | `src/App.tsx` | Versioned local-storage IDs; accessible pressed state and storage-failure notice. No account or delivery service. |
| Candle data disclosure | `.candle-data` in `ResearchDetail` | Native `details/summary`; 21 exact completed close/volume rows, Taipei close times and semantic table headers. |

There is one filled high-emphasis action in the entry view. Secondary buttons have a visible control border. Default button height is 44px; dense filters and icon buttons use 40px. Focus uses a 2px perimeter with 4px offset. Forced-colors mode keeps system-visible outlines and borders.

Motion is limited to 150ms color/background transitions and a 0.96 press scale using `cubic-bezier(.2,0,0,1)`. It is enabled only under `prefers-reduced-motion: no-preference` and when the local reduction control is off. There is no code rain, autoplay, parallax or entrance animation. The live page cannot imply a running market scan.

## Do's and Don'ts

- Start a new section with `.shell`, an existing heading pattern and semantic tokens. Keep source/status information close to the number it qualifies.
- Reuse `ResearchItem` and its normalization boundary. Keep `null` and unknown fields explicit; do not invent a venue, currency, rule, original citation or prior snapshot.
- Pass verified, completed candles to `Chart`; preserve the data table and the timestamp/age policy. A green chart is not permission to label the observation a buy signal.
- Add both English and Taiwan Traditional Chinese copy in `src/i18n.ts`; check wrapping at 320px and the intermediate two-column layout. Do not concatenate partial translated sentences.
- Keep the observer replaceable at `public/assets/observer.svg`; preserve its aspect ratio and ensure the replacement cannot cover an actionable control or required date.
- Prefer native links, buttons, details and dialogs. Preserve focus return, explicit empty states and the stored watchlist's local scope.
- Keep all runtime assets local and relative. Add no wallet, authentication, execution, paid data or background monitoring dependency to a cosmetic transplant.

To add another research view, define its source-backed model in `src/lib/snapshot.ts`, reuse `ResearchDetail` and `.observation-card`, add both translations, then check its source-age and empty states before adding new visual treatments.
