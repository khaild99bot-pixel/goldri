/**
 * GOLDRIX Smart Trading & Investment Plans (خطط التداول الذكي)
 * - Rectangular card layout (1 column on mobile, 2 on tablet, 3 on desktop)
 * - +7% profit every 24 hours across all 6 fixed plans ($100, $200, $500, $1,000, $2,000, $3,000 USDT)
 * - Zero auto-refresh flicker: silent background sync, stable card rendering, and active-only countdown timer
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { api } from '../../services/api.ts';
import { InvestmentPlan, UserInvestment } from '../../types/index.ts';
import {
  PlanThumbnailIcon,
  getPlanSectorMeta,
  getPlanDailyRatePercent,
  CumulativeProfitCounter,
  computeFixedIntervalPlanProfit,
} from '../common/PlanSectorBadge.tsx';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Zap,
  ArrowDownLeft,
  ShieldCheck,
} from 'lucide-react';

interface SmartTradingPageProps {
  setCurrentTab: (tab: string) => void;
  onOpenDeposit?: () => void;
  onOpenKYC?: () => void;
}

export const SmartTradingPage: React.FC<SmartTradingPageProps> = ({
  onOpenDeposit,
}) => {
  const { user, balances, refreshBalances } = useAuth();
  const { isRtl, language } = useLanguage();

  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [userInvestments, setUserInvestments] = useState<UserInvestment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTimeMs, setCurrentTimeMs] = useState(() => Date.now());
  const hasLoadedOnceRef = useRef(false);

  const [activatingPlan, setActivatingPlan] = useState<InvestmentPlan | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadSmartTradingData = useCallback(async (silent = false) => {
    if (!silent && !hasLoadedOnceRef.current) {
      setIsLoading(true);
    }
    try {
      const [plansData, investmentsData] = await Promise.all([
        api.getInvestmentPlans(),
        user?.id ? api.getUserInvestments() : Promise.resolve([]),
      ]);
      if (plansData) {
        setPlans((prev) =>
          JSON.stringify(prev) === JSON.stringify(plansData) ? prev : plansData
        );
      }
      const ownInvestments = (investmentsData || []).filter(
        (inv) => user?.id && inv.userId === user.id
      );
      setUserInvestments((prev) =>
        JSON.stringify(prev) === JSON.stringify(ownInvestments) ? prev : ownInvestments
      );
      hasLoadedOnceRef.current = true;
    } catch (err) {
      console.error('Failed to load smart trading data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Load plans only when user?.id changes (never on background user object reference updates)
  useEffect(() => {
    loadSmartTradingData(hasLoadedOnceRef.current);
  }, [loadSmartTradingData]);

  // Run 1000ms timer for active countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Lock background scroll & allow Escape key when modal is open
  useEffect(() => {
    if (!activatingPlan) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        setActivatingPlan(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activatingPlan, isSubmitting]);

  const formatCountdown = (endTimeIso: string) => {
    const remaining = new Date(endTimeIso).getTime() - currentTimeMs;
    if (remaining <= 0) return isRtl ? 'مكتملة' : 'Done';
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

  const getUserInvestmentForPlan = (planId: string) => {
    return userInvestments.find((inv) => inv.planId === planId);
  };

  const handleOpenActivate = (plan: InvestmentPlan) => {
    if (getUserInvestmentForPlan(plan.id)) return;
    setActivatingPlan(plan);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleConfirmActivation = async (e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activatingPlan || isSubmitting) return;

    if (!user) {
      setErrorMessage(isRtl ? 'يرجى تسجيل الدخول أولاً' : 'Please sign in first');
      return;
    }

    if (getUserInvestmentForPlan(activatingPlan.id)) {
      setErrorMessage(isRtl ? 'الخطة مفعلة مسبقاً' : 'Plan already active');
      return;
    }

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
      await loadSmartTradingData(true);
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
      {/* Compact Visual Header with Balance Pills */}
      <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-4 sm:p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                {isRtl ? 'خطط التداول الذكي' : 'Smart Trading Plans'}
              </h1>
              <span className="text-xs font-bold text-emerald-400 font-mono">
                {isRtl
                  ? 'ينزل الربح للسحب كل 24 ساعة عمل للخطة'
                  : 'Profits drop every 24h of plan operation'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="flex-1 sm:flex-initial flex items-center justify-between gap-3 bg-neutral-950 px-3.5 py-2.5 rounded-xl border border-amber-500/20">
              <span className="text-xs text-neutral-300 font-bold">
                {isRtl ? 'رصيد الخطط' : 'Plans Balance'}
              </span>
              <span className="font-mono font-extrabold text-amber-400 text-sm sm:text-base" dir="ltr">
                ${balances ? Number(balances.available.USDT || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
              </span>
            </div>

            <div className="flex-1 sm:flex-initial flex items-center justify-between gap-3 bg-neutral-950 px-3.5 py-2.5 rounded-xl border border-emerald-500/20">
              <div className="flex items-center gap-1.5 text-xs text-neutral-300 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isRtl ? 'متاح للسحب' : 'Withdrawable'}</span>
              </div>
              <span className="font-mono font-extrabold text-emerald-400 text-sm sm:text-base" dir="ltr">
                ${balances ? Number(balances.withdrawableUSDT || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Plans Rectangular Cards Grid (1 col mobile, 2 cols md, 3 cols lg) */}
      {isLoading && plans.length === 0 ? (
        <div className="py-20 text-center text-xs text-neutral-400 font-mono">
          {isRtl ? 'جاري تحميل خطط الاستثمار...' : 'Loading investment plans...'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const existingInv = getUserInvestmentForPlan(plan.id);
            const activeInv = existingInv?.status === 'ACTIVE' ? existingInv : undefined;
            const isLocked = Boolean(existingInv);
            const planAmount = Number(plan.fixedAmount || plan.minAmount);
            const dailyRatePct = getPlanDailyRatePercent(plan.id, planAmount, plan.estimatedAprMin);
            const dailyProfit = (planAmount * dailyRatePct) / 100;
            const netProfit = dailyProfit * Math.max(1, plan.durationDays);
            const totalPayout = planAmount + netProfit;
            const sectorMeta = getPlanSectorMeta(plan.id, planAmount, plan.name);

            return (
              <div
                key={plan.id}
                className={`bg-neutral-900 rounded-2xl border transition-colors p-4 sm:p-5 flex flex-col justify-between space-y-3.5 shadow-xl relative overflow-hidden group ${
                  activeInv
                    ? 'border-emerald-500/60 shadow-emerald-500/10'
                    : isLocked
                    ? 'border-neutral-800 opacity-80'
                    : 'border-neutral-800 hover:border-emerald-500/40'
                }`}
              >
                <div className="space-y-3">
                  {/* Rectangular Header: Thumbnail + Sector Title + Ticker & Duration */}
                  <div className="flex items-center justify-between gap-3 pb-3 border-b border-neutral-800/90">
                    <div className="flex items-center gap-3 min-w-0">
                      <PlanThumbnailIcon
                        planId={plan.id}
                        amount={planAmount}
                        planName={plan.name}
                        size="md"
                      />
                      <div className="min-w-0">
                        <h3 className="text-sm font-extrabold text-white truncate">
                          {isRtl ? sectorMeta.nameAr : sectorMeta.nameEn}
                        </h3>
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 rounded-md bg-neutral-950 border ${sectorMeta.badgeBorder} ${sectorMeta.badgeText} font-mono text-[10px] font-bold tracking-wide`}
                          dir="ltr"
                        >
                          {sectorMeta.ticker}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-xl font-mono" dir="ltr">
                        +{dailyRatePct}% / 24h
                      </span>
                      <span className="text-[11px] text-neutral-300 flex items-center gap-1 font-bold">
                        <Clock className="w-3 h-3 text-emerald-400" />
                        <span>
                          {plan.durationDays}{' '}
                          {language === 'ar' ? 'أيام' : 'Days'}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Rectangular Amount & Profit Strip */}
                  <div className="p-3.5 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-neutral-400 font-bold block">
                        {isRtl ? 'قيمة الخطة' : 'Plan Amount'}
                      </span>
                      <div className="text-2xl font-extrabold font-mono text-white tracking-tight" dir="ltr">
                        ${planAmount.toLocaleString('en-US')}{' '}
                        <span className="text-xs font-bold text-emerald-400">USDT</span>
                      </div>
                    </div>

                    <div className="text-end">
                      <span className="text-[11px] text-neutral-400 font-bold block">
                        {isRtl ? 'الربح كل 24 ساعة' : 'Profit / 24h'}
                      </span>
                      <span className="text-lg font-extrabold font-mono text-emerald-400" dir="ltr">
                        +${dailyProfit.toFixed(2)} USDT
                      </span>
                    </div>
                  </div>

                  {/* Clean 2-Column Return Summary */}
                  <div className="px-3.5 py-2.5 bg-neutral-950/90 rounded-xl border border-neutral-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-neutral-400 block text-[11px]">
                        {isRtl ? `إجمالي الربح (${plan.durationDays} يوم)` : `Total Profit (${plan.durationDays}d)`}
                      </span>
                      <span className="text-emerald-400 font-extrabold font-mono text-sm" dir="ltr">
                        +${netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
                      </span>
                    </div>

                    <div className="text-end">
                      <span className="text-neutral-400 block text-[11px]">
                        {isRtl ? 'الإجمالي المستلم' : 'Total Return'}
                      </span>
                      <span className="text-white font-extrabold font-mono text-sm" dir="ltr">
                        ${totalPayout.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
                      </span>
                    </div>
                  </div>

                  {/* Active Plan Fixed-Interval Cumulative Profit Counter */}
                  {activeInv && (() => {
                    const fixedProfit = computeFixedIntervalPlanProfit(
                      activeInv.startTime,
                      activeInv.scheduledEndTime,
                      dailyProfit,
                      plan.durationDays,
                      currentTimeMs
                    );
                    return (
                      <CumulativeProfitCounter
                        accruedUSDT={fixedProfit.accruedUSDT}
                        dailyProfitUSDT={dailyProfit}
                        totalTargetProfitUSDT={netProfit}
                        dailyRatePct={dailyRatePct}
                        cycleProgressPct={calculateProgress(activeInv.startTime, activeInv.scheduledEndTime)}
                        remainingText={formatCountdown(activeInv.scheduledEndTime)}
                        nextDropText={formatNext24hDrop(activeInv.startTime)}
                        isRtl={isRtl}
                      />
                    );
                  })()}
                </div>

                {/* Action Button */}
                <div>
                  {isLocked ? (
                    <button
                      type="button"
                      disabled
                      className="w-full py-2.5 px-4 rounded-xl bg-neutral-950 border border-emerald-500/30 text-emerald-400 text-xs font-extrabold flex items-center justify-center gap-2 cursor-not-allowed"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>
                        {activeInv
                          ? isRtl
                            ? 'مفعلة • قيد التقدم'
                            : 'Active • In Progress'
                          : isRtl
                          ? 'مكتملة'
                          : 'Completed'}
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenActivate(plan)}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-emerald-500/15"
                    >
                      <Zap className="w-4 h-4 fill-neutral-950" />
                      <span>
                        {isRtl
                          ? `تفعيل خطة $${planAmount.toLocaleString('en-US')}`
                          : `Activate $${planAmount.toLocaleString('en-US')}`}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Portal-Rendered Plan Activation Popup Modal */}
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
              {/* Modal Top Bar */}
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
                  className="p-1.5 rounded-lg bg-neutral-800/80 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
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
                    {/* Selected Plan Card Banner */}
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

                      {/* Key Metrics Grid */}
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

                      {/* User Available Balance Row */}
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

                    {/* Error or Insufficient Balance Alert */}
                    {errorMessage && (
                      <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span className="leading-snug">{errorMessage}</span>
                      </div>
                    )}

                    {/* Success Alert */}
                    {successMessage && (
                      <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span className="font-bold">{successMessage}</span>
                      </div>
                    )}

                    {/* Action Buttons */}
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
