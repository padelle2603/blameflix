// Home swipe pager: three full-width panels (stats | catalog | calendar)
// scrolled horizontally with native scroll-snap. The catalog starts
// centered; the dots reflect the active panel and the side panels are
// lazy-loaded the first time they are shown.
import { homePanels, panelDots } from './dom.js';
import { prefersReduced } from './motion.js';

export const CATALOG_INDEX = 1;

let statsMod = null;
let calendarMod = null;

function loadStats() {
    if (!statsMod) statsMod = import('./stats.js');
    return statsMod;
}

function loadCalendar() {
    if (!calendarMod) calendarMod = import('./calendar.js');
    return calendarMod;
}

export function panelIndex() {
    const w = homePanels.clientWidth;
    return w === 0 ? CATALOG_INDEX : Math.round(homePanels.scrollLeft / w);
}

// The panel's scrollLeft resets to 0 while the container is display:none
// (detail view on top), so the current pager position is kept before hiding
// and restored after showing again.
let storedIndex = CATALOG_INDEX;

export function storePanelIndex() { storedIndex = panelIndex(); }

export function restorePanelIndex() {
    homePanels.scrollLeft = homePanels.clientWidth * storedIndex;
    syncPanelDots();
}

function ensurePanelLoaded(index) {
    if (index === 0) loadStats().then(m => m.renderStats()).catch(() => {});
    if (index === 2) loadCalendar().then(m => m.renderCalendar()).catch(() => {});
}

export function goPanel(index) {
    if (!Number.isFinite(index) || homePanels.hidden) return;
    if (index === 0) loadStats().then(m => m.renderStats()).catch(() => {});
    if (index === 2) loadCalendar().then(m => m.renderCalendar()).catch(() => {});
    homePanels.scrollTo({ left: homePanels.clientWidth * index, behavior: prefersReduced() ? 'auto' : 'smooth' });
}

export function calendarTo(delta) {
    loadCalendar().then(m => m.navigateMonth(delta)).catch(() => {});
}

export async function openCalendarItem(id, type) {
    const m = await loadCalendar().catch(() => null);
    if (m) m.openCalendarItem(id, type);
}

// Re-renders the loaded side panels (used after a language switch).
export function refreshPanels() {
    const idx = panelIndex();
    if (idx === 0) loadStats().then(m => m.renderStats()).catch(() => {});
    if (idx === 2) loadCalendar().then(m => m.renderCalendar()).catch(() => {});
}

function syncPanelDots() {
    const idx = panelIndex();
    panelDots.querySelectorAll('.panel-dot').forEach(dot => {
        const active = Number(dot.dataset.panel) === idx;
        dot.classList.toggle('is-active', active);
        dot.setAttribute('aria-selected', String(active));
    });
}

export function initPanels() {
    homePanels.scrollLeft = homePanels.clientWidth * CATALOG_INDEX;
    homePanels.addEventListener('scroll', () => {
        syncPanelDots();
        ensurePanelLoaded(panelIndex());
    }, { passive: true });
    window.addEventListener('resize', () => {
        homePanels.scrollLeft = homePanels.clientWidth * panelIndex();
    });
    syncPanelDots();
}