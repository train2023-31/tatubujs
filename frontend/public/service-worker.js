/* eslint-disable no-restricted-globals */

// Service Worker for PWA and Push Notifications
const CACHE_NAME = 'tatubu-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/logo.png',
  '/manifest.json'
];

// Configuration
const CONFIG = {
  // Cache strategy
  cacheStaticAssets: true,
  cacheTimeout: 5000, // 5 seconds timeout for fetch requests
  
  // What to cache
  cacheableExtensions: ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ttf'],
  
  // What NOT to cache
  skipCachePaths: ['/api/', '/socket.io/'],
  
  // Enable debug logging
  debug: false
};

// Helper: Log debug messages
const debugLog = (...args) => {
  if (CONFIG.debug) {
    console.log('[Service Worker]', ...args);
  }
};

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        // Cache files one by one to avoid failing if one file fails
        return Promise.all(
          urlsToCache.map(url => {
            return cache.add(url).catch((err) => {
              console.warn('[Service Worker] Failed to cache:', url, err);
              // Don't fail the entire installation if one file fails
              return Promise.resolve();
            });
          })
        );
      })
      .catch((error) => {
        console.error('[Service Worker] Cache installation failed:', error);
        // Still allow the service worker to install
        return Promise.resolve();
      })
  );
  // Immediately activate the new service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all pages immediately
  return self.clients.claim();
});

// Helper: Fetch with timeout
const fetchWithTimeout = (request, timeout = CONFIG.cacheTimeout) => {
  return Promise.race([
    fetch(request),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Fetch timeout')), timeout)
    )
  ]);
};

// Helper: Check if URL should be cached
const shouldCacheUrl = (url) => {
  // Check if path should be skipped
  for (const skipPath of CONFIG.skipCachePaths) {
    if (url.pathname.includes(skipPath)) {
      return false;
    }
  }

  // Check if extension is cacheable
  for (const ext of CONFIG.cacheableExtensions) {
    if (url.pathname.endsWith(ext)) {
      return true;
    }
  }

  // Cache static folder
  if (url.pathname.includes('/static/')) {
    return true;
  }

  return false;
};

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  try {
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
      debugLog('Skipping non-GET request:', request.method, url.pathname);
      return;
    }

    // Skip chrome extension requests
    if (url.protocol === 'chrome-extension:' || url.protocol === 'chrome:') {
      return;
    }

    // Skip API requests - let them go directly to network
    if (url.pathname.startsWith('/api/')) {
      debugLog('Skipping API request:', url.pathname);
      return;
    }

    // Skip external requests (different origin)
    if (url.origin !== self.location.origin) {
      debugLog('Skipping external request:', url.origin);
      return;
    }

    // For navigation requests (page loads), use network-first strategy
    // Only fallback to cache if offline
    if (request.mode === 'navigate') {
      event.respondWith(
        fetchWithTimeout(request)
          .then((response) => {
            // If network request succeeds, return it
            if (response && response.status === 200) {
              return response;
            }
            // If network fails, return cached index.html
            return caches.match('/index.html').then((cached) => {
              if (cached) {
                console.log('[Service Worker] Offline: returning cached index.html');
                return cached;
              }
              // If no cache, return the network response (even if error)
              return response;
            });
          })
          .catch((error) => {
            console.log('[Service Worker] Network failed for navigation, using cache');
            // Network completely failed, return cached index.html
            return caches.match('/index.html').then((cached) => {
              if (cached) {
                return cached;
              }
              // If no cache at all, create a basic response
              return new Response('Offline - No cache available', {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'text/plain' }
              });
            });
          })
      );
      return;
    }

    // For non-navigation requests (assets, etc.), use cache-first strategy
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          // Return cached response if available
          if (cachedResponse) {
            debugLog('Cache hit:', url.pathname);
            return cachedResponse;
          }

          debugLog('Cache miss, fetching:', url.pathname);

          // Network request with timeout
          return fetchWithTimeout(request)
            .then((response) => {
              // Check if valid response
              if (!response) {
                console.warn('[Service Worker] No response received for:', url.pathname);
                return response;
              }

              // Return error responses as-is (don't cache them)
              if (response.status !== 200) {
                debugLog('Non-200 response:', response.status, url.pathname);
                return response;
              }

              // Don't cache if response type is unexpected
              if (response.type !== 'basic' && response.type !== 'cors') {
                debugLog('Skipping cache for response type:', response.type);
                return response;
              }

              // Clone the response
              const responseToCache = response.clone();

              // Cache static assets only
              if (CONFIG.cacheStaticAssets && shouldCacheUrl(url)) {
                debugLog('Caching:', url.pathname);
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(request, responseToCache);
                  })
                  .catch((err) => {
                    console.warn('[Service Worker] Cache put failed:', url.pathname, err);
                  });
              }

              return response;
            })
            .catch((error) => {
              debugLog('Fetch failed:', url.pathname, error.message);
              // For non-navigation requests, try to return any cached version
              return caches.match(request).then((cachedFallback) => {
                if (cachedFallback) {
                  debugLog('Returning stale cache as fallback');
                  return cachedFallback;
                }
                // If nothing in cache, propagate the error
                throw error;
              });
            });
        })
    );
  } catch (error) {
    console.error('[Service Worker] Fetch handler error:', error);
    // Let the request go to the network normally
    return;
  }
});

// Push event - handle incoming push notifications
// This works when the app is in background or closed (mobile, Windows, Mac)
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received (app may be in background):', event);

  let notificationData = {
    title: 'تتبع',
    body: 'لديك إشعار جديد',
    icon: '/logo.png',
    badge: '/logo.png',
    tag: 'default',
    data: {},
    // Sound and notification options for background notifications
    sound: '/Audio-10_7_2025.m4a',
    silent: false,
    renotify: true,
    timestamp: Date.now()
  };

  // Parse the push notification data
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.message || data.body || notificationData.body,
        icon: data.icon || '/logo.png',
        badge: data.badge || '/logo.png',
        tag: data.tag || `notification-${data.id || Date.now()}`,
        // Sound configuration - works on mobile and desktop
        sound: data.sound || '/Audio-10_7_2025.m4a',
        silent: false, // Always play sound
        renotify: true, // Re-notify if same tag exists
        timestamp: Date.now(),
        // Notification data for click handling
        data: {
          url: data.action_url || data.url || '/app/notifications',
          notification_id: data.id || data.notification_id,
          type: data.type,
          ...data
        },
        // Priority-based settings
        requireInteraction: data.priority === 'urgent' || data.priority === 'high',
        vibrate: data.priority === 'urgent' ? [200, 100, 200, 100, 200] : [200, 100, 200],
        // Show notification even when app is in foreground (optional)
        // For background, it always shows
      };

      // Add action buttons based on notification type
      if (data.type === 'attendance') {
        notificationData.actions = [
          { action: 'view', title: 'عرض الحضور', icon: '/logo.png' },
          { action: 'close', title: 'إغلاق' }
        ];
      } else if (data.type === 'bus') {
        notificationData.actions = [
          { action: 'view', title: 'تتبع الحافلة', icon: '/logo.png' },
          { action: 'close', title: 'إغلاق' }
        ];
      } else if (data.type === 'substitution' || data.type === 'timetable') {
        notificationData.actions = [
          { action: 'view', title: 'عرض الجدول', icon: '/logo.png' },
          { action: 'close', title: 'إغلاق' }
        ];
      } else {
        notificationData.actions = [
          { action: 'view', title: 'فتح', icon: '/logo.png' },
          { action: 'close', title: 'إغلاق' }
        ];
      }
    } catch (error) {
      console.error('[Service Worker] Error parsing push data:', error);
      // Fallback: show notification with default data
      notificationData.body = 'لديك إشعار جديد';
    }
  }

  // Always show notification (especially important when app is in background)
  // The service worker runs independently, so this works even when app is closed
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
      .then(() => {
        console.log('[Service Worker] ✅ Background notification shown successfully with sound');
        
        // Notify all clients (if app is open) about the new notification
        // This helps update the in-app notification count
        return self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      })
      .then((clients) => {
        // Send message to all open windows to refresh notification count
        clients.forEach((client) => {
          client.postMessage({
            type: 'NEW_NOTIFICATION',
            notification: notificationData.data
          });
        });
      })
      .catch((error) => {
        console.error('[Service Worker] ❌ Error showing notification:', error);
      })
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event);

  event.notification.close();

  // Handle action buttons
  if (event.action === 'close') {
    return;
  }

  // Get the URL to open (from notification data or default)
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
      .catch((error) => {
        console.error('[Service Worker] Error handling notification click:', error);
      })
  );
});

// Background sync event (for future offline support)
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-notifications') {
    event.waitUntil(
      // Sync logic here - fetch pending notifications
      fetch('/api/notifications?unread_only=true')
        .then(response => response.json())
        .then(data => {
          console.log('[Service Worker] Synced notifications:', data);
        })
        .catch(error => {
          console.error('[Service Worker] Sync failed:', error);
        })
    );
  }
});

// Message event - handle messages from the app
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }

  // Handle notification refresh requests from the app
  if (event.data && event.data.type === 'REFRESH_NOTIFICATIONS') {
    // Notify all clients to refresh their notification count
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'REFRESH_NOTIFICATIONS'
          });
        });
      });
  }
});
