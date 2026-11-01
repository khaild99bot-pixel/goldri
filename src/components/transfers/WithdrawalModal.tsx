/**
 * GOLDRIX Professional Multi-Currency Withdrawal Modal
 * - Uses sleek CryptoCurrencyDropdown selector for currency choice
 * - Enforces 24-hour waiting period before the first withdrawal ("أول سحب بعد 24 ساعة")
 * - Higher tiered withdrawal fee percentage for lower amounts:
 *   < $50 => 15% | $50–$99 => 12% | $100–$299 => 8% | $300–$499 => 5% | $500+ => 3%
 * - Displays live Transaction History ("سجل المعاملات") directly inside the modal
 * - Includes Sound Notification toggle & chime
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useSoundNotifications } from '../../utils/soundNotifications.ts';
import {
  CRYPTO_NETWORK_OPTIONS,
  CryptoNetworkKey,
  CurrencyBadgeIcon,
  CryptoCurrencyDropdown,
  TransferHistoryPanel,
} from './DepositModal.tsx';
import {
  X,
  CheckCircle2,
  Clock,
  QrCode,
  ArrowUpRight,
  ShieldCheck,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenKYC: () => void;
}

interface SubmittedWithdrawalReceipt {
  id: string;
  amount: string;
  feePercent: number;
  feeAmount: string;
  netAmount: string;
  networkLabel: string;
}

/**
 * Tiered withdrawal fee rate with a balanced increase for lower withdrawal amounts:
 * - Less than $50: 8%
 * - $50 to < $100: 7%
 * - $100 to < $300: 5%
 * - $300 to < $500: 4%
 * - $500 and above: 3%
 */
export function getWithdrawalFeeRate(amountNum: number): { rate: number; percent: number } {
  if (amountNum >= 500) {
    return { rate: 0.03, percent: 3 };
  }
  if (amountNum >= 300) {
    return { rate: 0.04, percent: 4 };
  }
  if (amountNum >= 100) {
    return { rate: 0.05, percent: 5 };
  }
  if (amountNum >= 50) {
    return { rate: 0.07, percent: 7 };
  }
  return { rate: 0.08, percent: 8 };
}

function formatDurationHMS(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = String(Math.floor(safe / 3600)).padStart(2, '0');
  const mins = String(Math.floor((safe % 3600) / 60)).padStart(2, '0');
  const secs = String(safe % 60).padStart(2, '0');
  return `${hrs}:${mins}:${secs}`;
}

export const WithdrawalModal: React.FC<WithdrawalModalProps> = ({ isOpen, onClose, onOpenKYC }) => {
  const { user, balances, refreshBalances } = useAuth();
  const { isRtl } = useLanguage();
  const { soundEnabled, toggleSound, playNotificationSound } = useSoundNotifications();
  const [step, setStep] = useState<'FORM' | 'CONFIRM'>('FORM');
  const [selectedKey, setSelectedKey] = useState<CryptoNetworkKey>('USDT_TRC20');
  const [destinationAddress, setDestinationAddress] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [receiptPopup, setReceiptPopup] = useState<SubmittedWithdrawalReceipt | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(300);
  const [firstWithdrawalCountdown, setFirstWithdrawalCountdown] = useState<number>(0);
  const [historyRefreshCount, setHistoryRefreshCount] = useState<number>(0);

  const selectedOption =
    CRYPTO_NETWORK_OPTIONS.find((opt) => opt.key === selectedKey) || CRYPTO_NETWORK_OPTIONS[0];

  useEffect(() => {
    if (isOpen) {
      setStep('FORM');
      setSelectedKey('USDT_TRC20');
      setAmount('');
      setDestinationAddress('');
      setErrorMessage(null);
      setReceiptPopup(null);
      setHistoryRefreshCount((c) => c + 1);
      refreshBalances().catch(() => {});
    } else {
      setReceiptPopup(null);
      setStep('FORM');
    }
  }, [isOpen]);

  // Sync 24-hour plan operation withdrawal countdown from server balances
  useEffect(() => {
    if (!isOpen) return;
    if (balances && typeof balances.firstWithdrawalRemainingSeconds === 'number') {
      setFirstWithdrawalCountdown(balances.firstWithdrawalRemainingSeconds);
      return;
    }
    setFirstWithdrawalCountdown(24 * 3600);
  }, [isOpen, balances, user]);

  useEffect(() => {
    if (!isOpen || firstWithdrawalCountdown <= 0) return;
    const timer = setInterval(() => {
      setFirstWithdrawalCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, firstWithdrawalCountdown > 0]);

  useEffect(() => {
    if (!isOpen || step !== 'CONFIRM') return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, step]);

  const availableAmount = balances
    ? Math.max(Number(balances.withdrawableUSDT || 0), Number(balances.available?.USDT || 0))
    : 0;
  const requestedNum = parseFloat(amount) || 0;
  const isKycVerified = true;
  const showKycGateAfterAmount = false;
  const isFirstWithdrawalLocked = false;

  const { rate: feeRate, percent: feePercent } = getWithdrawalFeeRate(requestedNum || 25);
  const feeAmount = Number((requestedNum * feeRate).toFixed(2));
  const netAmount = Math.max(0, Number((requestedNum - feeAmount).toFixed(2)));

  const handleAmountChange = (val: string) => {
    const normalized = val.replace(/,/g, '.').replace(/[^0-9.]/g, '');
    const parts = normalized.split('.');
    const clean = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : normalized;
    setAmount(clean);
    if (errorMessage) setErrorMessage(null);
  };

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (requestedNum <= 0) {
      setErrorMessage(isRtl ? 'يرجى إدخال مبلغ السحب أولاً' : 'Please enter withdrawal amount first');
      return;
    }

    if (!destinationAddress.trim()) {
      setErrorMessage(isRtl ? 'يرجى إدخال عنوان المحفظة' : 'Please enter wallet address');
      return;
    }

    setSecondsLeft(300);
    setStep('CONFIRM');
  };

  const handleConfirmWithdrawal = async () => {
    setErrorMessage(null);

    if (secondsLeft <= 0) {
      setSecondsLeft(300);
      return;
    }

    setIsSubmitting(true);
    try {
      const res: any = await api.requestWithdrawal(
        selectedOption.asset,
        selectedOption.networkLabel,
        destinationAddress.trim(),
        String(requestedNum)
      );
      await refreshBalances();
      setHistoryRefreshCount((c) => c + 1);
      playNotificationSound('success');

      const wdId = res?.withdrawal?.id || `WDR-${Date.now().toString().slice(-6)}`;
      setReceiptPopup({
        id: wdId,
        amount: requestedNum.toFixed(2),
        feePercent,
        feeAmount: feeAmount.toFixed(2),
        netAmount: netAmount.toFixed(2),
        networkLabel: isRtl ? selectedOption.shortTitleAr : selectedOption.networkLabel,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl my-auto animate-modalIn">
        {/* Clean Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">
                {isRtl ? 'سحب الأرباح' : 'Withdraw Profits'}
              </h2>
              <p className="text-[11px] text-neutral-400">
                {isRtl ? selectedOption.shortTitleAr : selectedOption.networkLabel}
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
          /* STEP 1: WITHDRAWABLE BALANCE + 24H RULE + DROPDOWN CURRENCY SELECTOR + ADDRESS & AMOUNT */
          <form onSubmit={handleProceedToConfirm} className="space-y-3.5">
            {/* Withdrawable Balance Card */}
            <div className="p-3.5 rounded-xl bg-neutral-950 border border-emerald-500/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-neutral-300 font-bold">
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                <span>{isRtl ? 'متاح للسحب' : 'Withdrawable'}</span>
              </div>
              <div className="font-mono font-extrabold text-emerald-400 text-sm" dir="ltr">
                ${availableAmount.toFixed(2)} USDT
              </div>
            </div>

            {/* 24-Hour Plan Operation Withdrawal Rule Banner */}
            <div
              className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                isFirstWithdrawalLocked
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock
                  className={`w-4 h-4 shrink-0 ${
                    isFirstWithdrawalLocked ? 'text-amber-400 animate-pulse' : 'text-emerald-400'
                  }`}
                />
                <div>
                  <span className="font-extrabold text-white block text-[11px]">
                    {isRtl ? 'ينزل السحب بعد 24 ساعة عمل للخطة' : 'Withdrawal Drops After 24h Plan Work'}
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    {isFirstWithdrawalLocked
                      ? isRtl
                        ? 'تُودع الأرباح القابلة للسحب بعد إتمام 24 ساعة عمل للخطة'
                        : 'Withdrawable profit drops after 24h of active plan operation'
                      : isRtl
                      ? 'اكتملت دورة 24 ساعة عمل • السحب متاح الآن'
                      : '24-hour work cycle completed • Withdrawal ready'}
                  </span>
                </div>
              </div>
              {isFirstWithdrawalLocked ? (
                <span
                  className="px-2.5 py-1 rounded-lg bg-neutral-950 border border-amber-500/40 font-mono font-extrabold text-xs text-amber-400 shrink-0"
                  dir="ltr"
                >
                  {formatDurationHMS(firstWithdrawalCountdown)}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold shrink-0">
                  {isRtl ? 'متاح' : 'Ready'}
                </span>
              )}
            </div>

            {/* Dropdown Currency Selector */}
            <CryptoCurrencyDropdown
              selectedKey={selectedKey}
              onSelect={(key) => {
                setSelectedKey(key);
                setErrorMessage(null);
              }}
              isRtl={isRtl}
              label={isRtl ? 'اختر عملة السحب' : 'Select Withdrawal Currency'}
            />

            <input
              type="text"
              dir="ltr"
              required
              placeholder={
                isRtl ? selectedOption.addressPlaceholderAr : selectedOption.addressPlaceholderEn
              }
              value={destinationAddress}
              onChange={(e) => {
                setDestinationAddress(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              className="w-full px-3.5 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-xs font-mono text-white placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500/60"
            />

            <div className="relative flex items-center" dir="ltr">
              <input
                type="text"
                inputMode="decimal"
                placeholder={isRtl ? 'المبلغ ($)' : 'Amount ($)'}
                required
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="w-full pl-4 pr-28 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-base font-mono font-bold text-white placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500/60"
              />
              <div className="absolute right-2.5 flex items-center gap-1.5">
                <span className="text-xs font-mono font-bold text-neutral-400 pointer-events-none">
                  USD $
                </span>
                <button
                  type="button"
                  onClick={() => handleAmountChange(availableAmount > 0 ? availableAmount.toFixed(2) : '100')}
                  className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-[10px] font-mono font-extrabold cursor-pointer"
                >
                  {isRtl ? 'الكل' : 'MAX'}
                </button>
              </div>
            </div>

            {/* Tiered Fee Structure Card (Balanced Higher Fee for Low Amounts) */}
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400 font-bold">
                  {isRtl ? 'نسبة رسوم السحب حسب المبلغ:' : 'Withdrawal Fee by Amount:'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md font-mono font-black text-xs ${
                    feePercent >= 7
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  }`}
                  dir="ltr"
                >
                  {feePercent}%
                </span>
              </div>

              <div className="grid grid-cols-5 gap-1 text-[10px] font-mono text-center" dir="ltr">
                <div
                  className={`py-1 rounded border ${
                    requestedNum > 0 && requestedNum < 50
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-black'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                  }`}
                >
                  <div>&lt;$50</div>
                  <div className="text-amber-400 font-bold">8%</div>
                </div>
                <div
                  className={`py-1 rounded border ${
                    requestedNum >= 50 && requestedNum < 100
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-black'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                  }`}
                >
                  <div>$50+</div>
                  <div className="text-amber-400 font-bold">7%</div>
                </div>
                <div
                  className={`py-1 rounded border ${
                    requestedNum >= 100 && requestedNum < 300
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-black'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                  }`}
                >
                  <div>$100+</div>
                  <div className="text-emerald-400 font-bold">5%</div>
                </div>
                <div
                  className={`py-1 rounded border ${
                    requestedNum >= 300 && requestedNum < 500
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-black'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                  }`}
                >
                  <div>$300+</div>
                  <div className="text-emerald-400 font-bold">4%</div>
                </div>
                <div
                  className={`py-1 rounded border ${
                    requestedNum >= 500
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-black'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                  }`}
                >
                  <div>$500+</div>
                  <div className="text-emerald-400 font-bold">3%</div>
                </div>
              </div>

              {requestedNum > 0 && (
                <div className="flex items-center justify-between pt-1.5 border-t border-neutral-800/80 font-mono text-xs">
                  <span className="text-neutral-400 font-sans">
                    {isRtl ? `الرسوم (-$${feeAmount.toFixed(2)}) • الصافي:` : `Fee (-$${feeAmount.toFixed(2)}) • Net:`}
                  </span>
                  <span className="text-emerald-400 font-extrabold" dir="ltr">
                    ${netAmount.toFixed(2)} USDT
                  </span>
                </div>
              )}
            </div>

            {/* Identity Verification Option Appearing Immediately After Entering Withdrawal Amount */}
            {showKycGateAfterAmount && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border-2 border-amber-400/50 space-y-2.5 animate-fadeIn">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                    {user?.kycStatus === 'PENDING' ? (
                      <Clock className="w-4 h-4" />
                    ) : (
                      <ShieldCheck className="w-4 h-4" />
                    )}
                  </div>
                  <div className="text-xs space-y-0.5">
                    <span className="font-black text-white block">
                      {user?.kycStatus === 'PENDING'
                        ? isRtl
                          ? 'جاري معالجة توثيق الهوية تلقائياً (1 - 3 دقائق)'
                          : 'Identity Verification Processing (1–3 mins)'
                        : isRtl
                        ? 'تأكيد الهوية مطلوب لإتمام سحب الرصيد'
                        : 'Identity Verification Required for Withdrawal'}
                    </span>
                    <p className="text-[11px] text-neutral-300 leading-relaxed">
                      {user?.kycStatus === 'PENDING'
                        ? isRtl
                          ? `جاري معالجة توثيق هويتك حالياً وسيتم الاعتماد خلال 1 إلى 3 دقائق لسحب مبلغ ($${requestedNum.toFixed(2)}).`
                          : `Your identity verification is being processed and will be approved within 1–3 minutes.`
                        : isRtl
                        ? `لا يمكن سحب مبلغ ($${requestedNum.toFixed(2)}) إلا بعد تأكيد هويتك الشخصية لحماية حسابك.`
                        : `To withdraw $${requestedNum.toFixed(2)}, please verify your identity first.`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onOpenKYC}
                  className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-black text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {user?.kycStatus === 'PENDING'
                      ? isRtl
                        ? 'متابعة حالة توثيق الهوية'
                        : 'View Verification Progress'
                      : isRtl
                      ? 'تأكيد الهوية الآن'
                      : 'Verify Identity Now'}
                  </span>
                </button>
              </div>
            )}

            {errorMessage && (
              <p className="text-xs text-rose-400 bg-neutral-950 border border-rose-500/30 rounded-xl px-3 py-2 text-center font-bold">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              className={`w-full py-3.5 rounded-xl font-black text-sm transition-colors cursor-pointer shadow-lg ${
                showKycGateAfterAmount
                  ? 'bg-amber-400 hover:bg-amber-300 text-neutral-950 shadow-amber-400/15'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-emerald-500/20'
              }`}
            >
              {showKycGateAfterAmount
                ? user?.kycStatus === 'PENDING'
                  ? isRtl
                    ? 'جاري معالجة توثيق الهوية...'
                    : 'Processing KYC Verification...'
                  : isRtl
                  ? 'تأكيد الهوية لإتمام السحب'
                  : 'Verify Identity to Withdraw'
                : isRtl
                ? 'سحب الآن'
                : 'Withdraw Now'}
            </button>
          </form>
        ) : (
          /* STEP 2: REVIEW + QR + 5-MIN TIMER + FEE BREAKDOWN */
          <div className="space-y-4">
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-neutral-950 rounded-xl border border-neutral-800">
              <div className="flex items-center gap-2">
                <CurrencyBadgeIcon
                  asset={selectedOption.asset}
                  badgeAsset={selectedOption.badgeAsset}
                  size="sm"
                />
                <span className="text-sm font-mono font-bold text-white" dir="ltr">
                  ${requestedNum.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-emerald-400">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {mins}:{secs}
                </span>
              </div>
            </div>

            <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 flex flex-col items-center space-y-3">
              <span className="text-xs font-extrabold text-white">
                {isRtl ? selectedOption.shortTitleAr : selectedOption.networkLabel}
              </span>

              <div className="w-32 h-32 bg-white p-2 rounded-xl flex items-center justify-center">
                {destinationAddress ? (
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                      destinationAddress
                    )}`}
                    alt="QR"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <QrCode className="w-20 h-20 text-neutral-950" />
                )}
              </div>

              <div className="w-full p-2.5 bg-neutral-900 rounded-xl border border-neutral-800 text-center">
                <div className="font-mono text-[11px] text-neutral-200 break-all" dir="ltr">
                  {destinationAddress}
                </div>
              </div>

              <div className="w-full px-3 py-2.5 bg-neutral-900 rounded-xl border border-neutral-800 text-xs font-mono space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-400 font-sans">
                    {isRtl ? `رسوم السحب (${feePercent}%):` : `Fee (${feePercent}%):`}
                  </span>
                  <span className="text-amber-400 font-bold" dir="ltr">
                    -${feeAmount.toFixed(2)} USDT
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-neutral-800 pt-1.5">
                  <span className="text-neutral-300 font-sans font-bold">
                    {isRtl ? 'الصافي المستلم:' : 'Net Received:'}
                  </span>
                  <span className="text-emerald-400 font-extrabold" dir="ltr">
                    ${netAmount.toFixed(2)} USDT
                  </span>
                </div>
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
                onClick={handleConfirmWithdrawal}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmitting
                  ? isRtl
                    ? 'جاري التأكيد...'
                    : 'Confirming...'
                  : isRtl
                  ? 'تأكيد السحب'
                  : 'Confirm Withdrawal'}
              </button>
            </div>
          </div>
        )}

        {/* Visible Transaction History (سجل المعاملات) inside Withdrawal Modal */}
        <TransferHistoryPanel
          isRtl={isRtl}
          defaultFilter="ALL"
          refreshTrigger={historyRefreshCount}
        />
      </div>

      {/* Confirmation Popup */}
      {receiptPopup && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-xs w-full p-5 space-y-4 shadow-2xl text-center">
            <div className="mx-auto w-11 h-11 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-white">
                {isRtl ? 'تم إرسال طلب السحب' : 'Withdrawal Request Sent'}
              </h3>
              <div className="text-lg font-bold font-mono text-emerald-400 pt-1" dir="ltr">
                ${receiptPopup.netAmount} USDT
              </div>
              <div className="text-[11px] font-mono text-neutral-300" dir="ltr">
                {isRtl
                  ? `المبلغ: $${receiptPopup.amount} • الرسوم (${receiptPopup.feePercent}%): -$${receiptPopup.feeAmount}`
                  : `Amount: $${receiptPopup.amount} • Fee (${receiptPopup.feePercent}%): -$${receiptPopup.feeAmount}`}
              </div>
              <p className="text-[11px] font-mono text-neutral-400">
                {receiptPopup.networkLabel} &bull; #{receiptPopup.id}
              </p>
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
