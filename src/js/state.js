/* global __BLAMEFLIX_VERSION__ */
import { readStoredJson } from './storage.js';
import { normalizeWatched } from './watched.js';

// Version injected at build time from package.json; resolved against the
// native wrapper at startup (see env.resolveAppVersion).
export const BUILD_APP_VERSION = __BLAMEFLIX_VERSION__;

export const LANG_STORAGE = 'myLang';
const storedLangValue = localStorage.getItem(LANG_STORAGE);
const browserLang = (navigator.language || 'en').toLowerCase().split('-')[0];

// Release notifications
export const DEFAULT_NOTIFY_SETTINGS = { enabled: true, tv: true, movies: true, autoSyncHours: 24 };
export const AUTO_SYNC_HOURS = [8, 12, 24, 48];

// Makes the auto-sync interval consistent, accepting only the expected values.
export function sanitizeAutoSyncHours(hours) {
    const n = Number(hours);
    return AUTO_SYNC_HOURS.includes(n) ? n : DEFAULT_NOTIFY_SETTINGS.autoSyncHours;
}

function loadReleaseState() {
    let s = readStoredJson('myReleaseState', {});
    if (!s || typeof s !== 'object') s = {};
    if (!s.shows || typeof s.shows !== 'object') s.shows = {};
    if (!s.movies || typeof s.movies !== 'object') s.movies = {}; // movieId -> release date "YYYY-MM-DD"
    if (!s.moviesPending || typeof s.moviesPending !== 'object') s.moviesPending = {}; // movieId -> true while unreleased
    return s;
}

// Shared mutable application state. Field names match the original ones.
export const state = {
    appVersion: BUILD_APP_VERSION,
    apiKey: localStorage.getItem('myTMDbApiKey') || '',
    // Default language is English for everyone, except when the system
    // language is Italian (a saved preference always wins).
    lang: (storedLangValue === 'it' || storedLangValue === 'en') ? storedLangValue : (browserLang === 'it' ? 'it' : 'en'),
    currentMedia: null, // The media currently shown in the details view
    watchlist: readStoredJson('myWatchlist', []),
    watchlistDetails: new Map(), // in-memory cache: key 'media_type:id' -> full object (never persisted)
    lastPlayed: readStoredJson('myLastPlayed', []),
    customSelections: readStoredJson('myCustomSelections', {}), // manual seasons/episodes per title
    customMode: false, // true when the manual inputs are used for a series
    currentSeason: 1, // season selected in the episode list
    currentEpisode: 1, // episode selected in the episode list
    watchedEpisodes: normalizeWatched(readStoredJson('myWatchedEpisodes', {})),
    newsHistory: (() => { const h = readStoredJson('myNewsHistory', []); return Array.isArray(h) ? h : []; })(),
    searching: false,
    currentList: [], // Last rendered titles (watchlist or search results)
    viewMode: ['grid', 'list'].includes(localStorage.getItem('myViewMode')) ? localStorage.getItem('myViewMode') : 'grid',
    typeFilter: localStorage.getItem('myTypeFilter') || 'all', // 'all' | 'movie' | 'tv'
    kindOrder: localStorage.getItem('myKindOrder') === 'tv' ? 'tv' : 'movie', // which block sits on the top row of the "all" view
    resolver: readStoredJson('myResolver', {}), // user-chosen URL templates { movie, tv }
    resolverOverrides: readStoredJson('myResolverOverrides', {}), // per-title source overrides
    latestRelease: null, // { tag, html_url, assets } of the latest GitHub release
    notifySettings: Object.assign({}, DEFAULT_NOTIFY_SETTINGS, readStoredJson('myNotifySettings', {})),
    releaseState: loadReleaseState()
};

// Only the identifiers are stored in localStorage (compliance with the TMDB
// caching terms); the details live only in memory.
export function persistWatchlist() {
    localStorage.setItem('myWatchlist', JSON.stringify(state.watchlist));
}

export function persistNotifySettings() {
    localStorage.setItem('myNotifySettings', JSON.stringify(state.notifySettings));
}

export function persistReleaseState() {
    localStorage.setItem('myReleaseState', JSON.stringify(state.releaseState));
}

export const NEWS_HISTORY_MAX = 30;

export function persistNewsHistory() {
    localStorage.setItem('myNewsHistory', JSON.stringify(state.newsHistory));
}

// Persisted snapshot of the home counter: at startup the last known values
// are painted immediately, then the live recount corrects them. Any change
// to the watched state removes the snapshot (stale numbers).
const UNWATCHED_SNAPSHOT_TTL = 12 * 3600 * 1000;

export function readUnwatchedSnapshot() {
    const s = readStoredJson('myUnwatchedSnapshot', null);
    if (!s || typeof s !== 'object' || !Number.isFinite(s.ts)) return null;
    if (Date.now() - s.ts > UNWATCHED_SNAPSHOT_TTL) return null;
    if (!s.counts || typeof s.counts !== 'object' || !Number.isFinite(Number(s.total))) return null;
    return { ts: s.ts, total: Number(s.total), counts: s.counts };
}

export function persistUnwatchedSnapshot(counts, total) {
    try {
        localStorage.setItem('myUnwatchedSnapshot', JSON.stringify({ ts: Date.now(), total, counts }));
    } catch (err) { /* storage full: the snapshot is best-effort */ }
}

export function invalidateUnwatchedSnapshot() {
    try { localStorage.removeItem('myUnwatchedSnapshot'); } catch (err) { /* ignore */ }
}
