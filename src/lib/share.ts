import type { MarkerData } from './types';

// Wynik próby udostępnienia — UI na tej podstawie pokazuje komunikat.
// 'shared'   - poszło przez systemowe menu udostępniania (telefon)
// 'copied'   - skopiowane do schowka (komputer / brak wsparcia dla share)
// 'cancelled'- użytkownik zamknął menu udostępniania
// 'failed'   - nic nie zadziałało (np. przeglądarka blokuje schowek)
export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed';

// Link otwierający punkt w Google Maps (na telefonie przejmie go aplikacja GM).
export function googleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

// Tekst wysyłany/kopiowany: nazwa, opcjonalny opis, współrzędne i link.
export function buildShareText(marker: MarkerData): string {
  const lines = [marker.name];
  if (marker.description?.trim()) lines.push(marker.description.trim());
  lines.push(`${marker.lat.toFixed(6)}, ${marker.lng.toFixed(6)}`);
  lines.push(googleMapsUrl(marker.lat, marker.lng));
  return lines.join('\n');
}

// Kopiowanie do schowka z zapasową metodą dla starszych przeglądarek.
async function copyToClipboard(text: string): Promise<boolean> {
  // Nowoczesne API — wymaga HTTPS (produkcja i localhost je mają)
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // np. brak uprawnień — spróbuj metody zapasowej
    }
  }

  // Metoda zapasowa: ukryte pole tekstowe + komenda kopiowania
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

// Udostępnia pinezkę: na telefonie systemowe menu, w innym razie schowek.
export async function shareMarker(marker: MarkerData): Promise<ShareResult> {
  const text = buildShareText(marker);

  if (navigator.share) {
    try {
      await navigator.share({ title: marker.name, text });
      return 'shared';
    } catch (err) {
      // Zamknięcie menu przez użytkownika to nie błąd
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
      // Inny problem — spadamy do schowka
    }
  }

  return (await copyToClipboard(text)) ? 'copied' : 'failed';
}
