import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
import DataTable from '../../../components/common/DataTable';
import TableActionMenu from '../../../components/common/TableActionMenu';

const StaffList = () => {
  const [staffList, setStaffList] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  // Pagination
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, total: 0 });

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

  const loadStaff = useCallback(async (targetPage = pagination.page, targetLimit = pagination.limit, targetSearch = search) => {
    try {
      setLoading(true);
      const res = await fetchStaffApi({
        page: targetPage,
        limit: targetLimit,
        search: targetSearch,
      });

      if (res && res.data && res.data.staff) {
        setStaffList(res.data.staff);
        setPagination({
          page: res.data.pagination.page,
          limit: res.data.pagination.limit,
          totalPages: res.data.pagination.totalPages,
          total: res.data.pagination.total,
        });
      }
    } catch (err) {
      console.error('Failed to load staff list:', err);
      toast.error('Failed to load staff list');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search]);

  useEffect(() => {
    loadRoles();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      loadStaff(1, pagination.limit, search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const handlePageChange = (page) => {
    loadStaff(page, pagination.limit, search);
  };

  const handleLimitChange = (limit) => {
    loadStaff(1, limit, search);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === staffList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(staffList.map((u) => u.id));
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDeleteClick = (id, name) => {
    setDeleteModal({ show: true, id, name });
  };

  const confirmDelete = async () => {
    if (!deleteModal.id) return;
    try {
      await deleteStaffApi(deleteModal.id);
      toast.success('Staff user deleted successfully');
      setDeleteModal({ show: false, id: null, name: '' });
      loadStaff(pagination.page, pagination.limit, search);
    } catch (err) {
      console.error('Failed to delete staff:', err);
      toast.error(err.response?.data?.message || 'Failed to delete staff member');
    }
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

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.first_name || !formData.email || !formData.role) {
      toast.warning('Please fill in all required fields (First Name, Email, Role)');
      return;
    }

    try {
      setFormSubmitting(true);
      if (editingStaffId) {
        await updateStaffApi(editingStaffId, formData);
        toast.success('Staff user updated successfully');
      } else {
        await createStaffApi(formData);
        toast.success('Staff user created successfully');
      }
      setShowModal(false);
      loadStaff(pagination.page, pagination.limit, search);
    } catch (err) {
      console.error('Failed to save staff user:', err);
      toast.error(err.response?.data?.message || 'Failed to save staff details');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (staffList.length === 0) return toast.info('No staff to export');
    let csv = 'Sl No.,Name,Email,Phone,Role,Status\n';
    staffList.forEach((u, idx) => {
      csv += `"${idx + 1}","${u.first_name} ${u.last_name || ''}","${u.email || ''}","${u.phone || ''}","${u.role_name || 'Staff'}","${u.status === 1 ? 'Active' : 'Inactive'}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Staff_Users_${new Date().toISOString().split('T')[0]}.csv`;
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
        cell: ({ index }) => (
          <span className="text-muted fw-medium">
            {(pagination.page - 1) * pagination.limit + index + 1}
          </span>
        ),
      },
      {
        accessorKey: 'first_name',
        header: 'Name',
        sortable: true,
        cell: ({ row }) => (
          <Link
            to={`/admin/users/edit/${row.id}`}
            className="fw-semibold text-primary text-decoration-none"
          >
            {row.first_name} {row.last_name || ''}
          </Link>
        ),
      },
      {
        accessorKey: 'email',
        header: 'Email',
        sortable: true,
        cell: ({ value }) => <span className="text-dark">{value || '—'}</span>,
      },
      {
        accessorKey: 'phone',
        header: 'Phone Number',
        sortable: true,
        cell: ({ value }) => <span className="text-dark">{value || '—'}</span>,
      },
      {
        accessorKey: 'role_name',
        header: 'Role',
        sortable: true,
        cell: ({ value }) => (
          <span className="badge bg-light text-dark border px-2.5 py-1.5 fw-medium">
            {value || 'Staff'}
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
                to: `/admin/users/edit/${row.id}`,
              },
              {
                label: 'Delete',
                icon: 'ti ti-trash-x',
                variant: 'danger',
                onClick: () =>
                  handleDeleteClick(row.id, `${row.first_name} ${row.last_name || ''}`),
              },
            ]}
          />
        ),
      },
    ],
    [pagination.page, pagination.limit]
  );

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-4">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Users List</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">User Management</li>
              <li className="breadcrumb-item active" aria-current="page">
                Users
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline-light bg-white btn-icon shadow-2xs"
            onClick={() => loadStaff(1, pagination.limit, search)}
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

          <button
            type="button"
            className="btn btn-primary d-flex align-items-center"
            onClick={handleOpenAddModal}
          >
            <i className="ti ti-square-rounded-plus me-2"></i>Add User
          </button>
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        title="All Users"
        subtitle="Manage administrative accounts, role allocations, and staff permissions."
        columns={columns}
        data={staffList}
        loading={loading}
        selectable={true}
        selectedIds={selectedIds}
        onSelectRow={handleSelectOne}
        onSelectAll={handleSelectAll}
        pagination={{
          page: pagination.page,
          limit: pagination.limit,
          total: pagination.total,
          totalPages: pagination.totalPages,
          onPageChange: handlePageChange,
          onLimitChange: handleLimitChange,
        }}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search users by name, email, or role..."
        emptyMessage="No users registered in the system."
      />

      {/* Delete User Modal */}
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
                  onClick={() => setDeleteModal({ show: false, id: null, name: '' })}
                ></button>
              </div>
              <div className="modal-body text-center pt-0 pb-4">
                <div className="text-danger mb-3">
                  <i className="ti ti-trash-x fs-48"></i>
                </div>
                <h4 className="mb-2">Delete User</h4>
                <p className="text-muted mb-4">
                  Are you sure you want to delete <strong>{deleteModal.name}</strong>? This action cannot be undone.
                </p>
                <div className="d-flex justify-content-center gap-2">
                  <button
                    type="button"
                    className="btn btn-light px-4"
                    onClick={() => setDeleteModal({ show: false, id: null, name: '' })}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger px-4"
                    onClick={confirmDelete}
                  >
                    Delete
                  </button>
                </div>
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
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  {editingStaffId ? 'Edit User' : 'Add User'}
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
                      <label className="form-label fw-semibold">
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
                      <label className="form-label fw-semibold">
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
                      <label className="form-label fw-semibold">
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
                      <label className="form-label fw-semibold">Phone Number</label>
                      <input
                        type="tel"
                        className="form-control"
                        placeholder="e.g. 9876543210"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Gender</label>
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
                      <label className="form-label fw-semibold">
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
                      <label className="form-label fw-semibold">Status</label>
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
                      <label className="form-label fw-semibold">
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
