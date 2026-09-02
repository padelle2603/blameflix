import { state, persistWatchlist, addToWatchlistIndex, removeFromWatchlistIndex } from './state.js';
import { t } from './i18n.js';

function isSaved(id, media_type) {
    return state._watchlistIndex.has(`${media_type}:${id}`);
}

function watchlistKey(id, media_type) {
    return `${media_type}:${id}`;
}

// Returns the cached details for an entry, otherwise the entry itself
// (so the grid also works with minimal data or search results).
function detailFor(item) {
    return state.watchlistDetails.get(watchlistKey(item.id, item.media_type)) || item;
}

function toggleWatchlist() {
    if (!state.currentMedia) return;

    const index = state.watchlist.findIndex(item => item.id === state.currentMedia.id && item.media_type === state.currentMedia.media_type);
    if (index === -1) {
        // Only the identifiers are saved; the details live in memory
        state.watchlist.push({ id: state.currentMedia.id, media_type: state.currentMedia.media_type });
        addToWatchlistIndex(state.currentMedia.id, state.currentMedia.media_type);
        state._watchlistDirty = true;
        state.watchlistDetails.set(watchlistKey(state.currentMedia.id, state.currentMedia.media_type), state.currentMedia);
    } else {
        state.watchlist.splice(index, 1);
        removeFromWatchlistIndex(state.currentMedia.id, state.currentMedia.media_type);
        state._watchlistDirty = true;
        state.watchlistDetails.delete(watchlistKey(state.currentMedia.id, state.currentMedia.media_type));
    }

    persistWatchlist();
    updateWatchlistBtn();
}

function updateWatchlistBtn() {
    const btn = document.getElementById('btn-watchlist');
    const saved = isSaved(state.currentMedia.id, state.currentMedia.media_type);
    btn.innerHTML = saved ? '&#9829;' : '&#9825;';
    const label = saved ? t('detail.savedRemove') : t('detail.addSaved');
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
    btn.classList.toggle('btn--saved', saved);
}

export { watchlistKey, detailFor, toggleWatchlist, updateWatchlistBtn };