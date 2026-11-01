/**
 * GOLDRIX Japanese Candlestick Chart Component
 * Non-overlapping, high-performance SVG candlestick visualization with MA(10)/MA(20) overlays,
 * volume histogram, and mobile-friendly OHLC stats.
 */

import React, { useState, useMemo } from 'react';
import { Candle } from '../../types/index.ts';

interface CandlestickChartProps {
  candles: Candle[];
  height?: number;
  symbol?: string;
  showMA?: boolean;
  showVolume?: boolean;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  candles = [],
  height = 250,
  symbol = 'BTC/USDT',
  showMA = true,
  showVolume = true,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [timeframe, setTimeframe] = useState<'1H' | '4H' | '1D' | '1W'>('1H');
  const [enableMA, setEnableMA] = useState(showMA);

  // 24 clean, spaced candles so they never overlap on mobile
  const displayCandles = useMemo(() => {
    if (!candles || candles.length === 0) return [];
    if (timeframe === '4H') {
      const filtered = candles.filter((_, idx) => idx % 4 === 0);
      return filtered.slice(-24);
    }
    if (timeframe === '1D') {
      const filtered = candles.filter((_, idx) => idx % 6 === 0);
      return filtered.slice(-24);
    }
    if (timeframe === '1W') {
      const filtered = candles.filter((_, idx) => idx % 12 === 0);
      return filtered.slice(-24);
    }
    return candles.slice(-24);
  }, [candles, timeframe]);

  const activeCandle =
    hoverIndex !== null && displayCandles[hoverIndex]
      ? displayCandles[hoverIndex]
      : displayCandles[displayCandles.length - 1];

  // Min and max for chart scaling
  const { minPrice, maxPrice, maxVolume } = useMemo(() => {
    if (displayCandles.length === 0) {
      return { minPrice: 0, maxPrice: 100, maxVolume: 100 };
    }
    let min = Infinity;
    let max = -Infinity;
    let volMax = 0;
    for (const c of displayCandles) {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
      if (c.volume > volMax) volMax = c.volume;
    }
    const pad = (max - min) * 0.1 || 1;
    return {
      minPrice: Math.max(0, min - pad),
      maxPrice: max + pad,
      maxVolume: volMax * 1.3 || 10,
    };
  }, [displayCandles]);

  // Moving Average 10 calculation
  const ma10 = useMemo(() => {
    const period = 6;
    return displayCandles.map((_, i, arr) => {
      if (i < period - 1) return null;
      const slice = arr.slice(i - period + 1, i + 1);
      return slice.reduce((sum, item) => sum + item.close, 0) / period;
    });
  }, [displayCandles]);

  // Moving Average 20 calculation
  const ma20 = useMemo(() => {
    const period = 12;
    return displayCandles.map((_, i, arr) => {
      if (i < period - 1) return null;
      const slice = arr.slice(i - period + 1, i + 1);
      return slice.reduce((sum, item) => sum + item.close, 0) / period;
    });
  }, [displayCandles]);

  const chartWidth = 600;
  const rightGutter = 55;
  const plotWidth = chartWidth - rightGutter;
  const candleCount = displayCandles.length || 1;
  const slotWidth = plotWidth / candleCount;
  const candleBodyWidth = Math.max(8, Math.min(16, slotWidth * 0.55));

  const priceHeight = showVolume ? height * 0.74 : height;
  const volumeHeight = height * 0.22;

  const getY = (val: number) => {
    if (maxPrice === minPrice) return priceHeight / 2;
    return priceHeight - ((val - minPrice) / (maxPrice - minPrice)) * (priceHeight - 24) - 12;
  };

  const getVolY = (vol: number) => {
    if (maxVolume === 0) return height;
    const barH = (vol / maxVolume) * volumeHeight;
    return height - barH;
  };

  // Build MA SVG Paths
  const ma10Path = useMemo(() => {
    let p = '';
    ma10.forEach((val, i) => {
      if (val === null) return;
      const x = i * slotWidth + slotWidth / 2;
      const y = getY(val);
      if (!p) p = `M ${x} ${y}`;
      else p += ` L ${x} ${y}`;
    });
    return p;
  }, [ma10, slotWidth, minPrice, maxPrice]);

  const ma20Path = useMemo(() => {
    let p = '';
    ma20.forEach((val, i) => {
      if (val === null) return;
      const x = i * slotWidth + slotWidth / 2;
      const y = getY(val);
      if (!p) p = `M ${x} ${y}`;
      else p += ` L ${x} ${y}`;
    });
    return p;
  }, [ma20, slotWidth, minPrice, maxPrice]);

  const priceTicks = [
    maxPrice - (maxPrice - minPrice) * 0.08,
    maxPrice - (maxPrice - minPrice) * 0.45,
    maxPrice - (maxPrice - minPrice) * 0.85,
  ];

  return (
    <div className="w-full flex flex-col bg-neutral-950/70 rounded-xl border border-neutral-800 p-3 sm:p-4">
      {/* 1. Header controls (Symbol, Timeframe, MA indicator toggle) */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-neutral-800/80">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white text-xs sm:text-sm tracking-tight">{symbol}</span>
          <div className="flex items-center gap-0.5 p-0.5 bg-neutral-900 rounded-lg border border-neutral-800">
            {(['1H', '4H', '1D', '1W'] as const).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-0.5 text-[11px] font-semibold rounded-md transition-colors ${
                  timeframe === tf
                    ? 'bg-neutral-800 text-emerald-400 shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setEnableMA(!enableMA)}
          className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
            enableMA
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-neutral-900 border-neutral-800 text-neutral-500'
          }`}
        >
          MA(10/20)
        </button>
      </div>

      {/* 2. Compact single-row OHLC statistics */}
      {activeCandle && (
        <div className="flex items-center gap-3 py-1.5 border-b border-neutral-800/50 text-[10px] sm:text-[11px] font-mono tabular-nums text-neutral-400 overflow-x-auto whitespace-nowrap scrollbar-none">
          <div>
            <span className="text-neutral-400 mr-0.5">O:</span>
            <span className="text-neutral-200 font-medium">${activeCandle.open.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-neutral-400 mr-0.5">H:</span>
            <span className="text-emerald-400 font-medium">${activeCandle.high.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-neutral-400 mr-0.5">L:</span>
            <span className="text-rose-400 font-medium">${activeCandle.low.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-neutral-400 mr-0.5">C:</span>
            <span
              className={`font-semibold ${
                activeCandle.close >= activeCandle.open ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              ${activeCandle.close.toLocaleString()}
            </span>
          </div>
          {showVolume && (
            <div className="hidden sm:block">
              <span className="text-neutral-400 mr-0.5">Vol:</span>
              <span className="text-neutral-300 font-medium">{activeCandle.volume.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}

      {/* 3. Non-overlapping Japanese Candlestick SVG Canvas */}
      <div className="relative w-full overflow-hidden mt-2" style={{ height: `${height}px` }}>
        <svg
          viewBox={`0 0 ${chartWidth} ${height}`}
          className="w-full h-full select-none"
          preserveAspectRatio="none"
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* Horizontal Grid lines */}
          {priceTicks.map((tick, i) => {
            const y = getY(tick);
            return (
              <g key={i}>
                <line
                  x1="0"
                  y1={y}
                  x2={plotWidth}
                  y2={y}
                  stroke="#1f242e"
                  strokeWidth="1"
                  strokeDasharray="2 3"
                />
                <text
                  x={chartWidth - 4}
                  y={y + 3}
                  fill="#71717a"
                  fontSize="9"
                  textAnchor="end"
                  className="font-mono tabular-nums"
                >
                  ${tick.toFixed(tick < 10 ? 3 : 1)}
                </text>
              </g>
            );
          })}

          {/* Volume Separator */}
          {showVolume && (
            <line
              x1="0"
              y1={height - volumeHeight - 4}
              x2={plotWidth}
              y2={height - volumeHeight - 4}
              stroke="#1f242e"
              strokeWidth="1"
            />
          )}

          {/* Volume Histogram Bars */}
          {showVolume &&
            displayCandles.map((c, i) => {
              const isBull = c.close >= c.open;
              const x = i * slotWidth + (slotWidth - candleBodyWidth) / 2;
              const y = getVolY(c.volume);
              const barH = height - y;
              return (
                <rect
                  key={`vol_${i}`}
                  x={x}
                  y={y}
                  width={candleBodyWidth}
                  height={barH}
                  fill={isBull ? '#059669' : '#e11d48'}
                  opacity={hoverIndex === i ? 0.8 : 0.35}
                />
              );
            })}

          {/* Candlesticks (Wick & Body) */}
          {displayCandles.map((c, i) => {
            const isBull = c.close >= c.open;
            const xCenter = i * slotWidth + slotWidth / 2;
            const xBody = i * slotWidth + (slotWidth - candleBodyWidth) / 2;

            const yHigh = getY(c.high);
            const yLow = getY(c.low);
            const yOpen = getY(c.open);
            const yClose = getY(c.close);

            const bodyTop = Math.min(yOpen, yClose);
            const bodyHeight = Math.max(3, Math.abs(yClose - yOpen));
            const color = isBull ? '#10b981' : '#f43f5e';

            return (
              <g
                key={`candle_${i}`}
                className="cursor-crosshair"
                onMouseEnter={() => setHoverIndex(i)}
                onTouchStart={() => setHoverIndex(i)}
              >
                <line
                  x1={xCenter}
                  y1={yHigh}
                  x2={xCenter}
                  y2={yLow}
                  stroke={color}
                  strokeWidth="1.4"
                  opacity={hoverIndex === i ? 1 : 0.9}
                />
                <rect
                  x={xBody}
                  y={bodyTop}
                  width={candleBodyWidth}
                  height={bodyHeight}
                  fill={color}
                  rx="1.5"
                  opacity={hoverIndex === i ? 1 : 0.95}
                />
              </g>
            );
          })}

          {/* Moving Average 10 Line */}
          {enableMA && ma10Path && (
            <path
              d={ma10Path}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.85"
            />
          )}

          {/* Moving Average 20 Line */}
          {enableMA && ma20Path && (
            <path
              d={ma20Path}
              fill="none"
              stroke="#34d399"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.85"
            />
          )}

          {/* Crosshair on active candle */}
          {hoverIndex !== null && (
            <g>
              <line
                x1={hoverIndex * slotWidth + slotWidth / 2}
                y1="0"
                x2={hoverIndex * slotWidth + slotWidth / 2}
                y2={height}
                stroke="#64748b"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <line
                x1="0"
                y1={getY(displayCandles[hoverIndex]?.close || 0)}
                x2={plotWidth}
                y2={getY(displayCandles[hoverIndex]?.close || 0)}
                stroke="#64748b"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
