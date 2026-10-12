import { getApiBaseUrl } from '../utils/url.util';
import { apiFetch } from '../api/fetch.config';

/**
 * Utility to convert URL-safe base64 string to Uint8Array for VAPID applicationServerKey
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if the current browser environment supports Service Workers and Push API
 */
export const isWebPushSupported = () => {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
};

/**
 * Get current browser notification permission status ('default', 'granted', 'denied')
 */
export const getNotificationPermission = () => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
};

/**
 * Register the Service Worker in the browser
 */
export const registerServiceWorker = async () => {
  if (!isWebPushSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return registration;
  } catch (err) {
    console.warn('[ServiceWorker registration failed]:', err);
    return null;
  }
};

/**
 * Subscribe to Web Push notifications and register token with Growvidya backend
 * @param {boolean} userInitiated - true if triggered by clicking a button (allows permission prompt)
 */
export const subscribeToWebPush = async (userInitiated = false) => {
  if (!isWebPushSupported()) {
    return { success: false, reason: 'unsupported' };
  }

  try {
    // 1. Check or request permission
    let permission = Notification.permission;
    if (userInitiated && permission !== 'granted') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      return { success: false, reason: 'permission_denied' };
    }

    // 2. Ensure Service Worker is registered and active
    let registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      registration = await registerServiceWorker();
    }
    await navigator.serviceWorker.ready;

    // 3. Fetch public VAPID key from backend
    const vapidRes = await fetch(`${getApiBaseUrl()}/notifications/vapid-public-key`);
    const vapidJson = await vapidRes.json();
    if (!vapidJson.success || !vapidJson.vapidPublicKey) {
      throw new Error('Failed to retrieve VAPID public key from server');
    }

    // 4. Retrieve existing or create new push subscription
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const convertedVapidKey = urlBase64ToUint8Array(vapidJson.vapidPublicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });
    }

    // 5. Send subscription to Growvidya backend
    const browserName = getBrowserName();
    await apiFetch('/notifications/device-token', {
      method: 'POST',
      body: JSON.stringify({
        token: subscription,
        device_type: 'web',
        device_name: browserName,
      }),
    });

    localStorage.setItem('web_push_subscribed', 'true');
    return { success: true, subscription };
  } catch (err) {
    console.error('[subscribeToWebPush Error]:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Unregister Web Push token on logout
 */
export const unsubscribeFromWebPush = async () => {
  if (!isWebPushSupported()) return;

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return;

    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      // Notify backend to deactivate token
      await apiFetch('/notifications/device-token', {
        method: 'DELETE',
        body: JSON.stringify({
          token: subscription,
        }),
      }).catch(() => {});

      await subscription.unsubscribe().catch(() => {});
    }

    localStorage.removeItem('web_push_subscribed');
  } catch (err) {
    console.warn('[unsubscribeFromWebPush Error]:', err);
  }
};

/**
 * Send a test push notification to verify end-to-end receipt
 */
export const sendTestPushNotification = async () => {
  try {
    const res = await apiFetch('/notifications/test', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Growvidya Notification Test',
        body: 'Push notifications are connected and working properly!',
      }),
    });
    return res;
  } catch (err) {
    console.warn('[sendTestPushNotification Error]:', err);
    return null;
  }
};

/**
 * Helper to identify browser name for friendly device listing
 */
function getBrowserName() {
  if (typeof navigator === 'undefined') return 'Web Browser';
  const ua = navigator.userAgent;
  if (ua.includes('Edg/')) return 'Microsoft Edge';
  if (ua.includes('Chrome/')) return 'Google Chrome';
  if (ua.includes('Firefox/')) return 'Mozilla Firefox';
  if (ua.includes('Safari/') && !ua.includes('Chrome')) return 'Apple Safari';
  return 'Web Browser';
}
