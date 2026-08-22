import { state } from './state.js';
import { homeView, detailView, searchInput, searchClear, grid, emptyState, sectionEyebrow, sectionTitle, sectionCount, catalogMenuBtn, catalogMenuPanel } from './dom.js';
import { escapeHtml, tmdbImagePath, formatVote } from './utils.js';
import { IMG_BASE, PLACEHOLDER } from './env.js';
import { showUnwatchedCache } from './tmdb.js';
import { isSaved, detailFor } from './watchlist.js';
import { refreshHomeUnwatchedCount } from './counter.js';
import { showDetails } from './details.js';
import { renderNewsSection } from './news.js';
import { t } from './i18n.js';
import { cancelSearch } from './search.js';

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

function renderHome() {
    cancelSearch();
    state.searching = false;
    homeView.hidden = false;
    detailView.hidden = true;
    sectionEyebrow.innerText = t('home.yourroom');
    sectionTitle.innerText = 'BlameFlix';
    sectionCount.innerText = state.watchlist.length ? `${state.watchlist.length} ${t('home.titles')}` : '';
    searchClear.hidden = searchInput.value.length === 0;
    state.currentList = state.watchlist;
    renderGrid(state.currentList);
    renderNewsSection();
    refreshHomeUnwatchedCount();
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

    grid.classList.toggle('grid--list', state.viewMode === 'list');

    const frag = document.createDocumentFragment();
    filtered.forEach((item) => {
        const d = detailFor(item);
        const poster = tmdbImagePath(d.poster_path) ? `${IMG_BASE}${d.poster_path}` : PLACEHOLDER;
        const title = d.title || d.name || t('common.noTitle');
        const date = d.release_date || d.first_air_date || '';
        const year = date ? date.substring(0, 4) : '—';
        const vote = formatVote(d.vote_average);
        const kind = d.media_type === 'tv' ? t('common.tvKind') : t('common.movieKind');
        const saved = isSaved(item.id, item.media_type);

        const card = document.createElement('div');
        card.className = 'card';
        if (state.viewMode === 'list') card.classList.add('card--list');
        card.dataset.id = item.id;
        card.dataset.type = item.media_type;
        card.tabIndex = 0;

        const unwatched = item.media_type === 'tv' ? showUnwatchedCache.get(item.id) : 0;

        card.innerHTML = `
            <div class="card-poster">
                <img src="${poster}" alt="${escapeHtml(title)}" loading="lazy">
                <span class="card-kind">${kind}</span>
                ${saved ? `<span class="stamp">${t('common.saved')}</span>` : ''}
                ${unwatched > 0 ? `<span class="card-unwatched">${unwatched} ${t('common.toWatch')}</span>` : ''}
            </div>
            <div class="credit-block">
                <h3 class="credit-title">${escapeHtml(title)}</h3>
                <p class="credit-meta">${year} · <span class="star">★</span> ${vote}</p>
            </div>
        `;
        frag.appendChild(card);
    });
    grid.appendChild(frag);
}

// Updates in place the SAVED stamp of a single card, without rebuilding
// the whole grid.
function syncCardSavedStamp(id, mediaType) {
    const card = grid.querySelector(`.card[data-id="${id}"][data-type="${mediaType}"]`);
    if (!card) return;
    const poster = card.querySelector('.card-poster');
    let stamp = poster.querySelector('.stamp');
    if (isSaved(id, mediaType)) {
        if (!stamp) {
            stamp = document.createElement('span');
            stamp.className = 'stamp';
            stamp.textContent = t('common.saved');
            poster.appendChild(stamp);
        }
    } else if (stamp) {
        stamp.remove();
    }
}

// --- CATALOG FILTERS AND VIEW ---

function filterLabel(type) {
    if (type === 'movie') return state.lang === 'en' ? 'movies' : 'film';
    if (type === 'tv') return state.lang === 'en' ? 'series' : 'serie';
    return state.lang === 'en' ? 'titles' : 'titoli';
}

function syncTools() {
    document.querySelectorAll('.ctl[data-type]').forEach(btn => {
        btn.setAttribute('aria-pressed', btn.dataset.type === state.typeFilter ? 'true' : 'false');
    });
    document.querySelectorAll('.ctl[data-view]').forEach(btn => {
        btn.setAttribute('aria-pressed', btn.dataset.view === state.viewMode ? 'true' : 'false');
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

// --- MOVIE/SERIES ROW ORDER ---

// Reflects the persisted kind order on the grid and on the toggle button.
function applyKindOrder() {
    const tvFirst = state.kindOrder === 'tv';
    grid.classList.toggle('grid--tv-first', tvFirst);
    const btn = document.getElementById('btn-swap');
    if (btn) btn.setAttribute('aria-pressed', String(tvFirst));
}

// Swaps which block (movies vs TV series) sits on the top row of the "all"
// view; the choice is persisted and exposed through aria-pressed.
function toggleKindOrder() {
    state.kindOrder = state.kindOrder === 'tv' ? 'movie' : 'tv';
    localStorage.setItem('myKindOrder', state.kindOrder);
    applyKindOrder();
}

applyKindOrder();

// --- CATALOG OPTIONS MENU (⋮) ---

function closeCatalogMenu() {
    if (!catalogMenuPanel.hidden) {
        catalogMenuPanel.hidden = true;
        catalogMenuBtn.setAttribute('aria-expanded', 'false');
    }
}

// Opens/closes the library options dropdown. The panel stays open after a
// selection; it closes on toggle, outside click or Escape.
function toggleCatalogMenu() {
    const willOpen = catalogMenuPanel.hidden;
    catalogMenuPanel.hidden = !willOpen;
    catalogMenuBtn.setAttribute('aria-expanded', String(willOpen));
}

document.addEventListener('click', (e) => {
    if (!catalogMenuPanel.hidden && !e.target.closest('.catalog-menu')) closeCatalogMenu();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCatalogMenu();
});

export { renderHome, showHome, clearSearch, showEmpty, renderGrid, syncCardSavedStamp, syncTools, setFilter, setView, toggleKindOrder, toggleCatalogMenu };