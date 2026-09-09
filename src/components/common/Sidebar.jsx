import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logoutAdmin } from '../../store/slices/authSlice';
import logoDark from '../../assets/logo_dark.png';
import logoSmall from '../../assets/logo-small.png';
import schoolLogoDefault from '../../assets/school-logo.png';
import { resolveImageUrl } from '../../utils/url.util';
import Avatar from './Avatar';
import usePermission from '../../hooks/usePermission';

const WARD_MODULES = ['ward/students', 'ward/parents'];
const STAFF_MODULES = ['staff/teachers', 'staff/users'];
const ACADEMIC_MODULES = [
  'academic/shift',
  'academic/classes',
  'academic/days',
  'academic/sections',
  'academic/period',
  'academic/house',
  'academic/year',
  'academic/documentType',
  'academic/subject',
  'academic/routine',
  'academic/syllabus',
  'academic/assignmenttype',
  'academic/assignment',
  'academic/material',
];
const ATTENDANCE_MODULES = ['attendance/student', 'attendance/teacher', 'attendance/staff'];
const LEAVES_MODULES = ['leaves/leaveassign', 'leaves/leaveapply'];
const EXAMINATION_MODULES = [
  'examination/gradeSettings',
  'examination/exam',
  'examination/examtype',
  'examination/examsubject',
  'examination/examschedule',
  'examination/examAttendance',
  'examination/examResult',
];
const PAYROLL_MODULES = ['settings/salarydatesettings'];
const TRANSPORT_MODULES = ['transport/bus', 'transport/driver', 'transport/helper', 'transport/route'];
const HOSTEL_MODULES = ['hostel/hostelList', 'hostel/hostelRooms'];
const ANNOUNCEMENT_MODULES = ['announcement/notice', 'announcement/event', 'announcement/holiday'];
const FEES_MODULES = [
  'feesmanagement/payments',
  'feesmanagement/structures',
  'feesmanagement/components',
  'feesmanagement/allocations',
  'feesmanagement/invoices',
];
const RECORDS_MODULES = ['records/admitcard', 'records/idcard', 'records/marksheet'];
const CERTIFICATE_MODULES = [
  'certificate/category',
  'certificate/template',
  'certificate/certificatecreate',
];
const REPORT_MODULES = [
  'report/classReport',
  'report/studentReport',
  'report/attendanceReport',
  'report/calendarReport',
];
const SETTINGS_MODULES = [
  'settings/miscManagement',
  'settings/general',
  'settings/salarydatesettings',
];

const Sidebar = ({
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
  const { user } = useSelector((state) => state.auth);
  const { can, hasAny, isSuperAdmin } = usePermission();

  const schoolLogoSrc = resolveImageUrl(user?.schoolLogo || user?.school_logo) || schoolLogoDefault;
  const schoolName = user?.schoolName || user?.school_name || '';

  // Helper to determine the single active menu from current URL path
  const getActiveMenuFromPath = (path) => {
    if (path.includes('/admin/students') || path.includes('/admin/parents')) return 'ward';
    if (
      path.includes('/admin/teachers') ||
      path.includes('/admin/staff') ||
      path.includes('/admin/users')
    )
      return 'staff';
    if (path.includes('/admin/academics') || path.includes('/admin/academic')) return 'academic';
    if (path.includes('/admin/attendance')) return 'attendance';
    if (path.includes('/admin/leaves')) return 'leaves';
    if (path.includes('/admin/examinations') || path.includes('/admin/examination')) return 'examination';
    if (path.includes('/admin/payroll')) return 'payroll';
    if (path.includes('/admin/transport')) return 'transport';
    if (path.includes('/admin/hostel') || path.includes('/hostel')) return 'hostel';
    if (path.includes('/admin/announcement') || path.includes('/announcement')) return 'announcement';
    if (path.includes('/admin/fees') || path.includes('feesmanagement')) return 'fees';
    if (path.includes('/admin/certificates') || path.includes('/admin/manage-certificate')) return 'manageCertificate';
    if (path.includes('/admin/records') || path.includes('/records/')) return 'records';
    if (path.includes('/admin/reports')) return 'report';
    if (path.includes('/admin/settings') || path.includes('/settings')) return 'settings';
    return null;
  };

  // Submenu open states (only one key can be true at any time)
  const [openSubmenu, setOpenSubmenu] = useState(() => {
    const active = getActiveMenuFromPath(location.pathname);
    return active ? { [active]: true } : {};
  });

  // On route change, only keep the menu matching the current route expanded
  useEffect(() => {
    const active = getActiveMenuFromPath(location.pathname);
    if (active) {
      setOpenSubmenu({ [active]: true });
    } else {
      setOpenSubmenu({});
    }
  }, [location.pathname]);

  // Accordion toggle: opening one menu closes all others
  const toggleSubmenu = (menuKey) => {
    setOpenSubmenu((prev) => {
      const isCurrentlyOpen = Boolean(prev[menuKey]);
      return isCurrentlyOpen ? {} : { [menuKey]: true };
    });
  };

  const handleLogout = (e) => {
    e.preventDefault();
    dispatch(logoutAdmin());
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
        <Link to="/admin/dashboard" className="d-flex align-items-center text-decoration-none">
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
                {/* Dashboard */}
                <li>
                  <NavLink to="/admin/dashboard" className={({ isActive }) => (isActive ? 'active' : '')}>
                    <i className="ti ti-layout-dashboard"></i>
                    <span>Dashboard</span>
                  </NavLink>
                </li>

                {/* Ward */}
                {hasAny(WARD_MODULES, 'view') && (
                  <li className={`submenu ${openSubmenu.ward ? 'active' : ''}`}>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleSubmenu('ward');
                      }}
                      className={openSubmenu.ward ? 'subdrop active' : ''}
                    >
                      <i className="ti ti-school"></i>
                      <span>Ward</span>
                      <span className="menu-arrow"></span>
                    </a>
                    <ul className={`sidebar-submenu-list ${openSubmenu.ward ? 'submenu-open' : ''}`}>
                      {can('ward/students', 'view') && (
                        <li>
                          <NavLink to="/admin/students" className={({ isActive }) => (isActive ? 'active' : '')}>
                            <span>Students</span>
                          </NavLink>
                        </li>
                      )}
                      {can('ward/parents', 'view') && (
                        <li>
                          <NavLink to="/admin/parents" className={({ isActive }) => (isActive ? 'active' : '')}>
                            <span>Parents</span>
                          </NavLink>
                        </li>
                      )}
                    </ul>
                  </li>
                )}

                {/* Staff */}
                {hasAny(STAFF_MODULES, 'view') && (
                  <li className={`submenu ${openSubmenu.staff ? 'active' : ''}`}>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleSubmenu('staff');
                      }}
                      className={openSubmenu.staff ? 'subdrop active' : ''}
                    >
                      <i className="ti ti-users"></i>
                      <span>Staff</span>
                      <span className="menu-arrow"></span>
                    </a>
                    <ul className={`sidebar-submenu-list ${openSubmenu.staff ? 'submenu-open' : ''}`}>
                      {can('staff/teachers', 'view') && (
                        <li>
                          <NavLink to="/admin/teachers" className={({ isActive }) => (isActive ? 'active' : '')}>
                            <span>Teachers</span>
                          </NavLink>
                        </li>
                      )}
                      {can('staff/users', 'view') && (
                        <li>
                          <NavLink
                            to="/admin/users"
                            className={({ isActive }) =>
                              isActive || location.pathname === '/admin/staff' ? 'active' : ''
                            }
                          >
                            <span>Users</span>
                          </NavLink>
                        </li>
                      )}
                    </ul>
                  </li>
                )}

                {/* Academic */}
                {hasAny(ACADEMIC_MODULES, 'view') && (
                  <li className={`submenu ${openSubmenu.academic ? 'active' : ''}`}>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleSubmenu('academic');
                      }}
                      className={openSubmenu.academic ? 'subdrop active' : ''}
                    >
                      <i className="ti ti-notebook"></i>
                      <span>Academic</span>
                      <span className="menu-arrow"></span>
                    </a>
                    <ul className={`sidebar-submenu-list ${openSubmenu.academic ? 'submenu-open' : ''}`}>
                      {can('academic/shift', 'view') && (
                        <li><NavLink to="/admin/academics/shifts" className={({ isActive }) => (isActive || location.pathname.startsWith('/admin/academics/shifts') || location.pathname.startsWith('/admin/academic/shifts') || location.pathname.startsWith('/admin/academic/shift') ? 'active' : '')}><span>Shift</span></NavLink></li>
                      )}
                      {can('academic/classes', 'view') && (
                        <li><NavLink to="/admin/academics/classes" className={({ isActive }) => (isActive || location.pathname.startsWith('/admin/academics/classes') || location.pathname.startsWith('/admin/academic/classes') || location.pathname.startsWith('/admin/academic/class') ? 'active' : '')}><span>Class</span></NavLink></li>
                      )}
                      {can('academic/days', 'view') && (
                        <li><NavLink to="/admin/academics/days" className={({ isActive }) => (isActive || location.pathname.startsWith('/admin/academics/days') || location.pathname.startsWith('/admin/academic/days') || location.pathname.startsWith('/admin/academic/day') ? 'active' : '')}><span>Days</span></NavLink></li>
                      )}
                      {can('academic/sections', 'view') && (
                        <li><NavLink to="/admin/academics/sections" className={({ isActive }) => (isActive || location.pathname.startsWith('/admin/academics/sections') || location.pathname.startsWith('/admin/academic/sections') || location.pathname.startsWith('/admin/academic/section') ? 'active' : '')}><span>Section</span></NavLink></li>
                      )}
                      {can('academic/period', 'view') && (
                        <li><NavLink to="/admin/academics/periods" className={({ isActive }) => (isActive || location.pathname.startsWith('/admin/academics/periods') || location.pathname.startsWith('/admin/academic/periods') || location.pathname.startsWith('/admin/academic/period') ? 'active' : '')}><span>Period</span></NavLink></li>
                      )}
                      {can('academic/house', 'view') && (
                        <li><NavLink to="/admin/academics/houses" className={({ isActive }) => (isActive || location.pathname.startsWith('/admin/academics/houses') || location.pathname.startsWith('/admin/academic/houses') || location.pathname.startsWith('/admin/academic/house') ? 'active' : '')}><span>House</span></NavLink></li>
                      )}
                      {can('academic/year', 'view') && (
                        <li><NavLink to="/admin/academics/years" className={({ isActive }) => (isActive || location.pathname.startsWith('/admin/academics/years') || location.pathname.startsWith('/admin/academic/years') || location.pathname.startsWith('/admin/academic/year') ? 'active' : '')}><span>Academic Year</span></NavLink></li>
                      )}
                      {can('academic/documentType', 'view') && (
                        <li><NavLink to="/admin/academics/document-types" className={({ isActive }) => (isActive || location.pathname.startsWith('/admin/academics/document-types') ? 'active' : '')}><span>Document Type</span></NavLink></li>
                      )}
                      {can('academic/subject', 'view') && (
                        <li><NavLink to="/admin/academics/subjects" className={({ isActive }) => (isActive || location.pathname.startsWith('/admin/academics/subjects') || location.pathname.startsWith('/admin/academic/subjects') || location.pathname.startsWith('/admin/academic/subject') ? 'active' : '')}><span>Subject</span></NavLink></li>
                      )}
                      {can('academic/routine', 'view') && (
                        <li><NavLink to="/admin/academics/routine" className={({ isActive }) => (isActive || location.pathname.startsWith('/admin/academics/routine') || location.pathname.startsWith('/admin/academics/routines') ? 'active' : '')}><span>Routine</span></NavLink></li>
                      )}
                      {can('academic/syllabus', 'view') && (
                        <li><NavLink to="/admin/academics/syllabus" className={({ isActive }) => (isActive || location.pathname.startsWith('/admin/academics/syllabus') ? 'active' : '')}><span>Syllabus</span></NavLink></li>
                      )}
                      {can('academic/assignmenttype', 'view') && (
                        <li><NavLink to="/admin/academics/assignment-types" className={({ isActive }) => (isActive || location.pathname.startsWith('/admin/academics/assignment-types') ? 'active' : '')}><span>Assignment Type</span></NavLink></li>
                      )}
                      {can('academic/assignment', 'view') && (
                        <li><NavLink to="/admin/academics/assignments" className={({ isActive }) => (isActive || location.pathname.startsWith('/admin/academics/assignments') ? 'active' : '')}><span>Assignment</span></NavLink></li>
                      )}
                      {can('academic/material', 'view') && (
                        <li><NavLink to="/admin/academics/study-material" className={({ isActive }) => (isActive || location.pathname.startsWith('/admin/academics/study-material') || location.pathname.startsWith('/admin/academics/study-materials') ? 'active' : '')}><span>Study Material</span></NavLink></li>
                      )}
                    </ul>
                  </li>
                )}

                {/* Attendance */}
                {hasAny(ATTENDANCE_MODULES, 'view') && (
                  <li className={`submenu ${openSubmenu.attendance ? 'active' : ''}`}>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleSubmenu('attendance');
                      }}
                      className={openSubmenu.attendance ? 'subdrop active' : ''}
                    >
                      <i className="ti ti-calendar-user"></i>
                      <span>Attendance</span>
                      <span className="menu-arrow"></span>
                    </a>
                    <ul className={`sidebar-submenu-list ${openSubmenu.attendance ? 'submenu-open' : ''}`}>
                      {can('attendance/student', 'view') && (
                        <li><NavLink to="/admin/attendance/student" className={({ isActive }) => (isActive ? 'active' : '')}><span>Student Attendance</span></NavLink></li>
                      )}
                      {can('attendance/teacher', 'view') && (
                        <li><NavLink to="/admin/attendance/teacher" className={({ isActive }) => (isActive ? 'active' : '')}><span>Teacher Attendance</span></NavLink></li>
                      )}
                      {can('attendance/staff', 'view') && (
                        <li><NavLink to="/admin/attendance/staff" className={({ isActive }) => (isActive ? 'active' : '')}><span>Staff Attendance</span></NavLink></li>
                      )}
                    </ul>
                  </li>
                )}

                {/* Leaves Application */}
                {hasAny(LEAVES_MODULES, 'view') && (
                  <li className={`submenu ${openSubmenu.leaves ? 'active' : ''}`}>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleSubmenu('leaves');
                      }}
                      className={openSubmenu.leaves ? 'subdrop active' : ''}
                    >
                      <i className="ti ti-beach"></i>
                      <span>Leaves Application</span>
                      <span className="menu-arrow"></span>
                    </a>
                    <ul className={`sidebar-submenu-list ${openSubmenu.leaves ? 'submenu-open' : ''}`}>
                      {can('leaves/leaveassign', 'view') && (
                        <li>
                          <NavLink
                            to="/admin/leaves/assign"
                            className={({ isActive }) =>
                              isActive || location.pathname.startsWith('/admin/leaves/assign') ? 'active' : ''
                            }
                          >
                            <span>Leave Assign</span>
                          </NavLink>
                        </li>
                      )}
                      {can('leaves/leaveapply', 'view') && (
                        <li>
                          <NavLink
                            to="/admin/leaves"
                            end
                            className={({ isActive }) =>
                              (isActive || (location.pathname.startsWith('/admin/leaves') && !location.pathname.startsWith('/admin/leaves/assign')))
                                ? 'active'
                                : ''
                            }
                          >
                            <span>Leave apply</span>
                          </NavLink>
                        </li>
                      )}
                    </ul>
                  </li>
                )}

                {/* Examination */}
                {hasAny(EXAMINATION_MODULES, 'view') && (
                  <li className={`submenu ${openSubmenu.examination ? 'active' : ''}`}>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleSubmenu('examination');
                      }}
                      className={openSubmenu.examination ? 'subdrop active' : ''}
                    >
                      <i className="ti ti-file-text"></i>
                      <span>Examination</span>
                      <span className="menu-arrow"></span>
                    </a>
                    <ul className={`sidebar-submenu-list ${openSubmenu.examination ? 'submenu-open' : ''}`}>
                      {can('examination/gradeSettings', 'view') && (
                        <li>
                          <NavLink
                            to="/admin/examinations/grades"
                            className={({ isActive }) => (isActive || location.pathname.includes('gradeSettings') ? 'active' : '')}
                          >
                            <span>Grade</span>
                          </NavLink>
                        </li>
                      )}
                      {can('examination/exam', 'view') && (
                        <li>
                          <NavLink
                            to="/admin/examinations/exams"
                            className={({ isActive }) => (isActive || (location.pathname.startsWith('/admin/examinations/exams') || location.pathname === '/admin/examination/exam') ? 'active' : '')}
                          >
                            <span>Exam</span>
                          </NavLink>
                        </li>
                      )}
                      {can('examination/examtype', 'view') && (
                        <li>
                          <NavLink
                            to="/admin/examinations/exam-types"
                            className={({ isActive }) => (isActive || location.pathname.includes('examtype') ? 'active' : '')}
                          >
                            <span>Exam Type</span>
                          </NavLink>
                        </li>
                      )}
                      {can('examination/examsubject', 'view') && (
                        <li>
                          <NavLink
                            to="/admin/examinations/exam-subjects"
                            className={({ isActive }) => (isActive || location.pathname.includes('examsubject') ? 'active' : '')}
                          >
                            <span>Exam Subject</span>
                          </NavLink>
                        </li>
                      )}
                      {can('examination/examschedule', 'view') && (
                        <li>
                          <NavLink
                            to="/admin/examinations/schedules"
                            className={({ isActive }) => (isActive || location.pathname.includes('examschedule') ? 'active' : '')}
                          >
                            <span>Exam Schedule</span>
                          </NavLink>
                        </li>
                      )}
                      {can('examination/examAttendance', 'view') && (
                        <li>
                          <NavLink
                            to="/admin/examinations/attendance"
                            className={({ isActive }) => (isActive || location.pathname.includes('examAttendance') ? 'active' : '')}
                          >
                            <span>Exam Attendance</span>
                          </NavLink>
                        </li>
                      )}
                      {can('examination/examResult', 'view') && (
                        <li>
                          <NavLink
                            to="/admin/examinations/results"
                            className={({ isActive }) => (isActive || location.pathname.includes('examResult') ? 'active' : '')}
                          >
                            <span>Exam Result</span>
                          </NavLink>
                        </li>
                      )}
                    </ul>
                  </li>
                )}

                {/* Media */}
                <li>
                  <NavLink
                    to="/admin/media"
                    className={({ isActive }) =>
                      isActive || location.pathname.startsWith('/admin/media')
                        ? 'active'
                        : ''
                    }
                  >
                    <i className="ti ti-photo"></i>
                    <span>Media</span>
                  </NavLink>
                </li>

                {/* Message */}
                <li>
                  <NavLink
                    to="/admin/message"
                    className={({ isActive }) =>
                      isActive || location.pathname.startsWith('/admin/message') || location.pathname.startsWith('/admin/messages')
                        ? 'active'
                        : ''
                    }
                  >
                    <i className="ti ti-message-dots"></i>
                    <span>Message</span>
                  </NavLink>
                </li>

                {/* Payroll */}
                {(isSuperAdmin || hasAny(PAYROLL_MODULES, 'view')) && (
                  <li className={`submenu ${openSubmenu.payroll ? 'active' : ''}`}>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleSubmenu('payroll');
                      }}
                      className={openSubmenu.payroll ? 'subdrop active' : ''}
                    >
                      <i className="ti ti-coins"></i>
                      <span>Payroll</span>
                      <span className="menu-arrow"></span>
                    </a>
                    <ul className={`sidebar-submenu-list ${openSubmenu.payroll ? 'submenu-open' : ''}`}>
                      <li>
                        <NavLink
                          to="/admin/payroll/beneficiaries"
                          className={({ isActive }) =>
                            isActive || location.pathname.startsWith('/admin/payroll/beneficiar')
                              ? 'active'
                              : ''
                          }
                        >
                          <span>Beneficiary Management</span>
                        </NavLink>
                      </li>
                      <li>
                        <NavLink
                          to="/admin/payroll/salary"
                          className={({ isActive }) =>
                            isActive || location.pathname.startsWith('/admin/payroll/salar')
                              ? 'active'
                              : ''
                          }
                        >
                          <span>Salary</span>
                        </NavLink>
                      </li>
                    </ul>
                  </li>
                )}

                {/* Transport */}
                {hasAny(TRANSPORT_MODULES, 'view') && (
                  <li className={`submenu ${openSubmenu.transport ? 'active' : ''}`}>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleSubmenu('transport');
                      }}
                      className={openSubmenu.transport ? 'subdrop active' : ''}
                    >
                      <i className="ti ti-bus"></i>
                      <span>Transport</span>
                      <span className="menu-arrow"></span>
                    </a>
                    <ul className={`sidebar-submenu-list ${openSubmenu.transport ? 'submenu-open' : ''}`}>
                      {can('transport/bus', 'view') && (
                        <li>
                          <NavLink
                            to="/admin/transport/bus"
                            className={({ isActive }) =>
                              isActive ||
                              location.pathname.startsWith('/admin/transport/bus') ||
                              location.pathname.startsWith('/admin/transport/vehicles')
                                ? 'active'
                                : ''
                            }
                          >
                            <span>Bus</span>
                          </NavLink>
                        </li>
                      )}
                      {can('transport/driver', 'view') && (
                        <li>
                          <NavLink
                            to="/admin/transport/driver"
                            className={({ isActive }) =>
                              isActive ||
                              location.pathname.startsWith('/admin/transport/driver')
                                ? 'active'
                                : ''
                            }
                          >
                            <span>Driver</span>
                          </NavLink>
                        </li>
                      )}
                      {can('transport/helper', 'view') && (
                        <li>
                          <NavLink
                            to="/admin/transport/helper"
                            className={({ isActive }) =>
                              isActive ||
                              location.pathname.startsWith('/admin/transport/helper')
                                ? 'active'
                                : ''
                            }
                          >
                            <span>Helper</span>
                          </NavLink>
                        </li>
                      )}
                      {can('transport/route', 'view') && (
                        <li>
                          <NavLink
                            to="/admin/transport/route"
                            className={({ isActive }) =>
                              isActive ||
                              location.pathname.startsWith('/admin/transport/route')
                                ? 'active'
                                : ''
                            }
                          >
                            <span>Route</span>
                          </NavLink>
                        </li>
                      )}
                    </ul>
                  </li>
                )}

                {/* Hostel */}
                {hasAny(HOSTEL_MODULES, 'view') && (
                  <li className={`submenu ${openSubmenu.hostel ? 'active' : ''}`}>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleSubmenu('hostel');
                      }}
                      className={openSubmenu.hostel ? 'subdrop active' : ''}
                    >
                      <i className="ti ti-building-community"></i>
                      <span>Hostel</span>
                      <span className="menu-arrow"></span>
                    </a>
                    <ul className={`sidebar-submenu-list ${openSubmenu.hostel ? 'submenu-open' : ''}`}>
                      {can('hostel/hostelList', 'view') && (
                        <li>
                          <NavLink
                            to="/admin/hostel/list"
                            className={({ isActive }) =>
                              isActive ||
                              location.pathname.startsWith('/admin/hostel/list') ||
                              location.pathname.startsWith('/admin/hostel/add') ||
                              location.pathname.startsWith('/admin/hostel/edit')
                                ? 'active'
                                : ''
                            }
                          >
                            <span>Hostel List</span>
                          </NavLink>
                        </li>
                      )}
                      {can('hostel/hostelRooms', 'view') && (
                        <li>
                          <NavLink
                            to="/admin/hostel/rooms"
                            className={({ isActive }) =>
                              isActive ||
                              location.pathname.startsWith('/admin/hostel/rooms')
                                ? 'active'
                                : ''
                            }
                          >
                            <span>Hostel Rooms</span>
                          </NavLink>
                        </li>
                      )}
                    </ul>
                  </li>
                )}

                {/* Announcement */}
                {hasAny(ANNOUNCEMENT_MODULES, 'view') && (
                  <li className={`submenu ${openSubmenu.announcement ? 'active' : ''}`}>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleSubmenu('announcement');
                      }}
                      className={openSubmenu.announcement ? 'subdrop active' : ''}
                    >
                      <i className="ti ti-speakerphone"></i>
                      <span>Announcement</span>
                      <span className="menu-arrow"></span>
                    </a>
                    <ul className={`sidebar-submenu-list ${openSubmenu.announcement ? 'submenu-open' : ''}`}>
                      {can('announcement/notice', 'view') && (
                        <li>
                          <NavLink
                            to="/admin/announcement/notice"
                            className={({ isActive }) =>
                              isActive || location.pathname.startsWith('/admin/announcement/notice')
                                ? 'active'
                                : ''
                            }
                          >
                            <span>Notice</span>
                          </NavLink>
                        </li>
                      )}
                      {can('announcement/event', 'view') && (
                        <li>
                          <NavLink
                            to="/admin/announcement/event"
                            className={({ isActive }) =>
                              isActive || location.pathname.startsWith('/admin/announcement/event')
                                ? 'active'
                                : ''
                            }
                          >
                            <span>Event</span>
                          </NavLink>
                        </li>
                      )}
                      {can('announcement/holiday', 'view') && (
                        <li>
                          <NavLink
                            to="/admin/announcement/holiday"
                            className={({ isActive }) =>
                              isActive || location.pathname.startsWith('/admin/announcement/holiday')
                                ? 'active'
                                : ''
                            }
                          >
                            <span>Holiday</span>
                          </NavLink>
                        </li>
                      )}
                    </ul>
                  </li>
                )}

                {/* Fees Management */}
                {hasAny(FEES_MODULES, 'view') && (
                  <li className={`submenu ${openSubmenu.fees ? 'active' : ''}`}>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleSubmenu('fees');
                      }}
                      className={openSubmenu.fees ? 'subdrop active' : ''}
                    >
                      <i className="ti ti-receipt-2"></i>
                      <span>Fees Management</span>
                      <span className="menu-arrow"></span>
                    </a>
                    <ul className={`sidebar-submenu-list ${openSubmenu.fees ? 'submenu-open' : ''}`}>
                      {can('feesmanagement/payments', 'view') && (
                        <li>
                          <NavLink
                            to="/admin/fees/dashboard"
                            className={({ isActive }) =>
                              isActive || location.pathname === '/admin/fees/collect' || location.pathname === '/admin/fees' ? 'active' : ''
                            }
                          >
                            <span>Fees Collection</span>
                          </NavLink>
                        </li>
                      )}
                      {can('feesmanagement/structures', 'view') && (
                        <li>
                          <NavLink
                            to="/admin/fees/structures"
                            className={({ isActive }) => (isActive || location.pathname.includes('/fees/structures') ? 'active' : '')}
                          >
                            <span>Fee Groups & Structures</span>
                          </NavLink>
                        </li>
                      )}
                      {can('feesmanagement/components', 'view') && (
                        <li>
                          <NavLink
                            to="/admin/fees/components"
                            className={({ isActive }) => (isActive ? 'active' : '')}
                          >
                            <span>Fee Headings</span>
                          </NavLink>
                        </li>
                      )}
                      {can('feesmanagement/allocations', 'view') && (
                        <li>
                          <NavLink
                            to="/admin/fees/allocations"
                            className={({ isActive }) => (isActive ? 'active' : '')}
                          >
                            <span>Fee Allocation/Assign</span>
                          </NavLink>
                        </li>
                      )}
                      {can('feesmanagement/invoices', 'view') && (
                        <li>
                          <NavLink
                            to="/admin/fees/invoices"
                            className={({ isActive }) => (isActive ? 'active' : '')}
                          >
                            <span>Invoices & Demand</span>
                          </NavLink>
                        </li>
                      )}
                      {can('feesmanagement/payments', 'view') && (
                        <li>
                          <NavLink
                            to="/admin/fees/payments"
                            className={({ isActive }) =>
                              isActive ||
                              location.pathname.startsWith('/admin/fees/payments') ||
                              location.pathname.startsWith('/admin/fees/receipts')
                                ? 'active'
                                : ''
                            }
                          >
                            <span>Payment History &amp; Receipts</span>
                          </NavLink>
                        </li>
                      )}
                    </ul>
                  </li>
                )}

                {/* Records & Documents */}
                {hasAny(RECORDS_MODULES, 'view') && (
                  <li className={`submenu ${openSubmenu.records ? 'active' : ''}`}>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleSubmenu('records');
                      }}
                      className={openSubmenu.records ? 'subdrop active' : ''}
                    >
                      <i className="ti ti-id-badge-2"></i>
                      <span>Records &amp; Documents</span>
                      <span className="menu-arrow"></span>
                    </a>
                    <ul className={`sidebar-submenu-list ${openSubmenu.records ? 'submenu-open' : ''}`}>
                      {can('records/admitcard', 'view') && (
                        <li>
                          <NavLink
                            to="/admin/records/admit-card"
                            className={({ isActive }) =>
                              isActive ||
                              location.pathname.startsWith('/admin/records/admit-card') ||
                              location.pathname.startsWith('/admin/records/admitcard')
                                ? 'active'
                                : ''
                            }
                          >
                            <span>Admit Card</span>
                          </NavLink>
                        </li>
                      )}
                      {can('records/idcard', 'view') && (
                        <li>
                          <NavLink
                            to="/admin/records/id-card"
                            className={({ isActive }) =>
                              isActive ||
                              location.pathname.startsWith('/admin/records/id-card') ||
                              location.pathname.startsWith('/admin/records/idcard')
                                ? 'active'
                                : ''
                            }
                          >
                            <span>ID Card</span>
                          </NavLink>
                        </li>
                      )}
                      {can('records/marksheet', 'view') && (
                        <li>
                          <NavLink
                            to="/admin/records/marksheet"
                            className={({ isActive }) =>
                              isActive ||
                              location.pathname.startsWith('/admin/records/marksheet') ||
                              location.pathname.startsWith('/admin/records/mark-sheet')
                                ? 'active'
                                : ''
                            }
                          >
                            <span>Mark Sheet</span>
                          </NavLink>
                        </li>
                      )}
                    </ul>
                  </li>
                )}

                {/* Manage Certificate */}
                {hasAny(CERTIFICATE_MODULES, 'view') && (
                  <li className={`submenu ${openSubmenu.manageCertificate ? 'active' : ''}`}>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleSubmenu('manageCertificate');
                      }}
                      className={openSubmenu.manageCertificate ? 'subdrop active' : ''}
                    >
                      <i className="ti ti-certificate"></i>
                      <span>Manage Certificate</span>
                      <span className="menu-arrow"></span>
                    </a>
                    <ul className={`sidebar-submenu-list ${openSubmenu.manageCertificate ? 'submenu-open' : ''}`}>
                      {can('certificate/category', 'view') && (
                        <li>
                          <NavLink
                            to="/admin/certificates/category"
                            className={({ isActive }) =>
                              isActive || location.pathname.startsWith('/admin/certificates/categor')
                                ? 'active'
                                : ''
                            }
                          >
                            <span>Certificate Category</span>
                          </NavLink>
                        </li>
                      )}
                      {can('certificate/template', 'view') && (
                        <li>
                          <NavLink
                            to="/admin/certificates/border"
                            className={({ isActive }) =>
                              isActive ||
                              location.pathname.startsWith('/admin/certificates/border')
                                ? 'active'
                                : ''
                            }
                          >
                            <span>Certificate Border</span>
                          </NavLink>
                        </li>
                      )}
                      {can('certificate/template', 'view') && (
                        <li>
                          <NavLink
                            to="/admin/certificates/template"
                            className={({ isActive }) =>
                              isActive || location.pathname.startsWith('/admin/certificates/template')
                                ? 'active'
                                : ''
                            }
                          >
                            <span>Certificate Template</span>
                          </NavLink>
                        </li>
                      )}
                      {can('certificate/certificatecreate', 'view') && (
                        <li>
                          <NavLink
                            to="/admin/certificates/create"
                            className={({ isActive }) =>
                              isActive || location.pathname.startsWith('/admin/certificates/create')
                                ? 'active'
                                : ''
                            }
                          >
                            <span>Certificate Create</span>
                          </NavLink>
                        </li>
                      )}
                    </ul>
                  </li>
                )}

                {/* Reports */}
                {hasAny(REPORT_MODULES, 'view') && (
                  <li className={`submenu ${openSubmenu.report ? 'active' : ''}`}>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleSubmenu('report');
                      }}
                      className={openSubmenu.report ? 'subdrop active' : ''}
                    >
                      <i className="ti ti-chart-bar"></i>
                      <span>Reports</span>
                      <span className="menu-arrow"></span>
                    </a>
                    <ul className={`sidebar-submenu-list ${openSubmenu.report ? 'submenu-open' : ''}`}>
                      {can('report/classReport', 'view') && (
                        <li>
                          <NavLink
                            to="/admin/reports/class-report"
                            className={({ isActive }) =>
                              isActive || location.pathname.startsWith('/admin/reports/class')
                                ? 'active'
                                : ''
                            }
                          >
                            <span>Class Report</span>
                          </NavLink>
                        </li>
                      )}
                      {can('report/studentReport', 'view') && (
                        <li>
                          <NavLink
                            to="/admin/reports/student-report"
                            className={({ isActive }) =>
                              isActive || location.pathname.startsWith('/admin/reports/student')
                                ? 'active'
                                : ''
                            }
                          >
                            <span>Student Report</span>
                          </NavLink>
                        </li>
                      )}
                      {can('report/attendanceReport', 'view') && (
                        <li>
                          <NavLink
                            to="/admin/reports/attendance-report"
                            className={({ isActive }) =>
                              isActive || location.pathname.startsWith('/admin/reports/attendance')
                                ? 'active'
                                : ''
                            }
                          >
                            <span>Attendance Report</span>
                          </NavLink>
                        </li>
                      )}
                      {can('report/calendarReport', 'view') && (
                        <li>
                          <NavLink
                            to="/admin/reports/calendar-report"
                            className={({ isActive }) =>
                              isActive || location.pathname.startsWith('/admin/reports/calendar')
                                ? 'active'
                                : ''
                            }
                          >
                            <span>Calendar Report</span>
                          </NavLink>
                        </li>
                      )}
                    </ul>
                  </li>
                )}

                {/* Settings */}
                {hasAny(SETTINGS_MODULES, 'view') && (
                  <li className={`submenu ${openSubmenu.settings ? 'active' : ''}`}>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleSubmenu('settings');
                      }}
                      className={openSubmenu.settings ? 'subdrop active' : ''}
                    >
                      <i className="ti ti-settings"></i>
                      <span>Settings</span>
                      <span className="menu-arrow"></span>
                    </a>
                    <ul className={`sidebar-submenu-list ${openSubmenu.settings ? 'submenu-open' : ''}`}>
                      {can('settings/miscManagement', 'view') && (
                        <li>
                          <NavLink
                            to="/admin/settings/misc-management"
                            className={({ isActive }) =>
                              isActive || location.pathname.includes('misc') || location.pathname.includes('mics')
                                ? 'active'
                                : ''
                            }
                          >
                            <span>Mics Management</span>
                          </NavLink>
                        </li>
                      )}
                      {can('settings/general', 'view') && (
                        <li>
                          <NavLink
                            to="/admin/settings/general-setting"
                            className={({ isActive }) =>
                              isActive || location.pathname.includes('general')
                                ? 'active'
                                : ''
                            }
                          >
                            <span>General Setting</span>
                          </NavLink>
                        </li>
                      )}
                      {can('settings/salarydatesettings', 'view') && (
                        <li>
                          <NavLink
                            to="/admin/settings/salary-date"
                            className={({ isActive }) =>
                              isActive || location.pathname.includes('salary-date') || location.pathname.includes('salarydate')
                                ? 'active'
                                : ''
                            }
                          >
                            <span>Salary Date</span>
                          </NavLink>
                        </li>
                      )}
                    </ul>
                  </li>
                )}

                {/* Roles & Permissions */}
                {(isSuperAdmin || can('permissions/permission', 'view')) && (
                  <li>
                    <NavLink
                      to="/admin/roles-permissions"
                      className={({ isActive }) =>
                        isActive || location.pathname.startsWith('/admin/roles-permissions')
                          ? 'active'
                          : ''
                      }
                    >
                      <i className="ti ti-user-shield"></i>
                      <span>Roles & Permissions</span>
                    </NavLink>
                  </li>
                )}

                {/* Logout */}
                <li>
                  <a href="#logout" onClick={handleLogout} className="text-danger">
                    <i className="ti ti-logout text-danger"></i>
                    <span className="text-danger">Logout</span>
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

export default Sidebar;
