// Blokada powiększania całego interfejsu gestem dwóch palców.
//
// Safari na iPhonie świadomie ignoruje ustawienie "user-scalable=no" w HTML,
// więc dodatkowo przechwytujemy jego własne zdarzenia gestów. Mapy to nie
// dotyczy — Leaflet obsługuje dotyk niżej, na zdarzeniach pojedynczych palców,
// i nadal powiększa się normalnie.
//
// Powiększanie podwójnym tapnięciem blokuje już reguła "touch-action"
// w index.css — celowo nie ruszamy tego z poziomu skryptu, bo przechwycenie
// dotknięcia odebrałoby mapie jej własny zoom podwójnym tapnięciem.
export function blockInterfaceZoom(): void {
  const stop = (e: Event) => e.preventDefault();

  // Zdarzenia występują wyłącznie w Safari (iOS/macOS)
  document.addEventListener('gesturestart', stop);
  document.addEventListener('gesturechange', stop);
  document.addEventListener('gestureend', stop);
}
