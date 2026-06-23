import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { generateSalt, deriveKey } from '../lib/crypto';

export type UserStatus = 'pending' | 'approved' | 'rejected' | null;

interface AuthContextType {
  user: User | null;
  cryptoKey: CryptoKey | null;
  userStatus: UserStatus;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || '';

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [userStatus, setUserStatus] = useState<UserStatus>(null);
  const [loading, setLoading] = useState(false);

  const isAdmin = user?.email === ADMIN_EMAIL;

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const profileDoc = await getDoc(doc(db, 'users', cred.user.uid, 'profile', 'main'));
      const data = profileDoc.data();
      const salt = data?.salt;
      if (!salt) throw new Error('Brak profilu użytkownika');

      const status = data?.status as UserStatus || 'pending';
      const key = await deriveKey(password, salt);
      setUser(cred.user);
      setCryptoKey(key);
      setUserStatus(status);
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const salt = generateSalt();
      const isAdminUser = email === ADMIN_EMAIL;
      const now = Date.now();
      const status = isAdminUser ? 'approved' : 'pending';
      await setDoc(doc(db, 'users', cred.user.uid, 'profile', 'main'), {
        salt,
        email,
        status,
        createdAt: now,
      });
      await setDoc(doc(db, 'registrations', cred.user.uid), {
        email,
        status,
        createdAt: now,
      });
      const key = await deriveKey(password, salt);
      setUser(cred.user);
      setCryptoKey(key);
      setUserStatus(isAdminUser ? 'approved' : 'pending');
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    setCryptoKey(null);
    setUserStatus(null);
    localStorage.removeItem('map-view');
  }, []);

  return (
    <AuthContext.Provider value={{ user, cryptoKey, userStatus, loading, isAdmin, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
