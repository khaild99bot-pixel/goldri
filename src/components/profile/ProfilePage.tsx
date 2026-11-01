/**
 * GOLDRIX Clear & Intuitive Personal Profile Page
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useTheme } from '../../context/ThemeContext.tsx';
import { api } from '../../services/api.ts';
import { formatClientId, formatDisplayEmail } from '../common/GoldrixLogo.tsx';
import { CountrySelector } from '../common/CountrySelector.tsx';
import {
  CountryItem,
  detectUserCountrySync,
  getCountryByIso,
  getCountryByNameOrIso,
  getCountryByPhone,
} from '../../data/countries.ts';
import { UserInvestment } from '../../types/index.ts';
import {
  Copy,
  LogOut,
  X,
  Check,
  ExternalLink,
  User as UserIcon,
  ShieldCheck,
  TrendingUp,
  Clock,
  CheckCircle2,
  Settings,
  Lock,
  HelpCircle,
  Info,
  Headphones,
  ChevronDown,
  Camera,
  Bot,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { FloatingAISupportBot } from '../ai/FloatingAISupportBot.tsx';
import { PlanThumbnailIcon, getPlanSectorMeta, getPlanDailyRatePercent } from '../common/PlanSectorBadge.tsx';
import { useSoundNotifications } from '../../utils/soundNotifications.ts';
import { VerifiedIdentityBadgeIcon } from '../kyc/KYCModal.tsx';

interface ProfilePageProps {
  onOpenKYC: () => void;
  setCurrentTab: (tab: string) => void;
  onOpenAuth: () => void;
  onNavigateAdmin?: (module?: 'overview' | 'server' | 'users' | 'kyc' | 'withdrawals' | 'deposits' | 'plans' | 'audit' | 'settings') => void;
  onOpenDeposit?: () => void;
  onOpenWithdrawal?: () => void;
  onOpenSupport?: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  onOpenKYC,
  setCurrentTab,
  onOpenAuth,
  onNavigateAdmin,
  onOpenSupport,
}) => {
  const { user, refreshUserData, logout } = useAuth();
  const { language, setLanguage, isRtl, supportedLanguages } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { soundEnabled, toggleSound } = useSoundNotifications();

  const [copiedId, setCopiedId] = useState(false);

  const [editNameOpen, setEditNameOpen] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');

  const [editEmailOpen, setEditEmailOpen] = useState(false);
  const [editEmailValue, setEditEmailValue] = useState('');
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [emailModalError, setEmailModalError] = useState<string | null>(null);

  const [selectedCountry, setSelectedCountry] = useState<CountryItem>(() => detectUserCountrySync());
  const [editPhoneOpen, setEditPhoneOpen] = useState(false);
  const [phoneDigits, setPhoneDigits] = useState('');
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
  const [phoneModalError, setPhoneModalError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [investments, setInvestments] = useState<UserInvestment[]>([]);
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');

  // Separate expandable fields in Profile
  const [openSection, setOpenSection] = useState<'settings' | 'privacy' | 'faq' | 'about' | null>(null);
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);
  const [aiBotOpen, setAiBotOpen] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);

  const isChiefAdmin = Boolean(
    user && (user.role === 'ADMIN' || user.email?.toLowerCase() === 'hha253ee@gmail.com')
  );

  const cleanEmail = user ? formatDisplayEmail(user.email) : '';
  const clientId = user ? formatClientId(user.id) : '';

  useEffect(() => {
    if (user) {
      setEditNameValue(user.fullName || '');
      setEditEmailValue(formatDisplayEmail(user.email));

      api
        .getUserInvestments()
        .then((list) => {
          const own = (list || []).filter((inv) => inv.userId === user.id);
          own.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
          setInvestments(own);
        })
        .catch(() => {});

      const resolvedCountry =
        getCountryByPhone(user.phone) ||
        getCountryByIso(user.countryCode) ||
        getCountryByNameOrIso(user.country) ||
        detectUserCountrySync();

      setSelectedCountry(resolvedCountry);

      if (user.phone) {
        const stripped = user.phone.startsWith(resolvedCountry.dialCode)
          ? user.phone.slice(resolvedCountry.dialCode.length).trim()
          : user.phone.replace(/^\+\d+\s*/, '').trim();
        setPhoneDigits(stripped);
      } else {
        setPhoneDigits('');
      }
    }
  }, [user]);

  const handleCopyId = () => {
    if (!clientId) return;
    navigator.clipboard.writeText(clientId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1800);
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = editNameValue.trim();
    if (!trimmed) return;
    try {
      await api.updateProfile({ fullName: trimmed });
      await refreshUserData();
      setEditNameOpen(false);
      setStatusMsg({ type: 'success', text: isRtl ? 'تم تحديث الاسم بنجاح' : 'Name updated' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'فشل تحديث الاسم' });
    }
  };

  const handleVerifyAndSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailModalError(null);
    const trimmedEmail = editEmailValue.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailModalError(isRtl ? 'بريد إلكتروني غير صحيح' : 'Invalid email address');
      return;
    }

    setIsVerifyingEmail(true);
    try {
      await api.updateProfile({
        email: trimmedEmail,
        isEmailVerified: true,
      });
      await refreshUserData();
      setEditEmailOpen(false);
      setStatusMsg({
        type: 'success',
        text: isRtl ? 'تم تحديث البريد الإلكتروني بنجاح' : 'Email updated',
      });
    } catch (err: any) {
      setEmailModalError(err.message || (isRtl ? 'تعذر الحفظ' : 'Failed to save'));
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  const cleanPhoneDigits = phoneDigits.trim().replace(/^0+/, '');
  const fullFormattedPhone = cleanPhoneDigits
    ? `${selectedCountry.dialCode} ${cleanPhoneDigits}`
    : '';

  const handleVerifyAndSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneModalError(null);
    if (!cleanPhoneDigits || cleanPhoneDigits.length < 6) {
      setPhoneModalError(isRtl ? 'رقم هاتف غير صحيح' : 'Invalid phone number');
      return;
    }

    setIsVerifyingPhone(true);
    try {
      await api.updateProfile({
        phone: fullFormattedPhone,
        country: selectedCountry.nameEn,
        countryCode: selectedCountry.iso,
        dialCode: selectedCountry.dialCode,
        isPhoneVerified: true,
      });
      await refreshUserData();
      setEditPhoneOpen(false);
      setStatusMsg({
        type: 'success',
        text: isRtl ? 'تم تحديث رقم الهاتف بنجاح' : 'Phone updated',
      });
    } catch (err: any) {
      setPhoneModalError(err.message || (isRtl ? 'تعذر الحفظ' : 'Failed to save'));
    } finally {
      setIsVerifyingPhone(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u0660-\u0669\u06F0-\u06F9]/;
    if (arabicRegex.test(currentPassword) || arabicRegex.test(newPassword) || arabicRegex.test(confirmPassword)) {
      setStatusMsg({
        type: 'error',
        text: isRtl
          ? 'كلمة المرور لا يمكن أن تكون بالعربية، يرجى استخدام الأحرف الإنجليزية والأرقام فقط'
          : 'Password cannot contain Arabic characters. Please use English characters and numbers only.',
      });
      return;
    }
    if (newPassword.length < 8) {
      setStatusMsg({ type: 'error', text: isRtl ? 'كلمة المرور 8 أحرف على الأقل' : 'Min 8 characters' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatusMsg({ type: 'error', text: isRtl ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match' });
      return;
    }
    setIsSavingSecurity(true);
    setStatusMsg(null);
    try {
      await api.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setStatusMsg({ type: 'success', text: isRtl ? 'تم تغيير كلمة المرور بنجاح' : 'Password updated' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'فشل التحديث' });
    } finally {
      setIsSavingSecurity(false);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas');
          const size = 240;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const minSide = Math.min(img.width, img.height);
            const sx = (img.width - minSide) / 2;
            const sy = (img.height - minSide) / 2;
            ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
          }
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          await api.updateProfile({ avatarUrl: dataUrl });
          await refreshUserData();
          setStatusMsg({
            type: 'success',
            text: isRtl
              ? 'تمت إضافة واعتماد الصورة الشخصية بنجاح فوراً'
              : 'Profile photo updated and approved immediately',
          });
        } catch (err: any) {
          setStatusMsg({
            type: 'error',
            text: err.message || (isRtl ? 'تعذر حفظ الصورة الشخصية' : 'Failed to save profile photo'),
          });
        } finally {
          setIsUploadingAvatar(false);
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  if (!user) {
    return (
      <div className="max-w-sm mx-auto px-4 py-12 text-center">
        <button
          type="button"
          onClick={onOpenAuth}
          className="w-full py-2.5 rounded-xl bg-emerald-500 text-neutral-950 font-bold text-xs cursor-pointer"
        >
          {isRtl ? 'تسجيل الدخول' : 'Sign In'}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-5 space-y-5">
      {statusMsg && (
        <div className="px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white flex items-center justify-between">
          <span className="font-bold">{statusMsg.text}</span>
          <button type="button" onClick={() => setStatusMsg(null)} className="text-neutral-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hidden File Input for Instant Auto-Approved Profile Picture */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarUpload}
        className="hidden"
      />

      {/* 1. Profile Header with Verified ID Badge Next to Avatar & Separate Option Fields */}
      <section className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 space-y-4 animate-fadeInUp">
        {/* Identity Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3.5">
            {/* Clickable Avatar Photo + Camera Upload + Verified Identity Checkmark */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                title={isRtl ? 'إضافة أو تغيير الصورة الشخصية (تعتمد فوراً)' : 'Upload Profile Picture'}
                className="w-14 h-14 rounded-full bg-emerald-500/15 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 overflow-hidden cursor-pointer group relative"
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-6 h-6" />
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera className="w-4 h-4 text-white" />
                </div>
              </button>

              {/* Camera mini button to upload photo */}
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                title={isRtl ? 'تغيير الصورة الشخصية' : 'Change Photo'}
                className="w-5 h-5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white ring-2 ring-neutral-900 flex items-center justify-center absolute -top-0.5 -left-0.5 cursor-pointer"
              >
                <Camera className="w-3 h-3 text-emerald-400" />
              </button>

              {/* Professional Verified Identity Seal — ONLY when KYC is APPROVED */}
              {user.kycStatus === 'APPROVED' && (
                <div
                  title={isRtl ? 'تم تأكيد الهوية' : 'Identity Verified'}
                  className="w-6 h-6 rounded-full bg-neutral-900 ring-2 ring-neutral-900 flex items-center justify-center absolute -bottom-1 -right-1"
                >
                  <VerifiedIdentityBadgeIcon className="w-6 h-6" />
                </div>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-bold text-white" dir="ltr">
                  {user.fullName}
                </span>

                {/* Identity Status Badge Next to Photo/Name */}
                {user.kycStatus === 'APPROVED' ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-[11px] font-extrabold flex items-center gap-1.5">
                    <VerifiedIdentityBadgeIcon className="w-4 h-4 shrink-0" />
                    <span>{isRtl ? 'تم تأكيد الهوية' : 'Identity Verified'}</span>
                  </span>
                ) : user.kycStatus === 'PENDING' ? (
                  <button
                    type="button"
                    onClick={onOpenKYC}
                    className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{isRtl ? 'تم إرسال الصور للمراجعة' : 'Documents Under Review'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenKYC}
                    className="px-2.5 py-0.5 rounded-full bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-400 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{isRtl ? 'غير موثق — تأكيد الهوية' : 'Unverified — Verify ID'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCopyId}
                  dir="ltr"
                  className="px-2.5 py-0.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs font-mono font-bold text-neutral-300 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <span>ID: {clientId}</span>
                  {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-xs text-neutral-400 font-mono" dir="ltr">
                  {cleanEmail}
                </span>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                >
                  <Camera className="w-3 h-3" />
                  <span>
                    {isUploadingAvatar
                      ? isRtl
                        ? 'جاري الحفظ...'
                        : 'Saving...'
                      : user.avatarUrl
                      ? isRtl
                        ? 'تغيير الصورة الشخصية'
                        : 'Change Photo'
                      : isRtl
                      ? 'إضافة صورة شخصية'
                      : 'Add Photo'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 5 Separate Fields (خانات منفصلة) */}
        <div className="space-y-2.5 text-xs">
          {/* Field 1: إعدادات الحساب (الصورة الشخصية، الاسم، الإيميل، الرقم، الهوية، اللغة) */}
          <div className="rounded-xl bg-neutral-950/80 border border-neutral-800 overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenSection(openSection === 'settings' ? null : 'settings')}
              className="w-full px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-neutral-900/70 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Settings className="w-4 h-4" />
                </div>
                <div className="text-right rtl:text-right ltr:text-left">
                  <span className="font-bold text-white text-sm block">
                    {isRtl ? 'إعدادات الحساب' : 'Account Settings'}
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    {isRtl
                      ? 'الصورة الشخصية، الاسم الكامل، البريد الإلكتروني، ورقم الهاتف'
                      : 'Profile Photo, Full Name, Email & Phone Number'}
                  </span>
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-neutral-400 transition-transform ${
                  openSection === 'settings' ? 'rotate-180 text-emerald-400' : ''
                }`}
              />
            </button>

            {openSection === 'settings' && (
              <div className="px-4 pb-4 pt-2 border-t border-neutral-800 divide-y divide-neutral-800/80">
                {/* Profile Picture Row */}
                <div className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-neutral-900 border border-emerald-500/40 overflow-hidden flex items-center justify-center text-emerald-400 shrink-0">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <span className="text-white font-bold block">
                        {isRtl ? 'الصورة الشخصية' : 'Profile Photo'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{isRtl ? 'اختيار صورة' : 'Upload'}</span>
                  </button>
                </div>

                {/* Full Name */}
                <div className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-neutral-400 block mb-0.5">{isRtl ? 'الاسم الكامل:' : 'Full Name:'}</span>
                    <span className="font-bold text-white text-sm" dir="ltr">
                      {user.fullName}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditNameOpen(true)}
                    className="px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-bold cursor-pointer"
                  >
                    {isRtl ? 'تعديل الاسم' : 'Edit'}
                  </button>
                </div>

                {/* Email */}
                <div className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-neutral-400 block mb-0.5">{isRtl ? 'البريد الإلكتروني:' : 'Email Address:'}</span>
                    <span className="font-mono font-bold text-white text-sm" dir="ltr">
                      {cleanEmail || (isRtl ? 'غير مضاف' : 'Not set')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEmailModalError(null);
                      setEditEmailOpen(true);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-bold cursor-pointer"
                  >
                    {isRtl ? 'تعديل البريد' : 'Edit'}
                  </button>
                </div>

                {/* Phone */}
                <div className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-neutral-400 block mb-0.5">{isRtl ? 'رقم الهاتف:' : 'Phone Number:'}</span>
                    <span className="font-mono font-bold text-white text-sm" dir="ltr">
                      {user.phone || (isRtl ? 'غير مضاف' : 'Not set')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPhoneModalError(null);
                      setEditPhoneOpen(true);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-bold cursor-pointer"
                  >
                    {isRtl ? 'تعديل الرقم' : 'Edit'}
                  </button>
                </div>

                {/* KYC */}
                <div className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-neutral-400 block mb-0.5">{isRtl ? 'توثيق الهوية الرسمية (KYC):' : 'KYC Verification:'}</span>
                    <span
                      className={`font-bold text-xs ${
                        user.kycStatus === 'APPROVED'
                          ? 'text-emerald-400'
                          : user.kycStatus === 'PENDING'
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {user.kycStatus === 'APPROVED'
                        ? isRtl
                          ? 'تم تأكيد الهوية — حسابك موثق رسمياً بالكامل'
                          : 'Identity Verified — Account Officially Approved'
                        : user.kycStatus === 'PENDING'
                        ? isRtl
                          ? 'تم إرسال الصور للمراجعة لتأكيد الهوية'
                          : 'Identity documents submitted for review'
                        : isRtl
                        ? 'غير موثق — يرجى إرفاق صور الوثيقة الرسمية لتأكيد الهوية'
                        : 'Unverified — Upload ID document photos'}
                    </span>
                  </div>
                  {user.kycStatus === 'APPROVED' ? (
                    <span className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 font-extrabold text-xs shrink-0 flex items-center gap-1.5">
                      <VerifiedIdentityBadgeIcon className="w-4 h-4 shrink-0" />
                      <span>{isRtl ? 'تم تأكيد الهوية' : 'Identity Verified'}</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={onOpenKYC}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold cursor-pointer shrink-0"
                    >
                      {user.kycStatus === 'PENDING'
                        ? isRtl
                          ? 'حالة المراجعة'
                          : 'Review Status'
                        : isRtl
                        ? 'تأكيد الهوية'
                        : 'Verify ID'}
                    </button>
                  )}
                </div>

                {/* Language & Theme */}
                <div className="py-3 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-neutral-400">{isRtl ? 'اللغة:' : 'Language:'}</span>
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-bold cursor-pointer"
                    >
                      {theme === 'dark' ? (isRtl ? 'المظهر النهاري' : 'Light Mode') : isRtl ? 'المظهر الليلي' : 'Dark Mode'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {supportedLanguages.map((l) => (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => {
                          setLanguage(l.code);
                          api.updateProfile({ language: l.code }).catch(() => {});
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                          language === l.code
                            ? 'bg-emerald-500 text-neutral-950'
                            : 'bg-neutral-900 text-neutral-300 border border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        {l.nativeName}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sound Notifications Toggle inside Account Settings */}
                <div className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 ${
                        soundEnabled
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-500'
                      }`}
                    >
                      {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </div>
                    <div>
                      <span className="font-bold text-white block">
                        {isRtl ? 'تفعيل إشعارات الصوت' : 'Sound Notifications'}
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        {soundEnabled
                          ? isRtl
                            ? 'صوت تنبيه الإشعارات والعمليات مفعّل'
                            : 'Audio alerts for notifications enabled'
                          : isRtl
                          ? 'صوت تنبيه الإشعارات متوقف'
                          : 'Audio alerts muted'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSound()}
                    className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors ${
                      soundEnabled
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950'
                        : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                    }`}
                  >
                    {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                    <span>
                      {soundEnabled
                        ? isRtl
                          ? 'مفعّل'
                          : 'Enabled'
                        : isRtl
                        ? 'تفعيل الصوت'
                        : 'Enable Sound'}
                    </span>
                  </button>
                </div>

                {/* Smart AI Assistant inside Account Settings */}
                <div className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-white block">
                        {isRtl ? 'المساعد الذكي' : 'AI Assistant'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAiBotOpen(true)}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>{isRtl ? 'فتح المساعد الذكي' : 'Open AI Bot'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Standalone Quick Option: تفعيل إشعارات الصوت (Sound Notifications) */}
          <div className="rounded-xl bg-neutral-950/80 border border-neutral-800 px-4 py-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
                  soundEnabled
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-500'
                }`}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </div>
              <div className="text-right rtl:text-right ltr:text-left">
                <span className="font-bold text-white text-sm block">
                  {isRtl ? 'تفعيل إشعارات الصوت' : 'Sound Notifications'}
                </span>
                <span className="text-[11px] text-neutral-400">
                  {soundEnabled
                    ? isRtl
                      ? 'تنبيه صوتي فوري عند الإيداع والسحب ونزول الأرباح'
                      : 'Instant sound chime on deposits, withdrawals & profits'
                    : isRtl
                    ? 'اضغط لتشغيل التنبيه الصوتي للإشعارات'
                    : 'Tap to enable audio notification alerts'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggleSound()}
              className={`px-3.5 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                soundEnabled
                  ? 'bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-500/20'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>
                {soundEnabled
                  ? isRtl
                    ? 'الصوت مفعّل'
                    : 'Sound ON'
                  : isRtl
                  ? 'تفعيل الصوت'
                  : 'Enable Sound'}
              </span>
            </button>
          </div>

          {/* Field 2: سياسة الخصوصية */}
          <div className="rounded-xl bg-neutral-950/80 border border-neutral-800 overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenSection(openSection === 'privacy' ? null : 'privacy')}
              className="w-full px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-neutral-900/70 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Lock className="w-4 h-4" />
                </div>
                <div className="text-right rtl:text-right ltr:text-left">
                  <span className="font-bold text-white text-sm block">
                    {isRtl ? 'سياسة الخصوصية' : 'Privacy Policy'}
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    {isRtl ? 'حماية البيانات وتأمين أصول ومحافظ العملاء' : 'Data encryption & 100% reserve protection'}
                  </span>
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-neutral-400 transition-transform ${
                  openSection === 'privacy' ? 'rotate-180 text-emerald-400' : ''
                }`}
              />
            </button>

            {openSection === 'privacy' && (
              <div className="px-4 pb-4 pt-3 border-t border-neutral-800 space-y-2 leading-relaxed text-neutral-300">
                <p>
                  {isRtl
                    ? '• تشفير البيانات: جميع بيانات المستخدمين ووثائق التحقق من الهوية (KYC) مشفرة بالكامل بمعيار AES-256 وبروتوكول TLS 1.3 ولا تتم مشاركتها مع أي طرف ثالث.'
                    : '• Data Encryption: All personal data and KYC documents are encrypted using AES-256 and TLS 1.3 and never shared with third parties.'}
                </p>
                <p>
                  {isRtl
                    ? '• حماية الأموال والاحتياطيات: تُحفظ كافة إيداعات وأرصدة العملاء في خزائن ومحافظ باردة منفصلة متعددة التوقيعات (MPC Cold Storage) بنسبة احتياطي أمان 100%.'
                    : '• Asset Protection: Client funds are held in segregated multi-signature cold storage with 100% reserve backing.'}
                </p>
              </div>
            )}
          </div>

          {/* Field 3: الأسئلة الشائعة */}
          <div className="rounded-xl bg-neutral-950/80 border border-neutral-800 overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenSection(openSection === 'faq' ? null : 'faq')}
              className="w-full px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-neutral-900/70 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div className="text-right rtl:text-right ltr:text-left">
                  <span className="font-bold text-white text-sm block">
                    {isRtl ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    {isRtl ? 'إجابات منفصلة حول الإيداع، السحب، الخطط، والدعوات' : 'Answers on Deposit, Withdraw, Plans & Referrals'}
                  </span>
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-neutral-400 transition-transform ${
                  openSection === 'faq' ? 'rotate-180 text-emerald-400' : ''
                }`}
              />
            </button>

            {openSection === 'faq' && (
              <div className="px-4 pb-4 pt-3 border-t border-neutral-800 space-y-2">
                {[
                  {
                    id: 'faq_dep',
                    q: isRtl ? 'طريقة الإيداع' : 'How to Deposit',
                    a: isRtl
                      ? 'الحد الأدنى $100 عبر USDT أو BTC أو ETH أو BNB مع رمز QR فوري.'
                      : 'Min $100 via USDT, BTC, ETH, or BNB with instant QR code.',
                  },
                  {
                    id: 'faq_wit',
                    q: isRtl ? 'شروط ورسوم السحب' : 'Withdrawal & Fees',
                    a: isRtl
                      ? 'أول سحب متاح بعد 24 ساعة من التفعيل. رسوم السحب تتدرج حسب المبلغ (8% لأقل من $50، 7% من $50، 5% من $100، 4% من $300، و3% للمبالغ $500 فأكثر) بعد توثيق الهوية.'
                      : 'First withdrawal unlocks after 24 hours. Tiered fees by amount (8% <$50, 7% $50+, 5% $100+, 4% $300+, 3% $500+).',
                  },
                  {
                    id: 'faq_plans',
                    q: isRtl ? 'نظام خطط التداول الذكي (كل 24 ساعة)' : 'Smart Trading Plans (24h Yield)',
                    a: isRtl
                      ? '6 خطط استثمارية ($100 إلى $3,000) في قطاعات الذهب والنفط والسندات والأسهم بعائد يومي متدرج يُضاف لرصيد السحب كل 24 ساعة.'
                      : '6 investment plans ($100 to $3,000) across Gold, Oil, Bonds & Stocks with daily yield settled every 24 hours.',
                  },
                  {
                    id: 'faq_ref',
                    q: isRtl ? 'أرباح الدعوات و VIP' : 'Referrals & VIP',
                    a: isRtl
                      ? '+$10 فورية لكل $100 + عمولة يومية 3%–15% حسب مستوى VIP.'
                      : '+$10 per $100 + 3%–15% daily team profit share.',
                  },
                  {
                    id: 'faq_kyc',
                    q: isRtl ? 'توثيق الهوية (KYC)' : 'KYC Verification',
                    a: isRtl
                      ? 'ارفع صورة الهوية أو جواز السفر من إعدادات الحساب.'
                      : 'Upload ID or passport photo from Account Settings.',
                  },
                ].map((item) => {
                  const isExpanded = openFaqId === item.id;
                  return (
                    <div
                      key={item.id}
                      className="rounded-lg bg-neutral-900 border border-neutral-800 overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaqId(isExpanded ? null : item.id)}
                        className="w-full px-3 py-2.5 text-right rtl:text-right ltr:text-left flex items-center justify-between gap-2 font-bold text-white hover:bg-neutral-800/60 transition-colors cursor-pointer"
                      >
                        <span>{item.q}</span>
                        <span className="text-emerald-400 text-[11px] shrink-0">
                          {isExpanded ? (isRtl ? 'إخفاء' : 'Hide') : isRtl ? 'عرض الجواب' : 'Answer'}
                        </span>
                      </button>
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-1.5 text-neutral-300 border-t border-neutral-800/80 leading-relaxed">
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Field 4: من نحن (التداول الذكي، الدعوات، والتراخيص الدولية) */}
          <div className="rounded-xl bg-neutral-950/80 border border-neutral-800 overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenSection(openSection === 'about' ? null : 'about')}
              className="w-full px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-neutral-900/70 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Info className="w-4 h-4" />
                </div>
                <div className="text-right rtl:text-right ltr:text-left">
                  <span className="font-bold text-white text-sm block">
                    {isRtl ? 'من نحن والتراخيص الدولية' : 'About Us & Global Licenses'}
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    {isRtl
                      ? 'نظام التداول الذكي وتراخيص (أستراليا • قبرص • أوروبا • أمريكا)'
                      : 'Smart Trading ecosystem & Licenses (Australia • Cyprus • Europe • USA)'}
                  </span>
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-neutral-400 transition-transform ${
                  openSection === 'about' ? 'rotate-180 text-emerald-400' : ''
                }`}
              />
            </button>

            {openSection === 'about' && (
              <div className="px-4 pb-4 pt-3 border-t border-neutral-800 space-y-3 leading-relaxed text-neutral-300">
                <p>
                  {isRtl
                    ? 'منصة GOLDRIX هي مؤسسة مالية رقمية متخصصة في التداول الفوري والتداول الذكي الآلي وإدارة المحافظ الاستثمارية بمعايير أمان مؤسسية.'
                    : 'GOLDRIX is an institutional digital asset trading and automated smart-yield platform.'}
                </p>
                <p>
                  {isRtl
                    ? '• نظام الربح من التداول الذكي والدعوات: خطط استثمارية متدرجة ($100 إلى $3,000) بتسوية أرباح يومية كل 24 ساعة، مع مكافأة دعوة فورية +$10 USDT عن كل $100 USDT وعمولات فريق من VIP 1 (3%) حتى VIP 7 (30%).'
                    : '• Smart Trading & Referrals: Tiered plans ($100 to $3,000) with 24h profit settlement, plus +$10 referral bonus per $100 and VIP 1–7 profit sharing.'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
                    <span className="font-bold text-white block">
                      {isRtl ? 'أستراليا (Australia)' : 'Australia'}
                    </span>
                    <span className="font-mono text-[11px] text-emerald-400 block" dir="ltr">
                      ASIC AFS #548921 • AUSTRAC DCE-100849201
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
                    <span className="font-bold text-white block">
                      {isRtl ? 'قبرص (Cyprus)' : 'Cyprus'}
                    </span>
                    <span className="font-mono text-[11px] text-emerald-400 block" dir="ltr">
                      CySEC CIF License No. 398/21
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
                    <span className="font-bold text-white block">
                      {isRtl ? 'أوروبا (European Union)' : 'European Union'}
                    </span>
                    <span className="font-mono text-[11px] text-emerald-400 block" dir="ltr">
                      EU MiCA / ESMA CASP #2025-88412
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
                    <span className="font-bold text-white block">
                      {isRtl ? 'أمريكا (United States)' : 'United States (USA)'}
                    </span>
                    <span className="font-mono text-[11px] text-emerald-400 block" dir="ltr">
                      U.S. FinCEN MSB Reg #31000249817504
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Field 5: تذكرة دعم */}
          <div className="rounded-xl bg-neutral-950/80 border border-neutral-800 overflow-hidden">
            <button
              type="button"
              onClick={() => onOpenSupport && onOpenSupport()}
              className="w-full px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-neutral-900/70 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Headphones className="w-4 h-4" />
                </div>
                <div className="text-right rtl:text-right ltr:text-left">
                  <span className="font-bold text-white text-sm block">
                    {isRtl ? 'تذكرة دعم فني' : 'Support Ticket'}
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    {isRtl ? 'فتح تذكرة جديدة أو متابعة الردود مع فريق الدعم' : 'Open a support ticket or view responses'}
                  </span>
                </div>
              </div>
              <span className="px-3 py-1 rounded-lg bg-emerald-500 text-neutral-950 font-bold text-xs">
                {isRtl ? 'فتح تذكرة' : 'Open'}
              </span>
            </button>
          </div>

          {/* Field 6: المساعد الذكي (موجود حصرياً في الملف الشخصي) */}
          <div className="rounded-xl bg-neutral-950/80 border border-emerald-500/25 overflow-hidden">
            <button
              type="button"
              onClick={() => setAiBotOpen(true)}
              className="w-full px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-neutral-900/70 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="text-right rtl:text-right ltr:text-left">
                  <span className="font-bold text-white text-sm block">
                    {isRtl ? 'المساعد الذكي (الذكاء الاصطناعي)' : 'Smart AI Assistant'}
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    {isRtl
                      ? 'اسأل المساعد الذكي أي استفسار حول الحساب أو الخطط'
                      : 'Ask our AI Assistant any question about your account or plans'}
                  </span>
                </div>
              </div>
              <span className="px-3 py-1 rounded-lg bg-emerald-500 text-neutral-950 font-bold text-xs">
                {isRtl ? 'محادثة' : 'Chat'}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Investment History (Clean Modular List of Active & Completed Plans) */}
      <section className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <div>
              <h2 className="text-sm font-bold text-white">
                {isRtl ? 'سجل الخطط' : 'Plans History'}
              </h2>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-[11px] font-bold">
            {(
              [
                { id: 'ALL', label: isRtl ? 'الكل' : 'All' },
                { id: 'ACTIVE', label: isRtl ? 'النشطة' : 'Active' },
                { id: 'COMPLETED', label: isRtl ? 'المكتملة' : 'Completed' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setHistoryFilter(tab.id)}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  historyFilter === tab.id
                    ? 'bg-emerald-500 text-neutral-950'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Clean List Header */}
        <div className="hidden sm:grid sm:grid-cols-12 gap-3 pb-2 text-[11px] font-semibold text-neutral-400 border-b border-neutral-800/80">
          <div className="col-span-4">{isRtl ? 'الخطة والحالة' : 'Plan & Status'}</div>
          <div className="col-span-3">{isRtl ? 'تاريخ الاستحقاق' : 'Maturity Date'}</div>
          <div className="col-span-2 text-end">{isRtl ? 'رأس المال' : 'Principal'}</div>
          <div className="col-span-3 text-end">{isRtl ? 'إجمالي الأرباح' : 'Total Earnings'}</div>
        </div>

        {(() => {
          const filtered = investments.filter((inv) => {
            if (historyFilter === 'ACTIVE') return inv.status === 'ACTIVE';
            if (historyFilter === 'COMPLETED') return inv.status === 'COMPLETED';
            return true;
          });

          if (filtered.length === 0) {
            return (
              <div className="py-6 text-center space-y-2 text-xs">
                <p className="text-neutral-400">
                  {isRtl
                    ? 'لا توجد خطط استثمارية في هذا القسم حالياً.'
                    : 'No investment plans found in this filter.'}
                </p>
                <button
                  type="button"
                  onClick={() => setCurrentTab('trading')}
                  className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-emerald-400 font-bold text-xs cursor-pointer"
                >
                  {isRtl ? 'استعراض خطط التداول الذكي' : 'Explore Smart Trading Plans'}
                </button>
              </div>
            );
          }

          return (
            <div className="divide-y divide-neutral-800">
              {filtered.map((inv) => {
                const isActive = inv.status === 'ACTIVE';
                const principal = Number(inv.initialAmount || 0);
                const apr = getPlanDailyRatePercent(inv.planId, principal, inv.aprAtActivation);
                const dailyProfit = (principal * apr) / 100;
                const fullCycleProfit = dailyProfit * Math.max(1, inv.durationDays || 7);
                const earnedProfit = isActive
                  ? Number(inv.realizedPnl || 0) > 0
                    ? Number(inv.realizedPnl)
                    : dailyProfit
                  : Number(inv.realizedPnl || fullCycleProfit);
                const maturityDateStr = new Date(inv.scheduledEndTime).toLocaleDateString(
                  'en-US',
                  { year: 'numeric', month: 'short', day: 'numeric' }
                );
                const startDateStr = new Date(inv.startTime).toLocaleDateString(
                  'en-US',
                  { month: 'short', day: 'numeric' }
                );

                const sectorMeta = getPlanSectorMeta(inv.planId, principal, inv.planName);

                return (
                  <div
                    key={inv.id}
                    className="py-3 grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:gap-3 items-center text-xs"
                  >
                    {/* Plan Name, Thumbnail & Status Badge */}
                    <div className="sm:col-span-4 flex items-center justify-between sm:justify-start gap-2.5">
                      <PlanThumbnailIcon
                        planId={inv.planId}
                        amount={principal}
                        planName={inv.planName}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-white truncate">
                            {isRtl ? sectorMeta.nameAr : sectorMeta.nameEn}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                              isActive
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                            }`}
                          >
                            {isActive ? (
                              <>
                                <Clock className="w-2.5 h-2.5" />
                                <span>{isRtl ? 'نشطة' : 'Active'}</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                                <span>{isRtl ? 'مكتملة' : 'Completed'}</span>
                              </>
                            )}
                          </span>
                        </div>
                        <span className="text-[11px] text-neutral-400 block mt-0.5">
                          {inv.durationDays} {isRtl ? 'أيام' : 'Days'} ({isRtl ? 'بدأت' : 'Started'} {startDateStr})
                        </span>
                      </div>
                    </div>

                    {/* Maturity Date */}
                    <div className="sm:col-span-3 flex sm:block justify-between text-[11px]">
                      <span className="sm:hidden text-neutral-400">
                        {isRtl ? 'تاريخ الاستحقاق:' : 'Maturity Date:'}
                      </span>
                      <span className="font-mono text-neutral-200 font-semibold">
                        {maturityDateStr}
                      </span>
                    </div>

                    {/* Principal */}
                    <div className="sm:col-span-2 flex sm:block justify-between sm:text-end font-mono" dir="ltr">
                      <span className="sm:hidden font-sans text-[11px] text-neutral-400">
                        {isRtl ? 'رأس المال:' : 'Principal:'}
                      </span>
                      <span className="text-white font-bold">
                        ${principal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* Total Earnings */}
                    <div className="sm:col-span-3 flex sm:flex-col justify-between sm:items-end font-mono" dir="ltr">
                      <span className="sm:hidden font-sans text-[11px] text-neutral-400">
                        {isRtl ? 'إجمالي الأرباح:' : 'Total Earnings:'}
                      </span>
                      <div className="text-end space-y-1">
                        <span className="text-emerald-400 font-bold block">
                          +${fullCycleProfit.toFixed(0)}.00 USDT (+{apr}%)
                        </span>
                        {isActive && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-black text-emerald-300">
                            <span>{isRtl ? 'الربح المتراكم:' : 'Accrued:'}</span>
                            <span className="text-amber-300">+${earnedProfit.toFixed(2)} USDT</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </section>

      {/* 3. Password Security Section */}
      <section className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5">
        <form onSubmit={handleChangePassword} className="space-y-3.5 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">
                {isRtl ? 'تغيير كلمة المرور (باللغة الإنجليزية)' : 'Change Password (English Only)'}
              </span>
              <button
                type="button"
                onClick={() => setShowPasswords((prev) => !prev)}
                className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
              >
                {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPasswords ? (isRtl ? 'إخفاء' : 'Hide') : isRtl ? 'رؤية كلمة المرور' : 'Show'}</span>
              </button>
            </div>
            <button
              type="submit"
              disabled={isSavingSecurity}
              className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold cursor-pointer disabled:opacity-50"
            >
              {isSavingSecurity ? '...' : isRtl ? 'حفظ كلمة المرور' : 'Save Password'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <input
              type={showPasswords ? 'text' : 'password'}
              required
              dir="ltr"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder={isRtl ? 'كلمة المرور الحالية (English)' : 'Current Password'}
              className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl font-mono text-white text-left focus:outline-none focus:border-emerald-500"
            />
            <input
              type={showPasswords ? 'text' : 'password'}
              required
              dir="ltr"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={isRtl ? 'كلمة المرور الجديدة (8+ English)' : 'New Password (8+)'}
              className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl font-mono text-white text-left focus:outline-none focus:border-emerald-500"
            />
            <input
              type={showPasswords ? 'text' : 'password'}
              required
              dir="ltr"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={isRtl ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}
              className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl font-mono text-white text-left focus:outline-none focus:border-emerald-500"
            />
          </div>
        </form>
      </section>

      {/* 4. Bottom Log Out Button (أسفل تسجيل الخروج) */}
      <section className="pt-1">
        <button
          type="button"
          onClick={logout}
          className="w-full py-3.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>{isRtl ? 'تسجيل الخروج من الحساب' : 'Log Out'}</span>
        </button>
      </section>

      {/* Edit Name Modal */}
      {editNameOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl relative">
            <button type="button" onClick={() => setEditNameOpen(false)} className="absolute top-4 right-4 text-neutral-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-sm font-bold text-white">{isRtl ? 'تعديل الاسم (بالأحرف الإنجليزية)' : 'Edit Name'}</h3>
            <form onSubmit={handleSaveName} className="space-y-3 text-xs">
              <input
                type="text"
                required
                dir="ltr"
                value={editNameValue}
                onChange={(e) => setEditNameValue(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl font-mono text-white focus:outline-none"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditNameOpen(false)} className="flex-1 py-2.5 rounded-xl bg-neutral-800 text-neutral-300 font-bold cursor-pointer">
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-neutral-950 font-bold cursor-pointer">
                  {isRtl ? 'حفظ' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Email Modal */}
      {editEmailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl relative">
            <button type="button" onClick={() => setEditEmailOpen(false)} className="absolute top-4 right-4 text-neutral-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-sm font-bold text-white">{isRtl ? 'تعديل البريد الإلكتروني' : 'Update Email'}</h3>
            {emailModalError && <p className="text-xs text-rose-400">{emailModalError}</p>}
            <form onSubmit={handleVerifyAndSaveEmail} className="space-y-3 text-xs">
              <input
                type="email"
                required
                dir="ltr"
                value={editEmailValue}
                onChange={(e) => setEditEmailValue(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl font-mono text-white focus:outline-none"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditEmailOpen(false)} className="flex-1 py-2.5 rounded-xl bg-neutral-800 text-neutral-300 font-bold cursor-pointer">
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" disabled={isVerifyingEmail} className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-neutral-950 font-bold cursor-pointer">
                  {isVerifyingEmail ? '...' : isRtl ? 'حفظ' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Phone Modal */}
      {editPhoneOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl relative">
            <button type="button" onClick={() => setEditPhoneOpen(false)} className="absolute top-4 right-4 text-neutral-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-sm font-bold text-white">{isRtl ? 'تعديل رقم الهاتف' : 'Update Phone'}</h3>
            {phoneModalError && <p className="text-xs text-rose-400">{phoneModalError}</p>}
            <form onSubmit={handleVerifyAndSavePhone} className="space-y-3 text-xs">
              <div className="flex items-center gap-1.5" dir="ltr">
                <CountrySelector
                  mode="dialCode"
                  value={selectedCountry}
                  isRtl={isRtl}
                  onChange={(c) => setSelectedCountry(c)}
                />
                <input
                  type="tel"
                  required
                  value={phoneDigits}
                  onChange={(e) => setPhoneDigits(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl font-mono text-white focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditPhoneOpen(false)} className="flex-1 py-2.5 rounded-xl bg-neutral-800 text-neutral-300 font-bold cursor-pointer">
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" disabled={isVerifyingPhone} className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-neutral-950 font-bold cursor-pointer">
                  {isVerifyingPhone ? '...' : isRtl ? 'حفظ' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Assistant exclusively inside ProfilePage */}
      <FloatingAISupportBot
        externalOpen={aiBotOpen}
        onExternalOpenChange={setAiBotOpen}
        onOpenSupportTickets={onOpenSupport}
      />
    </div>
  );
};
