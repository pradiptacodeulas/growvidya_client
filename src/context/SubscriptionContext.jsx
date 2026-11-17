import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { getSubscriptionStatus, upgradeSubscription } from '../api/subscription.api';

const SubscriptionContext = createContext(null);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    return {
      subscription: null,
      storageQuota: null,
      hardwareOrders: { attendance_machines: [], rfid_cards: [] },
      notificationWallet: null,
      upgradePlans: [],
      activeCycles: [],
      catalog: null,
      loading: false,
      isTrial: false,
      isExpired: false,
      isSuspended: false,
      isPending: false,
      hasPendingOffline: false,
      isLockedOut: false,
      isActive: false,
      isActivePaid: false,
      isActiveTrial: false,
      pendingSubscription: null,
      daysLeft: 0,
      hasFeature: () => true,
      openUpgradeModal: () => {},
      closeUpgradeModal: () => {},
      refreshSubscription: () => {},
      upgradeToPlan: async () => {},
    };
  }
  return context;
};

export const SubscriptionProvider = ({ children }) => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth || {});
  const [subscription, setSubscription] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [storageQuota, setStorageQuota] = useState(null);
  const [hardwareOrders, setHardwareOrders] = useState({
    attendance_machines: [],
    rfid_cards: [],
  });
  const [upgradePlans, setUpgradePlans] = useState([]);
  const [activeCycles, setActiveCycles] = useState([]);
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(false);

  const activeSubscription = hasLoaded ? subscription : (subscription || user?.subscription || null);

  const hasSubscription = Boolean(
    activeSubscription &&
      (activeSubscription.subscription_id || activeSubscription.id || activeSubscription.plan_id)
  );

  // Primary status is 'pending' ONLY when the school has NO active/trial subscription and is awaiting initial/post-expiry offline verification.
  const isPending = Boolean(
    activeSubscription &&
      (activeSubscription.liveStatus === 'pending' ||
        (activeSubscription.status === 'pending' && activeSubscription.isPending !== false))
  );

  const isSuspended = Boolean(
    activeSubscription &&
      (activeSubscription.liveStatus === 'suspended' || activeSubscription.status === 'suspended')
  );

  // Separate flag for when an ACTIVE school also has a queued offline bank transfer renewal/upgrade/add-on
  const pendingSubscription =
    activeSubscription?.pending_subscription ||
    activeSubscription?.pendingSubscription ||
    (isPending ? activeSubscription : null);

  const hasPendingOffline = Boolean(
    activeSubscription?.has_pending_offline || pendingSubscription
  );

  // 100% dynamic trial detection — zero hardcoded plan names
  const isTrial = activeSubscription
    ? Boolean(
        activeSubscription.isTrial ||
          activeSubscription.status === 'trial' ||
          String(activeSubscription.billing_cycle || '').toLowerCase() === 'trial' ||
          activeSubscription.payment_gateway === 'free_trial'
      )
    : false;

  const getDynamicDaysLeft = (sub) => {
    if (!sub) return 0;
    if (sub.days_left !== undefined && sub.days_left !== null) {
      return Math.max(0, Number(sub.days_left));
    }
    if (sub.end_date) {
      try {
        const endStr = String(sub.end_date).slice(0, 10);
        const end = new Date(`${endStr}T23:59:59+05:30`);
        const now = new Date();
        const diffTime = end.getTime() - now.getTime();
        if (diffTime < 0) return -1;
        return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
      } catch {
        return 0;
      }
    }
    return 0;
  };

  const rawDaysLeft = getDynamicDaysLeft(activeSubscription);
  const daysLeft = Math.max(0, rawDaysLeft);

  // Note: days_left === 0 means expires TODAY (still active until 23:59:59 IST); actual_days_left < 0 is expired.
  const isExpired =
    activeSubscription && !isPending && !isSuspended
      ? Boolean(
          activeSubscription.isExpired ||
            activeSubscription.liveStatus === 'expired' ||
            activeSubscription.liveStatus === 'rejected' ||
            activeSubscription.status === 'expired' ||
            activeSubscription.status === 'rejected' ||
            (activeSubscription.actual_days_left !== undefined &&
              activeSubscription.actual_days_left !== null &&
              Number(activeSubscription.actual_days_left) < 0) ||
            rawDaysLeft < 0
        )
      : false;

  const isLockedOut = Boolean(
    isExpired || isSuspended || isPending || (hasLoaded && !hasSubscription)
  );
  const isActive = Boolean(hasSubscription && !isLockedOut);
  const isActivePaid = Boolean(isActive && !isTrial);
  const isActiveTrial = Boolean(isActive && isTrial);

  const notificationWallet = activeSubscription?.notification_wallet || null;

  const hasFeature = useCallback(() => true, []);

  // Reset cached subscription state immediately on logout so another school/session never inherits stale data
  useEffect(() => {
    const hasAdminToken =
      typeof window !== 'undefined' &&
      Boolean(localStorage.getItem('admin_token') || localStorage.getItem('token'));
    if (!user && !hasAdminToken) {
      setSubscription(null);
      setHasLoaded(false);
      setStorageQuota(null);
      setHardwareOrders({ attendance_machines: [], rfid_cards: [] });
      setUpgradePlans([]);
      setActiveCycles([]);
      setCatalog(null);
    }
  }, [user]);

  const refreshSubscription = useCallback(async () => {
    const hasAdminToken =
      typeof window !== 'undefined' &&
      (localStorage.getItem('admin_token') || localStorage.getItem('token'));
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const isProtectedAdminPath =
      currentPath.startsWith('/admin') &&
      !currentPath.startsWith('/admin/login') &&
      currentPath !== '/account/login/adminlogin';

    if (!hasAdminToken && !user && !isProtectedAdminPath) return;

    try {
      setLoading(true);
      const data = await getSubscriptionStatus();
      if (data && Object.prototype.hasOwnProperty.call(data, 'subscription')) {
        setSubscription(data.subscription || null);
        setHasLoaded(true);
      } else if (data?.subscription) {
        setSubscription(data.subscription);
        setHasLoaded(true);
      }
      if (data?.storage_quota) {
        setStorageQuota(data.storage_quota);
      }
      if (data?.hardware_orders) {
        setHardwareOrders({
          attendance_machines: Array.isArray(data.hardware_orders.attendance_machines)
            ? data.hardware_orders.attendance_machines
            : [],
          rfid_cards: Array.isArray(data.hardware_orders.rfid_cards)
            ? data.hardware_orders.rfid_cards
            : [],
        });
      }
      if (Array.isArray(data?.upgrade_plans)) {
        setUpgradePlans(data.upgrade_plans);
      }
      if (Array.isArray(data?.active_cycles)) {
        setActiveCycles(data.active_cycles);
      }
      if (data?.catalog) {
        setCatalog(data.catalog);
      }
    } catch (err) {
      console.warn('Could not load subscription status:', err?.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription]);

  // Listen for global 402 HTTP interceptor event on Admin Portal
  useEffect(() => {
    const handleSubscriptionExpired = (event) => {
      const code = event?.detail?.code || 'SUBSCRIPTION_EXPIRED';
      console.warn('[SubscriptionContext] 402/403 Subscription lock event captured:', code, event.detail);

      setHasLoaded(true);
      setSubscription((prev) => {
        if (code === 'SUBSCRIPTION_SUSPENDED') {
          return {
            ...(prev || {}),
            isExpired: false,
            isPending: false,
            liveStatus: 'suspended',
            status: 'suspended',
          };
        }
        if (code === 'SUBSCRIPTION_PENDING_APPROVAL' || code === 'SUBSCRIPTION_PENDING') {
          return {
            ...(prev || {}),
            isExpired: false,
            isPending: true,
            liveStatus: 'pending',
            status: 'pending',
          };
        }
        if (code === 'SUBSCRIPTION_REQUIRED' || code === 'NO_ACTIVE_SUBSCRIPTION') {
          return prev
            ? {
                ...prev,
                subscription_id: null,
                isExpired: true,
                isPending: false,
                liveStatus: 'expired',
                status: 'expired',
                days_left: 0,
                actual_days_left: -1,
              }
            : null;
        }
        if (code === 'SUBSCRIPTION_REJECTED') {
          return {
            ...(prev || {}),
            isExpired: true,
            isPending: false,
            liveStatus: 'rejected',
            status: 'rejected',
            days_left: 0,
            actual_days_left: -1,
          };
        }
        return {
          ...(prev || {}),
          isExpired: true,
          liveStatus: 'expired',
          status: 'expired',
          days_left: 0,
          actual_days_left: -1,
        };
      });
    };

    window.addEventListener('subscription_expired', handleSubscriptionExpired);
    return () => {
      window.removeEventListener('subscription_expired', handleSubscriptionExpired);
    };
  }, []);

  const openUpgradeModal = useCallback(() => {
    navigate('/admin/subscription');
  }, [navigate]);

  const closeUpgradeModal = useCallback(() => {}, []);

  const upgradeToPlan = async (payload) => {
    const result = await upgradeSubscription(payload);
    await refreshSubscription();
    return result;
  };

  return (
    <SubscriptionContext.Provider
      value={{
        subscription: activeSubscription,
        hasSubscription,
        storageQuota,
        hardwareOrders,
        notificationWallet,
        upgradePlans,
        activeCycles,
        catalog,
        loading,
        isTrial,
        isExpired,
        isSuspended,
        isPending,
        hasPendingOffline,
        isLockedOut,
        isActive,
        isActivePaid,
        isActiveTrial,
        pendingSubscription,
        daysLeft,
        hasFeature,
        openUpgradeModal,
        closeUpgradeModal,
        refreshSubscription,
        upgradeToPlan,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};
