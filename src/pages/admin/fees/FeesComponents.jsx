import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminFeesApi from '../../../api/adminFees.api';
import DataTable from '../../../components/common/DataTable';
import TableActionMenu from '../../../components/common/TableActionMenu';

const FeesComponents = () => {
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [saving, setSaving] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    account_code: '',
    description: '',
    status: 1,
  });

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState({
    show: false,
    id: null,
    name: '',
    processing: false,
  });

  useEffect(() => {
    fetchComponents();
  }, []);

  const fetchComponents = async () => {
    try {
      setLoading(true);
      const res = await adminFeesApi.getAllComponents();
      const list = res?.data?.components || [];
      setComponents(list);
    } catch (err) {
      toast.error(err.message || 'Failed to load fee components');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setModalMode('add');
    setCurrentId(null);
    setFormData({
      name: '',
      code: '',
      account_code: '',
      description: '',
      status: 1,
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (comp) => {
    setModalMode('edit');
    setCurrentId(comp.id);
    setFormData({
      name: comp.name || '',
      code: comp.code || '',
      account_code: comp.account_code || '',
      description: comp.description || '',
      status: comp.status !== undefined ? comp.status : 1,
    });
    setShowModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? 1 : 0) : value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Component Name is required.');
      return;
    }

    try {
      setSaving(true);
      await adminFeesApi.saveComponent({ ...formData, id: currentId });
      toast.success(
        modalMode === 'add'
          ? 'Fee component created successfully.'
          : 'Fee component updated successfully.'
      );
      setShowModal(false);
      fetchComponents();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save component.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.id) return;
    try {
      setDeleteModal((prev) => ({ ...prev, processing: true }));
      await adminFeesApi.deleteComponent(deleteModal.id);
      toast.success('Fee component deleted successfully.');
      setDeleteModal({ show: false, id: null, name: '', processing: false });
      fetchComponents();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to delete component.');
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
        accessorKey: 'name',
        header: 'Component Name',
        sortable: true,
        cell: ({ value, row }) => (
          <span
            onClick={() => handleOpenEditModal(row)}
            className="fw-semibold text-primary cursor-pointer text-decoration-none"
            style={{ cursor: 'pointer' }}
          >
            {value}
          </span>
        ),
      },
      {
        accessorKey: 'code',
        header: 'Code',
        sortable: true,
        cell: ({ value }) => (
          <span className="badge bg-light text-dark border px-2.5 py-1.5">{value || '—'}</span>
        ),
      },
      {
        accessorKey: 'account_code',
        header: 'Account Code',
        sortable: true,
        cell: ({ value }) => <code className="text-secondary">{value || '—'}</code>,
      },
      {
        accessorKey: 'description',
        header: 'Description',
        cell: ({ value }) => <span className="text-muted fs-13">{value || '—'}</span>,
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
                onClick: () => handleOpenEditModal(row),
              },
              {
                label: 'Delete',
                icon: 'ti ti-trash-x',
                variant: 'danger',
                onClick: () =>
                  setDeleteModal({
                    show: true,
                    id: row.id,
                    name: row.name,
                    processing: false,
                  }),
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
          <h3 className="page-title mb-1">Fee Components</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/fees/dashboard">Fees</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Fee Components
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline-light bg-white btn-icon shadow-2xs"
            onClick={fetchComponents}
            title="Refresh"
          >
            <i className="ti ti-refresh"></i>
          </button>

          <button className="btn btn-primary d-flex align-items-center" onClick={handleOpenAddModal}>
            <i className="ti ti-square-rounded-plus me-2"></i>Add Fee Head
          </button>
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        title="Fee Heads & Components"
        subtitle="Manage master fee line items (Tuition, Library, Exam, Sports, etc.)."
        columns={columns}
        data={components}
        loading={loading}
        searchPlaceholder="Search fee components..."
        emptyMessage="No fee components configured yet. Click 'Add Fee Head' to create one."
      />

      {/* Modal for Add / Edit */}
      {showModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  {modalMode === 'add' ? 'Add Fee Component' : 'Edit Fee Component'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                ></button>
              </div>

              <form onSubmit={handleSave}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Component Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      className="form-control"
                      placeholder="e.g. Tuition Fee, Library Fee, Lab Fee"
                      value={formData.name}
                      onChange={handleFormChange}
                      required
                    />
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label fw-semibold">Short Code</label>
                      <input
                        type="text"
                        name="code"
                        className="form-control text-uppercase"
                        placeholder="e.g. TF, LF"
                        value={formData.code}
                        onChange={handleFormChange}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-semibold">Ledger / Account Code</label>
                      <input
                        type="text"
                        name="account_code"
                        className="form-control"
                        placeholder="e.g. ACC-101"
                        value={formData.account_code}
                        onChange={handleFormChange}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Description</label>
                    <textarea
                      name="description"
                      className="form-control"
                      rows="3"
                      placeholder="Optional notes or details..."
                      value={formData.description}
                      onChange={handleFormChange}
                    ></textarea>
                  </div>

                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      name="status"
                      id="statusSwitch"
                      checked={formData.status === 1}
                      onChange={handleFormChange}
                    />
                    <label className="form-check-label fw-semibold" htmlFor="statusSwitch">
                      Active Component
                    </label>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => setShowModal(false)}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                        Saving...
                      </>
                    ) : modalMode === 'add' ? (
                      'Create Component'
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0">
              <div className="modal-header border-0 pb-0">
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setDeleteModal({ show: false, id: null, name: '', processing: false })}
                  disabled={deleteModal.processing}
                ></button>
              </div>
              <div className="modal-body text-center pt-0 pb-4">
                <div className="text-danger mb-3">
                  <i className="ti ti-trash-x fs-48"></i>
                </div>
                <h4 className="mb-2">Delete Fee Component</h4>
                <p className="text-muted mb-4">
                  Are you sure you want to delete <strong>{deleteModal.name}</strong>? This action cannot be undone.
                </p>
                <div className="d-flex justify-content-center gap-2">
                  <button
                    type="button"
                    className="btn btn-light px-4"
                    onClick={() => setDeleteModal({ show: false, id: null, name: '', processing: false })}
                    disabled={deleteModal.processing}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger px-4"
                    onClick={handleDeleteConfirm}
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

export default FeesComponents;
