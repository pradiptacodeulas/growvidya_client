import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logoutAdmin } from '../../store/slices/authSlice';
import { toast } from 'react-toastify';

const TrialExpiredLockoutModal = ({
  subscription,
  plans = [],
  onUpgrade,
}) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [selectedPlanId, setSelectedPlanId] = useState(() => plans[0]?.id || null);
  const [paymentGateway, setPaymentGateway] = useState('razorpay_simulation');
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedPlan = plans.find((p) => p.id === Number(selectedPlanId)) || plans[0];
  const schoolName = user?.schoolName || user?.school_name || 'Your School';

  const handleConfirmUpgrade = async () => {
    if (!selectedPlan) {
      toast.error('Please select a plan to activate.');
      return;
    }

    try {
      setIsProcessing(true);
      await onUpgrade({
        plan_id: selectedPlan.id,
        amount_paid: selectedPlan.price,
        payment_gateway: paymentGateway,
        payment_transaction_id: `TXN_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
      });
      toast.success(`🎉 Congratulations! Your school has been upgraded to ${selectedPlan.plan_name}. All features are unlocked!`);
    } catch (err) {
      console.error('Upgrade failed:', err);
      toast.error(err?.response?.data?.message || err.message || 'Upgrade failed. Please try again.');
    } finally {
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
        style={{ maxWidth: '1000px', maxHeight: '95vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Top Warning Banner */}
        <div
          className="p-4 text-white text-center position-relative"
          style={{
            background: 'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)',
          }}
        >
          <div
            className="d-inline-flex align-items-center justify-content-center bg-white rounded-circle text-danger mb-2 shadow-sm"
            style={{ width: '60px', height: '60px' }}
          >
            <i className="ti ti-lock fs-28"></i>
          </div>

          <h3 className="fw-bold mb-1 text-white">14-Day Free Trial Ended</h3>
          <p className="text-white-50 mb-0 fs-14">
            The free evaluation period for <strong className="text-white">{schoolName}</strong> has concluded.
          </p>

          <button
            onClick={handleLogout}
            className="btn btn-sm btn-outline-light position-absolute top-0 end-0 m-3 d-flex align-items-center"
            title="Log out of current session"
          >
            <i className="ti ti-logout me-1"></i>
            <span>Log Out</span>
          </button>
        </div>

        {/* Informative Assurance Note */}
        <div className="bg-amber-50 px-4 py-2 border-bottom border-warning-subtle d-flex align-items-center justify-content-center text-dark fs-13" style={{ backgroundColor: '#fffbeb' }}>
          <i className="ti ti-shield-check text-success fs-18 me-2"></i>
          <span>
            <strong>Your data is 100% safe:</strong> All students, teachers, classes, and settings are preserved. Reactivate immediately by selecting an annual license below.
          </span>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 overflow-y-auto bg-light flex-grow-1">
          <div className="text-center mb-3">
            <h5 className="fw-bold text-dark mb-1">Choose an Annual Plan to Unlock Full Access</h5>
            <p className="text-muted fs-13">Each plan includes cloud hosting, regular updates, and automated database backups.</p>
          </div>

          {/* Plans Grid */}
          <div className="row g-3 mb-4">
            {plans.map((plan) => {
              const isSelected = Number(selectedPlanId) === Number(plan.id);
              const isPopular = plan.plan_code?.includes('growth') || plan.id === 2;

              return (
                <div className="col-12 col-md-4" key={plan.id}>
                  <div
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`h-100 p-3 rounded-3 bg-white transition-all position-relative ${
                      isSelected
                        ? 'border-2 border-primary shadow-md'
                        : 'border border-200 shadow-sm'
                    }`}
                    style={{
                      cursor: 'pointer',
                      border: isSelected ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {isPopular && (
                      <span
                        className="badge bg-primary text-white position-absolute"
                        style={{
                          top: '-10px',
                          right: '16px',
                          fontSize: '11px',
                          padding: '4px 10px',
                          borderRadius: '12px',
                        }}
                      >
                        ★ RECOMMENDED
                      </span>
                    )}

                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <h6 className="fw-bold text-dark mb-0">{plan.plan_name}</h6>
                      <input
                        type="radio"
                        name="lockout_plan_selection"
                        checked={isSelected}
                        onChange={() => setSelectedPlanId(plan.id)}
                        className="form-check-input"
                      />
                    </div>

                    <div className="mb-2">
                      <span className="fs-22 fw-bold text-dark">
                        ₹{Number(plan.price).toLocaleString('en-IN')}
                      </span>
                      <span className="text-muted fs-12"> / year</span>
                    </div>

                    <p className="text-muted fs-12 mb-3" style={{ minHeight: '34px' }}>
                      {plan.description}
                    </p>

                    <div className="border-top pt-2 fs-12">
                      <div className="d-flex justify-content-between py-1 text-secondary">
                        <span>Students:</span>
                        <strong className="text-dark">
                          {plan.max_students > 0 ? `${plan.max_students} Max` : 'Unlimited'}
                        </strong>
                      </div>
                      <div className="d-flex justify-content-between py-1 text-secondary">
                        <span>Teachers:</span>
                        <strong className="text-dark">
                          {plan.max_teachers > 0 ? `${plan.max_teachers} Max` : 'Unlimited'}
                        </strong>
                      </div>
                      <div className="d-flex justify-content-between py-1 text-secondary">
                        <span>Validity:</span>
                        <strong className="text-success">365 Days</strong>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Payment Method Selector */}
          <div className="bg-white p-3 rounded-3 border mb-3">
            <h6 className="fw-bold text-dark mb-3 d-flex align-items-center fs-14">
              <i className="ti ti-credit-card me-2 text-primary"></i>
              Payment Gateway
            </h6>
            <div className="row g-2">
              <div className="col-12 col-md-6">
                <label
                  className={`d-flex align-items-center p-2.5 border rounded-3 cursor-pointer w-100 mb-0 ${
                    paymentGateway === 'razorpay_simulation'
                      ? 'border-primary bg-primary-transparent'
                      : 'border-200'
                  }`}
                  style={{ cursor: 'pointer' }}
                >
                  <input
                    type="radio"
                    name="lockout_payment_gateway"
                    value="razorpay_simulation"
                    checked={paymentGateway === 'razorpay_simulation'}
                    onChange={(e) => setPaymentGateway(e.target.value)}
                    className="form-check-input me-2"
                  />
                  <div>
                    <div className="fw-semibold text-dark fs-13">Instant Online Payment (UPI / Card / NetBanking)</div>
                    <div className="text-muted fs-11">Unlocks portal within seconds with digital invoice</div>
                  </div>
                </label>
              </div>

              <div className="col-12 col-md-6">
                <label
                  className={`d-flex align-items-center p-2.5 border rounded-3 cursor-pointer w-100 mb-0 ${
                    paymentGateway === 'bank_transfer'
                      ? 'border-primary bg-primary-transparent'
                      : 'border-200'
                  }`}
                  style={{ cursor: 'pointer' }}
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
                    <div className="fw-semibold text-dark fs-13">Direct Bank Transfer / NEFT</div>
                    <div className="text-muted fs-11">Simulate corporate transfer confirmation</div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-3 bg-white border-top d-flex align-items-center justify-content-between">
          <div>
            <span className="text-muted fs-12">Plan Amount Due: </span>
            <strong className="fs-18 text-primary fw-bold">
              ₹{selectedPlan ? Number(selectedPlan.price).toLocaleString('en-IN') : 0}
            </strong>
            <span className="text-muted fs-12"> / annual</span>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-primary px-4 py-2 fw-semibold d-inline-flex align-items-center shadow-sm"
              onClick={handleConfirmUpgrade}
              disabled={isProcessing || !selectedPlan}
            >
              {isProcessing ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Processing Payment & Reactivating...
                </>
              ) : (
                <>
                  <i className="ti ti-check me-2"></i>
                  Pay & Reactivate School Portal
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrialExpiredLockoutModal;
