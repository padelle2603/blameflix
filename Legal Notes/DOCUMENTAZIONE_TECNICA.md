# Documentazione tecnica — BlameFlix

> **Lingua / Language**: **Italiano** (questo documento) | [English](DOCUMENTAZIONE_TECNICA_EN.md)

## 1. Architettura generale

BlameFlix è un'app **Single-Page Application** in **vanilla JavaScript** (nessun framework), interamente contenuta in `www/index.html`: HTML + CSS + JavaScript nello stesso file (3851 righe). Tre front-end condividono la stessa web app:

| Piattaforma | Come carica `www/index.html` |
|---|---|
| **Android** | WebView Capacitor (`appId com.padelle.blameflix`); i plugin nativi sono esposti su `window.Capacitor.Plugins` |
| **Desktop Linux** | Electron: `electron/main.js` crea una `BrowserWindow` e carica il file; `electron/preload.js` espone due bridge via `contextBridge` |
| **Web** | Browser normale (serve il file con un server statico) |

---

## 2. Stato applicativo e persistenza

Tutto lo stato è salvato in `localStorage` e caricato a runtime (`index.html:1863-1898`):

```js
let API_KEY = localStorage.getItem('myTMDbApiKey') || '';
let watchlist = JSON.parse(localStorage.getItem('myWatchlist')) || [];
let lastPlayed = JSON.parse(localStorage.getItem('myLastPlayed')) || [];
let watchedEpisodes = loadWatchedEpisodes();   // { showId: { stagione: [numeri] } }
let resolver = JSON.parse(localStorage.getItem('myResolver')) || {}; // { movie, tv }
let resolverOverrides = JSON.parse(localStorage.getItem('myResolverOverrides')) || {}; // override per titolo: 'media_type:id' -> template
let notifySettings = loadNotifySettings();
let releaseState = loadReleaseState();
```

Chiavi `localStorage`: `myTMDbApiKey`, `myWatchlist`, `myLastPlayed`, `myCustomSelections`, `myWatchedEpisodes`, `myNewsHistory`, `myViewMode`, `myTypeFilter`, `myResolver`, `myResolverOverrides`, `myNotifySettings`, `myReleaseState`, `myDisclaimerAccepted`, `myUpdateCheck`.

La **watchlist contiene solo gli identificativi** (`{ id, media_type }`), per conformità ai termini TMDB sul caching. I dettagli completi vivono solo in **cache in memoria**: `watchlistDetails` (Map), `seasonEpisodesCache`, `tvSeasonsCache`, `showUnwatchedCache`.

Le puntate viste sono **compresse in intervalli** per risparmiare spazio: `normalizeWatched()` normalizza i formati legacy, `listToRanges()` trasforma `[1,2,3,5]` in `[[1,3],[5]]`, e `compactSeason()` sceglie la rappresentazione più corta (`index.html:2009-2049`).

---

## 3. Integrazione TMDB

`BASE_URL = 'https://api.themoviedb.org/3'` (`index.html:1864`). Endpoint usati, tutti con `?api_key=${API_KEY}&language=it-IT`:

- **Ricerca**: `GET /search/multi?query=…` → filtra solo `movie` e `tv` (`handleSearch`, `index.html:2392-2424`)
- **Dettagli**: `GET /movie/{id}` oppure `GET /tv/{id}` (`showDetails`, `index.html:2525`)
- **Episodi**: `GET /tv/{id}/season/{n}` (`loadEpisodes`, `index.html:2640`)
- **Immagini**: poster `image.tmdb.org/t/p/w500`, still `w300`, backdrop `w1280`; con fallback a SVG dati URI (`PLACEHOLDER`)

`fetchJson()` è un piccolo wrapper su `fetch` che lancia errore su risposte non-ok (`index.html:2173`).

---

## 4. La funzione "Guarda ora" e la sorgente

La **sorgente** (ex "resolver") è un template URL scelto dall'utente (`{ movie, tv }`). `resolveTemplate()` (`index.html:3064-3096`):

1. sostituisce i segnaposto `{id}`, `{type}`, `{season}`, `{episode}` con i valori del titolo (per le serie, stagione/episodio);
2. **rifiuta** l'URL se restano segnaposto non risolti o se non inizia con `http(s)://` → restituisce `null`.

L'app **non accoda alcun segmento** all'URL: il template viene aperto esattamente come configurato, con i soli segnaposto sostituiti. Un template senza `{id}` apre quindi lo stesso URL per ogni titolo.

**Blocco protocolli**: l'app accetta solo `http`/`https`. `sourceTemplateError()` (`index.html`, subito dopo `resolveTemplate`) verifica lo schema del template e restituisce un messaggio d'errore se è un protocollo di file-sharing (`magnet`, `torrent`, `ed2k`, `kademlia`, `dht` — costante `BANNED_SOURCE_SCHEMES`) o comunque non-http(s). Il controllo viene eseguito al **salvataggio** (`saveSettings()`, `saveResolverOverride()`, che rifiutano il template e mostrano il messaggio) e all'**apertura** (`openPlayer()`, che mostra un toast "Sorgente non disponibile"). `resolveTemplate` mantiene il controllo finale `^https?://` come difesa in profondità.

**Sorgente per titolo**: ogni scheda può avere un template che **ha la precedenza** su quello globale. È salvato in `resolverOverrides` (`myResolverOverrides`, chiave `media_type:id`). `effectiveResolverTemplate(type)` (`index.html:3143-3149`) ritorna l'override del titolo corrente se presente, altrimenti il template globale. La UI (pannello nella scheda, `toggleResolverOverride`/`saveResolverOverride`/`clearResolverOverride`) scrive/legge `resolverOverrides`.

Nota di retrocompatibilità: la terminologia utente è passata da "resolver" a "sorgente", ma gli **identificatori interni** (classi `.resolver-override*`, id `settings-resolver-*`, `resolver-notice`, nomi funzione, chiavi `localStorage` `myResolver`/`myResolverOverrides`) sono stati **mantenuti invariati**: le chiavi contengono i dati già salvati dagli utenti e i backup restano compatibili.

`openPlayer()` (`index.html:3098-3132`): per un film risolve con il solo `id`; per una serie determina stagione/episodio (se `customMode`, legge gli input manuali e salva in `myCustomSelections`), chiama `saveLastPlayed()` per il ripristino, e infine apre l'URL. In entrambi i casi usa `effectiveResolverTemplate()`. Apertura a seconda del dispositivo:

- mobile → plugin **Capacitor Browser** (`openBrowser`, `index.html:3035`) — apre il browser esterno;
- desktop → `window.open(url, '_blank', 'noopener')`.

Se il template è vuoto, `resolveTemplate` restituisce `null` e il pulsante resta inattivo (visibile dal banner `resolver-notice`).

---

## 5. Notifiche di rilascio

`checkReleases(manual)` (`index.html:2263-2329`) è il cuore. Logica:

1. **Prima esecuzione = baseline**: registra lo stato corrente senza notificare (evita una raffica di avvisi vecchi).
2. Per ogni serie salvata: `GET /tv/{id}`, confronta `last_episode_to_air` con `releaseState.shows[id]`. Se è cambiato, **non è baseline**, la puntata **non è già segnata vista** e le notifiche serie sono attive → nuova release.
3. Ogni release finisce in `newsHistory` (max 30 voci, deduplicate, `addNewsEntry` `index.html:2111`).
4. Se abilitato, invia una **notifica di sistema** tramite `notify()` (`index.html:2205`), che sceglie il canale disponibile:
   - **Android**: `Capacitor.Plugins.LocalNotifications.schedule({ id, title, body, extra })` — l'`extra` serve a riaprire la scheda della serie al tocco (`localNotificationReceived`, `index.html:3818`);
   - **Electron**: `window.blameflixNotify.notify()` → IPC `notify` → `Notification` nativo (`electron/main.js:52-69`);
   - **Web**: `new Notification(...)` con `onclick` che apre la scheda.
5. Il permesso di notifica è chiesto **solo quando serve** (`ensureNotifyPermission`, `index.html:2180`), tramite il dialogo di sistema.

Trigger dell'auto-sync (triplice):

- **Avvio**: `checkReleases(false)` dentro `startApp()` (`index.html:3771`);
- **Timer periodico**: `setInterval` configurato su 8/12/24/48 ore (`startAutoSyncTimer`, `index.html:2359`);
- **`visibilitychange`**: al ritorno in primo piano se l'intervallo è scaduto (perché gli OS sospendono i timer in background, `index.html:3826`).

Nota: solo le serie vengono monitorate (i film in `moviesNotified` sono lasciati nel payload ma non gestiti attivamente).

---

## 6. Backup / ripristino

`backupData()` (`index.html:3478-3497`) serializza tutto in uno schema **version 7** con `exportedAt` (le sorgenti per titolo in `myResolverOverrides` sono aggiunte in modo retrocompatibile: i backup vecchi, senza il campo, ripristinano con `{}`). `createBackup()` (`index.html:3517`) è polimorfico:

- **Android**: `Filesystem.requestPermissions()` → `writeFile` in `EXTERNAL/BlameFlix/<data>.json` → condivide via `Share.share({ files: [uri] })`;
- **Electron**: IPC `save-backup` → dialogo nativo "Salva con nome" (`electron/main.js:40-50`);
- **Browser**: `showSaveFilePicker` (File System Access API); fallback a download via Blob (`downloadBackupFile`).

Il ripristino (change handler di `backup-file`, `index.html:3665-3742`) usa `FileReader`, valida la struttura e chiama `hydrateWatchlist()` (`index.html:3621`): per ogni voce senza dettagli fa una fetch a TMDB e ricostruisce la card (i titoli irraggiungibili restano come segnaposto). Poi riscrive tutto in `localStorage` e ristampa la home.

---

## 7. Rendering UI

- `renderGrid()` (`index.html:2432`): costruisce card con `document.createElement`, poster, anno, voto, badge "SALVATO" e badge "N da vedere". Applica filtri (`typeFilter`) e vista griglia/lista. Le stringhe passano da `escapeHtml()` (mitigazione XSS, `index.html:1909`).
- `showDetails()` (`index.html:2525`): carica i dettagli, mostra backdrop in hero, gestisce i controlli TV vs Film e sincronizza il pannello della sorgente per titolo.
- `renderEpisodeList()` (`index.html:2711`): righe in stile streaming con miniatura, numero, titolo, sinossi e play; stati **visto** (grigio + badge `✓`), **futuro** (disabilitata finché `isAired()` non è vera), **ripresa** (bordo evidenziato).
- I contatori "puntate da vedere" (`refreshUnwatchedCount`, `refreshHomeUnwatchedCount`) scaricano in parallelo le stagioni con `Promise.allSettled` e consultano `isEpisodeWatched()`.

---

## 9. Disclaimer di avvio (primo utilizzo)

Al primissimo avvio l'app mostra un overlay modale con l'avviso legale (proprietà, diritto d'autore, responsabilità dell'utente). Il programma non parte finché l'utente non preme «Accetta», e il pulsante si abilita solo **dopo 10 secondi** (contatore su `disclaimer-status`). L'accettazione è salvata in `localStorage` (`myDisclaimerAccepted`) e non viene più richiesta.

L'avvio è gestito da `startApp()` (`index.html:3769-3780`): contiene tutto l'init che prima era a fondo script (sync delle notice, home, auto-sync uscite, timer, controllo aggiornamenti). `initDisclaimer()` (`index.html:3796`) decide se mostrare il disclaimer o avviare subito; `acceptDisclaimer()` (`index.html:3823`) salva il flag e chiama `startApp()`.

**Persistenza (best-effort)**: al primo utilizzo l'app chiama `navigator.storage.persist()` (`tryPersistStorage()`, `index.html:3788`) per chiedere al browser/WebView di non epurare lo storage dell'origine, così il flag sopravvive ai riavvii dove il sistema lo concede. Non è una garanzia assoluta: se l'OS cancella i dati della WebView (o l'app viene disinstallata) `localStorage` può andare perso e il disclaimer ricomparirà al primo avvio successivo.

## 10. Aggiornamenti (GitHub releases)

La versione installata è esposta come `APP_VERSION` (`index.html:1859`): nel sorgente vale `'1.0.0'`, mentre in CI la pipeline la sostituisce con la versione corrente di `package.json` prima della build (`.github/workflows/build.yml`, step "Inject version into web app"). La **versione dell'app Android** arriva allo stesso valore (`-PappVersion`) e il **`versionCode` viene derivato** dalla versione in `android/app/build.gradle` (`versionCodeFromString`, es. `1.2.3` → `10203`), così ogni release ha un `versionCode` crescente e l'APK si installa sopra la versione precedente senza disinstallare.

`checkForUpdates(manual)` (`index.html:3365`) interroga `https://api.github.com/repos/padelle2603/blameflix/releases/latest` e confronta `tag_name` (es. `v1.0.1`) con `APP_VERSION` tramite `compareVersions()` (confronto semver numerico). Risultati:

- se la release è **più recente** → banner `update-notice` con link alla pagina della release (`openLatestRelease`) e, se presente, al download diretto dell'APK (`downloadLatestApk`);
- se è uguale o più vecchia → nessun avviso; con `manual=true` il pulsante «Verifica aggiornamenti» delle Impostazioni mostra l'esito («Sei aggiornato ✓» / «Nuova versione vX disponibile»);
- l'esito manuale arriva anche nel campo `update-status`; l'**auto-controllo** parte da `startApp()` dopo 5 secondi e, per non battere l'API GitHub, evita di ripetere la chiamata entro un'ora (cooldown su `myUpdateCheck`). L'utente può **ignorare** un aggiornamento (`dismissUpdate`): il tag viene ricordato e il banner non riappare per quella versione.

L'apertura dei link avviene con `openExternalUrl()`: browser di sistema su mobile (Capacitor Browser) e nuova finestra su desktop (in Electron intercettata da `shell.openExternal`).

---

## 8. Sicurezza

- `contextIsolation: true` e `nodeIntegration: false` in Electron (`electron/main.js:27-28`); il preload espone solo due funzioni mirate.
- `window.open` sempre con `noopener`; i link esterni in Electron passano da `shell.openExternal` negando la navigazione in-app (`electron/main.js:34-37`).
- Niente `eval`, niente codice remoto, niente telemetria. Unico endpoint di rete configurato dall'utente: la sorgente.
