// Reads a JSON value from localStorage, falling back when the key is
// missing or corrupted (a broken value must never crash the startup).
export function readStoredJson(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
    } catch (err) {
        return fallback;
    }
}
