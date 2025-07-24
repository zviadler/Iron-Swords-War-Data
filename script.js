// script.js - JavaScript משופר עם תמיכה במספר עמודים וקבצי CSV שונים

(function () {
    'use strict';

    // === קונפיגורציה של עמודים ===
    // כאן תוכל להוסיף עמודים נוספים בקלות
    const PAGE_CONFIG = {
        main: {
            csvFile: 'data.csv',
            name: { he: 'מאגר ראשי', en: 'Main Database' },
            icon: 'fas fa-database'
        },
        secondary: {
            csvFile: 'data2.csv',
            name: { he: 'מאגר משני', en: 'Secondary Database' },
            icon: 'fas fa-chart-line'
        },
        archive: {
            csvFile: 'archive.csv',
            name: { he: 'ארכיון', en: 'Archive' },
            icon: 'fas fa-archive'
        },
        // ניתן להוסיף עמודים נוספים כאן:
        // reports: {
        //     csvFile: 'reports.csv',
        //     name: { he: 'דוחות', en: 'Reports' },
        //     icon: 'fas fa-file-alt'
        // }
    };

    // === מצב מרכזי של האפליקציה ===
    const state = {
        originalData: [],
        filteredData: [],
        currentPage: 0,
        VISIBLE_ROWS: 50,
        sort: { column: null, direction: 'asc' },
        filters: { location: '', org: '', rank: '', search: '' },
        lang: (navigator.language || navigator.userLanguage).startsWith('he') ? 'he' : 'en',
        isCardView: window.innerWidth <= 768,
        currentPageKey: 'main', // מפתח העמוד הנוכחי
        get currentPageConfig() {
            return PAGE_CONFIG[this.currentPageKey];
        }
    };

    // === אלמנטי DOM ===
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
        filtersBar: document.getElementById('filtersBar'),
        currentPageName: document.getElementById('currentPageName')
    };

    // מפת שדות נתונים
    const dataFieldKeys = [
        'post_id', 'combatant_id', 'date', 'location', 'location_details',
        'name_english', 'name_arabic', 'nickname', 'description_online',
        'rank_role', 'organization', 'activity', 'family_casualties_info',
        'casualties_count', 'additional_combatants', 'notes'
    ];

    // תרגומים
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

    // נתונים משובצים (לדוגמה)
    const embeddedData = [
        {
            "post_id": "1", "combatant_id": "1", "date": "25-APR-2025", "location": "Unknown", "location_details": "-",
            "name_english": "Muhammad Baraka Ayish Al-Amur", "name_arabic": "محمد بركة عايش العامور", "nickname": "-",
            "description_online": "-", "rank_role": "Member of Military Council", "organization": "Al-Mujahideen Battalions",
            "activity": "-", "family_casualties_info": "wife, 2 sons, 5 daughters", "casualties_count": "9",
            "additional_combatants": "-", "notes": "-"
        }
    ];

    let collator = new Intl.Collator(state.lang, { numeric: true, sensitivity: 'base' });

    // === פונקציות עזר כלליות ===
    function sanitize(input) {
        if (input === null || input === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(input);
        return div.innerHTML;
    }

    function highlight(text, term) {
        if (!term || !text) return sanitize(text);
        const safeText = sanitize(text);
        const safeTerm = sanitize(term).replace(/[.*+?^${}()|[\]\\]/g, '\\        rank_role');
        return safeText.replace(new RegExp(`(${safeTerm})`, 'gi'), '<mark>$1</mark>');
    }

    function debounce(fn, ms = 300) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), ms);
        };
    }

    function normalizeHeader(header) {
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
        return map[header.trim().toLowerCase()] || header.trim().toLowerCase().replace(/ /g, '_').replace(/[^a-z0-9_]/g, '');
    }

    // === מצב טעינה והתראות ===
    function showLoading(message) {
        if (dom.loadingOverlay) {
            const text = dom.loadingOverlay.querySelector('.loading-text');
            if (text) text.textContent = message;
            dom.loadingOverlay.classList.remove('hidden');
        }
    }

    function hideLoading() {
        if (dom.loadingOverlay) {
            dom.loadingOverlay.classList.add('hidden');
        }
    }

    function showToast(message, type = 'success', duration = 3000) {
        if (!dom.toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        dom.toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), duration);
    }

    // === טעינת נתונים ===
    async function loadCSVData(url) {
        console.log('Loading from:', url);

        if (window.location.protocol === 'file:') {
            console.log('Using embedded data');
            return embeddedData;
        }

        return new Promise((resolve, reject) => {
            Papa.parse(url, {
                download: true,
                header: true,
                skipEmptyLines: true,
                transformHeader: normalizeHeader,
                complete: (results) => {
                    if (results.errors.length) {
                        console.error('PapaParse errors:', results.errors);
                    }
                    if (!results.data || results.data.length === 0) {
                        return reject(new Error('Empty or invalid CSV data after parsing.'));
                    }
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

    // === פונקציה לטעינת נתונים לפי עמוד ===
    async function loadDataFromPage(pageKey) {
        const pageConfig = PAGE_CONFIG[pageKey];
        if (!pageConfig) {
            console.error(`Page configuration not found for: ${pageKey}`);
            return;
        }

        showLoading(labels.loading_data[state.lang]);
        try {
            state.originalData = await loadCSVData(pageConfig.csvFile);
            state.currentPageKey = pageKey;
            console.log(`Loaded ${state.originalData.length} records from ${pageConfig.csvFile}`);
            
            // עדכון שם העמוד בממשק
            if (dom.currentPageName) {
                dom.currentPageName.textContent = pageConfig.name[state.lang];
            }
            
        } catch (error) {
            console.error(`Failed to load CSV ${pageConfig.csvFile}, using embedded data:`, error);
            state.originalData = embeddedData;
            showToast(labels.error_loading_data[state.lang] + error.message, 'error');
            showToast(state.lang === 'he' ? 'משתמש בנתונים לדוגמה.' : 'Using sample data.', 'info');
        } finally {
            state.filteredData = [...state.originalData];
            populateFilters();
            applySortAndRender();
            hideLoading();
        }
    }

    // === יצירת ניווט דינמי ===
    function createNavigation() {
        const nav = document.querySelector('.page-navigation');
        if (!nav) return;

        const navContainer = nav.querySelector('.nav-container');
        if (!navContainer) return;

        // ניקוי התוכן הקיים
        navContainer.innerHTML = '';

        // יצירת כפתורי ניווט דינמיים
        Object.entries(PAGE_CONFIG).forEach(([pageKey, config]) => {
            const button = document.createElement('button');
            button.className = 'nav-item';
            button.dataset.page = pageKey;
            
            if (pageKey === state.currentPageKey) {
                button.classList.add('active');
            }
            
            button.innerHTML = `
                <i class="${config.icon}" aria-hidden="true"></i>
                <span>${config.name[state.lang]}</span>
            `;
            
            button.addEventListener('click', async () => {
                // הסרת פעיל מכל הכפתורים
                document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
                // הוספת פעיל לכפתור הנוכחי
                button.classList.add('active');
                
                // איפוס פילטרים
                resetFiltersState();
                
                // טעינת הנתונים החדשים
                await loadDataFromPage(pageKey);
            });
            
            navContainer.appendChild(button);
        });
    }

    // === פילטרים ===
    function populateFilters() {
        const sets = { location: new Set(), org: new Set(), rank: new Set() };
        state.originalData.forEach(r => {
            if (r.location && r.location !== '-') sets.location.add(r.location);
            if (r.organization && r.organization !== '-') sets.org.add(r.organization);
            if (r.rank_role && r.rank_role !== '-') sets.rank.add(r.rank_role);
        });

        [
            ['locationFilter', 'location'],
            ['orgFilter', 'org'],
            ['rankFilter', 'rank']
        ].forEach(([id, key]) => {
            const select = dom[id];
            if (!select) return;
            const allText = labels.all[state.lang];
            select.innerHTML = `<option value="">${allText}</option>`;
            Array.from(sets[key]).sort((a, b) => collator.compare(a, b)).forEach(val => {
                select.insertAdjacentHTML('beforeend', `<option value="${sanitize(val)}">${sanitize(val)}</option>`);
            });
            select.value = state.filters[key];
        });
    }

    function filterData() {
        const { location, org, rank, search } = state.filters;
        state.filteredData = state.originalData.filter(r => {
            const loc = (r.location || '').toLowerCase();
            const o = (r.organization || '').toLowerCase();
            const rk = (r.rank_role || '').toLowerCase();
            const searchString = [r.name_english, r.name_arabic, r.description_online, loc, o, rk, r.notes].join(' ').toLowerCase();

            return (!location || loc.includes(location)) &&
                (!org || o.includes(org)) &&
                (!rank || rk.includes(rank)) &&
                (!search || searchString.includes(search));
        });
        state.currentPage = 0;
    }

    const debouncedFilter = debounce(() => {
        state.filters.search = dom.searchBox.value.toLowerCase();
        filterData();
        applySortAndRender();
    });

    // === מיון נתונים ===
    function sortData() {
        const { column, direction } = state.sort;
        if (column === null) return;

        const key = dataFieldKeys[column];
        state.filteredData.sort((a, b) => {
            const valA = a[key] || '';
            const valB = b[key] || '';

            if (key === 'date') {
                const dateA = new Date(valA.replace(/-/g, ' '));
                const dateB = new Date(valB.replace(/-/g, ' '));
                if (dateA > dateB) return direction === 'asc' ? 1 : -1;
                if (dateA < dateB) return direction === 'asc' ? -1 : 1;
                return 0;
            }

            const cmp = collator.compare(valA, valB);
            return direction === 'asc' ? cmp : -cmp;
        });
    }

    function sortAndRender(colIndex) {
        if (state.sort.column === colIndex) {
            state.sort.direction = state.sort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            state.sort.column = colIndex;
            state.sort.direction = 'asc';
        }
        applySortAndRender();
    }

    function applySortAndRender() {
        sortData();
        renderData();
        updatePagination();
        updateStats();
        updateTextByLang();
        updateResultsCounter();
    }

    // === רינדור נתונים ל-UI ===
    function renderData() {
        if (!dom.contentArea) return;
        dom.contentArea.innerHTML = '';
        const data = state.filteredData;

        if (!data.length) {
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

    function renderCardView(data, term) {
        const grid = document.createElement('div');
        grid.className = 'card-grid';

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

    function renderTableView(data, term) {
        const tableWrapper = document.createElement('div');
        tableWrapper.className = 'table-container';

        const table = document.createElement('table');
        table.className = 'table-responsive';

        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');

        dataFieldKeys.forEach((key, index) => {
            const th = document.createElement('th');
            th.dataset.col = index;
            th.style.cursor = 'pointer';
            th.innerHTML = `${labels[key][state.lang]} <span class="sort-icon">↕</span>`;

            if (state.sort.column === index) {
                const icon = th.querySelector('.sort-icon');
                if (icon) {
                    icon.textContent = state.sort.direction === 'asc' ? '↑' : '↓';
                    icon.style.color = '#3b82f6';
                }
            }

            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        const start = state.currentPage * state.VISIBLE_ROWS;
        const chunk = data.slice(start, start + state.VISIBLE_ROWS);

        chunk.forEach(record => {
            const tr = document.createElement('tr');
            dataFieldKeys.forEach(key => {
                const td = document.createElement('td');
                td.innerHTML = highlight(String(record[key] || ''), term);
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });

        table.appendChild(tbody);

        thead.querySelectorAll('th[data-col]').forEach(th => {
            th.addEventListener('click', () => sortAndRender(parseInt(th.dataset.col)));
        });

        tableWrapper.appendChild(table);
        dom.contentArea.appendChild(tableWrapper);
    }

    // === פגינציה ===
    function updatePagination() {
        if (!dom.pageInfo || !dom.prevPageBtn || !dom.nextPageBtn) return;

        const totalPages = Math.ceil(state.filteredData.length / state.VISIBLE_ROWS) || 1;
        dom.pageInfo.textContent = labels.page_info[state.lang]
            .replace('{current}', state.currentPage + 1)
            .replace('{total}', totalPages);
        dom.prevPageBtn.disabled = state.currentPage === 0;
        dom.nextPageBtn.disabled = state.currentPage >= totalPages - 1;
    }

    function changePage(delta) {
        const totalPages = Math.ceil(state.filteredData.length / state.VISIBLE_ROWS) || 1;
        state.currentPage = Math.max(0, Math.min(totalPages - 1, state.currentPage + delta));
        renderData();
        updatePagination();
    }

    // === סטטיסטיקות ===
    function updateStats() {
        let totalCombatants = 0, totalCasualties = 0, familyCasualties = 0, highRanking = 0;

        state.filteredData.forEach(r => {
            totalCombatants += 1;
            const casualties = parseInt(r.casualties_count) || 0;
            totalCasualties += casualties;
            if (r.family_casualties_info && r.family_casualties_info !== '-') {
                familyCasualties += casualties;
            }
            if ((r.rank_role || '').toLowerCase().includes('leader')) {
                highRanking += 1;
            }
        });

        if (dom.totalCombatants) dom.totalCombatants.textContent = totalCombatants;
        if (dom.totalCasualties) dom.totalCasualties.textContent = totalCasualties;
        if (dom.familyCasualties) dom.familyCasualties.textContent = familyCasualties;
        if (dom.highRanking) dom.highRanking.textContent = highRanking;
    }

    // === עדכון טקסט לפי שפה ===
    function updateTextByLang() {
        if (dom.langBtn) dom.langBtn.textContent = state.lang === 'he' ? 'English' : 'עברית';

        const siteTitle = document.getElementById('siteTitle');
        const siteSub = document.getElementById('siteSub');
        if (siteTitle) siteTitle.textContent = labels.site_title[state.lang];
        if (siteSub) siteSub.textContent = labels.site_sub[state.lang];

        if (dom.searchBox) dom.searchBox.placeholder = labels.search_placeholder[state.lang];

        if (dom.viewToggleBtn) {
            dom.viewToggleBtn.innerHTML = state.isCardView
                ? `<i class="fas fa-table"></i> ${labels.toggle_view_table[state.lang]}`
                : `<i class="fas fa-th-list"></i> ${labels.toggle_view_card[state.lang]}`;
        }

        if (dom.resetBtn) dom.resetBtn.innerHTML = `<i class="fas fa-refresh"></i> ${labels.reset_filters[state.lang]}`;
        if (dom.exportBtn) dom.exportBtn.innerHTML = `<i class="fas fa-download"></i> ${labels.export_csv[state.lang]}`;

        updateMobileFiltersButton();

        const hebrewSection = document.getElementById('dataCollectionHebrew');
        const englishSection = document.getElementById('dataCollectionEnglish');
        if (hebrewSection && englishSection) {
            hebrewSection.classList.toggle('hidden', state.lang !== 'he');
            englishSection.classList.toggle('hidden', state.lang === 'he');
        }

        // עדכון שמות העמודים בניווט
        updateNavigationLabels();
        
        populateFilters();
    }

    function updateNavigationLabels() {
        document.querySelectorAll('.nav-item').forEach(button => {
            const pageKey = button.dataset.page;
            const config = PAGE_CONFIG[pageKey];
            if (config) {
                const span = button.querySelector('span');
                if (span) {
                    span.textContent = config.name[state.lang];
                }
            }
        });

        // עדכון שם העמוד הנוכחי
        if (dom.currentPageName && state.currentPageConfig) {
            dom.currentPageName.textContent = state.currentPageConfig.name[state.lang];
        }
    }

    function updateResultsCounter() {
        if (!dom.resultsCounter) return;
        const count = state.filteredData.length;
        if (count === 0) {
            dom.resultsCounter.classList.add('hidden');
        } else {
            dom.resultsCounter.classList.remove('hidden');
            const message = count === 1
                ? labels.result_found[state.lang]
                : labels.results_found[state.lang].replace('{count}', count);
            dom.resultsCounter.textContent = message;
        }
    }

    // === פעולות עיקריות ===
    function exportToCSV() {
        if (!state.filteredData.length) {
            showToast(labels.export_no_data[state.lang], 'error');
            return;
        }

        const headers = dataFieldKeys.map(k => `"${labels[k][state.lang]}"`).join(',') + '\n';
        let csv = headers;

        state.filteredData.forEach(r => {
            csv += dataFieldKeys.map(k => `"${String(r[k] || '').replace(/"/g, '""')}"`).join(',') + '\n';
        });

        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${state.currentPageConfig.name[state.lang].replace(/\s+/g, '_')}_data.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast(labels.export_success[state.lang]);
    }

    // === איפוס פילטרים ===
    function resetFiltersState() {
        state.filters = { location: '', org: '', rank: '', search: '' };
        state.sort = { column: null, direction: 'asc' };
        state.currentPage = 0;

        if (dom.locationFilter) dom.locationFilter.value = '';
        if (dom.orgFilter) dom.orgFilter.value = '';
        if (dom.rankFilter) dom.rankFilter.value = '';
        if (dom.searchBox) dom.searchBox.value = '';
    }

    function resetFilters() {
        resetFiltersState();
        filterData();
        applySortAndRender();
        showToast(labels.filter_reset_success[state.lang]);
    }

    // === לוגיקה של פילטרים במובייל ===
    function initializeMobileFilters() {
        if (!dom.mobileFiltersToggle || !dom.filtersBar) return;

        dom.mobileFiltersToggle.addEventListener('click', function () {
            const isActive = dom.filtersBar.classList.contains('active');
            const newState = !isActive;

            dom.filtersBar.classList.toggle('active', newState);
            dom.mobileFiltersToggle.setAttribute('aria-expanded', newState.toString());

            const icon = dom.mobileFiltersToggle.querySelector('i');
            const span = dom.mobileFiltersToggle.querySelector('span');

            if (newState) {
                if (icon) icon.className = 'fas fa-times';
                if (span) span.textContent = labels.close_filters[state.lang];
                dom.mobileFiltersToggle.style.background = '#dc2626';
            } else {
                if (icon) icon.className = 'fas fa-filter';
                if (span) span.textContent = labels.open_filters[state.lang];
                dom.mobileFiltersToggle.style.background = '#3b82f6';
            }
        });

        const mediaQuery = window.matchMedia('(min-width: 769px)');
        const handleResize = (e) => {
            if (e.matches && dom.filtersBar.classList.contains('active')) {
                dom.filtersBar.classList.remove('active');
                dom.mobileFiltersToggle.setAttribute('aria-expanded', 'false');
                updateMobileFiltersButton();
            }
        };

        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleResize);
        } else {
            mediaQuery.addListener(handleResize);
        }
    }

    function updateMobileFiltersButton() {
        if (!dom.mobileFiltersToggle) return;

        const icon = dom.mobileFiltersToggle.querySelector('i');
        const span = dom.mobileFiltersToggle.querySelector('span');

        if (icon) icon.className = 'fas fa-filter';
        if (span) span.textContent = labels.open_filters[state.lang];
        dom.mobileFiltersToggle.style.background = '#3b82f6';
        dom.mobileFiltersToggle.setAttribute('aria-expanded', 'false');
        if (dom.filtersBar) dom.filtersBar.classList.remove('active');
    }

    // === פונקציית אתחול ראשית ===
    function initialize() {
        console.log('Initializing app...');

        document.documentElement.lang = state.lang;
        document.documentElement.dir = state.lang === 'he' ? 'rtl' : 'ltr';
        collator = new Intl.Collator(state.lang, { numeric: true, sensitivity: 'base' });

        updateTextByLang();
        createNavigation(); // יצירת ניווט דינמי
        loadDataFromPage(state.currentPageKey); // טעינת הנתונים הראשוניים
        initializeMobileFilters();

        setupEventListeners();

        console.log('App initialized');
    }

    function setupEventListeners() {
        if (dom.langBtn) {
            dom.langBtn.addEventListener('click', () => {
                state.lang = state.lang === 'he' ? 'en' : 'he';
                document.documentElement.lang = state.lang;
                document.documentElement.dir = state.lang === 'he' ? 'rtl' : 'ltr';
                collator = new Intl.Collator(state.lang, { numeric: true, sensitivity: 'base' });
                updateTextByLang();
                applySortAndRender();
            });
        }

        const selectFilters = [
            { element: dom.locationFilter, key: 'location' },
            { element: dom.orgFilter, key: 'org' },
            { element: dom.rankFilter, key: 'rank' }
        ];

        selectFilters.forEach(({ element, key }) => {
            if (element) {
                element.addEventListener('change', () => {
                    state.filters[key] = element.value.toLowerCase();
                    filterData();
                    applySortAndRender();
                });
            }
        });

        if (dom.searchBox) {
            dom.searchBox.addEventListener('input', debouncedFilter);
        }

        if (dom.prevPageBtn) dom.prevPageBtn.addEventListener('click', () => changePage(-1));
        if (dom.nextPageBtn) dom.nextPageBtn.addEventListener('click', () => changePage(1));

        if (dom.viewToggleBtn) {
            dom.viewToggleBtn.addEventListener('click', () => {
                state.isCardView = !state.isCardView;
                applySortAndRender();
            });
        }

        if (dom.resetBtn) dom.resetBtn.addEventListener('click', resetFilters);
        if (dom.exportBtn) dom.exportBtn.addEventListener('click', exportToCSV);
    }

    // === הפעלת האפליקציה ===
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    // === הוספת פונקציות לגלובל לשימוש חיצוני (אופציונלי) ===
    window.DatabaseApp = {
        addPage: function(pageKey, config) {
            PAGE_CONFIG[pageKey] = config;
            createNavigation(); // יצירת הניווט מחדש
        },
        switchToPage: function(pageKey) {
            if (PAGE_CONFIG[pageKey]) {
                loadDataFromPage(pageKey);
                // עדכון הכפתור הפעיל
                document.querySelectorAll('.nav-item').forEach(item => {
                    item.classList.toggle('active', item.dataset.page === pageKey);
                });
            }
        },
        getCurrentPageData: function() {
            return {
                pageKey: state.currentPageKey,
                config: state.currentPageConfig,
                data: state.filteredData,
                totalRecords: state.originalData.length,
                filteredRecords: state.filteredData.length
            };
        }
    };

})();
