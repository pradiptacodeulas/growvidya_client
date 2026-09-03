import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { logoutParent, switchStudent } from '../../store/slices/parentAuthSlice';
import { fetchParentAcademicYearsApi } from '../../api/parentChild.api';
import maleUserDefault from '../../assets/male-user.png';
import { resolveImageUrl } from '../../utils/url.util';

const ParentNavbar = ({ onToggleMobileMenu, isMobileMenuOpen }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { parent, activeChild, children } = useSelector((state) => state.parentAuth);

  const [darkMode, setDarkMode] = useState(false);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
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
          setAcademicYears(years);
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
    'Jiten Kulkarni';
  const parentImg = resolveImageUrl(parent?.picture);

  const activeChildName =
    activeChild?.full_name ||
    `${activeChild?.first_name || ''} ${activeChild?.last_name || ''}`.trim() ||
    'Student';
  const activeChildImg = resolveImageUrl(activeChild?.picture);

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
            {/* Academic Year Dropdown */}
            <div className="dropdown me-2">
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="btn btn-outline-light fw-normal bg-white d-flex align-items-center p-2 shadow-none text-dark"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <i className="ti ti-calendar-due me-1 text-primary"></i>
                Academic Year : {selectedYear}
              </a>
              <div className="dropdown-menu dropdown-menu-right shadow-sm">
                {academicYears.length > 0 ? (
                  academicYears.map((yr) => (
                    <a
                      key={yr.id || yr.academic_year}
                      href="javascript:void(0);"
                      className={`dropdown-item d-flex align-items-center ${
                        selectedYear === (yr.academic_year || yr.name) ? 'active' : ''
                      }`}
                      onClick={() => setSelectedYear(yr.academic_year || yr.name)}
                    >
                      Academic Year : {yr.academic_year || yr.name}
                    </a>
                  ))
                ) : (
                  <span className="dropdown-item text-muted disabled">No Academic Years</span>
                )}
              </div>
            </div>

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
                  <img
                    src={activeChildImg || maleUserDefault}
                    alt={activeChildName}
                    className="rounded-circle"
                    style={{ width: '22px', height: '22px', objectFit: 'cover' }}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = maleUserDefault;
                    }}
                  />
                  <span className="fs-13 fw-semibold text-dark text-truncate" style={{ maxWidth: '130px' }}>
                    {activeChildName}
                  </span>
                  {activeChild?.class_name && (
                    <span className="badge bg-primary-subtle text-primary fs-10 px-1 py-0 d-none d-sm-inline">
                      {activeChild.class_name}
                    </span>
                  )}
                  {switching && <span className="spinner-border spinner-border-sm ms-1"></span>}
                </button>
                <ul className="dropdown-menu dropdown-menu-end p-2 shadow-sm border" style={{ minWidth: '220px' }}>
                  <li className="dropdown-header fs-11 text-uppercase text-muted fw-bold pb-1">
                    Select Child Profile
                  </li>
                  {/* Deduplicated unique children list */}
                  {Array.from(new Map(children.map((c) => [c.id, c])).values()).map((child, idx) => {
                    const isSelected = activeChild?.id === child.id;
                    const cImg = resolveImageUrl(child.picture);
                    const cName = child.full_name || `${child.first_name || ''} ${child.last_name || ''}`.trim();
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
                            <img
                              src={cImg || maleUserDefault}
                              alt={cName}
                              className="rounded-circle flex-shrink-0"
                              style={{ width: '28px', height: '28px', objectFit: 'cover' }}
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = maleUserDefault;
                              }}
                            />
                            <div className="text-truncate">
                              <span className="d-block fs-13 text-truncate">{cName}</span>
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

            {/* Notifications Icon & Popup */}
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
                    minWidth: '320px',
                    maxWidth: '360px',
                    display: 'block',
                    zIndex: 1050,
                  }}
                >
                  <div className="d-flex align-items-center justify-content-between border-bottom pb-2 mb-3">
                    <h5 className="notification-title mb-0 fs-15 fw-bold text-dark">Notifications</h5>
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
                    <div className="d-flex flex-column gap-2">
                      <div className="p-2 rounded border-bottom bg-light-300">
                        <div className="d-flex align-items-start gap-2">
                          <span className="avatar avatar-sm bg-primary-transparent text-primary rounded-circle flex-shrink-0 mt-1 d-flex align-items-center justify-content-center">
                            <i className="ti ti-calendar-check fs-14"></i>
                          </span>
                          <div className="overflow-hidden flex-fill">
                            <p className="mb-1 fs-13 text-dark fw-semibold">
                              Monthly attendance and routine report updated.
                            </p>
                            <span className="fs-11 text-muted">Just Now</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-2 rounded border-bottom bg-light-300">
                        <div className="d-flex align-items-start gap-2">
                          <span className="avatar avatar-sm bg-success-transparent text-success rounded-circle flex-shrink-0 mt-1 d-flex align-items-center justify-content-center">
                            <i className="ti ti-certificate fs-14"></i>
                          </span>
                          <div className="overflow-hidden flex-fill">
                            <p className="mb-1 fs-13 text-dark fw-semibold">
                              Upcoming exam results and marksheets available.
                            </p>
                            <span className="fs-11 text-muted">2 hrs ago</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 mt-2 border-top">
                    <Link
                      to="/parent/dashboard"
                      className="btn btn-primary w-100 btn-sm fw-medium"
                      onClick={() => setShowNotifications(false)}
                    >
                      View All
                    </Link>
                  </div>
                </div>
              )}
            </div>

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
                <span className="avatar avatar-md rounded overflow-hidden">
                  <img
                    src={parentImg || maleUserDefault}
                    alt={parentName}
                    className="img-fluid rounded"
                    style={{ width: '38px', height: '38px', objectFit: 'cover' }}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = maleUserDefault;
                    }}
                  />
                </span>
              </a>

              <div className="dropdown-menu dropdown-menu-end shadow-sm border p-0" style={{ minWidth: '220px' }}>
                <div className="d-block">
                  <div className="d-flex align-items-center p-2">
                    <span className="avatar avatar-md me-2 online avatar-rounded overflow-hidden">
                      <img
                        src={parentImg || maleUserDefault}
                        alt={parentName}
                        style={{ width: '38px', height: '38px', objectFit: 'cover' }}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = maleUserDefault;
                        }}
                      />
                    </span>
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
