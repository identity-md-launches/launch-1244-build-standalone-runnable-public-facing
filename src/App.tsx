import { useEffect, useMemo, useState } from 'react';
import Chart from './components/Chart';
import Icon, { type IconName } from './components/Icon';
import Modal from './components/Modal';
import ResearchDetail from './components/ResearchDetail';
import { messages } from './i18n';
import {
  freshness,
  number,
  researchStatus,
  taipei,
  type Locale,
  type Market,
  type MarketId,
  type ResearchItem,
} from './lib/market';
import { demoCandles, demoMarkets, marketDefinitions } from './lib/snapshot';
import { loadOverview, loadSpotCandles } from './lib/providers';

function readSaved(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem('aimarket:saved:v1') || '[]');
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string').slice(0, 200) : [];
  } catch {
    return [];
  }
}

function ItemRow({
  item,
  locale,
  onSelect,
}: {
  item: ResearchItem;
  locale: Locale;
  onSelect: (id: string) => void;
}) {
  const t = messages[locale];
  return (
    <button
      className="instrument-row"
      onClick={() => onSelect(item.id)}
      aria-label={`${item.symbol} — ${t.viewEvidence}`}
    >
      <span className="instrument-identity">
        <strong>{item.symbol}</strong>
        <small>{item.venue[locale]}</small>
      </span>
      <span className="instrument-condition">
        {item.score !== null ? (
          <>
            <b>
              {item.score}
              <span>/100</span>
            </b>
            <small>{t.publishedConditions}</small>
          </>
        ) : (
          <>
            <b>{item.signalCount ?? '—'}</b>
            <small>{t.observations}</small>
          </>
        )}
      </span>
      <Icon name="chevron" size={17} />
    </button>
  );
}

export default function App() {
  const [locale, setLocale] = useState<Locale>('en');
  const [markets, setMarkets] = useState<Market[]>(demoMarkets);
  const [mode, setMode] = useState<'demo' | 'cached'>('demo');
  const [apiError, setApiError] = useState(false);
  const [candles, setCandles] = useState<ResearchItem[]>(demoCandles);
  const [market, setMarket] = useState<MarketId | 'all'>('all');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'all' | 'saved'>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [goldOpen, setGoldOpen] = useState(false);
  const [saved, setSaved] = useState<string[]>(readSaved);
  const [announcement, setAnnouncement] = useState('');
  const [storageError, setStorageError] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [refreshState, setRefreshState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [now, setNow] = useState(Date.now);
  const t = messages[locale];

  useEffect(() => {
    loadOverview().then((result) => {
      setMarkets(result.markets);
      setMode(result.mode);
      setApiError(result.error);
    });
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  useEffect(() => {
    const update = () => setNow(Date.now());
    const timer = window.setInterval(update, 60_000); // Local freshness labels only. Never a network scan.
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  const allItems = useMemo(() => [...candles, ...markets.flatMap((m) => m.items)], [candles, markets]);
  const selectedItem = allItems.find((item) => item.id === selected);
  const latestSnapshot =
    markets
      .map((m) => m.sourceTime)
      .filter((x): x is string => !!x && freshness(x, now) !== 'missing')
      .sort((a, b) => Date.parse(b) - Date.parse(a))[0] || null;
  const summaryState = freshness(latestSnapshot, now);
  const summaryLabel =
    mode === 'demo'
      ? t.demo
      : summaryState === 'stale'
        ? t.stale
        : summaryState === 'missing'
          ? t.missing
          : t.cached;
  const matching = allItems.filter(
    (item) =>
      (market === 'all' || item.market === market) &&
      (view !== 'saved' || saved.includes(item.id)) &&
      `${item.symbol} ${item.name} ${item.venue[locale]}`.toLowerCase().includes(query.trim().toLowerCase())
  );
  const showMarketCards = market === 'all' && view === 'all' && !query.trim();
  const activeMarket = markets.find((m) => m.id === market);
  const displayedSavedCount = allItems.filter((i) => saved.includes(i.id)).length;

  function scrollToResearch() {
    requestAnimationFrame(() =>
      document.getElementById('research')?.scrollIntoView({ behavior: 'instant', block: 'start' })
    );
  }
  function chooseMarket(id: MarketId | 'all') {
    setMarket(id);
    setView('all');
    setQuery('');
    setAnnouncement('');
  }
  function toggleSaved(id: string) {
    const exists = saved.includes(id);
    const next = exists ? saved.filter((s) => s !== id) : [...saved, id];
    setSaved(next);
    setAnnouncement(exists ? t.removedToast : t.savedToast);
    try {
      localStorage.setItem('aimarket:saved:v1', JSON.stringify(next));
    } catch {
      setStorageError(true);
    }
  }
  async function refresh() {
    setRefreshState('loading');
    try {
      const items = await loadSpotCandles();
      setCandles(items);
      setNow(Date.now());
      setRefreshState('success');
    } catch {
      setRefreshState('error');
    }
  }
  function statusLabel(item: ResearchItem) {
    const status = researchStatus(item, now);
    return { demo: t.demo, cached: t.cached, stale: t.stale, missing: t.missing }[status];
  }

  return (
    <div className={`app ${reduced ? 'reduced-motion' : ''}`}>
      <a className="skip-link" href="#research">
        {locale === 'en' ? 'Skip to research' : '跳至研究看板'}
      </a>
      <header className="site-header">
        <div className="shell header-inner">
          <a
            href="#"
            className="brand"
            aria-label={locale === 'en' ? 'AIMarket home' : 'AIMarket 首頁'}
            onClick={() => {
              chooseMarket('all');
            }}
          >
            <span className="brand-mark">
              A<span />
            </span>
            <span>
              AIMarket<span className="brand-label">INTELLIGENCE TERMINAL</span>
            </span>
          </a>
          <nav className="primary-nav" aria-label={locale === 'en' ? 'Main navigation' : '主要導覽'}>
            <a
              href="#research"
              className={view === 'all' ? 'active' : ''}
              onClick={() => {
                setView('all');
              }}
            >
              <Icon name="grid" size={17} />
              {t.observation}
            </a>
            <a
              href="#research"
              className={view === 'saved' ? 'active' : ''}
              onClick={() => {
                setView('saved');
                setMarket('all');
                setQuery('');
              }}
            >
              <Icon name="bookmark" size={17} />
              {t.saved}
              <span className="nav-count">{displayedSavedCount}</span>
            </a>
            <a href="#methodology">{t.methodology}</a>
          </nav>
          <button
            className="language-button"
            onClick={() => setLocale(locale === 'en' ? 'zh-TW' : 'en')}
            aria-label={locale === 'en' ? 'Switch to Traditional Chinese (Taiwan)' : '切換為英文'}
          >
            <Icon name="globe" size={17} />
            <span lang={locale === 'en' ? 'zh-TW' : 'en'}>{locale === 'en' ? '繁中' : 'EN'}</span>
          </button>
        </div>
      </header>
      <main>
        <div className="status-strip">
          <div className="shell status-inner">
            <div className="status-main">
              <span className="status-dot" />
              <strong>{summaryLabel}</strong>
              <span className="status-explanation">{mode === 'demo' ? t.demoNotice : t.cachedNotice}</span>
            </div>
            <a href="#sources">
              {t.viewSources}
              <Icon name="arrow" size={14} />
            </a>
          </div>
        </div>
        {apiError && (
          <div className="shell">
            <p className="notice" role="status">
              <Icon name="info" />
              {t.apiError}
            </p>
          </div>
        )}
        <section className="hero shell" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="tiny-square" />
              {t.eyebrow}
              <span className="edition">/ 001</span>
            </p>
            <h1 id="hero-title">
              {t.headline1}
              <br />
              <span>{t.headline2}</span>
            </h1>
            <p className="hero-promise">{t.promise}</p>
            <div className="market-brief">
              <span className="brief-rule" />
              <p>{mode === 'demo' ? t.brief : t.publicBrief}</p>
            </div>
            <a className="button primary" href="#research" onClick={() => chooseMarket('all')}>
              {t.explore}
              <Icon name="arrow" size={18} />
            </a>
            <p className="hero-timestamp">
              <Icon name="clock" size={14} />
              <span>
                {t.lastSnapshot}
                <strong>
                  {taipei(latestSnapshot, locale)} <span>UTC+8</span>
                </strong>
              </span>
            </p>
          </div>
          <div className="observation-scene" aria-label={t.wallTitle}>
            <div className="scene-grid" aria-hidden="true" />
            <div className="wall-rail">
              <span>AM / OBSERVATORY</span>
              <span>
                <i /> {statusLabel(candles[0])}
              </span>
            </div>
            <div className="wall-monitors">
              <button
                className="wall-screen screen-primary"
                onClick={() => setSelected(candles[0].id)}
                aria-label={`BTC/USD — ${t.viewEvidence}`}
              >
                <span className="screen-title">
                  <span className="coin-mark">₿</span>
                  <strong>
                    BTC<span>/ USD</span>
                  </strong>
                  <span className="screen-meta">KRAKEN · 1H</span>
                  <Icon name="external" size={15} />
                </span>
                <span className="screen-value">
                  {number(candles[0].price, locale)}
                  <span className="screen-unit">USD</span>
                  <span className="screen-change">
                    {candles[0].changePct! >= 0 ? '+' : ''}
                    {number(candles[0].changePct, locale)}% <small>1h</small>
                  </span>
                </span>
                <Chart analysis={candles[0].analysis!} locale={locale} />
                <span className="screen-caption">
                  <span>
                    {t.close} · {taipei(candles[0].sourceTime, locale)} UTC+8
                  </span>
                  <span>{t.viewEvidence} ↗</span>
                </span>
              </button>
              <button
                className="wall-screen screen-secondary"
                onClick={() => setSelected(candles[1].id)}
                aria-label={`ETH/USD — ${t.viewEvidence}`}
              >
                <span className="eth-diamond" aria-hidden="true">
                  ◇
                </span>
                <span className="secondary-symbol">
                  <strong>
                    ETH <small>/ USD</small>
                  </strong>
                  <span>KRAKEN · 1H</span>
                </span>
                <span className="secondary-value">
                  {number(candles[1].price, locale)}
                  <small>
                    {candles[1].changePct! >= 0 ? '+' : ''}
                    {number(candles[1].changePct, locale)}% · 1h
                  </small>
                </span>
                <span className="mini-chart">
                  <Chart analysis={candles[1].analysis!} locale={locale} />
                </span>
                <Icon name="chevron" size={18} />
              </button>
            </div>
            <img
              className="observer"
              src="./assets/observer.svg"
              alt={
                locale === 'en'
                  ? 'An original green frog observer, seen from behind in three-quarter view, wearing a blue shirt and dark trousers, looking at the market wall.'
                  : '原創綠色青蛙觀察者的後側三分之四視角，穿藍上衣與深色長褲，望向市場觀察牆。'
              }
            />
            <div className="scene-floor" aria-hidden="true" />
            <p className="scene-caption">
              <span>{taipei(candles[0].sourceTime, locale)} UTC+8</span>
              <span>{candles[0].mode === 'demo' ? t.wallFoot : t.wallCached}</span>
            </p>
          </div>
        </section>
        <div className="shell">
          <div className="principle-strip">
            <span>
              <Icon name="layers" size={17} />
              <b>06</b> {t.marketCount}
            </span>
            <span>
              <Icon name="shield" size={17} />
              {t.openQuestions}
            </span>
            <span>
              <Icon name="check" size={17} />
              {t.readOnly}
            </span>
          </div>
        </div>

        <section className="shell research-section" id="research" aria-labelledby="research-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{view === 'saved' ? t.collectionSection : t.researchSection}</p>
              <h2 id="research-title">
                {view === 'saved' ? t.saved : t.researchWall}
                <span className="heading-dot">.</span>
              </h2>
              <p>{view === 'saved' ? t.noSavedText : t.researchIntro}</p>
            </div>
            <label className="search-box">
              <span className="sr-only">{t.search}</span>
              <Icon name="search" size={18} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
              />
              <kbd aria-hidden="true">⌕</kbd>
            </label>
          </div>
          <div
            className="filter-row"
            role="group"
            aria-label={locale === 'en' ? 'Filter by market' : '依市場篩選'}
          >
            <button
              aria-pressed={market === 'all'}
              onClick={() => {
                setMarket('all');
              }}
            >
              <Icon name="grid" size={15} />
              {t.all}
            </button>
            {marketDefinitions.map((meta) => (
              <button
                key={meta.id}
                aria-pressed={market === meta.id}
                onClick={() => {
                  setMarket(meta.id);
                }}
              >
                <Icon name={meta.icon as IconName} size={15} />
                {meta.short[locale]}
              </button>
            ))}
          </div>
          {activeMarket && (
            <div className="market-summary">
              <Icon name={activeMarket.icon as IconName} size={24} />
              <div>
                <h3>{activeMarket.title[locale]}</h3>
                <p>{activeMarket.summary[locale]}</p>
              </div>
              <span className="badge">
                {activeMarket.id === 'gold'
                  ? t.unavailable
                  : activeMarket.items[0]
                    ? statusLabel(activeMarket.items[0])
                    : t.missing}
              </span>
            </div>
          )}
          {showMarketCards ? (
            <div className="market-grid">
              {markets.map((m, index) => (
                <article className={`market-card ${m.id === 'gold' ? 'gold-card' : ''}`} key={m.id}>
                  <div className="market-card-heading">
                    <span className="market-icon">
                      <Icon name={m.icon as IconName} size={21} />
                    </span>
                    <span className="market-index">0{index + 1}</span>
                    <span className={`badge ${m.id === 'gold' ? 'badge-muted' : ''}`}>
                      {m.id === 'gold' ? t.unavailable : m.items[0] ? statusLabel(m.items[0]) : t.missing}
                    </span>
                  </div>
                  <h3>{m.title[locale]}</h3>
                  <p className="market-descriptor">{m.descriptor[locale]}</p>
                  {m.id === 'gold' ? (
                    <div className="gold-preview">
                      <span className="gold-blank">—</span>
                      <p>{m.summary[locale]}</p>
                    </div>
                  ) : (
                    <div className="instrument-list">
                      {m.items.slice(0, 2).map((item) => (
                        <ItemRow key={item.id} item={item} locale={locale} onSelect={setSelected} />
                      ))}
                      {m.items.length === 0 && <p className="empty-card">{t.unavailable}</p>}
                    </div>
                  )}
                  <div className="market-card-footer">
                    <span>
                      <Icon name="clock" size={13} />
                      {m.sourceTime ? taipei(m.sourceTime, locale) : t.framework}
                    </span>
                    <button
                      aria-label={`${t.openMarket}: ${m.title[locale]}`}
                      onClick={() => {
                        chooseMarket(m.id);
                        scrollToResearch();
                      }}
                    >
                      <Icon name="arrow" size={18} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : market === 'gold' && view === 'all' && !query.trim() ? (
            <div className="empty-state gold-empty">
              <Icon name="gold" size={38} />
              <h3>{t.goldTitle}</h3>
              <p>{t.goldText}</p>
              <button className="button secondary" onClick={() => setGoldOpen(true)}>
                {t.goldAction}
                <Icon name="arrow" size={18} />
              </button>
            </div>
          ) : matching.length ? (
            <>
              <p className="result-count" role="status">
                {matching.length} {t.results}
              </p>
              <div className="observation-grid">
                {matching.map((item) => (
                  <article key={item.id} className="observation-card">
                    <div className="section-inline">
                      <span className="badge">{statusLabel(item)}</span>
                      <button
                        className={`icon-button ${saved.includes(item.id) ? 'is-saved' : ''}`}
                        aria-label={`${saved.includes(item.id) ? t.remove : t.save}: ${item.symbol}`}
                        aria-pressed={saved.includes(item.id)}
                        onClick={() => toggleSaved(item.id)}
                      >
                        <Icon name="bookmark" size={18} />
                      </button>
                    </div>
                    <h3>{item.symbol}</h3>
                    <p className="caption">{item.venue[locale]}</p>
                    <div className="observation-value">
                      {number(item.price, locale)}
                      <small>{item.quote || t.currencyUnspecified}</small>
                    </div>
                    {item.analysis && <Chart analysis={item.analysis} locale={locale} />}
                    <p>{item.why[locale]}</p>
                    <p className="caption">
                      <Icon name="clock" size={13} /> {taipei(item.sourceTime, locale)} UTC+8
                    </p>
                    <button className="button secondary" onClick={() => setSelected(item.id)}>
                      {t.viewEvidence}
                      <Icon name="arrow" size={17} />
                    </button>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <Icon name={view === 'saved' ? 'bookmark' : 'search'} size={36} />
              <h3>{view === 'saved' && !query ? t.noSaved : t.noResults}</h3>
              <p>{view === 'saved' ? t.savedEmpty : t.noResultsText}</p>
              <button
                className="button secondary"
                onClick={() => {
                  chooseMarket('all');
                }}
              >
                {t.clearFilters}
                <Icon name="arrow" size={17} />
              </button>
            </div>
          )}
          <div className="research-footnote">
            <span>
              <Icon name="info" size={15} />
              {t.conditionMeaning}
            </span>
            <span>UTC+8 · Asia/Taipei</span>
          </div>
        </section>

        <section className="shell methodology-section" id="methodology" aria-labelledby="methodology-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t.methodologySection}</p>
              <h2 id="methodology-title">{t.methodologyTitle}</h2>
              <p>{t.methodologyText}</p>
            </div>
            <span className="section-symbol" aria-hidden="true">
              [ i ]
            </span>
          </div>
          <div className="methodology-grid">
            {[
              { icon: 'settings', title: t.scoreTitle, text: t.conditionMeaning },
              { icon: 'clock', title: t.sourcesTitle, text: t.sourcesText },
              { icon: 'bookmark', title: t.localTitle, text: t.localText },
            ].map((item, index) => (
              <article key={item.icon}>
                <span className="method-number">0{index + 1}</span>
                <Icon name={item.icon as IconName} />
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="shell sources-section" id="sources" aria-labelledby="sources-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t.sourcesSection}</p>
              <h2 id="sources-title">{t.dataTitle}</h2>
              <p>{t.dataSubtitle}</p>
            </div>
          </div>
          <div className="provider-table" role="table" aria-label={t.viewSources}>
            <div className="provider-row table-head" role="row">
              <span role="columnheader">{t.sourceProvider}</span>
              <span role="columnheader">{t.capability}</span>
              <span role="columnheader">{t.updatePolicy}</span>
            </div>
            {[
              [t.summaryProvider, t.summaryCapability, t.summaryPolicy],
              [t.krakenProvider, t.krakenCapability, t.krakenPolicy],
              [marketDefinitions[5].title[locale], t.goldCapability, t.goldPolicy],
            ].map((row, i) => (
              <div className="provider-row" role="row" key={i}>
                {row.map((cell, j) => (
                  <span key={j} role="cell">
                    {cell}
                  </span>
                ))}
              </div>
            ))}
          </div>
          {mode === 'demo' && (
            <p className="static-note">
              <Icon name="info" size={16} />
              {t.demoSourceReason}
            </p>
          )}
          <div className="data-actions">
            <div>
              <button className="button secondary" disabled={refreshState === 'loading'} onClick={refresh}>
                <Icon name="layers" size={18} />
                {refreshState === 'loading' ? t.refreshing : t.refresh}
                <Icon name="arrow" size={17} />
              </button>
              <p className="caption">{t.refreshHint}</p>
              <p className={`provider-message ${refreshState === 'error' ? 'error' : ''}`} role="status">
                {refreshState === 'success'
                  ? t.refreshSuccess
                  : refreshState === 'error'
                    ? t.refreshError
                    : ''}
              </p>
            </div>
            <label className="motion-toggle">
              <input type="checkbox" checked={reduced} onChange={(e) => setReduced(e.target.checked)} />
              <span>
                {t.motion}
                <small>{t.motionSystem}</small>
              </span>
            </label>
          </div>
          <p className="static-note">
            <Icon name="shield" size={16} />
            {t.staticNote}
          </p>
        </section>
      </main>
      <footer className="site-footer">
        <div className="shell footer-inner">
          <div>
            <a href="#" className="footer-brand">
              AIMarket<span> / PEPE INTELLIGENCE TERMINAL</span>
            </a>
            <p>{t.experiment}</p>
          </div>
          <div>
            <span>{t.footer}</span>
            <p>{t.disclaimer}</p>
          </div>
        </div>
      </footer>
      <div className="sr-only" role="status">
        {announcement}
      </div>
      {storageError && (
        <div className="storage-notice" role="status">
          {t.storageError}
          <button className="icon-button" onClick={() => setStorageError(false)} aria-label={t.close}>
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
      {selectedItem && (
        <ResearchDetail
          item={selectedItem}
          locale={locale}
          saved={saved.includes(selectedItem.id)}
          onSave={() => toggleSaved(selectedItem.id)}
          onClose={() => setSelected(null)}
          now={now}
        />
      )}
      {goldOpen && (
        <Modal title={t.framework} closeLabel={t.closeDetail} onClose={() => setGoldOpen(false)}>
          <div className="gold-detail">
            <Icon name="gold" size={38} />
            <h2>{marketDefinitions[5].title[locale]}</h2>
            <p>{t.goldText}</p>
            {[
              [t.goldDollar, t.goldDollarText],
              [t.goldYields, t.goldYieldsText],
              [t.goldRisk, t.goldRiskText],
            ].map(([title, text]) => (
              <section key={title}>
                <h3>{title}</h3>
                <p>{text}</p>
              </section>
            ))}
            <a className="text-link" href="https://aimarket.trade/" target="_blank" rel="noreferrer">
              {t.publicSource}
              <Icon name="external" size={15} />
            </a>
          </div>
        </Modal>
      )}
    </div>
  );
}
