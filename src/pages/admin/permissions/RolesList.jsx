import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminPermissionApi from '../../../api/adminPermission.api';

const RolesList = () => {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc', 'desc', 'recent'

  // Helper to format date strictly as DD/MM/YYYY
  const formatDateDDMMYYYY = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getInitialTodayRange = () => {
    const today = new Date();
    const formatted = formatDateDDMMYYYY(today);
    return `${formatted} - ${formatted}`;
  };

  // Date Range Dropdown States
  const [selectedPreset, setSelectedPreset] = useState('Today');
  const [dateRangeLabel, setDateRangeLabel] = useState(getInitialTodayRange);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const dateDropdownRef = useRef(null);

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  // Click outside to close date dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target)) {
        setIsDateDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const res = await adminPermissionApi.getAllRoles();
      if (res?.data?.roles) {
        setRoles(res.data.roles);
      }
    } catch (err) {
      console.error('Failed to load roles:', err);
      toast.error(err.message || 'Failed to load roles list');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = (preset) => {
    const today = new Date();
    setSelectedPreset(preset);

    if (preset === 'Today') {
      const formatted = formatDateDDMMYYYY(today);
      setDateRangeLabel(`${formatted} - ${formatted}`);
      setShowCustomPicker(false);
      setIsDateDropdownOpen(false);
    } else if (preset === 'Yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const formatted = formatDateDDMMYYYY(yesterday);
      setDateRangeLabel(`${formatted} - ${formatted}`);
      setShowCustomPicker(false);
      setIsDateDropdownOpen(false);
    } else if (preset === 'Last 7 Days') {
      const past7 = new Date(today);
      past7.setDate(today.getDate() - 6);
      setDateRangeLabel(`${formatDateDDMMYYYY(past7)} - ${formatDateDDMMYYYY(today)}`);
      setShowCustomPicker(false);
      setIsDateDropdownOpen(false);
    } else if (preset === 'Last 30 Days') {
      const past30 = new Date(today);
      past30.setDate(today.getDate() - 29);
      setDateRangeLabel(`${formatDateDDMMYYYY(past30)} - ${formatDateDDMMYYYY(today)}`);
      setShowCustomPicker(false);
      setIsDateDropdownOpen(false);
    } else if (preset === 'This Year') {
      const curYear = today.getFullYear();
      setDateRangeLabel(`01/01/${curYear} - 31/12/${curYear}`);
      setShowCustomPicker(false);
      setIsDateDropdownOpen(false);
    } else if (preset === 'Next Year') {
      const nextYear = today.getFullYear() + 1;
      setDateRangeLabel(`01/01/${nextYear} - 31/12/${nextYear}`);
      setShowCustomPicker(false);
      setIsDateDropdownOpen(false);
    } else if (preset === 'Custom Range') {
      setShowCustomPicker(true);
    }
  };

  const handleApplyCustomDate = (e) => {
    e.preventDefault();
    if (!customStart || !customEnd) {
      toast.warning('Please select both Start Date and End Date.');
      return;
    }
    setDateRangeLabel(`${formatDateDDMMYYYY(customStart)} - ${formatDateDDMMYYYY(customEnd)}`);
    setSelectedPreset('Custom Range');
    setIsDateDropdownOpen(false);
  };

  const handleDeleteClick = (role) => {
    if (role.role_name === 'Super Admin' || role.id === 1) {
      toast.warning('Super Admin role cannot be deleted.');
      return;
    }
    setSelectedRole(role);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedRole) return;
    try {
      setIsDeleting(true);
      await adminPermissionApi.deleteRole(selectedRole.id);
      toast.success(`Role "${selectedRole.role_name}" and its permissions deleted successfully.`);
      setShowDeleteModal(false);
      setSelectedRole(null);
      fetchRoles();
    } catch (err) {
      console.error('Error deleting role:', err);
      toast.error(err.message || 'Failed to delete role.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter and Sort Roles
  const filteredRoles = roles
    .filter((r) => {
      if (!searchTerm) return true;
      return r.role_name.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.role_name.localeCompare(b.role_name);
      }
      if (sortOrder === 'desc') {
        return b.role_name.localeCompare(a.role_name);
      }
      if (sortOrder === 'recent') {
        return new Date(b.created_on || 0) - new Date(a.created_on || 0);
      }
      return 0;
    });

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Roles &amp; Permissions</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/roles-permissions">User Management</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Roles &amp; Permissions
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
          <div className="mb-2">
            <Link
              to="/admin/roles-permissions/add"
              className="btn btn-primary d-flex align-items-center"
            >
              <i className="ti ti-square-rounded-plus me-2"></i>
              Add Role &amp; Permission
            </Link>
          </div>
        </div>
      </div>
      {/* /Page Header */}

      {/* Filter Section */}
      <div className="card shadow-sm">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap pb-0">
          <h4 className="mb-3">Roles &amp; Permissions List</h4>
          <div className="d-flex align-items-center flex-wrap">
            {/* Search Input */}
            <div className="input-icon-start mb-3 me-2 position-relative">
              <span className="icon-addon">
                <i className="ti ti-search"></i>
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Search Role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '32px' }}
              />
            </div>

            {/* Interactive Date Range Dropdown with Presets */}
            <div className="dropdown mb-3 me-2 position-relative" ref={dateDropdownRef}>
              <div
                className="input-icon-start cursor-pointer position-relative"
                onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
                title="Click to select Date Preset or Custom Range"
              >
                <span className="icon-addon">
                  <i className="ti ti-calendar"></i>
                </span>
                <input
                  type="text"
                  className="form-control date-range bookingrange cursor-pointer"
                  style={{ minWidth: '220px', paddingLeft: '36px', background: '#fff', cursor: 'pointer' }}
                  placeholder="Select Date Range"
                  value={dateRangeLabel}
                  readOnly
                />
              </div>

              {/* Preset Menu */}
              {isDateDropdownOpen && (
                <div
                  className="dropdown-menu p-3 show shadow-lg"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    zIndex: 1050,
                    minWidth: '280px',
                    display: 'block',
                  }}
                >
                  <div className="fw-bold fs-12 text-muted mb-2 text-uppercase">Date Range Presets</div>
                  <ul className="list-unstyled mb-2">
                    {['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'This Year', 'Next Year'].map((preset) => (
                      <li key={preset}>
                        <button
                          type="button"
                          className={`dropdown-item rounded-1 py-1 px-2 ${
                            selectedPreset === preset && !showCustomPicker ? 'active' : ''
                          }`}
                          onClick={() => handleSelectPreset(preset)}
                        >
                          <i className="ti ti-calendar-event me-2 fs-14"></i>
                          {preset}
                        </button>
                      </li>
                    ))}
                    <li>
                      <button
                        type="button"
                        className={`dropdown-item rounded-1 py-1 px-2 ${
                          showCustomPicker ? 'active' : ''
                        }`}
                        onClick={() => handleSelectPreset('Custom Range')}
                      >
                        <i className="ti ti-calendar-plus me-2 fs-14"></i>
                        Custom Range
                      </button>
                    </li>
                  </ul>

                  {/* Custom Range Inputs */}
                  {showCustomPicker && (
                    <div className="border-top pt-2 mt-2">
                      <div className="mb-2">
                        <label className="form-label fs-12 mb-1 text-muted">From Date:</label>
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          value={customStart}
                          onChange={(e) => setCustomStart(e.target.value)}
                        />
                      </div>
                      <div className="mb-2">
                        <label className="form-label fs-12 mb-1 text-muted">To Date:</label>
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          value={customEnd}
                          onChange={(e) => setCustomEnd(e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm w-100 mt-1"
                        onClick={handleApplyCustomDate}
                      >
                        Apply Range
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="dropdown mb-3">
              <button
                type="button"
                className="btn btn-outline-light bg-white dropdown-toggle"
                data-bs-toggle="dropdown"
              >
                <i className="ti ti-sort-ascending-2 me-2"></i>
                {sortOrder === 'asc'
                  ? 'Sort by A-Z'
                  : sortOrder === 'desc'
                  ? 'Sort by Z-A'
                  : 'Recently Added'}
              </button>
              <ul className="dropdown-menu p-3">
                <li>
                  <button
                    type="button"
                    onClick={() => setSortOrder('asc')}
                    className={`dropdown-item rounded-1 ${sortOrder === 'asc' ? 'active' : ''}`}
                  >
                    Ascending (A-Z)
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setSortOrder('desc')}
                    className={`dropdown-item rounded-1 ${sortOrder === 'desc' ? 'active' : ''}`}
                  >
                    Descending (Z-A)
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setSortOrder('recent')}
                    className={`dropdown-item rounded-1 ${sortOrder === 'recent' ? 'active' : ''}`}
                  >
                    Recently Added
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="card-body p-0 py-3">
          {/* Role Permission List */}
          <div className="custom-datatable-filter table-responsive">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2 text-muted">Loading roles...</p>
              </div>
            ) : filteredRoles.length === 0 ? (
              <div className="text-center py-5">
                <i className="ti ti-user-shield fs-40 text-muted mb-2"></i>
                <p className="text-muted">No roles found matching your filter.</p>
              </div>
            ) : (
              <table className="table datatable mb-0">
                <thead className="thead-light">
                  <tr>
                    <th>Role Name</th>
                    <th>Created On</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRoles.map((role) => (
                    <tr key={role.id}>
                      <td>
                        <span className="fw-semibold text-dark">{role.role_name}</span>
                        {role.user_count !== undefined && (
                          <span className="badge badge-soft-info ms-2">
                            {role.user_count} {role.user_count === 1 ? 'user' : 'users'}
                          </span>
                        )}
                      </td>
                      <td>
                        {role.created_on
                          ? new Date(role.created_on).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'N/A'}
                      </td>
                      <td className="text-end">
                        <div className="d-inline-flex align-items-center">
                          {/* Edit Permissions */}
                          <Link
                            to={`/admin/roles-permissions/edit/${role.id}`}
                            className="btn btn-sm btn-icon btn-light me-1"
                            title="Edit Permissions"
                          >
                            <i className="ti ti-edit-circle fs-16 text-primary"></i>
                          </Link>

                          {/* Delete Role (Forbidden on Super Admin) */}
                          {role.role_name !== 'Super Admin' && role.id !== 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(role)}
                              className="btn btn-sm btn-icon btn-light text-danger"
                              title="Delete Role"
                            >
                              <i className="ti ti-trash-x fs-16 text-danger"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
      {/* /Filter Section */}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-body text-center p-4">
                <div className="trash-icon text-danger mb-3">
                  <i className="ti ti-trash-x fs-48"></i>
                </div>
                <h4>Delete Role</h4>
                <p className="text-muted mb-4">
                  Are you sure you want to delete the role{' '}
                  <strong className="text-dark">"{selectedRole?.role_name}"</strong> and all of its
                  assigned permissions? This action cannot be undone.
                </p>
                <div className="d-flex justify-content-center gap-2">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => setShowDeleteModal(false)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger d-inline-flex align-items-center"
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                        ></span>
                        Deleting...
                      </>
                    ) : (
                      'Yes, Delete'
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

export default RolesList;
