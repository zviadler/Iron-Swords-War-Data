/* ==========================================================
   מאגר זיהוי לוחמים – לוגיקה ראשית (גרסת מובייל משודרגת)
   שדרוגים:
   • מובייל: הפילטרים בתוך Bottom Sheet כהה (לא מוצגים מעל הכרטיסים)
   • “Apply” הוסר – סינון מיידי; נשאר רק “איפוס פילטרים” ב-sheet
   • אין כפילות כפתורי איפוס במובייל (כפתור האיפוס הראשי מוסתר)
   • תרגומים חסרים הושלמו
   • גלילה אוטומטית לצמרת מתבצעת פחות (לא במובייל, מדוכאת בשינוי שפה/פילטרים)
========================================================== */

/* =============================
   קבועים ושמות שדות
==============================*/
const FIELDS = [
  'post_id','combatant_id','date','location','location_details',
  'name_english','name_arabic','nickname','description_online',
  'rank_role','organization','activity','family_members',
  'casualties_count','additional_combatants','notes'
];

const fieldLabels = {
  post_id: {he:"מס' פוסט", en:"Post No."},
  combatant_id: {he:"מס' לוחם", en:"Fighter No."},
  date: {he:"תאריך", en:"Date"},
  location: {he:"מיקום", en:"Location"},
  location_details: {he:"פירוט מיקום", en:"Location Details"},
  name_english: {he:"שם באנגלית", en:"Name in English"},
  name_arabic: {he:"שם בערבית", en:"Name in Arabic"},
  nickname: {he:"כינוי", en:"Nickname"},
  description_online: {he:"תיאור ברשתות", en:"Social Media Description"},
  rank_role: {he:"תפקיד/דרגה", en:"Rank/Role"},
  organization: {he:"ארגון", en:"Organization"},
  activity: {he:"פעילות", en:"Activity"},
  family_members: {he:"בני משפחה", en:"Family Members"},
  casualties_count: {he:"מס' נפגעים", en:"No. of Victims"},
  additional_combatants: {he:"לוחמים נוספים", en:"Additional Fighters"},
  notes: {he:"הערות", en:"Notes"},
};

const labels = {
  reset_filters: {he:"איפוס פילטרים",en:"Reset Filters"},
  export_csv: {he:"ייצא ל-CSV",en:"Export CSV"},
  search_placeholder: {he:"🔍 חפש שם, מיקום או תיאור…",en:"🔍 Search name, location or description…"},
  results_found: {he:"נמצאו {count} תוצאות",en:"{count} results"},
  page: {he:"עמוד {c} מתוך {t}",en:"Page {c} of {t}"},
  export_success: {he:"הנתונים יוצאו בהצלחה!",en:"Data exported successfully!"},
  export_no_data: {he:"אין נתונים לייצוא.",en:"No data to export."},
  no_data: {he:"אין נתונים להצגה",en:"No data to display"},
  lang_switch: {he:"English",en:"עברית"},
  open_filters: {he:"פתח פילטרים",en:"Open Filters"},
  close_filters: {he:"סגור פילטרים",en:"Close Filters"},
  filters_title: {he:"סינון", en:"Filters"},
  clear_all: {he:"נקה הכל", en:"Clear All"}, // נשמר לשימוש עתידי, לא מוצג ב-sheet
  active_filters: {he:"({n}) מסננים", en:"Filters ({n})"},
  all_option: {he:"הכול", en:"All"},
  close: {he:"סגור", en:"Close"},
  view_to_cards: {he:"עבור לתצוגת כרטיסים", en:"Switch to Cards"},
  view_to_table: {he:"עבור לתצוגת טבלה",   en:"Switch to Table"},
  csv_error: {he:"שגיאה בטעינת CSV", en:"Error loading CSV"}
};

/* =============================
   Responsive helpers
==============================*/
const MOBILE_BP = 768;
const mq = window.matchMedia(`(max-width: ${MOBILE_BP}px)`);
function isMobile() { return mq.matches; }

/* =============================
   State
==============================*/
const state = {
  originalData: [],
  filteredData: [],
  lang: (navigator.language || '').startsWith('he') ? 'he' : 'en',
  isMobile: isMobile(),
  isCardView: isMobile() || window.innerWidth <= 768,
  sort: { key: null, direction: 'asc' },
  pagination: { pageSize: 50, currentPage: 0 },
  filters: { location: '', org: '', rank: '', search: '', dateFrom: null, dateTo: null },
  suppressNextScroll: true // אל תקפיץ למעלה ברינדור הראשון/שינויים קלים
};

/* =============================
   DOM refs
==============================*/
const d = id => document.getElementById(id);
const dom = {
  contentArea: d('contentArea'),
  emptyState: d('emptyState'),
  toastContainer: d('toastContainer'),
  loadingOverlay: d('loadingOverlay'),

  searchInput: d('searchBox'),
  locationFilter: d('locationFilter'),
  orgFilter: d('orgFilter'),
  rankFilter: d('rankFilter'),
  dateFromInput: d('dateFrom'),
  dateToInput: d('dateTo'),
  clearDatesBtn: d('clearDatesBtn'),

  // שליטה
  langBtn: d('langBtn') || d('langToggle'),
  viewToggleBtn: d('viewToggleBtn') || d('viewToggle'),
  exportBtn: d('exportBtn') || d('exportCSVButton'),
  resetBtn: d('resetBtn') || d('resetFiltersButton'),
  pageSizeSelect: d('pageSize') || d('pageSizeSelect') || d('pageSizeDropdown'),

  // פגינציה/מונה תוצאות
  prevPageBtn: d('prevPageBtn') || d('prevPage'),
  nextPageBtn: d('nextPageBtn') || d('nextPage'),
  pageInfo: d('pageInfo') || d('paginationInfo'),
  resultsCounter: d('resultsCounter') || d('resultsCount'),

  // פס פילטרים / מובייל
  mobileFiltersToggle: d('mobileFiltersToggle'),
  filtersBar: d('filtersBar'),
};

/* =============================
   Mobile sheet & chips
==============================*/
let filtersBarAnchor = null;
let sheet = null;
let sheetBackdrop = null;
let sheetContent = null;
let sheetResetBtn = null;
let sheetCloseBtn = null;
let chipsWrap = null;

/* =============================
   Utilities
==============================*/
function getLocale(){ return state.lang === 'he' ? 'he-IL' : 'en-US'; }
function nf(){ return new Intl.NumberFormat(getLocale()); }

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function showToast(msg, type='success') {
  if (!dom.toastContainer) return;
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.setAttribute('role','status');
  el.setAttribute('aria-live','polite');
  el.textContent = msg;
  dom.toastContainer.appendChild(el);
  setTimeout(()=>{ el.remove(); }, 3500);
}

function parseInputDate(v, endOfDay=false) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  if (endOfDay) d.setHours(23,59,59,999);
  else d.setHours(0,0,0,0);
  return d;
}

/* --- תאריך: תומך תאריך בודד + טווחים מוגדרים --- */
function parseDateRange(s) {
  if (!s) return null;
  const t = String(s).trim();

  const single = new Date(t);
  if (!Number.isNaN(single.getTime())) {
    const from = new Date(single); from.setHours(0,0,0,0);
    const to   = new Date(single); to.setHours(23,59,59,999);
    return { from, to };
  }

  const parts = t.split(/\s*(?:–|—|~| to | - )\s*/i);
  const from = new Date(parts[0]);
  const to   = new Date(parts[1] || parts[0]);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  to.setHours(23,59,59,999);
  return { from, to };
}

function escapeRegExp(s){ return String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }
function highlight(val, q) {
  const s = String(val ?? '');
  if (!q) return escapeHtml(s);
  const re = new RegExp(`(${escapeRegExp(q)})`, 'ig');
  return s.split(re).map((part, i) =>
    i % 2 ? `<mark>${escapeHtml(part)}</mark>` : escapeHtml(part)
  ).join('');
}

function debounce(fn, ms=200){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }

/* עזרי UI */
function setLangButtonUI() {
  if (!dom.langBtn) return;
  const span = dom.langBtn.querySelector('span') || dom.langBtn;
  span.textContent = labels.lang_switch[state.lang];
  dom.langBtn.setAttribute('aria-label', labels.lang_switch[state.lang]);
}

function updateViewToggleUI(){
  if (!dom.viewToggleBtn) return;
  const span = dom.viewToggleBtn.querySelector('span') || dom.viewToggleBtn;
  const toCards = labels.view_to_cards[state.lang];
  const toTable = labels.view_to_table[state.lang];
  span.textContent = state.isCardView ? toTable : toCards;
  dom.viewToggleBtn.setAttribute('aria-pressed', state.isCardView ? 'true' : 'false');
  dom.viewToggleBtn.setAttribute('aria-label', span.textContent);
}

/* =============================
   נרמול כותרות CSV → snake_case
==============================*/
function normalizeHeader(h) {
  if (!h) return '';
  const key = String(h).trim().toLowerCase();
  const map = {
    "מס' פוסט": 'post_id', "post id": 'post_id', "post no.": 'post_id',
    "מס' לוחם": 'combatant_id', "combatant id": 'combatant_id', "fighter no.": 'combatant_id',
    "תאריך": 'date', "date": 'date',
    "מיקום": 'location', "location": 'location',
    "פירוט מיקום": 'location_details', "location details": 'location_details',
    "שם באנגלית": 'name_english', "name in english": 'name_english',
    "שם בערבית": 'name_arabic', "name in arabic": 'name_arabic',
    "כינוי": 'nickname', "nickname": 'nickname',
    "תיאור ברשתות": 'description_online', "social media description": 'description_online',
    "תפקיד/דרגה": 'rank_role', "rank/role": 'rank_role',
    "ארגון": 'organization', "organization": 'organization',
    "פעילות": 'activity', "activity": 'activity',
    "בני משפחה": 'family_members', "family members": 'family_members',
    "מס' נפגעים": 'casualties_count', "no. of victims": 'casualties_count',
    "לוחמים נוספים": 'additional_combatants', "additional fighters": 'additional_combatants',
    "הערות": 'notes', "notes": 'notes',
  };
  return map[key] || key.replace(/\s+/g,'_').replace(/[^\w]/g,'').toLowerCase();
}

/* =============================
   עיבוד CSV/EMBEDDED
==============================*/
function loadData() {
  showLoading(true);
  const csvDiv = d('dataCSV');
  const url = csvDiv?.dataset?.url;

  if (url) {
    const csvURL = new URL(url || 'data.csv', document.baseURI).href;

    const parseWithPapa = (u, useWorker) =>
      new Promise((resolve, reject) => {
        Papa.parse(u, {
          download: true,
          header: true,
          worker: !!useWorker,
          skipEmptyLines: true,
          error: reject,
          complete: (res) => resolve(res?.data || [])
        });
      });

    const mapRows = (rows) =>
      (rows || []).map((rec) => {
        const norm = {};
        Object.entries(rec || {}).forEach(([h, v]) => {
          norm[normalizeHeader(h)] = (v ?? '').toString().trim();
        });
        const r = {};
        FIELDS.forEach((k) => { r[k] = norm[k] ?? ''; });
        return r;
      });

    (async () => {
      try {
        const rows = await parseWithPapa(csvURL, true);
        state.originalData = mapRows(rows);
      } catch (e1) {
        console.warn('[CSV] Papa worker failed, retrying without worker', e1);
        try {
          const rows = await parseWithPapa(csvURL, false);
          state.originalData = mapRows(rows);
        } catch (e2) {
          console.warn('[CSV] Fallback to fetch+parse', e2);
          try {
            const text = await fetch(csvURL).then((r) => {
              if (!r.ok) throw new Error('HTTP ' + r.status);
              return r.text();
            });
            const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
            const rows = parsed?.data || [];
            state.originalData = mapRows(rows);
          } catch (e3) {
            console.error('[CSV] All strategies failed', e3);
            showToast(labels.csv_error[state.lang], 'error');
            showLoading(false);
            return;
          }
        }
      }

      state.filteredData = state.originalData.slice(0);
      populateFilters();
      syncFiltersUIFromState();
      applyAll();
      showLoading(false);
    })();

  } else {
    const embedded =
      window.EMBEDDED_DATA ||
      window.embeddedData ||
      window.EMBEDDED ||
      window.embedded ||
      [];

    state.originalData = (embedded || []).map((rec) => {
      const r = {};
      FIELDS.forEach((k) => { r[k] = (rec?.[k] ?? '').toString().trim(); });
      return r;
    });

    state.filteredData = state.originalData.slice(0);
    populateFilters();
    syncFiltersUIFromState();
    applyAll();
    showLoading(false);
  }
}

/* =============================
   סנכרון UI ←→ State
==============================*/
function syncFiltersUIFromState(){
  if (dom.searchInput) dom.searchInput.value = state.filters.search || '';
  if (dom.locationFilter) dom.locationFilter.value = state.filters.location || '';
  if (dom.orgFilter) dom.orgFilter.value = state.filters.org || '';
  if (dom.rankFilter) dom.rankFilter.value = state.filters.rank || '';
  if (dom.dateFromInput) dom.dateFromInput.value = state.filters.dateFrom ? state.filters.dateFrom.toISOString().slice(0,10) : '';
  if (dom.dateToInput)   dom.dateToInput.value   = state.filters.dateTo   ? state.filters.dateTo.toISOString().slice(0,10)   : '';
  if (dom.pageSizeSelect) dom.pageSizeSelect.value = String(state.pagination.pageSize);
  updateFiltersBadge();
  renderFilterChips();
}

/* =============================
   URL persist/restore
==============================*/
function persistStateToURL(){
  const p = new URLSearchParams();
  const {filters, sort, pagination} = state;
  if (filters.search)   p.set('q', filters.search);
  if (filters.location) p.set('loc', filters.location);
  if (filters.org)      p.set('org', filters.org);
  if (filters.rank)     p.set('rank', filters.rank);
  if (filters.dateFrom) p.set('from', filters.dateFrom.toISOString().slice(0,10));
  if (filters.dateTo)   p.set('to',   filters.dateTo.toISOString().slice(0,10));
  if (sort.key)         p.set('sort', `${sort.key}:${sort.direction}`);
  if (pagination.currentPage) p.set('page', pagination.currentPage);
  p.set('ps', pagination.pageSize);
  history.replaceState(null, '', `${location.pathname}?${p.toString()}`);
}

function restoreStateFromURL(){
  const p = new URLSearchParams(location.search);
  state.filters.search   = p.get('q')    || '';
  state.filters.location = p.get('loc')  || '';
  state.filters.org      = p.get('org')  || '';
  state.filters.rank     = p.get('rank') || '';
  state.filters.dateFrom = parseInputDate(p.get('from'), false);
  state.filters.dateTo   = parseInputDate(p.get('to'),   true);
  const s = p.get('sort'); if (s){ const [k,d] = s.split(':'); state.sort={key:k,direction:d==='desc'?'desc':'asc'}; }
  const ps = Number(p.get('ps') || 0); if (ps) state.pagination.pageSize = ps;
  state.pagination.currentPage = Number(p.get('page')||0) || 0;
}

/* =============================
   פילטרים + חיפוש + תאריכים
==============================*/
function recordMatchesFilters(r) {
  const eq = (a,b) => (String(a||'').trim().toLowerCase() === String(b||'').trim().toLowerCase());

  const okLocation = !state.filters.location || eq(r.location, state.filters.location);
  const okOrg      = !state.filters.org      || eq(r.organization, state.filters.org);
  const okRank     = !state.filters.rank     || eq(r.rank_role, state.filters.rank);

  const hay = [
    r.name_english, r.name_arabic, r.nickname, r.description_online,
    r.location, r.organization, r.rank_role, r.notes
  ].join(' ').toLowerCase();
  const okSearch = !state.filters.search || hay.includes(state.filters.search.toLowerCase());

  let okDate = true;
  if (state.filters.dateFrom || state.filters.dateTo) {
    const rng = parseDateRange(r.date);
    if (!rng) okDate = false;
    else {
      const from = state.filters.dateFrom || new Date(-8640000000000000);
      const to   = state.filters.dateTo   || new Date( 8640000000000000);
      okDate = !(rng.to < from || rng.from > to);
    }
  }
  return okLocation && okOrg && okRank && okSearch && okDate;
}

function applyAll() {
  state.filteredData = state.originalData.filter(recordMatchesFilters);
  state.pagination.currentPage = 0;
  sortData();
  render();
  persistStateToURL();
  updateFiltersBadge();
  renderFilterChips();
}

function onSearch(e) {
  state.suppressNextScroll = true;
  state.filters.search = e.target.value || '';
  applyAll();
}

function populateFilters() {
  const uniq = (arr) => Array.from(new Set(arr.filter(Boolean))).sort((a,b)=>a.localeCompare(b));
  const locs = uniq(state.originalData.map(r=>r.location));
  const orgs = uniq(state.originalData.map(r=>r.organization));
  const ranks= uniq(state.originalData.map(r=>r.rank_role));

  const fill = (select, list) => {
    if (!select) return;
    const prev = select.value || '';
    select.innerHTML = `<option value="">${labels.all_option[state.lang]}</option>` +
      list.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
    const want = (select === dom.locationFilter && state.filters.location) ? state.filters.location
               : (select === dom.orgFilter      && state.filters.org)      ? state.filters.org
               : (select === dom.rankFilter     && state.filters.rank)     ? state.filters.rank
               : prev;
    select.value = want || '';
  };

  fill(dom.locationFilter, locs);
  fill(dom.orgFilter, orgs);
  fill(dom.rankFilter, ranks);
}

/* =============================
   מיון + רינדור
==============================*/
function getComparable(a, key){
  if (key === 'date') {
    const rng = parseDateRange(a[key]);
    return rng ? rng.from.getTime() : -Infinity;
  }
  if (key === 'post_id' || key === 'combatant_id' || key === 'casualties_count') {
    const n = Number((a[key]??'').toString().replace(/[^\d.-]/g,''));
    return Number.isFinite(n) ? n : -Infinity;
  }
  return (a[key] ?? '').toString().toLowerCase();
}

function sortData() {
  if (!state.sort.key) return;
  const { key, direction } = state.sort;
  const dir = direction === 'asc' ? 1 : -1;

  state.filteredData = state.filteredData
    .map((v, i) => ({ v, i }))
    .sort((A, B) => {
      const x = getComparable(A.v, key);
      const y = getComparable(B.v, key);
      if (x < y) return -1 * dir;
      if (x > y) return  1 * dir;
      return A.i - B.i;
    })
    .map(o => o.v);
}

function clearContent(){ if (dom.contentArea) dom.contentArea.innerHTML=''; }

function render() {
  clearContent();
  if (!dom.contentArea) return;

  updateStats();
  updateResultsBar();
  updatePagerButtons();

  const total = state.filteredData.length;

  if (total === 0) {
    if (dom.emptyState) dom.emptyState.classList.remove('hidden');
    else if (dom.contentArea) dom.contentArea.innerHTML = `<div class="empty">${labels.no_data[state.lang]}</div>`;
    return;
  } else {
    if (dom.emptyState) dom.emptyState.classList.add('hidden');
  }

  const page = state.pagination.currentPage;
  const size = state.pagination.pageSize;
  const slice = state.filteredData.slice(page*size, (page+1)*size);

  if (state.isCardView) renderCards(slice); else renderTable(slice);
  scrollTopIfNeeded();
}

function renderCards(rows) {
  const frag = document.createDocumentFragment();
  const container = document.createElement('div');
  container.className = 'cards';
  rows.forEach(r => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <header class="card__title">
        <strong>${escapeHtml(r.name_english || r.nickname || r.name_arabic || '-')}</strong>
        <small>${escapeHtml(r.rank_role || '')}</small>
      </header>
      <ul class="card__list">
        <li><b>${fieldLabels.location[state.lang]}:</b> ${highlight(r.location, state.filters.search)}</li>
        <li><b>${fieldLabels.date[state.lang]}:</b> ${escapeHtml(r.date || '-')}</li>
        <li><b>${fieldLabels.organization[state.lang]}:</b> ${highlight(r.organization, state.filters.search)}</li>
        <li><b>${fieldLabels.description_online[state.lang]}:</b> ${highlight(r.description_online, state.filters.search)}</li>
      </ul>
    `;
    container.appendChild(card);
  });
  frag.appendChild(container);
  dom.contentArea.appendChild(frag);
}

function renderTable(rows) {
  const table = document.createElement('table');
  table.className = 'data-table';

  const thead = document.createElement('thead');
  const trh = document.createElement('tr');
  FIELDS.forEach(key => {
    const th = document.createElement('th');
    th.textContent = fieldLabels[key][state.lang];
    th.dataset.key = key;
    th.tabIndex = 0;
    th.addEventListener('click', () => setSort(key));
    th.addEventListener('keydown', (e)=>{ if(e.key==='Enter'||e.key===' ') { e.preventDefault(); setSort(key); }});
    if (state.sort.key === key) {
      th.classList.add(state.sort.direction === 'asc' ? 'sort-asc' : 'sort-desc');
      th.setAttribute('aria-sort', state.sort.direction === 'asc' ? 'ascending' : 'descending');
    } else {
      th.removeAttribute('aria-sort');
    }
    trh.appendChild(th);
  });
  thead.appendChild(trh);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const frag = document.createDocumentFragment();
  rows.forEach(r => {
    const tr = document.createElement('tr');
    FIELDS.forEach(key => {
      const td = document.createElement('td');
      const val = r[key] || '';
      td.innerHTML = (key === 'location' || key === 'organization' || key === 'name_english' || key === 'name_arabic' || key === 'nickname' || key === 'description_online')
        ? highlight(val, state.filters.search)
        : escapeHtml(val);
      tr.appendChild(td);
    });
    frag.appendChild(tr);
  });
  tbody.appendChild(frag);
  table.appendChild(tbody);

  dom.contentArea.appendChild(table);
}

function setSort(key){
  state.suppressNextScroll = true;
  if (state.sort.key === key) {
    state.sort.direction = (state.sort.direction === 'asc') ? 'desc' : 'asc';
  } else {
    state.sort.key = key;
    state.sort.direction = 'asc';
  }
  sortData();
  render();
  persistStateToURL();
}

function updateResultsBar() {
  const total = state.filteredData.length;
  const pages = Math.max(1, Math.ceil(total / state.pagination.pageSize));
  const current = Math.min(pages, state.pagination.currentPage + 1);

  if (dom.resultsCounter) { 
    dom.resultsCounter.textContent = labels.results_found[state.lang].replace('{count}', nf().format(total));
    dom.resultsCounter.classList.remove('hidden');
    dom.resultsCounter.setAttribute('aria-live','polite');
    dom.resultsCounter.setAttribute('role','status');
  }
  if (dom.pageInfo) {
    dom.pageInfo.textContent = labels.page[state.lang].replace('{c}', current).replace('{t}', pages);
    dom.pageInfo.setAttribute('aria-live','polite');
    dom.pageInfo.setAttribute('role','status');
  }
}

function updatePagerButtons() {
  const total = state.filteredData.length;
  const pages = Math.max(1, Math.ceil(total / state.pagination.pageSize));
  const current = state.pagination.currentPage;
  if (dom.prevPageBtn) dom.prevPageBtn.disabled = current <= 0;
  if (dom.nextPageBtn) dom.nextPageBtn.disabled = current >= pages - 1;
}

/* פחות גלילה אוטומטית: לא במובייל, ורק אם רחוקים מראש העמוד, ולא אחרי שפה/פילטרים */
function scrollTopIfNeeded() {
  if (state.isMobile) { state.suppressNextScroll = false; return; }
  if (state.suppressNextScroll) { state.suppressNextScroll = false; return; }
  if (!dom.contentArea || !dom.contentArea.scrollIntoView) return;
  if (window.scrollY < 300) return;
  dom.contentArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* =============================
   סטטיסטיקות
==============================*/
function updateStats() {
  const fmt = nf();
  if (dom.totalCombatants || dom.totalCasualties || dom.familyCasualties || dom.highRanking) {
    const total = state.filteredData.length;
    const casualties = state.filteredData.reduce((sum,r)=> sum + (parseInt(r.casualties_count||0,10) || 0), 0);
    const family = state.filteredData.filter(r=>/\bמשפחה\b|\bfamily\b/i.test(r.family_members||'')).length;
    const high = state.filteredData.filter(r=>/\bמפקד\b|מג"ד|סגן|קצין|\bcommander\b|\bchief\b|\brank\b/i.test(r.rank_role||'')).length;

    if (dom.totalCombatants) dom.totalCombatants.textContent = fmt.format(total);
    if (dom.totalCasualties) dom.totalCasualties.textContent = fmt.format(casualties);
    if (dom.familyCasualties) dom.familyCasualties.textContent = fmt.format(family);
    if (dom.highRanking) dom.highRanking.textContent = fmt.format(high);
  }

  if (d('statsTotal') || d('statsByLocation') || d('statsByOrg') || d('statsByRank')) {
    const sT = d('statsTotal'); if (sT) sT.textContent = nf().format(state.filteredData.length);
  }
}

/* =============================
   CSV Export
==============================*/
function exportToCSV() {
  if (!state.filteredData.length) {
    showToast(labels.export_no_data[state.lang], 'warning');
    return;
  }
  const sep = ',';
  const header = FIELDS.map(k => `"${fieldLabels[k][state.lang].replace(/"/g,'""')}"`).join(sep);
  const rows = state.filteredData.map(r=> FIELDS.map(k => `"${String(r[k]??'').replace(/"/g,'""')}"`).join(sep)).join('\n');
  const csv = '\uFEFF' + header + '\n' + rows;

  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url  = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'export.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  showToast(labels.export_success[state.lang]);
}

/* =============================
   Utility UI
==============================*/
function showLoading(on){ if (!dom.loadingOverlay) return; dom.loadingOverlay.classList.toggle('hidden', !on); }

/* =============================
   Page Size
==============================*/
const PAGE_SIZES = [25,50,100];
function setPageSize(n){
  n = Number(n);
  if (!PAGE_SIZES.includes(n)) return;
  state.pagination.pageSize = n;
  state.pagination.currentPage = 0;
  localStorage.setItem('pageSize', String(n));
  state.suppressNextScroll = true;
  render();
  persistStateToURL();
}

/* =============================
   MOBILE: Filter Chips + Badge
==============================*/
function countActiveFilters(){
  let n = 0;
  const f = state.filters;
  if (f.location) n++;
  if (f.org) n++;
  if (f.rank) n++;
  if (f.search) n++;
  if (f.dateFrom || f.dateTo) n++;
  return n;
}

function updateFiltersBadge(){
  if (!dom.mobileFiltersToggle) return;
  const base = state.lang==='he' ? labels.open_filters.he : labels.open_filters.en;
  const n = countActiveFilters();
  const badgeText = n ? (state.lang==='he'
                         ? labels.active_filters.he.replace('{n}', n)
                         : labels.active_filters.en.replace('{n}', n))
                      : '';
  const span = dom.mobileFiltersToggle.querySelector('span');
  if (span) {
    span.textContent = n ? `${base} ${badgeText}` : base;
  } else {
    dom.mobileFiltersToggle.textContent = n ? `${base} ${badgeText}` : base;
  }
  dom.mobileFiltersToggle.setAttribute('aria-label', (span?span.textContent:dom.mobileFiltersToggle.textContent));
}

/* יוצר/מעדכן מיכל צ’יפים מתחת לאיזור העליון */
function ensureChipsWrap(){
  if (chipsWrap) return chipsWrap;
  chipsWrap = document.createElement('div');
  chipsWrap.id = 'filterChips';
  chipsWrap.style.display = 'flex';
  chipsWrap.style.flexWrap = 'wrap';
  chipsWrap.style.gap = '6px';
  chipsWrap.style.margin = '8px 0';
  chipsWrap.style.alignItems = 'center';
  if (dom.contentArea && dom.contentArea.parentNode) {
    dom.contentArea.parentNode.insertBefore(chipsWrap, dom.contentArea);
  } else {
    document.body.insertBefore(chipsWrap, document.body.firstChild);
  }
  return chipsWrap;
}

function renderFilterChips(){
  const n = countActiveFilters();
  if (!n) { if (chipsWrap) chipsWrap.innerHTML=''; return; }

  const wrap = ensureChipsWrap();
  const makeChip = (label, onClear) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.setAttribute('aria-label', (state.lang==='he' ? 'הסר מסנן ' : 'Clear filter ') + label);
    chip.style.border = '1px solid #444';
    chip.style.padding = '4px 8px';
    chip.style.borderRadius = '999px';
    chip.style.fontSize = '12px';
    chip.style.cursor = 'pointer';
    chip.style.background = '#222';
    chip.style.color = '#eee';
    chip.innerHTML = `${escapeHtml(label)} &times;`;
    chip.addEventListener('click', onClear);
    return chip;
  };

  const items = [];
  const f = state.filters;
  if (f.location) items.push(makeChip(`${fieldLabels.location[state.lang]}: ${f.location}`, ()=>{ f.location=''; syncFiltersUIFromState(); state.suppressNextScroll=true; applyAll(); }));
  if (f.org)      items.push(makeChip(`${fieldLabels.organization[state.lang]}: ${f.org}`, ()=>{ f.org=''; syncFiltersUIFromState(); state.suppressNextScroll=true; applyAll(); }));
  if (f.rank)     items.push(makeChip(`${fieldLabels.rank_role[state.lang]}: ${f.rank}`, ()=>{ f.rank=''; syncFiltersUIFromState(); state.suppressNextScroll=true; applyAll(); }));
  if (f.search)   items.push(makeChip((state.lang==='he'?'חיפוש: ':'Search: ')+f.search, ()=>{ f.search=''; syncFiltersUIFromState(); state.suppressNextScroll=true; applyAll(); }));
  if (f.dateFrom || f.dateTo) {
    const df = f.dateFrom ? f.dateFrom.toISOString().slice(0,10) : '';
    const dt = f.dateTo   ? f.dateTo.toISOString().slice(0,10)   : '';
    const lbl = state.lang==='he' ? `תאריכים: ${df}–${dt}` : `Dates: ${df}–${dt}`;
    items.push(makeChip(lbl, ()=>{ f.dateFrom=null; f.dateTo=null; syncFiltersUIFromState(); state.suppressNextScroll=true; applyAll(); }));
  }

  wrap.innerHTML = '';
  items.forEach(x=>wrap.appendChild(x));
}

/* =============================
   MOBILE: Bottom Sheet for Filters (כהה)
==============================*/
function ensureFilterSheet(){
  if (sheet && sheetBackdrop && sheetContent) return;

  // רקע כהה יותר
  sheetBackdrop = document.createElement('div');
  sheetBackdrop.id = 'filterBackdrop';
  Object.assign(sheetBackdrop.style, {
    position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.55)',
    opacity: '0', visibility: 'hidden', transition: 'opacity 150ms',
    zIndex: '1000'
  });
  sheetBackdrop.addEventListener('click', closeFiltersSheet);

  // Sheet כהה
  sheet = document.createElement('div');
  sheet.id = 'filterSheet';
  sheet.setAttribute('role','dialog');
  sheet.setAttribute('aria-modal','true');
  sheet.setAttribute('aria-label', labels.filters_title[state.lang]);
  Object.assign(sheet.style, {
    position: 'fixed', left: '0', right: '0', bottom: '0',
    maxHeight: '88vh', height: 'auto', background: '#14171c', color: '#e8e8e8',
    borderTopLeftRadius: '12px', borderTopRightRadius: '12px',
    boxShadow: '0 -10px 30px rgba(0,0,0,0.4)',
    transform: 'translateY(100%)', transition: 'transform 220ms',
    zIndex: '1001', display: 'flex', flexDirection: 'column'
  });

  // Header
  const header = document.createElement('div');
  Object.assign(header.style, { padding: '12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid #2a2f36' });
  const title = document.createElement('strong');
  title.textContent = labels.filters_title[state.lang];
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = '✕';
  Object.assign(closeBtn.style, { color:'#e8e8e8', fontSize:'16px', lineHeight:'1', padding:'6px 10px', cursor:'pointer', background:'transparent', border:'none' });
  closeBtn.setAttribute('aria-label', labels.close[state.lang]);
  closeBtn.addEventListener('click', closeFiltersSheet);
  header.appendChild(title); header.appendChild(closeBtn);
  sheetCloseBtn = closeBtn;

  // Content
  sheetContent = document.createElement('div');
  Object.assign(sheetContent.style, { overflow:'auto', padding:'8px 16px', flex:'1 1 auto' });

  // Footer – כפתור איפוס יחיד
  const footer = document.createElement('div');
  Object.assign(footer.style, { padding:'12px 16px', display:'flex', gap:'8px', borderTop:'1px solid #2a2f36' });
  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.textContent = labels.reset_filters[state.lang];
  Object.assign(resetBtn.style, { flex:'1', padding:'10px', fontWeight:'600', cursor:'pointer', background:'#1f232a', color:'#e8e8e8', border:'1px solid #30343b', borderRadius:'8px' });
  resetBtn.addEventListener('click', ()=>{ dom.resetBtn?.click(); });
  sheetResetBtn = resetBtn;

  footer.appendChild(resetBtn);

  sheet.appendChild(header);
  sheet.appendChild(sheetContent);
  sheet.appendChild(footer);

  document.body.appendChild(sheetBackdrop);
  document.body.appendChild(sheet);

  document.addEventListener('keydown', onEscCloseFilters);
}

/* החלת סטייל כהה על אלמנטים בתוך ה-sheet */
function styleFiltersBarDark(){
  if (!dom.filtersBar) return;
  dom.filtersBar.style.color = '#e8e8e8';
  dom.filtersBar.querySelectorAll('select, input, button').forEach(el=>{
    el.style.background = '#1a1f24';
    el.style.color = '#e8e8e8';
    el.style.borderColor = '#2c3238';
  });
}

function openFiltersSheet(){
  ensureFilterSheet();

  // צור עוגן להחזרת ה-filtersBar בדסקטופ
  if (!filtersBarAnchor && dom.filtersBar && dom.filtersBar.parentNode) {
    filtersBarAnchor = document.createComment('filtersBar-anchor');
    dom.filtersBar.parentNode.insertBefore(filtersBarAnchor, dom.filtersBar);
  }

  // הזז את סרגל הפילטרים לתוך ה-sheet
  if (dom.filtersBar && sheetContent && dom.filtersBar !== sheetContent.firstChild) {
    sheetContent.appendChild(dom.filtersBar);
    Object.assign(dom.filtersBar.style, { display:'block', maxHeight:'inherit' });
    styleFiltersBarDark();
  }

  syncFiltersUIFromState();
  sheetBackdrop.style.visibility = 'visible';
  sheetBackdrop.style.opacity = '1';
  sheet.style.transform = 'translateY(0)';
  document.body.style.overflow = 'hidden';

  setTimeout(()=>{ try { (sheet.querySelector('select, input, button, textarea, [tabindex]:not([tabindex="-1"])')||sheetCloseBtn).focus(); } catch{} }, 30);
}

function closeFiltersSheet(){
  if (!sheet || !sheetBackdrop) return;
  sheet.style.transform = 'translateY(100%)';
  sheetBackdrop.style.opacity = '0';
  sheetBackdrop.style.visibility = 'hidden';
  document.body.style.overflow = '';

  // החזרת filtersBar לדסקטופ
  if (!state.isMobile && filtersBarAnchor && dom.filtersBar) {
    filtersBarAnchor.parentNode.insertBefore(dom.filtersBar, filtersBarAnchor.nextSibling);
    dom.filtersBar.style.maxHeight = '';
    dom.filtersBar.style.display = '';
  }
}

function onEscCloseFilters(e){
  if (e.key === 'Escape' && sheet && sheetBackdrop && sheetBackdrop.style.visibility === 'visible') {
    closeFiltersSheet();
  }
}

/* =============================
   Responsive setup
==============================*/
function setupResponsive(){
  state.isMobile = isMobile();

  // עדכון טקסטים
  if (sheetCloseBtn) sheetCloseBtn.setAttribute('aria-label', labels.close[state.lang]);
  if (sheetResetBtn) sheetResetBtn.textContent = labels.reset_filters[state.lang];

  if (state.isMobile) {
    // ודא שה-filtersBar לא יוצג מעל הכרטיסים
    if (dom.filtersBar) dom.filtersBar.style.display = 'none';
    // העבר לתוך sheet כבר עכשיו כדי למנוע "פלאש"
    ensureFilterSheet();
    if (dom.filtersBar && sheetContent && dom.filtersBar.parentNode !== sheetContent) {
      sheetContent.appendChild(dom.filtersBar);
      styleFiltersBarDark();
    }
    // הסתר כפתור איפוס חיצוני – אין כפילות
    if (dom.resetBtn) dom.resetBtn.style.display = 'none';
  } else {
    // בדסקטופ – החזר את סרגל הפילטרים למקומו
    if (filtersBarAnchor && dom.filtersBar && dom.filtersBar.parentNode !== filtersBarAnchor.parentNode) {
      filtersBarAnchor.parentNode.insertBefore(dom.filtersBar, filtersBarAnchor.nextSibling);
      dom.filtersBar.style.display = '';
      dom.filtersBar.style.maxHeight = '';
    }
    // החזר את כפתור האיפוס הראשי
    if (dom.resetBtn) dom.resetBtn.style.display = '';
    closeFiltersSheet();
  }

  state.isCardView = state.isMobile ? true : state.isCardView;
  updateViewToggleUI();
  updateFiltersBadge();
  renderFilterChips();
}

/* =============================
   הפעלה
==============================*/
function init() {
  restoreStateFromURL();

  if (!new URLSearchParams(location.search).get('ps')) {
    const saved = Number(localStorage.getItem('pageSize'));
    if (PAGE_SIZES.includes(saved)) state.pagination.pageSize = saved;
  }

  setLangButtonUI();
  if (dom.searchInput) dom.searchInput.placeholder = labels.search_placeholder[state.lang];
  updateViewToggleUI();

  dom.resultsCounter?.setAttribute('aria-live','polite');
  dom.pageInfo?.setAttribute('aria-live','polite');

  bindEvents();
  setupResponsive();
  loadData();
}

/* =============================
   Events
==============================*/
function bindEvents() {
  // Back to Top
  const b2t = d('backToTop');
  if (b2t) b2t.addEventListener('click', ()=>window.scrollTo({top:0,behavior:'smooth'}));
  window.addEventListener('scroll', () => {
    const btn = d('backToTop');
    if (!btn) return;
    const show = window.scrollY > 400;
    btn.classList.toggle('hidden', !show);
  });

  // תגובה לשינוי רוחב מסך
  if (mq.addEventListener) mq.addEventListener('change', setupResponsive);
  else mq.addListener && mq.addListener(setupResponsive);

  // חיפוש (debounce) + Escape
  if (dom.searchInput) {
    dom.searchInput.placeholder = labels.search_placeholder[state.lang];
    dom.searchInput.addEventListener('input', debounce(onSearch, 200));
    dom.searchInput.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') dom.resetBtn?.click(); });
  }

  // פילטרים select
  const upd = () => { state.pagination.currentPage = 0; state.suppressNextScroll = true; applyAll(); };
  if (dom.locationFilter) dom.locationFilter.addEventListener('change', () => { state.filters.location = dom.locationFilter.value; upd(); });
  if (dom.orgFilter)      dom.orgFilter.addEventListener('change', () => { state.filters.org      = dom.orgFilter.value; upd(); });
  if (dom.rankFilter)     dom.rankFilter.addEventListener('change', () => { state.filters.rank     = dom.rankFilter.value; upd(); });

  // טווח תאריכים
  if (dom.dateFromInput) dom.dateFromInput.addEventListener('change', ()=>{
    state.filters.dateFrom = parseInputDate(dom.dateFromInput.value, false); upd();
  });
  if (dom.dateToInput) dom.dateToInput.addEventListener('change', ()=>{
    state.filters.dateTo = parseInputDate(dom.dateToInput.value, true);  upd();
  });
  if (dom.clearDatesBtn) dom.clearDatesBtn.addEventListener('click', ()=>{
    if (dom.dateFromInput) dom.dateFromInput.value = '';
    if (dom.dateToInput) dom.dateToInput.value = '';
    state.filters.dateFrom = null; state.filters.dateTo = null; upd();
  });

  // פגינציה
  const gotoPrev = ()=>{
    if (state.pagination.currentPage > 0) {
      state.pagination.currentPage--;
      state.suppressNextScroll = true;
      render(); persistStateToURL();
    }
  };
  const gotoNext = ()=>{
    const total = state.filteredData.length;
    const pages = Math.max(1, Math.ceil(total / state.pagination.pageSize));
    if (state.pagination.currentPage < pages-1) {
      state.pagination.currentPage++;
      state.suppressNextScroll = true;
      render(); persistStateToURL();
    }
  };
  if (dom.prevPageBtn) {
    dom.prevPageBtn.addEventListener('click', gotoPrev);
    dom.prevPageBtn.addEventListener('keydown', (e)=>{ if (e.key==='Enter'||e.key===' ') { e.preventDefault(); gotoPrev(); } if (e.key==='ArrowLeft') gotoPrev(); });
  }
  if (dom.nextPageBtn) {
    dom.nextPageBtn.addEventListener('click', gotoNext);
    dom.nextPageBtn.addEventListener('keydown', (e)=>{ if (e.key==='Enter'||e.key===' ') { e.preventDefault(); gotoNext(); } if (e.key==='ArrowRight') gotoNext(); });
  }

  // Page Size
  if (dom.pageSizeSelect) {
    if (!dom.pageSizeSelect.options.length) {
      PAGE_SIZES.forEach(n => {
        const opt = document.createElement('option');
        opt.value = String(n); opt.textContent = String(n);
        dom.pageSizeSelect.appendChild(opt);
      });
    }
    dom.pageSizeSelect.value = String(state.pagination.pageSize);
    dom.pageSizeSelect.addEventListener('change', (e)=> setPageSize(e.target.value));
  }

  // CSV
  if (dom.exportBtn) dom.exportBtn.addEventListener('click', exportToCSV);

  // תצוגה: כרטיסים/טבלה
  if (dom.viewToggleBtn) dom.viewToggleBtn.addEventListener('click', ()=>{
    state.isCardView = !state.isCardView;
    state.suppressNextScroll = true;
    updateViewToggleUI();
    render();
  });

  // שפה
  if (dom.langBtn) dom.langBtn.addEventListener('click', ()=>{
    state.lang = (state.lang==='he') ? 'en' : 'he';
    if (dom.searchInput) dom.searchInput.placeholder = labels.search_placeholder[state.lang];
    state.suppressNextScroll = true; // אל תגלול למעלה כשהחלפנו שפה
    render();
    setLangButtonUI();
    updateViewToggleUI();
    if (sheet) {
      sheet.setAttribute('aria-label', labels.filters_title[state.lang]);
      if (sheetResetBtn) sheetResetBtn.textContent = labels.reset_filters[state.lang];
      const title = sheet.querySelector('strong'); if (title) title.textContent = labels.filters_title[state.lang];
    }
    updateFiltersBadge();
    renderFilterChips();
  });

  // מובייל: פתיחת פילטרים
  if (dom.mobileFiltersToggle) {
    const labelSpan = dom.mobileFiltersToggle.querySelector('span') || dom.mobileFiltersToggle;
    dom.mobileFiltersToggle.addEventListener('click', ()=>{
      if (state.isMobile) {
        openFiltersSheet();
      } else if (dom.filtersBar) {
        const open = dom.filtersBar.classList.toggle('open');
        dom.mobileFiltersToggle.setAttribute('aria-expanded', String(open));
        labelSpan.textContent = open ? labels.close_filters[state.lang] : labels.open_filters[state.lang];
      }
    });
  }

  // --- איפוס פילטרים ---
  if (dom.resetBtn) {
    dom.resetBtn.addEventListener('click', () => {
      if (dom.searchInput) dom.searchInput.value = '';
      ['locationFilter','orgFilter','rankFilter'].forEach(id => {
        const el = d(id);
        if (el) el.value = '';
      });
      if (dom.dateFromInput) dom.dateFromInput.value = '';
      if (dom.dateToInput)   dom.dateToInput.value   = '';
      if (dom.pageSizeSelect) dom.pageSizeSelect.value = String(state.pagination.pageSize);

      state.filters = { location: '', org: '', rank: '', search: '', dateFrom: null, dateTo: null };
      state.sort = { key: null, direction: 'asc' };
      state.pagination.currentPage = 0;

      populateFilters();
      state.suppressNextScroll = true;
      applyAll();

      showToast(labels.reset_filters[state.lang], 'info');
    });
  }
}

/* התחל */
document.addEventListener('DOMContentLoaded', init);
