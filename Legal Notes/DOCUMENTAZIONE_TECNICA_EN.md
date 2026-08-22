# Technical documentation — BlameFlix

> **Language / Lingua**: **English** (this document) | [Italiano](DOCUMENTAZIONE_TECNICA.md)

## 1. Overall architecture

BlameFlix is a **Single-Page Application** in **vanilla JavaScript** (no framework), entirely contained in `www/index.html`: HTML + CSS + JavaScript in the same file. Three front-ends share the same web app:

| Platform | How it loads `www/index.html` |
|---|---|
| **Android** | Capacitor WebView (`appId com.padelle.blameflix`); the native plugins are exposed on `window.Capacitor.Plugins` |
| **Linux desktop** | Electron: `electron/main.js` creates a `BrowserWindow` and loads the file; `electron/preload.js` exposes two bridges via `contextBridge` |
| **Web** | Regular browser (serve the file with a static server) |

---

## 2. Application state and persistence

All the state is saved in `localStorage` and loaded at runtime:

```js
let API_KEY = localStorage.getItem('myTMDbApiKey') || '';
let watchlist = JSON.parse(localStorage.getItem('myWatchlist')) || [];
let lastPlayed = JSON.parse(localStorage.getItem('myLastPlayed')) || [];
let watchedEpisodes = loadWatchedEpisodes();   // { showId: { season: [numbers] } }
let resolver = JSON.parse(localStorage.getItem('myResolver')) || {}; // { movie, tv }
let resolverOverrides = JSON.parse(localStorage.getItem('myResolverOverrides')) || {}; // per-title override: 'media_type:id' -> template
let notifySettings = loadNotifySettings();
let releaseState = loadReleaseState();
```

`localStorage` keys: `myTMDbApiKey`, `myWatchlist`, `myLastPlayed`, `myCustomSelections`, `myWatchedEpisodes`, `myNewsHistory`, `myViewMode`, `myTypeFilter`, `myResolver`, `myResolverOverrides`, `myNotifySettings`, `myReleaseState`, `myDisclaimerAccepted`, `myUpdateCheck`.

The **watchlist contains only the identifiers** (`{ id, media_type }`), for compliance with the TMDB caching terms. The full details live only in **in-memory caches**: `watchlistDetails` (Map), `seasonEpisodesCache`, `tvSeasonsCache`, `showUnwatchedCache`.

The watched episodes are **compressed into ranges** to save space: `normalizeWatched()` normalizes the legacy formats, `listToRanges()` turns `[1,2,3,5]` into `[[1,3],[5]]`, and `compactSeason()` picks the shortest representation.

---

## 3. TMDB integration

`BASE_URL = 'https://api.themoviedb.org/3'`. Endpoints used, all with `?api_key=${API_KEY}&language=${locale()}` (locale-aware):

- **Search**: `GET /search/multi?query=…` → filters only `movie` and `tv` (`handleSearch`)
- **Details**: `GET /movie/{id}` or `GET /tv/{id}` (`showDetails`)
- **Episodes**: `GET /tv/{id}/season/{n}` (`loadEpisodes`)
- **Images**: posters `image.tmdb.org/t/p/w500`, stills `w300`, backdrops `w1280`; with fallback to data-URI SVGs (`PLACEHOLDER`)

`fetchJson()` is a small wrapper over `fetch` that throws on non-ok responses.

---

## 4. The "Watch now" feature and the source

The **source** (formerly "resolver") is a user-chosen URL template (`{ movie, tv }`). `resolveTemplate()`:

1. replaces the placeholders `{id}`, `{type}`, `{season}`, `{episode}` with the title's values (for series, season/episode);
2. **rejects** the URL if unresolved placeholders remain or if it does not start with `http(s)://` → returns `null`.

The app **does not append any segment** to the URL: the template is opened exactly as configured, with only the placeholders replaced. A template without `{id}` therefore opens the same URL for every title.

**Protocol block**: the app only accepts `http`/`https`. `sourceTemplateError()` verifies the template's scheme and returns an error message if it is a file-sharing protocol (`magnet`, `torrent`, `ed2k`, `kademlia`, `dht` — constant `BANNED_SOURCE_SCHEMES`) or otherwise non-http(s). The check runs at **save time** (`saveSettings()`, `saveResolverOverride()`, which reject the template and show the message) and at **open time** (`openPlayer()`, which shows a "Source not available" toast). `resolveTemplate` keeps the final `^https?://` check as defense in depth.

**Per-title source**: each title page can have a template that **takes precedence** over the global one. It is saved in `resolverOverrides` (`myResolverOverrides`, key `media_type:id`). `effectiveResolverTemplate(type)` returns the current title's override if present, otherwise the global template. The UI (panel in the title page, `toggleResolverOverride`/`saveResolverOverride`/`clearResolverOverride`) writes/reads `resolverOverrides`.

Backward-compatibility note: the user-facing terminology moved from "resolver" to "source", but the **internal identifiers** (`.resolver-override*` classes, `settings-resolver-*` ids, `resolver-notice`, function names, `myResolver`/`myResolverOverrides` localStorage keys) have been **kept unchanged**: the keys contain data already saved by users and the backups stay compatible.

`openPlayer()`: for a movie it resolves with only the `id`; for a series it determines season/episode (if `customMode`, it reads the manual inputs and saves them in `myCustomSelections`), calls `saveLastPlayed()` for resume, and finally opens the URL. In both cases it uses `effectiveResolverTemplate()`. Opening depends on the device:

- mobile → **Capacitor Browser** plugin (`openBrowser`) — opens the external browser;
- desktop → `window.open(url, '_blank', 'noopener')`.

If the template is empty, `resolveTemplate` returns `null` and the button stays inactive (visible from the `resolver-notice` banner).

---

## 5. Release notifications

`checkReleases(manual)` is the core. Logic:

1. **First run = baseline**: it records the current state without notifying (avoids a burst of stale alerts).
2. For every saved series: `GET /tv/{id}`, compares `last_episode_to_air` with `releaseState.shows[id]`. If it changed, it is **not a baseline**, the episode is **not already marked watched** and the series notifications are enabled → new release.
3. Every release ends up in `newsHistory` (max 30 entries, deduplicated, `addNewsEntry`).
4. If enabled, it sends a **system notification** via `notify()`, which picks the available channel:
   - **Android**: `Capacitor.Plugins.LocalNotifications.schedule({ id, title, body, extra })` — the `extra` serves to reopen the series page on tap (`localNotificationReceived`);
   - **Electron**: `window.blameflixNotify.notify()` → IPC `notify` → native `Notification` (`electron/main.js`);
   - **Web**: `new Notification(...)` with `onclick` that opens the page.
5. The notification permission is requested **only when needed** (`ensureNotifyPermission`), via the system dialog.

Auto-sync triggers (threefold):

- **Startup**: `checkReleases(false)` inside `startApp()`;
- **Periodic timer**: `setInterval` configured on 8/12/24/48 hours (`startAutoSyncTimer`);
- **`visibilitychange`**: on returning to the foreground if the interval elapsed (because OSes suspend timers in the background).

Note: only series are monitored (the movies in `moviesNotified` are kept in the payload but not actively handled).

---

## 6. Backup / restore

`backupData()` serializes everything into a **version 7** schema with `exportedAt` (the per-title sources in `myResolverOverrides` are added in a backward-compatible way: old backups, without the field, restore with `{}`). `createBackup()` is polymorphic:

- **Android**: `Filesystem.requestPermissions()` → `writeFile` in `EXTERNAL/BlameFlix/<date>.json` → shares via `Share.share({ files: [uri] })`;
- **Electron**: IPC `save-backup` → native "Save as" dialog (`electron/main.js`);
- **Browser**: `showSaveFilePicker` (File System Access API); fallback to Blob download (`downloadBackupFile`).

The restore (change handler of `backup-file`) uses `FileReader`, validates the structure and calls `hydrateWatchlist()`: for every entry without details it fetches TMDB and rebuilds the card (unreachable titles stay as placeholders). Then it rewrites everything in `localStorage` and re-renders the home.

---

## 7. UI rendering

- `renderGrid()`: builds the cards with `document.createElement`, poster, year, vote, "SAVED" badge and "N to watch" badge. Applies filters (`typeFilter`) and grid/list view. The strings pass through `escapeHtml()` (XSS mitigation).
- `showDetails()`: loads the details, shows the hero backdrop, handles the TV vs movie controls and syncs the per-title source panel.
- `renderEpisodeList()`: streaming-style rows with thumbnail, number, title, synopsis and play; **watched** state (greyed + `✓` badge), **future** (disabled until `isAired()` is true), **resume** (highlighted border).
- The "episodes to watch" counters (`refreshUnwatchedCount`, `refreshHomeUnwatchedCount`) download the seasons in parallel with `Promise.allSettled` and consult `isEpisodeWatched()`.

---

## 9. Startup disclaimer (first use)

On the very first launch the app shows a modal overlay with the legal notice (ownership, copyright, user responsibility). The program does not start until the user presses «Accept», and the button only enables **after 10 seconds** (counter on `disclaimer-status`). The acceptance is saved in `localStorage` (`myDisclaimerAccepted`) and is not requested again.

The startup is handled by `startApp()`: it contains all the init that used to be at the bottom of the script (notices sync, home, release auto-sync, timer, update check). `initDisclaimer()` decides whether to show the disclaimer or start immediately; `acceptDisclaimer()` saves the flag and calls `startApp()`.

**Persistence (best-effort)**: on first use the app calls `navigator.storage.persist()` (`tryPersistStorage()`) to ask the browser/WebView not to purge the origin's storage, so the flag survives restarts where the system grants it. It is not an absolute guarantee: if the OS clears the WebView data (or the app is uninstalled) `localStorage` can be lost and the disclaimer will reappear on the next first launch.

## 10. Updates (GitHub releases)

The installed version is exposed as `APP_VERSION`: in the source it is `'1.0.0'`, while in CI the pipeline replaces it with the current `package.json` version before the build (`.github/workflows/build.yml`, step "Inject version into web app"). The **Android app version** reaches the same value (`-PappVersion`) and the **`versionCode` is derived** from the version in `android/app/build.gradle` (`versionCodeFromString`, e.g. `1.2.3` → `10203`), so every release has an increasing `versionCode` and the APK installs over the previous version without uninstalling.

`checkForUpdates(manual)` queries `https://api.github.com/repos/padelle2603/blameflix/releases/latest` and compares `tag_name` (e.g. `v1.0.1`) with `APP_VERSION` via `compareVersions()` (numeric semver comparison). Results:

- if the release is **newer** → `update-notice` banner with a link to the release page (`openLatestRelease`) and, if present, to the direct APK download (`downloadLatestApk`);
- if equal or older → no notice; with `manual=true` the «Check updates» button in the Settings shows the outcome ("You are up to date ✓" / "New version vX available");
- the manual outcome also reaches the `update-status` field; the **auto-check** starts from `startApp()` after 5 seconds and, to avoid hammering the GitHub API, avoids repeating the call within an hour (cooldown on `myUpdateCheck`). The user can **dismiss** an update (`dismissUpdate`): the tag is remembered and the banner does not reappear for that version.

The links are opened with `openExternalUrl()`: system browser on mobile (Capacitor Browser) and new window on desktop (in Electron intercepted by `shell.openExternal`).

---

## 8. Security

- `contextIsolation: true` and `nodeIntegration: false` in Electron; the preload exposes only two targeted functions.
- `window.open` always with `noopener`; external links in Electron go through `shell.openExternal`, denying in-app navigation.
- No `eval`, no remote code, no telemetry. The only user-configured network endpoint is the source.