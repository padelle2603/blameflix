# Informativa sulla privacy — BlameFlix

_Ultimo aggiornamento: 16 agosto 2026_

Questa informativa descrive come BlameFlix tratta i dati quando la usi.

## 1. Dove stanno i tuoi dati

Tutti i dati della tua libreria personale — titoli salvati, ultime riproduzioni,
stagioni/episodi scelti a mano, chiave API TMDB, preferenze di visualizzazione,
template del resolver e impostazioni di notifica — vengono **memorizzati
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
- **Il tuo resolver** — quando tocchi «Guarda ora», l'app apre l'URL che hai
  configurato tu **nel browser del sistema**: l'app non scarica né legge il
  contenuto di quella pagina, si limita ad aprirla, come farebbe un browser.
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
- **Template del resolver**: gli URL che configuri per il player. Rimangono sul
  dispositivo.
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

Su **Android**, l'app può chiedere l'accesso alla memoria per salvare il file di
backup nella cartella Documenti, e il **permesso di notifica** per inviare gli
avvisi di rilascio. I permessi vengono richiesti solo quando servono (creazione
di un backup, prima notifica) e non vengono usati per altri scopi.

## 5. Backup

Il file di backup contiene i tuoi dati personali (inclusa la chiave API TMDB).
Conservalo in un luogo sicuro: chi lo possiede può ripristinarlo nell'app.

## 6. Contenuti e responsabilità dell'utente

BlameFlix è un lettore generico: le sorgenti di streaming le configuri tu. Non
forniamo né segnaliamo contenuti. Sei responsabile della legalità dei contenuti
a cui accedi tramite il tuo resolver, secondo le leggi del tuo Paese.

## 7. Modifiche

Questa informativa può essere aggiornata nel tempo. La versione corrente è
quella pubblicata in questo documento.
