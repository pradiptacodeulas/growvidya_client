import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminExaminationApi from '../../../api/adminExamination.api';
import adminAcademicApi from '../../../api/adminAcademic.api';

const AddExamAttendance = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const queryExamId = searchParams.get('exam_id') || '';
  const queryClassId = searchParams.get('class_id') || '';
  const querySubjectId = searchParams.get('subject_id') || '';

  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);

  // Form State
  const [selectedExamId, setSelectedExamId] = useState(queryExamId);
  const [selectedClassId, setSelectedClassId] = useState(queryClassId);
  const [selectedSubjectId, setSelectedSubjectId] = useState(querySubjectId);

  // Student Attendance Rows
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    fetchInitialOptions();
  }, []);

  const fetchInitialOptions = async () => {
    try {
      setInitialLoading(true);
      const [exRes, clsRes] = await Promise.all([
        adminExaminationApi.getAllExams({ status: 1 }),
        adminAcademicApi.getAllClasses({ status: 1 }),
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

      setExams(examsList);
      setClasses(classesList);

      const targetExam = queryExamId || (examsList.length > 0 ? examsList[0].id : '');
      const targetClass = queryClassId || (classesList.length > 0 ? classesList[0].id : '');

      setSelectedExamId(targetExam);
      setSelectedClassId(targetClass);

      if (targetClass) {
        await loadSubjectsForClass(targetClass, querySubjectId);
      }
    } catch (err) {
      console.error('Failed to load initial options:', err);
      toast.error('Failed to load filter options');
    } finally {
      setInitialLoading(false);
    }
  };

  const loadSubjectsForClass = async (classId, preselectSubId = '') => {
    if (!classId) {
      setSubjects([]);
      setSelectedSubjectId('');
      return;
    }

    try {
      const configRes = await adminExaminationApi.getExamSubjectConfig({
        exam_id: selectedExamId || 1,
        class_id: classId,
      });

      const subs = configRes?.data?.subjects || [];
      setSubjects(subs);

      const targetSubject = preselectSubId || (subs.length > 0 ? subs[0].subject_id : '');
      setSelectedSubjectId(targetSubject);

      if (selectedExamId && classId && targetSubject) {
        fetchStudentsList(selectedExamId, classId, targetSubject);
      }
    } catch (err) {
      console.error('Failed to load subjects for class:', err);
    }
  };

  const handleClassChange = async (e) => {
    const classId = e.target.value;
    setSelectedClassId(classId);
    setStudents([]);
    setHasSearched(false);
    if (classId) {
      await loadSubjectsForClass(classId);
    } else {
      setSubjects([]);
      setSelectedSubjectId('');
    }
  };

  const fetchStudentsList = async (examId, classId, subjectId) => {
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
      });

      const studentList = res?.data?.students || [];
      const formatted = studentList.map((st) => {
        const existingStatus = st.subjectAttendance?.[subjectId];
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
    setStudents((prev) =>
      prev.map((s) =>
        s.student_id === studentId ? { ...s, attendanceStatus: statusVal } : s
      )
    );
  };

  const handleMarkAll = (statusVal) => {
    setStudents((prev) =>
      prev.map((s) => ({
        ...s,
        attendanceStatus: statusVal,
      }))
    );
  };

  const handleSubmitAttendance = async (e) => {
    e.preventDefault();

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
        exam_id: parseInt(selectedExamId, 10),
        class_id: parseInt(selectedClassId, 10),
        subject_id: parseInt(selectedSubjectId, 10),
        records,
      });

      toast.success('Exam attendance saved successfully!');
      navigate(
        `/admin/examinations/attendance?exam_id=${selectedExamId}&class_id=${selectedClassId}`
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
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/examinations/attendance">Exam Attendance</Link>
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
              <div className="col-md-3">
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
                    onChange={(e) => setSelectedExamId(e.target.value)}
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

              <div className="col-md-3">
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
                    <option value="">Select </option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.class_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="col-md-3">
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
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                  >
                    <option value="">Select </option>
                    {subjects.map((sub) => (
                      <option key={sub.subject_id} value={sub.subject_id}>
                        {sub.subject_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="col-md-3 d-flex align-items-center">
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
          {students.length > 0 && (
            <div className="d-flex justify-content-between align-items-center px-3 mb-3">
              <h5 className="mb-0">Students List ({students.length})</h5>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  onClick={() => handleMarkAll(1)}
                  className="btn btn-sm btn-outline-success"
                >
                  <i className="fa-solid fa-check me-1"></i> Mark All Present
                </button>
                <button
                  type="button"
                  onClick={() => handleMarkAll(2)}
                  className="btn btn-sm btn-outline-danger"
                >
                  <i className="fa-solid fa-xmark me-1"></i> Mark All Absent
                </button>
              </div>
            </div>
          )}

          <div className="custom-datatable-filter table-responsive">
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
                              checked={st.attendanceStatus === 2 || st.attendanceStatus === 0}
                              onChange={() => handleStatusChange(st.student_id, 2)}
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
                onClick={() => navigate('/admin/examinations/attendance')}
                className="btn btn-light me-3"
              >
                Cancel
              </button>
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddExamAttendance;
