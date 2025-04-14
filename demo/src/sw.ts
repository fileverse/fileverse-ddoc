/// <reference lib="webworker" />

import { defaultCache } from '@serwist/vite/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist } from 'serwist';

// This declares the value of `injectionPoint` to TypeScript.
// `injectionPoint` is the string that will be replaced by the
// actual precache manifest. By default, this string is set to
// `"self.__SW_MANIFEST"`.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

// Add event listeners for notifications
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // Handle notification click
  const action = event.action;
  const notification = event.notification;
  const notificationData = notification.data || {};
  
  console.log('Notification clicked with action:', action);
  console.log('Notification data:', notificationData);

  if (action === 'explore') {
    // Handle the "View More" action
    const urlToOpen = notificationData.url || '/';
    
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clientList) => {
        // Check if a window is already open
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // If no window is open, open a new one
        return self.clients.openWindow(urlToOpen);
      })
    );
  }
});

self.addEventListener('notificationclose', (event) => {
  console.log('Notification was closed', event.notification);
});

// Handle push notifications (when received from a server)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    const options = {
      body: data.body || 'New notification',
      icon: data.icon || '/icons/apple-icon.png',
      badge: data.badge,
      data: data.data || {},
      actions: data.actions || [
        {
          action: 'explore',
          title: 'View',
        },
        {
          action: 'close',
          title: 'Dismiss',
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'New Notification', options)
    );
  } catch (e) {
    console.error('Error showing push notification:', e);
    
    // Fallback for text data
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('New Notification', {
        body: text,
        icon: '/icons/apple-icon.png'
      })
    );
  }
});
