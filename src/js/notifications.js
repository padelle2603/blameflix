import { t } from './i18n.js';
import { showDetails } from './details.js';

// Requests the system permission for notifications (Android / browser).
async function ensureNotifyPermission() {
    if (window.Capacitor?.Plugins?.LocalNotifications) {
        try {
            const perms = await window.Capacitor.Plugins.LocalNotifications.requestPermissions();
            return perms?.display === 'granted';
        } catch (err) {
            return false;
        }
    }
    if ('Notification' in window && window.Notification) {
        if (window.Notification.permission === 'granted') return true;
        if (window.Notification.permission === 'denied') return false;
        try {
            const result = await window.Notification.requestPermission();
            return result === 'granted';
        } catch (err) {
            return false;
        }
    }
    return false;
}

// Android action button on episode notifications ("mark as watched").
// The action id is referenced by localNotificationActionPerformed.
const NOTIFY_ACTION_TYPE = 'release-episode';
const NOTIFY_ACTION_MARK_WATCHED = 'mark-watched';

// Registers (or re-registers after a language switch) the localized action
// attached to episode notifications. No-op outside Android/Capacitor.
async function registerNotificationActions() {
    if (!window.Capacitor?.Plugins?.LocalNotifications?.registerActionTypes) return;
    try {
        await window.Capacitor.Plugins.LocalNotifications.registerActionTypes({
            types: [{
                id: NOTIFY_ACTION_TYPE,
                actions: [{
                    id: NOTIFY_ACTION_MARK_WATCHED,
                    title: `✓ ${t('episode.markWatched')}`
                }]
            }]
        });
    } catch (err) { /* cosmetic feature: never block notifications on it */ }
}

// Sends a system notification on the right channel (Android, Electron, web).
// Returns false if no system channel is available.
// data (optional): { media_type, id, season?, episode? } to open the page on click
// and to power the "mark as watched" action on Android.
async function notify(title, body, data) {
    if (window.Capacitor?.Plugins?.LocalNotifications) {
        try {
            const notification = {
                id: Date.now() % 2147483647,
                title,
                body,
                extra: data || {}
            };
            // Episode notifications get the quick "mark watched" action.
            if (data && data.media_type === 'tv' && data.season !== undefined) {
                notification.actionTypeId = NOTIFY_ACTION_TYPE;
            }
            await window.Capacitor.Plugins.LocalNotifications.schedule({ notifications: [notification] });
            return true;
        } catch (err) {
            return false;
        }
    }
    if (window.blameflixNotify) {
        try {
            return await window.blameflixNotify.notify(title, body);
        } catch (err) {
            return false;
        }
    }
    if ('Notification' in window && window.Notification && window.Notification.permission === 'granted') {
        try {
            const n = new window.Notification(title, { body });
            if (data && data.id) {
                n.onclick = () => {
                    window.focus();
                    showDetails(data.id, data.media_type, data);
                    n.close();
                };
            }
            return true;
        } catch (err) {
            return false;
        }
    }
    return false;
}

export { ensureNotifyPermission, NOTIFY_ACTION_TYPE, NOTIFY_ACTION_MARK_WATCHED, registerNotificationActions, notify };