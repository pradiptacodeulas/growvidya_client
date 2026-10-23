import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { logoutParent, switchStudent } from '../../store/slices/parentAuthSlice';
import { fetchParentAcademicYearsApi, fetchParentNoticesApi } from '../../api/parentChild.api';
import NavbarNotificationDropdown from '../common/NavbarNotificationDropdown';
import Avatar from '../common/Avatar';

const ParentNavbar = ({ onToggleMobileMenu, isMobileMenuOpen }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { parent, activeChild, children } = useSelector((state) => state.parentAuth);

  const [darkMode, setDarkMode] = useState(false);
  const [selectedYear, setSelectedYear] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [switching, setSwitching] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
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
    const loadAcademicYears = async () => {
      try {
        const res = await fetchParentAcademicYearsApi();
        const years = Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
          ? res
          : [];

        if (years.length > 0) {
          const activeYear =
            years.find((y) => Number(y.is_current) === 1 || String(y.is_current) === '1' || y.isCurrent) ||
            years[0];
          if (activeYear) {
            setSelectedYear(activeYear.academic_year || activeYear.name || '');
          }
        }
      } catch (err) {
        console.error('Failed to load academic years for parent navbar:', err);
      }
    };

    loadAcademicYears();
  }, []);

  useEffect(() => {
    const loadNotices = async () => {
      try {
        const res = await fetchParentNoticesApi(activeChild?.id);
        const list = Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res?.data?.notices)
          ? res.data.notices
          : Array.isArray(res?.data)
          ? res.data
          : [];
        setNotifications(list);
      } catch (err) {
        console.error('Failed to load notices for parent navbar:', err);
      }
    };

    loadNotices();
    window.addEventListener('growvidya:new_notice', loadNotices);
    return () => {
      window.removeEventListener('growvidya:new_notice', loadNotices);
    };
  }, [activeChild?.id]);

  const handleLogout = (e) => {
    e.preventDefault();
    dispatch(logoutParent());
    navigate('/parentaccount/parentlogin');
  };

  const handleChildSwitch = async (studentId) => {
    if (activeChild?.id === studentId || switching) return;
    try {
      setSwitching(true);
      await dispatch(switchStudent(studentId)).unwrap();
    } catch (e) {
      console.error('Failed to switch child:', e);
    } finally {
      setSwitching(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const parentName =
    parent?.name ||
    `${parent?.firstName || parent?.first_name || ''} ${parent?.lastName || parent?.last_name || ''}`.trim() ||
    'Parent';

  const activeChildName =
    activeChild?.full_name ||
    `${activeChild?.first_name || ''} ${activeChild?.last_name || ''}`.trim() ||
    'Student';

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
          {/* Left Spacer (Search bar removed) */}
          <div className="me-auto"></div>

          <div className="d-flex align-items-center">
            {/* Current Academic Year Badge */}
            {selectedYear && (
              <div className="me-2 d-none d-sm-flex align-items-center bg-white border rounded px-2 py-1 text-dark fw-medium fs-13 shadow-none">
                <i className="ti ti-calendar-due me-1 text-primary"></i>
                <span>
                  Academic Year : <strong className="text-primary">{selectedYear}</strong>
                </span>
              </div>
            )}

            {/* Active Child Switcher Pill */}
            {children && children.length > 0 && (
              <div className="dropdown me-2">
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm rounded-pill d-flex align-items-center gap-2 px-3 py-1 dropdown-toggle shadow-none bg-white"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                  disabled={switching}
                >
                  <Avatar
                    src={activeChild?.picture}
                    name={activeChildName}
                    size={22}
                    rounded={true}
                    className="rounded-circle"
                  />
                  <span className="fs-13 fw-semibold text-dark text-truncate" style={{ maxWidth: '130px' }}>
                    {activeChildName}
                  </span>
                  {activeChild && (
                    <span
                      className={`badge ${
                        Number(activeChild.student_status ?? activeChild.status) === 1
                          ? 'badge-soft-success'
                          : 'badge-soft-danger'
                      } fs-10 px-1 py-0 d-none d-sm-inline`}
                    >
                      {Number(activeChild.student_status ?? activeChild.status) === 1 ? 'Active' : 'Inactive'}
                    </span>
                  )}
                  {activeChild?.class_name && (
                    <span className="badge bg-primary-subtle text-primary fs-10 px-1 py-0 d-none d-sm-inline">
                      {activeChild.class_name}
                    </span>
                  )}
                  {switching && <span className="spinner-border spinner-border-sm ms-1"></span>}
                </button>
                <ul className="dropdown-menu dropdown-menu-end p-2 shadow-sm border" style={{ minWidth: '240px' }}>
                  <li className="dropdown-header fs-11 text-uppercase text-muted fw-bold pb-1">
                    Select Child Profile
                  </li>
                  {/* Deduplicated unique children list */}
                  {Array.from(new Map(children.map((c) => [c.id, c])).values()).map((child, idx) => {
                    const isSelected = activeChild?.id === child.id;
                    const cName = child.full_name || `${child.first_name || ''} ${child.last_name || ''}`.trim();
                    const isChildActive = Number(child.student_status ?? child.status) === 1;
                    return (
                      <li key={`nav-child-${child.id || idx}-${idx}`}>
                        <button
                          type="button"
                          className={`dropdown-item d-flex align-items-center justify-content-between rounded py-2 px-2 ${
                            isSelected ? 'bg-primary-subtle text-primary fw-bold' : ''
                          }`}
                          onClick={() => handleChildSwitch(child.id)}
                        >
                          <div className="d-flex align-items-center gap-2 overflow-hidden">
                            <Avatar
                              src={child.picture}
                              name={cName}
                              size={28}
                              rounded={true}
                              className="rounded-circle flex-shrink-0"
                            />
                            <div className="text-truncate">
                              <div className="d-flex align-items-center gap-1">
                                <span className="d-block fs-13 text-truncate">{cName}</span>
                                <span
                                  className={`badge ${
                                    isChildActive ? 'badge-soft-success' : 'badge-soft-danger'
                                  } fs-10 px-1 py-0`}
                                >
                                  {isChildActive ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                              <span className="d-block fs-11 text-muted">
                                {child.class_name ? `Class ${child.class_name}` : 'Student'}
                              </span>
                            </div>
                          </div>
                          {isSelected && <i className="ti ti-check text-primary fs-16 ms-2"></i>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Dark / Light Toggle */}
            <div className="pe-1">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setDarkMode(!darkMode);
                }}
                className={`dark-mode-toggle btn btn-outline-light bg-white btn-icon me-1 ${
                  darkMode ? 'activate' : ''
                }`}
                title="Toggle Dark Mode"
              >
                <i className={darkMode ? 'ti ti-brightness-up' : 'ti ti-moon'}></i>
              </a>
            </div>

            {/* Notifications Dropdown (Notices & Messages) */}
            <NavbarNotificationDropdown
              messagesPath="/parent/messages"
              noticesPath="/parent/notices"
              notices={notifications}
            />

            {/* Fullscreen Button */}
            <div className="pe-1">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  toggleFullscreen();
                }}
                className="btn btn-outline-light bg-white btn-icon me-1"
                id="btnFullscreen"
                title="Toggle Fullscreen"
              >
                <i className="ti ti-maximize"></i>
              </a>
            </div>

            {/* Parent Profile Avatar & Dropdown */}
            <div className="dropdown ms-1">
              <a
                href="javascript:void(0);"
                onClick={(e) => e.preventDefault()}
                className="dropdown-toggle d-flex align-items-center text-decoration-none"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <Avatar
                  src={parent?.picture}
                  name={parentName}
                  size={36}
                  rounded={true}
                  className="avatar-md rounded-circle"
                />
              </a>

              <div className="dropdown-menu dropdown-menu-end shadow-sm border p-0" style={{ minWidth: '220px' }}>
                <div className="d-block">
                  <div className="d-flex align-items-center p-2">
                    <Avatar
                      src={parent?.picture}
                      name={parentName}
                      size={40}
                      rounded={true}
                      className="avatar-md me-2 online avatar-rounded"
                    />
                    <div className="overflow-hidden">
                      <h6 className="mb-0 fw-bold text-dark text-truncate">{parentName}</h6>
                      <span className="text-muted fs-11 text-truncate d-block">{parent?.email || 'Parent Account'}</span>
                    </div>
                  </div>

                  <hr className="m-0" />

                  <Link className="dropdown-item d-inline-flex align-items-center p-2 text-dark" to="/parent/profile">
                    <i className="ti ti-user-circle me-2 text-muted"></i>My Profile
                  </Link>

                  <Link className="dropdown-item d-inline-flex align-items-center p-2 text-dark" to="/parent/profile/child">
                    <i className="ti ti-school me-2 text-muted"></i>Child Profile
                  </Link>

                  <hr className="m-0" />

                  <a
                    className="dropdown-item d-inline-flex align-items-center p-2 text-danger"
                    href="#logout"
                    onClick={handleLogout}
                  >
                    <i className="ti ti-login me-2"></i>Logout
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

export default ParentNavbar;
