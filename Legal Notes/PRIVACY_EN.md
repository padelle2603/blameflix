# Privacy policy — BlameFlix

> **Language / Lingua**: **English** (this document) | [Italiano](PRIVACY.md)

_Last updated: August 16, 2026_

> **Disclaimer.** This policy may be updated over time. The current version is
> the one published in this document.

This policy describes how BlameFlix handles data when you use it.

## 1. Where your data lives

All the data of your personal library — saved titles, last played items,
manually chosen seasons/episodes, TMDB API key, display preferences, source
templates and notification settings — are **stored exclusively on your device**
(the app's local storage and backup files).

BlameFlix **does not operate, own or listen on any server**: no machine
listening on the internet, no cloud service, no backend. The app opens no ports,
receives no connections and hosts nothing. As a result **it does not send your
data to anyone**: there is no server to send it to.

### Internet requests made by the app

The app only makes **outgoing** requests, all started by the app itself, and
always tied to the features you use:

- **TMDB (The Movie Database)** — when you search for a title or open a page,
  the app sends a request to `api.themoviedb.org` with the API key you entered
  (e.g. search, movie/series details, release dates). When release
  notifications are enabled, the app periodically queries TMDB for the release
  dates of the titles in your library only.
- **TMDB images** — to show posters and backdrops, the app downloads the images
  from `image.tmdb.org` for the titles you view.
- **Google Fonts** — on startup the app loads the typefaces used in the
  interface from `fonts.googleapis.com` / `fonts.gstatic.com`.
- **Your source** — when you tap «Watch now», the app opens the URL you
  configured **in the system browser**: the app neither downloads nor reads the
  content of that page, it just opens it, like a browser would.
- **GitHub** — on startup and with the «Check updates» button in the Settings,
  the app queries `api.github.com` to learn about the latest published release
  of the project and, if a newer version exists, shows you the link to the
  download page. The request is anonymous and contains no personal data.
- **TMDB link** — if you tap the logo/footer pointing to `themoviedb.org`, the
  page opens in a separate tab.

All the requests are **direct and anonymous** to the services listed above:
BlameFlix does not act as an intermediary, does not add its own servers to the
path and has no way to see, intercept or log the requests you forward.

## 2. Data processed

- **TMDB API key**: entered by you in the Settings and used only for the
  requests to TMDB. It stays on the device.
- **Library (saved titles, last played, custom seasons)**: only identifiers and
  personal choices, saved on the device.
- **Source templates**: the URLs you configure for the player. They stay on the
  device. In addition to the global ones, you can set a **title-specific source**
  from the title page: those also stay on the device.
- **Startup and update preferences**: the acceptance of the startup disclaimer
  and the last update check (date and tag of the last release seen) stay on the
  device; they only serve to avoid re-asking and to avoid repeated queries to
  GitHub. They contain no personal data. The startup disclaimer is shown only on
  first use; the app tries in a best-effort way to make the WebView storage
  persistent (`navigator.storage.persist()`) but, if the system clears the app
  data, the acceptance can be lost and the disclaimer can reappear.
- **Release notifications**: when you enable them, the app periodically checks
  the release dates of your saved titles and generates local alerts. No
  notification-related data leaves the device.

## 3. Third parties

BlameFlix relies on **The Movie Database (TMDB)** to search titles and show
their data and images. When you search or open a title, your app sends TMDB the
necessary request according to its terms of service. We do not transmit any
other data to TMDB beyond what the normal search features require.

The developer follows **in good faith the TMDB terms of service (TOS)**: the
app uses the API exclusively for the intended catalog features, with visible
attribution compliant with the official guidelines, and without bypassing usage
limits or restrictions.

BlameFlix **is not affiliated with, endorsed or certified by TMDB**. The TMDB
logo shown in the app is used exclusively for attribution purposes, according
to the official TMDB guidelines.

## 4. Permissions

On **Android** the app declares three permissions, but only two involve a
runtime request to the user. No permission is requested at startup: the request
appears **only when the feature that needs it is used**, and you can always deny
or revoke it at any time from the system Settings (Settings → Apps →
BlameFlix → Permissions), without the app stopping to work.

- **Notification permission**: it is needed to send the release alerts ("new
  episode in the catalog"). It is requested the **first time a notification has
  to be shown** (e.g. on the first sync that finds a new release, or when you
  send a test notification from the Settings). At that moment the system shows
  the **official Android dialog** ("Allow BlameFlix to send notifications?"):
  if you accept, the app can show the alerts; if you deny, the rest of the app
  keeps working normally and you can re-enable the permission later. The
  permission is used **exclusively** for these local alerts: the notifications
  are generated on the device and are not sent to any server.
- **Storage permission**: it is needed **only** to save the backup file. It is
  requested when you tap "Create backup" (or import one): the system shows the
  Android file access dialog, and if you accept, the app writes **a single
  file** (`BlameFlix/...json`) in the Documents folder (or opens it with the
  system save dialog). If you deny it, the backup is not created but the app
  keeps working. The permission is not used to read, modify or share other
  files on the device.
- **INTERNET permission** (declared in the manifest, **no dialog**): it is the
  system permission that lets the app make the network requests described in
  section 1 (TMDB, images, fonts, opening the source). It is not asked to the
  user: on Android it is granted automatically on installation. The app uses it
  only for the listed requests, and nothing it sends identifies your personal
  data.

In short: the requested permissions are strictly **functional** (notifications
for the alerts, storage for the backup), are requested **on demand**, are shown
by the Android system dialog (never by app windows), and can be granted, denied
or revoked at any time from the operating system permission panel.

**Your privacy is never violated**: the permissions do not give the app access
to content, files, contacts, location, camera or microphone; they only serve to
run the features you choose (alerts and backup), your data stays on your device
and nothing is read, collected or sent to third parties beyond the network
requests explicitly described in section 1.

## 5. Backup

The backup file (a single `.json` you create when you tap "Create backup")
contains **a faithful copy of the app data on your device**, namely:

- **personal library**: the list of the titles you saved, as plain TMDB
  identifiers (title id and movie/series type);
- **last played**: for series, which season/episode you last played;
- **watched and manually chosen seasons/episodes**: the episodes you marked as
  watched and any manual selection for each series;
- **alerts history**: the list of already generated release notifications
  (title, season/episode);
- **TMDB API key**: the key you entered in the Settings;
- **source templates**: the URLs you configured for «Watch now» (movies and
  series), including any title-specific sources;
- **preferences and settings**: display mode, movie/series filter, notification
  settings and the state of the last release sync (to avoid notifying the same
  release twice).

The file also includes the **export date** and the **format version number**,
only to manage future imports.

It does not contain posters, images, video files or any audiovisual content:
only text data. The backup **is not sent anywhere** — you create it, save it and
share it wherever you prefer. **Keep it in a safe place**: whoever owns it can
restore it in the app and therefore see your library and your TMDB API key.

## 6. Content and user responsibility

BlameFlix is a **neutral tool**: it contains no streaming sources, provides or
points to no content, hosts no works and does not know the sources you access.
The streaming sources are your **personal and exclusive choice**: it is you who
decides where to watch a title, by configuring the source template in the
Settings (which stays empty until you fill it in).

This freedom of choice also comes with your responsibility: it is you, not
BlameFlix, who answers for the legality of the content you access through your
source, according to the laws of your country. BlameFlix does not facilitate any
specific service and does not carry out any of the conduct punished by copyright
regulations.

For the detailed analysis of the legal framework, of why BlameFlix does not fall
within it and of the end user's responsibility, see the document
**[LEGAL_EN.md](LEGAL_EN.md)**.