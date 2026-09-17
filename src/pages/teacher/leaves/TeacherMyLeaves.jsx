import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchTeacherMyLeavesApi, fetchTeacherLeaveByIdApi } from '../../../api/teacherLeave.api';
import { getServerBaseUrl } from '../../../utils/url.util';
import DataTable from '../../../components/common/DataTable';
import TableActionMenu from '../../../components/common/TableActionMenu';

const SERVER_BASE_URL = getServerBaseUrl();

const TeacherMyLeaves = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [viewModal, setViewModal] = useState({ show: false, leave: null, loading: false });

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

  const handleViewStatus = async (leave) => {
    setViewModal({ show: true, leave: leave, loading: true });
    try {
      const res = await fetchTeacherLeaveByIdApi(leave.id);
      if (res?.data?.leave) {
        setViewModal({ show: true, leave: res.data.leave, loading: false });
      } else {
        setViewModal((prev) => ({ ...prev, loading: false }));
      }
    } catch (err) {
      setViewModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const renderStatusBadge = (row) => {
    if (Number(row.duration) === 3) {
      return (
        <span
          onClick={() => handleViewStatus(row)}
          className="text-primary text-decoration-underline fw-medium cursor-pointer"
          style={{ cursor: 'pointer' }}
        >
          View Status
        </span>
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

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (leaves.length === 0) return toast.info('No leaves to export');
    let csv = 'Sl No.,Leave Type,Duration,Status,Date\n';
    leaves.forEach((l, idx) => {
      const statusText =
        Number(l.leave_status) === 2
          ? 'Approved'
          : Number(l.leave_status) === 3
          ? 'Rejected'
          : 'Pending';
      csv += `"${idx + 1}","${l.leave_name || ''}","${l.duration_label || ''}","${statusText}","${l.leave_date ? l.leave_date.split('T')[0] : ''}"\n`;
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
          <span
            onClick={() => handleViewStatus(row)}
            className="fw-semibold text-primary cursor-pointer text-decoration-none"
            style={{ cursor: 'pointer' }}
          >
            {value || 'General Leave'}
          </span>
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
                onClick: () => handleViewStatus(row),
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
          <button
            type="button"
            className="btn btn-outline-light bg-white btn-icon shadow-2xs"
            onClick={handlePrint}
            title="Print"
          >
            <i className="ti ti-printer"></i>
          </button>

          <TableActionMenu
            trigger={
              <span className="btn btn-light fw-medium d-inline-flex align-items-center">
                <i className="ti ti-file-export me-2"></i>Export
              </span>
            }
            items={[
              {
                label: 'Export as PDF',
                icon: 'ti ti-file-type-pdf text-danger',
                onClick: handlePrint,
              },
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

      {/* View Status Modal */}
      {viewModal.show && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Leave Application Details</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setViewModal({ show: false, leave: null, loading: false })}
                ></button>
              </div>
              <div className="modal-body p-4">
                {viewModal.loading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status"></div>
                  </div>
                ) : viewModal.leave ? (
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div>
                        <span className="text-muted fs-12 d-block">Leave Type:</span>
                        <h6 className="fw-bold mb-0 text-dark">
                          {viewModal.leave.leave_name || 'Leave'}
                        </h6>
                      </div>
                      <div>
                        {renderStatusBadge(viewModal.leave)}
                      </div>
                    </div>

                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <span className="text-muted fs-12 d-block">Duration:</span>
                        <strong className="text-dark">
                          {viewModal.leave.duration_label ||
                            (Number(viewModal.leave.duration) === 3
                              ? 'Multiple Days'
                              : Number(viewModal.leave.duration) === 2
                              ? 'Half Day'
                              : 'Full Day')}
                        </strong>
                      </div>
                      <div className="col-6">
                        <span className="text-muted fs-12 d-block">Date:</span>
                        <strong className="text-dark">
                          {viewModal.leave.leave_date
                            ? viewModal.leave.leave_date.split('T')[0]
                            : '—'}
                        </strong>
                      </div>
                    </div>

                    <div className="mb-3">
                      <span className="text-muted fs-12 d-block mb-1">Reason:</span>
                      <p className="bg-light p-2 rounded text-dark fs-13 mb-0">
                        {viewModal.leave.reason || 'No reason specified.'}
                      </p>
                    </div>

                    {viewModal.leave.admin_remark && (
                      <div className="mb-3">
                        <span className="text-muted fs-12 d-block mb-1">Admin Remark:</span>
                        <p className="bg-warning-subtle text-dark p-2 rounded fs-13 mb-0">
                          {viewModal.leave.admin_remark}
                        </p>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={() => setViewModal({ show: false, leave: null, loading: false })}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherMyLeaves;
