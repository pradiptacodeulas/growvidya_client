import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import apiClient from '../../../api/axios.config';
import adminExaminationApi from '../../../api/adminExamination.api';
import Avatar from '../../../components/common/Avatar';
import NoData from '../../../components/common/NoData';
import { confirmAction } from '../../../utils/confirmModal';

const GenerateMarksheet = () => {
  const { teacher, isAuthenticated: isTeacherAuth } = useSelector((state) => state.teacherAuth);
  const isTeacher = Boolean(
    (typeof window !== 'undefined' && window.location.pathname.startsWith('/teacher')) ||
      (isTeacherAuth && teacher)
  );
  const basePath = isTeacher ? '/teacher' : '/admin';

  const [academicYears, setAcademicYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);

  const [selectedYear, setSelectedYear] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');

  const [students, setStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const loadSections = async (classId) => {
    if (!classId) {
      setSections([]);
      setSelectedSection('');
      return;
    }
    try {
      const res = await apiClient.get('/admin/academics/sections', {
        params: { classId, activeOnly: true },
      });
      const list = (Array.isArray(res.data?.data) ? res.data.data : []).filter(
        (s) => Number(s.status) === 1
      );
      setSections(list);
    } catch {
      setSections([]);
    }
  };

  useEffect(() => {
    let active = true;
    const loadMasters = async () => {
      try {
        const [yearsRes, classesRes] = await Promise.all([
          apiClient.get('/admin/academics/years'),
          apiClient.get('/admin/academics/classes', { params: { activeOnly: true } }),
        ]);
        if (!active) return;

        const years = (Array.isArray(yearsRes.data?.data) ? yearsRes.data.data : []).filter(
          (y) => Number(y.status) === 1
        );
        const clsList = (Array.isArray(classesRes.data?.data) ? classesRes.data.data : []).filter(
          (c) => Number(c.status) === 1
        );

        setAcademicYears(years);
        setClasses(clsList);

        const currentYear = years.find((y) => Number(y.is_current) === 1);
        if (currentYear) {
          setSelectedYear(String(currentYear.id));
        }
      } catch {
        if (active) toast.error('Unable to load academic years and classes.');
      }
    };

    loadMasters();
    const handleBranchChange = () => {
      setStudents([]);
      setSelectedStudentIds([]);
      setHasSearched(false);
      loadMasters();
    };
    window.addEventListener('branch_changed', handleBranchChange);
    return () => {
      active = false;
      window.removeEventListener('branch_changed', handleBranchChange);
    };
  }, []);

  const handleClassChange = async (classId) => {
    setSelectedClass(classId);
    setSelectedSection('');
    await loadSections(classId);
  };

  const handleFetchStudents = async (e) => {
    if (e) e.preventDefault();
    if (!selectedYear || !selectedClass) {
      return toast.warning('Please select Academic Year and Class.');
    }

    try {
      setLoading(true);
      setHasSearched(true);
      const res = await adminExaminationApi.getMarksheetStudents({
        academicYearId: selectedYear,
        classId: selectedClass,
        sectionId: selectedSection || undefined,
        page: 1,
        limit: 500,
      });

      const list = res?.data?.students || res?.students || [];
      setStudents(list);

      // Default select only passed students (result_status === 1) whose marksheet is not yet generated (is_marksheet_generated !== 1)
      const defaultSelected = list
        .filter(
          (s) => Number(s.result_status) === 1 && Number(s.is_marksheet_generated) !== 1
        )
        .map((s) => s.id);

      setSelectedStudentIds(defaultSelected);
    } catch {
      toast.error('Unable to load student records for the selected class.');
      setStudents([]);
      setSelectedStudentIds([]);
    } finally {
      setLoading(false);
    }
  };

  // Only students with numeric result_status === 1 (Pass) AND is_marksheet_generated !== 1 are eligible
  const eligiblePassStudents = useMemo(
    () =>
      students.filter(
        (s) => Number(s.result_status) === 1 && Number(s.is_marksheet_generated) !== 1
      ),
    [students]
  );

  const isAllEligibleSelected =
    eligiblePassStudents.length > 0 &&
    eligiblePassStudents.every((s) => selectedStudentIds.includes(s.id));

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedStudentIds(eligiblePassStudents.map((s) => s.id));
    } else {
      setSelectedStudentIds([]);
    }
  };

  const handleSelectStudent = (student) => {
    if (Number(student.result_status) !== 1 || Number(student.is_marksheet_generated) === 1) {
      return;
    }
    setSelectedStudentIds((prev) =>
      prev.includes(student.id)
        ? prev.filter((id) => id !== student.id)
        : [...prev, student.id]
    );
  };

  const handleGenerateMarksheets = async () => {
    if (!selectedYear || !selectedClass) {
      return toast.warning('Please select Academic Year and Class.');
    }

    // Strictly filter to only passed students (result_status === 1) whose marksheet is not yet generated
    const passedSelectedIds = selectedStudentIds.filter((id) =>
      eligiblePassStudents.some((s) => s.id === id)
    );

    if (passedSelectedIds.length === 0) {
      const hasAlreadyGeneratedPass = students.some(
        (s) => Number(s.result_status) === 1 && Number(s.is_marksheet_generated) === 1
      );
      if (eligiblePassStudents.length === 0 && hasAlreadyGeneratedPass) {
        return toast.warning(
          'Marksheets have already been generated for all passed students in this class.'
        );
      }
      return toast.warning(
        'Please select at least one passed student whose marksheet is not yet generated.'
      );
    }

    const confirmed = await confirmAction({
      title: 'Confirm Marksheet Generation',
      message: 'Are you sure you want to generate marksheets for the selected students?',
      confirmText: 'Yes, Generate',
      cancelText: 'Cancel',
      variant: 'primary',
    });

    if (!confirmed) return;

    try {
      setGenerating(true);
      const res = await adminExaminationApi.generateMarksheets({
        academicYearId: Number(selectedYear),
        classId: Number(selectedClass),
        studentIds: passedSelectedIds,
      });

      toast.success(res?.message || 'Marksheets generated successfully.');
      await handleFetchStudents();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || err?.message || 'Unable to generate marksheets.'
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Generate Marksheet</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to={`${basePath}/dashboard`}>Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Examinations</li>
              <li className="breadcrumb-item active" aria-current="page">
                Generate Marksheet
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          <Link
            to={`${basePath}/examinations/results`}
            className="btn btn-outline-light bg-white text-dark"
          >
            <i className="ti ti-arrow-left me-2"></i>Back to Exam Results
          </Link>
        </div>
      </div>

      {/* Filter Card */}
      <div className="card mb-4">
        <div className="card-header bg-light">
          <h5 className="mb-0 text-dark fw-bold">Select Class Criteria</h5>
        </div>
        <div className="card-body">
          <form onSubmit={handleFetchStudents}>
            <div className="row g-3 align-items-end">
              <div className="col-md-4">
                <label className="form-label fw-semibold">
                  Academic Year <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  required
                >
                  <option value="">Select Academic Year</option>
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.academic_year || y.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-4">
                <label className="form-label fw-semibold">
                  Class <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select"
                  value={selectedClass}
                  onChange={(e) => handleClassChange(e.target.value)}
                  required
                >
                  <option value="">Select Class</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.class_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-4">
                <label className="form-label fw-semibold">Section</label>
                <select
                  className="form-select"
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                >
                  <option value="">All Sections</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.section_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-12 text-end mt-3">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || generating}
                >
                  <i className="ti ti-search me-2"></i>
                  {loading ? 'Loading...' : 'Get Students'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Students Table */}
      {hasSearched && (
        <div className="card">
          <div className="card-header bg-white border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div>
              <h5 className="mb-0 fw-bold">
                Students List ({selectedStudentIds.length} of {eligiblePassStudents.length} Eligible
                Passed selected)
              </h5>
              <span className="text-muted small">
                Only passed students whose marksheet has not yet been generated can be selected.
              </span>
            </div>

            {students.length > 0 && (
              <button
                type="button"
                className="btn btn-success btn-sm d-flex align-items-center px-3"
                style={{ height: '34px' }}
                onClick={handleGenerateMarksheets}
                disabled={generating}
              >
                <i className="ti ti-file-certificate me-1"></i>
                {generating ? 'Generating...' : 'Generate Marksheet'}
              </button>
            )}
          </div>

          <div className="card-body p-0">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status"></div>
              </div>
            ) : students.length === 0 ? (
              <NoData
                title="No Students Found"
                message="No student records found for the selected academic year and class."
                imageHeight={110}
                py={4}
              />
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: '48px' }} className="text-center">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={isAllEligibleSelected}
                          disabled={eligiblePassStudents.length === 0}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th>Roll No</th>
                      <th>Admission No</th>
                      <th>Student Name</th>
                      <th>Class &amp; Section</th>
                      <th className="text-center">Total Marks</th>
                      <th className="text-center">Percentage</th>
                      <th className="text-center">Result Status</th>
                      <th className="text-center">Marksheet Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => {
                      const hasMarks = Number(student.has_marksheet) === 1;
                      const resCode = Number(student.result_status) || 0;
                      const isPassed = resCode === 1;
                      const isFailed = resCode === 2;
                      const isGenerated = Number(student.is_marksheet_generated) === 1;
                      const isSelected = selectedStudentIds.includes(student.id);
                      const fullName = `${student.first_name || ''} ${student.last_name || ''}`.trim();

                      return (
                        <tr key={student.id}>
                          <td className="text-center">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={isSelected && !isGenerated}
                              disabled={!isPassed || isGenerated}
                              onChange={() => handleSelectStudent(student)}
                            />
                          </td>
                          <td>
                            <span className="fw-medium">{student.roll_number || '—'}</span>
                          </td>
                          <td>
                            <span className="fw-semibold text-primary">
                              {student.admission_number || '—'}
                            </span>
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <Avatar
                                src={student.picture}
                                name={fullName}
                                size={34}
                                rounded={true}
                              />
                              <span className="fw-medium text-dark">{fullName}</span>
                            </div>
                          </td>
                          <td>
                            {student.class_name || '—'}{' '}
                            {student.section_name ? `(${student.section_name})` : ''}
                          </td>
                          <td className="text-center">
                            {hasMarks && Number(student.max_marks) > 0 ? (
                              <span className="fw-semibold text-dark">
                                {Number(student.total_marks || 0)} /{' '}
                                {Number(student.max_marks || 0)}
                              </span>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td className="text-center">
                            {hasMarks && Number(student.max_marks) > 0 ? (
                              <span className="fw-semibold text-dark">
                                {Number(student.percentage || 0)}%
                              </span>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td className="text-center">
                            {!hasMarks ? (
                              <span className="text-muted">—</span>
                            ) : isPassed ? (
                              <span className="badge badge-soft-success d-inline-flex align-items-center">
                                <i className="ti ti-circle-filled fs-5 me-1"></i>Pass
                              </span>
                            ) : isFailed ? (
                              <span className="badge badge-soft-danger d-inline-flex align-items-center">
                                <i className="ti ti-circle-filled fs-5 me-1"></i>Fail
                              </span>
                            ) : (
                              <span className="badge bg-warning-subtle text-dark border">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="text-center">
                            {isPassed && isGenerated ? (
                              <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 fw-semibold">
                                Generated
                              </span>
                            ) : (
                              <span className="badge bg-light text-muted border px-2 py-1">
                                Not Generated
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GenerateMarksheet;
