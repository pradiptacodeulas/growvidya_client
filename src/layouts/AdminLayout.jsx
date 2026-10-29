import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import Footer from '../components/common/Footer';
import PageLoader from '../components/common/PageLoader';
import NotificationPermissionBanner from '../components/common/NotificationPermissionBanner';
import { useSubscription } from '../context/SubscriptionContext';
import { useMessageNotificationSync } from '../hooks/useMessageNotificationSync';

const AdminLayout = () => {
  useMessageNotificationSync();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth || {});
  const {
    isExpired,
    isSuspended,
    isPending,
    isLockedOut,
    isTrial,
    subscription,
    loading,
  } = useSubscription();

  const isBillingAdmin = Boolean(
    user?.isSuperAdmin ||
      Number(user?.adminType || user?.admin_type) === 1 ||
      ['super admin', 'admin'].includes(
        String(user?.roleName || user?.role_name || '').toLowerCase()
      )
  );

  // If subscription is expired, suspended, or pending initial approval, only subscription/billing and help-support pages are allowed
  const isAllowedLockedPath =
    location.pathname.startsWith('/admin/subscription') ||
    location.pathname.startsWith('/admin/billing') ||
    location.pathname.startsWith('/admin/help-support');

  useEffect(() => {
    if (isLockedOut && !loading && isBillingAdmin && !isAllowedLockedPath) {
      navigate('/admin/subscription', { replace: true });
    }
  }, [isLockedOut, loading, isBillingAdmin, isAllowedLockedPath, navigate]);

  const [isCollapsed, setIsCollapsed] = useState(() => {
    const savedState = localStorage.getItem('sidebar_collapsed');
    return savedState === 'true';
  });
  const [isHovered, setIsHovered] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const nextState = !prev;
      localStorage.setItem('sidebar_collapsed', String(nextState));
      return nextState;
    });
    setIsHovered(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleMouseEnter = () => {
    if (isCollapsed) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (isCollapsed) {
      setIsHovered(false);
    }
  };

  useEffect(() => {
    if (isCollapsed) {
      document.body.classList.add('mini-sidebar');
    } else {
      document.body.classList.remove('mini-sidebar');
    }
  }, [isCollapsed]);

  useEffect(() => {
    if (isCollapsed && isHovered) {
      document.body.classList.add('expand-menu');
    } else {
      document.body.classList.remove('expand-menu');
    }
  }, [isCollapsed, isHovered]);

  return (
    <div
      className={`main-wrapper ${isCollapsed ? 'mini-sidebar' : ''} ${
        isCollapsed && isHovered ? 'expand-menu' : ''
      } ${isMobileMenuOpen ? 'slide-nav' : ''}`}
    >
      <Navbar
        onToggleMobileMenu={toggleMobileMenu}
        isMobileMenuOpen={isMobileMenuOpen}
      />
      <Sidebar
        isCollapsed={isCollapsed}
        isHovered={isHovered}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onToggleSidebar={toggleSidebar}
        isMobileMenuOpen={isMobileMenuOpen}
        onCloseMobileMenu={closeMobileMenu}
      />
      <div className="page-wrapper d-flex flex-column justify-content-between">
        <NotificationPermissionBanner />
        <div className="flex-grow-1">
          {isLockedOut && !loading && !isBillingAdmin && !location.pathname.startsWith('/admin/help-support') ? (
            <div className="content d-flex align-items-center justify-content-center" style={{ minHeight: '65vh' }}>
              <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5 text-center" style={{ maxWidth: '540px' }}>
                <div
                  className="rounded-circle bg-warning-subtle text-warning-emphasis d-inline-flex align-items-center justify-content-center mx-auto mb-3"
                  style={{ width: '68px', height: '68px' }}
                >
                  <i className="ti ti-shield-lock fs-32"></i>
                </div>
                <h4 className="fw-bold text-dark mb-2">School Portal Services Temporarily Paused</h4>
                <p className="text-muted fs-14 mb-4">
                  Operational modules for your institution are currently paused. All school records and data remain 100% safe.
                  Please contact your <strong>School Principal or Super Administrator</strong> to restore portal access.
                </p>
                <div className="d-flex justify-content-center gap-2">
                  <Link to="/admin/help-support" className="btn btn-outline-primary px-4">
                    <i className="ti ti-headset me-1.5"></i> Help &amp; Support
                  </Link>
                </div>
              </div>
            </div>
          ) : isLockedOut && !loading && isBillingAdmin && !isAllowedLockedPath ? (
            <div className="content d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
              <div className="text-center">
                <div className="spinner-border text-primary mb-2" role="status"></div>
                <div className="text-muted fs-13">
                  {isPending
                    ? 'Subscription pending verification. Directing to Subscription & Billing...'
                    : isSuspended
                    ? 'Subscription suspended. Directing to Subscription & Billing...'
                    : `${isTrial ? 'Trial' : subscription?.plan_name || 'Subscription'} expired. Directing to Subscription & Billing...`}
                </div>
              </div>
            </div>
          ) : (
            <React.Suspense fallback={<PageLoader />}>
              <Outlet />
            </React.Suspense>
          )}
        </div>
        <Footer />
      </div>

      {isMobileMenuOpen && (
        <div
          className="sidebar-overlay opened"
          onClick={closeMobileMenu}
        ></div>
      )}
    </div>
  );
};

export default AdminLayout;
