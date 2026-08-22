import { state } from './state.js';
import { t } from './i18n.js';
import { showToast } from './toast.js';

// Replaces the placeholders ({id}, {type}, {season}, {episode}) in the
// template chosen by the user. It does not append any segment: the URL is
// opened exactly as configured, with only the placeholders replaced.
// Returns null if the template is invalid or leaves unresolved placeholders.
function resolveTemplate(template, vars) {
    let url = String(template).trim();
    if (!url) return null;

    url = url
        .replaceAll('{id}', vars.id)
        .replaceAll('{type}', vars.media_type);
    if (vars.season !== undefined) {
        url = url.replaceAll('{season}', vars.season)
                 .replaceAll('{episode}', vars.episode);
    }

    if (/[{][a-z]+[}]/.test(url) || !/^https?:\/\//i.test(url)) return null;
    return url;
}

// Peer-to-peer file-sharing protocols: BlameFlix only opens http/https,
// so these schemes cannot be used as a source.
const BANNED_SOURCE_SCHEMES = ['magnet', 'torrent', 'ed2k', 'kademlia', 'dht'];

// Checks that the source template is an http/https URL. Returns an error
// message if the template is unusable, otherwise null (an empty template
// is valid: it means "Watch now" is off).
function sourceTemplateError(template) {
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

// --- TITLE-SPECIFIC SOURCE (override of the global one) ---

function resolverOverrideKey() {
    return state.currentMedia ? `${state.currentMedia.media_type}:${state.currentMedia.id}` : '';
}

// Returns the template for this title if configured, otherwise the global one.
function effectiveResolverTemplate(type) {
    const key = resolverOverrideKey();
    const override = key && typeof state.resolverOverrides[key] === 'string' ? state.resolverOverrides[key].trim() : '';
    if (override) return override;
    return type === 'movie' ? state.resolver.movie : state.resolver.tv;
}

function toggleResolverOverride() {
    const panel = document.getElementById('resolver-override-panel');
    const input = document.getElementById('resolver-override-input');
    if (panel.hidden) {
        input.value = getResolverOverride();
        panel.hidden = false;
        input.focus();
    } else {
        panel.hidden = true;
    }
}

function persistResolverOverrides() {
    localStorage.setItem('myResolverOverrides', JSON.stringify(state.resolverOverrides));
}

function saveResolverOverride() {
    const key = resolverOverrideKey();
    if (!key) return;
    const input = document.getElementById('resolver-override-input');
    const value = input.value.trim();
    const err = sourceTemplateError(value);
    if (err) {
        showToast(t('toast.noSource'), err);
        return;
    }
    if (value) state.resolverOverrides[key] = value;
    else delete state.resolverOverrides[key];
    persistResolverOverrides();
    document.getElementById('resolver-override-panel').hidden = true;
    syncResolverOverrideBtn();
}

function clearResolverOverride() {
    const key = resolverOverrideKey();
    if (!key) return;
    delete state.resolverOverrides[key];
    persistResolverOverrides();
    document.getElementById('resolver-override-input').value = '';
    document.getElementById('resolver-override-panel').hidden = true;
    syncResolverOverrideBtn();
}

function getResolverOverride() {
    const key = resolverOverrideKey();
    return key && typeof state.resolverOverrides[key] === 'string' ? state.resolverOverrides[key].trim() : '';
}

function syncResolverOverrideBtn() {
    const btn = document.getElementById('btn-resolver-override');
    if (!btn) return;
    const has = Boolean(getResolverOverride());
    btn.innerText = has ? t('detail.sourceCustom') : t('detail.sourceGlobal');
    btn.classList.toggle('btn--saved', has);
}

export { resolveTemplate, sourceTemplateError, effectiveResolverTemplate, toggleResolverOverride, persistResolverOverrides, saveResolverOverride, clearResolverOverride, getResolverOverride, syncResolverOverrideBtn };