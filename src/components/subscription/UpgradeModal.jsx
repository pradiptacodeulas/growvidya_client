import React, { useState } from 'react';
import { toast } from 'react-toastify';

const UpgradeModal = ({
  isOpen,
  onClose,
  plans = [],
  currentPlanId,
  onUpgrade,
  isLockout = false,
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState(() => plans[0]?.id || null);

  const [paymentGateway, setPaymentGateway] = useState('razorpay_simulation');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const selectedPlan = plans.find((p) => p.id === Number(selectedPlanId)) || plans[0];

  const handleConfirmUpgrade = async () => {
    if (!selectedPlan) {
      toast.error('Please select a plan to continue.');
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
      toast.success(`🎉 Congratulations! Your school has been upgraded to ${selectedPlan.plan_name}.`);
      if (onClose) onClose();
    } catch (err) {
      console.error('Upgrade failed:', err);
      toast.error(err?.response?.data?.message || err.message || 'Upgrade payment failed. Please try again.');
    } finally {
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
                  {isLockout ? 'Reactivate Your School Portal' : 'Upgrade to Annual License'}
                </h5>
                <p className="text-white-50 mb-0 fs-13">
                  Select your school plan for unlimited cloud access, regular updates & premium support.
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
          <div className="modal-body p-4 bg-light">
            {/* Plan selection grid */}
            <div className="row g-3 mb-4">
              {plans.map((plan) => {
                const isSelected = Number(selectedPlanId) === Number(plan.id);
                const isPopular = plan.plan_code?.includes('growth') || plan.id === 2;

                return (
                  <div className="col-12 col-md-4" key={plan.id}>
                    <div
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`h-100 p-3 rounded-3 border transition-all cursor-pointer position-relative ${
                        isSelected
                          ? 'border-primary bg-white shadow-sm'
                          : 'border-200 bg-white hover-shadow'
                      }`}
                      style={{
                        cursor: 'pointer',
                        borderWidth: isSelected ? '2px' : '1px',
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
                          ★ MOST POPULAR
                        </span>
                      )}

                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <h6 className="fw-bold text-dark mb-0">{plan.plan_name}</h6>
                        <input
                          type="radio"
                          name="plan_selection"
                          checked={isSelected}
                          onChange={() => setSelectedPlanId(plan.id)}
                          className="form-check-input"
                        />
                      </div>

                      <div className="mb-2">
                        <span className="fs-24 fw-bold text-dark">
                          ₹{Number(plan.price).toLocaleString('en-IN')}
                        </span>
                        <span className="text-muted fs-12"> / year</span>
                      </div>

                      <p className="text-muted fs-12 mb-3" style={{ minHeight: '36px' }}>
                        {plan.description}
                      </p>

                      <div className="border-top pt-2 fs-12">
                        <div className="d-flex justify-content-between py-1 text-secondary">
                          <span>Student Quota:</span>
                          <strong className="text-dark">
                            {plan.max_students > 0 ? `${plan.max_students} Students` : 'Unlimited'}
                          </strong>
                        </div>
                        <div className="d-flex justify-content-between py-1 text-secondary">
                          <span>Teacher Quota:</span>
                          <strong className="text-dark">
                            {plan.max_teachers > 0 ? `${plan.max_teachers} Staff` : 'Unlimited'}
                          </strong>
                        </div>
                        <div className="d-flex justify-content-between py-1 text-secondary">
                          <span>Billing Cycle:</span>
                          <strong className="text-dark text-capitalize">{plan.billing_cycle || 'Annual'}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Payment Method Selector */}
            {selectedPlan && (
              <div className="bg-white p-3 rounded-3 border mb-3">
                <h6 className="fw-bold text-dark mb-3 d-flex align-items-center">
                  <i className="ti ti-credit-card me-2 text-primary"></i>
                  Payment Method
                </h6>
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label
                      className={`d-flex align-items-center p-3 border rounded-3 cursor-pointer w-100 mb-0 ${
                        paymentGateway === 'razorpay_simulation'
                          ? 'border-primary bg-primary-transparent'
                          : 'border-200'
                      }`}
                      style={{ cursor: 'pointer' }}
                    >
                      <input
                        type="radio"
                        name="payment_gateway"
                        value="razorpay_simulation"
                        checked={paymentGateway === 'razorpay_simulation'}
                        onChange={(e) => setPaymentGateway(e.target.value)}
                        className="form-check-input me-3"
                      />
                      <div>
                        <div className="fw-semibold text-dark fs-13">Online Instant Checkout (UPI / Cards / NetBanking)</div>
                        <div className="text-muted fs-11">Instant license activation with immediate digital invoice</div>
                      </div>
                    </label>
                  </div>

                  <div className="col-12 col-md-6">
                    <label
                      className={`d-flex align-items-center p-3 border rounded-3 cursor-pointer w-100 mb-0 ${
                        paymentGateway === 'bank_transfer'
                          ? 'border-primary bg-primary-transparent'
                          : 'border-200'
                      }`}
                      style={{ cursor: 'pointer' }}
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
                        <div className="fw-semibold text-dark fs-13">Direct Bank Transfer / NEFT</div>
                        <div className="text-muted fs-11">Simulate corporate transfer confirmation</div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Summary Banner */}
            {selectedPlan && (
              <div className="d-flex align-items-center justify-content-between p-3 rounded-3 bg-white border">
                <div>
                  <div className="text-muted fs-12">Selected Plan:</div>
                  <div className="fw-bold text-dark fs-15">
                    {selectedPlan.plan_name} — ₹{Number(selectedPlan.price).toLocaleString('en-IN')}{' '}
                    <span className="fw-normal text-muted fs-12">(Annual License + 365 Days Access)</span>
                  </div>
                </div>
                <div className="text-end">
                  <div className="text-muted fs-11">Total Due Today</div>
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
                className="btn btn-outline-secondary px-4 py-2"
                onClick={onClose}
                disabled={isProcessing}
              >
                Cancel
              </button>
            ) : (
              <div className="text-muted fs-12 d-flex align-items-center">
                <i className="ti ti-shield-check text-success fs-16 me-1"></i>
                All your existing school data will immediately unlock upon upgrade.
              </div>
            )}

            <button
              type="button"
              className="btn btn-primary px-4 py-2 fw-semibold d-inline-flex align-items-center shadow-sm"
              onClick={handleConfirmUpgrade}
              disabled={isProcessing || !selectedPlan}
            >
              {isProcessing ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Activating License...
                </>
              ) : (
                <>
                  <i className="ti ti-lock-open me-2"></i>
                  Confirm & Activate Annual License
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
