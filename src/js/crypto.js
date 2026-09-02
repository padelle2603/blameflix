async function getCryptoKey() {
    let keyStr = localStorage.getItem('myCryptoKey');
    if (keyStr) return keyStr;
    const raw = crypto.getRandomValues(new Uint8Array(32));
    keyStr = arrayBufferToBase64(raw);
    localStorage.setItem('myCryptoKey', keyStr);
    return keyStr;
}

async function importCryptoKey(keyStr) {
    const raw = base64ToArrayBuffer(keyStr);
    return crypto.subtle.importKey(
        'raw',
        raw,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

export async function encryptAPIKey(plaintext) {
    const keyStr = await getCryptoKey();
    const key = await importCryptoKey(keyStr);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoder.encode(plaintext)
    );
    return JSON.stringify({ v: 1, iv: Array.from(iv), data: arrayBufferToBase64(ciphertext) });
}

export async function decryptAPIKey(encryptedStr) {
    const { iv, data } = JSON.parse(encryptedStr);
    const keyStr = localStorage.getItem('myCryptoKey');
    if (!keyStr) throw new Error('Encryption key not found');
    const key = await importCryptoKey(keyStr);
    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(iv) },
        key,
        base64ToArrayBuffer(data)
    );
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
}

export async function getCryptoKeyString() {
    return getCryptoKey();
}

export function isEncryptedKey(str) {
    try {
        const obj = JSON.parse(str);
        return obj && obj.v === 1 && Array.isArray(obj.iv) && typeof obj.data === 'string';
    } catch { return false; }
}

// Generates a fresh high-entropy personal cloud token (32 random bytes,
// base64url) used both for the Supabase partition (via its SHA-256 hash) and
// as the AES-GCM key that encrypts the backup payload.
export function generateCloudToken() {
    const raw = crypto.getRandomValues(new Uint8Array(32));
    return arrayBufferToBase64(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256Hex(text) {
    const data = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Derives the opaque partition id (SHA-256 of the token). The raw token is
// never persisted nor transmitted; only its hash is used for RLS isolation.
export async function cloudPartitionHash(token) {
    return sha256Hex(token);
}

// Encrypts the raw cloud token with the local myCryptoKey so it can be
// stored on the device without exposing the plaintext.
export async function encryptCloudToken(token) {
    return encryptAPIKey(token);
}

// Decrypts the stored cloud token back to its plaintext for use.
export async function decryptCloudToken(tokenEnc) {
    return decryptAPIKey(tokenEnc);
}

// Imports a base64url-encoded 32-byte token as an AES-GCM CryptoKey.
async function importTokenKey(token) {
    const raw = new Uint8Array(32);
    const bin = atob(token.replace(/-/g, '+').replace(/_/g, '/'));
    for (let i = 0; i < 32; i++) raw[i] = bin.charCodeAt(i);
    return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

// Encrypts a UTF-8 payload with the provided token (used as an AES-GCM key).
// Returns an object { v, iv, data } as a JSON string.
export async function encryptWithToken(plaintext, token) {
    const key = await importTokenKey(token);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext));
    return JSON.stringify({ v: 1, iv: Array.from(iv), data: arrayBufferToBase64(ciphertext) });
}

// Decrypts a payload produced by encryptWithToken, returning the UTF-8 text.
export async function decryptWithToken(encryptedStr, token) {
    const { iv, data } = JSON.parse(encryptedStr);
    const key = await importTokenKey(token);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(iv) }, key, base64ToArrayBuffer(data));
    return new TextDecoder().decode(decrypted);
}

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    return btoa(binary);
}

function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
}