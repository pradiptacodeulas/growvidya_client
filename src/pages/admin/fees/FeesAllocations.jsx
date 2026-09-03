import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminFeesApi from '../../../api/adminFees.api';
import adminAcademicApi from '../../../api/adminAcademic.api';
import adminStudentApi from '../../../api/adminStudent.api';
import { getPaginationRange } from '../../../utils/pagination.util';

const FeesAllocations = () => {
  const [allocations, setAllocations] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [classes, setClasses] = useState([]);
  const [structures, setStructures] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Server Pagination State
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStructure, setSelectedStructure] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [allocating, setAllocating] = useState(false);
  const [modalClassId, setModalClassId] = useState('');
  const [modalStructureId, setModalStructureId] = useState('');
  const [modalYearId, setModalYearId] = useState('');
  const [allowPartial, setAllowPartial] = useState(true);

  // Students in selected class
  const [students, setStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    fetchInitialDropdowns();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      loadAllocations(currentPage, pageSize);
    }, 250);

    return () => clearTimeout(handler);
  }, [currentPage, pageSize, selectedClass, selectedStructure, selectedYear, searchTerm]);

  const fetchInitialDropdowns = async () => {
    try {
      const [classRes, structRes, yearRes] = await Promise.all([
        adminAcademicApi.getAllClasses({ status: 1 }),
        adminFeesApi.getAllStructures({ status: 1 }),
        adminAcademicApi.getAllAcademicYears({ status: 1 }).catch(() => ({ data: [] })),
      ]);

      const classesList = Array.isArray(classRes?.data)
        ? classRes.data
        : Array.isArray(classRes?.data?.classes)
        ? classRes.data.classes
        : Array.isArray(classRes)
        ? classRes
        : [];
      const structsList = structRes?.data?.structures || [];
      const yearsList = Array.isArray(yearRes?.data?.academicYears)
        ? yearRes.data.academicYears
        : Array.isArray(yearRes?.data)
        ? yearRes.data
        : [];

      setClasses(classesList);
      setStructures(structsList);
      setAcademicYears(yearsList);
    } catch (err) {
      console.error('Failed to load filter dropdowns:', err);
    }
  };

  const loadAllocations = async (page = currentPage, limit = pageSize) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        class_id: selectedClass || undefined,
        structure_id: selectedStructure || undefined,
        academic_year_id: selectedYear || undefined,
        search: searchTerm.trim() || undefined,
      };

      const res = await adminFeesApi.getAllocations(params);
      const allocList = res?.data?.allocations || [];
      const pagination = res?.data?.pagination || {};

      setAllocations(allocList);
      setTotalRecords(pagination.total !== undefined ? pagination.total : allocList.length);
      setTotalPages(pagination.totalPages || Math.ceil((pagination.total || allocList.length) / limit) || 1);
    } catch (err) {
      console.error('Failed to load allocations:', err);
      toast.error('Failed to load student allocations data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAssignModal = () => {
    const currentYear =
      academicYears.find((y) => Number(y.is_current) === 1 || String(y.is_current) === '1' || y.isCurrent) ||
      academicYears[0];
    setModalClassId(classes.length > 0 ? String(classes[0].id) : '');
    setModalStructureId(structures.length > 0 ? String(structures[0].id) : '');
    setModalYearId(currentYear ? String(currentYear.id) : '');
    setAllowPartial(true);
    setShowModal(true);

    if (classes.length > 0) {
      loadStudentsForClass(classes[0].id);
    }
  };

  const loadStudentsForClass = async (classId) => {
    if (!classId) {
      setStudents([]);
      setSelectedStudentIds([]);
      return;
    }

    try {
      setLoadingStudents(true);
      const res = await adminStudentApi.getAllStudents({ class_id: classId, status: 1 });
      const list = res?.data?.students || [];
      setStudents(list);
      setSelectedStudentIds(list.map((s) => s.id));
    } catch (err) {
      console.error('Failed to load students for class:', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleModalClassChange = (classId) => {
    setModalClassId(classId);
    loadStudentsForClass(classId);
  };

  const handleToggleStudent = (studentId) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAllStudents = () => {
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map((s) => s.id));
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();

    if (!modalStructureId) {
      toast.warning('Please select Fee Structure.');
      return;
    }
    if (selectedStudentIds.length === 0) {
      toast.warning('Please select at least one student to allocate.');
      return;
    }

    try {
      setAllocating(true);
      const res = await adminFeesApi.allocateStructureToStudents({
        fee_structure_id: modalStructureId,
        academic_year_id: modalYearId || undefined,
        student_ids: selectedStudentIds,
        allow_partial_payment: allowPartial ? 1 : 0,
      });

      toast.success(res?.message || 'Fee structure successfully assigned to selected students.');
      setShowModal(false);
      loadAllocations(1, pageSize);
    } catch (err) {
      console.error('Failed to assign structure:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to allocate fee structure.');
    } finally {
      setAllocating(false);
    }
  };

  const handleDelete = async (id, studentName) => {
    if (!window.confirm(`Are you sure you want to remove fee allocation for "${studentName}"?`)) {
      return;
    }

    try {
      await adminFeesApi.deleteAllocation(id);
      toast.success('Fee allocation removed successfully.');
      loadAllocations(currentPage, pageSize);
    } catch (err) {
      console.error('Failed to delete allocation:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to remove allocation.');
    }
  };

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">
            <i className="ti ti-users-group me-2 text-primary"></i>Student Fee Allocations
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
                Allocations
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={() => loadAllocations(currentPage, pageSize)}
            className="btn btn-outline-light bg-white btn-icon"
            title="Refresh"
          >
            <i className="ti ti-refresh"></i>
          </button>
          <button
            type="button"
            className="btn btn-primary d-flex align-items-center"
            onClick={handleOpenAssignModal}
          >
            <i className="ti ti-user-plus me-1"></i> Assign Fee Structure
          </button>
        </div>
      </div>
      {/* /Page Header */}

      {/* Main Card */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white py-3">
          <div className="row g-2 align-items-center">
            <div className="col-md-3">
              <select
                className="form-select form-select-sm"
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.class_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-3">
              <select
                className="form-select form-select-sm"
                value={selectedStructure}
                onChange={(e) => {
                  setSelectedStructure(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Fee Structures</option>
                {structures.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-3">
              <select
                className="form-select form-select-sm"
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Academic Years</option>
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.id}>
                    {ay.academic_year}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-3">
              <input
                type="search"
                className="form-control form-control-sm"
                placeholder="Search student or admission no..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '60px' }}>#</th>
                  <th>Student Name</th>
                  <th>Admission No</th>
                  <th>Class</th>
                  <th>Assigned Fee Structure</th>
                  <th>Frequency</th>
                  <th>Assigned Date</th>
                  <th>Partial Pay</th>
                  <th style={{ width: '100px' }} className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="text-center py-4 text-muted">
                      <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
                      Loading fee allocations...
                    </td>
                  </tr>
                ) : allocations.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-4 text-muted">
                      No fee allocations found for selected filters.
                    </td>
                  </tr>
                ) : (
                  allocations.map((alloc, idx) => (
                    <tr key={alloc.id}>
                      <td>{(currentPage - 1) * pageSize + idx + 1}</td>
                      <td>
                        <span className="fw-bold text-dark">
                          {alloc.first_name} {alloc.last_name || ''}
                        </span>
                        {alloc.roll_number && (
                          <small className="text-muted ms-1">(Roll: {alloc.roll_number})</small>
                        )}
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border">
                          {alloc.admission_number || '-'}
                        </span>
                      </td>
                      <td>
                        {alloc.class_name} {alloc.section_name && `(${alloc.section_name})`}
                      </td>
                      <td className="fw-medium text-primary">{alloc.structure_name}</td>
                      <td>
                        <span className="badge bg-light text-dark border">
                          {alloc.frequency || 'Monthly'}
                        </span>
                      </td>
                      <td>{alloc.assigned_date ? new Date(alloc.assigned_date).toLocaleDateString() : '-'}</td>
                      <td>
                        {alloc.allow_partial_payment === 1 ? (
                          <span className="badge bg-success-subtle text-success border border-success-subtle">
                            Allowed
                          </span>
                        ) : (
                          <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
                            Full Only
                          </span>
                        )}
                      </td>
                      <td className="text-center">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() =>
                            handleDelete(alloc.id, `${alloc.first_name} ${alloc.last_name || ''}`)
                          }
                          title="Remove Allocation"
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

          {/* Server-Level Pagination with Ellipsis */}
          {totalRecords > pageSize && (
            <div className="p-3 border-top d-flex justify-content-between align-items-center flex-wrap gap-2">
              <span className="text-muted fs-13">
                Showing {(currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} entries
              </span>
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Prev
                  </button>
                </li>
                {getPaginationRange(currentPage, totalPages).map((p, idx) =>
                  p === '...' ? (
                    <li key={`ellipsis-${idx}`} className="page-item disabled">
                      <span className="page-link">...</span>
                    </li>
                  ) : (
                    <li key={`page-${p}`} className={`page-item ${currentPage === p ? 'active' : ''}`}>
                      <button className="page-link" onClick={() => setCurrentPage(p)}>
                        {p}
                      </button>
                    </li>
                  )
                )}
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Assign Fee Structure Modal */}
      {showModal && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          tabIndex="-1"
          role="dialog"
        >
          <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
            <div className="modal-content border-0 shadow-lg">
              <form onSubmit={handleAssignSubmit}>
                <div className="modal-header py-3 px-4 border-bottom">
                  <h5 className="modal-title text-dark fw-bold">
                    <i className="ti ti-user-plus me-2 text-primary"></i>Assign Fee Structure to Students
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowModal(false)}
                    aria-label="Close"
                  ></button>
                </div>

                <div className="modal-body p-4">
                  <div className="row g-3 mb-3">
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">
                        Academic Year <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        required
                        value={modalYearId}
                        onChange={(e) => setModalYearId(e.target.value)}
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
                      <label className="form-label fw-semibold">
                        Target Class <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        required
                        value={modalClassId}
                        onChange={(e) => handleModalClassChange(e.target.value)}
                      >
                        <option value="">-- Select Class --</option>
                        {classes.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.class_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold">
                        Fee Structure <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        required
                        value={modalStructureId}
                        onChange={(e) => setModalStructureId(e.target.value)}
                      >
                        <option value="">-- Select Structure --</option>
                        {structures.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.name} ({st.frequency})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-check form-switch mb-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="allowPartialSwitch"
                      checked={allowPartial}
                      onChange={(e) => setAllowPartial(e.target.checked)}
                    />
                    <label className="form-check-label fw-semibold" htmlFor="allowPartialSwitch">
                      Allow Partial Fee Payments for assigned students
                    </label>
                  </div>

                  <hr className="my-3" />

                  {/* Student Selection List */}
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="fw-bold text-dark mb-0">
                      Select Students ({selectedStudentIds.length} of {students.length} Selected)
                    </h6>
                    {students.length > 0 && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={handleSelectAllStudents}
                      >
                        {selectedStudentIds.length === students.length
                          ? 'Deselect All'
                          : 'Select All'}
                      </button>
                    )}
                  </div>

                  {loadingStudents ? (
                    <div className="text-center py-4 text-muted">
                      <div className="spinner-border text-primary spinner-border-sm me-2"></div>
                      Loading students in selected class...
                    </div>
                  ) : students.length === 0 ? (
                    <div className="alert alert-warning py-2 mb-0 fs-13">
                      No active students found in this class.
                    </div>
                  ) : (
                    <div
                      className="border rounded p-2"
                      style={{ maxHeight: '240px', overflowY: 'auto' }}
                    >
                      <div className="row g-2">
                        {students.map((st) => {
                          const isSelected = selectedStudentIds.includes(st.id);
                          return (
                            <div key={`st-${st.id}`} className="col-md-6">
                              <div
                                onClick={() => handleToggleStudent(st.id)}
                                className={`p-2 rounded border d-flex align-items-center justify-content-between cursor-pointer ${
                                  isSelected ? 'bg-primary-subtle border-primary' : 'bg-light'
                                }`}
                                style={{ cursor: 'pointer' }}
                              >
                                <div>
                                  <div className="fw-semibold text-dark fs-13">
                                    {st.first_name} {st.last_name || ''}
                                  </div>
                                  <small className="text-muted fs-11">
                                    Adm: {st.admission_number || 'N/A'}{' '}
                                    {st.roll_number && `• Roll: ${st.roll_number}`}
                                  </small>
                                </div>
                                <input
                                  type="checkbox"
                                  className="form-check-input mt-0"
                                  checked={isSelected}
                                  onChange={() => {}}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={allocating || selectedStudentIds.length === 0}
                  >
                    {allocating ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                        Allocating...
                      </>
                    ) : (
                      <>
                        <i className="ti ti-check me-1"></i>
                        Assign Structure ({selectedStudentIds.length})
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

export default FeesAllocations;
