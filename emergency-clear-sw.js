// Emergency Service Worker Fix Script
// Copy and paste this into browser console (F12) to fix infinite refresh

console.log('🛠️ Clearing Service Workers and Cache...');

// Unregister all service workers
navigator.serviceWorker.getRegistrations().then(function(registrations) {
  for(let registration of registrations) {
    registration.unregister().then(function(success) {
      if (success) {
        console.log('✅ Service Worker unregistered');
      }
    });
  }
});

// Clear all caches
caches.keys().then(function(names) {
  for (let name of names) {
    caches.delete(name).then(function(success) {
      if (success) {
        console.log('✅ Cache cleared:', name);
      }
    });
  }
});

// Clear local storage
localStorage.clear();
console.log('✅ Local storage cleared');

// Clear session storage
sessionStorage.clear();
console.log('✅ Session storage cleared');

console.log('✅ All cleared! Close browser and restart.');
console.log('⚠️ DO NOT refresh yet - close the browser completely first!');
