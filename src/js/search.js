import { state } from './state.js';
import { searchInput, searchClear, homeView, detailView, sectionEyebrow, sectionTitle, sectionCount } from './dom.js';
import { fetchJson } from './tmdb.js';
import { BASE_URL } from './env.js';
import { t, locale } from './i18n.js';
import { renderGrid, showEmpty, renderHome } from './catalog.js';

const SEARCH_DEBOUNCE_MS = 300;
let searchDebounceTimer = null;
let searchAbort = null;

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
    // A newer request supersedes (and aborts) the previous one, so stale
    // responses can never overwrite fresh results.
    if (searchAbort) searchAbort.abort();
    searchAbort = new AbortController();
    const signal = searchAbort.signal;

    state.searching = true;
    searchClear.hidden = false;
    homeView.hidden = false;
    detailView.hidden = true;
    sectionEyebrow.innerText = t('home.tmdbArchive');
    sectionTitle.innerText = t('home.searchResults', { q });
    sectionCount.innerText = '';

    try {
        const data = await fetchJson(
            `${BASE_URL}/search/multi?api_key=${state.apiKey}&query=${encodeURIComponent(q)}&language=${locale()}`,
            { signal }
        );
        // Filter only movies and TV series
        const results = data.results.filter(item => item.media_type === 'movie' || item.media_type === 'tv');
        state.currentList = results;
        renderGrid(state.currentList);
    } catch (err) {
        if (err && err.name === 'AbortError') return; // superseded by a newer search
        console.error('Search error:', err);
        showEmpty(t('msg.networkError'), t('msg.networkErrorDesc'));
    }
}

export { cancelSearch, handleSearch };