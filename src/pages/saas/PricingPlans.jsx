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

  // Helper to extract SMS Allocation from plan items
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

  // Helper to extract Push Notification Allocation from plan items
  const getPushAllocation = (plan) => {
    if (!plan?.items || !Array.isArray(plan.items)) return null;
    const pushItem = plan.items.find(
      (it) =>
        it.item_code === 'PUSH_NOTIF' ||
        (it.item_name && it.item_name.toLowerCase().includes('push'))
    );
    if (!pushItem) return null;
    const limit = pushItem.quota_limit;
    const isIncluded = pushItem.item_type === 'included' || parseFloat(pushItem.price) === 0;
    return {
      item: pushItem,
      limit: limit ? Number(limit).toLocaleString() : null,
      label: limit
        ? `${Number(limit).toLocaleString()} Push Notifications ${
            isIncluded ? 'Included' : `(Add-on: ₹${Number(pushItem.price).toLocaleString('en-IN')})`
          }`
        : isIncluded
        ? 'Push Notifications Included'
        : `Add-on: ₹${Number(pushItem.price).toLocaleString('en-IN')}`,
      isIncluded,
    };
  };

  // Action: Select plan and redirect to separate Configuration page (/configure)
  const handleSelectPlan = (plan, isTrial = false) => {
    if (!plan) return;
    sessionStorage.setItem('selected_subscription_plan', JSON.stringify(plan));
    sessionStorage.setItem('selected_billing_cycle', isTrial ? 'trial' : billingCycle);

    navigate('/configure', {
      state: {
        plan,
        isTrial,
        billingCycle: isTrial ? 'trial' : billingCycle,
      },
    });
  };

  // Free Trial Plan (strictly from admin database, common to both monthly & annual)
  const trialPlan =
    plans.find((p) => p.billing_cycle === 'trial' || parseFloat(p.price) === 0) || null;

  const trialSms = trialPlan ? getSmsAllocation(trialPlan) : null;
  const trialPush = trialPlan ? getPushAllocation(trialPlan) : null;

  // Filter paid plans for selected billing cycle
  const currentPaidPlans = plans.filter((p) => {
    const isTrial = p.billing_cycle === 'trial' || parseFloat(p.price) === 0;
    return !isTrial && p.billing_cycle === billingCycle;
  });

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
            <Link to="/register" className="btn btn-primary btn-sm fw-semibold px-3 py-2 shadow-xs">
              <i className="ti ti-school me-1"></i> Register School
            </Link>
            <Link to="/account/login/adminlogin" className="btn btn-outline-secondary btn-sm fw-semibold px-3 py-2">
              <i className="ti ti-lock me-1"></i> Admin Login
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow-1 py-4 py-md-5">
        <div className="container-fluid px-3 px-md-5" style={{ maxWidth: '1440px' }}>
          {/* Hero Banner */}
          <div className="text-center mb-4">
            <div className="d-inline-flex align-items-center gap-2 bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-3 py-1 fs-12 fw-semibold mb-3">
              <i className="ti ti-crown fs-14"></i> INSTITUTIONAL SUBSCRIPTIONS • INSTANT ACTIVATION
            </div>
            <h1 className="fw-bold text-dark display-6 mb-2">Simple, Transparent School Pricing</h1>
            <p className="text-muted fs-15 mx-auto mb-0" style={{ maxWidth: '680px' }}>
              Everything your institution needs to manage admissions, attendance, fees, routine, examinations, and staff communication.
            </p>
          </div>

          {/* Monthly vs Annual Billing Toggle (Trial is common to both) */}
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
                <i className="ti ti-calendar me-1.5"></i> Monthly Billing
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
                <i className="ti ti-calendar-event me-1.5"></i> Annual Billing
                <span className="badge bg-success text-white ms-2 fs-11">Save up to 20%</span>
              </button>
            </div>
            <div className="text-muted fs-13 mt-2 text-center">
              Showing <strong>{billingCycle === 'monthly' ? 'Monthly' : 'Annual'}</strong> packages.
              {trialPlan && (
                <> The <strong>{trialPlan.plan_name}</strong> is available under both options.</>
              )}
            </div>
          </div>

          {/* Loading Indicator */}
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }}></div>
              <h5 className="fw-bold text-dark">Loading Pricing Catalog...</h5>
              <p className="text-muted">Fetching latest institutional packages from database...</p>
            </div>
          ) : (
            <div>
              {/* PRICING CARDS IN A UNIFIED ROW */}
              <div className="row g-4 justify-content-center mb-5 pt-3">
                {/* CARD 1: FREE TRIAL (Strictly rendered if configured by admin in database) */}
                {trialPlan && (
                  <div className="col-12 col-md-6 col-xl-3 d-flex">
                    <div
                      className="card w-100 border-2 rounded-4 shadow-sm transition-all position-relative d-flex flex-column bg-white border-success-subtle"
                      style={{ borderRadius: '16px' }}
                    >
                      {/* Top Badge */}
                      <div className="position-absolute top-0 start-50 translate-middle">
                        <span className="badge rounded-pill bg-success text-white px-3 py-1.5 fs-11 fw-bold shadow-sm text-uppercase">
                          ✨ {trialPlan.plan_name}
                        </span>
                      </div>

                      <div className="card-body p-4 d-flex flex-column">
                        <div className="mb-2">
                          <h4 className="fw-bold text-dark mb-1 fs-18">{trialPlan.plan_name}</h4>
                          <p className="text-muted fs-13 mb-0" style={{ minHeight: '44px' }}>
                            {trialPlan.description || 'Full platform access evaluation for your institution.'}
                          </p>
                        </div>

                        {/* Price Display */}
                        <div className="my-3 pb-3 border-bottom">
                          <div className="d-flex align-items-baseline gap-1">
                            <span className="display-6 fw-bold text-success">₹0</span>
                            <span className="text-muted fs-13 fw-semibold">
                              {trialPlan.duration_days ? `/ ${trialPlan.duration_days} days access` : '/ evaluation access'}
                            </span>
                          </div>
                          <div className="mt-1">
                            <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2.5 py-1 fs-11 fw-semibold">
                              <i className="ti ti-check me-1"></i> No Credit Card Required
                            </span>
                          </div>
                        </div>

                        {/* Plan Capacity & Features */}
                        <div className="mb-4 flex-grow-1">
                          <div className="fw-semibold text-dark fs-12 mb-3 text-uppercase">Features & Quotas:</div>
                          <ul className="list-unstyled fs-13 mb-0 d-flex flex-column gap-2">
                            {trialPlan.max_students !== undefined && trialPlan.max_students !== null && (
                              <li className="d-flex align-items-center">
                                <i className="ti ti-users text-primary me-2 fs-16"></i>
                                <span>
                                  <strong>{trialPlan.max_students > 0 ? `Up to ${Number(trialPlan.max_students).toLocaleString()}` : 'Unlimited'}</strong> Students
                                </span>
                              </li>
                            )}
                            {trialPlan.max_teachers !== undefined && trialPlan.max_teachers !== null && (
                              <li className="d-flex align-items-center">
                                <i className="ti ti-user-check text-primary me-2 fs-16"></i>
                                <span>
                                  <strong>{trialPlan.max_teachers > 0 ? `Up to ${Number(trialPlan.max_teachers).toLocaleString()}` : 'Unlimited'}</strong> Staff & Teachers
                                </span>
                              </li>
                            )}
                            {trialSms && (
                              <li className="d-flex align-items-center">
                                <i className="ti ti-message-dots text-primary me-2 fs-16"></i>
                                <span>
                                  <strong>{trialSms.label}</strong>
                                </span>
                              </li>
                            )}
                            {trialPush && (
                              <li className="d-flex align-items-center">
                                <i className="ti ti-bell-ringing text-success me-2 fs-16"></i>
                                <span>
                                  <strong>{trialPush.label}</strong>
                                </span>
                              </li>
                            )}
                            {(trialPlan.items || [])
                              .filter(
                                (it) =>
                                  it.item_code !== 'PUSH_NOTIF' &&
                                  !it.item_code?.toUpperCase().includes('SMS') &&
                                  it.item_code !== 'EMAIL_ALERTS'
                              )
                              .map((it) => (
                                <li key={it.id} className="d-flex align-items-center">
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

                        {/* Action Button: Redirects to separate Configuration page */}
                        <div className="d-flex flex-column mt-auto pt-2">
                          <button
                            type="button"
                            onClick={() => handleSelectPlan(trialPlan, true)}
                            className="btn btn-outline-success py-2.5 fw-semibold d-flex align-items-center justify-content-center shadow-xs w-100"
                          >
                            <span>Start {trialPlan.plan_name}</span>
                            <i className="ti ti-arrow-right ms-2 fs-15"></i>
                          </button>
                          <div className="text-center text-muted fs-11 mt-1">
                            Instant Access • No Credit Card
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* PAID PLANS (Strictly from admin database for current billing cycle) */}
                {currentPaidPlans.map((plan) => {
                  const isGrowth =
                    (plan.plan_code || '').toLowerCase().includes('growth') ||
                    (plan.plan_name || '').toLowerCase().includes('growth');
                  const isEnterprise =
                    (plan.plan_code || '').toLowerCase().includes('enterprise') ||
                    (plan.plan_name || '').toLowerCase().includes('enterprise');
                  const smsInfo = getSmsAllocation(plan);
                  const pushInfo = getPushAllocation(plan);

                  return (
                    <div key={plan.id} className="col-12 col-md-6 col-xl-3 d-flex">
                      <div
                        className={`card w-100 border-2 rounded-4 transition-all position-relative d-flex flex-column bg-white ${
                          isGrowth
                            ? 'border-primary shadow'
                            : isEnterprise
                            ? 'border-dark-subtle shadow-sm'
                            : 'border-light-subtle shadow-sm'
                        }`}
                        style={{ borderRadius: '16px' }}
                      >
                        {/* Top Badges */}
                        {isGrowth && (
                          <div className="position-absolute top-0 start-50 translate-middle">
                            <span className="badge rounded-pill bg-primary text-white px-3 py-1.5 fs-11 fw-bold shadow-sm text-uppercase">
                              ★ Most Popular
                            </span>
                          </div>
                        )}
                        {isEnterprise && (
                          <div className="position-absolute top-0 start-50 translate-middle">
                            <span className="badge rounded-pill bg-dark text-white px-3 py-1.5 fs-11 fw-bold shadow-sm text-uppercase">
                              👑 Enterprise Grade
                            </span>
                          </div>
                        )}
                        {!isGrowth && !isEnterprise && (
                          <div className="position-absolute top-0 start-50 translate-middle">
                            <span className="badge rounded-pill bg-light text-secondary border px-3 py-1.5 fs-11 fw-semibold text-uppercase">
                              {plan.plan_name}
                            </span>
                          </div>
                        )}

                        <div className="card-body p-4 d-flex flex-column">
                          <div className="mb-2">
                            <h4 className="fw-bold text-dark mb-1 fs-18">{plan.plan_name}</h4>
                            <p className="text-muted fs-13 mb-0" style={{ minHeight: '44px' }}>
                              {plan.description || ''}
                            </p>
                          </div>

                          {/* Price Display */}
                          <div className="my-3 pb-3 border-bottom">
                            <div className="d-flex align-items-baseline gap-1">
                              <span className={`display-6 fw-bold ${isGrowth ? 'text-primary' : 'text-dark'}`}>
                                ₹{Number(plan.price).toLocaleString('en-IN')}
                              </span>
                              <span className="text-muted fs-13 fw-semibold">
                                / {plan.billing_cycle === 'annual' ? 'year' : 'month'}
                              </span>
                            </div>
                            <div className="mt-1">
                              <span
                                className={`badge border rounded-pill px-2.5 py-1 fs-11 fw-semibold ${
                                  isGrowth
                                    ? 'bg-primary-subtle text-primary border-primary-subtle'
                                    : 'bg-light text-secondary border-light-subtle'
                                }`}
                              >
                                <i className="ti ti-shield-check me-1"></i>
                                {plan.billing_cycle === 'annual' ? 'Annual School License' : 'Monthly School License'}
                              </span>
                            </div>
                          </div>

                          {/* Plan Limits & Features */}
                          <div className="mb-4 flex-grow-1">
                            <div className="fw-semibold text-dark fs-12 mb-3 text-uppercase">Features & Quotas:</div>
                            <ul className="list-unstyled fs-13 mb-0 d-flex flex-column gap-2">
                              {plan.max_students !== undefined && plan.max_students !== null && (
                                <li className="d-flex align-items-center">
                                  <i className="ti ti-users text-primary me-2 fs-16"></i>
                                  <span>
                                    <strong>{plan.max_students > 0 ? `Up to ${Number(plan.max_students).toLocaleString()}` : 'Unlimited'}</strong> Students
                                  </span>
                                </li>
                              )}
                              {plan.max_teachers !== undefined && plan.max_teachers !== null && (
                                <li className="d-flex align-items-center">
                                  <i className="ti ti-user-check text-primary me-2 fs-16"></i>
                                  <span>
                                    <strong>{plan.max_teachers > 0 ? `Up to ${Number(plan.max_teachers).toLocaleString()}` : 'Unlimited'}</strong> Staff & Teachers
                                  </span>
                                </li>
                              )}
                              {smsInfo && (
                                <li className="d-flex align-items-center">
                                  <i className="ti ti-message-dots text-primary me-2 fs-16"></i>
                                  <span>
                                    <strong>{smsInfo.label}</strong>
                                  </span>
                                </li>
                              )}
                              {pushInfo && (
                                <li className="d-flex align-items-center">
                                  <i className="ti ti-bell-ringing text-success me-2 fs-16"></i>
                                  <span>
                                    <strong>{pushInfo.label}</strong>
                                  </span>
                                </li>
                              )}
                              {(plan.items || [])
                                .filter(
                                  (it) =>
                                    it.item_code !== 'PUSH_NOTIF' &&
                                    !it.item_code?.toUpperCase().includes('SMS') &&
                                    it.item_code !== 'EMAIL_ALERTS'
                                )
                                .map((it) => (
                                  <li key={it.id} className="d-flex align-items-center">
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

                          {/* Action Button: Redirects to separate Configuration page */}
                          <div className="d-flex flex-column mt-auto pt-2">
                            <button
                              type="button"
                              onClick={() => handleSelectPlan(plan, false)}
                              className={`btn py-2.5 fw-semibold d-flex align-items-center justify-content-center shadow-xs w-100 ${
                                isGrowth
                                  ? 'btn-primary'
                                  : isEnterprise
                                  ? 'btn-dark'
                                  : 'btn-outline-primary'
                              }`}
                            >
                              <span>Choose {plan.plan_name}</span>
                              <i className="ti ti-arrow-right ms-2 fs-15"></i>
                            </button>
                            <div className="text-center text-muted fs-11 mt-1">
                              {plan.billing_cycle === 'annual'
                                ? 'Billed Annually • Configurable Add-ons'
                                : 'Billed Monthly • Flexible Renewal'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {!trialPlan && currentPaidPlans.length === 0 && (
                  <div className="col-12 text-center py-5">
                    <div className="avatar avatar-xl rounded-circle bg-light text-muted mx-auto mb-3 d-flex align-items-center justify-content-center" style={{ width: '64px', height: '64px' }}>
                      <i className="ti ti-packages fs-32"></i>
                    </div>
                    <h5 className="fw-bold text-dark">No Subscription Plans Available</h5>
                    <p className="text-muted fs-14">There are currently no active plans configured for this billing cycle.</p>
                  </div>
                )}
              </div>

              {/* Value Proposition Callouts */}
              <div className="row g-3 justify-content-center mb-5">
                <div className="col-md-4 text-center">
                  <div className="p-4 bg-white rounded-3 border shadow-xs h-100">
                    <div className="avatar avatar-md rounded-circle bg-success-subtle text-success mx-auto mb-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px' }}>
                      <i className="ti ti-shield-check fs-24"></i>
                    </div>
                    <h6 className="fw-bold mb-2 fs-16 text-dark">{trialPlan ? 'Risk-Free Evaluation' : 'Transparent Pricing'}</h6>
                    <p className="text-muted fs-13 mb-0">
                      {trialPlan
                        ? `Experience the platform with your team during your free evaluation period without any upfront commitment.`
                        : 'Straightforward institutional pricing with full transparency and instant activation.'}
                    </p>
                  </div>
                </div>
                <div className="col-md-4 text-center">
                  <div className="p-4 bg-white rounded-3 border shadow-xs h-100">
                    <div className="avatar avatar-md rounded-circle bg-primary-subtle text-primary mx-auto mb-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px' }}>
                      <i className="ti ti-clock-bolt fs-24"></i>
                    </div>
                    <h6 className="fw-bold mb-2 fs-16 text-dark">Instant Activation</h6>
                    <p className="text-muted fs-13 mb-0">
                      Complete the short onboarding wizard and access your school portal in less than 2 minutes.
                    </p>
                  </div>
                </div>
                <div className="col-md-4 text-center">
                  <div className="p-4 bg-white rounded-3 border shadow-xs h-100">
                    <div className="avatar avatar-md rounded-circle bg-info-subtle text-info mx-auto mb-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px' }}>
                      <i className="ti ti-database-check fs-24"></i>
                    </div>
                    <h6 className="fw-bold mb-2 fs-16 text-dark">Isolated & Secure Data</h6>
                    <p className="text-muted fs-13 mb-0">
                      Dedicated tenant isolation, robust role permissions, automated backups, and 99.9% uptime SLA.
                    </p>
                  </div>
                </div>
              </div>

              {/* Dynamic Feature Comparison Matrix - strictly shown when multiple admin plans exist */}
              {plans.length > 1 && (
                <div className="card border-0 shadow-sm rounded-3 mb-5 overflow-hidden">
                  <div className="card-header bg-white p-4 border-bottom">
                    <h4 className="fw-bold text-dark mb-1">Plan Comparison Matrix</h4>
                    <p className="text-muted fs-13 mb-0">Compare capacity limits and included capabilities across configured plans.</p>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0 fs-13">
                      <thead className="table-light">
                        <tr>
                          <th style={{ width: '28%' }}>Core Capabilities</th>
                          {plans.map((p) => (
                            <th key={p.id} className="text-center">
                              {p.plan_name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="fw-semibold text-dark">Price</td>
                          {plans.map((p) => (
                            <td key={p.id} className="text-center fw-bold">
                              {parseFloat(p.price) === 0 ? 'Free' : `₹${Number(p.price).toLocaleString('en-IN')}`}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="fw-semibold text-dark">Billing Cycle</td>
                          {plans.map((p) => (
                            <td key={p.id} className="text-center text-capitalize">
                              {p.billing_cycle || 'N/A'}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="fw-semibold text-dark">Student Limit</td>
                          {plans.map((p) => (
                            <td key={p.id} className="text-center">
                              {p.max_students > 0 ? `Up to ${Number(p.max_students).toLocaleString()}` : 'Unlimited'}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="fw-semibold text-dark">Staff & Teacher Limit</td>
                          {plans.map((p) => (
                            <td key={p.id} className="text-center">
                              {p.max_teachers > 0 ? `Up to ${Number(p.max_teachers).toLocaleString()}` : 'Unlimited'}
                            </td>
                          ))}
                        </tr>
                        {/* SMS Allocation Row: Only rendered if at least one plan has SMS configured by admin */}
                        {plans.some((p) => getSmsAllocation(p)) && (
                          <tr>
                            <td className="fw-semibold text-dark">SMS Included / Quota</td>
                            {plans.map((p) => {
                              const sms = getSmsAllocation(p);
                              return (
                                <td key={p.id} className="text-center">
                                  {sms ? sms.label : <span className="text-muted">—</span>}
                                </td>
                              );
                            })}
                          </tr>
                        )}
                        {/* Push Notifications Row: Only rendered if at least one plan has Push configured by admin */}
                        {plans.some((p) => getPushAllocation(p)) && (
                          <tr>
                            <td className="fw-semibold text-dark">Push Notifications</td>
                            {plans.map((p) => {
                              const push = getPushAllocation(p);
                              return (
                                <td key={p.id} className="text-center">
                                  {push ? push.label : <span className="text-muted">—</span>}
                                </td>
                              );
                            })}
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
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

export default PricingPlans;
