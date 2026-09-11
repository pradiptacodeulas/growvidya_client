import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import adminExaminationApi from '../../../api/adminExamination.api';
import adminAcademicApi from '../../../api/adminAcademic.api';
import TableActionMenu from '../../../components/common/TableActionMenu';
import NoData from '../../../components/common/NoData';
import {
  sortAcademicYearsDesc,
  sortExamsDesc,
  sortClassesDesc,
  sortSectionsDesc,
} from '../../../utils/dropdownSort.util';

const ExamResultsList = () => {
  const { teacher, isAuthenticated: isTeacherAuth } = useSelector((state) => state.teacherAuth);
  const isTeacher = Boolean(
    (typeof window !== 'undefined' && window.location.pathname.startsWith('/teacher')) ||
    (isTeacherAuth && teacher)
  );
  const basePath = isTeacher ? '/teacher' : '/admin';

  const decodeParamId = (val) => {
    if (!val) return '';
    try {
      const unescaped = decodeURIComponent(val);
      const decoded = atob(unescaped);
      if (/^\d+$/.test(decoded)) return decoded;
    } catch (e) {}
    return val;
  };

  const [searchParams] = useSearchParams();
  const queryExamId = decodeParamId(searchParams.get('exam_id'));
  const queryClassId = decodeParamId(searchParams.get('class_id'));
  const querySectionId = decodeParamId(searchParams.get('section_id'));
  const queryYearId = decodeParamId(searchParams.get('academic_year_id'));

  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  // Filter state
  const [selectedYear, setSelectedYear] = useState(queryYearId);
  const [selectedExam, setSelectedExam] = useState(queryExamId);
  const [selectedClass, setSelectedClass] = useState(queryClassId);
  const [selectedSection, setSelectedSection] = useState(querySectionId);

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

      const ayList = Array.isArray(ayRes?.data)
        ? ayRes.data
        : Array.isArray(ayRes?.data?.academicYears)
        ? ayRes.data.academicYears
        : Array.isArray(ayRes?.data?.academic_years)
        ? ayRes.data.academic_years
        : Array.isArray(ayRes)
        ? ayRes
        : [];

      const sortedExams = sortExamsDesc(examsList);
      const sortedClasses = sortClassesDesc(classesList);
      const sortedYears = sortAcademicYearsDesc(ayList);

      setExams(sortedExams);
      setClasses(sortedClasses);
      setAcademicYears(sortedYears);

      let defaultYear = selectedYear;
      let defaultExam = selectedExam;
      let defaultClass = selectedClass;

      if (!defaultYear && sortedYears.length > 0) {
        const currentYear =
          sortedYears.find((ay) => Number(ay.is_current) === 1 || String(ay.is_current) === '1' || ay.isCurrent) ||
          sortedYears[0];
        defaultYear = currentYear ? String(currentYear.id) : '';
        setSelectedYear(defaultYear);
      }

      if (!defaultExam && sortedExams.length > 0) {
        defaultExam = String(sortedExams[0].id);
        setSelectedExam(defaultExam);
      }

      if (!defaultClass && sortedClasses.length > 0) {
        defaultClass = String(sortedClasses[0].id);
        setSelectedClass(defaultClass);
      }

      if (defaultClass) {
        await fetchSectionsForClass(defaultClass);
      }

      if (defaultYear && defaultExam && defaultClass) {
        fetchResults(defaultYear, defaultExam, defaultClass, querySectionId || '');
      }
    } catch (err) {
      toast.error('Failed to load initial filters');
    } finally {
      setInitialLoading(false);
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

  const fetchResults = async (yearId, examId, classId, sectionId = selectedSection) => {
    if (!yearId || !examId) {
      toast.warning('Please select Academic Year and Exam');
      return;
    }

    try {
      setLoading(true);
      setHasSearched(true);
      const res = await adminExaminationApi.getExamResultsList({
        academic_year_id: yearId,
        exam_id: examId,
        class_id: classId || undefined,
        section_id: sectionId || undefined,
      });

      if (res?.data) {
        setSubjects(res.data.subjects || []);
        setResults(res.data.results || []);
        setCurrentPage(1);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to load exam results');
      setSubjects([]);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e?.preventDefault?.();
    fetchResults(selectedYear, selectedExam, selectedClass, selectedSection);
  };

  const computedResults = useMemo(() => {
    const totalSubjectMax =
      subjects.length > 0
        ? subjects.reduce((sum, s) => sum + (Number(s.max_marks) || 100), 0)
        : 100;

    return results.map((r) => {
      let obtained = 0;
      if (r.grandTotal !== undefined && r.grandTotal !== null) {
        obtained = Number(r.grandTotal);
      } else if (r.total_marks_obtained !== undefined && r.total_marks_obtained !== null) {
        obtained = Number(r.total_marks_obtained);
      } else if (r.subjectTotals) {
        obtained = Object.values(r.subjectTotals).reduce(
          (sum, st) => sum + (parseFloat(st?.total_marks) || 0),
          0
        );
      }

      const maxMarks = Number(r.maxMarks || totalSubjectMax || 100);
      const percentage = maxMarks > 0 ? Number(((obtained / maxMarks) * 100).toFixed(1)) : 0;
      const isPass = r.result_status === 'Pass' || percentage >= 33;

      return {
        ...r,
        computedObtained: obtained,
        computedMaxMarks: maxMarks,
        computedPercentage: percentage,
        computedIsPass: isPass,
      };
    });
  }, [results, subjects]);

  const filteredResults = useMemo(() => {
    if (!searchTerm.trim()) return computedResults;
    const term = searchTerm.toLowerCase();
    return computedResults.filter(
      (r) =>
        (r.first_name && r.first_name.toLowerCase().includes(term)) ||
        (r.last_name && r.last_name.toLowerCase().includes(term)) ||
        (r.admission_no && r.admission_no.toLowerCase().includes(term)) ||
        (r.class_name && r.class_name.toLowerCase().includes(term)) ||
        (r.section_name && r.section_name.toLowerCase().includes(term))
    );
  }, [computedResults, searchTerm]);

  const totalPages = Math.ceil(filteredResults.length / pageSize) || 1;
  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredResults.slice(start, start + pageSize);
  }, [filteredResults, currentPage, pageSize]);

  const handlePrint = () => {
    window.print();
  };

  const exportExcel = () => {
    if (filteredResults.length === 0) {
      toast.info('No results to export');
      return;
    }

    let csv = `Sl No,Admission No,Student Name,Class,Section,${subjects.map((s) => s.subject_name).join(',')},Total Marks\n`;
    filteredResults.forEach((r, idx) => {
      const marksCols = subjects
        .map((s) => {
          const val = r.subjectTotals?.[s.subject_id];
          return val !== undefined ? val.total_marks : '-';
        })
        .join(',');
      csv += `"${idx + 1}","${r.admission_no || ''}","${r.first_name} ${r.last_name || ''}","${r.class_name || ''}","${r.section_name || ''}",${marksCols},"${r.computedObtained} / ${r.computedMaxMarks}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Exam_Results_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-4">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Exam Results</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to={`${basePath}/dashboard`}>Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Examinations</li>
              <li className="breadcrumb-item active" aria-current="page">
                Exam Results
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline-light bg-white btn-icon shadow-2xs"
            onClick={handleSearch}
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
            to={`${basePath}/examinations/results/add${
              selectedExam && selectedClass
                ? `?exam_id=${btoa(String(selectedExam))}&class_id=${btoa(String(selectedClass))}&academic_year_id=${btoa(String(selectedYear))}${
                    selectedSection ? `&section_id=${btoa(String(selectedSection))}` : ''
                  }`
                : ''
            }`}
            className="btn btn-primary d-flex align-items-center"
          >
            <i className="ti ti-square-rounded-plus me-2"></i>Add / Manage Marks
          </Link>
        </div>
      </div>

      {/* Filter Card */}
      <div className="bg-white p-3 border rounded-3 d-flex align-items-center justify-content-between flex-wrap mb-4 shadow-2xs">
        <form onSubmit={handleSearch} className="w-100">
          <div className="row g-3 align-items-end w-100">
            <div className="col-12 col-sm-6 col-md-3">
              <label className="form-label fw-semibold fs-13 mb-1">
                Academic Year <strong className="text-danger">*</strong>
              </label>
              <select
                className="form-select form-select-sm"
                required
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                <option value="">Select Year</option>
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
                onChange={(e) => setSelectedExam(e.target.value)}
              >
                <option value="">Select Exam</option>
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.exam_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-sm-6 col-md-2">
              <label className="form-label fw-semibold fs-13 mb-1">Class</label>
              <select
                className="form-select form-select-sm"
                value={selectedClass}
                onChange={handleClassChange}
              >
                <option value="">All Classes</option>
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
                    <i className="ti ti-search me-1"></i>Search Results
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Main Table Card */}
      <div className="datatable-card shadow-2xs border rounded-3 bg-white">
        <div className="datatable-card-header d-flex align-items-center justify-content-between flex-wrap gap-2 p-3 border-bottom">
          <div>
            <h5 className="mb-0 fw-bold text-dark fs-16">Examination Results Matrix</h5>
            <p className="text-muted fs-13 mb-0 mt-1">
              Consolidated scores, subject-wise marks, and grand totals per student.
            </p>
          </div>
          <div className="d-flex align-items-center gap-2">
            <div className="datatable-search-box position-relative">
              <i className="ti ti-search datatable-search-icon position-absolute top-50 translate-middle-y ms-2 text-muted"></i>
              <input
                type="text"
                className="form-control form-control-sm ps-4"
                placeholder="Search student..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        </div>

        <div className="datatable-wrapper">
          {initialLoading || loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status"></div>
              <p className="mt-2 text-muted">Loading exam results...</p>
            </div>
          ) : filteredResults.length === 0 ? (
            <NoData
              title="No Exam Results Found"
              message="Please select criteria and click Search to load exam score records."
              imageHeight={120}
              py={4}
            />
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '60px', textAlign: 'center' }}>#</th>
                    <th style={{ minWidth: '130px' }}>Admission No</th>
                    <th style={{ minWidth: '220px' }}>Student Name</th>
                    <th style={{ minWidth: '120px', textAlign: 'center' }}>Class & Sec</th>
                    {subjects.map((sub) => (
                      <th
                        key={sub.subject_id}
                        style={{ minWidth: '120px', textAlign: 'center' }}
                        className="text-nowrap"
                      >
                        <div className="fw-semibold text-dark">{sub.subject_name}</div>
                        <span className="text-muted fs-11 fw-normal d-block">
                          Max: {sub.max_marks || 100}
                        </span>
                      </th>
                    ))}
                    <th style={{ minWidth: '140px', textAlign: 'center' }}>Total Marks</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedResults.map((row, idx) => (
                    <tr key={row.id || idx}>
                      <td style={{ textAlign: 'center' }}>
                        <span className="text-muted fw-medium fs-13">
                          {(currentPage - 1) * pageSize + idx + 1}
                        </span>
                      </td>
                      <td>
                        <span className="fw-semibold text-primary fs-13">
                          {row.admission_no || 'N/A'}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="avatar avatar-sm me-2 flex-shrink-0">
                            <img
                              src="/vidya_assets/images/male-user.png"
                              className="rounded-circle"
                              style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                              alt="student"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://portal.growvidya.in/dev/vidya_assets/images/male-user.png';
                              }}
                            />
                          </div>
                          <div>
                            <p className="text-dark fw-semibold mb-0 fs-13">
                              {row.first_name} {row.last_name || ''}
                            </p>
                            <span className="text-muted fs-11">
                              Roll No: {row.roll_no || '—'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge bg-light text-dark border px-2 py-1 fs-12">
                          {row.class_name || '—'} {row.section_name ? `(${row.section_name})` : ''}
                        </span>
                      </td>

                      {subjects.map((sub) => {
                        const subResult = row.subjectTotals?.[sub.subject_id];
                        return (
                          <td key={sub.subject_id} style={{ textAlign: 'center' }}>
                            {subResult !== undefined ? (
                              <div className="d-inline-flex flex-column align-items-center">
                                <span className="fw-bold text-dark fs-13">
                                  {subResult.total_marks}
                                </span>
                                {subResult.grade_name && (
                                  <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-1.5 py-0 fs-10 mt-0.5">
                                    {subResult.grade_name}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted fs-13">—</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Total Marks */}
                      <td style={{ textAlign: 'center' }}>
                        <div className="d-inline-flex align-items-baseline">
                          <span className="fw-bold text-dark fs-14">
                            {row.computedObtained}
                          </span>
                          <span className="text-muted fs-12 ms-1">/ {row.computedMaxMarks}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        {filteredResults.length > 0 && (
          <div className="datatable-footer d-flex align-items-center justify-content-between flex-wrap gap-2 p-3 border-top">
            <div className="datatable-info text-muted fs-13">
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, filteredResults.length)} of{' '}
              {filteredResults.length} entries
            </div>

            <div className="datatable-pagination d-flex align-items-center gap-1">
              <button
                className="btn btn-sm btn-light px-2"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                <i className="ti ti-chevron-left"></i>
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`btn btn-sm px-2.5 ${currentPage === p ? 'btn-primary' : 'btn-light'}`}
                  onClick={() => setCurrentPage(p)}
                >
                  {p}
                </button>
              ))}

              <button
                className="btn btn-sm btn-light px-2"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                <i className="ti ti-chevron-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamResultsList;
