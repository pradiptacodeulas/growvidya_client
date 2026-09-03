import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logoutStudent } from '../../store/slices/studentAuthSlice';
import logoDark from '../../assets/logo_dark.png';
import logoSmall from '../../assets/logo-small.png';
import maleUserDefault from '../../assets/male-user.png';
import { resolveImageUrl } from '../../utils/url.util';

const StudentSidebar = ({
  isCollapsed,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  onToggleSidebar,
  isMobileMenuOpen,
  onCloseMobileMenu,
}) => {
  const dispatch = useDispatch();
  const location = useLocation();
  const { student } = useSelector((state) => state.studentAuth);

  const isAcademicActive =
    location.pathname.startsWith('/student/assignments') ||
    location.pathname.startsWith('/studentacademic/assignment');

  const [openSubmenu, setOpenSubmenu] = useState(() => ({
    academic: true,
  }));

  useEffect(() => {
    if (isAcademicActive) {
      setOpenSubmenu((prev) => ({ ...prev, academic: true }));
    }
  }, [location.pathname, isAcademicActive]);

  const toggleSubmenu = (key) => {
    setOpenSubmenu((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleLogout = (e) => {
    e.preventDefault();
    if (onCloseMobileMenu) onCloseMobileMenu();
    dispatch(logoutStudent());
  };

  const showFullLogo = !isCollapsed || isHovered;

  const studentPhoto = resolveImageUrl(student?.picture) || maleUserDefault;
  const studentName =
    student?.full_name ||
    student?.fullName ||
    (student?.first_name || student?.firstName
      ? `${student.first_name || student.firstName} ${student.last_name || student.lastName || ''}`.trim()
      : student?.name || 'Student');
  const admissionNo =
    student?.admission_number ||
    student?.admissionNumber ||
    student?.roll_number ||
    student?.rollNumber ||
    '895321';

  return (
    <div
      className="sidebar"
      id="sidebar"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Sidebar Top Header Element (App Logo & Desktop Hamburger / Mobile Close Button) */}
      <div className="sidebar-logo d-flex align-items-center justify-content-between ps-3 pe-2">
        <Link to="/student/dashboard" className="d-flex align-items-center text-decoration-none">
          <img
            src={showFullLogo ? logoDark : logoSmall}
            alt="Growvidya Logo"
            style={{
              width: showFullLogo ? '185px' : '38px',
              maxWidth: showFullLogo ? '195px' : '38px',
              maxHeight: showFullLogo ? '50px' : '38px',
              height: 'auto',
              objectFit: 'contain',
              transition: 'all 0.2s ease',
            }}
          />
        </Link>

        {/* Desktop Collapse Toggle Button */}
        <a
          id="toggle_btn"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            if (onToggleSidebar) onToggleSidebar();
          }}
          className={`d-none d-lg-flex text-dark fs-20 align-items-center justify-content-center ${
            isCollapsed ? 'active' : ''
          }`}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          <i className="ti ti-menu-deep fs-20 text-dark"></i>
        </a>

        {/* Mobile Close Button (shown on smaller screens < 992px) */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            if (onCloseMobileMenu) onCloseMobileMenu();
          }}
          className="d-flex d-lg-none btn btn-sm btn-icon btn-light rounded-circle text-dark align-items-center justify-content-center border"
          title="Close Sidebar"
          style={{ width: '32px', height: '32px' }}
        >
          <i className="ti ti-x fs-18 text-dark"></i>
        </button>
      </div>

      {/* Sidebar Scrollable Menu Body */}
      <div className="sidebar-inner slimscroll flex-fill">
        <div id="sidebar-menu" className="sidebar-menu">
          {/* Student Profile Widget */}
          <ul>
            <li className="text-center">
              <Link
                to="/student/profile"
                className="d-flex align-items-center border bg-white rounded p-2 mb-4 text-decoration-none student-sidebar-profile"
                onClick={onCloseMobileMenu}
                title={`${studentName} (Adm: ${admissionNo})`}
              >
                <img
                  src={studentPhoto}
                  className="avatar avatar-md img-fluid rounded-circle flex-shrink-0"
                  alt={studentName}
                  style={{
                    width: '40px',
                    height: '40px',
                    objectFit: 'cover',
                  }}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = maleUserDefault;
                  }}
                />
                <div className="ms-2 overflow-hidden text-start student-profile-info" style={{ flex: 1, minWidth: 0 }}>
                  <span className="text-dark fw-bold d-block text-truncate fs-13" style={{ color: '#1e293b' }}>{studentName}</span>
                  <small className="text-muted d-block fs-11">Adm: {admissionNo}</small>
                </div>
              </Link>
            </li>
          </ul>

          <ul>
            <li>
              <ul>
                <li>
                  <NavLink
                    to="/student/dashboard"
                    className={({ isActive }) => (isActive ? 'active' : '')}
                    onClick={onCloseMobileMenu}
                  >
                    <i className="ti ti-dashboard"></i><span>Dashboard</span>
                  </NavLink>
                </li>

                <li className={`submenu ${openSubmenu.academic ? 'active' : ''}`}>
                  <a
                    href="javascript:void(0);"
                    className={`subdrop ${openSubmenu.academic ? 'active' : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      toggleSubmenu('academic');
                    }}
                  >
                    <i className="ti ti-school"></i><span>Academic</span><span className="menu-arrow"></span>
                  </a>
                  <ul style={{ display: openSubmenu.academic ? 'block' : 'none' }}>
                    <li>
                      <NavLink
                        to="/student/assignments"
                        className={({ isActive }) => (isActive ? 'active' : '')}
                        onClick={onCloseMobileMenu}
                      >
                        Assignments
                      </NavLink>
                    </li>
                  </ul>
                </li>

                <li>
                  <NavLink
                    to="/student/change-password"
                    className={({ isActive }) => (isActive ? 'active' : '')}
                    onClick={onCloseMobileMenu}
                  >
                    <i className="ti ti-lock"></i><span>Change Password</span>
                  </NavLink>
                </li>

                <li>
                  <a
                    href="#logout"
                    onClick={handleLogout}
                    className="text-danger"
                  >
                    <i className="ti ti-logout text-danger"></i><span>Logout</span>
                  </a>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default StudentSidebar;
