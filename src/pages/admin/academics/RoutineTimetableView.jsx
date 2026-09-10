import React, { useEffect, useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchClassByIdApi,
  fetchClassesApi,
  fetchSectionsApi,
  fetchSubjectsApi,
  fetchPeriodsApi,
  fetchDaysApi,
  fetchRoutinesApi,
  createRoutineApi,
  updateRoutineApi,
  deleteRoutineApi,
  fetchClassTeachersApi,
} from '../../../api/adminAcademic.api';
import { apiFetch } from '../../../api/fetch.config';

import Avatar from '../../../components/common/Avatar';
import { decodeParam, encodeParam } from '../../../utils/idHelper';

// Format time string HH:MM:SS to HH:MM AM/PM
const formatTime = (timeStr) => {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours < 10 ? '0' + hours : hours}:${minutes} ${ampm}`;
};

const RoutineTimetableView = () => {
  const { classId: rawClassId, sectionId: rawSectionId } = useParams();
  const classId = decodeParam(rawClassId);
  const sectionId = decodeParam(rawSectionId);

  const [classInfo, setClassInfo] = useState(null);
  const [sectionInfo, setSectionInfo] = useState(null);
  const [routines, setRoutines] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [days, setDays] = useState([]);
  const [classTeachers, setClassTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    day: '1',
    period_id: '',
    subject_id: '',
    teacher_id: '',
  });

  useEffect(() => {
    loadTimetableData();
  }, [rawClassId, rawSectionId]);

  const loadTimetableData = async () => {
    try {
      setLoading(true);
      const [clsRes, secRes, subRes, perRes, daysRes, rtsRes, classTeaRes] = await Promise.all([
        fetchClassByIdApi(classId).catch(() => null),
        fetchSectionsApi().catch(() => ({ data: [] })),
        fetchSubjectsApi({ classId }).catch(() => ({ data: [] })),
        fetchPeriodsApi().catch(() => ({ data: [] })),
        fetchDaysApi().catch(() => ({ data: [] })),
        fetchRoutinesApi({ class_id: classId, section_id: sectionId }).catch(() => ({ data: [] })),
        fetchClassTeachersApi({ class_id: classId }).catch(() => ({ data: [] })),
      ]);

      let clsData = clsRes?.data || clsRes;
      if (!clsData) {
        const allClasses = await fetchClassesApi();
        const list = Array.isArray(allClasses?.data) ? allClasses.data : Array.isArray(allClasses) ? allClasses : [];
        clsData = list.find((c) => String(c.id) === String(classId));
      }
      setClassInfo(clsData);

      const secList = Array.isArray(secRes?.data) ? secRes.data : Array.isArray(secRes) ? secRes : [];
      const currentSec = secList.find((s) => String(s.id) === String(sectionId));
      setSectionInfo(currentSec);

      const subList = Array.isArray(subRes?.data) ? subRes.data : Array.isArray(subRes) ? subRes : [];
      const classSubjects = subList.filter((s) => String(s.class_id) === String(classId));
      setSubjects(classSubjects.length > 0 ? classSubjects : subList);

      const perList = Array.isArray(perRes?.data) ? perRes.data : Array.isArray(perRes) ? perRes : [];
      const shiftPeriods = clsData?.shift_id
        ? perList.filter((p) => p.status === 1 && (Number(p.shift_id) === Number(clsData.shift_id) || !p.shift_id))
        : perList.filter((p) => p.status === 1);
      setPeriods(shiftPeriods.length > 0 ? shiftPeriods : perList.filter((p) => p.status === 1));

      const daysList = Array.isArray(daysRes?.data) ? daysRes.data : Array.isArray(daysRes) ? daysRes : [];
      setDays(daysList.filter((d) => d.status === 1));

      const cTeaList = Array.isArray(classTeaRes?.data)
        ? classTeaRes.data
        : Array.isArray(classTeaRes)
        ? classTeaRes
        : [];
      setClassTeachers(cTeaList);

      const rtsList = Array.isArray(rtsRes?.data) ? rtsRes.data : Array.isArray(rtsRes) ? rtsRes : [];
      setRoutines(rtsList);
    } catch (err) {
      toast.error('Failed to load routine timetable data.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to find the corresponding teacher assigned to this class and subject
  const findTeacherForSubject = (subId, subName) => {
    if (!subId && !subName) return null;
    const sId = Number(subId);
    const sName = String(subName || '').toLowerCase().trim();

    return (
      classTeachers.find((t) => {
        const matchClass = !t.class_id || String(t.class_id) === String(classId);
        const matchSubject =
          (sId && Number(t.subject_id) === sId) ||
          (sName && t.subject_name && t.subject_name.toLowerCase().trim() === sName);
        return matchClass && matchSubject;
      }) || null
    );
  };

  // Compute teachers assigned strictly to this class and the selected subject (NO fallback)
  const availableTeachers = useMemo(() => {
    if (!formData.subject_id) {
      return [];
    }

    const subIdNum = Number(formData.subject_id);
    const selectedSub = subjects.find((s) => String(s.id) === String(formData.subject_id));
    const selectedSubName = selectedSub?.subject_name?.toLowerCase().trim();

    const subjectMatches = [];
    const seenIds = new Set();

    classTeachers.forEach((t) => {
      const matchClass = !t.class_id || String(t.class_id) === String(classId);
      const matchId = Number(t.subject_id) === subIdNum;
      const matchName = selectedSubName && t.subject_name && t.subject_name.toLowerCase().trim() === selectedSubName;
      if (matchClass && (matchId || matchName) && !seenIds.has(t.id)) {
        seenIds.add(t.id);
        subjectMatches.push(t);
      }
    });

    return subjectMatches;
  }, [classTeachers, classId, formData.subject_id, subjects]);

  const handleOpenAddModal = (defaultDay = '1', defaultPeriod = '') => {
    setEditingRoutine(null);
    setFormData({
      day: String(defaultDay || '1'),
      period_id: defaultPeriod ? String(defaultPeriod) : (periods[0]?.id ? String(periods[0].id) : ''),
      subject_id: '',
      teacher_id: '',
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (routine) => {
    setEditingRoutine(routine);
    const routineSubId = String(routine.subject_id || '');
    const routineSubObj = subjects.find((s) => String(s.id) === routineSubId);
    const routineSubName = routine.subject_name || routineSubObj?.subject_name;

    const matchedTeacher = findTeacherForSubject(routineSubId, routineSubName);

    setFormData({
      day: String(routine.day || '1'),
      period_id: String(routine.period_id || ''),
      subject_id: routineSubId,
      teacher_id: routine.teacher_id
        ? String(routine.teacher_id)
        : matchedTeacher
        ? String(matchedTeacher.id)
        : '',
    });
    setShowModal(true);
  };

  const handleSubjectChange = (e) => {
    const selectedSubId = e.target.value;
    const selectedSubObj = subjects.find((s) => String(s.id) === String(selectedSubId));
    const selectedSubName = selectedSubObj?.subject_name;

    const matchedTeacher = findTeacherForSubject(selectedSubId, selectedSubName);

    setFormData((prev) => ({
      ...prev,
      subject_id: selectedSubId,
      teacher_id: matchedTeacher ? String(matchedTeacher.id) : '',
    }));
  };

  const handleSaveRoutine = async (e) => {
    e.preventDefault();
    if (!formData.subject_id) {
      return toast.warning('Please select a Subject.');
    }
    if (!formData.period_id) {
      return toast.warning('Please select a Period.');
    }
    if (!formData.teacher_id) {
      return toast.warning('Please select a Teacher assigned to this subject.');
    }

    try {
      setSubmitting(true);
      const payload = {
        class_id: classId,
        section_id: sectionId,
        day: formData.day,
        period_id: formData.period_id,
        subject_id: formData.subject_id,
        teacher_id: formData.teacher_id || null,
        shift_id: classInfo?.shift_id || undefined,
      };

      if (editingRoutine) {
        await updateRoutineApi(editingRoutine.id, payload);
        toast.success('Period updated successfully!');
      } else {
        await createRoutineApi(payload);
        toast.success('Period scheduled successfully!');
      }

      setShowModal(false);
      const rtsRes = await fetchRoutinesApi({ class_id: classId, section_id: sectionId });
      setRoutines(Array.isArray(rtsRes?.data) ? rtsRes.data : []);
    } catch (err) {
      toast.error(err.message || 'Failed to save period.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (routineId) => {
    if (!window.confirm('Are you sure you want to remove this scheduled period?')) return;
    try {
      await deleteRoutineApi(routineId);
      toast.success('Scheduled period removed.');
      const rtsRes = await fetchRoutinesApi({ class_id: classId, section_id: sectionId });
      setRoutines(Array.isArray(rtsRes?.data) ? rtsRes.data : []);
    } catch (err) {
      toast.error(err.message || 'Failed to remove scheduled period.');
    }
  };

  // Group routines by day ID
  const routinesByDay = useMemo(() => {
    const map = {};
    days.forEach((d) => {
      map[String(d.id)] = [];
    });
    routines.forEach((r) => {
      const dKey = String(r.day);
      if (!map[dKey]) map[dKey] = [];
      map[dKey].push(r);
    });
    return map;
  }, [days, routines]);

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">
            Class Routine : Class {classInfo?.class_name || classId} - Section {sectionInfo?.section_name || sectionId}
          </h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/academics/routines">Class Routine</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to={`/admin/academics/routines/section/${encodeParam(classId)}`}>
                  Class {classInfo?.class_name || classId}
                </Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Section {sectionInfo?.section_name || sectionId}
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          <Link
            to={`/admin/academics/routines/section/${encodeParam(classId)}`}
            className="btn btn-outline-secondary d-flex align-items-center"
          >
            <i className="ti ti-arrow-left me-1"></i> Back to Sections
          </Link>
          <button
            type="button"
            onClick={() => handleOpenAddModal('1')}
            className="btn btn-primary d-flex align-items-center"
          >
            <i className="ti ti-square-rounded-plus me-1"></i> Schedule Period
          </button>
        </div>
      </div>
      {/* /Page Header */}

      {/* Routine Day Columns Card */}
      <div className="card shadow-sm border mb-4">
        <div className="card-header bg-white py-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h5 className="mb-0 text-dark fw-bold">
            Routine Schedule ({routines.length} Periods)
          </h5>
        </div>

        <div className="card-body p-4">
          {loading ? (
            <div className="p-5 text-center">
              <div className="spinner-border text-primary" role="status"></div>
              <p className="text-muted mt-2 mb-0">Loading routine schedule...</p>
            </div>
          ) : days.length === 0 ? (
            <div className="text-center py-5">
              <i className="ti ti-calendar-off fs-40 text-muted mb-2 d-block opacity-50"></i>
              <h6 className="fw-bold text-dark mb-1">No Working Days Configured</h6>
              <p className="text-muted fs-13 mb-3">Please configure academic working days first to set up the routine timetable.</p>
              <Link to="/admin/academics/days" className="btn btn-sm btn-primary">
                <i className="ti ti-plus me-1"></i> Add Working Days
              </Link>
            </div>
          ) : (
            <div className="d-flex align-items-start overflow-auto pb-3" style={{ minHeight: '400px' }}>
              {days.map((day, dIdx) => {
                const dayList = routinesByDay[String(day.id)] || [];

                return (
                  <div
                    key={day.id}
                    className="d-flex flex-column me-4 flex-fill"
                    style={{ minWidth: '240px', maxWidth: '280px' }}
                  >
                    {/* Day Heading */}
                    <div className="mb-3 border-bottom pb-2">
                      <h6 className="fw-bold text-dark mb-0">{day.day_name}</h6>
                    </div>

                    {/* Period Cards for Day */}
                    {dayList.length > 0 ? (
                      dayList.map((routine, rIdx) => {
                        const themeIndex = (dIdx * 2 + rIdx) % 4;
                        const theme = [
                          { bgClass: 'bg-transparent-primary', borderClass: 'border-primary-subtle', rgba: 'rgba(13, 110, 253, 0.08)' },
                          { bgClass: 'bg-transparent-success', borderClass: 'border-success-subtle', rgba: 'rgba(25, 135, 84, 0.08)' },
                          { bgClass: 'bg-transparent-info', borderClass: 'border-info-subtle', rgba: 'rgba(13, 202, 240, 0.08)' },
                          { bgClass: 'bg-transparent-warning', borderClass: 'border-warning-subtle', rgba: 'rgba(255, 193, 7, 0.08)' },
                        ][themeIndex];

                        return (
                          <div
                            key={routine.id}
                            className={`${theme.bgClass} rounded p-3 mb-3 position-relative border ${theme.borderClass} shadow-sm`}
                            style={{
                              backgroundColor: theme.rgba,
                              minHeight: '115px',
                            }}
                          >
                            {/* Period Time / Name */}
                            <p className="d-flex align-items-center text-nowrap mb-1 text-muted fs-12 fw-medium">
                              <i className="ti ti-clock me-1 text-primary"></i>
                              {routine.start_time && routine.end_time
                                ? `${formatTime(routine.start_time)} - ${formatTime(routine.end_time)}`
                                : routine.period_name || 'Period'}
                            </p>

                            {/* Subject */}
                            <p className="text-dark mb-2 fw-bold fs-13 text-truncate" title={routine.subject_name}>
                              Subject : {routine.subject_name || 'Subject'}
                            </p>

                            {/* Teacher Info & Actions */}
                            <div className="bg-white rounded p-1 shadow-sm border border-light d-flex align-items-center justify-content-between">
                              {routine.teacher_id ? (
                                <Link
                                  to={`/admin/teachers/details/${routine.teacher_id}`}
                                  className="text-muted d-flex align-items-center text-decoration-none overflow-hidden pe-1"
                                  title={routine.teacher_name}
                                >
                                  <Avatar
                                    src={routine.teacher_picture}
                                    name={routine.teacher_name}
                                    size={28}
                                    className="me-2"
                                  />
                                  <span
                                    className="text-dark fs-12 fw-semibold text-truncate"
                                    style={{ maxWidth: '100px' }}
                                  >
                                    {routine.teacher_name}
                                  </span>
                                </Link>
                              ) : (
                                <div className="d-flex align-items-center text-muted fs-12 ps-1">
                                  <span
                                    className="rounded-circle bg-light text-muted d-inline-flex align-items-center justify-content-center me-1"
                                    style={{ width: '26px', height: '26px', fontSize: '12px' }}
                                  >
                                    <i className="ti ti-user-x"></i>
                                  </span>
                                  <span className="fs-11 text-muted">No Teacher</span>
                                </div>
                              )}

                              <div className="action-btn d-flex align-items-center gap-2 ms-auto pe-1">
                                <div
                                  className="text-success cursor-pointer"
                                  title="Edit Routine"
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => handleOpenEditModal(routine)}
                                >
                                  <i className="fa-solid fa-pen-to-square"></i>
                                </div>
                                <div
                                  className="text-danger cursor-pointer"
                                  title="Delete Routine"
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => handleDelete(routine.id)}
                                >
                                  <i className="fa-solid fa-trash"></i>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div
                        className="border border-dashed rounded p-3 text-center text-muted d-flex flex-column align-items-center justify-content-center mb-4"
                        style={{ minHeight: '105px', backgroundColor: '#fafbfc' }}
                      >
                        <small className="text-muted mb-2">No periods</small>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary py-1 px-2 fs-12"
                          onClick={() => handleOpenAddModal(day.id)}
                        >
                          <i className="ti ti-plus me-1"></i> Add
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Schedule / Edit Period Modal */}
      {showModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title fw-bold" id="modalTitle">
                  {editingRoutine ? 'Edit Class Routine' : 'Add Class Routine'}
                </h4>
                <button
                  type="button"
                  className="btn-close custom-btn-close"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  aria-label="Close"
                >
                  <i className="ti ti-x"></i>
                </button>
              </div>
              <form id="routineForm" onSubmit={handleSaveRoutine}>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Class <span className="text-danger">*</span>
                        </label>
                        <span className="form-control bg-light text-dark fw-medium" id="classSpan">
                          {classInfo?.class_name || classId}
                        </span>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Shift <span className="text-danger">*</span>
                        </label>
                        <span className="form-control bg-light text-dark fw-medium" id="shiftSpan">
                          {classInfo?.shift_name || 'Morning'}
                        </span>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Section <span className="text-danger">*</span>
                        </label>
                        <span className="form-control bg-light text-dark fw-medium" id="sectionSpan">
                          {sectionInfo?.section_name || sectionId}
                        </span>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Day <span className="text-danger">*</span>
                        </label>
                        {editingRoutine ? (
                          <span className="form-control bg-light text-dark fw-medium" id="daySpan">
                            {days.find((d) => String(d.id) === String(formData.day))?.day_name || (editingRoutine.day_name || `Day ${formData.day}`)}
                          </span>
                        ) : (
                          <select
                            className="form-select"
                            id="daySelect"
                            value={formData.day}
                            onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                            required
                          >
                            {days.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.day_name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Period <span className="text-danger">*</span>
                        </label>
                        {editingRoutine ? (
                          <span className="form-control bg-light text-dark fw-medium" id="periodSpan">
                            {periods.find((p) => String(p.id) === String(formData.period_id))?.period_name || (editingRoutine.period_name || 'Period')}
                          </span>
                        ) : (
                          <select
                            className="form-select"
                            id="periodSelect"
                            value={formData.period_id}
                            onChange={(e) => setFormData({ ...formData, period_id: e.target.value })}
                            required
                          >
                            <option value="">Select</option>
                            {periods.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.period_name} {p.start_time && p.end_time ? `(${formatTime(p.start_time)} - ${formatTime(p.end_time)})` : ''}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Subject <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select"
                          name="subject_id"
                          id="subject_id"
                          required
                          value={formData.subject_id}
                          onChange={handleSubjectChange}
                        >
                          <option value="">Select</option>
                          {subjects.map((sub) => (
                            <option key={sub.id} value={String(sub.id)}>
                              {sub.subject_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="col-12">
                      <div className="mb-3">
                        <label className="form-label">
                          Teacher <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select"
                          name="teacher_id"
                          id="teacher_id"
                          required
                          value={formData.teacher_id}
                          onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                        >
                          <option value="">
                            {!formData.subject_id
                              ? 'Select Subject First'
                              : availableTeachers.length === 0
                              ? 'No teacher assigned for this subject'
                              : 'Select Teacher'}
                          </option>
                          {/* If current routine has a teacher assigned and subject has not changed, preserve it */}
                          {editingRoutine?.teacher_id &&
                            String(formData.subject_id) === String(editingRoutine.subject_id) &&
                            !availableTeachers.some((t) => String(t.id) === String(editingRoutine.teacher_id)) && (
                              <option value={String(editingRoutine.teacher_id)}>
                                {editingRoutine.teacher_name || `Teacher ${editingRoutine.teacher_id}`}
                              </option>
                            )}
                          {availableTeachers.map((t) => (
                            <option key={t.id} value={String(t.id)}>
                              {t.first_name ? `${t.first_name} ${t.last_name || ''}`.trim() : (t.full_name || t.name || `Teacher ${t.id}`)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-light me-2"
                    onClick={() => setShowModal(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    id="submitBtn"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1"></span>
                        Updating...
                      </>
                    ) : editingRoutine ? (
                      'Update Class Routine'
                    ) : (
                      'Save Class Routine'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoutineTimetableView;
