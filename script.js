let originalTableData = []; // Stores the raw data from CSV
let currentData = []; // Stores the currently filtered and sorted data for rendering and export
let allLocations = new Set();
let allOrganizations = new Set();
let allRanks = new Set();

// Initialize currentLang based on browser language or default to Hebrew
let currentLang = (navigator.language || navigator.userLanguage).startsWith('he') ? 'he' : 'en';
document.documentElement.lang = currentLang;
document.documentElement.dir = currentLang === 'he' ? 'rtl' : 'ltr';
// Set body direction directly to apply immediately
document.body.style.direction = currentLang === 'he' ? 'rtl' : 'ltr';

let isCardView = false; // Flag to track current view mode

let currentSortColumn = null; // Stores the index of the column currently sorted
let currentSortDirection = 'asc'; // Stores the current sort direction ('asc' or 'desc')

// Debounce timer for filtering
let renderDebounceTimer = null;

// Virtual scrolling/pagination settings
const VISIBLE_ROWS = 50; // Number of rows visible per page
let currentPage = 0; // Current page for pagination

// Define headers for data properties and their display labels in multiple languages
const dataFieldKeys = [
    'post_id', 'combatant_id', 'date', 'location', 'location_details',
    'name_english', 'name_arabic', 'nickname', 'description_online',
    'rank_role', 'organization', 'activity', 'family_casualties_info',
    'casualties_count', 'additional_combatants', 'notes'
];

// Translation labels for various UI elements
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
    search_placeholder: { he: "חפש שם, מיקום או תיאור...", en: "Search name, location or description..." },
    reset_filters: { he: "איפוס פילטרים", en: "Reset Filters" },
    export_csv: { he: "ייצא ל-CSV", en: "Export to CSV" },
    total_combatants: { he: "סה\"כ לוחמים", en: "Total Combatants" },
    total_casualties: { he: "סה\"כ קורבנות", en: "Total Casualties" },
    family_members: { he: "בני משפחה", en: "Family Members" },
    high_ranking: { he: "בכירים", en: "High Ranking" },
    loading_data: { he: "טוען נתונים...", en: "Loading data..." },
    no_matching_data: { he: "אין נתונים תואמים למסננים שנבחרו.", en: "No matching data for selected filters." },
    error_loading_data: { he: "שגיאה בטעינת הנתונים: ", en: "Error loading data: " },
    csv_file_error: { he: ". וודא שקובץ data.csv קיים ובפורמט תקין.", en: ". Ensure data.csv exists and is in a valid format." },
    previous_page: { he: "הקודם", en: "Previous" },
    next_page: { he: "הבא", en: "Next" },
    page_info: { he: "עמוד {current} מתוך {total}", en: "Page {current} of {total}" },
    error_http: { he: "שגיאת HTTP: ", en: "HTTP Error: " },
    error_empty_csv: { he: "קובץ CSV ריק", en: "Empty CSV file" },
    error_data_load_context: { he: "טעינת קובץ נתונים", en: "Data file loading" },
    error_no_source: { he: "לא ניתן לטעון נתונים מאף מקור", en: "Could not load data from any source" },
    export_success: { he: "הנתונים יוצאו בהצלחה ל-CSV!", en: "Data exported to CSV successfully!" },
    export_no_data: { he: "אין נתונים לייצוא.", en: "No data to export." },
    filter_reset_success: { he: "הפילטרים אופסו בהצלחה.", en: "Filters reset successfully." },
    results_found: { he: "נמצאו {count} תוצאות", en: "{count} results found" },
    result_found: { he: "נמצאה תוצאה אחת", en: "1 result found" }
};

// --- START: Embedded Data ---
// This data is used when the application is run locally (e.g., by opening index.html directly from your file system).
// It prevents CORS errors when no local server is available.
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
        "name_arabic": "عماد البابا \"אבו אשרף\"",
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
        "name_arabic": "יوسف סלים בכר",
        "nickname": "-",
        "description_online": "\"leader (al-Qa'id) and a heroic martyr (al-Batal)\"",
        "rank_role": "Leader",
        "organization": "-",
        "activity": "-",
        "family_casualties_info": "wife, daughter",
        "casualties_count": "1",
        "additional_combatants": "4",
        "notes": "5,Funeral with gunshots"
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
        "notes": "5,Funeral with gunshots"
    }
    // Add more data objects here as needed from your CSV
];
// --- END: Embedded Data ---


/**
 * Cleans a string to prevent XSS attacks by converting HTML entities.
 * @param {string} input - The string to sanitize.
 * @returns {string} The sanitized string.
 */
function sanitizeInput(input) {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}

/**
 * Highlights occurrences of a search term within a given text.
 * Sanitizes both text and term to prevent XSS.
 * @param {string} text - The original text content.
 * @param {string} term - The search term to highlight.
 * @returns {string} The text with the search term wrapped in <mark> tags.
 */
function highlight(text, term) {
    if (!term) return sanitizeInput(text);
    
    const sanitizedText = sanitizeInput(text);
    // Escape special characters in the term for use in RegExp
    const sanitizedTerm = sanitizeInput(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(${sanitizedTerm})`, 'gi');
    
    return sanitizedText.replace(re, '<mark>$1</mark>');
}

/**
 * Function to parse a CSV line, robustly handling quoted fields.
 * This function is used when loading data from an external CSV file.
 * @param {string} line - The single line of CSV text to parse.
 * @returns {Array<string>} An array of strings, where each string is a field from the CSV line.
 */
function parseCsvLine(line) {
    const result = [];
    let inQuote = false;
    let currentField = '';
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
            if (inQuote && nextChar === '"') { // Handle escaped double quotes ""
                currentField += '"';
                i++; // Skip the next quote
            } else { // Toggle inQuote state
                inQuote = !inQuote;
            }
        } else if (char === ',' && !inQuote) { // End of field if not in a quote
            result.push(currentField.trim());
            currentField = '';
        } else { // Add character to current field
            currentField += char;
        }
    }
    
    result.push(currentField.trim()); // Add the last field
    return result;
}

/**
 * Converts a raw CSV header string to a consistent, normalized key name.
 * This helps in reliably mapping CSV columns to JavaScript object properties.
 * For example, "מס' פוסט" might become "post_id".
 * This function is used when loading data from an external CSV file.
 * @param {string} header - The raw header string from the CSV.
 * @returns {string} The normalized key name.
 */
function normalizeHeader(header) {
    // Trim whitespace, convert to lowercase, and replace spaces with underscores.
    // Map specific Hebrew headers to English keys for consistency in JS.
    const normalized = header.trim().toLowerCase();
    switch (normalized) {
        case 'מס\' פוסט': return 'post_id';
        case 'מס\' לוחם': return 'combatant_id';
        case 'תאריך': return 'date';
        case 'מיקום': return 'location';
        case 'פירוט מיקום': return 'location_details';
        case 'שם באנגלית': return 'name_english';
        case 'שם בערבית': return 'name_arabic';
        case 'כינוי': return 'nickname';
        case 'תיאור ברשת': return 'description_online';
        case 'דרגה/תפקיד': return 'rank_role';
        case 'ארגון': return 'organization';
        case 'פעילות': return 'activity';
        case 'בני משפחה': return 'family_casualties_info';
        case 'מס\' קורבנות': return 'casualties_count';
        case 'לוחמים נוספים': return 'additional_combatants';
        case 'הערות': return 'notes';
        default: return normalized.replace(/ /g, '_').replace(/[^a-z0-9_]/g, ''); // Fallback for other headers
    }
}

/**
 * Shows the loading overlay with a given message and adds loading class to content area.
 * @param {string} message - The message to display in the loading overlay.
 */
function showLoadingState(message) {
    const overlay = document.getElementById('loadingOverlay');
    const contentArea = document.getElementById('contentArea');
    if (overlay) {
        overlay.querySelector('.loading-text').textContent = message; // Use .loading-text class
        overlay.classList.remove('hidden');
    }
    if (contentArea) {
        contentArea.classList.add('loading'); // Add loading class to content area
    }
}

/**
 * Hides the loading overlay and removes loading class from content area.
 */
function hideLoadingState() {
    const overlay = document.getElementById('loadingOverlay');
    const contentArea = document.getElementById('contentArea');
    if (overlay) {
        overlay.classList.add('hidden');
    }
    if (contentArea) {
        contentArea.classList.remove('loading'); // Remove loading class from content area
    }
}

/**
 * Displays a user-friendly error message in a dismissible banner.
 * @param {Error} error - The error object.
 * @param {string} context - The context where the error occurred.
 */
function showErrorMessage(error, context) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-banner';
    errorDiv.innerHTML = `
        <strong>${currentLang === 'he' ? 'שגיאה' : 'Error'}:</strong> ${sanitizeInput(error.message)}
        <br><small>${currentLang === 'he' ? 'הקשר' : 'Context'}: ${sanitizeInput(context)}</small>
        <button onclick="this.parentElement.remove()" aria-label="${currentLang === 'he' ? 'סגור הודעת שגיאה' : 'Close error message'}">✕</button>
    `;
    // Insert at the top of the body, before the main container
    document.body.insertBefore(errorDiv, document.querySelector('.container'));
}

/**
 * Shows a toast notification.
 * @param {string} message - The message to display.
 * @param {string} type - 'success' or 'error'.
 * @param {number} duration - How long the toast should be visible in ms.
 */
function showToast(message, type = 'success', duration = 3000) {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        console.error("Toast container not found!");
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    toastContainer.appendChild(toast);

    // Force reflow for animation
    void toast.offsetWidth;

    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove());
    }, duration);
}

/**
 * Loads CSV data from a specified URL.
 * This function is now specifically called when the application is detected to be running from a server.
 * @param {string} url - The URL of the CSV file.
 * @returns {Promise<Array<object>>} A promise that resolves with the parsed data.
 */
async function loadCSVData(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`${labels.error_http[currentLang]}${response.status}`);
    }
    const csvText = await response.text();
    if (!csvText.trim()) {
        throw new Error(labels.error_empty_csv[currentLang]);
    }
    
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length <= 1) {
        throw new Error(labels.error_empty_csv[currentLang]);
    }

    const rawHeaders = parseCsvLine(lines[0]);
    const headers = rawHeaders.map(header => normalizeHeader(header));

    const data = lines.slice(1).map(line => {
        const values = parseCsvLine(line);
        let row = {};
        headers.forEach((header, i) => {
            row[header] = values[i] ? values[i].trim() : '';
        });
        return row;
    });
    return data;
}

/**
 * Loads data dynamically based on the environment (local file system vs. web server).
 * If running locally (file:// protocol), it uses embedded data to avoid CORS issues.
 * If running from a web server (http:// or https:// protocol), it attempts to fetch data.csv.
 */
async function loadData() {
    console.log('--- Starting loadData function ---');
    showLoadingState(labels.loading_data[currentLang]);

    try {
        // Determine if the application is running locally or from a server
        const isLocal = window.location.protocol === 'file:';
        console.log(`Current protocol: ${window.location.protocol}. Is local file access: ${isLocal}`);

        if (isLocal) {
            // Load data from embedded JavaScript array for local execution
            originalTableData = embeddedCombatantData;
            console.log('נתונים נטענו ממקור מקומי (embeddedCombatantData) כדי למנוע שגיאות CORS.');
            console.log('Data loaded from local source (embeddedCombatantData) to prevent CORS errors.');
        } else {
            // Attempt to load data from data.csv when running from a server
            const csvUrl = 'data.csv'; // Assuming data.csv is in the same directory as index.html
            console.log(`מנסה לטעון נתונים מקובץ CSV חיצוני: ${csvUrl}`);
            console.log(`Attempting to load data from external CSV: ${csvUrl}`);
            originalTableData = await loadCSVData(csvUrl);
            console.log('נתונים נטענו מקובץ data.csv (מקור מרוחק).');
            console.log('Data loaded from data.csv (remote source).');
        }
        
        console.log('originalTableData after loading:', originalTableData);

        // Clear existing filter sets before populating
        allLocations.clear();
        allOrganizations.clear();
        allRanks.clear();

        originalTableData.forEach(rowData => {
            if (rowData.location) allLocations.add(rowData.location);
            if (rowData.organization) allOrganizations.add(rowData.organization);
            if (rowData.rank_role) allRanks.add(rowData.rank_role);
        });

        populateFilters();
        filterTable(); // Initial display of data
        console.log('--- loadData function finished successfully ---');
    } catch (error) {
        console.error('Error loading or parsing data:', error);
        // Add specific error message for CSV fetch failure on remote
        const contextError = labels.error_data_load_context[currentLang] + (window.location.protocol !== 'file:' ? labels.csv_file_error[currentLang] : '');
        showErrorMessage(error, contextError);
        showToast(labels.error_loading_data[currentLang] + error.message, 'error', 5000);
        currentData = [];
        renderData(currentData);
        console.log('--- loadData function finished with error ---');
    } finally {
        hideLoadingState();
    }
}

/**
 * Populates the select filter options based on unique values found in the data.
 */
function populateFilters() {
    const addOptions = (selectId, dataSet) => {
        const selectElement = document.getElementById(selectId);
        // Preserve current selection if it exists and is still valid
        const currentSelection = selectElement.value;
        selectElement.innerHTML = `<option value="">${currentLang === 'he' ? 'הכל' : 'All'}</option>`; // Keep "All" option
        
        Array.from(dataSet).sort().forEach(item => {
            if (item) { // Ensure item is not empty
                const option = document.createElement('option');
                option.value = item;
                option.textContent = item;
                selectElement.appendChild(option);
            }
        });
        // Restore selection if possible
        if (currentSelection && Array.from(dataSet).includes(currentSelection)) {
            selectElement.value = currentSelection;
        } else {
            selectElement.value = ''; // Reset if old selection is no longer valid
        }
    };

    addOptions('locationFilter', allLocations);
    addOptions('orgFilter', allOrganizations);
    addOptions('rankFilter', allRanks);
    console.log('Filters populated.');
    saveUserPreferences(); // Save preferences after filters are updated
}

/**
 * Filters the table rows based on selected filter criteria and search box input.
 * Updates the displayed table and recalculates statistics.
 */
function filterTable() {
    console.log('--- Starting filterTable function ---');
    const locationFilter = document.getElementById('locationFilter').value.toLowerCase();
    const orgFilter = document.getElementById('orgFilter').value.toLowerCase();
    const rankFilter = document.getElementById('rankFilter').value.toLowerCase();
    const searchBox = document.getElementById('searchBox').value.toLowerCase();
    
    let visibleRowsData = [];
    originalTableData.forEach(rowData => {
        const location = rowData.location ? rowData.location.toLowerCase() : '';
        const organization = rowData.organization ? rowData.organization.toLowerCase() : '';
        const rank = rowData.rank_role ? rowData.rank_role.toLowerCase() : '';
        const nameEng = rowData.name_english ? rowData.name_english.toLowerCase() : '';
        const nameAr = rowData.name_arabic ? rowData.name_arabic.toLowerCase() : '';
        const description = rowData.description_online ? rowData.description_online.toLowerCase() : '';

        const locationMatch = !locationFilter || location.includes(locationFilter);
        const orgMatch = !orgFilter || organization.includes(orgFilter);
        const rankMatch = !rankFilter || rank.includes(rankFilter);
        const searchMatch = !searchBox || 
                            nameEng.includes(searchBox) || 
                            nameAr.includes(searchBox) || 
                            location.includes(searchBox) ||
                            organization.includes(searchBox) ||
                            description.includes(searchBox);
        
        if (locationMatch && orgMatch && rankMatch && searchMatch) {
            visibleRowsData.push(rowData);
        }
    });

    currentData = visibleRowsData; // Store filtered data
    currentPage = 0; // Reset to first page on new filter
    addSortingToTable(); // Apply sorting logic to headers
    sortTable(currentSortColumn, currentSortDirection, false); // Re-sort based on current sort state
    renderData(currentData); // Render the data (either table or cards)
    updateTextByLang(); // Update translated texts after rendering
    console.log(`Displayed ${currentData.length} rows after filtering.`);
    updateStats(currentData);
    saveUserPreferences(); // Save preferences after filtering
    console.log('--- filterTable function finished ---');
}

// Debounced version of filterTable for search input
function debouncedFilterTable() {
    clearTimeout(renderDebounceTimer);
    renderDebounceTimer = setTimeout(filterTable, 150); // 150ms debounce
}

/**
 * Toggles language between Hebrew and English.
 */
function toggleLanguage() {
    currentLang = currentLang === 'he' ? 'en' : 'he';
    document.documentElement.lang = currentLang;
    document.documentElement.dir = currentLang === 'he' ? 'rtl' : 'ltr';
    document.body.style.direction = currentLang === 'he' ? 'rtl' : 'ltr';
    updateTextByLang();
    // Re-render data to apply new language to dynamic content like table headers and card labels
    renderData(currentData); 
    saveUserPreferences(); // Save language preference
}


/**
 * Adds sorting functionality to table headers.
 * Only applies if in table view.
 */
function addSortingToTable() {
    // Remove existing event listeners to prevent duplicates
    const oldHeaders = document.querySelectorAll('#contentArea th');
    oldHeaders.forEach(header => {
        const newHeader = header.cloneNode(true);
        header.parentNode.replaceChild(newHeader, header);
    });

    const headers = document.querySelectorAll('#contentArea th');
    headers.forEach((header, index) => {
        header.style.cursor = 'pointer';
        header.addEventListener('click', () => sortTable(index));

        // Add sort indicator if it doesn't exist
        if (!header.querySelector('.sort-indicator')) {
            const span = document.createElement('span');
            span.className = 'sort-indicator';
            span.innerHTML = '↕'; // Default indicator
            header.appendChild(span);
        }
        
        // Update indicator based on current sort state
        if (currentSortColumn === index) {
            headers.forEach(h => h.classList.remove('sort-asc', 'sort-desc')); // Clear all others
            header.classList.remove('sort-asc', 'sort-desc'); // Clear previous for current
            if (currentSortDirection === 'asc') {
                header.classList.add('sort-asc');
                header.querySelector('.sort-indicator').innerHTML = '↑';
            } else {
                header.classList.add('sort-desc');
                header.querySelector('.sort-indicator').innerHTML = '↓';
            }
        } else {
            // Reset others to default
            const otherHeaderSpan = header.querySelector('.sort-indicator');
            if (otherHeaderSpan) otherHeaderSpan.innerHTML = '↕';
            header.classList.remove('sort-asc', 'sort-desc');
        }
    });
}

/**
 * Sorts the currentData array based on the given column index.
 * Toggles sort direction if the same column is clicked again.
 * @param {number} columnIndex - The index of the column to sort by.
 * @param {string} [direction] - Optional. 'asc' or 'desc'. If not provided, it toggles.
 * @param {boolean} [shouldRender=true] - Optional. If false, rendering is skipped (e.g., when called from filterTable).
 */
function sortTable(columnIndex, direction = null, shouldRender = true) {
    if (columnIndex === null) return; // Do not sort if no column selected

    const key = dataFieldKeys[columnIndex];
    if (!key) return; // Invalid column index

    if (currentSortColumn === columnIndex && direction === null) {
        currentSortDirection = (currentSortDirection === 'asc' ? 'desc' : 'asc');
    } else if (direction !== null) {
        currentSortDirection = direction;
    } else {
        currentSortColumn = columnIndex;
        currentSortDirection = 'asc';
    }

    currentData.sort((a, b) => {
        const aVal = String(a[key] || '').toLowerCase();
        const bVal = String(b[key] || '').toLowerCase();

        let comparison = aVal.localeCompare(bVal, currentLang);
        return currentSortDirection === 'desc' ? -comparison : comparison;
    });

    if (shouldRender) {
        currentPage = 0; // Reset to first page after sorting
        renderData(currentData);
        addSortingToTable(); // Re-apply sorting indicators
    }
}


/**
 * Updates all dynamic text elements in the UI based on the current language.
 */
function updateTextByLang() {
    document.getElementById('langBtn').textContent = currentLang === 'he' ? 'English' : 'עברית';
    document.getElementById('siteTitle').textContent = labels.site_title[currentLang];
    document.getElementById('siteSub').textContent = labels.site_sub[currentLang];

    document.getElementById('searchBox')?.setAttribute('placeholder', labels.search_placeholder[currentLang]);
    
    const viewToggleBtn = document.getElementById('viewToggleBtn');
    if (viewToggleBtn) {
        // Update button text and icon based on current view mode
        const iconClass = isCardView ? 'fas fa-table' : 'fas fa-th-list';
        viewToggleBtn.innerHTML = `<i class="${iconClass}"></i> ${isCardView ? labels.toggle_view_table[currentLang] : labels.toggle_view_card[currentLang]}`;
    }
    
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) resetBtn.innerHTML = `<i class="fas fa-refresh"></i> ${labels.reset_filters[currentLang]}`;

    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) exportBtn.innerHTML = `<i class="fas fa-download"></i> ${labels.export_csv[currentLang]}`;

    // Update stats labels
    if (document.querySelector('#totalCombatants')) document.querySelector('#totalCombatants').nextElementSibling.textContent = labels.total_combatants[currentLang];
    if (document.querySelector('#totalCasualties')) document.querySelector('#totalCasualties').nextElementSibling.textContent = labels.total_casualties[currentLang];
    if (document.querySelector('#familyCasualties')) document.querySelector('#familyCasualties').nextElementSibling.textContent = labels.family_members[currentLang];
    if (document.querySelector('#highRanking')) document.querySelector('#highRanking').nextElementSibling.textContent = labels.high_ranking[currentLang];

    // Update filter labels
    if (document.querySelector('.filters-bar .filter-group:nth-child(1) label')) document.querySelector('.filters-bar .filter-group:nth-child(1) label').textContent = labels.location[currentLang] + ':';
    if (document.querySelector('.filters-bar .filter-group:nth-child(2) label')) document.querySelector('.filters-bar .filter-group:nth-child(2) label').textContent = labels.organization[currentLang] + ':';
    if (document.querySelector('.filters-bar .filter-group:nth-child(3) label')) document.querySelector('.filters-bar .filter-group:nth-child(3) label').textContent = labels.rank_role[currentLang] + ':';
    if (document.querySelector('.filters-bar .filter-group:nth-child(4) label')) document.querySelector('.filters-bar .filter-group:nth-child(4) label').textContent = labels.search_placeholder[currentLang].split(' ')[0] + ':'; // "חיפוש:" / "Search:"

    // Update filter options (e.g., "All" option)
    const filterSelects = ['locationFilter', 'orgFilter', 'rankFilter'];
    filterSelects.forEach(selectId => {
        const selectElement = document.getElementById(selectId);
        if (selectElement && selectElement.options.length > 0) {
            selectElement.options[0].textContent = currentLang === 'he' ? 'הכל' : 'All';
        }
    });
    
    // Update pagination buttons if they exist
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const pageInfoSpan = document.getElementById('pageInfo');
    if (prevBtn) prevBtn.textContent = labels.previous_page[currentLang];
    if (nextBtn) nextBtn.textContent = labels.next_page[currentLang];
    if (pageInfoSpan) {
         const totalPages = Math.ceil(currentData.length / VISIBLE_ROWS);
         pageInfoSpan.textContent = labels.page_info[currentLang]
            .replace('{current}', currentPage + 1)
            .replace('{total}', totalPages === 0 ? 1 : totalPages); // Handle 0 total pages
    }

    // Update results counter text
    const resultsCounter = document.getElementById('resultsCounter');
    if (resultsCounter) {
        if (currentData.length === 1) {
            resultsCounter.textContent = labels.result_found[currentLang];
        } else {
            resultsCounter.textContent = labels.results_found[currentLang].replace('{count}', currentData.length);
        }
        if (currentData.length > 0) {
            resultsCounter.classList.remove('hidden');
        } else {
            resultsCounter.classList.add('hidden');
        }
    }
}

/**
 * Toggles the view mode between table and card view.
 * Updates the global `isCardView` flag and button text, then re-renders data.
 */
function toggleViewMode() {
    isCardView = !isCardView;
    const btn = document.getElementById('viewToggleBtn');
    const iconClass = isCardView ? 'fas fa-table' : 'fas fa-th-list'; // Change icon based on new state
    btn.innerHTML = `<i class="${iconClass}"></i> ${isCardView ? labels.toggle_view_table[currentLang] : labels.toggle_view_card[currentLang]}`;

    if (isCardView) {
        document.body.classList.remove('table-view'); // Switch to card view (no table-view class)
    } else {
        document.body.classList.add('table-view'); // Switch to table view
    }
    currentPage = 0; // Reset to first page on view mode change
    renderData(currentData); // Re-render data based on new view mode
    saveUserPreferences(); // Save preferences after view mode change
}

/**
 * Renders the data either as a table or a grid of cards based on `isCardView`.
 * Implements basic pagination for table view.
 * @param {Array<object>} data - The array of data objects to render.
 */
function renderData(data) {
    const container = document.getElementById('contentArea');
    container.innerHTML = ''; // Clear existing content

    // Handle empty data
    if (data.length === 0) {
        container.innerHTML = `<p class="text-gray-500 font-bold text-center py-4">${labels.no_matching_data[currentLang]}</p>`;
        document.getElementById('resultsCounter').classList.add('hidden'); // Hide counter if no results
        return;
    }

    // Update results counter
    updateTextByLang(); // This will show the results counter

    const searchTerm = document.getElementById('searchBox')?.value.toLowerCase() || '';

    if (isCardView) {
        container.classList.remove('table-container'); // Remove table scrolling for card view
        const grid = document.createElement('div');
        grid.className = 'card-grid';

        data.forEach(row => {
            const card = document.createElement('div');
            card.className = 'card';

            // Apply rank-based styling to the card itself
           /* let rankClass = '';
            const lowerRank = row.rank_role ? row.rank_role.toLowerCase() : '';
            if (lowerRank.includes('leader') || lowerRank.includes('prominent')) {
                rankClass = 'high-ranking';
            } else if (lowerRank.includes('commander')) {
                rankClass = 'field-commander';
            } else if (lowerRank.includes('mujahid') || lowerRank.includes('fighter')) {
                rankClass = 'regular-mujahid';
            }
            if (rankClass) card.classList.add(rankClass);*/

            let orgClass = '';
            const org = row.organization ? row.organization.toLowerCase() : '';
            if (org.includes('hamas')) orgClass = 'org-hamas';
            else if (org.includes('dflp')) orgClass = 'org-dflp';
            else if (org.includes('mujahideen')) orgClass = 'org-mujahideen';
            else if (org.includes('fatah')) orgClass = 'org-fatah';
            
            // Build card content with highlighting and detailed info using labels for titles
            // Main title and subtitle
            // פונקציה שמחזירה HTML רק אם יש תוכן משמעותי
            function renderIfValid(content, className = '', tagName = 'div') {
                const value = content?.trim();
                if (!value || value === '-') return '';
                return `<${tagName} class="${className}">${highlight(value, searchTerm)}</${tagName}>`;
            }

            // בתוך הלולאה שדרכה בונים כל כרטיס:
            const metaLocation = row.location && row.location.trim() !== '-' ? `<span>📍 ${highlight(row.location, searchTerm)}</span>` : '';
            const metaDate = row.date && row.date.trim() !== '-' ? `<span>📅 ${highlight(row.date, searchTerm)}</span>` : '';

            card.innerHTML = `
                <h2>${highlight(row.name_english || '', searchTerm)} | ${highlight(row.name_arabic || '', searchTerm)}</h2>
                ${renderIfValid(row.description_online, 'sub')}
                <div class="meta">
                    ${metaLocation}
                    ${metaDate}
                </div>
                <div class="card-details"></div>
            `;

            const cardDetailsDiv = card.querySelector('.card-details');


            // Add all other fields dynamically, skipping empty/dash ones
            dataFieldKeys.forEach(key => {
                // Skip fields already rendered in h2, sub, meta
                if (['name_english', 'name_arabic', 'description_online', 'location', 'date', 'post_id'].includes(key)) {
                    return;
                }

                const value = row[key];
                // Only add if value is not empty or just a dash
                if (value && String(value).trim() !== '' && String(value).trim() !== '-') {
                    const p = document.createElement('p');
                    // Apply 'family' class if it's family_casualties_info
                    if (key === 'family_casualties_info') {
                        p.classList.add('family'); // Use 'family' class for specific styling
                    }
                    p.innerHTML = `<strong>${labels[key][currentLang]}:</strong> ${highlight(String(value), searchTerm)}`;
                    cardDetailsDiv.appendChild(p);
                }
            });

            grid.appendChild(card);
        });

        container.appendChild(grid);
    } else {
        // Render table view
        container.classList.add('table-container'); // Add table scrolling for table view

        const tableHTML = `
            <table class="w-full border-collapse text-sm">
                <thead>
                    <tr>
                        ${dataFieldKeys.map(key => `<th>${labels[key][currentLang]} <span class="sort-indicator">↕</span></th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                </tbody>
            </table>`;
        container.innerHTML = tableHTML;

        const tbody = container.querySelector('tbody');
        const startIndex = currentPage * VISIBLE_ROWS;
        const endIndex = startIndex + VISIBLE_ROWS;
        const visibleData = data.slice(startIndex, endIndex);

        visibleData.forEach(rowData => {
            let trClasses = [];
            const lowerRank = rowData.rank_role ? rowData.rank_role.toLowerCase() : '';
            if (lowerRank.includes('leader') || lowerRank.includes('prominent')) {
                trClasses.push('high-ranking');
            } else if (lowerRank.includes('commander')) {
                trClasses.push('field-commander');
            } else if (lowerRank.includes('mujahid') || lowerRank.includes('fighter')) {
                trClasses.push('regular-mujahid');
            }

            // Map rowData keys to dataFieldKeys order for table display
            const orderedCells = dataFieldKeys.map(key => rowData[key]);

            const tr = document.createElement('tr');
            if (trClasses.length > 0) tr.classList.add(...trClasses);

            const cellHTML = orderedCells.map((cellContent, index) => {
                let tdClasses = [];
                const currentKey = dataFieldKeys[index];

                if (currentKey === 'location') tdClasses.push('location');
                if (currentKey === 'name_english') tdClasses.push('name-col', 'english');
                if (currentKey === 'name_arabic') tdClasses.push('name-col', 'arabic');
                if (currentKey === 'description_online') tdClasses.push('quote');
                if (currentKey === 'organization') {
                    const org = rowData.organization ? rowData.organization.toLowerCase() : '';
                    if (org.includes('hamas')) tdClasses.push('org-hamas');
                    else if (org.includes('dflp')) tdClasses.push('org-dflp');
                    else if (org.includes('mujahideen')) tdClasses.push('org-mujahideen');
                    else if (org.includes('fatah')) tdClasses.push('org-fatah');
                }
                return `<td class="${tdClasses.join(' ')}">${highlight(String(cellContent || ''), searchTerm)}</td>`;
            }).join('');
            tr.innerHTML = cellHTML;
            tbody.appendChild(tr);
        });

        // Add pagination controls below the table
        const totalPages = Math.ceil(data.length / VISIBLE_ROWS);
        const paginationDiv = document.createElement('div');
        paginationDiv.className = 'flex justify-center items-center gap-4 mt-4';
        paginationDiv.innerHTML = `
            <button id="prevPageBtn" class="btn btn-secondary" ${currentPage === 0 ? 'disabled' : ''}>${labels.previous_page[currentLang]}</button>
            <span id="pageInfo" class="text-gray-700">${labels.page_info[currentLang].replace('{current}', currentPage + 1).replace('{total}', totalPages === 0 ? 1 : totalPages)}</span>
            <button id="nextPageBtn" class="btn btn-secondary" ${currentPage >= totalPages - 1 ? 'disabled' : ''}>${labels.next_page[currentLang]}</button>
        `;
        container.appendChild(paginationDiv);
        
        // Add event listeners for pagination buttons
        document.getElementById('prevPageBtn').addEventListener('click', () => changePage(-1));
        document.getElementById('nextPageBtn').addEventListener('click', () => changePage(1));

        addSortingToTable(); // Apply sorting listeners after table is rendered
    }
}

/**
 * Changes the current page for table pagination.
 * @param {number} delta - -1 for previous page, 1 for next page.
 */
function changePage(delta) {
    const totalPages = Math.ceil(currentData.length / VISIBLE_ROWS);
    const newPage = currentPage + delta;
    if (newPage >= 0 && newPage < totalPages) {
        currentPage = newPage;
        renderData(currentData);
        updateTextByLang(); // Update page info and button states
    }
}


/**
 * Updates the statistics displayed in the stat cards.
 * Calculates stats based on the currently visible (filtered) data.
 * @param {Array<object>} data - An array of data objects (rows) currently displayed in the table.
 */
function updateStats(data) {
    console.log('Updating stats...');
    let totalCombatants = 0;
    let totalCasualties = 0;
    let familyCasualties = 0;
    let highRanking = 0;
    
    data.forEach(rowData => {
        const combatantNumbers = rowData.combatant_id || '';
        const casualtyCount = parseInt(rowData.casualties_count) || 0;
        const familyInfo = rowData.family_casualties_info || '';
        const rank = rowData.rank_role ? rowData.rank_role.toLowerCase() : '';
        
        // Count combatants (handle ranges like 264-265 or comma separated)
        if (combatantNumbers.includes(',') && combatantNumbers.includes('-')) {
            totalCombatants += combatantNumbers.split(',').reduce((acc, current) => {
                if (current.includes('-')) {
                    return acc + (parseInt(current.split('-')[1]) - parseInt(current.split('-')[0]) + 1);
                }
                return acc + 1;
            }, 0);
        } else if (combatantNumbers.includes('-')) {
            const range = combatantNumbers.split('-');
            if (range.length === 2 && !isNaN(parseInt(range[0])) && !isNaN(parseInt(range[1]))) {
                totalCombatants += parseInt(range[1]) - parseInt(range[0]) + 1;
            } else {
                totalCombatants += 1; // Fallback for malformed range
            }
        } else if (combatantNumbers.includes(',')) {
             totalCombatants += combatantNumbers.split(',').length;
        }
        else if (combatantNumbers) { // Ensure it's not empty
            totalCombatants += 1;
        }
        
        totalCasualties += casualtyCount;
        
        if (familyInfo && familyInfo.trim() !== '-' && familyInfo.trim() !== '') {
            familyCasualties += casualtyCount; // Simple count if family info is present
        }
        
        if (rank.includes('leader') || rank.includes('commander') || rank.includes('prominent')) {
            highRanking += 1;
        }
    });
    
    document.getElementById('totalCombatants').textContent = totalCombatants;
    document.getElementById('totalCasualties').textContent = totalCasualties;
    document.getElementById('familyCasualties').textContent = familyCasualties;
    document.getElementById('highRanking').textContent = highRanking;
    console.log('Stats updated:', { totalCombatants, totalCasualties, familyCasualties, highRanking });
}

/**
 * Exports the currently visible table data to a CSV file.
 */
function exportToCSV() {
    if (currentData.length === 0) {
        showToast(labels.export_no_data[currentLang], 'error');
        console.warn("No data to export.");
        return;
    }

    // Use dataFieldKeys for CSV headers in the correct order, and get translated headers
    const headers = dataFieldKeys.map(key => `"${labels[key][currentLang].replace(/"/g, '""')}"`).join(',') + '\n';
    let csvContent = headers;
    
    currentData.forEach(rowData => {
        // Manually list fields in the order they appear in dataFieldKeys
        const orderedValues = dataFieldKeys.map(key => rowData[key]);
        
        const rowDataCsv = orderedValues.map(cellContent => {
            return '"' + String(cellContent || '').replace(/"/g, '""') + '"'; // Quote and escape double quotes
        }).join(',');
        csvContent += rowDataCsv + '\n';
    });
    
    // Create a Blob and download the CSV file
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'combatants_data.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Clean up the object URL

    showToast(labels.export_success[currentLang], 'success');
}

/**
 * Resets all filter selections and the search box, then re-filters the table.
 */
function resetFilters() {
    document.getElementById('locationFilter').value = '';
    document.getElementById('orgFilter').value = '';
    document.getElementById('rankFilter').value = '';
    document.getElementById('searchBox').value = '';
    currentSortColumn = null; // Reset sorting
    currentSortDirection = 'asc';
    filterTable();
    showToast(labels.filter_reset_success[currentLang], 'success');
    console.log('Filters have been reset.');
}

/**
 * Saves user preferences (language, view mode, filters) to sessionStorage.
 */
function saveUserPreferences() {
    const prefs = {
        language: currentLang,
        viewMode: isCardView,
        filters: {
            location: document.getElementById('locationFilter').value,
            organization: document.getElementById('orgFilter').value,
            rank: document.getElementById('rankFilter').value,
            search: document.getElementById('searchBox').value
        },
        sort: {
            column: currentSortColumn,
            direction: currentSortDirection
        }
    };
    sessionStorage.setItem('userPrefs', JSON.stringify(prefs));
    console.log('User preferences saved.');
}

/**
 * Loads user preferences from sessionStorage and applies them.
 */
function loadUserPreferences() {
    try {
        const prefs = JSON.parse(sessionStorage.getItem('userPrefs') || '{}');
        
        // Apply language preference
        if (prefs.language) {
            currentLang = prefs.language;
            document.documentElement.lang = currentLang;
            document.documentElement.dir = currentLang === 'he' ? 'rtl' : 'ltr';
            document.body.style.direction = currentLang === 'he' ? 'rtl' : 'ltr';
        }

        // Apply view mode preference (will be handled by DOMContentLoaded for initial render)
        if (typeof prefs.viewMode === 'boolean') {
            isCardView = prefs.viewMode;
            // Initial body class will be set in DOMContentLoaded listener below
        }

        // Apply filter preferences
        if (prefs.filters) {
            Object.entries(prefs.filters).forEach(([key, value]) => {
                const element = document.getElementById(key + (key === 'search' ? 'Box' : 'Filter'));
                if (element && value !== undefined) { // Check for undefined to allow empty strings
                    element.value = value;
                }
            });
        }

        // Apply sort preferences
        if (prefs.sort && prefs.sort.column !== null) {
            currentSortColumn = prefs.sort.column;
            currentSortDirection = prefs.sort.direction;
        }
        console.log('User preferences loaded.');
    } catch (error) {
        console.warn('Failed to load user preferences from sessionStorage:', error);
    }
}

// Initial setup on page load
window.addEventListener('DOMContentLoaded', () => {
    loadUserPreferences(); // Load preferences first

    // Set initial view mode based on loaded preference or screen width
    const initialViewMode = isCardView; // Use loaded preference
    
    // If no preference loaded, or if screen is small, default to card view
    if (window.innerWidth <= 768 && !sessionStorage.getItem('userPrefs')) {
         isCardView = true;
    } else if (sessionStorage.getItem('userPrefs') && typeof initialViewMode === 'boolean') {
         isCardView = initialViewMode; // Use loaded preference
    } else {
         isCardView = false; // Default to table view on larger screens if no preference
    }


    if (isCardView) {
        document.body.classList.remove('table-view'); // Ensure table-view is off for card view
    } else {
        document.body.classList.add('table-view'); // Ensure table-view is on for table view
    }
    
    updateTextByLang(); // Update all text elements including the view toggle button
    loadData(); // Load data after initial view mode and preferences are set

    // Add event listeners (moved from HTML)
    document.getElementById('langBtn').addEventListener('click', toggleLanguage);
    document.getElementById('locationFilter').addEventListener('change', filterTable);
    document.getElementById('orgFilter').addEventListener('change', filterTable);
    document.getElementById('rankFilter').addEventListener('change', filterTable);
    document.getElementById('searchBox').addEventListener('input', debouncedFilterTable);
    document.getElementById('exportBtn').addEventListener('click', exportToCSV);
    document.getElementById('resetBtn').addEventListener('click', resetFilters);
    document.getElementById('viewToggleBtn').addEventListener('click', toggleViewMode);
});

// Event listener for when filters change to save preferences
document.getElementById('locationFilter').addEventListener('change', saveUserPreferences);
document.getElementById('orgFilter').addEventListener('change', saveUserPreferences);
document.getElementById('rankFilter').addEventListener('change', saveUserPreferences);
// Note: searchBox uses debouncedFilterTable which already calls saveUserPreferences via filterTable()
