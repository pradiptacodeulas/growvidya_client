// Growvidya Service Worker for Web Push Notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listen for incoming Web Push events from the Growvidya server
self.addEventListener('push', (event) => {
  let notificationData = {
    title: 'Growvidya Notification',
    body: 'You have a new update.',
    icon: '/favicon.png',
    badge: '/favicon.png',
    data: { url: '/' },
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      notificationData = {
        title: parsed.title || notificationData.title,
        body: parsed.body || notificationData.body,
        icon: parsed.icon || notificationData.icon,
        badge: parsed.badge || notificationData.badge,
        data: parsed.data || notificationData.data,
        tag: parsed.tag || parsed.data?.tag || null,
      };
    }
  } catch (err) {
    if (event.data) {
      notificationData.body = event.data.text();
    }
  }

  // Derive deterministic tag so that multiple messages in the same chat update in-place
  // and duplicate push deliveries are seamlessly collapsed by the OS
  const determinedTag =
    notificationData.tag ||
    notificationData.data?.tag ||
    (notificationData.data?.type === 'chat'
      ? `chat_${notificationData.data?.senderRole || 'user'}_${notificationData.data?.senderId || 'anon'}`
      : `growvidya-${notificationData.data?.category || 'alert'}`);

  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    vibrate: [200, 100, 200],
    data: notificationData.data,
    tag: determinedTag,
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(notificationData.title, options));
});

// Handle notification banner clicks (focus open tab or open target page)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a Growvidya window is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          if (targetUrl && client.url.includes(targetUrl)) {
            return client.focus();
          }
          if ('navigate' in client && targetUrl) {
            client.focus();
            return client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
