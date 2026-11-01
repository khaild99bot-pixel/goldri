/**
 * GOLDRIX In-App Notifications & Transfer Status Drawer
 * Displays deposit and withdrawal statuses (مقبول / مرفوض / قيد المراجعة),
 * system notifications, and a Sound Notifications toggle (تفعيل إشعارات الصوت).
 */

import React, { useState, useEffect } from 'react';
import { AppNotification, Deposit, Withdrawal } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useSoundNotifications } from '../../utils/soundNotifications.ts';
import {
  X,
  Bell,
  ArrowDownLeft,
  ArrowUpRight,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onMarkAllRead,
}) => {
  const { isRtl } = useLanguage();
  const { soundEnabled, toggleSound } = useSoundNotifications();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);

  useEffect(() => {
    if (isOpen) {
      api.getDeposits().then(setDeposits).catch(() => {});
      api.getWithdrawals().then(setWithdrawals).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getStatusBadge = (status: string) => {
    const upper = status.toUpperCase();
    if (upper === 'CONFIRMED' || upper === 'COMPLETED' || upper === 'APPROVED') {
      return (
        <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
          {isRtl ? 'مقبول' : 'Approved'}
        </span>
      );
    }
    if (upper === 'REJECTED' || upper === 'FAILED') {
      return (
        <span className="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[11px] font-bold">
          {isRtl ? 'مرفوض' : 'Rejected'}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300 border border-neutral-700 text-[11px] font-bold">
        {isRtl ? 'قيد المراجعة' : 'Pending'}
      </span>
    );
  };

  const getNotificationBadge = (n: AppNotification) => {
    const text = `${n.title} ${n.message}`.toLowerCase();
    if (
      text.includes('approved') ||
      text.includes('confirmed') ||
      text.includes('مقبول') ||
      text.includes('تمت الموافقة') ||
      text.includes('تم قبول')
    ) {
      return getStatusBadge('APPROVED');
    }
    if (
      text.includes('rejected') ||
      text.includes('declined') ||
      text.includes('مرفوض') ||
      text.includes('تم رفض')
    ) {
      return getStatusBadge('REJECTED');
    }
    if (n.type === 'DEPOSIT' || n.type === 'WITHDRAWAL') {
      return getStatusBadge('PENDING');
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl max-h-[85vh] p-5 flex flex-col justify-between shadow-2xl">
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-neutral-800 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-neutral-800 text-white flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-white">
                {isRtl ? 'الإشعارات وسجل الطلبات' : 'Notifications & Requests'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {notifications.some((n) => !n.read) && (
                <button
                  type="button"
                  onClick={onMarkAllRead}
                  className="text-[11px] text-neutral-400 hover:text-white px-2 py-1 rounded hover:bg-neutral-800 cursor-pointer"
                >
                  {isRtl ? 'قراءة الكل' : 'Mark Read'}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sound Notifications Toggle Option (خيار تفعيل إشعارات صوت) */}
          <div className="mt-3 p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                  soundEnabled
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-500'
                }`}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </div>
              <div>
                <span className="text-xs font-extrabold text-white block">
                  {isRtl ? 'تفعيل إشعارات الصوت' : 'Sound Notifications'}
                </span>
                <span className="text-[10px] text-neutral-400">
                  {soundEnabled
                    ? isRtl
                      ? 'التنبيه الصوتي للإيداع والسحب والأرباح مفعل'
                      : 'Audio chime for deposits, withdrawals & profits is ON'
                    : isRtl
                    ? 'التنبيه الصوتي للإشعارات متوقف حالياً'
                    : 'Audio chime for notifications is OFF'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => toggleSound()}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                soundEnabled
                  ? 'bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-500/20'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
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
                  : 'Enable'}
              </span>
            </button>
          </div>

          <div className="mt-3.5 space-y-2.5 overflow-y-auto pr-1 flex-1">
            {/* Deposit & Withdrawal Status Items */}
            {(deposits.length > 0 || withdrawals.length > 0) && (
              <div className="space-y-2 pb-2.5 border-b border-neutral-800">
                {deposits.slice(0, 6).map((d) => (
                  <div
                    key={d.id}
                    className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <ArrowDownLeft className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <div className="font-bold text-white">
                          {isRtl ? 'طلب إيداع' : 'Deposit'} &bull;{' '}
                          <span className="font-mono text-emerald-400" dir="ltr">
                            +${Number(d.amount).toFixed(2)} USDT
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-neutral-500">
                          {d.network || 'USDT TRC20'} &bull; #{d.id}
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(d.status)}
                  </div>
                ))}

                {withdrawals.slice(0, 6).map((w) => (
                  <div
                    key={w.id}
                    className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <div className="font-bold text-white">
                          {isRtl ? 'طلب سحب' : 'Withdrawal'} &bull;{' '}
                          <span className="font-mono text-amber-300" dir="ltr">
                            -${Number(w.amount).toFixed(2)} USDT
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-neutral-500">
                          {w.network || 'USDT TRC20'} &bull;{' '}
                          {isRtl
                            ? `الصافي: $${Number(w.netAmount || w.amount).toFixed(2)}`
                            : `Net: $${Number(w.netAmount || w.amount).toFixed(2)}`}{' '}
                          &bull; #{w.id}
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(w.status)}
                  </div>
                ))}
              </div>
            )}

            {/* Notifications List */}
            {notifications.length === 0 && deposits.length === 0 && withdrawals.length === 0 ? (
              <p className="text-xs text-neutral-500 text-center py-12">
                {isRtl ? 'لا توجد إشعارات حالياً' : 'No notifications'}
              </p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => onMarkRead(n.id)}
                  className={`p-3 rounded-xl border text-xs space-y-1.5 transition-all cursor-pointer ${
                    !n.read
                      ? 'bg-neutral-950 border-neutral-700'
                      : 'bg-neutral-950/50 border-neutral-800/80 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-white">{n.title}</span>
                    {getNotificationBadge(n)}
                  </div>
                  <p className="text-neutral-400 text-[11px] leading-relaxed">{n.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
