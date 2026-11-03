import React, { useState, useEffect } from 'react';
import {
  isWebPushSupported,
  getNotificationPermission,
  subscribeToWebPush,
} from '../../services/webPush.service';
import { toast } from '../../utils/customToast';

/**
 * Modern, non-intrusive prompt banner for Web Push Notifications.
 * Displays when browser notifications are supported and permission is 'default'.
 */
const NotificationPermissionBanner = () => {
  const [permission, setPermission] = useState(() => getNotificationPermission());
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem('growvidya_push_banner_dismissed') === 'true';
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Keep local permission in sync if user changes settings in browser
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  if (!isWebPushSupported() || permission !== 'default' || dismissed) {
    return null;
  }

  const handleEnable = async () => {
    setLoading(true);
    try {
      const res = await subscribeToWebPush(true);
      const newPerm = getNotificationPermission();
      setPermission(newPerm);

      if (res?.success || newPerm === 'granted') {
        toast.success('Desktop notifications enabled! You will now receive instant alerts.');
      } else if (newPerm === 'denied' || res?.reason === 'permission_denied') {
        toast.info('Notifications were not allowed. You can enable them anytime from the lock icon in your address bar.');
      }
    } catch (err) {
      console.warn('[NotificationPermissionBanner Enable Error]:', err);
      toast.error('Unable to enable notifications at this time.');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('growvidya_push_banner_dismissed', 'true');
    } catch (_) {}
  };

  return (
    <div
      className="alert alert-primary alert-dismissible fade show mb-0 border-0 rounded-0 d-flex align-items-center justify-content-between px-3 py-2 shadow-xs"
      style={{
        backgroundColor: '#2460e7',
        color: '#ffffff',
        position: 'relative',
        zIndex: 1020,
      }}
      role="alert"
    >
      <div className="d-flex align-items-center gap-2 overflow-hidden me-2">
        <span
          className="badge bg-white text-primary rounded-circle p-1 d-flex align-items-center justify-content-center flex-shrink-0"
          style={{ width: '26px', height: '26px' }}
        >
          <i className="ti ti-bell-ringing fs-14"></i>
        </span>
        <span className="fs-13 fw-normal text-truncate">
          <strong>Stay updated:</strong> Enable desktop notifications to get instant alerts for messages and notices.
        </span>
      </div>

      <div className="d-flex align-items-center gap-2 flex-shrink-0">
        <button
          type="button"
          className="btn btn-light btn-sm fw-semibold text-primary px-3 py-1 fs-12 shadow-xs"
          onClick={handleEnable}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              Enabling...
            </>
          ) : (
            'Enable Notifications'
          )}
        </button>
        <button
          type="button"
          className="btn btn-link text-white text-decoration-none p-1 fs-14 opacity-75 hover-opacity-100"
          onClick={handleDismiss}
          title="Dismiss for this session"
          aria-label="Close"
        >
          <i className="ti ti-x"></i>
        </button>
      </div>
    </div>
  );
};

export default NotificationPermissionBanner;
