import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Chart from 'chart.js/auto';
import {
  fetchSuperAdminDashboardApi,
  fetchSuperAdminBranchesApi,
} from '../../../api/superAdmin.api';
import Avatar from '../../../components/common/Avatar';
import { resolveImageUrl } from '../../../utils/url.util';

const formatINR = (val) => {
  const num = Number(val);
  if (isNaN(num)) return '₹0';
  return `₹${num.toLocaleString('en-IN')}`;
};

/**
 * Format bytes strictly into MB so Total - Used = Remaining is never misleadingly rounded
 */
const formatStorageMB = (bytes) => {
  const num = Number(bytes);
  if (!num || num <= 0) return '0.00 MB';
  const mb = num / (1024 * 1024);
  if (mb > 0 && mb < 0.01) {
    return `${mb.toFixed(4)} MB`;
  }
  return `${mb.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} MB`;
};

/**
 * Format exact human-readable unit for secondary tooltip/subtitle (KB / MB / GB)
 */
const formatExactBytes = (bytes) => {
  const num = Number(bytes);
  if (!num || num <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(num) / Math.log(k));
  return `${parseFloat((num / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Reusable Chart.js Canvas Component with optional Doughnut Center Text plugin
 */
const ChartCanvas = ({ type, data, options, centerText, centerSubtext, height = 250 }) => {
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
        const { width, chartArea, ctx: c } = chart;
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

const CATEGORY_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#6366f1', // Indigo
];

const SuperAdminDashboard = () => {
  const { user } = useSelector((state) => state.auth || {});

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [branches, setBranches] = useState([]);
  const [error, setError] = useState(null);

  // Interactive Chart Mode Toggles
  const [financeBarMode, setFinanceBarMode] = useState('cashflow'); // 'cashflow' | 'classwise'
  const [storageChartMode, setStorageChartMode] = useState('categories'); // 'categories' | 'quota'
  const [peopleChartTab, setPeopleChartTab] = useState('demographics'); // 'demographics' | 'attendance'
  const [attendanceFilter, setAttendanceFilter] = useState('all'); // 'all' | 'students' | 'teachers' | 'staff'
  const [branchChartMetric, setBranchChartMetric] = useState('people'); // 'people' | 'finance' | 'storage'

  const isMultiBranch =
    String(
      stats?.school?.registrationType ||
        stats?.school?.registration_type ||
        user?.registrationType ||
        user?.registration_type ||
        ''
    ).toLowerCase() === 'multiple';

  // Load consolidated or branch-filtered organization stats
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const savedBranchId =
        typeof window !== 'undefined' ? localStorage.getItem('active_branch_id') : null;
      const branchQueryParam =
        savedBranchId && savedBranchId !== 'all' && savedBranchId !== '0'
          ? savedBranchId
          : null;

      const statsRes = await fetchSuperAdminDashboardApi(branchQueryParam);
      if (statsRes?.data) {
        setStats(statsRes.data);
      }

      const regType = String(
        statsRes?.data?.school?.registrationType ||
          statsRes?.data?.school?.registration_type ||
          user?.registrationType ||
          user?.registration_type ||
          ''
      ).toLowerCase();

      if (regType === 'multiple') {
        const branchesRes = await fetchSuperAdminBranchesApi();
        if (branchesRes?.data && Array.isArray(branchesRes.data)) {
          setBranches(branchesRes.data);
        }
      } else {
        setBranches([]);
      }
    } catch (err) {
      console.error('Failed to load Super Admin dashboard:', err);
      setError(err?.message || 'Failed to load organization metrics.');
    } finally {
      setLoading(false);
    }
  }, [user?.registrationType, user?.registration_type]);

  useEffect(() => {
    loadData();
    const handleBranchChange = () => {
      loadData();
    };
    window.addEventListener('branch_changed', handleBranchChange);
    return () => {
      window.removeEventListener('branch_changed', handleBranchChange);
    };
  }, [loadData]);

  const school = stats?.school || {};
  const branchesStats = stats?.branches || { total: 0, active: 0, inactive: 0 };
  const students = stats?.students || { total: 0, active: 0, inactive: 0, allowed: 0 };
  const teachers = stats?.teachers || { total: 0, active: 0, inactive: 0 };
  const staff = stats?.staff || { total: 0, active: 0, inactive: 0 };
  const classes = stats?.classes || { total: 0 };
  const fees = stats?.fees || { totalInvoiced: 0, collected: 0, outstanding: 0, byClass: [] };
  const salary = stats?.salary || { basic: 0, deductions: 0, payout: 0, netSalary: 0 };
  const attendance = stats?.attendance || {
    students: { present: 0, absent: 0, late: 0, halfday: 0 },
    teachers: { present: 0, absent: 0, late: 0, halfday: 0 },
    staff: { present: 0, absent: 0, late: 0, halfday: 0 },
  };
  const storage = stats?.storage || {
    usedBytes: 0,
    usedFormatted: '0 B',
    allocatedBytes: 0,
    allocatedFormatted: '0 B',
    availableBytes: 0,
    availableFormatted: '0 B',
    percentage: 0,
    warningLevel: 'normal',
    planName: 'Included Storage',
    categoriesBreakdown: [],
    branchesBreakdown: [],
  };
  const subscription = stats?.subscription || {
    planName: 'No Active Plan',
    planCode: 'N/A',
    billingCycle: 'N/A',
    status: 'inactive',
    daysLeft: 0,
    allowedStudents: 0,
    usedStudents: 0,
    allowedBranches: 0,
    usedBranches: 0,
  };

  // Exact MB Strings for Storage
  const allocatedMBStr = formatStorageMB(storage.allocatedBytes);
  const usedMBStr = formatStorageMB(storage.usedBytes);
  const remainingMBStr = formatStorageMB(storage.availableBytes);

  // Warning banner flags
  const isStorageWarning = storage.warningLevel === 'warning';
  const isStorageCritical = storage.warningLevel === 'critical';
  const isStorageLimitReached = storage.warningLevel === 'limit_reached';

  // Fee Collection Percentage
  const feeCollectionRate =
    fees.totalInvoiced > 0
      ? Math.round((Number(fees.collected || 0) / Number(fees.totalInvoiced)) * 100)
      : 0;

  // ---------------------------------------------------------------------------
  // CHART 1: Fee Collection Status (Doughnut Chart)
  // ---------------------------------------------------------------------------
  const feeDoughnutData = useMemo(() => {
    const collected = Number(fees.collected || 0);
    const outstanding = Number(fees.outstanding || 0);
    const hasData = collected > 0 || outstanding > 0;

    return {
      labels: hasData ? ['Collected Fees (₹)', 'Outstanding Dues (₹)'] : ['No Invoices Yet'],
      datasets: [
        {
          data: hasData ? [collected, outstanding] : [1],
          backgroundColor: hasData ? ['#10b981', '#ef4444'] : ['#e2e8f0'],
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 6,
          cutout: '70%',
        },
      ],
    };
  }, [fees.collected, fees.outstanding]);

  const feeDoughnutOptions = useMemo(
    () => ({
      plugins: {
        legend: {
          position: 'bottom',
          labels: { usePointStyle: true, padding: 16, font: { size: 12 } },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              if (fees.totalInvoiced <= 0) return ' ₹0';
              return ` ${ctx.label}: ${formatINR(ctx.raw)}`;
            },
          },
        },
      },
    }),
    [fees.totalInvoiced]
  );

  // ---------------------------------------------------------------------------
  // CHART 2: Financial Cashflow OR Class-wise Fee Comparison (Bar Chart)
  // ---------------------------------------------------------------------------
  const financeBarData = useMemo(() => {
    if (financeBarMode === 'classwise' && Array.isArray(fees.byClass) && fees.byClass.length > 0) {
      return {
        labels: fees.byClass.map((c) => `Class ${c.className}`),
        datasets: [
          {
            label: 'Collected (₹)',
            data: fees.byClass.map((c) => c.paid),
            backgroundColor: '#10b981',
            borderRadius: 6,
          },
          {
            label: 'Outstanding (₹)',
            data: fees.byClass.map((c) => c.due),
            backgroundColor: '#ef4444',
            borderRadius: 6,
          },
        ],
      };
    }

    return {
      labels: ['Total Invoiced', 'Fees Collected', 'Outstanding Dues', 'Basic Payroll', 'Net Salary Payout'],
      datasets: [
        {
          label: 'Amount (₹)',
          data: [
            Number(fees.totalInvoiced || 0),
            Number(fees.collected || 0),
            Number(fees.outstanding || 0),
            Number(salary.basic || 0),
            Number(salary.payout || 0),
          ],
          backgroundColor: ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6'],
          borderRadius: 6,
          maxBarThickness: 44,
        },
      ],
    };
  }, [financeBarMode, fees.byClass, fees.totalInvoiced, fees.collected, fees.outstanding, salary.basic, salary.payout]);

  const financeBarOptions = useMemo(
    () => ({
      plugins: {
        legend: {
          display: financeBarMode === 'classwise',
          position: 'top',
          labels: { usePointStyle: true, font: { size: 12 } },
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
    [financeBarMode]
  );

  // ---------------------------------------------------------------------------
  // CHART 3: Cloud Storage Breakdown (Categories Pie OR Used vs Remaining MB Doughnut)
  // ---------------------------------------------------------------------------
  const storageChartData = useMemo(() => {
    const categories = storage.categoriesBreakdown || [];
    if (storageChartMode === 'categories' && categories.length > 0) {
      return {
        labels: categories.map((c) => `${c.label} (${c.mbFormatted || formatStorageMB(c.bytes)})`),
        datasets: [
          {
            data: categories.map((c) => Number((c.bytes / (1024 * 1024)).toFixed(4))),
            backgroundColor: categories.map((_, i) => CATEGORY_COLORS[i % CATEGORY_COLORS.length]),
            borderWidth: 2,
            borderColor: '#ffffff',
            hoverOffset: 6,
            cutout: '62%',
          },
        ],
      };
    }

    const usedMB = Number((storage.usedBytes / (1024 * 1024)).toFixed(4));
    const availMB = Number((storage.availableBytes / (1024 * 1024)).toFixed(4));
    const hasAllocation = usedMB > 0 || availMB > 0;
    // Ensure a tiny slice is still visible on the ring when usedMB > 0 but very small compared to 56,320 MB
    const visualUsedMB =
      usedMB > 0 && availMB > 0 && usedMB / (usedMB + availMB) < 0.015
        ? Number(((usedMB + availMB) * 0.015).toFixed(2))
        : usedMB;

    return {
      labels: [`Used (${usedMBStr})`, `Remaining (${remainingMBStr})`],
      datasets: [
        {
          data: hasAllocation ? [visualUsedMB, availMB] : [0, 1],
          backgroundColor: ['#3b82f6', '#10b981'],
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 6,
          cutout: '68%',
        },
      ],
    };
  }, [storageChartMode, storage.categoriesBreakdown, storage.usedBytes, storage.availableBytes, usedMBStr, remainingMBStr]);

  const storageChartOptions = useMemo(
    () => ({
      plugins: {
        legend: {
          position: 'bottom',
          labels: { usePointStyle: true, padding: 12, font: { size: 11 } },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              if (storageChartMode === 'categories' && (storage.categoriesBreakdown || []).length > 0) {
                const cat = storage.categoriesBreakdown[ctx.dataIndex];
                if (cat) {
                  return ` ${cat.label}: ${formatStorageMB(cat.bytes)} (${cat.formatted}, ${cat.fileCount} files)`;
                }
              }
              if (ctx.dataIndex === 0) {
                return ` Used: ${usedMBStr} (${storage.usedFormatted})`;
              }
              return ` Remaining: ${remainingMBStr} (${storage.availableFormatted})`;
            },
          },
        },
      },
    }),
    [storageChartMode, storage.categoriesBreakdown, usedMBStr, remainingMBStr, storage.usedFormatted, storage.availableFormatted]
  );

  // ---------------------------------------------------------------------------
  // CHART 4: Organization People & Today's Attendance (Pie / Doughnut Chart)
  // ---------------------------------------------------------------------------
  const currentAttendanceStats = useMemo(() => {
    if (attendanceFilter === 'students') return attendance.students || { present: 0, absent: 0, late: 0, halfday: 0 };
    if (attendanceFilter === 'teachers') return attendance.teachers || { present: 0, absent: 0, late: 0, halfday: 0 };
    if (attendanceFilter === 'staff') return attendance.staff || { present: 0, absent: 0, late: 0, halfday: 0 };
    return {
      present:
        Number(attendance.students?.present || 0) +
        Number(attendance.teachers?.present || 0) +
        Number(attendance.staff?.present || 0),
      absent:
        Number(attendance.students?.absent || 0) +
        Number(attendance.teachers?.absent || 0) +
        Number(attendance.staff?.absent || 0),
      late:
        Number(attendance.students?.late || 0) +
        Number(attendance.teachers?.late || 0) +
        Number(attendance.staff?.late || 0),
      halfday:
        Number(attendance.students?.halfday || 0) +
        Number(attendance.teachers?.halfday || 0) +
        Number(attendance.staff?.halfday || 0),
    };
  }, [attendance, attendanceFilter]);

  const peopleOrAttendanceData = useMemo(() => {
    if (peopleChartTab === 'attendance') {
      const { present, late, halfday, absent } = currentAttendanceStats;
      const totalMarked = present + late + halfday + absent;
      return {
        labels: totalMarked > 0 ? ['Present', 'Late', 'Half Day', 'Absent'] : ['No Attendance Marked Today'],
        datasets: [
          {
            data: totalMarked > 0 ? [present, late, halfday, absent] : [1],
            backgroundColor: totalMarked > 0 ? ['#10b981', '#f59e0b', '#06b6d4', '#ef4444'] : ['#e2e8f0'],
            borderWidth: 2,
            borderColor: '#ffffff',
            hoverOffset: 6,
            cutout: '66%',
          },
        ],
      };
    }

    const totalPeople = Number(students.total || 0) + Number(teachers.total || 0) + Number(staff.total || 0);
    return {
      labels:
        totalPeople > 0
          ? ['Active Students', 'Inactive Students', 'Teachers / Faculty', 'Admin & Support Staff']
          : ['No Members Added'],
      datasets: [
        {
          data:
            totalPeople > 0
              ? [
                  Number(students.active || 0),
                  Number(students.inactive || 0),
                  Number(teachers.total || 0),
                  Number(staff.total || 0),
                ]
              : [1],
          backgroundColor: totalPeople > 0 ? ['#06b6d4', '#94a3b8', '#f59e0b', '#6366f1'] : ['#e2e8f0'],
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 6,
          cutout: '66%',
        },
      ],
    };
  }, [peopleChartTab, currentAttendanceStats, students.active, students.inactive, students.total, teachers.total, staff.total]);

  const peopleCenterLabel = useMemo(() => {
    if (peopleChartTab === 'attendance') {
      const { present, late, halfday, absent } = currentAttendanceStats;
      const total = present + late + halfday + absent;
      const pct = total > 0 ? Math.round(((present + late + halfday) / total) * 100) : 0;
      return { text: `${pct}%`, sub: `${total} Marked` };
    }
    const totalPeople = Number(students.total || 0) + Number(teachers.total || 0) + Number(staff.total || 0);
    return { text: `${totalPeople}`, sub: 'Total Members' };
  }, [peopleChartTab, currentAttendanceStats, students.total, teachers.total, staff.total]);

  // ---------------------------------------------------------------------------
  // CHART 5: Multi-Branch Comparison Bar Chart (Multi-Branch Only)
  // ---------------------------------------------------------------------------
  const branchComparisonBarData = useMemo(() => {
    const labels = branches.map((b) => b.branchName);
    if (branchChartMetric === 'finance') {
      return {
        labels,
        datasets: [
          {
            label: 'Fees Collected (₹)',
            data: branches.map((b) => Number(b.feesCollected || 0)),
            backgroundColor: '#10b981',
            borderRadius: 6,
          },
          {
            label: 'Outstanding Dues (₹)',
            data: branches.map((b) => Number(b.feesOutstanding || 0)),
            backgroundColor: '#ef4444',
            borderRadius: 6,
          },
          {
            label: 'Salary Payout (₹)',
            data: branches.map((b) => Number(b.salaryPayout || 0)),
            backgroundColor: '#8b5cf6',
            borderRadius: 6,
          },
        ],
      };
    }

    if (branchChartMetric === 'storage') {
      return {
        labels,
        datasets: [
          {
            label: 'Storage Used (MB)',
            data: branches.map((b) => Number(((b.storageBytes || 0) / (1024 * 1024)).toFixed(4))),
            backgroundColor: '#3b82f6',
            borderRadius: 6,
            maxBarThickness: 48,
          },
        ],
      };
    }

    return {
      labels,
      datasets: [
        {
          label: 'Students',
          data: branches.map((b) => Number(b.studentsCount || 0)),
          backgroundColor: '#06b6d4',
          borderRadius: 6,
        },
        {
          label: 'Teachers',
          data: branches.map((b) => Number(b.teachersCount || 0)),
          backgroundColor: '#f59e0b',
          borderRadius: 6,
        },
        {
          label: 'Staff',
          data: branches.map((b) => Number(b.staffCount || 0)),
          backgroundColor: '#6366f1',
          borderRadius: 6,
        },
      ],
    };
  }, [branches, branchChartMetric]);

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-4">
        <div className="my-auto mb-2">
          <div className="d-flex align-items-center">
            {school.logo ? (
              <img
                src={resolveImageUrl(school.logo)}
                alt="School Logo"
                className="me-3 rounded border"
                style={{ width: '48px', height: '48px', objectFit: 'contain' }}
              />
            ) : (
              <div className="avatar avatar-lg bg-primary-transparent text-primary rounded me-3 d-flex align-items-center justify-content-center fw-bold fs-4">
                {(school.name || 'S').charAt(0)}
              </div>
            )}
            <div>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <h3 className="page-title mb-0 fw-bold">{school.name || 'Organization Dashboard'}</h3>
                <span className="badge bg-primary-transparent text-primary border border-primary">
                  {isMultiBranch ? 'Multi-Branch Super Admin' : 'Organization Super Admin'}
                </span>
                {school.code && (
                  <span className="badge bg-light text-secondary border">
                    Code: {school.code}
                  </span>
                )}
                {isMultiBranch && (
                  <span
                    className={`badge ${
                      stats?.filter?.isFiltered
                        ? 'bg-info-transparent text-info border border-info'
                        : 'bg-success-transparent text-success border border-success'
                    }`}
                  >
                    <i className="ti ti-map-pin me-1"></i>
                    {stats?.filter?.isFiltered
                      ? `Campus: ${stats.filter.branchName || `#${stats.filter.branchId}`}`
                      : 'All Campuses (Consolidated)'}
                  </span>
                )}
              </div>
              <nav className="mt-1">
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to="/admin/super-admin/dashboard">Organization</Link>
                  </li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Super Admin Dashboard
                  </li>
                </ol>
              </nav>
            </div>
          </div>
        </div>

        {/* Actions */}
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
            to="/admin/subscription"
            className="btn btn-primary btn-sm d-flex align-items-center shadow-sm"
          >
            <i className="ti ti-crown me-1"></i> Subscription & Storage
          </Link>
        </div>
      </div>

      {/* Storage Alert Banners (Threshold based: 75% warning, 90% critical, 100% limit reached) */}
      {isStorageLimitReached && (
        <div className="alert alert-danger border-danger d-flex align-items-center justify-content-between mb-4 shadow-sm" role="alert">
          <div className="d-flex align-items-center">
            <i className="ti ti-alert-triangle fs-2 text-danger me-3"></i>
            <div>
              <h5 className="alert-heading fw-bold mb-1">Storage Limit Reached ({storage.percentage}%)</h5>
              <p className="mb-0">
                Your organization has consumed <strong>{usedMBStr} ({storage.usedFormatted})</strong> of your <strong>{allocatedMBStr} ({storage.allocatedFormatted})</strong> storage plan. New file uploads are blocked.
              </p>
            </div>
          </div>
          <Link to="/admin/subscription" className="btn btn-danger btn-sm text-nowrap ms-3">
            Upgrade Storage Now
          </Link>
        </div>
      )}

      {isStorageCritical && (
        <div className="alert alert-warning border-warning d-flex align-items-center justify-content-between mb-4 shadow-sm" role="alert">
          <div className="d-flex align-items-center">
            <i className="ti ti-alert-circle fs-2 text-warning me-3"></i>
            <div>
              <h5 className="alert-heading fw-bold mb-1">Critical Storage Warning ({storage.percentage}%)</h5>
              <p className="mb-0">
                Your organization is approaching its storage limit (<strong>{usedMBStr}</strong> used of <strong>{allocatedMBStr}</strong>). Please upgrade your storage capacity to prevent interruptions.
              </p>
            </div>
          </div>
          <Link to="/admin/subscription" className="btn btn-warning btn-sm text-nowrap ms-3 text-dark fw-semibold">
            Upgrade Storage
          </Link>
        </div>
      )}

      {isStorageWarning && (
        <div className="alert alert-info border-info d-flex align-items-center justify-content-between mb-4 shadow-sm" role="alert">
          <div className="d-flex align-items-center">
            <i className="ti ti-info-circle fs-2 text-info me-3"></i>
            <div>
              <h6 className="alert-heading fw-bold mb-1">Storage Usage Notice ({storage.percentage}%)</h6>
              <p className="mb-0 small">
                Your organization has used {usedMBStr} ({storage.usedFormatted}) of {allocatedMBStr} ({storage.allocatedFormatted}) allocated storage.
              </p>
            </div>
          </div>
          <Link to="/admin/subscription" className="btn btn-outline-info btn-sm text-nowrap ms-3">
            Expand Storage
          </Link>
        </div>
      )}

      {error && (
        <div className="alert alert-danger mb-4 shadow-sm">
          <i className="ti ti-alert-circle me-2"></i>
          {error}
        </div>
      )}

      {/* Row 1: Top KPI Cards (Branches/Classes, Students, Teachers, Staff) */}
      <div className="row g-3 mb-4">
        {isMultiBranch ? (
          <div className="col-xxl-3 col-md-6 d-flex">
            <div className="card flex-fill border-0 shadow-sm">
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <div className="avatar avatar-md bg-primary-transparent text-primary rounded p-2">
                    <i className="ti ti-building-community fs-3"></i>
                  </div>
                  <span className="badge bg-primary text-white">Campuses</span>
                </div>
                <h3 className="fw-bold mb-1 text-dark">
                  {loading ? '...' : branchesStats.total}
                </h3>
                <p className="text-muted small mb-3">Total Registered Branches</p>
                <div className="d-flex align-items-center justify-content-between border-top pt-2 small">
                  <span className="text-success fw-semibold">
                    <i className="ti ti-circle-check me-1"></i> Active: {branchesStats.active}
                  </span>
                  <span className="text-muted">
                    Inactive: {branchesStats.inactive}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="col-xxl-3 col-md-6 d-flex">
            <div className="card flex-fill border-0 shadow-sm">
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <div className="avatar avatar-md bg-primary-transparent text-primary rounded p-2">
                    <i className="ti ti-chalkboard fs-3"></i>
                  </div>
                  <span className="badge bg-primary text-white">Academics</span>
                </div>
                <h3 className="fw-bold mb-1 text-dark">
                  {loading ? '...' : classes.total}
                </h3>
                <p className="text-muted small mb-3">Total Active Classes</p>
                <div className="d-flex align-items-center justify-content-between border-top pt-2 small">
                  <span className="text-success fw-semibold">
                    <i className="ti ti-circle-check me-1"></i> Single Campus
                  </span>
                  <span className="text-muted">
                    {school.code || 'Main'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Total Students */}
        <div className="col-xxl-3 col-md-6 d-flex">
          <div className="card flex-fill border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="avatar avatar-md bg-info-transparent text-info rounded p-2">
                  <i className="ti ti-school fs-3"></i>
                </div>
                <span className="badge bg-info text-white">Students</span>
              </div>
              <h3 className="fw-bold mb-1 text-dark">
                {loading ? '...' : students.total}
              </h3>
              <p className="text-muted small mb-3">Total Enrolled Students</p>
              <div className="d-flex align-items-center justify-content-between border-top pt-2 small">
                <span className="text-success fw-semibold">
                  <i className="ti ti-circle-check me-1"></i> Active: {students.active}
                </span>
                <span className="text-muted">
                  Capacity: {students.allowed > 0 ? students.allowed : 'Unlimited'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Total Teachers */}
        <div className="col-xxl-3 col-md-6 d-flex">
          <div className="card flex-fill border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="avatar avatar-md bg-warning-transparent text-warning rounded p-2">
                  <i className="ti ti-users fs-3"></i>
                </div>
                <span className="badge bg-warning text-dark">Faculty</span>
              </div>
              <h3 className="fw-bold mb-1 text-dark">
                {loading ? '...' : teachers.total}
              </h3>
              <p className="text-muted small mb-3">Total Faculty / Teachers</p>
              <div className="d-flex align-items-center justify-content-between border-top pt-2 small">
                <span className="text-success fw-semibold">
                  <i className="ti ti-circle-check me-1"></i> Active: {teachers.active}
                </span>
                <span className="text-muted">
                  Inactive: {teachers.inactive}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Total Staff */}
        <div className="col-xxl-3 col-md-6 d-flex">
          <div className="card flex-fill border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="avatar avatar-md bg-secondary-transparent text-secondary rounded p-2">
                  <i className="ti ti-user-check fs-3"></i>
                </div>
                <span className="badge bg-secondary text-white">Staff</span>
              </div>
              <h3 className="fw-bold mb-1 text-dark">
                {loading ? '...' : staff.total}
              </h3>
              <p className="text-muted small mb-3">Total Administrative Staff</p>
              <div className="d-flex align-items-center justify-content-between border-top pt-2 small">
                <span className="text-success fw-semibold">
                  <i className="ti ti-circle-check me-1"></i> Active: {staff.active}
                </span>
                <span className="text-muted">
                  Classes: {classes.total}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Visual Financial Analytics (Pie/Doughnut Chart + Cashflow/Class Bar Chart) */}
      <div className="row g-3 mb-4">
        {/* Fee Collection Status Pie / Doughnut Chart */}
        <div className="col-xxl-4 col-lg-5 d-flex">
          <div className="card flex-fill border-0 shadow-sm">
            <div className="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                <i className="ti ti-chart-donut-3 text-success fs-4 me-2"></i>
                <h5 className="card-title mb-0 fw-bold">Fee Collection Ratio</h5>
              </div>
              <span className="badge bg-success-transparent text-success border border-success">
                {feeCollectionRate}% Collected
              </span>
            </div>
            <div className="card-body d-flex flex-column justify-content-between">
              <div className="my-auto py-2">
                <ChartCanvas
                  type="doughnut"
                  data={feeDoughnutData}
                  options={feeDoughnutOptions}
                  centerText={`${feeCollectionRate}%`}
                  centerSubtext="Collection Rate"
                  height={220}
                />
              </div>

              <div className="row g-2 mt-2 pt-2 border-top text-center">
                <div className="col-4">
                  <div className="p-2 rounded bg-light">
                    <span className="text-muted d-block" style={{ fontSize: '11px' }}>Invoiced</span>
                    <span className="fw-bold text-primary small">{formatINR(fees.totalInvoiced)}</span>
                  </div>
                </div>
                <div className="col-4">
                  <div className="p-2 rounded bg-light">
                    <span className="text-muted d-block" style={{ fontSize: '11px' }}>Collected</span>
                    <span className="fw-bold text-success small">{formatINR(fees.collected)}</span>
                  </div>
                </div>
                <div className="col-4">
                  <div className="p-2 rounded bg-light">
                    <span className="text-muted d-block" style={{ fontSize: '11px' }}>Pending</span>
                    <span className="fw-bold text-danger small">{formatINR(fees.outstanding)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Cashflow & Class-Wise Fee Bar Chart */}
        <div className="col-xxl-8 col-lg-7 d-flex">
          <div className="card flex-fill border-0 shadow-sm">
            <div className="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div className="d-flex align-items-center">
                <i className="ti ti-chart-bar text-primary fs-4 me-2"></i>
                <div>
                  <h5 className="card-title mb-0 fw-bold">Financial & Payroll Analytics</h5>
                  <p className="text-muted small mb-0">
                    Compare fee revenue against outstanding dues and staff salary payout
                  </p>
                </div>
              </div>

              <div className="btn-group btn-group-sm" role="group">
                <button
                  type="button"
                  className={`btn ${financeBarMode === 'cashflow' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setFinanceBarMode('cashflow')}
                >
                  Revenue vs Payroll
                </button>
                <button
                  type="button"
                  className={`btn ${financeBarMode === 'classwise' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setFinanceBarMode('classwise')}
                  disabled={!fees.byClass || fees.byClass.length === 0}
                >
                  Class-wise Fees
                </button>
              </div>
            </div>

            <div className="card-body">
              <ChartCanvas
                type="bar"
                data={financeBarData}
                options={financeBarOptions}
                height={240}
              />

              <div className="row g-2 mt-3 pt-2 border-top">
                <div className="col-sm-4">
                  <div className="d-flex align-items-center justify-content-between p-2 rounded bg-light small">
                    <span className="text-muted">Basic Salary:</span>
                    <span className="fw-bold text-dark">{formatINR(salary.basic)}</span>
                  </div>
                </div>
                <div className="col-sm-4">
                  <div className="d-flex align-items-center justify-content-between p-2 rounded bg-light small">
                    <span className="text-muted">Deductions:</span>
                    <span className="fw-bold text-secondary">{formatINR(salary.deductions)}</span>
                  </div>
                </div>
                <div className="col-sm-4">
                  <div className="d-flex align-items-center justify-content-between p-2 rounded bg-danger-transparent small">
                    <span className="text-danger fw-semibold">Net Salary Payout:</span>
                    <span className="fw-bold text-danger">{formatINR(salary.payout)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Cloud Storage Pie/Doughnut (in MB) + People & Attendance Pie Chart */}
      <div className="row g-3 mb-4">
        {/* Cloud Storage Analytics Card (Strictly in MB) */}
        <div className="col-xxl-6 col-lg-6 d-flex">
          <div className="card flex-fill border-0 shadow-sm">
            <div className="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div className="d-flex align-items-center">
                <i className="ti ti-cloud-computing text-primary fs-3 me-2"></i>
                <div>
                  <h5 className="card-title mb-0 fw-bold">Cloud Storage Analytics (MB)</h5>
                  <span className="text-muted small">{storage.planName}</span>
                </div>
              </div>

              <div className="btn-group btn-group-sm" role="group">
                <button
                  type="button"
                  className={`btn ${storageChartMode === 'categories' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setStorageChartMode('categories')}
                >
                  By File Category
                </button>
                <button
                  type="button"
                  className={`btn ${storageChartMode === 'quota' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setStorageChartMode('quota')}
                >
                  Used vs Remaining
                </button>
              </div>
            </div>

            <div className="card-body">
              {/* Storage Segments in MB so 55 GB - 12 KB is accurately shown in MB */}
              <div className="row g-2 mb-3">
                <div className="col-sm-4">
                  <div className="text-center p-2 border rounded bg-light h-100">
                    <span className="text-muted small d-block">Total Allocation</span>
                    <h5 className="fw-bold text-dark mb-0">{allocatedMBStr}</h5>
                    <span className="text-muted" style={{ fontSize: '11px' }}>
                      ({storage.allocatedFormatted})
                    </span>
                  </div>
                </div>
                <div className="col-sm-4">
                  <div className="text-center p-2 border rounded bg-primary-transparent h-100">
                    <span className="text-muted small d-block">Total Used</span>
                    <h5 className="fw-bold text-primary mb-0">{usedMBStr}</h5>
                    <span className="text-primary" style={{ fontSize: '11px' }}>
                      ({formatExactBytes(storage.usedBytes)})
                    </span>
                  </div>
                </div>
                <div className="col-sm-4">
                  <div className="text-center p-2 border rounded bg-success-transparent h-100">
                    <span className="text-muted small d-block">Remaining Space</span>
                    <h5 className="fw-bold text-success mb-0">{remainingMBStr}</h5>
                    <span className="text-success" style={{ fontSize: '11px' }}>
                      ({ (100 - Number(storage.percentage || 0)).toFixed(2) }% Free)
                    </span>
                  </div>
                </div>
              </div>

              {/* Storage Doughnut / Pie Chart */}
              <div className="row align-items-center g-3">
                <div className="col-md-6">
                  <ChartCanvas
                    type="doughnut"
                    data={storageChartData}
                    options={storageChartOptions}
                    centerText={usedMBStr}
                    centerSubtext={`of ${allocatedMBStr}`}
                    height={210}
                  />
                </div>
                <div className="col-md-6">
                  <h6 className="fw-bold text-dark small text-uppercase mb-2">
                    Category Breakdown (MB)
                  </h6>
                  {storage.categoriesBreakdown && storage.categoriesBreakdown.length > 0 ? (
                    <div style={{ maxHeight: '185px', overflowY: 'auto' }}>
                      {storage.categoriesBreakdown.map((cat, idx) => (
                        <div
                          key={cat.category}
                          className="d-flex align-items-center justify-content-between py-1 border-bottom small"
                        >
                          <div className="d-flex align-items-center text-truncate me-2">
                            <span
                              className="rounded-circle me-2 flex-shrink-0"
                              style={{
                                width: '10px',
                                height: '10px',
                                backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
                              }}
                            ></span>
                            <span className="text-dark fw-medium text-truncate" title={cat.label}>
                              {cat.label}
                            </span>
                          </div>
                          <div className="text-end flex-shrink-0">
                            <span className="fw-bold text-dark">
                              {cat.mbFormatted || formatStorageMB(cat.bytes)}
                            </span>
                            <span className="text-muted ms-1" style={{ fontSize: '11px' }}>
                              ({cat.fileCount})
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 rounded bg-light text-center text-muted small">
                      No files uploaded to cloud storage yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="card-footer bg-white border-top py-2 d-flex justify-content-between align-items-center small text-muted">
              <span>Thresholds: 75% Warning &bull; 90% Critical</span>
              <span className="fw-semibold text-dark">Usage: {storage.percentage}%</span>
            </div>
          </div>
        </div>

        {/* Organization Demographics & Today's Live Attendance Pie Chart + Subscription Card */}
        <div className="col-xxl-6 col-lg-6 d-flex flex-column gap-3">
          <div className="card flex-fill border-0 shadow-sm mb-0">
            <div className="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div className="d-flex align-items-center">
                <i className="ti ti-chart-pie text-info fs-3 me-2"></i>
                <div>
                  <h5 className="card-title mb-0 fw-bold">
                    {peopleChartTab === 'demographics'
                      ? 'Organization Distribution'
                      : "Today's Live Attendance"}
                  </h5>
                  <span className="text-muted small">
                    {peopleChartTab === 'demographics'
                      ? 'Students, Faculty & Administrative Staff'
                      : 'Real-time Present vs Absent breakdown'}
                  </span>
                </div>
              </div>

              <div className="btn-group btn-group-sm" role="group">
                <button
                  type="button"
                  className={`btn ${peopleChartTab === 'demographics' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setPeopleChartTab('demographics')}
                >
                  Demographics
                </button>
                <button
                  type="button"
                  className={`btn ${peopleChartTab === 'attendance' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setPeopleChartTab('attendance')}
                >
                  Today's Attendance
                </button>
              </div>
            </div>

            <div className="card-body">
              {peopleChartTab === 'attendance' && (
                <div className="d-flex justify-content-center gap-1 mb-2">
                  {['all', 'students', 'teachers', 'staff'].map((tabKey) => (
                    <button
                      key={tabKey}
                      type="button"
                      className={`btn btn-xs ${
                        attendanceFilter === tabKey ? 'btn-dark' : 'btn-light border'
                      } text-capitalize py-1 px-2`}
                      style={{ fontSize: '11px' }}
                      onClick={() => setAttendanceFilter(tabKey)}
                    >
                      {tabKey === 'all' ? 'All Members' : tabKey}
                    </button>
                  ))}
                </div>
              )}

              <ChartCanvas
                type="doughnut"
                data={peopleOrAttendanceData}
                options={{
                  plugins: {
                    legend: {
                      position: 'right',
                      labels: { usePointStyle: true, padding: 14, font: { size: 12 } },
                    },
                  },
                }}
                centerText={peopleCenterLabel.text}
                centerSubtext={peopleCenterLabel.sub}
                height={195}
              />

              {/* Subscription Summary Bar inside right column */}
              <div className="mt-3 pt-3 border-top">
                <div className="d-flex align-items-center justify-content-between p-2 rounded bg-light border">
                  <div className="d-flex align-items-center">
                    <i className="ti ti-crown text-warning fs-3 me-2"></i>
                    <div>
                      <span className="fw-bold text-dark d-block small">
                        {subscription.planName}{' '}
                        <span
                          className={`badge ms-1 ${
                            subscription.status === 'active'
                              ? 'bg-success'
                              : subscription.status === 'trial'
                              ? 'bg-info'
                              : 'bg-secondary'
                          }`}
                        >
                          {String(subscription.status || 'inactive').toUpperCase()}
                        </span>
                      </span>
                      <span className="text-muted" style={{ fontSize: '11px' }}>
                        Cycle: <strong className="text-capitalize">{subscription.billingCycle}</strong>
                        {subscription.endDate ? ` • Ends: ${subscription.endDate}` : ''}
                      </span>
                    </div>
                  </div>
                  <div className="text-end">
                    <span className="badge bg-warning text-dark fw-semibold">
                      {subscription.daysLeft} Days Left
                    </span>
                    <span className="d-block text-muted mt-1" style={{ fontSize: '11px' }}>
                      Seats: {students.total} / {subscription.allowedStudents > 0 ? subscription.allowedStudents : 'Unlimited'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Multi-Branch Visual Comparison Chart & Directory Table (Multi-Branch Only) */}
      {isMultiBranch && (
        <>
          {branches.length > 0 && (
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
                <div className="d-flex align-items-center">
                  <i className="ti ti-chart-histogram text-primary fs-3 me-2"></i>
                  <div>
                    <h5 className="card-title mb-0 fw-bold">Campus Comparison Chart</h5>
                    <p className="text-muted small mb-0">
                      Side-by-side visual comparison across all registered branches
                    </p>
                  </div>
                </div>

                <div className="btn-group btn-group-sm" role="group">
                  <button
                    type="button"
                    className={`btn ${branchChartMetric === 'people' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setBranchChartMetric('people')}
                  >
                    Students & Staff
                  </button>
                  <button
                    type="button"
                    className={`btn ${branchChartMetric === 'finance' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setBranchChartMetric('finance')}
                  >
                    Fees & Payroll (₹)
                  </button>
                  <button
                    type="button"
                    className={`btn ${branchChartMetric === 'storage' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setBranchChartMetric('storage')}
                  >
                    Storage (MB)
                  </button>
                </div>
              </div>
              <div className="card-body">
                <ChartCanvas
                  type="bar"
                  data={branchComparisonBarData}
                  options={{
                    plugins: {
                      legend: { position: 'top', labels: { usePointStyle: true } },
                    },
                    scales: {
                      y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                      x: { grid: { display: false } },
                    },
                  }}
                  height={230}
                />
              </div>
            </div>
          )}

          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div className="d-flex align-items-center">
                <i className="ti ti-layout-grid text-primary fs-3 me-2"></i>
                <div>
                  <h5 className="card-title mb-0 fw-bold">Branch Performance Overview</h5>
                  <p className="text-muted small mb-0">
                    Consolidated real-time operational, academic, and financial metrics per campus
                  </p>
                </div>
              </div>
              <Link to="/admin/settings/branches" className="btn btn-outline-primary btn-sm">
                <i className="ti ti-plus me-1"></i> Add Campus / Branch
              </Link>
            </div>

            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr className="small text-muted text-uppercase">
                      <th>Branch / Campus</th>
                      <th>Campus Head / Principal</th>
                      <th className="text-center">Students</th>
                      <th className="text-center">Teachers</th>
                      <th className="text-center">Staff</th>
                      <th className="text-end">Fees Collected</th>
                      <th className="text-end">Outstanding</th>
                      <th className="text-end">Salary Payout</th>
                      <th className="text-center">Storage (MB)</th>
                      <th className="text-center">Status</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="11" className="text-center py-4 text-muted">
                          <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                          Loading branch performance data...
                        </td>
                      </tr>
                    ) : branches.length === 0 ? (
                      <tr>
                        <td colSpan="11" className="text-center py-4 text-muted">
                          No branches found for this organization.
                        </td>
                      </tr>
                    ) : (
                      branches.map((b) => (
                        <tr key={b.id}>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="avatar avatar-sm bg-light text-primary rounded me-2 d-flex align-items-center justify-content-center fw-bold">
                                {b.branchName.charAt(0)}
                              </div>
                              <div>
                                <span className="fw-bold text-dark d-block">
                                  {b.branchName}
                                </span>
                                <span className="small text-muted">
                                  {b.branchCode}
                                  {b.isMainBranch && (
                                    <span className="badge bg-primary-transparent text-primary ms-1">
                                      Main Campus
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <Avatar
                                src={b.headPicture}
                                name={b.principalName}
                                size={32}
                                className="me-2"
                              />
                              <div>
                                <span className="small fw-semibold text-dark d-block">
                                  {b.principalName}
                                </span>
                                <span className="small text-muted">{b.headEmail || b.headPhone || ''}</span>
                              </div>
                            </div>
                          </td>
                          <td className="text-center fw-bold text-dark">
                            {b.studentsCount}
                          </td>
                          <td className="text-center fw-semibold text-dark">
                            {b.teachersCount}
                          </td>
                          <td className="text-center fw-semibold text-dark">
                            {b.staffCount}
                          </td>
                          <td className="text-end fw-bold text-success">
                            {formatINR(b.feesCollected)}
                          </td>
                          <td className="text-end fw-bold text-danger">
                            {formatINR(b.feesOutstanding)}
                          </td>
                          <td className="text-end fw-semibold text-dark">
                            {formatINR(b.salaryPayout)}
                          </td>
                          <td className="text-center">
                            <span className="badge bg-light text-dark border">
                              {formatStorageMB(b.storageBytes)}
                            </span>
                            <span className="d-block text-muted" style={{ fontSize: '10px' }}>
                              ({b.storageFormatted})
                            </span>
                          </td>
                          <td className="text-center">
                            <span className={`badge ${b.statusCode === 1 ? 'bg-success' : 'bg-secondary'}`}>
                              {b.status}
                            </span>
                          </td>
                          <td className="text-end">
                            <Link
                              to={`/admin/super-admin/branches/${b.id}`}
                              className="btn btn-sm btn-outline-primary"
                            >
                              View Details &rarr;
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
