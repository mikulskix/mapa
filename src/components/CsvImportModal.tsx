import { useState, useRef } from 'react';
import { parseCsv } from '../lib/csv';
import type { MarkerFormData } from '../lib/types';

interface Props {
  onImport: (markers: MarkerFormData[]) => Promise<{ added: number; skipped: number }>;
  onClose: () => void;
}

export default function CsvImportModal({ onImport, onClose }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<{ valid: MarkerFormData[]; invalidCount: number } | null>(null);
  const [result, setResult] = useState<{ added: number; skipped: number } | null>(null);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);

  async function handleFile(file: File) {
    setError('');
    setResult(null);
    try {
      const r = await parseCsv(file);
      if (r.valid.length === 0) {
        setError('Plik nie zawiera prawidłowych wierszy. Wymagane kolumny: name, latitude, longitude');
        return;
      }
      setParsed(r);
    } catch {
      setError('Nie udało się odczytać pliku CSV');
    }
  }

  async function handleConfirm() {
    if (!parsed) return;
    setImporting(true);
    try {
      const r = await onImport(parsed.valid);
      setResult(r);
      if (r.added === 0 && r.skipped > 0) {
        // all duplicates, don't close
      } else {
        setTimeout(onClose, 1500);
      }
    } catch {
      setError('Błąd podczas importu');
    }
    setImporting(false);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1100] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-4 dark:text-white">Importuj CSV</h2>

        {result ? (
          <div className="text-sm">
            {result.added > 0 && (
              <p className="text-green-700 dark:text-green-400">
                Dodano <strong>{result.added}</strong> nowych pinezek.
              </p>
            )}
            {result.skipped > 0 && (
              <p className="text-amber-600 dark:text-amber-400 mt-1">
                Pominięto <strong>{result.skipped}</strong> duplikatów (ta sama nazwa i współrzędne).
              </p>
            )}
            {result.added === 0 && result.skipped > 0 && (
              <p className="text-gray-500 dark:text-gray-400 mt-2 text-xs">
                Wszystkie pinezki z pliku już istnieją.
              </p>
            )}
          </div>
        ) : !parsed ? (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Plik CSV powinien zawierać kolumny: <strong>name</strong>, <strong>latitude</strong>, <strong>longitude</strong>.
              Kolumna <strong>description</strong> jest opcjonalna. Duplikaty (ta sama nazwa + współrzędne) zostaną pominięte.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-400"
            />
          </>
        ) : (
          <div className="text-sm">
            <p className="text-green-700 dark:text-green-400">
              Znaleziono <strong>{parsed.valid.length}</strong> prawidłowych punktów.
            </p>
            {parsed.invalidCount > 0 && (
              <p className="text-amber-600 dark:text-amber-400 mt-1">
                Pominięto <strong>{parsed.invalidCount}</strong> nieprawidłowych wierszy.
              </p>
            )}
          </div>
        )}

        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
          >
            {result ? 'Zamknij' : 'Anuluj'}
          </button>
          {parsed && !result && (
            <button
              onClick={handleConfirm}
              disabled={importing}
              className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {importing ? 'Importuję...' : 'Importuj'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
