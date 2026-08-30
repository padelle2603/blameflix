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
    if (!keyStr) throw new Error('Chiave di crittografia non trovata');
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

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    return btoa(String.fromCharCode(...bytes));
}

function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
}