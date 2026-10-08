import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchSuperAdminBranchDetailsApi } from '../../../api/superAdmin.api';
import Avatar from '../../../components/common/Avatar';

const formatINR = (val) => {
  const num = Number(val);
  if (isNaN(num)) return '₹0';
  return `₹${num.toLocaleString('en-IN')}`;
};

const BranchDetailsView = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState(null);
  const [error, setError] = useState(null);

  const loadBranchDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchSuperAdminBranchDetailsApi(id);
      if (res?.data) {
        setDetails(res.data);
      } else {
        setError('Branch data not found.');
      }
    } catch (err) {
      console.error('Failed to load branch details:', err);
      setError(err?.message || 'Failed to load branch details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadBranchDetails();
    }
  }, [id, loadBranchDetails]);

  if (loading) {
    return (
      <div className="content">
        <div className="d-flex justify-content-center align-items-center py-5">
          <div className="spinner-border text-primary me-2" role="status"></div>
          <span>Loading branch details...</span>
        </div>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="content">
        <div className="alert alert-danger shadow-sm my-4">
          <h5 className="alert-heading fw-bold mb-2">Error Loading Branch Details</h5>
          <p className="mb-3">{error || 'Branch details could not be retrieved.'}</p>
          <Link to="/admin/super-admin/dashboard" className="btn btn-outline-danger btn-sm">
            &larr; Back to Organization Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { overview, academic, finance, storage, staff } = details;

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-4">
        <div className="my-auto mb-2">
          <div className="d-flex align-items-center gap-2">
            <h3 className="page-title mb-0 fw-bold">{overview.branchName}</h3>
            {overview.isMainBranch && (
              <span className="badge bg-primary">Main Campus</span>
            )}
            <span className={`badge ${overview.statusCode === 1 ? 'bg-success' : 'bg-secondary'}`}>
              {overview.status}
            </span>
          </div>
          <nav className="mt-1">
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/super-admin/dashboard">Organization</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {overview.branchCode}
              </li>
            </ol>
          </nav>
        </div>

        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          <Link to="/admin/super-admin/dashboard" className="btn btn-outline-secondary btn-sm">
            &larr; Back to Dashboard
          </Link>
          <Link to="/admin/settings/branches" className="btn btn-primary btn-sm shadow-sm">
            <i className="ti ti-edit me-1"></i> Edit Branch Settings
          </Link>
        </div>
      </div>

      {/* Row 1: Campus Overview & Head Card */}
      <div className="row g-3 mb-4">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-bottom py-3">
              <h5 className="card-title mb-0 fw-bold">Campus Profile & Location</h5>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <span className="text-muted small d-block mb-1">Campus Name</span>
                  <span className="fw-bold text-dark">{overview.branchName}</span>
                </div>
                <div className="col-md-6">
                  <span className="text-muted small d-block mb-1">Branch Code</span>
                  <span className="badge bg-light text-dark border">{overview.branchCode}</span>
                </div>
                <div className="col-md-6">
                  <span className="text-muted small d-block mb-1">Helpline Phone</span>
                  <span className="fw-semibold text-dark">{overview.phone || 'Not Provided'}</span>
                </div>
                <div className="col-md-6">
                  <span className="text-muted small d-block mb-1">Email Address</span>
                  <span className="fw-semibold text-dark">{overview.email || 'Not Provided'}</span>
                </div>
                <div className="col-12">
                  <span className="text-muted small d-block mb-1">Street Address</span>
                  <p className="text-dark mb-0">
                    {[overview.address, overview.city, overview.state, overview.country, overview.pincode]
                      .filter(Boolean)
                      .join(', ') || 'Address not registered'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Head / Principal Card */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-bottom py-3">
              <h5 className="card-title mb-0 fw-bold">Campus Leadership</h5>
            </div>
            <div className="card-body text-center p-4">
              <Avatar
                src={overview.headPicture}
                name={overview.principalName}
                size={72}
                className="mx-auto mb-3 shadow-sm"
              />
              <h5 className="fw-bold text-dark mb-1">{overview.principalName}</h5>
              <span className="badge bg-primary-transparent text-primary mb-3">
                {overview.headRole}
              </span>
              <div className="text-start border-top pt-3 small">
                <div className="mb-2 text-muted">
                  <i className="ti ti-mail me-2"></i>
                  <span>{overview.headEmail || 'No email registered'}</span>
                </div>
                <div className="text-muted">
                  <i className="ti ti-phone me-2"></i>
                  <span>{overview.headPhone || 'No phone registered'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Academic Statistics & Attendance */}
      <div className="row g-3 mb-4">
        {/* Academic KPI Cards */}
        <div className="col-md-3">
          <div className="card border-0 shadow-sm p-3">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small fw-semibold">STUDENTS</span>
              <i className="ti ti-school fs-3 text-info"></i>
            </div>
            <h3 className="fw-bold text-dark mb-1">{academic.students.total}</h3>
            <span className="text-success small fw-semibold">
              Active: {academic.students.active} &bull; Inactive: {academic.students.inactive}
            </span>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm p-3">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small fw-semibold">TEACHERS</span>
              <i className="ti ti-users fs-3 text-warning"></i>
            </div>
            <h3 className="fw-bold text-dark mb-1">{academic.teachers.total}</h3>
            <span className="text-success small fw-semibold">
              Active: {academic.teachers.active} &bull; Inactive: {academic.teachers.inactive}
            </span>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm p-3">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small fw-semibold">CLASSES & SECTIONS</span>
              <i className="ti ti-chalkboard fs-3 text-primary"></i>
            </div>
            <h3 className="fw-bold text-dark mb-1">{academic.classesCount}</h3>
            <span className="text-muted small">
              {academic.sectionsCount} Sections Configured
            </span>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm p-3">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small fw-semibold">BRANCH STORAGE</span>
              <i className="ti ti-database fs-3 text-secondary"></i>
            </div>
            <h3 className="fw-bold text-dark mb-1">{storage.usedFormatted}</h3>
            <span className="text-muted small">
              {storage.materialsCount} study materials &bull; {storage.documentsCount} docs
            </span>
          </div>
        </div>
      </div>

      {/* Row 3: Financial & Attendance Summaries */}
      <div className="row g-3 mb-4">
        {/* Financial Performance */}
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-bottom py-3">
              <h5 className="card-title mb-0 fw-bold">Campus Financial Overview</h5>
            </div>
            <div className="card-body">
              <div className="row g-3 mb-4">
                <div className="col-4 text-center p-3 rounded bg-light border">
                  <span className="text-muted small d-block mb-1">Invoiced</span>
                  <h5 className="fw-bold text-dark mb-0">{formatINR(finance.feesInvoiced)}</h5>
                </div>
                <div className="col-4 text-center p-3 rounded bg-light border">
                  <span className="text-muted small d-block mb-1">Collected</span>
                  <h5 className="fw-bold text-success mb-0">{formatINR(finance.feesCollected)}</h5>
                </div>
                <div className="col-4 text-center p-3 rounded bg-light border">
                  <span className="text-muted small d-block mb-1">Outstanding</span>
                  <h5 className="fw-bold text-danger mb-0">{formatINR(finance.feesOutstanding)}</h5>
                </div>
              </div>

              <div className="p-3 rounded bg-light border mb-3">
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted small">Campus Staff Salary Payout:</span>
                  <span className="fw-bold text-dark">{formatINR(finance.salaryPayout)}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted small">Basic Salary:</span>
                  <span className="text-secondary small">{formatINR(finance.salaryBasic)}</span>
                </div>
              </div>

              <h6 className="fw-bold text-dark small text-uppercase mb-2">Recent Fee Transactions</h6>
              {finance.recentPayments && finance.recentPayments.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-sm table-borderless align-middle mb-0">
                    <thead className="table-light small text-muted">
                      <tr>
                        <th>Receipt</th>
                        <th>Student</th>
                        <th>Class</th>
                        <th className="text-end">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {finance.recentPayments.map((p) => (
                        <tr key={p.id} className="border-bottom small">
                          <td>
                            <span className="fw-semibold text-dark">{p.receiptNo || p.txnNo}</span>
                          </td>
                          <td>{p.studentName}</td>
                          <td>{p.className}</td>
                          <td className="text-end fw-bold text-success">
                            {formatINR(p.amountPaid)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted small mb-0">No fee transactions recorded for this branch.</p>
              )}
            </div>
          </div>
        </div>

        {/* Today's Attendance & Faculty Roster */}
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-bottom py-3">
              <h5 className="card-title mb-0 fw-bold">Today's Attendance & Faculty</h5>
            </div>
            <div className="card-body">
              {/* Today's Attendance */}
              <div className="p-3 rounded bg-light border mb-4">
                <span className="fw-bold text-dark small text-uppercase d-block mb-2">
                  Student Attendance Today
                </span>
                <div className="d-flex justify-content-around text-center">
                  <div>
                    <span className="text-muted small d-block">Present</span>
                    <h5 className="fw-bold text-success mb-0">{academic.attendanceToday.present}</h5>
                  </div>
                  <div>
                    <span className="text-muted small d-block">Absent</span>
                    <h5 className="fw-bold text-danger mb-0">{academic.attendanceToday.absent}</h5>
                  </div>
                  <div>
                    <span className="text-muted small d-block">Late</span>
                    <h5 className="fw-bold text-warning mb-0">{academic.attendanceToday.late}</h5>
                  </div>
                </div>
              </div>

              {/* Faculty Roster */}
              <h6 className="fw-bold text-dark small text-uppercase mb-2">Assigned Faculty Members</h6>
              {staff.teachers && staff.teachers.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-sm table-hover align-middle mb-0">
                    <thead className="table-light small text-muted">
                      <tr>
                        <th>Teacher</th>
                        <th>Contact</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staff.teachers.map((t) => (
                        <tr key={t.id} className="small">
                          <td>
                            <span className="fw-semibold text-dark">{t.name}</span>
                            {t.qualification && (
                              <span className="text-muted d-block small">{t.qualification}</span>
                            )}
                          </td>
                          <td className="text-muted">{t.phone || t.email || 'N/A'}</td>
                          <td>
                            <span className={`badge ${t.status === 'Active' ? 'bg-success' : 'bg-secondary'}`}>
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted small mb-0">No faculty members assigned to this campus.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BranchDetailsView;
