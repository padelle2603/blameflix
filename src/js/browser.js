import { isNativeRuntime } from './env.js';

const BROWSER_PREF_KEY = 'myBrowserPref';

export const BROWSER_MODE = {
    DEFAULT: 'default',   // Capacitor Browser (Chrome Custom Tabs)
    ASK: 'ask'            // Ask every time — Android Intent chooser
};

export function getBrowserMode() {
    return localStorage.getItem(BROWSER_PREF_KEY) || BROWSER_MODE.DEFAULT;
}

export function setBrowserMode(mode) {
    if (Object.values(BROWSER_MODE).includes(mode)) {
        localStorage.setItem(BROWSER_PREF_KEY, mode);
    }
}

// Opens with Capacitor Browser (Chrome Custom Tabs on Android)
async function openInCapacitor(url) {
    if (window.Capacitor?.Plugins?.Browser) {
        await window.Capacitor.Plugins.Browser.open({ url });
    } else {
        window.open(url, '_blank', 'noopener');
    }
}

// Opens with the system browser via Intent chooser (Android)
async function openInSystem(url) {
    if (isNativeRuntime() && window.Capacitor?.Plugins?.BrowserChooser) {
        await window.Capacitor.Plugins.BrowserChooser.open({ url });
    } else if (isNativeRuntime()) {
        const intentUrl = 'intent://' + url.replace(/^https?:\/\//, '')
            + '#Intent;scheme=https;action=android.intent.action.VIEW;'
            + 'S.browser_fallback_url=' + encodeURIComponent(url) + ';end';
        window.location.href = intentUrl;
    } else {
        window.open(url, '_blank', 'noopener');
    }
}

// Opens the link according to the saved preference
export async function openLink(url) {
    if (getBrowserMode() === BROWSER_MODE.ASK) {
        return openInSystem(url);
    }
    return openInCapacitor(url);
}
