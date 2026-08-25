import { state, readUnwatchedSnapshot, persistUnwatchedSnapshot } from './state.js';
import { getSeasonEpisodes, showUnwatchedCache, fetchSeasons } from './tmdb.js';
import { mapPool, isAired } from './utils.js';
import { isEpisodeWatched } from './watched.js';
import { t, tp } from './i18n.js';
import { grid, homeUnwatchedEl } from './dom.js';

// Counts the already-aired episodes of the given seasons that are not
// watched yet.
function countUnwatchedEps(showId, seasonLists) {
    let total = 0;
    for (const eps of seasonLists) {
        for (const ep of eps) {
            if (isAired(ep.air_date) && !isEpisodeWatched(showId, ep.season_number, ep.episode_number)) total++;
        }
    }
    return total;
}

let homeCountBusy = false;

// Already-aired, unwatched episodes of a single series: seasons download in
// parallel with bounded concurrency instead of one request at a time.
async function countUnwatchedForShow(showId) {
    const seasons = await fetchSeasons(showId);
    const results = await mapPool(seasons, 5, s => getSeasonEpisodes(showId, s.season_number).then(
        value => ({ ok: true, value }),
        () => ({ ok: false })
    ));
    const loaded = results.filter(r => r.ok).map(r => r.value);
    let anyAired = false;
    loaded.forEach(eps => eps.forEach(ep => { if (isAired(ep.air_date)) anyAired = true; }));
    const total = countUnwatchedEps(showId, loaded);
    showUnwatchedCache.set(showId, total);
    return { total, anyAired };
}

// Updates in place the "N to watch" badges on the series posters in home.
function updateGridUnwatchedBadges() {
    grid.querySelectorAll('.card[data-type="tv"]').forEach(card => {
        const id = Number(card.dataset.id);
        let badge = card.querySelector('.card-unwatched');
        const count = showUnwatchedCache.get(id);
        if (count > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'card-unwatched';
                card.querySelector('.card-poster').appendChild(badge);
            }
            badge.textContent = `${count} ${t('common.toWatch')}`;
        } else if (badge) {
            badge.remove();
        }
    });
}

// Renders totals and badges from a { showId -> count } mapping.
function applyHomeCounts(counts, total, anyAiredShows) {
    Object.entries(counts).forEach(([id, n]) => showUnwatchedCache.set(Number(id), Number(n)));
    const allClear = total === 0 && anyAiredShows > 0;
    homeUnwatchedEl.classList.toggle('is-all-clear', allClear);
    homeUnwatchedEl.innerText = allClear
        ? t('msg.allWatched')
        : tp('msg.unwatchedCount', total);
    updateGridUnwatchedBadges();
}

async function refreshHomeUnwatchedCount() {
    if (!homeUnwatchedEl || homeCountBusy) return;
    const tvShows = state.watchlist.filter(w => w.media_type === 'tv');
    if (!tvShows.length || !state.apiKey) {
        homeUnwatchedEl.hidden = true;
        return;
    }

    homeCountBusy = true;
    homeUnwatchedEl.hidden = false;
    try {
        // Instant paint from the last known counts (when still fresh),
        // otherwise the transient "counting…" placeholder.
        const snap = readUnwatchedSnapshot();
        if (snap) {
            applyHomeCounts(snap.counts, snap.total, snap.anyAired);
        } else {
            homeUnwatchedEl.innerText = t('msg.countingEpisodes');
        }

        // Live recount across shows, with bounded parallelism.
        const results = await mapPool(tvShows, 4, w => countUnwatchedForShow(w.id).then(
            value => ({ ok: true, value }),
            () => ({ ok: false })
        ));
        const counts = {};
        let total = 0;
        let anyAiredShows = 0;
        results.forEach((r, i) => {
            if (!r.ok) return; // failed shows keep their previous badge
            const id = tvShows[i].id;
            counts[id] = r.value.total;
            total += r.value.total;
            if (r.value.anyAired) anyAiredShows++;
        });
        applyHomeCounts(counts, total, anyAiredShows);
        persistUnwatchedSnapshot(counts, total, anyAiredShows);
    } finally {
        homeCountBusy = false;
    }
}

export { countUnwatchedEps, refreshHomeUnwatchedCount };