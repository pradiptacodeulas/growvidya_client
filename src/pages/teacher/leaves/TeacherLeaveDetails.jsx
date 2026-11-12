import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchTeacherLeaveByIdApi } from '../../../api/teacherLeave.api';
import { getServerBaseUrl } from '../../../utils/url.util';
import DataTable from '../../../components/common/DataTable';
import NoData from '../../../components/common/NoData';
import { decodeParam } from '../../../utils/idHelper';

const SERVER_BASE_URL = getServerBaseUrl();

const formatLocalDate = (dateStr) => {
  if (!dateStr) return '—';
  const clean = String(dateStr).split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts.map(Number);
    const dt = new Date(y, m - 1, d);
    if (!isNaN(dt.getTime())) {
      return dt.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
  }
  return clean;
};

const TeacherLeaveDetails = () => {
  const { id: rawId } = useParams();
  const id = decodeParam(rawId);

  const [leave, setLeave] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadLeave = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchTeacherLeaveByIdApi(id);
      setLeave(res?.data?.leave || res?.leave || null);
    } catch (err) {
      console.error('Error fetching teacher leave details:', err);
      toast.error('Failed to load leave application details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadLeave();
    }
  }, [id, loadLeave]);

  useEffect(() => {
    const handleRefresh = () => {
      if (id) loadLeave();
    };
    window.addEventListener('growvidya:leave_status_updated', handleRefresh);
    return () => {
      window.removeEventListener('growvidya:leave_status_updated', handleRefresh);
    };
  }, [id, loadLeave]);

  const datesList = useMemo(() => {
    const rawDates =
      Array.isArray(leave?.dates) && leave.dates.length > 0
        ? leave.dates
        : leave?.leave_date
        ? [
            {
              id: leave.id,
              date: leave.leave_date,
              status: leave.leave_status ?? leave.status ?? 1,
            },
          ]
        : [];

    return rawDates.map((d) => ({
      ...d,
      formatted_date: formatLocalDate(d.date),
      status_label:
        Number(d.status) === 2 ? 'Approved' : Number(d.status) === 3 ? 'Rejected' : 'Pending',
    }));
  }, [leave]);

  const dateColumns = useMemo(
    () => [
      {
        key: 'index',
        header: 'Sl No.',
        width: '90px',
        align: 'center',
        cell: ({ index }) => <span className="text-muted fw-medium">{index + 1}</span>,
      },
      {
        accessorKey: 'formatted_date',
        header: 'Leave Date',
        sortable: true,
        cell: ({ value }) => (
          <span className="text-dark fw-semibold" style={{ fontSize: '13.5px' }}>
            {value}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        width: '180px',
        align: 'center',
        sortable: true,
        cell: ({ value }) => {
          const s = Number(value);
          if (s === 2) {
            return (
              <span className="badge badge-soft-success d-inline-flex align-items-center">
                <i className="ti ti-circle-check fs-12 me-1"></i>Approved
              </span>
            );
          }
          if (s === 3) {
            return (
              <span className="badge badge-soft-danger d-inline-flex align-items-center">
                <i className="ti ti-circle-x fs-12 me-1"></i>Rejected
              </span>
            );
          }
          return (
            <span className="badge badge-soft-warning d-inline-flex align-items-center">
              <i className="ti ti-clock fs-12 me-1"></i>Pending
            </span>
          );
        },
      },
    ],
    []
  );

  if (loading) {
    return (
      <div className="content py-5 text-center">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2 text-muted">Loading leave details...</p>
      </div>
    );
  }

  if (!leave) {
    return (
      <div className="content py-5 text-center">
        <NoData
          title="Leave Record Not Found"
          message="The requested leave record could not be found."
          action={
            <Link to="/teacher/leaves/my-leaves" className="btn btn-primary mt-3">
              Back to My Leaves
            </Link>
          }
        />
      </div>
    );
  }

  const documentUrl = leave.document
    ? leave.document.startsWith('http') || leave.document.startsWith('data:')
      ? leave.document
      : `${SERVER_BASE_URL}/${leave.document.replace(/^\//, '')}`
    : null;

  const effectiveStatus = Number(leave.leave_status ?? leave.status);

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Leave Application Details</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/teacher/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/teacher/leaves/my-leaves">My Leaves</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Leave Details
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          <Link
            to="/teacher/leaves/my-leaves"
            className="btn btn-light border d-flex align-items-center"
          >
            <i className="ti ti-arrow-left me-1"></i>Back to My Leaves
          </Link>
          <Link
            to="/teacher/leaves/apply"
            className="btn btn-primary d-flex align-items-center"
          >
            <i className="ti ti-square-rounded-plus me-2"></i>Apply Leave
          </Link>
        </div>
      </div>

      {/* Summary Card */}
      <div className="card border shadow-2xs mb-4">
        <div className="card-body p-4">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 pb-3 mb-3 border-bottom">
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <h5 className="mb-0 fw-bold text-dark">{leave.leave_name || '—'}</h5>
                {Number(leave.is_paid) === 0 ? (
                  <span className="badge bg-warning-transparent text-warning border border-warning fs-11">
                    Non-Paid
                  </span>
                ) : (
                  <span className="badge bg-success-transparent text-success border border-success fs-11">
                    Paid
                  </span>
                )}
              </div>
              <span className="text-muted fs-12">
                Submitted on {formatLocalDate(leave.created_date || leave.created_at)}
              </span>
            </div>

            <div>
              {effectiveStatus === 2 ? (
                <span className="badge badge-soft-success fs-13 px-3 py-2 d-inline-flex align-items-center">
                  <i className="ti ti-circle-check me-1"></i>Approved
                </span>
              ) : effectiveStatus === 3 ? (
                <span className="badge badge-soft-danger fs-13 px-3 py-2 d-inline-flex align-items-center">
                  <i className="ti ti-circle-x me-1"></i>Rejected
                </span>
              ) : (
                <span className="badge badge-soft-warning fs-13 px-3 py-2 d-inline-flex align-items-center">
                  <i className="ti ti-clock me-1"></i>Pending Review
                </span>
              )}
            </div>
          </div>

          <div className="row g-3">
            <div className="col-md-4">
              <span className="text-muted fs-12 d-block mb-1">Duration</span>
              <span className="fw-semibold text-dark fs-14">
                {leave.duration_label ||
                  (Number(leave.duration) === 3
                    ? 'Multiple'
                    : Number(leave.duration) === 2
                    ? 'Half Day'
                    : 'Full Day')}
                {datesList.length > 0
                  ? ` (${datesList.length} ${datesList.length === 1 ? 'Day' : 'Days'})`
                  : ''}
              </span>
            </div>

            <div className="col-md-4">
              <span className="text-muted fs-12 d-block mb-1">Supporting Document</span>
              {documentUrl ? (
                <a
                  href={documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline-primary btn-sm d-inline-flex align-items-center"
                >
                  <i className="ti ti-file-download me-1"></i>View / Download Document
                </a>
              ) : (
                <span className="text-muted fs-13">No document attached</span>
              )}
            </div>

            {leave.total_quota !== undefined && (
              <div className="col-md-12">
                <span className="text-muted fs-12 d-block mb-1">Leave Balance & Quota</span>
                <div className="d-flex align-items-center flex-wrap gap-2">
                  <span className="badge bg-light text-dark border px-2.5 py-1.5">
                    Allowed Quota: <strong>{leave.total_quota ?? 0}</strong> Days
                  </span>
                  <span className="badge bg-light text-success border border-success px-2.5 py-1.5">
                    Approved: <strong>{leave.approved_days ?? 0}</strong> Days
                  </span>
                  {Number(leave.pending_days || 0) > 0 && (
                    <span className="badge bg-light text-warning border border-warning px-2.5 py-1.5">
                      Pending: <strong>{leave.pending_days}</strong> Days
                    </span>
                  )}
                  <span
                    className={`badge px-2.5 py-1.5 ${
                      (leave.remaining_quota ?? 0) > 0
                        ? 'bg-light text-primary border border-primary'
                        : 'bg-light text-danger border border-danger'
                    }`}
                  >
                    Remaining Balance: <strong>{leave.remaining_quota ?? 0}</strong> Days
                  </span>
                </div>
              </div>
            )}

            <div className="col-md-12">
              <span className="text-muted fs-12 d-block mb-1">Reason for Absence</span>
              <div className="p-3 bg-light rounded border text-dark fs-13">
                {leave.leave_reason || leave.reason || 'No reason provided.'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Requested Leave Dates DataTable */}
      <DataTable
        title="Applied Leave Dates"
        subtitle="Status breakdown for each requested leave date."
        columns={dateColumns}
        data={datesList}
        loading={false}
        selectable={false}
        searchPlaceholder="Search by date or status..."
        emptyMessage="No leave dates found."
      />
    </div>
  );
};

export default TeacherLeaveDetails;
