import rawDemo from '../data/overview.demo.json';
import btcDemo from '../data/btc.demo.json';
import ethDemo from '../data/eth.demo.json';
import {
  analyzeKraken,
  copy,
  type Copy,
  type DataMode,
  type Market,
  type MarketId,
  type ResearchItem,
} from './market';

export const CAPTURED_AT = '2026-10-10T14:18:18Z';
// A fixed replay clock, after both captures. It is not the publisher's evaluation time.
export const CANDLE_EVALUATED_AT = '2026-10-10T14:20:00Z';
export const OVERVIEW_SOURCE = 'https://aimarket.trade/api/public/overview';
export const KRAKEN_DOCS = 'https://docs.kraken.com/api-reference/market-data/get-ohlc-data';
export const marketDefinitions: Array<Omit<Market, 'items' | 'sourceTime'>> = [
  {
    id: 'spot',
    title: copy('Crypto spot', '加密貨幣現貨'),
    short: copy('Spot', '現貨'),
    descriptor: copy('Exchange research', '交易所研究'),
    icon: 'spot',
    summary: copy(
      'Published condition scores across exchange pairs. Check the date before the score.',
      '檢視各交易所交易對的已公布條件分數。先看日期，再看分數。'
    ),
  },
  {
    id: 'contracts',
    title: copy('Crypto contracts', '加密貨幣合約'),
    short: copy('Contracts', '合約'),
    descriptor: copy('Long & short scenarios', '多空情境研究'),
    icon: 'contracts',
    summary: copy(
      'Historical contract observations. Explore both sides; direction is not supplied by the public feed.',
      '歷史合約觀察。探索多空兩面；公開摘要未提供訊號方向。'
    ),
  },
  {
    id: 'onchain',
    title: copy('On-chain & memes', '鏈上與迷因代幣'),
    short: copy('On-chain', '鏈上'),
    descriptor: copy('Early discovery', '早期探索'),
    icon: 'onchain',
    summary: copy(
      'Early leads with incomplete identity and liquidity evidence. Unverified stays unverified.',
      '早期線索的身分與流動性證據仍不完整。未驗證就明確標示。'
    ),
  },
  {
    id: 'tw',
    title: copy('Taiwan equities', '台灣股票'),
    short: copy('Taiwan', '台股'),
    descriptor: copy('TWSE · TPEX scope', '上市・上櫃研究範圍'),
    icon: 'tw',
    summary: copy(
      'Dated equity observations. The market session date can be older than publication.',
      '附日期的股票觀察。交易日可能早於摘要發布日。'
    ),
  },
  {
    id: 'us',
    title: copy('US equities', '美國股票'),
    short: copy('US equities', '美股'),
    descriptor: copy('US market research', '美國市場研究'),
    icon: 'us',
    summary: copy(
      'Completed-session snapshots. Signal counts are context, not a performance record.',
      '已結束交易日的快照。訊號數是參考資訊，不是績效紀錄。'
    ),
  },
  {
    id: 'gold',
    title: copy('Gold', '黃金'),
    short: copy('Gold', '黃金'),
    descriptor: copy('XAU · Macro', 'XAU・總經'),
    icon: 'gold',
    summary: copy(
      'Watch the dollar, real yields and market risk. No verified price or candidate is published.',
      '關注美元、實質殖利率與市場風險。目前未公布經驗證的價格或候選標的。'
    ),
  },
];

const record = (x: unknown): Record<string, unknown> =>
  x && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, unknown>) : {};
const str = (x: unknown): string | null => (typeof x === 'string' && x.trim() ? x : null);
const num = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) ? x : null);
const time = (x: unknown): string | null =>
  typeof x === 'string' && Number.isFinite(Date.parse(x)) ? x : null;

export function normalizeOverview(payload: unknown, mode: DataMode, sourceUrl = OVERVIEW_SOURCE): Market[] {
  const raw = record(payload);
  if (!Object.keys(raw).some((k) => ['spot', 'derivatives', 'meme', 'tw', 'us'].includes(k)))
    throw new Error('Unsupported public summary');
  const mapping: Record<MarketId, string> = {
    spot: 'spot',
    contracts: 'derivatives',
    onchain: 'meme',
    tw: 'tw',
    us: 'us',
    gold: 'gold',
  };
  return marketDefinitions.map((meta) => {
    const board = record(raw[mapping[meta.id]]);
    const sourceTime = time(board.generatedAt) || time(board.asOf);
    const items = (Array.isArray(board.items) && meta.id !== 'gold' ? board.items : [])
      .slice(0, 50)
      .flatMap((entry: unknown, index: number): ResearchItem[] => {
        const item = record(entry);
        const symbol = str(item.symbol);
        if (!symbol) return [];
        const priceRaw = num(item.price);
        const price = priceRaw !== null && priceRaw > 0 ? priceRaw : null;
        const scoreRaw = num(item.score);
        const score = scoreRaw !== null && scoreRaw >= 0 && scoreRaw <= 100 ? scoreRaw : null;
        const signals = num(item.signalCount);
        const signalCount = signals !== null && Number.isInteger(signals) && signals >= 0 ? signals : null;
        const changePct = num(item.changePct);
        const historicalStop = num(item.stop);
        const publishedRisk = str(item.risk);
        const riskLabels: Record<string, Copy> = {
          low: copy('low', '低'),
          medium: copy('medium', '中'),
          high: copy('high', '高'),
          unknown: copy('unknown', '未知'),
        };
        const venueRaw = str(item.venue);
        let venue: Copy =
          venueRaw === '幣安'
            ? copy('Binance', '幣安')
            : venueRaw
              ? copy(venueRaw, venueRaw)
              : copy('Venue not supplied', '未提供交易場所');
        if (meta.id === 'contracts' && str(item.name)?.includes('Binance'))
          venue = copy('Binance perpetual · reported', '幣安永續合約・摘要所載');
        if (meta.id === 'onchain')
          venue = copy(
            `Chain reported: ${str(item.chain) || 'unknown'}`,
            `摘要所載鏈別：${str(item.chain) || '未知'}`
          );
        const isMeme = meta.id === 'onchain';
        return [
          {
            id: `${meta.id}-${symbol}-${index}`,
            market: meta.id,
            symbol,
            name: str(item.name) || symbol,
            venue,
            price,
            quote: meta.id === 'spot' && symbol.endsWith('USDT') ? 'USDT' : '',
            score,
            signalCount,
            sourceTime,
            marketDate: str(item.marketDate),
            evaluationTime: null,
            sourceUrl,
            originalSource: false,
            mode,
            changePct,
            change:
              changePct !== null
                ? copy(
                    `The source reports a ${changePct > 0 ? '+' : ''}${changePct}% session move. No previous research snapshot is available to compare.`,
                    `來源回報該交易時段變動 ${changePct > 0 ? '+' : ''}${changePct}%。未提供前次研究快照，無法比較研究變化。`
                  )
                : copy(
                    'No previous research snapshot was supplied. A change in score or thesis cannot be confirmed.',
                    '未提供前次研究快照，無法確認分數或研究假設是否改變。'
                  ),
            why:
              score !== null
                ? copy(
                    `The public board published a condition score of ${score}/100. Its individual rules and weights were not included.`,
                    `公開看板公布 ${score}/100 的條件分數，但未附個別規則與權重。`
                  )
                : signalCount !== null
                  ? copy(
                      `The public board recorded ${signalCount} observations for this instrument. A count does not explain direction or strength.`,
                      `公開看板記錄此標的 ${signalCount} 個觀察訊號。數量無法說明方向或強度。`
                    )
                  : copy(
                      'The instrument appears in the public summary, but neither a condition score nor an observation count is supplied.',
                      '此標的出現在公開摘要中，但未提供條件分數或觀察訊號數量。'
                    ),
            bullish: copy(
              'Not provided by the source. A price or condition score alone cannot establish a bullish thesis.',
              '來源未提供。僅靠價格或條件分數，無法建立看多論點。'
            ),
            bearish: isMeme
              ? copy(
                  'Token address and independent liquidity proof are absent. The feed’s identity flag cannot be independently verified here.',
                  '未提供代幣地址及獨立流動性證據，無法在此獨立驗證摘要的身分標記。'
                )
              : publishedRisk && riskLabels[publishedRisk]
                ? copy(
                    `Publisher risk label: ${riskLabels[publishedRisk].en}. Its risk model and rule-level bearish evidence were not supplied. Conditions may have changed since publication.`,
                    `發布者的風險標記：${riskLabels[publishedRisk]['zh-TW']}。未提供風險模型及規則層級的看空證據；市場狀況可能已在發布後改變。`
                  )
                : copy(
                    'Rule-level bearish evidence is not supplied. Market conditions may have changed since the snapshot.',
                    '未提供規則層級的看空證據。市場狀況可能已在快照之後改變。'
                  ),
            invalidation:
              meta.id === 'spot' && historicalStop !== null && historicalStop > 0 && symbol.endsWith('USDT')
                ? copy(
                    `The summary records a historical stop reference of ${historicalStop} USDT. It does not supply the trigger rule, evaluation date or current plan validity. This archived reference is not a current order instruction.`,
                    `摘要記錄的歷史停損參考值為 ${historicalStop} USDT，但未提供觸發規則、計算日期或目前計畫的有效性。此封存參考值不是目前的下單指令。`
                  )
                : copy(
                    'No verified invalidation rule is published in this summary. Missing or stale evidence blocks a current conclusion; verify the original market before using this research.',
                    '此摘要未公布經驗證的失效規則。證據缺漏或過期時，不形成目前的市場結論；使用研究前請查證原始市場。'
                  ),
          },
        ];
      });
    return { ...meta, sourceTime, items };
  });
}

export function candleItem(
  symbol: 'BTC' | 'ETH',
  payload: unknown,
  mode: DataMode,
  evaluatedAt: string
): ResearchItem {
  const analysis = analyzeKraken(payload, evaluatedAt);
  const above = analysis.close > analysis.sma20;
  return {
    id: `kraken-${symbol}`,
    market: 'spot',
    symbol: `${symbol}/USD`,
    name: symbol === 'BTC' ? 'Bitcoin' : 'Ethereum',
    venue: copy('Kraken · spot · 1h', 'Kraken・現貨・1 小時'),
    price: analysis.close,
    quote: 'USD',
    score: null,
    signalCount: null,
    sourceTime: analysis.sourceTime,
    marketDate: null,
    evaluationTime: evaluatedAt,
    sourceUrl: `https://api.kraken.com/0/public/OHLC?pair=${symbol === 'BTC' ? 'XBTUSD' : 'ETHUSD'}&interval=60`,
    originalSource: true,
    mode,
    analysis,
    changePct: analysis.changePct,
    change: copy(
      `The last completed hourly close moved ${analysis.changePct >= 0 ? '+' : ''}${analysis.changePct.toFixed(2)}% from the prior candle. This is a candle comparison, not a change in an AIMarket thesis.`,
      `最後一根已完成小時 K 線收盤，較前一根變動 ${analysis.changePct >= 0 ? '+' : ''}${analysis.changePct.toFixed(2)}%。這是 K 線比較，不是 AIMarket 研究論點的變化。`
    ),
    why: copy(
      'A reproducible check of three conditions: close above the 20-hour moving average, a rising average, and close above the prior close. Each condition has equal weight.',
      '可重現的三項條件：收盤高於 20 小時均線、均線上升、收盤高於前一根收盤。每項條件權重相同。'
    ),
    bullish: above
      ? copy(
          'The completed close is above its 20-hour average. This supports the price-above-average condition only.',
          '已完成收盤高於 20 小時均線。這僅支持「價格高於均線」條件。'
        )
      : copy(
          'The price-above-average condition is not met. No bullish conclusion follows from this check.',
          '未符合價格高於均線的條件。此檢查不形成看多結論。'
        ),
    bearish: copy(
      'One hourly timeframe misses the larger trend, liquidity and news. A moving average can lag or repeatedly whipsaw.',
      '單一小時級別無法涵蓋大趨勢、流動性與新聞。均線可能落後，也可能反覆出現雜訊。'
    ),
    invalidation: copy(
      'A completed close on the other side of the 20-hour average reverses the price condition. A gap, invalid timestamp or candle age of two hours blocks a current reading.',
      '已完成收盤移至 20 小時均線另一側，價格條件即反轉。若 K 線缺漏、時間無效或資料已有兩小時，則停止目前判讀。'
    ),
  };
}

export const demoMarkets = normalizeOverview(rawDemo, 'demo');
export const demoCandles = [
  candleItem('BTC', btcDemo, 'demo', CANDLE_EVALUATED_AT),
  candleItem('ETH', ethDemo, 'demo', CANDLE_EVALUATED_AT),
];
