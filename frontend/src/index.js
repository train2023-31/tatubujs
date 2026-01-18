import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Register Service Worker for PWA and Push Notifications
if ('serviceWorker' in navigator) {
  // Wait for page to be fully loaded
  window.addEventListener('load', () => {
    // Add a small delay to ensure all resources are loaded
    setTimeout(() => {
      navigator.serviceWorker
        .register('/service-worker.js', {
          scope: '/',
          updateViaCache: 'none' // Always check for updates
        })
        .then((registration) => {
          console.log('✅ Service Worker registered successfully:', registration.scope);
          
          // Check if there's an update available
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('🔄 New service worker available. Reload to update.');
                }
              });
            }
          });
          
          // Check for updates periodically (but less frequently)
          setInterval(() => {
            registration.update().catch((err) => {
              console.warn('Service Worker update check failed:', err);
            });
          }, 300000); // Check every 5 minutes instead of every minute
        })
        .catch((error) => {
          console.error('❌ Service Worker registration failed:', error);
          console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
          });
          
          // Try to unregister any existing broken service workers
          navigator.serviceWorker.getRegistrations().then((registrations) => {
            registrations.forEach((registration) => {
              registration.unregister().then((success) => {
                if (success) {
                  console.log('🗑️ Unregistered broken service worker');
                }
              });
            });
          });
        });
    }, 1000); // 1 second delay
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

