/* ==========================================================
   מאגר זיהוי לוחמים – לוגיקה ראשית
   שינויים עיקריים:
   - showLoading(): שליטה דרך class 'hidden'
   - מונה תוצאות: מסיר 'hidden'
   - כפתור שפה: שומר על ה-<span>/אייקון + aria-pressed
   - מובייל פילטרים: עדכון <span> פנימי + aria-expanded
   - מתג תצוגה: updateViewToggleUI() לעדכון טקסט + aria-pressed
   - כפתור Back to Top: מאזין גלילה למעלה
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

function parseDateRange(s) {
  if (!s) return null;
  // תומך ב"טווח תאריכים" בפורמטים בסיסיים (YYYY-MM-DD או YYYY/MM/DD)
  const parts = String(s).split(/[-–—~to]+/i).map(x=>x.trim());
  const from = new Date(parts[0]); const to = new Date(parts[1] || parts[0]);
  if (Number.isNaN(from) || Number.isNaN(to)) return null;
  to.setHours(23,59,59,999);
  return {from, to};
}

/* עזרי UI שהוספנו */
function setLangButtonUI() {
  if (!dom.langBtn) return;
  const span = dom.langBtn.querySelector('span') || dom.langBtn;
  span.textContent = labels.lang_switch[state.lang];
  dom.langBtn.setAttribute('aria-pressed', state.lang === 'en' ? 'true' : 'false');
}

function updateViewToggleUI(){
  if (!dom.viewToggleBtn) return;
  const span = dom.viewToggleBtn.querySelector('span') || dom.viewToggleBtn;
  const toCards = state.lang==='he' ? 'עבור לתצוגת כרטיסים' : 'Switch to Cards';
  const toTable = state.lang==='he' ? 'עבור לתצוגת טבלה'   : 'Switch to Table';
  span.textContent = state.isCardView ? toTable : toCards;
  dom.viewToggleBtn.setAttribute('aria-pressed', state.isCardView ? 'true' : 'false');
}

/* =============================
   נרמול כותרות CSV → snake_case
==============================*/
function normalizeHeader(h) {
  if (!h) return '';
  const key = String(h).trim().toLowerCase();

  // מיפוי כותרות "יפות" (עברית/אנגלית) לשמות המפתחות האחידים
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
    Papa.parse(url, {
      download: true, header: true, worker: true,
      complete: (res) => {
        const rows = res.data || [];
        state.originalData = rows.map(rec => {
          const r = {};
          FIELDS.forEach(k => { r[k] = (rec[normalizeHeader(k)] ?? rec[k] ?? '').toString().trim(); });
          return r;
        });
        state.filteredData = state.originalData.slice(0);
        populateFilters();
        applyAll();
        showLoading(false);
      },
      error: () => {
        showToast('שגיאה בטעינת CSV', 'error');
        showLoading(false);
      }
    });
  } else {
    // Fallback: EMBEDDED_DATA וכו'
    const embedded = window.EMBEDDED_DATA || window.embeddedData || window.EMBEDDED || window.embedded || [];
    state.originalData = (embedded || []).map(rec => {
      const r = {};
      FIELDS.forEach(k => { r[k] = (rec[k] ?? rec[prettyToSnake(k)] ?? '').toString().trim(); });
      return r;
    });

    // אתחול
    state.filteredData = state.originalData.slice(0);
    populateFilters();
    applyAll();
    showLoading(false);
  }
}

function prettyToSnake(k){
  // מאפשר מפה הפוכה בסיסית במקרה של EMBEDDED בפורמט "יפה"
  const reverseMap = {
    "Post No.":"post_id","Fighter No.":"combatant_id","Date":"date","Location":"location",
    "Location Details":"location_details","Name in English":"name_english","Name in Arabic":"name_arabic",
    "Nickname":"nickname","Social Media Description":"description_online","Rank/Role":"rank_role",
    "Organization":"organization","Activity":"activity","Family Members":"family_members",
    "No. of Victims":"casualties_count","Additional Fighters":"additional_combatants","Notes":"notes"
  };
  for (const [pretty,snake] of Object.entries(reverseMap)) if (snake===k) return pretty;
  return k;
}

/* =============================
   פילטרים + חיפוש + תאריכים
==============================*/
function recordMatchesFilters(r) {
  // שדות טקסט לפילטרים מדויקים (equals case-insensitive)
  const eq = (a,b) => (String(a||'').trim().toLowerCase() === String(b||'').trim().toLowerCase());

  const okLocation = !state.filters.location || eq(r.location, state.filters.location);
  const okOrg      = !state.filters.org      || eq(r.organization, state.filters.org);
  const okRank     = !state.filters.rank     || eq(r.rank_role, state.filters.rank);

  // חיפוש חופשי בכמה עמודות
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
      const from = state.filters.dateFrom || new Date(-8640000000000000); // מינוס אינסוף
      const to   = state.filters.dateTo   || new Date( 8640000000000000); // פלוס אינסוף
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
    const prev = select.value;
    select.innerHTML = `<option value="">${state.lang==='he'?'הכול':'All'}</option>` +
      list.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
    if (list.includes(prev)) select.value = prev;
  };

  fill(dom.locationFilter, locs);
  fill(dom.orgFilter, orgs);
  fill(dom.rankFilter, ranks);
}

/* =============================
   מיון + רינדור
==============================*/
function compareValues(a,b,key) {
  const x = (a[key]||'').toString().toLowerCase();
  const y = (b[key]||'').toString().toLowerCase();
  return x.localeCompare(y, undefined, {numeric:true, sensitivity:'base'});
}

function sortData() {
  if (!state.sort.key) return;
  state.filteredData.sort((a,b)=> state.sort.direction==='asc' ? compareValues(a,b,state.sort.key) : -compareValues(a,b,state.sort.key));
}

/* רינדור */
function clearContent(){ if (dom.contentArea) dom.contentArea.innerHTML=''; }

function render() {
  clearContent();
  if (!dom.contentArea) return;

  updateStats();      // סטטיסטיקות (שתי הגרסאות)
  updateResultsBar(); // מונה תוצאות/עמוד
  updatePagerButtons();

  const page = state.pagination.currentPage;
  const size = state.pagination.pageSize;
  const slice = state.filteredData.slice(page*size, (page+1)*size);

  if (state.isCardView) renderCards(slice); else renderTable(slice);
  scrollTopIfNeeded();
}

function renderCards(rows) {
  if (!rows.length) {
    dom.contentArea.innerHTML = `<div class="empty">${labels.no_data[state.lang]}</div>`;
    return;
  }
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
  dom.contentArea.appendChild(container);
}

function highlight(val, q) {
  const s = String(val||'');
  if (!q) return escapeHtml(s);
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`,'ig');
  return escapeHtml(s).replace(re,'<mark>$1</mark>');
}

function renderTable(rows) {
  if (!rows.length) {
    dom.contentArea.innerHTML = `<div class="empty">${labels.no_data[state.lang]}</div>`;
    return;
  }
  const table = document.createElement('table');
  table.className = 'data-table';

  // thead
  const thead = document.createElement('thead');
  const trh = document.createElement('tr');
  FIELDS.forEach(key => {
    const th = document.createElement('th');
    th.textContent = fieldLabels[key][state.lang];
    th.dataset.key = key;
    th.tabIndex = 0;
    th.addEventListener('click', () => setSort(key));
    th.addEventListener('keydown', (e)=>{ if(e.key==='Enter'||e.key===' ') setSort(key); });
    if (state.sort.key === key) th.classList.add(state.sort.direction === 'asc' ? 'sort-asc' : 'sort-desc');
    trh.appendChild(th);
  });
  thead.appendChild(trh);
  table.appendChild(thead);

  // tbody
  const tbody = document.createElement('tbody');
  rows.forEach(r => {
    const tr = document.createElement('tr');
    FIELDS.forEach(key => {
      const td = document.createElement('td');
      const val = r[key] || '';
      td.innerHTML = (key === 'location' || key === 'organization' || key === 'name_english' || key === 'name_arabic' || key === 'nickname')
        ? highlight(val, state.filters.search)
        : escapeHtml(val);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
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
}

function updateResultsBar() {
  if (!dom.resultsCounter && !dom.pageInfo) return;
  const total = state.filteredData.length;
  const pages = Math.max(1, Math.ceil(total / state.pagination.pageSize));
  const current = Math.min(pages, state.pagination.currentPage + 1);

  if (dom.resultsCounter) { 
    dom.resultsCounter.textContent = labels.results_found[state.lang].replace('{count}', total);
    dom.resultsCounter.classList.remove('hidden'); 
  }
  if (dom.pageInfo) {
    dom.pageInfo.textContent = labels.page[state.lang].replace('{c}', current).replace('{t}', pages);
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
  // אופציונלי: גלילה לראש התוכן לאחר שינוי עמוד/תצוגה
  if (dom.contentArea && dom.contentArea.scrollIntoView) {
    dom.contentArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/* =============================
   סטטיסטיקות (שני הסטים)
==============================*/
function updateStats() {
  // סטטיסטיקות גרסת script.js
  if (dom.totalCombatants || dom.totalCasualties || dom.familyCasualties || dom.highRanking) {
    const total = state.filteredData.length;
    const casualties = state.filteredData.reduce((sum,r)=> sum + (parseInt(r.casualties_count||0,10) || 0), 0);
    const family = state.filteredData.filter(r=>/\bמשפחה\b|\bfamily\b/i.test(r.family_members||'')).length;
    const high = state.filteredData.filter(r=>/\bמפקד\b|מג"ד|סגן|קצין|\bcommander\b|\bchief\b|\brank\b/i.test(r.rank_role||'')).length;

    if (dom.totalCombatants) dom.totalCombatants.textContent = total.toLocaleString('he-IL');
    if (dom.totalCasualties) dom.totalCasualties.textContent = casualties.toLocaleString('he-IL');
    if (dom.familyCasualties) dom.familyCasualties.textContent = family.toLocaleString('he-IL');
    if (dom.highRanking) dom.highRanking.textContent = high.toLocaleString('he-IL');
  }

  // סטטיסטיקות placeholders באנגלית (אם קיימים)
  if (dom.statsTotal || dom.statsByLocation || dom.statsByOrg || dom.statsByRank) {
    if (dom.statsTotal) dom.statsTotal.textContent = state.filteredData.length.toLocaleString();
    if (dom.statsByLocation) dom.statsByLocation.textContent = '—';
    if (dom.statsByOrg) dom.statsByOrg.textContent = '—';
    if (dom.statsByRank) dom.statsByRank.textContent = '—';
  }
}

/* =============================
   CSV Export (עם BOM ותוויות לפי שפה)
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
   הפעלה
==============================*/
function init() {
  setLangButtonUI();
  if (dom.searchInput) dom.searchInput.placeholder = labels.search_placeholder[state.lang];
  updateViewToggleUI();
  bindEvents();
  loadData();
}

function bindEvents() {
  const b2t = d('backToTop'); if (b2t) b2t.addEventListener('click', ()=>window.scrollTo({top:0,behavior:'smooth'}));
  // חיפוש
  if (dom.searchInput) {
    dom.searchInput.placeholder = labels.search_placeholder[state.lang];
    dom.searchInput.addEventListener('input', onSearch);
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
    state.filters.dateTo = parseInputDate(dom.dateToInput.value, true); upd();
  });
  if (dom.clearDatesBtn) dom.clearDatesBtn.addEventListener('click', ()=>{
    if (dom.dateFromInput) dom.dateFromInput.value = '';
    if (dom.dateToInput) dom.dateToInput.value = '';
    state.filters.dateFrom = null; state.filters.dateTo = null; upd();
  });

  // פגינציה
  if (dom.prevPageBtn) dom.prevPageBtn.addEventListener('click', ()=>{
    if (state.pagination.currentPage > 0) { state.pagination.currentPage--; render(); }
  });
  if (dom.nextPageBtn) dom.nextPageBtn.addEventListener('click', ()=>{
    const total = state.filteredData.length;
    const pages = Math.max(1, Math.ceil(total / state.pagination.pageSize));
    if (state.pagination.currentPage < pages-1) { state.pagination.currentPage++; render(); }
  });

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
    render(); // לצורך כותרות/טקסטים/CSV
    setLangButtonUI();
    updateViewToggleUI();
  });

  // מובייל: פתיחה/סגירה של פס פילטרים
  if (dom.mobileFiltersToggle && dom.filtersBar) {
    const labelSpan = dom.mobileFiltersToggle.querySelector('span') || dom.mobileFiltersToggle;
    dom.mobileFiltersToggle.addEventListener('click', ()=>{
      const open = dom.filtersBar.classList.toggle('open');
      dom.mobileFiltersToggle.setAttribute('aria-expanded', String(open));
      labelSpan.textContent = open ? labels.close_filters[state.lang] : labels.open_filters[state.lang];
    });
  }
}

/* התחל */
document.addEventListener('DOMContentLoaded', init);
