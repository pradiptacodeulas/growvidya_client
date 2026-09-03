import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import ParentNavbar from '../components/parent/ParentNavbar';
import ParentSidebar from '../components/parent/ParentSidebar';
import Footer from '../components/common/Footer';

const ParentLayout = () => {
  const location = useLocation();

  // Initialize collapsed state from localStorage so state persists across reloads
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const savedState = localStorage.getItem('parent_sidebar_collapsed');
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
      localStorage.setItem('parent_sidebar_collapsed', String(nextState));
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
      <ParentNavbar
        onToggleMobileMenu={toggleMobileMenu}
        isMobileMenuOpen={isMobileMenuOpen}
      />
      <ParentSidebar
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
          <Outlet />
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

export default ParentLayout;
