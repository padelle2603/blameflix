import { state, invalidateUnwatchedSnapshot } from './state.js';

// --- WATCHED EPISODES ---
// Internal format: { showId: { season: [numbers...] } } (unique, ordered list).
// On save it is compressed into ranges [[start,end],...] when shorter.
// watchedAt mirrors the watched state with timestamps: { showId: { season: { ep: Date.now() } } }.

// Reads a season in any format (legacy {ep:true}, list of numbers,
// ranges) and returns the unique, ordered list of numbers.
function seasonToList(value) {
    if (value === null || typeof value !== 'object') return [];
    const nums = [];
    if (Array.isArray(value)) {
        value.forEach(v => {
            if (Array.isArray(v) && v.length === 2) {
                const a = Number(v[0]), b = Number(v[1]);
                if (Number.isFinite(a) && Number.isFinite(b)) {
                    const lo = Math.min(a, b), hi = Math.max(a, b);
                    for (let i = lo; i <= hi; i++) nums.push(i);
                }
            } else {
                const n = Number(v);
                if (Number.isFinite(n)) nums.push(n);
            }
        });
    } else {
        Object.keys(value).forEach(k => {
            if (value[k]) {
                const n = Number(k);
                if (Number.isFinite(n)) nums.push(n);
            }
        });
    }
    return [...new Set(nums)].sort((a, b) => a - b);
}

// Converts any saved format into the internal list for every season.
function normalizeWatched(raw) {
    const out = {};
    if (!raw || typeof raw !== 'object') return out;
    for (const showId of Object.keys(raw)) {
        const seasons = raw[showId];
        if (!seasons || typeof seasons !== 'object') continue;
        const showOut = {};
        for (const season of Object.keys(seasons)) {
            const list = seasonToList(seasons[season]);
            if (list.length) showOut[season] = list;
        }
        if (Object.keys(showOut).length) out[showId] = showOut;
    }
    return out;
}

function normalizeWatchedAt(raw) {
    const out = {};
    if (!raw || typeof raw !== 'object') return out;
    for (const showId of Object.keys(raw)) {
        const seasons = raw[showId];
        if (!seasons || typeof seasons !== 'object') continue;
        const showOut = {};
        for (const season of Object.keys(seasons)) {
            const eps = seasons[season];
            if (!eps || typeof eps !== 'object') continue;
            const s = {};
            for (const ep of Object.keys(eps)) {
                const ts = Number(eps[ep]);
                if (Number.isFinite(ts) && ts > 0) s[ep] = ts;
            }
            if (Object.keys(s).length) showOut[season] = s;
        }
        if (Object.keys(showOut).length) out[showId] = showOut;
    }
    return out;
}

function persistWatchedAt() {
    localStorage.setItem('myWatchedAt', JSON.stringify(state.watchedAt));
}

// Compresses an ordered list into ranges [[start,end],...].
function persistWatchedEpisodes() {
    localStorage.setItem('myWatchedEpisodes', JSON.stringify(state.watchedEpisodes));
    persistWatchedAt();
    _invalidateWatchedCache();
    invalidateUnwatchedSnapshot(); // watched state changed: cached home counts are stale
    state._watchedDirty = true;
}

// Set-based cache for O(1) episode lookups. Rebuilt lazily after mutations.
let _watchedSetsCache = null;

function _rebuildWatchedCache() {
    const cache = {};
    for (const showId of Object.keys(state.watchedEpisodes)) {
        const seasons = state.watchedEpisodes[showId];
        if (!seasons || typeof seasons !== 'object') continue;
        const showCache = {};
        for (const season of Object.keys(seasons)) {
            const list = seasons[season];
            if (Array.isArray(list)) showCache[season] = new Set(list);
        }
        if (Object.keys(showCache).length) cache[showId] = showCache;
    }
    return cache;
}

function _invalidateWatchedCache() {
    _watchedSetsCache = null;
}

function isEpisodeWatched(showId, season, episode) {
    if (!_watchedSetsCache) _watchedSetsCache = _rebuildWatchedCache();
    const showCache = _watchedSetsCache[showId];
    const seasonSet = showCache && showCache[season];
    return seasonSet instanceof Set ? seasonSet.has(episode) : false;
}

// Marks (true) or removes (false) an episode from the watched ones; without
// force it toggles.
function setEpisodeWatched(showId, season, episode, watched) {
    const seasons = state.watchedEpisodes[showId] || (state.watchedEpisodes[showId] = {});
    const list = seasons[season] || [];
    const next = watched === undefined ? !list.includes(episode) : !!watched;
    let updated;
    if (next) {
        updated = list.includes(episode) ? list : [...list, episode].sort((a, b) => a - b);
    } else {
        updated = list.filter(n => n !== episode);
    }
    if (updated.length) seasons[season] = updated;
    else delete seasons[season];
    if (!Object.keys(seasons).length) delete state.watchedEpisodes[showId];

    const watchers = state.watchedAt[showId] || (state.watchedAt[showId] = {});
    const epMap = watchers[season] || (watchers[season] = {});
    if (next) {
        const ts = Number(epMap[episode]);
        epMap[episode] = (Number.isFinite(ts) && ts > 0) ? ts : Date.now();
    } else {
        delete epMap[episode];
    }
    if (!Object.keys(epMap).length) delete watchers[season];
    if (!Object.keys(watchers).length) delete state.watchedAt[showId];

    persistWatchedEpisodes();
    return next;
}

function toggleEpisodeWatched(showId, season, episode, force) {
    return setEpisodeWatched(showId, season, episode, force);
}

export { normalizeWatched, normalizeWatchedAt, persistWatchedEpisodes, isEpisodeWatched, toggleEpisodeWatched, _invalidateWatchedCache };