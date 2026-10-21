self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

// Просто пропускаем запросы (необходимо для установки)
self.addEventListener('fetch', (e) => {
  // Пустой обработчик
});