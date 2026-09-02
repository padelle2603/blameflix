import { state, sanitizeAutoSyncHours, persistReleaseState } from './state.js';
import { mapPool, isAired, airDateTs } from './utils.js';
import { getDetails } from './tmdb.js';
import { ensureNotifyPermission, notify } from './notifications.js';
import { addNewsEntry, renderNewsSection } from './news.js';
import { isEpisodeWatched } from './watched.js';
import { fetchSchedule, judgeNetworkRelease } from './networkSchedule.js';
import { detailFor } from './watchlist.js';
import { hydrateWatchlistGrid } from './backup.js';
import { t } from './i18n.js';
import { showToast } from './toast.js';
import { btnSync } from './dom.js';
import { checkForUpdates } from './updates.js';

// Mutex: the manual sync button, the auto timer and the visibilitychange
// handler can overlap; only one release check runs at a time.
let releasesSyncRunning = false;

// Judges one saved movie against the release state. ctx carries
// { releaseState, isBaseline, prevSync, notifyMovies }; the maps inside
// releaseState are mutated to mark the title as handled. Returns the
// news entry or null.
// A movie seen while still unreleased is remembered in
// releaseState.moviesPending: when it later comes out it is genuine news,
// whatever time the previous sync ran at (a plain lastSync window would
// drop it whenever a check happened after local midnight of the release
// day). Movies first seen already released follow that window rule
// instead, so saving an old movie never triggers a stale alert.
function judgeMovieRelease(item, data, ctx) {
    const pending = ctx.releaseState.moviesPending;
    const date = String((data && data.release_date) || '');
    if (!(date && isAired(date))) {
        // Still unreleased: remember it so its future release gets noticed.
        if (date && ctx.releaseState.movies[item.id] === undefined) pending[item.id] = true;
        return null;
    }
    const wasPending = !!pending[item.id];
    delete pending[item.id];
    if (ctx.releaseState.movies[item.id] !== undefined) return null; // handled before
    ctx.releaseState.movies[item.id] = date;
    if (ctx.isBaseline || !ctx.notifyMovies) return null;
    if (!wasPending) {
        const ts = airDateTs(date);
        if (!ctx.prevSync || ts === null || ts <= ctx.prevSync) return null;
    }
    const title = data.title || data.name || t('common.noTitle');
    return { media_type: 'movie', id: item.id, title };
}

// Judges one saved series against the release state. ctx carries
// { releaseState, isBaseline, prevSync, notifyTv }; state.releaseState.shows
// is mutated to mark the show as handled. Returns the news entry or null.
// The remembered episode also stores its own air timestamp (ts): an
// episode is news when TMDB reports one strictly newer than the stored
// one, whatever time previous checks ran at. Comparing against the
// lastSync instant instead silently dropped episodes whenever a check
// happened after local midnight of their (US) air date.
function judgeShowRelease(item, data, ctx) {
    const last = data && data.last_episode_to_air;
    if (!(last && last.air_date && isAired(last.air_date))) return null;
    const ts = airDateTs(last.air_date);
    const cur = { season: last.season_number, episode: last.episode_number, ts };
    const stored = ctx.releaseState.shows[item.id];
    const isNew = isNewerThanStored(stored, cur, ctx.prevSync);
    ctx.releaseState.shows[item.id] = cur; // handled from now on
    if (!isNew || ctx.isBaseline || !ctx.notifyTv) return null;
    if (ctx.isWatched(item.id, cur.season, cur.episode)) return null; // already watched: not news
    const title = data.name || data.title || t('common.noTitle');
    return { media_type: 'tv', id: item.id, title, season: cur.season, episode: cur.episode };
}

// True when the freshly reported episode differs from the stored one and
// is genuinely newer than it. Entries saved by older versions carry no ts:
// those fall back to the old lastSync window rule. Without a usable
// timestamp nothing is reported (matching the previous behaviour).
function isNewerThanStored(stored, cur, prevSync) {
    if (!stored) return false; // never seen before: baseline material
    if (stored.season === cur.season && stored.episode === cur.episode) return false;
    if (cur.ts === null) return false;
    if (typeof stored.ts === 'number') return cur.ts > stored.ts;
    return !!prevSync && cur.ts > prevSync;
}

// Checks the TMDB state of the saved titles against what previous syncs
// already saw and reports new releases (movies released or episodes
// aired). The first *successful* sync only acts as a "baseline": it
// records the current state without notifying, to avoid a burst of stale
// alerts.
async function checkReleases(manual = false) {
    if (!state.apiKey) {
        if (manual) showToast(t('common.sync'), t('msg.needKey'));
        return { newCount: 0, baseline: false };
    }
    if (!state.watchlist.length) {
        if (manual) showToast(t('common.sync'), t('msg.emptyRoomForSync'));
        return { newCount: 0, baseline: false };
    }
    if (releasesSyncRunning) {
        if (manual) showToast(t('common.sync'), t('msg.syncAlreadyRunning'));
        return { newCount: 0, baseline: false };
    }
    releasesSyncRunning = true;

    try {
        const isBaseline = !state.releaseState.baseline;
        let fetched = 0; // titles downloaded successfully in this run

        // The judge helpers only compare against what previous syncs
        // recorded; lastSync is read here and updated only after both
        // pools below have completed (it still backs the auto-sync timer
        // and the legacy fallback for entries saved without ts).
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
                const src = state.networkSources[item.id];
                if (src && src.template) {
                    const entries = await fetchSchedule(item.id);
                    if (entries) {
                        fetched++;
                        const d = detailFor(item);
                        const title = d.name || d.title || t('common.noTitle');
                        return judgeNetworkRelease(item, entries, judgeCtx, title);
                    }
                    // Network source configured but unavailable (CORS/offline/
                    // bad JSON): degrade to the normal TMDB release detection
                    // so the show keeps getting episode notifications.
                }
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
            if (r.network) {
                return t('msg.releaseBodyNetwork', { title: r.title, season: r.season, episode: r.episode, network: r.network });
            }
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
            showToast(t('common.sync'), isBaseline && fetched > 0
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
    btnSync.classList.add('is-busy'); // icon-only button: the class drives the spin
    try {
        // Reload the library from TMDB with the resolved API key, exactly
        // like startup, then check for new releases. The latest app version
        // is checked too, so a manual sync also surfaces a newer release.
        await hydrateWatchlistGrid(true);
        await checkReleases(true);
        await checkForUpdates(false);
    } finally {
        btnSync.classList.remove('is-busy');
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
        if (shouldAutoSync()) {
            checkReleases(false);
            // Every scheduled sync also refreshes the update check, so an
            // available newer version is surfaced without a manual action.
            checkForUpdates(false);
        }
    }, autoSyncIntervalMs());
}

export { checkReleases, syncReleases, startAutoSyncTimer };