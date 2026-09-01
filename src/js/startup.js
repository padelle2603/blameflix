import { state } from './state.js';
import { syncApiKeyNotice, syncResolverNotice } from './settings.js';
import { syncTools, showHome } from './catalog.js';
import { hydrateWatchlistGrid } from './backup.js';
import { checkReleases, startAutoSyncTimer } from './releases.js';
import { checkForUpdates } from './updates.js';
import { resolveAppVersion, isNativeRuntime } from './env.js';
import { t } from './i18n.js';
import { NOTIFY_ACTION_MARK_WATCHED } from './notifications.js';
import { toggleEpisodeWatched } from './watched.js';
import { toIntOr, sanitizeMediaType } from './utils.js';
import { showDetails, refreshUnwatchedCount } from './details.js';
import { refreshHomeUnwatchedCount } from './counter.js';
import { showToast } from './toast.js';
import { maybeStartTutorial } from './tutorial.js';
import { decryptAPIKey, isEncryptedKey } from './crypto.js';
import { trapFocus } from './focusTrap.js';

// Real app startup: executed only after the disclaimer is accepted on the
// very first use.
function startApp() {
    if (isEncryptedKey(state.apiKey)) {
        decryptAPIKey(state.apiKey).then(plain => {
            state.apiKey = plain;
            localStorage.setItem('myTMDbApiKey', plain);
            syncApiKeyNotice();
        }).catch(() => {
            state.apiKey = '';
            syncApiKeyNotice();
        });
    } else {
        syncApiKeyNotice();
    }
    syncResolverNotice();
    syncTools();
    showHome();
    hydrateWatchlistGrid().then(() => checkReleases(false));
    startAutoSyncTimer();
    maybeStartTutorial();
}

// Runs the version check once per session, a moment after launch, so it
// does not interfere with startup: on the first launch it happens while
// the disclaimer is still on screen. It first resolves the real installed
// version, so the comparison against GitHub is always accurate. Skipped
// in the plain web build, which has no real installed version.
let startupUpdateChecked = false;
async function scheduleStartupUpdateCheck() {
    if (startupUpdateChecked) return;
    startupUpdateChecked = true;
    await resolveAppVersion();
    if (!isNativeRuntime()) return;
    setTimeout(() => checkForUpdates(false), 800);
}

// --- STARTUP DISCLAIMER (first use) ---
// The program only starts after acceptance; the button enables after
// 10 seconds. Acceptance is stored locally and is not requested again on
// subsequent openings.
// Best-effort: asks the browser/WebView not to purge the origin storage
// automatically, so the flag can survive restarts. If the system rejects
// it, localStorage can still be lost (see PRIVACY).
function tryPersistStorage() {
    try {
        if (navigator.storage && typeof navigator.storage.persist === 'function') {
            navigator.storage.persist().catch(() => {});
        }
    } catch (err) { /* storage unavailable: ignore */ }
}

function initDisclaimer() {
    tryPersistStorage();
    // Version check: starts right away, at every launch. On the very first
    // launch it runs together with the disclaimer popup.
    scheduleStartupUpdateCheck();
    if (localStorage.getItem('myDisclaimerAccepted') === '1') {
        startApp();
        return;
    }
    const overlay = document.getElementById('disclaimer-overlay');
    const acceptBtn = document.getElementById('disclaimer-accept');
    const statusEl = document.getElementById('disclaimer-status');
    overlay.hidden = false;
    overlay._trap = trapFocus(overlay, {});

    let remaining = 10;
    statusEl.innerText = t('msg.acceptableIn', { n: remaining });
    acceptBtn.disabled = true;

    const timer = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
            clearInterval(timer);
            acceptBtn.disabled = false;
            statusEl.innerText = t('msg.acceptToStart');
        } else {
            statusEl.innerText = t('msg.acceptableIn', { n: remaining });
        }
    }, 1000);
}

function acceptDisclaimer() {
    localStorage.setItem('myDisclaimerAccepted', '1');
    tryPersistStorage();
    const overlay = document.getElementById('disclaimer-overlay');
    overlay.hidden = true;
    if (overlay._trap) {
        overlay._trap.close();
        overlay._trap = null;
    }
    startApp();
}

// On a system notification interaction: a plain tap opens the title page
// (with season/episode for series) via the notification payload, while the
// "mark as watched" action marks the episode without opening the view.
// Note: localNotificationActionPerformed fires on user interaction only —
// 'localNotificationReceived' would navigate on mere display.
if (window.Capacitor?.Plugins?.LocalNotifications?.addListener) {
    window.Capacitor.Plugins.LocalNotifications.addListener('localNotificationActionPerformed', action => {
        const notif = action && action.notification;
        const d = notif && notif.extra;
        if (!d || !d.id) return;
        if (action.actionId === NOTIFY_ACTION_MARK_WATCHED && d.media_type === 'tv') {
            toggleEpisodeWatched(Number(d.id), toIntOr(d.season, 1), toIntOr(d.episode, 1), true);
            refreshUnwatchedCount();
            refreshHomeUnwatchedCount();
            showToast(t('toast.newReleases'), t('msg.markedWatchedFromNotification'));
            const notificationId = Number(notif.id);
            if (Number.isInteger(notificationId)) {
                window.Capacitor.Plugins.LocalNotifications.cancel({ notifications: [{ id: notificationId }] }).catch(() => {});
            }
            return;
        }
        showDetails(Number(d.id), sanitizeMediaType(d.media_type, 'movie'), d);
    });
}

// Checks releases on every return to the foreground: OSes may suspend
// timers while the app is in background, and new episodes must be noticed
// as soon as TMDB publishes them. The details cache expires after 30
// minutes, so repeated checks still see fresh data without hammering the
// API; the mutex keeps overlapping checks away.
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.apiKey) {
        checkReleases(false);
    }
});

export { initDisclaimer, acceptDisclaimer };