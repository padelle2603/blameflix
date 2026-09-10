// Personal watch stats: computed on demand from the watched/episode and
// lastPlayed data plus the (cached) TMDB details. Nothing is persisted.
import { state } from './state.js';
import { statsGrid } from './dom.js';
import { detailFor } from './watchlist.js';
import { getDetails, getSeasonEpisodes } from './tmdb.js';
import { mapPool } from './utils.js';
import { t } from './i18n.js';

const tvItems = () => state.watchlist.filter(i => i.media_type === 'tv');
const movieItems = () => state.watchlist.filter(i => i.media_type === 'movie');

function isoKey(d) {
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
}

// Active days (ISO date -> episode count) for the streak and monthly chart.
// For series the air date of each watched episode is used as the best proxy
// for the watched day; for movies the lastPlayed timestamp is used as-is.
async function collectActivity() {
    const days = new Map();
    const add = (date, n = 1) => { if (date) days.set(date, (days.get(date) || 0) + n); };

    await mapPool(tvItems(), 4, async item => {
        const watched = state.watchedEpisodes[item.id];
        if (!watched) return;
        const seasons = Object.keys(watched).map(Number).filter(Number.isFinite);
        await mapPool(seasons, 4, async sn => {
            const eps = await getSeasonEpisodes(item.id, sn).catch(() => null);
            if (!eps) return;
            for (const ep of eps) {
                if (watched[sn].includes(ep.episode_number)) add(ep.air_date);
            }
        });
    });

    for (const entry of state.lastPlayed) {
        if (entry.media_type === 'movie' && entry.timestamp) add(isoKey(new Date(entry.timestamp)));
    }
    return days;
}

function computeStreak(days) {
    let d = new Date();
    if (!days.has(isoKey(d))) d.setDate(d.getDate() - 1);
    let streak = 0;
    while (days.has(isoKey(d))) { streak++; d.setDate(d.getDate() - 1); }
    return streak;
}

function computeActivityBars(days) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 11);
    const bars = [];
    for (let i = 0; i < 12; i++) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        bars.push({ key, label: d.toLocaleDateString(state.lang || 'it', { month: 'short' }), count: 0 });
        d.setMonth(d.getMonth() + 1);
    }
    const byMonth = new Map();
    days.forEach((n, key) => byMonth.set(key.slice(0, 7), (byMonth.get(key.slice(0, 7)) || 0) + n));
    bars.forEach(b => { b.count = byMonth.get(b.key) || 0; });
    return bars;
}

// Total aired episode count of a series (for the type breakdown).
async function totalAired(item) {
    const seasons = (detailFor(item).seasons || []).filter(s => s.season_number >= 1);
    const today = isoKey(new Date());
    let total = 0;
    await mapPool(seasons, 4, async s => {
        try {
            const eps = await getSeasonEpisodes(item.id, s.season_number).catch(() => []);
            total += eps.filter(ep => !ep.air_date || ep.air_date <= today).length;
        } catch { /* ignore */ }
    });
    return total;
}

function makeEl(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
}

function statCard(value, label) {
    const c = makeEl('div', 'stat-card');
    c.appendChild(makeEl('span', 'stat-card__value', value));
    c.appendChild(makeEl('span', 'stat-card__label', label));
    return c;
}

function renderStats() {
    collectActivity().then(days => paint({ streak: computeStreak(days), activity: computeActivityBars(days) }));
}

async function paint({ streak, activity }) {
    let tvMinutes = 0;
    let tvProgress = 0;
    let tvDone = 0;
    const genreCount = new Map();

    for (const item of state.watchlist) {
        const dd = detailFor(item);
        if (Array.isArray(dd.genres)) {
            dd.genres.forEach(g => genreCount.set(g.name || g.id, (genreCount.get(g.name || g.id) || 0) + 1));
        }
    }

    for (const item of tvItems()) {
        const w = state.watchedEpisodes[item.id] || {};
        const watched = Object.values(w).reduce((s, list) => s + list.length, 0);
        if (watched === 0) continue;
        const run = Number((detailFor(item).episode_run_time || [])[0]) || 45;
        tvMinutes += run * watched;
        const aired = await totalAired(item);
        if (aired > 0 && watched >= aired) tvDone++;
        else tvProgress++;
    }

    let movieMinutes = 0;
    let moviesSeen = 0;
    const seen = new Set();
    await mapPool(state.lastPlayed.filter(l => l.media_type === 'movie'), 4, async entry => {
        if (seen.has(entry.id)) return;
        seen.add(entry.id);
        moviesSeen++;
        const detail = state.watchlistDetails.get(`movie:${entry.id}`) || await getDetails('movie', entry.id).catch(() => null);
        movieMinutes += Number(detail && detail.runtime) || 0;
    });

    const hours = Math.round((tvMinutes + movieMinutes) / 60);
    const moviesTotal = movieItems().length;
    const tvTotal = tvItems().length;
    const topGenre = [...genreCount.entries()].sort((a, b) => b[1] - a[1])[0];

    statsGrid.innerHTML = '';
    statsGrid.appendChild(statCard(`${hours} h`, t('stats.hours')));
    statsGrid.appendChild(statCard(topGenre ? topGenre[0] : '—', t('stats.topGenre')));
    statsGrid.appendChild(statCard(String(streak), t('stats.streak')));

    const typeCard = makeEl('div', 'stat-card stat-card--wide');
    typeCard.appendChild(makeEl('span', 'stat-card__label', t('stats.byType')));
    const typeP = makeEl('p', 'stat-bytype');
    typeP.textContent = `${t('stats.moviesSeen')}: ${moviesSeen} · ${t('stats.moviesTotal')}: ${moviesTotal} · ${t('stats.seriesTotal')}: ${tvTotal} · ${t('stats.completed')}: ${tvDone} · ${t('stats.inProgress')}: ${tvProgress}`;
    typeCard.appendChild(typeP);
    statsGrid.appendChild(typeCard);

    const activityCard = makeEl('div', 'stat-card stat-card--wide');
    activityCard.appendChild(makeEl('span', 'stat-card__label', t('stats.activity')));
    const barsEl = makeEl('div', 'bars');
    const max = Math.max(1, ...activity.map(a => a.count));
    activity.forEach(a => {
        const bar = document.createElement('i');
        if (a.count) bar.classList.add('has');
        bar.style.height = `${Math.round((a.count / max) * 100)}%`;
        bar.title = `${a.label}: ${a.count}`;
        barsEl.appendChild(bar);
    });
    activityCard.appendChild(barsEl);
    statsGrid.appendChild(activityCard);
}

export { renderStats };