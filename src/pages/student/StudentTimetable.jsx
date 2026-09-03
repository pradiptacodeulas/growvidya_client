import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { fetchStudentTimetableApi } from '../../api/studentPortal.api';
import maleUserDefault from '../../assets/male-user.png';
import { resolveImageUrl } from '../../utils/url.util';

const StudentTimetable = () => {
  const { student: authStudent } = useSelector((state) => state.studentAuth);

  const [timetable, setTimetable] = useState([]);
  const [selectedDay, setSelectedDay] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const loadTimetable = async () => {
    try {
      setLoading(true);
      const res = await fetchStudentTimetableApi();
      const data = res?.data?.data || res?.data || [];
      setTimetable(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load student timetable:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimetable();
  }, []);

  const daysOfWeek = [
    { id: 1, name: 'Monday' },
    { id: 2, name: 'Tuesday' },
    { id: 3, name: 'Wednesday' },
    { id: 4, name: 'Thursday' },
    { id: 5, name: 'Friday' },
    { id: 6, name: 'Saturday' },
    { id: 7, name: 'Sunday' },
  ];

  const student = authStudent;
  const studentPhoto = resolveImageUrl(student?.picture) || maleUserDefault;
  const studentName =
    student?.full_name ||
    `${student?.first_name || ''} ${student?.last_name || ''}`.trim() ||
    'Student';

  const getDayPeriods = (dayId) => {
    return timetable.filter((r) => Number(r.day) === Number(dayId));
  };

  const displayDays =
    selectedDay === 'ALL'
      ? daysOfWeek
      : daysOfWeek.filter((d) => String(d.id) === String(selectedDay));

  return (
    <div className="content content-two">
      {/* Student Banner */}
      <div className="card border shadow-sm mb-4 bg-white rounded-3">
        <div className="card-body p-4">
          <div className="d-md-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center mb-3 mb-md-0">
              <div
                className="avatar avatar-xxl rounded-circle border border-3 border-primary-subtle flex-shrink-0 me-3 shadow-sm"
                style={{ width: '64px', height: '64px', overflow: 'hidden' }}
              >
                <img
                  src={studentPhoto}
                  alt={studentName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = maleUserDefault;
                  }}
                />
              </div>
              <div>
                <span className="badge bg-primary-subtle text-primary mb-1 fs-12 border">
                  Academic Schedule
                </span>
                <h3 className="card-title mb-1 fw-bold text-dark">{studentName}</h3>
                <p className="card-text text-muted fs-13 mb-0">
                  Class: <strong className="text-dark">{student?.class_name || 'Class'} {student?.section_name ? `(${student.section_name})` : ''}</strong> | Weekly Routine
                </p>
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-success-subtle text-success fs-12 px-3 py-2 border">
                <i className="ti ti-clock me-1"></i>{timetable.length} Weekly Classes
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Day Filter Tabs */}
      <div className="card border shadow-sm mb-4 rounded-3">
        <div className="card-body p-3">
          <div className="d-flex align-items-center flex-wrap gap-2">
            <button
              type="button"
              className={`btn btn-sm rounded-pill px-3 fw-semibold ${
                selectedDay === 'ALL' ? 'btn-primary shadow-sm' : 'btn-light text-dark'
              }`}
              onClick={() => setSelectedDay('ALL')}
            >
              All Days ({timetable.length})
            </button>
            {daysOfWeek.map((day) => {
              const count = getDayPeriods(day.id).length;
              return (
                <button
                  key={`day-btn-${day.id}`}
                  type="button"
                  className={`btn btn-sm rounded-pill px-3 fw-semibold ${
                    String(selectedDay) === String(day.id)
                      ? 'btn-primary shadow-sm'
                      : 'btn-light text-dark'
                  }`}
                  onClick={() => setSelectedDay(String(day.id))}
                >
                  {day.name} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Routine Grid */}
      {loading ? (
        <div className="text-center py-5 text-muted">
          <div className="spinner-border spinner-border-sm text-primary me-2"></div>
          Loading class routine...
        </div>
      ) : timetable.length === 0 ? (
        <div className="card border shadow-sm rounded-3 text-center py-5">
          <i className="ti ti-calendar-off fs-48 text-muted mb-2 d-block"></i>
          <h5 className="fw-bold text-dark">No Routine Scheduled</h5>
          <p className="text-muted fs-13 mb-0">No class timetable has been assigned for your class and section.</p>
        </div>
      ) : (
        <div className="d-flex flex-column gap-4">
          {displayDays.map((day) => {
            const periods = getDayPeriods(day.id);
            return (
              <div key={`day-section-${day.id}`} className="card border shadow-sm rounded-3">
                <div className="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
                  <h5 className="card-title mb-0 fw-bold fs-15 text-dark d-flex align-items-center gap-2">
                    <i className="ti ti-calendar text-primary fs-18"></i>
                    {day.name}
                  </h5>
                  <span className="badge bg-light text-dark border fs-11">
                    {periods.length} {periods.length === 1 ? 'Period' : 'Periods'}
                  </span>
                </div>
                <div className="card-body p-3">
                  {periods.length === 0 ? (
                    <p className="text-muted fs-13 mb-0 py-2 text-center">No periods scheduled for {day.name}.</p>
                  ) : (
                    <div className="row g-3">
                      {periods.map((p, pIdx) => (
                        <div key={`p-${p.id || pIdx}-${pIdx}`} className="col-12 col-md-6 col-xl-4">
                          <div className="p-3 border rounded-3 bg-light h-100 position-relative">
                            <div className="d-flex align-items-center justify-content-between mb-2">
                              <span className="badge bg-primary-subtle text-primary fs-11">
                                {p.period_name || `Period ${pIdx + 1}`}
                              </span>
                              <span className="badge bg-white text-dark border fs-11">
                                Room {p.room_no || p.room_number || 'N/A'}
                              </span>
                            </div>
                            <h6 className="fw-bold text-dark fs-14 mb-1">
                              {p.subject_name || 'Subject'}
                            </h6>
                            <p className="text-muted fs-12 mb-2">
                              <i className="ti ti-clock me-1"></i>
                              {p.start_time ? `${p.start_time} - ${p.end_time || ''}` : 'Scheduled'}
                            </p>
                            <div className="d-flex align-items-center gap-2 pt-2 border-top">
                              <i className="ti ti-user-star text-primary fs-16"></i>
                              <span className="fs-12 text-dark fw-medium">
                                {p.teacher_name || 'Assigned Educator'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentTimetable;
