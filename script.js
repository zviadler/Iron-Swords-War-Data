(function() {
    'use strict';

    // === מצב מרכזי ===
    const state = {
        originalData: [],
        filteredData: [],
        currentPage: 0,
        VISIBLE_ROWS: 50,
        sort: { column: null, direction: 'asc' },
        filters: { location: '', org: '', rank: '', search: '' },
        lang: (navigator.language || navigator.userLanguage).startsWith('he') ? 'he' : 'en',
        isCardView: window.innerWidth <= 768
    };

    // === אלמנטים DOM ===
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
        highRanking: document.getElementById('highRanking')
    };

    // === מפת שדות ===
    const dataFieldKeys = [
        'post_id','combatant_id','date','location','location_details',
        'name_english','name_arabic','nickname','description_online',
        'rank_role','organization','activity','family_casualties_info',
        'casualties_count','additional_combatants','notes'
    ];

    // === תרגומים ===
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
        result_found: { he: "נמצאה תוצאה אחת", en: "1 result found" }
    };

    // === נתונים משובצים ===
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

    // === פונקציות עזר ===
    function sanitize(input) {
        if (!input) return '';
        const div = document.createElement('div');
        div.textContent = String(input);
        return div.innerHTML;
    }

    function highlight(text, term) {
        if (!term || !text) return sanitize(text);
        const safeText = sanitize(text);
        const safeTerm = sanitize(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return safeText.replace(new RegExp(`(${safeTerm})`, 'gi'), '<mark>$1</mark>');
    }

    function debounce(fn, ms = 300) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), ms);
        };
    }

    function parseCsvLine(line) {
        const result = [];
        let inQuote = false;
        let currentField = '';
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"') {
                if (inQuote && nextChar === '"') {
                    currentField += '"';
                    i++;
                } else {
                    inQuote = !inQuote;
                }
            } else if (char === ',' && !inQuote) {
                result.push(currentField.trim());
                currentField = '';
            } else {
                currentField += char;
            }
        }
        result.push(currentField.trim());
        return result;
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

    let collator = new Intl.Collator(state.lang, { numeric: true, sensitivity: 'base' });

    // === מצב טעינה ===
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
        
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const text = await response.text();
            if (!text.trim()) throw new Error('Empty CSV');
            return parseCSV(text);
        } catch (error) {
            console.error('CSV load failed:', error);
            throw error;
        }
    }

    function parseCSV(text) {
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        if (lines.length <= 1) throw new Error('No data in CSV');
        
        const headers = parseCsvLine(lines[0]).map(normalizeHeader);
        return lines.slice(1).map(line => {
            const values = parseCsvLine(line);
            const record = {};
            headers.forEach((header, i) => {
                record[header] = values[i] ? values[i].trim() : '';
            });
            return record;
        });
    }

    async function loadData() {
        showLoading(labels.loading_data[state.lang]);
        try {
            state.originalData = await loadCSVData('data.csv');
            console.log(`Loaded ${state.originalData.length} records`);
        } catch (error) {
            console.error('Failed to load CSV, using embedded data');
            state.originalData = embeddedData;
            showToast('Using sample data', 'info');
        } finally {
            state.filteredData = [...state.originalData];
            populateFilters();
            applySortAndRender();
            hideLoading();
        }
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
            const allText = state.lang === 'he' ? 'הכל' : 'All';
            select.innerHTML = `<option value="">${allText}</option>`;
            Array.from(sets[key]).sort().forEach(val => {
                select.insertAdjacentHTML('beforeend', `<option value="${sanitize(val)}">${sanitize(val)}</option>`);
            });
        });
    }

    function filterData() {
        const { location, org, rank, search } = state.filters;
        state.filteredData = state.originalData.filter(r => {
            const loc = (r.location || '').toLowerCase();
            const o = (r.organization || '').toLowerCase();
            const rk = (r.rank_role || '').toLowerCase();
            const txt = [r.name_english, r.name_arabic, r.description_online, loc, o].join(' ').toLowerCase();
            
            return (!location || loc.includes(location)) &&
                   (!org || o.includes(org)) &&
                   (!rank || rk.includes(rank)) &&
                   (!search || txt.includes(search));
        });
        state.currentPage = 0;
    }

    const debouncedFilter = debounce(() => {
        state.filters.search = dom.searchBox.value.toLowerCase();
        filterData();
        applySortAndRender();
    });

    // === מיון ===
    function sortData() {
        const { column, direction } = state.sort;
        if (column === null) return;
        const key = dataFieldKeys[column];
        state.filteredData.sort((a, b) => {
            const cmp = collator.compare(a[key] || '', b[key] || '');
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

    // === רינדור ===
    function renderData() {
        dom.contentArea.innerHTML = '';
        const data = state.filteredData;
        
        if (!data.length) {
            dom.contentArea.innerHTML = `<div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>לא נמצאו תוצאות</h3>
                <p>נסה לשנות את קריטריוני החיפוש</p>
            </div>`;
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
        
        data.forEach(record => {
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
        const table = document.createElement('table');
        table.className = 'table-responsive';
        
        const thead = document.createElement('thead');
        thead.innerHTML = `<tr>${
            dataFieldKeys.map((k, i) => `<th data-col="${i}" style="cursor: pointer;">${labels[k][state.lang]} <span>↕</span></th>`).join('')
        }</tr>`;
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
        dom.contentArea.appendChild(table);
        
        thead.querySelectorAll('th[data-col]').forEach(th => {
            th.addEventListener('click', () => sortAndRender(parseInt(th.dataset.col)));
        });
    }

    // === פגינציה ===
    function updatePagination() {
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

    // === עדכון טקסט ===
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
        
        const hebrewSection = document.getElementById('dataCollectionHebrew');
        const englishSection = document.getElementById('dataCollectionEnglish');
        if (hebrewSection && englishSection) {
            hebrewSection.classList.toggle('hidden', state.lang !== 'he');
            englishSection.classList.toggle('hidden', state.lang === 'he');
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

    // === פעולות ===
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
        link.download = 'combatants_data.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast(labels.export_success[state.lang]);
    }

    function resetFilters() {
        dom.locationFilter.value = '';
        dom.orgFilter.value = '';
        dom.rankFilter.value = '';
        dom.searchBox.value = '';
        state.filters = { location: '', org: '', rank: '', search: '' };
        state.sort = { column: null, direction: 'asc' };
        filterData();
        applySortAndRender();
        showToast(labels.filter_reset_success[state.lang]);
    }

    // === אתחול ===
    function initialize() {
        console.log('Initializing app...');
        
        // עדכון שפה
        document.documentElement.lang = state.lang;
        document.documentElement.dir = state.lang === 'he' ? 'rtl' : 'ltr';
        collator = new Intl.Collator(state.lang, { numeric: true, sensitivity: 'base' });
        
        updateTextByLang();
        loadData();
        
        // מאזינים
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
        
        if (dom.locationFilter) {
            dom.locationFilter.addEventListener('change', () => {
                state.filters.location = dom.locationFilter.value.toLowerCase();
                filterData();
                applySortAndRender();
            });
        }
        
        if (dom.orgFilter) {
            dom.orgFilter.addEventListener('change', () => {
                state.filters.org = dom.orgFilter.value.toLowerCase();
                filterData();
                applySortAndRender();
            });
        }
        
        if (dom.rankFilter) {
            dom.rankFilter.addEventListener('change', () => {
                state.filters.rank = dom.rankFilter.value.toLowerCase();
                filterData();
                applySortAndRender();
            });
        }
        
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
        
        console.log('App initialized');
    }

    // === הפעלה ===
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();

// === CSS נוסף ===
const styles = document.createElement('style');
styles.textContent = `
.empty-state { 
    text-align: center; 
    padding: 2rem; 
    color: #666; 
}
.empty-state i { 
    font-size: 3rem; 
    margin-bottom: 1rem; 
    opacity: 0.5; 
}
.empty-state h3 { 
    font-size: 1.2rem; 
    margin-bottom: 0.5rem; 
}
.table-responsive { 
    width: 100%; 
    border-collapse: collapse; 
}
.table-responsive th, 
.table-responsive td { 
    padding: 0.5rem; 
    border: 1px solid #ddd; 
    text-align: right; 
}
.table-responsive th { 
    background: #f5f5f5; 
    font-weight: bold; 
}
.card-grid { 
    display: grid; 
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
    gap: 1rem; 
    padding: 1rem; 
}
.card { 
    background: white; 
    border: 1px solid #ddd; 
    border-radius: 8px; 
    padding: 1rem; 
    box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
}
.card h2 { 
    font-size: 1.1rem; 
    margin-bottom: 0.5rem; 
}
.card .sub { 
    font-size: 0.9rem; 
    color: #666; 
    margin-bottom: 0.5rem; 
}
.card .meta { 
    font-size: 0.8rem; 
    color: #888; 
    border-bottom: 1px solid #eee; 
    padding-bottom: 0.5rem; 
    margin-bottom: 0.5rem; 
}
.card-details p { 
    margin: 0.3rem 0; 
    font-size: 0.9rem; 
}
.toast { 
    position: fixed; 
    top: 20px; 
    right: 20px; 
    background: #4CAF50; 
    color: white; 
    padding: 1rem; 
    border-radius: 4px; 
    z-index: 1000; 
}
.toast.error { 
    background: #f44336; 
}
.toast.info { 
    background: #2196F3; 
}
mark { 
    background: #ffeb3b; 
    padding: 0.1em 0.2em; 
}
`;
document.head.appendChild(styles);
