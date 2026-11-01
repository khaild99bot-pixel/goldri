/**
 * GOLDRIX Cloud Database (Firebase Firestore) & Resend Email Receiver Account Card
 * Allows linking/syncing the user's account with Cloud Firestore and managing/testing
 * the Resend email account for receiving verification codes and platform alerts.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { api } from '../../services/api.ts';
import { EmailMessageRecord } from '../../types/index.ts';
import {
  Database,
  Mail,
  CheckCircle2,
  RefreshCw,
  Send,
  Cloud,
  Inbox,
  ChevronDown,
} from 'lucide-react';

export const CloudAndResendCard: React.FC = () => {
  const { user, firebaseUser, isCloudSynced, syncToCloudDatabase, refreshUserData } = useAuth();
  const { isRtl } = useLanguage();

  const [resendEmail, setResendEmail] = useState('');
  const [messages, setMessages] = useState<EmailMessageRecord[]>([]);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isTestingResend, setIsTestingResend] = useState(false);
  const [showInbox, setShowInbox] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadEmailData = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.getEmailMessages();
      setMessages(data.messages || []);
      setResendEmail(
        data.resendNotifyEmail ||
          user.resendNotifyEmail ||
          (user.email && !user.email.endsWith('@phone.goldrix.io') ? user.email : 'hha253ee@gmail.com')
      );
    } catch {
      // fallback
    }
  }, [user]);

  useEffect(() => {
    loadEmailData();
  }, [loadEmailData]);

  const isChiefAdmin = Boolean(
    user && (user.role === 'ADMIN' || user.email?.toLowerCase() === 'hha253ee@gmail.com')
  );

  if (!user || !isChiefAdmin) return null;

  const handleSyncCloud = async () => {
    setNotice(null);
    setIsSyncingCloud(true);
    try {
      await syncToCloudDatabase();
      await refreshUserData();
      await loadEmailData();
      setNotice({
        type: 'success',
        text: isRtl
          ? 'تمت مزامنة قاعدة بيانات السيرفر السحابية بنجاح'
          : 'Server cloud database synced successfully',
      });
    } catch (err: any) {
      setNotice({
        type: 'error',
        text: err?.message || (isRtl ? 'تعذر مزامنة قاعدة البيانات' : 'Cloud sync failed'),
      });
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handleSaveResendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    const trimmed = resendEmail.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setNotice({
        type: 'error',
        text: isRtl ? 'يرجى إدخال عنوان بريد إلكتروني صحيح' : 'Please enter a valid email address',
      });
      return;
    }

    setIsSavingEmail(true);
    try {
      const res = await api.updateEmailReceiverConfig({ resendNotifyEmail: trimmed });
      await refreshUserData();
      await loadEmailData();
      setNotice({
        type: 'success',
        text: res.message || (isRtl ? 'تم حفظ بريد إشعارات الإدارة بنجاح' : 'Admin notification email saved'),
      });
    } catch (err: any) {
      setNotice({
        type: 'error',
        text: err?.message || (isRtl ? 'تعذر حفظ البريد' : 'Failed to save email'),
      });
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleSendTestEmail = async () => {
    setNotice(null);
    setIsTestingResend(true);
    try {
      const res = await api.sendTestResendEmail(resendEmail.trim() || undefined);
      await loadEmailData();
      setShowInbox(true);
      setNotice({
        type: 'success',
        text:
          res.message ||
          (isRtl
            ? `تم إرسال رسالة الاختبار إلى ${res.email}`
            : `Test email sent to ${res.email}`),
      });
    } catch (err: any) {
      setNotice({
        type: 'error',
        text: err?.message || (isRtl ? 'فشل إرسال رسالة الاختبار' : 'Test email failed'),
      });
    } finally {
      setIsTestingResend(false);
    }
  };

  const cloudConnected = Boolean(isCloudSynced || firebaseUser || user.firebaseUid);

  return (
    <div className="rounded-xl bg-neutral-950/90 border border-amber-500/30 p-4 space-y-3.5 text-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-neutral-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-black text-white text-sm">
              {isRtl
                ? 'إعدادات قاعدة بيانات السيرفر وبوابة البريد (خاص بالأدمن فقط — مخفي عن العامة)'
                : 'Server Database & Email Gateway (Private to Admin Only)'}
            </h4>
            <p className="text-[11px] text-neutral-400">
              {isRtl
                ? 'هذه اللوحة تظهر لك وحدك داخل لوحة تحكم السيرفر ولا تظهر أبداً في حسابات المستخدمين'
                : 'Visible strictly inside the private Admin Console, never on user profile pages'}
            </p>
          </div>
        </div>

        <span
          className={`px-2.5 py-1 rounded-lg font-bold text-[10px] flex items-center gap-1 border ${
            cloudConnected
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
              : 'bg-amber-400/15 border-amber-400/30 text-amber-300'
          }`}
        >
          <CheckCircle2 className="w-3 h-3" />
          <span>
            {cloudConnected
              ? isRtl
                ? 'متصل بالسيرفر السحابي'
                : 'Cloud DB Active'
              : isRtl
              ? 'جاهز للمزامنة'
              : 'Ready'}
          </span>
        </span>
      </div>

      {notice && (
        <div
          className={`p-2.5 rounded-xl border text-[11px] font-bold ${
            notice.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Row 1: Cloud Database & Account Link */}
      <div className="p-3 rounded-xl bg-neutral-900/90 border border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-white font-bold">
            <Cloud className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {isRtl ? 'ربط الحساب وقاعدة البيانات (Firebase Cloud)' : 'Firebase Cloud Account & Database'}
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 font-mono" dir="ltr">
            {firebaseUser?.email || user.email || `ID: ${user.id}`}
          </p>
        </div>

        <button
          type="button"
          onClick={handleSyncCloud}
          disabled={isSyncingCloud}
          className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-spin' : ''}`} />
          <span>
            {isSyncingCloud
              ? isRtl
                ? 'جاري المزامنة...'
                : 'Syncing...'
              : cloudConnected
              ? isRtl
                ? 'مزامنة البيانات السحابية الآن'
                : 'Sync Cloud Data'
              : isRtl
              ? 'ربط الحساب بقاعدة البيانات (Google)'
              : 'Link Cloud Account'}
          </span>
        </button>
      </div>

      {/* Row 2: Resend Email Account for Receiving Messages */}
      <form
        onSubmit={handleSaveResendEmail}
        className="p-3 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-2.5"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-white font-bold">
            <Mail className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {isRtl ? 'حساب استلام رسائل الإيميل (Resend)' : 'Resend Email Receiver Account'}
            </span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
            Resend Active
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="email"
            required
            dir="ltr"
            placeholder="name@gmail.com"
            value={resendEmail}
            onChange={(e) => setResendEmail(e.target.value)}
            className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl text-white font-mono text-xs focus:outline-none"
          />
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="submit"
              disabled={isSavingEmail}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs cursor-pointer disabled:opacity-50"
            >
              {isSavingEmail ? '...' : isRtl ? 'حفظ البريد' : 'Save Email'}
            </button>
            <button
              type="button"
              onClick={handleSendTestEmail}
              disabled={isTestingResend}
              className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3 h-3 text-emerald-400" />
              <span>{isTestingResend ? '...' : isRtl ? 'اختبار استلام رسالة' : 'Test Email'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Row 3: Resend Received & Sent Email Inbox */}
      <div className="rounded-xl bg-neutral-900/70 border border-neutral-800 overflow-hidden">
        <button
          type="button"
          onClick={() => {
            setShowInbox(!showInbox);
            if (!showInbox) loadEmailData();
          }}
          className="w-full px-3.5 py-2.5 flex items-center justify-between text-neutral-200 hover:bg-neutral-800/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Inbox className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-bold">
              {isRtl
                ? `صندوق رسائل البريد المستلمة عبر Resend (${messages.length})`
                : `Resend Email Messages (${messages.length})`}
            </span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-neutral-400 transition-transform ${
              showInbox ? 'rotate-180 text-emerald-400' : ''
            }`}
          />
        </button>

        {showInbox && (
          <div className="p-3 border-t border-neutral-800 max-h-60 overflow-y-auto divide-y divide-neutral-800/70">
            {messages.length === 0 ? (
              <p className="py-3 text-center text-neutral-500 text-[11px]">
                {isRtl
                  ? 'لا توجد رسائل مسجلة بعد. اضغط «اختبار استلام رسالة» لتجربة بريد Resend فوراً.'
                  : 'No email messages yet. Click "Test Email" to send a test message via Resend.'}
              </p>
            ) : (
              messages.slice(0, 12).map((msg) => (
                <div key={msg.id} className="py-2 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-white text-[11px]">{msg.subject}</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono text-[9px]">
                      {msg.category}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono" dir="ltr">
                    <span>To: {msg.to}</span>
                    <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-[11px] text-neutral-300 line-clamp-2">{msg.bodyText}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
