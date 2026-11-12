import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchTeacherMyLeavesApi } from '../../../api/teacherLeave.api';
import { encodeParam } from '../../../utils/idHelper';
import DataTable from '../../../components/common/DataTable';
import TableActionMenu from '../../../components/common/TableActionMenu';

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

const TeacherMyLeaves = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadLeaves = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchTeacherMyLeavesApi().catch(() => null);
      if (res?.data?.leaves && Array.isArray(res.data.leaves)) {
        setLeaves(res.data.leaves);
      } else if (Array.isArray(res?.data)) {
        setLeaves(res.data);
      } else {
        setLeaves([]);
      }
    } catch (err) {
      toast.error('Failed to load your leaves list.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeaves();
  }, [loadLeaves]);

  useEffect(() => {
    const handleRefresh = () => loadLeaves();
    window.addEventListener('growvidya:leave_status_updated', handleRefresh);
    return () => {
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

  const renderStatusBadge = (row) => {
    const status = Number(row.leave_status);
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

    if (status === 2) {
      return (
        <span className="badge badge-soft-success d-inline-flex align-items-center">
          <i className="ti ti-circle-check fs-12 me-1"></i>Approved
        </span>
      );
    }
    if (status === 3) {
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
  };

  const handleExportCSV = () => {
    if (leaves.length === 0) return toast.info('No leaves to export');
    let csv = 'Sl No.,Leave Type,Pay Type,Duration,Status,Date(s)\n';
    leaves.forEach((l, idx) => {
      const statusText =
        Number(l.leave_status) === 2
          ? 'Approved'
          : Number(l.leave_status) === 3
          ? 'Rejected'
          : 'Pending';
      const payType = Number(l.is_paid) === 0 ? 'Non-Paid' : 'Paid';
      const dateStr = l.leave_dates_str
        ? String(l.leave_dates_str).split(',').join(' | ')
        : l.leave_date
        ? String(l.leave_date).split('T')[0]
        : '';
      csv += `"${idx + 1}","${l.leave_name || ''}","${payType}","${l.duration_label || ''}","${statusText}","${dateStr}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date();
    const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    a.download = `My_Leaves_${todayLocal}.csv`;
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
        accessorKey: 'leave_name',
        header: 'Leave Type',
        sortable: true,
        cell: ({ value, row }) => (
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <Link
              to={`/teacher/leaves/details/${encodeParam(row.id)}`}
              className="fw-semibold text-dark text-decoration-none"
            >
              {value || '—'}
            </Link>
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
        width: '130px',
        align: 'center',
        cell: ({ row }) => {
          const totalDates = Number(row.total_dates_count || 0);
          return (
            <span className="badge bg-light text-secondary border px-2 py-1">
              {Number(row.duration) === 3
                ? totalDates > 1
                  ? `Multiple (${totalDates}d)`
                  : 'Multiple'
                : Number(row.duration) === 2
                ? 'Half Day'
                : 'Full Day'}
            </span>
          );
        },
      },
      {
        accessorKey: 'leave_date',
        header: 'Leave Date(s)',
        sortable: true,
        width: '220px',
        cell: ({ value, row }) => {
          const dateList = row.leave_dates_str
            ? String(row.leave_dates_str)
                .split(',')
                .map((d) => d.trim())
                .filter(Boolean)
            : [];

          if (dateList.length > 1) {
            return (
              <span style={{ fontSize: '13.5px' }} className="text-dark fw-medium">
                {formatLocalDate(dateList[0])} – {formatLocalDate(dateList[dateList.length - 1])}
              </span>
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
        width: '150px',
        align: 'center',
        sortable: true,
        cell: ({ row }) => renderStatusBadge(row),
      },
      {
        key: 'actions',
        header: 'Action',
        width: '90px',
        align: 'center',
        sortable: false,
        cell: ({ row }) => (
          <TableActionMenu
            items={[
              {
                label: 'View Details',
                icon: 'ti ti-eye text-info',
                to: `/teacher/leaves/details/${encodeParam(row.id)}`,
              },
            ]}
          />
        ),
      },
    ],
    []
  );

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">My Leaves</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/teacher/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Leaves</li>
              <li className="breadcrumb-item active" aria-current="page">
                My Leaves
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
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

          <Link to="/teacher/leaves/apply" className="btn btn-primary d-flex align-items-center">
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
                <p className="fs-12 fw-medium text-muted mb-1">Pending</p>
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

      {/* Main DataTable */}
      <DataTable
        title="Leave History & Applications"
        subtitle="Track your submitted leave requests, approval statuses, and dates."
        columns={columns}
        data={leaves}
        loading={loading}
        selectable={false}
        searchPlaceholder="Search by leave type or date..."
        emptyMessage="No leave requests submitted yet."
      />
    </div>
  );
};

export default TeacherMyLeaves;
