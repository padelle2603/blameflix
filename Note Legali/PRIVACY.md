# Informativa sulla privacy — BlameFlix

> **Lingua / Language**: **Italiano** (questo documento) | [English](PRIVACY_EN.md)

_Ultimo aggiornamento: 16 agosto 2026_

> **Disclaimer.** Questa informativa può essere aggiornata nel tempo. La
> versione corrente è quella pubblicata in questo documento.

Questa informativa descrive come BlameFlix tratta i dati quando la usi.

## 1. Dove stanno i tuoi dati

Tutti i dati della tua libreria personale — titoli salvati, ultime riproduzioni,
stagioni/episodi scelti a mano, chiave API TMDB, preferenze di visualizzazione,
template della sorgente e impostazioni di notifica — vengono **memorizzati
esclusivamente sul tuo dispositivo** (memoria locale dell'app e file di backup).

BlameFlix **non gestisce, non possiede e non mette in ascolto alcun server**:
nessuna macchina in ascolto su internet, nessun servizio cloud, nessun backend.
L'app non apre porte, non riceve connessioni e non ospita nulla. Di
conseguenza **non invia i tuoi dati a nessuno**: non esiste alcun server a cui
mandarli.

### Accessi a internet effettuati dall'app

L'app effettua solo richieste in **uscita**, tutte avviate dall'app stessa, e
sempre connesse alle funzioni che usi:

- **TMDB (The Movie Database)** — quando cerchi un titolo o apri una scheda,
  l'app invia a `api.themoviedb.org` una richiesta con la chiave API che hai
  inserito tu (es. ricerca, dettagli film/serie, date di rilascio). Quando le
  notifiche di rilascio sono attive, l'app interroga periodicamente TMDB per le
  date di uscita dei soli titoli nella tua libreria.
- **Immagini TMDB** — per mostrare poster e locandine, l'app scarica le immagini
  da `image.tmdb.org` per i titoli che visualizzi.
- **Google Fonts** — all'avvio l'app carica i caratteri usati nell'interfaccia
  da `fonts.googleapis.com` / `fonts.gstatic.com`.
- **La tua sorgente** — quando tocchi «Guarda ora», l'app apre l'URL che hai
  configurato tu **nel browser del sistema**: l'app non scarica né legge il
  contenuto di quella pagina, si limita ad aprirla, come farebbe un browser.
- **GitHub** — all'avvio e con il pulsante «Verifica aggiornamenti» delle
  Impostazioni, l'app interroga `api.github.com` per conoscere l'ultima release
  pubblicata del progetto e, se c'è una versione più recente, mostrarti il link
  alla pagina di download. La richiesta è anonima e non contiene dati personali.
- **Collegamento a TMDB** — se tocchi il logo/footer che punta a
  `themoviedb.org`, si apre la pagina in una scheda separata.

Tutte le richieste sono **dirette e anonime** verso i servizi sopra elencati:
BlameFlix non fa da intermediario, non aggiunge propri server al percorso e non
ha alcun modo di vedere, intercettare o registrare le richieste che inoltri.

## 2. Dati trattati

- **Chiave API TMDB**: inserita da te nelle Impostazioni e usata solo per le
  richieste a TMDB. Rimane sul dispositivo.
- **Libreria (salvati, ultime riproduzioni, stagioni personalizzate)**: solo
  identificativi e scelte personali, salvati sul dispositivo.
- **Template della sorgente**: gli URL che configuri per il player. Rimangono sul
  dispositivo. Oltre a quelli globali, puoi impostare una **sorgente specifica per
  ogni titolo** dalla scheda: anche queste restano sul dispositivo.
- **Preferenze di avvio e aggiornamenti**: l'avvenuta accettazione del
  disclaimer di avvio e l'ultimo controllo aggiornamenti (data e tag dell'ultima
  release vista) restano sul dispositivo, servono solo per non riproporre la
  richiesta e per evitare interrogazioni ripetute a GitHub. Non contengono dati
  personali. Il disclaimer di avvio viene mostrato solo al primo utilizzo;
  l'app tenta in modo best-effort di rendere persistente lo storage della
  WebView (`navigator.storage.persist()`) ma, se il sistema cancella i dati
  dell'app, l'accettazione può andare persa e il disclaimer può ricomparire.
- **Notifiche di rilascio**: quando le attivi, l'app controlla periodicamente le
  date di uscita dei tuoi titoli salvati e genera avvisi locali. Nessun dato
  relativo alle notifiche esce dal dispositivo.

## 3. Terze parti

BlameFlix si appoggia a **The Movie Database (TMDB)** per cercare i titoli e
mostrarne dati e immagini. Quando cerchi o apri un titolo, la tua app invia a
TMDB la richiesta necessaria secondo i suoi termini di servizio. Non trasmettiamo
altri dati a TMDB oltre a quelli richiesti dalle normali funzioni di ricerca.

Lo sviluppatore segue **in buona fede i termini di servizio (TOS) di TMDB**:
l'app usa l'API esclusivamente per le funzioni di catalogo previste, con
attribuzione visibile e conforme alle linee guida ufficiali, e senza aggirare
limiti o restrizioni d'uso.

BlameFlix **non è affiliato, approvato o certificato da TMDB**. Il logo TMDB
mostrato nell'app è usato esclusivamente a scopo di attribuzione, secondo le
linee guida ufficiali di TMDB.

## 4. Permessi

Su **Android** l'app dichiara tre permessi, ma solo due comportano una richiesta
a runtime all'utente. Nessun permesso viene chiesto all'avvio: la richiesta
compare **solo nel momento in cui la funzione che lo richiede viene usata**, e
puoi sempre negarla o revocarla in qualsiasi momento dalle Impostazioni di
sistema (Impostazioni → App → BlameFlix → Permessi), senza che l'app smetta di
funzionare.

- **Permesso di notifica**: serve per inviare gli avvisi di rilascio
  ("nuova puntata in catalogo"). Viene richiesto la **prima volta che una
  notifica deve essere mostrata** (es. alla prima sincronizzazione che trova una
  nuova uscita, o quando invii una notifica di prova dalle Impostazioni). In quel
  momento il sistema mostra il **dialogo ufficiale di Android** ("BlameFlix può
  inviare notifiche?"): se accetti, l'app può mostrare gli avvisi; se neghi, il
  resto dell'app continua a funzionare normalmente e puoi riabilitare il permesso
  in seguito. Il permesso viene usato **esclusivamente** per questi avvisi locali:
  le notifiche sono generate sul dispositivo e non vengono inviate a nessun
  server.
- **Permesso di accesso alla memoria**: serve **solo** per salvare il file di
  backup. Viene richiesto quando tocchi "Crea backup" (o importi un backup): il
  sistema mostra il dialogo di Android per l'accesso ai file, e se accetti l'app
  scrive **un solo file** (`BlameFlix/...json`) nella cartella Documenti (o lo
  apre con il dialogo di salvataggio di sistema). Se lo neghi, il backup non
  viene creato ma l'app continua a funzionare. Il permesso non viene usato per
  leggere, modificare o condividere altri file sul dispositivo.
- **Permesso INTERNET** (dichiarato nel manifest, **senza dialogo**): è il
  permesso di sistema che consente all'app di fare le richieste di rete descritte
  nel paragrafo 1 (TMDB, immagini, font, apertura della sorgente). Non viene chiesto
  all'utente: su Android è concesso automaticamente con l'installazione. L'app lo
  usa solo per gli accessi elencati, e nulla di ciò che invia identifica i tuoi
  dati personali.

In sintesi: i permessi richiesti sono strettamente **funzionali** (notifiche per
gli avvisi, memoria per il backup), vengono chiesti **al bisogno**, mostrati dal
dialogo di sistema di Android (mai da finestre dell'app), e possono essere
concessi, negati o revocati in ogni momento dal pannello dei permessi del
sistema operativo.

**La tua privacy non viene mai violata**: i permessi non danno all'app accesso
a contenuti, file, contatti, posizione, fotocamera o microfono; servono solo a
eseguire le funzioni che scegli tu (avvisi e backup), i tuoi dati restano sul
tuo dispositivo e nulla viene letto, raccolto o inviato a terzi al di fuori
degli accessi di rete esplicitamente descritti nel paragrafo 1.

## 5. Backup

Il file di backup (un singolo `.json` creato da te quando tocchi "Crea backup")
contiene **una copia fedele dei dati dell'app presenti sul tuo dispositivo**,
cioè:

- **libreria personale**: l'elenco dei titoli che hai salvato, come semplici
  identificativi TMDB (id del titolo e tipo film/serie);
- **ultime riproduzioni**: per le serie, quale stagione/episodio hai riprodotto
  per ultimo;
- **stagioni e episodi scelti a mano**: le puntate che hai marcato come viste e
  le eventuali selezioni manuali per ogni serie;
- **cronologia avvisi**: l'elenco delle notifiche di rilascio già generate
  (titolo, stagione/episodio);
- **chiave API TMDB**: la chiave che hai inserito tu nelle Impostazioni;
- **template della sorgente**: gli URL che hai configurato per «Guarda ora»
  (film e serie), comprese le eventuali sorgenti specifiche per singolo titolo;
- **preferenze e impostazioni**: modalità di visualizzazione, filtro
  film/serie, impostazioni delle notifiche e stato dell'ultima sincronizzazione
  delle uscite (per evitare di notificare due volte lo stesso rilascio).

Il file include anche la **data di esportazione** e il **numero di versione del
formato**, solo per gestire le importazioni future.

Non contiene poster, immagini, file video o contenuti audiovisivi di alcun tipo:
solo dati di testo. Il backup **non viene inviato da nessuna parte** — lo
crei, salvi e condividi tu dove preferisci. **Conservalo in un luogo sicuro**:
chi lo possiede può ripristinarlo nell'app e quindi vedere la tua libreria e la
tua chiave API TMDB.

## 6. Contenuti e responsabilità dell'utente

BlameFlix è uno **strumento neutro**: non contiene sorgenti di streaming, non
fornisce né segnala contenuti, non ospita opere e non conosce le sorgenti a cui
accedi. Le sorgenti di streaming sono una tua **scelta personale ed esclusiva**:
sei tu a decidere dove guardare un titolo, configurando il template della sorgente
nelle Impostazioni (che resta vuoto finché non lo compili tu).

Questa libertà di scelta comporta anche la tua responsabilità: sei tu, e non
BlameFlix, a rispondere della legalità dei contenuti a cui accedi tramite la tua
sorgente, secondo le leggi del tuo Paese. BlameFlix non agevola alcun servizio
specifico e non compie alcuna delle condotte sanzionate dalla normativa sul
diritto d'autore.

Per l'analisi dettagliata del quadro normativo, del perché BlameFlix non vi
rientra e della responsabilità dell'utente finale, consulta il documento
**[LEGAL.md](LEGAL.md)**.
