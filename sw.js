// ============================================
// IMAGEAI - SERVICE WORKER (CORRIGÉ)
// PWA Offline Support & Update Management
// ============================================

// 1. Incrémente cette version (ex: v1.0.1) chaque fois que tu changes ton CSS ou JS
const CACHE_NAME = 'imageai-v1.0.1'; 

const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/manifest.json',
    '/icon.svg',
    '/icon-192.png',
    '/icon-512.png'
];

// INSTALLATION : Mise en cache initiale
self.addEventListener('install', (event) => {
    console.log('[SW] Installation en cours...');
    
    // Force le nouveau SW à s'installer sans attendre que l'ancien se ferme
    self.skipWaiting(); 

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Mise en cache du "App Shell"');
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

// ACTIVATION : Nettoyage et prise de contrôle
self.addEventListener('activate', (event) => {
    console.log('[SW] Activation et nettoyage des vieux caches...');
    
    event.waitUntil(
        Promise.all([
            // Supprime les anciennes versions du cache
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('[SW] Suppression du vieux cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // Permet au SW de contrôler la page immédiatement sans rechargement
            self.clients.claim()
        ])
    );
});

// FETCH : Stratégie de réseau
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // ERREUR CORRIGÉE : Si c'est une requête vers l'API d'image (externe), 
    // on laisse passer SANS intercepter ni mettre en cache ici (pour éviter les bugs CORS)
    if (url.origin !== location.origin) {
        return; 
    }

    // Stratégie "Cache First" pour les fichiers locaux (index, css, js)
    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(request).then((response) => {
                    // On ne cache que les réponses valides
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseToCache);
                    });

                    return response;
                }).catch(() => {
                    // Si on est hors-ligne et que le fichier n'est pas en cache
                    if (request.destination === 'document') {
                        return caches.match('/index.html');
                    }
                });
            })
    );
});

// GESTION DES MESSAGES (Pour forcer la mise à jour depuis app.js)
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});