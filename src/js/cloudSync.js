// Optional cloud sync to a personal Supabase project, entirely opt-in and
// user-owned (the developer never hosts or sees any data). Two layers keep
// the data private: (1) the backup payload is encrypted client-side with a
// personal token (AES-GCM), and (2) a single table row is isolated via a
// `partition` column equal to the SHA-256 hash of that token, enforced by
// Supabase Row Level Security.
//
// Expected Supabase table:
//   create table blameflix_backup (
//     partition  text primary key,
//     payload    text not null,
//     updated_at timestamptz not null default now()
//   );
// Suggested RLS policy: only allow selecting/upserting the row whose
// `partition` matches the current value supplied by the client (e.g. via a
// session variable), never a global table scan.
import { state, persistCloudSync } from './state.js';
import { backupData, applyBackupData } from './backup.js';
import {
    generateCloudToken, cloudPartitionHash, encryptCloudToken, decryptCloudToken,
    encryptWithToken, decryptWithToken
} from './crypto.js';
import { t } from './i18n.js';
import { showToast } from './toast.js';

const TABLE = 'blameflix_backup';

// Resolves the plaintext personal token from the stored (encrypted) value.
// Throws when the cloud sync has not been fully configured.
async function resolveToken() {
    const cs = state.cloudSync;
    if (!cs.enabled || !cs.url || !cs.anonKey || !cs.tokenEnc) {
        throw new Error('Cloud sync not configured');
    }
    return decryptCloudToken(cs.tokenEnc);
}

function headers() {
    return {
        'apikey': state.cloudSync.anonKey,
        'Authorization': `Bearer ${state.cloudSync.anonKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
        'x-partition': state.cloudSync.partitionHash
    };
}

function baseUrl() {
    return String(state.cloudSync.url).replace(/\/+$/, '') + '/rest/v1/' + TABLE;
}

// Pushes the current backup (encrypted) to the user's cloud row (upsert).
async function pushCloud() {
    try {
        const token = await resolveToken();
        const partition = state.cloudSync.partitionHash;
        const payload = await encryptWithToken(JSON.stringify(await backupData({ includeSensitive: false })), token);
        const now = new Date().toISOString();
        const res = await fetch(`${baseUrl()}?on_conflict=partition`, {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify({ partition, payload, updated_at: now })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        state.cloudSync.lastPush = Date.now();
        persistCloudSync();
        showToast(t('cloud'), t('msg.cloudPushed'));
    } catch (err) {
        if (err && err.message === 'Cloud sync not configured') {
            showToast(t('cloud'), t('msg.cloudNotConfigured'));
        } else {
            showToast(t('cloud'), t('msg.cloudPushError'), 5000);
        }
    }
}

// Fetches the cloud row, decrypts it and applies the data locally.
async function pullCloud() {
    try {
        const token = await resolveToken();
        const partition = state.cloudSync.partitionHash;
        const res = await fetch(`${baseUrl()}?partition=eq.${encodeURIComponent(partition)}&select=*`, {
            method: 'GET',
            headers: headers()
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const rows = await res.json();
        const row = Array.isArray(rows) ? rows.find(r => r && r.partition === partition) : null;
        if (!row || typeof row.payload !== 'string') {
            showToast(t('cloud'), t('msg.cloudEmpty'));
            return;
        }
        const plain = await decryptWithToken(row.payload, token);
        const payload = JSON.parse(plain);
        const data = payload && typeof payload === 'object' && payload.data ? payload.data : payload;
        if (!data || typeof data !== 'object') throw new Error('Invalid structure');
        const ok = await applyBackupData(data, (msg) => showToast(t('cloud'), msg, 3500), { includeSensitive: false });
        if (ok) {
            state.cloudSync.lastPull = Date.now();
            persistCloudSync();
            showToast(t('cloud'), t('msg.cloudPulled'));
        }
    } catch (err) {
        if (err && err.message === 'Cloud sync not configured') {
            showToast(t('cloud'), t('msg.cloudNotConfigured'));
        } else {
            showToast(t('cloud'), t('msg.cloudPullError'), 5000);
        }
    }
}

// Encrypts a personal token, derives its partition hash and persists both.
// Shared by the generate button and by a manual paste on a second device.
async function setCloudToken(plainToken) {
    const plain = String(plainToken).trim();
    if (!plain) return;
    const [tokenEnc, partition] = await Promise.all([
        encryptCloudToken(plain),
        cloudPartitionHash(plain)
    ]);
    state.cloudSync.tokenEnc = tokenEnc;
    state.cloudSync.partitionHash = partition;
    persistCloudSync();
}

// (Re)generates a fresh personal token, stores it and returns the plaintext.
async function regenerateCloudToken() {
    const token = generateCloudToken();
    await setCloudToken(token);
    return token;
}

export { pushCloud, pullCloud, setCloudToken, regenerateCloudToken, resolveToken };
