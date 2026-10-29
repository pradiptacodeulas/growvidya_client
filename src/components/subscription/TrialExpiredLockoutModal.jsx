import React, { useState, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logoutAdmin } from '../../store/slices/authSlice';
import { toast } from 'react-toastify';
import { loadRazorpayScript } from '../../utils/loadRazorpay';
import {
  createSubscriptionOrder,
  verifySubscriptionPayment,
  recordSubscriptionPaymentFailure,
  getConfigurationCatalog,
} from '../../api/subscription.api';

const TrialExpiredLockoutModal = ({
  subscription,
  plans = [],
  activeCycles = [],
  onUpgrade,
  refreshSubscription,
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth || {});

  const activeSubscription = subscription || user?.subscription || null;
  const currentPlanName = activeSubscription?.plan_name || '';

  const isTrial = activeSubscription
    ? Boolean(
        activeSubscription.isTrial ||
          activeSubscription.status === 'trial' ||
          String(activeSubscription.billing_cycle || '').toLowerCase() === 'trial'
      )
    : false;

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

  const [selectedCycle, setSelectedCycle] = useState(
    () =>
      (activeSubscription?.billing_cycle && activeSubscription.billing_cycle !== 'trial'
        ? activeSubscription.billing_cycle
        : null) ||
      availableCycles.find((c) => c.cycle === 'annual')?.cycle ||
      availableCycles[0]?.cycle ||
      'annual'
  );

  const cyclePlans = useMemo(() => {
    const filtered = plans.filter((p) => String(p.billing_cycle).toLowerCase() === String(selectedCycle).toLowerCase());
    return filtered.length > 0 ? filtered : plans;
  }, [plans, selectedCycle]);

  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [paymentGateway, setPaymentGateway] = useState('razorpay');
  const [utrNumber, setUtrNumber] = useState('');
  const [bankAccounts, setBankAccounts] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const match =
      cyclePlans.find((p) => Number(p.id) === Number(subscription?.plan_id) && p.can_switch !== false) ||
      cyclePlans.find((p) => p.can_switch !== false) ||
      cyclePlans[0];
    if (match) setSelectedPlanId(match.id);
  }, [cyclePlans, subscription?.plan_id]);

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const data = await getConfigurationCatalog();
        const raw = Array.isArray(data?.bank_accounts) ? data.bank_accounts : [];
        setBankAccounts(raw.filter((b) => Number(b.status) === 1 || b.status === undefined));
      } catch (_) {}
    };
    fetchBanks();
  }, []);

  const selectedPlan = cyclePlans.find((p) => Number(p.id) === Number(selectedPlanId)) || cyclePlans[0];
  const isCurrentSelected = Boolean(
    selectedPlan &&
      (selectedPlan.is_renewal ||
        (subscription?.plan_id && Number(selectedPlan.id) === Number(subscription.plan_id)))
  );
  const schoolName = user?.schoolName || user?.school_name || 'Your School';
  const activeBankAccount = bankAccounts[0] || null;

  const handleConfirmUpgrade = async () => {
    if (!selectedPlan) {
      toast.error('Please select a plan to activate.');
      return;
    }
    if (selectedPlan.can_switch === false) {
      toast.error(selectedPlan.lock_reason || 'Downgrading to a lower plan is not permitted.');
      return;
    }

    try {
      setIsProcessing(true);

      if (paymentGateway === 'razorpay') {
        const isLoaded = await loadRazorpayScript();
        if (!isLoaded) {
          toast.error('Could not load Razorpay gateway. Please check your internet connection.');
          setIsProcessing(false);
          return;
        }

        const orderData = await createSubscriptionOrder({ plan_id: selectedPlan.id });

        if (orderData?.zero_amount_activated) {
          toast.success(`${selectedPlan.plan_name} activated immediately!`);
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
          description: `Reactivate School Portal: ${selectedPlan.plan_name}`,
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

              toast.success(`Payment verified! ${selectedPlan.plan_name} is now active immediately.`);
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
        if (!utrNumber || String(utrNumber).trim().length < 4) {
          toast.error('Please enter your Bank Transfer UTR / Reference number (minimum 4 characters).');
          setIsProcessing(false);
          return;
        }
        await onUpgrade({
          plan_id: selectedPlan.id,
          payment_gateway: 'bank_transfer',
          payment_transaction_id: String(utrNumber).trim(),
        });
        toast.info(
          `Offline Bank Transfer recorded for ${selectedPlan.plan_name}. Your account will activate once verified by Super Admin.`
        );
        if (refreshSubscription) await refreshSubscription();
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('Upgrade failed:', err);
      toast.error(err?.response?.data?.message || err.message || 'Upgrade failed. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleLogout = (e) => {
    e.preventDefault();
    dispatch(logoutAdmin());
  };

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
      style={{
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'blur(12px)',
        zIndex: 99999,
      }}
    >
      <div
        className="card border-0 shadow-2xl rounded-4 overflow-hidden w-100"
        style={{ maxWidth: '1040px', maxHeight: '95vh', display: 'flex', flexDirection: 'column' }}
      >
        <div
          className="p-4 text-white text-center position-relative"
          style={{
            background: 'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)',
          }}
        >
          <div
            className="d-inline-flex align-items-center justify-content-center bg-white rounded-circle text-danger mb-2 shadow-sm"
            style={{ width: '56px', height: '56px' }}
          >
            <i className="ti ti-lock fs-26"></i>
          </div>

          <h3 className="fw-bold mb-1 text-white">
            {currentPlanName ? `${currentPlanName} Expired` : isTrial ? 'Trial Ended' : 'Subscription Expired'}
          </h3>
          <p className="text-white-50 mb-0 fs-14">
            {isTrial ? 'The free evaluation period for ' : 'The subscription period for '}
            <strong className="text-white">{schoolName}</strong> has ended.
          </p>

          <button
            onClick={handleLogout}
            className="btn btn-sm text-white position-absolute top-0 end-0 m-3 d-flex align-items-center"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.14)',
              border: '1px solid rgba(255, 255, 255, 0.28)',
            }}
          >
            <i className="ti ti-logout me-1"></i>
            <span>Log Out</span>
          </button>
        </div>

        <div className="px-4 py-2 border-bottom border-warning-subtle d-flex align-items-center justify-content-center text-dark fs-13" style={{ backgroundColor: '#fffbeb' }}>
          <i className="ti ti-shield-check text-success fs-18 me-2"></i>
          <span>
            <strong>Your data is 100% safe:</strong> All students, teachers, classes, and fee records are preserved. Online Razorpay payment unlocks your portal immediately.
          </span>
        </div>

        <div className="p-4 overflow-y-auto bg-light flex-grow-1">
          {availableCycles.length > 1 && (
            <div className="d-flex justify-content-center mb-3">
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

          <div className="row g-3 mb-4 pt-2">
            {cyclePlans.map((plan) => {
              const isSelected = Number(selectedPlanId) === Number(plan.id);
              const isLocked = plan.can_switch === false;
              const isCycleLocked =
                plan.lock_code === 'CYCLE_DOWNGRADE_NOT_ALLOWED' ||
                plan.lock_code === 'ACTIVE_CYCLE_SHRINK_NOT_ALLOWED';
              const isPopular = Number(plan.is_popular) === 1;

              return (
                <div className="col-12 col-md-4" key={plan.id}>
                  <div
                    onClick={() => !isLocked && setSelectedPlanId(plan.id)}
                    className={`h-100 p-3 rounded-3 bg-white transition-all position-relative d-flex flex-column ${
                      !isLocked && isSelected ? 'shadow' : 'shadow-sm'
                    }`}
                    style={{
                      cursor: isLocked ? 'not-allowed' : 'pointer',
                      border:
                        isSelected && !isLocked
                          ? '2px solid #4f46e5'
                          : `1px solid ${isLocked ? '#cbd5e1' : '#e2e8f0'}`,
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
                          backgroundColor: plan.is_quota_locked ? '#b45309' : '#64748b',
                          color: '#ffffff',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {plan.is_quota_locked
                          ? 'Quota Locked'
                          : isCycleLocked
                          ? 'Shorter Cycle Locked'
                          : 'Lower Tier Locked'}
                      </span>
                    ) : plan.is_renewal ? (
                      <span
                        className="badge bg-warning text-dark position-absolute"
                        style={{ top: '-10px', left: '16px', fontSize: '10.5px', padding: '4px 10px', borderRadius: '12px', whiteSpace: 'nowrap' }}
                      >
                        ★ RENEW PLAN
                      </span>
                    ) : isPopular ? (
                      <span
                        className="badge bg-primary text-white position-absolute"
                        style={{ top: '-10px', right: '16px', fontSize: '10.5px', padding: '4px 10px', borderRadius: '12px', whiteSpace: 'nowrap' }}
                      >
                        ★ MOST POPULAR
                      </span>
                    ) : null}

                    <div className="d-flex align-items-center justify-content-between mb-2 mt-1">
                      <h6 className="fw-bold text-dark mb-0">{plan.plan_name}</h6>
                      <input
                        type="radio"
                        name="lockout_plan_selection"
                        checked={isSelected && !isLocked}
                        disabled={isLocked}
                        onChange={() => !isLocked && setSelectedPlanId(plan.id)}
                        className="form-check-input"
                      />
                    </div>

                    <div className="mb-2">
                      <span className="fs-22 fw-bold text-dark">
                        ₹{Number(plan.price).toLocaleString('en-IN')}
                      </span>
                      <span className="text-muted fs-12">
                        {' '}
                        / {plan.cycle_meta?.shortLabel || plan.cycle_meta?.label || plan.billing_cycle}
                      </span>
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
                        {plan.lock_reason.replace(/\ba Annual\b/g, 'an Annual')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Payment Method Selector */}
          <div className="bg-white p-3 rounded-3 border">
            <h6 className="fw-bold text-dark mb-3 d-flex align-items-center fs-14">
              <i className="ti ti-credit-card me-2 text-primary"></i>
              Payment Method (Flat Net Price — Zero GST)
            </h6>
            <div className="row g-2">
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
                    name="lockout_payment_gateway"
                    value="razorpay"
                    checked={paymentGateway === 'razorpay'}
                    onChange={(e) => setPaymentGateway(e.target.value)}
                    className="form-check-input me-2"
                  />
                  <div>
                    <div className="fw-semibold text-dark fs-13">Instant Online Payment (Razorpay)</div>
                    <div className="text-muted fs-11">Unlocks portal immediately via UPI, Cards, or NetBanking</div>
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
                    name="lockout_payment_gateway"
                    value="bank_transfer"
                    checked={paymentGateway === 'bank_transfer'}
                    onChange={(e) => setPaymentGateway(e.target.value)}
                    className="form-check-input me-2"
                  />
                  <div>
                    <div className="fw-semibold text-dark fs-13">Direct Bank Transfer (UTR)</div>
                    <div className="text-muted fs-11">Submit corporate transfer UTR for Super Admin approval</div>
                  </div>
                </label>
              </div>
            </div>

            {paymentGateway === 'bank_transfer' && (
              <div className="mt-3 p-3 bg-light rounded-2 border fs-12">
                {activeBankAccount && (
                  <div className="mb-2 text-muted">
                    <strong className="text-dark">{activeBankAccount.bank_name}:</strong> A/C{' '}
                    <span className="font-monospace fw-bold text-dark">{activeBankAccount.account_number}</span> • IFSC{' '}
                    <span className="font-monospace fw-bold text-dark">{activeBankAccount.ifsc_code}</span>
                  </div>
                )}
                <label className="form-label fw-semibold text-dark fs-12 mb-1">
                  UTR / Bank Reference Number <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Enter UTR / NEFT / IMPS reference number"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        <div className="p-3 bg-white border-top d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div>
            <span className="text-muted fs-12">Total Payable (No GST): </span>
            <strong className="fs-18 text-primary fw-bold">
              ₹{selectedPlan ? Number(selectedPlan.price).toLocaleString('en-IN') : 0}
            </strong>
          </div>

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
            ) : isCurrentSelected ? (
              <>
                <i className="ti ti-refresh me-2"></i>
                Renew {selectedPlan?.plan_name} &amp; Reactivate
              </>
            ) : (
              <>
                <i className="ti ti-arrow-up-right me-2"></i>
                Activate {selectedPlan?.plan_name}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrialExpiredLockoutModal;
