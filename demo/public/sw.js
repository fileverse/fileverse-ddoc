// This is a basic service worker for development testing
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(Promise.resolve());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activated, claiming clients...');
  event.waitUntil(self.clients.claim());
  
  // Display a notification to the user that the service worker has been activated
  if (self.registration && self.registration.showNotification) {
    self.registration.showNotification('Service Worker Activated', {
      body: 'The reminder notification system is now ready to use.',
      icon: '/icons/apple-icon.png',
      tag: 'sw-activation',
      requireInteraction: false,
      silent: true
    }).then(() => {
      console.log('[Service Worker] Activation notification sent');
    }).catch(err => {
      console.error('[Service Worker] Failed to send activation notification:', err);
    });
  }
});

// Log all received messages
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Received message:', event.data);
  
  // Process message commands
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const payload = event.data.payload;
    console.log('[Service Worker] Showing notification from message:', payload);
    
    self.registration.showNotification(payload.title, payload).catch(error => {
      console.error('[Service Worker] Error showing notification from message:', error);
    });
  }
  
  // Handle direct test request
  if (event.data && event.data.type === 'TEST_NOTIFICATION_DIRECT') {
    const payload = event.data.payload;
    console.log('[Service Worker] Showing direct test notification:', payload);
    
    self.testNotification(payload.title, payload.body);
  }
});

// Add event listeners for notifications
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event);
  event.notification.close();
  
  // Handle notification click
  const action = event.action;
  const notification = event.notification;
  const notificationData = notification.data || {};
  
  console.log('[Service Worker] Notification clicked with action:', action);
  console.log('[Service Worker] Notification data:', notificationData);

  // Check if this is a reminder notification
  if (notification.tag && notification.tag.startsWith('reminder-')) {
    // Handle reminder-specific actions
    if (action === 'view') {
      // Open the document where the reminder was created
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
    // For 'dismiss' action, we just close the notification, which is already done
  } else if (action === 'explore') {
    // Handle default "View More" action for non-reminder notifications
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
  console.log('[Service Worker] Notification was closed', event.notification);
});

// Handle push notifications (when received from a server)
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received:', event);
  
  if (!event.data) {
    console.log('[Service Worker] Push event but no data');
    return;
  }
  
  try {
    const data = event.data.json();
    console.log('[Service Worker] Push data (JSON):', data);
    
    const options = {
      body: data.body || 'New notification',
      icon: '/icons/apple-icon.png', 
      badge: data.badge,
      tag: data.tag || 'default-push-tag',
      requireInteraction: true,
      vibrate: [200, 100, 200], // Add vibration
      silent: false,
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
    
    console.log('[Service Worker] Showing notification with options:', options);
    event.waitUntil(
      self.registration.showNotification(data.title || 'New Notification', options)
    );
  } catch (e) {
    console.error('[Service Worker] Error processing push data:', e);
    
    // Fallback for text data
    try {
      const text = event.data.text();
      console.log('[Service Worker] Push data (text):', text);
      
      event.waitUntil(
        self.registration.showNotification('New Notification', {
          body: text,
          icon: '/icons/apple-icon.png', 
          tag: 'push-text-fallback',
          requireInteraction: true,
          vibrate: [200, 100, 200], // Add vibration
          silent: false
        })
      );
    } catch (textError) {
      console.error('[Service Worker] Error handling text fallback:', textError);
    }
  }
});

// Direct test function to trigger a notification
self.testNotification = function(title, message) {
  console.log('[Service Worker] Direct test notification called with:', title, message);
  return self.registration.showNotification(title || 'Test Notification', {
    body: message || 'This is a test notification',
    icon: '/icons/apple-icon.png', 
    tag: 'direct-test',
    requireInteraction: true,
    vibrate: [200, 100, 200], // Add vibration
    silent: false,
    actions: [
      {
        action: 'explore',
        title: 'View',
      },
      {
        action: 'close',
        title: 'Dismiss',
      }
    ]
  });
};

// Test notification directly on activation
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activated, ready for notifications');
  event.waitUntil(Promise.resolve());
});

// This is to make testing easier
self.addEventListener('fetch', (event) => {
  // Just pass through - no special handling needed for this demo
  // But logging the URL can help with debugging
  if (event.request.url.includes('notification') || event.request.url.includes('sw.js')) {
    console.log('[Service Worker] Fetch:', event.request.url);
  }
}); 