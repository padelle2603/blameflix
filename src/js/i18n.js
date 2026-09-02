import { state, LANG_STORAGE } from './state.js';
import { EXTRA_LANGS } from './i18n-langs.js';
import { LANG_CODES, langMeta } from './langs.js';
import { detailsCache, seasonEpisodesCache, tvSeasonsCache } from './tmdb.js';
import { syncTools, renderHome } from './catalog.js';
import { hydrateWatchlistGrid } from './backup.js';
import { searchCache } from './search.js';
import { syncNotifySettingsInputs } from './settings.js';
import { renderNewsSection } from './news.js';
import { showDetails } from './details.js';
import { updateWatchlistBtn } from './watchlist.js';
import { syncResolverOverrideBtn } from './resolver.js';
import { showUpdateNotice, syncUpdatePopup } from './updates.js';
import { registerNotificationActions } from './notifications.js';
import { detailView, updatePopup } from './dom.js';

const I18N = {
    it: {
        'nav.home': 'Torna alla tua homepage',
        'nav.settings': 'Impostazioni',
        'nav.skip': 'Salta al contenuto',
        'notice.nokey': '⚠ Nessuna chiave TMDB · impossibile cercare',
        'notice.setkey': 'Imposta la chiave',
        'notice.noresolver': '⚠ Nessuna sorgente configurata · «Guarda ora» non attivo',
        'notice.configsource': 'Configura la sorgente',
        'notice.downloadGitHub': 'Scarica da GitHub',
        'notice.downloadApk': 'Scarica APK',
        'notice.dismiss': 'Ignora questo aggiornamento',
        'notice.updateAvailable': '⚠ Nuova versione {tag} disponibile su GitHub',
        'update.popupTitle': 'Nuova versione disponibile',
        'update.popupBody': 'BlameFlix {latest} è disponibile. La tua versione installata è la {current}.',
        'update.later': 'Più tardi',
        'search.label': 'Cerca un titolo',
        'search.placeholder': 'Cerca film o serie TV…',
        'search.clearAria': 'Torna alla tua homepage',
        'home.news': 'Novità',
        'home.clearNews': 'Svuota',
        'home.tmdbArchive': 'Archivio TMDB',
        'home.kindMovies': 'Film',
        'home.kindSeries': 'Serie TV',
        'home.scrollPrev': 'Scorri indietro',
        'home.scrollNext': 'Scorri avanti',
        'home.searchResults': 'Risultati per «{q}»',
        'home.noTitles': 'Nessun titolo in sala',
        'home.emptyRoom': 'La tua sala è vuota. Cerca il primo film o la prima serie qui sopra per iniziare.',
        'home.emptyFilter': 'Nessun titolo',
        'home.emptyFilterDesc': '{label} non trovati con questi criteri.',
        'home.noResults': 'Nessun risultato',
        'home.noResultsDesc': 'Non abbiamo trovato nulla con questa ricerca. Prova un altro titolo.',
        'tools.filterBy': 'Filtra per tipo',
        'filter.movie': 'film',
        'filter.tv': 'serie',
        'filter.all': 'titoli',
        'tools.all': 'Tutti',
        'tools.movie': 'Film',
        'tools.tv': 'Serie',
        'tools.viewMode': 'Cambia visualizzazione',
        'tools.grid': 'Griglia',
        'tools.list': 'Lista',
        'tools.sync': 'Verifica nuove uscite',

        'tools.menu': 'Opzioni libreria',

        'tools.sortSection': 'Ordina per',
        'tools.sortAdded': 'Aggiunti',
        'tools.sortAlpha': 'Alfabetico',
        'tools.sortRelease': 'Data di uscita',
        'tools.sortRating': 'Valutazione',

        'tools.orderSection': 'Ordine righe film/serie',

        'tools.swap': '⇅ Inverti',
        'detail.back': '← Indietro',
        'detail.posterAlt': 'Poster',
        'detail.sheet': 'Scheda titolo',
        'detail.year': 'Anno',
        'detail.revealHint': 'Tocca per mostrare',
        'detail.share': 'Condividi',
        'detail.tmdb': 'Apri su TMDB',
        'detail.markAllAired': '✓ Segna tutte le stagioni come viste',
        'detail.markAllAiredUnwatched': 'Togli il visto da tutte le stagioni',
        'detail.watchNow': '↗ Apri nel browser',
        'detail.sourceForTitle': 'Sorgente per questo titolo',
        'detail.sourceOverridePlaceholder': 'https://esempio.com/title/{id}/',
        'detail.sourceOverrideHint': 'Se vuoto, «Guarda ora» usa la sorgente globale delle Impostazioni. Usa i segnaposto {id}, {type}, {season}, {episode} per inserire id, stagione ed episodio nell\'URL: senza segnaposto l\'URL viene aperto così com\'è. Solo collegamenti http/https.',
        'detail.useForTitle': 'Usa per questo titolo',
        'detail.useGlobal': 'Usa quello globale',
        'detail.season': 'Stagione',
        'detail.episode': 'Episodio',
        'detail.customHint': 'Stagioni o episodi non elencati da TMDB',
        'detail.episodes': 'Episodi',
        'detail.sourceGlobal': 'Sorgente: globale',
        'detail.sourceCustom': 'Sorgente: personale',
        'detail.networkGlobal': 'Rete: —',
        'detail.networkCustom': 'Rete: {name}',
        'detail.networkNone': '— Nessuna —',
        'detail.networkSelectLabel': 'Emittente / Rete',
        'detail.networkForTitle': 'Programmazione di rete per questo titolo',
        'detail.networkPlaceholder': 'https://esempio.com/schedule/{id}',
        'detail.networkOverrideHint': 'Incolla l\'URL di una sorgente esterna che restituisce la programmazione della rete in JSON (segnaposto {id}, {networkId}, {networkName}). L\'endpoint deve essere raggiungibile dal browser: se la sorgente blocca il CORS, passala attraverso un proxy a tuo carico. Solo http/https.',
        'detail.savedRemove': '✓ Salvato · rimuovi',
        'detail.addSaved': '+ Aggiungi ai salvati',
        'detail.noOverview': 'Nessuna descrizione disponibile.',
        'settings.preferences': 'Preferenze',
        'settings.tab.api': 'API e Sorgenti',
        'settings.tab.notify': 'Notifiche',
        'settings.tab.preferences': 'Preferenze',
        'settings.tab.data': 'Dati',
        'settings.tab.cloud': 'Cloud',
        'settings.tab.updates': 'Aggiornamenti',
        'settings.tab.help': 'Aiuto',
        'settings.title': 'Impostazioni',
        'settings.close': '× Chiudi',
        'settings.apiKey': 'Chiave API TMDB',
        'settings.apiKeyPlaceholder': 'Inserisci la tua chiave personale',
        'settings.apiKeyHint': 'La chiave personale si ottiene gratuitamente su themoviedb.org → Impostazioni → API. Senza chiave non puoi cercare titoli.',
        'settings.sourceMovie': 'Sorgente film',
        'settings.sourceMoviePlaceholder': 'https://esempio.com/movie/{id}/',
        'settings.sourceTv': 'Sorgente serie',
        'settings.sourceTvPlaceholder': 'https://esempio.com/tv/{id}/{season}/{episode}/',
        'settings.sourceHint': 'L\'app apre l\'URL della sorgente che tu configuri, sostituendo i segnaposto {id}, {type}, {season}, {episode} con i valori del titolo. Senza segnaposto l\'URL viene aperto esattamente com\'è. Solo collegamenti http/https: magnet, torrent e altri protocolli non sono supportati. Se lasci vuoto, «Guarda ora» non è attivo.',
        'settings.browser': 'Apertura link',
        'settings.browserDefault': 'Predefinito',
        'settings.browserAsk': 'Chiedi ogni volta',
        'settings.browserHint': 'Come aprire i link dei contenuti: con il browser predefinito (Chrome Custom Tabs) o scegliendo ogni volta.',
        'settings.notify': 'Notifiche di rilascio',
        'settings.notifyHint': 'Ti avvisiamo quando esce una nuova puntata di una serie o esce un film della tua sala. Le novità restano anche nella cronologia «Novità» in home. Il controllo avviene all\'apertura dell\'app, automaticamente a intervalli regolari e con il tasto «⟳ Sincronizzazione» nella sala. Su Android serve il permesso di notifica di sistema.',
        'settings.notifyMovies': 'Notifiche per le uscite dei film',
        'settings.notifyEnable': 'Abilita notifiche',
        'settings.notifyTv': 'Notifiche per le nuove puntate',
        'settings.notifyInterval': 'Sincronizzazione automatica',
        'settings.every8': 'Ogni 8 ore',
        'settings.every12': 'Ogni 12 ore',
        'settings.every24': 'Ogni 24 ore',
        'settings.every48': 'Ogni 48 ore',
        'settings.testNotify': '🔔 Prova notifica',
        'settings.save': 'Salva',
        'settings.language': 'Lingua',
        'settings.langHint': 'Lingua dell\'interfaccia. Al primo avvio viene rilevata automaticamente.',
        'settings.backup': 'Backup dati',
        'settings.backupHint': 'Salva i tuoi dati (salvati, puntate viste, ultime riproduzioni, stagioni personalizzate, novità e preferenze) e ripristinali in un secondo momento. Il backup contiene solo gli identificativi dei titoli: al ripristino i dettagli vengono riscaricati da TMDB (serve la connessione).',
        'settings.backupCreate': '⬇ Crea backup',
        'settings.backupRestore': '⬆ Ripristina',
        'settings.dataDelete': 'Elimina dati',
        'settings.dataDeleteHint': 'Cancella in modo irreversibile watchlist, puntate viste, ultime riproduzioni, stagioni personalizzate, novità e preferenze. La chiave API, la lingua e il consenso legale vengono conservati.',
        'settings.dataDeleteBtn': '🗑 Elimina dati',
        'settings.dataDeleteConfirm': 'Sei sicuro? Tutti i dati (watchlist, puntate viste, preferenze) verranno cancellati in modo irreversibile.',
        'cloud.title': 'Sync cloud',
        'cloud.hint': 'Sincronizza i tuoi dati con un tuo spazio Supabase personale. È tutto facoltativo: i dati restano sul dispositivo finché non configuri e attivi il sync. Prima di partire, i dati vengono cifrati sul dispositivo con un token segreto personale, quindi restano illeggibili anche per chiunque abbia accesso al database. La chiave API e le sorgenti restano solo sul dispositivo e nel backup locale.',
        'cloud.enabled': 'Sync cloud attivo',
        'cloud.url': 'Supabase URL',
        'cloud.anonKey': 'Chiave anonima (anon key)',
        'cloud.token': 'Token personale segreto',
        'cloud.tokenHint': 'Genera un token e conservalo: serve per accedere ai tuoi dati su un altro dispositivo. Su un secondo dispositivo incolla lo stesso token per sincronizzare gli stessi dati.',
        'cloud.generate': '🎲 Genera token',
        'cloud.push': 'Carica sul cloud',
        'cloud.pull': 'Scarica dal cloud',
        'cloud.listTitle': 'Sync cloud',
        'settings.updates': 'Aggiornamenti',
        'settings.version': 'Versione installata:',
        'settings.updatesHint': 'BlameFlix controlla su GitHub se è disponibile una nuova versione e te la segnala all\'avvio. Puoi verificare manualmente quando vuoi.',
        'settings.updatesWebOnly': 'La verifica degli aggiornamenti è disponibile solo nelle app installate (Android e desktop).',
        'settings.checkUpdates': '⟳ Verifica aggiornamenti',
        'settings.lastCheck': 'Ultima verifica riuscita: {date}',
        'settings.goRelease': 'Vai alla release',
        'settings.help': 'Aiuto',
        'settings.helpHint': 'Hai domande su come usare BlameFlix? Trovi tutto spiegato nella guida.',
        'settings.docs': '❓ Documentazione',
        'docs.guide': 'Guida',
        'docs.title': 'Documentazione',
        'docs.close': '× Chiudi',
        'docs.body': `
<p class="docs-hint">Come usare BlameFlix</p>

<h3>Cos'è BlameFlix</h3>
<p>BlameFlix è la tua sala personale: un catalogo dove raccogli i film e le serie TV che ti interessano. Puoi cercare titoli, tenerli nei salvati e guardarli quando vuoi, ripartendo sempre da dove eri rimasto.</p>

<h3>Cercare e salvare un titolo</h3>
<p>Usa la barra di ricerca in alto per trovare un film o una serie. Apri la scheda del titolo che ti interessa e premi <strong>«+ Aggiungi ai salvati»</strong>: il titolo entra nella tua sala, dove resta fino a quando non lo togli. Puoi filtrare la sala per <strong>Tutti</strong>, <strong>Film</strong> o <strong>Serie</strong> e scegliere tra la vista a griglia e quella a lista.</p>

<h3>Guardare un film</h3>
<p>Apri la scheda del film e premi <strong>«↗ Apri nel browser»</strong>. BlameFlix apre l'URL della <strong>sorgente</strong> che hai configurato nelle Impostazioni. Su telefono si apre l'app esterna, su computer una nuova finestra.</p>

<h3>Guardare una serie TV</h3>
<p>Nella scheda di una serie scegli la <strong>stagione</strong> dal selettore: sotto compaiono le <strong>puntate</strong> di quella stagione, con miniatura, titolo e descrizione. Premi «▶ Guarda» sulla puntata che vuoi vedere. Le puntate già viste appaiono <strong>grigiate</strong> con il badge «✓ VISTO»; quelle non ancora in onda restano bloccate fino alla data di messa in onda.</p>
<p>BlameFlix segna automaticamente come vista la puntata che guardi, ma puoi cambiarlo cliccando sul badge «✓ VISTO» di una puntata. Con il tasto <strong>«Segna tutte come viste»</strong> in cima alla lista puoi marcare in un tocco tutte le puntate già in onda della stagione (premilo di nuovo per toglierle). Quando riapri una serie riparti dalla stagione dell'ultima puntata vista e «Guarda ora» apre direttamente la prima puntata non ancora vista. Se una stagione o un episodio non compare nell'elenco (perché non è elencato da TMDB), scegli <strong>«Altro…»</strong> e digita il numero a mano: la tua scelta viene ricordata.</p>

<h3>La sorgente</h3>
<p>BlameFlix non contiene sorgenti di streaming: apre semplicemente l'URL del servizio che scegli tu. Nelle <strong>Impostazioni</strong> inserisci il template per i film e quello per le serie. L'app sostituisce i segnaposto <code>{id}</code>, <code>{type}</code>, <code>{season}</code> e <code>{episode}</code> con i valori del titolo (es. <code>https://esempio.com/watch?id={id}&s={season}&e={episode}</code>). Se il template non contiene segnaposto, l'URL viene aperto esattamente com'è. Sono accettati solo collegamenti <strong>http/https</strong>: magnet, torrent e altri protocolli non sono supportati. Se un template è vuoto, il pulsante «Guarda ora» non è attivo.</p>
<p>Nella scheda di un titolo puoi impostare una <strong>sorgente specifica</strong> che ha la precedenza su quella globale: premi <strong>«Sorgente: globale»</strong> sotto i pulsanti, inserisci il template e salvalo con «Usa per questo titolo». Con «Usa quella globale» torni al comportamento predefinito. Le sorgenti per titolo sono salvate nel dispositivo e incluse nel backup.</p>

<h3>Aggiornamenti</h3>
<p>BlameFlix controlla su GitHub se è disponibile una nuova versione e, se c'è, mostra un avviso con il link alla pagina di download. Puoi anche verificare a mano nelle <strong>Impostazioni</strong> («Verifica aggiornamenti»), dove vedi la versione installata. Su Android l'APK nuovo si installa <strong>sopra</strong> quello già presente, senza disinstallare nulla.</p>

<h3>Disclaimer di avvio</h3>
<p>Al primo utilizzo BlameFlix mostra un avviso legale sull'uso dell'app: l'avvio è sbloccato solo dopo l'accettazione (attivabile dopo 10 secondi). L'accettazione è ricordata e non viene più richiesta alle aperture successive.</p>

<h3>Notifiche di rilascio</h3>
<p>BlameFlix può avvisarti quando esce una <strong>nuova puntata</strong> di una serie della tua sala (alla data di messa in onda). Il controllo avviene automaticamente all'apertura dell'app, a intervalli regolari configurabili nelle Impostazioni (ogni 8, 12, 24 o 48 ore) e manualmente con il tasto <strong>«⟳ Sincronizzazione»</strong> nella sala.</p>
<p>Ogni nuova uscita finisce anche nella cronologia <strong>«Novità»</strong> in home: toccando una voce apri la scheda del titolo e con <strong>«Svuota»</strong> puoi azzerarla. Le puntate che hai già segnato come viste non vengono considerate nuove.</p>
<p>Nelle <strong>Impostazioni</strong> la sezione notifiche è semplice: <strong>«Abilita notifiche»</strong> e <strong>«Notifiche per le nuove puntate»</strong>. Puoi regolare la frequenza della <strong>sincronizzazione automatica</strong> e inviare una <strong>notifica di prova</strong>. Su Android la prima notifica chiede il permesso di sistema e toccando una notifica si apre la scheda della serie. Le date arrivano da TMDB: se mancano o cambiano, gli avvisi arrivano al primo controllo utile.</p>

<h3>Legalità dei contenuti</h3>
<p>BlameFlix è un lettore generico: le sorgenti di streaming le configuri tu nelle Impostazioni. Sei <strong>responsabile della legalità dei contenuti</strong> a cui accedi tramite la tua sorgente, secondo le leggi del tuo Paese. In Italia l'accesso a streaming non autorizzato può comportare sanzioni amministrative (legge 93/2023) e sono in discussione multe più severe. BlameFlix non fornisce né segnala alcuna sorgente di contenuti.</p>

<h3>Backup dei dati</h3>
<p>Con <strong>«Crea backup»</strong> salvi un file con i tuoi dati: i titoli salvati, le puntate viste (stagione ed episodio per ogni serie), gli ultimi film e serie visti, la cronologia «Novità», la tua chiave personale e le preferenze di visualizzazione. Il programma ti chiede dove salvare il file.</p>
<p>Con <strong>«Ripristina»</strong> scegli il file di backup salvato in precedenza e BlameFlix riporta al suo posto tutti i dati. Il backup contiene solo gli identificativi dei titoli: al ripristino i dettagli vengono riscaricati da TMDB, quindi serve una connessione internet. I titoli non scaricabili compaiono comunque come card senza dati e i dettagli si caricano appena li apri.</p>

<h3>I titoli non si caricano</h3>
<p>BlameFlix riceve i dati dei titoli da TMDB. Se la ricerca o le schede non si caricano, assicurati di essere connesso a internet. In caso di problemi, nelle Impostazioni puoi inserire una chiave personale gratuita, ottenibile su themoviedb.org nella sezione API.</p>

<h3>Privacy</h3>
<p>Tutti i tuoi dati restano sul dispositivo e non vengono inviati a nessuno, a parte le normali richieste a TMDB per cercare i titoli. Conserva bene il file di backup: contiene i tuoi dati personali. Per i dettagli, consulta la privacy policy del progetto.</p>

<h3>Crediti</h3>
<p><img src="tmdb.svg" alt="The Movie Database (TMDB)" class="docs-tmdb"></p>
<p><em>This product uses the TMDB API but is not endorsed or certified by TMDB.</em></p>
<p>Questo prodotto usa l'API TMDB ma non è approvato né certificato da TMDB. Titoli, testi e immagini provengono da <a href="https://www.themoviedb.org" target="_blank" rel="noopener">The Movie Database (TMDB)</a>, che non è affiliato a questa applicazione. Le immagini dei poster sono mostrate per la sola consultazione del catalogo.</p>`,
        'footer.tmdb': `This product uses the TMDB API but is not endorsed or certified by TMDB.<br>Questo prodotto usa l'API TMDB ma non è approvato né certificato da TMDB. The Movie Database (TMDB) non è affiliato a questa applicazione.`,
        'disclaimer.legal': 'Avviso legale',
        'disclaimer.title': 'ATTENZIONE',
        'disclaimer.accept': 'Accetta',
        'disclaimer.body': `<p>Questa applicazione è di proprietà di <strong>padelle2603</strong> e tutelata dalla legge sul diritto d'autore, va usata nel rispetto delle norme europee ed italiane sulla visione di contenuti soggetti a proprietà intellettuale, il proprietario non assume alcuna responsabilità sull'uso illegale della stessa, e si riserva ogni diritto ragione ed azione a propria tutela compreso il ricorso alle autorità competenti qualora dall'uso illecito che ne fa l'utente, gliene derivi un danno di qualsiasi natura, solo cliccando su accetta queste condizioni, il programma si avvierà.</p>`,
        'common.noTitle': 'Senza titolo',
        'common.special': 'Speciale',
        'common.other': 'Altro…',
        'common.tvKind': 'SERIE',
        'common.movieKind': 'FILM',
        'common.tvKindLong': 'SERIE TV',
        'common.movieKindLong': 'FILM',
        'common.saved': 'SALVATO',
        'common.toWatch': 'da vedere',
        'common.sync': 'Sincronizza',
        'common.syncing': '⟳ …',
        'episode.label': 'Episodio {n}',
        'episode.watched': '✓ Vista',
        'episode.removeFromWatched': 'Togli da viste',
        'episode.markWatched': 'Segna come vista',
        'episode.watch': '▶ Guarda',
        'episode.watchAgain': '↻ Rivisualizza',
        'episode.airingOn': 'In uscita il {date}',
        'episode.markAllWatched': '✓ Segna tutte come viste',
        'episode.markAllUnwatched': 'Segna tutte come non viste',
        'msg.allWatched': '✓ Tutto visto',
        'msg.linkCopied': 'Link copiato negli appunti',
        'msg.unwatchedCount': { one: '1 puntata da vedere', other: '{n} puntate da vedere' },
        'msg.countingEpisodes': 'Conto puntate…',
        'msg.releaseBody': '«{title}» · nuova puntata S{season}E{episode} in catalogo',
        'msg.releaseBodyNetwork': '«{title}» · S{season}E{episode} su {network}',
        'msg.movieReleased': '«{title}» · il film è ora in catalogo',
        'msg.syncAlreadyRunning': 'Sincronizzazione già in corso',
        'msg.markedWatchedFromNotification': 'Puntata segnata come vista',
        'toast.errorTitle': 'Errore',
        'msg.moreReleases': '\n+{n} altro',
        'msg.firstSync': 'Prima sincronizzazione completata: da ora riceverai gli avvisi di rilascio.',
        'msg.noNewReleases': 'Nessuna nuova uscita: tutto aggiornato.',
        'msg.needKey': 'Serve la chiave TMDB per verificare le uscite. Impostala nelle Impostazioni.',
        'msg.emptyRoomForSync': 'La sala è vuota: non c\'è nulla da controllare.',
        'msg.networkError': 'Errore di rete',
        'msg.networkErrorDesc': 'Non riusciamo a contattare l\'archivio. Controlla la connessione e riprova.',
        'msg.detailLoadError': 'Errore nel caricamento dei dettagli',
        'msg.episodesLoadError': 'Impossibile caricare gli episodi. Controlla la connessione e riprova.',
        'msg.noEpisodes': 'Nessun episodio elencato da TMDB per questa stagione. Usa «Altro…» per sceglierne uno a mano.',
        'msg.errFileSharing': 'Protocolli di file-sharing (magnet, torrent, ed2k) non supportati: usa un collegamento http/https.',
        'msg.errOnlyHttp': 'Solo collegamenti http/https supportati.',
        'msg.errInvalidLink': 'Inserisci un collegamento http/https valido.',
        'msg.saved': 'Salvato ✓',
        'msg.keyRemoved': 'Chiave rimossa · imposta una chiave per cercare',
        'msg.requestingPerms': 'Richiesta permessi…',
        'msg.permsDenied': 'Permesso di notifica non concesso',
        'msg.testNotifyBody': 'Notifica di prova: così ti avviseremo delle nuove uscite.',
        'msg.testNotifySent': 'Notifica di prova inviata ✓',
        'msg.testNotifyUnavailable': 'Notifiche di sistema non disponibili qui',
        'msg.checkingUpdates': 'Verifica in corso…',
        'msg.newVersionAvailable': 'Nuova versione {tag} disponibile',
        'msg.upToDate': 'Sei aggiornato ✓',
        'msg.updateCheckFailed': 'Impossibile verificare gli aggiornamenti',
        'msg.updateRateLimit': 'Limite richieste GitHub raggiunto · riprova tra {min} min',
        'msg.updateRateLimitSoon': 'Limite richieste GitHub raggiunto · riprova tra poco',
        'msg.updateTimeout': 'GitHub non risponde (timeout)',
        'msg.updateNetwork': 'Connessione non disponibile',
        'msg.writePermDenied': 'Permesso di scrittura negato',
        'msg.saveBackupDialog': 'Salva il backup',
        'msg.backupCreatedChoose': 'Backup creato: scegli dove salvarlo ✓',
        'msg.backupCreatedShareCancelled': 'Backup creato ✓ · condivisione annullata',
        'msg.backupNotShared': 'Backup creato, ma non condiviso',
        'msg.backupSaved': 'Backup salvato ✓',
        'msg.backupSaveError': 'Impossibile salvare il file',
        'msg.saveCancelled': 'Salvataggio annullato',
        'msg.backupRestored': 'Backup ripristinato ✓',
        'msg.backupInvalid': 'File di backup non valido',
        'msg.backupReadError': 'Impossibile leggere il file',
        'msg.backupDecryptError': 'Impossibile decrittografare la chiave. Verifica che la chiave TMDB sia corretta.',
        'msg.cloudConfigSaved': 'Configurazione cloud salvata ✓',
        'msg.cloudTokenGenerated': 'Token generato ✓',
        'msg.cloudTokenCopy': 'Salva questo token: serve per accedere ai tuoi dati da un altro dispositivo.',
        'msg.cloudPushed': 'Dati caricati sul cloud ✓',
        'msg.cloudPulled': 'Dati scaricati dal cloud ✓',
        'msg.cloudNotConfigured': 'Configura prima il sync cloud nelle Impostazioni.',
        'msg.cloudPushError': 'Errore durante il caricamento sul cloud.',
        'msg.cloudPullError': 'Errore durante lo scaricamento dal cloud.',
        'msg.cloudEmpty': 'Nessun dato trovato nel cloud.',
        'msg.dataDeleted': 'Dati eliminati ✓',
        'msg.acceptableIn': 'Accettabile tra {n}s',
        'msg.acceptToStart': 'Accetta per avviare BlameFlix',
        'toast.newReleases': 'Nuove uscite in sala',
        'toast.noSource': 'Sorgente non disponibile',
        'tutorial.kicker': 'Guida rapida',
        'tutorial.skip': 'Salta',
        'tutorial.prev': 'Indietro',
        'tutorial.next': 'Avanti',
        'tutorial.done': 'Fine',
        'tutorial.step1Title': 'Benvenuto in BlameFlix',
        'tutorial.step1Body': 'La tua sala personale per film e serie TV. Questo giro veloce mostra l\'essenziale — puoi saltarlo quando vuoi.',
        'tutorial.step2Title': 'Chiave TMDB e sorgente',
        'tutorial.step2Body': 'Imposta la tua chiave TMDB gratuita e un URL sorgente (dove guardare). Senza di essi non puoi cercare né usare «Guarda ora». Li trovi nelle Impostazioni.',
        'tutorial.step3Title': 'Ricerca',
        'tutorial.step3Body': 'Cerca qui un film o una serie. Apri il risultato per aggiungerlo alla tua sala.',
        'tutorial.step4Title': 'La tua sala',
        'tutorial.step4Body': 'I titoli salvati vivono qui. Il contatore mostra quante puntate mancano da vedere.',
        'tutorial.step5Title': 'Menu libreria',
        'tutorial.step5Body': 'Filtra per film/serie, passa da griglia a lista e riordina le righe dal menu ⋮.',
        'tutorial.step6Title': 'Sincronizza le uscite',
        'tutorial.step6Body': 'Tocca ⟳ per controllare nuove puntate e film nella tua sala, o lascia che lo faccia in automatico.',
        'tutorial.step7Title': 'La scheda titolo',
        'tutorial.step7Body': 'Apri un titolo: «Guarda ora» apre la tua sorgente e, per le serie, puoi segnare le puntate come viste stagione per stagione.',
        'settings.replayTutorial': 'Rivedi il tutorial',
        'settings.replayTutorialHint': 'Mostra di nuovo il tour guidato del primo avvio.',
        'notify.releases': 'BlameFlix · Rilasci'
    },
    en: {
        'nav.home': 'Back to your homepage',
        'nav.settings': 'Settings',
        'nav.skip': 'Skip to content',
        'notice.nokey': '⚠ No TMDB key · cannot search',
        'notice.setkey': 'Set the key',
        'notice.noresolver': '⚠ No source configured · «Watch now» is off',
        'notice.configsource': 'Configure the source',
        'notice.downloadGitHub': 'Download from GitHub',
        'notice.downloadApk': 'Download APK',
        'notice.dismiss': 'Dismiss this update',
        'notice.updateAvailable': '⚠ New version {tag} available on GitHub',
        'update.popupTitle': 'New version available',
        'update.popupBody': 'BlameFlix {latest} is available. Your installed version is {current}.',
        'update.later': 'Later',
        'search.label': 'Search a title',
        'search.placeholder': 'Search movies or TV series…',
        'search.clearAria': 'Back to your homepage',
        'home.news': 'News',
        'home.clearNews': 'Clear',
        'home.tmdbArchive': 'TMDB Archive',
        'home.kindMovies': 'Movies',
        'home.kindSeries': 'TV Series',
        'home.scrollPrev': 'Scroll back',
        'home.scrollNext': 'Scroll forward',
        'home.searchResults': 'Results for «{q}»',
        'home.noTitles': 'No titles in your room',
        'home.emptyRoom': 'Your room is empty. Search the first movie or series above to get started.',
        'home.emptyFilter': 'No titles',
        'home.emptyFilterDesc': 'No {label} found with these criteria.',
        'home.noResults': 'No results',
        'home.noResultsDesc': 'We found nothing for this search. Try another title.',
        'tools.filterBy': 'Filter by type',
        'filter.movie': 'movies',
        'filter.tv': 'series',
        'filter.all': 'titles',
        'tools.all': 'All',
        'tools.movie': 'Movies',
        'tools.tv': 'Series',
        'tools.viewMode': 'Change the view',
        'tools.grid': 'Grid',
        'tools.list': 'List',
        'tools.sync': 'Check new releases',

        'tools.menu': 'Library options',

        'tools.sortSection': 'Sort by',
        'tools.sortAdded': 'Added',
        'tools.sortAlpha': 'Alphabetical',
        'tools.sortRelease': 'Release date',
        'tools.sortRating': 'Rating',

        'tools.orderSection': 'Movie/series row order',

        'tools.swap': '⇅ Swap',
        'detail.back': '← Back',
        'detail.posterAlt': 'Poster',
        'detail.sheet': 'Title sheet',
        'detail.year': 'Year',
        'detail.revealHint': 'Tap to reveal',
        'detail.share': 'Share',
        'detail.tmdb': 'Open on TMDB',
        'detail.markAllAired': '✓ Mark all seasons as watched',
        'detail.markAllAiredUnwatched': 'Unmark all seasons',
        'detail.watchNow': '↗ Open in browser',
        'detail.sourceForTitle': 'Source for this title',
        'detail.sourceOverridePlaceholder': 'https://example.com/title/{id}/',
        'detail.sourceOverrideHint': 'If empty, «Watch now» uses the global source from Settings. Use the {id}, {type}, {season}, {episode} placeholders to insert id, season and episode into the URL: without placeholders the URL is opened as it is. Only http/https links.',
        'detail.useForTitle': 'Use for this title',
        'detail.useGlobal': 'Use the global one',
        'detail.season': 'Season',
        'detail.episode': 'Episode',
        'detail.customHint': 'Seasons or episodes not listed by TMDB',
        'detail.episodes': 'Episodes',
        'detail.sourceGlobal': 'Source: global',
        'detail.sourceCustom': 'Source: custom',
        'detail.networkGlobal': 'Network: —',
        'detail.networkCustom': 'Network: {name}',
        'detail.networkNone': '— None —',
        'detail.networkSelectLabel': 'Broadcaster / Network',
        'detail.networkForTitle': 'Network schedule for this title',
        'detail.networkPlaceholder': 'https://example.com/schedule/{id}',
        'detail.networkOverrideHint': 'Paste the URL of an external source that returns the network schedule as JSON (placeholders {id}, {networkId}, {networkName}). The endpoint must be reachable from the browser: if the source blocks CORS, route it through a proxy you control. http/https only.',
        'detail.savedRemove': '✓ Saved · remove',
        'detail.addSaved': '+ Add to saved',
        'detail.noOverview': 'No description available.',
        'settings.preferences': 'Preferences',
        'settings.tab.api': 'API & Sources',
        'settings.tab.notify': 'Notifications',
        'settings.tab.preferences': 'Preferences',
        'settings.tab.data': 'Data',
        'settings.tab.cloud': 'Cloud',
        'settings.tab.updates': 'Updates',
        'settings.tab.help': 'Help',
        'settings.title': 'Settings',
        'settings.close': '× Close',
        'settings.apiKey': 'TMDB API key',
        'settings.apiKeyPlaceholder': 'Enter your personal key',
        'settings.apiKeyHint': 'The personal key is free and obtained on themoviedb.org → Settings → API. Without a key you cannot search titles.',
        'settings.sourceMovie': 'Movie source',
        'settings.sourceMoviePlaceholder': 'https://example.com/movie/{id}/',
        'settings.sourceTv': 'Series source',
        'settings.sourceTvPlaceholder': 'https://example.com/tv/{id}/{season}/{episode}/',
        'settings.sourceHint': 'The app opens the URL of the source you configure, replacing the {id}, {type}, {season}, {episode} placeholders with the values of the title. Without placeholders the URL is opened exactly as it is. Only http/https links: magnet, torrent and other protocols are not supported. If you leave it empty, «Watch now» is off.',
        'settings.browser': 'Link opening',
        'settings.browserDefault': 'Default',
        'settings.browserAsk': 'Ask every time',
        'settings.browserHint': 'How to open content links: with the default browser (Chrome Custom Tabs) or choosing each time.',
        'settings.notify': 'Release notifications',
        'settings.notifyHint': 'We warn you when a new episode of a series or a movie from your room is released. The news also stays in the «News» history on the home page. The check happens when the app opens, automatically at regular intervals and with the «⟳ Sync» button in your room. On Android the system notification permission is required.',
        'settings.notifyMovies': 'Notifications for movie releases',
        'settings.notifyEnable': 'Enable notifications',
        'settings.notifyTv': 'Notifications for new episodes',
        'settings.notifyInterval': 'Automatic sync',
        'settings.every8': 'Every 8 hours',
        'settings.every12': 'Every 12 hours',
        'settings.every24': 'Every 24 hours',
        'settings.every48': 'Every 48 hours',
        'settings.testNotify': '🔔 Test notification',
        'settings.save': 'Save',
        'settings.language': 'Language',
        'settings.langHint': 'Interface language. Automatically detected on first launch.',
        'settings.backup': 'Data backup',
        'settings.backupHint': 'Save your data (saved titles, watched episodes, last plays, custom seasons, news and preferences) and restore it later. The backup only contains the identifiers of the titles: on restore the details are downloaded again from TMDB (connection required).',
        'settings.backupCreate': '⬇ Create backup',
        'settings.backupRestore': '⬆ Restore',
        'settings.dataDelete': 'Delete data',
        'settings.dataDeleteHint': 'Irreversibly deletes your watchlist, watched episodes, last plays, custom seasons, news and preferences. The API key, language and legal consent are kept.',
        'settings.dataDeleteBtn': '🗑 Delete data',
        'settings.dataDeleteConfirm': 'Are you sure? All data (watchlist, watched episodes, preferences) will be deleted permanently.',
        'cloud.title': 'Cloud sync',
        'cloud.hint': 'Sync your data with your own personal Supabase space. It is entirely optional: data stays on the device until you configure and enable the sync. Before syncing, the data is encrypted on the device with a personal secret token, so it remains unreadable even to anyone with access to the database. The API key and sources stay on the device only and in the local backup.',
        'cloud.enabled': 'Cloud sync enabled',
        'cloud.url': 'Supabase URL',
        'cloud.anonKey': 'Anonymous key (anon key)',
        'cloud.token': 'Personal secret token',
        'cloud.tokenHint': 'Generate a token and save it: it is needed to access your data from another device. On a second device, paste the same token to sync the same data.',
        'cloud.generate': '🎲 Generate token',
        'cloud.push': 'Upload to cloud',
        'cloud.pull': 'Download from cloud',
        'cloud.listTitle': 'Cloud sync',
        'settings.updates': 'Updates',
        'settings.version': 'Installed version:',
        'settings.updatesHint': 'BlameFlix checks GitHub for a new version and notifies you at startup. You can check manually whenever you want.',
        'settings.updatesWebOnly': 'Update checks are only available in the installed apps (Android and desktop).',
        'settings.checkUpdates': '⟳ Check for updates',
        'settings.lastCheck': 'Last successful check: {date}',
        'settings.goRelease': 'Go to the release',
        'settings.help': 'Help',
        'settings.helpHint': 'Questions about using BlameFlix? Everything is explained in the guide.',
        'settings.docs': '❓ Documentation',
        'docs.guide': 'Guide',
        'docs.title': 'Documentation',
        'docs.close': '× Close',
        'docs.body': `
<p class="docs-hint">How to use BlameFlix</p>

<h3>What is BlameFlix</h3>
<p>BlameFlix is your personal screening room: a catalog where you collect the movies and TV series you care about. You can search titles, keep them in your saved list and watch them whenever you want, always picking up where you left off.</p>

<h3>Searching and saving a title</h3>
<p>Use the search bar at the top to find a movie or a series. Open the sheet of the title you are interested in and press <strong>«+ Add to saved»</strong>: the title enters your room, where it stays until you remove it. You can filter your room by <strong>All</strong>, <strong>Movies</strong> or <strong>Series</strong> and choose between the grid and list views.</p>

<h3>Watching a movie</h3>
<p>Open the movie sheet and press <strong>«↗ Open in browser»</strong>. BlameFlix opens the URL of the <strong>source</strong> you configured in the Settings. On a phone it opens the external app, on a computer a new window.</p>

<h3>Watching a TV series</h3>
<p>In a series sheet choose the <strong>season</strong> from the selector: below you will see the <strong>episodes</strong> of that season, with thumbnail, title and description. Press «▶ Watch» on the episode you want to see. Episodes you already watched appear <strong>greyed out</strong> with the «✓ WATCHED» badge; episodes that have not aired yet stay locked until their air date.</p>
<p>BlameFlix automatically marks the episode you watch as seen, but you can change this by clicking the «✓ WATCHED» badge of an episode. With the <strong>«Mark all as watched»</strong> button at the top of the list you can mark, in one tap, all the episodes that have already aired in the season (press it again to unmark them). When you reopen a series you restart from the season of the last episode you watched, and "Watch now" opens straight to the first episode you have not seen yet. If a season or an episode does not appear in the list (because TMDB does not list it), choose <strong>«Other…»</strong> and type the number by hand: your choice is remembered.</p>

<h3>The source</h3>
<p>BlameFlix does not contain streaming sources: it simply opens the URL of the service you choose. In the <strong>Settings</strong> you enter the template for movies and the one for series. The app replaces the <code>{id}</code>, <code>{type}</code>, <code>{season}</code> and <code>{episode}</code> placeholders with the values of the title (e.g. <code>https://example.com/watch?id={id}&s={season}&e={episode}</code>). If the template has no placeholders, the URL is opened exactly as it is. Only <strong>http/https</strong> links are accepted: magnet, torrent and other protocols are not supported. If a template is empty, the «Watch now» button is disabled.</p>
<p>In a title sheet you can set a <strong>title-specific source</strong> that overrides the global one: press <strong>«Source: global»</strong> under the buttons, enter the template and save it with «Use for this title». With «Use the global one» you go back to the default behaviour. Title-specific sources are stored on the device and included in the backup.</p>

<h3>Updates</h3>
<p>BlameFlix checks GitHub for a new version and, if there is one, shows a notice with a link to the download page. You can also check manually in the <strong>Settings</strong> («Check for updates»), where you can see the installed version. On Android the new APK installs <strong>over</strong> the existing one, without uninstalling anything.</p>

<h3>Startup disclaimer</h3>
<p>On first use BlameFlix shows a legal notice about the use of the app: startup is unlocked only after acceptance (available after 10 seconds). The acceptance is remembered and is not requested again on later openings.</p>

<h3>Release notifications</h3>
<p>BlameFlix can warn you when a <strong>new episode</strong> of a series in your room comes out (on its air date). The check happens automatically when the app opens, at regular configurable intervals in the Settings (every 8, 12, 24 or 48 hours) and manually with the <strong>«⟳ Sync»</strong> button in your room.</p>
<p>Every new release also lands in the <strong>«News»</strong> history on the home page: tapping an entry opens the title sheet and with <strong>«Clear»</strong> you can empty it. Episodes you already marked as watched are not considered new.</p>
<p>In the <strong>Settings</strong> the notifications section is simple: <strong>«Enable notifications»</strong> and <strong>«Notifications for new episodes»</strong>. You can adjust the <strong>automatic sync</strong> frequency and send a <strong>test notification</strong>. On Android the first notification asks for the system permission, and tapping a notification opens the series sheet. Dates come from TMDB: if they are missing or change, the alerts arrive at the first useful check.</p>

<h3>Content legality</h3>
<p>BlameFlix is a generic player: the streaming sources are configured by you in the Settings. You are <strong>responsible for the legality of the content</strong> you access through your source, according to the laws of your country. In Italy, access to unauthorized streaming can lead to administrative fines (law 93/2023) and harsher fines are being discussed. BlameFlix does not provide nor point to any content source.</p>

<h3>Data backup</h3>
<p>With <strong>«Create backup»</strong> you save a file with your data: the saved titles, the episodes you watched (season and episode for each series), the last movies and series you watched, the «News» history, your personal key and the display preferences. The app asks you where to save the file.</p>
<p>With <strong>«Restore»</strong> you choose a previously saved backup file and BlameFlix puts all your data back in place. The backup only contains the identifiers of the titles: on restore the details are downloaded again from TMDB, so an internet connection is needed. Titles that cannot be downloaded still appear as cards without data and the details load as soon as you open them.</p>

<h3>Titles don't load</h3>
<p>BlameFlix receives title data from TMDB. If the search or the sheets don't load, make sure you are connected to the internet. If there are problems, in the Settings you can enter a free personal key, obtainable on themoviedb.org in the API section.</p>

<h3>Privacy</h3>
<p>All your data stays on your device and is not sent to anyone, apart from the normal requests to TMDB to search titles. Keep your backup file safe: it contains your personal data. For details, see the project's privacy policy.</p>

<h3>Credits</h3>
<p><img src="tmdb.svg" alt="The Movie Database (TMDB)" class="docs-tmdb"></p>
<p><em>This product uses the TMDB API but is not endorsed or certified by TMDB.</em></p>
<p>This product uses the TMDB API but is not endorsed or certified by TMDB. Titles, texts and images come from <a href="https://www.themoviedb.org" target="_blank" rel="noopener">The Movie Database (TMDB)</a>, which is not affiliated with this application. Poster images are shown only for catalog browsing.</p>`,
        'footer.tmdb': `This product uses the TMDB API but is not endorsed or certified by TMDB.<br>The Movie Database (TMDB) is not affiliated with this application.`,
        'disclaimer.legal': 'Legal notice',
        'disclaimer.title': 'WARNING',
        'disclaimer.accept': 'Accept',
        'disclaimer.body': `<p>This application is owned by <strong>padelle2603</strong> and protected by copyright law. It must be used in compliance with the European and Italian rules on viewing content subject to intellectual property. The owner assumes no responsibility for its illegal use and reserves every right, reason and action for its own protection, including recourse to the competent authorities, should the user's unlawful use cause it any harm of any kind. The program will start only after you click Accept to these conditions.</p>`,
        'common.noTitle': 'Untitled',
        'common.special': 'Special',
        'common.other': 'Other…',
        'common.tvKind': 'SERIES',
        'common.movieKind': 'MOVIE',
        'common.tvKindLong': 'TV SERIES',
        'common.movieKindLong': 'MOVIE',
        'common.saved': 'SAVED',
        'common.toWatch': 'to watch',
        'common.sync': 'Sync',
        'common.syncing': '⟳ …',
        'episode.label': 'Episode {n}',
        'episode.watched': '✓ Watched',
        'episode.removeFromWatched': 'Remove from watched',
        'episode.markWatched': 'Mark as watched',
        'episode.watch': '▶ Watch',
        'episode.watchAgain': '↻ Rewatch',
        'episode.airingOn': 'Airs on {date}',
        'episode.markAllWatched': '✓ Mark all as watched',
        'episode.markAllUnwatched': 'Mark all as unwatched',
        'msg.allWatched': '✓ All watched',
        'msg.linkCopied': 'Link copied to clipboard',
        'msg.unwatchedCount': { one: '1 episode to watch', other: '{n} episodes to watch' },
        'msg.countingEpisodes': 'Counting episodes…',
        'msg.releaseBody': '«{title}» · new episode S{season}E{episode} in catalog',
        'msg.releaseBodyNetwork': '«{title}» · S{season}E{episode} on {network}',
        'msg.movieReleased': '«{title}» · the movie is now available',
        'msg.syncAlreadyRunning': 'Sync already running',
        'msg.markedWatchedFromNotification': 'Episode marked as watched',
        'toast.errorTitle': 'Error',
        'msg.moreReleases': '\n+{n} more',
        'msg.firstSync': 'First sync completed: from now on you will receive release alerts.',
        'msg.noNewReleases': 'No new releases: everything is up to date.',
        'msg.needKey': 'A TMDB key is required to check releases. Set it in the Settings.',
        'msg.emptyRoomForSync': 'The room is empty: nothing to check.',
        'msg.networkError': 'Network error',
        'msg.networkErrorDesc': 'We cannot reach the archive. Check your connection and try again.',
        'msg.detailLoadError': 'Error loading the details',
        'msg.episodesLoadError': 'Unable to load the episodes. Check your connection and try again.',
        'msg.noEpisodes': 'No episodes listed by TMDB for this season. Use «Other…» to pick one by hand.',
        'msg.errFileSharing': 'File-sharing protocols (magnet, torrent, ed2k) are not supported: use an http/https link.',
        'msg.errOnlyHttp': 'Only http/https links are supported.',
        'msg.errInvalidLink': 'Enter a valid http/https link.',
        'msg.saved': 'Saved ✓',
        'msg.keyRemoved': 'Key removed · set a key to search',
        'msg.requestingPerms': 'Requesting permissions…',
        'msg.permsDenied': 'Notification permission not granted',
        'msg.testNotifyBody': 'Test notification: this is how we will alert you about new releases.',
        'msg.testNotifySent': 'Test notification sent ✓',
        'msg.testNotifyUnavailable': 'System notifications are not available here',
        'msg.checkingUpdates': 'Checking…',
        'msg.newVersionAvailable': 'New version {tag} available',
        'msg.upToDate': 'You are up to date ✓',
        'msg.updateCheckFailed': 'Could not check for updates',
        'msg.updateRateLimit': 'GitHub rate limit reached · try again in {min} min',
        'msg.updateRateLimitSoon': 'GitHub rate limit reached · try again shortly',
        'msg.updateTimeout': 'GitHub is not responding (timeout)',
        'msg.updateNetwork': 'Connection unavailable',
        'msg.writePermDenied': 'Write permission denied',
        'msg.saveBackupDialog': 'Save the backup',
        'msg.backupCreatedChoose': 'Backup created: choose where to save it ✓',
        'msg.backupCreatedShareCancelled': 'Backup created ✓ · share cancelled',
        'msg.backupNotShared': 'Backup created, but not shared',
        'msg.backupSaved': 'Backup saved ✓',
        'msg.backupSaveError': 'Unable to save the file',
        'msg.saveCancelled': 'Save cancelled',
        'msg.backupRestored': 'Backup restored ✓',
        'msg.backupInvalid': 'Invalid backup file',
        'msg.backupReadError': 'Unable to read the file',
        'msg.backupDecryptError': 'Cannot decrypt the key. Verify the TMDB key is correct.',
        'msg.cloudConfigSaved': 'Cloud config saved ✓',
        'msg.cloudTokenGenerated': 'Token generated ✓',
        'msg.cloudTokenCopy': 'Save this token: it is needed to access your data from another device.',
        'msg.cloudPushed': 'Data uploaded to cloud ✓',
        'msg.cloudPulled': 'Data downloaded from cloud ✓',
        'msg.cloudNotConfigured': 'Configure cloud sync in Settings first.',
        'msg.cloudPushError': 'Error uploading data to cloud.',
        'msg.cloudPullError': 'Error downloading data from cloud.',
        'msg.cloudEmpty': 'No data found in cloud.',
        'msg.dataDeleted': 'Data deleted ✓',
        'msg.acceptableIn': 'Can be accepted in {n}s',
        'msg.acceptToStart': 'Accept to start BlameFlix',
        'toast.newReleases': 'New releases in your room',
        'toast.noSource': 'Source not available',
        'tutorial.kicker': 'Quick tour',
        'tutorial.skip': 'Skip',
        'tutorial.prev': 'Back',
        'tutorial.next': 'Next',
        'tutorial.done': 'Done',
        'tutorial.step1Title': 'Welcome to BlameFlix',
        'tutorial.step1Body': 'Your personal screening room for movies and series. This quick tour shows the essentials — you can skip it anytime.',
        'tutorial.step2Title': 'Your TMDB key & source',
        'tutorial.step2Body': 'Set your free TMDB API key and a source URL (where to watch). Without them you cannot search or use "Watch now". Both are in Settings.',
        'tutorial.step3Title': 'Search',
        'tutorial.step3Body': 'Look up any movie or series here. Open the result to add it to your room.',
        'tutorial.step4Title': 'Your room',
        'tutorial.step4Body': 'Saved titles live here. The counter shows how many episodes are left to watch.',
        'tutorial.step5Title': 'Library menu',
        'tutorial.step5Body': 'Filter by movies/series, switch grid/list view and reorder the rows from the ⋮ menu.',
        'tutorial.step6Title': 'Sync new releases',
        'tutorial.step6Body': 'Tap ⟳ to check for new episodes and movies in your room, or let it run automatically.',
        'tutorial.step7Title': 'The title sheet',
        'tutorial.step7Body': 'Open any title: "Watch now" opens your source, and for series you can mark episodes as watched season by season.',
        'settings.replayTutorial': 'Replay tutorial',
        'settings.replayTutorialHint': 'Show the first-launch guided tour again.',
        'notify.releases': 'BlameFlix · Releases'
    }
};

// Additional language packs (es, fr, de, ru, zh, hi) kept in their own module
// to keep this file readable; merged into the main I18N table below.
Object.assign(I18N, EXTRA_LANGS);

// Translation lookup: current language, fallback to Italian.
function t(key, vars) {
    const table = I18N[state.lang] || I18N.it;
    let s = table[key];
    if (s === undefined) s = I18N.it[key];
    if (s === undefined) s = key;
    if (vars) {
        for (const k of Object.keys(vars)) {
            s = String(s).replaceAll(`{${k}}`, vars[k]);
        }
    }
    return s;
}

// Plural-aware lookup for entries shaped { one, other }.
function tp(key, n) {
    const table = I18N[state.lang] || I18N.it;
    const entry = table[key] || I18N.it[key] || { one: key, other: key };
    const val = n === 1 ? entry.one : entry.other;
    return String(val).replaceAll('{n}', n);
}

// Locale used for dates and TMDB requests.
function locale() {
    return langMeta(state.lang).locale;
}

// Applies the current language to every static and dynamic element.
function applyLanguage() {
    document.documentElement.lang = state.lang;
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    document.querySelectorAll('[data-i18n-title]').forEach(el => { el.setAttribute('title', t(el.dataset.i18nTitle)); });
    document.querySelectorAll('[data-i18n-alt]').forEach(el => { el.setAttribute('alt', t(el.dataset.i18nAlt)); });
    document.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
    syncTools();
    if (typeof syncNotifySettingsInputs === 'function') syncNotifySettingsInputs();
    renderNewsSection();
    if (state.currentMedia && !detailView.hidden) {
        showDetails(state.currentMedia.id, state.currentMedia.media_type);
    } else {
        renderHome();
    }
    syncResolverOverrideBtn();
    if (state.currentMedia) updateWatchlistBtn();
    if (state.latestRelease) showUpdateNotice(state.latestRelease);
    if (typeof syncUpdatePopup === 'function' && updatePopup && !updatePopup.hidden) syncUpdatePopup();
    // The Android notification action title is localized: re-register it.
    registerNotificationActions();
}

// Switches the language (and optionally persists the choice).
function setLanguage(newLang, persist) {
    if (!LANG_CODES.includes(newLang)) return;
    state.lang = newLang;
    if (persist) localStorage.setItem(LANG_STORAGE, state.lang);
    // All the TMDB caches hold localized text: everything is dropped so
    // titles, seasons and episode names re-download in the new locale.
    detailsCache.clear();
    seasonEpisodesCache.clear();
    tvSeasonsCache.clear();
    searchCache.clear();
    // The in-memory watchlist details also hold localized titles/overviews:
    // drop them and re-fetch so the home grid switches language consistently
    // (otherwise cards would keep showing the previous language).
    state.watchlistDetails.clear();
    hydrateWatchlistGrid();
    applyLanguage();
}

export { I18N, t, tp, locale, applyLanguage, setLanguage };