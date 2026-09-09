import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import adminExaminationApi from '../../../api/adminExamination.api';
import adminAcademicApi from '../../../api/adminAcademic.api';
import { fetchTeacherClassesApi } from '../../../api/teacherAcademic.api';
import { encodeParam, decodeParam } from '../../../utils/idHelper';
import {
  sortAcademicYearsDesc,
  sortExamsDesc,
  sortClassesDesc,
  sortSubjectsDesc,
} from '../../../utils/dropdownSort.util';

const AddExamAttendance = () => {
  const { user } = useSelector((state) => state.auth || {});
  const { teacher, isAuthenticated: isTeacherAuth } = useSelector((state) => state.teacherAuth || {});
  const userRole = String(user?.roleName || user?.role_name || user?.role || '').toLowerCase();
  const isAdminPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
  const isTeacherPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/teacher');
  const isTeacher = !isAdminPath && Boolean(
    isTeacherPath ||
    (isTeacherAuth && teacher) ||
    userRole.includes('teacher')
  );
  const basePath = isTeacher ? '/teacher' : '/admin';

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const queryExamId = decodeParam(searchParams.get('exam_id'));
  const queryClassId = decodeParam(searchParams.get('class_id'));
  const querySubjectId = decodeParam(searchParams.get('subject_id'));
  const queryYearId = decodeParam(searchParams.get('academic_year_id'));
  const queryScheduleId = decodeParam(searchParams.get('exam_schedule_id') || searchParams.get('schedule_id'));

  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  // Form State
  const [selectedYearId, setSelectedYearId] = useState(queryYearId);
  const [selectedExamId, setSelectedExamId] = useState(queryExamId);
  const [selectedClassId, setSelectedClassId] = useState(queryClassId);
  const [selectedSubjectId, setSelectedSubjectId] = useState(querySubjectId);
  const [currentScheduleId, setCurrentScheduleId] = useState(queryScheduleId || '');
  const [examScheduleDate, setExamScheduleDate] = useState('');

  // Student Attendance Rows
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [hasRecordedAttendance, setHasRecordedAttendance] = useState(false);
  const [scheduleNotFound, setScheduleNotFound] = useState(false);
  const [isSubjectEditable, setIsSubjectEditable] = useState(true);

  const getExamDateStatus = () => {
    if (!examScheduleDate) return { isPassed: false, isFuture: false, isToday: true, dateStr: '' };
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    const dateStr = String(examScheduleDate).slice(0, 10);
    return {
      isPassed: todayStr > dateStr,
      isFuture: todayStr < dateStr,
      isToday: todayStr === dateStr,
      dateStr,
    };
  };

  const { isPassed: isExamDatePassed, isFuture: isExamDateFuture, dateStr: examDateDisplay } = getExamDateStatus();
  const isTeacherLocked = Boolean(isTeacher && isExamDatePassed);

  useEffect(() => {
    fetchInitialOptions();
  }, []);

  const fetchInitialOptions = async () => {
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
        : Array.isArray(yrRes)
        ? yrRes
        : [];

      const sortedExams = sortExamsDesc(examsList);
      const sortedClasses = sortClassesDesc(classesList);
      const sortedYears = sortAcademicYearsDesc(yearsList);

      setExams(sortedExams);
      setClasses(sortedClasses);
      setAcademicYears(sortedYears);

      let targetYear = queryYearId;
      if (!targetYear && queryExamId) {
        const matchedExam = sortedExams.find((ex) => String(ex.id) === String(queryExamId));
        if (matchedExam && matchedExam.academic_year) {
          targetYear = String(matchedExam.academic_year);
        }
      }
      if (!targetYear && sortedYears.length > 0) {
        const currentYear =
          sortedYears.find((y) => Number(y.is_current) === 1 || String(y.is_current) === '1' || y.isCurrent) ||
          sortedYears[0];
        targetYear = currentYear ? String(currentYear.id) : '';
      }

      const yearExams = targetYear
        ? sortedExams.filter((ex) => String(ex.academic_year) === String(targetYear))
        : sortedExams;

      let targetExam = queryExamId;
      if (!targetExam || !yearExams.some((ex) => String(ex.id) === String(targetExam))) {
        targetExam = yearExams.length > 0 ? String(yearExams[0].id) : (sortedExams.length > 0 ? String(sortedExams[0].id) : '');
      }
      const targetClass = queryClassId || (sortedClasses.length > 0 ? String(sortedClasses[0].id) : '');

      setSelectedYearId(targetYear ? String(targetYear) : '');
      setSelectedExamId(targetExam ? String(targetExam) : '');
      setSelectedClassId(targetClass ? String(targetClass) : '');

      if (targetClass && targetExam) {
        await loadSubjectsForClass(targetClass, querySubjectId, targetExam, targetYear);
      }
    } catch (err) {
      console.error('Failed to load initial options:', err);
      toast.error('Failed to load filter options');
    } finally {
      setInitialLoading(false);
    }
  };

  const loadSubjectsForClass = async (classId, preselectSubId = '', examId = '', yearId = '') => {
    if (!classId) {
      setSubjects([]);
      setSelectedSubjectId('');
      setCurrentScheduleId('');
      setScheduleNotFound(false);
      return;
    }

    try {
      const activeExam = examId || selectedExamId;
      if (!activeExam) {
        setSubjects([]);
        setSelectedSubjectId('');
        setCurrentScheduleId('');
        setScheduleNotFound(false);
        return;
      }

      const activeYear = yearId || selectedYearId;
      // Load scheduled subjects specifically for this exam, class, and academic year
      const schedRes = await adminExaminationApi.getExamSchedules({
        exam_id: activeExam,
        class_id: classId,
        academic_year_id: activeYear || undefined,
        assigned_only: isTeacher ? 1 : undefined,
      });

      const schedList = (schedRes?.data?.schedules || schedRes?.data || []).filter(Boolean);
      // For teachers, strictly filter schedules to only those assigned to this teacher
      const allowedSchedules = isTeacher
        ? schedList.filter((s) => s.isEditable !== false)
        : schedList;

      const uniqueSubsMap = new Map();
      allowedSchedules.forEach((s) => {
        if (s.subject_id && !uniqueSubsMap.has(s.subject_id)) {
          uniqueSubsMap.set(s.subject_id, {
            subject_id: s.subject_id,
            subject_name: s.subject_name || `Subject #${s.subject_id}`,
            schedule_id: s.id,
            date: s.date,
            isEditable: s.isEditable !== false,
          });
        }
      });

      const subs = sortSubjectsDesc(Array.from(uniqueSubsMap.values()));
      setSubjects(subs);

      if (subs.length === 0) {
        setSelectedSubjectId('');
        setCurrentScheduleId('');
        setIsSubjectEditable(true);
        setStudents([]);
        setHasRecordedAttendance(false);
        setScheduleNotFound(true);
        setHasSearched(true);
        return;
      }

      setScheduleNotFound(false);
      const matchedSub = preselectSubId ? subs.find((s) => String(s.subject_id) === String(preselectSubId)) : null;
      const targetSubObj = matchedSub || subs[0];
      const targetSubject = targetSubObj ? String(targetSubObj.subject_id) : '';
      setSelectedSubjectId(targetSubject);
      setCurrentScheduleId(targetSubObj?.schedule_id ? String(targetSubObj.schedule_id) : '');
      setIsSubjectEditable(targetSubObj ? targetSubObj.isEditable !== false : true);

      if (activeExam && classId && targetSubject) {
        fetchStudentsList(
          activeExam,
          classId,
          targetSubject,
          targetSubObj?.schedule_id
        );
      }
    } catch (err) {
      console.error('Failed to load scheduled subjects for class:', err);
      setSubjects([]);
      setScheduleNotFound(true);
    }
  };

  const handleExamChange = async (e) => {
    const newExamId = e.target.value;
    setSelectedExamId(newExamId);
    setSelectedSubjectId('');
    setCurrentScheduleId('');
    setIsSubjectEditable(true);
    setExamScheduleDate('');
    setStudents([]);
    setHasRecordedAttendance(false);
    setHasSearched(false);
    if (newExamId && selectedClassId) {
      await loadSubjectsForClass(selectedClassId, '', newExamId, selectedYearId);
    } else {
      setSubjects([]);
      setScheduleNotFound(false);
    }
  };

  const handleClassChange = async (e) => {
    const classId = e.target.value;
    setSelectedClassId(classId);
    setSelectedSubjectId('');
    setCurrentScheduleId('');
    setIsSubjectEditable(true);
    setExamScheduleDate('');
    setStudents([]);
    setHasRecordedAttendance(false);
    setHasSearched(false);
    if (classId) {
      if (selectedExamId) {
        await loadSubjectsForClass(classId, '', selectedExamId, selectedYearId);
      } else {
        setSubjects([]);
        setScheduleNotFound(false);
      }
    } else {
      setSubjects([]);
      setScheduleNotFound(false);
    }
  };

  const handleSubjectChange = (e) => {
    const newSubId = e.target.value;
    setSelectedSubjectId(newSubId);
    const matchedSub = subjects.find((s) => String(s.subject_id) === String(newSubId));
    const schedId = matchedSub ? matchedSub.schedule_id : '';
    const schedDate = matchedSub?.date || '';
    setCurrentScheduleId(schedId ? String(schedId) : '');
    setExamScheduleDate(schedDate);
    setIsSubjectEditable(matchedSub ? matchedSub.isEditable !== false : true);
    if (selectedExamId && selectedClassId && newSubId) {
      fetchStudentsList(selectedExamId, selectedClassId, newSubId, schedId);
    } else {
      setStudents([]);
      setHasRecordedAttendance(false);
    }
  };

  const fetchStudentsList = async (examId, classId, subjectId, scheduleId = '') => {
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
        academic_year_id: selectedYearId || undefined,
        exam_schedule_id: scheduleId || currentScheduleId || queryScheduleId || undefined,
        roster: 1,
      });

      if (res?.data?.hasSchedule === false) {
        setStudents([]);
        setHasRecordedAttendance(false);
        setScheduleNotFound(true);
        setExamScheduleDate('');
        return;
      }

      setScheduleNotFound(false);
      setExamScheduleDate(res?.data?.examSchedule?.date || '');
      if (res?.data?.isSubjectEditable !== undefined) {
        setIsSubjectEditable(Boolean(res.data.isSubjectEditable));
      }
      const rawList = res?.data?.rawAttendance || [];
      // Check if attendance exists specifically for this subject
      const hasSubjectAttendance = Boolean(
        res?.data?.isLocked ||
        (res?.data?.hasAttendance && rawList.some((r) => String(r.subject_id) === String(subjectId)))
      );
      setHasRecordedAttendance(hasSubjectAttendance);

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
    if (!selectedExamId || !selectedClassId || !selectedSubjectId) {
      toast.warning('Please select Exam, Class, and Subject.');
      return;
    }
    fetchStudentsList(selectedExamId, selectedClassId, selectedSubjectId, currentScheduleId);
  };

  const handleStatusChange = (studentId, statusVal) => {
    if (!isSubjectEditable && isTeacher) {
      toast.warning('You are not assigned to this subject. Attendance can only be viewed.');
      return;
    }
    if (isTeacherLocked) return;
    setStudents((prev) =>
      prev.map((s) =>
        s.student_id === studentId ? { ...s, attendanceStatus: statusVal } : s
      )
    );
  };

  const handleMarkAll = (statusVal) => {
    if (!isSubjectEditable && isTeacher) {
      toast.warning('You are not assigned to this subject. Attendance can only be viewed.');
      return;
    }
    if (isTeacherLocked) return;
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

    if (!isSubjectEditable && isTeacher) {
      toast.error('You are not assigned to this subject. Attendance can only be viewed.');
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
        exam_schedule_id: currentScheduleId || queryScheduleId || undefined,
        records,
      });

      toast.success(
        hasRecordedAttendance
          ? 'Exam attendance updated successfully!'
          : 'Exam attendance saved successfully!'
      );
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
                    Academic Year
                  </label>
                  <select
                    className="form-select select"
                    name="academic_year_id"
                    id="academic_year_id"
                    value={selectedYearId}
                    onChange={(e) => {
                      const yr = e.target.value;
                      setSelectedYearId(yr);
                      const matchedExams = yr
                        ? exams.filter((ex) => String(ex.academic_year) === String(yr))
                        : exams;
                      const isCurValid = matchedExams.some((ex) => String(ex.id) === String(selectedExamId));
                      const nextExam = isCurValid
                        ? selectedExamId
                        : (matchedExams.length > 0 ? String(matchedExams[0].id) : '');
                      setSelectedExamId(nextExam);

                      if (nextExam && selectedClassId) {
                        loadSubjectsForClass(selectedClassId, '', nextExam, yr);
                      } else {
                        setSubjects([]);
                        setSelectedSubjectId('');
                        setCurrentScheduleId('');
                        setStudents([]);
                        setScheduleNotFound(false);
                      }
                    }}
                  >
                    <option value="">Select Year</option>
                    {academicYears.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.name || y.academic_year || `Year ${y.id}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

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
                    onChange={handleExamChange}
                  >
                    <option value="">
                      {selectedYearId && exams.filter((ex) => !selectedYearId || String(ex.academic_year) === String(selectedYearId)).length === 0
                        ? 'No Exams for Selected Year'
                        : 'Select Exam'}
                    </option>
                    {exams
                      .filter((ex) => !selectedYearId || String(ex.academic_year) === String(selectedYearId))
                      .map((ex) => (
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
                    onChange={handleSubjectChange}
                  >
                    <option value="">
                      {selectedExamId && selectedClassId && subjects.length === 0
                        ? isTeacher
                          ? 'No Assigned Subjects'
                          : 'No Scheduled Subjects'
                        : 'Select Subject'}
                    </option>
                    {subjects.map((sub) => (
                      <option key={sub.subject_id} value={sub.subject_id}>
                        {sub.subject_name} {sub.date ? `(${sub.date})` : ''}
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
          {isTeacher && isExamDatePassed && (
            <div className="alert alert-warning border border-warning-subtle d-flex align-items-center mb-3 mx-3">
              <i className="ti ti-lock fs-20 me-2 text-warning"></i>
              <div>
                <strong>Attendance Locked:</strong> The scheduled exam date ({examDateDisplay}) has passed. Staff and teachers cannot alter past exam attendance. Please contact the school administration for any corrections.
              </div>
            </div>
          )}

          {isTeacher && isExamDateFuture && (
            <div className="alert alert-info border border-info-subtle d-flex align-items-center mb-3 mx-3">
              <i className="ti ti-calendar-event fs-20 me-2 text-info"></i>
              <div>
                <strong>Upcoming Exam:</strong> This exam is scheduled for {examDateDisplay}.
              </div>
            </div>
          )}

          {!isTeacher && isExamDatePassed && (
            <div className="alert alert-warning border border-warning-subtle d-flex align-items-center mb-3 mx-3">
              <i className="ti ti-shield-check fs-20 me-2 text-warning"></i>
              <div>
                <strong>School Administration Mode:</strong> The scheduled exam date ({examDateDisplay}) has passed. As School Administration, you have authority to review or update past attendance records.
              </div>
            </div>
          )}

          {!isTeacherLocked && !isExamDatePassed && hasRecordedAttendance && (
            <div className="alert alert-info border border-info-subtle d-flex align-items-center mb-3 mx-3">
              <i className="ti ti-info-circle fs-20 me-2 text-info"></i>
              <div>
                <strong>Attendance Already Recorded:</strong> Exam attendance for this Exam, Class, and Subject has already been saved. You can review or adjust statuses and click <strong>Update Attendance</strong> to save changes.
              </div>
            </div>
          )}

          {students.length > 0 && (
            <div className="d-flex justify-content-between align-items-center px-3 mb-3">
              <h5 className="mb-0">Students List ({students.length})</h5>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  onClick={() => handleMarkAll(1)}
                  className="btn btn-sm btn-outline-success"
                  disabled={(!isSubjectEditable && isTeacher) || isTeacherLocked || saving}
                >
                  <i className="fa-solid fa-check me-1"></i> Mark All Present
                </button>
                <button
                  type="button"
                  onClick={() => handleMarkAll(2)}
                  className="btn btn-sm btn-outline-danger"
                  disabled={(!isSubjectEditable && isTeacher) || isTeacherLocked || saving}
                >
                  <i className="fa-solid fa-xmark me-1"></i> Mark All Absent
                </button>
              </div>
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
                  <th className="text-center" style={{ width: '110px' }}>Section</th>
                  <th className="text-center" style={{ width: '220px' }}>Attendance</th>
                </tr>
              </thead>
              <tbody>
                {initialLoading || loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4">
                      <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
                      Loading students...
                    </td>
                  </tr>
                ) : scheduleNotFound || (selectedExamId && selectedClassId && subjects.length === 0) ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5">
                      <div className="text-warning mb-2">
                        <i className="ti ti-calendar-off fs-36"></i>
                      </div>
                      <h6 className="text-dark fw-semibold mb-1">No Exam Schedule Found</h6>
                      <p className="text-muted fs-13 mb-0">
                        No exam schedule has been created for this Exam and Class. Please schedule the exam before taking attendance.
                      </p>
                    </td>
                  </tr>
                ) : !hasSearched && students.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center text-muted py-4">
                      Please select Exam, Class, and Subject, then click Search.
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center text-muted py-4">
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
                      <td className="text-center">{st.section_name || '-'}</td>
                      <td className="text-center">
                        <div className="d-flex justify-content-center gap-3">
                          <div className="form-check form-check-inline">
                            <input
                              className="form-check-input"
                              type="radio"
                              name={`attendance_${st.student_id}`}
                              id={`present_${st.student_id}`}
                              checked={st.attendanceStatus === 1}
                              disabled={(!isSubjectEditable && isTeacher) || isTeacherLocked || saving}
                              title={
                                !isSubjectEditable && isTeacher
                                  ? 'You are not assigned to this subject. Attendance can only be viewed.'
                                  : ''
                              }
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
                              disabled={(!isSubjectEditable && isTeacher) || isTeacherLocked || saving}
                              title={
                                !isSubjectEditable && isTeacher
                                  ? 'You are not assigned to this subject. Attendance can only be viewed.'
                                  : ''
                              }
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
                {isTeacherLocked ? 'Back' : 'Cancel'}
              </button>
              {!isSubjectEditable && isTeacher ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled
                  title="You are not assigned to this subject. Attendance can only be viewed."
                >
                  <i className="ti ti-eye me-1"></i> View Only
                </button>
              ) : isTeacherLocked ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled
                  title="Exam attendance is locked for staff and teachers"
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
                  ) : hasRecordedAttendance ? (
                    'Update Attendance'
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
