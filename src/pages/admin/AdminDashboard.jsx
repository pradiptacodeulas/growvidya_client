import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Chart from 'chart.js/auto';
import { fetchDashboardStatsApi } from '../../api/adminDashboard.api';
import Avatar from '../../components/common/Avatar';
import usePermission from '../../hooks/usePermission';
import NoData from '../../components/common/NoData';
import { resolveImageUrl } from '../../utils/url.util';
import studentSvg from '../../assets/student.svg';
import teacherSvg from '../../assets/teacher.svg';
import staffSvg from '../../assets/staff.svg';

const FEES_MODULES = [
  'feesmanagement/payments',
  'feesmanagement/structures',
  'feesmanagement/components',
  'feesmanagement/allocations',
  'feesmanagement/invoices',
];

const formatINR = (val) => {
  const num = Number(val);
  if (isNaN(num)) return '₹0';
  return `₹${num.toLocaleString('en-IN')}`;
};

/**
 * Reusable Chart.js Canvas Component with optional Doughnut Center Text plugin
 */
const ChartCanvas = ({ type, data, options, centerText, centerSubtext, height = 220 }) => {
  const canvasRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    const ctx = canvasRef.current;
    if (!ctx) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const centerTextPlugin = {
      id: 'centerTextPlugin',
      beforeDraw(chart) {
        if (!centerText || (chart.config.type !== 'doughnut' && chart.config.type !== 'pie')) {
          return;
        }
        const { chartArea, ctx: c } = chart;
        if (!chartArea) return;
        const centerX = (chartArea.left + chartArea.right) / 2;
        const centerY = (chartArea.top + chartArea.bottom) / 2;

        c.save();
        c.textAlign = 'center';
        c.textBaseline = 'middle';

        c.font = 'bold 18px Inter, system-ui, sans-serif';
        c.fillStyle = '#1e293b';
        c.fillText(centerText, centerX, centerSubtext ? centerY - 8 : centerY);

        if (centerSubtext) {
          c.font = '500 11px Inter, system-ui, sans-serif';
          c.fillStyle = '#64748b';
          c.fillText(centerSubtext, centerX, centerY + 12);
        }
        c.restore();
      },
    };

    chartInstanceRef.current = new Chart(ctx, {
      type,
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        ...options,
      },
      plugins: centerText ? [centerTextPlugin] : [],
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [type, data, options, centerText, centerSubtext]);

  return (
    <div style={{ position: 'relative', height: `${height}px`, width: '100%' }}>
      <canvas ref={canvasRef} />
    </div>
  );
};

const AdminDashboard = () => {
  const { user } = useSelector((state) => state.auth || {});
  const { hasAny, isSuperAdmin } = usePermission();
  const [searchParams] = useSearchParams();
  const isBranchView = searchParams.get('view') === 'branch';

  const [stats, setStats] = useState({
    branchInfo: null,
    students: { total: 0, active: 0, inactive: 0 },
    teachers: { total: 0, active: 0, inactive: 0 },
    staff: { total: 0, active: 0, inactive: 0 },
    parents: { total: 0, active: 0, inactive: 0 },
    attendanceSummary: {
      students: { present: 0, absent: 0, late: 0, halfday: 0 },
      teachers: { present: 0, absent: 0, late: 0, halfday: 0 },
      staff: { present: 0, absent: 0, late: 0, halfday: 0 },
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
  const [attendanceTab, setAttendanceTab] = useState('students'); // 'all' | 'students' | 'teachers' | 'staff'
  const [feesViewMode, setFeesViewMode] = useState('charts'); // 'charts' | 'list'

  const isSchoolSuperAdmin = Boolean(
    isSuperAdmin ||
      user?.isSuperAdmin ||
      Number(user?.adminType || user?.admin_type) === 1 ||
      String(user?.roleName || user?.role_name || '').toLowerCase() === 'super admin'
  );

  const isMultiBranch =
    String(user?.registrationType || user?.registration_type || '').toLowerCase() === 'multiple';

  const canViewFees = isSuperAdmin || hasAny(FEES_MODULES, 'view');

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchDashboardStatsApi();
      if (response && response.data && typeof response.data === 'object') {
        setStats(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSchoolSuperAdmin && !isBranchView) {
      return;
    }
    loadStats();

    const handleBranchChange = () => {
      loadStats();
    };
    window.addEventListener('branch_changed', handleBranchChange);
    return () => {
      window.removeEventListener('branch_changed', handleBranchChange);
    };
  }, [isSchoolSuperAdmin, isBranchView, loadStats]);

  // School Super Admins default to the Organization Dashboard unless viewing operational dashboard (?view=branch)
  if (isSchoolSuperAdmin && !isBranchView) {
    return <Navigate to="/admin/super-admin/dashboard" replace />;
  }

  // Active campus context name
  const cachedBranchId =
    typeof window !== 'undefined' ? localStorage.getItem('active_branch_id') : null;
  const cachedBranchName =
    typeof window !== 'undefined' ? localStorage.getItem('active_branch_name') : '';
  const activeBranchLabel =
    stats?.branchInfo?.branchName ||
    (cachedBranchId && cachedBranchId !== 'all' ? cachedBranchName : '') ||
    (!isSchoolSuperAdmin ? user?.branchName || user?.branch_name : '');

  const schoolName = user?.schoolName || user?.school_name || '';
  const schoolLogo = resolveImageUrl(user?.schoolLogo || user?.school_logo);

  // ---------------------------------------------------------------------------
  // Attendance Calculations (includes present, late, halfday, absent)
  // ---------------------------------------------------------------------------
  const currentAttendance = useMemo(() => {
    const summary = stats?.attendanceSummary || {};
    if (attendanceTab === 'all') {
      const stu = summary.students || {};
      const tch = summary.teachers || {};
      const stf = summary.staff || {};
      return {
        present: Number(stu.present || 0) + Number(tch.present || 0) + Number(stf.present || 0),
        absent: Number(stu.absent || 0) + Number(tch.absent || 0) + Number(stf.absent || 0),
        late: Number(stu.late || 0) + Number(tch.late || 0) + Number(stf.late || 0),
        halfday: Number(stu.halfday || 0) + Number(tch.halfday || 0) + Number(stf.halfday || 0),
      };
    }
    const target = summary[attendanceTab] || {};
    return {
      present: Number(target.present || 0),
      absent: Number(target.absent || 0),
      late: Number(target.late || 0),
      halfday: Number(target.halfday || 0),
    };
  }, [stats?.attendanceSummary, attendanceTab]);

  const totalAtt =
    currentAttendance.present +
    currentAttendance.absent +
    currentAttendance.late +
    currentAttendance.halfday;

  const attRate =
    totalAtt > 0
      ? Math.round(
          ((currentAttendance.present + currentAttendance.late + currentAttendance.halfday) /
            totalAtt) *
            100
        )
      : 0;

  const attendanceDoughnutData = useMemo(() => {
    const { present, late, halfday, absent } = currentAttendance;
    const hasMarked = totalAtt > 0;
    return {
      labels: hasMarked
        ? ['Present', 'Late', 'Half Day', 'Absent']
        : ['No Attendance Marked Today'],
      datasets: [
        {
          data: hasMarked ? [present, late, halfday, absent] : [1],
          backgroundColor: hasMarked
            ? ['#10b981', '#f59e0b', '#06b6d4', '#ef4444']
            : ['#e2e8f0'],
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 6,
          cutout: '68%',
        },
      ],
    };
  }, [currentAttendance, totalAtt]);

  const attendanceDoughnutOptions = useMemo(
    () => ({
      plugins: {
        legend: {
          position: 'bottom',
          labels: { usePointStyle: true, padding: 12, font: { size: 11 } },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              if (totalAtt <= 0) return ' 0 Marked';
              return ` ${ctx.label}: ${ctx.raw}`;
            },
          },
        },
      },
    }),
    [totalAtt]
  );

  // ---------------------------------------------------------------------------
  // Fees Calculations & Charts
  // ---------------------------------------------------------------------------
  const feesTotal = Number(stats?.feesSummary?.totalInvoiced || 0);
  const feesPaid = Number(stats?.feesSummary?.totalPaid || 0);
  const feesDue = Number(stats?.feesSummary?.totalDue || 0);
  const feesByClass = stats?.feesSummary?.byClass || [];

  const feeCollectionRate =
    feesTotal > 0 ? Math.round((feesPaid / feesTotal) * 100) : 0;

  const feeDoughnutData = useMemo(() => {
    const hasData = feesPaid > 0 || feesDue > 0;
    return {
      labels: hasData ? ['Collected (₹)', 'Outstanding (₹)'] : ['No Invoices Yet'],
      datasets: [
        {
          data: hasData ? [feesPaid, feesDue] : [1],
          backgroundColor: hasData ? ['#10b981', '#ef4444'] : ['#e2e8f0'],
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 6,
          cutout: '70%',
        },
      ],
    };
  }, [feesPaid, feesDue]);

  const feeDoughnutOptions = useMemo(
    () => ({
      plugins: {
        legend: {
          position: 'bottom',
          labels: { usePointStyle: true, padding: 12, font: { size: 11 } },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              if (feesTotal <= 0) return ' ₹0';
              return ` ${ctx.label}: ${formatINR(ctx.raw)}`;
            },
          },
        },
      },
    }),
    [feesTotal]
  );

  const classFeeBarData = useMemo(() => {
    const hasClasses = Array.isArray(feesByClass) && feesByClass.length > 0;
    if (!hasClasses) {
      return {
        labels: ['Total Invoiced', 'Collected', 'Outstanding'],
        datasets: [
          {
            label: 'Amount (₹)',
            data: [feesTotal, feesPaid, feesDue],
            backgroundColor: ['#3b82f6', '#10b981', '#ef4444'],
            borderRadius: 6,
            maxBarThickness: 40,
          },
        ],
      };
    }

    return {
      labels: feesByClass.map((c) => `Class ${c.class_name || c.className || 'N/A'}`),
      datasets: [
        {
          label: 'Collected (₹)',
          data: feesByClass.map((c) => Number(c.paid || 0)),
          backgroundColor: '#10b981',
          borderRadius: 6,
        },
        {
          label: 'Outstanding (₹)',
          data: feesByClass.map((c) => Number(c.due || 0)),
          backgroundColor: '#ef4444',
          borderRadius: 6,
        },
      ],
    };
  }, [feesByClass, feesTotal, feesPaid, feesDue]);

  const classFeeBarOptions = useMemo(
    () => ({
      plugins: {
        legend: {
          display: Array.isArray(feesByClass) && feesByClass.length > 0,
          position: 'top',
          labels: { usePointStyle: true, font: { size: 11 } },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label || ''}: ${formatINR(ctx.raw)}`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (val) => `₹${Number(val).toLocaleString('en-IN')}`,
          },
          grid: { color: '#f1f5f9' },
        },
        x: {
          grid: { display: false },
        },
      },
    }),
    [feesByClass]
  );

  // Leave request status counts
  const leaveCounts = useMemo(() => {
    const list = stats?.leaveRequests || [];
    return {
      total: list.length,
      pending: list.filter((l) => l.status === 'Pending').length,
      approved: list.filter((l) => l.status === 'Approved').length,
    };
  }, [stats?.leaveRequests]);

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-4">
        <div className="my-auto mb-2">
          <div className="d-flex align-items-center">
            {schoolLogo ? (
              <img
                src={schoolLogo}
                alt="School Logo"
                className="me-3 rounded border"
                style={{ width: '46px', height: '46px', objectFit: 'contain' }}
              />
            ) : (
              <div className="avatar avatar-lg bg-primary-transparent text-primary rounded me-3 d-flex align-items-center justify-content-center fw-bold fs-4">
                {(activeBranchLabel || schoolName || 'B').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <h3 className="page-title mb-0 fw-bold">
                  {isMultiBranch || isBranchView ? 'Branch Dashboard' : 'Admin Dashboard'}
                </h3>
                <span
                  className={`badge ${
                    activeBranchLabel
                      ? 'bg-info-transparent text-info border border-info'
                      : 'bg-success-transparent text-success border border-success'
                  }`}
                >
                  <i className="ti ti-map-pin me-1"></i>
                  {activeBranchLabel
                    ? `Campus: ${activeBranchLabel}${
                        stats?.branchInfo?.branchCode ? ` (${stats.branchInfo.branchCode})` : ''
                      }`
                    : isMultiBranch
                    ? 'All Campuses (Consolidated)'
                    : schoolName || 'Main Campus'}
                </span>
              </div>
              <nav className="mt-1">
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link
                      to={
                        isSchoolSuperAdmin
                          ? '/admin/dashboard?view=branch'
                          : '/admin/dashboard'
                      }
                    >
                      Dashboard
                    </Link>
                  </li>
                  <li className="breadcrumb-item active" aria-current="page">
                    {isMultiBranch || isBranchView ? 'Branch Operations' : 'Admin Dashboard'}
                  </li>
                </ol>
              </nav>
            </div>
          </div>
        </div>

        {/* Header Quick Actions */}
        {isSchoolSuperAdmin && (
          <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
            {isMultiBranch && (
              <Link
                to="/admin/settings/branches"
                className="btn btn-outline-primary btn-sm d-flex align-items-center"
              >
                <i className="ti ti-building-community me-1"></i> Manage Branches
              </Link>
            )}
            <Link
              to="/admin/super-admin/dashboard"
              className="btn btn-primary btn-sm d-flex align-items-center shadow-sm"
            >
              <i className="ti ti-chart-pie me-1"></i> Organization Dashboard
            </Link>
          </div>
        )}
      </div>
      {/* /Page Header */}

      {/* Row 1: 4 Metric Cards (Total Students, Teachers, Staff, Parents) */}
      <div className="row g-3 mb-4">
        {/* Total Students */}
        <div className="col-xxl-3 col-sm-6 d-flex">
          <div className="card flex-fill animate-card border-0 shadow-sm mb-0">
            <Link to="/admin/students" className="text-decoration-none">
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <div className="avatar avatar-lg bg-danger-transparent p-2 rounded d-flex align-items-center justify-content-center">
                    <img
                      src={studentSvg}
                      alt="student"
                      style={{ width: '28px', height: '28px' }}
                    />
                  </div>
                  <span className="badge bg-danger text-white">Students</span>
                </div>
                <h3 className="counter mb-1 text-dark fw-bold">
                  {loading ? '...' : stats?.students?.total ?? 0}
                </h3>
                <p className="text-muted small mb-3">Total Enrolled Students</p>
                <div className="d-flex align-items-center justify-content-between border-top pt-2 small">
                  <span className="text-success fw-semibold">
                    <i className="ti ti-circle-check me-1"></i> Active:{' '}
                    {stats?.students?.active ?? 0}
                  </span>
                  <span className="text-muted">
                    Inactive: {stats?.students?.inactive ?? 0}
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Total Teachers */}
        <div className="col-xxl-3 col-sm-6 d-flex">
          <div className="card flex-fill animate-card border-0 shadow-sm mb-0">
            <Link to="/admin/teachers" className="text-decoration-none">
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <div className="avatar avatar-lg bg-secondary-transparent p-2 rounded d-flex align-items-center justify-content-center">
                    <img
                      src={teacherSvg}
                      alt="teacher"
                      style={{ width: '28px', height: '28px' }}
                    />
                  </div>
                  <span className="badge bg-skyblue text-white">Teachers</span>
                </div>
                <h3 className="counter mb-1 text-dark fw-bold">
                  {loading ? '...' : stats?.teachers?.total ?? 0}
                </h3>
                <p className="text-muted small mb-3">Total Faculty / Teachers</p>
                <div className="d-flex align-items-center justify-content-between border-top pt-2 small">
                  <span className="text-success fw-semibold">
                    <i className="ti ti-circle-check me-1"></i> Active:{' '}
                    {stats?.teachers?.active ?? 0}
                  </span>
                  <span className="text-muted">
                    Inactive: {stats?.teachers?.inactive ?? 0}
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Total Staff */}
        <div className="col-xxl-3 col-sm-6 d-flex">
          <div className="card flex-fill animate-card border-0 shadow-sm mb-0">
            <Link to="/admin/staff" className="text-decoration-none">
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <div className="avatar avatar-lg bg-warning-transparent p-2 rounded d-flex align-items-center justify-content-center">
                    <img
                      src={staffSvg}
                      alt="staff"
                      style={{ width: '28px', height: '28px' }}
                    />
                  </div>
                  <span className="badge bg-warning text-dark">Staff</span>
                </div>
                <h3 className="counter mb-1 text-dark fw-bold">
                  {loading ? '...' : stats?.staff?.total ?? 0}
                </h3>
                <p className="text-muted small mb-3">Total Administrative Staff</p>
                <div className="d-flex align-items-center justify-content-between border-top pt-2 small">
                  <span className="text-success fw-semibold">
                    <i className="ti ti-circle-check me-1"></i> Active:{' '}
                    {stats?.staff?.active ?? 0}
                  </span>
                  <span className="text-muted">
                    Inactive: {stats?.staff?.inactive ?? 0}
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Total Parents */}
        <div className="col-xxl-3 col-sm-6 d-flex">
          <div className="card flex-fill animate-card border-0 shadow-sm mb-0">
            <Link to="/admin/parents" className="text-decoration-none">
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <div className="avatar avatar-lg bg-success-transparent p-2 rounded d-flex align-items-center justify-content-center">
                    <i className="ti ti-users fs-24 text-success"></i>
                  </div>
                  <span className="badge bg-success text-white">Parents</span>
                </div>
                <h3 className="counter mb-1 text-dark fw-bold">
                  {loading ? '...' : stats?.parents?.total ?? 0}
                </h3>
                <p className="text-muted small mb-3">Total Registered Parents</p>
                <div className="d-flex align-items-center justify-content-between border-top pt-2 small">
                  <span className="text-success fw-semibold">
                    <i className="ti ti-circle-check me-1"></i> Active:{' '}
                    {stats?.parents?.active ?? 0}
                  </span>
                  <span className="text-muted">
                    Inactive: {stats?.parents?.inactive ?? 0}
                  </span>
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
            className="card bg-warning-transparent border border-5 border-white animate-card flex-fill text-decoration-none shadow-sm"
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
            to="/admin/announcement/event"
            className="card bg-success-transparent border border-5 border-white animate-card flex-fill text-decoration-none shadow-sm"
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
            to="/admin/announcement/holiday"
            className="card bg-danger-transparent border border-5 border-white animate-card flex-fill text-decoration-none shadow-sm"
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
            className="card bg-secondary-transparent border border-5 border-white animate-card flex-fill text-decoration-none shadow-sm"
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

      {/* Row 3: Visual Analytics — Today's Attendance Doughnut + Fees Collection Charts */}
      <div className="row g-3 mb-4">
        {/* Today's Attendance Doughnut Chart Widget */}
        <div className="col-xxl-4 col-xl-5 col-md-12 d-flex flex-column">
          <div className="card flex-fill border-0 shadow-sm mb-0">
            <div className="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                <i className="ti ti-chart-donut-3 text-primary fs-4 me-2"></i>
                <div>
                  <h5 className="card-title mb-0 fw-bold">Today&apos;s Attendance</h5>
                  <span className="text-muted small">Live daily attendance breakdown</span>
                </div>
              </div>
              <span className="badge bg-primary-transparent text-primary border border-primary">
                {attRate}% Rate
              </span>
            </div>

            <div className="card-body d-flex flex-column justify-content-between">
              {/* Role Filter Pills */}
              <div className="d-flex justify-content-center gap-1 mb-3">
                {[
                  { key: 'students', label: 'Students' },
                  { key: 'teachers', label: 'Teachers' },
                  { key: 'staff', label: 'Staff' },
                  { key: 'all', label: 'All' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`btn btn-sm ${
                      attendanceTab === item.key ? 'btn-primary' : 'btn-light border'
                    } py-1 px-3 fw-medium`}
                    style={{ fontSize: '12px' }}
                    onClick={() => setAttendanceTab(item.key)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Attendance Doughnut Chart */}
              <div className="my-auto py-1">
                <ChartCanvas
                  type="doughnut"
                  data={attendanceDoughnutData}
                  options={attendanceDoughnutOptions}
                  centerText={`${attRate}%`}
                  centerSubtext={`${totalAtt} Marked`}
                  height={210}
                />
              </div>

              {/* 4 Attendance Metric Boxes (Present, Late, Half Day, Absent) */}
              <div className="row g-2 mt-2 pt-2 border-top text-center">
                <div className="col-3">
                  <div className="p-2 rounded bg-success-transparent border border-success">
                    <h6 className="mb-0 fw-bold text-success">
                      {currentAttendance.present}
                    </h6>
                    <span className="text-muted d-block" style={{ fontSize: '11px' }}>
                      Present
                    </span>
                  </div>
                </div>
                <div className="col-3">
                  <div className="p-2 rounded bg-warning-transparent border border-warning">
                    <h6 className="mb-0 fw-bold text-warning">
                      {currentAttendance.late}
                    </h6>
                    <span className="text-muted d-block" style={{ fontSize: '11px' }}>
                      Late
                    </span>
                  </div>
                </div>
                <div className="col-3">
                  <div className="p-2 rounded bg-info-transparent border border-info">
                    <h6 className="mb-0 fw-bold text-info">
                      {currentAttendance.halfday}
                    </h6>
                    <span className="text-muted d-block" style={{ fontSize: '11px' }}>
                      Half Day
                    </span>
                  </div>
                </div>
                <div className="col-3">
                  <div className="p-2 rounded bg-danger-transparent border border-danger">
                    <h6 className="mb-0 fw-bold text-danger">
                      {currentAttendance.absent}
                    </h6>
                    <span className="text-muted d-block" style={{ fontSize: '11px' }}>
                      Absent
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fees Collection & Class-wise Analytics */}
        <div className="col-xxl-8 col-xl-7 col-md-12 d-flex">
          <div className="card flex-fill border-0 shadow-sm mb-0">
            <div className="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div className="d-flex align-items-center">
                <i className="ti ti-chart-bar text-success fs-4 me-2"></i>
                <div>
                  <h5 className="card-title mb-0 fw-bold">Fees Collection Analytics</h5>
                  <span className="text-muted small">
                    Invoiced vs. collected fee revenue across classes
                  </span>
                </div>
              </div>

              {canViewFees && (
                <div className="d-flex align-items-center gap-2">
                  <div className="btn-group btn-group-sm" role="group">
                    <button
                      type="button"
                      className={`btn ${
                        feesViewMode === 'charts' ? 'btn-primary' : 'btn-outline-primary'
                      }`}
                      onClick={() => setFeesViewMode('charts')}
                    >
                      <i className="ti ti-chart-pie me-1"></i>Visual Charts
                    </button>
                    <button
                      type="button"
                      className={`btn ${
                        feesViewMode === 'list' ? 'btn-primary' : 'btn-outline-primary'
                      }`}
                      onClick={() => setFeesViewMode('list')}
                    >
                      <i className="ti ti-list-details me-1"></i>Class Progress
                    </button>
                  </div>
                  <Link
                    to="/admin/fees/dashboard"
                    className="btn btn-outline-secondary btn-sm"
                  >
                    View All &rarr;
                  </Link>
                </div>
              )}
            </div>

            <div className="card-body d-flex flex-column justify-content-between">
              {!canViewFees ? (
                <div className="text-center py-5 text-muted my-auto">
                  <i className="ti ti-lock fs-36 text-warning mb-2 d-block"></i>
                  <h5 className="fw-semibold text-dark mb-1">Permission Required</h5>
                  <p className="mb-0 text-muted fs-14">
                    You do not have permission to view fees collection records.
                  </p>
                </div>
              ) : (
                <>
                  {/* Fee Metric Summary Boxes */}
                  <div className="row g-3 mb-3">
                    <div className="col-md-4">
                      <div className="border rounded p-3 bg-primary-transparent d-flex align-items-center justify-content-between">
                        <div>
                          <p className="text-muted fs-12 mb-1">Total Invoiced</p>
                          <h4 className="fw-bold mb-0 text-primary">
                            {formatINR(feesTotal)}
                          </h4>
                        </div>
                        <span className="avatar avatar-md bg-primary text-white rounded-circle d-flex align-items-center justify-content-center">
                          <i className="ti ti-file-invoice fs-18"></i>
                        </span>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="border rounded p-3 bg-success-transparent d-flex align-items-center justify-content-between">
                        <div>
                          <p className="text-muted fs-12 mb-1">Total Collected</p>
                          <h4 className="fw-bold mb-0 text-success">
                            {formatINR(feesPaid)}
                          </h4>
                        </div>
                        <span className="badge bg-success text-white">
                          {feeCollectionRate}%
                        </span>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="border rounded p-3 bg-danger-transparent d-flex align-items-center justify-content-between">
                        <div>
                          <p className="text-muted fs-12 mb-1">Total Outstanding</p>
                          <h4 className="fw-bold mb-0 text-danger">
                            {formatINR(feesDue)}
                          </h4>
                        </div>
                        <span className="avatar avatar-md bg-danger text-white rounded-circle d-flex align-items-center justify-content-center">
                          <i className="ti ti-alert-circle fs-18"></i>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Toggleable Visual Charts OR Class Breakdown Progress List */}
                  {feesViewMode === 'charts' ? (
                    <div className="row g-3 align-items-center my-auto">
                      <div className="col-lg-5 border-end-lg">
                        <ChartCanvas
                          type="doughnut"
                          data={feeDoughnutData}
                          options={feeDoughnutOptions}
                          centerText={`${feeCollectionRate}%`}
                          centerSubtext="Collected"
                          height={205}
                        />
                      </div>
                      <div className="col-lg-7">
                        <ChartCanvas
                          type="bar"
                          data={classFeeBarData}
                          options={classFeeBarOptions}
                          height={205}
                        />
                      </div>
                    </div>
                  ) : (
                    <div
                      className="row g-2 my-auto"
                      style={{ maxHeight: '215px', overflowY: 'auto' }}
                    >
                      {feesByClass.length > 0 ? (
                        feesByClass.map((cls, idx) => {
                          const clsTotal = Number(cls.total || 0);
                          const clsPaid = Number(cls.paid || 0);
                          const clsDue = Number(cls.due || 0);
                          const clsPct =
                            clsTotal > 0 ? Math.round((clsPaid / clsTotal) * 100) : 0;
                          return (
                            <div className="col-md-6" key={idx}>
                              <div className="p-2 border rounded bg-light-300">
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                  <span className="fw-bold fs-13 text-dark">
                                    Class {cls.class_name || cls.className}
                                  </span>
                                  <span className="badge bg-success-transparent text-success">
                                    {clsPct}% Paid
                                  </span>
                                </div>
                                <div className="d-flex justify-content-between fs-11 text-muted mb-1">
                                  <span>Paid: {formatINR(clsPaid)}</span>
                                  <span>Due: {formatINR(clsDue)}</span>
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
                        <div className="text-center py-4 text-muted">
                          No class-wise fee invoice data available.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Recent Fee Payment Highlight Banner (from stats.recentAlert) */}
                  {stats.recentAlert && (
                    <div className="mt-3 pt-2 border-top">
                      <div className="d-flex align-items-center justify-content-between p-2 rounded bg-light border flex-wrap gap-2">
                        <div className="d-flex align-items-center">
                          <Avatar
                            src={stats.recentAlert.picture}
                            name={stats.recentAlert.studentName}
                            size={36}
                            rounded={true}
                            className="me-2 flex-shrink-0"
                          />
                          <div>
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                              <span className="badge bg-success-transparent text-success border border-success" style={{ fontSize: '10px' }}>
                                Latest Fee Payment
                              </span>
                              <span className="fw-bold text-dark small">
                                {stats.recentAlert.studentName}
                              </span>
                              {stats.recentAlert.className && (
                                <span className="text-muted small">
                                  (Class {stats.recentAlert.className}
                                  {stats.recentAlert.sectionName
                                    ? ` - ${stats.recentAlert.sectionName}`
                                    : ''}
                                  )
                                </span>
                              )}
                            </div>
                            <span className="text-muted d-block" style={{ fontSize: '11px' }}>
                              {stats.recentAlert.invoiceTitle || 'Fee Payment'}
                              {stats.recentAlert.receiptNo
                                ? ` • Receipt: ${stats.recentAlert.receiptNo}`
                                : ''}
                              {stats.recentAlert.paymentDate
                                ? ` • ${stats.recentAlert.paymentDate}`
                                : ''}
                            </span>
                          </div>
                        </div>
                        <div className="text-end">
                          <span className="fw-bold text-success fs-15">
                            +{formatINR(stats.recentAlert.amountPaid)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* /Row 3 */}

      {/* Row 4: Quick Links + Leave Requests */}
      <div className="row g-3 mb-4">
        {/* Quick Links */}
        <div className="col-xxl-6 col-md-12 d-flex flex-column">
          <div className="card flex-fill border-0 shadow-sm mb-0">
            <div className="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                <i className="ti ti-bolt text-primary fs-4 me-2"></i>
                <h5 className="card-title mb-0 fw-bold">Quick Links</h5>
              </div>
              <span className="badge bg-light text-muted border">Shortcuts</span>
            </div>
            <div className="card-body d-flex flex-column justify-content-center">
              <div className="row g-3">
                {[
                  {
                    title: 'Calendar',
                    to: '/admin/reports/calendar-report',
                    icon: 'ti ti-calendar',
                    colorClass: 'bg-success-transparent',
                    borderClass: 'border-success',
                    bgClass: 'bg-success',
                  },
                  {
                    title: 'Fees',
                    to: '/admin/fees/dashboard',
                    icon: 'ti ti-report-money',
                    colorClass: 'bg-secondary-transparent',
                    borderClass: 'border-secondary',
                    bgClass: 'bg-secondary',
                  },
                  {
                    title: 'Routines',
                    to: '/admin/academics/routines',
                    icon: 'ti ti-calendar-time',
                    colorClass: 'bg-primary-transparent',
                    borderClass: 'border-primary',
                    bgClass: 'bg-primary',
                  },
                  {
                    title: 'Home Works',
                    to: '/admin/academics/assignments',
                    icon: 'ti ti-clipboard-list',
                    colorClass: 'bg-danger-transparent',
                    borderClass: 'border-danger',
                    bgClass: 'bg-danger',
                  },
                  {
                    title: 'Attendance',
                    to: '/admin/attendance/student',
                    icon: 'ti ti-user-check',
                    colorClass: 'bg-warning-transparent',
                    borderClass: 'border-warning',
                    bgClass: 'bg-warning',
                  },
                  {
                    title: 'Reports',
                    to: '/admin/reports/class-report',
                    icon: 'ti ti-file-analytics',
                    colorClass: 'bg-skyblue-transparent',
                    borderClass: 'border-skyblue',
                    bgClass: 'bg-skyblue',
                  },
                ].map((item) => (
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

        {/* Leave Requests */}
        <div className="col-xxl-6 col-xl-6 d-flex">
          <div className="card flex-fill border-0 shadow-sm mb-0">
            <div className="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div className="d-flex align-items-center">
                <i className="ti ti-calendar-exclamation text-warning fs-4 me-2"></i>
                <h5 className="card-title mb-0 fw-bold">Leave Requests</h5>
              </div>
              <div className="d-flex align-items-center gap-2">
                {leaveCounts.pending > 0 && (
                  <span className="badge bg-warning-transparent text-warning border border-warning">
                    {leaveCounts.pending} Pending
                  </span>
                )}
                <span className="badge bg-light text-muted border fw-normal">
                  {leaveCounts.total} Recent
                </span>
              </div>
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
                <div className="py-2">
                  <NoData
                    title="No Leave Requests"
                    message="No leave requests found."
                    imageHeight={70}
                    py={2}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* /Row 4 */}

      {/* Row 5: Notice Board + Student Activity */}
      <div className="row g-3">
        {/* Notice Board (Real Database Rows) */}
        <div className="col-xxl-6 col-xl-12 d-flex">
          <div className="card flex-fill border-0 shadow-sm mb-0">
            <div className="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
              <h5 className="card-title mb-0 fw-bold">Notice Board</h5>
              <Link to="/admin/announcement/notice" className="fw-medium fs-13">
                View All &rarr;
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
                      <span className="badge bg-light text-dark border flex-shrink-0">
                        <i className="ti ti-clock me-1"></i>
                        {notice.daysDiff} Days {notice.isFuture ? 'Left' : 'Ago'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-2">
                    <NoData
                      title="No Notices Available"
                      message="No notices available."
                      imageHeight={70}
                      py={2}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Student Activity (Real Database Rows) */}
        <div className="col-xxl-6 col-xl-6 d-flex">
          <div className="card flex-fill border-0 shadow-sm mb-0">
            <div className="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
              <h5 className="card-title mb-0 fw-bold">Student Activity</h5>
              <span className="badge bg-light text-muted border fw-normal">
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
                        {act.description || '-'}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-2">
                  <NoData
                    title="No Student Activity"
                    message="No student activity recorded."
                    imageHeight={70}
                    py={2}
                  />
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
