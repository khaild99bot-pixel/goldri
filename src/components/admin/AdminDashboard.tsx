/**
 * GOLDRIX Private Administrative Control Console
 * Strictly restricted to Chief Admin (hha253ee@gmail.com / role === 'ADMIN').
 * Accessible via separate private URL (/?admin=1) or Admin tab.
 * Features:
 * - Admin-Configurable USDT & BTC Deposit Addresses for all members
 * - Direct Manual Balance Addition to any user (USDT & BTC only)
 * - Deposit & Withdrawal Approval / Rejection with Client ID (أيدي العميل), Order ID (رقم الطلب), and Timestamp
 * - Full KYC Verification Queue with Uploaded ID Photo Preview, Full Name, Country, and Date of Birth
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { formatClientId, formatDisplayEmail } from '../common/GoldrixLogo.tsx';
import {
  Users,
  ShieldCheck,
  ArrowDownLeft,
  ArrowUpRight,
  Layers,
  Settings,
  FileText,
  Search,
  XCircle,
  Plus,
  RefreshCw,
  Lock,
  Copy,
  Check,
  Eye,
  EyeOff,
  Wallet,
  Save,
  Server,
  KeyRound,
  LogOut,
  AlertTriangle,
} from 'lucide-react';
import { CloudAndResendCard } from '../profile/CloudAndResendCard.tsx';
import { ServerControlPanel } from './ServerControlPanel.tsx';

interface AdminDashboardProps {
  setCurrentTab: (tab: string) => void;
  initialModule?: 'overview' | 'server' | 'users' | 'kyc' | 'withdrawals' | 'deposits' | 'plans' | 'audit' | 'settings';
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ setCurrentTab, initialModule = 'overview' }) => {
  const { user, login, logout, refreshUserData, refreshBalances } = useAuth();
  const { isRtl } = useLanguage();
  const [activeModule, setActiveModule] = useState<'overview' | 'server' | 'users' | 'kyc' | 'withdrawals' | 'deposits' | 'plans' | 'audit' | 'settings'>(initialModule);

  // Secret Admin Login Gate states
  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [isLoggingInAdmin, setIsLoggingInAdmin] = useState(false);
  const [adminLoginError, setAdminLoginError] = useState<string | null>(null);
  const [adminAuthMode, setAdminAuthMode] = useState<'LOGIN' | 'RESET'>('LOGIN');
  const [resetOtpSent, setResetOtpSent] = useState(false);
  const [resetOtpCode, setResetOtpCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [isSendingResetOtp, setIsSendingResetOtp] = useState(false);
  const [isResettingAdminPass, setIsResettingAdminPass] = useState(false);
  const [adminResetMsg, setAdminResetMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialModule) {
      setActiveModule(initialModule);
    }
  }, [initialModule]);

  const [overview, setOverview] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [kycQueue, setKycQueue] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [systemSettings, setSystemSettings] = useState<any>(null);
  const [verificationCodes, setVerificationCodes] = useState<any[]>([]);

  // Editable multi-currency deposit addresses for members (USDT TRC20, USDT ERC20, USDT BEP20, BTC, ETH, BNB)
  const [usdtTrc20WalletInput, setUsdtTrc20WalletInput] = useState('TTJa4yiZMN8kM1zxmBsCdTaeMgwMQZd9rh');
  const [usdtErc20WalletInput, setUsdtErc20WalletInput] = useState('0xA9E75F3765d5DA836fc3F3772A4808d23a44461a');
  const [usdtBep20WalletInput, setUsdtBep20WalletInput] = useState('0xA9E75F3765d5DA836fc3F3772A4808d23a44461a');
  const [btcWalletInput, setBtcWalletInput] = useState('bc1qns6jnx02wz0kqve6j6yhnckpthr63rxy6d9me9');
  const [ethWalletInput, setEthWalletInput] = useState('0xA9E75F3765d5DA836fc3F3772A4808d23a44461a');
  const [bnbWalletInput, setBnbWalletInput] = useState('0xA9E75F3765d5DA836fc3F3772A4808d23a44461a');
  const [isSavingWallets, setIsSavingWallets] = useState(false);

  // Email & SMS Gateway Settings Inputs
  const [smtpHostInput, setSmtpHostInput] = useState('');
  const [smtpPortInput, setSmtpPortInput] = useState('587');
  const [smtpUserInput, setSmtpUserInput] = useState('');
  const [smtpPassInput, setSmtpPassInput] = useState('');
  const [smtpFromInput, setSmtpFromInput] = useState('');
  const [resendKeyInput, setResendKeyInput] = useState('');
  const [twilioSidInput, setTwilioSidInput] = useState('');
  const [twilioTokenInput, setTwilioTokenInput] = useState('');
  const [twilioPhoneInput, setTwilioPhoneInput] = useState('');
  const [isSavingGateways, setIsSavingGateways] = useState(false);

  const [searchUser, setSearchUser] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [copiedAdminUrl, setCopiedAdminUrl] = useState(false);

  // Rejection modal
  const [rejectingWithdrawalId, setRejectingWithdrawalId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // KYC review modal
  const [reviewingKycItem, setReviewingKycItem] = useState<any | null>(null);
  const [kycDecisionNotes, setKycDecisionNotes] = useState('');

  // Create plan modal
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [newPlanData, setNewPlanData] = useState({
    name: '',
    description: '',
    asset: 'USDT',
    riskLevel: 'MODERATE',
    durationDays: 30,
    estimatedAprMin: 12.0,
    estimatedAprMax: 18.0,
    minAmount: '100.00000000',
    maxAmount: '50000.00000000',
    isFixedAmount: false,
    fixedAmount: '0.00000000',
  });

  // Manual balance control modal (Supports CREDIT, DEBIT, RESET with 2-step anti-error confirmation)
  const [isManualCreditOpen, setIsManualCreditOpen] = useState(false);
  const [balanceAdjustMode, setBalanceAdjustMode] = useState<'CREDIT' | 'DEBIT' | 'RESET'>('CREDIT');
  const [confirmBalanceStep, setConfirmBalanceStep] = useState(false);
  const [creditUserId, setCreditUserId] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditAsset, setCreditAsset] = useState<string>('USDT');
  const [creditNetwork, setCreditNetwork] = useState('USDT (TRON TRC20)');
  const [creditTxHash, setCreditTxHash] = useState('');
  const [confirmingDeposit, setConfirmingDeposit] = useState<any | null>(null);
  const [copiedMemberUrl, setCopiedMemberUrl] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>(() => new Date().toLocaleTimeString('en-US'));
  const walletsInitializedRef = React.useRef<boolean>(false);

  const adminPrivateUrl = `${window.location.origin}/?vault_key=grd9942`;
  const memberPublicUrl = `${window.location.origin}/?ref=100001&register=1`;

  const loadAllAdminData = async (isBackgroundPoll = false) => {
    try {
      const bundle = await api.getAdminBundle();
      const ov = bundle.overview;
      const usr = bundle.users || [];
      const kyc = bundle.kycQueue || [];
      const wth = bundle.withdrawals || [];
      const dep = bundle.deposits || [];
      const pln = bundle.plans || [];
      const aud = bundle.auditLogs || [];
      const set = bundle.systemSettings;
      const otpList = bundle.verificationCodes || [];

      setOverview(ov);
      setUsersList(usr);
      setKycQueue(kyc);
      setWithdrawals(wth);
      setDeposits(dep);
      setPlans(pln);
      setAuditLogs(aud);
      setSystemSettings(set);
      setVerificationCodes(otpList);
      setLastSyncedTime(new Date().toLocaleTimeString('en-US'));

      if (set && (!isBackgroundPoll || !walletsInitializedRef.current)) {
        walletsInitializedRef.current = true;
        const defaultTrc20 = 'TTJa4yiZMN8kM1zxmBsCdTaeMgwMQZd9rh';
        const defaultEvm = '0xA9E75F3765d5DA836fc3F3772A4808d23a44461a';
        const defaultBtc = 'bc1qns6jnx02wz0kqve6j6yhnckpthr63rxy6d9me9';
        setUsdtTrc20WalletInput(
          set.usdtDepositAddress &&
            set.usdtDepositAddress !== defaultEvm &&
            set.usdtDepositAddress !== 'TYx7jQ9W28xL9zR3sZgY6Q1mVp7v2K8bL9' &&
            set.usdtDepositAddress !== 'TGoldrixVault99xTRC20InstitutionalAddress88A'
            ? set.usdtDepositAddress
            : defaultTrc20
        );
        setUsdtErc20WalletInput(set.usdtErc20DepositAddress || defaultEvm);
        setUsdtBep20WalletInput(set.usdtBep20DepositAddress || defaultEvm);
        setBtcWalletInput(
          set.btcDepositAddress &&
            set.btcDepositAddress !== 'bc1q8x9l24yq8k9m03z7v65h2s3f8t4r7j2x5l4k7w' &&
            set.btcDepositAddress !== 'bc1qgoldrixvault99xinstitutionalbtcaddress88a'
            ? set.btcDepositAddress
            : defaultBtc
        );
        setEthWalletInput(set.ethDepositAddress || defaultEvm);
        setBnbWalletInput(set.bnbDepositAddress || defaultEvm);
        setSmtpHostInput(set.smtpHost || '');
        setSmtpPortInput(String(set.smtpPort || 587));
        setSmtpUserInput(set.smtpUser || '');
        setSmtpPassInput(set.smtpPass || '');
        setSmtpFromInput(set.smtpFrom || '');
        setResendKeyInput(set.resendApiKey || '');
        setTwilioSidInput(set.twilioAccountSid || '');
        setTwilioTokenInput(set.twilioAuthToken || '');
        setTwilioPhoneInput(set.twilioPhoneNumber || '');
      }
    } catch (err) {
      console.warn('[Admin] Falling back to individual admin endpoints:', err);
      try {
        const [ovRes, usrRes, kycRes, wthRes, depRes, setRes] = await Promise.allSettled([
          api.getAdminOverview(),
          api.getAdminUsers(),
          api.getAdminKYCQueue(),
          api.getAdminWithdrawals(),
          api.getAdminDeposits(),
          api.getAdminSystemSettings(),
        ]);
        if (ovRes.status === 'fulfilled' && ovRes.value) setOverview(ovRes.value);
        if (usrRes.status === 'fulfilled' && Array.isArray(usrRes.value)) setUsersList(usrRes.value);
        if (kycRes.status === 'fulfilled' && Array.isArray(kycRes.value)) setKycQueue(kycRes.value);
        if (wthRes.status === 'fulfilled' && Array.isArray(wthRes.value)) setWithdrawals(wthRes.value);
        if (depRes.status === 'fulfilled' && Array.isArray(depRes.value)) setDeposits(depRes.value);
        if (setRes.status === 'fulfilled' && setRes.value) setSystemSettings(setRes.value);
        setLastSyncedTime(new Date().toLocaleTimeString('en-US'));
      } catch {}
    }
  };

  const isUserAdmin = Boolean(
    user &&
      user.role === 'ADMIN' &&
      user.email?.toLowerCase() === 'hha253ee@gmail.com'
  );

  useEffect(() => {
    if (!isUserAdmin) return;
    loadAllAdminData(false);
    const interval = setInterval(() => {
      loadAllAdminData(true);
    }, 3000);
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        loadAllAdminData(true);
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [isUserAdmin]);

  const handleSaveGatewaySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGateways(true);
    setFeedback(null);
    try {
      const updated = {
        ...systemSettings,
        smtpHost: smtpHostInput.trim(),
        smtpPort: Number(smtpPortInput) || 587,
        smtpUser: smtpUserInput.trim(),
        smtpPass: smtpPassInput.trim(),
        smtpFrom: smtpFromInput.trim(),
        resendApiKey: resendKeyInput.trim(),
        twilioAccountSid: twilioSidInput.trim(),
        twilioAuthToken: twilioTokenInput.trim(),
        twilioPhoneNumber: twilioPhoneInput.trim(),
      };
      const res = await api.updateAdminSystemSettings(updated);
      setSystemSettings(res);
      setFeedback(
        isRtl
          ? 'تم حفظ إعدادات بوابات البريد الإلكتروني (SMTP / Resend) والرسائل النصية (Twilio SMS) بنجاح!'
          : 'Email (SMTP/Resend) & SMS (Twilio) gateway settings saved successfully!'
      );
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setIsSavingGateways(false);
    }
  };

  const handleSaveDepositAddresses = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usdtTrc20WalletInput.trim()) return;
    setIsSavingWallets(true);
    setFeedback(null);
    const defaultTrc20 = 'TTJa4yiZMN8kM1zxmBsCdTaeMgwMQZd9rh';
    const defaultEvm = '0xA9E75F3765d5DA836fc3F3772A4808d23a44461a';
    const defaultBtc = 'bc1qns6jnx02wz0kqve6j6yhnckpthr63rxy6d9me9';
    try {
      const updated = {
        ...systemSettings,
        usdtDepositAddress: usdtTrc20WalletInput.trim() || defaultTrc20,
        usdtErc20DepositAddress: usdtErc20WalletInput.trim() || defaultEvm,
        usdtBep20DepositAddress: usdtBep20WalletInput.trim() || defaultEvm,
        btcDepositAddress: btcWalletInput.trim() || defaultBtc,
        ethDepositAddress: ethWalletInput.trim() || defaultEvm,
        bnbDepositAddress: bnbWalletInput.trim() || defaultEvm,
      };
      const res = await api.updateAdminSystemSettings(updated);
      setSystemSettings(res);
      setFeedback(
        isRtl
          ? 'تم تحديث وحفظ عناوين محافظ الإيداع (USDT TRC20 / اثيريم USDT / USDT BNB / بتكوين / اثيريم / BNB) لجميع الأعضاء بنجاح!'
          : 'Successfully updated all member deposit wallet addresses (USDT TRC20, USDT ERC20, USDT BEP20, BTC, ETH, BNB)!'
      );
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setIsSavingWallets(false);
    }
  };

  const handleCopyAdminLink = () => {
    navigator.clipboard.writeText(adminPrivateUrl);
    setCopiedAdminUrl(true);
    setTimeout(() => setCopiedAdminUrl(false), 2000);
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await api.updateAdminUserStatus(userId, newStatus, 'Admin action');
      setFeedback(
        isRtl
          ? `تم تحديث حالة الحساب إلى ${newStatus === 'ACTIVE' ? 'نشط' : 'موقوف'}`
          : `User status changed to ${newStatus}`
      );
      await loadAllAdminData();
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    }
  };

  const handleApproveWithdrawal = async (id: string) => {
    setIsProcessing(true);
    setFeedback(null);
    try {
      await api.approveAdminWithdrawal(id);
      setFeedback(
        isRtl
          ? 'تمت الموافقة على طلب السحب واعتماد التحويل بنجاح.'
          : 'Withdrawal approved and settled.'
      );
      await loadAllAdminData();
      await refreshBalances();
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectWithdrawal = async () => {
    if (!rejectingWithdrawalId || !rejectionReason.trim()) return;
    setIsProcessing(true);
    try {
      await api.rejectAdminWithdrawal(rejectingWithdrawalId, rejectionReason);
      setFeedback(
        isRtl
          ? 'تم رفض طلب السحب وإعادة المبلغ المحجوز إلى رصيد المستخدم المتاح.'
          : 'Withdrawal declined. Reserved funds refunded to user available balance.'
      );
      setRejectingWithdrawalId(null);
      setRejectionReason('');
      await loadAllAdminData();
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReviewKYC = async (kycId: string, status: 'APPROVED' | 'REJECTED' | 'NEEDS_INFO', notes?: string) => {
    setIsProcessing(true);
    setFeedback(null);
    try {
      await api.reviewAdminKYC(kycId, status, notes ?? kycDecisionNotes);
      setFeedback(
        isRtl
          ? status === 'APPROVED'
            ? 'تمت الموافقة وتوثيق هوية المستخدم بنجاح.'
            : 'تم رفض طلب توثيق الهوية وإشعار المستخدم.'
          : `KYC marked as ${status}.`
      );
      setReviewingKycItem(null);
      setKycDecisionNotes('');
      await loadAllAdminData();
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveDeposit = async (id: string) => {
    setIsProcessing(true);
    setFeedback(null);
    try {
      await api.approveAdminDeposit(id);
      setConfirmingDeposit(null);
      setFeedback(
        isRtl
          ? 'تمت الموافقة المؤكدة على الإيداع وإضافة الرصيد الحقيقي إلى محفظة العضو بنجاح!'
          : 'Deposit approved! Funds credited to user balance.'
      );
      await loadAllAdminData();
      await refreshBalances();
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectDeposit = async (id: string) => {
    setIsProcessing(true);
    setFeedback(null);
    try {
      await api.rejectAdminDeposit(id, 'طلب إيداع غير مؤكد / مرفوض من الإدارة');
      setConfirmingDeposit(null);
      setFeedback(
        isRtl
          ? 'تم رفض وحذف طلب الإيداع غير المؤكد (لم يتم إضافة أي رصيد للعضو).'
          : 'Unverified deposit rejected and removed.'
      );
      await loadAllAdminData();
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualCreditDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditUserId) return;
    if (balanceAdjustMode !== 'RESET' && (!creditAmount || Number(creditAmount) <= 0)) return;

    // Require 2-step confirmation to prevent any accidental balance addition
    if (!confirmBalanceStep) {
      setConfirmBalanceStep(true);
      return;
    }

    setIsProcessing(true);
    setFeedback(null);
    try {
      if (balanceAdjustMode === 'CREDIT') {
        await api.creditAdminDeposit({
          userId: creditUserId,
          asset: creditAsset,
          network: creditNetwork,
          amount: creditAmount,
          txHash: creditTxHash || undefined,
        });
        setFeedback(
          isRtl
            ? `تم تأكيد وإضافة رصيد $${Number(creditAmount).toFixed(2)} ${creditAsset} إلى حساب العميل (ID: ${formatClientId(creditUserId)}) بنجاح!`
            : `Successfully credited ${creditAmount} ${creditAsset} to Client ID ${formatClientId(creditUserId)}.`
        );
      } else {
        const res = await api.adjustAdminUserBalance(creditUserId, {
          mode: balanceAdjustMode,
          amount: creditAmount || '0',
          reason:
            balanceAdjustMode === 'RESET'
              ? 'تصفير رصيد الحساب من قبل الإدارة'
              : 'خصم وتصحيح رصيد من قبل الإدارة',
        });
        setFeedback(
          isRtl
            ? balanceAdjustMode === 'RESET'
              ? `تم تصفير رصيد العضو (ID: ${formatClientId(creditUserId)}) بالكامل إلى $0.00 USDT بنجاح!`
              : `تم خصم $${Number(creditAmount).toFixed(2)} من العضو (ID: ${formatClientId(creditUserId)}). الرصيد الحالي: $${res.newBalanceUSDT} USDT`
            : `Balance updated. New balance: $${res.newBalanceUSDT} USDT`
        );
      }
      setIsManualCreditOpen(false);
      setConfirmBalanceStep(false);
      setCreditAmount('');
      setCreditTxHash('');
      await loadAllAdminData();
      await refreshBalances();
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      await api.createAdminPlan(newPlanData);
      setFeedback(
        isRtl
          ? `تم إنشاء الخطة الاستثمارية '${newPlanData.name}' بنجاح!`
          : `New strategy plan '${newPlanData.name}' created!`
      );
      setIsCreatingPlan(false);
      await loadAllAdminData();
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleSystemSetting = async (key: string) => {
    if (!systemSettings) return;
    const updated = { ...systemSettings, [key]: !systemSettings[key] };
    try {
      const res = await api.updateAdminSystemSettings(updated);
      setSystemSettings(res);
      setFeedback(isRtl ? 'تم تحديث إعدادات النظام.' : `Updated ${key} setting.`);
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    }
  };

  const handleAdminGateLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoginError(null);
    const cleanEmail = adminEmailInput.trim().toLowerCase();
    if (cleanEmail !== 'hha253ee@gmail.com') {
      setAdminLoginError(
        isRtl
          ? 'محاولة دخول مرفوضة: البريد الإلكتروني غير مصرح له بالدخول إلى لوحة الإدارة السرية.'
          : 'Access denied: Unauthorized administrator email.'
      );
      return;
    }
    if (!adminPasswordInput) {
      setAdminLoginError(isRtl ? 'يرجى إدخال كلمة المرور السرية للمدير' : 'Please enter administrator password');
      return;
    }
    setIsLoggingInAdmin(true);
    try {
      await login(cleanEmail, adminPasswordInput);
      setAdminPasswordInput('');
    } catch (err: any) {
      setAdminLoginError(
        err?.message || (isRtl ? 'بيانات الدخول أو كلمة المرور غير صحيحة' : 'Invalid credentials')
      );
    } finally {
      setIsLoggingInAdmin(false);
    }
  };

  const normalizeOtpInputDigits = (val: string) =>
    String(val || '')
      .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
      .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
      .replace(/\D/g, '')
      .slice(0, 6);

  const handleSendAdminResetOtp = async () => {
    setAdminLoginError(null);
    setAdminResetMsg(null);
    let cleanEmail = adminEmailInput.trim().toLowerCase();
    if (!cleanEmail) {
      cleanEmail = 'hha253ee@gmail.com';
      setAdminEmailInput(cleanEmail);
    } else if (!cleanEmail.includes('@')) {
      cleanEmail = `${cleanEmail}@gmail.com`;
      setAdminEmailInput(cleanEmail);
    }
    if (cleanEmail !== 'hha253ee@gmail.com') {
      setAdminLoginError(
        isRtl
          ? 'يرجى كتابة البريد الرسمي للمدير أولاً لإرسال رمز التحقق السري إليه.'
          : 'Please enter the official Chief Admin email first.'
      );
      return;
    }
    setIsSendingResetOtp(true);
    try {
      const res = await api.sendPasswordResetCode('hha253ee@gmail.com', resetOtpSent);
      setResetOtpSent(true);
      setAdminResetMsg(
        res.message ||
          (isRtl
            ? 'تم إرسال رمز تحقق سري مكون من 6 أرقام إلى البريد الرسمي للمدير.'
            : '6-digit verification code sent to the Chief Admin email.')
      );
    } catch (err: any) {
      setAdminLoginError(err?.message || (isRtl ? 'تعذر إرسال رمز التحقق' : 'Failed to send OTP'));
    } finally {
      setIsSendingResetOtp(false);
    }
  };

  const handleConfirmAdminPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoginError(null);
    setAdminResetMsg(null);
    const cleanOtp = normalizeOtpInputDigits(resetOtpCode);
    if (cleanOtp.length !== 6) {
      setAdminLoginError(isRtl ? 'يرجى إدخال رمز التحقق المكون من 6 أرقام' : 'Enter the 6-digit OTP code');
      return;
    }
    if (resetNewPassword.length < 6) {
      setAdminLoginError(
        isRtl
          ? 'يرجى اختيار كلمة مرور قوية لا تقل عن 6 أحرف أو أرقام'
          : 'Password must be at least 6 characters'
      );
      return;
    }
    setIsResettingAdminPass(true);
    try {
      const res = await api.resetPasswordWithOtp({
        email: 'hha253ee@gmail.com',
        code: cleanOtp,
        newPassword: resetNewPassword,
      });
      if (res.token) {
        api.setToken(res.token);
        await refreshUserData();
        await refreshBalances();
      }
      setResetOtpCode('');
      setResetNewPassword('');
      setAdminAuthMode('LOGIN');
    } catch (err: any) {
      setAdminLoginError(err?.message || (isRtl ? 'فشل التحقق من الرمز أو تحديث كلمة المرور' : 'Reset failed'));
    } finally {
      setIsResettingAdminPass(false);
    }
  };

  const [isRecoveringSessions, setIsRecoveringSessions] = useState(false);
  const [copiedSessionUserId, setCopiedSessionUserId] = useState<string | null>(null);

  const handleRecoverMemberSessions = async () => {
    setIsRecoveringSessions(true);
    try {
      const res = await api.adminRecoverMemberSessions();
      await loadAllAdminData(false);
      setFeedback({
        type: 'success',
        message:
          res.message ||
          (isRtl
            ? `تمت استعادة ومزامنة جميع الأعضاءوطلبات الإيداع والسحب بنجاح (${res.totalMembersCount} عضو).`
            : `Successfully recovered & synced member sessions (${res.totalMembersCount} members).`),
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || (isRtl ? 'تعذرت مزامنة الجلسات' : 'Failed to sync sessions'),
      });
    } finally {
      setIsRecoveringSessions(false);
    }
  };

  const handleCopyMemberSessionLink = async (targetUser: any) => {
    try {
      const res = await api.adminGenerateMemberSessionLink(targetUser.id);
      const restoreUrl = `${window.location.origin}/?restore_session=${encodeURIComponent(res.token)}`;
      await navigator.clipboard.writeText(restoreUrl);
      setCopiedSessionUserId(targetUser.id);
      setTimeout(() => setCopiedSessionUserId(null), 3000);
      setFeedback({
        type: 'success',
        message: isRtl
          ? `تم نسخ رابط استعادة الجلسة الفوري للعضو ${targetUser.fullName} (ID: ${formatClientId(targetUser.id)})`
          : `Copied direct session restore link for ${targetUser.fullName}`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || (isRtl ? 'فشل إنشاء رابط الجلسة' : 'Failed to generate session link'),
      });
    }
  };

  if (!isUserAdmin) {
    return (
      <div className="min-h-[82vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-neutral-900/95 border border-amber-500/35 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="text-center space-y-2.5">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/35 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
              <Lock className="w-7 h-7" />
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[11px] font-black">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isRtl ? 'بوابة مشفرة وسرية للغاية' : 'TOP SECRET ADMIN GATEWAY'}</span>
            </span>
            <h2 className="text-xl font-black text-white">
              {isRtl ? 'تسجيل دخول الإدارة العليا' : 'Chief Administrator Login'}
            </h2>
            <p className="text-xs text-neutral-400 leading-relaxed">
              {isRtl
                ? 'تم تفعيل الحماية القصوى وقفل الوصول العام. يُمنع الدخول إلى هذه البوابة إلا بعد إدخال البريد الرسمي وكلمة المرور السرية لمدير المنصة.'
                : 'Maximum security is active. Access requires authenticated Chief Administrator credentials.'}
            </p>
          </div>

          {adminLoginError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{adminLoginError}</span>
            </div>
          )}

          {adminResetMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{adminResetMsg}</span>
            </div>
          )}

          {adminAuthMode === 'LOGIN' ? (
            <form onSubmit={handleAdminGateLogin} className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-300 font-bold mb-1.5">
                  {isRtl ? 'البريد الإلكتروني الرسمي للمدير' : 'Administrator Email'}
                </label>
                <input
                  type="email"
                  dir="ltr"
                  required
                  autoComplete="username"
                  value={adminEmailInput}
                  onChange={(e) => setAdminEmailInput(e.target.value)}
                  placeholder="admin@..."
                  className="w-full px-4 py-3 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-bold mb-1.5">
                  {isRtl ? 'كلمة المرور السرية للمدير' : 'Administrator Password'}
                </label>
                <div className="relative">
                  <input
                    type={showAdminPassword ? 'text' : 'password'}
                    dir="ltr"
                    required
                    autoComplete="current-password"
                    value={adminPasswordInput}
                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-4 py-3 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono text-xs focus:outline-none focus:border-amber-400 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword((v) => !v)}
                    className="absolute inset-y-0 right-3 flex items-center text-neutral-400 hover:text-white cursor-pointer"
                  >
                    {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingInAdmin}
                className="w-full py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-black text-xs transition-all cursor-pointer shadow-lg shadow-amber-400/20 disabled:opacity-50"
              >
                {isLoggingInAdmin
                  ? isRtl
                    ? 'جاري التحقق من الهوية الإدارية...'
                    : 'Verifying Admin Credentials...'
                  : isRtl
                  ? 'تسجيل الدخول إلى لوحة الإدارة السرية'
                  : 'Sign In to Admin Console'}
              </button>

              <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setAdminAuthMode('RESET');
                    setAdminLoginError(null);
                    setAdminResetMsg(null);
                  }}
                  className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>
                    {isRtl
                      ? 'تعيين أو استعادة كلمة مرور المدير عبر رمز البريد (OTP)'
                      : 'Reset Admin Password via Email OTP'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentTab('home')}
                  className="text-[11px] font-bold text-neutral-400 hover:text-white cursor-pointer"
                >
                  {isRtl ? 'العودة للرئيسية' : 'Return Home'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleConfirmAdminPasswordReset} className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-300 font-bold mb-1.5">
                  {isRtl ? 'البريد الرسمي للمدير لاستلام رمز التحقق' : 'Official Admin Email'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    dir="ltr"
                    required
                    value={adminEmailInput}
                    onChange={(e) => setAdminEmailInput(e.target.value)}
                    placeholder="البريد الرسمي للمدير"
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    disabled={isSendingResetOtp}
                    onClick={handleSendAdminResetOtp}
                    className="px-3.5 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 text-amber-300 font-black text-[11px] shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {isSendingResetOtp
                      ? isRtl
                        ? 'جاري الإرسال...'
                        : 'Sending...'
                      : resetOtpSent
                      ? isRtl
                        ? 'إعادة إرسال الرمز'
                        : 'Resend OTP'
                      : isRtl
                      ? 'إرسال رمز (OTP)'
                      : 'Send OTP'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-neutral-300 font-bold mb-1.5">
                  {isRtl ? 'رمز التحقق المكون من 6 أرقام (المرسل للبريد)' : '6-Digit Email OTP Code'}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  maxLength={6}
                  required
                  value={resetOtpCode}
                  onChange={(e) => setResetOtpCode(normalizeOtpInputDigits(e.target.value))}
                  placeholder="000000"
                  className="w-full px-4 py-3 rounded-xl bg-neutral-950 border border-neutral-800 text-amber-400 font-mono text-center text-base tracking-[0.35em] font-black focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-bold mb-1.5">
                  {isRtl ? 'كلمة المرور السرية الجديدة للمدير' : 'New Administrator Password'}
                </label>
                <input
                  type={showAdminPassword ? 'text' : 'password'}
                  dir="ltr"
                  required
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <button
                type="submit"
                disabled={isResettingAdminPass}
                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs transition-all cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {isResettingAdminPass
                  ? isRtl
                    ? 'جاري اعتماد كلمة المرور والدخول...'
                    : 'Updating & Signing In...'
                  : isRtl
                  ? 'اعتماد كلمة المرور الجديدة وفتح لوحة الإدارة'
                  : 'Confirm New Password & Open Console'}
              </button>

              <div className="pt-2 border-t border-neutral-800/80 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAdminAuthMode('LOGIN');
                    setAdminLoginError(null);
                  }}
                  className="text-[11px] font-bold text-neutral-400 hover:text-white cursor-pointer"
                >
                  {isRtl ? 'العودة إلى تسجيل الدخول بكلمة المرور' : 'Back to Password Login'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  const getUserDetails = (userId: string) => {
    return usersList.find((u) => u.id === userId || formatClientId(u.id) === formatClientId(userId));
  };

  const formatDocTypeLabel = (docType?: string) => {
    switch (docType) {
      case 'NATIONAL_ID':
        return isRtl ? 'الهوية الوطنية / البطاقة الشخصية' : 'National ID';
      case 'RESIDENCE_PERMIT':
        return isRtl ? 'وثيقة إقامة / تصريح إقامة' : 'Residence Permit';
      case 'PASSPORT':
        return isRtl ? 'جواز السفر' : 'Passport';
      case 'DRIVERS_LICENSE':
        return isRtl ? 'رخصة القيادة' : "Driver's License";
      default:
        return docType || (isRtl ? 'وثيقة رسمية' : 'Identity Document');
    }
  };

  const filteredUsers = usersList.filter((u) => {
    const q = searchUser.toLowerCase().trim();
    if (!q) return true;
    const cid = formatClientId(u.id).toLowerCase();
    const dispEmail = formatDisplayEmail(u.email).toLowerCase();
    return (
      u.fullName.toLowerCase().includes(q) ||
      dispEmail.includes(q) ||
      (u.phone && u.phone.toLowerCase().includes(q)) ||
      u.id.toLowerCase().includes(q) ||
      cid.includes(q)
    );
  });

  const pendingDepositsCount = deposits.filter((d) => d.status === 'PENDING_REVIEW').length;
  const pendingWithdrawalsCount = withdrawals.filter((w) => w.status === 'PENDING_REVIEW').length;
  const pendingKycCount = kycQueue.filter((k) => k.status === 'PENDING').length;

  const renderDepositAddressEditor = () => (
    <form
      onSubmit={handleSaveDepositAddresses}
      className="p-5 bg-neutral-900 rounded-2xl border border-amber-500/30 space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-black text-amber-400 flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            <span>
              {isRtl
                ? 'تغيير عناوين محافظ الإيداع لجميع الأعضاء (اثيريم USDT • USDT BNB • بتكوين • اثيريم • BNB)'
                : 'Configure Member Deposit Wallet Addresses (USDT ERC20, USDT BEP20, BTC, ETH, BNB)'}
            </span>
          </h3>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            {isRtl
              ? 'أي تعديل هنا يظهر فوراً لجميع الأعضاء في نافذة الإيداع مع رمز QR الخاص بالعنوان الجديد.'
              : 'Changes here immediately update the deposit address and QR code shown to all members.'}
          </p>
        </div>
        <button
          type="submit"
          disabled={isSavingWallets}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-black text-xs cursor-pointer shrink-0 disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          <span>
            {isSavingWallets
              ? isRtl
                ? 'جاري الحفظ...'
                : 'Saving...'
              : isRtl
              ? 'حفظ عناوين الإيداع الآن'
              : 'Save Addresses'}
          </span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
        <div className="space-y-1.5">
          <label className="text-neutral-300 font-bold block">
            {isRtl ? '1. عنوان USDT الأساسي (TRC20)' : '1. Primary USDT (TRC20) Address'}
          </label>
          <input
            type="text"
            dir="ltr"
            required
            value={usdtTrc20WalletInput}
            onChange={(e) => setUsdtTrc20WalletInput(e.target.value)}
            placeholder="TTJa4..."
            className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-emerald-400 font-mono text-xs focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-neutral-300 font-bold block">
            {isRtl ? '2. عنوان اثيريم USDT (ERC20)' : '2. USDT Ethereum (ERC20) Address'}
          </label>
          <input
            type="text"
            dir="ltr"
            required
            value={usdtErc20WalletInput}
            onChange={(e) => setUsdtErc20WalletInput(e.target.value)}
            placeholder="0x..."
            className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-emerald-400 font-mono text-xs focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-neutral-300 font-bold block">
            {isRtl ? '3. عنوان USDT BNB (BEP20)' : '3. USDT BNB (BEP20) Address'}
          </label>
          <input
            type="text"
            dir="ltr"
            required
            value={usdtBep20WalletInput}
            onChange={(e) => setUsdtBep20WalletInput(e.target.value)}
            placeholder="0x..."
            className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-amber-400 font-mono text-xs focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-neutral-300 font-bold block">
            {isRtl ? '4. عنوان بتكوين (BTC)' : '4. Bitcoin (BTC) Address'}
          </label>
          <input
            type="text"
            dir="ltr"
            required
            value={btcWalletInput}
            onChange={(e) => setBtcWalletInput(e.target.value)}
            placeholder="bc1q..."
            className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-orange-400 font-mono text-xs focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-neutral-300 font-bold block">
            {isRtl ? '5. عنوان اثيريم (ETH)' : '5. Ethereum (ETH) Address'}
          </label>
          <input
            type="text"
            dir="ltr"
            required
            value={ethWalletInput}
            onChange={(e) => setEthWalletInput(e.target.value)}
            placeholder="0x..."
            className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-indigo-400 font-mono text-xs focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-neutral-300 font-bold block">
            {isRtl ? '6. عنوان عملة BNB (BEP20)' : '6. BNB (BEP20) Address'}
          </label>
          <input
            type="text"
            dir="ltr"
            required
            value={bnbWalletInput}
            onChange={(e) => setBnbWalletInput(e.target.value)}
            placeholder="0x..."
            className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-yellow-400 font-mono text-xs focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>
    </form>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Admin Header & Private URL Bar */}
      <div className="p-5 rounded-2xl bg-neutral-900 border border-amber-500/30 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest px-2.5 py-0.5 rounded-lg bg-amber-400/10 border border-amber-400/20">
                {isRtl ? 'لوحة الإدارة الخاصة' : 'PRIVATE ADMIN CONSOLE'}
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 px-2.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{isRtl ? `متصل ومربوط بالأعضاء مباشرة (${lastSyncedTime})` : `Live Synced (${lastSyncedTime})`}</span>
              </span>
              <span className="text-xs text-neutral-400 font-mono">{user.email}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1.5">
              {isRtl
                ? 'إدارة الأرصدة، عناوين الإيداع (USDT/BTC)، ومتابعة الأعضاء عبر الأيدي'
                : 'Balance Credit, USDT/BTC Wallet Config & Client ID Ledger'}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentTab('home')}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-amber-400/50 text-xs text-amber-400 font-bold transition-colors cursor-pointer"
            >
              <span>{isRtl ? 'واجهة الأعضاء' : 'Members View'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setBalanceAdjustMode('CREDIT');
                setConfirmBalanceStep(false);
                setCreditAmount('');
                setIsManualCreditOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              <Wallet className="w-4 h-4" />
              <span>{isRtl ? 'التحكم برصيد عضو (إضافة / خصم / تصفير)' : 'Manage User Balance'}</span>
            </button>

            <button
              type="button"
              onClick={() => loadAllAdminData(false)}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-xs text-neutral-300 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{isRtl ? 'تحديث فوري' : 'Refresh'}</span>
            </button>

            <button
              type="button"
              onClick={() => logout()}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/35 hover:bg-rose-500/25 text-xs text-rose-400 font-black transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isRtl ? 'قفل وتسجيل خروج الأدمن' : 'Lock & Logout Admin'}</span>
            </button>
          </div>
        </div>

        {/* Quick Links Row: Admin Link & Member Registration Link */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-neutral-300 font-bold shrink-0">
                {isRtl ? 'رابط الأدمن:' : 'Admin URL:'}
              </span>
              <code className="font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded truncate select-all">
                {adminPrivateUrl}
              </code>
            </div>
            <button
              type="button"
              onClick={handleCopyAdminLink}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-[11px] cursor-pointer shrink-0"
            >
              {copiedAdminUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedAdminUrl ? (isRtl ? 'تم النسخ' : 'Copied') : (isRtl ? 'نسخ' : 'Copy')}</span>
            </button>
          </div>

          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Users className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-neutral-300 font-bold shrink-0">
                {isRtl ? 'رابط دعوة الأعضاء:' : 'Members Invite URL:'}
              </span>
              <code className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded truncate select-all">
                {memberPublicUrl}
              </code>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(memberPublicUrl);
                setCopiedMemberUrl(true);
                setTimeout(() => setCopiedMemberUrl(false), 2000);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-[11px] cursor-pointer shrink-0"
            >
              {copiedMemberUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedMemberUrl ? (isRtl ? 'تم النسخ' : 'Copied') : (isRtl ? 'نسخ رابط الأعضاء' : 'Copy')}</span>
            </button>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 font-bold flex items-center justify-between">
          <span>{feedback}</span>
          <button type="button" onClick={() => setFeedback(null)} className="text-neutral-400 hover:text-white cursor-pointer">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Module Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-neutral-800 text-xs font-bold">
        {[
          { id: 'overview', label: isRtl ? 'نظرة عامة وعناوين الإيداع' : 'Overview & Wallets', icon: Layers },
          { id: 'server', label: isRtl ? 'السيرفر والنظام' : 'Server & Engine', icon: Server },
          {
            id: 'deposits',
            label: isRtl ? `طلبات الإيداع (${pendingDepositsCount} معلق)` : `Deposits (${pendingDepositsCount})`,
            icon: ArrowDownLeft,
          },
          {
            id: 'kyc',
            label: isRtl ? `توثيق الهوية KYC (${pendingKycCount} بانتظارك)` : `KYC Queue (${pendingKycCount})`,
            icon: ShieldCheck,
          },
          {
            id: 'withdrawals',
            label: isRtl ? `طلبات السحب (${pendingWithdrawalsCount})` : `Withdrawals (${pendingWithdrawalsCount})`,
            icon: ArrowUpRight,
          },
          {
            id: 'users',
            label: isRtl ? `الأعضاء والأيدي (${usersList.length})` : `Users & IDs (${usersList.length})`,
            icon: Users,
          },
          { id: 'plans', label: isRtl ? `خطط التداول (${plans.length})` : `Plans (${plans.length})`, icon: Layers },
          { id: 'audit', label: isRtl ? 'سجل العمليات' : 'Audit Logs', icon: FileText },
          { id: 'settings', label: isRtl ? 'الإعدادات' : 'Settings', icon: Settings },
        ].map((mod) => {
          const Icon = mod.icon;
          const isActive = activeModule === mod.id;
          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => setActiveModule(mod.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'bg-amber-400 text-neutral-950 font-black shadow-sm'
                  : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{mod.label}</span>
            </button>
          );
        })}
      </div>

      {/* MODULE: Server & Engine Control Panel */}
      {activeModule === 'server' && <ServerControlPanel />}

      {/* MODULE 1: Overview */}
      {activeModule === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div
              onClick={() => setActiveModule('users')}
              className="p-4 bg-neutral-900 hover:bg-neutral-800/80 rounded-2xl border border-neutral-800 space-y-1 cursor-pointer transition-colors"
            >
              <span className="text-xs text-neutral-400">{isRtl ? 'إجمالي الأعضاء' : 'Total Members'}</span>
              <div className="text-2xl font-black font-mono text-white">
                {overview?.totalUsers ?? usersList.length}
              </div>
            </div>
            <div
              onClick={() => setActiveModule('deposits')}
              className={`p-4 bg-neutral-900 hover:bg-neutral-800/80 rounded-2xl border space-y-1 cursor-pointer transition-colors ${
                pendingDepositsCount > 0 ? 'border-emerald-500/60 bg-emerald-500/5' : 'border-neutral-800'
              }`}
            >
              <span className="text-xs text-neutral-400">{isRtl ? 'طلبات إيداع بانتظار موافقتك' : 'Pending Deposits'}</span>
              <div className="text-2xl font-black font-mono text-emerald-400">{pendingDepositsCount}</div>
            </div>
            <div
              onClick={() => setActiveModule('withdrawals')}
              className={`p-4 bg-neutral-900 hover:bg-neutral-800/80 rounded-2xl border space-y-1 cursor-pointer transition-colors ${
                pendingWithdrawalsCount > 0 ? 'border-rose-500/60 bg-rose-500/5' : 'border-neutral-800'
              }`}
            >
              <span className="text-xs text-neutral-400">{isRtl ? 'طلبات سحب بانتظار موافقتك' : 'Pending Withdrawals'}</span>
              <div className="text-2xl font-black font-mono text-rose-400">{pendingWithdrawalsCount}</div>
            </div>
            <div
              onClick={() => setActiveModule('kyc')}
              className="p-4 bg-neutral-900 hover:bg-neutral-800/80 rounded-2xl border border-neutral-800 space-y-1 cursor-pointer transition-colors"
            >
              <span className="text-xs text-neutral-400">{isRtl ? 'طلبات توثيق هوية بانتظارك' : 'Pending KYC'}</span>
              <div className="text-2xl font-black font-mono text-amber-400">{pendingKycCount}</div>
            </div>
          </div>

          {/* LIVE SECTION 1 ON OVERVIEW: Real-time Pending & Recent Deposits */}
          <div className="p-5 bg-neutral-900 rounded-2xl border-2 border-emerald-500/40 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-black text-white">
                  {isRtl
                    ? `طلبات الإيداع المباشرة من الأعضاء (${pendingDepositsCount} بانتظار الموافقة • الإجمالي: ${deposits.length})`
                    : `Live Member Deposit Requests (${pendingDepositsCount} Pending • Total: ${deposits.length})`}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsManualCreditOpen(true)}
                  className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs rounded-lg cursor-pointer"
                >
                  {isRtl ? '+ إضافة رصيد لعضو' : '+ Credit User'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModule('deposits')}
                  className="px-3 py-1.5 bg-emerald-500 text-neutral-950 font-black text-xs rounded-lg hover:bg-emerald-400 cursor-pointer"
                >
                  {isRtl ? `عرض كل الإيداعات (${deposits.length}) ←` : `View All (${deposits.length}) →`}
                </button>
              </div>
            </div>

            {deposits.length === 0 ? (
              <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 text-xs text-neutral-400 text-center">
                {isRtl
                  ? 'لم يقم أي عضو بإرسال طلب إيداع حتى الآن. فور ضغط أي عضو على «تأكيد الإيداع» سيظهر طلبه هنا تلقائياً خلال ثوانٍ.'
                  : 'No deposit requests submitted yet. New member deposits appear here automatically.'}
              </div>
            ) : (
              <div className="overflow-x-auto bg-neutral-950 rounded-xl border border-neutral-800 max-h-[460px] overflow-y-auto">
                <table className="w-full text-left rtl:text-right text-xs font-mono">
                  <thead className="border-b border-neutral-800 text-neutral-400 text-[11px] font-sans sticky top-0 bg-neutral-950 z-10">
                    <tr>
                      <th className="py-2.5 px-3">{isRtl ? 'رقم الطلب' : 'Order'}</th>
                      <th className="py-2.5 px-3">{isRtl ? 'العضو (ID والاسم)' : 'Member'}</th>
                      <th className="py-2.5 px-3">{isRtl ? 'المبلغ والشبكة' : 'Amount'}</th>
                      <th className="py-2.5 px-3">{isRtl ? 'التوقيت' : 'Time'}</th>
                      <th className="py-2.5 px-3 text-right rtl:text-left">{isRtl ? 'القرار الفوري' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {deposits.slice(0, 15).map((d) => {
                      const uInfo = getUserDetails(d.userId);
                      const cId = d.clientId || formatClientId(d.userId);
                      const cName = d.userFullName || uInfo?.fullName || '—';
                      const cEmail = formatDisplayEmail(d.userEmail || uInfo?.email) || '';
                      return (
                        <tr key={d.id} className="hover:bg-neutral-900/60">
                          <td className="py-2.5 px-3 font-bold text-amber-400">{d.id}</td>
                          <td className="py-2.5 px-3 font-sans">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded bg-amber-400/15 text-amber-400 font-mono font-black text-[11px]">
                                ID: {cId}
                              </span>
                              <span className="font-bold text-white">{cName}</span>
                            </div>
                            {cEmail && <div className="text-[10px] text-neutral-400 font-mono">{cEmail}</div>}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-black text-emerald-400 text-sm" dir="ltr">
                              +${Number(d.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {d.asset}
                            </span>
                            <div className="text-[10px] text-neutral-400 font-sans">{d.network}</div>
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-neutral-400" dir="ltr">
                            {new Date(d.createdAt).toLocaleString('en-US')}
                          </td>
                          <td className="py-2.5 px-3 text-right rtl:text-left font-sans">
                            {d.status === 'PENDING_REVIEW' ? (
                              <div className="flex items-center justify-end rtl:justify-start gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleApproveDeposit(d.id)}
                                  disabled={isProcessing}
                                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black rounded-lg text-xs cursor-pointer disabled:opacity-50"
                                >
                                  {isRtl ? `موافقة (+$${d.amount})` : `Approve +$${d.amount}`}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejectDeposit(d.id)}
                                  disabled={isProcessing}
                                  className="px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-bold rounded-lg text-xs cursor-pointer disabled:opacity-50"
                                >
                                  {isRtl ? 'رفض' : 'Reject'}
                                </button>
                              </div>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[11px] font-bold">
                                {isRtl ? 'تمت الموافقة' : 'Confirmed'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* LIVE SECTION 1A ON OVERVIEW: Real-time Pending & Recent Withdrawals */}
          <div className="p-5 bg-neutral-900 rounded-2xl border-2 border-rose-500/35 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-black text-white">
                  {isRtl
                    ? `طلبات السحب المباشرة من الأعضاء (${pendingWithdrawalsCount} بانتظار الموافقة • الإجمالي: ${withdrawals.length})`
                    : `Live Member Withdrawal Requests (${pendingWithdrawalsCount} Pending • Total: ${withdrawals.length})`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModule('withdrawals')}
                className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-xs rounded-lg cursor-pointer"
              >
                {isRtl ? `فتح قسم طلبات السحب (${withdrawals.length}) ←` : `Open Withdrawals (${withdrawals.length}) →`}
              </button>
            </div>

            {withdrawals.length === 0 ? (
              <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 text-xs text-neutral-400 text-center">
                {isRtl
                  ? 'لا توجد طلبات سحب مرسلة حالياً. فور قيام أي عضو بإرسال طلب سحب من نافذة «سحب»، سيظهر طلبه هنا فوراً مع أزرار الموافقة أو الرفض.'
                  : 'No withdrawal requests submitted yet. Any new withdrawal request appears here immediately.'}
              </div>
            ) : (
              <div className="overflow-x-auto bg-neutral-950 rounded-xl border border-neutral-800">
                <table className="w-full text-left rtl:text-right text-xs font-mono">
                  <thead className="border-b border-neutral-800 text-neutral-400 text-[11px] font-sans">
                    <tr>
                      <th className="py-2.5 px-3">{isRtl ? 'رقم الطلب' : 'Order'}</th>
                      <th className="py-2.5 px-3">{isRtl ? 'العضو (ID والاسم)' : 'Member'}</th>
                      <th className="py-2.5 px-3">{isRtl ? 'المبلغ والصافي' : 'Amount & Net'}</th>
                      <th className="py-2.5 px-3">{isRtl ? 'الشبكة وعنوان المحفظة' : 'Network & Wallet'}</th>
                      <th className="py-2.5 px-3">{isRtl ? 'التوقيت' : 'Time'}</th>
                      <th className="py-2.5 px-3 text-right rtl:text-left">{isRtl ? 'القرار الفوري' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {withdrawals.slice(0, 10).map((w) => {
                      const uInfo = getUserDetails(w.userId);
                      const cId = (w as any).clientId || formatClientId(w.userId);
                      const cName = (w as any).userFullName || uInfo?.fullName || '—';
                      return (
                        <tr key={w.id} className="hover:bg-neutral-900/60">
                          <td className="py-2.5 px-3 font-bold text-rose-400">{w.id}</td>
                          <td className="py-2.5 px-3 font-sans">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded bg-amber-400/15 text-amber-400 font-mono font-black text-[11px]">
                                ID: {cId}
                              </span>
                              <span className="font-bold text-white">{cName}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-black text-white text-sm" dir="ltr">
                              ${Number(w.amount).toFixed(2)} {w.asset}
                            </span>
                            <div className="text-[10px] text-emerald-400 font-bold" dir="ltr">
                              {isRtl ? 'الصافي:' : 'Net:'} ${Number(w.netAmount).toFixed(2)}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-[11px]">
                            <div className="text-neutral-300 font-sans">{w.network}</div>
                            <div className="text-amber-300 font-mono break-all max-w-[220px]">{w.destinationAddress}</div>
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-neutral-400" dir="ltr">
                            {new Date(w.createdAt).toLocaleString('en-US')}
                          </td>
                          <td className="py-2.5 px-3 text-right rtl:text-left font-sans">
                            {w.status === 'PENDING_REVIEW' ? (
                              <div className="flex items-center justify-end rtl:justify-start gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleApproveWithdrawal(w.id)}
                                  disabled={isProcessing}
                                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black rounded-lg text-xs cursor-pointer disabled:opacity-50"
                                >
                                  {isRtl ? 'موافقة' : 'Approve'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRejectingWithdrawalId(w.id)}
                                  disabled={isProcessing}
                                  className="px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-bold rounded-lg text-xs cursor-pointer disabled:opacity-50"
                                >
                                  {isRtl ? 'رفض' : 'Reject'}
                                </button>
                              </div>
                            ) : (
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                  w.status === 'COMPLETED'
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : 'bg-rose-500/10 text-rose-400'
                                }`}
                              >
                                {w.status === 'COMPLETED'
                                  ? isRtl
                                    ? 'تمت الموافقة'
                                    : 'Approved'
                                  : isRtl
                                  ? 'مرفوض'
                                  : 'Rejected'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* LIVE SECTION 1B ON OVERVIEW: Real-time Member KYC Identity Documents for Manual Approval */}
          <div className="p-5 bg-neutral-900 rounded-2xl border-2 border-amber-400/35 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-black text-white">
                  {isRtl
                    ? `وثائق الهوية المرسلة من الأعضاء بانتظار الموافقة اليدوية (${pendingKycCount} بانتظار المراجعة)`
                    : `Live Member KYC Documents for Manual Approval (${pendingKycCount} Pending)`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModule('kyc')}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 cursor-pointer"
              >
                {isRtl ? 'عرض سجل وثائق الهوية الكامل ←' : 'View All KYC Documents →'}
              </button>
            </div>

            {kycQueue.length === 0 ? (
              <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 text-xs text-neutral-400 text-center">
                {isRtl
                  ? 'لا توجد وثائق هوية مرسلة حالياً. فور قيام أي عضو برفع صورة هويته ستصل إلى هنا فوراً للموافقة اليدوية.'
                  : 'No identity documents submitted yet. Uploaded member documents appear here immediately for manual approval.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {kycQueue.slice(0, 6).map((k) => {
                  const uploadedFile = k.files && k.files.length > 0 ? k.files[0] : null;
                  const frontUrl = k.frontFileDataUrl || k.fileDataUrl || uploadedFile?.fileDataUrl;
                  const backUrl = k.backFileDataUrl || k.files?.[1]?.fileDataUrl;
                  const kycUser = getUserDetails(k.userId);
                  return (
                    <div
                      key={k.id}
                      className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-amber-400/15 border border-amber-400/30 text-amber-400 font-mono font-black text-xs">
                            ID: {formatClientId(k.userId)}
                          </span>
                          <span className="font-bold text-white text-xs">
                            {k.fullName || k.userFullName || kycUser?.fullName || '—'}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                              k.status === 'APPROVED'
                                ? 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30'
                                : k.status === 'REJECTED'
                                ? 'text-rose-400 bg-rose-500/15 border border-rose-500/30'
                                : 'text-amber-400 bg-amber-500/15 border border-amber-500/30'
                            }`}
                          >
                            {k.status === 'APPROVED'
                              ? isRtl
                                ? 'تمت الموافقة اليدوية'
                                : 'Approved'
                              : k.status === 'REJECTED'
                              ? isRtl
                                ? 'مرفوض'
                                : 'Rejected'
                              : isRtl
                              ? 'بانتظار موافقتك اليدوية'
                              : 'Pending Manual Approval'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-300">
                          <span>
                            {isRtl ? 'الدولة:' : 'Country:'}{' '}
                            <strong className="text-emerald-400">{k.country || '—'}</strong>
                          </span>
                          <span>
                            {isRtl ? 'المواليد:' : 'DOB:'}{' '}
                            <strong className="font-mono text-white">{k.dateOfBirth || '—'}</strong>
                          </span>
                          <span>
                            {isRtl ? 'الوثيقة:' : 'Document:'}{' '}
                            <strong className="text-amber-400">{formatDocTypeLabel(k.documentType)}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-between lg:justify-end">
                        <div className="flex items-center gap-2">
                          {frontUrl && (
                            <div
                              onClick={() => {
                                setReviewingKycItem(k);
                                setKycDecisionNotes(k.adminNotes || '');
                              }}
                              className="w-20 h-14 rounded-lg overflow-hidden border border-emerald-500/40 bg-neutral-900 cursor-pointer relative group shrink-0"
                              title={isRtl ? 'معاينة الوجه الأمامي' : 'Inspect Front Side'}
                            >
                              <img src={frontUrl} alt="Front ID" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Eye className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          )}
                          {backUrl && (
                            <div
                              onClick={() => {
                                setReviewingKycItem(k);
                                setKycDecisionNotes(k.adminNotes || '');
                              }}
                              className="w-20 h-14 rounded-lg overflow-hidden border border-emerald-500/40 bg-neutral-900 cursor-pointer relative group shrink-0"
                              title={isRtl ? 'معاينة الوجه الخلفي' : 'Inspect Back Side'}
                            >
                              <img src={backUrl} alt="Back ID" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Eye className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setReviewingKycItem(k);
                              setKycDecisionNotes(k.adminNotes || '');
                            }}
                            className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                          >
                            {isRtl ? 'فحص الصور' : 'Inspect'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReviewKYC(k.id, 'APPROVED', 'تمت الموافقة اليدوية من الإدارة')}
                            disabled={isProcessing}
                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black rounded-lg text-xs cursor-pointer disabled:opacity-50"
                          >
                            {isRtl ? 'موافقة وتوثيق يدوي' : 'Approve'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReviewKYC(k.id, 'REJECTED', 'تم رفض الوثيقة من الإدارة')}
                            disabled={isProcessing}
                            className="px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-bold rounded-lg text-xs cursor-pointer disabled:opacity-50"
                          >
                            {isRtl ? 'رفض' : 'Reject'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* LIVE SECTION 2 ON OVERVIEW: Real-time Registered & Logged-in Members */}
          <div className="p-5 bg-neutral-900 rounded-2xl border border-neutral-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-black text-white">
                  {isRtl
                    ? `الأعضاء المسجلين وتسجيلات الدخول المباشرة (${usersList.length})`
                    : `Registered & Active Members (${usersList.length})`}
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleRecoverMemberSessions}
                  disabled={isRecoveringSessions}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRecoveringSessions ? 'animate-spin' : ''}`} />
                  <span>
                    {isRecoveringSessions
                      ? isRtl
                        ? 'جاري استعادة الجلسات...'
                        : 'Restoring...'
                      : isRtl
                      ? 'استعادة ومزامنة جلسات الأعضاء'
                      : 'Restore Member Sessions'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModule('users')}
                  className="text-xs font-bold text-amber-400 hover:text-amber-300 cursor-pointer"
                >
                  {isRtl ? 'إدارة كافة الأعضاء والأرصدة ←' : 'Manage All Users →'}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto bg-neutral-950 rounded-xl border border-neutral-800">
              <table className="w-full text-left rtl:text-right text-xs font-sans">
                <thead className="border-b border-neutral-800 text-neutral-400 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">{isRtl ? 'أيدي العميل (ID)' : 'Client ID'}</th>
                    <th className="py-2.5 px-3">{isRtl ? 'الاسم والبريد' : 'Name & Email'}</th>
                    <th className="py-2.5 px-3">{isRtl ? 'آخر دخول / نشاط' : 'Last Login'}</th>
                    <th className="py-2.5 px-3">{isRtl ? 'الرصيد الفعلي' : 'Balance'}</th>
                    <th className="py-2.5 px-3 text-right rtl:text-left">{isRtl ? 'تحكم سريع' : 'Quick Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {usersList.slice(0, 8).map((u) => {
                    const cleanEmail = formatDisplayEmail(u.email);
                    const balUsdt = Number(u.balanceUSDT || 0).toFixed(2);
                    const lastActiveMs = new Date(u.lastLoginAt || u.createdAt || 0).getTime();
                    const isOnlineNow = Date.now() - lastActiveMs < 3 * 60 * 1000;
                    return (
                      <tr key={u.id} className="hover:bg-neutral-900/60">
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-amber-400/15 border border-amber-400/30 text-amber-400 font-mono font-black text-xs">
                            ID: {formatClientId(u.id)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-white flex flex-wrap items-center gap-1.5">
                            <span>{u.fullName}</span>
                            {u.pendingDepositsCount > 0 && (
                              <span
                                onClick={() => setActiveModule('deposits')}
                                className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-black cursor-pointer"
                              >
                                {isRtl ? `${u.pendingDepositsCount} إيداع معلق` : `${u.pendingDepositsCount} Pending Deposit`}
                              </span>
                            )}
                            {u.kycStatus === 'PENDING' && (
                              <span
                                onClick={() => setActiveModule('kyc')}
                                className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[10px] font-black cursor-pointer"
                              >
                                {isRtl ? 'وثيقة هوية بانتظار الموافقة' : 'Pending KYC'}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-emerald-400">{cleanEmail || '—'}</div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${isOnlineNow ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-600'}`} />
                            <span className={isOnlineNow ? 'text-emerald-400 font-bold font-sans' : 'text-neutral-400 font-sans'}>
                              {isOnlineNow ? (isRtl ? 'متصل الآن' : 'Online Now') : isRtl ? 'مسجل' : 'Registered'}
                            </span>
                          </div>
                          <div className="text-[10px] text-neutral-500" dir="ltr">
                            {new Date(u.lastLoginAt || u.createdAt).toLocaleString('en-US')}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-black text-white" dir="ltr">
                          ${balUsdt} <span className="text-[10px] text-neutral-400">USDT</span>
                        </td>
                        <td className="py-2.5 px-3 text-right rtl:text-left">
                          <button
                            type="button"
                            onClick={() => {
                              setCreditUserId(u.id);
                              setBalanceAdjustMode('CREDIT');
                              setConfirmBalanceStep(false);
                              setCreditAmount('');
                              setIsManualCreditOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs cursor-pointer"
                          >
                            {isRtl ? '+ إضافة رصيد' : '+ Credit'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Direct Deposit Wallet Address Editor */}
          {renderDepositAddressEditor()}

          <div className="p-5 bg-neutral-900 rounded-2xl border border-neutral-800 space-y-4">
            <h3 className="text-sm font-bold text-white">
              {isRtl ? 'الإجراءات الإدارية المباشرة' : 'Direct Administrative Actions'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
              <button
                type="button"
                onClick={() => setActiveModule('server')}
                className="p-4 bg-amber-500/10 hover:bg-amber-500/20 rounded-xl border border-amber-500/30 text-right rtl:text-right ltr:text-left space-y-1 cursor-pointer"
              >
                <div className="font-black text-amber-400 text-sm">
                  {isRtl ? 'إدارة السيرفر والنظام' : 'Server & Engine'}
                </div>
                <div className="text-[11px] text-neutral-300">
                  {isRtl ? 'السيرفر، قواعد البيانات، وروابط الويبهوك' : 'Node.js server, DBs & webhooks'}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsManualCreditOpen(true)}
                className="p-4 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl border border-emerald-500/30 text-right rtl:text-right ltr:text-left space-y-1 cursor-pointer"
              >
                <div className="font-black text-emerald-400 text-sm">
                  {isRtl ? '+ إضافة رصيد لعميل' : '+ Credit Client Balance'}
                </div>
                <div className="text-[11px] text-neutral-300">
                  {isRtl ? 'إيداع USDT أو BTC فوري عبر أيدي العميل' : 'Directly add USDT or BTC via Client ID'}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveModule('deposits')}
                className="p-4 bg-neutral-950 hover:bg-neutral-800 rounded-xl border border-neutral-800 text-right rtl:text-right ltr:text-left space-y-1 cursor-pointer"
              >
                <div className="font-bold text-emerald-400 text-sm">
                  {isRtl ? 'الموافقة على الإيداعات' : 'Approve Deposits'}
                </div>
                <div className="text-[11px] text-neutral-400">
                  {isRtl ? `${pendingDepositsCount} طلب إيداع مع رقم الطلب والأيدي` : `${pendingDepositsCount} pending deposit notices`}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveModule('kyc')}
                className="p-4 bg-neutral-950 hover:bg-neutral-800 rounded-xl border border-neutral-800 text-right rtl:text-right ltr:text-left space-y-1 cursor-pointer"
              >
                <div className="font-bold text-amber-400 text-sm">
                  {isRtl ? 'مراجعة الهويات المرفوعة (KYC)' : 'Review KYC Identity'}
                </div>
                <div className="text-[11px] text-neutral-400">
                  {isRtl
                    ? `${pendingKycCount} طلب (الاسم، الدولة، المواليد، صورة الهوية)`
                    : `${pendingKycCount} identity submissions`}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveModule('withdrawals')}
                className="p-4 bg-neutral-950 hover:bg-neutral-800 rounded-xl border border-neutral-800 text-right rtl:text-right ltr:text-left space-y-1 cursor-pointer"
              >
                <div className="font-bold text-rose-400 text-sm">
                  {isRtl ? 'الموافقة على السحوبات' : 'Authorize Withdrawals'}
                </div>
                <div className="text-[11px] text-neutral-400">
                  {isRtl ? `${pendingWithdrawalsCount} طلب سحب بانتظارك` : `${pendingWithdrawalsCount} pending withdrawals`}
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODULE 2: KYC Review Queue */}
      {activeModule === 'kyc' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">
                {isRtl
                  ? 'طلبات توثيق الهوية (مراجعة الاسم، الدولة، تاريخ الميلاد، وصورة الهوية)'
                  : 'Identity Verification Review Queue (Name, Country, DOB & ID Photo)'}
              </h3>
              <p className="text-xs text-neutral-400">
                {isRtl
                  ? 'أنت فقط من يطلع على وثائق الهوية ويوافق عليها أو يرفضها.'
                  : 'Only you can inspect and approve or reject submitted identity documents.'}
              </p>
            </div>
            <span className="text-xs font-mono text-neutral-400">
              {kycQueue.length} {isRtl ? 'طلب' : 'Submissions'}
            </span>
          </div>

          {kycQueue.length === 0 ? (
            <div className="p-8 bg-neutral-900 rounded-2xl border border-neutral-800 text-center text-xs text-neutral-400">
              {isRtl ? 'لا توجد طلبات توثيق هوية حالياً.' : 'No KYC submissions in queue.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {kycQueue.map((k) => {
                const uploadedFile = k.files && k.files.length > 0 ? k.files[0] : null;
                const frontUrl = k.frontFileDataUrl || k.fileDataUrl || uploadedFile?.fileDataUrl;
                const backUrl = k.backFileDataUrl || k.files?.[1]?.fileDataUrl;
                const kycUser = getUserDetails(k.userId);
                return (
                  <div
                    key={k.id}
                    className="p-5 bg-neutral-900 rounded-2xl border border-neutral-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    {/* User & KYC Details */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg bg-amber-400/15 border border-amber-400/30 text-amber-400 font-mono font-black text-xs">
                          ID: {formatClientId(k.userId)}
                        </span>
                        <span
                          className={`text-[11px] px-2.5 py-0.5 rounded-lg font-bold ${
                            k.status === 'APPROVED'
                              ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30'
                              : k.status === 'REJECTED'
                              ? 'text-rose-400 bg-rose-500/10 border border-rose-500/30'
                              : 'text-amber-400 bg-amber-500/10 border border-amber-500/30'
                          }`}
                        >
                          {k.status === 'APPROVED'
                            ? isRtl
                              ? 'مقبول وموثق'
                              : 'APPROVED'
                            : k.status === 'REJECTED'
                            ? isRtl
                              ? 'مرفوض'
                              : 'REJECTED'
                            : isRtl
                            ? 'بانتظار موافقتك'
                            : 'PENDING'}
                        </span>
                        <span className="text-xs font-mono text-neutral-400">
                          {formatDisplayEmail(k.userEmail) || kycUser?.phone || ''}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs">
                        <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                          <span className="text-[10px] text-neutral-400 block">
                            {isRtl ? 'الاسم الكامل بالهوية' : 'Full Legal Name'}
                          </span>
                          <span className="font-bold text-white">{k.fullName || k.userFullName}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                          <span className="text-[10px] text-neutral-400 block">
                            {isRtl ? 'الدولة' : 'Country'}
                          </span>
                          <span className="font-bold text-emerald-400">{k.country || '—'}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                          <span className="text-[10px] text-neutral-400 block">
                            {isRtl ? 'تاريخ الميلاد (المواليد)' : 'Date of Birth'}
                          </span>
                          <span className="font-bold font-mono text-white">{k.dateOfBirth || '—'}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                          <span className="text-[10px] text-neutral-400 block">
                            {isRtl ? 'نوع الوثيقة' : 'Document Type'}
                          </span>
                          <span className="font-bold text-amber-400">
                            {formatDocTypeLabel(k.documentType)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Uploaded Front & Back ID Photo Previews & Direct Approve/Reject Buttons */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0">
                      <div className="flex items-center gap-2">
                        {frontUrl ? (
                          <div
                            onClick={() => {
                              setReviewingKycItem(k);
                              setKycDecisionNotes(k.adminNotes || '');
                            }}
                            className="w-24 h-16 rounded-xl overflow-hidden border border-emerald-500/40 bg-neutral-950 cursor-pointer relative group shrink-0"
                            title={isRtl ? 'الوجه الأمامي' : 'Front Side'}
                          >
                            <img src={frontUrl} alt="Front ID" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-400">
                            {uploadedFile?.fileName || (isRtl ? 'وثيقة مرفقة' : 'Attached ID')}
                          </div>
                        )}

                        {backUrl && (
                          <div
                            onClick={() => {
                              setReviewingKycItem(k);
                              setKycDecisionNotes(k.adminNotes || '');
                            }}
                            className="w-24 h-16 rounded-xl overflow-hidden border border-emerald-500/40 bg-neutral-950 cursor-pointer relative group shrink-0"
                            title={isRtl ? 'الوجه الخلفي' : 'Back Side'}
                          >
                            <img src={backUrl} alt="Back ID" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleReviewKYC(k.id, 'APPROVED', 'Approved by Chief Admin')}
                          disabled={isProcessing}
                          className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black rounded-xl text-xs cursor-pointer disabled:opacity-50"
                        >
                          {isRtl ? 'موافقة وتوثيق' : 'Approve'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReviewKYC(k.id, 'REJECTED', 'Rejected by Chief Admin')}
                          disabled={isProcessing}
                          className="px-3.5 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-bold rounded-xl text-xs cursor-pointer disabled:opacity-50"
                        >
                          {isRtl ? 'رفض' : 'Reject'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setReviewingKycItem(k);
                            setKycDecisionNotes(k.adminNotes || '');
                          }}
                          className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                        >
                          {isRtl ? 'عرض الهوية' : 'Inspect'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODULE 3: Withdrawal Approvals */}
      {activeModule === 'withdrawals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">
              {isRtl ? 'طلبات سحب الأرباح والرصيد (USDT / BTC)' : 'Withdrawal Authorization Queue'}
            </h3>
            <span className="text-xs font-mono text-neutral-400">{withdrawals.length}</span>
          </div>

          <div className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left rtl:text-right text-xs font-mono">
                <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400 uppercase text-[11px] font-sans">
                  <tr>
                    <th className="py-3 px-4">{isRtl ? 'رقم الطلب' : 'Order ID'}</th>
                    <th className="py-3 px-4">{isRtl ? 'أيدي واسم العميل' : 'Client ID & Name'}</th>
                    <th className="py-3 px-4">{isRtl ? 'المبلغ' : 'Amount'}</th>
                    <th className="py-3 px-4">{isRtl ? 'الشبكة والعنوان' : 'Network & Address'}</th>
                    <th className="py-3 px-4">{isRtl ? 'الحالة' : 'Status'}</th>
                    <th className="py-3 px-4">{isRtl ? 'وقت وتاريخ الطلب' : 'Timestamp'}</th>
                    <th className="py-3 px-4 text-right rtl:text-left">{isRtl ? 'القرار' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 tabular-nums">
                  {withdrawals.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-neutral-500 font-sans">
                        {isRtl ? 'لا توجد طلبات سحب حالياً.' : 'No withdrawal requests.'}
                      </td>
                    </tr>
                  ) : (
                    withdrawals.map((w) => {
                      const uInfo = getUserDetails(w.userId);
                      const cId = (w as any).clientId || formatClientId(w.userId);
                      const cName = (w as any).userFullName || uInfo?.fullName || '—';
                      const cContact = (w as any).userPhone || uInfo?.phone || formatDisplayEmail((w as any).userEmail || uInfo?.email) || '';
                      return (
                        <tr key={w.id} className="hover:bg-neutral-800/30">
                          <td className="py-3.5 px-4 font-bold text-neutral-300">{w.id}</td>
                          <td className="py-3.5 px-4 font-sans">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded bg-amber-400/15 text-amber-400 font-mono font-black text-[11px]">
                                ID: {cId}
                              </span>
                              <span className="font-bold text-white">{cName}</span>
                            </div>
                            <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                              {cContact}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-white">
                            <div>{Number(w.amount).toFixed(2)} {w.asset}</div>
                            {Number(w.feeAmount) > 0 && (
                              <div className="text-[10px] text-neutral-400 font-normal mt-0.5">
                                {isRtl ? 'الرسوم:' : 'Fee:'} -{Number(w.feeAmount).toFixed(2)} &bull;{' '}
                                <span className="text-emerald-400 font-bold">
                                  {isRtl ? 'الصافي:' : 'Net:'} {Number(w.netAmount).toFixed(2)} {w.asset}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-[11px]">
                            <div className="text-neutral-300 font-sans">{w.network}</div>
                            <div className="text-neutral-400 truncate max-w-[200px]">{w.destinationAddress}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                w.status === 'COMPLETED'
                                  ? 'text-emerald-400 bg-emerald-500/10'
                                  : w.status === 'REJECTED'
                                  ? 'text-rose-400 bg-rose-500/10'
                                  : 'text-amber-400 bg-amber-500/10'
                              }`}
                            >
                              {w.status === 'COMPLETED'
                                ? isRtl
                                  ? 'مكتمل'
                                  : 'COMPLETED'
                                : w.status === 'REJECTED'
                                ? isRtl
                                  ? 'مرفوض'
                                  : 'REJECTED'
                                : isRtl
                                ? 'بانتظار الموافقة'
                                : 'PENDING'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-neutral-400 text-[11px]">
                            {new Date(w.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 text-right rtl:text-left font-sans">
                            {w.status === 'PENDING_REVIEW' ? (
                              <div className="flex items-center justify-end rtl:justify-start gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleApproveWithdrawal(w.id)}
                                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-lg text-xs cursor-pointer"
                                >
                                  {isRtl ? 'موافقة' : 'Approve'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRejectingWithdrawalId(w.id)}
                                  className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-lg text-xs font-bold cursor-pointer"
                                >
                                  {isRtl ? 'رفض' : 'Reject'}
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-neutral-500">{isRtl ? 'تمت المعالجة' : 'Settled'}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODULE 4: User Management & Direct Balance Control */}
      {activeModule === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={
                  isRtl
                    ? 'ابحث بأيدي العميل (ID) أو الاسم أو حساب Gmail...'
                    : 'Search by 6-digit Client ID, name, or Gmail...'
                }
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleRecoverMemberSessions}
                disabled={isRecoveringSessions}
                className="px-4 py-2.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRecoveringSessions ? 'animate-spin' : ''}`} />
                <span>
                  {isRecoveringSessions
                    ? isRtl
                      ? 'جاري استعادة الجلسات...'
                      : 'Restoring...'
                    : isRtl
                    ? `استعادة ومزامنة جلسات الأعضاء (${usersList.length})`
                    : `Restore Member Sessions (${usersList.length})`}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setBalanceAdjustMode('CREDIT');
                  setConfirmBalanceStep(false);
                  setCreditAmount('');
                  setIsManualCreditOpen(true);
                }}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{isRtl ? 'تعديل رصيد عضو (إضافة / خصم / تصفير)' : 'Adjust Member Balance'}</span>
              </button>
            </div>
          </div>

          <div className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left rtl:text-right text-xs font-sans">
                <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400 uppercase text-[11px]">
                  <tr>
                    <th className="py-3 px-4">{isRtl ? 'أيدي العميل (ID)' : 'Client ID'}</th>
                    <th className="py-3 px-4">{isRtl ? 'الاسم الكامل' : 'Full Name'}</th>
                    <th className="py-3 px-4">{isRtl ? 'حساب Gmail الموثق' : 'Verified Gmail'}</th>
                    <th className="py-3 px-4">{isRtl ? 'الرصيد الفعلي (USDT)' : 'Real Balance'}</th>
                    <th className="py-3 px-4">{isRtl ? 'توثيق الهوية' : 'KYC Status'}</th>
                    <th className="py-3 px-4 text-right rtl:text-left">{isRtl ? 'إجراءات الإدارة' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {filteredUsers.map((u) => {
                    const cleanEmail = formatDisplayEmail(u.email);
                    const balUsdt = Number(u.balanceUSDT || 0).toFixed(2);
                    const invUsdt = Number(u.investedUSDT || 0).toFixed(2);
                    return (
                      <tr key={u.id} className="hover:bg-neutral-800/30">
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-lg bg-amber-400/15 border border-amber-400/30 text-amber-400 font-mono font-black text-xs">
                            ID: {formatClientId(u.id)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white">{u.fullName}</div>
                          <div className="text-[10px] text-neutral-500">{u.country || ''}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-neutral-300 space-y-0.5">
                          <div className="text-xs text-emerald-400 font-bold">
                            {cleanEmail || '—'}
                          </div>
                          <div className="text-[10px] text-neutral-500">
                            {u.isEmailVerified ? 'Gmail Verified (Resend)' : 'Unverified'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          <div className="font-black text-white text-sm">
                            ${balUsdt} <span className="text-[10px] text-neutral-400">USDT</span>
                          </div>
                          {Number(invUsdt) > 0 && (
                            <div className="text-[10px] text-emerald-400">
                              {isRtl ? 'في الخطط:' : 'Invested:'} ${invUsdt}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs">
                          <span className={u.kycStatus === 'APPROVED' ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                            {u.kycStatus === 'APPROVED'
                              ? isRtl
                                ? 'موثق'
                                : 'APPROVED'
                              : u.kycStatus === 'PENDING'
                              ? isRtl
                                ? 'قيد المراجعة'
                                : 'PENDING'
                              : isRtl
                              ? 'غير موثق'
                              : u.kycStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right rtl:text-left">
                          <div className="flex flex-wrap items-center justify-end rtl:justify-start gap-1.5">
                            {u.role !== 'ADMIN' && (
                              <button
                                type="button"
                                onClick={() => handleCopyMemberSessionLink(u)}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-400/15 border border-amber-400/30 text-amber-300 hover:bg-amber-400/25 font-bold text-xs cursor-pointer"
                              >
                                {copiedSessionUserId === u.id
                                  ? isRtl
                                    ? 'تم نسخ رابط الجلسة'
                                  : 'Link Copied'
                                  : isRtl
                                  ? 'رابط استعادة الجلسة'
                                  : 'Restore Session Link'}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setCreditUserId(u.id);
                                setBalanceAdjustMode('CREDIT');
                                setConfirmBalanceStep(false);
                                setCreditAmount('');
                                setIsManualCreditOpen(true);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs cursor-pointer"
                            >
                              {isRtl ? '+ إضافة رصيد' : '+ Credit'}
                            </button>
                            {Number(balUsdt) > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCreditUserId(u.id);
                                  setBalanceAdjustMode('RESET');
                                  setConfirmBalanceStep(false);
                                  setCreditAmount('0');
                                  setIsManualCreditOpen(true);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 font-bold text-xs cursor-pointer"
                              >
                                {isRtl ? 'تصفير الرصيد' : 'Reset $0'}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleToggleUserStatus(u.id, u.status)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                                u.status === 'ACTIVE'
                                  ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                                  : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                              }`}
                            >
                              {u.status === 'ACTIVE'
                                ? isRtl
                                  ? 'إيقاف'
                                  : 'Suspend'
                                : isRtl
                                ? 'تفعيل'
                                : 'Restore'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODULE 5: Investment Plans Management */}
      {activeModule === 'plans' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">
              {isRtl ? 'إدارة خطط التداول الذكي' : 'Investment Strategy Plans'}
            </h3>
            <button
              type="button"
              onClick={() => setIsCreatingPlan(true)}
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isRtl ? 'إضافة خطة جديدة' : 'Create New Plan'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((p) => (
              <div key={p.id} className="p-4 bg-neutral-900 rounded-xl border border-neutral-800 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-white">{p.name}</span>
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold">{p.status}</span>
                </div>
                <p className="text-xs text-neutral-400 line-clamp-2">{p.description}</p>
                <div className="p-2.5 bg-neutral-950 rounded-lg text-[11px] font-mono flex justify-between">
                  <span>APR: {p.estimatedAprMin}% - {p.estimatedAprMax}%</span>
                  <span>{p.durationDays} Days</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODULE: Deposit Ledger & Approvals */}
      {activeModule === 'deposits' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white">
                {isRtl
                  ? `سجل طلبات الإيداع (${pendingDepositsCount} بانتظار الموافقة • الإجمالي: ${deposits.length})`
                  : `Deposit Orders Ledger (${pendingDepositsCount} Pending • Total: ${deposits.length})`}
              </h3>
              <p className="text-xs text-neutral-400">
                {isRtl
                  ? 'تحقق من أيدي العميل ورقم الطلب ووقت الإيداع ثم اضغط موافقة لإضافة الرصيد فوراً.'
                  : 'Verify Client ID, Order ID, and deposit time to approve and credit funds.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsManualCreditOpen(true)}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>{isRtl ? 'إضافة رصيد لمستخدم' : 'Credit Deposit for User'}</span>
            </button>
          </div>

          <div className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left rtl:text-right text-xs font-mono">
                <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400 uppercase text-[11px] font-sans">
                  <tr>
                    <th className="py-3 px-4">{isRtl ? 'رقم الطلب (Order)' : 'Order ID'}</th>
                    <th className="py-3 px-4">{isRtl ? 'أيدي العميل والاسم' : 'Client ID & Customer'}</th>
                    <th className="py-3 px-4">{isRtl ? 'المبلغ والعملة' : 'Amount'}</th>
                    <th className="py-3 px-4">{isRtl ? 'الشبكة والمرجع' : 'Network & Ref'}</th>
                    <th className="py-3 px-4">{isRtl ? 'توقيت وتاريخ الإيداع' : 'Deposit Time'}</th>
                    <th className="py-3 px-4">{isRtl ? 'الحالة' : 'Status'}</th>
                    <th className="py-3 px-4 text-right rtl:text-left">{isRtl ? 'الإجراء' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 tabular-nums">
                  {deposits.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-neutral-500 font-sans">
                        {isRtl ? 'لا توجد طلبات إيداع مسجلة حالياً.' : 'No deposit records found.'}
                      </td>
                    </tr>
                  ) : (
                    deposits.map((d) => {
                      const uInfo = getUserDetails(d.userId);
                      const clientIdFormatted = d.clientId || formatClientId(d.userId);
                      const customerName = d.userFullName || uInfo?.fullName || '—';
                      const customerContact =
                        d.userPhone || uInfo?.phone || formatDisplayEmail(d.userEmail || uInfo?.email) || '';
                      return (
                        <tr key={d.id} className="hover:bg-neutral-800/30">
                          <td className="py-3.5 px-4 font-bold text-amber-400">{d.id}</td>
                          <td className="py-3.5 px-4 font-sans">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded bg-amber-400/15 border border-amber-400/30 text-amber-400 font-mono font-black text-[11px]">
                                ID: {clientIdFormatted}
                              </span>
                              <span className="font-bold text-white">{customerName}</span>
                            </div>
                            {customerContact && (
                              <div className="text-[10px] text-neutral-400 font-mono mt-0.5">{customerContact}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-black text-emerald-400 text-sm">
                            +{d.amount} {d.asset}
                          </td>
                          <td className="py-3.5 px-4 text-[11px]">
                            <div className="text-neutral-300 font-sans font-semibold">{d.network}</div>
                            <div className="text-neutral-500 truncate max-w-[180px] font-mono">
                              {d.txHash || 'N/A'}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-neutral-300 text-[11px]">
                            {new Date(d.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                d.status === 'CONFIRMED'
                                  ? 'text-emerald-400 bg-emerald-500/10'
                                  : 'text-amber-400 bg-amber-500/10'
                              }`}
                            >
                              {d.status === 'CONFIRMED'
                                ? isRtl
                                  ? 'تمت الإضافة'
                                  : 'Confirmed'
                                : isRtl
                                ? 'بانتظار الموافقة'
                                : 'Pending Approval'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right rtl:text-left font-sans">
                            {d.status === 'PENDING_REVIEW' ? (
                              <div className="flex items-center justify-end rtl:justify-start gap-1.5">
                                {confirmingDeposit?.id === d.id ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleApproveDeposit(d.id)}
                                      disabled={isProcessing}
                                      className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-neutral-950 font-black rounded-lg text-xs cursor-pointer disabled:opacity-50"
                                    >
                                      {isRtl ? `تأكيد نهائي (+$${d.amount})` : `Confirm +$${d.amount}`}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmingDeposit(null)}
                                      className="px-2.5 py-1.5 bg-neutral-800 text-neutral-300 rounded-lg text-xs cursor-pointer"
                                    >
                                      {isRtl ? 'تراجع' : 'Cancel'}
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmingDeposit(d)}
                                      disabled={isProcessing}
                                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black rounded-lg text-xs cursor-pointer disabled:opacity-50"
                                    >
                                      {isRtl ? 'موافقة' : 'Approve'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRejectDeposit(d.id)}
                                      disabled={isProcessing}
                                      className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-bold rounded-lg text-xs cursor-pointer disabled:opacity-50"
                                    >
                                      {isRtl ? 'رفض وحذف' : 'Reject'}
                                    </button>
                                  </>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] text-neutral-500 font-mono">
                                {isRtl ? 'تمت الموافقة' : 'Settled'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Editable USDT & BTC Deposit Wallet Address Card below the live orders */}
          {renderDepositAddressEditor()}
        </div>
      )}

      {/* MODULE 6: Audit Logs */}
      {activeModule === 'audit' && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white">
            {isRtl ? 'سجل العمليات الإدارية' : 'Administrative Audit Trail'}
          </h3>
          <div className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden font-mono text-xs">
            <div className="divide-y divide-neutral-800/60 max-h-96 overflow-y-auto">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-3.5 hover:bg-neutral-800/20 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-amber-400 font-bold">{log.action}</span>
                    <span className="text-neutral-300 text-[11px] mx-2 font-sans">{log.details}</span>
                  </div>
                  <div className="text-neutral-500 text-[10px] tabular-nums">
                    {log.adminEmail} &middot; {new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODULE 7: System Settings */}
      {activeModule === 'settings' && systemSettings && (
        <div className="space-y-5 max-w-4xl">
          <h3 className="text-base font-bold text-white">
            {isRtl ? 'إعدادات النظام وبوابات التحقق (الإيميل والهاتف) ومحافظ الإيداع' : 'System, Verification Gateways & Deposit Wallet Settings'}
          </h3>

          {renderDepositAddressEditor()}

          {/* Cloud Database (Firebase) & Resend Email Receiver Account */}
          <CloudAndResendCard />

          {/* Active OTP Verification Codes Log (Admin Inspection) */}
          <div className="p-5 bg-neutral-900 rounded-2xl border border-neutral-800 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">
                  {isRtl ? 'سجل رموز التحقق النشطة (OTP للبريد والهاتف)' : 'Active Email & Phone OTP Verification Codes'}
                </h4>
                <p className="text-[11px] text-neutral-400">
                  {isRtl
                    ? 'يظهر هنا آخر رموز التحقق المرسلة للأعضاء لمتابعتها من قبل الإدارة عند الحاجة.'
                    : 'Real-time log of issued Email and Phone verification codes.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => loadAllAdminData(false)}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>{isRtl ? 'تحديث' : 'Refresh'}</span>
              </button>
            </div>

            {verificationCodes.length === 0 ? (
              <div className="py-4 text-center text-neutral-500">
                {isRtl ? 'لا توجد رموز تحقق نشطة حالياً.' : 'No active verification codes at the moment.'}
              </div>
            ) : (
              <div className="divide-y divide-neutral-800 font-mono">
                {verificationCodes.map((vc: any) => (
                  <div key={vc.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold text-[10px]">
                        {vc.channel}
                      </span>
                      <span className="text-white font-bold">{vc.target}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-0.5 rounded bg-amber-400/15 border border-amber-400/30 text-amber-400 font-black tracking-widest">
                        {vc.code}
                      </span>
                      <span className="text-[10px] text-neutral-500">
                        {vc.deliveredVia} &middot; {new Date(vc.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-5 bg-neutral-900 rounded-2xl border border-neutral-800 space-y-4 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-neutral-800">
              <div>
                <span className="font-bold text-white block">
                  {isRtl ? 'وضع الصيانة' : 'Maintenance Mode'}
                </span>
                <span className="text-neutral-400 text-[11px]">
                  {isRtl ? 'إيقاف مؤقت لتفعيل الخطط الجديدة' : 'Temporarily pauses new plan activations'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleToggleSystemSetting('maintenanceMode')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  systemSettings.maintenanceMode ? 'bg-rose-500 text-white' : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {systemSettings.maintenanceMode ? (isRtl ? 'مفعل' : 'ACTIVE') : (isRtl ? 'متوقف' : 'DISABLED')}
              </button>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <span className="font-bold text-white block">
                  {isRtl ? 'بوابة الدفع والشبكات (USDT / BTC)' : 'Blockchain Payment Gateway'}
                </span>
                <span className="text-neutral-400 text-[11px]">
                  {isRtl ? 'حالة استقبال طلبات الإيداع والسحب' : 'Inbound/outbound network status'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleToggleSystemSetting('blockchainGatewayConfigured')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  systemSettings.blockchainGatewayConfigured ? 'bg-emerald-500 text-neutral-950' : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {systemSettings.blockchainGatewayConfigured ? (isRtl ? 'متصل' : 'ONLINE') : (isRtl ? 'غير متصل' : 'OFFLINE')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Rejection Modal */}
      {rejectingWithdrawalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-white">
              {isRtl ? 'رفض طلب السحب وإعادة الرصيد' : 'Decline Withdrawal Request'}
            </h3>
            <p className="text-xs text-neutral-400">
              {isRtl
                ? 'أدخل سبب الرفض. سيتم إعادة المبلغ المحجوز تلقائياً إلى رصيد المستخدم المتاح.'
                : 'Enter rejection reason. Reserved funds will be refunded to the user available balance.'}
            </p>
            <textarea
              rows={3}
              required
              placeholder={isRtl ? 'سبب الرفض...' : 'Reason for rejection...'}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectingWithdrawalId(null)}
                className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-xl text-xs cursor-pointer"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleRejectWithdrawal}
                disabled={isProcessing || !rejectionReason.trim()}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-xl text-xs disabled:opacity-50 cursor-pointer"
              >
                {isProcessing
                  ? isRtl
                    ? 'جاري المعالجة...'
                    : 'Processing...'
                  : isRtl
                  ? 'تأكيد الرفض وإعادة الرصيد'
                  : 'Confirm Reject & Refund'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KYC Full Inspection Modal */}
      {reviewingKycItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <h3 className="text-base font-bold text-white">
                {isRtl ? 'فحص بيانات وصورة الهوية (KYC)' : 'Inspect Identity Verification'}
              </h3>
              <button
                type="button"
                onClick={() => setReviewingKycItem(null)}
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-[10px] text-neutral-400 block">{isRtl ? 'الاسم الكامل' : 'Full Name'}</span>
                <span className="font-bold text-white">{reviewingKycItem.fullName || reviewingKycItem.userFullName}</span>
              </div>
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-[10px] text-neutral-400 block">{isRtl ? 'الدولة' : 'Country'}</span>
                <span className="font-bold text-emerald-400">{reviewingKycItem.country}</span>
              </div>
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-[10px] text-neutral-400 block">{isRtl ? 'تاريخ الميلاد' : 'Date of Birth'}</span>
                <span className="font-bold font-mono text-white">{reviewingKycItem.dateOfBirth || '—'}</span>
              </div>
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-[10px] text-neutral-400 block">{isRtl ? 'نوع الوثيقة' : 'Document Type'}</span>
                <span className="font-bold text-amber-400">
                  {formatDocTypeLabel(reviewingKycItem.documentType)}
                </span>
              </div>
            </div>

            {(reviewingKycItem.frontFileDataUrl ||
              reviewingKycItem.fileDataUrl ||
              reviewingKycItem.files?.[0]?.fileDataUrl) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-neutral-300 block">
                    {isRtl ? 'صورة الوثيقة (من الأمام):' : 'Front Document Image:'}
                  </span>
                  <div className="rounded-xl overflow-hidden border border-neutral-800 bg-neutral-950 max-h-60 flex items-center justify-center p-1">
                    <img
                      src={
                        reviewingKycItem.frontFileDataUrl ||
                        reviewingKycItem.fileDataUrl ||
                        reviewingKycItem.files?.[0]?.fileDataUrl
                      }
                      alt="Front KYC ID"
                      className="max-h-56 w-auto object-contain rounded-lg"
                    />
                  </div>
                </div>

                {(reviewingKycItem.backFileDataUrl || reviewingKycItem.files?.[1]?.fileDataUrl) && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-neutral-300 block">
                      {isRtl ? 'صورة الوثيقة (من الخلف):' : 'Back Document Image:'}
                    </span>
                    <div className="rounded-xl overflow-hidden border border-neutral-800 bg-neutral-950 max-h-60 flex items-center justify-center p-1">
                      <img
                        src={reviewingKycItem.backFileDataUrl || reviewingKycItem.files?.[1]?.fileDataUrl}
                        alt="Back KYC ID"
                        className="max-h-56 w-auto object-contain rounded-lg"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <textarea
              rows={2}
              placeholder={isRtl ? 'ملاحظات الإدارة (اختياري)...' : 'Admin notes (optional)...'}
              value={kycDecisionNotes}
              onChange={(e) => setKycDecisionNotes(e.target.value)}
              className="w-full p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            />

            <div className="flex justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReviewingKycItem(null)}
                className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-xl text-xs cursor-pointer"
              >
                {isRtl ? 'إغلاق' : 'Close'}
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleReviewKYC(reviewingKycItem.id, 'REJECTED')}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-bold rounded-xl text-xs cursor-pointer"
                >
                  {isRtl ? 'رفض التوثيق' : 'Reject'}
                </button>
                <button
                  type="button"
                  onClick={() => handleReviewKYC(reviewingKycItem.id, 'APPROVED')}
                  disabled={isProcessing}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black rounded-xl text-xs cursor-pointer"
                >
                  {isRtl ? 'موافقة وتوثيق الحساب' : 'Approve KYC'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Plan Modal */}
      {isCreatingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white">
              {isRtl ? 'إنشاء خطة تداول ذكي جديدة' : 'Create Strategy Plan'}
            </h3>
            <form onSubmit={handleCreatePlan} className="space-y-3 text-xs">
              <div>
                <label className="text-neutral-400 block mb-1">{isRtl ? 'اسم الخطة' : 'Strategy Name'}</label>
                <input
                  type="text"
                  required
                  value={newPlanData.name}
                  onChange={(e) => setNewPlanData({ ...newPlanData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">{isRtl ? 'الوصف' : 'Description'}</label>
                <textarea
                  rows={2}
                  required
                  value={newPlanData.description}
                  onChange={(e) => setNewPlanData({ ...newPlanData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">{isRtl ? 'المدة (أيام)' : 'Duration (Days)'}</label>
                  <input
                    type="number"
                    value={newPlanData.durationDays}
                    onChange={(e) => setNewPlanData({ ...newPlanData, durationDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">{isRtl ? 'أقل عائد %' : 'Min APR (%)'}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newPlanData.estimatedAprMin}
                    onChange={(e) => setNewPlanData({ ...newPlanData, estimatedAprMin: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">{isRtl ? 'أعلى عائد %' : 'Max APR (%)'}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newPlanData.estimatedAprMax}
                    onChange={(e) => setNewPlanData({ ...newPlanData, estimatedAprMax: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingPlan(false)}
                  className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-xl text-xs cursor-pointer"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-xl text-xs cursor-pointer"
                >
                  {isRtl ? 'حفظ الخطة' : 'Deploy Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Balance Control Modal with 2-Step Anti-Error Confirmation */}
      {isManualCreditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <h3 className="text-base font-bold text-white">
                {isRtl ? 'التحكم برصيد عضو (مع تأكيد مزدوج لمنع الخطأ)' : 'Member Balance Control (2-Step Confirmed)'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsManualCreditOpen(false);
                  setConfirmBalanceStep(false);
                }}
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher: CREDIT / DEBIT / RESET */}
            <div className="grid grid-cols-3 gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setBalanceAdjustMode('CREDIT');
                  setConfirmBalanceStep(false);
                }}
                className={`py-2 rounded-xl border cursor-pointer ${
                  balanceAdjustMode === 'CREDIT'
                    ? 'bg-emerald-500 text-neutral-950 border-emerald-400 font-black'
                    : 'bg-neutral-950 text-neutral-400 border-neutral-800'
                }`}
              >
                {isRtl ? '+ إضافة رصيد' : '+ Credit'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setBalanceAdjustMode('DEBIT');
                  setConfirmBalanceStep(false);
                }}
                className={`py-2 rounded-xl border cursor-pointer ${
                  balanceAdjustMode === 'DEBIT'
                    ? 'bg-amber-400 text-neutral-950 border-amber-300 font-black'
                    : 'bg-neutral-950 text-neutral-400 border-neutral-800'
                }`}
              >
                {isRtl ? '- خصم مبلغ' : '- Deduct'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setBalanceAdjustMode('RESET');
                  setConfirmBalanceStep(false);
                }}
                className={`py-2 rounded-xl border cursor-pointer ${
                  balanceAdjustMode === 'RESET'
                    ? 'bg-rose-500 text-white border-rose-400 font-black'
                    : 'bg-neutral-950 text-neutral-400 border-neutral-800'
                }`}
              >
                {isRtl ? 'تصفير ($0.00)' : 'Reset $0'}
              </button>
            </div>

            <form onSubmit={handleManualCreditDeposit} className="space-y-3.5 text-xs">
              <div>
                <label className="text-neutral-300 font-semibold block mb-1">
                  {isRtl ? 'اختر العضو (عبر الأيدي ID أو الاسم أو الجيميل)' : 'Select Member'}
                </label>
                <select
                  required
                  value={creditUserId}
                  onChange={(e) => {
                    setCreditUserId(e.target.value);
                    setConfirmBalanceStep(false);
                  }}
                  className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white font-mono"
                >
                  <option value="">{isRtl ? 'اختر حساب العضو...' : 'Select Member Account...'}</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      ID: {formatClientId(u.id)} — {u.fullName} (${Number(u.balanceUSDT || 0).toFixed(2)} USDT)
                    </option>
                  ))}
                </select>
              </div>

              {balanceAdjustMode !== 'RESET' && (
                <div>
                  <label className="text-neutral-300 font-semibold block mb-1">
                    {balanceAdjustMode === 'CREDIT'
                      ? isRtl
                        ? 'المبلغ الحقيقي المراد إضافته ($ USDT)'
                        : 'Amount to Credit ($ USDT)'
                      : isRtl
                      ? 'المبلغ المراد خصمه من العضو ($ USDT)'
                      : 'Amount to Deduct ($ USDT)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={creditAmount}
                    onChange={(e) => {
                      setCreditAmount(e.target.value);
                      setConfirmBalanceStep(false);
                    }}
                    className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white font-mono text-sm font-bold"
                  />
                </div>
              )}

              {confirmBalanceStep && creditUserId && (
                <div className="p-3.5 bg-amber-500/15 border border-amber-400/40 rounded-xl space-y-1.5 text-xs">
                  <div className="font-black text-amber-300">
                    {isRtl ? 'تأكيد نهائي قبل التنفيذ (لمنع الإضافة بالخطأ):' : 'Final Confirmation Required:'}
                  </div>
                  <div className="text-white font-mono">
                    {isRtl ? 'العضو:' : 'Member:'}{' '}
                    <strong>{getUserDetails(creditUserId)?.fullName}</strong> (ID: {formatClientId(creditUserId)})
                  </div>
                  <div className="text-emerald-400 font-mono font-bold">
                    {balanceAdjustMode === 'CREDIT'
                      ? isRtl
                        ? `سيتم إضافة: +$${Number(creditAmount || 0).toFixed(2)} USDT`
                        : `Credit: +$${Number(creditAmount || 0).toFixed(2)} USDT`
                      : balanceAdjustMode === 'DEBIT'
                      ? isRtl
                        ? `سيتم خصم: -$${Number(creditAmount || 0).toFixed(2)} USDT`
                        : `Deduct: -$${Number(creditAmount || 0).toFixed(2)} USDT`
                      : isRtl
                      ? 'سيتم تصفير رصيد هذا العضو بالكامل إلى $0.00 USDT'
                      : 'Reset member balance to $0.00 USDT'}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsManualCreditOpen(false);
                    setConfirmBalanceStep(false);
                  }}
                  className="px-4 py-2.5 bg-neutral-800 text-neutral-300 rounded-xl text-xs cursor-pointer"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={
                    isProcessing ||
                    !creditUserId ||
                    (balanceAdjustMode !== 'RESET' && (!creditAmount || Number(creditAmount) <= 0))
                  }
                  className={`px-5 py-2.5 font-black rounded-xl text-xs disabled:opacity-50 cursor-pointer ${
                    confirmBalanceStep
                      ? 'bg-amber-400 hover:bg-amber-300 text-neutral-950'
                      : balanceAdjustMode === 'RESET'
                      ? 'bg-rose-500 hover:bg-rose-400 text-white'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950'
                  }`}
                >
                  {isProcessing
                    ? isRtl
                      ? 'جاري التنفيذ...'
                      : 'Processing...'
                    : confirmBalanceStep
                    ? isRtl
                      ? 'تأكيد نهائي وتنفيذ العملية الآن'
                      : 'Confirm & Execute Now'
                    : isRtl
                    ? 'مراجعة وتأكيد العملية'
                    : 'Review & Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
