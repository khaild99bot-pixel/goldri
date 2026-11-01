import React from 'react';
import {
  Award,
  Flame,
  Landmark,
  TrendingUp,
  Layers,
  ShieldCheck,
} from 'lucide-react';

export type PlanSectorType =
  | 'GOLD'
  | 'OIL'
  | 'US_BONDS'
  | 'STOCKS'
  | 'FUNDS'
  | 'SOVEREIGN';

export interface PlanSectorMeta {
  type: PlanSectorType;
  nameAr: string;
  nameEn: string;
  subtitleAr: string;
  subtitleEn: string;
  ticker: string;
  marketSymbol: string;
  dailyRatePct: number;
  code: string;
  badgeBorder: string;
  badgeBg: string;
  badgeText: string;
  accentColor: string;
  bannerUrl: string;
}

const SECTOR_MAP: Record<string, PlanSectorMeta> = {
  plan_100: {
    type: 'GOLD',
    nameAr: 'استثمار في الذهب والسبائك',
    nameEn: 'Gold & Bullion Investment',
    subtitleAr: 'عقود الذهب الفوري والسبائك المعتمدة (XAU)',
    subtitleEn: 'Spot Gold & Certified Bullion Contracts',
    ticker: 'XAU / USD',
    marketSymbol: 'XAU/USD',
    dailyRatePct: 3,
    code: 'Au 999.9',
    badgeBorder: 'border-amber-500/40',
    badgeBg: 'from-amber-500/25 via-yellow-600/15 to-neutral-950',
    badgeText: 'text-amber-400',
    accentColor: '#F59E0B',
    bannerUrl:
      'https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=600&q=80',
  },
  plan_200: {
    type: 'OIL',
    nameAr: 'استثمار في النفط والطاقة',
    nameEn: 'Crude Oil & Energy Sector',
    subtitleAr: 'عقود خام برنت وغرب تكساس الآجلة (WTI)',
    subtitleEn: 'Brent & WTI Crude Energy Contracts',
    ticker: 'WTI / BRENT',
    marketSymbol: 'BTC/USDT',
    dailyRatePct: 3,
    code: 'USOIL',
    badgeBorder: 'border-orange-500/40',
    badgeBg: 'from-orange-500/25 via-amber-700/15 to-neutral-950',
    badgeText: 'text-orange-400',
    accentColor: '#F97316',
    bannerUrl:
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
  },
  plan_500: {
    type: 'US_BONDS',
    nameAr: 'سندات الخزانة الأمريكية',
    nameEn: 'US Treasury Bonds',
    subtitleAr: 'سندات وأذون الخزانة الفيدرالية الأمريكية',
    subtitleEn: 'Fixed-Yield US Sovereign Treasury Notes',
    ticker: 'US10Y / BONDS',
    marketSymbol: 'ETH/USDT',
    dailyRatePct: 5,
    code: 'T-BOND',
    badgeBorder: 'border-sky-500/40',
    badgeBg: 'from-sky-500/25 via-blue-700/15 to-neutral-950',
    badgeText: 'text-sky-400',
    accentColor: '#0EA5E9',
    bannerUrl:
      'https://images.unsplash.com/photo-1541888946425-d09bb18086f6?auto=format&fit=crop&w=600&q=80',
  },
  plan_1000: {
    type: 'STOCKS',
    nameAr: 'الأسهم العالمية الكبرى',
    nameEn: 'Global Blue-Chip Stocks',
    subtitleAr: 'أسهم شركات التكنولوجيا ومؤشر S&P 500',
    subtitleEn: 'S&P 500 & Nasdaq Leading Equities',
    ticker: 'S&P 500 / NDX',
    marketSymbol: 'NVDA/USD',
    dailyRatePct: 6,
    code: 'SPX 500',
    badgeBorder: 'border-emerald-500/40',
    badgeBg: 'from-emerald-500/25 via-teal-700/15 to-neutral-950',
    badgeText: 'text-emerald-400',
    accentColor: '#10B981',
    bannerUrl:
      'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=600&q=80',
  },
  plan_2000: {
    type: 'FUNDS',
    nameAr: 'صناديق الاستثمار المتداولة',
    nameEn: 'Global Investment Funds (ETFs)',
    subtitleAr: 'صناديق التحوط والمؤشرات المالية المركبة',
    subtitleEn: 'Diversified Institutional Index & Hedge Funds',
    ticker: 'GLOBAL / ETFs',
    marketSymbol: 'SOL/USDT',
    dailyRatePct: 6.5,
    code: 'ETF PRO',
    badgeBorder: 'border-violet-500/40',
    badgeBg: 'from-violet-500/25 via-indigo-700/15 to-neutral-950',
    badgeText: 'text-violet-400',
    accentColor: '#8B5CF6',
    bannerUrl:
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80',
  },
  plan_3000: {
    type: 'SOVEREIGN',
    nameAr: 'الصناديق السيادية والمؤسسية',
    nameEn: 'Sovereign & Institutional Portfolio',
    subtitleAr: 'محفظة سيادية مجمعة للذهب والسندات والأسهم',
    subtitleEn: 'Multi-Asset Sovereign Wealth Allocation',
    ticker: 'SOVEREIGN VAULT',
    marketSymbol: 'XAU/USD',
    dailyRatePct: 7,
    code: 'SOV VIP',
    badgeBorder: 'border-amber-400/50',
    badgeBg: 'from-amber-400/25 via-emerald-600/15 to-neutral-950',
    badgeText: 'text-amber-300',
    accentColor: '#EAB308',
    bannerUrl:
      'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=600&q=80',
  },
};

export function getPlanDailyRatePercent(
  planId?: string,
  amount?: number,
  planApr?: number
): number {
  const amt = Number(amount || 0);
  if (planId === 'plan_100' || amt === 100) return 3;
  if (planId === 'plan_200' || amt === 200) return 3;
  if (planId === 'plan_500' || amt === 500) return 5;
  if (planId === 'plan_1000' || amt === 1000) return 6;
  if (planId === 'plan_2000' || amt === 2000) return 6.5;
  if (planId === 'plan_3000' || amt >= 3000) return 7;
  if (planApr && planApr > 0) return planApr;
  return 3;
}

export function getPlanSectorMeta(
  planId?: string,
  amount?: number,
  planName?: string
): PlanSectorMeta {
  if (planId && SECTOR_MAP[planId]) {
    return SECTOR_MAP[planId];
  }
  const amt = Number(amount || 0);
  if (amt === 100) return SECTOR_MAP.plan_100;
  if (amt === 200) return SECTOR_MAP.plan_200;
  if (amt === 500) return SECTOR_MAP.plan_500;
  if (amt === 1000) return SECTOR_MAP.plan_1000;
  if (amt === 2000) return SECTOR_MAP.plan_2000;
  if (amt >= 3000) return SECTOR_MAP.plan_3000;

  const lower = (planName || '').toLowerCase();
  if (lower.includes('100') && !lower.includes('1,000') && !lower.includes('1000')) {
    return SECTOR_MAP.plan_100;
  }
  if (lower.includes('200') && !lower.includes('2,000') && !lower.includes('2000')) {
    return SECTOR_MAP.plan_200;
  }
  if (lower.includes('500')) return SECTOR_MAP.plan_500;
  if (lower.includes('1,000') || lower.includes('1000')) return SECTOR_MAP.plan_1000;
  if (lower.includes('2,000') || lower.includes('2000')) return SECTOR_MAP.plan_2000;
  if (lower.includes('3,000') || lower.includes('3000')) return SECTOR_MAP.plan_3000;

  return SECTOR_MAP.plan_100;
}

interface PlanThumbnailIconProps {
  planId?: string;
  amount?: number;
  planName?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const PlanThumbnailIcon: React.FC<PlanThumbnailIconProps> = ({
  planId,
  amount,
  planName,
  size = 'md',
}) => {
  const meta = getPlanSectorMeta(planId, amount, planName);

  const dims =
    size === 'sm'
      ? 'w-10 h-10 rounded-xl'
      : size === 'lg'
      ? 'w-16 h-16 rounded-2xl'
      : 'w-14 h-14 rounded-2xl';

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';

  const renderBadgeIcon = () => {
    switch (meta.type) {
      case 'GOLD':
        return <Award className={`${iconSize} text-amber-300`} />;
      case 'OIL':
        return <Flame className={`${iconSize} text-orange-300`} />;
      case 'US_BONDS':
        return <Landmark className={`${iconSize} text-sky-300`} />;
      case 'STOCKS':
        return <TrendingUp className={`${iconSize} text-emerald-300`} />;
      case 'FUNDS':
        return <Layers className={`${iconSize} text-violet-300`} />;
      case 'SOVEREIGN':
        return <ShieldCheck className={`${iconSize} text-amber-300`} />;
    }
  };

  return (
    <div
      className={`${dims} relative shrink-0 overflow-hidden border ${meta.badgeBorder} bg-neutral-950 shadow-lg group select-none`}
    >
      {/* High-Definition Financial Sector Photographic Thumbnail */}
      <img
        src={meta.bannerUrl}
        alt={meta.nameEn}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover object-center scale-105 group-hover:scale-110 transition-transform duration-500 brightness-90 contrast-110"
      />

      {/* Institutional Dark Vignette & Color Grade Overlay */}
      <div
        className={`absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/45 to-transparent`}
      />
      <div
        className={`absolute inset-0 bg-gradient-to-br ${meta.badgeBg} mix-blend-overlay opacity-80`}
      />

      {/* Crisp Glassmorphic Top-Right Icon Emblem */}
      <div className="absolute top-1 right-1 w-5 h-5 rounded-md bg-neutral-950/80 backdrop-blur-md border border-white/15 flex items-center justify-center shadow-sm">
        {renderBadgeIcon()}
      </div>

      {/* Bottom Institutional Ticker Strip */}
      <div className="absolute bottom-1 inset-x-1 flex items-center justify-center">
        <span
          className="px-1.5 py-0.5 rounded bg-neutral-950/90 backdrop-blur-md border border-white/10 text-[8px] font-mono font-black tracking-tighter text-white leading-none truncate"
          dir="ltr"
        >
          {meta.code}
        </span>
      </div>
    </div>
  );
};

export interface FixedIntervalProfitResult {
  accruedUSDT: number;
  stepIncrementUSDT: number;
  dailyTargetUSDT: number;
  totalTargetUSDT: number;
  completedIntervals: number;
  totalIntervals: number;
  formattedAccrued: string;
}

/**
 * Computes a deterministic, fixed-interval cumulative profit based on plan type.
 * Profit remains completely static on screen and increments once every 30 minutes
 * (48 fixed intervals per 24 hours) by (dailyProfitUSDT / 48) up to the plan's daily/total limit.
 */
export function computeFixedIntervalPlanProfit(
  startTimeIso: string,
  scheduledEndTimeIso: string,
  dailyProfitUSDT: number,
  durationDays: number,
  nowMs: number
): FixedIntervalProfitResult {
  const INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
  const INTERVALS_PER_DAY = 48;

  const startMs = new Date(startTimeIso).getTime();
  const endMs = new Date(scheduledEndTimeIso).getTime();
  const safeDays = Math.max(1, durationDays || 7);
  const totalDurMs = Math.max(INTERVAL_MS, endMs - startMs || safeDays * 86400000);
  const elapsedMs = Math.max(0, Math.min(totalDurMs, nowMs - startMs));

  const totalIntervals = Math.max(1, safeDays * INTERVALS_PER_DAY);
  const totalTargetUSDT = dailyProfitUSDT * safeDays;
  const stepIncrementUSDT = dailyProfitUSDT / INTERVALS_PER_DAY;

  // Completed 30-minute steps (starts at step 1 once activated so a fixed initial step is visible, then increments every 30 mins)
  const rawSteps = Math.floor(elapsedMs / INTERVAL_MS) + 1;
  const completedIntervals =
    elapsedMs >= totalDurMs
      ? totalIntervals
      : Math.min(totalIntervals, Math.max(1, rawSteps));

  const accruedUSDT = Math.min(
    totalTargetUSDT,
    Number((completedIntervals * stepIncrementUSDT).toFixed(2))
  );

  const formattedAccrued = `+$${accruedUSDT.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  return {
    accruedUSDT,
    stepIncrementUSDT,
    dailyTargetUSDT: dailyProfitUSDT,
    totalTargetUSDT,
    completedIntervals,
    totalIntervals,
    formattedAccrued,
  };
}

interface CumulativeProfitCounterProps {
  accruedUSDT: number;
  dailyProfitUSDT: number;
  totalTargetProfitUSDT: number;
  dailyRatePct: number;
  cycleProgressPct: number;
  remainingText: string;
  nextDropText?: string;
  isRtl: boolean;
}

export const CumulativeProfitCounter: React.FC<CumulativeProfitCounterProps> = ({
  accruedUSDT,
  dailyProfitUSDT,
  totalTargetProfitUSDT,
  dailyRatePct,
  cycleProgressPct,
  remainingText,
  nextDropText,
  isRtl,
}) => {
  const formattedAccrued = `+$${accruedUSDT.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  return (
    <div className="p-3.5 rounded-xl bg-neutral-950 border border-emerald-500/30 space-y-2.5">
      {/* Top Row: Label + Fixed Cumulative Profit Number */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span className="text-xs font-extrabold text-neutral-200 truncate">
            {isRtl ? 'الأرباح التراكمية للخطة' : 'Plan Cumulative Profit'}
          </span>
        </div>

        <div className="text-end shrink-0" dir="ltr">
          <span className="font-mono font-black text-emerald-400 text-sm sm:text-base tabular-nums">
            {formattedAccrued} USDT
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(6, cycleProgressPct))}%` }}
        />
      </div>

      {/* Bottom Row: Plan Daily Limit & Remaining Time */}
      <div className="flex items-center justify-between text-[11px] text-neutral-400 font-semibold pt-0.5">
        <span>
          {isRtl
            ? `الحد اليومي: +$${dailyProfitUSDT.toFixed(2)} (+${dailyRatePct}%)`
            : `Daily Limit: +$${dailyProfitUSDT.toFixed(2)} (+${dailyRatePct}%)`}
        </span>
        <span className="font-mono text-amber-400 font-bold" dir="ltr">
          {nextDropText ? `24h: ${nextDropText}` : remainingText}
        </span>
      </div>
    </div>
  );
};


