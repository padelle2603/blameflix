import { state } from './state.js';
import { readStoredJson } from './storage.js';
import { GITHUB_REPO, GITHUB_LATEST_URL, UPDATE_CHECK_STORAGE, resolveAppVersion, isNativeRuntime, isMobile } from './env.js';
import { t, locale } from './i18n.js';
import { updateNotice, updateNoticeText, updateNoticeApk, updateStatus, updatePopup, updatePopupText, updatePopupDownloadBtn } from './dom.js';
import { openBrowser, openWindow } from './player.js';

// Numeric semver comparison (handles "v" prefixes and suffixes).
function compareVersions(a, b) {
    const pa = String(a).replace(/^v/i, '').split(/[.\-+]/).map(n => parseInt(n, 10) || 0);
    const pb = String(b).replace(/^v/i, '').split(/[.\-+]/).map(n => parseInt(n, 10) || 0);
    const len = Math.max(pa.length, pb.length);
    for (let i = 0; i < len; i++) {
        const x = pa[i] || 0, y = pb[i] || 0;
        if (x > y) return 1;
        if (x < y) return -1;
    }
    return 0;
}

function getUpdateState() {
    return readStoredJson(UPDATE_CHECK_STORAGE, {});
}

// Downloads the latest release metadata with a hard 10s timeout. On HTTP
// errors the thrown error carries the status and the rate-limit headers
// (GitHub exposes Retry-After / X-RateLimit-Reset cross-origin), so the
// failure message can tell rate limiting apart from connectivity issues.
async function fetchLatestRelease() {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    try {
        const res = await fetch(GITHUB_LATEST_URL, { signal: ctrl.signal });
        if (!res.ok) {
            const err = new Error(`HTTP ${res.status}`);
            err.status = res.status;
            err.retryAfter = Number(res.headers.get('retry-after')) || null;
            err.rateReset = Number(res.headers.get('x-ratelimit-reset')) || null;
            throw err;
        }
        return await res.json();
    } finally {
        clearTimeout(timer);
    }
}

// Transient failures only (offline at cold start, flaky DNS/VPN): they are
// worth one quick retry. HTTP errors and timeouts are deterministic enough.
function isTransientUpdateError(err) {
    return Boolean(err) && err.status === undefined && err.name !== 'AbortError';
}

// Human-readable reason for a failed check, shown by the manual button.
function updateCheckErrorText(err) {
    if (err && (err.status === 403 || err.status === 429)) {
        let min = null;
        if (err.retryAfter) min = Math.ceil(err.retryAfter / 60);
        else if (err.rateReset) min = Math.ceil((err.rateReset * 1000 - Date.now()) / 60000);
        if (min !== null && Number.isFinite(min) && min >= 1) return t('msg.updateRateLimit', { min });
        return t('msg.updateRateLimitSoon');
    }
    if (err && err.name === 'AbortError') return t('msg.updateTimeout');
    if (err && err.status === undefined) return t('msg.updateNetwork');
    return t('msg.updateCheckFailed');
}

// If the automatic startup check failed because the network was not ready
// yet, try again once when connectivity comes back instead of staying
// silent until the next launch. The listener is dropped on success.
let onlineRetryHandler = null;
function armOnlineRetry() {
    if (onlineRetryHandler) return;
    onlineRetryHandler = () => {
        onlineRetryHandler = null;
        checkForUpdates(false);
    };
    window.addEventListener('online', onlineRetryHandler, { once: true });
}
function disarmOnlineRetry() {
    if (!onlineRetryHandler) return;
    window.removeEventListener('online', onlineRetryHandler);
    onlineRetryHandler = null;
}

// Shows when the last successful check happened (updates tab). Helps tell
// "never worked" from "works sometimes".
function syncLastUpdateCheck() {
    const el = document.getElementById('update-last-check');
    if (!el) return;
    const state = getUpdateState();
    if (!state.lastCheck) {
        el.hidden = true;
        return;
    }
    const when = new Date(state.lastCheck).toLocaleString(locale());
    el.innerText = t('settings.lastCheck', { date: when });
    el.hidden = false;
}

// Checks the latest release on GitHub. If manual is true, it shows the
// outcome in the Settings; otherwise, at every startup, when a newer
// version than the installed one exists, it shows the update banner
// together with a popup that leads to the download.
async function checkForUpdates(manual = false) {
    await resolveAppVersion();
    if (!isNativeRuntime()) {
        hideUpdateNotice();
        if (updatePopup) updatePopup.hidden = true;
        if (manual && updateStatus) {
            updateStatus.classList.remove('is-error');
            updateStatus.innerText = t('settings.updatesWebOnly');
            updateStatus.hidden = false;
            clearTimeout(checkForUpdates._t);
            checkForUpdates._t = setTimeout(() => { updateStatus.hidden = true; }, 4500);
        }
        return;
    }
    if (manual && updateStatus) {
        updateStatus.classList.remove('is-error');
        updateStatus.innerText = t('msg.checkingUpdates');
        updateStatus.hidden = false;
    }
    try {
        let data;
        try {
            data = await fetchLatestRelease();
        } catch (firstErr) {
            if (!isTransientUpdateError(firstErr)) throw firstErr;
            await new Promise(resolve => setTimeout(resolve, 2000));
            data = await fetchLatestRelease();
        }
        const tag = data.tag_name || '';
        const version = String(tag).replace(/^v/i, '');
        const stored = getUpdateState();
        stored.lastCheck = Date.now();
        stored.lastTag = tag;
        localStorage.setItem(UPDATE_CHECK_STORAGE, JSON.stringify(stored));
        disarmOnlineRetry();

        // A tag dismissed with ✕ stays hidden for automatic checks;
        // a manual check is an explicit request and shows it again.
        const updateDismissed = !manual && stored.dismissedTag === tag;

        if (version && compareVersions(version, state.appVersion) > 0) {
            // Set only when an update is really available: applyLanguage()
            // re-shows the banner from this variable on language change, so
            // an up-to-date install must leave it null.
            state.latestRelease = updateDismissed ? null : { tag, html_url: data.html_url || '', assets: Array.isArray(data.assets) ? data.assets : [] };
            if (updateDismissed) {
                hideUpdateNotice();
                if (updatePopup) updatePopup.hidden = true;
                const settingsOpenDismissed = document.getElementById('settings-update-open');
                if (settingsOpenDismissed) settingsOpenDismissed.hidden = true;
            } else {
                showUpdateNotice(state.latestRelease);
                if (!manual) showUpdatePopup();
                const settingsOpen = document.getElementById('settings-update-open');
                if (settingsOpen) settingsOpen.hidden = false;
                if (manual && updateStatus) {
                    updateStatus.classList.remove('is-error');
                    updateStatus.innerText = t('msg.newVersionAvailable', { tag });
                }
            }
        } else {
            state.latestRelease = null;
            hideUpdateNotice();
            if (updatePopup) updatePopup.hidden = true;
            const settingsOpen = document.getElementById('settings-update-open');
            if (settingsOpen) settingsOpen.hidden = true;
            if (manual && updateStatus) {
                updateStatus.classList.remove('is-error');
                updateStatus.innerText = t('msg.upToDate');
            }
        }
        syncLastUpdateCheck();
    } catch (err) {
        // Offline or API failure: fall back to the last cached release.
        const stored = getUpdateState();
        const cachedTag = String(stored.lastTag || '').replace(/^v/i, '');
        const cachedDismissed = stored.dismissedTag === stored.lastTag;
        if (!manual && !cachedDismissed && cachedTag && compareVersions(cachedTag, state.appVersion) > 0) {
            useReleaseFromState(stored);
        } else {
            hideUpdateNotice();
        }
        if (!manual) armOnlineRetry();
        if (manual && updateStatus) {
            updateStatus.classList.add('is-error');
            updateStatus.innerText = updateCheckErrorText(err);
        }
    }
    if (manual && updateStatus) {
        clearTimeout(checkForUpdates._t);
        checkForUpdates._t = setTimeout(() => { updateStatus.hidden = true; }, 4500);
    }
}

function useReleaseFromState(stored) {
    state.latestRelease = {
        tag: stored.lastTag,
        html_url: `https://github.com/${GITHUB_REPO}/releases/tag/${encodeURIComponent(stored.lastTag)}`,
        assets: []
    };
    showUpdateNotice(state.latestRelease);
    showUpdatePopup();
}

function showUpdateNotice(release) {
    updateNoticeText.innerText = t('notice.updateAvailable', { tag: release.tag });
    const apkAsset = release.assets.find(a => /\.apk$/i.test(a.name || ''));
    if (apkAsset && apkAsset.browser_download_url) {
        state.latestRelease.apkUrl = apkAsset.browser_download_url;
        updateNoticeApk.hidden = false;
    } else {
        state.latestRelease.apkUrl = '';
        updateNoticeApk.hidden = true;
    }
    updateNotice.hidden = false;
}

function hideUpdateNotice() {
    updateNotice.hidden = true;
}

function dismissUpdate() {
    const tag = state.latestRelease && state.latestRelease.tag;
    if (tag) {
        const state = getUpdateState();
        state.dismissedTag = tag;
        localStorage.setItem(UPDATE_CHECK_STORAGE, JSON.stringify(state));
    }
    // Forget the release entirely: applyLanguage() re-shows the banner from
    // this variable on language change, and a dismissed update must stay hidden.
    state.latestRelease = null;
    hideUpdateNotice();
}

// Shows the startup popup that warns about a newer version. It keeps the
// banner visible independently: "Later" only closes this popup.
function showUpdatePopup() {
    updatePopup.hidden = false;
    syncUpdatePopup();
}

// Refreshes the dynamic parts of the popup (also called on language change).
function syncUpdatePopup() {
    if (!state.latestRelease) return;
    updatePopupText.innerText = t('update.popupBody', { latest: state.latestRelease.tag, current: state.appVersion });
    updatePopupDownloadBtn.innerText = state.latestRelease.apkUrl ? t('notice.downloadApk') : t('notice.downloadGitHub');
}

// Closes only the popup: the banner and the dismissed state stay untouched.
function dismissUpdatePopup() {
    updatePopup.hidden = true;
}

// Primary popup action: direct APK download when available, otherwise the
// GitHub release page.
function updatePopupDownload() {
    if (state.latestRelease && state.latestRelease.apkUrl) downloadLatestApk();
    else openLatestRelease();
}

updatePopup.addEventListener('click', e => {
    if (e.target === updatePopup) dismissUpdatePopup();
});

// Opens the release page on GitHub (external browser on mobile).
function openLatestRelease() {
    const url = state.latestRelease && state.latestRelease.html_url
        ? state.latestRelease.html_url
        : `https://github.com/${GITHUB_REPO}/releases/latest`;
    openExternalUrl(url);
}

// Directly downloads the release APK (link to the asset on GitHub).
function downloadLatestApk() {
    const url = state.latestRelease && state.latestRelease.apkUrl;
    if (url) openExternalUrl(url);
}

// Opens an external URL: system browser on mobile, new window on desktop.
function openExternalUrl(url) {
    if (isMobile() && window.Capacitor?.Plugins?.Browser) {
        openBrowser(url);
    } else {
        openWindow(url);
    }
}

export { checkForUpdates, dismissUpdate, dismissUpdatePopup, updatePopupDownload, showUpdateNotice, syncUpdatePopup, syncLastUpdateCheck, openLatestRelease, downloadLatestApk };