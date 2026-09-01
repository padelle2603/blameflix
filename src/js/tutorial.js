import { t } from './i18n.js';
import { openSettings, closeSettings } from './settings.js';

// --- Interactive, skippable first-launch tour ---
// Each step highlights a UI element with a spotlight (a dark mask with a
// clear "hole" over the target) and shows a tooltip. Steps without a target
// (or whose target is not currently visible) fall back to a centered tooltip.
const STEPS = [
    { target: null, title: 'tutorial.step1Title', body: 'tutorial.step1Body' },
    { targets: ['#settings-api-key', '#settings-resolver-movie', '#settings-resolver-tv'], title: 'tutorial.step2Title', body: 'tutorial.step2Body', openSettings: true },
    { target: '#search-input', title: 'tutorial.step3Title', body: 'tutorial.step3Body' },
    { target: '#home-unwatched', title: 'tutorial.step4Title', body: 'tutorial.step4Body' },
    { target: '#btn-catalog-menu', title: 'tutorial.step5Title', body: 'tutorial.step5Body' },
    { target: '#btn-sync', title: 'tutorial.step6Title', body: 'tutorial.step6Body' },
    { target: null, title: 'tutorial.step7Title', body: 'tutorial.step7Body' },
];

const TUTORIAL_DONE_KEY = 'myTutorialDone';

let overlay, shadesRoot, tooltip, titleEl, bodyEl, progressEl, prevBtn, nextBtn, skipBtn;
let currentStep = -1;
let settingsOpenedByUs = false;
let initialized = false;

function cacheEls() {
    overlay = document.getElementById('tutorial-overlay');
    shadesRoot = document.getElementById('tutorial-shades');
    tooltip = document.getElementById('tutorial-tooltip');
    titleEl = document.getElementById('tutorial-title');
    bodyEl = document.getElementById('tutorial-body');
    progressEl = document.getElementById('tutorial-progress');
    prevBtn = document.getElementById('tutorial-prev');
    nextBtn = document.getElementById('tutorial-next');
    skipBtn = document.getElementById('tutorial-skip');
}

function init() {
    if (initialized) return;
    cacheEls();
    if (!overlay) return;
    prevBtn.addEventListener('click', tutorialPrev);
    nextBtn.addEventListener('click', tutorialNext);
    skipBtn.addEventListener('click', skipTutorial);
    initialized = true;
}

function renderProgress() {
    if (!progressEl) return;
    progressEl.innerHTML = '';
    STEPS.forEach((_, i) => {
        const dot = document.createElement('span');
        dot.className = 'tutorial-dot'
            + (i === currentStep ? ' is-active' : '')
            + (i < currentStep ? ' is-done' : '');
        progressEl.appendChild(dot);
    });
}

function clearShades() {
    if (!shadesRoot) return;
    while (shadesRoot.firstChild) shadesRoot.removeChild(shadesRoot.firstChild);
}

// Builds one "spotlight" per target using 4 solid dark panels (top/bottom/
// left/right) that cover everything except the target's hole, plus a red ring
// around it. The union of every panel leaves each target's hole uncovered, so
// several targets can be highlighted at once (the box-shadow trick can't, since
// each 9999px shadow would erase the other holes). Returns the union rect of
// all visible targets (null when none is visible -> centered tooltip fallback).
function positionSpot(targets, drawShade = true) {
    clearShades();
    const W = window.innerWidth;
    const H = window.innerHeight;
    const pad = 8;
    const rects = [];
    const panels = [];
    const rings = [];

    for (const sel of targets) {
        const el = document.querySelector(sel);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue; // not laid out / hidden
        rects.push(r);

        const x0 = r.left - pad, y0 = r.top - pad;
        const x1 = r.right + pad, y1 = r.bottom + pad;

        if (drawShade) {
            panels.push({ top: 0, left: 0, width: W, height: Math.max(0, y0) });
            panels.push({ top: y1, left: 0, width: W, height: Math.max(0, H - y1) });
            panels.push({ top: y0, left: 0, width: Math.max(0, x0), height: Math.max(0, y1 - y0) });
            panels.push({ top: y0, left: x1, width: Math.max(0, W - x1), height: Math.max(0, y1 - y0) });
        }

        rings.push({ top: y0, left: x0, width: x1 - x0, height: y1 - y0 });
    }

    for (const p of panels) {
        if (p.width === 0 || p.height === 0) continue;
        const d = document.createElement('div');
        d.className = 'tutorial-shade';
        d.style.top = p.top + 'px';
        d.style.left = p.left + 'px';
        d.style.width = p.width + 'px';
        d.style.height = p.height + 'px';
        shadesRoot.appendChild(d);
    }
    for (const rg of rings) {
        const d = document.createElement('div');
        d.className = 'tutorial-ring';
        d.style.top = rg.top + 'px';
        d.style.left = rg.left + 'px';
        d.style.width = rg.width + 'px';
        d.style.height = rg.height + 'px';
        shadesRoot.appendChild(d);
    }

    if (!rects.length) return null;
    const u = {
        top: rects[0].top, left: rects[0].left,
        bottom: rects[0].bottom, right: rects[0].right
    };
    for (let i = 1; i < rects.length; i++) {
        u.top = Math.min(u.top, rects[i].top);
        u.left = Math.min(u.left, rects[i].left);
        u.bottom = Math.max(u.bottom, rects[i].bottom);
        u.right = Math.max(u.right, rects[i].right);
    }
    u.width = u.right - u.left;
    u.height = u.bottom - u.top;
    return u;
}

function positionTooltip(rect) {
    const margin = 14;
    const tw = tooltip.offsetWidth;
    const th = tooltip.offsetHeight;
    let top, left;
    if (!rect) {
        top = (window.innerHeight - th) / 2;
        left = (window.innerWidth - tw) / 2;
    } else {
        const below = rect.bottom + margin;
        const above = rect.top - margin - th;
        if (below + th <= window.innerHeight) top = below;
        else top = Math.max(margin, above);
        left = rect.left + rect.width / 2 - tw / 2;
    }
    left = Math.max(margin, Math.min(left, window.innerWidth - tw - margin));
    top = Math.max(margin, Math.min(top, window.innerHeight - th - margin));
    tooltip.style.top = top + 'px';
    tooltip.style.left = left + 'px';
}

function render() {
    const step = STEPS[currentStep];
    // Once we leave the settings step, close the panel we opened.
    if (settingsOpenedByUs && !step.openSettings) {
        closeSettings();
        settingsOpenedByUs = false;
    }
    titleEl.textContent = t(step.title);
    bodyEl.textContent = t(step.body);
    prevBtn.disabled = currentStep === 0;
    nextBtn.textContent = (currentStep === STEPS.length - 1) ? t('tutorial.done') : t('tutorial.next');
    renderProgress();

    if (step.openSettings && !settingsOpenedByUs) {
        openSettings();
        settingsOpenedByUs = true;
    }
    let rect = null;
    const targets = step.targets || (step.target ? [step.target] : null);
    if (targets && targets.length) rect = positionSpot(targets, !step.openSettings);
    else clearShades();
    positionTooltip(rect);
}

function showOverlay() {
    overlay.hidden = false;
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', render);
    window.addEventListener('scroll', render, true);
}

function hideOverlay() {
    overlay.hidden = true;
    clearShades();
    if (settingsOpenedByUs) {
        closeSettings();
        settingsOpenedByUs = false;
    }
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', render);
    window.removeEventListener('scroll', render, true);
}

function onKey(e) {
    if (e.key === 'Escape') skipTutorial();
    else if (e.key === 'ArrowRight') tutorialNext();
    else if (e.key === 'ArrowLeft') tutorialPrev();
}

function finish() {
    try { localStorage.setItem(TUTORIAL_DONE_KEY, '1'); } catch (err) { /* storage blocked */ }
    hideOverlay();
}

export function startTutorial() {
    init();
    if (!overlay) return;
    currentStep = 0;
    showOverlay();
    render();
}

export function tutorialNext() {
    if (currentStep >= STEPS.length - 1) { finish(); return; }
    currentStep++;
    render();
}

export function tutorialPrev() {
    if (currentStep <= 0) return;
    currentStep--;
    render();
}

export function skipTutorial() {
    finish();
}

// Runs automatically on the very first launch, after the legal disclaimer is
// accepted. Subsequent openings (flag already set) are skipped.
export function maybeStartTutorial() {
    let done = null;
    try { done = localStorage.getItem(TUTORIAL_DONE_KEY); } catch (err) { /* storage blocked */ }
    if (done !== '1') startTutorial();
}
