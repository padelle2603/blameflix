# BlameFlix

> **Lingua / Language**: **Italiano** (questo documento) | [English](README.md)

[![Scarica BlameFlix su GitHub](https://img.shields.io/badge/Scarica%20BlameFlix%20su%20GitHub-e04334?style=for-the-badge&logo=github&logoColor=white)](https://github.com/padelle2603/blameflix/releases/latest)

> ⬇ Scarica l'**APK (Android)** o l'**AppImage (Linux)** dall'[ultima release](https://github.com/padelle2603/blameflix/releases/latest). Vedi il [changelog](CHANGELOG.md) per le novità.

BlameFlix è il tuo **catalogo personale** per film e serie TV: un unico posto dove
cercare un titolo, salvarlo nella tua libreria, ricordare quali puntate hai visto
e quale stagione ti aspetta, e ricevere un avviso quando esce la prossima.

Non sostituisce le piattaforme di streaming: vive *sopra* di esse. Le piattaforme
restano ciò che sono — i luoghi dove si guarda — mentre BlameFlix diventa ciò che
a loro manca — il luogo dove si *ricorda*. L'idea è semplice: **tu scegli dove
guardare, BlameFlix ricorda tutto il resto.**

## Perché esiste

La visione oggi è frammentata: un titolo su una piattaforma, un altro su una
seconda, un terzo in televisione. Ogni servizio è un universo chiuso, con il
proprio catalogo, il proprio "visto / da vedere" e le proprie notifiche. Nessuna
piattaforma parla con le altre, e la memoria di ciò che guardiamo resta
confinata dentro ciascuna di esse. Perdi il filo: non ricordi dove hai lasciato
una serie, a che stagione sei, quando esce la puntata successiva.

BlameFlix nasce per riunire ciò che è disperso: uno strato personale e privato,
interamente sul tuo dispositivo, che ti restituisce un'immagine unica della tua
visione. Tutto senza account, senza server, senza tracciamento. Per la missione
completa e i principi guida (privacy by design, neutralità, legalità, libertà
dell'utente) vedi il [manifesto](Note%20Legali/MANIFEST.md).

## Come funziona

L'app è un'unica pagina web in JavaScript puro (nessun framework), racchiusa in
`www/index.html`, e viene impacchettata come app Android e come app desktop Linux.

- **Ricerca**: scrivi un titolo e BlameFlix lo cerca nell'API pubblica di
  The Movie Database (TMDB). Ti basta inserire una chiave personale gratuita
  nelle Impostazioni.
- **Libreria**: salvi i titoli (solo i loro identificativi: i dettagli stanno in
  memoria e vengono riscaricati da TMDB quando servono). Tutto resta in
  `localStorage` sul dispositivo.
- **Tracciamento**: segni puntate viste (compresse in intervalli per occupare
  poco spazio), riprendi da dove eri rimasto, salvi stagioni/episodi anche quando
  TMDB non li elenca.
- **Notifiche di rilascio**: all'avvio, a intervalli regolari e al ritorno in
  primo piano, l'app confronta lo stato TMDB dei tuoi titoli salvati e ti avvisa
  quando esce una puntata nuova. Tutto locale, nessun server.
- **«Guarda ora»**: da ogni scheda puoi aprire il servizio che scegli tu tramite
  una **sorgente** configurata nelle Impostazioni (un template URL, anche diverso
  per ogni titolo). L'app apre l'URL che configuri, sostituendo i segnaposto
  `{id}`, `{type}`, `{season}`, `{episode}` con i valori del titolo (senza
  segnaposto, l'URL viene aperto così com'è) e lo apre nel browser o nel lettore
  del sistema.
  Sono accettati **solo collegamenti http/https**: magnet, torrent e altri
  protocolli di file-sharing vengono rifiutati al salvataggio. Se la sorgente è
  vuota, il pulsante resta inattivo.
- **Backup**: puoi esportare e ripristinare tutto in un singolo file JSON.
- **Aggiornamenti**: l'app controlla le release su GitHub e ti avvisa quando c'è
  una versione nuova. Su Android l'APK si installa sopra il precedente senza
  perdere dati.

## Privacy

BlameFlix memorizza **tutto sul tuo dispositivo** e non ha alcun server: nessuna
macchina in ascolto, nessun cloud, nessun account. Le uniche richieste in uscita
sono quelle che avvii tu (TMDB per cercare e scaricare i metadati, GitHub per il
controllo aggiornamenti, Google Fonts per i caratteri, e l'URL della sorgente che
hai configurato). L'app non legge, non intercetta e non registra nulla: si limita
a fare da ponte tra te e i servizi che usi. I permessi Android sono chiesti solo
al bisogno (notifiche e backup), mai all'avvio. Dettagli nel documento
[informativa sulla privacy](Note%20Legali/PRIVACY.md).

## Legalità

BlameFlix è uno **strumento neutro**, come un browser o un lettore generico: non
ospita, non fornisce e non suggerisce alcuna fonte di contenuti. Non include
elenchi di siti, né di default né in nessun altro modo, e **non mantiene liste di
siti "sicuri" o "non sicuri"**: non conosce le sorgenti, e per questo resta
neutro. L'unico URL mai aperto è quello che digiti tu, e la responsabilità della
legalità dei contenuti a cui accedi è interamente tua, secondo le leggi del tuo
Paese. Il blocco di magnet e torrent riguarda una *categoria di protocollo*, non
singoli siti: non è un giudizio su nessun servizio. Per l'analisi completa del
quadro normativo (Berna, TRIPS, WCT, direttive UE, legge italiana 633/1941 e
L. 93/2023) vedi la [nota sulla legalità](Note%20Legali/LEGAL.md). Al primo avvio
l'app mostra inoltre un **disclaimer** obbligatorio che l'utente deve accettare
prima di poterla usare.

## Piattaforme

| Piattaforma | Tecnologia | Artefatto |
|---|---|---|
| Android | Capacitor | `BlameFlix-<versione>.apk` |
| Linux desktop | Electron | `BlameFlix-<versione>.AppImage` |
| Web | HTML/CSS/JS statico | `www/` |

## Aggiornamenti

Le release vengono create automaticamente dalla pipeline a ogni `push` sul ramo
`main`, con tag `v<versione>`. Su Android l'aggiornamento è **in-place**: ogni
release ha un `versionCode` crescente e firma con la stessa chiave, quindi il
nuovo APK si installa sopra il precedente e i tuoi dati restano intatti. Il
[changelog](CHANGELOG.md) elenca le modifiche di ogni release.

## Ringraziamenti

- [TMDB](https://www.themoviedb.org/) per i metadati e le immagini
- [Capacitor](https://capacitorjs.com/) e [Electron](https://www.electronjs.org/)
  per il packaging delle app

---

*BlameFlix non è affiliato, approvato o certificato da TMDB.*