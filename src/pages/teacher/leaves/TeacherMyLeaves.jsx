import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchTeacherMyLeavesApi } from '../../../api/teacherLeave.api';
import { encodeParam } from '../../../utils/idHelper';
import DataTable from '../../../components/common/DataTable';
import TableActionMenu from '../../../components/common/TableActionMenu';

const TeacherMyLeaves = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

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

  const handleSelectAll = () => {
    if (selectedIds.length === leaves.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(leaves.map((l) => l.id));
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const renderStatusBadge = (row) => {
    if (Number(row.duration) === 3) {
      return (
        <Link
          to={`/teacher/leaves/details/${encodeParam(row.id)}`}
          className="text-primary text-decoration-underline fw-medium"
        >
          View Status
        </Link>
      );
    }
    const status = Number(row.leave_status);
    if (status === 2) {
      return (
        <span className="badge-soft-success">
          <i className="ti ti-circle-check fs-12 me-1"></i>Approved
        </span>
      );
    }
    if (status === 3) {
      return (
        <span className="badge-soft-danger">
          <i className="ti ti-circle-x fs-12 me-1"></i>Rejected
        </span>
      );
    }
    return (
      <span className="badge-soft-warning">
        <i className="ti ti-clock fs-12 me-1"></i>Pending
      </span>
    );
  };


  const handleExportCSV = () => {
    if (leaves.length === 0) return toast.info('No leaves to export');
    let csv = 'Sl No.,Leave Type,Pay Type,Duration,Status,Date\n';
    leaves.forEach((l, idx) => {
      const statusText =
        Number(l.leave_status) === 2
          ? 'Approved'
          : Number(l.leave_status) === 3
          ? 'Rejected'
          : 'Pending';
      const payType = Number(l.is_paid) === 0 ? 'Non-Paid' : 'Paid';
      csv += `"${idx + 1}","${l.leave_name || ''}","${payType}","${l.duration_label || ''}","${statusText}","${l.leave_date ? l.leave_date.split('T')[0] : ''}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `My_Leaves_${new Date().toISOString().split('T')[0]}.csv`;
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
          <div className="d-flex align-items-center gap-2">
            <Link
              to={`/teacher/leaves/details/${encodeParam(row.id)}`}
              className="fw-semibold text-primary text-decoration-none"
            >
              {value || 'General Leave'}
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
        width: '120px',
        align: 'center',
        cell: ({ row }) => (
          <span className="badge bg-light text-secondary border">
            {row.duration_label || (Number(row.duration) === 3 ? 'Multiple' : Number(row.duration) === 2 ? 'Half Day' : 'Full Day')}
          </span>
        ),
      },
      {
        accessorKey: 'leave_status',
        header: 'Status',
        width: '130px',
        align: 'center',
        sortable: true,
        cell: ({ row }) => renderStatusBadge(row),
      },
      {
        accessorKey: 'leave_date',
        header: 'Date',
        sortable: true,
        cell: ({ value }) => (
          <span className="text-muted fs-13">{value ? value.split('T')[0] : '—'}</span>
        ),
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
      <div className="d-md-flex d-block align-items-center justify-content-between mb-4">
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

          <TableActionMenu
            trigger={
              <span className="btn btn-light fw-medium d-inline-flex align-items-center">
                <i className="ti ti-file-export me-2"></i>Export
              </span>
            }
            items={[
              {
                label: 'Export as Excel',
                icon: 'ti ti-file-type-xls text-success',
                onClick: handleExportCSV,
              },
            ]}
          />

          <Link
            to="/teacher/leaves/apply"
            className="btn btn-primary d-flex align-items-center"
          >
            <i className="ti ti-square-rounded-plus me-2"></i>Apply Leave
          </Link>
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        title="Leave History & Applications"
        subtitle="Track submitted time-off requests, approvals, and day balances."
        columns={columns}
        data={leaves}
        loading={loading}
        selectable={true}
        selectedIds={selectedIds}
        onSelectRow={handleSelectRow}
        onSelectAll={handleSelectAll}
        searchPlaceholder="Search by leave type or date..."
        emptyMessage="No leave requests submitted yet."
      />
    </div>
  );
};

export default TeacherMyLeaves;
