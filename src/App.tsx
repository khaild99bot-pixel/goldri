/**
 * GOLDRIX Financial Platform - Root Application
 * Strictly separates:
 * 1. Standalone Admin Portal (/?admin=1 or /admin)
 * 2. Standalone Members Portal (/ or /?member=1 or /?ref=100001)
 */

import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { LanguageProvider } from './context/LanguageContext.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { MarketProvider } from './context/MarketContext.tsx';
import { Header } from './components/common/Header.tsx';
import { MobileBottomNav } from './components/common/MobileBottomNav.tsx';
import { Footer } from './components/common/Footer.tsx';
import { NotificationDrawer } from './components/common/NotificationDrawer.tsx';

// Pages
import { HomePage } from './components/home/HomePage.tsx';
import { LandingHeroSection } from './components/home/LandingHeroSection.tsx';
import { MarketsPage } from './components/markets/MarketsPage.tsx';
import { SmartTradingPage } from './components/trading/SmartTradingPage.tsx';
import { ReferralsTreePage } from './components/referrals/ReferralsTreePage.tsx';
import { AdminDashboard } from './components/admin/AdminDashboard.tsx';
import { ProfilePage } from './components/profile/ProfilePage.tsx';
import { LegalCompliancePage, LegalSectionTab } from './components/common/LegalCompliancePage.tsx';

// Modals
import { DepositModal } from './components/transfers/DepositModal.tsx';
import { WithdrawalModal } from './components/transfers/WithdrawalModal.tsx';
import { KYCModal } from './components/kyc/KYCModal.tsx';
import { AuthModal } from './components/auth/AuthModal.tsx';
import { SupportTicketsModal } from './components/support/SupportTicketsModal.tsx';

import { api } from './services/api.ts';
import { AppNotification } from './types/index.ts';
import { playNotificationSound } from './utils/soundNotifications.ts';

type AdminModuleType = 'overview' | 'server' | 'users' | 'kyc' | 'withdrawals' | 'deposits' | 'plans' | 'audit' | 'settings';

function isAdminUrlRequested(): boolean {
  if (typeof window === 'undefined') return false;
  const searchParams = new URLSearchParams(window.location.search);
  // If old exposed ?admin=1 is accessed, strip it immediately and stay on public member portal
  if (searchParams.has('admin')) {
    try {
      window.history.replaceState({}, '', '/');
    } catch {
      // ignore
    }
    return false;
  }
  if (searchParams.has('member') || searchParams.has('members') || searchParams.has('ref') || searchParams.has('register')) {
    return false;
  }
  const vaultKey = (searchParams.get('vault_key') || searchParams.get('secret_vault') || '').trim();
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  return (
    vaultKey === 'grd9942' ||
    path === '/vault-grd9942' ||
    path.startsWith('/vault-grd9942/') ||
    hash === '#vault-grd9942'
  );
}

function getInitialAdminModule(): AdminModuleType {
  if (typeof window === 'undefined') return 'overview';
  const mod = new URLSearchParams(window.location.search).get('module') as AdminModuleType | null;
  const validModules: AdminModuleType[] = ['overview', 'server', 'users', 'kyc', 'withdrawals', 'deposits', 'plans', 'audit', 'settings'];
  if (mod && validModules.includes(mod)) {
    return mod;
  }
  return 'overview';
}

function MainApp() {
  const { user } = useAuth();
  const [isAdminPortal, setIsAdminPortal] = useState<boolean>(() => isAdminUrlRequested());
  const [currentTab, setCurrentTab] = useState<string>('home');

  // Modals state (Members Portal only)
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawalOpen, setWithdrawalOpen] = useState(false);
  const [kycOpen, setKycOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined' || isAdminUrlRequested()) return false;
    const params = new URLSearchParams(window.location.search);
    return params.has('register') || params.has('ref');
  });
  const [authInitialMode, setAuthInitialMode] = useState<'LOGIN' | 'REGISTER'>(() => {
    if (typeof window === 'undefined') return 'LOGIN';
    const params = new URLSearchParams(window.location.search);
    return params.has('ref') || params.has('register') ? 'REGISTER' : 'LOGIN';
  });
  const [supportOpen, setSupportOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const handleOpenAuth = (mode: 'LOGIN' | 'REGISTER' = 'LOGIN') => {
    setAuthInitialMode(mode);
    setAuthOpen(true);
  };

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const seenNotifIdsRef = React.useRef<Set<string>>(new Set());
  const initializedNotifsRef = React.useRef<boolean>(false);
  const [adminInitialModule, setAdminInitialModule] = useState<AdminModuleType>(getInitialAdminModule);

  // Sync URL changes between standalone Admin Portal and standalone Members Portal
  useEffect(() => {
    const syncPortalMode = () => {
      const adminMode = isAdminUrlRequested();
      setIsAdminPortal(adminMode);
      if (adminMode) {
        setAdminInitialModule(getInitialAdminModule());
        setAuthOpen(false);
      }
    };
    window.addEventListener('popstate', syncPortalMode);
    window.addEventListener('hashchange', syncPortalMode);
    return () => {
      window.removeEventListener('popstate', syncPortalMode);
      window.removeEventListener('hashchange', syncPortalMode);
    };
  }, []);

  useEffect(() => {
    if (user) {
      setAuthOpen(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && !isAdminPortal) {
      initializedNotifsRef.current = false;
      seenNotifIdsRef.current.clear();
      loadNotifications();
      const interval = setInterval(loadNotifications, 10000);
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
      initializedNotifsRef.current = false;
      seenNotifIdsRef.current.clear();
    }
  }, [user, isAdminPortal]);

  const loadNotifications = async () => {
    try {
      const list = await api.getNotifications();
      if (Array.isArray(list)) {
        const hasNewUnread = list.some(
          (n) => !n.read && !seenNotifIdsRef.current.has(n.id)
        );
        list.forEach((n) => seenNotifIdsRef.current.add(n.id));
        if (initializedNotifsRef.current && hasNewUnread) {
          playNotificationSound('default');
        }
        initializedNotifsRef.current = true;
        setNotifications(list);
      }
    } catch {
      // ignore
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // ignore
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  // ============================================================================
  // PORTAL 1: DEDICATED STANDALONE ADMIN PORTAL (/?admin=1 or /admin)
  // Completely isolated from the Members UI (No Member Header/Nav/Footer)
  // ============================================================================
  if (isAdminPortal) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-950 text-neutral-100 selection:bg-amber-400/20 selection:text-amber-300">
        <main className="flex-1">
          <AdminDashboard
            setCurrentTab={(tab) => {
              if (tab !== 'admin') {
                window.location.href = '/?member=1';
              }
            }}
            initialModule={adminInitialModule}
          />
        </main>
      </div>
    );
  }

  // ============================================================================
  // PORTAL 2: DEDICATED STANDALONE MEMBERS PORTAL (/ or /?member=1 or /?ref=...)
  // Completely isolated from the Admin Console
  // ============================================================================
  if (!user) {
    return (
      <>
        <LandingHeroSection
          onOpenAuth={handleOpenAuth}
          setCurrentTab={setCurrentTab}
        />
        <AuthModal
          isOpen={authOpen}
          initialMode={authInitialMode}
          onClose={() => setAuthOpen(false)}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 text-neutral-100 selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Member Top Bar Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenKYC={() => setKycOpen(true)}
        onOpenAuth={handleOpenAuth}
        onOpenProfile={() => setCurrentTab('profile')}
        onOpenNotifications={() => setNotificationsOpen(true)}
        unreadCount={unreadCount}
      />

      {/* Member Main View Area */}
      <main className="flex-1 pb-13 md:pb-2">
        <div key={currentTab} className="animate-fadeInUp">
          {currentTab === 'home' && (
            <HomePage
              setCurrentTab={setCurrentTab}
              onOpenAuth={() => setAuthOpen(true)}
              onOpenDeposit={() => setDepositOpen(true)}
              onOpenWithdrawal={() => setWithdrawalOpen(true)}
            />
          )}

          {currentTab === 'markets' && (
            <MarketsPage
              setCurrentTab={setCurrentTab}
              onOpenDeposit={() => setDepositOpen(true)}
              onOpenWithdrawal={() => setWithdrawalOpen(true)}
            />
          )}

          {(currentTab === 'trading' || currentTab === 'plans') && (
            <SmartTradingPage
              setCurrentTab={setCurrentTab}
              onOpenDeposit={() => setDepositOpen(true)}
              onOpenKYC={() => setKycOpen(true)}
            />
          )}

          {(currentTab === 'team' || currentTab === 'referrals') && (
            <ReferralsTreePage
              setCurrentTab={setCurrentTab}
            />
          )}

          {(currentTab === 'profile' || currentTab === 'portfolio') && (
            <ProfilePage
              onOpenKYC={() => setKycOpen(true)}
              setCurrentTab={setCurrentTab}
              onOpenAuth={() => setAuthOpen(true)}
              onOpenDeposit={() => setDepositOpen(true)}
              onOpenWithdrawal={() => setWithdrawalOpen(true)}
              onOpenSupport={() => setSupportOpen(true)}
            />
          )}

          {['legal', 'licenses', 'profits', 'faq', 'privacy'].includes(currentTab) && (
            <LegalCompliancePage
              key={currentTab}
              initialSection={
                (currentTab === 'legal' ? 'licenses' : currentTab) as LegalSectionTab
              }
              setCurrentTab={setCurrentTab}
            />
          )}
        </div>
      </main>

      {/* Member Modals */}
      <DepositModal
        isOpen={depositOpen}
        onClose={() => setDepositOpen(false)}
      />

      <WithdrawalModal
        isOpen={withdrawalOpen}
        onClose={() => setWithdrawalOpen(false)}
        onOpenKYC={() => {
          setKycOpen(true);
        }}
      />

      <KYCModal
        isOpen={kycOpen}
        onClose={() => setKycOpen(false)}
      />

      <AuthModal
        isOpen={authOpen}
        initialMode={authInitialMode}
        onClose={() => setAuthOpen(false)}
      />

      <SupportTicketsModal
        isOpen={supportOpen}
        onClose={() => setSupportOpen(false)}
      />

      <NotificationDrawer
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={notifications}
        onMarkRead={handleMarkRead}
        onMarkAllRead={handleMarkAllRead}
      />

      {/* Member Mobile Bottom Navigation */}
      <MobileBottomNav
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
      />

      {/* Member Footer */}
      <Footer
        onOpenSupport={() => setSupportOpen(true)}
        setCurrentTab={setCurrentTab}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <MarketProvider>
            <MainApp />
          </MarketProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
