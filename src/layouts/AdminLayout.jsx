import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';

const AdminLayout = () => {
  // Initialize collapsed state from localStorage so state persists across reloads
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const savedState = localStorage.getItem('sidebar_collapsed');
    return savedState === 'true';
  });
  const [isHovered, setIsHovered] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
      <Navbar onToggleMobileMenu={toggleMobileMenu} />
      <Sidebar
        isCollapsed={isCollapsed}
        isHovered={isHovered}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onToggleSidebar={toggleSidebar}
      />
      <div className="page-wrapper">
        <div className="content">
          <Outlet />
        </div>
      </div>

      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div
          className="sidebar-overlay opened"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default AdminLayout;
