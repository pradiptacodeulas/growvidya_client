import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchLeaveTypesApi,
  createLeaveTypeApi,
  updateLeaveTypeApi,
  deleteLeaveTypeApi,
} from '../../../api/adminLeave.api';

const LeaveTypes = () => {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal State
  const [modal, setModal] = useState({
    show: false,
    isEdit: false,
    id: null,
    submitting: false,
    form: {
      role: '1',
      leave_name: '',
      no_leave: '1',
      need_document: '0',
      sort_order: '1',
      status: '1',
    },
  });

  const [deleteModal, setDeleteModal] = useState({ show: false, id: null, processing: false });

  const loadTypes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchLeaveTypesApi();
      setTypes(res?.data?.types || []);
    } catch (err) {
      console.error('Error fetching leave assigns:', err);
      toast.error('Failed to load leave assigns.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTypes();
  }, [loadTypes]);

  const openAddModal = () => {
    setModal({
      show: true,
      isEdit: false,
      id: null,
      submitting: false,
      form: {
        role: '1',
        leave_name: '',
        no_leave: '1',
        need_document: '0',
        sort_order: '1',
        status: '1',
      },
    });
  };

  const openEditModal = (lt) => {
    setModal({
      show: true,
      isEdit: true,
      id: lt.id,
      submitting: false,
      form: {
        role: String(lt.role || '1'),
        leave_name: lt.leave_name || '',
        no_leave: String(lt.no_leave || '1'),
        need_document: String(lt.need_document || '0'),
        sort_order: String(lt.sort_order || '1'),
        status: String(lt.status !== undefined ? lt.status : '1'),
      },
    });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!modal.form.leave_name.trim()) {
      toast.warning('Leave Name is required.');
      return;
    }

    try {
      setModal((prev) => ({ ...prev, submitting: true }));
      if (modal.isEdit) {
        await updateLeaveTypeApi(modal.id, modal.form);
        toast.success('Leave assign updated successfully!');
      } else {
        await createLeaveTypeApi(modal.form);
        toast.success('Leave assign created successfully!');
      }
      setModal((prev) => ({ ...prev, show: false, submitting: false }));
      loadTypes();
    } catch (err) {
      console.error('Error saving leave assign:', err);
      toast.error('Failed to save leave assign.');
      setModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  const confirmDelete = async () => {
    try {
      setDeleteModal((prev) => ({ ...prev, processing: true }));
      await deleteLeaveTypeApi(deleteModal.id);
      toast.success('Leave assign deleted successfully!');
      setDeleteModal({ show: false, id: null, processing: false });
      loadTypes();
    } catch (err) {
      console.error('Error deleting leave assign:', err);
      toast.error('Failed to delete leave assign.');
      setDeleteModal((prev) => ({ ...prev, processing: false }));
    }
  };

  // Filtered & Paginated records
  const filteredTypes = useMemo(() => {
    if (!searchQuery.trim()) return types;
    const q = searchQuery.toLowerCase();
    return types.filter(
      (t) =>
        (t.leave_name && t.leave_name.toLowerCase().includes(q)) ||
        (t.role_label && t.role_label.toLowerCase().includes(q))
    );
  }, [types, searchQuery]);

  const totalPages = Math.ceil(filteredTypes.length / pageSize) || 1;
  const paginatedTypes = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTypes.slice(start, start + pageSize);
  }, [filteredTypes, currentPage, pageSize]);

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Leave Assign List</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Academic</li>
              <li className="breadcrumb-item active" aria-current="page">
                All Leave Assign
              </li>
            </ol>
          </nav>
        </div>

        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
          <div className="pe-1 mb-2">
            <button
              type="button"
              className="btn btn-outline-light bg-white btn-icon me-1"
              onClick={loadTypes}
              title="Refresh"
            >
              <i className="ti ti-refresh"></i>
            </button>
          </div>
          <div className="pe-1 mb-2">
            <button
              type="button"
              className="btn btn-outline-light bg-white btn-icon me-1"
              onClick={() => window.print()}
              title="Print"
            >
              <i className="ti ti-printer"></i>
            </button>
          </div>
          <div className="dropdown me-2 mb-2">
            <button
              type="button"
              className="dropdown-toggle btn btn-light fw-medium d-inline-flex align-items-center"
              data-bs-toggle="dropdown"
            >
              <i className="ti ti-file-export me-2"></i>Export
            </button>
            <ul className="dropdown-menu dropdown-menu-end p-3">
              <li>
                <button
                  type="button"
                  className="dropdown-item rounded-1"
                  onClick={() => toast.info('Export as PDF')}
                >
                  <i className="ti ti-file-type-pdf me-2 text-danger"></i>Export as PDF
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="dropdown-item rounded-1"
                  onClick={() => toast.info('Export as Excel')}
                >
                  <i className="ti ti-file-type-xls me-2 text-success"></i>Export as Excel
                </button>
              </li>
            </ul>
          </div>
          <div className="mb-2">
            <Link
              to="/admin/leaves/assign/add"
              className="btn btn-primary d-flex align-items-center"
            >
              <i className="ti ti-square-rounded-plus me-2"></i>Add Leave Assign
            </Link>
          </div>
        </div>
      </div>
      {/* /Page Header */}

      {/* Main Card */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap pb-0">
          <h4 className="mb-3">All Leave Assign</h4>
        </div>

        <div className="card-body p-0 py-3">
          <div className="custom-datatable-filter table-responsivee">
            <div className="dataTables_wrapper dt-bootstrap5 no-footer px-3">
              {/* Length and Search Bar */}
              <div className="row mb-3 align-items-center">
                <div className="col-sm-12 col-md-6 mb-2 mb-md-0">
                  <div className="dataTables_length d-flex align-items-center gap-2">
                    <label className="d-inline-flex align-items-center gap-2 mb-0">
                      Row Per Page{' '}
                      <select
                        className="form-select form-select-sm"
                        style={{ width: '80px', display: 'inline-block' }}
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                      >
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                      </select>{' '}
                      Entries
                    </label>
                  </div>
                </div>
                <div className="col-sm-12 col-md-6 text-md-end">
                  <div className="dataTables_filter d-inline-block">
                    <label className="d-inline-flex align-items-center gap-2 mb-0">
                      <input
                        type="search"
                        className="form-control form-control-sm"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setCurrentPage(1);
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="row dt-row">
                <div className="col-sm-12 table-responsive">
                  <table className="table datatable dataTable no-footer">
                    <thead className="thead-light">
                      <tr>
                        <th className="text-center" style={{ width: '90px' }}>
                          Sl No.
                        </th>
                        <th className="text-center" style={{ width: '130px' }}>
                          Role
                        </th>
                        <th className="text-center" style={{ width: '220px' }}>
                          Leave Name
                        </th>
                        <th className="text-center" style={{ width: '180px' }}>
                          Need Document
                        </th>
                        <th className="text-center" style={{ width: '150px' }}>
                          No of Leave
                        </th>
                        <th className="text-center" style={{ width: '140px' }}>
                          Sort Order
                        </th>
                        <th className="text-center" style={{ width: '120px' }}>
                          Status
                        </th>
                        <th className="text-center" style={{ width: '110px' }}>
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="8" className="text-center py-4">
                            <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                            <span className="text-muted">Loading leave assigns...</span>
                          </td>
                        </tr>
                      ) : paginatedTypes.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="text-center py-5 text-muted">
                            No leave assignments found.
                          </td>
                        </tr>
                      ) : (
                        paginatedTypes.map((lt, idx) => {
                          const globalIdx = (currentPage - 1) * pageSize + idx;
                          // Show role header only on first item of each role in sorted order
                          const prevItem = paginatedTypes[idx - 1];
                          const showRoleHeader = !prevItem || prevItem.role !== lt.role;

                          return (
                            <tr key={lt.id || idx} className={idx % 2 === 0 ? 'odd' : 'even'}>
                              <td className="text-center sorting_1">{globalIdx + 1}</td>
                              <td className="text-center">
                                <strong>{lt.role_label || (Number(lt.role) === 1 ? 'Teacher' : 'User')}</strong>
                              </td>
                              <td className="text-center">{lt.leave_name}</td>
                              <td className="text-center">
                                <span className="badge bg-secondary">
                                  {Number(lt.need_document) === 1 ? 'Yes' : 'No'}
                                </span>
                              </td>
                              <td className="text-center">{lt.no_leave || 0}</td>
                              <td className="text-center">{lt.sort_order || 1}</td>
                              <td className="text-center">
                                {Number(lt.status) === 1 ? (
                                  <span className="text-success">Active</span>
                                ) : (
                                  <span className="text-danger">Inactive</span>
                                )}
                              </td>
                              <td className="d-flex justify-content-center">
                                <div className="d-flex align-items-center">
                                  <div className="dropdown">
                                    <button
                                      className="btn btn-white btn-icon btn-sm d-flex align-items-center justify-content-center rounded-circle p-0"
                                      type="button"
                                      data-bs-toggle="dropdown"
                                      aria-expanded="false"
                                    >
                                      <i className="ti ti-dots-vertical fs-14"></i>
                                    </button>
                                    <ul className="dropdown-menu dropdown-menu-end p-3">
                                      <li>
                                        <Link
                                          className="dropdown-item rounded-1"
                                          to={`/admin/leaves/assign/edit/${lt.id}`}
                                        >
                                          <i className="ti ti-edit-circle me-2"></i>Edit
                                        </Link>
                                      </li>
                                      <li>
                                        <button
                                          type="button"
                                          className="dropdown-item rounded-1 text-danger"
                                          onClick={() => setDeleteModal({ show: true, id: lt.id, processing: false })}
                                        >
                                          <i className="ti ti-trash-x me-2"></i>Delete
                                        </button>
                                      </li>
                                    </ul>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              <div className="row mt-3 align-items-center">
                <div className="col-sm-12 col-md-5">
                  <div className="dataTables_info text-muted fs-13">
                    Showing {(currentPage - 1) * pageSize + (paginatedTypes.length > 0 ? 1 : 0)} to{' '}
                    {Math.min(currentPage * pageSize, filteredTypes.length)} of {filteredTypes.length} entries
                  </div>
                </div>
                <div className="col-sm-12 col-md-7">
                  <div className="dataTables_paginate paging_simple_numbers d-flex justify-content-md-end">
                    <ul className="pagination mb-0">
                      <li className={`paginate_button page-item previous ${currentPage === 1 ? 'disabled' : ''}`}>
                        <button
                          type="button"
                          className="page-link"
                          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                          disabled={currentPage === 1}
                        >
                          Prev
                        </button>
                      </li>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                        <li
                          key={pageNum}
                          className={`paginate_button page-item ${currentPage === pageNum ? 'active' : ''}`}
                        >
                          <button
                            type="button"
                            className="page-link"
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </button>
                        </li>
                      ))}
                      <li className={`paginate_button page-item next ${currentPage === totalPages ? 'disabled' : ''}`}>
                        <button
                          type="button"
                          className="page-link"
                          onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modal.show && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          role="dialog"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
            <div className="modal-content">
              <form onSubmit={handleFormSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title">
                    {modal.isEdit ? 'Edit Leave Assign' : 'Add Leave Assign'}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setModal((prev) => ({ ...prev, show: false }))}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-medium">
                        Role <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        value={modal.form.role}
                        onChange={(e) =>
                          setModal({ ...modal, form: { ...modal.form, role: e.target.value } })
                        }
                        required
                      >
                        <option value="1">Teacher</option>
                        <option value="2">User</option>
                      </select>
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-medium">
                        Leave Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Leave Name (e.g. Medical Leaves, Casual Leaves)"
                        value={modal.form.leave_name}
                        onChange={(e) =>
                          setModal({ ...modal, form: { ...modal.form, leave_name: e.target.value } })
                        }
                        required
                      />
                    </div>

                    <div className="col-md-4 mb-3">
                      <label className="form-label fw-medium">
                        Need Document <span className="text-danger">*</span>
                      </label>
                      <div className="d-flex mt-2 gap-3">
                        <label className="form-check cursor-pointer mb-0">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="need_document_opt"
                            value="0"
                            checked={modal.form.need_document === '0'}
                            onChange={(e) =>
                              setModal({ ...modal, form: { ...modal.form, need_document: e.target.value } })
                            }
                          />
                          <span className="form-check-label ms-1">No</span>
                        </label>
                        <label className="form-check cursor-pointer mb-0">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="need_document_opt"
                            value="1"
                            checked={modal.form.need_document === '1'}
                            onChange={(e) =>
                              setModal({ ...modal, form: { ...modal.form, need_document: e.target.value } })
                            }
                          />
                          <span className="form-check-label ms-1">Yes</span>
                        </label>
                      </div>
                    </div>

                    <div className="col-md-4 mb-3">
                      <label className="form-label fw-medium">
                        No of Leaves <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        className="form-control"
                        value={modal.form.no_leave}
                        onChange={(e) =>
                          setModal({ ...modal, form: { ...modal.form, no_leave: e.target.value } })
                        }
                        required
                      />
                    </div>

                    <div className="col-md-4 mb-3">
                      <label className="form-label fw-medium">
                        Sort Order <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        className="form-control"
                        value={modal.form.sort_order}
                        onChange={(e) =>
                          setModal({ ...modal, form: { ...modal.form, sort_order: e.target.value } })
                        }
                        required
                      />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-medium">Status</label>
                      <select
                        className="form-select"
                        value={modal.form.status}
                        onChange={(e) =>
                          setModal({ ...modal, form: { ...modal.form, status: e.target.value } })
                        }
                      >
                        <option value="1">Active</option>
                        <option value="2">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="modal-footer d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setModal((prev) => ({ ...prev, show: false }))}
                    disabled={modal.submitting}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={modal.submitting}>
                    {modal.submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1"></span>
                        Saving...
                      </>
                    ) : modal.isEdit ? (
                      'Save Changes'
                    ) : (
                      'Submit'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal.show && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          role="dialog"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Delete Leave Assign</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setDeleteModal({ show: false, id: null, processing: false })}
                ></button>
              </div>
              <div className="modal-body">
                <p className="mb-0">
                  Are you sure you want to delete this leave assignment? This action cannot be undone.
                </p>
              </div>
              <div className="modal-footer d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setDeleteModal({ show: false, id: null, processing: false })}
                  disabled={deleteModal.processing}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={confirmDelete}
                  disabled={deleteModal.processing}
                >
                  {deleteModal.processing ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveTypes;
