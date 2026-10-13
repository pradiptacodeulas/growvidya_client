import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { usePermission } from '../../../hooks/usePermission';
import adminFeesApi from '../../../api/adminFees.api';
import adminAcademicApi from '../../../api/adminAcademic.api';
import { fetchRoutesApi } from '../../../api/adminTransport.api';
import { fetchHostelsApi } from '../../../api/adminHostel.api';
import { fetchBranchesApi } from '../../../api/branch.api';

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

const CreateFeeStructure = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const { user } = useSelector((state) => state.auth || {});
  const { isSuperAdmin } = usePermission();

  const userBranchId = user?.branch_id || user?.branchId || (localStorage.getItem('active_branch_id') !== 'all' ? localStorage.getItem('active_branch_id') : null);
  const userBranchName = user?.branchName || user?.branch_name || localStorage.getItem('active_branch_name') || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [feeComponents, setFeeComponents] = useState([]);
  const [branches, setBranches] = useState([]);
  const [transportRoutes, setTransportRoutes] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [isOriginallyPublished, setIsOriginallyPublished] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    branch_id: !isSuperAdmin && userBranchId ? String(userBranchId) : '',
    class_id: [],
    academic_year_id: '',
    frequency: '',
    start_month: 1,
    generate_on_day: 1,
    due_day: 10,
    grace_period_days: 5,
    late_fee_type: '0',
    late_fee_amount: 50,
    allow_partial_payment: 1,
    is_published: 0,
    description: '',
    status: 1,
    auto_allocate: true,
    components: [],
  });

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      setLoading(true);
      try {
        const [classRes, yearRes, compRes, routesRes, hostelsRes, branchRes] = await Promise.all([
          adminAcademicApi.getAllClasses({ status: 1 }).catch(() => ({ data: [] })),
          adminAcademicApi.getAllAcademicYears({ status: 1 }).catch(() => ({ data: [] })),
          adminFeesApi.getAllComponents({ status: 1 }).catch(() => ({ data: { components: [] } })),
          fetchRoutesApi().catch(() => ({ data: [] })),
          fetchHostelsApi().catch(() => ({ data: [] })),
          fetchBranchesApi().catch(() => ({ data: [] })),
        ]);

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

        if (!isMounted) return;

        setClasses(classesList);
        setAcademicYears(yearsList);
        setFeeComponents(compsList);
        setBranches(branchesList);
        if (routesList.length > 0) setTransportRoutes(routesList);
        if (hostelsList.length > 0) setHostels(hostelsList);

        if (isEditMode) {
          const structRes = await adminFeesApi.getStructureById(id);
          const detail = structRes?.data;
          if (!detail) {
            toast.error('Fee structure not found.');
            navigate('/admin/fees/structures');
            return;
          }

          if (Number(detail.is_published) === 1) {
            toast.error('A published fee structure cannot be edited.');
            navigate('/admin/fees/structures');
            return;
          }

          if (!isSuperAdmin) {
            if (!detail.branch_id) {
              toast.error('Only Super Admins can edit school-wide fee structures.');
              navigate('/admin/fees/structures');
              return;
            }
            if (userBranchId && String(detail.branch_id) !== String(userBranchId)) {
              toast.error('You do not have permission to edit fee structures of another campus.');
              navigate('/admin/fees/structures');
              return;
            }
          }

          setIsOriginallyPublished(false);

          const selectedClassIds = detail.class_id
            ? String(detail.class_id)
                .split(',')
                .map((cid) => cid.trim())
                .filter(Boolean)
            : [];

          const detailComps = detail.components || [];
          let mappedComps = [];
          if (detailComps.length > 0) {
            mappedComps = detailComps.map((dc) => ({
              fee_component_id: String(dc.fee_component_id),
              amount: parseFloat(dc.amount) || '0.00',
              isLocked: false,
              component_name: dc.component_name || dc.name,
            }));
          } else {
            mappedComps = [
              {
                fee_component_id: compsList.length > 0 ? String(compsList[0].id) : '',
                amount: '0.00',
                isLocked: false,
              },
            ];
          }

          setFormData({
            name: detail.name || '',
            branch_id: detail.branch_id ? String(detail.branch_id) : '',
            class_id: selectedClassIds,
            academic_year_id: detail.academic_year_id || '',
            frequency: detail.frequency || '',
            start_month: detail.start_month !== undefined ? Number(detail.start_month) : 1,
            generate_on_day: detail.generate_on_day ? Number(detail.generate_on_day) : 1,
            due_day: detail.due_day !== undefined ? Number(detail.due_day) : 10,
            grace_period_days: detail.grace_period_days !== undefined ? detail.grace_period_days : 5,
            late_fee_type: String(detail.late_fee_type || '0'),
            late_fee_amount: parseFloat(detail.late_fee_amount) || 50,
            allow_partial_payment: detail.allow_partial_payment !== undefined ? detail.allow_partial_payment : 1,
            is_published: 0,
            description: detail.description || '',
            status: detail.status !== undefined ? detail.status : 1,
            auto_allocate: true,
            components: mappedComps,
          });
        } else {
          // Create Mode: set defaults
          const defaultYear =
            yearsList.find((a) => Number(a.is_current) === 1 || String(a.is_current) === '1' || a.isCurrent)?.id ||
            (yearsList.length > 0 ? yearsList[0].id : '');

          let defaultBranchId = '';
          if (isSuperAdmin) {
            const activeBranch = localStorage.getItem('active_branch_id');
            defaultBranchId = (activeBranch && activeBranch !== '0' && activeBranch !== 'all') ? activeBranch : '';
          } else {
            defaultBranchId = userBranchId ? String(userBranchId) : '';
          }

          setFormData({
            name: '',
            branch_id: defaultBranchId,
            class_id: classesList.map((c) => String(c.id)),
            academic_year_id: defaultYear,
            frequency: '',
            start_month: 1,
            generate_on_day: 1,
            due_day: 10,
            grace_period_days: 5,
            late_fee_type: '0',
            late_fee_amount: 50,
            allow_partial_payment: 1,
            is_published: 0,
            description: '',
            status: 1,
            auto_allocate: true,
            components: [
              {
                fee_component_id: compsList.length > 0 ? String(compsList[0].id) : '',
                amount: '0.00',
                isLocked: false,
              },
            ],
          });
        }
      } catch (err) {
        console.error('Failed to load data for fee structure form:', err);
        toast.error('Failed to load form data.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [id, isEditMode, navigate]);

  // Target Classes Handlers
  const handleClassCheckboxToggle = (classId) => {
    const cidStr = String(classId);
    setFormData((prev) => {
      const exists = prev.class_id.includes(cidStr);
      const newClasses = exists
        ? prev.class_id.filter((cid) => cid !== cidStr)
        : [...prev.class_id, cidStr];
      return { ...prev, class_id: newClasses };
    });
  };

  const handleSelectAllClasses = (e) => {
    if (e.target.checked) {
      setFormData((prev) => ({
        ...prev,
        class_id: classes.map((c) => String(c.id)),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        class_id: [],
      }));
    }
  };

  // Line Item Handlers
  const handleAddRow = () => {
    setFormData((prev) => ({
      ...prev,
      components: [
        ...prev.components,
        {
          fee_component_id: feeComponents.length > 0 ? String(feeComponents[0].id) : '',
          amount: '0.00',
          isLocked: false,
        },
      ],
    }));
  };

  const handleRemoveRow = (index) => {
    if (formData.components.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      components: prev.components.filter((_, i) => i !== index),
    }));
  };

  const handleRowComponentChange = (index, value) => {
    setFormData((prev) => {
      const updated = [...prev.components];
      const selectedFc = feeComponents.find((fc) => String(fc.id) === String(value));
      const isDynamic = selectedFc && (
        selectedFc.name?.toLowerCase().includes('hostel') ||
        selectedFc.name?.toLowerCase().includes('transport') ||
        selectedFc.code?.toLowerCase() === 'hostel' ||
        selectedFc.code?.toLowerCase() === 'trans'
      );

      updated[index] = {
        ...updated[index],
        fee_component_id: value,
        amount: isDynamic ? '0.00' : updated[index].amount,
        component_name: selectedFc?.name || '',
      };
      return { ...prev, components: updated };
    });
  };

  const handleRowAmountChange = (index, value) => {
    setFormData((prev) => {
      const updated = [...prev.components];
      updated[index] = {
        ...updated[index],
        amount: value,
      };
      return { ...prev, components: updated };
    });
  };

  // Dynamic Total Fee Calculation
  const totalCalculatedFee = useMemo(() => {
    return formData.components.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
  }, [formData.components]);

  // Form Submit Handler
  const handleSubmit = async (e, publishOverride = null) => {
    if (e && e.preventDefault) e.preventDefault();

    if (isOriginallyPublished) {
      toast.error('A published fee structure cannot be edited.');
      return;
    }

    if (!formData.name.trim()) {
      toast.warning('Please enter Structure Name.');
      return;
    }
    if (!formData.frequency || !formData.frequency.trim()) {
      toast.warning('Please select Billing Frequency.');
      return;
    }
    if (formData.class_id.length === 0) {
      toast.warning('Please select at least one Target Class.');
      return;
    }

    const resolvedComponents = [];
    for (const c of formData.components) {
      if (!c.fee_component_id) continue;
      const compId = parseInt(c.fee_component_id, 10);
      const selectedFc = feeComponents.find((fc) => fc.id === compId || String(fc.id) === String(c.fee_component_id));
      const isDynamic = selectedFc && (
        selectedFc.name?.toLowerCase().includes('hostel') ||
        selectedFc.name?.toLowerCase().includes('transport') ||
        selectedFc.code?.toLowerCase() === 'hostel' ||
        selectedFc.code?.toLowerCase() === 'trans'
      );

      resolvedComponents.push({
        fee_component_id: compId,
        amount: isDynamic ? 0 : (parseFloat(c.amount) || 0),
      });
    }

    if (resolvedComponents.length === 0) {
      toast.warning('Please select at least one Fee Component.');
      return;
    }

    let isPublishedVal = 0;
    if (publishOverride !== null && publishOverride !== undefined) {
      isPublishedVal = publishOverride ? 1 : 0;
    } else {
      isPublishedVal = Number(formData.is_published) === 1 ? 1 : 0;
    }

    if (isPublishedVal === 1) {
      const confirmPublish = window.confirm(
        'Are you sure you want to publish this fee structure? Once published, it cannot be edited or deleted.'
      );
      if (!confirmPublish) return;
    }

    const targetBranchId = !isSuperAdmin
      ? (userBranchId ? Number(userBranchId) : null)
      : (formData.branch_id ? Number(formData.branch_id) : null);

    const payload = {
      ...formData,
      status: parseInt(formData.status, 10) || 1,
      id: isEditMode ? id : undefined,
      start_month: parseInt(formData.start_month, 10) || 1,
      generate_on_day: parseInt(formData.generate_on_day, 10) || 1,
      due_day: parseInt(formData.due_day, 10) || 10,
      is_published: isPublishedVal,
      branch_id: targetBranchId,
      class_id: formData.class_id.join(','),
      components: resolvedComponents,
      auto_allocate: formData.auto_allocate !== false,
    };

    try {
      setSaving(true);
      const res = await adminFeesApi.saveStructure(payload);
      toast.success(
        res?.message ||
          (isPublishedVal === 1
            ? 'Fee structure published successfully.'
            : isEditMode
            ? 'Fee structure updated successfully.'
            : 'Fee structure created as Draft successfully.')
      );
      navigate('/admin/fees/structures');
    } catch (err) {
      console.error('Failed to save fee structure:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to save fee structure.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="content">
        <div className="text-center py-5">
          <div className="spinner-border text-primary me-2" role="status"></div>
          <span className="text-muted fs-14">Loading fee structure details...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div>
          <h3 className="page-title mb-1">
            <i className="ti ti-layers-subtract me-2 text-primary"></i>
            {isEditMode ? 'Edit Fee Structure' : 'Create Master Fee Structure'}
          </h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/fees/dashboard">Fees</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/fees/structures">Fee Structures</Link>
              </li>
              <li className="breadcrumb-item active">
                {isEditMode ? 'Edit Structure' : 'Create Structure'}
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex gap-2">
          <Link to="/admin/fees/structures" className="btn btn-outline-secondary">
            <i className="ti ti-arrow-left me-1"></i>Back to Fee Structures
          </Link>
        </div>
      </div>

      <form onSubmit={(e) => handleSubmit(e)}>
        {/* Card 1: Basic Information & Target Classes */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between">
            <h5 className="mb-0 text-dark fw-bold">
              <i className="ti ti-info-circle me-2 text-primary"></i>1. Basic &amp; Academic Scope
            </h5>
            <span className="badge bg-warning text-dark py-1.5 px-3 fs-12">
              <i className="ti ti-clock me-1"></i>Draft by Default
            </span>
          </div>
          <div className="card-body p-4">
            <div className="row g-3 mb-4">
              <div className="col-md-4">
                <label className="form-label fw-semibold">
                  Structure Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  className="form-control"
                  placeholder="e.g. Grade 10 - Annual Fee Structure"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                <small className="text-muted fs-11">Descriptive name for this fee package</small>
              </div>

              <div className="col-md-3">
                <label className="form-label fw-semibold">Campus / Branch</label>
                {isSuperAdmin ? (
                  <>
                    <select
                      name="branch_id"
                      className="form-select"
                      value={formData.branch_id || ''}
                      onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                    >
                      <option value="">All Campuses (School-wide)</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.branch_name} {b.branch_code ? `(${b.branch_code})` : ''}
                        </option>
                      ))}
                    </select>
                    <small className="text-muted fs-11">Select specific campus or apply school-wide</small>
                  </>
                ) : (
                  <>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-end-0">
                        <i className="ti ti-building-community text-primary"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control bg-light text-dark fw-medium border-start-0"
                        value={
                          userBranchName ||
                          branches.find((b) => String(b.id) === String(userBranchId))?.branch_name ||
                          'Assigned Campus'
                        }
                        disabled
                        readOnly
                      />
                      <span className="input-group-text bg-light border-start-0 text-muted fs-12">
                        <i className="ti ti-lock me-1"></i> Locked
                      </span>
                    </div>
                    <small className="text-muted fs-11">Restricted to your assigned campus</small>
                  </>
                )}
              </div>

              <div className="col-md-2">
                <label className="form-label fw-semibold">
                  Academic Year <span className="text-danger">*</span>
                </label>
                <select
                  name="academic_year_id"
                  className="form-select"
                  required
                  value={formData.academic_year_id}
                  onChange={(e) => setFormData({ ...formData, academic_year_id: e.target.value })}
                >
                  <option value="">-- Year --</option>
                  {academicYears.map((ay) => (
                    <option key={ay.id} value={ay.id}>
                      {ay.academic_year}
                    </option>
                  ))}
                </select>
                <small className="text-muted fs-11">Academic session</small>
              </div>

              <div className="col-md-3">
                <label className="form-label fw-semibold">
                  Operational Status <span className="text-danger">*</span>
                </label>
                <select
                  name="status"
                  className="form-select"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: parseInt(e.target.value, 10) })}
                >
                  <option value={1}>Active</option>
                  <option value={2}>Inactive</option>
                </select>
                <small className="text-muted fs-11">Inactive structures are excluded from invoice generation</small>
              </div>
            </div>

            {/* Target Classes */}
            <div className="mb-2">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <label className="form-label fw-semibold mb-0">
                  Target Classes <span className="text-danger">*</span>
                </label>
                <div className="form-check form-check-inline mb-0">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="selectAllClassesCheck"
                    checked={formData.class_id.length === classes.length && classes.length > 0}
                    onChange={handleSelectAllClasses}
                  />
                  <label className="form-check-label fs-12 fw-semibold text-primary" htmlFor="selectAllClassesCheck">
                    Select All Classes
                  </label>
                </div>
              </div>

              <div className="border rounded p-3 bg-light" style={{ minHeight: '80px' }}>
                <div className="d-flex flex-wrap gap-2">
                  {classes.map((cls) => {
                    const isChecked = formData.class_id.includes(String(cls.id));
                    return (
                      <span
                        key={`opt-cls-${cls.id}`}
                        onClick={() => handleClassCheckboxToggle(cls.id)}
                        className={`badge cursor-pointer px-3 py-2 fs-12 ${
                          isChecked ? 'bg-primary text-white shadow-sm' : 'bg-white text-dark border'
                        }`}
                        style={{ cursor: 'pointer', userSelect: 'none', transition: 'all 0.15s ease-in-out' }}
                      >
                        {cls.class_name} {isChecked ? '✓' : '+'}
                      </span>
                    );
                  })}
                </div>
              </div>
              <small className="text-muted fs-11 mt-1 d-block">
                Click class pills above to select or unselect target classes
              </small>
            </div>
          </div>
        </div>

        {/* Card 2: Fee Schedule & Rules */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white py-3 border-bottom">
            <h5 className="mb-0 text-dark fw-bold">
              <i className="ti ti-calendar-time me-2 text-primary"></i>2. Billing Schedule &amp; Payment Rules
            </h5>
          </div>
          <div className="card-body p-4">
            <div className="row g-3 mb-4">
              <div className="col-md-3">
                <label className="form-label fw-semibold">
                  Billing Frequency <span className="text-danger">*</span>
                </label>
                <select
                  name="frequency"
                  className="form-select"
                  required
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                >
                  <option value="">-- Select Frequency --</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Bi-Annually">Bi-Annually</option>
                  <option value="Annually">Annually</option>
                  <option value="One-Time">One-Time</option>
                </select>
                <small className="text-muted fs-11">Recurring billing cadence</small>
              </div>

              <div className="col-md-3">
                <label className="form-label fw-semibold">
                  Fee Starting Month <span className="text-danger">*</span>
                </label>
                <select
                  name="start_month"
                  className="form-select"
                  required
                  value={formData.start_month}
                  onChange={(e) => setFormData({ ...formData, start_month: parseInt(e.target.value, 10) })}
                >
                  {MONTHS_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <small className="text-muted fs-11">Month fee cycle commences</small>
              </div>

              <div className="col-md-3">
                <label className="form-label fw-semibold">
                  Fee Starting Date <span className="text-danger">*</span>
                </label>
                <select
                  name="generate_on_day"
                  className="form-select"
                  required
                  value={formData.generate_on_day}
                  onChange={(e) => setFormData({ ...formData, generate_on_day: parseInt(e.target.value, 10) })}
                >
                  {DAYS_OF_MONTH.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <small className="text-muted fs-11">Day of month (1-31) fees are generated</small>
              </div>

              <div className="col-md-3">
                <label className="form-label fw-semibold">Due Day (Day of Month)</label>
                <select
                  name="due_day"
                  className="form-select"
                  value={formData.due_day}
                  onChange={(e) => setFormData({ ...formData, due_day: parseInt(e.target.value, 10) })}
                >
                  {DAYS_OF_MONTH.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <small className="text-muted fs-11">Day of month payment is due</small>
              </div>
            </div>

            <div className="row g-3">
              <div className="col-md-3">
                <label className="form-label fw-semibold">Grace Days</label>
                <input
                  type="number"
                  name="grace_period_days"
                  className="form-control"
                  value={formData.grace_period_days}
                  min="0"
                  onChange={(e) => setFormData({ ...formData, grace_period_days: e.target.value })}
                />
                <small className="text-muted fs-11">Days after due date before late fees</small>
              </div>

              <div className="col-md-3">
                <label className="form-label fw-semibold">Late Fee (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  name="late_fee_amount"
                  className="form-control"
                  value={formData.late_fee_amount}
                  onChange={(e) => setFormData({ ...formData, late_fee_amount: e.target.value })}
                />
                <small className="text-muted fs-11">Penalty applied after grace days</small>
              </div>

              <div className="col-md-3">
                <label className="form-label fw-semibold">Allow Partial Payment?</label>
                <select
                  name="allow_partial_payment"
                  className="form-select"
                  value={formData.allow_partial_payment}
                  onChange={(e) => setFormData({ ...formData, allow_partial_payment: parseInt(e.target.value, 10) })}
                >
                  <option value="1">Yes (Partial Allowed)</option>
                  <option value="0">No (Full Payment Only)</option>
                </select>
                <small className="text-muted fs-11">Whether parents can pay in installments</small>
              </div>

              <div className="col-md-3">
                <label className="form-label fw-semibold">Auto-Assign on Publish?</label>
                <select
                  name="auto_allocate"
                  className="form-select"
                  value={formData.auto_allocate ? '1' : '0'}
                  onChange={(e) => setFormData({ ...formData, auto_allocate: e.target.value === '1' })}
                >
                  <option value="1">Yes (Auto Assign to Students)</option>
                  <option value="0">No (Manual Assignment)</option>
                </select>
                <small className="text-muted fs-11">Applies when published</small>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Fee Components & Total Calculation */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div>
              <h5 className="mb-0 text-dark fw-bold">
                <i className="ti ti-list me-2 text-primary"></i>3. Fee Line Items / Components Breakdown
              </h5>
              <small className="text-muted">Configure components that make up this fee structure</small>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-primary-transparent text-primary fs-14 py-2 px-3 border border-primary-subtle fw-bold">
                Total Fee: ₹{totalCalculatedFee.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <div className="card-body p-4">
            <div className="table-responsive mb-3">
              <table className="table table-bordered align-middle mb-0" id="structure_items_table">
                <thead className="table-light">
                  <tr>
                    <th>Select Fee Component</th>
                    <th style={{ width: '240px' }}>Amount (₹)</th>
                    <th style={{ width: '70px' }} className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.components.map((comp, idx) => {
                    const selectedFc = feeComponents.find(
                      (fc) => String(fc.id) === String(comp.fee_component_id)
                    );
                    const isSpecial =
                      selectedFc &&
                      (selectedFc.name?.toLowerCase().includes('hostel') ||
                        selectedFc.name?.toLowerCase().includes('transport') ||
                        selectedFc.code?.toLowerCase() === 'hostel' ||
                        selectedFc.code?.toLowerCase() === 'trans');

                    return (
                      <tr key={`form-row-${idx}`}>
                        <td>
                          <select
                            className="form-select"
                            value={comp.fee_component_id}
                            onChange={(e) => handleRowComponentChange(idx, e.target.value)}
                          >
                            <option value="">-- Select Component --</option>
                            {feeComponents.map((fc) => (
                              <option key={fc.id} value={fc.id}>
                                {fc.name} {fc.code ? `(${fc.code})` : ''}
                              </option>
                            ))}
                          </select>
                          {isSpecial && (
                            <div className="text-primary fs-11 mt-1">
                              <i className="ti ti-info-circle me-1"></i>
                              {selectedFc.name.toLowerCase().includes('hostel')
                                ? 'Dynamic Hostel Fee: resolved per student room allocation'
                                : 'Dynamic Transport Fee: resolved per student route assignment'}
                            </div>
                          )}
                        </td>
                        <td>
                          {isSpecial ? (
                            <div className="input-group">
                              <span className="input-group-text bg-light text-muted">₹</span>
                              <input
                                type="text"
                                className="form-control bg-light text-muted"
                                value="Dynamic per Student"
                                disabled
                                title="Hostel/Transport rates are dynamic based on assigned room/route"
                              />
                            </div>
                          ) : (
                            <div className="input-group">
                              <span className="input-group-text">₹</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                className="form-control"
                                placeholder="0.00"
                                value={comp.amount}
                                onChange={(e) => handleRowAmountChange(idx, e.target.value)}
                              />
                            </div>
                          )}
                        </td>
                        <td className="text-center">
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => handleRemoveRow(idx)}
                            disabled={formData.components.length <= 1}
                            title="Remove row"
                          >
                            <i className="ti ti-trash"></i>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="table-light border-top">
                  <tr>
                    <th className="text-end fw-bold">Total Fee:</th>
                    <th className="fw-bold text-dark fs-15 text-primary">
                      ₹{totalCalculatedFee.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </th>
                    <th></th>
                  </tr>
                </tfoot>
              </table>
            </div>

            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={handleAddRow}
            >
              <i className="ti ti-plus me-1"></i>Add Fee Component
            </button>
          </div>
        </div>

        {/* Card 4: Description / Remarks */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white py-3 border-bottom">
            <h5 className="mb-0 text-dark fw-bold">
              <i className="ti ti-notes me-2 text-primary"></i>4. Description &amp; Notes
            </h5>
          </div>
          <div className="card-body p-4">
            <textarea
              name="description"
              className="form-control"
              rows="3"
              placeholder="Add optional notes, instructions or breakdown remarks for this fee structure..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            ></textarea>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="d-flex align-items-center justify-content-between p-3 bg-white border rounded shadow-sm mb-5">
          <Link to="/admin/fees/structures" className="btn btn-light border px-4">
            Cancel
          </Link>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-outline-primary px-4"
              disabled={saving}
              onClick={(e) => handleSubmit(e, false)}
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                  Saving...
                </>
              ) : (
                <>
                  <i className="ti ti-device-floppy me-1"></i>Save as Draft
                </>
              )}
            </button>
            <button
              type="button"
              className="btn btn-success px-4"
              disabled={saving}
              onClick={(e) => handleSubmit(e, true)}
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                  Publishing...
                </>
              ) : (
                <>
                  <i className="ti ti-check me-1"></i>Publish Fee Structure
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateFeeStructure;
