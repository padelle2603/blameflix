// Entry point: wires the modules together, exposes the handlers used by the
// inline HTML attributes and boots the application.
// Heavy modules are lazy-loaded via dynamic import().
import { applyLanguage } from './i18n.js';
import { initDisclaimer, acceptDisclaimer } from './startup.js';
import { showHome, clearSearch, setFilter, setView, toggleKindOrder, toggleCatalogMenu } from './catalog.js';
import { handleSearch } from './search.js';
import { clearNewsHistory } from './news.js';
import { syncReleases } from './releases.js';
import { toggleWatchlist } from './watchlist.js';
import './ptr.js';

// --- Lazy loaders for heavy modules ---

let _detailsModule = null;
async function loadDetailsModule() {
    if (!_detailsModule) {
        _detailsModule = await import('./details.js');
    }
    return _detailsModule;
}

let _playerModule = null;
async function loadPlayerModule() {
    if (!_playerModule) {
        _playerModule = await import('./player.js');
    }
    return _playerModule;
}

let _settingsModule = null;
async function loadSettingsModule() {
    if (!_settingsModule) {
        _settingsModule = await import('./settings.js');
    }
    return _settingsModule;
}

let _updatesModule = null;
async function loadUpdatesModule() {
    if (!_updatesModule) {
        _updatesModule = await import('./updates.js');
    }
    return _updatesModule;
}

let _backupModule = null;
async function loadBackupModule() {
    if (!_backupModule) {
        _backupModule = await import('./backup.js');
    }
    return _backupModule;
}

let _resolverModule = null;
async function loadResolverModule() {
    if (!_resolverModule) {
        _resolverModule = await import('./resolver.js');
    }
    return _resolverModule;
}

let _networkModule = null;
async function loadNetworkModule() {
    if (!_networkModule) {
        _networkModule = await import('./networkSchedule.js');
    }
    return _networkModule;
}

// --- Public handlers with lazy loading ---

async function markAllAiredWatched() {
    const m = await loadDetailsModule();
    return m.markAllAiredWatched();
}

async function markSeasonWatched() {
    const m = await loadDetailsModule();
    return m.markSeasonWatched();
}

async function onSeasonChange(value) {
    const m = await loadDetailsModule();
    return m.onSeasonChange(value);
}

async function openPlayer(resume = false) {
    const m = await loadPlayerModule();
    return m.openPlayer(resume);
}

async function openSettings() {
    const m = await loadSettingsModule();
    return m.openSettings();
}

async function closeSettings() {
    const m = await loadSettingsModule();
    return m.closeSettings();
}

async function saveSettings() {
    const m = await loadSettingsModule();
    return m.saveSettings();
}

async function sendTestNotification() {
    const m = await loadSettingsModule();
    return m.sendTestNotification();
}

async function openDocs() {
    const m = await loadSettingsModule();
    return m.openDocs();
}

async function closeDocs() {
    const m = await loadSettingsModule();
    return m.closeDocs();
}

async function checkForUpdates(manual = false) {
    const m = await loadUpdatesModule();
    return m.checkForUpdates(manual);
}

async function dismissUpdate() {
    const m = await loadUpdatesModule();
    return m.dismissUpdate();
}

async function dismissUpdatePopup() {
    const m = await loadUpdatesModule();
    return m.dismissUpdatePopup();
}

async function updatePopupDownload() {
    const m = await loadUpdatesModule();
    return m.updatePopupDownload();
}

async function openLatestRelease() {
    const m = await loadUpdatesModule();
    return m.openLatestRelease();
}

async function downloadLatestApk() {
    const m = await loadUpdatesModule();
    return m.downloadLatestApk();
}

async function createBackup() {
    const m = await loadBackupModule();
    return m.createBackup();
}

async function restoreBackup() {
    const m = await loadBackupModule();
    return m.restoreBackup();
}

async function deleteAllData() {
    const m = await loadBackupModule();
    return m.deleteAllData();
}

async function toggleResolverOverride() {
    const m = await loadResolverModule();
    return m.toggleResolverOverride();
}

async function saveResolverOverride() {
    const m = await loadResolverModule();
    return m.saveResolverOverride();
}

async function clearResolverOverride() {
    const m = await loadResolverModule();
    return m.clearResolverOverride();
}

async function toggleNetworkSource() {
    const m = await loadNetworkModule();
    return m.toggleNetworkSource();
}

async function saveNetworkSource() {
    const m = await loadNetworkModule();
    return m.saveNetworkSource();
}

async function clearNetworkSource() {
    const m = await loadNetworkModule();
    return m.clearNetworkSource();
}

Object.assign(window, {
    showHome,
    openSettings,
    openLatestRelease,
    downloadLatestApk,
    dismissUpdate,
    updatePopupDownload,
    dismissUpdatePopup,
    clearSearch,
    handleSearch,
    clearNewsHistory,
    setFilter,
    setView,
    toggleKindOrder,
    toggleCatalogMenu,
    syncReleases,
    markAllAiredWatched,
    openPlayer,
    toggleWatchlist,
    toggleResolverOverride,
    saveResolverOverride,
    clearResolverOverride,
    toggleNetworkSource,
    saveNetworkSource,
    clearNetworkSource,
    onSeasonChange,
    markSeasonWatched,
    closeSettings,
    openDocs,
    closeDocs,
    createBackup,
    restoreBackup,
    deleteAllData,
    checkForUpdates,
    saveSettings,
    sendTestNotification,
    acceptDisclaimer
});

applyLanguage();
initDisclaimer();