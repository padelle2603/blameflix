# Documentazione tecnica — BlameFlix

## 1. Architettura generale

BlameFlix è un'app **Single-Page Application** in **vanilla JavaScript** (nessun framework), interamente contenuta in `www/index.html`: HTML + CSS + JavaScript nello stesso file (3429 righe). Tre front-end condividono la stessa web app:

| Piattaforma | Come carica `www/index.html` |
|---|---|
| **Android** | WebView Capacitor (`appId com.padelle.blameflix`); i plugin nativi sono esposti su `window.Capacitor.Plugins` |
| **Desktop Linux** | Electron: `electron/main.js` crea una `BrowserWindow` e carica il file; `electron/preload.js` espone due bridge via `contextBridge` |
| **Web** | Browser normale (serve il file con un server statico) |

---

## 2. Stato applicativo e persistenza

Tutto lo stato è salvato in `localStorage` e caricato a runtime (`index.html:1713-1744`):

```js
let API_KEY = localStorage.getItem('myTMDbApiKey') || '';
let watchlist = JSON.parse(localStorage.getItem('myWatchlist')) || [];
let lastPlayed = JSON.parse(localStorage.getItem('myLastPlayed')) || [];
let watchedEpisodes = loadWatchedEpisodes();   // { showId: { stagione: [numeri] } }
let resolver = JSON.parse(localStorage.getItem('myResolver')) || {}; // { movie, tv }
let notifySettings = loadNotifySettings();
let releaseState = loadReleaseState();
```

Chiavi `localStorage`: `myTMDbApiKey`, `myWatchlist`, `myLastPlayed`, `myCustomSelections`, `myWatchedEpisodes`, `myNewsHistory`, `myViewMode`, `myTypeFilter`, `myResolver`, `myNotifySettings`, `myReleaseState`.

La **watchlist contiene solo gli identificativi** (`{ id, media_type }`), per conformità ai termini TMDB sul caching. I dettagli completi vivono solo in **cache in memoria**: `watchlistDetails` (Map), `seasonEpisodesCache`, `tvSeasonsCache`, `showUnwatchedCache`.

Le puntate viste sono **compresse in intervalli** per risparmiare spazio: `normalizeWatched()` normalizza i formati legacy, `listToRanges()` trasforma `[1,2,3,5]` in `[[1,3],[5]]`, e `compactSeason()` sceglie la rappresentazione più corta (`index.html:1823-1919`).

---

## 3. Integrazione TMDB

`BASE_URL = 'https://api.themoviedb.org/3'` (`index.html:1714`). Endpoint usati, tutti con `?api_key=${API_KEY}&language=it-IT`:

- **Ricerca**: `GET /search/multi?query=…` → filtra solo `movie` e `tv` (`handleSearch`, `index.html:2240-2269`)
- **Dettagli**: `GET /movie/{id}` oppure `GET /tv/{id}` (`showDetails`, `index.html:2379`)
- **Episodi**: `GET /tv/{id}/season/{n}` (`loadEpisodes`, `index.html:2518`)
- **Immagini**: poster `image.tmdb.org/t/p/w500`, still `w300`, backdrop `w1280`; con fallback a SVG dati URI (`PLACEHOLDER`)

`fetchJson()` è un piccolo wrapper su `fetch` che lancia errore su risposte non-ok (`index.html:2021`).

---

## 4. La funzione "Guarda ora" e il resolver

Il **resolver** è un template URL scelto dall'utente (`{ movie, tv }`). `resolveTemplate()` (`index.html:2906-2938`):

1. sostituisce i segnaposto `{id}`, `{type}`, `{season}`, `{episode}`;
2. separa path e query (per non corrompere i parametri del resolver);
3. accoda i segmenti mancanti come path canonici (`/id`, `/stagione`, `/episodio`);
4. **rifiuta** l'URL se restano segnaposto non risolti o se non inizia con `http(s)://` → restituisce `null`.

`openPlayer()` (`index.html:2940-2976`): per un film risolve con il solo `id`; per una serie determina stagione/episodio (se `customMode`, legge gli input manuali e salva in `myCustomSelections`), chiama `saveLastPlayed()` per il ripristino, e infine apre l'URL. Apertura a seconda del dispositivo:

- mobile → plugin **Capacitor Browser** (`openBrowser`, `index.html:2877`) — apre il browser esterno;
- desktop → `window.open(url, '_blank', 'noopener')`.

Se il template è vuoto, `resolveTemplate` restituisce `null` e il pulsante resta inattivo (visibile dal banner `resolver-notice`).

---

## 5. Notifiche di rilascio

`checkReleases(manual)` (`index.html:2111-2177`) è il cuore. Logica:

1. **Prima esecuzione = baseline**: registra lo stato corrente senza notificare (evita una raffica di avvisi vecchi).
2. Per ogni serie salvata: `GET /tv/{id}`, confronta `last_episode_to_air` con `releaseState.shows[id]`. Se è cambiato, **non è baseline**, la puntata **non è già segnata vista** e le notifiche serie sono attive → nuova release.
3. Ogni release finisce in `newsHistory` (max 30 voci, deduplicate, `addNewsEntry` `index.html:1959`).
4. Se abilitato, invia una **notifica di sistema** tramite `notify()` (`index.html:2053`), che sceglie il canale disponibile:
   - **Android**: `Capacitor.Plugins.LocalNotifications.schedule({ id, title, body, extra })` — l'`extra` serve a riaprire la scheda della serie al tocco (`localNotificationReceived`, `index.html:3413`);
   - **Electron**: `window.blameflixNotify.notify()` → IPC `notify` → `Notification` nativo (`electron/main.js:52-69`);
   - **Web**: `new Notification(...)` con `onclick` che apre la scheda.
5. Il permesso di notifica è chiesto **solo quando serve** (`ensureNotifyPermission`, `index.html:2028`), tramite il dialogo di sistema.

Trigger dell'auto-sync (triplice):

- **Avvio**: `checkReleases(false)` alla fine dell'init (`index.html:3407`);
- **Timer periodico**: `setInterval` configurato su 8/12/24/48 ore (`startAutoSyncTimer`, `index.html:2207`);
- **`visibilitychange`**: al ritorno in primo piano se l'intervallo è scaduto (perché gli OS sospendono i timer in background, `index.html:3421`).

Nota: solo le serie vengono monitorate (i film in `moviesNotified` sono lasciati nel payload ma non gestiti attivamente).

---

## 6. Backup / ripristino

`backupData()` (`index.html:3122-3141`) serializza tutto in uno schema **version 7** con `exportedAt`. `createBackup()` (`index.html:3160`) è polimorfico:

- **Android**: `Filesystem.requestPermissions()` → `writeFile` in `EXTERNAL/BlameFlix/<data>.json` → condivide via `Share.share({ files: [uri] })`;
- **Electron**: IPC `save-backup` → dialogo nativo "Salva con nome" (`electron/main.js:40-50`);
- **Browser**: `showSaveFilePicker` (File System Access API); fallback a download via Blob (`downloadBackupFile`).

Il ripristino (change handler di `backup-file`, `index.html:3308-3395`) usa `FileReader`, valida la struttura e chiama `hydrateWatchlist()` (`index.html:3264`): per ogni voce senza dettagli fa una fetch a TMDB e ricostruisce la card (i titoli irraggiungibili restano come segnaposto). Poi riscrive tutto in `localStorage` e ristampa la home.

---

## 7. Rendering UI

- `renderGrid()` (`index.html:2280`): costruisce card con `document.createElement`, poster, anno, voto, badge "SALVATO" e badge "N da vedere". Applica filtri (`typeFilter`) e vista griglia/lista. Le stringhe passano da `escapeHtml()` (mitigazione XSS, `index.html:1757`).
- `showDetails()` (`index.html:2373`): carica i dettagli, mostra backdrop in hero, gestisce i controlli TV vs Film.
- `renderEpisodeList()` (`index.html:2553`): righe in stile streaming con miniatura, numero, titolo, sinossi e play; stati **visto** (grigio + badge `✓`), **futuro** (disabilitata finché `isAired()` non è vera), **ripresa** (bordo evidenziato).
- I contatori "puntate da vedere" (`refreshUnwatchedCount`, `refreshHomeUnwatchedCount`) scaricano in parallelo le stagioni con `Promise.allSettled` e consultano `isEpisodeWatched()`.

---

## 8. Sicurezza

- `contextIsolation: true` e `nodeIntegration: false` in Electron (`electron/main.js:27-28`); il preload espone solo due funzioni mirate.
- `window.open` sempre con `noopener`; i link esterni in Electron passano da `shell.openExternal` negando la navigazione in-app (`electron/main.js:34-37`).
- Niente `eval`, niente codice remoto, niente telemetria. Unico endpoint di rete configurato dall'utente: il resolver.
