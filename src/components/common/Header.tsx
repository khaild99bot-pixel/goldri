/**
 * GOLDRIX Institutional Header
 * - Full-screen width layout with zero zoom controls and fixed scale
 * - Profile button (الملف الشخصي) placed cleanly in the top corner without top ID clutter
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useLanguage, Language } from '../../context/LanguageContext.tsx';
import { useTheme } from '../../context/ThemeContext.tsx';
import { GoldrixLogo } from './GoldrixLogo.tsx';
import {
  Bell,
  Globe,
  User as UserIcon,
  Sun,
  Moon,
  CheckCircle2,
  LogIn,
  UserPlus,
} from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenKYC: () => void;
  onOpenAuth: (mode?: 'LOGIN' | 'REGISTER') => void;
  onOpenProfile: () => void;
  onOpenNotifications: () => void;
  unreadCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  onOpenAuth,
  onOpenNotifications,
  unreadCount,
}) => {
  const { user } = useAuth();
  const { language, setLanguage, t, isRtl, supportedLanguages } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const isChiefAdmin = Boolean(
    user && (user.role === 'ADMIN' || user.email?.toLowerCase() === 'hha253ee@gmail.com')
  );

  // Ensure any previously saved zoom is cleared and root font-size stays locked at 16px
  useEffect(() => {
    localStorage.removeItem('goldrix_ui_zoom');
    document.documentElement.style.fontSize = '16px';
  }, []);

  const navItems = [
    { id: 'home', label: t('home') },
    { id: 'markets', label: t('markets') },
    { id: 'trading', label: t('smartTrading') },
    { id: 'team', label: t('team') },
  ];

  const isLight = theme === 'light';

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-colors duration-200 border-b ${
        isLight
          ? 'bg-white/95 backdrop-blur-md border-slate-200 text-slate-900 shadow-xs'
          : 'bg-neutral-950/95 backdrop-blur-md border-neutral-800 text-neutral-100'
      }`}
    >
      <div className="w-full max-w-[1440px] mx-auto px-2.5 sm:px-4 lg:px-6 h-13 flex items-center justify-between gap-2">
        
        {/* Zone 1: Brand Logo */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setCurrentTab('home')}
            className="flex items-center cursor-pointer focus:outline-none"
          >
            <GoldrixLogo size="sm" showSubtitle={false} isLight={isLight} />
          </button>
        </div>

        {/* Zone 2: Desktop Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-neutral-900/70 p-1 rounded-xl border border-neutral-800 text-xs font-bold">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setCurrentTab(item.id)}
                className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-500 text-neutral-950 font-black shadow-sm'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
                    : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Top Corner Controls + Profile Button in Extreme Corner */}
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`h-8 w-8 flex items-center justify-center rounded-xl border transition-colors cursor-pointer shrink-0 ${
              isLight
                ? 'bg-slate-100 border-slate-300 text-amber-600 hover:bg-slate-200'
                : 'bg-neutral-900 border-neutral-800 text-amber-400 hover:bg-neutral-800'
            }`}
            aria-label="Toggle Theme"
          >
            {isLight ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
          </button>

          {/* Language Switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className={`h-8 flex items-center gap-1 px-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer shrink-0 ${
                isLight
                  ? 'bg-slate-100 border-slate-300 text-slate-700 hover:text-slate-950'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white'
              }`}
              aria-label="Select Language"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="uppercase text-[10px] font-mono">{language}</span>
            </button>

            {langMenuOpen && (
              <div
                className={`absolute ${
                  isRtl ? 'left-0' : 'right-0'
                } mt-2 w-44 border rounded-xl shadow-xl py-1 z-50 max-h-80 overflow-y-auto ${
                  isLight ? 'bg-white border-slate-200' : 'bg-neutral-900 border-neutral-800'
                }`}
              >
                {supportedLanguages.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => {
                      setLanguage(l.code);
                      setLangMenuOpen(false);
                    }}
                    className={`w-full text-left rtl:text-right px-3 py-2 text-xs flex items-center justify-between cursor-pointer ${
                      language === l.code
                        ? 'text-emerald-500 font-bold bg-emerald-500/10'
                        : isLight
                        ? 'text-slate-700 hover:bg-slate-100'
                        : 'text-neutral-300 hover:bg-neutral-800'
                    }`}
                  >
                    <span>{l.nativeName}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono opacity-60">{l.shortLabel}</span>
                      {language === l.code && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notifications Button */}
          {user && (
            <button
              type="button"
              onClick={onOpenNotifications}
              className={`relative h-8 w-8 flex items-center justify-center rounded-xl border transition-colors cursor-pointer shrink-0 ${
                isLight
                  ? 'bg-slate-100 border-slate-300 text-slate-700 hover:text-slate-950'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white'
              }`}
              aria-label="Notifications"
            >
              <Bell className="w-3.5 h-3.5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full" />
              )}
            </button>
          )}

          {/* Profile Icon Button in the Top Corner (Shows avatar photo if uploaded) */}
          {user ? (
            <button
              type="button"
              onClick={() => setCurrentTab('profile')}
              className={`h-8 w-8 rounded-xl border flex items-center justify-center overflow-hidden transition-all cursor-pointer shrink-0 ${
                currentTab === 'profile'
                  ? 'border-emerald-500 bg-emerald-500 text-neutral-950 shadow-sm ring-2 ring-emerald-500/30'
                  : isLight
                  ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-700 shadow-2xs'
                  : 'bg-neutral-900 hover:bg-neutral-800 border-emerald-500/40 text-emerald-400'
              }`}
              title={isRtl ? 'الملف الشخصي' : 'Profile'}
              aria-label={isRtl ? 'الملف الشخصي' : 'Profile'}
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-4 h-4 stroke-[2.4]" />
              )}
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onOpenAuth('LOGIN')}
                className="h-8 flex items-center gap-1 px-2.5 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-xl transition-all whitespace-nowrap cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isRtl ? 'تسجيل الدخول' : 'Sign In'}</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth('REGISTER')}
                className="h-8 flex items-center gap-1 px-2.5 text-xs font-bold text-neutral-950 bg-emerald-500 hover:bg-emerald-400 rounded-xl transition-all whitespace-nowrap shadow-sm cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5 stroke-[2.25]" />
                <span>{isRtl ? 'إنشاء حساب' : 'Sign Up'}</span>
              </button>
            </div>
          )}

        </div>

      </div>
    </header>
  );
};
