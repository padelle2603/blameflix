// Pull-to-refresh (Mihon-style): dragging a finger down from the very top of
// the page reveals an indicator; releasing past the threshold triggers the
// release sync. Native Android app only: plain web (desktop or mobile,
// emulation and touchscreens included) and Electron never engage the gesture.
import { syncReleases } from './releases.js';
import { ptrIndicator } from './dom.js';

// Activation follows the Material 3 reference behavior: the resisted
// distance (finger drag * RESISTANCE) must cross the positional threshold,
// so a firm ~192px pull is required before the sync fires. The engagement
// slop prevents the indicator from appearing on every casual scroll.
const ENGAGE_SLOP = 24;
const PULL_THRESHOLD = 96;
const MAX_PULL = 110;
const RESISTANCE = 0.5;

let startY = null;
let engaged = false;

function gestureAllowed() {
    if (!window.Capacitor?.isNativePlatform?.()) return false; // native Android app only
    // Never engage while a modal layer is on screen.
    if (document.querySelector('.overlay:not([hidden])')) return false;
    return true;
}

function paintPull(distance) {
    const adjusted = distance * RESISTANCE;
    document.body.classList.add('ptr-active');
    ptrIndicator.style.transform = `translate(-50%, ${Math.min(adjusted, MAX_PULL)}px)`;
    ptrIndicator.classList.toggle('is-ready', adjusted >= PULL_THRESHOLD);
}

function reset() {
    startY = null;
    engaged = false;
    document.body.classList.remove('ptr-active');
    ptrIndicator.style.transform = '';
    ptrIndicator.classList.remove('is-ready', 'is-syncing', 'is-visible');
}

document.addEventListener('touchstart', (e) => {
    if (!gestureAllowed() || e.touches.length !== 1) return;
    const target = e.target;
    if (target.closest('input, textarea, select, .catalog-menu')) return;
    startY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchmove', (e) => {
    if (startY === null) return;
    const distance = e.touches[0].clientY - startY;
    if (!engaged && distance > ENGAGE_SLOP && window.scrollY <= 0) {
        engaged = true;
        ptrIndicator.classList.add('is-visible');
        document.body.classList.add('ptr-active');
    }
    if (engaged) {
        e.preventDefault();
        paintPull(Math.max(distance, 0));
    }
}, { passive: false });

document.addEventListener('touchend', async () => {
    if (!engaged) { startY = null; return; }
    const ready = ptrIndicator.classList.contains('is-ready');
    if (ready) {
        ptrIndicator.classList.remove('is-ready');
        ptrIndicator.classList.add('is-syncing');
        try {
            await syncReleases();
        } finally {
            reset();
        }
    } else {
        reset();
    }
});
