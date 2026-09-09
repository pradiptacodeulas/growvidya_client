import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminFeesApi from '../../../api/adminFees.api';
import adminAcademicApi from '../../../api/adminAcademic.api';
import { fetchRoutesApi } from '../../../api/adminTransport.api';

const FeesStructures = () => {
  const [structures, setStructures] = useState([]);
  const [classes, setClasses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [feeComponents, setFeeComponents] = useState([]);
  const [transportRoutes, setTransportRoutes] = useState([]);
  const [hostels, setHostels] = useState([
    { id: 1, name: 'Boys Hostel', fee: 3500 },
    { id: 2, name: 'Girls Hostel', fee: 3800 },
  ]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  // Modal State for Add / Edit
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [saving, setSaving] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  // Modal State for View / Details
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewStructure, setViewStructure] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    class_id: [],
    academic_year_id: '',
    frequency: 'Monthly',
    due_day: 10,
    grace_period_days: 5,
    late_fee_type: '0',
    late_fee_amount: 50,
    allow_partial_payment: 1,
    is_published: 0,
    generate_on_day: 1,
    description: '',
    status: 1,
    components: [],
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [structRes, classRes, yearRes, compRes, routesRes] = await Promise.all([
        adminFeesApi.getAllStructures(),
        adminAcademicApi.getAllClasses({ status: 1 }).catch(() => ({ data: [] })),
        adminAcademicApi.getAllAcademicYears({ status: 1 }).catch(() => ({ data: [] })),
        adminFeesApi.getAllComponents({ status: 1 }).catch(() => ({ data: { components: [] } })),
        fetchRoutesApi().catch(() => ({ data: [] })),
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

      setStructures(structsList);
      setClasses(classesList);
      setAcademicYears(yearsList);
      setFeeComponents(compsList);
      if (routesList.length > 0) setTransportRoutes(routesList);
    } catch (err) {
      console.error('Failed to load fee structures initial data:', err);
      toast.error('Failed to load fee structures data');
    } finally {
      setLoading(false);
    }
  };

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

  const handleOpenAddModal = () => {
    setModalMode('add');
    setCurrentId(null);

    const defaultYear =
      academicYears.find((a) => Number(a.is_current) === 1 || String(a.is_current) === '1' || a.isCurrent)?.id ||
      (academicYears.length > 0 ? academicYears[0].id : '');

    setFormData({
      name: '',
      class_id: classes.map((c) => String(c.id)),
      academic_year_id: defaultYear,
      frequency: 'Monthly',
      due_day: 10,
      grace_period_days: 5,
      late_fee_type: '0',
      late_fee_amount: 50,
      allow_partial_payment: 1,
      is_published: 0,
      generate_on_day: 1,
      description: '',
      status: 1,
      components: [
        {
          fee_component_id: feeComponents.length > 0 ? String(feeComponents[0].id) : '',
          amount: '0.00',
          isLocked: false,
        },
      ],
    });
    setShowModal(true);
  };

  const handleOpenEditModal = async (struct) => {
    setModalMode('edit');
    setCurrentId(struct.id);

    try {
      const res = await adminFeesApi.getStructureById(struct.id);
      const detail = res?.data || struct;

      const selectedClassIds = detail.class_id
        ? String(detail.class_id)
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean)
        : [];

      const isPublished = detail.is_published === 1;
      const detailComps = detail.components || [];

      let mappedComps = [];
      if (detailComps.length > 0) {
        mappedComps = detailComps.map((dc) => {
          const compNameLower = String(dc.component_name || dc.name || '').toLowerCase();
          const compCodeLower = String(dc.code || dc.component_code || '').toLowerCase();
          let compIdVal = String(dc.fee_component_id);

          if (compNameLower.includes('hostel') || compCodeLower === 'hostel') {
            compIdVal = 'static_hostel';
          } else if (compNameLower.includes('transport') || compCodeLower === 'trans') {
            compIdVal = 'static_transport';
          }

          return {
            fee_component_id: compIdVal,
            amount: parseFloat(dc.amount) || '0.00',
            isLocked: isPublished,
            component_name: dc.component_name || dc.name,
          };
        });
      } else {
        mappedComps = [
          {
            fee_component_id: feeComponents.length > 0 ? String(feeComponents[0].id) : '',
            amount: '0.00',
            isLocked: false,
          },
        ];
      }

      setFormData({
        name: detail.name || '',
        class_id: selectedClassIds,
        academic_year_id: detail.academic_year_id || '',
        frequency: detail.frequency || 'Monthly',
        due_day: detail.due_day !== undefined ? detail.due_day : 10,
        grace_period_days: detail.grace_period_days !== undefined ? detail.grace_period_days : 5,
        late_fee_type: String(detail.late_fee_type || '0'),
        late_fee_amount: parseFloat(detail.late_fee_amount) || 50,
        allow_partial_payment: detail.allow_partial_payment !== undefined ? detail.allow_partial_payment : 1,
        is_published: isPublished ? 1 : 0,
        generate_on_day: detail.generate_on_day || 1,
        description: detail.description || '',
        status: detail.status !== undefined ? detail.status : 1,
        components: mappedComps,
      });

      setShowModal(true);
    } catch (err) {
      console.error('Failed to load structure details for editing:', err);
      toast.error('Failed to load structure for edit.');
    }
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
      };
      setViewStructure(merged);
      setShowViewModal(true);
    } catch (err) {
      setViewStructure(struct);
      setShowViewModal(true);
    }
  };

  const handleClassCheckboxToggle = (classId) => {
    if (formData.is_published === 1) return;
    const cidStr = String(classId);
    setFormData((prev) => {
      const exists = prev.class_id.includes(cidStr);
      const newClasses = exists
        ? prev.class_id.filter((id) => id !== cidStr)
        : [...prev.class_id, cidStr];
      return { ...prev, class_id: newClasses };
    });
  };

  const handleSelectAllClasses = (e) => {
    if (formData.is_published === 1) return;
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

  // Line Item Row Handlers
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
    if (formData.components[index]?.isLocked) return;
    setFormData((prev) => ({
      ...prev,
      components: prev.components.filter((_, i) => i !== index),
    }));
  };

  const handleRowComponentChange = (index, value) => {
    setFormData((prev) => {
      const updated = [...prev.components];
      const isSpecial = value === 'static_hostel' || value === 'static_transport';
      updated[index] = {
        ...updated[index],
        fee_component_id: value,
        amount: isSpecial ? '0.00' : updated[index].amount,
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.warning('Please enter Structure Name.');
      return;
    }
    if (formData.class_id.length === 0) {
      toast.warning('Please select at least one Target Class.');
      return;
    }

    // Resolve component IDs
    const resolvedComponents = [];
    for (const c of formData.components) {
      if (!c.fee_component_id) continue;

      let compId = c.fee_component_id;
      let amt = parseFloat(c.amount) || 0;

      if (compId === 'static_hostel') {
        const foundHostelComp = feeComponents.find(
          (fc) => fc.name?.toLowerCase().includes('hostel') || fc.code?.toLowerCase() === 'hostel'
        );
        compId = foundHostelComp ? foundHostelComp.id : 6;
        amt = 0;
      } else if (compId === 'static_transport') {
        const foundTransportComp = feeComponents.find(
          (fc) => fc.name?.toLowerCase().includes('transport') || fc.code?.toLowerCase() === 'trans'
        );
        compId = foundTransportComp ? foundTransportComp.id : 7;
        amt = 0;
      }

      resolvedComponents.push({
        fee_component_id: compId,
        amount: amt,
      });
    }

    if (resolvedComponents.length === 0) {
      toast.warning('Please select at least one Fee Component.');
      return;
    }

    const payload = {
      ...formData,
      id: currentId,
      class_id: formData.class_id.join(','),
      components: resolvedComponents,
    };

    try {
      setSaving(true);
      await adminFeesApi.saveStructure(payload);
      toast.success(
        modalMode === 'add'
          ? 'Fee structure created successfully.'
          : 'Fee structure updated successfully.'
      );
      setShowModal(false);
      fetchInitialData();
    } catch (err) {
      console.error('Failed to save fee structure:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to save structure.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (
      !window.confirm(
        `Are you sure you want to delete this published fee structure "${name}"? This will also remove all associated student fee allocations.`
      )
    )
      return;

    try {
      await adminFeesApi.deleteStructure(id);
      toast.success('Fee structure deleted successfully.');
      fetchInitialData();
    } catch (err) {
      console.error('Failed to delete structure:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to delete structure.');
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

      return matchSearch && matchYear;
    });
  }, [structures, searchTerm, selectedYear]);

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
          <button className="btn btn-primary" onClick={handleOpenAddModal}>
            <i className="ti ti-plus me-1"></i>Create Fee Structure
          </button>
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
                  <th>Due Day / Grace</th>
                  <th>Late Fee Rule</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="text-center py-4 text-muted">
                      <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
                      Loading fee structures...
                    </td>
                  </tr>
                ) : filteredStructures.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-4 text-muted">
                      No fee structures found. Click "Create Fee Structure" to build one.
                    </td>
                  </tr>
                ) : (
                  filteredStructures.map((struct, idx) => (
                    <tr key={`struct-${struct.id}`}>
                      <td>{idx + 1}</td>
                      <td className="fw-bold text-dark">{struct.name}</td>
                      <td>
                        <span className="badge bg-primary text-white">
                          {getClassNamesDisplay(struct)}
                        </span>
                      </td>
                      <td>{struct.academic_year || '-'}</td>
                      <td>
                        <span className="badge bg-light text-dark border">{struct.frequency}</span>
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
                          <span className="badge bg-success">
                            <i className="ti ti-check me-1"></i>Published
                          </span>
                        ) : (
                          <span className="badge bg-warning text-dark">
                            <i className="ti ti-clock me-1"></i>Draft
                          </span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-info me-1"
                          onClick={() => handleOpenViewModal(struct)}
                        >
                          <i className="ti ti-eye me-1"></i>View
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary me-1"
                          onClick={() => handleOpenEditModal(struct)}
                        >
                          <i className="ti ti-edit me-1"></i>Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete(struct.id, struct.name)}
                        >
                          <i className="ti ti-trash me-1"></i>Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Structure Modal */}
      {showModal && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          tabIndex="-1"
          role="dialog"
        >
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" role="document">
            <div className="modal-content border-0 shadow-lg">
              <form onSubmit={handleSubmit}>
                <div className="modal-header py-3 px-4 border-bottom">
                  <h5 className="modal-title text-dark fw-bold" id="structureModalTitle">
                    {modalMode === 'add'
                      ? 'Create Master Fee Structure'
                      : formData.is_published === 1
                      ? 'Edit Fee Structure (Published)'
                      : 'Edit Master Fee Structure'}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowModal(false)}
                    aria-label="Close"
                  ></button>
                </div>

                <div className="modal-body p-4">
                  <input type="hidden" name="id" value={currentId || ''} />

                  {/* Row 1: Structure Name & Target Classes */}
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
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
                    </div>

                    <div className="col-md-6">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <label className="form-label fw-semibold mb-0">
                          Target Classes <span className="text-danger">*</span>
                        </label>
                        {formData.is_published !== 1 && (
                          <div className="form-check form-check-inline mb-0">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              id="selectAllModalClasses"
                              checked={
                                formData.class_id.length === classes.length && classes.length > 0
                              }
                              onChange={handleSelectAllClasses}
                            />
                            <label
                              className="form-check-label fs-12 fw-semibold text-primary"
                              htmlFor="selectAllModalClasses"
                            >
                              Select All
                            </label>
                          </div>
                        )}
                      </div>

                      {formData.is_published === 1 ? (
                        <div className="p-2 border rounded bg-light" style={{ maxHeight: '120px', overflowY: 'auto' }}>
                          <div className="d-flex flex-wrap gap-1">
                            {formData.class_id.map((cid) => {
                              const found = classes.find((c) => String(c.id) === String(cid));
                              return (
                                <span key={`locked-cls-${cid}`} className="badge bg-primary text-white fs-12">
                                  {found ? found.class_name : `Class ${cid}`}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div
                          className="border rounded p-2 bg-white"
                          style={{ maxHeight: '120px', overflowY: 'auto' }}
                        >
                          <div className="d-flex flex-wrap gap-1">
                            {classes.map((cls) => {
                              const isChecked = formData.class_id.includes(String(cls.id));
                              return (
                                <span
                                  key={`opt-cls-${cls.id}`}
                                  onClick={() => handleClassCheckboxToggle(cls.id)}
                                  className={`badge cursor-pointer px-2 py-1 fs-12 ${
                                    isChecked ? 'bg-primary text-white' : 'bg-light text-dark border'
                                  }`}
                                  style={{ cursor: 'pointer', userSelect: 'none' }}
                                >
                                  {cls.class_name} {isChecked ? '✓' : '+'}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Academic Year, Billing Frequency, Allow Partial Payment */}
                  <div className="row g-3 mb-3">
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">
                        Academic Year <span className="text-danger">*</span>
                      </label>
                      <select
                        name="academic_year_id"
                        className="form-select"
                        required
                        disabled={formData.is_published === 1}
                        value={formData.academic_year_id}
                        onChange={(e) => setFormData({ ...formData, academic_year_id: e.target.value })}
                      >
                        <option value="">-- Select Year --</option>
                        {academicYears.map((ay) => (
                          <option key={ay.id} value={ay.id}>
                            {ay.academic_year}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Billing Frequency</label>
                      <select
                        name="frequency"
                        className="form-select"
                        value={formData.frequency}
                        onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                      >
                        <option value="Monthly">Monthly</option>
                        <option value="Quarterly">Quarterly</option>
                        <option value="Bi-Annually">Bi-Annually</option>
                        <option value="Annually">Annually</option>
                        <option value="One-Time">One-Time</option>
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Allow Partial Payment?</label>
                      <select
                        name="allow_partial_payment"
                        className="form-select"
                        value={formData.allow_partial_payment}
                        onChange={(e) =>
                          setFormData({ ...formData, allow_partial_payment: parseInt(e.target.value) })
                        }
                      >
                        <option value="1">Yes (Allowed)</option>
                        <option value="0">No (Full Payment Only)</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 3: Generate On, Due Day, Grace Days, Late Fee */}
                  <div className="row g-3 mb-3">
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">
                        Generate On (Day) <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        name="generate_on_day"
                        className="form-control"
                        value={formData.generate_on_day}
                        min="1"
                        max="28"
                        required
                        onChange={(e) => setFormData({ ...formData, generate_on_day: e.target.value })}
                      />
                      <small className="text-muted fs-11">Day of month (1-28) for auto cron</small>
                    </div>

                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Due Day (Day of Month)</label>
                      <input
                        type="number"
                        name="due_day"
                        className="form-control"
                        value={formData.due_day}
                        min="1"
                        max="31"
                        onChange={(e) => setFormData({ ...formData, due_day: e.target.value })}
                      />
                    </div>

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
                    </div>
                  </div>

                  <hr className="my-3" />

                  {/* Line Items Table */}
                  <h6 className="fw-bold text-dark mb-3">
                    <i className="ti ti-list me-1 text-primary"></i>Fee Line Items / Components Breakdown
                  </h6>

                  <div className="table-responsive">
                    <table className="table table-bordered align-middle" id="structure_items_table">
                      <thead className="table-light">
                        <tr>
                          <th>Select Fee Component</th>
                          <th style={{ width: '200px' }}>Amount (₹)</th>
                          <th style={{ width: '60px' }} className="text-center"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.components.map((comp, idx) => {
                          const isSpecial =
                            comp.fee_component_id === 'static_hostel' ||
                            comp.fee_component_id === 'static_transport';

                          return (
                            <tr key={`row-${idx}`}>
                              <td>
                                <select
                                  className="form-select"
                                  disabled={comp.isLocked}
                                  value={comp.fee_component_id}
                                  onChange={(e) => handleRowComponentChange(idx, e.target.value)}
                                  required
                                >
                                  <option value="">-- Choose Component --</option>
                                  <optgroup label="Special Components">
                                    <option value="static_hostel">Hostel Fees</option>
                                    <option value="static_transport">Transport Fees</option>
                                  </optgroup>
                                  <optgroup label="Standard Fee Components">
                                    {feeComponents
                                      .filter(
                                        (fc) =>
                                          !fc.name?.toLowerCase().includes('hostel') &&
                                          !fc.name?.toLowerCase().includes('transport')
                                      )
                                      .map((fc) => (
                                        <option key={`fc-${fc.id}`} value={String(fc.id)}>
                                          {fc.name}
                                        </option>
                                      ))}
                                  </optgroup>
                                </select>
                              </td>
                              <td className="amount-cell">
                                {isSpecial ? (
                                  <div className="dynamic-amount-badge">
                                    <span className="badge bg-light text-primary border">
                                      <i className="ti ti-user-check me-1"></i>Dynamic per Student
                                    </span>
                                  </div>
                                ) : (
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="form-control component-amount-input fw-bold text-dark"
                                    placeholder="0.00"
                                    value={comp.amount}
                                    onChange={(e) => handleRowAmountChange(idx, e.target.value)}
                                    required={!isSpecial}
                                  />
                                )}
                              </td>
                              <td className="text-center">
                                <button
                                  type="button"
                                  className={`btn btn-sm ${
                                    comp.isLocked ? 'btn-outline-secondary' : 'btn-outline-danger'
                                  }`}
                                  disabled={comp.isLocked || formData.components.length <= 1}
                                  onClick={() => handleRemoveRow(idx)}
                                  title={comp.isLocked ? 'Locked' : 'Remove Item'}
                                >
                                  <i className={comp.isLocked ? 'ti ti-lock' : 'ti ti-minus'}></i>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary mt-2"
                    onClick={handleAddRow}
                  >
                    <i className="ti ti-plus me-1"></i>Add Another Line Item
                  </button>
                </div>

                <div className="modal-footer bg-light gap-2">
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
                        <i className="ti ti-check me-1"></i>
                        Save Structure
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

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
                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <label className="text-muted fs-12 uppercase fw-semibold d-block mb-1">
                        Structure Name
                      </label>
                      <h5 className="fw-bold text-dark mb-0">{viewStructure.name || '-'}</h5>
                    </div>
                    <div className="col-md-3">
                      <label className="text-muted fs-12 uppercase fw-semibold d-block mb-1">
                        Target Class
                      </label>
                      <span className="badge bg-primary text-white fs-13">
                        {getClassNamesDisplay(viewStructure)}
                      </span>
                    </div>
                    <div className="col-md-3">
                      <label className="text-muted fs-12 uppercase fw-semibold d-block mb-1">
                        Academic Year
                      </label>
                      <span className="fw-semibold text-dark fs-14">
                        {viewStructure.academic_year || '-'}
                      </span>
                    </div>
                  </div>

                  <div className="row g-3 mb-4 p-3 bg-light rounded border">
                    <div className="col-md-3">
                      <small className="text-muted d-block">Generate On (Day)</small>
                      <span className="fw-bold text-primary">
                        Day {viewStructure.generate_on_day || 1}
                      </span>
                    </div>
                    <div className="col-md-3">
                      <small className="text-muted d-block">Billing Frequency</small>
                      <span className="fw-bold text-dark">{viewStructure.frequency || '-'}</span>
                    </div>
                    <div className="col-md-2">
                      <small className="text-muted d-block">Due Day</small>
                      <span className="fw-bold text-dark">Day {viewStructure.due_day || 10}</span>
                    </div>
                    <div className="col-md-2">
                      <small className="text-muted d-block">Grace Period</small>
                      <span className="fw-bold text-dark">
                        {viewStructure.grace_period_days || 0} Days
                      </span>
                    </div>
                    <div className="col-md-2">
                      <small className="text-muted d-block">Late Fee Rule</small>
                      <span className="fw-bold text-danger">
                        {parseFloat(viewStructure.late_fee_amount) > 0
                          ? `₹${parseFloat(viewStructure.late_fee_amount).toFixed(2)}`
                          : 'None'}
                      </span>
                    </div>
                  </div>

                  <h6 className="fw-bold text-dark mb-3">
                    <i className="ti ti-list me-1 text-primary"></i>Fee Line Items / Components Breakdown
                  </h6>
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
                            {hostels.map((h, idx) => (
                              <tr key={`h-${h.id}`}>
                                <td>{idx + 1}</td>
                                <td className="fw-semibold text-dark">{h.name}</td>
                                <td className="text-end fw-bold text-primary">
                                  ₹{parseFloat(h.fee).toFixed(2)}
                                </td>
                              </tr>
                            ))}
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
                <div className="modal-footer bg-light py-2">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowViewModal(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default FeesStructures;
