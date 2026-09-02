// Stacked toasts: every showToast() creates its own entry that auto-dismisses
// instead of replacing the previous one, so rapid notifications are not lost.
let toastContainer = null;

const TOAST_HIDE_MS = 250;

function getContainer() {
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        toastContainer.setAttribute('role', 'status');
        toastContainer.setAttribute('aria-live', 'polite');
        document.body.appendChild(toastContainer);
    }
    return toastContainer;
}

// Dismisses a single toast. The element is removed after the opacity
// transition completes.
function dismissToast(el) {
    if (!el || el.dataset.dismissed) return;
    el.dataset.dismissed = '1';
    el.classList.remove('is-visible');
    setTimeout(() => el.remove(), TOAST_HIDE_MS);
}

function showToast(title, body, ms = 2500) {
    const el = document.createElement('div');
    el.className = 'toast';
    const titleEl = document.createElement('strong');
    titleEl.className = 'toast__title';
    titleEl.innerText = title;
    el.appendChild(titleEl);
    if (body) {
        const bodyEl = document.createElement('span');
        bodyEl.className = 'toast__body';
        bodyEl.innerText = body;
        el.appendChild(bodyEl);
    }

    el.addEventListener('click', () => dismissToast(el));

    getContainer().appendChild(el);
    requestAnimationFrame(() => el.classList.add('is-visible'));
    setTimeout(() => dismissToast(el), ms);
    return el;
}

export { showToast };