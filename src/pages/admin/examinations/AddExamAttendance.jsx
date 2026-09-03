import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import adminExaminationApi from '../../../api/adminExamination.api';
import adminAcademicApi from '../../../api/adminAcademic.api';
import { encodeParam, decodeParam } from '../../../utils/idHelper';

const AddExamAttendance = () => {
  const { teacher, isAuthenticated: isTeacherAuth } = useSelector((state) => state.teacherAuth);
  const isTeacher = Boolean(
    (typeof window !== 'undefined' && window.location.pathname.startsWith('/teacher')) ||
    (isTeacherAuth && teacher)
  );
  const basePath = isTeacher ? '/teacher' : '/admin';

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const queryExamId = decodeParam(searchParams.get('exam_id'));
  const queryClassId = decodeParam(searchParams.get('class_id'));
  const querySubjectId = decodeParam(searchParams.get('subject_id'));
  const queryYearId = decodeParam(searchParams.get('academic_year_id'));
  const querySectionId = decodeParam(searchParams.get('section_id'));
  const queryScheduleId = decodeParam(searchParams.get('exam_schedule_id') || searchParams.get('schedule_id'));

  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  // Form State
  const [selectedYearId, setSelectedYearId] = useState(queryYearId);
  const [selectedExamId, setSelectedExamId] = useState(queryExamId);
  const [selectedClassId, setSelectedClassId] = useState(queryClassId);
  const [selectedSectionId, setSelectedSectionId] = useState(querySectionId);
  const [selectedSubjectId, setSelectedSubjectId] = useState(querySubjectId);

  // Student Attendance Rows
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    fetchInitialOptions();
  }, []);

  const fetchSectionsForClass = async (classId) => {
    if (!classId) {
      setSections([]);
      return;
    }
    try {
      const res = await adminAcademicApi.fetchSectionsApi(classId);
      const secList = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.sections)
        ? res.data.sections
        : Array.isArray(res)
        ? res
        : [];
      setSections(secList);
    } catch (err) {
      console.error('Failed to load sections:', err);
      setSections([]);
    }
  };

  const fetchInitialOptions = async () => {
    try {
      setInitialLoading(true);
      const [exRes, clsRes, yrRes] = await Promise.all([
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

      const yearsList = Array.isArray(yrRes?.data)
        ? yrRes.data
        : Array.isArray(yrRes?.data?.academicYears)
        ? yrRes.data.academicYears
        : Array.isArray(yrRes)
        ? yrRes
        : [];

      setExams(examsList);
      setClasses(classesList);
      setAcademicYears(yearsList);

      const targetYear =
        queryYearId ||
        (yearsList.find((y) => Number(y.is_current) === 1 || String(y.is_current) === '1' || y.isCurrent)?.id ||
          yearsList[0]?.id ||
          '');
      const targetExam = queryExamId || (examsList.length > 0 ? String(examsList[0].id) : '');
      const targetClass = queryClassId || (classesList.length > 0 ? String(classesList[0].id) : '');

      setSelectedYearId(targetYear ? String(targetYear) : '');
      setSelectedExamId(targetExam ? String(targetExam) : '');
      setSelectedClassId(targetClass ? String(targetClass) : '');

      if (targetClass) {
        await fetchSectionsForClass(targetClass);
        await loadSubjectsForClass(targetClass, querySubjectId, targetExam, querySectionId);
      }
    } catch (err) {
      console.error('Failed to load initial options:', err);
      toast.error('Failed to load filter options');
    } finally {
      setInitialLoading(false);
    }
  };

  const loadSubjectsForClass = async (classId, preselectSubId = '', examId = '', secId = '') => {
    if (!classId) {
      setSubjects([]);
      setSelectedSubjectId('');
      return;
    }

    try {
      const activeExam = examId || selectedExamId || 1;
      const configRes = await adminExaminationApi.getExamSubjectConfig({
        exam_id: activeExam,
        class_id: classId,
      });

      const subs = configRes?.data?.subjects || [];
      setSubjects(subs);

      const targetSubject = preselectSubId || (subs.length > 0 ? subs[0].subject_id : '');
      setSelectedSubjectId(targetSubject ? String(targetSubject) : '');

      if (activeExam && classId && targetSubject) {
        fetchStudentsList(activeExam, classId, targetSubject, secId !== undefined ? secId : selectedSectionId);
      }
    } catch (err) {
      console.error('Failed to load subjects for class:', err);
    }
  };

  const handleClassChange = async (e) => {
    const classId = e.target.value;
    setSelectedClassId(classId);
    setSelectedSectionId('');
    setStudents([]);
    setHasSearched(false);
    if (classId) {
      await fetchSectionsForClass(classId);
      await loadSubjectsForClass(classId, '', selectedExamId, '');
    } else {
      setSections([]);
      setSubjects([]);
      setSelectedSubjectId('');
    }
  };

  const fetchStudentsList = async (examId, classId, subjectId, sectionId = '') => {
    if (!examId || !classId || !subjectId) {
      toast.warning('Please select Exam, Class, and Subject.');
      return;
    }

    try {
      setLoading(true);
      setHasSearched(true);
      const res = await adminExaminationApi.getStudentsForExamAttendance({
        exam_id: examId,
        class_id: classId,
        subject_id: subjectId,
        section_id: sectionId || selectedSectionId || undefined,
        roster: 1,
      });

      const rawList = res?.data?.rawAttendance || [];
      // Only lock if attendance exists specifically for this subject
      const hasSubjectAttendance = Boolean(
        res?.data?.isLocked ||
        (res?.data?.hasAttendance && rawList.some((r) => String(r.subject_id) === String(subjectId)))
      );
      setIsLocked(hasSubjectAttendance);

      const studentList = res?.data?.students || [];
      const formatted = studentList.map((st) => {
        const existingStatus = st.subjectAttendance?.[subjectId] ?? st.attendance_status;
        return {
          ...st,
          attendanceStatus:
            existingStatus !== undefined && existingStatus !== null
              ? Number(existingStatus)
              : 1, // Default to Present (1)
        };
      });

      setStudents(formatted);
    } catch (err) {
      console.error('Failed to fetch students:', err);
      toast.error(err.message || 'Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStudentsList(selectedExamId, selectedClassId, selectedSubjectId);
  };

  const handleStatusChange = (studentId, statusVal) => {
    if (isLocked) return;
    setStudents((prev) =>
      prev.map((s) =>
        s.student_id === studentId ? { ...s, attendanceStatus: statusVal } : s
      )
    );
  };

  const handleMarkAll = (statusVal) => {
    if (isLocked) return;
    setStudents((prev) =>
      prev.map((s) => ({
        ...s,
        attendanceStatus: statusVal,
      }))
    );
  };

  const handleSubmitAttendance = async (e) => {
    e.preventDefault();

    if (isLocked) {
      toast.error('Exam attendance has already been submitted and cannot be edited or updated.');
      return;
    }

    if (!selectedExamId || !selectedClassId || !selectedSubjectId) {
      toast.warning('Please select Exam, Class, and Subject.');
      return;
    }

    if (students.length === 0) {
      toast.warning('No student records to save.');
      return;
    }

    try {
      setSaving(true);
      const records = students.map((s) => ({
        studentId: s.student_id,
        attendanceStatus: s.attendanceStatus,
      }));

      await adminExaminationApi.saveExamAttendanceBatch({
        academic_year_id: selectedYearId || undefined,
        exam_id: selectedExamId,
        class_id: selectedClassId,
        subject_id: selectedSubjectId,
        exam_schedule_id: queryScheduleId || undefined,
        records,
      });

      toast.success('Exam attendance saved successfully!');
      navigate(
        `${basePath}/examinations/attendance?exam_id=${encodeParam(selectedExamId)}&class_id=${encodeParam(selectedClassId)}`
      );
    } catch (err) {
      console.error('Failed to save attendance:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to save attendance.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Add Attendance</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to={`${basePath}/dashboard`}>Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to={`${basePath}/examinations/attendance`}>Exam Attendance</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Add Attendance
              </li>
            </ol>
          </nav>
        </div>
      </div>
      {/* /Page Header */}

      {/* Main Card */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap pb-0">
          <h4 className="mb-3">Add Exam Attendance</h4>
        </div>

        {/* Filter Section */}
        <div className="bg-white p-3 border rounded-1 d-flex align-items-center justify-content-between flex-wrap mb-4 pb-0">
          <form onSubmit={handleSearchSubmit} className="w-100">
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
                    value={selectedYearId}
                    onChange={(e) => setSelectedYearId(e.target.value)}
                  >
                    <option value="">Select Year</option>
                    {academicYears.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.name || y.academic_year || `Year ${y.id}`}
                        {y.is_current === 1 ? ' (Current)' : ''}
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
                    value={selectedExamId}
                    onChange={(e) => {
                      const newExamId = e.target.value;
                      setSelectedExamId(newExamId);
                      if (newExamId && selectedClassId && selectedSubjectId) {
                        fetchStudentsList(newExamId, selectedClassId, selectedSubjectId);
                      } else {
                        setStudents([]);
                        setIsLocked(false);
                      }
                    }}
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
                    Class <strong className="text-danger">*</strong>
                  </label>
                  <select
                    className="form-select select"
                    name="class_id"
                    id="class_id"
                    required
                    value={selectedClassId}
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
              </div>

              <div className="col-md-2">
                <div className="mb-3">
                  <label className="form-label" htmlFor="section_id">
                    Section
                  </label>
                  <select
                    className="form-select select"
                    name="section_id"
                    id="section_id"
                    value={selectedSectionId}
                    onChange={(e) => {
                      const newSecId = e.target.value;
                      setSelectedSectionId(newSecId);
                      if (selectedExamId && selectedClassId && selectedSubjectId) {
                        fetchStudentsList(selectedExamId, selectedClassId, selectedSubjectId, newSecId);
                      }
                    }}
                  >
                    <option value="">All Sections</option>
                    {sections.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.section_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="col-md-2">
                <div className="mb-3">
                  <label className="form-label" htmlFor="subject_id">
                    Subject <strong className="text-danger">*</strong>
                  </label>
                  <select
                    className="form-select select"
                    name="subject_id"
                    id="subject_id"
                    required
                    value={selectedSubjectId}
                    onChange={(e) => {
                      const newSubId = e.target.value;
                      setSelectedSubjectId(newSubId);
                      if (selectedExamId && selectedClassId && newSubId) {
                        fetchStudentsList(selectedExamId, selectedClassId, newSubId, selectedSectionId);
                      } else {
                        setStudents([]);
                        setIsLocked(false);
                      }
                    }}
                  >
                    <option value="">Select Subject</option>
                    {subjects.map((sub) => (
                      <option key={sub.subject_id} value={sub.subject_id}>
                        {sub.subject_name}
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

        {/* Student Attendance Form Table */}
        <div className="card-body p-0 py-3">
          {isLocked && (
            <div className="alert alert-warning border border-warning-subtle d-flex align-items-center mb-3 mx-3">
              <i className="ti ti-lock fs-20 me-2 text-warning"></i>
              <div>
                <strong>Attendance Locked:</strong> Exam attendance for this Exam, Class, and Subject has already been submitted and cannot be edited or updated further.
              </div>
            </div>
          )}

          {students.length > 0 && (
            <div className="d-flex justify-content-between align-items-center px-3 mb-3">
              <h5 className="mb-0">Students List ({students.length})</h5>
              {!isLocked && (
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleMarkAll(1)}
                    className="btn btn-sm btn-outline-success"
                    disabled={isLocked || saving}
                  >
                    <i className="fa-solid fa-check me-1"></i> Mark All Present
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMarkAll(2)}
                    className="btn btn-sm btn-outline-danger"
                    disabled={isLocked || saving}
                  >
                    <i className="fa-solid fa-xmark me-1"></i> Mark All Absent
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="table-responsive">
            <table className="table datatable dataTable" id="examTable">
              <thead className="thead-light">
                <tr>
                  <th className="text-center" style={{ width: '70px' }}>Sl No</th>
                  <th className="text-center" style={{ width: '150px' }}>Admission No</th>
                  <th className="text-center">Student Name</th>
                  <th className="text-center" style={{ width: '100px' }}>Class</th>
                  <th className="text-center" style={{ width: '220px' }}>Attendance</th>
                </tr>
              </thead>
              <tbody>
                {initialLoading || loading ? (
                  <tr>
                    <td colSpan="5" className="text-center py-4">
                      <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
                      Loading students...
                    </td>
                  </tr>
                ) : !hasSearched && students.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center text-muted py-4">
                      Please select Exam, Class, and Subject, then click Search.
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center text-muted py-4">
                      No students found for this class.
                    </td>
                  </tr>
                ) : (
                  students.map((st, idx) => (
                    <tr key={st.student_id}>
                      <td className="text-center">{idx + 1}</td>
                      <td className="text-center">{st.admission_no || '-'}</td>
                      <td className="text-center align-middle">
                        <div className="d-flex justify-content-center align-items-center">
                          <span className="avatar avatar-md">
                            <img
                              src="/vidya_assets/images/male-user.png"
                              className="img-fluid rounded-circle"
                              alt="user"
                            />
                          </span>
                          <div className="ms-2 text-start">
                            <p className="text-dark mb-0 fw-medium">
                              {st.first_name} {st.last_name || ''}
                            </p>
                            <span className="fs-12 text-muted">
                              Roll No : {st.roll_no || '-'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="text-center">{st.class_name || '-'}</td>
                      <td className="text-center">
                        <div className="d-flex justify-content-center gap-3">
                          <div className="form-check form-check-inline">
                            <input
                              className="form-check-input"
                              type="radio"
                              name={`attendance_${st.student_id}`}
                              id={`present_${st.student_id}`}
                              checked={st.attendanceStatus === 1}
                              disabled={isLocked}
                              onChange={() => handleStatusChange(st.student_id, 1)}
                            />
                            <label
                              className="form-check-label text-success fw-medium"
                              htmlFor={`present_${st.student_id}`}
                            >
                              Present
                            </label>
                          </div>
                          <div className="form-check form-check-inline">
                            <input
                              className="form-check-input"
                              type="radio"
                              name={`attendance_${st.student_id}`}
                              id={`absent_${st.student_id}`}
                              checked={st.attendanceStatus === 0}
                              disabled={isLocked}
                              onChange={() => handleStatusChange(st.student_id, 0)}
                            />
                            <label
                              className="form-check-label text-danger fw-medium"
                              htmlFor={`absent_${st.student_id}`}
                            >
                              Absent
                            </label>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {students.length > 0 && (
            <div className="text-end p-3">
              <button
                type="button"
                onClick={() => navigate(`${basePath}/examinations/attendance`)}
                className="btn btn-light me-3"
              >
                {isLocked ? 'Back' : 'Cancel'}
              </button>
              {isLocked ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled
                  title="Exam attendance is locked and cannot be edited or updated"
                >
                  <i className="ti ti-lock me-1"></i> Attendance Locked
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmitAttendance}
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Saving...
                    </>
                  ) : (
                    'Submit Attendance'
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddExamAttendance;
