// Monthly release calendar: fills a grid with the upcoming movie release
// dates and next-episode air dates of the user's watchlist, using only the
// data already hydrated/known (TMDB details cache + release state).
import { state } from './state.js';
import { calendarGrid, calendarMonth } from './dom.js';
import { detailFor } from './watchlist.js';
import { t, locale } from './i18n.js';
import { showDetails } from './details.js';

const now = new Date();
let year = now.getFullYear();
let month = now.getMonth();
let itemsByDate = null;

// Collects { dateKey: [ {id,type,title,sub} ] } for every watchlist title
// that has a release or next air date. Rebuilt on each render so new
// additions and language changes are always reflected.
function collectReleases() {
    const map = new Map();
    const push = (key, entry) => {
        if (!key) return;
        const list = map.get(key);
        if (list) list.push(entry);
        else map.set(key, [entry]);
    };
    for (const item of state.watchlist) {
        const d = detailFor(item);
        if (item.media_type === 'movie') {
            const date = d.release_date || state.releaseState.movies[item.id];
            push(date, { id: item.id, type: 'movie', title: d.title || t('common.noTitle'), sub: date ? String(date).slice(0, 4) : '' });
        } else {
            const nxt = d.next_episode_to_air;
            if (nxt && nxt.air_date) {
                const ep = state.releaseState.shows[item.id];
                const seenEp = ep && nxt.season_number === ep.season && nxt.episode_number <= ep.episode;
                if (seenEp) continue; // already announced by the release tracker
                push(nxt.air_date, {
                    id: item.id,
                    type: 'tv',
                    title: d.name || t('common.noTitle'),
                    sub: `S${nxt.season_number}E${nxt.episode_number}`
                });
            } else {
                const rel = state.releaseState.shows[item.id];
                if (rel && rel.ts) push(isoDate(new Date(rel.ts)), { id: item.id, type: 'tv', title: d.name || t('common.noTitle'), sub: `S${rel.season}E${rel.episode}` });
            }
        }
    }
    return map;
}

function isoDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

const DOW = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function gridTitle(date) {
    try {
        return date.toLocaleDateString(locale(), { year: 'numeric', month: 'long' });
    } catch {
        return `${date.getFullYear()} · ${date.getMonth() + 1}`;
    }
}

function renderCalendar() {
    itemsByDate = collectReleases();

    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const lead = (first.getDay() + 6) % 7; // Monday-first offset

    calendarMonth.textContent = gridTitle(first);

    const todayKey = isoDate(new Date());
    const frag = document.createDocumentFragment();

    DOW.forEach(d => {
        const el = document.createElement('span');
        el.className = 'calendar-dow';
        el.textContent = t(`calendar.${d}`);
        frag.appendChild(el);
    });

    const renderCell = day => {
        const key = isoDate(new Date(year, month, day));
        const cell = document.createElement('div');
        cell.className = 'calendar-day' + (key === todayKey ? ' is-today' : '');
        const dayNum = document.createElement('span');
        dayNum.textContent = String(day);
        cell.appendChild(dayNum);
        const items = itemsByDate.get(key) || [];
        if (items.length) {
            const listEl = document.createElement('div');
            listEl.className = 'calendar-day__items';
            items.slice(0, 3).forEach(entry => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = `calendar-item calendar-item--${entry.type}`;
                btn.dataset.action = 'open-calendar-item';
                btn.dataset.id = entry.id;
                btn.dataset.type = entry.type;
                btn.textContent = `${entry.title}${entry.sub ? ' ' + entry.sub : ''}`;
                btn.title = btn.textContent;
                listEl.appendChild(btn);
            });
            if (items.length > 3) {
                const more = document.createElement('span');
                more.className = 'calendar-day__count';
                more.textContent = `+${items.length - 3}`;
                listEl.appendChild(more);
            }
            cell.appendChild(listEl);
        }
        return cell;
    };

    for (let i = 0; i < lead; i++) {
        const el = renderCell(-lead + 1 + i);
        el.classList.add('is-empty', 'is-out');
        frag.appendChild(el);
    }
    for (let day = 1; day <= daysInMonth; day++) {
        frag.appendChild(renderCell(day));
    }
    for (let i = daysInMonth; (lead + i) % 7 !== 0; i++) {
        const el = renderCell(i + 1);
        el.classList.add('is-empty', 'is-out');
        frag.appendChild(el);
    }

    calendarGrid.innerHTML = '';
    calendarGrid.appendChild(frag);
}

function navigateMonth(delta) {
    month += delta;
    if (month < 0) { month = 11; year--; }
    if (month > 11) { month = 0; year++; }
    renderCalendar();
}

function openCalendarItem(id, type) {
    showDetails(Number(id), type);
}

export { renderCalendar, navigateMonth, openCalendarItem };