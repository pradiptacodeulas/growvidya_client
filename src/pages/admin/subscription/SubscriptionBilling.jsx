import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../../../context/SubscriptionContext';

const SubscriptionBilling = () => {
  const navigate = useNavigate();
  const {
    subscription,
    upgradePlans,
    loading,
    isTrial,
    isExpired,
    isPending,
    pendingSubscription,
    daysLeft,
  } = useSubscription();

  // Active Billing Cadence: 'annual' (default) or 'monthly'
  const [billingCycle, setBillingCycle] = useState('annual');

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

  // Filter plans strictly by cycle: NEVER mix monthly and annual pricing
  const filteredPlans = (upgradePlans || []).filter((p) => p.billing_cycle === billingCycle);

  // Active subscription plan price for downgrade comparison
  const currentPlanPrice = (subscription && subscription.status === 'active' && !isTrial && subscription.price !== null)
    ? parseFloat(subscription.price)
    : 0;

  // Navigate to Step 2 (Configure Page) with selected plan and billing cycle
  const handleSelectPlan = (plan) => {
    if (plan.is_downgrade || (currentPlanPrice > 0 && parseFloat(plan.price) < currentPlanPrice)) {
      alert(`Downgrading to a lower-tier plan is not permitted. You are currently subscribed to "${planName}" (₹${currentPlanPrice.toFixed(2)}). You may only remain on your current plan or upgrade to an equal or higher-tier plan.`);
      return;
    }
    sessionStorage.setItem('selected_subscription_plan', JSON.stringify(plan));
    sessionStorage.setItem('selected_billing_cycle', billingCycle);
    navigate('/admin/subscription/configure', {
      state: {
        plan,
        billingCycle,
      },
    });
  };

  // Scroll to plans selector or auto-navigate
  const handleScrollToPlans = () => {
    const el = document.getElementById('plans-selection-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleRenewCurrentPlan = () => {
    // Find current plan in the upgrade plans list
    const currentPlan = (upgradePlans || []).find(
      (p) => Number(p.id) === Number(subscription?.plan_id)
    );
    if (currentPlan) {
      handleSelectPlan(currentPlan);
    } else if (filteredPlans.length > 0) {
      handleSelectPlan(filteredPlans[0]);
    } else {
      handleScrollToPlans();
    }
  };

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-4">
        <div>
          <h3 className="page-title mb-1 fw-bold text-dark">Subscription & Billing</h3>
          <p className="text-muted fs-13 mb-0">
            {isTrial
              ? `Monitor your ${planName || 'trial'} evaluation status, quotas, and manage subscription licensing.`
              : 'Monitor your institutional subscription status, renewal countdown, quotas, and manage licensing tiers.'}
          </p>
        </div>
        <div className="mt-3 mt-md-0 d-flex flex-wrap gap-2">
          {isExpired && !isTrial && (
            <button
              type="button"
              className="btn btn-danger d-inline-flex align-items-center shadow-sm"
              onClick={handleRenewCurrentPlan}
            >
              <i className="ti ti-refresh me-2 fs-16"></i>
              <span>Renew {planName}</span>
            </button>
          )}
          {!isExpired && daysLeft <= 30 && !isTrial && (
            <button
              type="button"
              className="btn btn-warning text-dark fw-bold d-inline-flex align-items-center shadow-sm"
              onClick={handleRenewCurrentPlan}
            >
              <i className="ti ti-refresh me-2 fs-16"></i>
              <span>Renew {planName}</span>
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary d-inline-flex align-items-center shadow-sm"
            onClick={handleScrollToPlans}
          >
            <i className="ti ti-crown me-2 fs-16"></i>
            <span>
              {isExpired
                ? isTrial
                  ? 'Upgrade to Paid Plan'
                  : 'Upgrade Plan'
                : 'Explore Plans'}
            </span>
          </button>
        </div>
      </div>

      {/* Plan Approval Pending Notice */}
      {isPending && pendingSubscription && (
        <div className="alert alert-warning border-warning d-flex align-items-center p-3 mb-4 rounded-3 shadow-sm bg-warning-subtle">
          <div className="avatar avatar-md bg-warning text-dark rounded-circle flex-shrink-0 me-3 d-flex align-items-center justify-content-center">
            <i className="ti ti-clock-hour-4 fs-22"></i>
          </div>
          <div className="flex-grow-1">
            <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
              <h6 className="alert-heading fw-bold mb-0 text-dark">
                Plan Approval Pending Review
              </h6>
              <span className="badge bg-warning text-dark border border-warning-subtle fw-semibold px-2 py-0.5 fs-11">
                Awaiting Super Admin Approval
              </span>
            </div>
            <p className="mb-1 fs-13 text-secondary">
              Your request for <strong>{pendingSubscription.plan_name}</strong> ({pendingSubscription.billing_cycle || 'annual'}) has been submitted and is currently pending review and approval by the Super Admin. Once approved, your new plan will become active automatically.
            </p>
            <div className="d-flex flex-wrap align-items-center gap-3 text-muted fs-12 mt-2 pt-2 border-top border-warning-subtle">
              {pendingSubscription.payment_transaction_id && (
                <div>
                  <span className="fw-semibold text-secondary">Ref / Transaction ID:</span>{' '}
                  <span className="font-monospace text-dark">{pendingSubscription.payment_transaction_id}</span>
                </div>
              )}
              {pendingSubscription.amount_paid > 0 && (
                <div>
                  <span className="fw-semibold text-secondary">Amount:</span>{' '}
                  <span className="text-dark fw-bold">₹{Number(pendingSubscription.amount_paid).toLocaleString('en-IN')}</span>
                </div>
              )}
              {pendingSubscription.payment_gateway && (
                <div>
                  <span className="fw-semibold text-secondary">Payment Method:</span>{' '}
                  <span className="badge bg-light text-dark border text-capitalize">
                    {pendingSubscription.payment_gateway === 'bank_transfer'
                      ? 'Direct Bank Transfer'
                      : pendingSubscription.payment_gateway === 'razorpay'
                      ? 'Online (Razorpay)'
                      : pendingSubscription.payment_gateway.replace(/_/g, ' ')}
                  </span>
                </div>
              )}
              {pendingSubscription.created_at && (
                <div>
                  <span className="fw-semibold text-secondary">Submitted On:</span>{' '}
                  <span className="text-dark">
                    {new Date(pendingSubscription.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Active Trial Notice */}
      {isTrial && !isExpired && !isPending && (
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
              Select a monthly or annual subscription below to ensure uninterrupted access when your evaluation concludes.
            </p>
          </div>
          <div className="flex-shrink-0 ms-3 d-none d-sm-block">
            <button
              type="button"
              className="btn btn-primary fw-bold shadow-sm"
              onClick={handleScrollToPlans}
            >
              <i className="ti ti-crown me-1"></i> Choose Plan
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
              onClick={handleRenewCurrentPlan}
            >
              <i className="ti ti-refresh me-1"></i> Renew Plan
            </button>
            <button
              type="button"
              className="btn btn-outline-primary fw-bold shadow-sm"
              onClick={handleScrollToPlans}
            >
              <i className="ti ti-crown me-1"></i> Change Plan
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
              onClick={handleScrollToPlans}
            >
              <i className="ti ti-arrow-up-right me-1"></i> Upgrade / Extend Plan
            </button>
          </div>
        </div>
      )}

      {/* Expired Notice (Trial or Paid) */}
      {isExpired && !isPending && subscription?.status !== 'pending' && (
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
                ? `Your evaluation period for ${planName || 'the platform'} has expired and operational modules are restricted. Select a subscription below to restore full access.`
                : `Your subscription to ${planName} expired on ${subscription?.end_date || 'recently'}. All operational modules are locked. Renew your ${planName} or select a new tier to restore access.`}
            </p>
          </div>
          <div className="flex-shrink-0 ms-3 d-none d-sm-flex gap-2">
            {!isTrial && (
              <button
                type="button"
                className="btn btn-danger fw-bold shadow-sm"
                onClick={handleRenewCurrentPlan}
              >
                <i className="ti ti-refresh me-1"></i> Renew {planName}
              </button>
            )}
            <button
              type="button"
              className="btn btn-outline-danger fw-bold shadow-sm"
              onClick={handleScrollToPlans}
            >
              <i className="ti ti-crown me-1"></i> Choose a Plan
            </button>
          </div>
        </div>
      )}

      {/* Current Plan Overview Card */}
      <div className="card border-0 shadow-sm rounded-3 mb-4 overflow-hidden">
        <div
          className="p-4 text-white"
          style={{
            background:
              subscription?.status === 'pending'
                ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)'
                : isExpired
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
                  {subscription?.status === 'pending'
                    ? `${planName.toUpperCase()} — PENDING APPROVAL`
                    : isExpired
                    ? `${planName.toUpperCase()} — EXPIRED`
                    : isTrial
                    ? `${planName.toUpperCase()} — EVALUATION TRIAL`
                    : `${planName.toUpperCase()} — ACTIVE LICENSE`}
                </span>
                {subscription?.status === 'pending' ? (
                  <span className="badge bg-white bg-opacity-25 text-white fw-bold px-2 py-1 fs-11 rounded-pill">
                    ⏳ Under Review by Super Admin
                  </span>
                ) : !isExpired && (
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
                {subscription?.status === 'pending'
                  ? `Your request for ${planName} is currently pending review and approval by the Super Admin. Once approved, your subscription and institutional features will be activated automatically.`
                  : isExpired
                  ? isTrial
                    ? `Your evaluation period for ${planName || 'trial'} has concluded. Select a plan below to restore administrative workflows.`
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
                  <span className="text-muted fs-12">Staff & Teachers</span>
                  <i className="ti ti-users fs-18 text-success"></i>
                </div>
                <h4 className="fw-bold text-dark mb-0">Unlimited</h4>
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

      {/* STEP 1: Two-Option Billing Cadence Toggle & Plan Cards */}
      <div id="plans-selection-section" className="mb-5 pt-2">
        {/* Toggle Switch */}
        <div className="text-center mb-4">
          <div className="d-inline-block mb-2">
            <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1 fs-11 rounded-pill fw-bold text-uppercase">
              STEP 1: SELECT YOUR BILLING CYCLE
            </span>
          </div>
          <h3 className="fw-bold text-dark mb-2">Choose the Right Plan for Your School</h3>
          <p className="text-muted fs-14 mb-4" style={{ maxWidth: '600px', margin: '0 auto' }}>
            Switch between monthly billing for flexibility, or annual billing to unlock significant savings.
          </p>

          <div
            className="p-1 rounded-pill d-inline-flex align-items-center shadow-sm"
            style={{ backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0' }}
          >
            <button
              type="button"
              className={`btn rounded-pill px-4 py-2 fs-14 fw-bold transition-all ${
                billingCycle === 'monthly'
                  ? 'btn-primary text-white shadow-sm'
                  : 'text-secondary border-0 bg-transparent'
              }`}
              onClick={() => setBillingCycle('monthly')}
            >
              Monthly Billing
            </button>

            <button
              type="button"
              className={`btn rounded-pill px-4 py-2 fs-14 fw-bold transition-all position-relative ${
                billingCycle === 'annual'
                  ? 'btn-primary text-white shadow-sm'
                  : 'text-secondary border-0 bg-transparent'
              }`}
              onClick={() => setBillingCycle('annual')}
            >
              <span>Annual Billing</span>
              <span className="badge bg-success text-white ms-2 fs-10 px-2 py-0.5 rounded-pill shadow-xs">
                SAVE ~17%
              </span>
            </button>
          </div>
        </div>

        {/* Plans Grid strictly isolated by selected billingCycle */}
        <div className="row g-4">
          {filteredPlans.length === 0 ? (
            <div className="col-12 text-center py-5">
              <div className="spinner-border text-primary mb-2" role="status"></div>
              <p className="text-muted fs-13">Loading plans for {billingCycle} billing...</p>
            </div>
          ) : (
            filteredPlans.map((plan) => {
              const isPopular =
                plan.plan_code?.toLowerCase().includes('growth') ||
                plan.plan_name?.toLowerCase().includes('growth') ||
                plan.id === 2 ||
                plan.id === 8;

              const isCurrent = Number(subscription?.plan_id) === Number(plan.id);
              const isPendingPlan = Boolean(pendingSubscription && Number(pendingSubscription.plan_id) === Number(plan.id));
              const isDowngrade = Boolean(
                plan.is_downgrade || (currentPlanPrice > 0 && parseFloat(plan.price) < currentPlanPrice)
              );
              const isUpgrade = Boolean(currentPlanPrice > 0 && parseFloat(plan.price) > currentPlanPrice);
              const includedFeatures = (plan.items || []).filter((i) => i.item_type === 'included');
              const addonFeatures = (plan.items || []).filter((i) => i.item_type === 'addon');

              return (
                <div className="col-12 col-lg-4" key={plan.id}>
                  <div
                    className={`card h-100 rounded-3 border transition-all ${
                      isDowngrade
                        ? 'border-200 bg-light opacity-90'
                        : isPopular
                        ? 'border-2 border-primary shadow'
                        : 'border-200 shadow-sm'
                    }`}
                    style={{ position: 'relative' }}
                  >
                    {isDowngrade && (
                      <div
                        className="badge bg-secondary text-white position-absolute"
                        style={{
                          top: '-12px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          padding: '6px 14px',
                          fontSize: '11px',
                          borderRadius: '20px',
                          boxShadow: '0 4px 10px rgba(100, 116, 139, 0.4)',
                          zIndex: 2,
                        }}
                      >
                        ⛔ DOWNGRADE RESTRICTED
                      </div>
                    )}

                    {!isDowngrade && isCurrent && (
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
                        {subscription?.status === 'pending'
                          ? '⏳ APPROVAL PENDING'
                          : isExpired
                          ? '★ CURRENT PLAN (EXPIRED)'
                          : '★ YOUR CURRENT PLAN'}
                      </div>
                    )}

                    {!isDowngrade && !isCurrent && isPendingPlan && (
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
                        ⏳ APPROVAL PENDING
                      </div>
                    )}

                    {!isDowngrade && !isCurrent && isPopular && (
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
                        <span className="badge bg-light text-secondary border fs-11 px-2 py-0.5 rounded-pill text-uppercase">
                          {billingCycle}
                        </span>
                      </div>
                      <p className="text-muted fs-12 mb-3" style={{ minHeight: '38px' }}>
                        {plan.description}
                      </p>

                      {/* Pricing Tag */}
                      <div className="mb-2">
                        <span className="fs-32 fw-bold text-dark">
                          ₹{Number(plan.price).toLocaleString('en-IN')}
                        </span>
                        <span className="text-muted fs-13">
                          {' '}
                          / {billingCycle === 'monthly' ? 'month' : 'year'}
                        </span>
                      </div>
                      <div className="text-muted fs-11 mb-3">
                        {billingCycle === 'monthly'
                          ? 'Billed monthly, flexible renewal'
                          : 'Billed annually (Best Value for Schools)'}
                      </div>

                      {/* Capacity & Quotas Block */}
                      <div className="p-3 bg-light rounded-3 mb-3 border">
                        <div className="d-flex align-items-center justify-content-between mb-1 fs-12">
                          <span className="text-muted">Student Quota:</span>
                          <strong className="text-dark">
                            {plan.max_students > 0
                              ? `${Number(plan.max_students).toLocaleString()} Students`
                              : 'Unlimited'}
                          </strong>
                        </div>
                        <div className="d-flex align-items-center justify-content-between mb-1 fs-12">
                          <span className="text-muted">Staff / Teachers:</span>
                          <strong className="text-dark">Unlimited</strong>
                        </div>
                        <div className="d-flex align-items-center justify-content-between fs-12">
                          <span className="text-muted">Cloud Backup:</span>
                          <strong className="text-success">Included Daily</strong>
                        </div>
                      </div>

                      {/* Features List with Checkmarks */}
                      <div className="border-top py-3 mb-4 flex-grow-1">
                        <div className="text-dark fs-12 fw-bold text-uppercase mb-2">Key Features:</div>

                        {includedFeatures.length > 0 ? (
                          includedFeatures.slice(0, 4).map((item) => (
                            <div className="d-flex align-items-center mb-2 fs-13 text-secondary" key={item.id}>
                              <i className="ti ti-check text-success fs-16 me-2 flex-shrink-0"></i>
                              <span>
                                {item.item_name}
                                {item.quota_limit && (
                                  <span className="text-muted fs-11 ms-1">
                                    ({Number(item.quota_limit).toLocaleString()} {item.unit || 'units'})
                                  </span>
                                )}
                              </span>
                            </div>
                          ))
                        ) : null}

                        <div className="d-flex align-items-center mb-2 fs-13 text-secondary">
                          <i className="ti ti-check text-success fs-16 me-2 flex-shrink-0"></i>
                          <span>Academic Setup, Routine & Timetable</span>
                        </div>
                        <div className="d-flex align-items-center mb-2 fs-13 text-secondary">
                          <i className="ti ti-check text-success fs-16 me-2 flex-shrink-0"></i>
                          <span>Fee Invoices & Online Receipts</span>
                        </div>
                        <div className="d-flex align-items-center mb-2 fs-13 text-secondary">
                          <i className="ti ti-check text-success fs-16 me-2 flex-shrink-0"></i>
                          <span>Student & Staff Attendance Tracking</span>
                        </div>
                        <div className="d-flex align-items-center fs-13 text-secondary">
                          <i className="ti ti-check text-success fs-16 me-2 flex-shrink-0"></i>
                          <span>Transfer & Character Certificates</span>
                        </div>

                        {addonFeatures.length > 0 && (
                          <div className="text-primary fs-11 mt-3 pt-2 border-top">
                            <i className="ti ti-plus me-1"></i> {addonFeatures.length} Add-on(s) configurable in Step 2
                          </div>
                        )}
                      </div>

                      {/* Clear Selection Button redirecting to Configure page */}
                      {isDowngrade ? (
                        <div>
                          <button
                            type="button"
                            disabled
                            className="btn btn-secondary text-white w-100 py-2.5 fw-semibold d-inline-flex align-items-center justify-content-center opacity-75 cursor-not-allowed"
                            title={`Downgrading to a lower-tier plan is not permitted. You are currently subscribed to "${planName}" (₹${currentPlanPrice.toFixed(2)}).`}
                          >
                            <i className="ti ti-ban me-2 fs-15"></i>
                            <span>Downgrade Not Allowed</span>
                          </button>
                          <div className="text-danger text-center fs-11 mt-1.5 fw-semibold">
                            <i className="ti ti-info-circle me-1"></i> Cannot downgrade from {planName} (₹{currentPlanPrice.toFixed(2)})
                          </div>
                        </div>
                      ) : isPendingPlan || (isCurrent && subscription?.status === 'pending') ? (
                        <button
                          type="button"
                          disabled
                          className="btn btn-warning text-dark w-100 py-2.5 fw-semibold d-inline-flex align-items-center justify-content-center opacity-85 cursor-not-allowed"
                        >
                          <i className="ti ti-clock me-2 fs-15"></i>
                          <span>Approval Pending</span>
                        </button>
                      ) : isCurrent ? (
                        <button
                          type="button"
                          className="btn btn-outline-primary w-100 py-2.5 fw-semibold d-inline-flex align-items-center justify-content-center shadow-sm"
                          onClick={() => handleSelectPlan(plan)}
                        >
                          <i className="ti ti-refresh me-2 fs-15"></i>
                          <span>Renew Current Plan</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={`btn w-100 py-2.5 fw-semibold d-inline-flex align-items-center justify-content-center shadow-sm ${
                            isPopular ? 'btn-primary' : 'btn-outline-primary'
                          }`}
                          onClick={() => handleSelectPlan(plan)}
                        >
                          <span>{isUpgrade ? 'Upgrade Plan' : 'Select Plan'}</span>
                          <i className="ti ti-arrow-right ms-2 fs-15"></i>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionBilling;
