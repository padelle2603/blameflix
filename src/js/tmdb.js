import { state } from './state.js';
import { BASE_URL } from './env.js';
import { locale } from './i18n.js';
import { LruCache } from './utils.js';

// TMDB ships two kinds of credentials:
//  - a v3 API key (32 hex chars) passed as the `api_key` query parameter;
//  - a v4 Read Access Token (a JWT: three base64url segments) passed as the
//    `Authorization: Bearer <token>` header. Both are accepted in the same
//    settings field, so we detect the shape and adapt the request.
const TMDB_HOST = 'api.themoviedb.org';

function isV4Token(key) {
    return /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key.trim());
}

async function fetchJson(url, opts = {}) {
    const key = (state.apiKey || '').trim();
    const headers = Object.assign({}, opts.headers);
    let finalUrl = url;
    if (key && isV4Token(key) && finalUrl.includes(TMDB_HOST)) {
        // v4: drop the v3 api_key param and authenticate via the bearer header.
        try {
            const u = new URL(finalUrl);
            u.searchParams.delete('api_key');
            finalUrl = u.toString();
        } catch (err) { /* leave the URL untouched if it is not parseable */ }
        headers.Authorization = `Bearer ${key}`;
    }
    const res = await fetch(finalUrl, Object.assign({}, opts, { headers }));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

// Unified in-memory LRU cache for TMDB detail requests ('movie:id' /
// 'tv:id'), shared by the details view, the release sync and the home
// counter. Cleared on language change so titles re-download with the
// right locale. Entries expire after 30 minutes: the release check runs
// at every foreground and must not keep serving stale data within the
// same session.
const detailsCache = new LruCache(120, 30 * 60 * 1000);

// One short backoff answers a transient HTTP 429 instead of failing the
// card: detail requests burst on startup (watchlist hydration) and on a
// cold cache. Failures are discarded from the cache, so a retry is safe.
const DETAIL_RATE_LIMIT_RETRY_MS = 500;

async function fetchDetail(url) {
    try {
        return await fetchJson(url);
    } catch (err) {
        if (err && err.message === 'HTTP 429') {
            await new Promise(r => setTimeout(r, DETAIL_RATE_LIMIT_RETRY_MS));
            return fetchJson(url);
        }
        throw err;
    }
}

function getDetails(type, id) {
    const key = `${type}:${id}`;
    if (!detailsCache.has(key)) {
        detailsCache.set(key, fetchDetail(`${BASE_URL}/${type}/${id}?api_key=${state.apiKey}&language=${locale()}`).catch(err => {
            detailsCache.delete(key); // failures are not cached: retry is possible
            throw err;
        }));
    }
    return detailsCache.get(key);
}

const seasonEpisodesCache = new LruCache(200); // key 'showId:season' -> TMDB episodes array

// Returns the episodes of a season from the shared cache, downloading them
// once from TMDB. Used by the episode list, the bulk marks and the
// unwatched counters.
async function getSeasonEpisodes(showId, seasonNumber) {
    const key = `${showId}:${seasonNumber}`;
    if (seasonEpisodesCache.has(key)) return seasonEpisodesCache.get(key);
    const data = await fetchJson(`${BASE_URL}/tv/${showId}/season/${seasonNumber}?api_key=${state.apiKey}&language=${locale()}`);
    const eps = data.episodes || [];
    seasonEpisodesCache.set(key, eps);
    return eps;
}

const tvSeasonsCache = new LruCache(150); // id -> seasons array (for the home counter)
const showUnwatchedCache = new LruCache(300); // id -> unwatched episodes (poster badges)

async function fetchSeasons(showId) {
    if (tvSeasonsCache.has(showId)) return tvSeasonsCache.get(showId);
    try {
        const data = await getDetails('tv', showId);
        const seasons = (data.seasons || []).filter(s => s.season_number >= 0);
        tvSeasonsCache.set(showId, seasons);
        return seasons;
    } catch (err) {
        return [];
    }
}

export { fetchJson, detailsCache, getDetails, seasonEpisodesCache, getSeasonEpisodes, tvSeasonsCache, showUnwatchedCache, fetchSeasons };