// Reusable focus management for modal overlays: traps the Tab key inside
// the dialog while it is open and restores focus to the trigger on close.
// Also wires Esc to call the given onClose handler (dismiss).
// Returns a { close } handle; calling close() cleans up cleanly.

const FOCUSABLE = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

function getFocusable(container) {
    return Array.from(container.querySelectorAll(FOCUSABLE))
        .filter(el => !el.hidden && el.getAttribute('aria-hidden') !== 'true');
}

export function trapFocus(container, opts = {}) {
    const onEsc = opts.onEsc || null;
    const restoreFocusTo = opts.restoreFocusTo || null;
    let active = true;

    function onKeydown(e) {
        if (!active) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            if (typeof onEsc === 'function') onEsc();
            return;
        }
        if (e.key !== 'Tab') return;
        const focusable = getFocusable(container);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }

    document.addEventListener('keydown', onKeydown);

    function close() {
        if (!active) return;
        active = false;
        document.removeEventListener('keydown', onKeydown);
        if (restoreFocusTo && typeof restoreFocusTo.focus === 'function') restoreFocusTo.focus();
    }

    return { close };
}
