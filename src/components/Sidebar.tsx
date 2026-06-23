import { useState, useMemo } from 'react';
import type { MarkerData, MarkerFormData } from '../lib/types';
import { exportCsv } from '../lib/csv';
import CsvImportModal from './CsvImportModal';
import BackupModal from './BackupModal';
import type { BackupInfo } from '../hooks/useMarkers';

interface Props {
  markers: MarkerData[];
  selectedId: string | null;
  onSelectMarker: (marker: MarkerData) => void;
  onImport: (markers: MarkerFormData[]) => Promise<{ added: number; skipped: number }>;
  onRemoveAll: () => Promise<void>;
  onCreateBackup: () => Promise<string | undefined>;
  onListBackups: () => Promise<BackupInfo[]>;
  onRestoreBackup: (id: string) => Promise<void>;
  onNavigateTo: (marker: MarkerData) => void;
}

export default function Sidebar({ markers, selectedId, onSelectMarker, onImport, onRemoveAll, onCreateBackup, onListBackups, onRestoreBackup, onNavigateTo }: Props) {
  const [showImport, setShowImport] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return markers;
    const q = search.toLowerCase();
    return markers.filter(
      (m) => m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)
    );
  }, [markers, search]);

  async function handleRemoveAll() {
    if (!confirm('Na pewno usunąć WSZYSTKIE pinezki? Tej operacji nie można cofnąć (chyba że przywrócisz backup).')) return;
    await onRemoveAll();
  }

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-sm text-gray-800 dark:text-white mb-2">
            Pinezki ({markers.length})
          </h2>

          <div className="relative mb-2">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Szukaj pinezki..."
              className="w-full pl-8 pr-7 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <div className="flex gap-1.5 mb-1.5">
            <button
              onClick={() => setShowImport(true)}
              className="flex-1 px-2 py-1 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700"
            >
              Importuj CSV
            </button>
            <button
              onClick={() => exportCsv(markers)}
              disabled={markers.length === 0}
              className="flex-1 px-2 py-1 text-xs rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 disabled:opacity-50"
            >
              Eksportuj CSV
            </button>
          </div>

          <div className="flex gap-1.5">
            <button
              onClick={() => setShowBackup(true)}
              className="flex-1 px-2 py-1 text-xs rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
            >
              Backupy
            </button>
            <button
              onClick={handleRemoveAll}
              disabled={markers.length === 0}
              className="flex-1 px-2 py-1 text-xs rounded-md bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 disabled:opacity-50"
            >
              Usuń wszystkie
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {markers.length === 0 ? (
            <p className="p-4 text-sm text-gray-500 dark:text-gray-400">
              Brak pinezek. Kliknij + na mapie, aby dodać nowy punkt.
            </p>
          ) : filtered.length === 0 ? (
            <p className="p-4 text-sm text-gray-500 dark:text-gray-400">
              Brak wyników dla "{search}"
            </p>
          ) : (
            <ul>
              {filtered.map((m) => (
                <li
                  key={m.id}
                  className={`px-3 py-1.5 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2 ${
                    selectedId === m.id
                      ? 'bg-blue-100 dark:bg-blue-900/40 border-l-4 border-l-blue-500'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <span
                    className="shrink-0 w-2.5 h-2.5 rounded-full cursor-pointer"
                    style={{ backgroundColor: m.color || '#ef4444' }}
                    onClick={() => onSelectMarker(m)}
                  />
                  <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onSelectMarker(m)}>
                    <p className="text-sm text-gray-800 dark:text-white leading-tight truncate">{m.name} <span className="text-[10px] text-gray-400 dark:text-gray-500">{m.lat.toFixed(4)}, {m.lng.toFixed(4)}</span></p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onNavigateTo(m); }}
                    className="shrink-0 p-1.5 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                    title="Nawiguj"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {showImport && (
        <CsvImportModal
          onImport={onImport}
          onClose={() => setShowImport(false)}
        />
      )}

      {showBackup && (
        <BackupModal
          onClose={() => setShowBackup(false)}
          onCreateBackup={onCreateBackup}
          onListBackups={onListBackups}
          onRestoreBackup={onRestoreBackup}
        />
      )}
    </>
  );
}
