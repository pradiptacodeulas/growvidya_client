import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { usePermission } from '../../../hooks/usePermission';
import adminFeesApi from '../../../api/adminFees.api';
import adminAcademicApi from '../../../api/adminAcademic.api';
import { fetchRoutesApi } from '../../../api/adminTransport.api';
import { fetchHostelsApi } from '../../../api/adminHostel.api';
import { fetchBranchesApi } from '../../../api/branch.api';
import NoData from '../../../components/common/NoData';

const MONTHS_OPTIONS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => i + 1);

const getMonthName = (monthVal) => {
  const found = MONTHS_OPTIONS.find((m) => Number(m.value) === Number(monthVal));
  return found ? found.label : '-';
};

const FeesStructures = () => {
  const { user } = useSelector((state) => state.auth || {});
  const { isSuperAdmin } = usePermission();
  const userBranchId = user?.branch_id || user?.branchId || (localStorage.getItem('active_branch_id') !== 'all' ? localStorage.getItem('active_branch_id') : null);

  const canManageStruct = (struct) => {
    if (isSuperAdmin) return true;
    if (!struct?.branch_id) return false;
    if (userBranchId && String(struct.branch_id) !== String(userBranchId)) return false;
    return true;
  };

  const [structures, setStructures] = useState([]);
  const [classes, setClasses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [feeComponents, setFeeComponents] = useState([]);
  const [transportRoutes, setTransportRoutes] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modal State for View / Details
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewStructure, setViewStructure] = useState(null);

  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    const handleBranchChange = () => {
      setReloadTrigger((prev) => prev + 1);
    };
    window.addEventListener('branch_changed', handleBranchChange);
    return () => {
      window.removeEventListener('branch_changed', handleBranchChange);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchInitialData = async () => {
      try {
        const [structRes, classRes, yearRes, compRes, routesRes, hostelsRes, branchRes] = await Promise.all([
          adminFeesApi.getAllStructures(),
          adminAcademicApi.getAllClasses({ status: 1 }).catch(() => ({ data: [] })),
          adminAcademicApi.getAllAcademicYears({ status: 1 }).catch(() => ({ data: [] })),
          adminFeesApi.getAllComponents({ status: 1 }).catch(() => ({ data: { components: [] } })),
          fetchRoutesApi().catch(() => ({ data: [] })),
          fetchHostelsApi().catch(() => ({ data: [] })),
          fetchBranchesApi().catch(() => ({ data: [] })),
        ]);

        const structsList = structRes?.data?.structures || [];
        const classesList = Array.isArray(classRes?.data)
          ? classRes.data
          : Array.isArray(classRes?.data?.classes)
          ? classRes.data.classes
          : Array.isArray(classRes)
          ? classRes
          : [];
        const yearsList = Array.isArray(yearRes?.data?.academicYears)
          ? yearRes.data.academicYears
          : Array.isArray(yearRes?.data)
          ? yearRes.data
          : [];
        const compsList = compRes?.data?.components || (Array.isArray(compRes?.data) ? compRes.data : []);
        const routesList = Array.isArray(routesRes?.data)
          ? routesRes.data
          : Array.isArray(routesRes?.routes)
          ? routesRes.routes
          : [];
        const hostelsList = Array.isArray(hostelsRes?.data?.hostels)
          ? hostelsRes.data.hostels
          : Array.isArray(hostelsRes?.data)
          ? hostelsRes.data
          : Array.isArray(hostelsRes?.hostels)
          ? hostelsRes.hostels
          : [];
        const branchesList = Array.isArray(branchRes?.data)
          ? branchRes.data
          : Array.isArray(branchRes)
          ? branchRes
          : [];

        if (isMounted) {
          setStructures(structsList);
          setClasses(classesList);
          setAcademicYears(yearsList);
          setFeeComponents(compsList);
          setBranches(branchesList);
          if (routesList.length > 0) setTransportRoutes(routesList);
          if (hostelsList.length > 0) setHostels(hostelsList);
        }
      } catch (err) {
        console.error('Failed to load fee structures initial data:', err);
        toast.error('Failed to load fee structures data');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchInitialData();
    return () => {
      isMounted = false;
    };
  }, [reloadTrigger]);

  const getClassNamesDisplay = (struct) => {
    if (!struct) return '-';
    if (struct.class_name && struct.class_name !== 'All Classes') return struct.class_name;
    if (struct.class_names && struct.class_names !== 'All Classes') return struct.class_names;
    if (struct.class_id) {
      const ids = String(struct.class_id).split(',').map((id) => id.trim()).filter(Boolean);
      if (ids.length > 0 && classes.length > 0) {
        const names = ids
          .map((id) => {
            const found = classes.find((c) => String(c.id) === String(id));
            return found ? found.class_name : `Class ${id}`;
          })
          .join(', ');
        return names || 'All Classes';
      }
    }
    return struct.class_name || struct.class_names || 'All Classes';
  };


  const handleOpenViewModal = async (struct) => {
    try {
      const res = await adminFeesApi.getStructureById(struct.id);
      const detail = res?.data || struct;
      const merged = {
        ...struct,
        ...detail,
        class_name: detail.class_name || struct.class_name,
        class_names: detail.class_names || struct.class_names,
        academic_year: detail.academic_year || struct.academic_year,
        branch_name: detail.branch_name || struct.branch_name,
      };
      if (!merged.branch_name && merged.branch_id) {
        const foundBranch = branches.find((b) => String(b.id) === String(merged.branch_id));
        if (foundBranch) merged.branch_name = foundBranch.branch_name;
      }
      setViewStructure(merged);
      setShowViewModal(true);
    } catch {
      const fallback = { ...struct };
      if (!fallback.branch_name && fallback.branch_id) {
        const foundBranch = branches.find((b) => String(b.id) === String(fallback.branch_id));
        if (foundBranch) fallback.branch_name = foundBranch.branch_name;
      }
      setViewStructure(fallback);
      setShowViewModal(true);
    }
  };


  // Publish Confirmation Modal State
  const [publishModal, setPublishModal] = useState({
    show: false,
    struct: null,
    processing: false,
  });

  const handleOpenPublishModal = (struct) => {
    if (Number(struct.is_published) === 1) {
      toast.info('A published fee structure cannot be reverted to Draft. It must remain published.');
      return;
    }
    setPublishModal({
      show: true,
      struct,
      processing: false,
    });
  };

  const handleConfirmPublish = async () => {
    if (!publishModal.struct?.id) return;

    try {
      setPublishModal((prev) => ({ ...prev, processing: true }));
      const res = await adminFeesApi.togglePublishStructure(publishModal.struct.id, 1);
      toast.success(res?.message || 'Fee structure published successfully.');
      setPublishModal({ show: false, struct: null, processing: false });
      setShowViewModal(false);
      setReloadTrigger((prev) => prev + 1);
    } catch (err) {
      console.error('Failed to publish fee structure:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to publish fee structure.');
      setPublishModal((prev) => ({ ...prev, processing: false }));
    }
  };

  // Status Confirmation Modal State
  const [statusModal, setStatusModal] = useState({
    show: false,
    struct: null,
    targetStatus: 1, // 1 for Activate, 2 for Deactivate
    processing: false,
  });

  const handleOpenStatusModal = (struct, targetStatus) => {
    setStatusModal({
      show: true,
      struct,
      targetStatus: targetStatus !== undefined ? targetStatus : (Number(struct.status) === 1 ? 2 : 1),
      processing: false,
    });
  };

  const handleConfirmStatusChange = async () => {
    if (!statusModal.struct?.id) return;
    try {
      setStatusModal((prev) => ({ ...prev, processing: true }));
      const res = await adminFeesApi.updateStructureStatus(statusModal.struct.id, statusModal.targetStatus);
      toast.success(res?.message || `Fee structure marked ${statusModal.targetStatus === 1 ? 'Active' : 'Inactive'}.`);
      setStatusModal({ show: false, struct: null, targetStatus: 1, processing: false });
      if (showViewModal && viewStructure?.id === statusModal.struct.id) {
        setViewStructure((prev) => ({ ...prev, status: statusModal.targetStatus }));
      }
      setReloadTrigger((prev) => prev + 1);
    } catch (err) {
      console.error('Failed to update status:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to update status.');
      setStatusModal((prev) => ({ ...prev, processing: false }));
    }
  };

  // Delete Confirmation Modal State
  const [deleteModal, setDeleteModal] = useState({
    show: false,
    id: null,
    name: '',
    processing: false,
  });

  const handleDelete = (id, name, isPublished) => {
    if (Number(isPublished) === 1) {
      toast.error('A published fee structure cannot be deleted by anyone, including Super Admin.');
      return;
    }
    setDeleteModal({
      show: true,
      id,
      name,
      processing: false,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.id) return;

    try {
      setDeleteModal((prev) => ({ ...prev, processing: true }));
      await adminFeesApi.deleteStructure(deleteModal.id);
      toast.success('Fee structure deleted successfully.');
      setDeleteModal({ show: false, id: null, name: '', processing: false });
      setReloadTrigger((prev) => prev + 1);
    } catch (err) {
      console.error('Failed to delete structure:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to delete structure.');
      setDeleteModal((prev) => ({ ...prev, processing: false }));
    }
  };

  // Filter Structures
  const filteredStructures = useMemo(() => {
    return structures.filter((s) => {
      const matchSearch =
        !searchTerm.trim() ||
        s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.frequency?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.class_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.class_names?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchYear = !selectedYear || String(s.academic_year_id) === String(selectedYear);
      const matchStatus = !selectedStatus || String(s.status) === String(selectedStatus);

      return matchSearch && matchYear && matchStatus;
    });
  }, [structures, searchTerm, selectedYear, selectedStatus]);

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div>
          <h3 className="page-title mb-1">
            <i className="ti ti-layers-subtract me-2 text-primary"></i>Fee Structures &amp; Groups
          </h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/fees/dashboard">Fees</Link>
              </li>
              <li className="breadcrumb-item active">Fee Structures</li>
            </ol>
          </nav>
        </div>
        <div className="d-flex gap-2">
          <Link to="/admin/fees/structures/create" className="btn btn-primary">
            <i className="ti ti-plus me-1"></i>Create Fee Structure
          </Link>
        </div>
      </div>
      {/* /Page Header */}

      {/* Main Card */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white py-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h5 className="mb-0 text-dark fw-bold">Master Fee Packages &amp; Rules</h5>

          <div className="d-flex align-items-center gap-2">
            <select
              className="form-select form-select-sm"
              style={{ width: '160px' }}
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="">All Academic Years</option>
              {academicYears.map((ay) => (
                <option key={`ay-${ay.id}`} value={ay.id}>
                  {ay.academic_year}
                </option>
              ))}
            </select>

            <select
              className="form-select form-select-sm"
              style={{ width: '130px' }}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="1">Active</option>
              <option value="2">Inactive</option>
            </select>

            <input
              type="search"
              className="form-control form-control-sm"
              placeholder="Search structures..."
              style={{ width: '180px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>#</th>
                  <th>Structure Name</th>
                  <th>Class</th>
                  <th>Academic Year</th>
                  <th>Frequency</th>
                  <th>Total Fee</th>
                  <th>Due Day / Grace</th>
                  <th>Late Fee Rule</th>
                  <th>Publish</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="11" className="text-center py-4 text-muted">
                      <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
                      Loading fee structures...
                    </td>
                  </tr>
                ) : filteredStructures.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="text-center py-4">
                      <NoData
                        title="No Fee Structures Found"
                        message='No fee structures found. Click "Create Fee Structure" to build one.'
                        imageHeight={100}
                        py={2}
                      />
                    </td>
                  </tr>
                ) : (
                  filteredStructures.map((struct, idx) => (
                    <tr key={`struct-${struct.id}`}>
                      <td>{idx + 1}</td>
                      <td>
                        <div className="fw-bold text-dark">{struct.name}</div>
                        {struct.branch_name ? (
                          <span
                            className="badge bg-primary-transparent text-primary fs-11 text-wrap text-start text-break py-1 px-2 border border-primary-subtle d-inline-flex align-items-center mt-1"
                            title={`Campus: ${struct.branch_name}`}
                            style={{ whiteSpace: 'normal', wordBreak: 'break-word', maxWidth: '240px', lineHeight: '1.3' }}
                          >
                            <i className="ti ti-building me-1 flex-shrink-0"></i>
                            <span>{struct.branch_name}</span>
                          </span>
                        ) : (
                          <span className="badge bg-light text-muted border fs-11 mt-1">
                            All Campuses
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="badge bg-primary text-white">
                          {getClassNamesDisplay(struct)}
                        </span>
                      </td>
                      <td>{struct.academic_year || '-'}</td>
                      <td>
                        <span className="badge bg-light text-dark border">{struct.frequency}</span>
                        {struct.start_month ? (
                          <div className="text-muted fs-11 mt-1">
                            Starts: {getMonthName(struct.start_month)}, Day {struct.generate_on_day || 1}
                          </div>
                        ) : null}
                      </td>
                      <td>
                        <span className="fw-bold text-dark">
                          ₹{(
                            (struct.components && struct.components.length > 0)
                              ? struct.components.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0)
                              : (parseFloat(struct.total_amount) || 0)
                          ).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td>
                        Day {struct.due_day}{' '}
                        <small className="text-muted">(+{struct.grace_period_days} grace days)</small>
                      </td>
                      <td>
                        <span className="text-danger fw-bold">
                          ₹{parseFloat(struct.late_fee_amount || 0).toFixed(2)}
                        </span>
                      </td>
                      <td>
                        {struct.is_published === 1 ? (
                          <span
                            className="badge bg-success shadow-sm"
                            title="Published (A published fee structure cannot be reverted to Draft)"
                          >
                            <i className="ti ti-check me-1"></i>Published
                          </span>
                        ) : canManageStruct(struct) ? (
                          <button
                            type="button"
                            className="btn btn-link p-0 text-decoration-none border-0"
                            onClick={() => handleOpenPublishModal(struct)}
                            title="Click to publish this structure"
                          >
                            <span className="badge bg-warning text-dark shadow-sm" style={{ cursor: 'pointer' }}>
                              <i className="ti ti-clock me-1"></i>Draft
                            </span>
                          </button>
                        ) : (
                          <span className="badge bg-warning text-dark shadow-sm" title="Draft">
                            <i className="ti ti-clock me-1"></i>Draft
                          </span>
                        )}
                      </td>
                      <td>
                        {Number(struct.status) === 2 ? (
                          canManageStruct(struct) ? (
                            <button
                              type="button"
                              className="btn btn-link p-0 text-decoration-none border-0"
                              onClick={() => handleOpenStatusModal(struct, 1)}
                              title="Inactive - Click to Activate"
                            >
                              <span className="badge bg-danger-transparent text-danger border border-danger-subtle shadow-sm" style={{ cursor: 'pointer' }}>
                                <i className="ti ti-circle-x me-1"></i>Inactive
                              </span>
                            </button>
                          ) : (
                            <span className="badge bg-danger-transparent text-danger border border-danger-subtle shadow-sm" title="Inactive">
                              <i className="ti ti-circle-x me-1"></i>Inactive
                            </span>
                          )
                        ) : (
                          canManageStruct(struct) ? (
                            <button
                              type="button"
                              className="btn btn-link p-0 text-decoration-none border-0"
                              onClick={() => handleOpenStatusModal(struct, 2)}
                              title="Active - Click to Deactivate"
                            >
                              <span className="badge bg-success-transparent text-success border border-success-subtle shadow-sm" style={{ cursor: 'pointer' }}>
                                <i className="ti ti-circle-check me-1"></i>Active
                              </span>
                            </button>
                          ) : (
                            <span className="badge bg-success-transparent text-success border border-success-subtle shadow-sm" title="Active">
                              <i className="ti ti-circle-check me-1"></i>Active
                            </span>
                          )
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-info me-1"
                          onClick={() => handleOpenViewModal(struct)}
                          title="View Details"
                        >
                          <i className="ti ti-eye me-1"></i>View
                        </button>
                        {struct.is_published !== 1 && canManageStruct(struct) && (
                          <Link
                            to={`/admin/fees/structures/edit/${struct.id}`}
                            className="btn btn-sm btn-outline-primary me-1"
                            title="Edit"
                          >
                            <i className="ti ti-edit me-1"></i>Edit
                          </Link>
                        )}
                        {struct.is_published !== 1 && canManageStruct(struct) && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-success me-1"
                            onClick={() => handleOpenPublishModal(struct)}
                            title="Publish Structure"
                          >
                            <i className="ti ti-check me-1"></i>Publish
                          </button>
                        )}
                        {canManageStruct(struct) && (
                          Number(struct.status) === 2 ? (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-success me-1"
                              onClick={() => handleOpenStatusModal(struct, 1)}
                              title="Activate Structure"
                            >
                              <i className="ti ti-player-play me-1"></i>Activate
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-warning me-1"
                              onClick={() => handleOpenStatusModal(struct, 2)}
                              title="Deactivate Structure"
                            >
                              <i className="ti ti-player-pause me-1"></i>Deactivate
                            </button>
                          )
                        )}
                        {struct.is_published !== 1 && canManageStruct(struct) && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(struct.id, struct.name, struct.is_published)}
                            title="Delete"
                          >
                            <i className="ti ti-trash me-1"></i>Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>



      {/* View Structure Details Modal */}
      {showViewModal && viewStructure && (() => {
        const comps = viewStructure.components || [];
        const hasHostelComp = comps.some((c) => {
          const name = String(c.component_name || c.name || '').toLowerCase();
          const code = String(c.code || c.component_code || '').toLowerCase();
          return name.includes('hostel') || code === 'hostel';
        });
        const hasTransportComp = comps.some((c) => {
          const name = String(c.component_name || c.name || '').toLowerCase();
          const code = String(c.code || c.component_code || '').toLowerCase();
          return name.includes('transport') || code === 'trans';
        });

        return (
          <div
            className="modal fade show d-block"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            tabIndex="-1"
            role="dialog"
          >
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" role="document">
              <div className="modal-content border-0 shadow-lg">
                <div className="modal-header bg-info text-white">
                  <h5 className="modal-title text-white fw-bold">
                    <i className="ti ti-eye me-2"></i>Fee Structure Details
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setShowViewModal(false)}
                    aria-label="Close"
                  ></button>
                </div>
                <div className="modal-body p-4">
                  <div className="row g-3 mb-4 pb-3 border-bottom align-items-start">
                    <div className="col-12 col-md-6">
                      <label className="text-muted fs-12 text-uppercase fw-semibold d-block mb-1">
                        Structure Name
                      </label>
                      <h5 className="fw-bold text-dark mb-0 text-break">{viewStructure.name || '-'}</h5>
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="text-muted fs-12 text-uppercase fw-semibold d-block mb-1">
                        Campus / Branch
                      </label>
                      <div>
                        {viewStructure.branch_name ? (
                          <span
                            className="badge bg-primary-transparent text-primary fs-12 text-wrap text-start text-break py-1.5 px-2.5 border border-primary-subtle d-inline-flex align-items-center"
                            style={{
                              whiteSpace: 'normal',
                              wordBreak: 'break-word',
                              maxWidth: '100%',
                              lineHeight: '1.4',
                            }}
                          >
                            <i className="ti ti-building me-1.5 flex-shrink-0 fs-13"></i>
                            <span>{viewStructure.branch_name}</span>
                          </span>
                        ) : (
                          <span
                            className="badge bg-light text-muted fs-12 text-wrap text-start py-1.5 px-2.5 border d-inline-flex align-items-center"
                            style={{ whiteSpace: 'normal', lineHeight: '1.4' }}
                          >
                            <i className="ti ti-building me-1.5 flex-shrink-0 fs-13"></i>
                            <span>All Campuses (School-wide)</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="col-12 col-md-5">
                      <label className="text-muted fs-12 text-uppercase fw-semibold d-block mb-1">
                        Target Class
                      </label>
                      <div>
                        <span
                          className="badge bg-primary text-white fs-12 text-wrap text-start text-break py-1.5 px-2.5 d-inline-flex align-items-center"
                          style={{
                            whiteSpace: 'normal',
                            wordBreak: 'break-word',
                            maxWidth: '100%',
                            lineHeight: '1.4',
                          }}
                        >
                          <i className="ti ti-school me-1.5 flex-shrink-0 fs-13"></i>
                          <span>{getClassNamesDisplay(viewStructure)}</span>
                        </span>
                      </div>
                    </div>
                    <div className="col-12 col-md-3">
                      <label className="text-muted fs-12 text-uppercase fw-semibold d-block mb-1">
                        Academic Year
                      </label>
                      <div className="d-inline-flex align-items-center gap-1.5 py-1 text-dark fw-semibold fs-14">
                        <i className="ti ti-calendar text-muted fs-15"></i>
                        <span>{viewStructure.academic_year || '-'}</span>
                      </div>
                    </div>
                    <div className="col-6 col-md-2">
                      <label className="text-muted fs-12 text-uppercase fw-semibold d-block mb-1">
                        Publish
                      </label>
                      <div>
                        {viewStructure.is_published === 1 ? (
                          <span className="badge bg-success fs-12 py-1 px-2.5">
                            <i className="ti ti-check me-1"></i>Published
                          </span>
                        ) : (
                          <span className="badge bg-warning text-dark fs-12 py-1 px-2.5">
                            <i className="ti ti-clock me-1"></i>Draft
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="col-6 col-md-2">
                      <label className="text-muted fs-12 text-uppercase fw-semibold d-block mb-1">
                        Status
                      </label>
                      <div>
                        {Number(viewStructure.status) === 2 ? (
                          <span className="badge bg-danger-transparent text-danger border border-danger-subtle fs-12 py-1 px-2.5">
                            <i className="ti ti-circle-x me-1"></i>Inactive
                          </span>
                        ) : (
                          <span className="badge bg-success-transparent text-success border border-success-subtle fs-12 py-1 px-2.5">
                            <i className="ti ti-circle-check me-1"></i>Active
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="row g-3 mb-4 p-3 bg-light rounded border">
                    <div className="col-6 col-md-2">
                      <small className="text-muted d-block">Start Month & Day</small>
                      <span className="fw-bold text-primary">
                        {getMonthName(viewStructure.start_month || 1)}, Day {viewStructure.generate_on_day || 1}
                      </span>
                    </div>
                    <div className="col-6 col-md-2">
                      <small className="text-muted d-block">Billing Frequency</small>
                      <span className="fw-bold text-dark">{viewStructure.frequency || '-'}</span>
                    </div>
                    <div className="col-6 col-md-2">
                      <small className="text-muted d-block">Total Fee</small>
                      <span className="fw-bold text-success fs-14">
                        ₹{comps.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="col-6 col-md-2">
                      <small className="text-muted d-block">Due Day</small>
                      <span className="fw-bold text-dark">Day {viewStructure.due_day || 10}</span>
                    </div>
                    <div className="col-6 col-md-2">
                      <small className="text-muted d-block">Grace Period</small>
                      <span className="fw-bold text-dark">
                        {viewStructure.grace_period_days || 0} Days
                      </span>
                    </div>
                    <div className="col-6 col-md-2">
                      <small className="text-muted d-block">Late Fee Rule</small>
                      <span className="fw-bold text-danger">
                        {parseFloat(viewStructure.late_fee_amount) > 0
                          ? `₹${parseFloat(viewStructure.late_fee_amount).toFixed(2)}`
                          : 'None'}
                      </span>
                    </div>
                  </div>

                  <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                    <h6 className="fw-bold text-dark mb-0">
                      <i className="ti ti-list me-1 text-primary"></i>Fee Line Items / Components Breakdown
                    </h6>
                    <span className="badge bg-primary-transparent text-primary fs-13 py-1.5 px-3 border border-primary-subtle fw-semibold">
                      Total Fee: ₹{comps.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-bordered table-striped align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>#</th>
                          <th>Component Name</th>
                          <th>Code</th>
                          <th className="text-end">Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comps.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="text-center text-muted py-3">
                              No fee components configured for this structure.
                            </td>
                          </tr>
                        ) : (
                          comps.map((comp, idx) => {
                            const amt = parseFloat(comp.amount) || 0;
                            const compNameLower = String(comp.component_name || comp.name || '').toLowerCase();
                            const compCodeLower = String(comp.code || comp.component_code || '').toLowerCase();
                            const isDynamic =
                              compNameLower.includes('hostel') ||
                              compNameLower.includes('transport') ||
                              compCodeLower === 'hostel' ||
                              compCodeLower === 'trans';

                            return (
                              <tr key={`vc-${comp.id || idx}`}>
                                <td>{idx + 1}</td>
                                <td className="fw-semibold text-dark">
                                  {comp.component_name || comp.name}
                                </td>
                                <td>
                                  <span className="badge bg-light text-secondary border">
                                    {comp.code || comp.component_code || '-'}
                                  </span>
                                </td>
                                <td className="text-end fw-bold text-dark">
                                  {isDynamic && amt === 0 ? (
                                    <span className="badge bg-light text-primary border">
                                      <i className="ti ti-user-check me-1"></i>Dynamic per Student
                                    </span>
                                  ) : (
                                    `₹${amt.toFixed(2)}`
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                      <tfoot className="table-light border-top">
                        <tr>
                          <th colSpan="3" className="text-end fw-bold">Total Fee:</th>
                          <th className="text-end fw-bold text-dark fs-14">
                            ₹{comps.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </th>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Hostel Fees Breakdown Section */}
                  {hasHostelComp && (
                    <div className="mt-4">
                      <h6 className="fw-bold text-dark mb-3">
                        <i className="ti ti-building-hospital me-1 text-primary"></i>Hostel List &amp; Fee Amount
                      </h6>
                      <div className="table-responsive">
                        <table className="table table-bordered table-striped align-middle mb-0">
                          <thead className="table-light">
                            <tr>
                              <th style={{ width: '60px' }}>#</th>
                              <th>Hostel Name</th>
                              <th className="text-end" style={{ width: '200px' }}>Hostel Fee (₹)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {hostels.length === 0 ? (
                              <tr>
                                <td colSpan="3" className="text-center text-muted py-3">
                                  No hostels registered yet.
                                </td>
                              </tr>
                            ) : (
                              hostels.map((h, idx) => (
                                <tr key={`h-${h.id || idx}`}>
                                  <td>{idx + 1}</td>
                                  <td className="fw-semibold text-dark">{h.hostel_name || h.name || 'Hostel'}</td>
                                  <td className="text-end fw-bold text-primary">
                                    ₹{parseFloat(h.hostel_fee || h.fee || 0).toFixed(2)}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Transport Fees Breakdown Section */}
                  {hasTransportComp && (
                    <div className="mt-4">
                      <h6 className="fw-bold text-dark mb-3">
                        <i className="ti ti-bus me-1 text-primary"></i>Transport Route List &amp; Fare Amount
                      </h6>
                      <div className="table-responsive">
                        <table className="table table-bordered table-striped align-middle mb-0">
                          <thead className="table-light">
                            <tr>
                              <th style={{ width: '60px' }}>#</th>
                              <th>Route Name</th>
                              <th className="text-end" style={{ width: '200px' }}>Route Fare (₹)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {transportRoutes.length > 0 ? (
                              transportRoutes.map((r, idx) => (
                                <tr key={`r-${r.id}`}>
                                  <td>{idx + 1}</td>
                                  <td className="fw-semibold text-dark">{r.transport_route || r.name}</td>
                                  <td className="text-end fw-bold text-primary">
                                    ₹{parseFloat(r.fare || 0).toFixed(2)}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <>
                                <tr>
                                  <td>1</td>
                                  <td className="fw-semibold text-dark">Simurali-Chakdaha Main</td>
                                  <td className="text-end fw-bold text-primary">₹800.00</td>
                                </tr>
                                <tr>
                                  <td>2</td>
                                  <td className="fw-semibold text-dark">MADANPUR-SIMURALI (MAIN)</td>
                                  <td className="text-end fw-bold text-primary">₹1000.00</td>
                                </tr>
                              </>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
                <div className="modal-footer bg-light py-2 gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowViewModal(false)}
                  >
                    Close
                  </button>
                  {canManageStruct(viewStructure) && (
                    Number(viewStructure.status) === 2 ? (
                      <button
                        type="button"
                        className="btn btn-outline-success"
                        onClick={() => handleOpenStatusModal(viewStructure, 1)}
                      >
                        <i className="ti ti-player-play me-1"></i>
                        Activate Structure
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-outline-warning"
                        onClick={() => handleOpenStatusModal(viewStructure, 2)}
                      >
                        <i className="ti ti-player-pause me-1"></i>
                        Deactivate Structure
                      </button>
                    )
                  )}
                  {viewStructure.is_published !== 1 && canManageStruct(viewStructure) && (
                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={() => handleOpenPublishModal(viewStructure)}
                    >
                      <i className="ti ti-check me-1"></i>
                      Publish Structure
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-0 pb-0">
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setDeleteModal({ show: false, id: null, name: '', processing: false })}
                  aria-label="Close"
                  disabled={deleteModal.processing}
                ></button>
              </div>
              <div className="modal-body text-center pt-0 pb-4 px-4">
                <div className="text-danger mb-3">
                  <i className="ti ti-trash-x fs-48"></i>
                </div>
                <h4 className="mb-2 text-dark fw-bold">Delete Fee Structure</h4>
                <p className="text-muted mb-4">
                  Are you sure you want to delete <strong className="text-dark">"{deleteModal.name}"</strong>? This will also remove all associated student fee allocations.
                </p>
                <div className="d-flex justify-content-center gap-2">
                  <button
                    type="button"
                    className="btn btn-light px-4 border"
                    onClick={() => setDeleteModal({ show: false, id: null, name: '', processing: false })}
                    disabled={deleteModal.processing}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger px-4"
                    onClick={handleConfirmDelete}
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

      {/* Custom Publish Confirmation Modal */}
      {publishModal.show && publishModal.struct && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header border-0 pb-0">
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setPublishModal({ show: false, struct: null, processing: false })}
                  aria-label="Close"
                  disabled={publishModal.processing}
                ></button>
              </div>
              <div className="modal-body text-center pt-0 pb-4 px-4">
                <div className="text-success mb-3">
                  <i className="ti ti-circle-check fs-48"></i>
                </div>
                <h4 className="mb-2 text-dark fw-bold">Publish Fee Structure</h4>
                <p className="text-muted mb-3">
                  Are you sure you want to publish <strong className="text-dark">"{publishModal.struct.name}"</strong>?
                </p>
                <div className="alert alert-info py-2 px-3 fs-12 text-start mb-4">
                  <i className="ti ti-info-circle me-1"></i>
                  Once published, this fee structure will become active for student fee generation and cannot be deleted or reverted to Draft.
                </div>
                <div className="d-flex justify-content-center gap-2">
                  <button
                    type="button"
                    className="btn btn-light px-4 border"
                    onClick={() => setPublishModal({ show: false, struct: null, processing: false })}
                    disabled={publishModal.processing}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-success px-4"
                    onClick={handleConfirmPublish}
                    disabled={publishModal.processing}
                  >
                    {publishModal.processing ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                        Publishing...
                      </>
                    ) : (
                      <>
                        <i className="ti ti-check me-1"></i>
                        Confirm &amp; Publish
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Status Change Confirmation Modal */}
      {statusModal.show && statusModal.struct && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header border-0 pb-0">
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setStatusModal({ show: false, struct: null, targetStatus: 1, processing: false })}
                  aria-label="Close"
                  disabled={statusModal.processing}
                ></button>
              </div>
              <div className="modal-body text-center pt-0 pb-4 px-4">
                <div className={`mb-3 ${statusModal.targetStatus === 1 ? 'text-success' : 'text-warning'}`}>
                  {statusModal.targetStatus === 1 ? (
                    <i className="ti ti-circle-check fs-48"></i>
                  ) : (
                    <i className="ti ti-alert-triangle fs-48"></i>
                  )}
                </div>
                <h4 className="mb-2 text-dark fw-bold">
                  {statusModal.targetStatus === 1 ? 'Activate Fee Structure' : 'Deactivate Fee Structure'}
                </h4>
                <p className="text-muted mb-3">
                  Are you sure you want to {statusModal.targetStatus === 1 ? 'activate' : 'deactivate'}{' '}
                  <strong className="text-dark">"{statusModal.struct.name}"</strong>?
                </p>
                <div className={`alert ${statusModal.targetStatus === 1 ? 'alert-success' : 'alert-warning'} py-2 px-3 fs-12 text-start mb-4`}>
                  <i className="ti ti-info-circle me-1"></i>
                  {statusModal.targetStatus === 1
                    ? 'Activating this structure will allow it to be selected and used when generating batch and individual invoices.'
                    : 'Deactivating this structure will temporarily disable it from new invoice generations. Existing generated invoices will not be affected.'}
                </div>
                <div className="d-flex justify-content-center gap-2">
                  <button
                    type="button"
                    className="btn btn-light px-4 border"
                    onClick={() => setStatusModal({ show: false, struct: null, targetStatus: 1, processing: false })}
                    disabled={statusModal.processing}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={`btn px-4 ${statusModal.targetStatus === 1 ? 'btn-success' : 'btn-warning text-dark'}`}
                    onClick={handleConfirmStatusChange}
                    disabled={statusModal.processing}
                  >
                    {statusModal.processing ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                        Updating...
                      </>
                    ) : (
                      <>
                        <i className={`ti ${statusModal.targetStatus === 1 ? 'ti-check' : 'ti-player-pause'} me-1`}></i>
                        Confirm &amp; {statusModal.targetStatus === 1 ? 'Activate' : 'Deactivate'}
                      </>
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

export default FeesStructures;
