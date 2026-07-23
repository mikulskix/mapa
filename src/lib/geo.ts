export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

// Parsuje współrzędne w formacie Google Maps, np. "50.926257, 14.975718".
// Akceptuje separator przecinek lub spację, opcjonalne białe znaki.
// Zwraca { lat, lng } gdy wartości są poprawne i w zakresie, inaczej null.
export function parseCoords(input: string): { lat: number; lng: number } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Rozdziel po przecinku; jeśli brak przecinka, spróbuj po białych znakach
  const parts = (trimmed.includes(',') ? trimmed.split(',') : trimmed.split(/\s+/))
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length !== 2) return null;
  const lat = Number(parts[0]);
  const lng = Number(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}
