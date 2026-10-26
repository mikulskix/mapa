import { useState } from 'react';
import { useMap, useMapEvent } from 'react-leaflet';
import type { MarkerData, MarkerFormData } from '../lib/types';
import { MARKER_COLORS } from '../lib/types';
import { parseCoords } from '../lib/geo';
import { shareMarker } from '../lib/share';

interface Props {
  marker: MarkerData;
  onUpdate: (id: string, data: MarkerFormData) => void;
  onDelete: (id: string) => void;
  onNavigate: (marker: MarkerData) => void;
  // Informuje mapę, że trwa edycja (wtedy klik w mapę nie zamyka popupu)
  onEditingChange?: (editing: boolean) => void;
}

export default function MarkerPopup({ marker, onUpdate, onDelete, onNavigate, onEditingChange }: Props) {
  const map = useMap();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(marker.name);
  const [description, setDescription] = useState(marker.description);
  const [color, setColor] = useState(marker.color || '#ef4444');
  // Edytowalne współrzędne (format Google, np. "50.926257, 14.975718")
  const [coordsText, setCoordsText] = useState(`${marker.lat.toFixed(6)}, ${marker.lng.toFixed(6)}`);

  // Krótki komunikat po udostępnieniu (np. "Skopiowano")
  const [shareMsg, setShareMsg] = useState('');

  const coords = parseCoords(coordsText);
  const coordsInvalid = coordsText.trim() !== '' && coords === null;

  function startEdit() {
    setEditing(true);
    onEditingChange?.(true);
  }

  // Wyjście z edycji z porzuceniem zmian — używane przez „Anuluj" i krzyżyk popupu
  function cancelEdit() {
    setName(marker.name);
    setDescription(marker.description);
    setColor(marker.color || '#ef4444');
    setCoordsText(`${marker.lat.toFixed(6)}, ${marker.lng.toFixed(6)}`);
    setEditing(false);
    onEditingChange?.(false);
  }

  // Zamknięcie popupu (krzyżyk) traktujemy jak „Anuluj"
  useMapEvent('popupclose', () => {
    if (editing) cancelEdit();
  });

  // Udostępnia punkt: na telefonie systemowe menu, na komputerze schowek
  async function handleShare() {
    const result = await shareMarker(marker);
    if (result === 'cancelled') return;
    setShareMsg(
      result === 'copied' ? 'Skopiowano do schowka'
        : result === 'failed' ? 'Nie udało się udostępnić'
        : ''
    );
    if (result !== 'shared') setTimeout(() => setShareMsg(''), 2500);
  }

  function handleSave() {
    if (!name.trim() || !coords) return;
    onUpdate(marker.id, {
      name: name.trim(),
      description: description.trim(),
      color,
      lat: coords.lat,
      lng: coords.lng,
    });
    setEditing(false);
    onEditingChange?.(false);
  }

  function handleDelete() {
    if (confirm('Usunąć tę pinezkę?')) {
      onDelete(marker.id);
    }
  }

  if (editing) {
    return (
      <div className="min-w-[220px]">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nazwa"
          className="w-full px-2 py-1 mb-1 border border-gray-300 rounded text-sm"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Opis"
          rows={2}
          className="w-full px-2 py-1 mb-2 border border-gray-300 rounded text-sm resize-none"
        />
        {/* Współrzędne — edytowalne, format z Google Maps */}
        <input
          value={coordsText}
          onChange={(e) => setCoordsText(e.target.value)}
          placeholder="50.926257, 14.975718"
          inputMode="decimal"
          className={`w-full px-2 py-1 mb-1 border rounded text-sm ${
            coordsInvalid ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {coordsInvalid && (
          <p className="text-xs text-red-500 mb-1">Błędne współrzędne (np. 50.926257, 14.975718)</p>
        )}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {MARKER_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setColor(c.value)}
              className={`w-6 h-6 rounded-full border-2 ${
                color === c.value ? 'border-gray-800 scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: c.value }}
            />
          ))}
        </div>
        <div className="flex gap-1">
          <button
            onClick={handleSave}
            disabled={!name.trim() || !coords}
            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Zapisz
          </button>
          <button
            onClick={cancelEdit}
            className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
          >
            Anuluj
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-[200px]">
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: marker.color || '#ef4444' }} />
        <h3 className="font-bold text-sm">{marker.name}</h3>
      </div>
      {marker.description && (
        <p className="text-sm text-gray-600 mt-1">{marker.description}</p>
      )}
      <p className="text-xs text-gray-400 mt-1">
        {marker.lat.toFixed(5)}, {marker.lng.toFixed(5)}
      </p>
      <div className="flex gap-1 mt-2 flex-wrap">
        <button
          onClick={() => { map.closePopup(); onNavigate(marker); }}
          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
        >
          Nawiguj
        </button>
        <button
          onClick={startEdit}
          className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
        >
          Edytuj
        </button>
        <button
          onClick={handleShare}
          className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
        >
          Udostępnij
        </button>
        <button
          onClick={handleDelete}
          className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200"
        >
          Usuń
        </button>
      </div>
      {shareMsg && (
        <p className="text-xs text-green-700 mt-1">{shareMsg}</p>
      )}
    </div>
  );
}
