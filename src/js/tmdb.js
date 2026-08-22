import { state } from './state.js';
import { BASE_URL } from './env.js';
import { locale } from './i18n.js';
import { LruCache } from './utils.js';

async function fetchJson(url, opts) {
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

// Unified in-memory LRU cache for TMDB detail requests ('movie:id' /
// 'tv:id'), shared by the details view, the release sync and the home
// counter. Cleared on language change so titles re-download with the
// right locale.
const detailsCache = new LruCache(120);

function getDetails(type, id) {
    const key = `${type}:${id}`;
    if (!detailsCache.has(key)) {
        detailsCache.set(key, fetchJson(`${BASE_URL}/${type}/${id}?api_key=${state.apiKey}&language=${locale()}`).catch(err => {
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