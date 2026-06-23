import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';

export default function WorkspaceUnlock() {
  const { workspaceExists, isAdmin, setupWorkspace, unlockWorkspace, logout } = useAuth();
  const [passphrase, setPassphrase] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const setupMode = workspaceExists === false && isAdmin;
  const notReady = workspaceExists === false && !isAdmin;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (setupMode) {
      if (passphrase.length < 8) {
        setError('Hasło bazy musi mieć co najmniej 8 znaków');
        return;
      }
      if (passphrase !== confirm) {
        setError('Hasła nie są identyczne');
        return;
      }
      setBusy(true);
      try {
        await setupWorkspace(passphrase);
      } catch {
        setError('Nie udało się utworzyć bazy');
        setBusy(false);
      }
    } else {
      setBusy(true);
      try {
        const ok = await unlockWorkspace(passphrase);
        if (!ok) {
          setError('Nieprawidłowe hasło bazy');
          setBusy(false);
        }
      } catch {
        setError('Wystąpił błąd. Spróbuj ponownie.');
        setBusy(false);
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="bg-gray-800 rounded-lg shadow-md p-8 w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-2">
          <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <span className="text-sm font-medium tracking-wide text-gray-200" style={{ letterSpacing: '0.05em' }}>
            Direct Navigation System
          </span>
        </div>

        {notReady ? (
          <>
            <h1 className="text-xl font-bold text-center mb-4 text-white">Baza niedostępna</h1>
            <p className="text-gray-400 text-sm text-center mb-6">
              Administrator nie skonfigurował jeszcze wspólnej bazy. Spróbuj ponownie później.
            </p>
            <button
              onClick={logout}
              className="w-full py-2 px-4 rounded-md bg-gray-700 text-gray-300 hover:bg-gray-600 text-sm"
            >
              Wyloguj się
            </button>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-center mb-2 text-white">
              {setupMode ? 'Utwórz hasło bazy' : 'Odblokuj bazę'}
            </h1>
            <p className="text-gray-400 text-sm text-center mb-6">
              {setupMode
                ? 'Ustaw hasło, którym szyfrowana będzie wspólna baza. Przekaż je zatwierdzonym użytkownikom — bez niego nikt nie odczyta danych.'
                : 'Wpisz hasło wspólnej bazy, aby odszyfrować pinezki.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Hasło bazy</label>
                <input
                  type="password"
                  required
                  autoFocus
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {setupMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Powtórz hasło bazy</label>
                  <input
                    type="password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={busy}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {busy ? 'Proszę czekać...' : setupMode ? 'Utwórz bazę' : 'Odblokuj'}
              </button>
            </form>

            <button
              onClick={logout}
              className="mt-4 w-full py-2 px-4 rounded-md text-gray-400 hover:text-gray-200 text-sm"
            >
              Wyloguj się
            </button>
          </>
        )}
      </div>
    </div>
  );
}
