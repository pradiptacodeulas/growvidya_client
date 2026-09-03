import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchHelpersApi,
  deleteHelperApi,
} from '../../../api/adminTransport.api';
import DataTable from '../../../components/common/DataTable';
import TableActionMenu from '../../../components/common/TableActionMenu';
import { encodeParam } from '../../../utils/idHelper';

const HelpersList = () => {
  const [helpers, setHelpers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);

  // Delete Modal
  const [deleteModal, setDeleteModal] = useState({
    show: false,
    id: null,
    processing: false,
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchHelpersApi();
      setHelpers(res?.data?.helpers || res?.helpers || []);
    } catch (err) {
      toast.error('Failed to load helpers list.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async () => {
    try {
      setDeleteModal((prev) => ({ ...prev, processing: true }));
      await deleteHelperApi(deleteModal.id);
      toast.success('Helper deleted successfully!');
      setDeleteModal({ show: false, id: null, processing: false });
      loadData();
    } catch (err) {
      toast.error('Failed to delete helper.');
      setDeleteModal((prev) => ({ ...prev, processing: false }));
    }
  };

  const handleSelectAll = () => {
    if (selectedRows.length === helpers.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(helpers.map((h) => h.id));
    }
  };

  const handleToggleRow = (id) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handlePrint = () => {
    window.print();
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
        accessorKey: 'first_name',
        header: 'Helper Name',
        sortable: true,
        cell: ({ row }) => {
          const fullName = `${row.first_name || ''} ${row.last_name || ''}`.trim() || '—';
          return (
            <Link
              to={`/admin/transport/helper/edit/${encodeParam(row.id)}`}
              className="fw-semibold text-primary text-decoration-none"
            >
              {fullName}
            </Link>
          );
        },
      },
      {
        accessorKey: 'phone',
        header: 'Phone Number',
        sortable: true,
        cell: ({ value }) => <span className="text-dark">{value || '—'}</span>,
      },
      {
        accessorKey: 'license_number',
        header: 'License Number',
        sortable: true,
        cell: ({ value }) => (
          <span className="badge bg-light text-dark border px-2.5 py-1.5">{value || '—'}</span>
        ),
      },
      {
        accessorKey: 'gender',
        header: 'Gender',
        sortable: true,
        width: '100px',
        align: 'center',
        cell: ({ value }) => <span className="text-muted">{value || '—'}</span>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        width: '120px',
        align: 'center',
        sortable: true,
        cell: ({ value }) => {
          const isActive = Number(value) === 1;
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
                icon: 'ti ti-edit-circle text-primary',
                to: `/admin/transport/helper/edit/${encodeParam(row.id)}`,
              },
              {
                label: 'Delete',
                icon: 'ti ti-trash-x',
                variant: 'danger',
                onClick: () => setDeleteModal({ show: true, id: row.id, processing: false }),
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
          <h3 className="page-title mb-1">Helpers List</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Transport</li>
              <li className="breadcrumb-item active" aria-current="page">
                Helpers
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline-light bg-white btn-icon shadow-2xs"
            onClick={loadData}
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

          <Link
            to="/admin/transport/helper/add"
            className="btn btn-primary d-flex align-items-center"
          >
            <i className="ti ti-square-rounded-plus me-2"></i>Add Helper
          </Link>
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        title="All Helpers"
        subtitle="Manage transport bus attendants and helper staff."
        columns={columns}
        data={helpers}
        loading={loading}
        selectable={true}
        selectedIds={selectedRows}
        onSelectRow={handleToggleRow}
        onSelectAll={handleSelectAll}
        searchPlaceholder="Search by name, phone, or license..."
        emptyMessage="No helpers registered in the system."
      />

      {/* Delete Modal */}
      {deleteModal.show && (
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
                  onClick={() => setDeleteModal({ show: false, id: null, processing: false })}
                  aria-label="Close"
                  disabled={deleteModal.processing}
                ></button>
              </div>
              <div className="modal-body text-center pt-0 pb-4">
                <div className="text-danger mb-3">
                  <i className="ti ti-trash-x fs-48"></i>
                </div>
                <h4 className="mb-2">Delete Helper</h4>
                <p className="text-muted mb-4">
                  Are you sure you want to delete this helper? This action cannot be undone.
                </p>
                <div className="d-flex justify-content-center gap-2">
                  <button
                    type="button"
                    className="btn btn-light px-4"
                    onClick={() => setDeleteModal({ show: false, id: null, processing: false })}
                    disabled={deleteModal.processing}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger px-4"
                    onClick={handleDelete}
                    disabled={deleteModal.processing}
                  >
                    {deleteModal.processing ? (
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

export default HelpersList;
