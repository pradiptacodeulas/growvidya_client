import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getClassReportOptionsApi, getClassReportApi } from '../../../api/adminReport.api';
import defaultAvatar from '../../../assets/male-user.png';
import { encodeParam } from '../../../utils/idHelper';

const ClassReport = () => {
  // Filter options from backend
  const [options, setOptions] = useState({
    academicYears: [],
    shifts: [],
    classes: [],
    sections: [],
  });

  // Selected filters
  const [filters, setFilters] = useState({
    academicYear: '',
    shift: '',
    class: '',
    section: '',
  });

  // Active query parameters used when clicking "Show Report"
  const [activeParams, setActiveParams] = useState(null);

  // Table state
  const [students, setStudents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(true);

  // Pagination & Search
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  // Row selection
  const [selectedIds, setSelectedIds] = useState([]);

  // Load filter options on mount
  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      setOptionsLoading(true);
      const res = await getClassReportOptionsApi();
      if (res && res.data) {
        setOptions(res.data);
        // Default to active / current academic year by checking is_current
        const currentYear = res.data.academicYears.find(
          (y) => Number(y.is_current) === 1 || String(y.is_current) === '1' || y.isCurrent
        );
        if (currentYear) {
          setFilters((prev) => ({ ...prev, academicYear: String(currentYear.id) }));
        } else if (res.data.academicYears.length > 0) {
          setFilters((prev) => ({ ...prev, academicYear: String(res.data.academicYears[0].id) }));
        }

        if (res.data.shifts.length > 0) {
          const firstShift = res.data.shifts[0];
          setFilters((prev) => ({ ...prev, shift: String(firstShift.id) }));
        }
      }
    } catch (err) {
      console.error('Error fetching filter options:', err);
      toast.error('Failed to load filter options.');
    } finally {
      setOptionsLoading(false);
    }
  };

  // Dynamically filtered classes based on selected shift
  const availableClasses = useMemo(() => {
    if (!filters.shift) return options.classes;
    return options.classes.filter((c) => String(c.shift_id) === String(filters.shift));
  }, [options.classes, filters.shift]);

  // Dynamically filtered sections based on selected class
  const availableSections = useMemo(() => {
    if (!filters.class) return [];
    return options.sections.filter((s) => String(s.class_id) === String(filters.class));
  }, [options.sections, filters.class]);

  // When shift changes, update available class
  const handleShiftChange = (e) => {
    const shiftVal = e.target.value;
    setFilters((prev) => ({
      ...prev,
      shift: shiftVal,
      class: '',
      section: '',
    }));
  };

  // When class changes, reset section
  const handleClassChange = (e) => {
    const classVal = e.target.value;
    setFilters((prev) => ({
      ...prev,
      class: classVal,
      section: '',
    }));
  };

  // Handle form submission to show report
  const handleShowReport = (e) => {
    if (e) e.preventDefault();
    if (!filters.academicYear) {
      toast.warning('Please select an Academic Year.');
      return;
    }
    if (!filters.shift) {
      toast.warning('Please select a Shift.');
      return;
    }
    if (!filters.class) {
      toast.warning('Please select a Class.');
      return;
    }
    if (!filters.section) {
      toast.warning('Please select a Section.');
      return;
    }

    setCurrentPage(1);
    const params = {
      academicYearId: filters.academicYear,
      shiftId: filters.shift,
      classId: filters.class,
      sectionId: filters.section,
    };
    setActiveParams(params);
    fetchReport(params, 1, pageSize, searchTerm);
  };

  // Fetch report data
  const fetchReport = async (params, page = 1, limit = 10, search = '') => {
    if (!params) return;
    try {
      setLoading(true);
      const res = await getClassReportApi({
        ...params,
        page,
        limit,
        search,
      });

      if (res && res.data) {
        setStudents(res.data.students || []);
        setSummary(res.data.summary || null);
        setTotalRecords(res.data.pagination?.total || 0);
        setTotalPages(res.data.pagination?.totalPages || 1);
        setCurrentPage(res.data.pagination?.page || page);
      }
    } catch (err) {
      console.error('Error fetching class report:', err);
      toast.error('Failed to load class report data.');
    } finally {
      setLoading(false);
    }
  };

  // Refetch when page size or search term changes
  const handlePageSizeChange = (e) => {
    const newSize = Number(e.target.value);
    setPageSize(newSize);
    setCurrentPage(1);
    if (activeParams) {
      fetchReport(activeParams, 1, newSize, searchTerm);
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    setCurrentPage(1);
    if (activeParams) {
      fetchReport(activeParams, 1, pageSize, val);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    if (activeParams) {
      fetchReport(activeParams, page, pageSize, searchTerm);
    }
  };

  // Select all checkboxes
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = students.map((s) => s.student_id);
      setSelectedIds(allIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1 text-dark fw-semibold">Class Report</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item text-muted">Report</li>
              <li className="breadcrumb-item active" aria-current="page">
                Class Report
              </li>
            </ol>
          </nav>
        </div>
      </div>
      {/* /Page Header */}

      {/* Filter Section */}
      <div className="bg-white p-3 border rounded-1 mb-4 shadow-sm">
        <form className="row g-3 align-items-end" onSubmit={handleShowReport}>
          {/* Academic Year */}
          <div className="col-12 col-sm-6 col-md-3 col-lg-2">
            <div>
              <label className="form-label text-dark fw-semibold small mb-1">
                Academic Year <span className="text-danger">*</span>
              </label>
              <select
                className="form-select form-select-sm text-dark"
                name="academic_year"
                id="academic_year"
                required
                value={filters.academicYear}
                onChange={(e) => setFilters((prev) => ({ ...prev, academicYear: e.target.value }))}
                disabled={optionsLoading}
              >
                <option value="">Select</option>
                {options.academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Shift */}
          <div className="col-12 col-sm-6 col-md-3 col-lg-2">
            <div>
              <label className="form-label text-dark fw-semibold small mb-1">
                Shift <span className="text-danger">*</span>
              </label>
              <select
                className="form-select form-select-sm text-dark"
                name="shift"
                id="shift"
                required
                value={filters.shift}
                onChange={handleShiftChange}
                disabled={optionsLoading}
              >
                <option value="">Select</option>
                {options.shifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.shift_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Class */}
          <div className="col-12 col-sm-6 col-md-3 col-lg-2">
            <div>
              <label className="form-label text-dark fw-semibold small mb-1">
                Class <span className="text-danger">*</span>
              </label>
              <select
                className="form-select form-select-sm text-dark"
                name="class"
                id="class"
                required
                value={filters.class}
                onChange={handleClassChange}
                disabled={optionsLoading || availableClasses.length === 0}
              >
                <option value="">Select</option>
                {availableClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.class_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section */}
          <div className="col-12 col-sm-6 col-md-3 col-lg-2">
            <div>
              <label className="form-label text-dark fw-semibold small mb-1">
                Section <span className="text-danger">*</span>
              </label>
              <select
                className="form-select form-select-sm text-dark"
                name="section"
                id="section"
                required
                value={filters.section}
                onChange={(e) => setFilters((prev) => ({ ...prev, section: e.target.value }))}
                disabled={optionsLoading || availableSections.length === 0}
              >
                <option value="">Select</option>
                {availableSections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.section_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Submit Button */}
          <div className="col-12 col-sm-6 col-md-3 col-lg-2">
            <button className="btn btn-outline-primary w-100" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1"></span> Loading...
                </>
              ) : (
                'Show Report'
              )}
            </button>
          </div>
        </form>
      </div>
      {/* /Filter */}

      {/* Report Content Section */}
      {summary && (
        <div className="row">
          <div id="classTableBody" className="col-12">
            {/* Basic Information Card */}
            <div className="card border-white mb-4 shadow-sm">
              <div className="card-body">
                <dl className="row mb-0 g-2">
                  <dt className="col-6 col-sm-4 col-md-3 fw-medium text-dark mb-2">Academic Year</dt>
                  <dd className="col-6 col-sm-8 col-md-3 text-dark mb-2">{summary.academicYear || '—'}</dd>
                  <dt className="col-6 col-sm-4 col-md-3 fw-medium text-dark mb-2">Shift</dt>
                  <dd className="col-6 col-sm-8 col-md-3 text-dark mb-2">{summary.shift || '—'}</dd>
                  <dt className="col-6 col-sm-4 col-md-3 fw-medium text-dark mb-2">Class</dt>
                  <dd className="col-6 col-sm-8 col-md-3 text-dark mb-2">{summary.className || '—'}</dd>
                  <dt className="col-6 col-sm-4 col-md-3 fw-medium text-dark mb-2">Section</dt>
                  <dd className="col-6 col-sm-8 col-md-3 text-dark mb-2">{summary.sectionName || '—'}</dd>
                  <dt className="col-6 col-sm-4 col-md-3 fw-medium text-dark mb-0">No of Students</dt>
                  <dd className="col-6 col-sm-8 col-md-3 text-dark fw-bold mb-0">{summary.totalStudents}</dd>
                </dl>
              </div>
            </div>

            {/* Students Table Card */}
            <div className="card shadow-sm border-0 mb-4">
              <div className="card-body p-0">
                <div id="DataTables_Table_0_wrapper" className="dataTables_wrapper dt-bootstrap5 no-footer">
                  {/* Table Header Controls */}
                  <div className="row g-3 p-3 align-items-center">
                    <div className="col-12 col-sm-6">
                      <div className="dataTables_length" id="DataTables_Table_0_length">
                        <label className="d-inline-flex align-items-center small text-muted mb-0">
                          Show
                          <select
                            name="DataTables_Table_0_length"
                            aria-controls="DataTables_Table_0"
                            className="form-select form-select-sm mx-2"
                            style={{ width: '70px' }}
                            value={pageSize}
                            onChange={handlePageSizeChange}
                          >
                            <option value="10">10</option>
                            <option value="25">25</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                          </select>
                          entries
                        </label>
                      </div>
                    </div>
                    <div className="col-12 col-sm-6 d-flex justify-content-sm-end">
                      <div id="DataTables_Table_0_filter" className="dataTables_filter w-100 w-sm-auto">
                        <label className="d-inline-flex align-items-center small text-muted mb-0 w-100 justify-content-sm-end">
                          Search:
                          <input
                            type="search"
                            className="form-control form-control-sm ms-2"
                            placeholder=""
                            aria-controls="DataTables_Table_0"
                            value={searchTerm}
                            onChange={handleSearchChange}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Responsive Table Wrapper */}
                  <div
                    className="table-responsive"
                    style={{
                      overflowX: 'auto',
                      WebkitOverflowScrolling: 'touch',
                      minHeight: '220px',
                    }}
                  >
                    <table
                      className="table datatable dataTable no-footer table-hover text-nowrap align-middle mb-0"
                      id="DataTables_Table_0"
                      aria-describedby="DataTables_Table_0_info"
                      style={{ width: '100%', minWidth: '950px' }}
                    >
                      <thead className="thead-light">
                        <tr>
                          <th className="no-sort text-center" style={{ width: '55px', whiteSpace: 'nowrap' }}>
                            <div className="form-check form-check-md d-flex justify-content-center">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id="select-all"
                                checked={
                                  students.length > 0 &&
                                  students.every((s) => selectedIds.includes(s.student_id))
                                }
                                onChange={handleSelectAll}
                              />
                            </div>
                          </th>
                          <th className="text-center" style={{ width: '80px', whiteSpace: 'nowrap' }}>
                            Sl No.
                          </th>
                          <th className="text-center" style={{ width: '150px', whiteSpace: 'nowrap' }}>
                            Admission No.
                          </th>
                          <th className="text-center" style={{ width: '100px', whiteSpace: 'nowrap' }}>
                            Roll No.
                          </th>
                          <th style={{ minWidth: '220px', whiteSpace: 'nowrap' }}>Name</th>
                          <th className="text-center" style={{ minWidth: '140px', whiteSpace: 'nowrap' }}>
                            Phone
                          </th>
                          <th className="text-center" style={{ minWidth: '180px', whiteSpace: 'nowrap' }}>
                            Email
                          </th>
                          <th className="text-center" style={{ width: '90px', whiteSpace: 'nowrap' }}>
                            Gander
                          </th>
                          <th className="text-center" style={{ width: '85px', whiteSpace: 'nowrap' }}>
                            Marks
                          </th>
                          <th className="text-center" style={{ width: '110px', whiteSpace: 'nowrap' }}>
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr>
                            <td colSpan="10" className="text-center py-5">
                              <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                              Loading class report data...
                            </td>
                          </tr>
                        ) : students.length === 0 ? (
                          <tr>
                            <td colSpan="10" className="text-center py-5 text-muted">
                              No students found for the selected criteria.
                            </td>
                          </tr>
                        ) : (
                          students.map((student, idx) => {
                            const globalIdx = (currentPage - 1) * pageSize + idx + 1;
                            const isOdd = idx % 2 === 0;
                            const isSelected = selectedIds.includes(student.student_id);
                            const isActive = student.status === 1 || student.status === '1';

                            return (
                              <tr key={student.student_id || idx} className={isOdd ? 'odd' : 'even'}>
                                <td className="text-center" style={{ whiteSpace: 'nowrap' }}>
                                  <div className="form-check form-check-md d-flex justify-content-center">
                                    <input
                                      className="form-check-input"
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => handleSelectRow(student.student_id)}
                                    />
                                  </div>
                                </td>
                                <td className="text-center text-dark" style={{ whiteSpace: 'nowrap' }}>{globalIdx}</td>
                                <td className="text-center text-dark fw-medium" style={{ whiteSpace: 'nowrap' }}>
                                  {student.admission_number || '—'}
                                </td>
                                <td className="text-center text-dark" style={{ whiteSpace: 'nowrap' }}>
                                  {student.roll_number || '—'}
                                </td>
                                <td style={{ whiteSpace: 'nowrap' }}>
                                  <div className="d-flex align-items-center">
                                    <span className="avatar avatar-md me-2 flex-shrink-0">
                                      <img
                                        src={
                                          student.picture
                                            ? `/upload/students/${student.picture}`
                                            : defaultAvatar
                                        }
                                        className="img-fluid rounded-circle"
                                        alt={student.full_name}
                                        onError={(e) => {
                                          e.target.onerror = null;
                                          e.target.src = defaultAvatar;
                                        }}
                                      />
                                    </span>
                                    <div>
                                      <p className="text-dark fw-semibold mb-0">
                                        <Link to={`/admin/students/${encodeParam(student.student_id)}`} className="text-dark">
                                          {student.full_name}
                                        </Link>
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="text-center text-dark" style={{ whiteSpace: 'nowrap' }}>
                                  {student.phone || '—'}
                                </td>
                                <td className="text-center text-dark" style={{ whiteSpace: 'nowrap' }}>
                                  {student.email || '—'}
                                </td>
                                <td className="text-center text-dark" style={{ whiteSpace: 'nowrap' }}>
                                  {student.gender || 'Male'}
                                </td>
                                <td className="text-center text-dark" style={{ whiteSpace: 'nowrap' }}>
                                  {student.marks || ''}
                                </td>
                                <td className="text-center" style={{ whiteSpace: 'nowrap' }}>
                                  <span
                                    className={`badge ${
                                      isActive ? 'badge-soft-success' : 'badge-soft-danger'
                                    } d-inline-flex align-items-center`}
                                  >
                                    <i className="ti ti-circle-filled fs-5 me-1"></i>
                                    {isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Table Footer & Pagination */}
                  <div className="row g-3 p-3 align-items-center">
                    <div className="col-12 col-sm-6 text-center text-sm-start">
                      <div className="dataTables_info text-muted small" id="DataTables_Table_0_info" role="status" aria-live="polite">
                        Showing{' '}
                        {totalRecords > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
                        {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} entries
                      </div>
                    </div>
                    <div className="col-12 col-sm-6 d-flex justify-content-center justify-content-sm-end">
                      <div className="dataTables_paginate paging_simple_numbers" id="DataTables_Table_0_paginate">
                        <ul className="pagination pagination-sm mb-0 flex-wrap justify-content-center">
                          <li className={`paginate_button page-item previous ${currentPage === 1 ? 'disabled' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                              disabled={currentPage === 1}
                            >
                              Previous
                            </button>
                          </li>
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <li
                              key={page}
                              className={`paginate_button page-item ${currentPage === page ? 'active' : ''}`}
                            >
                              <button className="page-link" onClick={() => handlePageChange(page)}>
                                {page}
                              </button>
                            </li>
                          ))}
                          <li className={`paginate_button page-item next ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                              disabled={currentPage === totalPages || totalPages === 0}
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassReport;
