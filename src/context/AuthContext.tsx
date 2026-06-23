import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  type User,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { generateSalt, deriveKey, encrypt, decrypt } from '../lib/crypto';

export type UserStatus = 'pending' | 'approved' | 'rejected' | null;

interface AuthContextType {
  user: User | null;
  workspaceKey: CryptoKey | null;
  workspaceExists: boolean | null;
  userStatus: UserStatus;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  setupWorkspace: (passphrase: string) => Promise<void>;
  unlockWorkspace: (passphrase: string) => Promise<boolean>;
}

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || '';

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [workspaceKey, setWorkspaceKey] = useState<CryptoKey | null>(null);
  const [workspaceExists, setWorkspaceExists] = useState<boolean | null>(null);
  const [userStatus, setUserStatus] = useState<UserStatus>(null);
  const [loading, setLoading] = useState(false);

  const isAdmin = user?.email === ADMIN_EMAIL;

  const refreshWorkspaceExists = useCallback(async () => {
    const cfg = await getDoc(doc(db, 'workspace', 'config'));
    setWorkspaceExists(cfg.exists());
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const profileDoc = await getDoc(doc(db, 'users', cred.user.uid, 'profile', 'main'));
      const data = profileDoc.data();
      const status = (data?.status as UserStatus) || 'pending';
      setUser(cred.user);
      setUserStatus(status);
      if (status === 'approved') {
        await refreshWorkspaceExists();
      }
    } finally {
      setLoading(false);
    }
  }, [refreshWorkspaceExists]);

  const register = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const isAdminUser = email === ADMIN_EMAIL;
      const now = Date.now();
      const status = isAdminUser ? 'approved' : 'pending';
      await setDoc(doc(db, 'users', cred.user.uid, 'profile', 'main'), {
        email,
        status,
        createdAt: now,
      });
      await setDoc(doc(db, 'registrations', cred.user.uid), {
        email,
        status,
        createdAt: now,
      });
      setUser(cred.user);
      setUserStatus(status);
      if (status === 'approved') {
        await refreshWorkspaceExists();
      }
    } finally {
      setLoading(false);
    }
  }, [refreshWorkspaceExists]);

  const logout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    setWorkspaceKey(null);
    setWorkspaceExists(null);
    setUserStatus(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  }, []);

  const setupWorkspace = useCallback(async (passphrase: string) => {
    const salt = generateSalt();
    const key = await deriveKey(passphrase, salt);
    const verifier = await encrypt({ check: 'mapa-workspace' }, key);
    await setDoc(doc(db, 'workspace', 'config'), {
      salt,
      verifierData: verifier.encryptedData,
      verifierIv: verifier.iv,
      createdAt: Date.now(),
    });
    setWorkspaceKey(key);
    setWorkspaceExists(true);
  }, []);

  const unlockWorkspace = useCallback(async (passphrase: string): Promise<boolean> => {
    const cfg = await getDoc(doc(db, 'workspace', 'config'));
    const data = cfg.data();
    if (!data?.salt) return false;
    const key = await deriveKey(passphrase, data.salt);
    try {
      await decrypt(data.verifierData, data.verifierIv, key);
    } catch {
      return false;
    }
    setWorkspaceKey(key);
    return true;
  }, []);

  return (
    <AuthContext.Provider value={{
      user, workspaceKey, workspaceExists, userStatus, loading, isAdmin,
      login, register, logout, resetPassword, setupWorkspace, unlockWorkspace,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
