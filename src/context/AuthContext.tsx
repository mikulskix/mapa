import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  type User,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { generateSalt, deriveKey, encrypt, decrypt, exportKeyRaw, importKeyRaw } from '../lib/crypto';

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

  // Login password held transiently in memory so we can (re)build the
  // envelope that wraps the workspace key with the user's login password.
  const pendingPasswordRef = useRef<string | null>(null);

  const isAdmin = user?.email === ADMIN_EMAIL;

  // Store the workspace key wrapped by the user's login password in their profile.
  const createEnvelope = useCallback(async (uid: string, wk: CryptoKey) => {
    const password = pendingPasswordRef.current;
    if (!password) return;
    const envSalt = generateSalt();
    const loginKey = await deriveKey(password, envSalt);
    const rawWk = await exportKeyRaw(wk);
    const env = await encrypt({ wk: rawWk }, loginKey);
    await setDoc(
      doc(db, 'users', uid, 'profile', 'main'),
      { envSalt, envData: env.encryptedData, envIv: env.iv },
      { merge: true }
    );
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
      pendingPasswordRef.current = password;

      if (status === 'approved') {
        const cfg = await getDoc(doc(db, 'workspace', 'config'));
        setWorkspaceExists(cfg.exists());

        // Try to auto-unlock the workspace key from the user's envelope.
        if (data?.envData && data?.envSalt && data?.envIv) {
          try {
            const loginKey = await deriveKey(password, data.envSalt);
            const unwrapped = (await decrypt(data.envData, data.envIv, loginKey)) as { wk: string };
            const wk = await importKeyRaw(unwrapped.wk);
            setWorkspaceKey(wk);
            pendingPasswordRef.current = null;
          } catch {
            // Envelope stale (e.g. after a password reset) — user will
            // re-enter the base passphrase once on the unlock screen.
          }
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

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
      pendingPasswordRef.current = password;
      if (status === 'approved') {
        const cfg = await getDoc(doc(db, 'workspace', 'config'));
        setWorkspaceExists(cfg.exists());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    setWorkspaceKey(null);
    setWorkspaceExists(null);
    setUserStatus(null);
    pendingPasswordRef.current = null;
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  }, []);

  const setupWorkspace = useCallback(async (passphrase: string) => {
    if (!user) return;
    const salt = generateSalt();
    const key = await deriveKey(passphrase, salt, true);
    const verifier = await encrypt({ check: 'mapa-workspace' }, key);
    await setDoc(doc(db, 'workspace', 'config'), {
      salt,
      verifierData: verifier.encryptedData,
      verifierIv: verifier.iv,
      createdAt: Date.now(),
    });
    await createEnvelope(user.uid, key);
    pendingPasswordRef.current = null;
    setWorkspaceKey(key);
    setWorkspaceExists(true);
  }, [user, createEnvelope]);

  const unlockWorkspace = useCallback(async (passphrase: string): Promise<boolean> => {
    if (!user) return false;
    const cfg = await getDoc(doc(db, 'workspace', 'config'));
    const data = cfg.data();
    if (!data?.salt) return false;
    const key = await deriveKey(passphrase, data.salt, true);
    try {
      await decrypt(data.verifierData, data.verifierIv, key);
    } catch {
      return false;
    }
    await createEnvelope(user.uid, key);
    pendingPasswordRef.current = null;
    setWorkspaceKey(key);
    return true;
  }, [user, createEnvelope]);

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
