import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  escapeHtml,
  tmdbImagePath,
  toIntOr,
  sanitizeMediaType,
  LruCache,
  mapPool,
  airDateTs,
  isAired,
} from '../src/js/utils.js';
import { sanitizeAutoSyncHours, DEFAULT_NOTIFY_SETTINGS, NEWS_HISTORY_MAX } from '../src/js/state.js';
import { isEncryptedKey, generateCloudToken } from '../src/js/crypto.js';

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'
    );
  });

  it('escapes ampersand and apostrophe', () => {
    expect(escapeHtml("Tom & Jerry's")).toBe('Tom &amp; Jerry&#39;s');
  });

  it('handles non-string input', () => {
    expect(escapeHtml(123)).toBe('123');
    expect(escapeHtml(null)).toBe('null');
  });

  it('leaves safe text unchanged', () => {
    expect(escapeHtml('plain text')).toBe('plain text');
  });
});

describe('tmdbImagePath', () => {
  it('accepts valid poster paths', () => {
    expect(tmdbImagePath('/abc123.jpg')).toBe('/abc123.jpg');
    expect(tmdbImagePath('/poster.webp')).toBe('/poster.webp');
    expect(tmdbImagePath('/a.b.c.PNG')).toBe('/a.b.c.PNG');
  });

  it('rejects non-string input', () => {
    expect(tmdbImagePath(null)).toBe('');
    expect(tmdbImagePath(undefined)).toBe('');
    expect(tmdbImagePath(42)).toBe('');
  });

  it('rejects paths with traversal or markup', () => {
    expect(tmdbImagePath('/../../etc/passwd')).toBe('');
    expect(tmdbImagePath('/x" onerror="alert(1)')).toBe('');
    expect(tmdbImagePath('http://evil.com/x.jpg')).toBe('');
  });

  it('rejects unsupported extensions', () => {
    expect(tmdbImagePath('/file.gif')).toBe('');
    expect(tmdbImagePath('/file')).toBe('');
  });
});

describe('toIntOr', () => {
  it('coerces valid non-negative integers', () => {
    expect(toIntOr('42', 0)).toBe(42);
    expect(toIntOr(7, 0)).toBe(7);
    expect(toIntOr('0', 1)).toBe(0);
  });

  it('falls back for invalid or negative values', () => {
    expect(toIntOr('-1', 5)).toBe(5);
    expect(toIntOr('abc', 5)).toBe(5);
    expect(toIntOr(1.5, 5)).toBe(5);
    expect(toIntOr(NaN, 5)).toBe(5);
  });
});

describe('sanitizeMediaType', () => {
  it('accepts movie and tv', () => {
    expect(sanitizeMediaType('movie', 'movie')).toBe('movie');
    expect(sanitizeMediaType('tv', 'movie')).toBe('tv');
  });

  it('falls back for other values', () => {
    expect(sanitizeMediaType('podcast', 'movie')).toBe('movie');
    expect(sanitizeMediaType(null, 'tv')).toBe('tv');
    expect(sanitizeMediaType('', 'movie')).toBe('movie');
  });
});

describe('LruCache', () => {
  it('stores and retrieves values', () => {
    const cache = new LruCache();
    cache.set('a', 1);
    expect(cache.get('a')).toBe(1);
    expect(cache.has('a')).toBe(true);
  });

  it('evicts the least recently used entry', () => {
    const cache = new LruCache(2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a');
    cache.set('c', 3);
    expect(cache.has('b')).toBe(false);
    expect(cache.has('a')).toBe(true);
    expect(cache.has('c')).toBe(true);
  });

  it('deletes and clears', () => {
    const cache = new LruCache();
    cache.set('a', 1);
    expect(cache.delete('a')).toBe(true);
    expect(cache.has('a')).toBe(false);
    cache.set('b', 2);
    cache.clear();
    expect(cache.size).toBeUndefined();
    expect(cache.has('b')).toBe(false);
  });

  it('expires entries after maxAgeMs', () => {
    vi.useFakeTimers();
    const cache = new LruCache(150, 1000);
    cache.set('a', 1);
    vi.advanceTimersByTime(2000);
    expect(cache.has('a')).toBe(false);
    expect(cache.get('a')).toBeUndefined();
    vi.useRealTimers();
  });

  it('keeps entries when maxAgeMs is 0', () => {
    const cache = new LruCache(150, 0);
    cache.set('a', 1);
    expect(cache.get('a')).toBe(1);
  });
});

describe('mapPool', () => {
  it('runs all items', async () => {
    const results = await mapPool([1, 2, 3], 2, x => x * 2);
    expect(results).toEqual([2, 4, 6]);
  });

  it('handles empty items', async () => {
    const results = await mapPool([], 2, x => x);
    expect(results).toEqual([]);
  });

  it('respects concurrency limit', async () => {
    let active = 0;
    let maxActive = 0;
    await mapPool([1, 2, 3, 4, 5, 6], 2, async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise(r => setTimeout(r, 1));
      active--;
      return 1;
    });
    expect(maxActive).toBeLessThanOrEqual(2);
  });
});

describe('airDateTs', () => {
  it('parses date-only strings at midnight', () => {
    const ts = airDateTs('2026-08-16');
    expect(ts).toBe(new Date('2026-08-16T00:00:00').getTime());
  });

  it('parses datetime strings', () => {
    const ts = airDateTs('2026-08-16T21:00:00Z');
    expect(Number.isFinite(ts)).toBe(true);
  });

  it('returns null for missing or invalid', () => {
    expect(airDateTs(null)).toBeNull();
    expect(airDateTs('')).toBeNull();
    expect(airDateTs('not-a-date')).toBeNull();
  });
});

describe('isAired', () => {
  it('treats missing dates as not yet aired', () => {
    expect(isAired(null)).toBe(false);
  });

  it('considers past dates as aired', () => {
    expect(isAired('2020-01-01')).toBe(true);
  });
});

describe('sanitizeAutoSyncHours', () => {
  it('accepts only whitelisted values', () => {
    expect(sanitizeAutoSyncHours(8)).toBe(8);
    expect(sanitizeAutoSyncHours(12)).toBe(12);
    expect(sanitizeAutoSyncHours(24)).toBe(24);
    expect(sanitizeAutoSyncHours(48)).toBe(48);
  });

  it('falls back to default for invalid values', () => {
    expect(sanitizeAutoSyncHours(10)).toBe(DEFAULT_NOTIFY_SETTINGS.autoSyncHours);
    expect(sanitizeAutoSyncHours('bad')).toBe(DEFAULT_NOTIFY_SETTINGS.autoSyncHours);
    expect(sanitizeAutoSyncHours(null)).toBe(DEFAULT_NOTIFY_SETTINGS.autoSyncHours);
  });
});

describe('DEFAULT_NOTIFY_SETTINGS', () => {
  it('has sane defaults', () => {
    expect(DEFAULT_NOTIFY_SETTINGS.enabled).toBe(true);
    expect(DEFAULT_NOTIFY_SETTINGS.tv).toBe(true);
    expect(DEFAULT_NOTIFY_SETTINGS.movies).toBe(true);
    expect(DEFAULT_NOTIFY_SETTINGS.autoSyncHours).toBe(24);
  });
});

describe('NEWS_HISTORY_MAX', () => {
  it('is a positive number', () => {
    expect(NEWS_HISTORY_MAX).toBeGreaterThan(0);
  });
});

describe('isEncryptedKey', () => {
  it('accepts valid encrypted keys', () => {
    expect(isEncryptedKey(JSON.stringify({ v: 1, iv: [1, 2, 3], data: 'abc' }))).toBe(true);
  });

  it('rejects invalid payloads', () => {
    expect(isEncryptedKey('not-json')).toBe(false);
    expect(isEncryptedKey(JSON.stringify({}))).toBe(false);
    expect(isEncryptedKey(JSON.stringify({ v: 2, iv: [], data: '' }))).toBe(false);
  });
});

describe('generateCloudToken', () => {
  it('produces a base64url string', () => {
    const token = generateCloudToken();
    expect(typeof token).toBe('string');
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});