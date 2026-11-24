import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getSubscriptionOrderDetails } from '../../../api/subscription.api';
import { useSubscription } from '../../../context/SubscriptionContext';

const PaymentFailure = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { upgradePlans } = useSubscription();

  const orderNo = searchParams.get('order_no') || '';
  const reasonParam = searchParams.get('reason') || '';

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(Boolean(orderNo));

  useEffect(() => {
    let isMounted = true;
    const fetchOrder = async () => {
      if (!orderNo) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await getSubscriptionOrderDetails(orderNo);
        if (!isMounted || !data) return;

        // Safeguard: If webhook fulfilled this order in the background, route straight to success receipt
        if (data.status === 'paid') {
          navigate(`/admin/subscription/payment-success?order_no=${encodeURIComponent(data.order_no)}`, {
            replace: true,
          });
          return;
        }
        setOrder(data);
      } catch {
        // Order details optional on failure screen
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchOrder();
    return () => {
      isMounted = false;
    };
  }, [orderNo, navigate]);

  const isAddonOnly = order?.order_type === 'addon_only';
  const failureMessage =
    reasonParam ||
    order?.failure_reason ||
    'The payment could not be completed or was declined by your bank / payment provider.';

  const restoreSelectedPlanIfNeeded = () => {
    if (order?.plan_id && Array.isArray(upgradePlans) && upgradePlans.length > 0) {
      const matched = upgradePlans.find((p) => Number(p.id) === Number(order.plan_id));
      if (matched) {
        sessionStorage.setItem('selected_subscription_plan', JSON.stringify(matched));
        if (matched.billing_cycle) {
          sessionStorage.setItem('selected_billing_cycle', matched.billing_cycle);
        }
      }
    }
  };

  const handleRetryOnline = () => {
    if (isAddonOnly) {
      navigate('/admin/subscription?tab=addons');
      return;
    }
    restoreSelectedPlanIfNeeded();
    const hasStored = Boolean(sessionStorage.getItem('selected_subscription_plan'));
    navigate(hasStored ? '/admin/subscription/configure' : '/admin/subscription');
  };

  const handleFallbackBankTransfer = () => {
    if (isAddonOnly) {
      navigate('/admin/subscription?tab=addons&gateway=bank_transfer');
      return;
    }
    restoreSelectedPlanIfNeeded();
    const hasStored = Boolean(sessionStorage.getItem('selected_subscription_plan'));
    navigate(
      hasStored
        ? '/admin/subscription/configure?gateway=bank_transfer'
        : '/admin/subscription'
    );
  };

  return (
    <div className="content">
      <div className="row justify-content-center">
        <div className="col-12 col-lg-8 col-xl-7">
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden my-3">
            {/* Failure Header */}
            <div
              className="p-4 p-md-5 text-white text-center"
              style={{
                background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
              }}
            >
              <div
                className="rounded-circle bg-white d-inline-flex align-items-center justify-content-center mb-3 shadow-sm"
                style={{ width: '68px', height: '68px', color: '#dc2626' }}
              >
                <i className="ti ti-alert-triangle-filled fs-36"></i>
              </div>
              <div className="mb-1">
                <span className="badge bg-white text-danger fw-bold px-3 py-1 fs-11 rounded-pill text-uppercase">
                  Transaction Unsuccessful
                </span>
              </div>
              <h3 className="fw-bold text-white mb-2">Payment Could Not Be Completed</h3>
              <p className="text-white-50 fs-14 mb-0 mx-auto" style={{ maxWidth: '520px' }}>
                {failureMessage}
              </p>
            </div>

            <div className="card-body p-4 p-md-5 bg-white">
              {loading ? (
                <div className="text-center py-3 text-muted fs-13">
                  <div className="spinner-border spinner-border-sm text-danger me-2"></div>
                  Checking payment gateway order status...
                </div>
              ) : (
                <>
                  {/* Order Diagnostic Summary */}
                  {(order || orderNo) && (
                    <div className="p-3 rounded-3 bg-light border mb-4">
                      <div className="text-muted fs-11 fw-bold text-uppercase mb-2">
                        Attempted Order Summary
                      </div>
                      <div className="row g-2 fs-13">
                        {orderNo && (
                          <div className="col-12 col-sm-6">
                            <span className="text-muted">Order Reference:</span>{' '}
                            <strong className="font-monospace text-dark">{orderNo}</strong>
                          </div>
                        )}
                        {order?.plan_name && (
                          <div className="col-12 col-sm-6">
                            <span className="text-muted">Package:</span>{' '}
                            <strong className="text-dark">
                              {order.plan_name}
                              {order.cycle_meta?.label || order.billing_cycle
                                ? ` (${order.cycle_meta?.label || order.billing_cycle})`
                                : ''}
                            </strong>
                          </div>
                        )}
                        {isAddonOnly && (
                          <div className="col-12 col-sm-6">
                            <span className="text-muted">Order Type:</span>{' '}
                            <strong className="text-dark">Standalone Add-ons</strong>
                          </div>
                        )}
                        {order?.grand_total !== undefined && (
                          <div className="col-12 col-sm-6">
                            <span className="text-muted">Attempted Amount:</span>{' '}
                            <strong className="text-dark">
                              ₹{Number(order.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </strong>
                          </div>
                        )}
                        {order?.failure_code && (
                          <div className="col-12 col-sm-6">
                            <span className="text-muted">Gateway Code:</span>{' '}
                            <span className="font-monospace text-danger fw-semibold">
                              {order.failure_code}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Reassurance Notice */}
                  <div className="alert alert-info border-0 bg-info-subtle text-dark rounded-3 p-3 mb-4 d-flex align-items-start gap-3">
                    <i className="ti ti-shield-check fs-24 text-primary flex-shrink-0 mt-1"></i>
                    <div className="fs-13">
                      <strong className="d-block mb-1">Your School Data &amp; Active Subscription Are Safe</strong>
                      <span className="text-dark">
                        No changes were made to your existing school subscription or records. If any amount was
                        temporarily debited from your bank account, uncaptured payments are automatically refunded
                        by Razorpay &amp; your bank within <strong>5–7 business days</strong>.
                      </span>
                    </div>
                  </div>

                  {/* Primary Recovery Actions */}
                  <div className="d-grid gap-2 mb-3">
                    <button
                      type="button"
                      onClick={handleRetryOnline}
                      className="btn btn-primary py-2 px-3 fw-bold fs-14 d-inline-flex align-items-center justify-content-center shadow-sm"
                    >
                      <i className="ti ti-refresh me-2 fs-18"></i>
                      <span>Retry Online Payment (UPI / Card / NetBanking)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleFallbackBankTransfer}
                      className="btn btn-outline-dark py-2 px-3 fw-semibold fs-13 d-inline-flex align-items-center justify-content-center"
                    >
                      <i className="ti ti-building-bank me-2 fs-17"></i>
                      <span>Pay via Direct Bank Transfer (NEFT / RTGS / UTR)</span>
                    </button>
                  </div>

                  <div className="d-flex flex-wrap align-items-center justify-content-between pt-3 border-top fs-13 gap-2">
                    <Link
                      to="/admin/subscription"
                      className="text-muted text-decoration-none fw-semibold d-inline-flex align-items-center"
                    >
                      <i className="ti ti-arrow-left me-2"></i>
                      Back to Subscription &amp; Billing
                    </Link>

                    <Link
                      to="/admin/help-support"
                      className="text-primary text-decoration-none fw-semibold d-inline-flex align-items-center"
                    >
                      <i className="ti ti-headset me-2"></i>
                      Need Help? Contact Support
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailure;
