import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { useSubscription } from '../../../context/SubscriptionContext';
import { loadRazorpayScript } from '../../../utils/loadRazorpay';
import {
  createSubscriptionOrder,
  verifySubscriptionPayment,
  upgradeSubscription,
  getConfigurationCatalog,
} from '../../../api/subscription.api';
import { resolveImageUrl } from '../../../utils/url.util';

const SubscriptionConfigure = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth || {});
  const { subscription, upgradePlans, refreshSubscription } = useSubscription();

  // Retrieve selected plan and billing cycle from location state, fallback to sessionStorage
  const [selectedPlan, setSelectedPlan] = useState(() => {
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

  const [billingCycle, setBillingCycle] = useState(() => {
    if (location.state?.billingCycle) {
      return location.state.billingCycle;
    }
    return sessionStorage.getItem('selected_billing_cycle') || 'annual';
  });

  // If selectedPlan was not passed in state, try resolving from upgradePlans
  useEffect(() => {
    if (!selectedPlan && upgradePlans && upgradePlans.length > 0) {
      const matched =
        upgradePlans.find((p) => p.billing_cycle === billingCycle) || upgradePlans[0];
      if (matched) {
        setSelectedPlan(matched);
        sessionStorage.setItem('selected_subscription_plan', JSON.stringify(matched));
      }
    }
  }, [selectedPlan, upgradePlans, billingCycle]);

  // Catalog data from storage_master, attendance_machine_master, rfid_card_master, and bank_account_master
  const [catalog, setCatalog] = useState({
    storage_plans: [],
    attendance_machines: [],
    rfid_cards: [],
    bank_accounts: [],
  });
  const [catalogLoading, setCatalogLoading] = useState(true);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        setCatalogLoading(true);
        const data = await getConfigurationCatalog();
        if (data) {
          setCatalog({
            storage_plans: data.storage_plans || [],
            attendance_machines: data.attendance_machines || [],
            rfid_cards: data.rfid_cards || [],
            bank_accounts: data.bank_accounts || [],
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

  // Bank Account Selection state (bank_account_master - managed by Super Admin)
  const [selectedBankAccountId, setSelectedBankAccountId] = useState(null);

  useEffect(() => {
    if (catalog.bank_accounts && catalog.bank_accounts.length > 0) {
      if (
        !selectedBankAccountId ||
        !catalog.bank_accounts.some((acc) => Number(acc.id) === Number(selectedBankAccountId))
      ) {
        const defaultAcc =
          catalog.bank_accounts.find((acc) => Number(acc.is_default) === 1) || catalog.bank_accounts[0];
        setSelectedBankAccountId(defaultAcc.id);
      }
    } else {
      setSelectedBankAccountId(null);
    }
  }, [catalog.bank_accounts, selectedBankAccountId]);

  const activeBankAccount = useMemo(() => {
    if (!catalog.bank_accounts || catalog.bank_accounts.length === 0) return null;
    return (
      catalog.bank_accounts.find((acc) => Number(acc.id) === Number(selectedBankAccountId)) ||
      catalog.bank_accounts[0]
    );
  }, [catalog.bank_accounts, selectedBankAccountId]);

  // 1. Storage Selection state (storage_master - single select only)
  const [selectedStorageId, setSelectedStorageId] = useState(null);

  // 2. Attendance Machine Selection state (attendance_machine_master - single select only)
  const [selectedMachineId, setSelectedMachineId] = useState(null);
  const [machineQty, setMachineQty] = useState(1);

  // 3. RFID Card Selection state (rfid_card_master - single select only)
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [cardQty, setCardQty] = useState(50);

  // 4. Feature Addons state (subscription_items): array of item IDs
  const [selectedAddonIds, setSelectedAddonIds] = useState([]);

  // Collapsible sections state: Cloud Storage, Attendance Machines, RFID Cards
  const [collapsedSections, setCollapsedSections] = useState({
    storage: true,
    machines: true,
    cards: true,
  });

  const toggleSection = (sectionKey) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  // Payment state
  const [paymentGateway, setPaymentGateway] = useState('razorpay');
  const [utrNumber, setUtrNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Available add-ons and included items for the selected subscription plan
  const availableAddons = useMemo(() => {
    if (!selectedPlan?.items) return [];
    return selectedPlan.items.filter((item) => item.item_type === 'addon');
  }, [selectedPlan]);

  const includedItems = useMemo(() => {
    if (!selectedPlan?.items) return [];
    return selectedPlan.items.filter((item) => item.item_type === 'included');
  }, [selectedPlan]);

  // Handlers for Storage Selection (single select only, toggle off on re-click)
  const handleSelectStorage = (storageId) => {
    setSelectedStorageId((prev) => (prev === storageId ? null : storageId));
  };

  // Handlers for Attendance Machines Selection (single select only, toggle off on re-click)
  const handleSelectMachine = (machineId) => {
    if (selectedMachineId === machineId) {
      setSelectedMachineId(null);
      setMachineQty(1);
    } else {
      setSelectedMachineId(machineId);
      setMachineQty(1);
    }
  };

  const handleMachineQtyChange = (delta) => {
    setMachineQty((prev) => Math.max(1, prev + delta));
  };

  const handleMachineQtyDirectInput = (val) => {
    const parsed = parseInt(val, 10);
    setMachineQty(isNaN(parsed) || parsed < 1 ? 1 : parsed);
  };

  // Handlers for RFID Cards Selection (single select only, toggle off on re-click)
  const handleSelectCard = (card) => {
    if (Number(selectedCardId) === Number(card.id)) {
      setSelectedCardId(null);
      setCardQty(card.min_order_qty || 50);
    } else {
      setSelectedCardId(card.id);
      setCardQty(card.min_order_qty || 50);
    }
  };

  const handleCardQtyChange = (delta, minOrder = 1) => {
    setCardQty((prev) => Math.max(minOrder, prev + delta));
  };

  const handleCardQtyDirectInput = (val, minOrder = 1) => {
    const parsed = parseInt(val, 10);
    setCardQty(isNaN(parsed) || parsed < minOrder ? minOrder : parsed);
  };

  // Handlers for Module Add-ons
  const handleToggleAddon = (addonId) => {
    setSelectedAddonIds((prev) =>
      prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]
    );
  };

  // Pricing Calculations
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

  // Machines pricing (single select only)
  const selectedMachine = useMemo(() => {
    if (!selectedMachineId) return null;
    return catalog.attendance_machines.find((m) => m.id === Number(selectedMachineId)) || null;
  }, [selectedMachineId, catalog.attendance_machines]);

  const selectedMachinesList = useMemo(() => {
    if (!selectedMachine) return [];
    const unitPrice = parseFloat(selectedMachine.unit_price || 0);
    return [
      {
        ...selectedMachine,
        quantity: machineQty,
        unitPrice,
        totalPrice: unitPrice * machineQty,
      },
    ];
  }, [selectedMachine, machineQty]);

  const machinesTotal = useMemo(() => {
    if (!selectedMachine) return 0;
    return parseFloat(selectedMachine.unit_price || 0) * machineQty;
  }, [selectedMachine, machineQty]);

  // RFID Cards pricing (single select only)
  const selectedCard = useMemo(() => {
    if (!selectedCardId) return null;
    return catalog.rfid_cards.find((c) => c.id === Number(selectedCardId)) || null;
  }, [selectedCardId, catalog.rfid_cards]);

  const selectedCardsList = useMemo(() => {
    if (!selectedCard) return [];
    const unitPrice = parseFloat(selectedCard.unit_price || 0);
    return [
      {
        ...selectedCard,
        quantity: cardQty,
        unitPrice,
        totalPrice: unitPrice * cardQty,
      },
    ];
  }, [selectedCard, cardQty]);

  const cardsTotal = useMemo(() => {
    if (!selectedCard) return 0;
    return parseFloat(selectedCard.unit_price || 0) * cardQty;
  }, [selectedCard, cardQty]);

  // Module Addons pricing
  const addonsTotal = useMemo(() => {
    return availableAddons
      .filter((addon) => selectedAddonIds.includes(addon.id))
      .reduce((sum, addon) => sum + parseFloat(addon.price || 0), 0);
  }, [availableAddons, selectedAddonIds]);

  // Grand Total Calculation
  const grandTotal = basePrice + storageTotal + machinesTotal + cardsTotal + addonsTotal;

  const isCurrentPlan = Boolean(
    selectedPlan && subscription?.plan_id && Number(selectedPlan.id) === Number(subscription.plan_id)
  );

  // Handle Checkout / Payment Execution
  const handleProceedPayment = async () => {
    if (!selectedPlan) {
      toast.error('No subscription plan selected. Please choose a plan first.');
      navigate('/admin/subscription');
      return;
    }

    try {
      setIsProcessing(true);

      const orderPayload = {
        plan_id: selectedPlan.id,
        addon_ids: selectedAddonIds,
        storage_plan_id: selectedStorageId,
        storage_qty: selectedStorageId ? 1 : 0,
        selected_machines: selectedMachinesList.map((m) => ({
          id: Number(m.id),
          quantity: Number(m.quantity),
        })),
        selected_cards: selectedCardsList.map((c) => ({
          id: Number(c.id),
          quantity: Number(c.quantity),
        })),
        amount_paid: grandTotal,
      };

      if (paymentGateway === 'razorpay') {
        // 1. Ensure Razorpay Checkout script is loaded
        const isLoaded = await loadRazorpayScript();
        if (!isLoaded) {
          toast.error('Could not connect to Razorpay SDK. Please check your internet connection.');
          setIsProcessing(false);
          return;
        }

        // 2. Create order on backend (passing all items and verified quantities)
        const orderRes = await createSubscriptionOrder(orderPayload);
        const orderData = orderRes?.data || orderRes;

        if (!orderData?.order_id) {
          throw new Error(orderRes?.message || 'Failed to initialize payment order with gateway.');
        }

        // 3. Configure and trigger Razorpay Checkout modal
        const options = {
          key: orderData.key_id,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: 'GrowVidya School ERP',
          description: `${isCurrentPlan ? 'License Renewal' : 'Subscription'}: ${selectedPlan.plan_name} (${billingCycle})`,
          order_id: orderData.order_id,
          prefill: {
            name: user?.name || user?.schoolName || user?.school_name || 'School Administrator',
            email: user?.email || '',
            contact: user?.phone || user?.mobile || '',
          },
          notes: {
            school_id: user?.schoolId || user?.school_id || '',
            plan_id: selectedPlan.id,
            billing_cycle: billingCycle,
          },
          theme: {
            color: '#4f46e5',
          },
          handler: async function (response) {
            try {
              setIsProcessing(true);
              const verifyRes = await verifySubscriptionPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                ...orderPayload,
              });

              toast.success(
                verifyRes?.message ||
                  `🎉 Congratulations! Your school has been upgraded to ${selectedPlan.plan_name}. All features and hardware allocations are active!`
              );

              // Clear session storage selections
              sessionStorage.removeItem('selected_subscription_plan');
              sessionStorage.removeItem('selected_billing_cycle');

              if (refreshSubscription) await refreshSubscription();
              navigate('/admin/subscription');
            } catch (err) {
              console.error('Payment verification failed:', err);
              toast.error(
                err?.response?.data?.message || err?.message || 'Payment verification failed. Please contact support.'
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
        rzp.on('payment.failed', function (resp) {
          console.error('Razorpay payment failed:', resp.error);
          toast.error(`Payment failed: ${resp.error?.description || 'Transaction was declined.'}`);
          setIsProcessing(false);
        });

        rzp.open();
      } else {
        // Direct bank transfer / offline payment request
        if (!catalog.bank_accounts || catalog.bank_accounts.length === 0) {
          toast.error('No bank accounts have been configured by the Super Admin yet. Please use Instant Online Checkout or contact support.');
          setIsProcessing(false);
          return;
        }

        if (!utrNumber || String(utrNumber).trim().length < 4) {
          toast.error('Please enter the Bank Transfer reference or UTR number from your payment receipt.');
          setIsProcessing(false);
          return;
        }

        const res = await upgradeSubscription({
          plan_id: selectedPlan.id,
          amount_paid: grandTotal,
          payment_gateway: 'bank_transfer',
          payment_transaction_id: String(utrNumber).trim(),
        });

        toast.info(
          res?.message ||
            `Offline payment request submitted for ${selectedPlan.plan_name}. Platform administrators will verify and activate your license within 24 hours.`
        );

        sessionStorage.removeItem('selected_subscription_plan');
        sessionStorage.removeItem('selected_billing_cycle');

        if (refreshSubscription) await refreshSubscription();
        navigate('/admin/subscription');
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      toast.error(err?.response?.data?.message || err?.message || 'Failed to complete order. Please try again.');
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
            Please select a monthly or annual subscription tier before proceeding to the configuration step.
          </p>
          <Link to="/admin/subscription" className="btn btn-primary px-4 py-2 fw-semibold">
            <i className="ti ti-arrow-left me-2"></i> Browse Subscription Plans
          </Link>
        </div>
      </div>
    );
  }

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
                  Subscription & Billing
                </Link>
              </li>
              <li className="breadcrumb-item active text-primary fw-semibold" aria-current="page">
                Configure Plan
              </li>
            </ol>
          </nav>
          <h3 className="page-title mb-1 fw-bold text-dark">Configure Your Subscription</h3>
          <p className="text-muted fs-13 mb-0">
            Review your selected package, configure cloud storage, attendance machines, and RFID card options.
          </p>
        </div>

        <div className="mt-3 mt-md-0">
          <Link
            to="/admin/subscription"
            className="btn btn-outline-secondary d-inline-flex align-items-center shadow-sm"
          >
            <i className="ti ti-arrow-left me-2 fs-16"></i>
            <span>Change Plan</span>
          </Link>
        </div>
      </div>

      {/* 2-Step Progress Indicator */}
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
                  <div className="fs-13 text-secondary">Instant Activation</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Column (Configuration) + Right Column (Order Summary) */}
      <div className="row g-4">
        {/* Left Column: Plan Details, Storage, Machines, RFID Cards, Modules */}
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
                    {billingCycle === 'monthly' ? 'Monthly Billing' : 'Annual Billing'}
                  </span>
                  {isCurrentPlan && (
                    <span className="badge bg-warning text-dark fw-bold px-3 py-1 fs-11 rounded-pill">
                      ★ Current Plan
                    </span>
                  )}
                </div>
                <Link
                  to="/admin/subscription"
                  className="btn btn-sm btn-outline-light rounded-pill px-3 py-1 fs-11 d-inline-flex align-items-center"
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
                      / {billingCycle === 'monthly' ? 'month' : 'year'}
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
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <span className="text-muted fs-11 fw-semibold text-uppercase">Students</span>
                      <i className="ti ti-school fs-16 text-primary"></i>
                    </div>
                    <div className="fs-16 fw-bold text-dark">
                      {selectedPlan.max_students > 0
                        ? `${Number(selectedPlan.max_students).toLocaleString()} Students`
                        : 'Unlimited Students'}
                    </div>
                  </div>
                </div>

                <div className="col-12 col-sm-4">
                  <div className="p-3 rounded-3 bg-light border">
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <span className="text-muted fs-11 fw-semibold text-uppercase">Staff & Teachers</span>
                      <i className="ti ti-users fs-16 text-success"></i>
                    </div>
                    <div className="fs-16 fw-bold text-dark">
                      {selectedPlan.max_teachers > 0
                        ? `${Number(selectedPlan.max_teachers).toLocaleString()} Staff`
                        : 'Unlimited Staff'}
                    </div>
                  </div>
                </div>

                <div className="col-12 col-sm-4">
                  <div className="p-3 rounded-3 bg-light border">
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <span className="text-muted fs-11 fw-semibold text-uppercase">Database & Cloud</span>
                      <i className="ti ti-cloud-check fs-16 text-info"></i>
                    </div>
                    <div className="fs-16 fw-bold text-dark">Included & Backed Up</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Included Features List */}
            <div className="card-body p-4 bg-white">
              <h6 className="fw-bold text-dark mb-3 d-flex align-items-center">
                <i className="ti ti-circle-check me-2 text-success fs-18"></i>
                Included Package Features
              </h6>
              <div className="row g-2">
                {includedItems.length > 0 ? (
                  includedItems.map((item) => (
                    <div className="col-12 col-sm-6" key={item.id}>
                      <div className="d-flex align-items-center p-2 rounded-2 bg-light border-0">
                        <i className="ti ti-check text-success fs-16 me-2 flex-shrink-0"></i>
                        <span className="fs-13 text-secondary">
                          <strong className="text-dark">{item.item_name}</strong>
                          {item.quota_limit && (
                            <span className="text-muted fs-11 ms-1">
                              ({Number(item.quota_limit).toLocaleString()} {item.unit || 'units'})
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-12">
                    <span className="text-muted fs-13 py-1 d-block">
                      Core package features for this tier are standard and active.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Cloud Storage Plans (from storage_master) - Small Cards, Single Select, Collapsible */}
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
                    <h5 className="fw-bold text-dark mb-0 fs-16">
                      Cloud Storage Expansion
                    </h5>
                    {selectedStoragePlan && (
                      <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-0.5 fs-11 rounded-pill">
                        <i className="ti ti-check me-1"></i>
                        {selectedStoragePlan.plan_name} (+₹{storageTotal.toLocaleString('en-IN')})
                      </span>
                    )}
                  </div>
                  <p className="text-muted fs-12 mb-0 mt-0.5">
                    Choose one storage option to expand your school cloud capacity.
                  </p>
                </div>
              </div>

              <div className="d-flex align-items-center gap-2 ms-auto mt-2 mt-sm-0" onClick={(e) => e.stopPropagation()}>
                {selectedStoragePlan && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger py-1 px-2.5 fs-11 rounded-pill"
                    onClick={() => handleSelectStorage(selectedStorageId)}
                  >
                    <i className="ti ti-x me-1"></i> Clear Storage
                  </button>
                )}
                <span className="badge bg-light text-primary border px-2.5 py-1 fs-12 fw-semibold">
                  {billingCycle === 'monthly' ? 'Monthly Pricing' : 'Annual Pricing'}
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
                    {/* Options from storage_master */}
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

          {/* Card 3: Attendance Machines (from attendance_machine_master) - Small Cards, Single Select, Collapsible */}
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
                    selectedMachine ? 'bg-primary text-white' : 'bg-light text-primary'
                  }`}
                  style={{ width: '40px', height: '40px' }}
                >
                  <i className="ti ti-device-watch fs-20"></i>
                </div>
                <div>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <h5 className="fw-bold text-dark mb-0 fs-16">
                      Attendance Machines & Terminals
                    </h5>
                    {selectedMachine && (
                      <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-0.5 fs-11 rounded-pill">
                        <i className="ti ti-check me-1"></i>
                        {selectedMachine.machine_name} {machineQty > 1 ? `x${machineQty}` : ''} (+₹{machinesTotal.toLocaleString('en-IN')})
                      </span>
                    )}
                  </div>
                  <p className="text-muted fs-12 mb-0 mt-0.5">
                    Choose one attendance machine terminal for your institution (optional).
                  </p>
                </div>
              </div>

              <div className="d-flex align-items-center gap-2 ms-auto mt-2 mt-sm-0" onClick={(e) => e.stopPropagation()}>
                {selectedMachineId && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger py-1 px-2.5 fs-11 rounded-pill"
                    onClick={() => handleSelectMachine(selectedMachineId)}
                  >
                    <i className="ti ti-x me-1"></i> Deselect Machine
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
                      const isSelected = Number(selectedMachineId) === Number(machine.id);
                      const unitPrice = parseFloat(machine.unit_price || 0);

                      let typeMeta = {
                        label: 'Biometric',
                        icon: 'ti-fingerprint',
                        badgeClass: 'bg-primary-subtle text-primary border-primary-subtle',
                        avatarBg: 'bg-primary-subtle text-primary',
                      };

                      if (machine.machine_type === 'face_recognition') {
                        typeMeta = {
                          label: 'Face AI',
                          icon: 'ti-scan',
                          badgeClass: 'bg-info-subtle text-info border-info-subtle',
                          avatarBg: 'bg-info-subtle text-info',
                        };
                      } else if (machine.machine_type === 'turnstile') {
                        typeMeta = {
                          label: 'Turnstile',
                          icon: 'ti-barrier',
                          badgeClass: 'bg-danger-subtle text-danger border-danger-subtle',
                          avatarBg: 'bg-danger-subtle text-danger',
                        };
                      } else if (machine.machine_type === 'rfid_card') {
                        typeMeta = {
                          label: 'RFID Card',
                          icon: 'ti-id',
                          badgeClass: 'bg-success-subtle text-success border-success-subtle',
                          avatarBg: 'bg-success-subtle text-success',
                        };
                      } else if (machine.machine_type === 'hybrid') {
                        typeMeta = {
                          label: 'Face + Fingerprint',
                          icon: 'ti-device-watch',
                          badgeClass: 'bg-warning-subtle text-warning border-warning-subtle',
                          avatarBg: 'bg-warning-subtle text-warning',
                        };
                      }

                      return (
                        <div className="col-12 col-sm-6 col-xl-4" key={machine.id}>
                          <div
                            onClick={() => handleSelectMachine(machine.id)}
                            className={`p-3 rounded-3 border transition-all cursor-pointer h-100 d-flex flex-column justify-content-between position-relative ${
                              isSelected
                                ? 'border-2 border-primary bg-primary-subtle bg-opacity-10 shadow-sm'
                                : 'border-200 bg-white hover-shadow'
                            }`}
                            style={{
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              minHeight: '220px',
                            }}
                          >
                            {/* Selected Badge */}
                            {isSelected && (
                              <span
                                className="badge bg-primary text-white position-absolute shadow-sm"
                                style={{ top: '-8px', right: '10px', fontSize: '10px', borderRadius: '10px' }}
                              >
                                <i className="ti ti-check me-0.5"></i> Selected
                              </span>
                            )}

                            <div>
                              {/* Top Row: Device Icon / Image & Type Badge + Radio indicator */}
                              <div className="d-flex align-items-center justify-content-between mb-2">
                                {machine.machine_image ? (
                                  <div
                                    className="border rounded-2 p-1 bg-white d-flex align-items-center justify-content-center overflow-hidden flex-shrink-0"
                                    style={{ width: '42px', height: '42px' }}
                                  >
                                    <img
                                      src={resolveImageUrl(machine.machine_image)}
                                      alt={machine.machine_name}
                                      className="img-fluid rounded-1"
                                      style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        if (e.currentTarget.nextElementSibling) {
                                          e.currentTarget.nextElementSibling.style.display = 'flex';
                                        }
                                      }}
                                    />
                                    <div
                                      className={`avatar avatar-md rounded-circle align-items-center justify-content-center ${
                                        isSelected ? 'bg-primary text-white' : typeMeta.avatarBg
                                      }`}
                                      style={{ width: '38px', height: '38px', display: 'none' }}
                                    >
                                      <i className={`ti ${typeMeta.icon} fs-18`}></i>
                                    </div>
                                  </div>
                                ) : (
                                  <div
                                    className={`avatar avatar-md rounded-circle d-flex align-items-center justify-content-center ${
                                      isSelected ? 'bg-primary text-white' : typeMeta.avatarBg
                                    }`}
                                    style={{ width: '38px', height: '38px', transition: 'all 0.2s ease' }}
                                  >
                                    <i className={`ti ${typeMeta.icon} fs-18`}></i>
                                  </div>
                                )}

                                <div className="d-flex align-items-center gap-2">
                                  <span className={`badge border fs-10 px-2 py-0.5 rounded-pill ${typeMeta.badgeClass}`}>
                                    {typeMeta.label}
                                  </span>
                                  {/* Radio indicator */}
                                  <div
                                    className={`rounded-circle d-flex align-items-center justify-content-center border ${
                                      isSelected
                                        ? 'bg-primary border-primary text-white'
                                        : 'border-secondary-subtle bg-light text-transparent'
                                    }`}
                                    style={{ width: '18px', height: '18px', fontSize: '10px' }}
                                  >
                                    {isSelected && <i className="ti ti-check"></i>}
                                  </div>
                                </div>
                              </div>

                              {/* Machine Name */}
                              <h6
                                className="fw-bold text-dark mb-1 fs-13 line-clamp-2"
                                style={{
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  minHeight: '34px',
                                  lineHeight: '1.3',
                                }}
                                title={machine.machine_name}
                              >
                                {machine.machine_name}
                              </h6>

                              {/* Brand & Model SKU */}
                              <div className="d-flex align-items-center gap-1.5 mb-2">
                                <span className="badge bg-light text-secondary border fs-10 px-1.5 py-0.5 rounded">
                                  {machine.brand}
                                </span>
                                <span className="text-muted fs-11 text-truncate" title={machine.model_number}>
                                  {machine.model_number}
                                </span>
                              </div>

                              {/* Specs Details */}
                              <div className="bg-light rounded-2 p-2 mb-2 fs-11 text-secondary">
                                <div className="d-flex align-items-center justify-content-between mb-1">
                                  <span className="text-muted">Capacity:</span>
                                  <strong className="text-dark">
                                    {machine.user_capacity ? `${Number(machine.user_capacity).toLocaleString()} users` : 'Standard'}
                                  </strong>
                                </div>
                                <div className="d-flex align-items-center justify-content-between">
                                  <span className="text-muted">Network:</span>
                                  <span className="text-dark text-truncate ms-1" style={{ maxWidth: '105px' }} title={machine.connectivity}>
                                    {machine.connectivity || 'Wi-Fi / LAN'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Pricing & Stepper */}
                            <div className="border-top pt-2 mt-auto">
                              <div className="d-flex align-items-baseline justify-content-between">
                                <span className="text-muted fs-11">Hardware:</span>
                                <div className="text-end">
                                  <span className="fs-15 fw-bold text-dark">
                                    ₹{unitPrice.toLocaleString('en-IN')}
                                  </span>
                                  <span className="text-muted fs-10 d-block">per unit</span>
                                </div>
                              </div>

                              {/* Stepper when selected */}
                              {isSelected && (
                                <div
                                  className="d-flex align-items-center justify-content-between mt-2 pt-2 border-top"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <span className="text-muted fs-11 fw-semibold">Quantity:</span>
                                  <div className="input-group input-group-sm" style={{ width: '96px' }}>
                                    <button
                                      type="button"
                                      className="btn btn-outline-secondary px-2 py-0 fw-bold"
                                      onClick={() => handleMachineQtyChange(-1)}
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      className="form-control text-center px-1 py-0 fw-bold fs-12"
                                      min="1"
                                      value={machineQty}
                                      onChange={(e) => handleMachineQtyDirectInput(e.target.value)}
                                    />
                                    <button
                                      type="button"
                                      className="btn btn-outline-secondary px-2 py-0 fw-bold"
                                      onClick={() => handleMachineQtyChange(1)}
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              )}
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

          {/* Card 4: RFID Cards & Smart Tags (from rfid_card_master) - Small Cards, Single Select, Collapsible */}
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
                    selectedCard ? 'bg-primary text-white' : 'bg-light text-primary'
                  }`}
                  style={{ width: '40px', height: '40px' }}
                >
                  <i className="ti ti-id fs-20"></i>
                </div>
                <div>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <h5 className="fw-bold text-dark mb-0 fs-16">
                      Smart RFID Cards & Badges
                    </h5>
                    {selectedCard && (
                      <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-0.5 fs-11 rounded-pill">
                        <i className="ti ti-check me-1"></i>
                        {selectedCard.card_name} ({cardQty} pcs, +₹{cardsTotal.toLocaleString('en-IN')})
                      </span>
                    )}
                  </div>
                  <p className="text-muted fs-12 mb-0 mt-0.5">
                    Choose one RFID card or smart badge option for your institution (optional).
                  </p>
                </div>
              </div>

              <div className="d-flex align-items-center gap-2 ms-auto mt-2 mt-sm-0" onClick={(e) => e.stopPropagation()}>
                {selectedCardId && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger py-1 px-2.5 fs-11 rounded-pill"
                    onClick={() => handleSelectCard(selectedCard)}
                  >
                    <i className="ti ti-x me-1"></i> Deselect Card
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
                        const isSelected = Number(selectedCardId) === Number(card.id);
                        const unitPrice = parseFloat(card.unit_price || 0);

                        let typeMeta = {
                          label: 'Standard Card',
                          icon: 'ti-id',
                          badgeClass: 'bg-primary-subtle text-primary border-primary-subtle',
                          avatarBg: 'bg-primary-subtle text-primary',
                        };

                        if (card.card_type === 'keyfob') {
                          typeMeta = {
                            label: 'Smart Keyfob',
                            icon: 'ti-tag',
                            badgeClass: 'bg-warning-subtle text-warning border-warning-subtle',
                            avatarBg: 'bg-warning-subtle text-warning',
                          };
                        } else if (card.card_type === 'wristband') {
                          typeMeta = {
                            label: 'Wristband',
                            icon: 'ti-device-watch',
                            badgeClass: 'bg-info-subtle text-info border-info-subtle',
                            avatarBg: 'bg-info-subtle text-info',
                          };
                        } else if (card.card_type === 'nfc_sticker') {
                          typeMeta = {
                            label: 'NFC Sticker',
                            icon: 'ti-scan',
                            badgeClass: 'bg-secondary-subtle text-dark border',
                            avatarBg: 'bg-light text-primary',
                          };
                        } else if (card.card_type === 'thin_pvc_card') {
                          typeMeta = {
                            label: 'Thin PVC Card',
                            icon: 'ti-id',
                            badgeClass: 'bg-success-subtle text-success border-success-subtle',
                            avatarBg: 'bg-success-subtle text-success',
                          };
                        } else if (card.card_type === 'clamshell_card') {
                          typeMeta = {
                            label: 'Clamshell Card',
                            icon: 'ti-id-badge',
                            badgeClass: 'bg-secondary-subtle text-secondary border',
                            avatarBg: 'bg-secondary-subtle text-secondary',
                          };
                        }

                        const minQty = card.min_order_qty || 50;
                        const presets = [minQty, minQty * 2, minQty * 5, 500];

                        return (
                          <div className="col-12 col-sm-6 col-xl-4" key={card.id}>
                            <div
                              onClick={() => handleSelectCard(card)}
                              className={`p-3 rounded-3 border transition-all cursor-pointer h-100 d-flex flex-column justify-content-between position-relative ${
                                isSelected
                                  ? 'border-2 border-primary bg-primary-subtle bg-opacity-10 shadow-sm'
                                  : 'border-200 bg-white hover-shadow'
                              }`}
                              style={{
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                minHeight: '220px',
                              }}
                            >
                              {/* Selected Badge */}
                              {isSelected && (
                                <span
                                  className="badge bg-primary text-white position-absolute shadow-sm"
                                  style={{ top: '-8px', right: '10px', fontSize: '10px', borderRadius: '10px' }}
                                >
                                  <i className="ti ti-check me-0.5"></i> Selected
                                </span>
                              )}

                              <div>
                                {/* Top Row: Icon, Type Badge & Radio indicator */}
                                <div className="d-flex align-items-center justify-content-between mb-2">
                                  <div
                                    className={`avatar avatar-md rounded-circle d-flex align-items-center justify-content-center ${
                                      isSelected ? 'bg-primary text-white' : typeMeta.avatarBg
                                    }`}
                                    style={{ width: '38px', height: '38px', transition: 'all 0.2s ease' }}
                                  >
                                    <i className={`ti ${typeMeta.icon} fs-18`}></i>
                                  </div>

                                  <div className="d-flex align-items-center gap-2">
                                    <span className={`badge border fs-10 px-2 py-0.5 rounded-pill ${typeMeta.badgeClass}`}>
                                      {typeMeta.label}
                                    </span>
                                    {/* Radio indicator */}
                                    <div
                                      className={`rounded-circle d-flex align-items-center justify-content-center border ${
                                        isSelected
                                          ? 'bg-primary border-primary text-white'
                                          : 'border-secondary-subtle bg-light text-transparent'
                                      }`}
                                      style={{ width: '18px', height: '18px', fontSize: '10px' }}
                                    >
                                      {isSelected && <i className="ti ti-check"></i>}
                                    </div>
                                  </div>
                                </div>

                                {/* Card Name */}
                                <h6
                                  className="fw-bold text-dark mb-1 fs-13 line-clamp-2"
                                  style={{
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    minHeight: '34px',
                                    lineHeight: '1.3',
                                  }}
                                  title={card.card_name}
                                >
                                  {card.card_name}
                                </h6>

                                {/* SKU Code & Min Order */}
                                <div className="d-flex align-items-center gap-1.5 mb-2">
                                  <span className="badge bg-light text-secondary border fs-10 px-1.5 py-0.5 rounded">
                                    {card.card_code}
                                  </span>
                                  <span className="text-muted fs-11">
                                    Min: {minQty} pcs
                                  </span>
                                </div>

                                {/* Compact Specs Box */}
                                <div className="bg-light rounded-2 p-2 mb-2 fs-11 text-secondary">
                                  <div className="d-flex align-items-center justify-content-between mb-1">
                                    <span className="text-muted">Frequency:</span>
                                    <strong className="text-dark">{card.frequency || '125 KHz'}</strong>
                                  </div>
                                  <div className="d-flex align-items-center justify-content-between">
                                    <span className="text-muted">Range:</span>
                                    <span className="text-dark text-truncate ms-1" style={{ maxWidth: '105px' }} title={card.read_range}>
                                      {card.read_range || '2-8 cm'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Pricing & Stepper / Presets */}
                              <div className="border-top pt-2 mt-auto">
                                <div className="d-flex align-items-baseline justify-content-between">
                                  <span className="text-muted fs-11">Unit Price:</span>
                                  <div className="text-end">
                                    <span className="fs-15 fw-bold text-dark">
                                      ₹{unitPrice.toFixed(2)}
                                    </span>
                                    <span className="text-muted fs-10 d-block">per card</span>
                                  </div>
                                </div>

                                {/* Stepper & Presets when this card is selected */}
                                {isSelected && (
                                  <div className="mt-2 pt-2 border-top" onClick={(e) => e.stopPropagation()}>
                                    <div className="d-flex align-items-center justify-content-between mb-1.5">
                                      <span className="text-muted fs-11 fw-semibold">Quantity:</span>
                                      <div className="input-group input-group-sm" style={{ width: '105px' }}>
                                        <button
                                          type="button"
                                          className="btn btn-outline-secondary px-2 py-0 fw-bold"
                                          onClick={() => handleCardQtyChange(-10, minQty)}
                                        >
                                          -
                                        </button>
                                        <input
                                          type="number"
                                          className="form-control text-center px-1 py-0 fw-bold fs-12"
                                          min={minQty}
                                          value={cardQty}
                                          onChange={(e) => handleCardQtyDirectInput(e.target.value, minQty)}
                                        />
                                        <button
                                          type="button"
                                          className="btn btn-outline-secondary px-2 py-0 fw-bold"
                                          onClick={() => handleCardQtyChange(10, minQty)}
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>

                                    {/* Quick Presets */}
                                    <div className="d-flex align-items-center justify-content-end gap-1">
                                      {presets.map((preset) => (
                                        <button
                                          key={preset}
                                          type="button"
                                          className={`btn btn-xs py-0 px-1.5 fs-10 ${
                                            cardQty === preset ? 'btn-primary' : 'btn-outline-secondary'
                                          }`}
                                          onClick={() => setCardQty(preset)}
                                        >
                                          {preset}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
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

          {/* Card 5: Optional Package Add-ons (subscription_items) */}
          {availableAddons.length > 0 && (
            <div className="card border-0 shadow-sm rounded-3 mb-4">
              <div className="card-header bg-white border-bottom p-4">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <h5 className="fw-bold text-dark mb-1 d-flex align-items-center">
                      <i className="ti ti-puzzle me-2 text-primary fs-20"></i>
                      Service & Gateway Add-ons (subscription_items)
                    </h5>
                    <p className="text-muted fs-13 mb-0">
                      Associate additional notifications and institutional service add-ons.
                    </p>
                  </div>
                  <span className="badge bg-light text-secondary border px-2.5 py-1.5 fs-12">
                    {availableAddons.length} available
                  </span>
                </div>
              </div>

              <div className="card-body p-4 bg-white">
                <div className="row g-3">
                  {availableAddons.map((addon) => {
                    const isChecked = selectedAddonIds.includes(addon.id);
                    const addonPrice = parseFloat(addon.price || 0);

                    return (
                      <div className="col-12" key={addon.id}>
                        <div
                          onClick={() => handleToggleAddon(addon.id)}
                          className={`p-3 rounded-3 border transition-all cursor-pointer ${
                            isChecked
                              ? 'border-primary bg-primary-subtle bg-opacity-10 shadow-sm'
                              : 'border-200 bg-white hover-shadow'
                          }`}
                          style={{
                            cursor: 'pointer',
                            borderWidth: isChecked ? '2px' : '1px',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-start gap-3">
                              <input
                                type="checkbox"
                                className="form-check-input mt-1"
                                checked={isChecked}
                                onChange={() => handleToggleAddon(addon.id)}
                                onClick={(e) => e.stopPropagation()}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                              />
                              <div>
                                <h6 className="fw-bold text-dark mb-1">{addon.item_name}</h6>
                                <p className="text-muted fs-12 mb-0">
                                  {addon.description ||
                                    (addon.quota_limit
                                      ? `Capacity: ${Number(addon.quota_limit).toLocaleString()} ${addon.unit || 'units'}`
                                      : 'High-availability institutional service add-on')}
                                </p>
                              </div>
                            </div>

                            <div className="text-end flex-shrink-0 ms-3">
                              <div className="fs-16 fw-bold text-dark">
                                +₹{addonPrice.toLocaleString('en-IN')}
                              </div>
                              <div className="text-muted fs-11">
                                / {billingCycle === 'monthly' ? 'month' : 'year'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Card 6: School Billing Info */}
          <div className="card border-0 shadow-sm rounded-3 mb-4">
            <div className="card-header bg-white border-bottom p-4">
              <h5 className="fw-bold text-dark mb-1 d-flex align-items-center">
                <i className="ti ti-building me-2 text-primary fs-20"></i>
                School & Billing Organization
              </h5>
              <p className="text-muted fs-13 mb-0">
                Invoices and tax receipts will be generated under these institutional details.
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
                Choose between instant online checkout or direct institutional bank transfer.
              </p>
            </div>

            <div className="card-body p-4 bg-white">
              <div className="row g-3 mb-3">
                <div className="col-12 col-md-6">
                  <label
                    className={`d-flex align-items-center p-3 border rounded-3 cursor-pointer w-100 mb-0 transition-all ${
                      paymentGateway === 'razorpay'
                        ? 'border-primary bg-primary-subtle bg-opacity-10 shadow-sm'
                        : 'border-200 bg-white'
                    }`}
                    style={{ cursor: 'pointer', borderWidth: paymentGateway === 'razorpay' ? '2px' : '1px' }}
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
                      <div className="fw-bold text-dark fs-13 d-flex align-items-center">
                        Instant Online Checkout
                        <span className="badge bg-success-subtle text-success border border-success fs-10 ms-2 px-1.5 py-0.5 rounded-pill">
                          Recommended
                        </span>
                      </div>
                      <div className="text-muted fs-11">
                        Instant activation via UPI (Google Pay, PhonePe), Cards, NetBanking
                      </div>
                    </div>
                  </label>
                </div>

                <div className="col-12 col-md-6">
                  <label
                    className={`d-flex align-items-center p-3 border rounded-3 cursor-pointer w-100 mb-0 transition-all ${
                      paymentGateway === 'bank_transfer'
                        ? 'border-primary bg-primary-subtle bg-opacity-10 shadow-sm'
                        : 'border-200 bg-white'
                    }`}
                    style={{ cursor: 'pointer', borderWidth: paymentGateway === 'bank_transfer' ? '2px' : '1px' }}
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
                      <div className="fw-bold text-dark fs-13">Direct Bank Transfer (NEFT/RTGS)</div>
                      <div className="text-muted fs-11">Submit corporate transfer details for manual verification</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Bank Transfer Details Form */}
              {paymentGateway === 'bank_transfer' && (
                <div className="p-3 bg-light rounded-3 border">
                  {catalog.bank_accounts && catalog.bank_accounts.length > 0 && activeBankAccount ? (
                    <>
                      {/* Optional Multiple Account Switcher */}
                      {catalog.bank_accounts.length > 1 && (
                        <div className="mb-3">
                          <label className="form-label fs-12 fw-semibold text-dark mb-1">
                            Select Official Bank Account:
                          </label>
                          <div className="d-flex flex-wrap gap-2">
                            {catalog.bank_accounts.map((acc) => {
                              const isAccSelected = Number(acc.id) === Number(activeBankAccount.id);
                              return (
                                <button
                                  key={acc.id}
                                  type="button"
                                  className={`btn btn-sm text-start py-1.5 px-3 rounded-2 border ${
                                    isAccSelected
                                      ? 'btn-primary text-white border-primary shadow-sm'
                                      : 'btn-outline-secondary bg-white text-dark'
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
                        <span className="d-flex align-items-center">
                          <i className="ti ti-building-bank me-2 text-primary fs-16"></i>
                          Official Bank Details: {activeBankAccount.account_title || activeBankAccount.bank_name}
                        </span>
                        {Number(activeBankAccount.is_default) === 1 && (
                          <span className="badge bg-primary-subtle text-primary border border-primary-subtle fs-10 px-2 py-0.5 rounded-pill">
                            Primary Account
                          </span>
                        )}
                      </div>

                      <div className="row g-2 fs-12 text-secondary mb-3">
                        <div className="col-12 col-sm-6">
                          <div>
                            <strong className="text-dark">Beneficiary:</strong> {activeBankAccount.beneficiary_name}
                          </div>
                          <div>
                            <strong className="text-dark">Account Number:</strong>{' '}
                            <span className="font-monospace fw-bold text-dark">{activeBankAccount.account_number}</span>
                          </div>
                          <div>
                            <strong className="text-dark">Account Type:</strong> {activeBankAccount.account_type || 'Current'}
                          </div>
                        </div>
                        <div className="col-12 col-sm-6">
                          <div>
                            <strong className="text-dark">Bank & Branch:</strong> {activeBankAccount.bank_name}
                            {activeBankAccount.branch_name ? `, ${activeBankAccount.branch_name}` : ''}
                          </div>
                          <div>
                            <strong className="text-dark">IFSC Code:</strong>{' '}
                            <span className="font-monospace fw-bold text-dark">{activeBankAccount.ifsc_code}</span>
                          </div>
                          {activeBankAccount.upi_id && (
                            <div>
                              <strong className="text-dark">UPI VPA:</strong>{' '}
                              <span className="font-monospace text-primary">{activeBankAccount.upi_id}</span>
                            </div>
                          )}
                          {activeBankAccount.swift_code && (
                            <div>
                              <strong className="text-dark">SWIFT / BIC:</strong>{' '}
                              <span className="font-monospace text-dark">{activeBankAccount.swift_code}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {activeBankAccount.instructions && (
                        <div className="alert alert-info py-2 px-3 fs-11 mb-3 rounded-2 border-0 bg-info-subtle text-dark">
                          <i className="ti ti-info-circle me-1 text-info"></i>
                          {activeBankAccount.instructions}
                        </div>
                      )}

                      <div>
                        <label className="form-label fs-12 fw-semibold text-dark mb-1">
                          Bank Transfer Reference / UTR Number <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="e.g. UTR202609259876 or IMPS Reference ID"
                          value={utrNumber}
                          onChange={(e) => setUtrNumber(e.target.value)}
                        />
                        <span className="text-muted fs-11 mt-1 d-block">
                          Enter the transaction reference from your payment receipt for ₹{grandTotal.toLocaleString('en-IN')}. Platform administrators will verify and activate your license within 24 hours.
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="p-3 bg-white rounded-2 border border-warning-subtle text-center">
                      <i className="ti ti-alert-triangle fs-24 text-warning mb-2 d-block"></i>
                      <h6 className="fw-bold text-dark mb-1 fs-13">No Bank Transfer Details Configured</h6>
                      <p className="text-muted fs-12 mb-0">
                        The Super Admin has not configured any active bank accounts for offline transfer. Please choose <strong>Instant Online Checkout</strong> to proceed, or contact platform administration.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Comprehensive Order Summary */}
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm rounded-3 sticky-subscription-summary">
            <div className="card-header bg-white border-bottom p-3 p-md-4 flex-shrink-0">
              <h5 className="fw-bold text-dark mb-0 d-flex align-items-center">
                <i className="ti ti-receipt-2 me-2 text-primary fs-20"></i>
                Final Subscription Summary
              </h5>
            </div>

            <div className="card-body p-3 p-md-4 bg-white overflow-auto flex-grow-1">
              {/* 1. Base Subscription Plan */}
              <div className="d-flex align-items-center justify-content-between mb-2 fs-13">
                <div className="text-secondary">
                  <strong>{selectedPlan.plan_name}</strong>
                  <div className="text-muted fs-11 text-capitalize">
                    Base Plan ({billingCycle === 'monthly' ? 'Monthly' : 'Annual'})
                  </div>
                </div>
                <div className="fw-bold text-dark">₹{basePrice.toLocaleString('en-IN')}</div>
              </div>

              {/* 2. Selected Storage Expansion (storage_master - single option) */}
              {selectedStoragePlan && (
                <div className="border-top pt-2 mt-2">
                  <div className="text-muted fs-11 fw-bold text-uppercase mb-1">Cloud Storage:</div>
                  <div className="d-flex align-items-center justify-content-between fs-12">
                    <span className="text-secondary">
                      <i className="ti ti-cloud text-info me-1"></i>
                      {selectedStoragePlan.plan_name} (
                      {selectedStoragePlan.storage_capacity >= 1024
                        ? `${selectedStoragePlan.storage_capacity / 1024} TB`
                        : `${selectedStoragePlan.storage_capacity} GB`}
                      )
                    </span>
                    <span className="fw-semibold text-dark">
                      +₹{storageTotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              )}

              {/* 3. Selected Attendance Machine (attendance_machine_master - single option) */}
              {selectedMachinesList.length > 0 && (
                <div className="border-top pt-2 mt-2">
                  <div className="text-muted fs-11 fw-bold text-uppercase mb-1">
                    Attendance Machine ({selectedMachinesList[0].quantity} {selectedMachinesList[0].quantity > 1 ? 'units' : 'unit'}):
                  </div>
                  {selectedMachinesList.map((m) => (
                    <div className="d-flex align-items-center justify-content-between mb-1 fs-12" key={m.id}>
                      <span className="text-secondary text-truncate me-2 d-inline-flex align-items-center" style={{ maxWidth: '180px' }} title={m.machine_name}>
                        {m.machine_image ? (
                          <img
                            src={resolveImageUrl(m.machine_image)}
                            alt=""
                            className="rounded-1 border me-1.5 flex-shrink-0 bg-white"
                            style={{ width: '18px', height: '18px', objectFit: 'contain' }}
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        ) : (
                          <i className="ti ti-device-watch text-primary me-1"></i>
                        )}
                        <span className="text-truncate">{m.machine_name}</span>
                        <strong className="text-dark ms-1">x{m.quantity}</strong>
                      </span>
                      <span className="fw-semibold text-dark flex-shrink-0">
                        +₹{m.totalPrice.toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* 4. Selected RFID Cards (rfid_card_master - single option) */}
              {selectedCardsList.length > 0 && (
                <div className="border-top pt-2 mt-2">
                  <div className="text-muted fs-11 fw-bold text-uppercase mb-1">
                    RFID Cards & Badges ({selectedCardsList[0].quantity} pcs):
                  </div>
                  {selectedCardsList.map((c) => (
                    <div className="d-flex align-items-center justify-content-between mb-1 fs-12" key={c.id}>
                      <span className="text-secondary text-truncate me-2" style={{ maxWidth: '180px' }} title={c.card_name}>
                        <i className="ti ti-id text-success me-1"></i>
                        {c.card_name} <strong className="text-dark">x{c.quantity}</strong>
                      </span>
                      <span className="fw-semibold text-dark flex-shrink-0">
                        +₹{c.totalPrice.toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* 5. Selected Module Add-ons (subscription_items) */}
              {selectedAddonIds.length > 0 && (
                <div className="border-top pt-2 mt-2">
                  <div className="text-muted fs-11 fw-bold text-uppercase mb-1">Service Add-ons:</div>
                  {availableAddons
                    .filter((addon) => selectedAddonIds.includes(addon.id))
                    .map((addon) => (
                      <div
                        className="d-flex align-items-center justify-content-between mb-1 fs-12"
                        key={addon.id}
                      >
                        <span className="text-secondary text-truncate me-2">
                          <i className="ti ti-plus text-primary me-1"></i>
                          {addon.item_name}
                        </span>
                        <span className="fw-semibold text-dark flex-shrink-0">
                          +₹{parseFloat(addon.price || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                </div>
              )}

              {/* Subtotal & Taxes */}
              <div className="border-top pt-3 mt-3">
                <div className="d-flex align-items-center justify-content-between mb-1 fs-13 text-secondary">
                  <span>Subtotal</span>
                  <span className="fw-semibold text-dark">₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>
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
                  {billingCycle}
                </span>
              </div>
              <div className="text-muted fs-11 mb-3">
                License and hardware orders are dispatched upon payment verification.
              </div>

              {/* Primary CTA Button */}
              <div>
                <button
                  type="button"
                  className="btn btn-primary w-100 py-2.5 py-md-3 fw-bold fs-14 d-inline-flex align-items-center justify-content-center shadow-sm"
                  onClick={handleProceedPayment}
                  disabled={
                    isProcessing ||
                    (paymentGateway === 'bank_transfer' &&
                      (!catalog.bank_accounts || catalog.bank_accounts.length === 0))
                  }
                >
                  {isProcessing ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Processing Order...
                    </>
                  ) : paymentGateway === 'razorpay' ? (
                    <>
                      <i className="ti ti-lock me-2 fs-16"></i>
                      <span>Pay ₹{grandTotal.toLocaleString('en-IN')} Now</span>
                    </>
                  ) : !catalog.bank_accounts || catalog.bank_accounts.length === 0 ? (
                    <>
                      <i className="ti ti-ban me-2 fs-16"></i>
                      <span>Bank Transfer Unavailable</span>
                    </>
                  ) : (
                    <>
                      <i className="ti ti-send me-2 fs-16"></i>
                      <span>Submit Bank Transfer</span>
                    </>
                  )}
                </button>
              </div>

              {/* Back to Plans */}
              <div className="mt-2 text-center">
                <Link
                  to="/admin/subscription"
                  className="text-muted fs-12 text-decoration-none hover-underline d-inline-flex align-items-center py-1"
                >
                  <i className="ti ti-arrow-left me-1"></i> Choose a different plan
                </Link>
              </div>

              {/* Security Badges */}
              <div className="border-top pt-2.5 mt-2.5 fs-11 text-muted text-center">
                <div className="d-flex align-items-center justify-content-center gap-3 mb-1">
                  <span>
                    <i className="ti ti-shield-lock text-success me-1"></i> 256-bit SSL
                  </span>
                  <span>
                    <i className="ti ti-bolt text-warning me-1"></i> Instant Setup
                  </span>
                  <span>
                    <i className="ti ti-receipt text-info me-1"></i> Tax Invoice
                  </span>
                </div>
                <div>Authorized payment partner: Razorpay India</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionConfigure;
