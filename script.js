(function () {
    'use strict';

    // === קבועים ===
    const CONSTANTS = {
        VISIBLE_ROWS: 50,
        DEBOUNCE_DELAY: 300,
        TOAST_DURATION: 3000,
        DATE_FORMATS: {
            DD_MMM_YYYY: /^\d{2}-[A-Z]{3}-\d{4}$/i
        }
    };

    // === מצב מרכזי ===
    class AppState {
        constructor() {
            this.originalData = [];
            this.filteredData = [];
            this.currentPage = 0;
            this.sort = { column: null, direction: 'asc' };
            this.filters = { location: '', org: '', rank: '', search: '' };
            this.lang = this.detectLanguage();
            this.isCardView = window.innerWidth <= 768;
            
            // Observable pattern for state changes
            this.observers = new Set();
        }

        detectLanguage() {
            const savedLang = localStorage.getItem('app-language');
            return savedLang || ((navigator.language || navigator.userLanguage).startsWith('he') ? 'he' : 'en');
        }

        addObserver(callback) {
            this.observers.add(callback);
        }

        removeObserver(callback) {
            this.observers.delete(callback);
        }

        notifyObservers(change) {
            this.observers.forEach(callback => callback(change));
        }

        updateFilters(newFilters) {
            Object.assign(this.filters, newFilters);
            this.currentPage = 0;
            this.notifyObservers({ type: 'filters', data: this.filters });
        }

        updateSort(column, direction) {
            this.sort = { column, direction };
            this.notifyObservers({ type: 'sort', data: this.sort });
        }

        updateLanguage(lang) {
            this.lang = lang;
            localStorage.setItem('app-language', lang);
            this.notifyObservers({ type: 'language', data: lang });
        }

        setData(data) {
            this.originalData = data;
            this.filteredData = [...data];
            this.notifyObservers({ type: 'data', data });
        }
    }

    // === מנהל DOM ===
    class DOMManager {
        constructor() {
            this.elements = this.cacheElements();
        }

        cacheElements() {
            const selectors = {
                contentArea: '#contentArea',
                loadingOverlay: '#loadingOverlay',
                toastContainer: '#toastContainer',
                locationFilter: '#locationFilter',
                orgFilter: '#orgFilter',
                rankFilter: '#rankFilter',
                searchBox: '#searchBox',
                langBtn: '#langBtn',
                viewToggleBtn: '#viewToggleBtn',
                exportBtn: '#exportBtn',
                resetBtn: '#resetBtn',
                prevPageBtn: '#prevPageBtn',
                nextPageBtn: '#nextPageBtn',
                pageInfo: '#pageInfo',
                resultsCounter: '#resultsCounter',
                totalCombatants: '#totalCombatants',
                totalCasualties: '#totalCasualties',
                familyCasualties: '#familyCasualties',
                highRanking: '#highRanking',
                mobileFiltersToggle: '#mobileFiltersToggle',
                filtersBar: '#filtersBar'
            };

            const elements = {};
            for (const [key, selector] of Object.entries(selectors)) {
                elements[key] = document.querySelector(selector);
                if (!elements[key]) {
                    console.warn(`Element not found: ${selector}`);
                }
            }
            return elements;
        }

        get(elementName) {
            return this.elements[elementName];
        }

        updateElement(elementName, content, isHTML = false) {
            const element = this.get(elementName);
            if (element) {
                if (isHTML) {
                    element.innerHTML = content;
                } else {
                    element.textContent = content;
                }
            }
        }

        toggleClass(elementName, className, force) {
            const element = this.get(elementName);
            if (element) {
                element.classList.toggle(className, force);
            }
        }
    }

    // === מנהל תרגומים ===
    class TranslationManager {
        constructor() {
            this.labels = {
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
        }

        get(key, lang) {
            return this.labels[key]?.[lang] || key;
        }

        format(key, lang, params = {}) {
            let text = this.get(key, lang);
            for (const [param, value] of Object.entries(params)) {
                text = text.replace(`{${param}}`, value);
            }
            return text;
        }
    }

    // === מנהל נתונים ===
    class DataManager {
        constructor() {
            this.dataFieldKeys = [
                'post_id', 'combatant_id', 'date', 'location', 'location_details',
                'name_english', 'name_arabic', 'nickname', 'description_online',
                'rank_role', 'organization', 'activity', 'family_casualties_info',
                'casualties_count', 'additional_combatants', 'notes'
            ];

            this.embeddedData = [
                {
                    "post_id": "1", "combatant_id": "1", "date": "25-APR-2025", "location": "Unknown", "location_details": "-",
                    "name_english": "Muhammad Baraka Ayish Al-Amur", "name_arabic": "محمد بركة عايش العامور", "nickname": "-",
                    "description_online": "-", "rank_role": "Member of Military Council", "organization": "Al-Mujahideen Battalions",
                    "activity": "-", "family_casualties_info": "wife, 2 sons, 5 daughters", "casualties_count": "9",
                    "additional_combatants": "-", "notes": "-"
                },
                {
                    "post_id": "2", "combatant_id": "2", "date": "24-APR-2025", "location": "Al Zawaida (Central Camps)", "location_details": "tent",
                    "name_english": "Imad Al-Baba \"Abu Ashraf\"", "name_arabic": "عماد البابا \"אבו אשרף\"", "nickname": "אבו אשרף",
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
        }

        normalizeHeader(header) {
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
            return map[header.trim().toLowerCase()] || 
                   header.trim().toLowerCase().replace(/ /g, '_').replace(/[^a-z0-9_]/g, '');
        }

        async loadCSVData(url) {
            console.log('Loading from:', url);

            if (window.location.protocol === 'file:') {
                console.log('Using embedded data');
                return this.embeddedData;
            }

            return new Promise((resolve, reject) => {
                Papa.parse(url, {
                    download: true,
                    header: true,
                    skipEmptyLines: true,
                    worker: true,
                    transformHeader: this.normalizeHeader.bind(this),
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
                    error: reject
                });
            });
        }

        filterData(data, filters) {
            const { location, org, rank, search } = filters;
            return data.filter(r => {
                const loc = (r.location || '').toLowerCase();
                const o = (r.organization || '').toLowerCase();
                const rk = (r.rank_role || '').toLowerCase();
                const searchString = [
                    r.name_english, r.name_arabic, r.description_online, 
                    loc, o, rk, r.notes
                ].join(' ').toLowerCase();

                return (!location || loc.includes(location)) &&
                       (!org || o.includes(org)) &&
                       (!rank || rk.includes(rank)) &&
                       (!search || searchString.includes(search));
            });
        }

        sortData(data, sortConfig, collator) {
            const { column, direction } = sortConfig;
            if (column === null) return data;

            const key = this.dataFieldKeys[column];
            return [...data].sort((a, b) => {
                const valA = a[key] || '';
                const valB = b[key] || '';

                if (key === 'date') {
                    const dateA = this.parseDate(valA);
                    const dateB = this.parseDate(valB);
                    if (dateA && dateB) {
                        const result = dateA - dateB;
                        return direction === 'asc' ? result : -result;
                    }
                }

                const cmp = collator.compare(valA, valB);
                return direction === 'asc' ? cmp : -cmp;
            });
        }

        parseDate(dateString) {
            if (CONSTANTS.DATE_FORMATS.DD_MMM_YYYY.test(dateString)) {
                return new Date(dateString.replace(/-/g, ' '));
            }
            const parsed = new Date(dateString);
            return isNaN(parsed) ? null : parsed;
        }

        extractUniqueValues(data, field) {
            const values = new Set();
            data.forEach(record => {
                const value = record[field];
                if (value && value !== '-') {
                    values.add(value);
                }
            });
            return Array.from(values);
        }

        calculateStats(data) {
            return data.reduce((stats, record) => {
                stats.totalCombatants += 1;
                
                const casualties = parseInt(record.casualties_count) || 0;
                stats.totalCasualties += casualties;
                
                if (record.family_casualties_info && record.family_casualties_info !== '-') {
                    stats.familyCasualties += casualties;
                }
                
                if ((record.rank_role || '').toLowerCase().includes('leader')) {
                    stats.highRanking += 1;
                }
                
                return stats;
            }, {
                totalCombatants: 0,
                totalCasualties: 0,
                familyCasualties: 0,
                highRanking: 0
            });
        }
    }

    // === מנהל UI ===
    class UIManager {
        constructor(domManager, translationManager, dataManager) {
            this.dom = domManager;
            this.translations = translationManager;
            this.dataManager = dataManager;
        }

        showLoading(message) {
            const overlay = this.dom.get('loadingOverlay');
            if (overlay) {
                const text = overlay.querySelector('.loading-text');
                if (text) text.textContent = message;
                overlay.classList.remove('hidden');
            }
        }

        hideLoading() {
            this.dom.toggleClass('loadingOverlay', 'hidden', true);
        }

        showToast(message, type = 'success', duration = CONSTANTS.TOAST_DURATION) {
            const container = this.dom.get('toastContainer');
            if (!container) return;

            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.textContent = message;
            container.appendChild(toast);

            setTimeout(() => toast.remove(), duration);
        }

        sanitize(input) {
            if (input === null || input === undefined) return '';
            const div = document.createElement('div');
            div.textContent = String(input);
            return div.innerHTML;
        }

        highlight(text, term) {
            if (!term || !text) return this.sanitize(text);
            const safeText = this.sanitize(text);
            const safeTerm = this.sanitize(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            return safeText.replace(new RegExp(`(${safeTerm})`, 'gi'), '<mark>$1</mark>');
        }

        renderEmptyState(lang) {
            return `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>${this.translations.get('no_matching_data', lang)}</h3>
                    <p>${lang === 'he' ? 'נסה לשנות את קריטריוני החיפוש' : 'Try changing your search criteria'}</p>
                </div>
            `;
        }

        renderCardView(data, searchTerm, lang, currentPage, visibleRows) {
            const grid = document.createElement('div');
            grid.className = 'card-grid';

            const start = currentPage * visibleRows;
            const chunk = data.slice(start, start + visibleRows);

            chunk.forEach(record => {
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
                    <h2>${this.highlight(record.name_english || '', searchTerm)} | ${this.highlight(record.name_arabic || '', searchTerm)}</h2>
                    <div class="sub">${this.highlight(record.description_online || '', searchTerm)}</div>
                    <div class="meta">
                        ${record.location && record.location !== '-' ? `<span>📍 ${this.highlight(record.location, searchTerm)}</span>` : ''}
                        ${record.date && record.date !== '-' ? `<span>📅 ${this.highlight(record.date, searchTerm)}</span>` : ''}
                    </div>
                `;

                const details = document.createElement('div');
                details.className = 'card-details';
                
                ['rank_role', 'organization', 'family_casualties_info', 'casualties_count', 'notes'].forEach(key => {
                    const val = record[key];
                    if (val && val !== '-') {
                        const p = document.createElement('p');
                        p.innerHTML = `<strong>${this.translations.get(key, lang)}:</strong> ${this.highlight(val, searchTerm)}`;
                        details.appendChild(p);
                    }
                });

                card.appendChild(details);
                grid.appendChild(card);
            });

            return grid;
        }

        renderTableView(data, searchTerm, lang, currentPage, visibleRows, sortConfig, onSort) {
            const tableWrapper = document.createElement('div');
            tableWrapper.className = 'table-container';

            const table = document.createElement('table');
            table.className = 'table-responsive';

            // Header
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');

            this.dataManager.dataFieldKeys.forEach((key, index) => {
                const th = document.createElement('th');
                th.dataset.col = index;
                th.style.cursor = 'pointer';
                th.innerHTML = `${this.translations.get(key, lang)} <span class="sort-icon">↕</span>`;

                if (sortConfig.column === index) {
                    const icon = th.querySelector('.sort-icon');
                    if (icon) {
                        icon.textContent = sortConfig.direction === 'asc' ? '↑' : '↓';
                        icon.style.color = '#3b82f6';
                    }
                }

                th.addEventListener('click', () => onSort(index));
                headerRow.appendChild(th);
            });

            thead.appendChild(headerRow);
            table.appendChild(thead);

            // Body
            const tbody = document.createElement('tbody');
            const start = currentPage * visibleRows;
            const chunk = data.slice(start, start + visibleRows);

            chunk.forEach(record => {
                const tr = document.createElement('tr');
                this.dataManager.dataFieldKeys.forEach(key => {
                    const td = document.createElement('td');
                    td.innerHTML = this.highlight(String(record[key] || ''), searchTerm);
                    tr.appendChild(td);
                });
                tbody.appendChild(tr);
            });

            table.appendChild(tbody);
            tableWrapper.appendChild(table);
            return tableWrapper;
        }

        updatePagination(currentPage, totalItems, visibleRows, lang) {
            const totalPages = Math.ceil(totalItems / visibleRows) || 1;
            
            this.dom.updateElement('pageInfo', this.translations.format('page_info', lang, {
                current: currentPage + 1,
                total: totalPages
            }));

            const prevBtn = this.dom.get('prevPageBtn');
            const nextBtn = this.dom.get('nextPageBtn');
            
            if (prevBtn) prevBtn.disabled = currentPage === 0;
            if (nextBtn) nextBtn.disabled = currentPage >= totalPages - 1;
        }

        updateStats(stats) {
            this.dom.updateElement('totalCombatants', stats.totalCombatants);
            this.dom.updateElement('totalCasualties', stats.totalCasualties);
            this.dom.updateElement('familyCasualties', stats.familyCasualties);
            this.dom.updateElement('highRanking', stats.highRanking);
        }

        updateResultsCounter(count, lang) {
            const counter = this.dom.get('resultsCounter');
            if (!counter) return;

            if (count === 0) {
                counter.classList.add('hidden');
            } else {
                counter.classList.remove('hidden');
                const message = count === 1
                    ? this.translations.get('result_found', lang)
                    : this.translations.format('results_found', lang, { count });
                counter.textContent = message;
            }
        }

        populateFilters(data, filters, lang) {
            const filterConfigs = [
                { elementName: 'locationFilter', field: 'location', filterKey: 'location' },
                { elementName: 'orgFilter', field: 'organization', filterKey: 'org' },
                { elementName: 'rankFilter', field: 'rank_role', filterKey: 'rank' }
            ];

            filterConfigs.forEach(({ elementName, field, filterKey }) => {
                const select = this.dom.get(elementName);
                if (!select) return;

                const allText = this.translations.get('all', lang);
                select.innerHTML = `<option value="">${allText}</option>`;

                const uniqueValues = this.dataManager.extractUniqueValues(data, field);
                const collator = new Intl.Collator(lang, { numeric: true, sensitivity: 'base' });
                
                uniqueValues.sort((a, b) => collator.compare(a, b)).forEach(val => {
                    select.insertAdjacentHTML('beforeend', `<option value="${this.sanitize(val)}">${this.sanitize(val)}</option>`);
                });

                select.value = filters[filterKey];
            });
        }

        updateLanguageUI(lang) {
            document.documentElement.lang = lang;
            document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';

            // Update language button
            this.dom.updateElement('langBtn', lang === 'he' ? 'English' : 'עברית');

            // Update site titles
            this.dom.updateElement('siteTitle', this.translations.get('site_title', lang));
            this.dom.updateElement('siteSub', this.translations.get('site_sub', lang));

            // Update search placeholder
            const searchBox = this.dom.get('searchBox');
            if (searchBox) {
                searchBox.placeholder = this.translations.get('search_placeholder', lang);
            }

            // Update language-specific sections
            const hebrewSection = document.getElementById('dataCollectionHebrew');
            const englishSection = document.getElementById('dataCollectionEnglish');
            if (hebrewSection && englishSection) {
                hebrewSection.classList.toggle('hidden', lang !== 'he');
                englishSection.classList.toggle('hidden', lang === 'he');
            }
        }

        exportToCSV(data, lang) {
            if (!data.length) {
                this.showToast(this.translations.get('export_no_data', lang), 'error');
                return;
            }

            const headers = this.dataManager.dataFieldKeys
                .map(k => `"${this.translations.get(k, lang)}"`)
                .join(',') + '\n';
            
            let csv = headers;
            data.forEach(r => {
                csv += this.dataManager.dataFieldKeys
                    .map(k => `"${String(r[k] || '').replace(/"/g, '""')}"`)
                    .join(',') + '\n';
            });

            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'combatants_data.csv';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            this.showToast(this.translations.get('export_success', lang));
        }
    }

    // === יוטיליטיז ===
    class Utils {
        static debounce(fn, ms = CONSTANTS.DEBOUNCE_DELAY) {
            let timer;
            return (...args) => {
                clearTimeout(timer);
                timer = setTimeout(() => fn(...args), ms);
            };
        }

        static throttle(fn, ms) {
            let lastCall = 0;
            return (...args) => {
                const now = Date.now();
                if (now - lastCall >= ms) {
                    lastCall = now;
                    fn(...args);
                }
            };
        }

        static createMediaQueryHandler(query, callback) {
            const mediaQuery = window.matchMedia(query);
            const handler = (e) => callback(e.matches);
            
            if (mediaQuery.addEventListener) {
                mediaQuery.addEventListener('change', handler);
            } else {
                mediaQuery.addListener(handler);
            }
            
            return () => {
                if (mediaQuery.removeEventListener) {
                    mediaQuery.removeEventListener('change', handler);
                } else {
                    mediaQuery.removeListener(handler);
                }
            };
        }
    }

    // === אפליקציה ראשית ===
    class CombatantApp {
        constructor() {
            this.state = new AppState();
            this.dom = new DOMManager();
            this.translations = new TranslationManager();
            this.dataManager = new DataManager();
            this.ui = new UIManager(this.dom, this.translations, this.dataManager);
            
            this.collator = new Intl.Collator(this.state.lang, { numeric: true, sensitivity: 'base' });
            
            this.setupObservers();
            this.setupEventListeners();
            this.setupResponsive();
            
            // Debounced functions
            this.debouncedSearch = Utils.debounce((value) => {
                this.state.updateFilters({ search: value.toLowerCase() });
            });
        }

        setupObservers() {
            this.state.addObserver((change) => {
                switch (change.type) {
                    case 'data':
                        this.handleDataChange();
                        break;
                    case 'filters':
                        this.handleFiltersChange();
                        break;
                    case 'sort':
                        this.handleSortChange();
                        break;
                    case 'language':
                        this.handleLanguageChange(change.data);
                        break;
                }
            });
        }

        setupEventListeners() {
            // Language toggle
            const langBtn = this.dom.get('langBtn');
            if (langBtn) {
                langBtn.addEventListener('click', () => {
                    const newLang = this.state.lang === 'he' ? 'en' : 'he';
                    this.state.updateLanguage(newLang);
                });
            }

            // Filter controls
            const filterConfigs = [
                { element: 'locationFilter', key: 'location' },
                { element: 'orgFilter', key: 'org' },
                { element: 'rankFilter', key: 'rank' }
            ];

            filterConfigs.forEach(({ element, key }) => {
                const el = this.dom.get(element);
                if (el) {
                    el.addEventListener('change', () => {
                        this.state.updateFilters({ [key]: el.value.toLowerCase() });
                    });
                }
            });

            // Search box
            const searchBox = this.dom.get('searchBox');
            if (searchBox) {
                searchBox.addEventListener('input', (e) => {
                    this.debouncedSearch(e.target.value);
                });
            }

            // Pagination
            const prevBtn = this.dom.get('prevPageBtn');
            const nextBtn = this.dom.get('nextPageBtn');
            if (prevBtn) prevBtn.addEventListener('click', () => this.changePage(-1));
            if (nextBtn) nextBtn.addEventListener('click', () => this.changePage(1));

            // View toggle
            const viewToggleBtn = this.dom.get('viewToggleBtn');
            if (viewToggleBtn) {
                viewToggleBtn.addEventListener('click', () => {
                    this.state.isCardView = !this.state.isCardView;
                    this.render();
                    this.updateViewToggleButton();
                });
            }

            // Action buttons
            const resetBtn = this.dom.get('resetBtn');
            const exportBtn = this.dom.get('exportBtn');
            if (resetBtn) resetBtn.addEventListener('click', () => this.resetFilters());
            if (exportBtn) exportBtn.addEventListener('click', () => this.exportData());

            // Mobile filters toggle
            this.setupMobileFilters();
        }

        setupResponsive() {
            // Handle responsive view changes
            const cleanup = Utils.createMediaQueryHandler('(max-width: 768px)', (matches) => {
                if (this.state.isCardView !== matches) {
                    this.state.isCardView = matches;
                    this.render();
                    this.updateViewToggleButton();
                }
            });

            // Store cleanup function for later use
            this.responsiveCleanup = cleanup;
        }

        setupMobileFilters() {
            const toggle = this.dom.get('mobileFiltersToggle');
            const filtersBar = this.dom.get('filtersBar');
            
            if (!toggle || !filtersBar) return;

            toggle.addEventListener('click', () => {
                const isActive = filtersBar.classList.contains('active');
                const newState = !isActive;

                filtersBar.classList.toggle('active', newState);
                toggle.setAttribute('aria-expanded', newState.toString());

                const icon = toggle.querySelector('i');
                const span = toggle.querySelector('span');

                if (newState) {
                    if (icon) icon.className = 'fas fa-times';
                    if (span) span.textContent = this.translations.get('close_filters', this.state.lang);
                    toggle.style.background = '#dc2626';
                } else {
                    if (icon) icon.className = 'fas fa-filter';
                    if (span) span.textContent = this.translations.get('open_filters', this.state.lang);
                    toggle.style.background = '#3b82f6';
                }
            });

            // Auto-close on desktop
            Utils.createMediaQueryHandler('(min-width: 769px)', (matches) => {
                if (matches && filtersBar.classList.contains('active')) {
                    filtersBar.classList.remove('active');
                    toggle.setAttribute('aria-expanded', 'false');
                    this.updateMobileFiltersButton();
                }
            });
        }

        // Event handlers
        handleDataChange() {
            this.ui.populateFilters(this.state.originalData, this.state.filters, this.state.lang);
            this.applyFiltersAndRender();
        }

        handleFiltersChange() {
            this.applyFiltersAndRender();
        }

        handleSortChange() {
            this.applySortAndRender();
        }

        handleLanguageChange(lang) {
            this.collator = new Intl.Collator(lang, { numeric: true, sensitivity: 'base' });
            this.ui.updateLanguageUI(lang);
            this.ui.populateFilters(this.state.originalData, this.state.filters, lang);
            this.updateViewToggleButton();
            this.updateMobileFiltersButton();
            this.render();
        }

        // Core operations
        applyFiltersAndRender() {
            this.state.filteredData = this.dataManager.filterData(
                this.state.originalData,
                this.state.filters
            );
            this.state.currentPage = 0;
            this.applySortAndRender();
        }

        applySortAndRender() {
            this.state.filteredData = this.dataManager.sortData(
                this.state.filteredData,
                this.state.sort,
                this.collator
            );
            this.render();
        }

        render() {
            const contentArea = this.dom.get('contentArea');
            if (!contentArea) return;

            // Clear content
            contentArea.innerHTML = '';

            if (!this.state.filteredData.length) {
                contentArea.innerHTML = this.ui.renderEmptyState(this.state.lang);
                this.ui.updatePagination(0, 0, CONSTANTS.VISIBLE_ROWS, this.state.lang);
                this.ui.updateStats({ totalCombatants: 0, totalCasualties: 0, familyCasualties: 0, highRanking: 0 });
                this.ui.updateResultsCounter(0, this.state.lang);
                return;
            }

            const searchTerm = this.state.filters.search;

            if (this.state.isCardView) {
                const cardView = this.ui.renderCardView(
                    this.state.filteredData,
                    searchTerm,
                    this.state.lang,
                    this.state.currentPage,
                    CONSTANTS.VISIBLE_ROWS
                );
                contentArea.appendChild(cardView);
            } else {
                const tableView = this.ui.renderTableView(
                    this.state.filteredData,
                    searchTerm,
                    this.state.lang,
                    this.state.currentPage,
                    CONSTANTS.VISIBLE_ROWS,
                    this.state.sort,
                    (colIndex) => this.sortColumn(colIndex)
                );
                contentArea.appendChild(tableView);
            }

            // Update UI components
            this.ui.updatePagination(
                this.state.currentPage,
                this.state.filteredData.length,
                CONSTANTS.VISIBLE_ROWS,
                this.state.lang
            );

            const stats = this.dataManager.calculateStats(this.state.filteredData);
            this.ui.updateStats(stats);
            this.ui.updateResultsCounter(this.state.filteredData.length, this.state.lang);
        }

        sortColumn(colIndex) {
            if (this.state.sort.column === colIndex) {
                const newDirection = this.state.sort.direction === 'asc' ? 'desc' : 'asc';
                this.state.updateSort(colIndex, newDirection);
            } else {
                this.state.updateSort(colIndex, 'asc');
            }
        }

        changePage(delta) {
            const totalPages = Math.ceil(this.state.filteredData.length / CONSTANTS.VISIBLE_ROWS) || 1;
            const newPage = Math.max(0, Math.min(totalPages - 1, this.state.currentPage + delta));
            
            if (newPage !== this.state.currentPage) {
                this.state.currentPage = newPage;
                this.render();
            }
        }

        resetFilters() {
            // Reset UI elements
            const filterElements = ['locationFilter', 'orgFilter', 'rankFilter', 'searchBox'];
            filterElements.forEach(elementName => {
                const element = this.dom.get(elementName);
                if (element) element.value = '';
            });

            // Reset state
            this.state.filters = { location: '', org: '', rank: '', search: '' };
            this.state.sort = { column: null, direction: 'asc' };
            this.state.currentPage = 0;

            this.applyFiltersAndRender();
            this.ui.showToast(this.translations.get('filter_reset_success', this.state.lang));
        }

        exportData() {
            this.ui.exportToCSV(this.state.filteredData, this.state.lang);
        }

        updateViewToggleButton() {
            const btn = this.dom.get('viewToggleBtn');
            if (!btn) return;

            const iconClass = this.state.isCardView ? 'fas fa-table' : 'fas fa-th-list';
            const textKey = this.state.isCardView ? 'toggle_view_table' : 'toggle_view_card';
            const text = this.translations.get(textKey, this.state.lang);

            btn.innerHTML = `<i class="${iconClass}"></i> ${text}`;
        }

        updateMobileFiltersButton() {
            const toggle = this.dom.get('mobileFiltersToggle');
            if (!toggle) return;

            const icon = toggle.querySelector('i');
            const span = toggle.querySelector('span');

            if (icon) icon.className = 'fas fa-filter';
            if (span) span.textContent = this.translations.get('open_filters', this.state.lang);
            toggle.style.background = '#3b82f6';
            toggle.setAttribute('aria-expanded', 'false');

            const filtersBar = this.dom.get('filtersBar');
            if (filtersBar) filtersBar.classList.remove('active');
        }

        // Data loading
        async loadData() {
            this.ui.showLoading(this.translations.get('loading_data', this.state.lang));
            
            try {
                const data = await this.dataManager.loadCSVData('data.csv');
                console.log(`Loaded ${data.length} records`);
                this.state.setData(data);
            } catch (error) {
                console.error('Failed to load CSV, using embedded data:', error);
                this.state.setData(this.dataManager.embeddedData);
                
                this.ui.showToast(
                    this.translations.get('error_loading_data', this.state.lang) + error.message,
                    'error'
                );
                this.ui.showToast(
                    this.state.lang === 'he' ? 'משתמש בנתונים לדוגמה.' : 'Using sample data.',
                    'info'
                );
            } finally {
                this.ui.hideLoading();
            }
        }

        // Initialization
        async initialize() {
            console.log('Initializing app...');
            
            this.ui.updateLanguageUI(this.state.lang);
            this.updateViewToggleButton();
            this.updateMobileFiltersButton();
            
            await this.loadData();
            
            console.log('App initialized');
        }

        // Cleanup
        destroy() {
            if (this.responsiveCleanup) {
                this.responsiveCleanup();
            }
            this.state.observers.clear();
        }
    }

    // === Application startup ===
    let app;

    function startApp() {
        app = new CombatantApp();
        app.initialize().catch(console.error);
    }

    // Start the application
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startApp);
    } else {
        startApp();
    }

    // Global cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (app) {
            app.destroy();
        }
    });

})();
