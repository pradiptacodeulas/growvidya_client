import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { getSubscriptionStatus, upgradeSubscription } from '../api/subscription.api';
import UpgradeModal from '../components/subscription/UpgradeModal';
import TrialExpiredLockoutModal from '../components/subscription/TrialExpiredLockoutModal';

const SubscriptionContext = createContext(null);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    return {
      subscription: null,
      storageQuota: null,
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
  const { user } = useSelector((state) => state.auth || {});
  const [subscription, setSubscription] = useState(null);
  const [storageQuota, setStorageQuota] = useState(null);
  const [upgradePlans, setUpgradePlans] = useState([]);
  const [activeCycles, setActiveCycles] = useState([]);
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isLockoutModalOpen, setIsLockoutModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const activeSubscription = subscription || user?.subscription || null;

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

  const isLockedOut = Boolean(isExpired || isSuspended || isPending);
  const isActive = Boolean(hasSubscription && !isLockedOut);
  const isActivePaid = Boolean(isActive && !isTrial);
  const isActiveTrial = Boolean(isActive && isTrial);

  const notificationWallet = activeSubscription?.notification_wallet || null;

  const hasFeature = useCallback(() => true, []);

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
      if (data?.subscription) {
        setSubscription(data.subscription);
        setIsLockoutModalOpen(false);
      }
      if (data?.storage_quota) {
        setStorageQuota(data.storage_quota);
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
      console.warn('[SubscriptionContext] 402 Subscription lock event captured:', code, event.detail);

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
        if (code === 'SUBSCRIPTION_PENDING_APPROVAL') {
          return {
            ...(prev || {}),
            isExpired: false,
            isPending: true,
            liveStatus: 'pending',
            status: 'pending',
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
      setIsLockoutModalOpen(false);
    };

    window.addEventListener('subscription_expired', handleSubscriptionExpired);
    return () => {
      window.removeEventListener('subscription_expired', handleSubscriptionExpired);
    };
  }, []);

  const [preselectedPlanId, setPreselectedPlanId] = useState(null);

  const openUpgradeModal = (planId = null) => {
    if (planId) {
      setPreselectedPlanId(planId);
    } else if (subscription?.plan_id) {
      setPreselectedPlanId(subscription.plan_id);
    } else {
      setPreselectedPlanId(null);
    }
    setIsUpgradeModalOpen(true);
  };

  const closeUpgradeModal = () => {
    setIsUpgradeModalOpen(false);
    setPreselectedPlanId(null);
  };

  const upgradeToPlan = async (payload) => {
    const result = await upgradeSubscription(payload);
    setIsLockoutModalOpen(false);
    setIsUpgradeModalOpen(false);
    await refreshSubscription();
    return result;
  };

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        storageQuota,
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

      {isLockoutModalOpen && !isPending && (
        <TrialExpiredLockoutModal
          subscription={subscription}
          plans={upgradePlans}
          activeCycles={activeCycles}
          onUpgrade={upgradeToPlan}
          refreshSubscription={refreshSubscription}
        />
      )}

      {isUpgradeModalOpen && !isLockoutModalOpen && (
        <UpgradeModal
          isOpen={isUpgradeModalOpen}
          onClose={closeUpgradeModal}
          plans={upgradePlans}
          activeCycles={activeCycles}
          currentPlanId={subscription?.plan_id}
          subscription={subscription}
          initialPlanId={preselectedPlanId}
          onUpgrade={upgradeToPlan}
          refreshSubscription={refreshSubscription}
          isLockout={false}
        />
      )}
    </SubscriptionContext.Provider>
  );
};
