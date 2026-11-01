/**
 * GOLDRIX Partner Network & Referrals Page
 * - Classic clear layout with 4 summary metrics, 7-tier VIP 1 – VIP 7 cards showing people count & profit %,
 *   Copy Code & Direct Invite Link boxes, and Team Members table.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { api } from '../../services/api.ts';
import {
  Copy,
  Check,
  QrCode,
  X,
  Users,
  Award,
} from 'lucide-react';

interface ReferralsTreePageProps {
  setCurrentTab: (tab: string) => void;
}

interface VIPLevel {
  tier: number;
  name: string;
  minInvites: number;
  bonusRate: string;
}

const VIP_TIERS: VIPLevel[] = [
  { tier: 1, name: 'VIP 1', minInvites: 0, bonusRate: '3%' },
  { tier: 2, name: 'VIP 2', minInvites: 3, bonusRate: '5%' },
  { tier: 3, name: 'VIP 3', minInvites: 5, bonusRate: '7%' },
  { tier: 4, name: 'VIP 4', minInvites: 10, bonusRate: '9%' },
  { tier: 5, name: 'VIP 5', minInvites: 20, bonusRate: '11%' },
  { tier: 6, name: 'VIP 6', minInvites: 35, bonusRate: '13%' },
  { tier: 7, name: 'VIP 7', minInvites: 50, bonusRate: '15%' },
];

export const ReferralsTreePage: React.FC<ReferralsTreePageProps> = () => {
  const { user } = useAuth();
  const { isRtl, language } = useLanguage();

  const peopleLabel =
    language === 'ar'
      ? 'شخص'
      : language === 'tr'
      ? 'Kişi'
      : language === 'fr'
      ? 'Pers.'
      : language === 'es'
      ? 'Pers.'
      : language === 'de'
      ? 'Pers.'
      : language === 'ru'
      ? 'чел.'
      : language === 'zh'
      ? '人'
      : 'People';

  const profitWord =
    language === 'ar'
      ? 'ربح'
      : language === 'tr'
      ? 'Kâr'
      : language === 'fr'
      ? 'Profit'
      : language === 'es'
      ? 'Ganancia'
      : language === 'de'
      ? 'Gewinn'
      : language === 'ru'
      ? 'Прибыль'
      : language === 'zh'
      ? '收益'
      : 'Profit';

  const [referralSummary, setReferralSummary] = useState<any>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  useEffect(() => {
    if (user) {
      api.getReferralSummary().then(setReferralSummary).catch(() => {});
    }
  }, [user]);

  const refCode = referralSummary?.referralCode || user?.referralCode || 'GOLD777';
  const refLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?ref=${refCode}`
      : `https://goldrix.exchange/?ref=${refCode}`;

  const handleCopy = async (text: string, isLink: boolean) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    if (isLink) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const totalInvites = referralSummary?.referralCount ?? (user?.referralCount || 0);
  const currentTier = (() => {
    if (totalInvites >= 50) return VIP_TIERS[6];
    if (totalInvites >= 35) return VIP_TIERS[5];
    if (totalInvites >= 20) return VIP_TIERS[4];
    if (totalInvites >= 10) return VIP_TIERS[3];
    if (totalInvites >= 5) return VIP_TIERS[2];
    if (totalInvites >= 3) return VIP_TIERS[1];
    return VIP_TIERS[0];
  })();

  const invitees = referralSummary?.invitees || [];
  const directBonusTotal = referralSummary?.totalEarningsUSDT || user?.referralEarningsUSDT || '0.00';
  const profitShareTotal = referralSummary?.totalProfitShareUSDT || user?.referralProfitShareUSDT || '0.00';
  const inviteesTotalProfit = referralSummary?.totalInviteesProfitUSDT || '0.00';

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-5 space-y-5 animate-fadeInUp">
      {/* 1. Team Summary, VIP 1 Status & Referral Link */}
      <section className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base sm:text-lg font-bold text-white">
                {isRtl ? 'الفريق والدعوات' : 'Team & Referrals'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 font-mono text-xs font-bold text-emerald-400">
                {currentTier.name}
              </span>
            </div>
            <p className="text-[11px] text-emerald-400 font-mono font-bold mt-0.5">
              {isRtl ? '+10% مكافأة فورية • +3% عمولة يومية' : '+10% Instant Bonus • +3% Daily Profit'}
            </p>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800">
            <Award className="w-4 h-4 text-emerald-400" />
            <span className="font-mono text-xs font-bold text-emerald-400">
              {currentTier.name} ({currentTier.bonusRate})
            </span>
          </div>
        </div>

        {/* 4 Clear Metrics in front of the user */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
            <span className="text-[11px] text-neutral-400 block">
              {isRtl ? 'المستوى ونسبة الربح' : 'VIP Level & Rate'}
            </span>
            <div className="flex items-center justify-between mt-1">
              <span className="font-mono font-bold text-emerald-400 text-base sm:text-lg">
                {currentTier.name}
              </span>
              <span className="text-xs text-emerald-400 font-mono font-bold">
                {currentTier.bonusRate}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
            <span className="text-[11px] text-neutral-400 block">
              {isRtl ? 'عدد الدعوات (كم شخص)' : 'Total Invitations'}
            </span>
            <span className=" font-mono font-bold text-white text-base sm:text-lg tabular-nums mt-1 block">
              {totalInvites} {peopleLabel}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
            <span className="text-[11px] text-neutral-400 block">
              {isRtl ? 'أرباح المدعوين (عمولة 3%)' : 'Invitees Profit (3% Share)'}
            </span>
            <div className="flex items-baseline justify-between gap-1 mt-1" dir="ltr">
              <span className="font-mono font-bold text-emerald-400 text-base sm:text-lg tabular-nums">
                +${Number(profitShareTotal).toFixed(2)}
              </span>
              <span className="text-[10px] text-neutral-400 font-mono">
                (${Number(inviteesTotalProfit).toFixed(2)})
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
            <span className="text-[11px] text-neutral-400 block">
              {isRtl ? 'مكافآت الدعوة (+$10 لكل $100)' : 'Direct Invite Bonus'}
            </span>
            <span className="font-mono font-bold text-emerald-400 text-base sm:text-lg tabular-nums mt-1 block" dir="ltr">
              +${Number(directBonusTotal).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Clear VIP 1 to VIP 7 Bar */}
        <div className="pt-2 border-t border-neutral-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neutral-300">
              {isRtl ? 'مستويات VIP' : 'VIP Levels'}
            </span>
            <span className="text-[11px] text-emerald-400 font-mono font-bold">
              +10%
            </span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {VIP_TIERS.map((t) => {
              const isCurrent = t.tier === currentTier.tier;
              const isUnlocked = totalInvites >= t.minInvites;
              return (
                <div
                  key={t.name}
                  className={`p-2.5 rounded-xl border text-center transition-colors ${
                    isCurrent
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-white'
                      : isUnlocked
                      ? 'bg-neutral-950 border-neutral-700 text-neutral-200'
                      : 'bg-neutral-950/60 border-neutral-800/80 text-neutral-500'
                  }`}
                >
                  <span className={`font-mono text-xs font-bold block ${isCurrent ? 'text-emerald-400' : ''}`}>
                    {t.name}
                  </span>
                  <span className="text-[10px] block mt-0.5 text-neutral-300">
                    {t.minInvites} {peopleLabel}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 block mt-0.5">
                    {isRtl ? `ربح ${t.bonusRate}` : `${t.bonusRate} ${profitWord}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Copy Code & Link */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-neutral-800">
          <div className="flex items-center justify-between p-3 bg-neutral-950 rounded-xl border border-neutral-800">
            <div>
              <span className="text-[11px] text-neutral-400 block">
                {isRtl ? 'كود الدعوة الخاص بك:' : 'Your Referral Code:'}
              </span>
              <span className="font-mono font-bold text-sm text-white tracking-wider">
                {refCode}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(refCode, false)}
              className="px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? (isRtl ? 'تم النسخ' : 'Copied') : isRtl ? 'نسخ الكود' : 'Copy'}</span>
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 p-3 bg-neutral-950 rounded-xl border border-neutral-800">
            <div className="min-w-0 flex-1">
              <span className="text-[11px] text-neutral-400 block">
                {isRtl ? 'رابط الدعوة المباشر:' : 'Direct Invite Link:'}
              </span>
              <span className="font-mono text-xs text-neutral-200 truncate block" dir="ltr">
                {refLink}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleCopy(refLink, true)}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold cursor-pointer"
              >
                {copiedLink ? (isRtl ? 'تم النسخ' : 'Copied') : isRtl ? 'نسخ الرابط' : 'Copy'}
              </button>
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Invitations & Invitees' Profits Table (with VIP 1 badge in front of each invitee) */}
      <section className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">
              {isRtl ? 'سجل الدعوات وأرباح المدعوين' : 'Invitations & Invitees Profits'}
            </h2>
          </div>
          <span className="px-2.5 py-0.5 rounded-md bg-neutral-800 text-xs font-mono text-neutral-300">
            {invitees.length} {isRtl ? 'شخص مدعو' : 'Invitees'}
          </span>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-4 gap-2 px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-[11px] font-bold text-neutral-400">
          <div>{isRtl ? 'المدعو / المستوى' : 'Invitee / VIP'}</div>
          <div className="text-center">{isRtl ? 'إيداع واستثمار المدعو' : 'Invested'}</div>
          <div className="text-center">{isRtl ? 'أرباح المدعو (ونسبتك 3%)' : 'Invitee Profit (3%)'}</div>
          <div className="text-left rtl:text-left">{isRtl ? 'مكافأة الدعوة (10%)' : 'Direct Bonus (10%)'}</div>
        </div>

        {invitees.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-xs text-neutral-400">
              {isRtl ? 'لا يوجد مدعوون حالياً' : 'No invitees yet'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-800 text-xs">
            {invitees.map((inv: any, idx: number) => (
              <div key={inv.id || idx} className="py-3 px-3 grid grid-cols-4 gap-2 items-center hover:bg-neutral-950/50 rounded-lg">
                {/* 1. Invitee Name + VIP 1 Badge */}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-white truncate">{inv.name}</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 font-mono text-[10px] font-bold text-emerald-400 shrink-0">
                      {inv.vipLevel || 'VIP 1'}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400 font-mono block truncate" dir="ltr">
                    {inv.maskedEmail}
                  </span>
                </div>

                {/* 2. Invitee Deposit / Investment */}
                <div className="text-center font-mono" dir="ltr">
                  <span className="font-bold text-white block">
                    ${inv.totalDepositedUSDT || inv.totalInvestedUSDT || '0.00'}
                  </span>
                  {Number(inv.totalDepositedUSDT || 0) <= 0 && (
                    <span className="text-[10px] font-sans text-amber-400 font-bold block mt-0.5">
                      {isRtl ? 'بانتظار الإيداع' : 'Awaiting Deposit'}
                    </span>
                  )}
                </div>

                {/* 3. Invitee Profits & 3% Share */}
                <div className="text-center font-mono" dir="ltr">
                  <span className="font-bold text-emerald-400 block">
                    +${inv.profitShareUSDT || '0.00'} (3%)
                  </span>
                  <span className="text-[10px] text-neutral-400 block">
                    {isRtl ? 'ربح المدعو:' : 'Profit:'} ${inv.inviteeProfitUSDT || '0.00'}
                  </span>
                </div>

                {/* 4. Direct Bonus (+10 USDT per 100 USDT = 10%) */}
                <div className="text-left font-mono" dir="ltr">
                  <span
                    className={`font-bold ${
                      Number(inv.directBonusUSDT || 0) > 0 ? 'text-emerald-400' : 'text-neutral-400'
                    }`}
                  >
                    +${inv.directBonusUSDT || '0.00'} (10%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-xs w-full p-5 text-center space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 p-1 text-neutral-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-sm font-bold text-white">{isRtl ? 'رمز الدعوة QR' : 'Referral QR'}</h3>
            <div className="w-40 h-40 mx-auto bg-white p-2.5 rounded-xl flex items-center justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(refLink)}`}
                alt="QR Code"
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain"
              />
            </div>
            <p className="text-xs font-mono text-white font-bold">{refCode}</p>
          </div>
        </div>
      )}
    </div>
  );
};
