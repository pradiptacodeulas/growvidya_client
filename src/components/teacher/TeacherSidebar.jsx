import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logoutTeacher } from '../../store/slices/teacherAuthSlice';
import logoDark from '../../assets/logo_dark.png';
import logoSmall from '../../assets/logo-small.png';
import schoolLogoDefault from '../../assets/school-logo.png';
import { resolveImageUrl } from '../../utils/url.util';
import Avatar from '../common/Avatar';

const TeacherSidebar = ({
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
  const { teacher } = useSelector((state) => state.teacherAuth);

  const schoolLogoSrc = resolveImageUrl(teacher?.schoolLogo || teacher?.school_logo || teacher?.school?.school_logo) || schoolLogoDefault;
  const schoolName = teacher?.schoolName || teacher?.school_name || '';

  // Helper to determine the active submenu key from current URL path
  const getActiveMenuFromPath = (path) => {
    if (path.includes('/teacher/students') || path.includes('/teacher/ward')) return 'ward';
    if (path.includes('/teacher/academics') || path.includes('/teacher/routine')) return 'academic';
    if (path.includes('/teacher/attendance')) return 'attendance';
    if (path.includes('/teacher/examinations')) return 'examination';
    if (path.includes('/teacher/payroll')) return 'payroll';
    if (path.includes('/teacher/leaves')) return 'leaves';
    if (path.includes('/teacher/transport')) return 'transport';
    if (path.includes('/teacher/hostel')) return 'hostel';
    if (path.includes('/teacher/announcements')) return 'announcement';
    return null;
  };

  const [openSubmenu, setOpenSubmenu] = useState(() => {
    const active = getActiveMenuFromPath(location.pathname);
    return active ? { [active]: true } : {};
  });

  useEffect(() => {
    const active = getActiveMenuFromPath(location.pathname);
    if (active) {
      setOpenSubmenu({ [active]: true });
    } else {
      setOpenSubmenu({});
    }
  }, [location.pathname]);

  const toggleSubmenu = (menuKey) => {
    setOpenSubmenu((prev) => {
      const isCurrentlyOpen = Boolean(prev[menuKey]);
      return isCurrentlyOpen ? {} : { [menuKey]: true };
    });
  };

  const handleLogout = (e) => {
    e.preventDefault();
    dispatch(logoutTeacher());
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
        <Link to="/teacher/dashboard" className="d-flex align-items-center text-decoration-none">
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
            onToggleSidebar();
          }}
          className={`d-none d-lg-flex text-dark fs-20 align-items-center justify-content-center ${isCollapsed ? 'active' : ''}`}
          title={isCollapsed ? 'Permanently Expand Sidebar' : 'Collapse Sidebar'}
        >
          <i className="ti ti-menu-deep fs-20 text-dark"></i>
        </a>

        {/* Mobile Close Button */}
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
          {/* 1. Profile / School Header Link */}
          <ul className="mb-3">
            <li>
              <a
                href="javascript:void(0);"
                className="d-flex align-items-center border bg-white rounded p-2 text-decoration-none mb-3"
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

          {/* 2. Main Navigation List */}
          <ul>
            <li>
              <ul>
                {/* Dashboard */}
                <li>
                  <NavLink
                    to="/teacher/dashboard"
                    className={({ isActive }) => (isActive ? 'active' : '')}
                  >
                    <i className="ti ti-dashboard"></i>
                    <span>Dashboard</span>
                  </NavLink>
                </li>

                {/* Ward */}
                <li className={`submenu ${openSubmenu.ward ? 'subdrop' : ''}`}>
                  <a
                    href="javascript:void(0);"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleSubmenu('ward');
                    }}
                    className={openSubmenu.ward ? 'active' : ''}
                  >
                    <i className="ti ti-user-bolt"></i>
                    <span>Ward</span>
                    <span className="menu-arrow"></span>
                  </a>
                  <ul style={{ display: openSubmenu.ward ? 'block' : 'none' }}>
                    <li>
                      <NavLink
                        to="/teacher/students"
                        className={({ isActive }) =>
                          isActive || location.pathname.includes('/teacher/students') ? 'active' : ''
                        }
                      >
                        Students
                      </NavLink>
                    </li>
                  </ul>
                </li>

                {/* Academic */}
                <li className={`submenu ${openSubmenu.academic ? 'subdrop' : ''}`}>
                  <a
                    href="javascript:void(0);"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleSubmenu('academic');
                    }}
                    className={openSubmenu.academic ? 'active' : ''}
                  >
                    <i className="ti ti-school"></i>
                    <span>Academic</span>
                    <span className="menu-arrow"></span>
                  </a>
                  <ul style={{ display: openSubmenu.academic ? 'block' : 'none' }}>
                    <li>
                      <NavLink
                        to="/teacher/academics/routine"
                        className={({ isActive }) =>
                          isActive || location.pathname === '/teacher/routine' ? 'active' : ''
                        }
                      >
                        Routine
                      </NavLink>
                    </li>
                    <li>
                      <NavLink
                        to="/teacher/academics/syllabus"
                        className={({ isActive }) =>
                          isActive || location.pathname.startsWith('/teacher/academics/syllabus') ? 'active' : ''
                        }
                      >
                        Syllabus
                      </NavLink>
                    </li>
                    <li>
                      <NavLink
                        to="/teacher/academics/assignments"
                        className={({ isActive }) => (isActive ? 'active' : '')}
                      >
                        Assignment
                      </NavLink>
                    </li>
                    <li>
                      <NavLink
                        to="/teacher/academics/study-materials"
                        className={({ isActive }) => (isActive ? 'active' : '')}
                      >
                        Study Material
                      </NavLink>
                    </li>
                  </ul>
                </li>

                {/* Attendance */}
                <li className={`submenu ${openSubmenu.attendance ? 'subdrop' : ''}`}>
                  <a
                    href="javascript:void(0);"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleSubmenu('attendance');
                    }}
                    className={openSubmenu.attendance ? 'active' : ''}
                  >
                    <i className="ti ti-clipboard-list"></i>
                    <span>Attendance</span>
                    <span className="menu-arrow"></span>
                  </a>
                  <ul style={{ display: openSubmenu.attendance ? 'block' : 'none' }}>
                    <li>
                      <NavLink
                        to="/teacher/attendance/student"
                        className={({ isActive }) =>
                          isActive || location.pathname.includes('/teacher/attendance') ? 'active' : ''
                        }
                      >
                        Student Attendance
                      </NavLink>
                    </li>
                  </ul>
                </li>

                {/* Examination */}
                <li className={`submenu ${openSubmenu.examination ? 'subdrop' : ''}`}>
                  <a
                    href="javascript:void(0);"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleSubmenu('examination');
                    }}
                    className={openSubmenu.examination ? 'active' : ''}
                  >
                    <i className="ti ti-file-text"></i>
                    <span>Examination</span>
                    <span className="menu-arrow"></span>
                  </a>
                  <ul style={{ display: openSubmenu.examination ? 'block' : 'none' }}>
                    <li>
                      <NavLink
                        to="/teacher/examinations/schedules"
                        className={({ isActive }) => (isActive ? 'active' : '')}
                      >
                        Exam Schedule
                      </NavLink>
                    </li>
                    <li>
                      <NavLink
                        to="/teacher/examinations/attendance"
                        className={({ isActive }) => (isActive ? 'active' : '')}
                      >
                        Exam Attendance
                      </NavLink>
                    </li>
                    <li>
                      <NavLink
                        to="/teacher/examinations/results"
                        className={({ isActive }) => (isActive ? 'active' : '')}
                      >
                        Exam Results
                      </NavLink>
                    </li>
                  </ul>
                </li>

                {/* Payroll */}
                <li className={`submenu ${openSubmenu.payroll ? 'subdrop' : ''}`}>
                  <a
                    href="javascript:void(0);"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleSubmenu('payroll');
                    }}
                    className={openSubmenu.payroll ? 'active' : ''}
                  >
                    <i className="ti ti-school"></i>
                    <span>Payroll</span>
                    <span className="menu-arrow"></span>
                  </a>
                  <ul style={{ display: openSubmenu.payroll ? 'block' : 'none' }}>
                    <li>
                      <NavLink
                        to="/teacher/payroll/salary"
                        className={({ isActive }) => (isActive ? 'active' : '')}
                      >
                        My Salary
                      </NavLink>
                    </li>
                  </ul>
                </li>

                {/* Leaves Application */}
                <li className={`submenu ${openSubmenu.leaves ? 'subdrop' : ''}`}>
                  <a
                    href="javascript:void(0);"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleSubmenu('leaves');
                    }}
                    className={openSubmenu.leaves ? 'active' : ''}
                  >
                    <i className="ti ti-beach"></i>
                    <span>Leaves Application</span>
                    <span className="menu-arrow"></span>
                  </a>
                  <ul style={{ display: openSubmenu.leaves ? 'block' : 'none' }}>
                    <li>
                      <NavLink
                        to="/teacher/leaves/my-leaves"
                        className={({ isActive }) => (isActive ? 'active' : '')}
                      >
                        My Leave
                      </NavLink>
                    </li>
                  </ul>
                </li>

                {/* Transport */}
                <li className={`submenu ${openSubmenu.transport ? 'subdrop' : ''}`}>
                  <a
                    href="javascript:void(0);"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleSubmenu('transport');
                    }}
                    className={openSubmenu.transport ? 'active' : ''}
                  >
                    <i className="ti ti-calendar-repeat"></i>
                    <span>Transport</span>
                    <span className="menu-arrow"></span>
                  </a>
                  <ul style={{ display: openSubmenu.transport ? 'block' : 'none' }}>
                    <li>
                      <NavLink
                        to="/teacher/transport/my-transport"
                        className={({ isActive }) => (isActive ? 'active' : '')}
                      >
                        My Transport
                      </NavLink>
                    </li>
                  </ul>
                </li>

                {/* Hostel */}
                <li className={`submenu ${openSubmenu.hostel ? 'subdrop' : ''}`}>
                  <a
                    href="javascript:void(0);"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleSubmenu('hostel');
                    }}
                    className={openSubmenu.hostel ? 'active' : ''}
                  >
                    <i className="ti ti-calendar-repeat"></i>
                    <span>Hostel</span>
                    <span className="menu-arrow"></span>
                  </a>
                  <ul style={{ display: openSubmenu.hostel ? 'block' : 'none' }}>
                    <li>
                      <NavLink
                        to="/teacher/hostel/my-hostel"
                        className={({ isActive }) => (isActive ? 'active' : '')}
                      >
                        My Hostel
                      </NavLink>
                    </li>
                  </ul>
                </li>

                {/* Message */}
                <li>
                  <NavLink
                    to="/teacher/messages"
                    className={({ isActive }) => (isActive ? 'active' : '')}
                  >
                    <i className="ti ti-message"></i>
                    <span>Message</span>
                  </NavLink>
                </li>

                {/* Announcement */}
                <li className={`submenu ${openSubmenu.announcement ? 'subdrop' : ''}`}>
                  <a
                    href="javascript:void(0);"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleSubmenu('announcement');
                    }}
                    className={openSubmenu.announcement ? 'active' : ''}
                  >
                    <i className="ti ti-calendar-repeat"></i>
                    <span>Announcement</span>
                    <span className="menu-arrow"></span>
                  </a>
                  <ul style={{ display: openSubmenu.announcement ? 'block' : 'none' }}>
                    <li>
                      <NavLink
                        to="/teacher/announcements/notices"
                        className={({ isActive }) => (isActive ? 'active' : '')}
                      >
                        Notice
                      </NavLink>
                    </li>
                    <li>
                      <NavLink
                        to="/teacher/announcements/events"
                        className={({ isActive }) => (isActive ? 'active' : '')}
                      >
                        Event
                      </NavLink>
                    </li>
                    <li>
                      <NavLink
                        to="/teacher/announcements/holidays"
                        className={({ isActive }) => (isActive ? 'active' : '')}
                      >
                        Holiday
                      </NavLink>
                    </li>
                  </ul>
                </li>

                {/* Logout */}
                <li>
                  <a
                    href="#logout"
                    onClick={handleLogout}
                    className="text-danger fw-semibold"
                  >
                    <i className="ti ti-logout text-danger"></i>
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

export default TeacherSidebar;
