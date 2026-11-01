/**
 * GOLDRIX Firebase Cloud Database (Firestore) & Authentication Integration
 */

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { User, UserBalances } from './types/index.ts';

// Initialize Firebase SDK using provisioned firebase-applet-config.json
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on startup
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export { onAuthStateChanged, firebaseSignOut };
export type { FirebaseUser };

export async function signInWithGoogleFirebase(): Promise<FirebaseUser> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function syncUserAccountToFirestore(params: {
  user: User;
  balances?: UserBalances | null;
  resendNotifyEmail?: string;
}): Promise<boolean> {
  const currentFbUser = auth.currentUser;
  if (!currentFbUser) return false;

  const uid = currentFbUser.uid;
  const nowIso = new Date().toISOString();
  const safeEmail =
    params.user.email && params.user.email.includes('@')
      ? params.user.email
      : currentFbUser.email || 'investor@goldrix.io';

  const profileData: Record<string, string> = {
    uid,
    goldrixId: String(params.user.id || '100000').slice(0, 32),
    email: safeEmail.slice(0, 160),
    fullName: String(params.user.fullName || currentFbUser.displayName || 'GOLDRIX Member').slice(0, 120),
    role: ['USER', 'ADMIN', 'COMPLIANCE'].includes(params.user.role) ? params.user.role : 'USER',
    kycStatus: String(params.user.kycStatus || 'APPROVED').slice(0, 40),
    updatedAt: nowIso,
  };

  if (params.user.phone) {
    profileData.phone = String(params.user.phone).slice(0, 40);
  }
  if (params.user.country) {
    profileData.country = String(params.user.country).slice(0, 80);
  }
  if (params.resendNotifyEmail) {
    profileData.resendNotifyEmail = String(params.resendNotifyEmail).slice(0, 160);
  }
  if (params.balances?.totalEstimatedUSDT) {
    profileData.totalEstimatedUSDT = String(params.balances.totalEstimatedUSDT).slice(0, 40);
  }
  if (params.balances?.withdrawableUSDT) {
    profileData.withdrawableUSDT = String(params.balances.withdrawableUSDT).slice(0, 40);
  }

  try {
    await setDoc(doc(db, 'users', uid), profileData, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
  }

  try {
    const snapshotJson = JSON.stringify({
      user: {
        id: params.user.id,
        email: safeEmail,
        fullName: params.user.fullName,
        phone: params.user.phone,
        country: params.user.country,
        role: params.user.role,
        kycStatus: params.user.kycStatus,
        vipTier: params.user.vipTier,
        referralCode: params.user.referralCode,
      },
      balances: params.balances || null,
      syncedAt: nowIso,
    }).slice(0, 190000);

    await setDoc(
      doc(db, 'cloud_backups', uid),
      {
        uid,
        goldrixId: String(params.user.id || '100000').slice(0, 32),
        email: safeEmail.slice(0, 160),
        snapshotJson,
        syncedAt: nowIso,
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `cloud_backups/${uid}`);
  }

  return true;
}

export async function getCloudAccountProfile(uid: string) {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${uid}`);
    return null;
  }
}
