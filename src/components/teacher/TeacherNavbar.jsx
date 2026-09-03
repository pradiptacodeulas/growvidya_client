import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { logoutTeacher } from '../../store/slices/teacherAuthSlice';
import { fetchTeacherAcademicYearsApi } from '../../api/teacherAcademic.api';
import { fetchTeacherNoticesApi } from '../../api/teacherAnnouncement.api';
import Avatar from '../common/Avatar';

const TeacherNavbar = ({ onToggleMobileMenu, isMobileMenuOpen }) => {
  const dispatch = useDispatch();
  const { teacher } = useSelector((state) => state.teacherAuth);
  const [currentYearText, setCurrentYearText] = useState('2026 - 2027');
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
    const loadTeacherNotices = async () => {
      try {
        const res = await fetchTeacherNoticesApi();
        const list = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.notices)
          ? res.notices
          : Array.isArray(res)
          ? res
          : [];
        setNotifications(list);
      } catch (err) {
        console.error('Failed to load notices for teacher navbar:', err);
      }
    };
    loadTeacherNotices();
  }, []);

  useEffect(() => {
    const loadCurrentAcademicYear = async () => {
      try {
        const res = await fetchTeacherAcademicYearsApi();
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
          setCurrentYearText(activeYear.academic_year || activeYear.name || '2026 - 2027');
        }
      } catch (err) {
        console.error('Failed to load academic year for teacher navbar:', err);
      }
    };

    loadCurrentAcademicYear();
  }, []);

  const handleLogout = (e) => {
    e.preventDefault();
    dispatch(logoutTeacher());
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
            {/* Current Academic Year Badge */}
            <div className="me-2 d-none d-sm-flex align-items-center bg-white border rounded px-2 py-1 text-dark fw-medium fs-13 shadow-none">
              <i className="ti ti-calendar-due me-1 text-primary"></i>
              <span>Academic Year : <strong className="text-primary">{currentYearText}</strong></span>
            </div>

            {/* Portal Badge */}
            <div className="me-2 d-none d-md-flex align-items-center">
              <span className="badge bg-primary-transparent text-primary px-2 py-1 fs-12 fw-semibold">
                <i className="ti ti-user-star me-1"></i>Teacher Portal
              </span>
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
                      to="/teacher/dashboard"
                      className="btn btn-primary btn-sm w-100 fw-medium"
                      onClick={() => setShowNotifications(false)}
                    >
                      View All
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Fullscreen Toggle */}
            <div className="pe-1">
              <a
                href="#fullscreen"
                onClick={(e) => {
                  e.preventDefault();
                  toggleFullscreen();
                }}
                className="btn btn-outline-light bg-white btn-icon me-1"
                title="Toggle Fullscreen"
              >
                <i className="ti ti-maximize"></i>
              </a>
            </div>

            {/* User Profile Dropdown */}
            <div className="dropdown ms-1">
              <a
                href="#"
                className="dropdown-toggle d-flex align-items-center"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <span className="avatar avatar-md rounded">
                  <Avatar
                    src={teacher?.picture}
                    alt={teacher?.name || `${teacher?.firstName || ''} ${teacher?.lastName || ''}`.trim() || 'Teacher'}
                    className="img-fluid rounded"
                  />
                </span>
              </a>
              <div className="dropdown-menu dropdown-menu-end shadow-sm border">
                <div className="d-block">
                  <div className="d-flex align-items-center p-2">
                    <span className="avatar avatar-md me-2 avatar-rounded">
                      <Avatar
                        src={teacher?.picture}
                        alt={teacher?.name || `${teacher?.firstName || ''} ${teacher?.lastName || ''}`.trim() || 'Teacher'}
                        className="img-fluid"
                      />
                    </span>
                    <div>
                      <h6 className="mb-0 fs-14 fw-semibold">
                        {teacher?.name || `${teacher?.firstName || ''} ${teacher?.lastName || ''}`.trim() || 'Teacher'}
                      </h6>
                      <p className="text-muted mb-0 fs-12">
                        {teacher?.teacherId ? `#${teacher.teacherId}` : 'Teacher'}
                        {teacher?.className ? ` • ${teacher.className}` : ''}
                      </p>
                    </div>
                  </div>
                  <hr className="m-0" />
                  <Link
                    to="/teacher/profile"
                    className="dropdown-item d-inline-flex align-items-center p-2"
                  >
                    <i className="ti ti-user-circle me-2 text-primary"></i>My Profile
                  </Link>
                  <Link
                    to="/teacher/profile"
                    className="dropdown-item d-inline-flex align-items-center p-2"
                  >
                    <i className="ti ti-edit me-2 text-muted"></i>Edit Profile
                  </Link>
                  <hr className="m-0" />
                  <a
                    className="dropdown-item d-inline-flex align-items-center p-2 text-danger"
                    href="#logout"
                    onClick={handleLogout}
                  >
                    <i className="ti ti-logout me-2"></i>Logout
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

export default TeacherNavbar;
