import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import Footer from '../components/common/Footer';
import PageLoader from '../components/common/PageLoader';
import { useSubscription } from '../context/SubscriptionContext';
import { useMessageNotificationSync } from '../hooks/useMessageNotificationSync';

const AdminLayout = () => {
  useMessageNotificationSync();
  const location = useLocation();
  const navigate = useNavigate();
  const { isExpired, isTrial, subscription, loading } = useSubscription();

  // If trial/subscription has expired, only subscription/billing pages are allowed
  const isAllowedExpiredPath =
    location.pathname.startsWith('/admin/subscription') ||
    location.pathname.startsWith('/admin/billing');

  useEffect(() => {
    if (isExpired && !loading && !isAllowedExpiredPath) {
      navigate('/admin/subscription', { replace: true });
    }
  }, [isExpired, loading, isAllowedExpiredPath, navigate]);

  // Initialize collapsed state from localStorage so state persists across reloads
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const savedState = localStorage.getItem('sidebar_collapsed');
    return savedState === 'true';
  });
  const [isHovered, setIsHovered] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Toggle permanent collapsed vs open mode via hamburger click and persist to localStorage
  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const nextState = !prev;
      localStorage.setItem('sidebar_collapsed', String(nextState));
      return nextState;
    });
    setIsHovered(false); // Reset hover on click
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Expand temporarily on mouse enter when collapsed
  const handleMouseEnter = () => {
    if (isCollapsed) {
      setIsHovered(true);
    }
  };

  // Collapse back on mouse leave when collapsed
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
        <div className="flex-grow-1">
          {isExpired && !loading && !isAllowedExpiredPath ? (
            <div className="content d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
              <div className="text-center">
                <div className="spinner-border text-danger mb-2" role="status"></div>
                <div className="text-muted fs-13">
                  {isTrial ? 'Trial' : `${subscription?.plan_name || 'Subscription'}`} expired. Directing to Subscription & Plans...
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

      {/* Mobile Backdrop Overlay */}
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
