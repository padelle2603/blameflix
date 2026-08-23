# BlameFlix

> **Lingua / Language**: **Italiano** (questo documento) | [English](README.md)

[![Scarica BlameFlix su GitHub](https://img.shields.io/badge/Scarica%20BlameFlix%20su%20GitHub-e04334?style=for-the-badge&logo=github&logoColor=white)](https://github.com/padelle2603/blameflix/releases/latest)

> ⬇ Scarica l'**APK (Android)**, l'**AppImage (Linux)** o l'**exe portatile (Windows)** dall'[ultima release](https://github.com/padelle2603/blameflix/releases/latest).

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
visione.

- **Manifesto** — la missione e i principi guida: privacy by design, neutralità,
  legalità e libertà dell'utente. Vedi [MANIFEST.md](Legal%20Notes/MANIFEST.md).
- **Legalità** — BlameFlix è uno strumento neutro, come un browser: non ospita,
  non fornisce e non suggerisce alcuna fonte di contenuti, non mantiene elenchi
  di siti e apre solo l'URL che digiti. Il blocco di magnet e torrent riguarda
  una categoria di protocollo, non singoli siti. Al primo avvio è obbligatorio
  accettare un disclaimer. Vedi [LEGAL.md](Legal%20Notes/LEGAL.md).
- **Privacy** — tutto è memorizzato sul tuo dispositivo e non c'è alcun server:
  nessun account, nessun cloud, nessun tracciamento. Le uniche richieste in uscita
  sono quelle che avvii tu (TMDB, GitHub per gli aggiornamenti, Google Fonts e
  l'URL della sorgente che configuri). Vedi [PRIVACY.md](Legal%20Notes/PRIVACY.md).

## Core features

Una rapida occhiata alle funzionalità core.

### Ricerca

Scrivi un titolo e BlameFlix lo cerca nell'API pubblica di The Movie Database
(TMDB). Ti basta inserire una chiave personale gratuita nelle Impostazioni.

<video src="Videos/search.mp4" width="100%" autoplay loop muted playsinline controls></video>

### Tracciamento

Segna le puntate viste (compresse in intervalli per occupare poco spazio),
riprendi da dove eri rimasto e salva stagioni/episodi anche quando TMDB non li
elenca.

<video src="Videos/track.mp4" width="100%" autoplay loop muted playsinline controls></video>

### Impostazioni e «Guarda ora»

Configura la tua chiave TMDB e la **sorgente** che vuoi aprire da ogni scheda:
un template URL, anche diverso per ogni titolo, con i segnaposto `{id}`,
`{type}`, `{season}`, `{episode}`. Sono accettati solo collegamenti
`http/https` (magnet/torrent vengono rifiutati); se la sorgente è vuota il
pulsante resta inattivo.

<video src="Videos/settings.mp4" width="100%" autoplay loop muted playsinline controls></video>

### Libreria, notifiche di rilascio e backup

- **Libreria**: salvi i titoli solo per identificativo; i dettagli vengono
  riscaricati da TMDB quando servono e tutto resta in `localStorage` sul
  dispositivo.
- **Notifiche di rilascio**: all'avvio, a intervalli e al ritorno in primo
  piano, l'app confronta lo stato TMDB dei tuoi titoli salvati e ti avvisa
  quando esce una puntata nuova — tutto locale, nessun server.
- **Backup**: esporta e ripristina tutto in un singolo file JSON.

## Piattaforme

| Piattaforma | Tecnologia | Artefatto |
|---|---|---|
| Android | Capacitor | `BlameFlix-<versione>.apk` |
| Linux desktop | Electron | `BlameFlix-<versione>.AppImage` |
| Windows desktop | Electron | `BlameFlix-<versione>.exe` |
| Web | HTML/CSS/JS statico | `www/` |

## Aggiornamenti

Le release vengono create automaticamente dalla pipeline a ogni `push` sul ramo
`main`, con tag `v<versione>`. Su Android l'aggiornamento è **in-place**: ogni
release ha un `versionCode` crescente e firma con la stessa chiave, quindi il
nuovo APK si installa sopra il precedente e i tuoi dati restano intatti. Il
[changelog](CHANGELOG.md) elenca le modifiche di ogni release.

## Sviluppo

I sorgenti web sono in `src/` (`index.html`, `css/`, `js/` come moduli ES); la
build li compatta dentro `www/`, la cartella impacchettata da Capacitor ed
Electron. La versione dell'app viene iniettata in fase di build da
`package.json`. `www/` è generato e **non tracciato su git**: dopo il clone,
esegui `npm install` e `npm run build` prima di aprire o impacchettare l'app.

```sh
npm install        # dipendenze (esbuild, Capacitor)
npm run build      # bundle src/ -> www/
npm run watch      # rebuild a ogni modifica
npm run sync       # build + cap sync (Android)
```

`www/index.backup.html` è un'istantanea congelata del monolite precedente alla
modularizzazione, tenuta solo come riserva.

## Ringraziamenti

- [TMDB](https://www.themoviedb.org/) per i metadati e le immagini
- [Capacitor](https://capacitorjs.com/) e [Electron](https://www.electronjs.org/)
  per il packaging delle app

---

*BlameFlix non è affiliato, approvato o certificato da TMDB.*
