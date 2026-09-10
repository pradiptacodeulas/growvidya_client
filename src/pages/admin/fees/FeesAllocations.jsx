import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminFeesApi from '../../../api/adminFees.api';
import adminAcademicApi from '../../../api/adminAcademic.api';
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
          <Link
            to="/admin/fees/structures"
            className="btn btn-primary d-flex align-items-center"
          >
            <i className="ti ti-layout-grid me-1"></i> Fee Structures
          </Link>
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
    </div>
  );
};

export default FeesAllocations;
