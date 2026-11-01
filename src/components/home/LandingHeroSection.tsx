/**
 * GOLDRIX Institutional Landing Page (Shown when unauthenticated)
 * - Refined authoritative Arabic & English financial copywriting
 * - Clean Android APK Direct Download (hidden automatically after download or installation, no icon file clutter)
 * - Interactive AI Smart Trading Profit Simulator (Daily + Cycle + Total Payout)
 * - 3-Step Institutional Workflow & Security Pillars
 * - Live Global Markets + Team Referral Program + Global Regulatory Compliance Footer
 */

import React, { useState } from 'react';
import { useLanguage, Language } from '../../context/LanguageContext.tsx';
import { useTheme } from '../../context/ThemeContext.tsx';
import { useMarket } from '../../context/MarketContext.tsx';
import { GoldrixLogo } from '../common/GoldrixLogo.tsx';
import { MarketAssetIcon } from '../common/MarketAssetIcon.tsx';
import { usePWAInstall } from '../../hooks/usePWAInstall.ts';
import {
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  Globe,
  Sun,
  Moon,
  TrendingUp,
  CheckCircle2,
  ShieldCheck,
  Users,
  Wallet,
  Download,
  LogIn,
  UserPlus,
  BarChart3,
  Cpu,
  Activity,
  Lock,
  Award,
} from 'lucide-react';

interface LandingHeroSectionProps {
  onOpenAuth: (mode?: 'LOGIN' | 'REGISTER') => void;
  setCurrentTab?: (tab: string) => void;
}

interface AiStrategyItem {
  id: string;
  capital: number;
  dailyRatePct: number;
  dailyYield: number;
  totalYield: number;
  pair: string;
  labelAr: string;
  labelEn: string;
}

const AI_BOT_STRATEGIES: AiStrategyItem[] = [
  {
    id: 'ai_100',
    capital: 100,
    dailyRatePct: 3,
    dailyYield: 3.0,
    totalYield: 21.0,
    pair: 'BTC/USDT',
    labelAr: 'بيتكوين الأساسي — $100',
    labelEn: 'Bitcoin Core — $100',
  },
  {
    id: 'ai_200',
    capital: 200,
    dailyRatePct: 3,
    dailyYield: 6.0,
    totalYield: 42.0,
    pair: 'XAU/USD',
    labelAr: 'الذهب العالمي — $200',
    labelEn: 'Global Gold — $200',
  },
  {
    id: 'ai_500',
    capital: 500,
    dailyRatePct: 5,
    dailyYield: 25.0,
    totalYield: 175.0,
    pair: 'ETH/USDT',
    labelAr: 'إيثريوم المتقدم — $500',
    labelEn: 'Ethereum Pro — $500',
  },
  {
    id: 'ai_1000',
    capital: 1000,
    dailyRatePct: 6,
    dailyYield: 60.0,
    totalYield: 420.0,
    pair: 'NVDA/USD',
    labelAr: 'الذكاء الاصطناعي — $1,000',
    labelEn: 'AI Tech — $1,000',
  },
  {
    id: 'ai_2000',
    capital: 2000,
    dailyRatePct: 6.5,
    dailyYield: 130.0,
    totalYield: 910.0,
    pair: 'XAU/USD · BTC/USDT',
    labelAr: 'صناديق الاستثمار المتداولة — $2,000',
    labelEn: 'Global ETFs — $2,000',
  },
];

const LANGUAGE_LABELS: { code: Language; label: string }[] = [
  { code: 'ar', label: 'العربية' },
  { code: 'en', label: 'English' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ru', label: 'Русский' },
  { code: 'zh', label: '中文' },
];

export const LandingHeroSection: React.FC<LandingHeroSectionProps> = ({ onOpenAuth }) => {
  const { language, setLanguage, isRtl } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { tickers } = useMarket();
  const { isInstalled, install } = usePWAInstall();
  const isLight = theme === 'light';

  const [selectedStrategy, setSelectedStrategy] = useState<AiStrategyItem>(AI_BOT_STRATEGIES[1]);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);

  const handleInstallApp = async () => {
    const accepted = await install();
    if (!accepted) {
      setInstallModalOpen(true);
    }
  };

  const featuredSymbols = ['BTC/USDT', 'ETH/USDT', 'XAU/USD', 'EUR/USD', 'NVDA/USD', 'SOL/USDT'];
  const liveTickers = featuredSymbols.map((s) => tickers[s]).filter(Boolean);

  return (
    <div
      className={`min-h-screen flex flex-col justify-between transition-colors ${
        isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#06090F] text-neutral-100'
      }`}
    >
      {/* 1. Top Header Bar */}
      <header
        className={`w-full border-b ${
          isLight ? 'bg-white/95 border-slate-200' : 'bg-[#080C14]/90 border-neutral-800/80'
        } backdrop-blur-md sticky top-0 z-40`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <GoldrixLogo size="md" isLight={isLight} subtitleText="GLOBAL SMART TRADING" />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className={`h-9 w-9 flex items-center justify-center rounded-xl border transition-colors cursor-pointer ${
                isLight
                  ? 'bg-slate-100 border-slate-300 text-amber-600 hover:bg-slate-200'
                  : 'bg-neutral-900 border-neutral-800 text-amber-400 hover:bg-neutral-800'
              }`}
              aria-label="Toggle Theme"
            >
              {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {/* 8-Language Selector Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setLangMenuOpen((prev) => !prev)}
                className={`h-9 flex items-center gap-1.5 px-2.5 rounded-xl border text-xs font-mono font-bold transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-emerald-500" />
                <span className="uppercase">{language}</span>
              </button>

              {langMenuOpen && (
                <div className="absolute end-0 mt-2 w-36 rounded-xl bg-neutral-900 border border-neutral-800 shadow-2xl py-1.5 z-50">
                  {LANGUAGE_LABELS.map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => {
                        setLanguage(item.code);
                        setLangMenuOpen(false);
                      }}
                      className={`w-full px-3 py-1.5 text-xs text-start flex items-center justify-between hover:bg-neutral-800 cursor-pointer ${
                        language === item.code ? 'text-emerald-400 font-bold' : 'text-neutral-300'
                      }`}
                    >
                      <span>{item.label}</span>
                      <span className="font-mono text-[10px] uppercase opacity-70">{item.code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* 2. Institutional Hero Section + AI Smart Trading Simulator */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-14 md:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Hero Copy & CTAs */}
            <div className="lg:col-span-7 space-y-5 text-start">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>
                  {isRtl
                    ? 'منصة التداول الذكي بالذكاء الاصطناعي'
                    : 'Institutional AI Smart Trading'}
                </span>
              </div>

              <h1
                className={`text-3xl sm:text-5xl font-black tracking-tight leading-[1.16] ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}
              >
                {isRtl
                  ? 'تداول ذكي في الذهب والعملات الرقمية'
                  : 'Smart AI Trading in Gold & Crypto'}
              </h1>

              <p
                className={`text-sm sm:text-base leading-relaxed max-w-lg ${
                  isLight ? 'text-slate-600' : 'text-neutral-300'
                }`}
              >
                {isRtl
                  ? 'تداول خوارزمي آلي على مدار الساعة (24/7) في أسواق الذهب العالمي والعملات الرقمية، مع تسوية يومية للأرباح كل 24 ساعة وسحب عبر شبكة USDT TRC20.'
                  : '24/7 automated algorithmic trading in global Gold and Crypto markets with daily 24h profit settlement via USDT TRC20.'}
              </p>

              {/* Primary & Secondary Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onOpenAuth('REGISTER')}
                  className="px-7 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-extrabold text-sm transition-all shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4 stroke-[2.5]" />
                  <span>{isRtl ? 'إنشاء حساب استثماري' : 'Open Investor Account'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenAuth('LOGIN')}
                  className={`px-6 py-3.5 rounded-xl border font-extrabold text-sm transition-colors cursor-pointer flex items-center gap-2 ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100'
                      : 'bg-neutral-900 border-neutral-700 text-white hover:bg-neutral-800'
                  }`}
                >
                  <LogIn className="w-4 h-4 text-emerald-400" />
                  <span>{isRtl ? 'تسجيل الدخول' : 'Sign In'}</span>
                </button>

                {/* Single Unified App Download Option on the Landing Page */}
                {!isInstalled && (
                  <a
                    href="/api/v1/download/apk?v=3.0"
                    download="GOLDRIX-v3.0.apk"
                    className={`px-5 py-3.5 rounded-xl border font-extrabold text-sm transition-all cursor-pointer flex items-center gap-2 ${
                      isLight
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                        : 'bg-emerald-500/10 border-emerald-500/35 text-emerald-400 hover:bg-emerald-500/20'
                    }`}
                  >
                    <Download className="w-4 h-4 stroke-[2.5]" />
                    <span>{isRtl ? 'تنزيل تطبيق GOLDRIX' : 'Download GOLDRIX App'}</span>
                  </a>
                )}
              </div>

              {/* Key Institutional Metrics (No 7% reference) */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-neutral-800/80 max-w-lg">
                <div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 tabular-nums" dir="ltr">
                    100%
                  </div>
                  <div className="text-xs text-neutral-400 mt-0.5 font-medium">
                    {isRtl ? 'حماية رأس المال' : 'Capital Protection'}
                  </div>
                </div>

                <div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-white tabular-nums" dir="ltr">
                    24 / 7
                  </div>
                  <div className="text-xs text-neutral-400 mt-0.5 font-medium">
                    {isRtl ? 'تداول آلي مستمر' : '24/7 AI Execution'}
                  </div>
                </div>

                <div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-amber-400 tabular-nums" dir="ltr">
                    TRC20
                  </div>
                  <div className="text-xs text-neutral-400 mt-0.5 font-medium">
                    {isRtl ? 'سحب فوري مباشر' : 'Instant Payouts'}
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive AI Trading Robot & Profit Calculator Card */}
            <div className="lg:col-span-5">
              <div
                className={`rounded-2xl border p-5 sm:p-6 shadow-2xl space-y-5 ${
                  isLight ? 'bg-white border-slate-200' : 'bg-neutral-900/95 border-neutral-800'
                }`}
              >
                <div className="flex items-center justify-between pb-3.5 border-b border-neutral-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-extrabold text-white">
                        {isRtl ? 'حاسبة عوائد التداول الذكي' : 'Smart AI Yield Calculator'}
                      </h2>
                      <span className="text-[11px] text-neutral-400">
                        {isRtl ? 'اختر قيمة المحفظة لمعاينة العائد اليومي' : 'Select capital to preview daily returns'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-extrabold text-emerald-400 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25">
                    <Activity className="w-3.5 h-3.5" />
                    AI ENGINE
                  </span>
                </div>

                {/* Capital Amount Selector */}
                <div className="grid grid-cols-5 gap-1.5" dir="ltr">
                  {AI_BOT_STRATEGIES.map((item) => {
                    const isSelected = selectedStrategy.id === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedStrategy(item)}
                        className={`py-2 px-1.5 rounded-xl font-mono text-xs font-extrabold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500 text-neutral-950 border-emerald-400 shadow-md shadow-emerald-500/15'
                            : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        ${item.capital.toLocaleString()}
                      </button>
                    );
                  })}
                </div>

                {/* AI Robot Performance Output */}
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400 flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-amber-400" />
                      <span>{isRtl ? 'استراتيجية التداول' : 'Trading Strategy'}</span>
                    </span>
                    <span className="font-bold text-white">
                      {isRtl ? selectedStrategy.labelAr : selectedStrategy.labelEn}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-neutral-800/80">
                    <span className="text-neutral-400 flex items-center gap-1.5">
                      <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                      <strong className="text-white">
                        {isRtl
                          ? `الربح كل 24 ساعة (+${selectedStrategy.dailyRatePct}%)`
                          : `24h Net Profit (+${selectedStrategy.dailyRatePct}%)`}
                      </strong>
                    </span>
                    <span className="font-mono font-extrabold text-base text-emerald-400 tabular-nums" dir="ltr">
                      +${selectedStrategy.dailyYield.toFixed(2)} USDT
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400">
                      {isRtl ? 'الأزواج المتداولة' : 'Active Market Pairs'}
                    </span>
                    <span className="font-mono font-bold text-amber-400" dir="ltr">
                      {selectedStrategy.pair}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-neutral-800">
                    <span className="text-white font-bold">
                      {isRtl ? 'إجمالي أرباح الدورة (7 أيام)' : '7-Day Cycle Net Profit'}
                    </span>
                    <span className="font-mono font-extrabold text-sm text-white tabular-nums" dir="ltr">
                      +${selectedStrategy.totalYield.toFixed(2)} USDT
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenAuth('REGISTER')}
                  className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/15"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>
                    {isRtl ? 'تفعيل خطة التداول الذكي الآن' : 'Activate Smart Trading Plan Now'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 3. How the AI Investment System Works in 3 Institutional Steps */}
        <section className="border-t border-neutral-800/80 py-12 bg-neutral-950/40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-7">
            <div className="text-center max-w-lg mx-auto space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                {isRtl ? 'ابدأ الاستثمار في 3 خطوات' : 'Start Investing in 3 Steps'}
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400">
                {isRtl
                  ? 'خطوات سريعة ومباشرة لتفعيل محفظتك واستلام أرباحك اليومية'
                  : 'Simple, direct steps to activate your portfolio and receive daily profits'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Step 1 */}
              <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/25">
                    <ArrowDownLeft className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-xs font-extrabold text-amber-400 px-2.5 py-0.5 rounded-md bg-amber-500/10">
                    STEP 01
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-extrabold text-white">
                  {isRtl ? 'إيداع الرصيد' : 'Fund Your Wallet'}
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  {isRtl
                    ? 'اشحن محفظتك بسهولة وأمان عبر شبكة USDT (TRC20).'
                    : 'Deposit securely via USDT (TRC20) into your investment wallet.'}
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/25">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-xs font-extrabold text-emerald-400 px-2.5 py-0.5 rounded-md bg-emerald-500/10">
                    STEP 02
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-extrabold text-white">
                  {isRtl ? 'تفعيل خطة التداول' : 'Activate AI Plan'}
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  {isRtl
                    ? 'اختر الباقة المناسبة ليتولى محرك الذكاء الاصطناعي التداول آلياً 24/7.'
                    : 'Choose your plan and let the AI engine trade Gold and Crypto 24/7.'}
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-5 rounded-2xl bg-neutral-900 border border-emerald-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 text-neutral-950 flex items-center justify-center shadow-md shadow-emerald-500/20">
                    <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <span className="font-mono text-xs font-extrabold text-emerald-400 px-2.5 py-0.5 rounded-md bg-emerald-500/10">
                    STEP 03
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-extrabold text-white">
                  {isRtl ? 'سحب الأرباح يومياً' : 'Withdraw Daily Profits'}
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  {isRtl
                    ? 'تُضاف أرباح الخطة تلقائياً بعد إتمام كل 24 ساعة عمل مع إمكانية السحب عبر USDT TRC20.'
                    : 'Plan profits settle automatically every 24 hours of operation for USDT TRC20 withdrawal.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Institutional Security, AI Architecture & Compliance Pillars */}
        <section className="border-t border-neutral-800/80 py-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-7">
            <div className="text-center max-w-lg mx-auto space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                {isRtl ? 'الأمان المؤسسي وكفاءة التنفيذ' : 'Institutional Security & Execution'}
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400">
                {isRtl
                  ? 'حماية متكاملة للأصول وتنفيذ خوارزمي فائق السرعة'
                  : 'Multi-layer asset protection paired with high-speed algorithmic execution'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Pillar 1 */}
              <div className="p-5 rounded-2xl bg-neutral-900 border border-emerald-500/25 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-[11px] font-extrabold text-emerald-400">QUANT AI</span>
                </div>
                <h3 className="text-sm font-extrabold text-white">
                  {isRtl ? 'تداول خوارزمي ذكي' : 'Smart Quantitative AI'}
                </h3>
                <div className="space-y-2 text-xs text-neutral-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      {isRtl
                        ? 'تحليل لحظي لسيولة الذهب والبيتكوين.'
                        : 'Real-time Gold & Bitcoin liquidity analysis.'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      {isRtl
                        ? 'إدارة مخاطر آلية لحماية رأس المال.'
                        : 'Automated risk controls & capital protection.'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pillar 2 */}
              <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                    <Lock className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-[11px] font-extrabold text-amber-400">MPC VAULT</span>
                </div>
                <h3 className="text-sm font-extrabold text-white">
                  {isRtl ? 'حفظ بارد وتشفير متقدم' : 'MPC Cold Storage'}
                </h3>
                <div className="space-y-2 text-xs text-neutral-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      {isRtl
                        ? 'تأمين الأصول في خزائن باردة متعددة التوقيع.'
                        : 'Multi-signature MPC cold storage vaults.'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      {isRtl
                        ? 'تشفير كامل للمعاملات بمعيار AES-256.'
                        : 'End-to-end AES-256 transaction encryption.'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pillar 3 */}
              <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-[11px] font-extrabold text-emerald-400">INSTANT PAY</span>
                </div>
                <h3 className="text-sm font-extrabold text-white">
                  {isRtl ? 'تسوية وسحب فوري' : 'Instant Settlement'}
                </h3>
                <div className="space-y-2 text-xs text-neutral-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      {isRtl
                        ? 'إيداع وسحب سريع عبر شبكة USDT TRC20.'
                        : 'Fast deposits & payouts via USDT TRC20.'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      {isRtl
                        ? 'سجل مالي شفاف يوثق كافة العمليات.'
                        : 'Transparent ledger tracking all transactions.'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Live Global Markets & Team Referral Program */}
        <section id="live-markets" className="border-t border-neutral-800/80 py-14 bg-neutral-950/40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Live Market Prices */}
            <div className="lg:col-span-7 p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-base font-extrabold text-white">
                    {isRtl ? 'مؤشرات الأسواق العالمية المباشرة' : 'Live Global Market Quotes'}
                  </h3>
                </div>
                <span className="text-xs font-mono text-neutral-400">
                  Crypto · Spot Gold · Forex · Equities
                </span>
              </div>

              <div className="divide-y divide-neutral-800">
                {liveTickers.map((t) => {
                  const isPos = t.change24h >= 0;
                  return (
                    <div
                      key={t.symbol}
                      onClick={() => onOpenAuth('LOGIN')}
                      className="py-3 flex items-center justify-between hover:bg-neutral-800/50 px-2 -mx-2 rounded-xl cursor-pointer transition-colors"
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
                          <div className="text-xs font-bold text-white font-mono">
                            {t.baseAsset}/{t.quoteAsset}
                          </div>
                          <div className="text-[11px] text-neutral-400">
                            {isRtl ? t.nameAr : t.nameEn}
                          </div>
                        </div>
                      </div>

                      <div className="text-end font-mono tabular-nums" dir="ltr">
                        <div className="text-xs sm:text-sm font-bold text-white">
                          ${t.price.toLocaleString('en-US', { minimumFractionDigits: t.price < 10 ? 4 : 2 })}
                        </div>
                        <div className={`text-[11px] font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isPos ? '+' : ''}
                          {t.change24h}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Team Referral Program Card */}
            <div className="lg:col-span-5 p-6 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/25">
                    <Users className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 font-mono text-[11px] font-extrabold">
                    VIP 1 – VIP 7
                  </span>
                </div>

                <h3 className="text-lg font-extrabold text-white">
                  {isRtl ? 'برنامج شركاء النجاح' : 'Partner Referral Program'}
                </h3>

                <p className="text-xs text-neutral-300 leading-relaxed">
                  {isRtl
                    ? 'شارك كود الدعوة واحصل على مكافآت فورية وعمولات يومية مباشرة:'
                    : 'Share your invite code to earn instant bonuses and daily profit share:'}
                </p>

                <div className="space-y-3 pt-1">
                  <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <span className="text-xs text-neutral-300 font-bold">
                      {isRtl ? 'مكافأة استثمار المباشرين' : 'Direct Referral Bonus'}
                    </span>
                    <span className="font-mono font-extrabold text-emerald-400 text-sm" dir="ltr">
                      +$10 / $100 USDT
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <span className="text-xs text-neutral-300 font-bold">
                      {isRtl ? 'عمولة أرباح الفريق اليومية' : 'Daily Team Profit Share'}
                    </span>
                    <span className="font-mono font-extrabold text-amber-400 text-sm" dir="ltr">
                      3% – 30% (VIP)
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onOpenAuth('REGISTER')}
                className="w-full py-3.5 rounded-xl bg-white hover:bg-neutral-200 text-neutral-950 font-extrabold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <span>{isRtl ? 'انضم الآن وابدأ ببناء فريقك' : 'Join Now & Start Earning'}</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Institutional Compliance Footer */}
      <footer
        className={`py-8 text-xs border-t ${
          isLight ? 'bg-white border-slate-200 text-slate-500' : 'bg-[#080C14] border-neutral-800/80 text-neutral-400'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-neutral-800/70">
            <div className="flex items-center gap-2 text-neutral-300 font-bold">
              <Award className="w-4 h-4 text-amber-400" />
              <span>
                {isRtl
                  ? 'التراخيص والامتثال التنظيمي الدولي:'
                  : 'Global Regulatory Licenses & Compliance:'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]" dir="ltr">
              <span className="px-2.5 py-1 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-300">
                ASIC & AUSTRAC #DCE-1006842
              </span>
              <span className="px-2.5 py-1 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-300">
                CySEC CIF #418/22
              </span>
              <span className="px-2.5 py-1 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-300">
                EU MiCA & MiFID II
              </span>
              <span className="px-2.5 py-1 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-300">
                FinCEN MSB #31000241985204
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="font-mono text-neutral-500">
              &copy; {new Date().getFullYear()} GOLDRIX CAPITAL & MARKETS LTD. ALL RIGHTS RESERVED.
            </span>
            <div className="flex items-center gap-4 font-bold">
              <button
                type="button"
                onClick={() => onOpenAuth('LOGIN')}
                className="hover:text-emerald-400 transition-colors cursor-pointer"
              >
                {isRtl ? 'تسجيل الدخول' : 'Sign In'}
              </button>
              <span>&bull;</span>
              <button
                type="button"
                onClick={() => onOpenAuth('REGISTER')}
                className="hover:text-emerald-400 transition-colors cursor-pointer"
              >
                {isRtl ? 'إنشاء حساب استثماري' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};


