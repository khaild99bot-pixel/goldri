/**
 * GOLDRIX Institutional Minimal Footer
 */

import React from 'react';
import { ShieldCheck, HelpCircle } from 'lucide-react';
import { GoldrixLogo } from './GoldrixLogo.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useTheme } from '../../context/ThemeContext.tsx';

interface FooterProps {
  onOpenSupport: () => void;
  setCurrentTab: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenSupport }) => {
  const { isRtl } = useLanguage();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <footer className="hidden md:block w-full bg-neutral-950 border-t border-neutral-900 text-neutral-400 py-3.5 px-4 sm:px-6 text-xs">
      <div className="w-full max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Brand & Security Status */}
        <div className="flex items-center gap-3">
          <GoldrixLogo size="sm" showSubtitle={false} isLight={isLight} />
          <span className="text-neutral-600">&middot;</span>
          <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isRtl ? 'احتياطي أمان 100%' : '100% Reserves'}</span>
          </span>
        </div>

        {/* Support */}
        <div className="flex items-center gap-4 text-[11px]">
          <button
            type="button"
            onClick={onOpenSupport}
            className="flex items-center gap-1.5 text-neutral-300 hover:text-emerald-400 transition-colors cursor-pointer font-semibold"
          >
            <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isRtl ? 'الدعم الفني والمساعدة' : 'Support Desk'}</span>
          </button>
        </div>

        {/* Copyright */}
        <div className="text-[11px] text-neutral-400 font-mono">
          <span>&copy; {new Date().getFullYear()} GOLDRIX</span>
        </div>
      </div>
    </footer>
  );
};
