import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import saasApi from '../../api/saas.api';
import logoDark from '../../assets/logo_dark.png';

const PricingPlans = () => {
  const navigate = useNavigate();

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState('annual');

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const res = await saasApi.getPlans();
        const list = res?.data || [];
        setPlans(list);
      } catch (err) {
        console.error('Failed to load plans:', err);
        toast.error('Failed to load subscription plans.');
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  // Derive active paid billing cycles dynamically from DB plans (zero hardcoded cycle lists)
  const availableCycles = useMemo(() => {
    const map = new Map();
    plans.forEach((p) => {
      const c = String(p.billing_cycle || '').toLowerCase();
      if (c && c !== 'trial' && parseFloat(p.price) > 0 && !map.has(c) && p.cycle_meta) {
        map.set(c, { ...p.cycle_meta, cycle: p.cycle_meta.cycle || p.cycle_meta.code || c });
      }
    });
    return Array.from(map.values()).sort(
      (a, b) => (a.rank ?? a.months ?? 0) - (b.rank ?? b.months ?? 0)
    );
  }, [plans]);

  useEffect(() => {
    if (availableCycles.length === 0) return;
    if (!availableCycles.some((c) => c.cycle === billingCycle)) {
      if (availableCycles.some((c) => c.cycle === 'annual')) {
        setBillingCycle('annual');
      } else {
        setBillingCycle(availableCycles[0].cycle);
      }
    }
  }, [availableCycles, billingCycle]);

  const handleSelectPlan = (plan, isTrial = false) => {
    if (!plan) return;
    const cycle = isTrial ? 'trial' : plan.billing_cycle || billingCycle;
    sessionStorage.setItem('selected_subscription_plan', JSON.stringify(plan));
    sessionStorage.setItem('selected_billing_cycle', cycle);

    navigate('/configure', {
      state: {
        plan,
        isTrial,
        billingCycle: cycle,
      },
    });
  };

  const trialPlan = useMemo(
    () =>
      plans.find(
        (p) => String(p.billing_cycle || '').toLowerCase() === 'trial' || parseFloat(p.price) <= 0
      ) || null,
    [plans]
  );

  const currentPaidPlans = useMemo(
    () =>
      plans.filter((p) => {
        const isTrial =
          String(p.billing_cycle || '').toLowerCase() === 'trial' || parseFloat(p.price) <= 0;
        return !isTrial && String(p.billing_cycle || '').toLowerCase() === billingCycle;
      }),
    [plans, billingCycle]
  );

  const activeCycleMeta = useMemo(
    () =>
      availableCycles.find((c) => (c.cycle || c.code) === billingCycle) ||
      availableCycles[0] || { cycle: billingCycle, label: billingCycle, shortLabel: billingCycle },
    [availableCycles, billingCycle]
  );

  return (
    <div className="bg-light min-vh-100 d-flex flex-column">
      {/* Header */}
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
            <Link to="/register" className="btn btn-primary btn-sm fw-semibold px-3 py-2 shadow-sm">
              <i className="ti ti-school me-1"></i> Register School
            </Link>
            <Link to="/account/login/adminlogin" className="btn btn-light border text-dark btn-sm fw-semibold px-3 py-2">
              <i className="ti ti-lock me-1"></i> Admin Login
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow-1 py-4 py-md-5">
        <div className="container-fluid px-3 px-md-5" style={{ maxWidth: '1440px' }}>
          {/* Hero Banner */}
          <div className="text-center mb-4">
            <div className="d-inline-flex align-items-center gap-2 bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-3 py-1 fs-12 fw-semibold mb-3">
              <i className="ti ti-crown fs-14"></i> INSTITUTIONAL SUBSCRIPTIONS • INSTANT ACTIVATION
            </div>
            <h1 className="fw-bold text-dark display-6 mb-2">Simple, Transparent School Pricing</h1>
            <p className="text-muted fs-15 mx-auto mb-0" style={{ maxWidth: '680px' }}>
              Everything your institution needs to manage admissions, attendance, fees, timetables, examinations, and communication — flat net pricing with zero hidden fees.
            </p>
          </div>

          {/* Dynamic Billing Cycle Toggle */}
          {availableCycles.length > 0 && (
            <div className="d-flex flex-column align-items-center mb-5">
              <div className="bg-white p-1 rounded-pill d-inline-flex flex-wrap justify-content-center gap-1 border shadow-sm">
                {availableCycles.map((cyc) => {
                  const cycKey = cyc.cycle || cyc.code;
                  const isActive = billingCycle === cycKey;
                  return (
                    <button
                      key={cycKey}
                      type="button"
                      className={`btn rounded-pill px-4 py-2 fs-14 fw-semibold transition-all ${
                        isActive ? 'btn-primary text-white shadow-sm' : 'btn-light text-dark'
                      }`}
                      onClick={() => setBillingCycle(cycKey)}
                    >
                      {cyc.label}
                    </button>
                  );
                })}
              </div>
              <div className="text-muted fs-13 mt-2 text-center">
                Showing <strong>{activeCycleMeta.label}</strong> packages.
                {trialPlan && (
                  <>
                    {' '}
                    <strong>{trialPlan.plan_name}</strong> is available alongside all billing cycles.
                  </>
                )}
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }}></div>
              <h5 className="fw-bold text-dark">Loading Pricing Catalog...</h5>
              <p className="text-muted">Fetching active institutional packages...</p>
            </div>
          ) : (
            <div>
              <div className="row g-4 justify-content-center mb-5 pt-3">
                {/* Free Trial Card (Strictly from DB if active) */}
                {trialPlan && (
                  <div className="col-12 col-md-6 col-xl-3 d-flex">
                    <div
                      className="card w-100 border-2 rounded-4 shadow-sm transition-all position-relative d-flex flex-column bg-white border-success-subtle"
                      style={{ borderRadius: '16px', overflow: 'visible' }}
                    >
                      <div className="position-absolute top-0 start-50 translate-middle">
                        <span
                          className="badge rounded-pill bg-success text-white px-3 py-1 fs-11 fw-bold shadow-sm text-uppercase"
                          style={{ whiteSpace: 'nowrap' }}
                        >
                          ✨ {trialPlan.plan_name}
                        </span>
                      </div>

                      <div className="card-body p-4 d-flex flex-column">
                        <div className="mb-2">
                          <h4 className="fw-bold text-dark mb-1 fs-18">{trialPlan.plan_name}</h4>
                          <p className="text-muted fs-13 mb-0" style={{ minHeight: '44px' }}>
                            {trialPlan.description || 'Full platform evaluation for your institution.'}
                          </p>
                        </div>

                        <div className="my-3 pb-3 border-bottom">
                          <div className="d-flex align-items-baseline gap-1">
                            <span className="display-6 fw-bold text-success">₹0</span>
                            <span className="text-muted fs-13 fw-semibold">
                              /{' '}
                              {Number(trialPlan.free_trial_days || trialPlan.duration_days) > 0
                                ? `${Number(trialPlan.free_trial_days || trialPlan.duration_days)} days access`
                                : 'evaluation access'}
                            </span>
                          </div>
                          <div className="mt-1">
                            <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-3 py-1 fs-11 fw-semibold">
                              <i className="ti ti-check me-1"></i> One-Time Free Trial • No Card Required
                            </span>
                          </div>
                        </div>

                        <div className="mb-4 flex-grow-1">
                          <div className="fw-semibold text-dark fs-12 mb-3 text-uppercase">
                            Features &amp; Quotas:
                          </div>
                          <ul className="list-unstyled fs-13 mb-0 d-flex flex-column gap-2">
                            <li className="d-flex align-items-center">
                              <i className="ti ti-users text-primary me-2 fs-16"></i>
                              <span>
                                <strong>
                                  {trialPlan.max_students > 0
                                    ? `Up to ${Number(trialPlan.max_students).toLocaleString('en-IN')}`
                                    : 'Unlimited'}
                                </strong>{' '}
                                Students
                              </span>
                            </li>
                            <li className="d-flex align-items-center">
                              <i className="ti ti-user-check text-primary me-2 fs-16"></i>
                              <span>
                                <strong>Unlimited</strong> Teachers &amp; Branches
                              </span>
                            </li>
                            {Math.max(0, parseInt(trialPlan.included_storage_gb, 10) || 0) > 0 && (
                              <li className="d-flex align-items-center">
                                <i className="ti ti-cloud text-info me-2 fs-16"></i>
                                <span>
                                  <strong>{Math.max(0, parseInt(trialPlan.included_storage_gb, 10) || 0)} GB</strong> Cloud Storage
                                </span>
                              </li>
                            )}
                            {(trialPlan.items || []).map((it) => (
                              <li key={it.id} className="d-flex align-items-center">
                                <i className="ti ti-check text-success me-2 fs-16"></i>
                                <span>{it.item_name}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="d-flex flex-column mt-auto pt-2">
                          <button
                            type="button"
                            onClick={() => handleSelectPlan(trialPlan, true)}
                            className="btn btn-outline-success py-2 px-3 fw-semibold d-flex align-items-center justify-content-center shadow-sm w-100"
                          >
                            <span>Start {trialPlan.plan_name}</span>
                            <i className="ti ti-arrow-right ms-2 fs-15"></i>
                          </button>
                          <div className="text-center text-muted fs-11 mt-1">
                            Instant Portal Setup
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Paid Plans for Selected Billing Cycle (100% Dynamic from DB) */}
                {currentPaidPlans.map((plan) => {
                  const isPopular = Number(plan.is_popular) === 1;
                  const cMeta = plan.cycle_meta || activeCycleMeta;
                  const includedStorage = Math.max(0, parseInt(plan.included_storage_gb, 10) || 0);
                  const customItems = plan.items || [];

                  return (
                    <div key={plan.id} className="col-12 col-md-6 col-xl-3 d-flex">
                      <div
                        className={`card w-100 border-2 rounded-4 transition-all position-relative d-flex flex-column bg-white ${
                          isPopular ? 'border-primary shadow' : 'border-light-subtle shadow-sm'
                        }`}
                        style={{ borderRadius: '16px', overflow: 'visible' }}
                      >
                        <div className="position-absolute top-0 start-50 translate-middle">
                          {isPopular ? (
                            <span
                              className="badge rounded-pill bg-primary text-white px-3 py-1 fs-11 fw-bold shadow-sm text-uppercase"
                              style={{ whiteSpace: 'nowrap' }}
                            >
                              ★ Most Popular
                            </span>
                          ) : (
                            <span
                              className="badge rounded-pill bg-light text-muted border px-3 py-1 fs-11 fw-semibold text-uppercase"
                              style={{ whiteSpace: 'nowrap' }}
                            >
                              {plan.plan_name}
                            </span>
                          )}
                        </div>

                        <div className="card-body p-4 d-flex flex-column">
                          <div className="mb-2">
                            <h4 className="fw-bold text-dark mb-1 fs-18">{plan.plan_name}</h4>
                            <p className="text-muted fs-13 mb-0" style={{ minHeight: '44px' }}>
                              {plan.description || 'Complete cloud ERP suite for institutional management.'}
                            </p>
                          </div>

                          <div className="my-3 pb-3 border-bottom">
                            {Number(plan.original_price) > Number(plan.price) && (
                              <div className="d-flex align-items-center gap-2 mb-1">
                                <span
                                  className="fs-14 fw-semibold text-decoration-line-through"
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
                            <div className="d-flex align-items-baseline gap-1">
                              <span className={`display-6 fw-bold ${isPopular ? 'text-primary' : 'text-dark'}`}>
                                ₹{Number(plan.price).toLocaleString('en-IN')}
                              </span>
                              <span className="text-muted fs-13 fw-semibold">
                                / {cMeta.shortLabel || cMeta.label}
                              </span>
                            </div>
                            <div className="mt-1">
                              <span
                                className={`badge border rounded-pill px-3 py-1 fs-11 fw-semibold ${
                                  isPopular
                                    ? 'bg-primary-subtle text-primary border-primary-subtle'
                                    : 'bg-light text-muted border-light-subtle'
                                }`}
                              >
                                <i className="ti ti-shield-check me-1"></i>
                                {cMeta.label} School License
                              </span>
                            </div>
                          </div>

                          <div className="mb-4 flex-grow-1">
                            <div className="fw-semibold text-dark fs-12 mb-3 text-uppercase">
                              Features &amp; Quotas:
                            </div>
                            <ul className="list-unstyled fs-13 mb-0 d-flex flex-column gap-2">
                              <li className="d-flex align-items-center">
                                <i className="ti ti-users text-primary me-2 fs-16"></i>
                                <span>
                                  <strong>
                                    {plan.max_students > 0
                                      ? `Up to ${Number(plan.max_students).toLocaleString('en-IN')}`
                                      : 'Unlimited'}
                                  </strong>{' '}
                                  Students
                                </span>
                              </li>
                              <li className="d-flex align-items-center">
                                <i className="ti ti-user-check text-primary me-2 fs-16"></i>
                                <span>
                                  <strong>Unlimited</strong> Teachers &amp; Branches
                                </span>
                              </li>
                              {includedStorage > 0 && (
                                <li className="d-flex align-items-center">
                                  <i className="ti ti-cloud text-info me-2 fs-16"></i>
                                  <span>
                                    <strong>{includedStorage} GB</strong> Cloud Storage Included
                                  </span>
                                </li>
                              )}
                              {customItems.map((it) => (
                                <li key={it.id} className="d-flex align-items-center">
                                  <i className="ti ti-check text-success me-2 fs-16"></i>
                                  <span>{it.item_name}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="d-flex flex-column mt-auto pt-2">
                            <button
                              type="button"
                              onClick={() => handleSelectPlan(plan, false)}
                              className={`btn py-2 px-3 fw-semibold d-flex align-items-center justify-content-center shadow-sm w-100 ${
                                isPopular ? 'btn-primary' : 'btn-outline-primary'
                              }`}
                            >
                              <span>Choose {plan.plan_name}</span>
                              <i className="ti ti-arrow-right ms-2 fs-15"></i>
                            </button>
                            <div className="text-center text-muted fs-11 mt-1">
                              {cMeta.label} • Configurable Add-ons
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {!trialPlan && currentPaidPlans.length === 0 && (
                  <div className="col-12 text-center py-5">
                    <h5 className="fw-bold text-dark">No Subscription Plans Available</h5>
                    <p className="text-muted fs-14">
                      There are currently no active plans configured for this billing cycle.
                    </p>
                  </div>
                )}
              </div>

              {/* Dynamic Feature Comparison Matrix */}
              {currentPaidPlans.length > 1 && (
                <div className="card border-0 shadow-sm rounded-3 mb-5 overflow-hidden">
                  <div className="card-header bg-white p-4 border-bottom">
                    <h4 className="fw-bold text-dark mb-1">Plan Comparison ({activeCycleMeta.label})</h4>
                    <p className="text-muted fs-13 mb-0">
                      Compare student capacity, storage allocations, and operational modules side by side.
                    </p>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0 fs-13">
                      <thead className="table-light">
                        <tr>
                          <th style={{ width: '28%' }}>Core Capabilities</th>
                          {currentPaidPlans.map((p) => (
                            <th key={p.id} className="text-center">
                              {p.plan_name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="fw-semibold text-dark">Net Price</td>
                          {currentPaidPlans.map((p) => (
                            <td key={p.id} className="text-center fw-bold">
                              ₹{Number(p.price).toLocaleString('en-IN')}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="fw-semibold text-dark">Student Quota</td>
                          {currentPaidPlans.map((p) => (
                            <td key={p.id} className="text-center">
                              {p.max_students > 0
                                ? `Up to ${Number(p.max_students).toLocaleString('en-IN')}`
                                : 'Unlimited'}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="fw-semibold text-dark">Teachers &amp; Branches</td>
                          {currentPaidPlans.map((p) => (
                            <td key={p.id} className="text-center text-success fw-semibold">
                              Unlimited
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="fw-semibold text-dark">Included Cloud Storage</td>
                          {currentPaidPlans.map((p) => (
                            <td key={p.id} className="text-center fw-semibold">
                              {Math.max(0, parseInt(p.included_storage_gb, 10) || 0) > 0
                                ? `${Math.max(0, parseInt(p.included_storage_gb, 10) || 0)} GB`
                                : 'Add-on Optional'}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="bg-white border-top py-3 text-center text-muted fs-13 mt-auto w-100">
        <div className="container">
          Copyright &copy; {new Date().getFullYear()} Growvidya School Management. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default PricingPlans;
