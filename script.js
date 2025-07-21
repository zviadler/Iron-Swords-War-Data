(function() {
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
    };

    // --- קאשינג של אלמנטים ב־DOM ---
    const dom = {
        contentArea:        document.getElementById('contentArea'),
        loadingOverlay:     document.getElementById('loadingOverlay'),
        toastContainer:     document.getElementById('toastContainer'),
        locationFilter:     document.getElementById('locationFilter'),
        orgFilter:          document.getElementById('orgFilter'),
        rankFilter:         document.getElementById('rankFilter'),
        searchBox:          document.getElementById('searchBox'),
        langBtn:            document.getElementById('langBtn'),
        viewToggleBtn:      document.getElementById('viewToggleBtn'),
        exportBtn:          document.getElementById('exportBtn'),
        resetBtn:           document.getElementById('resetBtn'),
        prevPageBtn:        document.getElementById('prevPageBtn'),
        nextPageBtn:        document.getElementById('nextPageBtn'),
        pageInfo:           document.getElementById('pageInfo'),
        resultsCounter:     document.getElementById('resultsCounter'),
        totalCombatants:    document.getElementById('totalCombatants'),
        totalCasualties:    document.getElementById('totalCasualties'),
        familyCasualties:   document.getElementById('familyCasualties'),
        highRanking:        document.getElementById('highRanking'),
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
        result_found: { he: "נמצאה תוצאה אחת", en: "1 result found" },
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
            "name_arabic": "عماد البابא \"אבו אשרף\"",
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

    // --- פונקציות עזר ---

    function sanitizeInput(input) {
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }

    function highlight(text, term) {
        if (!term) return sanitizeInput(text);
        const safeText = sanitizeInput(text);
        const safeTerm = sanitizeInput(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return safeText.replace(new RegExp(`(${safeTerm})`, 'gi'), '<mark>$1</mark>');
    }

    function debounce(fn, ms = 150) {
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
    const normalized = header.trim().toLowerCase();
    switch (normalized) {
        case "מס' פוסט":
        case "post no.":
            return 'post_id';
        case "מס' לוחם":
        case "fighter no.":
            return 'combatant_id';
        case 'תאריך':
        case 'date':
            return 'date';
        case 'מיקום':
        case 'location':
            return 'location';
        case 'פירוט מיקום':
        case 'location details':
            return 'location_details';
        case 'שם באנגלית':
        case 'name in english':
            return 'name_english';
        case 'שם בערבית':
        case 'name in arabic':
            return 'name_arabic';
        case 'כינוי':
        case 'nickname':
            return 'nickname';
        case 'תיאור ברשת':
        case 'social media description':
            return 'description_online';
        case 'דרגה/תפקיד':
        case 'rank/role':
            return 'rank_role';
        case 'ארגון':
        case 'organization':
            return 'organization';
        case 'פעילות':
        case 'activity':
            return 'activity';
        case 'בני משפחה':
        case 'family members':
            return 'family_casualties_info';
        case "מס' קורבנות":
        case 'no. of victims':
            return 'casualties_count';
        case 'לוחמים נוספים':
        case 'additional fighters':
            return 'additional_combatants';
        case 'הערות':
        case 'notes':
            return 'notes';
        default:
            return normalized.replace(/ /g, '_').replace(/[^a-z0-9_]/g, '');
    }
}

    let collator = new Intl.Collator(state.lang, { numeric: true, sensitivity: 'base' });

    function showLoadingState(message) {
        if (dom.loadingOverlay) {
            dom.loadingOverlay.querySelector('.loading-text').textContent = message;
            dom.loadingOverlay.classList.remove('hidden');
        }
        dom.contentArea?.classList.add('loading');
    }

    function hideLoadingState() {
        dom.loadingOverlay?.classList.add('hidden');
        dom.contentArea?.classList.remove('loading');
    }

    function showErrorMessage(error, context) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-banner';
        errorDiv.innerHTML = `
            <strong>${state.lang==='he'?'שגיאה':'Error'}:</strong> ${sanitizeInput(error.message)}
            <br><small>${state.lang==='he'?'הקשר':'Context'}: ${sanitizeInput(context)}</small>
            <button onclick="this.parentElement.remove()" aria-label="${state.lang==='he'?'סגור הודעת שגיאה':'Close'}">✕</button>
        `;
        document.body.insertBefore(errorDiv, document.querySelector('.container'));
    }

    function showToast(message, type = 'success', duration = 3000) {
        const container = dom.toastContainer;
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        void toast.offsetWidth;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => toast.remove());
        }, duration);
    }

    async function loadCSVData(url) {
        if (window.location.protocol === 'file:') {
            return embeddedCombatantData;
        }
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`${labels.error_http[state.lang]}${resp.status}`);
        const text = await resp.text();
        if (!text.trim()) throw new Error(labels.error_empty_csv[state.lang]);
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length <= 1) throw new Error(labels.error_empty_csv[state.lang]);
        const rawHeaders = parseCsvLine(lines[0]);
        const headers = rawHeaders.map(normalizeHeader);
        return lines.slice(1).map(line => {
            const vals = parseCsvLine(line);
            const obj = {};
            headers.forEach((h, i) => obj[h] = vals[i] ? vals[i].trim() : '');
            return obj;
        });
    }

    async function loadData() {
        showLoadingState(labels.loading_data[state.lang]);
        try {
            state.originalData = await loadCSVData('data.csv');
        } catch (e) {
            console.error(e);
            state.originalData = [];
            const contextError = labels.error_data_load_context[state.lang] + (window.location.protocol!=='file:'?labels.csv_file_error[state.lang]:'');
            showErrorMessage(e, contextError);
            showToast(labels.error_loading_data[state.lang] + e.message, 'error', 5000);
        } finally {
            state.filteredData = [...state.originalData];
            populateFilters();
            applySortAndRender();
            hideLoadingState();
        }
    }
       // הוספת כפתור התפריט לפני סרגל הפילטרים
    document.querySelector('.filters-bar').insertAdjacentHTML('beforebegin', `
        <button class="mobile-filters-toggle">
            פתח פילטרים
        </button>
    `);
    
    // טיפול בלחיצה על כפתור התפריט
    document.querySelector('.mobile-filters-toggle').addEventListener('click', function() {
        const filtersBar = document.querySelector('.filters-bar');
        filtersBar.classList.toggle('active');
        this.textContent = filtersBar.classList.contains('active') ? 'סגור פילטרים' : 'פתח פילטרים';
    });
    function populateFilters() {
        const sets = { location: new Set(), org: new Set(), rank: new Set() };
        state.originalData.forEach(r => {
            if (r.location) sets.location.add(r.location);
            if (r.organization) sets.org.add(r.organization);
            if (r.rank_role) sets.rank.add(r.rank_role);
        });
        [
            ['locationFilter','location'],
            ['orgFilter','org'],
            ['rankFilter','rank']
        ].forEach(([id,key]) => {
            const sel = dom[id];
            if (!sel) return;
            const allText = state.lang==='he'?'הכל':'All';
            const cur = sel.value;
            sel.innerHTML = `<option value="">${allText}</option>`;
            Array.from(sets[key]).sort().forEach(v => {
                sel.insertAdjacentHTML('beforeend', `<option value="${sanitizeInput(v)}">${sanitizeInput(v)}</option>`);
            });
            sel.value = cur && sets[key].has(cur) ? cur : '';
        });
    }

    function filterData() {
        const { location, org, rank, search } = state.filters;
        state.filteredData = state.originalData.filter(r => {
            const loc = (r.location||'').toLowerCase();
            const o   = (r.organization||'').toLowerCase();
            const rk  = (r.rank_role||'').toLowerCase();
            const txt = ((r.name_english||'')+(r.name_arabic||'')+(r.description_online||'')+loc+o).toLowerCase();
            return (!location|| loc.includes(location))
                && (!org|| o.includes(org))
                && (!rank|| rk.includes(rank))
                && (!search|| txt.includes(search));
        });
        state.currentPage = 0;
    }

    const debouncedFilter = debounce(() => {
        state.filters.search = dom.searchBox.value.toLowerCase();
        filterData();
        applySortAndRender();
    }, 200);

    function sortData() {
        const { column, direction } = state.sort;
        if (column===null) return;
        const key = dataFieldKeys[column];
        state.filteredData.sort((a,b) => {
            const cmp = collator.compare(a[key]||'', b[key]||'');
            return direction==='asc'? cmp : -cmp;
        });
    }

    function sortAndRender(colIndex=null) {
        if (colIndex!==null) {
            if (state.sort.column===colIndex) {
                state.sort.direction = state.sort.direction==='asc'?'desc':'asc';
            } else {
                state.sort.column = colIndex;
                state.sort.direction = 'asc';
            }
        }
        sortData();
        applySortAndRender();
    }

    function applySortAndRender() {
        sortData();
        renderData();
        updatePagination();
        updateStats();
        updateTextByLang();
        saveUserPreferences();
    }

    function renderData() {
        dom.contentArea.innerHTML = '';
        const data = state.filteredData;
        if (!data.length) {
            dom.contentArea.innerHTML = `<p class="text-center">${labels.no_matching_data[state.lang]}</p>`;
            return;
        }
        const term = state.filters.search;
        if (state.isCardView) {
            const grid = document.createElement('div');
            grid.className = 'card-grid';
            data.forEach(r => {
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
                    <h2>${highlight(r.name_english,term)} | ${highlight(r.name_arabic,term)}</h2>
                    <div class="sub">${highlight(r.description_online,term)}</div>
                    <div class="meta">
                        ${r.location&&r.location!=='-'?`<span>📍 ${highlight(r.location,term)}</span>`:''}
                        ${r.date&&r.date!=='-'?`<span>📅 ${highlight(r.date,term)}</span>`:''}
                    </div>
                `;
                const details = document.createElement('div');
                details.className = 'card-details';
                dataFieldKeys.forEach(key => {
                    if (['name_english','name_arabic','description_online','location','date','post_id'].includes(key)) return;
                    const val = r[key];
                    if (val&&val.trim()!=='-'&&val.trim()!=='') {
                        const p = document.createElement('p');
                        if (key==='family_casualties_info') p.classList.add('family');
                        p.innerHTML = `<strong>${labels[key][state.lang]}:</strong> ${highlight(val,term)}`;
                        details.appendChild(p);
                    }
                });
                card.appendChild(details);
                grid.appendChild(card);
            });
            dom.contentArea.appendChild(grid);
        } else {
            const table = document.createElement('table');
            table.className = 'w-full border-collapse text-sm';
            const thead = document.createElement('thead');
            thead.innerHTML = `<tr>${
                dataFieldKeys.map((k,i)=>`<th data-col="${i}">${labels[k][state.lang]} <span class="sort-indicator">↕</span></th>`).join('')
            }</tr>`;
            table.appendChild(thead);

            const tbody = document.createElement('tbody');
            const start = state.currentPage * state.VISIBLE_ROWS;
            const chunk = data.slice(start, start+state.VISIBLE_ROWS);
            const frag = document.createDocumentFragment();
            chunk.forEach(r => {
                const tr = document.createElement('tr');
                dataFieldKeys.forEach(k=>{
                    tr.insertAdjacentHTML('beforeend', `<td>${highlight(String(r[k]||''),term)}</td>`);
                });
                frag.appendChild(tr);
            });
            tbody.appendChild(frag);
            table.appendChild(tbody);
            dom.contentArea.appendChild(table);

            thead.querySelectorAll('th').forEach(th=>th.addEventListener('click',()=>sortAndRender(+th.dataset.col)));
        }
    }

    function updatePagination() {
        const totalPages = Math.ceil(state.filteredData.length/state.VISIBLE_ROWS)||1;
        dom.pageInfo.textContent = labels.page_info[state.lang]
            .replace('{current}',state.currentPage+1)
            .replace('{total}',totalPages);
        dom.prevPageBtn.disabled = state.currentPage===0;
        dom.nextPageBtn.disabled = state.currentPage>=totalPages-1;
    }

    function changePage(delta) {
        const totalPages = Math.ceil(state.filteredData.length/state.VISIBLE_ROWS)||1;
        state.currentPage = Math.max(0,Math.min(totalPages-1,state.currentPage+delta));
        renderData();
        updatePagination();
    }

    function updateStats() {
        let totalCombatants=0, totalCasualties=0, familyCasualties=0, highRanking=0;
        state.filteredData.forEach(r=>{
            const nums = r.combatant_id||'';
            const casualtyCount = parseInt(r.casualties_count)||0;
            const fam = r.family_casualties_info||'';
            const rank = r.rank_role?r.rank_role.toLowerCase():'';
            // combatants
            if(nums.includes(',')&&nums.includes('-')) {
                totalCombatants += nums.split(',').reduce((acc,c)=>{
                    if(c.includes('-')){
                        const [a,b]=c.split('-').map(n=>parseInt(n));
                        return acc + (b-a+1);
                    }
                    return acc+1;
                },0);
            } else if(nums.includes('-')){
                const [a,b]=nums.split('-').map(n=>parseInt(n));
                if(!isNaN(a)&&!isNaN(b)) totalCombatants+=b-a+1;
                else totalCombatants+=1;
            } else if(nums.includes(',')){
                totalCombatants+=nums.split(',').length;
            } else if(nums) {
                totalCombatants+=1;
            }
            totalCasualties+=casualtyCount;
            if(fam.trim()&&fam.trim()!=='-') familyCasualties+=casualtyCount;
            if(rank.includes('leader')||rank.includes('commander')||rank.includes('prominent')) highRanking+=1;
        });
        dom.totalCombatants.textContent = totalCombatants;
        dom.totalCasualties.textContent = totalCasualties;
        dom.familyCasualties.textContent = familyCasualties;
        dom.highRanking.textContent = highRanking;
    }

    function updateTextByLang() {
        // שפת כפתור
        setTextContent('langBtn',state.lang==='he'?'English':'עברית');
        // כותרות
        setTextContent('siteTitle',labels.site_title[state.lang]);
        setTextContent('siteSub',labels.site_sub[state.lang]);
        setAttribute('searchBox','placeholder',labels.search_placeholder[state.lang]);
        // view toggle
        dom.viewToggleBtn.innerHTML = state.isCardView
            ? `<i class="fas fa-table"></i> ${labels.toggle_view_table[state.lang]}`
            : `<i class="fas fa-th-list"></i> ${labels.toggle_view_card[state.lang]}`;
        setButtonHTML('resetBtn','fas fa-refresh',labels.reset_filters[state.lang]);
        setButtonHTML('exportBtn','fas fa-download',labels.export_csv[state.lang]);
        toggleLanguageElements('dataCollectionHebrew','dataCollectionEnglish');
        updateStatsLabels({
            totalCombatants: labels.total_combatants[state.lang],
            totalCasualties: labels.total_casualties[state.lang],
            familyCasualties: labels.family_members[state.lang],
            highRanking: labels.high_ranking[state.lang]
        });
        const filterLabels = [
            {selector:'.filters-bar .filter-group:nth-child(1) label',labelKey:'location'},
            {selector:'.filters-bar .filter-group:nth-child(2) label',labelKey:'organization'},
            {selector:'.filters-bar .filter-group:nth-child(3) label',labelKey:'rank_role'},
            {selector:'.filters-bar .filter-group:nth-child(4) label',text:labels.search_placeholder[state.lang].split(' ')[0]+':'}
        ];
        updateFilterLabels(filterLabels);
        ['locationFilter','orgFilter','rankFilter'].forEach(id=>{
            const sel = document.getElementById(id);
            if(sel?.options.length) sel.options[0].textContent = state.lang==='he'?'הכל':'All';
        });
        setTextContent('prevPageBtn',labels.previous_page[state.lang]);
        setTextContent('nextPageBtn',labels.next_page[state.lang]);
        updatePageInfo();
        updateResultsCounter();
    }

    function setTextContent(id,text){
        const el = document.getElementById(id);
        if(el) el.textContent=text;
    }
    function setButtonHTML(id,icon,label){
        const el = document.getElementById(id);
        if(el) el.innerHTML=`<i class="${icon}"></i> ${label}`;
    }
    function setAttribute(id,attr,value){
        const el = document.getElementById(id);
        if(el) el.setAttribute(attr,value);
    }
    function toggleLanguageElements(heId,enId){
        const heb = document.getElementById(heId), eng = document.getElementById(enId);
        if(heb&&eng){
            const isHeb = state.lang==='he';
            heb.classList.toggle('hidden',!isHeb);
            eng.classList.toggle('hidden',isHeb);
        }
    }
    function updateStatsLabels(map){
        Object.entries(map).forEach(([id,label])=>{
            const el = document.querySelector(`#${id}`);
            if(el?.nextElementSibling) el.nextElementSibling.textContent=label;
        });
    }
    function updateFilterLabels(items){
        items.forEach(({selector,labelKey,text})=>{
            const el = document.querySelector(selector);
            if(el) el.textContent = text || labels[labelKey][state.lang] + ':';
        });
    }
    function updatePageInfo(){
        dom.pageInfo.textContent = labels.page_info[state.lang]
            .replace('{current}',state.currentPage+1)
            .replace('{total}',Math.ceil(state.filteredData.length/state.VISIBLE_ROWS)||1);
    }
    function updateResultsCounter(){
        dom.resultsCounter.textContent = state.filteredData.length===1
            ? labels.result_found[state.lang]
            : labels.results_found[state.lang].replace('{count}',state.filteredData.length);
        dom.resultsCounter.classList.toggle('hidden',state.filteredData.length===0);
    }

    function exportToCSV(){
        if(!state.filteredData.length){
            showToast(labels.export_no_data[state.lang],'error');
            return;
        }
        const headers = dataFieldKeys.map(k=>`"${labels[k][state.lang].replace(/"/g,'""')}"`).join(',')+'\n';
        let csv = headers;
        state.filteredData.forEach(r=>{
            csv+=dataFieldKeys.map(k=>`"${String(r[k]||'').replace(/"/g,'""')}"`).join(',')+'\n';
        });
        const blob = new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'});
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'combatants_data.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast(labels.export_success[state.lang],'success');
    }

    function resetFilters(){
        dom.locationFilter.value = '';
        dom.orgFilter.value      = '';
        dom.rankFilter.value     = '';
        dom.searchBox.value      = '';
        state.filters = { location: '', org: '', rank: '', search: '' };
        state.sort.column = null;
        state.sort.direction = 'asc';
        filterData();
        applySortAndRender();
        showToast(labels.filter_reset_success[state.lang],'success');
    }

    function saveUserPreferences(){
        sessionStorage.setItem('userPrefs',JSON.stringify({
            language:state.lang,
            viewMode:state.isCardView,
            filters:state.filters,
            sort:state.sort
        }));
    }
    function loadUserPreferences(){
        try {
            const p = JSON.parse(sessionStorage.getItem('userPrefs')||'{}');
            if(p.language){
                state.lang = p.language;
                document.documentElement.lang = state.lang;
                document.documentElement.dir = state.lang==='he'?'rtl':'ltr';
                document.body.style.direction = state.lang==='he'?'rtl':'ltr';
            }
            if(typeof p.viewMode==='boolean') state.isCardView = p.viewMode;
            if(p.filters) state.filters = p.filters;
            if(p.sort) state.sort = p.sort;
            if(state.filters){
                dom.locationFilter.value = state.filters.location||'';
                dom.orgFilter.value      = state.filters.org||'';
                dom.rankFilter.value     = state.filters.rank||'';
                dom.searchBox.value      = state.filters.search||'';
            }
        } catch {}
    }

    window.addEventListener('DOMContentLoaded',()=>{
        loadUserPreferences();
        document.body.classList.toggle('table-view',!state.isCardView);
        updateTextByLang();
        loadData();
        dom.langBtn.addEventListener('click',()=>{
            state.lang = state.lang==='he'?'en':'he';
            collator = new Intl.Collator(state.lang,{numeric:true,sensitivity:'base'});
            document.documentElement.lang = state.lang;
            document.documentElement.dir = state.lang==='he'?'rtl':'ltr';
            document.body.style.direction = state.lang==='he'?'rtl':'ltr';
            updateTextByLang();
            applySortAndRender();
        });
        dom.locationFilter.addEventListener('change',()=>{
            state.filters.location = dom.locationFilter.value.toLowerCase();
            filterData();
            applySortAndRender();
        });
        dom.orgFilter.addEventListener('change',()=>{
            state.filters.org = dom.orgFilter.value.toLowerCase();
            filterData();
            applySortAndRender();
        });
        dom.rankFilter.addEventListener('change',()=>{
            state.filters.rank = dom.rankFilter.value.toLowerCase();
            filterData();
            applySortAndRender();
        });
        dom.searchBox.addEventListener('input',debouncedFilter);
        dom.prevPageBtn.addEventListener('click',()=>changePage(-1));
        dom.nextPageBtn.addEventListener('click',()=>changePage(1));
        dom.viewToggleBtn.addEventListener('click',()=>{
            state.isCardView = !state.isCardView;
            document.body.classList.toggle('table-view',!state.isCardView);
            applySortAndRender();
        });
        dom.resetBtn.addEventListener('click', resetFilters);
        dom.exportBtn.addEventListener('click', exportToCSV);
    });

    dom.locationFilter.addEventListener('change', saveUserPreferences);
    dom.orgFilter.addEventListener('change', saveUserPreferences);
    dom.rankFilter.addEventListener('change', saveUserPreferences);
})();
