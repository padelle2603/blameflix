import { state } from './state.js';
import { detailView, episodeSection, episodeList, customControls, inputSeason, inputSeasonCustom, inputEpisodeCustom, unwatchedEl, detailTitle, detailOverview, detailDate, detailKind, detailPoster, detailBackdrop, tvControls, btnMarkAllAired } from './dom.js';
import { getDetails, getSeasonEpisodes, seasonEpisodesCache, fetchSeasons } from './tmdb.js';
import { toggleEpisodeWatched, isEpisodeWatched, persistWatchedEpisodes } from './watched.js';
import { escapeHtml, tmdbImagePath, isAired, mapPool } from './utils.js';
import { IMG_BASE, IMG_STILL, IMG_BACKDROP, PLACEHOLDER, EPISODE_PLACEHOLDER } from './env.js';
import { t, tp, locale } from './i18n.js';
import { showToast } from './toast.js';
import { openLink } from './browser.js';
import { openPlayer, getLastPlayed } from './player.js';
import { updateWatchlistBtn } from './watchlist.js';
import { syncResolverOverrideBtn, getResolverOverride } from './resolver.js';
import { syncNetworkSourceBtn } from './networkSchedule.js';
import { showHome } from './catalog.js';
import { countUnwatchedEps, refreshHomeUnwatchedCount } from './counter.js';
import { slideHomeToDetail, syncStackToView } from './viewTransition.js';

// Request token: only the latest showDetails() call is allowed to touch
// the DOM, so two quick taps on different cards never mix their data.
let detailsRequestSeq = 0;

async function showDetails(id, type, opts) {
    const requestSeq = ++detailsRequestSeq;
    resetDetailView();
    await slideHomeToDetail();

    try {
        const data = await getDetails(type, id);
        if (requestSeq !== detailsRequestSeq) return; // a newer title was opened meanwhile
        if (!data.id) throw new Error('Invalid data');
        state.currentMedia = { ...data, media_type: type }; // Keep the full data in memory

        // Populate the UI
        detailTitle.innerText = data.title || data.name || t('common.noTitle');
        detailOverview.innerText = data.overview || t('detail.noOverview');
        detailDate.innerText = data.release_date || data.first_air_date || '—';
        resetDetailSpoilers();
        detailPoster.src = tmdbImagePath(data.poster_path) ? `${IMG_BASE}${data.poster_path}` : PLACEHOLDER;
        detailPoster.sizes = '(max-width: 600px) 180px, 300px';
        detailKind.innerText = type === 'tv' ? t('common.tvKindLong') : t('common.movieKindLong');

        // Hero backdrop
        if (tmdbImagePath(data.backdrop_path)) {
            detailBackdrop.style.backgroundImage = `url(${IMG_BACKDROP}${data.backdrop_path})`;
            detailBackdrop.hidden = false;
        } else {
            detailBackdrop.hidden = true;
        }

        // Manage TV vs movie controls
        if (type === 'tv') {
            tvControls.hidden = false;
            episodeSection.hidden = false;
            btnMarkAllAired.hidden = false;
            setupSeasonControls(data, opts);
            refreshUnwatchedCount();
        } else {
            tvControls.hidden = true;
            episodeSection.hidden = true;
            btnMarkAllAired.hidden = true;
            refreshUnwatchedCount();
        }

        updateWatchlistBtn();
        syncResolverOverrideBtn();
        const networkBlock = document.getElementById('network-block');
        if (type === 'tv') {
            networkBlock.hidden = false;
            populateNetworkSelector(data);
            syncNetworkSourceBtn();
        } else {
            networkBlock.hidden = true;
        }
        const overridePanel = document.getElementById('resolver-override-panel');
        if (overridePanel) {
            overridePanel.hidden = true;
            document.getElementById('resolver-override-input').value = getResolverOverride();
        }
        // Detail height may have grown from skeleton to full content (and episodes)
        // Sync stack height smoothly to avoid vertical twitch
        requestAnimationFrame(() => syncStackToView(detailView));

    } catch (err) {
        if (requestSeq !== detailsRequestSeq) return; // stale failure: a newer view took over
        showToast(t('toast.errorTitle'), t('msg.detailLoadError'));
        showHome();
    }
}

// Blanks the hero before a new title loads so the previous title's content
// never flashes on screen for the duration of the (possibly network) fetch.
// Shows skeleton placeholders while data is loading.
function resetDetailView() {
    detailTitle.innerHTML = '<span class="skeleton-block" style="display:inline-block;width:60%;height:1.4rem;"></span>';
    detailOverview.innerHTML = '<span class="skeleton-block" style="display:block;width:100%;height:0.8rem;margin-bottom:0.4rem;"></span><span class="skeleton-block" style="display:block;width:90%;height:0.8rem;margin-bottom:0.4rem;"></span><span class="skeleton-block" style="display:block;width:75%;height:0.8rem;"></span>';
    detailDate.innerHTML = '<span class="skeleton-block" style="display:inline-block;width:80px;height:0.8rem;"></span>';
    detailKind.innerText = '';
    detailPoster.src = PLACEHOLDER;
    detailBackdrop.hidden = true;
    if (unwatchedEl) unwatchedEl.hidden = true;
    episodeList.innerHTML = '';
    episodeSection.hidden = true;
    tvControls.hidden = true;
    btnMarkAllAired.hidden = true;
    resetDetailSpoilers();
}

// Collapsible meta block: every sheet opens with the synopsis clamped and
// the year/vote facts hidden; tapping (or Enter/Space) toggles the block.
// The state resets each time a new title is opened.
function resetDetailSpoilers() {
    const hint = t('detail.revealHint');
    document.querySelectorAll('#detail-view [data-spoiler]').forEach(el => {
        el.classList.add('is-collapsed');
        el.setAttribute('aria-expanded', 'false');
        el.setAttribute('title', hint);
        el.setAttribute('aria-label', hint);
    });
}

function toggleSpoiler(el) {
    const collapsed = el.classList.toggle('is-collapsed');
    el.setAttribute('aria-expanded', String(!collapsed));
    if (collapsed) el.setAttribute('title', t('detail.revealHint'));
    else el.removeAttribute('title');
    requestAnimationFrame(() => syncStackToView(detailView));
}

// Fills the network <select> with the TMDB networks of the series and
// restores the previously chosen one, so the per-series network source can
// be labelled and passed as a placeholder to the schedule template.
function populateNetworkSelector(data) {
    const sel = document.getElementById('network-select');
    if (!sel) return;
    sel.innerHTML = '';
    const none = document.createElement('option');
    none.value = '';
    none.textContent = t('detail.networkNone');
    sel.appendChild(none);
    (data.networks || []).forEach(n => {
        const opt = document.createElement('option');
        opt.value = n.id;
        opt.textContent = n.name || String(n.id);
        sel.appendChild(opt);
    });
    const src = state.networkSources[state.currentMedia.id];
    if (src && src.networkId) sel.value = String(src.networkId);
}

// Tap/click and keyboard reveal for the spoilered sheet fields.
detailView.addEventListener('click', e => {
    const spoiler = e.target.closest('[data-spoiler]');
    if (spoiler) toggleSpoiler(spoiler);
});

detailView.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const spoiler = e.target.closest('[data-spoiler]');
    if (!spoiler) return;
    e.preventDefault();
    toggleSpoiler(spoiler);
});

// Event delegation on the episode list: a single listener handles play and
// watched-toggle for every row, including the ones rendered later.
// Disabled buttons (future episodes) never emit click events.
episodeList.addEventListener('click', e => {
    const row = e.target.closest('.episode-row[data-season]');
    if (!row || row.classList.contains('episode-row--skeleton')) return;
    const season = Number(row.dataset.season);
    const episode = Number(row.dataset.episode);
    if (e.target.closest('.episode-row__toggle') || e.target.closest('.episode-row__badge')) {
        toggleWatchedFromList(season, episode);
    } else if (e.target.closest('.episode-row__play')) {
        playEpisode(season, episode);
    }
});

episodeList.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
        const badge = e.target.closest('.episode-row__badge');
        if (badge) {
            e.preventDefault();
            const row = badge.closest('.episode-row[data-season]');
            if (row) toggleWatchedFromList(Number(row.dataset.season), Number(row.dataset.episode));
        }
    }
});

// Builds the seasons of the title into the selector:
// numbered from 1 up, then the special season (0) renamed "Special".
// At the end there is the "Other…" option for values not present on TMDB.
function setupSeasonControls(tv, opts) {
    state.customMode = false;
    customControls.hidden = true;
    episodeSection.hidden = false;

    const special = (tv.seasons || []).find(s => s.season_number === 0);
    const numbered = (tv.seasons || [])
        .filter(s => s.season_number >= 1)
        .sort((a, b) => a.season_number - b.season_number);
    const seasons = [...numbered, special].filter(Boolean);

    inputSeason.innerHTML = '';
    seasons.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.season_number;
        opt.textContent = s.season_number === 0 ? t('common.special') : String(s.season_number);
        inputSeason.appendChild(opt);
    });
    const otherSeason = document.createElement('option');
    otherSeason.value = 'custom';
    otherSeason.textContent = t('common.other');
    inputSeason.appendChild(otherSeason);

    // Restores the requested season (e.g. from a notification), then the
    // last played one, otherwise the first season. If the season is not
    // listed by TMDB it reopens in manual mode.
    const desired = (opts && opts.season)
        ? { season: Number(opts.season), episode: Number(opts.episode) || 1 }
        : getLastPlayed(tv.id);
    const known = desired && seasons.some(s => s.season_number === desired.season);
    if (desired && !known && desired.season >= 1) {
        inputSeason.value = 'custom';
        inputSeasonCustom.value = desired.season;
        inputEpisodeCustom.value = desired.episode;
        enterCustomMode();
        return;
    }
    const season = known ? desired.season : (seasons.length ? seasons[0].season_number : 1);
    inputSeason.value = season;
    loadEpisodes(season, known ? desired.episode : null);
}

// Placeholder rows shown while the season is downloading.
function skeletonHtml(rows = 3) {
    let out = '';
    for (let i = 0; i < rows; i++) {
        out += `
        <div class="episode-row episode-row--skeleton" aria-hidden="true">
            <div class="episode-row__thumb skeleton-block"></div>
            <div class="episode-row__body">
                <div class="skeleton-block sk-title"></div>
                <div class="skeleton-block sk-meta"></div>
                <div class="skeleton-block sk-line"></div>
            </div>
        </div>`;
    }
    return out;
}

// Request token for the episode list: a slow season download must never
// render into the view of a season/title chosen afterwards.
let episodesRequestSeq = 0;

// Loads the episodes of a season from TMDB (with an in-memory cache) and shows them.
async function loadEpisodes(season, highlightEpisode = null) {
    const requestSeq = ++episodesRequestSeq;
    state.currentSeason = Number(season);
    state.currentEpisode = highlightEpisode || 1;
    if (!state.currentMedia || state.currentMedia.media_type !== 'tv') return;
    episodeList.innerHTML = skeletonHtml();

    try {
        const eps = await getSeasonEpisodes(state.currentMedia.id, state.currentSeason);
        if (requestSeq !== episodesRequestSeq || !state.currentMedia || state.currentMedia.media_type !== 'tv') return;
        renderEpisodeList(eps, highlightEpisode);
    } catch (err) {
        if (requestSeq !== episodesRequestSeq) return;
        episodeList.innerHTML = '<p class="episode-list__empty">' + t('msg.episodesLoadError') + '</p>';
    }
}

function formatAirDateTime(dateStr) {
    if (!dateStr) return '';
    let s = String(dateStr);
    let datePart = s;
    let timePart = '';
    const tIdx = s.indexOf('T');
    if (tIdx !== -1) {
        datePart = s.slice(0, tIdx);
        const m = s.slice(tIdx + 1).match(/^(\d{1,2}):(\d{2})/);
        if (m) timePart = `${m[1]}:${m[2]}`;
    }
    const parts = datePart.split('-').map(Number);
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return dateStr;
    const dt = new Date(parts[0], parts[1] - 1, parts[2]);
    let out;
    try { out = dt.toLocaleDateString(locale(), { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch (err) { out = dateStr; }
    if (timePart) out += ` · ${timePart}`;
    return out;
}

// Renders the episode list in a streaming style: thumbnail, number,
// title, meta, synopsis and a play button. Watched = greyed out with a
// "✓ Watched" badge; not yet aired = disabled with the air date.
function renderEpisodeList(eps, highlightEpisode) {
    episodeList.classList.add('is-transitioning');
    setTimeout(() => {
        episodeList.innerHTML = '';
        if (!eps.length) {
            episodeList.innerHTML = '<p class="episode-list__empty">' + t('msg.noEpisodes') + '</p>';
            episodeList.classList.remove('is-transitioning');
            return;
        }

    // Pre-compute per-episode labels used multiple times in the template.
    const seasonLabel = state.currentSeason === 0 ? t('common.special') : state.currentSeason;
    const removeFromWatchedLabel = t('episode.removeFromWatched');
    const markWatchedLabel = t('episode.markWatched');

    const frag = document.createDocumentFragment();
    eps.forEach(ep => {
        const epNum = ep.episode_number;
        const watched = isEpisodeWatched(state.currentMedia.id, state.currentSeason, epNum);
        const future = !!ep.air_date && !isAired(ep.air_date);
        const resume = highlightEpisode === epNum;

        const row = document.createElement('div');
        row.className = 'episode-row'
            + (watched ? ' is-watched' : '')
            + (future ? ' is-future' : '')
            + (resume ? ' is-resume' : '');
        row.dataset.season = state.currentSeason;
        row.dataset.episode = epNum;

        const still = tmdbImagePath(ep.still_path) ? `${IMG_STILL}${ep.still_path}` : EPISODE_PLACEHOLDER;
        const title = ep.name || t('episode.label', { n: epNum });
        const safeTitle = escapeHtml(title);
        const meta = [];
        if (ep.runtime) meta.push(`${ep.runtime} min`);
        const airDateFormatted = ep.air_date ? formatAirDateTime(ep.air_date) : '';
        if (airDateFormatted) meta.push(airDateFormatted);

        const epLabel = `${seasonLabel}-${epNum}`;
        const playLabel = future
            ? t('episode.airingOn', { date: escapeHtml(airDateFormatted) })
            : (watched ? t('episode.watchAgain') : t('episode.watch'));

        row.innerHTML = `
            <div class="episode-row__thumb">
                <img src="${still}" alt="${safeTitle}" loading="lazy" decoding="async">
                <span class="episode-row__num">${epLabel}</span>
            </div>
            <div class="episode-row__body">
                <div class="episode-row__head">
                    <h4 class="episode-row__title">${safeTitle}</h4>
                    ${watched ? `<span class="episode-row__badge" role="button" tabindex="0" aria-label="${removeFromWatchedLabel}" title="${removeFromWatchedLabel}">${t('episode.watched')}</span>` : ''}
                </div>
                <p class="episode-row__meta">${escapeHtml(meta.join(' · '))}</p>
                <p class="episode-row__overview">${escapeHtml(ep.overview || t('detail.noOverview'))}</p>
            </div>
            <div class="episode-row__actions">
                <button type="button" class="btn episode-row__play" ${future ? 'disabled' : ''}
                    ${future ? `title="${escapeHtml(airDateFormatted)}"` : ''}
                    aria-label="${playLabel} ${epLabel}">
                    ${playLabel}
                </button>
                <button type="button" class="episode-row__toggle" ${future ? 'disabled' : ''}
                    title="${watched ? removeFromWatchedLabel : markWatchedLabel}">
                    ✓
                </button>
            </div>
        `;
        frag.appendChild(row);
    });
    episodeList.appendChild(frag);

    syncSeasonMarkButton(eps);
    episodeList.classList.remove('is-transitioning');
    // Sync stack height after episode list renders (detail height changed)
    requestAnimationFrame(() => syncStackToView(detailView));
    }, 150);
}

// Syncs the "mark the whole season" button from the episodes list.
function syncSeasonMarkButton(eps) {
    const markBtn = document.getElementById('btn-mark-season');
    if (!markBtn || !state.currentMedia || !eps) return;
    const aired = eps.filter(ep => isAired(ep.air_date));
    const allWatched = aired.length > 0 && aired.every(ep => isEpisodeWatched(state.currentMedia.id, state.currentSeason, ep.episode_number));
    markBtn.disabled = aired.length === 0;
    markBtn.innerText = allWatched ? t('episode.markAllUnwatched') : t('episode.markAllWatched');
}

// Syncs the "mark/unmark every season as watched" button from the current
// watched state of the whole series.
function syncAllAiredMarkButton(allWatched) {
    if (!btnMarkAllAired || !state.currentMedia) return;
    const label = allWatched ? t('detail.markAllAiredUnwatched') : t('detail.markAllAired');
    btnMarkAllAired.setAttribute('aria-label', label);
    btnMarkAllAired.setAttribute('title', label);
    btnMarkAllAired.classList.toggle('is-all-clear', allWatched);
}

// Play from a list row: marks as watched and opens the player.
function playEpisode(season, episode) {
    state.currentSeason = Number(season);
    state.currentEpisode = Number(episode);
    toggleEpisodeWatched(state.currentMedia.id, state.currentSeason, state.currentEpisode, true);
    syncEpisodeRow(state.currentSeason, state.currentEpisode);
    openPlayer();
    refreshUnwatchedCount();
    refreshHomeUnwatchedCount();
}

// Updates in place the state of a single episode row (grey-out class,
// watched badge, play label and toggle icon) instead of re-rendering the
// whole list.
function syncEpisodeRow(season, episode) {
    const watched = isEpisodeWatched(state.currentMedia.id, season, episode);
    const row = episodeList.querySelector(`.episode-row[data-episode="${episode}"]`);
    if (row) {
        row.classList.toggle('is-watched', watched);

        let badge = row.querySelector('.episode-row__badge');
        if (watched) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'episode-row__badge';
                badge.setAttribute('role', 'button');
                badge.setAttribute('tabindex', '0');
                row.querySelector('.episode-row__head').appendChild(badge);
            }
            badge.title = t('episode.removeFromWatched');
            badge.setAttribute('aria-label', t('episode.removeFromWatched'));
            badge.textContent = t('episode.watched');
        } else if (badge) {
            badge.remove();
        }

        const playBtn = row.querySelector('.episode-row__play');
        if (playBtn && !playBtn.disabled) {
            playBtn.textContent = watched ? t('episode.watchAgain') : t('episode.watch');
        }

        const toggleBtn = row.querySelector('.episode-row__toggle');
        if (toggleBtn) {
            toggleBtn.textContent = '✓';
            toggleBtn.title = watched ? t('episode.removeFromWatched') : t('episode.markWatched');
        }
    }

    const cached = seasonEpisodesCache.get(`${state.currentMedia.id}:${season}`);
    if (cached) syncSeasonMarkButton(cached);
}

// Manual watched/unwatched toggle from a list row.
function toggleWatchedFromList(season, episode) {
    toggleEpisodeWatched(state.currentMedia.id, Number(season), Number(episode));
    syncEpisodeRow(Number(season), Number(episode));
    refreshUnwatchedCount();
    refreshHomeUnwatchedCount();
}

// Marks as watched (or unwatched) all the already-aired episodes of the
// current season with a single tap. Future episodes stay locked.
function markSeasonWatched() {
    if (!state.currentMedia || state.currentMedia.media_type !== 'tv') return;
    const eps = seasonEpisodesCache.get(`${state.currentMedia.id}:${state.currentSeason}`);
    if (!eps || !eps.length) return;

    const aired = eps.filter(ep => isAired(ep.air_date));
    if (!aired.length) return;

    const allWatched = aired.every(ep => isEpisodeWatched(state.currentMedia.id, state.currentSeason, ep.episode_number));
    const seasons = state.watchedEpisodes[state.currentMedia.id] || (state.watchedEpisodes[state.currentMedia.id] = {});
    const existing = seasons[state.currentSeason] || [];
    const airedNums = new Set(aired.map(ep => ep.episode_number));
    if (allWatched) {
        const remaining = existing.filter(n => !airedNums.has(n));
        if (remaining.length) seasons[state.currentSeason] = remaining;
        else delete seasons[state.currentSeason];
    } else {
        seasons[state.currentSeason] = [...new Set([...existing, ...airedNums])].sort((a, b) => a - b);
    }
    if (!Object.keys(seasons).length) delete state.watchedEpisodes[state.currentMedia.id];
    persistWatchedEpisodes();
    renderEpisodeList(eps, null);
    refreshUnwatchedCount();
    refreshHomeUnwatchedCount();
}

// Marks as watched all the already-aired episodes of every season (up to
// today). Future episodes stay locked.
async function markAllAiredWatched() {
    if (!state.currentMedia || state.currentMedia.media_type !== 'tv') return;
    if (btnMarkAllAired) {
        btnMarkAllAired.disabled = true;
        btnMarkAllAired.dataset.originalText = btnMarkAllAired.textContent;
        btnMarkAllAired.textContent = '⟳';
        btnMarkAllAired.setAttribute('aria-busy', 'true');
    }

    const seasons = (state.currentMedia.seasons || []).filter(s => s.season_number >= 1);
    const results = await mapPool(seasons, 5, async s => {
        try {
            return { sn: s.season_number, eps: await getSeasonEpisodes(state.currentMedia.id, s.season_number) };
        } catch (err) {
            return { sn: s.season_number, eps: null };
        }
    });

    // Detect whether every already-aired episode of every season is already
    // watched: if so the button toggles the mark OFF for the whole series.
    let anyAired = false;
    let allWatched = true;
    results.forEach(r => {
        if (!r.eps) { allWatched = false; return; }
        r.eps.forEach(ep => {
            if (ep.air_date && !isAired(ep.air_date)) return; // future: ignored
            anyAired = true;
            if (!isEpisodeWatched(state.currentMedia.id, r.sn, ep.episode_number)) allWatched = false;
        });
    });

    const showId = state.currentMedia.id;
    if (allWatched && anyAired) {
        // Toggle off: remove only the already-aired marks from every season
        // (mirrors markSeasonWatched, keeping any other state intact).
        const seasonsStore = state.watchedEpisodes[showId] || {};
        results.forEach(r => {
            if (!r.eps) return;
            const airedNums = new Set(r.eps
                .filter(ep => !(ep.air_date && !isAired(ep.air_date)))
                .map(ep => ep.episode_number));
            if (!airedNums.size) return;
            const sn = r.sn;
            const existing = seasonsStore[sn] || [];
            const remaining = existing.filter(n => !airedNums.has(n));
            if (remaining.length) seasonsStore[sn] = remaining;
            else delete seasonsStore[sn];
        });
        if (!Object.keys(seasonsStore).length) delete state.watchedEpisodes[showId];
    } else {
        const seasonsStore = state.watchedEpisodes[showId] || (state.watchedEpisodes[showId] = {});
        results.forEach(r => {
            const sn = r.sn;
            const eps = r.eps;
            if (!eps || !eps.length) return;
            const nums = eps
                .filter(ep => !(ep.air_date && !isAired(ep.air_date)))
                .map(ep => ep.episode_number);
            if (!nums.length) return;
            const existing = seasonsStore[sn] || [];
            seasonsStore[sn] = [...new Set([...existing, ...nums])].sort((a, b) => a - b);
        });
        if (!Object.keys(seasonsStore).length) delete state.watchedEpisodes[showId];
    }
    persistWatchedEpisodes();

    const cached = seasonEpisodesCache.get(`${showId}:${state.currentSeason}`);
    if (cached) renderEpisodeList(cached, null);
    refreshUnwatchedCount();
    refreshHomeUnwatchedCount();
    if (btnMarkAllAired) {
        btnMarkAllAired.disabled = false;
        btnMarkAllAired.textContent = btnMarkAllAired.dataset.originalText || '✓';
        btnMarkAllAired.removeAttribute('aria-busy');
        delete btnMarkAllAired.dataset.originalText;
    }
}

// Finds the resume point of a series: the first already-aired episode,
// scanning numbered seasons in order, that the user has not watched yet.
// Specials (season 0) are skipped. Returns null when everything aired
// has been watched (or the data cannot be downloaded).
async function findNextUnwatched(showId) {
    const seasons = (await fetchSeasons(showId))
        .filter(s => s.season_number >= 1)
        .sort((a, b) => a.season_number - b.season_number);
    // Sliding prefetch window: while one season is inspected the next two
    // are already downloading, instead of one await-at-a-time (N+1).
    let cursor = 0;
    const inFlight = new Map(); // season index -> episodes promise
    const fillWindow = () => {
        while (cursor < seasons.length && inFlight.size < 3) {
            const idx = cursor++;
            inFlight.set(idx, getSeasonEpisodes(showId, seasons[idx].season_number).catch(() => null));
        }
    };
    fillWindow();
    for (let i = 0; i < seasons.length; i++) {
        const eps = await inFlight.get(i);
        inFlight.delete(i);
        fillWindow();
        if (!eps) continue;
        for (const ep of eps) {
            if (!isAired(ep.air_date)) continue;
            if (!isEpisodeWatched(showId, seasons[i].season_number, ep.episode_number)) {
                return { season: seasons[i].season_number, episode: ep.episode_number };
            }
        }
    }
    return null;
}

// Counts the already-aired episodes not yet watched of the series and
// updates the counter on the hero. Downloads (and caches) the seasons not
// loaded yet.
async function refreshUnwatchedCount() {
    if (!state.currentMedia || state.currentMedia.media_type !== 'tv' || !unwatchedEl) {
        if (unwatchedEl) unwatchedEl.hidden = true;
        return;
    }
    const media = state.currentMedia; // the view can change while seasons download
    const seasons = (media.seasons || []).filter(s => s.season_number >= 1);
    const results = await mapPool(seasons, 5, s => getSeasonEpisodes(media.id, s.season_number).then(
        value => ({ ok: true, value }),
        () => ({ ok: false })
    ));
    if (state.currentMedia !== media) return; // stale result for a title no longer shown
    const loaded = results.filter(r => r.ok).map(r => r.value);
    const total = countUnwatchedEps(media.id, loaded);

    let anyAired = false;
    loaded.forEach(eps => eps.forEach(ep => { if (isAired(ep.air_date)) anyAired = true; }));

    const allClear = total === 0 && anyAired;
    if (total === 0 && !anyAired) {
        unwatchedEl.hidden = true;
        return total;
    }
    syncAllAiredMarkButton(allClear);

    unwatchedEl.classList.toggle('is-all-clear', allClear);
    unwatchedEl.innerText = allClear ? '✓' : String(total);
    unwatchedEl.title = allClear ? t('msg.allWatched') : tp('msg.unwatchedCount', total);
    unwatchedEl.hidden = false;
    return total;
}

// Enters manual mode: shows the free Season/Episode inputs.
function enterCustomMode() {
    state.customMode = true;
    customControls.hidden = false;
    episodeSection.hidden = true;
    const c = state.currentMedia ? state.customSelections[state.currentMedia.id] : null;
    const seasonVal = Number(inputSeason.value);
    inputSeasonCustom.value = c?.season ?? (Number.isFinite(seasonVal) && seasonVal >= 1 ? seasonVal : 1);
    inputEpisodeCustom.value = c?.episode ?? 1;
}

// Exits manual mode, going back to the season selector and the episode list.
function exitCustomMode() {
    state.customMode = false;
    customControls.hidden = true;
    episodeSection.hidden = false;
}

function onSeasonChange(value) {
    if (value === 'custom') {
        enterCustomMode();
    } else {
        exitCustomMode();
        loadEpisodes(value, null);
    }
}

// Moves the season selector and the episode list onto the resume episode,
// so the sheet shows what "Watch now" is about to play.
async function syncResumeSelection(season, episode) {
    const hasOption = Array.from(inputSeason.options).some(opt => opt.value === String(season));
    if (!hasOption) return;
    if (Number(inputSeason.value) !== Number(season) || state.currentEpisode !== episode) {
        inputSeason.value = String(season);
        await loadEpisodes(season, episode);
    }
}

// Public TMDB page of the title currently open in the sheet.
function tmdbPageUrl() {
    const m = state.currentMedia;
    if (!m || !Number.isFinite(Number(m.id))) return '';
    const kind = m.media_type === 'tv' ? 'tv' : 'movie';
    return `https://www.themoviedb.org/${kind}/${m.id}`;
}

// Falls back to the legacy textarea trick: navigator.clipboard needs a
// secure context and may be missing in embedded webviews.
function copyViaTextarea(text) {
    try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
    } catch { /* clipboard unavailable: nothing else to do */ }
}

function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(() => copyViaTextarea(text));
    } else {
        copyViaTextarea(text);
    }
}

// Android: native share sheet. Desktop/web/AppImage: copies the TMDB link.
async function shareTitle() {
    const url = tmdbPageUrl();
    if (!url) return;
    if (window.Capacitor?.Plugins?.Share) {
        try {
            await window.Capacitor.Plugins.Share.share({
                dialogTitle: t('detail.share'),
                title: state.currentMedia.title || state.currentMedia.name || t('common.noTitle'),
                url
            });
        } catch { /* share sheet dismissed by the user */ }
        return;
    }
    copyToClipboard(url);
    showToast(t('msg.linkCopied'));
}

// Opens the title's TMDB page with the configured browser preference.
async function openTmdbPage() {
    const url = tmdbPageUrl();
    if (url) await openLink(url);
}

export { showDetails, markSeasonWatched, markAllAiredWatched, onSeasonChange, refreshUnwatchedCount, findNextUnwatched, syncResumeSelection, shareTitle, openTmdbPage };