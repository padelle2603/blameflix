import { state, setLastPlayedEntry } from './state.js';
import { inputSeasonCustom, inputEpisodeCustom } from './dom.js';
import { findNextUnwatched, syncResumeSelection, refreshUnwatchedCount } from './details.js';
import { effectiveResolverTemplate, resolveTemplate } from './resolver.js';
import { sourceTemplateError } from './sourceUtils.js';
import { toggleEpisodeWatched } from './watched.js';
import { refreshHomeUnwatchedCount } from './counter.js';
import { syncResolverNotice } from './settings.js';
import { showToast } from './toast.js';
import { t } from './i18n.js';
import { isMobile } from './env.js';
import { openLink } from './browser.js';

// --- PLAYER LOGIC ---

// Opens the player in a new window/tab (desktop browser)
function openWindow(url) {
    window.open(url, '_blank', 'noopener');
}

// Opens the player in the external browser (phone, via the Capacitor plugin)
async function openBrowser(url) {
    if (window.Capacitor?.Plugins?.Browser) {
        await window.Capacitor.Plugins.Browser.open({ url });
    } else {
        openWindow(url);
    }
}

// --- SERIES RESUME (last played seasons/episodes) ---

function saveLastPlayed(media, season, episode) {
    // Keyed by (id, media_type): movie and tv ids live in separate TMDB
    // namespaces and the same numeric id can exist in both.
    const key = `${media.id}:${media.media_type}`;
    const entry = { id: media.id, media_type: media.media_type, title: media.name || media.title, season: Number(season), episode: Number(episode), timestamp: Date.now() };
    const existing = state._lastPlayedMap.get(key);
    if (existing) {
        const index = state.lastPlayed.indexOf(existing);
        if (index !== -1) state.lastPlayed[index] = entry;
    } else {
        state.lastPlayed.push(entry);
    }
    setLastPlayedEntry(entry);
    localStorage.setItem('myLastPlayed', JSON.stringify(state.lastPlayed));
}

function getLastPlayed(id, mediaType) {
    return state._lastPlayedMap.get(`${id}:${mediaType || 'tv'}`) || null;
}

// resume=true (the "Watch now" button) starts from the first aired
// episode not watched yet; the default plays the current selection.
async function openPlayer(resume = false) {
    if (!state.currentMedia) return;

    let streamUrl;

    if (state.currentMedia.media_type === 'movie') {
        streamUrl = resolveTemplate(effectiveResolverTemplate('movie'), { id: state.currentMedia.id, media_type: state.currentMedia.media_type });
    } else if (state.currentMedia.media_type === 'tv') {
        let season, episode;
        if (state.customMode) {
            // Manual values (seasons/episodes not present on TMDB)
            season = Math.max(1, Number(inputSeasonCustom.value) || 1);
            episode = Math.max(1, Number(inputEpisodeCustom.value) || 1);
            state.customSelections[state.currentMedia.id] = { season, episode };
            localStorage.setItem('myCustomSelections', JSON.stringify(state.customSelections));
        } else if (resume) {
            const next = await findNextUnwatched(state.currentMedia.id).catch(() => null);
            if (next) {
                season = next.season;
                episode = next.episode;
                toggleEpisodeWatched(state.currentMedia.id, season, episode, true);
                await syncResumeSelection(season, episode);
                refreshUnwatchedCount();
                refreshHomeUnwatchedCount();
            } else {
                season = state.currentSeason || 1;
                episode = state.currentEpisode || 1;
            }
        } else {
            season = state.currentSeason || 1;
            episode = state.currentEpisode || 1;
        }
        streamUrl = resolveTemplate(effectiveResolverTemplate('tv'), { id: state.currentMedia.id, media_type: state.currentMedia.media_type, season, episode });
        if (streamUrl) saveLastPlayed(state.currentMedia, season, episode);
    } else {
        return;
    }

    if (!streamUrl) {
        syncResolverNotice();
        const err = sourceTemplateError(effectiveResolverTemplate(state.currentMedia.media_type));
        if (err) showToast(t('toast.noSource'), err);
        return;
    }

    // From a phone use the external browser, from a PC open a new window
    if (isMobile()) {
        await openLink(streamUrl);
    } else {
        openWindow(streamUrl);
    }
}

export { openWindow, openBrowser, getLastPlayed, openPlayer };