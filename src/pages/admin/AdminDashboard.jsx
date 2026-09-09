import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchDashboardStatsApi } from '../../api/adminDashboard.api';
import Avatar from '../../components/common/Avatar';
import usePermission from '../../hooks/usePermission';

const AdminDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const { can, isSuperAdmin } = usePermission();
  const [stats, setStats] = useState({
    students: { total: 0, active: 0, inactive: 0 },
    teachers: { total: 0, active: 0, inactive: 0 },
    staff: { total: 0, active: 0, inactive: 0 },
    parents: { total: 0, active: 0, inactive: 0 },
    attendanceSummary: {
      students: { present: 0, absent: 0, late: 0 },
      teachers: { present: 0, absent: 0, late: 0 },
      staff: { present: 0, absent: 0, late: 0 },
    },
    leaveRequests: [],
    notices: [],
    studentActivities: [],
    feesSummary: {
      totalInvoiced: 0,
      totalPaid: 0,
      totalDue: 0,
      byClass: [],
    },
    recentAlert: null,
  });
  const [loading, setLoading] = useState(true);
  const [attendanceTab, setAttendanceTab] = useState('students');

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetchDashboardStatsApi();
        if (response && response.data && typeof response.data === 'object') {
          setStats(response.data);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  const currentAttendance = stats?.attendanceSummary?.[attendanceTab] || {
    present: 0,
    absent: 0,
    late: 0,
  };

  const totalAtt =
    (currentAttendance.present || 0) +
    (currentAttendance.absent || 0) +
    (currentAttendance.late || 0);
  const attRate =
    totalAtt > 0
      ? Math.round(((currentAttendance.present || 0) / totalAtt) * 100)
      : 100;

  const feesTotal = stats?.feesSummary?.totalInvoiced || 0;
  const feesPaid = stats?.feesSummary?.totalPaid || 0;
  const feesDue = stats?.feesSummary?.totalDue || 0;

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Admin Dashboard</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Admin Dashboard
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
          {(isSuperAdmin || can('ward/students', 'add')) && (
            <div className="mb-2">
              <Link
                to="/admin/students/add"
                className="btn btn-primary d-flex align-items-center me-3"
              >
                <i className="ti ti-square-rounded-plus me-2"></i>Add New Student
              </Link>
            </div>
          )}
          {(isSuperAdmin || can('academic/year', 'view')) && (
            <div className="mb-2">
              <Link
                to="/admin/academics/years"
                className="btn btn-light d-flex align-items-center"
              >
                <i className="ti ti-notebook me-2"></i>Academics Master
              </Link>
            </div>
          )}
        </div>
      </div>
      {/* /Page Header */}



      {/* Row 1: 4 Metric Cards (Total Students, Teachers, Staff, Parents) */}
      <div className="row">
        {/* Total Students */}
        <div className="col-xxl-3 col-sm-6 d-flex">
          <div className="card flex-fill animate-card border-0">
            <Link to="/admin/students" className="text-decoration-none">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="avatar avatar-xl bg-danger-transparent me-2 p-1 rounded d-flex align-items-center justify-content-center">
                    <img
                      src="/images/student.svg"
                      alt="student"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src =
                          'https://portal.growvidya.in/dev/vidya_assets/images/student.svg';
                      }}
                      style={{ width: '32px', height: '32px' }}
                    />
                  </div>
                  <div className="overflow-hidden flex-fill">
                    <div className="d-flex align-items-center justify-content-between">
                      <h2 className="counter mb-0 text-dark fw-bold">
                        {loading ? '...' : stats?.students?.total ?? 0}
                      </h2>
                      <span className="badge bg-danger">Students</span>
                    </div>
                    <p className="mb-0 text-muted">Total Students</p>
                  </div>
                </div>
                <div className="d-flex align-items-center justify-content-between border-top mt-3 pt-3">
                  <p className="mb-0 text-secondary">
                    Active :{' '}
                    <span className="text-dark fw-semibold">
                      {stats?.students?.active ?? 0}
                    </span>
                  </p>
                  <span className="text-light">|</span>
                  <p className="mb-0 text-secondary">
                    Inactive :{' '}
                    <span className="text-dark fw-semibold">
                      {stats?.students?.inactive ?? 0}
                    </span>
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Total Teachers */}
        <div className="col-xxl-3 col-sm-6 d-flex">
          <div className="card flex-fill animate-card border-0">
            <Link to="/admin/teachers" className="text-decoration-none">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="avatar avatar-xl me-2 bg-secondary-transparent p-1 rounded d-flex align-items-center justify-content-center">
                    <img
                      src="/images/teacher.svg"
                      alt="teacher"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src =
                          'https://portal.growvidya.in/dev/vidya_assets/images/teacher.svg';
                      }}
                      style={{ width: '32px', height: '32px' }}
                    />
                  </div>
                  <div className="overflow-hidden flex-fill">
                    <div className="d-flex align-items-center justify-content-between">
                      <h2 className="counter mb-0 text-dark fw-bold">
                        {loading ? '...' : stats?.teachers?.total ?? 0}
                      </h2>
                      <span className="badge bg-skyblue">Teachers</span>
                    </div>
                    <p className="mb-0 text-muted">Total Teachers</p>
                  </div>
                </div>
                <div className="d-flex align-items-center justify-content-between border-top mt-3 pt-3">
                  <p className="mb-0 text-secondary">
                    Active :{' '}
                    <span className="text-dark fw-semibold">
                      {stats?.teachers?.active ?? 0}
                    </span>
                  </p>
                  <span className="text-light">|</span>
                  <p className="mb-0 text-secondary">
                    Inactive :{' '}
                    <span className="text-dark fw-semibold">
                      {stats?.teachers?.inactive ?? 0}
                    </span>
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Total Staff */}
        <div className="col-xxl-3 col-sm-6 d-flex">
          <div className="card flex-fill animate-card border-0">
            <Link to="/admin/staff" className="text-decoration-none">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="avatar avatar-xl me-2 bg-warning-transparent p-1 rounded d-flex align-items-center justify-content-center">
                    <img
                      src="/images/staff.svg"
                      alt="staff"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src =
                          'https://portal.growvidya.in/dev/vidya_assets/images/staff.svg';
                      }}
                      style={{ width: '32px', height: '32px' }}
                    />
                  </div>
                  <div className="overflow-hidden flex-fill">
                    <div className="d-flex align-items-center justify-content-between">
                      <h2 className="counter mb-0 text-dark fw-bold">
                        {loading ? '...' : stats?.staff?.total ?? 0}
                      </h2>
                      <span className="badge bg-warning">Staff</span>
                    </div>
                    <p className="mb-0 text-muted">Total Staff</p>
                  </div>
                </div>
                <div className="d-flex align-items-center justify-content-between border-top mt-3 pt-3">
                  <p className="mb-0 text-secondary">
                    Active :{' '}
                    <span className="text-dark fw-semibold">
                      {stats?.staff?.active ?? 0}
                    </span>
                  </p>
                  <span className="text-light">|</span>
                  <p className="mb-0 text-secondary">
                    Inactive :{' '}
                    <span className="text-dark fw-semibold">
                      {stats?.staff?.inactive ?? 0}
                    </span>
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Total Parents */}
        <div className="col-xxl-3 col-sm-6 d-flex">
          <div className="card flex-fill animate-card border-0">
            <Link to="/admin/parents" className="text-decoration-none">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="avatar avatar-xl me-2 bg-success-transparent p-1 rounded d-flex align-items-center justify-content-center">
                    <i className="ti ti-users fs-24 text-success"></i>
                  </div>
                  <div className="overflow-hidden flex-fill">
                    <div className="d-flex align-items-center justify-content-between">
                      <h2 className="counter mb-0 text-dark fw-bold">
                        {loading ? '...' : stats?.parents?.total ?? 0}
                      </h2>
                      <span className="badge bg-success">Parents</span>
                    </div>
                    <p className="mb-0 text-muted">Total Parents</p>
                  </div>
                </div>
                <div className="d-flex align-items-center justify-content-between border-top mt-3 pt-3">
                  <p className="mb-0 text-secondary">
                    Active :{' '}
                    <span className="text-dark fw-semibold">
                      {stats?.parents?.active ?? 0}
                    </span>
                  </p>
                  <span className="text-light">|</span>
                  <p className="mb-0 text-secondary">
                    Inactive :{' '}
                    <span className="text-dark fw-semibold">
                      {stats?.parents?.inactive ?? 0}
                    </span>
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
      {/* /Row 1 */}

      {/* Row 2: 4 Action Links */}
      <div className="row">
        {/* View Attendance */}
        <div className="col-xl-3 col-md-6 d-flex">
          <Link
            to="/admin/attendance/student"
            className="card bg-warning-transparent border border-5 border-white animate-card flex-fill text-decoration-none"
          >
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center">
                  <span className="avatar avatar-lg bg-warning rounded flex-shrink-0 me-2 d-flex align-items-center justify-content-center">
                    <i className="ti ti-calendar-share fs-24 text-white"></i>
                  </span>
                  <div className="overflow-hidden">
                    <h6 className="fw-semibold text-default mb-0">
                      View Attendance
                    </h6>
                  </div>
                </div>
                <span className="btn btn-white warning-btn-hover avatar avatar-sm p-0 flex-shrink-0 rounded-circle d-flex align-items-center justify-content-center">
                  <i className="ti ti-chevron-right fs-14"></i>
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* New Events */}
        <div className="col-xl-3 col-md-6 d-flex">
          <Link
            to="/admin/announcements"
            className="card bg-success-transparent border border-5 border-white animate-card flex-fill text-decoration-none"
          >
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center">
                  <span className="avatar avatar-lg bg-success rounded flex-shrink-0 me-2 d-flex align-items-center justify-content-center">
                    <i className="ti ti-speakerphone fs-24 text-white"></i>
                  </span>
                  <div className="overflow-hidden">
                    <h6 className="fw-semibold text-default mb-0">
                      New Events
                    </h6>
                  </div>
                </div>
                <span className="btn btn-white success-btn-hover avatar avatar-sm p-0 flex-shrink-0 rounded-circle d-flex align-items-center justify-content-center">
                  <i className="ti ti-chevron-right fs-14"></i>
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Holiday */}
        <div className="col-xl-3 col-md-6 d-flex">
          <Link
            to="/admin/announcements"
            className="card bg-danger-transparent border border-5 border-white animate-card flex-fill text-decoration-none"
          >
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center">
                  <span className="avatar avatar-lg bg-danger rounded flex-shrink-0 me-2 d-flex align-items-center justify-content-center">
                    <i className="ti ti-calendar-event fs-24 text-white"></i>
                  </span>
                  <div className="overflow-hidden">
                    <h6 className="fw-semibold text-default mb-0">Holiday</h6>
                  </div>
                </div>
                <span className="btn btn-white avatar avatar-sm p-0 flex-shrink-0 rounded-circle danger-btn-hover d-flex align-items-center justify-content-center">
                  <i className="ti ti-chevron-right fs-14"></i>
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Finance & Accounts */}
        <div className="col-xl-3 col-md-6 d-flex">
          <Link
            to="/admin/fees/dashboard"
            className="card bg-secondary-transparent border border-5 border-white animate-card flex-fill text-decoration-none"
          >
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center">
                  <span className="avatar avatar-lg bg-secondary rounded flex-shrink-0 me-2 d-flex align-items-center justify-content-center">
                    <i className="ti ti-moneybag fs-24 text-white"></i>
                  </span>
                  <div className="overflow-hidden">
                    <h6 className="fw-semibold text-default mb-0">
                      Finance &amp; Accounts
                    </h6>
                  </div>
                </div>
                <span className="btn btn-white secondary-btn-hover avatar avatar-sm p-0 flex-shrink-0 rounded-circle d-flex align-items-center justify-content-center">
                  <i className="ti ti-chevron-right fs-14"></i>
                </span>
              </div>
            </div>
          </Link>
        </div>
      </div>
      {/* /Row 2 */}

      {/* Row 3: Quick Links + Leave Requests */}
      <div className="row">
        {/* Quick Links */}
        <div className="col-xxl-6 col-md-12 d-flex flex-column">
          <div className="card flex-fill">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h4 className="card-title mb-0">Quick Links</h4>
            </div>
            <div className="card-body">
              <div className="row g-3">
                {[
                  {
                    title: 'Calendar',
                    to: '/admin/reports/calendar-report',
                    module: 'report/calendarReport',
                    icon: 'ti ti-calendar',
                    colorClass: 'bg-success-transparent',
                    borderClass: 'border-success',
                    bgClass: 'bg-success',
                  },
                  {
                    title: 'Fees',
                    to: '/admin/fees/dashboard',
                    module: 'feesmanagement/payments',
                    icon: 'ti ti-report-money',
                    colorClass: 'bg-secondary-transparent',
                    borderClass: 'border-secondary',
                    bgClass: 'bg-secondary',
                  },
                  {
                    title: 'Routines',
                    to: '/admin/academics/routines',
                    module: 'academic/routine',
                    icon: 'ti ti-calendar-time',
                    colorClass: 'bg-primary-transparent',
                    borderClass: 'border-primary',
                    bgClass: 'bg-primary',
                  },
                  {
                    title: 'Home Works',
                    to: '/admin/academics/assignments',
                    module: 'academic/assignment',
                    icon: 'ti ti-clipboard-list',
                    colorClass: 'bg-danger-transparent',
                    borderClass: 'border-danger',
                    bgClass: 'bg-danger',
                  },
                  {
                    title: 'Attendance',
                    to: '/admin/attendance/student',
                    module: 'attendance/student',
                    icon: 'ti ti-user-check',
                    colorClass: 'bg-warning-transparent',
                    borderClass: 'border-warning',
                    bgClass: 'bg-warning',
                  },
                  {
                    title: 'Reports',
                    to: '/admin/reports/class-report',
                    module: 'report/classReport',
                    icon: 'ti ti-file-analytics',
                    colorClass: 'bg-skyblue-transparent',
                    borderClass: 'border-skyblue',
                    bgClass: 'bg-skyblue',
                  },
                ]
                  .filter((item) => isSuperAdmin || !item.module || can(item.module, 'view'))
                  .map((item) => (
                    <div className="col-md-4 col-sm-6" key={item.title}>
                      <Link
                        to={item.to}
                        className={`d-block ${item.colorClass} rounded p-3 text-center class-hover text-decoration-none`}
                      >
                        <div
                          className={`avatar avatar-lg border p-1 ${item.borderClass} rounded-circle mb-2 mx-auto d-flex align-items-center justify-content-center`}
                        >
                          <span
                            className={`d-inline-flex align-items-center justify-content-center w-100 h-100 ${item.bgClass} rounded-circle text-white`}
                          >
                            <i className={`${item.icon} fs-20`}></i>
                          </span>
                        </div>
                        <p className="text-dark fw-semibold mb-0">{item.title}</p>
                      </Link>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Leave Requests (Real Database Rows) */}
        <div className="col-xxl-6 col-xl-6 d-flex">
          <div className="card flex-fill">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h4 className="card-title mb-0">Leave Requests</h4>
              <span className="badge bg-light text-muted fw-normal">
                {stats.leaveRequests?.length || 0} Recent
              </span>
            </div>
            <div
              className="card-body p-3"
              style={{ maxHeight: '340px', overflowY: 'auto' }}
            >
              {stats.leaveRequests && stats.leaveRequests.length > 0 ? (
                stats.leaveRequests.map((req) => (
                  <div className="card mb-2 border shadow-none" key={req.id}>
                    <div className="card-body p-3">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <div className="d-flex align-items-center overflow-hidden me-2">
                          <span className="avatar avatar-lg flex-shrink-0 me-2">
                            <Avatar
                              src={req.picture}
                              name={req.name}
                              size={42}
                              rounded={true}
                            />
                          </span>
                          <div className="overflow-hidden">
                            <h6 className="mb-1 text-truncate fw-bold">
                              <span className="text-dark">{req.name}</span>
                              <span className="badge badge-soft-danger ms-2">
                                {req.leaveType}
                              </span>
                            </h6>
                            <p className="text-muted text-xs mb-0 text-truncate text-capitalize">
                              {req.role}
                            </p>
                          </div>
                        </div>

                        <div className="d-flex gap-1 flex-shrink-0">
                          <span
                            className={`badge badge-soft-${
                              req.status === 'Approved'
                                ? 'success'
                                : req.status === 'Rejected'
                                ? 'danger'
                                : 'warning'
                            } d-inline-flex align-items-center`}
                          >
                            <i className="ti ti-circle-filled fs-5 me-1"></i>
                            {req.status}
                          </span>
                        </div>
                      </div>

                      <div className="d-flex align-items-center justify-content-between border-top pt-2 mt-2 fs-12 text-muted">
                        <p className="mb-0">
                          Leave :{' '}
                          <span className="fw-semibold text-dark">
                            {req.dates}
                          </span>
                        </p>
                        <p className="mb-0">
                          Apply on :{' '}
                          <span className="fw-semibold text-dark">
                            {req.appliedOn}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted">
                  <i className="ti ti-calendar-off fs-32 d-block mb-2 text-muted"></i>
                  No leave requests found.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* /Row 3 */}

      {/* Row 4: Attendance Summary + Fees Collection */}
      <div className="row">
        {/* Attendance Widget */}
        <div className="col-xxl-4 col-xl-6 col-md-12 d-flex flex-column">
          <div className="card flex-fill">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h4 className="card-title mb-0">Attendance</h4>
              <span className="badge bg-light text-dark">Today's Summary</span>
            </div>
            <div className="card-body">
              <div className="list-tab mb-3">
                <ul className="nav nav-pills nav-fill" role="tablist">
                  <li className="nav-item">
                    <button
                      type="button"
                      className={`nav-link ${
                        attendanceTab === 'students' ? 'active' : ''
                      }`}
                      onClick={() => setAttendanceTab('students')}
                    >
                      Students
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      type="button"
                      className={`nav-link ${
                        attendanceTab === 'teachers' ? 'active' : ''
                      }`}
                      onClick={() => setAttendanceTab('teachers')}
                    >
                      Teachers
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      type="button"
                      className={`nav-link ${
                        attendanceTab === 'staff' ? 'active' : ''
                      }`}
                      onClick={() => setAttendanceTab('staff')}
                    >
                      Staff
                    </button>
                  </li>
                </ul>
              </div>

              <div className="tab-content">
                <div className="row gx-2 mb-3">
                  <div className="col-4">
                    <div className="card bg-success-transparent shadow-none border border-success mb-0">
                      <div className="card-body p-2 text-center">
                        <h5 className="mb-0 fw-bold text-success">
                          {currentAttendance.present || 0}
                        </h5>
                        <p className="fs-12 mb-0 text-muted">Present</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="card bg-danger-transparent shadow-none border border-danger mb-0">
                      <div className="card-body p-2 text-center">
                        <h5 className="mb-0 fw-bold text-danger">
                          {currentAttendance.absent || 0}
                        </h5>
                        <p className="fs-12 mb-0 text-muted">Absent</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="card bg-warning-transparent shadow-none border border-warning mb-0">
                      <div className="card-body p-2 text-center">
                        <h5 className="mb-0 fw-bold text-warning">
                          {currentAttendance.late || 0}
                        </h5>
                        <p className="fs-12 mb-0 text-muted">Late</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-light-300 rounded">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="fs-13 fw-semibold text-dark">
                      Attendance Rate
                    </span>
                    <span className="fs-13 fw-bold text-primary">
                      {attRate}%
                    </span>
                  </div>
                  <div className="progress" style={{ height: '10px' }}>
                    <div
                      className="progress-bar bg-success"
                      role="progressbar"
                      style={{
                        width: `${
                          totalAtt > 0
                            ? ((currentAttendance.present || 0) / totalAtt) * 100
                            : 100
                        }%`,
                      }}
                      title="Present"
                    ></div>
                    <div
                      className="progress-bar bg-warning"
                      role="progressbar"
                      style={{
                        width: `${
                          totalAtt > 0
                            ? ((currentAttendance.late || 0) / totalAtt) * 100
                            : 0
                        }%`,
                      }}
                      title="Late"
                    ></div>
                    <div
                      className="progress-bar bg-danger"
                      role="progressbar"
                      style={{
                        width: `${
                          totalAtt > 0
                            ? ((currentAttendance.absent || 0) / totalAtt) * 100
                            : 0
                        }%`,
                      }}
                      title="Absent"
                    ></div>
                  </div>
                  <div className="d-flex justify-content-between mt-2 fs-11 text-muted">
                    <span>
                      <i className="ti ti-point-filled text-success me-1"></i>
                      Present ({currentAttendance.present || 0})
                    </span>
                    <span>
                      <i className="ti ti-point-filled text-warning me-1"></i>
                      Late ({currentAttendance.late || 0})
                    </span>
                    <span>
                      <i className="ti ti-point-filled text-danger me-1"></i>
                      Absent ({currentAttendance.absent || 0})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fees Collection Overview */}
        <div className="col-xxl-8 col-xl-6 d-flex">
          <div className="card flex-fill">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h4 className="card-title mb-0">Fees Collection</h4>
              <Link to="/admin/fees/dashboard" className="fw-medium fs-13">
                View All
              </Link>
            </div>
            <div className="card-body">
              {/* Fee Metric Summary Boxes */}
              <div className="row g-3 mb-4">
                <div className="col-md-4">
                  <div className="border rounded p-3 bg-primary-transparent">
                    <p className="text-muted fs-12 mb-1">Total Invoiced</p>
                    <h4 className="fw-bold mb-0 text-primary">
                      ₹{Number(feesTotal).toLocaleString()}
                    </h4>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="border rounded p-3 bg-success-transparent">
                    <p className="text-muted fs-12 mb-1">Total Collected</p>
                    <h4 className="fw-bold mb-0 text-success">
                      ₹{Number(feesPaid).toLocaleString()}
                    </h4>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="border rounded p-3 bg-danger-transparent">
                    <p className="text-muted fs-12 mb-1">Total Outstanding</p>
                    <h4 className="fw-bold mb-0 text-danger">
                      ₹{Number(feesDue).toLocaleString()}
                    </h4>
                  </div>
                </div>
              </div>

              {/* Class-wise Real Breakdown */}
              <h6 className="fw-semibold mb-3 text-dark">
                Class-wise Fee Breakdown
              </h6>
              <div
                className="row g-2"
                style={{ maxHeight: '180px', overflowY: 'auto' }}
              >
                {stats.feesSummary?.byClass &&
                stats.feesSummary.byClass.length > 0 ? (
                  stats.feesSummary.byClass.map((cls, idx) => {
                    const clsTotal = Number(cls.total || 0);
                    const clsPaid = Number(cls.paid || 0);
                    const clsPct =
                      clsTotal > 0 ? Math.round((clsPaid / clsTotal) * 100) : 0;
                    return (
                      <div className="col-md-6 mb-2" key={idx}>
                        <div className="p-2 border rounded bg-light-300">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="fw-bold fs-13 text-dark">
                              Class {cls.class_name}
                            </span>
                            <span className="fs-12 text-muted">
                              ₹{clsPaid.toLocaleString()} / ₹
                              {clsTotal.toLocaleString()}
                            </span>
                          </div>
                          <div className="progress" style={{ height: '6px' }}>
                            <div
                              className="progress-bar bg-success"
                              style={{ width: `${clsPct}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-3 text-muted">
                    No fee invoice data available.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* /Row 4 */}

      {/* Row 5: Notice Board + Student Activity */}
      <div className="row">
        {/* Notice Board (Real Database Rows) */}
        <div className="col-xxl-6 col-xl-12 d-flex">
          <div className="card flex-fill">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h4 className="card-title mb-0">Notice Board</h4>
              <Link to="/admin/announcements" className="fw-medium fs-13">
                View All
              </Link>
            </div>
            <div className="card-body">
              <div className="notice-widget">
                {stats.notices && stats.notices.length > 0 ? (
                  stats.notices.map((notice) => (
                    <div
                      className="d-sm-flex align-items-center justify-content-between mb-3 pb-3 border-bottom"
                      key={notice.id}
                    >
                      <div className="d-flex align-items-center overflow-hidden me-2 mb-2 mb-sm-0">
                        <span className="bg-primary-transparent avatar avatar-md me-2 rounded-circle flex-shrink-0 d-flex align-items-center justify-content-center">
                          <i className="ti ti-note fs-18 text-primary"></i>
                        </span>
                        <div className="overflow-hidden">
                          <h6 className="text-truncate mb-1 fw-bold text-dark">
                            {notice.title}
                          </h6>
                          <p className="text-muted text-xs mb-0">
                            <i className="ti ti-calendar me-1"></i>
                            Added on : {notice.publishOn || notice.noticeDate}
                          </p>
                        </div>
                      </div>
                      <span className="badge bg-light text-dark flex-shrink-0">
                        <i className="ti ti-clock me-1"></i>
                        {notice.daysDiff} Days {notice.isFuture ? 'Left' : 'Ago'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted">
                    <i className="ti ti-bell-off fs-32 d-block mb-2 text-muted"></i>
                    No notices available.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Student Activity (Real Database Rows) */}
        <div className="col-xxl-6 col-xl-6 d-flex">
          <div className="card flex-fill">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h4 className="card-title mb-0">Student Activity</h4>
              <span className="badge bg-light text-muted fw-normal">
                {stats.studentActivities?.length || 0} Recent
              </span>
            </div>
            <div
              className="card-body p-3"
              style={{ maxHeight: '340px', overflowY: 'auto' }}
            >
              {stats.studentActivities && stats.studentActivities.length > 0 ? (
                stats.studentActivities.map((act) => (
                  <div
                    className="d-flex align-items-center overflow-hidden p-3 mb-2 border rounded bg-light-300"
                    key={act.id}
                  >
                    <span className="avatar avatar-lg flex-shrink-0 rounded me-3">
                      <Avatar
                        src={act.picture}
                        name={act.name}
                        size={42}
                        rounded={true}
                      />
                    </span>
                    <div className="overflow-hidden flex-fill">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <h6 className="mb-0 text-truncate fw-bold text-dark">
                          {act.name}
                        </h6>
                        {act.date && (
                          <span className="text-muted text-xs">{act.date}</span>
                        )}
                      </div>
                      <p className="text-muted fs-13 mb-0 text-truncate">
                        {act.description || 'Participated in school activity.'}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted">
                  <i className="ti ti-activity fs-32 d-block mb-2 text-muted"></i>
                  No student activity recorded.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* /Row 5 */}
    </div>
  );
};

export default AdminDashboard;
