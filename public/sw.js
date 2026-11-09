/**
 * Service Worker لمنصة مزايد (Mozaid AI Service Worker)
 * مُصمم لمرونة الاتصال وسرعة التحميل في بيئات الشبكة الضعيفة والمتذبذبة (Yemen Low-Bandwidth Resilience)
 */

const CACHE_NAME = 'mozaid-pwa-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/auctions',
  '/tenders',
  '/wallet',
  '/kyc',
  '/globals.css'
];

// 1. التثبيت والتخزين الأولي للأصول الثابتة
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Cache addAll skipped failed assets:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 2. تنشيط وإزالة النسخ القديمة من الكاش
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. استراتيجية Network-First مع السقوط إلى Cache عند انقطاع الإنترنت
self.addEventListener('fetch', (event) => {
  // تخطي الطلبات غير المتعلقة بـ HTTP/GET
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // تخطي طلبات WebSocket ومسارات الـ API الحية
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) {
    return;
  }

  // للأصول الثابتة والصور: Stale-While-Revalidate
  if (
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|woff2|woff|ttf|css|js)$/) ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        }).catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // للصفحات (HTML Navigation): Network first, falling back to cache
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // صفحة الملاذ عند انقطاع الاتصال
        const fallback = await caches.match('/');
        return fallback || new Response(
          '<html><body style="font-family:sans-serif;text-align:center;padding:50px;direction:rtl;">' +
          '<h2>منصة مزايد - لا يوجد اتصال بالإنترنت</h2>' +
          '<p>يرجى التحقق من اتصالك بالشبكة وإعادة المحاولة.</p>' +
          '</body></html>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      })
  );
});
