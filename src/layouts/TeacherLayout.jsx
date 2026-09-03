import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import TeacherNavbar from '../components/teacher/TeacherNavbar';
import TeacherSidebar from '../components/teacher/TeacherSidebar';
import Footer from '../components/common/Footer';

const TeacherLayout = () => {
  const location = useLocation();

  const [isCollapsed, setIsCollapsed] = useState(() => {
    const savedState = localStorage.getItem('teacher_sidebar_collapsed');
    return savedState === 'true';
  });
  const [isHovered, setIsHovered] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const nextState = !prev;
      localStorage.setItem('teacher_sidebar_collapsed', String(nextState));
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
      <TeacherNavbar
        onToggleMobileMenu={toggleMobileMenu}
        isMobileMenuOpen={isMobileMenuOpen}
      />
      <TeacherSidebar
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

export default TeacherLayout;
