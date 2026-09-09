import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import adminExaminationApi from '../../../api/adminExamination.api';
import adminAcademicApi from '../../../api/adminAcademic.api';
import { fetchTeacherClassesApi } from '../../../api/teacherAcademic.api';
import TableActionMenu from '../../../components/common/TableActionMenu';
import { encodeParam, decodeParam } from '../../../utils/idHelper';
import {
  sortAcademicYearsDesc,
  sortExamsDesc,
  sortClassesDesc,
  sortSectionsDesc,
} from '../../../utils/dropdownSort.util';

const getPageNumbers = (current, total) => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, '...', total];
  }
  if (current >= total - 3) {
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, '...', current - 1, current, current + 1, '...', total];
};

const ExamAttendance = () => {
  const { teacher, isAuthenticated: isTeacherAuth } = useSelector((state) => state.teacherAuth);
  const isTeacher = Boolean(
    (typeof window !== 'undefined' && window.location.pathname.startsWith('/teacher')) ||
    (isTeacherAuth && teacher)
  );
  const basePath = isTeacher ? '/teacher' : '/admin';

  const [searchParams] = useSearchParams();
  const queryExamId = decodeParam(searchParams.get('exam_id'));
  const queryClassId = decodeParam(searchParams.get('class_id'));
  const queryYearId = decodeParam(searchParams.get('academic_year_id'));
  const querySectionId = decodeParam(searchParams.get('section_id'));

  const [academicYears, setAcademicYears] = useState([]);
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);

  // Filters
  const [selectedYear, setSelectedYear] = useState(queryYearId);
  const [selectedExam, setSelectedExam] = useState(queryExamId);
  const [selectedClass, setSelectedClass] = useState(queryClassId);
  const [selectedSection, setSelectedSection] = useState(querySectionId);

  // Results State
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);

  // Server-level Pagination & Search State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const searchTimerRef = useRef(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setInitialLoading(true);
      const fetchClasses = isTeacher ? fetchTeacherClassesApi : adminAcademicApi.getAllClasses;
      const [exRes, clsRes, yrRes] = await Promise.all([
        adminExaminationApi.getAllExams({ status: 1 }),
        fetchClasses({ status: 1 }),
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

      const yearsList = Array.isArray(yrRes?.data)
        ? yrRes.data
        : Array.isArray(yrRes?.data?.academicYears)
        ? yrRes.data.academicYears
        : Array.isArray(yrRes?.data?.academic_years)
        ? yrRes.data.academic_years
        : Array.isArray(yrRes)
        ? yrRes
        : [];

      const sortedExams = sortExamsDesc(examsList);
      const sortedClasses = sortClassesDesc(classesList);
      const sortedYears = sortAcademicYearsDesc(yearsList);

      setExams(sortedExams);
      setClasses(sortedClasses);
      setAcademicYears(sortedYears);

      let defaultYear = selectedYear || queryYearId;
      // Auto-align defaultYear to the exam's academic year if exam_id was passed in URL
      if (!defaultYear && queryExamId) {
        const matchedExam = sortedExams.find((ex) => String(ex.id) === String(queryExamId));
        if (matchedExam && matchedExam.academic_year) {
          defaultYear = String(matchedExam.academic_year);
        }
      }
      if (!defaultYear && sortedYears.length > 0) {
        const currentYear =
          sortedYears.find((y) => Number(y.is_current) === 1 || String(y.is_current) === '1' || y.isCurrent) ||
          sortedYears[0];
        defaultYear = currentYear ? String(currentYear.id) : '';
      }
      setSelectedYear(defaultYear);

      // Only pick default exam from exams matching the selected/default academic year
      const yearExams = defaultYear
        ? sortedExams.filter((ex) => String(ex.academic_year) === String(defaultYear))
        : sortedExams;

      let defaultExam = selectedExam || queryExamId;
      if (!defaultExam || !yearExams.some((ex) => String(ex.id) === String(defaultExam))) {
        defaultExam = yearExams.length > 0 ? String(yearExams[0].id) : (sortedExams.length > 0 ? String(sortedExams[0].id) : '');
      }
      setSelectedExam(defaultExam);

      let defaultClass = selectedClass;
      if (!defaultClass && sortedClasses.length > 0) {
        defaultClass = String(sortedClasses[0].id);
        setSelectedClass(defaultClass);
      }

      if (defaultClass) {
        await fetchSectionsForClass(defaultClass);
      }

      if (defaultExam && defaultClass) {
        fetchAttendance(defaultExam, defaultClass, querySectionId || '', defaultYear, 1, 10, '');
      }
    } catch (err) {
      toast.error('Failed to load initial exam filters');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleYearChange = (yearId) => {
    setSelectedYear(yearId);

    // Filter exams strictly for this academic year
    const matchedExams = yearId
      ? exams.filter((ex) => String(ex.academic_year) === String(yearId))
      : exams;

    const isCurrentValid = matchedExams.some((ex) => String(ex.id) === String(selectedExam));
    const nextExam = isCurrentValid ? selectedExam : (matchedExams.length > 0 ? String(matchedExams[0].id) : '');
    setSelectedExam(nextExam);

    if (nextExam && selectedClass) {
      setCurrentPage(1);
      fetchAttendance(nextExam, selectedClass, selectedSection, yearId, 1, pageSize, searchTerm);
    } else {
      setStudents([]);
      setSubjects([]);
      setTotalRecords(0);
      setTotalPages(1);
    }
  };

  const fetchSectionsForClass = async (classId) => {
    if (!classId) {
      setSections([]);
      return;
    }
    try {
      const res = await adminAcademicApi.fetchSectionsApi({ class_id: classId, status: 1 });
      const secList = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.sections)
        ? res.data.sections
        : Array.isArray(res)
        ? res
        : [];
      setSections(sortSectionsDesc(secList));
    } catch (err) {
      console.error('Failed to load sections:', err);
      setSections([]);
    }
  };

  const handleClassChange = async (e) => {
    const classId = e.target.value;
    setSelectedClass(classId);
    setSelectedSection('');
    if (classId) {
      await fetchSectionsForClass(classId);
    } else {
      setSections([]);
    }
  };

  const fetchAttendance = async (
    examId = selectedExam,
    classId = selectedClass,
    sectionId = selectedSection,
    yearId = selectedYear,
    page = currentPage,
    limit = pageSize,
    search = searchTerm
  ) => {
    if (!examId || !classId) {
      toast.warning('Please select Exam and Class');
      return;
    }

    try {
      setLoading(true);
      setHasSearched(true);
      const targetPage = Number(page) || 1;
      const targetLimit = Number(limit) || 10;
      setCurrentPage(targetPage);

      const params = {
        exam_id: examId,
        class_id: classId,
        section_id: sectionId || undefined,
        academic_year_id: yearId || selectedYear || undefined,
        page: targetPage,
        limit: targetLimit,
      };
      if (typeof search === 'string' && search.trim()) {
        params.search = search.trim();
      }

      const res = await adminExaminationApi.getExamAttendanceList(params);

      if (res?.data) {
        setSubjects(res.data.subjects || []);
        const stList = res.data.students || [];
        setStudents(stList);
        const total = typeof res.data.total === 'number' ? res.data.total : stList.length;
        setTotalRecords(total);
        setTotalPages(
          typeof res.data.totalPages === 'number'
            ? res.data.totalPages
            : Math.ceil(total / targetLimit) || 1
        );
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to load exam attendance');
      setSubjects([]);
      setStudents([]);
      setTotalRecords(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchAttendance(selectedExam, selectedClass, selectedSection, selectedYear, 1, pageSize, searchTerm);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    fetchAttendance(selectedExam, selectedClass, selectedSection, selectedYear, newPage, pageSize, searchTerm);
  };

  const handlePageSizeChange = (e) => {
    const newSize = Number(e.target.value) || 10;
    setPageSize(newSize);
    setCurrentPage(1);
    fetchAttendance(selectedExam, selectedClass, selectedSection, selectedYear, 1, newSize, searchTerm);
  };

  const handleSearchChange = (e) => {
    const val = typeof e === 'string' ? e : (e?.target?.value ?? '');
    setSearchTerm(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setCurrentPage(1);
      fetchAttendance(selectedExam, selectedClass, selectedSection, selectedYear, 1, pageSize, val);
    }, 350);
  };

  const handlePrint = () => {
    window.print();
  };

  const exportExcel = () => {
    if (!students || students.length === 0) {
      toast.info('No attendance data to export');
      return;
    }
    let csv = `Sl No,Admission No,Student Name,Class,${subjects.map((s) => s.subject_name).join(',')}\n`;
    students.forEach((st, idx) => {
      const subCols = subjects
        .map((s) => {
          const val = st.subjectAttendance?.[s.subject_id];
          return val === 1 || `${val}` === '1' ? 'Present' : 'Absent';
        })
        .join(',');
      csv += `"${idx + 1}","${st.admission_no || ''}","${st.first_name} ${st.last_name || ''}","${st.class_name || ''}",${subCols}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Exam_Attendance_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-4">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Exam Attendance</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to={`${basePath}/dashboard`}>Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Examinations</li>
              <li className="breadcrumb-item active" aria-current="page">
                Exam Attendance
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline-light bg-white btn-icon shadow-2xs"
            onClick={() => fetchAttendance(selectedExam, selectedClass, selectedSection, selectedYear, currentPage, pageSize, searchTerm)}
            title="Refresh"
          >
            <i className="ti ti-refresh"></i>
          </button>
          <button
            type="button"
            className="btn btn-outline-light bg-white btn-icon shadow-2xs"
            onClick={handlePrint}
            title="Print"
          >
            <i className="ti ti-printer"></i>
          </button>

          <TableActionMenu
            trigger={
              <span className="btn btn-light fw-medium d-inline-flex align-items-center">
                <i className="ti ti-file-export me-2"></i>Export
              </span>
            }
            items={[
              {
                label: 'Export as PDF',
                icon: 'ti ti-file-type-pdf text-danger',
                onClick: handlePrint,
              },
              {
                label: 'Export as Excel',
                icon: 'ti ti-file-type-xls text-success',
                onClick: exportExcel,
              },
            ]}
          />

          <Link
            to={`${basePath}/examinations/attendance/add${
              selectedExam && selectedClass
                ? `?exam_id=${encodeParam(selectedExam)}&class_id=${encodeParam(selectedClass)}${
                    selectedYear ? `&academic_year_id=${encodeParam(selectedYear)}` : ''
                  }${selectedSection ? `&section_id=${encodeParam(selectedSection)}` : ''}`
                : ''
            }`}
            className="btn btn-primary d-flex align-items-center"
          >
            <i className="ti ti-square-rounded-plus me-2"></i>Add Attendance
          </Link>
        </div>
      </div>

      {/* Filter Card */}
      <div className="bg-white p-3 border rounded-3 d-flex align-items-center justify-content-between flex-wrap mb-4 shadow-2xs">
        <form onSubmit={handleSearch} className="w-100">
          <div className="row g-3 align-items-end w-100">
            <div className="col-12 col-sm-6 col-md-3">
              <label className="form-label fw-semibold fs-13 mb-1">
                Academic Year
              </label>
              <select
                className="form-select form-select-sm"
                value={selectedYear}
                onChange={(e) => handleYearChange(e.target.value)}
              >
                <option value="">All Academic Years</option>
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.id}>
                    {ay.name || ay.academic_year || `Year ${ay.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-sm-6 col-md-3">
              <label className="form-label fw-semibold fs-13 mb-1">
                Exam <strong className="text-danger">*</strong>
              </label>
              <select
                className="form-select form-select-sm"
                required
                value={selectedExam}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedExam(val);
                  if (val && selectedClass) {
                    setCurrentPage(1);
                    fetchAttendance(val, selectedClass, selectedSection, selectedYear, 1, pageSize, searchTerm);
                  }
                }}
              >
                <option value="">
                  {selectedYear && exams.filter((ex) => !selectedYear || String(ex.academic_year) === String(selectedYear)).length === 0
                    ? 'No Exams for Selected Year'
                    : 'Select Exam'}
                </option>
                {exams
                  .filter((ex) => !selectedYear || String(ex.academic_year) === String(selectedYear))
                  .map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.exam_name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="col-12 col-sm-6 col-md-2">
              <label className="form-label fw-semibold fs-13 mb-1">
                Class <strong className="text-danger">*</strong>
              </label>
              <select
                className="form-select form-select-sm"
                required
                value={selectedClass}
                onChange={handleClassChange}
              >
                <option value="">Select Class</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.class_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-sm-6 col-md-2">
              <label className="form-label fw-semibold fs-13 mb-1">Section</label>
              <select
                className="form-select form-select-sm"
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
              >
                <option value="">All Sections</option>
                {sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.section_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-sm-12 col-md-2">
              <button className="btn btn-outline-primary btn-sm w-100" type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1"></span>
                    Searching...
                  </>
                ) : (
                  <>
                    <i className="ti ti-search me-1"></i>Search Attendance
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Main Table Card */}
      <div className="datatable-card">
        <div className="datatable-card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div>
            <h5 className="mb-0 fw-bold text-dark fs-16">Exam Attendance Sheet</h5>
            <p className="text-muted fs-13 mb-0 mt-1">
              Rollcall check per student and subject for the selected examination.
            </p>
          </div>

          <div className="d-flex align-items-center flex-wrap gap-2 ms-auto">
            <div className="position-relative" style={{ minWidth: '220px', maxWidth: '300px' }}>
              <i className="ti ti-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted fs-14"></i>
              <input
                type="text"
                className="form-control form-control-sm ps-5 pe-4 rounded-3 border"
                placeholder="Search student or roll..."
                value={searchTerm}
                onChange={handleSearchChange}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="btn btn-sm btn-link text-muted position-absolute top-50 end-0 translate-middle-y me-1 p-0 text-decoration-none"
                  onClick={() => {
                    setSearchTerm('');
                    setCurrentPage(1);
                    fetchAttendance(selectedExam, selectedClass, selectedSection, selectedYear, 1, pageSize, '');
                  }}
                  title="Clear search"
                >
                  <i className="ti ti-x fs-14"></i>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="datatable-wrapper">
          {initialLoading || loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status"></div>
              <p className="mt-2 text-muted">Loading exam attendance...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="table-empty-state">
              <div className="table-empty-icon">
                <i className="ti ti-clipboard-x"></i>
              </div>
              <h6 className="fw-semibold text-dark mb-1">No Attendance Records Found</h6>
              <p className="text-muted fs-13 mb-0">
                Please select exam and class filters and click Search to load attendance records.
              </p>
            </div>
          ) : (
            <table className="table-modern table-hover">
              <thead>
                <tr>
                  <th style={{ width: '70px', textAlign: 'center' }}>Sl No.</th>
                  <th style={{ width: '140px' }}>Admission No</th>
                  <th>Student Name</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Class</th>
                  {subjects.length > 0 ? (
                    subjects.map((sub) => (
                      <th key={sub.subject_id} style={{ width: '120px', textAlign: 'center' }}>
                        {sub.subject_name}
                      </th>
                    ))
                  ) : (
                    <th style={{ width: '120px', textAlign: 'center' }}>Status</th>
                  )}
                </tr>
              </thead>

              <tbody>
                {students.map((student, idx) => {
                  const globalIndex = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr key={student.student_id || idx}>
                      <td style={{ textAlign: 'center' }}>
                        <span className="text-muted fw-medium">{globalIndex}</span>
                      </td>
                      <td>
                        <span className="fw-semibold text-primary">{student.admission_no || 'N/A'}</span>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="avatar avatar-sm me-2">
                            <img
                              src="/vidya_assets/images/male-user.png"
                              className="rounded-circle"
                              style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                              alt="user"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://portal.growvidya.in/dev/vidya_assets/images/male-user.png';
                              }}
                            />
                          </div>
                          <div>
                            <p className="text-dark fw-medium mb-0 fs-13">
                              {student.first_name} {student.last_name || ''}
                            </p>
                            <span className="text-muted fs-11">
                              Roll No: {student.roll_no || '—'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge bg-light text-dark border px-2 py-1">{student.class_name || '—'}</span>
                      </td>

                      {subjects.length > 0 ? (
                        subjects.map((sub) => {
                          const status = student.subjectAttendance?.[sub.subject_id];
                          const isPresent = status === 1 || `${status}` === '1' || status === 'present';
                          const isAbsent = status === 2 || `${status}` === '2' || status === 0 || `${status}` === '0' || status === 'absent';
                          return (
                            <td key={sub.subject_id} style={{ textAlign: 'center' }}>
                              {isPresent ? (
                                <span className="badge-soft-success">
                                  <i className="ti ti-circle-check fs-12 me-1"></i>Present
                                </span>
                              ) : isAbsent ? (
                                <span className="badge-soft-danger">
                                  <i className="ti ti-circle-x fs-12 me-1"></i>Absent
                                </span>
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                          );
                        })
                      ) : (
                        <td style={{ textAlign: 'center' }}>
                          {student.attendance_status === 1 || `${student.attendance_status}` === '1' ? (
                            <span className="badge-soft-success">
                              <i className="ti ti-circle-check fs-12 me-1"></i>Present
                            </span>
                          ) : (
                            <span className="badge-soft-danger">
                              <i className="ti ti-circle-x fs-12 me-1"></i>Absent
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Modern Datatable Pagination Footer */}
        {!loading && totalRecords > 0 && (
          <div className="datatable-pagination">
            <div className="d-flex align-items-center flex-wrap gap-3">
              <span className="text-muted fs-13">
                Showing {(currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} entries
              </span>
              <div className="d-flex align-items-center gap-1.5 fs-13 text-muted">
                <span>Rows:</span>
                <select
                  className="form-select form-select-sm border rounded-2"
                  style={{ width: '75px', padding: '3px 8px' }}
                  value={pageSize}
                  onChange={handlePageSizeChange}
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
            </div>

            {totalPages > 1 && (
              <nav aria-label="Table pagination">
                <ul className="pagination-modern">
                  <li>
                    <button
                      type="button"
                      className="page-btn page-btn-prev"
                      disabled={currentPage === 1}
                      onClick={() => handlePageChange(currentPage - 1)}
                      aria-label="Previous Page"
                    >
                      <i className="ti ti-chevron-left"></i>
                    </button>
                  </li>

                  {getPageNumbers(currentPage, totalPages).map((pageNum, pIdx) => {
                    if (pageNum === '...') {
                      return (
                        <li key={`ellipsis-${pIdx}`}>
                          <span
                            className="page-btn text-muted"
                            style={{
                              border: 'none',
                              background: 'transparent',
                              cursor: 'default',
                            }}
                          >
                            ...
                          </span>
                        </li>
                      );
                    }
                    return (
                      <li key={`page-btn-${pageNum}`}>
                        <button
                          type="button"
                          className={`page-btn ${currentPage === pageNum ? 'active' : ''}`}
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum}
                        </button>
                      </li>
                    );
                  })}

                  <li>
                    <button
                      type="button"
                      className="page-btn page-btn-next"
                      disabled={currentPage === totalPages}
                      onClick={() => handlePageChange(currentPage + 1)}
                      aria-label="Next Page"
                    >
                      <i className="ti ti-chevron-right"></i>
                    </button>
                  </li>
                </ul>
              </nav>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamAttendance;
