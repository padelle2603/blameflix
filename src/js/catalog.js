import { state, persistCollapsedRows, persistSortMode, addToWatchlistIndex, removeFromWatchlistIndex } from './state.js';
import { homeView, detailView, searchInput, searchClear, grid, emptyState, homeHead, searchHead, searchTitle, catalogMenuBtn, catalogMenuPanel, cloudQuickbar } from './dom.js';
import { escapeHtml, tmdbImagePath } from './utils.js';
import { IMG_GRID, PLACEHOLDER } from './env.js';
import { showUnwatchedCache } from './tmdb.js';
import { detailFor } from './watchlist.js';
import { refreshHomeUnwatchedCount } from './counter.js';
import { showDetails } from './details.js';
import { renderNewsSection } from './news.js';
import { t } from './i18n.js';
import { cancelSearch } from './search.js';
import { trapFocus } from './focusTrap.js';
import { slideDetailToHome, slideGridSwitch } from './viewTransition.js';

// Event delegation on the grid: cards open the detail view without
// attaching a click and keydown listener per card at every re-render.
function handleCardActivation(e) {
    // Quick-add button: toggle watchlist without opening detail
    const addBtn = e.target.closest('[data-action="quick-add"]');
    if (addBtn) {
        e.stopPropagation();
        const id = Number(addBtn.dataset.id);
        const type = addBtn.dataset.type;
        const key = `${type}:${id}`;
        const isCurrentlySaved = state._watchlistIndex.has(key);
        if (!isCurrentlySaved) {
            state.watchlist.push({ id, media_type: type });
            addToWatchlistIndex(id, type);
            state._watchlistDirty = true;
            addBtn.innerHTML = '&#9829;';
            addBtn.classList.add('card-add-btn--saved');
            addBtn.setAttribute('aria-label', t('detail.savedRemove'));
        } else {
            const existing = state.watchlist.findIndex(w => w.id === id && w.media_type === type);
            state.watchlist.splice(existing, 1);
            removeFromWatchlistIndex(id, type);
            state._watchlistDirty = true;
            addBtn.innerHTML = '&#9825;';
            addBtn.classList.remove('card-add-btn--saved');
            addBtn.setAttribute('aria-label', t('detail.addSaved'));
        }
        localStorage.setItem('myWatchlist', JSON.stringify(state.watchlist));
        return;
    }
    const card = e.target.closest('.card');
    if (!card || !card.dataset.id) return;
    if (e.type === 'keydown') {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
    }
    showDetails(Number(card.dataset.id), card.dataset.type);
}
grid.addEventListener('click', handleCardActivation);
grid.addEventListener('keydown', handleCardActivation);

function syncCloudQuickbar() {
    if (cloudQuickbar) cloudQuickbar.hidden = !state.cloudSync.enabled || state.searching;
    document.body.classList.toggle('is-searching', !!state.searching);
}

async function renderHome() {
    const detailVisible = !detailView.hidden;
    const wasSearching = state.searching;

    cancelSearch();
    state.searching = false;
    state.currentList = state.watchlist;
    searchClear.hidden = searchInput.value.length === 0;
    renderNewsSection();
    refreshHomeUnwatchedCount();
    syncCloudQuickbar();

    if (detailVisible) {
        // Detail -> Home (SlideX backward): prepare home headers before slide
        homeHead.hidden = false;
        searchHead.hidden = true;
        await slideDetailToHome();
        // After view slide, avoid full grid refresh that looks like a flash.
        // Grid already shows watchlist underneath detail (detail was absolute overlay).
        // Re-render only if watchlist/search state changed or grid is empty.
        const needsFullRender = state._watchlistDirty || wasSearching || !grid.innerHTML.trim() || state.currentList !== state.watchlist;
        if (needsFullRender) {
            renderGrid(state.currentList);
            state._watchlistDirty = false;
            state._watchedDirty = false;
        } else if (state._watchedDirty) {
            // Only watched state changed (e.g., marked episodes in detail) -> patch single card badge
            const patched = refreshHomeCardBadge(state.currentMedia?.id, state.currentMedia?.media_type);
            if (!patched) renderGrid(state.currentList);
            state._watchedDirty = false;
            // Keep view-stack height in sync after badge update (no jump)
            requestAnimationFrame(refreshRailArrows);
        } else {
            requestAnimationFrame(refreshRailArrows);
        }
        return;
    }

    if (wasSearching) {
        // Search -> Home inside same view: animate grid backward
        homeHead.hidden = false;
        searchHead.hidden = true;
        await slideGridSwitch(() => {
            renderGrid(state.currentList);
            state._watchlistDirty = false;
            state._watchedDirty = false;
        }, 'backward');
        return;
    }

    // Home -> Home (initial or refresh): instant
    homeHead.hidden = false;
    searchHead.hidden = true;
    homeView.hidden = false;
    renderGrid(state.currentList);
    state._watchlistDirty = false;
    state._watchedDirty = false;
}

async function showHome() {
    const detailVisible = !detailView.hidden;
    const shouldRestoreSearch = detailVisible && state.searching && (searchInput.value || '').trim().length >= 2;
    if (shouldRestoreSearch) {
        // Detail was opened from search -> return to search, not watchlist
        await restoreSearchFromDetail();
        return;
    }
    searchInput.value = '';
    searchClear.hidden = true;
    await renderHome();
}

async function restoreSearchFromDetail() {
    // Keep searching state and currentList (search results)
    // Ensure headers for search
    homeHead.hidden = true;
    searchHead.hidden = false;
    const q = (searchInput.value || '').trim();
    if (q) {
        try { searchTitle.innerText = t('home.searchResults', { q }); } catch (_e) { /* ignore */ }
    }
    searchClear.hidden = false;
    await slideDetailToHome();
    // Grid already contains search results (preserved while detail was open)
    // Ensure it is rendered (in case it was cleared)
    if (!grid.innerHTML.trim()) renderGrid(state.currentList);
    renderNewsSection();
    refreshHomeUnwatchedCount();
    syncCloudQuickbar();
}

async function clearSearch() {
    // Called from search input when query <2 or clear button
    // If detail is open, go to home via view slide; else grid slide is handled by renderHome
    await showHome();
}

function showEmpty(kicker, text, retryFn) {
    grid.style.display = 'none';
    emptyState.querySelector('.empty-kicker').innerText = kicker;
    emptyState.querySelector('p:last-child').innerText = text;
    let retryBtn = emptyState.querySelector('.empty-retry');
    if (retryFn) {
        if (!retryBtn) {
            retryBtn = document.createElement('button');
            retryBtn.className = 'btn empty-retry';
            retryBtn.setAttribute('type', 'button');
            emptyState.appendChild(retryBtn);
        }
        retryBtn.textContent = t('common.retry');
        retryBtn.hidden = false;
        retryBtn.onclick = retryFn;
    } else if (retryBtn) {
        retryBtn.hidden = true;
        retryBtn.onclick = null;
    }
    emptyState.hidden = false;
}

// Builds one skeleton card, matching the poster/credit-block shape of a real
// card so the loading state does not shift the layout.
function skeletonCardHtml() {
    return `
        <div class="card card--skeleton" aria-hidden="true">
            <div class="skeleton-block card-skeleton__poster"></div>
            <div class="credit-block">
                <div class="skeleton-block sk-title"></div>
                <div class="skeleton-block sk-meta"></div>
            </div>
        </div>`;
}

// Shows skeleton cards while a search (or a first load) is in flight. The
// next renderGrid()/showEmpty()/showHome() replaces them.
function showGridLoading() {
    emptyState.hidden = true;
    grid.style.display = '';
    const count = state.viewMode === 'list' ? 6 : 8;
    let html = '';
    for (let i = 0; i < count; i++) {
        html += skeletonCardHtml();
    }
    grid.innerHTML = html;
}

function renderGrid(items) {
    const filtered = state.typeFilter === 'all' ? items : items.filter(item => item.media_type === state.typeFilter);
    grid.innerHTML = '';

    if (!filtered.length) {
        if (items.length && state.typeFilter !== 'all') {
            showEmpty(t('home.emptyFilter'), t('home.emptyFilterDesc', { label: filterLabel(state.typeFilter) }));
        } else if (state.searching) {
            showEmpty(t('home.noResults'), t('home.noResultsDesc'));
        } else {
            showEmpty(t('home.noTitles'), t('home.emptyRoom'));
        }
        return;
    }

    grid.style.display = '';
    emptyState.hidden = true;

    const movies = sortTitles(filtered.filter(item => item.media_type === 'movie'));
    const series = sortTitles(filtered.filter(item => item.media_type === 'tv'));

    // Rows are always labeled with their item count and follow the
    // persisted ⇅ order.
    const ordered = state.kindOrder === 'tv'
        ? [['tv', series], ['movie', movies]]
        : [['movie', movies], ['tv', series]];

    const frag = document.createDocumentFragment();
    ordered.forEach(([kind, list]) => {
        if (list.length) frag.appendChild(buildKindRow(kind, list));
    });
    grid.appendChild(frag);
    requestAnimationFrame(refreshRailArrows);
}

function toggleKindCollapse(kind) {
    const wasCollapsed = !!state.collapsedRows[kind];
    state.collapsedRows[kind] = !wasCollapsed;
    persistCollapsedRows();
    const row = grid.querySelector(`.kind-row[data-kind="${kind}"]`);
    if (!row) return;
    row.classList.toggle('is-collapsed', state.collapsedRows[kind]);
    const btn = row.querySelector('.kind-row__heading-toggle');
    if (btn) {
        btn.setAttribute('aria-expanded', String(!state.collapsedRows[kind]));
        const arrow = btn.querySelector('.kind-row__toggle');
        if (arrow) arrow.textContent = state.collapsedRows[kind] ? '\u25B8' : '\u25BE';
    }
}

// Builds one card exactly as the old flat grid did (shared by every view).
function makeCard(item) {
    const d = detailFor(item);
    const poster = tmdbImagePath(d.poster_path) ? `${IMG_GRID}${d.poster_path}` : PLACEHOLDER;
    const title = d.title || d.name || t('common.noTitle');
    const date = d.release_date || d.first_air_date || '';
    const year = date ? date.substring(0, 4) : '—';
    const genre = Array.isArray(d.genres) && d.genres.length ? ` · ${d.genres[0]}` : '';
    // The "N to watch" badge belongs to the home watchlist only; search
    // results come from the TMDB archive, so the badge is not shown there.
    const unwatched = (item.media_type === 'tv' && !state.searching) ? showUnwatchedCache.get(item.id) : 0;
    let resumeLabel = '';
    if (unwatched > 0 && item.media_type === 'tv') {
        const lp = state._lastPlayedMap.get(`${item.id}:tv`);
        if (lp) {
            const nextEp = lp.episode + 1;
            resumeLabel = `${t('common.resume')} S${lp.season}E${nextEp}`;
        } else {
            resumeLabel = `${unwatched} ${t('common.toWatch')}`;
        }
    } else if (unwatched > 0) {
        resumeLabel = `${unwatched} ${t('common.toWatch')}`;
    }

    const card = document.createElement('div');
    card.className = 'card';
    if (state.viewMode === 'list') card.classList.add('card--list');
    card.dataset.id = item.id;
    card.dataset.type = item.media_type;
    card.tabIndex = 0;

    const saved = state.searching && state._watchlistIndex.has(`${item.media_type}:${item.id}`);

    card.innerHTML = `
        <div class="card-poster">
            <img src="${poster}" alt="${escapeHtml(title)}" loading="lazy" decoding="async" sizes="(max-width: 600px) 120px, 185px">
            ${resumeLabel ? `<span class="card-unwatched">${escapeHtml(resumeLabel)}</span>` : ''}
            ${state.searching ? `<button type="button" class="card-add-btn ${saved ? 'card-add-btn--saved' : ''}" data-action="quick-add" data-id="${item.id}" data-type="${item.media_type}" aria-label="${saved ? t('detail.savedRemove') : t('detail.addSaved')}">${saved ? '&#9829;' : '&#9825;'}</button>` : ''}
        </div>
        <div class="credit-block">
            <h3 class="credit-title">${escapeHtml(title)}</h3>
            <p class="credit-meta">${year}${escapeHtml(genre)}</p>
        </div>
    `;
    return card;
}

// Replaces a single card in place once its details arrive, so hydration
// populates the library card-by-card without re-rendering the whole grid.
function patchCard(d) {
    const card = grid.querySelector(`.card[data-id="${d.id}"][data-type="${d.media_type}"]`);
    if (card) card.replaceWith(makeCard(d));
}

// Updates only the unwatched badge of a home card (efficient, no full grid refresh).
// Returns true if patched, false if card not found (fallback to full render).
function refreshHomeCardBadge(id, type) {
    if (!id || !type) return false;
    const card = grid.querySelector(`.card[data-id="${id}"][data-type="${type}"]`);
    if (!card) return false;
    const item = state.watchlist.find(w => w.id === id && w.media_type === type);
    if (!item) return false;
    const unwatched = (type === 'tv') ? (showUnwatchedCache.get(id) || 0) : 0;
    let resumeLabel = '';
    if (unwatched > 0) {
        const lp = state._lastPlayedMap.get(`${id}:tv`);
        if (lp) resumeLabel = `${t('common.resume')} S${lp.season}E${lp.episode + 1}`;
        else resumeLabel = `${unwatched} ${t('common.toWatch')}`;
    }
    const posterWrap = card.querySelector('.card-poster');
    if (!posterWrap) return false;
    let badge = posterWrap.querySelector('.card-unwatched');
    if (resumeLabel) {
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'card-unwatched';
            posterWrap.appendChild(badge);
        }
        badge.textContent = resumeLabel;
    } else if (badge) {
        badge.remove();
    }
    return true;
}

const prefersReducedMotion = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };

// Slides a rail by roughly one viewport of cards.
function scrollRail(rail, direction) {
    rail.scrollBy({
        left: direction * rail.clientWidth * 0.9,
        behavior: prefersReducedMotion.matches ? 'auto' : 'smooth'
    });
}

// Recomputes the edge arrows of ONE rail: each arrow is inert on its own
// side, and both hide completely when nothing overflows.
function syncRailArrows(rail) {
    const wrap = rail.closest('.rail-wrap');
    if (!wrap) return;
    const prev = wrap.querySelector('.rail-arrow--prev');
    const next = wrap.querySelector('.rail-arrow--next');
    const max = rail.scrollWidth - rail.clientWidth;
    if (prev) prev.disabled = rail.scrollLeft <= 1;
    if (next) next.disabled = rail.scrollLeft >= max - 1;
    wrap.classList.toggle('is-scrollable', max > 1);
}

// Throttled scroll handling: coalesces ~60fps scroll events into one rAF flush.
let _scrollRafId = null;
const _pendingRails = new Set();
function _flushScroll() {
    _scrollRafId = null;
    for (const rail of _pendingRails) syncRailArrows(rail);
    _pendingRails.clear();
}

// Full pass over every rendered rail: used after renders, resizes and
// order swaps. Per-scroll updates go through syncRailArrows() instead, so
// sliding one row never touches the others.
function refreshRailArrows() {
    grid.querySelectorAll('.rail').forEach(syncRailArrows);
}

window.addEventListener('resize', () => {
    if (!homeView.hidden) refreshRailArrows();
});

// Netflix-style keyboard navigation inside the rails: ←/→ move focus
// between neighbouring cards, ↑/↓ jump to the same slot of the row
// above/below. The browser scrolls the focused card into view for free.
grid.addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    const card = e.target.closest('.card');
    if (!card || !grid.contains(card)) return;
    const rail = card.closest('.rail');
    if (!rail) return;

    const cards = Array.from(rail.querySelectorAll(':scope > .card'));
    const idx = cards.indexOf(card);
    let target = null;

    if (e.key === 'ArrowLeft') target = cards[idx - 1];
    else if (e.key === 'ArrowRight') target = cards[idx + 1];
    else {
        const rails = Array.from(grid.querySelectorAll('.rail'));
        const sibling = rails[rails.indexOf(rail) + (e.key === 'ArrowUp' ? -1 : 1)];
        if (sibling) {
            const siblings = sibling.querySelectorAll(':scope > .card');
            target = siblings[Math.min(idx, siblings.length - 1)];
        }
    }

    if (target) {
        e.preventDefault();
        target.focus();
    }
});

// One horizontal row: kind label with the row count, edge arrows and the
// scrolling track of cards. Overflowing titles slide out of the screen
// instead of wrapping to a second line.
function buildKindRow(kind, items) {
    const section = document.createElement('section');
    section.className = 'kind-row';
    section.dataset.kind = kind;

    const label = `${kind === 'movie' ? t('home.kindMovies') : t('home.kindSeries')} - ${items.length}`;
    // Collapse state only applies to the home page: search results always
    // render fully expanded, otherwise a collapsed home row would surface in
    // the results with no toggle to reopen it.
    const collapsed = !state.searching && !!state.collapsedRows[kind];

    if (collapsed) section.classList.add('is-collapsed');

    const head = document.createElement('h3');
    head.className = 'kind-row__head';

    if (state.searching) {
        // Search results: the rows stay always expanded, no collapse toggle.
        head.innerText = label;
    } else {
        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'kind-row__heading-toggle';
        toggleBtn.dataset.action = 'toggle-kind-collapse';
        toggleBtn.dataset.kind = kind;
        toggleBtn.setAttribute('aria-expanded', String(!collapsed));
        const arrow = document.createElement('span');
        arrow.className = 'kind-row__toggle';
        arrow.setAttribute('aria-hidden', 'true');
        arrow.textContent = collapsed ? '\u25B8' : '\u25BE';
        toggleBtn.appendChild(arrow);
        toggleBtn.appendChild(document.createTextNode(` ${label}`));
        head.appendChild(toggleBtn);
    }
    section.appendChild(head);

    const wrap = document.createElement('div');
    wrap.className = 'rail-wrap';

    const rail = document.createElement('div');
    rail.className = state.viewMode === 'list' ? 'rail rail--list' : 'rail';
    rail.setAttribute('role', 'group');
    rail.setAttribute('aria-label', label);

    const frag = document.createDocumentFragment();
    items.forEach(item => frag.appendChild(makeCard(item)));
    rail.appendChild(frag);
    rail.addEventListener('scroll', () => {
        _pendingRails.add(rail);
        if (!_scrollRafId) _scrollRafId = requestAnimationFrame(_flushScroll);
    }, { passive: true });

    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'rail-arrow rail-arrow--prev';
    prev.setAttribute('aria-label', t('home.scrollPrev'));
    prev.textContent = '‹';

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'rail-arrow rail-arrow--next';
    next.setAttribute('aria-label', t('home.scrollNext'));
    next.textContent = '›';

    prev.addEventListener('click', () => scrollRail(rail, -1));
    next.addEventListener('click', () => scrollRail(rail, 1));

    wrap.append(prev, rail, next);
    section.appendChild(wrap);
    return section;
}

// --- CATALOG FILTERS AND VIEW ---

let _ctlTypeBtns, _ctlViewBtns, _ctlSortBtns;

function initToolBtns() {
    _ctlTypeBtns = document.querySelectorAll('.ctl[data-type]');
    _ctlViewBtns = document.querySelectorAll('.ctl[data-view]');
    _ctlSortBtns = document.querySelectorAll('.ctl[data-sort]');
}

function filterLabel(type) {
    if (type === 'movie') return t('filter.movie');
    if (type === 'tv') return t('filter.tv');
    return t('filter.all');
}

// Orders the titles inside one row (movies or series) according to the
// persisted sortMode. The list is copied before sorting so the original
// watchlist (addition) order is never mutated. Titles whose details are not
// hydrated yet fall back to an empty key and stay at the end.
function titleSortKey(item) {
    const d = detailFor(item);
    const title = String(d.title || d.name || '').toLocaleLowerCase();
    const date = d.release_date || d.first_air_date || '';
    const rating = Number(d.vote_average) || 0;
    return { title, date, rating };
}

function sortTitles(list) {
    if (state.sortMode === 'added') return list.slice();
    const sorted = list.slice();
    // Precompute sort keys once per item: O(N) instead of O(N log N) recomputations.
    const keys = new Map();
    for (const item of sorted) keys.set(item, titleSortKey(item));
    if (state.sortMode === 'alpha') {
        sorted.sort((a, b) => keys.get(a).title.localeCompare(keys.get(b).title));
    } else if (state.sortMode === 'release') {
        sorted.sort((a, b) => keys.get(b).date.localeCompare(keys.get(a).date));
    } else if (state.sortMode === 'rating') {
        sorted.sort((a, b) => keys.get(b).rating - keys.get(a).rating);
    }
    return sorted;
}

function syncTools() {
    if (!_ctlTypeBtns) initToolBtns();
    _ctlTypeBtns?.forEach(btn => {
        btn.setAttribute('aria-pressed', btn.dataset.type === state.typeFilter ? 'true' : 'false');
    });
    _ctlViewBtns?.forEach(btn => {
        btn.setAttribute('aria-pressed', btn.dataset.view === state.viewMode ? 'true' : 'false');
    });
    _ctlSortBtns?.forEach(btn => {
        btn.setAttribute('aria-pressed', btn.dataset.sort === state.sortMode ? 'true' : 'false');
    });
}

function setFilter(type) {
    if (state.typeFilter === type) return;
    state.typeFilter = type;
    localStorage.setItem('myTypeFilter', state.typeFilter);
    syncTools();
    renderGrid(state.currentList);
}

function setView(mode) {
    if (state.viewMode === mode) return;
    state.viewMode = mode;
    localStorage.setItem('myViewMode', state.viewMode);
    syncTools();
    renderGrid(state.currentList);
}

function setSort(mode) {
    if (state.sortMode === mode) return;
    state.sortMode = mode;
    persistSortMode();
    syncTools();
    renderGrid(state.currentList);
}

// --- MOVIE/SERIES ROW ORDER ---

// Reflects the persisted kind order on the ⇅ toggle button; the row order
// itself is decided at render time by renderGrid.
function applyKindOrder() {
    const btn = document.getElementById('btn-swap');
    if (btn) btn.setAttribute('aria-pressed', String(state.kindOrder === 'tv'));
}

// Swaps which block (movies vs TV series) sits on the top row of the "all"
// view; the choice is persisted and exposed through aria-pressed.
function toggleKindOrder() {
    state.kindOrder = state.kindOrder === 'tv' ? 'movie' : 'tv';
    localStorage.setItem('myKindOrder', state.kindOrder);
    applyKindOrder();
    if (!homeView.hidden) renderGrid(state.currentList);
}

applyKindOrder();

// --- CATALOG OPTIONS MENU (⋮) ---

function closeCatalogMenu() {
    if (!catalogMenuPanel.hidden) {
        catalogMenuPanel.hidden = true;
        catalogMenuBtn.setAttribute('aria-expanded', 'false');
        if (catalogMenuPanel._trap) {
            catalogMenuPanel._trap.close();
            catalogMenuPanel._trap = null;
        }
    }
}

// Opens/closes the library options dropdown. The panel stays open after a
// selection; it closes on toggle, outside click or Escape.
function toggleCatalogMenu() {
    const willOpen = catalogMenuPanel.hidden;
    catalogMenuPanel.hidden = !willOpen;
    catalogMenuBtn.setAttribute('aria-expanded', String(willOpen));
    if (willOpen) {
        catalogMenuPanel._trap = trapFocus(catalogMenuPanel, { onEsc: closeCatalogMenu, restoreFocusTo: catalogMenuBtn });
        const first = catalogMenuPanel.querySelector('button:not(:disabled), [href]');
        if (first) first.focus();
    } else if (catalogMenuPanel._trap) {
        catalogMenuPanel._trap.close();
        catalogMenuPanel._trap = null;
    }
}

document.addEventListener('click', (e) => {
    if (!catalogMenuPanel.hidden && !e.target.closest('.catalog-menu')) closeCatalogMenu();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCatalogMenu();
});

export { renderHome, showHome, clearSearch, showEmpty, showGridLoading, renderGrid, syncTools, setFilter, setView, setSort, toggleKindOrder, toggleKindCollapse, toggleCatalogMenu, closeCatalogMenu, patchCard, syncCloudQuickbar };