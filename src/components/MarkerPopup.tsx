import { useState } from 'react';
import type { MarkerData, MarkerFormData } from '../lib/types';
import { MARKER_COLORS } from '../lib/types';

interface Props {
  marker: MarkerData;
  onUpdate: (id: string, data: MarkerFormData) => void;
  onDelete: (id: string) => void;
  onNavigate: (marker: MarkerData) => void;
}

export default function MarkerPopup({ marker, onUpdate, onDelete, onNavigate }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(marker.name);
  const [description, setDescription] = useState(marker.description);
  const [color, setColor] = useState(marker.color || '#ef4444');

  function handleSave() {
    if (!name.trim()) return;
    onUpdate(marker.id, {
      name: name.trim(),
      description: description.trim(),
      color,
      lat: marker.lat,
      lng: marker.lng,
    });
    setEditing(false);
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
            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Zapisz
          </button>
          <button
            onClick={() => setEditing(false)}
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
          onClick={() => onNavigate(marker)}
          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
        >
          Nawiguj
        </button>
        <button
          onClick={() => setEditing(true)}
          className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
        >
          Edytuj
        </button>
        <button
          onClick={handleDelete}
          className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200"
        >
          Usuń
        </button>
      </div>
    </div>
  );
}
