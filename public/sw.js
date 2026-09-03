// CommunityConnect PWA Service Worker for Native Push Notifications

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle Background Push Event
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || 'CommunityConnect';
  const options = {
    body: data.body || 'You have a new update from CommunityConnect.',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/badge-72x72.png',
    vibrate: [100, 50, 100, 50, 100],
    data: {
      url: data.url || '/notifications',
      timestamp: Date.now(),
      ...data.data,
    },
    actions: data.actions || [
      { action: 'open', title: 'Open' }
    ],
    tag: data.tag || 'community-connect-notification',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle Notification Click / Action
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  let targetUrl = 'https://community-connect-frontend-5oe1-beta.vercel.app/notifications';
  
  if (event.notification.data && event.notification.data.url) {
    let rawUrl = event.notification.data.url;
    if (rawUrl.includes('localhost')) {
      rawUrl = rawUrl.replace(/^https?:\/\/localhost:\d+/, 'https://community-connect-frontend-5oe1-beta.vercel.app');
    } else if (rawUrl.startsWith('/')) {
      rawUrl = 'https://community-connect-frontend-5oe1-beta.vercel.app' + rawUrl;
    }
    targetUrl = rawUrl;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      // If a window client on deployed origin is open, focus it and navigate
      for (const client of clientList) {
        if (client.url && client.url.includes('community-connect-frontend-5oe1-beta.vercel.app')) {
          if ('focus' in client) {
            await client.focus();
          }
          if ('navigate' in client && targetUrl) {
            return client.navigate(targetUrl);
          }
          return;
        }
      }

      // If no deployed origin tab is open, open a new window to the deployed URL directly
      if (self.clients.openWindow && targetUrl) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
