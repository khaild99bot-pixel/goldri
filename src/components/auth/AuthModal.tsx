/**
 * GOLDRIX Smooth, Compact & Intuitive Authentication Modal
 * - Sleek, lightweight layout without bulky boxes or heavy templates
 * - Sign In, Create Account, and Effortless Password Reset in one smooth flow
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { api } from '../../services/api.ts';
import { GoldrixLogo } from '../common/GoldrixLogo.tsx';
import {
  CountryItem,
  detectUserCountrySync,
  getCountryByIso,
} from '../../data/countries.ts';
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  AlertCircle,
  Award,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'LOGIN' | 'REGISTER';
}

type AuthMode = 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD';

function normalizeGmailInput(raw: string): string {
  const clean = raw.trim().toLowerCase();
  if (!clean) return '';
  if (!clean.includes('@')) {
    return `${clean}@gmail.com`;
  }
  return clean;
}

function isValidGmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email.trim());
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'LOGIN',
}) => {
  const { login, register } = useAuth();
  const { isRtl } = useLanguage();

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [step, setStep] = useState<'FORM' | 'OTP_POPUP'>('FORM');
  const [selectedCountry, setSelectedCountry] = useState<CountryItem>(() =>
    detectUserCountrySync()
  );

  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetOtpCode, setResetOtpCode] = useState('');
  const [resetCodeSent, setResetCodeSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [referredBy, setReferredBy] = useState('');

  // OTP State
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const resetOtpInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setMode(initialMode);
    setStep('FORM');
    setErrorMessage(null);
    setSuccessMessage(null);
    setShowPassword(false);
    setResetOtpCode('');
    setResetCodeSent(false);
    setOtpDigits(['', '', '', '', '', '']);

    if (typeof window !== 'undefined') {
      const refParam = new URLSearchParams(window.location.search).get('ref');
      if (refParam) {
        setReferredBy(refParam.trim().toUpperCase());
      }
    }

    const localDetected = detectUserCountrySync();
    setSelectedCountry(localDetected);

    api
      .detectCountry()
      .then((res) => {
        if (res.countryCode) {
          const matched = getCountryByIso(res.countryCode);
          if (matched) {
            setSelectedCountry(matched);
          }
        }
      })
      .catch(() => {});
  }, [isOpen, initialMode]);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  useEffect(() => {
    if (step === 'OTP_POPUP') {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 60);
    }
  }, [step]);

  if (!isOpen) return null;

  const resolvedEmail = normalizeGmailInput(email);
  const otpCode = otpDigits.join('');

  const switchMode = (targetMode: AuthMode) => {
    setMode(targetMode);
    setStep('FORM');
    setErrorMessage(null);
    setSuccessMessage(null);
    setOtpDigits(['', '', '', '', '', '']);
    setResetOtpCode('');
    setResetCodeSent(false);
    if (targetMode === 'FORGOT_PASSWORD') {
      setPassword('');
    }
  };

  // Send 6-digit password reset code via Brevo
  const handleSendPasswordResetCode = async (isResendAttempt = false) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!resolvedEmail) {
      setErrorMessage(isRtl ? 'أدخل بريدك الإلكتروني أولاً لإرسال الرمز' : 'Enter your email first');
      return;
    }

    if (!isValidGmail(resolvedEmail)) {
      setErrorMessage(
        isRtl ? 'يرجى إدخال بريد إلكتروني صحيح' : 'Please enter a valid email address'
      );
      return;
    }

    if (cooldownSeconds > 0 && isResendAttempt) return;

    setEmail(resolvedEmail);
    setIsSendingOtp(true);
    try {
      const res = await api.sendPasswordResetCode(resolvedEmail, isResendAttempt);
      setCooldownSeconds(res.cooldownSeconds || 60);
      setResetCodeSent(true);
      setSuccessMessage(
        isRtl ? 'تم إرسال الرمز إلى بريدك الإلكتروني' : 'Verification code sent to your email'
      );
      setTimeout(() => {
        resetOtpInputRef.current?.focus();
      }, 60);
    } catch (err: any) {
      setErrorMessage(
        err.message ||
          (isRtl ? 'تعذر إرسال الرمز إلى البريد الإلكتروني' : 'Failed to send verification code')
      );
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!resolvedEmail) {
      setErrorMessage(isRtl ? 'يرجى إدخال البريد الإلكتروني' : 'Please enter your email');
      return;
    }

    if (!isValidGmail(resolvedEmail)) {
      setErrorMessage(
        isRtl ? 'يرجى إدخال بريد إلكتروني صحيح' : 'Please enter a valid email address'
      );
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage(
        isRtl
          ? 'كلمة المرور يجب أن لا تقل عن 6 أحرف أو أرقام'
          : 'Password must be at least 6 characters'
      );
      return;
    }

    if (mode === 'LOGIN') {
      setIsSubmitting(true);
      try {
        await login(resolvedEmail, password);
        onClose();
      } catch (err: any) {
        setErrorMessage(
          err.message || (isRtl ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : 'Sign in failed')
        );
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (mode === 'FORGOT_PASSWORD') {
      const cleanResetCode = resetOtpCode.replace(/\D/g, '').trim();
      if (!cleanResetCode) {
        await handleSendPasswordResetCode(false);
        return;
      }

      if (cleanResetCode.length !== 6) {
        setErrorMessage(
          isRtl ? 'أدخل رمز التحقق المكون من 6 أرقام' : 'Enter the 6-digit verification code'
        );
        resetOtpInputRef.current?.focus();
        return;
      }

      setIsSubmitting(true);
      try {
        await api.resetPasswordWithOtp({
          email: resolvedEmail,
          code: cleanResetCode,
          newPassword: password,
        });
        await login(resolvedEmail, password);
        onClose();
      } catch (err: any) {
        setErrorMessage(
          err.message || (isRtl ? 'رمز التحقق غير صحيح أو منتهي الصلاحية' : 'Invalid verification code')
        );
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // REGISTER Mode
    if (!fullName.trim()) {
      setErrorMessage(isRtl ? 'يرجى كتابة الاسم' : 'Please enter your name');
      return;
    }

    setEmail(resolvedEmail);
    setIsSendingOtp(true);
    try {
      const res = await api.sendEmailVerificationCode(resolvedEmail, false);
      setCooldownSeconds(res.cooldownSeconds || 60);
      setOtpDigits(['', '', '', '', '', '']);
      setStep('OTP_POPUP');
    } catch (err: any) {
      setErrorMessage(
        err.message ||
          (isRtl ? 'تعذر إرسال رمز التحقق إلى البريد الإلكتروني' : 'Failed to send verification code')
      );
    } finally {
      setIsSendingOtp(false);
    }
  };

  const completeRegistrationWithCode = async (codeToVerify: string) => {
    if (codeToVerify.length !== 6 || isSubmitting) return;
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await register({
        email: resolvedEmail,
        password,
        fullName: fullName.trim(),
        country: selectedCountry.nameEn,
        countryCode: selectedCountry.iso,
        dialCode: selectedCountry.dialCode,
        isEmailVerified: true,
        referredBy: referredBy.trim() || undefined,
        otpCode: codeToVerify,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(
        err.message || (isRtl ? 'رمز التأكيد غير صحيح، حاول مرة أخرى' : 'Invalid verification code')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpDigitChange = (index: number, rawValue: string) => {
    setErrorMessage(null);
    const digitsOnly = rawValue.replace(/\D/g, '');

    if (digitsOnly.length > 1) {
      const pasted = digitsOnly.slice(0, 6).split('');
      const next = [...otpDigits];
      for (let i = 0; i < 6; i++) {
        next[i] = pasted[i] || '';
      }
      setOtpDigits(next);
      const focusIdx = Math.min(5, pasted.length - 1);
      otpInputRefs.current[focusIdx]?.focus();
      if (pasted.length === 6) {
        completeRegistrationWithCode(pasted.join(''));
      }
      return;
    }

    const digit = digitsOnly.slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);

    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    const combined = next.join('');
    if (combined.length === 6 && !next.includes('')) {
      completeRegistrationWithCode(combined);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleResendOtp = async () => {
    if (cooldownSeconds > 0 || isSendingOtp) return;
    setErrorMessage(null);
    setIsSendingOtp(true);
    try {
      const res = await api.sendEmailVerificationCode(resolvedEmail, true);
      setCooldownSeconds(res.cooldownSeconds || 60);
      setOtpDigits(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
    } catch (err: any) {
      setErrorMessage(err.message || (isRtl ? 'تعذر إعادة إرسال الرمز' : 'Failed to resend code'));
    } finally {
      setIsSendingOtp(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 animate-fadeIn">
      <div className="bg-neutral-900 border border-neutral-800/90 rounded-2xl max-w-sm w-full p-4 sm:p-5 shadow-2xl relative animate-modalIn">
        {/* Compact Top Header */}
        <div className="flex items-center justify-between mb-3.5">
          <GoldrixLogo size="sm" showSubtitle={false} />
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* =========================================================
            STEP 2: COMPACT OTP VERIFICATION (للتسجيل الجديد)
           ========================================================= */}
        {step === 'OTP_POPUP' ? (
          <div className="space-y-3.5 text-center animate-fadeIn">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white">
                {isRtl ? 'تأكيد البريد الإلكتروني' : 'Verify Your Email'}
              </h2>
              <p className="text-[11px] text-neutral-400">
                {isRtl ? 'أدخل الرمز المرسل إلى' : 'Enter the 6-digit code sent to'}{' '}
                <span className="font-mono text-emerald-400 font-semibold" dir="ltr">
                  {resolvedEmail}
                </span>
              </p>
            </div>

            {errorMessage && (
              <div className="px-3 py-2 bg-rose-500/10 border border-rose-500/25 rounded-xl text-[11px] text-rose-400 flex items-center justify-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Sleek 6-Digit Inputs */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 py-1" dir="ltr">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    otpInputRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  disabled={isSubmitting}
                  onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  className={`w-9 h-11 sm:w-10 sm:h-11 rounded-xl bg-neutral-950 border text-center font-mono text-base font-bold text-white focus:outline-none transition-all ${
                    digit
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-neutral-800 focus:border-emerald-400'
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => completeRegistrationWithCode(otpCode)}
              disabled={isSubmitting || otpCode.length !== 6}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs sm:text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting
                ? isRtl
                  ? 'جاري التأكيد...'
                  : 'Verifying...'
                : isRtl
                ? 'تأكيد ودخول'
                : 'Confirm & Sign In'}
            </button>

            <div className="flex items-center justify-between pt-2 border-t border-neutral-800/60 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setStep('FORM');
                  setErrorMessage(null);
                }}
                className="text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                {isRtl ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                <span>{isRtl ? 'رجوع' : 'Back'}</span>
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={cooldownSeconds > 0 || isSendingOtp}
                className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 disabled:opacity-40 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isSendingOtp ? 'animate-spin' : ''}`} />
                <span>
                  {cooldownSeconds > 0
                    ? isRtl
                      ? `إعادة الإرسال (${cooldownSeconds}ث)`
                      : `Resend (${cooldownSeconds}s)`
                    : isRtl
                    ? 'إعادة إرسال الرمز'
                    : 'Resend Code'}
                </span>
              </button>
            </div>
          </div>
        ) : (
          /* =========================================================
             STEP 1: SMOOTH MAIN FORM (LOGIN / REGISTER / FORGOT_PASSWORD)
             ========================================================= */
          <div className="space-y-3">
            {mode !== 'FORGOT_PASSWORD' ? (
              /* Clean Mode Switcher */
              <div className="grid grid-cols-2 gap-1 p-1 bg-neutral-950 border border-neutral-800/80 rounded-xl">
                <button
                  type="button"
                  onClick={() => switchMode('LOGIN')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    mode === 'LOGIN'
                      ? 'bg-emerald-500 text-neutral-950'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {isRtl ? 'تسجيل الدخول' : 'Sign In'}
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('REGISTER')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    mode === 'REGISTER'
                      ? 'bg-emerald-500 text-neutral-950'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {isRtl ? 'حساب جديد' : 'Create Account'}
                </button>
              </div>
            ) : (
              /* Simple Inline Title for Forgot Password */
              <div className="flex items-center justify-between pb-1 border-b border-neutral-800/70">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isRtl ? 'استعادة كلمة المرور' : 'Reset Password'}
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    {isRtl
                      ? 'أرسل الرمز لبريدك ثم اختر كلمة مرور جديدة'
                      : 'Send code to your email and set a new password'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => switchMode('LOGIN')}
                  className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <span>{isRtl ? 'رجوع' : 'Back'}</span>
                  {isRtl ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}

            {errorMessage && (
              <div className="px-3 py-2 bg-rose-500/10 border border-rose-500/25 rounded-xl text-[11px] text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-[11px] text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-2.5">
              {/* Name Field (Register Only) */}
              {mode === 'REGISTER' && (
                <div>
                  <label className="text-[11px] text-neutral-400 font-medium block mb-1">
                    {isRtl ? 'الاسم الكامل' : 'Full Name'}
                  </label>
                  <div className="relative">
                    <UserIcon className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      placeholder={isRtl ? 'الاسم' : 'Your name'}
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      className="w-full pl-9 pr-3 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl text-xs sm:text-sm text-white focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Email Field */}
              <div>
                <label className="text-[11px] text-neutral-400 font-medium block mb-1">
                  {isRtl ? 'البريد الإلكتروني' : 'Email Address'}
                </label>
                <div className="relative" dir="ltr">
                  <Mail className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    dir="ltr"
                    autoComplete="email"
                    placeholder="example@gmail.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    className="w-full pl-9 pr-3 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl text-xs sm:text-sm text-white text-left font-mono focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Forgot Password: Sleek Inline Code Input + Send Button */}
              {mode === 'FORGOT_PASSWORD' && (
                <div>
                  <label className="text-[11px] text-neutral-400 font-medium block mb-1">
                    {isRtl ? 'رمز التحقق (6 أرقام)' : 'Verification Code (6 digits)'}
                  </label>
                  <div className="flex items-center gap-1.5" dir="ltr">
                    <input
                      ref={resetOtpInputRef}
                      type="text"
                      inputMode="numeric"
                      dir="ltr"
                      maxLength={6}
                      placeholder="123456"
                      value={resetOtpCode}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setResetOtpCode(digits);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      className="flex-1 py-2.5 px-3 bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl text-center font-mono text-sm font-bold tracking-[0.25em] text-emerald-400 placeholder:text-neutral-600 placeholder:tracking-normal focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => handleSendPasswordResetCode(resetCodeSent)}
                      disabled={isSendingOtp || (resetCodeSent && cooldownSeconds > 0)}
                      className="px-3 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-bold text-[11px] shrink-0 flex items-center gap-1 transition-all disabled:opacity-40 cursor-pointer"
                    >
                      {isSendingOtp ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : null}
                      <span>
                        {isSendingOtp
                          ? isRtl
                            ? 'يرسل...'
                            : 'Sending...'
                          : resetCodeSent && cooldownSeconds > 0
                          ? isRtl
                            ? `إعادة (${cooldownSeconds}ث)`
                            : `${cooldownSeconds}s`
                          : resetCodeSent
                          ? isRtl
                            ? 'إعادة إرسال'
                            : 'Resend'
                          : isRtl
                          ? 'إرسال الرمز'
                          : 'Send Code'}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-neutral-400 font-medium">
                    {mode === 'FORGOT_PASSWORD'
                      ? isRtl
                        ? 'كلمة المرور الجديدة'
                        : 'New Password'
                      : isRtl
                      ? 'كلمة المرور'
                      : 'Password'}
                  </label>
                  {mode === 'LOGIN' && (
                    <button
                      type="button"
                      onClick={() => switchMode('FORGOT_PASSWORD')}
                      className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                    >
                      {isRtl ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                    </button>
                  )}
                </div>
                <div className="relative" dir="ltr">
                  <Lock className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    dir="ltr"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    className="w-full pl-9 pr-9 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl text-xs sm:text-sm text-white text-left font-mono focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-emerald-400 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Optional Invite Code (Register Only) */}
              {mode === 'REGISTER' && (
                <div>
                  <label className="text-[11px] text-neutral-400 font-medium block mb-1">
                    {isRtl ? 'كود الدعوة (اختياري)' : 'Invite Code (Optional)'}
                  </label>
                  <div className="relative" dir="ltr">
                    <Award className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      dir="ltr"
                      placeholder={isRtl ? 'اختياري' : 'Optional'}
                      value={referredBy}
                      onChange={(e) => setReferredBy(e.target.value.toUpperCase())}
                      className="w-full pl-9 pr-3 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl text-xs sm:text-sm text-white text-left font-mono uppercase focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || isSendingOtp}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs sm:text-sm transition-all shadow-md shadow-emerald-500/15 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer mt-1"
              >
                {isSubmitting
                  ? isRtl
                    ? 'جاري التنفيذ...'
                    : 'Please wait...'
                  : isSendingOtp
                  ? isRtl
                    ? 'جاري إرسال الرمز...'
                    : 'Sending code...'
                  : mode === 'LOGIN'
                  ? isRtl
                    ? 'تسجيل الدخول'
                    : 'Sign In'
                  : mode === 'FORGOT_PASSWORD'
                  ? isRtl
                    ? 'حفظ كلمة المرور والدخول'
                    : 'Save Password & Sign In'
                  : isRtl
                  ? 'متابعة'
                  : 'Continue'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
