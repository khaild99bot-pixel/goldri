/**
 * GOLDRIX Direct App Icon Install Modal (PWA Home Screen App)
 */

import React from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { usePWAInstall } from '../../hooks/usePWAInstall.ts';
import { Download, MoreVertical, Share, PlusSquare, CheckCircle2, X } from 'lucide-react';

interface PWAAppDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlatform?: 'android' | 'ios' | 'desktop';
}

export const PWAAppDownloadModal: React.FC<PWAAppDownloadModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isRtl } = useLanguage();
  const { isInstallable, isIOS, install } = usePWAInstall();

  if (!isOpen) return null;

  const handleDirectInstall = async () => {
    const accepted = await install();
    if (accepted) {
      onClose();
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        dir={isRtl ? 'rtl' : 'ltr'}
        className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl"
      >
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <img
              src="/pwa-192x192.png"
              alt="GOLDRIX"
              className="w-9 h-9 rounded-xl border border-emerald-500/40 object-cover"
            />
            <div>
              <span className="text-sm font-extrabold text-white block">
                {isRtl ? 'تثبيت تطبيق GOLDRIX' : 'Install GOLDRIX App'}
              </span>
              <span className="text-[11px] text-emerald-400 font-bold">
                {isRtl ? 'أيقونة تطبيق مباشرة على هاتفك' : 'Direct Home Screen App Icon'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <a
          href="/api/v1/download/apk?v=3.0"
          download="GOLDRIX-v3.0.apk"
          onClick={onClose}
          className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-lg shadow-emerald-500/20"
        >
          <Download className="w-4 h-4 stroke-[2.5]" />
          <span>{isRtl ? 'تنزيل تطبيق الأندرويد (APK)' : 'Download Android APK'}</span>
        </a>

        {isIOS ? (
          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center gap-3">
              <span className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                <Share className="w-4 h-4" />
              </span>
              <span className="text-neutral-200 font-bold leading-relaxed">
                {isRtl
                  ? '1. اضغط على زر المشاركة (Share) في متصفح سفاري'
                  : '1. Tap the Share button in Safari'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center gap-3">
              <span className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                <PlusSquare className="w-4 h-4" />
              </span>
              <span className="text-neutral-200 font-bold leading-relaxed">
                {isRtl
                  ? '2. اختر «إضافة إلى الشاشة الرئيسية» (Add to Home Screen)'
                  : '2. Select "Add to Home Screen"'}
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center gap-3">
              <span className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                <MoreVertical className="w-4 h-4" />
              </span>
              <span className="text-neutral-200 font-bold leading-relaxed">
                {isRtl
                  ? '1. اضغط على النقاط الثلاث (⋮) في أعلى المتصفح'
                  : '1. Tap the menu icon (⋮) at the top of your browser'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center gap-3">
              <span className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                <Download className="w-4 h-4" />
              </span>
              <span className="text-neutral-200 font-bold leading-relaxed">
                {isRtl
                  ? '2. اختر «تثبيت التطبيق» أو «الإضافة إلى الشاشة الرئيسية» لتنزيل أيقونة GOLDRIX مع التطبيق فوراً'
                  : '2. Tap "Install app" or "Add to Home screen" to install the GOLDRIX app icon'}
              </span>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{isRtl ? 'حسناً' : 'Done'}</span>
        </button>
      </div>
    </div>
  );
};

