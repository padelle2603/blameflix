import { state, sanitizeAutoSyncHours, persistNotifySettings, persistCloudSync } from './state.js';
import {
    settingsOverlay, settingsTitle, settingsKeyInput, settingsResolverMovieInput, settingsResolverTvInput,
    settingsLangInput, settingsBrowserInput, settingsStatus, keyNotice, resolverNotice,
    settingsNotifyEnabled, settingsNotifyTv, settingsNotifyMovies, settingsNotifyInterval,
    cloudEnabled, cloudUrl, cloudAnon, cloudToken, cloudStatus,
    docsOverlay
} from './dom.js';
import { startAutoSyncTimer } from './releases.js';
import { setLanguage, t } from './i18n.js';
import { sourceTemplateError } from './sourceUtils.js';
import { ensureNotifyPermission, notify } from './notifications.js';
import { isNativeRuntime } from './env.js';
import { syncLastUpdateCheck, syncChangelog } from './updates.js';
import { LANGS } from './langs.js';
import { startTutorial } from './tutorial.js';
import { encryptAPIKey } from './crypto.js';
import { getBrowserMode, setBrowserMode } from './browser.js';
import { trapFocus } from './focusTrap.js';
import { setCloudToken, regenerateCloudToken } from './cloudSync.js';
import { syncCloudQuickbar } from './catalog.js';
import { showToast } from './toast.js';
import { prefersReduced, wait, OVERLAY_DUR, OVERLAY_PANEL_DUR, TAB_DUR } from './motion.js';

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

// --- CLOUD SYNC SETTINGS ---

// Persists the current cloud-sync fields from the DOM into state + localStorage.
function persistCloudInputs() {
    state.cloudSync.url = cloudUrl.value.trim();
    state.cloudSync.anonKey = cloudAnon.value.trim();
    state.cloudSync.enabled = cloudEnabled.checked;
    persistCloudSync();
}

// Reflects the persisted cloud config into the settings inputs.
function syncCloudInputs() {
    const cs = state.cloudSync;
    cloudEnabled.checked = cs.enabled;
    cloudUrl.value = cs.url || '';
    cloudAnon.value = cs.anonKey || '';
    cloudToken.value = cs.tokenEnc ? '••••••••' : '';
}

function showCloudStatus(msg, isError = false) {
    cloudStatus.classList.toggle('is-error', isError);
    cloudStatus.innerText = msg;
    cloudStatus.hidden = false;
    clearTimeout(showCloudStatus._t);
    showCloudStatus._t = setTimeout(() => { cloudStatus.hidden = true; }, 3500);
}

function cloudToggle() {
    persistCloudInputs();
    syncCloudQuickbar();
    showCloudStatus(t('msg.cloudConfigSaved'));
}

// Shows a plaintext token briefly, then masks it back to dots.
function flashCloudToken(value) {
    cloudToken.value = value;
    clearTimeout(flashCloudToken._t);
    flashCloudToken._t = setTimeout(() => { cloudToken.value = state.cloudSync.tokenEnc ? '••••••••' : ''; }, 10000);
}

async function cloudGenerateToken() {
    const token = await regenerateCloudToken();
    flashCloudToken(token);
    showCloudStatus(t('msg.cloudTokenGenerated'));
    showToast('Cloud Sync', t('msg.cloudTokenCopy'), 4000);
}

// Saves a user-pasted token into the encrypted cloud config.
async function cloudTokenSave() {
    const value = cloudToken.value.trim();
    if (!value) return;
    await setCloudToken(value);
    showCloudStatus(t('msg.cloudConfigSaved'));
    flashCloudToken(value);
}

// --- SETTINGS TABS ---

const settingsTabPages = ['settings-tab-api', 'settings-tab-notify', 'settings-tab-prefs', 'settings-tab-data', 'settings-tab-cloud', 'settings-tab-updates', 'settings-tab-help'];

async function switchSettingsTab(tabId, { animate = true } = {}) {
    const buttons = document.querySelectorAll('.settings-tab');
    buttons.forEach(btn => {
        const active = btn.dataset.tab === tabId;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-selected', String(active));
        btn.setAttribute('tabindex', active ? '0' : '-1');
    });
    const currentId = settingsTabPages.find(id => {
        const el = document.getElementById(id);
        return el && !el.hidden;
    });
    if (!animate || prefersReduced() || !currentId || currentId === tabId) {
        settingsTabPages.forEach(id => {
            const page = document.getElementById(id);
            if (page) {
                page.classList.remove('is-exiting', 'is-entering');
                page.hidden = id !== tabId;
            }
        });
        if (tabId === 'settings-tab-updates') { syncLastUpdateCheck(); syncChangelog(); }
        return;
    }
    const oldEl = document.getElementById(currentId);
    const newEl = document.getElementById(tabId);
    if (!oldEl || !newEl) {
        settingsTabPages.forEach(id => {
            const page = document.getElementById(id);
            if (page) page.hidden = id !== tabId;
        });
        if (tabId === 'settings-tab-updates') { syncLastUpdateCheck(); syncChangelog(); }
        return;
    }
    oldEl.classList.add('is-exiting');
    await wait(TAB_DUR);
    oldEl.hidden = true;
    oldEl.classList.remove('is-exiting');
    newEl.classList.add('is-entering');
    newEl.hidden = false;
    void newEl.offsetWidth;
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    newEl.classList.remove('is-entering');
    await wait(TAB_DUR);
    if (tabId === 'settings-tab-updates') { syncLastUpdateCheck(); syncChangelog(); }
}

document.querySelectorAll('.settings-tab').forEach(btn => {
    btn.addEventListener('click', () => switchSettingsTab(btn.dataset.tab));
});

async function openSettings(trigger = null) {
    settingsKeyInput.value = state.apiKey;
    settingsResolverMovieInput.value = state.resolver.movie || '';
    settingsResolverTvInput.value = state.resolver.tv || '';
    settingsLangInput.value = state.lang;
    settingsBrowserInput.value = getBrowserMode();
    settingsStatus.hidden = true;
    settingsStatus.classList.remove('is-error');
    syncNotifySettingsInputs();
    syncCloudInputs();
    const versionEl = document.getElementById('settings-version');
    if (versionEl) versionEl.innerText = `${t('settings.version')} ${state.appVersion}`;
    const webHint = document.getElementById('settings-updates-web-hint');
    const checkBtn = document.getElementById('settings-update-check');
    if (webHint) webHint.hidden = isNativeRuntime();
    if (checkBtn) checkBtn.hidden = !isNativeRuntime();
    if (prefersReduced()) {
        settingsOverlay.hidden = false;
        await switchSettingsTab('settings-tab-api', { animate: false });
        settingsOverlay._trap = trapFocus(settingsOverlay, { onEsc: closeSettings, restoreFocusTo: trigger });
        settingsTitle.focus();
        return;
    }
    settingsOverlay.hidden = false;
    settingsOverlay.classList.remove('is-visible');
    void settingsOverlay.offsetWidth;
    await switchSettingsTab('settings-tab-api', { animate: false });
    requestAnimationFrame(() => requestAnimationFrame(() => settingsOverlay.classList.add('is-visible')));
    await wait(OVERLAY_PANEL_DUR);
    settingsOverlay._trap = trapFocus(settingsOverlay, { onEsc: closeSettings, restoreFocusTo: trigger });
    settingsTitle.focus();
}

async function closeSettings() {
    if (prefersReduced() || settingsOverlay.hidden) {
        settingsOverlay.hidden = true;
        settingsOverlay.classList.remove('is-visible');
        if (settingsOverlay._trap) {
            settingsOverlay._trap.close();
            settingsOverlay._trap = null;
        }
        return;
    }
    settingsOverlay.classList.remove('is-visible');
    await wait(OVERLAY_DUR);
    settingsOverlay.hidden = true;
    if (settingsOverlay._trap) {
        settingsOverlay._trap.close();
        settingsOverlay._trap = null;
    }
}

// --- DOCUMENTATION ---

async function openDocs(trigger = null) {
    if (settingsOverlay._trap) {
        settingsOverlay._trap.close();
        settingsOverlay._trap = null;
    }
    settingsOverlay.hidden = true;
    settingsOverlay.classList.remove('is-visible');
    if (prefersReduced()) {
        docsOverlay.hidden = false;
        docsOverlay.classList.remove('is-visible');
        void docsOverlay.offsetWidth;
        docsOverlay.classList.add('is-visible');
        const firstFocusable = docsOverlay.querySelector('button, a, input');
        docsOverlay._trap = trapFocus(docsOverlay, { onEsc: closeDocs, restoreFocusTo: trigger });
        if (firstFocusable) firstFocusable.focus();
        return;
    }
    docsOverlay.hidden = false;
    docsOverlay.classList.remove('is-visible');
    void docsOverlay.offsetWidth;
    requestAnimationFrame(() => requestAnimationFrame(() => docsOverlay.classList.add('is-visible')));
    await wait(OVERLAY_DUR);
    const firstFocusable = docsOverlay.querySelector('button, a, input');
    docsOverlay._trap = trapFocus(docsOverlay, { onEsc: closeDocs, restoreFocusTo: trigger });
    if (firstFocusable) firstFocusable.focus();
}

async function closeDocs() {
    if (prefersReduced() || docsOverlay.hidden) {
        docsOverlay.hidden = true;
        docsOverlay.classList.remove('is-visible');
        if (docsOverlay._trap) {
            docsOverlay._trap.close();
            docsOverlay._trap = null;
        }
        return;
    }
    docsOverlay.classList.remove('is-visible');
    await wait(OVERLAY_DUR);
    docsOverlay.hidden = true;
    if (docsOverlay._trap) {
        docsOverlay._trap.close();
        docsOverlay._trap = null;
    }
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

// --- Inline validation for URL fields and API key ---
function setupInlineValidation() {
    const urlInputs = [settingsResolverMovieInput, settingsResolverTvInput];
    urlInputs.forEach(input => {
        input.addEventListener('input', () => {
            const val = input.value.trim();
            if (val && sourceTemplateError(val)) {
                input.classList.add('is-invalid');
            } else {
                input.classList.remove('is-invalid');
            }
        });
    });
    settingsKeyInput.addEventListener('input', () => {
        const val = settingsKeyInput.value.trim();
        if (val && !/^[a-f0-9]{32}$/i.test(val) && val.length > 5) {
            settingsKeyInput.classList.add('is-invalid');
        } else {
            settingsKeyInput.classList.remove('is-invalid');
        }
    });
}
setupInlineValidation();

// Toggle API key visibility
const toggleKeyBtn = document.getElementById('toggle-api-key-vis');
if (toggleKeyBtn) {
    toggleKeyBtn.addEventListener('click', () => {
        const isPassword = settingsKeyInput.type === 'password';
        settingsKeyInput.type = isPassword ? 'text' : 'password';
        toggleKeyBtn.textContent = isPassword ? '🔒' : '👁';
    });
}

cloudUrl.addEventListener('input', persistCloudInputs);
cloudAnon.addEventListener('input', persistCloudInputs);
cloudToken.addEventListener('change', cloudTokenSave);

export { syncNotifySettingsInputs, syncApiKeyNotice, syncResolverNotice, switchSettingsTab, openSettings, closeSettings, openDocs, closeDocs, saveSettings, sendTestNotification, syncCloudInputs, cloudToggle, cloudGenerateToken, cloudTokenSave };