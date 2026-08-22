import { state, sanitizeAutoSyncHours, persistReleaseState } from './state.js';
import { mapPool, isAired, airDateTs } from './utils.js';
import { getDetails } from './tmdb.js';
import { ensureNotifyPermission, notify } from './notifications.js';
import { addNewsEntry, renderNewsSection } from './news.js';
import { isEpisodeWatched } from './watched.js';
import { t } from './i18n.js';
import { showToast } from './toast.js';
import { btnSync } from './dom.js';

// Mutex: the manual sync button, the auto timer and the visibilitychange
// handler can overlap; only one release check runs at a time.
let releasesSyncRunning = false;

// Judges one saved movie against the release state. ctx carries
// { state.releaseState, isBaseline, prevSync, notifyMovies }; state.releaseState.movies
// is mutated to mark the title as handled. Returns the news entry or null.
// A movie is announced only when its release happens after the previous
// successful check: titles already out when first seen are recorded
// silently, so saving an old movie never triggers a stale alert.
function judgeMovieRelease(item, data, ctx) {
    const date = String((data && data.release_date) || '');
    if (!(date && isAired(date))) return null; // still unreleased: judged when it comes out
    if (ctx.releaseState.movies[item.id] !== undefined) return null; // handled before
    ctx.releaseState.movies[item.id] = date;
    if (ctx.isBaseline || !ctx.notifyMovies) return null;
    const ts = airDateTs(date);
    if (!ctx.prevSync || ts === null || ts <= ctx.prevSync) return null;
    const title = data.title || data.name || t('common.noTitle');
    return { media_type: 'movie', id: item.id, title };
}

// Judges one saved series with the same window rule: a show added to the
// state.watchlist long after its episodes aired does not alert on them.
function judgeShowRelease(item, data, ctx) {
    const last = data && data.last_episode_to_air;
    if (!(last && last.air_date && isAired(last.air_date))) return null;
    const cur = { season: last.season_number, episode: last.episode_number };
    const stored = ctx.releaseState.shows[item.id];
    const isNew = !stored || stored.season !== cur.season || stored.episode !== cur.episode;
    ctx.releaseState.shows[item.id] = cur; // handled from now on
    if (!isNew || ctx.isBaseline || !ctx.notifyTv) return null;
    if (ctx.isWatched(item.id, cur.season, cur.episode)) return null; // already watched: not news
    const ts = airDateTs(last.air_date);
    if (!ctx.prevSync || ts === null || ts <= ctx.prevSync) return null;
    const title = data.name || data.title || t('common.noTitle');
    return { media_type: 'tv', id: item.id, title, season: cur.season, episode: cur.episode };
}

// Checks the TMDB state of the saved titles against the last check and
// reports new releases (movies released or episodes aired). The first
// *successful* sync only acts as a "baseline": it records the current
// state without notifying, to avoid a burst of stale alerts.
async function checkReleases(manual = false) {
    if (!state.apiKey) {
        if (manual) showToast('Sync', t('msg.needKey'));
        return { newCount: 0, baseline: false };
    }
    if (!state.watchlist.length) {
        if (manual) showToast('Sync', t('msg.emptyRoomForSync'));
        return { newCount: 0, baseline: false };
    }
    if (releasesSyncRunning) {
        if (manual) showToast('Sync', t('msg.syncAlreadyRunning'));
        return { newCount: 0, baseline: false };
    }
    releasesSyncRunning = true;

    try {
        const isBaseline = !state.releaseState.baseline;
        let fetched = 0; // titles downloaded successfully in this run

        // The previous successful sync time: releases older than this were
        // already out at the last check and are not news. lastSync is read
        // here and updated only after both pools below have completed.
        const judgeCtx = {
            releaseState: state.releaseState,
            isBaseline,
            prevSync: Number(state.releaseState.lastSync) || 0,
            notifyTv: state.notifySettings.tv !== false,
            notifyMovies: state.notifySettings.movies !== false,
            isWatched: isEpisodeWatched
        };

        const tvItems = state.watchlist.filter(item => item.media_type === 'tv');
        const movieItems = state.watchlist.filter(item => item.media_type === 'movie');

        // All the titles are checked with bounded parallelism through the
        // shared details cache; a failed title is simply skipped.
        const tvReleases = await mapPool(tvItems, 5, async item => {
            try {
                const data = await getDetails('tv', item.id);
                fetched++;
                return judgeShowRelease(item, data, judgeCtx);
            } catch (err) { /* offline or removed title: skipped */ }
            return null;
        });

        const movieReleases = await mapPool(movieItems, 5, async item => {
            try {
                const data = await getDetails('movie', item.id);
                fetched++;
                return judgeMovieRelease(item, data, judgeCtx);
            } catch (err) { /* offline or removed title: skipped */ }
            return null;
        });

        const newReleases = [...tvReleases, ...movieReleases].filter(Boolean);

        // The reference time for the next window advances only when at
        // least one title was actually seen: otherwise a fully failed sync
        // (e.g. offline) would silently swallow what came out meanwhile.
        if (fetched > 0) state.releaseState.lastSync = Date.now();
        // The baseline becomes valid only when at least one title was
        // actually downloaded: otherwise a fully failed first sync (e.g.
        // offline at launch) would turn every already-aired episode into a
        // "new release" alert on the next run.
        if (isBaseline) state.releaseState.baseline = fetched > 0;
        persistReleaseState();

        function releaseBody(r) {
            return r.media_type === 'movie'
                ? t('msg.movieReleased', { title: r.title })
                : t('msg.releaseBody', { title: r.title, season: r.season, episode: r.episode });
        }

        for (const r of newReleases) {
            addNewsEntry({ ...r });
        }
        renderNewsSection();

        if (newReleases.length && state.notifySettings.enabled) {
            const granted = await ensureNotifyPermission();
            for (const r of newReleases) {
                if (granted) await notify(t('notify.releases'), releaseBody(r), { ...r });
            }
        }

        if (newReleases.length) {
            const list = newReleases.slice(0, 4).map(releaseBody).join('\n');
            const extra = newReleases.length > 4 ? t('msg.moreReleases', { n: newReleases.length - 4 }) : '';
            showToast(t('toast.newReleases'), list + extra, 8000);
        } else if (manual) {
            showToast('Sync', isBaseline && fetched > 0
                ? t('msg.firstSync')
                : t('msg.noNewReleases'));
        }

        return { newCount: newReleases.length, baseline: isBaseline };
    } finally {
        releasesSyncRunning = false;
    }
}

async function syncReleases() {
    if (btnSync.classList.contains('is-busy')) return;
    btnSync.classList.add('is-busy');
    btnSync.innerText = t('common.syncing');
    try {
        await checkReleases(true);
    } finally {
        btnSync.classList.remove('is-busy');
        btnSync.innerText = t('common.sync');
    }
}

// --- PERIODIC AUTO-SYNC ---

function autoSyncIntervalMs() {
    return sanitizeAutoSyncHours(state.notifySettings.autoSyncHours) * 3600 * 1000;
}

// True if it is time to run a check (configured interval elapsed).
function shouldAutoSync() {
    return !state.releaseState.lastSync || Date.now() - state.releaseState.lastSync >= autoSyncIntervalMs();
}

let autoSyncTimer = null;

// Re-arms the periodic timer every time the configured interval changes.
function startAutoSyncTimer() {
    if (autoSyncTimer) clearInterval(autoSyncTimer);
    autoSyncTimer = setInterval(() => {
        if (shouldAutoSync()) checkReleases(false);
    }, autoSyncIntervalMs());
}

export { checkReleases, syncReleases, shouldAutoSync, startAutoSyncTimer };