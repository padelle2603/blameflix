// Simple SlideX view transitions for home ↔ detail and grid (home ↔ search).
// Excludes settings tabs. Respects prefers-reduced-motion.
import { homeView, detailView, grid, searchbar, btnSearchToggle } from './dom.js';
import { VIEW_DUR, GRID_DUR_OUT, GRID_DUR_IN, SEARCHBAR_DUR, prefersReduced, wait, nextFrame } from './motion.js';

function getStack() {
    return document.querySelector('.view-stack');
}

function measureHeight(view) {
    const stack = getStack();
    const stackWidth = stack ? stack.clientWidth : 0;
    if (!view.hidden) return view.offsetHeight;
    const prevHidden = view.hidden;
    const prevVisibility = view.style.visibility;
    const prevPosition = view.style.position;
    const prevPointer = view.style.pointerEvents;
    const prevWidth = view.style.width;
    const prevTop = view.style.top;
    const prevLeft = view.style.left;
    view.hidden = false;
    view.style.visibility = 'hidden';
    view.style.position = 'absolute';
    view.style.top = '0';
    view.style.left = '0';
    if (stackWidth) view.style.width = stackWidth + 'px';
    view.style.pointerEvents = 'none';
    const h = view.offsetHeight;
    view.hidden = prevHidden;
    view.style.visibility = prevVisibility;
    view.style.position = prevPosition;
    view.style.pointerEvents = prevPointer;
    view.style.width = prevWidth;
    view.style.top = prevTop;
    view.style.left = prevLeft;
    return h;
}

export function syncStackToView(view) {
    const stack = getStack();
    if (!stack || prefersReduced() || view.hidden) return;
    const targetH = view.offsetHeight;
    const currentH = stack.offsetHeight;
    if (Math.abs(targetH - currentH) < 8) return;
    stack.style.height = currentH + 'px';
    void stack.offsetWidth;
    stack.style.height = targetH + 'px';
    const onEnd = () => {
        stack.style.height = '';
        stack.removeEventListener('transitionend', onEnd);
    };
    stack.addEventListener('transitionend', onEnd, { once: true });
    // Fallback clear if transitionend doesn't fire
    setTimeout(() => { stack.style.height = ''; }, VIEW_DUR + 50);
}

// Close searchbar silently in background when navigating away (e.g., home/search -> detail)
function closeSearchBarSilently() {
    if (!searchbar || searchbar.hidden) return;
    searchbar.classList.remove('is-visible');
    if (btnSearchToggle) btnSearchToggle.setAttribute('aria-pressed', 'false');
    if (prefersReduced()) {
        searchbar.hidden = true;
    } else {
        setTimeout(() => { searchbar.hidden = true; }, SEARCHBAR_DUR);
    }
}

 // View: home -> detail (forward SlideX: home exits left, detail enters from right)
export async function slideHomeToDetail() {
    closeSearchBarSilently();
    window.scrollTo(0, 0);
    if (prefersReduced()) {
        const stack = getStack();
        if (stack) stack.style.height = '';
        homeView.hidden = true;
        homeView.classList.remove('is-exiting', 'is-entering');
        detailView.hidden = false;
        detailView.classList.remove('is-exiting');
        detailView.classList.add('is-visible');
        document.body.classList.add('is-detail');
        return;
    }
    const stack = getStack();
    const fromH = homeView.offsetHeight;
    const toH = measureHeight(detailView);

    if (stack && Math.abs(fromH - toH) > 8) {
        stack.style.height = fromH + 'px';
        void stack.offsetWidth;
    }

    detailView.classList.remove('is-exiting');
    homeView.classList.remove('is-entering');
    detailView.hidden = false;
    detailView.classList.remove('is-visible');
    void detailView.offsetWidth;

    if (stack && Math.abs(fromH - toH) > 8) {
        stack.style.height = toH + 'px';
    }

    // Start exit and enter together for push effect
    await nextFrame();
    homeView.classList.add('is-exiting');
    detailView.classList.add('is-visible');
    document.body.classList.add('is-detail');
    await wait(VIEW_DUR);
    homeView.hidden = true;
    homeView.classList.remove('is-exiting');
    if (stack) stack.style.height = '';
}

// View: detail -> home/search (backward SlideX: detail exits right, home enters from left)
export async function slideDetailToHome() {
    window.scrollTo(0, 0);
    if (prefersReduced()) {
        const stack = getStack();
        if (stack) stack.style.height = '';
        detailView.classList.remove('is-visible', 'is-exiting');
        detailView.hidden = true;
        homeView.hidden = false;
        homeView.classList.remove('is-exiting', 'is-entering');
        document.body.classList.remove('is-detail');
        return;
    }
    const stack = getStack();
    const fromH = detailView.offsetHeight;
    const toH = measureHeight(homeView);

    if (stack && Math.abs(fromH - toH) > 8) {
        stack.style.height = fromH + 'px';
        void stack.offsetWidth;
    }

    // Prepare home for entering from left
    homeView.hidden = false;
    homeView.classList.add('is-entering');
    void homeView.offsetWidth;
    detailView.classList.remove('is-visible');
    detailView.classList.add('is-exiting');

    if (stack && Math.abs(fromH - toH) > 8) {
        stack.style.height = toH + 'px';
    }

    await nextFrame();
    homeView.classList.remove('is-entering');
    await wait(VIEW_DUR);
    detailView.hidden = true;
    detailView.classList.remove('is-exiting');
    document.body.classList.remove('is-detail');
    if (stack) stack.style.height = '';
}

// Grid: home ↔ search inside #home-view (SlideX on #results-grid)
// direction: 'forward' = home→search (out left, in from right)
//            'backward' = search→home (out right, in from left)
export async function slideGridSwitch(renderFn, direction = 'forward') {
    if (prefersReduced() || !grid) {
        renderFn();
        return;
    }
    const outClass = direction === 'forward' ? 'is-slide-out-left' : 'is-slide-out-right';
    const inClass = direction === 'forward' ? 'is-entering-from-right' : 'is-entering-from-left';

    // Out
    grid.classList.add(outClass);
    await wait(GRID_DUR_OUT);
    grid.classList.remove(outClass);
    // Prepare in state
    grid.classList.add(inClass);
    renderFn();
    // Force reflow so initial transform applies to new content
    void grid.offsetWidth;
    await nextFrame();
    grid.classList.remove(inClass);
    await wait(GRID_DUR_IN);
}

// Helper for search entering (skeleton + results) — just fade/slide the grid in
export async function slideGridEnter(direction = 'forward') {
    if (prefersReduced() || !grid) return;
    const inClass = direction === 'forward' ? 'is-entering-from-right' : 'is-entering-from-left';
    grid.classList.add(inClass);
    void grid.offsetWidth;
    await nextFrame();
    grid.classList.remove(inClass);
    await wait(GRID_DUR_IN);
}
