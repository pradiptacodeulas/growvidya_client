import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  fetchTeacherClassesApi,
  fetchTeacherSectionsApi,
  fetchTeacherRoutineApi,
} from '../../../api/teacherAcademic.api';

const DAYS_LIST = [
  { id: 1, name: 'Monday' },
  { id: 2, name: 'Tuesday' },
  { id: 3, name: 'Wednesday' },
  { id: 4, name: 'Thursday' },
  { id: 5, name: 'Friday' },
  { id: 6, name: 'Saturday' },
];

const TeacherRoutine = () => {
  const { teacher } = useSelector((state) => state.teacherAuth);

  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [appliedClass, setAppliedClass] = useState('');
  const [appliedSection, setAppliedSection] = useState('');

  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'calendar'

  // Get current day name (e.g. 'Monday', 'Tuesday' ...)
  const todayDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  // Load Classes
  useEffect(() => {
    const loadClasses = async () => {
      try {
        const res = await fetchTeacherClassesApi();
        const data = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.data?.classes)
          ? res.data.classes
          : Array.isArray(res)
          ? res
          : [];
        setClasses(data);
      } catch (err) {
        console.error('Failed to load classes:', err);
      }
    };
    loadClasses();
  }, []);

  // Load Sections when selectedClass changes (for dropdown options only)
  useEffect(() => {
    if (!selectedClass) {
      setSections([]);
      setSelectedSection('');
      return;
    }
    const loadSections = async () => {
      try {
        const res = await fetchTeacherSectionsApi(selectedClass);
        const data = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.data?.sections)
          ? res.data.sections
          : Array.isArray(res)
          ? res
          : [];
        setSections(data);
      } catch (err) {
        console.error('Failed to load sections:', err);
        setSections([]);
      }
    };
    loadSections();
  }, [selectedClass]);

  // Load Routines from Server
  const loadRoutines = useCallback(
    async (classId, sectionId) => {
      try {
        setLoading(true);
        const params = {};
        if (classId) {
          params.class_id = classId;
          if (sectionId) params.section_id = sectionId;
        }

        const res = await fetchTeacherRoutineApi(params);
        const list = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.data?.routines)
          ? res.data.routines
          : Array.isArray(res)
          ? res
          : [];
        setRoutines(list);
      } catch (err) {
        console.error('Failed to load routines:', err);
        setRoutines([]);
      } finally {
        setLoading(false);
      }
    },
    [teacher]
  );

  // Initial load: Default to personal routine on mount
  useEffect(() => {
    loadRoutines('', '');
  }, [loadRoutines]);

  // Apply Filter only when form is submitted by clicking Apply button
  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setAppliedClass(selectedClass);
    setAppliedSection(selectedSection);
    loadRoutines(selectedClass, selectedSection);
  };

  // Reset filters
  const handleReset = (e) => {
    e.preventDefault();
    setSelectedClass('');
    setSelectedSection('');
    setAppliedClass('');
    setAppliedSection('');
    setSections([]);
    loadRoutines('', '');
  };

  const handleClassChange = (e) => {
    const classVal = e.target.value;
    setSelectedClass(classVal);
    setSelectedSection('');
  };

  // Helper to format time (e.g. 08:00:00 -> 08:00 AM)
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    let hour = parseInt(parts[0], 10);
    const min = parts[1];
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    hour = hour ? hour : 12;
    const formattedHour = hour < 10 ? `0${hour}` : hour;
    return `${formattedHour}:${min} ${ampm}`;
  };

  const formatPeriodTime = (start, end) => {
    if (!start && !end) return 'Time TBA';
    const formattedStart = formatTime(start);
    const formattedEnd = formatTime(end);
    if (formattedStart && formattedEnd) return `${formattedStart} - ${formattedEnd}`;
    return formattedStart || formattedEnd;
  };

  // Group routines by day name
  const getPeriodsForDay = (dayName, dayId) => {
    return routines.filter((r) => {
      if (r.day_name && r.day_name.toLowerCase() === dayName.toLowerCase()) return true;
      if (r.day && Number(r.day) === dayId) return true;
      if (r.day_id && Number(r.day_id) === dayId) return true;
      return false;
    });
  };

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1 fw-bold">Class Routine &amp; Timetable</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/teacher/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Academic</li>
              <li className="breadcrumb-item active" aria-current="page">
                Class Routine
              </li>
            </ol>
          </nav>
        </div>

        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={() => loadRoutines(selectedClass, selectedSection)}
            className="btn btn-outline-light bg-white btn-icon"
            title="Refresh Schedule"
          >
            <i className="ti ti-refresh"></i>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="btn btn-outline-light bg-white btn-icon"
            title="Print Timetable"
          >
            <i className="ti ti-printer"></i>
          </button>

          {/* View Mode Switcher Buttons */}
          <div className="btn-group" role="group" aria-label="Routine View Modes">
            <button
              type="button"
              className={`btn ${viewMode === 'grid' ? 'btn-primary active' : 'btn-outline-primary'}`}
              onClick={() => setViewMode('grid')}
            >
              <i className="ti ti-layout-grid me-1"></i> Timetable Grid
            </button>
            <button
              type="button"
              className={`btn ${viewMode === 'calendar' ? 'btn-primary active' : 'btn-outline-primary'} d-none`}
              onClick={() => setViewMode('calendar')}
            >
              <i className="ti ti-calendar me-1"></i> Interactive Calendar
            </button>
          </div>
        </div>
      </div>
      {/* /Page Header */}

      {/* Filter Card */}
      <div className="card mb-4 shadow-sm border-0">
        <div className="card-header bg-transparent border-bottom d-flex align-items-center justify-content-between py-3">
          <h5 className="card-title mb-0 d-flex align-items-center fs-16 fw-semibold">
            <i className="ti ti-filter text-primary me-2 fs-18"></i>
            Filter Routine Schedule
          </h5>
          <span className="badge bg-light text-dark border text-xs">
            Mode: {appliedClass ? 'Class Schedule' : 'My Personal Schedule'}
          </span>
        </div>
        <div className="card-body">
          <form onSubmit={handleFilterSubmit} id="routineFilterForm">
            <div className="row g-3 align-items-end">
              {/* Class Select */}
              <div className="col-md-4">
                <label className="form-label fw-medium text-dark text-xs">Class</label>
                <select
                  name="class_id"
                  id="routine_class_id"
                  className="form-select"
                  value={selectedClass}
                  onChange={handleClassChange}
                >
                  <option value="">My Personal Routine (Teacher)</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.class_name || cls.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section Select */}
              <div className="col-md-4">
                <label className="form-label fw-medium text-dark text-xs">Section</label>
                <select
                  name="section_id"
                  id="routine_section_id"
                  className="form-select"
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  disabled={!selectedClass}
                >
                  <option value="">All Sections</option>
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.section_name || sec.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="col-md-4 d-flex gap-2">
                <button type="submit" className="btn btn-primary w-100">
                  <i className="ti ti-filter me-1"></i> Apply Filter
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn btn-outline-secondary w-100"
                  title="Reset Filters"
                >
                  <i className="ti ti-rotate me-1"></i> Reset
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
      {/* /Filter Card */}

      {/* GRID TIMETABLE VIEW CONTAINER */}
      <div id="grid-view-container">
        <div className="card shadow-sm border-0">
          <div className="card-header bg-transparent border-bottom py-3 d-flex align-items-center justify-content-between">
            <h5 className="card-title mb-0 fs-18 fw-bold text-dark">
              <i className="ti ti-clock text-primary me-2"></i>
              {appliedClass ? 'Weekly Class Routine Schedule' : 'My Weekly Routine Schedule'}
            </h5>
            <span className="text-xs text-muted">Showing all active days</span>
          </div>
          <div className="card-body p-3">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2 text-muted fs-13">Loading timetable routine...</p>
              </div>
            ) : (
              <div className="d-flex flex-nowrap overflow-auto pb-2 gap-3">
                {DAYS_LIST.map((day) => {
                  const isToday = todayDayName.toLowerCase() === day.name.toLowerCase();
                  const dayPeriods = getPeriodsForDay(day.name, day.id);

                  return (
                    <div
                      key={day.id}
                      className={`d-flex flex-column flex-fill min-w-220 border rounded-3 p-2 bg-light-subtle ${
                        isToday ? 'border-primary shadow-sm' : ''
                      }`}
                      style={{ minWidth: '220px' }}
                    >
                      {/* Day Header */}
                      {isToday ? (
                        <div className="p-2 mb-2 rounded text-center bg-primary text-white">
                          <h6 className="mb-0 fw-bold text-white">
                            {day.name}
                            <span className="badge bg-white text-primary ms-1 text-xxs">
                              TODAY
                            </span>
                          </h6>
                        </div>
                      ) : (
                        <div className="p-2 mb-2 rounded text-center bg-light text-dark fw-bold border">
                          <h6 className="mb-0 fw-bold text-dark">{day.name}</h6>
                        </div>
                      )}

                      {/* Periods List */}
                      <div className="d-flex flex-column gap-2">
                        {dayPeriods.length === 0 ? (
                          <div className="card border-0 shadow-xs rounded-3 p-3 bg-white text-center text-muted fs-12">
                            No classes scheduled
                          </div>
                        ) : (
                          dayPeriods.map((item, idx) => {
                            const periodLabel = item.period_name || `${idx + 1}th Period`;
                            const subjectLabel = item.subject_name || 'General Subject';
                            const classLabel = item.class_name || 'General';
                            const sectionLabel = item.section_name ? `(${item.section_name})` : '';
                            const timeLabel = formatPeriodTime(item.start_time, item.end_time);

                            return (
                              <div
                                key={item.id || idx}
                                className="card border-0 shadow-xs rounded-3 p-3 bg-white hover-shadow transition-all"
                              >
                                <div className="d-flex align-items-center justify-content-between border-bottom pb-2 mb-2">
                                  <span className="badge bg-primary-subtle text-primary fw-semibold px-2 py-1 text-xs">
                                    <i className="ti ti-circle-filled fs-8 me-1"></i>
                                    {periodLabel}
                                  </span>
                                </div>

                                <h6 className="fw-bold text-dark mb-1 fs-14">
                                  {subjectLabel}
                                </h6>

                                <div className="text-xs text-muted mb-1">
                                  <i className="ti ti-school me-1 text-secondary"></i>
                                  <strong>Class:</strong> {classLabel} {sectionLabel}
                                </div>

                                {appliedClass && item.teacher_name && (
                                  <div className="text-xs text-muted mb-1">
                                    <i className="ti ti-user me-1 text-secondary"></i>
                                    <strong>Teacher:</strong> {item.teacher_name}
                                  </div>
                                )}

                                <div className="text-xs text-primary fw-medium bg-light p-1-5 rounded text-center mt-1">
                                  <i className="ti ti-clock me-1"></i>
                                  {timeLabel}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* /GRID TIMETABLE VIEW CONTAINER */}
    </div>
  );
};

export default TeacherRoutine;
