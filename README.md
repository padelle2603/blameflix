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

## Contents

- [Why it exists](#why-it-exists)
- [Core features](#core-features)
- [Tutorial](#tutorial)
- [Platforms](#platforms)
- [Updates](#updates)
- [Development](#development)
- [Acknowledgements](#acknowledgements)

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

![Search](gifs/search.gif)

> Full-quality 1080p demo: [search.mp4](Videos/search.mp4)

### Tracking

Mark watched episodes (compressed into ranges to take little space), resume
where you left off, and save seasons/episodes even when TMDB does not list
them.

![Tracking](gifs/track.gif)

> Full-quality 1080p demo: [track.mp4](Videos/track.mp4)

### Settings & "Watch now"

Configure your TMDB key and the **source** you want to open from any page: a URL
template, even different per title, with `{id}`, `{type}`, `{season}`,
`{episode}` placeholders. Only `http/https` links are accepted (magnet/torrent
are rejected); if the source is empty the button stays inactive.

![Settings](gifs/settings.gif)

> Full-quality 1080p demo: [settings.mp4](Videos/settings.mp4)

### Library, release notifications & backup

- **Library**: you save titles by identifier only; details are re-fetched from
  TMDB when needed and everything stays in `localStorage` on the device.
- **Release notifications**: on startup, at intervals and when returning to the
  foreground, the app compares the TMDB state of your saved titles and notifies
  you when a new episode airs — all local, no server.
- **Backup**: export and restore everything in a single JSON file.

## Tutorial

A short, no-technical-knowledge guide to using BlameFlix.

### 1. Install BlameFlix

- **Android**: download the `.apk` from the [latest release](https://github.com/padelle2603/blameflix/releases/latest) and install it.
- **Linux**: run the `.AppImage`.
- **Windows**: run the portable `.exe`.
- **Web**: open the online version in your browser.
- On first launch, read and accept the short legal notice to continue.

### 2. Connect a free movie database (one time)

BlameFlix gets posters and information from a free public database called TMDB.

1. Open Settings (gear icon ⚙) → **API & Sources**.
2. On the TMDB website, create a free account and copy your personal key (found in your account's API settings).
3. Paste it into BlameFlix and save.
4. Done — search now works. If you skip this, the app reminds you later.

### 3. Search for a title

Type the name of a movie or series in the search box. Results appear with covers and descriptions in your chosen language. Tap a result to open its details.

### 4. Save titles and track what you watch

- From any detail page, tap **Save** to add the title to your library.
- **For series**: open the show and tap the episodes you have already seen. BlameFlix remembers your progress, even for episodes the database does not list.
- **"Watch now"**: for a series, this button jumps to the next episode you have not watched yet, and marks it as watched the moment you open it.

### 5. Choose where "Watch now" opens

BlameFlix opens a web page *you* choose — it never picks or suggests one.

1. Settings → **API & Sources**.
2. Enter a web link for movies and/or series. You can use small tags BlameFlix fills in automatically:
   - `{id}` → the title's ID
   - `{type}` → movie or series
   - `{season}` and `{episode}` → the numbers
   - Example: `https://your-site.example/watch/{type}/{id}/{season}/{episode}`
3. Only normal web links (`http`/`https`) are allowed; magnet/torrent links are rejected. If you leave it empty, the button stays off.
4. **Different link per title**: inside any title's page you can set a custom link just for that one title.

### 6. Get notified about new releases

1. Settings → **Notifications** → turn notifications on.
2. Choose whether to be alerted for **series**, **movies**, or both, and how often the app should check.
3. BlameFlix checks when you open the app, when you return to it, and on your schedule — then quietly tells you when something new is out. On Android you can mark an episode as watched right from the notification.

### 7. Use the real broadcast schedule (series)

Inside a series page, open the **Network** section: pick the TV channel from the list and paste an external schedule link. This makes release reminders match the real air dates. If that link does not work, BlameFlix falls back to the database dates.

### 8. Back up and restore your data

- Settings → **Data** → **Export** saves your whole library, watch history and settings into a single file you can keep safe.
- **Import** brings everything back on any device.
- Here you will also find **Delete data**, which clears your library while keeping your key and language choice.

### 9. Cloud Sync (optional)

BlameFlix can optionally sync your data to your own personal Supabase
project. The developer never hosts or accesses your data: you bring your
own database. The data is encrypted client-side with a personal token
(AES-GCM) before transmission, and Supabase Row Level Security ensures each
user can only access their own partition.

**What is synced:** watchlist, watched episodes, last played, custom
selections, news history, view mode, type filter, notification settings,
release state, and language.

**What is NOT synced:** TMDB API key, resolver templates, and network
sources — these stay on the device and in local backups only.

#### Setup (one time)

1. Create a free account at [supabase.com](https://supabase.com) and start a new project.
2. Go to **Project Settings → API** and copy:
   - **Project URL** (e.g. `https://abcdefgh.supabase.co`)
   - **anon public key** (starts with `eyJ...`)
3. In the Supabase dashboard, open **SQL Editor → New query** and run this SQL:

```sql
-- Table for encrypted cloud backups
CREATE TABLE IF NOT EXISTS blameflix_backup (
    partition  TEXT PRIMARY KEY,
    payload    TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE blameflix_backup ENABLE ROW LEVEL SECURITY;

-- Helper: read the partition from the request header
CREATE OR REPLACE FUNCTION get_partition_from_header()
RETURNS TEXT AS $$
    SELECT current_setting('request.headers', true)::json->>'x-partition'
$$ LANGUAGE sql STABLE;

-- Policy: each user can only SELECT/UPSERT their own partition
CREATE POLICY "partition_isolation" ON blameflix_backup
    FOR ALL
    USING (partition = get_partition_from_header())
    WITH CHECK (partition = get_partition_from_header());
```

4. In BlameFlix → **Settings → Data → Cloud Sync**: paste the URL, the anon
   key, generate a token and enable the sync.
5. The ⬆ (push) button in the home topbar uploads your data; the ⬇ (pull)
   button downloads it on another device (use the same token).

> ⚠ The anon key is safe to use client-side — it is limited by RLS. Never
> share your **service_role** key.

### 10. Choose your language

Settings → **Preferences** lets you switch between English and Italian. The app tries to pick the right one automatically, but your choice is always remembered (and included in backups).

**Tips**

- The **Sync** button (⟳) checks for new releases on demand. On Android, you can also pull down from the top of your library to do the same.
- Installed apps update automatically; the web version is always the latest.

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

*Developed with the assistance of [opencode](https://opencode.ai).*
