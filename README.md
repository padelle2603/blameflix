# BlameFlix

> **Language / Lingua**: [Italiano](README.it.md) | **English** (this document)

[![Get BlameFlix on GitHub](https://img.shields.io/badge/Get%20BlameFlix%20on%20GitHub-e04334?style=for-the-badge&logo=github&logoColor=white)](https://github.com/padelle2603/blameflix/releases/latest)

> ⬇ Download the **APK (Android)** or the **AppImage (Linux)** from the [latest release](https://github.com/padelle2603/blameflix/releases/latest).

BlameFlix is your **personal catalog** for movies and TV series: a single place
where you can search a title, save it to your library, remember which episodes
you have watched and which season is waiting for you, and get a notification
when the next one is released.

It does not replace streaming platforms: it lives *on top* of them. The
platforms remain what they are — the places where you watch — while BlameFlix
becomes what they are missing — the place where you *remember*. The idea is
simple: **you choose where to watch, BlameFlix remembers everything else.**

## Why it exists

Watching today is fragmented: a title on one platform, another on a second one,
a third on TV. Every service is a closed universe, with its own catalog, its
own "watched / to watch" and its own notifications. No platform talks to the
others, and the memory of what we watch stays locked inside each of them. You
lose the thread: you don't remember where you left a series, which season you
are on, when the next episode airs.

BlameFlix was born to reunite what is scattered: a personal, private layer,
entirely on your device, that gives you back a single picture of your viewing.
All without accounts, without servers, without tracking. For the full mission
and the guiding principles (privacy by design, neutrality, legality, user
freedom) see the [manifesto](Note%20Legali/MANIFEST_EN.md).

## How it works

The app is a single-page web application in pure JavaScript (no framework).
The sources live in `src/` — HTML template, CSS split by section and JS
organized in ES modules — and are bundled by [esbuild](https://esbuild.github.io/)
into `www/`, which is what Capacitor (Android) and Electron (Linux) package.

- **Search**: type a title and BlameFlix searches it in the public API of The
  Movie Database (TMDB). You just need to enter a free personal key in the
  Settings.
- **Library**: you save titles (only their identifiers: the details live in
  memory and are re-fetched from TMDB when needed). Everything stays in
  `localStorage` on the device.
- **Tracking**: you mark watched episodes (compressed into ranges to take little
  space), resume where you left off, and save seasons/episodes even when TMDB
  does not list them.
- **Release notifications**: on startup, at regular intervals and when returning
  to the foreground, the app compares the TMDB state of your saved titles and
  notifies you when a new episode airs. All local, no server.
- **«Watch now»**: from any page you can open the service you choose through a
  **source** configured in the Settings (a URL template, even different per
  title). The app opens the URL you configure, replacing the placeholders
  `{id}`, `{type}`, `{season}`, `{episode}` with the title's values (without
  placeholders, the URL is opened as-is) and opens it in the browser or the
  system player.
  Only **http/https links** are accepted: magnet, torrent and other
  file-sharing protocols are rejected on save. If the source is empty, the
  button stays inactive.
- **Backup**: you can export and restore everything in a single JSON file.
- **Updates**: the app checks the releases on GitHub and notifies you when a new
  version is out. On Android the APK installs over the previous one without
  losing data.

## Privacy

BlameFlix stores **everything on your device** and has no server: no machine
listening, no cloud, no account. The only outgoing requests are the ones you
start (TMDB to search and download metadata, GitHub for the update check,
Google Fonts for the typefaces, and the URL of the source you configured). The
app does not read, intercept or log anything: it only acts as a bridge between
you and the services you use. Android permissions are requested only when
needed (notifications and backup), never at startup. Details in the [privacy
policy](Note%20Legali/PRIVACY_EN.md).

## Legality

BlameFlix is a **neutral tool**, like a browser or a generic player: it does not
host, provide or suggest any source of content. It includes no site lists, not
by default nor in any other way, and it **does not keep lists of "safe" or
"unsafe" sites**: it does not know the sources, and therefore stays neutral. The
only URL ever opened is the one you type, and the responsibility for the
legality of the content you access is entirely yours, according to the laws of
your country. The magnet/torrent block concerns a *protocol category*, not
single sites: it is not a judgment on any service. For the full analysis of the
legal framework (Berne, TRIPS, WCT, EU directives, Italian law 633/1941 and
L. 93/2023) see the [note on legality](Note%20Legali/LEGAL_EN.md). On first
launch the app also shows a mandatory **disclaimer** that the user must accept
before using it.

## Platforms

| Platform | Technology | Artifact |
|---|---|---|
| Android | Capacitor | `BlameFlix-<version>.apk` |
| Linux desktop | Electron | `BlameFlix-<version>.AppImage` |
| Web | Static HTML/CSS/JS | `www/` |

## Development

The web sources are in `src/` (`index.html`, `css/`, `js/` as ES modules);
the build bundles them into `www/`, the folder packaged by Capacitor and
Electron. The app version is injected at build time from `package.json`.
`www/` is generated and **not tracked in git**: after cloning, run
`npm install` and `npm run build` before opening or packaging the app.

```sh
npm install        # dependencies (esbuild, Capacitor)
npm run build      # bundle src/ -> www/
npm run watch      # rebuild on change
npm run sync       # build + cap sync (Android)
```

`www/index.backup.html` is a frozen snapshot of the pre-modular monolith,
kept only as a fallback.

## Updates

Releases are created automatically by the pipeline on every `push` to the `main`
branch, tagged `v<version>`. On Android the update is **in-place**: every
release has an increasing `versionCode` and is signed with the same key, so the
new APK installs over the previous one and your data stays intact. The
[changelog](CHANGELOG.md) lists the changes of every release.

## Acknowledgements

- [TMDB](https://www.themoviedb.org/) for the metadata and the images
- [Capacitor](https://capacitorjs.com/) and [Electron](https://www.electronjs.org/)
  for the app packaging

---

*BlameFlix is not affiliated with, endorsed or certified by TMDB.*
