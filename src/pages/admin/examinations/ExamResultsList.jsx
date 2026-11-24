import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import adminExaminationApi from '../../../api/adminExamination.api';
import adminAcademicApi from '../../../api/adminAcademic.api';
import TableActionMenu from '../../../components/common/TableActionMenu';
import NoData from '../../../components/common/NoData';
import { resolveImageUrl, maleUserDefault } from '../../../utils/url.util';
import { confirmAction } from '../../../utils/confirmModal';
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
    } catch {
      // ignore invalid base64
    }
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
  const [updatingId, setUpdatingId] = useState(null);

  // Datatable Search & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchSectionsForClass = async (classId) => {
    if (!classId) {
      setSections([]);
      return;
    }
    try {
      const activeBranchId = localStorage.getItem('active_branch_id');
      const branchParam =
        activeBranchId && activeBranchId !== 'all' ? { branch_id: activeBranchId } : {};
      const res = await adminAcademicApi.fetchSectionsApi({
        class_id: classId,
        status: 1,
        ...branchParam,
      });
      const secList = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.sections)
        ? res.data.sections
        : Array.isArray(res)
        ? res
        : [];
      setSections(sortSectionsDesc(secList));
    } catch {
      setSections([]);
    }
  };

  const fetchResults = async (yearId, examId, classId, sectionId = selectedSection) => {
    if (!yearId || !examId) {
      toast.warning('Please select Academic Year and Exam.');
      return;
    }

    try {
      setLoading(true);
      const activeBranchId = localStorage.getItem('active_branch_id');
      const branchParam =
        activeBranchId && activeBranchId !== 'all' ? { branch_id: activeBranchId } : {};
      const res = await adminExaminationApi.getExamResultsList({
        academic_year_id: yearId,
        exam_id: examId,
        class_id: classId || undefined,
        section_id: sectionId || undefined,
        ...branchParam,
      });

      if (res?.data) {
        setSubjects(res.data.subjects || []);
        setResults(res.data.results || []);
        setCurrentPage(1);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to load exam results.');
      setSubjects([]);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const loadInitial = async () => {
      try {
        setInitialLoading(true);
        const activeBranchId = localStorage.getItem('active_branch_id');
        const branchParam =
          activeBranchId && activeBranchId !== 'all' ? { branch_id: activeBranchId } : {};
        const [exRes, clsRes, ayRes] = await Promise.all([
          adminExaminationApi.getAllExams({ status: 1, ...branchParam }),
          adminAcademicApi.getAllClasses({ status: 1, ...branchParam }),
          adminAcademicApi.getAllAcademicYears(),
        ]);
        if (!active) return;

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

        let defaultYear = queryYearId;
        let defaultExam = queryExamId;
        let defaultClass = queryClassId;

        if (!defaultYear && sortedYears.length > 0) {
          const currentYear =
            sortedYears.find(
              (ay) =>
                Number(ay.is_current) === 1 || String(ay.is_current) === '1' || ay.isCurrent
            ) || sortedYears[0];
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
          await fetchResults(defaultYear, defaultExam, defaultClass, querySectionId || '');
        }
      } catch {
        if (active) toast.error('Failed to load initial filters.');
      } finally {
        if (active) setInitialLoading(false);
      }
    };

    loadInitial();
    const handleBranchChange = () => {
      loadInitial();
    };
    window.addEventListener('branch_changed', handleBranchChange);
    return () => {
      active = false;
      window.removeEventListener('branch_changed', handleBranchChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleSearch = (e) => {
    e?.preventDefault?.();
    fetchResults(selectedYear, selectedExam, selectedClass, selectedSection);
  };

  const handleManualResultStatusChange = async (row, nextStatusValue) => {
    const numericNext = Number(nextStatusValue) || 0;
    const currentStatus = Number(row.computedResultStatus) || 0;
    if (currentStatus === numericNext) return;

    const confirmed = await confirmAction({
      title: 'Confirm Result Status',
      message: 'Are you sure you want to update the result status for this student?',
      confirmText: 'Yes, Update',
      cancelText: 'Cancel',
      variant: 'primary',
    });

    if (!confirmed) return;

    try {
      setUpdatingId(row.id);
      await adminExaminationApi.updateExamResultStatus(row.id, {
        result_status: numericNext,
      });

      setResults((prev) =>
        prev.map((item) =>
          item.id === row.id ? { ...item, result_status: numericNext } : item
        )
      );
      toast.success('Student result status updated successfully.');
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Unable to update result status.');
    } finally {
      setUpdatingId(null);
    }
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
      } else if (r.total_marks !== undefined && r.total_marks !== null) {
        obtained = Number(r.total_marks);
      } else if (r.subjectTotals) {
        obtained = Object.values(r.subjectTotals).reduce(
          (sum, st) => sum + (parseFloat(st?.total_marks) || 0),
          0
        );
      }

      const maxMarks = Number(r.maxMarks || r.max_marks || totalSubjectMax || 100);
      const percentage =
        r.percentage !== undefined &&
        r.percentage !== null &&
        Number(r.max_marks || r.maxMarks) > 0
          ? Number(parseFloat(r.percentage).toFixed(1))
          : maxMarks > 0
          ? Number(((obtained / maxMarks) * 100).toFixed(1))
          : 0;

      // Strict numeric result status: 1 = Pass, 2 = Fail, 0 = Pending
      const numStatus = Number(r.result_status);
      const resultStatus = numStatus === 1 ? 1 : numStatus === 2 ? 2 : 0;
      const isPass = resultStatus === 1;

      return {
        ...r,
        computedObtained: obtained,
        computedMaxMarks: maxMarks,
        computedPercentage: percentage,
        computedResultStatus: resultStatus,
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

  const exportExcel = () => {
    if (filteredResults.length === 0) {
      toast.info('No results to export');
      return;
    }

    let csv = `Sl No,Admission No,Student Name,Class,Section,${subjects
      .map((s) => s.subject_name)
      .join(',')},Total Marks,Percentage,Grade,Result\n`;
    filteredResults.forEach((r, idx) => {
      const marksCols = subjects
        .map((s) => {
          const val = r.subjectTotals?.[s.subject_id];
          return val !== undefined ? val.total_marks : '-';
        })
        .join(',');
      const statusLabel =
        r.computedResultStatus === 1
          ? 'Pass'
          : r.computedResultStatus === 2
          ? 'Fail'
          : 'Pending';
      csv += `"${idx + 1}","${r.admission_no || ''}","${r.first_name} ${r.last_name || ''}","${
        r.class_name || ''
      }","${r.section_name || ''}",${marksCols},"${r.computedObtained} / ${
        r.computedMaxMarks
      }","${r.computedPercentage}%","${r.grade_name || '-'}","${statusLabel}"\n`;
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

          <TableActionMenu
            trigger={
              <span className="btn btn-light fw-medium d-inline-flex align-items-center">
                <i className="ti ti-file-export me-2"></i>Export
              </span>
            }
            items={[
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
                ? `?exam_id=${btoa(String(selectedExam))}&class_id=${btoa(
                    String(selectedClass)
                  )}&academic_year_id=${btoa(String(selectedYear))}${
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
              <button
                className="btn btn-outline-primary btn-sm w-100"
                type="submit"
                disabled={loading}
              >
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
                    <th style={{ width: '55px', textAlign: 'center' }}>#</th>
                    <th style={{ minWidth: '125px' }}>Admission No</th>
                    <th style={{ minWidth: '210px' }}>Student Name</th>
                    <th style={{ minWidth: '115px', textAlign: 'center' }}>Class &amp; Sec</th>
                    {subjects.map((sub) => (
                      <th
                        key={sub.subject_id}
                        style={{ minWidth: '115px', textAlign: 'center' }}
                        className="text-nowrap"
                      >
                        <div className="fw-semibold text-dark">{sub.subject_name}</div>
                        <span className="text-muted fs-11 fw-normal d-block">
                          Max: {sub.max_marks || 100}
                        </span>
                      </th>
                    ))}
                    <th style={{ minWidth: '135px', textAlign: 'center' }}>Total Marks</th>
                    <th style={{ minWidth: '105px', textAlign: 'center' }}>Percentage</th>
                    <th style={{ minWidth: '90px', textAlign: 'center' }}>Grade</th>
                    <th style={{ minWidth: '140px', textAlign: 'center' }}>Result</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedResults.map((row, idx) => {
                    const isPass = row.computedResultStatus === 1;
                    const isFail = row.computedResultStatus === 2;
                    const dotColor = isPass ? '#16a34a' : isFail ? '#dc2626' : '#f59e0b';
                    const textColor = isPass ? '#15803d' : isFail ? '#b91c1c' : '#475569';
                    const borderColor = isPass
                      ? '#bbf7d0'
                      : isFail
                      ? '#fecaca'
                      : '#e2e8f0';

                    return (
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
                                src={resolveImageUrl(row.picture, maleUserDefault)}
                                className="rounded-circle"
                                style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                                alt="student"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = maleUserDefault;
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
                            {row.class_name || '—'}{' '}
                            {row.section_name ? `(${row.section_name})` : ''}
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
                            <span className="text-muted fs-12 ms-1">
                              / {row.computedMaxMarks}
                            </span>
                          </div>
                        </td>

                        {/* Percentage */}
                        <td style={{ textAlign: 'center' }}>
                          <span className="fw-semibold text-dark fs-13">
                            {row.computedPercentage}%
                          </span>
                        </td>

                        {/* Overall Grade */}
                        <td style={{ textAlign: 'center' }}>
                          {row.grade_name ? (
                            <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1 fs-12 fw-semibold">
                              {row.grade_name}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>

                        {/* Clean Manual Result Pill Select */}
                        <td style={{ textAlign: 'center' }}>
                          <div
                            className="d-inline-flex align-items-center position-relative bg-white"
                            style={{
                              border: `1px solid ${borderColor}`,
                              borderRadius: '6px',
                              width: '112px',
                              height: '30px',
                              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                            }}
                          >
                            <span
                              style={{
                                width: '7px',
                                height: '7px',
                                borderRadius: '50%',
                                backgroundColor: dotColor,
                                position: 'absolute',
                                left: '10px',
                                pointerEvents: 'none',
                              }}
                            />
                            <select
                              className="form-select form-select-sm border-0 bg-transparent shadow-none"
                              style={{
                                paddingLeft: '24px',
                                paddingRight: '24px',
                                paddingTop: '2px',
                                paddingBottom: '2px',
                                height: '100%',
                                fontSize: '12.5px',
                                fontWeight: 600,
                                color: textColor,
                                cursor: updatingId === row.id ? 'wait' : 'pointer',
                              }}
                              value={row.computedResultStatus}
                              disabled={updatingId === row.id}
                              onChange={(e) =>
                                handleManualResultStatusChange(row, Number(e.target.value))
                              }
                            >
                              <option value={0} className="text-dark bg-white">
                                Pending
                              </option>
                              <option value={1} className="text-dark bg-white">
                                Pass
                              </option>
                              <option value={2} className="text-dark bg-white">
                                Fail
                              </option>
                            </select>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
