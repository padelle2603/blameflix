// Entry point: wires the modules together, routes every user action through
// a single delegated listener and boots the application.
// Heavy modules are lazy-loaded via dynamic import().
import { App } from '@capacitor/app';
import { applyLanguage } from './i18n.js';
import { initDisclaimer, acceptDisclaimer } from './startup.js';
import { showHome, clearSearch, setFilter, setView, setSort, toggleKindOrder, toggleKindCollapse, toggleCatalogMenu, closeCatalogMenu } from './catalog.js';
import { handleSearch } from './search.js';
import { clearNewsHistory } from './news.js';
import { syncReleases } from './releases.js';
import { toggleWatchlist } from './watchlist.js';
import { skipTutorial } from './tutorial.js';
import { searchInput, inputSeason, detailView, settingsOverlay, docsOverlay, catalogMenuPanel } from './dom.js';
import { state } from './state.js';
import './ptr.js';

// --- Lazy loaders for heavy modules ---

// Generic single-flight importer: caches the resolved module so repeated
// calls don't re-fetch the same chunk. The loader must contain a literal
// dynamic import() (e.g. () => import('./details.js')) so esbuild can still
// split those modules into separate chunks instead of inlining them.
function createLazyLoader(loader) {
    let modulePromise = null;
    return () => {
        if (!modulePromise) modulePromise = loader();
        return modulePromise;
    };
}

const loadDetailsModule = createLazyLoader(() => import('./details.js'));
const loadPlayerModule = createLazyLoader(() => import('./player.js'));
const loadSettingsModule = createLazyLoader(() => import('./settings.js'));
const loadUpdatesModule = createLazyLoader(() => import('./updates.js'));
const loadBackupModule = createLazyLoader(() => import('./backup.js'));
const loadResolverModule = createLazyLoader(() => import('./resolver.js'));
const loadNetworkModule = createLazyLoader(() => import('./networkSchedule.js'));
const loadCloudModule = createLazyLoader(() => import('./cloudSync.js'));

// --- Public handlers with lazy loading ---

async function markAllAiredWatched() {
    const m = await loadDetailsModule();
    return m.markAllAiredWatched();
}

async function markSeasonWatched() {
    const m = await loadDetailsModule();
    return m.markSeasonWatched();
}

async function cloudToggle() {
    const m = await loadSettingsModule();
    return m.cloudToggle();
}

async function onSeasonChange(value) {
    const m = await loadDetailsModule();
    return m.onSeasonChange(value);
}

async function openPlayer(resume = false) {
    const m = await loadPlayerModule();
    return m.openPlayer(resume);
}

async function shareTitle() {
    const m = await loadDetailsModule();
    return m.shareTitle();
}

async function openTmdbPage() {
    const m = await loadDetailsModule();
    return m.openTmdbPage();
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

async function cloudPush() {
    const m = await loadCloudModule();
    return m.pushCloud();
}

async function cloudPull() {
    const m = await loadCloudModule();
    return m.pullCloud();
}

async function cloudGenerateToken() {
    const m = await loadSettingsModule();
    return m.cloudGenerateToken();
}

// --- ANDROID BACK BUTTON ---
// On a native shell the default back action would leave the app from any
// screen, so every press closes the topmost layer instead: dialogs and
// panels first, then the detail view, then an active search, and finally
// the app itself (sent to background, like a Home press).
function registerAndroidBack() {
    if (!window.Capacitor?.isNativePlatform?.()) return;
    App.addListener('backButton', async () => {
        if (!document.getElementById('disclaimer-overlay').hidden) return;
        if (!document.getElementById('tutorial-overlay').hidden) { skipTutorial(); return; }
        if (!document.getElementById('update-popup').hidden) { await dismissUpdatePopup(); return; }
        if (!settingsOverlay.hidden) { await closeSettings(); return; }
        if (!docsOverlay.hidden) { await closeDocs(); return; }
        if (!catalogMenuPanel.hidden) { closeCatalogMenu(); return; }
        const networkPanel = document.getElementById('network-panel');
        if (!networkPanel.hidden) { networkPanel.hidden = true; return; }
        const resolverPanel = document.getElementById('resolver-override-panel');
        if (!resolverPanel.hidden) { resolverPanel.hidden = true; return; }
        if (!detailView.hidden) { showHome(); return; }
        if (state.searching || (searchInput.value || '').trim()) { clearSearch(); return; }
        await App.minimizeApp();
    });
}

// --- ACTION DISPATCH ---
// All user actions that used to live as inline HTML attributes are routed
// through a single delegated listener: elements carry a data-action name
// and the matching handler is looked up here (lazy modules load on demand).
// Keeping the handlers off window() removes global-scope pollution, enables
// dead-code elimination and keeps a strict CSP reachable.
const actions = {
    'show-home': showHome,
    'clear-search': clearSearch,
    'set-filter': el => setFilter(el.dataset.type),
    'set-view': el => setView(el.dataset.view),
    'set-sort': el => setSort(el.dataset.sort),
    'toggle-kind-order': toggleKindOrder,
    'toggle-kind-collapse': el => toggleKindCollapse(el.dataset.kind),
    'toggle-catalog-menu': toggleCatalogMenu,
    'sync-releases': () => syncReleases(),
    'cloud-push': () => cloudPush(),
    'cloud-pull': () => cloudPull(),
    'cloud-generate-token': () => cloudGenerateToken(),
    'toggle-watchlist': () => toggleWatchlist(),
    'clear-news-history': () => clearNewsHistory(),
    'open-settings': el => openSettings(el),
    'close-settings': () => closeSettings(),
    'open-docs': el => openDocs(el),
    'close-docs': () => closeDocs(),
    'save-settings': () => saveSettings(),
    'send-test-notification': () => sendTestNotification(),
    'create-backup': () => createBackup(),
    'restore-backup': () => restoreBackup(),
    'delete-all-data': () => deleteAllData(),
    'check-for-updates': () => checkForUpdates(true),
    'open-latest-release': () => openLatestRelease(),
    'download-latest-apk': () => downloadLatestApk(),
    'dismiss-update': () => dismissUpdate(),
    'update-popup-download': () => updatePopupDownload(),
    'dismiss-update-popup': () => dismissUpdatePopup(),
    'open-player': el => openPlayer(el.dataset.resume === 'true'),
    'share-title': () => shareTitle(),
    'open-tmdb-page': () => openTmdbPage(),
    'mark-all-aired-watched': () => markAllAiredWatched(),
    'mark-season-watched': () => markSeasonWatched(),
    'toggle-resolver-override': () => toggleResolverOverride(),
    'save-resolver-override': () => saveResolverOverride(),
    'clear-resolver-override': () => clearResolverOverride(),
    'toggle-network-source': () => toggleNetworkSource(),
    'save-network-source': () => saveNetworkSource(),
    'clear-network-source': () => clearNetworkSource(),
    'accept-disclaimer': () => acceptDisclaimer()
};

document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (!el || !el.dataset.action) return;
    const handler = actions[el.dataset.action];
    if (handler) handler(el);
});

// Non-click interactions that were previously inline attributes.
document.addEventListener('keyup', e => {
    if (e.target === searchInput) handleSearch(e.target.value);
});

document.addEventListener('change', e => {
    if (e.target === inputSeason) onSeasonChange(e.target.value);
    if (e.target.id === 'cloud-enabled') cloudToggle();
});

applyLanguage();
initDisclaimer();
registerAndroidBack();