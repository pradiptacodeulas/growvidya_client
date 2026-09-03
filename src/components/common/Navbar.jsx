import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { logoutAdmin } from '../../store/slices/authSlice';
import { fetchAcademicYearsApi } from '../../api/adminAcademic.api';
import { fetchNoticesApi } from '../../api/adminAnnouncement.api';

const Navbar = ({ onToggleMobileMenu, isMobileMenuOpen }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [darkMode, setDarkMode] = useState(false);
  const [currentYearText, setCurrentYearText] = useState('2026');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [hasUnread, setHasUnread] = useState(true);
  const notificationRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const loadNotices = async () => {
      try {
        const res = await fetchNoticesApi();
        const list = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.notices)
          ? res.notices
          : Array.isArray(res)
          ? res
          : [];
        setNotifications(list);
      } catch (err) {
        console.error('Failed to load notices for admin navbar:', err);
      }
    };
    loadNotices();
  }, []);

  useEffect(() => {
    const loadCurrentAcademicYear = async () => {
      try {
        const res = await fetchAcademicYearsApi();
        const years = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.data?.academicYears)
          ? res.data.academicYears
          : Array.isArray(res)
          ? res
          : [];

        const activeYear =
          years.find((y) => Number(y.is_current) === 1 || String(y.is_current) === '1' || y.isCurrent) ||
          years[0];
        if (activeYear) {
          setCurrentYearText(activeYear.academic_year || activeYear.name || '2026');
        }
      } catch (err) {
        console.error('Failed to load current academic year for navbar:', err);
      }
    };

    loadCurrentAcademicYear();
  }, []);

  const handleLogout = (e) => {
    e.preventDefault();
    dispatch(logoutAdmin());
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="header">
      {/* Mobile Hamburger / Close Toggle Button */}
      <a
        id="mobile_btn"
        className={`mobile_btn ${isMobileMenuOpen ? 'menu-opened' : ''}`}
        href="#sidebar"
        onClick={(e) => {
          e.preventDefault();
          onToggleMobileMenu();
        }}
        title={isMobileMenuOpen ? 'Close Menu' : 'Open Menu'}
      >
        {isMobileMenuOpen ? (
          <i className="ti ti-x fs-22 text-primary"></i>
        ) : (
          <span className="bar-icon">
            <span></span>
            <span></span>
            <span></span>
          </span>
        )}
      </a>

      {/* Header User Navigation Controls */}
      <div className="header-user">
        <div className="nav user-menu">
          {/* Left Spacer */}
          <div className="me-auto"></div>

          <div className="d-flex align-items-center">
            {/* Current Academic Year Badge (No Dropdown) */}
            <div className="me-2 d-none d-sm-flex align-items-center bg-white border rounded px-2 py-1 text-dark fw-medium fs-13 shadow-none">
              <i className="ti ti-calendar-due me-1 text-primary"></i>
              <span>Academic Year : <strong className="text-primary">{currentYearText}</strong></span>
            </div>

            {/* Add New Quick Button */}
            <div className="pe-1">
              <div className="dropdown">
                <a href="#" className="btn btn-outline-light bg-white btn-icon me-1" data-bs-toggle="dropdown" aria-expanded="false">
                  <i className="ti ti-square-rounded-plus"></i>
                </a>
                <div className="dropdown-menu dropdown-menu-right border shadow-sm dropdown-md">
                  <div className="p-3 border-bottom">
                    <h5>Add New</h5>
                  </div>
                  <div className="p-3 pb-0">
                    <div className="row gx-2">
                      <div className="col-6">
                        <a href="/admin/students" className="d-block bg-primary-transparent rounded p-2 text-center mb-3 class-hover">
                          <div className="avatar avatar-lg mb-2">
                            <span className="d-inline-flex align-items-center justify-content-center w-100 h-100 bg-primary rounded-circle text-white">
                              <i className="ti ti-school"></i>
                            </span>
                          </div>
                          <p className="text-dark mb-0">Students</p>
                        </a>
                      </div>
                      <div className="col-6">
                        <a href="/admin/teachers" className="d-block bg-success-transparent rounded p-2 text-center mb-3 class-hover">
                          <div className="avatar avatar-lg mb-2">
                            <span className="d-inline-flex align-items-center justify-content-center w-100 h-100 bg-success rounded-circle text-white">
                              <i className="ti ti-users"></i>
                            </span>
                          </div>
                          <p className="text-dark mb-0">Teachers</p>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Dark / Light Toggle */}
            <div className="pe-1">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setDarkMode(!darkMode);
                }}
                className={`dark-mode-toggle btn btn-outline-light bg-white btn-icon me-1 ${darkMode ? 'activate' : ''}`}
              >
                <i className={darkMode ? 'ti ti-brightness-up' : 'ti ti-moon'}></i>
              </a>
            </div>

            {/* Notifications Icon & Dropdown */}
            <div
              className={`pe-1 position-relative ${showNotifications ? 'notification-item-show' : ''}`}
              id="notification_item"
              ref={notificationRef}
            >
              <button
                type="button"
                className="btn btn-outline-light bg-white btn-icon position-relative me-1"
                id="notification_popup"
                onClick={() => setShowNotifications((prev) => !prev)}
                title="Notifications"
              >
                <i className="ti ti-bell"></i>
                {hasUnread && <span className="notification-status-dot"></span>}
              </button>

              {showNotifications && (
                <div
                  className="dropdown-menu dropdown-menu-end notification-dropdown p-3 shadow-lg border show"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    left: 'auto',
                    minWidth: '340px',
                    maxWidth: '380px',
                    display: 'block',
                    zIndex: 1050,
                  }}
                >
                  <div className="d-flex align-items-center justify-content-between border-bottom pb-2 mb-3">
                    <h5 className="notification-title mb-0 fs-15 fw-bold text-dark">
                      Notifications {notifications.length > 0 ? `(${notifications.length})` : ''}
                    </h5>
                    {hasUnread && (
                      <button
                        type="button"
                        onClick={() => setHasUnread(false)}
                        className="btn btn-link text-primary p-0 fs-12 text-decoration-none fw-medium"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="noti-content" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                    {notifications.length > 0 ? (
                      <div className="d-flex flex-column gap-2">
                        {notifications.slice(0, 5).map((notice, idx) => (
                          <div
                            key={notice.id || idx}
                            className="p-2 rounded border-bottom bg-light-300 transition-all hover-bg"
                          >
                            <div className="d-flex align-items-start gap-2">
                              <span className="avatar avatar-sm bg-primary-transparent text-primary rounded-circle flex-shrink-0 mt-1 d-flex align-items-center justify-content-center">
                                <i className="ti ti-note fs-14"></i>
                              </span>
                              <div className="overflow-hidden flex-fill">
                                <p className="mb-1 fs-13 fw-semibold text-dark text-truncate">
                                  {notice.title}
                                </p>
                                {notice.message && (
                                  <p className="mb-1 fs-12 text-muted text-truncate">
                                    {notice.message}
                                  </p>
                                )}
                                <span className="fs-11 text-muted d-block">
                                  <i className="ti ti-calendar me-1"></i>
                                  {notice.publish_on || notice.notice_date || 'Recent Notice'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted">
                        <i className="ti ti-bell-off fs-28 d-block mb-1 opacity-50"></i>
                        <p className="mb-0 fs-12">No notifications found</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 mt-2 border-top">
                    <Link
                      to="/admin/announcements"
                      className="btn btn-primary btn-sm w-100 fw-medium"
                      onClick={() => setShowNotifications(false)}
                    >
                      View All Notices
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Fullscreen Toggle */}
            <div className="pe-1">
              <a href="#" onClick={(e) => { e.preventDefault(); toggleFullscreen(); }} className="btn btn-outline-light bg-white btn-icon me-1">
                <i className="ti ti-maximize"></i>
              </a>
            </div>

            {/* User Profile Avatar & Dropdown */}
            <div className="dropdown ms-1">
              <a href="#" onClick={(e) => e.preventDefault()} className="dropdown-toggle d-flex align-items-center" data-bs-toggle="dropdown">
                <span className="avatar avatar-md rounded bg-primary text-white d-flex align-items-center justify-content-center fw-bold">
                  {user?.firstName ? user.firstName[0].toUpperCase() : 'A'}
                </span>
              </a>
              <div className="dropdown-menu dropdown-menu-end shadow-sm">
                <div className="d-block">
                  <div className="d-flex align-items-center p-3">
                    <span className="avatar avatar-md me-2 online avatar-rounded bg-primary text-white d-flex align-items-center justify-content-center fw-bold">
                      {user?.firstName ? user.firstName[0].toUpperCase() : 'A'}
                    </span>
                    <div>
                      <h6 className="mb-0 fw-bold">{user?.firstName ? `${user.firstName} ${user.lastName}` : 'admin admin'}</h6>
                      <p className="text-primary mb-0 fs-12">{user?.roleName || 'Administrator'}</p>
                    </div>
                  </div>
                  <hr className="m-0" />
                  <a className="dropdown-item d-inline-flex align-items-center p-2 text-danger" href="#logout" onClick={handleLogout}>
                    <i className="ti ti-logout me-2"></i> Logout
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
