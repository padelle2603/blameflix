import { state } from './state.js';
import { decimalIsComma } from './langs.js';

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
}

// Sanitizes a TMDB image path before it is interpolated into a URL or an
// HTML attribute: only "/<name>.<ext>" shapes are accepted, so restored
// backups cannot smuggle markup or URL breakouts through poster fields.
function tmdbImagePath(path) {
    return typeof path === 'string' && /^\/[A-Za-z0-9._-]+\.(jpg|jpeg|png|webp)$/i.test(path) ? path : '';
}

// True for a positive integer (ids coming from backups must be plain ids).
function isPositiveInt(value) {
    return Number.isInteger(value) && value > 0;
}

// Coerces to a non-negative integer when possible, otherwise the fallback.
function toIntOr(value, fallback) {
    const n = Number(value);
    return Number.isInteger(n) && n >= 0 ? n : fallback;
}

// Whitelists a media type coming from an untrusted source.
function sanitizeMediaType(value, fallback) {
    return value === 'movie' || value === 'tv' ? value : fallback;
}

// Small Map-based LRU cache. Keeps the TMDB caches bounded during long
// sessions without changing their Map-like API (has/get/set/delete/clear).
// An optional maxAgeMs (0 = never expires) drops entries older than the
// given age on access, so repeated checks can still see fresh data.
class LruCache {
    constructor(maxEntries = 150, maxAgeMs = 0) {
        this.maxEntries = maxEntries;
        this.maxAgeMs = maxAgeMs;
        this.map = new Map(); // key -> { value, at }
    }
    // Returns the live entry for a key, or null when missing or expired.
    entry(key) {
        const e = this.map.get(key);
        if (!e) return null;
        if (this.maxAgeMs > 0 && Date.now() - e.at > this.maxAgeMs) {
            this.map.delete(key); // expired
            return null;
        }
        return e;
    }
    has(key) { return !!this.entry(key); }
    get(key) {
        const e = this.entry(key);
        if (!e) return undefined;
        this.map.delete(key); // refresh recency
        this.map.set(key, e);
        return e.value;
    }
    set(key, value) {
        if (this.map.has(key)) this.map.delete(key);
        this.map.set(key, { value, at: Date.now() });
        if (this.map.size > this.maxEntries) {
            const oldest = this.map.keys().next().value;
            this.map.delete(oldest);
        }
    }
    delete(key) { return this.map.delete(key); }
    clear() { this.map.clear(); }
}

// Runs async work over items with bounded concurrency (keeps the startup
// fast without firing hundreds of simultaneous TMDB requests).
async function mapPool(items, limit, worker) {
    const results = new Array(items.length);
    let next = 0;
    async function run() {
        while (next < items.length) {
            const index = next++;
            results[index] = await worker(items[index], index);
        }
    }
    const runners = Array.from({ length: Math.min(limit, items.length) }, run);
    await Promise.all(runners);
    return results;
}

// Localized vote number, e.g. "7,2" where the decimal separator is a comma.
function formatVoteNumber(vote) {
    const n = Number(vote).toFixed(1);
    return decimalIsComma(state.lang) ? n.replace('.', ',') : n;
}

function formatVote(vote) {
    if (!vote) return '—';
    return `${formatVoteNumber(vote)} / 10`;
}

// Air timestamp of an episode. TMDB normally provides only the date
// (YYYY-MM-DD): in that case midnight of that day is used. If the string
// also contains the time (e.g. "2026-08-16T21:00:00Z") it is used.
function airDateTs(airDate) {
    if (!airDate) return null;
    const s = String(airDate);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        return new Date(`${s}T00:00:00`).getTime();
    }
    const t = new Date(s).getTime();
    return Number.isFinite(t) ? t : null;
}

// True if the airing already happened (including the time, when available).
// Without a date the episode is considered already aired.
function isAired(airDate) {
    const ts = airDateTs(airDate);
    if (ts === null) return true;
    return ts <= Date.now();
}

export { escapeHtml, tmdbImagePath, isPositiveInt, toIntOr, sanitizeMediaType, LruCache, mapPool, airDateTs, isAired, formatVoteNumber, formatVote };