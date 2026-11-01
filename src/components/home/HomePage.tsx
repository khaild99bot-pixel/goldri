/**
 * GOLDRIX Clear & Intuitive Home Dashboard
 * - Section 1: Main Wallet Summary + Direct Deposit & Withdraw (USDT TRC20) + 3 Clear Balance Metrics
 * - Section 2: Active Smart Trading Plans & Live Profit Counter
 * - Section 3: Live Markets & Recent Account Operations
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useMarket } from '../../context/MarketContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { api } from '../../services/api.ts';
import { LedgerTransaction, UserInvestment } from '../../types/index.ts';
import { MarketAssetIcon } from '../common/MarketAssetIcon.tsx';
import {
  PlanThumbnailIcon,
  getPlanSectorMeta,
  getPlanDailyRatePercent,
  CumulativeProfitCounter,
  computeFixedIntervalPlanProfit,
} from '../common/PlanSectorBadge.tsx';
import {
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Users,
  Zap,
  Wallet,
} from 'lucide-react';

interface HomePageProps {
  setCurrentTab: (tab: string) => void;
  onOpenAuth: () => void;
  onOpenDeposit?: () => void;
  onOpenWithdrawal?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  setCurrentTab,
  onOpenDeposit,
  onOpenWithdrawal,
}) => {
  const { user, balances, refreshBalances } = useAuth();
  const { tickers, setSelectedSymbol } = useMarket();
  const { isRtl } = useLanguage();

  const [recentTransactions, setRecentTransactions] = useState<LedgerTransaction[]>([]);
  const [investments, setInvestments] = useState<UserInvestment[]>([]);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!user?.id) return;
    const loadHomeData = async () => {
      try {
        const [txs, invs] = await Promise.all([
          api.getTransactions(),
          api.getUserInvestments(),
        ]);
        if (txs) {
          const topTxs = txs.slice(0, 6);
          setRecentTransactions((prev) =>
            JSON.stringify(prev) === JSON.stringify(topTxs) ? prev : topTxs
          );
        }
        if (invs) {
          setInvestments((prev) =>
            JSON.stringify(prev) === JSON.stringify(invs) ? prev : invs
          );
        }
        await refreshBalances();
      } catch {
        // ignore
      }
    };
    loadHomeData();
    const dataInterval = setInterval(loadHomeData, 10000);
    return () => {
      clearInterval(dataInterval);
    };
  }, [user?.id, refreshBalances]);

  useEffect(() => {
    const tickInterval = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(tickInterval);
  }, []);

  const autoProfitMetrics = useMemo(() => {
    let liveAccruedUSDT = 0;
    let totalRealizedUSDT = 0;
    let activePrincipalUSDT = 0;
    let dailyTargetUSDT = 0;

    const activeList = investments.filter((inv) => inv.status === 'ACTIVE');
    for (const inv of investments) {
      totalRealizedUSDT += Number(inv.realizedPnl || 0);
      if (inv.status === 'ACTIVE') {
        const principal = Number(inv.initialAmount || 0);
        activePrincipalUSDT += principal;
        const dailyRatePct = getPlanDailyRatePercent(inv.planId, principal, inv.aprAtActivation);
        const dailyYield = principal * (dailyRatePct / 100);
        dailyTargetUSDT += dailyYield;
        const durationDays = Math.max(1, inv.durationDays || 7);
        const fixedPlanProfit = computeFixedIntervalPlanProfit(
          inv.startTime,
          inv.scheduledEndTime,
          dailyYield,
          durationDays,
          nowMs
        );
        liveAccruedUSDT += fixedPlanProfit.accruedUSDT;
      }
    }

    const totalAutoProfit = Number((totalRealizedUSDT + liveAccruedUSDT).toFixed(2));
    return {
      activeList,
      activePrincipalUSDT,
      liveAccruedUSDT,
      totalAutoProfit,
      dailyTargetUSDT,
    };
  }, [investments, nowMs]);

  const getTransactionLabel = (type: string) => {
    if (!isRtl) return type.replace(/_/g, ' ');
    switch (type) {
      case 'DEPOSIT':
        return 'إيداع USDT';
      case 'WITHDRAWAL_LOCK':
        return 'طلب سحب';
      case 'WITHDRAWAL_CONFIRM':
        return 'سحب مكتمل';
      case 'WITHDRAWAL_REFUND':
        return 'إرجاع سحب';
      case 'INVESTMENT_ALLOCATE':
        return 'تفعيل خطة';
      case 'INVESTMENT_RETURN':
        return 'ربح يومي';
      case 'REFERRAL_BONUS':
        return 'مكافأة دعوة';
      case 'REFERRAL_PROFIT_SHARE':
        return 'عمولة الفريق';
      default:
        return type;
    }
  };

  const featuredSymbols = ['BTC/USDT', 'XAU/USD', 'EUR/USD', 'NVDA/USD'];
  const featuredTickers = featuredSymbols.map((s) => tickers[s]).filter(Boolean);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-5 space-y-5">
      {/* 1. Main Wallet Summary & Visual Balance Cards */}
      <section className="bg-gradient-to-br from-neutral-900 via-neutral-900/95 to-emerald-950/20 border border-neutral-800/90 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-neutral-800/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                <Wallet className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-extrabold text-neutral-300 tracking-wide">
                {isRtl ? 'إجمالي الرصيد' : 'Total Balance'}
              </span>
            </div>
            <div
              className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight tabular-nums pt-0.5 flex items-baseline gap-2"
              dir="ltr"
            >
              <span>
                ${balances
                  ? Number(balances.totalEstimatedUSDT || 0).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : '0.00'}
              </span>
              <span className="text-xs font-extrabold text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                USDT
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {onOpenDeposit && (
              <button
                type="button"
                onClick={onOpenDeposit}
                className="flex-1 sm:flex-initial justify-center px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-extrabold text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-lg shadow-emerald-500/15"
              >
                <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
                <span>{isRtl ? 'إيداع' : 'Deposit'}</span>
              </button>
            )}
            {onOpenWithdrawal && (
              <button
                type="button"
                onClick={onOpenWithdrawal}
                className="flex-1 sm:flex-initial justify-center px-6 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-extrabold text-xs flex items-center gap-2 border border-neutral-700 transition-colors cursor-pointer"
              >
                <ArrowUpRight className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
                <span>{isRtl ? 'سحب الأرباح' : 'Withdraw'}</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Clean Balance Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div
            onClick={onOpenWithdrawal}
            className="p-3.5 rounded-xl bg-neutral-950/90 border border-emerald-500/25 hover:border-emerald-500/50 transition-colors cursor-pointer flex flex-col justify-between gap-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-neutral-300 font-bold">
                {isRtl ? 'متاح للسحب' : 'Withdrawable'}
              </span>
              <span className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <span className="font-mono font-extrabold text-emerald-400 text-base sm:text-lg tabular-nums block" dir="ltr">
              ${balances ? Number(balances.withdrawableUSDT ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
            </span>
          </div>

          <div
            onClick={() => setCurrentTab('trading')}
            className="p-3.5 rounded-xl bg-neutral-950/90 border border-amber-500/20 hover:border-amber-500/40 transition-colors cursor-pointer flex flex-col justify-between gap-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-neutral-300 font-bold">
                {isRtl ? 'رصيد الخطط' : 'Plans Balance'}
              </span>
            </div>
            <span className="font-mono font-extrabold text-amber-400 text-base sm:text-lg tabular-nums block" dir="ltr">
              ${balances ? Number(balances.frozenDepositUSDT ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
            </span>
          </div>

          <div
            onClick={() => setCurrentTab('trading')}
            className="p-3.5 rounded-xl bg-neutral-950/90 border border-emerald-500/35 hover:border-emerald-500/60 transition-colors cursor-pointer flex flex-col justify-between gap-2"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-neutral-300 font-bold">
                {isRtl ? 'أرباح تراكمية' : 'Cumulative Profit'}
              </span>
              <span className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              </span>
            </div>
            <span
              className="font-mono font-extrabold text-emerald-400 text-base sm:text-lg tabular-nums block"
              dir="ltr"
            >
              +${autoProfitMetrics.totalAutoProfit.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>

          <div
            onClick={() => setCurrentTab('referrals')}
            className="p-3.5 rounded-xl bg-neutral-950/90 border border-neutral-800 hover:border-neutral-700 transition-colors cursor-pointer flex flex-col justify-between gap-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-neutral-300 font-bold">
                {isRtl ? 'أرباح الفريق' : 'Team Profit'}
              </span>
              <span className="w-6 h-6 rounded-lg bg-neutral-800 text-emerald-400 flex items-center justify-center">
                <Users className="w-3.5 h-3.5" />
              </span>
            </div>
            <span className="font-mono font-extrabold text-white text-base sm:text-lg tabular-nums block" dir="ltr">
              ${(Number(user?.referralEarningsUSDT || 0) + Number(user?.referralProfitShareUSDT || 0)).toFixed(2)}
            </span>
          </div>
        </div>
      </section>

      {/* 2. Active Plans or Instant Visual Start Trading Banner */}
      {autoProfitMetrics.activeList.length === 0 ? (
        <button
          type="button"
          onClick={() => setCurrentTab('trading')}
          className="w-full p-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-neutral-950 flex items-center justify-between transition-all cursor-pointer shadow-lg shadow-emerald-500/15"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-neutral-950/15 flex items-center justify-center">
              <Zap className="w-6 h-6 text-neutral-950 fill-neutral-950" />
            </div>
            <div className="text-start">
              <div className="text-base sm:text-lg font-extrabold tracking-tight">
                {isRtl ? 'ابدأ التداول الذكي الآن' : 'Start Smart Trading Now'}
              </div>
              <div className="text-xs font-bold opacity-85">
                {isRtl
                  ? 'احتساب أرباح ثابت حسب نوع الخطة وتسوية تلقائية كل 24 ساعة'
                  : 'Fixed Profit Accrual by Plan Tier & Automatic 24h Settlement'}
              </div>
            </div>
          </div>
          <div className="w-9 h-9 rounded-full bg-neutral-950/15 flex items-center justify-center">
            <ArrowRight className="w-5 h-5 rtl:rotate-180" />
          </div>
        </button>
      ) : (
        <section className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white">
                {isRtl ? 'خططي النشطة والأرباح التراكمية' : 'My Active Plans & Cumulative Profit'}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setCurrentTab('trading')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>{isRtl ? 'الخطط' : 'Plans'}</span>
              <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {autoProfitMetrics.activeList.map((inv) => {
              const principal = Number(inv.initialAmount || 0);
              const startMs = new Date(inv.startTime).getTime();
              const endMs = new Date(inv.scheduledEndTime).getTime();
              const totalDur = Math.max(1, endMs - startMs);
              const elapsed = Math.max(0, Math.min(totalDur, nowMs - startMs));
              const pct = Math.min(100, Math.round((elapsed / totalDur) * 100));
              const dailyRatePct = getPlanDailyRatePercent(inv.planId, principal, inv.aprAtActivation);
              const targetRate = dailyRatePct / 100;
              const dailyProfit = principal * targetRate;
              const durationDays = Math.max(1, inv.durationDays || 7);
              const totalTargetProfit = dailyProfit * durationDays;
              const fixedProfit = computeFixedIntervalPlanProfit(
                inv.startTime,
                inv.scheduledEndTime,
                dailyProfit,
                durationDays,
                nowMs
              );

              const remMs = Math.max(0, endMs - nowMs);
              const remDays = Math.floor(remMs / 86400000);
              const remHours = Math.floor((remMs % 86400000) / 3600000);
              const sectorMeta = getPlanSectorMeta(inv.planId, principal, inv.planName);

              return (
                <div key={inv.id} className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <PlanThumbnailIcon
                        planId={inv.planId}
                        amount={principal}
                        planName={inv.planName}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-xs block truncate">
                            {isRtl ? sectorMeta.nameAr : sectorMeta.nameEn}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[9px] font-extrabold shrink-0">
                            {isRtl ? 'مفعلة' : 'Active'}
                          </span>
                        </div>
                        <span className="font-mono font-extrabold text-emerald-400 text-xs block" dir="ltr">
                          ${principal.toLocaleString('en-US')} USDT
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-mono font-bold" dir="ltr">
                        +${dailyProfit.toFixed(0)}/24h
                      </span>
                      {onOpenWithdrawal && (
                        <button
                          type="button"
                          onClick={onOpenWithdrawal}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-[11px] cursor-pointer"
                        >
                          {isRtl ? 'سحب' : 'Withdraw'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Fixed-Interval Cumulative Profit Counter */}
                  <CumulativeProfitCounter
                    accruedUSDT={fixedProfit.accruedUSDT}
                    dailyProfitUSDT={dailyProfit}
                    totalTargetProfitUSDT={totalTargetProfit}
                    dailyRatePct={dailyRatePct}
                    cycleProgressPct={pct}
                    remainingText={`${remDays}d ${remHours}h`}
                    isRtl={isRtl}
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. Two Clear Columns: Live Markets & Recent Account History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Live Markets */}
        <section className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <h2 className="text-sm font-bold text-white">
              {isRtl ? 'أسعار الأسواق المباشرة' : 'Live Market Prices'}
            </h2>
            <button
              type="button"
              onClick={() => setCurrentTab('markets')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>{isRtl ? 'كل الأسواق' : 'All Markets'}</span>
              <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </button>
          </div>

          <div className="divide-y divide-neutral-800">
            {featuredTickers.map((t) => {
              const isPositive = t.change24h >= 0;
              return (
                <div
                  key={t.symbol}
                  onClick={() => {
                    setSelectedSymbol(t.symbol);
                    setCurrentTab('markets');
                  }}
                  className="py-3 flex items-center justify-between hover:bg-neutral-850 px-2 -mx-2 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <MarketAssetIcon
                      symbol={t.symbol}
                      baseAsset={t.baseAsset}
                      quoteAsset={t.quoteAsset}
                      category={t.category}
                      size="md"
                    />
                    <div>
                      <div className="text-xs font-bold text-white font-mono flex items-center gap-1">
                        <span>{t.baseAsset}</span>
                        <span className="text-neutral-500 font-normal">/{t.quoteAsset}</span>
                      </div>
                      <div className="text-[11px] text-neutral-400">
                        {isRtl ? t.nameAr : t.nameEn}
                      </div>
                    </div>
                  </div>

                  <div className="text-right rtl:text-left font-mono tabular-nums" dir="ltr">
                    <div className="text-xs sm:text-sm font-bold text-white">
                      ${t.price.toLocaleString('en-US', { minimumFractionDigits: t.price < 10 ? 4 : 2 })}
                    </div>
                    <div className={`text-[11px] font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isPositive ? '+' : ''}
                      {t.change24h}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Recent Transactions */}
        <section className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <h2 className="text-sm font-bold text-white">
              {isRtl ? 'سجل العمليات الأخيرة' : 'Recent Transactions'}
            </h2>
          </div>

          {recentTransactions.length === 0 ? (
            <p className="text-xs text-neutral-400 py-8 text-center">
              {isRtl ? 'لا توجد عمليات مالية مسجلة حتى الآن.' : 'No transactions recorded yet.'}
            </p>
          ) : (
            <div className="divide-y divide-neutral-800 text-xs">
              {recentTransactions.map((tx) => {
                const isPositive = [
                  'DEPOSIT',
                  'INVESTMENT_RETURN',
                  'REFERRAL_BONUS',
                  'REFERRAL_PROFIT_SHARE',
                ].includes(tx.type);
                return (
                  <div key={tx.id} className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white block">
                        {getTransactionLabel(tx.type)}
                      </span>
                      <span className="text-[11px] text-neutral-400 font-mono" dir="ltr">
                        {new Date(tx.timestamp).toLocaleDateString('en-US')}
                      </span>
                    </div>
                    <span
                      className={`font-mono font-bold tabular-nums ${
                        isPositive ? 'text-emerald-400' : 'text-white'
                      }`}
                      dir="ltr"
                    >
                      {isPositive ? '+' : '-'}${Number(tx.amount).toFixed(2)} {tx.asset}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
