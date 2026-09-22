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
      upgradePlans: [],
      loading: false,
      isTrial: false,
      isExpired: false,
      daysLeft: 0,
      openUpgradeModal: () => {},
      closeUpgradeModal: () => {},
      refreshSubscription: () => {},
      upgradeToPlan: async () => {},
    };
  }
  return context;
};

export const SubscriptionProvider = ({ children }) => {
  const { user } = useSelector((state) => state.auth);
  const [subscription, setSubscription] = useState(null);
  const [upgradePlans, setUpgradePlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isLockoutModalOpen, setIsLockoutModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const activeSubscription = subscription || user?.subscription || null;
  const activePlanName = activeSubscription?.plan_name || '';
  const planNameLower = activePlanName.toLowerCase();

  const isTrial = activeSubscription
    ? Boolean(
        activeSubscription.isTrial ||
        activeSubscription.billing_cycle === 'trial' ||
        (activeSubscription.plan_code || '').toLowerCase().includes('trial')
      ) &&
      activeSubscription.billing_cycle !== 'annual' &&
      activeSubscription.billing_cycle !== 'monthly' &&
      !planNameLower.includes('starter') &&
      !planNameLower.includes('growth') &&
      !planNameLower.includes('enterprise')
    : false;

  const daysLeft = activeSubscription?.days_left !== undefined
    ? Math.max(0, Number(activeSubscription.days_left))
    : 0;

  const isExpired = activeSubscription
    ? Boolean(
        activeSubscription.isExpired ||
        activeSubscription.liveStatus === 'expired' ||
        activeSubscription.status === 'expired' ||
        daysLeft <= 0
      )
    : false;

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
        // Keep sidebar and Subscription menu visible and accessible
        setIsLockoutModalOpen(false);
      }
      if (Array.isArray(data?.upgrade_plans)) {
        setUpgradePlans(data.upgrade_plans);
      }
    } catch (err) {
      console.warn('Could not load subscription status:', err?.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial load when component mounts or user/route changes
  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription, user]);

  // Listen for global 402 HTTP interceptor event
  useEffect(() => {
    const handleSubscriptionExpired = (event) => {
      console.warn('[SubscriptionContext] 402 Subscription Expired event captured:', event.detail);
      setSubscription((prev) => ({
        ...(prev || {}),
        isExpired: true,
        liveStatus: 'expired',
        status: 'expired',
        days_left: 0,
      }));
      // Keep sidebar visible and Subscription menu accessible
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
        upgradePlans,
        loading,
        isTrial,
        isExpired,
        daysLeft,
        openUpgradeModal,
        closeUpgradeModal,
        refreshSubscription,
        upgradeToPlan,
      }}
    >
      {children}

      {/* Global Non-Dismissible Lockout Modal if trial/subscription has expired */}
      {isLockoutModalOpen && (
        <TrialExpiredLockoutModal
          subscription={subscription}
          plans={upgradePlans}
          onUpgrade={upgradeToPlan}
          refreshSubscription={refreshSubscription}
        />
      )}

      {/* Self-Service Upgrade / Renewal Modal when admin clicks "Upgrade Now" or "Renew" */}
      {isUpgradeModalOpen && !isLockoutModalOpen && (
        <UpgradeModal
          isOpen={isUpgradeModalOpen}
          onClose={closeUpgradeModal}
          plans={upgradePlans}
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
