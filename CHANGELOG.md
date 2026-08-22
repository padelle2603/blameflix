# Changelog

Le release sono create automaticamente a ogni push sul ramo `main` e riportano qui il relativo changelog.

## v2.1.0

### Italiano

- **Scheda titolo più pulita**: la sinossi parte troncata a tre righe con una sfumatura finale e Anno/Voto restano nascosti; un tap (o click / Invio / Spazio da tastiera) espande l'intero blocco, un secondo tap lo richiude. Lo stato torna collassato a ogni apertura di un nuovo titolo.
- **Header ridisegnato**: logo BlameFlix isolato a sinistra e unico gruppo azioni a destra con ritmo uniforme: ⋮ menu opzioni libreria, conteggio SALVATI come testo discreto (numero in rosso), ⟳ Sync solo-icona, ⚙ Impostazioni. Il pannello opzioni si apre ora ancorato al bordo destro senza uscire dallo schermo.
- **Sync solo icona**: il bottone «⟳ Sync» diventa un'icona come gli altri comandi; durante la verifica gira su se stessa invece di cambiare etichetta.
- **Pull-to-refresh solo sull'app Android**: il gesto non scatta più nei browser desktop o mobile (notebook touchscreen ed emulazione dispositivi incluse) né in Electron; resta esclusivo del runtime nativo Capacitor.
- **Responsive**: header compatto sotto 640px; sotto 480px il counter salvati mostra solo il numero per tenere tutto su una riga anche a 360px.
- **Refactor**: `isMobile()` spostata in `env.js` e condivisa da player, controllo aggiornamenti e pull-to-refresh.

### English

- **Cleaner title sheet**: the synopsis starts clamped to three lines with a fade and Year/Rating stay hidden; one tap (or click / Enter / Space on keyboard) expands the whole block, tapping again collapses it. The state resets every time a new title is opened.
- **Redesigned top bar**: the BlameFlix brand sits alone on the left with a single action cluster on the right at an even rhythm: ⋮ library options menu, SAVED count as quiet text (red number), icon-only ⟳ Sync, ⚙ Settings. The options panel now anchors to the right edge without overflowing the screen.
- **Icon-only sync**: the «⟳ Sync» button becomes an icon like the other controls; while checking it spins instead of swapping labels.
- **Pull-to-refresh in the Android app only**: the gesture no longer engages in desktop or mobile browsers (touchscreen laptops and device emulation included) nor in Electron; it stays exclusive to the native Capacitor runtime.
- **Responsive**: compact header below 640px; below 480px the saved counter shows just the number so everything fits on one row even at 360px.
- **Refactor**: `isMobile()` moved to `env.js`, shared by player, update check and pull-to-refresh.

## v2.0.1

### Italiano

- **Fix controllo aggiornamenti (AppImage/APK)**: risolto il bug che mostrava "Connessione non disponibile" spurio quando si verificava manualmente la presenza di aggiornamenti. L'errore era causato da una variabile `state` shadowizzata in `checkForUpdates()` che faceva crashare `showUpdateNotice()` con un TypeError mascherato come errore di rete.
- **Versione corretta nel confronto aggiornamenti**: `state.appVersion` ora viene letta correttamente dallo stato del modulo (sincronizzata da `resolveAppVersion()`) invece che dall'oggetto locale `getUpdateState()` che non la conteneva.
- **Minificazione bundle**: aggiunto `minify: true` a esbuild per JS e CSS; bundle JS 135 KB → 89 KB, CSS 33 KB → 27 KB.
- **Poster griglia ottimizzati**: le card ora usano `/w342` invece di `/w500` (~40-50% byte in meno per poster); la scheda dettaglio mantiene `/w500`.
- **Parallelismo limitato in `markAllAiredWatched`**: sostituito `Promise.allSettled` illimitato con `mapPool(5)` per evitare raffiche di richieste su serie lunghe.
- **Cache risultati ricerca (LRU)**: cache in-memory keyed by `query:lang` con TTL 5 minuti; ricerche ripetute istantanee.
- **Font self-hosted WOFF2**: 9 font WOFF2 (Archivo Black, Archivo 400/500/600/700, IBM Plex Mono 400/500/600) serviti localmente con `font-display: swap`; rimossa dipendenza da Google Fonts (niente blocco rendering, UI coerente offline).
- **Code splitting + lazy loading**: esbuild `format: 'esm'` + `splitting: true`; moduli pesanti (details, settings, player, updates, backup, resolver) caricati via `import()` dinamico; entry point 5 KB, chunk condiviso ~79 KB.
- **Pulizia codice**: rimosso commento artefatto `// ... rest of function` in `updates.js`.

### English

- **Fix update check (AppImage/APK)**: fixed the bug showing spurious "Connection unavailable" when manually checking for updates. The error was caused by a shadowed `state` variable in `checkForUpdates()` that crashed `showUpdateNotice()` with a TypeError disguised as a network error.
- **Correct version in update comparison**: `state.appVersion` is now properly read from the module state (synced by `resolveAppVersion()`) instead of the local `getUpdateState()` object which didn't contain it.
- **Bundle minification**: added `minify: true` to esbuild for JS and CSS; JS bundle 135 KB → 89 KB, CSS 33 KB → 27 KB.
- **Optimized grid posters**: cards now use `/w342` instead of `/w500` (~40-50% fewer bytes per poster); detail view retains `/w500`.
- **Bounded parallelism in `markAllAiredWatched`**: replaced unbounded `Promise.allSettled` with `mapPool(5)` to avoid request bursts on long-running series.
- **Search results LRU cache**: in-memory cache keyed by `query:lang` with 5-min TTL; repeat searches are instant.
- **Self-hosted WOFF2 fonts**: 9 WOFF2 fonts (Archivo Black, Archivo 400/500/600/700, IBM Plex Mono 400/500/600) served locally with `font-display: swap`; removed Google Fonts dependency (no render-blocking, consistent offline UI).
- **Code splitting + lazy loading**: esbuild `format: 'esm'` + `splitting: true`; heavy modules (details, settings, player, updates, backup, resolver) loaded via dynamic `import()`; entry point 5 KB, shared chunk ~79 KB.
- **Code cleanup**: removed artifact comment `// ... rest of function` in `updates.js`.

## v2.0.0

### Italiano

- **Nuova interfaccia "Cold Minimal Dark"**: tema completamente ridisegnato su nero profondo freddo, con accento unico rosso brand, stato «tutto visto» in teal glaciale e rosso desaturato riservato ad errori e avvisi; bordi hairline, raggi ridotti, ombre leggere, scrollbar sottili.
- **Film e serie su righe separate**: nella vista «Tutti» i film e le serie sono raggruppati in due blocchi con titoli localizzati («Film» / «Serie TV»), ordinabili a piacere con il nuovo pulsante «⇅ Inverti» (preferenza salvata).
- **Menù opzioni libreria (⋮)**: filtri per tipo, visualizzazione griglia/lista e inversione dell'ordine convergono nel nuovo menù in alto a sinistra; «⟳ Sync» resta un'azione rapida sempre visibile accanto alle impostazioni.
- **Pull-to-refresh**: sulla libreria basta trascinare dall'alto per avviare la verifica delle nuove uscite (Android/webview touch).
- **Rifiniture**: badge «Tutto visto» allineato a sinistra; rimosso il banner in sfondo dalla scheda dettaglio; rimosse le scritte d'intestazione della home («La tua sala / BlameFlix / N titoli») e il tag «Schermo: la tua sala» dal footer.
- **Codice web modularizzato**: i sorgenti vivono ora in `src/` come moduli ES separati per dominio (moduli JS, CSS diviso per sezioni, template HTML); il bundle in `www/` viene generato con esbuild. Nessun cambiamento funzionale per l'utente.
- **Nuova pipeline di build locale**: `npm run build` compatta i sorgenti, `npm run watch` ricompila a ogni modifica e `npm run sync` esegue build + sincronizzazione Android. La versione dell'app viene iniettata in fase di build direttamente da `package.json`.
- **Repository più pulita**: gli artefatti generati (`www/`) non sono più tracciati su git; dopo un clone è sufficiente `npm install && npm run build` per ricostruire tutto.

### English

- **New "Cold Minimal Dark" interface**: a fully redesigned theme on deep cold black, with a single brand-red accent, glacial teal reserved for the "all watched" state and a muted red only for errors and warnings; hairline borders, reduced radii, lighter shadows, slim scrollbars.
- **Movies and series on separate rows**: in the "All" view movies and TV series are grouped into two labeled blocks ("Movies" / "TV Series"), reorderable with the new "⇅ Swap" button (preference persisted).
- **Library options menu (⋮)**: type filters, grid/list view and row order now live in the new top-left dropdown menu; "⟳ Sync" stays as an always-visible quick action next to Settings.
- **Pull-to-refresh**: dragging down from the top of the library starts the new-release check (Android/touch webview).
- **Polish**: "All watched" badge aligned left; removed the detail-page backdrop banner, the home heading block ("Your screening room / BlameFlix / N titles") and the "Schermo: la tua sala" footer tag.
- **Modularized web code**: sources now live in `src/` as ES modules split by domain (JS modules, CSS split by section, HTML template); the bundle in `www/` is generated with esbuild. No functional change for the user.
- **New local build pipeline**: `npm run build` bundles the sources, `npm run watch` rebuilds on change and `npm run sync` runs the build + Android synchronization. The app version is injected at build time directly from `package.json`.
- **Cleaner repository**: generated artifacts (`www/`) are no longer tracked in git; after cloning, `npm install && npm run build` is enough to rebuild everything.

## v1.3.0

### Italiano

- **Sicurezza dei backup**: i file ripristinati sono validati campo per campo (whitelist su ID, tipi e sorgenti) e le immagini TMDB vengono sanificate prima dell'uso: un backup manipolato non può più iniettare codice nell'app.
- **Film nelle notifiche di rilascio**: anche i film salvati generano una novità quando escono, con toggle dedicato nelle impostazioni notifiche. La novità viene segnalata solo se l'uscita è successiva al salvataggio del titolo o all'ultima verifica riuscita: un film già uscito (anche appena aggiunto alla lista) resta silenzioso.
- **«Segna come vista» dalla notifica** (Android): nuovo pulsante d'azione sulla notifica che segna la puntata vista senza aprire l'app.
- **Notifiche più affidabili**: le sincronizzazioni sovrapposte non generano più avvisi doppi; la prima sincronizzazione segna la baseline solo se ha scaricato almeno un titolo (niente più raffiche di avvisi vecchi dopo un primo avvio offline). Stessa regola per le serie: aggiungere una serie vecchia o conclusa non segnala più episodi già trasmessi in passato; una sincronizzazione fallita non fa più avanzare la finestra delle verifiche, quindi le uscite avvenute nel frattempo non vanno perse.
- **Avvio molto più leggero**: conteggio delle puntate parallelizzato con concorrenza limitata, contatori mostrati subito da uno snapshot persistente (validità 12 ore) e poi corretti in background, stagioni precaricate durante la scansione «Guarda ora».
- **Cache limitate (LRU)**: le cache TMDB non crescono più all'infinito nelle sessioni lunghe.
- **Fix del banner aggiornamenti**: corretto il falso avviso con l'app già aggiornata; il banner non riappare più al cambio lingua né dopo averlo chiuso con ✕; la verifica manuale continua a riproporlo su richiesta e conferma che sei aggiornato.
- **Inglese come lingua predefinita**: l'app parte in inglese per tutti, tranne chi ha la lingua di sistema in italiano (che parte in italiano). La preferenza salvata dall'utente continua a prevalere.
- **Fix vari**: cambio lingua aggiorna anche nomi di stagioni ed episodi senza riavvio; il backup include e ripristina il tipo (film/serie) di «Riprendi», che ora distingue correttamente titoli con lo stesso ID; gli errori di caricamento della scheda appaiono come toast invece di bloccare l'app.

### English

- **Backup security**: restored files are validated field by field (whitelisted IDs, types and sources) and TMDB image paths are sanitized before use: a crafted backup can no longer inject code into the app.
- **Movies in release notifications**: saved movies now generate news too when released, with a dedicated toggle in the notification settings. A title is announced only if the release happened after it was saved or after the last successful check: a movie that is already out (even one just added to the list) stays silent.
- **"Mark as watched" from the notification** (Android): new action button on episode notifications that marks the episode watched without opening the app view.
- **More reliable notifications**: overlapping syncs no longer produce duplicate alerts; the first successful sync records the baseline only if it downloaded at least one title (no more bursts of stale alerts after an offline first launch). The same rule applies to series: adding an old or ended show no longer alerts on episodes that aired long ago; a failed sync no longer advances the check window, so releases that happened meanwhile are not lost.
- **Much lighter startup**: episode counting runs with bounded parallelism, counters paint instantly from a persistent snapshot (12-hour validity) then self-correct in the background, and seasons prefetch while "Watch now" scans.
- **Bounded caches (LRU)**: TMDB caches no longer grow indefinitely during long sessions.
- **Update banner fix**: fixed the false warning when the app is already up to date; it no longer reappears on language change or after closing it with ✕; the manual check still brings it back on request and confirms you are up to date.
- **English as the default language**: the app now starts in English for everyone, except devices whose system language is Italian (they start in Italian). A saved user preference still wins.
- **Misc fixes**: switching language also refreshes season and episode names without a restart; backups now include and restore the movie/series type of "Resume", which correctly tells apart titles sharing the same ID; detail loading errors show as a toast instead of blocking dialogs.

## v1.2.3

- **Verifica aggiornamenti più affidabile**: se la prima richiesta fallisce (rete non pronta all'avvio, DNS o VPN instabili) viene **riprovata automaticamente** dopo 2 secondi.
- **Timeout di 10 secondi** sulla richiesta a GitHub: niente più «Verifica in corso…» bloccato all'infinito.
- **Riprova automatica quando torna la connessione**: se il controllo all'avvio fallisce perché il telefono era offline, l'app riprova da sola all'evento `online`, senza aspettare il prossimo avvio.
- **Messaggi d'errore specifici** al posto del generico «Impossibile verificare gli aggiornamenti»: limite di richieste GitHub (con indicazione dei minuti di attenza, letto dagli header `Retry-After`/`X-RateLimit-Reset`), timeout, connessione non disponibile.
- La tab Aggiornamenti mostra ora la **data dell'ultima verifica riuscita**: subito chiaro se il canale non ha mai funzionato o solo a volte.

## v1.2.2

- **«Guarda ora» con ripresa automatica**: per le serie il pulsante apre direttamente la **prima puntata non ancora vista** (scandendo le stagioni in ordine, solo puntate già trasmesse, speciali esclusi). Se tutto è stato visto riparte dall'ultima puntata riprodotta.
- La **lista episodi si posiziona** sulla puntata di ripresa: selettore di stagione ed evidenziazione allineati a ciò che «Guarda ora» sta per aprire.
- Il play su una **riga specifica** della lista continua ad aprire esattamente quella puntata.
- **Ricerca più reattiva**: attivazione con ritardo (debounce) e annullamento delle richieste obsolete.
- **Cache unificata dei dettagli TMDB**: meno chiamate ripetute tra scheda, contatori e stagioni.
- **Watchlist idratata in parallelo**: griglia più veloce con molte serie salvate.
- **Aggiornamenti a schermo senza re-render**: il toggle «visto» modifica solo la riga toccata; badge dei salvati e contatori aggiornati in modo incrementale.
- **Event delegation** su griglia titoli e lista episodi: un solo listener anche per liste lunghe.
- **Letture localStorage blindate**: un valore corrotto non blocca più l'avvio dell'app.
- Pulizia del codice: funzioni deduplicate (episodi di stagione, conteggio non visti, voti localizzati, fetch, storage), font monospace come variabile CSS, rimozione di attributi e escape inutili.

## v1.2.1

- Aggiornamenti: il controllo della versione avviene **live su GitHub a ogni avvio** (rimossa la verifica a cache oraria), con banner e popup solo quando esiste davvero una versione più nuova.
- Al primo avvio la versione viene verificata **insieme al disclaimer**; se l'installata è già l'ultima, nessun banner né popup.
- **Versione installata reale** letta dal wrapper nativo (Electron `app.getVersion()`, Android `App.getInfo()`): "Versione installata" e confronto con GitHub sempre corretti anche senza iniezione CI.
- Nella **versione web** (anteprima del sorgente) gli aggiornamenti non vengono più segnalati: niente banner o popup fuorvianti.
- **Impostazioni riorganizzate per categorie** con tab: API e Sorgenti, Notifiche, Preferenze, Dati, Aggiornamenti, Aiuto.
- Il popup di aggiornamento compare **sopra il disclaimer** all'avvio.
- README: aggiunto il banner di download "Get on GitHub" che punta all'ultima release.

## v1.2.0

- Localizzazione bilingue **IT/EN** completa (168 chiavi): home, scheda titolo, impostazioni, notifiche, backup, aggiornamenti e disclaimer.
- Rilevamento automatico della lingua al primo avvio + selettore manuale nelle Impostazioni.
- Lingua inclusa nel backup e ripristinata al ripristino.
- Ricerche TMDB nella lingua selezionata (`it-IT` / `en-US`).
- **Popup di aggiornamento all'avvio** quando esiste una nuova versione (download APK o apertura della release), oltre al banner.
- Pulsante "Salva" spostato sotto la scelta della lingua.
- Documentazione in inglese e italiano (README, note legali).

## v1.1.1

- Rimosso l'accodamento automatico nell'URL della sorgente: viene aperta esattamente come configurata.
- Solo segnaposto `{id}`, `{type}`, `{season}`, `{episode}` per comporre URL dinamici.
- Testi aggiornati: guida e Impostazioni spiegano il comportamento a segnaposto.