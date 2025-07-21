// --- CSS Classes for dynamic styling ---
const dynamicStyles = `
<style id="dynamic-app-styles">
/* Loading states */
.loading {
    position: relative;
    pointer-events: none;
    opacity: 0.7;
}

.loading::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.8);
    z-index: 99;
}

/* Error banner */
.error-banner {
    position: relative;
    margin-bottom: 1rem;
    padding: 1rem;
    background: #fee;
    border: 1px solid #fcc;
    border-radius: 0.5rem;
    color: #a00;
}

.error-banner button {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: none;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    color: inherit;
    opacity: 0.7;
}

.error-banner button:hover {
    opacity: 1;
}

/* Focus indicators */
.card:focus-visible,
tr:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
}

/* Sort indicators */
.sort-indicator {
    margin-(function() {
    'use strict';

    // --- מצב מרכזי לניהול המצב ---
    const state = {
        originalData: [],
        filteredData: [],
        currentPage: 0,
        VISIBLE_ROWS: 50,
        sort: { column: null, direction: 'asc' },
        filters: { location: '', org: '', rank: '', search: '' },
        lang: (navigator.language || navigator.userLanguage).startsWith('he') ? 'he' : 'en',
        isCardView: window.innerWidth <= 768,
        isLoading: false,
        error: null
    };

    // --- קאשינג של אלמנטים ב-DOM ---
    const dom = {
        // אלמנטים עיקריים
        contentArea: document.getElementById('contentArea'),
        loadingOverlay: document.getElementById('loadingOverlay'),
        toastContainer: document.getElementById('toastContainer'),
        backToTop: document.getElementById('backToTop'),
        
        // פילטרים
        locationFilter: document.getElementById('locationFilter'),
        orgFilter: document.getElementById('orgFilter'),
        rankFilter: document.getElementById('rankFilter'),
        searchBox: document.getElementById('searchBox'),
        mobileFiltersToggle: document.getElementById('mobileFiltersToggle'),
        filtersBar: document.getElementById('filtersBar'),
        
        // כפתורים
        langBtn: document.getElementById('langBtn'),
        viewToggleBtn: document.getElementById('viewToggleBtn'),
        exportBtn: document.getElementById('exportBtn'),
        resetBtn: document.getElementById('resetBtn'),
        
        // פגינציה
        prevPageBtn: document.getElementById('prevPageBtn'),
        nextPageBtn: document.getElementById('nextPageBtn'),
        pageInfo: document.getElementById('pageInfo'),
        resultsCounter: document.getElementById('resultsCounter'),
        
        // סטטיסטיקות
        totalCombatants: document.getElementById('totalCombatants'),
        totalCasualties: document.getElementById('totalCasualties'),
        familyCasualties: document.getElementById('familyCasualties'),
        highRanking: document.getElementById('highRanking'),
        
        // כותרות
        siteTitle: document.getElementById('siteTitle'),
        siteSub: document.getElementById('siteSub'),
        
        // תוכן לשוני
        dataCollectionHebrew: document.getElementById('dataCollectionHebrew'),
        dataCollectionEnglish: document.getElementById('dataCollectionEnglish')
    };

    // --- מפת רשומות לפי סדר עמודות ---
    const dataFieldKeys = [
        'post_id','combatant_id','date','location','location_details',
        'name_english','name_arabic','nickname','description_online',
        'rank_role','organization','activity','family_casualties_info',
        'casualties_count','additional_combatants','notes'
    ];

    // --- תוויות ותרגומים ---
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
        
        // כפתורים ופעולות
        toggle_view_card: { he: "עבור לתצוגת כרטיסים", en: "Switch to Card View" },
        toggle_view_table: { he: "עבור לתצוגת טבלה", en: "Switch to Table View" },
        search_placeholder: { he: "🔍 חפש שם, מיקום או תיאור...", en: "🔍 Search name, location or description..." },
        reset_filters: { he: "איפוס פילטרים", en: "Reset Filters" },
        export_csv: { he: "ייצא ל-CSV", en: "Export to CSV" },
        open_filters: { he: "פתח פילטרים", en: "Open Filters" },
        close_filters: { he: "סגור פילטרים", en: "Close Filters" },
        
        // סטטיסטיקות
        total_combatants: { he: "סה\"כ לוחמים", en: "Total Combatants" },
        total_casualties: { he: "סה\"כ קורבנות", en: "Total Casualties" },
        family_members: { he: "בני משפחה", en: "Family Members" },
        high_ranking: { he: "בכירים", en: "High Ranking" },
        
        // הודעות מצב
        loading_data: { he: "טוען נתונים...", en: "Loading data..." },
        no_matching_data: { he: "לא נמצאו תוצאות תואמות", en: "No matching results found" },
        error_loading_data: { he: "שגיאה בטעינת הנתונים: ", en: "Error loading data: " },
        csv_file_error: { he: ". וודא שקובץ data.csv קיים ובפורמט תקין.", en: ". Ensure data.csv exists and is in a valid format." },
        
        // פגינציה
        previous_page: { he: "הקודם", en: "Previous" },
        next_page: { he: "הבא", en: "Next" },
        page_info: { he: "עמוד {current} מתוך {total}", en: "Page {current} of {total}" },
        
        // שגיאות
        error_http: { he: "שגיאת HTTP: ", en: "HTTP Error: " },
        error_empty_csv: { he: "קובץ CSV ריק", en: "Empty CSV file" },
        error_data_load_context: { he: "טעינת קובץ נתונים", en: "Data file loading" },
        error_no_source: { he: "לא ניתן לטעון נתונים מאף מקור", en: "Could not load data from any source" },
        
        // הודעות הצלחה
        export_success: { he: "הנתונים יוצאו בהצלחה ל-CSV!", en: "Data exported to CSV successfully!" },
        export_no_data: { he: "אין נתונים לייצוא.", en: "No data to export." },
        filter_reset_success: { he: "הפילטרים אופסו בהצלחה.", en: "Filters reset successfully." },
        
        // תוצאות
        results_found: { he: "נמצאו {count} תוצאות", en: "{count} results found" },
        result_found: { he: "נמצאה תוצאה אחת", en: "1 result found" },
        no_results: { he: "לא נמצאו תוצאות", en: "No results found" },
        
        // נגישות
        sort_ascending: { he: "מיון עולה", en: "Sort ascending" },
        sort_descending: { he: "מיון יורד", en: "Sort descending" },
        sort_column: { he: "מיין עמודה", en: "Sort column" }
    };

    // --- נתונים משובצים לשימוש מקומי ---
    const embeddedCombatantData = [
        {
            "post_id": "1",
            "combatant_id": "1",
            "date": "25-APR-2025",
            "location": "Unknown",
            "location_details": "-",
            "name_english": "Muhammad Baraka Ayish Al-Amur",
            "name_arabic": "محمد بركة عايش العامور",
            "nickname": "-",
            "description_online": "-",
            "rank_role": "Member of Military Council",
            "organization": "Al-Mujahideen Battalions",
            "activity": "-",
            "family_casualties_info": "wife, 2 sons, 5 daughters",
            "casualties_count": "9",
            "additional_combatants": "-",
            "notes": "-"
        },
        {
            "post_id": "2",
            "combatant_id": "2",
            "date": "24-APR-2025",
            "location": "Al Zawaida (Central Camps)",
            "location_details": "tent",
            "name_english": "Imad Al-Baba \"Abu Ashraf\"",
            "name_arabic": "עماد البابا \"אבו אשרף\"",
            "nickname": "אבו אשרף",
            "description_online": "-",
            "rank_role": "Leader of Military Intelligence Service",
            "organization": "Al-Mujahideen Battalions",
            "activity": "-",
            "family_casualties_info": "1 other man, 1 child",
            "casualties_count": "3",
            "additional_combatants": "-",
            "notes": "-"
        },
        {
            "post_id": "3",
            "combatant_id": "3",
            "date": "22-APR-2025",
            "location": "Gaza City, al-Shati",
            "location_details": "-",
            "name_english": "Youssef Saleem Bakr",
            "name_arabic": "יוסף סלים בכר",
            "nickname": "-",
            "description_online": "\"leader (al-Qa'id) and a heroic martyr (al-Batal)\"",
            "rank_role": "Leader",
            "organization": "-",
            "activity": "-",
            "family_casualties_info": "wife, daughter",
            "casualties_count": "1",
            "additional_combatants": "4",
            "notes": "Funeral with gunshots"
        },
        {
            "post_id": "3",
            "combatant_id": "4",
            "date": "22-APR-2025",
            "location": "Gaza City, al-Shati",
            "location_details": "-",
            "name_english": "Son of Youssef Saleem Bakr",
            "name_arabic": "בנו של יוסף סלים בכר",
            "nickname": "-",
            "description_online": "\"leader (al-Qa'id) and a heroic martyr (al-Batal)\"",
            "rank_role": "Leader",
            "organization": "-",
            "activity": "-",
            "family_casualties_info": "-",
            "casualties_count": "1",
            "additional_combatants": "3",
            "notes": "Funeral with gunshots"
        }
    ];

    // --- פונקציות עזר ואבטחה ---

    /**
     * מנקה קלט משתמש למניעת XSS
     */
    function sanitizeInput(input) {
        if (!input) return '';
        const div = document.createElement('div');
        div.textContent = String(input);
        return div.innerHTML;
    }

    /**
     * מדגיש טקסט חיפוש בתוצאות
     */
    function highlight(text, term) {
        if (!term || !text) return sanitizeInput(text);
        const safeText = sanitizeInput(text);
        const safeTerm = sanitizeInput(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${safeTerm})`, 'gi');
        return safeText.replace(regex, '<mark>$1</mark>');
    }

    /**
     * Debounce לשיפור ביצועים
     */
    function debounce(fn, ms = 150) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), ms);
        };
    }

    /**
     * פרסר CSV משופר
     */
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
                    i++; // דילוג על הציטוט הכפול
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

    /**
     * נרמול כותרות עמודות
     */
    function normalizeHeader(header) {
        const normalized = header.trim().toLowerCase();
        const headerMap = {
            "מס' פוסט": 'post_id',
            "post no.": 'post_id',
            "מס' לוחם": 'combatant_id',
            "fighter no.": 'combatant_id',
            'תאריך': 'date',
            'date': 'date',
            'מיקום': 'location',
            'location': 'location',
            'פירוט מיקום': 'location_details',
            'location details': 'location_details',
            'שם באנגלית': 'name_english',
            'name in english': 'name_english',
            'שם בערבית': 'name_arabic',
            'name in arabic': 'name_arabic',
            'כינוי': 'nickname',
            'nickname': 'nickname',
            'תיאור ברשת': 'description_online',
            'social media description': 'description_online',
            'דרגה/תפקיד': 'rank_role',
            'rank/role': 'rank_role',
            'ארגון': 'organization',
            'organization': 'organization',
            'פעילות': 'activity',
            'activity': 'activity',
            'בני משפחה': 'family_casualties_info',
            'family members': 'family_casualties_info',
            "מס' קורבנות": 'casualties_count',
            'no. of victims': 'casualties_count',
            'לוחמים נוספים': 'additional_combatants',
            'additional fighters': 'additional_combatants',
            'הערות': 'notes',
            'notes': 'notes'
        };
        
        return headerMap[normalized] || normalized.replace(/ /g, '_').replace(/[^a-z0-9_]/g, '');
    }

    // --- אתחול Collator למיון ---
    let collator = new Intl.Collator(state.lang, { 
        numeric: true, 
        sensitivity: 'base',
        ignorePunctuation: true 
    });

    // --- פונקציות מצב טעינה ושגיאות ---

    /**
     * הצגת מצב טעינה
     */
    function showLoadingState(message) {
        state.isLoading = true;
        if (dom.loadingOverlay) {
            const loadingText = dom.loadingOverlay.querySelector('.loading-text');
            if (loadingText) {
                loadingText.textContent = message || labels.loading_data[state.lang];
            }
            dom.loadingOverlay.classList.remove('hidden');
            dom.loadingOverlay.setAttribute('aria-hidden', 'false');
        }
        
        if (dom.contentArea) {
            dom.contentArea.classList.add('loading');
            dom.contentArea.setAttribute('aria-busy', 'true');
        }
    }

    /**
     * הסתרת מצב טעינה
     */
    function hideLoadingState() {
        state.isLoading = false;
        if (dom.loadingOverlay) {
            dom.loadingOverlay.classList.add('hidden');
            dom.loadingOverlay.setAttribute('aria-hidden', 'true');
        }
        
        if (dom.contentArea) {
            dom.contentArea.classList.remove('loading');
            dom.contentArea.removeAttribute('aria-busy');
        }
    }

    /**
     * הצגת הודעת שגיאה
     */
    function showErrorMessage(error, context) {
        console.error('Error:', error, 'Context:', context);
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-banner bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4';
        errorDiv.role = 'alert';
        errorDiv.innerHTML = `
            <strong>${state.lang === 'he' ? 'שגיאה' : 'Error'}:</strong> 
            ${sanitizeInput(error.message)}
            <br>
            <small>${state.lang === 'he' ? 'הקשר' : 'Context'}: ${sanitizeInput(context)}</small>
            <button class="float-right text-red-500 hover:text-red-700 ml-2" 
                    onclick="this.parentElement.remove()" 
                    aria-label="${state.lang === 'he' ? 'סגור הודעת שגיאה' : 'Close error message'}">
                ✕
            </button>
        `;
        
        const container = document.querySelector('.container');
        if (container) {
            container.parentElement.insertBefore(errorDiv, container);
        }
        
        // הסרה אוטומטית אחרי 10 שניות
        setTimeout(() => errorDiv.remove(), 10000);
    }

    /**
     * הצגת Toast הודעות
     */
    function showToast(message, type = 'success', duration = 3000) {
        if (!dom.toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        
        dom.toastContainer.appendChild(toast);
        
        // Force reflow for animation
        void toast.offsetWidth;
        
        // Add show class for animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
        
        // Remove toast after duration
        setTimeout(() => {
            toast.style.animation = 'slideOutFade 0.3s ease forwards';
            toast.addEventListener('animationend', () => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            });
        }, duration);
    }

    // --- פונקציות טעינת נתונים ---

    /**
     * טעינת נתונים מ-CSV
     */
    async function loadCSVData(url) {
        console.log('Attempting to load CSV from:', url);
        
        // אם זה file:// protocol, השתמש בנתונים משובצים
        if (window.location.protocol === 'file:') {
            console.log('Using embedded data (file:// protocol)');
            return embeddedCombatantData;
        }
        
        try {
            console.log('Fetching CSV file...');
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'text/csv,text/plain,*/*',
                    'Cache-Control': 'no-cache'
                }
            });
            
            console.log('Response status:', response.status, response.statusText);
            
            if (!response.ok) {
                throw new Error(`${labels.error_http[state.lang]}${response.status} ${response.statusText}`);
            }
            
            const text = await response.text();
            console.log('CSV text length:', text.length);
            console.log('First 200 characters:', text.substring(0, 200));
            
            if (!text.trim()) {
                throw new Error(labels.error_empty_csv[state.lang]);
            }
            
            const parsedData = parseCSVData(text);
            console.log('Parsed data length:', parsedData.length);
            console.log('Sample record:', parsedData[0]);
            
            return parsedData;
            
        } catch (error) {
            console.error('CSV loading failed:', error);
            throw error;
        }
    }

    /**
     * פרסינג נתוני CSV
     */
    function parseCSVData(text) {
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        
        if (lines.length <= 1) {
            throw new Error(labels.error_empty_csv[state.lang]);
        }
        
        const rawHeaders = parseCsvLine(lines[0]);
        const headers = rawHeaders.map(normalizeHeader);
        
        const data = lines.slice(1).map((line, index) => {
            try {
                const values = parseCsvLine(line);
                const record = {};
                
                headers.forEach((header, i) => {
                    record[header] = values[i] ? values[i].trim() : '';
                });
                
                return record;
            } catch (error) {
                console.warn(`Error parsing line ${index + 2}:`, line, error);
                return null;
            }
        }).filter(record => record !== null);
        
        return data;
    }

    /**
     * טעינת נתונים עיקרית
     */
    async function loadData() {
        console.log('=== Starting data load process ===');
        showLoadingState(labels.loading_data[state.lang]);
        
        try {
            console.log('Attempting to load from data.csv');
            state.originalData = await loadCSVData('data.csv');
            
            if (!Array.isArray(state.originalData) || state.originalData.length === 0) {
                throw new Error(labels.error_no_source[state.lang]);
            }
            
            console.log(`Successfully loaded ${state.originalData.length} records from CSV`);
            
        } catch (error) {
            console.error('CSV loading failed, falling back to embedded data:', error);
            
            // נסה להשתמש בנתונים משובצים כגיבוי
            state.originalData = embeddedCombatantData;
            console.log(`Using ${state.originalData.length} embedded records as fallback`);
            
            const contextError = labels.error_data_load_context[state.lang] + 
                (window.location.protocol !== 'file:' ? labels.csv_file_error[state.lang] : '');
            
            showErrorMessage(error, contextError);
            showToast(labels.error_loading_data[state.lang] + error.message, 'error', 5000);
            
        } finally {
            console.log('Final data count:', state.originalData.length);
            state.filteredData = [...state.originalData];
            state.error = null;
            
            populateFilters();
            applySortAndRender();
            hideLoadingState();
            console.log('=== Data load process completed ===');
        }
    }

    // --- פונקציות מובייל ---

    /**
     * אתחול תפריט פילטרים למובייל
     */
    function initializeMobileFilters() {
        if (!dom.mobileFiltersToggle || !dom.filtersBar) return;
        
        // הוספת מאזין לכפתור פילטרים נייד
        dom.mobileFiltersToggle.addEventListener('click', function() {
            const isExpanded = dom.filtersBar.classList.contains('active');
            const newState = !isExpanded;
            
            dom.filtersBar.classList.toggle('active', newState);
            dom.mobileFiltersToggle.setAttribute('aria-expanded', newState.toString());
            
            // עדכון טקסט הכפתור
            const icon = dom.mobileFiltersToggle.querySelector('i');
            const span = dom.mobileFiltersToggle.querySelector('span');
            
            if (span) {
                span.textContent = newState ? 
                    labels.close_filters[state.lang] : 
                    labels.open_filters[state.lang];
            }
            
            if (icon) {
                icon.className = newState ? 'fas fa-times' : 'fas fa-filter';
            }
        });
        
        // סגירה אוטומטית במסכים רחבים
        const mediaQuery = window.matchMedia('(min-width: 769px)');
        mediaQuery.addListener(function(e) {
            if (e.matches) {
                dom.filtersBar.classList.remove('active');
                dom.mobileFiltersToggle.setAttribute('aria-expanded', 'false');
                updateMobileFiltersButton();
            }
        });
    }

    /**
     * עדכון כפתור פילטרים נייד
     */
    function updateMobileFiltersButton() {
        if (!dom.mobileFiltersToggle) return;
        
        const span = dom.mobileFiltersToggle.querySelector('span');
        const icon = dom.mobileFiltersToggle.querySelector('i');
        
        if (span) {
            span.textContent = labels.open_filters[state.lang];
        }
        
        if (icon) {
            icon.className = 'fas fa-filter';
        }
    }

    // --- פונקציות פילטרים ומיון ---

    /**
     * אכלוס רשימות הפילטרים
     */
    function populateFilters() {
        const sets = { 
            location: new Set(), 
            org: new Set(), 
            rank: new Set() 
        };
        
        // איסוף ערכים ייחודיים
        state.originalData.forEach(record => {
            if (record.location && record.location !== '-') {
                sets.location.add(record.location.trim());
            }
            if (record.organization && record.organization !== '-') {
                sets.org.add(record.organization.trim());
            }
            if (record.rank_role && record.rank_role !== '-') {
                sets.rank.add(record.rank_role.trim());
            }
        });
        
        // עדכון רשימות הבחירה
        const filterConfigs = [
            { id: 'locationFilter', key: 'location' },
            { id: 'orgFilter', key: 'org' },
            { id: 'rankFilter', key: 'rank' }
        ];
        
        filterConfigs.forEach(({ id, key }) => {
            const select = dom[id];
            if (!select) return;
            
            const currentValue = select.value;
            const allText = state.lang === 'he' ? 'הכל' : 'All';
            
            // ניקוי והוספת אפשרות ברירת מחדל
            select.innerHTML = `<option value="">${allText}</option>`;
            
            // מיון והוספת אפשרויות
            const sortedValues = Array.from(sets[key]).sort(collator.compare);
            sortedValues.forEach(value => {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = value;
                select.appendChild(option);
            });
            
            // שחזור ערך קודם אם קיים
            if (currentValue && sets[key].has(currentValue)) {
                select.value = currentValue;
            }
        });
    }

    /**
     * סינון הנתונים
     */
    function filterData() {
        const { location, org, rank, search } = state.filters;
        
        state.filteredData = state.originalData.filter(record => {
            // בדיקת מיקום
            if (location) {
                const recordLocation = (record.location || '').toLowerCase();
                if (!recordLocation.includes(location)) return false;
            }
            
            // בדיקת ארגון
            if (org) {
                const recordOrg = (record.organization || '').toLowerCase();
                if (!recordOrg.includes(org)) return false;
            }
            
            // בדיקת דרגה
            if (rank) {
                const recordRank = (record.rank_role || '').toLowerCase();
                if (!recordRank.includes(rank)) return false;
            }
            
            // חיפוש חופשי
            if (search) {
                const searchText = [
                    record.name_english || '',
                    record.name_arabic || '',
                    record.description_online || '',
                    record.location || '',
                    record.organization || '',
                    record.nickname || ''
                ].join(' ').toLowerCase();
                
                if (!searchText.includes(search)) return false;
            }
            
            return true;
        });
        
        state.currentPage = 0; // איפוס לעמוד ראשון
    }

    /**
     * Debounced חיפוש
     */
    const debouncedFilter = debounce(() => {
        state.filters.search = dom.searchBox.value.toLowerCase().trim();
        filterData();
        applySortAndRender();
    }, 300);

    /**
     * מיון הנתונים
     */
    function sortData() {
        const { column, direction } = state.sort;
        if (column === null) return;
        
        const key = dataFieldKeys[column];
        if (!key) return;
        
        state.filteredData.sort((a, b) => {
            const valueA = (a[key] || '').toString();
            const valueB = (b[key] || '').toString();
            
            const comparison = collator.compare(valueA, valueB);
            return direction === 'asc' ? comparison : -comparison;
        });
    }

    /**
     * מיון ורינדור
     */
    function sortAndRender(colIndex = null) {
        if (colIndex !== null) {
            if (state.sort.column === colIndex) {
                state.sort.direction = state.sort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                state.sort.column = colIndex;
                state.sort.direction = 'asc';
            }
        }
        
        sortData();
        applySortAndRender();
    }

    /**
     * החלת מיון ורינדור
     */
    function applySortAndRender() {
        sortData();
        renderData();
        updatePagination();
        updateStats();
        updateTextByLang();
        updateResultsCounter();
        saveUserPreferences();
        updateSortIndicators();
    }

    // --- פונקציות רינדור ---

    /**
     * רינדור הנתונים
     */
    function renderData() {
        if (!dom.contentArea) return;
        
        dom.contentArea.innerHTML = '';
        dom.contentArea.classList.remove('loading');
        
        const data = state.filteredData;
        if (!data.length) {
            renderEmptyState();
            return;
        }
        
        const searchTerm = state.filters.search;
        
        if (state.isCardView) {
            renderCardView(data, searchTerm);
        } else {
            renderTableView(data, searchTerm);
        }
        
        // עדכון נגישות
        dom.contentArea.setAttribute('aria-live', 'polite');
        
        // גלילה למעלה אם זה עמוד חדש
        if (state.currentPage > 0) {
            dom.contentArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    /**
     * רינדור מצב ריק
     */
    function renderEmptyState() {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty-state';
        emptyDiv.innerHTML = `
            <i class="fas fa-search" aria-hidden="true"></i>
            <h3>${labels.no_results[state.lang]}</h3>
            <p>${state.filters.search || state.filters.location || state.filters.org || state.filters.rank ? 
                'נסה לשנות את קריטריוני החיפוש או לאפס את הפילטרים' : 
                'אין נתונים זמינים כעת'}</p>
        `;
        dom.contentArea.appendChild(emptyDiv);
    }

    /**
     * רינדור תצוגת כרטיסים
     */
    function renderCardView(data, searchTerm) {
        const grid = document.createElement('div');
        grid.className = 'card-grid';
        grid.setAttribute('role', 'grid');
        grid.setAttribute('aria-label', `${data.length} תוצאות בתצוגת כרטיסים`);
        
        data.forEach((record, index) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.setAttribute('role', 'gridcell');
            card.setAttribute('tabindex', '0');
            
            // הסרת סימון בכירים מהכרטיסים
            
            card.innerHTML = `
                <h2>
                    ${highlight(record.name_english || '', searchTerm)} 
                    ${record.name_arabic ? '| ' + highlight(record.name_arabic, searchTerm) : ''}
                </h2>
                ${record.description_online && record.description_online !== '-' ? 
                    `<div class="sub">${highlight(record.description_online, searchTerm)}</div>` : ''}
                <div class="meta">
                    ${record.location && record.location !== '-' ? 
                        `<span><i class="fas fa-map-marker-alt" aria-hidden="true"></i> ${highlight(record.location, searchTerm)}</span>` : ''}
                    ${record.date && record.date !== '-' ? 
                        `<span><i class="fas fa-calendar" aria-hidden="true"></i> ${highlight(record.date, searchTerm)}</span>` : ''}
                </div>
            `;
            
            // פרטים נוספים
            const details = document.createElement('div');
            details.className = 'card-details';
            
            const fieldsToShow = [
                'rank_role', 'organization', 'activity', 
                'family_casualties_info', 'casualties_count', 
                'additional_combatants', 'notes'
            ];
            
            fieldsToShow.forEach(key => {
                const value = record[key];
                if (value && value.trim() !== '-' && value.trim() !== '') {
                    const p = document.createElement('p');
                    if (key === 'family_casualties_info') {
                        p.classList.add('family');
                    }
                    p.innerHTML = `<strong>${labels[key][state.lang]}:</strong> ${highlight(value, searchTerm)}`;
                    details.appendChild(p);
                }
            });
            
            card.appendChild(details);
            
            // נגישות - מקש Enter
            card.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    card.click();
                }
            });
            
            grid.appendChild(card);
        });
        
        dom.contentArea.appendChild(grid);
    }

    /**
     * רינדור תצוגת טבלה
     */
    function renderTableView(data, searchTerm) {
        const tableContainer = document.createElement('div');
        tableContainer.className = 'table-container';
        
        const table = document.createElement('table');
        table.className = 'w-full border-collapse text-sm';
        table.setAttribute('role', 'table');
        table.setAttribute('aria-label', `טבלת נתונים עם ${data.length} תוצאות`);
        
        // כותרת טבלה
        const thead = document.createElement('thead');
        thead.setAttribute('role', 'rowgroup');
        
        const headerRow = document.createElement('tr');
        headerRow.setAttribute('role', 'row');
        
        dataFieldKeys.forEach((key, index) => {
            const th = document.createElement('th');
            th.setAttribute('role', 'columnheader');
            th.setAttribute('data-col', index.toString());
            th.setAttribute('tabindex', '0');
            th.setAttribute('aria-sort', getSortAriaValue(index));
            th.style.cursor = 'pointer';
            
            const sortIcon = getSortIcon(index);
            th.innerHTML = `
                ${labels[key][state.lang]} 
                <span class="sort-indicator" aria-hidden="true">${sortIcon}</span>
            `;
            
            // נגישות למיון
            th.setAttribute('aria-label', 
                `${labels[key][state.lang]} - ${labels.sort_column[state.lang]}`);
            
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // גוף טבלה
        const tbody = document.createElement('tbody');
        tbody.setAttribute('role', 'rowgroup');
        
        const start = state.currentPage * state.VISIBLE_ROWS;
        const end = Math.min(start + state.VISIBLE_ROWS, data.length);
        const chunk = data.slice(start, end);
        
        const fragment = document.createDocumentFragment();
        
        chunk.forEach((record, rowIndex) => {
            const tr = document.createElement('tr');
            tr.setAttribute('role', 'row');
            tr.setAttribute('tabindex', '0');
            
            // הסרת סימון בכירים מהטבלה
            
            dataFieldKeys.forEach((key, colIndex) => {
                const td = document.createElement('td');
                td.setAttribute('role', 'cell');
                td.innerHTML = highlight(String(record[key] || ''), searchTerm);
                tr.appendChild(td);
            });
            
            // נגישות - ניווט במקלדת
            tr.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    // פתח פרטים או בצע פעולה
                    console.log('Row selected:', record);
                }
            });
            
            fragment.appendChild(tr);
        });
        
        tbody.appendChild(fragment);
        table.appendChild(tbody);
        
        // מאזיני מיון
        thead.querySelectorAll('th[data-col]').forEach(th => {
            th.addEventListener('click', () => {
                const colIndex = parseInt(th.dataset.col);
                sortAndRender(colIndex);
            });
            
            th.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const colIndex = parseInt(th.dataset.col);
                    sortAndRender(colIndex);
                }
            });
        });
        
        tableContainer.appendChild(table);
        dom.contentArea.appendChild(tableContainer);
    }

    /**
     * עדכון אינדיקטורי מיון
     */
    function updateSortIndicators() {
        const headers = dom.contentArea.querySelectorAll('th[data-col]');
        headers.forEach((th, index) => {
            const sortIndicator = th.querySelector('.sort-indicator');
            if (sortIndicator) {
                sortIndicator.textContent = getSortIcon(index);
            }
            th.setAttribute('aria-sort', getSortAriaValue(index));
        });
    }

    /**
     * קבלת אייקון מיון
     */
    function getSortIcon(colIndex) {
        if (state.sort.column === colIndex) {
            return state.sort.direction === 'asc' ? '↑' : '↓';
        }
        return '↕';
    }

    /**
     * קבלת ערך ARIA למיון
     */
    function getSortAriaValue(colIndex) {
        if (state.sort.column === colIndex) {
            return state.sort.direction === 'asc' ? 'ascending' : 'descending';
        }
        return 'none';
    }

    /**
     * בדיקת דרגה גבוהה
     */
    function isHighRankingRole(role) {
        if (!role) return false;
        const lowerRole = role.toLowerCase();
        return lowerRole.includes('leader') || 
               lowerRole.includes('commander') || 
               lowerRole.includes('prominent') ||
               lowerRole.includes('council') ||
               lowerRole.includes('chief');
    }

    // --- פונקציות פגינציה ---

    /**
     * עדכון פגינציה
     */
    function updatePagination() {
        if (!dom.pageInfo || !dom.prevPageBtn || !dom.nextPageBtn) return;
        
        const totalItems = state.filteredData.length;
        const totalPages = Math.ceil(totalItems / state.VISIBLE_ROWS) || 1;
        const currentPage = state.currentPage + 1;
        
        // עדכון מידע עמוד
        dom.pageInfo.textContent = labels.page_info[state.lang]
            .replace('{current}', currentPage.toString())
            .replace('{total}', totalPages.toString());
        
        // עדכון כפתורים
        dom.prevPageBtn.disabled = state.currentPage === 0;
        dom.nextPageBtn.disabled = state.currentPage >= totalPages - 1;
        
        // נגישות
        dom.prevPageBtn.setAttribute('aria-disabled', dom.prevPageBtn.disabled.toString());
        dom.nextPageBtn.setAttribute('aria-disabled', dom.nextPageBtn.disabled.toString());
    }

    /**
     * שינוי עמוד
     */
    function changePage(delta) {
        const totalPages = Math.ceil(state.filteredData.length / state.VISIBLE_ROWS) || 1;
        const newPage = state.currentPage + delta;
        
        state.currentPage = Math.max(0, Math.min(totalPages - 1, newPage));
        
        renderData();
        updatePagination();
        
        // הודעה לקוראי מסך
        if (dom.pageInfo) {
            dom.pageInfo.setAttribute('aria-live', 'polite');
        }
    }

    // --- פונקציות סטטיסטיקות ---

    /**
     * עדכון סטטיסטיקות
     */
    function updateStats() {
        let totalCombatants = 0;
        let totalCasualties = 0;
        let familyCasualties = 0;
        let highRanking = 0;
        
        state.filteredData.forEach(record => {
            // ספירת לוחמים
            const combatantIds = record.combatant_id || '';
            totalCombatants += countCombatants(combatantIds);
            
            // ספירת קורבנות
            const casualtyCount = parseInt(record.casualties_count) || 0;
            totalCasualties += casualtyCount;
            
            // ספירת בני משפחה
            const familyInfo = record.family_casualties_info || '';
            if (familyInfo.trim() && familyInfo.trim() !== '-') {
                familyCasualties += casualtyCount;
            }
            
            // ספירת בכירים
            if (isHighRankingRole(record.rank_role)) {
                highRanking += 1;
            }
        });
        
        // עדכון הצגה
        animateNumber(dom.totalCombatants, totalCombatants);
        animateNumber(dom.totalCasualties, totalCasualties);
        animateNumber(dom.familyCasualties, familyCasualties);
        animateNumber(dom.highRanking, highRanking);
    }

    /**
     * ספירת לוחמים מ-ID
     */
    function countCombatants(combatantIds) {
        if (!combatantIds || combatantIds.trim() === '-') return 0;
        
        try {
            // טיפול בטווחים ורשימות
            if (combatantIds.includes(',') && combatantIds.includes('-')) {
                return combatantIds.split(',').reduce((acc, part) => {
                    part = part.trim();
                    if (part.includes('-')) {
                        const [start, end] = part.split('-').map(n => parseInt(n.trim()));
                        if (!isNaN(start) && !isNaN(end)) {
                            return acc + (end - start + 1);
                        }
                    }
                    return acc + 1;
                }, 0);
            } else if (combatantIds.includes('-')) {
                const [start, end] = combatantIds.split('-').map(n => parseInt(n.trim()));
                if (!isNaN(start) && !isNaN(end)) {
                    return end - start + 1;
                }
                return 1;
            } else if (combatantIds.includes(',')) {
                return combatantIds.split(',').length;
            } else {
                return 1;
            }
        } catch (error) {
            console.warn('Error counting combatants:', error);
            return 1;
        }
    }

    /**
     * אנימציית מספרים
     */
    function animateNumber(element, targetValue) {
        if (!element) return;
        
        const currentValue = parseInt(element.textContent) || 0;
        const duration = 1000; // 1 שניה
        const steps = 30;
        const increment = (targetValue - currentValue) / steps;
        let current = currentValue;
        let step = 0;
        
        const timer = setInterval(() => {
            step++;
            current += increment;
            
            if (step >= steps) {
                element.textContent = targetValue.toLocaleString();
                clearInterval(timer);
            } else {
                element.textContent = Math.round(current).toLocaleString();
            }
        }, duration / steps);
    }

    // --- פונקציות עדכון שפה וטקסט ---

    /**
     * עדכון טקסטים לפי שפה
     */
    function updateTextByLang() {
        // כפתור שפה
        if (dom.langBtn) {
            dom.langBtn.innerHTML = `
                <span aria-hidden="true">${state.lang === 'he' ? 'English' : 'עברית'}</span>
            `;
            dom.langBtn.setAttribute('aria-pressed', 'false');
        }
        
        // כותרות אתר
        setTextContent('siteTitle', labels.site_title[state.lang]);
        setTextContent('siteSub', labels.site_sub[state.lang]);
        
        // placeholder חיפוש
        setAttribute('searchBox', 'placeholder', labels.search_placeholder[state.lang]);
        
        // כפתור החלפת תצוגה
        if (dom.viewToggleBtn) {
            const icon = state.isCardView ? 'fas fa-table' : 'fas fa-th-list';
            const label = state.isCardView ? 
                labels.toggle_view_table[state.lang] : 
                labels.toggle_view_card[state.lang];
            dom.viewToggleBtn.innerHTML = `<i class="${icon}" aria-hidden="true"></i> <span>${label}</span>`;
            dom.viewToggleBtn.setAttribute('aria-pressed', state.isCardView.toString());
        }
        
        // כפתורי פעולות
        setButtonHTML('resetBtn', 'fas fa-refresh', labels.reset_filters[state.lang]);
        setButtonHTML('exportBtn', 'fas fa-download', labels.export_csv[state.lang]);
        
        // תוכן לשוני
        toggleLanguageElements('dataCollectionHebrew', 'dataCollectionEnglish');
        
        // תוויות סטטיסטיקות
        updateStatsLabels();
        
        // תוויות פילטרים
        updateFilterLabels();
        
        // עדכון select options
        updateSelectOptions();
        
        // כפתורי פגינציה
        updatePaginationButtons();
        
        // עדכון מונה תוצאות
        updateResultsCounter();
        
        // כפתור פילטרים נייד
        updateMobileFiltersButton();
    }

    /**
     * עדכון תוויות סטטיסטיקות
     */
    function updateStatsLabels() {
        const statsMap = {
            totalCombatants: labels.total_combatants[state.lang],
            totalCasualties: labels.total_casualties[state.lang],
            familyCasualties: labels.family_members[state.lang],
            highRanking: labels.high_ranking[state.lang]
        };
        
        Object.entries(statsMap).forEach(([id, label]) => {
            const element = document.getElementById(id);
            if (element && element.nextElementSibling) {
                element.nextElementSibling.textContent = label;
            }
        });
    }

    /**
     * עדכון תוויות פילטרים
     */
    function updateFilterLabels() {
        const filterConfigs = [
            { selector: '.filter-group:nth-child(1) label', key: 'location' },
            { selector: '.filter-group:nth-child(2) label', key: 'organization' },
            { selector: '.filter-group:nth-child(3) label', key: 'rank_role' },
            { selector: '.filter-group:nth-child(4) label', text: labels.search_placeholder[state.lang].split(' ')[0].replace('🔍', '').trim() + ':' }
        ];
        
        filterConfigs.forEach(({ selector, key, text }) => {
            const element = document.querySelector(selector);
            if (element) {
                element.textContent = text || (labels[key] ? labels[key][state.lang] + ':' : '');
            }
        });
    }

    /**
     * עדכון אפשרויות select
     */
    function updateSelectOptions() {
        const selectIds = ['locationFilter', 'orgFilter', 'rankFilter'];
        const allText = state.lang === 'he' ? 'הכל' : 'All';
        
        selectIds.forEach(id => {
            const select = document.getElementById(id);
            if (select && select.options.length > 0) {
                select.options[0].textContent = allText;
            }
        });
    }

    /**
     * עדכון כפתורי פגינציה
     */
    function updatePaginationButtons() {
        if (dom.prevPageBtn) {
            const prevIcon = state.lang === 'he' ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
            dom.prevPageBtn.innerHTML = `
                <i class="${prevIcon}" aria-hidden="true"></i>
                <span>${labels.previous_page[state.lang]}</span>
            `;
        }
        
        if (dom.nextPageBtn) {
            const nextIcon = state.lang === 'he' ? 'fas fa-chevron-left' : 'fas fa-chevron-right';
            dom.nextPageBtn.innerHTML = `
                <span>${labels.next_page[state.lang]}</span>
                <i class="${nextIcon}" aria-hidden="true"></i>
            `;
        }
    }

    /**
     * עדכון מונה תוצאות
     */
    function updateResultsCounter() {
        if (!dom.resultsCounter) return;
        
        const count = state.filteredData.length;
        
        if (count === 0) {
            dom.resultsCounter.classList.add('hidden');
            return;
        }
        
        dom.resultsCounter.classList.remove('hidden');
        
        const message = count === 1 ? 
            labels.result_found[state.lang] : 
            labels.results_found[state.lang].replace('{count}', count.toLocaleString());
        
        dom.resultsCounter.textContent = message;
        dom.resultsCounter.setAttribute('aria-live', 'polite');
    }

    // --- פונקציות עזר לעדכון DOM ---

    function setTextContent(id, text) {
        const element = document.getElementById(id);
        if (element) element.textContent = text;
    }

    function setButtonHTML(id, iconClass, labelText) {
        const element = document.getElementById(id);
        if (element) {
            element.innerHTML = `<i class="${iconClass}" aria-hidden="true"></i> <span>${labelText}</span>`;
        }
    }

    function setAttribute(id, attr, value) {
        const element = document.getElementById(id);
        if (element) element.setAttribute(attr, value);
    }

    function toggleLanguageElements(hebrewId, englishId) {
        const hebrewEl = document.getElementById(hebrewId);
        const englishEl = document.getElementById(englishId);
        
        if (hebrewEl && englishEl) {
            const isHebrew = state.lang === 'he';
            hebrewEl.classList.toggle('hidden', !isHebrew);
            englishEl.classList.toggle('hidden', isHebrew);
        }
    }

    // --- פונקציות ייצוא ---

    /**
     * ייצוא ל-CSV
     */
    function exportToCSV() {
        if (!state.filteredData.length) {
            showToast(labels.export_no_data[state.lang], 'error');
            return;
        }
        
        try {
            // יצירת כותרות
            const headers = dataFieldKeys
                .map(key => `"${labels[key][state.lang].replace(/"/g, '""')}"`)
                .join(',') + '\n';
            
            // יצירת שורות נתונים
            let csvContent = headers;
            state.filteredData.forEach(record => {
                const row = dataFieldKeys
                    .map(key => {
                        const value = String(record[key] || '').replace(/"/g, '""');
                        return `"${value}"`;
                    })
                    .join(',') + '\n';
                csvContent += row;
            });
            
            // יצירת קובץ והורדה
            const blob = new Blob(['\ufeff' + csvContent], { 
                type: 'text/csv;charset=utf-8;' 
            });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `combatants_data_${new Date().toISOString().split('T')[0]}.csv`;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // ניקוי URL
            setTimeout(() => URL.revokeObjectURL(link.href), 1000);
            
            showToast(labels.export_success[state.lang], 'success');
            
        } catch (error) {
            console.error('Export error:', error);
            showToast(labels.error_loading_data[state.lang] + error.message, 'error');
        }
    }

    // --- פונקציות איפוס ---

    /**
     * איפוס פילטרים
     */
    function resetFilters() {
        // איפוס DOM
        if (dom.locationFilter) dom.locationFilter.value = '';
        if (dom.orgFilter) dom.orgFilter.value = '';
        if (dom.rankFilter) dom.rankFilter.value = '';
        if (dom.searchBox) dom.searchBox.value = '';
        
        // איפוס מצב
        state.filters = { location: '', org: '', rank: '', search: '' };
        state.sort.column = null;
        state.sort.direction = 'asc';
        state.currentPage = 0;
        
        // איפוס נתונים
        filterData();
        applySortAndRender();
        
        showToast(labels.filter_reset_success[state.lang], 'success');
        
        // מיקוד בחיפוש
        if (dom.searchBox) {
            dom.searchBox.focus();
        }
    }

    // --- פונקציות שמירה וטעינה ---

    /**
     * שמירת העדפות משתמש
     */
    function saveUserPreferences() {
        try {
            const preferences = {
                language: state.lang,
                viewMode: state.isCardView,
                filters: state.filters,
                sort: state.sort,
                timestamp: Date.now()
            };
            
            sessionStorage.setItem('userPrefs', JSON.stringify(preferences));
            
        } catch (error) {
            console.warn('Could not save user preferences:', error);
        }
    }

    /**
     * טעינת העדפות משתמש
     */
    function loadUserPreferences() {
        try {
            const stored = sessionStorage.getItem('userPrefs');
            if (!stored) return;
            
            const preferences = JSON.parse(stored);
            
            // בדיקת תוקף (24 שעות)
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours
            if (preferences.timestamp && Date.now() - preferences.timestamp > maxAge) {
                sessionStorage.removeItem('userPrefs');
                return;
            }
            
            // שחזור העדפות
            if (preferences.language) {
                state.lang = preferences.language;
                updateDocumentLanguage();
            }
            
            if (typeof preferences.viewMode === 'boolean') {
                state.isCardView = preferences.viewMode;
            }
            
            if (preferences.filters) {
                state.filters = { ...state.filters, ...preferences.filters };
                
                // עדכון DOM
                if (dom.locationFilter) dom.locationFilter.value = state.filters.location || '';
                if (dom.orgFilter) dom.orgFilter.value = state.filters.org || '';
                if (dom.rankFilter) dom.rankFilter.value = state.filters.rank || '';
                if (dom.searchBox) dom.searchBox.value = state.filters.search || '';
            }
            
            if (preferences.sort) {
                state.sort = { ...state.sort, ...preferences.sort };
            }
            
        } catch (error) {
            console.warn('Could not load user preferences:', error);
            sessionStorage.removeItem('userPrefs');
        }
    }

    /**
     * עדכון שפת המסמך
     */
    function updateDocumentLanguage() {
        document.documentElement.lang = state.lang;
        document.documentElement.dir = state.lang === 'he' ? 'rtl' : 'ltr';
        document.body.style.direction = state.lang === 'he' ? 'rtl' : 'ltr';
        
        // עדכון collator
        collator = new Intl.Collator(state.lang, { 
            numeric: true, 
            sensitivity: 'base',
            ignorePunctuation: true 
        });
    }

    // --- פונקציות back to top ---

    /**
     * אתחול כפתור חזרה למעלה
     */
    function initializeBackToTop() {
        if (!dom.backToTop) return;
        
        const toggleVisibility = () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            dom.backToTop.classList.toggle('visible', scrollTop > 300);
        };
        
        const scrollToTop = () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        };
        
        // מאזיני אירועים
        window.addEventListener('scroll', debounce(toggleVisibility, 100));
        dom.backToTop.addEventListener('click', scrollToTop);
        
        // נגישות מקלדת
        dom.backToTop.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                scrollToTop();
            }
        });
        
        // בדיקה ראשונית
        toggleVisibility();
    }

    // --- אתחול מאזיני אירועים ---

    /**
     * אתחול כל מאזיני האירועים
     */
    function initializeEventListeners() {
        // כפתור החלפת שפה
        if (dom.langBtn) {
            dom.langBtn.addEventListener('click', () => {
                state.lang = state.lang === 'he' ? 'en' : 'he';
                updateDocumentLanguage();
                updateTextByLang();
                applySortAndRender();
                
                // הודעה לקוראי מסך
                showToast(
                    state.lang === 'he' ? 'השפה שונתה לעברית' : 'Language changed to English',
                    'info',
                    2000
                );
            });
        }

        // פילטרים
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

        // חיפוש עם debounce
        if (dom.searchBox) {
            dom.searchBox.addEventListener('input', debouncedFilter);
            
            // ניקוי עם Escape
            dom.searchBox.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    dom.searchBox.value = '';
                    state.filters.search = '';
                    filterData();
                    applySortAndRender();
                }
            });
        }

        // פגינציה
        if (dom.prevPageBtn) {
            dom.prevPageBtn.addEventListener('click', () => changePage(-1));
        }

        if (dom.nextPageBtn) {
            dom.nextPageBtn.addEventListener('click', () => changePage(1));
        }

        // החלפת תצוגה
        if (dom.viewToggleBtn) {
            dom.viewToggleBtn.addEventListener('click', () => {
                state.isCardView = !state.isCardView;
                document.body.classList.toggle('table-view', !state.isCardView);
                applySortAndRender();
                
                // הודעה לקוראי מסך
                const viewType = state.isCardView ? 'כרטיסים' : 'טבלה';
                showToast(`עבר לתצוגת ${viewType}`, 'info', 2000);
            });
        }

        // כפתורי פעולות
        if (dom.resetBtn) {
            dom.resetBtn.addEventListener('click', resetFilters);
        }

        if (dom.exportBtn) {
            dom.exportBtn.addEventListener('click', exportToCSV);
        }

        // ניווט מקלדת למסמך
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + F - מיקוד בחיפוש
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                if (dom.searchBox) {
                    dom.searchBox.focus();
                    dom.searchBox.select();
                }
            }
            
            // Ctrl/Cmd + R - איפוס פילטרים
            if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
                e.preventDefault();
                resetFilters();
            }
            
            // Ctrl/Cmd + E - ייצוא
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                exportToCSV();
            }
        });

        // שמירת העדפות בשינוי פילטרים
        ['locationFilter', 'orgFilter', 'rankFilter'].forEach(id => {
            const element = dom[id];
            if (element) {
                element.addEventListener('change', debounce(saveUserPreferences, 500));
            }
        });

        // התאמה לשינוי גודל מסך
        window.addEventListener('resize', debounce(() => {
            const newCardView = window.innerWidth <= 768;
            if (newCardView !== state.isCardView) {
                state.isCardView = newCardView;
                applySortAndRender();
            }
        }, 250));

        // Visibility API - השהיית פעילויות כשהמסמך לא פעיל
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // שמירת העדפות כשהמסמך נעלם
                saveUserPreferences();
            }
        });
    }

    // --- אתחול מצב responsive ---

    /**
     * אתחול התאמות responsive
     */
    function initializeResponsive() {
        // בדיקת תמיכה במדיה קוורי
        const mediaQuery = window.matchMedia('(max-width: 768px)');
        
        const handleMediaChange = (e) => {
            const shouldBeCardView = e.matches;
            if (shouldBeCardView !== state.isCardView) {
                state.isCardView = shouldBeCardView;
                document.body.classList.toggle('table-view', !state.isCardView);
                applySortAndRender();
            }
        };
        
        // מאזין לשינויים
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleMediaChange);
        } else {
            // תמיכה בדפדפנים ישנים
            mediaQuery.addListener(handleMediaChange);
        }
        
        // בדיקה ראשונית
        handleMediaChange(mediaQuery);
    }

    // --- פונקציות אתחול מערכת ---

    /**
     * אתחול המערכת
     */
    async function initialize() {
        try {
            console.log('Initializing application...');
            
            // טעינת העדפות
            loadUserPreferences();
            
            // עדכון מצב מסמך
            document.body.classList.toggle('table-view', !state.isCardView);
            updateDocumentLanguage();
            
            // אתחול רכיבים
            initializeEventListeners();
            initializeMobileFilters();
            initializeBackToTop();
            initializeResponsive();
            
            // עדכון ראשוני של טקסטים
            updateTextByLang();
            
            // טעינת נתונים
            await loadData();
            
            console.log('Application initialized successfully');
            
        } catch (error) {
            console.error('Initialization failed:', error);
            showErrorMessage(error, 'Application initialization');
            
            // נסה לטעון נתונים משובצים כגיבוי
            state.originalData = embeddedCombatantData;
            state.filteredData = [...state.originalData];
            
            populateFilters();
            applySortAndRender();
            hideLoadingState();
        }
    }

    // --- גישה גלובלית לפונקציות (למטרות debugging) ---
    
    if (typeof window !== 'undefined') {
        window.appDebug = {
            state,
            dom,
            labels,
            resetFilters,
            exportToCSV,
            loadData,
            showToast
        };
    }

    // --- אתחול כאשר המסמך מוכן ---

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        // המסמך כבר נטען
        initialize();
    }

    // --- Cleanup לפני סגירת חלון ---
    
    window.addEventListener('beforeunload', () => {
        saveUserPreferences();
    });

    // --- Service Worker Registration (אופציונלי) ---
    
    if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
        window.addEventListener('load', async () => {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('ServiceWorker registered successfully');
                
                // בדיקת עדכונים
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            showToast(
                                state.lang === 'he' ? 
                                'גרסה חדשה זמינה! רענן העמוד.' : 
                                'New version available! Please refresh the page.',
                                'info',
                                5000
                            );
                        }
                    });
                });
                
            } catch (error) {
                console.log('ServiceWorker registration failed:', error);
            }
        });
    }

    // --- Error Boundary גלובלי ---
    
    window.addEventListener('error', (event) => {
        console.error('Global error:', event.error);
        
        if (!state.isLoading) {
            showToast(
                state.lang === 'he' ? 
                'אירעה שגיאה לא צפויה' : 
                'An unexpected error occurred',
                'error',
                3000
            );
        }
    });

    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        
        if (!state.isLoading) {
            showToast(
                state.lang === 'he' ? 
                'שגיאה בטעינת נתונים' : 
                'Data loading error',
                'error',
                3000
            );
        }
    });

})();

// --- CSS Classes for dynamic styling ---
const dynamicStyles = `
<style id="dynamic-app-styles">
/* Loading states */
.loading {
    position: relative;
    pointer-events: none;
    opacity: 0.7;
}

.loading::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.8);
    z-index: 99;
}

/* Error banner */
.error-banner {
    position: relative;
    margin-bottom: 1rem;
    padding: 1rem;
    background: #fee;
    border: 1px solid #fcc;
    border-radius: 0.5rem;
    color: #a00;
}

.error-banner button {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: none;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    color: inherit;
    opacity: 0.7;
}

.error-banner button:hover {
    opacity: 1;
}

/* High ranking indicators */
.high-ranking {
    border-left: 4px solid #f59e0b !important;
}

.high-ranking::before {
    content: '⭐';
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    font-size: 1.2rem;
    color: #f59e0b;
}

/* Focus indicators */
.card:focus-visible,
tr:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
}

// --- CSS Classes for dynamic styling ---
const dynamicStyles = `
<style id="dynamic-app-styles">
/* Loading states */
.loading {
    position: relative;
    pointer-events: none;
    opacity: 0.7;
}

.loading::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.8);
    z-index: 99;
}

/* Error banner */
.error-banner {
    position: relative;
    margin-bottom: 1rem;
    padding: 1rem;
    background: #fee;
    border: 1px solid #fcc;
    border-radius: 0.5rem;
    color: #a00;
}

.error-banner button {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: none;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    color: inherit;
    opacity: 0.7;
}

.error-banner button:hover {
    opacity: 1;
}

/* Focus indicators */
.card:focus-visible,
tr:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
}

/* Sort indicators */
.sort-indicator {
    margin-left: 0.5rem;
    font-size: 0.8em;
    opacity: 0.6;
}

th[aria-sort="ascending"] .sort-indicator,
th[aria-sort="descending"] .sort-indicator {
    opacity: 1;
    color: #3b82f6;
}

/* Animation classes */
.show {
    opacity: 1 !important;
    transform: translateY(0) !important;
}

/* Print styles */
@media print {
    .language-toggle,
    .mobile-filters-toggle,
    .filters-bar,
    .back-to-top,
    .toast-container,
    .loading-overlay,
    button {
        display: none !important;
    }
    
    .container {
        box-shadow: none !important;
        border: 1px solid #000 !important;
    }
    
    body {
        background: white !important;
    }
}
</style>
`;

// הוספת הסגנונות הדינמיים
if (typeof document !== 'undefined') {
    document.head.insertAdjacentHTML('beforeend', dynamicStyles);
}

// הוספת הסגנונות הדינמיים
if (typeof document !== 'undefined') {
    document.head.insertAdjacentHTML('beforeend', dynamicStyles);
}
