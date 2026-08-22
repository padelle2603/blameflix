// Entry point: wires the modules together, exposes the handlers used by the
// inline HTML attributes and boots the application.
import { applyLanguage } from './i18n.js';
import { initDisclaimer, acceptDisclaimer } from './startup.js';
import { showHome, clearSearch, setFilter, setView, toggleKindOrder, toggleCatalogMenu } from './catalog.js';
import { handleSearch } from './search.js';
import { clearNewsHistory } from './news.js';
import { syncReleases } from './releases.js';
import { markAllAiredWatched, markSeasonWatched, onSeasonChange } from './details.js';
import { openPlayer } from './player.js';
import { toggleWatchlist } from './watchlist.js';
import { toggleResolverOverride, saveResolverOverride, clearResolverOverride } from './resolver.js';
import { openSettings, closeSettings, saveSettings, sendTestNotification, openDocs, closeDocs } from './settings.js';
import { checkForUpdates, dismissUpdate, dismissUpdatePopup, updatePopupDownload, openLatestRelease, downloadLatestApk } from './updates.js';
import { createBackup, restoreBackup } from './backup.js';
import './ptr.js';

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
    onSeasonChange,
    markSeasonWatched,
    closeSettings,
    openDocs,
    closeDocs,
    createBackup,
    restoreBackup,
    checkForUpdates,
    saveSettings,
    sendTestNotification,
    acceptDisclaimer
});

applyLanguage();
initDisclaimer();
