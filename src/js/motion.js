// Centralized motion helpers — respects prefers-reduced-motion.
// Single source for durations and frame utilities (DRY).
export const VIEW_DUR = 260;
export const GRID_DUR_OUT = 180;
export const GRID_DUR_IN = 220;
export const OVERLAY_DUR = 180;
export const OVERLAY_PANEL_DUR = 220;
export const TAB_DUR = 150;
export const SEARCHBAR_DUR = 180;

export function prefersReduced() {
    return typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function wait(ms) {
    return new Promise(r => setTimeout(r, ms));
}

export function nextFrame() {
    return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
}
