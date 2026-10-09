import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  fetchSuperAdminDashboardApi,
  fetchSuperAdminBranchesApi,
} from '../../../api/superAdmin.api';
import usePermission from '../../../hooks/usePermission';
import Avatar from '../../../components/common/Avatar';
import { resolveImageUrl } from '../../../utils/url.util';

const formatINR = (val) => {
  const num = Number(val);
  if (isNaN(num)) return '₹0';
  return `₹${num.toLocaleString('en-IN')}`;
};

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const { isSuperAdmin } = usePermission();

  const [loading, setLoading] = useState(true);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [stats, setStats] = useState(null);
  const [branches, setBranches] = useState([]);
  const [error, setError] = useState(null);

  // Load consolidated or branch-filtered organization stats
  const loadData = useCallback(async (branchId = null) => {
    try {
      setLoading(true);
      setError(null);

      const [statsRes, branchesRes] = await Promise.all([
        fetchSuperAdminDashboardApi(branchId || null),
        fetchSuperAdminBranchesApi(),
      ]);

      if (statsRes?.data) {
        setStats(statsRes.data);
      }
      if (branchesRes?.data && Array.isArray(branchesRes.data)) {
        setBranches(branchesRes.data);
      }
    } catch (err) {
      console.error('Failed to load Super Admin dashboard:', err);
      setError(err?.message || 'Failed to load organization metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(selectedBranchId);
  }, [loadData, selectedBranchId]);

  const handleBranchFilterChange = (e) => {
    const bId = e.target.value;
    setSelectedBranchId(bId);
  };

  const school = stats?.school || {};
  const branchesStats = stats?.branches || { total: 0, active: 0, inactive: 0 };
  const students = stats?.students || { total: 0, active: 0, inactive: 0, allowed: 0 };
  const teachers = stats?.teachers || { total: 0, active: 0, inactive: 0 };
  const staff = stats?.staff || { total: 0, active: 0, inactive: 0 };
  const classes = stats?.classes || { total: 0 };
  const fees = stats?.fees || { totalInvoiced: 0, collected: 0, outstanding: 0 };
  const salary = stats?.salary || { basic: 0, deductions: 0, payout: 0, netSalary: 0 };
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

  // Warning banner classes based on real storage threshold
  const isStorageWarning = storage.warningLevel === 'warning';
  const isStorageCritical = storage.warningLevel === 'critical';
  const isStorageLimitReached = storage.warningLevel === 'limit_reached';

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
              <div
                className="avatar avatar-lg bg-primary-transparent text-primary rounded me-3 d-flex align-items-center justify-content-center fw-bold fs-4"
              >
                {(school.name || 'S').charAt(0)}
              </div>
            )}
            <div>
              <div className="d-flex align-items-center gap-2">
                <h3 className="page-title mb-0 fw-bold">{school.name || 'Organization Dashboard'}</h3>
                <span className="badge bg-primary-transparent text-primary border border-primary">
                  Multi-Branch Super Admin
                </span>
                {school.code && (
                  <span className="badge bg-light text-secondary border">
                    Code: {school.code}
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

        {/* Actions & Branch Selector */}
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          {/* Branch Filter Selector */}
          <div className="d-flex align-items-center bg-white border rounded px-2 py-1 shadow-sm">
            <i className="ti ti-filter text-muted me-2"></i>
            <span className="small text-muted me-2">Scope:</span>
            <select
              className="form-select form-select-sm border-0 shadow-none fw-semibold text-dark"
              style={{ minWidth: '220px', cursor: 'pointer' }}
              value={selectedBranchId}
              onChange={handleBranchFilterChange}
            >
              <option value="">🏢 All Branches (Organization View)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.isMainBranch ? '★ ' : ''}{b.branchName} ({b.branchCode})
                </option>
              ))}
            </select>
          </div>

          <Link
            to="/admin/settings/branches"
            className="btn btn-outline-primary btn-sm d-flex align-items-center"
          >
            <i className="ti ti-building-community me-1"></i> Manage Branches
          </Link>

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
                Your organization has consumed <strong>{storage.usedFormatted}</strong> of your <strong>{storage.allocatedFormatted}</strong> storage plan. New file uploads are blocked.
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
                Your organization is approaching its storage limit (<strong>{storage.usedFormatted}</strong> used of <strong>{storage.allocatedFormatted}</strong>). Please upgrade your storage capacity to prevent interruptions.
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
                Your organization has used {storage.usedFormatted} of {storage.allocatedFormatted} allocated storage.
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

      {/* Row 1: Top KPI Cards (Branches, Students, Teachers, Staff) */}
      <div className="row g-3 mb-4">
        {/* Total Branches */}
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

      {/* Row 2: Finance & Payroll Overview Cards */}
      <div className="row g-3 mb-4">
        {/* Fees Collected */}
        <div className="col-xxl-4 col-md-6 d-flex">
          <div className="card flex-fill border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-muted small fw-semibold text-uppercase">Fees Collection</span>
                <div className="avatar avatar-sm bg-success-transparent text-success rounded p-1">
                  <i className="ti ti-cash fs-4"></i>
                </div>
              </div>
              <h3 className="fw-bold text-success mb-2">
                {loading ? '...' : formatINR(fees.collected)}
              </h3>
              <div className="p-2 rounded bg-light small mb-0">
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted">Total Invoiced:</span>
                  <span className="fw-semibold text-dark">{formatINR(fees.totalInvoiced)}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-danger fw-semibold">Outstanding Fees:</span>
                  <span className="text-danger fw-bold">{formatINR(fees.outstanding)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Salary / Payroll */}
        <div className="col-xxl-4 col-md-6 d-flex">
          <div className="card flex-fill border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-muted small fw-semibold text-uppercase">Staff Salary / Payroll</span>
                <div className="avatar avatar-sm bg-danger-transparent text-danger rounded p-1">
                  <i className="ti ti-wallet fs-4"></i>
                </div>
              </div>
              <h3 className="fw-bold text-danger mb-2">
                {loading ? '...' : formatINR(salary.payout)}
              </h3>
              <div className="p-2 rounded bg-light small mb-0">
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted">Basic Salary:</span>
                  <span className="fw-semibold text-dark">{formatINR(salary.basic)}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Total Deductions:</span>
                  <span className="fw-semibold text-secondary">{formatINR(salary.deductions)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Organization Storage Mini-Gauge */}
        <div className="col-xxl-4 col-md-12 d-flex">
          <div className="card flex-fill border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-muted small fw-semibold text-uppercase">Organization Cloud Storage</span>
                <span className={`badge ${isStorageCritical || isStorageLimitReached ? 'bg-danger' : isStorageWarning ? 'bg-warning text-dark' : 'bg-success'} text-uppercase`}>
                  {storage.warningLevel.replace('_', ' ')}
                </span>
              </div>
              <div className="d-flex align-items-baseline gap-2 mb-2">
                <h3 className="fw-bold text-dark mb-0">{storage.usedFormatted}</h3>
                <span className="text-muted small">/ {storage.allocatedFormatted} ({storage.percentage}%)</span>
              </div>
              <div className="progress progress-sm mb-2" style={{ height: '8px' }}>
                <div
                  className={`progress-bar ${isStorageCritical || isStorageLimitReached ? 'bg-danger' : isStorageWarning ? 'bg-warning' : 'bg-primary'}`}
                  role="progressbar"
                  style={{ width: `${Math.min(100, Math.max(storage.percentage, 1))}%` }}
                  aria-valuenow={storage.percentage}
                  aria-valuemin="0"
                  aria-valuemax="100"
                ></div>
              </div>
              <div className="d-flex justify-content-between small text-muted">
                <span>Available: {storage.availableFormatted}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Storage Management & Subscription Details */}
      <div className="row g-3 mb-4">
        {/* Storage Details Card */}
        <div className="col-lg-6 d-flex">
          <div className="card flex-fill border-0 shadow-sm">
            <div className="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                <i className="ti ti-cloud-computing text-primary fs-3 me-2"></i>
                <h5 className="card-title mb-0 fw-bold">Cloud Storage Management</h5>
              </div>
              <span className="badge bg-light text-dark border">
                {storage.planName}
              </span>
            </div>
            <div className="card-body">
              <div className="row g-3 mb-3">
                <div className="col-sm-4 text-center p-3 border rounded bg-light">
                  <span className="text-muted small d-block mb-1">Total Allocation</span>
                  <h4 className="fw-bold text-dark mb-0">{storage.allocatedFormatted}</h4>
                </div>
                <div className="col-sm-4 text-center p-3 border rounded bg-light">
                  <span className="text-muted small d-block mb-1">Total Used</span>
                  <h4 className="fw-bold text-primary mb-0">{storage.usedFormatted}</h4>
                </div>
                <div className="col-sm-4 text-center p-3 border rounded bg-light">
                  <span className="text-muted small d-block mb-1">Remaining</span>
                  <h4 className="fw-bold text-success mb-0">{storage.availableFormatted}</h4>
                </div>
              </div>

              {/* Branch-wise storage consumption list */}
              <h6 className="fw-bold text-dark mb-2 small text-uppercase">Branch-Wise Storage Consumption</h6>
              {storage.branchesBreakdown && storage.branchesBreakdown.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-sm table-borderless align-middle mb-0">
                    <thead className="table-light">
                      <tr className="small text-muted">
                        <th>Branch</th>
                        <th>Files</th>
                        <th className="text-end">Storage Used</th>
                      </tr>
                    </thead>
                    <tbody>
                      {storage.branchesBreakdown.map((b) => (
                        <tr key={b.branch_id} className="border-bottom">
                          <td>
                            <span className="fw-semibold text-dark">{b.branch_name}</span>
                            {b.is_main_branch ? (
                              <span className="badge bg-primary-transparent text-primary ms-2 small">Main Campus</span>
                            ) : null}
                          </td>
                          <td className="small text-muted">
                            {b.materials_count + b.documents_count} items
                          </td>
                          <td className="text-end fw-bold text-dark">
                            {b.formatted}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted small mb-0">No branch storage breakdown recorded.</p>
              )}
            </div>
            <div className="card-footer bg-white border-top py-2">
              <span className="small text-muted">Thresholds: 75% Warning &bull; 90% Critical</span>
            </div>
          </div>
        </div>

        {/* Subscription Plan & Usage Limits Card */}
        <div className="col-lg-6 d-flex">
          <div className="card flex-fill border-0 shadow-sm">
            <div className="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                <i className="ti ti-crown text-warning fs-3 me-2"></i>
                <h5 className="card-title mb-0 fw-bold">Organization Subscription</h5>
              </div>
              <span className={`badge ${subscription.status === 'active' ? 'bg-success' : subscription.status === 'trial' ? 'bg-info' : 'bg-secondary'}`}>
                {subscription.status.toUpperCase()}
              </span>
            </div>
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between p-3 border rounded bg-light mb-3">
                <div>
                  <h4 className="fw-bold text-dark mb-1">{subscription.planName}</h4>
                  <span className="text-muted small">
                    Cycle: <strong className="text-dark text-capitalize">{subscription.billingCycle}</strong>
                    {subscription.endDate && (
                      <> &bull; Renews/Expires: <strong className="text-dark">{subscription.endDate}</strong></>
                    )}
                  </span>
                </div>
                <div className="text-end">
                  <span className="badge bg-warning text-dark fs-6 px-3 py-2">
                    {subscription.daysLeft} Days Left
                  </span>
                </div>
              </div>

              {/* Limit Comparisons */}
              <div className="mb-3">
                <div className="d-flex justify-content-between small mb-1">
                  <span className="fw-semibold text-muted">Active Branches:</span>
                  <span className="fw-bold text-dark">
                    {branchesStats.active} / {subscription.allowedBranches > 0 ? subscription.allowedBranches : '10'}
                  </span>
                </div>
                <div className="progress progress-sm mb-3" style={{ height: '6px' }}>
                  <div
                    className="progress-bar bg-primary"
                    style={{ width: `${Math.min(100, (branchesStats.active / (subscription.allowedBranches || 10)) * 100)}%` }}
                  ></div>
                </div>

                <div className="d-flex justify-content-between small mb-1">
                  <span className="fw-semibold text-muted">Student Enrollment:</span>
                  <span className="fw-bold text-dark">
                    {students.total} / {subscription.allowedStudents > 0 ? subscription.allowedStudents : 'Unlimited'}
                  </span>
                </div>
                <div className="progress progress-sm mb-3" style={{ height: '6px' }}>
                  <div
                    className="progress-bar bg-info"
                    style={{
                      width: subscription.allowedStudents > 0
                        ? `${Math.min(100, (students.total / subscription.allowedStudents) * 100)}%`
                        : '10%'
                    }}
                  ></div>
                </div>

                <div className="d-flex justify-content-between small mb-1">
                  <span className="fw-semibold text-muted">Storage Utilization:</span>
                  <span className="fw-bold text-dark">
                    {storage.usedFormatted} / {storage.allocatedFormatted} ({storage.percentage}%)
                  </span>
                </div>
                <div className="progress progress-sm" style={{ height: '6px' }}>
                  <div
                    className={`progress-bar ${isStorageCritical || isStorageLimitReached ? 'bg-danger' : isStorageWarning ? 'bg-warning' : 'bg-success'}`}
                    style={{ width: `${Math.min(100, Math.max(storage.percentage, 1))}%` }}
                  ></div>
                </div>
              </div>
            </div>
            <div className="card-footer bg-white border-top py-2">
              <span className="small text-muted">Multi-Branch SaaS Subscription</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Branch Performance Overview Table */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div className="d-flex align-items-center">
            <i className="ti ti-layout-grid text-primary fs-3 me-2"></i>
            <div>
              <h5 className="card-title mb-0 fw-bold">Branch Performance Overview</h5>
              <p className="text-muted small mb-0">Consolidated real-time operational, academic, and financial metrics per campus</p>
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
                  <th className="text-center">Storage</th>
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
                          {b.storageFormatted}
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
    </div>
  );
};

export default SuperAdminDashboard;
