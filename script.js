(function () {
    'use strict';

    // === מצב מרכזי של האפליקציה ===
    // 'state' אובייקט המכיל את כל הנתונים הדינמיים וההגדרות של האפליקציה.
    // שימוש באובייקט אחד לניהול מצב משפר את הקריאות והתחזוקה.
    const state = {
        originalData: [], // מערך הנתונים המקוריים שנטענו (לא מסוננים).
        filteredData: [], // מערך הנתונים הנוכחיים לאחר סינון.
        currentPage: 0, // העמוד הנוכחי בתצוגת טבלה.
        VISIBLE_ROWS: 50, // מספר השורות המוצגות לעמוד בתצוגת טבלה.
        sort: { column: null, direction: 'asc' }, // הגדרות מיון: עמודה וכיוון (עלייה/ירידה).
        filters: { location: '', org: '', rank: '', search: '' }, // פילטרים נוכחיים.
        lang: (navigator.language || navigator.userLanguage).startsWith('he') ? 'he' : 'en', // שפת האפליקציה (עברית/אנגלית).
        isCardView: window.innerWidth <= 768 // קובע האם להציג בתצוגת כרטיסים (למובייל).
    };

    // === אלמנטי DOM ===
    // 'dom' אובייקט המכיל הפניות לכל האלמנטים ב-DOM שיש איתם אינטראקציה.
    // מרכז את כל בחירות ה-DOM במקום אחד, מה שמשפר ביצועים וקריאות.
    const dom = {
        contentArea: document.getElementById('contentArea'),
        loadingOverlay: document.getElementById('loadingOverlay'),
        toastContainer: document.getElementById('toastContainer'),
        locationFilter: document.getElementById('locationFilter'),
        orgFilter: document.getElementById('orgFilter'),
        rankFilter: document.getElementById('rankFilter'),
        searchBox: document.getElementById('searchBox'),
        langBtn: document.getElementById('langBtn'),
        viewToggleBtn: document.getElementById('viewToggleBtn'),
        exportBtn: document.getElementById('exportBtn'),
        resetBtn: document.getElementById('resetBtn'),
        prevPageBtn: document.getElementById('prevPageBtn'),
        nextPageBtn: document.getElementById('nextPageBtn'),
        pageInfo: document.getElementById('pageInfo'),
        resultsCounter: document.getElementById('resultsCounter'),
        totalCombatants: document.getElementById('totalCombatants'),
        totalCasualties: document.getElementById('totalCasualties'),
        familyCasualties: document.getElementById('familyCasualties'),
        highRanking: document.getElementById('highRanking'),
        mobileFiltersToggle: document.getElementById('mobileFiltersToggle'),
        filtersBar: document.getElementById('filtersBar')
    };

    // === מפת שדות נתונים ===
    // הגדרה מפורשת של מפתחות השדות בנתונים, לשמירה על עקביות.
    const dataFieldKeys = [
        'post_id', 'combatant_id', 'date', 'location', 'location_details',
        'name_english', 'name_arabic', 'nickname', 'description_online',
        'rank_role', 'organization', 'activity', 'family_casualties_info',
        'casualties_count', 'additional_combatants', 'notes'
    ];

    // === תרגומים ===
    // 'labels' אובייקט המכיל את כל הטקסטים באפליקציה בשפות שונות.
    // מאפשר לוקליזציה קלה ומרכזית.
    const labels = {
        site_title: { he: "מאגר זיהוי לוחמים", en: "Combatant Identification Database" },
        site_sub: { he: "נתונים מתעדכנים באופן רציף", en: "Data updated continuously" },
        post_id: { he: "מס' פוסט", en: "Post ID" },
        combatant_id: { he: "מס' לוחם", en: "Combatant ID" },
        date: { he: "תאריך", en: "Date" },
        location: { he: "מיקום", en: "Location" },
        location_details: { he: "פירוט מיקום", en: "Location Details" },
        name_english: { he: "שם באנגלית", en: "English Name" },
        name_arabic: { he: "שם בערבית", en: "Arabic Name" },
        nickname: { he: "כינוי", en: "Nickname" },
        description_online: { he: "תיאור ברשת", en: "Online Description" },
        rank_role: { he: "דרגה/תפקיד", en: "Rank/Role" },
        organization: { he: "ארגון", en: "Organization" },
        activity: { he: "פעילות", en: "Activity" },
        family_casualties_info: { he: "בני משפחה", en: "Family" },
        casualties_count: { he: "מס' קורבנות", en: "Victims" },
        additional_combatants: { he: "לוחמים נוספים", en: "Other Fighters" },
        notes: { he: "הערות", en: "Notes" },
        toggle_view_card: { he: "עבור לתצוגת כרטיסים", en: "Switch to Card View" },
        toggle_view_table: { he: "עבור לתצוגת טבלה", en: "Switch to Table View" },
        search_placeholder: { he: "🔍 חפש שם, מיקום או תיאור...", en: "🔍 Search name, location or description..." },
        reset_filters: { he: "איפוס פילטרים", en: "Reset Filters" },
        export_csv: { he: "ייצא ל-CSV", en: "Export to CSV" },
        total_combatants: { he: "סה\"כ לוחמים", en: "Total Combatants" },
        total_casualties: { he: "סה\"כ קורבנות", en: "Total Casualties" },
        family_members: { he: "בני משפחה", en: "Family Members" },
        high_ranking: { he: "בכירים", en: "High Ranking" },
        loading_data: { he: "טוען נתונים...", en: "Loading data..." },
        no_matching_data: { he: "לא נמצאו תוצאות תואמות", en: "No matching results found" },
        error_loading_data: { he: "שגיאה בטעינת הנתונים: ", en: "Error loading data: " },
        previous_page: { he: "הקודם", en: "Previous" },
        next_page: { he: "הבא", en: "Next" },
        page_info: { he: "עמוד {current} מתוך {total}", en: "Page {current} of {total}" },
        export_success: { he: "הנתונים יוצאו בהצלחה!", en: "Data exported successfully!" },
        export_no_data: { he: "אין נתונים לייצוא.", en: "No data to export." },
        filter_reset_success: { he: "הפילטרים אופסו.", en: "Filters reset." },
        results_found: { he: "נמצאו {count} תוצאות", en: "{count} results found" },
        result_found: { he: "נמצאה תוצאה אחת", en: "1 result found" },
        open_filters: { he: "פתח פילטרים", en: "Open Filters" },
        close_filters: { he: "סגור פילטרים", en: "Close Filters" },
        all: { he: "הכל", en: "All" }
    };

    // === נתונים משובצים (Embedded Data) ===
    // נתונים סטטיים לשימוש במקרה של כשל בטעינת קובץ ה-CSV.
    const embeddedData = [
        {
            "post_id": "1", "combatant_id": "1", "date": "25-APR-2025", "location": "Unknown", "location_details": "-",
            "name_english": "Muhammad Baraka Ayish Al-Amur", "name_arabic": "محمد بركة عايش العامور", "nickname": "-",
            "description_online": "-", "rank_role": "Member of Military Council", "organization": "Al-Mujahideen Battalions",
            "activity": "-", "family_casualties_info": "wife, 2 sons, 5 daughters", "casualties_count": "9",
            "additional_combatants": "-", "notes": "-"
        },
        {
            "post_id": "2", "combatant_id": "2", "date": "24-APR-2025", "location": "Al Zawaida (Central Camps)", "location_details": "tent",
            "name_english": "Imad Al-Baba \"Abu Ashraf\"", "name_arabic": "عماد البابא \"אבו אשרף\"", "nickname": "אבו אשרף",
            "description_online": "-", "rank_role": "Leader of Military Intelligence Service", "organization": "Al-Mujahideen Battalions",
            "activity": "-", "family_casualties_info": "1 other man, 1 child", "casualties_count": "3",
            "additional_combatants": "-", "notes": "-"
        },
        {
            "post_id": "3", "combatant_id": "3", "date": "22-APR-2025", "location": "Gaza City, al-Shati", "location_details": "-",
            "name_english": "Youssef Saleem Bakr", "name_arabic": "יוסף סלים בכר", "nickname": "-",
            "description_online": "\"leader (al-Qa'id) and a heroic martyr (al-Batal)\"", "rank_role": "Leader", "organization": "-",
            "activity": "-", "family_casualties_info": "wife, daughter", "casualties_count": "1",
            "additional_combatants": "4", "notes": "Funeral with gunshots"
        }
    ];

    // אובייקט Collator למיון טקסט רגיש לשפה (כולל מספרים ותווים מיוחדים).
    let collator = new Intl.Collator(state.lang, { numeric: true, sensitivity: 'base' });

    // === פונקציות עזר כלליות ===

    /**
     * מנקה קלט מחשש ל-XSS על ידי המרת תווי HTML.
     * @param {string} input - המחרוזת לניקוי.
     * @returns {string} - המחרושקת המנוקה.
     */
    function sanitize(input) {
        if (input === null || input === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(input);
        return div.innerHTML;
    }

    /**
     * מדגיש מונח חיפוש בתוך טקסט.
     * @param {string} text - הטקסט המקורי.
     * @param {string} term - מונח החיפוש להדגשה.
     * @returns {string} - הטקסט עם הדגשות HTML.
     */
    function highlight(text, term) {
        if (!term || !text) return sanitize(text);
        const safeText = sanitize(text);
        // יצירת ביטוי רגולרי מהמונח, תוך כדי בריחת תווים מיוחדים.
        const safeTerm = sanitize(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // החלפת המופעים של המונח בתגית <mark> (לא רגיש לרישיות).
        return safeText.replace(new RegExp(`(${safeTerm})`, 'gi'), '<mark>$1</mark>');
    }

    /**
     * פונקציית Debounce למניעת הפעלה מרובה ומהירה של פונקציות.
     * שימושי לחיפוש בזמן הקלדה (input events).
     * @param {function} fn - הפונקציה להפעלה.
     * @param {number} ms - זמן ההמתנה במילישניות לפני הפעלת הפונקציה.
     * @returns {function} - הפונקציה שעברה Debounce.
     */
    function debounce(fn, ms = 300) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), ms);
        };
    }

    /**
     * ממיר כותרות CSV מוכרות למפתחות אחידים וסטנדרטיים.
     * פונקציה זו עדיין רלוונטית כדי להבטיח עקביות במפתחות האובייקטים.
     * @param {string} header - כותרת העמודה.
     * @returns {string} - מפתח השדה המנורמל.
     */
    function normalizeHeader(header) {
        // מפה של כותרות נפוצות (בעברית ובאנגלית) למפתחות אחידים.
        const map = {
            "מס' פוסט": 'post_id', "post no.": 'post_id',
            "מס' לוחם": 'combatant_id', "fighter no.": 'combatant_id',
            'תאריך': 'date', 'date': 'date',
            'מיקום': 'location', 'location': 'location',
            'פירוט מיקום': 'location_details', 'location details': 'location_details',
            'שם באנגלית': 'name_english', 'name in english': 'name_english',
            'שם בערבית': 'name_arabic', 'name in arabic': 'name_arabic',
            'כינוי': 'nickname', 'nickname': 'nickname',
            'תיאור ברשת': 'description_online', 'social media description': 'description_online',
            'דרגה/תפקיד': 'rank_role', 'rank/role': 'rank_role',
            'ארגון': 'organization', 'organization': 'organization',
            'פעילות': 'activity', 'activity': 'activity',
            'בני משפחה': 'family_casualties_info', 'family members': 'family_casualties_info',
            "מס' קורבנות": 'casualties_count', 'no. of victims': 'casualties_count',
            'לוחמים נוספים': 'additional_combatants', 'additional fighters': 'additional_combatants',
            'הערות': 'notes', 'notes': 'notes'
        };
        // המרה ל-lower case והחלפת רווחים בקו תחתון עבור כותרות לא מוגדרות מראש.
        return map[header.trim().toLowerCase()] || header.trim().toLowerCase().replace(/ /g, '_').replace(/[^a-z0-9_]/g, '');
    }

    // === מצב טעינה והתראות ===

    /**
     * מציג את שכבת הטעינה עם הודעה נתונה.
     * @param {string} message - ההודעה להצגה.
     */
    function showLoading(message) {
        if (dom.loadingOverlay) {
            const text = dom.loadingOverlay.querySelector('.loading-text');
            if (text) text.textContent = message;
            dom.loadingOverlay.classList.remove('hidden');
        }
    }

    /**
     * מסתיר את שכבת הטעינה.
     */
    function hideLoading() {
        if (dom.loadingOverlay) {
            dom.loadingOverlay.classList.add('hidden');
        }
    }

    /**
     * מציג הודעת טוסט (הודעה קצרה נעלמת).
     * @param {string} message - ההודעה להצגה.
     * @param {string} [type='success'] - סוג ההודעה (success, error, info).
     * @param {number} [duration=3000] - משך ההצגה במילישניות.
     */
    function showToast(message, type = 'success', duration = 3000) {
        if (!dom.toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`; // הוספת קלאס לסגנון.
        toast.textContent = message;
        dom.toastContainer.appendChild(toast);
        // הסרת הטוסט לאחר משך זמן נתון.
        setTimeout(() => toast.remove(), duration);
    }

    // === טעינת נתונים ===

    /**
     * טוען נתונים מקובץ CSV באמצעות PapaParse או משתמש בנתונים משובצים.
     * @param {string} url - כתובת ה-URL של קובץ ה-CSV.
     * @returns {Promise<Array<Object>>} - Promise המכיל את הנתונים המנותחים.
     */
    async function loadCSVData(url) {
        console.log('Loading from:', url);

        // במצב של טעינה מקומית (פרוטוקול file:), השתמש בנתונים המשובצים.
        if (window.location.protocol === 'file:') {
            console.log('Using embedded data');
            return embeddedData;
        }

        return new Promise((resolve, reject) => {
            Papa.parse(url, {
                download: true, // PapaParse יטפל בהורדת הקובץ.
                header: true,   // PapaParse ינתח את השורה הראשונה ככותרות.
                skipEmptyLines: true, // ידלג על שורות ריקות.
                transformHeader: normalizeHeader, // השתמש בפונקציית normalizeHeader שלנו.
                worker: false,
                complete: (results) => {
                    if (results.errors.length) {
                        console.error('PapaParse errors:', results.errors);
                        // ניתן לטפל בשגיאות ספציפיות כאן אם רוצים.
                    }
                    if (!results.data || results.data.length === 0) {
                        return reject(new Error('Empty or invalid CSV data after parsing.'));
                    }
                    // PapaParse כבר מחזיר מערך של אובייקטים, כל שורה היא אובייקט עם מפתחות הכותרות.
                    // ננקה ערכים ריקים או null ל-'' כדי לשמור על עקביות.
                    const parsedData = results.data.map(row => {
                        const newRow = {};
                        for (const key in row) {
                            newRow[key] = row[key] === null || row[key] === undefined ? '' : String(row[key]).trim();
                        }
                        return newRow;
                    });
                    resolve(parsedData);
                },
                error: (err) => {
                    console.error('PapaParse failed:', err);
                    reject(err);
                }
            });
        });
    }

    /**
     * פונקציה ראשית לטעינת הנתונים (מ-CSV או משובצים).
     * מציגה הודעות טעינה ושגיאה, ומפעילה עדכוני UI לאחר הטעינה.
     */
    async function loadData() {
        showLoading(labels.loading_data[state.lang]);
        try {
            // הקריאה ל-loadCSVData תשתמש כעת ב-PapaParse
            state.originalData = await loadCSVData('data.csv');
            console.log(`Loaded ${state.originalData.length} records`);
        } catch (error) {
            console.error('Failed to load CSV, using embedded data:', error);
            state.originalData = embeddedData; // שימוש בנתונים משובצים במקרה של כשל.
            showToast(labels.error_loading_data[state.lang] + error.message, 'error');
            showToast(state.lang === 'he' ? 'משתמש בנתונים לדוגמה.' : 'Using sample data.', 'info'); // הודעה למשתמש.
        } finally {
            state.filteredData = [...state.originalData];
            populateFilters();
            applySortAndRender();
            hideLoading();
        }
    }

    // === פילטרים ===

    /**
     * ממלא את תיבות הבחירה של הפילטרים (מיקום, ארגון, דרגה) עם ערכים ייחודיים מהנתונים.
     */
    function populateFilters() {
        // שימוש ב-Set לאיסוף ערכים ייחודיים.
        const sets = { location: new Set(), org: new Set(), rank: new Set() };
        state.originalData.forEach(r => {
            if (r.location && r.location !== '-') sets.location.add(r.location);
            if (r.organization && r.organization !== '-') sets.org.add(r.organization);
            if (r.rank_role && r.rank_role !== '-') sets.rank.add(r.rank_role);
        });

        // יצירה דינמית של אפשרויות בתיבות הבחירה.
        [
            ['locationFilter', 'location'],
            ['orgFilter', 'org'],
            ['rankFilter', 'rank']
        ].forEach(([id, key]) => {
            const select = dom[id];
            if (!select) return; // וודא שהאלמנט קיים.
            const allText = labels.all[state.lang];
            select.innerHTML = `<option value="">${allText}</option>`; // הוספת אפשרות "הכל".
            // הוספת הערכים הייחודיים ממוינים.
            Array.from(sets[key]).sort((a, b) => collator.compare(a, b)).forEach(val => {
                select.insertAdjacentHTML('beforeend', `<option value="${sanitize(val)}">${sanitize(val)}</option>`);
            });
            // שיחזור הערך הנבחר לאחר עדכון האפשרויות.
            select.value = state.filters[key];
        });
    }

    /**
     * מסנן את הנתונים בהתאם לפילטרים הנוכחיים באובייקט 'state.filters'.
     */
    function filterData() {
        const { location, org, rank, search } = state.filters;
        state.filteredData = state.originalData.filter(r => {
            const loc = (r.location || '').toLowerCase();
            const o = (r.organization || '').toLowerCase();
            const rk = (r.rank_role || '').toLowerCase();
            // יצירת מחרוזת חיפוש כוללת ממספר שדות רלוונטיים.
            const searchString = [r.name_english, r.name_arabic, r.description_online, loc, o, rk, r.notes].join(' ').toLowerCase();

            // בדיקת התאמה לכל הפילטרים.
            return (!location || loc.includes(location)) &&
                (!org || o.includes(org)) &&
                (!rank || rk.includes(rank)) &&
                (!search || searchString.includes(search));
        });
        state.currentPage = 0; // איפוס עמוד נוכחי לאחר סינון.
    }

    // פונקציית סינון עם Debounce עבור תיבת החיפוש.
    const debouncedFilter = debounce(() => {
        state.filters.search = dom.searchBox.value.toLowerCase();
        filterData();
        applySortAndRender();
    });

    // === מיון נתונים ===

    /**
     * ממיין את הנתונים המסוננים בהתאם להגדרות המיון ב-'state.sort'.
     */
    function sortData() {
        const { column, direction } = state.sort;
        if (column === null) return; // אין עמודה למיון.

        const key = dataFieldKeys[column]; // מציאת מפתח השדה למיון.
        state.filteredData.sort((a, b) => {
            const valA = a[key] || '';
            const valB = b[key] || '';

            // טיפול מיוחד למיון תאריכים אם יש פורמט אחיד
            // (נניח "DD-MMM-YYYY" כמו בדוגמה)
            if (key === 'date') {
                const dateA = new Date(valA.replace(/-/g, ' '));
                const dateB = new Date(valB.replace(/-/g, ' '));
                if (dateA > dateB) return direction === 'asc' ? 1 : -1;
                if (dateA < dateB) return direction === 'asc' ? -1 : 1;
                return 0;
            }

            // מיון רגיל באמצעות collator.
            const cmp = collator.compare(valA, valB);
            return direction === 'asc' ? cmp : -cmp;
        });
    }

    /**
     * משנה את הגדרות המיון (עמודה וכיוון) ומפעילה מיון ורינדור מחדש.
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

    /**
     * פונקציה כללית המפעילה את כל שלבי העדכון לאחר שינוי (סינון, מיון, שפה).
     */
    function applySortAndRender() {
        sortData();
        renderData();
        updatePagination();
        updateStats();
        updateTextByLang();
        updateResultsCounter();
    }

    // === רינדור נתונים ל-UI ===

    /**
     * מוחק את תוכן ה-contentArea ומרנדר את הנתונים הנוכחיים (כרטיסים או טבלה).
     */
    function renderData() {
        if (!dom.contentArea) return;
        dom.contentArea.innerHTML = ''; // ניקוי אזור התוכן.
        const data = state.filteredData;

        if (!data.length) {
            // הצגת הודעת "אין תוצאות" אם הנתונים ריקים.
            dom.contentArea.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>${labels.no_matching_data[state.lang]}</h3>
                    <p>${state.lang === 'he' ? 'נסה לשנות את קריטריוני החיפוש' : 'Try changing your search criteria'}</p>
                </div>
            `;
            return;
        }

        const term = state.filters.search;

        if (state.isCardView) {
            renderCardView(data, term);
        } else {
            renderTableView(data, term);
        }
    }

    /**
     * מרנדר את הנתונים בתצוגת כרטיסים.
     * @param {Array<Object>} data - הנתונים לרינדור.
     * @param {string} term - מונח החיפוש להדגשה.
     */
    function renderCardView(data, term) {
        const grid = document.createElement('div');
        grid.className = 'card-grid';

        // הגבלת הנתונים המוצגים לפי פגינציה.
        const start = state.currentPage * state.VISIBLE_ROWS;
        const chunk = data.slice(start, start + state.VISIBLE_ROWS);

        chunk.forEach(record => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <h2>${highlight(record.name_english || '', term)} | ${highlight(record.name_arabic || '', term)}</h2>
                <div class="sub">${highlight(record.description_online || '', term)}</div>
                <div class="meta">
                    ${record.location && record.location !== '-' ? `<span>📍 ${highlight(record.location, term)}</span>` : ''}
                    ${record.date && record.date !== '-' ? `<span>📅 ${highlight(record.date, term)}</span>` : ''}
                </div>
            `;

            const details = document.createElement('div');
            details.className = 'card-details';
            // לולאה על שדות ספציפיים ליצירת פרטי כרטיס.
            ['rank_role', 'organization', 'family_casualties_info', 'casualties_count', 'notes'].forEach(key => {
                const val = record[key];
                if (val && val !== '-') {
                    const p = document.createElement('p');
                    p.innerHTML = `<strong>${labels[key][state.lang]}:</strong> ${highlight(val, term)}`;
                    details.appendChild(p);
                }
            });

            card.appendChild(details);
            grid.appendChild(card);
        });

        dom.contentArea.appendChild(grid);
    }

    /**
     * מרנדר את הנתונים בתצוגת טבלה.
     * @param {Array<Object>} data - הנתונים לרינדור.
     * @param {string} term - מונח החיפוש להדגשה.
     */
    function renderTableView(data, term) {
        const tableWrapper = document.createElement('div');
        tableWrapper.className = 'table-container';

        const table = document.createElement('table');
        table.className = 'table-responsive';

        // כותרות עמודות
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');

        dataFieldKeys.forEach((key, index) => {
            const th = document.createElement('th');
            th.dataset.col = index; // שמירת אינדקס העמודה למיון.
            th.style.cursor = 'pointer';
            th.innerHTML = `${labels[key][state.lang]} <span class="sort-icon">↕</span>`;

            // עדכון אינדיקטור מיון (חץ למעלה/למטה).
            if (state.sort.column === index) {
                const icon = th.querySelector('.sort-icon');
                if (icon) {
                    icon.textContent = state.sort.direction === 'asc' ? '↑' : '↓';
                    icon.style.color = '#3b82f6'; // צבע הדגשה.
                }
            }

            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        // גוף טבלה
        const tbody = document.createElement('tbody');
        const start = state.currentPage * state.VISIBLE_ROWS;
        const chunk = data.slice(start, start + state.VISIBLE_ROWS); // הגבלת שורות לפי פגינציה.

        chunk.forEach(record => {
            const tr = document.createElement('tr');
            dataFieldKeys.forEach(key => {
                const td = document.createElement('td');
                // הדגשת מונחי חיפוש בתא.
                td.innerHTML = highlight(String(record[key] || ''), term);
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });

        table.appendChild(tbody);

        // מאזיני אירועים לכותרות העמודות לצורך מיון.
        thead.querySelectorAll('th[data-col]').forEach(th => {
            th.addEventListener('click', () => sortAndRender(parseInt(th.dataset.col)));
        });

        tableWrapper.appendChild(table);
        dom.contentArea.appendChild(tableWrapper);
    }

    // === פגינציה (חלוקה לעמודים) ===

    /**
     * מעדכן את מצב כפתורי הפגינציה ואת תצוגת מספר העמוד.
     */
    function updatePagination() {
        if (!dom.pageInfo || !dom.prevPageBtn || !dom.nextPageBtn) return;

        const totalPages = Math.ceil(state.filteredData.length / state.VISIBLE_ROWS) || 1;
        dom.pageInfo.textContent = labels.page_info[state.lang]
            .replace('{current}', state.currentPage + 1)
            .replace('{total}', totalPages);
        dom.prevPageBtn.disabled = state.currentPage === 0; // השבת כפתור "קודם" בעמוד הראשון.
        dom.nextPageBtn.disabled = state.currentPage >= totalPages - 1; // השבת כפתור "הבא" בעמוד האחרון.
    }

    /**
     * משנה את העמוד הנוכחי ומפעילה רינדור מחדש.
     * @param {number} delta - השינוי במספר העמודים (1 עבור הבא, -1 עבור הקודם).
     */
    function changePage(delta) {
        const totalPages = Math.ceil(state.filteredData.length / state.VISIBLE_ROWS) || 1;
        state.currentPage = Math.max(0, Math.min(totalPages - 1, state.currentPage + delta));
        renderData(); // רינדור הנתונים עבור העמוד החדש.
        updatePagination(); // עדכון מצב הפגינציה.
        // אין צורך ב applySortAndRender, רק ב renderData ו- updatePagination.
    }

    // === סטטיסטיקות ===

    /**
     * מחשב ומעדכן את הסטטיסטיקות המוצגות ב-UI (סה"כ לוחמים, קורבנות וכו').
     */
    function updateStats() {
        let totalCombatants = 0, totalCasualties = 0, familyCasualties = 0, highRanking = 0;

        state.filteredData.forEach(r => {
            totalCombatants += 1;
            const casualties = parseInt(r.casualties_count) || 0;
            totalCasualties += casualties;
            // בדיקה אם קיימים פרטי בני משפחה.
            if (r.family_casualties_info && r.family_casualties_info !== '-') {
                familyCasualties += casualties;
            }
            // בדיקה אם הדרגה/תפקיד מכיל 'leader' (לא רגיש לרישיות).
            if ((r.rank_role || '').toLowerCase().includes('leader')) {
                highRanking += 1;
            }
        });

        // עדכון אלמנטי ה-DOM עם הסטטיסטיקות.
        if (dom.totalCombatants) dom.totalCombatants.textContent = totalCombatants;
        if (dom.totalCasualties) dom.totalCasualties.textContent = totalCasualties;
        if (dom.familyCasualties) dom.familyCasualties.textContent = familyCasualties;
        if (dom.highRanking) dom.highRanking.textContent = highRanking;
    }

    // === עדכון טקסט לפי שפה ===

    /**
     * מעדכן את כל הטקסטים ב-UI שמשתנים לפי השפה.
     */
    function updateTextByLang() {
        // עדכון כפתור שינוי השפה.
        if (dom.langBtn) dom.langBtn.textContent = state.lang === 'he' ? 'English' : 'עברית';

        // עדכון כותרות האתר.
        const siteTitle = document.getElementById('siteTitle');
        const siteSub = document.getElementById('siteSub');
        if (siteTitle) siteTitle.textContent = labels.site_title[state.lang];
        if (siteSub) siteSub.textContent = labels.site_sub[state.lang];

        // עדכון טקסט placeholder בתיבת החיפוש.
        if (dom.searchBox) dom.searchBox.placeholder = labels.search_placeholder[state.lang];

        // עדכון כפתור החלפת תצוגה (טבלה/כרטיסים).
        if (dom.viewToggleBtn) {
            dom.viewToggleBtn.innerHTML = state.isCardView
                ? `<i class="fas fa-table"></i> ${labels.toggle_view_table[state.lang]}`
                : `<i class="fas fa-th-list"></i> ${labels.toggle_view_card[state.lang]}`;
        }

        // עדכון טקסט כפתורי איפוס וייצוא.
        if (dom.resetBtn) dom.resetBtn.innerHTML = `<i class="fas fa-refresh"></i> ${labels.reset_filters[state.lang]}`;
        if (dom.exportBtn) dom.exportBtn.innerHTML = `<i class="fas fa-download"></i> ${labels.export_csv[state.lang]}`;

        // עדכון הכפתור של פילטרים במובייל.
        updateMobileFiltersButton();

        // עדכון נראות סקשן טקסט הסבר בהתאם לשפה.
        const hebrewSection = document.getElementById('dataCollectionHebrew');
        const englishSection = document.getElementById('dataCollectionEnglish');
        if (hebrewSection && englishSection) {
            hebrewSection.classList.toggle('hidden', state.lang !== 'he');
            englishSection.classList.toggle('hidden', state.lang === 'he');
        }

        // עדכון אפשרויות הפילטרים הקיימים (כדי לשקף את ה"הכל" בשפה הנכונה)
        populateFilters();
    }

    /**
     * מעדכן את מונה התוצאות המוצג.
     */
    function updateResultsCounter() {
        if (!dom.resultsCounter) return;
        const count = state.filteredData.length;
        if (count === 0) {
            dom.resultsCounter.classList.add('hidden'); // הסתר אם אין תוצאות.
        } else {
            dom.resultsCounter.classList.remove('hidden');
            // בחירת הודעה מתאימה (יחיד/רבים).
            const message = count === 1
                ? labels.result_found[state.lang]
                : labels.results_found[state.lang].replace('{count}', count);
            dom.resultsCounter.textContent = message;
        }
    }

    // === פעולות עיקריות ===

    /**
     * מייצא את הנתונים המסוננים הנוכחיים לקובץ CSV.
     */
    function exportToCSV() {
        if (!state.filteredData.length) {
            showToast(labels.export_no_data[state.lang], 'error');
            return;
        }

        // יצירת כותרות ה-CSV עם תרגום.
        const headers = dataFieldKeys.map(k => `"${labels[k][state.lang]}"`).join(',') + '\n';
        let csv = headers;

        // יצירת שורות הנתונים, תוך טיפול במרכאות כפולות בתוך שדות.
        state.filteredData.forEach(r => {
            csv += dataFieldKeys.map(k => `"${String(r[k] || '').replace(/"/g, '""')}"`).join(',') + '\n';
        });

        // יצירת Blob ולינק להורדה.
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }); // הוספת BOM לעברית.
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'combatants_data.csv';
        document.body.appendChild(link);
        link.click(); // הפעלת ההורדה.
        document.body.removeChild(link); // ניקוי האלמנט מה-DOM.

        showToast(labels.export_success[state.lang]);
    }

    /**
     * מאפס את כל הפילטרים ומצב המיון, ומפעיל רינדור מחדש.
     */
    function resetFilters() {
        // איפוס ערכים בתיבות הבחירה ובתיבת החיפוש.
        if (dom.locationFilter) dom.locationFilter.value = '';
        if (dom.orgFilter) dom.orgFilter.value = '';
        if (dom.rankFilter) dom.rankFilter.value = '';
        if (dom.searchBox) dom.searchBox.value = '';

        // איפוס מצב הפילטרים והמיון ב-state.
        state.filters = { location: '', org: '', rank: '', search: '' };
        state.sort = { column: null, direction: 'asc' };

        filterData(); // סינון מחדש (כעת ללא פילטרים).
        applySortAndRender(); // מיון ורינדור.
        showToast(labels.filter_reset_success[state.lang]);
    }

    // === לוגיקה של פילטרים במובייל ===

    /**
     * מאתחל את לוגיקת ההפעלה/כיבוי של סרגל הפילטרים במובייל.
     */
    function initializeMobileFilters() {
        console.log('initializeMobileFilters', dom.mobileFiltersToggle, dom.filtersBar);
        if (!dom.mobileFiltersToggle || !dom.filtersBar) return;

        // Listener ללחיצה על כפתור הפילטרים במובייל.
        dom.mobileFiltersToggle.addEventListener('click', function () {
            const isActive = dom.filtersBar.classList.contains('active');
            const newState = !isActive;

            dom.filtersBar.classList.toggle('active', newState); // הוספה/הסרה של קלאס 'active'.
            dom.mobileFiltersToggle.setAttribute('aria-expanded', newState.toString()); // עדכון ARIA.

            // עדכון טקסט וצבע הכפתור בהתאם למצב.
            const icon = dom.mobileFiltersToggle.querySelector('i');
            const span = dom.mobileFiltersToggle.querySelector('span');

            if (newState) {
                if (icon) icon.className = 'fas fa-times'; // אייקון X.
                if (span) span.textContent = labels.close_filters[state.lang];
                dom.mobileFiltersToggle.style.background = '#dc2626'; // אדום לסגירה.
            } else {
                if (icon) icon.className = 'fas fa-filter'; // אייקון פילטר.
                if (span) span.textContent = labels.open_filters[state.lang];
                dom.mobileFiltersToggle.style.background = '#3b82f6'; // כחול לפתיחה.
            }
        });

        // סגירה אוטומטית של סרגל הפילטרים במובייל כאשר עוברים למסך רחב.
        const mediaQuery = window.matchMedia('(min-width: 769px)');
        const handleResize = (e) => {
            if (e.matches && dom.filtersBar.classList.contains('active')) {
                dom.filtersBar.classList.remove('active');
                dom.mobileFiltersToggle.setAttribute('aria-expanded', 'false');
                updateMobileFiltersButton(); // עדכון מצב הכפתור.
            }
        };

        // הוספת מאזין לאירועי שינוי גודל מסך.
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleResize);
        } else {
            mediaQuery.addListener(handleResize); // תמיכה בדפדפנים ישנים.
        }
    }

    /**
     * מעדכן את הטקסט והאייקון של כפתור הפילטרים במובייל למצב סגור.
     * נדרש לאחר שינוי שפה או שינוי גודל מסך.
     */
    function updateMobileFiltersButton() {
        if (!dom.mobileFiltersToggle) return;

        const icon = dom.mobileFiltersToggle.querySelector('i');
        const span = dom.mobileFiltersToggle.querySelector('span');

        // תמיד יציג את מצב הפתיחה כאשר הפילטרים סגורים.
        if (icon) icon.className = 'fas fa-filter';
        if (span) span.textContent = labels.open_filters[state.lang];
        dom.mobileFiltersToggle.style.background = '#3b82f6';
        dom.mobileFiltersToggle.setAttribute('aria-expanded', 'false');
        // ודא שסרגל הפילטרים סגור כאשר הכפתור במצב "פתח".
        if (dom.filtersBar) dom.filtersBar.classList.remove('active');
    }

    // === פונקציית אתחול ראשית ===

    /**
     * פונקציית האתחול של האפליקציה.
     * מוגדרת פעם אחת ומפעילה את כל הלוגיקה הראשונית.
     */
    function initialize() {
        console.log('Initializing app...');

        // הגדרת שפה וכיווניות מסמך ראשוניים.
        document.documentElement.lang = state.lang;
        document.documentElement.dir = state.lang === 'he' ? 'rtl' : 'ltr';
        // אתחול Collator עבור השפה הנוכחית.
        collator = new Intl.Collator(state.lang, { numeric: true, sensitivity: 'base' });

        // עדכון טקסטים ראשוני לפי השפה.
        updateTextByLang();
        // טעינת הנתונים (אסינכרונית).
        loadData();
        // אתחול לוגיקת פילטרים למובייל.
        initializeMobileFilters();

        // === הגדרת מאזיני אירועים (Event Listeners) ===
        // שימוש בפונקציה ייעודית לניהול ה-Event Listeners משפר קריאות.
        setupEventListeners();

        console.log('App initialized');
    }

    /**
     * מרכז את כל הגדרות ה-Event Listeners במקום אחד.
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

        // מאזינים לכפתורי פגינציה.
        if (dom.prevPageBtn) dom.prevPageBtn.addEventListener('click', () => changePage(-1));
        if (dom.nextPageBtn) dom.nextPageBtn.addEventListener('click', () => changePage(1));

        // מאזין לכפתור החלפת תצוגה.
        if (dom.viewToggleBtn) {
            dom.viewToggleBtn.addEventListener('click', () => {
                state.isCardView = !state.isCardView;
                applySortAndRender();
            });
        }

        // מאזינים לכפתורי איפוס וייצוא.
        if (dom.resetBtn) dom.resetBtn.addEventListener('click', resetFilters);
        if (dom.exportBtn) dom.exportBtn.addEventListener('click', exportToCSV);
    }


    // === הפעלת האפליקציה ===
    // ודא שה-DOM נטען במלואו לפני אתחול האפליקציה.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})(); // IIFE (Immediately Invoked Function Expression) לשמירה על סקופ פרטי.
