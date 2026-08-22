import { state, NEWS_HISTORY_MAX, persistNewsHistory } from './state.js';
import { t, locale } from './i18n.js';
import { showDetails } from './details.js';
import { sanitizeMediaType, toIntOr } from './utils.js';

// Adds an entry to the history, deduplicating by media/season/episode.
function addNewsEntry(entry) {
    const key = n => `${n.media_type}:${n.id}:${n.season ?? ''}:${n.episode ?? ''}`;
    state.newsHistory = state.newsHistory.filter(n => key(n) !== key(entry));
    state.newsHistory.unshift({ ...entry, date: Date.now() });
    if (state.newsHistory.length > NEWS_HISTORY_MAX) state.newsHistory.length = NEWS_HISTORY_MAX;
    persistNewsHistory();
}

function clearNewsHistory() {
    state.newsHistory = [];
    persistNewsHistory();
    renderNewsSection();
}

function formatNewsDate(ts) {
    if (!ts) return '';
    try { return new Date(ts).toLocaleDateString(locale()); } catch (err) { return ''; }
}

// News entries are rendered with createElement/textContent only and opened
// through event delegation: they can come from restored backups, so no
// field is ever interpolated into HTML or inline handlers.
function renderNewsSection() {
    const section = document.getElementById('news-section');
    if (!section) return;
    section.hidden = state.newsHistory.length === 0;
    const list = document.getElementById('news-list');
    list.innerHTML = '';
    state.newsHistory.forEach(n => {
        const li = document.createElement('li');
        li.className = 'news-item';

        const kind = document.createElement('span');
        kind.className = 'news-item__kind';
        kind.textContent = n.media_type === 'tv' ? t('common.tvKind') : t('common.movieKind');

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'news-item__title';
        btn.dataset.id = String(n.id);
        btn.dataset.mediaType = sanitizeMediaType(n.media_type, 'movie');
        btn.textContent = (n.title || t('common.noTitle'))
            + (n.media_type === 'tv' && n.season ? ` · S${toIntOr(n.season, 0)}E${toIntOr(n.episode, 0)}` : '');

        const date = document.createElement('time');
        date.className = 'news-item__date';
        date.textContent = formatNewsDate(n.date);

        li.append(kind, btn, date);
        list.appendChild(li);
    });
}

// One listener handles every news row, including the ones rendered later.
document.getElementById('news-list').addEventListener('click', e => {
    const btn = e.target.closest('.news-item__title[data-id]');
    if (!btn) return;
    showDetails(Number(btn.dataset.id), btn.dataset.mediaType);
});

export { addNewsEntry, clearNewsHistory, renderNewsSection };