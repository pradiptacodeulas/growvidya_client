import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { useSubscription } from '../../../context/SubscriptionContext';
import { loadRazorpayScript } from '../../../utils/loadRazorpay';
import {
  createSubscriptionOrder,
  verifySubscriptionPayment,
  upgradeSubscription,
  getConfigurationCatalog,
  validateSubscriptionCoupon,
  recordSubscriptionPaymentFailure,
} from '../../../api/subscription.api';
import { resolveImageUrl } from '../../../utils/url.util';

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

const SubscriptionConfigure = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useSelector((state) => state.auth || {});
  const { subscription, upgradePlans, refreshSubscription } = useSubscription();

  // Retrieve selected plan and billing cycle from location state or sessionStorage
  const [rawSelectedPlan, setRawSelectedPlan] = useState(() => {
    if (location.state?.plan) {
      return location.state.plan;
    }
    try {
      const stored = sessionStorage.getItem('selected_subscription_plan');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Could not parse stored plan from sessionStorage', e);
    }
    return null;
  });

  // Always resolve against fresh `upgradePlans` from backend so transition rules & projected dates stay authoritative
  const selectedPlan = useMemo(() => {
    if (!rawSelectedPlan) return null;
    if (Array.isArray(upgradePlans) && upgradePlans.length > 0) {
      const freshMatch = upgradePlans.find((p) => Number(p.id) === Number(rawSelectedPlan.id));
      if (freshMatch) return freshMatch;
    }
    return rawSelectedPlan;
  }, [rawSelectedPlan, upgradePlans]);

  const billingCycle = useMemo(() => {
    if (selectedPlan?.billing_cycle) {
      return String(selectedPlan.billing_cycle).toLowerCase();
    }
    if (location.state?.billingCycle) {
      return String(location.state.billingCycle).toLowerCase();
    }
    return String(sessionStorage.getItem('selected_billing_cycle') || 'annual').toLowerCase();
  }, [selectedPlan?.billing_cycle, location.state?.billingCycle]);

  const cycleMeta = useMemo(
    () => selectedPlan?.cycle_meta || { cycle: billingCycle, label: billingCycle, shortLabel: billingCycle },
    [selectedPlan?.cycle_meta, billingCycle]
  );

  // If no plan was stored, pick first switchable plan from upgradePlans
  useEffect(() => {
    if (!rawSelectedPlan && Array.isArray(upgradePlans) && upgradePlans.length > 0) {
      const matched =
        upgradePlans.find(
          (p) => String(p.billing_cycle).toLowerCase() === billingCycle && p.can_switch !== false
        ) ||
        upgradePlans.find((p) => p.can_switch !== false) ||
        upgradePlans[0];
      if (matched) {
        setRawSelectedPlan(matched);
        sessionStorage.setItem('selected_subscription_plan', JSON.stringify(matched));
        sessionStorage.setItem('selected_billing_cycle', matched.billing_cycle || 'annual');
      }
    }
  }, [rawSelectedPlan, upgradePlans, billingCycle]);

  // Authoritative No-Downgrade & Quota Guard (uses tier_rank, cycle_months, and max_students from backend policy)
  useEffect(() => {
    if (
      selectedPlan &&
      Array.isArray(upgradePlans) &&
      upgradePlans.length > 0 &&
      (selectedPlan.can_switch === false || selectedPlan.is_downgrade || selectedPlan.is_quota_locked)
    ) {
      toast.error(
        selectedPlan.lock_reason ||
          selectedPlan.downgrade_message ||
          'Downgrading to a lower tier or shorter billing cycle is not permitted.'
      );
      navigate('/admin/subscription', { replace: true });
    }
  }, [selectedPlan, upgradePlans, navigate]);

  // Catalog data
  const [catalog, setCatalog] = useState({
    storage_plans: [],
    attendance_machines: [],
    rfid_cards: [],
    bank_accounts: [],
    notification_records: [],
  });
  const [catalogLoading, setCatalogLoading] = useState(true);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        setCatalogLoading(true);
        const data = await getConfigurationCatalog();
        if (data) {
          const rawAccounts = Array.isArray(data.bank_accounts) ? data.bank_accounts : [];
          const eligibleAccounts = rawAccounts.filter((acc) => {
            const isDefault = Number(acc.is_default) === 1 || acc.is_default === true;
            const isActive = acc.status === undefined || Number(acc.status) === 1 || acc.status === true;
            return isDefault && isActive;
          });

          setCatalog({
            storage_plans: data.storage_plans || [],
            attendance_machines: data.attendance_machines || [],
            rfid_cards: data.rfid_cards || [],
            bank_accounts: eligibleAccounts,
            notification_records: data.notification_records || [],
          });
        }
      } catch (err) {
        console.warn('Failed to load configuration catalog:', err);
      } finally {
        setCatalogLoading(false);
      }
    };
    fetchCatalog();
  }, []);

  const eligibleBankAccounts = useMemo(() => {
    if (!catalog.bank_accounts || !Array.isArray(catalog.bank_accounts)) return [];
    return catalog.bank_accounts.filter((acc) => {
      const isDefault = Number(acc.is_default) === 1 || acc.is_default === true;
      const isActive = acc.status === undefined || Number(acc.status) === 1 || acc.status === true;
      return isDefault && isActive;
    });
  }, [catalog.bank_accounts]);

  const [selectedBankAccountId, setSelectedBankAccountId] = useState(null);

  useEffect(() => {
    if (eligibleBankAccounts.length > 0) {
      if (
        !selectedBankAccountId ||
        !eligibleBankAccounts.some((acc) => Number(acc.id) === Number(selectedBankAccountId))
      ) {
        setSelectedBankAccountId(eligibleBankAccounts[0].id);
      }
    } else {
      setSelectedBankAccountId(null);
    }
  }, [eligibleBankAccounts, selectedBankAccountId]);

  const activeBankAccount = useMemo(() => {
    if (eligibleBankAccounts.length === 0) return null;
    return (
      eligibleBankAccounts.find((acc) => Number(acc.id) === Number(selectedBankAccountId)) ||
      eligibleBankAccounts[0]
    );
  }, [eligibleBankAccounts, selectedBankAccountId]);

  // Add-on Selections
  const [selectedStorageId, setSelectedStorageId] = useState(null);
  const [selectedMachines, setSelectedMachines] = useState({});
  const [selectedCards, setSelectedCards] = useState({});
  const [selectedNotifications, setSelectedNotifications] = useState({});
  const [shippingAddress, setShippingAddress] = useState(
    () => user?.address || user?.schoolAddress || ''
  );

  // Collapsible sections
  const [collapsedSections, setCollapsedSections] = useState({
    storage: false,
    machines: true,
    cards: true,
    notifications: false,
  });

  const toggleSection = (sectionKey) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  // Payment state (supports ?gateway=bank_transfer fallback from PaymentFailure page)
  const gatewayQuery = searchParams.get('gateway');
  const [paymentGateway, setPaymentGateway] = useState(() =>
    gatewayQuery === 'bank_transfer' ? 'bank_transfer' : 'razorpay'
  );
  const [utrNumber, setUtrNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (gatewayQuery === 'bank_transfer') {
      setPaymentGateway('bank_transfer');
    }
  }, [gatewayQuery]);

  // Coupon state
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState(null);

  const includedItems = useMemo(() => {
    if (!selectedPlan?.items) return [];
    return selectedPlan.items;
  }, [selectedPlan]);

  // Storage Handlers
  const handleSelectStorage = (storageId) => {
    setSelectedStorageId((prev) => (prev === storageId ? null : storageId));
  };

  // Attendance Machines Handlers
  const handleAddMachine = (machineId) => {
    setSelectedMachines((prev) => (prev[machineId] ? prev : { ...prev, [machineId]: 1 }));
  };

  const handleIncreaseMachineQty = (machineId) => {
    setSelectedMachines((prev) => ({ ...prev, [machineId]: (prev[machineId] || 0) + 1 }));
  };

  const handleDecreaseMachineQty = (machineId) => {
    setSelectedMachines((prev) => {
      const current = prev[machineId] || 0;
      if (current <= 1) {
        const next = { ...prev };
        delete next[machineId];
        return next;
      }
      return { ...prev, [machineId]: current - 1 };
    });
  };

  const handleRemoveMachine = (machineId) => {
    setSelectedMachines((prev) => {
      const next = { ...prev };
      delete next[machineId];
      return next;
    });
  };

  const handleClearAllMachines = () => setSelectedMachines({});

  // RFID Cards Handlers (enforces min_order_qty from rfid_card_master!)
  const handleAddCard = (card) => {
    const cardId = card.id;
    const minQty = Math.max(1, parseInt(card.min_order_qty, 10) || 1);
    setSelectedCards((prev) => (prev[cardId] ? prev : { ...prev, [cardId]: minQty }));
  };

  const handleIncreaseCardQty = (card, step = null) => {
    const cardId = card.id;
    const minQty = Math.max(1, parseInt(card.min_order_qty, 10) || 1);
    const inc = step || (minQty >= 50 ? 50 : 1);
    setSelectedCards((prev) => {
      const current = prev[cardId] || 0;
      if (current === 0) return { ...prev, [cardId]: minQty };
      return { ...prev, [cardId]: current + inc };
    });
  };

  const handleDecreaseCardQty = (card, step = null) => {
    const cardId = card.id;
    const minQty = Math.max(1, parseInt(card.min_order_qty, 10) || 1);
    const dec = step || (minQty >= 50 ? 50 : 1);
    setSelectedCards((prev) => {
      const current = prev[cardId] || 0;
      if (current <= minQty) {
        const next = { ...prev };
        delete next[cardId];
        return next;
      }
      return { ...prev, [cardId]: Math.max(minQty, current - dec) };
    });
  };

  const handleSetCardQty = (card, rawVal) => {
    const cardId = card.id;
    const minQty = Math.max(1, parseInt(card.min_order_qty, 10) || 1);
    const parsed = parseInt(rawVal, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
      handleRemoveCard(cardId);
      return;
    }
    setSelectedCards((prev) => ({ ...prev, [cardId]: Math.max(minQty, parsed) }));
  };

  const handleRemoveCard = (cardId) => {
    setSelectedCards((prev) => {
      const next = { ...prev };
      delete next[cardId];
      return next;
    });
  };

  const handleClearAllCards = () => setSelectedCards({});

  // SMS & Push Notifications Handlers (enforces min_qty from notification_pricing_master!)
  const handleToggleNotification = (record) => {
    const recordId = record.id;
    const minQty = Math.max(1, parseInt(record.min_qty, 10) || 1);
    setSelectedNotifications((prev) => {
      const existing = prev[recordId];
      if (existing && existing.selected) {
        return { ...prev, [recordId]: { ...existing, selected: false } };
      }
      return {
        ...prev,
        [recordId]: {
          selected: true,
          quantity: Math.max(minQty, parseInt(existing?.quantity, 10) || minQty),
        },
      };
    });
  };

  const handleIncreaseNotificationQty = (record, step) => {
    const recordId = record.id;
    const minQty = Math.max(1, parseInt(record.min_qty, 10) || 1);
    const inc = Math.max(1, parseInt(step, 10) || minQty);
    setSelectedNotifications((prev) => {
      const existing = prev[recordId] || { selected: true, quantity: minQty };
      const current = parseInt(existing.quantity, 10) || minQty;
      return { ...prev, [recordId]: { selected: true, quantity: current + inc } };
    });
  };

  const handleDecreaseNotificationQty = (record, step) => {
    const recordId = record.id;
    const minQty = Math.max(1, parseInt(record.min_qty, 10) || 1);
    const dec = Math.max(1, parseInt(step, 10) || minQty);
    setSelectedNotifications((prev) => {
      const existing = prev[recordId];
      if (!existing) return prev;
      const current = parseInt(existing.quantity, 10) || minQty;
      const nextQty = Math.max(minQty, current - dec);
      return { ...prev, [recordId]: { ...existing, quantity: nextQty } };
    });
  };

  const handleSetNotificationQty = (record, val) => {
    const recordId = record.id;
    const parsed = parseInt(val, 10);
    const newQty = Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;
    setSelectedNotifications((prev) => ({
      ...prev,
      [recordId]: {
        selected: prev[recordId]?.selected ?? true,
        quantity: newQty,
      },
    }));
  };

  // =========================================================================
  // Pricing Calculations (100% Parity with Backend SubscriptionPolicyService, Zero GST)
  // =========================================================================
  const basePrice = Math.round((parseFloat(selectedPlan?.price || 0) || 0) * 100) / 100;

  const selectedStoragePlan = useMemo(() => {
    return catalog.storage_plans.find((s) => Number(s.id) === Number(selectedStorageId)) || null;
  }, [catalog.storage_plans, selectedStorageId]);

  const storageTotal = useMemo(() => {
    if (!selectedStoragePlan) return 0;
    return Number(selectedStoragePlan?.cycle_prices?.[billingCycle] ?? 0);
  }, [selectedStoragePlan, billingCycle]);

  const selectedMachinesList = useMemo(() => {
    if (!catalog.attendance_machines?.length) return [];
    const list = [];
    for (const [idStr, qty] of Object.entries(selectedMachines)) {
      const machine = catalog.attendance_machines.find((m) => Number(m.id) === Number(idStr));
      if (machine && qty > 0) {
        const unitPrice = parseFloat(machine.unit_price || 0);
        list.push({
          ...machine,
          quantity: qty,
          unitPrice,
          totalPrice: Math.round(unitPrice * qty * 100) / 100,
        });
      }
    }
    return list;
  }, [selectedMachines, catalog.attendance_machines]);

  const machinesTotal = useMemo(
    () => selectedMachinesList.reduce((sum, m) => sum + m.totalPrice, 0),
    [selectedMachinesList]
  );

  const selectedCardsList = useMemo(() => {
    if (!catalog.rfid_cards?.length) return [];
    const list = [];
    for (const [idStr, qty] of Object.entries(selectedCards)) {
      const card = catalog.rfid_cards.find((c) => Number(c.id) === Number(idStr));
      if (card && qty > 0) {
        const unitPrice = parseFloat(card.unit_price || 0);
        list.push({
          ...card,
          quantity: qty,
          unitPrice,
          totalPrice: Math.round(unitPrice * qty * 100) / 100,
        });
      }
    }
    return list;
  }, [selectedCards, catalog.rfid_cards]);

  const cardsTotal = useMemo(
    () => selectedCardsList.reduce((sum, c) => sum + c.totalPrice, 0),
    [selectedCardsList]
  );

  const selectedNotificationsList = useMemo(() => {
    if (!catalog.notification_records?.length) return [];
    const list = [];
    for (const record of catalog.notification_records) {
      const cfg = selectedNotifications[record.id];
      if (cfg && cfg.selected && cfg.quantity > 0) {
        const unitPrice = parseFloat(record.cost || record.unit_price || 0);
        const qty = parseInt(cfg.quantity, 10) || 0;
        list.push({
          ...record,
          quantity: qty,
          unitPrice,
          totalPrice: Math.round(unitPrice * qty * 100) / 100,
        });
      }
    }
    return list;
  }, [selectedNotifications, catalog.notification_records]);

  const notificationsTotal = useMemo(
    () => selectedNotificationsList.reduce((sum, item) => sum + item.totalPrice, 0),
    [selectedNotificationsList]
  );

  const hasPhysicalHardware =
    selectedMachinesList.length > 0 || selectedCardsList.length > 0;

  const subtotal =
    Math.round(
      (basePrice + storageTotal + machinesTotal + cardsTotal + notificationsTotal) * 100
    ) / 100;

  // Scoped Coupon Discount Calculation (respects 'plan_only' default vs 'software_and_storage' vs 'all')
  const discountAmount = useMemo(() => {
    if (!appliedCoupon || subtotal <= 0) return 0;
    const scope = String(appliedCoupon.applicable_scope || 'plan_only').toLowerCase();
    const eligibleBase =
      scope === 'all'
        ? subtotal
        : scope === 'software_and_storage'
        ? basePrice + storageTotal
        : basePrice;

    if (eligibleBase <= 0) return 0;

    if (appliedCoupon.discountType === 'percentage') {
      const computed = (eligibleBase * parseFloat(appliedCoupon.discountValue || 0)) / 100;
      const maxDiscount = appliedCoupon.maxDiscountAmount
        ? parseFloat(appliedCoupon.maxDiscountAmount)
        : null;
      const capped = maxDiscount ? Math.min(computed, maxDiscount) : computed;
      return Math.min(eligibleBase, Math.round(capped * 100) / 100);
    }
    return Math.min(eligibleBase, parseFloat(appliedCoupon.discountValue || 0));
  }, [appliedCoupon, subtotal, basePrice, storageTotal]);

  // Flat Net Grand Total (Zero GST)
  const grandTotal = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

  const isCurrentPlan = Boolean(
    selectedPlan &&
      (selectedPlan.is_current ||
        (subscription?.plan_id && Number(selectedPlan.id) === Number(subscription.plan_id)))
  );

  // Coupon Handlers
  const handleApplyCoupon = async (e) => {
    if (e) e.preventDefault();
    const cleanCode = couponCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      setCouponError('Please enter a coupon code.');
      return;
    }

    setIsValidatingCoupon(true);
    setCouponError(null);

    try {
      const data = await validateSubscriptionCoupon(cleanCode, subtotal, {
        planAmount: basePrice,
        storageAmount: storageTotal,
      });
      setAppliedCoupon({
        id: data.id,
        code: data.code,
        description: data.description,
        discountType: data.discountType,
        discountValue: parseFloat(data.discountValue),
        discountAmount: parseFloat(data.discountAmount),
        maxDiscountAmount: data.max_discount_amount || data.maxDiscountAmount || null,
        applicable_scope: data.applicable_scope || 'plan_only',
      });
      toast.success(
        `Coupon "${data.code}" applied! You saved ₹${parseFloat(data.discountAmount).toLocaleString('en-IN')}`
      );
      setCouponCodeInput('');
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Invalid coupon code.';
      setCouponError(msg);
      toast.error(msg);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
    setCouponCodeInput('');
    toast.info('Coupon removed.');
  };

  // Checkout Execution
  const handleProceedPayment = async () => {
    if (!selectedPlan) {
      toast.error('No subscription plan selected. Please choose a plan first.');
      navigate('/admin/subscription');
      return;
    }

    // Validate minimum RFID & Notification quantities before checkout
    for (const c of selectedCardsList) {
      const minQty = Math.max(1, parseInt(c.min_order_qty, 10) || 1);
      if (c.quantity < minQty) {
        toast.error(`Minimum order quantity for "${c.card_name}" is ${minQty} pcs.`);
        return;
      }
    }
    for (const n of selectedNotificationsList) {
      const minQty = Math.max(1, parseInt(n.min_qty, 10) || 1);
      if (n.quantity < minQty) {
        toast.error(`Minimum purchase quantity for "${n.pack_name || n.name}" is ${minQty} credits.`);
        return;
      }
    }

    if (hasPhysicalHardware && (!shippingAddress || shippingAddress.trim().length < 6)) {
      toast.error('Please enter a complete Campus Delivery / Shipping Address for hardware dispatch.');
      return;
    }

    try {
      setIsProcessing(true);

      const orderPayload = {
        plan_id: selectedPlan.id,
        storage_plan_id: selectedStorageId || null,
        storage_qty: selectedStorageId ? 1 : 0,
        storage_billing_cycle: billingCycle,
        selected_machines: selectedMachinesList.map((m) => ({
          id: Number(m.id),
          quantity: Number(m.quantity),
        })),
        selected_cards: selectedCardsList.map((c) => ({
          id: Number(c.id),
          quantity: Number(c.quantity),
        })),
        selected_notifications: selectedNotificationsList.map((n) => ({
          id: Number(n.id),
          type: n.type || n.channel,
          quantity: Number(n.quantity),
        })),
        coupon_code: appliedCoupon ? appliedCoupon.code : null,
        shipping_address: hasPhysicalHardware ? shippingAddress.trim() : null,
        amount_paid: grandTotal,
      };

      if (paymentGateway === 'razorpay' || grandTotal <= 0) {
        if (grandTotal > 0) {
          const isLoaded = await loadRazorpayScript();
          if (!isLoaded) {
            toast.error('Could not connect to Razorpay SDK. Please check your internet connection.');
            setIsProcessing(false);
            return;
          }
        }

        const orderRes = await createSubscriptionOrder(orderPayload);
        const orderData = orderRes?.data || orderRes;

        // 100% Discount Coupon -> Instant ₹0 Activation without Razorpay modal!
        if (orderData?.zero_amount_activated) {
          toast.success(`${selectedPlan.plan_name} activated immediately!`);
          sessionStorage.removeItem('selected_subscription_plan');
          sessionStorage.removeItem('selected_billing_cycle');
          if (refreshSubscription) await refreshSubscription();
          navigate(
            `/admin/subscription/payment-success?order_no=${encodeURIComponent(orderData.order_no || '')}`
          );
          return;
        }

        if (!orderData?.order_id) {
          throw new Error(orderRes?.message || 'Failed to initialize payment order with gateway.');
        }

        const options = {
          key: orderData.key_id,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: 'GrowVidya School ERP',
          description: `${isCurrentPlan ? 'License Renewal' : 'Subscription'}: ${selectedPlan.plan_name} (${cycleMeta.label})`,
          order_id: orderData.order_id,
          prefill: {
            name: user?.name || user?.schoolName || user?.school_name || 'School Administrator',
            email: user?.email || '',
            contact: user?.phone || user?.mobile || '',
          },
          notes: {
            school_id: user?.schoolId || user?.school_id || '',
            plan_id: selectedPlan.id,
            order_no: orderData.order_no || '',
            billing_cycle: billingCycle,
          },
          theme: {
            color: '#4f46e5',
          },
          handler: async function (response) {
            try {
              setIsProcessing(true);
              const verifyRes = await verifySubscriptionPayment({
                order_no: orderData.order_no,
                payment_order_id: orderData.payment_order_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                ...orderPayload,
              });

              toast.success(
                `Payment verified! ${selectedPlan.plan_name} is now active immediately.`
              );

              sessionStorage.removeItem('selected_subscription_plan');
              sessionStorage.removeItem('selected_billing_cycle');

              if (refreshSubscription) await refreshSubscription();
              const resolvedOrderNo = verifyRes?.order_no || orderData.order_no || '';
              navigate(
                `/admin/subscription/payment-success?order_no=${encodeURIComponent(resolvedOrderNo)}`
              );
            } catch (err) {
              console.error('Payment verification failed:', err);
              toast.error(
                err?.response?.data?.message ||
                  err?.message ||
                  'Payment verification failed. Please contact support.'
              );
            } finally {
              setIsProcessing(false);
            }
          },
          modal: {
            ondismiss: function () {
              setIsProcessing(false);
              toast.info('Payment window was closed.');
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', async function (resp) {
          console.error('Razorpay payment failed:', resp.error);
          const failureReason =
            resp.error?.description || 'Transaction was declined by your bank or payment gateway.';
          try {
            await recordSubscriptionPaymentFailure({
              order_no: orderData.order_no,
              payment_order_id: orderData.payment_order_id,
              razorpay_order_id: orderData.order_id,
              razorpay_payment_id: resp.error?.metadata?.payment_id || null,
              error_code: resp.error?.code || 'PAYMENT_FAILED',
              error_description: failureReason,
            });
          } catch {
            // Non-blocking audit log
          }
          setIsProcessing(false);
          navigate(
            `/admin/subscription/payment-failed?order_no=${encodeURIComponent(
              orderData.order_no || ''
            )}&reason=${encodeURIComponent(failureReason)}`
          );
        });

        rzp.open();
      } else {
        // Direct bank transfer / offline payment request (passes full add-on bundle!)
        if (!eligibleBankAccounts?.length || !activeBankAccount) {
          toast.error(
            'No active bank account is configured for offline transfers. Please use Instant Online Checkout.'
          );
          setIsProcessing(false);
          return;
        }

        if (!utrNumber || String(utrNumber).trim().length < 4) {
          toast.error('Please enter the Bank Transfer reference or UTR number from your payment receipt.');
          setIsProcessing(false);
          return;
        }

        const res = await upgradeSubscription({
          ...orderPayload,
          payment_gateway: 'bank_transfer',
          payment_transaction_id: String(utrNumber).trim(),
        });

        toast.info(
          `Offline payment request recorded for ${selectedPlan.plan_name}. It will activate once Super Admin verifies your UTR.`
        );

        sessionStorage.removeItem('selected_subscription_plan');
        sessionStorage.removeItem('selected_billing_cycle');

        if (refreshSubscription) await refreshSubscription();
        if (res?.order_no) {
          navigate(`/admin/subscription/payment-success?order_no=${encodeURIComponent(res.order_no)}`);
        } else {
          navigate('/admin/subscription');
        }
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      toast.error(
        err?.response?.data?.message || err?.message || 'Failed to complete order. Please try again.'
      );
      setIsProcessing(false);
    }
  };

  if (!selectedPlan) {
    return (
      <div className="content d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
        <div className="text-center p-4 bg-white rounded-3 shadow-sm" style={{ maxWidth: '480px' }}>
          <i className="ti ti-alert-circle text-warning fs-48 mb-3 d-block"></i>
          <h5 className="fw-bold text-dark mb-2">No Subscription Plan Selected</h5>
          <p className="text-muted fs-13 mb-4">
            Please select a subscription tier before proceeding to configuration and checkout.
          </p>
          <Link to="/admin/subscription" className="btn btn-primary px-4 py-2 fw-semibold">
            <i className="ti ti-arrow-left me-2"></i> Browse Subscription Plans
          </Link>
        </div>
      </div>
    );
  }

  const includedStorageGb = Math.max(0, parseInt(selectedPlan.included_storage_gb, 10) || 0);

  return (
    <div className="content">
      {/* Breadcrumb & Navigation */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-4">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-1 fs-12">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard" className="text-muted text-decoration-none">
                  Dashboard
                </Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/subscription" className="text-muted text-decoration-none">
                  Subscription &amp; Billing
                </Link>
              </li>
              <li className="breadcrumb-item active text-primary fw-semibold" aria-current="page">
                Configure &amp; Checkout
              </li>
            </ol>
          </nav>
          <h3 className="page-title mb-1 fw-bold text-dark">Configure Your Subscription &amp; Add-ons</h3>
          <p className="text-muted fs-13 mb-0">
            Review your selected package, add optional cloud storage, hardware, or notification credits, and complete checkout.
          </p>
        </div>

        <div className="mt-3 mt-md-0">
          <Link
            to="/admin/subscription"
            className="btn btn-light border text-dark d-inline-flex align-items-center shadow-sm"
          >
            <i className="ti ti-arrow-left me-2 fs-16"></i>
            <span>Change Plan</span>
          </Link>
        </div>
      </div>

      {/* 3-Step Progress Indicator */}
      <div className="card border-0 shadow-sm rounded-3 mb-4 overflow-hidden">
        <div className="card-body p-3 bg-white">
          <div className="row align-items-center text-center g-2">
            <div className="col-12 col-md-4">
              <Link
                to="/admin/subscription"
                className="d-flex align-items-center justify-content-center text-decoration-none text-success"
              >
                <div
                  className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center me-2 flex-shrink-0"
                  style={{ width: '28px', height: '28px', fontSize: '13px' }}
                >
                  <i className="ti ti-check"></i>
                </div>
                <div className="text-start">
                  <div className="fw-bold fs-12">STEP 1</div>
                  <div className="fs-13 text-dark fw-semibold">Choose Plan</div>
                </div>
              </Link>
            </div>

            <div className="col-12 col-md-4">
              <div className="d-flex align-items-center justify-content-center text-primary">
                <div
                  className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-2 flex-shrink-0"
                  style={{ width: '28px', height: '28px', fontSize: '13px' }}
                >
                  2
                </div>
                <div className="text-start">
                  <div className="fw-bold fs-12 text-primary">STEP 2 (CURRENT)</div>
                  <div className="fs-13 text-dark fw-bold">Configure &amp; Add-ons</div>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <div className="d-flex align-items-center justify-content-center text-muted opacity-75">
                <div
                  className="rounded-circle bg-light border text-muted d-flex align-items-center justify-content-center me-2 flex-shrink-0"
                  style={{ width: '28px', height: '28px', fontSize: '13px' }}
                >
                  3
                </div>
                <div className="text-start">
                  <div className="fw-bold fs-12 text-muted">STEP 3</div>
                  <div className="fs-13 text-muted">Activation &amp; Invoice</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="row g-4">
        {/* Left Column */}
        <div className="col-12 col-lg-8">
          {/* Card 1: Selected Plan Details */}
          <div className="card border-0 shadow-sm rounded-3 mb-4 overflow-hidden">
            <div
              className="p-4 text-white"
              style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <span className="badge bg-primary text-white fw-bold px-3 py-1 fs-11 rounded-pill text-uppercase">
                    {cycleMeta.label} Billing
                  </span>
                  {isCurrentPlan && (
                    <span className="badge bg-warning text-dark fw-bold px-3 py-1 fs-11 rounded-pill">
                      ★ Current Plan Renewal
                    </span>
                  )}
                  {isCurrentPlan && selectedPlan.stacks_dates && (
                    <span className="badge bg-success text-white fw-bold px-3 py-1 fs-11 rounded-pill">
                      ✓ 100% Remaining Days Preserved
                    </span>
                  )}
                </div>
                <Link
                  to="/admin/subscription"
                  className="btn btn-sm text-white rounded-pill px-3 py-1 fs-11 d-inline-flex align-items-center"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.14)',
                    border: '1px solid rgba(255, 255, 255, 0.28)',
                  }}
                >
                  <i className="ti ti-switch-horizontal me-1"></i> Switch Plan
                </Link>
              </div>

              <div className="d-md-flex align-items-center justify-content-between">
                <div>
                  <h3 className="fw-bold text-white mb-1">{selectedPlan.plan_name}</h3>
                  <p className="text-white-50 fs-13 mb-0" style={{ maxWidth: '520px' }}>
                    {selectedPlan.description ||
                      'Enterprise-grade cloud school management platform with integrated operational modules.'}
                  </p>
                  {selectedPlan.projected_start_date &&
                    selectedPlan.projected_end_date &&
                    (isCurrentPlan || !selectedPlan.stacks_dates) && (
                      <div
                        className="mt-2 fs-12 d-inline-flex align-items-center px-3 py-1 rounded-2 text-white"
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.14)',
                          border: '1px solid rgba(255, 255, 255, 0.24)',
                        }}
                      >
                        <i className="ti ti-calendar-event me-2"></i>
                        <span>
                          {isCurrentPlan && selectedPlan.stacks_dates && subscription?.end_date ? (
                            <>
                              Early Renewal Validity: Extends{' '}
                              <strong>{formatDateDisplay(subscription.end_date)}</strong> →{' '}
                              <strong>{formatDateDisplay(selectedPlan.projected_end_date)}</strong>
                            </>
                          ) : (
                            <>
                              Projected Validity:{' '}
                              <strong>{formatDateDisplay(selectedPlan.projected_start_date)}</strong> →{' '}
                              <strong>{formatDateDisplay(selectedPlan.projected_end_date)}</strong>
                            </>
                          )}
                        </span>
                      </div>
                    )}
                </div>
                <div className="text-md-end mt-3 mt-md-0">
                  <div className="text-white-50 fs-11">Base Plan Net Price</div>
                  {Number(selectedPlan.original_price) > Number(selectedPlan.price) && (
                    <div className="d-inline-flex align-items-center gap-2 mt-1">
                      <span className="fs-14 text-white-50 text-decoration-line-through">
                        ₹{Number(selectedPlan.original_price).toLocaleString('en-IN')}
                      </span>
                      <span className="badge bg-success text-white rounded-pill px-2 py-1 fs-10 fw-bold">
                        {Math.round(
                          ((Number(selectedPlan.original_price) - Number(selectedPlan.price)) /
                            Number(selectedPlan.original_price)) *
                            100
                        )}
                        % OFF
                      </span>
                    </div>
                  )}
                  <div className="fs-28 fw-bold text-white">
                    ₹{basePrice.toLocaleString('en-IN')}
                    <span className="fs-13 fw-normal text-white-50">
                      {' '}
                      / {cycleMeta.shortLabel || cycleMeta.label}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Capacity & Quotas Summary */}
            <div className="card-body p-4 bg-white">
              <h6 className="fw-bold text-dark mb-3 d-flex align-items-center">
                <i className="ti ti-chart-bar me-2 text-primary fs-18"></i>
                Allocated Capacity &amp; Quotas
              </h6>
              <div className="row g-3">
                <div className="col-12 col-sm-4">
                  <div className="p-3 rounded-3 bg-light border">
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <span className="text-muted fs-11 fw-semibold text-uppercase">Students</span>
                      <i className="ti ti-school fs-16 text-primary"></i>
                    </div>
                    <div className="fs-15 fw-bold text-dark">
                      {selectedPlan.max_students > 0
                        ? `${Number(selectedPlan.max_students).toLocaleString('en-IN')} Students`
                        : 'Unlimited Students'}
                    </div>
                  </div>
                </div>

                <div className="col-12 col-sm-4">
                  <div className="p-3 rounded-3 bg-light border">
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <span className="text-muted fs-11 fw-semibold text-uppercase">Teachers &amp; Branches</span>
                      <i className="ti ti-users fs-16 text-success"></i>
                    </div>
                    <div className="fs-15 fw-bold text-dark">Unlimited</div>
                  </div>
                </div>

                <div className="col-12 col-sm-4">
                  <div className="p-3 rounded-3 bg-light border">
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <span className="text-muted fs-11 fw-semibold text-uppercase">Included Cloud Storage</span>
                      <i className="ti ti-cloud-check fs-16 text-info"></i>
                    </div>
                    <div className="fs-15 fw-bold text-dark">{includedStorageGb} GB Included</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Included Features */}
            {includedItems.length > 0 && (
              <div className="card-body p-4 bg-white border-top">
                <h6 className="fw-bold text-dark mb-3 d-flex align-items-center">
                  <i className="ti ti-circle-check me-2 text-success fs-18"></i>
                  Included Plan Features
                </h6>
                <div className="row g-2">
                  {includedItems.map((item) => (
                    <div className="col-12 col-sm-6" key={item.id}>
                      <div className="d-flex align-items-center p-2 rounded-2 bg-light">
                        <i className="ti ti-check text-success fs-16 me-2"></i>
                        <span className="fs-13 text-dark fw-semibold">{item.item_name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Cloud Storage Expansion (storage_master) */}
          <div className="card border-0 shadow-sm rounded-3 mb-4 overflow-hidden">
            <div
              className={`card-header bg-white p-3 p-md-4 transition-all d-flex align-items-center justify-content-between flex-wrap gap-2 ${
                collapsedSections.storage ? 'border-bottom-0' : 'border-bottom'
              }`}
              style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={() => toggleSection('storage')}
            >
              <div className="d-flex align-items-center gap-3">
                <div
                  className={`avatar avatar-md rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 ${
                    selectedStoragePlan ? 'bg-primary text-white' : 'bg-light text-primary'
                  }`}
                  style={{ width: '40px', height: '40px' }}
                >
                  <i className="ti ti-cloud-upload fs-20"></i>
                </div>
                <div>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <h5 className="fw-bold text-dark mb-0 fs-16">Cloud Storage Expansion</h5>
                    {selectedStoragePlan && (
                      <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1 fs-11 rounded-pill">
                        <i className="ti ti-check me-1"></i>
                        {selectedStoragePlan.plan_name} (+₹{storageTotal.toLocaleString('en-IN')})
                      </span>
                    )}
                  </div>
                  <p className="text-muted fs-12 mb-0 mt-1">
                    Add extra cloud capacity on top of your plan&apos;s {includedStorageGb} GB base allocation.
                  </p>
                </div>
              </div>

              <div className="d-flex align-items-center gap-2 ms-auto" onClick={(e) => e.stopPropagation()}>
                {selectedStoragePlan && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger py-1 px-3 fs-11 rounded-pill"
                    onClick={() => handleSelectStorage(selectedStorageId)}
                  >
                    <i className="ti ti-x me-1"></i> Clear
                  </button>
                )}
                <span className="badge bg-light text-primary border px-3 py-1 fs-12 fw-semibold">
                  {cycleMeta.label} Pricing
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-light border rounded-circle d-flex align-items-center justify-content-center p-0"
                  style={{ width: '32px', height: '32px' }}
                  onClick={() => toggleSection('storage')}
                >
                  <i className={`ti ${collapsedSections.storage ? 'ti-chevron-down' : 'ti-chevron-up'} fs-16 text-dark`}></i>
                </button>
              </div>
            </div>

            {!collapsedSections.storage && (
              <div className="card-body p-4 bg-white">
                {catalogLoading ? (
                  <div className="text-center py-3 text-muted">
                    <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                    Loading storage options...
                  </div>
                ) : (
                  <div className="row g-3">
                    {catalog.storage_plans?.length > 0 ? (
                      catalog.storage_plans.map((storage) => {
                        const isSelected = Number(selectedStorageId) === Number(storage.id);
                        const price = Number(storage?.cycle_prices?.[billingCycle] ?? 0);
                        return (
                          <div className="col-6 col-sm-4 col-xl-3" key={storage.id}>
                            <div
                              onClick={() => handleSelectStorage(storage.id)}
                              className={`p-3 rounded-3 border text-center transition-all h-100 d-flex flex-column justify-content-between position-relative ${
                                isSelected
                                  ? 'border-2 border-primary shadow-sm'
                                  : 'bg-white'
                              }`}
                              style={{
                                cursor: 'pointer',
                                minHeight: '140px',
                                backgroundColor: isSelected ? '#eef2ff' : undefined,
                              }}
                            >
                              {isSelected && (
                                <span
                                  className="badge bg-primary text-white position-absolute"
                                  style={{ top: '-8px', right: '8px', fontSize: '10px', borderRadius: '10px' }}
                                >
                                  <i className="ti ti-check"></i> Selected
                                </span>
                              )}
                              <div>
                                <div
                                  className={`avatar avatar-md rounded-circle mx-auto mb-2 d-flex align-items-center justify-content-center ${
                                    isSelected ? 'bg-primary text-white' : 'bg-light text-info'
                                  }`}
                                  style={{ width: '38px', height: '38px' }}
                                >
                                  <i className="ti ti-cloud fs-20"></i>
                                </div>
                                <div className="fw-bold text-dark fs-14 mb-1">
                                  +{storage.storage_capacity} {storage.unit_code || 'GB'}
                                </div>
                                <div className="text-muted fs-11 mb-2 text-truncate" title={storage.plan_name}>
                                  {storage.plan_name}
                                </div>
                              </div>
                              <div>
                                <div className="fs-13 fw-bold text-dark">
                                  +₹{price.toLocaleString('en-IN')}
                                </div>
                                <div className="text-muted fs-10">/ {cycleMeta.shortLabel}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="col-12 py-3 text-center text-muted fs-13">
                        No cloud storage expansion options configured.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card 3: Prepaid SMS & Push Notification Credits (notification_pricing_master) */}
          <div className="card border-0 shadow-sm rounded-3 mb-4 overflow-hidden">
            <div
              className={`card-header bg-white p-3 p-md-4 transition-all d-flex align-items-center justify-content-between flex-wrap gap-2 ${
                collapsedSections.notifications ? 'border-bottom-0' : 'border-bottom'
              }`}
              style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={() => toggleSection('notifications')}
            >
              <div className="d-flex align-items-center gap-3">
                <div
                  className={`avatar avatar-md rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 ${
                    selectedNotificationsList.length > 0 ? 'bg-primary text-white' : 'bg-light text-primary'
                  }`}
                  style={{ width: '40px', height: '40px' }}
                >
                  <i className="ti ti-bell-ringing fs-20"></i>
                </div>
                <div>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <h5 className="fw-bold text-dark mb-0 fs-16">Prepaid SMS &amp; Push Notification Credits</h5>
                    {selectedNotificationsList.length > 0 && (
                      <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 fs-11 rounded-pill">
                        <i className="ti ti-check me-1"></i>
                        +₹{notificationsTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                  <p className="text-muted fs-12 mb-0 mt-1">
                    Add metered SMS and Push Notification credits to your institutional wallet.
                  </p>
                </div>
              </div>

              <div className="d-flex align-items-center gap-2 ms-auto" onClick={(e) => e.stopPropagation()}>
                {selectedNotificationsList.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger py-1 px-3 fs-11 rounded-pill"
                    onClick={() => setSelectedNotifications({})}
                  >
                    <i className="ti ti-x me-1"></i> Clear
                  </button>
                )}
                <span className="badge bg-light text-primary border px-3 py-1 fs-12 fw-semibold">
                  Prepaid Wallet
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-light border rounded-circle d-flex align-items-center justify-content-center p-0"
                  style={{ width: '32px', height: '32px' }}
                  onClick={() => toggleSection('notifications')}
                >
                  <i className={`ti ${collapsedSections.notifications ? 'ti-chevron-down' : 'ti-chevron-up'} fs-16 text-dark`}></i>
                </button>
              </div>
            </div>

            {!collapsedSections.notifications && (
              <div className="card-body p-4 bg-white">
                {catalogLoading ? (
                  <div className="text-center py-4 text-muted">
                    <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                    Loading notification credit rates...
                  </div>
                ) : catalog.notification_records?.length > 0 ? (
                  <div className="row g-3">
                    {catalog.notification_records.map((record) => {
                      const isSms = String(record.type || record.channel).toLowerCase() === 'sms';
                      const unitRate = parseFloat(record.cost || record.unit_price || 0);
                      const minQty = Math.max(1, parseInt(record.min_qty, 10) || 1);
                      const cfg = selectedNotifications[record.id] || { selected: false, quantity: minQty };
                      const isSelected = Boolean(cfg.selected);
                      const currentQty = parseInt(cfg.quantity, 10) || 0;
                      const recordTotalPrice = Math.round(unitRate * currentQty * 100) / 100;

                      return (
                        <div className="col-12 col-lg-6" key={record.id}>
                          <div
                            className={`card border rounded-3 h-100 transition-all ${
                              isSelected ? 'border-primary border-2 shadow-sm' : ''
                            }`}
                          >
                            <div className="card-body p-3 d-flex flex-column justify-content-between">
                              <div>
                                <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom">
                                  <div className="d-flex align-items-center gap-2">
                                    <div
                                      className={`avatar avatar-md rounded-3 d-flex align-items-center justify-content-center flex-shrink-0 ${
                                        isSms ? 'bg-success-subtle text-success' : 'bg-info-subtle text-info'
                                      }`}
                                      style={{ width: '40px', height: '40px' }}
                                    >
                                      <i className={`ti ${isSms ? 'ti-message-dots' : 'ti-bell'} fs-20`}></i>
                                    </div>
                                    <div>
                                      <h6 className="fw-bold text-dark mb-0 fs-14">
                                        {record.pack_name || record.name || (isSms ? 'SMS Credits' : 'Push Credits')}
                                      </h6>
                                      <span className="text-muted fs-11">
                                        Min. {minQty.toLocaleString('en-IN')} credits
                                      </span>
                                    </div>
                                  </div>

                                  <div className="text-end">
                                    <div className="fw-bold text-dark fs-17">₹{unitRate.toFixed(2)}</div>
                                    <div className="text-muted fs-11">/ credit</div>
                                  </div>
                                </div>

                                <p className="text-muted fs-12 mb-3">
                                  {record.message ||
                                    `Prepaid ${isSms ? 'SMS' : 'Push Notification'} credits added to your school wallet.`}
                                </p>
                              </div>

                              <div className="border-top pt-3 mt-auto">
                                <div className="d-flex align-items-center justify-content-between">
                                  <div className="form-check form-switch m-0 d-flex align-items-center gap-2">
                                    <input
                                      className="form-check-input"
                                      style={{ cursor: 'pointer' }}
                                      type="checkbox"
                                      role="switch"
                                      id={`notif_toggle_${record.id}`}
                                      checked={isSelected}
                                      onChange={() => handleToggleNotification(record)}
                                    />
                                    <label
                                      className="form-check-label fw-semibold text-dark fs-12"
                                      style={{ cursor: 'pointer' }}
                                      htmlFor={`notif_toggle_${record.id}`}
                                    >
                                      {isSelected ? 'Included in Order' : 'Add Credits'}
                                    </label>
                                  </div>

                                  {isSelected && (
                                    <div className="fs-12 fw-bold text-primary">
                                      +₹{recordTotalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </div>
                                  )}
                                </div>

                                {isSelected && (
                                  <div className="mt-2 bg-light p-2 rounded-2 border">
                                    <div className="d-flex align-items-center justify-content-between gap-2">
                                      <span className="text-muted fs-11 fw-medium">Credits Qty:</span>
                                      <div className="d-flex align-items-center gap-1">
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-light border text-dark px-2 py-1 fw-bold"
                                          onClick={() => handleDecreaseNotificationQty(record, minQty)}
                                        >
                                          -{minQty}
                                        </button>
                                        <input
                                          type="number"
                                          min={minQty}
                                          step={minQty}
                                          className="form-control form-control-sm text-center fw-bold fs-12 px-1"
                                          style={{ width: '88px', height: '30px' }}
                                          value={currentQty}
                                          onChange={(e) => handleSetNotificationQty(record, e.target.value)}
                                        />
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-outline-primary px-2 py-1 fw-bold"
                                          onClick={() => handleIncreaseNotificationQty(record, minQty)}
                                        >
                                          +{minQty}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="col-12 py-3 text-center text-muted fs-13">
                    No notification credit packs configured.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card 4: Attendance Machines (attendance_machine_master) */}
          <div className="card border-0 shadow-sm rounded-3 mb-4 overflow-hidden">
            <div
              className={`card-header bg-white p-3 p-md-4 transition-all d-flex align-items-center justify-content-between flex-wrap gap-2 ${
                collapsedSections.machines ? 'border-bottom-0' : 'border-bottom'
              }`}
              style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={() => toggleSection('machines')}
            >
              <div className="d-flex align-items-center gap-3">
                <div
                  className={`avatar avatar-md rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 ${
                    selectedMachinesList.length > 0 ? 'bg-primary text-white' : 'bg-light text-primary'
                  }`}
                  style={{ width: '40px', height: '40px' }}
                >
                  <i className="ti ti-device-watch fs-20"></i>
                </div>
                <div>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <h5 className="fw-bold text-dark mb-0 fs-16">Biometric Attendance Terminals</h5>
                    {selectedMachinesList.length > 0 && (
                      <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1 fs-11 rounded-pill">
                        <i className="ti ti-check me-1"></i>
                        {selectedMachinesList.length} selected (+₹{machinesTotal.toLocaleString('en-IN')})
                      </span>
                    )}
                  </div>
                  <p className="text-muted fs-12 mb-0 mt-1">
                    One-time physical hardware purchase dispatched to your school campus.
                  </p>
                </div>
              </div>

              <div className="d-flex align-items-center gap-2 ms-auto" onClick={(e) => e.stopPropagation()}>
                {selectedMachinesList.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger py-1 px-3 fs-11 rounded-pill"
                    onClick={handleClearAllMachines}
                  >
                    <i className="ti ti-x me-1"></i> Clear
                  </button>
                )}
                <span className="badge bg-light text-muted border px-3 py-1 fs-12">
                  {catalog.attendance_machines.length} options
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-light border rounded-circle d-flex align-items-center justify-content-center p-0"
                  style={{ width: '32px', height: '32px' }}
                  onClick={() => toggleSection('machines')}
                >
                  <i className={`ti ${collapsedSections.machines ? 'ti-chevron-down' : 'ti-chevron-up'} fs-16 text-dark`}></i>
                </button>
              </div>
            </div>

            {!collapsedSections.machines && (
              <div className="card-body p-4 bg-white">
                <div className="row g-3">
                  {catalog.attendance_machines?.length > 0 ? (
                    catalog.attendance_machines.map((machine) => {
                      const currentQty = selectedMachines[machine.id] || 0;
                      const isAdded = currentQty > 0;
                      const unitPrice = parseFloat(machine.unit_price || 0);

                      return (
                        <div className="col-12 col-md-6 col-xl-4" key={machine.id}>
                          <div
                            className={`card h-100 rounded-3 border transition-all ${
                              isAdded ? 'border-primary border-2 shadow-sm' : ''
                            }`}
                          >
                            <div
                              className="w-100 bg-light border-bottom d-flex align-items-center justify-content-center overflow-hidden position-relative p-2"
                              style={{ height: '155px' }}
                            >
                              <img
                                src={resolveImageUrl(machine.machine_image, NO_IMAGE_PLACEHOLDER)}
                                alt={machine.machine_name}
                                className="img-fluid"
                                style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = NO_IMAGE_PLACEHOLDER;
                                }}
                              />
                              {isAdded && (
                                <span
                                  className="badge bg-primary text-white position-absolute shadow-sm"
                                  style={{ top: '10px', right: '10px', fontSize: '11px', borderRadius: '12px' }}
                                >
                                  Selected ({currentQty})
                                </span>
                              )}
                            </div>

                            <div className="card-body p-3 d-flex flex-column justify-content-between">
                              <div>
                                <h6 className="fw-bold text-dark mb-1 fs-14">{machine.machine_name}</h6>
                                <div className="text-muted fs-11 mb-2">
                                  {machine.brand} • {machine.model_number}
                                </div>
                                <div className="fs-15 fw-bold text-primary mb-2">
                                  ₹{unitPrice.toLocaleString('en-IN')}{' '}
                                  <span className="fs-11 text-muted fw-normal">/ unit</span>
                                </div>
                              </div>

                              <div className="d-flex align-items-center justify-content-between pt-2 border-top gap-2">
                                <div className="d-flex align-items-center gap-1">
                                  <button
                                    type="button"
                                    className={`btn btn-sm ${isAdded ? 'btn-success' : 'btn-primary'} px-3 py-1 fw-semibold`}
                                    onClick={() => !isAdded && handleAddMachine(machine.id)}
                                  >
                                    {isAdded ? 'Added' : '+ Add'}
                                  </button>
                                  {isAdded && (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-danger px-2 py-1"
                                      onClick={() => handleRemoveMachine(machine.id)}
                                    >
                                      <i className="ti ti-trash fs-12"></i>
                                    </button>
                                  )}
                                </div>

                                <div className="d-flex align-items-center gap-1">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-light border text-dark px-2 py-1 fw-bold"
                                    onClick={() => isAdded && handleDecreaseMachineQty(machine.id)}
                                    disabled={!isAdded}
                                  >
                                    -
                                  </button>
                                  <span className="badge bg-light text-dark border px-2 py-1 fs-12">
                                    {currentQty}
                                  </span>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-primary px-2 py-1 fw-bold"
                                    onClick={() => isAdded && handleIncreaseMachineQty(machine.id)}
                                    disabled={!isAdded}
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-12 py-3 text-center text-muted fs-13">
                      No attendance machine options found.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Card 5: Smart RFID Cards & Badges (rfid_card_master) */}
          <div className="card border-0 shadow-sm rounded-3 mb-4 overflow-hidden">
            <div
              className={`card-header bg-white p-3 p-md-4 transition-all d-flex align-items-center justify-content-between flex-wrap gap-2 ${
                collapsedSections.cards ? 'border-bottom-0' : 'border-bottom'
              }`}
              style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={() => toggleSection('cards')}
            >
              <div className="d-flex align-items-center gap-3">
                <div
                  className={`avatar avatar-md rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 ${
                    selectedCardsList.length > 0 ? 'bg-primary text-white' : 'bg-light text-primary'
                  }`}
                  style={{ width: '40px', height: '40px' }}
                >
                  <i className="ti ti-id fs-20"></i>
                </div>
                <div>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <h5 className="fw-bold text-dark mb-0 fs-16">Smart RFID Cards &amp; Badges</h5>
                    {selectedCardsList.length > 0 && (
                      <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1 fs-11 rounded-pill">
                        <i className="ti ti-check me-1"></i>
                        {selectedCardsList.reduce((sum, c) => sum + c.quantity, 0)} pcs (+₹
                        {cardsTotal.toLocaleString('en-IN')})
                      </span>
                    )}
                  </div>
                  <p className="text-muted fs-12 mb-0 mt-1">
                    Select student &amp; staff RFID smart cards (enforces catalog minimum order quantity).
                  </p>
                </div>
              </div>

              <div className="d-flex align-items-center gap-2 ms-auto" onClick={(e) => e.stopPropagation()}>
                {selectedCardsList.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger py-1 px-3 fs-11 rounded-pill"
                    onClick={handleClearAllCards}
                  >
                    <i className="ti ti-x me-1"></i> Clear
                  </button>
                )}
                <span className="badge bg-light text-muted border px-3 py-1 fs-12">
                  {catalog.rfid_cards.length} options
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-light border rounded-circle d-flex align-items-center justify-content-center p-0"
                  style={{ width: '32px', height: '32px' }}
                  onClick={() => toggleSection('cards')}
                >
                  <i className={`ti ${collapsedSections.cards ? 'ti-chevron-down' : 'ti-chevron-up'} fs-16 text-dark`}></i>
                </button>
              </div>
            </div>

            {!collapsedSections.cards && (
              <div className="card-body p-4 bg-white">
                <div className="row g-3">
                  {catalog.rfid_cards?.length > 0 ? (
                    catalog.rfid_cards.map((card) => {
                      const currentQty = selectedCards[card.id] || 0;
                      const isAdded = currentQty > 0;
                      const unitPrice = parseFloat(card.unit_price || 0);
                      const minQty = Math.max(1, parseInt(card.min_order_qty, 10) || 1);

                      return (
                        <div className="col-12 col-md-6 col-xl-4" key={card.id}>
                          <div
                            className={`card h-100 rounded-3 border transition-all ${
                              isAdded ? 'border-primary border-2 shadow-sm' : ''
                            }`}
                          >
                            <div
                              className="w-100 bg-light border-bottom d-flex align-items-center justify-content-center overflow-hidden position-relative p-2"
                              style={{ height: '155px' }}
                            >
                              <img
                                src={resolveImageUrl(card.card_image || card.rfid_image, NO_IMAGE_PLACEHOLDER)}
                                alt={card.card_name}
                                className="img-fluid"
                                style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = NO_IMAGE_PLACEHOLDER;
                                }}
                              />
                              <span
                                className="badge bg-light text-muted border fs-10 px-2 py-1 rounded-pill position-absolute"
                                style={{ top: '10px', left: '10px' }}
                              >
                                Min. {minQty} pcs
                              </span>
                            </div>

                            <div className="card-body p-3 d-flex flex-column justify-content-between">
                              <div>
                                <h6 className="fw-bold text-dark mb-1 fs-14">{card.card_name}</h6>
                                <div className="text-muted fs-11 mb-2">
                                  {card.frequency || '13.56 MHz'} • {card.read_range || 'Up to 5 cm'}
                                </div>
                                <div className="fs-15 fw-bold text-primary mb-2">
                                  ₹{unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}{' '}
                                  <span className="fs-11 text-muted fw-normal">/ card</span>
                                </div>
                              </div>

                              <div className="d-flex align-items-center justify-content-between pt-2 border-top gap-2">
                                <div className="d-flex align-items-center gap-1">
                                  <button
                                    type="button"
                                    className={`btn btn-sm ${isAdded ? 'btn-success' : 'btn-primary'} px-3 py-1 fw-semibold`}
                                    onClick={() => !isAdded && handleAddCard(card)}
                                  >
                                    {isAdded ? 'Added' : `+ Add (${minQty})`}
                                  </button>
                                  {isAdded && (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-danger px-2 py-1"
                                      onClick={() => handleRemoveCard(card.id)}
                                    >
                                      <i className="ti ti-trash fs-12"></i>
                                    </button>
                                  )}
                                </div>

                                {isAdded && (
                                  <div className="d-flex align-items-center gap-1">
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-light border text-dark px-2 py-1 fw-bold"
                                      onClick={() => handleDecreaseCardQty(card)}
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      min={minQty}
                                      className="form-control form-control-sm text-center fw-bold px-1"
                                      style={{ width: '64px', height: '30px' }}
                                      value={currentQty}
                                      onChange={(e) => handleSetCardQty(card, e.target.value)}
                                    />
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-primary px-2 py-1 fw-bold"
                                      onClick={() => handleIncreaseCardQty(card)}
                                    >
                                      +
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-12 py-3 text-center text-muted fs-13">
                      No RFID card options found.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Hardware Shipping Address (Required when Biometric Machines or RFID Cards are selected) */}
          {hasPhysicalHardware && (
            <div className="card border-primary border-2 shadow-sm rounded-3 mb-4">
              <div
                className="card-header border-bottom p-3 p-md-4"
                style={{ backgroundColor: '#eef2ff' }}
              >
                <h5 className="fw-bold text-dark mb-1 fs-15">
                  <i className="ti ti-truck-delivery me-2 text-primary fs-19"></i>
                  Campus Delivery / Shipping Address <span className="text-danger">*</span>
                </h5>
                <p className="text-muted fs-12 mb-0">
                  Required for courier dispatch of your selected Attendance Machines and/or Smart RFID Cards.
                </p>
              </div>
              <div className="card-body p-3 p-md-4 bg-white">
                <textarea
                  rows={2}
                  className="form-control fs-13"
                  placeholder="Enter full school campus street address, landmark, city, state, and PIN code..."
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                ></textarea>
              </div>
            </div>
          )}

          {/* Card 6: School Billing Info */}
          <div className="card border-0 shadow-sm rounded-3 mb-4">
            <div className="card-header bg-white border-bottom p-4">
              <h5 className="fw-bold text-dark mb-1 d-flex align-items-center">
                <i className="ti ti-building me-2 text-primary fs-20"></i>
                School &amp; Billing Organization
              </h5>
              <p className="text-muted fs-13 mb-0">
                Official payment receipts and invoices will be generated under these institutional details.
              </p>
            </div>
            <div className="card-body p-4 bg-white">
              <div className="row g-3 fs-13">
                <div className="col-12 col-sm-6">
                  <label className="text-muted fs-12 mb-1 d-block">School / Institution</label>
                  <div className="fw-bold text-dark">
                    {user?.schoolName || user?.school_name || '—'}
                  </div>
                </div>
                <div className="col-12 col-sm-6">
                  <label className="text-muted fs-12 mb-1 d-block">Authorized Admin</label>
                  <div className="fw-bold text-dark">{user?.name || '—'}</div>
                </div>
                <div className="col-12 col-sm-6">
                  <label className="text-muted fs-12 mb-1 d-block">Registered Email</label>
                  <div className="fw-bold text-dark">{user?.email || '—'}</div>
                </div>
                <div className="col-12 col-sm-6">
                  <label className="text-muted fs-12 mb-1 d-block">Contact Phone</label>
                  <div className="fw-bold text-dark">{user?.phone || user?.mobile || '—'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 7: Payment Method Selection */}
          <div className="card border-0 shadow-sm rounded-3 mb-4">
            <div className="card-header bg-white border-bottom p-4">
              <h5 className="fw-bold text-dark mb-1 d-flex align-items-center">
                <i className="ti ti-credit-card me-2 text-primary fs-20"></i>
                Select Payment Method
              </h5>
              <p className="text-muted fs-13 mb-0">
                Choose between instant online Razorpay activation or direct institutional bank transfer.
              </p>
            </div>

            <div className="card-body p-4 bg-white">
              <div className="row g-3 mb-3">
                <div className="col-12 col-md-6">
                  <label
                    className={`d-flex align-items-center p-3 border rounded-3 w-100 mb-0 transition-all ${
                      paymentGateway === 'razorpay'
                        ? 'border-primary shadow-sm'
                        : 'bg-white'
                    }`}
                    style={{
                      cursor: 'pointer',
                      borderWidth: paymentGateway === 'razorpay' ? '2px' : '1px',
                      backgroundColor: paymentGateway === 'razorpay' ? '#eef2ff' : undefined,
                    }}
                  >
                    <input
                      type="radio"
                      name="payment_gateway"
                      value="razorpay"
                      checked={paymentGateway === 'razorpay'}
                      onChange={(e) => setPaymentGateway(e.target.value)}
                      className="form-check-input me-3"
                    />
                    <div>
                      <div className="fw-bold text-dark fs-13 d-flex align-items-center flex-wrap gap-1">
                        <span>Instant Online Checkout</span>
                        <span className="badge bg-success-subtle text-success border border-success fs-10 ms-1 px-2 py-1 rounded-pill">
                          Instant Activation
                        </span>
                      </div>
                      <div className="text-muted fs-11">
                        UPI (GPay, PhonePe), Cards &amp; NetBanking via Razorpay
                      </div>
                    </div>
                  </label>
                </div>

                <div className="col-12 col-md-6">
                  <label
                    className={`d-flex align-items-center p-3 border rounded-3 w-100 mb-0 transition-all ${
                      paymentGateway === 'bank_transfer'
                        ? 'border-primary shadow-sm'
                        : 'bg-white'
                    }`}
                    style={{
                      cursor: 'pointer',
                      borderWidth: paymentGateway === 'bank_transfer' ? '2px' : '1px',
                      backgroundColor: paymentGateway === 'bank_transfer' ? '#eef2ff' : undefined,
                    }}
                  >
                    <input
                      type="radio"
                      name="payment_gateway"
                      value="bank_transfer"
                      checked={paymentGateway === 'bank_transfer'}
                      onChange={(e) => setPaymentGateway(e.target.value)}
                      className="form-check-input me-3"
                    />
                    <div>
                      <div className="fw-bold text-dark fs-13">Direct Bank Transfer (NEFT / RTGS)</div>
                      <div className="text-muted fs-11">Submit UTR reference for Super Admin verification</div>
                    </div>
                  </label>
                </div>
              </div>

              {paymentGateway === 'bank_transfer' && (
                <div className="p-3 bg-light rounded-3 border">
                  {eligibleBankAccounts?.length > 0 && activeBankAccount ? (
                    <>
                      {eligibleBankAccounts.length > 1 && (
                        <div className="mb-3">
                          <label className="form-label fs-12 fw-semibold text-dark mb-1">
                            Select Official Bank Account:
                          </label>
                          <div className="d-flex flex-wrap gap-2">
                            {eligibleBankAccounts.map((acc) => {
                              const isAccSelected = Number(acc.id) === Number(activeBankAccount.id);
                              return (
                                <button
                                  key={acc.id}
                                  type="button"
                                  className={`btn btn-sm text-start py-2 px-3 rounded-2 border ${
                                    isAccSelected
                                      ? 'btn-primary text-white border-primary shadow-sm'
                                      : 'btn-light bg-white text-dark'
                                  }`}
                                  onClick={() => setSelectedBankAccountId(acc.id)}
                                >
                                  <span className="fw-bold d-block fs-12">
                                    {acc.account_title || acc.bank_name}
                                  </span>
                                  <span className="fs-10 opacity-75">
                                    {acc.bank_name} ••••{String(acc.account_number).slice(-4)}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="fw-semibold text-dark fs-13 mb-2 d-flex align-items-center justify-content-between">
                        <span>
                          <i className="ti ti-building-bank me-2 text-primary fs-16"></i>
                          Official Bank Details: {activeBankAccount.account_title || activeBankAccount.bank_name}
                        </span>
                      </div>

                      {activeBankAccount.qr_code_image && (
                        <div className="mb-3 p-2 bg-white rounded-2 border d-flex align-items-center gap-3">
                          <img
                            src={resolveImageUrl(activeBankAccount.qr_code_image, NO_IMAGE_PLACEHOLDER)}
                            alt="Payment QR Code"
                            className="rounded-2 border"
                            style={{ width: '84px', height: '84px', objectFit: 'contain' }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <div>
                            <div className="fw-semibold text-dark fs-12">Scan Official UPI QR Code</div>
                            {activeBankAccount.upi_id && (
                              <div className="font-monospace text-primary fs-11 mt-1">
                                UPI ID: {activeBankAccount.upi_id}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="row g-2 fs-12 text-muted mb-3">
                        <div className="col-12 col-sm-6">
                          <div>
                            <strong className="text-dark">Beneficiary:</strong> {activeBankAccount.beneficiary_name}
                          </div>
                          <div>
                            <strong className="text-dark">Account Number:</strong>{' '}
                            <span className="font-monospace fw-bold text-dark">{activeBankAccount.account_number}</span>
                          </div>
                        </div>
                        <div className="col-12 col-sm-6">
                          <div>
                            <strong className="text-dark">Bank &amp; Branch:</strong> {activeBankAccount.bank_name}
                            {activeBankAccount.branch_name ? `, ${activeBankAccount.branch_name}` : ''}
                          </div>
                          <div>
                            <strong className="text-dark">IFSC Code:</strong>{' '}
                            <span className="font-monospace fw-bold text-dark">{activeBankAccount.ifsc_code}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="form-label fs-12 fw-semibold text-dark mb-1">
                          Bank Transfer Reference / UTR Number <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="e.g. UTR202610299876 or IMPS Reference ID"
                          value={utrNumber}
                          onChange={(e) => setUtrNumber(e.target.value)}
                        />
                        <span className="text-muted fs-11 mt-1 d-block">
                          Enter the UTR from your payment receipt for ₹{grandTotal.toLocaleString('en-IN')}.
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="p-3 bg-white rounded-2 border border-warning-subtle text-center">
                      <i className="ti ti-alert-triangle fs-24 text-warning mb-2 d-block"></i>
                      <h6 className="fw-bold text-dark mb-1 fs-13">No Bank Transfer Account Configured</h6>
                      <p className="text-muted fs-12 mb-0">
                        Please choose <strong>Instant Online Checkout</strong> to activate immediately.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Order Summary (Zero GST) */}
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm rounded-3 sticky-subscription-summary">
            <div className="card-header bg-white border-bottom p-3 p-md-4 flex-shrink-0">
              <h5 className="fw-bold text-dark mb-0 d-flex align-items-center">
                <i className="ti ti-receipt-2 me-2 text-primary fs-20"></i>
                Final Order Summary
              </h5>
            </div>

            <div className="card-body p-3 p-md-4 bg-white overflow-auto flex-grow-1">
              {/* 1. Base Subscription Plan */}
              <div className="d-flex align-items-center justify-content-between mb-2 fs-13">
                <div className="text-dark">
                  <strong>{selectedPlan.plan_name}</strong>
                  <div className="text-muted fs-11">
                    Base Plan ({cycleMeta.label}) • {includedStorageGb} GB Cloud
                  </div>
                </div>
                <div className="fw-bold text-dark">₹{basePrice.toLocaleString('en-IN')}</div>
              </div>

              {/* 2. Storage Expansion */}
              {selectedStoragePlan && (
                <div className="border-top pt-2 mt-2">
                  <div className="text-muted fs-11 fw-bold text-uppercase mb-1">Cloud Storage Expansion:</div>
                  <div className="d-flex align-items-center justify-content-between fs-12">
                    <span className="text-muted">
                      <i className="ti ti-cloud text-info me-1"></i>
                      {selectedStoragePlan.plan_name} (+{selectedStoragePlan.storage_capacity}{' '}
                      {selectedStoragePlan.unit_code || 'GB'})
                    </span>
                    <span className="fw-semibold text-dark">+₹{storageTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}

              {/* 3. Notification Credits */}
              {selectedNotificationsList.length > 0 && (
                <div className="border-top pt-2 mt-2">
                  <div className="text-muted fs-11 fw-bold text-uppercase mb-1">Notification Credits:</div>
                  {selectedNotificationsList.map((item) => (
                    <div className="d-flex align-items-center justify-content-between mb-1 fs-12" key={item.id}>
                      <span className="text-muted">
                        {item.pack_name || item.name} ({item.quantity.toLocaleString('en-IN')})
                      </span>
                      <span className="fw-semibold text-dark">
                        +₹{item.totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* 4. Attendance Machines */}
              {selectedMachinesList.length > 0 && (
                <div className="border-top pt-2 mt-2">
                  <div className="text-muted fs-11 fw-bold text-uppercase mb-1">Attendance Machines:</div>
                  {selectedMachinesList.map((m) => (
                    <div className="d-flex align-items-center justify-content-between mb-1 fs-12" key={m.id}>
                      <span className="text-muted text-truncate me-2">
                        {m.machine_name} <strong className="text-dark">×{m.quantity}</strong>
                      </span>
                      <span className="fw-semibold text-dark">+₹{m.totalPrice.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* 5. RFID Cards */}
              {selectedCardsList.length > 0 && (
                <div className="border-top pt-2 mt-2">
                  <div className="text-muted fs-11 fw-bold text-uppercase mb-1">RFID Cards &amp; Badges:</div>
                  {selectedCardsList.map((c) => (
                    <div className="d-flex align-items-center justify-content-between mb-1 fs-12" key={c.id}>
                      <span className="text-muted text-truncate me-2">
                        {c.card_name} <strong className="text-dark">×{c.quantity}</strong>
                      </span>
                      <span className="fw-semibold text-dark">+₹{c.totalPrice.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* 6. Promo / Coupon Code */}
              <div className="border-top pt-3 mt-3">
                <label className="form-label text-dark fw-bold fs-12 mb-2 d-flex align-items-center">
                  <i className="ti ti-ticket me-2 text-primary fs-14"></i> Promo / Coupon Code
                </label>

                {!appliedCoupon ? (
                  <div>
                    <form onSubmit={handleApplyCoupon} className="input-group input-group-sm">
                      <input
                        type="text"
                        className={`form-control text-uppercase fw-semibold ${couponError ? 'is-invalid' : ''}`}
                        placeholder="e.g. WELCOME50"
                        value={couponCodeInput}
                        onChange={(e) => {
                          setCouponCodeInput(e.target.value.toUpperCase());
                          if (couponError) setCouponError(null);
                        }}
                        disabled={isValidatingCoupon}
                      />
                      <button
                        type="submit"
                        className="btn btn-primary fw-semibold px-3"
                        disabled={isValidatingCoupon || !couponCodeInput.trim()}
                      >
                        {isValidatingCoupon ? 'Applying...' : 'Apply'}
                      </button>
                    </form>
                    {couponError && (
                      <div className="text-danger fs-11 mt-1">{couponError}</div>
                    )}
                  </div>
                ) : (
                  <div className="bg-success-subtle border border-success-subtle rounded-2 p-2 d-flex align-items-center justify-content-between">
                    <div className="overflow-hidden">
                      <strong className="text-success fs-12 d-block text-truncate">
                        {appliedCoupon.code} Applied
                      </strong>
                      <span className="text-muted fs-11">
                        Saved ₹{discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        {appliedCoupon.applicable_scope === 'plan_only' ? ' (Software Plan)' : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-link text-danger text-decoration-none p-0 ms-2 fw-semibold fs-11"
                      onClick={handleRemoveCoupon}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Net Subtotal & Discount (Zero GST — no GST row) */}
              <div className="border-top pt-3 mt-3">
                <div className="d-flex align-items-center justify-content-between mb-1 fs-13 text-muted">
                  <span>Subtotal</span>
                  <span className="fw-semibold text-dark">
                    ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {appliedCoupon && discountAmount > 0 && (
                  <div className="d-flex align-items-center justify-content-between mb-1 fs-13 text-success">
                    <span>Promo Discount ({appliedCoupon.code})</span>
                    <span className="fw-bold">
                      -₹{discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer CTA */}
            <div className="card-footer bg-white border-top p-3 p-md-4 flex-shrink-0">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div>
                  <span className="fs-11 text-muted d-block text-uppercase fw-semibold">Total Net Payable</span>
                  <strong className="fs-22 fw-bold text-dark">
                    ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </strong>
                </div>
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1 fs-11 rounded-pill">
                  {cycleMeta.label}
                </span>
              </div>
              <div className="text-muted fs-11 mb-3">
                {grandTotal <= 0
                  ? '100% coupon applied — activates immediately with zero payment.'
                  : paymentGateway === 'razorpay'
                  ? 'Instant activation upon verified online payment.'
                  : 'Offline bank transfers activate upon Super Admin UTR verification.'}
              </div>

              <button
                type="button"
                className="btn btn-primary w-100 py-2 py-md-3 px-3 fw-bold fs-14 d-inline-flex align-items-center justify-content-center shadow-sm"
                onClick={handleProceedPayment}
                disabled={
                  isProcessing ||
                  (paymentGateway === 'bank_transfer' &&
                    grandTotal > 0 &&
                    (!eligibleBankAccounts || eligibleBankAccounts.length === 0))
                }
              >
                {isProcessing ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Processing Order...
                  </>
                ) : grandTotal <= 0 ? (
                  <>
                    <i className="ti ti-bolt me-2 fs-16"></i>
                    <span>Activate Free Now (₹0)</span>
                  </>
                ) : paymentGateway === 'razorpay' ? (
                  <>
                    <i className="ti ti-lock me-2 fs-16"></i>
                    <span>Pay ₹{grandTotal.toLocaleString('en-IN')} &amp; Activate Now</span>
                  </>
                ) : !eligibleBankAccounts?.length ? (
                  <>
                    <i className="ti ti-ban me-2 fs-16"></i>
                    <span>Bank Transfer Unavailable</span>
                  </>
                ) : (
                  <>
                    <i className="ti ti-send me-2 fs-16"></i>
                    <span>Submit Bank Transfer (UTR)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionConfigure;
