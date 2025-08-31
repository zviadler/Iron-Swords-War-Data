(function () {
    'use strict';

    // === מצב מרכזי של האפליקציה (state) ומבני נתונים ===
    // מצב האפליקציה כולל את הנתונים המקוריים והמסוננים, מצב שפה, הגדרות מיון, הגדרות פגינציה,
    // והפניות לאלמנטים בדף. זה מאפשר שליטה ממורכזת בכל היבטי האפליקציה.
    const state = {
        originalData: [], // הנתונים המקוריים טעונים מהקובץ.
        filteredData: [], // הנתונים לאחר החלת פילטרים ומיון.
        isCardView: true, // האם מוצגת תצוגת כרטיסים או טבלה. ברירת מחדל: כרטיסים.
        lang: 'he', // השפה המוצגת (he או en). ברירת מחדל: עברית.
        sort: {
            column: null, // אינדקס העמודה שנבחרה למיון. null = אין מיון.
            direction: 'asc' // 'asc' או 'desc' (עולה/יורד). ברירת מחדל: עולה.
        },
        pagination: {
            currentPage: 0, // העמוד הנוכחי בפגינציה. מתחיל מ-0.
            pageSize: 50, // מספר השורות המוצגות לעמוד בתצוגת טבלה.
        },
        filters: { location: '', org: '', rank: '', search: '', dateFrom: '', dateTo: '' },
        // מידע סטטיסטי שמחושב מהנתונים לראש הדף.
        stats: {
            total: 0,
            withOnlineDesc: 0,
            withRank: 0,
            leaders: 0,
            lastUpdated: ''
        }
    };

    // Collator עבור השוואות טקסטואליות בהתאם לשפה.
    let collator = new Intl.Collator(state.lang, { numeric: true, sensitivity: 'base' });

    // מיפוי שדות באנגלית -> כותרות לפי שפה
    // המפתח הוא שם השדה בנתונים; הערך הוא אובייקט עם 'he' ו-'en' לכותרת.
    const headerLabels = {
        name_english: { he: 'שם באנגלית', en: 'Name (English)' },
        name_arabic: { he: 'שם בערבית', en: 'Name (Arabic)' },
        description_online: { he: 'תיאור מסור', en: 'Description' },
        location: { he: 'מיקום', en: 'Location' },
        organization: { he: 'ארגון', en: 'Organization' },
        rank_role: { he: 'דרגה/תפקיד', en: 'Rank/Role' },
        date: { he: 'תאריך', en: 'Date' },
        notes: { he: 'הערות', en: 'Notes' }
    };

    // מפתחי השדות לתצוגה טבלאית (סדר העמודות).
    const dataFieldKeys = [
        'name_english', 'name_arabic', 'description_online',
        'location', 'organization', 'rank_role', 'date', 'notes'
    ];

    // מחרוזות טקסטים לתרגום UI
    const labels = {
        title: { he: 'מאגר זיהוי לוחמים', en: 'Combatant Identification Database' },
        subtitle: { he: 'חיפוש, מיון וסינון רשומות', en: 'Search, sort, and filter records' },
        search_placeholder: { he: 'חפש לפי שם/תיאור', en: 'Search by name/description' },
        results_count: { he: 'תוצאות', en: 'Results' },
        view_cards: { he: 'כרטיסים', en: 'Cards' },
        view_table: { he: 'טבלה', en: 'Table' },
        toggle_view_card: { he: 'תצוגת כרטיסים', en: 'Card view' },
        toggle_view_table: { he: 'תצוגת טבלה', en: 'Table view' },
        reset_filters: { he: 'אפס פילטרים', en: 'Reset Filters' },
        export_csv: { he: 'ייצוא CSV', en: 'Export CSV' },
        prev: { he: 'הקודם', en: 'Prev' },
        next: { he: 'הבא', en: 'Next' },
        no_data: { he: 'אין נתונים להצגה', en: 'No data to display' },
        lang_switch: { he: 'EN', en: 'HE' },
        location: { he: 'מיקום', en: 'Location' },
        organization: { he: 'ארגון', en: 'Organization' },
        rank_role: { he: 'דרגה/תפקיד', en: 'Rank/Role' },
        filters_title: { he: 'אפשרויות חיפוש', en: 'Filter Options' },
        loading: { he: 'טוען נתונים…', en: 'Loading data…' },
        page: { he: 'עמוד', en: 'Page' },
        of: { he: 'מתוך', en: 'of' },
        total_records: { he: 'סה״כ רשומות', en: 'Total records' },
        with_online_desc: { he: 'עם תיאור מסור', en: 'With description' },
        with_rank: { he: 'עם דרגה', en: 'With rank' },
        leaders: { he: 'בכירים', en: 'Leaders' },
        last_updated: { he: 'עודכן לאחרונה', en: 'Last updated' },
        next_page: { he: 'עמוד הבא', en: 'Next page' },
        date_range: { he: "טווח תאריכים", en: "Date Range" },
        from_date: { he: "מתאריך", en: "From" },
        to_date: { he: "עד תאריך", en: "To" },
        clear_dates: { he: "נקה תאריכים", en: "Clear Dates" },
        invalid_date_range: { he: "תאריך ההתחלה מאוחר מתאריך הסיום", en: "Start date is after end date" },
        prev_page: { he: 'עמוד קודם', en: 'Previous page' }
    };

    // הכנת הפניות ל-DOM
    const dom = {
        app: document.getElementById('app'),
        header: document.getElementById('header'),
        langBtn: document.getElementById('langToggle'),
        viewToggleBtn: document.getElementById('viewToggle'),
        searchInput: document.getElementById('searchInput'),
        locationFilter: document.getElementById('locationFilter'),
        organizationFilter: document.getElementById('organizationFilter'),
        rankFilter: document.getElementById('rankFilter'),
        resetBtn: document.getElementById('resetFiltersButton'),
        exportBtn: document.getElementById('exportCSVButton'),
        resultsCount: document.getElementById('resultsCount'),
        paginationInfo: document.getElementById('paginationInfo'),
        prevPageBtn: document.getElementById('prevPage'),
        nextPageBtn: document.getElementById('nextPage'),
        contentArea: document.getElementById('contentArea'),
        loadingOverlay: document.getElementById('loadingOverlay'),
        statsTotal: document.getElementById('statsTotal'),
        statsWithDesc: document.getElementById('statsWithDesc'),
        statsWithRank: document.getElementById('statsWithRank'),
        statsLeaders: document.getElementById('statsLeaders'),
        statsUpdated: document.getElementById('statsUpdated'),
        filtersBar: document.getElementById('filtersBar'),
        dateFromInput: document.getElementById('dateFrom'),
        dateToInput: document.getElementById('dateTo'),
        clearDatesBtn: document.getElementById('clearDatesBtn'),
        backToTop: document.getElementById('backToTop')
    };

    // === שירותים ושימושים כללים ===

    /**
     * פונקציה עוזרת להצגת הודעה קצרה למשתמש (Toast).
     * @param {string} message - הטקסט להצגה.
     * @param {'info'|'success'|'warning'|'error'} type - סוג ההודעה (משפיע על עיצוב).
     */
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('visible');
        }, 10);
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }

    // === עזרי תאריכים לסינון ומיון ===
    function monthIndexFromName(name) {
        if (!name) return null;
        const k = String(name).trim().toLowerCase();
        const map = {
            jan:0, january:0, feb:1, february:1, mar:2, march:2,
            apr:3, april:3, may:4, jun:5, june:5, jul:6, july:6,
            aug:7, august:7, sep:8, sept:8, september:8,
            oct:9, october:9, nov:10, november:10, dec:11, december:11
        };
        if (map[k] != null) return map[k];
        const first3 = k.slice(0,3);
        return map[first3] != null ? map[first3] : null;
    }
    function lastDayOfMonth(year, monthIdx) {
        return new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate();
    }
    function rangesOverlap(aStart, aEnd, bStart, bEnd) {
        const startB = bStart ?? new Date(-8640000000000000);
        const endB   = bEnd   ?? new Date( 8640000000000000);
        return aStart <= endB && startB <= aEnd;
    }
    function parseDateRange(s) {
        if (!s) return null;
        const raw = String(s).trim();

        // DD-MMM-YYYY או DD-Month-YYYY
        let m = raw.match(/^(\d{1,2})[-\s]([A-Za-z]{3,})[-\s](\d{4})$/);
        if (m) {
            const d = parseInt(m[1], 10);
            const mi = monthIndexFromName(m[2]);
            const y = parseInt(m[3], 10);
            if (mi != null) {
                const start = new Date(Date.UTC(y, mi, d, 0,0,0,0));
                const end   = new Date(Date.UTC(y, mi, d, 23,59,59,999));
                return { start, end };
            }
        }

        // MMM-YYYY או Month-YYYY
        m = raw.match(/^([A-Za-z]{3,})[-\s](\d{4})$/);
        if (m) {
            const mi = monthIndexFromName(m[1]);
            const y = parseInt(m[2], 10);
            if (mi != null) {
                const start = new Date(Date.UTC(y, mi, 1, 0,0,0,0));
                const end   = new Date(Date.UTC(y, mi, lastDayOfMonth(y, mi), 23,59,59,999));
                return { start, end };
            }
        }

        // MMM/MMM-YYYY או Month/Month-YYYY
        m = raw.match(/^([A-Za-z]{3,})[\/\-]([A-Za-z]{3,})[-\s](\d{4})$/);
        if (m) {
            const mi1 = monthIndexFromName(m[1]);
            const mi2 = monthIndexFromName(m[2]);
            const y = parseInt(m[3], 10);
            if (mi1 != null && mi2 != null) {
                const a = Math.min(mi1, mi2);
                const b = Math.max(mi1, mi2);
                const start = new Date(Date.UTC(y, a, 1, 0,0,0,0));
                const end   = new Date(Date.UTC(y, b, lastDayOfMonth(y, b), 23,59,59,999));
                return { start, end };
            }
        }

        // YYYY
        m = raw.match(/^(\d{4})$/);
        if (m) {
            const y = parseInt(m[1], 10);
            const start = new Date(Date.UTC(y, 0, 1, 0,0,0,0));
            const end   = new Date(Date.UTC(y, 11, 31, 23,59,59,999));
            return { start, end };
        }

        const fallback = new Date(raw);
        if (!isNaN(fallback)) {
            const start = new Date(Date.UTC(fallback.getUTCFullYear(), fallback.getUTCMonth(), fallback.getUTCDate(), 0,0,0,0));
            const end   = new Date(Date.UTC(fallback.getUTCFullYear(), fallback.getUTCMonth(), fallback.getUTCDate(), 23,59,59,999));
            return { start, end };
        }
        return null;
    }

    // === פונקציות עזר לפורמט טקסט/כותרות וכו' ===

    /**
     * מחזיר כותרת עמודה בהתאם לשפה הנוכחית.
     * @param {string} key - שם השדה.
     * @returns {string} - הכותרת המתורגמת.
     */
    function getHeaderLabel(key) {
        return headerLabels[key] ? headerLabels[key][state.lang] : key;
    }

    /**
     * מעדכן את הטקסטים בדף בהתאם לשפה הנוכחית.
     * כולל כפתורים, כותרות, placeholders ועוד.
     */
    function updateTextByLang() {
        const titleEl = document.getElementById('title');
        const subtitleEl = document.getElementById('subtitle');
        const searchLabel = document.getElementById('searchLabel');
        const searchInput = dom.searchInput;
        const viewCardsBtn = document.getElementById('viewCardsLabel');
        const viewTableBtn = document.getElementById('viewTableLabel');
        const resetBtn = dom.resetBtn;
        const exportBtn = dom.exportBtn;
        const filtersTitle = document.getElementById('filtersTitle');
        const locLabel = document.getElementById('locationLabel');
        const orgLabel = document.getElementById('organizationLabel');
        const rankLabel = document.getElementById('rankLabel');
        const statsTotalLabel = document.getElementById('statsTotalLabel');
        const statsWithDescLabel = document.getElementById('statsWithDescLabel');
        const statsWithRankLabel = document.getElementById('statsWithRankLabel');
        const statsLeadersLabel = document.getElementById('statsLeadersLabel');
        const statsUpdatedLabel = document.getElementById('statsUpdatedLabel');
        const langBtn = dom.langBtn;

        if (titleEl) titleEl.textContent = labels.title[state.lang];
        if (subtitleEl) subtitleEl.textContent = labels.subtitle[state.lang];
        if (searchLabel) searchLabel.textContent = labels.search_placeholder[state.lang];
        if (searchInput) searchInput.setAttribute('placeholder', labels.search_placeholder[state.lang]);
        if (viewCardsBtn) viewCardsBtn.textContent = labels.view_cards[state.lang];
        if (viewTableBtn) viewTableBtn.textContent = labels.view_table[state.lang];
        if (resetBtn) resetBtn.textContent = labels.reset_filters[state.lang];
        if (exportBtn) exportBtn.textContent = labels.export_csv[state.lang];
        if (filtersTitle) filtersTitle.textContent = labels.filters_title[state.lang];
        if (locLabel) locLabel.textContent = labels.location[state.lang];
        if (orgLabel) orgLabel.textContent = labels.organization[state.lang];
        if (rankLabel) rankLabel.textContent = labels.rank_role[state.lang];
        if (statsTotalLabel) statsTotalLabel.textContent = labels.total_records[state.lang];
        if (statsWithDescLabel) statsWithDescLabel.textContent = labels.with_online_desc[state.lang];
        if (statsWithRankLabel) statsWithRankLabel.textContent = labels.with_rank[state.lang];
        if (statsLeadersLabel) statsLeadersLabel.textContent = labels.leaders[state.lang];
        if (statsUpdatedLabel) statsUpdatedLabel.textContent = labels.last_updated[state.lang];

        // עדכון טקסט כפתור שינוי שפה (הכפתור מציג את השפה הבאה)
        if (langBtn) {
            langBtn.textContent = labels.lang_switch[state.lang];
            langBtn.setAttribute('aria-label', state.lang === 'he' ? 'Switch language to English' : 'החלף שפה לעברית');
        }

        if (dom.viewToggleBtn) {
            dom.viewToggleBtn.setAttribute('aria-pressed', String(state.isCardView));
            dom.viewToggleBtn.innerHTML = state.isCardView
                ? `<i class="fas fa-table"></i> ${labels.toggle_view_table[state.lang]}`
                : `<i class="fas fa-th-list"></i> ${labels.toggle_view_card[state.lang]}`;
        }

        // עדכון הטקסט של כפתורי פגינציה
        if (dom.prevPageBtn) dom.prevPageBtn.setAttribute('aria-label', labels.prev_page[state.lang]);
        if (dom.nextPageBtn) dom.nextPageBtn.setAttribute('aria-label', labels.next_page[state.lang]);
    }

    // === טעינת נתונים ===

    /**
     * מציג שכבת טעינה מעל המסך.
     */
    function showLoading() {
        if (!dom.loadingOverlay) return;
        dom.loadingOverlay.classList.add('visible');
        dom.loadingOverlay.setAttribute('aria-hidden', 'false');
        const loadingText = dom.loadingOverlay.querySelector('.loading-text');
        if (loadingText) {
            loadingText.textContent = labels.loading[state.lang];
        }
    }

    /**
     * מסתיר את שכבת הטעינה.
     */
    function hideLoading() {
        if (!dom.loadingOverlay) return;
        dom.loadingOverlay.classList.remove('visible');
        dom.loadingOverlay.setAttribute('aria-hidden', 'true');
    }

    /**
     * טוען את הנתונים מתוך CSV (באמצעות PapaParse) או מהעתקים משובצים (fallback).
     * לאחר הטעינה מבצע נרמול עמודות, חישוב סטטיסטיקות, ורינדור ראשוני.
     */
    async function loadData() {
        showLoading();
        try {
            // אם יש אלמנט עם data-csv-url, ננסה לטעון אותו.
            const csvHolder = document.getElementById('dataCSV');
            let csvUrl = csvHolder ? csvHolder.getAttribute('data-url') : null;

            if (csvUrl) {
                const response = await fetch(csvUrl, { cache: 'no-store' });
                if (!response.ok) throw new Error('Failed to fetch CSV');
                const csvText = await response.text();

                const result = Papa.parse(csvText, {
                    header: true,
                    skipEmptyLines: true,
                    dynamicTyping: false,
                    worker: false, // ניתן להפוך ל-true לביצועים טובים יותר בקבצים גדולים
                    error: (err) => console.error('PapaParse error:', err)
                });

                if (result.errors && result.errors.length > 0) {
                    console.warn('CSV parse warnings:', result.errors.slice(0, 3));
                }

                state.originalData = result.data.map(normalizeRecord);
            } else {
                // Fallback: אם אין CSV חיצוני, אולי יש נתונים משובצים (לדוגמה window.EMBEDDED_DATA).
                if (Array.isArray(window.EMBEDDED_DATA)) {
                    state.originalData = window.EMBEDDED_DATA.map(normalizeRecord);
                } else {
                    state.originalData = []; // אין נתונים
                }
            }

            computeStats();
            state.filteredData = [...state.originalData];
            populateFilters();
            initDateInputsRange();
            applySortAndRender();
            hideLoading();
        } catch (err) {
            console.error('Error loading data:', err);
            showToast('שגיאה בטעינת נתונים', 'error');
            hideLoading();
        }
    }

    /**
     * נרמול שדות רשומה (לדוגמה: שם השדה date, הדבקת ערכים ריקים, תיקון סוגים).
     * @param {Object} rec
     * @returns {Object}
     */
    function normalizeRecord(rec) {
        // דואגים שהשדה 'date' יתקיים גם אם המקור הוא 'Date'/'DATE'.
        if (rec.date == null && (rec.Date != null || rec.DATE != null)) {
            rec.date = rec.Date ?? rec.DATE;
        }
        // לוודא ששאר השדות קיימים.
        const def = (v) => (v == null ? '' : String(v));
        return {
            name_english: def(rec.name_english),
            name_arabic: def(rec.name_arabic),
            description_online: def(rec.description_online),
            location: def(rec.location),
            organization: def(rec.organization),
            rank_role: def(rec.rank_role),
            date: def(rec.date),
            notes: def(rec.notes)
        };
    }

    /**
     * מחשב סטטיסטיקות כלליות להצגה בחלק העליון של הדף.
     */
    function computeStats() {
        const data = state.originalData;
        state.stats.total = data.length;
        state.stats.withOnlineDesc = data.filter(r => r.description_online && r.description_online.trim() !== '').length;
        state.stats.withRank = data.filter(r => r.rank_role && r.rank_role.trim() !== '').length;
        // "leaders" מזוהה ע"י מחרוזת 'leader' (ניתן לשכלל בעתיד)
        state.stats.leaders = data.filter(r => (r.rank_role || '').toLowerCase().includes('leader')).length;

        // עדכון זמן אחרון (נניח על בסיס היום הנוכחי)
        const now = new Date();
        const pad2 = (n) => String(n).padStart(2, '0');
        const y = now.getFullYear(), m = pad2(now.getMonth() + 1), d = pad2(now.getDate());
        state.stats.lastUpdated = `${y}-${m}-${d}`;
        updateStatsUI();
    }

    /**
     * מעדכן את הרכיבים הסטטיסטיים ב-DOM.
     */
    function updateStatsUI() {
        if (dom.statsTotal) dom.statsTotal.textContent = state.stats.total.toString();
        if (dom.statsWithDesc) dom.statsWithDesc.textContent = state.stats.withOnlineDesc.toString();
        if (dom.statsWithRank) dom.statsWithRank.textContent = state.stats.withRank.toString();
        if (dom.statsLeaders) dom.statsLeaders.textContent = state.stats.leaders.toString();
        if (dom.statsUpdated) dom.statsUpdated.textContent = state.stats.lastUpdated;
    }

    /**
     * מאכלס את פילטרי ה-select בהתאם לנתונים (מיקום, ארגון, דרגה).
     */
    function populateFilters() {
        const locations = new Set();
        const orgs = new Set();
        const ranks = new Set();

        state.originalData.forEach(r => {
            if (r.location) locations.add(r.location.trim());
            if (r.organization) orgs.add(r.organization.trim());
            if (r.rank_role) ranks.add(r.rank_role.trim());
        });

        fillSelect(dom.locationFilter, Array.from(locations).sort(collator.compare));
        fillSelect(dom.organizationFilter, Array.from(orgs).sort(collator.compare));
        fillSelect(dom.rankFilter, Array.from(ranks).sort(collator.compare));
    }

      /**
     * ממלא <select> בערכים.
     * @param {HTMLSelectElement} selectEl
     * @param {string[]} options
     */
    function fillSelect(selectEl, options) {
        if (!selectEl) return;
        // מחיקת ערכים קיימים (מלבד האפשרות הריקה הראשונה).
        selectEl.innerHTML = '';
        const optEmpty = document.createElement('option');
        optEmpty.value = '';
        optEmpty.textContent = state.lang === 'he' ? 'הכל' : 'All';
        selectEl.appendChild(optEmpty);

        options.forEach(val => {
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = val;
            selectEl.appendChild(opt);
        });
    }

    // === לוגיקה של פילטרים, מיון ורינדור ===

    /**
     * מפעיל פילטרים על בסיס ה-state.filters,
     * ומעדכן state.filteredData.
     */
    function filterData() {
        const { location, org, rank, search, dateFrom, dateTo } = state.filters;
        const from = dateFrom ? new Date(dateFrom + 'T00:00:00Z') : null;
        const to   = dateTo   ? new Date(dateTo   + 'T23:59:59.999Z') : null;

        state.filteredData = state.originalData.filter(r => {
            const loc = (r.location || '').toLowerCase();
            const o   = (r.organization || '').toLowerCase();
            const rk  = (r.rank_role || '').toLowerCase();
            const searchString = [r.name_english, r.name_arabic, r.description_online, loc, o, rk, r.notes].join(' ').toLowerCase();
            const rawDate = r.date ?? r.Date ?? r.DATE ?? '';
            const recRange = parseDateRange(rawDate);
            const datePass = (!from && !to) || (recRange && rangesOverlap(recRange.start, recRange.end, from, to));

            return (!location || loc.includes(location)) &&
                   (!org || o.includes(org)) &&
                   (!rank || rk.includes(rank)) &&
                   (!search || searchString.includes(search)) &&
                   datePass;
        });
        state.currentPage = 0;
    }
function sortData() {
        const { column, direction } = state.sort;
        if (column === null) return;
        const key = dataFieldKeys[column];

        state.filteredData.sort((a, b) => {
            const valA = a[key] || '';
            const valB = b[key] || '';

            if (key === 'date') {
                const ra = parseDateRange(valA);
                const rb = parseDateRange(valB);
                const aTime = ra ? ra.start.getTime() : -Infinity;
                const bTime = rb ? rb.start.getTime() : -Infinity;
                if (aTime > bTime) return direction === 'asc' ? 1 : -1;
                if (aTime < bTime) return direction === 'asc' ? -1 : 1;
                return 0;
            }

            const cmp = ('' + valA).localeCompare(('' + valB), undefined, { numeric: true, sensitivity: 'base' });
            return direction === 'asc' ? cmp : -cmp;
        });
    }

    /**
     * מחיל מיון על הנתונים המסוננים ובסוף מרנדר אותם.
     */
    function applySortAndRender() {
        sortData();
        updateResultsCount();
        updatePaginationInfo();
        render();
    }

    /**
     * מעדכן את מונה התוצאות בתצוגה.
     */
    function updateResultsCount() {
        if (!dom.resultsCount) return;
        const count = state.filteredData.length;
        const text = `${labels.results_count[state.lang]}: ${count}`;
        dom.resultsCount.textContent = text;
    }

    /**
     * מעדכן מידע פגינציה (עמוד X מתוך Y).
     */
    function updatePaginationInfo() {
        if (!dom.paginationInfo) return;
        const total = state.filteredData.length;
        const pages = Math.max(1, Math.ceil(total / state.pagination.pageSize));
        const currentPage = state.pagination.currentPage + 1;
        dom.paginationInfo.textContent = `${labels.page[state.lang]} ${currentPage} ${labels.of[state.lang]} ${pages}`;
        dom.paginationInfo.setAttribute('aria-live', 'polite');
    }

    /**
     * שינוי עמוד בפגינציה.
     * @param {number} delta - שינוי (למשל +1 או -1).
     */
    function changePage(delta) {
        const total = state.filteredData.length;
        const pages = Math.max(1, Math.ceil(total / state.pagination.pageSize));
        let next = state.pagination.currentPage + delta;
        if (next < 0) next = 0;
        if (next >= pages) next = pages - 1;
        if (next !== state.pagination.currentPage) {
            state.pagination.currentPage = next;
            updatePaginationInfo();
            render();
            // גלילה לראש האזור
            if (dom.contentArea) dom.contentArea.scrollIntoView({ behavior: 'smooth' });
        }
    }

    /**
     * רינדור לפי מצב (כרטיסים/טבלה).
     */
    function render() {
        if (!dom.contentArea) return;
        dom.contentArea.innerHTML = '';

        if (state.isCardView) {
            renderCardsView();
        } else {
            renderTableView();
        }
    }

    /**
     * רינדור תצוגת כרטיסים.
     */
    function renderCardsView() {
        const data = state.filteredData;
        if (!data.length) {
            const empty = document.createElement('div');
            empty.className = 'empty';
            empty.textContent = labels.no_data[state.lang];
            dom.contentArea.appendChild(empty);
            return;
        }

        // בחירה האם להציג את כל הנתונים או רק חלק
        data.forEach(record => {
            const card = document.createElement('article');
            card.className = 'card';
            card.setAttribute('tabindex', '0');
            // כותרת
            const h3 = document.createElement('h3');
            h3.className = 'card-title';
            h3.textContent = record.name_english || record.name_arabic || '(No name)';
            card.appendChild(h3);
            
            const fields = [
                { key: 'name_arabic', label: headerLabels.name_arabic[state.lang], value: record.name_arabic },
                { key: 'description_online', label: headerLabels.description_online[state.lang], value: record.description_online },
                { key: 'location', label: headerLabels.location[state.lang], value: record.location },
                { key: 'organization', label: headerLabels.organization[state.lang], value: record.organization },
                { key: 'rank_role', label: headerLabels.rank_role[state.lang], value: record.rank_role },
                { key: 'date', label: headerLabels.date[state.lang], value: record.date },
                { key: 'notes', label: headerLabels.notes[state.lang], value: record.notes }
            ];

            const list = document.createElement('dl');
            list.className = 'card-list';
            fields.forEach(f => {
                if (!f.value) return;
                const dt = document.createElement('dt');
                dt.textContent = f.label;
                const dd = document.createElement('dd');
                dd.textContent = f.value;
                list.appendChild(dt);
                list.appendChild(dd);
            });

            card.appendChild(list);
            dom.contentArea.appendChild(card);
        });
    }

    /**
     * רינדור תצוגת טבלה.
     */
    function renderTableView() {
        const data = state.filteredData;
        const table = document.createElement('table');
        table.className = 'data-table';
        table.setAttribute('role', 'table');

        // אם אין נתונים
        if (!data.length) {
            const caption = document.createElement('caption');
            caption.textContent = state.lang === 'he' ? 'טבלת תוצאות' : 'Results table';
            table.appendChild(caption);
            const thead = document.createElement('thead');
            const trHead = document.createElement('tr');
            dataFieldKeys.forEach(k => {
                const th = document.createElement('th');
                th.textContent = getHeaderLabel(k);
                trHead.appendChild(th);
            });
            thead.appendChild(trHead);
            table.appendChild(thead);

            const tbody = document.createElement('tbody');
            const trEmpty = document.createElement('tr');
            const tdEmpty = document.createElement('td');
            tdEmpty.colSpan = dataFieldKeys.length;
            tdEmpty.textContent = labels.no_data[state.lang];
            trEmpty.appendChild(tdEmpty);
            tbody.appendChild(trEmpty);
            table.appendChild(tbody);
            dom.contentArea.appendChild(table);
            return;
        }

        // יצירת כותרת טבלה עם אפשרות מיון
        const thead = document.createElement('thead');
        const caption = document.createElement('caption');
        caption.textContent = state.lang === 'he' ? 'טבלת תוצאות' : 'Results table';
        table.appendChild(caption);
        const trHead = document.createElement('tr');
        dataFieldKeys.forEach((key, index) => {
            const th = document.createElement('th');
            th.textContent = getHeaderLabel(key);
            th.setAttribute('data-col', index.toString());
            th.dataset.col = index; // שמירת אינדקס העמודה למיון.
            th.style.cursor = 'pointer';
            th.setAttribute('scope','col');
            th.setAttribute('aria-sort', state.sort.column === index ? (state.sort.direction === 'asc' ? 'ascending' : 'descending') : 'none');
            th.tabIndex = 0;

            if (state.sort.column === index) {
                const icon = document.createElement('span');
                icon.className = `sort-icon ${state.sort.direction}`;
                icon.setAttribute('aria-hidden', 'true');
                icon.textContent = state.sort.direction === 'asc' ? '▲' : '▼';
                th.appendChild(icon);
            }

            th.addEventListener('click', () => sortAndRender(parseInt(th.dataset.col)));
            th.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    sortAndRender(parseInt(th.dataset.col));
                }
            });
            trHead.appendChild(th);
        });
        thead.appendChild(trHead);
        table.appendChild(thead);

        // יצירת גוף הטבלה עם פגינציה
        const tbody = document.createElement('tbody');

        const pageSize = state.pagination.pageSize;
        const start = state.pagination.currentPage * pageSize;
        const end = Math.min(start + pageSize, data.length);
        for (let i = start; i < end; i++) {
            const record = data[i];
            const tr = document.createElement('tr');
            dataFieldKeys.forEach(key => {
                const td = document.createElement('td');
                td.textContent = record[key] || '';
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        dom.contentArea.appendChild(table);
    }

    /**
     * פונקציה שמבצעת מיון לפי עמודה מסוימת ואז מרנדרת מחדש.
     * @param {number} colIndex - אינדקס העמודה למיון.
     */
    function sortAndRender(colIndex) {
        if (state.sort.column === colIndex) {
            state.sort.direction = state.sort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            state.sort.column = colIndex;
            state.sort.direction = 'asc';
        }
        applySortAndRender();
    }

    // === אירועים והאזנות ===

    /**
     * מאזין לשינויים ב-DOM (כפתורים, קלטים) ומעדכן את ה-state.
     */
    function setupEventListeners() {
        // מאזין לשינוי שפה.
        if (dom.langBtn) {
            dom.langBtn.addEventListener('click', () => {
                state.lang = state.lang === 'he' ? 'en' : 'he';
                document.documentElement.lang = state.lang;
                document.documentElement.dir = state.lang === 'he' ? 'rtl' : 'ltr';
                collator = new Intl.Collator(state.lang, { numeric: true, sensitivity: 'base' });
                // לאחר שינוי שפה, יש לעדכן את כל הטקסטים ואת התצוגה.
                updateTextByLang();
                applySortAndRender(); // מפעיל רינדור מחדש.
            });
        }
    // מערך של פילטרי בחירה עם מפתחות ה-DOM וה-state המתאימים.
        const selectFilters = [
            { element: dom.locationFilter, key: 'location' },
            { element: dom.orgFilter, key: 'org' },
            { element: dom.rankFilter, key: 'rank' }
        ];

        // לולאה ליצירת מאזיני שינוי (change) עבור פילטרי הבחירה.
        selectFilters.forEach(({ element, key }) => {
            if (element) {
                element.addEventListener('change', () => {
                    state.filters[key] = element.value.toLowerCase();
                    filterData();
                    applySortAndRender();
                });
            }
        });

        // מאזין לתיבת החיפוש עם debounce.
        if (dom.searchBox) {
            dom.searchBox.addEventListener('input', debouncedFilter);
        }

            // מאזיני שינוי לטווח תאריכים (אם קיימים)
        function onDateChange() {
            state.filters.dateFrom = dom.dateFromInput?.value || '';
            state.filters.dateTo   = dom.dateToInput?.value   || '';
            if (state.filters.dateFrom && state.filters.dateTo && state.filters.dateFrom > state.filters.dateTo) {
                showToast(labels.invalid_date_range[state.lang], 'warning');
                const tmp = state.filters.dateFrom;...
            }
            filterData();
            applySortAndRender();
        }
        if (dom.dateFromInput) dom.dateFromInput.addEventListener('change', onDateChange);
        if (dom.dateToInput)   dom.dateToInput.addEventListener('change', onDateChange);
        if (dom.clearDatesBtn) dom.clearDatesBtn.addEventListener('click', () => {
            if (dom.dateFromInput) dom.dateFromInput.value = '';
            if (dom.dateToInput)   dom.dateToInput.value   = '';
            state.filters.dateFrom = '';
            state.filters.dateTo   = '';
            filterData();
            applySortAndRender();
        });

        // מאזינים לכפתורי פגינציה.
        if (dom.prevPageBtn) dom.prevPageBtn.addEventListener('click', () => changePage(-1));
        if (dom.nextPageBtn) dom.nextPageBtn.addEventListener('click', () => changePage(1));
         
        // מאזין לכפתור החלפת תצוגה.
        if (dom.viewToggleBtn) {
            dom.viewToggleBtn.addEventListener('click', () => {
                state.isCardView = !state.isCardView;
                dom.viewToggleBtn.setAttribute('aria-pressed', String(state.isCardView));
                applySortAndRender();
            });
        }

        // מאזינים לכפתורי איפוס וייצוא.
        if (dom.resetBtn) dom.resetBtn.addEventListener('click', resetFilters);
        if (dom.exportBtn) dom.exportBtn.addEventListener('click', exportToCSV);
        
        // כפתור "חזרה לראש העמוד"
        if (dom.backToTop) {
            window.addEventListener('scroll', () => {
                const on = window.scrollY > 600;
                dom.backToTop.classList.toggle('visible', on);
            });
            dom.backToTop.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }
    }

    /**
     * מאזין לקלט חיפוש עם debounce.
     */
    function setupSearchDebounce() {
        if (!dom.searchInput) return;
        let timer = null;
        dom.searchInput.addEventListener('input', () => {
            const val = dom.searchInput.value.trim().toLowerCase();
            state.filters.search = val;
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                filterData();
                applySortAndRender();
            }, 250);
        });
    }

    /**
     * איפוס כל הפילטרים והחזרת התצוגה למצב התחלתי.
     */
    function resetFilters() {
        if (dom.locationFilter) dom.locationFilter.value = '';
        if (dom.organizationFilter) dom.organizationFilter.value = '';
        if (dom.rankFilter) dom.rankFilter.value = '';
        if (dom.searchInput) dom.searchInput.value = '';

        if (dom.dateFromInput) dom.dateFromInput.value = '';
        if (dom.dateToInput)   dom.dateToInput.value   = '';
        state.filters = { location: '', org: '', rank: '', search: '', dateFrom: '', dateTo: '' };

        filterData();
        applySortAndRender();
        showToast(state.lang === 'he' ? 'הפילטרים אופסו' : 'Filters reset', 'info');
    }

    /**
     * ייצוא הנתונים המסוננים לקובץ CSV להורדה.
     */
    function exportToCSV() {
        const headers = dataFieldKeys.map(k => `"${getHeaderLabel(k).replace(/"/g, '""')}"`).join(',');
        const rows = state.filteredData.map(r => {
            return dataFieldKeys.map(k => `"${String(r[k] || '').replace(/"/g, '""')}"`).join(',');
        });
        const csvContent = [headers, ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'export.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // קביעת min/max לשדות תאריך לפי הנתונים
    function initDateInputsRange() {
        if (!dom.dateFromInput || !dom.dateToInput) return;
        const ranges = state.originalData.map(r => parseDateRange(r.date ?? r.Date ?? r.DATE)).filter(Boolean);
        if (!ranges.length) return;
        const minStart = ranges.reduce((a, r) => r.start < a ? r.start : a, ranges[0].start);
        const maxEnd   = ranges.reduce((a, r) => r.end   > a ? r.end   : a, ranges[0].end);
        const minISO = new Date(minStart.getTime()).toISOString().slice(0,10);
        const maxISO = new Date(maxEnd.getTime()).toISOString().slice(0,10);
        dom.dateFromInput.min = minISO;
        dom.dateFromInput.max = maxISO;
        dom.dateToInput.min   = minISO;
        dom.dateToInput.max   = maxISO;
    }

    // === אתחול האפליקציה ===

    /**
     * אתחול כללי: עדכון טקסטים, חיבור מאזינים, טעינת נתונים ורינדור ראשוני.
     */
    function init() {
        updateTextByLang();
        setupEventListeners();
        setupSearchDebounce();
        loadData();
        // רישום Service Worker (אם קיים), לצורך קאשינג משאבים.
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW register failed:', err));
        }
    }

    // מפעילים את האתחול כאשר ה-DOM מוכן.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
        
