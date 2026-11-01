/**
 * GOLDRIX Authentication, Cloud Firestore Sync & User Session Context
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api.ts';
import { User, UserBalances } from '../types/index.ts';
import {
  auth,
  onAuthStateChanged,
  signInWithGoogleFirebase,
  firebaseSignOut,
  syncUserAccountToFirestore,
  FirebaseUser,
} from '../firebase.ts';

interface AuthContextType {
  user: User | null;
  token: string | null;
  balances: UserBalances | null;
  isLoading: boolean;
  firebaseUser: FirebaseUser | null;
  isCloudSynced: boolean;
  login: (emailOrPhone: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  syncToCloudDatabase: () => Promise<boolean>;
  register: (data: {
    email?: string;
    phone?: string;
    password: string;
    fullName: string;
    country?: string;
    countryCode?: string;
    dialCode?: string;
    isEmailVerified?: boolean;
    isPhoneVerified?: boolean;
    language?: string;
    referredBy?: string;
    otpCode?: string;
  }) => Promise<void>;
  logout: () => void;
  switchAccount: (email: string) => Promise<void>;
  refreshUserData: () => Promise<void>;
  refreshBalances: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function isAdminPortalUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const searchParams = new URLSearchParams(window.location.search);
  const vaultKey = (searchParams.get('vault_key') || '').trim();
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  return (
    vaultKey === 'grd9942' ||
    path === '/vault-grd9942' ||
    hash === '#vault-grd9942'
  );
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => api.getToken());
  const [balances, setBalances] = useState<UserBalances | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(false);
  const lastSyncedHashRef = React.useRef<string>('');

  const updateUserIfChanged = useCallback((nextUser: User | null) => {
    setUser((prev) => {
      if (!prev && !nextUser) return prev;
      if (prev && nextUser && JSON.stringify(prev) === JSON.stringify(nextUser)) {
        return prev;
      }
      return nextUser;
    });
  }, []);

  const updateBalancesIfChanged = useCallback((nextBalances: UserBalances | null) => {
    setBalances((prev) => {
      if (!prev && !nextBalances) return prev;
      if (prev && nextBalances && JSON.stringify(prev) === JSON.stringify(nextBalances)) {
        return prev;
      }
      return nextBalances;
    });
  }, []);

  const refreshUserData = useCallback(async () => {
    const activeToken = api.getToken();
    if (!activeToken) {
      updateUserIfChanged(null);
      updateBalancesIfChanged(null);
      setIsLoading(false);
      return;
    }

    try {
      const data = await api.getMe();
      if (data.token) {
        const nextToken = data.token;
        api.setToken(nextToken);
        setToken((prev) => (prev === nextToken ? prev : nextToken));
      }
      if (data.user) {
        updateUserIfChanged(data.user);
      }
      if (data.balances) {
        updateBalancesIfChanged(data.balances);
      }
    } catch (err: any) {
      const msg = String(err?.message || '').toLowerCase();
      if (msg.includes('401') || msg.includes('تسجيل الدخول') || msg.includes('suspended') || msg.includes('expired')) {
        api.setToken(null);
        setToken(null);
        updateUserIfChanged(null);
        updateBalancesIfChanged(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [updateUserIfChanged, updateBalancesIfChanged]);

  const refreshBalances = useCallback(async () => {
    if (!api.getToken()) return;
    try {
      const summary = await api.getBalanceSummary();
      if (summary) {
        updateBalancesIfChanged(summary);
      }
    } catch (err) {
      console.warn('[Auth] Deferred balance refresh while server warms up:', err);
    }
  }, [updateBalancesIfChanged]);

  // Listen to Firebase Auth state changes (only on Member portal)
  useEffect(() => {
    if (isAdminPortalUrl()) return;
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser && fbUser.email) {
        try {
          const res = await api.loginWithFirebase({
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName || undefined,
            photoURL: fbUser.photoURL || undefined,
          });
          api.setToken(res.token);
          setToken(res.token);
          updateUserIfChanged(res.user);
          updateBalancesIfChanged(res.balances);
          await syncUserAccountToFirestore({
            user: res.user,
            balances: res.balances,
            resendNotifyEmail: res.user.resendNotifyEmail || fbUser.email,
          });
          setIsCloudSynced(true);
        } catch (err) {
          console.warn('[Auth] Firebase session sync error:', err);
        }
      } else {
        setIsCloudSynced(false);
      }
    });
    return () => unsubscribe();
  }, [updateUserIfChanged, updateBalancesIfChanged]);

  // Automatically keep Firestore cloud backup updated when user or balances genuinely change
  useEffect(() => {
    if (user && firebaseUser && !isAdminPortalUrl()) {
      const currentHash = JSON.stringify({ u: user, b: balances });
      if (lastSyncedHashRef.current === currentHash) return;
      lastSyncedHashRef.current = currentHash;

      syncUserAccountToFirestore({
        user,
        balances,
        resendNotifyEmail: user.resendNotifyEmail || user.email,
      })
        .then((ok) => {
          if (ok) setIsCloudSynced(true);
        })
        .catch(() => {});
    }
  }, [user, balances, firebaseUser]);

  useEffect(() => {
    refreshUserData();

    const pollMs = user?.kycStatus === 'PENDING' ? 4000 : 8000;
    const interval = setInterval(() => {
      if (api.getToken() && document.visibilityState === 'visible') {
        refreshUserData();
      }
    }, pollMs);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && api.getToken()) {
        refreshUserData();
      }
    };
    window.addEventListener('focus', handleVisibility);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleVisibility);
      window.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refreshUserData, user?.kycStatus]);

  const login = useCallback(async (email: string, pass: string) => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('goldrix_manual_logout');
      }
      const res = await api.login(email, pass);
      api.setToken(res.token);
      setToken(res.token);
      updateUserIfChanged(res.user);
      const bal = await api.getBalanceSummary();
      updateBalancesIfChanged(bal);
    } finally {
      setIsLoading(false);
    }
  }, [updateUserIfChanged, updateBalancesIfChanged]);

  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      const fbUser = await signInWithGoogleFirebase();
      if (!fbUser.email) {
        throw new Error('لم يتم العثور على بريد إلكتروني في حساب Google');
      }
      const res = await api.loginWithFirebase({
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName || undefined,
        photoURL: fbUser.photoURL || undefined,
      });
      api.setToken(res.token);
      setToken(res.token);
      updateUserIfChanged(res.user);
      updateBalancesIfChanged(res.balances);
      await syncUserAccountToFirestore({
        user: res.user,
        balances: res.balances,
        resendNotifyEmail: res.user.resendNotifyEmail || fbUser.email,
      });
      setIsCloudSynced(true);
    } finally {
      setIsLoading(false);
    }
  };

  const syncToCloudDatabase = async (): Promise<boolean> => {
    if (!user) return false;
    if (!auth.currentUser) {
      await loginWithGoogle();
      return true;
    }
    const ok = await syncUserAccountToFirestore({
      user,
      balances,
      resendNotifyEmail: user.resendNotifyEmail || user.email,
    });
    setIsCloudSynced(ok);
    return ok;
  };

  const register = async (data: {
    email?: string;
    phone?: string;
    password: string;
    fullName: string;
    country?: string;
    countryCode?: string;
    dialCode?: string;
    isEmailVerified?: boolean;
    isPhoneVerified?: boolean;
    language?: string;
    referredBy?: string;
    otpCode?: string;
  }) => {
    setIsLoading(true);
    try {
      const res = await api.register(data);
      api.setToken(res.token);
      setToken(res.token);
      updateUserIfChanged(res.user);
      const bal = await api.getBalanceSummary();
      updateBalancesIfChanged(bal);
    } finally {
      setIsLoading(false);
    }
  };

  const switchAccount = async (_email: string) => {
    // Auto-switching accounts without credentials is disabled for security
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('goldrix_manual_logout', '1');
    }
    firebaseSignOut(auth).catch(() => {});
    api.setToken(null);
    setToken(null);
    updateUserIfChanged(null);
    updateBalancesIfChanged(null);
    setIsCloudSynced(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        balances,
        isLoading,
        firebaseUser,
        isCloudSynced,
        login,
        loginWithGoogle,
        syncToCloudDatabase,
        register,
        logout,
        switchAccount,
        refreshUserData,
        refreshBalances,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
