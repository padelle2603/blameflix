# BlameFlix

> **Language / Lingua**: [Italiano](README.it.md) | **English** (this document)

[![Get BlameFlix on GitHub](https://img.shields.io/badge/Get%20BlameFlix%20on%20GitHub-e04334?style=for-the-badge&logo=github&logoColor=white)](https://github.com/padelle2603/blameflix/releases/latest)

> ⬇ Download the **APK (Android)**, the **AppImage (Linux)** or the **portable exe (Windows)** from the [latest release](https://github.com/padelle2603/blameflix/releases/latest).

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

- **Manifesto** — the mission and the guiding principles: privacy by design,
  neutrality, legality and user freedom. See
  [MANIFEST_EN.md](Legal%20Notes/MANIFEST_EN.md).
- **Legality** — BlameFlix is a neutral tool, like a browser: it does not host,
  provide or suggest any source of content, keeps no list of sites, and only
  ever opens the URL you type. The magnet/torrent block concerns a protocol
  category, not single sites. A mandatory disclaimer must be accepted on first
  launch. See [LEGAL_EN.md](Legal%20Notes/LEGAL_EN.md).
- **Privacy** — everything is stored on your device and there is no server: no
  account, no cloud, no tracking. The only outgoing requests are the ones you
  start (TMDB, GitHub for updates, Google Fonts, and the source URL you
  configure). See [PRIVACY_EN.md](Legal%20Notes/PRIVACY_EN.md).

## Core features

A quick look at the core features.

### Search

Type a title and BlameFlix searches it in the public API of The Movie Database
(TMDB). You just need to enter a free personal key in the Settings.

<video src="Videos/search.mp4" width="100%" autoplay loop muted playsinline controls></video>

### Tracking

Mark watched episodes (compressed into ranges to take little space), resume
where you left off, and save seasons/episodes even when TMDB does not list
them.

<video src="Videos/track.mp4" width="100%" autoplay loop muted playsinline controls></video>

### Settings & "Watch now"

Configure your TMDB key and the **source** you want to open from any page: a URL
template, even different per title, with `{id}`, `{type}`, `{season}`,
`{episode}` placeholders. Only `http/https` links are accepted (magnet/torrent
are rejected); if the source is empty the button stays inactive.

<video src="Videos/settings.mp4" width="100%" autoplay loop muted playsinline controls></video>

### Library, release notifications & backup

- **Library**: you save titles by identifier only; details are re-fetched from
  TMDB when needed and everything stays in `localStorage` on the device.
- **Release notifications**: on startup, at intervals and when returning to the
  foreground, the app compares the TMDB state of your saved titles and notifies
  you when a new episode airs — all local, no server.
- **Backup**: export and restore everything in a single JSON file.

## Platforms

| Platform | Technology | Artifact |
|---|---|---|
| Android | Capacitor | `BlameFlix-<version>.apk` |
| Linux desktop | Electron | `BlameFlix-<version>.AppImage` |
| Windows desktop | Electron | `BlameFlix-<version>.exe` |
| Web | Static HTML/CSS/JS | `www/` |

## Updates

Releases are created automatically by the pipeline on every `push` to the `main`
branch, tagged `v<version>`. On Android the update is **in-place**: every
release has an increasing `versionCode` and is signed with the same key, so the
new APK installs over the previous one and your data stays intact. The
[changelog](CHANGELOG.md) lists the changes of every release.

## Development

The web sources are in `src/` (`index.html`, `css/`, `js/` as ES modules); the
build bundles them into `www/`, the folder packaged by Capacitor and
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

## Acknowledgements

- [TMDB](https://www.themoviedb.org/) for the metadata and the images
- [Capacitor](https://capacitorjs.com/) and [Electron](https://www.electronjs.org/)
  for the app packaging

---

*BlameFlix is not affiliated with, endorsed or certified by TMDB.*
