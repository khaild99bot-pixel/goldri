/**
 * GOLDRIX Professional Multi-Currency Deposit Modal
 * - Step 1: Sleek Currency Dropdown Selector + Deposit Amount Input + Visible Transaction History (سجل المعاملات)
 * - Step 2 (Popup): 5-Minute Countdown QR Code + Copyable Wallet Address + Confirm Deposit
 * - Supports:
 *   1. USDT (TRON TRC20) -> TTJa4yiZMN8kM1zxmBsCdTaeMgwMQZd9rh
 *   2. USDT (Ethereum ERC20) -> 0xA9E75F3765d5DA836fc3F3772A4808d23a44461a
 *   3. USDT (BNB Smart Chain BEP20) -> 0xA9E75F3765d5DA836fc3F3772A4808d23a44461a
 *   4. Bitcoin (BTC) -> bc1qns6jnx02wz0kqve6j6yhnckpthr63rxy6d9me9
 *   5. Ethereum (ETH) -> 0xA9E75F3765d5DA836fc3F3772A4808d23a44461a
 *   6. BNB (BEP20) -> 0xA9E75F3765d5DA836fc3F3772A4808d23a44461a
 */

import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { AssetSymbol, Deposit, Withdrawal } from '../../types/index.ts';
import { useSoundNotifications } from '../../utils/soundNotifications.ts';
import {
  X,
  Copy,
  Check,
  QrCode,
  CheckCircle2,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  History,
  Volume2,
  VolumeX,
} from 'lucide-react';

export type CryptoNetworkKey = 'USDT_TRC20' | 'USDT_ERC20' | 'USDT_BEP20' | 'BTC' | 'ETH' | 'BNB';

export interface CryptoNetworkOption {
  key: CryptoNetworkKey;
  asset: AssetSymbol;
  badgeAsset?: string;
  networkLabel: string;
  shortTitleAr: string;
  shortTitleEn: string;
  subLabelAr: string;
  subLabelEn: string;
  defaultAddress: string;
  addressPlaceholderAr: string;
  addressPlaceholderEn: string;
  accentBorder: string;
  accentBg: string;
  accentText: string;
}

export const DEFAULT_TRC20_ADDRESS = 'TTJa4yiZMN8kM1zxmBsCdTaeMgwMQZd9rh';
export const DEFAULT_EVM_ADDRESS = '0xA9E75F3765d5DA836fc3F3772A4808d23a44461a';
export const DEFAULT_BTC_ADDRESS = 'bc1qns6jnx02wz0kqve6j6yhnckpthr63rxy6d9me9';

export const CRYPTO_NETWORK_OPTIONS: CryptoNetworkOption[] = [
  {
    key: 'USDT_TRC20',
    asset: 'USDT',
    badgeAsset: 'TRX',
    networkLabel: 'USDT (TRON TRC20)',
    shortTitleAr: 'USDT (TRC20)',
    shortTitleEn: 'USDT (TRC20)',
    subLabelAr: 'TRC20',
    subLabelEn: 'TRC20',
    defaultAddress: DEFAULT_TRC20_ADDRESS,
    addressPlaceholderAr: 'عنوان محفظة USDT (TRC20) يبدأ بـ T...',
    addressPlaceholderEn: 'USDT (TRC20) Address (T...)',
    accentBorder: 'border-emerald-500/50',
    accentBg: 'bg-emerald-500/15',
    accentText: 'text-emerald-400',
  },
  {
    key: 'USDT_ERC20',
    asset: 'USDT',
    badgeAsset: 'ETH',
    networkLabel: 'USDT (Ethereum ERC20)',
    shortTitleAr: 'اثيريم USDT (ERC20)',
    shortTitleEn: 'USDT Ethereum (ERC20)',
    subLabelAr: 'ERC20',
    subLabelEn: 'ERC20',
    defaultAddress: DEFAULT_EVM_ADDRESS,
    addressPlaceholderAr: 'عنوان محفظة اثيريم USDT (ERC20) يبدأ بـ 0x...',
    addressPlaceholderEn: 'USDT (Ethereum ERC20) Address (0x...)',
    accentBorder: 'border-emerald-500/50',
    accentBg: 'bg-emerald-500/15',
    accentText: 'text-emerald-400',
  },
  {
    key: 'USDT_BEP20',
    asset: 'USDT',
    badgeAsset: 'BNB',
    networkLabel: 'USDT (BNB BEP20)',
    shortTitleAr: 'USDT BNB (BEP20)',
    shortTitleEn: 'USDT BNB (BEP20)',
    subLabelAr: 'BEP20',
    subLabelEn: 'BEP20',
    defaultAddress: DEFAULT_EVM_ADDRESS,
    addressPlaceholderAr: 'عنوان محفظة USDT BNB (BEP20) يبدأ بـ 0x...',
    addressPlaceholderEn: 'USDT (BNB BEP20) Address (0x...)',
    accentBorder: 'border-amber-400/50',
    accentBg: 'bg-amber-400/15',
    accentText: 'text-amber-400',
  },
  {
    key: 'BTC',
    asset: 'BTC',
    networkLabel: 'Bitcoin (BTC)',
    shortTitleAr: 'بتكوين (BTC)',
    shortTitleEn: 'Bitcoin (BTC)',
    subLabelAr: 'Bitcoin',
    subLabelEn: 'Bitcoin',
    defaultAddress: DEFAULT_BTC_ADDRESS,
    addressPlaceholderAr: 'عنوان محفظة بتكوين (BTC) يبدأ بـ bc1...',
    addressPlaceholderEn: 'Bitcoin (BTC) Address (bc1...)',
    accentBorder: 'border-orange-500/50',
    accentBg: 'bg-orange-500/15',
    accentText: 'text-orange-400',
  },
  {
    key: 'ETH',
    asset: 'ETH',
    networkLabel: 'Ethereum (ETH)',
    shortTitleAr: 'اثيريم (ETH)',
    shortTitleEn: 'Ethereum (ETH)',
    subLabelAr: 'ERC20',
    subLabelEn: 'ERC20',
    defaultAddress: DEFAULT_EVM_ADDRESS,
    addressPlaceholderAr: 'عنوان محفظة اثيريم (ETH) يبدأ بـ 0x...',
    addressPlaceholderEn: 'Ethereum (ETH) Address (0x...)',
    accentBorder: 'border-indigo-400/50',
    accentBg: 'bg-indigo-500/15',
    accentText: 'text-indigo-400',
  },
  {
    key: 'BNB',
    asset: 'BNB',
    networkLabel: 'BNB (BEP20)',
    shortTitleAr: 'عملة BNB (BEP20)',
    shortTitleEn: 'BNB (BEP20)',
    subLabelAr: 'BEP20',
    subLabelEn: 'BEP20',
    defaultAddress: DEFAULT_EVM_ADDRESS,
    addressPlaceholderAr: 'عنوان محفظة BNB (BEP20) يبدأ بـ 0x...',
    addressPlaceholderEn: 'BNB (BEP20) Address (0x...)',
    accentBorder: 'border-yellow-400/50',
    accentBg: 'bg-yellow-400/15',
    accentText: 'text-yellow-400',
  },
];

function renderCoinSvg(symbol: string) {
  switch (symbol.toUpperCase()) {
    case 'TRX':
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full">
          <circle cx="16" cy="16" r="16" fill="#EF0027" />
          <path
            fill="#FFF"
            d="M21.932 9.913L7.5 7.257l7.595 19.112 10.583-12.894-3.746-3.562zm-.232 1.17l2.208 2.099-6.038 1.096 3.83-3.195zm-5.142 2.973l-6.364-5.278 10.402 1.914-4.038 3.364zm-.453.934l-1.038 8.58-4.472-11.252 5.51 2.672zm.96.455l6.687-1.21-7.67 9.342.983-8.132z"
          />
        </svg>
      );
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
    case 'USDT':
    default:
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full">
          <circle cx="16" cy="16" r="16" fill="#26A17B" />
          <path
            fill="#FFF"
            d="M17.922 17.383v-.002c-.11.008-.677.042-1.942.042-1.01 0-1.721-.03-1.971-.042v.003c-3.888-.171-6.79-.848-6.79-1.658 0-.809 2.902-1.486 6.79-1.66v2.644c.254.018.982.061 1.988.061 1.207 0 1.812-.05 1.925-.06v-2.643c3.88.173 6.775.85 6.775 1.658 0 .81-2.895 1.485-6.775 1.657m0-3.59v-2.366h5.414V7.819H8.595v3.608h5.414v2.365c-4.4.202-7.709 1.074-7.709 2.118 0 1.044 3.309 1.915 7.709 2.118v7.582h3.913v-7.584c4.393-.202 7.694-1.073 7.694-2.116 0-1.043-3.301-1.914-7.694-2.117"
          />
        </svg>
      );
  }
}

export const CurrencyBadgeIcon: React.FC<{
  asset?: string;
  badgeAsset?: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({ asset = 'USDT', badgeAsset, size = 'md' }) => {
  const dimensions =
    size === 'lg' ? 'w-9 h-9' : size === 'sm' ? 'w-6 h-6' : 'w-7 h-7';
  const badgeDimensions =
    size === 'lg' ? 'w-4 h-4' : size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  return (
    <span className={`relative inline-flex items-center justify-center shrink-0 ${dimensions}`}>
      <span className="w-full h-full rounded-full overflow-hidden ring-1 ring-white/15 shadow-sm">
        {renderCoinSvg(asset)}
      </span>
      {badgeAsset && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 ${badgeDimensions} rounded-full overflow-hidden ring-2 ring-neutral-900 shadow-sm`}
        >
          {renderCoinSvg(badgeAsset)}
        </span>
      )}
    </span>
  );
};

/**
 * Reusable Professional Dropdown Selector for Crypto Currency & Network
 */
export const CryptoCurrencyDropdown: React.FC<{
  selectedKey: CryptoNetworkKey;
  onSelect: (key: CryptoNetworkKey) => void;
  isRtl: boolean;
  label?: string;
}> = ({ selectedKey, onSelect, isRtl, label }) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption =
    CRYPTO_NETWORK_OPTIONS.find((opt) => opt.key === selectedKey) || CRYPTO_NETWORK_OPTIONS[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-1.5 relative" ref={dropdownRef}>
      {label && <label className="text-xs font-bold text-neutral-300 block">{label}</label>}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-3.5 py-3 bg-neutral-950 border border-neutral-800 hover:border-emerald-500/50 rounded-xl transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <CurrencyBadgeIcon
            asset={selectedOption.asset}
            badgeAsset={selectedOption.badgeAsset}
            size="md"
          />
          <div className="text-right rtl:text-right ltr:text-left">
            <div className="text-xs font-extrabold text-white">
              {isRtl ? selectedOption.shortTitleAr : selectedOption.shortTitleEn}
            </div>
            <div className="text-[10px] font-mono text-neutral-400">
              {selectedOption.networkLabel}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-800 text-emerald-400 font-bold">
            {isRtl ? selectedOption.subLabelAr : selectedOption.subLabelEn}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-neutral-400 transition-transform ${
              open ? 'rotate-180 text-emerald-400' : ''
            }`}
          />
        </div>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden divide-y divide-neutral-800/70 max-h-64 overflow-y-auto">
          {CRYPTO_NETWORK_OPTIONS.map((opt) => {
            const isSelected = opt.key === selectedKey;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => {
                  onSelect(opt.key);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-500/15 text-white'
                    : 'hover:bg-neutral-800/80 text-neutral-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <CurrencyBadgeIcon asset={opt.asset} badgeAsset={opt.badgeAsset} size="sm" />
                  <div className="text-right rtl:text-right ltr:text-left">
                    <div className="font-extrabold text-white">
                      {isRtl ? opt.shortTitleAr : opt.shortTitleEn}
                    </div>
                    <div className="text-[10px] font-mono text-neutral-400">{opt.networkLabel}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-neutral-300">
                    {isRtl ? opt.subLabelAr : opt.subLabelEn}
                  </span>
                  {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/**
 * Shared Transaction History Panel (سجل المعاملات) displayed inside Deposit & Withdrawal modals
 */
export const TransferHistoryPanel: React.FC<{
  isRtl: boolean;
  defaultFilter?: 'ALL' | 'DEPOSIT' | 'WITHDRAWAL';
  refreshTrigger?: number;
}> = ({ isRtl, defaultFilter = 'ALL', refreshTrigger = 0 }) => {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'DEPOSIT' | 'WITHDRAWAL'>(defaultFilter);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([
      api.getDeposits().catch(() => [] as Deposit[]),
      api.getWithdrawals().catch(() => [] as Withdrawal[]),
    ]).then(([deps, wths]) => {
      if (!mounted) return;
      setDeposits(Array.isArray(deps) ? deps : []);
      setWithdrawals(Array.isArray(wths) ? wths : []);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [refreshTrigger]);

  const combined = [
    ...deposits.map((d) => ({
      kind: 'DEPOSIT' as const,
      id: d.id,
      amount: Number(d.amount || 0),
      feeAmount: 0,
      netAmount: Number(d.amount || 0),
      feePercent: 0,
      network: d.network || 'USDT (TRC20)',
      status: String(d.status || 'PENDING_REVIEW'),
      createdAt: d.createdAt,
    })),
    ...withdrawals.map((w) => {
      const amt = Number(w.amount || 0);
      const fee = Number(w.feeAmount || 0);
      const net = Number(w.netAmount || Math.max(0, amt - fee));
      const pct = w.feePercent || (amt > 0 ? Math.round((fee / amt) * 100) : 0);
      return {
        kind: 'WITHDRAWAL' as const,
        id: w.id,
        amount: amt,
        feeAmount: fee,
        netAmount: net,
        feePercent: pct,
        network: w.network || 'USDT (TRC20)',
        status: String(w.status || 'PENDING_REVIEW'),
        createdAt: w.createdAt,
      };
    }),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filtered = combined.filter((item) => {
    if (filter === 'DEPOSIT') return item.kind === 'DEPOSIT';
    if (filter === 'WITHDRAWAL') return item.kind === 'WITHDRAWAL';
    return true;
  });

  const renderStatusBadge = (status: string) => {
    const upper = status.toUpperCase();
    if (upper === 'CONFIRMED' || upper === 'COMPLETED' || upper === 'APPROVED') {
      return (
        <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold shrink-0">
          {isRtl ? 'مقبول' : 'Approved'}
        </span>
      );
    }
    if (upper === 'REJECTED' || upper === 'FAILED') {
      return (
        <span className="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[10px] font-extrabold shrink-0">
          {isRtl ? 'مرفوض' : 'Rejected'}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-extrabold shrink-0">
        {isRtl ? 'قيد المراجعة' : 'Pending'}
      </span>
    );
  };

  return (
    <div className="pt-3 border-t border-neutral-800 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-extrabold text-white">
          <History className="w-3.5 h-3.5 text-emerald-400" />
          <span>{isRtl ? 'سجل المعاملات' : 'Transaction History'}</span>
          <span className="text-[10px] font-mono text-neutral-400">({filtered.length})</span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-neutral-950 p-0.5 rounded-lg border border-neutral-800 text-[10px] font-bold">
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
              filter === 'ALL' ? 'bg-emerald-500 text-neutral-950 font-black' : 'text-neutral-400 hover:text-white'
            }`}
          >
            {isRtl ? 'الكل' : 'All'}
          </button>
          <button
            type="button"
            onClick={() => setFilter('DEPOSIT')}
            className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
              filter === 'DEPOSIT' ? 'bg-emerald-500 text-neutral-950 font-black' : 'text-neutral-400 hover:text-white'
            }`}
          >
            {isRtl ? 'إيداع' : 'Deposits'}
          </button>
          <button
            type="button"
            onClick={() => setFilter('WITHDRAWAL')}
            className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
              filter === 'WITHDRAWAL' ? 'bg-emerald-500 text-neutral-950 font-black' : 'text-neutral-400 hover:text-white'
            }`}
          >
            {isRtl ? 'سحب' : 'Withdrawals'}
          </button>
        </div>
      </div>

      <div className="max-h-44 overflow-y-auto space-y-1.5 pr-0.5">
        {loading ? (
          <div className="py-4 text-center text-[11px] text-neutral-500">
            {isRtl ? 'جاري تحميل سجل المعاملات...' : 'Loading transactions...'}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-4 px-3 rounded-xl bg-neutral-950/70 border border-neutral-800/80 text-center text-[11px] text-neutral-500">
            {isRtl ? 'لا توجد معاملات إيداع أو سحب مسجلة حتى الآن' : 'No deposit or withdrawal transactions yet'}
          </div>
        ) : (
          filtered.slice(0, 12).map((tx) => {
            const isDep = tx.kind === 'DEPOSIT';
            const dateStr = new Date(tx.createdAt).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });
            return (
              <div
                key={`${tx.kind}_${tx.id}`}
                className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800/90 flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isDep
                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                        : 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                    }`}
                  >
                    {isDep ? (
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white text-[11px]">
                        {isDep ? (isRtl ? 'إيداع' : 'Deposit') : isRtl ? 'سحب' : 'Withdrawal'}
                      </span>
                      <span
                        className={`font-mono font-extrabold text-[11px] ${
                          isDep ? 'text-emerald-400' : 'text-amber-300'
                        }`}
                        dir="ltr"
                      >
                        {isDep ? '+' : '-'}${tx.amount.toFixed(2)} USDT
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-neutral-400 truncate">
                      {!isDep && tx.feeAmount > 0 ? (
                        <span>
                          {isRtl
                            ? `الصافي: $${tx.netAmount.toFixed(2)} (رسوم ${tx.feePercent}%) • `
                            : `Net: $${tx.netAmount.toFixed(2)} (${tx.feePercent}% fee) • `}
                        </span>
                      ) : null}
                      <span>{tx.network}</span> &bull; <span>{dateStr}</span>
                    </div>
                  </div>
                </div>
                {renderStatusBadge(tx.status)}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SubmittedDepositReceipt {
  id: string;
  amount: string;
  networkLabel: string;
  networkKey: CryptoNetworkKey;
}

export const DepositModal: React.FC<DepositModalProps> = ({ isOpen, onClose }) => {
  const { refreshUserData } = useAuth();
  const { isRtl } = useLanguage();
  const { soundEnabled, toggleSound, playNotificationSound } = useSoundNotifications();
  const [step, setStep] = useState<'FORM' | 'QR_POPUP'>('FORM');
  const [selectedKey, setSelectedKey] = useState<CryptoNetworkKey>('USDT_TRC20');
  const [walletsMap, setWalletsMap] = useState<Record<CryptoNetworkKey, string>>({
    USDT_TRC20: DEFAULT_TRC20_ADDRESS,
    USDT_ERC20: DEFAULT_EVM_ADDRESS,
    USDT_BEP20: DEFAULT_EVM_ADDRESS,
    BTC: DEFAULT_BTC_ADDRESS,
    ETH: DEFAULT_EVM_ADDRESS,
    BNB: DEFAULT_EVM_ADDRESS,
  });
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [receiptPopup, setReceiptPopup] = useState<SubmittedDepositReceipt | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(300);
  const [historyRefreshCount, setHistoryRefreshCount] = useState<number>(0);

  const selectedOption =
    CRYPTO_NETWORK_OPTIONS.find((opt) => opt.key === selectedKey) || CRYPTO_NETWORK_OPTIONS[0];
  const activeAddress = walletsMap[selectedKey] || selectedOption.defaultAddress;

  useEffect(() => {
    if (isOpen) {
      setStep('FORM');
      setSelectedKey('USDT_TRC20');
      setTransferAmount('');
      setErrorMessage(null);
      setReceiptPopup(null);
      setSecondsLeft(300);
      setCopied(false);
      setHistoryRefreshCount((c) => c + 1);
      loadAddresses('USDT_TRC20');
    } else {
      setReceiptPopup(null);
      setStep('FORM');
    }
  }, [isOpen]);

  // 5-Minute QR Countdown Timer runs when QR popup step is open
  useEffect(() => {
    if (!isOpen || step !== 'QR_POPUP') return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, step]);

  const loadAddresses = async (targetKey: CryptoNetworkKey) => {
    const opt =
      CRYPTO_NETWORK_OPTIONS.find((o) => o.key === targetKey) || CRYPTO_NETWORK_OPTIONS[0];
    try {
      const res: any = await api.generateDepositAddress(opt.asset, opt.networkLabel);
      if (res?.wallets) {
        setWalletsMap({
          USDT_TRC20: res.wallets.USDT_TRC20 || DEFAULT_TRC20_ADDRESS,
          USDT_ERC20: res.wallets.USDT_ERC20 || DEFAULT_EVM_ADDRESS,
          USDT_BEP20: res.wallets.USDT_BEP20 || DEFAULT_EVM_ADDRESS,
          BTC: res.wallets.BTC || DEFAULT_BTC_ADDRESS,
          ETH: res.wallets.ETH || DEFAULT_EVM_ADDRESS,
          BNB: res.wallets.BNB || DEFAULT_EVM_ADDRESS,
        });
      } else if (res?.address) {
        setWalletsMap((prev) => ({
          ...prev,
          [targetKey]: res.address,
        }));
      }
    } catch {
      // Fallback to default addresses if offline
    }
  };

  const handleSelectNetwork = (key: CryptoNetworkKey) => {
    setSelectedKey(key);
    setCopied(false);
    setErrorMessage(null);
    loadAddresses(key);
  };

  const handleCopy = () => {
    if (!activeAddress) return;
    navigator.clipboard.writeText(activeAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAmountChange = (val: string) => {
    const normalized = val.replace(/,/g, '.').replace(/[^0-9.]/g, '');
    const parts = normalized.split('.');
    const clean = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : normalized;
    setTransferAmount(clean);
    if (errorMessage) setErrorMessage(null);
  };

  const handleProceedToQrPopup = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const parsedAmount = parseFloat(transferAmount);
    if (!transferAmount || isNaN(parsedAmount) || parsedAmount < 100) {
      setErrorMessage(isRtl ? 'الحد الأدنى للإيداع هو $100' : 'Minimum deposit is $100');
      return;
    }

    setSecondsLeft(300);
    setCopied(false);
    loadAddresses(selectedKey);
    setStep('QR_POPUP');
  };

  const handleConfirmDeposit = async () => {
    setErrorMessage(null);

    const parsedAmount = parseFloat(transferAmount);
    if (!transferAmount || isNaN(parsedAmount) || parsedAmount < 100) {
      setErrorMessage(isRtl ? 'الحد الأدنى للإيداع هو $100' : 'Minimum deposit is $100');
      return;
    }

    if (secondsLeft <= 0) {
      setSecondsLeft(300);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.submitDepositNotification(
        selectedOption.asset,
        selectedOption.networkLabel,
        String(parsedAmount)
      );
      await refreshUserData();
      setHistoryRefreshCount((c) => c + 1);
      playNotificationSound('success');
      const orderId = res?.deposit?.id || `ORD-${Date.now().toString().slice(-6)}`;
      setReceiptPopup({
        id: orderId,
        amount: parsedAmount.toFixed(2),
        networkLabel: isRtl ? selectedOption.shortTitleAr : selectedOption.networkLabel,
        networkKey: selectedOption.key,
      });
    } catch (err: any) {
      setErrorMessage(err.message || (isRtl ? 'تعذر إرسال الطلب' : 'Request failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');
  const presetAmounts = ['100', '200', '500', '1000'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl my-auto animate-modalIn">
        {/* Clean Platform-Matched Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">
                {isRtl ? 'إيداع الرصيد' : 'Deposit Funds'}
              </h2>
              <p className="text-[11px] text-neutral-400">
                {step === 'FORM'
                  ? isRtl
                    ? 'أدخل المبلغ واختر العملة'
                    : 'Enter amount & select currency'
                  : isRtl
                  ? selectedOption.shortTitleAr
                  : selectedOption.networkLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {step === 'FORM' ? (
          /* STEP 1: ENTER AMOUNT + DROPDOWN CURRENCY SELECTOR */
          <form onSubmit={handleProceedToQrPopup} className="space-y-4">
            {/* 1. Deposit Amount Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-300 font-bold">
                  {isRtl ? 'مبلغ الإيداع ($)' : 'Deposit Amount ($)'}
                </span>
                <span className="text-[11px] font-mono text-amber-400">
                  {isRtl ? 'الحد الأدنى $100' : 'Min $100'}
                </span>
              </div>

              <div className="relative flex items-center" dir="ltr">
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  value={transferAmount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder={isRtl ? '100.00' : '100.00'}
                  className="w-full pl-4 pr-20 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-base font-mono font-bold text-white placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500/60"
                />
                <span className="absolute right-3.5 text-xs font-mono font-extrabold text-emerald-400 pointer-events-none">
                  USD $
                </span>
              </div>

              {/* Quick Preset Chips */}
              <div className="grid grid-cols-4 gap-1.5" dir="ltr">
                {presetAmounts.map((preset) => {
                  const isSelectedPreset = transferAmount === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleAmountChange(preset)}
                      className={`py-1.5 rounded-xl font-mono text-xs font-extrabold border transition-colors cursor-pointer ${
                        isSelectedPreset
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      ${preset}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Dropdown Currency Selector */}
            <CryptoCurrencyDropdown
              selectedKey={selectedKey}
              onSelect={handleSelectNetwork}
              isRtl={isRtl}
              label={isRtl ? 'اختر عملة الإيداع' : 'Select Deposit Currency'}
            />

            {errorMessage && (
              <p className="text-xs text-rose-400 bg-neutral-950 border border-rose-500/30 rounded-xl px-3 py-2 text-center font-bold">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-sm transition-colors cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              {isRtl ? 'إيداع الآن' : 'Deposit Now'}
            </button>
          </form>
        ) : (
          /* STEP 2 (POPUP): 5-MINUTE QR CODE + WALLET ADDRESS + CONFIRM */
          <div className="space-y-4 animate-fadeInUp">
            {/* Amount & 5-Minute Countdown Bar */}
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-neutral-950 rounded-xl border border-neutral-800">
              <div className="flex items-center gap-2">
                <CurrencyBadgeIcon
                  asset={selectedOption.asset}
                  badgeAsset={selectedOption.badgeAsset}
                  size="sm"
                />
                <span className="text-sm font-mono font-extrabold text-white" dir="ltr">
                  ${parseFloat(transferAmount || '0').toFixed(2)}
                </span>
              </div>
              <div
                className="flex items-center gap-1.5 font-mono text-xs font-extrabold text-emerald-400"
                dir="ltr"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {mins}:{secs}
                </span>
              </div>
            </div>

            {/* QR Code & Copyable Address */}
            <div className="p-3 bg-neutral-950 rounded-2xl border border-neutral-800 flex flex-col items-center space-y-2.5">
              <span className="text-xs font-bold text-neutral-300">
                {isRtl ? selectedOption.shortTitleAr : selectedOption.networkLabel}
              </span>

              <div className="p-2 bg-white rounded-xl shadow-md ring-2 ring-emerald-500/15 flex items-center justify-center w-28 h-28">
                {activeAddress ? (
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                      activeAddress
                    )}`}
                    alt={selectedOption.networkLabel}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <QrCode className="w-20 h-20 text-neutral-950" />
                )}
              </div>

              <div className="w-full flex items-center gap-2 p-2.5 bg-neutral-900 rounded-xl border border-neutral-800">
                <span
                  className="flex-1 font-mono text-[11px] text-neutral-100 break-all text-left select-all leading-relaxed"
                  dir="ltr"
                >
                  {activeAddress}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`px-3 py-2 rounded-xl font-extrabold text-xs transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    copied
                      ? 'bg-emerald-500 text-neutral-950'
                      : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? (isRtl ? 'تم النسخ' : 'Copied') : isRtl ? 'نسخ' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {errorMessage && (
              <p className="text-xs text-rose-400 bg-neutral-950 border border-rose-500/30 rounded-xl px-3 py-2 text-center font-bold">
                {errorMessage}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setStep('FORM');
                  setErrorMessage(null);
                }}
                className="px-4 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs transition-colors cursor-pointer"
              >
                {isRtl ? 'رجوع' : 'Back'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeposit}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-sm transition-colors cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {isSubmitting
                  ? isRtl
                    ? 'جاري التأكيد...'
                    : 'Confirming...'
                  : isRtl
                  ? 'تأكيد الإيداع'
                  : 'Confirm Deposit'}
              </button>
            </div>
          </div>
        )}

        {/* Visible Transaction History (سجل المعاملات) inside Deposit Modal */}
        <TransferHistoryPanel
          isRtl={isRtl}
          defaultFilter="ALL"
          refreshTrigger={historyRefreshCount}
        />
      </div>

      {/* Confirmation Receipt Popup */}
      {receiptPopup && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-xs w-full p-5 space-y-4 shadow-2xl text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-black text-white">
                {isRtl ? 'تم إرسال طلب الإيداع بنجاح' : 'Deposit Request Sent'}
              </h3>
              <div className="text-xl font-black font-mono text-emerald-400 pt-1" dir="ltr">
                ${receiptPopup.amount}
              </div>
              <p className="text-xs font-bold text-neutral-300">{receiptPopup.networkLabel}</p>
              <p className="text-[11px] font-mono text-neutral-400">#{receiptPopup.id}</p>
            </div>

            <button
              type="button"
              onClick={() => {
                setReceiptPopup(null);
                onClose();
              }}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs transition-colors cursor-pointer"
            >
              {isRtl ? 'تم' : 'Done'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
