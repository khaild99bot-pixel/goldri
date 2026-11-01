/**
 * GOLDRIX Institutional Financial Trading Emblem & Client ID Formatter
 * Precision Japanese Candlesticks & Bullish Market Breakout Vector Mark
 */

import React from 'react';

interface GoldrixLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  subtitleText?: string;
  isLight?: boolean;
}

/**
 * Formats any user ID into a clean, 6-digit numeric Client ID (الايدي)
 * If the ID is already numeric (e.g. "842915"), returns it directly.
 * If it is a legacy string ID (e.g. "usr_admin_chief"), maps it deterministically to a 6-digit number.
 */
export function formatClientId(rawId?: string): string {
  if (!rawId) return '100000';
  if (/^\d{5,8}$/.test(rawId)) return rawId;
  if (rawId === 'usr_admin_chief') return '100001';
  if (rawId === 'usr_admin_01') return '100002';
  if (rawId === 'usr_compliance_01') return '100003';
  if (rawId === 'usr_investor_01') return '100240';

  // Deterministic 6-digit hash for any other string ID
  let hash = 0;
  for (let i = 0; i < rawId.length; i++) {
    hash = (hash * 31 + rawId.charCodeAt(i)) % 900000;
  }
  const num = Math.abs(hash) + 100000;
  return String(num).slice(0, 6);
}

/**
 * Cleans up any legacy @phone.goldrix.io placeholder email so phone-registered accounts never show a fake email
 */
export function formatDisplayEmail(email?: string): string {
  if (!email) return '';
  if (email.endsWith('@phone.goldrix.io')) return '';
  return email;
}

export const GoldrixLogo: React.FC<GoldrixLogoProps> = ({
  size = 'md',
  showSubtitle = true,
  subtitleText = 'GLOBAL TRADING',
  isLight = false,
}) => {
  const dimensions =
    size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-11 h-11' : 'w-9 h-9';
  const svgSize =
    size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-7 h-7' : 'w-6 h-6';
  const titleSize =
    size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-[15px]';

  return (
    <div className="inline-flex items-center gap-2.5 select-none">
      {/* Institutional Japanese Candlesticks & Bullish Market Breakout Emblem */}
      <div
        className={`relative ${dimensions} shrink-0 rounded-xl bg-gradient-to-br from-[#0B1522] via-[#070B12] to-[#0B1C17] border border-amber-500/45 flex items-center justify-center shadow-md shadow-emerald-500/10`}
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={svgSize}
        >
          <defs>
            <linearGradient id="gx_gold_candle" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
            <linearGradient id="gx_emerald_candle" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="gx_trend_arrow" x1="4" y1="24" x2="28" y2="6" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="50%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
          </defs>

          {/* Subtle Inner Chart Frame */}
          <rect
            x="2.5"
            y="2.5"
            width="27"
            height="27"
            rx="6.5"
            stroke="#1E293B"
            strokeWidth="1"
          />

          {/* Candle 1 (Left - Gold Bullion Support Candle) */}
          <line x1="8.5" y1="15.5" x2="8.5" y2="25.5" stroke="#F59E0B" strokeWidth="1.4" strokeLinecap="round" />
          <rect x="6.7" y="18" width="3.6" height="5.2" rx="1" fill="url(#gx_gold_candle)" />

          {/* Candle 2 (Center - Gold Accumulation Candle) */}
          <line x1="15.5" y1="12" x2="15.5" y2="23.5" stroke="#FBBF24" strokeWidth="1.4" strokeLinecap="round" />
          <rect x="13.7" y="14.5" width="3.6" height="6.5" rx="1" fill="url(#gx_gold_candle)" />

          {/* Candle 3 (Right - Emerald Bullish Breakout Candle) */}
          <line x1="22.5" y1="7.5" x2="22.5" y2="20.5" stroke="#34D399" strokeWidth="1.5" strokeLinecap="round" />
          <rect x="20.7" y="10" width="3.6" height="8" rx="1" fill="url(#gx_emerald_candle)" />

          {/* Dynamic Ascending Trading Trend Line & Arrowhead */}
          <path
            d="M5.5 16.5L12 11.5L16.2 13.5L25.5 6.2"
            stroke="url(#gx_trend_arrow)"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M21.5 6.2H25.5V10.2"
            stroke="#34D399"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Clean Modern Brand Wordmark */}
      <div className="flex flex-col text-left rtl:text-right leading-none">
        <div className="flex items-center gap-1">
          <span
            className={`${titleSize} font-black tracking-wider uppercase font-mono ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}
          >
            GOLD<span className="text-emerald-400">RIX</span>
          </span>
        </div>
        {showSubtitle && (
          <span className="text-[9px] font-mono tracking-[0.14em] text-neutral-400 font-bold mt-0.5 uppercase">
            {subtitleText}
          </span>
        )}
      </div>
    </div>
  );
};
