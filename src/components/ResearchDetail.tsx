import type { Locale, ResearchItem } from '../lib/market';
import { number, researchStatus, taipei } from '../lib/market';
import { messages } from '../i18n';
import { KRAKEN_DOCS } from '../lib/snapshot';
import Icon from './Icon';
import Chart from './Chart';
import Modal from './Modal';

export default function ResearchDetail({
  item,
  locale,
  saved,
  onSave,
  onClose,
  now,
}: {
  item: ResearchItem;
  locale: Locale;
  saved: boolean;
  onSave: () => void;
  onClose: () => void;
  now: number;
}) {
  const t = messages[locale];
  const status = researchStatus(item, now);
  const reason = {
    demo: t.demoBlocked,
    cached: t.cachedBlocked,
    stale: t.staleBlocked,
    missing: t.missingBlocked,
  }[status];
  const age = item.sourceTime ? Math.max(0, Math.floor((now - Date.parse(item.sourceTime)) / 60_000)) : null;
  return (
    <Modal title={t.researchDetail} closeLabel={t.closeDetail} onClose={onClose} wide>
      <div className="detail-heading">
        <div>
          <span className="eyebrow">{item.venue[locale]}</span>
          <h2>
            {item.symbol}
            <span>{item.name !== item.symbol ? item.name : ''}</span>
          </h2>
        </div>
        <button
          className={`button secondary save-button ${saved ? 'is-saved' : ''}`}
          aria-pressed={saved}
          onClick={onSave}
        >
          <Icon name="bookmark" />
          {saved ? t.remove : t.save}
        </button>
      </div>
      <div className={`notice ${status === 'cached' ? 'notice-neutral' : ''}`}>
        <Icon name={status === 'cached' ? 'info' : 'clock'} />
        <span>{reason}</span>
      </div>
      <dl className="evidence-meta">
        <div>
          <dt>{t.sourceDate}</dt>
          <dd>
            {taipei(item.sourceTime, locale)}
            <small>{t.timezone}</small>
          </dd>
        </div>
        <div>
          <dt>{t.evaluated}</dt>
          <dd>
            {item.evaluationTime ? taipei(item.evaluationTime, locale) : t.noEvaluation}
            {item.evaluationTime && <small>{t.timezone}</small>}
          </dd>
        </div>
        <div>
          <dt>{t.sourceType}</dt>
          <dd>
            {item.mode === 'demo' ? t.fixedArchive : t.publicCache}
            <small>
              {t.sourceAge}:{' '}
              {age === null
                ? t.unknown
                : age >= 60
                  ? `${Math.floor(age / 60)} ${t.hours}`
                  : `${age} ${t.minutes}`}
            </small>
          </dd>
        </div>
        <div>
          <dt>{item.analysis ? t.close : t.sourceValue}</dt>
          <dd className="mono">
            {number(item.price, locale)} <small>{item.quote || t.currencyUnspecified}</small>
            {item.marketDate && (
              <small>
                {t.marketSession}: {item.marketDate}
              </small>
            )}
          </dd>
        </div>
      </dl>
      {item.analysis && (
        <div className="detail-chart">
          <div className="section-inline">
            <span className="eyebrow">{t.chartRange}</span>
            <span className="caption average-key">
              {t.sma}: {number(item.analysis.sma20, locale)} USD
            </span>
          </div>
          <Chart analysis={item.analysis} locale={locale} detailed />
          <details className="candle-data">
            <summary>{t.inspectCandles}</summary>
            <table>
              <caption className="sr-only">
                {item.symbol} · {t.inspectCandles}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{t.candleTime}</th>
                  <th scope="col">{t.candlePrice}</th>
                  <th scope="col">{t.candleVolume}</th>
                </tr>
              </thead>
              <tbody>
                {item.analysis.candles.slice(-21).map((candle) => (
                  <tr key={candle.time}>
                    <td>{taipei(new Date((candle.time + 3600) * 1000).toISOString(), locale)}</td>
                    <td>{number(candle.close, locale)}</td>
                    <td>{number(candle.volume, locale, 4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </div>
      )}
      <div className="question-list">
        <section>
          <span className="question-number">01</span>
          <div>
            <h3>{t.whatChanged}</h3>
            <p>{item.change[locale]}</p>
          </div>
        </section>
        <section>
          <span className="question-number">02</span>
          <div>
            <h3>{t.why}</h3>
            <p>{item.why[locale]}</p>
            {item.analysis && (
              <>
                <ul className="rule-list">
                  {[t.rule1, t.rule2, t.rule3].map((rule, i) => (
                    <li key={rule}>
                      <span>{rule}</span>
                      <span className={item.analysis!.conditions[i] ? 'rule-met' : 'rule-unmet'}>
                        <Icon name={item.analysis!.conditions[i] ? 'check' : 'close'} size={15} />
                        {item.analysis!.conditions[i] ? t.met : t.unmet}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="caption">{t.calculationNote}</p>
              </>
            )}
            <p className="score-note">
              <Icon name="info" size={16} />
              {t.conditionMeaning}
            </p>
          </div>
        </section>
        <section>
          <span className="question-number">03</span>
          <div>
            <h3>{t.invalidation}</h3>
            <p>{item.invalidation[locale]}</p>
          </div>
        </section>
      </div>
      <div className="evidence-sides">
        <section>
          <h3>
            <Icon name="arrowUp" size={17} />
            {t.bullish}
          </h3>
          <p>{item.bullish[locale]}</p>
        </section>
        <section>
          <h3>
            <Icon name="arrowDown" size={17} />
            {t.bearish}
          </h3>
          <p>{item.bearish[locale]}</p>
        </section>
      </div>
      {item.market === 'contracts' && (
        <section className="scenario-section">
          <span className="eyebrow">{t.scenarioTitle}</span>
          <p className="caption">{t.scenarioNote}</p>
          <div className="evidence-sides">
            <section>
              <h3>{t.long}</h3>
              <p>{t.longText}</p>
            </section>
            <section>
              <h3>{t.short}</h3>
              <p>{t.shortText}</p>
            </section>
          </div>
          <p className="caption">{t.noExecutionDetail}</p>
        </section>
      )}
      <section className="detail-source">
        <h3>{t.evidence}</h3>
        <a className="text-link" href={item.sourceUrl} target="_blank" rel="noreferrer">
          {item.originalSource ? t.openOriginal : t.openSummary}
          <Icon name="external" size={16} />
        </a>
        <p className="caption">
          {item.originalSource ? t.sourceLinkNote : `${t.originalMissing} ${t.sourceLinkNote}`}
        </p>
        {item.analysis && (
          <a className="text-link caption" href={KRAKEN_DOCS} target="_blank" rel="noreferrer">
            Kraken OHLC API <Icon name="external" size={14} />
          </a>
        )}
      </section>
    </Modal>
  );
}
