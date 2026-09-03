import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminAcademicApi, { deletePeriodApi } from '../../../api/adminAcademic.api';
import DataTable from '../../../components/common/DataTable';
import TableActionMenu from '../../../components/common/TableActionMenu';
import { encodeParam } from '../../../utils/idHelper';

const formatTime12 = (timeStr) => {
  if (!timeStr) return '--:--';
  const cleanStr = String(timeStr).trim();
  const parts = cleanStr.split(':');
  if (parts.length >= 2) {
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    if (isNaN(hours)) return timeStr;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  }
  return timeStr;
};

const PeriodsList = () => {
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [periodToDelete, setPeriodToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchPeriods();
  }, []);

  const fetchPeriods = async () => {
    try {
      setLoading(true);
      const res = await adminAcademicApi.fetchPeriodsApi();
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setPeriods(list);
    } catch (err) {
      toast.error('Failed to load periods.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === periods.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(periods.map((p) => p.id));
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    if (periods.length === 0) return toast.info('No periods to export');
    let csv = 'Sl No.,Period Name,Shift,Class,Start Time,End Time,Status\n';
    periods.forEach((p, idx) => {
      csv += `"${idx + 1}","${p.period_name || ''}","${p.shift_name || ''}","${p.class_name || ''}","${formatTime12(p.start_time)}","${formatTime12(p.end_time)}","${p.status === 1 ? 'Active' : 'Inactive'}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Periods_List_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const confirmDelete = (period) => {
    setPeriodToDelete(period);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!periodToDelete) return;
    try {
      setDeleting(true);
      await deletePeriodApi(periodToDelete.id);
      toast.success(`Period ${periodToDelete.period_name} deleted successfully.`);
      setDeleteModalOpen(false);
      setPeriodToDelete(null);
      fetchPeriods();
    } catch (err) {
      toast.error(err.message || 'Failed to delete period.');
    } finally {
      setDeleting(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'index',
        header: 'Sl No.',
        width: '80px',
        align: 'center',
        cell: ({ index }) => <span className="text-muted fw-medium">{index + 1}</span>,
      },
      {
        accessorKey: 'period_name',
        header: 'Period Name',
        sortable: true,
        cell: ({ value, row }) => (
          <Link
            to={`/admin/academics/periods/edit/${encodeParam(row.id)}`}
            className="fw-semibold text-primary text-decoration-none"
          >
            {value}
          </Link>
        ),
      },
      {
        accessorKey: 'shift_name',
        header: 'Shift',
        sortable: true,
        cell: ({ value }) => <span className="text-dark">{value || 'Default Shift'}</span>,
      },
      {
        accessorKey: 'class_name',
        header: 'Class',
        sortable: true,
        cell: ({ value }) => (
          <span className="badge bg-light text-dark border px-2.5 py-1.5">{value || 'All Classes'}</span>
        ),
      },
      {
        accessorKey: 'start_time',
        header: 'Start Time',
        sortable: true,
        cell: ({ value }) => (
          <span className="badge bg-light text-dark border px-2.5 py-1.5">
            <i className="ti ti-clock me-1 text-muted"></i>
            {formatTime12(value)}
          </span>
        ),
      },
      {
        accessorKey: 'end_time',
        header: 'End Time',
        sortable: true,
        cell: ({ value }) => (
          <span className="badge bg-light text-dark border px-2.5 py-1.5">
            <i className="ti ti-clock me-1 text-muted"></i>
            {formatTime12(value)}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        width: '120px',
        align: 'center',
        sortable: true,
        cell: ({ value }) => {
          const isActive = value === 1 || value === '1' || value === true;
          return (
            <span className={isActive ? 'badge-soft-success' : 'badge-soft-danger'}>
              <i className={`ti ${isActive ? 'ti-circle-check' : 'ti-circle-x'} fs-12 me-1`}></i>
              {isActive ? 'Active' : 'Inactive'}
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
        cell: ({ row }) => (
          <TableActionMenu
            items={[
              {
                label: 'Edit',
                icon: 'ti ti-edit-circle',
                to: `/admin/academics/periods/edit/${encodeParam(row.id)}`,
              },
              {
                label: 'Delete',
                icon: 'ti ti-trash-x',
                variant: 'danger',
                onClick: () => confirmDelete(row),
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
          <h3 className="page-title mb-1">Period List</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Academic</li>
              <li className="breadcrumb-item active" aria-current="page">
                All Periods
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline-light bg-white btn-icon shadow-2xs"
            onClick={fetchPeriods}
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
                onClick: handleExportExcel,
              },
            ]}
          />

          <Link
            to="/admin/academics/periods/add"
            className="btn btn-primary d-flex align-items-center"
          >
            <i className="ti ti-square-rounded-plus me-2"></i>Add Period
          </Link>
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        title="All Periods"
        subtitle="Manage routine class periods and session timings."
        columns={columns}
        data={periods}
        loading={loading}
        selectable={true}
        selectedIds={selectedIds}
        onSelectRow={handleSelectRow}
        onSelectAll={handleSelectAll}
        searchPlaceholder="Search by period, class, or shift..."
        emptyMessage="No periods found in the system."
      />

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header border-0 pb-0">
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setDeleteModalOpen(false)}
                  aria-label="Close"
                  disabled={deleting}
                ></button>
              </div>
              <div className="modal-body text-center pt-0 pb-4">
                <div className="text-danger mb-3">
                  <i className="ti ti-trash-x fs-48"></i>
                </div>
                <h4 className="mb-2">Delete Period</h4>
                <p className="text-muted mb-4">
                  Are you sure you want to delete <strong>{periodToDelete?.period_name}</strong>? This action cannot be undone.
                </p>
                <div className="d-flex justify-content-center gap-2">
                  <button
                    type="button"
                    className="btn btn-light px-4"
                    onClick={() => setDeleteModalOpen(false)}
                    disabled={deleting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger px-4"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                        Deleting...
                      </>
                    ) : (
                      'Delete'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PeriodsList;
