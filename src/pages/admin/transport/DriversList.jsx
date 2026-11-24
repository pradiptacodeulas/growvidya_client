import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchDriversApi,
  deleteDriverApi,
} from '../../../api/adminTransport.api';
import DataTable from '../../../components/common/DataTable';
import TableActionMenu from '../../../components/common/TableActionMenu';
import { encodeParam } from '../../../utils/idHelper';
import { resolveImageUrl } from '../../../utils/url.util';

const DriversList = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Delete Modal
  const [deleteModal, setDeleteModal] = useState({
    show: false,
    id: null,
    processing: false,
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchDriversApi();
      setDrivers(res?.data?.drivers || res?.drivers || []);
    } catch (err) {
      if (err?.isFeatureNotInPlan || err?.response?.data?.errors?.code === 'FEATURE_NOT_IN_PLAN') {
        toast.warning(err);
      } else {
        toast.error('Failed to load driver list.');
      }
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
      await deleteDriverApi(deleteModal.id);
      toast.success('Driver deleted successfully!');
      setDeleteModal({ show: false, id: null, processing: false });
      loadData();
    } catch (err) {
      toast.error('Failed to delete driver.');
      setDeleteModal((prev) => ({ ...prev, processing: false }));
    }
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
        header: 'Name',
        sortable: true,
        cell: ({ row }) => {
          const fullName = `${row.first_name || ''} ${row.last_name || ''}`.trim() || '—';
          return (
            <Link
              to={`/admin/transport/driver/edit/${encodeParam(row.id)}`}
              className="fw-semibold text-primary text-decoration-none"
            >
              {fullName}
            </Link>
          );
        },
      },
      {
        accessorKey: 'email',
        header: 'Email',
        sortable: true,
        cell: ({ value }) => <span className="text-dark">{value || '—'}</span>,
      },
      {
        accessorKey: 'phone',
        header: 'Phone',
        sortable: true,
        cell: ({ value }) => <span className="text-dark">{value || '—'}</span>,
      },
      {
        accessorKey: 'license_number',
        header: 'License Details',
        sortable: true,
        cell: ({ row }) => {
          const licNum = row.license_number || '—';
          return (
            <div className="d-flex align-items-center gap-1.5">
              <span className="badge bg-light text-dark border px-2 py-1">{licNum}</span>
              {row.lisence_doc && (
                <a
                  href={resolveImageUrl(row.lisence_doc)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-xs btn-outline-primary px-1.5 py-0.5"
                  title="View Driving License Document"
                >
                  <i className="ti ti-file-certificate fs-13"></i>
                </a>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'id_proof_type',
        header: 'Govt ID Proof',
        sortable: true,
        cell: ({ row }) => {
          if (!row.id_proof_type && !row.id_proof_number && !row.id_proof_doc) {
            return <span className="text-muted">—</span>;
          }
          return (
            <div className="d-flex align-items-center gap-1.5">
              <div>
                <span className="badge bg-light text-primary border px-2 py-0.5 fs-11 d-block mb-0.5">
                  {row.id_proof_type || 'Govt ID'}
                </span>
                {row.id_proof_number && (
                  <span className="text-muted fs-11">{row.id_proof_number}</span>
                )}
              </div>
              {row.id_proof_doc && (
                <a
                  href={resolveImageUrl(row.id_proof_doc)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-xs btn-outline-secondary px-1.5 py-0.5"
                  title="View Government ID Document"
                >
                  <i className="ti ti-file-text fs-13"></i>
                </a>
              )}
            </div>
          );
        },
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
        cell: ({ row }) => {
          const extraItems = [];
          if (row.lisence_doc) {
            extraItems.push({
              label: 'View License Doc',
              icon: 'ti ti-file-certificate text-info',
              onClick: () => window.open(resolveImageUrl(row.lisence_doc), '_blank'),
            });
          }
          if (row.id_proof_doc) {
            extraItems.push({
              label: 'View ID Proof Doc',
              icon: 'ti ti-file-text text-secondary',
              onClick: () => window.open(resolveImageUrl(row.id_proof_doc), '_blank'),
            });
          }

          return (
            <TableActionMenu
              items={[
                {
                  label: 'Edit',
                  icon: 'ti ti-edit-circle text-primary',
                  to: `/admin/transport/driver/edit/${encodeParam(row.id)}`,
                },
                ...extraItems,
                {
                  label: 'Delete',
                  icon: 'ti ti-trash-x',
                  variant: 'danger',
                  onClick: () => setDeleteModal({ show: true, id: row.id, processing: false }),
                },
              ]}
            />
          );
        },
      },
    ],
    []
  );

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-4">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Drivers List</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Transport</li>
              <li className="breadcrumb-item active" aria-current="page">
                Drivers
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

          <Link
            to="/admin/transport/driver/add"
            className="btn btn-primary d-flex align-items-center"
          >
            <i className="ti ti-square-rounded-plus me-2"></i>Add Driver
          </Link>
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        title="All Drivers"
        subtitle="Manage licensed vehicle drivers and transport staff."
        columns={columns}
        data={drivers}
        loading={loading}
        searchPlaceholder="Search by name, email, phone, or license..."
        emptyMessage="No drivers registered in the system."
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
                <h4 className="mb-2">Delete Driver</h4>
                <p className="text-muted mb-4">
                  Are you sure you want to delete this driver? This action cannot be undone.
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

export default DriversList;
