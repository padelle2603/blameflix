/* global __BLAMEFLIX_VERSION__ */
import { readStoredJson } from './storage.js';
import { normalizeWatched } from './watched.js';
import { LANG_CODES } from './langs.js';

// Version injected at build time from package.json; resolved against the
// native wrapper at startup (see env.resolveAppVersion).
export const BUILD_APP_VERSION = __BLAMEFLIX_VERSION__;

export const LANG_STORAGE = 'myLang';
const storedLangValue = localStorage.getItem(LANG_STORAGE);
const browserLang = (navigator.language || 'en').toLowerCase().split('-')[0];

// The saved preference always wins; otherwise we match the system language if
// BlameFlix is translated into it, falling back to English.
function detectLang() {
    if (LANG_CODES.includes(storedLangValue)) return storedLangValue;
    if (LANG_CODES.includes(browserLang)) return browserLang;
    return 'en';
}

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

function loadCloudSync() {
    const s = readStoredJson('myCloudSync', {});
    if (!s || typeof s !== 'object') return { enabled: false, url: '', anonKey: '', tokenEnc: '', partitionHash: '', lastPush: 0, lastPull: 0 };
    return {
        enabled: s.enabled === true,
        url: typeof s.url === 'string' ? s.url : '',
        anonKey: typeof s.anonKey === 'string' ? s.anonKey : '',
        tokenEnc: typeof s.tokenEnc === 'string' ? s.tokenEnc : '',
        partitionHash: typeof s.partitionHash === 'string' ? s.partitionHash : '',
        lastPush: Number(s.lastPush) || 0,
        lastPull: Number(s.lastPull) || 0
    };
}

// Shared mutable application state. Field names match the original ones.
export const state = {
    appVersion: BUILD_APP_VERSION,
    apiKey: localStorage.getItem('myTMDbApiKey') || '',
    // Default language is auto-detected from the system (a saved preference
    // always wins), falling back to English when not translated.
    lang: detectLang(),
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
    sortMode: (() => { const v = localStorage.getItem('mySortMode'); return ['added', 'alpha', 'release', 'rating'].includes(v) ? v : 'added'; })(), // how titles inside each row are ordered
    kindOrder: localStorage.getItem('myKindOrder') === 'tv' ? 'tv' : 'movie', // which block sits on the top row of the "all" view
    resolver: readStoredJson('myResolver', {}), // user-chosen URL templates { movie, tv }
    resolverOverrides: readStoredJson('myResolverOverrides', {}), // per-title source overrides
    networkSources: readStoredJson('myNetworkSources', {}), // per-series network schedule: showId -> { networkId?, networkName?, template? }
    latestRelease: null, // { tag, html_url, assets } of the latest GitHub release
    notifySettings: Object.assign({}, DEFAULT_NOTIFY_SETTINGS, readStoredJson('myNotifySettings', {})),
    releaseState: loadReleaseState(),
    cloudSync: loadCloudSync(), // optional personal Supabase cloud sync { enabled, url, anonKey, tokenEnc, partitionHash, lastPush, lastPull }
    collapsedRows: (() => { try { return JSON.parse(localStorage.getItem('myCollapsedRows')) || {}; } catch { return {}; } })()
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

export function persistNetworkSources() {
    localStorage.setItem('myNetworkSources', JSON.stringify(state.networkSources));
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
    return { ts: s.ts, total: Number(s.total), counts: s.counts, anyAired: Number(s.anyAired) || 0 };
}

export function persistUnwatchedSnapshot(counts, total, anyAired) {
    try {
        localStorage.setItem('myUnwatchedSnapshot', JSON.stringify({ ts: Date.now(), total, counts, anyAired: Number(anyAired) || 0 }));
    } catch (err) { /* storage full: the snapshot is best-effort */ }
}

export function invalidateUnwatchedSnapshot() {
    try { localStorage.removeItem('myUnwatchedSnapshot'); } catch (err) { /* ignore */ }
}

export function persistCollapsedRows() {
    try { localStorage.setItem('myCollapsedRows', JSON.stringify(state.collapsedRows)); } catch { /* storage full */ }
}

export function persistSortMode() {
    localStorage.setItem('mySortMode', state.sortMode);
}

export function persistCloudSync() {
    localStorage.setItem('myCloudSync', JSON.stringify(state.cloudSync));
}
