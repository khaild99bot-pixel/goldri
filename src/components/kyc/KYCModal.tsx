/**
 * GOLDRIX KYC Identity Verification Modal
 * Features:
 * 1. Full Legal Name (الاسم الكامل)
 * 2. Curated Country Selector (mode="kyc" — same countries as registration, WITHOUT calling codes)
 * 3. Smart Date of Birth Input with auto "/" formatting (DD/MM/YYYY) + synchronized Day / Month / Year Picker
 * 4. Document Type including Residence Permit (وثيقة إقامة), National ID, Passport, and Driver's License
 * 5. Dual Document Upload: Front Side (من الأمام) & Back Side (من الخلف)
 * 6. Clean institutional review state ("تم إرسال الصور للمراجعة") with zero visible timers/counters,
 *    transitioning automatically after 60 seconds to "تم تأكيد الهوية" with a bespoke verification badge icon.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { CountrySelector } from '../common/CountrySelector.tsx';
import {
  CountryItem,
  detectUserCountrySync,
  getCountryByIso,
  getCountryByNameOrIso,
} from '../../data/countries.ts';
import {
  X,
  ShieldCheck,
  UploadCloud,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Loader2,
  FileCheck2,
  Lock,
} from 'lucide-react';

interface KYCModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Professional Institutional Verified Identity Seal SVG Icon
 */
export const VerifiedIdentityBadgeIcon: React.FC<{ className?: string }> = ({
  className = 'w-16 h-16',
}) => (
  <svg
    viewBox="0 0 80 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="goldrixVerifiedOuter" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#10B981" />
        <stop offset="55%" stopColor="#059669" />
        <stop offset="100%" stopColor="#047857" />
      </linearGradient>
      <linearGradient id="goldrixGoldRing" x1="12" y1="12" x2="68" y2="68" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FBBF24" />
        <stop offset="50%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#D97706" />
      </linearGradient>
    </defs>
    {/* Subtle outer glow ring */}
    <circle cx="40" cy="40" r="37" fill="#10B981" fillOpacity="0.12" stroke="#10B981" strokeOpacity="0.35" strokeWidth="1.5" />
    {/* 12-point institutional seal rosette */}
    <path
      d="M40 6L46.8 11.2L55.3 9.7L59.2 17.4L67.7 19.8L68.2 28.4L75 33.8L71.9 41.9L76 49.5L69.8 55.6L70.3 64.2L62.1 67.2L59.2 75.3L50.6 74.6L44.7 80.9L36.8 76.9L28.9 80.9L23 74.6L14.4 75.3L11.5 67.2L3.3 64.2L3.8 55.6L-2.4 49.5L1.7 41.9L-1.4 33.8L5.4 28.4L5.9 19.8L14.4 17.4L18.3 9.7L26.8 11.2L33.6 6L40 6Z"
      transform="translate(3.2, -3.4) scale(0.92)"
      fill="url(#goldrixVerifiedOuter)"
      stroke="url(#goldrixGoldRing)"
      strokeWidth="2"
    />
    {/* Inner shield ring */}
    <circle cx="40" cy="40" r="23" fill="#06281E" stroke="url(#goldrixGoldRing)" strokeWidth="1.6" />
    {/* Crisp precision checkmark */}
    <path
      d="M29.5 40.5L36.5 47.5L51.5 32.5"
      stroke="#FFFFFF"
      strokeWidth="4.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const MONTHS = [
  { value: '01', labelAr: '01 - يناير', labelEn: '01 - Jan' },
  { value: '02', labelAr: '02 - فبراير', labelEn: '02 - Feb' },
  { value: '03', labelAr: '03 - مارس', labelEn: '03 - Mar' },
  { value: '04', labelAr: '04 - أبريل', labelEn: '04 - Apr' },
  { value: '05', labelAr: '05 - مايو', labelEn: '05 - May' },
  { value: '06', labelAr: '06 - يونيو', labelEn: '06 - Jun' },
  { value: '07', labelAr: '07 - يوليو', labelEn: '07 - Jul' },
  { value: '08', labelAr: '08 - أغسطس', labelEn: '08 - Aug' },
  { value: '09', labelAr: '09 - سبتمبر', labelEn: '09 - Sep' },
  { value: '10', labelAr: '10 - أكتوبر', labelEn: '10 - Oct' },
  { value: '11', labelAr: '11 - نوفمبر', labelEn: '11 - Nov' },
  { value: '12', labelAr: '12 - ديسمبر', labelEn: '12 - Dec' },
];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 80 }, (_, i) => String(CURRENT_YEAR - 18 - i));

/**
 * Formats raw numeric input into DD/MM/YYYY automatically adding "/"
 */
function formatDobWithSlashes(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

export const KYCModal: React.FC<KYCModalProps> = ({ isOpen, onClose }) => {
  const { user, refreshUserData } = useAuth();
  const { isRtl } = useLanguage();
  const frontFileInputRef = useRef<HTMLInputElement | null>(null);
  const backFileInputRef = useRef<HTMLInputElement | null>(null);

  const [submission, setSubmission] = useState<any | null>(null);
  const [fullName, setFullName] = useState('');
  const [documentType, setDocumentType] = useState<
    'NATIONAL_ID' | 'PASSPORT' | 'RESIDENCE_PERMIT' | 'DRIVERS_LICENSE'
  >('NATIONAL_ID');
  const [selectedCountry, setSelectedCountry] = useState<CountryItem>(() => detectUserCountrySync());
  const [country, setCountry] = useState(() => detectUserCountrySync().nameEn);

  // Date of Birth state: DD/MM/YYYY text + synced Day / Month / Year selectors
  const [dobText, setDobText] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');

  // Front & Back Document Photos
  const [frontFileName, setFrontFileName] = useState('');
  const [frontFileDataUrl, setFrontFileDataUrl] = useState<string>('');
  const [backFileName, setBackFileName] = useState('');
  const [backFileDataUrl, setBackFileDataUrl] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Review state (remains PENDING until manual Admin review)
  const [showProcessingPopup, setShowProcessingPopup] = useState(false);

  const syncDobFromString = (val: string) => {
    if (!val) {
      setDobText('');
      setDobDay('');
      setDobMonth('');
      setDobYear('');
      return;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const [y, m, d] = val.split('-');
      setDobDay(d);
      setDobMonth(m);
      setDobYear(y);
      setDobText(`${d}/${m}/${y}`);
    } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
      const [d, m, y] = val.split('/');
      setDobDay(d);
      setDobMonth(m);
      setDobYear(y);
      setDobText(val);
    } else {
      setDobText(val);
    }
  };

  const loadStatus = useCallback(async () => {
    try {
      const res = await api.getKYCStatus(false);
      if (res.submission) {
        setSubmission(res.submission);
        setFullName(res.submission.userFullName || user?.fullName || '');
        if (res.submission.country) {
          setCountry(res.submission.country);
          const matched = getCountryByNameOrIso(res.submission.country);
          if (matched) setSelectedCountry(matched);
        }
        syncDobFromString(res.submission.dateOfBirth || '');
        setDocumentType(res.submission.documentType || 'NATIONAL_ID');
        if (res.submission.frontFileDataUrl || res.submission.fileDataUrl) {
          setFrontFileDataUrl(res.submission.frontFileDataUrl || res.submission.fileDataUrl);
        }
        if (res.submission.backFileDataUrl) {
          setBackFileDataUrl(res.submission.backFileDataUrl);
        }

        if (res.kycStatus === 'PENDING' || res.submission.status === 'PENDING') {
          setShowProcessingPopup(true);
        } else {
          setShowProcessingPopup(false);
        }
      } else if (user?.kycStatus === 'PENDING') {
        setShowProcessingPopup(true);
      } else {
        setShowProcessingPopup(false);
      }
    } catch (err) {
      console.error('Failed to load KYC status:', err);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && user) {
      setFullName(user.fullName || '');
      const userCountry =
        getCountryByIso(user.countryCode) ||
        getCountryByNameOrIso(user.country) ||
        detectUserCountrySync();
      setSelectedCountry(userCountry);
      setCountry(userCountry.nameEn);
      setErrorMessage(null);
      loadStatus();
    }
  }, [isOpen, user?.id, loadStatus]);

  // Periodically check if Admin has manually approved or rejected the submission
  useEffect(() => {
    const isPending =
      showProcessingPopup ||
      user?.kycStatus === 'PENDING' ||
      submission?.status === 'PENDING';

    if (!isPending || user?.kycStatus === 'APPROVED') return;

    const syncInterval = setInterval(async () => {
      try {
        const res = await api.getKYCStatus(false);
        if (res.submission) setSubmission(res.submission);
        if (
          res.kycStatus === 'APPROVED' ||
          res.submission?.status === 'APPROVED' ||
          res.kycStatus === 'REJECTED' ||
          res.submission?.status === 'REJECTED'
        ) {
          if (res.kycStatus === 'REJECTED' || res.submission?.status === 'REJECTED') {
            setShowProcessingPopup(false);
          }
          await refreshUserData();
        }
      } catch {
        // Ignore transient errors
      }
    }, 5000);

    return () => {
      clearInterval(syncInterval);
    };
  }, [showProcessingPopup, user?.kycStatus, submission?.status, refreshUserData]);

  const handleDobTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatDobWithSlashes(e.target.value);
    setDobText(formatted);
    const parts = formatted.split('/');
    if (parts[0]?.length === 2) setDobDay(parts[0]);
    if (parts[1]?.length === 2) setDobMonth(parts[1]);
    if (parts[2]?.length === 4) setDobYear(parts[2]);
  };

  const handlePickerChange = (newDay: string, newMonth: string, newYear: string) => {
    setDobDay(newDay);
    setDobMonth(newMonth);
    setDobYear(newYear);
    if (newDay && newMonth && newYear) {
      setDobText(`${newDay}/${newMonth}/${newYear}`);
    } else if (newDay || newMonth || newYear) {
      setDobText([newDay || 'DD', newMonth || 'MM', newYear || 'YYYY'].join('/'));
    }
  };

  const compressDocumentImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('تعذر قراءة الملف'));
      reader.onload = () => {
        const rawDataUrl = typeof reader.result === 'string' ? reader.result : '';
        if (
          !rawDataUrl ||
          file.type === 'application/pdf' ||
          file.name.toLowerCase().endsWith('.pdf')
        ) {
          resolve(rawDataUrl);
          return;
        }
        const img = new Image();
        img.onerror = () => {
          resolve(rawDataUrl);
        };
        img.onload = () => {
          try {
            const maxDim = 1280;
            let width = img.width || 800;
            let height = img.height || 600;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, width, height);
              ctx.drawImage(img, 0, 0, width, height);
              const compressed = canvas.toDataURL('image/jpeg', 0.82);
              resolve(compressed);
            } else {
              resolve(rawDataUrl);
            }
          } catch {
            resolve(rawDataUrl);
          }
        };
        img.src = rawDataUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFrontFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFrontFileName(file.name);
    setErrorMessage(null);
    try {
      const compressed = await compressDocumentImage(file);
      if (compressed) setFrontFileDataUrl(compressed);
    } catch {
      setErrorMessage(isRtl ? 'تعذر معالجة صورة الوجه الأمامي' : 'Failed to process front photo');
    }
  };

  const handleBackFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBackFileName(file.name);
    setErrorMessage(null);
    try {
      const compressed = await compressDocumentImage(file);
      if (compressed) setBackFileDataUrl(compressed);
    } catch {
      setErrorMessage(isRtl ? 'تعذر معالجة صورة الوجه الخلفي' : 'Failed to process back photo');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalDob =
      dobDay && dobMonth && dobYear ? `${dobDay}/${dobMonth}/${dobYear}` : dobText.trim();

    if (!fullName.trim() || !country.trim() || !finalDob || finalDob.length < 8) {
      setErrorMessage(
        isRtl
          ? 'يرجى إدخال الاسم الكامل، الدولة، وتاريخ الميلاد (يوم/شهر/سنة).'
          : 'Please enter your full name, country, and valid date of birth (DD/MM/YYYY).'
      );
      return;
    }

    const effectiveFront =
      frontFileDataUrl || submission?.frontFileDataUrl || submission?.fileDataUrl || '';
    const effectiveBack = backFileDataUrl || submission?.backFileDataUrl || '';

    if (!effectiveFront && !effectiveBack) {
      setErrorMessage(
        isRtl
          ? 'يرجى إرفاق صورة الوثيقة الرسمية (الوجه الأمامي والخلفي) لإرسالها للمراجعة.'
          : 'Please upload your identity document photo for verification.'
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await api.submitKYC({
        fullName: fullName.trim(),
        documentType,
        country: country.trim(),
        dateOfBirth: finalDob,
        frontFileName: frontFileName || 'id_front.jpg',
        frontFileDataUrl: effectiveFront || effectiveBack,
        backFileName: backFileName || 'id_back.jpg',
        backFileDataUrl: effectiveBack || undefined,
      });

      const sub = res.submission;
      setSubmission(sub);
      setShowProcessingPopup(true);

      await refreshUserData();
    } catch (err: any) {
      setErrorMessage(err.message || (isRtl ? 'فشل إرسال الطلب' : 'Submission failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isApproved =
    user?.kycStatus === 'APPROVED' || submission?.status === 'APPROVED';
  const isProcessing =
    !isApproved &&
    (showProcessingPopup ||
      user?.kycStatus === 'PENDING' ||
      submission?.status === 'PENDING');

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-4 sm:p-5 space-y-4 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                {isRtl ? 'تأكيد وتوثيق الهوية الرسمية (KYC)' : 'Identity Verification (KYC)'}
              </h2>
              <p className="text-[11px] text-neutral-400">
                {isRtl
                  ? 'حماية مؤسسية للحساب وتفعيل السحب الفوري الكامل'
                  : 'Institutional account protection & full withdrawal access'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. APPROVED STATE POPUP ("تم تأكيد الهوية" with Professional Verification Icon) */}
        {isApproved && (
          <div className="py-7 px-5 bg-gradient-to-b from-emerald-950/35 via-neutral-950 to-neutral-950 border border-emerald-500/35 rounded-2xl text-center space-y-4 animate-fadeInUp shadow-xl">
            <div className="mx-auto flex items-center justify-center">
              <VerifiedIdentityBadgeIcon className="w-20 h-20 drop-shadow-[0_8px_24px_rgba(16,185,129,0.3)]" />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 text-xs font-extrabold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{isRtl ? 'تم تأكيد الهوية' : 'Identity Verified'}</span>
              </span>
              <h3 className="text-lg sm:text-xl font-black text-white">
                {isRtl ? 'تم تأكيد الهوية بنجاح' : 'Identity Successfully Verified'}
              </h3>
              <p className="text-xs text-neutral-300 max-w-md mx-auto leading-relaxed">
                {isRtl
                  ? 'تمت مطابقة واعتماد وثائق هويتك الرسمية بنجاح. حسابك الآن موثّق بالكامل ومفعّل لكافة عمليات التداول الذكي والسحب الفوري للأرباح.'
                  : 'Your official identity documents have been verified and approved. Your account now has full access to smart trading and instant withdrawals.'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-900/90 border border-neutral-800 grid grid-cols-2 gap-3 text-xs text-start">
              <div className="space-y-0.5">
                <span className="text-neutral-400 block text-[11px]">
                  {isRtl ? 'حالة التوثيق' : 'Verification Status'}
                </span>
                <span className="font-extrabold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'موثق رسمياً' : 'Officially Verified'}</span>
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-neutral-400 block text-[11px]">
                  {isRtl ? 'صلاحيات الحساب' : 'Account Privileges'}
                </span>
                <span className="font-extrabold text-white">
                  {isRtl ? 'تداول وسحب كامل' : 'Full Trading & Payouts'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs transition-colors cursor-pointer shadow-lg shadow-emerald-500/15"
            >
              {isRtl ? 'تم — العودة إلى الحساب' : 'Done — Return to Account'}
            </button>
          </div>
        )}

        {/* 2. REVIEW STATE POPUP ("قيد المراجعة من قبل الإدارة") */}
        {isProcessing && (
          <div className="p-6 bg-neutral-950 border border-amber-500/30 rounded-2xl space-y-5 text-center relative overflow-hidden animate-fadeInUp">
            {/* Clean Institutional Review Icon */}
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/35 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/10">
                <FileCheck2 className="w-8 h-8" />
              </div>
            </div>

            {/* Main Notice */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-extrabold">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>
                  {isRtl ? 'قيد المراجعة من قبل الإدارة' : 'Pending Administrator Review'}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white">
                {isRtl ? 'تم إرسال وثائق الهوية لمراجعة الإدارة' : 'Identity Documents Sent for Admin Review'}
              </h3>
              <p className="text-xs text-neutral-300 leading-relaxed max-w-md mx-auto">
                {isRtl
                  ? 'تم استلام صور وثيقة الهوية والبيانات الشخصية بنجاح. يقوم مدير المنصة بمراجعة الوثائق يدوياً والتأكد من صحتها قبل اعتماد وتوثيق الحساب رسمياً.'
                  : 'Your identity photos and details have been received. The platform administrator will manually review and verify your submission.'}
              </p>
            </div>

            {/* Clean Institutional Checklist */}
            <div className="text-start space-y-2.5 bg-neutral-900/80 p-4 rounded-xl border border-neutral-800 text-xs">
              <div className="flex items-center gap-2.5 text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  {isRtl
                    ? 'تم رفع واستلام صور الوثيقة الرسمية (الأمامية والخلفية)'
                    : 'Official identity document photos uploaded and received'}
                </span>
              </div>

              <div className="flex items-center gap-2.5 text-amber-300 font-bold">
                <Loader2 className="w-4 h-4 text-amber-400 shrink-0 animate-spin" />
                <span>
                  {isRtl
                    ? 'بانتظار مراجعة واعتماد مدير المنصة لتأكيد الهوية رسمياً'
                    : 'Awaiting manual review and approval by the administrator'}
                </span>
              </div>

              <div className="flex items-center gap-2.5 text-neutral-400 font-medium pt-1 border-t border-neutral-800/80">
                <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  {isRtl
                    ? 'بياناتك مشفرة بالكامل وفق معايير الأمان المؤسسي'
                    : 'Your documents are encrypted under institutional security standards'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs transition-colors cursor-pointer"
            >
              {isRtl ? 'حسناً، إغلاق النافذة' : 'Close Window'}
            </button>
          </div>
        )}

        {/* 3. FORM STATE (When NOT_SUBMITTED or REJECTED) */}
        {!isApproved && !isProcessing && (
          <>
            {(user?.kycStatus === 'REJECTED' || submission?.status === 'REJECTED') && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/35 rounded-xl text-xs text-rose-300 space-y-1">
                <div className="font-black text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{isRtl ? 'تم رفض طلب التوثيق السابق من قبل الإدارة' : 'Previous KYC Submission Declined'}</span>
                </div>
                {submission?.adminNotes && (
                  <p className="text-[11px] text-rose-200/90">
                    {isRtl ? `ملاحظة الإدارة: ${submission.adminNotes}` : `Admin Note: ${submission.adminNotes}`}
                  </p>
                )}
                <p className="text-[11px] text-neutral-300">
                  {isRtl
                    ? 'يرجى التأكد من وضوح صور الوثيقة وصحة البيانات ثم إعادة الإرسال للمراجعة.'
                    : 'Please upload clear document photos and resubmit for administrator review.'}
                </p>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              {/* 1. Full Name */}
              <div>
                <label className="text-neutral-300 font-bold block mb-1">
                  {isRtl ? 'الاسم الكامل (كما في الوثيقة الرسمية)' : 'Full Legal Name'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isRtl ? 'أدخل الاسم الكامل' : 'Enter your full legal name'}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* 2. Curated Country Selector */}
              <div>
                <label className="text-neutral-300 font-bold block mb-1">
                  {isRtl ? 'الدولة / الجنسية' : 'Country / Nationality'}
                </label>
                <CountrySelector
                  mode="kyc"
                  value={selectedCountry}
                  isRtl={isRtl}
                  onChange={(c) => {
                    setSelectedCountry(c);
                    setCountry(c.nameEn);
                  }}
                />
              </div>

              {/* 3. Smart Date of Birth */}
              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-neutral-300 font-bold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isRtl ? 'تاريخ الميلاد (المواليد)' : 'Date of Birth'}</span>
                  </label>
                  <span className="text-[10px] font-mono text-neutral-400" dir="ltr">
                    DD / MM / YYYY
                  </span>
                </div>

                <input
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  required
                  placeholder="15/08/1995"
                  value={dobText}
                  onChange={handleDobTextChange}
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 focus:border-emerald-500 rounded-xl font-mono text-center text-sm font-bold text-white tracking-wider focus:outline-none"
                />

                <div className="grid grid-cols-3 gap-2" dir="ltr">
                  <select
                    value={dobDay}
                    onChange={(e) => handlePickerChange(e.target.value, dobMonth, dobYear)}
                    className="px-2.5 py-2 bg-neutral-900 border border-neutral-800 focus:border-emerald-500 rounded-lg text-xs text-white font-mono focus:outline-none cursor-pointer"
                  >
                    <option value="">{isRtl ? 'اليوم (DD)' : 'Day (DD)'}</option>
                    {DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>

                  <select
                    value={dobMonth}
                    onChange={(e) => handlePickerChange(dobDay, e.target.value, dobYear)}
                    className="px-2.5 py-2 bg-neutral-900 border border-neutral-800 focus:border-emerald-500 rounded-lg text-xs text-white focus:outline-none cursor-pointer"
                  >
                    <option value="">{isRtl ? 'الشهر (MM)' : 'Month (MM)'}</option>
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {isRtl ? m.labelAr : m.labelEn}
                      </option>
                    ))}
                  </select>

                  <select
                    value={dobYear}
                    onChange={(e) => handlePickerChange(dobDay, dobMonth, e.target.value)}
                    className="px-2.5 py-2 bg-neutral-900 border border-neutral-800 focus:border-emerald-500 rounded-lg text-xs text-white font-mono focus:outline-none cursor-pointer"
                  >
                    <option value="">{isRtl ? 'السنة (YYYY)' : 'Year (YYYY)'}</option>
                    {YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 4. Document Type */}
              <div>
                <label className="text-neutral-300 font-bold block mb-1">
                  {isRtl ? 'نوع الوثيقة الرسمية' : 'Document Type'}
                </label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="NATIONAL_ID">
                    {isRtl ? 'الهوية الوطنية / البطاقة الشخصية' : 'National ID'}
                  </option>
                  <option value="RESIDENCE_PERMIT">
                    {isRtl ? 'وثيقة إقامة / تصريح إقامة' : 'Residence Permit'}
                  </option>
                  <option value="PASSPORT">
                    {isRtl ? 'جواز السفر' : 'Passport'}
                  </option>
                  <option value="DRIVERS_LICENSE">
                    {isRtl ? 'رخصة القيادة' : "Driver's License"}
                  </option>
                </select>
              </div>

              {/* 5. Upload ID Photo Front & Back */}
              <div>
                <label className="text-neutral-300 font-bold block mb-1.5">
                  {isRtl
                    ? 'إرفاق صور الوثيقة (الوجه الأمامي والوجه الخلفي)'
                    : 'Upload Document Photos (Front & Back)'}
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Front Side */}
                  <div>
                    <input
                      ref={frontFileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFrontFileChange}
                      className="hidden"
                    />
                    <div
                      onClick={() => frontFileInputRef.current?.click()}
                      className="p-3 bg-neutral-950 border border-dashed border-neutral-700 hover:border-emerald-500 rounded-xl text-center space-y-1.5 transition-colors cursor-pointer h-full flex flex-col justify-center"
                    >
                      <UploadCloud className="w-6 h-6 text-emerald-400 mx-auto" />
                      <div className="text-xs text-white font-bold">
                        {isRtl ? 'صورة الوثيقة من الأمام' : 'Front Side Photo'}
                      </div>
                      <p className="text-[10px] text-neutral-400 truncate px-1">
                        {frontFileName
                          ? frontFileName
                          : isRtl
                          ? 'اضغط لرفع الوجه الأمامي'
                          : 'Click to upload front side'}
                      </p>

                      {frontFileDataUrl && frontFileDataUrl.startsWith('data:image') && (
                        <div className="pt-1">
                          <img
                            src={frontFileDataUrl}
                            alt="Front ID Preview"
                            className="h-24 mx-auto rounded-lg border border-neutral-800 object-contain"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Back Side */}
                  <div>
                    <input
                      ref={backFileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleBackFileChange}
                      className="hidden"
                    />
                    <div
                      onClick={() => backFileInputRef.current?.click()}
                      className="p-3 bg-neutral-950 border border-dashed border-neutral-700 hover:border-emerald-500 rounded-xl text-center space-y-1.5 transition-colors cursor-pointer h-full flex flex-col justify-center"
                    >
                      <UploadCloud className="w-6 h-6 text-emerald-400 mx-auto" />
                      <div className="text-xs text-white font-bold">
                        {isRtl ? 'صورة الوثيقة من الخلف' : 'Back Side Photo'}
                      </div>
                      <p className="text-[10px] text-neutral-400 truncate px-1">
                        {backFileName
                          ? backFileName
                          : isRtl
                          ? 'اضغط لرفع الوجه الخلفي'
                          : 'Click to upload back side'}
                      </p>

                      {backFileDataUrl && backFileDataUrl.startsWith('data:image') && (
                        <div className="pt-1">
                          <img
                            src={backFileDataUrl}
                            alt="Back ID Preview"
                            className="h-24 mx-auto rounded-lg border border-neutral-800 object-contain"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs transition-colors shadow-lg disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isRtl ? 'جاري إرسال الصور للمراجعة...' : 'Submitting Documents...'}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      {isRtl
                        ? 'إرسال الصور لتأكيد الهوية'
                        : 'Submit Photos to Verify Identity'}
                    </span>
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

