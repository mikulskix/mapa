import { useState, useMemo, lazy, Suspense } from 'react';
import type { MarkerData, MarkerFormData } from '../lib/types';
import { MARKER_COLORS } from '../lib/types';
import { exportCsv } from '../lib/csv';
import type { BackupInfo } from '../hooks/useMarkers';
import type { CategoryMap } from '../hooks/useCategories';

// Modale doładowywane dopiero przy otwarciu (nie obciążają startu aplikacji)
const CsvImportModal = lazy(() => import('./CsvImportModal'));
const BackupModal = lazy(() => import('./BackupModal'));

interface Props {
  markers: MarkerData[];
  isAdmin: boolean;
  selectedId: string | null;
  onSelectMarker: (marker: MarkerData) => void;
  onImport: (markers: MarkerFormData[]) => Promise<{ added: number; skipped: number }>;
  onRemoveAll: () => Promise<void>;
  onCreateBackup: () => Promise<string | undefined>;
  onListBackups: () => Promise<BackupInfo[]>;
  onRestoreBackup: (id: string) => Promise<void>;
  onNavigateTo: (marker: MarkerData) => void;
  // Mapa kolor → nazwa kategorii (z Firestore)
  categories: CategoryMap;
  // Kolory aktualnie ukryte (nie wyświetlane na mapie i liście)
  hiddenColors: Set<string>;
  // Callback do przełączania widoczności danego koloru
  onToggleColor: (color: string) => void;
}

export default function Sidebar({
  markers,
  isAdmin,
  selectedId,
  onSelectMarker,
  onImport,
  onRemoveAll,
  onCreateBackup,
  onListBackups,
  onRestoreBackup,
  onNavigateTo,
  categories,
  hiddenColors,
  onToggleColor,
}: Props) {
  const [showImport, setShowImport] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [search, setSearch] = useState('');
  // Czy panel filtrów jest rozwinięty
  const [showFilters, setShowFilters] = useState(false);

  // Wyznacz kolory, które faktycznie są używane przez jakiekolwiek pinezki
  const usedColors = useMemo(() => {
    const used = new Set<string>();
    for (const m of markers) {
      if (m.color) used.add(m.color);
    }
    return used;
  }, [markers]);

  // Sprawdź czy są aktywne filtry (cokolwiek ukryte)
  const hasActiveFilters = hiddenColors.size > 0;

  // Filtruj listę: najpierw po ukrytych kolorach, potem po wyszukiwarce
  const filtered = useMemo(() => {
    let result = markers.filter((m) => !hiddenColors.has(m.color));
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) => m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)
      );
    }
    return result;
  }, [markers, hiddenColors, search]);

  // Liczba widocznych (po filtrach, bez wyszukiwania)
  const visibleCount = useMemo(
    () => markers.filter((m) => !hiddenColors.has(m.color)).length,
    [markers, hiddenColors]
  );

  async function handleRemoveAll() {
    if (!confirm('Na pewno usunąć WSZYSTKIE pinezki? Tej operacji nie można cofnąć (chyba że przywrócisz backup).')) return;
    await onRemoveAll();
  }

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-sm text-gray-800 dark:text-white mb-2">
            Pinezki ({visibleCount}/{markers.length})
          </h2>

          {/* Wyszukiwarka */}
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

          {/* Przycisk filtrów kategorii */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`w-full mb-2 flex items-center justify-between px-2 py-1.5 text-xs rounded-md border transition-colors ${
              hasActiveFilters
                ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300'
            }`}
          >
            <span className="flex items-center gap-1.5">
              {/* Ikona lejka (filtr) */}
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18l-7 9v5l-4 2v-7L3 4z" />
              </svg>
              Filtruj kategorie
              {hasActiveFilters && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] leading-none">
                  {hiddenColors.size} ukryte
                </span>
              )}
            </span>
            <svg
              className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Panel filtrów — rozwijany */}
          {showFilters && (
            <div className="mb-2 rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 px-2 py-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Kategorie
                </span>
                {/* Przycisk "pokaż wszystkie" — aktywny tylko gdy coś ukryte */}
                {hasActiveFilters && (
                  <button
                    onClick={() => {
                      // Odznacz wszystkie ukryte (wywołaj toggle dla każdego ukrytego koloru)
                      for (const color of hiddenColors) {
                        onToggleColor(color);
                      }
                    }}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Pokaż wszystkie
                  </button>
                )}
              </div>

              {/* Lista kolorów z checkboxami */}
              <div className="space-y-1">
                {MARKER_COLORS.map((c) => {
                  // Pomiń kolory, których nie ma żadna pinezka
                  if (!usedColors.has(c.value)) return null;
                  const isVisible = !hiddenColors.has(c.value);
                  // Nazwa kategorii z Firestore lub domyślna nazwa koloru
                  const label = categories[c.value] || c.name;
                  // Ile pinezek tego koloru
                  const count = markers.filter((m) => m.color === c.value).length;

                  return (
                    <label
                      key={c.value}
                      className="flex items-center gap-2 cursor-pointer select-none py-0.5"
                    >
                      <input
                        type="checkbox"
                        checked={isVisible}
                        onChange={() => onToggleColor(c.value)}
                        className="rounded border-gray-300 dark:border-gray-500 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                      />
                      {/* Kolorowa kropka */}
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: c.value }}
                      />
                      {/* Nazwa kategorii */}
                      <span className={`text-xs flex-1 ${isVisible ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500 line-through'}`}>
                        {label}
                      </span>
                      {/* Liczba pinezek */}
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">
                        {count}
                      </span>
                    </label>
                  );
                })}

                {/* Gdy brak pinezek z żadnym kolorem */}
                {usedColors.size === 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 py-1">
                    Brak pinezek do filtrowania.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Przyciski akcji */}
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
            {isAdmin && (
              <button
                onClick={handleRemoveAll}
                disabled={markers.length === 0}
                className="flex-1 px-2 py-1 text-xs rounded-md bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 disabled:opacity-50"
              >
                Usuń wszystkie
              </button>
            )}
          </div>
        </div>

        {/* Lista pinezek */}
        <div className="flex-1 overflow-y-auto">
          {markers.length === 0 ? (
            <p className="p-4 text-sm text-gray-500 dark:text-gray-400">
              Brak pinezek. Kliknij + na mapie, aby dodać nowy punkt.
            </p>
          ) : filtered.length === 0 ? (
            <p className="p-4 text-sm text-gray-500 dark:text-gray-400">
              {search ? `Brak wyników dla "${search}"` : 'Wszystkie pinezki są ukryte. Zmień filtry kategorii.'}
            </p>
          ) : (
            <ul>
              {filtered.map((m) => {
                // Nazwa kategorii dla tej pinezki (lub brak)
                const categoryName = categories[m.color];

                return (
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
                      <p className="text-sm text-gray-800 dark:text-white leading-tight truncate">
                        {m.name}{' '}
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">
                          {m.lat.toFixed(4)}, {m.lng.toFixed(4)}
                        </span>
                      </p>
                      {/* Nazwa kategorii (jeśli ustawiona) */}
                      {categoryName && (
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight truncate">
                          {categoryName}
                        </p>
                      )}
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
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {showImport && (
        <Suspense fallback={null}><CsvImportModal
          onImport={onImport}
          onClose={() => setShowImport(false)}
        /></Suspense>
      )}

      {showBackup && (
        <Suspense fallback={null}><BackupModal
          isAdmin={isAdmin}
          onClose={() => setShowBackup(false)}
          onCreateBackup={onCreateBackup}
          onListBackups={onListBackups}
          onRestoreBackup={onRestoreBackup}
        /></Suspense>
      )}
    </>
  );
}
