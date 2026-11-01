import React from 'react';

interface MarketAssetIconProps {
  symbol: string;
  baseAsset?: string;
  quoteAsset?: string;
  category?: 'CRYPTO' | 'METALS' | 'FOREX' | 'STOCKS' | string;
  size?: 'sm' | 'md' | 'lg';
}

export const MarketAssetIcon: React.FC<MarketAssetIconProps> = ({
  symbol,
  baseAsset,
  quoteAsset,
  size = 'md',
}) => {
  const base = (baseAsset || symbol.split('/')[0] || '').toUpperCase();
  const quote = (quoteAsset || symbol.split('/')[1] || 'USDT').toUpperCase();

  const dimensions =
    size === 'sm'
      ? 'w-7 h-7'
      : size === 'lg'
      ? 'w-10 h-10'
      : 'w-8 h-8';

  const renderSingleAssetSvg = (asset: string) => {
    switch (asset) {
      case 'BTC':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full">
            <circle cx="16" cy="16" r="16" fill="#F7931A" />
            <path
              fill="#FFF"
              d="M23.189 14.02c.314-2.096-1.283-3.223-3.465-3.975l.708-2.84-1.728-.43-.69 2.765c-.454-.114-.919-.22-1.385-.326l.695-2.783L15.596 6l-.708 2.839c-.376-.086-.746-.17-1.104-.26l.002-.009-2.384-.595-.46 1.846s1.283.294 1.256.312c.7.175.826.638.805 1.006l-.806 3.235c.048.012.11.03.18.057l-.183-.045-1.13 4.532c-.086.212-.303.531-.793.41l-1.257-.313-.852 1.978 2.25.561c.418.105.828.215 1.231.318l-.715 2.872 1.727.43.708-2.842c.472.127.93.245 1.378.357l-.706 2.828 1.728.43.715-2.866c2.948.558 5.164.333 6.097-2.333.752-2.146-.037-3.385-1.588-4.192 1.13-.26 1.98-.999 2.207-2.523zm-3.955 5.538c-.537 2.157-4.17 0.991-5.348.699l.954-3.825c1.178.294 4.956.879 4.394 3.126zm.535-5.568c-.49 1.964-3.521.966-4.503.722l.863-3.462c.982.244 4.151.699 3.64 2.74z"
            />
          </svg>
        );

      case 'ETH':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full">
            <circle cx="16" cy="16" r="16" fill="#627EEA" />
            <g fill="#FFF">
              <polygon fillOpacity="0.6" points="16.498,6 16.498,13.39 22.746,16.18" />
              <polygon points="16.498,6 10.25,16.18 16.498,13.39" />
              <polygon fillOpacity="0.6" points="16.498,20.974 16.498,25.996 22.75,17.342" />
              <polygon points="16.498,25.996 16.498,20.973 10.25,17.342" />
              <polygon fillOpacity="0.2" points="16.498,19.812 22.746,16.18 16.498,13.39" />
              <polygon fillOpacity="0.6" points="10.25,16.18 16.498,19.812 16.498,13.39" />
            </g>
          </svg>
        );

      case 'SOL':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full">
            <defs>
              <linearGradient id="solGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#9945FF" />
                <stop offset="100%" stopColor="#14F195" />
              </linearGradient>
            </defs>
            <circle cx="16" cy="16" r="16" fill="#111622" />
            <circle cx="16" cy="16" r="15" fill="none" stroke="url(#solGrad)" strokeOpacity="0.4" strokeWidth="1" />
            <g fill="url(#solGrad)">
              <path d="M9.9 20.4c.2-.2.5-.3.8-.3h12.6c.5 0 .8.6.4 1l-2.1 2.1c-.2.2-.5.3-.8.3H8.2c-.5 0-.8-.6-.4-1l2.1-2.1z" />
              <path d="M9.9 8.8c.2-.2.5-.3.8-.3h12.6c.5 0 .8.6.4 1l-2.1 2.1c-.2.2-.5.3-.8.3H8.2c-.5 0-.8-.6-.4-1l2.1-2.1z" />
              <path d="M22.1 14.5c-.2-.2-.5-.3-.8-.3H8.7c-.5 0-.8.6-.4 1l2.1 2.1c.2.2.5.3.8.3h12.6c.5 0 .8-.6.4-1l-2.1-2.1z" />
            </g>
          </svg>
        );

      case 'BNB':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full">
            <circle cx="16" cy="16" r="16" fill="#F3BA2F" />
            <path
              fill="#FFF"
              d="M12.116 14.404L16 10.52l3.886 3.886 2.26-2.26L16 6l-6.144 6.144 2.26 2.26zM6 16l2.26-2.26L10.52 16l-2.26 2.26L6 16zm6.116 1.596L16 21.48l3.886-3.886 2.26 2.259L16 26l-6.144-6.144-.003-.003 2.263-2.257zM21.48 16l2.26-2.26L26 16l-2.26 2.26L21.48 16zm-3.188-.002h.002L16 13.706 14.305 15.4l-.6.6 2.295 2.294 2.293-2.293-.001-.003z"
            />
          </svg>
        );

      case 'XRP':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full">
            <circle cx="16" cy="16" r="16" fill="#23292F" />
            <path
              fill="#FFF"
              d="M21.7 8h2.6l-5.4 5.3c-1.6 1.6-4.2 1.6-5.8 0L7.7 8h2.6l4.1 4c.9.9 2.3.9 3.2 0L21.7 8zm2.6 16h-2.6l-4.1-4c-.9-.9-2.3-.9-3.2 0l-4.1 4H7.7l5.4-5.3c1.6-1.6 4.2-1.6 5.8 0L24.3 24z"
            />
          </svg>
        );

      case 'XAU':
      case 'PAXG':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full">
            <defs>
              <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FDE047" />
                <stop offset="50%" stopColor="#EAB308" />
                <stop offset="100%" stopColor="#A16207" />
              </linearGradient>
            </defs>
            <circle cx="16" cy="16" r="16" fill="url(#goldGrad)" />
            <polygon points="10,21 22,21 19.5,12 12.5,12" fill="#1C1917" fillOpacity="0.85" />
            <text
              x="16"
              y="18.5"
              textAnchor="middle"
              fill="#FDE047"
              fontSize="7.5"
              fontWeight="800"
              fontFamily="monospace"
            >
              {asset === 'PAXG' ? 'PAX' : 'Au'}
            </text>
          </svg>
        );

      case 'XAG':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full">
            <defs>
              <linearGradient id="silverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F1F5F9" />
                <stop offset="50%" stopColor="#94A3B8" />
                <stop offset="100%" stopColor="#475569" />
              </linearGradient>
            </defs>
            <circle cx="16" cy="16" r="16" fill="url(#silverGrad)" />
            <polygon points="10,21 22,21 19.5,12 12.5,12" fill="#0F172A" fillOpacity="0.85" />
            <text
              x="16"
              y="18.5"
              textAnchor="middle"
              fill="#F8FAFC"
              fontSize="7.5"
              fontWeight="800"
              fontFamily="monospace"
            >
              Ag
            </text>
          </svg>
        );

      case 'XPT':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full">
            <circle cx="16" cy="16" r="16" fill="#334155" />
            <circle cx="16" cy="16" r="14.5" fill="none" stroke="#94A3B8" strokeWidth="1.2" />
            <text
              x="16"
              y="19.5"
              textAnchor="middle"
              fill="#F8FAFC"
              fontSize="10"
              fontWeight="800"
              fontFamily="monospace"
            >
              Pt
            </text>
          </svg>
        );

      case 'NVDA':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full">
            <circle cx="16" cy="16" r="16" fill="#76B900" />
            <path
              d="M8.5 16c2.5-4.2 6.8-5.5 11.2-3.8 1.9.7 3.4 2.1 4.3 3.8-1.5 2.7-4.2 4.4-7.4 4.6-3.4.2-6.3-1.5-8.1-4.6z"
              fill="none"
              stroke="#FFF"
              strokeWidth="2.2"
            />
            <circle cx="16" cy="16" r="2.3" fill="#FFF" />
          </svg>
        );

      case 'AAPL':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full">
            <circle cx="16" cy="16" r="16" fill="#1E293B" />
            <path
              fill="#FFF"
              d="M20.3 16.9c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3-1.7-1.3-.1-2.5.8-3.1.8-.6 0-1.6-.8-2.7-.7-1.4 0-2.7.8-3.4 2-1.5 2.5-.4 6.2 1 8.2.7 1 1.5 2.1 2.6 2.1 1 0 1.4-.7 2.7-.7 1.2 0 1.6.7 2.7.7 1.1 0 1.8-1 2.5-2 .8-1.1 1.1-2.2 1.1-2.3-.1 0-2.2-.8-2.2-3.2zm-2-5.9c.6-.7 1-1.7.9-2.7-.9 0-1.9.6-2.5 1.3-.5.6-1 1.6-.9 2.6 1 .1 1.9-.5 2.5-1.2z"
            />
          </svg>
        );

      case 'MSFT':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full">
            <circle cx="16" cy="16" r="16" fill="#1E293B" />
            <rect x="9" y="9" width="6.3" height="6.3" fill="#F25022" rx="0.8" />
            <rect x="16.7" y="9" width="6.3" height="6.3" fill="#7FBA00" rx="0.8" />
            <rect x="9" y="16.7" width="6.3" height="6.3" fill="#00A4EF" rx="0.8" />
            <rect x="16.7" y="16.7" width="6.3" height="6.3" fill="#FFB900" rx="0.8" />
          </svg>
        );

      case 'TSLA':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full">
            <circle cx="16" cy="16" r="16" fill="#E82127" />
            <path
              fill="#FFF"
              d="M16 24.5l2.2-12.2c2.1 0 2.8.2 2.9 1.1 0 0 1.4-.5 2.1-1.6-2.7-1.2-5.4-1.3-5.4-1.3L16 12.4l-1.8-1.9s-2.7.1-5.4 1.3c.7 1.1 2.1 1.6 2.1 1.6.1-.9.8-1.1 2.9-1.1L16 24.5zm0-14.8c2.9 0 5.8.5 8 1.5.4-.7.5-1 .5-1-2.6-1-5.5-1.5-8.5-1.5s-5.9.5-8.5 1.5c0 0 .1.3.5 1 2.2-1 5.1-1.5 8-1.5z"
            />
          </svg>
        );

      case 'AMZN':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full">
            <circle cx="16" cy="16" r="16" fill="#1E293B" />
            <text
              x="16"
              y="18.5"
              textAnchor="middle"
              fill="#FFF"
              fontSize="12"
              fontWeight="900"
              fontFamily="sans-serif"
            >
              a
            </text>
            <path
              d="M9.5 21.5c3.8 2.6 9.2 2.6 13 0"
              fill="none"
              stroke="#FF9900"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M21 20.3l2.2.8-.6 2.2"
              fill="none"
              stroke="#FF9900"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );

      case 'EUR':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full">
            <circle cx="16" cy="16" r="16" fill="#003399" />
            <text
              x="16"
              y="21.5"
              textAnchor="middle"
              fill="#FFCC00"
              fontSize="16"
              fontWeight="800"
              fontFamily="sans-serif"
            >
              €
            </text>
          </svg>
        );

      case 'GBP':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full">
            <circle cx="16" cy="16" r="16" fill="#012169" />
            <text
              x="16"
              y="21.5"
              textAnchor="middle"
              fill="#FFF"
              fontSize="16"
              fontWeight="800"
              fontFamily="sans-serif"
            >
              £
            </text>
          </svg>
        );

      case 'USD':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full">
            <circle cx="16" cy="16" r="16" fill="#0F766E" />
            <text
              x="16"
              y="21.5"
              textAnchor="middle"
              fill="#FFF"
              fontSize="15"
              fontWeight="800"
              fontFamily="monospace"
            >
              $
            </text>
          </svg>
        );

      case 'USDT':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full">
            <circle cx="16" cy="16" r="16" fill="#26A17B" />
            <path
              fill="#FFF"
              d="M17.922 17.383v-.002c-.11.008-.677.042-1.942.042-1.01 0-1.721-.03-1.971-.042v.003c-3.888-.171-6.79-.848-6.79-1.658 0-.809 2.902-1.486 6.79-1.66v2.644c.254.018.982.061 1.988.061 1.207 0 1.812-.05 1.925-.06v-2.643c3.88.173 6.775.85 6.775 1.658 0 .81-2.895 1.485-6.775 1.657m0-3.59v-2.366h5.414V7.819H8.595v3.608h5.414v2.365c-4.4.202-7.709 1.074-7.709 2.118 0 1.044 3.309 1.915 7.709 2.118v7.582h3.913v-7.584c4.393-.202 7.694-1.073 7.694-2.116 0-1.043-3.301-1.914-7.694-2.117"
            />
          </svg>
        );

      case 'JPY':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full">
            <circle cx="16" cy="16" r="16" fill="#BC002D" />
            <text
              x="16"
              y="21.5"
              textAnchor="middle"
              fill="#FFF"
              fontSize="15"
              fontWeight="800"
              fontFamily="sans-serif"
            >
              ¥
            </text>
          </svg>
        );

      case 'AUD':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full">
            <circle cx="16" cy="16" r="16" fill="#0284C7" />
            <text
              x="16"
              y="20"
              textAnchor="middle"
              fill="#FFF"
              fontSize="10.5"
              fontWeight="800"
              fontFamily="monospace"
            >
              A$
            </text>
          </svg>
        );

      case 'CAD':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full">
            <circle cx="16" cy="16" r="16" fill="#DC2626" />
            <text
              x="16"
              y="20"
              textAnchor="middle"
              fill="#FFF"
              fontSize="10.5"
              fontWeight="800"
              fontFamily="monospace"
            >
              C$
            </text>
          </svg>
        );

      default:
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full">
            <circle cx="16" cy="16" r="16" fill="#334155" />
            <text
              x="16"
              y="20"
              textAnchor="middle"
              fill="#FFF"
              fontSize="10"
              fontWeight="800"
              fontFamily="monospace"
            >
              {asset.slice(0, 3)}
            </text>
          </svg>
        );
    }
  };

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${dimensions}`}>
      {/* Primary Base Asset Emblem */}
      <div className="w-full h-full rounded-full overflow-hidden shadow-sm ring-1 ring-white/10">
        {renderSingleAssetSvg(base)}
      </div>

      {/* Quote Asset Mini Badge (Pro Exchange Pair Style) */}
      {quote && (
        <div
          className="absolute -bottom-0.5 -right-1 w-4 h-4 rounded-full overflow-hidden ring-2 ring-[#181D27] shadow-sm"
          title={quote}
        >
          {renderSingleAssetSvg(quote)}
        </div>
      )}
    </div>
  );
};
