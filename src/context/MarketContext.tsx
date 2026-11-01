/**
 * GOLDRIX Live Market Data Context
 * Supports 4 Market Categories:
 * - CRYPTO (عملات مشفرة)
 * - METALS (معادن)
 * - FOREX (فوركس)
 * - STOCKS (أسهم)
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api.ts';
import { Candle } from '../types/index.ts';

export type MarketCategory = 'ALL' | 'CRYPTO' | 'METALS' | 'FOREX' | 'STOCKS';

export interface ExtendedMarketTicker {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  category: 'CRYPTO' | 'METALS' | 'FOREX' | 'STOCKS';
  nameAr: string;
  nameEn: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  lastUpdated?: string;
  candles: Candle[];
}

interface MarketContextType {
  tickers: Record<string, ExtendedMarketTicker>;
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
  activeTicker: ExtendedMarketTicker | null;
  refreshMarkets: () => Promise<void>;
  isLoading: boolean;
}

function generateCandles(basePrice: number, volatilityPct: number = 0.008): Candle[] {
  const candles: Candle[] = [];
  const nowSec = Math.floor(Date.now() / 1000);
  let price = basePrice * (1 - volatilityPct * 4);

  for (let i = 40; i >= 0; i--) {
    const time = nowSec - i * 900;
    const delta = (Math.sin(i * 0.7) * 0.6 + (Math.random() - 0.46)) * basePrice * volatilityPct;
    const open = Number(price.toFixed(basePrice < 10 ? 4 : 2));
    const close = Number(Math.max(basePrice * 0.5, open + delta).toFixed(basePrice < 10 ? 4 : 2));
    const high = Number((Math.max(open, close) + Math.abs(delta) * 0.55).toFixed(basePrice < 10 ? 4 : 2));
    const low = Number((Math.min(open, close) - Math.abs(delta) * 0.45).toFixed(basePrice < 10 ? 4 : 2));
    const volume = Math.round(1200 + Math.random() * 4500);
    candles.push({ time, open, high, low, close, volume });
    price = close;
  }
  return candles;
}

const INITIAL_GLOBAL_INSTRUMENTS: Omit<ExtendedMarketTicker, 'candles'>[] = [
  // 1. CRYPTO (عملات مشفرة)
  {
    symbol: 'BTC/USDT',
    baseAsset: 'BTC',
    quoteAsset: 'USDT',
    category: 'CRYPTO',
    nameAr: 'بيتكوين',
    nameEn: 'Bitcoin',
    price: 89420.50,
    change24h: 2.84,
    high24h: 90150.00,
    low24h: 86900.00,
    volume24h: 34210,
  },
  {
    symbol: 'ETH/USDT',
    baseAsset: 'ETH',
    quoteAsset: 'USDT',
    category: 'CRYPTO',
    nameAr: 'إيثيريوم',
    nameEn: 'Ethereum',
    price: 3185.40,
    change24h: 1.92,
    high24h: 3240.00,
    low24h: 3095.00,
    volume24h: 185400,
  },
  {
    symbol: 'SOL/USDT',
    baseAsset: 'SOL',
    quoteAsset: 'USDT',
    category: 'CRYPTO',
    nameAr: 'سولانا',
    nameEn: 'Solana',
    price: 194.65,
    change24h: 4.35,
    high24h: 198.80,
    low24h: 185.20,
    volume24h: 642000,
  },
  {
    symbol: 'BNB/USDT',
    baseAsset: 'BNB',
    quoteAsset: 'USDT',
    category: 'CRYPTO',
    nameAr: 'بينانس كوين',
    nameEn: 'BNB',
    price: 638.20,
    change24h: 1.15,
    high24h: 645.00,
    low24h: 628.50,
    volume24h: 94200,
  },
  {
    symbol: 'XRP/USDT',
    baseAsset: 'XRP',
    quoteAsset: 'USDT',
    category: 'CRYPTO',
    nameAr: 'ريبل',
    nameEn: 'Ripple',
    price: 2.46,
    change24h: 3.60,
    high24h: 2.54,
    low24h: 2.35,
    volume24h: 18400000,
  },

  // 2. METALS (معادن)
  {
    symbol: 'XAU/USD',
    baseAsset: 'XAU',
    quoteAsset: 'USD',
    category: 'METALS',
    nameAr: 'الذهب العالمي (أونصة)',
    nameEn: 'Spot Gold (Oz)',
    price: 2918.40,
    change24h: 1.18,
    high24h: 2932.00,
    low24h: 2884.50,
    volume24h: 148500,
  },
  {
    symbol: 'XAG/USD',
    baseAsset: 'XAG',
    quoteAsset: 'USD',
    category: 'METALS',
    nameAr: 'الفضة العالمية (أونصة)',
    nameEn: 'Spot Silver (Oz)',
    price: 32.84,
    change24h: 1.64,
    high24h: 33.25,
    low24h: 32.10,
    volume24h: 420000,
  },
  {
    symbol: 'XPT/USD',
    baseAsset: 'XPT',
    quoteAsset: 'USD',
    category: 'METALS',
    nameAr: 'البلاتين الفوري',
    nameEn: 'Spot Platinum',
    price: 986.50,
    change24h: 0.74,
    high24h: 995.00,
    low24h: 976.20,
    volume24h: 41200,
  },
  {
    symbol: 'PAXG/USDT',
    baseAsset: 'PAXG',
    quoteAsset: 'USDT',
    category: 'METALS',
    nameAr: 'الذهب الرقمي الموثق',
    nameEn: 'PAX Gold',
    price: 2921.10,
    change24h: 1.21,
    high24h: 2935.00,
    low24h: 2888.00,
    volume24h: 28400,
  },

  // 3. FOREX (فوركس)
  {
    symbol: 'EUR/USD',
    baseAsset: 'EUR',
    quoteAsset: 'USD',
    category: 'FOREX',
    nameAr: 'اليورو / الدولار الأمريكي',
    nameEn: 'Euro / US Dollar',
    price: 1.0842,
    change24h: 0.34,
    high24h: 1.0875,
    low24h: 1.0801,
    volume24h: 92500000,
  },
  {
    symbol: 'GBP/USD',
    baseAsset: 'GBP',
    quoteAsset: 'USD',
    category: 'FOREX',
    nameAr: 'الجنيه الإسترليني / الدولار',
    nameEn: 'British Pound / USD',
    price: 1.2918,
    change24h: 0.48,
    high24h: 1.2960,
    low24h: 1.2855,
    volume24h: 64100000,
  },
  {
    symbol: 'USD/JPY',
    baseAsset: 'USD',
    quoteAsset: 'JPY',
    category: 'FOREX',
    nameAr: 'الدولار / الين الياباني',
    nameEn: 'US Dollar / Japanese Yen',
    price: 149.35,
    change24h: -0.28,
    high24h: 150.12,
    low24h: 148.80,
    volume24h: 810000,
  },
  {
    symbol: 'AUD/USD',
    baseAsset: 'AUD',
    quoteAsset: 'USD',
    category: 'FOREX',
    nameAr: 'الدولار الأسترالي / الأمريكي',
    nameEn: 'Australian Dollar / USD',
    price: 0.6384,
    change24h: 0.52,
    high24h: 0.6412,
    low24h: 0.6340,
    volume24h: 48200000,
  },
  {
    symbol: 'USD/CAD',
    baseAsset: 'USD',
    quoteAsset: 'CAD',
    category: 'FOREX',
    nameAr: 'الدولار الأمريكي / الكندي',
    nameEn: 'US Dollar / Canadian Dollar',
    price: 1.4185,
    change24h: -0.19,
    high24h: 1.4230,
    low24h: 1.4150,
    volume24h: 51400000,
  },

  // 4. STOCKS (أسهم)
  {
    symbol: 'NVDA/USD',
    baseAsset: 'NVDA',
    quoteAsset: 'USD',
    category: 'STOCKS',
    nameAr: 'شركة إنفيديا (NVIDIA)',
    nameEn: 'NVIDIA Corp.',
    price: 138.60,
    change24h: 3.45,
    high24h: 140.20,
    low24h: 133.80,
    volume24h: 485000,
  },
  {
    symbol: 'AAPL/USD',
    baseAsset: 'AAPL',
    quoteAsset: 'USD',
    category: 'STOCKS',
    nameAr: 'شركة آبل (Apple)',
    nameEn: 'Apple Inc.',
    price: 234.80,
    change24h: 1.12,
    high24h: 236.50,
    low24h: 231.90,
    volume24h: 312000,
  },
  {
    symbol: 'MSFT/USD',
    baseAsset: 'MSFT',
    quoteAsset: 'USD',
    category: 'STOCKS',
    nameAr: 'شركة مايكروسوفت (Microsoft)',
    nameEn: 'Microsoft Corp.',
    price: 428.50,
    change24h: 1.54,
    high24h: 432.00,
    low24h: 422.10,
    volume24h: 194000,
  },
  {
    symbol: 'TSLA/USD',
    baseAsset: 'TSLA',
    quoteAsset: 'USD',
    category: 'STOCKS',
    nameAr: 'شركة تسلا (Tesla)',
    nameEn: 'Tesla Inc.',
    price: 288.40,
    change24h: 2.75,
    high24h: 294.00,
    low24h: 279.50,
    volume24h: 365000,
  },
  {
    symbol: 'AMZN/USD',
    baseAsset: 'AMZN',
    quoteAsset: 'USD',
    category: 'STOCKS',
    nameAr: 'شركة أمازون (Amazon)',
    nameEn: 'Amazon.com Inc.',
    price: 214.20,
    change24h: 1.88,
    high24h: 216.40,
    low24h: 209.80,
    volume24h: 275000,
  },
];

function buildInitialTickers(): Record<string, ExtendedMarketTicker> {
  const map: Record<string, ExtendedMarketTicker> = {};
  for (const item of INITIAL_GLOBAL_INSTRUMENTS) {
    const vol = item.category === 'FOREX' ? 0.0015 : item.category === 'METALS' ? 0.003 : 0.007;
    map[item.symbol] = {
      ...item,
      candles: generateCandles(item.price, vol),
    };
  }
  return map;
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);

export const MarketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tickers, setTickers] = useState<Record<string, ExtendedMarketTicker>>(() => buildInitialTickers());
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC/USDT');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const refreshMarkets = useCallback(async () => {
    setIsLoading(true);
    try {
      const apiList = await api.getMarkets().catch(() => []);
      setTickers((prev) => {
        const next: Record<string, ExtendedMarketTicker> = { ...prev };

        // Apply slight realistic live ticks to all instruments
        Object.keys(next).forEach((sym) => {
          const item = next[sym];
          const stepPct = (Math.random() - 0.48) * (item.category === 'FOREX' ? 0.0008 : 0.0025);
          const decimals = item.price < 10 ? 4 : 2;
          const newPrice = Number(Math.max(0.01, item.price * (1 + stepPct)).toFixed(decimals));
          const newChange = Number((item.change24h + stepPct * 45).toFixed(2));
          next[sym] = {
            ...item,
            price: newPrice,
            change24h: newChange,
            high24h: Math.max(item.high24h, newPrice),
            low24h: Math.min(item.low24h, newPrice),
          };
        });

        // Merge backend crypto feed if returned
        for (const t of apiList) {
          const existing = next[t.symbol];
          if (existing) {
            next[t.symbol] = {
              ...existing,
              price: t.price,
              change24h: t.change24h,
              high24h: t.high24h,
              low24h: t.low24h,
              volume24h: t.volume24h,
              candles: t.candles && t.candles.length > 0 ? t.candles : existing.candles,
            };
          }
        }
        return next;
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMarkets();
    const interval = setInterval(refreshMarkets, 5000);
    return () => clearInterval(interval);
  }, [refreshMarkets]);

  const activeTicker = tickers[selectedSymbol] || Object.values(tickers)[0] || null;

  return (
    <MarketContext.Provider
      value={{
        tickers,
        selectedSymbol,
        setSelectedSymbol,
        activeTicker,
        refreshMarkets,
        isLoading,
      }}
    >
      {children}
    </MarketContext.Provider>
  );
};

export const useMarket = (): MarketContextType => {
  const context = useContext(MarketContext);
  if (!context) {
    throw new Error('useMarket must be used within a MarketProvider');
  }
  return context;
};
