import { state } from './state.js';
import { searchClear, homeView, detailView, sectionEyebrow, sectionTitle, sectionCount, homeUnwatchedEl } from './dom.js';
import { fetchJson } from './tmdb.js';
import { BASE_URL } from './env.js';
import { t, locale } from './i18n.js';
import { renderGrid, showEmpty, showGridLoading, renderHome } from './catalog.js';
import { LruCache } from './utils.js';

const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let searchDebounceTimer = null;
let searchAbort = null;

// LRU cache for search results: key = "query:lang", value = { results, timestamp }
const searchCache = new LruCache(50);

// Cancels the pending debounced request and the in-flight one, if any.
function cancelSearch() {
    clearTimeout(searchDebounceTimer);
    if (searchAbort) {
        searchAbort.abort();
        searchAbort = null;
    }
}

// Entry point from the input: the network request is deferred until the
// user stops typing, so one keystroke does not mean one TMDB request.
function handleSearch(query) {
    const q = query.trim();
    if (q.length < 2) {
        cancelSearch();
        searchClear.hidden = query.length === 0;
        if (!state.searching) return;
        renderHome();
        return;
    }
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => performSearch(q), SEARCH_DEBOUNCE_MS);
}

async function performSearch(q) {
    const lang = locale();
    const cacheKey = `${q}:${lang}`;
    
    // Check cache first
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL) {
        state.currentList = cached.results;
        renderGrid(state.currentList);
        return;
    }

    // A newer request supersedes (and aborts) the previous one, so stale
    // responses can never overwrite fresh results.
    if (searchAbort) searchAbort.abort();
    searchAbort = new AbortController();
    const signal = searchAbort.signal;

    state.searching = true;
    searchClear.hidden = false;
    homeView.hidden = false;
    detailView.hidden = true;
    // The search page keeps only the results heading: the home eyebrow and
    // the TMDB archive label are both suppressed. The unwatched badge is a
    // home concept, so it is hidden while browsing the archive.
    sectionEyebrow.innerText = '';
    sectionTitle.innerText = t('home.searchResults', { q });
    sectionCount.innerText = '';
    homeUnwatchedEl.hidden = true;
    showGridLoading();

    try {
        const data = await fetchJson(
            `${BASE_URL}/search/multi?api_key=${state.apiKey}&query=${encodeURIComponent(q)}&language=${lang}`,
            { signal }
        );
        // Filter only movies and TV series
        const results = data.results.filter(item => item.media_type === 'movie' || item.media_type === 'tv');
        state.currentList = results;
        
        // Cache the results
        searchCache.set(cacheKey, { results, timestamp: Date.now() });
        
        renderGrid(state.currentList);
    } catch (err) {
        if (err && err.name === 'AbortError') return; // superseded by a newer search
        showEmpty(t('msg.networkError'), t('msg.networkErrorDesc'));
    }
}

export { cancelSearch, handleSearch, searchCache };