import React, { useState } from 'react';
import { useSubscription } from '../../../context/SubscriptionContext';

const SubscriptionBilling = () => {
  const {
    subscription,
    upgradePlans,
    loading,
    isTrial,
    isExpired,
    daysLeft,
    openUpgradeModal,
  } = useSubscription();

  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState(null);

  if (loading && !subscription) {
    return (
      <div className="content d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status"></div>
          <div className="text-muted fs-14">Loading subscription details from database...</div>
        </div>
      </div>
    );
  }

  const planName = subscription?.plan_name || '';
  const maxStudents = subscription?.max_students || 0;
  const maxTeachers = subscription?.max_teachers || 0;

  // Calculate percentage for progress bar if in trial
  const trialDaysPassed = Math.max(0, 14 - daysLeft);
  const trialProgressPercent = Math.min(100, Math.max(0, (trialDaysPassed / 14) * 100));

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-4">
        <div>
          <h3 className="page-title mb-1 fw-bold text-dark">Subscription & Billing</h3>
          <p className="text-muted fs-13 mb-0">
            {isTrial
              ? `Monitor your ${planName || 'trial'} evaluation status, quotas, and manage annual licensing.`
              : 'Monitor your institutional subscription status, renewal countdown, quotas, and manage licensing tiers.'}
          </p>
        </div>
        <div className="mt-3 mt-md-0 d-flex flex-wrap gap-2">
          {isExpired && !isTrial && (
            <button
              type="button"
              className="btn btn-danger d-inline-flex align-items-center shadow-sm"
              onClick={() => openUpgradeModal(subscription?.plan_id)}
            >
              <i className="ti ti-refresh me-2 fs-16"></i>
              <span>Renew {planName}</span>
            </button>
          )}
          {!isExpired && daysLeft <= 30 && !isTrial && (
            <button
              type="button"
              className="btn btn-warning text-dark fw-bold d-inline-flex align-items-center shadow-sm"
              onClick={() => openUpgradeModal(subscription?.plan_id)}
            >
              <i className="ti ti-refresh me-2 fs-16"></i>
              <span>Renew {planName}</span>
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary d-inline-flex align-items-center shadow-sm"
            onClick={() => openUpgradeModal()}
          >
            <i className="ti ti-crown me-2 fs-16"></i>
            <span>
              {isExpired
                ? isTrial
                  ? 'Upgrade to Paid Plan'
                  : 'Upgrade Plan'
                : 'Upgrade Plan'}
            </span>
          </button>
        </div>
      </div>

      {/* Active Trial Notice */}
      {isTrial && !isExpired && (
        <div className="alert alert-primary border-primary d-flex align-items-center p-3 mb-4 rounded-3 shadow-sm">
          <div className="avatar avatar-md bg-primary text-white rounded-circle flex-shrink-0 me-3 d-flex align-items-center justify-content-center">
            <i className="ti ti-bolt fs-22"></i>
          </div>
          <div className="flex-grow-1">
            <h6 className="alert-heading fw-bold mb-1 text-dark">
              {planName} Active ({daysLeft} Days Remaining)
            </h6>
            <p className="mb-0 fs-13 text-secondary">
              You have full access to features during your evaluation period.
              Upgrade to an annual license anytime to ensure uninterrupted access when your evaluation concludes.
            </p>
          </div>
          <div className="flex-shrink-0 ms-3 d-none d-sm-block">
            <button
              type="button"
              className="btn btn-primary fw-bold shadow-sm"
              onClick={() => openUpgradeModal()}
            >
              <i className="ti ti-crown me-1"></i> Upgrade Now
            </button>
          </div>
        </div>
      )}

      {/* Paid Plan Expiring Soon Notice */}
      {!isTrial && !isExpired && daysLeft <= 30 && (
        <div
          className={`alert ${
            daysLeft <= 15 ? 'alert-danger border-danger' : 'alert-warning border-warning'
          } d-flex align-items-center p-3 mb-4 rounded-3 shadow-sm`}
        >
          <div
            className={`avatar avatar-md ${
              daysLeft <= 15 ? 'bg-danger' : 'bg-warning'
            } text-white rounded-circle flex-shrink-0 me-3 d-flex align-items-center justify-content-center`}
          >
            <i className="ti ti-alert-triangle fs-22"></i>
          </div>
          <div className="flex-grow-1">
            <h6 className="alert-heading fw-bold mb-1 text-dark">
              {planName} Expiring Soon ({daysLeft} Days Remaining)
            </h6>
            <p className="mb-0 fs-13 text-secondary">
              Your subscription will expire on{' '}
              <strong>{subscription?.end_date || 'soon'}</strong>. Renew your plan early to avoid any interruption to your institutional portal.
            </p>
          </div>
          <div className="flex-shrink-0 ms-3 d-none d-sm-flex gap-2">
            <button
              type="button"
              className="btn btn-warning fw-bold text-dark shadow-sm"
              onClick={() => openUpgradeModal(subscription?.plan_id)}
            >
              <i className="ti ti-refresh me-1"></i> Renew Plan
            </button>
            <button
              type="button"
              className="btn btn-outline-primary fw-bold shadow-sm"
              onClick={() => openUpgradeModal()}
            >
              <i className="ti ti-crown me-1"></i> Upgrade
            </button>
          </div>
        </div>
      )}

      {/* Paid Plan Fully Active Notice */}
      {!isTrial && !isExpired && daysLeft > 30 && (
        <div className="alert alert-success border-success-subtle d-flex align-items-center p-3 mb-4 rounded-3 shadow-sm">
          <div className="avatar avatar-md bg-success text-white rounded-circle flex-shrink-0 me-3 d-flex align-items-center justify-content-center">
            <i className="ti ti-shield-check fs-22"></i>
          </div>
          <div className="flex-grow-1">
            <h6 className="alert-heading fw-bold mb-1 text-success-emphasis">
              {planName} Active ({daysLeft} Days Remaining)
            </h6>
            <p className="mb-0 fs-13 text-secondary">
              Your institutional subscription is active until <strong>{subscription?.end_date || 'N/A'}</strong>. All operational modules and cloud backups are active.
            </p>
          </div>
          <div className="flex-shrink-0 ms-3 d-none d-sm-block">
            <button
              type="button"
              className="btn btn-outline-success fw-bold shadow-sm"
              onClick={() => openUpgradeModal()}
            >
              <i className="ti ti-arrow-up-right me-1"></i> Upgrade Plan
            </button>
          </div>
        </div>
      )}

      {/* Expired Notice (Trial or Paid) */}
      {isExpired && (
        <div className="alert alert-danger border-danger d-flex align-items-center p-3 mb-4 rounded-3 shadow-sm">
          <div className="avatar avatar-md bg-danger text-white rounded-circle flex-shrink-0 me-3 d-flex align-items-center justify-content-center">
            <i className="ti ti-lock fs-22"></i>
          </div>
          <div className="flex-grow-1">
            <h6 className="alert-heading fw-bold mb-1 text-danger">
              {isTrial
                ? `${planName || 'Trial'} Expired — All Menus Locked`
                : `${planName} Expired — All Menus Locked`}
            </h6>
            <p className="mb-0 fs-13 text-secondary">
              {isTrial
                ? `Your evaluation period for ${planName || 'the platform'} has expired and all operational modules are disabled. Select an annual license plan below to restore full access.`
                : `Your subscription to ${planName} expired on ${subscription?.end_date || 'recently'}. All operational modules are locked. Renew your ${planName} or upgrade to a higher tier to restore access.`}
            </p>
          </div>
          <div className="flex-shrink-0 ms-3 d-none d-sm-flex gap-2">
            {!isTrial && (
              <button
                type="button"
                className="btn btn-danger fw-bold shadow-sm"
                onClick={() => openUpgradeModal(subscription?.plan_id)}
              >
                <i className="ti ti-refresh me-1"></i> Renew {planName}
              </button>
            )}
            <button
              type="button"
              className="btn btn-outline-danger fw-bold shadow-sm"
              onClick={() => openUpgradeModal()}
            >
              <i className="ti ti-crown me-1"></i> {isTrial ? 'Upgrade to Restore Access' : 'Upgrade Plan'}
            </button>
          </div>
        </div>
      )}

      {/* Current Plan Overview Card */}
      <div className="card border-0 shadow-sm rounded-3 mb-4 overflow-hidden">
        <div
          className="p-4 text-white"
          style={{
            background: isExpired
              ? 'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)'
              : isTrial
              ? 'linear-gradient(135deg, #4338ca 0%, #312e81 100%)'
              : 'linear-gradient(135deg, #059669 0%, #065f46 100%)',
          }}
        >
          <div className="row align-items-center">
            <div className="col-12 col-lg-8">
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className="badge bg-white text-dark fw-bold px-3 py-1.5 fs-12 rounded-pill">
                  {isExpired
                    ? `${planName.toUpperCase()} — EXPIRED`
                    : isTrial
                    ? `${planName.toUpperCase()} — EVALUATION TRIAL`
                    : `${planName.toUpperCase()} — ACTIVE LICENSE`}
                </span>
                {!isExpired && (
                  <span
                    className={`badge ${
                      daysLeft <= 15
                        ? 'bg-danger text-white'
                        : daysLeft <= 30
                        ? 'bg-warning text-dark'
                        : 'bg-success text-white'
                    } fw-bold px-2 py-1 fs-11 rounded-pill`}
                  >
                    ⚡ {daysLeft} Days Remaining
                  </span>
                )}
              </div>

              <h2 className="fw-bold text-white mb-2">{planName}</h2>
              <p className="text-white-50 mb-3 fs-14">
                {isExpired
                  ? isTrial
                    ? `Your evaluation period for ${planName || 'trial'} has concluded. Upgrade now to restore administrative workflows.`
                    : `Your ${planName} subscription expired on ${subscription?.end_date || 'recently'}. Renew your current plan or upgrade to restore administrative workflows.`
                  : isTrial
                  ? `You are currently experiencing the platform under ${planName || 'trial'}. Period ends on ${subscription?.end_date || ''}.`
                  : `Your institutional license is active until ${subscription?.end_date || ''} (${daysLeft} days remaining). Cloud hosting, security patches, and support are included.`}
              </p>

              {isTrial && !isExpired && (
                <div className="mb-2" style={{ maxWidth: '500px' }}>
                  <div className="d-flex justify-content-between text-white-50 fs-12 mb-1">
                    <span>Trial Usage</span>
                    <span>{daysLeft} days remaining</span>
                  </div>
                  <div className="progress" style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.2)' }}>
                    <div
                      className="progress-bar bg-warning"
                      role="progressbar"
                      style={{ width: `${trialProgressPercent}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            <div className="col-12 col-lg-4 text-lg-end mt-3 mt-lg-0">
              <div className="bg-white bg-opacity-10 p-3 rounded-3 border border-white border-opacity-10 d-inline-block text-start w-100 w-lg-auto">
                <div className="text-white-50 fs-12">Total Amount Paid</div>
                <div className="fs-24 fw-bold text-white mb-1">
                  ₹{Number(subscription?.amount_paid || 0).toLocaleString('en-IN')}
                </div>
                {subscription?.payment_transaction_id && (
                  <div className="text-white-50 fs-11">
                    Payment Ref: {subscription.payment_transaction_id}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quota & Capacity Summary */}
        <div className="card-body p-4 bg-white border-bottom">
          <h6 className="fw-bold text-dark mb-3">Institutional Quotas & Capacities</h6>
          <div className="row g-3">
            <div className="col-12 col-md-4">
              <div className="p-3 rounded-3 bg-light border">
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <span className="text-muted fs-12">Student Capacity</span>
                  <i className="ti ti-school fs-18 text-primary"></i>
                </div>
                <h4 className="fw-bold text-dark mb-0">
                  {maxStudents > 0 ? `${maxStudents} Students` : 'Unlimited Students'}
                </h4>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <div className="p-3 rounded-3 bg-light border">
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <span className="text-muted fs-12">Teacher Capacity</span>
                  <i className="ti ti-users fs-18 text-success"></i>
                </div>
                <h4 className="fw-bold text-dark mb-0">
                  {maxTeachers > 0 ? `${maxTeachers} Teachers` : 'Unlimited Staff'}
                </h4>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <div className="p-3 rounded-3 bg-light border">
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <span className="text-muted fs-12">Cloud Database & Backups</span>
                  <i className="ti ti-cloud-check fs-18 text-info"></i>
                </div>
                <h4 className="fw-bold text-dark mb-0">Active & Real-Time</h4>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Available Annual Upgrade Plans */}
      <div className="mb-4">
        <div className="mb-3">
          <h4 className="fw-bold text-dark mb-1">Available Annual License Plans</h4>
          <p className="text-muted fs-13">
            Upgrade your school at any time. New license duration (365 days) begins immediately upon confirmation.
          </p>
        </div>

        <div className="row g-4">
          {upgradePlans.map((plan) => {
            const isPopular = plan.plan_code?.includes('growth') || plan.id === 2;
            const isCurrent = Number(subscription?.plan_id) === Number(plan.id);

            return (
              <div className="col-12 col-lg-4" key={plan.id}>
                <div
                  className={`card h-100 rounded-3 border transition-all ${
                    isPopular
                      ? 'border-2 border-primary shadow'
                      : 'border-200 shadow-sm'
                  }`}
                  style={{ position: 'relative' }}
                >
                  {isCurrent && (
                    <div
                      className="badge bg-warning text-dark position-absolute"
                      style={{
                        top: '-12px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        padding: '6px 14px',
                        fontSize: '11px',
                        borderRadius: '20px',
                        boxShadow: '0 4px 10px rgba(245, 158, 11, 0.3)',
                        zIndex: 2,
                      }}
                    >
                      ★ {isExpired ? 'CURRENT PLAN (EXPIRED)' : 'YOUR CURRENT PLAN'}
                    </div>
                  )}

                  {!isCurrent && isPopular && (
                    <div
                      className="badge bg-primary text-white position-absolute"
                      style={{
                        top: '-12px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        padding: '6px 14px',
                        fontSize: '11px',
                        borderRadius: '20px',
                        boxShadow: '0 4px 10px rgba(99, 102, 241, 0.4)',
                        zIndex: 2,
                      }}
                    >
                      ★ MOST POPULAR CHOICE
                    </div>
                  )}

                  <div className="card-body p-4 d-flex flex-column">
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <h5 className="fw-bold text-dark mb-0">{plan.plan_name}</h5>
                      {isCurrent && (
                        <span className="badge bg-warning-subtle text-warning-emphasis border border-warning fs-11 px-2 py-0.5 rounded-pill">
                          {isExpired ? 'Expired' : 'Active'}
                        </span>
                      )}
                    </div>
                    <p className="text-muted fs-12 mb-3" style={{ minHeight: '38px' }}>
                      {plan.description}
                    </p>

                    <div className="mb-3">
                      <span className="fs-32 fw-bold text-dark">
                        ₹{Number(plan.price).toLocaleString('en-IN')}
                      </span>
                      <span className="text-muted fs-13"> / year</span>
                    </div>

                    <div className="border-top border-bottom py-3 mb-4 flex-grow-1">
                      <div className="d-flex align-items-center mb-2 fs-13 text-secondary">
                        <i className="ti ti-check text-success fs-16 me-2"></i>
                        <span>
                          <strong>{plan.max_students > 0 ? `${plan.max_students} Students` : 'Unlimited Students'}</strong>
                        </span>
                      </div>
                      <div className="d-flex align-items-center mb-2 fs-13 text-secondary">
                        <i className="ti ti-check text-success fs-16 me-2"></i>
                        <span>
                          <strong>{plan.max_teachers > 0 ? `${plan.max_teachers} Staff & Teachers` : 'Unlimited Staff'}</strong>
                        </span>
                      </div>
                      <div className="d-flex align-items-center mb-2 fs-13 text-secondary">
                        <i className="ti ti-check text-success fs-16 me-2"></i>
                        <span>Academic Setup, Routine, Classrooms</span>
                      </div>
                      <div className="d-flex align-items-center mb-2 fs-13 text-secondary">
                        <i className="ti ti-check text-success fs-16 me-2"></i>
                        <span>Fees, Invoices, Collection Receipts</span>
                      </div>
                      <div className="d-flex align-items-center mb-2 fs-13 text-secondary">
                        <i className="ti ti-check text-success fs-16 me-2"></i>
                        <span>Student & Teacher Attendance Tracking</span>
                      </div>
                      <div className="d-flex align-items-center fs-13 text-secondary">
                        <i className="ti ti-check text-success fs-16 me-2"></i>
                        <span>Transfer & Character Certificates</span>
                      </div>
                    </div>

                    {isCurrent ? (
                      <button
                        type="button"
                        className={`btn w-100 py-2.5 fw-semibold ${
                          isExpired
                            ? 'btn-danger shadow-sm'
                            : daysLeft <= 30
                            ? 'btn-warning text-dark shadow-sm'
                            : 'btn-outline-success'
                        }`}
                        onClick={() => openUpgradeModal(plan.id)}
                      >
                        {isExpired ? (
                          <>
                            <i className="ti ti-refresh me-1"></i> Renew {plan.plan_name}
                          </>
                        ) : daysLeft <= 30 ? (
                          <>
                            <i className="ti ti-refresh me-1"></i> Renew Plan ({daysLeft}d left)
                          </>
                        ) : (
                          <>
                            <i className="ti ti-check me-1"></i> Current Plan (Active)
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={`btn w-100 py-2.5 fw-semibold ${
                          isPopular ? 'btn-primary shadow-sm' : 'btn-outline-primary'
                        }`}
                        onClick={() => openUpgradeModal(plan.id)}
                      >
                        <i className="ti ti-arrow-up-right me-1"></i> Upgrade to {plan.plan_name}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionBilling;
