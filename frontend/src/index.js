import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

/**
 * Service Worker Registration for PWA
 * Registers when: production build OR deployed on tatubu.com (so push works on phones).
 */
const shouldRegisterServiceWorker = () => {
  if (!('serviceWorker' in navigator)) return false;
  const isProductionBuild = process.env.NODE_ENV === 'production';
  const isProductionHost = typeof window !== 'undefined' &&
    (window.location.hostname === 'tatubu.com' || window.location.hostname.endsWith('.tatubu.com'));
  return isProductionBuild || isProductionHost;
};

if (shouldRegisterServiceWorker()) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js', {
        scope: '/',
        updateViaCache: 'none'
      })
      .then((registration) => {
        console.log('✅ Service Worker registered successfully');
        
        // Handle updates without auto-reload
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('🔄 New version available. Refresh to update.');
                // Show user-friendly update notification
                if (window.confirm('تحديث جديد متاح. هل تريد إعادة التحميل؟')) {
                  window.location.reload();
                }
              }
            });
          }
        });
        
        // Check for updates every 30 minutes (not too aggressive)
        setInterval(() => {
          registration.update().catch(console.warn);
        }, 1800000);
      })
      .catch((error) => {
        console.error('❌ Service Worker registration failed:', error);
      });
  });
} else if ('serviceWorker' in navigator) {
  const isProductionHost = typeof window !== 'undefined' &&
    (window.location.hostname === 'tatubu.com' || window.location.hostname.endsWith('.tatubu.com'));
  if (!isProductionHost) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
    console.log('🔧 Development (non-production host): Service Worker disabled');
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

