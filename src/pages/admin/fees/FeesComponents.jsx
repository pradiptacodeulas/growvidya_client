import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminFeesApi from '../../../api/adminFees.api';

const FeesComponents = () => {
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

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
      console.error('Failed to load fee components:', err);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.warning('Please enter Component Name.');
      return;
    }

    try {
      setSaving(true);
      if (modalMode === 'add') {
        await adminFeesApi.createComponent(formData);
        toast.success('Fee component created successfully.');
      } else {
        await adminFeesApi.updateComponent(currentId, formData);
        toast.success('Fee component updated successfully.');
      }
      setShowModal(false);
      fetchComponents();
    } catch (err) {
      console.error('Failed to save component:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to save component.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await adminFeesApi.deleteComponent(id);
      toast.success('Fee component deleted successfully.');
      fetchComponents();
    } catch (err) {
      console.error('Failed to delete component:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to delete component.');
    }
  };

  // Filter & Pagination
  const filteredComponents = useMemo(() => {
    if (!searchTerm.trim()) return components;
    const term = searchTerm.toLowerCase();
    return components.filter(
      (c) =>
        c.name?.toLowerCase().includes(term) ||
        c.code?.toLowerCase().includes(term) ||
        c.account_code?.toLowerCase().includes(term) ||
        c.description?.toLowerCase().includes(term)
    );
  }, [components, searchTerm]);

  const totalPages = Math.ceil(filteredComponents.length / pageSize) || 1;
  const paginatedComponents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredComponents.slice(start, start + pageSize);
  }, [filteredComponents, currentPage, pageSize]);

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">
            <i className="ti ti-list-details me-2 text-primary"></i>Fee Components (Headings)
          </h3>
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
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
          <div className="pe-1 mb-2">
            <button
              type="button"
              onClick={fetchComponents}
              className="btn btn-outline-light bg-white btn-icon me-1"
              title="Refresh"
            >
              <i className="ti ti-refresh"></i>
            </button>
          </div>
          <div className="mb-2">
            <button
              type="button"
              className="btn btn-primary d-flex align-items-center"
              onClick={handleOpenAddModal}
            >
              <i className="ti ti-plus me-1"></i> Add Fee Head / Component
            </button>
          </div>
        </div>
      </div>
      {/* /Page Header */}

      {/* Main Card */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white py-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h5 className="mb-0 text-dark fw-bold">Individual Line Items / Billable Headings</h5>
          <div className="d-flex align-items-center gap-2">
            <input
              type="search"
              className="form-control form-control-sm"
              placeholder="Search components..."
              style={{ width: '220px' }}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '60px' }}>#</th>
                  <th>Component Name</th>
                  <th>Code</th>
                  <th>Account Code</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th style={{ width: '150px' }} className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-4 text-muted">
                      <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
                      Loading fee components...
                    </td>
                  </tr>
                ) : paginatedComponents.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-4 text-muted">
                      No fee components configured yet. Click "Add Fee Head" to create one.
                    </td>
                  </tr>
                ) : (
                  paginatedComponents.map((comp, idx) => (
                    <tr key={comp.id}>
                      <td>{(currentPage - 1) * pageSize + idx + 1}</td>
                      <td className="fw-bold text-dark">{comp.name}</td>
                      <td>
                        <span className="badge bg-light text-dark border">
                          {comp.code || '-'}
                        </span>
                      </td>
                      <td>
                        <code>{comp.account_code || '-'}</code>
                      </td>
                      <td>
                        <small className="text-muted">{comp.description || '-'}</small>
                      </td>
                      <td>
                        {comp.status === 1 ? (
                          <span className="badge bg-success">Active</span>
                        ) : (
                          <span className="badge bg-secondary">Inactive</span>
                        )}
                      </td>
                      <td className="text-center">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary me-1"
                          onClick={() => handleOpenEditModal(comp)}
                          title="Edit"
                        >
                          <i className="ti ti-edit"></i> Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete(comp.id, comp.name)}
                          title="Delete"
                        >
                          <i className="ti ti-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {filteredComponents.length > pageSize && (
            <div className="p-3 border-top d-flex justify-content-between align-items-center flex-wrap">
              <span className="text-muted fs-13">
                Showing {(currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, filteredComponents.length)} of{' '}
                {filteredComponents.length} entries
              </span>
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    Prev
                  </button>
                </li>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <li key={p} className={`page-item ${currentPage === p ? 'active' : ''}`}>
                    <button className="page-link" onClick={() => setCurrentPage(p)}>
                      {p}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Component Modal */}
      {showModal && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          tabIndex="-1"
          role="dialog"
        >
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content border-0 shadow-lg">
              <form onSubmit={handleSubmit}>
                <div className="modal-header bg-primary text-white">
                  <h5 className="modal-title text-white fw-bold">
                    <i className="ti ti-list-details me-2"></i>
                    {modalMode === 'add' ? 'Add Fee Component' : 'Edit Fee Component'}
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setShowModal(false)}
                  ></button>
                </div>

                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Component Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Tuition Fee, Transport Fee, Lab Charges"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Code / Short Alias</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. TFEE, LAB, ADM"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Account / Ledger Code</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 10100, ACC-401"
                      value={formData.account_code}
                      onChange={(e) => setFormData({ ...formData, account_code: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Description</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      placeholder="Brief note about this line item..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    ></textarea>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Status</label>
                    <select
                      className="form-select"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: parseInt(e.target.value, 10) })}
                    >
                      <option value="1">Active</option>
                      <option value="2">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="ti ti-check me-1"></i> Save Component
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeesComponents;
