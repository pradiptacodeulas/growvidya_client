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

  const [plans, setPlans] = useState([]);
  const [catalog, setCatalog] = useState({
    storage_plans: [],
    attendance_machines: [],
    rfid_cards: [],
    bank_accounts: [],
    notification_records: [],
  });
  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Read plan and billing cycle from location state or sessionStorage or query param
  const searchParams = new URLSearchParams(location.search);
  const planIdParam = searchParams.get('planId');
  const billingParam = searchParams.get('billing');

  const [billingCycle, setBillingCycle] = useState(
    location.state?.billingCycle || billingParam || 'monthly'
  );

  const [selectedPlan, setSelectedPlan] = useState(location.state?.plan || null);

  // Read any pending school registration data (from /register wizard)
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

  // Configuration selections
  const [selectedStorageId, setSelectedStorageId] = useState(null);
  const [selectedMachines, setSelectedMachines] = useState({});
  const [selectedCards, setSelectedCards] = useState({});
  const [selectedNotifications, setSelectedNotifications] = useState({});

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

  // Coupon state
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setCatalogLoading(true);

      const [plansRes, catalogRes] = await Promise.all([
        saasApi.getPlans(),
        saasApi.getConfigCatalog().catch((err) => {
          console.warn('Failed to load configuration catalog:', err);
          return { data: {} };
        }),
      ]);

      const fetchedPlans = plansRes?.data || [];
      const fetchedCatalog = catalogRes?.data || {};

      setPlans(fetchedPlans);
      setCatalog({
        storage_plans: fetchedCatalog.storage_plans || [],
        attendance_machines: fetchedCatalog.attendance_machines || [],
        rfid_cards: fetchedCatalog.rfid_cards || [],
        bank_accounts: fetchedCatalog.bank_accounts || [],
        notification_records: fetchedCatalog.notification_records || [],
      });

      // Resolve selected plan if not already set
      if (!selectedPlan) {
        let matched = null;
        if (planIdParam) {
          matched = fetchedPlans.find((p) => String(p.id) === String(planIdParam));
        }
        if (!matched && sessionStorage.getItem('selected_subscription_plan')) {
          try {
            matched = JSON.parse(sessionStorage.getItem('selected_subscription_plan'));
          } catch {
            matched = null;
          }
        }
        if (!matched && fetchedPlans.length > 0) {
          // Default to Growth or Starter plan
          matched =
            fetchedPlans.find((p) => p.plan_code?.toLowerCase().includes('growth')) ||
            fetchedPlans.find((p) => !p.plan_code?.toLowerCase().includes('trial')) ||
            fetchedPlans[0];
        }
        if (matched) {
          setSelectedPlan(matched);
          if (matched.billing_cycle) {
            setBillingCycle(matched.billing_cycle);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load configuration data:', err);
      toast.error('Failed to load configuration catalog.');
    } finally {
      setLoading(false);
      setCatalogLoading(false);
    }
  };

  // Handlers for Storage Selection (single select, toggle off on re-click)
  const handleSelectStorage = (storageId) => {
    setSelectedStorageId((prev) => (prev === storageId ? null : storageId));
  };

  const handleClearStorage = () => {
    setSelectedStorageId(null);
  };

  // Handlers for Attendance Machines (multi-select + stepper)
  const handleAddMachine = (machine) => {
    if (!machine) return;
    setSelectedMachines((prev) => ({
      ...prev,
      [machine.id]: (prev[machine.id] || 0) + 1,
    }));
  };

  const handleIncreaseMachineQty = (machine) => {
    if (!machine) return;
    setSelectedMachines((prev) => ({
      ...prev,
      [machine.id]: (prev[machine.id] || 0) + 1,
    }));
  };

  const handleDecreaseMachineQty = (machine) => {
    if (!machine) return;
    setSelectedMachines((prev) => {
      const current = prev[machine.id] || 0;
      if (current <= 1) {
        const next = { ...prev };
        delete next[machine.id];
        return next;
      }
      return {
        ...prev,
        [machine.id]: current - 1,
      };
    });
  };

  const handleRemoveMachine = (machineId) => {
    setSelectedMachines((prev) => {
      const next = { ...prev };
      delete next[machineId];
      return next;
    });
  };

  const handleClearAllMachines = () => {
    setSelectedMachines({});
  };

  // Handlers for Smart RFID Cards (multi-select + stepper: 1, 2, 3...)
  const handleAddCard = (card) => {
    if (!card) return;
    setSelectedCards((prev) => ({
      ...prev,
      [card.id]: (prev[card.id] || 0) + 1,
    }));
  };

  const handleIncreaseCardQty = (card) => {
    if (!card) return;
    setSelectedCards((prev) => ({
      ...prev,
      [card.id]: (prev[card.id] || 0) + 1,
    }));
  };

  const handleDecreaseCardQty = (card) => {
    if (!card) return;
    setSelectedCards((prev) => {
      const current = prev[card.id] || 0;
      if (current <= 1) {
        const next = { ...prev };
        delete next[card.id];
        return next;
      }
      return {
        ...prev,
        [card.id]: current - 1,
      };
    });
  };

  const handleRemoveCard = (cardId) => {
    setSelectedCards((prev) => {
      const next = { ...prev };
      delete next[cardId];
      return next;
    });
  };

  const handleClearAllCards = () => {
    setSelectedCards({});
  };

  // Handlers for SMS & Push Notifications (step by 1, start at 1)
  const handleToggleNotification = (recordId, defaultQty = 1) => {
    setSelectedNotifications((prev) => {
      const existing = prev[recordId];
      if (existing && existing.selected) {
        return {
          ...prev,
          [recordId]: { ...existing, selected: false, quantity: 0 },
        };
      }
      return {
        ...prev,
        [recordId]: {
          selected: true,
          quantity: existing?.quantity && existing.quantity > 0 ? existing.quantity : (defaultQty || 1),
        },
      };
    });
  };

  const handleIncreaseNotificationQty = (recordId, step = 1) => {
    setSelectedNotifications((prev) => {
      const existing = prev[recordId] || { selected: true, quantity: 0 };
      const current = parseInt(existing.quantity, 10) || 0;
      return {
        ...prev,
        [recordId]: { selected: true, quantity: current + step },
      };
    });
  };

  const handleDecreaseNotificationQty = (recordId, step = 1) => {
    setSelectedNotifications((prev) => {
      const existing = prev[recordId];
      if (!existing) return prev;
      const current = parseInt(existing.quantity, 10) || 0;
      const nextQty = Math.max(0, current - step);
      return {
        ...prev,
        [recordId]: { ...existing, selected: nextQty > 0, quantity: nextQty },
      };
    });
  };

  const handleSetNotificationQty = (recordId, val) => {
    const parsed = parseInt(val, 10);
    const newQty = isNaN(parsed) || parsed < 0 ? 0 : parsed;
    setSelectedNotifications((prev) => ({
      ...prev,
      [recordId]: {
        selected: newQty > 0,
        quantity: newQty,
      },
    }));
  };

  // Pricing Calculations
  const isSelectedTrial =
    selectedPlan &&
    (selectedPlan.billing_cycle === 'trial' || parseFloat(selectedPlan.price) === 0);

  const basePrice = parseFloat(selectedPlan?.price || 0);

  // Storage pricing
  const selectedStoragePlan = useMemo(() => {
    return catalog.storage_plans.find((s) => s.id === Number(selectedStorageId)) || null;
  }, [catalog.storage_plans, selectedStorageId]);

  const storagePriceUnit = useMemo(() => {
    if (!selectedStoragePlan) return 0;
    return billingCycle === 'monthly'
      ? parseFloat(selectedStoragePlan.monthly_price || 0)
      : parseFloat(selectedStoragePlan.annual_price || 0);
  }, [selectedStoragePlan, billingCycle]);

  const storageTotal = storagePriceUnit;

  // Machines pricing
  const selectedMachinesList = useMemo(() => {
    if (!catalog.attendance_machines || catalog.attendance_machines.length === 0) return [];
    const list = [];
    for (const [idStr, qty] of Object.entries(selectedMachines)) {
      const machineId = Number(idStr);
      const machine = catalog.attendance_machines.find((m) => Number(m.id) === machineId);
      if (machine && qty > 0) {
        const unitPrice = parseFloat(machine.unit_price || 0);
        list.push({
          ...machine,
          quantity: qty,
          unitPrice,
          totalPrice: unitPrice * qty,
        });
      }
    }
    return list;
  }, [selectedMachines, catalog.attendance_machines]);

  const machinesTotal = useMemo(() => {
    return selectedMachinesList.reduce((sum, m) => sum + m.totalPrice, 0);
  }, [selectedMachinesList]);

  // RFID Cards pricing
  const selectedCardsList = useMemo(() => {
    if (!catalog.rfid_cards || catalog.rfid_cards.length === 0) return [];
    const list = [];
    for (const [idStr, qty] of Object.entries(selectedCards)) {
      const cardId = Number(idStr);
      const card = catalog.rfid_cards.find((c) => Number(c.id) === cardId);
      if (card && qty > 0) {
        const unitPrice = parseFloat(card.unit_price || 0);
        list.push({
          ...card,
          quantity: qty,
          unitPrice,
          totalPrice: unitPrice * qty,
        });
      }
    }
    return list;
  }, [selectedCards, catalog.rfid_cards]);

  const cardsTotal = useMemo(() => {
    return selectedCardsList.reduce((sum, c) => sum + c.totalPrice, 0);
  }, [selectedCardsList]);

  // SMS & Push Notifications pricing
  const selectedNotificationsList = useMemo(() => {
    if (!catalog.notification_records || catalog.notification_records.length === 0) return [];
    const list = [];
    for (const record of catalog.notification_records) {
      const cfg = selectedNotifications[record.id];
      if (cfg && cfg.selected && cfg.quantity > 0) {
        const unitPrice = parseFloat(record.cost || 0);
        const qty = parseInt(cfg.quantity, 10);
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

  const notificationsTotal = useMemo(() => {
    return selectedNotificationsList.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [selectedNotificationsList]);

  // Subtotal Calculation
  const subtotal =
    basePrice + storageTotal + machinesTotal + cardsTotal + notificationsTotal;

  // Coupon discount computation
  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discountType === 'percentage') {
      const computed = (subtotal * parseFloat(appliedCoupon.discountValue || 0)) / 100;
      const maxDiscount = appliedCoupon.maxDiscountAmount
        ? parseFloat(appliedCoupon.maxDiscountAmount)
        : null;
      return maxDiscount ? Math.min(computed, maxDiscount) : computed;
    }
    return Math.min(subtotal, parseFloat(appliedCoupon.discountValue || 0));
  }, [appliedCoupon, subtotal]);

  const grandTotal = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

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
      const data = await saasApi.validateCoupon(cleanCode, subtotal);
      setAppliedCoupon({
        id: data.id,
        code: data.code,
        description: data.description,
        discountType: data.discountType,
        discountValue: parseFloat(data.discountValue),
        discountAmount: parseFloat(data.discountAmount),
        maxDiscountAmount: data.max_discount_amount || data.maxDiscountAmount || null,
      });
      toast.success(
        `Coupon "${data.code}" applied! You saved ₹${parseFloat(data.discountAmount).toLocaleString(
          'en-IN'
        )}`
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

  // Proceed to School Registration (when registration data was not entered first)
  const handleProceedToRegistration = () => {
    const configurationPayload = {
      plan: selectedPlan,
      isTrial: Boolean(isSelectedTrial),
      billingCycle: isSelectedTrial ? 'trial' : billingCycle,
      storagePlan: selectedStoragePlan,
      attendanceMachines: selectedMachinesList,
      rfidCards: selectedCardsList,
      notifications: selectedNotificationsList,
      coupon: appliedCoupon,
      pricing: {
        basePrice,
        storageTotal,
        machinesTotal,
        cardsTotal,
        notificationsTotal,
        subtotal,
        discountAmount,
        grandTotal,
      },
    };

    sessionStorage.setItem('configured_subscription', JSON.stringify(configurationPayload));
    if (selectedPlan) {
      sessionStorage.setItem('selected_subscription_plan', JSON.stringify(selectedPlan));
    }

    navigate('/register', {
      state: {
        configuration: configurationPayload,
        plan: selectedPlan,
        isTrial: Boolean(isSelectedTrial),
        billingCycle: isSelectedTrial ? 'trial' : billingCycle,
        step: pendingSchool ? 4 : 1,
        school: pendingSchool,
        campus: pendingCampus,
        academicYear: pendingAcademicYear,
        admin: pendingAdmin,
      },
    });
  };

  // Complete registration and portal activation when registration details are attached
  const handleCompleteRegistrationWithConfig = async () => {
    if (!selectedPlan) {
      toast.warning('Please select a subscription plan.');
      return;
    }

    const configurationPayload = {
      plan: selectedPlan,
      isTrial: Boolean(isSelectedTrial),
      billingCycle: isSelectedTrial ? 'trial' : billingCycle,
      storagePlan: selectedStoragePlan,
      attendanceMachines: selectedMachinesList,
      rfidCards: selectedCardsList,
      notifications: selectedNotificationsList,
      coupon: appliedCoupon,
      pricing: {
        basePrice,
        storageTotal,
        machinesTotal,
        cardsTotal,
        notificationsTotal,
        subtotal,
        discountAmount,
        grandTotal,
      },
    };

    const basePayload = {
      planId: selectedPlan.id,
      school: {
        ...pendingSchool,
        phone_number: pendingCampus?.phone_number || pendingSchool?.phone_number || '',
        email: pendingCampus?.email || pendingSchool?.email || pendingAdmin?.email || '',
        website: pendingCampus?.website || '',
        address: pendingCampus?.address || '',
        city: pendingCampus?.city || '',
        state: pendingCampus?.state || '',
        country: pendingCampus?.country || '101',
        postal_code: pendingCampus?.postal_code || '',
        footer: pendingCampus?.footer || '',
      },
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
      couponCode: appliedCoupon?.code || null,
      configuration: configurationPayload,
    };

    try {
      setSubmitting(true);

      if (isSelectedTrial) {
        // Free 14-Day Evaluation Trial
        const payload = {
          ...basePayload,
          isTrial: true,
          amountPaid: 0,
          paymentGateway: 'free_trial',
          paymentTransactionId: `TRIAL_14DAYS_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
        };

        const res = await saasApi.registerSchool(payload);
        sessionStorage.removeItem('pending_registration_data');
        sessionStorage.removeItem('configured_subscription');
        toast.success(
          res?.message ||
            '🎉 School & Admin registered successfully! Your 14-Day Free Trial is now active.'
        );
        navigate('/account/login/adminlogin', {
          state: {
            registeredEmail: pendingAdmin.email,
            registrationSuccess: true,
          },
        });
      } else {
        // Paid Plan via Razorpay Checkout
        const isLoaded = await loadRazorpayScript();
        if (!isLoaded) {
          toast.error('Could not connect to Razorpay SDK. Please check your internet connection.');
          setSubmitting(false);
          return;
        }

        const orderRes = await saasApi.createOrder(selectedPlan.id);
        const orderData = orderRes?.data || orderRes;

        if (!orderData?.order_id) {
          throw new Error(orderRes?.message || 'Failed to initialize payment order with gateway.');
        }

        const options = {
          key: orderData.key_id,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: 'GrowVidya School ERP',
          description: `Setup & Annual License: ${selectedPlan.plan_name}`,
          order_id: orderData.order_id,
          prefill: {
            name: `${pendingAdmin.first_name} ${pendingAdmin.last_name || ''}`.trim(),
            email: pendingAdmin.email,
            contact: pendingAdmin.phone || pendingCampus?.phone_number || '',
          },
          notes: {
            school_name: pendingSchool.school_name,
            plan_id: selectedPlan.id,
          },
          theme: { color: '#6366f1' },
          handler: async function (response) {
            try {
              setSubmitting(true);
              const payload = {
                ...basePayload,
                isTrial: false,
                amountPaid: grandTotal,
                paymentGateway: 'razorpay',
                paymentTransactionId: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              };

              const res = await saasApi.registerSchool(payload);
              sessionStorage.removeItem('pending_registration_data');
              sessionStorage.removeItem('configured_subscription');
              toast.success(
                res?.message ||
                  '🎉 Payment verified & School registered! Your school portal is fully unlocked.'
              );
              navigate('/account/login/adminlogin', {
                state: {
                  registeredEmail: pendingAdmin.email,
                  registrationSuccess: true,
                },
              });
            } catch (err) {
              console.error('Registration after payment failed:', err);
              toast.error(
                err?.response?.data?.message || err.message || 'Registration failed after payment.'
              );
            } finally {
              setSubmitting(false);
            }
          },
          modal: {
            ondismiss: function () {
              setSubmitting(false);
              toast.info('Payment checkout window was closed.');
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (resp) {
          toast.error(`Payment declined: ${resp.error?.description || 'Transaction failed.'}`);
          setSubmitting(false);
        });
        rzp.open();
      }
    } catch (err) {
      console.error('Registration error:', err);
      toast.error(
        err.response?.data?.message ||
          err.message ||
          'Registration failed. Please review details and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const includedItems = useMemo(() => {
    if (!selectedPlan?.items) return [];
    return selectedPlan.items.filter((item) => item.item_type === 'included');
  }, [selectedPlan]);

  return (
    <div className="bg-light min-vh-100 d-flex flex-column">
      {/* Navbar */}
      <header className="navbar navbar-expand-lg navbar-light bg-white border-bottom shadow-sm px-3 px-md-5 py-2 py-md-3 w-100 sticky-top">
        <div className="container-fluid px-0 d-flex justify-content-between align-items-center">
          <Link to="/" className="navbar-brand d-flex align-items-center m-0 p-0 text-decoration-none">
            <img
              src={logoDark}
              alt="Growvidya Logo"
              style={{
                height: '56px',
                maxHeight: '60px',
                width: 'auto',
                objectFit: 'contain',
              }}
            />
          </Link>

          <div className="d-flex align-items-center gap-3">
            <Link to="/pricing" className="btn btn-outline-secondary btn-sm fw-semibold px-3 py-2">
              <i className="ti ti-arrow-left me-1"></i> Pricing Plans
            </Link>
            <Link to="/register" className="btn btn-primary btn-sm fw-semibold px-3 py-2 shadow-xs">
              <i className="ti ti-school me-1"></i> Register School
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow-1 py-4 py-md-5">
        <div className="container-fluid px-3 px-md-5" style={{ maxWidth: '1440px' }}>
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }}></div>
              <h5 className="fw-bold text-dark">Loading Configuration...</h5>
              <p className="text-muted">Fetching package details and add-on catalog...</p>
            </div>
          ) : !selectedPlan ? (
            <div className="text-center py-5 bg-white rounded-3 border shadow-sm p-5">
              <div className="avatar avatar-xl bg-warning-subtle text-warning rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" style={{ width: '64px', height: '64px' }}>
                <i className="ti ti-alert-triangle fs-28"></i>
              </div>
              <h3 className="fw-bold text-dark mb-2">No Subscription Plan Selected</h3>
              <p className="text-muted fs-14 mb-4" style={{ maxWidth: '480px', margin: '0 auto' }}>
                Please select a subscription package first from our pricing catalog before configuring hardware and services.
              </p>
              <Link to="/pricing" className="btn btn-primary px-4 py-2.5 fw-semibold shadow-sm">
                <i className="ti ti-arrow-left me-2"></i> View Pricing Plans
              </Link>
            </div>
          ) : (
            <div>
              {/* Breadcrumb & Navigation */}
              <div className="d-md-flex d-block align-items-center justify-content-between mb-4">
                <div>
                  <nav aria-label="breadcrumb">
                    <ol className="breadcrumb mb-1 fs-12">
                      <li className="breadcrumb-item">
                        <Link to="/" className="text-muted text-decoration-none">
                          Home
                        </Link>
                      </li>
                      <li className="breadcrumb-item">
                        <Link to="/pricing" className="text-muted text-decoration-none">
                          Pricing Plans
                        </Link>
                      </li>
                      <li className="breadcrumb-item active text-primary fw-semibold" aria-current="page">
                        Configure Plan: {selectedPlan.plan_name}
                      </li>
                    </ol>
                  </nav>
                  <h3 className="page-title mb-1 fw-bold text-dark">Configure Your Subscription</h3>
                  <p className="text-muted fs-13 mb-0">
                    Review your selected package, configure cloud storage, attendance machines, RFID cards, and notification volumes.
                  </p>
                </div>

                <div className="mt-3 mt-md-0">
                  <Link
                    to="/pricing"
                    className="btn btn-outline-secondary d-inline-flex align-items-center shadow-sm"
                  >
                    <i className="ti ti-arrow-left me-2 fs-16"></i>
                    <span>Change Plan</span>
                  </Link>
                </div>
              </div>

              {/* Attached Registration Banner (if user navigated from /register) */}
              {hasRegistrationData && (
                <div className="alert bg-white border border-primary-subtle shadow-xs rounded-3 p-3 mb-4 d-flex flex-wrap align-items-center justify-content-between gap-3">
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="rounded-circle bg-primary-subtle text-primary p-2 d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{ width: '42px', height: '42px' }}
                    >
                      <i className="ti ti-school fs-20"></i>
                    </div>
                    <div>
                      <div className="fw-bold text-dark fs-14 d-flex align-items-center gap-2">
                        <span>{pendingSchool.school_name}</span>
                        <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill fs-11">
                          <i className="ti ti-check me-1"></i> Registration Details Verified
                        </span>
                      </div>
                      <div className="text-muted fs-12 mt-0.5">
                        Super Admin: <strong>{pendingAdmin.first_name} {pendingAdmin.last_name || ''}</strong> ({pendingAdmin.email}) • Helpline: {pendingCampus?.phone_number || '-'}
                      </div>
                    </div>
                  </div>
                  <div>
                    <Link
                      to="/register"
                      state={{
                        step: 4,
                        school: pendingSchool,
                        campus: pendingCampus,
                        academicYear: pendingAcademicYear,
                        admin: pendingAdmin,
                        plan: selectedPlan,
                        billingCycle,
                      }}
                      className="btn btn-outline-secondary btn-sm fw-semibold d-inline-flex align-items-center"
                    >
                      <i className="ti ti-edit me-1.5"></i> Edit School Info
                    </Link>
                  </div>
                </div>
              )}

              {/* 3-Step Progress Indicator */}
              <div className="card border-0 shadow-sm rounded-3 mb-4 overflow-hidden">
                <div className="card-body p-3 bg-white">
                  {hasRegistrationData ? (
                    <div className="row align-items-center text-center g-2">
                      <div className="col-12 col-md-4">
                        <Link
                          to="/register"
                          state={{
                            step: 4,
                            school: pendingSchool,
                            campus: pendingCampus,
                            academicYear: pendingAcademicYear,
                            admin: pendingAdmin,
                            plan: selectedPlan,
                            billingCycle,
                          }}
                          className="d-flex align-items-center justify-content-center text-decoration-none text-success btn btn-link p-0 w-100"
                        >
                          <div
                            className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center me-2 flex-shrink-0"
                            style={{ width: '28px', height: '28px', fontSize: '13px' }}
                          >
                            <i className="ti ti-check"></i>
                          </div>
                          <div className="text-start">
                            <div className="fw-bold fs-12 text-success">STEP 1 (COMPLETED)</div>
                            <div className="fs-13 text-dark fw-semibold">School & Admin Details</div>
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
                            <div className="fs-13 text-dark fw-bold">Configure Subscription</div>
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
                            <div className="fs-13 text-secondary">
                              {isSelectedTrial ? 'Free Trial Activation' : 'Payment & Activation'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="row align-items-center text-center g-2">
                      <div className="col-12 col-md-4">
                        <Link
                          to="/pricing"
                          className="d-flex align-items-center justify-content-center text-decoration-none text-success btn btn-link p-0 w-100"
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
                            <div className="fs-13 text-dark fw-bold">Configure & Add-ons</div>
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
                            <div className="fs-13 text-secondary">School Registration & Activation</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Main Grid: Left Column (Configuration) + Right Column (Order Summary) */}
              <div className="row g-4">
                {/* Left Column: Plan Details, Storage, Machines, RFID Cards, Notifications */}
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
                        <div className="d-flex align-items-center gap-2">
                          <span className="badge bg-primary text-white fw-bold px-3 py-1 fs-11 rounded-pill text-uppercase">
                            {isSelectedTrial
                              ? '14-Day Free Evaluation'
                              : billingCycle === 'monthly'
                              ? 'Monthly Billing'
                              : 'Annual Billing'}
                          </span>
                        </div>
                        <Link
                          to="/pricing"
                          className="btn btn-sm btn-outline-light rounded-pill px-3 py-1 fs-11 d-inline-flex align-items-center text-decoration-none"
                        >
                          <i className="ti ti-switch-horizontal me-1"></i> Switch Plan
                        </Link>
                      </div>

                      <div className="d-md-flex align-items-center justify-content-between">
                        <div>
                          <h3 className="fw-bold text-white mb-1">{selectedPlan.plan_name}</h3>
                          <p className="text-white-50 fs-13 mb-0" style={{ maxWidth: '520px' }}>
                            {selectedPlan.description ||
                              'Enterprise-grade cloud school management platform with modules for academics, fees, routine, and records.'}
                          </p>
                        </div>
                        <div className="text-md-end mt-3 mt-md-0">
                          <div className="text-white-50 fs-11">Base Plan Price</div>
                          <div className="fs-28 fw-bold text-white">
                            ₹{basePrice.toLocaleString('en-IN')}
                            <span className="fs-13 fw-normal text-white-50">
                              {' '}
                              / {isSelectedTrial ? '14 days' : billingCycle === 'monthly' ? 'month' : 'year'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Capacity & Quotas Summary */}
                    <div className="card-body p-4 bg-white border-bottom">
                      <h6 className="fw-bold text-dark mb-3 d-flex align-items-center">
                        <i className="ti ti-chart-bar me-2 text-primary fs-18"></i>
                        Allocated Capacity & Quotas
                      </h6>
                      <div className="row g-3">
                        <div className="col-12 col-sm-4">
                          <div className="p-3 rounded-3 bg-light border">
                            <div className="text-muted fs-11 text-uppercase fw-semibold mb-1">
                              Student Capacity
                            </div>
                            <div className="fs-18 fw-bold text-dark">
                              {selectedPlan.max_students > 0
                                ? `${selectedPlan.max_students.toLocaleString()} Students`
                                : 'Unlimited Students'}
                            </div>
                            <span className="text-muted fs-11">Full profile & history</span>
                          </div>
                        </div>

                        <div className="col-12 col-sm-4">
                          <div className="p-3 rounded-3 bg-light border">
                            <div className="text-muted fs-11 text-uppercase fw-semibold mb-1">
                              Staff & Teachers
                            </div>
                            <div className="fs-18 fw-bold text-dark">
                              {selectedPlan.max_teachers > 0
                                ? `${selectedPlan.max_teachers.toLocaleString()} Staff`
                                : 'Unlimited Staff'}
                            </div>
                            <span className="text-muted fs-11">Role-based access</span>
                          </div>
                        </div>

                        <div className="col-12 col-sm-4">
                          <div className="p-3 rounded-3 bg-light border">
                            <div className="text-muted fs-11 text-uppercase fw-semibold mb-1">
                              Branch / Campuses
                            </div>
                            <div className="fs-18 fw-bold text-dark">
                              {selectedPlan.max_branches > 0
                                ? `${selectedPlan.max_branches} Campus`
                                : 'Single Campus'}
                            </div>
                            <span className="text-muted fs-11">Multi-branch ready</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Included Features List */}
                    {includedItems.length > 0 && (
                      <div className="card-body p-4 bg-white">
                        <h6 className="fw-bold text-dark mb-3 d-flex align-items-center">
                          <i className="ti ti-circle-check me-2 text-success fs-18"></i>
                          Included Modules in this Plan
                        </h6>
                        <div className="row g-2">
                          {includedItems.map((item) => (
                            <div className="col-12 col-sm-6" key={item.id}>
                              <div className="d-flex align-items-center p-2 rounded-2 bg-light border-0">
                                <i className="ti ti-check text-success me-2 fs-15 flex-shrink-0"></i>
                                <span className="fs-13 text-dark fw-medium text-truncate">
                                  {item.item_name}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card 2: Cloud Storage Add-on */}
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
                          <i className="ti ti-cloud fs-20"></i>
                        </div>
                        <div>
                          <div className="d-flex align-items-center gap-2 flex-wrap">
                            <h5 className="fw-bold text-dark mb-0 fs-16">Cloud Storage Expansion</h5>
                            {selectedStoragePlan && (
                              <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-0.5 fs-11 rounded-pill">
                                <i className="ti ti-check me-1"></i>
                                {selectedStoragePlan.storage_capacity >= 1024
                                  ? `${selectedStoragePlan.storage_capacity / 1024} TB`
                                  : `${selectedStoragePlan.storage_capacity} GB`}{' '}
                                (+₹{storagePriceUnit.toLocaleString('en-IN')})
                              </span>
                            )}
                          </div>
                          <p className="text-muted fs-12 mb-0 mt-0.5">
                            High-availability cloud backup storage for student archives, documents, and media.
                          </p>
                        </div>
                      </div>

                      <div className="d-flex align-items-center gap-2 ms-auto mt-2 mt-sm-0" onClick={(e) => e.stopPropagation()}>
                        {selectedStoragePlan && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger py-1 px-2.5 fs-11 rounded-pill"
                            onClick={handleClearStorage}
                          >
                            <i className="ti ti-x me-1"></i> Remove Storage
                          </button>
                        )}
                        <span className="badge bg-light text-secondary border px-2.5 py-1 fs-12">
                          {catalog.storage_plans.length} options available
                        </span>
                        <button
                          type="button"
                          className="btn btn-sm btn-light border rounded-circle d-flex align-items-center justify-content-center p-0"
                          style={{ width: '32px', height: '32px' }}
                          onClick={() => toggleSection('storage')}
                          title={collapsedSections.storage ? 'Expand section' : 'Collapse section'}
                        >
                          <i className={`ti ${collapsedSections.storage ? 'ti-chevron-down' : 'ti-chevron-up'} fs-16 text-secondary`}></i>
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
                            {catalog.storage_plans && catalog.storage_plans.length > 0 ? (
                              catalog.storage_plans.map((storage) => {
                                const isSelected = selectedStorageId === storage.id;
                                const price =
                                  billingCycle === 'monthly'
                                    ? parseFloat(storage.monthly_price)
                                    : parseFloat(storage.annual_price);

                                return (
                                  <div className="col-12 col-sm-6 col-md-4 col-xl-2" key={storage.id}>
                                    <div
                                      onClick={() => handleSelectStorage(storage.id)}
                                      className={`p-3 rounded-3 border text-center transition-all cursor-pointer h-100 d-flex flex-column justify-content-between position-relative ${
                                        isSelected
                                          ? 'border-2 border-primary bg-primary-subtle bg-opacity-10 shadow-sm'
                                          : 'border-200 bg-white hover-shadow'
                                      }`}
                                      style={{
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        minHeight: '145px',
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
                                          style={{ width: '40px', height: '40px' }}
                                        >
                                          <i className="ti ti-cloud fs-20"></i>
                                        </div>
                                        <div className="fw-bold text-dark fs-14 mb-1">
                                          {storage.storage_capacity >= 1024
                                            ? `${storage.storage_capacity / 1024} TB`
                                            : `${storage.storage_capacity} GB`}
                                        </div>
                                        <div className="text-muted fs-11 mb-2 text-truncate" title={storage.plan_name}>
                                          {storage.plan_name}
                                        </div>
                                      </div>
                                      <div>
                                        <div className="fs-13 fw-bold text-dark">
                                          +₹{price.toLocaleString('en-IN')}
                                        </div>
                                        <div className="text-muted fs-10">
                                          / {billingCycle === 'monthly' ? 'month' : 'year'}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="col-12 py-3 text-center text-muted fs-13">
                                No additional cloud storage expansion options found.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card 3: Attendance Machines */}
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
                            <h5 className="fw-bold text-dark mb-0 fs-16">Attendance Machines & Terminals</h5>
                            {selectedMachinesList.length > 0 && (
                              <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-0.5 fs-11 rounded-pill">
                                <i className="ti ti-check me-1"></i>
                                {selectedMachinesList.length}{' '}
                                {selectedMachinesList.length === 1 ? 'Machine' : 'Machines'} Selected (+₹
                                {machinesTotal.toLocaleString('en-IN')})
                              </span>
                            )}
                          </div>
                          <p className="text-muted fs-12 mb-0 mt-0.5">
                            Hardware biometric & RFID terminals delivered directly to your campus for real-time attendance.
                          </p>
                        </div>
                      </div>

                      <div className="d-flex align-items-center gap-2 ms-auto mt-2 mt-sm-0" onClick={(e) => e.stopPropagation()}>
                        {selectedMachinesList.length > 0 && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger py-1 px-2.5 fs-11 rounded-pill"
                            onClick={handleClearAllMachines}
                          >
                            <i className="ti ti-x me-1"></i> Clear Selection
                          </button>
                        )}
                        <span className="badge bg-light text-secondary border px-2.5 py-1 fs-12">
                          {catalog.attendance_machines.length} options available
                        </span>
                        <button
                          type="button"
                          className="btn btn-sm btn-light border rounded-circle d-flex align-items-center justify-content-center p-0"
                          style={{ width: '32px', height: '32px' }}
                          onClick={() => toggleSection('machines')}
                          title={collapsedSections.machines ? 'Expand section' : 'Collapse section'}
                        >
                          <i className={`ti ${collapsedSections.machines ? 'ti-chevron-down' : 'ti-chevron-up'} fs-16 text-secondary`}></i>
                        </button>
                      </div>
                    </div>

                    {!collapsedSections.machines && (
                      <div className="card-body p-4 bg-white">
                        {catalogLoading ? (
                          <div className="text-center py-3 text-muted">
                            <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                            Loading attendance machines...
                          </div>
                        ) : (
                          <div className="row g-3">
                            {catalog.attendance_machines && catalog.attendance_machines.length > 0 ? (
                              catalog.attendance_machines.map((machine) => {
                                const currentQty = selectedMachines[machine.id] || 0;
                                const isAdded = currentQty > 0;
                                const unitPrice = parseFloat(machine.unit_price || 0);

                                let typeMeta = {
                                  label: 'Biometric',
                                  badgeClass: 'bg-primary-subtle text-primary border-primary-subtle',
                                };

                                if (machine.machine_type === 'face_recognition') {
                                  typeMeta = {
                                    label: 'Face AI',
                                    badgeClass: 'bg-info-subtle text-info border-info-subtle',
                                  };
                                } else if (machine.machine_type === 'turnstile') {
                                  typeMeta = {
                                    label: 'Turnstile',
                                    badgeClass: 'bg-danger-subtle text-danger border-danger-subtle',
                                  };
                                } else if (machine.machine_type === 'rfid_card') {
                                  typeMeta = {
                                    label: 'RFID Card',
                                    badgeClass: 'bg-success-subtle text-success border-success-subtle',
                                  };
                                } else if (machine.machine_type === 'hybrid') {
                                  typeMeta = {
                                    label: 'Face + Fingerprint',
                                    badgeClass: 'bg-warning-subtle text-warning border-warning-subtle',
                                  };
                                }

                                return (
                                  <div className="col-12 col-md-6 col-xl-4" key={machine.id}>
                                    <div
                                      className={`card h-100 rounded-3 border transition-all ${
                                        isAdded
                                          ? 'border-primary border-2 shadow-sm'
                                          : 'border-200 hover-shadow'
                                      }`}
                                      style={{
                                        overflow: 'hidden',
                                        transition: 'all 0.2s ease',
                                        backgroundColor: isAdded ? '#fbfcfe' : '#ffffff',
                                      }}
                                    >
                                      <div
                                        className="w-100 bg-light border-bottom d-flex align-items-center justify-content-center overflow-hidden position-relative p-2"
                                        style={{ height: '170px' }}
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
                                        <span
                                          className={`badge border fs-10 px-2 py-0.5 rounded-pill position-absolute ${typeMeta.badgeClass}`}
                                          style={{ top: '10px', left: '10px' }}
                                        >
                                          {typeMeta.label}
                                        </span>
                                        {isAdded && (
                                          <span
                                            className="badge bg-primary text-white position-absolute shadow-sm"
                                            style={{ top: '10px', right: '10px', fontSize: '11px', borderRadius: '12px' }}
                                          >
                                            <i className="ti ti-check me-0.5"></i> Selected ({currentQty})
                                          </span>
                                        )}
                                      </div>

                                      <div className="card-body p-3 d-flex flex-column justify-content-between">
                                        <div>
                                          <h6
                                            className="fw-bold text-dark mb-1 fs-14"
                                            style={{
                                              display: '-webkit-box',
                                              WebkitLineClamp: 2,
                                              WebkitBoxOrient: 'vertical',
                                              overflow: 'hidden',
                                              minHeight: '38px',
                                              lineHeight: '1.35',
                                            }}
                                            title={machine.machine_name}
                                          >
                                            {machine.machine_name}
                                          </h6>

                                          <div className="d-flex align-items-center gap-1.5 mb-2 flex-wrap">
                                            <span className="badge bg-light text-secondary border fs-10 px-1.5 py-0.5 rounded">
                                              Model: {machine.model_number || 'N/A'}
                                            </span>
                                          </div>

                                          <div className="bg-light rounded-2 p-2 mb-3 fs-11 text-secondary">
                                            <div className="d-flex align-items-center justify-content-between mb-1">
                                              <span className="text-muted">
                                                <i className="ti ti-users fs-12 me-1"></i>User Capacity:
                                              </span>
                                              <span className="text-dark fw-semibold">
                                                {machine.capacity_users ? `${machine.capacity_users.toLocaleString()} Users` : 'N/A'}
                                              </span>
                                            </div>
                                            <div className="d-flex align-items-center justify-content-between mb-1">
                                              <span className="text-muted">
                                                <i className="ti ti-fingerprint fs-12 me-1"></i>Logs Capacity:
                                              </span>
                                              <span className="text-dark fw-semibold">
                                                {machine.capacity_logs ? `${machine.capacity_logs.toLocaleString()} Logs` : 'N/A'}
                                              </span>
                                            </div>
                                          </div>

                                          <div className="d-flex align-items-baseline justify-content-between mb-2">
                                            <div>
                                              <span className="fs-18 fw-bold text-dark">
                                                ₹{unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                              </span>
                                              <span className="text-muted fs-11 ms-1">/ unit</span>
                                            </div>
                                            {isAdded && (
                                              <div className="text-end">
                                                <span className="badge bg-primary-subtle text-primary border border-primary-subtle fs-11 fw-bold">
                                                  Total: ₹{(unitPrice * currentQty).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        <div className="d-flex align-items-center justify-content-between mt-auto pt-2 border-top gap-2">
                                          <div className="d-flex align-items-center gap-1.5">
                                            <button
                                              type="button"
                                              className={`btn btn-sm ${isAdded ? 'btn-success' : 'btn-primary'} px-3 py-1.5 fw-semibold d-inline-flex align-items-center`}
                                              onClick={() => !isAdded && handleAddMachine(machine)}
                                              style={isAdded ? { cursor: 'default' } : undefined}
                                            >
                                              {isAdded ? (
                                                <>
                                                  <i className="ti ti-check me-1"></i> Added
                                                </>
                                              ) : (
                                                <>
                                                  <i className="ti ti-plus me-1"></i> Add
                                                </>
                                              )}
                                            </button>
                                            {isAdded && (
                                              <button
                                                type="button"
                                                className="btn btn-sm btn-outline-danger px-2 py-1.5"
                                                title="Remove machine from selection"
                                                onClick={() => handleRemoveMachine(machine.id)}
                                              >
                                                <i className="ti ti-trash fs-12"></i>
                                              </button>
                                            )}
                                          </div>

                                          <div className="d-flex align-items-center gap-1.5">
                                            <button
                                              type="button"
                                              className="btn btn-sm btn-outline-secondary px-2 py-1.5 fw-bold"
                                              style={{ minWidth: '30px' }}
                                              title="Decrease quantity"
                                              onClick={() => isAdded && handleDecreaseMachineQty(machine)}
                                              disabled={!isAdded}
                                            >
                                              -
                                            </button>
                                            <span
                                              className={`badge ${isAdded ? 'bg-light text-dark' : 'bg-light text-muted'} border px-2 py-1.5 fs-12 fw-bold`}
                                              style={{ minWidth: '32px', textAlign: 'center' }}
                                              title={`Selected quantity: ${currentQty}`}
                                            >
                                              {currentQty}
                                            </span>
                                            <button
                                              type="button"
                                              className={`btn btn-sm ${isAdded ? 'btn-primary' : 'btn-outline-secondary'} px-2 py-1.5 fw-bold`}
                                              style={{ minWidth: '30px' }}
                                              onClick={() => isAdded && handleIncreaseMachineQty(machine)}
                                              disabled={!isAdded}
                                              title={isAdded ? 'Increase quantity' : "Click 'Add' to add product first"}
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
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card 4: Smart RFID Cards */}
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
                            <h5 className="fw-bold text-dark mb-0 fs-16">Smart RFID Cards &amp; Tags</h5>
                            {selectedCardsList.length > 0 && (
                              <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-0.5 fs-11 rounded-pill">
                                <i className="ti ti-check me-1"></i>
                                {selectedCardsList.length}{' '}
                                {selectedCardsList.length === 1 ? 'Card type' : 'Card types'} Selected (+₹
                                {cardsTotal.toLocaleString('en-IN')})
                              </span>
                            )}
                          </div>
                          <p className="text-muted fs-12 mb-0 mt-0.5">
                            Pre-programmed RFID student identification smart cards &amp; keyfobs for gate scanning.
                          </p>
                        </div>
                      </div>

                      <div className="d-flex align-items-center gap-2 ms-auto mt-2 mt-sm-0" onClick={(e) => e.stopPropagation()}>
                        {selectedCardsList.length > 0 && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger py-1 px-2.5 fs-11 rounded-pill"
                            onClick={handleClearAllCards}
                          >
                            <i className="ti ti-x me-1"></i> Clear Cards
                          </button>
                        )}
                        <span className="badge bg-light text-secondary border px-2.5 py-1 fs-12">
                          {catalog.rfid_cards.length} options available
                        </span>
                        <button
                          type="button"
                          className="btn btn-sm btn-light border rounded-circle d-flex align-items-center justify-content-center p-0"
                          style={{ width: '32px', height: '32px' }}
                          onClick={() => toggleSection('cards')}
                          title={collapsedSections.cards ? 'Expand section' : 'Collapse section'}
                        >
                          <i className={`ti ${collapsedSections.cards ? 'ti-chevron-down' : 'ti-chevron-up'} fs-16 text-secondary`}></i>
                        </button>
                      </div>
                    </div>

                    {!collapsedSections.cards && (
                      <div className="card-body p-4 bg-white">
                        {catalogLoading ? (
                          <div className="text-center py-3 text-muted">
                            <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                            Loading RFID card options...
                          </div>
                        ) : (
                          <div className="row g-3">
                            {catalog.rfid_cards && catalog.rfid_cards.length > 0 ? (
                              catalog.rfid_cards.map((card) => {
                                const currentQty = selectedCards[card.id] || 0;
                                const isAdded = currentQty > 0;
                                const unitPrice = parseFloat(card.unit_price || 0);

                                let typeMeta = {
                                  label: 'Standard Card',
                                  badgeClass: 'bg-primary-subtle text-primary border-primary-subtle',
                                };

                                if (card.card_type === 'keyfob') {
                                  typeMeta = {
                                    label: 'Smart Keyfob',
                                    badgeClass: 'bg-warning-subtle text-warning border-warning-subtle',
                                  };
                                } else if (card.card_type === 'wristband') {
                                  typeMeta = {
                                    label: 'Wristband',
                                    badgeClass: 'bg-info-subtle text-info border-info-subtle',
                                  };
                                } else if (card.card_type === 'nfc_sticker' || card.card_type === 'sticker') {
                                  typeMeta = {
                                    label: 'NFC Sticker',
                                    badgeClass: 'bg-secondary-subtle text-dark border',
                                  };
                                } else if (card.card_type === 'thin_pvc_card') {
                                  typeMeta = {
                                    label: 'Thin PVC Card',
                                    badgeClass: 'bg-success-subtle text-success border-success-subtle',
                                  };
                                } else if (card.card_type === 'clamshell_card') {
                                  typeMeta = {
                                    label: 'Clamshell Card',
                                    badgeClass: 'bg-secondary-subtle text-secondary border',
                                  };
                                }

                                const minQty = card.min_order_qty || 1;

                                return (
                                  <div className="col-12 col-md-6 col-xl-4" key={card.id}>
                                    <div
                                      className={`card h-100 rounded-3 border transition-all ${
                                        isAdded
                                          ? 'border-primary border-2 shadow-sm'
                                          : 'border-200 hover-shadow'
                                      }`}
                                      style={{
                                        overflow: 'hidden',
                                        transition: 'all 0.2s ease',
                                        backgroundColor: isAdded ? '#fbfcfe' : '#ffffff',
                                      }}
                                    >
                                      <div
                                        className="w-100 bg-light border-bottom d-flex align-items-center justify-content-center overflow-hidden position-relative p-2"
                                        style={{ height: '170px' }}
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
                                          className={`badge border fs-10 px-2 py-0.5 rounded-pill position-absolute ${typeMeta.badgeClass}`}
                                          style={{ top: '10px', left: '10px' }}
                                        >
                                          {typeMeta.label}
                                        </span>
                                        {isAdded && (
                                          <span
                                            className="badge bg-primary text-white position-absolute shadow-sm"
                                            style={{ top: '10px', right: '10px', fontSize: '11px', borderRadius: '12px' }}
                                          >
                                            <i className="ti ti-check me-0.5"></i> Selected ({currentQty})
                                          </span>
                                        )}
                                      </div>

                                      <div className="card-body p-3 d-flex flex-column justify-content-between">
                                        <div>
                                          <h6
                                            className="fw-bold text-dark mb-1 fs-14"
                                            style={{
                                              display: '-webkit-box',
                                              WebkitLineClamp: 2,
                                              WebkitBoxOrient: 'vertical',
                                              overflow: 'hidden',
                                              minHeight: '38px',
                                              lineHeight: '1.35',
                                            }}
                                            title={card.card_name}
                                          >
                                            {card.card_name}
                                          </h6>

                                          <div className="d-flex align-items-center gap-1.5 mb-2 flex-wrap">
                                            <span className="badge bg-light text-secondary border fs-10 px-1.5 py-0.5 rounded">
                                              SKU: {card.card_code}
                                            </span>
                                            <span className="badge bg-light text-muted border fs-10 px-1.5 py-0.5 rounded">
                                              Custom Encrypted
                                            </span>
                                          </div>

                                          <div className="bg-light rounded-2 p-2 mb-3 fs-11 text-secondary">
                                            <div className="d-flex align-items-center justify-content-between mb-1">
                                              <span className="text-muted">
                                                <i className="ti ti-wifi fs-12 me-1"></i>Frequency:
                                              </span>
                                              <span className="text-dark fw-semibold text-truncate ms-1" style={{ maxWidth: '140px' }}>
                                                {card.frequency || '13.56 MHz'}
                                              </span>
                                            </div>
                                            <div className="d-flex align-items-center justify-content-between mb-1">
                                              <span className="text-muted">
                                                <i className="ti ti-scan fs-12 me-1"></i>Read Range:
                                              </span>
                                              <span className="text-dark fw-semibold text-truncate ms-1" style={{ maxWidth: '140px' }}>
                                                {card.read_range || 'Up to 5 cm'}
                                              </span>
                                            </div>
                                          </div>

                                          <div className="d-flex align-items-baseline justify-content-between mb-2">
                                            <div>
                                              <span className="fs-18 fw-bold text-dark">
                                                ₹{unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                              </span>
                                              <span className="text-muted fs-11 ms-1">/ card</span>
                                            </div>
                                            {isAdded && (
                                              <div className="text-end">
                                                <span className="badge bg-primary-subtle text-primary border border-primary-subtle fs-11 fw-bold">
                                                  Total: ₹{(unitPrice * currentQty).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        <div className="d-flex align-items-center justify-content-between mt-auto pt-2 border-top gap-2">
                                          <div className="d-flex align-items-center gap-1.5">
                                            <button
                                              type="button"
                                              className={`btn btn-sm ${isAdded ? 'btn-success' : 'btn-primary'} px-3 py-1.5 fw-semibold d-inline-flex align-items-center`}
                                              onClick={() => !isAdded && handleAddCard(card)}
                                              style={isAdded ? { cursor: 'default' } : undefined}
                                            >
                                              {isAdded ? (
                                                <>
                                                  <i className="ti ti-check me-1"></i> Added
                                                </>
                                              ) : (
                                                <>
                                                  <i className="ti ti-plus me-1"></i> Add
                                                </>
                                              )}
                                            </button>
                                            {isAdded && (
                                              <button
                                                type="button"
                                                className="btn btn-sm btn-outline-danger px-2 py-1.5"
                                                title="Remove card from selection"
                                                onClick={() => handleRemoveCard(card.id)}
                                              >
                                                <i className="ti ti-trash fs-12"></i>
                                              </button>
                                            )}
                                          </div>

                                          <div className="d-flex align-items-center gap-1.5">
                                            <button
                                              type="button"
                                              className="btn btn-sm btn-outline-secondary px-2 py-1.5 fw-bold"
                                              style={{ minWidth: '30px' }}
                                              title="Decrease quantity"
                                              onClick={() => isAdded && handleDecreaseCardQty(card)}
                                              disabled={!isAdded}
                                            >
                                              -
                                            </button>
                                            <span
                                              className={`badge ${isAdded ? 'bg-light text-dark' : 'bg-light text-muted'} border px-2 py-1.5 fs-12 fw-bold`}
                                              style={{ minWidth: '32px', textAlign: 'center' }}
                                              title={`Selected quantity: ${currentQty}`}
                                            >
                                              {currentQty}
                                            </span>
                                            <button
                                              type="button"
                                              className={`btn btn-sm ${isAdded ? 'btn-primary' : 'btn-outline-primary'} px-2 py-1.5 fw-bold`}
                                              style={{ minWidth: '30px' }}
                                              onClick={() => (isAdded ? handleIncreaseCardQty(card) : handleAddCard(card))}
                                              title={isAdded ? 'Increase quantity' : "Click to select card"}
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
                                No RFID card options found.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card 5: SMS & Push Notifications */}
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
                            <h5 className="fw-bold text-dark mb-0 fs-16">SMS &amp; Push Notifications</h5>
                            {selectedNotificationsList.length > 0 && (
                              <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-0.5 fs-11 rounded-pill">
                                <i className="ti ti-check me-1"></i>
                                {selectedNotificationsList.length} {selectedNotificationsList.length > 1 ? 'types' : 'type'} configured (+₹{notificationsTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })})
                              </span>
                            )}
                          </div>
                          <p className="text-muted fs-12 mb-0 mt-0.5">
                            Select and configure allocated SMS and Push Notification volumes for your school.
                          </p>
                        </div>
                      </div>

                      <div className="d-flex align-items-center gap-2 ms-auto mt-2 mt-sm-0" onClick={(e) => e.stopPropagation()}>
                        {selectedNotificationsList.length > 0 && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger py-1 px-2.5 fs-11 rounded-pill"
                            onClick={() => setSelectedNotifications({})}
                          >
                            <i className="ti ti-x me-1"></i> Clear Notifications
                          </button>
                        )}
                        <span className="badge bg-light text-primary border px-2.5 py-1 fs-12 fw-semibold">
                          Pay Per Sent Rate
                        </span>
                        <button
                          type="button"
                          className="btn btn-sm btn-light border rounded-circle d-flex align-items-center justify-content-center p-0"
                          style={{ width: '32px', height: '32px' }}
                          onClick={() => toggleSection('notifications')}
                          title={collapsedSections.notifications ? 'Expand section' : 'Collapse section'}
                        >
                          <i className={`ti ${collapsedSections.notifications ? 'ti-chevron-down' : 'ti-chevron-up'} fs-16 text-secondary`}></i>
                        </button>
                      </div>
                    </div>

                    {!collapsedSections.notifications && (
                      <div className="card-body p-4 bg-white">
                        {catalogLoading ? (
                          <div className="text-center py-4 text-muted">
                            <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                            Loading notification master records...
                          </div>
                        ) : catalog.notification_records && catalog.notification_records.length > 0 ? (
                          <div className="row g-4">
                            {catalog.notification_records.map((record) => {
                              const isSms = String(record.type).toLowerCase() === 'sms';
                              const unitRate = parseFloat(record.cost || 0);
                              const cfg = selectedNotifications[record.id] || { selected: false, quantity: 0 };
                              const isSelected = Boolean(cfg.selected && cfg.quantity > 0);
                              const currentQty = parseInt(cfg.quantity, 10) || 0;
                              const recordTotalPrice = Math.round(unitRate * currentQty * 100) / 100;

                              return (
                                <div className="col-12 col-lg-6" key={record.id}>
                                  <div
                                    className={`card h-100 rounded-3 border transition-all ${
                                      isSelected
                                        ? 'border-primary border-2 shadow-sm'
                                        : 'border-200 hover-shadow'
                                    }`}
                                    style={{
                                      backgroundColor: isSelected ? '#fbfcfe' : '#ffffff',
                                      transition: 'all 0.2s ease',
                                    }}
                                  >
                                    <div className="card-body p-3 p-md-4 d-flex flex-column justify-content-between">
                                      <div>
                                        {/* Top Header: Icon, Service Name, and Unit Rate */}
                                        <div className="d-flex align-items-center justify-content-between mb-3 pb-2.5 border-bottom">
                                          <div className="d-flex align-items-center gap-2.5">
                                            <div
                                              className={`avatar avatar-md rounded-3 d-flex align-items-center justify-content-center flex-shrink-0 ${
                                                isSms ? 'bg-success-subtle text-success' : 'bg-info-subtle text-info'
                                              }`}
                                              style={{ width: '42px', height: '42px' }}
                                            >
                                              <i className={`ti ${isSms ? 'ti-message-dots' : 'ti-bell-ringing'} fs-22`}></i>
                                            </div>
                                            <div>
                                              <h6 className="fw-bold text-dark mb-0 fs-15 text-capitalize">
                                                {isSms ? 'SMS Notification Gateway' : 'Mobile Push Notifications'}
                                              </h6>
                                              <span className="badge bg-light text-secondary border fs-10 px-2 py-0.5 rounded-pill mt-1">
                                                {isSms ? 'Transactional & OTP SMS' : 'In-App Mobile Broadcasts'}
                                              </span>
                                            </div>
                                          </div>

                                          <div className="text-end">
                                            <div className="fs-18 fw-bold text-dark">
                                              ₹{unitRate.toFixed(2)}
                                            </div>
                                            <div className="text-muted fs-11">
                                              / {isSms ? 'credit' : 'dispatch'}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Feature / Capabilities Specification Box */}
                                        <div className="bg-light rounded-2 p-2.5 mb-3 fs-11 text-secondary border border-light-subtle">
                                          <div className="d-flex align-items-center justify-content-between mb-1.5">
                                            <span className="text-muted">
                                              <i className="ti ti-broadcast fs-12 me-1.5 text-primary"></i>Channel:
                                            </span>
                                            <span className="text-dark fw-semibold">
                                              {isSms ? 'Telecom SMS Gateway (DLT Approved)' : 'Android & iOS School Mobile App'}
                                            </span>
                                          </div>
                                          <div className="d-flex align-items-center justify-content-between">
                                            <span className="text-muted">
                                              <i className="ti ti-target-arrow fs-12 me-1.5 text-primary"></i>Coverage:
                                            </span>
                                            <span className="text-dark fw-semibold text-truncate ms-1" style={{ maxWidth: '200px' }} title={isSms ? 'Attendance, Fees Alerts, Marks & OTPs' : 'Daily Homework, Circulars & Notices'}>
                                              {isSms ? 'Attendance, Fees Alerts, Marks & OTPs' : 'Daily Homework, Circulars & Notices'}
                                            </span>
                                          </div>
                                        </div>

                                        {/* Price & Allocation Summary Line */}
                                        <div className="d-flex align-items-baseline justify-content-between mb-2">
                                          <div>
                                            <span className="text-muted fs-11">Allocation: </span>
                                            {isSelected ? (
                                              <span className="badge bg-success-subtle text-success border border-success-subtle fs-11 fw-bold">
                                                Active ({currentQty.toLocaleString('en-IN')} units)
                                              </span>
                                            ) : (
                                              <span className="badge bg-light text-muted border fs-11">
                                                Not Added
                                              </span>
                                            )}
                                          </div>
                                          {isSelected && (
                                            <div className="text-end">
                                              <span className="badge bg-primary-subtle text-primary border border-primary-subtle fs-12 fw-bold">
                                                Total: ₹{recordTotalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Action Row: Add / Added button on Left, Stepper on Right */}
                                      <div className="d-flex align-items-center justify-content-between mt-auto pt-2.5 border-top gap-2">
                                        <div className="d-flex align-items-center gap-1.5">
                                          <button
                                            type="button"
                                            className={`btn btn-sm ${isSelected ? 'btn-success' : 'btn-primary'} px-3 py-1.5 fw-semibold d-inline-flex align-items-center`}
                                            onClick={() => !isSelected && handleToggleNotification(record.id, 1)}
                                            style={isSelected ? { cursor: 'default' } : undefined}
                                          >
                                            {isSelected ? (
                                              <>
                                                <i className="ti ti-check me-1"></i> Added
                                              </>
                                            ) : (
                                              <>
                                                <i className="ti ti-plus me-1"></i> Add
                                              </>
                                            )}
                                          </button>
                                          {isSelected && (
                                            <button
                                              type="button"
                                              className="btn btn-sm btn-outline-danger px-2 py-1.5"
                                              title="Remove notification allocation"
                                              onClick={() => handleToggleNotification(record.id, 0)}
                                            >
                                              <i className="ti ti-trash fs-12"></i>
                                            </button>
                                          )}
                                        </div>

                                        <div className="d-flex align-items-center gap-1.5">
                                          <button
                                            type="button"
                                            className="btn btn-sm btn-outline-secondary px-2 py-1 fw-bold"
                                            style={{ minWidth: '30px', height: '30px' }}
                                            title="Decrease quantity by 1"
                                            onClick={() => isSelected && handleDecreaseNotificationQty(record.id, 1)}
                                            disabled={!isSelected}
                                          >
                                            -
                                          </button>
                                          <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            className={`form-control form-control-sm text-center fw-bold fs-12 px-1 ${
                                              isSelected ? 'bg-white text-dark' : 'bg-light text-muted'
                                            }`}
                                            style={{ width: '85px', height: '30px' }}
                                            value={isSelected ? currentQty : 0}
                                            disabled={!isSelected}
                                            onChange={(e) => handleSetNotificationQty(record.id, e.target.value)}
                                          />
                                          <button
                                            type="button"
                                            className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline-secondary'} px-2 py-1 fw-bold`}
                                            style={{ minWidth: '30px', height: '30px' }}
                                            title={isSelected ? 'Increase quantity by 1' : "Click 'Add' to add to subscription"}
                                            onClick={() => {
                                              if (!isSelected) {
                                                handleToggleNotification(record.id, 1);
                                              } else {
                                                handleIncreaseNotificationQty(record.id, 1);
                                              }
                                            }}
                                          >
                                            +
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="col-12 py-4 text-center text-muted fs-13">
                            <i className="ti ti-info-circle me-1"></i>
                            No notification records found in <code>notification_master</code>.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Sticky Comprehensive Order Summary */}
                <div className="col-12 col-lg-4">
                  <div className="card border-0 shadow-sm rounded-3 sticky-subscription-summary-public">
                    <div className="card-header bg-white border-bottom p-3 p-md-4 flex-shrink-0">
                      <div className="d-flex align-items-center justify-content-between">
                        <h5 className="fw-bold text-dark mb-0 fs-16 d-flex align-items-center">
                          <i className="ti ti-file-invoice me-2 text-primary fs-18"></i>
                          Order Summary
                        </h5>
                        <span className="badge bg-light text-primary border px-2 py-1 fs-11 text-uppercase fw-semibold">
                          {isSelectedTrial ? '14-Day Free Trial' : `${billingCycle} Plan`}
                        </span>
                      </div>
                    </div>

                    <div className="card-body p-3 p-md-4 bg-white overflow-auto flex-grow-1">
                      {/* Base Plan Item */}
                      <div className="d-flex align-items-start justify-content-between mb-3 pb-3 border-bottom">
                        <div>
                          <div className="fw-bold text-dark fs-14">{selectedPlan.plan_name}</div>
                          <span className="text-muted fs-11 d-block">
                            {isSelectedTrial
                              ? '14-Day Evaluation Access'
                              : billingCycle === 'monthly'
                              ? 'Monthly Base Subscription'
                              : 'Annual Base Subscription'}
                          </span>
                          <span className="badge bg-light text-secondary border fs-10 mt-1">
                            {selectedPlan.max_students > 0
                              ? `Up to ${selectedPlan.max_students} students`
                              : 'Unlimited students'}
                          </span>
                        </div>
                        <div className="text-end">
                          <strong className="fs-14 text-dark">
                            ₹{basePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </strong>
                          <span className="text-muted fs-11 d-block">
                            / {isSelectedTrial ? '14 days' : billingCycle === 'monthly' ? 'mo' : 'yr'}
                          </span>
                        </div>
                      </div>

                      {/* Configured Hardware & Add-on Line Items */}
                      <div className="mb-3">
                        <div className="text-muted fs-11 fw-semibold text-uppercase mb-2">
                          Configured Add-ons & Hardware
                        </div>

                        {/* Storage Add-on Line Item */}
                        {selectedStoragePlan ? (
                          <div className="d-flex align-items-center justify-content-between mb-2 fs-12">
                            <div className="text-truncate me-2">
                              <i className="ti ti-cloud text-primary me-1"></i>
                              <span className="text-dark fw-medium">
                                {selectedStoragePlan.storage_capacity >= 1024
                                  ? `${selectedStoragePlan.storage_capacity / 1024} TB`
                                  : `${selectedStoragePlan.storage_capacity} GB`}{' '}
                                Storage
                              </span>
                            </div>
                            <span className="text-dark fw-semibold flex-shrink-0">
                              +₹{storageTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        ) : null}

                        {/* Attendance Machines Line Items */}
                        {selectedMachinesList.length > 0 &&
                          selectedMachinesList.map((m) => (
                            <div
                              key={m.id}
                              className="d-flex align-items-center justify-content-between mb-2 fs-12"
                            >
                              <div className="text-truncate me-2">
                                <i className="ti ti-device-watch text-primary me-1"></i>
                                <span className="text-dark fw-medium">{m.machine_name}</span>
                                <span className="text-muted fs-11 ms-1">× {m.quantity}</span>
                              </div>
                              <span className="text-dark fw-semibold flex-shrink-0">
                                +₹{m.totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          ))}

                        {/* RFID Cards Line Items */}
                        {selectedCardsList.length > 0 &&
                          selectedCardsList.map((c) => (
                            <div
                              key={c.id}
                              className="d-flex align-items-center justify-content-between mb-2 fs-12"
                            >
                              <div className="text-truncate me-2">
                                <i className="ti ti-id text-primary me-1"></i>
                                <span className="text-dark fw-medium">{c.card_name}</span>
                                <span className="text-muted fs-11 ms-1">× {c.quantity}</span>
                              </div>
                              <span className="text-dark fw-semibold flex-shrink-0">
                                +₹{c.totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          ))}

                        {/* Notifications Line Items */}
                        {selectedNotificationsList.length > 0 &&
                          selectedNotificationsList.map((n) => (
                            <div
                              key={n.id}
                              className="d-flex align-items-center justify-content-between mb-2 fs-12"
                            >
                              <div className="text-truncate me-2">
                                <i className="ti ti-bell-ringing text-success me-1"></i>
                                <span className="text-dark fw-medium text-capitalize">{n.type} Notification</span>
                                <span className="text-muted fs-11 ms-1">× {n.quantity.toLocaleString('en-IN')}</span>
                              </div>
                              <span className="text-dark fw-semibold flex-shrink-0">
                                +₹{n.totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          ))}

                        {!selectedStoragePlan &&
                          selectedMachinesList.length === 0 &&
                          selectedCardsList.length === 0 &&
                          selectedNotificationsList.length === 0 && (
                            <div className="text-muted fs-12 fst-italic py-1">
                              No optional add-ons or hardware selected yet.
                            </div>
                          )}
                      </div>

                      {/* Coupon Code Section */}
                      <div className="border-top pt-3">
                        <label className="form-label fs-12 fw-semibold text-dark mb-1">
                          Have a Promotional Coupon?
                        </label>
                        {!appliedCoupon ? (
                          <div>
                            <form onSubmit={handleApplyCoupon} className="input-group">
                              <input
                                type="text"
                                className="form-control form-control-sm text-uppercase"
                                placeholder="Enter code (e.g. WELCOME10)"
                                value={couponCodeInput}
                                onChange={(e) => {
                                  setCouponCodeInput(e.target.value.toUpperCase());
                                  if (couponError) setCouponError(null);
                                }}
                                disabled={isValidatingCoupon}
                              />
                              <button
                                type="submit"
                                className="btn btn-primary fw-semibold px-3 d-inline-flex align-items-center"
                                disabled={isValidatingCoupon || !couponCodeInput.trim()}
                              >
                                {isValidatingCoupon ? (
                                  <>
                                    <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                                    Applying...
                                  </>
                                ) : (
                                  'Apply'
                                )}
                              </button>
                            </form>
                            {couponError && (
                              <div className="text-danger fs-11 mt-1 d-flex align-items-center">
                                <i className="ti ti-alert-circle me-1 flex-shrink-0"></i>
                                <span>{couponError}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="bg-success-subtle border border-success-subtle rounded-2 p-2 d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center gap-1.5 overflow-hidden">
                              <i className="ti ti-circle-check text-success fs-16 flex-shrink-0"></i>
                              <div className="text-truncate">
                                <strong className="text-success fs-12 d-block text-truncate">
                                  {appliedCoupon.code} Applied
                                </strong>
                                <span className="text-muted fs-11">
                                  {appliedCoupon.discountType === 'percentage'
                                    ? `${appliedCoupon.discountValue}% OFF`
                                    : `Flat ₹${parseFloat(appliedCoupon.discountValue).toLocaleString('en-IN')} OFF`}
                                  {' '}(Saved ₹{discountAmount.toLocaleString('en-IN')})
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="btn btn-sm btn-link text-danger text-decoration-none p-0 ms-2 fw-semibold fs-11"
                              onClick={handleRemoveCoupon}
                              title="Remove coupon"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Subtotal & Taxes */}
                      <div className="border-top pt-3 mt-3">
                        <div className="d-flex align-items-center justify-content-between mb-1 fs-13 text-secondary">
                          <span>Subtotal</span>
                          <span className="fw-semibold text-dark">₹{subtotal.toLocaleString('en-IN')}</span>
                        </div>
                        {appliedCoupon && discountAmount > 0 && (
                          <div className="d-flex align-items-center justify-content-between mb-1 fs-13 text-success">
                            <span className="d-flex align-items-center">
                              <i className="ti ti-tag me-1"></i> Coupon Discount ({appliedCoupon.code})
                            </span>
                            <span className="fw-bold">-₹{discountAmount.toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        <div className="d-flex align-items-center justify-content-between fs-13 text-secondary">
                          <span>GST / Tax</span>
                          <span className="text-success fw-semibold">Inclusive</span>
                        </div>
                      </div>
                    </div>

                    {/* Fixed Summary Footer: Grand Total & Primary Action Button */}
                    <div className="card-footer bg-white border-top p-3 p-md-4 flex-shrink-0">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <div>
                          <span className="fs-11 text-muted d-block text-uppercase fw-semibold">Grand Total Due</span>
                          <strong className="fs-22 fw-bold text-dark">₹{grandTotal.toLocaleString('en-IN')}</strong>
                        </div>
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2.5 py-1 fs-11 rounded-pill text-capitalize">
                          {isSelectedTrial ? '14-Day Trial' : billingCycle}
                        </span>
                      </div>
                      <div className="text-muted fs-11 mb-3">
                        {isSelectedTrial
                          ? 'Zero charges during trial. Instant access with full school portal features.'
                          : 'Institutional subscriptions include free setup support and rapid onboarding.'}
                      </div>

                      {/* Primary CTA Button: Setup School Portal or Proceed to Registration */}
                      <div>
                        <button
                          type="button"
                          className="btn btn-primary w-100 py-2.5 py-md-3 fw-bold fs-14 d-inline-flex align-items-center justify-content-center shadow-sm"
                          disabled={submitting}
                          onClick={hasRegistrationData ? handleCompleteRegistrationWithConfig : handleProceedToRegistration}
                        >
                          {submitting ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                              <span>Setting Up School Portal...</span>
                            </>
                          ) : hasRegistrationData ? (
                            <>
                              {isSelectedTrial ? (
                                <>
                                  <i className="ti ti-gift me-2 fs-18"></i>
                                  <span>Activate 14-Day Free Trial & Setup Portal</span>
                                </>
                              ) : (
                                <>
                                  <i className="ti ti-credit-card me-2 fs-18"></i>
                                  <span>Pay ₹{grandTotal.toLocaleString('en-IN')} & Complete Setup</span>
                                </>
                              )}
                            </>
                          ) : (
                            <>
                              <i className="ti ti-school me-2 fs-18"></i>
                              <span>
                                {isSelectedTrial
                                  ? 'Start 14-Day Free Trial - Register School'
                                  : 'Proceed to School Registration'}
                              </span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="text-center mt-2">
                        <Link
                          to="/pricing"
                          className="btn btn-link btn-sm text-muted text-decoration-none fs-12 p-0"
                        >
                          <i className="ti ti-arrow-left me-1"></i> Back to Pricing Plans
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-top py-3 text-center text-muted fs-13 mt-auto w-100">
        <div className="container">
          Copyright &copy; 2026 Growvidya School Management. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default SubscriptionConfigurePublic;
