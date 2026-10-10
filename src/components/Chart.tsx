import { useId } from 'react';
import type { CandleAnalysis, Locale } from '../lib/market';
import { number, sma } from '../lib/market';

export default function Chart({
  analysis,
  locale,
  detailed = false,
}: {
  analysis: CandleAnalysis;
  locale: Locale;
  detailed?: boolean;
}) {
  const id = useId().replaceAll(':', '');
  const candles = analysis.candles.slice(-48);
  const width = 640;
  const height = detailed ? 240 : 160;
  const padding = 8;
  const plotWidth = width - 64;
  const min = Math.min(...candles.map((c) => c.low)) * 0.999;
  const max = Math.max(...candles.map((c) => c.high)) * 1.001;
  const y = (n: number) => padding + (1 - (n - min) / (max - min)) * (height - padding * 2);
  const x = (n: number) => padding + (n * (plotWidth - padding * 2)) / (candles.length - 1);
  const points = candles.map((c, i) => `${x(i)},${y(c.close)}`).join(' ');
  const offset = analysis.candles.length - candles.length;
  const avgPoints = candles
    .flatMap((_, i) => {
      const index = offset + i;
      if (index < 19) return [];
      return [
        `${x(i)},${y(
          sma(
            analysis.candles.slice(0, index + 1).map((c) => c.close),
            20
          )
        )}`,
      ];
    })
    .join(' ');
  return (
    <svg
      className="market-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={
        locale === 'en'
          ? `48 completed hourly candles. Last close ${number(analysis.close, locale)} USD. Dashed line: 20-hour simple moving average.`
          : `48 根已完成小時 K 線。最後收盤 ${number(analysis.close, locale)} 美元。虛線為 20 小時簡單移動平均。`
      }
    >
      <defs>
        <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9bd772" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#9bd772" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <line
            x1="0"
            x2={plotWidth}
            y1={padding + (i * (height - padding * 2)) / 3}
            y2={padding + (i * (height - padding * 2)) / 3}
            className="chart-grid"
          />
          <text
            x={width - 2}
            y={padding + (i * (height - padding * 2)) / 3 + 4}
            textAnchor="end"
            className="chart-axis"
          >
            {number(max - (i * (max - min)) / 3, locale, 0)}
          </text>
        </g>
      ))}
      <polygon
        points={`${x(0)},${height} ${points} ${x(candles.length - 1)},${height}`}
        fill={`url(#fill-${id})`}
      />
      {candles.map((c, i) => (
        <g key={c.time} className={c.close >= c.open ? 'candle-up' : 'candle-down'}>
          <line x1={x(i)} x2={x(i)} y1={y(c.high)} y2={y(c.low)} strokeWidth="1" />
          <rect
            x={x(i) - 2.6}
            y={Math.min(y(c.open), y(c.close))}
            width="5.2"
            height={Math.max(1.5, Math.abs(y(c.open) - y(c.close)))}
          />
        </g>
      ))}
      <polyline
        points={avgPoints}
        className="average-line"
        fill="none"
        strokeWidth="1.7"
        strokeDasharray="5 4"
      />
    </svg>
  );
}
