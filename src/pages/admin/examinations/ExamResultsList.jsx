import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminExaminationApi from '../../../api/adminExamination.api';
import adminAcademicApi from '../../../api/adminAcademic.api';

const ExamResultsList = () => {
  const [searchParams] = useSearchParams();
  const queryExamId = searchParams.get('exam_id') || '';
  const queryClassId = searchParams.get('class_id') || '';
  const queryYearId = searchParams.get('academic_year_id') || '';

  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  // Filter state
  const [selectedYear, setSelectedYear] = useState(queryYearId);
  const [selectedExam, setSelectedExam] = useState(queryExamId);
  const [selectedClass, setSelectedClass] = useState(queryClassId);

  // Result Matrix
  const [subjects, setSubjects] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);

  // Datatable Search & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setInitialLoading(true);
      const [exRes, clsRes, ayRes] = await Promise.all([
        adminExaminationApi.getAllExams({ status: 1 }),
        adminAcademicApi.getAllClasses({ status: 1 }),
        adminAcademicApi.getAllAcademicYears(),
      ]);

      const examsList = Array.isArray(exRes?.data?.exams)
        ? exRes.data.exams
        : Array.isArray(exRes?.data)
        ? exRes.data
        : [];

      const classesList = Array.isArray(clsRes?.data)
        ? clsRes.data
        : Array.isArray(clsRes?.data?.classes)
        ? clsRes.data.classes
        : Array.isArray(clsRes)
        ? clsRes
        : [];

      const yearsList = Array.isArray(ayRes?.data)
        ? ayRes.data
        : Array.isArray(ayRes?.data?.academicYears)
        ? ayRes.data.academicYears
        : Array.isArray(ayRes)
        ? ayRes
        : [];

      setExams(examsList);
      setClasses(classesList);
      setAcademicYears(yearsList);

      const targetYear =
        queryYearId || (yearsList.find((y) => y.is_current === 1)?.id || (yearsList[0]?.id || ''));
      const targetExam = queryExamId || (examsList.length > 0 ? examsList[0].id : '');
      const targetClass = queryClassId || (classesList.length > 0 ? classesList[0].id : '');

      setSelectedYear(targetYear);
      setSelectedExam(targetExam);
      setSelectedClass(targetClass);

      if (targetExam && targetClass) {
        performSearch(targetYear, targetExam, targetClass);
      }
    } catch (err) {
      console.error('Failed to load filter options:', err);
      toast.error('Failed to load filter options');
    } finally {
      setInitialLoading(false);
    }
  };

  const performSearch = async (yearId, examId, classId) => {
    if (!examId || !classId) {
      toast.warning('Please select Exam and Class.');
      return;
    }

    try {
      setLoading(true);
      setHasSearched(true);
      const params = {
        exam_id: examId,
        class_id: classId,
      };
      if (yearId) params.academic_year_id = yearId;

      const res = await adminExaminationApi.getExamResultsList(params);
      if (res?.data) {
        setSubjects(res.data.subjects || []);
        setResults(res.data.results || []);
        setCurrentPage(1);
      }
    } catch (err) {
      console.error('Failed to load exam results:', err);
      toast.error(err.message || 'Failed to load exam results');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    performSearch(selectedYear, selectedExam, selectedClass);
  };

  const exportExcel = () => {
    toast.info('Exporting exam results as Excel...');
  };

  const exportPDF = () => {
    toast.info('Exporting exam results as PDF...');
  };

  // Client-side search and pagination
  const filteredResults = useMemo(() => {
    if (!searchTerm.trim()) return results;
    const term = searchTerm.toLowerCase();
    return results.filter(
      (r) =>
        r.first_name?.toLowerCase().includes(term) ||
        r.last_name?.toLowerCase().includes(term) ||
        r.admission_no?.toLowerCase().includes(term) ||
        String(r.roll_no).toLowerCase().includes(term) ||
        r.class_name?.toLowerCase().includes(term)
    );
  }, [results, searchTerm]);

  const totalPages = Math.ceil(filteredResults.length / pageSize) || 1;
  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredResults.slice(start, start + pageSize);
  }, [filteredResults, currentPage, pageSize]);

  return (
    <div className="content">
      {/* Styles matching template */}
      <style>{`
        .custom-table th {
            font-size: 14px;
            white-space: nowrap;
        }

        .custom-table td {
            vertical-align: middle;
            font-size: 14px;
        }

        .subject-inline {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 6px;
            font-weight: 500;
        }

        .grade-badge {
            padding: 4px 8px;
            font-size: 12px;
            border-radius: 5px;
            background-color: #28a745;
            color: #fff;
        }

        .grade-O {
            background: #28a745;
        }

        .grade-A {
            background: #007bff;
        }

        .grade-B {
            background: #ffc107;
            color: #000;
        }

        .grade-C {
            background: #dc3545;
        }

        .table-hover tbody tr:hover {
            background-color: #f1f3f5;
        }
      `}</style>

      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Exam Result</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                Result
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                <Link to="/admin/examinations/results">Result</Link>
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
          <div className="pe-1 mb-2">
            <button
              type="button"
              onClick={handleSearch}
              className="btn btn-outline-light bg-white btn-icon me-1"
              title="Refresh"
            >
              <i className="ti ti-refresh"></i>
            </button>
          </div>
          <div className="pe-1 mb-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="btn btn-outline-light bg-white btn-icon me-1"
              title="Print"
            >
              <i className="ti ti-printer"></i>
            </button>
          </div>
          <div className="dropdown me-2 mb-2">
            <button
              type="button"
              className="dropdown-toggle btn btn-light fw-medium d-inline-flex align-items-center"
              data-bs-toggle="dropdown"
            >
              <i className="ti ti-file-export me-2"></i>Export
            </button>
            <ul className="dropdown-menu dropdown-menu-end p-3">
              <li>
                <button
                  type="button"
                  onClick={exportPDF}
                  className="dropdown-item rounded-1"
                >
                  <i className="ti ti-file-type-pdf me-2"></i>Export as PDF
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={exportExcel}
                  className="dropdown-item rounded-1"
                >
                  <i className="ti ti-file-type-xls me-2"></i>Export as Excel
                </button>
              </li>
            </ul>
          </div>
          <div className="mb-2">
            <Link
              to={`/admin/examinations/results/add${
                selectedExam && selectedClass
                  ? `?exam_id=${selectedExam}&class_id=${selectedClass}&academic_year_id=${selectedYear}`
                  : ''
              }`}
              className="btn btn-primary d-flex align-items-center"
            >
              <i className="ti ti-square-rounded-plus me-2"></i>Add Result
            </Link>
          </div>
        </div>
      </div>
      {/* /Page Header */}

      {/* Main Result Card */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap pb-0">
          <h4 className="mb-3">Exam Result</h4>
        </div>
        <div className="bg-white p-3 border rounded-1 d-flex align-items-center justify-content-between flex-wrap mb-5 pb-0">
          <form onSubmit={handleSearch} className="w-100">
            <div className="row w-100">
              <div className="col-md-2">
                <div className="mb-3">
                  <label className="form-label" htmlFor="academic_year_id">
                    Academic Year <strong className="text-danger">*</strong>
                  </label>
                  <select
                    className="form-select select"
                    name="academic_year_id"
                    id="academic_year_id"
                    required
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                  >
                    <option value="">Select </option>
                    {academicYears.map((ay) => (
                      <option key={ay.id} value={ay.id}>
                        {ay.name || ay.academic_year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="col-md-2">
                <div className="mb-3">
                  <label className="form-label" htmlFor="exam_id">
                    Exam <strong className="text-danger">*</strong>
                  </label>
                  <select
                    className="form-select select"
                    name="exam_id"
                    id="exam_id"
                    required
                    value={selectedExam}
                    onChange={(e) => setSelectedExam(e.target.value)}
                  >
                    <option value="">Select </option>
                    {exams.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.exam_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="col-md-2">
                <div className="mb-3">
                  <label className="form-label" htmlFor="class_id">
                    Class
                  </label>
                  <select
                    className="form-select select"
                    name="class_id"
                    id="class_id"
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                  >
                    <option value="">Select </option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.class_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="col-md-2 d-flex align-items-center">
                <button
                  className="btn btn-outline-primary w-100"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1"></span>
                      Searching...
                    </>
                  ) : (
                    'Search'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Results Datatable Body */}
        <div id="attendanceTableBody">
          <div className="card-body p-0 py-3">
            <div className="custom-datatable-filter table-responsive">
              <div id="examTable_wrapper" className="dataTables_wrapper dt-bootstrap5 no-footer">
                <div className="row mb-3">
                  <div className="col-sm-12 col-md-6">
                    <div className="dataTables_length" id="examTable_length">
                      <label className="d-flex align-items-center gap-2">
                        Row Per Page
                        <select
                          name="examTable_length"
                          aria-controls="examTable"
                          className="form-select form-select-sm"
                          style={{ width: '80px' }}
                          value={pageSize}
                          onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setCurrentPage(1);
                          }}
                        >
                          <option value="10">10</option>
                          <option value="25">25</option>
                          <option value="50">50</option>
                          <option value="100">100</option>
                        </select>
                        Entries
                      </label>
                    </div>
                  </div>
                  <div className="col-sm-12 col-md-6">
                    <div id="examTable_filter" className="dataTables_filter text-md-end">
                      <label className="d-inline-flex align-items-center gap-2">
                        <input
                          type="search"
                          className="form-control form-control-sm"
                          placeholder="Search"
                          aria-controls="examTable"
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="row dt-row">
                  <div className="col-sm-12 table-responsive">
                    <table className="table datatable dataTable no-footer custom-table" id="examTable">
                      <thead className="table-dark">
                        <tr>
                          <th className="text-center" style={{ width: '70px' }}>Sl No</th>
                          <th className="text-center" style={{ width: '150px' }}>Admission No</th>
                          <th className="text-center">Student</th>
                          <th className="text-center" style={{ width: '90px' }}>Class</th>
                          {subjects.map((sub) => (
                            <th key={sub.subject_id} className="text-center">
                              {sub.subject_name}
                            </th>
                          ))}
                          <th className="text-center" style={{ width: '130px' }}>Total Marks</th>
                        </tr>
                      </thead>

                      <tbody id="examAttendanceTbody">
                        {initialLoading || loading ? (
                          <tr>
                            <td colSpan={subjects.length + 5} className="text-center py-4 text-muted">
                              <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
                              Loading exam results...
                            </td>
                          </tr>
                        ) : !hasSearched && paginatedResults.length === 0 ? (
                          <tr>
                            <td colSpan={subjects.length + 5} className="text-center py-4 text-muted">
                              Please click Search to load exam results.
                            </td>
                          </tr>
                        ) : paginatedResults.length === 0 ? (
                          <tr className="odd">
                            <td colSpan={subjects.length + 5} className="dataTables_empty text-center py-4">
                              No data available in table
                            </td>
                          </tr>
                        ) : (
                          paginatedResults.map((row, idx) => (
                            <tr key={row.id || idx}>
                              <td className="text-center">
                                {(currentPage - 1) * pageSize + idx + 1}
                              </td>
                              <td className="text-center">{row.admission_no || '-'}</td>

                              <td className="text-start">
                                <div className="d-flex align-items-center">
                                  <img
                                    src="/vidya_assets/images/male-user.png"
                                    className="rounded-circle me-2"
                                    width="40"
                                    height="40"
                                    alt="student"
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.src =
                                        'https://portal.growvidya.in/dev/vidya_assets/images/male-user.png';
                                    }}
                                  />
                                  <div>
                                    <strong>
                                      {row.first_name} {row.last_name || ''}
                                    </strong>
                                    <br />
                                    <small>Roll: {row.roll_no || '-'}</small>
                                  </div>
                                </div>
                              </td>

                              <td className="text-center">{row.class_name || '-'}</td>

                              {subjects.map((sub) => {
                                const subResult = row.subjectTotals?.[sub.subject_id];
                                return (
                                  <td key={sub.subject_id} className="text-center">
                                    <div className="subject-inline">
                                      {subResult !== undefined ? (
                                        subResult.total_marks
                                      ) : (
                                        <span className="text-muted">-</span>
                                      )}
                                    </div>
                                  </td>
                                );
                              })}

                              <td className="fw-bold text-success text-center">
                                {row.total_marks_obtained !== undefined
                                  ? row.total_marks_obtained
                                  : '-'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Datatables Pagination Footer */}
                <div className="row mt-3">
                  <div className="col-sm-12 col-md-5">
                    {filteredResults.length > 0 && (
                      <p className="text-muted fs-13 mb-0">
                        Showing {(currentPage - 1) * pageSize + 1} to{' '}
                        {Math.min(currentPage * pageSize, filteredResults.length)} of{' '}
                        {filteredResults.length} entries
                      </p>
                    )}
                  </div>
                  <div className="col-sm-12 col-md-7">
                    <div className="dataTables_paginate paging_simple_numbers float-md-end" id="examTable_paginate">
                      <ul className="pagination mb-0">
                        <li
                          className={`paginate_button page-item previous ${
                            currentPage === 1 ? 'disabled' : ''
                          }`}
                          id="examTable_previous"
                        >
                          <button
                            type="button"
                            className="page-link"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          >
                            Prev
                          </button>
                        </li>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                          <li
                            key={pageNum}
                            className={`paginate_button page-item ${
                              currentPage === pageNum ? 'active' : ''
                            }`}
                          >
                            <button
                              type="button"
                              className="page-link"
                              onClick={() => setCurrentPage(pageNum)}
                            >
                              {pageNum}
                            </button>
                          </li>
                        ))}
                        <li
                          className={`paginate_button page-item next ${
                            currentPage === totalPages || totalPages === 0 ? 'disabled' : ''
                          }`}
                          id="examTable_next"
                        >
                          <button
                            type="button"
                            className="page-link"
                            disabled={currentPage === totalPages || totalPages === 0}
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
    </div>
  );
};

export default ExamResultsList;
