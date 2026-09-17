import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from 'react-bootstrap';
import { toast } from 'react-toastify';
import {
  fetchBranchesSummaryApi,
  createBranchApi,
  updateBranchApi,
  setMainBranchApi,
  deleteBranchApi,
  fetchCountriesApi,
  fetchStatesByCountryApi,
  fetchCitiesByStateApi,
} from '../../../api/branch.api';
import NoData from '../../../components/common/NoData';

const BranchManagement = () => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Location Lists & Selected IDs for Dependent Dropdowns
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [selectedCountryId, setSelectedCountryId] = useState('');
  const [selectedStateId, setSelectedStateId] = useState('');
  const [selectedCityId, setSelectedCityId] = useState('');

  // Modal State for Add/Edit
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [formData, setFormData] = useState({
    branch_name: '',
    branch_code: '',
    address: '',
    pincode: '',
    phone: '',
    email: '',
    principal_name: '',
    is_main_branch: 0,
    status: 1,
  });
  const [submitting, setSubmitting] = useState(false);

  // Delete Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Load Countries
  const loadCountries = async () => {
    try {
      setLoadingCountries(true);
      const res = await fetchCountriesApi();
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setCountries(list);
      return list;
    } catch (err) {
      console.error('Failed to load countries:', err);
      setCountries([]);
      return [];
    } finally {
      setLoadingCountries(false);
    }
  };

  // Fetch States by Country ID
  const fetchStates = async (countryId) => {
    if (!countryId) {
      setStates([]);
      setCities([]);
      return [];
    }
    try {
      setLoadingStates(true);
      const res = await fetchStatesByCountryApi(countryId);
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setStates(list);
      return list;
    } catch (err) {
      console.error('Failed to load states:', err);
      setStates([]);
      return [];
    } finally {
      setLoadingStates(false);
    }
  };

  // Fetch Cities by State ID
  const fetchCities = async (stateId) => {
    if (!stateId) {
      setCities([]);
      return [];
    }
    try {
      setLoadingCities(true);
      const res = await fetchCitiesByStateApi(stateId);
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setCities(list);
      return list;
    } catch (err) {
      console.error('Failed to load cities:', err);
      setCities([]);
      return [];
    } finally {
      setLoadingCities(false);
    }
  };

  // Country Change Handler -> resets State & City and loads States
  const handleCountryChange = async (countryId) => {
    setSelectedCountryId(countryId);
    setSelectedStateId('');
    setSelectedCityId('');
    setStates([]);
    setCities([]);

    if (countryId) {
      await fetchStates(countryId);
    }
  };

  // State Change Handler -> resets City and loads Cities
  const handleStateChange = async (stateId) => {
    setSelectedStateId(stateId);
    setSelectedCityId('');
    setCities([]);

    if (stateId) {
      await fetchCities(stateId);
    }
  };

  // City Change Handler
  const handleCityChange = (cityId) => {
    setSelectedCityId(cityId);
  };

  // Load Branches
  const loadBranches = async () => {
    try {
      setLoading(true);
      const res = await fetchBranchesSummaryApi();
      if (res?.success && Array.isArray(res?.data)) {
        setBranches(res.data);
      } else {
        setBranches([]);
      }
    } catch (err) {
      console.error('Failed to load branches:', err);
      toast.error(err.message || 'Failed to fetch campuses.');
      setBranches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
    loadCountries();
  }, []);

  // Open Add Modal
  const handleOpenAdd = async () => {
    setModalMode('add');
    setSelectedBranch(null);
    setFormData({
      branch_name: '',
      branch_code: '',
      address: '',
      pincode: '',
      phone: '',
      email: '',
      principal_name: '',
      is_main_branch: 0,
      status: 1,
    });
    setSelectedStateId('');
    setSelectedCityId('');
    setStates([]);
    setCities([]);
    setShowModal(true);

    let countryList = countries;
    if (!countryList || countryList.length === 0) {
      countryList = await loadCountries();
    }

    // Default to India in countries_master (ID 58 or code IN or name India) if present
    const india = countryList.find(
      (c) =>
        String(c.name || c.country_name || '').toLowerCase() === 'india' ||
        String(c.country_code || '').toUpperCase() === 'IN' ||
        c.id === 58 ||
        c.id === 101
    );
    if (india) {
      const cId = String(india.id);
      setSelectedCountryId(cId);
      await fetchStates(cId);
    } else {
      setSelectedCountryId('');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = async (branch) => {
    setModalMode('edit');
    setSelectedBranch(branch);
    setFormData({
      branch_name: branch.branch_name || '',
      branch_code: branch.branch_code || '',
      address: branch.address || '',
      pincode: branch.pincode || '',
      phone: branch.phone || '',
      email: branch.email || '',
      principal_name: branch.principal_name || '',
      is_main_branch: branch.is_main_branch || 0,
      status: branch.status !== undefined ? Number(branch.status) : 1,
    });
    setSelectedCountryId('');
    setSelectedStateId('');
    setSelectedCityId('');
    setStates([]);
    setCities([]);
    setShowModal(true);

    let countryList = countries;
    if (!countryList || countryList.length === 0) {
      countryList = await loadCountries();
    }

    // Resolve Country: check branch.country_id first, then fallback
    let matchedCountry = null;
    if (branch.country_id && countryList.length > 0) {
      matchedCountry = countryList.find((c) => String(c.id) === String(branch.country_id));
    }
    if (!matchedCountry && branch.country && countryList.length > 0) {
      matchedCountry = countryList.find(
        (c) =>
          String(c.id) === String(branch.country) ||
          (c.name || c.country_name || c.country || '').toLowerCase() === String(branch.country).toLowerCase()
      );
    }
    if (!matchedCountry && countryList.length > 0) {
      matchedCountry = countryList.find(
        (c) =>
          String(c.name || c.country_name || '').toLowerCase() === 'india' ||
          String(c.country_code || '').toUpperCase() === 'IN' ||
          c.id === 58 ||
          c.id === 101
      );
    }

    if (matchedCountry) {
      const cId = String(matchedCountry.id);
      setSelectedCountryId(cId);

      const loadedStates = await fetchStates(cId);

      // Resolve State: check branch.state_id first, then fallback
      let matchedState = null;
      if (branch.state_id && loadedStates.length > 0) {
        matchedState = loadedStates.find(
          (s) => String(s.id || s.id_state) === String(branch.state_id)
        );
      }
      if (!matchedState && branch.state && loadedStates.length > 0) {
        matchedState = loadedStates.find(
          (s) =>
            String(s.id || s.id_state) === String(branch.state) ||
            (s.state || s.name || '').toLowerCase() === String(branch.state).toLowerCase()
        );
      }

      if (matchedState) {
        const sId = String(matchedState.id || matchedState.id_state);
        setSelectedStateId(sId);

        const loadedCities = await fetchCities(sId);

        // Resolve City: check branch.city_id first, then fallback
        let matchedCity = null;
        if (branch.city_id && loadedCities.length > 0) {
          matchedCity = loadedCities.find((c) => String(c.id) === String(branch.city_id));
        }
        if (!matchedCity && branch.city && loadedCities.length > 0) {
          matchedCity = loadedCities.find(
            (c) =>
              String(c.id) === String(branch.city) ||
              (c.name || c.city || '').toLowerCase() === String(branch.city).toLowerCase()
          );
        }

        if (matchedCity) {
          setSelectedCityId(String(matchedCity.id));
        }
      }
    }
  };

  // Handle Form Input Change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? 1 : 0) : value,
    }));
  };

  // Submit Add / Edit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.branch_name.trim() || !formData.branch_code.trim()) {
      toast.warning('Branch name and branch code are required.');
      return;
    }

    const payload = {
      ...formData,
      country_id: selectedCountryId ? Number(selectedCountryId) : null,
      state_id: selectedStateId ? Number(selectedStateId) : null,
      city_id: selectedCityId ? Number(selectedCityId) : null,
    };

    try {
      setSubmitting(true);
      if (modalMode === 'add') {
        const res = await createBranchApi(payload);
        if (res?.success) {
          toast.success('Branch added successfully!');
          setShowModal(false);
          loadBranches();
          window.dispatchEvent(new CustomEvent('branch_list_updated'));
        } else {
          toast.error(res?.message || 'Failed to create branch');
        }
      } else {
        const res = await updateBranchApi(selectedBranch.id, payload);
        if (res?.success) {
          toast.success('Branch updated successfully!');
          setShowModal(false);
          loadBranches();
          window.dispatchEvent(new CustomEvent('branch_list_updated'));
        } else {
          toast.error(res?.message || 'Failed to update branch');
        }
      }
    } catch (err) {
      toast.error(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Set Main Branch
  const handleSetMain = async (branch) => {
    if (branch.is_main_branch === 1) return;
    try {
      const res = await setMainBranchApi(branch.id);
      if (res?.success) {
        toast.success(`"${branch.branch_name}" is now the primary main campus.`);
        loadBranches();
        window.dispatchEvent(new CustomEvent('branch_list_updated'));
      } else {
        toast.error(res?.message || 'Failed to set main branch.');
      }
    } catch (err) {
      toast.error(err.message || 'Operation failed.');
    }
  };

  // Open Delete Modal
  const handleOpenDelete = (branch) => {
    setBranchToDelete(branch);
    setShowDeleteModal(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!branchToDelete) return;
    try {
      setDeleting(true);
      const res = await deleteBranchApi(branchToDelete.id);
      if (res?.success) {
        toast.success('Branch deleted successfully.');
        setShowDeleteModal(false);
        setBranchToDelete(null);
        loadBranches();
        window.dispatchEvent(new CustomEvent('branch_list_updated'));
      } else {
        toast.error(res?.message || 'Failed to delete branch.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete branch.');
    } finally {
      setDeleting(false);
    }
  };

  // Restore Soft-Deleted Campus
  const handleRestore = async (branch) => {
    try {
      const res = await updateBranchApi(branch.id, { status: 1 });
      if (res?.success) {
        toast.success(`"${branch.branch_name}" restored to Active.`);
        loadBranches();
        window.dispatchEvent(new CustomEvent('branch_list_updated'));
      } else {
        toast.error(res?.message || 'Failed to restore campus.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to restore campus.');
    }
  };

  // Calculate Metrics (only non-deleted branches: status 1 or 2)
  const displayableBranches = branches.filter(
    (b) => Number(b.status) === 1 || Number(b.status) === 2 || Number(b.status) === 0
  );
  const totalBranches = displayableBranches.length;
  const mainCampus =
    displayableBranches.find((b) => b.is_main_branch === 1)?.branch_name || 'Not Designated';
  const totalStudentsAcrossBranches = displayableBranches.reduce(
    (acc, b) => acc + Number(b.student_count || 0),
    0
  );
  const totalTeachersAcrossBranches = displayableBranches.reduce(
    (acc, b) => acc + Number(b.teacher_count || 0),
    0
  );

  // Filtered branches: status 1 or 2 are displayed; status 4 (soft-deleted) is NOT displayed
  const filteredBranches = branches.filter((b) => {
    const bStatus = Number(b.status);
    if (bStatus === 4) return false;
    if (bStatus !== 1 && bStatus !== 2 && bStatus !== 0) return false;

    if (statusFilter !== 'all') {
      const filterVal = Number(statusFilter);
      if (filterVal === 2) {
        if (bStatus !== 2 && bStatus !== 0) return false;
      } else if (bStatus !== filterVal) {
        return false;
      }
    }
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (b.branch_name || '').toLowerCase().includes(q) ||
      (b.branch_code || '').toLowerCase().includes(q) ||
      (b.city || '').toLowerCase().includes(q) ||
      (b.state || '').toLowerCase().includes(q) ||
      (b.country || '').toLowerCase().includes(q) ||
      (b.principal_name || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="content container-fluid">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-4">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1 text-dark fw-bold">Campus & Branch Management</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Settings</li>
              <li className="breadcrumb-item active" aria-current="page">
                Branches
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-primary d-flex align-items-center gap-1 shadow-sm"
            onClick={handleOpenAdd}
          >
            <i className="ti ti-plus fs-16"></i>
            <span>Add New Campus</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body d-flex align-items-center gap-3">
              <div
                className="rounded-circle bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: '48px', height: '48px' }}
              >
                <i className="ti ti-building-community fs-24"></i>
              </div>
              <div>
                <p className="text-muted fs-12 mb-1 fw-medium">Total Campuses</p>
                <h4 className="mb-0 fw-bold text-dark">{totalBranches}</h4>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body d-flex align-items-center gap-3">
              <div
                className="rounded-circle bg-success bg-opacity-10 text-success d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: '48px', height: '48px' }}
              >
                <i className="ti ti-crown fs-24"></i>
              </div>
              <div className="overflow-hidden">
                <p className="text-muted fs-12 mb-1 fw-medium">Primary Campus</p>
                <h6 className="mb-0 fw-bold text-dark text-truncate" title={mainCampus}>
                  {mainCampus}
                </h6>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body d-flex align-items-center gap-3">
              <div
                className="rounded-circle bg-info bg-opacity-10 text-info d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: '48px', height: '48px' }}
              >
                <i className="ti ti-school fs-24"></i>
              </div>
              <div>
                <p className="text-muted fs-12 mb-1 fw-medium">Total Students</p>
                <h4 className="mb-0 fw-bold text-dark">{totalStudentsAcrossBranches}</h4>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body d-flex align-items-center gap-3">
              <div
                className="rounded-circle bg-warning bg-opacity-10 text-warning d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: '48px', height: '48px' }}
              >
                <i className="ti ti-users fs-24"></i>
              </div>
              <div>
                <p className="text-muted fs-12 mb-1 fw-medium">Total Teachers</p>
                <h4 className="mb-0 fw-bold text-dark">{totalTeachersAcrossBranches}</h4>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-white border-bottom py-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div className="d-flex align-items-center gap-2">
            <h5 className="card-title mb-0 fw-bold text-dark">Campuses & Branches</h5>
            <span className="badge bg-light text-muted border px-2 py-1 fs-11">
              {filteredBranches.length} {filteredBranches.length === 1 ? 'Campus' : 'Campuses'}
            </span>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            {/* Status Filter */}
            <select
              className="form-select form-select-sm"
              style={{ width: '160px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="1">Active</option>
              <option value="2">Inactive</option>
            </select>

            {/* Search Input */}
            <div className="position-relative" style={{ width: '240px' }}>
              <i
                className="ti ti-search position-absolute text-muted"
                style={{ top: '50%', left: '12px', transform: 'translateY(-50%)' }}
              ></i>
              <input
                type="text"
                className="form-control form-control-sm ps-5"
                placeholder="Search branch or city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ borderRadius: '20px' }}
              />
            </div>
          </div>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover table-nowrap align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-3">Branch Name</th>
                  <th>Code</th>
                  <th>Location</th>
                  <th>Campus Head</th>
                  <th>Contact Info</th>
                  <th>Enrollments</th>
                  <th>Status</th>
                  <th className="text-end pe-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-5 text-muted">
                      <div className="spinner-border spinner-border-sm text-primary me-2" role="status" />
                      Loading school branches...
                    </td>
                  </tr>
                ) : filteredBranches.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-5">
                      <NoData message="No campuses found matching your search." />
                    </td>
                  </tr>
                ) : (
                  filteredBranches.map((branch) => (
                    <tr key={branch.id}>
                      {/* Name & Main Badge */}
                      <td className="ps-3">
                        <div className="d-flex align-items-center gap-2">
                          <div
                            className="rounded-circle bg-light border d-flex align-items-center justify-content-center text-primary flex-shrink-0"
                            style={{ width: '36px', height: '36px' }}
                          >
                            <i className="ti ti-building fs-18"></i>
                          </div>
                          <div>
                            <span className="fw-bold text-dark d-block fs-13">
                              {branch.branch_name}
                            </span>
                            {branch.is_main_branch === 1 && (
                              <span className="badge bg-success-subtle text-success border border-success-subtle fs-10 py-0 px-1">
                                Primary Campus
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Code */}
                      <td>
                        <span className="badge bg-light text-dark border font-monospace fs-11">
                          {branch.branch_code}
                        </span>
                      </td>

                      {/* Location */}
                      <td>
                        <span className="fs-12 text-secondary">
                          {branch.city || branch.state || branch.country ? (
                            <>
                              <i className="ti ti-map-pin text-muted me-1"></i>
                              {[branch.city, branch.state, branch.country].filter(Boolean).join(', ')}
                            </>
                          ) : (
                            <span className="text-muted fst-italic">Not specified</span>
                          )}
                        </span>
                      </td>

                      {/* Principal */}
                      <td>
                        <span className="fs-13 text-dark fw-medium">
                          {branch.principal_name || <span className="text-muted fst-italic">—</span>}
                        </span>
                      </td>

                      {/* Contact */}
                      <td>
                        <div className="fs-11 text-muted">
                          {branch.phone && (
                            <div className="d-flex align-items-center gap-1">
                              <i className="ti ti-phone fs-12 text-muted"></i>
                              <span>{branch.phone}</span>
                            </div>
                          )}
                          {branch.email && (
                            <div className="d-flex align-items-center gap-1">
                              <i className="ti ti-mail fs-12 text-muted"></i>
                              <span className="text-truncate" style={{ maxWidth: '140px' }}>
                                {branch.email}
                              </span>
                            </div>
                          )}
                          {!branch.phone && !branch.email && (
                            <span className="text-muted fst-italic">—</span>
                          )}
                        </div>
                      </td>

                      {/* Counts */}
                      <td>
                        <div className="d-flex gap-1">
                          <span
                            className="badge bg-primary bg-opacity-10 text-primary fs-11"
                            title="Active Enrolled Students"
                          >
                            <i className="ti ti-school me-1"></i>
                            {branch.student_count || 0}
                          </span>
                          <span
                            className="badge bg-warning bg-opacity-10 text-warning fs-11"
                            title="Assigned Teachers"
                          >
                            <i className="ti ti-user me-1"></i>
                            {branch.teacher_count || 0}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        {Number(branch.status) === 1 ? (
                          <span className="badge bg-success-subtle text-success border border-success-subtle fs-11">
                            Active
                          </span>
                        ) : (
                          <span className="badge bg-warning-subtle text-warning border border-warning-subtle fs-11">
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="text-end pe-3">
                        <div className="dropdown">
                          <button
                            className="btn btn-sm btn-icon btn-light rounded-circle shadow-none"
                            type="button"
                            data-bs-toggle="dropdown"
                            aria-expanded="false"
                          >
                            <i className="ti ti-dots-vertical fs-14"></i>
                          </button>
                          <ul className="dropdown-menu dropdown-menu-end shadow-sm border p-1 fs-12">
                            {branch.is_main_branch !== 1 && (
                              <li>
                                <button
                                  type="button"
                                  className="dropdown-item py-1.5 rounded d-flex align-items-center gap-2 text-success"
                                  onClick={() => handleSetMain(branch)}
                                >
                                  <i className="ti ti-crown fs-14"></i>
                                  <span>Set as Main Campus</span>
                                </button>
                              </li>
                            )}
                            <li>
                              <button
                                type="button"
                                className="dropdown-item py-1.5 rounded d-flex align-items-center gap-2 text-dark"
                                onClick={() => handleOpenEdit(branch)}
                              >
                                <i className="ti ti-edit fs-14"></i>
                                <span>Edit Campus</span>
                              </button>
                            </li>
                            {branch.is_main_branch !== 1 && (
                              <li>
                                <button
                                  type="button"
                                  className="dropdown-item py-1.5 rounded d-flex align-items-center gap-2 text-danger"
                                  onClick={() => handleOpenDelete(branch)}
                                >
                                  <i className="ti ti-trash fs-14"></i>
                                  <span>Delete Campus</span>
                                </button>
                              </li>
                            )}
                          </ul>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Branch Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <form onSubmit={handleSubmit}>
          <Modal.Header closeButton className="border-bottom py-3">
            <Modal.Title className="fs-16 fw-bold text-dark d-flex align-items-center gap-2">
              <i className="ti ti-building-community text-primary fs-18"></i>
              <span>{modalMode === 'add' ? 'Add New School Campus' : 'Edit Campus Details'}</span>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            <div className="row g-3">
              {/* Branch Name */}
              <div className="col-12 col-md-8">
                <label className="form-label fs-12 fw-semibold text-dark">
                  Campus / Branch Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  name="branch_name"
                  className="form-control form-control-sm"
                  placeholder="e.g. St. Xavier's North Campus"
                  value={formData.branch_name}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Branch Code */}
              <div className="col-12 col-md-4">
                <label className="form-label fs-12 fw-semibold text-dark">
                  Branch Code <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  name="branch_code"
                  className="form-control form-control-sm font-monospace text-uppercase"
                  placeholder="e.g. NC-01"
                  value={formData.branch_code}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Principal Name */}
              <div className="col-12 col-md-6">
                <label className="form-label fs-12 fw-semibold text-dark">
                  Principal / Campus Head
                </label>
                <input
                  type="text"
                  name="principal_name"
                  className="form-control form-control-sm"
                  placeholder="e.g. Dr. Robert Vance"
                  value={formData.principal_name}
                  onChange={handleChange}
                />
              </div>

              {/* Phone */}
              <div className="col-12 col-md-6">
                <label className="form-label fs-12 fw-semibold text-dark">Contact Phone</label>
                <input
                  type="tel"
                  name="phone"
                  className="form-control form-control-sm"
                  placeholder="e.g. +91 98765 43210"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

              {/* Email */}
              <div className="col-12 col-md-6">
                <label className="form-label fs-12 fw-semibold text-dark">Campus Email</label>
                <input
                  type="email"
                  name="email"
                  className="form-control form-control-sm"
                  placeholder="e.g. north@school.edu"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              {/* Street Address */}
              <div className="col-12 col-md-8">
                <label className="form-label fs-12 fw-semibold text-dark">Street Address</label>
                <input
                  type="text"
                  name="address"
                  className="form-control form-control-sm"
                  placeholder="Plot 45, Sector 5, Block B"
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>

              {/* Pincode */}
              <div className="col-12 col-md-4">
                <label className="form-label fs-12 fw-semibold text-dark">Pincode / Postal Code</label>
                <input
                  type="text"
                  name="pincode"
                  className="form-control form-control-sm"
                  placeholder="e.g. 110001"
                  value={formData.pincode}
                  onChange={handleChange}
                />
              </div>

              {/* Country */}
              <div className="col-12 col-md-4">
                <label className="form-label fs-12 fw-semibold text-dark">Country</label>
                <select
                  name="country"
                  className="form-select form-select-sm"
                  value={selectedCountryId}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  disabled={loadingCountries}
                >
                  <option value="">{loadingCountries ? 'Loading Countries...' : 'Select Country'}</option>
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || c.country || c.country_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* State (Dependent on Country) */}
              <div className="col-12 col-md-4">
                <label className="form-label fs-12 fw-semibold text-dark">State</label>
                <select
                  name="state"
                  className="form-select form-select-sm"
                  value={selectedStateId}
                  onChange={(e) => handleStateChange(e.target.value)}
                  disabled={!selectedCountryId || loadingStates}
                >
                  <option value="">
                    {loadingStates
                      ? 'Loading States...'
                      : !selectedCountryId
                      ? 'Select Country first'
                      : 'Select State'}
                  </option>
                  {states.map((st) => (
                    <option key={st.id || st.id_state} value={st.id || st.id_state}>
                      {st.state || st.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* City (Dependent on State) */}
              <div className="col-12 col-md-4">
                <label className="form-label fs-12 fw-semibold text-dark">City</label>
                <select
                  name="city"
                  className="form-select form-select-sm"
                  value={selectedCityId}
                  onChange={(e) => handleCityChange(e.target.value)}
                  disabled={!selectedStateId || loadingCities}
                >
                  <option value="">
                    {loadingCities
                      ? 'Loading Cities...'
                      : !selectedStateId
                      ? 'Select State first'
                      : 'Select City'}
                  </option>
                  {cities.map((ct) => (
                    <option key={ct.id} value={ct.id}>
                      {ct.name || ct.city}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div className="col-12 col-md-6">
                <label className="form-label fs-12 fw-semibold text-dark" htmlFor="status">
                  Status <span className="text-danger">*</span>
                </label>
                <select
                  id="status"
                  name="status"
                  className="form-select form-select-sm"
                  value={Number(formData.status)}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, status: Number(e.target.value) }))
                  }
                >
                  <option value={1}>Active</option>
                  <option value={2}>Inactive</option>
                </select>
              </div>

              {/* Main Campus Checkbox */}
              <div className="col-12 col-md-6 d-flex align-items-end pb-1">
                <div className="form-check form-switch">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="is_main_branch"
                    name="is_main_branch"
                    checked={formData.is_main_branch === 1}
                    onChange={handleChange}
                  />
                  <label className="form-check-label fs-12 fw-medium text-dark ms-1" htmlFor="is_main_branch">
                    Designate as Primary Campus
                  </label>
                </div>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer className="border-top py-2">
            <button
              type="button"
              className="btn btn-sm btn-light"
              onClick={() => setShowModal(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-sm btn-primary shadow-sm" disabled={submitting}>
              {submitting ? 'Saving...' : modalMode === 'add' ? 'Create Campus' : 'Update Campus'}
            </button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered size="sm">
        <Modal.Body className="text-center p-4">
          <div
            className="rounded-circle bg-danger bg-opacity-10 text-danger d-inline-flex align-items-center justify-content-center mb-3"
            style={{ width: '56px', height: '56px' }}
          >
            <i className="ti ti-trash fs-28"></i>
          </div>
          <h5 className="fw-bold text-dark mb-1">Delete Campus?</h5>
          <p className="fs-12 text-muted mb-4">
            Are you sure you want to delete{' '}
            <strong className="text-dark">"{branchToDelete?.branch_name}"</strong>? This will mark
            the campus as deleted (Soft Delete). It can be restored at any time.
          </p>
          <div className="d-flex gap-2 justify-content-center">
            <button
              type="button"
              className="btn btn-sm btn-light px-3"
              onClick={() => setShowDeleteModal(false)}
              disabled={deleting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-sm btn-danger px-3"
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Soft Delete'}
            </button>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default BranchManagement;
