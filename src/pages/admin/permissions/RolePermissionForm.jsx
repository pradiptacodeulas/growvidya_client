import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminPermissionApi from '../../../api/adminPermission.api';
import { decodeParam } from '../../../utils/idHelper';

const RolePermissionForm = () => {
  const { id: rawRoleId } = useParams();
  const roleId = decodeParam(rawRoleId);
  const navigate = useNavigate();
  const isEditing = Boolean(roleId);

  const [roleName, setRoleName] = useState('');
  const [modulesState, setModulesState] = useState([]); // Flat array of modules with permission state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'
  const [searchQuery, setSearchQuery] = useState('');

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

  useEffect(() => {
    loadData();
  }, [roleId]);

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

  const loadData = async () => {
    try {
      setLoading(true);
      if (isEditing) {
        // Fetch existing role permissions
        const res = await adminPermissionApi.getRolePermissions(roleId);
        if (res?.data) {
          setRoleName(res.data.role?.role_name || '');
          const grouped = res.data.groupedModules || {};
          flattenAndSync(grouped);
        }
      } else {
        // Fetch all system modules
        const res = await adminPermissionApi.getAllModules();
        if (res?.data) {
          const grouped = res.data.groupedModules || {};
          flattenAndSync(grouped);
        }
      }
    } catch (err) {
      console.error('Error loading role/permissions:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to load permissions configuration.');
    } finally {
      setLoading(false);
    }
  };

  const flattenAndSync = (grouped) => {
    const list = [];
    Object.keys(grouped).forEach((section) => {
      grouped[section].forEach((mod) => {
        const isAll =
          Boolean(mod.add_access) &&
          Boolean(mod.view_access) &&
          Boolean(mod.edit_access) &&
          Boolean(mod.delete_access);

        list.push({
          section,
          name: mod.name,
          fullModule: mod.fullModule,
          add_access: Boolean(mod.add_access),
          view_access: Boolean(mod.view_access),
          edit_access: Boolean(mod.edit_access),
          delete_access: Boolean(mod.delete_access),
          allow_all: isAll,
        });
      });
    });
    setModulesState(list);
  };

  // Handle Preset Date Selection (Only numeric date ranges: DD/MM/YYYY - DD/MM/YYYY)
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

  // Apply custom date range
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

  // Toggle single action checkbox (Created, View, Edit, Delete)
  const handleSingleCheckboxChange = (fullModule, field) => {
    setModulesState((prev) =>
      prev.map((item) => {
        if (item.fullModule === fullModule) {
          const updated = { ...item, [field]: !item[field] };
          updated.allow_all =
            updated.add_access &&
            updated.view_access &&
            updated.edit_access &&
            updated.delete_access;
          return updated;
        }
        return item;
      })
    );
  };

  // Row Allow All toggle
  const handleRowAllowAllChange = (fullModule, checked) => {
    setModulesState((prev) =>
      prev.map((item) => {
        if (item.fullModule === fullModule) {
          return {
            ...item,
            add_access: checked,
            view_access: checked,
            edit_access: checked,
            delete_access: checked,
            allow_all: checked,
          };
        }
        return item;
      })
    );
  };

  // Form submit handler
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    if (!roleName.trim()) {
      toast.warning('Please enter a valid User Role name.');
      return;
    }

    try {
      setSaving(true);
      const permissions = modulesState.map((m) => ({
        module: m.fullModule,
        add_access: m.add_access ? 1 : 0,
        view_access: m.view_access ? 1 : 0,
        edit_access: m.edit_access ? 1 : 0,
        delete_access: m.delete_access ? 1 : 0,
      }));

      await adminPermissionApi.saveRoleAndPermissions({
        roleId: isEditing ? roleId : undefined,
        role_name: roleName.trim(),
        permissions,
      });

      toast.success(
        isEditing
          ? `Role "${roleName}" permissions updated successfully!`
          : `Role "${roleName}" and permissions created successfully!`
      );
      navigate('/admin/roles-permissions');
    } catch (err) {
      console.error('Error saving role permissions:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to save role and permissions.');
    } finally {
      setSaving(false);
    }
  };

  // Filter modules by search query
  const filteredModules = modulesState.filter((m) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.section.toLowerCase().includes(q) ||
      m.name.toLowerCase().includes(q) ||
      m.fullModule.toLowerCase().includes(q)
    );
  });

  // Group filtered modules by section
  const displayGrouped = {};
  filteredModules.forEach((m) => {
    if (!displayGrouped[m.section]) {
      displayGrouped[m.section] = [];
    }
    displayGrouped[m.section].push(m);
  });

  // Sort sections
  const sortedSectionKeys = Object.keys(displayGrouped).sort((a, b) => {
    if (sortOrder === 'desc') {
      return b.localeCompare(a);
    }
    return a.localeCompare(b);
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
      </div>
      {/* /Page Header */}

      {/* Filter Section */}
      <div className="card shadow-sm mb-0">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap pb-0">
          <h4 className="mb-3">
            {isEditing ? `Edit Role & Permissions` : 'Roles & Permissions List'}
          </h4>
          <div className="d-flex align-items-center flex-wrap gap-2">
            {/* Quick Filter Search */}
            <div className="input-icon-start mb-3 me-2 position-relative">
              <span className="icon-addon">
                <i className="ti ti-search"></i>
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Search Module..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
            <div className="dropdown mb-3 me-2">
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="btn btn-outline-light bg-white dropdown-toggle"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <i className="ti ti-sort-ascending-2 me-2"></i>
                {sortOrder === 'desc' ? 'Sort by Z-A' : 'Sort by A-Z'}
              </a>
              <ul className="dropdown-menu p-3">
                <li>
                  <button
                    type="button"
                    className={`dropdown-item rounded-1 ${sortOrder === 'asc' ? 'active' : ''}`}
                    onClick={() => setSortOrder('asc')}
                  >
                    Ascending (A-Z)
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className={`dropdown-item rounded-1 ${sortOrder === 'desc' ? 'active' : ''}`}
                    onClick={() => setSortOrder('desc')}
                  >
                    Descending (Z-A)
                  </button>
                </li>
                <li>
                  <button type="button" className="dropdown-item rounded-1">
                    Recently Viewed
                  </button>
                </li>
                <li>
                  <button type="button" className="dropdown-item rounded-1">
                    Recently Added
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Roles & Permissions Form */}
        <form onSubmit={handleSubmit} className="d-flex flex-column">
          <div className="card-body p-0 pt-3">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2 text-muted">Loading permissions matrix...</p>
              </div>
            ) : (
              <>
                <div className="row px-3">
                  <div className="col-lg-4 col-12">
                    <div className="mb-3">
                      <label className="ms-3 form-label fw-bold">
                        User Role <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        name="role_name"
                        id="role_name"
                        style={{ margin: '12px 0 12px 12px' }}
                        value={roleName}
                        onChange={(e) => setRoleName(e.target.value)}
                        placeholder="e.g. Admin, Accountant, Librarian"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Fixed Height Scrollable Table Box */}
                <div
                  className="table-scroll border-top border-bottom"
                  style={{
                    height: '480px',
                    maxHeight: '480px',
                    overflowY: 'scroll',
                    overflowX: 'auto',
                    display: 'block',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <table
                    className="table mb-0"
                    style={{ width: '100%', borderCollapse: 'collapse' }}
                  >
                    <thead
                      className="thead-light"
                      style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 10,
                        backgroundColor: '#f8f9fa',
                      }}
                    >
                      <tr>
                        <th style={{ minWidth: '160px', backgroundColor: '#f8f9fa' }}>Section</th>
                        <th style={{ minWidth: '200px', backgroundColor: '#f8f9fa' }}>Modules</th>
                        <th className="text-center" style={{ minWidth: '90px', backgroundColor: '#f8f9fa' }}>Created</th>
                        <th className="text-center" style={{ minWidth: '90px', backgroundColor: '#f8f9fa' }}>View</th>
                        <th className="text-center" style={{ minWidth: '90px', backgroundColor: '#f8f9fa' }}>Edit</th>
                        <th className="text-center" style={{ minWidth: '90px', backgroundColor: '#f8f9fa' }}>Delete</th>
                        <th className="text-center" style={{ minWidth: '100px', backgroundColor: '#f8f9fa' }}>Allow All</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedSectionKeys.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="text-center py-4 text-muted">
                            No modules found matching "{searchQuery}".
                          </td>
                        </tr>
                      ) : (
                        sortedSectionKeys.map((sectionKey) => {
                          const items = displayGrouped[sectionKey];
                          return items.map((item, idx) => {
                            const isFirst = idx === 0;
                            return (
                              <tr key={item.fullModule}>
                                <td>
                                  {isFirst ? <strong>{sectionKey}</strong> : null}
                                </td>

                                <td className="text-capitalize">
                                  <input
                                    type="hidden"
                                    name={`module[${item.fullModule}]`}
                                    value={item.fullModule}
                                  />
                                  {item.name}
                                </td>

                                <td className="text-center">
                                  <div className="d-flex justify-content-center">
                                    <input
                                      type="checkbox"
                                      className="form-check-input"
                                      checked={Boolean(item.add_access)}
                                      onChange={() =>
                                        handleSingleCheckboxChange(item.fullModule, 'add_access')
                                      }
                                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                  </div>
                                </td>

                                <td className="text-center">
                                  <div className="d-flex justify-content-center">
                                    <input
                                      type="checkbox"
                                      className="form-check-input"
                                      checked={Boolean(item.view_access)}
                                      onChange={() =>
                                        handleSingleCheckboxChange(item.fullModule, 'view_access')
                                      }
                                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                  </div>
                                </td>

                                <td className="text-center">
                                  <div className="d-flex justify-content-center">
                                    <input
                                      type="checkbox"
                                      className="form-check-input"
                                      checked={Boolean(item.edit_access)}
                                      onChange={() =>
                                        handleSingleCheckboxChange(item.fullModule, 'edit_access')
                                      }
                                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                  </div>
                                </td>

                                <td className="text-center">
                                  <div className="d-flex justify-content-center">
                                    <input
                                      type="checkbox"
                                      className="form-check-input"
                                      checked={Boolean(item.delete_access)}
                                      onChange={() =>
                                        handleSingleCheckboxChange(item.fullModule, 'delete_access')
                                      }
                                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                  </div>
                                </td>

                                <td className="text-center">
                                  <div className="d-flex justify-content-center">
                                    <input
                                      type="checkbox"
                                      className="form-check-input"
                                      checked={Boolean(item.allow_all)}
                                      onChange={(e) =>
                                        handleRowAllowAllChange(item.fullModule, e.target.checked)
                                      }
                                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                  </div>
                                </td>
                              </tr>
                            );
                          });
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* Fixed Bottom Action Bar (Stationary at bottom of card) */}
          <div className="card-footer bg-white d-flex align-items-center justify-content-end p-3">
            <button
              type="submit"
              className="btn btn-primary d-inline-flex align-items-center px-4"
              disabled={saving || loading}
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </form>
      </div>
      {/* /Filter Section */}
    </div>
  );
};

export default RolePermissionForm;
