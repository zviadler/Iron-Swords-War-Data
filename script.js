(function () {
  'use strict';

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
      dateFrom: null, // Date (UTC) או null
      dateTo: null    // Date (UTC) או null
    },
    stats: { total: 0, withOnlineDesc: 0, withRank: 0, leaders: 0, lastUpdated: '' }
  };

  /* =============================
     DOM (תואם לשני הקבצים)
  ==============================*/
  const d = (id) => document.getElementById(id);
  const dom = {
    // תצוגה
    contentArea: d('contentArea'),
    loadingOverlay: d('loadingOverlay'),
    toastContainer: d('toastContainer'),

    // חיפוש/פילטרים
    searchInput: d('searchBox') || d('searchInput'),
    locationFilter: d('locationFilter'),
    orgFilter: d('orgFilter') || d('organizationFilter'),
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
    statsWithDesc: d('statsWithDesc'),
    statsWithRank: d('statsWithRank'),
    statsLeaders: d('statsLeaders'),
    statsUpdated: d('statsUpdated'),
  };

  /* =============================
     מיפוי שדות (snake_case) + כותרות תצוגה
  ==============================*/
  const FIELDS = [
    'post_id','combatant_id','date','location','location_details',
    'name_english','name_arabic','nickname','description_online',
    'rank_role','organization','activity','family_members',
    'casualties_count','additional_combatants','notes'
  ];

  // כותרות לתצוגה לפי שפה
  const fieldLabels = {
    post_id: {he:"מס' פוסט",en:"Post ID"},
    combatant_id: {he:"מס' לוחם",en:"Combatant ID"},
    date: {he:"תאריך",en:"Date"},
    location: {he:"מיקום",en:"Location"},
    location_details: {he:"פירוט מיקום",en:"Location Details"},
    name_english: {he:"שם באנגלית",en:"Name in English"},
    name_arabic: {he:"שם בערבית",en:"Name in Arabic"},
    nickname: {he:"כינוי",en:"Nickname"},
    description_online: {he:"תיאור ברשת",en:"Social Media Description"},
    rank_role: {he:"דרגה/תפקיד",en:"Rank/Role"},
    organization: {he:"ארגון",en:"Organization"},
    activity: {he:"פעילות",en:"Activity"},
    family_members: {he:"בני משפחה",en:"Family Members"},
    casualties_count: {he:"מס' קורבנות",en:"No. of Victims"},
    additional_combatants: {he:"לוחמים נוספים",en:"Additional Fighters"},
    notes: {he:"הערות",en:"Notes"},
  };

  // טקסטים ל-UI
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
      "תיאור ברשת": 'description_online', "social media description": 'description_online',
      "דרגה/תפקיד": 'rank_role', "rank/role": 'rank_role',
      "ארגון": 'organization', "organization": 'organization',
      "פעילות": 'activity', "activity": 'activity',
      "בני משפחה": 'family_members', "family members": 'family_members',
      "מס' קורבנות": 'casualties_count', "no. of victims": 'casualties_count',
      "לוחמים נוספים": 'additional_combatants', "additional fighters": 'additional_combatants',
      "הערות": 'notes', "notes": 'notes'
    };

    // אם כבר snake_case – החזר כפי שהוא
    if (FIELDS.includes(key)) return key;

    // הורדת נקודות/רווחים/מקפים לפני מיפוי
    const simplified = key.replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim();
    return map[simplified] || map[key] || key.replace(/\s+/g, '_');
  }

  /* =============================
     עזר: Debounce
  ==============================*/
  function debounce(fn, wait = 250) {
    let t; return function (...args) {
      clearTimeout(t); t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  /* =============================
     עזר: הצגת Toast (אם יש div#toastContainer)
  ==============================*/
  function showToast(msg, type = 'success') {
    if (!dom.toastContainer) return; // אופציונלי
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.textContent = msg;
    dom.toastContainer.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  }

  /* =============================
     עזר: הדגשת מחרוזת בחיפוש
  ==============================*/
  function highlight(text, term) {
    if (!term) return escapeHtml(String(text || ''));
    const rx = new RegExp(`(${escapeRegex(term)})`, 'gi');
    return escapeHtml(String(text || '')).replace(rx, '<mark>$1</mark>');
  }
  function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));}
  function escapeRegex(s){return String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}

  /* =============================
     Parse Date Range (מבוסס גרסת script (1).js, עם הרחבות)
  ==============================*/
  const MONTHS = {
    jan:0,january:0,feb:1,february:1,mar:2,march:2,apr:3,april:3,may:4,jun:5,june:5,jul:6,july:6,aug:7,august:7,sep:8,sept:8,september:8,oct:9,october:9,nov:10,november:10,dec:11,december:11
  };
  function monthIndexFromName(name){
    if(!name) return null;
    const k = String(name).trim().toLowerCase();
    return (k in MONTHS)? MONTHS[k] : null;
  }
  function lastDayOfMonth(y,m){ return new Date(Date.UTC(y,m+1,0)).getUTCDate(); }

  // קולט מחרוזת, מחזיר {start,end} ב-UTC, או null אם לא ניתן להבין
  function parseDateRange(s) {
    if (!s) return null;
    const raw = String(s).trim();

    // YYYY-MM-DD (או DD-MM-YYYY / DD/MM/YYYY / DD.MM.YYYY)
    let m = raw.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);
    if (m) {
      const y=+m[1], mo=+m[2]-1, d=+m[3];
      const start = new Date(Date.UTC(y,mo,d,0,0,0,0));
      const end   = new Date(Date.UTC(y,mo,d,23,59,59,999));
      return {start,end};
    }
    m = raw.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);
    if (m) {
      const d=+m[1], mo=+m[2]-1, y=+m[3];
      const start = new Date(Date.UTC(y,mo,d,0,0,0,0));
      const end   = new Date(Date.UTC(y,mo,d,23,59,59,999));
      return {start,end};
    }

    // DD-MMM-YYYY או DD-Month-YYYY
    m = raw.match(/^(\d{1,2})[-\s]([A-Za-z]{3,})[-\s](\d{4})$/);
    if (m) {
      const d=+m[1], mi=monthIndexFromName(m[2]), y=+m[3];
      if (mi!=null) return {
        start:new Date(Date.UTC(y,mi,d,0,0,0,0)),
        end:  new Date(Date.UTC(y,mi,d,23,59,59,999))
      };
    }

    // MMM-YYYY או Month YYYY
    m = raw.match(/^([A-Za-z]{3,})[-\s](\d{4})$/);
    if (m) {
      const mi=monthIndexFromName(m[1]), y=+m[2];
      if (mi!=null) return {
        start:new Date(Date.UTC(y,mi,1,0,0,0,0)),
        end:  new Date(Date.UTC(y,mi,lastDayOfMonth(y,mi),23,59,59,999))
      };
    }

    // MMM–MMM YYYY (טווח חודשים באותה שנה)
    m = raw.match(/^([A-Za-z]{3,})\s*[-–]\s*([A-Za-z]{3,})[-\s](\d{4})$/);
    if (m) {
      const mi1=monthIndexFromName(m[1]), mi2=monthIndexFromName(m[2]), y=+m[3];
      if (mi1!=null && mi2!=null) {
        const a=Math.min(mi1,mi2), b=Math.max(mi1,mi2);
        return {
          start:new Date(Date.UTC(y,a,1,0,0,0,0)),
          end:  new Date(Date.UTC(y,b,lastDayOfMonth(y,b),23,59,59,999))
        };
      }
    }

    // YYYY
    m = raw.match(/^(\d{4})$/);
    if (m) {
      const y=+m[1];
      return {
        start:new Date(Date.UTC(y,0,1,0,0,0,0)),
        end:  new Date(Date.UTC(y,11,31,23,59,59,999))
      };
    }

    // Fallback: Date.parse
    const dt = new Date(raw);
    if (!isNaN(dt)) {
      const y=dt.getUTCFullYear(), mo=dt.getUTCMonth(), d=dt.getUTCDate();
      return {
        start:new Date(Date.UTC(y,mo,d,0,0,0,0)),
        end:  new Date(Date.UTC(y,mo,d,23,59,59,999))
      };
    }
    return null;
  }

  /* =============================
     טעינת נתונים (CSV או EMBEDDED)
  ==============================*/
  async function loadData() {
    showLoading(true);

    // מקור URL מתוך <div id="dataCSV" data-url="..."> אם קיים
    const holder = document.getElementById('dataCSV');
    let csvUrl = holder ? holder.getAttribute('data-url') : null;

    // אם אין data-url – ננסה "data.csv" (אופציונלי)
    if (!csvUrl) {
      const guess = document.querySelector('link[rel="preload"][as="fetch"][href$=".csv"]');
      if (guess) csvUrl = guess.getAttribute('href');
      else csvUrl = 'data.csv'; // אם אין קובץ כזה – ניפול ל-embedded
    }

    try {
      const response = await fetch(csvUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error('CSV fetch failed');
      const csvText = await response.text();

      const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        transformHeader: (h) => normalizeHeader(h)
      });

      // נרמול כל רשומה: ודאו שכל השדות קיימים כמחרוזת
      state.originalData = parsed.data.map(rec => {
        const r = {};
        FIELDS.forEach(k => { r[k] = (rec[k] ?? '').toString().trim(); });
        return r;
      });
    } catch (e) {
      // Fallback: נתונים משובצים (שם משתנה משני הקבצים)
      const embedded = window.EMBEDDED_DATA || window.embeddedData || window.EMBEDDED || window.embedded || [];
      state.originalData = (embedded || []).map(rec => {
        const r = {};
        FIELDS.forEach(k => { r[k] = (rec[k] ?? rec[prettyToSnake(k)] ?? '').toString().trim(); });
        return r;
      });
    }

    // אתחול
    state.filteredData = state.originalData.slice(0);
    populateFilters();
    applyAll();
    showLoading(false);
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
        okDate = !(rng.end < from || rng.start > to);
      }
    }

    return okLocation && okOrg && okRank && okSearch && okDate;
  }

  function filterData() {
    state.filteredData = state.originalData.filter(recordMatchesFilters);
    state.pagination.currentPage = 0;
  }

  /* =============================
     מיון
  ==============================*/
  function compareValues(a,b,key) {
    if (key === 'date') {
      const ra = parseDateRange(a.date), rb = parseDateRange(b.date);
      const va = ra ? ra.start.getTime() : -Infinity;
      const vb = rb ? rb.start.getTime() : -Infinity;
      return va - vb;
    }
    // נסה מספר
    const na = parseFloat(a[key]); const nb = parseFloat(b[key]);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;

    // טקסט
    return String(a[key]||'').localeCompare(String(b[key]||''), state.lang, {numeric:true, sensitivity:'base'});
  }

  function sortData() {
    const { key, direction } = state.sort;
    if (!key) return;
    const dir = direction === 'asc' ? 1 : -1;
    state.filteredData.sort((a,b) => dir * compareValues(a,b,key));
  }

  /* =============================
     רינדור
  ==============================*/
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

  function renderTable(rows) {
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
        td.innerHTML = (key === 'location' || key === 'organization' || key === 'rank_role' || key === 'description_online' || key === 'name_english' || key === 'name_arabic' || key === 'nickname')
          ? highlight(val, state.filters.search)
          : escapeHtml(val);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    dom.contentArea.appendChild(table);
  }

  function setSort(key) {
    if (state.sort.key === key) {
      state.sort.direction = (state.sort.direction === 'asc' ? 'desc' : 'asc');
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
      let totalCombatants = 0, totalCasualties = 0, familyCasualties = 0, highRanking = 0;
      state.filteredData.forEach(r => {
        totalCombatants += 1;
        const casualties = parseInt(r.casualties_count) || 0;
        totalCasualties += casualties;
        if ((r.family_members || '').trim()) familyCasualties += casualties;
        if ((r.rank_role || '').toLowerCase().includes('leader')) highRanking += 1;
      });
      if (dom.totalCombatants) dom.totalCombatants.textContent = totalCombatants;
      if (dom.totalCasualties) dom.totalCasualties.textContent = totalCasualties;
      if (dom.familyCasualties) dom.familyCasualties.textContent = familyCasualties;
      if (dom.highRanking) dom.highRanking.textContent = highRanking;
    }

    // סטטיסטיקות גרסת script (1).js
    if (dom.statsTotal || dom.statsWithDesc || dom.statsWithRank || dom.statsLeaders || dom.statsUpdated) {
      const data = state.originalData;
      state.stats.total = data.length;
      state.stats.withOnlineDesc = data.filter(r => (r.description_online || '').trim()).length;
      state.stats.withRank = data.filter(r => (r.rank_role || '').trim()).length;
      state.stats.leaders = data.filter(r => (r.rank_role || '').toLowerCase().includes('leader')).length;

      const now = new Date();
      const pad2 = (n) => String(n).padStart(2,'0');
      state.stats.lastUpdated = `${now.getFullYear()}-${pad2(now.getMonth()+1)}-${pad2(now.getDate())}`;

      if (dom.statsTotal) dom.statsTotal.textContent = String(state.stats.total);
      if (dom.statsWithDesc) dom.statsWithDesc.textContent = String(state.stats.withOnlineDesc);
      if (dom.statsWithRank) dom.statsWithRank.textContent = String(state.stats.withRank);
      if (dom.statsLeaders) dom.statsLeaders.textContent = String(state.stats.leaders);
      if (dom.statsUpdated) dom.statsUpdated.textContent = state.stats.lastUpdated;
    }
  }

  /* =============================
     אכלוס פילטרים (options) מתוך הנתונים
  ==============================*/
  function fillSelect(el, values) {
    if (!el) return;
    const current = el.value;
    el.innerHTML = `<option value="">${state.lang==='he'?'הכל':'All'}</option>` +
      values.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
    el.value = current; // שמירה אם אפשר
  }
  function populateFilters() {
    const uniq = (arr) => Array.from(new Set(arr.filter(Boolean).map(s=>String(s).trim()))).sort((a,b)=>a.localeCompare(b,state.lang,{numeric:true,sensitivity:'base'}));
    fillSelect(dom.locationFilter, uniq(state.originalData.map(r=>r.location)));
    fillSelect(dom.orgFilter,      uniq(state.originalData.map(r=>r.organization)));
    fillSelect(dom.rankFilter,     uniq(state.originalData.map(r=>r.rank_role)));
    initDateInputsRange(); // אופציונלי: min/max לפי הדאטה
  }

  function initDateInputsRange() {
    if (!dom.dateFromInput && !dom.dateToInput) return;
    const ranges = state.originalData.map(r => parseDateRange(r.date)).filter(Boolean);
    if (!ranges.length) return;
    const min = new Date(Math.min(...ranges.map(x=>x.start.getTime())));
    const max = new Date(Math.max(...ranges.map(x=>x.end.getTime())));
    const fmt = (d)=> `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
    if (dom.dateFromInput && !dom.dateFromInput.min) dom.dateFromInput.min = fmt(min);
    if (dom.dateFromInput && !dom.dateFromInput.max) dom.dateFromInput.max = fmt(max);
    if (dom.dateToInput   && !dom.dateToInput.min)   dom.dateToInput.min   = fmt(min);
    if (dom.dateToInput   && !dom.dateToInput.max)   dom.dateToInput.max   = fmt(max);
  }

  /* =============================
     אקשנים / מאזינים
  ==============================*/
  const onSearch = debounce(() => {
    state.filters.search = (dom.searchInput?.value || '').trim();
    applyAll();
  }, 300);

  function applyAll() {
    filterData();
    sortData();
    render();
  }

  function parseInputDate(val, endOfDay=false) {
    if (!val) return null;
    const m = val.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const y=+m[1], mo=+m[2]-1, d=+m[3];
    return endOfDay ? new Date(Date.UTC(y,mo,d,23,59,59,999))
                    : new Date(Date.UTC(y,mo,d,0,0,0,0));
  }

  function bindEvents() {
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
      state.filters.dateFrom = state.filters.dateTo = null; upd();
    });

    // כפתורי עמוד קודם/הבא
    if (dom.prevPageBtn) dom.prevPageBtn.addEventListener('click', ()=>{ if (state.pagination.currentPage>0){ state.pagination.currentPage--; render(); } });
    if (dom.nextPageBtn) dom.nextPageBtn.addEventListener('click', ()=>{
      const pages = Math.max(1, Math.ceil(state.filteredData.length / state.pagination.pageSize));
      if (state.pagination.currentPage < pages-1){ state.pagination.currentPage++; render(); }
    });

    // כפתור איפוס
    if (dom.resetBtn) dom.resetBtn.addEventListener('click', ()=>{
      if (dom.locationFilter) dom.locationFilter.value = '';
      if (dom.orgFilter) dom.orgFilter.value = '';
      if (dom.rankFilter) dom.rankFilter.value = '';
      if (dom.searchInput) dom.searchInput.value = '';
      if (dom.dateFromInput) dom.dateFromInput.value = '';
      if (dom.dateToInput) dom.dateToInput.value = '';
      state.filters = { location:'', org:'', rank:'', search:'', dateFrom:null, dateTo:null };
      state.sort = { key:null, direction:'asc' };
      state.pagination.currentPage = 0;
      applyAll();
      showToast(labels.reset_filters[state.lang]);
    });

    // כפתור CSV
    if (dom.exportBtn) dom.exportBtn.addEventListener('click', exportToCSV);

    // תצוגה: כרטיסים/טבלה
    if (dom.viewToggleBtn) dom.viewToggleBtn.addEventListener('click', ()=>{
      state.isCardView = !state.isCardView;
      render();
    });

    // שפה
    if (dom.langBtn) dom.langBtn.addEventListener('click', ()=>{
      state.lang = (state.lang==='he') ? 'en' : 'he';
      if (dom.searchInput) dom.searchInput.placeholder = labels.search_placeholder[state.lang];
      render(); // לצורך כותרות/טקסטים/CSV
      dom.langBtn.textContent = labels.lang_switch[state.lang];
    });

    // מובייל: פתיחה/סגירה של פס פילטרים
    if (dom.mobileFiltersToggle && dom.filtersBar) {
      dom.mobileFiltersToggle.addEventListener('click', ()=>{
        const open = dom.filtersBar.classList.toggle('open');
        dom.mobileFiltersToggle.textContent = open ? labels.close_filters[state.lang] : labels.open_filters[state.lang];
      });
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
    const header = FIELDS.map(k => `"${(fieldLabels[k][state.lang]||k).replace(/"/g,'""')}"`).join(',') + '\n';
    const rows = state.filteredData.map(r =>
      FIELDS.map(k => `"${String(r[k]||'').replace(/"/g,'""')}"`).join(',')
    ).join('\n');

    const blob = new Blob(['\ufeff' + header + rows], { type: 'text/csv;charset=utf-8;' }); // BOM לעברית
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'filtered_data.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast(labels.export_success[state.lang]);
  }

  /* =============================
     Utility UI
  ==============================*/
  function showLoading(on){ if (!dom.loadingOverlay) return; dom.loadingOverlay.style.display = on?'flex':'none'; }

  /* =============================
     הפעלה
  ==============================*/
  function init() {
    if (dom.langBtn) dom.langBtn.textContent = labels.lang_switch[state.lang];
    if (dom.searchInput) dom.searchInput.placeholder = labels.search_placeholder[state.lang];
    bindEvents();
    loadData();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
