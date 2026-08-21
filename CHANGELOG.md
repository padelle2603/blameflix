# Changelog

Le release sono create automaticamente a ogni push sul ramo `main` e riportano qui il relativo changelog.

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