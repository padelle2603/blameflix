import { state, DEFAULT_NOTIFY_SETTINGS, sanitizeAutoSyncHours, persistNotifySettings } from './state.js';
import {
    settingsOverlay, settingsKeyInput, settingsResolverMovieInput, settingsResolverTvInput,
    settingsLangInput, settingsBrowserInput, settingsStatus, keyNotice, resolverNotice,
    settingsNotifyEnabled, settingsNotifyTv, settingsNotifyMovies, settingsNotifyInterval,
    docsOverlay
} from './dom.js';
import { startAutoSyncTimer } from './releases.js';
import { setLanguage, t } from './i18n.js';
import { sourceTemplateError } from './resolver.js';
import { ensureNotifyPermission, notify } from './notifications.js';
import { isNativeRuntime } from './env.js';
import { syncLastUpdateCheck } from './updates.js';
import { LANGS } from './langs.js';
import { startTutorial } from './tutorial.js';
import { encryptAPIKey } from './crypto.js';
import { getBrowserMode, setBrowserMode, BROWSER_MODE } from './browser.js';

function syncNotifySettingsInputs() {
    settingsNotifyEnabled.checked = state.notifySettings.enabled;
    settingsNotifyTv.checked = state.notifySettings.tv !== false;
    settingsNotifyMovies.checked = state.notifySettings.movies !== false;
    settingsNotifyInterval.value = sanitizeAutoSyncHours(state.notifySettings.autoSyncHours);
}

// Builds the language selector from the supported language registry.
function buildLangSelect() {
    settingsLangInput.innerHTML = '';
    for (const l of LANGS) {
        const opt = document.createElement('option');
        opt.value = l.code;
        opt.textContent = l.label;
        if (l.code === state.lang) opt.selected = true;
        settingsLangInput.appendChild(opt);
    }
}
buildLangSelect();

// "Replay tutorial" button re-opens the guided tour.
const replayTutorialBtn = document.getElementById('btn-tutorial-replay');
if (replayTutorialBtn) replayTutorialBtn.addEventListener('click', startTutorial);

// Shows the in-app notice when the TMDB key is missing.
function syncApiKeyNotice() {
    keyNotice.hidden = Boolean(state.apiKey);
}

// Shows the in-app notice when the player source is missing.
function syncResolverNotice() {
    resolverNotice.hidden = Boolean(state.resolver.movie && state.resolver.tv);
}

// --- SETTINGS TABS ---

const settingsTabPages = ['settings-tab-api', 'settings-tab-notify', 'settings-tab-prefs', 'settings-tab-data', 'settings-tab-updates', 'settings-tab-help'];

function switchSettingsTab(tabId) {
    const buttons = document.querySelectorAll('.settings-tab');
    buttons.forEach(btn => {
        const active = btn.dataset.tab === tabId;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-selected', String(active));
    });
    settingsTabPages.forEach(id => {
        const page = document.getElementById(id);
        if (page) page.hidden = id !== tabId;
    });
    if (tabId === 'settings-tab-updates') syncLastUpdateCheck();
}

document.querySelectorAll('.settings-tab').forEach(btn => {
    btn.addEventListener('click', () => switchSettingsTab(btn.dataset.tab));
});

function openSettings() {
    settingsKeyInput.value = state.apiKey;
    settingsResolverMovieInput.value = state.resolver.movie || '';
    settingsResolverTvInput.value = state.resolver.tv || '';
    settingsLangInput.value = state.lang;
    settingsBrowserInput.value = getBrowserMode();
    settingsStatus.hidden = true;
    settingsStatus.classList.remove('is-error');
    syncNotifySettingsInputs();
    const versionEl = document.getElementById('settings-version');
    if (versionEl) versionEl.innerText = `${t('settings.version')} ${state.appVersion}`;
    const webHint = document.getElementById('settings-updates-web-hint');
    const checkBtn = document.getElementById('settings-update-check');
    if (webHint) webHint.hidden = isNativeRuntime();
    if (checkBtn) checkBtn.hidden = !isNativeRuntime();
    settingsOverlay.hidden = false;
    switchSettingsTab('settings-tab-api');
    settingsKeyInput.focus();
}

function closeSettings() {
    settingsOverlay.hidden = true;
}

// --- DOCUMENTATION ---

function openDocs() {
    settingsOverlay.hidden = true;
    docsOverlay.hidden = false;
}

function closeDocs() {
    docsOverlay.hidden = true;
}

docsOverlay.addEventListener('click', e => {
    if (e.target === docsOverlay) closeDocs();
});

async function saveSettings() {
    const key = settingsKeyInput.value.trim();

    const movieTemplate = settingsResolverMovieInput.value.trim();
    const tvTemplate = settingsResolverTvInput.value.trim();
    const movieErr = sourceTemplateError(movieTemplate);
    const tvErr = sourceTemplateError(tvTemplate);
    if (movieErr || tvErr) {
        settingsStatus.classList.add('is-error');
        settingsStatus.innerText = movieErr || tvErr;
        settingsStatus.hidden = false;
        setTimeout(() => { settingsStatus.hidden = true; }, 4000);
        return;
    }

    state.apiKey = key;
    if (key) {
        const encrypted = await encryptAPIKey(key);
        localStorage.setItem('myTMDbApiKey', encrypted);
    } else {
        localStorage.removeItem('myTMDbApiKey');
    }

    state.resolver = {
        movie: movieTemplate,
        tv: tvTemplate
    };
    localStorage.setItem('myResolver', JSON.stringify(state.resolver));

    state.notifySettings = {
        enabled: settingsNotifyEnabled.checked,
        tv: settingsNotifyTv.checked,
        movies: settingsNotifyMovies.checked,
        autoSyncHours: sanitizeAutoSyncHours(Number(settingsNotifyInterval.value))
    };
    persistNotifySettings();
    startAutoSyncTimer();
    setBrowserMode(settingsBrowserInput.value);

    syncApiKeyNotice();
    syncResolverNotice();
    setLanguage(settingsLangInput.value, true);
    settingsStatus.classList.remove('is-error');
    settingsStatus.innerText = key ? t('msg.saved') : t('msg.keyRemoved');
    settingsStatus.hidden = false;
    setTimeout(() => { settingsStatus.hidden = true; }, 2500);
}

// Sends a test notification to verify that the channel works.
async function sendTestNotification() {
    const status = document.getElementById('notify-status');
    status.classList.remove('is-error');
    status.innerText = t('msg.requestingPerms');
    status.hidden = false;
    const granted = await ensureNotifyPermission();
    if (!granted) {
        status.classList.add('is-error');
        status.innerText = t('msg.permsDenied');
        return;
    }
    const ok = await notify('BlameFlix', t('msg.testNotifyBody'));
    status.classList.toggle('is-error', !ok);
    status.innerText = ok ? t('msg.testNotifySent') : t('msg.testNotifyUnavailable');
    clearTimeout(sendTestNotification._t);
    sendTestNotification._t = setTimeout(() => { status.hidden = true; }, 3500);
}

settingsOverlay.addEventListener('click', e => {
    if (e.target === settingsOverlay) closeSettings();
});

export { syncNotifySettingsInputs, syncApiKeyNotice, syncResolverNotice, switchSettingsTab, openSettings, closeSettings, openDocs, closeDocs, saveSettings, sendTestNotification };