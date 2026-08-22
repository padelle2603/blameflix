import { toastEl } from './dom.js';

let toastTimer = null;

function showToast(title, body, ms = 5000) {
    document.getElementById('toast-title').innerText = title;
    document.getElementById('toast-body').innerText = body;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), ms);
}

export { showToast };