import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import adminExaminationApi from '../../../api/adminExamination.api';
import adminAcademicApi from '../../../api/adminAcademic.api';

const AddExamSchedule = () => {
  const { teacher, isAuthenticated: isTeacherAuth } = useSelector((state) => state.teacherAuth);
  const isTeacher = Boolean(
    (typeof window !== 'undefined' && window.location.pathname.startsWith('/teacher')) ||
    (isTeacherAuth && teacher)
  );
  const basePath = isTeacher ? '/teacher' : '/admin';

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const decodeParamId = (val) => {
    if (!val) return '';
    try {
      const unescaped = decodeURIComponent(val);
      const decoded = atob(unescaped);
      if (/^\d+$/.test(decoded)) return decoded;
    } catch (e) {}
    return val;
  };

  const queryExamId = decodeParamId(searchParams.get('exam_id'));
  const queryClassId = decodeParamId(searchParams.get('class_id'));
  const queryYearId = decodeParamId(searchParams.get('academic_year_id'));

  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState(queryYearId);

  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState(queryExamId);
  const [selectedClassId, setSelectedClassId] = useState(queryClassId);

  const [subjects, setSubjects] = useState([]);
  const [scheduleEntries, setScheduleEntries] = useState({});
  const [existingScheduleCount, setExistingScheduleCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [ayRes, clsRes] = await Promise.all([
        adminAcademicApi.getAllAcademicYears().catch(() => ({ data: [] })),
        adminAcademicApi.getAllClasses({ status: 1 }).catch(() => ({ data: [] })),
      ]);

      const ayList = Array.isArray(ayRes?.data)
        ? ayRes.data
        : Array.isArray(ayRes?.data?.academic_years)
        ? ayRes.data.academic_years
        : Array.isArray(ayRes)
        ? ayRes
        : [];

      const classesList = Array.isArray(clsRes?.data)
        ? clsRes.data
        : Array.isArray(clsRes?.data?.classes)
        ? clsRes.data.classes
        : Array.isArray(clsRes)
        ? clsRes
        : [];

      setAcademicYears(ayList);
      setClasses(classesList);

      const currentYr =
        ayList.find((y) => Number(y.is_current) === 1 || String(y.is_current) === '1' || y.isCurrent) ||
        ayList[0];
      const targetYear = queryYearId || (currentYr ? String(currentYr.id) : '');
      setSelectedAcademicYearId(targetYear);

      const exRes = await adminExaminationApi.getAllExams({
        academic_year: targetYear,
        status: 1,
      }).catch(() => ({ data: [] }));

      const examsList = Array.isArray(exRes?.data?.exams)
        ? exRes.data.exams
        : Array.isArray(exRes?.data)
        ? exRes.data
        : [];

      setExams(examsList);

      const targetExam = selectedExamId || (examsList.length > 0 ? String(examsList[0].id) : '');
      const targetClass = selectedClassId || (classesList.length > 0 ? String(classesList[0].id) : '');

      setSelectedExamId(targetExam);
      setSelectedClassId(targetClass);

      if (targetExam && targetClass) {
        loadScheduleMatrix(targetExam, targetClass, targetYear);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
      toast.error('Failed to load exams and classes');
    } finally {
      setLoading(false);
    }
  };

  const loadScheduleMatrix = async (examId, classId, yearId = selectedAcademicYearId) => {
    if (!examId || !classId) {
      setSubjects([]);
      setScheduleEntries({});
      return;
    }

    try {
      setTableLoading(true);
      const [configRes, schRes] = await Promise.all([
        adminExaminationApi.getExamSubjectConfig({ exam_id: examId, class_id: classId }),
        adminExaminationApi.getExamSchedules({ exam_id: examId, class_id: classId, academic_year_id: yearId }),
      ]);

      const subs = configRes?.data?.subjects || [];
      setSubjects(subs);

      const existingSchedules = schRes?.data?.schedules || [];
      setExistingScheduleCount(existingSchedules.length);

      const todayStr = new Date().toISOString().split('T')[0];
      const initialMap = {};

      subs.forEach((sub) => {
        const matched = existingSchedules.find((s) => `${s.subject_id}` === `${sub.subject_id}`);
        if (matched) {
          initialMap[sub.subject_id] = {
            date: matched.date ? String(matched.date).split('T')[0] : todayStr,
            start_time: matched.start_time ? String(matched.start_time).substring(0, 5) : '08:00',
            end_time: matched.end_time ? String(matched.end_time).substring(0, 5) : '10:00',
          };
        } else {
          initialMap[sub.subject_id] = {
            date: todayStr,
            start_time: '08:00',
            end_time: '10:00',
          };
        }
      });

      setScheduleEntries(initialMap);
    } catch (err) {
      console.error('Failed to load subjects schedule:', err);
      toast.error('Failed to load subjects for selected class');
    } finally {
      setTableLoading(false);
    }
  };

  const handleAcademicYearChange = async (e) => {
    const yearId = e.target.value;
    setSelectedAcademicYearId(yearId);

    try {
      setTableLoading(true);
      const exRes = await adminExaminationApi.getAllExams({
        academic_year: yearId,
        status: 1,
      }).catch(() => ({ data: [] }));

      const examsList = Array.isArray(exRes?.data?.exams)
        ? exRes.data.exams
        : Array.isArray(exRes?.data)
        ? exRes.data
        : [];

      setExams(examsList);

      const nextExamId = examsList.length > 0 ? String(examsList[0].id) : '';
      setSelectedExamId(nextExamId);

      if (nextExamId && selectedClassId) {
        loadScheduleMatrix(nextExamId, selectedClassId, yearId);
      } else {
        setSubjects([]);
        setScheduleEntries({});
      }
    } catch (err) {
      console.error('Failed to reload exams for academic year:', err);
    } finally {
      setTableLoading(false);
    }
  };

  const handleExamChange = (e) => {
    const val = e.target.value;
    setSelectedExamId(val);
    if (val && selectedClassId) {
      loadScheduleMatrix(val, selectedClassId, selectedAcademicYearId);
    }
  };

  const handleClassChange = (e) => {
    const val = e.target.value;
    setSelectedClassId(val);
    if (selectedExamId && val) {
      loadScheduleMatrix(selectedExamId, val, selectedAcademicYearId);
    }
  };

  const handleFieldChange = (subjectId, field, val) => {
    setScheduleEntries((prev) => ({
      ...prev,
      [subjectId]: {
        ...prev[subjectId],
        [field]: val,
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedExamId || !selectedClassId) {
      toast.warning('Please select Exam and Class.');
      return;
    }

    if (subjects.length === 0) {
      toast.warning('No subjects available for the selected class.');
      return;
    }

    try {
      setSaving(true);
      const items = subjects.map((sub) => {
        const entry = scheduleEntries[sub.subject_id] || {};
        return {
          subject_id: sub.subject_id,
          date: entry.date || new Date().toISOString().split('T')[0],
          start_time: entry.start_time || '08:00',
          end_time: entry.end_time || '10:00',
          status: 1,
        };
      });

      await adminExaminationApi.createExamSchedule({
        exam_id: selectedExamId,
        class_id: selectedClassId,
        academic_year_id: selectedAcademicYearId,
        items,
      });

      toast.success('Exam schedule saved successfully!');
      navigate(`${basePath}/examinations/schedules`);
    } catch (err) {
      console.error('Failed to save exam schedule:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to save exam schedule.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="mb-1">
            {existingScheduleCount > 0 ? 'Edit Exam Schedule' : 'Add Exam Schedule'}
          </h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to={`${basePath}/dashboard`}>Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to={`${basePath}/examinations/schedules`}>Exam Schedule</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {existingScheduleCount > 0 ? 'Edit Exam Schedule' : 'Add Exam Schedule'}
              </li>
            </ol>
          </nav>
        </div>
      </div>
      {/* /Page Header */}

      <div className="row">
        <div className="col-md-12">
          <form onSubmit={handleSubmit}>
            <div className="card">
              <div className="card-header bg-light">
                <div className="d-flex align-items-center">
                  <h4 className="text-dark">Exam Schedule</h4>
                </div>
              </div>

              {/* Filters Box */}
              <div className="bg-white p-3 border-bottom d-flex align-items-center justify-content-between flex-wrap pb-0">
                <div className="row w-100">
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label">
                        Academic Year <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select select"
                        name="academic_year_id"
                        id="academic_year_id"
                        required
                        value={selectedAcademicYearId}
                        onChange={handleAcademicYearChange}
                      >
                        <option value="">Select Academic Year</option>
                        {academicYears.map((ay) => (
                          <option key={ay.id} value={ay.id}>
                            {ay.academic_year || ay.academic_year_name || ay.year}
                            {Number(ay.is_current) === 1 || String(ay.is_current) === '1' ? ' (Current)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label">
                        Exam <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select select"
                        name="exam_id"
                        id="exam_id"
                        required
                        value={selectedExamId}
                        onChange={handleExamChange}
                      >
                        <option value="">Select Exam</option>
                        {exams.map((exam) => (
                          <option key={exam.id} value={exam.id}>
                            {exam.exam_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label">
                        Class <span className="text-danger">*</span>
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
                </div>
              </div>

              {/* Card Body */}
              <div className="card-body pb-1">
                {existingScheduleCount > 0 && (
                  <div className="alert alert-info d-flex align-items-center mb-3" role="alert" style={{ gap: '10px' }}>
                    <i className="fa fa-info-circle"></i>
                    <div>
                      Exam schedule is already created. Updating the fields below will modify existing timetable entries.
                    </div>
                  </div>
                )}

                <div id="examScheduleDiv">
                  {loading || tableLoading ? (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <p className="mt-2 text-muted">Loading subjects and timetable...</p>
                    </div>
                  ) : subjects.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                      <i className="ti ti-calendar-event fs-36 mb-2 d-block"></i>
                      <p>No subjects found for the selected class.</p>
                    </div>
                  ) : (
                    <div className="table-responsive mt-3">
                      <table className="table table-bordered table-hover">
                        <thead className="table-light text-center">
                          <tr>
                            <th rowSpan="2" className="text-center" style={{ width: '80px' }}>
                              Sl No.
                            </th>
                            <th rowSpan="2" className="text-center">
                              Subject
                            </th>
                            <th rowSpan="2" className="text-center" style={{ width: '220px' }}>
                              Date
                            </th>
                            <th colSpan="2" className="text-center">
                              Time
                            </th>
                          </tr>
                          <tr>
                            <th className="text-center" style={{ width: '180px' }}>
                              Start
                            </th>
                            <th className="text-center" style={{ width: '180px' }}>
                              End
                            </th>
                          </tr>
                        </thead>
                        <tbody id="examScheduleTbody">
                          {subjects.map((sub, idx) => {
                            const entry = scheduleEntries[sub.subject_id] || {
                              date: new Date().toISOString().split('T')[0],
                              start_time: '08:00',
                              end_time: '10:00',
                            };
                            return (
                              <tr key={sub.subject_id}>
                                <td className="text-center">{idx + 1}</td>
                                <td className="text-center fw-medium">{sub.subject_name}</td>
                                <td className="text-center">
                                  <input
                                    type="date"
                                    className="form-control text-center"
                                    value={entry.date || ''}
                                    onChange={(e) =>
                                      handleFieldChange(sub.subject_id, 'date', e.target.value)
                                    }
                                    required
                                  />
                                </td>
                                <td className="text-center">
                                  <input
                                    type="time"
                                    className="form-control text-center"
                                    value={entry.start_time || ''}
                                    onChange={(e) =>
                                      handleFieldChange(sub.subject_id, 'start_time', e.target.value)
                                    }
                                    required
                                  />
                                </td>
                                <td className="text-center">
                                  <input
                                    type="time"
                                    className="form-control text-center"
                                    value={entry.end_time || ''}
                                    onChange={(e) =>
                                      handleFieldChange(sub.subject_id, 'end_time', e.target.value)
                                    }
                                    required
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="text-end mb-2 mt-4">
                  <button
                    type="button"
                    onClick={() => navigate(`${basePath}/examinations/schedules`)}
                    className="btn btn-light me-3"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving || tableLoading || subjects.length === 0}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Saving...
                      </>
                    ) : (
                      'Submit'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddExamSchedule;
