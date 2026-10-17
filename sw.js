// Achei em Pilar — Service Worker (PWA)
const CACHE_NAME = 'pilar-pwa-v1';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png',
  '/onibus.html',
  '/telefones.html'
];

// 1. Instalação: pré-carrega os arquivos vitais da casca do app
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('PWA Precache warning (non-fatal):', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 2. Ativação: limpa caches antigos e assume o controle imediatamente
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch: Estratégia Network-First para páginas HTML (sempre busca a versão mais recente na nuvem)
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Ignorar requisições não-GET ou esquemas especiais (chrome-extension, etc)
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return;
  }

  // Requisições para Supabase API ou APIs externas sempre vão direto para a rede
  if (request.url.includes('supabase.co') || request.url.includes('/api/')) {
    return;
  }

  // Para navegações (páginas HTML): Network First com fallback de Cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || caches.match('/index.html');
          });
        })
    );
    return;
  }

  // Para assets estáticos (ícones, imagens locais): Cache First com atualização em background
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Busca atualização em background (stale-while-revalidate para assets)
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        }
        return networkResponse;
      });
    })
  );
});
