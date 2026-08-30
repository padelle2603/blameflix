import {
    state, DEFAULT_NOTIFY_SETTINGS, sanitizeAutoSyncHours, NEWS_HISTORY_MAX,
    persistWatchlist, persistNotifySettings, persistReleaseState, persistNewsHistory, persistNetworkSources
} from './state.js';
import { compressWatched, normalizeWatched, persistWatchedEpisodes } from './watched.js';
import { getDetails } from './tmdb.js';
import { sanitizeMediaType, toIntOr } from './utils.js';
import { setLanguage, t } from './i18n.js';
import { persistResolverOverrides } from './resolver.js';
import { syncApiKeyNotice, syncNotifySettingsInputs, syncResolverNotice } from './settings.js';
import { startAutoSyncTimer } from './releases.js';
import { sourceTemplateError } from './resolver.js';
import { watchlistKey } from './watchlist.js';
import { renderGrid, syncTools, showHome } from './catalog.js';
import { refreshHomeUnwatchedCount } from './counter.js';
import { backupFile, backupStatus, homeView, settingsKeyInput, settingsOverlay, settingsResolverMovieInput, settingsResolverTvInput, settingsLangInput } from './dom.js';
import { encryptAPIKey, decryptAPIKey, isEncryptedKey, getCryptoKeyString } from './crypto.js';

async function backupData() {
    let apiKeyPackage = state.apiKey;
    if (state.apiKey) {
        try {
            apiKeyPackage = await encryptAPIKey(state.apiKey);
        } catch { /* keep plaintext as fallback */ }
    }
    const cryptoKey = await getCryptoKeyString();
    return {
        app: 'BlameFlix',
        version: 8,
        exportedAt: new Date().toISOString(),
        data: {
            myWatchlist: state.watchlist.map(({ id, media_type }) => ({ id, media_type })),
            myLastPlayed: state.lastPlayed.map(({ id, media_type, season, episode }) => ({ id, media_type, season, episode })),
            myCustomSelections: state.customSelections,
            myWatchedEpisodes: compressWatched(state.watchedEpisodes),
            myNewsHistory: state.newsHistory,
            myTMDbApiKey: apiKeyPackage,
            myCryptoKey: cryptoKey,
            myResolver: state.resolver,
            myResolverOverrides: state.resolverOverrides,
            myNetworkSources: state.networkSources,
            myViewMode: state.viewMode,
            myTypeFilter: state.typeFilter,
            myNotifySettings: state.notifySettings,
            myReleaseState: state.releaseState,
            myLang: state.lang
        }
    };
}

function showBackupStatus(msg, isError = false) {
    backupStatus.classList.toggle('is-error', isError);
    backupStatus.innerText = msg;
    backupStatus.hidden = false;
    clearTimeout(showBackupStatus._t);
    showBackupStatus._t = setTimeout(() => { backupStatus.hidden = true; }, 3500);
}

function backupFileName() {
    return `blameflix-backup-${new Date().toISOString().slice(0, 10)}.json`;
}

// Saves the backup by asking the user where to put it.
// Android: writes a file in the app's Documents folder.
// Electron: opens the native "Save as" dialog.
// Desktop browser: opens the system save dialog (if supported).
// Fallback: downloads the file to the Downloads folder.
async function createBackup() {
    const json = JSON.stringify(await backupData(), null, 2);

    // Android (Capacitor Filesystem)
    if (window.Capacitor?.isNativePlatform?.() && window.Capacitor?.Plugins?.Filesystem) {
        const Filesystem = window.Capacitor.Plugins.Filesystem;
        try {
            const perms = await Filesystem.requestPermissions();
            if (perms.publicStorage !== 'granted') {
                showBackupStatus(t('msg.writePermDenied'), true);
                return;
            }
            const path = `BlameFlix/${backupFileName()}`;
            await Filesystem.writeFile({
                path,
                directory: 'EXTERNAL',
                data: json,
                encoding: 'utf8',
                recursive: true
            });
            if (window.Capacitor?.Plugins?.Share) {
                const { uri } = await Filesystem.getUri({ path, directory: 'EXTERNAL' });
                try {
                    await window.Capacitor.Plugins.Share.share({
                        title: 'Backup BlameFlix',
                        dialogTitle: t('msg.saveBackupDialog'),
                        files: [uri]
                    });
                    showBackupStatus(t('msg.backupCreatedChoose'));
                } catch (shareErr) {
                    showBackupStatus(/cancel|annul/i.test(String(shareErr?.message || shareErr))
                        ? t('msg.backupCreatedShareCancelled')
                        : t('msg.backupNotShared'));
                }
            } else {
                showBackupStatus(t('msg.backupSaved'));
            }
        } catch (err) {
            showBackupStatus(t('msg.backupSaveError'), true);
        }
        return;
    }

    // Electron: native "Save as" dialog
    if (window.blameflixSave) {
        try {
            const saved = await window.blameflixSave.save(backupFileName(), json, state.lang);
            showBackupStatus(saved ? t('msg.backupSaved') : t('msg.saveCancelled'));
        } catch (err) {
            showBackupStatus(t('msg.backupSaveError'), true);
        }
        return;
    }

    // Desktop browser: system save dialog
    if (window.showSaveFilePicker) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: backupFileName(),
                types: [{ description: 'Backup BlameFlix', accept: { 'application/json': ['.json'] } }]
            });
            const writable = await handle.createWritable();
            await writable.write(json);
            await writable.close();
            showBackupStatus(t('msg.backupSaved'));
        } catch (err) {
            if (err && err.name === 'AbortError') {
                showBackupStatus(t('msg.saveCancelled'));
            } else {
                downloadBackupFile(json);
            }
        }
        return;
    }

    downloadBackupFile(json);
}

function downloadBackupFile(json) {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFileName();
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showBackupStatus(t('msg.backupSaved'));
}

function restoreBackup() {
    backupFile.value = '';
    backupFile.click();
}

// Rebuilds the library from the identifiers only (id + media_type) found in
// the backup, requesting the details from TMDB. If an entry already has the
// full fields (old backup) it is used without network calls.
function hasWatchlistDetails(item) {
    return item && (item.poster_path !== undefined || item.name !== undefined ||
        item.title !== undefined || item.vote_average !== undefined);
}

// Fetches (or reuses from the shared cache) the details of a single
// state.watchlist entry. Never rejects: on failure the minimal card stays.
async function hydrateOne(item) {
    if (!item || typeof item !== 'object') return null;
    if (hasWatchlistDetails(item)) return item;
    if (!item.id || !item.media_type) return null;
    try {
        const d = await getDetails(item.media_type, item.id);
        if (!d.id) throw new Error('Dati non validi');
        return {
            id: d.id,
            media_type: item.media_type,
            title: d.title,
            name: d.name,
            poster_path: d.poster_path,
            release_date: d.release_date,
            first_air_date: d.first_air_date,
            vote_average: d.vote_average
        };
    } catch (err) {
        // Details not downloadable (offline or removed title): the
        // placeholder card stays, details are re-fetched on opening.
        return { id: item.id, media_type: item.media_type };
    }
}

// All entries are hydrated in parallel instead of one round-trip at a time.
async function hydrateWatchlist(items) {
    const settled = await Promise.allSettled(items.map(hydrateOne));
    return settled
        .map(r => (r.status === 'fulfilled' ? r.value : null))
        .filter(Boolean);
}

// On startup it fetches the missing details of the saved titles into the
// in-memory cache, so the grid shows posters and info. Offline, the
// placeholder cards stay and details load when opening a title.
async function hydrateWatchlistGrid() {
    const missing = state.watchlist.filter(item => !state.watchlistDetails.has(watchlistKey(item.id, item.media_type)));
    if (!missing.length) return;
    const hydrated = await hydrateWatchlist(missing);
    hydrated.forEach(h => state.watchlistDetails.set(watchlistKey(h.id, h.media_type), h));
    if (!homeView.hidden) renderGrid(state.currentList);
}

// --- RESTORE SANITIZATION ---
// Backup files are untrusted input (they can be shared between users):
// every restored field is validated against a strict whitelist instead of
// being used as-is, so a crafted backup cannot inject markup or junk state.
function isSafeId(value) {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 && n <= Number.MAX_SAFE_INTEGER;
}

function safeString(value, maxLen) {
    return typeof value === 'string' ? value.slice(0, maxLen) : '';
}

function sanitizeWatchlistItems(items) {
    if (!Array.isArray(items)) return [];
    const seen = new Set();
    const out = [];
    for (const raw of items.slice(0, 5000)) {
        if (!isSafeId(raw && raw.id)) continue;
        const media_type = sanitizeMediaType(raw.media_type, 'movie');
        const key = `${media_type}:${raw.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ id: Number(raw.id), media_type });
    }
    return out;
}

function sanitizeLastPlayedItems(items) {
    if (!Array.isArray(items)) return [];
    const seen = new Set();
    const out = [];
    for (const raw of items.slice(0, 5000)) {
        if (!isSafeId(raw && raw.id)) continue;
        const media_type = sanitizeMediaType(raw.media_type, 'tv'); // legacy backups have no media_type
        const key = `${media_type}:${raw.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const timestamp = Number(raw.timestamp);
        out.push({
            id: Number(raw.id),
            media_type,
            title: safeString(raw.title, 300),
            season: toIntOr(raw.season, 1),
            episode: toIntOr(raw.episode, 1),
            timestamp: Number.isFinite(timestamp) ? timestamp : 0
        });
    }
    return out;
}

function sanitizeCustomSelections(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const out = {};
    for (const [key, value] of Object.entries(raw).slice(0, 5000)) {
        if (!/^\d{1,12}$/.test(key) || !value || typeof value !== 'object' || Array.isArray(value)) continue;
        const season = toIntOr(value.season, 0);
        const episode = toIntOr(value.episode, 0);
        if (season < 1 || episode < 1) continue;
        out[key] = { season, episode };
    }
    return out;
}

function sanitizeNewsEntries(items) {
    if (!Array.isArray(items)) return [];
    const out = [];
    const seen = new Set();
    for (const raw of items.slice(0, NEWS_HISTORY_MAX)) {
        if (!isSafeId(raw && raw.id)) continue;
        const media_type = sanitizeMediaType(raw.media_type, 'movie');
        const date = Number(raw.date);
        const entry = {
            id: Number(raw.id),
            media_type,
            title: safeString(raw.title, 300),
            date: Number.isFinite(date) ? date : Date.now()
        };
        let dedupeKey;
        if (media_type === 'tv') {
            entry.season = toIntOr(raw.season, 0);
            entry.episode = toIntOr(raw.episode, 0);
            dedupeKey = `${entry.media_type}:${entry.id}:${entry.season}:${entry.episode}`;
        } else {
            dedupeKey = `${entry.media_type}:${entry.id}`;
        }
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        out.push(entry);
    }
    return out;
}

function sanitizeResolverOverrides(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const out = {};
    for (const [key, value] of Object.entries(raw).slice(0, 500)) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
        if (typeof value !== 'string') continue;
        const template = value.slice(0, 1000);
        if (sourceTemplateError(template)) continue; // drop non-http(s) or broken templates
        out[key] = template;
    }
    return out;
}

// Per-series network schedule sources: showId -> { networkId?, networkName?,
// template? }. Only http/https templates are kept (the network label is
// free text, capped for safety).
function sanitizeNetworkSources(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const out = {};
    for (const [key, value] of Object.entries(raw).slice(0, 5000)) {
        if (!/^\d{1,12}$/.test(key) || !value || typeof value !== 'object' || Array.isArray(value)) continue;
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
        const template = value.template;
        if (template !== undefined && template !== null && template !== '') {
            if (typeof template !== 'string' || sourceTemplateError(template.slice(0, 1000))) continue;
            out[key] = { template: String(template).slice(0, 1000) };
        } else {
            out[key] = {};
        }
        if (value.networkId !== undefined) {
            const nid = Number(value.networkId);
            if (Number.isFinite(nid)) out[key].networkId = nid;
        }
        if (typeof value.networkName === 'string') out[key].networkName = value.networkName.slice(0, 200);
    }
    return out;
}

function sanitizeReleaseState(raw) {
    const clean = { baseline: raw && raw.baseline === true, lastSync: null, shows: {}, movies: {}, moviesPending: {} };
    const lastSync = Number(raw && raw.lastSync);
    if (Number.isFinite(lastSync)) clean.lastSync = lastSync;
    const shows = raw && raw.shows;
    if (shows && typeof shows === 'object' && !Array.isArray(shows)) {
        for (const [key, value] of Object.entries(shows).slice(0, 5000)) {
            if (!/^\d{1,12}$/.test(key) || !value || typeof value !== 'object') continue;
            const season = toIntOr(value.season, -1);
            const episode = toIntOr(value.episode, -1);
            if (season < 0 || episode < 1) continue;
            const base = Number.isFinite(value.ts)
                ? { season, episode, ts: Number(value.ts) }
                : { season, episode };
            // Preserve the network schedule baseline (set by the per-series
            // network source) so restored shows keep their "last seen" state.
            const net = value.net && typeof value.net === 'object' && value.net.season !== undefined
                ? {
                    season: toIntOr(value.net.season, -1),
                    episode: toIntOr(value.net.episode, -1),
                    ts: Number.isFinite(Number(value.net.ts)) ? Number(value.net.ts) : undefined
                }
                : null;
            if (net) base.net = net;
            clean.shows[key] = base;
        }
    }
    const movies = raw && raw.movies;
    if (movies && typeof movies === 'object' && !Array.isArray(movies)) {
        for (const [key, value] of Object.entries(movies).slice(0, 5000)) {
            if (!/^\d{1,12}$/.test(key) || typeof value !== 'string') continue;
            clean.movies[key] = value.slice(0, 10); // stored release date "YYYY-MM-DD"
        }
    }
    const pending = raw && raw.moviesPending;
    if (pending && typeof pending === 'object' && !Array.isArray(pending)) {
        for (const key of Object.keys(pending).slice(0, 5000)) {
            if (/^\d{1,12}$/.test(key) && pending[key] === true) clean.moviesPending[key] = true;
        }
    }
    return clean;
}

backupFile.addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
        try {
            const payload = JSON.parse(reader.result);
            const data = payload && typeof payload === 'object' && payload.data ? payload.data : payload;
            if (!data || typeof data !== 'object') throw new Error('Struttura non valida');

            const wl = sanitizeWatchlistItems(data.myWatchlist);
            const lp = sanitizeLastPlayedItems(data.myLastPlayed);
            const cs = sanitizeCustomSelections(data.myCustomSelections);
            const we = data.myWatchedEpisodes && typeof data.myWatchedEpisodes === 'object' ? data.myWatchedEpisodes : {};
            const nh = sanitizeNewsEntries(data.myNewsHistory);
            let key = safeString(data.myTMDbApiKey, 500).trim() || localStorage.getItem('myTMDbApiKey') || '';
            const cryptoKey = safeString(data.myCryptoKey, 200).trim();
            if (cryptoKey) localStorage.setItem('myCryptoKey', cryptoKey);
            if (isEncryptedKey(key)) {
                try {
                    key = await decryptAPIKey(key);
                } catch {
                    showBackupStatus(t('msg.backupDecryptError'), true);
                    return;
                }
            }
            const rs = data.myResolver && typeof data.myResolver === 'object'
                ? { movie: safeString(data.myResolver.movie, 1000), tv: safeString(data.myResolver.tv, 1000) }
                : { movie: '', tv: '' };
            const ro = sanitizeResolverOverrides(data.myResolverOverrides);
            const nws = sanitizeNetworkSources(data.myNetworkSources);
            const ns = data.myNotifySettings && typeof data.myNotifySettings === 'object'
                ? Object.assign({}, DEFAULT_NOTIFY_SETTINGS, data.myNotifySettings)
                : Object.assign({}, DEFAULT_NOTIFY_SETTINGS);
            ns.autoSyncHours = sanitizeAutoSyncHours(ns.autoSyncHours);
            const rl = sanitizeReleaseState(data.myReleaseState);

            state.apiKey = key;
            syncApiKeyNotice();
            const hydrated = await hydrateWatchlist(wl);
            state.watchlist = [];
            state.watchlistDetails.clear();
            hydrated.forEach(h => {
                state.watchlist.push({ id: h.id, media_type: h.media_type });
                state.watchlistDetails.set(watchlistKey(h.id, h.media_type), h);
            });
            state.lastPlayed = lp;
            state.customSelections = cs;
            state.watchedEpisodes = normalizeWatched(we);
            state.newsHistory = nh.slice(0, NEWS_HISTORY_MAX);
            state.resolver = rs;
            state.resolverOverrides = ro;
            state.networkSources = nws;
            state.notifySettings = ns;
            state.releaseState = rl;
            persistWatchlist();
            localStorage.setItem('myLastPlayed', JSON.stringify(state.lastPlayed));
            localStorage.setItem('myCustomSelections', JSON.stringify(state.customSelections));
            persistWatchedEpisodes();
            persistNewsHistory();
            localStorage.setItem('myTMDbApiKey', key);
            localStorage.setItem('myResolver', JSON.stringify(state.resolver));
            persistResolverOverrides();
            persistNotifySettings();
            persistNetworkSources();
            persistReleaseState();
            syncNotifySettingsInputs();
            startAutoSyncTimer();
            syncResolverNotice();

            if (['grid', 'list'].includes(data.myViewMode)) {
                state.viewMode = data.myViewMode;
                localStorage.setItem('myViewMode', state.viewMode);
            }
            if (['all', 'movie', 'tv'].includes(data.myTypeFilter)) {
                state.typeFilter = data.myTypeFilter;
                localStorage.setItem('myTypeFilter', state.typeFilter);
            }
            if (data.myLang === 'it' || data.myLang === 'en') {
                setLanguage(data.myLang, true);
            }

            settingsKeyInput.value = state.apiKey;
            settingsResolverMovieInput.value = state.resolver.movie || '';
            settingsResolverTvInput.value = state.resolver.tv || '';
            settingsLangInput.value = state.lang;
            syncTools();
            showHome();
            refreshHomeUnwatchedCount();
            showBackupStatus(t('msg.backupRestored'));
        } catch (err) {
            showBackupStatus(t('msg.backupInvalid'), true);
        }
    };
    reader.onerror = () => showBackupStatus(t('msg.backupReadError'), true);
    reader.readAsText(file);
});

// Wipes every user data key from localStorage and resets the in-memory state.
// Language, accepted disclaimer and update-check dismissal are kept so the
// app stays usable and the consent is preserved. The API key is removed
// along with the data. Asks for confirmation first because the operation
// is irreversible.
async function deleteAllData() {
    if (!window.confirm(t('settings.dataDeleteConfirm'))) return;

    const keepKeys = ['myCryptoKey', 'myLang', 'myDisclaimerAccepted', 'myUpdateCheck'];
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && !keepKeys.includes(k)) toRemove.push(k);
    }
    toRemove.forEach(k => localStorage.removeItem(k));

    state.apiKey = '';
    state.watchlist = [];
    state.watchlistDetails.clear();
    state.lastPlayed = [];
    state.customSelections = {};
    state.watchedEpisodes = {};
    state.newsHistory = [];
    state.resolver = {};
    state.resolverOverrides = {};
    state.networkSources = {};
    state.notifySettings = Object.assign({}, DEFAULT_NOTIFY_SETTINGS);
    state.releaseState = { shows: {}, movies: {}, moviesPending: {} };
    state.viewMode = 'grid';
    state.typeFilter = 'all';
    state.kindOrder = 'movie';
    state.currentMedia = null;
    state.customMode = false;
    state.currentSeason = 1;
    state.currentEpisode = 1;

    persistReleaseState();
    persistResolverOverrides();
    persistNetworkSources();
    syncNotifySettingsInputs();

    const status = document.getElementById('data-delete-status');
    if (status) {
        status.classList.remove('is-error');
        status.innerText = t('msg.dataDeleted');
        status.hidden = false;
        setTimeout(() => { status.hidden = true; }, 3000);
    }

    settingsKeyInput.value = state.apiKey;
    settingsResolverMovieInput.value = '';
    settingsResolverTvInput.value = '';
    settingsLangInput.value = state.lang;
    syncApiKeyNotice();
    syncResolverNotice();
    syncTools();
    showHome();
    refreshHomeUnwatchedCount();
    settingsOverlay.hidden = true;
}

export { createBackup, restoreBackup, deleteAllData, hydrateWatchlistGrid };