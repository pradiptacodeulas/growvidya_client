import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logoutParent } from '../../store/slices/parentAuthSlice';
import logoDark from '../../assets/logo_dark.png';
import logoSmall from '../../assets/logo-small.png';
import schoolLogoDefault from '../../assets/school-logo.png';
import { resolveImageUrl } from '../../utils/url.util';

const ParentSidebar = ({
  isCollapsed,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  onToggleSidebar,
  isMobileMenuOpen,
  onCloseMobileMenu,
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { parent } = useSelector((state) => state.parentAuth);

  const schoolLogoSrc = resolveImageUrl(parent?.schoolLogo || parent?.school_logo) || schoolLogoDefault;
  const schoolName = parent?.schoolName || parent?.school_name || 'Growvidya School';

  const handleLogout = (e) => {
    e.preventDefault();
    if (onCloseMobileMenu) onCloseMobileMenu();
    dispatch(logoutParent());
    navigate('/parentaccount/parentlogin');
  };

  const showFullLogo = !isCollapsed || isHovered;

  return (
    <div
      className="sidebar"
      id="sidebar"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Sidebar Top Header Element (App Logo & Desktop Hamburger / Mobile Close Button) */}
      <div className="sidebar-logo d-flex align-items-center justify-content-between ps-3 pe-2">
        <Link to="/parent/dashboard" className="d-flex align-items-center text-decoration-none">
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
          title={isCollapsed ? 'Permanently Expand Sidebar' : 'Collapse Sidebar'}
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
          {/* School Profile / Header Widget */}
          <ul className="mb-3">
            <li>
              <a
                href="javascript:void(0);"
                className="d-flex align-items-center border bg-white rounded p-2 text-decoration-none"
              >
                <span
                  className="avatar avatar-md bg-transparent rounded flex-shrink-0 d-inline-flex align-items-center justify-content-center overflow-hidden"
                  style={{ width: '32px', height: '32px', minWidth: '32px' }}
                >
                  <img
                    src={schoolLogoSrc}
                    alt={schoolName}
                    className="img-fluid rounded"
                    style={{ maxHeight: '32px', maxWidth: '32px', objectFit: 'contain' }}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = schoolLogoDefault;
                    }}
                  />
                </span>
                <span className="text-dark ms-2 fw-semibold text-truncate">{schoolName}</span>
              </a>
            </li>
          </ul>

          {/* Navigation Menu Hierarchy */}
          <ul>
            <li>
              <ul>
                <li>
                  <NavLink
                    to="/parent/dashboard"
                    className={({ isActive }) => (isActive ? 'active' : '')}
                    onClick={onCloseMobileMenu}
                  >
                    <i className="ti ti-dashboard"></i>
                    <span>Dashboard</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/parent/profile/child"
                    className={({ isActive }) => (isActive ? 'active' : '')}
                    onClick={onCloseMobileMenu}
                  >
                    <i className="ti ti-school"></i>
                    <span>Profile</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/parent/studymaterial"
                    className={({ isActive }) => (isActive ? 'active' : '')}
                    onClick={onCloseMobileMenu}
                  >
                    <i className="ti ti-books"></i>
                    <span>Study Material</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/parent/fees"
                    className={({ isActive }) => (isActive ? 'active' : '')}
                    onClick={onCloseMobileMenu}
                  >
                    <i className="ti ti-clipboard-list"></i>
                    <span>Fees</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/parent/attendance"
                    className={({ isActive }) => (isActive ? 'active' : '')}
                    onClick={onCloseMobileMenu}
                  >
                    <i className="ti ti-file-text"></i>
                    <span>Attendance</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/parent/results"
                    className={({ isActive }) => (isActive ? 'active' : '')}
                    onClick={onCloseMobileMenu}
                  >
                    <i className="ti ti-certificate"></i>
                    <span>Exam Result</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/parent/timetable"
                    className={({ isActive }) => (isActive ? 'active' : '')}
                    onClick={onCloseMobileMenu}
                  >
                    <i className="ti ti-calendar-time"></i>
                    <span>Class Routine</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/parent/activities"
                    className={({ isActive }) => (isActive ? 'active' : '')}
                    onClick={onCloseMobileMenu}
                  >
                    <i className="ti ti-activity"></i>
                    <span>Activities</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/parent/transport"
                    className={({ isActive }) => (isActive ? 'active' : '')}
                    onClick={onCloseMobileMenu}
                  >
                    <i className="ti ti-bus"></i>
                    <span>Transport</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/parent/hostel"
                    className={({ isActive }) => (isActive ? 'active' : '')}
                    onClick={onCloseMobileMenu}
                  >
                    <i className="ti ti-building-community"></i>
                    <span>Hostel</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/parent/medical"
                    className={({ isActive }) => (isActive ? 'active' : '')}
                    onClick={onCloseMobileMenu}
                  >
                    <i className="ti ti-first-aid-kit"></i>
                    <span>Medical</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/parent/documents"
                    className={({ isActive }) => (isActive ? 'active' : '')}
                    onClick={onCloseMobileMenu}
                  >
                    <i className="ti ti-file-certificate"></i>
                    <span>Documents</span>
                  </NavLink>
                </li>
                <li>
                  <a href="#logout" onClick={handleLogout}>
                    <i className="ti ti-logout"></i>
                    <span>Logout</span>
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

export default ParentSidebar;
