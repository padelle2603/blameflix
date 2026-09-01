import { state, persistNetworkSources } from './state.js';
import { t } from './i18n.js';
import { showToast } from './toast.js';
import { sourceTemplateError } from './sourceUtils.js';

// Validates the schedule template: empty is allowed (means "no network
// source"), otherwise it must be an http/https URL. Returns an error
// message or null.
function templateError(template) {
    return sourceTemplateError(template);
}

// Replaces the network-schedule placeholders ({id}, {networkId},
// {networkName}, {season}) and refuses templates with leftovers or a bad
// scheme. networkName is URL-encoded so spaces/special chars are safe.
function resolveTemplate(template, vars) {
    let url = String(template).trim();
    if (!url) return null;
    url = url
        .replaceAll('{id}', vars.id)
        .replaceAll('{networkId}', vars.networkId ?? '')
        .replaceAll('{networkName}', encodeURIComponent(vars.networkName || ''))
        .replaceAll('{season}', vars.season ?? '');
    if (/[{][a-zA-Z]+[}]/.test(url) || !/^https?:\/\//i.test(url)) return null;
    return url;
}

// Parses a tolerant schedule JSON into { season, episode, ts } entries.
// Accepts: an array of { season, episode, air_date }, { episodes: [...] },
// or a nested map { "1": { "3": "2026-09-01" } }. air_date is ISO or
// YYYY-MM-DD (or any Date.parse-parseable string).
function parseSchedule(json) {
    const out = [];
    const push = (season, episode, air) => {
        const s = Number(season), e = Number(episode);
        if (!Number.isFinite(s) || !Number.isFinite(e) || s < 0 || e < 1) return;
        let ts = null;
        if (air) {
            const tm = Date.parse(air);
            if (Number.isFinite(tm)) ts = tm;
        }
        out.push({ season: s, episode: e, ts });
    };
    if (!json || typeof json !== 'object') return out;
    let arr = Array.isArray(json) ? json
        : (json.episodes && Array.isArray(json.episodes) ? json.episodes : null);
    if (arr) {
        for (const it of arr) {
            if (it && typeof it === 'object') push(it.season, it.episode, it.air_date);
        }
    } else {
        for (const sk of Object.keys(json)) {
            const seasons = json[sk];
            if (!seasons || typeof seasons !== 'object') continue;
            for (const ek of Object.keys(seasons)) push(sk, ek, seasons[ek]);
        }
    }
    return out;
}

function getNetworkSource(showId) {
    const s = state.networkSources[showId];
    return s && typeof s === 'object' ? s : null;
}

// Downloads and parses the network schedule for a show. Returns null when
// no source is configured, the template is unresolved, or the fetch fails
// (CORS, offline, bad JSON): the caller then keeps using TMDB as fallback.
async function fetchSchedule(showId) {
    const src = getNetworkSource(showId);
    if (!src || !src.template) return null;
    const url = resolveTemplate(src.template, {
        id: showId,
        networkId: src.networkId ?? '',
        networkName: src.networkName ?? ''
    });
    if (!url) return null;
    try {
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return parseSchedule(await res.json());
    } catch (err) {
        return null;
    }
}

// Local mirror of releases.isNewerThanStored for the network sub-state,
// kept here to avoid a circular import with releases.js.
function isNewerThanStored(stored, cur) {
    if (!stored) return false;
    if (stored.season === cur.season && stored.episode === cur.episode) return false;
    if (cur.ts === null) return false;
    if (typeof stored.ts === 'number') return cur.ts > stored.ts;
    return false;
}

// Judges a network schedule against the stored network state. Mutates
// releaseState.shows[id].net. Returns a news entry, or null.
function judgeNetworkRelease(item, entries, ctx, title) {
    if (!entries || !entries.length) return null;
    const now = Date.now();
    const aired = entries.filter(e => Number.isFinite(e.ts) && e.ts <= now);
    if (!aired.length) return null;
    let cur = aired[0];
    for (const e of aired) if (e.ts > cur.ts) cur = e;
    const stored = ctx.releaseState.shows[item.id];
    const netStored = stored && stored.net;
    const isNew = isNewerThanStored(netStored, cur);
    if (stored) stored.net = cur;
    else ctx.releaseState.shows[item.id] = { net: cur };
    if (!isNew || ctx.isBaseline || !ctx.notifyTv) return null;
    if (ctx.isWatched(item.id, cur.season, cur.episode)) return null;
    const src = getNetworkSource(item.id);
    return {
        media_type: 'tv',
        id: item.id,
        title: title || t('common.noTitle'),
        season: cur.season,
        episode: cur.episode,
        network: src && src.networkName ? src.networkName : null
    };
}

// --- Detail-view UI handlers ---

function networkSourceKey() {
    return state.currentMedia && state.currentMedia.media_type === 'tv' ? String(state.currentMedia.id) : '';
}

function toggleNetworkSource() {
    const panel = document.getElementById('network-panel');
    const input = document.getElementById('network-schedule-input');
    const sel = document.getElementById('network-select');
    if (panel.hidden) {
        const src = getNetworkSource(networkSourceKey());
        sel.value = src && src.networkId ? String(src.networkId) : '';
        input.value = src && src.template ? src.template : '';
        panel.hidden = false;
        input.focus();
    } else {
        panel.hidden = true;
    }
}

function persistAndCloseNetwork() {
    document.getElementById('network-panel').hidden = true;
    persistNetworkSources();
    syncNetworkSourceBtn();
}

function saveNetworkSource() {
    const key = networkSourceKey();
    if (!key) return;
    const sel = document.getElementById('network-select');
    const opt = sel.selectedOptions && sel.selectedOptions[0];
    const networkId = opt && opt.value ? Number(opt.value) : null;
    const networkName = opt && opt.value ? opt.textContent.trim() : null;
    const input = document.getElementById('network-schedule-input');
    const template = input.value.trim();
    const err = templateError(template);
    if (err) { showToast(t('toast.noSource'), err); return; }
    const existing = state.networkSources[key] || {};
    if (template) {
        state.networkSources[key] = {
            networkId: networkId ?? existing.networkId ?? null,
            networkName: networkName ?? existing.networkName ?? null,
            template
        };
    } else if (networkId) {
        state.networkSources[key] = { networkId, networkName, template: '' };
    } else {
        delete state.networkSources[key];
    }
    persistAndCloseNetwork();
}

function clearNetworkSource() {
    const key = networkSourceKey();
    if (!key) return;
    delete state.networkSources[key];
    document.getElementById('network-schedule-input').value = '';
    persistAndCloseNetwork();
}

function syncNetworkSourceBtn() {
    const btn = document.getElementById('btn-network');
    if (!btn) return;
    const src = getNetworkSource(networkSourceKey());
    const has = Boolean(src && (src.template || src.networkId));
    btn.innerText = has && src.networkName ? t('detail.networkCustom', { name: src.networkName }) : t('detail.networkGlobal');
    btn.classList.toggle('btn--saved', has);
}

export {
    resolveTemplate, parseSchedule, getNetworkSource,
    fetchSchedule, judgeNetworkRelease,
    toggleNetworkSource, saveNetworkSource, clearNetworkSource, syncNetworkSourceBtn
};
