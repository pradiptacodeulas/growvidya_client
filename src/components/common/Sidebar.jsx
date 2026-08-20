import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logoutAdmin } from '../../store/slices/authSlice';
import logoDark from '../../assets/logo_dark.png';
import logoSmall from '../../assets/logo-small.png';
import Avatar from './Avatar';

const Sidebar = ({ isCollapsed, isHovered, onMouseEnter, onMouseLeave, onToggleSidebar }) => {
  const dispatch = useDispatch();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);

  // Submenu open states
  const [openSubmenu, setOpenSubmenu] = useState({
    ward: location.pathname.includes('/admin/students') || location.pathname.includes('/admin/parents'),
    staff:
      location.pathname.includes('/admin/teachers') ||
      location.pathname.includes('/admin/staff') ||
      location.pathname.includes('/admin/users'),
    academic: location.pathname.includes('/admin/academics') || location.pathname.includes('/admin/academic'),
    attendance: location.pathname.includes('/admin/attendance'),
    examination: location.pathname.includes('/admin/examinations') || location.pathname.includes('/admin/examination'),
    payroll: false,
    leaves: location.pathname.includes('/admin/leaves'),
    transport: location.pathname.includes('/admin/transport'),
    hostel: false,
    fees: location.pathname.includes('/admin/fees') || location.pathname.includes('feesmanagement'),
    announcement: false,
    certificate: false,
    records: false,
    report: location.pathname.includes('/admin/reports'),
    settings: false,
  });

  useEffect(() => {
    setOpenSubmenu((prev) => ({
      ...prev,
      ward: prev.ward || location.pathname.includes('/admin/students') || location.pathname.includes('/admin/parents'),
      staff:
        prev.staff ||
        location.pathname.includes('/admin/teachers') ||
        location.pathname.includes('/admin/staff') ||
        location.pathname.includes('/admin/users'),
      academic: prev.academic || location.pathname.includes('/admin/academics') || location.pathname.includes('/admin/academic'),
      attendance: prev.attendance || location.pathname.includes('/admin/attendance'),
      examination: prev.examination || location.pathname.includes('/admin/examinations') || location.pathname.includes('/admin/examination'),
      leaves: prev.leaves || location.pathname.includes('/admin/leaves'),
      transport: prev.transport || location.pathname.includes('/admin/transport'),
      fees: prev.fees || location.pathname.includes('/admin/fees') || location.pathname.includes('feesmanagement'),
      report: prev.report || location.pathname.includes('/admin/reports'),
    }));
  }, [location.pathname]);

  const toggleSubmenu = (menuKey) => {
    setOpenSubmenu((prev) => ({
      ...prev,
      [menuKey]: !prev[menuKey],
    }));
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
      {/* Sidebar Top Header Element (App Logo & Hamburger Button) */}
      <div className="sidebar-logo d-flex align-items-center justify-content-between px-3">
        <a href="/admin/dashboard" className="d-flex align-items-center text-decoration-none">
          <img
            src={showFullLogo ? logoDark : logoSmall}
            alt="Growvidya Logo"
            style={{
              maxHeight: showFullLogo ? '38px' : '34px',
              maxWidth: showFullLogo ? '140px' : '34px',
              objectFit: 'contain',
              transition: 'all 0.2s ease',
            }}
          />
        </a>
        <a
          id="toggle_btn"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onToggleSidebar();
          }}
          className={`text-dark fs-20 d-flex align-items-center justify-content-center ${isCollapsed ? 'active' : ''}`}
          title={isCollapsed ? 'Permanently Expand Sidebar' : 'Collapse Sidebar'}
        >
          <i className="ti ti-menu-deep fs-20 text-dark"></i>
        </a>
      </div>

      {/* Sidebar Scrollable Menu Body */}
      <div className="sidebar-inner slimscroll flex-fill">
        <div id="sidebar-menu" className="sidebar-menu">
          {/* User Profile / Header Widget */}
          <ul className="mb-3">
            <li>
              <div className="d-flex align-items-center border bg-white rounded p-2 text-decoration-none cursor-pointer">
                <Avatar
                  src={user?.picture}
                  name={user?.firstName || user?.schoolName || 'Admin'}
                  size={32}
                  rounded={true}
                  className="flex-shrink-0"
                />
                <span className="text-dark ms-2 fw-semibold text-truncate">{user?.schoolName || 'Growvidya School'}</span>
              </div>
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
                  <ul style={{ display: openSubmenu.ward ? 'block' : 'none' }}>
                    <li>
                      <NavLink to="/admin/students" className={({ isActive }) => (isActive ? 'active' : '')}>
                        <span>Students</span>
                      </NavLink>
                    </li>
                    <li>
                      <NavLink to="/admin/parents" className={({ isActive }) => (isActive ? 'active' : '')}>
                        <span>Parents</span>
                      </NavLink>
                    </li>
                  </ul>
                </li>

                {/* Staff */}
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
                  <ul style={{ display: openSubmenu.staff ? 'block' : 'none' }}>
                    <li>
                      <NavLink to="/admin/teachers" className={({ isActive }) => (isActive ? 'active' : '')}>
                        <span>Teachers</span>
                      </NavLink>
                    </li>
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
                  </ul>
                </li>

                {/* Academic */}
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
                  <ul style={{ display: openSubmenu.academic ? 'block' : 'none' }}>
                    <li><NavLink to="/admin/academics/shifts" className={({ isActive }) => (isActive || location.pathname.startsWith('/admin/academics/shifts') || location.pathname.startsWith('/admin/academic/shifts') || location.pathname.startsWith('/admin/academic/shift') ? 'active' : '')}><span>Shift</span></NavLink></li>
                    <li><NavLink to="/admin/academics/classes" className={({ isActive }) => (isActive || location.pathname.startsWith('/admin/academics/classes') || location.pathname.startsWith('/admin/academic/classes') || location.pathname.startsWith('/admin/academic/class') ? 'active' : '')}><span>Class</span></NavLink></li>
                    <li><NavLink to="/admin/academics/days" className={({ isActive }) => (isActive || location.pathname.startsWith('/admin/academics/days') || location.pathname.startsWith('/admin/academic/days') || location.pathname.startsWith('/admin/academic/day') ? 'active' : '')}><span>Days</span></NavLink></li>
                    <li><NavLink to="/admin/academics/sections" className={({ isActive }) => (isActive || location.pathname.startsWith('/admin/academics/sections') || location.pathname.startsWith('/admin/academic/sections') || location.pathname.startsWith('/admin/academic/section') ? 'active' : '')}><span>Section</span></NavLink></li>
                    <li><NavLink to="/admin/academics/periods" className={({ isActive }) => (isActive || location.pathname.startsWith('/admin/academics/periods') || location.pathname.startsWith('/admin/academic/periods') || location.pathname.startsWith('/admin/academic/period') ? 'active' : '')}><span>Period</span></NavLink></li>
                    <li><NavLink to="/admin/academics/houses" className={({ isActive }) => (isActive || location.pathname.startsWith('/admin/academics/houses') || location.pathname.startsWith('/admin/academic/houses') || location.pathname.startsWith('/admin/academic/house') ? 'active' : '')}><span>House</span></NavLink></li>
                    <li><NavLink to="/admin/academics/years" className={({ isActive }) => (isActive || location.pathname.startsWith('/admin/academics/years') || location.pathname.startsWith('/admin/academic/years') || location.pathname.startsWith('/admin/academic/year') ? 'active' : '')}><span>Academic Year</span></NavLink></li>
                    <li><NavLink to="/admin/academics/document-types" className={({ isActive }) => (isActive || location.pathname.startsWith('/admin/academics/document-types') ? 'active' : '')}><span>Document Type</span></NavLink></li>
                    <li><NavLink to="/admin/academics/subjects" className={({ isActive }) => (isActive || location.pathname.startsWith('/admin/academics/subjects') || location.pathname.startsWith('/admin/academic/subjects') || location.pathname.startsWith('/admin/academic/subject') ? 'active' : '')}><span>Subject</span></NavLink></li>
                    <li><NavLink to="/admin/academics/routine" className={({ isActive }) => (isActive || location.pathname.startsWith('/admin/academics/routine') || location.pathname.startsWith('/admin/academics/routines') ? 'active' : '')}><span>Routine</span></NavLink></li>
                    <li><NavLink to="/admin/academics/syllabus" className={({ isActive }) => (isActive || location.pathname.startsWith('/admin/academics/syllabus') ? 'active' : '')}><span>Syllabus</span></NavLink></li>
                    <li><NavLink to="/admin/academics/assignment-types" className={({ isActive }) => (isActive || location.pathname.startsWith('/admin/academics/assignment-types') ? 'active' : '')}><span>Assignment Type</span></NavLink></li>
                    <li><NavLink to="/admin/academics/assignments" className={({ isActive }) => (isActive || location.pathname.startsWith('/admin/academics/assignments') ? 'active' : '')}><span>Assignment</span></NavLink></li>
                    <li><NavLink to="/admin/academics/study-material" className={({ isActive }) => (isActive || location.pathname.startsWith('/admin/academics/study-material') || location.pathname.startsWith('/admin/academics/study-materials') ? 'active' : '')}><span>Study Material</span></NavLink></li>
                  </ul>
                </li>

                {/* Attendance */}
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
                  <ul style={{ display: openSubmenu.attendance ? 'block' : 'none' }}>
                    <li><NavLink to="/admin/attendance/student" className={({ isActive }) => (isActive ? 'active' : '')}><span>Student Attendance</span></NavLink></li>
                    <li><NavLink to="/admin/attendance/teacher" className={({ isActive }) => (isActive ? 'active' : '')}><span>Teacher Attendance</span></NavLink></li>
                    <li><NavLink to="/admin/attendance/staff" className={({ isActive }) => (isActive ? 'active' : '')}><span>Staff Attendance</span></NavLink></li>
                  </ul>
                </li>

                {/* Leaves Application */}
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
                  <ul style={{ display: openSubmenu.leaves ? 'block' : 'none' }}>
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
                  </ul>
                </li>

                {/* Examination */}
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
                  <ul style={{ display: openSubmenu.examination ? 'block' : 'none' }}>
                    <li>
                      <NavLink
                        to="/admin/examinations/grades"
                        className={({ isActive }) => (isActive || location.pathname.includes('gradeSettings') ? 'active' : '')}
                      >
                        <span>Grade</span>
                      </NavLink>
                    </li>
                    <li>
                      <NavLink
                        to="/admin/examinations/exams"
                        className={({ isActive }) => (isActive || (location.pathname.startsWith('/admin/examinations/exams') || location.pathname === '/admin/examination/exam') ? 'active' : '')}
                      >
                        <span>Exam</span>
                      </NavLink>
                    </li>
                    <li>
                      <NavLink
                        to="/admin/examinations/exam-types"
                        className={({ isActive }) => (isActive || location.pathname.includes('examtype') ? 'active' : '')}
                      >
                        <span>Exam Type</span>
                      </NavLink>
                    </li>
                    <li>
                      <NavLink
                        to="/admin/examinations/exam-subjects"
                        className={({ isActive }) => (isActive || location.pathname.includes('examsubject') ? 'active' : '')}
                      >
                        <span>Exam Subject</span>
                      </NavLink>
                    </li>
                    <li>
                      <NavLink
                        to="/admin/examinations/schedules"
                        className={({ isActive }) => (isActive || location.pathname.includes('examschedule') ? 'active' : '')}
                      >
                        <span>Exam Schedule</span>
                      </NavLink>
                    </li>
                    <li>
                      <NavLink
                        to="/admin/examinations/attendance"
                        className={({ isActive }) => (isActive || location.pathname.includes('examAttendance') ? 'active' : '')}
                      >
                        <span>Exam Attendance</span>
                      </NavLink>
                    </li>
                    <li>
                      <NavLink
                        to="/admin/examinations/results"
                        className={({ isActive }) => (isActive || location.pathname.includes('examResult') ? 'active' : '')}
                      >
                        <span>Exam Result</span>
                      </NavLink>
                    </li>
                  </ul>
                </li>

                {/* Transport */}
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
                  <ul style={{ display: openSubmenu.transport ? 'block' : 'none' }}>
                    <li>
                      <NavLink
                        to="/admin/transport/routes"
                        className={({ isActive }) => (isActive ? 'active' : '')}
                      >
                        <span>Routes</span>
                      </NavLink>
                    </li>
                    <li>
                      <NavLink
                        to="/admin/transport/vehicles"
                        className={({ isActive }) => (isActive ? 'active' : '')}
                      >
                        <span>Vehicles</span>
                      </NavLink>
                    </li>
                    <li>
                      <NavLink
                        to="/admin/transport/drivers"
                        className={({ isActive }) => (isActive ? 'active' : '')}
                      >
                        <span>Drivers</span>
                      </NavLink>
                    </li>
                    <li>
                      <NavLink
                        to="/admin/transport/assign"
                        className={({ isActive }) => (isActive ? 'active' : '')}
                      >
                        <span>Assign Vehicle</span>
                      </NavLink>
                    </li>
                  </ul>
                </li>

                {/* Fees Management */}
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
                  <ul style={{ display: openSubmenu.fees ? 'block' : 'none' }}>
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
                    <li>
                      <NavLink
                        to="/admin/fees/structures"
                        className={({ isActive }) => (isActive || location.pathname.includes('/fees/structures') ? 'active' : '')}
                      >
                        <span>Fee Groups & Structures</span>
                      </NavLink>
                    </li>
                    <li>
                      <NavLink
                        to="/admin/fees/components"
                        className={({ isActive }) => (isActive ? 'active' : '')}
                      >
                        <span>Fee Headings</span>
                      </NavLink>
                    </li>
                    <li>
                      <NavLink
                        to="/admin/fees/allocations"
                        className={({ isActive }) => (isActive ? 'active' : '')}
                      >
                        <span>Fee Allocation/Assign</span>
                      </NavLink>
                    </li>
                    <li>
                      <NavLink
                        to="/admin/fees/invoices"
                        className={({ isActive }) => (isActive ? 'active' : '')}
                      >
                        <span>Invoices & Demand</span>
                      </NavLink>
                    </li>
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
                  </ul>
                </li>

                {/* Reports */}
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
                  <ul style={{ display: openSubmenu.report ? 'block' : 'none' }}>
                    <li><NavLink to="/admin/reports"><span>Class Report</span></NavLink></li>
                    <li><NavLink to="/admin/reports"><span>Student Report</span></NavLink></li>
                    <li><NavLink to="/admin/reports"><span>Attendance Report</span></NavLink></li>
                  </ul>
                </li>

                {/* Roles & Permissions */}
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
