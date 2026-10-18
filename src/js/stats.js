import { state } from './state.js';
import { statsGrid } from './dom.js';
import { detailFor } from './watchlist.js';
import { getDetails, getSeasonEpisodes } from './tmdb.js';
import { isAired, mapPool } from './utils.js';
import { showDetails } from './details.js';
import { t } from './i18n.js';

const tvItems = () => state.watchlist.filter(i => i.media_type === 'tv');

function timeAgo(timestamp) {
    const diff = Date.now() - timestamp;
    const days = Math.floor(diff / 86400000);
    if (days <= 0) return t('timeago.today');
    if (days === 1) return t('timeago.yesterday');
    if (days < 30) return `${days} ${t('timeago.daysAgo')}`;
    return new Date(timestamp).toLocaleDateString(state.lang || 'it', { day: 'numeric', month: 'short', year: 'numeric' });
}

async function totalAired(item) {
    const seasons = (detailFor(item).seasons || []).filter(s => s.season_number >= 1);
    let total = 0;
    await mapPool(seasons, 4, async s => {
        const eps = await getSeasonEpisodes(item.id, s.season_number).catch(() => []);
        total += eps.filter(ep => isAired(ep.air_date)).length;
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

function hbarCard(labelKey, entries) {
    const card = makeEl('div', 'stat-card stat-card--wide');
    card.appendChild(makeEl('span', 'stat-card__label', t(labelKey)));
    if (!entries.length) {
        card.appendChild(makeEl('p', 'stat-bytype', t('stats.recentEmpty')));
        return card;
    }
    const barsEl = makeEl('div', 'hbars');
    const max = Math.max(1, ...entries.map(e => e[1]));
    entries.forEach(([l, c]) => {
        const row = makeEl('div', 'hbar-row');
        row.appendChild(makeEl('span', 'hbar-label', String(l)));
        const barWrap = makeEl('div', 'hbar-wrap');
        const bar = makeEl('i');
        bar.className = 'has';
        bar.style.width = `${Math.round((c / max) * 100)}%`;
        barWrap.appendChild(bar);
        barWrap.appendChild(makeEl('span', 'hbar-count', String(c)));
        row.appendChild(barWrap);
        barsEl.appendChild(row);
    });
    card.appendChild(barsEl);
    return card;
}

function genreName(g) {
    return (g && (g.name || g.id)) || g;
}

function renderStats() {
    paint();
}

async function paint() {
    let tvMinutes = 0;
    let tvProgress = 0;
    let tvDone = 0;
    let movieMinutes = 0;
    let moviesSeen = 0;
    const genreCount = new Map();
    const seenIds = new Set();
    const yearCount = new Map();
    const startYearCount = new Map();
    const formatCount = new Map([[ 'movie', 0 ], [ 'tv', 0 ]]);
    const durBuckets = new Map([[ '<90', 0 ], [ '90-120', 0 ], [ '>120', 0 ], [ '20-30', 0 ], [ '>30', 0 ]]);
    const recent = [];

    for (const item of tvItems()) {
        const w = state.watchedEpisodes[item.id] || {};
        const watched = Object.values(w).reduce((s, list) => s + list.length, 0);
        if (watched === 0) continue;
        seenIds.add(`tv:${item.id}`);
        const dd = detailFor(item);
        if (Array.isArray(dd.genres)) {
            dd.genres.forEach(g => {
                const n = genreName(g);
                genreCount.set(n, (genreCount.get(n) || 0) + 1);
            });
        }
        if (dd.first_air_date) {
            const y = dd.first_air_date.slice(0, 4);
            if (/^\d{4}$/.test(y)) yearCount.set(y, (yearCount.get(y) || 0) + 1);
        }
        const watchers = state.watchedAt[item.id];
        let minTs = Infinity;
        if (watchers) {
            Object.values(watchers).forEach(s => Object.values(s).forEach(ts => { if (ts < minTs) minTs = ts; }));
        }
        if (minTs === Infinity) {
            const lp = state.lastPlayed.find(l => l.media_type === 'tv' && l.id === item.id && l.timestamp);
            if (lp) minTs = lp.timestamp;
        }
        if (minTs !== Infinity) {
            const sy = new Date(minTs).getFullYear().toString();
            startYearCount.set(sy, (startYearCount.get(sy) || 0) + 1);
        }
        const run = Number((dd.episode_run_time || [])[0]) || 45;
        if (run > 30) durBuckets.set('>30', (durBuckets.get('>30') || 0) + 1);
        else if (run >= 20) durBuckets.set('20-30', (durBuckets.get('20-30') || 0) + 1);
        tvMinutes += run * watched;
        const aired = await totalAired(item);
        if (aired > 0 && watched >= aired) tvDone++;
        else tvProgress++;
        formatCount.set('tv', (formatCount.get('tv') || 0) + 1);
    }

    await mapPool(state.lastPlayed.filter(l => l.media_type === 'movie').slice().sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)), 4, async entry => {
        if (seenIds.has(`movie:${entry.id}`)) return;
        seenIds.add(`movie:${entry.id}`);
        moviesSeen++;
        recent.push(entry);
        const detail = state.watchlistDetails.get(`movie:${entry.id}`) || await getDetails('movie', entry.id).catch(() => null);
        movieMinutes += Number(detail && detail.runtime) || 0;
        if (detail) {
            if (Array.isArray(detail.genres)) {
                detail.genres.forEach(g => {
                    const n = genreName(g);
                    genreCount.set(n, (genreCount.get(n) || 0) + 1);
                });
            }
            if (detail.release_date) {
                const y = detail.release_date.slice(0, 4);
                if (/^\d{4}$/.test(y)) yearCount.set(y, (yearCount.get(y) || 0) + 1);
            }
            if (detail.runtime) {
                const r = Number(detail.runtime);
                if (r > 120) durBuckets.set('>120', (durBuckets.get('>120') || 0) + 1);
                else if (r >= 90) durBuckets.set('90-120', (durBuckets.get('90-120') || 0) + 1);
                else durBuckets.set('<90', (durBuckets.get('<90') || 0) + 1);
            }
        }
        if (entry.timestamp) {
            const sy = new Date(entry.timestamp).getFullYear().toString();
            startYearCount.set(sy, (startYearCount.get(sy) || 0) + 1);
        }
        formatCount.set('movie', (formatCount.get('movie') || 0) + 1);
    });

    for (const entry of state.lastPlayed.filter(l => l.media_type === 'tv').slice().sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))) {
        if (!seenIds.has(`tv:${entry.id}`)) continue;
        seenIds.delete(`tv:${entry.id}`);
        const epLabel = entry.season != null ? `S${entry.season}:E${entry.episode}` : null;
        const dd = detailFor({ id: entry.id, media_type: 'tv' });
        const title = entry.title || entry.name || (dd && (dd.title || dd.name)) || '';
        recent.push({ ...entry, epLabel, title });
    }

    const hours = Math.round((tvMinutes + movieMinutes) / 60);
    const tvTotal = tvItems().length;
    const topGenre = [...genreCount.entries()].sort((a, b) => b[1] - a[1])[0];
    const topYears = [...yearCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    const topStartYears = [...startYearCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    const fmtEntries = [...formatCount.entries()].filter(e => e[1] > 0);
    const durEntries = [ ['< 90m', durBuckets.get('<90')], ['90-120m', durBuckets.get('90-120')], ['> 120m', durBuckets.get('>120')], ['20-30m (ep)', durBuckets.get('20-30')], ['> 30m (ep)', durBuckets.get('>30')] ].filter(e => e[1] > 0);

    statsGrid.innerHTML = '';
    statsGrid.appendChild(statCard(`${hours} h`, t('stats.hours')));
    statsGrid.appendChild(statCard(topGenre ? topGenre[0] : '—', t('stats.topGenre')));

    const byTypeCard = makeEl('div', 'stat-card');
    byTypeCard.appendChild(makeEl('span', 'stat-card__label', t('stats.byType')));
    byTypeCard.appendChild(makeEl('p', 'stat-bytype',
        `${t('stats.moviesSeen')}: ${moviesSeen} · ${t('stats.seriesTotal')}: ${tvTotal} · ${t('stats.completed')}: ${tvDone} · ${t('stats.inProgress')}: ${tvProgress}`));
    statsGrid.appendChild(byTypeCard);

    statsGrid.appendChild(hbarCard('stats.topYear', topYears));
    statsGrid.appendChild(hbarCard('stats.topDuration', durEntries));
    statsGrid.appendChild(hbarCard('stats.byFormat', fmtEntries.map(([m, c]) => [m === 'movie' ? 'Film' : 'Serie', c])));
    statsGrid.appendChild(hbarCard('stats.startYear', topStartYears));

    const recentCard = makeEl('div', 'stat-card stat-card--wide');
    recentCard.appendChild(makeEl('span', 'stat-card__label', t('stats.recent')));
    if (recent.length === 0) {
        recentCard.appendChild(makeEl('p', 'stat-bytype', t('stats.recentEmpty')));
    } else {
        const list = makeEl('div', 'recent-list');
        for (const entry of recent.slice(0, 8)) {
            const row = makeEl('div', 'recent-item');
            const label = entry.epLabel ? `${entry.epLabel} · ${entry.title || '—'}` : (entry.title || '—');
            row.appendChild(makeEl('span', 'recent-title', label.trim()));
            row.appendChild(makeEl('span', 'recent-date', entry.timestamp ? timeAgo(entry.timestamp) : ''));
            row.style.cursor = 'pointer';
            row.addEventListener('click', () => showDetails(entry.id, entry.media_type));
            list.appendChild(row);
        }
        recentCard.appendChild(list);
    }
    statsGrid.appendChild(recentCard);
}

export { renderStats };
