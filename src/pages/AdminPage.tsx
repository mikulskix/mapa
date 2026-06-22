import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Navigate, Link } from 'react-router-dom';

interface RegisteredUser {
  uid: string;
  email: string;
  status: string;
  createdAt: number;
}

export default function AdminPage() {
  const { isAdmin, user } = useAuth();
  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, 'registrations'));
      const list: RegisteredUser[] = [];

      for (const d of snap.docs) {
        const data = d.data();
        if (data.email !== user?.email) {
          list.push({
            uid: d.id,
            email: data.email || 'brak',
            status: data.status || 'pending',
            createdAt: data.createdAt || 0,
          });
        }
      }

      list.sort((a, b) => b.createdAt - a.createdAt);
      setUsers(list);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin, fetchUsers]);

  async function handleApprove(uid: string) {
    await updateDoc(doc(db, 'registrations', uid), { status: 'approved' });
    await updateDoc(doc(db, 'users', uid, 'profile', 'main'), { status: 'approved' });
    setUsers((prev) => prev.map((u) => u.uid === uid ? { ...u, status: 'approved' } : u));
  }

  async function handleRevoke(uid: string) {
    await updateDoc(doc(db, 'registrations', uid), { status: 'pending' });
    await updateDoc(doc(db, 'users', uid, 'profile', 'main'), { status: 'pending' });
    setUsers((prev) => prev.map((u) => u.uid === uid ? { ...u, status: 'pending' } : u));
  }

  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold dark:text-white">Panel administratora</h1>
        <Link to="/" className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300">
          Wróć do mapy
        </Link>
      </header>

      <div className="max-w-2xl mx-auto p-4">
        <h2 className="text-lg font-semibold mb-4 dark:text-white">
          Użytkownicy ({users.length})
        </h2>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">Brak zarejestrowanych użytkowników.</p>
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <div
                key={u.uid}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 flex items-center justify-between shadow-sm"
              >
                <div>
                  <p className="font-medium text-sm dark:text-white">{u.email}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(u.createdAt).toLocaleDateString('pl-PL')} &middot;{' '}
                    <span className={u.status === 'approved' ? 'text-green-600' : 'text-amber-600'}>
                      {u.status === 'approved' ? 'Zatwierdzony' : 'Oczekujący'}
                    </span>
                  </p>
                </div>

                {u.status === 'pending' ? (
                  <button
                    onClick={() => handleApprove(u.uid)}
                    className="px-3 py-1.5 text-sm rounded-md bg-green-600 text-white hover:bg-green-700"
                  >
                    Zatwierdź
                  </button>
                ) : (
                  <button
                    onClick={() => handleRevoke(u.uid)}
                    className="px-3 py-1.5 text-sm rounded-md bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50"
                  >
                    Cofnij
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
