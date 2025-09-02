/* ==========================================================
   מאגר זיהוי לוחמים – לוגיקה ראשית (גרסת שדרוגים)
   כלול:
   1) highlight בטוח ל-HTML
   2) debounce לחיפוש
   3) מיון חכם (תאריכים/מספרים) + מיון יציב
   5) נגישות: aria-live, aria-sort, ניווט מקלדת לפאג'ינציה
   6) שמירת מצב ל-URL (Deep-linking) ושחזור
   7) Page-Size דינמי + זכירת בחירה
   10) i18n למספרים לפי השפה
   11) ניקוי: הסרת פונקציות לא בשימוש, יישור שמות
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
};

/* =============================
   State
==============================*/
const state = {
  originalData: [],
  filteredData: [],
  lang: (navigator.language || '').startsWith('he') ? 'he' : 'en',
  isCardView: window.innerWidth <= 768,  // ברירת מחדל: כרטיסים במסכים צרים
  sort: { key: null, direction: 'asc' },
  pagination: { pageSize: 50, currentPage: 0 },
  filters: {
    location: '',
    org: '',
    rank: '',
    search: '',
    dateFrom: null,
    dateTo: null
  }
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

  // סטטיסטיקות – יתעדכנו אם קיימים בדף
  totalCombatants: d('totalCombatants'),
  totalCasualties: d('totalCasualties'),
  familyCasualties: d('familyCasualties'),
  highRanking: d('highRanking'),

  statsTotal: d('statsTotal'),
  statsByLocation: d('statsByLocation'),
  statsByOrg: d('statsByOrg'),
  statsByRank: d('statsByRank'),
};

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

/* --- תאריך: תומך תאריך בודד + טווחים עם מפרידים ברורים (כפי שסוכם) --- */
function parseDateRange(s) {
  if (!s) return null;
  const t = String(s).trim();

  // קודם ננסה תאריך בודד (כמו 2024-08-09)
  const single = new Date(t);
  if (!Number.isNaN(single.getTime())) {
    const from = new Date(single); from.setHours(0,0,0,0);
    const to   = new Date(single); to.setHours(23,59,59,999);
    return { from, to };
  }

  // אחרת – טווח מפורש עם מפרידים " – ", " — ", " ~ ", " to ", " - " (עם רווחים)
  const parts = t.split(/\s*(?:–|—|~| to | - )\s*/i);
  const from = new Date(parts[0]);
  const to   = new Date(parts[1] || parts[0]);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  to.setHours(23,59,59,999);
  return { from, to };
}

/* highlight בטוח: מפצל לפי ה-query, בורח כל חלק, ומדגיש רק את ההתאמות */
function escapeRegExp(s){ return String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }
function highlight(val, q) {
  const s = String(val ?? '');
  if (!q) return escapeHtml(s);
  const re = new RegExp(`(${escapeRegExp(q)})`, 'ig');
  return s.split(re).map((part, i) =>
    i % 2 ? `<mark>${escapeHtml(part)}</mark>` : escapeHtml(part)
  ).join('');
}

/* debounce לחיפוש */
function debounce(fn, ms=200){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }

/* עזרי UI */
function setLangButtonUI() {
  if (!dom.langBtn) return;
  const span = dom.langBtn.querySelector('span') || dom.langBtn;
  span.textContent = labels.lang_switch[state.lang];
  dom.langBtn.setAttribute('aria-pressed', state.lang === 'en' ? 'true' : 'false');
  dom.langBtn.setAttribute('aria-controls', dom.contentArea?.id || 'contentArea');
}

function updateViewToggleUI(){
  if (!dom.viewToggleBtn) return;
  const span = dom.viewToggleBtn.querySelector('span') || dom.viewToggleBtn;
  const toCards = state.lang==='he' ? 'עבור לתצוגת כרטיסים' : 'Switch to Cards';
  const toTable = state.lang==='he' ? 'עבור לתצוגת טבלה'   : 'Switch to Table';
  span.textContent = state.isCardView ? toTable : toCards;
  dom.viewToggleBtn.setAttribute('aria-pressed', state.isCardView ? 'true' : 'false');
  dom.viewToggleBtn.setAttribute('aria-controls', dom.contentArea?.id || 'contentArea');
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
            showToast('שגיאה בטעינת CSV', 'error');
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
}

/* =============================
   שמירת מצב ל-URL ושחזור (6)
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

  // חיפוש חופשי
  const hay = [
    r.name_english, r.name_arabic, r.nickname, r.description_online,
    r.location, r.organization, r.rank_role, r.notes
  ].join(' ').toLowerCase();
  const okSearch = !state.filters.search || hay.includes(state.filters.search.toLowerCase());

  // טווח תאריכים
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
}

function onSearch(e) {
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
    select.innerHTML = `<option value="">${state.lang==='he'?'הכול':'All'}</option>` +
      list.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
    // אם ה-URL ביקש ערך – נעדיף אותו
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
    return rng ? rng.from.getTime() : -Infinity;   // מיון לפי תחילת הטווח
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

  // מיון יציב: שומרים אינדקס מקורי
  state.filteredData = state.filteredData
    .map((v, i) => ({ v, i }))
    .sort((A, B) => {
      const x = getComparable(A.v, key);
      const y = getComparable(B.v, key);
      if (x < y) return -1 * dir;
      if (x > y) return  1 * dir;
      return A.i - B.i; // יציבות
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

  // מצב "אין תוצאות" – משתמשים ב-#emptyState אם קיים
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

function scrollTopIfNeeded() {
  if (dom.contentArea && dom.contentArea.scrollIntoView) {
    dom.contentArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/* =============================
   סטטיסטיקות (10 – i18n)
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

  if (dom.statsTotal || dom.statsByLocation || dom.statsByOrg || dom.statsByRank) {
    if (dom.statsTotal) dom.statsTotal.textContent = nf().format(state.filteredData.length);
    if (dom.statsByLocation) dom.statsByLocation.textContent = '—';
    if (dom.statsByOrg) dom.statsByOrg.textContent = '—';
    if (dom.statsByRank) dom.statsByRank.textContent = '—';
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
   Page Size (7)
==============================*/
const PAGE_SIZES = [25,50,100];
function setPageSize(n){
  n = Number(n);
  if (!PAGE_SIZES.includes(n)) return;
  state.pagination.pageSize = n;
  state.pagination.currentPage = 0;
  localStorage.setItem('pageSize', String(n));
  render();
  persistStateToURL();
}

/* =============================
   הפעלה
==============================*/
function init() {
  // שחזור מצב קודם מה-URL
  restoreStateFromURL();

  // Page size מ-localStorage אם אין ב-URL
  if (!new URLSearchParams(location.search).get('ps')) {
    const saved = Number(localStorage.getItem('pageSize'));
    if (PAGE_SIZES.includes(saved)) state.pagination.pageSize = saved;
  }

  setLangButtonUI();
  if (dom.searchInput) dom.searchInput.placeholder = labels.search_placeholder[state.lang];
  updateViewToggleUI();

  // aria-live לאזורים מדברים
  dom.resultsCounter?.setAttribute('aria-live','polite');
  dom.pageInfo?.setAttribute('aria-live','polite');

  bindEvents();
  loadData();
}

function bindEvents() {
  // Back to Top: לחיצה
  const b2t = d('backToTop');
  if (b2t) b2t.addEventListener('click', ()=>window.scrollTo({top:0,behavior:'smooth'}));

  // Back to Top: הצגה/הסתרה לפי גלילה
  window.addEventListener('scroll', () => {
    const btn = d('backToTop');
    if (!btn) return;
    const show = window.scrollY > 400;
    btn.classList.toggle('hidden', !show);
  });

  // חיפוש (עם debounce) + קיצור Escape לאיפוס
  if (dom.searchInput) {
    dom.searchInput.placeholder = labels.search_placeholder[state.lang];
    dom.searchInput.addEventListener('input', debounce(onSearch, 200));
    dom.searchInput.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') dom.resetBtn?.click(); });
  }

  // פילטרים select
  const upd = () => { state.pagination.currentPage = 0; applyAll(); };
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

  // פגינציה: עכבר + מקלדת
  const gotoPrev = ()=>{
    if (state.pagination.currentPage > 0) {
      state.pagination.currentPage--;
      render(); persistStateToURL();
    }
  };
  const gotoNext = ()=>{
    const total = state.filteredData.length;
    const pages = Math.max(1, Math.ceil(total / state.pagination.pageSize));
    if (state.pagination.currentPage < pages-1) {
      state.pagination.currentPage++;
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
    // ודא שיש אופציות סבירות
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

  // כפתור CSV
  if (dom.exportBtn) dom.exportBtn.addEventListener('click', exportToCSV);

  // תצוגה: כרטיסים/טבלה
  if (dom.viewToggleBtn) dom.viewToggleBtn.addEventListener('click', ()=>{
    state.isCardView = !state.isCardView;
    updateViewToggleUI();
    render();
  });

  // שפה
  if (dom.langBtn) dom.langBtn.addEventListener('click', ()=>{
    state.lang = (state.lang==='he') ? 'en' : 'he';
    if (dom.searchInput) dom.searchInput.placeholder = labels.search_placeholder[state.lang];
    render();
    setLangButtonUI();
    updateViewToggleUI();
  });

  // מובייל: פתיחה/סגירה של פס פילטרים
  if (dom.mobileFiltersToggle && dom.filtersBar) {
    const labelSpan = dom.mobileFiltersToggle.querySelector('span') || dom.mobileFiltersToggle;
    dom.mobileFiltersToggle.setAttribute('aria-controls', dom.filtersBar.id || 'filtersBar');
    dom.mobileFiltersToggle.addEventListener('click', ()=>{
      const open = dom.filtersBar.classList.toggle('open');
      dom.mobileFiltersToggle.setAttribute('aria-expanded', String(open));
      labelSpan.textContent = open ? labels.close_filters[state.lang] : labels.open_filters[state.lang];
    });
  }

  // --- איפוס פילטרים ---
  if (dom.resetBtn) {
    dom.resetBtn.addEventListener('click', () => {
      // נקה UI
      if (dom.searchInput) dom.searchInput.value = '';
      ['locationFilter','orgFilter','rankFilter'].forEach(id => {
        const el = d(id);
        if (el) el.value = '';
      });
      if (dom.dateFromInput) dom.dateFromInput.value = '';
      if (dom.dateToInput)   dom.dateToInput.value   = '';
      if (dom.pageSizeSelect) dom.pageSizeSelect.value = String(state.pagination.pageSize);

      // אפס state
      state.filters = { location: '', org: '', rank: '', search: '', dateFrom: null, dateTo: null };
      state.sort = { key: null, direction: 'asc' };
      state.pagination.currentPage = 0;

      // רענן אפשרויות בפילטרים + רנדר
      populateFilters();
      applyAll();

      showToast(labels.reset_filters[state.lang], 'info');
    });
  }
}

/* התחל */
document.addEventListener('DOMContentLoaded', init);
