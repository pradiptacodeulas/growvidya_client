import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import saasApi from '../../api/saas.api';
import logoDark from '../../assets/logo_dark.png';
import { resolveImageUrl } from '../../utils/url.util';
import { loadRazorpayScript } from '../../utils/loadRazorpay';

const NO_IMAGE_PLACEHOLDER = '/assets_admin/no_iamge.webp';

const SubscriptionConfigurePublic = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [catalog, setCatalog] = useState({
    storage_plans: [],
    attendance_machines: [],
    rfid_cards: [],
    notification_records: [],
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const searchParams = new URLSearchParams(location.search);
  const planIdParam = searchParams.get('planId');
  const billingParam = searchParams.get('billing');

  const [billingCycle, setBillingCycle] = useState(
    location.state?.billingCycle || billingParam || 'annual'
  );
  const [selectedPlan, setSelectedPlan] = useState(location.state?.plan || null);

  const storedRegData = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem('pending_registration_data'));
    } catch {
      return null;
    }
  }, []);

  const pendingSchool = location.state?.school || storedRegData?.school || null;
  const pendingCampus = location.state?.campus || storedRegData?.campus || null;
  const pendingAcademicYear = location.state?.academicYear || storedRegData?.academicYear || null;
  const pendingAdmin = location.state?.admin || storedRegData?.admin || null;
  const hasRegistrationData = Boolean(pendingSchool?.school_name && pendingAdmin?.email);

  // Add-on selections
  const [selectedStorageId, setSelectedStorageId] = useState(null);
  const [selectedMachines, setSelectedMachines] = useState({});
  const [selectedCards, setSelectedCards] = useState({});
  const [selectedNotifications, setSelectedNotifications] = useState({});
  const [shippingAddress, setShippingAddress] = useState(
    () => pendingCampus?.address || pendingSchool?.address || ''
  );

  const [collapsedSections, setCollapsedSections] = useState({
    storage: false,
    notifications: false,
    machines: true,
    cards: true,
  });

  const toggleSection = (key) =>
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  // Coupon state
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const [plansRes, catalogRes] = await Promise.all([
          saasApi.getPlans(),
          saasApi.getConfigCatalog().catch(() => ({ data: {} })),
        ]);

        const fetchedPlans = plansRes?.data || [];
        const fetchedCatalog = catalogRes?.data || {};

        setCatalog({
          storage_plans: fetchedCatalog.storage_plans || [],
          attendance_machines: fetchedCatalog.attendance_machines || [],
          rfid_cards: fetchedCatalog.rfid_cards || [],
          notification_records: fetchedCatalog.notification_records || [],
        });

        let matched = null;
        if (planIdParam) {
          matched = fetchedPlans.find((p) => String(p.id) === String(planIdParam));
        }
        if (!matched && selectedPlan?.id) {
          matched = fetchedPlans.find((p) => Number(p.id) === Number(selectedPlan.id)) || selectedPlan;
        }
        if (!matched && sessionStorage.getItem('selected_subscription_plan')) {
          try {
            const parsed = JSON.parse(sessionStorage.getItem('selected_subscription_plan'));
            matched = fetchedPlans.find((p) => Number(p.id) === Number(parsed?.id)) || parsed;
          } catch {
            matched = null;
          }
        }
        if (!matched && fetchedPlans.length > 0) {
          matched =
            fetchedPlans.find((p) => Number(p.is_popular) === 1) ||
            fetchedPlans.find((p) => String(p.billing_cycle).toLowerCase() !== 'trial') ||
            fetchedPlans[0];
        }
        if (matched) {
          setSelectedPlan(matched);
          if (matched.billing_cycle) {
            setBillingCycle(String(matched.billing_cycle).toLowerCase());
          }
        }
      } catch (err) {
        console.error('Failed to load configuration data:', err);
        toast.error('Failed to load configuration catalog.');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isSelectedTrial = Boolean(
    selectedPlan &&
      (String(selectedPlan.billing_cycle || '').toLowerCase() === 'trial' ||
        parseFloat(selectedPlan.price) <= 0)
  );

  const effectiveStorageCycle = isSelectedTrial ? 'annual' : billingCycle || 'annual';
  const cycleMeta = selectedPlan?.cycle_meta || {
    cycle: isSelectedTrial ? 'trial' : billingCycle,
    label: selectedPlan?.billing_cycle || billingCycle,
    shortLabel: selectedPlan?.billing_cycle || billingCycle,
  };

  const basePrice = isSelectedTrial
    ? 0
    : Math.round((parseFloat(selectedPlan?.price || 0) || 0) * 100) / 100;

  const selectedStoragePlan = useMemo(
    () => catalog.storage_plans.find((s) => Number(s.id) === Number(selectedStorageId)) || null,
    [catalog.storage_plans, selectedStorageId]
  );

  const storageTotal = useMemo(
    () => (selectedStoragePlan ? Number(selectedStoragePlan?.cycle_prices?.[effectiveStorageCycle] ?? 0) : 0),
    [selectedStoragePlan, effectiveStorageCycle]
  );

  const selectedMachinesList = useMemo(() => {
    const list = [];
    for (const [idStr, qty] of Object.entries(selectedMachines)) {
      const m = catalog.attendance_machines.find((item) => Number(item.id) === Number(idStr));
      if (m && qty > 0) {
        const unitPrice = parseFloat(m.unit_price || 0);
        list.push({ ...m, quantity: qty, unitPrice, totalPrice: Math.round(unitPrice * qty * 100) / 100 });
      }
    }
    return list;
  }, [selectedMachines, catalog.attendance_machines]);

  const machinesTotal = useMemo(
    () => selectedMachinesList.reduce((acc, m) => acc + m.totalPrice, 0),
    [selectedMachinesList]
  );

  const selectedCardsList = useMemo(() => {
    const list = [];
    for (const [idStr, qty] of Object.entries(selectedCards)) {
      const c = catalog.rfid_cards.find((item) => Number(item.id) === Number(idStr));
      if (c && qty > 0) {
        const unitPrice = parseFloat(c.unit_price || 0);
        list.push({ ...c, quantity: qty, unitPrice, totalPrice: Math.round(unitPrice * qty * 100) / 100 });
      }
    }
    return list;
  }, [selectedCards, catalog.rfid_cards]);

  const cardsTotal = useMemo(
    () => selectedCardsList.reduce((acc, c) => acc + c.totalPrice, 0),
    [selectedCardsList]
  );

  const selectedNotificationsList = useMemo(() => {
    const list = [];
    for (const rec of catalog.notification_records) {
      const cfg = selectedNotifications[rec.id];
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
  }, [selectedNotifications, catalog.notification_records]);

  const notificationsTotal = useMemo(
    () => selectedNotificationsList.reduce((acc, n) => acc + n.totalPrice, 0),
    [selectedNotificationsList]
  );

  const hasPhysicalHardware = selectedMachinesList.length > 0 || selectedCardsList.length > 0;

  const subtotal =
    Math.round(
      (basePrice + storageTotal + machinesTotal + cardsTotal + notificationsTotal) * 100
    ) / 100;

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
      const raw = (eligibleBase * parseFloat(appliedCoupon.discountValue || 0)) / 100;
      const cap = appliedCoupon.maxDiscountAmount
        ? parseFloat(appliedCoupon.maxDiscountAmount)
        : null;
      return Math.min(eligibleBase, Math.round((cap ? Math.min(raw, cap) : raw) * 100) / 100);
    }
    return Math.min(eligibleBase, parseFloat(appliedCoupon.discountValue || 0));
  }, [appliedCoupon, subtotal, basePrice, storageTotal]);

  const grandTotal = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

  const handleApplyCoupon = async (e) => {
    if (e) e.preventDefault();
    const cleanCode = couponCodeInput.trim().toUpperCase();
    if (!cleanCode) return;

    setIsValidatingCoupon(true);
    setCouponError(null);
    try {
      const data = await saasApi.validateCoupon(cleanCode, subtotal, {
        planAmount: basePrice,
        storageAmount: storageTotal,
        email: pendingAdmin?.email || pendingCampus?.email,
        phone: pendingAdmin?.phone || pendingCampus?.phone_number,
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
      toast.success(`Coupon "${data.code}" applied!`);
      setCouponCodeInput('');
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Invalid coupon code.';
      setCouponError(msg);
      toast.error(msg);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleProceedToRegistration = () => {
    const configurationPayload = {
      plan: selectedPlan,
      isTrial: isSelectedTrial,
      billingCycle: isSelectedTrial ? 'trial' : billingCycle,
      storage_plan_id: selectedStorageId || null,
      storage_qty: selectedStorageId ? 1 : 0,
      storage_billing_cycle: effectiveStorageCycle,
      selected_machines: selectedMachinesList.map((m) => ({ id: m.id, quantity: m.quantity })),
      selected_cards: selectedCardsList.map((c) => ({ id: c.id, quantity: c.quantity })),
      selected_notifications: selectedNotificationsList.map((n) => ({
        id: n.id,
        type: n.type || n.channel,
        quantity: n.quantity,
      })),
      coupon_code: appliedCoupon?.code || null,
      shipping_address: hasPhysicalHardware ? shippingAddress : null,
      pricing: { basePrice, storageTotal, machinesTotal, cardsTotal, notificationsTotal, subtotal, discountAmount, grandTotal },
    };

    sessionStorage.setItem('configured_subscription', JSON.stringify(configurationPayload));
    if (selectedPlan) {
      sessionStorage.setItem('selected_subscription_plan', JSON.stringify(selectedPlan));
    }

    const params = new URLSearchParams();
    if (selectedPlan?.id) params.set('plan_id', String(selectedPlan.id));
    const resolvedCycle = String(selectedPlan?.billing_cycle || billingCycle || 'monthly').toLowerCase();
    if (resolvedCycle) params.set('cycle', resolvedCycle);
    const hasTrial = appliedCoupon ? false : true;
    params.set('trial', hasTrial ? '1' : '0');

    const onboardingUrl =
      import.meta.env.VITE_ONBOARDING_URL ||
      (typeof window !== 'undefined'
        ? `${window.location.protocol}//${window.location.hostname}:3000`
        : '');
    if (onboardingUrl && !hasRegistrationData) {
      window.location.href = `${onboardingUrl}/register?${params.toString()}`;
      return;
    }

    navigate(`/register?${params.toString()}`, {
      state: {
        configuration: configurationPayload,
        plan: selectedPlan,
        isTrial: isSelectedTrial,
        billingCycle: isSelectedTrial ? 'trial' : billingCycle,
      },
    });
  };

  const completeHandoverOrLogin = (_resData, fallbackEmail) => {
    sessionStorage.removeItem('pending_registration_data');
    sessionStorage.removeItem('configured_subscription');
    navigate('/account/login/adminlogin', {
      state: { registeredEmail: fallbackEmail, registrationSuccess: true },
    });
  };

  const handleCompleteRegistrationWithConfig = async () => {
    if (!selectedPlan) return;
    if (hasPhysicalHardware && (!shippingAddress || shippingAddress.trim().length < 6)) {
      toast.error('Please enter a complete Campus Delivery / Shipping Address for hardware dispatch.');
      return;
    }

    const bundleFields = {
      plan_id: selectedPlan.id,
      is_trial: isSelectedTrial,
      storage_plan_id: selectedStorageId || null,
      storage_qty: selectedStorageId ? 1 : 0,
      storage_billing_cycle: effectiveStorageCycle,
      selected_machines: selectedMachinesList.map((m) => ({ id: Number(m.id), quantity: Number(m.quantity) })),
      selected_cards: selectedCardsList.map((c) => ({ id: Number(c.id), quantity: Number(c.quantity) })),
      selected_notifications: selectedNotificationsList.map((n) => ({
        id: Number(n.id),
        type: n.type || n.channel,
        quantity: Number(n.quantity),
      })),
      coupon_code: appliedCoupon?.code || null,
      shipping_address: hasPhysicalHardware ? shippingAddress.trim() : null,
    };

    const basePayload = {
      ...bundleFields,
      planId: selectedPlan.id,
      school: {
        ...pendingSchool,
        phone_number: pendingCampus?.phone_number || pendingSchool?.phone_number || '',
        email: pendingCampus?.email || pendingSchool?.email || pendingAdmin?.email || '',
        website: pendingCampus?.website || '',
        address: pendingCampus?.address || shippingAddress || '',
        city: pendingCampus?.city || '',
        state: pendingCampus?.state || '',
        country: pendingCampus?.country || '101',
        postal_code: pendingCampus?.postal_code || '',
        footer: pendingCampus?.footer || '',
      },
      academic_year: pendingAcademicYear || {},
      academicYear: pendingAcademicYear || {},
      admin: {
        first_name: pendingAdmin.first_name,
        last_name: pendingAdmin.last_name,
        email: pendingAdmin.email,
        phone: pendingAdmin.phone,
        gender: pendingAdmin.gender,
        picture: pendingAdmin.picture || null,
        country_id: pendingCampus?.country || '101',
        state_id: pendingCampus?.state || null,
        city: pendingCampus?.city || null,
        role: 0,
        password: pendingAdmin.password,
      },
    };

    try {
      setSubmitting(true);

      // Pure ₹0 Free Trial (with no paid add-ons)
      if (isSelectedTrial && grandTotal <= 0) {
        const res = await saasApi.registerSchool({
          ...basePayload,
          isTrial: true,
          paymentGateway: 'free_trial',
        });
        toast.success('School & Admin registered! Your Free Trial is now active.');
        completeHandoverOrLogin(res, pendingAdmin.email);
        return;
      }

      // Create server-verified order (supports paid plans, trials with paid add-ons, and 100% coupons!)
      const orderRes = await saasApi.createOrder({
        ...bundleFields,
        email: pendingAdmin.email,
        phone: pendingAdmin.phone || pendingCampus?.phone_number,
      });
      const orderData = orderRes?.data || orderRes;

      if (orderData?.zero_amount_ready) {
        const res = await saasApi.registerSchool({
          ...basePayload,
          order_no: orderData.order_no,
          payment_order_id: orderData.payment_order_id,
          paymentGateway: isSelectedTrial ? 'free_trial' : 'coupon_100',
        });
        toast.success('School & Subscription activated immediately!');
        completeHandoverOrLogin(res, pendingAdmin.email);
        return;
      }

      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        toast.error('Could not connect to Razorpay SDK. Please check your internet connection.');
        setSubmitting(false);
        return;
      }

      if (!orderData?.order_id) {
        throw new Error(orderRes?.message || 'Failed to initialize payment order.');
      }

      const rzp = new window.Razorpay({
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'GrowVidya School ERP',
        description: `${selectedPlan.plan_name} (${cycleMeta.label})`,
        order_id: orderData.order_id,
        prefill: {
          name: `${pendingAdmin.first_name} ${pendingAdmin.last_name || ''}`.trim(),
          email: pendingAdmin.email,
          contact: pendingAdmin.phone || pendingCampus?.phone_number || '',
        },
        theme: { color: '#4f46e5' },
        handler: async (response) => {
          try {
            setSubmitting(true);
            const res = await saasApi.registerSchool({
              ...basePayload,
              order_no: orderData.order_no,
              payment_order_id: orderData.payment_order_id,
              paymentGateway: 'razorpay',
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            toast.success('Payment verified & School registered! Portal is live immediately.');
            completeHandoverOrLogin(res, pendingAdmin.email);
          } catch (err) {
            toast.error(err?.response?.data?.message || err.message || 'Registration failed after payment.');
          } finally {
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => setSubmitting(false),
        },
      });

      rzp.on('payment.failed', async (resp) => {
        const reason = resp?.error?.description || 'Transaction failed.';
        try {
          await saasApi.recordPaymentFailure({
            order_no: orderData.order_no,
            razorpay_order_id: orderData.order_id,
            razorpay_payment_id: resp?.error?.metadata?.payment_id || null,
            error_code: resp?.error?.code || 'PAYMENT_FAILED',
            error_description: reason,
          });
        } catch {
          // non-blocking
        }
        toast.error(`Payment declined: ${reason}`);
        setSubmitting(false);
      });

      rzp.open();
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Registration failed.');
      setSubmitting(false);
    }
  };

  const includedStorageGb = Math.max(0, parseInt(selectedPlan?.included_storage_gb, 10) || 0);

  return (
    <div className="bg-light min-vh-100 d-flex flex-column">
      <header className="navbar navbar-expand-lg navbar-light bg-white border-bottom shadow-sm px-3 px-md-5 py-2 py-md-3 w-100 sticky-top">
        <div className="container-fluid px-0 d-flex justify-content-between align-items-center">
          <Link to="/" className="navbar-brand d-flex align-items-center m-0 p-0 text-decoration-none">
            <img src={logoDark} alt="Growvidya Logo" style={{ height: '56px', width: 'auto', objectFit: 'contain' }} />
          </Link>
          <div className="d-flex align-items-center gap-3">
            <Link to="/pricing" className="btn btn-light border text-dark btn-sm fw-semibold px-3 py-2">
              <i className="ti ti-arrow-left me-1"></i> Pricing Plans
            </Link>
            <Link to="/register" className="btn btn-primary btn-sm fw-semibold px-3 py-2 shadow-sm">
              <i className="ti ti-school me-1"></i> Register School
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-grow-1 py-4 py-md-5">
        <div className="container-fluid px-3 px-md-5" style={{ maxWidth: '1400px' }}>
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary mb-3"></div>
              <h5 className="fw-bold text-dark">Loading Configuration Catalog...</h5>
            </div>
          ) : !selectedPlan ? (
            <div className="text-center py-5 bg-white rounded-3 border shadow-sm p-5">
              <h4 className="fw-bold text-dark mb-2">No Subscription Plan Selected</h4>
              <p className="text-muted fs-14 mb-4">Please choose a subscription tier from our pricing page first.</p>
              <Link to="/pricing" className="btn btn-primary px-4 py-2 fw-semibold">
                View Pricing Plans
              </Link>
            </div>
          ) : (
            <div className="row g-4">
              {/* Left Column */}
              <div className="col-12 col-lg-8">
                {/* Selected Plan Card */}
                <div className="card border-0 shadow-sm rounded-3 mb-4 overflow-hidden">
                  <div
                    className="p-4 text-white"
                    style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}
                  >
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="badge bg-primary text-white px-3 py-1 fs-11 rounded-pill text-uppercase">
                        {cycleMeta.label}
                      </span>
                      <Link
                        to="/pricing"
                        className="btn btn-sm text-white rounded-pill px-3 py-1 fs-11 fw-semibold"
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.14)',
                          border: '1px solid rgba(255, 255, 255, 0.3)',
                        }}
                      >
                        Switch Plan
                      </Link>
                    </div>
                    <div className="d-md-flex justify-content-between align-items-center">
                      <div>
                        <h3 className="fw-bold text-white mb-1">{selectedPlan.plan_name}</h3>
                        <p className="text-white-50 fs-13 mb-0">{selectedPlan.description}</p>
                      </div>
                      <div className="text-md-end mt-3 mt-md-0">
                        {Number(selectedPlan.original_price) > Number(selectedPlan.price) && (
                          <div className="d-inline-flex align-items-center gap-2 mb-1">
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
                          <span className="fs-13 fw-normal text-white-50"> / {cycleMeta.shortLabel}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="card-body p-3 bg-white d-flex flex-wrap gap-4 fs-13">
                    <span>
                      <i className="ti ti-school text-primary me-1"></i>
                      <strong>
                        {selectedPlan.max_students > 0
                          ? `${Number(selectedPlan.max_students).toLocaleString('en-IN')} Students`
                          : 'Unlimited Students'}
                      </strong>
                    </span>
                    <span>
                      <i className="ti ti-users text-success me-1"></i>
                      <strong>Unlimited</strong> Teachers &amp; Branches
                    </span>
                    <span>
                      <i className="ti ti-cloud text-info me-1"></i>
                      <strong>{includedStorageGb} GB</strong> Cloud Storage Included
                    </span>
                  </div>
                </div>

                {/* 1. Cloud Storage Add-on */}
                <div className="card border-0 shadow-sm rounded-3 mb-4">
                  <div
                    className="card-header bg-white p-3 p-md-4 d-flex justify-content-between align-items-center"
                    style={{ cursor: 'pointer' }}
                    onClick={() => toggleSection('storage')}
                  >
                    <div>
                      <h5 className="fw-bold text-dark mb-0 fs-16">
                        <i className="ti ti-cloud-upload text-primary me-2"></i>
                        Cloud Storage Expansion
                      </h5>
                      <p className="text-muted fs-12 mb-0">
                        Expand beyond your plan&apos;s {includedStorageGb} GB base storage.
                      </p>
                    </div>
                    <i className={`ti ${collapsedSections.storage ? 'ti-chevron-down' : 'ti-chevron-up'} fs-18`}></i>
                  </div>
                  {!collapsedSections.storage && (
                    <div className="card-body p-3 p-md-4 bg-white border-top">
                      <div className="row g-3">
                        {catalog.storage_plans.map((sp) => {
                          const isSel = Number(selectedStorageId) === Number(sp.id);
                          const price = Number(sp?.cycle_prices?.[effectiveStorageCycle] ?? 0);
                          return (
                            <div className="col-6 col-md-4 col-xl-3" key={sp.id}>
                              <div
                                onClick={() => setSelectedStorageId(isSel ? null : sp.id)}
                                className={`p-3 rounded-3 border text-center h-100 ${
                                  isSel ? 'border-2 border-primary' : 'bg-white'
                                }`}
                                style={{
                                  cursor: 'pointer',
                                  backgroundColor: isSel ? '#eef2ff' : '#ffffff',
                                }}
                              >
                                <div className="fw-bold text-dark fs-14">
                                  +{sp.storage_capacity} {sp.unit_code || 'GB'}
                                </div>
                                <div className="text-muted fs-11 mb-2">{sp.plan_name}</div>
                                <div className="fw-bold text-primary fs-13">
                                  +₹{price.toLocaleString('en-IN')}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Prepaid Notification Credits */}
                <div className="card border-0 shadow-sm rounded-3 mb-4">
                  <div
                    className="card-header bg-white p-3 p-md-4 d-flex justify-content-between align-items-center"
                    style={{ cursor: 'pointer' }}
                    onClick={() => toggleSection('notifications')}
                  >
                    <div>
                      <h5 className="fw-bold text-dark mb-0 fs-16">
                        <i className="ti ti-bell-ringing text-warning me-2"></i>
                        Prepaid SMS &amp; Push Notification Credits
                      </h5>
                      <p className="text-muted fs-12 mb-0">Optional metered credits added to your school wallet.</p>
                    </div>
                    <i className={`ti ${collapsedSections.notifications ? 'ti-chevron-down' : 'ti-chevron-up'} fs-18`}></i>
                  </div>
                  {!collapsedSections.notifications && (
                    <div className="card-body p-3 p-md-4 bg-white border-top">
                      <div className="row g-3">
                        {catalog.notification_records.map((rec) => {
                          const minQty = Math.max(1, parseInt(rec.min_qty, 10) || 1);
                          const rate = parseFloat(rec.cost || rec.unit_price || 0);
                          const cfg = selectedNotifications[rec.id] || { selected: false, quantity: minQty };
                          const isSel = Boolean(cfg.selected);
                          const qty = parseInt(cfg.quantity, 10) || 0;
                          return (
                            <div className="col-12 col-md-6" key={rec.id}>
                              <div className={`p-3 rounded-3 border h-100 ${isSel ? 'border-primary border-2' : ''}`}>
                                <div className="d-flex justify-content-between mb-1">
                                  <strong className="text-dark fs-14">{rec.pack_name || rec.name}</strong>
                                  <strong className="text-primary">₹{rate.toFixed(2)} / credit</strong>
                                </div>
                                <p className="text-muted fs-12 mb-2">{rec.message}</p>
                                <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                                  <div className="form-check form-switch m-0">
                                    <input
                                      type="checkbox"
                                      className="form-check-input"
                                      checked={isSel}
                                      onChange={() =>
                                        setSelectedNotifications((prev) => ({
                                          ...prev,
                                          [rec.id]: {
                                            selected: !isSel,
                                            quantity: Math.max(minQty, prev[rec.id]?.quantity || minQty),
                                          },
                                        }))
                                      }
                                    />
                                    <label className="form-check-label fs-12">Min. {minQty}</label>
                                  </div>
                                  {isSel && (
                                    <input
                                      type="number"
                                      min={minQty}
                                      step={minQty}
                                      className="form-control form-control-sm text-center fw-bold"
                                      style={{ width: '96px' }}
                                      value={qty}
                                      onChange={(e) =>
                                        setSelectedNotifications((prev) => ({
                                          ...prev,
                                          [rec.id]: {
                                            selected: true,
                                            quantity: Math.max(minQty, parseInt(e.target.value, 10) || minQty),
                                          },
                                        }))
                                      }
                                    />
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Biometric Machines */}
                <div className="card border-0 shadow-sm rounded-3 mb-4">
                  <div
                    className="card-header bg-white p-3 p-md-4 d-flex justify-content-between align-items-center"
                    style={{ cursor: 'pointer' }}
                    onClick={() => toggleSection('machines')}
                  >
                    <div>
                      <h5 className="fw-bold text-dark mb-0 fs-16">
                        <i className="ti ti-device-watch text-success me-2"></i>
                        Biometric Attendance Terminals ({catalog.attendance_machines.length})
                      </h5>
                      <p className="text-muted fs-12 mb-0">Optional one-time hardware purchase.</p>
                    </div>
                    <i className={`ti ${collapsedSections.machines ? 'ti-chevron-down' : 'ti-chevron-up'} fs-18`}></i>
                  </div>
                  {!collapsedSections.machines && (
                    <div className="card-body p-3 p-md-4 bg-white border-top">
                      <div className="row g-3">
                        {catalog.attendance_machines.map((m) => {
                          const qty = selectedMachines[m.id] || 0;
                          return (
                            <div className="col-12 col-md-6" key={m.id}>
                              <div className={`p-3 rounded-3 border d-flex align-items-center gap-3 ${qty > 0 ? 'border-primary border-2' : ''}`}>
                                <img
                                  src={resolveImageUrl(m.machine_image, NO_IMAGE_PLACEHOLDER)}
                                  alt={m.machine_name}
                                  style={{ width: '56px', height: '56px', objectFit: 'contain' }}
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = NO_IMAGE_PLACEHOLDER;
                                  }}
                                />
                                <div className="flex-grow-1 overflow-hidden">
                                  <div className="fw-bold text-dark fs-13 text-truncate">{m.machine_name}</div>
                                  <div className="fw-bold text-primary fs-13">
                                    ₹{Number(m.unit_price).toLocaleString('en-IN')}
                                  </div>
                                </div>
                                <div className="d-flex align-items-center gap-1">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-light border text-dark px-2"
                                    disabled={qty <= 0}
                                    onClick={() =>
                                      setSelectedMachines((prev) => {
                                        const next = { ...prev };
                                        if (qty <= 1) delete next[m.id];
                                        else next[m.id] = qty - 1;
                                        return next;
                                      })
                                    }
                                  >
                                    -
                                  </button>
                                  <span className="badge bg-light text-dark border px-2 py-1">{qty}</span>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-primary px-2"
                                    onClick={() => setSelectedMachines((prev) => ({ ...prev, [m.id]: qty + 1 }))}
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Smart RFID Cards */}
                <div className="card border-0 shadow-sm rounded-3 mb-4">
                  <div
                    className="card-header bg-white p-3 p-md-4 d-flex justify-content-between align-items-center"
                    style={{ cursor: 'pointer' }}
                    onClick={() => toggleSection('cards')}
                  >
                    <div>
                      <h5 className="fw-bold text-dark mb-0 fs-16">
                        <i className="ti ti-id text-info me-2"></i>
                        Smart RFID Cards &amp; Badges ({catalog.rfid_cards.length})
                      </h5>
                      <p className="text-muted fs-12 mb-0">Optional student &amp; staff smart ID cards.</p>
                    </div>
                    <i className={`ti ${collapsedSections.cards ? 'ti-chevron-down' : 'ti-chevron-up'} fs-18`}></i>
                  </div>
                  {!collapsedSections.cards && (
                    <div className="card-body p-3 p-md-4 bg-white border-top">
                      <div className="row g-3">
                        {catalog.rfid_cards.map((c) => {
                          const qty = selectedCards[c.id] || 0;
                          const minQty = Math.max(1, parseInt(c.min_order_qty, 10) || 1);
                          return (
                            <div className="col-12 col-md-6" key={c.id}>
                              <div className={`p-3 rounded-3 border d-flex align-items-center gap-3 ${qty > 0 ? 'border-primary border-2' : ''}`}>
                                <img
                                  src={resolveImageUrl(c.card_image || c.rfid_image, NO_IMAGE_PLACEHOLDER)}
                                  alt={c.card_name}
                                  style={{ width: '56px', height: '56px', objectFit: 'contain' }}
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = NO_IMAGE_PLACEHOLDER;
                                  }}
                                />
                                <div className="flex-grow-1 overflow-hidden">
                                  <div className="fw-bold text-dark fs-13 text-truncate">{c.card_name}</div>
                                  <div className="text-muted fs-11">
                                    ₹{Number(c.unit_price).toFixed(2)} • Min. {minQty} pcs
                                  </div>
                                </div>
                                {qty === 0 ? (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-primary"
                                    onClick={() => setSelectedCards((prev) => ({ ...prev, [c.id]: minQty }))}
                                  >
                                    + Add ({minQty})
                                  </button>
                                ) : (
                                  <div className="d-flex align-items-center gap-1">
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-light border text-dark px-2"
                                      onClick={() =>
                                        setSelectedCards((prev) => {
                                          const next = { ...prev };
                                          if (qty <= minQty) delete next[c.id];
                                          else next[c.id] = Math.max(minQty, qty - 50);
                                          return next;
                                        })
                                      }
                                    >
                                      -
                                    </button>
                                    <span className="badge bg-light text-dark border px-2 py-1">{qty}</span>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-primary px-2"
                                      onClick={() => setSelectedCards((prev) => ({ ...prev, [c.id]: qty + 50 }))}
                                    >
                                      +
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {hasPhysicalHardware && (
                  <div className="card border-primary border-2 shadow-sm rounded-3 mb-4">
                    <div className="card-body p-3 p-md-4 bg-white">
                      <label className="form-label fw-bold text-dark fs-13">
                        <i className="ti ti-truck-delivery text-primary me-2"></i>
                        Campus Delivery / Shipping Address <span className="text-danger">*</span>
                      </label>
                      <textarea
                        rows={2}
                        className="form-control fs-13"
                        placeholder="Enter complete school campus delivery address..."
                        value={shippingAddress}
                        onChange={(e) => setShippingAddress(e.target.value)}
                      ></textarea>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Order Summary (Zero GST) */}
              <div className="col-12 col-lg-4">
                <div className="card border-0 shadow-sm rounded-3 sticky-top" style={{ top: '88px' }}>
                  <div className="card-header bg-white border-bottom p-3 p-md-4">
                    <h5 className="fw-bold text-dark mb-0 fs-16">
                      <i className="ti ti-receipt-2 me-2 text-primary"></i>
                      Order Summary
                    </h5>
                  </div>
                  <div className="card-body p-3 p-md-4 bg-white">
                    <div className="d-flex justify-content-between fs-13 mb-2">
                      <span>
                        <strong>{selectedPlan.plan_name}</strong> ({cycleMeta.label})
                      </span>
                      <strong>₹{basePrice.toLocaleString('en-IN')}</strong>
                    </div>

                    {selectedStoragePlan && (
                      <div className="d-flex justify-content-between fs-12 mb-2 text-muted">
                        <span>Storage: {selectedStoragePlan.plan_name}</span>
                        <strong className="text-dark">+₹{storageTotal.toLocaleString('en-IN')}</strong>
                      </div>
                    )}
                    {selectedNotificationsList.map((n) => (
                      <div className="d-flex justify-content-between fs-12 mb-2 text-muted" key={n.id}>
                        <span>{n.pack_name || n.name} ({n.quantity.toLocaleString('en-IN')})</span>
                        <strong className="text-dark">+₹{n.totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                      </div>
                    ))}
                    {selectedMachinesList.map((m) => (
                      <div className="d-flex justify-content-between fs-12 mb-2 text-muted" key={m.id}>
                        <span>{m.machine_name} × {m.quantity}</span>
                        <strong className="text-dark">+₹{m.totalPrice.toLocaleString('en-IN')}</strong>
                      </div>
                    ))}
                    {selectedCardsList.map((c) => (
                      <div className="d-flex justify-content-between fs-12 mb-2 text-muted" key={c.id}>
                        <span>{c.card_name} × {c.quantity}</span>
                        <strong className="text-dark">+₹{c.totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                      </div>
                    ))}

                    {/* Promo Coupon */}
                    {subtotal > 0 && (
                      <div className="border-top pt-3 mt-3">
                        {!appliedCoupon ? (
                          <form onSubmit={handleApplyCoupon} className="input-group input-group-sm">
                            <input
                              type="text"
                              className="form-control text-uppercase"
                              placeholder="Promo Code"
                              value={couponCodeInput}
                              onChange={(e) => {
                                setCouponCodeInput(e.target.value.toUpperCase());
                                setCouponError(null);
                              }}
                            />
                            <button
                              type="submit"
                              className="btn btn-primary fw-semibold"
                              disabled={isValidatingCoupon || !couponCodeInput.trim()}
                            >
                              {isValidatingCoupon ? '...' : 'Apply'}
                            </button>
                          </form>
                        ) : (
                          <div className="p-2 rounded bg-success-subtle border border-success-subtle d-flex justify-content-between align-items-center fs-12">
                            <span className="text-success fw-bold">
                              {appliedCoupon.code} (-₹{discountAmount.toLocaleString('en-IN')})
                            </span>
                            <button
                              type="button"
                              className="btn btn-sm btn-link text-danger p-0 text-decoration-none fs-11"
                              onClick={() => setAppliedCoupon(null)}
                            >
                              Remove
                            </button>
                          </div>
                        )}
                        {couponError && <div className="text-danger fs-11 mt-1">{couponError}</div>}
                      </div>
                    )}

                    {/* Net Totals (Zero GST) */}
                    <div className="border-top pt-3 mt-3">
                      <div className="d-flex justify-content-between fs-13 mb-1">
                        <span className="text-muted">Subtotal</span>
                        <span className="fw-semibold text-dark">
                          ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      {discountAmount > 0 && (
                        <div className="d-flex justify-content-between fs-13 mb-1 text-success">
                          <span>Promo Discount</span>
                          <span className="fw-bold">
                            -₹{discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                      <div className="d-flex justify-content-between align-items-center pt-2 border-top mt-2 mb-3">
                        <span className="fw-bold text-dark fs-15">Total Net Due</span>
                        <span className="fw-bold text-primary fs-22">
                          ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="btn btn-primary w-100 py-2 px-3 fw-bold fs-14 shadow-sm"
                        disabled={submitting}
                        onClick={
                          hasRegistrationData
                            ? handleCompleteRegistrationWithConfig
                            : handleProceedToRegistration
                        }
                      >
                        {submitting
                          ? 'Setting Up School Portal...'
                          : hasRegistrationData
                          ? grandTotal <= 0
                            ? `Activate ${selectedPlan.plan_name} & Setup Portal`
                            : `Pay ₹${grandTotal.toLocaleString('en-IN')} & Complete Setup`
                          : isSelectedTrial && grandTotal <= 0
                          ? `Start ${selectedPlan.plan_name} — Register School`
                          : 'Proceed to School Registration'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="bg-white border-top py-3 text-center text-muted fs-13 mt-auto w-100">
        <div className="container">
          Copyright &copy; {new Date().getFullYear()} Growvidya School Management. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default SubscriptionConfigurePublic;
