import { getServerBaseUrl, resolveImageUrl, maleUserDefault, femaleUserDefault } from '../../../utils/url.util';
import { confirmAction } from '../../../utils/confirmModal';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchLeaveByIdApi,
  updateLeaveStatusApi,
  updateLeaveDateStatusApi,
} from '../../../api/adminLeave.api';
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

const LeaveDetails = () => {
  const { id: rawId } = useParams();
  const id = decodeParam(rawId);

  const [leave, setLeave] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const loadLeave = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchLeaveByIdApi(id);
      setLeave(res?.data?.leave || null);
    } catch (err) {
      console.error('Error fetching leave details:', err);
      toast.error('Failed to load leave details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadLeave();
    }
  }, [id, loadLeave]);

  // Handle overall leave approval/rejection
  const handleOverallStatusChange = async (targetStatus) => {
    const isApprove = Number(targetStatus) === 2;
    const confirmed = await confirmAction({
      title: isApprove ? 'Approve Entire Leave Application' : 'Reject Entire Leave Application',
      message: `Are you sure you want to ${isApprove ? 'approve' : 'reject'} all dates for this leave application?`,
      confirmText: isApprove ? 'Yes, Approve All' : 'Yes, Reject All',
      variant: isApprove ? 'success' : 'danger',
    });
    if (!confirmed) return;

    try {
      setProcessing(true);
      const res = await updateLeaveStatusApi(id, targetStatus);
      const notif = res?.data?.notification;
      if (notif?.pushSent) {
        toast.success(
          `Leave application ${isApprove ? 'approved' : 'rejected'} and push notification sent to applicant.`
        );
      } else if (notif?.quotaExhausted) {
        toast.success(
          `Leave application ${isApprove ? 'approved' : 'rejected'}. (Push quota exhausted — notice saved for user on reload).`
        );
      } else {
        toast.success(`Leave application ${isApprove ? 'approved' : 'rejected'} successfully.`);
      }
      loadLeave();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update leave status.');
    } finally {
      setProcessing(false);
    }
  };

  // Handle single date approval/rejection
  const handleDateStatusChange = async (dateId, targetStatus) => {
    const isApprove = Number(targetStatus) === 2;
    const confirmed = await confirmAction({
      title: isApprove ? 'Approve Leave Date' : 'Reject Leave Date',
      message: `Are you sure you want to ${isApprove ? 'approve' : 'reject'} this leave date?`,
      confirmText: isApprove ? 'Yes, Approve' : 'Yes, Reject',
      variant: isApprove ? 'success' : 'danger',
    });
    if (!confirmed) return;

    try {
      setProcessing(true);
      const res = await updateLeaveDateStatusApi(dateId, targetStatus);
      const notif = res?.data?.notification;
      if (notif?.pushSent) {
        toast.success(
          `Leave date ${isApprove ? 'approved' : 'rejected'} and push notification sent to applicant.`
        );
      } else if (notif?.quotaExhausted) {
        toast.success(
          `Leave date ${isApprove ? 'approved' : 'rejected'}. (Push quota exhausted — notice saved for user on reload).`
        );
      } else {
        toast.success(`Leave date ${isApprove ? 'approved' : 'rejected'} successfully.`);
      }
      loadLeave();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update date status.');
    } finally {
      setProcessing(false);
    }
  };

  const datesList = useMemo(() => {
    return (leave?.dates || []).map((d) => ({
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
        width: '80px',
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
        width: '150px',
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
      {
        key: 'actions',
        header: 'Decision',
        width: '200px',
        align: 'center',
        sortable: false,
        cell: ({ row }) => {
          const s = Number(row.status);
          return (
            <div className="d-inline-flex align-items-center gap-2">
              {s !== 2 && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-success d-inline-flex align-items-center px-2.5 py-1"
                  disabled={processing}
                  onClick={() => {
                    if (leave?.is_quota_exceeded) {
                      toast.warning(
                        `Cannot approve: Maximum quota of ${leave.total_quota} day(s) for "${leave.leave_name || ''}" has been reached.`
                      );
                      return;
                    }
                    handleDateStatusChange(row.id, 2);
                  }}
                >
                  <i className="ti ti-check me-1"></i>Approve
                </button>
              )}
              {s !== 3 && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger d-inline-flex align-items-center px-2.5 py-1"
                  disabled={processing}
                  onClick={() => handleDateStatusChange(row.id, 3)}
                >
                  <i className="ti ti-x me-1"></i>Reject
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [leave?.is_quota_exceeded, leave?.total_quota, leave?.leave_name, processing]
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
            <Link to="/admin/leaves" className="btn btn-primary mt-3">
              Back to Applied Leaves
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

  const isFemale = leave.gender === 'Female' || leave.gender === 2 || leave.gender === '2';
  const defaultAvatar = isFemale ? femaleUserDefault : maleUserDefault;
  const avatarUrl = resolveImageUrl(leave.person_picture, defaultAvatar);
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
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/leaves">Applied Leaves</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Review Application
              </li>
            </ol>
          </nav>
        </div>

        <div className="d-flex align-items-center flex-wrap gap-2">
          {effectiveStatus !== 2 && (
            <button
              type="button"
              className="btn btn-success d-inline-flex align-items-center"
              disabled={processing}
              onClick={() => handleOverallStatusChange(2)}
            >
              <i className="ti ti-circle-check me-1"></i>
              {datesList.length > 1 ? 'Approve All Dates' : 'Approve Leave'}
            </button>
          )}
          {effectiveStatus !== 3 && (
            <button
              type="button"
              className="btn btn-danger d-inline-flex align-items-center"
              disabled={processing}
              onClick={() => handleOverallStatusChange(3)}
            >
              <i className="ti ti-circle-x me-1"></i>
              {datesList.length > 1 ? 'Reject All Dates' : 'Reject Leave'}
            </button>
          )}
          <Link to="/admin/leaves" className="btn btn-light border d-inline-flex align-items-center">
            <i className="ti ti-arrow-left me-1"></i>Back to List
          </Link>
        </div>
      </div>

      {/* Applicant Summary Card */}
      <div className="card border shadow-2xs mb-4">
        <div className="card-body p-4">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 pb-3 mb-3 border-bottom">
            <div className="d-flex align-items-center gap-3">
              <img
                src={avatarUrl}
                alt=""
                className="rounded-circle border"
                style={{ width: '52px', height: '52px', objectFit: 'cover' }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = defaultAvatar;
                }}
              />
              <div>
                <h5 className="mb-1 fw-bold text-dark">{leave.person_name || '—'}</h5>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <span className="badge bg-light text-dark border">
                    {leave.role_label || (Number(leave.role) === 1 ? 'Teacher' : 'Staff')}
                  </span>
                  <span className="text-muted fs-12">
                    Applied on {formatLocalDate(leave.created_date || leave.created_at)}
                  </span>
                </div>
              </div>
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
              <span className="text-muted fs-12 d-block mb-1">Leave Type & Category</span>
              <div className="d-flex align-items-center gap-2">
                <span className="fw-semibold text-dark fs-14">{leave.leave_name || '—'}</span>
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
            </div>

            <div className="col-md-4">
              <span className="text-muted fs-12 d-block mb-1">Duration</span>
              <span className="fw-semibold text-dark fs-14">
                {leave.duration_label ||
                  (Number(leave.duration) === 1
                    ? 'Full Day'
                    : Number(leave.duration) === 2
                    ? 'Half Day'
                    : 'Multiple')}
                {datesList.length > 0 ? ` (${datesList.length} ${datesList.length === 1 ? 'Day' : 'Days'})` : ''}
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
                    (leave.remaining_approval_quota ?? leave.remaining_quota ?? 0) > 0
                      ? 'bg-light text-primary border border-primary'
                      : 'bg-light text-danger border border-danger'
                  }`}
                >
                  Available for Approval: <strong>{leave.remaining_approval_quota ?? leave.remaining_quota ?? 0}</strong> Days
                </span>
              </div>
            </div>

            <div className="col-md-12">
              <span className="text-muted fs-12 d-block mb-1">Reason for Absence</span>
              <div className="p-3 bg-light rounded border text-dark fs-13">
                {leave.leave_reason || 'No reason provided.'}
              </div>
            </div>
          </div>

          {leave.is_quota_exceeded && (
            <div className="alert alert-warning d-flex align-items-center mb-0 mt-3" role="alert">
              <i className="ti ti-alert-triangle fs-4 me-2 text-warning"></i>
              <div>
                <strong>Quota Limit Reached:</strong> This applicant has reached their maximum quota of{' '}
                {leave.total_quota} approved day(s) for {leave.leave_name || 'this leave type'}.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Requested Leave Dates DataTable */}
      <DataTable
        title="Requested Leave Dates"
        subtitle="Approve or reject individual leave dates or use the top buttons to decide all dates at once."
        columns={dateColumns}
        data={datesList}
        loading={false}
        selectable={false}
        searchPlaceholder="Search by date or status..."
        emptyMessage="No individual date rows recorded for this leave application."
      />
    </div>
  );
};

export default LeaveDetails;
