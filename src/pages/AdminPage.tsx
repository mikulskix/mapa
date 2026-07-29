import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { MARKER_COLORS } from '../lib/types';
import { useCategories } from '../hooks/useCategories';
import type { CategoryMap } from '../hooks/useCategories';

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

  // --- Kategorie kolorów ---
  const { categories, loading: catLoading, saveCategories } = useCategories();
  // Lokalna kopia kategorii do edycji (przed zapisem)
  const [localCategories, setLocalCategories] = useState<CategoryMap>({});
  const [catSaving, setCatSaving] = useState(false);
  const [catSaved, setCatSaved] = useState(false);
  // Formularz dodawania nowej kategorii (wybrany kolor + nazwa)
  const [newColor, setNewColor] = useState<string>('');
  const [newName, setNewName] = useState('');

  // Zainicjuj lokalną kopię raz po pierwszym załadowaniu z Firestore
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!catLoading && !initializedRef.current) {
      initializedRef.current = true;
      setLocalCategories({ ...categories });
    }
  }, [catLoading, categories]);

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

  async function handleReject(uid: string) {
    await updateDoc(doc(db, 'registrations', uid), { status: 'rejected' });
    await updateDoc(doc(db, 'users', uid, 'profile', 'main'), { status: 'rejected' });
    setUsers((prev) => prev.map((u) => u.uid === uid ? { ...u, status: 'rejected' } : u));
  }

  // Zapisz kategorie do Firestore
  async function handleSaveCategories() {
    setCatSaving(true);
    try {
      await saveCategories(localCategories);
      setCatSaved(true);
      // Ukryj komunikat po 2 sekundach
      setTimeout(() => setCatSaved(false), 2000);
    } finally {
      setCatSaving(false);
    }
  }

  // Dodaj nową kategorię do lokalnej kopii (zapis do bazy dopiero po "Zapisz")
  function handleAddCategory() {
    if (!newColor || !newName.trim()) return;
    setLocalCategories((prev) => ({ ...prev, [newColor]: newName.trim() }));
    setNewColor('');
    setNewName('');
  }

  // Usuń kategorię — kasujemy tylko wpis nazwy dla danego koloru.
  // Pinezki z tym kolorem zostają nietknięte (stają się "bez kategorii").
  function handleDeleteCategory(color: string) {
    setLocalCategories((prev) => {
      const next = { ...prev };
      delete next[color];
      return next;
    });
  }

  if (!isAdmin) return <Navigate to="/" replace />;

  // Kolory palety jeszcze nieprzypisane do żadnej kategorii — dostępne do dodania
  const availableColors = MARKER_COLORS.filter((c) => !(c.value in localCategories));

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold dark:text-white">Panel administratora</h1>
        <Link to="/" className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300">
          Wróć do mapy
        </Link>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-8">

        {/* ---- Sekcja kategorii ---- */}
        <section>
          <h2 className="text-lg font-semibold mb-1 dark:text-white">Kategorie kolorów</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Nadaj nazwy kolorom pinezek — są widoczne dla wszystkich w liście i filtrach.
            Usunięcie kategorii nie kasuje pinezek: tracą tylko przypisaną nazwę.
          </p>

          {catLoading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              {/* Lista istniejących kategorii */}
              {availableColors.length === MARKER_COLORS.length ? (
                <p className="px-4 py-4 text-sm text-gray-400 dark:text-gray-500">
                  Brak kategorii. Dodaj pierwszą poniżej.
                </p>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {/* Iterujemy po palecie, pokazując tylko kolory z przypisaną nazwą */}
                  {MARKER_COLORS.filter((c) => c.value in localCategories).map((c) => (
                    <div key={c.value} className="flex items-center gap-2 px-3 py-2.5">
                      {/* Kolorowa kropka */}
                      <span
                        className="shrink-0 w-5 h-5 rounded-full border border-gray-200 dark:border-gray-600"
                        style={{ backgroundColor: c.value }}
                      />
                      {/* Pole nazwy kategorii — min-w-0 pozwala mu się kurczyć na wąskim ekranie */}
                      <input
                        type="text"
                        value={localCategories[c.value] ?? ''}
                        onChange={(e) =>
                          setLocalCategories((prev) => ({ ...prev, [c.value]: e.target.value }))
                        }
                        placeholder={c.name}
                        className="flex-1 min-w-0 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {/* Usuń kategorię (kosz) */}
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(c.value)}
                        title="Usuń kategorię"
                        className="shrink-0 p-1.5 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Dodawanie nowej kategorii (dostępne, dopóki są wolne kolory palety) */}
              {availableColors.length > 0 && (
                <div className="border-t border-gray-100 dark:border-gray-700 px-3 py-3">
                  <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    Dodaj kategorię
                  </p>
                  {/* Wybór koloru spośród nieużytych */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {availableColors.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setNewColor(c.value)}
                        title={c.name}
                        className={`w-7 h-7 rounded-full border-2 transition-transform ${
                          newColor === c.value ? 'border-gray-800 dark:border-white scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c.value }}
                      />
                    ))}
                  </div>
                  {/* Nazwa + przycisk dodania */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); } }}
                      placeholder="Nazwa kategorii"
                      className="flex-1 min-w-0 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      disabled={!newColor || !newName.trim()}
                      className="shrink-0 px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      Dodaj
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Przycisk zapisu + komunikat sukcesu */}
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={handleSaveCategories}
              disabled={catSaving || catLoading}
              className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {catSaving ? 'Zapisywanie…' : 'Zapisz kategorie'}
            </button>
            {catSaved && (
              <span className="text-sm text-green-600 dark:text-green-400">
                ✓ Zapisano
              </span>
            )}
          </div>
        </section>

        {/* ---- Sekcja użytkowników ---- */}
        <section>
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
                      <span className={
                        u.status === 'approved' ? 'text-green-600'
                        : u.status === 'rejected' ? 'text-red-600'
                        : 'text-amber-600'
                      }>
                        {u.status === 'approved' ? 'Zatwierdzony'
                          : u.status === 'rejected' ? 'Odrzucony'
                          : 'Oczekujący'}
                      </span>
                    </p>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    {u.status !== 'approved' && (
                      <button
                        onClick={() => handleApprove(u.uid)}
                        className="px-3 py-1.5 text-sm rounded-md bg-green-600 text-white hover:bg-green-700"
                      >
                        Zatwierdź
                      </button>
                    )}
                    {u.status === 'pending' && (
                      <button
                        onClick={() => handleReject(u.uid)}
                        className="px-3 py-1.5 text-sm rounded-md bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                      >
                        Odrzuć
                      </button>
                    )}
                    {u.status === 'approved' && (
                      <button
                        onClick={() => handleRevoke(u.uid)}
                        className="px-3 py-1.5 text-sm rounded-md bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50"
                      >
                        Cofnij
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
