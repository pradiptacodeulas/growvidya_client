import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { loadRazorpayScript } from '../../utils/loadRazorpay';
import { createSubscriptionOrder, verifySubscriptionPayment } from '../../api/subscription.api';

const UpgradeModal = ({
  isOpen,
  onClose,
  plans = [],
  currentPlanId,
  onUpgrade,
  refreshSubscription,
  isLockout = false,
}) => {
  const { user } = useSelector((state) => state.auth || {});
  const [selectedPlanId, setSelectedPlanId] = useState(() => plans[0]?.id || null);

  const [paymentGateway, setPaymentGateway] = useState('razorpay');
  const [utrNumber, setUtrNumber] = useState('');
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

      if (paymentGateway === 'razorpay') {
        // 1. Ensure Razorpay Checkout script is loaded
        const isLoaded = await loadRazorpayScript();
        if (!isLoaded) {
          toast.error('Could not connect to Razorpay SDK. Please check your internet connection.');
          setIsProcessing(false);
          return;
        }

        // 2. Create order on the backend
        const orderRes = await createSubscriptionOrder(selectedPlan.id);
        const orderData = orderRes?.data || orderRes;

        if (!orderData?.order_id) {
          throw new Error(orderRes?.message || 'Failed to initialize payment order with gateway.');
        }

        // 3. Configure and trigger Razorpay Checkout
        const options = {
          key: orderData.key_id,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: 'GrowVidya School ERP',
          description: `License Upgrade: ${selectedPlan.plan_name}`,
          order_id: orderData.order_id,
          prefill: {
            name: user?.name || user?.schoolName || user?.school_name || 'School Admin',
            email: user?.email || '',
            contact: user?.phone || user?.mobile || '',
          },
          notes: {
            school_id: user?.schoolId || user?.school_id || '',
            plan_id: selectedPlan.id,
          },
          theme: {
            color: '#6366f1',
          },
          handler: async function (response) {
            try {
              setIsProcessing(true);
              const verifyRes = await verifySubscriptionPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan_id: selectedPlan.id,
              });

              toast.success(
                verifyRes?.message ||
                  `🎉 Congratulations! Your school has been upgraded to ${selectedPlan.plan_name}. All features are unlocked!`
              );
              if (onClose) onClose();
              if (refreshSubscription) await refreshSubscription();
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
        // Direct bank transfer / offline request
        if (!utrNumber || String(utrNumber).trim().length < 4) {
          toast.error('Please enter the Bank Transfer reference or UTR number from your payment receipt.');
          setIsProcessing(false);
          return;
        }

        const res = await onUpgrade({
          plan_id: selectedPlan.id,
          amount_paid: selectedPlan.price,
          payment_gateway: 'bank_transfer',
          payment_transaction_id: String(utrNumber).trim(),
        });

        toast.info(
          res?.message ||
            `Offline payment request submitted for ${selectedPlan.plan_name}. Platform administrators will verify and activate your license within 24 hours.`
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
                        paymentGateway === 'razorpay'
                          ? 'border-primary bg-primary-transparent'
                          : 'border-200'
                      }`}
                      style={{ cursor: 'pointer' }}
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
                        <div className="text-muted fs-11">Instant license activation via UPI, Cards, & NetBanking</div>
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
                        <div className="fw-semibold text-dark fs-13">Direct Bank Transfer / Offline</div>
                        <div className="text-muted fs-11">Submit offline corporate transfer request</div>
                      </div>
                    </label>
                  </div>
                </div>

                {paymentGateway === 'bank_transfer' && (
                  <div className="mt-3 p-3 bg-light rounded-3 border">
                    <div className="fw-semibold text-dark fs-13 mb-2 d-flex align-items-center">
                      <i className="ti ti-building-bank me-2 text-primary"></i>
                      Official Bank Account Details for NEFT / RTGS / IMPS / UPI:
                    </div>
                    <div className="row g-2 fs-12 text-secondary mb-3">
                      <div className="col-12 col-sm-6">
                        <div><strong className="text-dark">Beneficiary Name:</strong> GrowVidya EdTech Solutions</div>
                        <div><strong className="text-dark">Account Number:</strong> 50200098765432</div>
                      </div>
                      <div className="col-12 col-sm-6">
                        <div><strong className="text-dark">Bank & Branch:</strong> HDFC Bank, Main Branch</div>
                        <div><strong className="text-dark">IFSC Code:</strong> HDFC0001234</div>
                        <div><strong className="text-dark">UPI VPA:</strong> billing@growvidya</div>
                      </div>
                    </div>

                    <div>
                      <label className="form-label fs-12 fw-semibold text-dark mb-1">
                        Bank Transfer Reference / UTR Number <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="e.g. UTR202609139876 or IMPS Reference ID"
                        value={utrNumber}
                        onChange={(e) => setUtrNumber(e.target.value)}
                      />
                      <span className="text-muted fs-11 mt-1 d-block">
                        Enter the transaction reference from your payment receipt for ₹{Number(selectedPlan?.price).toLocaleString('en-IN')}. Platform administrators will verify and activate your license within 24 hours.
                      </span>
                    </div>
                  </div>
                )}
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
                  Processing...
                </>
              ) : paymentGateway === 'bank_transfer' ? (
                <>
                  <i className="ti ti-send me-2"></i>
                  Submit Bank Transfer Request (₹{Number(selectedPlan.price).toLocaleString('en-IN')})
                </>
              ) : (
                <>
                  <i className="ti ti-lock-open me-2"></i>
                  Pay & Activate License (₹{Number(selectedPlan.price).toLocaleString('en-IN')})
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
