'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Register service worker when DOM is ready
    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });

        // Listen for new service worker installations / updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // A new update is available. Prompting or applying gracefully
              console.log('[TimeSwap PWA] New version installed and ready.');
            }
          });
        });
      } catch (err) {
        // Safe degrade: app works normally without service worker
        console.warn('[TimeSwap PWA] Service worker registration failed:', err);
      }
    };

    window.addEventListener('load', registerSW);
    return () => {
      window.removeEventListener('load', registerSW);
    };
  }, []);

  return null;
}
