# Mapa — instrukcje projektu

Prywatna aplikacja mapowa (współdzielona baza pinezek terenowych) z nawigacją GPS/kompasem.

## Stack
- **React 19 + TypeScript + Vite 8**, **Tailwind 4**
- **Leaflet / react-leaflet** — mapa
- **Firebase** — Auth (email/hasło) + Firestore (dane)
- **papaparse** — import CSV
- **Cloudflare Turnstile** — anty-bot na formularzach auth

## Uruchamianie
- `npm run dev` — serwer deweloperski (Vite)
- `npm run build` — `tsc -b && vite build` (typecheck + build do `dist/`)
- `npm run lint` — ESLint
- Zmienne środowiskowe: `.env` (wzór w `.env.example`), wszystkie z prefiksem `VITE_`.

## Hosting i deploy
- **GitHub Pages**, live: https://mikulskix.github.io/mapa/ (branch `gh-pages`, serwowany z `/mapa/` — stąd `base: '/mapa/'` w `vite.config.ts`).
- **Auto-deploy KODU**: push na `main` → workflow `.github/workflows/deploy.yml` (build + oficjalny Pages deploy przez OIDC). Zero ręcznego deployu. Workflow odpala tylko `npm run build` (nie `npm run lint`), więc błędy lintu nie blokują deployu.
- **Reguły Firestore deployuje się OSOBNO i RĘCZNIE** — Actions ich NIE dotyka. Po każdej zmianie `firestore.rules` wklej całość w konsoli: https://console.firebase.google.com/project/mapagithub/firestore/rules (zakładka Rules → zaznacz wszystko → wklej → Publish). Project ID: `mapagithub`. Bez tego nowy model danych będzie blokowany mimo udanego deployu strony.
- Zmienne `VITE_*` do builda siedzą w **GitHub Secrets** (nie w repo). To publiczne identyfikatory Firebase/Turnstile — nie sekrety, i tak trafiają do bundla.

### Push / uwierzytelnianie do GitHuba
- `git push origin main` używa tokena zapisanego w **keychainie macOS** (`git credential-osxkeychain`). `gh` CLI bywał rozjechany (nieważny token w keyring, brak klucza SSH).
- Gdy push odmawia auth (`Invalid username or token`): sprawdź `git config --get-all credential.https://github.com.helper` — jeśli wskazuje `!gh auth git-credential`, gh przechwytuje zły token; usuń ten wpis (`git config --global --unset-all credential.https://github.com.helper`), aby git korzystał z globalnego `osxkeychain`. Ewentualnie zapisz świeży token classic (scope `repo`) do keychaina.
- Podgląd statusu Actions bez działającego `gh`: `curl -H "Authorization: Bearer $TOKEN" https://api.github.com/repos/mikulskix/mapa/actions/runs?per_page=1` (token z keychaina przez `git credential fill`).

## Architektura bezpieczeństwa (ważne!)
- **Model współdzielonego workspace**: wszyscy zatwierdzeni użytkownicy widzą tę samą bazę pinezek. Dane pinezek są **szyfrowane po stronie klienta** (AES-GCM 256, klucz z PBKDF2 100k iteracji) — Firestore nigdy nie widzi jawnych danych. Zob. `src/lib/crypto.ts`.
- **Passphrase workspace** ≠ hasło logowania. Klucz workspace jest „opakowany" (envelope) hasłem logowania usera i trzymany w jego profilu → auto-odblokowanie po zalogowaniu (`AuthContext.createEnvelope`).
- **Rejestracja wymaga zatwierdzenia** przez admina (`status: pending → approved/rejected`). Admin = `VITE_ADMIN_EMAIL` (obecnie mikulskix@gmail.com, zahardkodowany też w `firestore.rules`).
- **Reguły Firestore** (`firestore.rules`) są jedyną realną granicą dostępu — klucze Firebase w bundlu są publiczne z założenia. Przy zmianie modelu danych aktualizuj reguły.
- Dbaj o odporność na ataki z sieci / boty (Turnstile) i nie osłabiaj szyfrowania.

## Struktura `src/`
- `pages/` — `LoginPage`, `RegisterPage`, `PendingPage`, `AdminPage`, `MapPage` (główny ekran + cała logika trybów mapy)
- `components/` — `Map` (Leaflet), `MarkerPopup`, `AddMarkerModal`, `Sidebar`, `Header`, `Compass` (magnetometr, tryb nawigacji), `CsvImportModal`, `BackupModal`, `ChangePassphraseModal`, `WorkspaceUnlock`, `Turnstile`, `AuthForm`, `ProtectedRoute`
- `context/AuthContext.tsx` — auth, workspace key, envelope, statusy
- `hooks/` — `useMarkers` (CRUD + szyfrowanie + backupy), `useDarkMode`
- `lib/` — `firebase`, `crypto`, `csv`, `geo` (dystans + `parseCoords`), `types`

## Konwencje
- Odpowiedzi i komentarze w kodzie po polsku; commit messages po angielsku.
- Nie pushować na `main` bez wyraźnej zgody (push = auto-deploy na produkcję).
- Komentować kod dla łatwej nawigacji.
