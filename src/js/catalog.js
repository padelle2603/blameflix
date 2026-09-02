import { state, persistCollapsedRows, persistSortMode } from './state.js';
import { homeView, detailView, searchInput, searchClear, grid, emptyState, homeHead, searchHead, catalogMenuBtn, catalogMenuPanel, cloudQuickbar } from './dom.js';
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

// Event delegation on the grid: cards open the detail view without
// attaching a click and keydown listener per card at every re-render.
function handleCardActivation(e) {
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
    if (cloudQuickbar) cloudQuickbar.hidden = !state.cloudSync.enabled;
}

function renderHome() {
    cancelSearch();
    state.searching = false;
    homeView.hidden = false;
    detailView.hidden = true;
    document.body.classList.remove('is-detail');
    homeHead.hidden = false;
    searchHead.hidden = true;
    searchClear.hidden = searchInput.value.length === 0;
    state.currentList = state.watchlist;
    renderGrid(state.currentList);
    renderNewsSection();
    refreshHomeUnwatchedCount();
    syncCloudQuickbar();
}

function showHome() {
    searchInput.value = '';
    searchClear.hidden = true;
    renderHome();
}

function clearSearch() {
    showHome();
}

function showEmpty(kicker, text) {
    grid.style.display = 'none';
    emptyState.querySelector('.empty-kicker').innerText = kicker;
    emptyState.querySelector('p:last-child').innerText = text;
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
    grid.innerHTML = '';
    const count = state.viewMode === 'list' ? 6 : 8;
    for (let i = 0; i < count; i++) {
        grid.insertAdjacentHTML('beforeend', skeletonCardHtml());
    }
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

    const card = document.createElement('div');
    card.className = 'card';
    if (state.viewMode === 'list') card.classList.add('card--list');
    card.dataset.id = item.id;
    card.dataset.type = item.media_type;
    card.tabIndex = 0;

    card.innerHTML = `
        <div class="card-poster">
            <img src="${poster}" alt="${escapeHtml(title)}" loading="lazy" decoding="async">
            ${unwatched > 0 ? `<span class="card-unwatched">${unwatched} ${t('common.toWatch')}</span>` : ''}
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
    rail.addEventListener('scroll', () => syncRailArrows(rail), { passive: true });

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
    if (state.sortMode === 'alpha') {
        sorted.sort((a, b) => titleSortKey(a).title.localeCompare(titleSortKey(b).title));
    } else if (state.sortMode === 'release') {
        sorted.sort((a, b) => titleSortKey(b).date.localeCompare(titleSortKey(a).date));
    } else if (state.sortMode === 'rating') {
        sorted.sort((a, b) => titleSortKey(b).rating - titleSortKey(a).rating);
    }
    return sorted;
}

function syncTools() {
    document.querySelectorAll('.ctl[data-type]').forEach(btn => {
        btn.setAttribute('aria-pressed', btn.dataset.type === state.typeFilter ? 'true' : 'false');
    });
    document.querySelectorAll('.ctl[data-view]').forEach(btn => {
        btn.setAttribute('aria-pressed', btn.dataset.view === state.viewMode ? 'true' : 'false');
    });
    document.querySelectorAll('.ctl[data-sort]').forEach(btn => {
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