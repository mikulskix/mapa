import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';

interface Props {
  onClose: () => void;
}

export default function ChangePassphraseModal({ onClose }: Props) {
  const { changeWorkspacePassphrase } = useAuth();
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (newPass.length < 8) {
      setError('Nowe hasło bazy musi mieć co najmniej 8 znaków');
      return;
    }
    if (newPass !== confirm) {
      setError('Nowe hasła nie są identyczne');
      return;
    }
    if (newPass === oldPass) {
      setError('Nowe hasło musi różnić się od obecnego');
      return;
    }
    setBusy(true);
    const result = await changeWorkspacePassphrase(oldPass, newPass);
    setBusy(false);
    if (result === 'ok') {
      setDone(true);
    } else if (result === 'wrong-old') {
      setError('Obecne hasło bazy jest nieprawidłowe');
    } else {
      setError('Wystąpił błąd podczas zmiany hasła');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1100] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-4 dark:text-white">Zmień hasło bazy</h2>

        {done ? (
          <>
            <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 text-center mb-2">
              Hasło bazy zostało zmienione, a pinezki przepisane na nowy klucz.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-5">
              Przekaż nowe hasło zatwierdzonym użytkownikom — przy następnym logowaniu wpiszą je raz. Ty również podasz je raz po następnym zalogowaniu.
            </p>
            <button
              onClick={onClose}
              className="w-full py-2 px-4 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-sm"
            >
              Zamknij
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Wszystkie pinezki zostaną przepisane na nowy klucz. Operacja może chwilę potrwać przy dużej bazie.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Obecne hasło bazy</label>
              <input
                type="password"
                required
                autoFocus
                value={oldPass}
                onChange={(e) => setOldPass(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nowe hasło bazy</label>
              <input
                type="password"
                required
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Powtórz nowe hasło</label>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="px-4 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 disabled:opacity-50"
              >
                Anuluj
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {busy ? 'Przepisuję pinezki...' : 'Zmień hasło'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
