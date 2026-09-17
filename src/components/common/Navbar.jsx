import { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { logoutAdmin } from '../../store/slices/authSlice';
import { fetchAcademicYearsApi } from '../../api/adminAcademic.api';
import { fetchNoticesApi } from '../../api/adminAnnouncement.api';
import { fetchBranchesApi } from '../../api/branch.api';
import usePermission from '../../hooks/usePermission';
import { useSubscription } from '../../context/SubscriptionContext';
import NoData from './NoData';
import NavbarNotificationDropdown from './NavbarNotificationDropdown';

const Navbar = ({ onToggleMobileMenu, isMobileMenuOpen }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { can, isSuperAdmin } = usePermission();
  const { subscription, isTrial, isExpired, daysLeft, openUpgradeModal } = useSubscription();
  const [darkMode, setDarkMode] = useState(false);
  const [currentYearText, setCurrentYearText] = useState('2026');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [hasUnread, setHasUnread] = useState(true);
  const [branches, setBranches] = useState([]);
  const [activeBranchId, setActiveBranchId] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('active_branch_id') || 'all' : 'all';
  });
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
    if (isExpired) return;
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
  }, [isExpired]);

  useEffect(() => {
    if (isExpired) return;
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
          setCurrentYearText(activeYear.academic_year || activeYear.name || '');
        }
      } catch (err) {
        console.error('Failed to load current academic year for navbar:', err);
      }
    };

    loadCurrentAcademicYear();
  }, [isExpired]);

  useEffect(() => {
    if (isExpired) return;
    const loadBranches = async () => {
      try {
        const res = await fetchBranchesApi({ status: 1 });
        const list = Array.isArray(res?.data) ? res.data : [];
        setBranches(list);
      } catch (err) {
        // quiet fallback
      }
    };
    loadBranches();

    window.addEventListener('branch_list_updated', loadBranches);
    return () => {
      window.removeEventListener('branch_list_updated', loadBranches);
    };
  }, [isExpired]);

  const handleSelectBranch = (branchId) => {
    if (!branchId || branchId === 'all') {
      localStorage.setItem('active_branch_id', 'all');
      setActiveBranchId('all');
      window.dispatchEvent(new CustomEvent('branch_changed', { detail: { branchId: null } }));
    } else {
      localStorage.setItem('active_branch_id', String(branchId));
      setActiveBranchId(String(branchId));
      window.dispatchEvent(new CustomEvent('branch_changed', { detail: { branchId: Number(branchId) } }));
    }
  };

  const activeBranchName =
    !activeBranchId || activeBranchId === 'all'
      ? 'All Branches'
      : branches.find((b) => String(b.id) === String(activeBranchId))?.branch_name || 'Campus';

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
            {/* Free Trial Countdown / Active License Pill */}
            {isTrial && !isExpired && (
              <div className="me-2 d-flex align-items-center bg-warning-subtle border border-warning rounded px-3 py-1 text-dark fw-semibold fs-12 shadow-none">
                <i className="ti ti-bolt text-warning-emphasis me-1 fs-14"></i>
                <span className="d-none d-sm-inline">14-Day Free Trial:&nbsp;</span>
                <strong className="text-danger">{daysLeft}d left</strong>
                <button
                  type="button"
                  onClick={openUpgradeModal}
                  className="btn btn-sm btn-primary py-0 px-2 ms-2 fs-11 rounded-pill"
                >
                  Upgrade
                </button>
              </div>
            )}

            {isExpired && (
              <div className="me-2 d-flex align-items-center bg-danger-subtle border border-danger rounded px-3 py-1 text-danger fw-semibold fs-12 shadow-none">
                <i className="ti ti-alert-triangle me-1 fs-14"></i>
                <span>Expired</span>
                <button
                  type="button"
                  onClick={openUpgradeModal}
                  className="btn btn-sm btn-danger py-0 px-2 ms-2 fs-11 rounded-pill"
                >
                  Unlock
                </button>
              </div>
            )}

            {!isTrial && !isExpired && subscription?.status === 'active' && (
              <Link
                to="/admin/subscription"
                className="me-2 d-flex align-items-center bg-success-subtle border border-success-subtle rounded px-3 py-1 text-success-emphasis text-decoration-none fw-semibold fs-12 shadow-none"
                title="Annual License Active"
              >
                <i className="ti ti-crown text-warning me-1 fs-14"></i>
                <span className="d-none d-sm-inline">{subscription?.plan_name || 'Active License'}</span>
              </Link>
            )}

            {/* Branch Switcher Dropdown */}
            {!isExpired && branches.length > 0 && (
              <div className="dropdown me-2">
                <button
                  className="btn btn-sm btn-white border d-flex align-items-center gap-1 px-3 py-1 text-dark fw-medium fs-13 shadow-none dropdown-toggle"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                  style={{ borderRadius: '6px' }}
                  title="Switch Branch / Campus"
                >
                  <i className="ti ti-building-community text-primary fs-15 me-1"></i>
                  <span className="d-none d-lg-inline text-muted me-1">Branch:</span>
                  <strong className="text-primary text-truncate" style={{ maxWidth: '140px' }}>
                    {activeBranchName}
                  </strong>
                </button>
                <ul className="dropdown-menu dropdown-menu-end shadow-sm border p-1" style={{ minWidth: '220px' }}>
                  <li>
                    <button
                      type="button"
                      className={`dropdown-item rounded py-1.5 fs-12 d-flex align-items-center justify-content-between ${
                        !activeBranchId ? 'active fw-bold' : ''
                      }`}
                      onClick={() => handleSelectBranch(null)}
                    >
                      <span className="d-flex align-items-center gap-2">
                        <i className="ti ti-world fs-14 text-muted"></i>
                        <span>All Branches</span>
                      </span>
                      {!activeBranchId && <i className="ti ti-check text-primary"></i>}
                    </button>
                  </li>
                  <li><hr className="dropdown-divider my-1" /></li>
                  {branches.map((b) => (
                    <li key={b.id}>
                      <button
                        type="button"
                        className={`dropdown-item rounded py-1.5 fs-12 d-flex align-items-center justify-content-between ${
                          String(activeBranchId) === String(b.id) ? 'active fw-bold' : ''
                        }`}
                        onClick={() => handleSelectBranch(b.id)}
                      >
                        <span className="d-flex align-items-center gap-2 text-truncate" style={{ maxWidth: '170px' }}>
                          <i className="ti ti-map-pin fs-14 text-muted flex-shrink-0"></i>
                          <span className="text-truncate">{b.branch_name}</span>
                          {b.is_main_branch === 1 && (
                            <span className="badge bg-light text-primary border fs-10 px-1 py-0">Main</span>
                          )}
                        </span>
                        {String(activeBranchId) === String(b.id) && (
                          <i className="ti ti-check text-primary flex-shrink-0"></i>
                        )}
                      </button>
                    </li>
                  ))}
                  <li><hr className="dropdown-divider my-1" /></li>
                  <li>
                    <Link
                      to="/admin/settings/branches"
                      className="dropdown-item rounded py-1.5 fs-12 text-primary d-flex align-items-center gap-2"
                    >
                      <i className="ti ti-settings fs-14"></i>
                      <span>Manage Campuses</span>
                    </Link>
                  </li>
                </ul>
              </div>
            )}

            {/* Current Academic Year Badge (No Dropdown) */}
            {!isExpired && (
              <div className="me-2 d-none d-sm-flex align-items-center bg-white border rounded px-2 py-1 text-dark fw-medium fs-13 shadow-none">
                <i className="ti ti-calendar-due me-1 text-primary"></i>
                <span>Academic Year : <strong className="text-primary">{currentYearText}</strong></span>
              </div>
            )}

            {/* Add New Quick Button */}
            {!isExpired && (isSuperAdmin || can('ward/students', 'add') || can('staff/teachers', 'add')) && (
              <div className="pe-1">
                <div className="dropdown">
                  <a href="#" className="btn btn-outline-light bg-white btn-icon me-1" data-bs-toggle="dropdown" aria-expanded="false" title="Add New">
                    <i className="ti ti-square-rounded-plus"></i>
                  </a>
                  <div className="dropdown-menu dropdown-menu-right border shadow-sm dropdown-md">
                    <div className="p-3 border-bottom">
                      <h5 className="mb-0 fs-14 fw-bold text-dark">Add New</h5>
                    </div>
                    <div className="p-3 pb-0">
                      <div className="row gx-2">
                        {(isSuperAdmin || can('ward/students', 'add')) && (
                          <div className="col-6">
                            <Link to="/admin/students/add" className="d-block bg-primary-transparent rounded p-2 text-center mb-3 class-hover text-decoration-none">
                              <div className="avatar avatar-lg mb-2">
                                <span className="d-inline-flex align-items-center justify-content-center w-100 h-100 bg-primary rounded-circle text-white">
                                  <i className="ti ti-school"></i>
                                </span>
                              </div>
                              <p className="text-dark fw-semibold mb-0 fs-13">Student</p>
                            </Link>
                          </div>
                        )}
                        {(isSuperAdmin || can('staff/teachers', 'add')) && (
                          <div className="col-6">
                            <Link to="/admin/teachers/add" className="d-block bg-success-transparent rounded p-2 text-center mb-3 class-hover text-decoration-none">
                              <div className="avatar avatar-lg mb-2">
                                <span className="d-inline-flex align-items-center justify-content-center w-100 h-100 bg-success rounded-circle text-white">
                                  <i className="ti ti-users"></i>
                                </span>
                              </div>
                              <p className="text-dark fw-semibold mb-0 fs-13">Teacher</p>
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Dark / Light Toggle */}
            <div className="pe-1 d-none d-md-block">
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

            {/* Notifications Dropdown (Notices & Messages) */}
            {!isExpired && (
              <NavbarNotificationDropdown
                messagesPath="/admin/message"
                noticesPath="/admin/announcement/notice"
                notices={notifications}
              />
            )}

            {/* Fullscreen Toggle */}
            <div className="pe-1 d-none d-lg-block">
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
