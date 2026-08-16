# BlameFlix

BlameFlix è un catalogo e lettore personale per film e serie TV: cerca titoli, li salvi nella tua libreria, tracci puntate viste, date di uscita e ricevi notifiche di rilascio.

![BlameFlix](assets/icon.png)

## Caratteristiche

- **Ricerca titoli** tramite l'API pubblica di The Movie Database (TMDB)
- **Libreria personale** salvata in locale sul dispositivo (nessun server, nessun account)
- **Salvati, ultime riproduzioni, stagioni/episodi scelti a mano**
- **Notifiche di rilascio** locali per i titoli salvati
- **Funzione "Guarda ora"** con resolver configurabile (un template URL che decidi tu)
- **Backup/ripristino** in file JSON
- Disponibile come **app Android** e **app desktop Linux (AppImage)**

## Piattaforme

| Piattaforma | Tecnologia | Artefatto |
|---|---|---|
| Android | Capacitor | `BlameFlix-<versione>.apk` |
| Linux desktop | Electron | `BlameFlix-<versione>.AppImage` |
| Web | HTML/CSS/JS statico | `www/` |

## Impostazioni

- **Chiave API TMDB**: inseriscila nelle Impostazioni per abilitare la ricerca.
- **Resolver**: configura un template URL per la funzione «Guarda ora»
  (es. `https://provider.example/watch?title={id}`). L'app accoda l'identificativo
  del titolo e, per le serie, stagione ed episodio.

## Privacy e legalità

BlameFlix memorizza tutti i dati **sul tuo dispositivo** e non invia nulla a
nessuno (oltre alle normali richieste a TMDB). BlameFlix non fornisce né
segnala sorgenti di contenuti: la scelta di dove guardare un titolo è tua.

- [Informativa sulla privacy](PRIVACY.md)
- [Nota sulla legalità](LEGAL.md)

## Ringraziamenti

- [TMDB](https://www.themoviedb.org/) per i metadati e le immagini
- [Capacitor](https://capacitorjs.com/) e [Electron](https://www.electronjs.org/)
  per il packaging delle app

---

*BlameFlix non è affiliato, approvato o certificato da TMDB.*
