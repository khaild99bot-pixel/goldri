/**
 * GOLDRIX Private Server & Cloud Database Control Panel
 * Real-time Express/Node.js Server Telemetry, Database Sync, Server Actions, and Backup Export.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api.ts';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { CloudAndResendCard } from '../profile/CloudAndResendCard.tsx';
import {
  Server,
  Database,
  Cpu,
  HardDrive,
  RefreshCw,
  Download,
  CheckCircle2,
  Copy,
  Check,
  Zap,
  ShieldCheck,
  Activity,
} from 'lucide-react';

export const ServerControlPanel: React.FC = () => {
  const { isRtl } = useLanguage();
  const [serverData, setServerData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRunningAction, setIsRunningAction] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadServerStatus = useCallback(async () => {
    try {
      const data = await api.getAdminServerStatus();
      setServerData(data);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServerStatus();
    const interval = setInterval(loadServerStatus, 8000);
    return () => clearInterval(interval);
  }, [loadServerStatus]);

  const handleAction = async (
    action: 'FORCE_SAVE_DB' | 'RECONCILE_YIELDS' | 'CLEAR_EXPIRED_OTPS' | 'REFRESH_MARKET_PRICES'
  ) => {
    setIsRunningAction(action);
    setActionFeedback(null);
    try {
      const res = await api.runAdminServerAction(action);
      setActionFeedback(res.message);
      await loadServerStatus();
    } catch (err: any) {
      setActionFeedback(err?.message || 'فشل تنفيذ أمر السيرفر');
    } finally {
      setIsRunningAction(null);
    }
  };

  const handleDownloadBackup = async () => {
    setIsRunningAction('BACKUP');
    try {
      const data = await api.getAdminServerBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `goldrix_server_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setActionFeedback(
        isRtl
          ? 'تم تحميل النسخة الاحتياطية الكاملة لقاعدة بيانات السيرفر بنجاح'
          : 'Server backup downloaded successfully'
      );
    } catch (err: any) {
      setActionFeedback(err?.message || 'تعذر تحميل النسخة الاحتياطية');
    } finally {
      setIsRunningAction(null);
    }
  };

  const copyEndpoint = (key: string, path: string) => {
    const fullUrl = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const formatUptime = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-5 text-xs">
      {/* Top Banner: Server Status & Quick Controls */}
      <div className="p-5 rounded-2xl bg-neutral-900 border border-emerald-500/30 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">
                  {isRtl ? 'لوحة تحكم السيرفر والنظام المركزي' : 'Central Server & Engine Console'}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-bold text-[10px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{isRtl ? 'السيرفر متصل ونشط' : 'SERVER ONLINE'}</span>
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                {isRtl
                  ? 'إدارة مباشرة لسيرفر Node.js / Express، قاعدة البيانات السحابية Firebase، وبوابة البريد Resend'
                  : 'Direct control over Node.js/Express Server, Firebase Cloud Firestore & Resend Email'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadBackup}
              disabled={isRunningAction === 'BACKUP'}
              className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-black flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isRtl ? 'نسخة احتياطية للسيرفر' : 'Backup Server JSON'}</span>
            </button>
            <button
              type="button"
              onClick={loadServerStatus}
              className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isRtl ? 'تحديث' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {actionFeedback && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
        )}

        {/* Server Hardware & Engine Metrics */}
        {serverData && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
              <div className="flex items-center justify-between text-neutral-400">
                <span>{isRtl ? 'محرك السيرفر' : 'Server Engine'}</span>
                <Cpu className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="font-mono font-black text-white text-sm" dir="ltr">
                Node {serverData.server.nodeVersion}
              </div>
              <div className="text-[10px] text-emerald-400 font-mono">
                Port: {serverData.server.port} (Express REST)
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
              <div className="flex items-center justify-between text-neutral-400">
                <span>{isRtl ? 'وقت تشغيل السيرفر' : 'Server Uptime'}</span>
                <Activity className="w-4 h-4 text-amber-400" />
              </div>
              <div className="font-mono font-black text-white text-sm" dir="ltr">
                {formatUptime(serverData.server.uptimeSeconds)}
              </div>
              <div className="text-[10px] text-neutral-400">
                {isRtl ? 'تحديث تلقائي كل 24 ساعة' : '24h Automated Reconciler'}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
              <div className="flex items-center justify-between text-neutral-400">
                <span>{isRtl ? 'ذاكرة السيرفر (RAM)' : 'Memory Usage'}</span>
                <HardDrive className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="font-mono font-black text-white text-sm" dir="ltr">
                {serverData.server.memoryMB.heapUsed} MB / {serverData.server.memoryMB.rss} MB
              </div>
              <div className="text-[10px] text-neutral-400">
                {isRtl ? 'أداء مستقر وسريع' : 'Healthy Heap Allocation'}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
              <div className="flex items-center justify-between text-neutral-400">
                <span>{isRtl ? 'قواعد البيانات المتصلة' : 'Active Databases'}</span>
                <Database className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="font-bold text-emerald-400 text-xs">
                Firebase Cloud + Local Store
              </div>
              <div className="text-[10px] text-neutral-400 font-mono truncate" dir="ltr">
                {serverData.databases.firebaseProjectId}
              </div>
            </div>
          </div>
        )}

        {/* Direct Server Action Buttons */}
        <div className="pt-2">
          <h4 className="font-bold text-neutral-300 mb-2.5 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>{isRtl ? 'أوامر التحكم الفوري بالسيرفر:' : 'Instant Server Commands:'}</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <button
              type="button"
              onClick={() => handleAction('FORCE_SAVE_DB')}
              disabled={Boolean(isRunningAction)}
              className="p-3 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-emerald-500/40 text-right rtl:text-right ltr:text-left transition-colors cursor-pointer"
            >
              <div className="font-bold text-white">
                {isRtl ? 'حفظ قاعدة بيانات السيرفر' : 'Flush & Save Database'}
              </div>
              <div className="text-[10px] text-neutral-400 mt-0.5">
                {isRtl ? 'تثبيت فوري لجميع الأرصدة والحسابات' : 'Persist all ledger states immediately'}
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleAction('RECONCILE_YIELDS')}
              disabled={Boolean(isRunningAction)}
              className="p-3 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-emerald-500/40 text-right rtl:text-right ltr:text-left transition-colors cursor-pointer"
            >
              <div className="font-bold text-emerald-400">
                {isRtl ? 'تشغيل دورة أرباح الخطط (+7%)' : 'Run Yield Reconciler (+7%)'}
              </div>
              <div className="text-[10px] text-neutral-400 mt-0.5">
                {isRtl ? 'احتساب وتحديث عوائد المستثمرين الآن' : 'Calculate & credit active plan yields'}
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleAction('REFRESH_MARKET_PRICES')}
              disabled={Boolean(isRunningAction)}
              className="p-3 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-emerald-500/40 text-right rtl:text-right ltr:text-left transition-colors cursor-pointer"
            >
              <div className="font-bold text-white">
                {isRtl ? 'تحديث أسعار السوق والشموع' : 'Refresh Market Tickers'}
              </div>
              <div className="text-[10px] text-neutral-400 mt-0.5">
                {isRtl ? 'مزامنة أسعار الذهب والعملات الرقمية' : 'Update live prices & OHLCV candles'}
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleAction('CLEAR_EXPIRED_OTPS')}
              disabled={Boolean(isRunningAction)}
              className="p-3 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-emerald-500/40 text-right rtl:text-right ltr:text-left transition-colors cursor-pointer"
            >
              <div className="font-bold text-white">
                {isRtl ? 'تنظيف ذاكرة رموز التحقق' : 'Purge Expired OTPs'}
              </div>
              <div className="text-[10px] text-neutral-400 mt-0.5">
                {isRtl ? 'مسح الرموز المنتهية لتسريع السيرفر' : 'Clean expired verification records'}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Server Database Record Counters & Endpoints */}
      {serverData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>{isRtl ? 'إحصائيات سجلات السيرفر المباشرة' : 'Live Server Database Records'}</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono">
              <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-[10px] text-neutral-400 font-sans block">
                  {isRtl ? 'إجمالي الحسابات' : 'Users'}
                </span>
                <span className="text-sm font-black text-white">{serverData.stats.usersCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-[10px] text-neutral-400 font-sans block">
                  {isRtl ? 'المحافظ المالية' : 'Wallets'}
                </span>
                <span className="text-sm font-black text-emerald-400">{serverData.stats.accountsCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-[10px] text-neutral-400 font-sans block">
                  {isRtl ? 'العمليات المسجلة' : 'Transactions'}
                </span>
                <span className="text-sm font-black text-white">{serverData.stats.transactionsCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-[10px] text-neutral-400 font-sans block">
                  {isRtl ? 'رسائل Resend' : 'Resend Logs'}
                </span>
                <span className="text-sm font-black text-amber-400">{serverData.stats.emailLogsCount}</span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>{isRtl ? 'روابط السيرفر والـ Webhook الخاصة بك' : 'Server & Webhook Endpoints'}</span>
            </h4>
            <div className="space-y-2">
              {[
                {
                  key: 'admin',
                  label: isRtl ? 'رابط لوحة الأدمن السرية الخاصة:' : 'Secret Private Admin URL:',
                  path: '/?vault_key=grd9942',
                },
                {
                  key: 'resend',
                  label: isRtl ? 'رابط استقبال بريد Resend Webhook:' : 'Resend Inbound Webhook:',
                  path: '/api/v1/webhooks/resend-inbound',
                },
                {
                  key: 'health',
                  label: isRtl ? 'رابط فحص حالة السيرفر (Health):' : 'Server Health Endpoint:',
                  path: '/api/health',
                },
              ].map((ep) => (
                <div
                  key={ep.key}
                  className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <span className="text-[11px] text-neutral-400 block">{ep.label}</span>
                    <code className="text-[11px] font-mono text-emerald-400 truncate block" dir="ltr">
                      {window.location.origin}
                      {ep.path}
                    </code>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyEndpoint(ep.key, ep.path)}
                    className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    {copiedKey === ep.key ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{copiedKey === ep.key ? (isRtl ? 'تم' : 'Copied') : isRtl ? 'نسخ' : 'Copy'}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cloud Database (Firebase) & Resend Email Receiver Account Card */}
      <CloudAndResendCard />
    </div>
  );
};
