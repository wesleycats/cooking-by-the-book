/* Service worker van het dashboard: maakt het installeerbaar als app. Haalt alles altijd vers op (geen cache),
   zodat je nooit oude testdata ziet. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
