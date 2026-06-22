import { useState, useEffect } from 'react';
import type { BackupInfo } from '../hooks/useMarkers';

interface Props {
  onClose: () => void;
  onCreateBackup: () => Promise<string | undefined>;
  onListBackups: () => Promise<BackupInfo[]>;
  onRestoreBackup: (id: string) => Promise<void>;
}

export default function BackupModal({ onClose, onCreateBackup, onListBackups, onRestoreBackup }: Props) {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    onListBackups().then((list) => {
      setBackups(list);
      setLoading(false);
    });
  }, [onListBackups]);

  async function handleCreate() {
    setCreating(true);
    setMessage('');
    try {
      await onCreateBackup();
      const list = await onListBackups();
      setBackups(list);
      setMessage('Backup utworzony');
    } catch {
      setMessage('Błąd tworzenia backupu');
    }
    setCreating(false);
  }

  async function handleRestore(id: string) {
    if (!confirm('Przywrócić ten backup? Obecne pinezki zostaną zastąpione.')) return;
    setRestoring(id);
    setMessage('');
    try {
      await onRestoreBackup(id);
      setMessage('Backup przywrócony');
    } catch {
      setMessage('Błąd przywracania backupu');
    }
    setRestoring(null);
  }

  function formatDate(ts: number) {
    return new Date(ts).toLocaleString('pl-PL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1100] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md max-h-[80vh] flex flex-col">
        <h2 className="text-lg font-bold mb-4 dark:text-white">Backupy</h2>

        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Backup tworzony automatycznie raz dziennie. Możesz też utworzyć ręcznie.
        </p>

        <button
          onClick={handleCreate}
          disabled={creating}
          className="w-full px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 mb-4"
        >
          {creating ? 'Tworzę...' : 'Utwórz backup teraz'}
        </button>

        {message && (
          <p className={`text-sm mb-3 ${message.includes('Błąd') ? 'text-red-600' : 'text-green-600'}`}>
            {message}
          </p>
        )}

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            </div>
          ) : backups.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              Brak backupów
            </p>
          ) : (
            <ul className="space-y-2">
              {backups.map((b) => (
                <li key={b.id} className="flex items-center justify-between border border-gray-200 dark:border-gray-600 rounded-md px-3 py-2">
                  <div>
                    <p className="text-sm font-medium dark:text-white">{formatDate(b.createdAt)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{b.markerCount} pinezek</p>
                  </div>
                  <button
                    onClick={() => handleRestore(b.id)}
                    disabled={restoring === b.id}
                    className="px-3 py-1 text-xs rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {restoring === b.id ? 'Przywracam...' : 'Przywróć'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full px-4 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
        >
          Zamknij
        </button>
      </div>
    </div>
  );
}
