import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Smartphone, Share, PlusSquare, MoreVertical, X, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { usePWAInstall } from '../../hooks/usePWAInstall.ts';

interface AppDownloadBannerProps {
  variant?: 'compact' | 'landing';
  isLight?: boolean;
}

export const AppDownloadBanner: React.FC<AppDownloadBannerProps> = ({
  variant = 'compact',
  isLight = false,
}) => {
  const { isRtl } = useLanguage();
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [guidePlatform, setGuidePlatform] = useState<'android' | 'ios' | null>(null);

  if (isInstalled) return null;

  const handleAndroidInstall = async () => {
    const accepted = await install();
    if (accepted) return;
    setGuidePlatform('android');
  };

  const handleIphoneInstall = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) return;
    }
    setGuidePlatform('ios');
  };

  return (
    <>
      <div
        className={`rounded-2xl border p-4 transition-all ${
          variant === 'landing'
            ? isLight
              ? 'bg-white border-slate-200 shadow-lg'
              : 'bg-neutral-900/95 border-neutral-800 shadow-xl'
            : 'bg-neutral-900/90 border-neutral-800 shadow-lg'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/pwa-192x192.png"
              alt="GOLDRIX"
              className="w-10 h-10 rounded-xl border border-emerald-500/30 shadow-md shrink-0 object-cover"
            />
            <div>
              <h3
                className={`text-xs sm:text-sm font-extrabold ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}
              >
                {isRtl ? 'تثبيت تطبيق GOLDRIX على هاتفك' : 'Install GOLDRIX App on Your Phone'}
              </h3>
              <p className="text-[11px] text-neutral-400">
                {isRtl
                  ? 'تثبيت مباشر لأيقونة التطبيق على الشاشة الرئيسية للأندرويد والآيفون'
                  : 'Direct app icon installation for Android & iPhone home screen'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 shrink-0">
            {/* Direct Fresh Android APK Download (Android 14 API 34) */}
            <a
              href="/api/v1/download/apk?v=3.0"
              download="GOLDRIX-v3.0.apk"
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-500/15"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{isRtl ? 'أندرويد (APK)' : 'Android (APK)'}</span>
            </a>

            {/* Direct iPhone / iOS App Icon Install */}
            <button
              type="button"
              onClick={handleIphoneInstall}
              className={`px-4 py-2.5 rounded-xl border font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-900'
                  : 'bg-neutral-950 hover:bg-neutral-800 border-neutral-700 text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-amber-400" />
              <span>{isRtl ? 'آيفون (iOS)' : 'iPhone (iOS)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Clean Guided Modal for Installing App Icon on Android or iPhone */}
      {guidePlatform &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            onClick={() => setGuidePlatform(null)}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              dir={isRtl ? 'rtl' : 'ltr'}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl relative animate-modalIn"
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/pwa-192x192.png"
                    alt="GOLDRIX"
                    className="w-9 h-9 rounded-xl border border-emerald-500/40 object-cover"
                  />
                  <div>
                    <h3 className="text-sm font-extrabold text-white">
                      {guidePlatform === 'android'
                        ? isRtl
                          ? 'تثبيت أيقونة تطبيق GOLDRIX (أندرويد)'
                          : 'Install GOLDRIX App Icon (Android)'
                        : isRtl
                        ? 'تثبيت أيقونة تطبيق GOLDRIX (آيفون)'
                        : 'Install GOLDRIX App Icon (iPhone)'}
                    </h3>
                    <p className="text-[11px] text-emerald-400 font-bold">
                      {isRtl ? 'تثبيت فوري بدون ملفات خارجية' : 'Direct app icon install'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setGuidePlatform(null)}
                  className="p-1.5 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {guidePlatform === 'android' ? (
                <div className="space-y-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                      <MoreVertical className="w-4 h-4" />
                    </span>
                    <span className="text-neutral-200 font-bold leading-relaxed">
                      {isRtl
                        ? '1. اضغط على النقاط الثلاث (⋮) في أعلى متصفح كروم'
                        : '1. Tap the menu icon (⋮) at the top of Chrome'}
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
              ) : (
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
              )}

              <button
                type="button"
                onClick={() => setGuidePlatform(null)}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isRtl ? 'حسناً، فهمت' : 'Got It'}</span>
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

