import React, { useState, useMemo, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { loadRazorpayScript } from '../../utils/loadRazorpay';
import {
  createSubscriptionOrder,
  verifySubscriptionPayment,
  recordSubscriptionPaymentFailure,
  getConfigurationCatalog,
} from '../../api/subscription.api';
import { resolveImageUrl } from '../../utils/url.util';

const UpgradeModal = ({
  isOpen,
  onClose,
  plans = [],
  activeCycles = [],
  currentPlanId,
  subscription,
  initialPlanId,
  onUpgrade,
  refreshSubscription,
  isLockout = false,
}) => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth || {});

  const availableCycles = useMemo(() => {
    if (Array.isArray(activeCycles) && activeCycles.length > 0) {
      return activeCycles
        .filter((c) => (c.cycle || c.code) !== 'trial')
        .map((c) => ({ ...c, cycle: c.cycle || c.code }));
    }
    const map = new Map();
    for (const p of plans) {
      const c = String(p.billing_cycle || '').toLowerCase();
      if (c && c !== 'trial' && !map.has(c) && p.cycle_meta) {
        map.set(c, { ...p.cycle_meta, cycle: p.cycle_meta.cycle || p.cycle_meta.code || c });
      }
    }
    return Array.from(map.values()).sort((a, b) => (a.rank ?? a.months ?? 0) - (b.rank ?? b.months ?? 0));
  }, [activeCycles, plans]);

  const [selectedCycle, setSelectedCycle] = useState(() => {
    const initialPlan = plans.find((p) => Number(p.id) === Number(initialPlanId || currentPlanId));
    if (initialPlan?.billing_cycle && initialPlan.billing_cycle !== 'trial') {
      return initialPlan.billing_cycle;
    }
    if (subscription?.billing_cycle && subscription.billing_cycle !== 'trial') {
      return subscription.billing_cycle;
    }
    return availableCycles.find((c) => c.cycle === 'annual')?.cycle || availableCycles[0]?.cycle || 'annual';
  });

  const cyclePlans = useMemo(() => {
    const filtered = plans.filter((p) => String(p.billing_cycle).toLowerCase() === String(selectedCycle).toLowerCase());
    return filtered.length > 0 ? filtered : plans;
  }, [plans, selectedCycle]);

  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [paymentGateway, setPaymentGateway] = useState('razorpay');
  const [utrNumber, setUtrNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [bankLoading, setBankLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const preferred =
      cyclePlans.find((p) => Number(p.id) === Number(initialPlanId) && p.can_switch !== false) ||
      cyclePlans.find((p) => Number(p.id) === Number(currentPlanId) && p.can_switch !== false) ||
      cyclePlans.find((p) => p.can_switch !== false) ||
      cyclePlans[0];
    if (preferred) {
      setSelectedPlanId(preferred.id);
    }
  }, [isOpen, initialPlanId, currentPlanId, cyclePlans]);

  useEffect(() => {
    if (isOpen) {
      const fetchBankAccounts = async () => {
        try {
          setBankLoading(true);
          const data = await getConfigurationCatalog();
          const raw = Array.isArray(data?.bank_accounts) ? data.bank_accounts : [];
          const eligible = raw.filter(
            (acc) =>
              (Number(acc.is_default) === 1 || acc.is_default === true) &&
              (acc.status === undefined || Number(acc.status) === 1 || acc.status === true)
          );
          setBankAccounts(eligible.length > 0 ? eligible : raw);
        } catch (err) {
          console.warn('Failed to load bank accounts for upgrade modal:', err);
        } finally {
          setBankLoading(false);
        }
      };
      fetchBankAccounts();
    }
  }, [isOpen]);

  const activeBankAccount = bankAccounts[0] || null;

  if (!isOpen) return null;

  const selectedPlan = cyclePlans.find((p) => Number(p.id) === Number(selectedPlanId)) || cyclePlans[0];
  const isCurrentSelected = Boolean(
    selectedPlan &&
      (selectedPlan.is_current ||
        selectedPlan.is_renewal ||
        (currentPlanId && Number(selectedPlan.id) === Number(currentPlanId)))
  );
  const selectedCycleInfo = {
    label: selectedPlan?.cycle_meta?.label || selectedPlan?.billing_cycle || '',
    short: selectedPlan?.cycle_meta?.shortLabel || selectedPlan?.cycle_meta?.label || '',
    daysText: selectedPlan?.cycle_meta?.durationText || selectedPlan?.cycle_meta?.label || '',
  };

  const handleGoToConfigureWithAddons = () => {
    if (!selectedPlan) return;
    if (selectedPlan.can_switch === false) {
      toast.warning(selectedPlan.lock_reason || 'This plan cannot be selected under the no-downgrade policy.');
      return;
    }
    sessionStorage.setItem('selected_subscription_plan', JSON.stringify(selectedPlan));
    sessionStorage.setItem('selected_billing_cycle', selectedPlan.billing_cycle || selectedCycle);
    if (onClose) onClose();
    navigate('/admin/subscription/configure', {
      state: {
        plan: selectedPlan,
        billingCycle: selectedPlan.billing_cycle || selectedCycle,
      },
    });
  };

  const handleConfirmUpgrade = async () => {
    if (!selectedPlan) {
      toast.error('Please select a plan to continue.');
      return;
    }
    if (selectedPlan.can_switch === false) {
      toast.error(selectedPlan.lock_reason || 'Downgrading is not permitted.');
      return;
    }

    try {
      setIsProcessing(true);

      if (paymentGateway === 'razorpay') {
        const isLoaded = await loadRazorpayScript();
        if (!isLoaded) {
          toast.error('Could not connect to Razorpay SDK. Please check your internet connection.');
          setIsProcessing(false);
          return;
        }

        const orderData = await createSubscriptionOrder({ plan_id: selectedPlan.id });

        if (orderData?.zero_amount_activated) {
          toast.success(`${selectedPlan.plan_name} activated immediately!`);
          if (onClose) onClose();
          if (refreshSubscription) await refreshSubscription();
          navigate(`/admin/subscription/payment-success?order_no=${encodeURIComponent(orderData.order_no)}`);
          setIsProcessing(false);
          return;
        }

        if (!orderData?.order_id) {
          throw new Error('Failed to initialize payment order with gateway.');
        }

        const options = {
          key: orderData.key_id,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: 'GrowVidya School ERP',
          description: `${isCurrentSelected ? 'License Renewal' : 'License Upgrade'}: ${selectedPlan.plan_name}`,
          order_id: orderData.order_id,
          prefill: {
            name: user?.name || user?.schoolName || user?.school_name || 'School Admin',
            email: user?.email || '',
            contact: user?.phone || user?.mobile || '',
          },
          notes: {
            school_id: user?.schoolId || user?.school_id || '',
            plan_id: selectedPlan.id,
            order_no: orderData.order_no || '',
          },
          theme: {
            color: '#4f46e5',
          },
          handler: async function (response) {
            try {
              setIsProcessing(true);
              const verified = await verifySubscriptionPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan_id: selectedPlan.id,
              });

              toast.success(
                `Payment verified! ${selectedPlan.plan_name} is now active immediately.`
              );
              if (onClose) onClose();
              if (refreshSubscription) await refreshSubscription();
              const targetOrderNo = verified?.order_no || orderData.order_no;
              if (targetOrderNo) {
                navigate(`/admin/subscription/payment-success?order_no=${encodeURIComponent(targetOrderNo)}`);
              }
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
        rzp.on('payment.failed', async function (resp) {
          console.error('Razorpay payment failed:', resp.error);
          const reason = resp.error?.description || 'Transaction was declined.';
          try {
            await recordSubscriptionPaymentFailure({
              order_no: orderData.order_no,
              razorpay_order_id: orderData.order_id,
              razorpay_payment_id: resp.error?.metadata?.payment_id || null,
              error_code: resp.error?.code || 'PAYMENT_FAILED',
              error_description: reason,
            });
          } catch (_) {}
          setIsProcessing(false);
          if (onClose) onClose();
          if (orderData.order_no) {
            navigate(
              `/admin/subscription/payment-failed?order_no=${encodeURIComponent(orderData.order_no)}&reason=${encodeURIComponent(reason)}`
            );
          } else {
            toast.error(`Payment failed: ${reason}`);
          }
        });

        rzp.open();
      } else {
        if (!activeBankAccount) {
          toast.error('No active bank account has been configured by Super Admin yet. Please use Online Checkout.');
          setIsProcessing(false);
          return;
        }

        if (!utrNumber || String(utrNumber).trim().length < 4) {
          toast.error('Please enter a valid Bank Transfer UTR / Reference number (minimum 4 characters).');
          setIsProcessing(false);
          return;
        }

        const res = await onUpgrade({
          plan_id: selectedPlan.id,
          payment_gateway: 'bank_transfer',
          payment_transaction_id: String(utrNumber).trim(),
        });

        toast.info(
          res?.message ||
            `Offline Bank Transfer recorded for ${selectedPlan.plan_name}. Your submission is queued for Super Admin verification.`
        );
        if (onClose) onClose();
        if (refreshSubscription) await refreshSubscription();
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('Upgrade failed:', err);
      toast.error(err?.response?.data?.message || err.message || 'Upgrade payment failed. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      role="dialog"
      style={{
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 1060,
      }}
    >
      <div className="modal-dialog modal-dialog-centered modal-xl" role="document">
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          {/* Header */}
          <div
            className="modal-header border-0 text-white px-4 py-3"
            style={{
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className="d-flex align-items-center">
              <div
                className="d-flex align-items-center justify-content-center rounded-3 me-3"
                style={{
                  width: '42px',
                  height: '42px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)',
                }}
              >
                <i className="ti ti-crown fs-20 text-white"></i>
              </div>
              <div>
                <h5 className="modal-title fw-bold mb-0 text-white">
                  {isCurrentSelected
                    ? `Renew ${selectedPlan?.plan_name || 'Current Plan'}`
                    : isLockout
                    ? 'Reactivate Your School Portal'
                    : 'Upgrade or Extend School Subscription'}
                </h5>
                <p className="text-white-50 mb-0 fs-13">
                  Instant online activation via Razorpay • Flat Net Pricing (Zero GST) • Unlimited Staff &amp; Branches
                </p>
              </div>
            </div>

            {!isLockout && (
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={onClose}
                aria-label="Close"
              ></button>
            )}
          </div>

          {/* Modal Body */}
          <div className="modal-body p-4 bg-light" style={{ maxHeight: '78vh', overflowY: 'auto' }}>
            {/* Dynamic Billing Cycle Tabs */}
            {availableCycles.length > 1 && (
              <div className="d-flex justify-content-center mb-4">
                <div className="bg-white p-1 rounded-pill border shadow-sm d-inline-flex flex-wrap gap-1">
                  {availableCycles.map((c) => (
                    <button
                      key={c.cycle}
                      type="button"
                      className={`btn btn-sm rounded-pill px-3 py-1 fw-semibold ${
                        selectedCycle === c.cycle ? 'btn-primary text-white shadow-sm' : 'btn-light text-dark'
                      }`}
                      onClick={() => setSelectedCycle(c.cycle)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Plan selection grid */}
            <div className="row g-3 mb-4 pt-2">
              {cyclePlans.map((plan) => {
                const isSelected = Number(selectedPlanId) === Number(plan.id);
                const isLocked = plan.can_switch === false;
                const isCycleLocked =
                  plan.lock_code === 'CYCLE_DOWNGRADE_NOT_ALLOWED' ||
                  plan.lock_code === 'ACTIVE_CYCLE_SHRINK_NOT_ALLOWED';
                const isPopular = Number(plan.is_popular) === 1;
                const cInfo = {
                  label: plan.cycle_meta?.label || plan.billing_cycle || '',
                  short: plan.cycle_meta?.shortLabel || plan.cycle_meta?.label || '',
                };

                return (
                  <div className="col-12 col-md-4" key={plan.id}>
                    <div
                      onClick={() => {
                        if (isLocked) {
                          toast.warning(plan.lock_reason || 'Switching to this plan is not permitted.');
                          return;
                        }
                        setSelectedPlanId(plan.id);
                      }}
                      className={`h-100 p-3 rounded-3 bg-white transition-all position-relative d-flex flex-column ${
                        !isLocked && isSelected ? 'shadow-sm' : ''
                      }`}
                      style={{
                        cursor: isLocked ? 'not-allowed' : 'pointer',
                        border:
                          isSelected && !isLocked
                            ? '2px solid #4f46e5'
                            : `1px solid ${isLocked ? '#cbd5e1' : '#e2e8f0'}`,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {isLocked ? (
                        <span
                          className="position-absolute fw-bold text-uppercase"
                          style={{
                            top: '-10px',
                            left: '16px',
                            fontSize: '10.5px',
                            padding: '3px 10px',
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
                          {plan.is_quota_locked
                            ? 'Quota Exceeded'
                            : isCycleLocked
                            ? 'Shorter Cycle Locked'
                            : 'Lower Tier Locked'}
                        </span>
                      ) : plan.is_current || plan.is_renewal ? (
                        <span
                          className="badge bg-warning text-dark position-absolute"
                          style={{ top: '-10px', left: '16px', fontSize: '10.5px', padding: '4px 10px', borderRadius: '12px', whiteSpace: 'nowrap', zIndex: 2 }}
                        >
                          ★ RENEW PLAN
                        </span>
                      ) : isPopular ? (
                        <span
                          className="badge bg-primary text-white position-absolute"
                          style={{ top: '-10px', right: '16px', fontSize: '10.5px', padding: '4px 10px', borderRadius: '12px', whiteSpace: 'nowrap', zIndex: 2 }}
                        >
                          ★ MOST POPULAR
                        </span>
                      ) : null}

                      <div className="d-flex align-items-center justify-content-between mb-2 mt-1">
                        <div>
                          <h6 className="fw-bold text-dark mb-0">{plan.plan_name}</h6>
                          <span className="text-muted fs-11">Tier {plan.tier_rank || 1} • {cInfo.label}</span>
                        </div>
                        <input
                          type="radio"
                          name="plan_selection"
                          checked={isSelected && !isLocked}
                          disabled={isLocked}
                          onChange={() => !isLocked && setSelectedPlanId(plan.id)}
                          className="form-check-input"
                        />
                      </div>

                      <div className="mb-2">
                        {Number(plan.original_price) > Number(plan.price) && (
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <span
                              className="fs-13 fw-semibold text-decoration-line-through"
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
                          <span className="fs-24 fw-bold text-dark">
                            ₹{Number(plan.price).toLocaleString('en-IN')}
                          </span>
                          <span className="text-muted fs-12"> / {cInfo.short}</span>
                        </div>
                      </div>

                      <div className="border-top pt-2 fs-12 flex-grow-1">
                        <div className="d-flex justify-content-between py-1 text-muted">
                          <span>Students:</span>
                          <strong className="text-dark">
                            {plan.max_students > 0 ? `${Number(plan.max_students).toLocaleString('en-IN')} Max` : 'Unlimited'}
                          </strong>
                        </div>
                        <div className="d-flex justify-content-between py-1 text-muted">
                          <span>Teachers &amp; Branches:</span>
                          <strong className="text-success">Unlimited</strong>
                        </div>
                        {Number(plan.included_storage_gb) > 0 && (
                          <div className="d-flex justify-content-between py-1 text-muted">
                            <span>Cloud Storage:</span>
                            <strong className="text-dark">{Math.max(0, Number(plan.included_storage_gb) || 0)} GB Included</strong>
                          </div>
                        )}
                        <div className="d-flex justify-content-between py-1 text-muted">
                          <span>ERP Functionality:</span>
                          <strong className="text-success">All Modules Unlocked</strong>
                        </div>
                      </div>

                      {isLocked && plan.lock_reason && (
                        <div
                          className="mt-2 px-2 py-2 rounded-2 fs-11"
                          style={{
                            backgroundColor: '#fffbeb',
                            border: '1px solid #fde68a',
                            color: '#78350f',
                          }}
                        >
                          <i className="ti ti-shield-lock me-1"></i>
                          {plan.lock_reason.replace(/\ba Annual\b/g, 'an Annual')}
                        </div>
                      )}

                      {!isLocked && plan.projected_end_date && (
                        <div
                          className="mt-2 px-2 py-2 rounded-2 fs-11"
                          style={{
                            backgroundColor: plan.stacks_dates ? '#ecfdf5' : '#eef2ff',
                            border: `1px solid ${plan.stacks_dates ? '#a7f3d0' : '#c7d2fe'}`,
                            color: plan.stacks_dates ? '#065f46' : '#3730a3',
                          }}
                        >
                          <i className="ti ti-calendar-check me-1"></i>
                          Valid till <strong>{plan.projected_end_date}</strong>
                          {plan.stacks_dates && ' (Remaining days preserved)'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Payment Method Selector */}
            {selectedPlan && selectedPlan.can_switch !== false && (
              <div className="bg-white p-3 rounded-3 border mb-3">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                  <h6 className="fw-bold text-dark mb-0 d-flex align-items-center">
                    <i className="ti ti-credit-card me-2 text-primary"></i>
                    Payment Method
                  </h6>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary fs-12"
                    onClick={handleGoToConfigureWithAddons}
                  >
                    <i className="ti ti-plus me-1"></i> Need Cloud Storage, Hardware or SMS Credits? Configure Bundle
                  </button>
                </div>

                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label
                      className={`d-flex align-items-center p-3 border rounded-3 w-100 mb-0 ${
                        paymentGateway === 'razorpay' ? 'border-primary' : 'bg-white'
                      }`}
                      style={{
                        cursor: 'pointer',
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
                        <div className="fw-semibold text-dark fs-13">Online Instant Checkout (Razorpay)</div>
                        <div className="text-muted fs-11">Instant activation via UPI, Cards, &amp; NetBanking</div>
                      </div>
                    </label>
                  </div>

                  <div className="col-12 col-md-6">
                    <label
                      className={`d-flex align-items-center p-3 border rounded-3 w-100 mb-0 ${
                        paymentGateway === 'bank_transfer' ? 'border-primary' : 'bg-white'
                      }`}
                      style={{
                        cursor: 'pointer',
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
                        <div className="fw-semibold text-dark fs-13">Direct Bank Transfer (NEFT / RTGS / UPI)</div>
                        <div className="text-muted fs-11">Submit UTR reference for Super Admin verification</div>
                      </div>
                    </label>
                  </div>
                </div>

                {paymentGateway === 'bank_transfer' && (
                  <div className="mt-3 p-3 bg-light rounded-3 border">
                    {bankLoading ? (
                      <div className="text-center py-3 text-muted fs-12">
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Loading official bank account details...
                      </div>
                    ) : activeBankAccount ? (
                      <>
                        <div className="fw-semibold text-dark fs-13 mb-2 d-flex align-items-center justify-content-between">
                          <span className="d-flex align-items-center">
                            <i className="ti ti-building-bank me-2 text-primary fs-15"></i>
                            Official Bank Details: {activeBankAccount.account_title || activeBankAccount.bank_name}
                          </span>
                        </div>

                        {activeBankAccount.qr_code_image && (
                          <div className="mb-3 p-2 bg-white rounded-2 border d-flex align-items-center gap-3">
                            <img
                              src={resolveImageUrl(activeBankAccount.qr_code_image)}
                              alt="Payment QR Code"
                              className="rounded-2 border"
                              style={{ width: '80px', height: '80px', objectFit: 'contain' }}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            <div>
                              <div className="fw-semibold text-dark fs-12">Scan to Pay via UPI</div>
                              {activeBankAccount.upi_id && (
                                <div className="font-monospace text-primary fs-11 mt-1">
                                  {activeBankAccount.upi_id}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="row g-2 fs-12 text-muted mb-3">
                          <div className="col-12 col-sm-6">
                            <div><strong className="text-dark">Beneficiary:</strong> {activeBankAccount.beneficiary_name}</div>
                            <div><strong className="text-dark">Account No:</strong> <span className="font-monospace fw-bold text-dark">{activeBankAccount.account_number}</span></div>
                          </div>
                          <div className="col-12 col-sm-6">
                            <div><strong className="text-dark">Bank:</strong> {activeBankAccount.bank_name}{activeBankAccount.branch_name ? `, ${activeBankAccount.branch_name}` : ''}</div>
                            <div><strong className="text-dark">IFSC:</strong> <span className="font-monospace fw-bold text-dark">{activeBankAccount.ifsc_code}</span></div>
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
                        </div>
                      </>
                    ) : (
                      <div className="p-3 bg-white rounded-2 border border-warning-subtle text-center">
                        <h6 className="fw-bold text-dark mb-1 fs-12">No Bank Transfer Account Configured</h6>
                        <p className="text-muted fs-11 mb-0">
                          Please choose <strong>Online Instant Checkout</strong> to proceed.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Summary Banner (Zero GST) */}
            {selectedPlan && (
              <div className="d-flex flex-wrap align-items-center justify-content-between p-3 rounded-3 bg-white border gap-2">
                <div>
                  <div className="text-muted fs-12">Selected Plan (Flat Net Price — No GST):</div>
                  <div className="fw-bold text-dark fs-15">
                    {selectedPlan.plan_name} ({selectedCycleInfo.label})
                    {selectedPlan.projected_end_date && (
                      <span className="fw-normal text-success fs-12 ms-2">
                        • Valid through {selectedPlan.projected_end_date}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-end">
                  <div className="text-muted fs-11">Total Payable</div>
                  <div className="fs-20 fw-bold text-success">
                    ₹{Number(selectedPlan.price).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer bg-white border-top px-4 py-3 d-flex justify-content-between">
            {!isLockout ? (
              <button
                type="button"
                className="btn btn-light border text-dark px-4 py-2"
                onClick={onClose}
                disabled={isProcessing}
              >
                Cancel
              </button>
            ) : (
              <div className="text-muted fs-12 d-flex align-items-center">
                <i className="ti ti-shield-check text-success fs-16 me-1"></i>
                All existing school data unlocks immediately upon activation.
              </div>
            )}

            <button
              type="button"
              className="btn btn-primary px-4 py-2 fw-semibold d-inline-flex align-items-center shadow-sm"
              onClick={handleConfirmUpgrade}
              disabled={isProcessing || !selectedPlan || selectedPlan.can_switch === false}
            >
              {isProcessing ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Processing...
                </>
              ) : paymentGateway === 'bank_transfer' ? (
                <>
                  <i className="ti ti-send me-2"></i>
                  Submit UTR for {isCurrentSelected ? 'Renewal' : 'Upgrade'} (₹{Number(selectedPlan?.price || 0).toLocaleString('en-IN')})
                </>
              ) : isCurrentSelected ? (
                <>
                  <i className="ti ti-refresh me-2"></i>
                  Renew {selectedPlan?.plan_name} (₹{Number(selectedPlan?.price || 0).toLocaleString('en-IN')})
                </>
              ) : (
                <>
                  <i className="ti ti-arrow-up-right me-2"></i>
                  Activate {selectedPlan?.plan_name} (₹{Number(selectedPlan?.price || 0).toLocaleString('en-IN')})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;
