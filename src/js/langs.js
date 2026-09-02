// Shared language registry used by both the i18n layer and the app state.
// Kept in its own module so state.js can validate/detect the language
// without importing i18n.js (which would create a circular dependency:
// i18n.js imports state.js).

// code     : internal language code (also the I18N key in i18n.js)
// label    : native name shown in the settings dropdown
// locale   : BCP-47 tag used for TMDB requests and Intl date/number formatting
// decimal  : 'comma' or 'dot' — decimal separator for the vote number
export const LANGS = [
    { code: 'it', label: 'Italiano',       locale: 'it-IT', decimal: 'comma' },
    { code: 'en', label: 'English',        locale: 'en-US', decimal: 'dot' },
    { code: 'es', label: 'Español',        locale: 'es-ES', decimal: 'comma' },
    { code: 'fr', label: 'Français',       locale: 'fr-FR', decimal: 'comma' },
    { code: 'de', label: 'Deutsch',        locale: 'de-DE', decimal: 'comma' },
    { code: 'ru', label: 'Русский',        locale: 'ru-RU', decimal: 'comma' },
    { code: 'zh', label: '中文',           locale: 'zh-CN', decimal: 'comma' },
    { code: 'hi', label: 'हिन्दी',    locale: 'hi-IN', decimal: 'dot' }
];

export const LANG_CODES = LANGS.map(l => l.code);

const LANG_BY_CODE = Object.fromEntries(LANGS.map(l => [l.code, l]));

// Returns the meta for a code, falling back to English.
export function langMeta(code) {
    return LANG_BY_CODE[code] || LANG_BY_CODE.en;
}


