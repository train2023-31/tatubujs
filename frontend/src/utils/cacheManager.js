/**
 * Mobile-friendly cache management utilities
 * Handles different caching mechanisms used by mobile browsers
 */

// Detect mobile device
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.innerWidth <= 768;
};

/**
 * Clear all browser caches - mobile-friendly implementation
 */
export const clearAllCaches = async () => {
  try {
    console.log('🔄 Starting cache clearing process...');
    
    // 1. Clear Cache API (Service Worker cache)
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => {
            console.log(`🗑️ Deleting cache: ${cacheName}`);
            return caches.delete(cacheName);
          })
        );
        console.log('✅ Cache API cleared');
      } catch (error) {
        console.warn('⚠️ Error clearing Cache API:', error);
      }
    }

    // 2. Unregister all service workers
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map(registration => {
            console.log(`🗑️ Unregistering service worker: ${registration.scope}`);
            return registration.unregister();
          })
        );
        console.log('✅ Service Workers unregistered');
      } catch (error) {
        console.warn('⚠️ Error unregistering service workers:', error);
      }
    }

    // 3. Clear sessionStorage (keep auth token)
    try {
      const authToken = sessionStorage.getItem('token');
      sessionStorage.clear();
      if (authToken) {
        sessionStorage.setItem('token', authToken); // Restore token
      }
      console.log('✅ SessionStorage cleared (token preserved)');
    } catch (error) {
      console.warn('⚠️ Error clearing sessionStorage:', error);
    }

    // 4. Clear localStorage selectively (preserve user preferences)
    try {
      const preserveKeys = ['token', 'user', 'theme', 'language']; // Keys to preserve
      const keysToRemove = Object.keys(localStorage).filter(
        key => !preserveKeys.includes(key)
      );
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`🗑️ Removed localStorage: ${key}`);
      });
      console.log('✅ LocalStorage cleared (preserved user data)');
    } catch (error) {
      console.warn('⚠️ Error clearing localStorage:', error);
    }

    // 5. Mobile-specific: Clear indexedDB (if used)
    if ('indexedDB' in window) {
      try {
        // List all databases and delete them
        const databases = await indexedDB.databases?.() || [];
        await Promise.all(
          databases.map(db => {
            return new Promise((resolve, reject) => {
              const deleteReq = indexedDB.deleteDatabase(db.name);
              deleteReq.onsuccess = () => resolve();
              deleteReq.onerror = () => reject(deleteReq.error);
            });
          })
        );
        console.log('✅ IndexedDB cleared');
      } catch (error) {
        console.warn('⚠️ Error clearing IndexedDB:', error);
      }
    }

    // 6. Mobile-specific: Force clear HTTP cache by reloading with cache busting
    // This is particularly important for iOS Safari and Android Chrome
    // Note: This will trigger a reload, so return early
    if (isMobileDevice()) {
      // Store flag to prevent infinite reload loops
      const cacheClearedFlag = sessionStorage.getItem('cache_cleared');
      if (cacheClearedFlag === 'true') {
        // Already cleared, remove flag and return
        sessionStorage.removeItem('cache_cleared');
        console.log('✅ Cache already cleared, returning...');
        return true;
      }
      
      // Set flag before reload
      sessionStorage.setItem('cache_cleared', 'true');
      
      // Add timestamp to force cache refresh
      const timestamp = Date.now();
      
      // Force reload with cache bypass for mobile browsers
      try {
        const currentUrl = new URL(window.location.href);
        // Remove old cache buster if exists
        currentUrl.searchParams.delete('cb');
        // Add new cache buster
        currentUrl.searchParams.set('cb', timestamp.toString());
        currentUrl.searchParams.set('_', timestamp.toString()); // Extra cache buster
        
        // Navigate to new URL (forces fresh load bypassing all caches)
        console.log('🔄 Reloading with cache busting...');
        window.location.replace(currentUrl.toString()); // Use replace instead of href
        return true; // Will reload, this line may not execute
      } catch (error) {
        // Fallback: Just reload with timestamp
        console.warn('Fallback reload method:', error);
        window.location.href = window.location.pathname + `?cb=${timestamp}` + window.location.hash;
        return true;
      }
    }

    console.log('✅ Cache clearing completed');
    return true;
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    return false;
  }
};

/**
 * Clear cache and refresh page - Mobile-friendly
 */
export const clearCacheAndReload = async () => {
  try {
    // Clear React Query cache first
    if (window.queryClient) {
      clearQueryCache(window.queryClient);
    }
    
    // Clear all caches
    await clearAllCaches();
    
    // On mobile, the clearAllCaches function already reloads
    // On desktop, reload explicitly
    if (!isMobileDevice()) {
      // Desktop: Force reload bypassing cache
      window.location.reload(true);
    }
    // Mobile: reload is handled in clearAllCaches()
  } catch (error) {
    console.error('Error clearing cache and reloading:', error);
    // Fallback: just reload
    window.location.reload(true);
  }
};

/**
 * Add cache-busting parameter to URL
 */
export const addCacheBuster = (url) => {
  if (!url) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_t=${Date.now()}`;
};

/**
 * Clear React Query cache
 */
export const clearQueryCache = (queryClient) => {
  if (queryClient) {
    try {
      queryClient.clear();
      queryClient.invalidateQueries();
      console.log('✅ React Query cache cleared');
    } catch (error) {
      console.warn('⚠️ Error clearing React Query cache:', error);
    }
  }
};

/**
 * Mobile-specific: Check if cache needs clearing
 */
export const shouldClearCache = () => {
  // Check URL parameter
  if (window.location.search.includes('clearCache=true')) {
    return true;
  }
  
  // Check if version has changed (indicating new build)
  const storedVersion = localStorage.getItem('app_version');
  const currentVersion = process.env.REACT_APP_VERSION || '2.0.0';
  
  if (storedVersion && storedVersion !== currentVersion) {
    localStorage.setItem('app_version', currentVersion);
    return true;
  }
  
  return false;
};

export default {
  clearAllCaches,
  clearCacheAndReload,
  addCacheBuster,
  clearQueryCache,
  shouldClearCache,
  isMobileDevice,
};

