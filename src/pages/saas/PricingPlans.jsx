import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import saasApi from '../../api/saas.api';
import logoDark from '../../assets/logo_dark.png';

const PricingPlans = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState('monthly');

  // Modal for dummy payment
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState(null);
  const [simulatingPayment, setSimulatingPayment] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await saasApi.getPlans();
      setPlans(res?.data || []);
    } catch (err) {
      console.error('Failed to load plans:', err);
      toast.error('Failed to load subscription plans.');
    } finally {
      setLoading(false);
    }
  };

  // Extract SMS Allocation dynamically from database subscription items
  const getSmsAllocation = (plan) => {
    if (!plan?.items || !Array.isArray(plan.items)) return null;
    const smsItem = plan.items.find(
      (it) =>
        (it.item_code && it.item_code.toUpperCase().includes('SMS')) ||
        (it.item_name && it.item_name.toLowerCase().includes('sms'))
    );
    if (!smsItem) return null;
    const limit = smsItem.quota_limit;
    const isIncluded = smsItem.item_type === 'included' || parseFloat(smsItem.price) === 0;
    return {
      item: smsItem,
      limit: limit ? Number(limit).toLocaleString() : null,
      label: limit
        ? `${Number(limit).toLocaleString()} SMS ${
            isIncluded ? 'Included' : `(Add-on: ₹${Number(smsItem.price).toLocaleString('en-IN')})`
          }`
        : isIncluded
        ? 'SMS Included'
        : `Add-on: ₹${Number(smsItem.price).toLocaleString('en-IN')}`,
      isIncluded,
    };
  };

  // Extract Push Notification Allocation dynamically from database subscription items
  const getPushAllocation = (plan) => {
    if (!plan?.items || !Array.isArray(plan.items)) return null;
    const pushItem = plan.items.find(
      (it) =>
        it.item_code === 'PUSH_NOTIF' ||
        (it.item_name && it.item_name.toLowerCase().includes('push'))
    );
    if (!pushItem) return null;
    const limit = pushItem.quota_limit;
    return {
      item: pushItem,
      limit: limit ? Number(limit).toLocaleString() : null,
      label: limit ? `${Number(limit).toLocaleString()} Notifications` : 'Unlimited Notifications',
      isUnlimited: !limit,
    };
  };

  // Action 1: Start 14-Day Free Trial
  const handleStartTrial = (plan) => {
    navigate('/register?step=5', {
      state: {
        plan,
        isTrial: true,
        step: 5,
      },
    });
  };

  // Action 2: Choose Plan & Proceed to Registration
  const handleOpenBuyModal = (plan) => {
    navigate('/register?step=5', {
      state: {
        plan,
        isTrial: false,
        step: 5,
      },
    });
  };

  // Confirm Simulated Payment (Legacy fallback)
  const handleConfirmSimulatedPayment = () => {
    if (!selectedPlanForPayment) return;
    navigate('/register', {
      state: {
        plan: selectedPlanForPayment,
        isTrial: false,
      },
    });
  };


  return (
    <div className="bg-light min-vh-100 d-flex flex-column">
      {/* Full-Width Modern Header */}
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
            <Link to="/account/login/adminlogin" className="btn btn-outline-primary btn-sm fw-semibold px-3 py-2">
              <i className="ti ti-lock me-1"></i> Admin Login
            </Link>
            <Link to="/" className="btn btn-light btn-sm text-muted py-2">
              <i className="ti ti-arrow-left me-1"></i> Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow-1 py-4 py-md-5">
        <div className="container-fluid px-3 px-md-5" style={{ maxWidth: '1440px' }}>
          {/* Hero Banner */}
          <div className="text-center mb-5">
            <div className="d-inline-flex align-items-center gap-2 bg-success-subtle text-success border border-success-subtle rounded-pill px-3 py-1 fs-12 fw-semibold mb-3">
              <i className="ti ti-sparkles fs-14"></i> DEDICATED 14-DAY FREE TRIAL • NO CREDIT CARD REQUIRED
            </div>
            <h1 className="fw-bold text-dark display-6 mb-2">Simple, Transparent School Pricing</h1>
            <p className="text-muted fs-15 mx-auto" style={{ maxWidth: '680px' }}>
              Everything your institution needs to manage admissions, attendance, fees, routine, and staff.
              Choose our dedicated 14-Day Free Trial plan or purchase an annual license for immediate full access.
            </p>
          </div>

          {/* Two Subscription Options: Monthly vs Annual Billing Toggle */}
          <div className="d-flex flex-column align-items-center mb-5">
            <div className="bg-white p-1.5 rounded-pill d-inline-flex border shadow-sm">
              <button
                type="button"
                className={`btn rounded-pill px-4 py-2 fs-14 fw-semibold transition-all ${
                  billingCycle === 'monthly'
                    ? 'btn-primary text-white shadow-sm'
                    : 'btn-light text-dark'
                }`}
                onClick={() => setBillingCycle('monthly')}
              >
                <i className="ti ti-calendar me-1"></i> Monthly Subscription
              </button>
              <button
                type="button"
                className={`btn rounded-pill px-4 py-2 fs-14 fw-semibold transition-all ${
                  billingCycle === 'annual'
                    ? 'btn-primary text-white shadow-sm'
                    : 'btn-light text-dark'
                }`}
                onClick={() => setBillingCycle('annual')}
              >
                <i className="ti ti-calendar-event me-1"></i> Annual Subscription
                <span className="badge bg-success text-white ms-2 fs-11">Save ~20%</span>
              </button>
            </div>
            <div className="text-muted fs-13 mt-2 text-center">
              Showing <strong>{billingCycle === 'monthly' ? 'Monthly' : 'Annual'}</strong> packages with live database allocations.
            </div>
          </div>

          {/* Pricing Cards */}
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary me-2" role="status"></div>
              <span className="text-muted fs-14">Loading subscription plans...</span>
            </div>
          ) : (
            <>
              <div className="row g-4 justify-content-center align-items-stretch mb-4">
                {plans
                  .filter((p) => p.billing_cycle === billingCycle)
                  .map((plan) => {
                    const isGrowth = (plan.plan_code || '').toLowerCase().includes('growth') || plan.id === 2 || plan.id === 8;
                    const isEnterprise = (plan.plan_code || '').toLowerCase().includes('enterprise') || plan.id === 3 || plan.id === 9;
                    const smsInfo = getSmsAllocation(plan);
                    const pushInfo = getPushAllocation(plan);

                    return (
                      <div key={plan.id} className="col-xl-4 col-lg-6 col-md-6 d-flex">
                        <div
                          className={`card w-100 border-2 rounded-3 shadow-sm transition-all position-relative d-flex flex-column ${
                            isGrowth
                              ? 'border-primary shadow'
                              : isEnterprise
                              ? 'border-dark-subtle'
                              : 'border-light-subtle'
                          }`}
                        >
                          {/* Top Badges */}
                          {isGrowth && (
                            <div className="position-absolute top-0 start-50 translate-middle">
                              <span className="badge rounded-pill bg-primary px-3 py-1 fs-11 fw-bold shadow-sm">
                                ★ MOST POPULAR
                              </span>
                            </div>
                          )}
                          {isEnterprise && (
                            <div className="position-absolute top-0 start-50 translate-middle">
                              <span className="badge rounded-pill bg-dark px-3 py-1 fs-11 fw-bold shadow-sm">
                                ENTERPRISE GRADE
                              </span>
                            </div>
                          )}

                          <div className="card-body p-4 d-flex flex-column">
                            <div className="mb-2">
                              <h4 className="fw-bold text-dark mb-1 fs-18">{plan.plan_name}</h4>
                              <p className="text-muted fs-13 mb-0" style={{ minHeight: '40px' }}>
                                {plan.description}
                              </p>
                            </div>

                            {/* Price Display */}
                            <div className="my-3 pb-3 border-bottom">
                              <div className="d-flex align-items-baseline gap-1">
                                <span className="display-6 fw-bold text-primary">
                                  ₹{Number(plan.price).toLocaleString('en-IN')}
                                </span>
                                <span className="text-muted fs-13 fw-semibold">
                                  / {plan.billing_cycle === 'annual' ? 'year' : 'month'}
                                </span>
                              </div>
                              <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2 py-1 fs-11 fw-semibold mt-1">
                                <i className="ti ti-shield-check me-1"></i>
                                {plan.billing_cycle === 'annual' ? 'Annual School License' : 'Monthly School License'}
                              </span>
                            </div>

                            {/* Resource Allocation Box (SMS & Push Notifications) */}
                            <div className="bg-light p-3 rounded-3 border mb-3">
                              <div className="fw-semibold text-dark fs-12 mb-2 text-uppercase d-flex align-items-center">
                                <i className="ti ti-chart-arrows me-1 text-primary"></i> Resource Allocations
                              </div>

                              {/* SMS Allocation */}
                              <div className="d-flex align-items-center gap-2 py-1 fs-13">
                                <i className="ti ti-message-dots text-primary fs-17"></i>
                                <div>
                                  <span className="text-muted">SMS Allocation:</span>{' '}
                                  <strong className="text-dark">
                                    {smsInfo ? smsInfo.label : 'Not Included'}
                                  </strong>
                                </div>
                              </div>

                              {/* Push Notification Allocation */}
                              <div className="d-flex align-items-center gap-2 py-1 fs-13">
                                <i className="ti ti-bell-ringing text-success fs-17"></i>
                                <div>
                                  <span className="text-muted">Push Notification:</span>{' '}
                                  <strong className="text-dark">
                                    {pushInfo ? pushInfo.label : 'Not Included'}
                                  </strong>
                                </div>
                              </div>
                            </div>

                            {/* Plan Limits & Features */}
                            <div className="mb-4 flex-grow-1">
                              <div className="fw-semibold text-dark fs-12 mb-2 text-uppercase">Capacity & Features:</div>
                              <ul className="list-unstyled fs-13 mb-0">
                                <li className="mb-2 d-flex align-items-center">
                                  <i className="ti ti-users text-primary me-2 fs-16"></i>
                                  <span>
                                    <strong>{plan.max_students > 0 ? `Up to ${plan.max_students.toLocaleString()}` : 'Unlimited'}</strong> Students
                                  </span>
                                </li>
                                <li className="mb-2 d-flex align-items-center">
                                  <i className="ti ti-user-check text-primary me-2 fs-16"></i>
                                  <span>
                                    <strong>{plan.max_teachers > 0 ? `Up to ${plan.max_teachers.toLocaleString()}` : 'Unlimited'}</strong> Staff & Teachers
                                  </span>
                                </li>
                                <li className="mb-2 d-flex align-items-center">
                                  <i className="ti ti-check text-success me-2 fs-16"></i>
                                  <span>Attendance & Class Routine</span>
                                </li>
                                <li className="mb-2 d-flex align-items-center">
                                  <i className="ti ti-check text-success me-2 fs-16"></i>
                                  <span>Student & Parent Portal</span>
                                </li>
                                <li className="mb-2 d-flex align-items-center">
                                  <i className="ti ti-check text-success me-2 fs-16"></i>
                                  <span>Fee Structures & Invoicing</span>
                                </li>
                                {/* Other dynamic items from database */}
                                {(plan.items || [])
                                  .filter(
                                    (it) =>
                                      it.item_code !== 'PUSH_NOTIF' &&
                                      !it.item_code?.toUpperCase().includes('SMS') &&
                                      it.item_code !== 'EMAIL_ALERTS'
                                  )
                                  .map((it) => (
                                    <li key={it.id} className="mb-2 d-flex align-items-center">
                                      <i
                                        className={`ti ${
                                          it.item_type === 'included' || parseFloat(it.price) === 0
                                            ? 'ti-check text-success'
                                            : 'ti-plus text-primary'
                                        } me-2 fs-16`}
                                      ></i>
                                      <span>
                                        {it.item_name}{' '}
                                        {it.item_type === 'addon' && parseFloat(it.price) > 0 && (
                                          <span className="text-muted">
                                            (Add-on: ₹{Number(it.price).toLocaleString('en-IN')})
                                          </span>
                                        )}
                                      </span>
                                    </li>
                                  ))}
                              </ul>
                            </div>

                            {/* Action Button */}
                            <div className="d-flex flex-column mt-auto pt-2">
                              <button
                                type="button"
                                onClick={() => handleOpenBuyModal(plan)}
                                className={`btn py-2 fw-semibold d-flex align-items-center justify-content-center shadow-sm w-100 ${
                                  isGrowth ? 'btn-primary' : 'btn-outline-primary'
                                }`}
                              >
                                <i className="ti ti-credit-card me-1"></i> Choose {plan.plan_name} (₹{Number(plan.price).toLocaleString('en-IN')})
                              </button>
                              <div className="text-center text-muted fs-11 mt-1">
                                {plan.billing_cycle === 'annual' ? 'Billed Annually' : 'Billed Monthly'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Dedicated 14-Day Free Evaluation Trial Banner */}
              {(() => {
                const trialPlan = plans.find(
                  (p) => p.billing_cycle === 'trial' || parseFloat(p.price) === 0
                );
                if (!trialPlan) return null;
                const trialSms = getSmsAllocation(trialPlan);
                const trialPush = getPushAllocation(trialPlan);

                return (
                  <div className="mb-5">
                    <div className="p-4 rounded-3 border-2 border-success bg-white shadow-sm">
                      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                        <div className="d-flex align-items-center gap-3">
                          <div className="p-3 bg-success-subtle text-success rounded-circle">
                            <i className="ti ti-gift fs-28"></i>
                          </div>
                          <div>
                            <div className="d-flex align-items-center gap-2">
                              <h5 className="fw-bold text-dark mb-0 fs-18">
                                {trialPlan.plan_name}
                              </h5>
                              <span className="badge bg-success text-white px-2 py-0.5 fs-11">
                                14-DAY FULL ACCESS
                              </span>
                            </div>
                            <p className="text-muted fs-13 mb-0 mt-1">
                              Try the full institutional suite with your staff and students for 14 days without any credit card.
                            </p>
                          </div>
                        </div>

                        <div className="d-flex flex-wrap align-items-center gap-3">
                          <div className="d-flex align-items-center gap-2 bg-light px-3 py-2 rounded border fs-12">
                            <i className="ti ti-bell-ringing text-success fs-16"></i>
                            <span>
                              Push: <strong>{trialPush ? trialPush.label : '1,000 Notifications'}</strong>
                            </span>
                          </div>
                          <div className="d-flex align-items-center gap-2 bg-light px-3 py-2 rounded border fs-12">
                            <i className="ti ti-message-dots text-primary fs-16"></i>
                            <span>
                              SMS: <strong>{trialSms ? trialSms.label : '500 SMS'}</strong>
                            </span>
                          </div>
                          <div className="text-end">
                            <span className="fs-24 fw-bold text-success">FREE</span>
                            <span className="text-muted fs-12 d-block">/ 14 Days</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleStartTrial(trialPlan)}
                            className="btn btn-success px-4 py-2 fw-semibold shadow-sm"
                          >
                            <i className="ti ti-player-play me-1"></i> Start 14-Day Free Trial
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </>
          )}

          {/* Value Proposition Callout */}
          <div className="row g-3 justify-content-center mt-2">
            <div className="col-md-4 text-center">
              <div className="p-3 bg-white rounded border">
                <i className="ti ti-shield-check text-primary fs-2 mb-2"></i>
                <h6 className="fw-bold mb-1">Risk-Free 14-Day Trial</h6>
                <p className="text-muted fs-12 mb-0">
                  Try the full platform with your team for 14 days without any credit card or commitments.
                </p>
              </div>
            </div>
            <div className="col-md-4 text-center">
              <div className="p-3 bg-white rounded border">
                <i className="ti ti-clock-bolt text-primary fs-2 mb-2"></i>
                <h6 className="fw-bold mb-1">Instant Activation</h6>
                <p className="text-muted fs-12 mb-0">
                  Complete the short setup wizard and access your school portal in less than 2 minutes.
                </p>
              </div>
            </div>
            <div className="col-md-4 text-center">
              <div className="p-3 bg-white rounded border">
                <i className="ti ti-database-check text-primary fs-2 mb-2"></i>
                <h6 className="fw-bold mb-1">Isolated & Secure Data</h6>
                <p className="text-muted fs-12 mb-0">
                  Dedicated school data isolation, robust role permissions, and regular cloud backups.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Simulated / Dummy Payment Modal */}
      {showPaymentModal && selectedPlanForPayment && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title text-white fw-bold">
                  <i className="ti ti-credit-card me-2"></i>Mock Payment Checkout
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowPaymentModal(false)}
                  disabled={simulatingPayment}
                ></button>
              </div>

              <div className="modal-body p-4">
                <div className="alert alert-warning py-2 px-3 fs-12 mb-3">
                  <i className="ti ti-bolt me-1"></i>
                  <strong>Test Mode Active:</strong> Payment gateway keys are in test simulation mode. No real charges
                  will occur.
                </div>

                <div className="card bg-light border p-3 mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-muted fs-13">Selected Plan:</span>
                    <span className="fw-bold text-dark">{selectedPlanForPayment.plan_name}</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-muted fs-13">Billing Frequency:</span>
                    <span className="fw-bold text-capitalize text-dark">{selectedPlanForPayment.billing_cycle || 'annual'}</span>
                  </div>
                  <hr className="my-2" />
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="fw-bold text-dark">Total Amount Due:</span>
                    <span className="fs-4 fw-bold text-primary">
                      ₹{Number(selectedPlanForPayment.price).toLocaleString()}
                    </span>
                  </div>
                </div>

                <p className="text-muted fs-12 mb-0">
                  Clicking "Confirm & Authorize Payment" will simulate an approved transaction and immediately open the
                  School Registration Wizard.
                </p>
              </div>

              <div className="modal-footer bg-light">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowPaymentModal(false)}
                  disabled={simulatingPayment}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-success px-4"
                  onClick={handleConfirmSimulatedPayment}
                  disabled={simulatingPayment}
                >
                  {simulatingPayment ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Authorizing...
                    </>
                  ) : (
                    <>
                      <i className="ti ti-check me-1"></i> Confirm & Authorize Payment
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-top py-3 text-center text-muted fs-13 mt-auto w-100">
        <div className="container">Copyright &copy; 2026 Growvidya School Management. All rights reserved.</div>
      </footer>
    </div>
  );
};

export default PricingPlans;
