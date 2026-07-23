import { useState, type FormEvent } from 'react';
import { MARKER_COLORS } from '../lib/types';
import { parseCoords } from '../lib/geo';

interface Props {
  // Współrzędne początkowe (np. z kliknięcia w mapę). Gdy null — tryb ręcznego wpisywania.
  lat: number | null;
  lng: number | null;
  onConfirm: (name: string, description: string, color: string, lat: number, lng: number) => void;
  onCancel: () => void;
}

export default function AddMarkerModal({ lat, lng, onConfirm, onCancel }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string>(MARKER_COLORS[0].value);
  // Pole współrzędnych: wypełnione gdy klik w mapę, puste w trybie ręcznym
  const [coordsText, setCoordsText] = useState(
    lat != null && lng != null ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : ''
  );

  const coords = parseCoords(coordsText);
  const coordsInvalid = coordsText.trim() !== '' && coords === null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !coords) return;
    onConfirm(name.trim(), description.trim(), color, coords.lat, coords.lng);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1100] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm">
        <h2 className="text-lg font-bold mb-4 dark:text-white">Nowa pinezka</h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Współrzędne — edytowalne, można wkleić z Google Maps */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Współrzędne
            </label>
            <input
              value={coordsText}
              onChange={(e) => setCoordsText(e.target.value)}
              placeholder="50.926257, 14.975718"
              inputMode="decimal"
              className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 ${
                coordsInvalid
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
              }`}
            />
            {coordsInvalid && (
              <p className="text-xs text-red-500 mt-1">
                Podaj współrzędne w formacie: szerokość, długość (np. 50.926257, 14.975718)
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nazwa
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Opis (opcjonalnie)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Kolor
            </label>
            <div className="flex flex-wrap gap-2">
              {MARKER_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${
                    color === c.value ? 'border-gray-800 dark:border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={!name.trim() || !coords}
              className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Dodaj
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
