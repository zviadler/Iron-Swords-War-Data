// הגדרת שם לזיכרון המטמון (cache) כדי שנוכל לנהל גרסאות שונות של המטמון.
// שינוי שם המטמון יגרום לדפדפן לטעון את כל הנכסים מחדש.
const CACHE_NAME = 'combatant-id-db-v1.0.1';

// רשימת הנכסים (קבצים) שייטענו לזיכרון המטמון בזמן ההתקנה.
// חשוב לכלול כאן את כל הקבצים החיוניים להפעלת האפליקציה במצב לא מקוון.
const urlsToCache = [
    '/', // נתיב הבסיס של האפליקציה (לרוב index.html)
    'index.html', // קובץ ה-HTML הראשי
    'style.css', // קובץ ה-CSS
    'script.js', // קובץ ה-JavaScript הראשי
    'data.csv', // קובץ הנתונים CSV
    // ניתן להוסיף כאן קישורים לקבצי פונטים, תמונות, או סקריפטים חיצוניים שאתה רוצה לשמור במטמון.
    // לדוגמה, אם אתה משתמש ב-Font Awesome מ-CDN:
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css',
    // שימו לב: שמירת נכסים מ-CDN במטמון עלולה להיות בעייתית אם ה-CDN משנה את הכתובות או הגרסאות.
    // עדיף להוריד קבצי צד שלישי ולארח אותם מקומית במידת האפשר.
];

// === אירוע 'install' (התקנה) ===
// זהו השלב הראשון במחזור החיים של ה-Service Worker.
// הוא מתרחש כאשר ה-Service Worker נרשם לראשונה או כאשר יש גרסה חדשה שלו.
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Install Event: Caching app shell');
    event.waitUntil(
        caches.open(CACHE_NAME) // פותח את זיכרון המטמון בשם שהגדרנו.
            .then((cache) => {
                console.log('[Service Worker] Caching all content');
                return cache.addAll(urlsToCache); // מוסיף את כל הקבצים מהרשימה לזיכרון המטמון.
            })
            .catch((error) => {
                console.error('[Service Worker] Caching failed:', error);
            })
    );
});

// === אירוע 'activate' (הפעלה) ===
// אירוע זה מתרחש לאחר שה-Service Worker הותקן בהצלחה.
// כאן ננקה גרסאות ישנות של המטמון כדי למנוע הצטברות קבצים לא נחוצים.
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activate Event: Cleaning old caches');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // אם שם המטמון שונה מהשם הנוכחי, נמחק אותו.
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // דאג שה-Service Worker ישתלט על כל הלקוחות (טאבים פתוחים) באופן מיידי.
    return self.clients.claim();
});

// === אירוע 'fetch' (שליפה) ===
// אירוע זה מתרחש בכל פעם שהדפדפן מנסה לבצע בקשת רשת (למשל, לטעון תמונה, קובץ CSS, או נתונים).
// כאן נוכל ליירט את הבקשה ולהחליט אם להגיש אותה מהמטמון או מהרשת.
self.addEventListener('fetch', (event) => {
    // בודק אם הבקשה היא עבור 'data.csv'
    if (event.request.url.includes('data.csv')) {
        // אסטרטגיה לנתונים: Network First (קודם נסה מהרשת, אם נכשל - מהמטמון)
        event.respondWith(
            fetch(event.request)
                .then(async (response) => {
                    // אם הבקשה הצליחה מהרשת, נשמור אותה במטמון ונחזיר את התגובה.
                    const cache = await caches.open(CACHE_NAME);
                    // חשוב לשכפל את התגובה מכיוון שהיא זרם וניתן לקרוא אותה רק פעם אחת.
                    cache.put(event.request, response.clone());
                    return response;
                })
                .catch(async () => {
                    // אם הרשת נכשלה, ננסה להגיש מהמטמון.
                    console.log('[Service Worker] Network failed for data.csv, serving from cache.');
                    return caches.match(event.request);
                })
        );
    } else {
        // אסטרטגיה לנכסים אחרים (App Shell): Cache First (קודם נסה מהמטמון, אם נכשל - מהרשת)
        event.respondWith(
            caches.match(event.request)
                .then((response) => {
                    // אם נמצאה התאמה במטמון, נחזיר אותה.
                    if (response) {
                        console.log('[Service Worker] Serving from cache:', event.request.url);
                        return response;
                    }
                    // אם לא נמצאה התאמה במטמון, ננסה לטעון מהרשת.
                    console.log('[Service Worker] Fetching from network:', event.request.url);
                    return fetch(event.request)
                        .then(async (networkResponse) => {
                            // אם הבקשה הצליחה מהרשת, נשמור אותה במטמון (אם זו תגובה תקינה).
                            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                                const cache = await caches.open(CACHE_NAME);
                                cache.put(event.request, networkResponse.clone());
                            }
                            return networkResponse;
                        })
                        .catch((error) => {
                            console.error('[Service Worker] Fetch failed for:', event.request.url, error);
                            // כאן ניתן להחזיר תגובת גיבוי (fallback) אם הכל נכשל.
                            // לדוגמה, קובץ "offline.html"
                            // return caches.match('/offline.html');
                        });
                })
        );
    }
});
