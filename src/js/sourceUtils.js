import { t } from './i18n.js';

// Peer-to-peer file-sharing protocols: BlameFlix only opens http/https,
// so these schemes cannot be used as a source.
export const BANNED_SOURCE_SCHEMES = ['magnet', 'torrent', 'ed2k', 'kademlia', 'dht'];

// Checks that a source template is an http/https URL. Returns an error
// message if the template is unusable, otherwise null (an empty template
// is valid: it means the feature is off).
export function sourceTemplateError(template) {
    const tpl = String(template || '').trim();
    if (!tpl) return null;
    const scheme = tpl.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
    if (scheme) {
        const s = scheme[1].toLowerCase();
        if (s !== 'http' && s !== 'https') {
            return BANNED_SOURCE_SCHEMES.includes(s)
                ? t('msg.errFileSharing')
                : t('msg.errOnlyHttp');
        }
    }
    if (!/^https?:\/\//i.test(tpl)) {
        return t('msg.errInvalidLink');
    }
    return null;
}
