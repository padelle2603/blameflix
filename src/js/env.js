import { state } from './state.js';

export const GITHUB_REPO = 'padelle2603/blameflix';
export const GITHUB_LATEST_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
export const UPDATE_CHECK_STORAGE = 'myUpdateCheck'; // { lastCheck, lastTag, dismissedTag }
export const BASE_URL = 'https://api.themoviedb.org/3';
export const IMG_BASE = 'https://image.tmdb.org/t/p/w500';
export const IMG_STILL = 'https://image.tmdb.org/t/p/w300';
export const IMG_BACKDROP = 'https://image.tmdb.org/t/p/w1280';
export const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300"><rect width="100%" height="100%" fill="#1F1A15"/><rect x="0" y="0" width="100%" height="100%" fill="none" stroke="#F3EBD9" stroke-width="4"/><text x="50%" y="50%" fill="#A99A85" font-size="15" font-family="Arial" text-anchor="middle" dominant-baseline="middle">No poster</text></svg>'
);
export const EPISODE_PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="169"><rect width="100%" height="100%" fill="#1F1A15"/><rect x="0" y="0" width="100%" height="100%" fill="none" stroke="#F3EBD9" stroke-width="4"/><text x="50%" y="50%" fill="#A99A85" font-size="15" font-family="Arial" text-anchor="middle" dominant-baseline="middle">No still</text></svg>'
);

// Resolves the real installed version from the native wrapper when
// available: Electron exposes it via the preload bridge, Android via the
// Capacitor App plugin (versionName). Falls back to the value injected at
// build time for the plain web build.
async function resolveAppVersion() {
    try {
        if (window.blameflixAppInfo && typeof window.blameflixAppInfo.getVersion === 'function') {
            const v = await window.blameflixAppInfo.getVersion();
            if (v) {
                state.appVersion = String(v);
                return state.appVersion;
            }
        } else if (window.Capacitor?.Plugins?.App && typeof window.Capacitor.Plugins.App.getInfo === 'function') {
            const info = await window.Capacitor.Plugins.App.getInfo();
            if (info && info.version) {
                state.appVersion = String(info.version);
                return state.appVersion;
            }
        }
    } catch (err) { /* native lookup unavailable: keep the injected/placeholder version */ }
    return state.appVersion;
}

// True when running inside a packaged app (Android WebView via Capacitor
// or desktop Electron). The plain web build is just the source preview
// and has no real installed version to compare against GitHub releases.
function isNativeRuntime() {
    return Boolean(
        (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) ||
        window.blameflixAppInfo
    );
}

export { resolveAppVersion, isNativeRuntime };
