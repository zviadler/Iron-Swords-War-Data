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
        'Post No.': { he: 'מספר פוסט', en: 'Post No.' },
        'Fighter No.': { he: 'מספר לוחם', en: 'Fighter No.' },
        'Date': { he: 'תאריך', en: 'Date' },
        'Location': { he: 'מיקום', en: 'Location' },
        'Location Details': { he: 'פרטי מיקום', en: 'Location Details' },
        'Name in English': { he: 'שם באנגלית', en: 'Name in English' },
        'Name in Arabic': { he: 'שם בערבית', en: 'Name in Arabic' },
        'Nickname': { he: 'כינוי', en: 'Nickname' },
        'Social Media Description': { he: 'תיאור מדיה חברתית', en: 'Social Media Description' },
        'Rank/Role': { he: 'דרגה/תפקיד', en: 'Rank/Role' },
        'Organization': { he: 'ארגון', en: 'Organization' },
        'Activity': { he: 'פעילות', en: 'Activity' },
        'Family Members': { he: 'בני משפחה', en: 'Family Members' },
        'No. of Victims': { he: 'מספר קורבנות', en: 'No. of Victims' },
        'Additional Fighters': { he: 'לוחמים נוספים', en: 'Additional Fighters' },
        'Notes': { he: 'הערות', en: 'Notes' }
    };

    // מפתחי השדות לתצוגה טבלאית (סדר העמודות).
    const dataFieldKeys = [
        'Post No.', 'Fighter No.', 'Date', 'Location', 'Location Details', 'Name in English',
        'Name in Arabic', 'Nickname', 'Social Media Description', 'Rank/Role',
        'Organization', 'Activity', 'Family Members', 'No. of Victims',
        'Additional Fighters', 'Notes'
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
        // לוודא ששאר השדות קיימים.
        const def = (v) => (v == null ? '' : String(v));
        return {
            'Post No.': def(rec['Post No.']),
            'Fighter No.': def(rec['Fighter No.']),
            'Date': def(rec['Date']),
            'Location': def(rec['Location']),
            'Location Details': def(rec['Location Details']),
            'Name in English': def(rec['Name in English']),
            'Name in Arabic': def(rec['Name in Arabic']),
            'Nickname': def(rec['Nickname']),
            'Social Media Description': def(rec['Social Media Description']),
            'Rank/Role': def(rec['Rank/Role']),
            'Organization': def(rec['Organization']),
            'Activity': def(rec['Activity']),
            'Family Members': def(rec['Family Members']),
            'No. of Victims': def(rec['No. of Victims']),
            'Additional Fighters': def(rec['Additional Fighters']),
            'Notes': def(rec['Notes']),
        };
    }

    /**
     * מחשב סטטיסטיקות כלליות להצגה בחלק העליון של הדף.
     */
    function computeStats() {
        const data = state.originalData;
        state.stats.total = data.length;
        state.stats.withOnlineDesc = data.filter(r => r['Social Media Description'] && r['Social Media Description'].trim() !== '').length;
        state.stats.withRank = data.filter(r => r['Rank/Role'] && r['Rank/Role'].trim() !== '').length;
        // "leaders" מזוהה ע"י מחרוזת 'leader' (ניתן לשכלל בעתיד)
        state.stats.leaders = data.filter(r => (r['Rank/Role'] || '').toLowerCase().includes('leader')).length;
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
            if (r.Location) locations.add(r.Location.trim());
            if (r.Organization) orgs.add(r.Organization.trim());
            if (r['Rank/Role']) ranks.add(r['Rank/Role'].trim());
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
        const searchTerms = search.toLowerCase().split(/\s+/).filter(Boolean);

        state.filteredData = state.originalData.filter(record => {
            const recordNameEn = (record['Name in English'] || '').toLowerCase();
            const recordNameAr = (record['Name in Arabic'] || '').toLowerCase();
            const recordDesc = (record['Social Media Description'] || '').toLowerCase();
            const recordLocation = (record.Location || '').toLowerCase();
            const recordOrg = (record.Organization || '').toLowerCase();
            const recordRank = (record['Rank/Role'] || '').toLowerCase();

            // פילטר חיפוש חופשי
            const matchesSearch = searchTerms.length === 0 || searchTerms.every(term =>
                recordNameEn.includes(term) ||
                recordNameAr.includes(term) ||
                recordDesc.includes(term)
            );

            // פילטר מיקום
            const matchesLocation = !location || recordLocation === location.toLowerCase();

            // פילטר ארגון
            const matchesOrg = !org || recordOrg === org.toLowerCase();

            // פילטר דרגה
            const matchesRank = !rank || recordRank === rank.toLowerCase();

            // פילטר תאריכים
            const recordDateRange = parseDateRange(record['Date']);
            const filterStartDate = dateFrom ? new Date(dateFrom) : null;
            const filterEndDate = dateTo ? new Date(dateTo) : null;
            const matchesDateRange = !recordDateRange || rangesOverlap(recordDateRange.start, recordDateRange.end, filterStartDate, filterEndDate);

            return matchesSearch && matchesLocation && matchesOrg && matchesRank && matchesDateRange;
        });
        state.pagination.currentPage = 0; // חזרה לעמוד הראשון לאחר סינון
        updateResultsCount();
        applySortAndRender();
    }

    /**
     * מיישם את הגדרות המיון הנוכחיות על הנתונים המסוננים
     * ומבצע רינדור מחדש.
     */
    function applySortAndRender() {
        const { column, direction } = state.sort;
        if (column) {
            state.filteredData.sort((a, b) => {
                const aVal = a[column] || '';
                const bVal = b[column] || '';
                let res;
                if (column === 'Date') {
                    const aDate = parseDateRange(aVal)?.start || new Date(0);
                    const bDate = parseDateRange(bVal)?.start || new Date(0);
                    res = aDate.getTime() - bDate.getTime();
                } else {
                    res = collator.compare(aVal, bVal);
                }
                return direction === 'asc' ? res : -res;
            });
        }
        renderContent();
    }

    /**
     * מרנדר את התוכן הראשי (כרטיסים או טבלה) על בסיס הנתונים המסוננים
     * והגדרות הפגינציה הנוכחיות.
     */
    function renderContent() {
        if (!dom.contentArea) return;

        const { currentPage, pageSize } = state.pagination;
        const start = currentPage * pageSize;
        const end = start + pageSize;
        const dataToRender = state.filteredData.slice(start, end);

        if (state.isCardView) {
            renderCards(dataToRender);
        } else {
            renderTable(dataToRender);
        }

        updatePaginationUI();
    }
    /**
     * מרנדר את התוכן כרשימת כרטיסים.
     * @param {Object[]} data - הנתונים לרינדור.
     */
    function renderCards(data) {
        if (!dom.contentArea) return;
        dom.contentArea.innerHTML = '';
        dom.contentArea.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';

        if (data.length === 0) {
            dom.contentArea.innerHTML = `<p class="no-data">${labels.no_data[state.lang]}</p>`;
            return;
        }

        data.forEach(item => {
            const card = document.createElement('div');
            card.className = 'card';
            // יצירת תוכן ה-HTML לכרטיס
            let cardContent = `<div class="card-header">`;
            if (item['Name in English']) {
                cardContent += `<h3>${item['Name in English']}</h3>`;
            }
            if (item['Name in Arabic']) {
                cardContent += `<p class="arabic-name">${item['Name in Arabic']}</p>`;
            }
            cardContent += `</div><div class="card-body">`;
            cardContent += `<ul>`;
            dataFieldKeys.forEach(key => {
                const value = item[key];
                if (key !== 'Name in English' && key !== 'Name in Arabic' && value) {
                    cardContent += `<li><strong>${getHeaderLabel(key)}:</strong> ${value}</li>`;
                }
            });
            cardContent += `</ul></div>`;
            card.innerHTML = cardContent;
            dom.contentArea.appendChild(card);
        });
    }

    /**
     * מרנדר את התוכן כטבלה.
     * @param {Object[]} data - הנתונים לרינדור.
     */
    function renderTable(data) {
        if (!dom.contentArea) return;
        dom.contentArea.innerHTML = '';
        dom.contentArea.className = 'table-container';

        if (data.length === 0) {
            dom.contentArea.innerHTML = `<p class="no-data">${labels.no_data[state.lang]}</p>`;
            return;
        }

        const table = document.createElement('table');
        table.className = 'records-table';
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        // יצירת כותרות הטבלה
        const headerRow = document.createElement('tr');
        dataFieldKeys.forEach(key => {
            const th = document.createElement('th');
            th.textContent = getHeaderLabel(key);
            th.dataset.sortKey = key;
            th.className = 'sortable-header';
            if (state.sort.column === key) {
                th.classList.add(state.sort.direction);
            }
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // יצירת שורות הטבלה
        data.forEach(item => {
            const tr = document.createElement('tr');
            dataFieldKeys.forEach(key => {
                const td = document.createElement('td');
                td.textContent = item[key] || '';
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        dom.contentArea.appendChild(table);
    }

    /**
     * מעדכן את ממשק המשתמש של הפגינציה.
     */
    function updatePaginationUI() {
        const { currentPage, pageSize } = state.pagination;
        const totalPages = Math.ceil(state.filteredData.length / pageSize);

        if (dom.paginationInfo) {
            if (state.filteredData.length === 0) {
                dom.paginationInfo.textContent = '';
            } else {
                dom.paginationInfo.textContent = `${labels.page[state.lang]} ${currentPage + 1} ${labels.of[state.lang]} ${totalPages}`;
            }
        }

        if (dom.prevPageBtn) {
            dom.prevPageBtn.disabled = currentPage === 0;
            dom.prevPageBtn.classList.toggle('disabled', currentPage === 0);
        }
        if (dom.nextPageBtn) {
            dom.nextPageBtn.disabled = currentPage >= totalPages - 1;
            dom.nextPageBtn.classList.toggle('disabled', currentPage >= totalPages - 1);
        }
    }

 /**
     * מעדכן את מספר התוצאות המוצגות.
     */
    function updateResultsCount() {
        if (dom.resultsCount) {
            dom.resultsCount.textContent = `${labels.results_count[state.lang]}: ${state.filteredData.length}`;
        }
    }

    // === איוונטים (מאזינים) ===

    /**
     * הגדרת כל המאזינים לאירועי DOM.
     */
    function setupEventListeners() {
        if (dom.langBtn) {
            dom.langBtn.addEventListener('click', () => {
                state.lang = state.lang === 'he' ? 'en' : 'he';
                collator = new Intl.Collator(state.lang, { numeric: true, sensitivity: 'base' });
                updateTextByLang();
                renderContent(); // רינדור מחדש עם הכותרות בשפה החדשה
            });
        }
        if (dom.viewToggleBtn) {
            dom.viewToggleBtn.addEventListener('click', () => {
                state.isCardView = !state.isCardView;
                updateTextByLang();
                renderContent();
            });
        }
        if (dom.searchInput) {
            dom.searchInput.addEventListener('input', () => {
                state.filters.search = dom.searchInput.value;
                debounceFilter();
            });
        }
        if (dom.locationFilter) {
            dom.locationFilter.addEventListener('change', () => {
                state.filters.location = dom.locationFilter.value;
                filterData();
            });
        }
        if (dom.organizationFilter) {
            dom.organizationFilter.addEventListener('change', () => {
                state.filters.org = dom.organizationFilter.value;
                filterData();
            });
        }
        if (dom.rankFilter) {
            dom.rankFilter.addEventListener('change', () => {
                state.filters.rank = dom.rankFilter.value;
                filterData();
            });
        }
        if (dom.resetBtn) {
            dom.resetBtn.addEventListener('click', () => {
                state.filters = { location: '', org: '', rank: '', search: '', dateFrom: '', dateTo: '' };
                dom.searchInput.value = '';
                dom.locationFilter.value = '';
                dom.organizationFilter.value = '';
                dom.rankFilter.value = '';
                dom.dateFromInput.value = '';
                dom.dateToInput.value = '';
                filterData();
            });
        }
        if (dom.exportBtn) {
            dom.exportBtn.addEventListener('click', () => {
                exportFilteredDataToCSV();
            });
        }
        if (dom.prevPageBtn) {
            dom.prevPageBtn.addEventListener('click', () => {
                if (state.pagination.currentPage > 0) {
                    state.pagination.currentPage--;
                    renderContent();
                }
            });
        }
        if (dom.nextPageBtn) {
            dom.nextPageBtn.addEventListener('click', () => {
                const totalPages = Math.ceil(state.filteredData.length / state.pagination.pageSize);
                if (state.pagination.currentPage < totalPages - 1) {
                    state.pagination.currentPage++;
                    renderContent();
                }
            });
        }
        // מאזין לאירועי לחיצה על כותרות הטבלה למיון
        if (dom.contentArea) {
            dom.contentArea.addEventListener('click', (e) => {
                if (!state.isCardView) {
                    const header = e.target.closest('th');
                    if (header && header.dataset.sortKey) {
                        const newColumn = header.dataset.sortKey;
                        if (state.sort.column === newColumn) {
                            state.sort.direction = state.sort.direction === 'asc' ? 'desc' : 'asc';
                        } else {
                            state.sort.column = newColumn;
                            state.sort.direction = 'asc';
                        }
                        applySortAndRender();
                    }
                }
            });
        }
        if (dom.dateFromInput) {
            dom.dateFromInput.addEventListener('change', () => {
                state.filters.dateFrom = dom.dateFromInput.value;
                filterData();
            });
        }
        if (dom.dateToInput) {
            dom.dateToInput.addEventListener('change', () => {
                state.filters.dateTo = dom.dateToInput.value;
                filterData();
            });
        }
        if (dom.clearDatesBtn) {
            dom.clearDatesBtn.addEventListener('click', () => {
                dom.dateFromInput.value = '';
                dom.dateToInput.value = '';
                state.filters.dateFrom = '';
                state.filters.dateTo = '';
                filterData();
            });
        }
        if (dom.backToTop) {
            dom.backToTop.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            window.addEventListener('scroll', () => {
                if (window.scrollY > 200) {
                    dom.backToTop.classList.add('visible');
                } else {
                    dom.backToTop.classList.remove('visible');
                }
            });
        }
    }

    let debounceTimeout;
    function setupSearchDebounce() {
        if (dom.searchInput) {
            dom.searchInput.addEventListener('input', () => {
                clearTimeout(debounceTimeout);
                state.filters.search = dom.searchInput.value;
                debounceTimeout = setTimeout(() => {
                    filterData();
                }, 300); // השהייה של 300ms
            });
        }
    }

    /**
     * ייצוא נתונים ל-CSV.
     */
    function exportFilteredDataToCSV() {
        if (state.filteredData.length === 0) {
            showToast('אין נתונים לייצוא.', 'warning');
            return;
        }

        const headers = dataFieldKeys.map(key => getHeaderLabel(key));
        const dataRows = state.filteredData.map(row =>
            dataFieldKeys.map(key => `"${(row[key] || '').replace(/"/g, '""')}"`).join(',')
        ).join('\n');

        const csvContent = `${headers.join(',')}\n${dataRows}`;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'filtered_data.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
    // קביעת min/max לשדות תאריך לפי הנתונים
    function initDateInputsRange() {
        if (!dom.dateFromInput || !dom.dateToInput) return;
        const ranges = state.originalData.map(r => parseDateRange(r['Date'])).filter(Boolean);
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
            navigator.serviceWorker.register('/service-worker.js').then(
                () => console.log('Service Worker registered successfully.'),
                (err) => console.error('Service Worker registration failed:', err)
            );
        }
    }

    window.addEventListener('DOMContentLoaded', init);

})();
