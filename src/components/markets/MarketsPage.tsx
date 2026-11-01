/**
 * GOLDRIX Global Multi-Asset Markets & Japanese Candlesticks Trading Terminal
 * - Live Japanese Candlestick Chart with MA(10/20) & OHLCV
 * - Integrated Plan Selection & Live Plan Progress ("مفعلة • قيد التقدم") directly on the Candlestick page
 * - Calculated daily yields: $100 (3%), $200 (3%), $500 (5%), $1,000 (6%), $2,000 (6.5%), $3,000 (7%)
 * - Profits drop to withdrawable balance after every 24 hours of plan operation
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useMarket, MarketCategory } from '../../context/MarketContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { InvestmentPlan, UserInvestment } from '../../types/index.ts';
import { CandlestickChart } from '../common/CandlestickChart.tsx';
import { MarketAssetIcon } from '../common/MarketAssetIcon.tsx';
import {
  PlanThumbnailIcon,
  getPlanSectorMeta,
  getPlanDailyRatePercent,
} from '../common/PlanSectorBadge.tsx';
import {
  Search,
  Star,
  ArrowUpDown,
  RefreshCw,
  Zap,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowDownLeft,
  ShieldCheck,
  X,
  BarChart2,
} from 'lucide-react';

interface MarketsPageProps {
  setCurrentTab: (tab: string) => void;
  onOpenDeposit?: () => void;
  onOpenWithdrawal?: () => void;
}

export const MarketsPage: React.FC<MarketsPageProps> = ({
  setCurrentTab,
  onOpenDeposit,
}) => {
  const { tickers, selectedSymbol, setSelectedSymbol, activeTicker, refreshMarkets, isLoading } = useMarket();
  const { isRtl, t } = useLanguage();
  const { user, balances, refreshBalances } = useAuth();

  const [category, setCategory] = useState<MarketCategory>('ALL');
  const [search, setSearch] = useState('');
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const [watchlist, setWatchlist] = useState<string[]>(['BTC/USDT', 'XAU/USD', 'EUR/USD', 'NVDA/USD']);
  const [sortBy, setSortBy] = useState<'volume' | 'price' | 'change' | 'symbol'>('volume');
  const [sortAsc, setSortAsc] = useState(false);

  // Plans & User Investments for Candlestick Plan Selection
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [userInvestments, setUserInvestments] = useState<UserInvestment[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('plan_100');
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(() => Date.now());

  // Activation Modal State
  const [activatingPlan, setActivatingPlan] = useState<InvestmentPlan | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadPlansAndInvestments = useCallback(async () => {
    try {
      const [plansData, investmentsData] = await Promise.all([
        api.getInvestmentPlans(),
        user?.id ? api.getUserInvestments() : Promise.resolve([]),
      ]);
      if (Array.isArray(plansData) && plansData.length > 0) {
        setPlans(plansData);
      }
      if (Array.isArray(investmentsData)) {
        const own = investmentsData.filter((inv) => user?.id && inv.userId === user.id);
        setUserInvestments(own);
        const firstActive = own.find((inv) => inv.status === 'ACTIVE');
        if (firstActive) {
          setSelectedPlanId((prev) => prev || firstActive.planId);
        }
      }
    } catch {
      // ignore
    }
  }, [user?.id]);

  useEffect(() => {
    loadPlansAndInvestments();
  }, [loadPlansAndInvestments]);

  const hasActiveInvestment = useMemo(
    () => userInvestments.some((inv) => inv.status === 'ACTIVE'),
    [userInvestments]
  );

  useEffect(() => {
    if (!hasActiveInvestment) return;
    const timer = setInterval(() => {
      setCurrentTimeMs(Date.now());
    }, 200);
    return () => clearInterval(timer);
  }, [hasActiveInvestment]);

  const getUserInvestmentForPlan = (planId: string) => {
    return userInvestments.find((inv) => inv.planId === planId);
  };

  const selectedPlan = useMemo(() => {
    return plans.find((p) => p.id === selectedPlanId) || plans[0] || null;
  }, [plans, selectedPlanId]);

  const formatCountdown = (endTimeIso: string) => {
    const remaining = new Date(endTimeIso).getTime() - currentTimeMs;
    if (remaining <= 0) return isRtl ? 'مكتملة' : 'Completed';
    const d = Math.floor(remaining / 86400000);
    const h = Math.floor((remaining % 86400000) / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    return `${d}d ${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  };

  const formatNext24hDrop = (startTimeIso: string) => {
    const startMs = new Date(startTimeIso).getTime();
    const elapsedMs = Math.max(0, currentTimeMs - startMs);
    const nextDropMs = startMs + (Math.floor(elapsedMs / 86400000) + 1) * 86400000;
    const rem = Math.max(0, Math.floor((nextDropMs - currentTimeMs) / 1000));
    const h = String(Math.floor(rem / 3600)).padStart(2, '0');
    const m = String(Math.floor((rem % 3600) / 60)).padStart(2, '0');
    const s = String(rem % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const calculateProgress = (startTimeIso: string, endTimeIso: string) => {
    const start = new Date(startTimeIso).getTime();
    const end = new Date(endTimeIso).getTime();
    const elapsed = currentTimeMs - start;
    const total = Math.max(1, end - start);
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  };

  const handleSelectPlanCard = (plan: InvestmentPlan) => {
    setSelectedPlanId(plan.id);
    const planAmt = Number(plan.fixedAmount || plan.minAmount);
    const meta = getPlanSectorMeta(plan.id, planAmt, plan.name);
    if (meta.marketSymbol && tickers[meta.marketSymbol]) {
      setSelectedSymbol(meta.marketSymbol);
    }
  };

  const handleOpenActivate = (plan: InvestmentPlan) => {
    if (getUserInvestmentForPlan(plan.id)) return;
    setActivatingPlan(plan);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleConfirmActivation = async () => {
    if (!activatingPlan || isSubmitting) return;
    const planAmount = Number(activatingPlan.fixedAmount || activatingPlan.minAmount);
    const userBalance = balances ? Number(balances.available[activatingPlan.asset] || 0) : 0;

    if (userBalance < planAmount) {
      setErrorMessage(
        isRtl
          ? `رصيد الخطط غير كافٍ ($${userBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT). المطلوب $${planAmount.toLocaleString('en-US')} USDT.`
          : `Insufficient balance ($${userBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT). Required: $${planAmount.toLocaleString('en-US')} USDT.`
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await api.activateInvestment(activatingPlan.id, planAmount.toString());
      await refreshBalances();
      await loadPlansAndInvestments();
      setSuccessMessage(
        isRtl
          ? `تم تفعيل الخطة بنجاح ($${planAmount.toLocaleString('en-US')} USDT)`
          : `Plan activated ($${planAmount.toLocaleString('en-US')} USDT)`
      );
      setTimeout(() => {
        setActivatingPlan(null);
        setSuccessMessage(null);
      }, 900);
    } catch (err: any) {
      setErrorMessage(err.message || (isRtl ? 'تعذر تفعيل الخطة' : 'Activation failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories: { id: MarketCategory; label: string }[] = [
    { id: 'ALL', label: t('catAll') },
    { id: 'CRYPTO', label: t('catCrypto') },
    { id: 'METALS', label: t('catMetals') },
    { id: 'FOREX', label: t('catForex') },
    { id: 'STOCKS', label: t('catStocks') },
  ];

  const toggleWatchlist = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWatchlist((prev) =>
      prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]
    );
  };

  const filteredMarkets = useMemo(() => {
    let list = Object.values(tickers);

    if (category !== 'ALL') {
      list = list.filter((t) => t.category === category);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.symbol.toLowerCase().includes(q) ||
          t.baseAsset.toLowerCase().includes(q) ||
          t.nameAr.toLowerCase().includes(q) ||
          t.nameEn.toLowerCase().includes(q)
      );
    }

    if (watchlistOnly) {
      list = list.filter((t) => watchlist.includes(t.symbol));
    }

    list.sort((a, b) => {
      let diff = 0;
      if (sortBy === 'volume') diff = b.volume24h * b.price - a.volume24h * a.price;
      else if (sortBy === 'price') diff = b.price - a.price;
      else if (sortBy === 'change') diff = b.change24h - a.change24h;
      else diff = a.symbol.localeCompare(b.symbol);
      return sortAsc ? -diff : diff;
    });

    return list;
  }, [tickers, category, search, watchlistOnly, watchlist, sortBy, sortAsc]);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-5 space-y-5 animate-fadeInUp">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-4 overflow-x-auto">
          {categories.map((cat) => {
            const isActive = category === cat.id && !watchlistOnly;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setWatchlistOnly(false);
                  setCategory(cat.id);
                }}
                className={`pb-1 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer border-b-2 ${
                  isActive
                    ? 'border-emerald-400 text-white'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {cat.label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setWatchlistOnly(!watchlistOnly)}
            className={`pb-1 text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer border-b-2 ${
              watchlistOnly
                ? 'border-emerald-400 text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${watchlistOnly ? 'fill-white text-white' : ''}`} />
            <span>{t('watchlist')}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
            />
          </div>
          <button
            type="button"
            onClick={() => refreshMarkets()}
            disabled={isLoading}
            className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Selected Instrument Live Japanese Candlestick Chart */}
      {activeTicker && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <MarketAssetIcon
                symbol={activeTicker.symbol}
                baseAsset={activeTicker.baseAsset}
                quoteAsset={activeTicker.quoteAsset}
                category={activeTicker.category}
                size="lg"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-white font-mono">{activeTicker.symbol}</span>
                  <span className="px-2 py-0.5 rounded bg-neutral-800/80 border border-neutral-700/60 text-[10px] font-mono text-neutral-300">
                    {activeTicker.category}
                  </span>
                </div>
                <span className="text-xs text-neutral-400 block">
                  {isRtl ? activeTicker.nameAr : activeTicker.nameEn}
                </span>
              </div>
            </div>

            <div className="flex items-baseline gap-3 font-mono tabular-nums" dir="ltr">
              <span className="text-lg font-bold text-white">
                ${activeTicker.price.toLocaleString('en-US', { minimumFractionDigits: activeTicker.price < 10 ? 4 : 2 })}
              </span>
              <span className={`text-xs font-bold ${activeTicker.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {activeTicker.change24h >= 0 ? '+' : ''}
                {activeTicker.change24h}%
              </span>
            </div>
          </div>

          <CandlestickChart
            candles={activeTicker.candles}
            symbol={activeTicker.symbol}
            height={220}
          />
        </div>
      )}

      {/* Integrated Plan Selection & Live Status Bar on the Japanese Candlesticks Page */}
      {plans.length > 0 && (
        <section className="bg-neutral-900/95 border border-neutral-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <BarChart2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-white">
                  {isRtl ? 'اختيار خطة التداول على الشموع اليابانية' : 'Candlestick Trading Plan Selector'}
                </h2>
                <p className="text-[11px] text-neutral-400">
                  {isRtl
                    ? 'اختر الخطة لربطها بالمؤشر المباشر ومتابعة حالة التقدم أو التفعيل الفوري'
                    : 'Select a plan to link with the live chart and track progress or activate'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <div className="px-3 py-1.5 rounded-xl bg-neutral-950 border border-amber-500/25 flex items-center gap-2">
                <span className="text-neutral-400 font-bold">
                  {isRtl ? 'رصيد الخطط:' : 'Plans Balance:'}
                </span>
                <span className="font-mono font-extrabold text-amber-400" dir="ltr">
                  ${balances ? Number(balances.available.USDT || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                </span>
              </div>
            </div>
          </div>

          {/* 6 Selectable Plan Pills with Live Status ("مفعلة • قيد التقدم") */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {plans.map((plan) => {
              const planAmt = Number(plan.fixedAmount || plan.minAmount);
              const ratePct = getPlanDailyRatePercent(plan.id, planAmt, plan.estimatedAprMin);
              const dailyUsd = (planAmt * ratePct) / 100;
              const inv = getUserInvestmentForPlan(plan.id);
              const isActive = inv?.status === 'ACTIVE';
              const isCompleted = inv?.status === 'COMPLETED';
              const isSelected = selectedPlan?.id === plan.id;

              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => handleSelectPlanCard(plan)}
                  className={`p-3 rounded-xl border text-start transition-all cursor-pointer flex flex-col justify-between gap-2 relative overflow-hidden ${
                    isActive
                      ? 'bg-emerald-500/10 border-emerald-500/60 shadow-md shadow-emerald-500/10'
                      : isSelected
                      ? 'bg-neutral-950 border-amber-400/70 shadow-md'
                      : 'bg-neutral-950/80 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 w-full">
                    <span className="font-mono font-black text-sm text-white" dir="ltr">
                      ${planAmt.toLocaleString('en-US')}
                    </span>
                    <span
                      className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-extrabold"
                      dir="ltr"
                    >
                      +{ratePct}%
                    </span>
                  </div>

                  <div className="text-[11px] font-mono font-bold text-emerald-400" dir="ltr">
                    +${dailyUsd.toFixed(2)} / 24h
                  </div>

                  {/* Status Pill inside card */}
                  <div className="w-full pt-1.5 border-t border-neutral-800/80 flex items-center justify-between text-[10px]">
                    {isActive ? (
                      <span className="text-emerald-300 font-extrabold flex items-center gap-1 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                        <span className="truncate">{isRtl ? 'قيد التقدم • مفعلة' : 'In Progress'}</span>
                      </span>
                    ) : isCompleted ? (
                      <span className="text-neutral-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>{isRtl ? 'مكتملة' : 'Completed'}</span>
                      </span>
                    ) : (
                      <span className={isSelected ? 'text-amber-400 font-extrabold' : 'text-neutral-400 font-medium'}>
                        {isSelected
                          ? isRtl
                            ? 'الخطة المختارة'
                            : 'Selected'
                          : isRtl
                          ? 'اختيار الخطة'
                          : 'Select Plan'}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Plan Execution & Live Progress Bar */}
          {selectedPlan &&
            (() => {
              const selAmt = Number(selectedPlan.fixedAmount || selectedPlan.minAmount);
              const selRatePct = getPlanDailyRatePercent(
                selectedPlan.id,
                selAmt,
                selectedPlan.estimatedAprMin
              );
              const selDailyUsd = (selAmt * selRatePct) / 100;
              const selTotalUsd = selDailyUsd * Math.max(1, selectedPlan.durationDays);
              const selMeta = getPlanSectorMeta(selectedPlan.id, selAmt, selectedPlan.name);
              const selInv = getUserInvestmentForPlan(selectedPlan.id);
              const isSelActive = selInv?.status === 'ACTIVE';
              const isSelCompleted = selInv?.status === 'COMPLETED';

              return (
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    isSelActive
                      ? 'bg-emerald-950/20 border-emerald-500/40'
                      : 'bg-neutral-950 border-neutral-800'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <PlanThumbnailIcon
                        planId={selectedPlan.id}
                        amount={selAmt}
                        planName={selectedPlan.name}
                        size="md"
                      />
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-extrabold text-white">
                            {isRtl ? selMeta.nameAr : selMeta.nameEn}
                          </span>
                          <span
                            className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-700 font-mono text-[10px] font-bold text-amber-400"
                            dir="ltr"
                          >
                            ${selAmt.toLocaleString('en-US')} USDT
                          </span>
                          {isSelActive ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-extrabold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                              <span>{isRtl ? 'مفعلة • قيد التقدم' : 'Active • In Progress'}</span>
                            </span>
                          ) : isSelCompleted ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-300 text-[10px] font-bold">
                              {isRtl ? 'مكتملة' : 'Completed'}
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                              {isRtl ? 'جاهزة للتفعيل' : 'Ready to Activate'}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-300 font-mono" dir="ltr">
                          <span className="text-emerald-400 font-extrabold">
                            +{selRatePct}% / 24h (+${selDailyUsd.toFixed(2)} USDT)
                          </span>
                          <span>•</span>
                          <span>
                            {selectedPlan.durationDays}d Total: +${selTotalUsd.toFixed(2)} USDT
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Side: Live Progress or Activate CTA */}
                    {isSelActive && selInv ? (() => {
                      const startMs = new Date(selInv.startTime).getTime();
                      const endMs = new Date(selInv.scheduledEndTime).getTime();
                      const totalDur = Math.max(1, endMs - startMs);
                      const elapsed = Math.max(0, Math.min(totalDur, currentTimeMs - startMs));
                      const liveCumulative = selTotalUsd * (elapsed / totalDur);
                      return (
                        <div className="md:w-80 space-y-1.5 bg-neutral-950/90 p-3 rounded-xl border border-emerald-500/30 text-xs">
                          <div className="flex items-center justify-between text-[11px] pb-1 border-b border-neutral-800">
                            <span className="text-emerald-300 font-extrabold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                              <span>{isRtl ? 'الربح التراكمي المباشر:' : 'Live Cumulative Profit:'}</span>
                            </span>
                            <span className="font-mono font-black text-emerald-400 tabular-nums" dir="ltr">
                              +${liveCumulative.toFixed(4)} USDT
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-neutral-300 font-bold">
                              {isRtl ? 'ينزل الربح بعد (24س):' : 'Next 24h Profit Drop:'}
                            </span>
                            <span className="font-mono font-extrabold text-amber-400 tabular-nums" dir="ltr">
                              {formatNext24hDrop(selInv.startTime)}
                            </span>
                          </div>
                          <div className="w-full bg-neutral-900 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-400 h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${calculateProgress(selInv.startTime, selInv.scheduledEndTime)}%`,
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono" dir="ltr">
                            <span>{calculateProgress(selInv.startTime, selInv.scheduledEndTime)}%</span>
                            <span className="text-emerald-400 font-bold">
                              {formatCountdown(selInv.scheduledEndTime)}
                            </span>
                          </div>
                        </div>
                      );
                    })() : isSelCompleted ? (
                      <div className="px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 text-xs font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>{isRtl ? 'تم إكمال دورة هذه الخطة' : 'Plan Cycle Completed'}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenActivate(selectedPlan)}
                          className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-emerald-500/15"
                        >
                          <Zap className="w-4 h-4 fill-neutral-950" />
                          <span>
                            {isRtl
                              ? `تفعيل خطة $${selAmt.toLocaleString('en-US')}`
                              : `Activate $${selAmt.toLocaleString('en-US')} Plan`}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
        </section>
      )}

      {/* Clean Hairline Market Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left rtl:text-right text-xs">
          <thead className="border-b border-neutral-800 text-neutral-500 font-medium text-[11px]">
            <tr>
              <th className="py-2.5 pr-2 w-8"></th>
              <th
                className="py-2.5 px-2 cursor-pointer hover:text-neutral-300"
                onClick={() => {
                  setSortBy('symbol');
                  setSortAsc(!sortAsc);
                }}
              >
                <div className="flex items-center gap-1">
                  <span>{t('pair')}</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                className="py-2.5 px-2 text-right rtl:text-left cursor-pointer hover:text-neutral-300"
                onClick={() => {
                  setSortBy('price');
                  setSortAsc(!sortAsc);
                }}
              >
                <div className="flex items-center justify-end rtl:justify-start gap-1">
                  <span>{t('price')}</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                className="py-2.5 px-2 text-right rtl:text-left cursor-pointer hover:text-neutral-300"
                onClick={() => {
                  setSortBy('change');
                  setSortAsc(!sortAsc);
                }}
              >
                <div className="flex items-center justify-end rtl:justify-start gap-1">
                  <span>{t('change24h')}</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-2.5 px-2 text-right rtl:text-left hidden sm:table-cell">
                {t('highLow24h')}
              </th>
              <th className="py-2.5 pl-2 text-right rtl:text-left w-24"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/70 font-mono tabular-nums">
            {filteredMarkets.map((ticker) => {
              const isStarred = watchlist.includes(ticker.symbol);
              const isBull = ticker.change24h >= 0;
              const isSelected = ticker.symbol === selectedSymbol;

              return (
                <tr
                  key={ticker.symbol}
                  onClick={() => setSelectedSymbol(ticker.symbol)}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? 'bg-neutral-900' : 'hover:bg-neutral-900/40'
                  }`}
                >
                  <td className="py-3 pr-2" onClick={(e) => toggleWatchlist(ticker.symbol, e)}>
                    <Star
                      className={`w-3.5 h-3.5 ${
                        isStarred ? 'fill-white text-white' : 'text-neutral-700 hover:text-neutral-400'
                      }`}
                    />
                  </td>
                  <td className="py-3 px-2 font-sans">
                    <div className="flex items-center gap-3">
                      <MarketAssetIcon
                        symbol={ticker.symbol}
                        baseAsset={ticker.baseAsset}
                        quoteAsset={ticker.quoteAsset}
                        category={ticker.category}
                        size="md"
                      />
                      <div>
                        <div className="font-bold text-white text-xs font-mono flex items-center gap-1.5">
                          <span>{ticker.baseAsset}</span>
                          <span className="text-neutral-500 font-normal">/{ticker.quoteAsset}</span>
                        </div>
                        <div className="text-[11px] text-neutral-500">
                          {isRtl ? ticker.nameAr : ticker.nameEn}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right rtl:text-left font-bold text-white" dir="ltr">
                    ${ticker.price.toLocaleString('en-US', { minimumFractionDigits: ticker.price < 10 ? 4 : 2 })}
                  </td>
                  <td className="py-3 px-2 text-right rtl:text-left" dir="ltr">
                    <span className={`font-bold ${isBull ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isBull ? '+' : ''}
                      {ticker.change24h}%
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right rtl:text-left hidden sm:table-cell text-[11px] text-neutral-500" dir="ltr">
                    ${ticker.high24h.toLocaleString('en-US', { minimumFractionDigits: ticker.price < 10 ? 4 : 2 })} / ${ticker.low24h.toLocaleString('en-US', { minimumFractionDigits: ticker.price < 10 ? 4 : 2 })}
                  </td>
                  <td className="py-3 pl-2 text-right rtl:text-left font-sans">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSymbol(ticker.symbol);
                        if (selectedPlan && !getUserInvestmentForPlan(selectedPlan.id)) {
                          handleOpenActivate(selectedPlan);
                        } else {
                          setCurrentTab('trading');
                        }
                      }}
                      className="px-3 py-1 rounded-lg bg-neutral-900 hover:bg-emerald-500 hover:text-neutral-950 text-emerald-400 border border-emerald-500/30 font-bold text-[11px] transition-colors cursor-pointer"
                    >
                      {t('tradeBtn')}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Portal-Rendered Plan Activation Confirmation Modal on the Candlestick Page */}
      {activatingPlan &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            onClick={() => !isSubmitting && setActivatingPlan(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              dir={isRtl ? 'rtl' : 'ltr'}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl animate-modalIn my-auto relative"
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm font-extrabold text-white">
                    {isRtl ? 'تأكيد تفعيل الخطة' : 'Confirm Plan Activation'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => !isSubmitting && setActivatingPlan(null)}
                  className="p-1.5 rounded-lg bg-neutral-800/80 text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {(() => {
                const modalAmt = Number(activatingPlan.fixedAmount || activatingPlan.minAmount);
                const modalRatePct = getPlanDailyRatePercent(
                  activatingPlan.id,
                  modalAmt,
                  activatingPlan.estimatedAprMin
                );
                const modalDaily = (modalAmt * modalRatePct) / 100;
                const days = Math.max(1, activatingPlan.durationDays);
                const modalTotalProfit = modalDaily * days;
                const modalTotalPayout = modalAmt + modalTotalProfit;
                const userAvail = balances ? Number(balances.available[activatingPlan.asset] || 0) : 0;
                const isBalanceEnough = userAvail >= modalAmt;
                const modalSector = getPlanSectorMeta(activatingPlan.id, modalAmt, activatingPlan.name);

                return (
                  <>
                    <div className="p-3.5 bg-neutral-950 rounded-xl border border-neutral-800 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <PlanThumbnailIcon
                            planId={activatingPlan.id}
                            amount={modalAmt}
                            planName={activatingPlan.name}
                            size="md"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-extrabold text-white truncate">
                              {isRtl ? modalSector.nameAr : modalSector.nameEn}
                            </div>
                            <span
                              className={`inline-block mt-1 px-2 py-0.5 rounded-md bg-neutral-900 border ${modalSector.badgeBorder} ${modalSector.badgeText} font-mono text-[10px] font-bold`}
                              dir="ltr"
                            >
                              {modalSector.ticker}
                            </span>
                          </div>
                        </div>

                        <div className="text-end shrink-0">
                          <span className="text-[10px] text-neutral-400 font-bold block">
                            {isRtl ? 'قيمة الخطة' : 'Amount'}
                          </span>
                          <span className="text-lg font-black font-mono text-emerald-400" dir="ltr">
                            ${modalAmt.toLocaleString('en-US')}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-neutral-800/90 text-center">
                        <div className="bg-neutral-900/90 rounded-lg py-2 px-1.5 border border-neutral-800/70">
                          <span className="text-neutral-400 block text-[10px] font-bold">
                            {isRtl ? `ربح 24س (+${modalRatePct}%)` : `24h (+${modalRatePct}%)`}
                          </span>
                          <span className="font-mono font-extrabold text-emerald-400 text-xs mt-0.5 block" dir="ltr">
                            +${modalDaily.toFixed(2)}
                          </span>
                        </div>

                        <div className="bg-neutral-900/90 rounded-lg py-2 px-1.5 border border-neutral-800/70">
                          <span className="text-neutral-400 block text-[10px] font-bold">
                            {isRtl ? `ربح ${days} أيام` : `${days}d Profit`}
                          </span>
                          <span className="font-mono font-extrabold text-emerald-400 text-xs mt-0.5 block" dir="ltr">
                            +${modalTotalProfit.toLocaleString('en-US')}
                          </span>
                        </div>

                        <div className="bg-neutral-900/90 rounded-lg py-2 px-1.5 border border-neutral-800/70">
                          <span className="text-neutral-400 block text-[10px] font-bold">
                            {isRtl ? 'الإجمالي' : 'Total'}
                          </span>
                          <span className="font-mono font-extrabold text-white text-xs mt-0.5 block" dir="ltr">
                            ${modalTotalPayout.toLocaleString('en-US')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80 text-xs">
                        <span className="text-neutral-400 font-bold">
                          {isRtl ? 'رصيد الخطط المتاح:' : 'Available Balance:'}
                        </span>
                        <span
                          className={`font-mono font-extrabold ${
                            isBalanceEnough ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                          dir="ltr"
                        >
                          ${userAvail.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
                        </span>
                      </div>
                    </div>

                    {errorMessage && (
                      <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span className="leading-snug">{errorMessage}</span>
                      </div>
                    )}

                    {successMessage && (
                      <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span className="font-bold">{successMessage}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setActivatingPlan(null)}
                        disabled={isSubmitting}
                        className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold transition-colors cursor-pointer"
                      >
                        {isRtl ? 'إلغاء' : 'Cancel'}
                      </button>

                      {!isBalanceEnough && onOpenDeposit ? (
                        <button
                          type="button"
                          onClick={() => {
                            setActivatingPlan(null);
                            onOpenDeposit();
                          }}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-extrabold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/15"
                        >
                          <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
                          <span>
                            {isRtl
                              ? `إيداع $${modalAmt.toLocaleString('en-US')} للتفعيل`
                              : `Deposit $${modalAmt.toLocaleString('en-US')}`}
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleConfirmActivation}
                          disabled={isSubmitting}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-extrabold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-500/15"
                        >
                          <Zap className="w-4 h-4 fill-neutral-950" />
                          <span>
                            {isSubmitting
                              ? isRtl
                                ? 'جاري التفعيل...'
                                : 'Activating...'
                              : isRtl
                              ? 'تأكيد التفعيل'
                              : 'Confirm Activation'}
                          </span>
                        </button>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
