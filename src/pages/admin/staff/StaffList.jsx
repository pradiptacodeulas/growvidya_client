import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchStaffApi,
  fetchStaffByIdApi,
  createStaffApi,
  updateStaffApi,
  deleteStaffApi,
  fetchStaffRolesApi,
} from '../../../api/adminStaff.api';

const StaffList = () => {
  const [staffList, setStaffList] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  // Pagination
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, total: 0 });

  // Dropdown state for action menus
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null, name: '' });

  // Add / Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    gender: '1',
    role: '6', // Staff default
    password: '',
    status: 1,
    // Bank details
    account_name: '',
    account_number: '',
    bank_name: '',
    ifsc_code: '',
    branch_name: '',
  });

  const loadRoles = async () => {
    try {
      const res = await fetchStaffRolesApi();
      if (res && res.data && res.data.roles) {
        setRoles(res.data.roles);
      }
    } catch (err) {
      console.error('Failed to load staff roles:', err);
    }
  };

  const loadStaff = async (page = 1, currentLimit = pagination.limit) => {
    try {
      setLoading(true);
      const res = await fetchStaffApi({
        search,
        page,
        limit: currentLimit,
      });

      if (res && res.data) {
        setStaffList(res.data.staff || []);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch (err) {
      console.error('Failed to load staff:', err);
      toast.error('Failed to load users list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadStaff(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Select all checkboxes
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(staffList.map((s) => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleOpenAddModal = () => {
    setEditingStaffId(null);
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      gender: '1',
      role: roles.length > 0 ? String(roles[0].id) : '6',
      password: '',
      status: 1,
      account_name: '',
      account_number: '',
      bank_name: '',
      ifsc_code: '',
      branch_name: '',
    });
    setShowModal(true);
  };

  const handleOpenEditModal = async (staff) => {
    try {
      setEditingStaffId(staff.id);
      const res = await fetchStaffByIdApi(staff.id);
      const s = res?.data?.staff || staff;
      const bank = s.bank_details || {};

      setFormData({
        first_name: s.first_name || '',
        last_name: s.last_name || '',
        email: s.email || '',
        phone: s.phone || '',
        gender: String(s.gender || '1'),
        role: String(s.role_id || s.role || '6'),
        password: '',
        status: s.status !== undefined ? s.status : 1,
        account_name: bank.account_name || '',
        account_number: bank.account_number || '',
        bank_name: bank.bank_name || '',
        ifsc_code: bank.ifsc_code || '',
        branch_name: bank.branch_name || '',
      });
      setShowModal(true);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load user details.');
    }
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      return toast.warning('Please enter First Name and Last Name.');
    }
    if (!formData.email.trim()) {
      return toast.warning('Please enter Email Address.');
    }

    try {
      setFormSubmitting(true);
      const payload = { ...formData };

      if (editingStaffId) {
        await updateStaffApi(editingStaffId, payload);
        toast.success('User updated successfully!');
      } else {
        await createStaffApi(payload);
        toast.success('User created successfully!');
      }

      setShowModal(false);
      loadStaff(pagination.page);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || 'Operation failed.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteClick = (id, name) => {
    setDeleteModal({ show: true, id, name });
  };

  const confirmDelete = async () => {
    if (!deleteModal.id) return;
    try {
      await deleteStaffApi(deleteModal.id);
      toast.success('User deleted successfully.');
      setDeleteModal({ show: false, id: null, name: '' });
      loadStaff(pagination.page);
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete user.');
    }
  };

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Users</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Staff</li>
              <li className="breadcrumb-item active" aria-current="page">
                Users
              </li>
            </ol>
          </nav>
        </div>

        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
          <div className="pe-1 mb-2">
            <button
              type="button"
              className="btn btn-outline-light bg-white btn-icon me-1 border"
              title="Refresh"
              onClick={() => loadStaff(1)}
            >
              <i className="ti ti-refresh text-muted"></i>
            </button>
          </div>
          <div className="pe-1 mb-2">
            <button
              type="button"
              className="btn btn-outline-light bg-white btn-icon me-1 border"
              title="Print"
              onClick={() => window.print()}
            >
              <i className="ti ti-printer text-muted"></i>
            </button>
          </div>
          <div className="dropdown me-2 mb-2">
            <button
              className="dropdown-toggle btn btn-light fw-medium d-inline-flex align-items-center border"
              data-bs-toggle="dropdown"
              type="button"
            >
              <i className="ti ti-file-export me-2"></i>Export
            </button>
            <ul className="dropdown-menu dropdown-menu-end p-2 shadow-sm border">
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
              to="/admin/users/add"
              className="btn btn-primary d-flex align-items-center"
            >
              <i className="ti ti-square-rounded-plus me-2"></i>Add Users
            </Link>
          </div>
        </div>
      </div>
      {/* /Page Header */}

      {/* Users List Card */}
      <div className="card shadow-sm border">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap pb-0 bg-white">
          <h4 className="mb-3 fw-bold">All Users</h4>
        </div>
        <div className="card-body p-0 py-3">
          {/* Custom Datatable Filter & Content */}
          <div className="custom-datatable-filter table-responsive">
            <div id="DataTables_Table_0_wrapper" className="dataTables_wrapper dt-bootstrap5 no-footer">
              <div className="row px-3 pb-3 align-items-center">
                <div className="col-sm-12 col-md-6 mb-2 mb-md-0">
                  <div className="dataTables_length" id="DataTables_Table_0_length">
                    <label className="d-flex align-items-center gap-2 mb-0 fs-13">
                      Row Per Page
                      <select
                        name="DataTables_Table_0_length"
                        aria-controls="DataTables_Table_0"
                        className="form-select form-select-sm"
                        style={{ width: '80px' }}
                        value={pagination.limit}
                        onChange={(e) => {
                          const newLimit = Number(e.target.value);
                          setPagination((prev) => ({ ...prev, limit: newLimit }));
                          loadStaff(1, newLimit);
                        }}
                      >
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                      </select>
                      Entries
                    </label>
                  </div>
                </div>
                <div className="col-sm-12 col-md-6 d-flex justify-content-md-end">
                  <div id="DataTables_Table_0_filter" className="dataTables_filter">
                    <label className="d-flex align-items-center gap-2 mb-0 fs-13">
                      Search:
                      <input
                        type="search"
                        className="form-control form-control-sm"
                        placeholder="Search users..."
                        aria-controls="DataTables_Table_0"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="row dt-row">
                <div className="col-sm-12 table-responsive">
                  <table
                    className="table datatable dataTable no-footer mb-0 table-hover"
                    id="DataTables_Table_0"
                  >
                    <thead className="thead-light">
                      <tr>
                        <th
                          className="no-sort text-center sorting sorting_asc"
                          style={{ width: '60px' }}
                        >
                          <div className="form-check form-check-md d-flex justify-content-center">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="select-all"
                              checked={
                                selectedIds.length === staffList.length && staffList.length > 0
                              }
                              onChange={handleSelectAll}
                            />
                          </div>
                        </th>
                        <th className="text-center sorting" style={{ width: '80px' }}>
                          Sl No.
                        </th>
                        <th className="text-center sorting">Name</th>
                        <th className="text-center sorting">Email</th>
                        <th className="text-center sorting">Phone</th>
                        <th className="text-center sorting">Role</th>
                        <th className="text-center sorting">Status</th>
                        <th className="text-center sorting" style={{ width: '100px' }}>
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="8" className="text-center py-4">
                            <div
                              className="spinner-border spinner-border-sm text-primary me-2"
                              role="status"
                            ></div>
                            <span className="text-muted">Loading users...</span>
                          </td>
                        </tr>
                      ) : staffList.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="text-center py-4 text-muted">
                            <i className="ti ti-users-off fs-24 mb-1 d-block opacity-50"></i>
                            No users found.
                          </td>
                        </tr>
                      ) : (
                        staffList.map((user, index) => {
                          const slNo = (pagination.page - 1) * pagination.limit + index + 1;
                          const isSelected = selectedIds.includes(user.id);
                          return (
                            <tr
                              key={user.id}
                              className={index % 2 === 0 ? 'odd' : 'even'}
                            >
                              <td className="text-center sorting_1">
                                <div className="form-check form-check-md d-flex justify-content-center">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleSelectOne(user.id)}
                                  />
                                </div>
                              </td>
                              <td className="text-center">{slNo}</td>
                              <td className="text-center fw-medium text-dark">
                                {user.first_name} {user.last_name}
                              </td>
                              <td className="text-center">{user.email || 'N/A'}</td>
                              <td className="text-center">{user.phone || 'N/A'}</td>
                              <td className="text-center">
                                <span className="badge bg-light text-dark border">
                                  {user.role_name || 'Staff'}
                                </span>
                              </td>
                              <td className="text-center">
                                {user.status === 1 ? (
                                  <span className="text-success fw-medium">Active</span>
                                ) : (
                                  <span className="text-danger fw-medium">Inactive</span>
                                )}
                              </td>
                              <td className="text-center">
                                <div className="d-flex justify-content-center align-items-center">
                                  <div className="dropdown position-relative">
                                    <button
                                      className="btn btn-white btn-icon btn-sm d-flex align-items-center justify-content-center rounded-circle p-0 border shadow-none"
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveDropdown(
                                          activeDropdown === user.id ? null : user.id
                                        );
                                      }}
                                      aria-expanded={activeDropdown === user.id}
                                    >
                                      <i className="ti ti-dots-vertical fs-14"></i>
                                    </button>

                                    {activeDropdown === user.id && (
                                      <>
                                        <div
                                          className="position-fixed top-0 start-0 w-100 h-100"
                                          style={{ zIndex: 1040 }}
                                          onClick={() => setActiveDropdown(null)}
                                        />
                                        <ul
                                          className="dropdown-menu dropdown-menu-end show p-2 shadow-sm border position-absolute"
                                          style={{
                                            right: 0,
                                            top: '100%',
                                            zIndex: 1050,
                                            display: 'block',
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <li>
                                            <Link
                                              className="dropdown-item rounded-1 py-2"
                                              to={`/admin/users/edit/${user.id}`}
                                              onClick={() => setActiveDropdown(null)}
                                            >
                                              <i className="ti ti-edit-circle me-2 text-primary"></i>{' '}
                                              Edit
                                            </Link>
                                          </li>
                                          <li>
                                            <button
                                              type="button"
                                              className="dropdown-item rounded-1 text-danger py-2"
                                              onClick={() => {
                                                setActiveDropdown(null);
                                                handleDeleteClick(
                                                  user.id,
                                                  `${user.first_name} ${user.last_name}`
                                                );
                                              }}
                                            >
                                              <i className="ti ti-trash-x me-2"></i>Delete
                                            </button>
                                          </li>
                                        </ul>
                                      </>
                                    )}
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

              {/* Table Footer & Pagination */}
              <div className="row px-3 pt-3 align-items-center">
                <div className="col-sm-12 col-md-5 mb-2 mb-md-0">
                  <p className="text-muted fs-13 mb-0">
                    Showing{' '}
                    {staffList.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} entries
                  </p>
                </div>
                <div className="col-sm-12 col-md-7 d-flex justify-content-md-end">
                  <div
                    className="dataTables_paginate paging_simple_numbers"
                    id="DataTables_Table_0_paginate"
                  >
                    <ul className="pagination mb-0">
                      <li
                        className={`paginate_button page-item previous ${
                          pagination.page <= 1 ? 'disabled' : ''
                        }`}
                        id="DataTables_Table_0_previous"
                      >
                        <button
                          type="button"
                          className="page-link"
                          disabled={pagination.page <= 1}
                          onClick={() => loadStaff(pagination.page - 1)}
                        >
                          Prev
                        </button>
                      </li>
                      {Array.from({ length: pagination.totalPages || 1 }, (_, i) => i + 1).map(
                        (pageNum) => (
                          <li
                            key={pageNum}
                            className={`paginate_button page-item ${
                              pagination.page === pageNum ? 'active' : ''
                            }`}
                          >
                            <button
                              type="button"
                              className="page-link"
                              onClick={() => loadStaff(pageNum)}
                            >
                              {pageNum}
                            </button>
                          </li>
                        )
                      )}
                      <li
                        className={`paginate_button page-item next ${
                          pagination.page >= pagination.totalPages ? 'disabled' : ''
                        }`}
                        id="DataTables_Table_0_next"
                      >
                        <button
                          type="button"
                          className="page-link"
                          disabled={pagination.page >= pagination.totalPages}
                          onClick={() => loadStaff(pagination.page + 1)}
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
          {/* /Custom Datatable Filter */}
        </div>
      </div>
      {/* /Users List Card */}

      {/* Delete User Modal (matching legacy project modal) */}
      {deleteModal.show && (
        <div
          className="modal fade show d-block"
          id="delete-modal"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}
        >
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content border shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold" id="deleteHostelModelLabel">
                  Delete User
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setDeleteModal({ show: false, id: null, name: '' })}
                ></button>
              </div>
              <div className="modal-body">
                <h5 className="mb-1">Are you sure, want to delete this user?</h5>
                {deleteModal.name && (
                  <p className="text-muted fs-13 mb-0">User: {deleteModal.name}</p>
                )}
              </div>
              <div className="modal-footer d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setDeleteModal({ show: false, id: null, name: '' })}
                >
                  Close
                </button>
                <button type="button" className="btn btn-danger" onClick={confirmDelete}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit User Modal */}
      {showModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  {editingStaffId ? 'Edit User' : 'Add Users'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <form onSubmit={handleSubmitForm}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-medium">
                        First Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Enter first name"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-medium">
                        Last Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Enter last name"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-medium">
                        Email Address <span className="text-danger">*</span>
                      </label>
                      <input
                        type="email"
                        className="form-control"
                        placeholder="user@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-medium">Phone Number</label>
                      <input
                        type="tel"
                        className="form-control"
                        placeholder="e.g. 9876543210"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-medium">Gender</label>
                      <select
                        className="form-select"
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      >
                        <option value="1">Male</option>
                        <option value="2">Female</option>
                        <option value="3">Other</option>
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-medium">
                        Role <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        required
                      >
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.role_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-medium">Status</label>
                      <select
                        className="form-select"
                        value={formData.status}
                        onChange={(e) =>
                          setFormData({ ...formData, status: Number(e.target.value) })
                        }
                      >
                        <option value={1}>Active</option>
                        <option value={2}>Inactive</option>
                      </select>
                    </div>

                    <div className="col-12">
                      <label className="form-label fw-medium">
                        {editingStaffId
                          ? 'Password (Leave blank to keep current)'
                          : 'Password'}
                      </label>
                      <input
                        type="password"
                        className="form-control"
                        placeholder={
                          editingStaffId
                            ? 'Leave blank to preserve current password'
                            : 'Enter login password'
                        }
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={formSubmitting}>
                    {formSubmitting ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-1"
                          role="status"
                          aria-hidden="true"
                        ></span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="ti ti-check me-1"></i>
                        {editingStaffId ? 'Update User' : 'Save User'}
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

export default StaffList;
