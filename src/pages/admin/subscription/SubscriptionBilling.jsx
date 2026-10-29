import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useSubscription } from '../../../context/SubscriptionContext';
import { loadRazorpayScript } from '../../../utils/loadRazorpay';
import { resolveImageUrl } from '../../../utils/url.util';
import {
  createAddonOrder,
  verifyAddonPayment,
  purchaseAddonsOffline,
  recordSubscriptionPaymentFailure,
  validateSubscriptionCoupon,
  getSubscriptionOrders,
} from '../../../api/subscription.api';

const NO_IMAGE_PLACEHOLDER = '/assets_admin/no_iamge.webp';

const formatDateDisplay = (val) => {
  if (!val) return '—';
  const str = String(val).slice(0, 10);
  const parts = str.split('-');
  if (parts.length === 3) {
    const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (!Number.isNaN(dt.getTime())) {
      return dt.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
  }
  return str;
};

const SubscriptionBilling = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useSelector((state) => state.auth || {});
  const {
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
    isActive,
    isActivePaid,
    isActiveTrial,
    pendingSubscription,
    daysLeft,
    refreshSubscription,
  } = useSubscription();

  // Active Top-Level Tab: 'plans' | 'addons' | 'history'
  const tabParam = searchParams.get('tab');
  const gatewayParam = searchParams.get('gateway');
  const [activeTab, setActiveTab] = useState(() =>
    ['plans', 'addons', 'history'].includes(tabParam) ? tabParam : 'plans'
  );

  useEffect(() => {
    const resolvedTab = ['plans', 'addons', 'history'].includes(tabParam) ? tabParam : 'plans';
    setActiveTab((prev) => (prev !== resolvedTab ? resolvedTab : prev));
  }, [tabParam]);

  const handleSwitchTab = (tabKey) => {
    setActiveTab(tabKey);
    const next = new URLSearchParams(searchParams);
    next.set('tab', tabKey);
    if (tabKey !== 'addons') next.delete('gateway');
    setSearchParams(next, { replace: true });
  };

  // Dynamic Billing Cycles derived strictly from DB plans (zero hardcoded cycles)
  const availableCycles = useMemo(() => {
    if (Array.isArray(activeCycles) && activeCycles.length > 0) {
      return activeCycles
        .filter((c) => String(c.cycle || c.code || '').toLowerCase() !== 'trial')
        .map((c) => ({ ...c, cycle: c.cycle || c.code }));
    }
    const map = new Map();
    (upgradePlans || []).forEach((p) => {
      const c = String(p.billing_cycle || '').toLowerCase();
      if (c && c !== 'trial' && !map.has(c) && p.cycle_meta) {
        map.set(c, { ...p.cycle_meta, cycle: p.cycle_meta.cycle || p.cycle_meta.code || c });
      }
    });
    return Array.from(map.values()).sort(
      (a, b) => (a.rank ?? a.months ?? 0) - (b.rank ?? b.months ?? 0)
    );
  }, [activeCycles, upgradePlans]);

  const resolveCycleMeta = (cycleKey) => {
    const k = String(cycleKey || '').toLowerCase();
    const matched = availableCycles.find((c) => String(c.cycle || c.code || '').toLowerCase() === k);
    if (matched) return matched;
    if (subscription?.cycle_meta && String(subscription.billing_cycle || '').toLowerCase() === k) {
      return subscription.cycle_meta;
    }
    return { cycle: k, label: cycleKey || '', shortLabel: cycleKey || '' };
  };

  const [selectedBillingCycle, setBillingCycle] = useState('');

  const billingCycle = useMemo(() => {
    if (selectedBillingCycle && availableCycles.some((c) => c.cycle === selectedBillingCycle)) {
      return selectedBillingCycle;
    }
    const subCycle = String(subscription?.billing_cycle || '').toLowerCase();
    if (subCycle && subCycle !== 'trial' && availableCycles.some((c) => c.cycle === subCycle)) {
      return subCycle;
    }
    if (availableCycles.some((c) => c.cycle === 'annual')) {
      return 'annual';
    }
    return availableCycles[0]?.cycle || 'annual';
  }, [selectedBillingCycle, availableCycles, subscription?.billing_cycle]);

  // Billing History & Orders State
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [legacyReceiptModalOrder, setLegacyReceiptModalOrder] = useState(null);

  const loadBillingOrders = async () => {
    try {
      setOrdersLoading(true);
      const data = await getSubscriptionOrders();
      setOrders(Array.isArray(data?.orders) ? data.orders : Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Could not load billing history:', err?.response?.data || err.message);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      loadBillingOrders();
    }
  }, [activeTab]);

  // =========================================================================
  // Standalone Mid-Cycle Add-on Store State (Tab 2)
  // =========================================================================
  const [addonStorageId, setAddonStorageId] = useState(null);
  const [addonMachines, setAddonMachines] = useState({});
  const [addonCards, setAddonCards] = useState({});
  const [addonNotifications, setAddonNotifications] = useState({});
  const [addonShippingAddress, setAddonShippingAddress] = useState(
    () => user?.address || user?.schoolAddress || ''
  );
  const [addonGateway, setAddonGateway] = useState(() =>
    gatewayParam === 'bank_transfer' ? 'bank_transfer' : 'razorpay'
  );
  const [addonUtr, setAddonUtr] = useState('');
  const [addonCouponInput, setAddonCouponInput] = useState('');
  const [addonAppliedCoupon, setAddonAppliedCoupon] = useState(null);
  const [addonCouponError, setAddonCouponError] = useState(null);
  const [isValidatingAddonCoupon, setIsValidatingAddonCoupon] = useState(false);
  const [isProcessingAddon, setIsProcessingAddon] = useState(false);

  useEffect(() => {
    if (gatewayParam === 'bank_transfer') {
      setAddonGateway('bank_transfer');
    }
  }, [gatewayParam]);

  const effectiveAddonStorageCycle = useMemo(() => {
    const subCyc = String(subscription?.billing_cycle || '').toLowerCase();
    return subCyc && subCyc !== 'trial' ? subCyc : 'annual';
  }, [subscription?.billing_cycle]);

  const selectedAddonStoragePlan = useMemo(() => {
    if (!addonStorageId || !catalog?.storage_plans) return null;
    return catalog.storage_plans.find((s) => Number(s.id) === Number(addonStorageId)) || null;
  }, [addonStorageId, catalog?.storage_plans]);

  const addonStorageTotal = useMemo(() => {
    if (!selectedAddonStoragePlan) return 0;
    return Number(selectedAddonStoragePlan?.cycle_prices?.[effectiveAddonStorageCycle] ?? 0);
  }, [selectedAddonStoragePlan, effectiveAddonStorageCycle]);

  const selectedAddonMachinesList = useMemo(() => {
    if (!catalog?.attendance_machines) return [];
    const list = [];
    for (const [idStr, qty] of Object.entries(addonMachines)) {
      const m = catalog.attendance_machines.find((item) => Number(item.id) === Number(idStr));
      if (m && qty > 0) {
        const unitPrice = parseFloat(m.unit_price || 0);
        list.push({ ...m, quantity: qty, unitPrice, totalPrice: Math.round(unitPrice * qty * 100) / 100 });
      }
    }
    return list;
  }, [addonMachines, catalog?.attendance_machines]);

  const addonMachinesTotal = useMemo(
    () => selectedAddonMachinesList.reduce((acc, m) => acc + m.totalPrice, 0),
    [selectedAddonMachinesList]
  );

  const selectedAddonCardsList = useMemo(() => {
    if (!catalog?.rfid_cards) return [];
    const list = [];
    for (const [idStr, qty] of Object.entries(addonCards)) {
      const c = catalog.rfid_cards.find((item) => Number(item.id) === Number(idStr));
      if (c && qty > 0) {
        const unitPrice = parseFloat(c.unit_price || 0);
        list.push({ ...c, quantity: qty, unitPrice, totalPrice: Math.round(unitPrice * qty * 100) / 100 });
      }
    }
    return list;
  }, [addonCards, catalog?.rfid_cards]);

  const addonCardsTotal = useMemo(
    () => selectedAddonCardsList.reduce((acc, c) => acc + c.totalPrice, 0),
    [selectedAddonCardsList]
  );

  const selectedAddonNotificationsList = useMemo(() => {
    if (!catalog?.notification_records) return [];
    const list = [];
    for (const rec of catalog.notification_records) {
      const cfg = addonNotifications[rec.id];
      if (cfg?.selected && cfg.quantity > 0) {
        const unitPrice = parseFloat(rec.cost || rec.unit_price || 0);
        const qty = parseInt(cfg.quantity, 10) || 0;
        list.push({
          ...rec,
          quantity: qty,
          unitPrice,
          totalPrice: Math.round(unitPrice * qty * 100) / 100,
        });
      }
    }
    return list;
  }, [addonNotifications, catalog?.notification_records]);

  const addonNotificationsTotal = useMemo(
    () => selectedAddonNotificationsList.reduce((acc, n) => acc + n.totalPrice, 0),
    [selectedAddonNotificationsList]
  );

  const addonHasPhysicalHardware =
    selectedAddonMachinesList.length > 0 || selectedAddonCardsList.length > 0;

  const addonSubtotal =
    Math.round(
      (addonStorageTotal + addonMachinesTotal + addonCardsTotal + addonNotificationsTotal) * 100
    ) / 100;

  const addonDiscountAmount = useMemo(() => {
    if (!addonAppliedCoupon || addonSubtotal <= 0) return 0;
    const scope = String(addonAppliedCoupon.applicable_scope || 'plan_only').toLowerCase();
    const eligibleBase =
      scope === 'all'
        ? addonSubtotal
        : scope === 'software_and_storage'
        ? addonStorageTotal
        : 0;
    if (eligibleBase <= 0) return 0;

    if (addonAppliedCoupon.discountType === 'percentage') {
      const raw = (eligibleBase * parseFloat(addonAppliedCoupon.discountValue || 0)) / 100;
      const cap = addonAppliedCoupon.maxDiscountAmount
        ? parseFloat(addonAppliedCoupon.maxDiscountAmount)
        : null;
      return Math.min(eligibleBase, Math.round((cap ? Math.min(raw, cap) : raw) * 100) / 100);
    }
    return Math.min(eligibleBase, parseFloat(addonAppliedCoupon.discountValue || 0));
  }, [addonAppliedCoupon, addonSubtotal, addonStorageTotal]);

  const addonGrandTotal = Math.max(
    0,
    Math.round((addonSubtotal - addonDiscountAmount) * 100) / 100
  );

  const eligibleBankAccounts = useMemo(() => {
    const raw = catalog?.bank_accounts || [];
    return raw.filter((acc) => {
      const isDef = Number(acc.is_default) === 1 || acc.is_default === true;
      const isAct = acc.status === undefined || Number(acc.status) === 1 || acc.status === true;
      return isDef && isAct;
    });
  }, [catalog?.bank_accounts]);

  const activeBankAccount = eligibleBankAccounts[0] || null;

  const handleApplyAddonCoupon = async (e) => {
    if (e) e.preventDefault();
    const code = addonCouponInput.trim().toUpperCase();
    if (!code) return;
    if (addonSubtotal <= 0) {
      setAddonCouponError('Select at least one add-on before applying a coupon.');
      return;
    }

    try {
      setIsValidatingAddonCoupon(true);
      setAddonCouponError(null);
      const data = await validateSubscriptionCoupon(code, addonSubtotal, {
        planAmount: 0,
        storageAmount: addonStorageTotal,
      });
      setAddonAppliedCoupon({
        id: data.id,
        code: data.code,
        discountType: data.discountType,
        discountValue: parseFloat(data.discountValue),
        maxDiscountAmount: data.max_discount_amount || data.maxDiscountAmount || null,
        applicable_scope: data.applicable_scope || 'plan_only',
      });
      setAddonCouponInput('');
      toast.success(`Coupon "${data.code}" applied!`);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Coupon is not applicable to this add-on order.';
      setAddonCouponError(msg);
      toast.error(msg);
    } finally {
      setIsValidatingAddonCoupon(false);
    }
  };

  const resetAddonSelections = () => {
    setAddonStorageId(null);
    setAddonMachines({});
    setAddonCards({});
    setAddonNotifications({});
    setAddonAppliedCoupon(null);
    setAddonUtr('');
  };

  const handleAddonCheckout = async () => {
    if (!isActive) {
      toast.warning('Please activate a base subscription plan first before purchasing standalone add-ons.');
      handleSwitchTab('plans');
      return;
    }
    if (addonSubtotal <= 0) {
      toast.warning('Please select at least one Cloud Storage pack, Hardware item, or Notification credit pack.');
      return;
    }
    if (addonHasPhysicalHardware && (!addonShippingAddress || addonShippingAddress.trim().length < 6)) {
      toast.error('Please enter a complete delivery / shipping address for physical hardware dispatch.');
      return;
    }

    // Validate minimum notification quantities
    for (const n of selectedAddonNotificationsList) {
      const minQty = Math.max(1, parseInt(n.min_qty, 10) || 1);
      if (n.quantity < minQty) {
        toast.error(`Minimum purchase quantity for ${n.pack_name || n.name} is ${minQty} credits.`);
        return;
      }
    }

    const payload = {
      storage_plan_id: addonStorageId || null,
      storage_qty: addonStorageId ? 1 : 0,
      storage_billing_cycle: effectiveAddonStorageCycle,
      selected_machines: selectedAddonMachinesList.map((m) => ({
        id: Number(m.id),
        quantity: Number(m.quantity),
      })),
      selected_cards: selectedAddonCardsList.map((c) => ({
        id: Number(c.id),
        quantity: Number(c.quantity),
      })),
      selected_notifications: selectedAddonNotificationsList.map((n) => ({
        id: Number(n.id),
        type: n.type || n.channel,
        quantity: Number(n.quantity),
      })),
      coupon_code: addonAppliedCoupon ? addonAppliedCoupon.code : null,
      shipping_address: addonHasPhysicalHardware ? addonShippingAddress.trim() : null,
    };

    try {
      setIsProcessingAddon(true);

      if (addonGateway === 'razorpay') {
        const sdkLoaded = await loadRazorpayScript();
        if (!sdkLoaded) {
          toast.error('Unable to load Razorpay Checkout SDK. Check your internet connection.');
          setIsProcessingAddon(false);
          return;
        }

        const orderData = await createAddonOrder(payload);

        if (orderData?.zero_amount_activated) {
          toast.success('Add-ons activated immediately!');
          resetAddonSelections();
          if (refreshSubscription) await refreshSubscription();
          navigate(
            `/admin/subscription/payment-success?order_no=${encodeURIComponent(orderData.order_no || '')}`
          );
          return;
        }

        if (!orderData?.order_id) {
          throw new Error('Failed to initialize Razorpay order for add-ons.');
        }

        const rzp = new window.Razorpay({
          key: orderData.key_id,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: 'GrowVidya School ERP',
          description: 'Add-on Expansion (Storage / Hardware / Notification Credits)',
          order_id: orderData.order_id,
          prefill: {
            name: user?.name || user?.schoolName || 'School Administrator',
            email: user?.email || '',
            contact: user?.phone || user?.mobile || '',
          },
          theme: { color: '#4f46e5' },
          handler: async (response) => {
            try {
              setIsProcessingAddon(true);
              const verified = await verifyAddonPayment({
                order_no: orderData.order_no,
                payment_order_id: orderData.payment_order_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              toast.success('Add-on payment verified and provisioned immediately!');
              resetAddonSelections();
              if (refreshSubscription) await refreshSubscription();
              navigate(
                `/admin/subscription/payment-success?order_no=${encodeURIComponent(
                  verified?.order_no || orderData.order_no || ''
                )}`
              );
            } catch (verifyErr) {
              toast.error(
                verifyErr?.response?.data?.message ||
                  verifyErr?.message ||
                  'Add-on payment verification failed. Please contact support.'
              );
            } finally {
              setIsProcessingAddon(false);
            }
          },
          modal: {
            ondismiss: () => {
              setIsProcessingAddon(false);
            },
          },
        });

        rzp.on('payment.failed', async (resp) => {
          const reason = resp?.error?.description || 'Add-on payment was declined by bank or gateway.';
          try {
            await recordSubscriptionPaymentFailure({
              order_no: orderData.order_no,
              razorpay_order_id: orderData.order_id,
              razorpay_payment_id: resp?.error?.metadata?.payment_id || null,
              error_code: resp?.error?.code || 'PAYMENT_FAILED',
              error_description: reason,
            });
          } catch {
            // Non-blocking failure log
          }
          setIsProcessingAddon(false);
          navigate(
            `/admin/subscription/payment-failed?order_no=${encodeURIComponent(
              orderData.order_no || ''
            )}&reason=${encodeURIComponent(reason)}`
          );
        });

        rzp.open();
      } else {
        if (!activeBankAccount) {
          toast.error('No active bank account is configured for offline transfers. Please use Online Checkout.');
          setIsProcessingAddon(false);
          return;
        }
        if (!addonUtr || addonUtr.trim().length < 4) {
          toast.error('Please enter your Bank Transfer UTR / Reference number.');
          setIsProcessingAddon(false);
          return;
        }

        const offlineRes = await purchaseAddonsOffline({
          ...payload,
          payment_gateway: 'bank_transfer',
          payment_transaction_id: addonUtr.trim(),
        });

        toast.info('Offline add-on bank transfer submitted for Super Admin verification.');
        resetAddonSelections();
        if (refreshSubscription) await refreshSubscription();
        if (offlineRes?.order_no) {
          navigate(
            `/admin/subscription/payment-success?order_no=${encodeURIComponent(offlineRes.order_no)}`
          );
        } else {
          handleSwitchTab('history');
        }
        setIsProcessingAddon(false);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Unable to process add-on order.');
      setIsProcessingAddon(false);
    }
  };

  if (loading && !subscription) {
    return (
      <div className="content d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status"></div>
          <div className="text-muted fs-14">Loading institutional subscription &amp; quotas...</div>
        </div>
      </div>
    );
  }

  const planName = subscription?.plan_name || 'No Active Plan';
  const maxStudents = Number(subscription?.max_students) || 0;
  const activeStudentCount = Number(subscription?.active_student_count) || 0;
  const studentUsagePct =
    maxStudents > 0 ? Math.min(100, Math.round((activeStudentCount / maxStudents) * 100)) : 0;

  // Dynamic Trial Progress Bar
  const totalTrialDays = Math.max(0, Number(subscription?.free_trial_days) || 0);
  const trialDaysPassed = Math.max(0, totalTrialDays - daysLeft);
  const trialProgressPercent =
    totalTrialDays > 0 ? Math.min(100, Math.max(0, (trialDaysPassed / totalTrialDays) * 100)) : 0;

  // Dynamic Cloud Storage Metrics
  const baseStorageGb = Math.max(
    0,
    Number(storageQuota?.baseStorageGb ?? subscription?.included_storage_gb) || 0
  );
  const addonStorageGb =
    Number(storageQuota?.addonStorageGb ?? subscription?.addon_storage_gb) || 0;
  const totalAllowedFormatted =
    storageQuota?.allowedFormatted || `${Number((baseStorageGb + addonStorageGb).toFixed(2))} GB`;
  const usedStorageFormatted = storageQuota?.usedFormatted || '0 MB';
  const storageUsagePercent = Number(storageQuota?.usagePercent) || 0;

  // Dynamic SMS & Push Wallet Balances
  const smsBalance = Number(notificationWallet?.sms_balance || 0);
  const pushBalance = Number(notificationWallet?.push_balance || 0);

  // Plans filtered by selected billing cycle
  const filteredPlans = (upgradePlans || []).filter(
    (p) => String(p.billing_cycle || '').toLowerCase() === billingCycle
  );

  // Whether the school already has a non-trial current plan (so Current Plan takes highlight priority over Most Popular)
  const hasCurrentPlan = Boolean(
    !isTrial &&
      (subscription?.plan_id || (upgradePlans || []).some((p) => Boolean(p.is_current)))
  );

  // Latest rejected offline UTR submission notice (if any)
  const latestRejected = subscription?.latest_rejected_subscription || null;

  const handleSelectPlan = (plan) => {
    if (plan.can_switch === false || plan.is_downgrade || plan.is_quota_locked) {
      const rawReason =
        plan.lock_reason ||
        plan.downgrade_message ||
        'Switching to this plan is not permitted under your current subscription tier or active usage.';
      toast.warning(rawReason.replace(/\ba Annual\b/g, 'an Annual'));
      return;
    }
    sessionStorage.setItem('selected_subscription_plan', JSON.stringify(plan));
    sessionStorage.setItem('selected_billing_cycle', plan.billing_cycle || billingCycle);
    navigate('/admin/subscription/configure', {
      state: {
        plan,
        billingCycle: plan.billing_cycle || billingCycle,
      },
    });
  };

  const handleRenewCurrentPlan = () => {
    const currentPlan =
      (upgradePlans || []).find((p) => Number(p.id) === Number(subscription?.plan_id) && p.can_switch !== false) ||
      filteredPlans.find((p) => p.can_switch !== false);
    if (currentPlan) {
      handleSelectPlan(currentPlan);
    } else {
      handleSwitchTab('plans');
    }
  };

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-4">
        <div>
          <h3 className="page-title mb-1 fw-bold text-dark">Subscription, Add-ons &amp; Billing</h3>
          <p className="text-muted fs-13 mb-0">
            Manage your institutional software tier, cloud storage capacity, hardware &amp; SMS/Push credits, and payment invoices.
          </p>
        </div>
        <div className="mt-3 mt-md-0 d-flex flex-wrap gap-2">
          {isActive && (
            <button
              type="button"
              className="btn btn-outline-primary d-inline-flex align-items-center shadow-sm"
              onClick={() => handleSwitchTab('addons')}
            >
              <i className="ti ti-puzzle me-2 fs-16"></i>
              <span>Buy Add-ons / Credits</span>
            </button>
          )}
          <button
            type="button"
            className="btn btn-light border text-dark d-inline-flex align-items-center shadow-sm"
            onClick={() => handleSwitchTab('history')}
          >
            <i className="ti ti-receipt-2 me-2 fs-16"></i>
            <span>Invoices &amp; History</span>
          </button>
          {(isExpired || (isActivePaid && daysLeft <= 30)) && !isTrial && (
            <button
              type="button"
              className={`btn ${isExpired ? 'btn-danger' : 'btn-warning text-dark'} fw-bold d-inline-flex align-items-center shadow-sm`}
              onClick={handleRenewCurrentPlan}
            >
              <i className="ti ti-refresh me-2 fs-16"></i>
              <span>Renew {planName}</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. Initial Offline Approval Pending (Portal Locked until Verified or Paid Online) */}
      {isPending && pendingSubscription && (
        <div className="alert alert-warning border-warning d-flex align-items-start p-3 mb-4 rounded-3 shadow-sm bg-warning-subtle">
          <div className="avatar avatar-md bg-warning text-dark rounded-circle flex-shrink-0 me-3 d-flex align-items-center justify-content-center">
            <i className="ti ti-clock-hour-4 fs-22"></i>
          </div>
          <div className="flex-grow-1">
            <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
              <h6 className="alert-heading fw-bold mb-0 text-dark">
                Offline Bank Transfer Pending Super Admin Verification
              </h6>
              <span className="badge bg-warning text-dark border fw-semibold px-2 py-1 fs-11">
                Awaiting Verification
              </span>
            </div>
            <p className="mb-1 fs-13 text-dark">
              Your offline bank transfer for <strong>{pendingSubscription.plan_name}</strong> (
              {pendingSubscription.cycle_meta?.label || resolveCycleMeta(pendingSubscription.billing_cycle).label}) is currently queued for verification.
              Need immediate access right now? You can also activate instantly via online Razorpay checkout.
            </p>
            <div className="d-flex flex-wrap align-items-center gap-3 text-muted fs-12 mt-2 pt-2 border-top border-warning-subtle">
              {pendingSubscription.payment_transaction_id && (
                <span>
                  <strong className="text-dark">UTR / Ref:</strong>{' '}
                  <span className="font-monospace text-dark">{pendingSubscription.payment_transaction_id}</span>
                </span>
              )}
              {Number(pendingSubscription.amount_paid) > 0 && (
                <span>
                  <strong className="text-dark">Amount:</strong> ₹
                  {Number(pendingSubscription.amount_paid).toLocaleString('en-IN')}
                </span>
              )}
              {pendingSubscription.created_at && (
                <span>
                  <strong className="text-dark">Submitted:</strong>{' '}
                  {formatDateDisplay(pendingSubscription.created_at)}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Non-Blocking Queued Offline Renewal/Upgrade while Active Subscription Continues! */}
      {isActive && hasPendingOffline && pendingSubscription && (
        <div className="alert alert-info border-info d-flex align-items-center p-3 mb-4 rounded-3 shadow-sm bg-info-subtle">
          <i className="ti ti-clock-check fs-24 text-primary me-3 flex-shrink-0"></i>
          <div className="flex-grow-1 fs-13 text-dark">
            <strong>Queued Offline Transfer Under Review:</strong> Your current <strong>{planName}</strong> license
            remains 100% active while Super Admin verifies your offline UTR (
            <span className="font-monospace">{pendingSubscription.payment_transaction_id || 'UTR'}</span>) for{' '}
            <strong>{pendingSubscription.plan_name}</strong>.
          </div>
        </div>
      )}

      {/* 3. Latest Rejected Offline Transfer Notice (if no active plan or recent UTR rejected) */}
      {latestRejected && (!isActive || !hasPendingOffline) && (
        <div className="alert alert-danger border-danger-subtle d-flex align-items-start p-3 mb-4 rounded-3 shadow-sm">
          <i className="ti ti-alert-octagon fs-22 text-danger me-3 flex-shrink-0 mt-1"></i>
          <div className="flex-grow-1 fs-13">
            <strong className="text-danger d-block mb-1">
              Previous Offline Bank Transfer Rejected ({latestRejected.plan_name})
            </strong>
            <span className="text-dark">
              UTR <span className="font-monospace">{latestRejected.payment_transaction_id || 'N/A'}</span> could not be
              verified.
              {latestRejected.verification_notes ? ` Reason: "${latestRejected.verification_notes}"` : ''}{' '}
              Please submit a valid UTR or use Instant Online Checkout below.
            </span>
          </div>
        </div>
      )}

      {/* 4. Suspended Notice */}
      {isSuspended && (
        <div className="alert alert-danger border-danger d-flex align-items-center p-3 mb-4 rounded-3 shadow-sm">
          <div className="avatar avatar-md bg-danger text-white rounded-circle flex-shrink-0 me-3 d-flex align-items-center justify-content-center">
            <i className="ti ti-ban fs-22"></i>
          </div>
          <div className="flex-grow-1">
            <h6 className="alert-heading fw-bold mb-1 text-danger">
              Subscription Temporarily Suspended
            </h6>
            <p className="mb-0 fs-13 text-dark">
              Operational access for your institution has been paused by platform administration. Please contact Help &amp; Support or renew your subscription below.
            </p>
          </div>
        </div>
      )}

      {/* 5. Active Trial Notice */}
      {isActiveTrial && (
        <div className="alert alert-primary border-primary d-flex align-items-center p-3 mb-4 rounded-3 shadow-sm">
          <div className="avatar avatar-md bg-primary text-white rounded-circle flex-shrink-0 me-3 d-flex align-items-center justify-content-center">
            <i className="ti ti-bolt fs-22"></i>
          </div>
          <div className="flex-grow-1">
            <h6 className="alert-heading fw-bold mb-1 text-dark">
              {planName} Active ({daysLeft <= 0 ? 'Expires Today' : `${daysLeft} Days Remaining`})
            </h6>
            <p className="mb-0 fs-13 text-dark">
              Upgrade to any paid plan below at any time for instant permanent activation with zero data loss.
            </p>
          </div>
        </div>
      )}

      {/* 6. Paid Plan Expiring Soon Notice */}
      {isActivePaid && daysLeft <= 30 && (
        <div
          className={`alert ${
            daysLeft <= 15 ? 'alert-danger border-danger' : 'alert-warning border-warning'
          } d-flex align-items-center p-3 mb-4 rounded-3 shadow-sm`}
        >
          <div
            className={`avatar avatar-md ${
              daysLeft <= 15 ? 'bg-danger' : 'bg-warning'
            } text-white rounded-circle flex-shrink-0 me-3 d-flex align-items-center justify-content-center`}
          >
            <i className="ti ti-alert-triangle fs-22"></i>
          </div>
          <div className="flex-grow-1">
            <h6 className="alert-heading fw-bold mb-1 text-dark">
              {planName} Expiring Soon ({daysLeft <= 0 ? 'Expires Today' : `${daysLeft} Days Remaining`})
            </h6>
            <p className="mb-0 fs-13 text-dark">
              Renewing early preserves <strong>100% of your remaining days</strong> by stacking the new billing cycle
              onto <strong>{formatDateDisplay(subscription?.end_date)}</strong>.
            </p>
          </div>
          <div className="flex-shrink-0 ms-3 d-none d-sm-block">
            <button
              type="button"
              className="btn btn-warning fw-bold text-dark shadow-sm"
              onClick={handleRenewCurrentPlan}
            >
              <i className="ti ti-refresh me-1"></i> Renew Early
            </button>
          </div>
        </div>
      )}

      {/* 7. Expired Notice */}
      {isExpired && !isPending && !isSuspended && (
        <div className="alert alert-danger border-danger d-flex align-items-center p-3 mb-4 rounded-3 shadow-sm">
          <div className="avatar avatar-md bg-danger text-white rounded-circle flex-shrink-0 me-3 d-flex align-items-center justify-content-center">
            <i className="ti ti-lock fs-22"></i>
          </div>
          <div className="flex-grow-1">
            <h6 className="alert-heading fw-bold mb-1 text-danger">
              {planName} Expired — Operational Menus Locked
            </h6>
            <p className="mb-0 fs-13 text-dark">
              All institutional records remain 100% safe. Renew your plan or upgrade to a higher tier below for instant online restoration.
            </p>
          </div>
        </div>
      )}

      {/* Current Plan Hero & 4-Card Quota Bar */}
      <div className="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden">
        <div
          className="p-4 text-white"
          style={{
            background: isPending
              ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)'
              : isExpired || isSuspended
              ? 'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)'
              : isTrial
              ? 'linear-gradient(135deg, #4338ca 0%, #312e81 100%)'
              : 'linear-gradient(135deg, #059669 0%, #065f46 100%)',
          }}
        >
          <div className="row align-items-center g-3">
            <div className="col-12 col-lg-8">
              <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                <span className="badge bg-white text-dark fw-bold px-3 py-1 fs-11 rounded-pill text-uppercase">
                  {isPending
                    ? `${planName} — Pending Verification`
                    : isSuspended
                    ? `${planName} — Suspended`
                    : isExpired
                    ? `${planName} — Expired`
                    : isTrial
                    ? `${planName} — Free Trial`
                    : `${planName} — Active (${subscription?.cycle_meta?.label || resolveCycleMeta(subscription?.billing_cycle).label})`}
                </span>
                {isActive && (
                  <span
                    className={`badge ${
                      daysLeft <= 15
                        ? 'bg-danger text-white'
                        : daysLeft <= 30
                        ? 'bg-warning text-dark'
                        : 'text-white'
                    } fw-bold px-3 py-1 fs-11 rounded-pill`}
                    style={
                      daysLeft > 30
                        ? { backgroundColor: 'rgba(255, 255, 255, 0.22)', border: '1px solid rgba(255, 255, 255, 0.3)' }
                        : undefined
                    }
                  >
                    ⚡ {daysLeft <= 0 ? 'Expires Today (23:59 IST)' : `${daysLeft} Days Remaining`}
                  </span>
                )}
              </div>

              <h2 className="fw-bold text-white mb-1">{planName}</h2>
              <p className="text-white-50 mb-0 fs-13">
                {subscription?.start_date && subscription?.end_date ? (
                  <>
                    Validity Period: <strong className="text-white">{formatDateDisplay(subscription.start_date)}</strong>{' '}
                    to <strong className="text-white">{formatDateDisplay(subscription.end_date)}</strong>
                  </>
                ) : (
                  'Select a subscription package below to activate your institutional license.'
                )}
              </p>

              {isActiveTrial && (
                <div className="mt-3" style={{ maxWidth: '460px' }}>
                  <div className="d-flex justify-content-between text-white-50 fs-11 mb-1">
                    <span>Trial Evaluation Window ({totalTrialDays} Days)</span>
                    <span>{daysLeft <= 0 ? 'Last day' : `${daysLeft} days left`}</span>
                  </div>
                  <div className="progress" style={{ height: '7px', backgroundColor: 'rgba(255,255,255,0.22)' }}>
                    <div
                      className="progress-bar bg-warning"
                      role="progressbar"
                      style={{ width: `${trialProgressPercent}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            <div className="col-12 col-lg-4 text-lg-end">
              <div
                className="p-3 rounded-3 d-inline-block text-start"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.14)',
                  border: '1px solid rgba(255, 255, 255, 0.24)',
                  minWidth: '230px',
                }}
              >
                <div className="text-white-50 fs-11 text-uppercase fw-semibold">Current License Amount Paid</div>
                <div className="fs-24 fw-bold text-white">
                  ₹{Number(subscription?.amount_paid || 0).toLocaleString('en-IN')}
                </div>
                {subscription?.invoice_no ? (
                  <div className="text-white-50 fs-11 font-monospace">Invoice: {subscription.invoice_no}</div>
                ) : subscription?.payment_transaction_id ? (
                  <div className="text-white-50 fs-11 font-monospace text-truncate" style={{ maxWidth: '220px' }}>
                    Ref: {subscription.payment_transaction_id}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* 4-Card Institutional Quotas & Metered Wallets Bar */}
        <div className="card-body p-3 p-md-4 bg-white">
          <div className="row g-3">
            {/* 1. Student Enrollment */}
            <div className="col-12 col-sm-6 col-xl-3">
              <div className="p-3 rounded-3 bg-light border h-100 d-flex flex-column justify-content-between">
                <div>
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <span className="text-muted fs-11 fw-bold text-uppercase">Student Quota</span>
                    <i className="ti ti-school fs-18 text-primary"></i>
                  </div>
                  <h5 className="fw-bold text-dark mb-1">
                    {activeStudentCount.toLocaleString('en-IN')}{' '}
                    <span className="text-muted fs-13 fw-normal">
                      / {maxStudents > 0 ? maxStudents.toLocaleString('en-IN') : 'Unlimited'}
                    </span>
                  </h5>
                </div>
                {maxStudents > 0 ? (
                  <div>
                    <div className="progress mt-1" style={{ height: '6px' }}>
                      <div
                        className={`progress-bar ${
                          studentUsagePct >= 95 ? 'bg-danger' : studentUsagePct >= 80 ? 'bg-warning' : 'bg-primary'
                        }`}
                        style={{ width: `${studentUsagePct}%` }}
                      ></div>
                    </div>
                    <div className="text-muted fs-11 mt-1">{studentUsagePct}% capacity enrolled</div>
                  </div>
                ) : (
                  <div className="text-success fs-11 fw-semibold">Unlimited Student Admissions</div>
                )}
              </div>
            </div>

            {/* 2. Unlimited Staff & Campuses */}
            <div className="col-12 col-sm-6 col-xl-3">
              <div className="p-3 rounded-3 bg-light border h-100 d-flex flex-column justify-content-between">
                <div>
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <span className="text-muted fs-11 fw-bold text-uppercase">Staff &amp; Campuses</span>
                    <i className="ti ti-users fs-18 text-success"></i>
                  </div>
                  <h5 className="fw-bold text-dark mb-1">Unlimited</h5>
                </div>
                <div className="text-muted fs-11">
                  Unlimited Teachers • Unlimited Branches
                </div>
              </div>
            </div>

            {/* 3. Cloud Storage Quota */}
            <div className="col-12 col-sm-6 col-xl-3">
              <div className="p-3 rounded-3 bg-light border h-100 d-flex flex-column justify-content-between">
                <div>
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <span className="text-muted fs-11 fw-bold text-uppercase">Cloud Storage</span>
                    <i className="ti ti-cloud-upload fs-18 text-info"></i>
                  </div>
                  <h5 className="fw-bold text-dark mb-1">
                    {usedStorageFormatted}{' '}
                    <span className="text-muted fs-13 fw-normal">/ {totalAllowedFormatted}</span>
                  </h5>
                </div>
                <div>
                  <div className="progress mt-1" style={{ height: '6px' }}>
                    <div
                      className={`progress-bar ${
                        storageUsagePercent >= 95
                          ? 'bg-danger'
                          : storageUsagePercent >= 80
                          ? 'bg-warning'
                          : 'bg-info'
                      }`}
                      style={{ width: `${Math.max(2, storageUsagePercent)}%` }}
                    ></div>
                  </div>
                  <div className="d-flex align-items-center justify-content-between fs-11 mt-1">
                    <span className="text-muted">
                      {baseStorageGb} GB Base{addonStorageGb > 0 ? ` + ${addonStorageGb} GB Add-on` : ''}
                    </span>
                    {isActive && (
                      <button
                        type="button"
                        onClick={() => handleSwitchTab('addons')}
                        className="btn btn-link p-0 fs-11 fw-bold text-primary text-decoration-none"
                      >
                        + Expand
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 4. SMS & Push Notification Wallet */}
            <div className="col-12 col-sm-6 col-xl-3">
              <div className="p-3 rounded-3 bg-light border h-100 d-flex flex-column justify-content-between">
                <div>
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <span className="text-muted fs-11 fw-bold text-uppercase">Notification Wallet</span>
                    <i className="ti ti-bell-ringing fs-18 text-warning"></i>
                  </div>
                  <div className="d-flex align-items-center gap-3 mb-1">
                    <div>
                      <span className="fw-bold text-dark fs-16">{smsBalance.toLocaleString('en-IN')}</span>
                      <span className="text-muted fs-11 ms-1">SMS</span>
                    </div>
                    <div className="vr"></div>
                    <div>
                      <span className="fw-bold text-dark fs-16">{pushBalance.toLocaleString('en-IN')}</span>
                      <span className="text-muted fs-11 ms-1">Push</span>
                    </div>
                  </div>
                </div>
                <div className="d-flex align-items-center justify-content-between fs-11">
                  <span className="text-muted">Prepaid Credit Balance</span>
                  {isActive && (
                    <button
                      type="button"
                      onClick={() => handleSwitchTab('addons')}
                      className="btn btn-link p-0 fs-11 fw-bold text-primary text-decoration-none"
                    >
                      + Top Up
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="card border-0 shadow-sm rounded-3 mb-4">
        <div className="card-body p-2 bg-white">
          <div className="nav nav-pills nav-fill gap-2">
            <button
              type="button"
              onClick={() => handleSwitchTab('plans')}
              className={`nav-link fw-bold fs-13 py-2 px-3 d-flex align-items-center justify-content-center gap-2 ${
                activeTab === 'plans' ? 'active bg-primary text-white shadow-sm' : 'text-dark bg-light'
              }`}
            >
              <i className="ti ti-crown fs-16"></i>
              <span>Subscription Plans</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchTab('addons')}
              className={`nav-link fw-bold fs-13 py-2 px-3 d-flex align-items-center justify-content-center gap-2 ${
                activeTab === 'addons' ? 'active bg-primary text-white shadow-sm' : 'text-dark bg-light'
              }`}
            >
              <i className="ti ti-puzzle fs-16"></i>
              <span>Add-on Store (Storage, Hardware &amp; Credits)</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchTab('history')}
              className={`nav-link fw-bold fs-13 py-2 px-3 d-flex align-items-center justify-content-center gap-2 ${
                activeTab === 'history' ? 'active bg-primary text-white shadow-sm' : 'text-dark bg-light'
              }`}
            >
              <i className="ti ti-receipt-2 fs-16"></i>
              <span>Billing History &amp; Invoices</span>
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          TAB 1: DYNAMIC SUBSCRIPTION PLANS
      ===================================================================== */}
      {activeTab === 'plans' && (
        <div id="plans-selection-section" className="mb-5">
          <div className="text-center mb-4">
            <h4 className="fw-bold text-dark mb-1">Choose Your Institutional Plan &amp; Billing Cycle</h4>
            <p className="text-muted fs-13 mb-3 mx-auto" style={{ maxWidth: '640px' }}>
              Online payments activate immediately. Early renewals on your current tier preserve 100% of remaining days.
              Flat net pricing — no extra taxes.
            </p>

            {/* Dynamic Billing Cycle Pill Switcher */}
            {availableCycles.length > 0 && (
              <div
                className="p-1 rounded-pill d-inline-flex flex-wrap justify-content-center align-items-center gap-1 shadow-sm"
                style={{ backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0' }}
              >
                {availableCycles.map((cyc) => {
                  const cycKey = cyc.cycle || cyc.code;
                  const isActiveCycle = billingCycle === cycKey;
                  return (
                    <button
                      key={cycKey}
                      type="button"
                      onClick={() => setBillingCycle(cycKey)}
                      className={`btn rounded-pill px-4 py-2 fs-13 fw-bold transition-all ${
                        isActiveCycle
                          ? 'btn-primary text-white shadow-sm'
                          : 'text-dark border-0 bg-transparent'
                      }`}
                    >
                      {cyc.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="row g-4 pt-2">
            {filteredPlans.length === 0 ? (
              <div className="col-12 text-center py-5">
                <p className="text-muted fs-14 mb-0">
                  No active packages configured for {resolveCycleMeta(billingCycle).label} billing.
                </p>
              </div>
            ) : (
              filteredPlans.map((plan) => {
                const isPopular = Number(plan.is_popular) === 1;
                const isCurrent = Boolean(
                  plan.is_current || (!isTrial && Number(subscription?.plan_id) === Number(plan.id))
                );
                const isPendingPlan = Boolean(
                  pendingSubscription && Number(pendingSubscription.plan_id) === Number(plan.id)
                );
                const isLocked = Boolean(
                  plan.can_switch === false || plan.is_downgrade || plan.is_quota_locked
                );
                const isHighlighted = !isLocked && (hasCurrentPlan ? isCurrent : isPopular);
                const isCycleLocked =
                  plan.lock_code === 'CYCLE_DOWNGRADE_NOT_ALLOWED' ||
                  plan.lock_code === 'ACTIVE_CYCLE_SHRINK_NOT_ALLOWED';
                const activeCycleLabel =
                  subscription?.cycle_meta?.label ||
                  resolveCycleMeta(subscription?.billing_cycle).label ||
                  'Current';
                const cycleMeta = plan.cycle_meta || resolveCycleMeta(plan.billing_cycle);
                const includedStorage = Math.max(0, parseInt(plan.included_storage_gb, 10) || 0);
                const customItems = plan.items || [];

                return (
                  <div className="col-12 col-lg-4 d-flex" key={plan.id}>
                    <div
                      className={`card w-100 h-100 rounded-4 bg-white transition-all ${
                        isHighlighted ? 'border-2 border-primary shadow' : 'shadow-sm'
                      }`}
                      style={{
                        position: 'relative',
                        overflow: 'visible',
                        border: isHighlighted ? undefined : `1px solid ${isLocked ? '#cbd5e1' : '#e2e8f0'}`,
                      }}
                    >
                      {isLocked && (
                        <div
                          className="position-absolute shadow-sm fw-bold text-uppercase d-inline-flex align-items-center gap-1"
                          style={{
                            top: '-13px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            padding: '5px 14px',
                            fontSize: '11px',
                            lineHeight: 1.2,
                            borderRadius: '999px',
                            backgroundColor: plan.is_quota_locked
                              ? '#b45309'
                              : isCycleLocked
                              ? '#475569'
                              : '#64748b',
                            color: '#ffffff',
                            whiteSpace: 'nowrap',
                            zIndex: 2,
                          }}
                        >
                          <i
                            className={`ti ${
                              plan.is_quota_locked
                                ? 'ti-users'
                                : isCycleLocked
                                ? 'ti-calendar-time'
                                : 'ti-lock'
                            } fs-13`}
                          ></i>
                          <span>
                            {plan.is_quota_locked
                              ? 'Quota Exceeded'
                              : isCycleLocked
                              ? `${activeCycleLabel} Plan Active`
                              : 'Lower Tier Locked'}
                          </span>
                        </div>
                      )}

                      {!isLocked && isCurrent && (
                        <div
                          className="position-absolute shadow-sm fw-bold text-uppercase d-inline-flex align-items-center gap-1 bg-warning text-dark"
                          style={{
                            top: '-13px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            padding: '5px 14px',
                            fontSize: '11px',
                            lineHeight: 1.2,
                            borderRadius: '999px',
                            whiteSpace: 'nowrap',
                            zIndex: 2,
                          }}
                        >
                          <span>{isExpired ? '★ Current Plan (Expired)' : '★ Your Current Plan'}</span>
                        </div>
                      )}

                      {!isLocked && !isCurrent && isPopular && (
                        <div
                          className="position-absolute shadow-sm fw-bold text-uppercase d-inline-flex align-items-center gap-1 bg-primary text-white"
                          style={{
                            top: '-13px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            padding: '5px 14px',
                            fontSize: '11px',
                            lineHeight: 1.2,
                            borderRadius: '999px',
                            whiteSpace: 'nowrap',
                            zIndex: 2,
                          }}
                        >
                          <span>★ Most Popular</span>
                        </div>
                      )}

                      <div className="card-body p-4 d-flex flex-column">
                        <div className="d-flex align-items-center justify-content-between mb-1 mt-1">
                          <h5 className="fw-bold text-dark mb-0">{plan.plan_name}</h5>
                          <span
                            className="fw-semibold fs-11 px-3 py-1 rounded-pill"
                            style={{
                              backgroundColor: '#f1f5f9',
                              color: '#475569',
                              border: '1px solid #e2e8f0',
                            }}
                          >
                            {cycleMeta.label}
                          </span>
                        </div>
                        <p className="text-muted fs-12 mb-3" style={{ minHeight: '36px' }}>
                          {plan.description || 'Complete cloud ERP suite for institutional management.'}
                        </p>

                        <div className="mb-3">
                          {Number(plan.original_price) > Number(plan.price) && (
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <span
                                className="fs-14 fw-semibold text-decoration-line-through"
                                style={{ color: '#94a3b8' }}
                              >
                                ₹{Number(plan.original_price).toLocaleString('en-IN')}
                              </span>
                              <span
                                className="badge rounded-pill px-2 py-1 fs-10 fw-bold"
                                style={{
                                  backgroundColor: '#ecfdf5',
                                  color: '#047857',
                                  border: '1px solid #a7f3d0',
                                }}
                              >
                                {Math.round(
                                  ((Number(plan.original_price) - Number(plan.price)) /
                                    Number(plan.original_price)) *
                                    100
                                )}
                                % OFF
                              </span>
                            </div>
                          )}
                          <div>
                            <span className="fs-32 fw-bold text-dark">
                              ₹{Number(plan.price || 0).toLocaleString('en-IN')}
                            </span>
                            <span className="text-muted fs-13"> / {cycleMeta.shortLabel || cycleMeta.label}</span>
                          </div>
                        </div>

                        {/* Quotas Block */}
                        <div
                          className="p-3 rounded-3 mb-3 fs-12"
                          style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}
                        >
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <span className="text-muted">Student Capacity:</span>
                            <strong className="text-dark">
                              {plan.max_students > 0
                                ? `${Number(plan.max_students).toLocaleString('en-IN')} Students`
                                : 'Unlimited Students'}
                            </strong>
                          </div>
                          <div className={`d-flex align-items-center justify-content-between ${includedStorage > 0 ? 'mb-2' : ''}`}>
                            <span className="text-muted">Teachers &amp; Branches:</span>
                            <strong className="text-dark">Unlimited</strong>
                          </div>
                          {includedStorage > 0 && (
                            <div className="d-flex align-items-center justify-content-between">
                              <span className="text-muted">Included Cloud Storage:</span>
                              <strong className="text-primary">{includedStorage} GB</strong>
                            </div>
                          )}
                        </div>

                        {/* Early Renewal Validity Preview (Current Plan Only) */}
                        {!isLocked &&
                          isCurrent &&
                          plan.stacks_dates &&
                          subscription?.end_date &&
                          plan.projected_end_date && (
                            <div
                              className="px-3 py-2 rounded-3 mb-3 fs-12"
                              style={{
                                backgroundColor: '#ecfdf5',
                                border: '1px solid #a7f3d0',
                              }}
                            >
                              <div
                                className="fw-bold d-flex align-items-center gap-2 mb-1"
                                style={{ color: '#065f46' }}
                              >
                                <i className="ti ti-calendar-plus fs-15 flex-shrink-0"></i>
                                <span>Early Renewal — Remaining Days Preserved</span>
                              </div>
                              <div className="ps-4" style={{ color: '#334155', fontSize: '12px' }}>
                                Extends {formatDateDisplay(subscription.end_date)} →{' '}
                                <strong style={{ color: '#064e3b' }}>
                                  {formatDateDisplay(plan.projected_end_date)}
                                </strong>
                              </div>
                            </div>
                          )}

                        {/* Plan Features */}
                        {customItems.length > 0 && (
                          <div className="border-top py-3 mb-3 flex-grow-1">
                            <div className="text-dark fs-11 fw-bold text-uppercase mb-2">
                              Included Features:
                            </div>

                            {customItems.map((item) => (
                              <div className="d-flex align-items-center mb-2 fs-13 text-dark" key={item.id}>
                                <i className="ti ti-check text-success fs-16 me-2 flex-shrink-0"></i>
                                <span>{item.item_name}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* CTA Button */}
                        {isLocked ? (
                          <button
                            type="button"
                            aria-disabled="true"
                            onClick={() => handleSelectPlan(plan)}
                            className="btn w-100 py-2 px-3 fw-semibold d-inline-flex align-items-center justify-content-center mt-auto"
                            style={{
                              backgroundColor: '#f1f5f9',
                              color: '#64748b',
                              border: '1px solid #cbd5e1',
                              cursor: 'not-allowed',
                              opacity: 0.75,
                            }}
                          >
                            <i className="ti ti-lock me-2 fs-15"></i>
                            <span>
                              {plan.is_quota_locked
                                ? 'Below Current Student Count'
                                : isCycleLocked
                                ? `Use ${activeCycleLabel} Cycle Above`
                                : 'Lower Tier Not Allowed'}
                            </span>
                          </button>
                        ) : isPendingPlan && isPending ? (
                          <button
                            type="button"
                            className="btn btn-outline-primary w-100 py-2 px-3 fw-semibold mt-auto"
                            onClick={() => handleSelectPlan(plan)}
                          >
                            <i className="ti ti-bolt me-2"></i> Pay Online for Instant Activation
                          </button>
                        ) : isCurrent ? (
                          <button
                            type="button"
                            className="btn btn-primary w-100 py-2 px-3 fw-bold d-inline-flex align-items-center justify-content-center shadow-sm mt-auto"
                            onClick={() => handleSelectPlan(plan)}
                          >
                            <i className="ti ti-refresh me-2 fs-15"></i>
                            <span>{isExpired ? `Renew ${plan.plan_name}` : 'Extend / Renew Early'}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={`btn w-100 py-2 px-3 fw-bold d-inline-flex align-items-center justify-content-center shadow-sm mt-auto ${
                              isHighlighted ? 'btn-primary' : 'btn-outline-primary'
                            }`}
                            onClick={() => handleSelectPlan(plan)}
                          >
                            <span>
                              {plan.is_upgrade
                                ? `Upgrade to ${plan.plan_name}`
                                : plan.is_renewal
                                ? `Switch Cycle & Renew`
                                : `Select ${plan.plan_name}`}
                            </span>
                            <i className="ti ti-arrow-right ms-2 fs-15"></i>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: STANDALONE MID-CYCLE ADD-ON STORE
      ===================================================================== */}
      {activeTab === 'addons' && (
        <div className="mb-5">
          {!isActive && (
            <div className="alert alert-warning border-warning d-flex align-items-center justify-content-between p-3 mb-4 rounded-3">
              <div className="fs-13 text-dark">
                <strong>Base Subscription Required:</strong> Please activate or renew your base subscription plan first.
                You can also bundle add-ons directly during plan checkout!
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm fw-bold px-3 flex-shrink-0 ms-3"
                onClick={() => handleSwitchTab('plans')}
              >
                Choose Base Plan
              </button>
            </div>
          )}

          <div className="row g-4">
            {/* Left Column: 3 Add-on Archetypes */}
            <div className="col-12 col-lg-8">
              {/* 1. Cloud Storage Expansion */}
              <div className="card border-0 shadow-sm rounded-3 mb-4">
                <div className="card-header bg-white border-bottom p-3 p-md-4 d-flex align-items-center justify-content-between">
                  <div>
                    <h5 className="fw-bold text-dark mb-1 fs-16">
                      <i className="ti ti-cloud-upload text-primary me-2"></i>
                      1. Cloud Storage Expansion
                    </h5>
                    <p className="text-muted fs-12 mb-0">
                      Stacks directly onto your existing {totalAllowedFormatted} cloud storage quota ({resolveCycleMeta(effectiveAddonStorageCycle).label} cycle).
                    </p>
                  </div>
                  {addonStorageId && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger rounded-pill px-3 py-1 fs-11"
                      onClick={() => setAddonStorageId(null)}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="card-body p-3 p-md-4 bg-white">
                  <div className="row g-3">
                    {catalog?.storage_plans?.length > 0 ? (
                      catalog.storage_plans.map((sp) => {
                        const selected = Number(addonStorageId) === Number(sp.id);
                        const price = Number(sp?.cycle_prices?.[effectiveAddonStorageCycle] ?? 0);
                        return (
                          <div className="col-6 col-md-4 col-xl-3" key={sp.id}>
                            <div
                              onClick={() => setAddonStorageId(selected ? null : sp.id)}
                              className={`p-3 rounded-3 border text-center h-100 d-flex flex-column justify-content-between ${
                                selected ? 'border-2 border-primary' : 'bg-white'
                              }`}
                              style={{
                                cursor: 'pointer',
                                backgroundColor: selected ? '#eef2ff' : undefined,
                              }}
                            >
                              <div>
                                <i className="ti ti-cloud fs-24 text-info mb-1 d-block"></i>
                                <div className="fw-bold text-dark fs-15">
                                  +{sp.storage_capacity} {sp.unit_code || 'GB'}
                                </div>
                                <div className="text-muted fs-11 mb-2">{sp.plan_name}</div>
                              </div>
                              <div className="fw-bold text-primary fs-14">
                                ₹{price.toLocaleString('en-IN')}
                                <span className="text-muted fs-10 fw-normal d-block">
                                  / {resolveCycleMeta(effectiveAddonStorageCycle).shortLabel}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="col-12 text-muted fs-13 text-center py-2">
                        No storage expansion packs available.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. SMS & Push Notification Credits */}
              <div className="card border-0 shadow-sm rounded-3 mb-4">
                <div className="card-header bg-white border-bottom p-3 p-md-4">
                  <h5 className="fw-bold text-dark mb-1 fs-16">
                    <i className="ti ti-bell-ringing text-warning me-2"></i>
                    2. Prepaid SMS &amp; Push Notification Credits
                  </h5>
                  <p className="text-muted fs-12 mb-0">
                    Instantly credited to your school wallet (Current balance: {smsBalance.toLocaleString('en-IN')} SMS • {pushBalance.toLocaleString('en-IN')} Push). Credits never expire.
                  </p>
                </div>
                <div className="card-body p-3 p-md-4 bg-white">
                  <div className="row g-3">
                    {catalog?.notification_records?.length > 0 ? (
                      catalog.notification_records.map((rec) => {
                        const isSms = String(rec.type || rec.channel).toLowerCase() === 'sms';
                        const unitRate = parseFloat(rec.cost || rec.unit_price || 0);
                        const minQty = Math.max(1, parseInt(rec.min_qty, 10) || 1);
                        const cfg = addonNotifications[rec.id] || { selected: false, quantity: minQty };
                        const isSel = Boolean(cfg.selected);
                        const qty = parseInt(cfg.quantity, 10) || 0;

                        return (
                          <div className="col-12 col-md-6" key={rec.id}>
                            <div
                              className={`p-3 rounded-3 border h-100 ${
                                isSel ? 'border-2 border-primary bg-light' : 'bg-white'
                              }`}
                            >
                              <div className="d-flex align-items-center justify-content-between mb-2">
                                <div>
                                  <h6 className="fw-bold text-dark mb-0 fs-14">
                                    {rec.pack_name || rec.name || (isSms ? 'SMS Credits' : 'Push Credits')}
                                  </h6>
                                  <span className="text-muted fs-11">Min. {minQty.toLocaleString('en-IN')} credits</span>
                                </div>
                                <div className="text-end">
                                  <span className="fw-bold text-dark fs-16">₹{unitRate.toFixed(2)}</span>
                                  <span className="text-muted fs-11"> / credit</span>
                                </div>
                              </div>
                              <p className="text-muted fs-12 mb-3">{rec.message}</p>

                              <div className="d-flex align-items-center justify-content-between pt-2 border-top">
                                <div className="form-check form-switch m-0">
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={isSel}
                                    onChange={() =>
                                      setAddonNotifications((prev) => ({
                                        ...prev,
                                        [rec.id]: {
                                          selected: !isSel,
                                          quantity: Math.max(minQty, prev[rec.id]?.quantity || minQty),
                                        },
                                      }))
                                    }
                                  />
                                  <label className="form-check-label fs-12 fw-semibold">
                                    {isSel ? 'Selected' : 'Select Pack'}
                                  </label>
                                </div>

                                {isSel && (
                                  <div className="d-flex align-items-center gap-2">
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-light border text-dark px-2 py-1"
                                      onClick={() =>
                                        setAddonNotifications((prev) => ({
                                          ...prev,
                                          [rec.id]: {
                                            selected: true,
                                            quantity: Math.max(minQty, qty - 500),
                                          },
                                        }))
                                      }
                                    >
                                      -500
                                    </button>
                                    <input
                                      type="number"
                                      min={minQty}
                                      step="100"
                                      className="form-control form-control-sm text-center fw-bold"
                                      style={{ width: '90px' }}
                                      value={qty}
                                      onChange={(e) =>
                                        setAddonNotifications((prev) => ({
                                          ...prev,
                                          [rec.id]: {
                                            selected: true,
                                            quantity: Math.max(0, parseInt(e.target.value, 10) || 0),
                                          },
                                        }))
                                      }
                                    />
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-primary px-2 py-1"
                                      onClick={() =>
                                        setAddonNotifications((prev) => ({
                                          ...prev,
                                          [rec.id]: {
                                            selected: true,
                                            quantity: qty + 500,
                                          },
                                        }))
                                      }
                                    >
                                      +500
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="col-12 text-muted fs-13 text-center py-2">
                        No notification credit packs configured.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Biometric Hardware & Smart RFID Cards */}
              <div className="card border-0 shadow-sm rounded-3 mb-4">
                <div className="card-header bg-white border-bottom p-3 p-md-4">
                  <h5 className="fw-bold text-dark mb-1 fs-16">
                    <i className="ti ti-device-watch text-success me-2"></i>
                    3. Biometric Attendance Machines &amp; Smart RFID Cards
                  </h5>
                  <p className="text-muted fs-12 mb-0">
                    One-time physical hardware purchase dispatched directly to your school campus.
                  </p>
                </div>
                <div className="card-body p-3 p-md-4 bg-white">
                  {catalog?.attendance_machines?.length > 0 && (
                    <>
                      <h6 className="fw-bold text-dark fs-13 text-uppercase mb-2">Attendance Terminals</h6>
                      <div className="row g-3 mb-4">
                        {catalog.attendance_machines.map((m) => {
                          const qty = addonMachines[m.id] || 0;
                          const unitPrice = parseFloat(m.unit_price || 0);
                          return (
                            <div className="col-12 col-md-6" key={m.id}>
                              <div className={`p-3 rounded-3 border h-100 d-flex gap-3 align-items-center ${qty > 0 ? 'border-primary border-2' : ''}`}>
                                <img
                                  src={resolveImageUrl(m.machine_image, NO_IMAGE_PLACEHOLDER)}
                                  alt={m.machine_name}
                                  className="rounded border bg-light p-1 flex-shrink-0"
                                  style={{ width: '64px', height: '64px', objectFit: 'contain' }}
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = NO_IMAGE_PLACEHOLDER;
                                  }}
                                />
                                <div className="flex-grow-1 overflow-hidden">
                                  <div className="fw-bold text-dark fs-13 text-truncate">{m.machine_name}</div>
                                  <div className="text-muted fs-11">{m.brand} • {m.model_number}</div>
                                  <div className="fw-bold text-primary fs-14 mt-1">
                                    ₹{unitPrice.toLocaleString('en-IN')}
                                  </div>
                                </div>
                                <div className="d-flex align-items-center gap-1 flex-shrink-0">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-light border text-dark px-2"
                                    disabled={qty <= 0}
                                    onClick={() =>
                                      setAddonMachines((prev) => {
                                        const next = { ...prev };
                                        if (qty <= 1) delete next[m.id];
                                        else next[m.id] = qty - 1;
                                        return next;
                                      })
                                    }
                                  >
                                    -
                                  </button>
                                  <span className="badge bg-light text-dark border px-2 py-1 fs-12">{qty}</span>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-primary px-2"
                                    onClick={() =>
                                      setAddonMachines((prev) => ({ ...prev, [m.id]: qty + 1 }))
                                    }
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {catalog?.rfid_cards?.length > 0 && (
                    <>
                      <h6 className="fw-bold text-dark fs-13 text-uppercase mb-2">Smart RFID Cards &amp; Badges</h6>
                      <div className="row g-3">
                        {catalog.rfid_cards.map((c) => {
                          const qty = addonCards[c.id] || 0;
                          const minQty = Math.max(1, parseInt(c.min_order_qty, 10) || 1);
                          const unitPrice = parseFloat(c.unit_price || 0);
                          return (
                            <div className="col-12 col-md-6" key={c.id}>
                              <div className={`p-3 rounded-3 border h-100 d-flex gap-3 align-items-center ${qty > 0 ? 'border-primary border-2' : ''}`}>
                                <img
                                  src={resolveImageUrl(c.card_image || c.rfid_image, NO_IMAGE_PLACEHOLDER)}
                                  alt={c.card_name}
                                  className="rounded border bg-light p-1 flex-shrink-0"
                                  style={{ width: '64px', height: '64px', objectFit: 'contain' }}
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = NO_IMAGE_PLACEHOLDER;
                                  }}
                                />
                                <div className="flex-grow-1 overflow-hidden">
                                  <div className="fw-bold text-dark fs-13 text-truncate">{c.card_name}</div>
                                  <div className="text-muted fs-11">Min. Order: {minQty} pcs</div>
                                  <div className="fw-bold text-primary fs-14 mt-1">
                                    ₹{unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })} / pc
                                  </div>
                                </div>
                                <div className="d-flex align-items-center gap-1 flex-shrink-0">
                                  {qty === 0 ? (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-primary fw-semibold"
                                      onClick={() =>
                                        setAddonCards((prev) => ({ ...prev, [c.id]: minQty }))
                                      }
                                    >
                                      + Add ({minQty})
                                    </button>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-light border text-dark px-2"
                                        onClick={() =>
                                          setAddonCards((prev) => {
                                            const next = { ...prev };
                                            if (qty <= minQty) delete next[c.id];
                                            else next[c.id] = Math.max(minQty, qty - 50);
                                            return next;
                                          })
                                        }
                                      >
                                        -
                                      </button>
                                      <input
                                        type="number"
                                        min={minQty}
                                        className="form-control form-control-sm text-center fw-bold px-1"
                                        style={{ width: '64px' }}
                                        value={qty}
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value, 10) || 0;
                                          setAddonCards((prev) => ({
                                            ...prev,
                                            [c.id]: val > 0 ? Math.max(minQty, val) : minQty,
                                          }));
                                        }}
                                      />
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-primary px-2"
                                        onClick={() =>
                                          setAddonCards((prev) => ({ ...prev, [c.id]: qty + 50 }))
                                        }
                                      >
                                        +
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {addonHasPhysicalHardware && (
                    <div className="mt-4 pt-3 border-top">
                      <label className="form-label fw-bold text-dark fs-13">
                        <i className="ti ti-truck-delivery text-primary me-2"></i>
                        Campus Delivery / Shipping Address <span className="text-danger">*</span>
                      </label>
                      <textarea
                        rows={2}
                        className="form-control fs-13"
                        placeholder="Enter complete school campus address, city, state, and PIN code for hardware courier dispatch..."
                        value={addonShippingAddress}
                        onChange={(e) => setAddonShippingAddress(e.target.value)}
                      ></textarea>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Add-on Checkout Summary (Zero GST) */}
            <div className="col-12 col-lg-4">
              <div className="card border-0 shadow-sm rounded-3 sticky-top" style={{ top: '84px' }}>
                <div className="card-header bg-white border-bottom p-3 p-md-4">
                  <h5 className="fw-bold text-dark mb-0 fs-16">
                    <i className="ti ti-shopping-bag me-2 text-primary"></i>
                    Add-on Order Summary
                  </h5>
                </div>
                <div className="card-body p-3 p-md-4 bg-white">
                  {addonSubtotal <= 0 ? (
                    <div className="text-center py-4 text-muted fs-13">
                      <i className="ti ti-box fs-32 d-block mb-2 opacity-50"></i>
                      Select Cloud Storage, SMS/Push Credits, or Hardware items on the left to build your add-on order.
                    </div>
                  ) : (
                    <>
                      {selectedAddonStoragePlan && (
                        <div className="d-flex justify-content-between fs-13 mb-2">
                          <span className="text-muted">
                            Cloud Storage: <strong className="text-dark">{selectedAddonStoragePlan.plan_name}</strong>
                          </span>
                          <strong className="text-dark">₹{addonStorageTotal.toLocaleString('en-IN')}</strong>
                        </div>
                      )}
                      {selectedAddonNotificationsList.map((n) => (
                        <div className="d-flex justify-content-between fs-13 mb-2" key={n.id}>
                          <span className="text-muted">
                            {n.pack_name || n.name} ({n.quantity.toLocaleString('en-IN')})
                          </span>
                          <strong className="text-dark">
                            ₹{n.totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </strong>
                        </div>
                      ))}
                      {selectedAddonMachinesList.map((m) => (
                        <div className="d-flex justify-content-between fs-13 mb-2" key={m.id}>
                          <span className="text-muted">
                            {m.machine_name} × {m.quantity}
                          </span>
                          <strong className="text-dark">₹{m.totalPrice.toLocaleString('en-IN')}</strong>
                        </div>
                      ))}
                      {selectedAddonCardsList.map((c) => (
                        <div className="d-flex justify-content-between fs-13 mb-2" key={c.id}>
                          <span className="text-muted">
                            {c.card_name} × {c.quantity}
                          </span>
                          <strong className="text-dark">
                            ₹{c.totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </strong>
                        </div>
                      ))}

                      {/* Promo Coupon */}
                      <div className="border-top pt-3 mt-3">
                        {!addonAppliedCoupon ? (
                          <form onSubmit={handleApplyAddonCoupon} className="input-group input-group-sm">
                            <input
                              type="text"
                              className="form-control text-uppercase"
                              placeholder="Promo Code (Optional)"
                              value={addonCouponInput}
                              onChange={(e) => {
                                setAddonCouponInput(e.target.value.toUpperCase());
                                setAddonCouponError(null);
                              }}
                            />
                            <button
                              type="submit"
                              className="btn btn-outline-primary fw-semibold"
                              disabled={isValidatingAddonCoupon || !addonCouponInput.trim()}
                            >
                              {isValidatingAddonCoupon ? '...' : 'Apply'}
                            </button>
                          </form>
                        ) : (
                          <div className="p-2 rounded bg-success-subtle border border-success-subtle d-flex justify-content-between align-items-center fs-12">
                            <span className="text-success fw-bold">
                              {addonAppliedCoupon.code} (-₹{addonDiscountAmount.toLocaleString('en-IN')})
                            </span>
                            <button
                              type="button"
                              className="btn btn-sm btn-link text-danger p-0 text-decoration-none fs-11"
                              onClick={() => setAddonAppliedCoupon(null)}
                            >
                              Remove
                            </button>
                          </div>
                        )}
                        {addonCouponError && (
                          <div className="text-danger fs-11 mt-1">{addonCouponError}</div>
                        )}
                      </div>

                      {/* Payment Method Toggle */}
                      <div className="border-top pt-3 mt-3">
                        <label className="form-label fs-12 fw-bold text-dark mb-2">Payment Method</label>
                        <div className="d-grid gap-2">
                          <label
                            className={`p-2 px-3 rounded-2 border d-flex align-items-center fs-12 ${
                              addonGateway === 'razorpay' ? 'border-primary' : 'bg-white'
                            }`}
                            style={{
                              cursor: 'pointer',
                              backgroundColor: addonGateway === 'razorpay' ? '#eef2ff' : undefined,
                            }}
                          >
                            <input
                              type="radio"
                              name="addon_gw"
                              className="form-check-input me-2"
                              checked={addonGateway === 'razorpay'}
                              onChange={() => setAddonGateway('razorpay')}
                            />
                            <span className="fw-semibold text-dark">Instant Online Checkout (Razorpay)</span>
                          </label>
                          <label
                            className={`p-2 px-3 rounded-2 border d-flex align-items-center fs-12 ${
                              addonGateway === 'bank_transfer' ? 'border-primary' : 'bg-white'
                            }`}
                            style={{
                              cursor: 'pointer',
                              backgroundColor: addonGateway === 'bank_transfer' ? '#eef2ff' : undefined,
                            }}
                          >
                            <input
                              type="radio"
                              name="addon_gw"
                              className="form-check-input me-2"
                              checked={addonGateway === 'bank_transfer'}
                              onChange={() => setAddonGateway('bank_transfer')}
                            />
                            <span className="fw-semibold text-dark">Offline Bank Transfer (UTR)</span>
                          </label>
                        </div>

                        {addonGateway === 'bank_transfer' && (
                          <div className="mt-3 p-3 rounded bg-light border fs-11">
                            {activeBankAccount ? (
                              <>
                                <div className="mb-2 text-muted">
                                  <strong className="text-dark d-block">{activeBankAccount.bank_name}</strong>
                                  A/C: <span className="font-monospace text-dark">{activeBankAccount.account_number}</span> • IFSC:{' '}
                                  <span className="font-monospace text-dark">{activeBankAccount.ifsc_code}</span>
                                </div>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  placeholder="Enter Bank UTR / Reference Number *"
                                  value={addonUtr}
                                  onChange={(e) => setAddonUtr(e.target.value)}
                                />
                              </>
                            ) : (
                              <span className="text-danger">No offline bank account configured. Use Online Checkout.</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Net Totals (Zero GST) */}
                      <div className="border-top pt-3 mt-3">
                        <div className="d-flex justify-content-between fs-13 mb-1">
                          <span className="text-muted">Subtotal</span>
                          <span className="fw-semibold text-dark">
                            ₹{addonSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        {addonDiscountAmount > 0 && (
                          <div className="d-flex justify-content-between fs-13 mb-1 text-success">
                            <span>Promo Discount</span>
                            <span className="fw-bold">
                              -₹{addonDiscountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}
                        <div className="d-flex justify-content-between align-items-center pt-2 border-top mt-2 mb-3">
                          <span className="fw-bold text-dark fs-14">Total Net Due</span>
                          <span className="fw-bold text-primary fs-20">
                            ₹{addonGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={handleAddonCheckout}
                          disabled={isProcessingAddon || !isActive}
                          className="btn btn-primary w-100 py-2 px-3 fw-bold fs-14 shadow-sm"
                        >
                          {isProcessingAddon
                            ? 'Processing...'
                            : addonGateway === 'razorpay'
                            ? `Pay ₹${addonGrandTotal.toLocaleString('en-IN')} & Activate`
                            : 'Submit Offline Add-on Order'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: BILLING HISTORY & ZERO-GST INVOICES
      ===================================================================== */}
      {activeTab === 'history' && (
        <div className="card border-0 shadow-sm rounded-3 mb-5">
          <div className="card-header bg-white border-bottom p-3 p-md-4 d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div>
              <h5 className="fw-bold text-dark mb-1 fs-16">
                <i className="ti ti-receipt-2 text-primary me-2"></i>
                Institutional Billing History &amp; Official Invoices
              </h5>
              <p className="text-muted fs-12 mb-0">
                Complete audit trail of your subscription activations, renewals, upgrades, and add-on orders.
              </p>
            </div>
            <button
              type="button"
              onClick={loadBillingOrders}
              disabled={ordersLoading}
              className="btn btn-sm btn-light border text-dark d-inline-flex align-items-center"
            >
              <i className="ti ti-refresh me-2"></i>
              <span>Refresh</span>
            </button>
          </div>

          <div className="card-body p-0 bg-white">
            {ordersLoading ? (
              <div className="text-center py-5 text-muted fs-13">
                <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                Loading billing history &amp; invoices...
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-5 text-muted fs-13">
                <i className="ti ti-receipt-off fs-36 d-block mb-2 opacity-50"></i>
                No billing transactions recorded yet.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr className="fs-11 text-uppercase text-muted">
                      <th className="ps-4">Order / Invoice</th>
                      <th>Package / Type</th>
                      <th>Date</th>
                      <th>Payment Method</th>
                      <th>Validity</th>
                      <th className="text-end">Net Amount</th>
                      <th className="text-center">Status</th>
                      <th className="text-end pe-4">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="fs-13">
                    {orders.map((ord, idx) => {
                      const st = String(ord.status || '').toLowerCase();
                      const isPaid = st === 'paid' || st === 'active' || st === 'completed';
                      const isPend = st === 'pending_verification' || st === 'pending';
                      const isFail = st === 'failed' || st === 'rejected';
                      const isPaymentOrder = ord.record_source !== 'legacy_subscription';

                      return (
                        <tr key={`${ord.order_no || idx}`}>
                          <td className="ps-4">
                            <div className="fw-bold text-dark font-monospace fs-12">
                              {ord.order_no || '—'}
                            </div>
                            {ord.invoice_no && (
                              <div className="text-primary font-monospace fs-11">{ord.invoice_no}</div>
                            )}
                          </td>
                          <td>
                            <div className="fw-semibold text-dark">
                              {ord.order_type === 'addon_only'
                                ? 'Standalone Add-ons'
                                : ord.plan_name || 'Subscription'}
                            </div>
                            <div className="text-muted fs-11 text-capitalize">
                              {ord.action_type || ord.order_type || 'subscription'}
                              {ord.billing_cycle ? ` • ${ord.cycle_meta?.label || resolveCycleMeta(ord.billing_cycle).label || ord.billing_cycle}` : ''}
                            </div>
                          </td>
                          <td className="text-muted fs-12">
                            {formatDateDisplay(ord.date || ord.paid_at || ord.created_at)}
                          </td>
                          <td>
                            <span className="badge bg-light text-dark border fs-11 text-capitalize">
                              {String(ord.payment_method || 'online').replace(/_/g, ' ')}
                            </span>
                            {ord.transaction_ref && (
                              <div
                                className="text-muted font-monospace fs-10 mt-1 text-truncate"
                                style={{ maxWidth: '140px' }}
                                title={ord.transaction_ref}
                              >
                                {ord.transaction_ref}
                              </div>
                            )}
                          </td>
                          <td className="fs-12 text-muted">
                            {ord.start_date && ord.end_date
                              ? `${formatDateDisplay(ord.start_date)} → ${formatDateDisplay(ord.end_date)}`
                              : '—'}
                          </td>
                          <td className="text-end fw-bold text-dark">
                            ₹{Number(ord.grand_total ?? ord.amount_paid ?? 0).toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="text-center">
                            <span
                              className={`badge rounded-pill px-3 py-1 fs-10 fw-bold text-uppercase ${
                                isPaid
                                  ? 'bg-success-subtle text-success border border-success-subtle'
                                  : isPend
                                  ? 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'
                                  : isFail
                                  ? 'bg-danger-subtle text-danger border border-danger-subtle'
                                  : 'bg-light text-muted border'
                              }`}
                            >
                              {isPaid ? 'Paid' : isPend ? 'Pending UTR' : ord.status}
                            </span>
                          </td>
                          <td className="text-end pe-4">
                            {isPaymentOrder && ord.order_no && !isFail ? (
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(
                                    `/admin/subscription/payment-success?order_no=${encodeURIComponent(ord.order_no)}`
                                  )
                                }
                                className="btn btn-sm btn-outline-primary py-1 px-3 fs-12 fw-semibold"
                              >
                                <i className="ti ti-printer me-1"></i> Invoice
                              </button>
                            ) : !isPaymentOrder && isPaid ? (
                              <button
                                type="button"
                                onClick={() => setLegacyReceiptModalOrder(ord)}
                                className="btn btn-sm btn-light border text-dark py-1 px-3 fs-12"
                              >
                                <i className="ti ti-file-text me-1"></i> Receipt
                              </button>
                            ) : isFail && ord.failure_reason ? (
                              <span className="text-danger fs-11" title={ord.failure_reason}>
                                Declined
                              </span>
                            ) : (
                              <span className="text-muted fs-11">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legacy Subscription Receipt Quick Modal (Zero GST) */}
      {legacyReceiptModalOrder && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.55)', zIndex: 1060 }}
          onClick={() => setLegacyReceiptModalOrder(null)}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content border-0 rounded-4 shadow">
              <div className="modal-header border-bottom p-3">
                <h6 className="modal-title fw-bold text-dark">
                  Subscription Payment Receipt ({legacyReceiptModalOrder.invoice_no || legacyReceiptModalOrder.order_no})
                </h6>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setLegacyReceiptModalOrder(null)}
                ></button>
              </div>
              <div className="modal-body p-4 fs-13">
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Plan:</span>
                  <strong className="text-dark">{legacyReceiptModalOrder.plan_name}</strong>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Billing Cycle:</span>
                  <strong className="text-dark">
                    {legacyReceiptModalOrder.cycle_meta?.label ||
                      resolveCycleMeta(legacyReceiptModalOrder.billing_cycle).label ||
                      legacyReceiptModalOrder.billing_cycle}
                  </strong>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Validity:</span>
                  <strong className="text-dark">
                    {formatDateDisplay(legacyReceiptModalOrder.start_date)} →{' '}
                    {formatDateDisplay(legacyReceiptModalOrder.end_date)}
                  </strong>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Transaction Ref:</span>
                  <span className="font-monospace text-dark">
                    {legacyReceiptModalOrder.transaction_ref || '—'}
                  </span>
                </div>
                <div className="border-top pt-3 mt-3 d-flex justify-content-between align-items-center">
                  <span className="fw-bold text-dark">Net Amount Paid</span>
                  <span className="fw-bold text-primary fs-18">
                    ₹{Number(legacyReceiptModalOrder.grand_total || 0).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
              <div className="modal-footer border-top p-3">
                <button
                  type="button"
                  className="btn btn-light border text-dark btn-sm px-3"
                  onClick={() => setLegacyReceiptModalOrder(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionBilling;
