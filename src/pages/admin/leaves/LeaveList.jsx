import { resolveImageUrl, maleUserDefault, femaleUserDefault } from '../../../utils/url.util';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchAllLeavesApi,
  updateLeaveStatusApi,
  deleteLeaveApi,
} from '../../../api/adminLeave.api';
import DataTable from '../../../components/common/DataTable';
import TableActionMenu from '../../../components/common/TableActionMenu';
import { confirmAction } from '../../../utils/confirmModal';
import { encodeParam } from '../../../utils/idHelper';

const formatLocalDate = (ymd) => {
  if (!ymd) return '—';
  const clean = String(ymd).split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts.map(Number);
    const dt = new Date(y, m - 1, d);
    if (!isNaN(dt.getTime())) {
      return dt.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
  }
  return clean;
};

const LeaveList = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);

  const [filter, setFilter] = useState({
    role: '',
    status: '',
    date: '',
  });

  const loadLeaves = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchAllLeavesApi(filter);
      setLeaves(res?.data?.leaves || []);
      setSelectedItems([]);
    } catch (err) {
      toast.error('Failed to load applied leaves.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadLeaves();
  }, [loadLeaves]);

  useEffect(() => {
    const handleRefresh = () => loadLeaves();
    window.addEventListener('branch_changed', handleRefresh);
    window.addEventListener('growvidya:leave_status_updated', handleRefresh);
    return () => {
      window.removeEventListener('branch_changed', handleRefresh);
      window.removeEventListener('growvidya:leave_status_updated', handleRefresh);
    };
  }, [loadLeaves]);

  const summary = useMemo(() => {
    const total = leaves.length;
    const pending = leaves.filter((l) => Number(l.leave_status) === 1).length;
    const approved = leaves.filter((l) => Number(l.leave_status) === 2).length;
    const rejected = leaves.filter((l) => Number(l.leave_status) === 3).length;
    return { total, pending, approved, rejected };
  }, [leaves]);

  const handleSelectAll = () => {
    if (selectedItems.length === leaves.length && leaves.length > 0) {
      setSelectedItems([]);
    } else {
      setSelectedItems(leaves.map((l) => l.id));
    }
  };

  const handleSelectItem = (id) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleUpdateOverallStatus = async (row, targetStatus) => {
    const isApprove = Number(targetStatus) === 2;
    const confirmed = await confirmAction({
      title: isApprove ? 'Approve Leave Application' : 'Reject Leave Application',
      message: `Are you sure you want to ${isApprove ? 'approve' : 'reject'} this leave application${row.person_name ? ` for ${row.person_name}` : ''}?`,
      confirmText: isApprove ? 'Yes, Approve' : 'Yes, Reject',
      variant: isApprove ? 'success' : 'danger',
    });
    if (!confirmed) return;

    try {
      const res = await updateLeaveStatusApi(row.id, targetStatus);
      const notif = res?.data?.notification;
      if (notif?.pushSent) {
        toast.success(
          `Leave ${isApprove ? 'approved' : 'rejected'} and push notification sent to applicant.`
        );
      } else if (notif?.quotaExhausted) {
        toast.success(
          `Leave ${isApprove ? 'approved' : 'rejected'}. (Push quota exhausted — notice saved for user on reload).`
        );
      } else {
        toast.success(`Leave ${isApprove ? 'approved' : 'rejected'} successfully.`);
      }
      loadLeaves();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update leave status.');
    }
  };

  const handleDeleteLeave = async (id) => {
    const confirmed = await confirmAction({
      title: 'Delete Leave Application',
      message: 'Are you sure you want to delete this leave application?',
      confirmText: 'Yes, Delete',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      await deleteLeaveApi(id);
      toast.success('Leave application deleted successfully.');
      loadLeaves();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete leave application.');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    const confirmed = await confirmAction({
      title: 'Delete Selected Leave Applications',
      message: `Are you sure you want to delete ${selectedItems.length} selected leave application(s)?`,
      confirmText: 'Yes, Delete All',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      await Promise.all(selectedItems.map((id) => deleteLeaveApi(id)));
      toast.success(`${selectedItems.length} leave application(s) deleted successfully.`);
      setSelectedItems([]);
      loadLeaves();
    } catch (err) {
      toast.error('Failed to delete some selected leave applications.');
      loadLeaves();
    }
  };

  const handleExportCSV = () => {
    if (leaves.length === 0) return toast.info('No leaves to export');
    let csv = 'Sl No.,Role,Applicant,Leave Type,Duration,Status,Date\n';
    leaves.forEach((l, idx) => {
      const statusText =
        Number(l.leave_status) === 2
          ? 'Approved'
          : Number(l.leave_status) === 3
          ? 'Rejected'
          : 'Pending';
      const roleText = l.role_label || (Number(l.role) === 1 ? 'Teacher' : 'Staff');
      const durationText =
        l.duration_label ||
        (Number(l.duration) === 1 ? 'Full Day' : Number(l.duration) === 2 ? 'Half Day' : 'Multiple');
      const dateStr = l.leave_dates_str
        ? String(l.leave_dates_str).split(',').join(' | ')
        : l.leave_date
        ? String(l.leave_date).split('T')[0]
        : '';
      csv += `"${idx + 1}","${roleText}","${l.person_name || ''}","${l.leave_name || ''}","${durationText}","${statusText}","${dateStr}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date();
    const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    a.download = `Applied_Leaves_${todayLocal}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns = useMemo(
    () => [
      {
        key: 'index',
        header: 'Sl No.',
        width: '70px',
        align: 'center',
        cell: ({ index }) => <span className="text-muted fw-medium">{index + 1}</span>,
      },
      {
        accessorKey: 'person_name',
        header: 'Applicant',
        sortable: true,
        cell: ({ row }) => {
          const isFemale = row.gender === 'Female' || row.gender === 2 || row.gender === '2';
          const defaultAvatar = isFemale ? femaleUserDefault : maleUserDefault;
          const pic = resolveImageUrl(row.person_picture, defaultAvatar);

          return (
            <div className="d-flex align-items-center">
              <div className="avatar avatar-sm me-2 flex-shrink-0">
                <img
                  src={pic}
                  className="rounded-circle"
                  style={{ width: '34px', height: '34px', objectFit: 'cover' }}
                  alt=""
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = defaultAvatar;
                  }}
                />
              </div>
              <div>
                <Link
                  to={`/admin/leaves/details/${encodeParam(row.id)}`}
                  className="fw-semibold text-dark text-decoration-none d-block"
                >
                  {row.person_name || '—'}
                </Link>
                <span className="text-muted fs-12">
                  {row.role_label || (Number(row.role) === 1 ? 'Teacher' : 'Staff')}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'leave_name',
        header: 'Leave Type',
        sortable: true,
        cell: ({ value, row }) => (
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <span className="text-dark fw-medium">{value || '—'}</span>
            {Number(row.is_paid) === 0 ? (
              <span className="badge bg-warning-transparent text-warning border border-warning fs-11 px-1.5 py-0.5">
                Non-Paid
              </span>
            ) : (
              <span className="badge bg-success-transparent text-success border border-success fs-11 px-1.5 py-0.5">
                Paid
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'duration',
        header: 'Duration',
        sortable: true,
        width: '120px',
        align: 'center',
        cell: ({ value, row }) => {
          const totalDates = Number(row.total_dates_count || 0);
          return (
            <span className="badge bg-light text-secondary border px-2 py-1">
              {Number(value) === 1
                ? 'Full Day'
                : Number(value) === 2
                ? 'Half Day'
                : totalDates > 1
                ? `Multiple (${totalDates}d)`
                : 'Multiple'}
            </span>
          );
        },
      },
      {
        accessorKey: 'leave_date',
        header: 'Leave Date(s)',
        sortable: true,
        width: '210px',
        cell: ({ value, row }) => {
          const dateList = row.leave_dates_str
            ? String(row.leave_dates_str)
                .split(',')
                .map((d) => d.trim())
                .filter(Boolean)
            : [];

          if (dateList.length > 1) {
            return (
              <div style={{ fontSize: '13.5px' }} className="text-dark fw-medium">
                {formatLocalDate(dateList[0])} – {formatLocalDate(dateList[dateList.length - 1])}
              </div>
            );
          }

          return (
            <span style={{ fontSize: '13.5px' }} className="text-dark fw-medium">
              {formatLocalDate(dateList[0] || value)}
            </span>
          );
        },
      },
      {
        accessorKey: 'leave_status',
        header: 'Status',
        width: '160px',
        align: 'center',
        sortable: true,
        cell: ({ value, row }) => {
          const s = Number(value);
          const total = Number(row.total_dates_count || 0);
          const approved = Number(row.approved_dates_count || 0);
          const pending = Number(row.pending_dates_count || 0);

          if (total > 1 && approved > 0 && approved < total && pending === 0) {
            return (
              <span className="badge badge-soft-info d-inline-flex align-items-center">
                <i className="ti ti-circle-check fs-12 me-1"></i>
                Approved ({approved}/{total})
              </span>
            );
          }

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
              <i className="ti ti-clock fs-12 me-1"></i>
              {total > 1 && approved > 0 ? `Pending (${approved}/${total})` : 'Pending'}
            </span>
          );
        },
      },
      {
        key: 'actions',
        header: 'Action',
        width: '90px',
        align: 'center',
        sortable: false,
        cell: ({ row }) => {
          const s = Number(row.leave_status);
          const items = [
            {
              label: 'View / Review Dates',
              icon: 'ti ti-eye text-info',
              to: `/admin/leaves/details/${encodeParam(row.id)}`,
            },
          ];

          if (s !== 2 || Number(row.pending_dates_count) > 0 || Number(row.rejected_dates_count) > 0) {
            items.push({
              label: 'Approve Leave',
              icon: 'ti ti-check text-success',
              onClick: () => handleUpdateOverallStatus(row, 2),
            });
          }

          if (s !== 3 || Number(row.pending_dates_count) > 0 || Number(row.approved_dates_count) > 0) {
            items.push({
              label: 'Reject Leave',
              icon: 'ti ti-x text-danger',
              onClick: () => handleUpdateOverallStatus(row, 3),
            });
          }

          items.push({
            label: 'Delete',
            icon: 'ti ti-trash text-danger',
            variant: 'danger',
            onClick: () => handleDeleteLeave(row.id),
          });

          return <TableActionMenu items={items} />;
        },
      },
    ],
    []
  );

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Leave Applications</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Leaves</li>
              <li className="breadcrumb-item active" aria-current="page">
                Applied Leaves
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          {selectedItems.length > 0 && (
            <button
              type="button"
              className="btn btn-danger d-inline-flex align-items-center"
              onClick={handleBulkDelete}
            >
              <i className="ti ti-trash me-1"></i>
              Delete Selected ({selectedItems.length})
            </button>
          )}

          <button
            type="button"
            className="btn btn-outline-light bg-white btn-icon shadow-2xs"
            onClick={loadLeaves}
            title="Refresh"
          >
            <i className="ti ti-refresh"></i>
          </button>

          <button
            type="button"
            className="btn btn-light fw-medium d-inline-flex align-items-center"
            onClick={handleExportCSV}
          >
            <i className="ti ti-file-export me-2"></i>Export CSV
          </button>

          <Link to="/admin/leaves/apply" className="btn btn-primary d-flex align-items-center">
            <i className="ti ti-square-rounded-plus me-2"></i>Apply Leave
          </Link>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-xl-3 col-sm-6 d-flex">
          <div className="card flex-fill mb-0 border shadow-2xs">
            <div className="card-body d-flex align-items-center justify-content-between p-3">
              <div>
                <p className="fs-12 fw-medium text-muted mb-1">Total Applications</p>
                <h4 className="mb-0 fw-bold">{summary.total}</h4>
              </div>
              <div className="avatar avatar-md bg-primary-transparent text-primary rounded-circle d-flex align-items-center justify-content-center">
                <i className="ti ti-calendar-event fs-20"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-sm-6 d-flex">
          <div className="card flex-fill mb-0 border shadow-2xs">
            <div className="card-body d-flex align-items-center justify-content-between p-3">
              <div>
                <p className="fs-12 fw-medium text-muted mb-1">Pending Review</p>
                <h4 className="mb-0 fw-bold text-warning">{summary.pending}</h4>
              </div>
              <div className="avatar avatar-md bg-warning-transparent text-warning rounded-circle d-flex align-items-center justify-content-center">
                <i className="ti ti-clock fs-20"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-sm-6 d-flex">
          <div className="card flex-fill mb-0 border shadow-2xs">
            <div className="card-body d-flex align-items-center justify-content-between p-3">
              <div>
                <p className="fs-12 fw-medium text-muted mb-1">Approved</p>
                <h4 className="mb-0 fw-bold text-success">{summary.approved}</h4>
              </div>
              <div className="avatar avatar-md bg-success-transparent text-success rounded-circle d-flex align-items-center justify-content-center">
                <i className="ti ti-circle-check fs-20"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-sm-6 d-flex">
          <div className="card flex-fill mb-0 border shadow-2xs">
            <div className="card-body d-flex align-items-center justify-content-between p-3">
              <div>
                <p className="fs-12 fw-medium text-muted mb-1">Rejected</p>
                <h4 className="mb-0 fw-bold text-danger">{summary.rejected}</h4>
              </div>
              <div className="avatar avatar-md bg-danger-transparent text-danger rounded-circle d-flex align-items-center justify-content-center">
                <i className="ti ti-circle-x fs-20"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Simplistic Filter Bar */}
      <div className="bg-white p-3 border rounded-3 mb-4 shadow-2xs">
        <div className="row g-3 align-items-end">
          <div className="col-md-3">
            <label className="form-label fw-semibold fs-13 mb-1">Category</label>
            <select
              className="form-select form-select-sm"
              value={filter.role}
              onChange={(e) => setFilter((prev) => ({ ...prev, role: e.target.value }))}
            >
              <option value="">All Categories (Teacher & Staff)</option>
              <option value="1">Teacher</option>
              <option value="2">Staff</option>
            </select>
          </div>

          <div className="col-md-3">
            <label className="form-label fw-semibold fs-13 mb-1">Status</label>
            <select
              className="form-select form-select-sm"
              value={filter.status}
              onChange={(e) => setFilter((prev) => ({ ...prev, status: e.target.value }))}
            >
              <option value="">All Status</option>
              <option value="1">Pending</option>
              <option value="2">Approved</option>
              <option value="3">Rejected</option>
            </select>
          </div>

          <div className="col-md-3">
            <label className="form-label fw-semibold fs-13 mb-1">Leave Date</label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={filter.date}
              onChange={(e) => setFilter((prev) => ({ ...prev, date: e.target.value }))}
            />
          </div>

          <div className="col-md-3">
            <button
              type="button"
              className="btn btn-light btn-sm w-100 border"
              onClick={() => setFilter({ role: '', status: '', date: '' })}
            >
              <i className="ti ti-rotate-clockwise me-1"></i>Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        title="Applied Leaves"
        subtitle="Review, approve, or reject leave requests submitted by teachers and staff."
        columns={columns}
        data={leaves}
        loading={loading}
        selectable={true}
        selectedIds={selectedItems}
        onSelectRow={handleSelectItem}
        onSelectAll={handleSelectAll}
        searchPlaceholder="Search by applicant name, role, or leave type..."
        emptyMessage="No leave applications found."
      />
    </div>
  );
};

export default LeaveList;
