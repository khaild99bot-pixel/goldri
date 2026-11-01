/**
 * GOLDRIX Investment Plans & Strategy Activation Page
 * Mobile-First, Android-Optimized Luxury Trading Interface
 * 6 Fixed USDT Plans: 100, 200, 500, 1,000, 2,000, 3,000 USDT.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { InvestmentPlan, UserInvestment } from '../../types/index.ts';
import { getPlanDailyRatePercent } from '../common/PlanSectorBadge.tsx';
import {
  Clock,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  DollarSign,
  AlertCircle,
  X,
  Lock,
  CheckCircle2,
  BarChart2,
  Sparkles,
  Zap,
} from 'lucide-react';

interface InvestmentPlansPageProps {
  setCurrentTab: (tab: string) => void;
  onOpenKYC: () => void;
}

// Mini Japanese Candlestick Chart for plan cards
const MiniPlanCandles: React.FC<{ planId: string; height?: number }> = ({ planId, height = 56 }) => {
  // Deterministic seed candles based on planId for consistent realistic market movement
  const candles = useMemo(() => {
    const seedMap: Record<string, number[]> = {
      plan_100: [100, 102, 101, 103, 102.5, 104, 103.8, 105.2, 104.5, 106, 105.8, 107.2],
      plan_200: [200, 199, 201.5, 201, 203.2, 202.8, 205, 204.2, 206.8, 206.1, 208.5, 209.4],
      plan_500: [500, 504, 502, 508, 506.5, 511, 509.8, 515.2, 513.5, 519, 518.2, 523.5],
      plan_1000: [1000, 995, 1008, 1004, 1016, 1012, 1024, 1020, 1032, 1028, 1041, 1048],
      plan_2000: [2000, 2015, 2008, 2028, 2022, 2040, 2035, 2055, 2048, 2068, 2062, 2084],
      plan_3000: [3000, 2990, 3020, 3012, 3045, 3038, 3072, 3065, 3098, 3090, 3122, 3140],
    };

    const baseSeries = seedMap[planId] || seedMap.plan_100;
    return baseSeries.map((close, i) => {
      const prev = i > 0 ? baseSeries[i - 1] : close * 0.995;
      const open = prev;
      const isGreen = close >= open;
      const high = Math.max(open, close) + Math.abs(close - open) * 0.45;
      const low = Math.min(open, close) - Math.abs(close - open) * 0.45;
      return { open, close, high, low, isGreen };
    });
  }, [planId]);

  const minVal = Math.min(...candles.map((c) => c.low));
  const maxVal = Math.max(...candles.map((c) => c.high));
  const range = maxVal - minVal || 1;

  const svgWidth = 180;
  const candleWidth = 7;
  const spacing = svgWidth / candles.length;

  return (
    <div className="w-full flex items-center justify-center py-1">
      <svg width={svgWidth} height={height} className="overflow-visible">
        {candles.map((c, idx) => {
          const x = idx * spacing + spacing / 2;
          const yHigh = height - ((c.high - minVal) / range) * (height - 8) - 4;
          const yLow = height - ((c.low - minVal) / range) * (height - 8) - 4;
          const yOpen = height - ((c.open - minVal) / range) * (height - 8) - 4;
          const yClose = height - ((c.close - minVal) / range) * (height - 8) - 4;
          const rectY = Math.min(yOpen, yClose);
          const rectHeight = Math.max(2, Math.abs(yClose - yOpen));
          const color = c.isGreen ? '#10b981' : '#f43f5e';

          return (
            <g key={idx}>
              {/* Wick */}
              <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth={1.2} opacity={0.8} />
              {/* Candle Body */}
              <rect
                x={x - candleWidth / 2}
                y={rectY}
                width={candleWidth}
                height={rectHeight}
                fill={color}
                rx={1}
                className="transition-all"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export const InvestmentPlansPage: React.FC<InvestmentPlansPageProps> = ({
  setCurrentTab,
  onOpenKYC,
}) => {
  const { user, balances, refreshBalances } = useAuth();
  const { t, isRtl } = useLanguage();
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [userInvestments, setUserInvestments] = useState<UserInvestment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTimeMs, setCurrentTimeMs] = useState(Date.now());

  // Strategy Details Modal
  const [selectedPlanDetails, setSelectedPlanDetails] = useState<InvestmentPlan | null>(null);

  // Strategy Confirmation Modal
  const [activatingPlan, setActivatingPlan] = useState<InvestmentPlan | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    const timer = setInterval(() => setCurrentTimeMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [plansData, investmentsData] = await Promise.all([
        api.getInvestmentPlans(),
        user ? api.getUserInvestments() : Promise.resolve([]),
      ]);
      setPlans(plansData);
      setUserInvestments(investmentsData);
    } catch (err) {
      console.error('Failed to load plans:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getLocalizedPlanName = (planId: string, defaultName: string) => {
    const key = `${planId}_name`;
    const translated = t(key);
    return translated !== key ? translated : defaultName;
  };

  const getLocalizedPlanDesc = (planId: string, defaultDesc: string) => {
    const key = `${planId}_desc`;
    const translated = t(key);
    return translated !== key ? translated : defaultDesc;
  };

  const getActiveInvestmentForPlan = (planId: string) => {
    return userInvestments.find((inv) => inv.planId === planId && inv.status === 'ACTIVE');
  };

  const formatCountdown = (endTimeIso: string) => {
    const remaining = new Date(endTimeIso).getTime() - currentTimeMs;
    if (remaining <= 0) return isRtl ? 'اكتملت الخطة' : 'Matured';
    const d = Math.floor(remaining / 86400000);
    const h = Math.floor((remaining % 86400000) / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    return `${d}d ${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  };

  const calculateProgress = (startTimeIso: string, endTimeIso: string) => {
    const start = new Date(startTimeIso).getTime();
    const end = new Date(endTimeIso).getTime();
    const elapsed = currentTimeMs - start;
    const total = end - start;
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  };

  const handleOpenActivate = (plan: InvestmentPlan) => {
    setActivatingPlan(plan);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleConfirmActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activatingPlan) return;

    if (!user) {
      setErrorMessage(isRtl ? 'يرجى تسجيل الدخول لتفعيل الخطة' : 'Please sign in to activate this plan');
      return;
    }

    const planAmount = Number(activatingPlan.fixedAmount || activatingPlan.minAmount);
    const userBalance = balances ? Number(balances.available[activatingPlan.asset] || 0) : 0;

    if (userBalance < planAmount) {
      setErrorMessage(
        isRtl
          ? `رصيدك المتاح (${userBalance.toLocaleString('en-US')} ${activatingPlan.asset}) غير كافٍ. يرجى إيداع ${planAmount.toLocaleString('en-US')} ${activatingPlan.asset}.`
          : `Insufficient available balance (${userBalance.toLocaleString('en-US')} ${activatingPlan.asset}). Please deposit first.`
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await api.activateInvestment(activatingPlan.id, planAmount.toString());
      await refreshBalances();
      await loadData();
      setSuccessMessage(
        isRtl
          ? `تم تفعيل الخطة بنجاح بمبلغ ${planAmount.toLocaleString('en-US')} USDT!`
          : `Plan activated successfully for ${planAmount.toLocaleString('en-US')} USDT!`
      );
      setTimeout(() => {
        setActivatingPlan(null);
        setCurrentTab('portfolio');
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل تفعيل الخطة');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-emerald-950/40 rounded-2xl border border-neutral-800 p-5 md:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold mb-2">
              <Zap className="w-3.5 h-3.5" />
              <span>{isRtl ? 'خطط التداول الذكي الآلي' : 'Automated Smart Investment Plans'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {isRtl ? 'خطط الاستثمار المباشرة' : 'Investment Plans'}
            </h1>
            <p className="text-xs text-neutral-400 mt-1 max-w-2xl leading-relaxed">
              {isRtl
                ? 'ست خطط تداول خوارزمية بمبالغ محددة مع إضافة الأرباح تلقائياً كل 24 ساعة عمل وحماية رأس المال.'
                : 'Six fixed algorithmic trading plans with automatic profit settlement every 24 hours of operation.'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setCurrentTab('portfolio')}
              className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-850 text-emerald-400 border border-neutral-800 hover:border-emerald-500/30 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>{isRtl ? 'الأصول والمحفظة' : 'Assets & Portfolio'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Plans Grid: 6 Fixed Plans */}
      {isLoading ? (
        <div className="py-20 text-center text-xs text-neutral-500 font-mono">
          {isRtl ? 'جاري تحميل خطط الاستثمار...' : 'Loading plans...'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {plans.map((plan) => {
            const activeInv = getActiveInvestmentForPlan(plan.id);
            const planAmount = Number(plan.fixedAmount || plan.minAmount);
            const userAvailable = balances ? Number(balances.available[plan.asset] || 0) : 0;
            const hasEnough = userAvailable >= planAmount;

            return (
              <div
                key={plan.id}
                className={`bg-neutral-900 rounded-2xl border transition-all p-5 flex flex-col justify-between space-y-4 shadow-xl relative overflow-hidden group ${
                  activeInv
                    ? 'border-emerald-500/50 shadow-emerald-500/10'
                    : 'border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {/* Active Indicator Ribbon if user has activated this plan */}
                {activeInv && (
                  <div className="absolute top-0 right-0 bg-emerald-500 text-neutral-950 text-[10px] font-extrabold px-3 py-0.5 rounded-bl-lg shadow-md flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-950 animate-ping" />
                    <span>{isRtl ? 'خطة نشطة تعمل الآن' : 'ACTIVE'}</span>
                  </div>
                )}

                {/* Top Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-400 flex items-center gap-1 font-medium bg-neutral-950 px-2.5 py-1 rounded-lg border border-neutral-800">
                      <Clock className="w-3.5 h-3.5 text-neutral-400" />
                      <span>{plan.durationDays} {isRtl ? 'أيام' : 'Days'}</span>
                    </span>
                    <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                      USDT TRC20
                    </span>
                  </div>

                  {/* Plan Name */}
                  <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
                    {getLocalizedPlanName(plan.id, plan.name)}
                  </h3>

                  {/* Prominent Amount */}
                  <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 flex items-baseline justify-between">
                    <span className="text-xs text-neutral-400">{isRtl ? 'مبلغ الاستثمار:' : 'Investment:'}</span>
                    <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400 flex items-baseline gap-1" dir="ltr">
                      <span>{planAmount.toLocaleString('en-US')}</span>
                      <span className="text-xs font-bold text-neutral-400">USDT</span>
                    </div>
                  </div>

                  {/* Daily Return Rate */}
                  <div className="p-2.5 bg-neutral-950/80 rounded-xl border border-neutral-800/80 text-xs space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400">{isRtl ? 'العائد اليومي (24h):' : 'Daily Return (24h):'}</span>
                      <span className="text-emerald-400 font-bold font-mono" dir="ltr">
                        +{getPlanDailyRatePercent(plan.id, planAmount, plan.estimatedAprMin)}% (+$
                        {((planAmount * getPlanDailyRatePercent(plan.id, planAmount, plan.estimatedAprMin)) / 100).toFixed(2)})
                      </span>
                    </div>
                  </div>

                  {/* Mini Candlestick Chart */}
                  <div className="bg-neutral-950/60 rounded-xl p-2 border border-neutral-800/60">
                    <div className="flex items-center justify-between text-[10px] text-neutral-400 px-1 mb-1">
                      <span className="flex items-center gap-1 font-mono">
                        <BarChart2 className="w-3 h-3 text-emerald-400" />
                        <span>{isRtl ? 'شموع يابانية تتبعية' : 'Candlestick Tracking'}</span>
                      </span>
                      <span className="text-emerald-400 font-semibold font-mono">+7.2% Vol</span>
                    </div>
                    <MiniPlanCandles planId={plan.id} />
                  </div>

                  {/* Time Progress Bar or Countdown */}
                  {activeInv ? (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-1.5 text-xs">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-emerald-300 font-medium">{isRtl ? 'المؤقت التنازلي:' : 'Countdown:'}</span>
                        <span className="font-mono text-emerald-400 font-bold tabular-nums">
                          {formatCountdown(activeInv.scheduledEndTime)}
                        </span>
                      </div>
                      <div className="w-full bg-neutral-950 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-400 h-full rounded-full transition-all duration-1000"
                          style={{ width: `${calculateProgress(activeInv.startTime, activeInv.scheduledEndTime)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
                        <span>{calculateProgress(activeInv.startTime, activeInv.scheduledEndTime)}% {isRtl ? 'مكتمل' : 'done'}</span>
                        <span>{activeInv.durationDays}d total</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-neutral-400">
                        <span>{isRtl ? 'الجدول الزمني للخطة:' : 'Plan Duration:'}</span>
                        <span className="text-neutral-300 font-mono">{plan.durationDays} {isRtl ? 'يوماً' : 'days'}</span>
                      </div>
                      <div className="w-full bg-neutral-950 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-neutral-800 h-full rounded-full w-full" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons: «التفاصيل» and «تفعيل الخطة» */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-800/80">
                  <button
                    type="button"
                    onClick={() => setSelectedPlanDetails(plan)}
                    className="py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>{isRtl ? 'التفاصيل' : 'Details'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenActivate(plan)}
                    className="py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold transition-all shadow-lg shadow-emerald-500/15 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>{isRtl ? 'تفعيل الخطة' : 'Activate Plan'}</span>
                    <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Central Confirmation Modal before Plan Activation */}
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
              className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl relative animate-modalIn my-auto"
            >
              <button
                type="button"
                onClick={() => setActivatingPlan(null)}
                className="absolute top-4 end-4 p-1 rounded-lg text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Title */}
              <div>
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 mb-2">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h2 className="text-base font-bold text-white">
                  {isRtl ? 'تأكيد تفعيل الخطة' : 'Confirm Plan Activation'}
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {getLocalizedPlanName(activatingPlan.id, activatingPlan.name)}
                </p>
              </div>

              {errorMessage && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Summary Information Box */}
              <div className="space-y-2 bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-neutral-850">
                  <span className="text-neutral-400">{isRtl ? 'قيمة الخطة:' : 'Amount:'}</span>
                  <span className="text-base font-mono font-bold text-emerald-400" dir="ltr">
                    ${Number(activatingPlan.fixedAmount).toLocaleString('en-US')} USDT
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-neutral-850">
                  <span className="text-neutral-400">{isRtl ? 'مدة الخطة:' : 'Duration:'}</span>
                  <span className="text-white font-semibold">{activatingPlan.durationDays} {isRtl ? 'أيام' : 'Days'}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-neutral-850">
                  <span className="text-neutral-400">{isRtl ? 'الربح كل 24 ساعة:' : '24h Profit:'}</span>
                  <span className="text-emerald-400 font-semibold font-mono" dir="ltr">
                    +{getPlanDailyRatePercent(activatingPlan.id, Number(activatingPlan.fixedAmount), activatingPlan.estimatedAprMin)}% / 24h
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-neutral-400">{isRtl ? 'رصيدك المتاح:' : 'Available Balance:'}</span>
                  <span className="text-white font-mono font-semibold" dir="ltr">
                    ${balances ? Number(balances.available.USDT || 0).toLocaleString('en-US') : '0'} USDT
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setActivatingPlan(null)}
                  className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold cursor-pointer"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmActivation}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold transition-all shadow-lg shadow-emerald-500/15 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting
                    ? (isRtl ? 'جاري التفعيل...' : 'Activating...')
                    : (isRtl ? 'تأكيد التفعيل' : 'Confirm Activation')}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Strategy Details Central Modal */}
      {selectedPlanDetails &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            onClick={() => setSelectedPlanDetails(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              dir={isRtl ? 'rtl' : 'ltr'}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl relative animate-modalIn my-auto"
            >
              <button
                type="button"
                onClick={() => setSelectedPlanDetails(null)}
                className="absolute top-4 end-4 p-1 rounded-lg text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                <span className="text-xs px-2.5 py-0.5 rounded-lg border font-semibold text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                  {isRtl ? 'خطة تداول ذكي' : 'Smart Trading Plan'}
                </span>
                <h2 className="text-lg font-bold text-white mt-2">
                  {getLocalizedPlanName(selectedPlanDetails.id, selectedPlanDetails.name)}
                </h2>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  {getLocalizedPlanDesc(selectedPlanDetails.id, selectedPlanDetails.description)}
                </p>
              </div>

              <div className="space-y-2 bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 text-xs">
                <div className="flex justify-between py-1 border-b border-neutral-850">
                  <span className="text-neutral-400">{isRtl ? 'مبلغ الاستثمار:' : 'Amount:'}</span>
                  <span className="text-emerald-400 font-bold font-mono text-sm" dir="ltr">${Number(selectedPlanDetails.fixedAmount).toLocaleString('en-US')} USDT</span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-850">
                  <span className="text-neutral-400">{isRtl ? 'مدة الخطة:' : 'Duration:'}</span>
                  <span className="text-white font-semibold">{selectedPlanDetails.durationDays} {isRtl ? 'أيام' : 'Days'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-neutral-400">{isRtl ? 'العائد اليومي:' : 'Daily Profit:'}</span>
                  <span className="text-emerald-400 font-semibold font-mono" dir="ltr">
                    +{getPlanDailyRatePercent(selectedPlanDetails.id, Number(selectedPlanDetails.fixedAmount), selectedPlanDetails.estimatedAprMin)}% / 24h
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedPlanDetails(null)}
                  className="px-4 py-2 text-xs rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 cursor-pointer"
                >
                  {isRtl ? 'إغلاق' : 'Close'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const p = selectedPlanDetails;
                    setSelectedPlanDetails(null);
                    handleOpenActivate(p);
                  }}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 cursor-pointer shadow-lg shadow-emerald-500/15"
                >
                  {isRtl ? 'تفعيل الخطة الآن' : 'Activate Plan Now'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

    </div>
  );
};
